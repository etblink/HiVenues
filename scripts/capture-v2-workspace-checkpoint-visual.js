#!/usr/bin/env node
'use strict';

const { URLSearchParams } = require('node:url');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const axe = require('axe-core');
const { chromium } = require('playwright');
const {
  createReferenceV2AuthoringStudioFixture,
  createV2AuthoringStudioWorkspaceFixture,
} = require('../test/support/v2-authoring-studio-fixture');
const { deriveManagedImage } = require('../src/venue/managed-assets');
const { serializeV2DeploymentAgnosticVenueSource } = require('../src/venue/v2/source');
const { V2_VENUE_SOURCE_FILENAME } = require('../src/venue/v2/source-file');
const { createTurnkeyWorkspace } = require('../src/venue/turnkey-workspace');
const { closeServer, listenLoopback, sha256 } = require('./support/visual-harness');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.resolve(
  ROOT,
  process.env.V2_CHECKPOINT_REVIEW_ROOT || 'artifacts/v2-workspace-checkpoint-review',
);
const SCREENSHOTS = path.join(OUTPUT, 'screenshots');
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);
const LOCAL_GIF_BYTES = Buffer.from(
  'R0lGODdhBAAEAIEAAPBaWh7Iqvrrvh4oRiwAAAAABAAEAAAIDgABBBAwQCBBgwUHDggIADs=',
  'base64',
);
const CASES = Object.freeze([
  { referenceId: 'fourth-street', shellViewport: { width: 1440, height: 1000 }, previewViewport: 'desktop' },
  { referenceId: 'juniper', shellViewport: { width: 1280, height: 900 }, previewViewport: 'tablet' },
  { referenceId: 'restaurant', shellViewport: { width: 1024, height: 900 }, previewViewport: 'tablet' },
  { referenceId: 'live-music', shellViewport: { width: 390, height: 844 }, previewViewport: 'mobile' },
]);

function answers(referenceId) {
  return {
    displayName: referenceId + ' persistence fixture',
    id: 'checkpoint-' + referenceId,
    address: '100 Example Avenue, Testville, NV 89000',
    phone: '(555) 010-1920',
    hours: 'Daily, 10:00 a.m.–10:00 p.m.',
    websiteUrl: 'https://checkpoint.example/',
    mapUrl: 'https://checkpoint.example/map',
    communityId: 'hive-654321',
    officialAccount: 'persistvenue',
    threadsContainerAccount: 'persist.threads',
    paymentMerchantAccount: 'persistvenue',
  };
}

function temporaryWorkspace(referenceId) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-v2-visual-checkpoint-'));
  const workspaceDirectory = path.join(parent, referenceId + '-workspace');
  return {
    parent,
    ...createTurnkeyWorkspace({ workspaceDirectory, answers: answers(referenceId) }),
  };
}

function selectionPath(nodeId, viewport) {
  return '/studio-authoring?' + new URLSearchParams({ nodeId, viewport }).toString();
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

function previewFrame(page) {
  const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
  assert.ok(frame, 'real-renderer preview frame missing');
  return frame;
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
    const heights = [...globalThis.document.querySelectorAll('a,button,input,textarea,select')]
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
  assert.ok(outer.scrollWidth - outer.clientWidth <= 1, label + ': outer overflow');
  assert.ok(preview.scrollWidth - preview.clientWidth <= 1, label + ': preview overflow');
  assert.equal(outer.mainCount, 1, label + ': Studio main landmark');
  assert.equal(outer.iframeCount, 1, label + ': renderer iframe');
  assert.equal(preview.mainCount, 1, label + ': renderer main landmark');
  assert.equal(preview.h1Count, 1, label + ': renderer h1');
  assert.ok(
    outer.minimumTargetHeight === null || outer.minimumTargetHeight >= 43.5,
    label + ': target below 44px convention ' + JSON.stringify(outer),
  );
  return { outer, preview };
}

async function stateEvidence(page, label) {
  return {
    geometry: await geometry(page, label),
    accessibility: await accessibility(page, label),
  };
}

async function authority(page) {
  const state = await page.locator('main.studio').evaluate((element) => ({
    acceptedDigest: element.dataset.acceptedDigest,
    previewDigest: element.dataset.previewDigest,
    previewActive: element.dataset.previewActive,
    persistent: element.dataset.studioPersistent,
    persisted: element.dataset.studioPersisted,
    persistedDigest: element.dataset.persistedDigest,
    runtimeWired: element.dataset.studioRuntimeWired,
  }));
  const save = page.locator('form[action="/studio-authoring/save-workspace"] button');
  return {
    ...state,
    saveCount: await save.count(),
    saveText: await save.count() ? (await save.textContent()).trim() : null,
    saveDisabled: await save.count() ? await save.isDisabled() : null,
  };
}

async function rendererState(page, componentId) {
  const frame = previewFrame(page);
  await frame.waitForLoadState('networkidle');
  return frame.evaluate((id) => {
    const component = globalThis.document.querySelector('[data-component-id="' + id + '"]');
    if (!component) throw new Error('hero component missing');
    const image = component.querySelector('.v2-media img');
    if (!image) throw new Error('hero image missing');
    return {
      src: image.getAttribute('src'),
      alt: image.getAttribute('alt'),
      width: image.getAttribute('width'),
      height: image.getAttribute('height'),
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    };
  }, componentId);
}

async function importLocalMediaByKeyboard(page, altText, label) {
  const form = page.locator('form[data-local-media-import="meaningful"]');
  assert.equal(await form.count(), 1, label + ': local import form');
  const file = form.locator('input[type="file"]');
  await file.setInputFiles({
    name: 'durable-hero.gif',
    mimeType: 'image/gif',
    buffer: LOCAL_GIF_BYTES,
  });
  await file.focus();
  await page.keyboard.press('Tab');
  const alt = form.locator('input[name="alt"]');
  assert.equal(
    await alt.evaluate((element) => element === globalThis.document.activeElement),
    true,
  );
  await page.keyboard.type(altText);
  await page.keyboard.press('Tab');
  assert.equal(
    await page.evaluate(() => globalThis.document.activeElement?.textContent?.trim() || ''),
    'Preview local image',
  );
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
  const workspace = temporaryWorkspace(spec.referenceId);
  const v1BeforeSha256 = sha256(fs.readFileSync(workspace.sourceFile));
  const derived = deriveManagedImage(LOCAL_GIF_BYTES);
  const mediaFile = path.join(workspace.assetDirectory, derived.filename);
  const v2SourceFile = path.join(workspace.root, V2_VENUE_SOURCE_FILENAME);
  const fixture = createReferenceV2AuthoringStudioFixture(
    spec.referenceId,
    { workspaceDirectory: workspace.root },
  );
  const source = fixture.session().draftSource;
  const pageSource = source.site.pages.find((candidate) =>
    candidate.components.some(
      (component) => component.kind === 'venue-hero' && component.content.media,
    )
  );
  assert.ok(pageSource, spec.referenceId + ': media-bearing page missing');
  const hero = pageSource.components.find(
    (component) => component.kind === 'venue-hero' && component.content.media,
  );
  const nodeId = 'component:' + hero.id;
  const targetAlt = spec.referenceId + ' durable workspace hero image';
  const firstServer = await listenLoopback(fixture.app);
  let reopenedServer = null;
  const page = await browser.newPage({ viewport: spec.shellViewport });

  try {
    const firstBase = 'http://127.0.0.1:' + firstServer.address().port;
    await page.goto(
      firstBase + selectionPath(nodeId, spec.previewViewport),
      { waitUntil: 'networkidle' },
    );
    const opening = await authority(page);
    assert.equal(opening.persistent, 'true');
    assert.equal(opening.persisted, 'false');
    assert.equal(opening.persistedDigest, 'ABSENT');
    assert.equal(opening.saveCount, 1);
    assert.equal(opening.saveText, 'Save workspace checkpoint');
    assert.equal(opening.saveDisabled, false);
    assert.equal(fs.existsSync(v2SourceFile), false);
    assert.equal(fs.existsSync(mediaFile), false);
    const openingRenderer = await rendererState(page, hero.id);
    const openingEvidence = await stateEvidence(page, spec.referenceId + '/opening');
    const openingScreenshot = await capture(page, spec.referenceId, 'opening-unsaved');

    await importLocalMediaByKeyboard(page, targetAlt, spec.referenceId + '/preview');
    const proposal = fixture.proposal();
    assert.equal(proposal.resolvedTarget.assetSrc, derived.sourcePath);
    const preview = await authority(page);
    assert.equal(preview.persisted, 'false');
    assert.equal(preview.previewActive, 'true');
    assert.equal(preview.saveDisabled, true);
    assert.equal(fs.existsSync(v2SourceFile), false);
    assert.equal(fs.existsSync(mediaFile), false);
    assert.equal(fixture.diagnostics().persistentWrites, 0);
    const previewRenderer = await rendererState(page, hero.id);
    assert.equal(previewRenderer.src, derived.sourcePath);
    assert.equal(previewRenderer.alt, targetAlt);
    assert.equal(previewRenderer.naturalWidth, 4);
    assert.equal(previewRenderer.naturalHeight, 4);
    const previewScreenshot = await capture(page, spec.referenceId, 'preview-memory-only');

    await activateButtonByKeyboard(page, 'Apply to draft');
    const applied = await authority(page);
    assert.equal(applied.persisted, 'false');
    assert.equal(applied.previewActive, 'false');
    assert.equal(applied.saveText, 'Save workspace checkpoint');
    assert.equal(applied.saveDisabled, false);
    assert.equal(fs.existsSync(v2SourceFile), false);
    assert.equal(fs.existsSync(mediaFile), false);
    assert.equal(fixture.diagnostics().persistentWrites, 0);
    const appliedRenderer = await rendererState(page, hero.id);
    assert.deepEqual(appliedRenderer, previewRenderer);
    const appliedEvidence = await stateEvidence(page, spec.referenceId + '/applied');
    const appliedScreenshot = await capture(page, spec.referenceId, 'applied-unsaved');

    await activateButtonByKeyboard(page, 'Save workspace checkpoint');
    const saved = await authority(page);
    assert.equal(saved.persisted, 'true');
    assert.equal(saved.persistedDigest, saved.acceptedDigest);
    assert.equal(saved.saveText, 'Workspace saved');
    assert.equal(saved.saveDisabled, true);
    assert.equal(fixture.diagnostics().persistentWrites, 2);
    assert.equal(fixture.diagnostics().saveSuccesses, 1);
    assert.equal(fixture.diagnostics().ephemeralMediaEntries, 0);
    assert.deepEqual(fs.readFileSync(mediaFile), LOCAL_GIF_BYTES);
    assert.equal(
      fs.readFileSync(v2SourceFile, 'utf8'),
      serializeV2DeploymentAgnosticVenueSource(fixture.session().draftSource),
    );
    assert.equal(sha256(fs.readFileSync(workspace.sourceFile)), v1BeforeSha256);
    const savedRenderer = await rendererState(page, hero.id);
    assert.deepEqual(savedRenderer, appliedRenderer);
    const savedEvidence = await stateEvidence(page, spec.referenceId + '/saved');
    const savedScreenshot = await capture(page, spec.referenceId, 'saved');

    await closeServer(firstServer);
    const reopenedFixture = createV2AuthoringStudioWorkspaceFixture({
      workspaceDirectory: workspace.root,
    });
    reopenedServer = await listenLoopback(reopenedFixture.app);
    const reopenedBase = 'http://127.0.0.1:' + reopenedServer.address().port;
    await page.goto(
      reopenedBase + selectionPath(nodeId, spec.previewViewport),
      { waitUntil: 'networkidle' },
    );
    const reopened = await authority(page);
    assert.equal(reopened.persisted, 'true');
    assert.equal(reopened.persistedDigest, saved.acceptedDigest);
    assert.equal(reopened.acceptedDigest, saved.acceptedDigest);
    assert.equal(reopened.saveText, 'Workspace saved');
    assert.equal(reopened.saveDisabled, true);
    const reopenedRenderer = await rendererState(page, hero.id);
    assert.deepEqual(reopenedRenderer, savedRenderer);
    assert.equal(reopenedRenderer.naturalWidth, 4);
    assert.equal(reopenedRenderer.naturalHeight, 4);
    const durableResponse = await page.request.get(reopenedBase + derived.sourcePath);
    assert.equal(durableResponse.status(), 200);
    assert.deepEqual(await durableResponse.body(), LOCAL_GIF_BYTES);
    assert.equal(sha256(fs.readFileSync(workspace.sourceFile)), v1BeforeSha256);
    assert.equal(reopenedFixture.diagnostics().persistentWrites, 0);
    assert.equal(reopenedFixture.diagnostics().hiveRpcAttempts, 0);
    assert.equal(reopenedFixture.diagnostics().hiveWrites, 0);
    const reopenedEvidence = await stateEvidence(page, spec.referenceId + '/reopened');
    const reopenedScreenshot = await capture(page, spec.referenceId, 'reopened');

    return {
      referenceId: spec.referenceId,
      componentId: hero.id,
      shellViewport: spec.shellViewport,
      previewViewport: spec.previewViewport,
      assetId: proposal.resolvedTarget.assetId,
      assetSrc: derived.sourcePath,
      mediaFilename: derived.filename,
      digestSha256: derived.digestSha256,
      v1SourceSha256: v1BeforeSha256,
      opening,
      preview,
      applied,
      saved,
      reopened,
      renderer: {
        opening: openingRenderer,
        preview: previewRenderer,
        applied: appliedRenderer,
        saved: savedRenderer,
        reopened: reopenedRenderer,
      },
      evidence: {
        opening: openingEvidence,
        applied: appliedEvidence,
        saved: savedEvidence,
        reopened: reopenedEvidence,
      },
      screenshots: [
        openingScreenshot,
        previewScreenshot,
        appliedScreenshot,
        savedScreenshot,
        reopenedScreenshot,
      ],
      diagnostics: fixture.diagnostics(),
      reopenedDiagnostics: reopenedFixture.diagnostics(),
      previewNonPersistent: true,
      v1SourcePreserved: true,
      exactSourceDigest: saved.persistedDigest === fixture.session().draftDigest,
      managedMediaPersisted: fs.existsSync(mediaFile),
      reopenedExact:
        reopened.acceptedDigest === saved.acceptedDigest
        && reopenedRenderer.src === derived.sourcePath,
    };
  } finally {
    await page.close();
    try { await closeServer(firstServer); } catch { /* already closed after Save */ }
    if (reopenedServer) await closeServer(reopenedServer);
    fs.rmSync(workspace.parent, { recursive: true, force: true });
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

  const evidenceStates = references.flatMap((item) => Object.values(item.evidence));
  const accessibilityReports = evidenceStates.map((item) => item.accessibility);
  const geometryReports = evidenceStates.map((item) => item.geometry);
  const summary = {
    referenceCount: references.length,
    screenshotCount: references.reduce((sum, item) => sum + item.screenshots.length, 0),
    explicitSaveControlCount: references.filter((item) => item.opening.saveCount === 1).length,
    previewNonPersistentProofCount: references.filter((item) => item.previewNonPersistent).length,
    savedStateProofCount: references.filter((item) => item.saved.persisted === 'true').length,
    reopenProofCount: references.filter((item) => item.reopenedExact).length,
    v1SourcePreservationProofCount: references.filter((item) => item.v1SourcePreserved).length,
    exactSourceDigestProofCount: references.filter((item) => item.exactSourceDigest).length,
    managedMediaPersistenceProofCount: references.filter((item) => item.managedMediaPersisted).length,
    byteDecodeProofCount: references.filter(
      (item) =>
        item.renderer.reopened.naturalWidth === 4
        && item.renderer.reopened.naturalHeight === 4,
    ).length,
    blockingAccessibilityFindings:
      accessibilityReports.reduce((sum, item) => sum + item.blocking.length, 0),
    horizontalOverflowFindings: geometryReports.filter((item) => (
      item.outer.scrollWidth - item.outer.clientWidth > 1
      || item.preview.scrollWidth - item.preview.clientWidth > 1
    )).length,
    persistentWrites:
      references.reduce((sum, item) => sum + item.diagnostics.persistentWrites, 0),
    hiveRpcAttempts: references.reduce(
      (sum, item) =>
        sum
        + item.diagnostics.hiveRpcAttempts
        + item.reopenedDiagnostics.hiveRpcAttempts,
      0,
    ),
    hiveWrites: references.reduce(
      (sum, item) => sum + item.diagnostics.hiveWrites + item.reopenedDiagnostics.hiveWrites,
      0,
    ),
  };

  assert.deepEqual(summary, {
    referenceCount: 4,
    screenshotCount: 20,
    explicitSaveControlCount: 4,
    previewNonPersistentProofCount: 4,
    savedStateProofCount: 4,
    reopenProofCount: 4,
    v1SourcePreservationProofCount: 4,
    exactSourceDigestProofCount: 4,
    managedMediaPersistenceProofCount: 4,
    byteDecodeProofCount: 4,
    blockingAccessibilityFindings: 0,
    horizontalOverflowFindings: 0,
    persistentWrites: 8,
    hiveRpcAttempts: 0,
    hiveWrites: 0,
  });

  const manifest = {
    kind: 'hivenues-v2-workspace-checkpoint-visual-evidence',
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary,
    references,
  };
  fs.writeFileSync(
    path.join(OUTPUT, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  console.log('V2_WORKSPACE_CHECKPOINT_VISUAL_EVIDENCE', JSON.stringify(summary));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
