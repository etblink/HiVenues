'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { CandidateCHiveIntegrationService } = require('../src/candidate-c/hive-integration');
const { publicSession } = require('../src/candidate-c/hive-integration-router');

function fixtureAccount(name = 'alice') {
  return {
    name,
    posting: {
      weight_threshold: 1,
      account_auths: [],
      key_auths: [['STM7fixturePublicKey11111111111111111111111111111111111', 1]],
    },
    posting_json_metadata: JSON.stringify({ profile: { name: 'Alice', about: 'Synthetic Hive account' } }),
  };
}

function harness() {
  let nowMs = Date.parse('2026-09-15T22:00:00Z');
  let content = null;
  let counter = 0;
  const account = fixtureAccount();
  const calls = [];
  const rpcPool = {
    getStatus() {
      return [{ url: 'https://api.hive.blog', available: true, failures: 0 }];
    },
    async call(api, method, params) {
      calls.push({ api, method, params });
      if (`${api}.${method}` === 'condenser_api.get_accounts') {
        const requested = params?.[0]?.[0];
        return requested === account.name ? [account] : [];
      }
      if (`${api}.${method}` === 'condenser_api.get_dynamic_global_properties') {
        return { head_block_number: 999, head_block_id: 'a'.repeat(40), time: '2026-09-15T22:00:00' };
      }
      if (`${api}.${method}` === 'condenser_api.get_content') return content || { author: '' };
      throw new Error(`Unexpected RPC call ${api}.${method}`);
    },
  };
  const service = new CandidateCHiveIntegrationService({
    rpcPool,
    authorityVerifier: { async isAuthorized(name, publicKey) { return name === 'alice' && publicKey === 'STM7fixture'; } },
    verifySignature: async ({ message, publicKey, signature }) => (
      message.includes('Purpose: Verify Hive account control only') && publicKey === 'STM7fixture' && signature === 'signed'
    ),
    now: () => nowMs,
    random: (bytes) => `token-${bytes}-${++counter}`,
  });
  return {
    account,
    calls,
    service,
    setContent(value) { content = value; },
    advance(ms) { nowMs += ms; },
  };
}

test('Hive integration verifies account control without broadcasting and prevents challenge replay', async () => {
  const { service, calls } = harness();
  const challenge = await service.issueChallenge({
    account: 'alice',
    origin: 'https://example.test',
    slug: 'lantern-fold',
  });

  assert.match(challenge.message, /no transaction or broadcast is authorized/i);
  assert.equal(calls.some((call) => /broadcast/i.test(call.method)), false);

  const session = await service.verify({
    challengeId: challenge.id,
    account: 'alice',
    publicKey: 'STM7fixture',
    signature: 'signed',
    slug: 'lantern-fold',
    origin: 'https://example.test',
  });
  assert.equal(session.account, 'alice');
  assert.equal(service.getSession(session.token, 'lantern-fold')?.account, 'alice');
  const safeSession = publicSession(session);
  assert.deepEqual(Object.keys(safeSession).sort(), ['account', 'expiresAt', 'issuedAt']);
  assert.equal('token' in safeSession, false);

  await assert.rejects(
    service.verify({
      challengeId: challenge.id,
      account: 'alice',
      publicKey: 'STM7fixture',
      signature: 'signed',
      slug: 'lantern-fold',
      origin: 'https://example.test',
    }),
    /already been used/i,
  );
});

test('Hive integration prepares, arms, accepts, and confirms a Posting operation by chain read-back', async () => {
  const { service, setContent } = harness();
  const challenge = await service.issueChallenge({ account: 'alice', origin: 'https://example.test', slug: 'lantern-fold' });
  const session = await service.verify({
    challengeId: challenge.id,
    account: 'alice',
    publicKey: 'STM7fixture',
    signature: 'signed',
    slug: 'lantern-fold',
    origin: 'https://example.test',
  });

  const preflight = service.prepareProfilePost({
    token: session.token,
    slug: 'lantern-fold',
    host: { identity: { displayName: 'Lantern Fold Studio' } },
    title: 'Lantern Fold Studio — from HiVenues',
    body: 'A synthetic host update.',
  });

  assert.equal(preflight.authority, 'Posting');
  assert.equal(preflight.operations[0][0], 'comment');
  assert.equal(preflight.state, 'prepared');
  assert.match(preflight.summary.consequence, /permanent Hive profile post/);
  assert.doesNotMatch(JSON.stringify(preflight), /private.?key|master.?password/i);

  assert.throws(
    () => service.markAccepted({ id: preflight.id, token: session.token, slug: 'lantern-fold', transactionId: 'b'.repeat(40) }),
    /Open this reviewed Hive action/i,
  );

  const armed = service.beginBroadcast({ id: preflight.id, token: session.token, slug: 'lantern-fold' });
  assert.equal(armed.state, 'wallet-open');
  assert.deepEqual(armed.operations, preflight.operations);
  assert.equal(armed.fingerprint, preflight.fingerprint);

  await assert.rejects(
    service.observe({ id: preflight.id, token: session.token, slug: 'lantern-fold' }),
    /Approve this Hive action/i,
  );

  const transactionId = 'b'.repeat(40);
  const accepted = service.markAccepted({ id: preflight.id, token: session.token, slug: 'lantern-fold', transactionId });
  assert.equal(accepted.state, 'wallet-approved');
  assert.equal(accepted.transactionId, transactionId);

  const pending = await service.observe({ id: preflight.id, token: session.token, slug: 'lantern-fold' });
  assert.equal(pending.observed, false);
  assert.equal(pending.state, 'wallet-approved');

  const [, expected] = preflight.operations[0];
  setContent({
    author: expected.author,
    permlink: expected.permlink,
    title: expected.title,
    body: expected.body,
  });
  const confirmed = await service.observe({ id: preflight.id, token: session.token, slug: 'lantern-fold' });
  assert.equal(confirmed.observed, true);
  assert.equal(confirmed.state, 'chain-observable');
});

test('Hive integration blocks stale reviews before wallet open and preserves armed reviews for reconciliation', async () => {
  const { service, advance } = harness();
  const challenge = await service.issueChallenge({ account: 'alice', origin: 'https://example.test', slug: 'lantern-fold' });
  const session = await service.verify({
    challengeId: challenge.id,
    account: 'alice',
    publicKey: 'STM7fixture',
    signature: 'signed',
    slug: 'lantern-fold',
    origin: 'https://example.test',
  });

  const stale = service.prepareProfilePost({
    token: session.token,
    slug: 'lantern-fold',
    host: { identity: { displayName: 'Lantern Fold Studio' } },
    title: 'Stale review',
    body: 'This review should expire before the wallet opens.',
  });
  advance(5 * 60 * 1000 + 1);
  assert.throws(
    () => service.beginBroadcast({ id: stale.id, token: session.token, slug: 'lantern-fold' }),
    /missing or expired/i,
  );

  const fresh = service.prepareProfilePost({
    token: session.token,
    slug: 'lantern-fold',
    host: { identity: { displayName: 'Lantern Fold Studio' } },
    title: 'Armed review',
    body: 'This review is armed before the wallet opens.',
  });
  const armed = service.beginBroadcast({ id: fresh.id, token: session.token, slug: 'lantern-fold' });
  assert.equal(armed.state, 'wallet-open');

  // Reproduce the real proof failure: wallet interaction lasts longer than the
  // short prepared-review TTL. Once armed, the exact review must still be
  // recordable and reconcilable rather than being pruned after a chain write.
  advance(5 * 60 * 1000 + 1);
  const accepted = service.markAccepted({
    id: fresh.id,
    token: session.token,
    slug: 'lantern-fold',
    transactionId: 'c'.repeat(40),
  });
  assert.equal(accepted.state, 'wallet-approved');
  assert.equal(accepted.fingerprint, fresh.fingerprint);
});

test('Hive integration expires verification challenges and rejects unknown accounts', async () => {
  const { service, advance } = harness();
  await assert.rejects(
    service.issueChallenge({ account: 'nobody', origin: 'https://example.test', slug: 'lantern-fold' }),
    /does not exist/i,
  );

  const challenge = await service.issueChallenge({ account: 'alice', origin: 'https://example.test', slug: 'lantern-fold' });
  advance(5 * 60 * 1000 + 1);
  await assert.rejects(
    service.verify({
      challengeId: challenge.id,
      account: 'alice',
      publicKey: 'STM7fixture',
      signature: 'signed',
      slug: 'lantern-fold',
      origin: 'https://example.test',
    }),
    /expired/i,
  );
});
