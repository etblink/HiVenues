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
  process.env.V2_CARDINALITY_REVIEW_ROOT || 'artifacts/v2-component-cardinality-review',
);
const SCREENSHOTS = path.join(OUTPUT, 'screenshots');
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

const CASES = Object.freeze([
  {
    referenceId: 'fourth-street',
    catalogItemId: 'story-intro',
    destination: 'BEFORE_COMPONENT:home-hero',
    shellViewport: { width: 1440, height: 1000 },
    previewViewport: 'desktop',
  },
  {
    referenceId: 'juniper',
    catalogItemId: 'hours-location',
    destination: 'END_OF_PAGE',
    shellViewport: { width: 1280, height: 900 },
    previewViewport: 'tablet',
  },
  {
    referenceId: 'restaurant',
    catalogItemId: 'contact-visit',
    destination: 'BEFORE_COMPONENT:home-hero',
    shellViewport: { width: 1440, height: 1000 },
    previewViewport: 'desktop',
  },
  {
    referenceId: 'live-music',
    catalogItemId: 'story-intro',
    destination: 'BEFORE_COMPONENT:home-hero',
    shellViewport: { width: 390, height: 844 },
    previewViewport: 'mobile',
  },
]);

function selectionPath(nodeId, viewport) {
  const query = new URLSearchParams({ nodeId, viewport });
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

async function accessibility(page, label) {
  const outer = await runAxe(page.mainFrame());
  const previewFrame = page.frames().find((frame) => frame !== page.mainFrame());
  assert.ok(previewFrame, label + ': preview frame missing');
  const preview = await runAxe(previewFrame);
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
  const metrics = await page.evaluate(() => {
    const root = globalThis.document.documentElement;
    const heights = [...globalThis.document.querySelectorAll('a,button,textarea,select')]
      .map((element) => element.getBoundingClientRect().height)
      .filter((height) => height > 0);
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      mainCount: globalThis.document.querySelectorAll('main').length,
      iframeCount: globalThis.document.querySelectorAll('iframe').length,
      textareaCount: globalThis.document.querySelectorAll('textarea').length,
      minimumTargetHeight: heights.length ? Math.min(...heights) : null,
    };
  });
  assert.ok(
    metrics.scrollWidth - metrics.clientWidth <= 1,
    label + ': horizontal overflow ' + JSON.stringify(metrics),
  );
  assert.equal(metrics.mainCount, 1, label + ': expected one main landmark');
  assert.equal(metrics.iframeCount, 1, label + ': expected one real-renderer iframe');
  assert.equal(metrics.textareaCount, 0, label + ': cardinality flow must not expose text authoring');
  assert.ok(
    metrics.minimumTargetHeight === null || metrics.minimumTargetHeight >= 43.5,
    label + ': target below 44px convention ' + JSON.stringify(metrics),
  );
  return metrics;
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

async function previewOrder(page) {
  const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
  assert.ok(frame, 'real-renderer preview frame missing');
  await frame.waitForLoadState('networkidle');
  return frame.locator('[data-component-id]').evaluateAll((elements) => {
    const ids = elements
      .map((element) => element.getAttribute('data-component-id'))
      .filter(Boolean);
    return [...new Set(ids)];
  });
}

function assertDestination(order, componentId, destination, label) {
  const targetIndex = order.indexOf(componentId);
  assert.ok(targetIndex >= 0, label + ': created component missing from real renderer');
  if (destination === 'END_OF_PAGE') {
    assert.equal(targetIndex, order.length - 1, label + ': component did not insert at page end');
    return;
  }
  const siblingId = destination.slice('BEFORE_COMPONENT:'.length);
  const siblingIndex = order.indexOf(siblingId);
  assert.ok(siblingIndex >= 0, label + ': destination sibling missing');
  assert.equal(siblingIndex, targetIndex + 1, label + ': component not directly before destination sibling');
}

async function chooseSelectByKeyboard(page, selector, value) {
  const select = page.locator(selector);
  const values = await select.locator('option').evaluateAll(
    (options) => options.map((option) => option.value),
  );
  const index = values.indexOf(value);
  assert.ok(index >= 0, selector + ': expected option missing: ' + value);
  await select.focus();
  await page.keyboard.press('Home');
  for (let step = 0; step < index; step += 1) await page.keyboard.press('ArrowDown');
  assert.equal(await select.inputValue(), value);
}

async function keyboardAdd(page, spec) {
  await chooseSelectByKeyboard(page, 'select[name="catalogItemId"]', spec.catalogItemId);
  await page.keyboard.press('Tab');
  const destination = page.locator('select[name="destination"]');
  assert.equal(
    await destination.evaluate((element) => element === globalThis.document.activeElement),
    true,
  );
  await chooseSelectByKeyboard(page, 'select[name="destination"]', spec.destination);
  await page.keyboard.press('Tab');
  const navigation = page.waitForNavigation({ waitUntil: 'networkidle' });
  await page.keyboard.press('Enter');
  await navigation;
}

async function keyboardRemove(page) {
  const button = page.getByRole('button', { name: 'Preview removal', exact: true });
  await button.focus();
  const navigation = page.waitForNavigation({ waitUntil: 'networkidle' });
  await page.keyboard.press('Enter');
  await navigation;
}

async function navigateByButton(page, name) {
  const navigation = page.waitForNavigation({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name, exact: true }).click();
  await navigation;
}

async function runReference(browser, spec) {
  const fixture = createReferenceV2AuthoringStudioFixture(spec.referenceId);
  const server = await listenLoopback(fixture.app);
  const address = server.address();
  const baseUrl = 'http://127.0.0.1:' + address.port;
  const page = await browser.newPage({ viewport: spec.shellViewport });

  try {
    await page.goto(
      baseUrl + selectionPath('page:home', spec.previewViewport),
      { waitUntil: 'networkidle' },
    );

    const baseline = await authority(page);
    const baselineOrder = await previewOrder(page);
    const baselineSerialization = JSON.stringify(fixture.session().draftSource);
    assert.match(baseline.acceptedDigest, /^[0-9a-f]{64}$/);
    assert.equal(baseline.previewDigest, baseline.acceptedDigest);
    assert.equal(baseline.previewActive, 'false');
    assert.equal(baseline.persistent, 'false');
    assert.equal(baseline.runtimeWired, 'false');
    assert.equal(baseline.mutations, 'true');

    await keyboardAdd(page, spec);
    const addPreview = await authority(page);
    assert.equal(addPreview.acceptedDigest, baseline.acceptedDigest);
    assert.notEqual(addPreview.previewDigest, baseline.acceptedDigest);
    assert.equal(addPreview.previewActive, 'true');
    const createdId = fixture.proposal().resolvedTarget.componentId;
    const addPreviewOrder = await previewOrder(page);
    assertDestination(addPreviewOrder, createdId, spec.destination, spec.referenceId + '/add-preview');
    const addPreviewGeometry = await geometry(page, spec.referenceId + '/add-preview');
    const addPreviewAccessibility = await accessibility(page, spec.referenceId + '/add-preview');
    const addPreviewScreenshot = await capture(page, spec.referenceId, 'add-preview');

    await navigateByButton(page, 'Discard preview');
    const addDiscarded = await authority(page);
    assert.equal(addDiscarded.acceptedDigest, baseline.acceptedDigest);
    assert.equal(addDiscarded.previewDigest, baseline.acceptedDigest);
    assert.deepEqual(await previewOrder(page), baselineOrder);

    await keyboardAdd(page, spec);
    assert.equal(fixture.proposal().resolvedTarget.componentId, createdId);
    const secondAddPreview = await authority(page);
    await navigateByButton(page, 'Apply to draft');
    const addApplied = await authority(page);
    assert.equal(addApplied.acceptedDigest, secondAddPreview.previewDigest);
    assert.equal(addApplied.previewDigest, addApplied.acceptedDigest);
    assert.equal(addApplied.previewActive, 'false');
    const addAppliedOrder = await previewOrder(page);
    assertDestination(addAppliedOrder, createdId, spec.destination, spec.referenceId + '/add-applied');
    const addAppliedScreenshot = await capture(page, spec.referenceId, 'add-applied');

    await page.goto(
      baseUrl + selectionPath('component:' + createdId, spec.previewViewport),
      { waitUntil: 'networkidle' },
    );
    assert.equal(
      await page.getByRole('heading', { name: 'Remove component', exact: true }).count(),
      1,
    );

    await keyboardRemove(page);
    const removePreview = await authority(page);
    assert.equal(removePreview.acceptedDigest, addApplied.acceptedDigest);
    assert.notEqual(removePreview.previewDigest, addApplied.acceptedDigest);
    assert.equal(removePreview.previewActive, 'true');
    assert.equal((await previewOrder(page)).includes(createdId), false);
    const removePreviewGeometry = await geometry(page, spec.referenceId + '/remove-preview');
    const removePreviewAccessibility = await accessibility(page, spec.referenceId + '/remove-preview');
    const removePreviewScreenshot = await capture(page, spec.referenceId, 'remove-preview');

    await navigateByButton(page, 'Discard preview');
    const removeDiscarded = await authority(page);
    assert.equal(removeDiscarded.acceptedDigest, addApplied.acceptedDigest);
    assert.equal(removeDiscarded.previewDigest, addApplied.acceptedDigest);
    assert.equal((await previewOrder(page)).includes(createdId), true);

    await keyboardRemove(page);
    const secondRemovePreview = await authority(page);
    await navigateByButton(page, 'Apply to draft');
    const removeApplied = await authority(page);
    assert.equal(removeApplied.acceptedDigest, secondRemovePreview.previewDigest);
    assert.equal(removeApplied.previewDigest, removeApplied.acceptedDigest);
    assert.equal(removeApplied.previewActive, 'false');
    assert.equal(removeApplied.acceptedDigest, baseline.acceptedDigest);
    assert.deepEqual(await previewOrder(page), baselineOrder);
    assert.equal(JSON.stringify(fixture.session().draftSource), baselineSerialization);
    const removeAppliedScreenshot = await capture(page, spec.referenceId, 'remove-applied');

    await navigateByButton(page, 'Undo');
    const undoRemove = await authority(page);
    assert.equal(undoRemove.acceptedDigest, addApplied.acceptedDigest);
    assert.equal((await previewOrder(page)).includes(createdId), true);

    await navigateByButton(page, 'Undo');
    const undoAdd = await authority(page);
    assert.equal(undoAdd.acceptedDigest, baseline.acceptedDigest);
    assert.deepEqual(await previewOrder(page), baselineOrder);

    await navigateByButton(page, 'Redo');
    const redoAdd = await authority(page);
    assert.equal(redoAdd.acceptedDigest, addApplied.acceptedDigest);
    assert.equal((await previewOrder(page)).includes(createdId), true);

    await navigateByButton(page, 'Redo');
    const redoRemove = await authority(page);
    assert.equal(redoRemove.acceptedDigest, baseline.acceptedDigest);
    assert.deepEqual(await previewOrder(page), baselineOrder);

    const diagnostics = fixture.diagnostics();
    assert.equal(diagnostics.persistentWrites, 0);
    assert.equal(diagnostics.hiveRpcAttempts, 0);
    assert.equal(diagnostics.hiveWrites, 0);
    assert.equal(diagnostics.proposals, 4);
    assert.equal(diagnostics.discards, 2);
    assert.equal(diagnostics.applies, 2);
    assert.equal(diagnostics.undos, 2);
    assert.equal(diagnostics.redos, 2);

    return {
      referenceId: spec.referenceId,
      catalogItemId: spec.catalogItemId,
      createdComponentId: createdId,
      destination: spec.destination,
      shellViewport: spec.shellViewport,
      previewViewport: spec.previewViewport,
      keyboardCompletions: 2,
      baselineOrder,
      addAppliedOrder,
      digests: {
        before: baseline.acceptedDigest,
        addPreview: addPreview.previewDigest,
        addApplied: addApplied.acceptedDigest,
        removePreview: removePreview.previewDigest,
        removeApplied: removeApplied.acceptedDigest,
        undoRemove: undoRemove.acceptedDigest,
        undoAdd: undoAdd.acceptedDigest,
        redoAdd: redoAdd.acceptedDigest,
        redoRemove: redoRemove.acceptedDigest,
      },
      addPreviewGeometry,
      addPreviewAccessibility,
      removePreviewGeometry,
      removePreviewAccessibility,
      screenshots: [
        addPreviewScreenshot,
        addAppliedScreenshot,
        removePreviewScreenshot,
        removeAppliedScreenshot,
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
    item.addPreviewAccessibility,
    item.removePreviewAccessibility,
  ]);
  const geometryReports = references.flatMap((item) => [
    item.addPreviewGeometry,
    item.removePreviewGeometry,
  ]);
  const summary = {
    referenceCount: references.length,
    screenshotCount: references.reduce((sum, item) => sum + item.screenshots.length, 0),
    keyboardCompletionCount: references.reduce((sum, item) => sum + item.keyboardCompletions, 0),
    digestProofCount: references.length,
    addProofCount: references.length,
    removeProofCount: references.length,
    exactRoundTripProofCount: references.length,
    blockingAccessibilityFindings: accessibilityReports.reduce(
      (sum, item) => sum + item.blocking.length,
      0,
    ),
    horizontalOverflowFindings: geometryReports.filter(
      (item) => item.scrollWidth - item.clientWidth > 1,
    ).length,
    persistentWrites: references.reduce((sum, item) => sum + item.diagnostics.persistentWrites, 0),
    hiveRpcAttempts: references.reduce((sum, item) => sum + item.diagnostics.hiveRpcAttempts, 0),
    hiveWrites: references.reduce((sum, item) => sum + item.diagnostics.hiveWrites, 0),
  };

  assert.equal(summary.referenceCount, 4);
  assert.equal(summary.screenshotCount, 16);
  assert.equal(summary.keyboardCompletionCount, 8);
  assert.equal(summary.addProofCount, 4);
  assert.equal(summary.removeProofCount, 4);
  assert.equal(summary.exactRoundTripProofCount, 4);
  assert.equal(summary.blockingAccessibilityFindings, 0);
  assert.equal(summary.horizontalOverflowFindings, 0);
  assert.equal(summary.persistentWrites, 0);
  assert.equal(summary.hiveRpcAttempts, 0);
  assert.equal(summary.hiveWrites, 0);

  const catalogCoverage = new Set(references.map((item) => item.catalogItemId));
  assert.equal(catalogCoverage.has('story-intro'), true);
  assert.equal(catalogCoverage.has('hours-location'), true);
  assert.equal(catalogCoverage.has('contact-visit'), true);

  const manifest = {
    kind: 'hivenues-v2-component-cardinality-visual-evidence',
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary,
    references,
  };
  fs.writeFileSync(
    path.join(OUTPUT, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  console.log('V2_COMPONENT_CARDINALITY_VISUAL_EVIDENCE', JSON.stringify(summary));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
