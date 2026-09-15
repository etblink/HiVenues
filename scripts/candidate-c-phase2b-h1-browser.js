'use strict';
/* global document, window */

/**
 * Workstream F — H1 stress test / client-island accounting.
 *
 * Measures the actual final Candidate C implementation in Chromium rather than
 * an assumed architecture:
 *  - exact custom client island inventory (files, lines, declared responsibilities);
 *  - per-edit targeted/OOB region counts for every representative Studio edit,
 *    including Media focal, the D controls and the E status control;
 *  - focus/selection behavior after server swaps;
 *  - stale-conflict behavior (409 renders, nothing saved, revision unchanged);
 *  - refresh and BFCache/history reconstruction against server truth;
 *  - no browser storage and no client-side mirror of durable state;
 *  - the Workstream E urgent path and Studio saves work with JavaScript disabled.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { chromium } = require('playwright');
const { CandidateCStore } = require('../src/candidate-c/store');
const { createCandidateCRouter } = require('../src/candidate-c/router');

const OUTPUT_ROOT = process.env.CANDIDATE_C_PHASE2B_H1_REVIEW_ROOT || path.join('artifacts', 'candidate-c-phase2b-h1-review');
const EXACT_SHA = process.env.CANDIDATE_C_PHASE2B_EXACT_SHA || 'LOCAL_UNBOUND';
const FIXED_NOW = Date.parse('2026-09-14T23:45:00.000Z');
const SLUG = 'harbor-and-hearth';
const ACTIVITY = 'activity-harbor-supper-001';

const CLIENT_FILES = ['public/js/candidate-c-studio.js'];

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

function readClientInventory() {
  const root = path.join(__dirname, '..');
  const files = CLIENT_FILES.map((file) => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const lines = source.split('\n').length - (source.endsWith('\n') ? 1 : 0);
    return {
      file,
      lines,
      bytes: Buffer.byteLength(source),
      usesBrowserStorage: /localStorage|sessionStorage|indexedDB/.test(source),
      usesFetch: /fetch\(/.test(source),
    };
  });
  const viewRoot = path.join(root, 'views', 'candidate-c');
  const inlineScripts = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ejs')) {
        const source = fs.readFileSync(full, 'utf8');
        const inline = source.match(/<script(?![^>]*src=)[^>]*>/g) || [];
        const handlers = source.match(/\son[a-z]+=|hx-on/g) || [];
        if (inline.length || handlers.length) inlineScripts.push({ file: path.relative(root, full), inline: inline.length, handlers: handlers.length });
      }
    }
  };
  walk(viewRoot);
  return {
    files,
    totalFiles: files.length,
    totalLines: files.reduce((sum, item) => sum + item.lines, 0),
    inlineScriptsInViews: inlineScripts,
    libraries: ['htmx.org (local, unmodified)'],
  };
}

async function main() {
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const store = new CandidateCStore({ now: () => FIXED_NOW });
  const server = await startServer(makeApp(store));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const consoleErrors = [];
  const externalRequests = [];
  const expectedConflictDiagnostics = [];
  const edits = [];
  const screenshots = [];

  function observe(page) {
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('about:')) externalRequests.push(url);
    });
    page.on('pageerror', (error) => consoleErrors.push({ type: 'pageerror', text: error.message }));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      const text = message.text();
      if (/409|Response Status Error Code 409/i.test(text)) expectedConflictDiagnostics.push(text);
      else consoleErrors.push({ type: 'console', text });
    });
  }

  async function capture(page, name) {
    const filename = path.join(OUTPUT_ROOT, `${name}.png`);
    await page.screenshot({ path: filename, fullPage: true });
    screenshots.push(path.basename(filename));
  }

  async function currentRevision(page) {
    return page.locator('#draft-status').getAttribute('data-revision');
  }

  /** Perform one HTMX edit and measure the server response regions plus focus/selection. */
  async function measureEdit(page, label, routeSuffix, act) {
    const before = Number(await currentRevision(page));
    const responsePromise = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/${routeSuffix}`) && response.request().method() === 'POST');
    await act();
    const response = await responsePromise;
    const html = await response.text();
    const oob = (html.match(/hx-swap-oob="/g) || []).length;
    const targeted = 1;
    await page.waitForFunction((value) => document.querySelector('#draft-status')?.dataset.revision === String(value), before + 1);
    // Focus restoration happens in the island's htmx:afterSwap handler; give it one frame.
    await page.waitForFunction(() => Boolean(document.activeElement && document.activeElement.closest('#candidate-inspector')), null, { timeout: 2000 }).catch(() => {});
    const focus = await page.evaluate(() => {
      const active = document.activeElement;
      return { tag: active?.tagName || null, insideInspector: Boolean(active && active.closest('#candidate-inspector')), text: (active?.textContent || '').trim().slice(0, 60) };
    });
    const selection = await page.locator('#candidate-inspector').evaluate((node) => ({ open: node.dataset.open, heading: node.querySelector('h2')?.textContent.trim() || '' }));
    const saveState = await page.locator('#cc-save-state').textContent();
    const record = {
      label,
      route: routeSuffix,
      status: response.status(),
      targetedRegions: targeted,
      oobRegions: oob,
      totalRegions: targeted + oob,
      responseBytes: Buffer.byteLength(html),
      revisionBefore: before,
      revisionAfter: before + 1,
      serverRevisionAfter: store.snapshot(SLUG).revision,
      focus,
      selection,
      saveState,
    };
    assert.equal(record.status, 200, label);
    assert.equal(record.serverRevisionAfter, before + 1, label);
    assert.equal(focus.insideInspector, true, `${label}: focus returned to inspector`);
    assert.equal(selection.open, 'true', `${label}: inspector stays open`);
    edits.push(record);
    return record;
  }

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    observe(page);
    await page.goto(`${origin}/candidate-c/studio/${SLUG}`, { waitUntil: 'networkidle' });

    // Inventory as the island declares it at runtime.
    const declared = await page.evaluate(() => window.CandidateCStudio);
    assert.equal(declared.durableStateMirror, false);

    // Representative edits, one per Studio control (A–D plus E status).
    await page.getByRole('button', { name: 'First impression', exact: true }).click();
    await page.locator('#cc-tagline').waitFor();
    await measureEdit(page, 'Page · headline', 'tagline', async () => {
      await page.locator('#cc-tagline').fill('Dinner follows the tide — measured.');
      await page.getByRole('button', { name: 'Save headline' }).click();
    });

    await page.getByRole('button', { name: 'Sunday Table — Harvest Supper' }).click();
    await page.locator('#cc-activity-title').waitFor();
    await measureEdit(page, 'Activity · text', 'activity', async () => {
      await page.locator('#cc-activity-title').fill('Sunday Table — Harvest Supper (measured)');
      await page.getByRole('button', { name: 'Save activity' }).click();
    });
    await measureEdit(page, 'Activity · status (E draft path)', 'activity-status', async () => {
      await page.locator('#cc-activity-lifecycle').selectOption('cancelled');
      await page.locator('#cc-activity-status-note').fill('Measured cancellation note.');
      await page.getByRole('button', { name: 'Save status' }).click();
    });
    assert.equal(await page.locator('#candidate-canvas [data-activity-status="cancelled"]').count(), 1);

    await page.getByRole('button', { name: 'Coal-roasted carrots' }).click();
    await page.locator('#cc-offer-title').waitFor();
    await measureEdit(page, 'Offer · fields (D)', 'offer', async () => {
      await page.locator('#cc-offer-price').fill('$18');
      await page.getByRole('button', { name: 'Save offer' }).click();
    });

    await page.getByRole('button', { name: 'Look' }).click();
    await page.locator('#cc-look-accent').waitFor();
    await measureEdit(page, 'Look · accent (D)', 'look', async () => {
      await page.locator('#cc-look-accent').selectOption('#244653');
      await page.getByRole('button', { name: 'Save look' }).click();
    });

    await page.getByRole('button', { name: 'Voice' }).click();
    await page.locator('#candidate-inspector').getByRole('button', { name: 'Edit', exact: true }).first().click();
    await page.locator('#cc-voice-term').waitFor();
    await measureEdit(page, 'Voice · term (D)', 'voice', async () => {
      await page.locator('#cc-voice-term').fill('Keep me a seat');
      await page.getByRole('button', { name: 'Save wording' }).click();
    });

    await page.getByRole('button', { name: 'Connect' }).click();
    await page.locator('#cc-contact').waitFor();
    await measureEdit(page, 'Connect · contact (D)', 'connect', async () => {
      await page.locator('#cc-contact').fill('measured@harborandhearth.example');
      await page.getByRole('button', { name: 'Save contact' }).click();
    });

    // Media focal: slider movement is transient (no request) until Save.
    await page.getByRole('button', { name: 'Media' }).click();
    await page.locator('#cc-focal-x').waitFor();
    const requestsDuringPreview = [];
    const previewListener = (request) => { if (request.method() === 'POST') requestsDuringPreview.push(request.url()); };
    page.on('request', previewListener);
    await page.locator('#cc-focal-x').fill('20');
    await page.locator('#cc-focal-y').fill('80');
    await page.waitForTimeout(150);
    page.off('request', previewListener);
    const previewVars = await page.locator('[data-focal-preview]').evaluate((node) => [node.style.getPropertyValue('--cc-fx'), node.style.getPropertyValue('--cc-fy')]);
    assert.deepEqual(previewVars, ['20%', '80%']);
    assert.equal(requestsDuringPreview.length, 0, 'focal preview must not write');
    const focalBefore = structuredClone(store.snapshot(SLUG).draft.media[0].focal);
    await measureEdit(page, 'Media · focal (B)', 'media', async () => {
      await page.getByRole('button', { name: 'Save focal point' }).click();
    });
    assert.deepEqual(store.snapshot(SLUG).draft.media[0].focal, { x: 20, y: 80 });
    assert.notDeepEqual(store.snapshot(SLUG).draft.media[0].focal, focalBefore);

    await page.getByRole('button', { name: 'Section order' }).click();
    await page.getByRole('button', { name: /Move .* later/ }).first().waitFor();
    await measureEdit(page, 'Page · section order', 'move', async () => {
      await page.getByRole('button', { name: /Move .* later/ }).first().click();
    });
    await measureEdit(page, 'Undo', 'undo', async () => {
      await page.getByRole('button', { name: 'Undo last edit' }).click();
    });
    await capture(page, '01-h1-after-representative-edits');

    // Stale conflict: another writer moves the draft; this panel holds old tokens.
    await page.getByRole('button', { name: 'Look' }).click();
    await page.locator('#cc-look-accent').waitFor();
    const staleTokens = store.snapshot(SLUG);
    assert.equal(store.editTagline(SLUG, 'Another writer.', staleTokens.revision, staleTokens.draftDigest).ok, true);
    const staleResponse = page.waitForResponse((response) => response.url().endsWith(`/candidate-c/studio/${SLUG}/look`) && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save look' }).click();
    assert.equal((await staleResponse).status(), 409);
    await page.locator('#candidate-inspector [role="alert"]').waitFor();
    const conflict = {
      status: 409,
      panelText: (await page.locator('#candidate-inspector').textContent()).replace(/\s+/g, ' ').trim().slice(0, 160),
      saveState: await page.locator('#cc-save-state').textContent(),
      renderedRevision: await currentRevision(page),
      serverRevision: store.snapshot(SLUG).revision,
      draftUnchangedByStaleWrite: store.snapshot(SLUG).draft.presentation.accent === '#244653',
    };
    assert.equal(conflict.saveState, 'Not saved');
    assert.equal(Number(conflict.renderedRevision), conflict.serverRevision - 1, 'stale document still shows its old revision until reload');
    await capture(page, '02-h1-stale-conflict');

    // Refresh reconstruction: reload shows server truth, nothing from client state.
    await page.reload({ waitUntil: 'networkidle' });
    const afterReload = { renderedRevision: await currentRevision(page), serverRevision: store.snapshot(SLUG).revision, canvasHeadline: (await page.locator('#candidate-canvas h1').textContent()).trim() };
    assert.equal(Number(afterReload.renderedRevision), afterReload.serverRevision);
    assert.equal(afterReload.canvasHeadline, 'Another writer.');

    // BFCache/history: navigate away, mutate server-side, come back — pageshow reconcile reloads to server truth.
    await page.goto(`${origin}/candidate-c/studio/${SLUG}/release`, { waitUntil: 'networkidle' });
    const t = store.snapshot(SLUG);
    assert.equal(store.editTagline(SLUG, 'Changed while away.', t.revision, t.draftDigest).ok, true);
    await page.goBack({ waitUntil: 'networkidle' });
    await page.waitForFunction((value) => document.querySelector('#draft-status')?.dataset.revision === String(value), store.snapshot(SLUG).revision);
    const history = { renderedRevisionAfterBack: await currentRevision(page), serverRevision: store.snapshot(SLUG).revision, canvasHeadline: (await page.locator('#candidate-canvas h1').textContent()).trim() };
    assert.equal(history.canvasHeadline, 'Changed while away.');

    // Browser storage stays empty; no client global mirrors the graph.
    const storage = await page.evaluate(() => ({
      localStorage: Object.keys(window.localStorage),
      sessionStorage: Object.keys(window.sessionStorage).map((key) => ({ key, value: String(window.sessionStorage.getItem(key)).slice(0, 80) })),
      studioGlobalKeys: Object.keys(window.CandidateCStudio || {}),
    }));
    assert.deepEqual(storage.localStorage, []);
    // htmx keeps only its own current-path bookkeeping key; no HiVenues state is stored client-side.
    assert.ok(storage.sessionStorage.every((item) => item.key.startsWith('htmx-')), JSON.stringify(storage.sessionStorage));
    assert.deepEqual(storage.studioGlobalKeys, ['durableStateMirror', 'responsibilities']);

    // Workstream E pages: script inventory on compose/review.
    await page.goto(`${origin}/candidate-c/studio/${SLUG}/urgent?activity=${ACTIVITY}`, { waitUntil: 'networkidle' });
    const urgentScripts = await page.evaluate(() => Array.from(document.scripts).map((script) => script.src.replace(window.location.origin, '') || '(inline)'));
    assert.deepEqual(urgentScripts, [], 'urgent compose ships no client script');

    // JavaScript disabled: the E path and an ordinary Studio save still work end-to-end.
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const plain = await noJs.newPage();
    observe(plain);
    await plain.goto(`${origin}/candidate-c/studio/${SLUG}/urgent?activity=${ACTIVITY}`, { waitUntil: 'networkidle' });
    await plain.locator('input[name="lifecycle"][value="scheduled"]').check();
    await plain.locator('#cc-urgent-note').fill('Back on — published without JavaScript.');
    await plain.getByRole('button', { name: 'Review the change' }).click();
    await plain.waitForURL(`**/candidate-c/studio/${SLUG}/urgent/*`);
    await plain.getByRole('button', { name: 'Publish urgent update' }).click();
    await plain.waitForURL(`**/candidate-c/studio/${SLUG}?released=*&urgent=1`);
    const noJsPublic = store.publicSnapshot(SLUG);
    assert.equal(noJsPublic.draft.activities[0].lifecycle, 'scheduled');
    assert.equal(noJsPublic.draft.activities[0].statusNote, 'Back on — published without JavaScript.');
    await capture(plain, '03-h1-no-javascript-urgent-published');
    // Ordinary inspector save without JS: server-rendered inspector via ?resource is not exposed as a full page,
    // so exercise the full-page form fallback: POST via the setup page which is a plain form.
    await plain.goto(`${origin}/candidate-c/studio/${SLUG}/setup`, { waitUntil: 'networkidle' });
    await plain.locator('textarea[name="purpose"], input[name="purpose"]').first().fill('No-JavaScript purpose edit.');
    const setupRevision = store.snapshot(SLUG).revision;
    await plain.locator('form.cc-setup-form button[type="submit"], form button[type="submit"]').first().click();
    await plain.waitForURL(`**/candidate-c/studio/${SLUG}`);
    assert.equal(store.snapshot(SLUG).revision, setupRevision + 1);
    assert.equal(store.snapshot(SLUG).draft.intent.purpose, 'No-JavaScript purpose edit.');
    await noJs.close();

    const inventory = readClientInventory();
    const diagnostics = store.diagnostics();
    const summary = {
      customClientFiles: inventory.totalFiles,
      customClientLines: inventory.totalLines,
      inlineScriptsInViews: inventory.inlineScriptsInViews.length,
      representativeEdits: edits.length,
      maxRegionsPerEdit: Math.max(...edits.map((item) => item.totalRegions)),
      minRegionsPerEdit: Math.min(...edits.map((item) => item.totalRegions)),
      externalRequests: externalRequests.length,
      unexpectedConsoleErrors: consoleErrors.length,
      expectedConflictDiagnostics: expectedConflictDiagnostics.length,
      screenshotCount: screenshots.length,
      ...diagnostics.external,
    };
    assert.equal(summary.inlineScriptsInViews, 0);
    assert.equal(summary.externalRequests, 0, JSON.stringify(externalRequests));
    assert.equal(summary.unexpectedConsoleErrors, 0, JSON.stringify(consoleErrors));
    assert.equal(summary.maxRegionsPerEdit, 3, 'every Studio edit updates exactly the inspector plus two OOB regions');
    assert.equal(summary.minRegionsPerEdit, 3);
    assert.deepEqual(diagnostics.external, { hiveRpcAttempts: 0, hiveWrites: 0, providerWrites: 0, payments: 0, signingAttempts: 0, deployments: 0 });

    const manifest = {
      phase: 'CANDIDATE_C_PHASE2B_WORKSTREAM_F_H1',
      candidate: EXACT_SHA,
      generatedAt: new Date(FIXED_NOW).toISOString(),
      clientInventory: { ...inventory, declaredResponsibilities: declared.responsibilities, declaredDurableStateMirror: declared.durableStateMirror },
      edits,
      conflict,
      afterReload,
      history,
      storage,
      urgentScripts,
      noJavaScript: { urgentPublished: true, setupSaved: true },
      screenshots,
      externalRequests,
      consoleErrors,
      expectedConflictDiagnostics,
      diagnostics,
      summary,
      finding: 'H1_CONTINUE',
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
