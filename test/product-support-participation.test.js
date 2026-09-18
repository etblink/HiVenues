'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');

const { createHiVenuesApp } = require('../src/product/app');
const {
  IDENTITY_COOKIE_NAME,
  createHiVenuesIdentityServices,
} = require('../src/product/identity');
const { HiVenuesStore } = require('../src/product/store');

const ORIGIN = 'http://hivenues.test';
const SLUG = 'northline-hall';

function releaseRecipient(store, recipient = 'northline-pay') {
  const before = store.snapshot(SLUG);
  const edited = store.commit(
    SLUG,
    before.revision,
    'test-value-recipient',
    (draft) => {
      draft.bindings.hive.valueRecipient = recipient;
      draft.voice.terms.support_hive = 'Support the room';
    },
    ['bindings.hive.valueRecipient', 'voice.terms.support_hive'],
    before.draftDigest,
  );
  assert.equal(edited.ok, true);
  const working = store.snapshot(SLUG);
  const released = store.createRelease(SLUG, working.revision, working.draftDigest);
  assert.equal(released.ok, true);
}

function supportReads({ observations = [false, true], omitObservation = false } = {}) {
  const calls = [];
  let observationIndex = 0;
  const reads = {
    calls,
    rpcPool: {
      async call() {
        throw new Error('Identity authority RPC is not expected in support route tests');
      },
    },
    async getProfile(account) {
      return { name: account, displayName: account };
    },
    async getFollowStatus() {
      return false;
    },
    async isCommunityMember() {
      return false;
    },
    async getAccountRecord(account) {
      calls.push({ method: 'getAccountRecord', account });
      if (account === 'paper-sparrow') {
        return {
          name: account,
          balance: '12.345 HIVE',
          hbd_balance: '6.789 HBD',
        };
      }
      if (account === 'northline-pay') {
        return {
          name: account,
          balance: '2.000 HIVE',
          hbd_balance: '1.000 HBD',
        };
      }
      throw new Error('Unknown synthetic Hive account');
    },
    async observeSocialOperation() {
      throw new Error('Direct support must use dedicated exact transaction observation');
    },
  };
  if (!omitObservation) {
    reads.observeSupportOperation = async (record) => {
      calls.push({
        method: 'observeSupportOperation',
        account: record.account,
        action: record.action,
        transactionId: record.transactionId,
        operations: structuredClone(record.operations),
      });
      const value = observations[Math.min(observationIndex, observations.length - 1)];
      observationIndex += 1;
      return value;
    };
  }
  return reads;
}

function fixture({
  withRecipient = true,
  hiveReadService = supportReads(),
} = {}) {
  const store = new HiVenuesStore();
  if (withRecipient) releaseRecipient(store);
  const identityServices = createHiVenuesIdentityServices({
    rpcPool: hiveReadService.rpcPool,
    sessionSecret: 'direct-support-session-secret-00000001',
  });
  const app = createHiVenuesApp({
    store,
    hiveReadService,
    identityServices,
    identityOrigin: ORIGIN,
  });
  return { app, store, hiveReadService, identityServices };
}

function session(identityServices, account = 'paper-sparrow') {
  const created = identityServices.sessionStore.create(account);
  return {
    session: created.session,
    cookie: IDENTITY_COOKIE_NAME + '=' + created.token,
  };
}

function mutate(testRequest, identity) {
  return testRequest
    .set('origin', ORIGIN)
    .set('x-csrf-token', identity.session.csrfToken)
    .set('cookie', identity.cookie);
}

test('support preflight uses the released recipient and fresh current sender balance, ignoring caller recipient', async () => {
  const { app, hiveReadService, identityServices } = fixture();
  const verified = session(identityServices);

  const response = await mutate(
    request(app).post('/participation/' + SLUG + '/support'),
    verified,
  ).send({
    recipient: 'attacker',
    amount: '1.250',
    asset: 'HIVE',
    memo: '#do-not-use',
  }).expect(201);

  assert.equal(response.body.action, 'support-host');
  assert.equal(response.body.account, 'paper-sparrow');
  assert.equal(response.body.signer, 'paper-sparrow');
  assert.equal(response.body.authority, 'Active');
  assert.deepEqual(response.body.operations, [[
    'transfer',
    {
      from: 'paper-sparrow',
      to: 'northline-pay',
      amount: '1.250 HIVE',
      memo: 'hivenues-support:v1',
    },
  ]]);
  assert.equal(response.body.summary.sender, 'paper-sparrow');
  assert.equal(response.body.summary.recipient, 'northline-pay');
  assert.equal(response.body.summary.amount, '1.250 HIVE');
  assert.equal(response.body.summary.availableBalance, '12.345 HIVE');
  assert.match(response.body.summary.consequence, /1\.250 HIVE directly to @northline-pay/i);
  assert.match(response.body.summary.irreversible, /cannot reverse/i);
  assert.match(response.body.summary.purchaseTruth, /not proof of a purchase/i);
  assert.deepEqual(
    hiveReadService.calls.filter((call) => call.method === 'getAccountRecord'),
    [
      { method: 'getAccountRecord', account: 'paper-sparrow' },
      { method: 'getAccountRecord', account: 'northline-pay' },
    ],
  );
});

test('support rejects absent released recipient, malformed assets and amount above fresh liquid balance', async () => {
  const unconfigured = fixture({ withRecipient: false });
  const unconfiguredSession = session(unconfigured.identityServices);
  const missing = await mutate(
    request(unconfigured.app).post('/participation/' + SLUG + '/support'),
    unconfiguredSession,
  ).send({ amount: '1.000', asset: 'HIVE' }).expect(503);
  assert.equal(missing.body.error.code, 'SUPPORT_NOT_CONFIGURED');

  const ordinary = fixture();
  const verified = session(ordinary.identityServices);

  const malformed = await mutate(
    request(ordinary.app).post('/participation/' + SLUG + '/support'),
    verified,
  ).send({ amount: '1.00', asset: 'HIVE' }).expect(400);
  assert.match(malformed.body.error.message, /three decimals/i);

  const unsupported = await mutate(
    request(ordinary.app).post('/participation/' + SLUG + '/support'),
    verified,
  ).send({ amount: '1.000', asset: 'VESTS' }).expect(400);
  assert.match(unsupported.body.error.message, /HIVE or HBD/i);

  const insufficient = await mutate(
    request(ordinary.app).post('/participation/' + SLUG + '/support'),
    verified,
  ).send({ amount: '12.346', asset: 'HIVE' }).expect(409);
  assert.equal(insufficient.body.error.code, 'SUPPORT_BALANCE_INSUFFICIENT');
});

test('support remains pending until dedicated exact transaction observation succeeds', async () => {
  const reads = supportReads({ observations: [false, true] });
  const { app, identityServices } = fixture({ hiveReadService: reads });
  const verified = session(identityServices);

  const prepared = await mutate(
    request(app).post('/participation/' + SLUG + '/support'),
    verified,
  ).send({ amount: '2.000', asset: 'HBD' }).expect(201);

  const accepted = await mutate(
    request(app).post('/participation/preflight/' + prepared.body.id + '/accepted'),
    verified,
  ).send({ transactionId: 'a'.repeat(40) }).expect(200);
  assert.equal(accepted.body.state, 'broadcast_accepted');

  const pending = await mutate(
    request(app).post('/participation/preflight/' + prepared.body.id + '/observe'),
    verified,
  ).send({}).expect(200);
  assert.equal(pending.body.state, 'broadcast_accepted');

  const confirmed = await mutate(
    request(app).post('/participation/preflight/' + prepared.body.id + '/observe'),
    verified,
  ).send({}).expect(200);
  assert.equal(confirmed.body.state, 'observed');

  const observations = reads.calls.filter((call) => call.method === 'observeSupportOperation');
  assert.equal(observations.length, 2);
  assert.equal(observations[0].transactionId, 'a'.repeat(40));
  assert.deepEqual(observations[0].operations, [[
    'transfer',
    {
      from: 'paper-sparrow',
      to: 'northline-pay',
      amount: '2.000 HBD',
      memo: 'hivenues-support:v1',
    },
  ]]);
});

test('duplicate pending support intent and incomplete provider fail closed', async () => {
  const ordinary = fixture();
  const verified = session(ordinary.identityServices);

  const first = await mutate(
    request(ordinary.app).post('/participation/' + SLUG + '/support'),
    verified,
  ).send({ amount: '1.000', asset: 'HIVE' }).expect(201);
  assert.equal(first.body.state, 'prepared');

  const duplicate = await mutate(
    request(ordinary.app).post('/participation/' + SLUG + '/support'),
    verified,
  ).send({ amount: '1.000', asset: 'HIVE' }).expect(409);
  assert.equal(duplicate.body.error.code, 'DUPLICATE_OPERATION');

  const unavailableReads = supportReads({ omitObservation: true });
  const unavailable = fixture({ hiveReadService: unavailableReads });
  const unavailableSession = session(unavailable.identityServices);
  const response = await mutate(
    request(unavailable.app).post('/participation/' + SLUG + '/support'),
    unavailableSession,
  ).send({ amount: '1.000', asset: 'HIVE' }).expect(503);
  assert.equal(response.body.error.code, 'SUPPORT_PROVIDER_UNAVAILABLE');
});

test('support preserves same-origin, verified-session and CSRF consequence boundaries', async () => {
  const { app, identityServices } = fixture();
  const verified = session(identityServices);

  await request(app)
    .post('/participation/' + SLUG + '/support')
    .set('origin', ORIGIN)
    .send({ amount: '1.000', asset: 'HIVE' })
    .expect(401);

  await request(app)
    .post('/participation/' + SLUG + '/support')
    .set('origin', 'https://attacker.example')
    .set('cookie', verified.cookie)
    .set('x-csrf-token', verified.session.csrfToken)
    .send({ amount: '1.000', asset: 'HIVE' })
    .expect(403);

  await request(app)
    .post('/participation/' + SLUG + '/support')
    .set('origin', ORIGIN)
    .set('cookie', verified.cookie)
    .set('x-csrf-token', 'wrong')
    .send({ amount: '1.000', asset: 'HIVE' })
    .expect(403);
});
