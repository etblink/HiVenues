'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  deriveManagedImage,
  inspectManagedImage,
  managedAssetFilenameFromSourcePath,
  resolveManagedAssetFile,
  storeManagedImage,
} = require('../managed-assets');
const {
  resolveTurnkeyWorkspace,
} = require('../turnkey-workspace');
const {
  createV2DeploymentAgnosticVenueSource,
  deriveV2DeploymentAgnosticVenueSourceDigest,
} = require('./source');
const {
  V2_PERSISTED_SOURCE_ABSENT,
  V2_VENUE_SOURCE_FILENAME,
  atomicSaveV2DeploymentAgnosticVenueSourceFile,
  inspectV2DeploymentAgnosticVenueSourceFile,
} = require('./source-file');

const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const MANAGED_PREFIX = '/venue-assets/';

class V2WorkspaceCheckpointError extends Error {
  constructor(message, options = {}) {
    super(`HiVenues v2 workspace checkpoint failed: ${message}`, options);
    this.name = 'V2WorkspaceCheckpointError';
  }
}

function digest(value, label) {
  if (typeof value !== 'string' || !DIGEST_PATTERN.test(value)) {
    throw new V2WorkspaceCheckpointError(`${label} must be a lowercase v2 source digest`);
  }
  return value;
}

function expectedPersisted(value) {
  if (value === V2_PERSISTED_SOURCE_ABSENT) return value;
  return digest(value, 'expected persisted digest');
}

function realDirectory(filename, label, fsImpl) {
  let stat;
  try {
    stat = fsImpl.lstatSync(filename);
  } catch (error) {
    throw new V2WorkspaceCheckpointError(`${label} is unavailable: ${filename}`, { cause: error });
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new V2WorkspaceCheckpointError(`${label} must be a real directory, not a symlink: ${filename}`);
  }
}

function regularFile(filename, label, fsImpl) {
  let stat;
  try {
    stat = fsImpl.lstatSync(filename);
  } catch (error) {
    throw new V2WorkspaceCheckpointError(`${label} is unavailable: ${filename}`, { cause: error });
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new V2WorkspaceCheckpointError(`${label} must be a regular file, not a symlink: ${filename}`);
  }
  return stat;
}

function resolveV2WorkspaceCheckpoint(workspaceDirectory) {
  const workspace = resolveTurnkeyWorkspace(workspaceDirectory);
  return Object.freeze({
    ...workspace,
    v2SourceFile: path.join(workspace.root, V2_VENUE_SOURCE_FILENAME),
  });
}

function mediaByteEntries(mediaBytesInput) {
  if (mediaBytesInput === undefined || mediaBytesInput === null) return [];
  if (!(mediaBytesInput instanceof Map)) {
    throw new V2WorkspaceCheckpointError('session media bytes must be an internal Map');
  }
  const entries = [];
  for (const [sourcePath, value] of mediaBytesInput.entries()) {
    if (typeof sourcePath !== 'string' || !sourcePath.startsWith(MANAGED_PREFIX)) {
      throw new V2WorkspaceCheckpointError('session media path must use the managed venue-assets boundary');
    }
    const bytes = Buffer.isBuffer(value)
      ? value
      : Buffer.isBuffer(value?.bytes)
        ? value.bytes
        : null;
    if (!bytes) throw new V2WorkspaceCheckpointError('session media entry is missing exact bytes');
    entries.push({ sourcePath, bytes });
  }
  entries.sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
  return entries;
}

function validateSessionMediaEntry(source, entry) {
  const asset = source.media.assets.find((candidate) => candidate.src === entry.sourcePath);
  if (!asset) {
    throw new V2WorkspaceCheckpointError(
      `session media bytes are not referenced by the accepted source: ${entry.sourcePath}`,
    );
  }
  let derived;
  try {
    derived = deriveManagedImage(entry.bytes);
  } catch (error) {
    throw new V2WorkspaceCheckpointError(error.message, { cause: error });
  }
  if (
    derived.sourcePath !== asset.src
    || derived.width !== asset.width
    || derived.height !== asset.height
    || asset.id !== `local-image-${derived.digestSha256}`
  ) {
    throw new V2WorkspaceCheckpointError(
      `session media bytes do not match accepted source authority: ${entry.sourcePath}`,
    );
  }
  return Object.freeze({ asset, derived, bytes: entry.bytes });
}

function validateDurableManagedAsset(workspace, asset, fsImpl) {
  if (!asset.src.startsWith(MANAGED_PREFIX)) return null;
  let filename;
  try {
    filename = managedAssetFilenameFromSourcePath(asset.src, { allowStarter: true });
  } catch (error) {
    throw new V2WorkspaceCheckpointError(error.message, { cause: error });
  }
  const filePath = resolveManagedAssetFile(workspace.root, asset.src, { allowStarter: true });
  regularFile(filePath, 'managed media file', fsImpl);

  if (filename.startsWith('starter-')) {
    return Object.freeze({ sourcePath: asset.src, filePath, starter: true });
  }

  const bytes = fsImpl.readFileSync(filePath);
  let inspected;
  try {
    inspected = inspectManagedImage(bytes);
  } catch (error) {
    throw new V2WorkspaceCheckpointError(
      `managed media file failed inspection: ${asset.src}`,
      { cause: error },
    );
  }
  const derived = deriveManagedImage(bytes);
  if (
    derived.sourcePath !== asset.src
    || inspected.width !== asset.width
    || inspected.height !== asset.height
  ) {
    throw new V2WorkspaceCheckpointError(
      `managed media file does not match accepted source metadata: ${asset.src}`,
    );
  }
  return Object.freeze({ sourcePath: asset.src, filePath, starter: false });
}

function rollbackCreatedMedia(created, fsImpl) {
  const failures = [];
  for (const entry of [...created].reverse()) {
    try {
      const stat = fsImpl.lstatSync(entry.filePath);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new Error('rollback target is no longer a regular file');
      }
      const current = fsImpl.readFileSync(entry.filePath);
      if (
        current.length !== entry.bytes.length
        || !crypto.timingSafeEqual(current, entry.bytes)
      ) {
        throw new Error('rollback target bytes changed after creation');
      }
      fsImpl.unlinkSync(entry.filePath);
    } catch (error) {
      failures.push(`${entry.filePath}: ${error.message}`);
    }
  }
  return failures;
}

function inspectV2WorkspaceCheckpoint({ workspaceDirectory, fsImpl = fs } = {}) {
  const workspace = resolveV2WorkspaceCheckpoint(workspaceDirectory);
  realDirectory(workspace.root, 'workspace', fsImpl);
  realDirectory(workspace.assetDirectory, 'managed asset directory', fsImpl);
  const persisted = inspectV2DeploymentAgnosticVenueSourceFile(
    workspace.v2SourceFile,
    { fsImpl },
  );
  return Object.freeze({
    workspace,
    exists: persisted.exists,
    persistedDigest: persisted.persistedDigest,
    source: persisted.source,
  });
}

function saveV2WorkspaceCheckpoint({
  workspaceDirectory,
  sourceInput,
  expectedDraftDigest,
  expectedPersistedDigest,
  mediaBytes,
  fsImpl = fs,
} = {}) {
  const workspace = resolveV2WorkspaceCheckpoint(workspaceDirectory);
  realDirectory(workspace.root, 'workspace', fsImpl);
  realDirectory(workspace.assetDirectory, 'managed asset directory', fsImpl);

  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const acceptedDigest = deriveV2DeploymentAgnosticVenueSourceDigest(source);
  if (digest(expectedDraftDigest, 'expected accepted draft digest') !== acceptedDigest) {
    throw new V2WorkspaceCheckpointError('accepted draft changed before Save');
  }
  const expectedBaseline = expectedPersisted(expectedPersistedDigest);
  const opening = inspectV2DeploymentAgnosticVenueSourceFile(
    workspace.v2SourceFile,
    { fsImpl },
  );
  if (opening.persistedDigest !== expectedBaseline) {
    throw new V2WorkspaceCheckpointError(
      'persisted v2 source changed; reload the workspace before saving',
    );
  }

  const entries = mediaByteEntries(mediaBytes);
  const validatedEntries = entries.map((entry) => validateSessionMediaEntry(source, entry));
  const ephemeralPaths = new Set(entries.map((entry) => entry.sourcePath));

  for (const asset of source.media.assets) {
    if (asset.src.startsWith(MANAGED_PREFIX) && !ephemeralPaths.has(asset.src)) {
      validateDurableManagedAsset(workspace, asset, fsImpl);
    }
  }

  const created = [];
  const reusedMediaPaths = [];
  try {
    for (const entry of validatedEntries) {
      let stored;
      try {
        stored = storeManagedImage({
          workspaceDirectory: workspace.root,
          bytes: entry.bytes,
          fsImpl,
        });
      } catch (error) {
        throw new V2WorkspaceCheckpointError(error.message, { cause: error });
      }
      if (
        stored.sourcePath !== entry.asset.src
        || stored.width !== entry.asset.width
        || stored.height !== entry.asset.height
        || `local-image-${stored.digestSha256}` !== entry.asset.id
      ) {
        throw new V2WorkspaceCheckpointError(
          `stored media identity diverged from accepted source: ${entry.asset.src}`,
        );
      }
      if (stored.created) {
        created.push({
          filePath: stored.filePath,
          sourcePath: stored.sourcePath,
          bytes: entry.bytes,
        });
      } else {
        reusedMediaPaths.push(stored.sourcePath);
      }
    }

    const saved = atomicSaveV2DeploymentAgnosticVenueSourceFile(
      workspace.v2SourceFile,
      source,
      {
        expectedDigest: expectedBaseline,
        fsImpl,
      },
    );
    if (saved.persistedDigest !== acceptedDigest) {
      throw new V2WorkspaceCheckpointError('persisted source digest diverged from accepted draft');
    }

    return Object.freeze({
      workspace,
      previousDigest: saved.previousDigest,
      persistedDigest: saved.persistedDigest,
      sourceCreated: saved.created,
      createdMediaPaths: Object.freeze(created.map((entry) => entry.sourcePath)),
      reusedMediaPaths: Object.freeze([...reusedMediaPaths]),
      source: saved.source,
      bytes: saved.bytes,
    });
  } catch (error) {
    const rollbackFailures = rollbackCreatedMedia(created, fsImpl);
    if (rollbackFailures.length > 0) {
      throw new V2WorkspaceCheckpointError(
        `Save failed and media rollback was incomplete: ${rollbackFailures.join('; ')}`,
        { cause: error },
      );
    }
    if (error instanceof V2WorkspaceCheckpointError) throw error;
    throw new V2WorkspaceCheckpointError(error.message, { cause: error });
  }
}

module.exports = {
  V2WorkspaceCheckpointError,
  inspectV2WorkspaceCheckpoint,
  resolveV2WorkspaceCheckpoint,
  saveV2WorkspaceCheckpoint,
};
