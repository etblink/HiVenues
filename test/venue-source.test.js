'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  OWNERSHIP,
  buildOwnershipMap,
} = require('../src/venue/authoring');
const {
  VENUE_SOURCE_KIND,
  bindDeploymentAgnosticVenueSource,
  createDeploymentAgnosticVenueSource,
  deriveDeploymentAgnosticVenueSourceDigest,
  extractDeploymentAgnosticVenueSource,
  serializeDeploymentAgnosticVenueSource,
} = require('../src/venue/source');
const { buildPortableVenueWorkspace } = require('../src/venue/workspace');
const FOURTH_STREET_DEPLOYMENT_MANIFEST = require('../ops/privex/manifest.json');
const {
  FOURTH_STREET_AUTHORING_INPUT,
  LANTERN_ROOM_AUTHORING_INPUT,
} = require('./support/hv5-authoring-fixtures');
const {
  HV4_SYNTHETIC_DEPLOYMENT_MANIFEST,
} = require('./support/hv4-synthetic-bootstrap');

function sourceFromAuthoring(authoring) {
  return {
    kind: VENUE_SOURCE_KIND,
    schemaVersion: 1,
    venueContext: authoring.venueContext,
    venuePackage: authoring.venuePackage,
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function secondValidSyntheticDeployment() {
  const manifest = clone(HV4_SYNTHETIC_DEPLOYMENT_MANIFEST);
  manifest.deployment.id = 'lantern-room-home-pc';
  manifest.provider = 'Operator Home PC';
  manifest.package = 'SELF-HOSTED';
  manifest.region = 'Operator Premises';
  manifest.topology.applicationAddress = '127.0.0.1:4200';
  manifest.release.root = '/tmp/hive-venues/lantern-room-home';
  manifest.release.service = 'lantern-room-home.service';
  manifest.release.publicHost = 'lantern-room-home.example.invalid';
  manifest.release.redirectHost = 'www.lantern-room-home.example.invalid';
  manifest.release.hiveAppTag = 'lantern-room-home/0.0.0-test';
  manifest.release.lastGoodPath = '/tmp/hive-venues/lantern-room-home/last-good';
  manifest.storage.paymentDatabase = '/tmp/hive-venues/lantern-room-home/payments.sqlite3';
  manifest.storage.onboardingDatabase = '/tmp/hive-venues/lantern-room-home/onboarding.sqlite3';
  manifest.provenance.commitFilename = '.lantern-room-home-commit';
  manifest.provenance.treeFilename = '.lantern-room-home-tree';
  manifest.runtimeProfiles.deploymentBaseline = 'home-read-only';
  manifest.runtimeProfiles.acceptedBeta = 'home-beta';
  manifest.runtimeProfiles.wiredV1 = 'home-v1';
  return manifest;
}

test('deployment-agnostic source validates existing venue context/package authorities without deploymentRef', () => {
  const input = sourceFromAuthoring(LANTERN_ROOM_AUTHORING_INPUT);
  const source = createDeploymentAgnosticVenueSource(input);
  assert.equal(source.kind, VENUE_SOURCE_KIND);
  assert.equal(source.schemaVersion, 1);
  assert.equal(source.venueContext.id, LANTERN_ROOM_AUTHORING_INPUT.venueContext.id);
  assert.equal(source.venuePackage.id, LANTERN_ROOM_AUTHORING_INPUT.venuePackage.id);
  assert.equal(Object.prototype.hasOwnProperty.call(source, 'deploymentRef'), false);
  assert.equal(Object.isFrozen(source), true);
});

test('source rejects deploymentRef instead of silently preserving deployment topology', () => {
  const input = {
    ...sourceFromAuthoring(LANTERN_ROOM_AUTHORING_INPUT),
    deploymentRef: { id: 'synthetic-vps' },
  };
  assert.throws(
    () => createDeploymentAgnosticVenueSource(input),
    /deploymentRef is forbidden/,
  );
});

test('source remains strict and rejects unknown top-level authority', () => {
  const input = {
    ...sourceFromAuthoring(LANTERN_ROOM_AUTHORING_INPUT),
    runtime: { host: 'example.invalid' },
  };
  assert.throws(
    () => createDeploymentAgnosticVenueSource(input),
    /source keys must be exactly/,
  );
});

test('source delegates venue/package binding validation to existing authorities', () => {
  const input = sourceFromAuthoring(LANTERN_ROOM_AUTHORING_INPUT);
  input.venuePackage = {
    ...input.venuePackage,
    venueId: FOURTH_STREET_AUTHORING_INPUT.venueContext.id,
  };
  assert.throws(
    () => createDeploymentAgnosticVenueSource(input),
    /Venue package .* is bound to .* not/,
  );
});

test('source rejects recognized secret material before binding', () => {
  const input = sourceFromAuthoring(LANTERN_ROOM_AUTHORING_INPUT);
  input.venueContext = {
    ...input.venueContext,
    business: {
      ...input.venueContext.business,
      apiToken: 'do-not-admit',
    },
  };
  assert.throws(
    () => createDeploymentAgnosticVenueSource(input),
    /secret-bearing field/,
  );
});

test('canonical source bytes and digest do not depend on object insertion order', () => {
  const original = sourceFromAuthoring(LANTERN_ROOM_AUTHORING_INPUT);
  const reordered = {
    venuePackage: original.venuePackage,
    venueContext: original.venueContext,
    schemaVersion: 1,
    kind: VENUE_SOURCE_KIND,
  };
  assert.equal(
    serializeDeploymentAgnosticVenueSource(original),
    serializeDeploymentAgnosticVenueSource(reordered),
  );
  assert.equal(
    deriveDeploymentAgnosticVenueSourceDigest(original),
    deriveDeploymentAgnosticVenueSourceDigest(reordered),
  );
});

test('binding validates the deployment target through the existing HV-2 authority', () => {
  const input = sourceFromAuthoring(LANTERN_ROOM_AUTHORING_INPUT);
  const invalid = clone(HV4_SYNTHETIC_DEPLOYMENT_MANIFEST);
  invalid.release.publicHost = 'NOT A HOST';
  assert.throws(
    () => bindDeploymentAgnosticVenueSource(input, invalid),
    /deployment target rejected: Deployment profile invalid:/,
  );
});

test('same source bytes bind through two valid deployments into distinct workspaces', () => {
  const input = sourceFromAuthoring(LANTERN_ROOM_AUTHORING_INPUT);
  const firstTarget = clone(HV4_SYNTHETIC_DEPLOYMENT_MANIFEST);
  const secondTarget = secondValidSyntheticDeployment();
  const beforeBytes = serializeDeploymentAgnosticVenueSource(input);
  const beforeDigest = deriveDeploymentAgnosticVenueSourceDigest(input);

  const firstAuthoring = bindDeploymentAgnosticVenueSource(input, firstTarget);
  const secondAuthoring = bindDeploymentAgnosticVenueSource(input, secondTarget);
  const firstWorkspace = buildPortableVenueWorkspace({
    authoringDocument: firstAuthoring,
    deploymentManifest: firstTarget,
  });
  const secondWorkspace = buildPortableVenueWorkspace({
    authoringDocument: secondAuthoring,
    deploymentManifest: secondTarget,
  });

  assert.equal(firstAuthoring.deploymentRef.id, firstTarget.deployment.id);
  assert.equal(secondAuthoring.deploymentRef.id, secondTarget.deployment.id);
  assert.deepEqual(firstAuthoring.venueContext, secondAuthoring.venueContext);
  assert.deepEqual(firstAuthoring.venuePackage, secondAuthoring.venuePackage);
  assert.notEqual(firstWorkspace.workspaceId, secondWorkspace.workspaceId);
  assert.notEqual(firstWorkspace.inputDigestSha256, secondWorkspace.inputDigestSha256);
  assert.equal(serializeDeploymentAgnosticVenueSource(input), beforeBytes);
  assert.equal(deriveDeploymentAgnosticVenueSourceDigest(input), beforeDigest);
});

test('binding preserves established integration/security ownership classes', () => {
  const source = sourceFromAuthoring(LANTERN_ROOM_AUTHORING_INPUT);
  const bound = bindDeploymentAgnosticVenueSource(source, HV4_SYNTHETIC_DEPLOYMENT_MANIFEST);
  const ownership = buildOwnershipMap(bound);
  assert.equal(ownership['/deploymentRef/id'], OWNERSHIP.DEPLOYMENT_OWNED);
  assert.equal(ownership['/venueContext/hive/communityId'], OWNERSHIP.INTEGRATION_OWNED);
  assert.equal(
    ownership['/venueContext/hive/paymentMerchantAccounts'],
    OWNERSHIP.SECURITY_PRIVILEGED,
  );
  assert.equal(ownership['/venueContext/displayName'], OWNERSHIP.OPERATOR_AUTHORED);
});

test('accepted deployment-bound authoring can be losslessly projected back to the source layer', () => {
  const source = extractDeploymentAgnosticVenueSource(FOURTH_STREET_AUTHORING_INPUT);
  assert.equal(source.venueContext.id, FOURTH_STREET_AUTHORING_INPUT.venueContext.id);
  assert.equal(source.venuePackage.id, FOURTH_STREET_AUTHORING_INPUT.venuePackage.id);
  assert.equal(Object.prototype.hasOwnProperty.call(source, 'deploymentRef'), false);

  const rebound = bindDeploymentAgnosticVenueSource(source, FOURTH_STREET_DEPLOYMENT_MANIFEST);
  assert.deepEqual(rebound, FOURTH_STREET_AUTHORING_INPUT);
});

test('operator-visible content changes source digest', () => {
  const original = sourceFromAuthoring(LANTERN_ROOM_AUTHORING_INPUT);
  const changed = sourceFromAuthoring(LANTERN_ROOM_AUTHORING_INPUT);
  changed.venueContext = {
    ...changed.venueContext,
    displayName: `${changed.venueContext.displayName} Annex`,
  };
  assert.notEqual(
    deriveDeploymentAgnosticVenueSourceDigest(original),
    deriveDeploymentAgnosticVenueSourceDigest(changed),
  );
});
