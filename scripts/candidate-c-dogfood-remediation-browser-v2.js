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

const ROOT = path.join(__dirname, '..');
const OUTPUT_ROOT = process.env.CANDIDATE_C_DOGFOOD_REMEDIATION_ROOT || path.join(ROOT, 'artifacts', 'candidate-c-dogfood-remediation');
const EXACT_SHA = process.env.CANDIDATE_C_DOGFOOD_REMEDIATION_EXACT_SHA || 'LOCAL_UNBOUND';
const EXTERIOR = process.env.FOURTH_STREET_EXTERIOR_IMAGE;
const LOGO = process.env.FOURTH_STREET_LOGO_IMAGE;
const EXTERIOR_SHA256 = '585b3e80a50723b3cd0209b244f3a57efb14c018313f64ea34bd7f3108bc654a';
const LOGO_SHA256 = 'c57379e4dc46a367879fc0dc67b61b5514ede4fd795cfbbc0ea116914cea91da';
const SLUG = '4th-street-bar';

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

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
  assert.equal(blocking.length, 0, `${label}: blocking accessibility ${JSON.stringify(blocking.map((item) => item.id))}`);
  assert.equal(geometry.scrollWidth > geometry.clientWidth + 1, false, `${label}: horizontal overflow ${geometry.scrollWidth}/${geometry.clientWidth}`);
  assert.equal(geometry.incompleteImages, 0, `${label}: incomplete images`);
}

async function capture(page, filename, label, evidence) {
  await auditPage(page, label, evidence.audits);
  await page.screenshot({ path: path.join(OUTPUT_ROOT, filename), fullPage: true });
  evidence.screenshots.push(filename);
}

async function openCommand(page, label) {
  const summary = page.locator('.cc-studio-commandbar summary').filter({ hasText: label });
  assert.equal(await summary.count(), 1, `expected one ${label} command menu`);
  const details = summary.locator('xpath=..');
  if (!(await details.evaluate((node) => node.open))) await summary.click();
  assert.equal(await details.evaluate((node) => node.open), true, `${label} command menu did not open`);
}

async function main() {
  assert(EXTERIOR && fs.existsSync(EXTERIOR), 'FOURTH_STREET_EXTERIOR_IMAGE is required');
  assert(LOGO && fs.existsSync(LOGO), 'FOURTH_STREET_LOGO_IMAGE is required');
  assert.equal(sha256(EXTERIOR), EXTERIOR_SHA256, 'Fourth Street exterior source hash drifted');
  assert.equal(sha256(LOGO), LOGO_SHA256, 'Fourth Street logo source hash drifted');

  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const statePath = path.join(OUTPUT_ROOT, 'candidate-c-state.json');
  const mediaRoot = path.join(ROOT, 'public', 'candidate-c', 'media', 'local');
  fs.rmSync(path.join(mediaRoot, SLUG), { recursive: true, force: true });

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
    source: {
      repository: 'etblink/Hive-Bar',
      commit: 'fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e',
      exteriorSha256: EXTERIOR_SHA256,
      logoSha256: LOGO_SHA256,
    },
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
      displayName: '4th Street Bar',
      archetype: 'Reno neighborhood bar',
      tagline: 'Your place on 4th.',
      purpose: 'A neighborhood bar in Reno with a real local atmosphere and a community that keeps the conversation going online.',
      presenceMode: 'physical',
      presenceLabel: '1114 East 4th Street · Reno, Nevada · Daily, 12:00 p.m.–2:00 a.m.',
      address: '1114 E. 4th Street, Reno, NV 89512',
      contact: '(775) 324-7827',
      timezone: 'America/Los_Angeles',
      summary: 'A neighborhood bar in Reno with a real local atmosphere. Open daily, 12:00 p.m.–2:00 a.m.',
      presenceMaterial: 'Candid photographs from the pool table, the bar, and the East 4th Street entrance.',
      direction: 'poster',
      participation: 'Come by in Reno or browse the public conversation on Hive.',
    });
    assert.equal(await page.locator('[name="activityTitle"]').inputValue(), '');
    await Promise.all([
      page.waitForURL((url) => url.pathname === `/candidate-c/studio/${SLUG}`),
      submitFirstDraft(page),
    ]);
    await dismissFirstDraftReveal(page);
    assert.equal(store.snapshot(SLUG).draft.activities.length, 0, 'Fourth Street qualification invented an Activity');
    await capture(page, '01-created-studio.png', 'created-studio', evidence);

    await openCommand(page, 'Page');
    await page.getByRole('link', { name: 'Story & visit details', exact: true }).click();
    await page.locator('[name="summary"]').fill('A neighborhood bar in Reno with a real local atmosphere and a community that keeps the conversation going online.');
    await page.locator('[name="purpose"]').fill('Come by in Reno or browse the public conversation on Hive.');
    await page.locator('[name="presenceMaterial"]').fill('Candid photographs from the pool table, the bar, and the East 4th Street entrance.');
    await page.locator('[name="participation"]').fill('See the place, find the address and phone, and plan a visit.');
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get('saved') === '1'),
      page.getByRole('button', { name: 'Save public content to draft' }).click(),
    ]);
    await capture(page, '02-content-maintenance.png', 'content-maintenance', evidence);

    await page.getByRole('link', { name: 'Back to Studio' }).click();
    await openCommand(page, 'Site');
    await page.getByRole('link', { name: 'Media library', exact: true }).click();
    await page.locator('#cc-hero-file').setInputFiles(EXTERIOR);
    await page.locator('#cc-hero-alt').fill('4th Street Bar entrance and sign on East 4th Street in Reno');
    await page.locator('#cc-hero-caption').fill('1114 East 4th Street');
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get('imported') === 'hero'),
      page.getByRole('button', { name: /Replace placeholder with real image|Replace primary image/ }).click(),
    ]);
    await page.locator('#cc-logo-file').setInputFiles(LOGO);
    await page.locator('#cc-logo-alt').fill('4th Street Bar official logo');
    await page.locator('#cc-logo-caption').fill('Official venue mark supplied by owner');
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get('imported') === 'logo'),
      page.getByRole('button', { name: /Import official logo|Replace official logo/ }).click(),
    ]);
    await capture(page, '03-real-media-library.png', 'real-media-library', evidence);

    await page.getByRole('link', { name: 'Back to Studio' }).click();
    await openCommand(page, 'Site');
    await page.getByRole('button', { name: 'Look', exact: true }).click();
    await page.locator('#cc-look-accent').selectOption('#f4a460');
    const lookResponse = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/look`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save look' }).click();
    assert.equal((await lookResponse).status(), 200);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#candidate-canvas img').count() > 0, true, 'Studio canvas omitted imported real media');
    assert.match(await page.locator('body').textContent(), /Candid photographs from the pool table/);
    await capture(page, '04-studio-real-media-desktop.png', 'studio-real-media-desktop', evidence);

    await openCommand(page, 'Page');
    await page.getByRole('button', { name: 'First impression', exact: true }).click();
    await page.locator('#candidate-inspector[data-open="true"]').waitFor();
    await capture(page, '05-studio-context-desktop.png', 'studio-context-desktop', evidence);
    await page.keyboard.press('Escape');

    const previewPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'Preview', exact: true }).click();
    const preview = await previewPromise;
    preview.setDefaultTimeout(15000);
    observe(preview);
    await preview.waitForLoadState('networkidle');
    assert.match(await preview.locator('body').textContent(), /1114 East 4th Street/);
    assert.equal(await preview.locator('img.cc-public-logo').count(), 1, 'dedicated preview omitted imported logo');
    assert.equal(await preview.locator('.cc-poster-hero__art img').count(), 1, 'dedicated preview omitted real hero image');
    await capture(preview, '06-dedicated-preview-desktop.png', 'dedicated-preview-desktop', evidence);
    await preview.setViewportSize({ width: 390, height: 844 });
    await capture(preview, '07-dedicated-preview-mobile-390.png', 'dedicated-preview-mobile-390', evidence);
    await preview.close();

    await page.getByRole('link', { name: 'Release', exact: true }).click();
    assert.match(await page.locator('body').textContent(), /Release impact/);
    await capture(page, '08-release-review.png', 'release-review', evidence);
    await Promise.all([
      page.waitForURL((url) => url.pathname === `/candidate-c/studio/${SLUG}` && Boolean(url.searchParams.get('released'))),
      page.getByRole('button', { name: 'Publish website release' }).click(),
    ]);
    const released = store.publicSnapshot(SLUG);
    assert.equal(released.draft.activities.length, 0);
    assert.equal(released.draft.presentation.accent.toLowerCase(), '#f4a460');
    const releasedHero = released.draft.media.find((item) => item.id !== `media-${SLUG}-logo`);
    const releasedLogo = released.draft.media.find((item) => item.id === `media-${SLUG}-logo`);
    assert.equal(releasedHero.asset.sha256, EXTERIOR_SHA256);
    assert.equal(releasedLogo.asset.sha256, LOGO_SHA256);

    await page.goto(`${origin}/candidate-c/${SLUG}`, { waitUntil: 'networkidle' });
    assert.match(await page.locator('body').textContent(), /community that keeps the conversation going online/);
    assert.equal(await page.locator('a[href="tel:7753247827"]').count(), 1);
    assert.equal(await page.locator('img.cc-public-logo').count(), 1);
    assert.equal(await page.locator('.cc-poster-hero__art img').count(), 1);
    await capture(page, '09-released-public-desktop.png', 'released-public-desktop', evidence);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/candidate-c/${SLUG}`, { waitUntil: 'networkidle' });
    await capture(page, '10-released-public-mobile-390.png', 'released-public-mobile-390', evidence);

    await page.setViewportSize({ width: 1365, height: 900 });
    await page.goto(`${origin}/candidate-c/studio/${SLUG}/content`, { waitUntil: 'networkidle' });
    await page.locator('[name="summary"]').fill('UNPUBLISHED WORKING COPY — visitors must not see this sentence.');
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get('saved') === '1'),
      page.getByRole('button', { name: 'Save public content to draft' }).click(),
    ]);
    assert.match(store.snapshot(SLUG).draft.facts.summary, /UNPUBLISHED WORKING COPY/);
    assert.doesNotMatch(store.publicSnapshot(SLUG).draft.facts.summary, /UNPUBLISHED WORKING COPY/);
    await page.goto(`${origin}/candidate-c/${SLUG}`, { waitUntil: 'networkidle' });
    assert.doesNotMatch(await page.locator('body').textContent(), /UNPUBLISHED WORKING COPY/);
    await capture(page, '11-draft-isolation-public.png', 'draft-isolation-public', evidence);

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
    assert.doesNotMatch(await page.locator('body').textContent(), /UNPUBLISHED WORKING COPY/);
    assert.equal(await page.locator('.cc-poster-hero__art img').count(), 1);
    assert.equal(await page.locator('img.cc-public-logo').count(), 1);
    await capture(page, '12-restart-public.png', 'restart-public', evidence);

    const diagnostics = store.diagnostics();
    assert.deepEqual(diagnostics.external, {
      hiveRpcAttempts: 0, hiveWrites: 0, providerWrites: 0, payments: 0, signingAttempts: 0, deployments: 0,
    });
    assert.equal(evidence.externalRequests.length, 0, `external requests: ${JSON.stringify(evidence.externalRequests)}`);
    assert.equal(evidence.consoleErrors.length, 0, `console errors: ${JSON.stringify(evidence.consoleErrors)}`);
    assert.equal(evidence.pageErrors.length, 0, `page errors: ${JSON.stringify(evidence.pageErrors)}`);

    evidence.proof = {
      slug: SLUG,
      releasedRevision: store.publicSnapshot(SLUG).revision,
      draftRevision: store.snapshot(SLUG).revision,
      draftIsolation: true,
      restartPersisted: true,
      activityCount: store.snapshot(SLUG).draft.activities.length,
      hero: store.snapshot(SLUG).draft.media.find((item) => item.id !== `media-${SLUG}-logo`).asset,
      logo: store.snapshot(SLUG).draft.media.find((item) => item.id === `media-${SLUG}-logo`).asset,
      external: diagnostics.external,
    };
    evidence.summary = {
      screenshotCount: evidence.screenshots.length,
      blockingAccessibilityFindings: evidence.audits.reduce((sum, item) => sum + item.blocking.length, 0),
      horizontalOverflowFindings: evidence.audits.filter((item) => item.geometry.scrollWidth > item.geometry.clientWidth + 1).length,
      incompleteImageFindings: evidence.audits.reduce((sum, item) => sum + item.geometry.incompleteImages, 0),
      externalRequests: evidence.externalRequests.length,
      unexpectedConsoleErrors: evidence.consoleErrors.length + evidence.pageErrors.length,
    };
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  } finally {
    await browser.close();
    await stopServer(server);
    fs.rmSync(path.join(mediaRoot, SLUG), { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});