'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');

const { createHiVenuesApp, createHiVenuesStore } = require('../src/product/app');
const {
  IDENTITY_COOKIE_NAME,
  createHiVenuesIdentityServices,
} = require('../src/product/identity');

const ORIGIN = 'http://hivenues.test';
const SESSION_SECRET = 'hivenues-product-identity-session-secret-0001';

async function signingKey(seed = 'hivenues-era4-identity-proof') {
  const { PrivateKey } = await import('hive-tx');
  return PrivateKey.fromSeed(seed);
}

function signMessage(key, message) {
  const digest = createHash('sha256').update(message, 'utf8').digest();
  return key.sign(digest).customToString();
}

function authorityRpc(publicKey) {
  const calls = [];
  return {
    calls,
    async call(api, method, params) {
      calls.push({ api, method, params: structuredClone(params) });
      assert.equal(`${api}.${method}`, 'condenser_api.get_accounts');
      return params[0]
        .filter((name) => name === 'etblink')
        .map((name) => ({
          name,
          posting: {
            weight_threshold: 1,
            account_auths: [],
            key_auths: [[publicKey, 1]],
          },
        }));
    },
  };
}

function withStore(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-identity-'));
  const statePath = path.join(directory, 'state.json');
  const store = createHiVenuesStore({ statePath });
  store.list();
  return Promise.resolve()
    .then(() => run({ store, statePath }))
    .finally(() => fs.rmSync(directory, { recursive: true, force: true }));
}

test('public account review reads Hive state without creating a session or wallet challenge', async () => {
  await withStore(async ({ store, statePath }) => {
    const key = await signingKey();
    const publicKey = key.createPublic().toString();
    const rpcPool = authorityRpc(publicKey);
    const before = fs.readFileSync(statePath, 'utf8');
    const profileCalls = [];
    const app = createHiVenuesApp({
      store,
      hiveReadService: {
        rpcPool,
        async getProfile(account) {
          profileCalls.push(account);
          if (account !== 'etblink') return null;
          return {
            name: 'etblink',
            displayName: 'Evan',
            profileImage: 'https://images.hive.blog/u/etblink/avatar',
          };
        },
      },
      identityOrigin: ORIGIN,
      identitySessionSecret: SESSION_SECRET,
    });

    const preview = await request(app)
      .get('/identity/account/etblink')
      .expect(200);

    assert.deepEqual(preview.body, {
      account: 'etblink',
      displayName: 'Evan',
      profileImage: 'https://images.hive.blog/u/etblink/avatar',
    });
    assert.deepEqual(profileCalls, ['etblink']);
    assert.deepEqual(rpcPool.calls, []);
    assert.deepEqual((await request(app).get('/identity/session').expect(200)).body, {
      authenticated: false,
    });

    const missing = await request(app)
      .get('/identity/account/barfriend')
      .expect(404);
    assert.equal(missing.body.error.code, 'AUTH_ACCOUNT_NOT_FOUND');
    assert.deepEqual(profileCalls, ['etblink', 'barfriend']);
    assert.equal(fs.readFileSync(statePath, 'utf8'), before);
  });
});

test('canonical product proves Hive account control without mutating HostGraph or broadcasting', async () => {
  await withStore(async ({ store, statePath }) => {
    const key = await signingKey();
    const publicKey = key.createPublic().toString();
    const rpcPool = authorityRpc(publicKey);
    const before = fs.readFileSync(statePath, 'utf8');
    const app = createHiVenuesApp({
      store,
      hiveReadService: { rpcPool },
      identityOrigin: ORIGIN,
      identitySessionSecret: SESSION_SECRET,
    });
    const agent = request.agent(app);

    const issued = await agent
      .post('/identity/challenge')
      .set('origin', ORIGIN)
      .send({ account: 'etblink' })
      .expect(201);

    assert.equal(issued.body.account, 'etblink');
    assert.equal(issued.body.origin, ORIGIN);
    assert.equal(issued.body.context, 'HiVenues participation');
    assert.match(issued.body.message, /HiVenues identity proof/);
    assert.match(issued.body.message, /Account: @etblink/);
    assert.match(issued.body.message, /no Hive transaction or value action is authorized/);

    const proof = {
      account: 'etblink',
      challengeId: issued.body.id,
      publicKey,
      signature: signMessage(key, issued.body.message),
    };
    const verified = await agent
      .post('/identity/verify')
      .set('origin', ORIGIN)
      .send(proof)
      .expect(201);

    assert.equal(verified.body.authenticated, true);
    assert.equal(verified.body.account, 'etblink');
    assert.match(verified.body.csrfToken, /^[A-Za-z0-9_-]{40,}$/);
    assert.match(verified.headers['set-cookie'][0], new RegExp(`^${IDENTITY_COOKIE_NAME}=`));
    assert.match(verified.headers['set-cookie'][0], /HttpOnly/);
    assert.match(verified.headers['set-cookie'][0], /SameSite=Strict/);
    assert.doesNotMatch(verified.headers['set-cookie'][0], /Secure/);

    const session = await agent.get('/identity/session').expect(200);
    assert.equal(session.body.authenticated, true);
    assert.equal(session.body.account, 'etblink');
    assert.equal(session.body.csrfToken, verified.body.csrfToken);

    const replay = await agent
      .post('/identity/verify')
      .set('origin', ORIGIN)
      .send(proof)
      .expect(401);
    assert.equal(replay.body.error.code, 'AUTH_CHALLENGE_INVALID');

    const wrongCsrf = await agent
      .post('/identity/disconnect')
      .set('origin', ORIGIN)
      .set('x-csrf-token', 'wrong')
      .expect(403);
    assert.equal(wrongCsrf.body.error.code, 'CSRF_INVALID');

    await agent
      .post('/identity/disconnect')
      .set('origin', ORIGIN)
      .set('x-csrf-token', verified.body.csrfToken)
      .expect(204)
      .expect('set-cookie', /Max-Age=0/);
    assert.deepEqual((await agent.get('/identity/session').expect(200)).body, {
      authenticated: false,
    });

    assert.deepEqual(
      rpcPool.calls,
      [
        {
          api: 'condenser_api',
          method: 'get_accounts',
          params: [['etblink']],
        },
        {
          api: 'condenser_api',
          method: 'get_accounts',
          params: [['etblink']],
        },
      ],
    );
    assert.equal(fs.readFileSync(statePath, 'utf8'), before);
  });
});

test('identity challenge rejects a nonexistent public account before any wallet proof can begin', async () => {
  await withStore(async ({ store }) => {
    const key = await signingKey();
    const publicKey = key.createPublic().toString();
    const rpcPool = authorityRpc(publicKey);
    const app = createHiVenuesApp({
      store,
      hiveReadService: { rpcPool },
      identityOrigin: ORIGIN,
      identitySessionSecret: SESSION_SECRET,
    });

    const response = await request(app)
      .post('/identity/challenge')
      .set('origin', ORIGIN)
      .send({ account: 'barfriend' })
      .expect(404);

    assert.equal(response.body.error.code, 'AUTH_ACCOUNT_NOT_FOUND');
    assert.match(response.body.error.message, /does not exist/i);
    assert.deepEqual(rpcPool.calls, [{
      api: 'condenser_api',
      method: 'get_accounts',
      params: [['barfriend']],
    }]);
  });
});

test('product identity proof fails closed for foreign origins, expiry, account mismatch, and replay', async () => {
  await withStore(async ({ store }) => {
    const key = await signingKey();
    const publicKey = key.createPublic().toString();
    const rpcPool = authorityRpc(publicKey);
    let now = Date.parse('2026-09-17T20:00:00Z');
    const app = createHiVenuesApp({
      store,
      hiveReadService: { rpcPool },
      identityOrigin: ORIGIN,
      identitySessionSecret: SESSION_SECRET,
      identityNow: () => now,
    });

    const foreign = await request(app)
      .post('/identity/challenge')
      .set('origin', 'https://attacker.example')
      .send({ account: 'etblink' })
      .expect(403);
    assert.equal(foreign.body.error.code, 'ORIGIN_NOT_ALLOWED');

    const expiring = await request(app)
      .post('/identity/challenge')
      .set('origin', ORIGIN)
      .send({ account: 'etblink' })
      .expect(201);
    now += (5 * 60 * 1000) + 1;
    const expired = await request(app)
      .post('/identity/verify')
      .set('origin', ORIGIN)
      .send({
        account: 'etblink',
        challengeId: expiring.body.id,
        publicKey,
        signature: signMessage(key, expiring.body.message),
      })
      .expect(401);
    assert.equal(expired.body.error.code, 'AUTH_CHALLENGE_EXPIRED');

    const mismatchChallenge = await request(app)
      .post('/identity/challenge')
      .set('origin', ORIGIN)
      .send({ account: 'etblink' })
      .expect(201);
    const mismatch = await request(app)
      .post('/identity/verify')
      .set('origin', ORIGIN)
      .send({
        account: 'barfriend',
        challengeId: mismatchChallenge.body.id,
        publicKey,
        signature: signMessage(key, mismatchChallenge.body.message),
      })
      .expect(401);
    assert.equal(mismatch.body.error.code, 'AUTH_ACCOUNT_MISMATCH');

    const consumed = await request(app)
      .post('/identity/verify')
      .set('origin', ORIGIN)
      .send({
        account: 'etblink',
        challengeId: mismatchChallenge.body.id,
        publicKey,
        signature: signMessage(key, mismatchChallenge.body.message),
      })
      .expect(401);
    assert.equal(consumed.body.error.code, 'AUTH_CHALLENGE_INVALID');
    assert.equal(rpcPool.calls.length, 2);
  });
});

test('identity proof context is cryptographically scoped and consumed on mismatch', async () => {
  const key = await signingKey();
  const publicKey = key.createPublic().toString();
  const rpcPool = authorityRpc(publicKey);
  const services = createHiVenuesIdentityServices({
    rpcPool,
    sessionSecret: SESSION_SECRET,
  });
  const challenge = services.identityProof.issueChallenge('etblink', {
    origin: ORIGIN,
    context: 'host:lantern-fold',
  });

  await assert.rejects(
    services.identityProof.verify({
      account: 'etblink',
      challengeId: challenge.id,
      publicKey,
      signature: signMessage(key, challenge.message),
      origin: ORIGIN,
      context: 'host:quiet-orbit',
    }),
    (error) => error.code === 'AUTH_CONTEXT_MISMATCH',
  );
  await assert.rejects(
    services.identityProof.verify({
      account: 'etblink',
      challengeId: challenge.id,
      publicKey,
      signature: signMessage(key, challenge.message),
      origin: ORIGIN,
      context: 'host:lantern-fold',
    }),
    (error) => error.code === 'AUTH_CHALLENGE_INVALID',
  );
  assert.equal(rpcPool.calls.length, 0);
});

test('identity routes remain explicitly unavailable without a read-side authority provider', async () => {
  await withStore(async ({ store }) => {
    const app = createHiVenuesApp({
      store,
      identityOrigin: ORIGIN,
      identityServices: false,
    });

    const unavailable = await request(app)
      .post('/identity/challenge')
      .set('origin', ORIGIN)
      .send({ account: 'etblink' })
      .expect(503);
    assert.equal(unavailable.body.error.code, 'IDENTITY_PROVIDER_UNAVAILABLE');
    assert.deepEqual((await request(app).get('/identity/session').expect(200)).body, {
      authenticated: false,
    });
  });
});


test('identity proof attempts are rate-limited before provider work is attempted', async () => {
  await withStore(async ({ store }) => {
    const app = createHiVenuesApp({
      store,
      identityOrigin: ORIGIN,
      identityServices: false,
    });

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(app)
        .post('/identity/challenge')
        .set('origin', ORIGIN)
        .send({ account: 'etblink' })
        .expect(503);
      assert.equal(response.body.error.code, 'IDENTITY_PROVIDER_UNAVAILABLE');
    }

    const limited = await request(app)
      .post('/identity/challenge')
      .set('origin', ORIGIN)
      .send({ account: 'etblink' })
      .expect(429);
    assert.equal(limited.body.error.code, 'IDENTITY_RATE_LIMITED');
  });
});


test('delegated posting authority cannot impersonate the claimed account for identity proof', async () => {
  const delegateKey = await signingKey('hivenues-era4-delegated-identity');
  const delegatePublicKey = delegateKey.createPublic().toString();
  const calls = [];
  const rpcPool = {
    calls,
    async call(api, method, params) {
      calls.push({ api, method, params: structuredClone(params) });
      assert.equal(`${api}.${method}`, 'condenser_api.get_accounts');
      return params[0].map((name) => {
        if (name === 'parent') {
          return {
            name: 'parent',
            posting: {
              weight_threshold: 1,
              key_auths: [],
              account_auths: [['delegate', 1]],
            },
          };
        }
        if (name === 'delegate') {
          return {
            name: 'delegate',
            posting: {
              weight_threshold: 1,
              key_auths: [[delegatePublicKey, 1]],
              account_auths: [],
            },
          };
        }
        return null;
      }).filter(Boolean);
    },
  };

  const services = createHiVenuesIdentityServices({
    rpcPool,
    sessionSecret: SESSION_SECRET,
  });
  const challenge = services.identityProof.issueChallenge('parent', {
    origin: ORIGIN,
    context: 'HiVenues participation',
  });

  await assert.rejects(
    services.identityProof.verify({
      account: 'parent',
      challengeId: challenge.id,
      publicKey: delegatePublicKey,
      signature: signMessage(delegateKey, challenge.message),
      origin: ORIGIN,
      context: 'HiVenues participation',
    }),
    (error) => error.code === 'AUTHORITY_MISMATCH',
  );

  assert.deepEqual(calls, [{
    api: 'condenser_api',
    method: 'get_accounts',
    params: [['parent']],
  }]);
});
