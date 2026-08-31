'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const axe = require('axe-core');
const { HtmlValidate } = require('html-validate');
const { JSDOM } = require('jsdom');
const request = require('supertest');
const { BETA_ACTIONS, isBetaAction } = require('../src/beta/actions');
const { createApp } = require('../src/app');
const { SessionStore } = require('../src/auth/session-store');
const { BETA_SELF_ACTIONS, loadConfig } = require('../src/config');
const { ACTIONS } = require('../src/hive/social-operations');
const { assertPrivexBetaRelease } = require('../src/release/beta-readiness');
const { BETA_M16_4_ACTIONS } = require('../src/routes/m4');
const { BETA_M16_3_ACTIONS } = require('../src/routes/social');
const { configFrom, logger } = require('./support/test-app');
const { createFixtureRpc } = require('./support/fixture-rpc');

const SESSION_SECRET = 'test-session-secret-that-is-at-least-32-bytes';

function productionBetaSource(overrides = {}) {
  return {
    NODE_ENV: 'production', PORT: '3000', BIND_HOST: '127.0.0.1', HIVE_BAR_HOST: 'fourthstreetbar.com', SITE_NAME: '4th Street Bar',
    BAR_ADDRESS: '1114 E. 4th Street, Reno, NV 89512', BAR_PHONE: '(775) 324-7827', BAR_HOURS: 'Daily, 12:00 p.m.–2:00 a.m.',
    BAR_WEBSITE_URL: 'https://4thstreetbarreno.com/', BAR_MAP_URL: 'https://www.google.com/maps/search/?api=1&query=4th+Street+Bar+Reno',
    HIVE_COMMUNITY_ID: 'hive-108590', HIVE_OFFICIAL_BAR_ACCOUNT: 'fourthstreetbar', THREADS_CONTAINER_ACCOUNT: 'fourthst.threads',
    HIVE_RPC_NODES: 'https://api.hive.blog,https://api.deathwing.me,https://api.openhive.network', HIVE_WRITE_MODE: 'beta', HIVE_SIGNER_MODE: 'keychain',
    HIVE_CONTROLLED_ACCOUNTS: '', HIVE_CONTROLLED_ACTIONS: '', HIVE_WALL_DEFAULT_FEE: '1.000 HBD', HIVE_GLOBAL_WALL_EXCLUSIONS: '',
    HIVE_MESSAGE_HISTORY_PAGE_SIZE: '25', HIVE_PAYMENT_ENABLED: 'false', HIVE_PAYMENT_MERCHANT_ACCOUNTS: 'fourthstreetbar',
    HIVE_PAYMENT_MAX_HBD: '1.000 HBD', HIVE_PAYMENT_RECEIPT_DB_PATH: ':memory:', HIVE_PAYMENT_CONFIRMATION_TIMEOUT_MS: '120000',
    DISTRIATOR_ENABLED: 'false', DISTRIATOR_CLAIM_URL: 'https://distriator.com/', HIVE_APP_TAG: 'fourth-street-bar-app/0.1.0',
    HIVE_RPC_TIMEOUT_MS: '8000', HIVE_RPC_FAILURE_THRESHOLD: '2', HIVE_RPC_COOLDOWN_MS: '30000', RATE_LIMIT_WINDOW_MS: '60000', RATE_LIMIT_MAX: '120',
    AUTH_RATE_LIMIT_MAX: '10', APP_ORIGIN: 'https://fourthstreetbar.com', SESSION_SECRET, SESSION_TTL_MS: '28800000', AUTH_CHALLENGE_TTL_MS: '300000',
    SOCIAL_PREFLIGHT_TTL_MS: '300000', TRUST_PROXY: 'loopback', LOG_LEVEL: 'info', ...overrides,
  };
}

function betaFixture({ account = 'etblink' } = {}) {
  const config = configFrom({ HIVE_WRITE_MODE: 'beta', HIVE_SIGNER_MODE: 'keychain', HIVE_CONTROLLED_ACCOUNTS: '', HIVE_CONTROLLED_ACTIONS: '', HIVE_PAYMENT_ENABLED: 'false', SESSION_SECRET, RATE_LIMIT_MAX: '1000' });
  const sessionStore = new SessionStore({ secret: config.auth.sessionSecret, ttlMs: config.auth.sessionTtlMs });
  const { token } = sessionStore.create(account);
  return { app: createApp({ config, logger, rpcPool: createFixtureRpc(), sessionStore }), config, token };
}

function messageSummary(report) {
  return report.results.flatMap((result) => result.messages).map((message) => `${message.ruleId}: ${message.message} (${message.selector || 'document'})`).join('\n');
}

test('C2-G.1 preserves the exact twelve-action beta social manifest without pretending payment is a social action', () => {
  assert.deepEqual(BETA_ACTIONS, ['post','comment','vote','follow','unfollow','subscribe','unsubscribe','profile','claim-rewards','wall','inbox','thread']);
  assert.equal(Object.isFrozen(BETA_ACTIONS), true);
  for (const action of BETA_ACTIONS) assert.equal(isBetaAction(action), true);
  assert.equal(isBetaAction('payment'), false);
  const acceptedSocialActions = [...ACTIONS].filter((action) => isBetaAction(action));
  const acceptedLaneUnion = [...new Set([...acceptedSocialActions, ...BETA_M16_4_ACTIONS])].sort();
  assert.deepEqual(acceptedLaneUnion, [...BETA_ACTIONS].sort());
  assert.deepEqual(BETA_SELF_ACTIONS, ['post', 'comment', 'thread']);
  assert.deepEqual([...BETA_M16_3_ACTIONS], ['vote','follow','unfollow','subscribe','unsubscribe']);
});

test('Privex beta release gate requires an explicit disabled Pay decision in the accepted non-payment profile', () => {
  const source = productionBetaSource();
  const config = loadConfig(source, { loadDotenv: false });
  const summary = assertPrivexBetaRelease(config, source);
  assert.equal(summary.profile, 'privex-beta-self-signing');
  assert.equal(summary.writeMode, 'beta');
  assert.equal(summary.signerMode, 'keychain');
  assert.deepEqual(summary.betaActions, BETA_ACTIONS);
  assert.equal(summary.controlledAccountCount, 0);
  assert.equal(summary.controlledActionCount, 0);
  assert.equal(summary.paymentsEnabled, false);
  assert.equal(summary.distriatorEnabled, false);
  assert.equal(summary.rpcNodeCount, 3);

  const missing = { ...source };
  delete missing.HIVE_PAYMENT_ENABLED;
  assert.throws(() => assertPrivexBetaRelease(loadConfig(missing, { loadDotenv: false }), missing), /HIVE_PAYMENT_ENABLED/);
});

test('Privex beta release gate refuses controlled residue, premature Pay/Distriator, or wrong topology', () => {
  for (const [overrides, pattern] of [
    [{ HIVE_CONTROLLED_ACCOUNTS: 'etblink' }, /HIVE_CONTROLLED_ACCOUNTS must be explicitly empty/],
    [{ HIVE_CONTROLLED_ACTIONS: 'post' }, /HIVE_CONTROLLED_ACTIONS must be explicitly empty/],
    [{ DISTRIATOR_ENABLED: 'true' }, /Distriator handoff requires enabled Pay/],
    [{ HIVE_BAR_HOST: 'www.fourthstreetbar.com', APP_ORIGIN: 'https://www.fourthstreetbar.com' }, /must be exactly fourthstreetbar\.com/],
    [{ TRUST_PROXY: 'false' }, /TRUST_PROXY must be exactly loopback/],
    [{ BIND_HOST: '0.0.0.0' }, /BIND_HOST must be 127\.0\.0\.1/],
    [{ HIVE_M10_OPERATOR_ARMED_UNTIL: '2099-01-01T00:00:00Z' }, /no M9\/M10\/M12/],
    [{ HIVE_PAYMENT_ENABLED: 'true' }, /Enabled payment requires an explicit durable receipt database path/],
  ]) {
    const source = productionBetaSource(overrides);
    assert.throws(() => {
      const config = loadConfig(source, { loadDotenv: false });
      assertPrivexBetaRelease(config, source);
    }, pattern);
  }
});

test('signed-in beta documents retain structural and serious accessibility gates with Pay disabled', async () => {
  const fixture = betaFixture();
  const routes = ['/community','/post/etblink/welcome-fourth-street-bar','/profile/etblink/wallet','/profile/etblink/settings','/profile/barfriend/wall-posts','/profile/etblink/inbox','/pay'];
  const validator = new HtmlValidate({ extends: ['html-validate:recommended'], rules: { 'no-trailing-whitespace': 'off' } });
  for (const route of routes) {
    const response = await request(fixture.app).get(route).set('cookie', `hive_bar_session=${fixture.token}`).expect(200);
    const report = await validator.validateString(response.text);
    assert.equal(report.valid, true, `${route}\n${messageSummary(report)}`);
    const dom = new JSDOM(response.text, { runScripts: 'outside-only', url: `https://hive-bar.test${route}` });
    dom.window.eval(axe.source);
    const result = await dom.window.axe.run(dom.window.document, { resultTypes: ['violations'], rules: { 'color-contrast': { enabled: false } } });
    const blocking = result.violations.filter((violation) => ['serious','critical'].includes(violation.impact));
    dom.window.close();
    assert.equal(blocking.length, 0, `${route}\n${JSON.stringify(blocking.map((item) => item.id))}`);
  }
  const pay = await request(fixture.app).get('/pay').set('cookie', `hive_bar_session=${fixture.token}`).expect(200);
  assert.match(pay.text, /Payments aren’t available at 4th Street Bar/);
  assert.doesNotMatch(pay.text, /Sign in to pay|data-pay-form/);
  assert.doesNotMatch(pay.text, /<span class="app-nav-label">Pay<\/span>/);
});

test('responsive shell and activation tooling retain explicit mobile, desktop, and rollback-safe boundaries', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'input.css'), 'utf8');
  assert.match(css, /min-width:\s*320px/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media\s*\(min-width:\s*640px\)/);
  assert.match(css, /@media\s*\(min-width:\s*1200px\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  const startup = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'start-privex.js'), 'utf8');
  assert.match(startup, /config\.hive\.writeMode === 'beta'/);
  assert.match(startup, /assertPrivexBetaRelease/);
});
