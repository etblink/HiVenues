'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const { encodeOp } = require('./support/hive-signing-uri-fixtures');
const { createApp } = require('../src/app');
const { SessionStore } = require('../src/auth/session-store');
const { configFrom, logger } = require('./support/test-app');
const { createFixtureRpc } = require('./support/fixture-rpc');
const { createStaticAssetUrl } = require('../src/release/static-assets');

const ORIGIN = 'http://localhost:3000';
const SESSION_SECRET = 'test-session-secret-that-is-at-least-32-bytes';
const v4vBlankPayerInvoice = fs.readFileSync(path.join(__dirname, 'fixtures', 'payments', 'v4v-hbd-blank-payer.txt'), 'utf8').trim();

function invoice({ account = 'etblink', memo = 'v4v-pos:tab-123', amount = '0.001 HBD', merchant = 'fourthstreetbar' } = {}) {
  return encodeOp(['transfer', { from: '__signer', to: merchant, amount, memo }], { signer: account, authority: 'active' });
}

function betaPayApp({ account = 'etblink', configOverrides = {}, paymentObserver, now } = {}) {
  const config = configFrom({
    HIVE_WRITE_MODE: 'beta', HIVE_SIGNER_MODE: 'keychain', HIVE_CONTROLLED_ACCOUNTS: '', HIVE_CONTROLLED_ACTIONS: '',
    HIVE_PAYMENT_ENABLED: 'true', HIVE_PAYMENT_MERCHANT_ACCOUNTS: 'fourthstreetbar', HIVE_PAYMENT_MAX_HBD: '1.000 HBD',
    HIVE_PAYMENT_RECEIPT_DB_PATH: ':memory:', DISTRIATOR_CLAIM_URL: 'https://distriator.com/', SESSION_SECRET, RATE_LIMIT_MAX: '1000',
    ...configOverrides,
  });
  const sessionStore = new SessionStore({ secret: config.auth.sessionSecret, ttlMs: config.auth.sessionTtlMs });
  const { session, token } = sessionStore.create(account);
  const observer = paymentObserver || { async observe() { return { status: 'confirmed', blockNumber: 109000000, transactionIndex: 2, chainTimestamp: '2026-08-13T08:00:05', corroborations: 2 }; } };
  const app = createApp({ config, logger, rpcPool: createFixtureRpc(), sessionStore, paymentObserver: observer, now });
  app.locals.assetUrl = createStaticAssetUrl(path.join(__dirname, '..', 'public'));
  return { app, config, session, token };
}

function authorized(builder, fixture) {
  return builder.set('origin', ORIGIN).set('cookie', `hive_bar_session=${fixture.token}`).set('x-csrf-token', fixture.session.csrfToken);
}

test('general beta patron preflights one exact merchant HBD transfer and reaches Paid only after exact observation', async () => {
  const fixture = betaPayApp({ configOverrides: { DISTRIATOR_ENABLED: 'true' } });
  assert.deepEqual(fixture.config.hive.controlledAccounts, []);
  assert.deepEqual(fixture.config.hive.controlledActions, []);
  const preflight = await authorized(request(fixture.app).post('/api/payments/preflight'), fixture).send({ uri: invoice() }).expect(201);
  assert.equal(preflight.body.account, 'etblink');
  assert.equal(preflight.body.authority, 'Active');
  assert.deepEqual(preflight.body.operations, [['transfer', { from: 'etblink', to: 'fourthstreetbar', amount: '0.001 HBD', memo: 'v4v-pos:tab-123' }]]);
  assert.equal(preflight.body.distriatorHandoff.available, false);
  await authorized(request(fixture.app).post(`/api/payments/${preflight.body.id}/awaiting-signature`), fixture).expect(200);
  await authorized(request(fixture.app).post(`/api/payments/${preflight.body.id}/accepted`), fixture).send({ transactionId: 'a'.repeat(40) }).expect(200);
  const confirmed = await authorized(request(fixture.app).post(`/api/payments/${preflight.body.id}/observe`), fixture).expect(200);
  assert.equal(confirmed.body.state, 'ChainConfirmed');
  assert.equal(confirmed.body.paid, true);
  assert.equal(confirmed.body.distriatorHandoff.available, true);
  assert.equal(confirmed.body.distriatorHandoff.url, 'https://distriator.com/');
});

test('binds a current V4V blank-payer invoice only to the verified session account', async () => {
  const fixture = betaPayApp();
  const preflight = await authorized(request(fixture.app).post('/api/payments/preflight'), fixture).send({ uri: v4vBlankPayerInvoice, account: 'otheruser' }).expect(201);
  assert.equal(preflight.body.account, 'etblink');
  assert.equal(preflight.body.operations[0][1].from, 'etblink');
  assert.equal(preflight.body.amount, '0.100 HBD');
  const other = betaPayApp({ account: 'barfriend' });
  await authorized(request(other.app).post('/api/payments/preflight'), other).send({ uri: invoice({ account: 'etblink', memo: 'wrong-payer' }) }).expect(400);
});

test('blocks a second unresolved payment, releases the payer after cancellation, and permanently rejects exact invoice replay', async () => {
  const fixture = betaPayApp();
  const first = await authorized(request(fixture.app).post('/api/payments/preflight'), fixture).send({ uri: invoice({ memo: 'one' }) }).expect(201);
  await authorized(request(fixture.app).post('/api/payments/preflight'), fixture).send({ uri: invoice({ memo: 'two' }) }).expect(409).expect(({ body }) => assert.equal(body.error.code, 'PAYMENT_UNRESOLVED'));
  await authorized(request(fixture.app).post(`/api/payments/${first.body.id}/cancel`), fixture).expect(200);
  await authorized(request(fixture.app).post('/api/payments/preflight'), fixture).send({ uri: invoice({ memo: 'one' }) }).expect(409).expect(({ body }) => assert.equal(body.error.code, 'DUPLICATE_PAYMENT'));
  await authorized(request(fixture.app).post('/api/payments/preflight'), fixture).send({ uri: invoice({ memo: 'two' }) }).expect(201);
});

test('keeps ambiguous accepted broadcasts pending and blocks another payment', async () => {
  let now = Date.parse('2026-08-13T08:00:00Z');
  const fixture = betaPayApp({ configOverrides: { HIVE_PAYMENT_CONFIRMATION_TIMEOUT_MS: '1000' }, now: () => now, paymentObserver: { async observe() { return { status: 'pending', diagnostic: 'one node only' }; } } });
  const preflight = await authorized(request(fixture.app).post('/api/payments/preflight'), fixture).send({ uri: invoice({ memo: 'pending' }) }).expect(201);
  await authorized(request(fixture.app).post(`/api/payments/${preflight.body.id}/awaiting-signature`), fixture).expect(200);
  await authorized(request(fixture.app).post(`/api/payments/${preflight.body.id}/accepted`), fixture).send({ transactionId: null }).expect(200);
  now += 1001;
  const timedOut = await authorized(request(fixture.app).post(`/api/payments/${preflight.body.id}/observe`), fixture).expect(200);
  assert.equal(timedOut.body.state, 'ConfirmationTimeout');
  await authorized(request(fixture.app).post('/api/payments/preflight'), fixture).send({ uri: invoice({ memo: 'another' }) }).expect(409);
});

test('same-account receipt observation remains available after new Pay preparation is disabled', async () => {
  const original = betaPayApp();
  const preflight = await authorized(request(original.app).post('/api/payments/preflight'), original).send({ uri: invoice({ memo: 'recovery' }) }).expect(201);
  await authorized(request(original.app).post(`/api/payments/${preflight.body.id}/awaiting-signature`), original).expect(200);
  await authorized(request(original.app).post(`/api/payments/${preflight.body.id}/accepted`), original).send({ transactionId: 'b'.repeat(40) }).expect(200);

  const config = configFrom({ HIVE_WRITE_MODE: 'beta', HIVE_SIGNER_MODE: 'keychain', HIVE_CONTROLLED_ACCOUNTS: '', HIVE_CONTROLLED_ACTIONS: '', HIVE_PAYMENT_ENABLED: 'false', SESSION_SECRET, RATE_LIMIT_MAX: '1000' });
  const sessionStore = new SessionStore({ secret: config.auth.sessionSecret, ttlMs: config.auth.sessionTtlMs });
  const { session, token } = sessionStore.create('etblink');
  const recovered = { app: createApp({ config, logger, rpcPool: createFixtureRpc(), sessionStore, receiptStore: original.app.locals.services.receiptStore, paymentObserver: { async observe() { return { status: 'confirmed', blockNumber: 109000001, transactionIndex: 1 }; } } }), session, token };
  const result = await authorized(request(recovered.app).post(`/api/payments/${preflight.body.id}/observe`), recovered).expect(200);
  assert.equal(result.body.state, 'ChainConfirmed');
  await authorized(request(recovered.app).post('/api/payments/preflight'), recovered).send({ uri: invoice({ memo: 'new' }) }).expect(503).expect(({ body }) => assert.equal(body.error.code, 'PAYMENT_DISABLED'));
});

test('Pay fails closed when its durable store is unavailable without taking unrelated surfaces down', async () => {
  const fixture = betaPayApp({ configOverrides: { HIVE_PAYMENT_RECEIPT_DB_PATH: '/definitely/missing/hive-bar/payments/receipts.sqlite3' } });
  assert.equal(fixture.app.locals.services.receiptStore, null);
  await authorized(request(fixture.app).post('/api/payments/preflight'), fixture).send({ uri: invoice() }).expect(503).expect(({ body }) => assert.equal(body.error.code, 'PAYMENT_STORE_UNAVAILABLE'));
  await request(fixture.app).get('/healthz').expect(200);
});

test('Pay navigation and client remain available while Distriator handoff follows venue participation', async () => {
  const notParticipating = betaPayApp({ configOverrides: { DISTRIATOR_ENABLED: 'false' } });
  const page = await request(notParticipating.app).get('/pay').set('cookie', `hive_bar_session=${notParticipating.token}`).expect(200);
  assert.match(page.text, /href="\/pay"/);
  assert.match(page.text, /src="\/js\/pay-tab\.js\?v=[0-9a-f]{64}"/);
  assert.doesNotMatch(page.text, /data-distriator-handoff/);
  assert.doesNotMatch(page.text, /distriator\.com/i);

  const participating = betaPayApp({ configOverrides: { DISTRIATOR_ENABLED: 'true' } });
  const participatingPage = await request(participating.app).get('/pay').set('cookie', `hive_bar_session=${participating.token}`).expect(200);
  assert.match(participatingPage.text, /data-distriator-handoff hidden/);
  assert.match(participatingPage.text, /data-distriator-handoff-link/);
  assert.match(participatingPage.text, /href="https:\/\/distriator\.com\/"/);
  assert.match(participatingPage.text, /This venue is configured for Distriator rebate participation/);

  const disabled = betaPayApp({ configOverrides: { HIVE_PAYMENT_ENABLED: 'false', DISTRIATOR_ENABLED: 'false' } });
  const home = await request(disabled.app).get('/').set('cookie', `hive_bar_session=${disabled.token}`).expect(200);
  assert.doesNotMatch(home.text, /href="\/pay"[^>]*>\s*<svg/);
});
