'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const { FileHiVenuesStore } = require('../src/product/file-store');
const { createHiVenuesRouter } = require('../src/product/router');

function storeFixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-hivenues-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const statePath = path.join(directory, 'hivenues-state.json');
  return {
    directory,
    statePath,
    store: new FileHiVenuesStore({ statePath, now: () => Date.parse('2026-09-14T20:00:00Z') }),
  };
}

function appFixture(store) {
  const app = express();
  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('view engine', 'ejs');
  app.use(express.urlencoded({ extended: false }));
  app.use('/hivenues', createHiVenuesRouter({ store }));
  return app;
}

test('Phase 2B durable store survives restart with exact revision and digest', (t) => {
  const { statePath, store } = storeFixture(t);
  const before = store.snapshot('northline-hall');
  const result = store.editTagline(
    'northline-hall',
    'Restart-proof host copy.',
    before.revision,
    before.draftDigest
  );
  assert.equal(result.ok, true);

  const restarted = new FileHiVenuesStore({ statePath });
  const after = restarted.snapshot('northline-hall');
  assert.equal(after.revision, 2);
  assert.equal(after.draft.facts.tagline, 'Restart-proof host copy.');
  assert.equal(after.draftDigest, result.snapshot.draftDigest);
  assert.deepEqual(after.manualPaths, ['facts.tagline']);
});

test('independent stores reject stale revision and same-revision digest mismatch', (t) => {
  const { statePath, store: storeA } = storeFixture(t);
  const storeB = new FileHiVenuesStore({ statePath });
  const a0 = storeA.snapshot('northline-hall');
  const b0 = storeB.snapshot('northline-hall');
  assert.equal(a0.revision, b0.revision);
  assert.equal(a0.draftDigest, b0.draftDigest);

  const accepted = storeA.editTagline('northline-hall', 'Writer A wins.', a0.revision, a0.draftDigest);
  assert.equal(accepted.ok, true);

  const stale = storeB.editTagline('northline-hall', 'Writer B must not overwrite.', b0.revision, b0.draftDigest);
  assert.equal(stale.ok, false);
  assert.equal(stale.reason, 'STALE_REVISION');
  assert.equal(storeB.snapshot('northline-hall').draft.facts.tagline, 'Writer A wins.');

  const current = storeB.snapshot('northline-hall');
  const digestMismatch = storeB.editTagline(
    'northline-hall',
    'Wrong digest must not land.',
    current.revision,
    '0'.repeat(64)
  );
  assert.equal(digestMismatch.ok, false);
  assert.equal(digestMismatch.reason, 'STALE_DIGEST');
  assert.equal(storeB.snapshot('northline-hall').draft.facts.tagline, 'Writer A wins.');

  const missingDigest = storeB.editTagline('northline-hall', 'Missing digest must not land.', current.revision);
  assert.equal(missingDigest.ok, false);
  assert.equal(missingDigest.reason, 'INVALID_DRAFT_DIGEST');
});

test('release snapshot remains immutable after later draft edits and restart', (t) => {
  const { statePath, store } = storeFixture(t);
  const initial = store.snapshot('nova-ashby');
  assert.equal(store.editTagline(
    'nova-ashby',
    'Release-bound copy.',
    initial.revision,
    initial.draftDigest
  ).ok, true);

  const releaseCandidate = store.snapshot('nova-ashby');
  const released = store.createRelease(
    'nova-ashby',
    releaseCandidate.revision,
    releaseCandidate.draftDigest
  );
  assert.equal(released.ok, true);
  const releaseId = released.release.id;
  const releaseDigest = released.release.digest;

  const afterRelease = store.snapshot('nova-ashby');
  assert.equal(store.editTagline(
    'nova-ashby',
    'Later draft only.',
    afterRelease.revision,
    afterRelease.draftDigest
  ).ok, true);

  const restarted = new FileHiVenuesStore({ statePath });
  const draft = restarted.snapshot('nova-ashby');
  const publicSnapshot = restarted.publicSnapshot('nova-ashby');
  const release = draft.releases.find((item) => item.id === releaseId);
  assert.equal(draft.draft.facts.tagline, 'Later draft only.');
  assert.equal(publicSnapshot.draft.facts.tagline, 'Release-bound copy.');
  assert.equal(publicSnapshot.draftDigest, releaseDigest);
  assert.equal(release.digest, releaseDigest);
  assert.equal(release.snapshot.facts.tagline, 'Release-bound copy.');
});

test('durable state fails closed for malformed, unsupported and tampered persistence', (t) => {
  const { statePath, store } = storeFixture(t);
  store.snapshot('northline-hall');

  fs.writeFileSync(statePath, '{broken', 'utf8');
  assert.throws(
    () => new FileHiVenuesStore({ statePath }).snapshot('northline-hall'),
    (error) => error.code === 'HIVENUES_STATE_PARSE_FAILED'
  );
  assert.equal(fs.readFileSync(statePath, 'utf8'), '{broken');

  fs.writeFileSync(statePath, JSON.stringify({ storageVersion: 999, state: {} }), 'utf8');
  assert.throws(
    () => new FileHiVenuesStore({ statePath }).snapshot('northline-hall'),
    (error) => error.code === 'HIVENUES_STATE_VERSION_UNSUPPORTED'
  );

  fs.rmSync(statePath, { force: true });
  const fresh = new FileHiVenuesStore({ statePath });
  fresh.snapshot('northline-hall');
  const envelope = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  envelope.state.workspaces[0].draft.facts.tagline = 'Tampered without history provenance.';
  fs.writeFileSync(statePath, JSON.stringify(envelope), 'utf8');
  assert.throws(
    () => new FileHiVenuesStore({ statePath }).snapshot(envelope.state.workspaces[0].slug),
    (error) => error.code === 'HIVENUES_INVALID_PERSISTED_STATE'
  );

  fs.rmSync(statePath, { force: true });
  const freshRelease = new FileHiVenuesStore({ statePath });
  freshRelease.snapshot('northline-hall');
  const releaseEnvelope = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  releaseEnvelope.state.workspaces[0].releases[0].snapshot.facts.tagline = 'Tampered release snapshot.';
  fs.writeFileSync(statePath, JSON.stringify(releaseEnvelope), 'utf8');
  assert.throws(
    () => new FileHiVenuesStore({ statePath }).snapshot(releaseEnvelope.state.workspaces[0].slug),
    (error) => error.code === 'HIVENUES_INVALID_PERSISTED_STATE'
  );
});

test('Studio emits revision plus digest tokens and durable router rejects a missing digest', async (t) => {
  const { store } = storeFixture(t);
  const app = appFixture(store);
  const inspector = await request(app)
    .get('/hivenues/studio/northline-hall/inspect?resource=facts.tagline')
    .expect(200);
  assert.match(inspector.text, /name="expectedRevision" value="1"/);
  assert.match(inspector.text, /name="expectedDraftDigest" value="[a-f0-9]{64}"/);

  await request(app)
    .post('/hivenues/studio/northline-hall/tagline')
    .set('HX-Request', 'true')
    .type('form')
    .send({ expectedRevision: 1, tagline: 'No digest.' })
    .expect(409)
    .expect(/newer version exists/i);

  const before = store.snapshot('northline-hall');
  await request(app)
    .post('/hivenues/studio/northline-hall/tagline')
    .set('HX-Request', 'true')
    .type('form')
    .send({
      expectedRevision: before.revision,
      expectedDraftDigest: before.draftDigest,
      tagline: 'Dual-token save.',
    })
    .expect(200);
  assert.equal(store.snapshot('northline-hall').draft.facts.tagline, 'Dual-token save.');
});