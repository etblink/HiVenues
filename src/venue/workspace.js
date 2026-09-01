'use strict';

const crypto = require('node:crypto');
const { compileDeploymentProfile } = require('../deployment/profile');
const {
  createVenueAuthoringDocument,
  serializeVenueAuthoringReview,
} = require('./authoring');
const {
  composeVenueBootstrap,
  serializeVenueBootstrapReview,
} = require('./bootstrap');
const {
  assertNoSecretMaterial,
  serializeCanonicalJson,
} = require('./safe-document');
const { MAX_VENUE_BOOTSTRAP_BYTES } = require('./runtime-admission');

const WORKSPACE_KIND = 'hive-venues-portable-workspace';
const WORKSPACE_SCHEMA_VERSION = 1;
const WORKSPACE_FILENAMES = Object.freeze({
  authoring: 'venue-authoring.json',
  deployment: 'deployment-manifest.json',
  bootstrap: 'runtime-bootstrap.json',
  bootstrapReview: 'bootstrap-review.json',
  manifest: 'workspace-manifest.json',
});

class PortableVenueWorkspaceError extends Error {
  constructor(message, options = {}) {
    super(`Portable venue workspace invalid: ${message}`, options);
    this.name = 'PortableVenueWorkspaceError';
  }
}

function workspaceErrorFactory(message) {
  return new PortableVenueWorkspaceError(message);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function sha256Utf8(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function deriveSourceDigest(authoringBytes, deploymentBytes) {
  return crypto
    .createHash('sha256')
    .update('hive-venues-portable-workspace-v1\0', 'utf8')
    .update(authoringBytes, 'utf8')
    .update('\0', 'utf8')
    .update(deploymentBytes, 'utf8')
    .digest('hex');
}

function fileRecord(path, role, content) {
  return Object.freeze({
    path,
    role,
    bytes: Buffer.byteLength(content, 'utf8'),
    sha256: sha256Utf8(content),
  });
}

function buildPortableVenueWorkspace({ authoringDocument, deploymentManifest }) {
  let authoring;
  try {
    authoring = createVenueAuthoringDocument(authoringDocument);
  } catch (error) {
    throw new PortableVenueWorkspaceError(`authoring source rejected: ${error.message}`, { cause: error });
  }

  assertNoSecretMaterial(deploymentManifest, {
    location: 'deployment manifest',
    errorFactory: workspaceErrorFactory,
  });

  let deploymentProfile;
  try {
    deploymentProfile = compileDeploymentProfile(deploymentManifest);
  } catch (error) {
    throw new PortableVenueWorkspaceError(`deployment target rejected: ${error.message}`, { cause: error });
  }

  if (authoring.deploymentRef.id !== deploymentProfile.id) {
    throw new PortableVenueWorkspaceError(
      `deployment reference expects ${authoring.deploymentRef.id}, but target resolves to ${deploymentProfile.id}`,
    );
  }

  const authoringBytes = serializeVenueAuthoringReview(authoring);
  const deploymentBytes = serializeCanonicalJson(deploymentManifest);
  const sourceDigestSha256 = deriveSourceDigest(authoringBytes, deploymentBytes);
  const workspaceId = `workspace-${sourceDigestSha256.slice(0, 24)}`;
  const bootstrapId = `${authoring.venueContext.id}-workspace-${sourceDigestSha256.slice(0, 16)}`;
  const canonicalDeploymentManifest = JSON.parse(deploymentBytes);

  const bootstrapInput = {
    schemaVersion: 1,
    bootstrapId,
    bindings: {
      venueId: authoring.venueContext.id,
      packageId: authoring.venuePackage.id,
      deploymentId: authoring.deploymentRef.id,
    },
    venueContext: authoring.venueContext,
    venuePackage: authoring.venuePackage,
    deploymentManifest: canonicalDeploymentManifest,
    metadata: {
      notes: 'Generated deterministically by the Hive-Venues portable workspace builder.',
    },
  };

  let composition;
  try {
    composition = composeVenueBootstrap(bootstrapInput);
  } catch (error) {
    throw new PortableVenueWorkspaceError(`runtime bootstrap rejected: ${error.message}`, { cause: error });
  }

  const bootstrapBytes = serializeCanonicalJson(bootstrapInput);
  const bootstrapByteLength = Buffer.byteLength(bootstrapBytes, 'utf8');
  if (bootstrapByteLength > MAX_VENUE_BOOTSTRAP_BYTES) {
    throw new PortableVenueWorkspaceError(
      `runtime bootstrap exceeds the ${MAX_VENUE_BOOTSTRAP_BYTES}-byte runtime admission limit`,
    );
  }
  const bootstrapReviewBytes = serializeVenueBootstrapReview(composition);
  const records = [
    fileRecord(WORKSPACE_FILENAMES.authoring, 'CANONICAL_PORTABLE_VENUE_SOURCE', authoringBytes),
    fileRecord(WORKSPACE_FILENAMES.deployment, 'TARGET_SPECIFIC_DEPLOYMENT_AUTHORITY', deploymentBytes),
    fileRecord(WORKSPACE_FILENAMES.bootstrap, 'DIRECT_RUNTIME_ADMISSION_INPUT', bootstrapBytes),
    fileRecord(WORKSPACE_FILENAMES.bootstrapReview, 'DERIVED_VALIDATED_BOOTSTRAP_REVIEW', bootstrapReviewBytes),
  ];

  const manifest = deepFreeze({
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    kind: WORKSPACE_KIND,
    workspaceId,
    sourceDigestSha256,
    identity: {
      venueId: composition.identity.venueId,
      packageId: composition.identity.packageId,
      deploymentId: composition.identity.deploymentId,
      bootstrapId: composition.bootstrapId,
    },
    authority: {
      venueSource: WORKSPACE_FILENAMES.authoring,
      deploymentTarget: WORKSPACE_FILENAMES.deployment,
      runtimeAdmission: WORKSPACE_FILENAMES.bootstrap,
      bootstrapReview: WORKSPACE_FILENAMES.bootstrapReview,
      workspaceManifestRole: 'DERIVED_INSPECTION_RECORD',
    },
    files: records,
  });
  const manifestBytes = serializeCanonicalJson(manifest);

  const files = deepFreeze({
    [WORKSPACE_FILENAMES.authoring]: authoringBytes,
    [WORKSPACE_FILENAMES.deployment]: deploymentBytes,
    [WORKSPACE_FILENAMES.bootstrap]: bootstrapBytes,
    [WORKSPACE_FILENAMES.bootstrapReview]: bootstrapReviewBytes,
    [WORKSPACE_FILENAMES.manifest]: manifestBytes,
  });

  return deepFreeze({
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    kind: WORKSPACE_KIND,
    workspaceId,
    sourceDigestSha256,
    identity: manifest.identity,
    manifest,
    files,
  });
}

module.exports = {
  PortableVenueWorkspaceError,
  WORKSPACE_FILENAMES,
  WORKSPACE_KIND,
  WORKSPACE_SCHEMA_VERSION,
  buildPortableVenueWorkspace,
  deriveSourceDigest,
  sha256Utf8,
};
