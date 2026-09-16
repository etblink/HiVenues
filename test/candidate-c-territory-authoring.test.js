'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const { seedCandidateCHosts } = require('../src/candidate-c/fixtures');
const { createCandidateCOperatorRouter } = require('../src/candidate-c/operator-router');
const { createCandidateCPreviewRouter } = require('../src/candidate-c/preview-router');
const { CandidateCStore } = require('../src/candidate-c/store');
const { stableDigest } = require('../src/candidate-c/model');
const { buildTerritoryProjection } = require('../src/candidate-c/territory');
const { upgradeGraphToV2 } = require('../src/candidate-c/territory-authoring-router');

function northlineV1() {
  return structuredClone(seedCandidateCHosts().find((host) => host.identity.slug === 'northline-hall'));
}

function storeFor(host = northlineV1()) {
  return new CandidateCStore({ hosts: [host], now: () => Date.parse('2026-09-16T17:00:00Z') });
}

function appFor(store) {
  const app = express();
  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('view engine', 'ejs');
  app.use(express.urlencoded({ extended: false }));
  app.use('/candidate-c', createCandidateCPreviewRouter({ store }));
  app.use('/candidate-c', createCandidateCOperatorRouter({ store }));
  return app;
}

function concurrency(snapshot) {
  return {
    expectedRevision: String(snapshot.revision),
    expectedDraftDigest: snapshot.draftDigest,
  };
}

test('v1 territory upgrade is explicit, Working-only and content-empty', async () => {
  const original = northlineV1();
  const originalDigest = stableDigest(original);
  const upgraded = upgradeGraphToV2(original);
  assert.equal(original.schemaVersion, 1);
  assert.equal(stableDigest(original), originalDigest);
  assert.equal(upgraded.schemaVersion, 2);
  assert.deepEqual(upgraded.stories, []);
  assert.deepEqual(upgraded.people, []);
  assert.deepEqual(upgraded.gallery.mediaIds, []);
  assert.deepEqual(upgraded.navigation.priorities, ['home', 'activities', 'stories', 'offers', 'gallery', 'people', 'about-visit']);

  const store = storeFor(original);
  const app = appFor(store);
  const before = store.snapshot('northline-hall');
  assert.equal(store.publicSnapshot('northline-hall').draft.schemaVersion, 1);

  const studio = await request(app).get('/candidate-c/studio/northline-hall').expect(200);
  assert.match(studio.text, /href="\/candidate-c\/studio\/northline-hall\/territory-content"/);

  const hub = await request(app).get('/candidate-c/studio/northline-hall/territory-content').expect(200);
  assert.match(hub.text, /Enable territory content in Working/);

  await request(app)
    .post('/candidate-c/studio/northline-hall/territory-content/enable')
    .type('form')
    .send(concurrency(before))
    .expect(303);

  const working = store.snapshot('northline-hall');
  assert.equal(working.draft.schemaVersion, 2);
  assert.deepEqual(working.draft.stories, []);
  assert.deepEqual(working.draft.people, []);
  assert.deepEqual(working.draft.gallery.mediaIds, []);
  assert.equal(store.publicSnapshot('northline-hall').draft.schemaVersion, 1);
  assert.equal(stableDigest(store.publicSnapshot('northline-hall').draft), originalDigest);
});

test('ordinary operator can author profiles, stories and a gallery without leaking Working to Live', async () => {
  const store = storeFor();
  const app = appFor(store);
  let snapshot = store.snapshot('northline-hall');

  await request(app)
    .post('/candidate-c/studio/northline-hall/territory-content/enable')
    .type('form')
    .send(concurrency(snapshot))
    .expect(303);
  snapshot = store.snapshot('northline-hall');

  await request(app)
    .post('/candidate-c/studio/northline-hall/territory-content/profile/new')
    .type('form')
    .send({
      ...concurrency(snapshot),
      displayName: 'Avery North',
      role: 'Program steward',
      bio: 'A public-facing fictional profile used only for deterministic territory authoring qualification.',
      mediaId: snapshot.draft.media[0].id,
      linkLabel: 'Reference',
      linkUrl: 'https://example.com/avery',
    })
    .expect(303);
  snapshot = store.snapshot('northline-hall');
  assert.equal(snapshot.draft.people.length, 1);
  const profile = snapshot.draft.people[0];
  assert.equal(profile.slug, 'avery-north');
  assert.equal(profile.links[0].url, 'https://example.com/avery');

  await request(app)
    .post('/candidate-c/studio/northline-hall/territory-content/story/new')
    .type('form')
    .send({
      ...concurrency(snapshot),
      kind: 'essay',
      title: 'The Hall Between Sets',
      dek: 'A deterministic authoring proof.',
      body: 'Working-only story copy. It must appear in Preview before it appears on the public Release.',
      publishedLocal: '2026-09-16T10:30',
      authorProfileIds: profile.id,
      mediaIds: snapshot.draft.media[0].id,
    })
    .expect(303);
  snapshot = store.snapshot('northline-hall');
  assert.equal(snapshot.draft.stories.length, 1);
  const storyId = snapshot.draft.stories[0].id;
  const storySlug = snapshot.draft.stories[0].slug;
  assert.equal(storySlug, 'the-hall-between-sets');
  assert.deepEqual(snapshot.draft.stories[0].authorProfileIds, [profile.id]);

  const preview = await request(app)
    .get(`/candidate-c/studio/northline-hall/preview/stories/${storySlug}`)
    .expect(200);
  assert.match(preview.text, /Working-only story copy/);
  await request(app).get(`/candidate-c/northline-hall/stories/${storySlug}`).expect(404);
  assert.equal(store.publicSnapshot('northline-hall').draft.schemaVersion, 1);

  const mediaA = snapshot.draft.media[0].id;
  await request(app)
    .post('/candidate-c/studio/northline-hall/territory-content/gallery')
    .type('form')
    .send({
      ...concurrency(snapshot),
      title: 'Northline views',
      summary: 'A bounded selection from media already held by this host.',
      include_0: '1',
      order_0: '1',
    })
    .expect(303);
  snapshot = store.snapshot('northline-hall');
  assert.deepEqual(snapshot.draft.gallery.mediaIds, [mediaA]);

  const stableStoryId = snapshot.draft.stories[0].id;
  const stableStorySlug = snapshot.draft.stories[0].slug;
  await request(app)
    .post(`/candidate-c/studio/northline-hall/territory-content/story/${storyId}`)
    .type('form')
    .send({
      ...concurrency(snapshot),
      kind: 'essay',
      title: 'The Hall Between Sets — Revised',
      dek: 'Identity remains stable after editing.',
      body: 'Revised Working-only copy.',
      authorProfileIds: profile.id,
      mediaIds: mediaA,
    })
    .expect(303);
  snapshot = store.snapshot('northline-hall');
  assert.equal(snapshot.draft.stories[0].id, stableStoryId);
  assert.equal(snapshot.draft.stories[0].slug, stableStorySlug);
  assert.equal(snapshot.draft.stories[0].title, 'The Hall Between Sets — Revised');

  await request(app)
    .post(`/candidate-c/studio/northline-hall/territory-content/profile/${profile.id}/delete`)
    .type('form')
    .send(concurrency(snapshot))
    .expect(409)
    .expect(/credited stor/);
  assert.equal(store.snapshot('northline-hall').draft.people.length, 1);

  const diagnosticsBefore = store.diagnostics();
  await request(app)
    .post('/candidate-c/studio/northline-hall/release')
    .type('form')
    .send(concurrency(snapshot))
    .expect(303);

  const live = store.publicSnapshot('northline-hall');
  assert.equal(live.draft.schemaVersion, 2);
  assert.equal(live.draft.stories[0].id, stableStoryId);
  const publicStory = await request(app)
    .get(`/candidate-c/northline-hall/stories/${stableStorySlug}`)
    .expect(200);
  assert.match(publicStory.text, /Revised Working-only copy/);
  assert.deepEqual(store.diagnostics(), diagnosticsBefore);
});

test('territory authoring rejects stale writes without changing the current Working graph', async () => {
  const store = storeFor();
  const app = appFor(store);
  let snapshot = store.snapshot('northline-hall');
  await request(app)
    .post('/candidate-c/studio/northline-hall/territory-content/enable')
    .type('form')
    .send(concurrency(snapshot))
    .expect(303);
  snapshot = store.snapshot('northline-hall');
  const stale = concurrency(snapshot);

  await request(app)
    .post('/candidate-c/studio/northline-hall/territory-content/gallery')
    .type('form')
    .send({
      ...concurrency(snapshot),
      title: 'First valid gallery edit',
      summary: 'This advances the working revision before the stale request.',
    })
    .expect(303);

  const current = store.snapshot('northline-hall');
  const currentDigest = current.draftDigest;
  await request(app)
    .post('/candidate-c/studio/northline-hall/territory-content/profile/new')
    .type('form')
    .send({
      ...stale,
      displayName: 'Stale Person',
      bio: 'This request must not commit because its concurrency token is stale.',
    })
    .expect(409);

  const after = store.snapshot('northline-hall');
  assert.equal(after.revision, current.revision);
  assert.equal(after.draftDigest, currentDigest);
  assert.equal(after.draft.people.length, 0);
});

test('operator can author a short-form Update and semantic navigation without fabricating empty routes', async () => {
  const store = storeFor();
  const app = appFor(store);
  let snapshot = store.snapshot('northline-hall');

  await request(app)
    .post('/candidate-c/studio/northline-hall/territory-content/enable')
    .type('form')
    .send(concurrency(snapshot))
    .expect(303);
  snapshot = store.snapshot('northline-hall');

  const updateForm = await request(app)
    .get('/candidate-c/studio/northline-hall/territory-content/update/new')
    .expect(200);
  assert.match(updateForm.text, /Share a quick Update/);

  await request(app)
    .post('/candidate-c/studio/northline-hall/territory-content/update/new')
    .type('form')
    .send({
      ...concurrency(snapshot),
      body: 'Doors are open. The first set starts in twenty minutes.',
      mediaIds: snapshot.draft.media[0].id,
    })
    .expect(303);
  snapshot = store.snapshot('northline-hall');
  const update = snapshot.draft.stories.find((item) => item.kind === 'update');
  assert.ok(update);
  assert.equal(update.title, 'Doors are open. The first set starts in twenty minutes.');
  assert.deepEqual(update.mediaIds, [snapshot.draft.media[0].id]);
  const stableUpdateId = update.id;
  const stableUpdateSlug = update.slug;

  const preview = await request(app)
    .get(`/candidate-c/studio/northline-hall/preview/stories/${stableUpdateSlug}`)
    .expect(200);
  assert.match(preview.text, /Doors are open/);
  await request(app).get(`/candidate-c/northline-hall/stories/${stableUpdateSlug}`).expect(404);

  let projection = buildTerritoryProjection(snapshot.draft);
  assert.equal(projection.navigation.some((entry) => entry.role === 'stories'), true);
  assert.equal(projection.navigation.some((entry) => entry.role === 'gallery'), false);
  assert.equal(projection.navigation.some((entry) => entry.role === 'people'), false);

  const navigationForm = await request(app)
    .get('/candidate-c/studio/northline-hall/territory-content/navigation')
    .expect(200);
  assert.match(navigationForm.text, /Shape how visitors move through this place/);
  assert.match(navigationForm.text, /Not shown yet/);

  await request(app)
    .post('/candidate-c/studio/northline-hall/territory-content/navigation')
    .type('form')
    .send({
      ...concurrency(snapshot),
      label_home: 'Front door', order_home: '2',
      label_activities: 'Nights', order_activities: '3',
      label_stories: 'Dispatches', order_stories: '1',
      label_offers: 'Offers', order_offers: '4',
      label_gallery: 'Photos', order_gallery: '5',
      label_people: 'People', order_people: '6',
      'label_about-visit': 'About', 'order_about-visit': '7',
    })
    .expect(303);
  snapshot = store.snapshot('northline-hall');
  assert.equal(snapshot.draft.navigation.priorities[0], 'stories');
  assert.equal(snapshot.draft.navigation.labels.stories, 'Dispatches');
  projection = buildTerritoryProjection(snapshot.draft);
  assert.equal(projection.navigation[0].role, 'stories');
  assert.equal(projection.navigation[0].label, 'Dispatches');
  assert.equal(projection.navigation.some((entry) => entry.role === 'gallery'), false);
  assert.equal(projection.navigation.some((entry) => entry.role === 'people'), false);

  const staleNavigation = concurrency(snapshot);
  await request(app)
    .post(`/candidate-c/studio/northline-hall/territory-content/update/${stableUpdateId}`)
    .type('form')
    .send({
      ...concurrency(snapshot),
      body: 'Doors are open. The first set is on now.',
      mediaIds: snapshot.draft.media[0].id,
    })
    .expect(303);
  snapshot = store.snapshot('northline-hall');
  const editedUpdate = snapshot.draft.stories.find((item) => item.id === stableUpdateId);
  assert.equal(editedUpdate.slug, stableUpdateSlug);
  assert.equal(editedUpdate.body, 'Doors are open. The first set is on now.');

  await request(app)
    .post('/candidate-c/studio/northline-hall/territory-content/navigation')
    .type('form')
    .send({
      ...staleNavigation,
      label_home: 'Stale home', order_home: '1',
      label_activities: 'Stale nights', order_activities: '2',
      label_stories: 'Stale dispatches', order_stories: '3',
      label_offers: 'Stale offers', order_offers: '4',
      label_gallery: 'Stale photos', order_gallery: '5',
      label_people: 'Stale people', order_people: '6',
      'label_about-visit': 'Stale about', 'order_about-visit': '7',
    })
    .expect(409);
  assert.equal(store.snapshot('northline-hall').draft.navigation.labels.stories, 'Dispatches');

  const diagnosticsBefore = store.diagnostics();
  await request(app)
    .post('/candidate-c/studio/northline-hall/release')
    .type('form')
    .send(concurrency(snapshot))
    .expect(303);

  const live = store.publicSnapshot('northline-hall');
  const publicUpdate = await request(app)
    .get(`/candidate-c/northline-hall/stories/${stableUpdateSlug}`)
    .expect(200);
  assert.match(publicUpdate.text, /Doors are open\. The first set is on now/);
  const liveProjection = buildTerritoryProjection(live.draft);
  assert.equal(liveProjection.navigation[0].role, 'stories');
  assert.equal(liveProjection.navigation[0].label, 'Dispatches');
  assert.equal(liveProjection.navigation.some((entry) => entry.role === 'gallery'), false);
  assert.equal(liveProjection.navigation.some((entry) => entry.role === 'people'), false);
  assert.deepEqual(store.diagnostics(), diagnosticsBefore);
});
