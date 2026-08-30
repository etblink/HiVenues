'use strict';

const { z } = require('zod');
const { compileDeploymentProfile } = require('../deployment/profile');
const { createVenueContext } = require('./context');
const { createVenuePackage } = require('./package');
const {
  assertNoSecretMaterial,
  serializeCanonicalJson,
} = require('./safe-document');

const BOOTSTRAP_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BINDING_ID = z.string().trim().min(1).max(120);

class VenueBootstrapError extends Error {
  constructor(message) {
    super(`Venue bootstrap invalid: ${message}`);
    this.name = 'VenueBootstrapError';
  }
}

const bootstrapEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    bootstrapId: z.string().trim().regex(BOOTSTRAP_ID_PATTERN),
    bindings: z
      .object({
        venueId: BINDING_ID,
        packageId: BINDING_ID,
        deploymentId: BINDING_ID,
      })
      .strict(),
    venueContext: z.unknown(),
    venuePackage: z.unknown(),
    deploymentManifest: z.unknown(),
    metadata: z
      .object({
        notes: z.string().trim().min(1).max(1000),
      })
      .strict()
      .optional(),
  })
  .strict();

function bootstrapErrorFactory(message) {
  return new VenueBootstrapError(message);
}

function parseEnvelope(input) {
  assertNoSecretMaterial(input, {
    location: 'bootstrap',
    errorFactory: bootstrapErrorFactory,
  });
  const result = bootstrapEnvelopeSchema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'bootstrap'}: ${issue.message}`)
      .join('; ');
    throw new VenueBootstrapError(`input does not match schema version 1: ${details}`);
  }
  return result.data;
}

function assertBinding(label, expected, actual) {
  if (expected !== actual) {
    throw new VenueBootstrapError(`${label} expects ${expected}, but validated input resolves to ${actual}`);
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function composeVenueBootstrap(input) {
  const envelope = parseEnvelope(input);
  const venueContext = createVenueContext(envelope.venueContext);
  const venuePackage = createVenuePackage(envelope.venuePackage, venueContext);
  const deploymentProfile = compileDeploymentProfile(envelope.deploymentManifest);

  assertBinding('bindings.venueId', envelope.bindings.venueId, venueContext.id);
  assertBinding('bindings.packageId', envelope.bindings.packageId, venuePackage.id);
  assertBinding('bindings.deploymentId', envelope.bindings.deploymentId, deploymentProfile.id);

  return deepFreeze({
    schemaVersion: 1,
    bootstrapId: envelope.bootstrapId,
    identity: {
      venueId: venueContext.id,
      packageId: venuePackage.id,
      deploymentId: deploymentProfile.id,
    },
    venueContext,
    venuePackage,
    deploymentProfile,
    metadata: envelope.metadata || {},
  });
}

function serializeVenueBootstrapReview(composition) {
  assertNoSecretMaterial(composition, {
    location: 'composition',
    errorFactory: bootstrapErrorFactory,
  });
  return serializeCanonicalJson(composition);
}

module.exports = {
  BOOTSTRAP_ID_PATTERN,
  VenueBootstrapError,
  composeVenueBootstrap,
  serializeVenueBootstrapReview,
};
