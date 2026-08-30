'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const { REFERENCE_DEPLOYMENT_PROFILE } = require('../src/deployment/reference/fourth-street-privex');
const {
  OWNERSHIP,
  VenueAuthoringError,
  applyOrdinaryOperatorEdit,
  buildOwnershipMap,
  composeVenueBootstrapFromAuthoring,
  createVenueAuthoringDocument,
  ownershipForPath,
  serializeVenueAuthoringReview,
} = require('../src/venue/authoring');
const { FOURTH_STREET_REFERENCE_PACKAGE } = require('../src/venue/reference/fourth-street-package');
const { FOURTH_STREET_REFERENCE_VENUE } = require('../src/venue/reference/fourth-street');
const { HV3_SYNTHETIC_PACKAGE, HV3_SYNTHETIC_VENUE } = require('./support/hv3-synthetic-venue');
const { HV4_SYNTHETIC_DEPLOYMENT_MANIFEST } = require('./support/hv4-synthetic-bootstrap');
const {
  FOURTH_STREET_AUTHORING_INPUT,
  LANTERN_ROOM_AUTHORING_INPUT,
} = require('./support/hv5-authoring-fixtures');

const root = path.join(__dirname, '..');

function mutable(value) {
  return JSON.parse(JSON.stringify(value));
}

function setAtPath(input, pathSegments, value) {
  const result = mutable(input);
  let cursor = result;
  for (const segment of pathSegments.slice(0, -1)) cursor = cursor[segment];
  cursor[pathSegments.at(-1)] = value;
  return result;
}

test('HV-5 golden vectors compile through accepted HV-1/HV-3 authorities and remain deeply immutable', () => {
  const fourthStreet = createVenueAuthoringDocument(FOURTH_STREET_AUTHORING_INPUT);
  const lantern = createVenueAuthoringDocument(LANTERN_ROOM_AUTHORING_INPUT);

  assert.deepEqual(fourthStreet.venueContext, FOURTH_STREET_REFERENCE_VENUE);
  assert.deepEqual(fourthStreet.venuePackage, FOURTH_STREET_REFERENCE_PACKAGE);
  assert.equal(fourthStreet.deploymentRef.id, REFERENCE_DEPLOYMENT_PROFILE.id);
  assert.deepEqual(lantern.venueContext, HV3_SYNTHETIC_VENUE);
  assert.deepEqual(lantern.venuePackage, HV3_SYNTHETIC_PACKAGE);
  assert.equal(lantern.deploymentRef.id, HV4_SYNTHETIC_DEPLOYMENT_MANIFEST.deployment.id);

  assert.equal(Object.isFrozen(fourthStreet), true);
  assert.equal(Object.isFrozen(fourthStreet.deploymentRef), true);
  assert.equal(Object.isFrozen(fourthStreet.venueContext), true);
  assert.equal(Object.isFrozen(fourthStreet.venuePackage), true);
  assert.equal(Object.isFrozen(lantern), true);

  assert.equal('venueType' in fourthStreet, false);
  assert.equal('venueType' in lantern, false);
  assert.equal(lantern.venuePackage.onboarding.operatorNoun, 'reading room');
  assert.equal(lantern.venuePackage.onboarding.staffRole, 'host');
});

test('HV-5 ownership registry classifies every path in both accepted proof documents', () => {
  for (const input of [FOURTH_STREET_AUTHORING_INPUT, LANTERN_ROOM_AUTHORING_INPUT]) {
    const ownership = buildOwnershipMap(input);
    assert.ok(Object.keys(ownership).length > 40);
    assert.equal(Object.values(ownership).every((value) => Object.values(OWNERSHIP).includes(value)), true);
    assert.equal(Object.isFrozen(ownership), true);
  }

  assert.equal(ownershipForPath('/schemaVersion'), OWNERSHIP.PLATFORM_FIXED);
  assert.equal(ownershipForPath('/venueContext/id'), OWNERSHIP.INTEGRATION_OWNED);
  assert.equal(ownershipForPath('/venueContext/hive/paymentMerchantAccounts'), OWNERSHIP.SECURITY_PRIVILEGED);
  assert.equal(ownershipForPath('/deploymentRef/id'), OWNERSHIP.DEPLOYMENT_OWNED);
  assert.equal(ownershipForPath('/venueContext/business/hours'), OWNERSHIP.OPERATOR_AUTHORED);
  assert.equal(ownershipForPath('/venuePackage/home/hero/lede'), OWNERSHIP.OPERATOR_AUTHORED);
  assert.equal(ownershipForPath('/venuePackage/home/gallery/items/0/caption'), OWNERSHIP.OPERATOR_AUTHORED);
  assert.equal(ownershipForPath('/venuePackage/home/gallery/items/0/width'), OWNERSHIP.DERIVED);
  assert.equal(ownershipForPath('/venuePackage/home/gallery/items'), OWNERSHIP.INTEGRATION_OWNED);
  assert.equal(ownershipForPath('/unknown'), null);
});

test('HV-5 canonical authoring serialization is insertion-order independent with LF terminal newline', () => {
  const normal = serializeVenueAuthoringReview(FOURTH_STREET_AUTHORING_INPUT);
  const reordered = {
    venuePackage: mutable(FOURTH_STREET_AUTHORING_INPUT.venuePackage),
    venueContext: mutable(FOURTH_STREET_AUTHORING_INPUT.venueContext),
    deploymentRef: { id: FOURTH_STREET_AUTHORING_INPUT.deploymentRef.id },
    schemaVersion: 1,
  };
  const reorderedBytes = serializeVenueAuthoringReview(reordered);

  assert.equal(normal, reorderedBytes);
  assert.equal(normal.endsWith('\n'), true);
  assert.equal(normal.includes('\r'), false);
  assert.equal(normal.startsWith('{\n  "deploymentRef"'), true);
});

test('ordinary operator edits may change only preregistered authored leaves', () => {
  const base = mutable(LANTERN_ROOM_AUTHORING_INPUT);
  const proposed = mutable(base);
  proposed.venueContext.displayName = 'The Lantern Reading Room';
  proposed.venueContext.business.hours = 'Wed–Sun, 10:00 a.m.–6:00 p.m.';
  proposed.venuePackage.home.hero.lede = 'A revised fictional reading-room introduction.';
  proposed.venuePackage.home.gallery.items[0].caption = 'Revised fixture bookshelf caption';
  proposed.venuePackage.onboarding.staffRole = 'reading host';

  const result = applyOrdinaryOperatorEdit(base, proposed);
  assert.equal(result.venueContext.displayName, 'The Lantern Reading Room');
  assert.equal(result.venuePackage.onboarding.staffRole, 'reading host');
  assert.equal(Object.isFrozen(result), true);
  assert.deepEqual(base, LANTERN_ROOM_AUTHORING_INPUT);
});

test('ordinary operator negative matrix fails closed without mutating the accepted base', () => {
  const base = mutable(LANTERN_ROOM_AUTHORING_INPUT);
  const snapshot = JSON.stringify(base);
  const cases = [
    ['schema version', setAtPath(base, ['schemaVersion'], 2)],
    ['venue identity', setAtPath(base, ['venueContext', 'id'], 'other-venue')],
    ['Hive community', setAtPath(base, ['venueContext', 'hive', 'communityId'], 'hive-123456')],
    ['payment merchant', setAtPath(base, ['venueContext', 'hive', 'paymentMerchantAccounts'], ['othermerchant'])],
    ['package identity', setAtPath(base, ['venuePackage', 'id'], 'other-package')],
    ['deployment reference', setAtPath(base, ['deploymentRef', 'id'], 'other-deployment')],
    ['derived width', setAtPath(base, ['venuePackage', 'home', 'hero', 'image', 'width'], 999)],
  ];

  const addedGalleryItem = mutable(base);
  addedGalleryItem.venuePackage.home.gallery.items.push(mutable(addedGalleryItem.venuePackage.home.gallery.items[0]));
  cases.push(['gallery topology', addedGalleryItem]);

  for (const [label, proposed] of cases) {
    assert.throws(
      () => applyOrdinaryOperatorEdit(base, proposed),
      (error) => error instanceof VenueAuthoringError || /Invalid venue|Invalid venue package/.test(error.message),
      label,
    );
    assert.equal(JSON.stringify(base), snapshot, `${label} mutated the base`);
  }

  const unknown = mutable(base);
  unknown.venuePackage.home.hero.script = 'do-not-run';
  assert.throws(() => applyOrdinaryOperatorEdit(base, unknown), /input does not match|Invalid venue package/);
  assert.equal(JSON.stringify(base), snapshot);
});

test('HV-5 rejects secret/private fields, private-key material, and credential-bearing URLs without echoing values', () => {
  const secretValue = ['super', 'sensitive', 'value'].join('-');
  const secretField = mutable(LANTERN_ROOM_AUTHORING_INPUT);
  secretField.sessionSecret = secretValue;
  assert.throws(
    () => createVenueAuthoringDocument(secretField),
    (error) => /secret-bearing field/.test(error.message) && !error.message.includes(secretValue),
  );

  const pemMarker = ['-----BEGIN', 'PRIVATE', 'KEY-----'].join(' ');
  const privateMaterial = mutable(LANTERN_ROOM_AUTHORING_INPUT);
  privateMaterial.venuePackage.home.hero.lede = `${pemMarker}\nfixture-only`;
  assert.throws(
    () => createVenueAuthoringDocument(privateMaterial),
    (error) => /private key material/.test(error.message) && !error.message.includes('fixture-only'),
  );

  const credentialUrl = mutable(LANTERN_ROOM_AUTHORING_INPUT);
  const queryKey = ['access', 'token'].join('_');
  credentialUrl.venueContext.business.websiteUrl = `https://lantern-room.example/?${queryKey}=${secretValue}`;
  assert.throws(
    () => createVenueAuthoringDocument(credentialUrl),
    (error) => /secret-bearing URL query parameter/.test(error.message) && !error.message.includes(secretValue),
  );
});

test('HV-5 source/code CLI emits canonical JSON offline and fails closed for invalid input', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-venues-hv5-'));
  try {
    const validPath = path.join(dir, 'valid.json');
    fs.writeFileSync(validPath, `${JSON.stringify(FOURTH_STREET_AUTHORING_INPUT, null, 2)}\n`, 'utf8');
    const valid = spawnSync(process.execPath, [path.join(root, 'scripts', 'validate-venue-authoring.js'), validPath], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(valid.status, 0, valid.stderr);
    assert.equal(valid.stdout, serializeVenueAuthoringReview(FOURTH_STREET_AUTHORING_INPUT));
    assert.equal(valid.stderr, '');

    const invalid = mutable(LANTERN_ROOM_AUTHORING_INPUT);
    const secretValue = ['cli', 'secret', 'fixture'].join('-');
    invalid.apiKey = secretValue;
    const invalidPath = path.join(dir, 'invalid.json');
    fs.writeFileSync(invalidPath, JSON.stringify(invalid), 'utf8');
    const rejected = spawnSync(process.execPath, [path.join(root, 'scripts', 'validate-venue-authoring.js'), invalidPath], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /secret-bearing field/);
    assert.equal(rejected.stderr.includes(secretValue), false);
    assert.equal(rejected.stdout, '');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('HV-5 authoring composes through HV-4 only with separately supplied matching deployment authority', () => {
  const fourthStreetManifest = JSON.parse(
    fs.readFileSync(path.join(root, 'ops', 'privex', 'manifest.json'), 'utf8'),
  );
  const fourthStreet = composeVenueBootstrapFromAuthoring(
    FOURTH_STREET_AUTHORING_INPUT,
    fourthStreetManifest,
    { bootstrapId: 'fourth-street-authoring-bootstrap' },
  );
  assert.equal(fourthStreet.identity.venueId, FOURTH_STREET_REFERENCE_VENUE.id);
  assert.equal(fourthStreet.identity.packageId, FOURTH_STREET_REFERENCE_PACKAGE.id);
  assert.equal(fourthStreet.identity.deploymentId, REFERENCE_DEPLOYMENT_PROFILE.id);

  const lantern = composeVenueBootstrapFromAuthoring(
    LANTERN_ROOM_AUTHORING_INPUT,
    HV4_SYNTHETIC_DEPLOYMENT_MANIFEST,
    { bootstrapId: 'lantern-room-authoring-bootstrap' },
  );
  assert.equal(lantern.identity.venueId, HV3_SYNTHETIC_VENUE.id);
  assert.equal(lantern.identity.packageId, HV3_SYNTHETIC_PACKAGE.id);
  assert.equal(lantern.identity.deploymentId, HV4_SYNTHETIC_DEPLOYMENT_MANIFEST.deployment.id);

  assert.throws(
    () => composeVenueBootstrapFromAuthoring(
      LANTERN_ROOM_AUTHORING_INPUT,
      fourthStreetManifest,
      { bootstrapId: 'mismatched-authoring-bootstrap' },
    ),
    /bindings\.deploymentId expects lantern-room-offline-deployment/,
  );
});
