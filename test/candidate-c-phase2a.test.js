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

test('Candidate C has one canonical graph shape with materially distinct composition families', () => {
  const store = new CandidateCStore();
  const northline = store.snapshot('northline-hall').draft;
  const nova = store.snapshot('nova-ashby').draft;

  assert.equal(northline.schemaVersion, nova.schemaVersion);
  assert.equal(northline.presentation.compositionFamily, 'poster');
  assert.equal(nova.presentation.compositionFamily, 'editorial');
  assert.notDeepEqual(northline.presentation.arrangement, nova.presentation.arrangement);
  assert.notEqual(compositionRegistry.poster.publicTemplate, compositionRegistry.editorial.publicTemplate);
  assert.notEqual(compositionRegistry.poster.activityTemplate, compositionRegistry.editorial.activityTemplate);
  assert.equal(northline.facts.presence.mode, 'physical');
  assert.equal(nova.facts.presence.mode, 'online');
  assertExternalZero(store);
});

test('public site reads immutable live Release while Studio edits a newer server-owned draft', async () => {
  const { app, store } = appFixture();
  const before = store.snapshot('northline-hall');
  const originalTagline = before.draft.facts.tagline;
  const result = store.editTagline('northline-hall', 'A draft headline that is not live yet.', before.revision);
  assert.equal(result.ok, true);

  const publicBeforeRelease = await request(app).get('/candidate-c/northline-hall');
  assert.equal(publicBeforeRelease.status, 200);
  assert.match(publicBeforeRelease.text, new RegExp(originalTagline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(publicBeforeRelease.text, /A draft headline that is not live yet/);

  const draftPreview = await request(app).get('/candidate-c/studio/northline-hall/preview');
  assert.equal(draftPreview.status, 200);
  assert.match(draftPreview.text, /A draft headline that is not live yet/);

  const released = store.createRelease('northline-hall', result.snapshot.revision);
  assert.equal(released.ok, true);
  const publicAfterRelease = await request(app).get('/candidate-c/northline-hall');
  assert.match(publicAfterRelease.text, /A draft headline that is not live yet/);
  assertExternalZero(store);
});

test('canonical Activity route, accountless RSVP and ICS remain useful without Hive', async () => {
  const { app, store } = appFixture();
  const activityUrl = '/candidate-c/northline-hall/activities/friday-night-assembly';
  const activity = await request(app).get(activityUrl);
  assert.equal(activity.status, 200);
  assert.match(activity.text, /Friday Night Assembly/);
  assert.match(activity.text, /Save me a spot/);

  const ics = await request(app).get(`${activityUrl}/calendar.ics`);
  assert.equal(ics.status, 200);
  assert.match(ics.headers['content-type'], /text\/calendar/);
  assert.match(ics.text, /BEGIN:VEVENT/);
  assert.match(ics.text, /UID:activity-northline-friday-001@hivenues\.local/);

  const rsvp = await request(app)
    .post(`${activityUrl}/rsvp`)
    .set('HX-Request', 'true')
    .type('form')
    .send({ name: 'Sam' });
  assert.equal(rsvp.status, 200);
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

  const consequence = await request(app).get('/candidate-c/northline-hall/consequence/applaud_hive');
  assert.equal(consequence.status, 200);
  assert.match(consequence.text, /Raise a glass/);
  assert.match(consequence.text, /public Hive vote/i);
  assert.match(consequence.text, /Nothing will be signed or broadcast/i);
  assertExternalZero(store);
});

test('stale Studio edits fail closed with HTTP 409 and cannot overwrite a newer server revision', async () => {
  const { app, store } = appFixture();
  const initial = store.snapshot('nova-ashby');
  const first = store.editTagline('nova-ashby', 'First writer wins this revision.', initial.revision);
  assert.equal(first.ok, true);

  const stale = await request(app)
    .post('/candidate-c/studio/nova-ashby/tagline')
    .set('HX-Request', 'true')
    .type('form')
    .send({ expectedRevision: initial.revision, tagline: 'Stale overwrite attempt.' });
  assert.equal(stale.status, 409);
  assert.match(stale.text, /newer draft exists/i);
  assert.equal(store.snapshot('nova-ashby').draft.facts.tagline, 'First writer wins this revision.');
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
  assertExternalZero(store);
});

test('Release restore creates a new draft revision and does not time-travel the live Release', () => {
  const store = new CandidateCStore({ now: () => Date.parse('2026-09-14T17:40:00Z') });
  let snapshot = store.snapshot('nova-ashby');
  const seedLiveRelease = snapshot.liveReleaseId;
  assert.equal(store.editTagline('nova-ashby', 'Revision two.', snapshot.revision).ok, true);
  snapshot = store.snapshot('nova-ashby');
  const secondRelease = store.createRelease('nova-ashby', snapshot.revision);
  assert.equal(secondRelease.ok, true);
  const liveAfterSecond = store.snapshot('nova-ashby').liveReleaseId;
  assert.notEqual(liveAfterSecond, seedLiveRelease);

  snapshot = store.snapshot('nova-ashby');
  const restored = store.restoreRelease('nova-ashby', seedLiveRelease, snapshot.revision);
  assert.equal(restored.ok, true);
  assert.equal(restored.snapshot.revision, snapshot.revision + 1);
  assert.equal(restored.snapshot.liveReleaseId, liveAfterSecond);
  assert.notEqual(restored.snapshot.draft.facts.tagline, 'Revision two.');
  assertExternalZero(store);
});

test('Studio shell has one small transient interaction island and server-revision hooks', async () => {
  const { app, store } = appFixture();
  const studio = await request(app).get('/candidate-c/studio/northline-hall');
  assert.equal(studio.status, 200);
  assert.match(studio.text, /id="candidate-draft-status"/);
  assert.match(studio.text, /data-revision="1"/);
  assert.match(studio.text, /src="\/htmx\/htmx\.min\.js"/);
  assert.match(studio.text, /src="\/js\/candidate-c-studio\.js"/);
  assert.match(studio.text, /Rendered canvas/);
  assert.match(studio.text, /Review release/);

  const clientPath = path.join(__dirname, '..', 'public', 'js', 'candidate-c-studio.js');
  const client = fs.readFileSync(clientPath, 'utf8');
  assert.match(client, /durableStateMirror:\s*false/);
  assert.match(client, /current-revision-token-source/);
  assert.match(client, /bfcache-reconciliation/);
  assert.ok(client.split(/\r?\n/).length < 130);
  assertExternalZero(store);
});
