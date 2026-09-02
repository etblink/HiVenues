'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { readDeploymentIdentity } = require('./deployment-identity');

const SHA40_PATTERN = /^[0-9a-f]{40}$/;
const CURRENT_POINTER_FILENAME = 'current-release.rehearsal.json';
const LAST_GOOD_POINTER_FILENAME = 'last-good-release.rehearsal.json';

class NonProductionReleaseRehearsalError extends Error {
  constructor(message) {
    super(`Non-production release rehearsal failed: ${message}`);
    this.name = 'NonProductionReleaseRehearsalError';
  }
}

function requireExactIdentity(value, label = 'release identity') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new NonProductionReleaseRehearsalError(`${label} must be an object`);
  }
  const commit = String(value.commit || '').trim();
  const tree = String(value.tree || '').trim();
  if (!SHA40_PATTERN.test(commit)) {
    throw new NonProductionReleaseRehearsalError(`${label}.commit must be 40 lowercase hexadecimal characters`);
  }
  if (!SHA40_PATTERN.test(tree)) {
    throw new NonProductionReleaseRehearsalError(`${label}.tree must be 40 lowercase hexadecimal characters`);
  }
  return Object.freeze({ commit, tree });
}

function pointerPath(rootDir, filename) {
  return path.join(rootDir, filename);
}

function expectedPointerKind(filename) {
  if (filename === CURRENT_POINTER_FILENAME) return 'current';
  if (filename === LAST_GOOD_POINTER_FILENAME) return 'last-good';
  throw new NonProductionReleaseRehearsalError(`unsupported pointer filename ${filename}`);
}

function releasePath(rootDir, identity) {
  const exact = requireExactIdentity(identity);
  return path.join(rootDir, 'releases', exact.commit);
}

function stageReleaseIdentity({
  rootDir,
  identity,
  commitFilename,
  treeFilename,
}) {
  const exact = requireExactIdentity(identity);
  const target = releasePath(rootDir, exact);
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(path.join(target, commitFilename), `${exact.commit}\n`, 'utf8');
  fs.writeFileSync(path.join(target, treeFilename), `${exact.tree}\n`, 'utf8');
  return inspectReleaseIdentity({
    rootDir,
    identity: exact,
    commitFilename,
    treeFilename,
  });
}

function inspectReleaseIdentity({
  rootDir,
  identity,
  commitFilename,
  treeFilename,
}) {
  const exact = requireExactIdentity(identity);
  const target = releasePath(rootDir, exact);
  const observed = readDeploymentIdentity({
    rootDir: target,
    strict: true,
    commitFilename,
    treeFilename,
  });
  if (observed.commit !== exact.commit || observed.tree !== exact.tree || observed.exact !== true) {
    throw new NonProductionReleaseRehearsalError(
      `staged release ${exact.commit} does not match its expected exact identity`,
    );
  }
  if (path.basename(target) !== exact.commit) {
    throw new NonProductionReleaseRehearsalError(
      `release directory does not match commit identity ${exact.commit}`,
    );
  }
  return Object.freeze({
    releasePath: target,
    identity: exact,
    build: observed.build,
    exact: true,
  });
}

function atomicWriteJson(filename, value) {
  const directory = path.dirname(filename);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = path.join(
    directory,
    `.${path.basename(filename)}.${process.pid}.${Date.now()}.tmp`,
  );
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value)}\n`, 'utf8');
    fs.renameSync(temporary, filename);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

function readPointer(rootDir, filename) {
  const target = pointerPath(rootDir, filename);
  if (!fs.existsSync(target)) return null;
  const expectedKind = expectedPointerKind(filename);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    throw new NonProductionReleaseRehearsalError(
      `${filename} is not valid JSON: ${error.message}`,
    );
  }
  if (parsed.schemaVersion !== 1) {
    throw new NonProductionReleaseRehearsalError(`${filename} schemaVersion must be exactly 1`);
  }
  if (parsed.pointerKind !== expectedKind) {
    throw new NonProductionReleaseRehearsalError(
      `${filename} pointerKind must be ${expectedKind}`,
    );
  }
  const identity = requireExactIdentity(parsed.identity, `${filename}.identity`);
  const release = String(parsed.releasePath || '').trim();
  if (!release || path.resolve(release) !== path.resolve(releasePath(rootDir, identity))) {
    throw new NonProductionReleaseRehearsalError(
      `${filename} releasePath does not match its commit identity`,
    );
  }
  return Object.freeze({
    schemaVersion: 1,
    pointerKind: expectedKind,
    identity,
    releasePath: release,
  });
}

function writePointer(rootDir, filename, pointerKind, release) {
  const expectedKind = expectedPointerKind(filename);
  if (pointerKind !== expectedKind) {
    throw new NonProductionReleaseRehearsalError(
      `${filename} cannot be written with pointerKind ${pointerKind}`,
    );
  }
  atomicWriteJson(pointerPath(rootDir, filename), {
    schemaVersion: 1,
    pointerKind,
    identity: release.identity,
    releasePath: release.releasePath,
  });
  return readPointer(rootDir, filename);
}

function promoteRelease({
  rootDir,
  identity,
  commitFilename,
  treeFilename,
}) {
  const next = inspectReleaseIdentity({
    rootDir,
    identity,
    commitFilename,
    treeFilename,
  });
  const current = readPointer(rootDir, CURRENT_POINTER_FILENAME);
  if (current && current.identity.commit !== next.identity.commit) {
    inspectReleaseIdentity({
      rootDir,
      identity: current.identity,
      commitFilename,
      treeFilename,
    });
    writePointer(
      rootDir,
      LAST_GOOD_POINTER_FILENAME,
      'last-good',
      current,
    );
  }
  const promoted = writePointer(rootDir, CURRENT_POINTER_FILENAME, 'current', next);
  return Object.freeze({
    previous: current,
    current: promoted,
  });
}

function rollbackRelease({
  rootDir,
  commitFilename,
  treeFilename,
}) {
  const currentBefore = readPointer(rootDir, CURRENT_POINTER_FILENAME);
  const lastGood = readPointer(rootDir, LAST_GOOD_POINTER_FILENAME);
  if (!lastGood) {
    throw new NonProductionReleaseRehearsalError('no last-good release is available for rollback');
  }
  inspectReleaseIdentity({
    rootDir,
    identity: lastGood.identity,
    commitFilename,
    treeFilename,
  });
  const restored = writePointer(rootDir, CURRENT_POINTER_FILENAME, 'current', lastGood);
  return Object.freeze({
    currentBefore,
    restored,
  });
}

function recoveryBlockBeforeFailure(source, failureMessage) {
  const failureIndex = source.indexOf(failureMessage);
  if (failureIndex < 0) return '';
  const recoveryStartMarker = 'if [[ -n "$previous" && -d "$previous" ]]; then';
  const startIndex = source.lastIndexOf(recoveryStartMarker, failureIndex);
  if (startIndex < 0) return '';
  return source.slice(startIndex, failureIndex);
}

function hasConcretePreviousReleaseRecovery(source, failureMessage) {
  const block = recoveryBlockBeforeFailure(source, failureMessage);
  return (
    block.includes('recovery_link="$app_root/.current.recovery.$$"') &&
    block.includes('ln -s "$previous" "$recovery_link"') &&
    block.includes('mv -Tf "$recovery_link" "$current"') &&
    block.includes('systemctl restart "$service"')
  );
}

function hasConcreteReadinessGate(source) {
  return (
    source.includes("profile.release.healthPath") &&
    source.includes("profile.release.readinessPath") &&
    source.includes('manifest?.release?.healthPath') &&
    source.includes('manifest?.release?.readinessPath') &&
    source.includes("fs.existsSync(profilePath)") &&
    source.includes("applicationUrl.hostname !== '127.0.0.1'") &&
    source.includes('readiness="$(curl --fail --silent --show-error --max-time 5 "$readiness_url"') &&
    source.includes('readiness_body_is_ready "$readiness"') &&
    source.includes(']] &&\n      readiness_check; then')
  );
}

function productionInvariantCoverageFromSources(deploy, rollback) {
  return Object.freeze({
    deployExactCommitResolution:
      deploy.includes('commit did not resolve exactly') && deploy.includes('${commit}^{tree}'),
    deployStoredCommitTreeVerification:
      deploy.includes('stored release commit does not match') &&
      deploy.includes('stored release tree does not match'),
    deployAtomicCurrentSwitch:
      deploy.includes('mv -Tf "$next_link" "$current"'),
    deployPreservesLastGood:
      deploy.includes('mv -Tf "$last_good_staging" "$last_good"'),
    deployHealthBindsCommitTree:
      deploy.includes('\\"commit\\":\\"$commit\\"') &&
      deploy.includes('\\"tree\\":\\"$tree\\"') &&
      deploy.includes('post-switch health/readiness gate failed'),
    deployReadinessGateFromDeploymentProfile: hasConcreteReadinessGate(deploy),
    deployFailureRestoresPrevious: hasConcretePreviousReleaseRecovery(
      deploy,
      'post-switch health/readiness gate failed',
    ),
    rollbackExactCommitTreeVerification:
      rollback.includes('release tree identity does not match the reviewed repository'),
    rollbackAtomicCurrentSwitch:
      rollback.includes('mv -Tf "$next_link" "$current"'),
    rollbackHealthBindsCommitTree:
      rollback.includes('\\"commit\\":\\"$commit\\"') &&
      rollback.includes('\\"tree\\":\\"$tree\\"'),
    rollbackReadinessGateFromDeploymentProfile: hasConcreteReadinessGate(rollback),
    rollbackFailureRestoresPrior: hasConcretePreviousReleaseRecovery(
      rollback,
      'rollback target failed its health/readiness gate',
    ),
  });
}

function assertProductionInvariantCoverage(repositoryRoot) {
  const deployPath = path.join(repositoryRoot, 'ops', 'privex', 'bin', 'hive-bar-deploy');
  const rollbackPath = path.join(repositoryRoot, 'ops', 'privex', 'bin', 'hive-bar-rollback');
  const deploy = fs.readFileSync(deployPath, 'utf8');
  const rollback = fs.readFileSync(rollbackPath, 'utf8');
  const checks = productionInvariantCoverageFromSources(deploy, rollback);

  const missing = Object.entries(checks)
    .filter(([, pass]) => !pass)
    .map(([id]) => id);
  if (missing.length > 0) {
    throw new NonProductionReleaseRehearsalError(
      `production helper invariant cross-check failed: ${missing.join(', ')}`,
    );
  }
  return checks;
}

module.exports = {
  CURRENT_POINTER_FILENAME,
  LAST_GOOD_POINTER_FILENAME,
  NonProductionReleaseRehearsalError,
  assertProductionInvariantCoverage,
  inspectReleaseIdentity,
  productionInvariantCoverageFromSources,
  promoteRelease,
  readPointer,
  releasePath,
  requireExactIdentity,
  rollbackRelease,
  stageReleaseIdentity,
};
