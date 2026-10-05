'use strict';
/* global document, window, getComputedStyle */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { createHiVenuesApp, startHiVenuesServer } = require('../src/product/app');
const { HiVenuesStore } = require('../src/product/store');
const { documentInventory } = require('../src/product/draft-document');
const { VIEWPORTS } = require('../src/product/authoring-proof-router');
const { authoringProofCases } = require('../test/helpers/authoring-proof-fixtures');

const root = path.resolve(process.env.HIVENUES_AUTHORING_PROOF_OUTPUT || 'artifacts/authoring-document');
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

async function inspect(frame) {
  return frame.evaluate(() => {
    const visible = (node) => Boolean(node.getClientRects().length)
      && getComputedStyle(node).display !== 'none' && getComputedStyle(node).visibility !== 'hidden';
    const content = document.body.innerHTML;
    const objects = Array.from(document.querySelectorAll('main h1,main h2,main h3,main section,main article,main figure,main img,main form'))
      .filter(visible).map((node) => {
        const box = node.getBoundingClientRect();
        return { tag: node.tagName, id: node.id, text: node.textContent.trim().replace(/\s+/g, ' '),
          alt: node.getAttribute('alt'), x: box.x + window.scrollX, y: box.y + window.scrollY, width: box.width, height: box.height };
      });
    const counts = Object.fromEntries(['h1', 'h2', 'h3', 'section', 'article', 'figure', 'img', 'form'].map((tag) =>
      [tag, document.querySelectorAll('main ' + tag).length]));
    return { width: window.innerWidth, height: window.innerHeight, content, objects, counts,
      imagesComplete: Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
      overflow: document.documentElement.scrollWidth > window.innerWidth };
  });
}

async function securityAndFocus(page, origin, base, surface, requests) {
  const url = origin + base + '/authoring-proof?surface=' + encodeURIComponent(surface.key);
  await page.goto(url);
  await page.locator('#document-status').filter({ hasText: 'CSS pixels' }).waitFor();
  const frame = page.frames().find((item) => item !== page.mainFrame());
  assert.equal(await page.locator('#proof-document').getAttribute('sandbox'), 'allow-same-origin');
  assert.ok(await page.locator('#proof-document').getAttribute('title'));
  await page.getByRole('button', { name: 'Focus website document' }).click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'proof-document');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'enter-document');
  await frame.locator('a[href]').last().focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'after-document');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'proof-document');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'enter-document');
  const beforeCss = await inspect(frame);
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = 'body, h1, p, a { color: rgb(255, 0, 255) !important; font-size: 71px !important; }';
    document.head.append(style);
  });
  // Shell CSP deliberately refuses inline CSS. Also use allowed shell classes
  // and inherited properties: neither can cross the document boundary.
  await page.locator('body').evaluate((node) => { node.className = 'cc-public cc-poster'; node.style.fontSize = '71px'; node.style.color = 'magenta'; });
  const afterCss = await inspect(frame);
  assert.deepEqual(afterCss, beforeCss);
  const beforeRequests = requests.length;
  await page.evaluate(() => {
    const iframe = document.getElementById('proof-document');
    const doc = iframe.contentDocument;
    // Even removal of the HTML attribute must not remove response-header CSP.
    iframe.removeAttribute('sandbox');
    const script = doc.createElement('script');
    script.textContent = 'window.parent.__childExecuted = true';
    doc.body.append(script);
    const form = doc.querySelector('form') || doc.body.appendChild(doc.createElement('form'));
    form.setAttribute('action', '/hivenues/northline-hall/activities/friday-night-assembly-proof-0/rsvp');
    form.method = 'post';
    iframe.contentWindow.HTMLFormElement.prototype.submit.call(form);
  });
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => window.__childExecuted), undefined);
  assert.equal(requests.slice(beforeRequests).filter((item) => item.method === 'POST').length, 0);
  await page.goto(url);
  await page.locator('#document-status').filter({ hasText: 'CSS pixels' }).waitFor();
  const reloaded = page.frames().find((item) => item !== page.mainFrame());
  const action = reloaded.locator('a[aria-disabled="true"]').first();
  if (await action.count()) {
    const count = requests.length;
    await action.click({ force: true });
    await page.keyboard.press('Enter');
    assert.equal(requests.length, count);
  }
  return { namedFrame: true, enterEscapeTabShiftTab: true, hostCssIsolated: true,
    childScriptsBlocked: true, formsBlockedAfterSandboxAttributeRemoval: true, disabledLinksInert: true };
}

async function main() {
  fs.mkdirSync(path.join(root, 'screens'), { recursive: true });
  const identity = { head: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}'),
    trackedDiff: git('diff', 'HEAD', '--stat') };
  const browser = await chromium.launch({ headless: true,
    ...(process.env.HIVENUES_BROWSER_EXECUTABLE ? { executablePath: process.env.HIVENUES_BROWSER_EXECUTABLE } : {}) });
  const report = { identity, synthetic: true, viewports: VIEWPORTS, cases: [], comparisons: [], publicOverflowAudit: [], security: null, externalRequests: [], unexpectedErrors: [], expectedPolicyBlocks: [] };
  try {
    for (const specimen of authoringProofCases()) {
      const store = new HiVenuesStore({ hosts: [specimen.host], now: () => Date.parse('2026-09-16T05:30:00Z') });
      const originalState = JSON.stringify(store.exportState());
      const server = await startHiVenuesServer(createHiVenuesApp({ store, authoringProof: true, identityServices: false, participationServices: false }), { port: 0 });
      const origin = 'http://127.0.0.1:' + server.address().port;
      const context = await browser.newContext({ deviceScaleFactor: 1 });
      const requests = [];
      await context.route('**/*', (route) => {
        const request = route.request();
        if (!request.url().startsWith(origin + '/')) {
          report.externalRequests.push(request.url());
          return route.abort();
        }
        requests.push({ url: request.url(), method: request.method() });
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', (error) => report.unexpectedErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        if (/Content Security Policy|sandboxed|sandbox|script-src|style-src|form-action/i.test(message.text())) report.expectedPolicyBlocks.push(message.text());
        else report.unexpectedErrors.push(message.text());
      });
      try {
        const snapshot = store.snapshot(specimen.host.identity.slug);
        const base = '/hivenues/studio/' + specimen.host.identity.slug;
        const surfaces = documentInventory(snapshot, base + '/preview');
        report.cases.push({ id: specimen.id, family: specimen.family, schemaVersion: specimen.schemaVersion, density: specimen.density,
          revision: snapshot.revision, digest: snapshot.draftDigest,
          canonicalRoutes: surfaces.map((surface) => ({ key: surface.key, role: surface.role, path: surface.path })),
          canonicalObjects: { activities: specimen.host.activities.length, offers: specimen.host.offers.length,
            stories: specimen.host.stories?.length || 0, people: specimen.host.people?.length || 0, gallery: specimen.host.gallery?.mediaIds.length || 0 } });
        for (const [i, surface] of surfaces.entries()) {
          // Every route gets HTTP canonical comparison in the companion tests.
          // Consequence pages share one template; visually exercise applaud in
          // every specimen, plus all content/detail routes in both viewports.
          if (surface.role === 'consequence' && surface.resourceSlug !== 'applaud_hive') continue;
          const sizes = surface.role === 'home' ? Object.keys(VIEWPORTS) : ['desktop', 'phone'];
          for (const size of sizes) {
            const viewport = VIEWPORTS[size];
            await page.setViewportSize({ width: viewport.width + 80, height: viewport.height + 450 });
            const samples = [];
            for (const mode of ['studio', 'preview']) {
              const url = origin + base + '/authoring-proof?surface=' + encodeURIComponent(surface.key) + '&viewport=' + size + '&mode=' + mode;
              const response = await page.goto(url);
              assert.equal(response.status(), 200);
              await page.locator('#document-status').filter({ hasText: 'CSS pixels' }).waitFor();
              const frame = page.frames().find((item) => item !== page.mainFrame());
              await frame.waitForFunction(() => Array.from(document.images).every((img) => img.complete));
              const observation = await inspect(frame);
              assert.equal(observation.width, viewport.width);
              assert.equal(observation.height, viewport.height);
              assert.equal(observation.imagesComplete, true);
              const name = specimen.id + '-' + String(i).padStart(2, '0') + '-' + size + '-' + mode + '.png';
              const png = await page.locator('#proof-document').screenshot({ path: path.join(root, 'screens', name), animations: 'disabled' });
              samples.push({ observation, png, name });
            }
            const [studio, preview] = samples;
            assert.deepEqual(studio.observation, preview.observation, specimen.id + '/' + surface.key + '/' + size);
            assert.ok(studio.png.equals(preview.png), 'Pixel mismatch: ' + specimen.id + '/' + surface.key + '/' + size);
            report.comparisons.push({ specimen: specimen.id, surface: surface.key, role: surface.role, viewport: size,
              width: viewport.width, height: viewport.height, contentSha256: hash(studio.observation.content),
              layoutSha256: hash(JSON.stringify(studio.observation.objects)), counts: studio.observation.counts,
              overflow: studio.observation.overflow, pixelsIdentical: true, pngSha256: hash(studio.png),
              studioScreenshot: 'screens/' + studio.name, previewScreenshot: 'screens/' + preview.name });
            if (studio.observation.overflow) {
              // Diagnose canonical defects rather than hiding them in an iframe
              // or silently repairing host design in this architecture slice.
              await page.setViewportSize(viewport);
              await page.goto(origin + surface.path.replace(base + '/preview', '/hivenues/' + specimen.host.identity.slug));
              await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete));
              const visitor = await inspect(page.mainFrame());
              assert.equal(visitor.overflow, true, 'Private document introduced horizontal overflow');
              assert.deepEqual(visitor.objects, studio.observation.objects, 'Private adapter changed canonical object geometry');
              const name = specimen.id + '-' + String(i).padStart(2, '0') + '-' + size + '-public-overflow.png';
              await page.screenshot({ path: path.join(root, 'screens', name) });
              report.publicOverflowAudit.push({ specimen: specimen.id, surface: surface.key, viewport: size,
                width: viewport.width, height: viewport.height, canonicalVisitorAlsoOverflows: true,
                canonicalGeometryIdentical: true, screenshot: 'screens/' + name });
            }
          }
        }
        if (specimen.id === 'poster-v1-dense') report.security = await securityAndFocus(page, origin, base, surfaces.find((surface) => surface.role === 'activity-detail'), requests);
        assert.equal(requests.filter((item) => !['GET', 'HEAD'].includes(item.method)).length, 0);
        assert.equal(JSON.stringify(store.exportState()), originalState, 'Qualification changed synthetic state');
        console.log('PASS ' + specimen.id + ': ' + surfaces.length + ' supported HTTP route contexts');
      } finally {
        await context.close();
        await new Promise((resolve) => server.close(resolve));
      }
      fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(report, null, 2) + '\n');
    }
    assert.deepEqual(report.externalRequests, []);
    assert.deepEqual(report.unexpectedErrors, []);
    report.result = 'PASS';
    report.summary = { specimens: report.cases.length,
      supportedHttpRouteContexts: report.cases.reduce((n, item) => n + item.canonicalRoutes.length, 0),
      pixelComparisons: report.comparisons.length, screenshots: report.comparisons.length * 2,
      overflowCases: report.comparisons.filter((item) => item.overflow).map((item) => ({ specimen: item.specimen, surface: item.surface, viewport: item.viewport })) };
    console.log(JSON.stringify(report.summary, null, 2));
  } catch (error) {
    report.result = 'FAIL';
    report.failure = error.stack;
    throw error;
  } finally {
    fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(report, null, 2) + '\n');
    await browser.close();
  }
}

main().catch((error) => { console.error(error.stack); process.exitCode = 1; });
