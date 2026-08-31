'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const { createApp } = require('../src/app');
const { SessionStore } = require('../src/auth/session-store');
const { createFixtureRpc } = require('./support/fixture-rpc');
const { configFrom, createFixtureApp, logger } = require('./support/test-app');

const SESSION_SECRET = 'test-session-secret-that-is-at-least-32-bytes';

function controlledApp({ payment = false } = {}) {
  const config = configFrom({
    HIVE_WRITE_MODE: payment ? 'beta' : 'controlled',
    HIVE_SIGNER_MODE: payment ? 'keychain' : 'disabled',
    HIVE_CONTROLLED_ACCOUNTS: payment ? '' : 'etblink',
    ...(payment ? { HIVE_CONTROLLED_ACTIONS: '', HIVE_PAYMENT_ENABLED: 'true' } : {}),
    SESSION_SECRET,
    RATE_LIMIT_MAX: '1000',
    ...(payment ? {
      HIVE_PAYMENT_MERCHANT_ACCOUNTS: 'fourthstreetbar',
      HIVE_PAYMENT_RECEIPT_DB_PATH: ':memory:',
      DISTRIATOR_ENABLED: 'false',
      DISTRIATOR_CLAIM_URL: 'https://distriator.com/#/claim',
    } : {}),
  });
  const sessionStore = new SessionStore({
    secret: config.auth.sessionSecret,
    ttlMs: config.auth.sessionTtlMs,
  });
  const { token } = sessionStore.create('etblink');
  return {
    app: createApp({ config, logger, rpcPool: createFixtureRpc(), sessionStore }),
    cookie: `hive_bar_session=${token}`,
  };
}

test('M15.4 Wallet is human-first while remaining a public read-only snapshot', async () => {
  const { app } = createFixtureApp();
  const response = await request(app).get('/profile/etblink/wallet').expect(200);

  assert.match(response.text, /data-m15-surface="wallet"/);
  assert.match(response.text, /Public on Hive/);
  assert.match(response.text, /Liquid HIVE/);
  assert.match(response.text, /Liquid HBD/);
  assert.match(response.text, /Hive Power/);
  assert.match(response.text, /Voting power/);
  assert.match(response.text, /Resource credits/);
  assert.match(response.text, /Claimable rewards/);
  assert.match(response.text, /This page only reads public Hive data/);
  assert.match(response.text, /cannot move funds or access private keys/);
  assert.doesNotMatch(response.text, /data-m4-action="claim-rewards"/);
});

test('M15.4 Wallet retains the exact owner reward-claim gate', async () => {
  const owner = controlledApp();
  const response = await request(owner.app)
    .get('/profile/etblink/wallet')
    .set('cookie', owner.cookie)
    .expect(200);

  assert.match(response.text, /data-m4-action="claim-rewards"/);
  assert.match(response.text, /Review reward claim/);
  assert.match(response.text, /checks your current rewards again before Keychain asks for approval/i);
});

test('M15.4 disabled Pay is explicit before sign-in and exposes no new-payment workflow', async () => {
  const { app } = createFixtureApp();
  const response = await request(app).get('/pay').expect(200);

  assert.match(response.text, /data-m15-surface="pay"/);
  assert.match(response.text, /Payments aren’t available at 4th Street Bar/);
  assert.match(response.text, /4th Street Bar does not currently offer payments through Hive-Venues/);
  assert.doesNotMatch(response.text, /Pay with HBD/);
  assert.doesNotMatch(response.text, /Verified destination/);
  assert.doesNotMatch(response.text, /Sign in to pay/);
  assert.doesNotMatch(response.text, /data-pay-form/);
  assert.doesNotMatch(response.text, /zxing-browser\.min\.js/);
  assert.doesNotMatch(response.text, /\/js\/pay-tab\.js/);
});

test('M15.4 explicitly enabled Pay presents venue identity and the no-duplicate-payment model before sign-in', async () => {
  const fixture = controlledApp({ payment: true });
  const response = await request(fixture.app).get('/pay').expect(200);

  assert.match(response.text, /data-m15-surface="pay"/);
  assert.match(response.text, /src="\/images\/fourth-street-bar-logo\.jpg"/);
  assert.match(response.text, /Pay at 4th Street Bar/);
  assert.match(response.text, /Pay with HBD/);
  assert.match(response.text, /Paid means confirmed/);
  assert.match(response.text, /independent Hive nodes confirm the same transfer is final/);
  assert.match(response.text, /If confirmation is unclear, don’t pay again/);
  assert.match(response.text, /Keychain approval can happen before Hive-Venues sees final confirmation/);
  assert.match(response.text, /Sign in to pay/);
  assert.doesNotMatch(response.text, /data-pay-form/);
});

test('M15.4 explicitly enabled beta Pay keeps every payment hook, review boundary, and neutral Distriator handoff without an amount ceiling', async () => {
  const fixture = controlledApp({ payment: true });
  const response = await request(fixture.app)
    .get('/pay')
    .set('cookie', fixture.cookie)
    .expect(200);

  assert.match(response.text, /Pay at 4th Street Bar/);
  assert.match(response.text, /data-pay-form/);
  assert.match(response.text, /data-pay-camera-start/);
  assert.match(response.text, /data-pay-camera-stop/);
  assert.match(response.text, /data-pay-image/);
  assert.match(response.text, /data-pay-uri/);
  assert.match(response.text, /data-pay-status/);
  assert.match(response.text, /data-pay-receipt/);
  assert.match(response.text, /data-pay-receipt-state/);
  assert.match(response.text, /data-pay-recheck/);
  assert.match(response.text, /Check payment details/);
  assert.match(response.text, /HBD payment QR provided by 4th Street Bar/);
  assert.match(response.text, /Hive-Venues checks the payment and shows you exactly what will be sent/);
  assert.match(response.text, /Hive-Venues never receives your private keys/);
  assert.match(response.text, /data-distriator-handoff hidden/);
  assert.match(response.text, /data-distriator-handoff-link/);
  assert.match(response.text, /href="https:\/\/distriator\.com\/#\/claim"/);
  assert.match(response.text, /Distriator is a separate service that may recognize qualifying purchases/);
  assert.match(response.text, /does not determine or guarantee recognition, eligibility, cashback amount, claim processing, or payout/);
  assert.doesNotMatch(response.text, /data-distriator-claim/);
  assert.doesNotMatch(response.text, /Maximum payment/i);
  assert.doesNotMatch(response.text, /Hive-Bar/);
});

test('M15.4 disabled merchant-bound state preserves existing receipt recovery without preparing a new payment', async () => {
  const fixture = controlledApp();
  const response = await request(fixture.app)
    .get('/pay')
    .set('cookie', fixture.cookie)
    .expect(200);

  assert.match(response.text, /Payments aren’t available at 4th Street Bar/);
  assert.match(response.text, /existing receipt can still be checked/i);
  assert.match(response.text, /data-pay-receipt/);
  assert.match(response.text, /\/js\/pay-tab\.js/);
  assert.doesNotMatch(response.text, /data-pay-form/);
  assert.doesNotMatch(response.text, /zxing-browser\.min\.js/);
});

test('M15.4 preserves the accepted browser payment state machine source', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'pay-tab.js'), 'utf8');

  assert.match(source, /authority: 'Active'/);
  assert.match(source, /receipt\.state === 'ChainConfirmed'/);
  assert.match(source, /'BroadcastAccepted', 'ConfirmationTimeout'/);
  assert.match(source, /Do not pay again or retry automatically|do not pay again or retry automatically/);
  assert.match(source, /Recheck Hive before considering any new payment/);
});

test('M15.4 presentation stylesheet is local, token-driven, and contains no remote asset dependency', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'm15-wallet-pay.css'), 'utf8');
  const payTemplate = fs.readFileSync(path.join(__dirname, '..', 'views', 'pages', 'pay', 'index.ejs'), 'utf8');

  assert.match(css, /var\(--hb-bg\)|var\(--hb-text\)/);
  assert.match(css, /\.wallet-social/);
  assert.match(css, /\.pay-shell/);
  assert.match(css, /\.pay-receipt/);
  assert.doesNotMatch(css, /https?:\/\//i);
  assert.doesNotMatch(css, /url\s*\(/i);
  assert.doesNotMatch(payTemplate, /\bUSD\b|subtotal|line item|suggested tip/i);
});
