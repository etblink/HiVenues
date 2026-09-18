'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const { createHiVenuesApp } = require('../src/product/app');
const { ProvisioningFileHiVenuesStore } = require('../src/product/provisioning-file-store');

function runtime(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-astra-beta-p1-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const store = new ProvisioningFileHiVenuesStore({ statePath: path.join(root, 'state.json'), mediaRoot: path.join(root, 'media') });
  return { store, app: createHiVenuesApp({ store }) };
}

function tokens(store, slug) {
  const snapshot = store.snapshot(slug);
  return { expectedRevision: snapshot.revision, expectedDraftDigest: snapshot.draftDigest };
}

function mutate(store, slug, label, mutator, manualPaths = []) {
  const state = store.snapshot(slug);
  return store.draftMutation(slug, state.revision, state.draftDigest, (inner) => (
    inner.commit(slug, state.revision, label, mutator, manualPaths, state.draftDigest)
  ));
}

test('Astra beta P1: quick Look exposes Bar Gold and saves through the same bounded palette', async (t) => {
  const { store, app } = runtime(t);
  const slug = 'harbor-and-hearth';
  const inspector = await request(app).get(`/hivenues/studio/${slug}/inspect?resource=look`).expect(200);
  assert.match(inspector.text, /Bar Gold/);
  assert.match(inspector.text, /#f4a460/);

  await request(app)
    .post(`/hivenues/studio/${slug}/look`)
    .type('form')
    .send({ ...tokens(store, slug), accent: '#f4a460' })
    .expect(303);
  assert.equal(store.snapshot(slug).draft.presentation.accent, '#f4a460');
});

test('Astra beta P1: Release review summarizes meaningful changes and History uses a restore review step', async (t) => {
  const { store, app } = runtime(t);
  const slug = 'harbor-and-hearth';
  const firstLive = store.publicSnapshot(slug);

  assert.equal(mutate(store, slug, 'beta-change', (draft) => {
    draft.facts.tagline = 'A visibly changed beta headline.';
    draft.facts.summary = 'A visibly changed beta summary.';
  }, ['facts.tagline', 'facts.summary']).ok, true);

  const review = await request(app).get(`/hivenues/studio/${slug}/release`).expect(200);
  assert.match(review.text, /Release impact/);
  assert.match(review.text, /Headline changed/);
  assert.match(review.text, /Public summary changed/);
  assert.match(review.text, /Restoring an earlier version changes Studio only/);
  assert.match(review.text, /Review restore/);

  let state = store.snapshot(slug);
  const newRelease = store.createRelease(slug, state.revision, state.draftDigest);
  assert.equal(newRelease.ok, true);
  const liveBeforeRestore = store.publicSnapshot(slug).draftDigest;

  const restorePage = await request(app)
    .get(`/hivenues/studio/${slug}/releases/${firstLive.liveReleaseId}/restore`)
    .expect(200);
  assert.match(restorePage.text, /does <strong>not<\/strong> roll the live website back/i);
  assert.match(restorePage.text, /Publishing is always a separate decision/);

  await request(app)
    .post(`/hivenues/studio/${slug}/releases/${firstLive.liveReleaseId}/restore`)
    .type('form')
    .send(tokens(store, slug))
    .expect(303);
  assert.equal(store.publicSnapshot(slug).draftDigest, liveBeforeRestore, 'restore silently changed live website');
  assert.equal(store.snapshot(slug).draft.facts.tagline, firstLive.draft.facts.tagline, 'restore did not change working version');
});

test('Astra beta P1: completed Hospitality activity is not labelled NEXT', async (t) => {
  const { store, app } = runtime(t);
  const slug = 'harbor-and-hearth';
  const state = store.snapshot(slug);
  const activityId = state.draft.activities[0].id;
  assert.equal(mutate(store, slug, 'beta-completed', (draft) => {
    draft.presentation.compositionFamily = 'hospitality';
    draft.intent.direction = 'hospitality';
    draft.activities.find((item) => item.id === activityId).lifecycle = 'completed';
  }, [`activities.${activityId}.lifecycle`]).ok, true);
  const changed = store.snapshot(slug);
  assert.equal(store.createRelease(slug, changed.revision, changed.draftDigest).ok, true);

  const page = await request(app).get(`/hivenues/${slug}`).expect(200);
  assert.doesNotMatch(page.text, />NEXT</);
  assert.match(page.text, />PAST</);
  assert.match(page.text, /Already happened/);
});

test('Astra beta P1: validation failure preserves submitted contact and hides internal field ids from primary errors', async (t) => {
  const { app } = runtime(t);
  const response = await request(app)
    .post('/hivenues/new')
    .type('form')
    .send({
      displayName: 'Validation House',
      archetype: 'synthetic venue',
      timezone: 'Not/A_Real_Zone',
      presenceMode: 'physical',
      presenceLabel: 'Test City · evenings',
      address: '100 Fictional Way, Test City, NV 00000',
      tagline: 'Synthetic validation test',
      summary: 'Synthetic summary',
      contact: '(702) 555-0147',
      purpose: 'Synthetic purpose',
      presenceMaterial: 'Synthetic atmosphere',
      direction: 'poster',
      participation: 'Synthetic invitation',
      activityTitle: 'Synthetic event',
      activityDescription: 'Synthetic event description',
      activityStartsLocal: '2026-10-17T20:00',
      activityEndsLocal: '2026-10-17T19:00',
    })
    .expect(400);

  assert.match(response.text, /value="\(702\) 555-0147"/);
  assert.doesNotMatch(response.text, /activityEndsLocal:/);
  assert.doesNotMatch(response.text, /timezone:/);
});

test('Astra beta P1: ordinary creative surfaces no longer contain customer-specific Fourth Street coaching', async (t) => {
  const { app } = runtime(t);
  const slug = 'harbor-and-hearth';
  for (const route of ['/hivenues/new', `/hivenues/studio/${slug}/brand`, `/hivenues/studio/${slug}/media-library`]) {
    const response = await request(app).get(route).expect(200);
    assert.doesNotMatch(response.text, /Fourth Street/i, route);
    assert.doesNotMatch(response.text, /canonical workspace/i, route);
  }

  const consequence = await request(app).get(`/hivenues/${slug}/consequence/applaud_hive`).expect(200);
  assert.match(consequence.text, /What this action does/);
  assert.doesNotMatch(consequence.text, /No action button appears in Phase 2A/);
});
