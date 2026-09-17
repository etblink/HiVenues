'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_TURNKEY_FILES = Object.freeze([
  'src/venue/turnkey-workspace.js',
  'src/venue/managed-assets.js',
  'src/venue/turnkey-studio.js',
  'src/venue/turnkey-readiness.js',
  'scripts/create-venue.js',
  'scripts/open-turnkey-studio.js',
  'scripts/check-turnkey-readiness.js',
  'test/turnkey-release.test.js',
]);

class TurnkeyWiringError extends Error {
  constructor(message) {
    super(`HiVenues turnkey wiring check failed: ${message}`);
    this.name = 'TurnkeyWiringError';
  }
}

function requireFile(root, relative, fsImpl) {
  const filename = path.join(root, relative);
  let stat;
  try {
    stat = fsImpl.lstatSync(filename);
  } catch {
    throw new TurnkeyWiringError(`required file missing: ${relative}`);
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new TurnkeyWiringError(`required file must be a regular file: ${relative}`);
  }
  return filename;
}

function evaluateTurnkeyWiring({ root = path.resolve(__dirname, '../..'), fsImpl = fs } = {}) {
  const pkg = JSON.parse(fsImpl.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(fsImpl.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));

  if (pkg.name !== 'hivenues') {
    throw new TurnkeyWiringError(`package.json name must be hivenues, found ${pkg.name}`);
  }
  if (lock.name !== pkg.name || lock.version !== pkg.version) {
    throw new TurnkeyWiringError('package-lock top-level name/version must match package.json');
  }
  if (lock.packages?.['']?.name !== pkg.name || lock.packages?.['']?.version !== pkg.version) {
    throw new TurnkeyWiringError('package-lock root package name/version must match package.json');
  }

  const requiredScripts = {
    'venue:create': 'node scripts/create-venue.js',
    'venue:studio': 'node scripts/open-turnkey-studio.js',
    'venue:ready': 'node scripts/check-turnkey-readiness.js',
    'check:turnkey-wiring': 'node scripts/check-turnkey-wiring.js',
  };
  for (const [name, command] of Object.entries(requiredScripts)) {
    if (pkg.scripts?.[name] !== command) {
      throw new TurnkeyWiringError(`package script ${name} is missing or unexpected`);
    }
  }

  for (const relative of REQUIRED_TURNKEY_FILES) requireFile(root, relative, fsImpl);

  const workflow = fsImpl.readFileSync(requireFile(root, '.github/workflows/ci.yml', fsImpl), 'utf8');
  if (!workflow.includes('npm run check:deterministic')) {
    throw new TurnkeyWiringError('ordinary CI must retain the deterministic quality gate');
  }
  if (!workflow.includes('npm run audit:prod:ci')) {
    throw new TurnkeyWiringError('ordinary CI must retain the bounded production dependency audit');
  }
  if (workflow.includes('UI/UX current-contract evidence') || workflow.includes('capture-issue-132-turnkey-visual.js')) {
    throw new TurnkeyWiringError('general CI must not replay superseded legacy visual qualification');
  }

  const deterministicCommand = String(pkg.scripts?.['check:deterministic'] || '');
  if (!deterministicCommand.includes('check:turnkey-wiring')) {
    throw new TurnkeyWiringError('check:deterministic must include the turnkey wiring check');
  }
  const checkCommand = String(pkg.scripts?.check || '');
  if (!checkCommand.includes('check:turnkey-wiring') && !checkCommand.includes('npm run check:deterministic')) {
    throw new TurnkeyWiringError('npm run check must include turnkey wiring directly or through check:deterministic');
  }

  const readme = fsImpl.readFileSync(path.join(root, 'README.md'), 'utf8');
  for (const command of ['npm run venue:create', 'npm run venue:studio', 'npm run venue:ready']) {
    if (!readme.includes(command)) {
      throw new TurnkeyWiringError(`README must document ${command}`);
    }
  }

  return Object.freeze({
    present: true,
    product: 'HiVenues',
    packageName: pkg.name,
    packageVersion: pkg.version,
    turnkeyFiles: REQUIRED_TURNKEY_FILES.length,
  });
}

module.exports = { TurnkeyWiringError, REQUIRED_TURNKEY_FILES, evaluateTurnkeyWiring };
