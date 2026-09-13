'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');

const {
  SAFE_V3_STUDIO_ERROR,
} = require('../src/venue/v3/studio-app');
const {
  deriveV3DeploymentAgnosticVenueSourceDigest,
} = require('../src/venue/v3/source');
const {
  loadV3DeploymentAgnosticVenueSourceFile,
} = require('../src/venue/v3/source-file');
const {
  createReferenceV3AuthoringStudioFixture,
} = require('./support/v3-authoring-studio-fixture');

const REFERENCES = Object.freeze(['migratedPhysical', 'nativeCreator', 'nativeRelease']);

function activity(fixture) {
  return fixture.source.resources.activities[0];
}

function assertPrimaryState(html, id, label) {
  assert.match(html, /data-s6-product-convergence="true"/);
  assert.match(html, new RegExp(`data-s6-studio-state="${id}"`));
  assert.match(
    html,
    /<div class="status" role="status" aria-label="Studio status" aria-live="polite" aria-atomic="true" data-s6-state-feedback="true">/,
  );
  assert.match(
    html,
    new RegExp(`<span class="state-stage" data-s6-state="${id}">${label}<\\/span>`),
  );
}

function assertZeroExternal(diagnostics) {
  for (const key of [
    'hiveRpcAttempts', 'hiveWrites', 'providerWrites', 'payments', 'signingAttempts',
    'mediaUploads', 'reservationMutations', 'ticketPurchases', 'deployments',
  ]) assert.equal(diagnostics[key], 0, key);
}

test('S6 converges the functional v3 Studio product shell across R1/R2/R3', async () => {
  for (const referenceId of REFERENCES) {
    const fixture = createReferenceV3AuthoringStudioFixture(referenceId);
    const response = await request(fixture.app).get('/v3-studio').expect(200);

    assert.match(response.text, /<title>HiVenues Studio · /, referenceId);
    assert.match(response.text, /<div class="eyebrow">HiVenues Studio<\/div>/, referenceId);
    assert.match(response.text, /Activity workspace · Live generated preview/, referenceId);
    assert.doesNotMatch(response.text, /S4 journey/, referenceId);
    assertPrimaryState(response.text, 'session', 'Session draft');
    assert.match(response.text, /data-s6-edit-selection="true"><h2>Edit activity<\/h2>/, referenceId);
    assert.match(response.text, /<label>Activity selection<select name="activityId">/, referenceId);
    assert.match(response.text, /data-s6-workspace-state="session">Session changes are in memory only\.<\/p>/, referenceId);
    assert.match(response.text, /Generated activity preview/, referenceId);
    assert.equal(fixture.authority.runtimeWired, false, referenceId);
    assert.equal(fixture.authority.externalEffects, false, referenceId);
    assertZeroExternal(fixture.diagnostics());
  }
});

test('S6 v3 Studio exposes preview state without weakening proposal isolation', async () => {
  const fixture = createReferenceV3AuthoringStudioFixture('nativeCreator');
  const selected = activity(fixture);
  const openingDigest = fixture.session().draftDigest;

  const proposed = await request(fixture.app)
    .post('/v3-studio/text')
    .type('form')
    .send({ activityId: selected.id, field: 'title', value: 'S6 creator preview' });
  assert.equal(proposed.status, 303);
  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.ok(fixture.proposal());

  let response = await request(fixture.app).get(proposed.headers.location).expect(200);
  assertPrimaryState(response.text, 'preview', 'Preview');
  assert.match(response.text, /data-s6-workspace-state="preview-blocked">Preview is not applied\. Apply or discard it before saving\.<\/p>/);
  assert.match(response.text, /Preview — not applied/);

  const applied = await request(fixture.app)
    .post('/v3-studio/apply')
    .type('form')
    .send({ activityId: selected.id });
  assert.equal(applied.status, 303);
  assert.equal(fixture.proposal(), null);
  assert.notEqual(fixture.session().draftDigest, openingDigest);

  response = await request(fixture.app).get(applied.headers.location).expect(200);
  assertPrimaryState(response.text, 'session', 'Session draft');
  assertZeroExternal(fixture.diagnostics());
});

test('S6 v3 Studio distinguishes unsaved and saved workspace states using core persistence authority', async (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-s6-v3-state-'));
  const sourceFilename = path.join(workspace, 'venue-source-v3.json');
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const fixture = createReferenceV3AuthoringStudioFixture('nativeCreator', { sourceFilename });
  const selected = activity(fixture);

  let response = await request(fixture.app).get('/v3-studio').expect(200);
  assertPrimaryState(response.text, 'unsaved', 'Unsaved draft');
  assert.match(response.text, /data-s6-workspace-state="unsaved">No workspace checkpoint has been saved yet\.<\/p>/);

  let result = await request(fixture.app)
    .post('/v3-studio/save')
    .type('form')
    .send({ activityId: selected.id });
  assert.equal(result.status, 303);

  response = await request(fixture.app).get(result.headers.location).expect(200);
  assertPrimaryState(response.text, 'saved', 'Saved workspace');
  assert.match(response.text, /data-s6-workspace-state="saved">Accepted draft matches the saved workspace\.<\/p>/);

  result = await request(fixture.app)
    .post('/v3-studio/text')
    .type('form')
    .send({ activityId: selected.id, field: 'title', value: 'S6 persisted creator edit' });
  assert.equal(result.status, 303);
  response = await request(fixture.app).get(result.headers.location).expect(200);
  assertPrimaryState(response.text, 'preview', 'Preview');

  result = await request(fixture.app)
    .post('/v3-studio/apply')
    .type('form')
    .send({ activityId: selected.id });
  assert.equal(result.status, 303);
  response = await request(fixture.app).get(result.headers.location).expect(200);
  assertPrimaryState(response.text, 'unsaved', 'Unsaved draft');
  assert.match(response.text, /data-s6-workspace-state="unsaved">Accepted draft has unsaved workspace changes\.<\/p>/);

  result = await request(fixture.app)
    .post('/v3-studio/save')
    .type('form')
    .send({ activityId: selected.id });
  assert.equal(result.status, 303);
  response = await request(fixture.app).get(result.headers.location).expect(200);
  assertPrimaryState(response.text, 'saved', 'Saved workspace');

  const reopened = loadV3DeploymentAgnosticVenueSourceFile(sourceFilename);
  assert.equal(
    deriveV3DeploymentAgnosticVenueSourceDigest(reopened),
    fixture.session().draftDigest,
  );
  const diagnostics = fixture.diagnostics();
  assert.equal(diagnostics.saveRequests, 2);
  assert.equal(diagnostics.saveSuccesses, 2);
  assert.equal(diagnostics.persistentWrites, 2);
  assert.equal(diagnostics.freshReopens, 2);
  assertZeroExternal(diagnostics);
});

test('S6 v3 Studio uses action-neutral safe recovery copy for rejected non-preview actions', async () => {
  const fixture = createReferenceV3AuthoringStudioFixture('nativeRelease');
  const selected = activity(fixture);
  const openingDigest = fixture.session().draftDigest;

  const rejected = await request(fixture.app)
    .post('/v3-studio/save')
    .type('form')
    .send({ activityId: selected.id });
  assert.equal(rejected.status, 303);

  const response = await request(fixture.app).get(rejected.headers.location).expect(200);
  assert.match(response.text, /<p class="error" role="alert">/);
  assert.match(response.text, new RegExp(SAFE_V3_STUDIO_ERROR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(response.text, /could not be previewed/i);
  assert.equal(fixture.session().draftDigest, openingDigest);
  assert.equal(fixture.proposal(), null);
  assert.equal(fixture.diagnostics().persistentWrites, 0);
  assertZeroExternal(fixture.diagnostics());
});

test('S6 v3 adapter preserves S4 authority in the byte-preserved core without host forks', () => {
  const root = path.join(__dirname, '..', 'src', 'venue', 'v3');
  const core = fs.readFileSync(path.join(root, 'studio-app-core.js'), 'utf8');
  const adapter = fs.readFileSync(path.join(root, 'studio-app.js'), 'utf8');

  assert.match(core, /createV3ActivityAuthoringSession/);
  assert.match(core, /atomicSaveV3DeploymentAgnosticVenueSourceFile/);
  assert.doesNotMatch(adapter, /migratedPhysical|nativeCreator|nativeRelease|hostType|providerName|providerUrl/);
  assert.match(adapter, /createCoreV3AuthoringStudioApp/);
  assert.match(adapter, /fixture\.proposal\(\)/);
  assert.match(adapter, /fixture\.persistence\(\)/);
  assert.match(adapter, /fixture\.session\(\)\.draftDigest/);
});
