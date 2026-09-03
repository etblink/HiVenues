'use strict';
/* global document */

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { SessionStore } = require('../src/auth/session-store');
const { createApp } = require('../src/app');
const { createStaticAssetUrl } = require('../src/release/static-assets');
const { extractDeploymentAgnosticVenueSource } = require('../src/venue/source');
const { configFrom, logger } = require('../test/support/test-app');
const { createFixtureRpc } = require('../test/support/fixture-rpc');
const { FOURTH_STREET_AUTHORING_INPUT } = require('../test/support/hv5-authoring-fixtures');
const { JUNIPER_WORKS_AUTHORING_INPUT } = require('../test/support/hv7-juniper-venue');
const { createSourceAuthoringFixture } = require('../test/support/source-authoring-fixture');
const { listenLoopback, closeServer } = require('./support/visual-harness');

const ROOT = path.resolve(__dirname, '..');
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'visual-qualification-contract.json'), 'utf8'));
const OUTPUT = path.resolve(ROOT, process.env.VISUAL_REVIEW_ROOT || contract.execution.reviewRoot);
const SHOTS = path.join(OUTPUT, 'screenshots');
const NOW = Date.parse('2026-08-18T02:15:00Z');
const ACCOUNT = 'etblink';
const KEYCHAIN_STUB = `'use strict'; Object.defineProperty(window, '__CURRENT_VISUAL_KEYCHAIN_DISABLED__', { value: true }); window.HiveBarKeychain = Object.freeze({ KeychainAdapter: class { async broadcast() { throw new Error('Current visual review forbids Keychain signing'); } async signBuffer() { throw new Error('Current visual review forbids Keychain signing'); } async decodeMemo() { throw new Error('Current visual review forbids Keychain use'); } } });`;
const AVATAR_PLACEHOLDER = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="#211c18"/><circle cx="48" cy="36" r="18" fill="#f4a460"/><path d="M20 91c4-24 16-36 28-36s24 12 28 36" fill="#f4a460"/></svg>');

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function deterministicSessionRandom() {
  const values = ['current-visual-session-id', 'current-visual-csrf-token'];
  return () => {
    const value = values.shift();
    if (!value) throw new Error('Current visual review requested unexpected session randomness');
    return value;
  };
}

function createApplicationFixture() {
  const config = configFrom({
    HIVE_WRITE_MODE: 'beta',
    HIVE_SIGNER_MODE: 'keychain',
    HIVE_PAYMENT_ENABLED: 'true',
    HIVE_PAYMENT_MERCHANT_ACCOUNTS: 'fourthstreetbar',
    HIVE_PAYMENT_MAX_HBD: '1.000 HBD',
    HIVE_PAYMENT_RECEIPT_DB_PATH: ':memory:',
    RATE_LIMIT_MAX: '10000',
    SESSION_SECRET: 'current-visual-review-session-secret-32-bytes-minimum',
  });
  const rpcPool = createFixtureRpc();
  const sessionStore = new SessionStore({
    secret: config.auth.sessionSecret,
    ttlMs: config.auth.sessionTtlMs,
    now: () => NOW,
    random: deterministicSessionRandom(),
  });
  const { token } = sessionStore.create(ACCOUNT);
  const app = createApp({ config, logger, now: () => NOW, rpcPool, sessionStore });
  app.locals.assetUrl = createStaticAssetUrl(path.join(ROOT, 'public'));
  app.locals.currentYear = new Date(NOW).getUTCFullYear();
  return { app, config, rpcPool, sessionStore, token };
}

async function installReadOnlyNetworkGuard(context, origin, violations) {
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) {
      if (request.resourceType() === 'image') {
        return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: AVATAR_PLACEHOLDER });
      }
      violations.push({ reason: 'outbound-origin', method: request.method(), url: request.url() });
      return route.abort('blockedbyclient');
    }
    if (!['GET', 'HEAD'].includes(request.method())) {
      violations.push({ reason: 'mutation-method', method: request.method(), url: request.url() });
      return route.abort('blockedbyclient');
    }
    if (url.pathname === '/js/keychain-adapter.js') {
      return route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body: KEYCHAIN_STUB });
    }
    return route.continue();
  });
}

async function settle(page) {
  await page.addStyleTag({ content: '*{animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important}' });
  const pendingVisibleImages = await page.evaluate(async () => {
    const pause = (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));
    await Promise.race([document.fonts.ready, pause(3000)]);
    const images = Array.from(document.images).filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom > 0 && rect.right > 0 && rect.top < globalThis.innerHeight && rect.left < globalThis.innerWidth;
    });
    await Promise.all(images.map(async (image) => {
      if (image.complete) return;
      await Promise.race([
        new Promise((resolve) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        }),
        pause(3000),
      ]);
    }));
    await new Promise((resolve) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve)));
    globalThis.scrollTo(0, 0);
    return images.filter((image) => !image.complete).map((image) => image.currentSrc || image.src);
  });
  assert.deepEqual(pendingVisibleImages, [], `Viewport images did not settle: ${JSON.stringify(pendingVisibleImages)}`);
}

async function captureApplicationScenario(browser, baseUrl, token, scenario) {
  const context = await browser.newContext({
    viewport: scenario.viewport,
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    locale: 'en-US',
  });
  const violations = [];
  await installReadOnlyNetworkGuard(context, new URL(baseUrl).origin, violations);
  if (scenario.authenticated) {
    await context.addCookies([{ name: 'hive_bar_session', value: token, url: baseUrl, httpOnly: true, sameSite: 'Lax' }]);
  }
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  const response = await page.goto(`${baseUrl}${scenario.path}`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 200, `${scenario.id}: unexpected HTTP status`);
  await settle(page);
  const text = await page.locator('body').innerText();
  assert.match(text, scenario.expectText, `${scenario.id}: expected visible copy`);
  const geometry = await page.evaluate(() => {
    const root = document.documentElement;
    const nav = document.querySelector('.app-primary-nav');
    const navStyle = nav ? globalThis.getComputedStyle(nav) : null;
    const navRect = nav?.getBoundingClientRect();
    return {
      horizontalOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
      keychainDisabled: globalThis.__CURRENT_VISUAL_KEYCHAIN_DISABLED__ === true,
      nativeKeychain: Boolean(globalThis.hive_keychain),
      nav: navRect ? {
        position: navStyle.position,
        top: navRect.top,
        bottom: navRect.bottom,
        viewportHeight: globalThis.innerHeight,
      } : null,
    };
  });
  assert.ok(geometry.horizontalOverflow <= 1, `${scenario.id}: ${JSON.stringify(geometry)}`);
  assert.equal(geometry.keychainDisabled, true, scenario.id);
  assert.equal(geometry.nativeKeychain, false, scenario.id);
  if (scenario.viewport.width < 1200) {
    assert.equal(geometry.nav?.position, 'fixed', `${scenario.id}: mobile navigation must be fixed`);
    assert.ok(Math.abs(geometry.nav.bottom - geometry.nav.viewportHeight) <= 1, `${scenario.id}: ${JSON.stringify(geometry.nav)}`);
  }
  assert.deepEqual(violations, [], `${scenario.id}: network/mutation violations`);
  assert.deepEqual(consoleErrors, [], `${scenario.id}: browser errors`);
  const filename = `${scenario.id}.png`;
  const file = path.join(SHOTS, filename);
  const bytes = await page.screenshot({ path: file, fullPage: false, animations: 'disabled' });
  await context.close();
  return {
    id: scenario.id,
    kind: 'application',
    surface: scenario.surface,
    path: scenario.path,
    viewport: scenario.viewport,
    file: `screenshots/${filename}`,
    bytes: bytes.length,
    sha256: sha256(bytes),
    geometry,
  };
}

async function waitForMainNavigation(page, submitter) {
  const navigation = page.waitForEvent('framenavigated', {
    predicate: (frame) => frame === page.mainFrame(),
    timeout: 10000,
  });
  await submitter();
  await navigation;
  await page.waitForLoadState('networkidle');
}

async function captureAuthoringScenario(browser, scenario) {
  const input = scenario.fixture === 'fourth-street'
    ? FOURTH_STREET_AUTHORING_INPUT
    : JUNIPER_WORKS_AUTHORING_INPUT;
  const source = extractDeploymentAgnosticVenueSource(input);
  const fixture = createSourceAuthoringFixture(source);
  const server = await listenLoopback(fixture.app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext({ viewport: scenario.viewport, deviceScaleFactor: 1, locale: 'en-US' });
  const external = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(baseUrl).origin) return route.continue();
    external.push(route.request().url());
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto(`${baseUrl}${fixture.editorPath}`, { waitUntil: 'networkidle' });
  const originalName = fixture.session.previewProjection().siteName;
  let editedName = null;
  if (scenario.fixture === 'fourth-street') {
    assert.equal(originalName, '4th Street Bar');
    assert.equal(fixture.session.status().dirty, false);
  } else {
    assert.notEqual(originalName, '4th Street Bar');
    editedName = 'Juniper Works Community Lab';
    await page.locator('[data-studio-stage="brand"]').click();
    const basics = page.getByRole('link', { name: 'Basics', exact: true });
    await basics.waitFor({ state: 'visible' });
    await basics.click();
    const form = page.locator('form[data-field-pointer="/venueContext/displayName"]');
    await form.locator('[name="value"]').fill(editedName);
    await waitForMainNavigation(page, () => page.locator('.section[data-qol-active="true"] .studio-preview-stage').click());
    assert.equal(fixture.session.status().dirty, true);
    assert.equal(fixture.session.previewProjection().siteName, editedName);
    const iframe = page.locator('iframe[title="Venue preview"]');
    const handle = await iframe.elementHandle();
    assert.ok(handle, 'Juniper review preview frame element is missing');
    const preview = await handle.contentFrame();
    assert.ok(preview, 'Juniper review preview frame is missing');
    await preview.waitForLoadState('domcontentloaded');
    assert.equal((await preview.locator('#home-heading').textContent()).trim(), editedName);
  }
  await settle(page);
  const geometry = await page.evaluate(() => ({
    horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    activeSectionCount: document.querySelectorAll('.section[data-qol-active="true"]').length,
    currentSectionLinkCount: document.querySelectorAll('.nav a[aria-current="page"]').length,
  }));
  assert.ok(geometry.horizontalOverflow <= 1, `${scenario.id}: ${JSON.stringify(geometry)}`);
  assert.equal(geometry.activeSectionCount, 1, scenario.id);
  assert.equal(geometry.currentSectionLinkCount, 1, scenario.id);
  assert.deepEqual(external, [], `${scenario.id}: external requests`);
  assert.deepEqual(fixture.rpcPool.calls, [], `${scenario.id}: Hive RPC calls`);
  assert.deepEqual(consoleErrors, [], `${scenario.id}: browser errors`);
  const filename = `${scenario.id}.png`;
  const file = path.join(SHOTS, filename);
  const bytes = await page.screenshot({ path: file, fullPage: false, animations: 'disabled' });
  await context.close();
  await closeServer(server);
  fixture.previewApplication.locals.services.receiptStore?.close?.();
  return {
    id: scenario.id,
    kind: 'source-authoring',
    surface: scenario.surface,
    viewport: scenario.viewport,
    file: `screenshots/${filename}`,
    bytes: bytes.length,
    sha256: sha256(bytes),
    geometry,
    originalName,
    editedName,
    preservedFourthStreetIdentity: scenario.fixture === 'fourth-street' ? originalName === '4th Street Bar' : null,
    syntheticIdentityEdit: scenario.fixture === 'juniper' ? editedName === 'Juniper Works Community Lab' : null,
  };
}

async function main() {
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(SHOTS, { recursive: true });
  const fixture = createApplicationFixture();
  const server = await listenLoopback(fixture.app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const captures = [];
  try {
    for (const scenario of contract.reviewScenarios.filter(({ kind }) => kind === 'application')) {
      const startedAt = Date.now();
      process.stdout.write(`[START] ${scenario.id}\n`);
      captures.push(await captureApplicationScenario(browser, baseUrl, fixture.token, {
        ...scenario,
        expectText: new RegExp(scenario.expectText, 'i'),
      }));
      process.stdout.write(`[PASS] ${scenario.id} ${((Date.now() - startedAt) / 1000).toFixed(1)}s\n`);
    }
    for (const scenario of contract.reviewScenarios.filter(({ kind }) => kind === 'source-authoring')) {
      const startedAt = Date.now();
      process.stdout.write(`[START] ${scenario.id}\n`);
      captures.push(await captureAuthoringScenario(browser, scenario));
      process.stdout.write(`[PASS] ${scenario.id} ${((Date.now() - startedAt) / 1000).toFixed(1)}s\n`);
    }
  } finally {
    await browser.close().catch(() => {});
    await closeServer(server);
    fixture.app.locals.services.receiptStore?.close?.();
    fixture.app.locals.services.moderationStore?.close?.();
    fixture.app.locals.services.onboardingStore?.close?.();
  }
  assert.equal(captures.length, contract.reviewScenarios.length);
  assert.equal(new Set(captures.map(({ id }) => id)).size, captures.length);
  assert.equal(new Set(captures.map(({ sha256 }) => sha256)).size, captures.length, 'Current review screenshots must be unique');
  const manifest = {
    schemaVersion: 1,
    contractId: contract.contractId,
    screenshotMode: 'viewport-only',
    fullPageScreenshots: false,
    captures,
    readOnlyApplicationReview: true,
    syntheticAuthoringOnly: true,
    hiveRpcCallsDuringSourceAuthoring: 0,
  };
  fs.writeFileSync(path.join(OUTPUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`Current viewport review PASS: ${captures.length} screenshots\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
