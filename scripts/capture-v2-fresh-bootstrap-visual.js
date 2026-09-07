#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { URLSearchParams } = require('node:url');
const axe = require('axe-core');
const { chromium } = require('playwright');
const {
  main: createV2Venue,
} = require('./create-v2-venue');
const {
  deriveV2DeploymentAgnosticVenueSourceDigest,
  serializeV2DeploymentAgnosticVenueSource,
} = require('../src/venue/v2/source');
const {
  loadV2DeploymentAgnosticVenueSourceFile,
} = require('../src/venue/v2/source-file');
const {
  startV2TurnkeyStudio,
} = require('../src/venue/v2/turnkey-studio');
const {
  sha256,
} = require('./support/visual-harness');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.resolve(
  ROOT,
  process.env.V2_BOOTSTRAP_REVIEW_ROOT || 'artifacts/v2-fresh-bootstrap-review',
);
const SCREENSHOTS = path.join(OUTPUT, 'screenshots');
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);
const CASES = Object.freeze([
  {
    starter: 'general',
    displayName: 'Common Ground Hall',
    viewport: { width: 1440, height: 1000 },
    previewViewport: 'desktop',
  },
  {
    starter: 'hospitality',
    displayName: 'Copper Table',
    viewport: { width: 1024, height: 900 },
    previewViewport: 'tablet',
  },
  {
    starter: 'live-music',
    displayName: 'Signal Room',
    viewport: { width: 390, height: 844 },
    previewViewport: 'mobile',
  },
]);

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function screenshotRecord(filename) {
  const bytes = fs.readFileSync(filename);
  return {
    file: path.relative(OUTPUT, filename).replaceAll(path.sep, '/'),
    sha256: sha256(bytes),
    bytes: bytes.length,
  };
}

async function capture(page, starter, state) {
  const filename = path.join(SCREENSHOTS, starter + '-' + state + '.png');
  await page.screenshot({ path: filename, fullPage: false });
  return screenshotRecord(filename);
}

function previewFrame(page) {
  const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
  assert.ok(frame, 'flagship Studio real-renderer frame missing');
  return frame;
}

async function runAxe(frame) {
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
    const targets = [...globalThis.document.querySelectorAll('a,button,input,textarea,select')]
      .map((element) => element.getBoundingClientRect().height)
      .filter((height) => height > 0);
    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      mainCount: globalThis.document.querySelectorAll('main').length,
      iframeCount: globalThis.document.querySelectorAll('iframe').length,
      minimumTargetHeight: targets.length ? Math.min(...targets) : null,
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
    label + ': control below 44px convention',
  );
  return { outer, preview };
}

async function stateEvidence(page, label) {
  return {
    accessibility: await accessibility(page, label),
    geometry: await geometry(page, label),
  };
}

async function authority(page) {
  return page.locator('main.studio').evaluate((element) => ({
    acceptedDigest: element.dataset.acceptedDigest,
    previewDigest: element.dataset.previewDigest,
    previewActive: element.dataset.previewActive,
    persistent: element.dataset.studioPersistent,
    persisted: element.dataset.studioPersisted,
    persistedDigest: element.dataset.persistedDigest,
    runtimeWired: element.dataset.studioRuntimeWired,
  }));
}

async function rendererHeroBody(page) {
  return previewFrame(page).locator('[data-component-id="home-hero"]').textContent();
}

async function runCase(browser, spec) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-pm3-closure-'));
  const workspaceDirectory = path.join(parent, spec.starter + '-workspace');
  const id = slug(spec.displayName);
  let cliOutput = '';
  let runtime = null;
  let reopenedRuntime = null;
  const context = await browser.newContext({ viewport: spec.viewport });
  await context.addInitScript({ content: axe.source });
  const page = await context.newPage();

  try {
    const created = await createV2Venue([
      workspaceDirectory,
      '--name', spec.displayName,
      '--id', id,
      '--starter', spec.starter,
      '--address', '700 Fresh Start Avenue, Reno, NV 89501',
      '--phone', '(555) 010-1940',
      '--hours', 'Daily, 10:00 a.m.–10:00 p.m.',
      '--website', 'https://' + id + '.example/',
      '--map', 'https://' + id + '.example/visit',
    ], {
      output: { write(value) { cliOutput += value; } },
    });

    assert.match(cliOutput, /Hive\/community\/payment capabilities: disabled by default/);
    assert.match(cliOutput, /npm run venue:studio:v2/);
    assert.equal(fs.existsSync(path.join(workspaceDirectory, 'venue-source.json')), false);
    assert.equal(fs.existsSync(created.sourceFile), true);
    const openingSource = loadV2DeploymentAgnosticVenueSourceFile(created.sourceFile);
    assert.equal(openingSource.capabilities.community.state, 'disabled');
    assert.equal(openingSource.capabilities.transaction.state, 'disabled');
    const openingSourceBytes = fs.readFileSync(created.sourceFile);
    const openingSourceSha256 = sha256(openingSourceBytes);
    const openingDigest = deriveV2DeploymentAgnosticVenueSourceDigest(openingSource);

    runtime = await startV2TurnkeyStudio({ workspaceDirectory, port: 0 });
    const studioUrl = runtime.url + '?' + new URLSearchParams({
      nodeId: 'component:home-hero',
      fieldId: 'body',
      viewport: spec.previewViewport,
    }).toString();
    await page.goto(studioUrl, { waitUntil: 'networkidle' });

    const opening = await authority(page);
    assert.equal(opening.persistent, 'true');
    assert.equal(opening.persisted, 'true');
    assert.equal(opening.persistedDigest, openingDigest);
    assert.equal(opening.acceptedDigest, openingDigest);
    assert.equal(opening.runtimeWired, 'false');
    assert.match(await rendererHeroBody(page), new RegExp(spec.displayName));
    const openingEvidence = await stateEvidence(page, spec.starter + '/opening');
    const openingScreenshot = await capture(page, spec.starter, 'opening-saved');

    const targetBody = spec.displayName + ' is now being authored through the fresh flagship v2 Studio entry path.';
    const editor = page.locator('textarea[name="value"]');
    assert.equal(await editor.count(), 1);
    await editor.fill(targetBody);
    const previewNavigation = page.waitForNavigation({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Preview change', exact: true }).click();
    await previewNavigation;

    const preview = await authority(page);
    assert.equal(preview.previewActive, 'true');
    assert.equal(preview.persisted, 'true');
    assert.notEqual(preview.previewDigest, preview.acceptedDigest);
    assert.equal(sha256(fs.readFileSync(created.sourceFile)), openingSourceSha256);
    assert.match(await rendererHeroBody(page), new RegExp(targetBody));
    const previewEvidence = await stateEvidence(page, spec.starter + '/preview');
    const previewScreenshot = await capture(page, spec.starter, 'preview-no-write');

    const applyNavigation = page.waitForNavigation({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Apply to draft', exact: true }).click();
    await applyNavigation;
    const applied = await authority(page);
    assert.equal(applied.previewActive, 'false');
    assert.equal(applied.persisted, 'false');
    assert.notEqual(applied.acceptedDigest, openingDigest);
    assert.equal(sha256(fs.readFileSync(created.sourceFile)), openingSourceSha256);
    assert.match(await rendererHeroBody(page), new RegExp(targetBody));
    const appliedEvidence = await stateEvidence(page, spec.starter + '/applied');
    const appliedScreenshot = await capture(page, spec.starter, 'applied-unsaved');

    const saveNavigation = page.waitForNavigation({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Save workspace checkpoint', exact: true }).click();
    await saveNavigation;
    const saved = await authority(page);
    assert.equal(saved.persisted, 'true');
    assert.equal(saved.persistedDigest, saved.acceptedDigest);
    assert.equal(fs.existsSync(path.join(workspaceDirectory, 'venue-source.json')), false);
    const savedSource = loadV2DeploymentAgnosticVenueSourceFile(created.sourceFile);
    assert.equal(
      deriveV2DeploymentAgnosticVenueSourceDigest(savedSource),
      saved.acceptedDigest,
    );
    assert.notEqual(sha256(fs.readFileSync(created.sourceFile)), openingSourceSha256);
    assert.match(await rendererHeroBody(page), new RegExp(targetBody));
    const savedEvidence = await stateEvidence(page, spec.starter + '/saved');
    const savedScreenshot = await capture(page, spec.starter, 'saved');

    await runtime.close();
    runtime = null;
    reopenedRuntime = await startV2TurnkeyStudio({ workspaceDirectory, port: 0 });
    const reopenedUrl = reopenedRuntime.url + '?' + new URLSearchParams({
      nodeId: 'component:home-hero',
      fieldId: 'body',
      viewport: spec.previewViewport,
    }).toString();
    await page.goto(reopenedUrl, { waitUntil: 'networkidle' });
    const reopened = await authority(page);
    assert.equal(reopened.persisted, 'true');
    assert.equal(reopened.acceptedDigest, saved.acceptedDigest);
    assert.equal(reopened.persistedDigest, saved.acceptedDigest);
    assert.match(await rendererHeroBody(page), new RegExp(targetBody));
    const reopenedSource = loadV2DeploymentAgnosticVenueSourceFile(created.sourceFile);
    assert.equal(
      serializeV2DeploymentAgnosticVenueSource(reopenedSource),
      serializeV2DeploymentAgnosticVenueSource(savedSource),
    );
    assert.equal(reopenedRuntime.diagnostics().hiveRpcAttempts, 0);
    assert.equal(reopenedRuntime.diagnostics().hiveWrites, 0);
    const reopenedEvidence = await stateEvidence(page, spec.starter + '/reopened');
    const reopenedScreenshot = await capture(page, spec.starter, 'reopened');

    return {
      starter: spec.starter,
      displayName: spec.displayName,
      viewport: spec.viewport,
      previewViewport: spec.previewViewport,
      cliOutput,
      openingDigest,
      savedDigest: saved.acceptedDigest,
      sourceFilename: path.basename(created.sourceFile),
      v1SourceAbsent: true,
      disabledCapabilities:
        openingSource.capabilities.community.state === 'disabled'
        && openingSource.capabilities.transaction.state === 'disabled',
      previewNonPersistent: preview.previewActive === 'true'
        && sha256(openingSourceBytes) === openingSourceSha256,
      applyNonPersistent: applied.persisted === 'false',
      saveProof: saved.persisted === 'true',
      reopenProof: reopened.acceptedDigest === saved.acceptedDigest,
      runtimeWired: reopened.runtimeWired,
      diagnostics: reopenedRuntime.diagnostics(),
      evidence: {
        opening: openingEvidence,
        preview: previewEvidence,
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
    };
  } finally {
    await page.close();
    await context.close();
    if (runtime) await runtime.close();
    if (reopenedRuntime) await reopenedRuntime.close();
    fs.rmSync(parent, { recursive: true, force: true });
  }
}

async function main() {
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(SCREENSHOTS, { recursive: true });

  const browser = await chromium.launch();
  const journeys = [];
  try {
    for (const spec of CASES) journeys.push(await runCase(browser, spec));
  } finally {
    await browser.close();
  }

  const evidenceStates = journeys.flatMap((item) => Object.values(item.evidence));
  const summary = {
    journeyCount: journeys.length,
    starterCount: new Set(journeys.map((item) => item.starter)).size,
    screenshotCount: journeys.reduce((sum, item) => sum + item.screenshots.length, 0),
    normalCreateCommandProofCount: journeys.filter((item) =>
      /npm run venue:studio:v2/.test(item.cliOutput)
    ).length,
    initialSavedProofCount: journeys.length,
    previewNonPersistentProofCount: journeys.filter((item) => item.previewNonPersistent).length,
    applyUnsavedProofCount: journeys.filter((item) => item.applyNonPersistent).length,
    saveProofCount: journeys.filter((item) => item.saveProof).length,
    restartReopenProofCount: journeys.filter((item) => item.reopenProof).length,
    v1SourceAbsentProofCount: journeys.filter((item) => item.v1SourceAbsent).length,
    disabledCapabilityProofCount: journeys.filter((item) => item.disabledCapabilities).length,
    productionRuntimeWiredCount: journeys.filter((item) => item.runtimeWired === 'true').length,
    blockingAccessibilityFindings: evidenceStates.reduce(
      (sum, item) => sum + item.accessibility.blocking.length,
      0,
    ),
    horizontalOverflowFindings: evidenceStates.filter((item) => (
      item.geometry.outer.scrollWidth - item.geometry.outer.clientWidth > 1
      || item.geometry.preview.scrollWidth - item.geometry.preview.clientWidth > 1
    )).length,
    hiveRpcAttempts: journeys.reduce((sum, item) => sum + item.diagnostics.hiveRpcAttempts, 0),
    hiveWrites: journeys.reduce((sum, item) => sum + item.diagnostics.hiveWrites, 0),
  };

  assert.deepEqual(summary, {
    journeyCount: 3,
    starterCount: 3,
    screenshotCount: 15,
    normalCreateCommandProofCount: 3,
    initialSavedProofCount: 3,
    previewNonPersistentProofCount: 3,
    applyUnsavedProofCount: 3,
    saveProofCount: 3,
    restartReopenProofCount: 3,
    v1SourceAbsentProofCount: 3,
    disabledCapabilityProofCount: 3,
    productionRuntimeWiredCount: 0,
    blockingAccessibilityFindings: 0,
    horizontalOverflowFindings: 0,
    hiveRpcAttempts: 0,
    hiveWrites: 0,
  });

  fs.writeFileSync(
    path.join(OUTPUT, 'manifest.json'),
    JSON.stringify({
      kind: 'hivenues-pm3-fresh-v2-bootstrap-visual-evidence',
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      summary,
      journeys,
    }, null, 2) + '\n',
  );
  console.log('PM3_FRESH_V2_BOOTSTRAP_VISUAL_EVIDENCE', JSON.stringify(summary));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
