'use strict';

const crypto = require('node:crypto');
const { compileDeploymentProfile } = require('../deployment/profile');
const { createVenueAuthoringDocument } = require('./authoring');
const { createVenueContext } = require('./context');
const { createVenuePackage } = require('./package');
const {
  assertNoSecretMaterial,
  serializeCanonicalJson,
} = require('./safe-document');

const VENUE_SOURCE_KIND = 'hive-venues-deployment-agnostic-source';
const VENUE_SOURCE_SCHEMA_VERSION = 1;
const ALLOWED_SOURCE_KEYS = Object.freeze([
  'kind',
  'schemaVersion',
  'venueContext',
  'venuePackage',
]);

class DeploymentAgnosticVenueSourceError extends Error {
  constructor(message, options = {}) {
    super(`Deployment-agnostic venue source invalid: ${message}`, options);
    this.name = 'DeploymentAgnosticVenueSourceError';
  }
}

function sourceErrorFactory(message) {
  return new DeploymentAgnosticVenueSourceError(message);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function parseSourceEnvelope(input) {
  assertNoSecretMaterial(input, {
    location: 'deployment-agnostic venue source',
    errorFactory: sourceErrorFactory,
  });

  if (!isPlainObject(input)) {
    throw new DeploymentAgnosticVenueSourceError('source must be a plain object');
  }

  const keys = Object.keys(input).sort();
  const expectedKeys = [...ALLOWED_SOURCE_KEYS].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
    if (Object.prototype.hasOwnProperty.call(input, 'deploymentRef')) {
      throw new DeploymentAgnosticVenueSourceError(
        'deploymentRef is forbidden; bind the source to a deployment only after source confirmation',
      );
    }
    throw new DeploymentAgnosticVenueSourceError(
      `source keys must be exactly ${expectedKeys.join(', ')}`,
    );
  }

  if (input.kind !== VENUE_SOURCE_KIND) {
    throw new DeploymentAgnosticVenueSourceError(`kind must be ${VENUE_SOURCE_KIND}`);
  }
  if (input.schemaVersion !== VENUE_SOURCE_SCHEMA_VERSION) {
    throw new DeploymentAgnosticVenueSourceError(
      `schemaVersion must be ${VENUE_SOURCE_SCHEMA_VERSION}`,
    );
  }

  return input;
}

function createDeploymentAgnosticVenueSource(input) {
  const envelope = parseSourceEnvelope(input);
  let venueContext;
  let venuePackage;
  try {
    venueContext = createVenueContext(envelope.venueContext);
    venuePackage = createVenuePackage(envelope.venuePackage, venueContext);
  } catch (error) {
    throw new DeploymentAgnosticVenueSourceError(error.message, { cause: error });
  }

  return deepFreeze({
    kind: VENUE_SOURCE_KIND,
    schemaVersion: VENUE_SOURCE_SCHEMA_VERSION,
    venueContext,
    venuePackage,
  });
}

function serializeDeploymentAgnosticVenueSource(input) {
  const source = createDeploymentAgnosticVenueSource(input);
  assertNoSecretMaterial(source, {
    location: 'deployment-agnostic venue source',
    errorFactory: sourceErrorFactory,
  });
  return serializeCanonicalJson(source);
}

function deriveDeploymentAgnosticVenueSourceDigest(input) {
  const bytes = serializeDeploymentAgnosticVenueSource(input);
  return crypto
    .createHash('sha256')
    .update('hive-venues-deployment-agnostic-source-v1\0', 'utf8')
    .update(bytes, 'utf8')
    .digest('hex');
}

function bindDeploymentAgnosticVenueSource(input, deploymentManifest) {
  const source = createDeploymentAgnosticVenueSource(input);

  assertNoSecretMaterial(deploymentManifest, {
    location: 'deployment manifest',
    errorFactory: sourceErrorFactory,
  });

  let deploymentProfile;
  try {
    deploymentProfile = compileDeploymentProfile(deploymentManifest);
  } catch (error) {
    throw new DeploymentAgnosticVenueSourceError(
      `deployment target rejected: ${error.message}`,
      { cause: error },
    );
  }

  return createVenueAuthoringDocument({
    schemaVersion: 1,
    deploymentRef: { id: deploymentProfile.id },
    venueContext: source.venueContext,
    venuePackage: source.venuePackage,
  });
}

function extractDeploymentAgnosticVenueSource(authoringInput) {
  const authoring = createVenueAuthoringDocument(authoringInput);
  return createDeploymentAgnosticVenueSource({
    kind: VENUE_SOURCE_KIND,
    schemaVersion: VENUE_SOURCE_SCHEMA_VERSION,
    venueContext: authoring.venueContext,
    venuePackage: authoring.venuePackage,
  });
}

module.exports = {
  ALLOWED_SOURCE_KEYS,
  DeploymentAgnosticVenueSourceError,
  VENUE_SOURCE_KIND,
  VENUE_SOURCE_SCHEMA_VERSION,
  bindDeploymentAgnosticVenueSource,
  createDeploymentAgnosticVenueSource,
  deriveDeploymentAgnosticVenueSourceDigest,
  extractDeploymentAgnosticVenueSource,
  serializeDeploymentAgnosticVenueSource,
};
