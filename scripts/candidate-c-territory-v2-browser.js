'use strict';
/* global document, getComputedStyle, window */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createDogfoodApp, startDogfoodServer } = require('../src/candidate-c/dogfood-app');
const { stableDigest } = require('../src/candidate-c/model');
const { CandidateCStore } = require('../src/candidate-c/store');
const { getMaximalTerritoryHost } = require('../src/candidate-c/territory-fixture');

const OUTPUT_ROOT = process.env.CANDIDATE_C_TERRITORY_V2_ROOT || path.join('artifacts', 'candidate-c-territory-v2');
const EXACT_SHA = process.env.CANDIDATE_C_TERRITORY_V2_EXACT_SHA || 'LOCAL_UNBOUND';
const EXACT_TREE = process.env.CANDIDATE_C_TERRITORY_V2_EXACT_TREE || 'LOCAL_UNBOUND';
const FAMILIES = ['poster', 'editorial', 'hospitality'];
const DESKTOP = Object.freeze({ width: 1440, height: 1000 });
const NATIVE_NARROW = Object.freeze({ width: 390, height: 844 });
const NOW = () => Date.parse('2026-09-16T06:00:00Z');

const SURFACES = Object.freeze([
  Object.freeze({ id: 'home', suffix: '', expected: 'Small rooms. Long signals.', desktopCapture: true, narrowCapture: true }),
  Object.freeze({ id: 'activities', suffix: '/activities', expected: 'After Dark Listening Room', desktopCapture: true, narrowCapture: false }),
  Object.freeze({ id: 'offers', suffix: '/offers', expected: 'Relay membership', desktopCapture: false, narrowCapture: false }),
  Object.freeze({ id: 'stories', suffix: '/stories', expected: 'The roofline is an instrument', desktopCapture: true, narrowCapture: true }),
  Object.freeze({ id: 'story-detail', suffix: '/stories/the-roofline-is-an-instrument', expected: 'This synthetic essay gives the Editorial direction', desktopCapture: true, narrowCapture: false }),
  Object.freeze({ id: 'gallery', suffix: '/gallery', expected: 'Room studies', desktopCapture: true, narrowCapture: true }),
  Object.freeze({ id: 'people', suffix: '/people', expected: 'Mara Vale', desktopCapture: true, narrowCapture: false }),
  Object.freeze({ id: 'about', suffix: '/about', expected: '1 Reference Way', desktopCapture: false, narrowCapture: false }),
]);

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function semanticDigest(host) {
  const { direction, ...semanticIntent } = host.intent;
  return stableDigest({
    identity: host.identity,
    facts: host.facts,
    activities: host.activities,
    offers: host.offers,
    stories: host.stories,
    people: host.people,
    gallery: host.gallery,
    media: host.media,
    voice: host.voice,
    bindings: host.bindings,
    intent: semanticIntent,
  });
}

function hostForFamily(familyId) {
  const host = getMaximalTerritoryHost();
  host.presentation.compositionFamily = familyId;
  host.intent.direction = familyId;
  return host;
}

async function stopServer(server) {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => {
    const forceTimer = setTimeout(() => server.closeAllConnections?.(), 1000);
    forceTimer.unref?.();
    server.close((error) => {
      clearTimeout(forceTimer);
      if (error) reject(error); else resolve();
    });
  });
}

function isLocalRequest(url) {
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) return true;
  try {
    return ['127.0.0.1', 'localhost'].includes(new URL(url).hostname);
  } catch (_) {
    return false;
  }
}

async function auditPage(page, axeSource, label) {
  await page.addScriptTag({ content: axeSource });
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    incompleteImages: Array.from(document.images).filter((image) => !image.complete || image.naturalWidth === 0).length,
  }));
  const accessibility = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
    const blocking = result.violations.filter((item) => ['serious', 'critical'].includes(item.impact));
    return {
      violationCount: result.violations.length,
      blockingCount: blocking.length,
      blocking: blocking.map((item) => ({
        id: item.id,
        impact: item.impact,
        nodes: item.nodes.slice(0, 5).map((node) => node.target),
      })),
    };
  });
  assert.equal(geometry.overflow, false, `${label}: horizontal overflow ${geometry.scrollWidth}/${geometry.clientWidth}`);
  assert.equal(geometry.incompleteImages, 0, `${label}: incomplete images`);
  assert.equal(accessibility.blockingCount, 0, `${label}: blocking accessibility ${JSON.stringify(accessibility.blocking)}`);
  return { label, geometry, accessibility };
}

async function fingerprint(page) {
  return page.evaluate(() => ({
    bodyClass: document.body.className,
    mainClass: document.querySelector('main')?.className || '',
    heading: document.querySelector('h1')?.textContent?.trim() || '',
    background: getComputedStyle(document.body).backgroundColor,
    foreground: getComputedStyle(document.body).color,
  }));
}

async function main() {
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  const browser = await chromium.launch({ headless: true });
  const screenshots = [];
  const audits = [];
  const families = [];
  const allExternalRequests = [];
  const allConsoleErrors = [];
  const referenceSemanticDigest = semanticDigest(getMaximalTerritoryHost());

  try {
    for (const familyId of FAMILIES) {
      const host = hostForFamily(familyId);
      assert.equal(semanticDigest(host), referenceSemanticDigest, `${familyId}: semantic truth changed with Direction`);
      const store = new CandidateCStore({ hosts: [host], now: NOW });
      const app = createDogfoodApp({ store });
      const server = await startDogfoodServer(app, { port: 0 });
      const origin = `http://127.0.0.1:${server.address().port}`;
      const context = await browser.newContext({ viewport: DESKTOP });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.setDefaultNavigationTimeout(20000);
      const familyExternalRequests = [];
      const familyConsoleErrors = [];
      const familyCaptures = [];
      const familyAudits = [];
      const fingerprints = {};

      context.on('request', (request) => {
        if (!isLocalRequest(request.url())) familyExternalRequests.push(request.url());
      });
      page.on('pageerror', (error) => familyConsoleErrors.push({ type: 'pageerror', text: error.message }));
      page.on('console', (message) => {
        if (message.type() === 'error') familyConsoleErrors.push({ type: 'console', text: message.text() });
      });

      async function capture(name, label) {
        const file = `${familyId}-${name}.png`;
        const filePath = path.join(OUTPUT_ROOT, file);
        const audit = await auditPage(page, axeSource, label);
        await page.screenshot({ path: filePath, fullPage: false, animations: 'disabled' });
        const record = {
          file,
          family: familyId,
          label,
          viewport: await page.viewportSize(),
          sha256: sha256File(filePath),
        };
        screenshots.push(record);
        familyCaptures.push(record);
        audits.push(audit);
        familyAudits.push(audit);
        return record;
      }

      try {
        for (const surface of SURFACES) {
          await page.setViewportSize(DESKTOP);
          await page.goto(`${origin}/candidate-c/lantern-relay${surface.suffix}`, { waitUntil: 'networkidle' });
          const bodyText = await page.locator('body').textContent();
          assert.ok(bodyText.includes(surface.expected), `${familyId}/${surface.id}: expected content missing`);
          const fp = await fingerprint(page);
          assert.ok(fp.bodyClass.includes(familyId), `${familyId}/${surface.id}: family class missing from ${fp.bodyClass}`);
          fingerprints[`desktop:${surface.id}`] = fp;
          const audit = await auditPage(page, axeSource, `${familyId}-desktop-${surface.id}`);
          audits.push(audit);
          familyAudits.push(audit);
          if (surface.desktopCapture) {
            const file = `${familyId}-desktop-${surface.id}.png`;
            const filePath = path.join(OUTPUT_ROOT, file);
            await page.screenshot({ path: filePath, fullPage: false, animations: 'disabled' });
            const record = { file, family: familyId, label: `desktop-${surface.id}`, viewport: DESKTOP, sha256: sha256File(filePath) };
            screenshots.push(record);
            familyCaptures.push(record);
          }
        }

        for (const surface of SURFACES.filter((item) => item.narrowCapture)) {
          await page.setViewportSize(NATIVE_NARROW);
          await page.goto(`${origin}/candidate-c/lantern-relay${surface.suffix}`, { waitUntil: 'networkidle' });
          const bodyText = await page.locator('body').textContent();
          assert.ok(bodyText.includes(surface.expected), `${familyId}/native-${surface.id}: expected content missing`);
          fingerprints[`native390:${surface.id}`] = await fingerprint(page);
          await capture(`native390-${surface.id}`, `${familyId}-native390-${surface.id}`);
        }

        await page.setViewportSize(DESKTOP);
        await page.goto(`${origin}/candidate-c/studio/lantern-relay`, { waitUntil: 'networkidle' });
        assert.equal(await page.locator('.cc-studio-surface-nav').count(), 1, `${familyId}: Studio review navigation missing`);
        const before = store.snapshot('lantern-relay');
        await page.locator('[data-review-surface="stories-index"]').click();
        await page.locator('[data-selected-review="stories-index"]').waitFor();
        const reviewFrame = page.locator('.cc-territory-review__frame');
        await reviewFrame.waitFor();
        const frameSrc = await reviewFrame.getAttribute('src');
        assert.equal(frameSrc, '/candidate-c/studio/lantern-relay/preview/stories');
        assert.equal(await reviewFrame.getAttribute('sandbox'), 'allow-same-origin');
        const afterReview = store.snapshot('lantern-relay');
        assert.equal(afterReview.revision, before.revision, `${familyId}: review changed revision`);
        assert.equal(afterReview.draftDigest, before.draftDigest, `${familyId}: review changed draft digest`);
        await capture('studio-stories-wide', `${familyId}-studio-stories-wide`);

        await page.locator('[data-review-width="narrow"]').click();
        assert.equal(await page.locator('[data-review-stage]').getAttribute('data-review-mode'), 'narrow');
        const narrowBox = await page.locator('[data-review-device]').boundingBox();
        assert.ok(narrowBox && narrowBox.width <= 430, `${familyId}: built-in narrow review width ${narrowBox?.width}`);
        await capture('studio-stories-builtin-narrow', `${familyId}-studio-stories-builtin-narrow`);

        await page.setViewportSize(NATIVE_NARROW);
        await page.goto(`${origin}/candidate-c/studio/lantern-relay`, { waitUntil: 'networkidle' });
        await page.locator('[data-review-surface="stories-index"]').click();
        await page.locator('[data-selected-review="stories-index"]').waitFor();
        await capture('studio-stories-native390', `${familyId}-studio-stories-native390`);

        const effects = store.diagnostics().external;
        assert.deepEqual(effects, {
          hiveRpcAttempts: 0,
          hiveWrites: 0,
          providerWrites: 0,
          payments: 0,
          signingAttempts: 0,
          deployments: 0,
        }, `${familyId}: unauthorized external effects`);
        assert.deepEqual(familyExternalRequests, [], `${familyId}: external network requests ${JSON.stringify(familyExternalRequests)}`);
        assert.deepEqual(familyConsoleErrors, [], `${familyId}: console/page errors ${JSON.stringify(familyConsoleErrors)}`);

        families.push({
          id: familyId,
          semanticDigest: semanticDigest(host),
          releaseDigest: store.publicSnapshot('lantern-relay').draftDigest,
          effects,
          fingerprints,
          screenshotCount: familyCaptures.length,
          auditCount: familyAudits.length,
        });
        allExternalRequests.push(...familyExternalRequests);
        allConsoleErrors.push(...familyConsoleErrors);
      } finally {
        await context.close();
        await stopServer(server);
      }
    }

    assert.equal(new Set(families.map((family) => family.semanticDigest)).size, 1, 'semantic digest differs across Directions');
    for (const surfaceId of SURFACES.filter((item) => item.desktopCapture).map((item) => item.id)) {
      const hashes = FAMILIES.map((familyId) => screenshots.find((item) => item.family === familyId && item.label === `desktop-${surfaceId}`)?.sha256);
      assert.equal(hashes.every(Boolean), true, `${surfaceId}: missing family screenshot`);
      assert.equal(new Set(hashes).size, 3, `${surfaceId}: Directions are not visually distinct`);
    }

    const manifest = {
      qualification: 'candidate-c-territory-v2',
      candidate: EXACT_SHA,
      tree: EXACT_TREE,
      host: {
        id: 'host-lantern-relay-001',
        slug: 'lantern-relay',
        name: 'Lantern Relay',
        synthetic: true,
        semanticDigest: referenceSemanticDigest,
      },
      families,
      screenshots,
      audits,
      externalRequests: allExternalRequests,
      consoleErrors: allConsoleErrors,
      summary: {
        familyCount: families.length,
        semanticDigestCount: new Set(families.map((family) => family.semanticDigest)).size,
        screenshotCount: screenshots.length,
        auditCount: audits.length,
        blockingAccessibilityFindings: audits.reduce((sum, item) => sum + item.accessibility.blockingCount, 0),
        horizontalOverflowFindings: audits.filter((item) => item.geometry.overflow).length,
        incompleteImageFindings: audits.filter((item) => item.geometry.incompleteImages > 0).length,
        externalRequests: allExternalRequests.length,
        unexpectedConsoleErrors: allConsoleErrors.length,
        hiveRpcAttempts: families.reduce((sum, family) => sum + family.effects.hiveRpcAttempts, 0),
        hiveWrites: families.reduce((sum, family) => sum + family.effects.hiveWrites, 0),
        providerWrites: families.reduce((sum, family) => sum + family.effects.providerWrites, 0),
        payments: families.reduce((sum, family) => sum + family.effects.payments, 0),
        signingAttempts: families.reduce((sum, family) => sum + family.effects.signingAttempts, 0),
        deployments: families.reduce((sum, family) => sum + family.effects.deployments, 0),
      },
    };

    assert.equal(manifest.summary.familyCount, 3);
    assert.equal(manifest.summary.semanticDigestCount, 1);
    assert.equal(manifest.summary.blockingAccessibilityFindings, 0);
    assert.equal(manifest.summary.horizontalOverflowFindings, 0);
    assert.equal(manifest.summary.incompleteImageFindings, 0);
    assert.equal(manifest.summary.externalRequests, 0);
    assert.equal(manifest.summary.unexpectedConsoleErrors, 0);
    assert.equal(manifest.summary.hiveRpcAttempts, 0);
    assert.equal(manifest.summary.hiveWrites, 0);
    assert.equal(manifest.summary.providerWrites, 0);
    assert.equal(manifest.summary.payments, 0);
    assert.equal(manifest.summary.signingAttempts, 0);
    assert.equal(manifest.summary.deployments, 0);

    fs.writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(manifest.summary)}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
