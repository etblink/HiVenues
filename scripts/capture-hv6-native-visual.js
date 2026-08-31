'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const axe = require('axe-core');
const { chromium } = require('playwright');
const playwrightPackage = require('playwright/package.json');
const {
  FOURTH_STREET_AUTHORING_INPUT,
  LANTERN_ROOM_AUTHORING_INPUT,
} = require('../test/support/hv5-authoring-fixtures');
const { createHv6NativeEditorFixture } = require('../test/support/hv6-native-editor-fixture');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.resolve(ROOT, process.env.HV6_NATIVE_VISUAL_OUTPUT || 'artifacts/hv6-native-visual');
const SHOTS = path.join(OUTPUT, 'screenshots');
const SCENARIOS = Object.freeze([
  { id: 'fourth-street-desktop', width: 1440, height: 1000, input: FOURTH_STREET_AUTHORING_INPUT },
  { id: 'lantern-room-mobile', width: 390, height: 844, input: LANTERN_ROOM_AUTHORING_INPUT },
]);

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1');
    server.once('error', reject);
    server.once('listening', () => resolve(server));
  });
}

function close(server) {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function getPreviewFrame(page) {
  await page.waitForFunction(() => {
    const frame = globalThis.document.querySelector('iframe[title="Real Hive-Venues home-page preview"]');
    return Boolean(frame && frame.contentDocument && frame.contentDocument.readyState === 'complete');
  });
  const frame = page.frames().find((candidate) => candidate.url().includes('/__hv6/native/preview'));
  assert.ok(frame, 'real-renderer preview frame is missing');
  return frame;
}

async function runAxe(target) {
  await target.addScriptTag({ content: axe.source });
  const result = await target.evaluate(async () => globalThis.axe.run(globalThis.document, {
    resultTypes: ['violations'],
  }));
  const blocking = result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
  assert.deepEqual(blocking, [], JSON.stringify(blocking, null, 2));
  return result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.length,
  }));
}

async function assertResponsiveEditor(page, scenario) {
  const evidence = await page.evaluate(() => {
    const root = globalThis.document.documentElement;
    const workspace = globalThis.document.querySelector('.workspace');
    const preview = globalThis.document.querySelector('.preview');
    const inspector = globalThis.document.querySelector('.inspector');
    const visibleControls = Array.from(globalThis.document.querySelectorAll('button,input:not([type="hidden"]),textarea'))
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
    return {
      horizontalOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
      workspaceDisplay: globalThis.getComputedStyle(workspace).display,
      previewTop: preview.getBoundingClientRect().top,
      inspectorTop: inspector.getBoundingClientRect().top,
      undersizedControls: visibleControls.filter((control) => control.height < 44),
      fieldCount: globalThis.document.querySelectorAll('form[data-field-pointer]').length,
      protectedControlCount: globalThis.document.querySelectorAll([
        'form[data-field-pointer="/venueContext/id"]',
        'form[data-field-pointer="/deploymentRef/id"]',
        'form[data-field-pointer="/venueContext/hive/communityId"]',
        'form[data-field-pointer="/venuePackage/home/gallery/items"]',
      ].join(',')).length,
    };
  });
  assert.ok(evidence.horizontalOverflow <= 1, JSON.stringify(evidence));
  assert.deepEqual(evidence.undersizedControls, [], JSON.stringify(evidence));
  assert.ok(evidence.fieldCount > 20, JSON.stringify(evidence));
  assert.equal(evidence.protectedControlCount, 0, JSON.stringify(evidence));
  if (scenario.width <= 860) {
    assert.ok(evidence.previewTop < evidence.inspectorTop, JSON.stringify(evidence));
  } else {
    assert.equal(evidence.workspaceDisplay, 'grid', JSON.stringify(evidence));
  }
  return evidence;
}

async function keyboardEdit(page, pointer, value) {
  const form = page.locator(`form[data-field-pointer="${pointer}"]`);
  const control = form.locator('[name="value"]');
  await control.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.type(value);
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => globalThis.document.activeElement?.tagName);
  assert.equal(focused, 'BUTTON');
  await page.keyboard.press('Enter');
  await page.waitForLoadState('networkidle');
}

async function keyboardAction(page, action) {
  const button = page.locator(`[data-action="${action}"]`);
  await button.focus();
  await page.keyboard.press('Enter');
  await page.waitForLoadState('networkidle');
}

async function runScenario(browser, scenario) {
  const fixture = createHv6NativeEditorFixture(scenario.input);
  const server = await listen(fixture.app);
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.height } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') return route.continue();
    return route.abort('blockedbyclient');
  });

  try {
    await page.goto(`${origin}${fixture.editorPath}`, { waitUntil: 'networkidle' });
    const initialPreview = await getPreviewFrame(page);
    const initialName = (await initialPreview.locator('#home-heading').textContent()).trim();
    const initialLede = (await initialPreview.locator('.home-hero__lede').textContent()).trim();
    assert.equal(initialName, scenario.input.venueContext.displayName);
    assert.equal(initialLede, scenario.input.venuePackage.home.hero.lede);

    await page.keyboard.press('Tab');
    const firstFocus = await page.evaluate(() => ({
      tag: globalThis.document.activeElement?.tagName,
      text: globalThis.document.activeElement?.textContent?.trim(),
    }));
    assert.equal(firstFocus.tag, 'A');
    assert.match(firstFocus.text, /Skip to editable fields/);

    const editorAxe = await runAxe(page);
    const previewAxe = await runAxe(initialPreview);
    const geometry = await assertResponsiveEditor(page, scenario);

    await page.screenshot({ path: path.join(SHOTS, `${scenario.id}-initial.png`), fullPage: true });

    const revisedName = scenario.id.startsWith('fourth') ? 'Fourth Street Social' : 'Lantern Room Commons';
    await keyboardEdit(page, '/venueContext/displayName', revisedName);
    let preview = await getPreviewFrame(page);
    assert.equal((await preview.locator('#home-heading').textContent()).trim(), revisedName);
    assert.equal(fixture.session.acceptedDocument.venueContext.displayName, scenario.input.venueContext.displayName);
    assert.equal(fixture.session.status().dirty, true);
    assert.equal((await page.locator('[data-session-state]').textContent()).trim(), 'DIRTY');

    const hostileText = '<script>globalThis.__HV6_NATIVE_EXECUTED__=true</script>';
    await keyboardEdit(page, '/venuePackage/home/hero/lede', hostileText);
    preview = await getPreviewFrame(page);
    assert.equal((await preview.locator('.home-hero__lede').textContent()).trim(), hostileText);
    assert.equal(await preview.evaluate(() => globalThis.__HV6_NATIVE_EXECUTED__), undefined);
    assert.equal(await preview.locator('script').evaluateAll((nodes) => nodes.some((node) => node.textContent.includes('__HV6_NATIVE_EXECUTED__'))), false);

    await keyboardAction(page, 'discard');
    preview = await getPreviewFrame(page);
    assert.equal((await preview.locator('#home-heading').textContent()).trim(), scenario.input.venueContext.displayName);
    assert.equal((await preview.locator('.home-hero__lede').textContent()).trim(), scenario.input.venuePackage.home.hero.lede);
    assert.equal(fixture.session.status().dirty, false);

    await keyboardEdit(page, '/venueContext/displayName', revisedName);
    await keyboardAction(page, 'apply');
    preview = await getPreviewFrame(page);
    assert.equal((await preview.locator('#home-heading').textContent()).trim(), revisedName);
    assert.equal(fixture.session.acceptedDocument.venueContext.displayName, revisedName);
    assert.equal(fixture.session.status().dirty, false);
    assert.equal((await page.locator('[data-session-state]').textContent()).trim(), 'ACCEPTED');

    await page.reload({ waitUntil: 'networkidle' });
    preview = await getPreviewFrame(page);
    assert.equal((await preview.locator('#home-heading').textContent()).trim(), revisedName);

    const currentImage = fixture.session.acceptedDocument.venuePackage.home.hero.image.src;
    await keyboardEdit(page, '/venuePackage/home/hero/image/src', 'https://evil.example/hero.jpg');
    preview = await getPreviewFrame(page);
    assert.equal(fixture.session.status().dirty, false);
    assert.equal(fixture.session.acceptedDocument.venuePackage.home.hero.image.src, currentImage);
    assert.equal(await preview.locator('.home-hero__image').getAttribute('src'), currentImage);
    assert.match((await page.locator('[role="status"]').textContent()).trim(), /Venue media must use an absolute same-origin path/);

    await page.screenshot({ path: path.join(SHOTS, `${scenario.id}-accepted.png`), fullPage: true });

    assert.equal(fixture.rpcPool.calls.length, 0, JSON.stringify(fixture.rpcPool.calls));
    assert.ok(fixture.hiveReadService.calls.length >= 1);

    return {
      id: scenario.id,
      viewport: { width: scenario.width, height: scenario.height },
      initialName,
      acceptedName: revisedName,
      fieldCount: geometry.fieldCount,
      editorAxeViolations: editorAxe,
      previewAxeViolations: previewAxe,
      rpcCalls: fixture.rpcPool.calls.length,
      deterministicReadCalls: fixture.hiveReadService.calls.length,
      consoleErrors,
      acceptedCanonicalSha256: sha256(fixture.session.canonicalAccepted()),
    };
  } finally {
    await context.close();
    await close(server);
  }
}

async function main() {
  await fs.rm(OUTPUT, { recursive: true, force: true });
  await fs.mkdir(SHOTS, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const scenarios = [];
    for (const scenario of SCENARIOS) scenarios.push(await runScenario(browser, scenario));
    const evidence = {
      candidate: 'HV6_NATIVE_SEMANTIC_INSPECTOR_REAL_RENDERER',
      playwrightVersion: playwrightPackage.version,
      browserVersion: browser.version(),
      scenarios,
    };
    await fs.writeFile(path.join(OUTPUT, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
    process.stdout.write(`${JSON.stringify(evidence)}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
