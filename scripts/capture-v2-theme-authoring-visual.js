#!/usr/bin/env node
'use strict';

const { URLSearchParams } = require('node:url');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const axe = require('axe-core');
const { chromium } = require('playwright');
const {
  createReferenceV2AuthoringStudioFixture,
} = require('../test/support/v2-authoring-studio-fixture');
const {
  closeServer,
  listenLoopback,
  sha256,
} = require('./support/visual-harness');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.resolve(
  ROOT,
  process.env.V2_THEME_REVIEW_ROOT || 'artifacts/v2-theme-authoring-review',
);
const SCREENSHOTS = path.join(OUTPUT, 'screenshots');
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

const CASES = Object.freeze([
  {
    referenceId: 'fourth-street',
    dimension: 'typographyRecipeId',
    recipeId: 'type-poster',
    expectedClass: 'v2-type--poster',
    probe: 'typography',
    shellViewport: { width: 1440, height: 1000 },
    previewViewport: 'desktop',
  },
  {
    referenceId: 'juniper',
    dimension: 'densityRecipeId',
    recipeId: 'density-generous',
    expectedClass: 'v2-density--generous',
    probe: 'density',
    shellViewport: { width: 1280, height: 900 },
    previewViewport: 'tablet',
  },
  {
    referenceId: 'restaurant',
    dimension: 'shapeRecipeId',
    recipeId: 'shape-rounded',
    expectedClass: 'v2-shape--rounded',
    probe: 'shape',
    shellViewport: { width: 1024, height: 900 },
    previewViewport: 'tablet',
  },
  {
    referenceId: 'live-music',
    dimension: 'surfaceRecipeId',
    recipeId: 'surface-flat',
    expectedClass: 'v2-surface--flat',
    probe: 'surface',
    shellViewport: { width: 390, height: 844 },
    previewViewport: 'mobile',
  },
]);

function selectionPath(viewport) {
  const query = new URLSearchParams({
    nodeId: 'page:home',
    viewport,
  });
  return '/studio-authoring?' + query.toString();
}

function screenshotRecord(filename) {
  const bytes = fs.readFileSync(filename);
  return {
    file: path.relative(OUTPUT, filename).replaceAll(path.sep, '/'),
    sha256: sha256(bytes),
    bytes: bytes.length,
  };
}

async function capture(page, referenceId, stateId) {
  const filename = path.join(SCREENSHOTS, referenceId + '-' + stateId + '.png');
  await page.screenshot({ path: filename, fullPage: false });
  return screenshotRecord(filename);
}

async function runAxe(frame) {
  await frame.addScriptTag({ content: axe.source });
  const result = await frame.evaluate(async () => globalThis.axe.run(globalThis.document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    resultTypes: ['violations'],
  }));
  return result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.length,
    targets: violation.nodes.map((node) => node.target),
  }));
}

function previewFrame(page) {
  const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
  assert.ok(frame, 'real-renderer preview frame missing');
  return frame;
}

async function accessibility(page, label) {
  const outer = await runAxe(page.mainFrame());
  const preview = await runAxe(previewFrame(page));
  const blocking = [...outer, ...preview]
    .filter((finding) => BLOCKING_IMPACTS.has(finding.impact));
  assert.deepEqual(
    blocking,
    [],
    label + ': blocking accessibility findings\n' + JSON.stringify(blocking, null, 2),
  );
  return { outer, preview, blocking };
}

async function geometry(page, label) {
  const outer = await page.evaluate(() => {
    const root = globalThis.document.documentElement;
    const heights = [...globalThis.document.querySelectorAll('a,button,textarea,select')]
      .map((element) => element.getBoundingClientRect().height)
      .filter((height) => height > 0);
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      mainCount: globalThis.document.querySelectorAll('main').length,
      iframeCount: globalThis.document.querySelectorAll('iframe').length,
      minimumTargetHeight: heights.length ? Math.min(...heights) : null,
    };
  });
  const preview = await previewFrame(page).evaluate(() => {
    const root = globalThis.document.documentElement;
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      mainCount: globalThis.document.querySelectorAll('main').length,
      h1Count: globalThis.document.querySelectorAll('h1').length,
    };
  });
  assert.ok(
    outer.scrollWidth - outer.clientWidth <= 1,
    label + ': outer horizontal overflow ' + JSON.stringify(outer),
  );
  assert.ok(
    preview.scrollWidth - preview.clientWidth <= 1,
    label + ': preview horizontal overflow ' + JSON.stringify(preview),
  );
  assert.equal(outer.mainCount, 1, label + ': expected one Studio main landmark');
  assert.equal(outer.iframeCount, 1, label + ': expected one real-renderer iframe');
  assert.equal(preview.mainCount, 1, label + ': expected one renderer main landmark');
  assert.equal(preview.h1Count, 1, label + ': expected one renderer h1');
  assert.ok(
    outer.minimumTargetHeight === null || outer.minimumTargetHeight >= 43.5,
    label + ': target below 44px convention ' + JSON.stringify(outer),
  );
  return { outer, preview };
}

async function authority(page) {
  return page.locator('main.studio').evaluate((element) => ({
    acceptedDigest: element.dataset.acceptedDigest,
    previewDigest: element.dataset.previewDigest,
    previewActive: element.dataset.previewActive,
    persistent: element.dataset.studioPersistent,
    runtimeWired: element.dataset.studioRuntimeWired,
    mutations: element.dataset.studioMutations,
  }));
}

async function rendererState(page, probe) {
  const frame = previewFrame(page);
  await frame.waitForLoadState('networkidle');
  return frame.evaluate((probeKind) => {
    const root = globalThis.document.documentElement;
    const rootStyle = globalThis.getComputedStyle(root);
    const body = globalThis.document.body;
    const bodyStyle = globalThis.getComputedStyle(body);
    const firstComponent = globalThis.document.querySelector('.v2-component');
    const firstComponentStyle = firstComponent ? globalThis.getComputedStyle(firstComponent) : null;
    const card = globalThis.document.querySelector('.v2-list-card,.v2-business-card,.v2-menu-section');
    const cardStyle = card ? globalThis.getComputedStyle(card) : null;
    const media = globalThis.document.querySelector('.v2-media');
    const mediaStyle = media ? globalThis.getComputedStyle(media) : null;
    const h1 = globalThis.document.querySelector('h1');
    const h1Style = h1 ? globalThis.getComputedStyle(h1) : null;

    const common = {
      classes: [...root.classList].sort(),
    };
    if (probeKind === 'typography') {
      return {
        ...common,
        rootFontFamily: rootStyle.fontFamily,
        bodyFontFamily: bodyStyle.fontFamily,
        h1FontFamily: h1Style?.fontFamily || null,
        h1FontWeight: h1Style?.fontWeight || null,
        h1LetterSpacing: h1Style?.letterSpacing || null,
        h1TextTransform: h1Style?.textTransform || null,
      };
    }
    if (probeKind === 'density') {
      return {
        ...common,
        sectionSpace: rootStyle.getPropertyValue('--v2-section-space').trim(),
        firstComponentPaddingTop: firstComponentStyle?.paddingTop || null,
        firstComponentPaddingBottom: firstComponentStyle?.paddingBottom || null,
      };
    }
    if (probeKind === 'shape') {
      return {
        ...common,
        controlRadius: rootStyle.getPropertyValue('--v2-control-radius').trim(),
        panelRadius: rootStyle.getPropertyValue('--v2-panel-radius').trim(),
        mediaRadius: rootStyle.getPropertyValue('--v2-media-radius').trim(),
        cardBorderRadius: cardStyle?.borderRadius || null,
        mediaBorderRadius: mediaStyle?.borderRadius || null,
      };
    }
    if (probeKind === 'surface') {
      return {
        ...common,
        cardBoxShadow: cardStyle?.boxShadow || null,
      };
    }
    throw new Error('unsupported visual probe');
  }, probe);
}

function assertRendererChanged(before, after, spec, label) {
  assert.equal(after.classes.includes(spec.expectedClass), true, label + ': target class missing');
  assert.notDeepEqual(after, before, label + ': computed renderer state did not change');
  if (spec.probe === 'typography') {
    assert.notEqual(after.bodyFontFamily, before.bodyFontFamily, label + ': body font family did not change');
    assert.match(after.bodyFontFamily.toLowerCase(), /arial black|impact/, label + ': poster font family absent');
  }
  if (spec.probe === 'density') {
    assert.notEqual(after.sectionSpace, before.sectionSpace, label + ': density variable did not change');
    assert.equal(after.sectionSpace, '6.5rem', label + ': generous density variable mismatch');
  }
  if (spec.probe === 'shape') {
    assert.notEqual(after.panelRadius, before.panelRadius, label + ': shape panel radius did not change');
    assert.equal(after.panelRadius, '1.75rem', label + ': rounded panel radius mismatch');
  }
  if (spec.probe === 'surface') {
    assert.notEqual(after.cardBoxShadow, before.cardBoxShadow, label + ': surface box shadow did not change');
    assert.match(after.cardBoxShadow || '', /none/i, label + ': flat surface did not remove shadow');
  }
}

function assertRendererRestored(expected, actual, label) {
  assert.deepEqual(actual, expected, label + ': renderer state did not restore exactly');
}

async function chooseThemeByKeyboard(page, spec) {
  const form = page.locator(
    'form.theme-control:has(input[name="dimension"][value="' + spec.dimension + '"])',
  );
  assert.equal(await form.count(), 1, spec.referenceId + ': expected one theme form');
  const select = form.locator('select[name="recipeId"]');
  const options = await select.locator('option').evaluateAll(
    (nodes) => nodes.map((option) => ({
      value: option.value,
      disabled: option.disabled,
    })),
  );
  assert.equal(
    options.some((option) => option.value === spec.recipeId && !option.disabled),
    true,
    spec.referenceId + ': expected enabled recipe option missing: ' + spec.recipeId,
  );
  await select.focus();
  await page.keyboard.press('Home');
  let selected = await select.inputValue();
  for (let step = 0; selected !== spec.recipeId && step <= options.length; step += 1) {
    await page.keyboard.press('ArrowDown');
    selected = await select.inputValue();
  }
  assert.equal(selected, spec.recipeId);
  await page.keyboard.press('Tab');
  const activeText = await page.evaluate(() => globalThis.document.activeElement?.textContent?.trim() || '');
  assert.match(activeText, /^Preview /);
  const navigation = page.waitForNavigation({ waitUntil: 'networkidle' });
  await page.keyboard.press('Enter');
  await navigation;
}

async function activateButtonByKeyboard(page, name) {
  const button = page.getByRole('button', { name, exact: true });
  assert.equal(await button.count(), 1, 'expected one button: ' + name);
  await button.focus();
  const navigation = page.waitForNavigation({ waitUntil: 'networkidle' });
  await page.keyboard.press('Enter');
  await navigation;
}

async function runReference(browser, spec) {
  const fixture = createReferenceV2AuthoringStudioFixture(spec.referenceId);
  const server = await listenLoopback(fixture.app);
  const address = server.address();
  const baseUrl = 'http://127.0.0.1:' + address.port;
  const page = await browser.newPage({ viewport: spec.shellViewport });

  try {
    await page.goto(baseUrl + selectionPath(spec.previewViewport), { waitUntil: 'networkidle' });

    const baseline = await authority(page);
    const baselineSerialization = JSON.stringify(fixture.session().draftSource);
    const baselineRenderer = await rendererState(page, spec.probe);
    const currentRecipe = fixture.session().draftSource.site.brand.design[spec.dimension];

    assert.notEqual(currentRecipe, spec.recipeId, spec.referenceId + ': target recipe must differ from baseline');
    assert.match(baseline.acceptedDigest, /^[0-9a-f]{64}$/);
    assert.equal(baseline.previewDigest, baseline.acceptedDigest);
    assert.equal(baseline.previewActive, 'false');
    assert.equal(baseline.persistent, 'false');
    assert.equal(baseline.runtimeWired, 'false');
    assert.equal(baseline.mutations, 'true');

    await chooseThemeByKeyboard(page, spec);
    const firstPreview = await authority(page);
    const firstPreviewRenderer = await rendererState(page, spec.probe);
    assert.equal(firstPreview.acceptedDigest, baseline.acceptedDigest);
    assert.notEqual(firstPreview.previewDigest, baseline.acceptedDigest);
    assert.equal(firstPreview.previewActive, 'true');
    assert.equal(fixture.session().draftDigest, baseline.acceptedDigest);
    assert.equal(JSON.stringify(fixture.session().draftSource), baselineSerialization);
    assertRendererChanged(
      baselineRenderer,
      firstPreviewRenderer,
      spec,
      spec.referenceId + '/first-preview',
    );
    const previewGeometry = await geometry(page, spec.referenceId + '/preview');
    const previewAccessibility = await accessibility(page, spec.referenceId + '/preview');
    const previewScreenshot = await capture(page, spec.referenceId, 'preview');

    await activateButtonByKeyboard(page, 'Discard preview');
    const discarded = await authority(page);
    const discardedRenderer = await rendererState(page, spec.probe);
    assert.equal(discarded.acceptedDigest, baseline.acceptedDigest);
    assert.equal(discarded.previewDigest, baseline.acceptedDigest);
    assert.equal(discarded.previewActive, 'false');
    assert.equal(fixture.proposal(), null);
    assert.equal(JSON.stringify(fixture.session().draftSource), baselineSerialization);
    assertRendererRestored(baselineRenderer, discardedRenderer, spec.referenceId + '/discard');

    await chooseThemeByKeyboard(page, spec);
    const secondPreview = await authority(page);
    const secondPreviewRenderer = await rendererState(page, spec.probe);
    assert.equal(secondPreview.acceptedDigest, baseline.acceptedDigest);
    assert.equal(secondPreview.previewDigest, firstPreview.previewDigest);
    assert.deepEqual(secondPreviewRenderer, firstPreviewRenderer);

    await activateButtonByKeyboard(page, 'Apply to draft');
    const applied = await authority(page);
    const appliedRenderer = await rendererState(page, spec.probe);
    assert.equal(applied.acceptedDigest, secondPreview.previewDigest);
    assert.equal(applied.previewDigest, applied.acceptedDigest);
    assert.equal(applied.previewActive, 'false');
    assert.equal(fixture.session().draftSource.site.brand.design[spec.dimension], spec.recipeId);
    assertRendererChanged(baselineRenderer, appliedRenderer, spec, spec.referenceId + '/applied');
    assert.deepEqual(appliedRenderer, secondPreviewRenderer);
    const appliedGeometry = await geometry(page, spec.referenceId + '/applied');
    const appliedAccessibility = await accessibility(page, spec.referenceId + '/applied');
    const appliedScreenshot = await capture(page, spec.referenceId, 'applied');

    await activateButtonByKeyboard(page, 'Undo');
    const undone = await authority(page);
    const undoneRenderer = await rendererState(page, spec.probe);
    assert.equal(undone.acceptedDigest, baseline.acceptedDigest);
    assert.equal(undone.previewDigest, baseline.acceptedDigest);
    assert.equal(JSON.stringify(fixture.session().draftSource), baselineSerialization);
    assertRendererRestored(baselineRenderer, undoneRenderer, spec.referenceId + '/undo');
    const undoScreenshot = await capture(page, spec.referenceId, 'undo');

    await activateButtonByKeyboard(page, 'Redo');
    const redone = await authority(page);
    const redoneRenderer = await rendererState(page, spec.probe);
    assert.equal(redone.acceptedDigest, applied.acceptedDigest);
    assert.equal(redone.previewDigest, applied.acceptedDigest);
    assert.equal(fixture.session().draftSource.site.brand.design[spec.dimension], spec.recipeId);
    assert.deepEqual(redoneRenderer, appliedRenderer);
    const redoScreenshot = await capture(page, spec.referenceId, 'redo');

    const diagnostics = fixture.diagnostics();
    assert.equal(diagnostics.proposals, 2);
    assert.equal(diagnostics.discards, 1);
    assert.equal(diagnostics.applies, 1);
    assert.equal(diagnostics.undos, 1);
    assert.equal(diagnostics.redos, 1);
    assert.equal(diagnostics.persistentWrites, 0);
    assert.equal(diagnostics.hiveRpcAttempts, 0);
    assert.equal(diagnostics.hiveWrites, 0);

    return {
      referenceId: spec.referenceId,
      dimension: spec.dimension,
      beforeRecipeId: currentRecipe,
      recipeId: spec.recipeId,
      expectedClass: spec.expectedClass,
      shellViewport: spec.shellViewport,
      previewViewport: spec.previewViewport,
      keyboardProposalCompletions: 2,
      digests: {
        before: baseline.acceptedDigest,
        firstPreview: firstPreview.previewDigest,
        discarded: discarded.acceptedDigest,
        secondPreview: secondPreview.previewDigest,
        applied: applied.acceptedDigest,
        undo: undone.acceptedDigest,
        redo: redone.acceptedDigest,
      },
      renderer: {
        before: baselineRenderer,
        preview: firstPreviewRenderer,
        discarded: discardedRenderer,
        applied: appliedRenderer,
        undo: undoneRenderer,
        redo: redoneRenderer,
      },
      previewGeometry,
      previewAccessibility,
      appliedGeometry,
      appliedAccessibility,
      screenshots: [
        previewScreenshot,
        appliedScreenshot,
        undoScreenshot,
        redoScreenshot,
      ],
      diagnostics,
    };
  } finally {
    await page.close();
    await closeServer(server);
  }
}

async function main() {
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(SCREENSHOTS, { recursive: true });

  const browser = await chromium.launch();
  const references = [];
  try {
    for (const spec of CASES) references.push(await runReference(browser, spec));
  } finally {
    await browser.close();
  }

  const accessibilityReports = references.flatMap((item) => [
    item.previewAccessibility,
    item.appliedAccessibility,
  ]);
  const geometryReports = references.flatMap((item) => [
    item.previewGeometry,
    item.appliedGeometry,
  ]);
  const summary = {
    referenceCount: references.length,
    dimensionCount: new Set(references.map((item) => item.dimension)).size,
    screenshotCount: references.reduce((sum, item) => sum + item.screenshots.length, 0),
    keyboardProposalCompletionCount: references.reduce(
      (sum, item) => sum + item.keyboardProposalCompletions,
      0,
    ),
    digestProofCount: references.length,
    discardProofCount: references.length,
    applyProofCount: references.length,
    undoProofCount: references.length,
    redoProofCount: references.length,
    semanticClassProofCount: references.length,
    computedStyleProofCount: references.length,
    blockingAccessibilityFindings: accessibilityReports.reduce(
      (sum, item) => sum + item.blocking.length,
      0,
    ),
    horizontalOverflowFindings: geometryReports.filter(
      (item) => (
        item.outer.scrollWidth - item.outer.clientWidth > 1
        || item.preview.scrollWidth - item.preview.clientWidth > 1
      ),
    ).length,
    persistentWrites: references.reduce((sum, item) => sum + item.diagnostics.persistentWrites, 0),
    hiveRpcAttempts: references.reduce((sum, item) => sum + item.diagnostics.hiveRpcAttempts, 0),
    hiveWrites: references.reduce((sum, item) => sum + item.diagnostics.hiveWrites, 0),
  };

  assert.equal(summary.referenceCount, 4);
  assert.equal(summary.dimensionCount, 4);
  assert.equal(summary.screenshotCount, 16);
  assert.equal(summary.keyboardProposalCompletionCount, 8);
  assert.equal(summary.digestProofCount, 4);
  assert.equal(summary.discardProofCount, 4);
  assert.equal(summary.applyProofCount, 4);
  assert.equal(summary.undoProofCount, 4);
  assert.equal(summary.redoProofCount, 4);
  assert.equal(summary.semanticClassProofCount, 4);
  assert.equal(summary.computedStyleProofCount, 4);
  assert.equal(summary.blockingAccessibilityFindings, 0);
  assert.equal(summary.horizontalOverflowFindings, 0);
  assert.equal(summary.persistentWrites, 0);
  assert.equal(summary.hiveRpcAttempts, 0);
  assert.equal(summary.hiveWrites, 0);

  const manifest = {
    kind: 'hivenues-v2-theme-authoring-visual-evidence',
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary,
    references,
  };
  fs.writeFileSync(
    path.join(OUTPUT, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  console.log('V2_THEME_AUTHORING_VISUAL_EVIDENCE', JSON.stringify(summary));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
