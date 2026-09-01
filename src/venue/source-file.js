'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  createDeploymentAgnosticVenueSource,
  serializeDeploymentAgnosticVenueSource,
} = require('./source');

const DEFAULT_VENUE_SOURCE_FILENAME = 'venue-source.json';
const MAX_VENUE_SOURCE_FILE_BYTES = 1024 * 1024;

class VenueSourceFileError extends Error {
  constructor(message, options = {}) {
    super(`Venue source file invalid: ${message}`, options);
    this.name = 'VenueSourceFileError';
  }
}

function parseDeploymentAgnosticVenueSourceFile(raw) {
  const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : raw;
  if (typeof text !== 'string') {
    throw new VenueSourceFileError('source file contents must be UTF-8 text');
  }
  if (Buffer.byteLength(text, 'utf8') > MAX_VENUE_SOURCE_FILE_BYTES) {
    throw new VenueSourceFileError(
      `source file exceeds ${MAX_VENUE_SOURCE_FILE_BYTES} bytes`,
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new VenueSourceFileError('source file is not valid JSON', { cause: error });
  }

  try {
    return createDeploymentAgnosticVenueSource(parsed);
  } catch (error) {
    throw new VenueSourceFileError(error.message, { cause: error });
  }
}

function loadDeploymentAgnosticVenueSourceFile(
  filename,
  {
    statSync = fs.statSync,
    readFileSync = fs.readFileSync,
  } = {},
) {
  const resolved = path.resolve(String(filename || ''));
  let stat;
  try {
    stat = statSync(resolved);
  } catch (error) {
    throw new VenueSourceFileError(`cannot read source file ${resolved}`, { cause: error });
  }
  if (!stat.isFile()) {
    throw new VenueSourceFileError(`source path is not a regular file: ${resolved}`);
  }
  if (stat.size > MAX_VENUE_SOURCE_FILE_BYTES) {
    throw new VenueSourceFileError(
      `source file exceeds ${MAX_VENUE_SOURCE_FILE_BYTES} bytes`,
    );
  }

  let raw;
  try {
    raw = readFileSync(resolved, 'utf8');
  } catch (error) {
    throw new VenueSourceFileError(`cannot read source file ${resolved}`, { cause: error });
  }
  return parseDeploymentAgnosticVenueSourceFile(raw);
}

function serializeDeploymentAgnosticVenueSourceFile(sourceInput) {
  const text = serializeDeploymentAgnosticVenueSource(sourceInput);
  if (Buffer.byteLength(text, 'utf8') > MAX_VENUE_SOURCE_FILE_BYTES) {
    throw new VenueSourceFileError(
      `source file exceeds ${MAX_VENUE_SOURCE_FILE_BYTES} bytes`,
    );
  }
  return text;
}

module.exports = {
  DEFAULT_VENUE_SOURCE_FILENAME,
  MAX_VENUE_SOURCE_FILE_BYTES,
  VenueSourceFileError,
  loadDeploymentAgnosticVenueSourceFile,
  parseDeploymentAgnosticVenueSourceFile,
  serializeDeploymentAgnosticVenueSourceFile,
};
