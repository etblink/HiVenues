'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  createV3DeploymentAgnosticVenueSource,
  deriveV3DeploymentAgnosticVenueSourceDigest,
  serializeV3DeploymentAgnosticVenueSource,
} = require('../src/venue/v3/source');
const {
  buildV2ToV3LegacyEventRouteMap,
  migrateV2DeploymentAgnosticVenueSourceToV3,
} = require('../src/venue/v3/migrate-v2');
const {
  REFERENCE_FACTORIES,
  migratedPhysicalReference,
  nativeCreatorSource,
  nativeReleaseSource,
} = require('./support/v3-reference-fixtures');
const {
  musicSource,
} = require('./support/v2-renderer-fixture');

const ROOT = path.join(__dirname, '..');
const V2_SOURCE_GIT_BLOB = '5f0f24d866790b0f7821293602d8669047281d41';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonicalTextGitBlobSha(bytes) {
  // Git stores this tracked text file with LF bytes, while Windows checkout may
  // materialize CRLF. Normalize only CRLF -> LF so the test verifies the exact
  // accepted repository text object without weakening any other byte/content
  // difference.
  const canonicalBytes = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  return createHash('sha1')
    .update(Buffer.from(`blob ${canonicalBytes.length}\0`, 'utf8'))
    .update(canonicalBytes)
    .digest('hex');
}

test('first v3 slice preserves the exact accepted canonical v2 source parser text object', () => {
  const bytes = fs.readFileSync(path.join(ROOT, 'src', 'venue', 'v2', 'source.js'));
  assert.equal(canonicalTextGitBlobSha(bytes), V2_SOURCE_GIT_BLOB);
});

test('all three frozen references use one strict v3 source family with distinct deterministic digests', () => {
  const digests = new Set();
  for (const [name, factory] of Object.entries(REFERENCE_FACTORIES)) {
    const source = createV3DeploymentAgnosticVenueSource(factory());
    assert.equal(source.kind, 'hive-venues-deployment-agnostic-source', name);
    assert.equal(source.schemaVersion, 3, name);
    assert.equal(Object.isFrozen(source), true, name);
    assert.equal(Object.isFrozen(source.resources.activities), true, name);
    const first = serializeV3DeploymentAgnosticVenueSource(source);
    const second = serializeV3DeploymentAgnosticVenueSource(clone(source));
    assert.equal(first, second, name);
    const digest = deriveV3DeploymentAgnosticVenueSourceDigest(source);
    assert.equal(digest, deriveV3DeploymentAgnosticVenueSourceDigest(clone(source)), name);
    digests.add(digest);
  }
  assert.equal(digests.size, 3);
});

test('v2 physical event migration preserves identity, facts, explicit state mapping and empty bindings', () => {
  const { v2, source, legacyEventRoutes } = migratedPhysicalReference();
  assert.equal(source.provenance.origin, 'v2-migration');
  assert.equal(source.provenance.sourceSchemaVersion, 2);
  assert.match(source.provenance.sourceDigest, /^[0-9a-f]{64}$/);
  assert.equal(source.resources.activities.length, v2.resources.events.length);
  assert.deepEqual(Object.values(source.activityBindings), [[], [], [], [], [], []]);

  for (let index = 0; index < v2.resources.events.length; index += 1) {
    const before = v2.resources.events[index];
    const after = source.resources.activities[index];
    assert.equal(after.id, before.id);
    assert.equal(after.slug, before.slug);
    assert.equal(after.title, before.title);
    assert.equal(after.description, before.description);
    assert.deepEqual(after.temporal, {
      kind: 'OCCURRENCE',
      startAt: before.startAt,
      endAt: before.endAt,
    });
    assert.deepEqual(after.presence, { kind: 'PHYSICAL_HOST_DEFAULT' });
    assert.equal(after.seriesRef, null);
    assert.equal(legacyEventRoutes[`/events/${before.slug}`], before.id);
    if (before.mediaAssetId) {
      assert.deepEqual(after.managedMedia, [{
        assetId: before.mediaAssetId,
        role: 'PRIMARY_VISUAL_COMPATIBILITY',
      }]);
    }
    if (before.externalAction) {
      assert.deepEqual(after.publicActions, [{
        id: `activity:${before.id}:legacy-external`,
        role: 'LEGACY_EXTERNAL',
        label: before.externalAction.label,
        href: before.externalAction.href,
      }]);
    }
  }

  const migratedLists = source.site.pages.flatMap((page) => page.components)
    .filter((component) => component.kind === 'activity-list');
  const oldLists = v2.site.pages.flatMap((page) => page.components)
    .filter((component) => component.kind === 'event-list');
  assert.equal(migratedLists.length, oldLists.length);
  migratedLists.forEach((component, index) => {
    assert.equal(component.id, oldLists[index].id);
    assert.equal(component.recipeId, oldLists[index].recipeId);
    assert.deepEqual(component.content.resourceIds, oldLists[index].content.resourceIds);
  });
});

test('v2 scheduled, full and cancelled states map without wall-clock lifecycle invention', () => {
  for (const [state, expectedLifecycle, expectedCapacity] of [
    ['scheduled', 'SCHEDULED', 'UNSPECIFIED'],
    ['full', 'SCHEDULED', 'FULL'],
    ['cancelled', 'CANCELLED', 'UNSPECIFIED'],
  ]) {
    const input = clone(musicSource());
    input.resources.events[0].state = state;
    const migrated = migrateV2DeploymentAgnosticVenueSourceToV3(input);
    assert.equal(migrated.resources.activities[0].lifecycle, expectedLifecycle);
    assert.equal(migrated.resources.activities[0].access.capacity, expectedCapacity);
  }
  const implementation = fs.readFileSync(path.join(ROOT, 'src', 'venue', 'v3', 'migrate-v2.js'), 'utf8');
  assert.doesNotMatch(implementation, /Date\.now|new Date\s*\(/);
});

test('migration and compatibility-map construction perform no network operation', () => {
  const originalFetch = global.fetch;
  let fetchCalls = 0;
  global.fetch = () => {
    fetchCalls += 1;
    throw new Error('network access forbidden in v3 migration');
  };
  try {
    const input = musicSource();
    migrateV2DeploymentAgnosticVenueSourceToV3(input);
    buildV2ToV3LegacyEventRouteMap(input);
    assert.equal(fetchCalls, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test('native creator and release references avoid fabricated physical and temporal facts', () => {
  const creator = nativeCreatorSource();
  const live = creator.resources.activities[0];
  assert.equal(creator.venue.business, null);
  assert.equal(live.temporal.kind, 'OCCURRENCE');
  assert.equal(live.presence.kind, 'ONLINE');
  assert.equal(live.presence.destinations.length, 1);
  assert.deepEqual(Object.values(creator.activityBindings), [[], [], [], [], [], []]);

  const release = nativeReleaseSource();
  const premiere = release.resources.activities[0];
  assert.equal(release.venue.business, null);
  assert.deepEqual(premiere.temporal, {
    kind: 'RELEASE',
    releaseAt: '2026-11-14T09:00:00-08:00',
  });
  assert.deepEqual(premiere.presence, { kind: 'NONE' });
  assert.equal(Object.hasOwn(premiere.temporal, 'startAt'), false);
  assert.equal(Object.hasOwn(premiere.temporal, 'endAt'), false);
});

test('v3 fails closed for strict source, activity, binding and cross-reference violations', () => {
  const base = clone(nativeCreatorSource());
  const cases = [];

  const unknownRoot = clone(base);
  unknownRoot.privateKey = 'forbidden';
  cases.push(unknownRoot);

  const wrongVersion = clone(base);
  wrongVersion.schemaVersion = 2;
  cases.push(wrongVersion);

  const duplicateActivity = clone(base);
  duplicateActivity.resources.activities.push(clone(duplicateActivity.resources.activities[0]));
  cases.push(duplicateActivity);

  const duplicateSlug = clone(base);
  const second = clone(duplicateSlug.resources.activities[0]);
  second.id = 'second-activity';
  duplicateSlug.resources.activities.push(second);
  cases.push(duplicateSlug);

  const badTimestamp = clone(base);
  badTimestamp.resources.activities[0].temporal.startAt = 'tomorrow';
  cases.push(badTimestamp);

  const fakeReleaseEnd = clone(nativeReleaseSource());
  fakeReleaseEnd.resources.activities[0].temporal.endAt = '2026-11-14T10:00:00-08:00';
  cases.push(fakeReleaseEnd);

  const missingMedia = clone(base);
  missingMedia.resources.activities[0].managedMedia = [{ assetId: 'missing-media', role: 'PROMO' }];
  cases.push(missingMedia);

  const missingSeries = clone(base);
  missingSeries.resources.activities[0].seriesRef = { kind: 'program', id: 'missing-program' };
  cases.push(missingSeries);

  const missingListRef = clone(base);
  missingListRef.site.pages[0].components[1].content.resourceIds = ['missing-activity'];
  cases.push(missingListRef);

  const fakeVisit = clone(base);
  fakeVisit.site.pages[0].components.push({
    id: 'home-visit',
    kind: 'contact-visit',
    recipeId: 'visit-legacy-v1',
    content: {
      kicker: 'Visit',
      heading: 'Find us',
      body: 'This must fail because the host is locationless.',
      note: null,
    },
    responsive: { tablet: {}, mobile: {} },
  });
  cases.push(fakeVisit);

  const fabricatedBinding = clone(base);
  fabricatedBinding.activityBindings.hiveSocial.push({ author: 'example', permlink: 'fake' });
  cases.push(fabricatedBinding);

  const rawStyle = clone(base);
  rawStyle.site.pages[0].components[0].style = { position: 'absolute' };
  cases.push(rawStyle);

  for (const candidate of cases) {
    assert.throws(() => createV3DeploymentAgnosticVenueSource(candidate));
  }
});

test('physical presence, public actions and invalid v2 input fail or normalize under exact contracts', () => {
  const locationlessPhysical = clone(nativeCreatorSource());
  locationlessPhysical.resources.activities[0].presence = { kind: 'PHYSICAL_HOST_DEFAULT' };
  assert.throws(
    () => createV3DeploymentAgnosticVenueSource(locationlessPhysical),
    /physical host business facts/,
  );

  const badAction = clone(nativeCreatorSource());
  badAction.resources.activities[0].publicActions = [{
    id: 'legacy-action',
    role: 'LEGACY_EXTERNAL',
    label: 'Unsafe',
    href: 'http://not-https.example/',
  }];
  assert.throws(() => createV3DeploymentAgnosticVenueSource(badAction));

  const invalidV2 = clone(musicSource());
  invalidV2.resources.events[0].mystery = true;
  assert.throws(() => migrateV2DeploymentAgnosticVenueSourceToV3(invalidV2), /v2 source invalid/);
});