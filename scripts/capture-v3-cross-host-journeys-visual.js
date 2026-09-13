#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const axe = require('axe-core');
const { chromium } = require('playwright');
const {
  deriveV3DeploymentAgnosticVenueSourceDigest,
  serializeV3DeploymentAgnosticVenueSource,
} = require('../src/venue/v3/source');
const {
  loadV3DeploymentAgnosticVenueSourceFile,
} = require('../src/venue/v3/source-file');
const {
  createReferenceV3AuthoringStudioFixture,
} = require('../test/support/v3-authoring-studio-fixture');
const {
  closeServer,
  listenLoopback,
  sha256,
} = require('./support/visual-harness');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.resolve(ROOT, process.env.V3_S4_REVIEW_ROOT || 'artifacts/v3-s4-cross-host-review');
const SCREENSHOTS = path.join(OUTPUT, 'screenshots');
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);
const CASES = Object.freeze([
  {
    referenceId: 'migratedPhysical',
    title: 'S4 Physical Host Journey',
    actionRole: 'TICKETS',
    actionLabel: 'Tickets for this show',
    actionHref: 'https://tickets.example/s4-physical',
    viewport: { width: 1440, height: 1000 },
  },
  {
    referenceId: 'nativeCreator',
    title: 'S4 Creator Journey',
    actionRole: 'WATCH',
    actionLabel: 'Watch the creator live',
    actionHref: 'https://watch.example/s4-creator',
    viewport: { width: 1280, height: 900 },
    presence: {
      label: 'Watch the live session',
      href: 'https://stream.example/s4-creator',
    },
  },
  {
    referenceId: 'nativeRelease',
    title: 'S4 Afterglow Release',
    actionRole: 'LISTEN',
    actionLabel: 'Listen to Afterglow',
    actionHref: 'https://listen.example/s4-afterglow',
    viewport: { width: 390, height: 844 },
  },
]);

function canonical(source) {
  return serializeV3DeploymentAgnosticVenueSource(source);
}

function selectedActivity(fixture) {
  if (fixture.referenceId === 'migratedPhysical') {
    return fixture.source.resources.activities.find((activity) => activity.publicActions.length > 0)
      || fixture.source.resources.activities[0];
  }
  return fixture.source.resources.activities[0];
}

function screenshotRecord(filename) {
  const bytes = fs.readFileSync(filename);
  return {
    file: path.relative(OUTPUT, filename).replaceAll(path.sep, '/'),
    sha256: sha256(bytes),
    bytes: bytes.length,
  };
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
  assert.ok(previewFrame, `${label}: generated preview frame missing`);
  const preview = await runAxe(previewFrame);
  const blocking = [...outer, ...preview].filter((finding) => BLOCKING_IMPACTS.has(finding.impact));
  assert.deepEqual(blocking, [], `${label}: blocking accessibility findings\n${JSON.stringify(blocking, null, 2)}`);
  return { outer, preview, blocking };
}

async function geometry(page, label) {
  const outer = await page.evaluate(() => {
    const root = globalThis.document.documentElement;
    const targets = [...globalThis.document.querySelectorAll('a,button,input,select,textarea')]
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
  const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
  assert.ok(frame, `${label}: preview frame missing`);
  const preview = await frame.evaluate(() => ({
    clientWidth: globalThis.document.documentElement.clientWidth,
    scrollWidth: globalThis.document.documentElement.scrollWidth,
    mainCount: globalThis.document.querySelectorAll('main').length,
  }));
  assert.ok(outer.scrollWidth - outer.clientWidth <= 1, `${label}: Studio horizontal overflow ${JSON.stringify(outer)}`);
  assert.ok(preview.scrollWidth - preview.clientWidth <= 1, `${label}: generated preview horizontal overflow ${JSON.stringify(preview)}`);
  assert.equal(outer.mainCount, 1, `${label}: expected one Studio main landmark`);
  assert.equal(outer.iframeCount, 1, `${label}: expected one renderer iframe`);
  assert.equal(preview.mainCount, 1, `${label}: expected one generated main landmark`);
  assert.ok(outer.minimumTargetHeight === null || outer.minimumTargetHeight >= 43.5, `${label}: target below 44px convention ${JSON.stringify(outer)}`);
  return { outer, preview };
}

async function authority(page) {
  return page.locator('main.v3-studio').evaluate((element) => ({
    acceptedDigest: element.dataset.acceptedDigest,
    previewDigest: element.dataset.previewDigest,
    previewActive: element.dataset.previewActive,
    persistent: element.dataset.studioPersistent,
    runtimeWired: element.dataset.studioRuntimeWired,
    externalEffects: element.dataset.externalEffects,
  }));
}

async function previewFrame(page) {
  const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
  assert.ok(frame, 'generated preview frame missing');
  await frame.waitForLoadState('networkidle');
  return frame;
}

async function previewBody(page) {
  return (await previewFrame(page)).locator('body').textContent();
}

async function navigateByButton(page, name) {
  const navigation = page.waitForNavigation({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name, exact: true }).click();
  await navigation;
}

async function submitScoped(page, action, buttonName) {
  const form = page.locator(`form[action="${action}"]`).last();
  const navigation = page.waitForNavigation({ waitUntil: 'networkidle' });
  await form.getByRole('button', { name: buttonName, exact: true }).click();
  await navigation;
}

async function fillTitle(page, value) {
  const form = page.locator('form[action="/v3-studio/text"]').filter({ has: page.locator('input[name="field"][value="title"]') });
  const title = form.locator('input[name="value"]');
  await title.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.type(value);
  const navigation = page.waitForNavigation({ waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await navigation;
}

async function addAction(page, spec) {
  const form = page.locator('form[action="/v3-studio/action-add"]');
  await form.locator('select[name="role"]').selectOption(spec.actionRole);
  await form.locator('input[name="label"]').fill(spec.actionLabel);
  await form.locator('input[name="href"]').fill(spec.actionHref);
  await submitScoped(page, '/v3-studio/action-add', 'Preview new action');
  await navigateByButton(page, 'Apply to draft');
}

async function editPresence(page, spec) {
  if (!spec.presence) return;
  const form = page.locator('form[action="/v3-studio/presence"]');
  await form.locator('input[name="destinationLabel"]').fill(spec.presence.label);
  await form.locator('input[name="destinationHref"]').fill(spec.presence.href);
  await submitScoped(page, '/v3-studio/presence', 'Preview presence');
  await navigateByButton(page, 'Apply to draft');
}

async function addPromo(page, assetId) {
  const form = page.locator('form[action="/v3-studio/media-add"]');
  await form.locator('select[name="assetId"]').selectOption(assetId);
  await submitScoped(page, '/v3-studio/media-add', 'Preview promotional media');
  await navigateByButton(page, 'Apply to draft');
}

async function moveNewestPromoEarlier(page, assetId) {
  const row = page.locator(`[data-media-key="${assetId}:PROMO"]`);
  const navigation = page.waitForNavigation({ waitUntil: 'networkidle' });
  await row.getByRole('button', { name: 'Move earlier', exact: true }).click();
  await navigation;
  await navigateByButton(page, 'Apply to draft');
}

async function capture(page, referenceId, state) {
  const filename = path.join(SCREENSHOTS, `${referenceId}-${state}.png`);
  await page.screenshot({ path: filename, fullPage: false });
  return screenshotRecord(filename);
}

function assertZeroExternal(diagnostics, externalRequests) {
  assert.equal(externalRequests, 0);
  for (const key of [
    'hiveRpcAttempts', 'hiveWrites', 'providerWrites', 'payments', 'signingAttempts',
    'mediaUploads', 'reservationMutations', 'ticketPurchases', 'deployments',
  ]) assert.equal(diagnostics[key], 0, key);
}

async function runReference(browser, spec) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), `hivenues-v3-s4-${spec.referenceId}-`));
  const sourceFilename = path.join(workspace, 'venue-source-v3.json');
  const fixture = createReferenceV3AuthoringStudioFixture(spec.referenceId, { sourceFilename });
  const activity = selectedActivity(fixture);
  const original = canonical(fixture.session().draftSource);
  const promoAssets = fixture.source.media.assets.filter((asset) => asset.id.startsWith(`s4-${spec.referenceId.toLowerCase()}-promo-`));
  assert.equal(promoAssets.length, 2, `${spec.referenceId}: expected two S4 promo assets`);
  const server = await listenLoopback(fixture.app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: spec.viewport });
  let externalRequests = 0;
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseUrl).origin) {
      externalRequests += 1;
      await route.abort();
      return;
    }
    await route.continue();
  });

  try {
    await page.goto(`${baseUrl}/v3-studio?activityId=${encodeURIComponent(activity.id)}`, { waitUntil: 'networkidle' });
    const baseline = await authority(page);
    assert.match(baseline.acceptedDigest, /^[0-9a-f]{64}$/);
    assert.equal(baseline.previewDigest, baseline.acceptedDigest);
    assert.equal(baseline.previewActive, 'false');
    assert.equal(baseline.persistent, 'true');
    assert.equal(baseline.runtimeWired, 'false');
    assert.equal(baseline.externalEffects, 'false');
    assert.match(await previewBody(page), new RegExp(activity.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    await fillTitle(page, `${spec.title} Preview`);
    const preview = await authority(page);
    assert.equal(preview.acceptedDigest, baseline.acceptedDigest);
    assert.notEqual(preview.previewDigest, baseline.acceptedDigest);
    assert.equal(preview.previewActive, 'true');
    assert.match(await previewBody(page), new RegExp(`${spec.title} Preview`));
    const previewGeometry = await geometry(page, `${spec.referenceId}/preview`);
    const previewAccessibility = await accessibility(page, `${spec.referenceId}/preview`);
    const previewScreenshot = await capture(page, spec.referenceId, 'preview');

    await navigateByButton(page, 'Discard preview');
    const discarded = await authority(page);
    assert.equal(discarded.acceptedDigest, baseline.acceptedDigest);
    assert.equal(discarded.previewActive, 'false');
    assert.equal(canonical(fixture.session().draftSource), original);

    await fillTitle(page, spec.title);
    await navigateByButton(page, 'Apply to draft');
    await editPresence(page, spec);
    await addAction(page, spec);
    await addPromo(page, promoAssets[0].id);
    await addPromo(page, promoAssets[1].id);
    await moveNewestPromoEarlier(page, promoAssets[1].id);

    const beforeUndo = await authority(page);
    const finalActivity = fixture.session().draftSource.resources.activities.find((candidate) => candidate.id === activity.id);
    assert.equal(finalActivity.title, spec.title);
    assert.equal(finalActivity.publicActions.some((action) => action.role === spec.actionRole && action.label === spec.actionLabel), true);
    assert.deepEqual(finalActivity.managedMedia.filter((usage) => usage.role === 'PROMO').slice(-2).map((usage) => usage.assetId), [promoAssets[1].id, promoAssets[0].id]);
    if (spec.referenceId === 'migratedPhysical') {
      assert.equal(finalActivity.publicActions.some((action) => action.role === 'LEGACY_EXTERNAL'), true);
    }
    if (spec.referenceId === 'nativeCreator') {
      assert.equal(fixture.session().draftSource.venue.business, null);
      assert.equal(finalActivity.presence.kind, 'ONLINE');
      assert.equal(finalActivity.presence.destinations[0].label, spec.presence.label);
    }
    if (spec.referenceId === 'nativeRelease') {
      assert.equal(finalActivity.temporal.kind, 'RELEASE');
      assert.equal(finalActivity.presence.kind, 'NONE');
    }
    const generated = await previewBody(page);
    assert.match(generated, new RegExp(spec.title));
    assert.match(generated, new RegExp(spec.actionLabel));

    await navigateByButton(page, 'Undo');
    const undone = await authority(page);
    assert.notEqual(undone.acceptedDigest, beforeUndo.acceptedDigest);
    await navigateByButton(page, 'Redo');
    const redone = await authority(page);
    assert.equal(redone.acceptedDigest, beforeUndo.acceptedDigest);

    await navigateByButton(page, 'Save workspace');
    const persisted = fixture.persistence();
    assert.equal(persisted.persistedDigest, fixture.session().draftDigest);
    const reopened = loadV3DeploymentAgnosticVenueSourceFile(sourceFilename);
    assert.equal(deriveV3DeploymentAgnosticVenueSourceDigest(reopened), fixture.session().draftDigest);
    assert.equal(canonical(reopened), canonical(fixture.session().draftSource));

    const finalGeometry = await geometry(page, `${spec.referenceId}/final`);
    const finalAccessibility = await accessibility(page, `${spec.referenceId}/final`);
    const finalScreenshot = await capture(page, spec.referenceId, 'final');
    const diagnostics = fixture.diagnostics();
    assert.equal(diagnostics.discards, 1);
    assert.equal(diagnostics.undos, 1);
    assert.equal(diagnostics.redos, 1);
    assert.equal(diagnostics.saveRequests, 1);
    assert.equal(diagnostics.saveSuccesses, 1);
    assert.equal(diagnostics.persistentWrites, 1);
    assert.equal(diagnostics.freshReopens, 1);
    assertZeroExternal(diagnostics, externalRequests);

    return {
      referenceId: spec.referenceId,
      activityId: activity.id,
      viewport: spec.viewport,
      keyboardTitleCompletion: true,
      semantics: {
        temporalKind: finalActivity.temporal.kind,
        presenceKind: finalActivity.presence.kind,
        actionRole: spec.actionRole,
        legacyExternalPreserved: spec.referenceId === 'migratedPhysical'
          ? finalActivity.publicActions.some((action) => action.role === 'LEGACY_EXTERNAL')
          : null,
      },
      digests: {
        baseline: baseline.acceptedDigest,
        preview: preview.previewDigest,
        discarded: discarded.acceptedDigest,
        final: redone.acceptedDigest,
        persisted: persisted.persistedDigest,
      },
      previewGeometry,
      finalGeometry,
      previewAccessibility,
      finalAccessibility,
      screenshots: [previewScreenshot, finalScreenshot],
      diagnostics,
      externalRequests,
    };
  } finally {
    await page.close();
    await closeServer(server);
    fs.rmSync(workspace, { recursive: true, force: true });
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
    screenshotCount: references.reduce((sum, reference) => sum + reference.screenshots.length, 0),
    keyboardCompletionCount: references.filter((reference) => reference.keyboardTitleCompletion).length,
    blockingAccessibilityFindings: references.reduce((sum, reference) => sum + reference.previewAccessibility.blocking.length + reference.finalAccessibility.blocking.length, 0),
    horizontalOverflowFindings: references.filter((reference) => reference.previewGeometry.outer.scrollWidth - reference.previewGeometry.outer.clientWidth > 1 || reference.finalGeometry.outer.scrollWidth - reference.finalGeometry.outer.clientWidth > 1 || reference.previewGeometry.preview.scrollWidth - reference.previewGeometry.preview.clientWidth > 1 || reference.finalGeometry.preview.scrollWidth - reference.finalGeometry.preview.clientWidth > 1).length,
    externalRequests: references.reduce((sum, reference) => sum + reference.externalRequests, 0),
    hiveWrites: references.reduce((sum, reference) => sum + reference.diagnostics.hiveWrites, 0),
    providerWrites: references.reduce((sum, reference) => sum + reference.diagnostics.providerWrites, 0),
    payments: references.reduce((sum, reference) => sum + reference.diagnostics.payments, 0),
    signingAttempts: references.reduce((sum, reference) => sum + reference.diagnostics.signingAttempts, 0),
    deployments: references.reduce((sum, reference) => sum + reference.diagnostics.deployments, 0),
  };
  assert.equal(summary.referenceCount, 3);
  assert.equal(summary.keyboardCompletionCount, 3);
  assert.equal(summary.blockingAccessibilityFindings, 0);
  assert.equal(summary.horizontalOverflowFindings, 0);
  assert.equal(summary.externalRequests, 0);
  assert.equal(summary.hiveWrites, 0);
  assert.equal(summary.providerWrites, 0);
  assert.equal(summary.payments, 0);
  assert.equal(summary.signingAttempts, 0);
  assert.equal(summary.deployments, 0);

  const manifest = {
    kind: 'hivenues-v3-s4-cross-host-complete-operator-journey-evidence',
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary,
    references,
  };
  fs.writeFileSync(path.join(OUTPUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('V3_S4_CROSS_HOST_BROWSER_EVIDENCE', JSON.stringify(summary));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
