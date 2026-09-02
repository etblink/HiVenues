'use strict';

const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { composeVenueBootstrap } = require('./bootstrap');

const VENUE_ADMISSION_MODE_ENV = 'HIVE_VENUE_ADMISSION_MODE';
const VENUE_ADMISSION_MODES = Object.freeze({
  COMPATIBILITY: 'compatibility',
  EXPLICIT_BOOTSTRAP: 'explicit-bootstrap',
});
const VENUE_BOOTSTRAP_PATH_ENV = 'HIVE_VENUE_BOOTSTRAP_PATH';
const MAX_VENUE_BOOTSTRAP_BYTES = 1024 * 1024;
const MAX_BOOTSTRAP_PATH_BYTES = 4096;
const SHA40_PATTERN = /^[0-9a-f]{40}$/;

class VenueRuntimeAdmissionError extends Error {
  constructor(message, options = {}) {
    super(`Venue runtime admission failed: ${message}`, options);
    this.name = 'VenueRuntimeAdmissionError';
  }
}

function resolveVenueAdmissionMode(source = process.env) {
  const raw = String(source[VENUE_ADMISSION_MODE_ENV] || '').trim();
  if (!raw) return VENUE_ADMISSION_MODES.COMPATIBILITY;
  if (!Object.values(VENUE_ADMISSION_MODES).includes(raw)) {
    throw new VenueRuntimeAdmissionError(
      `${VENUE_ADMISSION_MODE_ENV} must be ${Object.values(VENUE_ADMISSION_MODES).join(' or ')}`,
    );
  }
  return raw;
}

function resolveVenueBootstrapPath(source = process.env) {
  const raw = String(source[VENUE_BOOTSTRAP_PATH_ENV] || '').trim();
  if (!raw) return null;
  if (raw.includes('\0') || Buffer.byteLength(raw, 'utf8') > MAX_BOOTSTRAP_PATH_BYTES) {
    throw new VenueRuntimeAdmissionError(`${VENUE_BOOTSTRAP_PATH_ENV} must be a valid filesystem path`);
  }
  if (String(source.NODE_ENV || '').trim() === 'production' && !path.isAbsolute(raw)) {
    throw new VenueRuntimeAdmissionError(`${VENUE_BOOTSTRAP_PATH_ENV} must be absolute in production`);
  }
  return path.resolve(raw);
}

function loadVenueRuntimeAdmission(
  source = process.env,
  {
    loadDotenv = source === process.env,
    readFileSync = fs.readFileSync,
    statSync = fs.statSync,
  } = {},
) {
  if (loadDotenv) dotenv.config({ quiet: true });

  const admissionMode = resolveVenueAdmissionMode(source);
  const bootstrapPath = resolveVenueBootstrapPath(source);
  if (!bootstrapPath) {
    if (admissionMode === VENUE_ADMISSION_MODES.EXPLICIT_BOOTSTRAP) {
      throw new VenueRuntimeAdmissionError(
        `${VENUE_BOOTSTRAP_PATH_ENV} is required when ${VENUE_ADMISSION_MODE_ENV}=${VENUE_ADMISSION_MODES.EXPLICIT_BOOTSTRAP}`,
      );
    }
    return null;
  }

  let stat;
  try {
    stat = statSync(bootstrapPath);
  } catch (error) {
    throw new VenueRuntimeAdmissionError(`cannot read explicit bootstrap file ${bootstrapPath}`, {
      cause: error,
    });
  }
  if (!stat.isFile()) {
    throw new VenueRuntimeAdmissionError(`explicit bootstrap source is not a regular file: ${bootstrapPath}`);
  }
  if (stat.size > MAX_VENUE_BOOTSTRAP_BYTES) {
    throw new VenueRuntimeAdmissionError(
      `explicit bootstrap source exceeds ${MAX_VENUE_BOOTSTRAP_BYTES} bytes`,
    );
  }

  let raw;
  try {
    raw = readFileSync(bootstrapPath, 'utf8');
  } catch (error) {
    throw new VenueRuntimeAdmissionError(`cannot read explicit bootstrap file ${bootstrapPath}`, {
      cause: error,
    });
  }
  if (Buffer.byteLength(raw, 'utf8') > MAX_VENUE_BOOTSTRAP_BYTES) {
    throw new VenueRuntimeAdmissionError(
      `explicit bootstrap source exceeds ${MAX_VENUE_BOOTSTRAP_BYTES} bytes`,
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new VenueRuntimeAdmissionError(`explicit bootstrap source is not valid JSON: ${bootstrapPath}`, {
      cause: error,
    });
  }

  let composition;
  try {
    composition = composeVenueBootstrap(parsed);
  } catch (error) {
    throw new VenueRuntimeAdmissionError(`explicit bootstrap source is invalid: ${error.message}`, {
      cause: error,
    });
  }

  return Object.freeze({
    mode: admissionMode,
    source: 'explicit-bootstrap-file',
    bootstrapPath,
    composition,
  });
}

function canonicalTrustProxy(value) {
  if (value === false) return 'false';
  return String(value);
}

function canonicalPosixPath(value) {
  return path.posix.normalize(String(value || '').replace(/\\/g, '/'));
}

function classifyAdmittedReleaseRoot(runtimeRoot, declaredRoot) {
  const runtime = canonicalPosixPath(runtimeRoot);
  const declared = canonicalPosixPath(declaredRoot).replace(/\/$/, '');
  if (!runtime || !declared || declared === '.') return null;
  if (runtime === `${declared}/current`) return Object.freeze({ kind: 'current', commit: null });

  const prefix = `${declared}/releases/`;
  if (!runtime.startsWith(prefix)) return null;
  const commit = runtime.slice(prefix.length);
  if (!SHA40_PATTERN.test(commit)) return null;
  return Object.freeze({ kind: 'release', commit });
}

function isAdmittedReleaseRoot(runtimeRoot, declaredRoot) {
  return classifyAdmittedReleaseRoot(runtimeRoot, declaredRoot) !== null;
}

function sameStringArray(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function currentRuntimeFacts() {
  return Object.freeze({
    nodeVersion: process.versions.node,
    platform: `${process.platform}-${process.arch}`,
  });
}

function assertVenueRuntimeCoherence(
  admission,
  config,
  {
    onboardingConfig = null,
    releaseRoot = null,
    deploymentIdentity = null,
    runtimeFacts = currentRuntimeFacts(),
  } = {},
) {
  if (!admission) return null;
  if (
    !admission.composition?.deploymentProfile ||
    !admission.composition?.venueContext ||
    !admission.composition?.venuePackage
  ) {
    throw new VenueRuntimeAdmissionError('explicit admission is missing validated bootstrap composition');
  }

  const { deploymentProfile, venueContext } = admission.composition;
  const mismatches = [];
  const expectEqual = (label, expected, actual) => {
    if (expected !== actual) mismatches.push(`${label}: deployment=${expected}; runtime=${actual}`);
  };

  expectEqual('runtime.nodeVersion', deploymentProfile.runtime.nodeVersion, runtimeFacts?.nodeVersion);
  expectEqual('runtime.platform', deploymentProfile.runtime.platform, runtimeFacts?.platform);
  expectEqual('venue.id', venueContext.id, config.venue?.id);
  expectEqual('venue.hive.communityId', venueContext.hive.communityId, config.hive.communityId);
  expectEqual(
    'venue.hive.threadsContainerAccount',
    venueContext.hive.threadsContainerAccount,
    config.hive.threadsContainerAccount,
  );
  if (!sameStringArray(venueContext.hive.paymentMerchantAccounts, config.payments.merchantAccounts)) {
    mismatches.push(
      `venue.hive.paymentMerchantAccounts: deployment=${venueContext.hive.paymentMerchantAccounts.join(',')}; runtime=${(config.payments.merchantAccounts || []).join(',')}`,
    );
  }

  expectEqual('topology.application.bindHost', deploymentProfile.topology.application.bindHost, config.server.bindHost);
  expectEqual('topology.application.port', deploymentProfile.topology.application.port, config.server.port);
  expectEqual(
    'topology.application.trustProxy',
    deploymentProfile.topology.application.trustProxy,
    canonicalTrustProxy(config.server.trustProxy),
  );
  expectEqual('release.hiveAppTag', deploymentProfile.release.hiveAppTag, config.hive.appTag);
  expectEqual('release.healthPath', deploymentProfile.release.healthPath, '/healthz');
  expectEqual('release.readinessPath', deploymentProfile.release.readinessPath, '/readyz');

  if (config.payments.enabled || config.payments.receiptDbPath !== ':memory:') {
    expectEqual(
      'storage.paymentDatabase',
      deploymentProfile.storage.paymentDatabase,
      config.payments.receiptDbPath,
    );
  }

  if (!onboardingConfig) {
    mismatches.push('storage.onboardingDatabase: onboarding runtime configuration was not supplied');
  } else if (onboardingConfig.enabled || onboardingConfig.dbPath !== ':memory:') {
    expectEqual(
      'storage.onboardingDatabase',
      deploymentProfile.storage.onboardingDatabase,
      onboardingConfig.dbPath,
    );
  }

  if (config.moderation.enabled) {
    mismatches.push(
      'moderation.storage: admitted moderation cannot be enabled until the deployment profile binds moderation storage',
    );
  }

  let appOriginHost;
  try {
    appOriginHost = new URL(config.auth.appOrigin).hostname;
  } catch {
    appOriginHost = '<invalid-app-origin>';
  }
  expectEqual('release.publicHost', deploymentProfile.release.publicHost, appOriginHost);

  if (config.isProduction) {
    const releaseBinding = classifyAdmittedReleaseRoot(releaseRoot, deploymentProfile.release.root);
    if (!releaseBinding) {
      mismatches.push(
        `release.root: deployment=${deploymentProfile.release.root}; runtime=${canonicalPosixPath(releaseRoot)}`,
      );
    } else if (
      releaseBinding.kind === 'release' &&
      deploymentIdentity?.commit &&
      deploymentIdentity.commit !== releaseBinding.commit
    ) {
      mismatches.push(
        `release.commit: directory=${releaseBinding.commit}; identity=${deploymentIdentity.commit}`,
      );
    }
    if (deploymentProfile.release.exactCommitRequired && deploymentIdentity?.exact !== true) {
      mismatches.push('release.exactCommitRequired: exact deployment identity is required');
    }
  }

  if (mismatches.length > 0) {
    throw new VenueRuntimeAdmissionError(`deployment/runtime binding mismatch: ${mismatches.join('; ')}`);
  }

  return admission;
}

module.exports = {
  MAX_VENUE_BOOTSTRAP_BYTES,
  VENUE_ADMISSION_MODE_ENV,
  VENUE_ADMISSION_MODES,
  VENUE_BOOTSTRAP_PATH_ENV,
  VenueRuntimeAdmissionError,
  assertVenueRuntimeCoherence,
  classifyAdmittedReleaseRoot,
  currentRuntimeFacts,
  isAdmittedReleaseRoot,
  loadVenueRuntimeAdmission,
  resolveVenueAdmissionMode,
  resolveVenueBootstrapPath,
};
