'use strict';
/* global document, window */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createCandidateCH1Transport } = require('../test/support/candidate-c-h1-transport');

const OUTPUT_ROOT = process.env.CANDIDATE_C_H1_REVIEW_ROOT
  || path.join('artifacts', 'candidate-c-h1-review');
const EXPECTED_CONFLICT_CONSOLE = 'Failed to load resource: the server responded with a status of 409 (Conflict)';

function externalZero(diagnostics) {
  assert.deepEqual(diagnostics.external, {
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    deployments: 0,
  });
}

async function accessibility(page, axeSource, label) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => window.axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  }));
  const blocking = result.violations.filter((item) => ['serious', 'critical'].includes(item.impact));
  return {
    label,
    violationCount: result.violations.length,
    blockingCount: blocking.length,
    blocking: blocking.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length })),
  };
}

async function geometry(page, label) {
  return page.evaluate((pageLabel) => ({
    label: pageLabel,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }), label);
}

async function screenshot(page, name) {
  const filename = path.join(OUTPUT_ROOT, `${name}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  return filename;
}

async function main() {
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const fixture = createCandidateCH1Transport();
  assert.equal(fixture.transport.durableClientState, false);
  assert.deepEqual(fixture.transport.clientIslandResponsibilities, ['409-swap-policy', 'focus-restoration']);

  const server = await new Promise((resolve, reject) => {
    const instance = fixture.app.listen(0, '127.0.0.1', () => resolve(instance));
    instance.on('error', reject);
  });
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({ headless: true });
  const externalRequests = [];
  const consoleErrors = [];
  const expectedConflictConsoleDiagnostics = [];
  let expectedConflictConsoleAllowance = 0;
  const accessibilityFindings = [];
  const geometryFindings = [];
  const screenshots = [];
  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

  function observe(page) {
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('about:')) {
        externalRequests.push(url);
      }
    });
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const text = message.text();
      if (text === EXPECTED_CONFLICT_CONSOLE && expectedConflictConsoleAllowance > 0) {
        expectedConflictConsoleAllowance -= 1;
        expectedConflictConsoleDiagnostics.push(text);
        return;
      }
      consoleErrors.push(text);
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
  }

  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    observe(desktop);
    await desktop.goto(`${origin}/`, { waitUntil: 'networkidle' });
    assert.equal(await desktop.evaluate(() => typeof window.htmx), 'object');
    assert.equal(await desktop.locator('[data-composition="poster"]').count(), 1);
    assert.equal(await desktop.locator('a[href="/activities/friday-night-assembly"]').count() > 0, true);
    screenshots.push(await screenshot(desktop, '01-public-poster-desktop'));
    accessibilityFindings.push(await accessibility(desktop, axeSource, 'public-poster-desktop'));
    geometryFindings.push(await geometry(desktop, 'public-poster-desktop'));

    await desktop.goto(`${origin}/activities/friday-night-assembly`, { waitUntil: 'networkidle' });
    assert.equal(await desktop.getByRole('heading', { name: 'Friday Night Assembly', level: 1 }).count(), 1);
    assert.equal(await desktop.getByRole('button', { name: "I'm coming" }).count(), 1);
    assert.equal(await desktop.getByRole('link', { name: 'Raise a glass' }).count(), 1);
    screenshots.push(await screenshot(desktop, '02-activity-desktop'));
    accessibilityFindings.push(await accessibility(desktop, axeSource, 'activity-desktop'));
    geometryFindings.push(await geometry(desktop, 'activity-desktop'));

    const activityUrl = desktop.url();
    await desktop.getByRole('link', { name: 'Raise a glass' }).click();
    await desktop.waitForFunction(() => document.querySelector('#action-receipt')?.textContent?.includes('public Hive vote'));
    assert.equal(desktop.url(), activityUrl, 'HTMX should keep consequence review in the Activity page');
    assert.match(await desktop.locator('#action-receipt').textContent(), /public Hive vote/);
    await desktop.getByRole('button', { name: 'Simulate Hive vote' }).click();
    await desktop.waitForFunction(() => document.querySelector('#applause-count')?.textContent === '108');
    await desktop.waitForFunction(() => document.querySelector('#action-receipt')?.textContent?.includes('Simulation only'));
    assert.equal(desktop.url(), activityUrl, 'HTMX should keep simulation receipt in the Activity page');
    assert.equal(await desktop.locator('#pitcher').textContent(), '77%');
    assert.match(await desktop.locator('#action-receipt').textContent(), /Simulation only/);

    const tabA = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const tabB = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    observe(tabA);
    observe(tabB);
    await Promise.all([
      tabA.goto(`${origin}/studio`, { waitUntil: 'networkidle' }),
      tabB.goto(`${origin}/studio`, { waitUntil: 'networkidle' }),
    ]);
    assert.equal(await tabA.locator('script[src="/candidate-c/htmx.js"]').count(), 1);
    assert.equal(await tabA.locator('script[src="/candidate-c/studio-island.js"]').count(), 1);
    assert.equal(await tabA.evaluate(() => typeof window.htmx), 'object');

    await tabA.locator('#activity-inspector input[name="title"]').fill('Friday Night Assembly — Browser Edit');
    await tabA.locator('#activity-inspector button[type="submit"]').first().click();
    await tabA.waitForFunction(() => document.querySelector('#draft-status')?.textContent.includes('Revision 2'));
    assert.match(await tabA.locator('#activity-card-activity-friday-001').textContent(), /Browser Edit/);
    assert.match(await tabA.locator('#activity-inspector').textContent(), /Browser Edit/);
    assert.equal(await tabA.locator('#activity-inspector input[name="title"]').evaluate((element) => element === document.activeElement), true);
    screenshots.push(await screenshot(tabA, '03-studio-after-htmx-edit'));

    await tabB.locator('#activity-inspector input[name="title"]').fill('Stale overwrite attempt');
    const staleResponsePromise = tabB.waitForResponse((response) => response.url().endsWith('/studio/activity-title'));
    expectedConflictConsoleAllowance += 1;
    await tabB.locator('#activity-inspector button[type="submit"]').first().click();
    const staleResponse = await staleResponsePromise;
    assert.equal(staleResponse.status(), 409);
    await tabB.locator('#conflict').waitFor({ state: 'visible' });
    await tabB.waitForTimeout(50);
    assert.match(await tabB.locator('#conflict').textContent(), /newer draft/i);
    assert.equal(await tabB.locator('#conflict').evaluate((element) => element === document.activeElement), true);
    assert.equal(expectedConflictConsoleDiagnostics.length, 1, 'the deliberate HTTP 409 must be recorded as an expected browser diagnostic');
    assert.equal(expectedConflictConsoleAllowance, 0, 'the deliberate HTTP 409 diagnostic allowance must be consumed exactly once');
    screenshots.push(await screenshot(tabB, '04-studio-stale-conflict'));

    await tabA.reload({ waitUntil: 'networkidle' });
    await tabA.locator('select[name="familyId"]').selectOption('editorial');
    await Promise.all([
      tabA.waitForNavigation({ waitUntil: 'networkidle' }),
      tabA.getByRole('button', { name: 'Review direction change' }).click(),
    ]);
    assert.match(await tabA.locator('main').textContent(), /Browser Edit/);
    await Promise.all([
      tabA.waitForNavigation({ waitUntil: 'networkidle' }),
      tabA.getByRole('button', { name: 'Apply direction' }).click(),
    ]);
    assert.equal(await tabA.locator('[data-composition="editorial"]').count(), 1);
    assert.equal(await tabA.locator('.editorial-feature').count(), 1);
    screenshots.push(await screenshot(tabA, '05-studio-editorial-direction'));
    accessibilityFindings.push(await accessibility(tabA, axeSource, 'studio-editorial-desktop'));
    geometryFindings.push(await geometry(tabA, 'studio-editorial-desktop'));

    const releaseLink = tabA.getByRole('link', { name: 'Review release' });
    await Promise.all([
      tabA.waitForNavigation({ waitUntil: 'networkidle' }),
      releaseLink.click(),
    ]);
    assert.match(await tabA.locator('main').textContent(), /website snapshot only/i);
    assert.match(await tabA.locator('main').textContent(), /does not post to Hive/i);
    screenshots.push(await screenshot(tabA, '06-release-review'));

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    observe(mobile);
    await mobile.goto(`${origin}/studio`, { waitUntil: 'networkidle' });
    geometryFindings.push(await geometry(mobile, 'studio-mobile'));
    accessibilityFindings.push(await accessibility(mobile, axeSource, 'studio-mobile'));
    screenshots.push(await screenshot(mobile, '07-studio-mobile'));

    const noJsContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const noJs = await noJsContext.newPage();
    observe(noJs);
    await noJs.goto(`${origin}/activities/friday-night-assembly`, { waitUntil: 'load' });
    assert.equal(await noJs.getByRole('button', { name: "I'm coming" }).count(), 1);
    assert.equal(await noJs.getByRole('link', { name: 'Raise a glass' }).count(), 1);
    screenshots.push(await screenshot(noJs, '08-activity-mobile-no-js'));
    geometryFindings.push(await geometry(noJs, 'activity-mobile-no-js'));
    await noJsContext.close();

    externalZero(fixture.diagnostics());
    assert.equal(externalRequests.length, 0, `unexpected external browser requests: ${externalRequests.join(', ')}`);
    assert.equal(consoleErrors.length, 0, `unexpected browser console/page errors: ${consoleErrors.join(' | ')}`);
    assert.equal(accessibilityFindings.some((entry) => entry.blockingCount > 0), false, JSON.stringify(accessibilityFindings, null, 2));
    assert.equal(geometryFindings.some((entry) => entry.overflow), false, JSON.stringify(geometryFindings, null, 2));

    const manifest = {
      version: 3,
      candidate: process.env.GITHUB_SHA || null,
      architecture: {
        durableStateOwner: 'server',
        browserDurableStateStore: false,
        clientIslandResponsibilities: fixture.transport.clientIslandResponsibilities,
      },
      summary: {
        screenshotCount: screenshots.length,
        blockingAccessibilityFindings: accessibilityFindings.reduce((sum, entry) => sum + entry.blockingCount, 0),
        horizontalOverflowFindings: geometryFindings.filter((entry) => entry.overflow).length,
        externalRequests: externalRequests.length,
        consoleErrors: consoleErrors.length,
        expectedConflictConsoleDiagnostics: expectedConflictConsoleDiagnostics.length,
        hiveRpcAttempts: fixture.diagnostics().external.hiveRpcAttempts,
        hiveWrites: fixture.diagnostics().external.hiveWrites,
        providerWrites: fixture.diagnostics().external.providerWrites,
        payments: fixture.diagnostics().external.payments,
        signingAttempts: fixture.diagnostics().external.signingAttempts,
        deployments: fixture.diagnostics().external.deployments,
      },
      expectedDiagnostics: {
        staleRevisionHttp409: expectedConflictConsoleDiagnostics,
      },
      accessibility: accessibilityFindings,
      geometry: geometryFindings,
      screenshots,
      diagnostics: fixture.diagnostics(),
    };
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(JSON.stringify(manifest.summary, null, 2));
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
