'use strict';
/* global document, window */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');
const { CandidateCStore } = require('../src/candidate-c/store');
const { createCandidateCRouter } = require('../src/candidate-c/router');

const OUTPUT_ROOT = process.env.CANDIDATE_C_PHASE2A_REVIEW_ROOT || path.join('artifacts', 'candidate-c-phase2a-review');
const EXACT_SHA = process.env.CANDIDATE_C_PHASE2A_EXACT_SHA || 'LOCAL_UNBOUND';
const FIXED_NOW = Date.parse('2026-09-14T18:30:00.000Z');

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

function shotPath(name) {
  return path.join(OUTPUT_ROOT, `${name}.png`);
}

async function screenshot(page, name) {
  const filename = shotPath(name);
  await page.screenshot({ path: filename, fullPage: true });
  return path.basename(filename);
}

async function pageGeometry(page, label) {
  return page.evaluate((pageLabel) => ({
    label: pageLabel,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    incompleteImages: Array.from(document.images).filter((img) => !img.complete || img.naturalWidth === 0).length,
  }), label);
}

async function axeAudit(page, axeSource, label) {
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

function readClientInventory() {
  const filename = path.join(__dirname, '..', 'public', 'js', 'candidate-c-studio.js');
  const source = fs.readFileSync(filename, 'utf8');
  const lineCount = source.split(/\r?\n/).length;
  return {
    files: [{
      path: 'public/js/candidate-c-studio.js',
      lines: lineCount,
      durableStateMirror: /durableStateMirror:\s*false/.test(source) ? false : 'UNKNOWN',
      responsibilities: [
        'mobile contextual inspector open/close',
        'focus restoration after server-rendered swaps',
        'transient focal-point preview',
        'transient save-state messaging',
        'server-rendered stale-conflict presentation',
        'history restoration revalidation against the server revision',
      ],
    }],
    totalFiles: 1,
    totalLines: lineCount,
    durableClientStore: false,
  };
}

async function main() {
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });

  const store = new CandidateCStore({ now: () => FIXED_NOW });
  const app = makeApp(store);
  const server = await startServer(app);
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  const externalRequests = [];
  const consoleErrors = [];
  const expectedConflictDiagnostics = [];
  const screenshots = [];
  const geometry = [];
  const accessibility = [];
  const history = [];
  const transactions = [];

  function observe(page) {
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('about:')) {
        externalRequests.push(url);
      }
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
    assert(response, `No navigation response for ${pathname}`);
    assert(response.ok(), `${pathname} returned ${response.status()}`);
    return response;
  }

  async function audit(page, label) {
    geometry.push(await pageGeometry(page, label));
    accessibility.push(await axeAudit(page, axeSource, label));
  }

  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    observe(desktop);

    await gotoOk(desktop, '/candidate-c/northline-hall');
    assert.match(await desktop.locator('body').getAttribute('class'), /cc-poster/);
    assert.equal(await desktop.locator('.cc-poster-night').count(), 1);
    screenshots.push(await screenshot(desktop, '01-r1-northline-public-desktop'));
    await audit(desktop, 'r1-public-desktop');

    await gotoOk(desktop, '/candidate-c/nova-ashby');
    assert.match(await desktop.locator('body').getAttribute('class'), /cc-editorial/);
    assert.equal(await desktop.locator('.cc-editorial-session').count(), 1);
    screenshots.push(await screenshot(desktop, '02-r2-nova-public-desktop'));
    await audit(desktop, 'r2-public-desktop');

    await gotoOk(desktop, '/candidate-c/northline-hall/activities/friday-night-assembly');
    assert.match(await desktop.locator('h1').textContent(), /Friday Night Assembly/);
    assert.match(await desktop.getByRole('button', { name: 'Save me a spot' }).textContent(), /Save me a spot/);
    screenshots.push(await screenshot(desktop, '03-r1-activity-desktop'));
    await audit(desktop, 'r1-activity-desktop');

    await gotoOk(desktop, '/candidate-c/studio/northline-hall');
    assert.equal(await desktop.locator('#draft-status').getAttribute('data-revision'), '1');
    assert.equal(await desktop.evaluate(() => window.CandidateCStudio?.durableStateMirror), false);
    screenshots.push(await screenshot(desktop, '04-studio-r1-desktop-canvas'));
    await audit(desktop, 'studio-r1-desktop');

    await desktop.getByRole('button', { name: 'Edit first impression' }).click();
    await desktop.locator('#candidate-inspector[data-open="true"]').waitFor();
    await desktop.locator('#cc-tagline').fill('Good nights. Great company.');
    const editResponsePromise = desktop.waitForResponse((response) => response.url().endsWith('/candidate-c/studio/northline-hall/tagline') && response.request().method() === 'POST');
    await desktop.getByRole('button', { name: 'Save headline' }).click();
    const editResponse = await editResponsePromise;
    assert.equal(editResponse.status(), 200);
    const editHtml = await editResponse.text();
    const oobRegions = (editHtml.match(/hx-swap-oob=/g) || []).length;
    transactions.push({ name: 'ordinary-tagline-edit', targetedRegions: 1, oobRegions, totalUpdatedRegions: 1 + oobRegions });
    assert.equal(oobRegions, 2);
    await desktop.waitForFunction(() => document.querySelector('#draft-status')?.dataset.revision === '2');
    await desktop.getByText('Saved to draft', { exact: true }).waitFor();
    assert.match(await desktop.locator('#candidate-canvas').textContent(), /Good nights\. Great company\./);
    screenshots.push(await screenshot(desktop, '05-studio-r1-contextual-edit'));

    const staleTab = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    observe(staleTab);
    await gotoOk(staleTab, '/candidate-c/studio/northline-hall');
    assert.equal(await staleTab.locator('#draft-status').getAttribute('data-revision'), '2');
    await staleTab.getByRole('button', { name: 'Edit first impression' }).click();
    await staleTab.locator('#candidate-inspector[data-open="true"]').waitFor();
    assert.equal(await staleTab.locator('input[name="expectedRevision"]').first().inputValue(), '2');
    await staleTab.locator('#cc-tagline').fill('Stale browser overwrite.');
    const serverEdit = store.editTagline('northline-hall', 'Server-newer headline.', 2);
    assert.equal(serverEdit.ok, true);
    const staleResponsePromise = staleTab.waitForResponse((response) => response.url().endsWith('/candidate-c/studio/northline-hall/tagline') && response.request().method() === 'POST');
    await staleTab.getByRole('button', { name: 'Save headline' }).click();
    const staleResponse = await staleResponsePromise;
    assert.equal(staleResponse.status(), 409);
    await staleTab.getByText('A newer draft exists.').waitFor();
    await staleTab.getByText('Not saved', { exact: true }).waitFor();
    assert.equal(store.snapshot('northline-hall').draft.facts.tagline, 'Server-newer headline.');
    screenshots.push(await screenshot(staleTab, '06-studio-stale-conflict'));
    await staleTab.close();

    // The stale-write probe deliberately creates diagnostic server copy. Restore the
    // authored operator-facing draft before Direction and release visual evidence.
    const northlineVisualReset = store.editTagline('northline-hall', 'Good nights. Great company.', 3);
    assert.equal(northlineVisualReset.ok, true);

    await gotoOk(desktop, '/candidate-c/studio/northline-hall/direction');
    const directionResponse = await desktop.request.post(`${origin}/candidate-c/studio/northline-hall/direction/propose`, {
      form: { expectedRevision: '4', familyId: 'editorial' },
      maxRedirects: 0,
    });
    assert.equal(directionResponse.status(), 303);
    const location = directionResponse.headers().location;
    assert(location);
    await gotoOk(desktop, location);
    assert.match(await desktop.getByText('Same place. Different composition.').textContent(), /Same place/);
    assert.equal(await desktop.locator('.cc-studio-canvas--poster').count(), 1);
    assert.equal(await desktop.locator('.cc-studio-canvas--editorial').count(), 1);
    screenshots.push(await screenshot(desktop, '07-direction-review-desktop'));
    await audit(desktop, 'direction-review-desktop');

    await gotoOk(desktop, '/candidate-c/studio/northline-hall/release');
    assert.match(await desktop.getByRole('heading', { level: 1 }).textContent(), /Publish the website snapshot/);
    screenshots.push(await screenshot(desktop, '08-release-review-desktop'));
    await audit(desktop, 'release-review-desktop');

    const historyPage = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    observe(historyPage);
    await historyPage.addInitScript(() => {
      window.__ccHistoryEvents = [];
      window.addEventListener('pageshow', (event) => window.__ccHistoryEvents.push({ persisted: event.persisted }));
    });
    await gotoOk(historyPage, '/candidate-c/studio/nova-ashby');
    const beforeHistory = Number(await historyPage.locator('#draft-status').getAttribute('data-revision'));
    await historyPage.getByRole('link', { name: 'Preview' }).evaluate((node) => node.removeAttribute('target'));
    await Promise.all([
      historyPage.waitForNavigation({ waitUntil: 'networkidle' }),
      historyPage.getByRole('link', { name: 'Preview' }).click(),
    ]);
    const externalMutation = store.editTagline('nova-ashby', 'Server truth after history navigation.', beforeHistory);
    assert.equal(externalMutation.ok, true);
    await historyPage.goBack({ waitUntil: 'networkidle' });
    await historyPage.waitForFunction((expected) => Number(document.querySelector('#draft-status')?.dataset.revision) === expected, externalMutation.snapshot.revision);
    const historyEvents = await historyPage.evaluate(() => window.__ccHistoryEvents || []);
    history.push({
      name: 'studio-back-navigation',
      beforeRevision: beforeHistory,
      serverRevision: externalMutation.snapshot.revision,
      renderedRevision: Number(await historyPage.locator('#draft-status').getAttribute('data-revision')),
      pageShowEvents: historyEvents,
      serverTruthRestored: true,
    });
    await historyPage.close();

    // The history probe also writes diagnostic copy. Put Nova back into its authored
    // voice before taking operator-facing mobile visual evidence.
    const visualReset = store.editTagline('nova-ashby', 'Cities that do not exist yet.', externalMutation.snapshot.revision);
    assert.equal(visualReset.ok, true);
    history[0].visualEvidenceRevision = visualReset.snapshot.revision;

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    observe(mobile);

    await gotoOk(mobile, '/candidate-c/northline-hall');
    screenshots.push(await screenshot(mobile, '09-r1-northline-public-mobile'));
    await audit(mobile, 'r1-public-mobile');

    await gotoOk(mobile, '/candidate-c/nova-ashby');
    screenshots.push(await screenshot(mobile, '10-r2-nova-public-mobile'));
    await audit(mobile, 'r2-public-mobile');

    await gotoOk(mobile, '/candidate-c/studio/nova-ashby');
    screenshots.push(await screenshot(mobile, '11-studio-r2-mobile-canvas'));
    await audit(mobile, 'studio-r2-mobile-canvas');
    await mobile.getByRole('button', { name: 'Edit first impression' }).click();
    await mobile.locator('#candidate-inspector[data-open="true"]').waitFor();
    await mobile.waitForFunction(() => {
      const node = document.querySelector('#candidate-inspector[data-open="true"]');
      return Boolean(node && node.getBoundingClientRect().bottom <= window.innerHeight + 2);
    });
    assert.equal(await mobile.locator('#candidate-inspector').evaluate((node) => node.getBoundingClientRect().bottom <= window.innerHeight + 2), true);
    screenshots.push(await screenshot(mobile, '12-studio-r2-mobile-context-sheet'));
    await audit(mobile, 'studio-r2-mobile-context-sheet');

    const rsvp = await mobile.request.post(`${origin}/candidate-c/northline-hall/activities/friday-night-assembly/rsvp`, {
      form: { name: 'Browser Guest' },
    });
    assert.equal(rsvp.status(), 200);
    const ics = await mobile.request.get(`${origin}/candidate-c/northline-hall/activities/friday-night-assembly/calendar.ics`);
    assert.equal(ics.status(), 200);
    assert.match(await ics.text(), /BEGIN:VEVENT/);

    const diagnostics = store.diagnostics();
    assert.deepEqual(diagnostics.external, {
      hiveRpcAttempts: 0,
      hiveWrites: 0,
      providerWrites: 0,
      payments: 0,
      signingAttempts: 0,
      deployments: 0,
    });

    const clientInventory = readClientInventory();
    assert.equal(clientInventory.durableClientStore, false);
    assert.equal(clientInventory.files[0].durableStateMirror, false);
    assert(clientInventory.totalLines < 150);

    const summary = {
      screenshotCount: screenshots.length,
      blockingAccessibilityFindings: accessibility.reduce((sum, item) => sum + item.blockingCount, 0),
      horizontalOverflowFindings: geometry.filter((item) => item.overflow).length,
      incompleteImageFindings: geometry.reduce((sum, item) => sum + item.incompleteImages, 0),
      externalRequests: externalRequests.length,
      unexpectedConsoleErrors: consoleErrors.length,
      expectedConflictDiagnostics: expectedConflictDiagnostics.length,
      customClientFiles: clientInventory.totalFiles,
      customClientLines: clientInventory.totalLines,
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
      phase: 'CANDIDATE_C_2A_FIRST_PRODUCTION_PATH_SLICE',
      candidate: EXACT_SHA,
      generatedAt: new Date(FIXED_NOW).toISOString(),
      runtime: {
        node: process.version,
        chromium: await browser.version(),
        host: '127.0.0.1 ephemeral',
      },
      references: {
        r1: 'northline-hall / physical live-music / poster composition',
        r2: 'nova-ashby / locationless creator / editorial composition',
      },
      screenshots,
      geometry,
      accessibility,
      transactions,
      history,
      clientInventory,
      externalRequests,
      consoleErrors,
      expectedConflictDiagnostics,
      diagnostics,
      summary,
      finding: 'BROWSER_EVIDENCE_READY_FOR_PROJECT_LEAD_VISUAL_REVIEW',
    };
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'README.txt'), [
      'Candidate C Phase 2A browser evidence',
      `Exact candidate: ${EXACT_SHA}`,
      `Screenshots: ${summary.screenshotCount}`,
      `Blocking accessibility findings: ${summary.blockingAccessibilityFindings}`,
      `Horizontal overflow findings: ${summary.horizontalOverflowFindings}`,
      `External requests: ${summary.externalRequests}`,
      `Unexpected console/page errors: ${summary.unexpectedConsoleErrors}`,
      `Custom client: ${summary.customClientFiles} file / ${summary.customClientLines} lines`,
      'Visual/product acceptance is NOT implied by this automated qualification.',
      '',
    ].join('\n'));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
