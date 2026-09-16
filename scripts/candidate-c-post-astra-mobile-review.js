'use strict';
/* global document, window */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');
const { CandidateCStore } = require('../src/candidate-c/store');
const { createCandidateCRouter } = require('../src/candidate-c/router');

const OUTPUT_ROOT = process.env.CANDIDATE_C_POST_ASTRA_MOBILE_REVIEW_ROOT || path.join('artifacts', 'candidate-c-post-astra-mobile-review');
const EXACT_SHA = process.env.CANDIDATE_C_POST_ASTRA_EXACT_SHA || 'LOCAL_UNBOUND';
const HOSTS = [
  { slug: 'northline-hall', family: 'poster' },
  { slug: 'nova-ashby', family: 'editorial' },
  { slug: 'harbor-and-hearth', family: 'hospitality' },
];

function makeApp() {
  const app = express();
  const root = path.join(__dirname, '..');
  const store = new CandidateCStore();
  app.disable('x-powered-by');
  app.set('views', path.join(root, 'views'));
  app.set('view engine', 'ejs');
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));
  app.use('/htmx', express.static(path.dirname(require.resolve('htmx.org'))));
  app.use(express.static(path.join(root, 'public')));
  app.use('/candidate-c', createCandidateCRouter({ store }));
  return app;
}

function startServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

async function main() {
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const server = await startServer(makeApp());
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  const screenshots = [];
  const proof = { desktopNarrow: {}, native390: {} };
  const externalRequests = [];
  const consoleErrors = [];

  function observe(page) {
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('about:')) externalRequests.push(url);
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  }

  async function gotoStudio(page, slug) {
    const response = await page.goto(`${origin}/candidate-c/studio/${slug}`, { waitUntil: 'networkidle' });
    assert(response && response.ok(), `${slug} Studio must return 2xx`);
    assert.equal(await page.locator('[data-review-width="narrow"]').count(), 1, `${slug}: narrow review is discoverable`);
  }

  async function audit(page, label) {
    await page.addScriptTag({ content: axeSource });
    const geometry = await page.evaluate(() => ({
      viewport: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));
    const accessibility = await page.evaluate(async () => {
      const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
      return result.violations.filter((item) => ['serious', 'critical'].includes(item.impact)).map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length }));
    });
    assert.equal(geometry.overflow, false, `${label}: no horizontal overflow`);
    assert.equal(accessibility.length, 0, `${label}: no serious/critical accessibility findings`);
    return { geometry, accessibility };
  }

  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    observe(desktop);
    observe(mobile);

    for (const host of HOSTS) {
      await gotoStudio(desktop, host.slug);
      await desktop.locator('[data-review-width="narrow"]').click();
      await desktop.waitForTimeout(220);
      const narrow = await desktop.evaluate(() => {
        const stage = document.querySelector('[data-review-stage]');
        const device = document.querySelector('[data-review-device]');
        const canvas = document.querySelector('#candidate-canvas');
        const button = document.querySelector('[data-review-width="narrow"]');
        const style = canvas ? window.getComputedStyle(canvas) : null;
        return {
          mode: stage?.dataset.reviewMode,
          pressed: button?.getAttribute('aria-pressed'),
          deviceWidth: device?.getBoundingClientRect().width,
          canvasColumns: style?.gridTemplateColumns || '',
        };
      });
      assert.equal(narrow.mode, 'narrow');
      assert.equal(narrow.pressed, 'true');
      assert(narrow.deviceWidth >= 388 && narrow.deviceWidth <= 392, `${host.slug}: narrow review width ${narrow.deviceWidth}`);
      if (host.family !== 'hospitality') assert(!narrow.canvasColumns.includes(' '), `${host.slug}: narrow canvas is one column (${narrow.canvasColumns})`);
      const desktopAudit = await audit(desktop, `${host.slug}-desktop-narrow`);
      const desktopShot = `desktop-narrow-${host.slug}.png`;
      await desktop.screenshot({ path: path.join(OUTPUT_ROOT, desktopShot), fullPage: true });
      screenshots.push(desktopShot);
      proof.desktopNarrow[host.slug] = { ...narrow, audit: desktopAudit };

      await gotoStudio(mobile, host.slug);
      const native = await mobile.evaluate(() => ({
        viewport: window.innerWidth,
        stageMode: document.querySelector('[data-review-stage]')?.dataset.reviewMode,
        deviceWidth: document.querySelector('[data-review-device]')?.getBoundingClientRect().width,
        narrowControlVisible: Boolean(document.querySelector('[data-review-width="narrow"]')?.getClientRects().length),
      }));
      assert.equal(native.viewport, 390, `${host.slug}: native viewport is exactly 390`);
      assert.equal(native.narrowControlVisible, true, `${host.slug}: review control visible at 390`);
      assert(native.deviceWidth <= 390, `${host.slug}: canvas remains inside native viewport`);
      const mobileAudit = await audit(mobile, `${host.slug}-native-390`);
      const mobileShot = `native-390-${host.slug}.png`;
      await mobile.screenshot({ path: path.join(OUTPUT_ROOT, mobileShot), fullPage: true });
      screenshots.push(mobileShot);
      proof.native390[host.slug] = { ...native, audit: mobileAudit };
    }

    assert.equal(externalRequests.length, 0, JSON.stringify(externalRequests));
    assert.equal(consoleErrors.length, 0, JSON.stringify(consoleErrors));
    const manifest = {
      phase: 'CANDIDATE_C_POST_ASTRA_R4_MOBILE_REVIEW',
      candidate: EXACT_SHA,
      hosts: HOSTS,
      screenshots,
      proof,
      externalRequests,
      consoleErrors,
      summary: {
        screenshotCount: screenshots.length,
        desktopNarrowHosts: Object.keys(proof.desktopNarrow).length,
        native390Hosts: Object.keys(proof.native390).length,
        horizontalOverflowFindings: 0,
        blockingAccessibilityFindings: 0,
      },
      finding: 'R4_MOBILE_AND_NARROW_REVIEW_QUALIFIED',
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
