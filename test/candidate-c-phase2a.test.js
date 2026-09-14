'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const { createCandidateCRouter } = require('../src/candidate-c/router');
const { compositionRegistry } = require('../src/candidate-c/present');
const { CandidateCStore } = require('../src/candidate-c/store');
const { mechanicRegistry } = require('../src/candidate-c/model');

function appFixture(store = new CandidateCStore({ now: () => Date.parse('2026-09-14T17:40:00Z') })) {
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

test('Candidate C has one canonical graph with durable identity and materially distinct composition trees', async () => {
  const { app, store } = appFixture();
  const northline = store.snapshot('northline-hall').draft;
  const nova = store.snapshot('nova-ashby').draft;

  assert.equal(northline.schemaVersion, nova.schemaVersion);
  assert.equal(northline.identity.hostId, 'host-northline-001');
  assert.equal(nova.identity.hostId, 'host-nova-001');
  assert.equal(northline.activities[0].id, 'activity-northline-friday-001');
  assert.equal(nova.activities[0].id, 'activity-nova-session-001');
  assert.equal(northline.presentation.compositionFamily, 'poster');
  assert.equal(nova.presentation.compositionFamily, 'editorial');
  assert.notDeepEqual(northline.presentation.arrangement, nova.presentation.arrangement);
  assert.notEqual(compositionRegistry.poster.publicTemplate, compositionRegistry.editorial.publicTemplate);
  assert.notEqual(compositionRegistry.poster.activityTemplate, compositionRegistry.editorial.activityTemplate);
  assert.equal(northline.facts.presence.mode, 'physical');
  assert.equal(nova.facts.presence.mode, 'online');

  const poster = await request(app).get('/candidate-c/northline-hall').expect(200);
  const editorial = await request(app).get('/candidate-c/nova-ashby').expect(200);
  assert.match(poster.text, /cc-poster-hero/);
  assert.match(poster.text, /cc-poster-night/);
  assert.doesNotMatch(poster.text, /cc-editorial-deck/);
  assert.match(editorial.text, /cc-editorial-deck/);
  assert.match(editorial.text, /cc-editorial-session/);
  assert.doesNotMatch(editorial.text, /cc-poster-night/);
  assertExternalZero(store);
});

test('public site reads immutable live Release while Studio edits a newer server-owned draft', async () => {
  const { app, store } = appFixture();
  const before = store.snapshot('northline-hall');
  const originalTagline = before.draft.facts.tagline;
  const result = store.editTagline('northline-hall', 'A draft headline that is not live yet.', before.revision);
  assert.equal(result.ok, true);

  const publicBeforeRelease = await request(app).get('/candidate-c/northline-hall').expect(200);
  assert.match(publicBeforeRelease.text, new RegExp(originalTagline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(publicBeforeRelease.text, /A draft headline that is not live yet/);

  const draftPreview = await request(app).get('/candidate-c/studio/northline-hall/preview').expect(200);
  assert.match(draftPreview.text, /A draft headline that is not live yet/);

  const released = store.createRelease('northline-hall', result.snapshot.revision);
  assert.equal(released.ok, true);
  const publicAfterRelease = await request(app).get('/candidate-c/northline-hall').expect(200);
  assert.match(publicAfterRelease.text, /A draft headline that is not live yet/);
  assertExternalZero(store);
});

test('ordinary HTMX edit is one server revision with coherent OOB canvas/status update and stale writes fail closed', async () => {
  const { app, store } = appFixture();
  const activityId = 'activity-northline-friday-001';
  const first = await request(app)
    .post('/candidate-c/studio/northline-hall/activity')
    .set('HX-Request', 'true')
    .type('form')
    .send({
      expectedRevision: 1,
      activityId,
      title: 'Friday Night Assembly — Hand Edited',
      description: 'A protected operator edit that should survive broad Direction changes.',
    })
    .expect(200);

  assert.equal(store.snapshot('northline-hall').revision, 2);
  assert.match(first.text, /hx-swap-oob="outerHTML"/);
  assert.match(first.text, /data-revision="2"/);
  assert.match(first.text, /Friday Night Assembly — Hand Edited/);

  await request(app)
    .post('/candidate-c/studio/northline-hall/activity')
    .set('HX-Request', 'true')
    .type('form')
    .send({
      expectedRevision: 1,
      activityId,
      title: 'Silent overwrite attempt',
      description: 'This must not land.',
    })
    .expect(409)
    .expect(/newer draft exists/i);

  assert.equal(store.snapshot('northline-hall').revision, 2);
  assert.equal(store.snapshot('northline-hall').draft.activities[0].title, 'Friday Night Assembly — Hand Edited');
  assertExternalZero(store);
});

test('canonical Activity route, accountless RSVP and ICS remain useful without Hive', async () => {
  const { app, store } = appFixture();
  const activityUrl = '/candidate-c/northline-hall/activities/friday-night-assembly';
  const activity = await request(app).get(activityUrl).expect(200);
  assert.match(activity.text, /Friday Night Assembly/);
  assert.match(activity.text, /Save me a spot/);
  assert.match(activity.text, /method="post"/);

  const ics = await request(app).get(`${activityUrl}/calendar.ics`).expect(200);
  assert.match(ics.headers['content-type'], /text\/calendar/);
  assert.match(ics.text, /BEGIN:VEVENT/);
  assert.match(ics.text, /UID:activity-northline-friday-001@hivenues\.local/);

  const rsvp = await request(app)
    .post(`${activityUrl}/rsvp`)
    .set('HX-Request', 'true')
    .type('form')
    .send({ name: 'Sam' })
    .expect(200);
  assert.match(rsvp.text, /recorded locally/);
  assert.equal(store.diagnostics().local.rsvps, 1);
  assertExternalZero(store);
});

test('Voice maps host-native terms to typed mechanics without conflating account follow and community membership', async () => {
  const { app, store } = appFixture();
  assert.match(mechanicRegistry.follow_account.meaning, /distinct from subscribing to a Hive community/i);
  const northline = store.snapshot('northline-hall').draft;
  const nova = store.snapshot('nova-ashby').draft;
  assert.equal(northline.voice.terms.applaud_hive, 'Raise a glass');
  assert.equal(nova.voice.terms.applaud_hive, 'Send a spark');
  assert.equal(mechanicRegistry.applaud_hive.movesValue, false);
  assert.equal(mechanicRegistry.rsvp_local.consequenceClass, 'local-write');

  const publicPage = await request(app).get('/candidate-c/northline-hall').expect(200);
  assert.doesNotMatch(publicPage.text, /blockchain/i);

  const consequence = await request(app).get('/candidate-c/northline-hall/consequence/follow_account').expect(200);
  assert.match(consequence.text, /following a Hive account/i);
  assert.match(consequence.text, /does not join or subscribe to a Hive community/i);
  assertExternalZero(store);
});

test('Direction proposal preserves granular edits and applies as a new revision', () => {
  const store = new CandidateCStore();
  let snapshot = store.snapshot('northline-hall');
  const activityId = snapshot.draft.activities[0].id;
  assert.equal(store.editActivity('northline-hall', activityId, {
    title: 'Friday Night Assembly — Hand Edited',
    description: snapshot.draft.activities[0].description,
  }, snapshot.revision).ok, true);
  snapshot = store.snapshot('northline-hall');
  assert.equal(store.editTagline('northline-hall', 'Good nights. Great company.', snapshot.revision).ok, true);
  snapshot = store.snapshot('northline-hall');

  const proposal = store.proposeDirection('northline-hall', 'editorial', snapshot.revision);
  assert.equal(proposal.ok, true);
  assert.ok(proposal.proposal.preservedPaths.includes('facts.tagline'));
  assert.ok(proposal.proposal.preservedPaths.includes(`activities.${activityId}.title`));
  const applied = store.applyDirection('northline-hall', proposal.proposal.id, snapshot.revision);
  assert.equal(applied.ok, true);
  assert.equal(applied.snapshot.draft.presentation.compositionFamily, 'editorial');
  assert.equal(applied.snapshot.draft.facts.tagline, 'Good nights. Great company.');
  assert.equal(applied.snapshot.draft.activities[0].title, 'Friday Night Assembly — Hand Edited');
  assert.equal(applied.snapshot.draft.activities[0].id, activityId);
  assertExternalZero(store);
});

test('Undo and Release restore create new revisions and never silently time-travel live state', () => {
  const store = new CandidateCStore({ now: () => Date.parse('2026-09-14T17:40:00Z') });
  let snapshot = store.snapshot('nova-ashby');
  const seedLiveRelease = snapshot.liveReleaseId;
  const originalTagline = snapshot.draft.facts.tagline;

  assert.equal(store.editTagline('nova-ashby', 'Revision two.', snapshot.revision).ok, true);
  snapshot = store.snapshot('nova-ashby');
  const undone = store.undo('nova-ashby', snapshot.revision);
  assert.equal(undone.snapshot.revision, 3);
  assert.equal(undone.snapshot.draft.facts.tagline, originalTagline);

  assert.equal(store.editTagline('nova-ashby', 'Published revision four.', 3).ok, true);
  const secondRelease = store.createRelease('nova-ashby', 4);
  assert.equal(secondRelease.ok, true);
  const liveAfterSecond = store.snapshot('nova-ashby').liveReleaseId;
  assert.notEqual(liveAfterSecond, seedLiveRelease);

  const restored = store.restoreRelease('nova-ashby', seedLiveRelease, 4);
  assert.equal(restored.ok, true);
  assert.equal(restored.snapshot.revision, 5);
  assert.equal(restored.snapshot.liveReleaseId, liveAfterSecond);
  assert.equal(store.publicSnapshot('nova-ashby').draft.facts.tagline, 'Published revision four.');
  assertExternalZero(store);
});

test('Studio is server-rendered, current-revision aware and uses one transient-only client island', async () => {
  const { app, store } = appFixture();
  const studio = await request(app).get('/candidate-c/studio/northline-hall').expect(200);
  assert.match(studio.text, /id="draft-status"/);
  assert.match(studio.text, /data-revision="1"/);
  assert.match(studio.text, /src="\/htmx\/htmx\.min\.js"/);
  assert.match(studio.text, /src="\/js\/candidate-c-studio\.js"/);
  assert.match(studio.text, /Real rendered canvas/);
  assert.match(studio.text, /Review release/);
  assert.match(studio.text, /Page/);
  assert.match(studio.text, /Activities/);
  assert.match(studio.text, /Site/);

  const inspector = await request(app)
    .get('/candidate-c/studio/northline-hall/inspect?resource=facts.tagline')
    .expect(200);
  assert.match(inspector.text, /name="expectedRevision" value="1"/);
  assert.match(inspector.text, /method="post"/);

  const clientPath = path.join(__dirname, '..', 'public', 'js', 'candidate-c-studio.js');
  const client = fs.readFileSync(clientPath, 'utf8');
  assert.match(client, /durableStateMirror:\s*false/);
  assert.ok(client.split(/\r?\n/).length < 150);
  assertExternalZero(store);
});
