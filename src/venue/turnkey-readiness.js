'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const { buildPortableVenueWorkspaceFromSource } = require('./workspace-from-source');
const {
  loadDeploymentAgnosticVenueSourceFile,
  serializeDeploymentAgnosticVenueSourceFile,
} = require('./source-file');
const {
  MANAGED_MEDIA_FILENAME_PATTERN,
  inspectManagedImage,
  managedAssetFilenameFromSourcePath,
  resolveManagedAssetFile,
  sourceMediaReferences,
} = require('./managed-assets');
const {
  STARTER_ASSETS,
  resolveTurnkeyWorkspace,
  starterSvg,
} = require('./turnkey-workspace');

class TurnkeyReadinessError extends Error {
  constructor(message, options = {}) {
    super(`HiVenues readiness failed: ${message}`, options);
    this.name = 'TurnkeyReadinessError';
  }
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function readinessDeploymentManifest() {
  return Object.freeze({
    schemaVersion: 1,
    deployment: { id: 'hivenues-v1-readiness-rehearsal' },
    provider: 'repository-local-readiness',
    package: 'offline-rehearsal',
    region: 'offline',
    operatingSystem: 'portable',
    runtime: {
      nodeVersion: '24.19.0',
      npmVersion: '11.17.0',
      platform: 'portable',
      source: 'https://runtime.readiness.invalid/node.tar.gz',
      sha256: '0000000000000000000000000000000000000000000000000000000000000000',
    },
    topology: {
      instances: 1,
      edgeProxy: 'none',
      edgeDnsMode: 'offline',
      reverseProxy: 'none',
      applicationAddress: '127.0.0.1:3000',
      applicationTrustProxy: 'disabled',
      visitorIpHeader: 'none',
      originIngress: 'loopback-only',
      tlsMode: 'offline',
    },
    release: {
      root: '/tmp/hivenues-readiness',
      service: 'hivenues-readiness.service',
      publicHost: 'venue.readiness.invalid',
      redirectHost: 'www.readiness.invalid',
      hiveAppTag: 'hivenues-readiness/1.0.0',
      healthPath: '/healthz',
      readinessPath: '/readyz',
      automaticDeploys: false,
      exactCommitRequired: true,
      lastGoodPath: '/tmp/hivenues-readiness/last-good',
      lastGoodPolicy: 'rehearsal-only',
    },
    storage: {
      paymentDatabase: '/tmp/hivenues-readiness/payments.sqlite',
      onboardingDatabase: '/tmp/hivenues-readiness/onboarding.sqlite',
    },
    provenance: { commitFilename: 'COMMIT', treeFilename: 'TREE' },
    runtimeProfiles: {
      deploymentBaseline: 'readiness-rehearsal',
      acceptedBeta: 'readiness-rehearsal',
      wiredV1: 'readiness-rehearsal',
    },
  });
}

function assertRegularFile(filename, fsImpl = fs) {
  let stat;
  try { stat = fsImpl.lstatSync(filename); } catch (error) { throw new TurnkeyReadinessError(`required file is missing: ${filename}`, { cause: error }); }
  if (!stat.isFile() || stat.isSymbolicLink()) throw new TurnkeyReadinessError(`required path must be a regular file, not a symlink: ${filename}`);
  return stat;
}

function validateStarterAsset(filename, bytes) {
  const record = STARTER_ASSETS.find((entry) => entry.filename === filename);
  if (!record) throw new TurnkeyReadinessError(`unrecognized starter asset ${filename}`);
  const expected = Buffer.from(starterSvg(record), 'utf8');
  if (expected.length !== bytes.length || !crypto.timingSafeEqual(expected, bytes)) {
    throw new TurnkeyReadinessError(`${filename} no longer matches the official starter; import replacement media through Venue Studio`);
  }
}

function validateManagedMedia(workspace, source, fsImpl = fs) {
  const validated = [];
  for (const reference of sourceMediaReferences(source)) {
    let filename;
    try { filename = managedAssetFilenameFromSourcePath(reference.src, { allowStarter: true }); }
    catch (error) { throw new TurnkeyReadinessError(`${reference.pointer}: ${error.message}`, { cause: error }); }
    const filePath = resolveManagedAssetFile(workspace.root, reference.src, { allowStarter: true });
    assertRegularFile(filePath, fsImpl);
    const bytes = fsImpl.readFileSync(filePath);
    if (MANAGED_MEDIA_FILENAME_PATTERN.test(filename)) {
      const inspected = inspectManagedImage(bytes);
      const digest = sha256(bytes);
      if (!filename.startsWith(`media-${digest.slice(0, 20)}.`)) {
        throw new TurnkeyReadinessError(`${reference.pointer}: managed media filename does not match its bytes`);
      }
      validated.push(Object.freeze({ ...reference, filename, bytes: bytes.length, mediaType: inspected.mediaType }));
    } else {
      validateStarterAsset(filename, bytes);
      validated.push(Object.freeze({ ...reference, filename, bytes: bytes.length, mediaType: 'image/svg+xml' }));
    }
  }
  return Object.freeze(validated);
}

function qualifyTurnkeyWorkspace({ workspaceDirectory, fsImpl = fs } = {}) {
  const workspace = resolveTurnkeyWorkspace(workspaceDirectory);
  assertRegularFile(workspace.sourceFile, fsImpl);
  const before = fsImpl.readFileSync(workspace.sourceFile);
  let source;
  try {
    source = loadDeploymentAgnosticVenueSourceFile(workspace.sourceFile, { statSync: fsImpl.statSync, readFileSync: fsImpl.readFileSync });
  } catch (error) {
    throw new TurnkeyReadinessError(error.message, { cause: error });
  }
  const canonical = Buffer.from(serializeDeploymentAgnosticVenueSourceFile(source), 'utf8');
  if (before.length !== canonical.length || !crypto.timingSafeEqual(before, canonical)) {
    throw new TurnkeyReadinessError('venue-source.json is valid but not canonical; save it through Venue Studio before readiness');
  }
  const media = validateManagedMedia(workspace, source, fsImpl);

  let portableWorkspace;
  try {
    portableWorkspace = buildPortableVenueWorkspaceFromSource({
      venueSource: source,
      deploymentManifest: readinessDeploymentManifest(),
    });
  } catch (error) {
    throw new TurnkeyReadinessError(`saved source could not enter the deployment-binding/workspace compiler: ${error.message}`, { cause: error });
  }
  const after = fsImpl.readFileSync(workspace.sourceFile);
  if (before.length !== after.length || !crypto.timingSafeEqual(before, after)) {
    throw new TurnkeyReadinessError('readiness changed venue-source.json; refusing the result');
  }
  return Object.freeze({
    ready: true,
    workspace: workspace.root,
    sourceFile: workspace.sourceFile,
    sourceSha256: sha256(before),
    media,
    rehearsalWorkspaceId: portableWorkspace.workspaceId,
    rehearsalInputDigestSha256: portableWorkspace.inputDigestSha256,
  });
}

module.exports = {
  TurnkeyReadinessError,
  qualifyTurnkeyWorkspace,
  readinessDeploymentManifest,
  validateManagedMedia,
};
