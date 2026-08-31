'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { OWNERSHIP, buildOwnershipMap, serializeVenueAuthoringReview } = require('../src/venue/authoring');
const {
  SESSION_STATE,
  VisualAuthoringSessionError,
  createVisualAuthoringSession,
  editableFieldDescriptors,
} = require('../src/venue/visual-authoring-session');
const {
  FOURTH_STREET_AUTHORING_INPUT,
  LANTERN_ROOM_AUTHORING_INPUT,
} = require('./support/hv5-authoring-fixtures');

test('HV-6 derives its editable registry exclusively from accepted HV-5 ownership', () => {
  for (const input of [FOURTH_STREET_AUTHORING_INPUT, LANTERN_ROOM_AUTHORING_INPUT]) {
    const ownership = buildOwnershipMap(input);
    const expected = Object.entries(ownership)
      .filter(([, owner]) => owner === OWNERSHIP.OPERATOR_AUTHORED)
      .map(([pointer]) => pointer)
      .sort();
    const fields = editableFieldDescriptors(input);

    assert.deepEqual(fields.map((field) => field.pointer), expected);
    assert.equal(fields.every((field) => field.ownership === OWNERSHIP.OPERATOR_AUTHORED), true);
    assert.equal(fields.every((field) => typeof field.semanticSection === 'string'), true);
    assert.equal(fields.every((field) => typeof field.controlKind === 'string'), true);
    assert.equal(fields.some((field) => field.pointer === '/venueContext/id'), false);
    assert.equal(fields.some((field) => field.pointer === '/deploymentRef/id'), false);
    assert.equal(fields.some((field) => /\/width$/.test(field.pointer)), false);
  }
});

test('HV-6 no-op apply is byte-identical for Fourth Street and Lantern Room', () => {
  for (const input of [FOURTH_STREET_AUTHORING_INPUT, LANTERN_ROOM_AUTHORING_INPUT]) {
    const expected = serializeVenueAuthoringReview(input);
    const session = createVisualAuthoringSession(input);

    assert.deepEqual(session.status(), { state: SESSION_STATE.CLEAN, dirty: false, error: null });
    assert.equal(session.canonicalAccepted(), expected);
    assert.equal(session.canonicalProposal(), expected);

    session.apply();

    assert.deepEqual(session.status(), { state: SESSION_STATE.ACCEPTED, dirty: false, error: null });
    assert.equal(session.canonicalAccepted(), expected);
    assert.equal(session.canonicalProposal(), expected);
  }
});

test('HV-6 allowed semantic edits preview through proposed HV-5 state and survive destroy/reload', () => {
  const session = createVisualAuthoringSession(FOURTH_STREET_AUTHORING_INPUT);
  const original = session.canonicalAccepted();

  session.edit('/venueContext/displayName', 'Fourth Street Social');
  session.edit('/venuePackage/home/hero/lede', 'A refreshed neighborhood gathering place.');
  session.edit('/venuePackage/home/hero/image/alt', 'Friends gathering at Fourth Street Social');

  assert.equal(session.state, SESSION_STATE.DIRTY);
  assert.equal(session.status().dirty, true);
  assert.equal(session.acceptedDocument.venueContext.displayName, '4th Street Bar');

  const preview = session.previewProjection();
  assert.equal(preview.siteName, 'Fourth Street Social');
  assert.equal(preview.venuePackage.home.hero.lede, 'A refreshed neighborhood gathering place.');
  assert.equal(preview.venuePackage.home.hero.image.alt, 'Friends gathering at Fourth Street Social');

  const accepted = session.apply();
  assert.equal(session.state, SESSION_STATE.ACCEPTED);
  assert.equal(accepted.venueContext.displayName, 'Fourth Street Social');
  assert.notEqual(session.canonicalAccepted(), original);

  const reloaded = createVisualAuthoringSession(accepted);
  assert.equal(reloaded.state, SESSION_STATE.CLEAN);
  assert.equal(reloaded.canonicalAccepted(), session.canonicalAccepted());
  assert.equal(reloaded.previewProjection().siteName, 'Fourth Street Social');
});

test('HV-6 discard reconstructs the projection from the accepted base', () => {
  const session = createVisualAuthoringSession(LANTERN_ROOM_AUTHORING_INPUT);
  const accepted = session.canonicalAccepted();
  const originalLede = session.previewProjection().venuePackage.home.hero.lede;

  session.edit('/venuePackage/home/hero/lede', 'Temporary unsaved reading-room copy.');
  assert.equal(session.status().dirty, true);
  assert.equal(session.previewProjection().venuePackage.home.hero.lede, 'Temporary unsaved reading-room copy.');

  session.discard();

  assert.deepEqual(session.status(), { state: SESSION_STATE.DISCARDED, dirty: false, error: null });
  assert.equal(session.canonicalAccepted(), accepted);
  assert.equal(session.canonicalProposal(), accepted);
  assert.equal(session.previewProjection().venuePackage.home.hero.lede, originalLede);
  assert.equal(session.previewProjection().venuePackage.onboarding.operatorNoun, 'reading room');
  assert.equal(session.previewProjection().venuePackage.onboarding.staffRole, 'host');
});

test('HV-6 UI edit API refuses protected, derived, container, and unknown authority', () => {
  const session = createVisualAuthoringSession(FOURTH_STREET_AUTHORING_INPUT);
  const accepted = session.canonicalAccepted();

  for (const pointer of [
    '/venueContext/id',
    '/deploymentRef/id',
    '/venueContext/hive/communityId',
    '/venueContext/hive/paymentMerchantAccounts',
    '/venuePackage/home/hero/image/width',
    '/venuePackage/home/gallery/items',
    '/unknown',
  ]) {
    assert.throws(
      () => session.edit(pointer, 'forbidden'),
      (error) => error instanceof VisualAuthoringSessionError && /ordinary visual edit denied/.test(error.message),
    );
  }

  assert.equal(session.canonicalAccepted(), accepted);
  assert.deepEqual(session.status(), { state: SESSION_STATE.CLEAN, dirty: false, error: null });
});

test('HV-6 invalid semantic values are rejected transactionally before replacing the preview proposal', () => {
  const session = createVisualAuthoringSession(FOURTH_STREET_AUTHORING_INPUT);
  const accepted = session.canonicalAccepted();
  const originalImage = session.previewProjection().venuePackage.home.hero.image.src;

  assert.throws(
    () => session.edit('/venuePackage/home/hero/image/src', 'https://evil.example/hero.jpg'),
    /Venue media must use an absolute same-origin path/,
  );

  assert.equal(session.canonicalAccepted(), accepted);
  assert.equal(session.canonicalProposal(), accepted);
  assert.equal(session.previewProjection().venuePackage.home.hero.image.src, originalImage);
  assert.deepEqual(session.status(), { state: SESSION_STATE.CLEAN, dirty: false, error: null });
});

test('HV-6 visual session exposes no raw document or gallery-topology mutation channel', () => {
  const session = createVisualAuthoringSession(FOURTH_STREET_AUTHORING_INPUT);

  assert.equal(session.replaceProposal, undefined);
  assert.equal(session.reorderGallery, undefined);
  assert.equal(session.addGalleryItem, undefined);
  assert.equal(session.removeGalleryItem, undefined);

  assert.throws(
    () => session.edit('/venuePackage/home/gallery/items', []),
    (error) => error instanceof VisualAuthoringSessionError && /ordinary visual edit denied/.test(error.message),
  );

  const before = session.canonicalAccepted();
  session.edit('/venuePackage/home/gallery/items/0/caption', 'A refreshed fixed-slot gallery caption');
  assert.equal(session.state, SESSION_STATE.DIRTY);
  assert.equal(session.status().dirty, true);
  assert.equal(session.previewProjection().venuePackage.home.gallery.items.length, 3);

  session.apply();
  assert.equal(session.state, SESSION_STATE.ACCEPTED);
  assert.equal(session.acceptedDocument.venuePackage.home.gallery.items.length, 3);
  assert.equal(
    session.acceptedDocument.venuePackage.home.gallery.items[0].caption,
    'A refreshed fixed-slot gallery caption',
  );
  assert.notEqual(session.canonicalAccepted(), before);
});

test('HV-6 semantic field controls provide no arbitrary HTML or script authority', () => {
  const fields = editableFieldDescriptors(FOURTH_STREET_AUTHORING_INPUT);
  const forbiddenKinds = new Set(['html', 'script', 'component', 'style', 'topology']);
  const forbiddenPointerSegment = /(?:^|\/)(?:html|script|component|style|topology)(?:\/|$)/i;

  assert.equal(fields.some((field) => forbiddenKinds.has(field.controlKind)), false);
  assert.equal(fields.some((field) => forbiddenPointerSegment.test(field.pointer)), false);

  // Operator copy remains plain semantic text. Existing EJS templates escape it;
  // the adapter does not create a distinct raw-HTML or executable-script channel.
  const session = createVisualAuthoringSession(FOURTH_STREET_AUTHORING_INPUT);
  session.edit('/venuePackage/home/hero/lede', '<script>alert("not executable")</script>');
  assert.equal(session.previewProjection().venuePackage.home.hero.lede, '<script>alert("not executable")</script>');
  assert.doesNotThrow(() => session.apply());
});
