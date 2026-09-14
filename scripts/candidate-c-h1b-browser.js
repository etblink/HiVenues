'use strict';
/* global document, window */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createCandidateCH1BSpike } = require('../test/support/candidate-c-h1b-spike');

const OUTPUT_ROOT = process.env.CANDIDATE_C_H1B_REVIEW_ROOT || path.join('artifacts', 'candidate-c-h1b-review');
const EXPECTED_CONFLICT_CONSOLE = 'Failed to load resource: the server responded with a status of 409 (Conflict)';

async function shot(page, name) {
  const filename = path.join(OUTPUT_ROOT, `${name}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  return filename;
}

async function geometry(page, label) {
  return page.evaluate((pageLabel) => ({ label: pageLabel, scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }), label);
}

async function accessibility(page, axeSource, label) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } }));
  const blocking = result.violations.filter((item) => ['serious', 'critical'].includes(item.impact));
  return { label, violationCount: result.violations.length, blockingCount: blocking.length, blocking: blocking.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length })) };
}

function externalZero(fixture) {
  assert.deepEqual(fixture.diagnostics().external, { hiveRpcAttempts: 0, hiveWrites: 0, providerWrites: 0, payments: 0, signingAttempts: 0, deployments: 0 });
}

async function main() {
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const fixture = createCandidateCH1BSpike();
  assert.equal(fixture.clientInventory.durableClientStore, false);
  assert.equal(fixture.clientInventory.files.every((item) => item.durableStateMirror === false), true);

  const server = await new Promise((resolve, reject) => {
    const instance = fixture.app.listen(0, '127.0.0.1', () => resolve(instance));
    instance.on('error', reject);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const externalRequests = [];
  const consoleErrors = [];
  const expectedConflictDiagnostics = [];
  let conflictAllowance = 0;
  const screenshots = [];
  const geometryFindings = [];
  const accessibilityFindings = [];
  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

  function observe(page) {
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('about:')) externalRequests.push(url);
    });
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const text = message.text();
      if (text === EXPECTED_CONFLICT_CONSOLE && conflictAllowance > 0) {
        conflictAllowance -= 1;
        expectedConflictDiagnostics.push(text);
        return;
      }
      consoleErrors.push(text);
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
  }

  async function currentRevision(page) {
    return Number(await page.locator('#draft-status').getAttribute('data-revision'));
  }

  async function dragSection(page, sectionId, beforeId) {
    const source = page.locator(`[data-drag-section="${sectionId}"]`);
    const target = page.locator(`[data-drop-before="${beforeId}"]`);
    await source.dragTo(target);
  }

  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    observe(desktop);

    await desktop.goto(`${origin}/studio/setup`, { waitUntil: 'networkidle' });
    assert.equal(await desktop.getByRole('heading', { name: 'Shape the world, not the widgets.' }).count(), 1);
    await desktop.locator('textarea[name="purpose"]').fill('A home for local music and late conversations');
    await desktop.locator('textarea[name="presenceMaterial"]').fill('Dark wood, amber light, close stage');
    await desktop.locator('input[name="direction"][value="poster"]').check();
    await desktop.locator('textarea[name="participation"]').fill('Attend, save the night, and support the artists');
    screenshots.push(await shot(desktop, '01-guided-direction'));
    await Promise.all([desktop.waitForNavigation({ waitUntil: 'networkidle' }), desktop.getByRole('button', { name: 'Save direction' }).click()]);
    assert.equal(await currentRevision(desktop), 2);
    assert.equal(await desktop.evaluate(() => window.CandidateCInteractionIsland?.durableStateMirror), false);

    const tabA = desktop;
    const tabB = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    observe(tabB);
    await tabB.goto(`${origin}/studio`, { waitUntil: 'networkidle' });
    assert.equal(await currentRevision(tabB), 2);

    await tabA.getByRole('button', { name: 'Edit happening' }).click();
    assert.equal(await tabA.evaluate(() => document.body.dataset.selectedResource), 'activity:activity-friday-001');
    assert.equal(tabA.url(), `${origin}/studio`);
    await tabA.locator('#panel-activity input[name="title"]').fill('Friday Night Assembly — Hand Edited');
    await tabA.locator('#panel-activity button').click();
    await tabA.waitForFunction(() => document.querySelector('#draft-status')?.dataset.revision === '3');
    assert.match(await tabA.locator('#activity-card-activity-friday-001').textContent(), /Hand Edited/);
    assert.equal(await tabA.locator('#panel-activity h2').evaluate((node) => node === document.activeElement), true);

    await tabA.getByRole('button', { name: 'Edit first impression' }).click();
    assert.equal(await tabA.evaluate(() => document.body.dataset.selectedResource), 'host:tagline');
    await tabA.locator('#panel-tagline textarea[name="tagline"]').fill('Good nights. Great company.');
    await tabA.locator('#panel-tagline button').click();
    await tabA.waitForFunction(() => document.querySelector('#draft-status')?.dataset.revision === '4');
    assert.equal(await tabA.locator('#canvas-tagline').textContent(), 'Good nights. Great company.');
    screenshots.push(await shot(tabA, '02-granular-edits'));

    const directionResponse = await tabA.request.post(`${origin}/studio/direction/propose`, { form: { familyId: 'editorial', expectedRevision: String(await currentRevision(tabA)) }, maxRedirects: 0 });
    assert.equal(directionResponse.status(), 303);
    await tabA.goto(`${origin}/studio/direction/review`, { waitUntil: 'networkidle' });
    assert.match(await tabA.locator('main').textContent(), /activity:activity-friday-001:title/);
    assert.match(await tabA.locator('main').textContent(), /host:facts:tagline/);
    assert.match(await tabA.locator('.preview-card').textContent(), /Friday Night Assembly — Hand Edited/);
    assert.match(await tabA.locator('.preview-card').textContent(), /Good nights\. Great company\./);
    screenshots.push(await shot(tabA, '03-direction-review-preserves-edits'));
    await Promise.all([tabA.waitForNavigation({ waitUntil: 'networkidle' }), tabA.getByRole('button', { name: 'Apply direction' }).click()]);
    assert.equal(await currentRevision(tabA), 5);
    assert.equal(await tabA.locator('[data-composition="editorial"]').count(), 1);
    assert.match(await tabA.locator('#studio-canvas').textContent(), /Friday Night Assembly — Hand Edited/);
    assert.match(await tabA.locator('#studio-canvas').textContent(), /Good nights\. Great company\./);

    await tabA.getByRole('button', { name: 'Edit first impression' }).click();
    const selectedBeforeReorder = await tabA.evaluate(() => document.body.dataset.selectedResource);
    const atmosphereRow = tabA.locator('#section-order li').filter({ hasText: 'Atmosphere' });
    await atmosphereRow.getByRole('button', { name: 'Up' }).click();
    await tabA.waitForFunction(() => document.querySelector('#draft-status')?.dataset.revision === '6');
    assert.equal(await tabA.evaluate(() => document.body.dataset.selectedResource), selectedBeforeReorder);
    assert.equal(await tabA.locator('#panel-tagline').isHidden(), false);
    const orderAfterKeyboard = await tabA.locator('#section-order li strong').allTextContents();
    assert.deepEqual(orderAfterKeyboard.slice(0, 4), ['First impression', 'Atmosphere', 'Happenings', 'From the room']);

    await Promise.all([tabA.reload({ waitUntil: 'networkidle' }), tabB.reload({ waitUntil: 'networkidle' })]);
    assert.equal(await currentRevision(tabA), 6);
    assert.equal(await currentRevision(tabB), 6);

    await dragSection(tabA, 'journal', 'hero');
    await tabA.waitForFunction(() => document.querySelector('#draft-status')?.dataset.revision === '7');
    const orderAfterDrag = await tabA.locator('#section-order li strong').allTextContents();
    assert.equal(orderAfterDrag[0], 'From the room');

    conflictAllowance += 1;
    await dragSection(tabB, 'hero', 'journal');
    await tabB.locator('#conflict-message').waitFor({ state: 'visible' });
    assert.match(await tabB.locator('#conflict-message').textContent(), /newer draft exists/i);
    assert.equal(await tabB.locator('#conflict-message').evaluate((node) => node === document.activeElement), true);
    assert.equal(expectedConflictDiagnostics.length, 1);
    assert.equal(conflictAllowance, 0);
    assert.equal(fixture.state.snapshot().revision, 7);
    screenshots.push(await shot(tabB, '04-stale-direct-manipulation-conflict'));

    await tabA.reload({ waitUntil: 'networkidle' });
    await tabA.getByRole('button', { name: 'Adjust image focus' }).click();
    const preview = tabA.locator('#focal-preview');
    const box = await preview.boundingBox();
    assert.ok(box);
    const originalX = await preview.getAttribute('data-server-x');
    await tabA.mouse.click(box.x + box.width * 0.78, box.y + box.height * 0.32);
    const transientX = await tabA.locator('#focal-form input[name="x"]').inputValue();
    assert.notEqual(transientX, originalX);
    await tabA.getByRole('button', { name: 'Cancel preview' }).click();
    assert.equal(await tabA.locator('#focal-form input[name="x"]').inputValue(), originalX);
    await tabA.mouse.click(box.x + box.width * 0.68, box.y + box.height * 0.28);
    const committedX = await tabA.locator('#focal-form input[name="x"]').inputValue();
    await tabA.getByRole('button', { name: 'Commit focus' }).click();
    await tabA.waitForFunction(() => document.querySelector('#draft-status')?.dataset.revision === '8');
    assert.equal(await tabA.locator('#focal-preview').getAttribute('data-server-x'), committedX);
    assert.equal(await tabA.evaluate(() => document.body.dataset.selectedResource), 'media:media-hero-001');
    screenshots.push(await shot(tabA, '05-media-focal-commit'));

    await tabA.reload({ waitUntil: 'networkidle' });
    assert.equal(await currentRevision(tabA), 8);
    assert.equal(await tabA.locator('[data-composition="editorial"]').count(), 1);
    assert.match(await tabA.locator('#studio-canvas').textContent(), /Hand Edited/);
    assert.match(await tabA.locator('#studio-canvas').textContent(), /Good nights\. Great company\./);
    assert.equal(await tabA.evaluate(() => window.CandidateCInteractionIsland?.durableStateMirror), false);
    geometryFindings.push(await geometry(tabA, 'studio-desktop-reconstructed'));
    accessibilityFindings.push(await accessibility(tabA, axeSource, 'studio-desktop-reconstructed'));

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    observe(mobile);
    await mobile.goto(`${origin}/studio`, { waitUntil: 'networkidle' });
    geometryFindings.push(await geometry(mobile, 'studio-mobile-canvas'));
    screenshots.push(await shot(mobile, '06-mobile-canvas-first'));
    const mobileUrl = mobile.url();
    await mobile.getByRole('button', { name: 'Edit happening' }).click();
    assert.equal(mobile.url(), mobileUrl);
    assert.equal(await mobile.locator('#context-sheet').getAttribute('data-open'), 'true');
    assert.equal(await mobile.locator('#panel-activity').isHidden(), false);
    screenshots.push(await shot(mobile, '07-mobile-context-sheet'));
    await mobile.locator('#panel-activity input[name="title"]').fill('Friday Night Assembly — Mobile Edit');
    await mobile.locator('#panel-activity button').click();
    await mobile.waitForFunction(() => document.querySelector('#draft-status')?.dataset.revision === '9');
    assert.equal(await mobile.locator('#panel-activity h2').evaluate((node) => node === document.activeElement), true);
    assert.match(await mobile.locator('#activity-card-activity-friday-001').textContent(), /Mobile Edit/);
    geometryFindings.push(await geometry(mobile, 'studio-mobile-after-save'));
    accessibilityFindings.push(await accessibility(mobile, axeSource, 'studio-mobile-after-save'));
    screenshots.push(await shot(mobile, '08-mobile-after-save'));

    await mobile.getByRole('link', { name: 'Direction' }).first().click();
    await mobile.waitForLoadState('networkidle');
    assert.match(mobile.url(), /\/studio\/setup$/);
    await mobile.goBack({ waitUntil: 'networkidle' });
    assert.match(mobile.url(), /\/studio$/);
    assert.match(await mobile.locator('#studio-canvas').textContent(), /Mobile Edit/);

    externalZero(fixture);
    assert.equal(externalRequests.length, 0, `unexpected external requests: ${externalRequests.join(', ')}`);
    assert.equal(consoleErrors.length, 0, `unexpected console/page errors: ${consoleErrors.join(' | ')}`);
    assert.equal(geometryFindings.some((entry) => entry.overflow), false, JSON.stringify(geometryFindings, null, 2));
    assert.equal(accessibilityFindings.some((entry) => entry.blockingCount > 0), false, JSON.stringify(accessibilityFindings, null, 2));

    const snapshot = fixture.state.snapshot();
    const manifest = {
      version: 1,
      candidate: process.env.GITHUB_SHA || null,
      architecture: {
        recommendationCandidate: 'H1_CONTINUE',
        durableStateOwner: fixture.transport.durableStateOwner,
        browserDurableStateStore: fixture.transport.durableClientState,
        clientIslands: fixture.clientInventory,
        swapInstrumentation: {
          targetedSwapRegionsPerOrdinaryEdit: fixture.transport.targetedSwapRegionsPerOrdinaryEdit,
          oobRegionsPerOrdinaryEdit: fixture.transport.oobRegionsPerOrdinaryEdit,
        },
      },
      interactionEvidence: {
        guidedSetupSameGraph: true,
        protectedGranularEditsSurvivedDirection: true,
        keyboardReorderExercised: true,
        dragReorderExercised: true,
        staleDirectManipulationConflict409: true,
        selectionSurvivedUnrelatedSwap: true,
        focalPreviewCancelNonDurable: true,
        focalCommitServerRevision: true,
        refreshReconstructedServerState: true,
        mobileContextualEditor: true,
        mobileHistoryRoundTrip: true,
        noJsFallbackPracticalTasks: ['guided setup forms', 'granular forms', 'keyboard reorder forms'],
      },
      summary: {
        screenshotCount: screenshots.length,
        blockingAccessibilityFindings: accessibilityFindings.reduce((sum, item) => sum + item.blockingCount, 0),
        horizontalOverflowFindings: geometryFindings.filter((item) => item.overflow).length,
        externalRequests: externalRequests.length,
        unexpectedConsoleErrors: consoleErrors.length,
        expectedConflictDiagnostics: expectedConflictDiagnostics.length,
        finalRevision: snapshot.revision,
        customClientFiles: fixture.clientInventory.files.length,
        customClientLines: fixture.clientInventory.files.reduce((sum, item) => sum + item.lines, 0),
        hiveRpcAttempts: fixture.diagnostics().external.hiveRpcAttempts,
        hiveWrites: fixture.diagnostics().external.hiveWrites,
        providerWrites: fixture.diagnostics().external.providerWrites,
        payments: fixture.diagnostics().external.payments,
        signingAttempts: fixture.diagnostics().external.signingAttempts,
        deployments: fixture.diagnostics().external.deployments,
      },
      clientInventory: fixture.clientInventory,
      diagnostics: fixture.diagnostics(),
      geometry: geometryFindings,
      accessibility: accessibilityFindings,
      screenshots,
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
