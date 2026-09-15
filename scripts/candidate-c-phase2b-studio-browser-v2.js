'use strict';
/* global document, window */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');
const { CandidateCStore } = require('../src/candidate-c/store');
const { createCandidateCRouter } = require('../src/candidate-c/router');

const OUTPUT_ROOT = process.env.CANDIDATE_C_PHASE2B_STUDIO_REVIEW_ROOT || path.join('artifacts', 'candidate-c-phase2b-studio-review');
const EXACT_SHA = process.env.CANDIDATE_C_PHASE2B_EXACT_SHA || 'LOCAL_UNBOUND';
const FIXED_NOW = Date.parse('2026-09-14T23:45:00.000Z');
const SLUG = 'harbor-and-hearth';

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
    return { violationCount: result.violations.length, blockingCount: blocking.length, blocking: blocking.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length })) };
  });
  return { geometry, accessibility: { label, ...axe } };
}

async function main() {
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const store = new CandidateCStore({ now: () => FIXED_NOW });
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

  async function openMenu(page, label) {
    await page.locator('.cc-studio-commandbar summary').filter({ hasText: label }).click();
  }

  async function openButton(page, menu, name) {
    await openMenu(page, menu);
    await page.getByRole('button', { name, exact: true }).click();
    await page.locator('#candidate-inspector[data-open="true"]').waitFor();
  }

  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    observe(desktop);
    await gotoOk(desktop, `/candidate-c/studio/${SLUG}`);
    const shell = await desktop.locator('.cc-studio-shell').textContent();
    assert.match(shell, /Offers[\s\S]*Look[\s\S]*Voice[\s\S]*Participation/);
    assert.equal(await desktop.locator('.cc-studio-rail').count(), 0);
    assert.equal(await desktop.locator('#cc-full-preview-frame').count(), 0);
    assert.equal(await desktop.locator('.cc-studio-stage').count(), 1);
    assert.doesNotMatch(shell, /Real rendered canvas|canonical object|server revision/i);
    await capture(desktop, '01-studio-d-baseline', 'studio-d-baseline');

    await openButton(desktop, 'Offers', 'Coal-roasted carrots');
    assert.match(await desktop.locator('input[name="expectedDraftDigest"]').first().inputValue(), /^[a-f0-9]{64}$/);
    await desktop.locator('#cc-offer-title').fill('Coal-roasted carrots · ember glaze');
    await desktop.locator('#cc-offer-price').fill('$17');
    const offerResponse = desktop.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/offer`) && response.request().method() === 'POST');
    await desktop.getByRole('button', { name: 'Save offer' }).click();
    assert.equal((await offerResponse).status(), 200);
    await waitRevision(desktop, 2);
    assert.match(await desktop.locator('#candidate-canvas').textContent(), /Coal-roasted carrots · ember glaze/);
    assert.equal(store.snapshot(SLUG).draft.offers[0].price, '$17');
    await capture(desktop, '02-studio-d-offer', 'studio-d-offer');

    await desktop.keyboard.press('Escape');
    await openButton(desktop, 'Site', 'Look');
    await desktop.locator('#cc-look-accent').selectOption('#244653');
    const lookResponse = desktop.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/look`) && response.request().method() === 'POST');
    await desktop.getByRole('button', { name: 'Save look' }).click();
    assert.equal((await lookResponse).status(), 200);
    await waitRevision(desktop, 3);
    assert.equal(store.snapshot(SLUG).draft.presentation.accent, '#244653');
    assert.equal(await desktop.locator('#candidate-canvas').evaluate((node) => window.getComputedStyle(node).borderTopColor), 'rgb(36, 70, 83)');
    await capture(desktop, '03-studio-d-look', 'studio-d-look');

    await desktop.keyboard.press('Escape');
    await openButton(desktop, 'Site', 'Voice');
    await desktop.locator('#candidate-inspector').getByText('Save a seat', { exact: true }).waitFor();
    await desktop.locator('#candidate-inspector').getByRole('button', { name: 'Edit', exact: true }).first().click();
    await desktop.locator('#cc-voice-term').fill('Keep me a seat');
    const voiceResponse = desktop.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/voice`) && response.request().method() === 'POST');
    await desktop.getByRole('button', { name: 'Save wording' }).click();
    assert.equal((await voiceResponse).status(), 200);
    await waitRevision(desktop, 4);
    assert.equal(store.snapshot(SLUG).draft.voice.terms.rsvp_local, 'Keep me a seat');
    await capture(desktop, '04-studio-d-voice', 'studio-d-voice');

    await desktop.keyboard.press('Escape');
    await openButton(desktop, 'Site', 'Participation');
    await desktop.locator('#cc-contact').fill('tables@harborandhearth.example');
    const bindingsBefore = structuredClone(store.snapshot(SLUG).draft.bindings);
    const connectResponse = desktop.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/connect`) && response.request().method() === 'POST');
    await desktop.getByRole('button', { name: 'Save contact' }).click();
    assert.equal((await connectResponse).status(), 200);
    await waitRevision(desktop, 5);
    assert.equal(store.snapshot(SLUG).draft.facts.contact, 'tables@harborandhearth.example');
    assert.deepEqual(store.snapshot(SLUG).draft.bindings, bindingsBefore);
    await capture(desktop, '05-studio-d-participation', 'studio-d-participation');

    await desktop.keyboard.press('Escape');
    await openButton(desktop, 'Site', 'Look');
    const stale = store.snapshot(SLUG);
    assert.equal(store.editTagline(SLUG, 'Dinner follows the tide — tonight.', stale.revision, stale.draftDigest).ok, true);
    const staleResponse = desktop.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/look`) && response.request().method() === 'POST');
    await desktop.getByRole('button', { name: 'Save look' }).click();
    assert.equal((await staleResponse).status(), 409);
    assert.match(await desktop.locator('#candidate-inspector').textContent(), /newer version/i);

    const releaseCandidate = store.snapshot(SLUG);
    assert.equal(store.createRelease(SLUG, releaseCandidate.revision, releaseCandidate.draftDigest).ok, true);
    await gotoOk(desktop, `/candidate-c/${SLUG}`);
    assert.match(await desktop.locator('body').textContent(), /Coal-roasted carrots · ember glaze/);
    assert.match(await desktop.locator('body').textContent(), /tables@harborandhearth\.example/);
    await capture(desktop, '06-studio-d-released-public', 'studio-d-released-public');

    await gotoOk(desktop, `/candidate-c/${SLUG}/activities/sunday-harvest-table`);
    assert.equal(await desktop.getByRole('button', { name: 'Keep me a seat' }).count(), 1);

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    observe(mobile);
    await gotoOk(mobile, `/candidate-c/studio/${SLUG}`);
    await openButton(mobile, 'Site', 'Participation');
    await mobile.locator('#cc-contact').waitFor();
    await capture(mobile, '07-studio-d-mobile-participation', 'studio-d-mobile-participation');

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
    assert.equal(summary.expectedConflictDiagnostics, 1, JSON.stringify(expectedConflictDiagnostics));
    assert.deepEqual(diagnostics.external, { hiveRpcAttempts: 0, hiveWrites: 0, providerWrites: 0, payments: 0, signingAttempts: 0, deployments: 0 });

    fs.writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify({
      phase: 'CANDIDATE_C_PHASE2B_STUDIO_D',
      candidate: EXACT_SHA,
      generatedAt: new Date(FIXED_NOW).toISOString(),
      screenshots, geometry, accessibility, externalRequests, consoleErrors, expectedConflictDiagnostics, diagnostics, summary,
      proof: {
        offer: store.snapshot(SLUG).draft.offers[0].title,
        accent: store.snapshot(SLUG).draft.presentation.accent,
        voice: store.snapshot(SLUG).draft.voice.terms.rsvp_local,
        contact: store.snapshot(SLUG).draft.facts.contact,
      },
      finding: 'WORKSTREAM_D_BROWSER_EVIDENCE_READY_FOR_PROJECT_LEAD_VISUAL_REVIEW',
    }, null, 2)}\n`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
