'use strict';
/* global document, window */

/**
 * Phase 2B closure — complete product matrix at the E/F candidate.
 *
 * R1 Northline Hall, R2 Nova Ashby, R3 Harbor & Hearth × public home, Activity
 * page, Studio × desktop (1440) and 390px, captured in the scheduled state and
 * again after an urgent cancellation published from the live Release. Also
 * proves admitted-media provenance, third-family structural distinction,
 * Release restore, and the whole-host release after an urgent update.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const { chromium } = require('playwright');
const { FileCandidateCStore } = require('../src/candidate-c/file-store');
const { createCandidateCRouter } = require('../src/candidate-c/router');

const OUTPUT_ROOT = process.env.CANDIDATE_C_PHASE2B_CLOSURE_REVIEW_ROOT || path.join('artifacts', 'candidate-c-phase2b-closure-review');
const EXACT_SHA = process.env.CANDIDATE_C_PHASE2B_EXACT_SHA || 'LOCAL_UNBOUND';
const FIXED_NOW = Date.parse('2026-09-14T23:45:00.000Z');

const HOSTS = [
  { key: 'r1', slug: 'northline-hall', activity: 'friday-night-assembly', activityId: 'activity-northline-friday-001', family: 'poster', bodyClass: 'cc-poster' },
  { key: 'r2', slug: 'nova-ashby', activity: 'soft-infrastructure-live-session', activityId: 'activity-nova-session-001', family: 'editorial', bodyClass: 'cc-editorial' },
  { key: 'r3', slug: 'harbor-and-hearth', activity: 'sunday-harvest-table', activityId: 'activity-harbor-supper-001', family: 'hospitality', bodyClass: 'cc-hospitality' },
];

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
    images: document.images.length,
  }), label);
  const axe = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
    const blocking = result.violations.filter((item) => ['serious', 'critical'].includes(item.impact));
    return {
      violationCount: result.violations.length,
      blockingCount: blocking.length,
      blocking: blocking.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length })),
      minor: result.violations.filter((item) => !['serious', 'critical'].includes(item.impact)).map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.length })),
    };
  });
  return { geometry, accessibility: { label, ...axe } };
}

async function main() {
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  const stateDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-candidate-c-closure-'));
  const statePath = path.join(stateDirectory, 'candidate-c-state.json');
  const store = new FileCandidateCStore({ statePath, now: () => FIXED_NOW });
  const server = await startServer(makeApp(store));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  const screenshots = [];
  const geometry = [];
  const accessibility = [];
  const externalRequests = [];
  const consoleErrors = [];
  const structure = {};
  const proof = {};

  function observe(page) {
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('about:')) externalRequests.push(url);
    });
    page.on('pageerror', (error) => consoleErrors.push({ type: 'pageerror', text: error.message }));
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push({ type: 'console', text: message.text() });
    });
  }

  async function gotoOk(page, pathname) {
    const response = await page.goto(`${origin}${pathname}`, { waitUntil: 'networkidle' });
    assert(response && response.ok(), `${pathname} did not return 2xx`);
  }

  async function capture(page, name, label) {
    const filename = path.join(OUTPUT_ROOT, `${name}.png`);
    await page.screenshot({ path: filename, fullPage: true });
    screenshots.push(path.basename(filename));
    const audited = await auditPage(page, axeSource, label);
    geometry.push(audited.geometry);
    accessibility.push(audited.accessibility);
  }

  async function matrix(state, desktop, mobile) {
    for (const host of HOSTS) {
      for (const [viewport, page] of [['desktop', desktop], ['mobile', mobile]]) {
        await gotoOk(page, `/candidate-c/${host.slug}`);
        assert.equal(await page.locator(`body.${host.bodyClass}`).count(), 1, `${host.slug} renders its own family`);
        await capture(page, `${state}-${host.key}-${viewport}-home`, `${state}-${host.key}-${viewport}-home`);
        await gotoOk(page, `/candidate-c/${host.slug}/activities/${host.activity}`);
        if (state === 'cancelled') {
          assert.equal(await page.locator('[data-activity-status="cancelled"]').count(), 1, `${host.slug} activity shows cancelled`);
          assert.equal(await page.locator('[data-rsvp-closed]').count(), 1, `${host.slug} RSVP closed`);
        } else {
          assert.equal(await page.locator('#cc-rsvp-name').count(), 1, `${host.slug} RSVP open`);
        }
        await capture(page, `${state}-${host.key}-${viewport}-activity`, `${state}-${host.key}-${viewport}-activity`);
        await gotoOk(page, `/candidate-c/studio/${host.slug}`);
        assert.equal(await page.locator(`#candidate-canvas[data-composition="${host.family}"]`).count(), 1);
        await capture(page, `${state}-${host.key}-${viewport}-studio`, `${state}-${host.key}-${viewport}-studio`);
      }
    }
  }

  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    observe(desktop);
    observe(mobile);

    // Structural distinction across the three families (public home).
    for (const host of HOSTS) {
      await gotoOk(desktop, `/candidate-c/${host.slug}`);
      structure[host.key] = await desktop.evaluate(() => ({
        bodyClass: document.body.className,
        landmarks: Array.from(document.querySelectorAll('header, main > section, footer')).map((node) => node.className.split(' ')[0]),
        headingOrder: Array.from(document.querySelectorAll('h1, h2')).map((node) => `${node.tagName}:${node.textContent.trim().slice(0, 40)}`),
        images: Array.from(document.images).map((img) => img.getAttribute('src')),
      }));
    }
    const sectionSignatures = Object.values(structure).map((item) => item.landmarks.join('|'));
    assert.equal(new Set(sectionSignatures).size, 3, 'three distinct section grammars');
    assert.ok(structure.r3.images.includes('/candidate-c/media/harbor-hearth-table.svg'), 'R3 renders the admitted asset');
    assert.equal(structure.r1.images.length, 0, 'R1 uses bootstrap art (no <img>)');

    // Admitted media provenance: bytes and sha256 match the graph descriptor.
    const harbor = store.publicSnapshot('harbor-and-hearth').draft.media[0];
    const assetBytes = fs.readFileSync(path.join(__dirname, '..', 'public', harbor.asset.path));
    proof.media = { id: harbor.id, kind: harbor.kind, path: harbor.asset.path, bytes: assetBytes.length, sha256: crypto.createHash('sha256').update(assetBytes).digest('hex'), declaredBytes: harbor.asset.bytes, declaredSha256: harbor.asset.sha256, provenance: harbor.provenance };
    assert.equal(proof.media.bytes, proof.media.declaredBytes);
    assert.equal(proof.media.sha256, proof.media.declaredSha256);

    await matrix('scheduled', desktop, mobile);

    // Urgent cancellation from the live Release on every host, with an unrelated draft edit left behind.
    proof.urgent = {};
    for (const host of HOSTS) {
      const t0 = store.snapshot(host.slug);
      assert.equal(store.editTagline(host.slug, `${t0.draft.facts.tagline} (unreleased)`, t0.revision, t0.draftDigest).ok, true);
      const liveBefore = store.publicSnapshot(host.slug);
      const proposed = store.proposeUrgent(host.slug, { kind: 'activity-status', activityId: host.activityId, lifecycle: 'cancelled', statusNote: 'Cancelled tonight — see you at the next one.' });
      assert.equal(proposed.ok, true, host.slug);
      const t1 = store.snapshot(host.slug);
      const executed = store.executeUrgent(host.slug, proposed.operation.id, proposed.operation.baseReleaseId, t1.revision, t1.draftDigest);
      assert.equal(executed.ok, true, host.slug);
      const livePublic = store.publicSnapshot(host.slug);
      assert.equal(livePublic.draft.facts.tagline, liveBefore.draft.facts.tagline, `${host.slug}: unrelated draft edit not published`);
      assert.equal(store.snapshot(host.slug).draft.facts.tagline, `${t0.draft.facts.tagline} (unreleased)`, `${host.slug}: draft edit retained`);
      proof.urgent[host.key] = { releaseId: executed.release.id, baseReleaseId: executed.release.baseReleaseId, changedPaths: executed.release.changedPaths, closed: proposed.operation.proof.closed };
    }

    await matrix('cancelled', desktop, mobile);

    // Release restore: bring the pre-cancellation Release back as the working version, then a whole-host release.
    const r1 = store.snapshot('northline-hall');
    const seed = r1.releases[0];
    const restored = store.restoreRelease('northline-hall', seed.id, r1.revision, r1.draftDigest);
    assert.equal(restored.ok, true);
    const afterRestore = store.snapshot('northline-hall');
    assert.equal(afterRestore.draft.activities[0].lifecycle, 'scheduled');
    assert.equal(afterRestore.revision, r1.revision + 1, 'restore is a new revision, not time travel');
    const released = store.createRelease('northline-hall', afterRestore.revision, afterRestore.draftDigest);
    assert.equal(released.ok, true);
    assert.equal(released.release.kind, 'full');
    assert.equal(store.publicSnapshot('northline-hall').draft.activities[0].lifecycle, 'scheduled');
    proof.restore = { restoredFrom: seed.id, newRevision: afterRestore.revision, fullReleaseAfter: released.release.id };
    await gotoOk(desktop, '/candidate-c/studio/northline-hall/release');
    await capture(desktop, 'closure-r1-history-after-restore', 'closure-r1-history-after-restore');

    // Restart: reconstruct everything from the durable file.
    const restarted = new FileCandidateCStore({ statePath });
    for (const host of HOSTS) {
      const publicNow = restarted.publicSnapshot(host.slug);
      const expectedLifecycle = host.key === 'r1' ? 'scheduled' : 'cancelled';
      assert.equal(publicNow.draft.activities[0].lifecycle, expectedLifecycle, `${host.slug} restart public`);
      assert.equal(restarted.snapshot(host.slug).releases.filter((item) => item.kind === 'urgent').length, 1, `${host.slug} urgent release persisted`);
    }
    proof.restart = { releasesPerHost: Object.fromEntries(HOSTS.map((host) => [host.key, restarted.snapshot(host.slug).releases.map((item) => `${item.kind}:${item.id}`)])) };

    // Two-session stale write through HTTP.
    const sessionA = store.snapshot('nova-ashby');
    assert.equal(store.editTagline('nova-ashby', 'Session A wins.', sessionA.revision, sessionA.draftDigest).ok, true);
    const staleB = store.editTagline('nova-ashby', 'Session B must fail.', sessionA.revision, sessionA.draftDigest);
    assert.equal(staleB.ok, false);
    assert.equal(staleB.reason, 'STALE_REVISION');
    proof.staleWrite = { reason: staleB.reason, actualRevision: staleB.actualRevision };

    const diagnostics = store.diagnostics();
    const summary = {
      screenshotCount: screenshots.length,
      blockingAccessibilityFindings: accessibility.reduce((sum, item) => sum + item.blockingCount, 0),
      minorAccessibilityFindings: accessibility.reduce((sum, item) => sum + item.minor.length, 0),
      horizontalOverflowFindings: geometry.filter((item) => item.overflow).length,
      incompleteImageFindings: geometry.reduce((sum, item) => sum + item.incompleteImages, 0),
      externalRequests: externalRequests.length,
      unexpectedConsoleErrors: consoleErrors.length,
      ...diagnostics.external,
    };
    assert.equal(summary.blockingAccessibilityFindings, 0, JSON.stringify(accessibility.filter((item) => item.blockingCount > 0)));
    assert.equal(summary.horizontalOverflowFindings, 0, JSON.stringify(geometry.filter((item) => item.overflow)));
    assert.equal(summary.incompleteImageFindings, 0);
    assert.equal(summary.externalRequests, 0, JSON.stringify(externalRequests));
    assert.equal(summary.unexpectedConsoleErrors, 0, JSON.stringify(consoleErrors));
    assert.deepEqual(diagnostics.external, { hiveRpcAttempts: 0, hiveWrites: 0, providerWrites: 0, payments: 0, signingAttempts: 0, deployments: 0 });

    const manifest = {
      phase: 'CANDIDATE_C_PHASE2B_CLOSURE',
      candidate: EXACT_SHA,
      generatedAt: new Date(FIXED_NOW).toISOString(),
      hosts: HOSTS.map((host) => ({ key: host.key, slug: host.slug, family: host.family })),
      structure,
      proof,
      screenshots,
      geometry,
      accessibility,
      externalRequests,
      consoleErrors,
      diagnostics,
      summary,
      finding: 'PHASE2B_CLOSURE_EVIDENCE_READY_FOR_PROJECT_LEAD_REVIEW',
    };
    fs.writeFileSync(path.join(OUTPUT_ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(stateDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
