'use strict';

const { z } = require('zod');
const { compileDeploymentProfile } = require('../deployment/profile');
const { createVenueContext } = require('./context');
const { createVenuePackage } = require('./package');

const BOOTSTRAP_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SECRET_FIELD_PATTERN = /(?:secret|password|privatekey|apikey|token|credential|sshkey)$/i;
const PRIVATE_MATERIAL_PATTERNS = [
  /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----/i,
  /\b5[HJK][1-9A-HJ-NP-Za-km-z]{48,50}\b/,
];

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

function normalizedKey(value) {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function assertNoSecretMaterial(value, location = 'bootstrap', seen = new WeakSet()) {
  if (typeof value === 'string') {
    if (PRIVATE_MATERIAL_PATTERNS.some((pattern) => pattern.test(value))) {
      throw new VenueBootstrapError(`${location} contains private key material`);
    }
    return;
  }

  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) {
    throw new VenueBootstrapError(`${location} contains a circular reference`);
  }
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((child, index) => assertNoSecretMaterial(child, `${location}[${index}]`, seen));
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (SECRET_FIELD_PATTERN.test(normalizedKey(key))) {
      throw new VenueBootstrapError(`${location}.${key} is a secret-bearing field and is not allowed`);
    }
    assertNoSecretMaterial(child, `${location}.${key}`, seen);
  }
}

function parseEnvelope(input) {
  assertNoSecretMaterial(input);
  const result = bootstrapEnvelopeSchema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'bootstrap'}: ${issue.message}`)
      .join('; ');
    throw new VenueBootstrapError(`input does not match schema version 1: ${details}`);
  }
  return result.data;
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

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
}

function serializeVenueBootstrapReview(composition) {
  assertNoSecretMaterial(composition, 'composition');
  return `${JSON.stringify(canonicalize(composition), null, 2)}\n`;
}

module.exports = {
  BOOTSTRAP_ID_PATTERN,
  VenueBootstrapError,
  composeVenueBootstrap,
  serializeVenueBootstrapReview,
};
