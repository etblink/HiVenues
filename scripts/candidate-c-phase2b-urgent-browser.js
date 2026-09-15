'use strict';
/* global document, window */

/**
 * Workstream E browser qualification — dependency-closed urgent website operation.
 *
 * Uses the durable file store so restart reconstruction is real, drives the
 * operator path in Chromium on desktop and at 390px, and proves in the browser:
 *  - live Release differs from the working draft, which carries unrelated edits;
 *  - review shows changed vs retained-live vs unpublished-draft state;
 *  - publishing produces a new immutable urgent Release visible on the public surface;
 *  - unrelated draft edits remain in Studio and are not live;
 *  - a second session that moved the live Release makes the first review fail closed;
 *  - restart preserves state and provenance;
 *  - no external requests, zero external-effect counters, no blocking a11y, no overflow.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');
const { FileCandidateCStore } = require('../src/candidate-c/file-store');
const { createCandidateCRouter } = require('../src/candidate-c/router');
const { diffGraphPaths } = require('../src/candidate-c/urgent');

const OUTPUT_ROOT = process.env.CANDIDATE_C_PHASE2B_URGENT_REVIEW_ROOT || path.join('artifacts', 'candidate-c-phase2b-urgent-review');
const EXACT_SHA = process.env.CANDIDATE_C_PHASE2B_EXACT_SHA || 'LOCAL_UNBOUND';
const FIXED_NOW = Date.parse('2026-09-14T23:45:00.000Z');
const SLUG = 'northline-hall';
const ACTIVITY = 'activity-northline-friday-001';

function makeApp(store) {
  const app = express();
  app.disable('x-powered-by');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('view engine', 'ejs');
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/htmx', express.static(path.dirname(require.resolve('htmx.org'))));
  app.use('/candidate-c', createCandidateCRouter({ store }));
  return app;
}

async function startServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

async function auditPage(page, axeSource, label) {
  await page.addScriptTag({ content: axeSource });
  const geometry = await page.evaluate((pageLabel) => ({
    label: pageLabel,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    incompleteImages: Array.from(document.images).filter((img) => !img.complete || img.naturalWidth === 0).length,
  }), label);
  const axe = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
    const blocking = result.violations.filter((item) => ['serious', 'critical'].includes(item.impact));
    return {
      violationCount: result.violations.length,
      blockingCount: blocking.length,
      blocking: blocking.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length })),
    };
  });
  return { geometry, accessibility: { label, ...axe } };
}

async function main() {
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const stateDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-candidate-c-urgent-browser-'));
  const statePath = path.join(stateDirectory, 'candidate-c-state.json');
  const store = new FileCandidateCStore({ statePath, now: () => FIXED_NOW });
  const server = await startServer(makeApp(store));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  const screenshots = [];
  const geometry = [];
  const accessibility = [];
  const externalRequests = [];
  const consoleErrors = [];
  const expectedConflictDiagnostics = [];
  const proof = {};

  function observe(page) {
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('about:')) externalRequests.push(url);
    });
    page.on('pageerror', (error) => consoleErrors.push({ type: 'pageerror', text: error.message }));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const text = message.text();
      if (/409|Response Status Error Code 409/i.test(text)) expectedConflictDiagnostics.push(text);
      else consoleErrors.push({ type: 'console', text });
    });
  }

  async function gotoOk(page, pathname) {
    const response = await page.goto(`${origin}${pathname}`, { waitUntil: 'networkidle' });
    assert(response && response.ok(), `${pathname} did not return 2xx`);
    return response;
  }

  async function capture(page, name, label) {
    const filename = path.join(OUTPUT_ROOT, `${name}.png`);
    await page.screenshot({ path: filename, fullPage: true });
    screenshots.push(path.basename(filename));
    const audited = await auditPage(page, axeSource, label);
    geometry.push(audited.geometry);
    accessibility.push(audited.accessibility);
  }

  async function waitRevision(page, revision) {
    await page.waitForFunction((value) => document.querySelector('#draft-status')?.dataset.revision === String(value), revision);
  }

  try {
    // ---- Precondition: live Release differs from draft; draft carries unrelated edits (made in the browser).
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    observe(desktop);
    await gotoOk(desktop, `/candidate-c/studio/${SLUG}`);
    await desktop.getByRole('button', { name: 'First impression', exact: true }).click();
    await desktop.locator('#cc-tagline').fill('Unreleased headline — stays in Studio.');
    const taglineResponse = desktop.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/tagline`) && response.request().method() === 'POST');
    await desktop.getByRole('button', { name: 'Save headline' }).click();
    assert.equal((await taglineResponse).status(), 200);
    await waitRevision(desktop, 2);
    const liveBefore = store.publicSnapshot(SLUG);
    const draftBefore = store.snapshot(SLUG);
    assert.notEqual(liveBefore.draftDigest, draftBefore.draftDigest);
    proof.liveReleaseBefore = liveBefore.liveReleaseId;
    proof.unpublishedDraftPathsBefore = diffGraphPaths(liveBefore.draft, draftBefore.draft);

    // ---- Activity inspector exposes the live status entry point.
    await desktop.getByRole('button', { name: 'Friday Night Assembly' }).click();
    await desktop.locator('[data-live-activity-status]').waitFor();
    assert.match(await desktop.locator('[data-live-activity-status]').textContent(), /Happening as planned/);
    await capture(desktop, '01-urgent-inspector-live-entry', 'urgent-inspector-live-entry');

    // ---- Compose from the live site.
    await desktop.getByRole('link', { name: 'Change the live status now' }).click();
    await desktop.waitForURL(`**/candidate-c/studio/${SLUG}/urgent?activity=${ACTIVITY}`);
    assert.match(await desktop.locator('main').textContent(), /starts from what visitors see right now/);
    await desktop.locator('#cc-urgent-note').fill('Tonight is cancelled — the power is out on the block. Refunds at the door.');
    await capture(desktop, '02-urgent-compose', 'urgent-compose');
    await desktop.getByRole('button', { name: 'Review the change' }).click();
    await desktop.waitForURL(`**/candidate-c/studio/${SLUG}/urgent/*`);
    const operationId = await desktop.locator('main').getAttribute('data-urgent-operation');
    proof.operationId = operationId;

    // ---- Review: changed vs retained-live vs unpublished-draft.
    const changedRows = await desktop.locator('[data-urgent-changed] tbody tr').evaluateAll((rows) => rows.map((row) => row.dataset.path));
    const retainedRows = await desktop.locator('[data-urgent-retained] li').evaluateAll((rows) => rows.map((row) => row.dataset.path));
    const unpublishedRows = await desktop.locator('[data-urgent-unpublished] li').evaluateAll((rows) => rows.map((row) => row.dataset.path));
    assert.deepEqual(changedRows, [`activities.${ACTIVITY}.lifecycle`, `activities.${ACTIVITY}.statusNote`]);
    assert.ok(retainedRows.includes('media.media-northline-stage-001'));
    assert.deepEqual(unpublishedRows, ['facts.tagline']);
    assert.equal(await desktop.locator('[data-urgent-closed]').getAttribute('data-urgent-closed'), 'true');
    assert.doesNotMatch(await desktop.locator('main').textContent(), /Unreleased headline — stays in Studio\./);
    proof.review = { changedRows, retainedRows, unpublishedRows };
    await capture(desktop, '03-urgent-review', 'urgent-review');

    // ---- Two-session stale live: a second session releases the whole draft first.
    const sessionB = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    observe(sessionB);
    await gotoOk(sessionB, `/candidate-c/studio/${SLUG}/release`);
    await sessionB.getByRole('button', { name: 'Publish website release' }).click();
    await sessionB.waitForURL(`**/candidate-c/studio/${SLUG}?released=*`);
    const movedLive = store.publicSnapshot(SLUG);
    assert.notEqual(movedLive.liveReleaseId, liveBefore.liveReleaseId);
    const staleResponse = desktop.waitForResponse((response) => response.url().includes(`/urgent/${operationId}/publish`) && response.request().method() === 'POST');
    await desktop.getByRole('button', { name: 'Publish urgent update' }).click();
    assert.equal((await staleResponse).status(), 409);
    await desktop.getByRole('alert').waitFor();
    assert.match(await desktop.getByRole('alert').textContent(), /live site changed while you were reviewing/);
    assert.equal(store.publicSnapshot(SLUG).draft.activities[0].lifecycle, 'scheduled');
    proof.staleLiveRejected = { previousLive: liveBefore.liveReleaseId, actualLive: movedLive.liveReleaseId, status: 409 };
    await capture(desktop, '04-urgent-stale-live-fail-closed', 'urgent-stale-live-fail-closed');

    // Session B now leaves a fresh unrelated draft edit so "unrelated draft preserved" is exercised again after the full release.
    await sessionB.getByRole('button', { name: 'First impression', exact: true }).click();
    await sessionB.locator('#cc-tagline').fill('Second unreleased headline — stays in Studio.');
    const taglineB = sessionB.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/tagline`) && response.request().method() === 'POST');
    await sessionB.getByRole('button', { name: 'Save headline' }).click();
    assert.equal((await taglineB).status(), 200);
    const liveNow = store.publicSnapshot(SLUG);
    const draftNow = store.snapshot(SLUG);
    assert.equal(liveNow.draft.facts.tagline, 'Unreleased headline — stays in Studio.');
    assert.equal(draftNow.draft.facts.tagline, 'Second unreleased headline — stays in Studio.');

    // ---- Start again from the current live site and publish.
    await desktop.getByRole('link', { name: 'Start again from the live site' }).click();
    await desktop.waitForURL(`**/candidate-c/studio/${SLUG}/urgent?activity=${ACTIVITY}`);
    await desktop.locator('#cc-urgent-note').fill('Tonight is cancelled — the power is out on the block. Refunds at the door.');
    await desktop.getByRole('button', { name: 'Review the change' }).click();
    await desktop.waitForURL(`**/candidate-c/studio/${SLUG}/urgent/*`);
    const secondOperationId = await desktop.locator('main').getAttribute('data-urgent-operation');
    assert.deepEqual(await desktop.locator('[data-urgent-unpublished] li').evaluateAll((rows) => rows.map((row) => row.dataset.path)), ['facts.tagline']);
    const publishResponse = desktop.waitForResponse((response) => response.url().includes(`/urgent/${secondOperationId}/publish`) && response.request().method() === 'POST');
    await desktop.getByRole('button', { name: 'Publish urgent update' }).click();
    assert.equal((await publishResponse).status(), 303);
    await desktop.waitForURL(`**/candidate-c/studio/${SLUG}?released=*&urgent=1`);
    await desktop.locator('[data-released-notice]').waitFor();
    assert.match(await desktop.locator('[data-released-notice]').textContent(), /Live site updated\./);
    const afterPublic = store.publicSnapshot(SLUG);
    const afterDraft = store.snapshot(SLUG);
    const urgentRelease = afterDraft.releases.find((item) => item.id === afterPublic.liveReleaseId);
    assert.equal(urgentRelease.kind, 'urgent');
    assert.equal(urgentRelease.baseReleaseId, liveNow.liveReleaseId);
    assert.equal(urgentRelease.operationId, secondOperationId);
    assert.deepEqual(diffGraphPaths(liveNow.draft, afterPublic.draft), urgentRelease.changedPaths);
    assert.equal(afterPublic.draft.facts.tagline, 'Unreleased headline — stays in Studio.');
    assert.equal(afterDraft.draft.facts.tagline, 'Second unreleased headline — stays in Studio.');
    assert.equal(afterDraft.draft.activities[0].lifecycle, 'cancelled');
    assert.match(await desktop.locator('#candidate-canvas').textContent(), /Second unreleased headline — stays in Studio\./);
    assert.equal(await desktop.locator('#candidate-canvas [data-activity-status="cancelled"]').count(), 1);
    proof.urgentRelease = {
      id: urgentRelease.id,
      baseReleaseId: urgentRelease.baseReleaseId,
      operationId: urgentRelease.operationId,
      changedPaths: urgentRelease.changedPaths,
      digest: urgentRelease.digest,
      draftRevisionAfter: afterDraft.revision,
      draftTaglineAfter: afterDraft.draft.facts.tagline,
      publicTaglineAfter: afterPublic.draft.facts.tagline,
    };
    await capture(desktop, '05-urgent-studio-after-publish', 'urgent-studio-after-publish');

    // ---- Public surface from the urgent Release.
    await gotoOk(desktop, `/candidate-c/${SLUG}`);
    assert.equal(await desktop.locator('[data-activity-status="cancelled"]').count(), 1);
    assert.match(await desktop.locator('body').textContent(), /Refunds at the door\./);
    assert.doesNotMatch(await desktop.locator('body').textContent(), /Second unreleased headline/);
    await capture(desktop, '06-urgent-public-home-cancelled', 'urgent-public-home-cancelled');
    await gotoOk(desktop, `/candidate-c/${SLUG}/activities/friday-night-assembly`);
    assert.equal(await desktop.locator('[data-rsvp-closed]').count(), 1);
    assert.equal(await desktop.locator('#cc-rsvp-name').count(), 0);
    await capture(desktop, '07-urgent-public-activity-cancelled', 'urgent-public-activity-cancelled');
    const icsResponse = await desktop.request.get(`${origin}/candidate-c/${SLUG}/activities/friday-night-assembly/calendar.ics`);
    assert.match(await icsResponse.text(), /STATUS:CANCELLED/);

    // ---- History shows the urgent provenance in operator language.
    await gotoOk(desktop, `/candidate-c/studio/${SLUG}/release`);
    assert.match(await desktop.locator('main').textContent(), /\+ urgent update · LIVE/);
    await capture(desktop, '08-urgent-history', 'urgent-history');

    // ---- Restart: a fresh store instance on the same durable state reconstructs everything.
    const restarted = new FileCandidateCStore({ statePath });
    const restartedPublic = restarted.publicSnapshot(SLUG);
    const restartedDraft = restarted.snapshot(SLUG);
    assert.equal(restartedPublic.liveReleaseId, urgentRelease.id);
    assert.equal(restartedPublic.draft.activities[0].lifecycle, 'cancelled');
    assert.equal(restartedDraft.draft.facts.tagline, 'Second unreleased headline — stays in Studio.');
    assert.equal(restarted.urgentOperation(SLUG, secondOperationId).state, 'released');
    assert.equal(restarted.urgentOperation(SLUG, operationId).state, 'review');
    proof.restart = { liveReleaseId: restartedPublic.liveReleaseId, draftRevision: restartedDraft.revision, releasedOperation: secondOperationId, abandonedOperation: operationId };

    // ---- 390px: compose + review + public cancellation.
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    observe(mobile);
    await gotoOk(mobile, `/candidate-c/studio/${SLUG}/urgent?activity=${ACTIVITY}`);
    await capture(mobile, '09-urgent-mobile-compose', 'urgent-mobile-compose');
    await gotoOk(mobile, `/candidate-c/studio/${SLUG}/urgent/${secondOperationId}`);
    await capture(mobile, '10-urgent-mobile-review-released', 'urgent-mobile-review-released');
    await gotoOk(mobile, `/candidate-c/${SLUG}/activities/friday-night-assembly`);
    await capture(mobile, '11-urgent-mobile-public-activity', 'urgent-mobile-public-activity');
    await gotoOk(mobile, `/candidate-c/studio/${SLUG}`);
    await mobile.getByRole('button', { name: 'Friday Night Assembly' }).click();
    await mobile.locator('#cc-activity-lifecycle').waitFor();
    await capture(mobile, '12-urgent-mobile-inspector-status', 'urgent-mobile-inspector-status');

    const diagnostics = store.diagnostics();
    const summary = {
      screenshotCount: screenshots.length,
      blockingAccessibilityFindings: accessibility.reduce((sum, item) => sum + item.blockingCount, 0),
      horizontalOverflowFindings: geometry.filter((item) => item.overflow).length,
      incompleteImageFindings: geometry.reduce((sum, item) => sum + item.incompleteImages, 0),
      externalRequests: externalRequests.length,
      unexpectedConsoleErrors: consoleErrors.length,
      expectedConflictDiagnostics: expectedConflictDiagnostics.length,
      hiveRpcAttempts: diagnostics.external.hiveRpcAttempts,
      hiveWrites: diagnostics.external.hiveWrites,
      providerWrites: diagnostics.external.providerWrites,
      payments: diagnostics.external.payments,
      signingAttempts: diagnostics.external.signingAttempts,
      deployments: diagnostics.external.deployments,
    };
    assert.equal(summary.blockingAccessibilityFindings, 0, JSON.stringify(accessibility.filter((item) => item.blockingCount > 0)));
    assert.equal(summary.horizontalOverflowFindings, 0, JSON.stringify(geometry.filter((item) => item.overflow)));
    assert.equal(summary.incompleteImageFindings, 0);
    assert.equal(summary.externalRequests, 0, JSON.stringify(externalRequests));
    assert.equal(summary.unexpectedConsoleErrors, 0, JSON.stringify(consoleErrors));
    assert.deepEqual(diagnostics.external, { hiveRpcAttempts: 0, hiveWrites: 0, providerWrites: 0, payments: 0, signingAttempts: 0, deployments: 0 });

    const manifest = {
      phase: 'CANDIDATE_C_PHASE2B_WORKSTREAM_E_URGENT',
      candidate: EXACT_SHA,
      generatedAt: new Date(FIXED_NOW).toISOString(),
      screenshots,
      geometry,
      accessibility,
      externalRequests,
      consoleErrors,
      expectedConflictDiagnostics,
      diagnostics,
      summary,
      proof,
      finding: 'WORKSTREAM_E_BROWSER_EVIDENCE_READY_FOR_PROJECT_LEAD_REVIEW',
    };
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(stateDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
