'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const {
  createReferenceV3AuthoringStudioFixture,
} = require('../../test/support/v3-authoring-studio-fixture');
const {
  closeServer,
  listenLoopback,
} = require('./visual-harness');

const REFERENCE_IDS = Object.freeze([
  'migratedPhysical',
  'nativeCreator',
  'nativeRelease',
]);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function selectedActivity(fixture) {
  if (fixture.referenceId === 'migratedPhysical') {
    return fixture.source.resources.activities.find((activity) => activity.publicActions.length > 0)
      || fixture.source.resources.activities[0];
  }
  return fixture.source.resources.activities[0];
}

function zeroDiagnostics() {
  return Object.freeze({
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    mediaUploads: 0,
    reservationMutations: 0,
    ticketPurchases: 0,
    deployments: 0,
  });
}

function reviewManifest(references, indexUrl, buildIdentity) {
  return Object.freeze({
    kind: 'hivenues-v3-s9-local-review-target',
    schemaVersion: 1,
    buildIdentity: buildIdentity || null,
    syntheticReviewTarget: true,
    externalEffects: false,
    indexUrl,
    references: references.map((reference) => Object.freeze({
      referenceId: reference.referenceId,
      role: reference.role,
      venueDisplayName: reference.fixture.source.venue.displayName,
      representativeActivity: Object.freeze({
        id: reference.activity.id,
        slug: reference.activity.slug,
        title: reference.activity.title,
        temporalKind: reference.activity.temporal.kind,
        presenceKind: reference.activity.presence.kind,
      }),
      urls: Object.freeze({ ...reference.urls }),
    })),
  });
}

function renderIndex(manifest) {
  const cards = manifest.references.map((reference) => `<section>
    <p class="kicker">${escapeHtml(reference.referenceId)} · ${escapeHtml(reference.role)}</p>
    <h2>${escapeHtml(reference.venueDisplayName)}</h2>
    <p>${escapeHtml(reference.representativeActivity.title)}</p>
    <nav aria-label="${escapeHtml(reference.venueDisplayName)} review links">
      <a href="${escapeHtml(reference.urls.studio)}">Open Studio</a>
      <a href="${escapeHtml(reference.urls.home)}">Open generated Home</a>
      <a href="${escapeHtml(reference.urls.activity)}">Open representative Activity</a>
    </nav>
  </section>`).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>HiVenues S9 review target</title>
<style>:root{font-family:ui-sans-serif,system-ui,sans-serif;color:#1c1917;background:#f5f5f4}*{box-sizing:border-box}body{margin:0;padding:24px}main{max-width:960px;margin:0 auto}h1{font-size:2rem}section{margin:18px 0;padding:18px;border:1px solid #d6d3d1;border-radius:14px;background:#fff}.kicker{font-size:.8rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#57534e}nav{display:flex;gap:10px;flex-wrap:wrap}a{display:inline-flex;min-height:44px;align-items:center;padding:10px 14px;border-radius:10px;background:#292524;color:#fff;text-decoration:none;font-weight:700}.note{padding:12px;border-radius:10px;background:#fef3c7;color:#92400e}</style>
</head><body><main><p class="kicker">PM4 S9 · measurement-only</p><h1>HiVenues review target</h1>
<p class="note">Synthetic, loopback-only review environment. No Hive, provider, payment, signing, or deployment effects are available from this target.</p>
<p>Build identity: <code>${escapeHtml(manifest.buildIdentity || 'not supplied')}</code></p>
${cards}
<p><a href="/manifest.json">Review manifest (JSON)</a></p>
</main></body></html>`;
}

async function startV3S9ReviewTarget(options = {}) {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-v3-s9-review-'));
  const references = [];
  let hubServer = null;
  let closed = false;

  try {
    for (const referenceId of REFERENCE_IDS) {
      const referenceWorkspace = path.join(workspaceRoot, referenceId);
      fs.mkdirSync(referenceWorkspace, { recursive: true });
      const sourceFilename = path.join(referenceWorkspace, 'venue-source-v3.json');
      const fixture = createReferenceV3AuthoringStudioFixture(referenceId, { sourceFilename });
      const activity = selectedActivity(fixture);
      if (!activity) throw new Error(`${referenceId}: representative Activity is missing`);
      const server = await listenLoopback(fixture.app);
      const baseUrl = `http://127.0.0.1:${server.address().port}`;
      const role = referenceId === 'migratedPhysical'
        ? 'R1_MIGRATED_PHYSICAL_LIVE_MUSIC'
        : referenceId === 'nativeCreator'
          ? 'R2_LOCATIONLESS_CREATOR'
          : 'R3_RELEASE_PREMIERE';
      references.push({
        referenceId,
        role,
        sourceFilename,
        fixture,
        activity,
        server,
        baseUrl,
        urls: Object.freeze({
          studio: `${baseUrl}/v3-studio?activityId=${encodeURIComponent(activity.id)}`,
          home: `${baseUrl}/v3-preview/`,
          activity: `${baseUrl}/v3-preview/activities/${encodeURIComponent(activity.slug)}`,
        }),
      });
    }

    const hub = express();
    hub.disable('x-powered-by');
    hubServer = await listenLoopback(hub);
    const indexUrl = `http://127.0.0.1:${hubServer.address().port}/`;
    const manifest = reviewManifest(references, indexUrl, options.buildIdentity);
    hub.get('/', (_request, response) => response.type('html').send(renderIndex(manifest)));
    hub.get('/manifest.json', (_request, response) => response.json(manifest));
    hub.get('/healthz', (_request, response) => response.json({ ok: true, externalEffects: false }));

    async function close() {
      if (closed) return;
      closed = true;
      const diagnosticsBeforeClose = references.map((reference) => ({
        referenceId: reference.referenceId,
        diagnostics: reference.fixture.diagnostics(),
      }));
      if (hubServer) await closeServer(hubServer);
      for (const reference of references) await closeServer(reference.server);
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
      return diagnosticsBeforeClose;
    }

    return Object.freeze({
      workspaceRoot,
      indexUrl,
      manifest,
      references: Object.freeze(references),
      diagnostics: () => Object.freeze(references.map((reference) => Object.freeze({
        referenceId: reference.referenceId,
        diagnostics: reference.fixture.diagnostics(),
      }))),
      close,
    });
  } catch (error) {
    if (hubServer) await closeServer(hubServer).catch(() => {});
    for (const reference of references) await closeServer(reference.server).catch(() => {});
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
    throw error;
  }
}

module.exports = {
  REFERENCE_IDS,
  selectedActivity,
  startV3S9ReviewTarget,
  zeroDiagnostics,
};
