'use strict';

const { REFERENCE_DEPLOYMENT_PROFILE } = require('../../src/deployment/reference/fourth-street-privex');
const { FOURTH_STREET_REFERENCE_PACKAGE } = require('../../src/venue/reference/fourth-street-package');
const { FOURTH_STREET_REFERENCE_VENUE } = require('../../src/venue/reference/fourth-street');
const { HV3_SYNTHETIC_PACKAGE, HV3_SYNTHETIC_VENUE } = require('./hv3-synthetic-venue');
const { HV4_SYNTHETIC_DEPLOYMENT_MANIFEST } = require('./hv4-synthetic-bootstrap');

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

const FOURTH_STREET_AUTHORING_INPUT = deepFreeze({
  schemaVersion: 1,
  deploymentRef: {
    id: REFERENCE_DEPLOYMENT_PROFILE.id,
  },
  venueContext: FOURTH_STREET_REFERENCE_VENUE,
  venuePackage: FOURTH_STREET_REFERENCE_PACKAGE,
});

const LANTERN_ROOM_AUTHORING_INPUT = deepFreeze({
  schemaVersion: 1,
  deploymentRef: {
    id: HV4_SYNTHETIC_DEPLOYMENT_MANIFEST.deployment.id,
  },
  venueContext: HV3_SYNTHETIC_VENUE,
  venuePackage: HV3_SYNTHETIC_PACKAGE,
});

module.exports = {
  FOURTH_STREET_AUTHORING_INPUT,
  LANTERN_ROOM_AUTHORING_INPUT,
};
