'use strict';
/* global document */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createDogfoodApp, startDogfoodServer } = require('../src/candidate-c/dogfood-app');
const { ProvisioningFileCandidateCStore } = require('../src/candidate-c/provisioning-file-store');

const OUTPUT_ROOT = process.env.CANDIDATE_C_PRE_DOGFOOD_REVIEW_ROOT || path.join('artifacts', 'candidate-c-pre-dogfood-review');
const EXACT_SHA = process.env.CANDIDATE_C_PRE_DOGFOOD_EXACT_SHA || 'LOCAL_UNBOUND';
const PROOF_ROOT = path.join(OUTPUT_ROOT, 'truthful-zero-activity');

async function stopServer(server) {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => server.closeAllConnections?.(), 1000);
    timer.unref?.();
    server.close((error) => {
      clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    });
  });
}

async function main() {
  fs.rmSync(PROOF_ROOT, { recursive: true, force: true });
  fs.mkdirSync(PROOF_ROOT, { recursive: true });
  const statePath = path.join(PROOF_ROOT, 'state.json');
  let store = new ProvisioningFileCandidateCStore({ statePath });
  let server = await startDogfoodServer(createDogfoodApp({ store }), { port: 0 });
  let origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  let page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(20000);

  try {
    await page.goto(`${origin}/candidate-c/new`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[name="activityTitle"]').getAttribute('required'), null);
    assert.equal(await page.locator('[name="activityStartsLocal"]').getAttribute('required'), null);

    const fields = {
      displayName: 'Truthful Bar',
      archetype: 'neighborhood bar',
      timezone: 'America/Los_Angeles',
      presenceLabel: 'Reno, Nevada · open daily',
      address: '111 Example Street, Reno, NV 89501',
      tagline: 'A neighborhood place with a real local atmosphere.',
      summary: 'A browser-created venue using only facts the operator actually has.',
      contact: '(775) 324-7827',
      purpose: 'Give visitors a trustworthy front door for the place.',
      presenceMaterial: 'Dark surfaces, warm light, real venue character, and direct language.',
      participation: 'Plan a visit and understand what the place is about.',
    };
    for (const [name, value] of Object.entries(fields)) await page.locator(`[name="${name}"]`).fill(value);
    await page.locator('[name="direction"][value="hospitality"]').check();
    await Promise.all([
      page.waitForURL((url) => url.pathname === '/candidate-c/studio/truthful-bar'),
      page.getByRole('button', { name: 'Create this place' }).click(),
    ]);

    const studioText = await page.locator('body').textContent();
    assert.match(studioText, /Truthful Bar/);
    assert.equal(await page.locator('.cc-studio-rail__group').filter({ hasText: 'Activities' }).locator('button').count(), 0);
    await page.screenshot({ path: path.join(PROOF_ROOT, '01-zero-activity-studio.png'), fullPage: true });

    await page.goto(`${origin}/candidate-c/truthful-bar`, { waitUntil: 'networkidle' });
    const publicText = await page.locator('body').textContent();
    assert.match(publicText, /Truthful Bar/);
    assert.doesNotMatch(publicText, /What.s on|NEXT|CURRENT \/|Sunday|Friday Gathering/i);
    const phone = page.locator('a[href="tel:7753247827"]');
    assert.equal(await phone.count(), 1);
    assert.equal(await page.locator('a[href^="mailto:"]').count(), 0);
    const geometry = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      incompleteImages: Array.from(document.images).filter((image) => !image.complete || image.naturalWidth === 0).length,
    }));
    assert.equal(geometry.scrollWidth > geometry.clientWidth + 1, false);
    assert.equal(geometry.incompleteImages, 0);
    await page.screenshot({ path: path.join(PROOF_ROOT, '02-zero-activity-public.png'), fullPage: true });

    const before = store.snapshot('truthful-bar');
    assert.equal(before.draft.activities.length, 0);
    assert.equal(before.draft.facts.contact, '(775) 324-7827');
    assert.equal(before.releases.length, 1);
    assert.equal(before.releases[0].kind, 'full');

    await page.close();
    await stopServer(server);
    store = new ProvisioningFileCandidateCStore({ statePath });
    server = await startDogfoodServer(createDogfoodApp({ store }), { port: 0 });
    origin = `http://127.0.0.1:${server.address().port}`;
    page = await context.newPage();
    await page.goto(`${origin}/candidate-c/truthful-bar`, { waitUntil: 'networkidle' });
    assert.equal(store.snapshot('truthful-bar').draft.activities.length, 0);
    assert.equal(await page.locator('a[href="tel:7753247827"]').count(), 1);
    await page.screenshot({ path: path.join(PROOF_ROOT, '03-zero-activity-restart.png'), fullPage: true });

    const diagnostics = store.diagnostics();
    assert.deepEqual(diagnostics.external, {
      hiveRpcAttempts: 0,
      hiveWrites: 0,
      providerWrites: 0,
      payments: 0,
      signingAttempts: 0,
      deployments: 0,
    });
    fs.writeFileSync(path.join(PROOF_ROOT, 'manifest.json'), `${JSON.stringify({
      candidate: EXACT_SHA,
      finding: 'ZERO_ACTIVITY_FRESH_HOST_BROWSER_PROOF_PASS',
      slug: 'truthful-bar',
      activities: 0,
      contact: { value: '(775) 324-7827', href: 'tel:7753247827' },
      restartPersisted: true,
      external: diagnostics.external,
      screenshots: ['01-zero-activity-studio.png', '02-zero-activity-public.png', '03-zero-activity-restart.png'],
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
