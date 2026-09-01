'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  OWNERSHIP,
  ownershipForPath,
} = require('../src/venue/authoring');
const {
  deriveDeploymentAgnosticVenueSourceDigest,
  extractDeploymentAgnosticVenueSource,
  serializeDeploymentAgnosticVenueSource,
} = require('../src/venue/source');
const {
  VenueSourceAuthoringError,
  applyOrdinaryOperatorSourceEdit,
  buildVenueSourceOwnershipMap,
} = require('../src/venue/source-authoring');
const {
  SOURCE_SESSION_STATE,
  SourceAuthoringSessionError,
  createSourceAuthoringSession,
} = require('../src/venue/source-authoring-session');
const {
  FOURTH_STREET_AUTHORING_INPUT,
  LANTERN_ROOM_AUTHORING_INPUT,
} = require('./support/hv5-authoring-fixtures');
const { JUNIPER_WORKS_AUTHORING_INPUT } = require('./support/hv7-juniper-venue');

function sourceOf(authoring) {
  return extractDeploymentAgnosticVenueSource(authoring);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('deployment-agnostic source reuses HV-5 ownership classes without deployment authority', () => {
  for (const input of [FOURTH_STREET_AUTHORING_INPUT, LANTERN_ROOM_AUTHORING_INPUT, JUNIPER_WORKS_AUTHORING_INPUT]) {
    const source = sourceOf(input);
    const ownership = buildVenueSourceOwnershipMap(source);

    assert.equal(ownership['/kind'], OWNERSHIP.PLATFORM_FIXED);
    assert.equal(ownership['/schemaVersion'], OWNERSHIP.PLATFORM_FIXED);
    assert.equal(ownership['/venueContext/displayName'], OWNERSHIP.OPERATOR_AUTHORED);
    assert.equal(ownership['/venueContext/id'], OWNERSHIP.INTEGRATION_OWNED);
    assert.equal(ownership['/venueContext/hive/communityId'], OWNERSHIP.INTEGRATION_OWNED);
    assert.equal(ownership['/venueContext/hive/paymentMerchantAccounts'], OWNERSHIP.SECURITY_PRIVILEGED);
    assert.equal(Object.keys(ownership).some((pointer) => pointer.startsWith('/deploymentRef')), false);
    assert.equal(ownershipForPath('/venuePackage/home/hero/lede'), OWNERSHIP.OPERATOR_AUTHORED);
  }
});

test('ordinary operator source edit accepts venue-owned changes and preserves deployment independence', () => {
  const base = sourceOf(LANTERN_ROOM_AUTHORING_INPUT);
  const proposed = clone(base);
  proposed.venueContext.displayName = 'Lantern Room Commons';
  proposed.venuePackage.home.hero.lede = 'A simpler source-native authoring proof.';

  const beforeDigest = deriveDeploymentAgnosticVenueSourceDigest(base);
  const accepted = applyOrdinaryOperatorSourceEdit(base, proposed);
  const afterDigest = deriveDeploymentAgnosticVenueSourceDigest(accepted);

  assert.equal(accepted.venueContext.displayName, 'Lantern Room Commons');
  assert.equal(accepted.venuePackage.home.hero.lede, 'A simpler source-native authoring proof.');
  assert.notEqual(afterDigest, beforeDigest);
  assert.equal(Object.prototype.hasOwnProperty.call(accepted, 'deploymentRef'), false);
  assert.doesNotMatch(serializeDeploymentAgnosticVenueSource(accepted), /deploymentRef/);
});

test('ordinary operator source edit rejects integration, security, derived, and platform changes', () => {
  const base = sourceOf(FOURTH_STREET_AUTHORING_INPUT);
  const cases = [
    (proposed) => { proposed.venueContext.id = 'other-venue'; },
    (proposed) => { proposed.venueContext.hive.communityId = 'hive-654321'; },
    (proposed) => { proposed.venueContext.hive.paymentMerchantAccounts = ['other']; },
    (proposed) => { proposed.venuePackage.id = 'other-package'; },
    (proposed) => { proposed.venuePackage.home.hero.image.width += 1; },
  ];

  for (const mutate of cases) {
    const proposed = clone(base);
    mutate(proposed);
    assert.throws(
      () => applyOrdinaryOperatorSourceEdit(base, proposed),
      (error) => error instanceof VenueSourceAuthoringError && /denied|invalid/i.test(error.message),
    );
    assert.equal(serializeDeploymentAgnosticVenueSource(base), serializeDeploymentAgnosticVenueSource(sourceOf(FOURTH_STREET_AUTHORING_INPUT)));
  }
});

test('source session supports preview, Apply, Discard, and no deploymentRef requirement', () => {
  const source = sourceOf(LANTERN_ROOM_AUTHORING_INPUT);
  const session = createSourceAuthoringSession(source);
  const acceptedBefore = session.canonicalAccepted();

  assert.deepEqual(session.status(), { state: SOURCE_SESSION_STATE.CLEAN, dirty: false, error: null });
  assert.equal(session.listEditableFields().some((field) => field.pointer.includes('deploymentRef')), false);

  session.edit('/venueContext/displayName', 'Lantern Room Commons');
  session.edit('/venuePackage/home/hero/lede', 'A welcoming reading room preview.');
  assert.equal(session.status().dirty, true);
  assert.equal(session.previewProjection().siteName, 'Lantern Room Commons');
  assert.equal(session.canonicalAccepted(), acceptedBefore);

  session.discard();
  assert.equal(session.status().dirty, false);
  assert.equal(session.previewProjection().siteName, source.venueContext.displayName);

  session.edit('/venueContext/displayName', 'Lantern Room Commons');
  const accepted = session.apply();
  assert.equal(accepted.venueContext.displayName, 'Lantern Room Commons');
  assert.equal(session.status().dirty, false);
  assert.equal(Object.prototype.hasOwnProperty.call(accepted, 'deploymentRef'), false);
});

test('source session exposes the same admitted Juniper collection lifecycle without arbitrary topology authority', () => {
  const session = createSourceAuthoringSession(sourceOf(JUNIPER_WORKS_AUTHORING_INPUT));
  const collections = session.listEditableCollections();
  assert.deepEqual(collections.map((entry) => entry.kind), ['programs', 'equipment-status']);

  session.addCollectionItem('/venuePackage/home/programs/items', {
    id: 'source-safety-clinic',
    title: 'Source safety clinic',
    startAt: '2026-09-21T18:00:00-07:00',
    endAt: '2026-09-21T19:00:00-07:00',
    description: 'A bounded source-native collection-authoring proof.',
    accessNote: 'Visitors welcome; normal shop eligibility still applies.',
    state: 'scheduled',
    link: null,
  });
  assert.equal(session.previewProjection().venuePackage.home.programs.items.some((item) => item.id === 'source-safety-clinic'), true);

  session.moveCollectionItem('/venuePackage/home/equipmentStatus/items', 'wood-shop', 'up');
  assert.deepEqual(
    session.previewProjection().venuePackage.home.equipmentStatus.items.map((item) => item.id),
    ['wood-shop', 'laser-cutter', 'electronics-bench'],
  );

  assert.throws(
    () => session.edit('/venuePackage/home/programs/items', []),
    (error) => error instanceof SourceAuthoringSessionError && /denied/i.test(error.message),
  );
  assert.throws(() => session.moveCollectionItem('/venuePackage/home/programs/items', 'orientation-101', 'up'), /canonical ordering/);
});
