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
  process.env.V2_MEDIA_REVIEW_ROOT || 'artifacts/v2-media-authoring-review',
);
const SCREENSHOTS = path.join(OUTPUT, 'screenshots');
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

const CASES = Object.freeze([
  { referenceId: 'fourth-street', shellViewport: { width: 1440, height: 1000 }, previewViewport: 'desktop' },
  { referenceId: 'juniper', shellViewport: { width: 1280, height: 900 }, previewViewport: 'tablet' },
  { referenceId: 'restaurant', shellViewport: { width: 1024, height: 900 }, previewViewport: 'tablet' },
  { referenceId: 'live-music', shellViewport: { width: 390, height: 844 }, previewViewport: 'mobile' },
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

async function rendererState(page, componentId) {
  const frame = previewFrame(page);
  await frame.waitForLoadState('networkidle');
  return frame.evaluate((id) => {
    const component = globalThis.document.querySelector('[data-component-id="' + id + '"]');
    if (!component) throw new Error('hero component missing from renderer');
    const image = component.querySelector('.v2-media img');
    if (!image) throw new Error('hero media image missing from renderer');
    const media = image.closest('.v2-media');
    return {
      src: image.getAttribute('src'),
      alt: image.getAttribute('alt'),
      ariaHidden: image.getAttribute('aria-hidden'),
      width: image.getAttribute('width'),
      height: image.getAttribute('height'),
      mediaClass: media ? media.className : null,
      focalX: media ? media.style.getPropertyValue('--v2-focal-x') : null,
      focalY: media ? media.style.getPropertyValue('--v2-focal-y') : null,
    };
  }, componentId);
}

function assertRendererChanged(before, after, expectedAsset, expectedAlt, label) {
  assert.notDeepEqual(after, before, label + ': renderer media did not change');
  assert.equal(after.src, expectedAsset.src, label + ': renderer asset src mismatch');
  assert.equal(after.alt, expectedAlt, label + ': renderer alt mismatch');
  assert.equal(after.ariaHidden, null, label + ': meaningful image must not be aria-hidden');
  assert.equal(after.width, String(expectedAsset.width), label + ': renderer width mismatch');
  assert.equal(after.height, String(expectedAsset.height), label + ': renderer height mismatch');
  assert.equal(after.mediaClass, before.mediaClass, label + ': media treatment classes changed');
  assert.equal(after.focalX, before.focalX, label + ': focal x changed');
  assert.equal(after.focalY, before.focalY, label + ': focal y changed');
}

function assertRendererRestored(expected, actual, label) {
  assert.deepEqual(actual, expected, label + ': renderer media did not restore exactly');
}

async function chooseMediaByKeyboard(page, assetId, altText, label) {
  const form = page.locator('form[action="/studio-authoring/media"]');
  assert.equal(await form.count(), 1, label + ': expected one Media form');
  const asset = form.locator('select[name="assetId"]');
  const options = await asset.locator('option').evaluateAll((nodes) => nodes.map((option) => option.value));
  assert.equal(options.includes(assetId), true, label + ': target managed asset missing');
  await asset.focus();
  await page.keyboard.press('Home');
  let selected = await asset.inputValue();
  for (let step = 0; selected !== assetId && step <= options.length; step += 1) {
    await page.keyboard.press('ArrowDown');
    selected = await asset.inputValue();
  }
  assert.equal(selected, assetId, label + ': keyboard asset selection failed');

  await page.keyboard.press('Tab');
  const decorative = form.locator('select[name="decorative"]');
  assert.equal(await decorative.evaluate((element) => element === globalThis.document.activeElement), true);
  await page.keyboard.press('Home');
  assert.equal(await decorative.inputValue(), 'false', label + ': meaningful option must be selected');

  await page.keyboard.press('Tab');
  const alt = form.locator('input[name="alt"]');
  assert.equal(await alt.evaluate((element) => element === globalThis.document.activeElement), true);
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await page.keyboard.type(altText);
  assert.equal(await alt.inputValue(), altText);

  await page.keyboard.press('Tab');
  const activeText = await page.evaluate(() => globalThis.document.activeElement?.textContent?.trim() || '');
  assert.equal(activeText, 'Preview hero image');
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
  const source = fixture.session().draftSource;
  const pageSource = source.site.pages.find((candidate) =>
    candidate.components.some((component) => component.kind === 'venue-hero' && component.content.media)
  );
  assert.ok(pageSource, spec.referenceId + ': media-bearing page missing');
  const hero = pageSource.components.find((component) => component.kind === 'venue-hero' && component.content.media);
  const targetAsset = source.media.assets.find(
    (asset) =>
      asset.id !== hero.content.media.assetId
      && asset.id !== source.site.brand.logoAssetId,
  ) || source.media.assets.find((asset) => asset.id !== hero.content.media.assetId);
  assert.ok(targetAsset, spec.referenceId + ': alternate managed asset missing');
  const nodeId = 'component:' + hero.id;
  const targetAlt = spec.referenceId + ' alternate hero image';

  const server = await listenLoopback(fixture.app);
  const address = server.address();
  const baseUrl = 'http://127.0.0.1:' + address.port;
  const page = await browser.newPage({ viewport: spec.shellViewport });

  try {
    await page.goto(baseUrl + selectionPath(nodeId, spec.previewViewport), { waitUntil: 'networkidle' });
    const baseline = await authority(page);
    const baselineSerialization = JSON.stringify(fixture.session().draftSource);
    const baselineRenderer = await rendererState(page, hero.id);
    const baselineUsage = JSON.parse(JSON.stringify(hero.content.media));
    assert.notEqual(baselineUsage.assetId, targetAsset.id);
    assert.match(baseline.acceptedDigest, /^[0-9a-f]{64}$/);
    assert.equal(baseline.previewDigest, baseline.acceptedDigest);
    assert.equal(baseline.previewActive, 'false');
    assert.equal(baseline.persistent, 'false');
    assert.equal(baseline.runtimeWired, 'false');
    assert.equal(baseline.mutations, 'true');

    await chooseMediaByKeyboard(page, targetAsset.id, targetAlt, spec.referenceId + '/first');
    const firstPreview = await authority(page);
    const firstPreviewRenderer = await rendererState(page, hero.id);
    assert.equal(firstPreview.acceptedDigest, baseline.acceptedDigest);
    assert.notEqual(firstPreview.previewDigest, baseline.acceptedDigest);
    assert.equal(firstPreview.previewActive, 'true');
    assert.equal(fixture.session().draftDigest, baseline.acceptedDigest);
    assert.equal(JSON.stringify(fixture.session().draftSource), baselineSerialization);
    assertRendererChanged(baselineRenderer, firstPreviewRenderer, targetAsset, targetAlt, spec.referenceId + '/first-preview');
    const previewGeometry = await geometry(page, spec.referenceId + '/preview');
    const previewAccessibility = await accessibility(page, spec.referenceId + '/preview');
    const previewScreenshot = await capture(page, spec.referenceId, 'preview');

    await activateButtonByKeyboard(page, 'Discard preview');
    const discarded = await authority(page);
    const discardedRenderer = await rendererState(page, hero.id);
    assert.equal(discarded.acceptedDigest, baseline.acceptedDigest);
    assert.equal(discarded.previewDigest, baseline.acceptedDigest);
    assert.equal(discarded.previewActive, 'false');
    assert.equal(fixture.proposal(), null);
    assert.equal(JSON.stringify(fixture.session().draftSource), baselineSerialization);
    assertRendererRestored(baselineRenderer, discardedRenderer, spec.referenceId + '/discard');

    await chooseMediaByKeyboard(page, targetAsset.id, targetAlt, spec.referenceId + '/second');
    const secondPreview = await authority(page);
    const secondPreviewRenderer = await rendererState(page, hero.id);
    assert.equal(secondPreview.acceptedDigest, baseline.acceptedDigest);
    assert.equal(secondPreview.previewDigest, firstPreview.previewDigest);
    assert.deepEqual(secondPreviewRenderer, firstPreviewRenderer);

    await activateButtonByKeyboard(page, 'Apply to draft');
    const applied = await authority(page);
    const appliedRenderer = await rendererState(page, hero.id);
    assert.equal(applied.acceptedDigest, secondPreview.previewDigest);
    assert.equal(applied.previewDigest, applied.acceptedDigest);
    assert.equal(applied.previewActive, 'false');
    assertRendererChanged(baselineRenderer, appliedRenderer, targetAsset, targetAlt, spec.referenceId + '/applied');
    assert.deepEqual(appliedRenderer, secondPreviewRenderer);
    const acceptedHero = fixture.session().draftSource.site.pages.find((candidate) => candidate.id === pageSource.id)
      .components.find((component) => component.id === hero.id);
    assert.equal(acceptedHero.content.media.assetId, targetAsset.id);
    assert.equal(acceptedHero.content.media.alt, targetAlt);
    assert.equal(JSON.stringify(acceptedHero.content.media.treatment), JSON.stringify(baselineUsage.treatment));
    const appliedGeometry = await geometry(page, spec.referenceId + '/applied');
    const appliedAccessibility = await accessibility(page, spec.referenceId + '/applied');
    const appliedScreenshot = await capture(page, spec.referenceId, 'applied');

    await activateButtonByKeyboard(page, 'Undo');
    const undone = await authority(page);
    const undoneRenderer = await rendererState(page, hero.id);
    assert.equal(undone.acceptedDigest, baseline.acceptedDigest);
    assert.equal(undone.previewDigest, baseline.acceptedDigest);
    assert.equal(JSON.stringify(fixture.session().draftSource), baselineSerialization);
    assertRendererRestored(baselineRenderer, undoneRenderer, spec.referenceId + '/undo');
    const undoScreenshot = await capture(page, spec.referenceId, 'undo');

    await activateButtonByKeyboard(page, 'Redo');
    const redone = await authority(page);
    const redoneRenderer = await rendererState(page, hero.id);
    assert.equal(redone.acceptedDigest, applied.acceptedDigest);
    assert.equal(redone.previewDigest, applied.acceptedDigest);
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
      componentId: hero.id,
      beforeAssetId: baselineUsage.assetId,
      assetId: targetAsset.id,
      targetAlt,
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
      screenshots: [previewScreenshot, appliedScreenshot, undoScreenshot, redoScreenshot],
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

  const accessibilityReports = references.flatMap((item) => [item.previewAccessibility, item.appliedAccessibility]);
  const geometryReports = references.flatMap((item) => [item.previewGeometry, item.appliedGeometry]);
  const summary = {
    referenceCount: references.length,
    screenshotCount: references.reduce((sum, item) => sum + item.screenshots.length, 0),
    keyboardProposalCompletionCount: references.reduce((sum, item) => sum + item.keyboardProposalCompletions, 0),
    digestProofCount: references.length,
    discardProofCount: references.length,
    applyProofCount: references.length,
    undoProofCount: references.length,
    redoProofCount: references.length,
    rendererAssetProofCount: references.length,
    altTextProofCount: references.length,
    treatmentPreservationProofCount: references.length,
    blockingAccessibilityFindings: accessibilityReports.reduce((sum, item) => sum + item.blocking.length, 0),
    horizontalOverflowFindings: geometryReports.filter((item) => (
      item.outer.scrollWidth - item.outer.clientWidth > 1
      || item.preview.scrollWidth - item.preview.clientWidth > 1
    )).length,
    persistentWrites: references.reduce((sum, item) => sum + item.diagnostics.persistentWrites, 0),
    hiveRpcAttempts: references.reduce((sum, item) => sum + item.diagnostics.hiveRpcAttempts, 0),
    hiveWrites: references.reduce((sum, item) => sum + item.diagnostics.hiveWrites, 0),
  };

  assert.equal(summary.referenceCount, 4);
  assert.equal(summary.screenshotCount, 16);
  assert.equal(summary.keyboardProposalCompletionCount, 8);
  assert.equal(summary.digestProofCount, 4);
  assert.equal(summary.discardProofCount, 4);
  assert.equal(summary.applyProofCount, 4);
  assert.equal(summary.undoProofCount, 4);
  assert.equal(summary.redoProofCount, 4);
  assert.equal(summary.rendererAssetProofCount, 4);
  assert.equal(summary.altTextProofCount, 4);
  assert.equal(summary.treatmentPreservationProofCount, 4);
  assert.equal(summary.blockingAccessibilityFindings, 0);
  assert.equal(summary.horizontalOverflowFindings, 0);
  assert.equal(summary.persistentWrites, 0);
  assert.equal(summary.hiveRpcAttempts, 0);
  assert.equal(summary.hiveWrites, 0);

  const manifest = {
    kind: 'hivenues-v2-media-authoring-visual-evidence',
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary,
    references,
  };
  fs.writeFileSync(path.join(OUTPUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('V2_MEDIA_AUTHORING_VISUAL_EVIDENCE', JSON.stringify(summary));
}



main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
