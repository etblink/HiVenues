'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { seedCandidateCHosts } = require('../src/candidate-c/fixtures');
const { getMaximalTerritoryHost } = require('../src/candidate-c/territory-fixture');
const {
  hostGraphV1Schema,
  hostGraphV2Schema,
  stableDigest,
  validateHostGraph,
} = require('../src/candidate-c/model');
const {
  buildTerritoryProjection,
  compositionRecipeRegistry,
  findTerritorySurface,
  templateForSurface,
} = require('../src/candidate-c/territory');

const NORTHLINE_V1_FROZEN_DIGEST = '0f1fd0740ab64dede486c8ff604d084e11cec5a53c70c485aabf81cf2caee431';

test('Territory Kernel preserves the exact frozen v1 graph digest and does not inject v2 fields', () => {
  const northline = seedCandidateCHosts()[0];
  assert.equal(northline.schemaVersion, 1);
  assert.equal(stableDigest(northline), NORTHLINE_V1_FROZEN_DIGEST);
  assert.equal(hostGraphV1Schema.safeParse(northline).success, true);

  const roundTrip = validateHostGraph(JSON.parse(JSON.stringify(northline)));
  assert.equal(stableDigest(roundTrip), NORTHLINE_V1_FROZEN_DIGEST);
  assert.equal(JSON.stringify(roundTrip), JSON.stringify(northline));
  assert.equal(Object.hasOwn(roundTrip, 'stories'), false);
  assert.equal(Object.hasOwn(roundTrip, 'people'), false);
  assert.equal(Object.hasOwn(roundTrip, 'gallery'), false);
  assert.equal(Object.hasOwn(roundTrip, 'navigation'), false);
});

test('HostGraph v2 validates rich semantic territory objects without weakening v1 validation', () => {
  const host = getMaximalTerritoryHost();
  assert.equal(host.schemaVersion, 2);
  assert.equal(hostGraphV2Schema.safeParse(host).success, true);
  assert.equal(hostGraphV1Schema.safeParse(host).success, false);
  assert.equal(host.stories.length, 3);
  assert.equal(host.people.length, 3);
  assert.equal(host.gallery.mediaIds.length, 7);

  const missingMedia = structuredClone(host);
  missingMedia.gallery.mediaIds.push('media-does-not-exist');
  assert.throws(
    () => validateHostGraph(missingMedia),
    /gallery references missing media/
  );

  const missingAuthor = structuredClone(host);
  missingAuthor.stories[0].authorProfileIds = ['person-does-not-exist'];
  assert.throws(
    () => validateHostGraph(missingAuthor),
    /story references missing profile/
  );
});

test('v1 projects non-destructively into a sparse territory surface plan', () => {
  const northline = seedCandidateCHosts()[0];
  const before = JSON.stringify(northline);
  const projection = buildTerritoryProjection(northline);

  assert.equal(JSON.stringify(northline), before);
  assert.equal(projection.graphVersion, 1);
  assert.equal(projection.familyId, 'poster');
  assert.deepEqual(
    projection.navigation.map((item) => item.role),
    ['home', 'activities', 'offers', 'about-visit']
  );
  assert.ok(findTerritorySurface(projection, 'home'));
  assert.ok(findTerritorySurface(projection, 'activity-detail', 'friday-night-assembly'));
  assert.equal(findTerritorySurface(projection, 'stories-index'), null);
  assert.equal(findTerritorySurface(projection, 'gallery'), null);
  assert.equal(findTerritorySurface(projection, 'people-index'), null);
});

test('one rich v2 host projects all required semantic surfaces with stable resource identity', () => {
  const host = getMaximalTerritoryHost();
  const projection = buildTerritoryProjection(host);

  const expectedRoles = [
    'home',
    'activities-index',
    'activity-detail',
    'offers',
    'stories-index',
    'story-detail',
    'gallery',
    'people-index',
    'profile-detail',
    'about-visit',
  ];
  for (const role of expectedRoles) {
    assert.ok(findTerritorySurface(projection, role), `missing ${role}`);
  }

  assert.equal(
    findTerritorySurface(projection, 'activity-detail', 'after-dark-listening-room').resourceId,
    'activity-lantern-listening-001'
  );
  assert.equal(
    findTerritorySurface(projection, 'story-detail', 'the-roofline-is-an-instrument').resourceId,
    'story-lantern-roofline-001'
  );
  assert.equal(
    findTerritorySurface(projection, 'profile-detail', 'mara-vale').resourceId,
    'person-lantern-mara-001'
  );

  assert.deepEqual(
    projection.navigation.map((item) => item.label),
    ['Home', 'What is on', 'Dispatches', 'Room studies', 'Take something with you', 'People', 'Find the room']
  );
});

test('same semantic host can change Direction recipe without changing semantic object identity', () => {
  const base = getMaximalTerritoryHost();
  const semanticDigest = (host) => stableDigest({
    identity: host.identity,
    facts: host.facts,
    activities: host.activities,
    offers: host.offers,
    stories: host.stories,
    people: host.people,
    gallery: host.gallery,
    media: host.media,
    voice: host.voice,
    bindings: host.bindings,
  });

  const originalSemanticDigest = semanticDigest(base);
  const projections = {};

  for (const familyId of ['poster', 'editorial', 'hospitality']) {
    const host = structuredClone(base);
    host.presentation.compositionFamily = familyId;
    host.intent.direction = familyId;
    projections[familyId] = buildTerritoryProjection(host);
    assert.equal(semanticDigest(host), originalSemanticDigest);
    assert.equal(projections[familyId].familyId, familyId);
    assert.equal(
      findTerritorySurface(projections[familyId], 'story-detail', 'the-roofline-is-an-instrument').resourceId,
      'story-lantern-roofline-001'
    );
  }

  assert.notDeepEqual(
    compositionRecipeRegistry.poster.homeSections,
    compositionRecipeRegistry.editorial.homeSections
  );
  assert.notDeepEqual(
    compositionRecipeRegistry.editorial.homeSections,
    compositionRecipeRegistry.hospitality.homeSections
  );

  const posterActivity = findTerritorySurface(projections.poster, 'activity-detail', 'after-dark-listening-room');
  const editorialActivity = findTerritorySurface(projections.editorial, 'activity-detail', 'after-dark-listening-room');
  const hospitalityActivity = findTerritorySurface(projections.hospitality, 'activity-detail', 'after-dark-listening-room');

  assert.equal(templateForSurface(projections.poster, posterActivity), 'candidate-c/compositions/poster-activity');
  assert.equal(templateForSurface(projections.editorial, editorialActivity), 'candidate-c/compositions/editorial-activity');
  assert.equal(templateForSurface(projections.hospitality, hospitalityActivity), 'candidate-c/compositions/hospitality-activity');
});
