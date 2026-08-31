'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createVenueAuthoringDocument,
  serializeVenueAuthoringReview,
} = require('../src/venue/authoring');
const {
  VisualAuthoringSessionError,
  createVisualAuthoringSession,
} = require('../src/venue/visual-authoring-session');
const {
  FOURTH_STREET_AUTHORING_INPUT,
  LANTERN_ROOM_AUTHORING_INPUT,
} = require('./support/hv5-authoring-fixtures');

function mutable(value) {
  return structuredClone(value);
}

test('Phase C denies a synthetic venue-context schemaVersion through both visual and HV-1/HV-5 boundaries', () => {
  for (const input of [FOURTH_STREET_AUTHORING_INPUT, LANTERN_ROOM_AUTHORING_INPUT]) {
    const session = createVisualAuthoringSession(input);
    const acceptedBefore = session.canonicalAccepted();

    assert.equal(
      session.listEditableFields().some((field) => field.pointer === '/venueContext/schemaVersion'),
      false,
    );
    assert.throws(
      () => session.edit('/venueContext/schemaVersion', 1),
      (error) => error instanceof VisualAuthoringSessionError && /ordinary visual edit denied/.test(error.message),
    );
    assert.equal(session.canonicalAccepted(), acceptedBefore);

    const proposal = mutable(input);
    proposal.venueContext.schemaVersion = 1;
    assert.throws(
      () => createVenueAuthoringDocument(proposal),
      /invalid venue context|unrecognized key/i,
    );
    assert.equal(serializeVenueAuthoringReview(input), acceptedBefore);
  }
});
