'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const { FileCandidateCStore } = require('../src/candidate-c/file-store');
const { createCandidateCRouter } = require('../src/candidate-c/router');
const { compositionRegistry } = require('../src/candidate-c/present');
const { CandidateCStore } = require('../src/candidate-c/store');

function appFixture(store = new CandidateCStore({ now: () => Date.parse('2026-09-14T22:00:00Z') })) {
  const app = express();
  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('view engine', 'ejs');
  app.use(express.urlencoded({ extended: false }));
  app.use('/candidate-c', createCandidateCRouter({ store }));
  return { app, store };
}

function assertExternalZero(store) {
  assert.deepEqual(store.diagnostics().external, {
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    deployments: 0,
  });
}

test('Phase 2B exposes three genuinely different composition trees over the same graph contract', async () => {
  const { app, store } = appFixture();
  const northline = store.snapshot('northline-hall').draft;
  const nova = store.snapshot('nova-ashby').draft;
  const harbor = store.snapshot('harbor-and-hearth').draft;

  assert.equal(northline.schemaVersion, nova.schemaVersion);
  assert.equal(nova.schemaVersion, harbor.schemaVersion);
  assert.deepEqual(store.list(), ['northline-hall', 'nova-ashby', 'harbor-and-hearth']);
  assert.equal(harbor.presentation.compositionFamily, 'hospitality');
  assert.notDeepEqual(harbor.presentation.arrangement, northline.presentation.arrangement);
  assert.notDeepEqual(harbor.presentation.arrangement, nova.presentation.arrangement);

  const templates = Object.values(compositionRegistry).map((family) => family.publicTemplate);
  const activityTemplates = Object.values(compositionRegistry).map((family) => family.activityTemplate);
  assert.equal(new Set(templates).size, 3);
  assert.equal(new Set(activityTemplates).size, 3);

  const poster = await request(app).get('/candidate-c/northline-hall').expect(200);
  const editorial = await request(app).get('/candidate-c/nova-ashby').expect(200);
  const hospitality = await request(app).get('/candidate-c/harbor-and-hearth').expect(200);

  assert.match(poster.text, /cc-poster-night/);
  assert.doesNotMatch(poster.text, /cc-hospitality-menu/);
  assert.match(editorial.text, /cc-editorial-session/);
  assert.doesNotMatch(editorial.text, /cc-hospitality-table/);
  assert.match(hospitality.text, /cc-hospitality-menu/);
  assert.match(hospitality.text, /cc-hospitality-dish/);
  assert.match(hospitality.text, /cc-hospitality-table/);
  assert.doesNotMatch(hospitality.text, /cc-poster-night|cc-editorial-session/);
  assertExternalZero(store);
});

test('admitted Media records stable semantic identity and exact local asset provenance while bootstrap fallback remains intact', async () => {
  const { app, store } = appFixture();
  const harbor = store.snapshot('harbor-and-hearth').draft;
  const media = harbor.media[0];
  assert.equal(media.id, 'media-harbor-table-001');
  assert.equal(media.kind, 'image');
  assert.deepEqual(media.asset, {
    version: 1,
    storage: 'repo-local',
    path: '/candidate-c/media/harbor-hearth-table.svg',
    mime: 'image/svg+xml',
    bytes: 4110,
    width: 1600,
    height: 1200,
    sha256: '85828539d64d5d815be0f59ec1f7d19c1d9f9b05bb3b1db4d1e7ca1977c9f5b4',
  });

  const assetPath = path.join(__dirname, '..', 'public', media.asset.path.replace(/^\//, ''));
  const bytes = fs.readFileSync(assetPath);
  assert.equal(bytes.length, media.asset.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), media.asset.sha256);
  assert.match(bytes.toString('utf8'), /width="1600" height="1200"/);

  for (const slug of ['northline-hall', 'nova-ashby']) {
    const bootstrap = store.snapshot(slug).draft.media[0];
    assert.equal(bootstrap.kind, 'bootstrap-art');
    assert.equal(bootstrap.asset, undefined);
    const page = await request(app).get(`/candidate-c/${slug}`).expect(200);
    assert.match(page.text, /cc-art/);
    assert.doesNotMatch(page.text, /cc-admitted-media/);
  }

  const page = await request(app).get('/candidate-c/harbor-and-hearth').expect(200);
  assert.match(page.text, /class="cc-admitted-media cc-admitted-media--hospitality"/);
  assert.match(page.text, /src="\/candidate-c\/media\/harbor-hearth-table\.svg"/);
  assert.match(page.text, /width="1600" height="1200"/);
  assertExternalZero(store);
});

test('Harbor Studio and public Release share one composition and one canonical Media object', async () => {
  const { app, store } = appFixture();
  const studio = await request(app).get('/candidate-c/studio/harbor-and-hearth').expect(200);
  const publicPage = await request(app).get('/candidate-c/harbor-and-hearth').expect(200);

  assert.match(studio.text, /data-composition="hospitality"/);
  assert.match(studio.text, /Dinner follows the tide\./);
  assert.match(studio.text, /Coal-roasted carrots/);
  assert.match(studio.text, /media:media-harbor-table-001/);
  assert.match(studio.text, /\/candidate-c\/media\/harbor-hearth-table\.svg/);
  assert.match(publicPage.text, /Dinner follows the tide\./);
  assert.match(publicPage.text, /Coal-roasted carrots/);
  assert.match(publicPage.text, /\/candidate-c\/media\/harbor-hearth-table\.svg/);
  assertExternalZero(store);
});

test('hospitality is a real Direction target and preserves canonical Host, Activity, Offer and Media identities', () => {
  const store = new CandidateCStore({ now: () => Date.parse('2026-09-14T22:00:00Z') });
  const before = store.snapshot('northline-hall');
  const proposal = store.proposeDirection('northline-hall', 'hospitality', before.revision, before.draftDigest);
  assert.equal(proposal.ok, true);
  assert.equal(proposal.proposal.familyId, 'hospitality');

  const hydrated = CandidateCStore.fromState(store.exportState(), { now: () => Date.parse('2026-09-14T22:00:00Z') });
  const current = hydrated.snapshot('northline-hall');
  const applied = hydrated.applyDirection(
    'northline-hall',
    proposal.proposal.id,
    current.revision,
    current.draftDigest
  );
  assert.equal(applied.ok, true);
  assert.equal(applied.snapshot.draft.presentation.compositionFamily, 'hospitality');
  assert.equal(applied.snapshot.draft.intent.direction, 'hospitality');
  assert.equal(applied.snapshot.draft.identity.hostId, before.draft.identity.hostId);
  assert.equal(applied.snapshot.draft.activities[0].id, before.draft.activities[0].id);
  assert.equal(applied.snapshot.draft.offers[0].id, before.draft.offers[0].id);
  assert.equal(applied.snapshot.draft.media[0].id, before.draft.media[0].id);
  assertExternalZero(hydrated);
});

test('admitted Media survives durable restart and live Release remains immutable across later focal edits', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-candidate-c-media-'));
  const statePath = path.join(directory, 'state.json');
  const now = () => Date.parse('2026-09-14T22:00:00Z');

  try {
    const first = new FileCandidateCStore({ statePath, now });
    const initial = first.snapshot('harbor-and-hearth');
    const initialLiveDigest = first.publicSnapshot('harbor-and-hearth').draftDigest;
    const asset = structuredClone(initial.draft.media[0].asset);

    const focused = first.setFocal(
      'harbor-and-hearth',
      'media-harbor-table-001',
      64,
      48,
      initial.revision,
      initial.draftDigest
    );
    assert.equal(focused.ok, true);

    const restarted = new FileCandidateCStore({ statePath, now });
    const draftAfterRestart = restarted.snapshot('harbor-and-hearth');
    assert.deepEqual(draftAfterRestart.draft.media[0].asset, asset);
    assert.deepEqual(draftAfterRestart.draft.media[0].focal, { x: 64, y: 48 });
    assert.equal(restarted.publicSnapshot('harbor-and-hearth').draftDigest, initialLiveDigest);
    assert.deepEqual(restarted.publicSnapshot('harbor-and-hearth').draft.media[0].focal, { x: 53, y: 62 });

    const released = restarted.createRelease(
      'harbor-and-hearth',
      draftAfterRestart.revision,
      draftAfterRestart.draftDigest
    );
    assert.equal(released.ok, true);
    const releasedDigest = restarted.publicSnapshot('harbor-and-hearth').draftDigest;
    assert.notEqual(releasedDigest, initialLiveDigest);
    assert.deepEqual(restarted.publicSnapshot('harbor-and-hearth').draft.media[0].focal, { x: 64, y: 48 });

    const latest = restarted.snapshot('harbor-and-hearth');
    assert.equal(restarted.setFocal(
      'harbor-and-hearth',
      'media-harbor-table-001',
      25,
      25,
      latest.revision,
      latest.draftDigest
    ).ok, true);
    const finalRestart = new FileCandidateCStore({ statePath, now });
    assert.equal(finalRestart.publicSnapshot('harbor-and-hearth').draftDigest, releasedDigest);
    assert.deepEqual(finalRestart.publicSnapshot('harbor-and-hearth').draft.media[0].focal, { x: 64, y: 48 });
    assert.deepEqual(finalRestart.snapshot('harbor-and-hearth').draft.media[0].focal, { x: 25, y: 25 });
    assertExternalZero(finalRestart);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
