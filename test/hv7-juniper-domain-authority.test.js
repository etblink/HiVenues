'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  applyOrdinaryOperatorEdit,
  buildOwnershipMap,
  createVenueAuthoringDocument,
  serializeVenueAuthoringReview,
} = require('../src/venue/authoring');
const { createVenuePackage } = require('../src/venue/package');
const { HV3_SYNTHETIC_PACKAGE, HV3_SYNTHETIC_VENUE } = require('./support/hv3-synthetic-venue');
const {
  JUNIPER_WORKS_AUTHORING_INPUT,
  JUNIPER_WORKS_PACKAGE,
  JUNIPER_WORKS_VENUE,
  createJuniperWorksPackageInput,
} = require('./support/hv7-juniper-venue');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('schema-v1 remains backward compatible for the accepted Lantern Room fixture', () => {
  const document = createVenueAuthoringDocument({
    schemaVersion: 1,
    deploymentRef: { id: 'lantern-room-offline-fixture' },
    venueContext: HV3_SYNTHETIC_VENUE,
    venuePackage: HV3_SYNTHETIC_PACKAGE,
  });

  assert.equal(document.schemaVersion, 1);
  assert.equal(document.venuePackage.brand.theme, undefined);
  assert.equal(document.venuePackage.home.programs, undefined);
  assert.equal(document.venuePackage.home.equipmentStatus, undefined);
});

test('Juniper optional structured capabilities validate and programs canonicalize chronologically', () => {
  assert.deepEqual(
    JUNIPER_WORKS_PACKAGE.home.programs.items.map((item) => item.id),
    ['orientation-101', 'open-build-night'],
  );
  assert.equal(JUNIPER_WORKS_PACKAGE.home.programs.items[0].state, 'full');
  assert.equal(JUNIPER_WORKS_PACKAGE.home.equipmentStatus.items.length, 3);
  assert.equal(JUNIPER_WORKS_PACKAGE.brand.theme.accent, '#945500');
});

test('structured collections reject duplicate identities and invalid time ranges', () => {
  const duplicate = createJuniperWorksPackageInput();
  duplicate.home.programs.items.push({ ...duplicate.home.programs.items[0] });
  assert.throws(() => createVenuePackage(duplicate, JUNIPER_WORKS_VENUE), /item id must be unique/i);

  const invalidTime = createJuniperWorksPackageInput();
  invalidTime.home.programs.items[0].endAt = invalidTime.home.programs.items[0].startAt;
  assert.throws(() => createVenuePackage(invalidTime, JUNIPER_WORKS_VENUE), /endAt must be after startAt/i);
});

test('venue-owned theme fails closed when required contrast is insufficient', () => {
  const input = createJuniperWorksPackageInput();
  input.brand.theme.text = '#eeeeee';
  input.brand.theme.canvas = '#ffffff';
  assert.throws(() => createVenuePackage(input, JUNIPER_WORKS_VENUE), /Theme contrast is insufficient/i);
});

test('venue-owned accent fails closed when it cannot serve as small text on venue surfaces', () => {
  const input = createJuniperWorksPackageInput();
  input.brand.theme.accent = '#b86f00';
  assert.throws(
    () => createVenuePackage(input, JUNIPER_WORKS_VENUE),
    /accent text on canvas|accent text on surface/i,
  );
});

test('HV-5 explicitly admits lifecycle changes only for the two preregistered collections', () => {
  const base = createVenueAuthoringDocument(JUNIPER_WORKS_AUTHORING_INPUT);
  const proposed = clone(base);
  proposed.venuePackage.home.programs.items.push({
    id: 'safety-clinic',
    title: 'Shared-shop safety clinic',
    startAt: '2026-09-15T18:00:00-07:00',
    endAt: '2026-09-15T19:00:00-07:00',
    description: 'A public clinic covering shared-space habits and how to request equipment-specific orientation.',
    accessNote: 'Visitors welcome; participation does not itself grant tool eligibility.',
    state: 'scheduled',
    link: null,
  });
  const added = applyOrdinaryOperatorEdit(base, proposed);
  assert.equal(added.venuePackage.home.programs.items.some((item) => item.id === 'safety-clinic'), true);

  const reordered = clone(added);
  reordered.venuePackage.home.equipmentStatus.items.reverse();
  const reorderedAccepted = applyOrdinaryOperatorEdit(added, reordered);
  assert.deepEqual(
    reorderedAccepted.venuePackage.home.equipmentStatus.items.map((item) => item.id),
    ['electronics-bench', 'wood-shop', 'laser-cutter'],
  );

  const removed = clone(reorderedAccepted);
  removed.venuePackage.home.programs.items = removed.venuePackage.home.programs.items
    .filter((item) => item.id !== 'safety-clinic');
  assert.equal(
    applyOrdinaryOperatorEdit(reorderedAccepted, removed).venuePackage.home.programs.items.some((item) => item.id === 'safety-clinic'),
    false,
  );
});

test('HV-5 still denies gallery topology and protected Hive identity changes', () => {
  const base = createVenueAuthoringDocument({
    schemaVersion: 1,
    deploymentRef: { id: 'lantern-room-offline-fixture' },
    venueContext: HV3_SYNTHETIC_VENUE,
    venuePackage: HV3_SYNTHETIC_PACKAGE,
  });

  const galleryChange = clone(base);
  galleryChange.venuePackage.home.gallery.items.push(clone(galleryChange.venuePackage.home.gallery.items[0]));
  assert.throws(() => applyOrdinaryOperatorEdit(base, galleryChange), /gallery\/items.*INTEGRATION_OWNED/i);

  const hiveChange = clone(base);
  hiveChange.venueContext.hive.officialAccount = 'different-account';
  assert.throws(() => applyOrdinaryOperatorEdit(base, hiveChange), /officialAccount.*INTEGRATION_OWNED/i);
});

test('ownership and canonical serialization expose collection authority without broad container authority', () => {
  const document = createVenueAuthoringDocument(JUNIPER_WORKS_AUTHORING_INPUT);
  const ownership = buildOwnershipMap(document);

  assert.equal(ownership['/venuePackage/home/programs/items'], 'OPERATOR_AUTHORED_COLLECTION');
  assert.equal(ownership['/venuePackage/home/equipmentStatus/items'], 'OPERATOR_AUTHORED_COLLECTION');
  assert.equal(ownership['/venuePackage/home/gallery/items'], 'INTEGRATION_OWNED');
  assert.equal(ownership['/venuePackage/home'], 'INTEGRATION_OWNED');

  const canonical = serializeVenueAuthoringReview(document);
  assert.ok(canonical.endsWith('\n'));
  assert.equal(canonical.includes('PRIVATE KEY'), false);
});
