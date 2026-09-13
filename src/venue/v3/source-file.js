'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  MAX_VENUE_SOURCE_FILE_BYTES,
} = require('../source-file');
const {
  createV3DeploymentAgnosticVenueSource,
  deriveV3DeploymentAgnosticVenueSourceDigest,
  serializeV3DeploymentAgnosticVenueSource,
} = require('./source');

const V3_VENUE_SOURCE_FILENAME = 'venue-source-v3.json';
const V3_PERSISTED_SOURCE_ABSENT = 'ABSENT';
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;

class V3VenueSourceFileError extends Error {
  constructor(message, options = {}) {
    super(`HiVenues v3 source file invalid: ${message}`, options);
    this.name = 'V3VenueSourceFileError';
  }
}

function sourceFilename(value) {
  if (typeof value !== 'string' || value.trim() === '' || value.includes('\0')) {
    throw new V3VenueSourceFileError('source filename must be an explicit local path');
  }
  return path.resolve(value);
}

function expectedPersistedDigest(value) {
  if (value === V3_PERSISTED_SOURCE_ABSENT) return value;
  if (typeof value !== 'string' || !DIGEST_PATTERN.test(value)) {
    throw new V3VenueSourceFileError(
      'expected persisted digest must be ABSENT or a lowercase v3 source digest',
    );
  }
  return value;
}

function parseV3DeploymentAgnosticVenueSourceFile(raw) {
  const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : raw;
  if (typeof text !== 'string') {
    throw new V3VenueSourceFileError('source file contents must be UTF-8 text');
  }
  if (Buffer.byteLength(text, 'utf8') > MAX_VENUE_SOURCE_FILE_BYTES) {
    throw new V3VenueSourceFileError(
      `source file exceeds ${MAX_VENUE_SOURCE_FILE_BYTES} bytes`,
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new V3VenueSourceFileError('source file is not valid JSON', { cause: error });
  }

  try {
    return createV3DeploymentAgnosticVenueSource(parsed);
  } catch (error) {
    throw new V3VenueSourceFileError(error.message, { cause: error });
  }
}

function serializeV3DeploymentAgnosticVenueSourceFile(sourceInput) {
  let text;
  try {
    text = serializeV3DeploymentAgnosticVenueSource(sourceInput);
  } catch (error) {
    throw new V3VenueSourceFileError(error.message, { cause: error });
  }
  if (Buffer.byteLength(text, 'utf8') > MAX_VENUE_SOURCE_FILE_BYTES) {
    throw new V3VenueSourceFileError(
      `source file exceeds ${MAX_VENUE_SOURCE_FILE_BYTES} bytes`,
    );
  }
  return text;
}

function requireRegularFile(filename, stat, label) {
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new V3VenueSourceFileError(`${label} must be a regular file, not a symlink: ${filename}`);
  }
}

function requireRegularDirectory(filename, stat, label) {
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new V3VenueSourceFileError(`${label} must be a real directory, not a symlink: ${filename}`);
  }
}

function exactLstat(fsImpl, filename) {
  return fsImpl.lstatSync(filename, { bigint: true });
}

function exceedsSourceFileLimit(size) {
  return typeof size === 'bigint'
    ? size > BigInt(MAX_VENUE_SOURCE_FILE_BYTES)
    : size > MAX_VENUE_SOURCE_FILE_BYTES;
}

function statIdentity(stat) {
  return `${String(stat.dev)}:${String(stat.ino)}`;
}

function inspectParentDirectory(parent, { fsImpl = fs } = {}) {
  let stat;
  let realpath;
  try {
    stat = exactLstat(fsImpl, parent);
    requireRegularDirectory(parent, stat, 'source directory');
    realpath = fsImpl.realpathSync(parent);
  } catch (error) {
    if (error instanceof V3VenueSourceFileError) throw error;
    throw new V3VenueSourceFileError(`cannot inspect source directory ${parent}`, { cause: error });
  }
  return Object.freeze({
    identity: statIdentity(stat),
    realpath: path.resolve(realpath),
  });
}

function sameParentIdentity(before, after) {
  return before.identity === after.identity && before.realpath === after.realpath;
}

function inspectV3DeploymentAgnosticVenueSourceFile(filename, { fsImpl = fs } = {}) {
  const resolved = sourceFilename(filename);
  let stat;
  try {
    stat = exactLstat(fsImpl, resolved);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return Object.freeze({
        filename: resolved,
        exists: false,
        persistedDigest: V3_PERSISTED_SOURCE_ABSENT,
        source: null,
        bytes: null,
        fileIdentity: null,
      });
    }
    throw new V3VenueSourceFileError(`cannot inspect source file ${resolved}`, { cause: error });
  }

  requireRegularFile(resolved, stat, 'source file');
  if (exceedsSourceFileLimit(stat.size)) {
    throw new V3VenueSourceFileError(
      `source file exceeds ${MAX_VENUE_SOURCE_FILE_BYTES} bytes`,
    );
  }

  let raw;
  try {
    raw = fsImpl.readFileSync(resolved, 'utf8');
  } catch (error) {
    throw new V3VenueSourceFileError(`cannot read source file ${resolved}`, { cause: error });
  }
  const source = parseV3DeploymentAgnosticVenueSourceFile(raw);
  const canonicalBytes = serializeV3DeploymentAgnosticVenueSourceFile(source);
  if (raw !== canonicalBytes) {
    throw new V3VenueSourceFileError('persisted source bytes are not exact canonical v3 serialization');
  }
  return Object.freeze({
    filename: resolved,
    exists: true,
    persistedDigest: deriveV3DeploymentAgnosticVenueSourceDigest(source),
    source,
    bytes: raw,
    fileIdentity: statIdentity(stat),
  });
}

function loadV3DeploymentAgnosticVenueSourceFile(filename, options = {}) {
  const inspected = inspectV3DeploymentAgnosticVenueSourceFile(filename, options);
  if (!inspected.exists) {
    throw new V3VenueSourceFileError(`cannot read source file ${inspected.filename}`);
  }
  return inspected.source;
}

function atomicSaveV3DeploymentAgnosticVenueSourceFile(
  filename,
  sourceInput,
  {
    expectedDigest,
    fsImpl = fs,
  } = {},
) {
  const resolved = sourceFilename(filename);
  const expected = expectedPersistedDigest(expectedDigest);
  let source;
  let sourceDigest;
  let bytes;
  try {
    source = createV3DeploymentAgnosticVenueSource(sourceInput);
    sourceDigest = deriveV3DeploymentAgnosticVenueSourceDigest(source);
    bytes = serializeV3DeploymentAgnosticVenueSourceFile(source);
  } catch (error) {
    if (error instanceof V3VenueSourceFileError) throw error;
    throw new V3VenueSourceFileError(error.message, { cause: error });
  }

  const parent = path.dirname(resolved);
  const openingParent = inspectParentDirectory(parent, { fsImpl });
  const opening = inspectV3DeploymentAgnosticVenueSourceFile(resolved, { fsImpl });
  if (opening.persistedDigest !== expected) {
    throw new V3VenueSourceFileError('persisted source changed; reload the workspace before saving');
  }

  const temporary = path.join(
    parent,
    `.${path.basename(resolved)}.${process.pid}.${crypto.randomUUID()}.tmp`,
  );
  let temporaryCreated = false;
  try {
    fsImpl.writeFileSync(temporary, bytes, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o644,
    });
    temporaryCreated = true;

    const temporaryStat = exactLstat(fsImpl, temporary);
    requireRegularFile(temporary, temporaryStat, 'temporary source file');
    const stagedBytes = fsImpl.readFileSync(temporary, 'utf8');
    if (stagedBytes !== bytes) {
      throw new V3VenueSourceFileError('staged source bytes differ from canonical v3 serialization');
    }

    const closingParent = inspectParentDirectory(parent, { fsImpl });
    if (!sameParentIdentity(openingParent, closingParent)) {
      throw new V3VenueSourceFileError('source directory changed during save; refusing replacement');
    }

    const closing = inspectV3DeploymentAgnosticVenueSourceFile(resolved, { fsImpl });
    if (closing.persistedDigest !== expected) {
      throw new V3VenueSourceFileError('persisted source changed during save; refusing replacement');
    }
    if (
      opening.exists
      && closing.exists
      && opening.fileIdentity !== closing.fileIdentity
    ) {
      throw new V3VenueSourceFileError('persisted source path was replaced during save; refusing replacement');
    }

    fsImpl.renameSync(temporary, resolved);
    temporaryCreated = false;

    const finalParent = inspectParentDirectory(parent, { fsImpl });
    if (!sameParentIdentity(openingParent, finalParent)) {
      throw new V3VenueSourceFileError('source directory changed while finalizing save');
    }
    const reopened = inspectV3DeploymentAgnosticVenueSourceFile(resolved, { fsImpl });
    if (reopened.persistedDigest !== sourceDigest || reopened.bytes !== bytes) {
      throw new V3VenueSourceFileError('fresh reopen did not match exact saved v3 source');
    }
  } catch (error) {
    if (temporaryCreated) {
      try { fsImpl.unlinkSync(temporary); } catch { /* best-effort temporary cleanup */ }
    }
    if (error instanceof V3VenueSourceFileError) throw error;
    throw new V3VenueSourceFileError(`could not save source file ${resolved}: ${error.message}`, {
      cause: error,
    });
  }

  return Object.freeze({
    filename: resolved,
    previousDigest: opening.persistedDigest,
    persistedDigest: sourceDigest,
    created: opening.persistedDigest === V3_PERSISTED_SOURCE_ABSENT,
    bytes,
    source,
  });
}

module.exports = {
  V3_PERSISTED_SOURCE_ABSENT,
  V3_VENUE_SOURCE_FILENAME,
  V3VenueSourceFileError,
  atomicSaveV3DeploymentAgnosticVenueSourceFile,
  inspectV3DeploymentAgnosticVenueSourceFile,
  loadV3DeploymentAgnosticVenueSourceFile,
  parseV3DeploymentAgnosticVenueSourceFile,
  serializeV3DeploymentAgnosticVenueSourceFile,
};