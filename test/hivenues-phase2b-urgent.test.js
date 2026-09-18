'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const { HiVenuesStore } = require('../src/product/store');
const { FileHiVenuesStore } = require('../src/product/file-store');
const { createHiVenuesRouter } = require('../src/product/router');
const { deriveUrgentClosure, diffGraphPaths, graphPaths, verifyUrgentOperation, verifyUrgentRelease } = require('../src/product/urgent');
const { stableDigest } = require('../src/product/model');

const SLUG = 'northline-hall';
const ACTIVITY = 'activity-northline-friday-001';
const FIXED_NOW = Date.parse('2026-09-14T23:45:00Z');

function memoryStore() {
  return new HiVenuesStore({ now: () => FIXED_NOW });
}

function fileStore(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-hivenues-urgent-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const statePath = path.join(directory, 'hivenues-state.json');
  return { statePath, store: new FileHiVenuesStore({ statePath, now: () => FIXED_NOW }) };
}

function appFor(store) {
  const app = express();
  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('view engine', 'ejs');
  app.use(express.urlencoded({ extended: false }));
  app.use('/hivenues', createHiVenuesRouter({ store }));
  return app;
}

function tokens(store, slug = SLUG) {
  const snapshot = store.snapshot(slug);
  return { expectedRevision: snapshot.revision, expectedDraftDigest: snapshot.draftDigest };
}

function externalZero(store) {
  assert.deepEqual(store.diagnostics().external, {
    hiveRpcAttempts: 0, hiveWrites: 0, providerWrites: 0, payments: 0, signingAttempts: 0, deployments: 0,
  });
}

/** Live Release differs from the draft, and the draft carries unrelated edits. */
function divergeDraft(store, slug = SLUG) {
  const t0 = tokens(store, slug);
  assert.equal(store.editTagline(slug, 'Unreleased headline — must stay in Studio.', t0.expectedRevision, t0.expectedDraftDigest).ok, true);
  const t1 = tokens(store, slug);
  assert.equal(store.editActivity(slug, ACTIVITY, { description: 'Unreleased description edit.' }, t1.expectedRevision, t1.expectedDraftDigest).ok, true);
  const live = store.publicSnapshot(slug);
  const draft = store.snapshot(slug);
  assert.notEqual(live.draftDigest, draft.draftDigest);
  assert.equal(live.draft.facts.tagline, 'Good nights live here.');
  return { live, draft };
}

test('graph path diff keys identified collections by id and reports exact changed paths', () => {
  const store = memoryStore();
  const live = store.publicSnapshot(SLUG).draft;
  const changed = structuredClone(live);
  changed.activities[0].lifecycle = 'cancelled';
  changed.offers[0].title = 'Different offer title';
  assert.deepEqual(diffGraphPaths(live, changed), [
    `activities.${ACTIVITY}.lifecycle`,
    'offers.offer-northline-private-001.title',
  ]);
  assert.equal(graphPaths(live).get('activities#ids'), ACTIVITY);
  assert.deepEqual(diffGraphPaths(live, structuredClone(live)), []);
});

test('closure derivation is explicit, provable and refuses targets that are not live', () => {
  const store = memoryStore();
  const live = store.publicSnapshot(SLUG).draft;
  const derived = deriveUrgentClosure(live, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'cancelled', statusNote: 'Storm damage.' });
  assert.equal(derived.ok, true);
  assert.deepEqual(derived.closure.changed, [`activities.${ACTIVITY}.lifecycle`, `activities.${ACTIVITY}.statusNote`]);
  assert.ok(derived.closure.retained.includes('media.media-northline-stage-001'));
  assert.ok(derived.closure.retained.includes('voice.terms.rsvp_local'));
  assert.ok(derived.closure.retained.includes('presentation.compositionFamily'));
  assert.equal(derived.proof.closed, true);
  assert.deepEqual(derived.proof.unexpectedChanges, []);
  assert.deepEqual(derived.proof.actualChanged, derived.closure.changed);
  assert.equal(derived.proof.baseDigest, stableDigest(live));
  assert.equal(derived.proof.resultDigest, stableDigest(derived.snapshot));

  assert.equal(deriveUrgentClosure(live, { kind: 'activity-status', activityId: 'activity-not-live', lifecycle: 'cancelled' }).reason, 'URGENT_TARGET_NOT_LIVE');
  assert.equal(deriveUrgentClosure(live, { kind: 'offer-price', activityId: ACTIVITY, lifecycle: 'cancelled' }).reason, 'UNSUPPORTED_URGENT_CHANGE');
  assert.equal(deriveUrgentClosure(live, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'postponed' }).reason, 'INVALID_LIFECYCLE');
});

test('urgent operation starts from the live Release, publishes only the status, and preserves unrelated draft edits', () => {
  const store = memoryStore();
  const { live, draft } = divergeDraft(store);

  const proposed = store.proposeUrgent(SLUG, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'cancelled', statusNote: 'Tonight is cancelled — refunds at the door.' });
  assert.equal(proposed.ok, true);
  assert.equal(proposed.operation.baseReleaseId, live.liveReleaseId);
  assert.equal(proposed.operation.baseDigest, live.draftDigest);
  assert.equal(proposed.operation.state, 'review');

  const before = tokens(store);
  const executed = store.executeUrgent(SLUG, proposed.operation.id, proposed.operation.baseReleaseId, before.expectedRevision, before.expectedDraftDigest);
  assert.equal(executed.ok, true);
  assert.equal(executed.release.kind, 'urgent');
  assert.equal(executed.release.baseReleaseId, live.liveReleaseId);
  assert.equal(executed.release.operationId, proposed.operation.id);
  assert.equal(executed.carried, true);

  // Public surface comes from the new immutable urgent Release.
  const publicNow = store.publicSnapshot(SLUG);
  assert.equal(publicNow.liveReleaseId, executed.release.id);
  assert.equal(publicNow.draft.activities[0].lifecycle, 'cancelled');
  assert.equal(publicNow.draft.activities[0].statusNote, 'Tonight is cancelled — refunds at the door.');
  // …and differs from live-before at exactly the declared paths.
  assert.deepEqual(diffGraphPaths(live.draft, publicNow.draft), executed.release.changedPaths);
  // Unrelated draft edits did not leak to the public surface.
  assert.equal(publicNow.draft.facts.tagline, 'Good nights live here.');
  assert.notEqual(publicNow.draft.activities[0].description, 'Unreleased description edit.');

  // Unrelated draft edits remain in Studio, still unpublished; the status was carried into the draft as a new revision.
  const draftNow = store.snapshot(SLUG);
  assert.equal(draftNow.revision, draft.revision + 1);
  assert.equal(draftNow.draft.facts.tagline, 'Unreleased headline — must stay in Studio.');
  assert.equal(draftNow.draft.activities[0].description, 'Unreleased description edit.');
  assert.equal(draftNow.draft.activities[0].lifecycle, 'cancelled');
  assert.deepEqual(diffGraphPaths(draft.draft, draftNow.draft), executed.release.changedPaths);
  assert.ok(draftNow.manualPaths.includes(`activities.${ACTIVITY}.lifecycle`));

  // The prior release is untouched and immutable.
  const previous = draftNow.releases.find((item) => item.id === live.liveReleaseId);
  assert.equal(previous.digest, live.draftDigest);
  assert.equal(previous.snapshot.activities[0].lifecycle, 'scheduled');

  // An operation is single use.
  const again = store.executeUrgent(SLUG, proposed.operation.id, executed.release.id, draftNow.revision, draftNow.draftDigest);
  assert.equal(again.ok, false);
  assert.equal(again.reason, 'URGENT_ALREADY_RELEASED');
  externalZero(store);
});

test('urgent execution fails closed on stale live Release and stale draft tokens', () => {
  const store = memoryStore();
  divergeDraft(store);
  const proposed = store.proposeUrgent(SLUG, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'cancelled' });
  assert.equal(proposed.ok, true);

  // Draft moved since review opened → exact revision/digest conflict.
  const stale = tokens(store);
  assert.equal(store.editTagline(SLUG, 'Moved again.', stale.expectedRevision, stale.expectedDraftDigest).ok, true);
  const staleResult = store.executeUrgent(SLUG, proposed.operation.id, proposed.operation.baseReleaseId, stale.expectedRevision, stale.expectedDraftDigest);
  assert.equal(staleResult.ok, false);
  assert.equal(staleResult.reason, 'STALE_REVISION');
  const digestResult = store.executeUrgent(SLUG, proposed.operation.id, proposed.operation.baseReleaseId, store.snapshot(SLUG).revision, '0'.repeat(64));
  assert.equal(digestResult.reason, 'STALE_DIGEST');

  // Live moved since review opened (a whole-host release happened) → fail closed.
  const current = tokens(store);
  assert.equal(store.createRelease(SLUG, current.expectedRevision, current.expectedDraftDigest).ok, true);
  const fresh = tokens(store);
  const liveMoved = store.executeUrgent(SLUG, proposed.operation.id, proposed.operation.baseReleaseId, fresh.expectedRevision, fresh.expectedDraftDigest);
  assert.equal(liveMoved.ok, false);
  assert.equal(liveMoved.reason, 'STALE_LIVE_RELEASE');
  assert.equal(store.publicSnapshot(SLUG).draft.activities[0].lifecycle, 'scheduled');

  // Wrong expected live id from the form is also refused even when the operation base is current.
  const second = store.proposeUrgent(SLUG, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'cancelled' });
  const wrongId = store.executeUrgent(SLUG, second.operation.id, 'release-not-live', fresh.expectedRevision, fresh.expectedDraftDigest);
  assert.equal(wrongId.reason, 'STALE_LIVE_RELEASE');
  externalZero(store);
});

test('durable store persists urgent operations, releases and provenance across restart and validates them fail-closed', (t) => {
  const { statePath, store } = fileStore(t);
  divergeDraft(store);
  const proposed = store.proposeUrgent(SLUG, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'cancelled', statusNote: 'Restart-proof note.' });
  assert.equal(proposed.ok, true);

  const restartedForReview = new FileHiVenuesStore({ statePath });
  const reloaded = restartedForReview.urgentOperation(SLUG, proposed.operation.id);
  assert.equal(reloaded.state, 'review');
  assert.equal(reloaded.proof.closed, true);

  const before = tokens(restartedForReview);
  const executed = restartedForReview.executeUrgent(SLUG, proposed.operation.id, proposed.operation.baseReleaseId, before.expectedRevision, before.expectedDraftDigest);
  assert.equal(executed.ok, true);

  const restarted = new FileHiVenuesStore({ statePath });
  const publicNow = restarted.publicSnapshot(SLUG);
  assert.equal(publicNow.liveReleaseId, executed.release.id);
  assert.equal(publicNow.draft.activities[0].statusNote, 'Restart-proof note.');
  const release = restarted.snapshot(SLUG).releases.find((item) => item.id === executed.release.id);
  assert.equal(release.kind, 'urgent');
  assert.equal(release.baseReleaseId, proposed.operation.baseReleaseId);
  assert.equal(restarted.urgentOperation(SLUG, proposed.operation.id).state, 'released');
  assert.equal(restarted.snapshot(SLUG).draft.facts.tagline, 'Unreleased headline — must stay in Studio.');

  // Tampering with urgent provenance fails closed.
  const envelope = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const workspace = envelope.state.workspaces.find((item) => item.slug === SLUG);
  workspace.releases.find((item) => item.id === executed.release.id).baseReleaseId = 'release-forged';
  fs.writeFileSync(statePath, JSON.stringify(envelope), 'utf8');
  assert.throws(() => new FileHiVenuesStore({ statePath }).snapshot(SLUG), (error) => error.code === 'HIVENUES_INVALID_PERSISTED_STATE');

  const envelope2 = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const workspace2 = envelope2.state.workspaces.find((item) => item.slug === SLUG);
  workspace2.releases.find((item) => item.id === executed.release.id).baseReleaseId = proposed.operation.baseReleaseId;
  workspace2.urgent[0].proof.closed = false;
  fs.writeFileSync(statePath, JSON.stringify(envelope2), 'utf8');
  assert.throws(() => new FileHiVenuesStore({ statePath }).snapshot(SLUG), (error) => error.code === 'HIVENUES_INVALID_PERSISTED_STATE');
});

test('ordinary draft status edit is a normal revision and the next whole-host release carries it', async () => {
  const store = memoryStore();
  const app = appFor(store);
  await request(app)
    .post(`/hivenues/studio/${SLUG}/activity-status`)
    .set('HX-Request', 'true')
    .type('form')
    .send({ ...tokens(store), activityId: ACTIVITY, lifecycle: 'completed', statusNote: 'Thanks for coming.' })
    .expect(200)
    .expect(/id="hivenuesanvas-slot" hx-swap-oob="innerHTML"/)
    .expect(/Already happened/);
  assert.equal(store.snapshot(SLUG).revision, 2);
  assert.equal(store.snapshot(SLUG).draft.activities[0].lifecycle, 'completed');
  assert.equal(store.publicSnapshot(SLUG).draft.activities[0].lifecycle, 'scheduled');
  await request(app)
    .post(`/hivenues/studio/${SLUG}/activity-status`)
    .set('HX-Request', 'true')
    .type('form')
    .send({ expectedRevision: 1, expectedDraftDigest: '0'.repeat(64), activityId: ACTIVITY, lifecycle: 'scheduled' })
    .expect(409);
  await request(app)
    .post(`/hivenues/studio/${SLUG}/activity-status`)
    .type('form')
    .send({ ...tokens(store), activityId: ACTIVITY, lifecycle: 'postponed' })
    .expect(400);
});

test('Studio review distinguishes changed, retained-live and unpublished-draft state and publishes through HTTP', async () => {
  const store = memoryStore();
  const app = appFor(store);
  const { live, draft } = divergeDraft(store);

  const inspector = await request(app).get(`/hivenues/studio/${SLUG}/inspect?resource=activity:${ACTIVITY}`).expect(200);
  assert.match(inspector.text, /Change the live status now/);
  assert.match(inspector.text, /name="lifecycle"/);

  const compose = await request(app).get(`/hivenues/studio/${SLUG}/urgent?activity=${ACTIVITY}`).expect(200);
  assert.match(compose.text, /starts from what visitors see right now/);
  assert.match(compose.text, /Friday Night Assembly · currently happening as planned/);

  const created = await request(app)
    .post(`/hivenues/studio/${SLUG}/urgent`)
    .type('form')
    .send({ activityId: ACTIVITY, lifecycle: 'cancelled', statusNote: 'Power is out on the block.' })
    .expect(303);
  const reviewPath = created.headers.location.replace(/^\/hivenues/, '');
  const operationId = reviewPath.split('/').pop();

  const review = await request(app).get(`/hivenues${reviewPath}`).expect(200);
  assert.match(review.text, /data-urgent-changed/);
  assert.match(review.text, new RegExp(`data-path="activities.${ACTIVITY}.lifecycle"[\\s\\S]*Happening as planned[\\s\\S]*Cancelled`));
  assert.match(review.text, /data-urgent-retained[\s\S]*data-path="media.media-northline-stage-001"/);
  assert.match(review.text, /data-urgent-unpublished[\s\S]*data-path="facts.tagline"/);
  assert.match(review.text, new RegExp(`data-urgent-unpublished[\\s\\S]*data-path="activities.${ACTIVITY}.description"`));
  assert.match(review.text, /data-urgent-closed="true"/);
  assert.match(review.text, /2 unreleased edits in your working version/);
  assert.match(review.text, new RegExp(`name="expectedLiveReleaseId" value="${live.liveReleaseId}"`));
  assert.doesNotMatch(review.text, /Unreleased headline — must stay in Studio\./);

  await request(app)
    .post(`/hivenues/studio/${SLUG}/urgent/${operationId}/publish`)
    .type('form')
    .send({ expectedLiveReleaseId: live.liveReleaseId, ...tokens(store) })
    .expect(303)
    .expect('Location', /\?released=release-2-urgent-[a-f0-9]{10}&urgent=1$/);

  const releasedId = store.publicSnapshot(SLUG).liveReleaseId;
  const studio = await request(app).get(`/hivenues/studio/${SLUG}?released=${releasedId}&urgent=1`).expect(200);
  assert.match(studio.text, /Live site updated\./);
  assert.match(studio.text, /Your other working edits are still here, unpublished\./);
  assert.match(studio.text, /Unreleased headline — must stay in Studio\./);
  assert.match(studio.text, new RegExp(`data-revision="${draft.revision + 1}"`));

  const publicHome = await request(app).get(`/hivenues/${SLUG}`).expect(200);
  assert.match(publicHome.text, /data-activity-status="cancelled"/);
  assert.match(publicHome.text, /Power is out on the block\./);
  assert.match(publicHome.text, /Good nights live here\./);
  assert.doesNotMatch(publicHome.text, /Unreleased headline/);

  const publicActivity = await request(app).get(`/hivenues/${SLUG}/activities/friday-night-assembly`).expect(200);
  assert.match(publicActivity.text, /data-rsvp-closed/);
  assert.doesNotMatch(publicActivity.text, /id="cc-rsvp-name"/);
  await request(app).post(`/hivenues/${SLUG}/activities/friday-night-assembly/rsvp`).set('HX-Request', 'true').type('form').send({ name: 'Late' }).expect(409).expect(/Nothing was recorded/);
  assert.equal(store.diagnostics().local.rsvps, 0);

  const ics = await request(app).get(`/hivenues/${SLUG}/activities/friday-night-assembly/calendar.ics`).expect(200);
  assert.match(ics.text, /STATUS:CANCELLED/);
  assert.match(ics.text, /SUMMARY:Cancelled: Friday Night Assembly/);

  // Replaying the publish is refused and renders the review with a 409.
  await request(app)
    .post(`/hivenues/studio/${SLUG}/urgent/${operationId}/publish`)
    .type('form')
    .send({ expectedLiveReleaseId: releasedId, ...tokens(store) })
    .expect(409)
    .expect(/already gone live/);

  const history = await request(app).get(`/hivenues/studio/${SLUG}/release`).expect(200);
  assert.match(history.text, /Version 1 \+ urgent update · LIVE/);
  assert.match(history.text, /Start an urgent update/);
  externalZero(store);
});

test('urgent compose refuses draft-only activities and review fails closed when live moved', async () => {
  const store = memoryStore();
  const app = appFor(store);
  const missing = await request(app).get(`/hivenues/studio/${SLUG}/urgent?activity=activity-not-live`).expect(200);
  assert.doesNotMatch(missing.text, /not on the live site yet\./);
  await request(app).post(`/hivenues/studio/${SLUG}/urgent`).type('form').send({ activityId: 'activity-not-live', lifecycle: 'cancelled' }).expect(400);

  const created = await request(app).post(`/hivenues/studio/${SLUG}/urgent`).type('form').send({ activityId: ACTIVITY, lifecycle: 'cancelled' }).expect(303);
  const operationId = created.headers.location.split('/').pop();
  const base = store.publicSnapshot(SLUG).liveReleaseId;
  const t0 = tokens(store);
  assert.equal(store.editTagline(SLUG, 'Then a full release.', t0.expectedRevision, t0.expectedDraftDigest).ok, true);
  const t1 = tokens(store);
  assert.equal(store.createRelease(SLUG, t1.expectedRevision, t1.expectedDraftDigest).ok, true);

  const review = await request(app).get(`/hivenues/studio/${SLUG}/urgent/${operationId}`).expect(200);
  assert.match(review.text, /live site changed since this review was prepared/);
  assert.doesNotMatch(review.text, /Publish urgent update/);
  await request(app)
    .post(`/hivenues/studio/${SLUG}/urgent/${operationId}/publish`)
    .type('form')
    .send({ expectedLiveReleaseId: base, ...tokens(store) })
    .expect(409)
    .expect(/live site changed while you were reviewing/);
  assert.equal(store.publicSnapshot(SLUG).draft.activities[0].lifecycle, 'scheduled');
});

test('all three families render status truthfully on home and activity pages', async () => {
  const store = memoryStore();
  const app = appFor(store);
  const cases = [
    ['northline-hall', 'activity-northline-friday-001', 'friday-night-assembly'],
    ['nova-ashby', 'activity-nova-session-001', 'soft-infrastructure-live-session'],
    ['harbor-and-hearth', 'activity-harbor-supper-001', 'sunday-harvest-table'],
  ];
  for (const [slug, activityId, activitySlug] of cases) {
    const proposed = store.proposeUrgent(slug, { kind: 'activity-status', activityId, lifecycle: 'cancelled', statusNote: `Cancelled for ${slug}.` });
    assert.equal(proposed.ok, true, slug);
    const t0 = tokens(store, slug);
    assert.equal(store.executeUrgent(slug, proposed.operation.id, proposed.operation.baseReleaseId, t0.expectedRevision, t0.expectedDraftDigest).ok, true, slug);
    const home = await request(app).get(`/hivenues/${slug}`).expect(200);
    assert.match(home.text, /data-activity-status="cancelled"/, slug);
    assert.match(home.text, new RegExp(`Cancelled for ${slug}\\.`), slug);
    const activity = await request(app).get(`/hivenues/${slug}/activities/${activitySlug}`).expect(200);
    assert.match(activity.text, /data-rsvp-closed/, slug);
    const studio = await request(app).get(`/hivenues/studio/${slug}`).expect(200);
    assert.match(studio.text, /data-activity-status="cancelled"/, `${slug} canvas`);
  }
  externalZero(store);
});

// ---- Corrective pass for Project Lead finding E-PROVENANCE-1 (issue #260 review) ----

test('E-PROVENANCE-1B: changedPaths is the exact actual diff, never the authorized envelope, and no-ops are refused', () => {
  const store = memoryStore();
  const live = store.publicSnapshot(SLUG).draft;
  const lifecyclePath = `activities.${ACTIVITY}.lifecycle`;
  const notePath = `activities.${ACTIVITY}.statusNote`;

  // lifecycle-only
  const lifecycleOnly = deriveUrgentClosure(live, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'cancelled' });
  assert.equal(lifecycleOnly.ok, true);
  assert.deepEqual(lifecycleOnly.closure.authorized, [lifecyclePath, notePath]);
  assert.deepEqual(lifecycleOnly.closure.changed, [lifecyclePath]);
  assert.deepEqual(lifecycleOnly.proof.actualChanged, [lifecyclePath]);
  assert.equal(lifecycleOnly.proof.closed, true);

  // note-only (same lifecycle)
  const noteOnly = deriveUrgentClosure(live, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'scheduled', statusNote: 'Doors at 8 tonight.' });
  assert.equal(noteOnly.ok, true);
  assert.deepEqual(noteOnly.closure.changed, [notePath]);

  // exact no-op
  const noop = deriveUrgentClosure(live, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'scheduled' });
  assert.equal(noop.ok, false);
  assert.equal(noop.reason, 'URGENT_NO_CHANGE');
  assert.equal(store.proposeUrgent(SLUG, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'scheduled' }).reason, 'URGENT_NO_CHANGE');

  // lifecycle-only publish: Release provenance carries exactly one path, and the base→result diff equals it
  const proposed = store.proposeUrgent(SLUG, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'cancelled' });
  const t0 = tokens(store);
  const draftBefore = store.snapshot(SLUG).draft;
  const executed = store.executeUrgent(SLUG, proposed.operation.id, proposed.operation.baseReleaseId, t0.expectedRevision, t0.expectedDraftDigest);
  assert.equal(executed.ok, true);
  assert.deepEqual(executed.release.changedPaths, [lifecyclePath]);
  const base = store.snapshot(SLUG).releases.find((item) => item.id === executed.release.baseReleaseId);
  assert.deepEqual(diffGraphPaths(base.snapshot, executed.release.snapshot), executed.release.changedPaths);
  assert.deepEqual(diffGraphPaths(draftBefore, store.snapshot(SLUG).draft), [lifecyclePath], 'carry-forward touches exactly the actual change');
  assert.ok(store.snapshot(SLUG).manualPaths.includes(lifecyclePath));
  assert.ok(!store.snapshot(SLUG).manualPaths.includes(notePath));

  // note removal on the now-cancelled live site: first add a note, then remove it
  const addNote = store.proposeUrgent(SLUG, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'cancelled', statusNote: 'Refunds at the door.' });
  assert.deepEqual(addNote.operation.closure.changed, [notePath]);
  const t1 = tokens(store);
  assert.equal(store.executeUrgent(SLUG, addNote.operation.id, addNote.operation.baseReleaseId, t1.expectedRevision, t1.expectedDraftDigest).ok, true);
  const removeNote = store.proposeUrgent(SLUG, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'cancelled', statusNote: '' });
  assert.equal(removeNote.ok, true);
  assert.deepEqual(removeNote.operation.closure.changed, [notePath]);
  const t2 = tokens(store);
  const removed = store.executeUrgent(SLUG, removeNote.operation.id, removeNote.operation.baseReleaseId, t2.expectedRevision, t2.expectedDraftDigest);
  assert.equal(removed.ok, true);
  assert.deepEqual(removed.release.changedPaths, [notePath]);
  assert.equal(store.publicSnapshot(SLUG).draft.activities[0].statusNote, undefined);

  // replaying an identical change against the new live is a no-op and cannot mint a Release
  assert.equal(store.proposeUrgent(SLUG, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'cancelled' }).reason, 'URGENT_NO_CHANGE');
  externalZero(store);
});

test('E-PROVENANCE-1B: HTTP compose refuses a no-op calmly and review shows only the exact change', async () => {
  const store = memoryStore();
  const app = appFor(store);
  await request(app)
    .post(`/hivenues/studio/${SLUG}/urgent`)
    .type('form')
    .send({ activityId: ACTIVITY, lifecycle: 'scheduled' })
    .expect(303)
    .expect('Location', `/hivenues/studio/${SLUG}/urgent?activity=${ACTIVITY}&nochange=1`);
  const compose = await request(app).get(`/hivenues/studio/${SLUG}/urgent?activity=${ACTIVITY}&nochange=1`).expect(200);
  assert.match(compose.text, /data-no-change/);
  assert.match(compose.text, /Nothing would change\./);

  const created = await request(app).post(`/hivenues/studio/${SLUG}/urgent`).type('form').send({ activityId: ACTIVITY, lifecycle: 'cancelled' }).expect(303);
  const review = await request(app).get(created.headers.location).expect(200);
  assert.match(review.text, new RegExp(`data-path="activities.${ACTIVITY}.lifecycle"`));
  assert.doesNotMatch(review.text, new RegExp(`data-urgent-changed[\\s\\S]*data-path="activities.${ACTIVITY}.statusNote"`));
  assert.match(review.text, /exact changes 1/);
});


test('E-DRAFT-PRESERVATION-1: lifecycle-only urgent carry preserves a draft-only status note', () => {
  const store = memoryStore();
  const lifecyclePath = `activities.${ACTIVITY}.lifecycle`;
  const notePath = `activities.${ACTIVITY}.statusNote`;

  const t0 = tokens(store);
  assert.equal(store.editActivityStatus(SLUG, ACTIVITY, 'scheduled', 'Draft-only note — keep me.', t0.expectedRevision, t0.expectedDraftDigest).ok, true);
  const draftBefore = store.snapshot(SLUG).draft;
  assert.equal(store.publicSnapshot(SLUG).draft.activities[0].statusNote, undefined);

  const proposed = store.proposeUrgent(SLUG, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'cancelled' });
  assert.deepEqual(proposed.operation.closure.changed, [lifecyclePath]);
  const before = tokens(store);
  const executed = store.executeUrgent(SLUG, proposed.operation.id, proposed.operation.baseReleaseId, before.expectedRevision, before.expectedDraftDigest);
  assert.equal(executed.ok, true);
  assert.deepEqual(executed.release.changedPaths, [lifecyclePath]);

  const publicNow = store.publicSnapshot(SLUG).draft.activities[0];
  assert.equal(publicNow.lifecycle, 'cancelled');
  assert.equal(publicNow.statusNote, undefined, 'draft-only note must not leak into the urgent Release');

  const draftNow = store.snapshot(SLUG).draft.activities[0];
  assert.equal(draftNow.lifecycle, 'cancelled');
  assert.equal(draftNow.statusNote, 'Draft-only note — keep me.', 'unrelated draft note must survive urgent carry');
  assert.deepEqual(diffGraphPaths(draftBefore, store.snapshot(SLUG).draft), [lifecyclePath]);
  assert.ok(!executed.release.changedPaths.includes(notePath));
  externalZero(store);
});

test('E-DRAFT-PRESERVATION-1: note-only urgent carry preserves a draft-only lifecycle', () => {
  const store = memoryStore();
  const lifecyclePath = `activities.${ACTIVITY}.lifecycle`;
  const notePath = `activities.${ACTIVITY}.statusNote`;

  const t0 = tokens(store);
  assert.equal(store.editActivityStatus(SLUG, ACTIVITY, 'completed', '', t0.expectedRevision, t0.expectedDraftDigest).ok, true);
  const draftBefore = store.snapshot(SLUG).draft;
  assert.equal(store.publicSnapshot(SLUG).draft.activities[0].lifecycle, 'scheduled');

  const proposed = store.proposeUrgent(SLUG, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'scheduled', statusNote: 'Doors moved to 9.' });
  assert.deepEqual(proposed.operation.closure.changed, [notePath]);
  const before = tokens(store);
  const executed = store.executeUrgent(SLUG, proposed.operation.id, proposed.operation.baseReleaseId, before.expectedRevision, before.expectedDraftDigest);
  assert.equal(executed.ok, true);
  assert.deepEqual(executed.release.changedPaths, [notePath]);

  const publicNow = store.publicSnapshot(SLUG).draft.activities[0];
  assert.equal(publicNow.lifecycle, 'scheduled');
  assert.equal(publicNow.statusNote, 'Doors moved to 9.');

  const draftNow = store.snapshot(SLUG).draft.activities[0];
  assert.equal(draftNow.lifecycle, 'completed', 'unrelated draft lifecycle must survive urgent carry');
  assert.equal(draftNow.statusNote, 'Doors moved to 9.');
  assert.deepEqual(diffGraphPaths(draftBefore, store.snapshot(SLUG).draft), [notePath]);
  assert.ok(!executed.release.changedPaths.includes(lifecyclePath));
  externalZero(store);
});

test('E-DRAFT-PRESERVATION-1: exact-path carry survives durable restart', (t) => {
  const { statePath, store } = fileStore(t);
  const lifecyclePath = `activities.${ACTIVITY}.lifecycle`;

  const t0 = tokens(store);
  assert.equal(store.editActivityStatus(SLUG, ACTIVITY, 'scheduled', 'Persist this draft-only note.', t0.expectedRevision, t0.expectedDraftDigest).ok, true);
  const proposed = store.proposeUrgent(SLUG, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'cancelled' });
  assert.deepEqual(proposed.operation.closure.changed, [lifecyclePath]);
  const before = tokens(store);
  assert.equal(store.executeUrgent(SLUG, proposed.operation.id, proposed.operation.baseReleaseId, before.expectedRevision, before.expectedDraftDigest).ok, true);

  const restarted = new FileHiVenuesStore({ statePath });
  const publicActivity = restarted.publicSnapshot(SLUG).draft.activities[0];
  const draftActivity = restarted.snapshot(SLUG).draft.activities[0];
  assert.equal(publicActivity.lifecycle, 'cancelled');
  assert.equal(publicActivity.statusNote, undefined);
  assert.equal(draftActivity.lifecycle, 'cancelled');
  assert.equal(draftActivity.statusNote, 'Persist this draft-only note.');
  externalZero(restarted);
});

test('E-PROVENANCE-1A: execution and review use re-derived closure; tampered in-memory closure cannot reach Release provenance', () => {
  const store = memoryStore();
  const proposed = store.proposeUrgent(SLUG, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'cancelled' });
  const workspace = store.workspace(SLUG);
  const operation = workspace.urgent.get(proposed.operation.id);
  operation.closure.changed = [`activities.${ACTIVITY}.lifecycle`, `activities.${ACTIVITY}.statusNote`, 'facts.tagline'];
  const t0 = tokens(store);
  const result = store.executeUrgent(SLUG, operation.id, operation.baseReleaseId, t0.expectedRevision, t0.expectedDraftDigest);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'URGENT_PROVENANCE_MISMATCH');
  assert.deepEqual(result.detail, ['closure.changed']);
  assert.equal(store.publicSnapshot(SLUG).draft.activities[0].lifecycle, 'scheduled');
  assert.equal(store.snapshot(SLUG).releases.length, 1);
});

test('E-PROVENANCE-1A: import re-derives every urgent operation and Release and fails closed on any tampered derived field', (t) => {
  const lifecyclePath = `activities.${ACTIVITY}.lifecycle`;
  const notePath = `activities.${ACTIVITY}.statusNote`;

  function seedReleased(t) {
    const { statePath, store } = fileStore(t);
    divergeDraft(store);
    const proposed = store.proposeUrgent(SLUG, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'cancelled', statusNote: 'Provenance test.' });
    const before = tokens(store);
    const executed = store.executeUrgent(SLUG, proposed.operation.id, proposed.operation.baseReleaseId, before.expectedRevision, before.expectedDraftDigest);
    assert.equal(executed.ok, true);
    // and one still-in-review operation
    const pending = store.proposeUrgent(SLUG, { kind: 'activity-status', activityId: ACTIVITY, lifecycle: 'completed' });
    assert.equal(pending.ok, true);
    return { statePath, releaseId: executed.release.id, operationId: proposed.operation.id, pendingId: pending.operation.id };
  }

  const cases = [
    ['closure.changed (released op)', (w, ids) => { w.urgent.find((o) => o.id === ids.operationId).closure.changed = [lifecyclePath]; }],
    ['closure.authorized', (w, ids) => { w.urgent.find((o) => o.id === ids.operationId).closure.authorized = [lifecyclePath]; }],
    ['closure.retained', (w, ids) => { w.urgent.find((o) => o.id === ids.operationId).closure.retained.pop(); }],
    ['closure.changed (pending op)', (w, ids) => { w.urgent.find((o) => o.id === ids.pendingId).closure.changed.push('facts.tagline'); }],
    ['proof.actualChanged', (w, ids) => { w.urgent.find((o) => o.id === ids.operationId).proof.actualChanged = [notePath]; }],
    ['proof.baseDigest', (w, ids) => { w.urgent.find((o) => o.id === ids.operationId).proof.baseDigest = 'f'.repeat(64); }],
    ['proof.resultDigest', (w, ids) => { w.urgent.find((o) => o.id === ids.operationId).proof.resultDigest = 'f'.repeat(64); }],
    ['proof.retainedMismatch', (w, ids) => { w.urgent.find((o) => o.id === ids.operationId).proof.retainedMismatch = ['media.media-northline-stage-001']; }],
    ['proof.unexpectedChanges', (w, ids) => { w.urgent.find((o) => o.id === ids.operationId).proof.unexpectedChanges = ['facts.tagline']; }],
    ['operation.change (re-derives to a different result)', (w, ids) => { w.urgent.find((o) => o.id === ids.operationId).change.statusNote = 'Different note.'; }],
    ['release.changedPaths superset', (w, ids) => { w.releases.find((r) => r.id === ids.releaseId).changedPaths = [lifecyclePath, notePath, 'facts.tagline']; }],
    ['release.changedPaths subset', (w, ids) => { w.releases.find((r) => r.id === ids.releaseId).changedPaths = [lifecyclePath]; }],
    ['release.changedPaths order', (w, ids) => { w.releases.find((r) => r.id === ids.releaseId).changedPaths = [notePath, lifecyclePath]; }],
    ['release.operationId decoupled', (w, ids) => { w.releases.find((r) => r.id === ids.releaseId).operationId = ids.pendingId; }],
    ['operation.releaseId decoupled', (w, ids) => { w.urgent.find((o) => o.id === ids.operationId).releaseId = w.releases[0].id; }],
    ['operation.baseReleaseId points at the urgent release itself', (w, ids) => { const o = w.urgent.find((o) => o.id === ids.operationId); o.baseReleaseId = ids.releaseId; o.baseDigest = w.releases.find((r) => r.id === ids.releaseId).digest; }],
  ];

  for (const [label, tamper] of cases) {
    const ids = seedReleased(t);
    const envelope = JSON.parse(fs.readFileSync(ids.statePath, 'utf8'));
    const workspace = envelope.state.workspaces.find((item) => item.slug === SLUG);
    tamper(workspace, ids);
    fs.writeFileSync(ids.statePath, JSON.stringify(envelope), 'utf8');
    assert.throws(
      () => new FileHiVenuesStore({ statePath: ids.statePath }).snapshot(SLUG),
      (error) => error.code === 'HIVENUES_INVALID_PERSISTED_STATE',
      `tamper case must fail closed: ${label}`
    );
  }

  // Control: the untampered file still loads and re-verifies exactly.
  const ids = seedReleased(t);
  const restarted = new FileHiVenuesStore({ statePath: ids.statePath });
  const snapshot = restarted.snapshot(SLUG);
  const release = snapshot.releases.find((item) => item.id === ids.releaseId);
  const base = snapshot.releases.find((item) => item.id === release.baseReleaseId);
  const operation = restarted.urgentOperation(SLUG, ids.operationId);
  const verified = verifyUrgentOperation(base, operation);
  assert.equal(verified.ok, true);
  assert.equal(verifyUrgentRelease(base, release, verified.derived).ok, true);
  assert.deepEqual(release.changedPaths, diffGraphPaths(base.snapshot, release.snapshot));
});
