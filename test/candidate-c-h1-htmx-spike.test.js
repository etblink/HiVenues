'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const {
  compileIntent,
  createCandidateCH1Spike,
  removeProjectionSection,
} = require('./support/candidate-c-h1-spike');

function externalZero(diagnostics) {
  assert.deepEqual(diagnostics.external, {
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    deployments: 0,
  });
}

test('guided Intent compiles to one canonical graph with durable Host and Activity identity independent of page placement', () => {
  const graph = compileIntent({
    name: 'Northline Hall',
    activityTitle: 'Friday Night Assembly',
    composition: 'poster',
  });
  assert.equal(graph.identity.hostId, 'hv-northline-hall-001');
  assert.equal(graph.activities[0].id, 'activity-friday-001');
  assert.equal(graph.voice.terms.applaud.label, 'Raise a glass');
  assert.equal(graph.activities[0].publicActions.find((action) => action.id === 'applaud').mechanic, 'applaud');
  const withoutUpcoming = removeProjectionSection(graph, 'upcoming');
  assert.equal(withoutUpcoming.presentation.arrangement.some((section) => section.id === 'upcoming'), false);
  assert.equal(withoutUpcoming.activities.length, 1);
  assert.equal(withoutUpcoming.activities[0].id, graph.activities[0].id);
});

test('public experience is useful without JavaScript and projects first-class Activity, SEO, JSON-LD and local provider degradation', async () => {
  const fixture = createCandidateCH1Spike();
  const home = await request(fixture.app).get('/');
  assert.equal(home.status, 200);
  assert.match(home.text, /<h1[^>]*>Northline Hall<\/h1>/);
  assert.match(home.text, /href="\/activities\/friday-night-assembly"/);
  assert.match(home.text, /rel="canonical" href="https:\/\/northline-hall\.example\/"/);
  assert.match(home.text, /application\/ld\+json/);
  assert.match(home.text, /href="\/journal\?page=2"/);
  assert.match(home.text, /src="\/candidate-c\/htmx\.js"/);

  const activity = await request(fixture.app).get('/activities/friday-night-assembly');
  assert.equal(activity.status, 200);
  assert.match(activity.text, /Friday Night Assembly/);
  assert.match(activity.text, /Fri, Oct 23/);
  assert.doesNotMatch(activity.text, />2026-10-23T20:00:00-07:00</);
  assert.match(activity.text, /method="post" action="\/activities\/friday-night-assembly\/rsvp"/);
  assert.match(activity.text, /href="\/activities\/friday-night-assembly\/applause\/review"/);
  assert.match(activity.text, /href="\/activities\/friday-night-assembly\.ics"/);
  assert.match(activity.text, /data-provider-state="degraded"/);
  assert.match(activity.text, /Show details and accountless actions remain available/);
  assert.match(activity.text, /"@type":"Event"/);
  externalZero(fixture.diagnostics());
});

test('ordinary HTMX edit is one server-acknowledged draft revision and coherently returns dependent out-of-band projections', async () => {
  const fixture = createCandidateCH1Spike();
  const response = await request(fixture.app)
    .post('/studio/activity-title')
    .set('HX-Request', 'true')
    .type('form')
    .send({
      activityId: 'activity-friday-001',
      expectedRevision: 1,
      title: 'Friday Night Assembly — Late Set',
    });
  assert.equal(response.status, 200);
  assert.match(response.text, /Friday Night Assembly — Late Set/);
  assert.match(response.text, /id="activity-card-activity-friday-001"[^>]*hx-swap-oob="outerHTML"/);
  assert.match(response.text, /id="draft-status"[^>]*hx-swap-oob="outerHTML"/);
  assert.match(response.text, /id="activity-preview-title" hx-swap-oob="outerHTML"/);
  const snapshot = fixture.state.snapshot();
  assert.equal(snapshot.revision, 2);
  assert.equal(snapshot.draft.activities[0].title, 'Friday Night Assembly — Late Set');

  const live = await request(fixture.app).get('/activities/friday-night-assembly');
  assert.match(live.text, /Friday Night Assembly<\/h1>/);
  assert.doesNotMatch(live.text, /Late Set<\/h1>/);
  const preview = await request(fixture.app).get('/preview/activities/friday-night-assembly');
  assert.match(preview.text, /Friday Night Assembly — Late Set<\/h1>/);
  externalZero(fixture.diagnostics());
});

test('two-tab stale edit returns 409 and does not overwrite the newer server draft', async () => {
  const fixture = createCandidateCH1Spike();
  await request(fixture.app).post('/studio/activity-title').type('form').send({
    activityId: 'activity-friday-001',
    expectedRevision: 1,
    title: 'Newer tab title',
  });
  const before = fixture.state.snapshot();
  const conflict = await request(fixture.app)
    .post('/studio/activity-title')
    .set('HX-Request', 'true')
    .type('form')
    .send({
      activityId: 'activity-friday-001',
      expectedRevision: 1,
      title: 'Stale tab overwrite attempt',
    });
  assert.equal(conflict.status, 409);
  assert.match(conflict.text, /A newer draft is available/);
  assert.match(conflict.text, /server is at revision 2/);
  const after = fixture.state.snapshot();
  assert.equal(after.revision, before.revision);
  assert.equal(after.draft.activities[0].title, 'Newer tab title');
  assert.equal(after.draft.activities[0].title, before.draft.activities[0].title);
  externalZero(fixture.diagnostics());
});

test('Undo is a new server revision rather than rewinding revision identity', async () => {
  const fixture = createCandidateCH1Spike();
  await request(fixture.app).post('/studio/activity-title').type('form').send({
    activityId: 'activity-friday-001',
    expectedRevision: 1,
    title: 'Temporary draft title',
  });
  const undo = await request(fixture.app).post('/studio/undo').type('form').send({
    activityId: 'activity-friday-001',
    expectedRevision: 2,
  });
  assert.equal(undo.status, 303);
  const snapshot = fixture.state.snapshot();
  assert.equal(snapshot.revision, 3);
  assert.equal(snapshot.draft.activities[0].title, 'Friday Night Assembly');
  assert.equal(fixture.diagnostics().internal.draftWrites, 2);
  externalZero(fixture.diagnostics());
});

test('Direction is a reviewed broad proposal, preserves manual Activity copy, and changes structural composition markup', async () => {
  const fixture = createCandidateCH1Spike();
  await request(fixture.app).post('/studio/activity-title').type('form').send({
    activityId: 'activity-friday-001',
    expectedRevision: 1,
    title: 'Hand-edited Friday title',
  });
  const posterMarkup = fixture.renderCompositionMain(fixture.state.snapshot().draft, { draft: true });
  assert.match(posterMarkup, /poster-bill/);
  assert.doesNotMatch(posterMarkup, /editorial-feature/);

  const review = await request(fixture.app).post('/studio/direction/propose').type('form').send({
    expectedRevision: 2,
    familyId: 'editorial',
  });
  assert.equal(review.status, 200);
  assert.match(review.text, /Review direction/);
  assert.match(review.text, /Hand-edited Friday title/);
  assert.match(review.text, /Composition: poster → editorial/);
  const proposal = fixture.state.snapshot().directionProposal;
  assert.equal(proposal.nextDraft.activities[0].title, 'Hand-edited Friday title');

  const apply = await request(fixture.app).post('/studio/direction/apply').type('form').send({
    proposalId: proposal.id,
    expectedRevision: 2,
  });
  assert.equal(apply.status, 303);
  const snapshot = fixture.state.snapshot();
  assert.equal(snapshot.revision, 3);
  assert.equal(snapshot.draft.presentation.composition.familyId, 'editorial');
  assert.equal(snapshot.draft.activities[0].title, 'Hand-edited Friday title');
  const editorialMarkup = fixture.renderCompositionMain(snapshot.draft, { draft: true });
  assert.match(editorialMarkup, /editorial-feature/);
  assert.doesNotMatch(editorialMarkup, /poster-bill/);
  externalZero(fixture.diagnostics());
});

test('release review binds an exact draft revision; publish changes website snapshot only; restore creates a new draft without changing live', async () => {
  const fixture = createCandidateCH1Spike();
  await request(fixture.app).post('/studio/activity-title').type('form').send({
    activityId: 'activity-friday-001',
    expectedRevision: 1,
    title: 'Release two title',
  });
  const review = await request(fixture.app).get('/studio/release-review');
  assert.equal(review.status, 200);
  assert.match(review.text, /Reviewed draft revision <strong>2<\/strong>/);
  assert.match(review.text, /does not post to Hive, sign, transfer funds, mutate providers, or deploy production infrastructure/);

  await request(fixture.app).post('/studio/activity-title').type('form').send({
    activityId: 'activity-friday-001',
    expectedRevision: 2,
    title: 'Newer unreviewed title',
  });
  const stalePublish = await request(fixture.app).post('/studio/publish').type('form').send({ expectedRevision: 2 });
  assert.equal(stalePublish.status, 409);
  assert.equal(fixture.state.snapshot().liveReleaseNumber, 1);

  const publishTwo = await request(fixture.app).post('/studio/publish').type('form').send({ expectedRevision: 3 });
  assert.equal(publishTwo.status, 303);
  assert.equal(fixture.state.snapshot().liveReleaseNumber, 2);
  const liveTwo = await request(fixture.app).get('/activities/friday-night-assembly');
  assert.match(liveTwo.text, /Newer unreviewed title<\/h1>/);

  await request(fixture.app).post('/studio/activity-title').type('form').send({
    activityId: 'activity-friday-001',
    expectedRevision: 3,
    title: 'Release three title',
  });
  await request(fixture.app).post('/studio/publish').type('form').send({ expectedRevision: 4 });
  assert.equal(fixture.state.snapshot().liveReleaseNumber, 3);

  const restore = await request(fixture.app).post('/studio/restore').type('form').send({
    releaseNumber: 2,
    expectedRevision: 4,
  });
  assert.equal(restore.status, 303);
  const snapshot = fixture.state.snapshot();
  assert.equal(snapshot.revision, 5);
  assert.equal(snapshot.draft.activities[0].title, 'Newer unreviewed title');
  assert.equal(snapshot.liveReleaseNumber, 3);
  const stillLiveThree = await request(fixture.app).get('/activities/friday-night-assembly');
  assert.match(stillLiveThree.text, /Release three title<\/h1>/);
  externalZero(fixture.diagnostics());
});

test('accountless RSVP, ICS and host-native applause remain truthful, progressively enhanced and side-effect free', async () => {
  const fixture = createCandidateCH1Spike();
  const rsvp = await request(fixture.app).post('/activities/friday-night-assembly/rsvp').type('form').send({});
  assert.equal(rsvp.status, 303);
  assert.equal(rsvp.headers.location, '/activities/friday-night-assembly?rsvp=1');
  assert.equal(fixture.diagnostics().internal.accountlessRsvps, 1);

  const rsvpHtmx = await request(fixture.app).post('/activities/friday-night-assembly/rsvp').set('HX-Request', 'true').type('form').send({});
  assert.equal(rsvpHtmx.status, 200);
  assert.match(rsvpHtmx.text, /does not purchase a ticket or reserve inventory/);

  const ics = await request(fixture.app).get('/activities/friday-night-assembly.ics');
  assert.equal(ics.status, 200);
  assert.match(ics.headers['content-type'], /text\/calendar/);
  assert.match(ics.text, /UID:activity-friday-001@hivenues\.local/);
  assert.match(ics.text, /SUMMARY:Friday Night Assembly/);

  const review = await request(fixture.app).get('/activities/friday-night-assembly/applause/review').set('HX-Request', 'true');
  assert.equal(review.status, 200);
  assert.match(review.text, /Raise a glass/);
  assert.match(review.text, /public Hive vote/);
  assert.match(review.text, /No signer opens and nothing is broadcast/);

  const confirm = await request(fixture.app).post('/activities/friday-night-assembly/applause/confirm').set('HX-Request', 'true').type('form').send({});
  assert.equal(confirm.status, 200);
  assert.match(confirm.text, /Simulation only/);
  assert.match(confirm.text, /id="applause-count" hx-swap-oob="outerHTML">108/);
  assert.match(confirm.text, /id="pitcher" hx-swap-oob="outerHTML">77%/);
  assert.equal(fixture.diagnostics().internal.simulatedApplause, 1);
  externalZero(fixture.diagnostics());
});

test('journal pagination has HTMX fragment behavior and ordinary-link fallback, and installed HTMX is served locally', async () => {
  const fixture = createCandidateCH1Spike();
  const full = await request(fixture.app).get('/journal?page=2');
  assert.equal(full.status, 200);
  assert.match(full.text, /<!doctype html>/);
  assert.match(full.text, /Sunday reset/);

  const fragment = await request(fixture.app).get('/journal?page=2').set('HX-Request', 'true');
  assert.equal(fragment.status, 200);
  assert.doesNotMatch(fragment.text, /<!doctype html>/);
  assert.match(fragment.text, /id="journal"/);
  assert.match(fragment.text, /Sunday reset/);

  const asset = await request(fixture.app).get('/candidate-c/htmx.js');
  assert.equal(asset.status, 200);
  assert.match(asset.headers['content-type'], /javascript/);
  assert.match(asset.text, /htmx/i);
  externalZero(fixture.diagnostics());
});
