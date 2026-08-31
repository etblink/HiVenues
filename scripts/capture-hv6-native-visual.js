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
  {
    id: 'fourth-street-desktop',
    width: 1440,
    height: 1000,
    input: FOURTH_STREET_AUTHORING_INPUT,
    exerciseAuthoring: true,
  },
  {
    id: 'lantern-room-tablet',
    width: 768,
    height: 1024,
    input: LANTERN_ROOM_AUTHORING_INPUT,
    exerciseAuthoring: true,
  },
  {
    id: 'fourth-street-mobile',
    width: 390,
    height: 844,
    input: FOURTH_STREET_AUTHORING_INPUT,
    exerciseAuthoring: false,
  },
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

function getAtPointer(document, pointer) {
  let cursor = document;
  for (const segment of pointer.slice(1).split('/')) cursor = cursor[segment];
  return cursor;
}

function representativeBrowserEdits(scenario) {
  const fourthStreet = scenario.input.venueContext.id === FOURTH_STREET_AUTHORING_INPUT.venueContext.id;
  return [
    ['/venueContext/displayName', fourthStreet ? 'Fourth Street Social' : 'Lantern Room Commons'],
    ['/venueContext/business/phone', fourthStreet ? '(775) 555-0144' : '(555) 010-4343'],
    [
      '/venuePackage/home/hero/lede',
      fourthStreet
        ? 'A refreshed neighborhood gathering place with a community that continues online.'
        : 'A refreshed fictional reading room for book notes and quiet conversation.',
    ],
    [
      '/venuePackage/home/hero/image/src',
      fourthStreet ? '/images/fourth-street-bar-logo.jpg' : '/fixtures/lantern-room/logo.svg',
    ],
    [
      '/venuePackage/home/hero/image/alt',
      fourthStreet ? 'Fourth Street Social venue mark' : 'Lantern Room fixture venue mark',
    ],
    [
      '/venuePackage/home/hero/image/caption',
      fourthStreet ? 'Fourth Street Social · refreshed preview' : 'Lantern Room Commons · fixture preview',
    ],
    [
      '/venuePackage/home/gallery/items/0/caption',
      fourthStreet ? 'Refreshed fixed-slot pool-table caption' : 'Refreshed fixed-slot bookshelf caption',
    ],
    ['/venuePackage/onboarding/operatorNoun', fourthStreet ? 'neighborhood bar' : 'reading salon'],
    ['/venuePackage/onboarding/staffRole', fourthStreet ? 'host' : 'curator'],
  ];
}

async function getPreviewFrame(page) {
  const iframe = page.locator('iframe[title="Real Hive-Venues home-page preview"]');
  await iframe.waitFor({ state: 'attached' });
  await page.waitForFunction(() => {
    const current = globalThis.document.querySelector('iframe[title="Real Hive-Venues home-page preview"]');
    return Boolean(current && current.contentDocument && current.contentDocument.readyState === 'complete');
  });
  const handle = await iframe.elementHandle();
  assert.ok(handle, 'real-renderer preview iframe element is missing');
  const frame = await handle.contentFrame();
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
      sectionNavigationCount: globalThis.document.querySelectorAll('.section-nav a').length,
      protectedControlCount: globalThis.document.querySelectorAll([
        'form[data-field-pointer="/venueContext/id"]',
        'form[data-field-pointer="/deploymentRef/id"]',
        'form[data-field-pointer="/venueContext/hive/communityId"]',
        'form[data-field-pointer="/venuePackage/home/gallery/items"]',
      ].join(',')).length,
      visibleRawPointerCount: Array.from(globalThis.document.querySelectorAll('body *'))
        .filter((node) => node.children.length === 0)
        .filter((node) => /\/(?:venueContext|venuePackage|deploymentRef)\//.test(node.textContent || ''))
        .length,
    };
  });
  assert.ok(evidence.horizontalOverflow <= 1, JSON.stringify(evidence));
  assert.deepEqual(evidence.undersizedControls, [], JSON.stringify(evidence));
  assert.ok(evidence.fieldCount > 20, JSON.stringify(evidence));
  assert.ok(evidence.sectionNavigationCount >= 8, JSON.stringify(evidence));
  assert.equal(evidence.protectedControlCount, 0, JSON.stringify(evidence));
  assert.equal(evidence.visibleRawPointerCount, 0, JSON.stringify(evidence));
  if (scenario.width <= 860) {
    assert.ok(evidence.previewTop < evidence.inspectorTop, JSON.stringify(evidence));
  } else {
    assert.equal(evidence.workspaceDisplay, 'grid', JSON.stringify(evidence));
  }
  return evidence;
}

async function submitWithNavigation(page) {
  const navigation = page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame());
  await page.keyboard.press('Enter');
  await navigation;
  await page.waitForLoadState('networkidle');
}

async function keyboardEdit(page, pointer, value, expectedReloadedValue = value) {
  const form = page.locator(`form[data-field-pointer="${pointer}"]`);
  const control = form.locator('[name="value"]');
  await control.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.type(value);
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => globalThis.document.activeElement?.tagName);
  assert.equal(focused, 'BUTTON');
  await submitWithNavigation(page);

  const reloadedControl = page
    .locator(`form[data-field-pointer="${pointer}"]`)
    .locator('[name="value"]');
  await reloadedControl.waitFor({ state: 'visible' });
  assert.equal(await reloadedControl.inputValue(), expectedReloadedValue, pointer);
}

async function keyboardAction(page, action) {
  const button = page.locator(`[data-action="${action}"]`);
  await button.focus();
  await submitWithNavigation(page);
}

async function exerciseAuthoringProof(page, fixture, scenario) {
  const hostileText = '<script>globalThis.__HV6_NATIVE_EXECUTED__=true</script>';
  await keyboardEdit(page, '/venuePackage/home/hero/lede', hostileText);
  let preview = await getPreviewFrame(page);
  assert.equal((await preview.locator('.home-hero__lede').textContent()).trim(), hostileText);
  assert.equal(await preview.evaluate(() => globalThis.__HV6_NATIVE_EXECUTED__), undefined);
  assert.equal(
    await preview.locator('script').evaluateAll(
      (nodes) => nodes.some((node) => node.textContent.includes('__HV6_NATIVE_EXECUTED__')),
    ),
    false,
  );

  await keyboardAction(page, 'discard');
  preview = await getPreviewFrame(page);
  assert.equal(
    (await preview.locator('.home-hero__lede').textContent()).trim(),
    scenario.input.venuePackage.home.hero.lede,
  );
  assert.equal(fixture.session.status().dirty, false);

  const edits = representativeBrowserEdits(scenario);
  for (const [pointer, value] of edits) await keyboardEdit(page, pointer, value);

  assert.equal(fixture.session.status().dirty, true);
  assert.equal((await page.locator('[data-session-state]').textContent()).trim(), 'DIRTY');
  for (const [pointer, value] of edits) {
    assert.equal(getAtPointer(fixture.session.proposalDraft, pointer), value, pointer);
  }

  preview = await getPreviewFrame(page);
  const revisedName = getAtPointer(fixture.session.proposalDraft, '/venueContext/displayName');
  const revisedLede = getAtPointer(fixture.session.proposalDraft, '/venuePackage/home/hero/lede');
  const revisedImage = getAtPointer(fixture.session.proposalDraft, '/venuePackage/home/hero/image/src');
  assert.equal((await preview.locator('#home-heading').textContent()).trim(), revisedName);
  assert.equal((await preview.locator('.home-hero__lede').textContent()).trim(), revisedLede);
  assert.equal(await preview.locator('.home-hero__image').getAttribute('src'), revisedImage);

  await keyboardAction(page, 'apply');
  preview = await getPreviewFrame(page);
  assert.equal((await preview.locator('#home-heading').textContent()).trim(), revisedName);
  assert.equal(fixture.session.status().dirty, false);
  assert.equal((await page.locator('[data-session-state]').textContent()).trim(), 'ACCEPTED');
  for (const [pointer, value] of edits) {
    assert.equal(getAtPointer(fixture.session.acceptedDocument, pointer), value, pointer);
  }

  const acceptedCanonical = fixture.session.canonicalAccepted();
  await page.reload({ waitUntil: 'networkidle' });
  preview = await getPreviewFrame(page);
  assert.equal((await preview.locator('#home-heading').textContent()).trim(), revisedName);
  assert.equal(fixture.session.canonicalAccepted(), acceptedCanonical);

  const currentImage = fixture.session.acceptedDocument.venuePackage.home.hero.image.src;
  await keyboardEdit(
    page,
    '/venuePackage/home/hero/image/src',
    'https://evil.example/hero.jpg',
    currentImage,
  );
  preview = await getPreviewFrame(page);
  assert.equal(fixture.session.status().dirty, false);
  assert.equal(fixture.session.canonicalAccepted(), acceptedCanonical);
  assert.equal(fixture.session.acceptedDocument.venuePackage.home.hero.image.src, currentImage);
  assert.equal(await preview.locator('.home-hero__image').getAttribute('src'), currentImage);
  assert.match(
    (await page.locator('[role="status"]').textContent()).trim(),
    /Venue media must use an absolute same-origin path/,
  );

  return {
    revisedName,
    acceptedCanonicalSha256: sha256(acceptedCanonical),
    representativeEdits: edits.map(([pointer]) => pointer),
  };
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
    const baseCanonical = fixture.session.canonicalAccepted();
    await page.goto(`${origin}${fixture.editorPath}`, { waitUntil: 'networkidle' });
    const initialPreview = await getPreviewFrame(page);
    const initialName = (await initialPreview.locator('#home-heading').textContent()).trim();
    const initialLede = (await initialPreview.locator('.home-hero__lede').textContent()).trim();
    assert.equal(initialName, scenario.input.venueContext.displayName);
    assert.equal(initialLede, scenario.input.venuePackage.home.hero.lede);
    assert.equal(fixture.session.canonicalAccepted(), baseCanonical);
    assert.equal(fixture.session.canonicalProposal(), baseCanonical);

    await page.keyboard.press('Tab');
    const firstFocus = await page.evaluate(() => {
      const active = globalThis.document.activeElement;
      const style = active ? globalThis.getComputedStyle(active) : null;
      return {
        tag: active?.tagName,
        text: active?.textContent?.trim(),
        outlineStyle: style?.outlineStyle,
        outlineWidth: style?.outlineWidth,
      };
    });
    assert.equal(firstFocus.tag, 'A');
    assert.match(firstFocus.text, /Skip to editable fields/);
    assert.notEqual(firstFocus.outlineStyle, 'none');
    assert.ok(Number.parseFloat(firstFocus.outlineWidth) >= 3, JSON.stringify(firstFocus));

    const editorAxe = await runAxe(page);
    const previewAxe = await runAxe(initialPreview);
    const geometry = await assertResponsiveEditor(page, scenario);

    await page.screenshot({ path: path.join(SHOTS, `${scenario.id}-initial.png`), fullPage: true });

    let authoringEvidence = {
      revisedName: initialName,
      acceptedCanonicalSha256: sha256(baseCanonical),
      representativeEdits: [],
    };
    if (scenario.exerciseAuthoring) {
      authoringEvidence = await exerciseAuthoringProof(page, fixture, scenario);
      await page.screenshot({ path: path.join(SHOTS, `${scenario.id}-accepted.png`), fullPage: true });
    }

    assert.equal(fixture.rpcPool.calls.length, 0, JSON.stringify(fixture.rpcPool.calls));
    assert.ok(fixture.hiveReadService.calls.length >= 1);

    return {
      id: scenario.id,
      viewport: { width: scenario.width, height: scenario.height },
      exerciseAuthoring: scenario.exerciseAuthoring,
      initialName,
      acceptedName: authoringEvidence.revisedName,
      fieldCount: geometry.fieldCount,
      sectionNavigationCount: geometry.sectionNavigationCount,
      focusOutline: {
        style: firstFocus.outlineStyle,
        width: firstFocus.outlineWidth,
      },
      editorAxeViolations: editorAxe,
      previewAxeViolations: previewAxe,
      rpcCalls: fixture.rpcPool.calls.length,
      deterministicReadCalls: fixture.hiveReadService.calls.length,
      consoleErrors,
      acceptedCanonicalSha256: authoringEvidence.acceptedCanonicalSha256,
      representativeEdits: authoringEvidence.representativeEdits,
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
