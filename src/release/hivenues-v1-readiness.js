'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { auditHiVenuesReleaseNames } = require('./hivenues-name-audit');

const REQUIRED_TURNKEY_FILES = Object.freeze([
  'src/venue/turnkey-workspace.js',
  'src/venue/managed-assets.js',
  'src/venue/turnkey-studio.js',
  'src/venue/turnkey-readiness.js',
  'scripts/create-venue.js',
  'scripts/open-turnkey-studio.js',
  'scripts/check-turnkey-readiness.js',
  'test/turnkey-release.test.js',
  'scripts/capture-issue-132-turnkey-visual.js',
]);

class HiVenuesV1ReadinessError extends Error {
  constructor(message) {
    super(`HiVenues v1.0.0 release readiness failed: ${message}`);
    this.name = 'HiVenuesV1ReadinessError';
  }
}

function requireFile(root, relative, fsImpl) {
  const filename = path.join(root, relative);
  let stat;
  try { stat = fsImpl.lstatSync(filename); } catch { throw new HiVenuesV1ReadinessError(`required file missing: ${relative}`); }
  if (!stat.isFile() || stat.isSymbolicLink()) throw new HiVenuesV1ReadinessError(`required file must be a regular file: ${relative}`);
  return filename;
}

function evaluateHiVenuesV1Readiness({ root = path.resolve(__dirname, '../..'), fsImpl = fs } = {}) {
  const nameAudit = auditHiVenuesReleaseNames({ root, fsImpl });
  const pkg = JSON.parse(fsImpl.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(fsImpl.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  if (lock.name !== pkg.name || lock.version !== pkg.version) {
    throw new HiVenuesV1ReadinessError('package-lock top-level name/version must match package.json');
  }
  if (lock.packages?.['']?.name !== pkg.name || lock.packages?.['']?.version !== pkg.version) {
    throw new HiVenuesV1ReadinessError('package-lock root package name/version must match package.json');
  }
  const requiredScripts = {
    'venue:create': 'node scripts/create-venue.js',
    'venue:studio': 'node scripts/open-turnkey-studio.js',
    'venue:ready': 'node scripts/check-turnkey-readiness.js',
    'release:check:hivenues-v1': 'node scripts/check-hivenues-v1-release.js',
    'release:check:name': 'node scripts/check-hivenues-name.js',
  };
  for (const [name, command] of Object.entries(requiredScripts)) {
    if (pkg.scripts?.[name] !== command) throw new HiVenuesV1ReadinessError(`package script ${name} is missing or unexpected`);
  }
  for (const relative of REQUIRED_TURNKEY_FILES) requireFile(root, relative, fsImpl);
  const workflow = fsImpl.readFileSync(requireFile(root, '.github/workflows/ci.yml', fsImpl), 'utf8');
  if (!workflow.includes('node scripts/capture-issue-132-turnkey-visual.js')) {
    throw new HiVenuesV1ReadinessError('ordinary CI must capture Issue #132 turnkey visual evidence');
  }
  if (!workflow.includes('test/turnkey-release.test.js')) {
    throw new HiVenuesV1ReadinessError('CI visual scope must recognize the turnkey integration oracle');
  }
  if (!String(pkg.scripts?.check || '').includes('release:check:hivenues-v1')) {
    throw new HiVenuesV1ReadinessError('npm run check must include the HiVenues v1 release oracle');
  }
  if (pkg.scripts?.['release:check:v1'] !== 'node scripts/check-v1-release.js') {
    throw new HiVenuesV1ReadinessError('historical Fourth Street release:check:v1 command must remain separately scoped');
  }

  const historicalGate = fsImpl.readFileSync(requireFile(root, 'src/release/v1-readiness.js', fsImpl), 'utf8');
  if (!historicalGate.includes('HIVE_BAR_HOST')) {
    throw new HiVenuesV1ReadinessError('historical Fourth Street reference release gate is no longer intact/scoped');
  }
  const readme = fsImpl.readFileSync(path.join(root, 'README.md'), 'utf8');
  for (const command of ['npm run venue:create', 'npm run venue:studio', 'npm run venue:ready']) {
    if (!readme.includes(command)) throw new HiVenuesV1ReadinessError(`README must document ${command}`);
  }
  return Object.freeze({
    ready: true,
    product: nameAudit.product,
    version: pkg.version,
    packageName: pkg.name,
    historicalReferenceGatePreserved: true,
    turnkeyFiles: REQUIRED_TURNKEY_FILES.length,
  });
}

module.exports = { HiVenuesV1ReadinessError, REQUIRED_TURNKEY_FILES, evaluateHiVenuesV1Readiness };
