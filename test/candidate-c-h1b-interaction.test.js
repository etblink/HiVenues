'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { createCandidateCH1BSpike, seedGraph, renderCanvas } = require('./support/candidate-c-h1b-spike');

function externalZero(fixture) {
  assert.deepEqual(fixture.diagnostics().external, {
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    deployments: 0,
  });
}

test('guided setup writes Purpose, Presence & material, Direction and Participation into the same canonical draft graph', () => {
  const fixture = createCandidateCH1BSpike();
  const before = fixture.state.snapshot();
  const hostId = before.draft.identity.hostId;
  const activityId = before.draft.activities[0].id;
  const result = fixture.state.completeSetup({
    purpose: 'A home for local music and late conversations',
    presenceMaterial: 'Dark wood, amber light, close stage',
    direction: 'editorial',
    participation: 'Attend, save the night, support the artists',
  }, before.revision);
  assert.equal(result.ok, true);
  const after = fixture.state.snapshot();
  assert.equal(after.draft.identity.hostId, hostId);
  assert.equal(after.draft.activities[0].id, activityId);
  assert.equal(after.draft.intent.purpose, 'A home for local music and late conversations');
  assert.equal(after.draft.intent.presenceMaterial, 'Dark wood, amber light, close stage');
  assert.equal(after.draft.intent.direction, 'editorial');
  assert.equal(after.draft.intent.participation, 'Attend, save the night, support the artists');
  assert.equal(after.draft.presentation.composition.familyId, 'editorial');
  externalZero(fixture);
});

test('reversible Direction preserves protected granular Activity and host copy edits and Undo creates a new revision', () => {
  const fixture = createCandidateCH1BSpike();
  let snapshot = fixture.state.snapshot();
  assert.equal(fixture.state.editActivityTitle('activity-friday-001', 'Friday Night Assembly — Hand Edited', snapshot.revision).ok, true);
  snapshot = fixture.state.snapshot();
  assert.equal(fixture.state.editTagline('Good nights. Great company.', snapshot.revision).ok, true);
  snapshot = fixture.state.snapshot();
  const proposal = fixture.state.proposeDirection('editorial', snapshot.revision);
  assert.equal(proposal.ok, true);
  assert.deepEqual(new Set(proposal.proposal.preserved), new Set(['activity:activity-friday-001:title', 'host:facts:tagline']));
  assert.equal(proposal.proposal.nextDraft.activities[0].title, 'Friday Night Assembly — Hand Edited');
  assert.equal(proposal.proposal.nextDraft.facts.tagline, 'Good nights. Great company.');
  assert.equal(proposal.proposal.nextDraft.presentation.composition.familyId, 'editorial');
  const applied = fixture.state.applyDirection(proposal.proposal.id, snapshot.revision);
  assert.equal(applied.ok, true);
  snapshot = fixture.state.snapshot();
  assert.equal(snapshot.draft.activities[0].title, 'Friday Night Assembly — Hand Edited');
  assert.equal(snapshot.draft.facts.tagline, 'Good nights. Great company.');
  assert.equal(snapshot.draft.presentation.composition.familyId, 'editorial');
  const revisionBeforeUndo = snapshot.revision;
  assert.equal(fixture.state.undo(revisionBeforeUndo).ok, true);
  snapshot = fixture.state.snapshot();
  assert.equal(snapshot.revision, revisionBeforeUndo + 1);
  assert.equal(snapshot.draft.presentation.composition.familyId, 'poster');
  assert.equal(snapshot.draft.activities[0].title, 'Friday Night Assembly — Hand Edited');
  assert.equal(snapshot.draft.facts.tagline, 'Good nights. Great company.');
});

test('section reorder is server-authoritative, keyboard-capable and stale commits cannot overwrite', () => {
  const fixture = createCandidateCH1BSpike();
  const initial = fixture.state.snapshot();
  assert.deepEqual(initial.draft.presentation.arrangement.map((item) => item.id), ['hero', 'upcoming', 'media', 'journal']);
  const moved = fixture.state.move('upcoming', -1, initial.revision);
  assert.equal(moved.ok, true);
  const afterMove = fixture.state.snapshot();
  assert.deepEqual(afterMove.draft.presentation.arrangement.map((item) => item.id), ['upcoming', 'hero', 'media', 'journal']);
  const stale = fixture.state.reorder('journal', 'upcoming', initial.revision);
  assert.equal(stale.ok, false);
  assert.equal(stale.reason, 'STALE_REVISION');
  assert.deepEqual(fixture.state.snapshot().draft.presentation.arrangement.map((item) => item.id), ['upcoming', 'hero', 'media', 'journal']);
  assert.equal(fixture.diagnostics().internal.conflicts, 1);
});

test('focal-point commit changes one durable media object revision while media identity remains stable', () => {
  const fixture = createCandidateCH1BSpike();
  const before = fixture.state.snapshot();
  const mediaId = before.draft.media[0].id;
  const result = fixture.state.setFocal(mediaId, 72, 31, before.revision);
  assert.equal(result.ok, true);
  const after = fixture.state.snapshot();
  assert.equal(after.revision, before.revision + 1);
  assert.equal(after.draft.media[0].id, mediaId);
  assert.deepEqual(after.draft.media[0].focal, { x: 72, y: 31 });
  assert.equal(fixture.diagnostics().internal.focalWrites, 1);
  externalZero(fixture);
});

test('structural compositions remain free to change hierarchy independently of interaction transport', () => {
  const poster = seedGraph();
  const editorial = structuredClone(poster);
  editorial.presentation.composition.familyId = 'editorial';
  const posterMarkup = renderCanvas(poster);
  const editorialMarkup = renderCanvas(editorial);
  assert.match(posterMarkup, /poster-frame/);
  assert.doesNotMatch(posterMarkup, /editorial-columns/);
  assert.match(editorialMarkup, /editorial-columns/);
  assert.doesNotMatch(editorialMarkup, /poster-frame/);
});

test('Studio HTML exposes mobile contextual editor, drag plus keyboard reorder, local media and no client durable store', async () => {
  const fixture = createCandidateCH1BSpike();
  const response = await request(fixture.app).get('/studio');
  assert.equal(response.status, 200);
  assert.match(response.text, /id="context-sheet"/);
  assert.match(response.text, /data-select-resource="activity:activity-friday-001"/);
  assert.match(response.text, /draggable="true" data-drag-section="hero"/);
  assert.match(response.text, /action="\/studio\/move"/);
  assert.match(response.text, /id="focal-preview"/);
  assert.match(response.text, /src="\/candidate-c\/media\.svg"/);
  assert.match(response.text, /src="\/candidate-c\/h1b-client\.js"/);
  assert.equal(fixture.clientInventory.durableClientStore, false);
  assert.equal(fixture.clientInventory.files.length, 1);
  assert.equal(fixture.clientInventory.files[0].durableStateMirror, false);
  assert.ok(fixture.clientInventory.files[0].lines < 140, `interaction island unexpectedly large: ${fixture.clientInventory.files[0].lines} lines`);
  assert.deepEqual(fixture.clientInventory.files[0].responsibilities, ['selection', 'drag-intent', 'focal-preview', '409-swap-policy', 'focus-restoration']);
  externalZero(fixture);
});

test('HTMX edit and reorder responses carry server revisions, dependent fragments and real 409 conflict semantics', async () => {
  const fixture = createCandidateCH1BSpike();
  const edit = await request(fixture.app).post('/studio/activity-title').set('HX-Request', 'true').type('form').send({ activityId: 'activity-friday-001', title: 'Friday Night Assembly — Browser Truth', expectedRevision: 1 });
  assert.equal(edit.status, 200);
  assert.match(edit.text, /Browser Truth/);
  assert.match(edit.text, /hx-swap-oob="outerHTML"/);
  assert.match(edit.text, /data-revision="2"/);

  const reorder = await request(fixture.app).post('/studio/reorder').set('HX-Request', 'true').type('form').send({ sectionId: 'journal', beforeId: 'hero', expectedRevision: 2 });
  assert.equal(reorder.status, 200);
  assert.match(reorder.text, /id="section-order"/);
  assert.match(reorder.text, /hx-swap-oob="outerHTML"[^>]*id="studio-canvas"/);
  assert.match(reorder.text, /data-revision="3"/);

  const stale = await request(fixture.app).post('/studio/reorder').set('HX-Request', 'true').type('form').send({ sectionId: 'hero', beforeId: 'journal', expectedRevision: 2 });
  assert.equal(stale.status, 409);
  assert.match(stale.text, /A newer draft exists/);
  assert.equal(fixture.state.snapshot().revision, 3);
  externalZero(fixture);
});

test('refresh reconstructs durable state entirely from the server after setup, edits, reorder and focal commit', async () => {
  const fixture = createCandidateCH1BSpike();
  let snapshot = fixture.state.snapshot();
  fixture.state.completeSetup({ purpose: 'Local music home', presenceMaterial: 'Warm room', direction: 'editorial', participation: 'Attend and support' }, snapshot.revision);
  snapshot = fixture.state.snapshot();
  fixture.state.editTagline('Still here after refresh.', snapshot.revision);
  snapshot = fixture.state.snapshot();
  fixture.state.reorder('journal', 'hero', snapshot.revision);
  snapshot = fixture.state.snapshot();
  fixture.state.setFocal('media-hero-001', 64, 28, snapshot.revision);
  const response = await request(fixture.app).get('/studio');
  assert.equal(response.status, 200);
  assert.match(response.text, /Still here after refresh\./);
  assert.match(response.text, /data-composition="editorial"/);
  assert.match(response.text, /data-server-x="64" data-server-y="28"/);
  assert.equal(fixture.transport.durableStateOwner, 'server');
  assert.equal(fixture.transport.durableClientState, false);
  externalZero(fixture);
});
