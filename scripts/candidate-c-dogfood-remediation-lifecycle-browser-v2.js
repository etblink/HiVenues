'use strict';
/* global document, window */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createDogfoodApp, startDogfoodServer } = require('../src/candidate-c/dogfood-app');
const { ProvisioningFileCandidateCStore } = require('../src/candidate-c/provisioning-file-store');
const {
  dismissFirstDraftReveal,
  fillGuidedCreator,
  submitFirstDraft,
} = require('./candidate-c-guided-creator-operator');

const ROOT = path.join(__dirname, '..');
const OUTPUT_ROOT = process.env.CANDIDATE_C_DOGFOOD_LIFECYCLE_ROOT || path.join(ROOT, 'artifacts', 'candidate-c-dogfood-remediation-lifecycle');
const EXACT_SHA = process.env.CANDIDATE_C_DOGFOOD_REMEDIATION_EXACT_SHA || 'LOCAL_UNBOUND';
const SLUG = 'synthetic-qualification-house';
const ACTIVITY_TITLE = 'Synthetic qualification gathering';
const UNPUBLISHED_TAGLINE = 'UNPUBLISHED SYNTHETIC DRAFT — must stay in Studio.';

async function stopServer(server) {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => server.closeAllConnections?.(), 1000);
    timer.unref?.();
    server.close((error) => {
      clearTimeout(timer);
      if (error) reject(error); else resolve();
    });
  });
}

async function auditPage(page, label, records) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const axe = await page.evaluate(async () => window.axe.run(document, { resultTypes: ['violations'] }));
  const blocking = axe.violations.filter((item) => ['serious', 'critical'].includes(item.impact));
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    incompleteImages: Array.from(document.images).filter((image) => !image.complete || image.naturalWidth === 0).length,
  }));
  records.push({
    label,
    violations: axe.violations.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length })),
    blocking: blocking.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length })),
    geometry,
  });
  assert.equal(blocking.length, 0, `${label}: blocking accessibility findings`);
  assert.equal(geometry.scrollWidth > geometry.clientWidth + 1, false, `${label}: horizontal overflow`);
  assert.equal(geometry.incompleteImages, 0, `${label}: incomplete images`);
}

async function capture(page, filename, label, evidence) {
  await auditPage(page, label, evidence.audits);
  await page.screenshot({ path: path.join(OUTPUT_ROOT, filename), fullPage: true });
  evidence.screenshots.push(filename);
}

function assertZeroEffects(store) {
  const external = store.diagnostics().external;
  assert.deepEqual(external, {
    hiveRpcAttempts: 0, hiveWrites: 0, providerWrites: 0, payments: 0, signingAttempts: 0, deployments: 0,
  });
  return external;
}

async function openCommand(page, label) {
  await page.locator('.cc-studio-commandbar summary').filter({ hasText: label }).click();
}

async function main() {
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const statePath = path.join(OUTPUT_ROOT, 'candidate-c-lifecycle-state.json');
  const mediaRoot = path.join(OUTPUT_ROOT, 'local-media');

  let store = new ProvisioningFileCandidateCStore({ statePath, mediaRoot });
  let server = await startDogfoodServer(createDogfoodApp({ store }), { port: 0 });
  let origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  let page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(25000);

  const evidence = {
    candidate: EXACT_SHA,
    fixture: { synthetic: true, purpose: 'Issue #265 browser-only add-later Activity → Release → urgent status qualification.', slug: SLUG },
    screenshots: [], audits: [], externalRequests: [], consoleErrors: [], pageErrors: [],
  };

  context.on('request', (request) => {
    try {
      const url = new URL(request.url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) evidence.externalRequests.push(request.url());
    } catch (_) {}
  });
  function observe(target) {
    target.on('console', (message) => { if (message.type() === 'error') evidence.consoleErrors.push(message.text()); });
    target.on('pageerror', (error) => evidence.pageErrors.push(error.message));
  }
  observe(page);

  try {
    await page.goto(`${origin}/candidate-c/new`, { waitUntil: 'networkidle' });
    await fillGuidedCreator(page, {
      displayName: 'Synthetic Qualification House',
      archetype: 'synthetic neighborhood venue fixture',
      tagline: 'Synthetic fixture for browser qualification.',
      purpose: 'Prove that an empty fresh host can add a real typed Activity later without inventing Fourth Street facts.',
      presenceMode: 'physical',
      presenceLabel: 'Synthetic Reno fixture · qualification only',
      address: '100 Qualification Way, Reno, NV 89501',
      contact: 'qualification@example.test',
      timezone: 'America/Los_Angeles',
      summary: 'A deliberately synthetic venue-shaped fixture used only to prove a complete add-later lifecycle.',
      presenceMaterial: 'Synthetic fixture copy. No claim about a real venue.',
      direction: 'hospitality',
      participation: 'Qualification-only visitor copy.',
    });
    assert.equal(await page.locator('[name="activityTitle"]').inputValue(), '');
    await Promise.all([
      page.waitForURL((url) => url.pathname === `/candidate-c/studio/${SLUG}`),
      submitFirstDraft(page),
    ]);
    await dismissFirstDraftReveal(page);
    assert.equal(store.snapshot(SLUG).draft.activities.length, 0);
    assert.equal(store.snapshot(SLUG).draft.offers.length, 0);
    await capture(page, '01-synthetic-created-empty.png', 'synthetic-created-empty', evidence);

    await openCommand(page, 'Activities');
    await page.getByRole('link', { name: '+ Add activity', exact: true }).click();
    await page.locator('#cc-new-activity-title').fill(ACTIVITY_TITLE);
    await page.locator('#cc-new-activity-description').fill('Synthetic browser qualification activity. It exists only in this test fixture.');
    await page.locator('#cc-new-activity-start').fill('2026-10-10T18:00');
    await page.locator('#cc-new-activity-end').fill('2026-10-10T20:00');
    await Promise.all([
      page.waitForURL((url) => url.pathname === `/candidate-c/studio/${SLUG}`),
      page.getByRole('button', { name: 'Add activity to draft' }).click(),
    ]);
    const activity = store.snapshot(SLUG).draft.activities[0];
    assert(activity);
    assert.equal(activity.title, ACTIVITY_TITLE);
    assert.equal(store.publicSnapshot(SLUG).draft.activities.length, 0, 'draft Activity became live without a Release');
    await capture(page, '02-synthetic-added-activity-draft.png', 'synthetic-added-activity-draft', evidence);

    await page.getByRole('link', { name: 'Release', exact: true }).click();
    await Promise.all([
      page.waitForURL((url) => url.pathname === `/candidate-c/studio/${SLUG}` && Boolean(url.searchParams.get('released'))),
      page.getByRole('button', { name: 'Publish website release' }).click(),
    ]);
    const fullReleasePublic = store.publicSnapshot(SLUG);
    const fullReleaseId = fullReleasePublic.liveReleaseId;
    assert.equal(fullReleasePublic.draft.activities.length, 1);
    assert.equal(fullReleasePublic.draft.activities[0].id, activity.id);
    assert.equal(fullReleasePublic.draft.activities[0].lifecycle, 'scheduled');

    await page.goto(`${origin}/candidate-c/${SLUG}`, { waitUntil: 'networkidle' });
    assert.match(await page.locator('body').textContent(), /Synthetic qualification gathering/);
    await capture(page, '03-synthetic-released-activity-public.png', 'synthetic-released-activity-public', evidence);

    await page.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });
    await openCommand(page, 'Page');
    await page.getByRole('button', { name: 'First impression', exact: true }).click();
    await page.locator('#cc-tagline').fill(UNPUBLISHED_TAGLINE);
    const headlineResponse = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/tagline`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save headline' }).click();
    assert.equal((await headlineResponse).status(), 200);
    assert.equal(store.snapshot(SLUG).draft.facts.tagline, UNPUBLISHED_TAGLINE);
    assert.notEqual(store.publicSnapshot(SLUG).draft.facts.tagline, UNPUBLISHED_TAGLINE);

    await page.keyboard.press('Escape');
    await openCommand(page, 'Activities');
    await page.getByRole('button', { name: ACTIVITY_TITLE, exact: true }).click();
    await page.getByRole('link', { name: 'Change the live status now' }).click();
    await page.waitForURL((url) => url.pathname === `/candidate-c/studio/${SLUG}/urgent` && url.searchParams.get('activity') === activity.id);
    await page.locator('input[name="lifecycle"][value="cancelled"]').check();
    await page.locator('#cc-urgent-note').fill('Synthetic qualification cancellation — browser evidence only.');
    await page.getByRole('button', { name: 'Review the change' }).click();
    await page.waitForURL((url) => url.pathname.startsWith(`/candidate-c/studio/${SLUG}/urgent/`));
    const operationId = await page.locator('main[data-urgent-operation]').getAttribute('data-urgent-operation');
    assert(operationId);
    const unpublishedPaths = await page.locator('[data-urgent-unpublished] li').evaluateAll((rows) => rows.map((row) => row.dataset.path));
    assert.deepEqual(unpublishedPaths, ['facts.tagline']);
    assert.equal(await page.locator('[data-urgent-closed]').getAttribute('data-urgent-closed'), 'true');
    await capture(page, '04-synthetic-urgent-review-with-unpublished-draft.png', 'synthetic-urgent-review-with-unpublished-draft', evidence);

    const urgentResponse = page.waitForResponse((response) => response.url().includes(`/candidate-c/studio/${SLUG}/urgent/${operationId}/publish`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Publish urgent update' }).click();
    assert.equal((await urgentResponse).status(), 303);
    await page.waitForURL((url) => url.pathname === `/candidate-c/studio/${SLUG}` && url.searchParams.get('urgent') === '1');

    const afterUrgentPublic = store.publicSnapshot(SLUG);
    const afterUrgentDraft = store.snapshot(SLUG);
    const urgentRelease = afterUrgentDraft.releases.find((item) => item.id === afterUrgentPublic.liveReleaseId);
    assert(urgentRelease);
    assert.equal(urgentRelease.kind, 'urgent');
    assert.equal(urgentRelease.baseReleaseId, fullReleaseId);
    assert.equal(urgentRelease.operationId, operationId);
    assert.deepEqual([...urgentRelease.changedPaths].sort(), [
      `activities.${activity.id}.lifecycle`,
      `activities.${activity.id}.statusNote`,
    ].sort());
    assert.equal(afterUrgentPublic.draft.activities[0].lifecycle, 'cancelled');
    assert.equal(afterUrgentDraft.draft.activities[0].lifecycle, 'cancelled');
    assert.equal(afterUrgentDraft.draft.facts.tagline, UNPUBLISHED_TAGLINE);
    assert.equal(afterUrgentPublic.draft.facts.tagline, fullReleasePublic.draft.facts.tagline);
    assert.notEqual(afterUrgentPublic.draft.facts.tagline, UNPUBLISHED_TAGLINE);
    await capture(page, '05-synthetic-studio-after-urgent.png', 'synthetic-studio-after-urgent', evidence);

    await page.goto(`${origin}/candidate-c/${SLUG}`, { waitUntil: 'networkidle' });
    assert.match(await page.locator('body').textContent(), /Synthetic qualification cancellation/);
    assert.doesNotMatch(await page.locator('body').textContent(), /UNPUBLISHED SYNTHETIC DRAFT/);
    await capture(page, '06-synthetic-public-after-urgent.png', 'synthetic-public-after-urgent', evidence);

    await page.close();
    await stopServer(server);
    store = new ProvisioningFileCandidateCStore({ statePath, mediaRoot });
    server = await startDogfoodServer(createDogfoodApp({ store }), { port: 0 });
    origin = `http://127.0.0.1:${server.address().port}`;
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(25000);
    observe(page);
    await page.goto(`${origin}/candidate-c/${SLUG}`, { waitUntil: 'networkidle' });
    assert.match(await page.locator('body').textContent(), /Synthetic qualification cancellation/);
    assert.doesNotMatch(await page.locator('body').textContent(), /UNPUBLISHED SYNTHETIC DRAFT/);
    assert.equal(store.snapshot(SLUG).draft.facts.tagline, UNPUBLISHED_TAGLINE);
    assert.equal(store.publicSnapshot(SLUG).draft.activities[0].lifecycle, 'cancelled');
    await capture(page, '07-synthetic-restart-public.png', 'synthetic-restart-public', evidence);

    const external = assertZeroEffects(store);
    assert.equal(evidence.externalRequests.length, 0, `external requests: ${JSON.stringify(evidence.externalRequests)}`);
    assert.equal(evidence.consoleErrors.length, 0, `console errors: ${JSON.stringify(evidence.consoleErrors)}`);
    assert.equal(evidence.pageErrors.length, 0, `page errors: ${JSON.stringify(evidence.pageErrors)}`);

    evidence.proof = {
      initialActivityCount: 0,
      createdActivityId: activity.id,
      createdActivityTitle: activity.title,
      fullReleaseId,
      urgentOperationId: operationId,
      urgentReleaseId: urgentRelease.id,
      urgentChangedPaths: urgentRelease.changedPaths,
      unpublishedDraftPathsAtReview: unpublishedPaths,
      unpublishedDraftPreservedAfterUrgent: afterUrgentDraft.draft.facts.tagline === UNPUBLISHED_TAGLINE,
      unpublishedDraftAbsentFromLive: afterUrgentPublic.draft.facts.tagline !== UNPUBLISHED_TAGLINE,
      restartPersisted: true,
      external,
    };
    evidence.summary = {
      screenshotCount: evidence.screenshots.length,
      blockingAccessibilityFindings: evidence.audits.reduce((sum, item) => sum + item.blocking.length, 0),
      horizontalOverflowFindings: evidence.audits.filter((item) => item.geometry.scrollWidth > item.geometry.clientWidth + 1).length,
      incompleteImageFindings: evidence.audits.reduce((sum, item) => sum + item.geometry.incompleteImages, 0),
      externalRequests: evidence.externalRequests.length,
      unexpectedConsoleErrors: evidence.consoleErrors.length + evidence.pageErrors.length,
    };
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  } finally {
    await browser.close();
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
