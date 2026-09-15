'use strict';
/* global document, window */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
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

const OUTPUT_ROOT = process.env.CANDIDATE_C_PRE_DOGFOOD_REVIEW_ROOT || path.join('artifacts', 'candidate-c-pre-dogfood-review');
const EXACT_SHA = process.env.CANDIDATE_C_PRE_DOGFOOD_EXACT_SHA || 'LOCAL_UNBOUND';
const ACCESS_SECRET = 'qualification-only-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function stopServer(target) {
  if (!target?.listening) return;
  await new Promise((resolve, reject) => {
    const forceTimer = setTimeout(() => target.closeAllConnections?.(), 1000);
    forceTimer.unref?.();
    target.close((error) => {
      clearTimeout(forceTimer);
      if (error) reject(error); else resolve();
    });
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
  const statePath = path.join(OUTPUT_ROOT, 'candidate-c-state.json');
  const screenshots = [];
  const geometry = [];
  const accessibility = [];
  const externalRequests = [];
  const consoleErrors = [];
  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

  let store = new ProvisioningFileCandidateCStore({ statePath });
  let app = createDogfoodApp({ store, publicIngress: true, accessSecret: ACCESS_SECRET, secureCookie: false });
  let server = await startDogfoodServer(app, { port: 0 });
  let origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  let page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);

  function observe(target) {
    target.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('about:')) externalRequests.push(url);
    });
    target.on('pageerror', (error) => consoleErrors.push({ type: 'pageerror', text: error.message }));
    target.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push({ type: 'console', text: message.text() });
    });
  }

  async function capture(target, name, label) {
    const filePath = path.join(OUTPUT_ROOT, `${name}.png`);
    await target.screenshot({ path: filePath, fullPage: true });
    screenshots.push(path.basename(filePath));
    const audited = await auditPage(target, axeSource, label);
    geometry.push(audited.geometry);
    accessibility.push(audited.accessibility);
  }

  async function login(target) {
    await target.goto(`${origin}/candidate-c`, { waitUntil: 'networkidle' });
    assert.equal(new URL(target.url()).pathname, '/__dogfood/access');
    await target.locator('input[name="accessSecret"]').fill(ACCESS_SECRET);
    await Promise.all([
      target.waitForURL((url) => url.pathname === '/candidate-c'),
      target.getByRole('button', { name: 'Open dogfood Studio' }).click(),
    ]);
  }

  observe(page);

  try {
    await page.goto(`${origin}/candidate-c`, { waitUntil: 'networkidle' });
    assert.equal(new URL(page.url()).pathname, '/__dogfood/access');
    await capture(page, '01-access-gate', 'access-gate');

    await page.locator('input[name="accessSecret"]').fill(ACCESS_SECRET);
    await Promise.all([
      page.waitForURL((url) => url.pathname === '/candidate-c'),
      page.getByRole('button', { name: 'Open dogfood Studio' }).click(),
    ]);
    await page.getByRole('link', { name: 'Create a place' }).click();
    await page.waitForURL((url) => url.pathname === '/candidate-c/new');
    await capture(page, '02-guided-purpose', 'guided-purpose');

    await fillGuidedCreator(page, {
      displayName: 'Dogfood House',
      archetype: 'neighborhood gathering place',
      tagline: 'A real place for a real night.',
      purpose: 'Give people a trustworthy front door for this place and its next gathering.',
      presenceMode: 'physical',
      presenceLabel: 'Downtown Las Vegas · doors at 7 PM',
      address: '123 Example Street, Las Vegas, NV',
      contact: 'hello@dogfood.example',
      timezone: 'America/Los_Angeles',
      summary: 'A bounded browser-created host proving fresh-host admission without source editing.',
      presenceMaterial: 'Warm light, close tables, neighborhood scale, direct language.',
      direction: 'hospitality',
      participation: 'See what is happening, save a place, and keep the date.',
      activity: {
        title: 'Friday Gathering',
        description: 'A scheduled gathering entered entirely through the operator form.',
        startsLocal: '2026-09-18T19:30',
        endsLocal: '2026-09-18T22:30',
      },
    });
    await Promise.all([
      page.waitForURL((url) => url.pathname === '/candidate-c/studio/dogfood-house'),
      submitFirstDraft(page),
    ]);
    assert.match(await page.locator('body').textContent(), /Here is your place\./);
    await capture(page, '03-first-draft-reveal', 'first-draft-reveal');
    await dismissFirstDraftReveal(page);
    assert.match(await page.locator('body').textContent(), /Dogfood House/);
    assert.equal(await page.locator('.cc-studio-commandbar').count(), 1);
    await capture(page, '04-created-studio', 'created-studio');

    const activityId = store.snapshot('dogfood-house').draft.activities[0].id;
    await page.goto(`${origin}/candidate-c/dogfood-house`, { waitUntil: 'networkidle' });
    const freshPublicText = await page.locator('body').textContent();
    assert.match(freshPublicText, /Friday Gathering/);
    assert.doesNotMatch(freshPublicText, /Harbor & Hearth|Northline|Nova Ashby|Sunday supper|Sunday table|harbor change color/i);
    await capture(page, '05-created-public', 'created-public');

    await page.goto(`${origin}/candidate-c/studio/dogfood-house/urgent?activity=${encodeURIComponent(activityId)}`, { waitUntil: 'networkidle' });
    await page.locator('textarea[name="statusNote"]').fill('Cancelled for the browser qualification proof.');
    await Promise.all([
      page.waitForURL((url) => /\/candidate-c\/studio\/dogfood-house\/urgent\//.test(url.pathname)),
      page.getByRole('button', { name: 'Review the change' }).click(),
    ]);
    assert.equal(await page.locator('[data-urgent-closed="true"]').count(), 1);
    await capture(page, '06-urgent-review', 'urgent-review');
    await Promise.all([
      page.waitForURL((url) => url.pathname === '/candidate-c/studio/dogfood-house' && url.searchParams.get('urgent') === '1'),
      page.getByRole('button', { name: 'Publish urgent update' }).click(),
    ]);

    await page.goto(`${origin}/candidate-c/dogfood-house`, { waitUntil: 'networkidle' });
    assert.match(await page.locator('body').textContent(), /Cancelled/);
    await capture(page, '07-cancelled-public', 'cancelled-public');

    const beforeRestart = store.publicSnapshot('dogfood-house');
    assert.equal(beforeRestart.draft.activities[0].lifecycle, 'cancelled');
    assert.equal(beforeRestart.releases.find((item) => item.id === beforeRestart.liveReleaseId).kind, 'urgent');
    assert.deepEqual(store.diagnostics().external, {
      hiveRpcAttempts: 0, hiveWrites: 0, providerWrites: 0, payments: 0, signingAttempts: 0, deployments: 0,
    });

    await page.close();
    await stopServer(server);
    store = new ProvisioningFileCandidateCStore({ statePath });
    app = createDogfoodApp({ store, publicIngress: true, accessSecret: ACCESS_SECRET, secureCookie: false });
    server = await startDogfoodServer(app, { port: 0 });
    origin = `http://127.0.0.1:${server.address().port}`;
    page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(20000);
    observe(page);
    await login(page);
    await page.goto(`${origin}/candidate-c/dogfood-house`, { waitUntil: 'networkidle' });
    const restartedText = await page.locator('body').textContent();
    assert.match(restartedText, /Cancelled/);
    assert.doesNotMatch(restartedText, /Harbor & Hearth|Northline|Nova Ashby|Sunday supper|Sunday table|harbor change color/i);
    await capture(page, '08-restart-public', 'restart-public');

    const stateText = fs.readFileSync(statePath, 'utf8');
    assert.equal(stateText.includes(ACCESS_SECRET), false);
    const diagnostics = store.diagnostics();
    const summary = {
      screenshotCount: screenshots.length,
      blockingAccessibilityFindings: accessibility.reduce((sum, item) => sum + item.blockingCount, 0),
      horizontalOverflowFindings: geometry.filter((item) => item.overflow).length,
      incompleteImageFindings: geometry.reduce((sum, item) => sum + item.incompleteImages, 0),
      externalRequests: externalRequests.length,
      unexpectedConsoleErrors: consoleErrors.length,
      ...diagnostics.external,
    };
    assert.equal(summary.blockingAccessibilityFindings, 0, JSON.stringify(accessibility.filter((item) => item.blockingCount > 0)));
    assert.equal(summary.horizontalOverflowFindings, 0, JSON.stringify(geometry.filter((item) => item.overflow)));
    assert.equal(summary.incompleteImageFindings, 0, JSON.stringify(geometry.filter((item) => item.incompleteImages > 0)));
    assert.equal(summary.externalRequests, 0, JSON.stringify(externalRequests));
    assert.equal(summary.unexpectedConsoleErrors, 0, JSON.stringify(consoleErrors));
    assert.deepEqual(diagnostics.external, {
      hiveRpcAttempts: 0, hiveWrites: 0, providerWrites: 0, payments: 0, signingAttempts: 0, deployments: 0,
    });

    const snapshot = store.snapshot('dogfood-house');
    const live = store.publicSnapshot('dogfood-house');
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify({
      phase: 'CANDIDATE_C_PRE_DOGFOOD_BOOTSTRAP_AND_LAUNCH',
      candidate: EXACT_SHA,
      runtime: { node: process.version, chromium: await browser.version(), host: '127.0.0.1 ephemeral', publicIngressGate: true },
      proof: {
        slug: snapshot.draft.identity.slug,
        revision: snapshot.revision,
        liveReleaseId: live.liveReleaseId,
        liveReleaseKind: live.releases.find((item) => item.id === live.liveReleaseId).kind,
        activityLifecycleAfterRestart: live.draft.activities[0].lifecycle,
        stateSha256: sha256(statePath),
        accessSecretPersisted: false,
      },
      screenshots, geometry, accessibility, externalRequests, consoleErrors, summary,
      finding: 'PRE_DOGFOOD_BROWSER_EVIDENCE_READY_FOR_PROJECT_LEAD_REVIEW',
    }, null, 2)}\n`);
  } finally {
    await browser.close();
    await stopServer(server);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
