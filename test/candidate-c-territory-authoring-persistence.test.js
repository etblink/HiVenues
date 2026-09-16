'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const { FileCandidateCStore } = require('../src/candidate-c/file-store');
const { createCandidateCOperatorRouter } = require('../src/candidate-c/operator-router');
const { createCandidateCPreviewRouter } = require('../src/candidate-c/preview-router');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-territory-authoring-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const statePath = path.join(directory, 'candidate-c-state.json');
  return {
    statePath,
    store: new FileCandidateCStore({ statePath, now: () => Date.parse('2026-09-16T17:30:00Z') }),
  };
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

async function post(app, url, snapshot, fields = {}) {
  return request(app)
    .post(url)
    .type('form')
    .send({ ...concurrency(snapshot), ...fields })
    .expect(303);
}

test('territory-authored objects and navigation survive restart without leaking Working before Release', async (t) => {
  const { statePath, store: initialStore } = fixture(t);
  let store = initialStore;
  let app = appFor(store);
  const slug = 'northline-hall';
  let snapshot = store.snapshot(slug);
  const originalLiveDigest = store.publicSnapshot(slug).draftDigest;
  assert.equal(snapshot.draft.schemaVersion, 1);

  await post(app, `/candidate-c/studio/${slug}/territory-content/enable`, snapshot);
  snapshot = store.snapshot(slug);
  assert.equal(snapshot.draft.schemaVersion, 2);

  await post(app, `/candidate-c/studio/${slug}/territory-content/profile/new`, snapshot, {
    displayName: 'Rowan Field',
    role: 'Program host',
    bio: 'A deterministic public profile authored through the normal territory workflow.',
    mediaId: snapshot.draft.media[0].id,
    linkLabel: 'Reference',
    linkUrl: 'https://example.com/rowan-field',
  });
  snapshot = store.snapshot(slug);
  const profile = snapshot.draft.people[0];
  assert.ok(profile?.id);

  await post(app, `/candidate-c/studio/${slug}/territory-content/update/new`, snapshot, {
    body: 'Doors are open. The restart proof begins with a Working-only Update.',
    authorProfileId: profile.id,
    mediaIds: snapshot.draft.media[0].id,
    publishedLocal: '2026-09-16T10:35',
  });
  snapshot = store.snapshot(slug);
  const update = snapshot.draft.stories.find((item) => item.kind === 'update');
  assert.ok(update?.id);

  await post(app, `/candidate-c/studio/${slug}/territory-content/story/new`, snapshot, {
    kind: 'essay',
    title: 'After the room restarts',
    dek: 'A durable territory-authoring proof.',
    body: 'This story must survive a full FileCandidateCStore restart with stable identity and remain Working-only until Release.',
    authorProfileIds: profile.id,
    mediaIds: snapshot.draft.media[0].id,
    publishedLocal: '2026-09-16T10:40',
  });
  snapshot = store.snapshot(slug);
  const story = snapshot.draft.stories.find((item) => item.kind === 'essay');
  assert.ok(story?.id);

  await post(app, `/candidate-c/studio/${slug}/territory-content/gallery`, snapshot, {
    title: 'Restart studies',
    summary: 'Media selected through normal Studio territory authoring.',
    include_0: '1',
    order_0: '1',
  });
  snapshot = store.snapshot(slug);

  await post(app, `/candidate-c/studio/${slug}/territory-content/navigation`, snapshot, {
    label_home: 'Front room', order_home: '2',
    label_activities: 'Nights', order_activities: '3',
    label_stories: 'Dispatches', order_stories: '1',
    label_offers: 'Offers', order_offers: '4',
    label_gallery: 'Views', order_gallery: '5',
    label_people: 'People', order_people: '6',
    'label_about-visit': 'Visit', 'order_about-visit': '7',
  });
  snapshot = store.snapshot(slug);

  const beforeRestart = {
    revision: snapshot.revision,
    draftDigest: snapshot.draftDigest,
    profileId: profile.id,
    profileSlug: profile.slug,
    updateId: update.id,
    updateSlug: update.slug,
    storyId: story.id,
    storySlug: story.slug,
  };
  assert.equal(store.publicSnapshot(slug).draftDigest, originalLiveDigest);
  assert.equal(store.publicSnapshot(slug).draft.schemaVersion, 1);

  store = new FileCandidateCStore({ statePath, now: () => Date.parse('2026-09-16T18:00:00Z') });
  app = appFor(store);
  const restarted = store.snapshot(slug);
  assert.equal(restarted.revision, beforeRestart.revision);
  assert.equal(restarted.draftDigest, beforeRestart.draftDigest);
  assert.equal(restarted.draft.schemaVersion, 2);
  assert.equal(restarted.draft.people[0].id, beforeRestart.profileId);
  assert.equal(restarted.draft.people[0].slug, beforeRestart.profileSlug);
  assert.equal(restarted.draft.stories.find((item) => item.id === beforeRestart.updateId)?.slug, beforeRestart.updateSlug);
  assert.equal(restarted.draft.stories.find((item) => item.id === beforeRestart.storyId)?.slug, beforeRestart.storySlug);
  assert.deepEqual(restarted.draft.gallery.mediaIds, [restarted.draft.media[0].id]);
  assert.equal(restarted.draft.navigation.priorities[0], 'stories');
  assert.equal(restarted.draft.navigation.labels.stories, 'Dispatches');
  assert.equal(store.publicSnapshot(slug).draftDigest, originalLiveDigest);
  assert.equal(store.publicSnapshot(slug).draft.schemaVersion, 1);

  await request(app)
    .get(`/candidate-c/studio/${slug}/preview/stories/${beforeRestart.updateSlug}`)
    .expect(200)
    .expect(/restart proof begins/i);
  await request(app)
    .get(`/candidate-c/studio/${slug}/preview/stories/${beforeRestart.storySlug}`)
    .expect(200)
    .expect(/survive a full FileCandidateCStore restart/i);
  await request(app).get(`/candidate-c/${slug}/stories/${beforeRestart.updateSlug}`).expect(404);
  await request(app).get(`/candidate-c/${slug}/stories/${beforeRestart.storySlug}`).expect(404);

  await post(app, `/candidate-c/studio/${slug}/release`, restarted);
  const live = store.publicSnapshot(slug);
  assert.equal(live.draft.schemaVersion, 2);
  assert.equal(live.draft.people[0].id, beforeRestart.profileId);
  assert.equal(live.draft.stories.find((item) => item.id === beforeRestart.updateId)?.slug, beforeRestart.updateSlug);
  assert.equal(live.draft.stories.find((item) => item.id === beforeRestart.storyId)?.slug, beforeRestart.storySlug);
  assert.equal(live.draft.navigation.labels.stories, 'Dispatches');

  const releasedDigest = live.draftDigest;
  store = new FileCandidateCStore({ statePath, now: () => Date.parse('2026-09-16T18:30:00Z') });
  assert.equal(store.publicSnapshot(slug).draftDigest, releasedDigest);
  assert.equal(store.publicSnapshot(slug).draft.stories.find((item) => item.id === beforeRestart.storyId)?.slug, beforeRestart.storySlug);
  assert.equal(store.publicSnapshot(slug).draft.people[0].id, beforeRestart.profileId);
});

test('guided creator provisions a file-backed Working host that survives restart without leaking Live state', async (t) => {
  const { statePath, store } = fixture(t);
  const app = appFor(store);

  await request(app)
    .post('/candidate-c/new')
    .type('form')
    .send({
      displayName: 'Lantern Relay',
      archetype: 'Independent arts venue',
      timezone: 'America/Los_Angeles',
      presenceMode: 'physical',
      presenceLabel: 'Downtown Las Vegas',
      address: '100 Test Way, Las Vegas, NV',
      tagline: 'Signals, stories, and shared nights.',
      summary: 'A fictional host created through the ordinary guided creator for durable persistence qualification.',
      contact: 'hello@lanternrelay.example',
      purpose: 'Give a small arts host a distinctive territory without developer intervention.',
      presenceMaterial: 'A physical gathering place with an event-led public presence.',
      direction: 'poster',
      participation: 'Invite people to discover programs and choose when to participate.',
      activityTitle: 'First Signal',
      activityDescription: 'A fictional opening program used only for deterministic qualification.',
      activityStartsLocal: '2026-09-17T19:00',
      activityEndsLocal: '2026-09-17T21:00',
    })
    .expect(303)
    .expect('Location', '/candidate-c/studio/lantern-relay?created=1');

  const created = store.snapshot('lantern-relay');
  assert.ok(created);
  assert.equal(created.revision, 1);
  assert.equal(created.draft.identity.displayName, 'Lantern Relay');
  assert.equal(created.draft.activities.length, 1);
  assert.deepEqual(created.releases, []);
  assert.equal(created.liveReleaseId, null);
  assert.equal(store.publicSnapshot('lantern-relay'), null);

  const restartedStore = new FileCandidateCStore({
    statePath,
    now: () => Date.parse('2026-09-16T18:00:00Z'),
  });
  const restarted = restartedStore.snapshot('lantern-relay');
  assert.ok(restarted);
  assert.equal(restarted.draft.identity.hostId, created.draft.identity.hostId);
  assert.equal(restarted.draftDigest, created.draftDigest);
  assert.deepEqual(restarted.releases, []);
  assert.equal(restarted.liveReleaseId, null);
  assert.equal(restartedStore.publicSnapshot('lantern-relay'), null);

  await request(appFor(restartedStore))
    .get('/candidate-c/studio/lantern-relay')
    .expect(200)
    .expect(/Lantern Relay/);
});
