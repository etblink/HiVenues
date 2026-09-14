'use strict';
/* global document, window */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');
const { CandidateCStore } = require('../src/candidate-c/store');
const { createCandidateCRouter } = require('../src/candidate-c/router');

const OUTPUT_ROOT = process.env.CANDIDATE_C_PHASE2B_REVIEW_ROOT || path.join('artifacts', 'candidate-c-phase2b-review');
const EXACT_SHA = process.env.CANDIDATE_C_PHASE2B_EXACT_SHA || 'LOCAL_UNBOUND';
const FIXED_NOW = Date.parse('2026-09-14T22:00:00.000Z');

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

  function observe(page) {
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('about:')) {
        externalRequests.push(url);
      }
    });
    page.on('pageerror', (error) => consoleErrors.push({ type: 'pageerror', text: error.message }));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push({ type: 'console', text: message.text() });
    });
  }

  async function gotoOk(page, pathname) {
    const response = await page.goto(`${origin}${pathname}`, { waitUntil: 'networkidle' });
    assert(response, `No response for ${pathname}`);
    assert(response.ok(), `${pathname} returned ${response.status()}`);
  }

  async function capture(page, name, label) {
    const filename = path.join(OUTPUT_ROOT, `${name}.png`);
    await page.screenshot({ path: filename, fullPage: true });
    screenshots.push(path.basename(filename));
    const audited = await auditPage(page, axeSource, label);
    geometry.push(audited.geometry);
    accessibility.push(audited.accessibility);
  }

  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    observe(desktop);

    await gotoOk(desktop, '/candidate-c/harbor-and-hearth');
    assert.match(await desktop.locator('body').getAttribute('class'), /cc-hospitality/);
    assert.equal(await desktop.locator('.cc-hospitality-menu').count(), 1);
    assert.equal(await desktop.locator('.cc-hospitality-dish').count(), 3);
    assert.equal(await desktop.locator('.cc-poster-night').count(), 0);
    assert.equal(await desktop.locator('.cc-editorial-session').count(), 0);
    const publicImage = desktop.locator('.cc-admitted-media img').first();
    assert.equal(await publicImage.getAttribute('src'), '/candidate-c/media/harbor-hearth-table.svg');
    assert.deepEqual(await publicImage.evaluate((img) => ({ width: img.naturalWidth, height: img.naturalHeight })), { width: 1600, height: 1200 });
    await capture(desktop, '01-r3-harbor-public-desktop', 'r3-public-desktop');

    await gotoOk(desktop, '/candidate-c/harbor-and-hearth/activities/sunday-harvest-table');
    assert.match(await desktop.locator('h1').textContent(), /Sunday Table — Harvest Supper/);
    assert.equal(await desktop.getByRole('button', { name: 'Save a seat' }).count(), 1);
    assert.equal(await desktop.locator('.cc-hospitality-activity__media .cc-admitted-media img').count(), 1);
    await capture(desktop, '02-r3-harbor-activity-desktop', 'r3-activity-desktop');

    await gotoOk(desktop, '/candidate-c/studio/harbor-and-hearth');
    assert.equal(await desktop.locator('#candidate-canvas').getAttribute('data-composition'), 'hospitality');
    assert.match(await desktop.locator('#candidate-canvas').textContent(), /Coal-roasted carrots/);
    assert.equal(await desktop.locator('#candidate-canvas .cc-admitted-media img').count(), 1);
    await capture(desktop, '03-r3-harbor-studio-desktop', 'r3-studio-desktop');

    await desktop.getByRole('button', { name: 'Adjust image focus' }).click();
    await desktop.locator('#candidate-inspector[data-open="true"]').waitFor();
    assert.match(await desktop.locator('input[name="expectedDraftDigest"]').first().inputValue(), /^[a-f0-9]{64}$/);
    await desktop.locator('#cc-focal-x').evaluate((node) => {
      node.value = '64';
      node.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await desktop.locator('#cc-focal-y').evaluate((node) => {
      node.value = '48';
      node.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    const saveResponse = desktop.waitForResponse((response) => response.url().endsWith('/candidate-c/studio/harbor-and-hearth/media') && response.request().method() === 'POST');
    await desktop.getByRole('button', { name: 'Save focal point' }).click();
    assert.equal((await saveResponse).status(), 200);
    await desktop.waitForFunction(() => document.querySelector('#draft-status')?.dataset.revision === '2');
    assert.deepEqual(store.snapshot('harbor-and-hearth').draft.media[0].focal, { x: 64, y: 48 });
    assert.equal(await desktop.locator('#candidate-canvas').getAttribute('data-composition'), 'hospitality');
    await capture(desktop, '04-r3-harbor-studio-media-save', 'r3-studio-media-save');

    const northline = store.snapshot('northline-hall');
    const direction = await desktop.request.post(`${origin}/candidate-c/studio/northline-hall/direction/propose`, {
      form: {
        expectedRevision: String(northline.revision),
        expectedDraftDigest: northline.draftDigest,
        familyId: 'hospitality',
      },
      maxRedirects: 0,
    });
    assert.equal(direction.status(), 303);
    await gotoOk(desktop, direction.headers().location);
    assert.equal(await desktop.locator('.cc-studio-canvas--poster').count(), 1);
    assert.equal(await desktop.locator('.cc-studio-canvas--hospitality').count(), 1);
    assert.match(await desktop.locator('.cc-task').textContent(), /Poster room/);
    assert.match(await desktop.locator('.cc-task').textContent(), /Hospitality table/);
    await capture(desktop, '05-direction-poster-to-hospitality', 'direction-poster-to-hospitality');

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    observe(mobile);
    await gotoOk(mobile, '/candidate-c/harbor-and-hearth');
    assert.equal(await mobile.locator('.cc-hospitality-dish').count(), 3);
    await capture(mobile, '06-r3-harbor-public-mobile', 'r3-public-mobile');

    await gotoOk(mobile, '/candidate-c/studio/harbor-and-hearth');
    assert.equal(await mobile.locator('#candidate-canvas').getAttribute('data-composition'), 'hospitality');
    await capture(mobile, '07-r3-harbor-studio-mobile', 'r3-studio-mobile');
    await mobile.getByRole('button', { name: 'Adjust image focus' }).click();
    await mobile.locator('#candidate-inspector[data-open="true"]').waitFor();
    await mobile.waitForFunction(() => {
      const node = document.querySelector('#candidate-inspector[data-open="true"]');
      return Boolean(node && node.getBoundingClientRect().bottom <= window.innerHeight + 2);
    });
    await capture(mobile, '08-r3-harbor-studio-mobile-media', 'r3-studio-mobile-media');

    const diagnostics = store.diagnostics();
    assert.deepEqual(diagnostics.external, {
      hiveRpcAttempts: 0,
      hiveWrites: 0,
      providerWrites: 0,
      payments: 0,
      signingAttempts: 0,
      deployments: 0,
    });

    const summary = {
      screenshotCount: screenshots.length,
      blockingAccessibilityFindings: accessibility.reduce((sum, item) => sum + item.blockingCount, 0),
      horizontalOverflowFindings: geometry.filter((item) => item.overflow).length,
      incompleteImageFindings: geometry.reduce((sum, item) => sum + item.incompleteImages, 0),
      externalRequests: externalRequests.length,
      unexpectedConsoleErrors: consoleErrors.length,
      hiveRpcAttempts: diagnostics.external.hiveRpcAttempts,
      hiveWrites: diagnostics.external.hiveWrites,
      providerWrites: diagnostics.external.providerWrites,
      payments: diagnostics.external.payments,
      signingAttempts: diagnostics.external.signingAttempts,
      deployments: diagnostics.external.deployments,
    };

    assert.equal(summary.blockingAccessibilityFindings, 0, JSON.stringify(accessibility.filter((item) => item.blockingCount > 0)));
    assert.equal(summary.horizontalOverflowFindings, 0, JSON.stringify(geometry.filter((item) => item.overflow)));
    assert.equal(summary.incompleteImageFindings, 0, JSON.stringify(geometry.filter((item) => item.incompleteImages > 0)));
    assert.equal(summary.externalRequests, 0, JSON.stringify(externalRequests));
    assert.equal(summary.unexpectedConsoleErrors, 0, JSON.stringify(consoleErrors));

    const manifest = {
      phase: 'CANDIDATE_C_PHASE2B_MEDIA_AND_THIRD_COMPOSITION',
      candidate: EXACT_SHA,
      generatedAt: new Date(FIXED_NOW).toISOString(),
      runtime: { node: process.version, chromium: await browser.version(), host: '127.0.0.1 ephemeral' },
      references: {
        r1: 'northline-hall / physical live-music / poster composition',
        r2: 'nova-ashby / locationless creator / editorial composition',
        r3: 'harbor-and-hearth / neighborhood restaurant / hospitality composition',
      },
      mediaProof: {
        id: 'media-harbor-table-001',
        path: '/candidate-c/media/harbor-hearth-table.svg',
        naturalWidth: 1600,
        naturalHeight: 1200,
      },
      screenshots,
      geometry,
      accessibility,
      externalRequests,
      consoleErrors,
      diagnostics,
      summary,
      finding: 'R3_BROWSER_EVIDENCE_READY_FOR_PROJECT_LEAD_VISUAL_REVIEW',
    };
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
