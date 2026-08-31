'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  OWNERSHIP,
  applyOrdinaryOperatorEdit,
  createVenueAuthoringDocument,
  ownershipForPath,
  serializeVenueAuthoringReview,
} = require('../src/venue/authoring');
const {
  SESSION_STATE,
  VisualAuthoringSessionError,
  createVisualAuthoringSession,
  createVisualAuthoringSessionForTest,
} = require('../src/venue/visual-authoring-session');
const {
  FOURTH_STREET_AUTHORING_INPUT,
  LANTERN_ROOM_AUTHORING_INPUT,
} = require('./support/hv5-authoring-fixtures');

const root = path.join(__dirname, '..');

function mutable(value) {
  return structuredClone(value);
}

const PROTECTED_POINTERS = Object.freeze([
  ['VENUE_ID', '/venueContext/id', OWNERSHIP.INTEGRATION_OWNED],
  ['HIVE_COMMUNITY_ID', '/venueContext/hive/communityId', OWNERSHIP.INTEGRATION_OWNED],
  ['HIVE_OFFICIAL_ACCOUNT', '/venueContext/hive/officialAccount', OWNERSHIP.INTEGRATION_OWNED],
  ['THREADS_CONTAINER_ACCOUNT', '/venueContext/hive/threadsContainerAccount', OWNERSHIP.INTEGRATION_OWNED],
  ['PAYMENT_MERCHANTS_CONTAINER', '/venueContext/hive/paymentMerchantAccounts', OWNERSHIP.SECURITY_PRIVILEGED],
  ['PAYMENT_MERCHANT_ACCOUNT', '/venueContext/hive/paymentMerchantAccounts/0', OWNERSHIP.SECURITY_PRIVILEGED],
  ['PACKAGE_ID', '/venuePackage/id', OWNERSHIP.INTEGRATION_OWNED],
  ['PACKAGE_VENUE_BINDING', '/venuePackage/venueId', OWNERSHIP.INTEGRATION_OWNED],
  ['DEPLOYMENT_REF', '/deploymentRef/id', OWNERSHIP.DEPLOYMENT_OWNED],
  ['AUTHORING_SCHEMA_VERSION', '/schemaVersion', OWNERSHIP.PLATFORM_FIXED],
  ['PACKAGE_SCHEMA_VERSION', '/venuePackage/schemaVersion', OWNERSHIP.PLATFORM_FIXED],
  ['BRAND_LOGO_WIDTH', '/venuePackage/brand/logo/width', OWNERSHIP.DERIVED],
  ['BRAND_LOGO_HEIGHT', '/venuePackage/brand/logo/height', OWNERSHIP.DERIVED],
  ['HERO_IMAGE_WIDTH', '/venuePackage/home/hero/image/width', OWNERSHIP.DERIVED],
  ['HERO_IMAGE_HEIGHT', '/venuePackage/home/hero/image/height', OWNERSHIP.DERIVED],
  ['GALLERY_ITEM_WIDTH', '/venuePackage/home/gallery/items/0/width', OWNERSHIP.DERIVED],
  ['GALLERY_ITEM_HEIGHT', '/venuePackage/home/gallery/items/0/height', OWNERSHIP.DERIVED],
  ['GALLERY_ITEMS_CONTAINER', '/venuePackage/home/gallery/items', OWNERSHIP.INTEGRATION_OWNED],
  ['GALLERY_ITEM_CONTAINER', '/venuePackage/home/gallery/items/0', OWNERSHIP.INTEGRATION_OWNED],
]);

test('Phase C test-only gate seam proves rejected Apply keeps accepted bytes unchanged', () => {
  let gateCalls = 0;
  let gateBaseCanonical = null;
  let gateProposalCanonical = null;
  const session = createVisualAuthoringSessionForTest(FOURTH_STREET_AUTHORING_INPUT, {
    applyGate(base, proposal) {
      gateCalls += 1;
      gateBaseCanonical = serializeVenueAuthoringReview(base);
      gateProposalCanonical = serializeVenueAuthoringReview(proposal);
      throw new Error('phase-c-forced-apply-rejection');
    },
  });
  const acceptedBefore = session.canonicalAccepted();

  session.edit('/venuePackage/home/hero/lede', 'A valid unsaved Phase-C proposal.');
  const proposalBeforeApply = session.canonicalProposal();
  assert.equal(session.state, SESSION_STATE.DIRTY);
  assert.notEqual(proposalBeforeApply, acceptedBefore);

  assert.throws(() => session.apply(), /phase-c-forced-apply-rejection/);

  assert.equal(gateCalls, 1);
  assert.equal(gateBaseCanonical, acceptedBefore);
  assert.equal(gateProposalCanonical, proposalBeforeApply);
  assert.equal(session.state, SESSION_STATE.REJECTED_WITH_BASE_UNCHANGED);
  assert.deepEqual(session.status(), {
    state: SESSION_STATE.REJECTED_WITH_BASE_UNCHANGED,
    dirty: true,
    error: 'phase-c-forced-apply-rejection',
  });
  assert.equal(session.canonicalAccepted(), acceptedBefore);
  assert.equal(session.canonicalProposal(), proposalBeforeApply);

  session.discard();
  assert.equal(session.state, SESSION_STATE.DISCARDED);
  assert.equal(session.canonicalAccepted(), acceptedBefore);
  assert.equal(session.canonicalProposal(), acceptedBefore);
});

test('ordinary session factory exposes no alternate authority gate', () => {
  const session = createVisualAuthoringSession(FOURTH_STREET_AUTHORING_INPUT);
  assert.equal(session.applyGate, undefined);
  assert.equal(session.replaceProposal, undefined);
  assert.equal(session.setApplyGate, undefined);
  assert.throws(
    () => createVisualAuthoringSessionForTest(FOURTH_STREET_AUTHORING_INPUT),
    (error) => error instanceof VisualAuthoringSessionError && /apply gate must be a function/.test(error.message),
  );
});

test('Phase C full named protected-authority pointer matrix is absent from ordinary edit authority', () => {
  for (const input of [FOURTH_STREET_AUTHORING_INPUT, LANTERN_ROOM_AUTHORING_INPUT]) {
    const session = createVisualAuthoringSession(input);
    const accepted = session.canonicalAccepted();
    const editablePointers = new Set(session.listEditableFields().map((field) => field.pointer));

    for (const [name, pointer, expectedOwnership] of PROTECTED_POINTERS) {
      assert.equal(ownershipForPath(pointer), expectedOwnership, name);
      assert.equal(editablePointers.has(pointer), false, `${name} must not appear as editable`);
      assert.throws(
        () => session.edit(pointer, 'forbidden'),
        (error) => error instanceof VisualAuthoringSessionError && /ordinary visual edit denied/.test(error.message),
        name,
      );
      assert.equal(session.canonicalAccepted(), accepted, name);
    }

    for (const [name, pointer] of [
      ['UNKNOWN_STRUCTURE', '/venuePackage/home/futureUnknown'],
      ['RAW_HTML_AUTHORITY', '/venuePackage/home/rawHtml'],
      ['SCRIPT_AUTHORITY', '/venuePackage/home/script'],
      ['PRIVATE_KEY_AUTHORITY', '/privateKey'],
      ['SECRET_FIELD_AUTHORITY', '/apiKey'],
    ]) {
      assert.equal(ownershipForPath(pointer), null, name);
      assert.equal(editablePointers.has(pointer), false, `${name} must not appear as editable`);
      assert.throws(
        () => session.edit(pointer, 'forbidden'),
        (error) => error instanceof VisualAuthoringSessionError && /ordinary visual edit denied/.test(error.message),
        name,
      );
      assert.equal(session.canonicalAccepted(), accepted, name);
    }
  }
});

test('Phase C underlying HV-5 validation rejects unknown HTML/script and secret/private structure', () => {
  const privateKeyMarker = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ');
  const privateKeyEndMarker = ['-----END', 'PRIVATE KEY-----'].join(' ');
  const cases = [
    ['UNKNOWN_STRUCTURE', (proposal) => { proposal.futureUnknown = 'not allowed'; }, /schema version 1|Unrecognized key/i],
    ['RAW_HTML_AUTHORITY', (proposal) => { proposal.venuePackage.home.rawHtml = '<b>raw</b>'; }, /venue package|Unrecognized key/i],
    ['SCRIPT_AUTHORITY', (proposal) => { proposal.venuePackage.home.script = 'alert(1)'; }, /venue package|Unrecognized key/i],
    ['SECRET_FIELD_AUTHORITY', (proposal) => { proposal.apiKey = 'phase-c-secret-fixture'; }, /secret-bearing field/i],
    [
      'PRIVATE_KEY_MATERIAL',
      (proposal) => {
        proposal.venuePackage.home.hero.lede = `${privateKeyMarker}\nfixture-only\n${privateKeyEndMarker}`;
      },
      /private key material/i,
    ],
  ];

  for (const [name, mutate, expected] of cases) {
    const proposal = mutable(LANTERN_ROOM_AUTHORING_INPUT);
    mutate(proposal);
    assert.throws(() => createVenueAuthoringDocument(proposal), expected, name);
  }
});

test('Phase C gallery topology is unavailable while existing fixed-slot leaf content remains editable', () => {
  const session = createVisualAuthoringSession(FOURTH_STREET_AUTHORING_INPUT);
  const originalLength = session.acceptedDocument.venuePackage.home.gallery.items.length;

  assert.equal(session.addGalleryItem, undefined);
  assert.equal(session.removeGalleryItem, undefined);
  assert.equal(session.reorderGallery, undefined);
  assert.equal(session.replaceProposal, undefined);

  assert.throws(
    () => session.edit('/venuePackage/home/gallery/items', []),
    (error) => error instanceof VisualAuthoringSessionError && /ordinary visual edit denied/.test(error.message),
  );

  session.edit('/venuePackage/home/gallery/items/0/caption', 'Phase-C fixed-slot caption');
  session.apply();
  assert.equal(session.acceptedDocument.venuePackage.home.gallery.items.length, originalLength);
  assert.equal(session.acceptedDocument.venuePackage.home.gallery.items[0].caption, 'Phase-C fixed-slot caption');

  for (const operation of ['ADD', 'DELETE']) {
    const proposed = mutable(FOURTH_STREET_AUTHORING_INPUT);
    if (operation === 'ADD') proposed.venuePackage.home.gallery.items.push(mutable(proposed.venuePackage.home.gallery.items[0]));
    else proposed.venuePackage.home.gallery.items.pop();
    assert.throws(() => applyOrdinaryOperatorEdit(FOURTH_STREET_AUTHORING_INPUT, proposed), /ordinary operator edit denied|venue package/i, operation);
  }
});

test('Phase C preserves direct source authoring as an editor-independent path', () => {
  const validator = fs.readFileSync(path.join(root, 'scripts', 'validate-venue-authoring.js'), 'utf8');
  assert.doesNotMatch(validator, /visual-authoring-session|native-authoring|grapesjs/i);
  assert.equal(serializeVenueAuthoringReview(FOURTH_STREET_AUTHORING_INPUT).endsWith('\n'), true);
  assert.equal(serializeVenueAuthoringReview(LANTERN_ROOM_AUTHORING_INPUT).endsWith('\n'), true);
});
