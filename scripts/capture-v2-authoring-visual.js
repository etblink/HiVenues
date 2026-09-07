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
  process.env.V2_AUTHORING_REVIEW_ROOT || 'artifacts/v2-authoring-review',
);
const SCREENSHOTS = path.join(OUTPUT, 'screenshots');
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

const CASES = Object.freeze([
  {
    referenceId: 'fourth-street',
    nodeId: 'component:home-pathways',
    fieldId: 'heading',
    value: 'A neighborhood place, shaped by the people in it',
    shellViewport: { width: 1440, height: 1000 },
    previewViewport: 'desktop',
  },
  {
    referenceId: 'juniper',
    nodeId: 'component:home-equipment-status',
    fieldId: 'heading',
    value: 'Equipment availability for today',
    shellViewport: { width: 1280, height: 900 },
    previewViewport: 'tablet',
  },
  {
    referenceId: 'restaurant',
    nodeId: 'component:home-gallery',
    fieldId: 'heading',
    value: 'An evening by the water',
    shellViewport: { width: 1440, height: 1000 },
    previewViewport: 'desktop',
  },
  {
    referenceId: 'live-music',
    nodeId: 'component:home-shows',
    fieldId: 'heading',
    value: 'This week at Northline',
    shellViewport: { width: 390, height: 844 },
    previewViewport: 'mobile',
  },
]);

function selectionPath(spec) {
  const query = new URLSearchParams({
    nodeId: spec.nodeId,
    fieldId: spec.fieldId,
    viewport: spec.previewViewport,
  });
  return `/studio-authoring?${query.toString()}`;
}

function screenshotRecord(filename) {
  const bytes = fs.readFileSync(filename);
  return {
    file: path.relative(OUTPUT, filename).replaceAll(path.sep, '/'),
    sha256: sha256(bytes),
    bytes: bytes.length,
  };
}

function escapedRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  assert.ok(previewFrame, `${label}: preview frame missing`);
  const preview = await runAxe(previewFrame);
  const blocking = [...outer, ...preview]
    .filter((finding) => BLOCKING_IMPACTS.has(finding.impact));
  assert.deepEqual(
    blocking,
    [],
    `${label}: blocking accessibility findings\n${JSON.stringify(blocking, null, 2)}`,
  );
  return { outer, preview, blocking };
}

async function geometry(page, label) {
  const metrics = await page.evaluate(() => {
    const root = globalThis.document.documentElement;
    const heights = [...globalThis.document.querySelectorAll('a,button,textarea')]
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
    `${label}: horizontal overflow ${JSON.stringify(metrics)}`,
  );
  assert.equal(metrics.mainCount, 1, `${label}: expected one main landmark`);
  assert.equal(metrics.iframeCount, 1, `${label}: expected one real-renderer iframe`);
  assert.equal(metrics.textareaCount, 1, `${label}: expected one bounded text editor`);
  assert.ok(
    metrics.minimumTargetHeight === null || metrics.minimumTargetHeight >= 43.5,
    `${label}: target below 44px convention ${JSON.stringify(metrics)}`,
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

async function previewBody(page) {
  const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
  assert.ok(frame, 'real-renderer preview frame missing');
  await frame.waitForLoadState('networkidle');
  return frame.locator('body').innerText();
}

async function capture(page, referenceId, stateId) {
  const filename = path.join(SCREENSHOTS, `${referenceId}-${stateId}.png`);
  await page.screenshot({ path: filename, fullPage: false });
  return screenshotRecord(filename);
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
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const page = await browser.newPage({ viewport: spec.shellViewport });

  try {
    await page.goto(`${baseUrl}${selectionPath(spec)}`, { waitUntil: 'networkidle' });

    const baseline = await authority(page);
    assert.match(baseline.acceptedDigest, /^[0-9a-f]{64}$/);
    assert.equal(baseline.previewDigest, baseline.acceptedDigest);
    assert.equal(baseline.previewActive, 'false');
    assert.equal(baseline.persistent, 'false');
    assert.equal(baseline.runtimeWired, 'false');
    assert.equal(baseline.mutations, 'true');
    assert.equal((await previewBody(page)).includes(spec.value), false);

    const textarea = page.locator('textarea[name="value"]');
    await textarea.focus();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(spec.value);
    const keyboardNavigation = page.waitForNavigation({ waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await keyboardNavigation;

    const preview = await authority(page);
    assert.equal(preview.acceptedDigest, baseline.acceptedDigest);
    assert.notEqual(preview.previewDigest, baseline.acceptedDigest);
    assert.equal(preview.previewActive, 'true');
    assert.match(await page.locator('.preview-state').innerText(), /Preview - not applied|Preview — not applied/);
    assert.match(await previewBody(page), new RegExp(escapedRegex(spec.value)));

    const previewGeometry = await geometry(page, `${spec.referenceId}/preview`);
    const previewAccessibility = await accessibility(page, `${spec.referenceId}/preview`);
    const previewScreenshot = await capture(page, spec.referenceId, 'preview');

    await navigateByButton(page, 'Discard preview');
    const discarded = await authority(page);
    assert.equal(discarded.acceptedDigest, baseline.acceptedDigest);
    assert.equal(discarded.previewDigest, baseline.acceptedDigest);
    assert.equal(discarded.previewActive, 'false');
    assert.equal((await previewBody(page)).includes(spec.value), false);

    await page.locator('textarea[name="value"]').fill(spec.value);
    await navigateByButton(page, 'Preview change');
    const secondPreview = await authority(page);
    assert.equal(secondPreview.acceptedDigest, baseline.acceptedDigest);
    assert.equal(secondPreview.previewActive, 'true');

    await navigateByButton(page, 'Apply to draft');
    const applied = await authority(page);
    assert.equal(applied.acceptedDigest, secondPreview.previewDigest);
    assert.equal(applied.previewDigest, applied.acceptedDigest);
    assert.equal(applied.previewActive, 'false');
    assert.match(await previewBody(page), new RegExp(escapedRegex(spec.value)));
    const appliedScreenshot = await capture(page, spec.referenceId, 'applied');

    await navigateByButton(page, 'Undo');
    const undone = await authority(page);
    assert.equal(undone.acceptedDigest, baseline.acceptedDigest);
    assert.equal(undone.previewDigest, baseline.acceptedDigest);
    assert.equal((await previewBody(page)).includes(spec.value), false);

    await navigateByButton(page, 'Redo');
    const redone = await authority(page);
    assert.equal(redone.acceptedDigest, applied.acceptedDigest);
    assert.equal(redone.previewDigest, applied.acceptedDigest);
    assert.match(await previewBody(page), new RegExp(escapedRegex(spec.value)));

    const diagnostics = fixture.diagnostics();
    assert.equal(diagnostics.persistentWrites, 0);
    assert.equal(diagnostics.hiveRpcAttempts, 0);
    assert.equal(diagnostics.hiveWrites, 0);
    assert.equal(diagnostics.proposals, 2);
    assert.equal(diagnostics.discards, 1);
    assert.equal(diagnostics.applies, 1);
    assert.equal(diagnostics.undos, 1);
    assert.equal(diagnostics.redos, 1);

    return {
      referenceId: spec.referenceId,
      target: { nodeId: spec.nodeId, fieldId: spec.fieldId },
      shellViewport: spec.shellViewport,
      previewViewport: spec.previewViewport,
      keyboardCompleted: true,
      digests: {
        before: baseline.acceptedDigest,
        preview: preview.previewDigest,
        discarded: discarded.acceptedDigest,
        applied: applied.acceptedDigest,
        undone: undone.acceptedDigest,
        redone: redone.acceptedDigest,
      },
      previewGeometry,
      previewAccessibility,
      screenshots: [previewScreenshot, appliedScreenshot],
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

  const summary = {
    referenceCount: references.length,
    screenshotCount: references.reduce((sum, item) => sum + item.screenshots.length, 0),
    keyboardCompletionCount: references.filter((item) => item.keyboardCompleted).length,
    digestProofCount: references.length,
    blockingAccessibilityFindings: references.reduce(
      (sum, item) => sum + item.previewAccessibility.blocking.length,
      0,
    ),
    horizontalOverflowFindings: references.filter(
      (item) => item.previewGeometry.scrollWidth - item.previewGeometry.clientWidth > 1,
    ).length,
    persistentWrites: references.reduce((sum, item) => sum + item.diagnostics.persistentWrites, 0),
    hiveRpcAttempts: references.reduce((sum, item) => sum + item.diagnostics.hiveRpcAttempts, 0),
    hiveWrites: references.reduce((sum, item) => sum + item.diagnostics.hiveWrites, 0),
  };

  assert.equal(summary.referenceCount, 4);
  assert.equal(summary.keyboardCompletionCount, 4);
  assert.equal(summary.blockingAccessibilityFindings, 0);
  assert.equal(summary.horizontalOverflowFindings, 0);
  assert.equal(summary.persistentWrites, 0);
  assert.equal(summary.hiveRpcAttempts, 0);
  assert.equal(summary.hiveWrites, 0);

  const manifest = {
    kind: 'hivenues-v2-authoring-set-field-visual-evidence',
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary,
    references,
  };
  fs.writeFileSync(
    path.join(OUTPUT, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  console.log('V2_AUTHORING_VISUAL_EVIDENCE', JSON.stringify(summary));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
