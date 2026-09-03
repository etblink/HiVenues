'use strict';

const fs = require('node:fs');
const path = require('node:path');

const RELEASE_FACING_FILES = Object.freeze([
  'README.md',
  'scripts/create-venue.js',
  'scripts/open-turnkey-studio.js',
  'scripts/check-turnkey-readiness.js',
  'scripts/check-hivenues-v1-release.js',
]);
const STALE_RELEASE_NAME_PATTERN = /\b(?:Hive-Bar|Hive[ -]Venues)\b/g;

class HiVenuesNameAuditError extends Error {
  constructor(message) {
    super(`HiVenues release-name audit failed: ${message}`);
    this.name = 'HiVenuesNameAuditError';
  }
}

function auditHiVenuesReleaseNames({ root = path.resolve(__dirname, '../..'), fsImpl = fs } = {}) {
  const pkg = JSON.parse(fsImpl.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (pkg.name !== 'hivenues') throw new HiVenuesNameAuditError(`package.json name must be hivenues, found ${pkg.name}`);
  if (pkg.version !== '1.0.0') throw new HiVenuesNameAuditError(`package.json version must be 1.0.0, found ${pkg.version}`);
  if (!String(pkg.description || '').startsWith('HiVenues')) {
    throw new HiVenuesNameAuditError('package.json description must present HiVenues as the product');
  }

  for (const relative of RELEASE_FACING_FILES) {
    const filename = path.join(root, relative);
    const text = fsImpl.readFileSync(filename, 'utf8');
    const matches = [...text.matchAll(STALE_RELEASE_NAME_PATTERN)].map((match) => match[0]);
    if (matches.length) {
      throw new HiVenuesNameAuditError(`${relative} contains stale release-facing name: ${matches[0]}`);
    }
  }
  return Object.freeze({ product: 'HiVenues', version: '1.0.0', auditedFiles: RELEASE_FACING_FILES });
}

module.exports = { HiVenuesNameAuditError, RELEASE_FACING_FILES, STALE_RELEASE_NAME_PATTERN, auditHiVenuesReleaseNames };
