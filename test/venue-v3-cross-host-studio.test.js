'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const {
  deriveV3DeploymentAgnosticVenueSourceDigest,
  serializeV3DeploymentAgnosticVenueSource,
} = require('../src/venue/v3/source');
const {
  loadV3DeploymentAgnosticVenueSourceFile,
} = require('../src/venue/v3/source-file');
const {
  createReferenceV3AuthoringStudioFixture,
} = require('./support/v3-authoring-studio-fixture');

function canonical(source) {
  return serializeV3DeploymentAgnosticVenueSource(source);
}

function selectedActivity(fixture) {
  if (fixture.referenceId === 'migratedPhysical') {
    return fixture.source.resources.activities.find((activity) => activity.publicActions.length > 0)
      || fixture.source.resources.activities[0];
  }
  return fixture.source.resources.activities[0];
}

async function post(app, endpoint, body) {
  const response = await request(app).post(`/v3-studio/${endpoint}`).type('form').send(body);
  assert.equal(response.status, 303, `${endpoint}: ${response.text}`);
  return response;
}

async function apply(app, activityId) {
  await post(app, 'apply', { activityId });
}

async function proposeAndApply(app, endpoint, body) {
  await post(app, endpoint, body);
  await apply(app, body.activityId);
}

function externalZero(diagnostics) {
  assert.equal(diagnostics.hiveRpcAttempts, 0);
  assert.equal(diagnostics.hiveWrites, 0);
  assert.equal(diagnostics.providerWrites, 0);
  assert.equal(diagnostics.payments, 0);
  assert.equal(diagnostics.signingAttempts, 0);
  assert.equal(diagnostics.mediaUploads, 0);
  assert.equal(diagnostics.reservationMutations, 0);
  assert.equal(diagnostics.ticketPurchases, 0);
  assert.equal(diagnostics.deployments, 0);
}

test('one v3 Studio application exposes the converged Studio shell, ordinary controls and real renderer preview for R1/R2/R3', async () => {
  for (const referenceId of ['migratedPhysical', 'nativeCreator', 'nativeRelease']) {
    const fixture = createReferenceV3AuthoringStudioFixture(referenceId);
    const activity = selectedActivity(fixture);
    const response = await request(fixture.app).get(`/v3-studio?activityId=${encodeURIComponent(activity.id)}`);
    assert.equal(response.status, 200, referenceId);
    assert.match(response.text, /<title>HiVenues Studio ·/);
    assert.match(response.text, /<div class="eyebrow">HiVenues Studio<\/div>/);
    assert.match(response.text, /Activity workspace · Live generated preview/);
    assert.match(response.text, /data-s6-product-convergence="true"/);
    assert.match(response.text, /data-s6-state-feedback="true"/);
    assert.match(response.text, /Edit activity/);
    assert.match(response.text, /Activity selection/);
    assert.doesNotMatch(response.text, /HiVenues v3 Studio · S4 journey/);
    assert.match(response.text, /Generated activity preview/);
    assert.match(response.text, /Preview title/);
    assert.match(response.text, /Public actions/);
    assert.match(response.text, /Promotional media/);
    assert.doesNotMatch(response.text, /expectedDraftDigest|sourcePointer|history entry|raw JSON/i);
    const preview = await request(fixture.app).get(`/v3-preview/activities/${encodeURIComponent(activity.slug)}`);
    assert.equal(preview.status, 200, referenceId);
    assert.match(preview.text, new RegExp(activity.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(fixture.authority.runtimeWired, false);
    assert.equal(fixture.authority.externalEffects, false);
    externalZero(fixture.diagnostics());
  }
});

test('R1 migrated physical journey preserves legacy provenance while composing text, native action, promo media and exact history', async () => {
  const fixture = createReferenceV3AuthoringStudioFixture('migratedPhysical');
  const activity = selectedActivity(fixture);
  const original = fixture.session().draftSource;
  const legacy = activity.publicActions.find((action) => action.role === 'LEGACY_EXTERNAL');
  assert.ok(legacy, 'R1 requires migrated legacy provenance');

  await post(fixture.app, 'text', { activityId: activity.id, field: 'title', value: 'S4 Physical Journey Preview' });
  assert.equal(fixture.proposal().previewSource.resources.activities.find((item) => item.id === activity.id).title, 'S4 Physical Journey Preview');
  assert.equal(canonical(fixture.session().draftSource), canonical(original));
  await post(fixture.app, 'discard', { activityId: activity.id });
  assert.equal(canonical(fixture.session().draftSource), canonical(original));

  await proposeAndApply(fixture.app, 'text', { activityId: activity.id, field: 'title', value: 'S4 Physical Journey' });
  await proposeAndApply(fixture.app, 'action-add', {
    activityId: activity.id,
    role: 'TICKETS',
    label: 'Tickets',
    href: 'https://tickets.example/s4-physical',
  });
  const promoA = fixture.source.media.assets.find((asset) => asset.id.endsWith('promo-a'));
  const promoB = fixture.source.media.assets.find((asset) => asset.id.endsWith('promo-b'));
  await proposeAndApply(fixture.app, 'media-add', { activityId: activity.id, assetId: promoA.id });
  await proposeAndApply(fixture.app, 'media-add', { activityId: activity.id, assetId: promoB.id });
  await proposeAndApply(fixture.app, 'media-move', {
    activityId: activity.id,
    assetId: promoB.id,
    role: 'PROMO',
    beforeAssetId: promoA.id,
    beforeRole: 'PROMO',
  });

  let current = fixture.session().draftSource.resources.activities.find((item) => item.id === activity.id);
  assert.equal(current.publicActions.find((action) => action.id === legacy.id).role, 'LEGACY_EXTERNAL');
  assert.equal(current.publicActions.some((action) => action.role === 'TICKETS'), true);
  assert.deepEqual(current.managedMedia.filter((usage) => usage.role === 'PROMO').map((usage) => usage.assetId), [promoB.id, promoA.id]);
  const afterMove = canonical(fixture.session().draftSource);
  await post(fixture.app, 'undo', { activityId: activity.id });
  current = fixture.session().draftSource.resources.activities.find((item) => item.id === activity.id);
  assert.deepEqual(current.managedMedia.filter((usage) => usage.role === 'PROMO').map((usage) => usage.assetId), [promoA.id, promoB.id]);
  await post(fixture.app, 'redo', { activityId: activity.id });
  assert.equal(canonical(fixture.session().draftSource), afterMove);
  externalZero(fixture.diagnostics());
});

test('R2 creator journey preserves locationless semantics while composing online presence, WATCH action and promo media', async () => {
  const fixture = createReferenceV3AuthoringStudioFixture('nativeCreator');
  const activity = selectedActivity(fixture);
  await proposeAndApply(fixture.app, 'text', { activityId: activity.id, field: 'title', value: 'S4 Creator Session' });
  await proposeAndApply(fixture.app, 'presence', {
    activityId: activity.id,
    kind: 'ONLINE',
    destinationId: activity.presence.destinations[0].id,
    destinationLabel: 'Watch the creator live',
    destinationHref: 'https://stream.example/s4-creator',
  });
  await proposeAndApply(fixture.app, 'action-add', {
    activityId: activity.id,
    role: 'WATCH',
    label: 'Watch live',
    href: 'https://watch.example/s4-creator',
  });
  const promo = fixture.source.media.assets.find((asset) => asset.id.endsWith('promo-a'));
  await proposeAndApply(fixture.app, 'media-add', { activityId: activity.id, assetId: promo.id });
  const current = fixture.session().draftSource.resources.activities[0];
  assert.equal(fixture.session().draftSource.venue.business, null);
  assert.equal(current.presence.kind, 'ONLINE');
  assert.equal(current.presence.destinations[0].label, 'Watch the creator live');
  assert.equal(current.publicActions.some((action) => action.role === 'WATCH'), true);
  assert.equal(current.managedMedia.some((usage) => usage.assetId === promo.id && usage.role === 'PROMO'), true);
  externalZero(fixture.diagnostics());
});

test('R3 release journey preserves RELEASE/NONE semantics while composing LISTEN action and promo media', async () => {
  const fixture = createReferenceV3AuthoringStudioFixture('nativeRelease');
  const activity = selectedActivity(fixture);
  const originalTemporal = JSON.parse(JSON.stringify(activity.temporal));
  await proposeAndApply(fixture.app, 'text', { activityId: activity.id, field: 'title', value: 'S4 Afterglow Release' });
  await proposeAndApply(fixture.app, 'action-add', {
    activityId: activity.id,
    role: 'LISTEN',
    label: 'Listen to Afterglow',
    href: 'https://listen.example/s4-afterglow',
  });
  const promo = fixture.source.media.assets.find((asset) => asset.id.endsWith('promo-a'));
  await proposeAndApply(fixture.app, 'media-add', { activityId: activity.id, assetId: promo.id });
  const current = fixture.session().draftSource.resources.activities[0];
  assert.deepEqual(current.temporal, originalTemporal);
  assert.deepEqual(current.presence, { kind: 'NONE' });
  assert.equal(current.publicActions.some((action) => action.role === 'LISTEN'), true);
  assert.equal(current.managedMedia.some((usage) => usage.assetId === promo.id), true);
  externalZero(fixture.diagnostics());
});

test('shared S4 persistence saves accepted draft and fresh-reopens the exact digest without external effects', async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-v3-s4-'));
  const sourceFilename = path.join(workspace, 'venue-source-v3.json');
  try {
    const fixture = createReferenceV3AuthoringStudioFixture('nativeCreator', { sourceFilename });
    const activity = selectedActivity(fixture);
    await proposeAndApply(fixture.app, 'text', { activityId: activity.id, field: 'title', value: 'Persisted S4 Creator Session' });
    await post(fixture.app, 'save', { activityId: activity.id });
    const reopened = loadV3DeploymentAgnosticVenueSourceFile(sourceFilename);
    assert.equal(deriveV3DeploymentAgnosticVenueSourceDigest(reopened), fixture.session().draftDigest);
    assert.equal(canonical(reopened), canonical(fixture.session().draftSource));
    const diagnostics = fixture.diagnostics();
    assert.equal(diagnostics.saveRequests, 1);
    assert.equal(diagnostics.saveSuccesses, 1);
    assert.equal(diagnostics.persistentWrites, 1);
    assert.equal(diagnostics.freshReopens, 1);
    externalZero(diagnostics);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('S6 reconciliation audit: shared adapter has no host fork and S4 authority remains in the byte-preserved core', () => {
  const adapter = fs.readFileSync(path.join(__dirname, '..', 'src', 'venue', 'v3', 'studio-app.js'), 'utf8');
  const core = fs.readFileSync(path.join(__dirname, '..', 'src', 'venue', 'v3', 'studio-app-core.js'), 'utf8');
  assert.doesNotMatch(adapter, /migratedPhysical|nativeCreator|nativeRelease|hostType|providerName|providerUrl/);
  assert.doesNotMatch(core, /migratedPhysical|nativeCreator|nativeRelease|hostType|providerName|providerUrl/);
  assert.match(adapter, /createCoreV3AuthoringStudioApp/);
  assert.doesNotMatch(adapter, /createV3ActivityAuthoringSession|atomicSaveV3DeploymentAgnosticVenueSourceFile/);
  assert.match(core, /createV3ActivityAuthoringSession/);
  assert.match(core, /atomicSaveV3DeploymentAgnosticVenueSourceFile/);
});