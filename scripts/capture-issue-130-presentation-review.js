'use strict';
/* global document */

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const axe = require('axe-core');
const { chromium } = require('playwright');
const { extractDeploymentAgnosticVenueSource, createDeploymentAgnosticVenueSource } = require('../src/venue/source');
const { FOURTH_STREET_AUTHORING_INPUT } = require('../test/support/hv5-authoring-fixtures');
const { createSourceAuthoringFixture } = require('../test/support/source-authoring-fixture');
const { listenLoopback, closeServer } = require('./support/visual-harness');

const ROOT = path.resolve(__dirname, '..');
const CONTRACT = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'issue-130-presentation-review.json'), 'utf8'));
const OUTPUT = path.resolve(ROOT, process.env.ISSUE_130_PRESENTATION_REVIEW_ROOT || 'artifacts/issue-130-presentation-review');
const SHOTS = path.join(OUTPUT, 'screenshots');
const JUNIPER_SOURCE_PATH = path.join(ROOT, 'examples', 'juniper', 'venue-source.json');

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function sourceFor(fixtureName) {
  if (fixtureName === 'fourth-street') {
    return extractDeploymentAgnosticVenueSource(FOURTH_STREET_AUTHORING_INPUT);
  }
  if (fixtureName === 'juniper-starter') {
    return createDeploymentAgnosticVenueSource(JSON.parse(fs.readFileSync(JUNIPER_SOURCE_PATH, 'utf8')));
  }
  throw new Error(`Unknown Issue #130 fixture: ${fixtureName}`);
}

async function installReadOnlyGuard(context, origin, violations) {
  await context.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) {
      violations.push({ reason: 'outbound-origin', method: request.method(), url: request.url() });
      return route.abort('blockedbyclient');
    }
    if (!['GET', 'HEAD', 'POST'].includes(request.method())) {
      violations.push({ reason: 'unexpected-method', method: request.method(), url: request.url() });
      return route.abort('blockedbyclient');
    }
    if (request.method() === 'POST' && !url.pathname.startsWith('/__source_authoring/simple/')) {
      violations.push({ reason: 'unexpected-post', method: request.method(), url: request.url() });
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
}

async function settle(page) {
  await page.addStyleTag({ content: '*{animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important}' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((image) => image.complete ? Promise.resolve() : image.decode().catch(() => {})));
    await new Promise((resolve) => globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(resolve)));
    globalThis.scrollTo(0, 0);
  });
}

async function runAxe(page, label) {
  await page.addScriptTag({ content: axe.source });
  const results = await page.evaluate(async () => globalThis.axe.run(globalThis.document, { resultTypes: ['violations'] }));
  const blocking = results.violations.filter(({ impact }) => CONTRACT.blockingAccessibilityImpacts.includes(impact));
  assert.deepEqual(blocking, [], `${label}: ${JSON.stringify(blocking, null, 2)}`);
  return results.violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.length }));
}

async function geometry(page, label) {
  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const visibleControls = Array.from(document.querySelectorAll('button,input:not([type="hidden"]),textarea,select,summary,a'))
      .map((node) => ({ node, rect: node.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0);
    return {
      horizontalOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
      undersizedControls: visibleControls
        .filter(({ rect }) => rect.height < 44)
        .slice(0, 12)
        .map(({ node, rect }) => ({ tag: node.tagName, text: (node.textContent || node.getAttribute('aria-label') || '').trim().slice(0, 60), height: Number(rect.height.toFixed(2)) })),
    };
  });
  assert.ok(result.horizontalOverflow <= 1, `${label}: ${JSON.stringify(result)}`);
  return result;
}

async function screenshot(page, scenario, extra = {}) {
  await settle(page);
  const file = path.join(SHOTS, `${scenario.id}.png`);
  const bytes = await page.screenshot({ path: file, fullPage: false, animations: 'disabled' });
  const viewport = page.viewportSize();
  assert.deepEqual(viewport, scenario.viewport, scenario.id);
  return {
    id: scenario.id,
    fixture: scenario.fixture,
    surface: scenario.surface,
    viewport: scenario.viewport,
    file: `screenshots/${scenario.id}.png`,
    bytes: bytes.length,
    sha256: sha256(bytes),
    ...extra,
  };
}

async function waitForMainNavigation(page, submitter) {
  const navigation = page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame());
  await submitter();
  await navigation;
  await page.waitForLoadState('networkidle');
}

async function prepareStudio(page, fixture, scenario) {
  await page.goto(`${fixture.origin}${fixture.editorPath}`, { waitUntil: 'networkidle' });
  await page.locator('button[data-studio-stage="brand"]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('button[data-studio-stage]').count(), 4, `${scenario.id}: four Venue Studio stages required`);
  assert.equal(await page.locator('button[data-studio-view="preview"]').count(), 1, `${scenario.id}: mobile/compact preview toggle required`);

  let editedName = null;
  if (scenario.fixture === 'juniper-starter') {
    editedName = 'Juniper Works Community Lab';
    const nameForm = page.locator('form[data-field-pointer="/venueContext/displayName"]');
    await nameForm.locator('[name="value"]').fill(editedName);
    const previewStage = page.locator('.section[data-qol-active="true"] .studio-preview-stage');
    await waitForMainNavigation(page, () => previewStage.click());
    assert.equal(fixture.authoring.session.status().dirty, true, scenario.id);
    assert.equal(fixture.authoring.session.previewProjection().siteName, editedName, scenario.id);
  } else {
    assert.equal(fixture.authoring.session.previewProjection().siteName, '4th Street Bar', scenario.id);
    assert.equal(fixture.authoring.session.status().dirty, false, scenario.id);
  }

  const brandLink = page.locator('.nav a').filter({ hasText: /^Brand$/ });
  await brandLink.click();
  await page.locator('[data-studio-media="brand"]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('html').getAttribute('data-studio-active-stage'), 'brand', scenario.id);
  assert.equal(await page.locator('html').getAttribute('data-studio-active-view'), 'edit', scenario.id);
  assert.equal(await page.locator('.nav a[aria-current="page"]').textContent(), 'Brand', scenario.id);
  assert.equal(await page.locator('[data-media-pointer="/venuePackage/brand/logo/src"]').count(), 1, scenario.id);
  return editedName;
}

async function captureScenario(browser, scenario) {
  const source = sourceFor(scenario.fixture);
  const authoring = createSourceAuthoringFixture(source);
  const server = await listenLoopback(authoring.app);
  const origin = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext({ viewport: scenario.viewport, deviceScaleFactor: 1, locale: 'en-US', colorScheme: 'dark' });
  const violations = [];
  await installReadOnlyGuard(context, origin, violations);
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  const fixture = { authoring, origin, editorPath: authoring.editorPath, previewPath: authoring.previewPath };
  try {
    if (scenario.surface === 'rendered-home') {
      const response = await page.goto(`${origin}${authoring.previewPath}`, { waitUntil: 'networkidle' });
      assert.equal(response?.status(), 200, scenario.id);
      await page.locator('#home-heading').waitFor({ state: 'visible' });
      const text = await page.locator('body').innerText();
      const expected = scenario.fixture === 'fourth-street' ? '4th Street Bar' : 'Juniper Works Cooperative';
      assert.match(text, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), scenario.id);
      const brandText = await page.locator('.app-brand').innerText();
      assert.match(brandText, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), scenario.id);
      assert.doesNotMatch(brandText, /Hive-Venues/, scenario.id);
      assert.match(await page.locator('.app-technology-attribution').innerText(), /Built with Hive-Venues/, scenario.id);
      if (scenario.fixture === 'juniper-starter') {
        assert.doesNotMatch(text, /4th Street|Fourth Street|bartender|beer/i, scenario.id);
        assert.equal(await page.locator('img[src="/examples/juniper/workshop.svg"]').count(), 1, scenario.id);
        assert.equal(await page.locator('img[src^="/examples/juniper/project-"]').count(), 3, scenario.id);
      }
      const layout = await geometry(page, scenario.id);
      const axeFindings = await runAxe(page, scenario.id);
      assert.deepEqual(violations, [], `${scenario.id}: ${JSON.stringify(violations)}`);
      assert.deepEqual(consoleErrors, [], `${scenario.id}: ${JSON.stringify(consoleErrors)}`);
      return await screenshot(page, scenario, { layout, axe: axeFindings, venueName: expected });
    }

    assert.equal(scenario.surface, 'venue-studio', scenario.id);
    const editedName = await prepareStudio(page, fixture, scenario);
    const layout = await geometry(page, scenario.id);
    const axeFindings = await runAxe(page, scenario.id);
    const stageLabels = await page.locator('button[data-studio-stage]').allTextContents();
    assert.deepEqual(stageLabels.map((value) => value.replace(/^\s*\d+\s*/, '').trim()), ['Brand', 'Page', 'Details', 'Review'], scenario.id);
    assert.deepEqual(violations, [], `${scenario.id}: ${JSON.stringify(violations)}`);
    assert.deepEqual(authoring.rpcPool.calls, [], `${scenario.id}: Hive RPC calls`);
    assert.deepEqual(consoleErrors, [], `${scenario.id}: ${JSON.stringify(consoleErrors)}`);
    return await screenshot(page, scenario, {
      layout,
      axe: axeFindings,
      editedName,
      preservedFourthStreetIdentity: scenario.fixture === 'fourth-street'
        ? authoring.session.previewProjection().siteName === '4th Street Bar'
        : null,
      syntheticStarterIdentityEdit: scenario.fixture === 'juniper-starter'
        ? editedName === 'Juniper Works Community Lab'
        : null,
    });
  } finally {
    await context.close().catch(() => {});
    await closeServer(server);
    authoring.previewApplication.locals.services.receiptStore?.close?.();
    authoring.previewApplication.locals.services.moderationStore?.close?.();
    authoring.previewApplication.locals.services.onboardingStore?.close?.();
  }
}

async function main() {
  assert.equal(CONTRACT.schemaVersion, 1);
  assert.equal(CONTRACT.screenshotMode, 'viewport-only');
  assert.equal(CONTRACT.fullPageScreenshots, false);
  assert.equal(CONTRACT.scenarios.length, 8);
  assert.equal(new Set(CONTRACT.scenarios.map(({ id }) => id)).size, 8);

  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const captures = [];
  try {
    for (const scenario of CONTRACT.scenarios) captures.push(await captureScenario(browser, scenario));
  } finally {
    await browser.close().catch(() => {});
  }

  assert.equal(captures.length, 8);
  assert.equal(new Set(captures.map(({ sha256 }) => sha256)).size, captures.length, 'Issue #130 review screenshots must be unique');
  const manifest = {
    schemaVersion: 1,
    reviewId: CONTRACT.reviewId,
    screenshotMode: CONTRACT.screenshotMode,
    fullPageScreenshots: false,
    git: {
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
      tree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    },
    captures,
    boundaries: {
      externalNetwork: 'BLOCKED',
      hiveRpcDuringVenueStudio: 0,
      deploymentEffects: 'NONE',
      hiveWriteEffects: 'NONE',
    },
  };
  fs.writeFileSync(path.join(OUTPUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.copyFileSync(path.join(ROOT, 'config', 'issue-130-presentation-review.json'), path.join(OUTPUT, 'issue-130-presentation-review.json'));
  process.stdout.write(`Issue #130 presentation review PASS: ${captures.length} viewport screenshots\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
