'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  MAX_VENUE_SOURCE_FILE_BYTES,
} = require('../source-file');
const {
  createV2DeploymentAgnosticVenueSource,
  deriveV2DeploymentAgnosticVenueSourceDigest,
  serializeV2DeploymentAgnosticVenueSource,
} = require('./source');

const V2_VENUE_SOURCE_FILENAME = 'venue-source-v2.json';
const V2_PERSISTED_SOURCE_ABSENT = 'ABSENT';
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;

class V2VenueSourceFileError extends Error {
  constructor(message, options = {}) {
    super(`HiVenues v2 source file invalid: ${message}`, options);
    this.name = 'V2VenueSourceFileError';
  }
}

function expectedPersistedDigest(value) {
  if (value === V2_PERSISTED_SOURCE_ABSENT) return value;
  if (typeof value !== 'string' || !DIGEST_PATTERN.test(value)) {
    throw new V2VenueSourceFileError(
      'expected persisted digest must be ABSENT or a lowercase SHA-256 source digest',
    );
  }
  return value;
}

function parseV2DeploymentAgnosticVenueSourceFile(raw) {
  const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : raw;
  if (typeof text !== 'string') {
    throw new V2VenueSourceFileError('source file contents must be UTF-8 text');
  }
  if (Buffer.byteLength(text, 'utf8') > MAX_VENUE_SOURCE_FILE_BYTES) {
    throw new V2VenueSourceFileError(
      `source file exceeds ${MAX_VENUE_SOURCE_FILE_BYTES} bytes`,
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new V2VenueSourceFileError('source file is not valid JSON', { cause: error });
  }

  try {
    return createV2DeploymentAgnosticVenueSource(parsed);
  } catch (error) {
    throw new V2VenueSourceFileError(error.message, { cause: error });
  }
}

function serializeV2DeploymentAgnosticVenueSourceFile(sourceInput) {
  let text;
  try {
    text = serializeV2DeploymentAgnosticVenueSource(sourceInput);
  } catch (error) {
    throw new V2VenueSourceFileError(error.message, { cause: error });
  }
  if (Buffer.byteLength(text, 'utf8') > MAX_VENUE_SOURCE_FILE_BYTES) {
    throw new V2VenueSourceFileError(
      `source file exceeds ${MAX_VENUE_SOURCE_FILE_BYTES} bytes`,
    );
  }
  return text;
}

function regularFile(filename, stat, label) {
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new V2VenueSourceFileError(`${label} must be a regular file, not a symlink: ${filename}`);
  }
}

function regularDirectory(filename, stat, label) {
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new V2VenueSourceFileError(`${label} must be a real directory, not a symlink: ${filename}`);
  }
}

function inspectV2DeploymentAgnosticVenueSourceFile(filename, { fsImpl = fs } = {}) {
  const resolved = path.resolve(String(filename || ''));
  let stat;
  try {
    stat = fsImpl.lstatSync(resolved);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return Object.freeze({
        filename: resolved,
        exists: false,
        persistedDigest: V2_PERSISTED_SOURCE_ABSENT,
        source: null,
        bytes: null,
      });
    }
    throw new V2VenueSourceFileError(`cannot inspect source file ${resolved}`, { cause: error });
  }

  regularFile(resolved, stat, 'source file');
  if (stat.size > MAX_VENUE_SOURCE_FILE_BYTES) {
    throw new V2VenueSourceFileError(
      `source file exceeds ${MAX_VENUE_SOURCE_FILE_BYTES} bytes`,
    );
  }

  let raw;
  try {
    raw = fsImpl.readFileSync(resolved, 'utf8');
  } catch (error) {
    throw new V2VenueSourceFileError(`cannot read source file ${resolved}`, { cause: error });
  }
  const source = parseV2DeploymentAgnosticVenueSourceFile(raw);
  return Object.freeze({
    filename: resolved,
    exists: true,
    persistedDigest: deriveV2DeploymentAgnosticVenueSourceDigest(source),
    source,
    bytes: raw,
  });
}

function loadV2DeploymentAgnosticVenueSourceFile(filename, options = {}) {
  const inspected = inspectV2DeploymentAgnosticVenueSourceFile(filename, options);
  if (!inspected.exists) {
    throw new V2VenueSourceFileError(`cannot read source file ${inspected.filename}`);
  }
  return inspected.source;
}

function atomicSaveV2DeploymentAgnosticVenueSourceFile(
  filename,
  sourceInput,
  {
    expectedDigest,
    fsImpl = fs,
  } = {},
) {
  const resolved = path.resolve(String(filename || ''));
  const expected = expectedPersistedDigest(expectedDigest);
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const sourceDigest = deriveV2DeploymentAgnosticVenueSourceDigest(source);
  const bytes = serializeV2DeploymentAgnosticVenueSourceFile(source);

  const parent = path.dirname(resolved);
  let parentStat;
  try {
    parentStat = fsImpl.lstatSync(parent);
  } catch (error) {
    throw new V2VenueSourceFileError(`cannot inspect source directory ${parent}`, { cause: error });
  }
  regularDirectory(parent, parentStat, 'source directory');

  const opening = inspectV2DeploymentAgnosticVenueSourceFile(resolved, { fsImpl });
  if (opening.persistedDigest !== expected) {
    throw new V2VenueSourceFileError('persisted source changed; reload the workspace before saving');
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

    const closingGate = inspectV2DeploymentAgnosticVenueSourceFile(resolved, { fsImpl });
    if (closingGate.persistedDigest !== expected) {
      throw new V2VenueSourceFileError(
        'persisted source changed during save; refusing replacement',
      );
    }

    fsImpl.renameSync(temporary, resolved);
    temporaryCreated = false;
  } catch (error) {
    if (temporaryCreated) {
      try { fsImpl.unlinkSync(temporary); } catch { /* best-effort temporary cleanup */ }
    }
    if (error instanceof V2VenueSourceFileError) throw error;
    throw new V2VenueSourceFileError(`could not save source file ${resolved}: ${error.message}`, {
      cause: error,
    });
  }

  return Object.freeze({
    filename: resolved,
    previousDigest: opening.persistedDigest,
    persistedDigest: sourceDigest,
    created: opening.persistedDigest === V2_PERSISTED_SOURCE_ABSENT,
    bytes,
    source,
  });
}

module.exports = {
  V2_PERSISTED_SOURCE_ABSENT,
  V2_VENUE_SOURCE_FILENAME,
  V2VenueSourceFileError,
  atomicSaveV2DeploymentAgnosticVenueSourceFile,
  inspectV2DeploymentAgnosticVenueSourceFile,
  loadV2DeploymentAgnosticVenueSourceFile,
  parseV2DeploymentAgnosticVenueSourceFile,
  serializeV2DeploymentAgnosticVenueSourceFile,
};
