'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  buildPublicRuntimeBundle,
  canonicalRuntimeFileBytes,
} = require('../../scripts/era7/build-public-runtime-bundle');
const {
  ExactReleaseDeploymentCoordinator,
  desiredReadBack,
  readBackArtifactsMatch,
  readBackMatches,
  readBackMismatchFields,
} = require('../deploy/deployment-coordinator');
const { loadRuntimeProvenance } = require('../deploy/public-runtime');
const { createReferenceBootstrapPlan } = require('../deploy/bootstrap-plan');
const { loadReleasePackage } = require('../deploy/release-store');
const { SshRemoteDeploymentTarget } = require('../deploy/ssh-remote-deployment-target');
const {
  markTlsRequesting,
  prepareStage4PublicationReview,
  recordDnsObservation,
  recordPublicReadBack,
  recordTlsObservation,
} = require('./deployment-publication');
const { NodePublicationObserver } = require('./deployment-publication-observer');
const { stableDigest } = require('./model');

const MUTATION_STATES = new Set([
  'bootstrap-ready',
  'deploying',
  'healthy',
  'rollback-available',
  'degraded',
]);

const CONSEQUENCES = Object.freeze([
  'upload-qualified-public-runtime',
  'upload-exact-immutable-release',
  'bootstrap-or-update-bounded-hivenues-runtime',
  'configure-named-systemd-caddy-firewall-services',
  'prove-restricted-hivenues-deploy-login',
  'remove-exact-bootstrap-authorized-key',
  'verify-exact-runtime-release-health-readback',
]);

const HELD = Object.freeze([
  'provider-payment',
  'custom-domain',
  'dns-mutation',
  'tls-issuance',
]);

const RECOVERY_CONSEQUENCES = Object.freeze([
  'reprove-exact-cached-runtime-and-release-through-restricted-account',
  'remove-exact-bootstrap-authorized-key-if-still-present',
  'persist-restricted-deployment-user-authority',
  'verify-exact-runtime-release-health-after-authority-narrowing',
  'adopt-proven-runtime-release-into-local-deployment-state',
]);

const RECOVERY_HELD = Object.freeze([
  'runtime-upload',
  'release-upload',
  'package-install',
  'service-restart-or-activation',
  'caddy-or-firewall-rewrite',
  'provider-payment',
  'custom-domain',
  'dns-mutation',
  'tls-issuance',
]);

const PUBLICATION_MIGRATION_CONSEQUENCES = Object.freeze([
  'temporarily-use-owner-restored-bootstrap-key',
  'install-root-owned-publication-helper',
  'install-root-owned-publication-metadata',
  'prepare-caddy-certificate-state-directory',
  'update-hivenues-caddy-and-firewall-service-units-without-restarting-them',
  'add-helper-only-restricted-sudo-authority',
  'prove-restricted-publication-helper-status',
  'remove-the-exact-temporary-bootstrap-key-again',
  'reprove-unchanged-runtime-and-immutable-release',
]);

const PUBLICATION_DNS_MAX_AGE_MS = 10 * 60 * 1000;

const ROLLBACK_CONSEQUENCES = Object.freeze([
  'activate-only-the-already-installed-exact-previous-release',
  'preserve-the-qualified-runtime-without-upload-or-replacement',
  'restart-only-the-dedicated-hivenues-host-service',
  'reprove-exact-runtime-and-rollback-release-readback',
  'invalidate-stale-public-release-proof-until-https-is-reverified',
]);

const ROLLBACK_HELD = Object.freeze([
  'runtime-upload-or-replacement',
  'release-upload',
  'bootstrap-or-root-authority',
  'dns-mutation',
  'caddy-or-firewall-reconfiguration',
  'tls-issuance',
  'provider-payment',
  'hive-writes',
  'value-movement',
]);

const DISCONNECT_CONSEQUENCES = Object.freeze([
  'remove-only-the-exact-hivenues-deployment-public-key-from-the-steady-server-account',
  'prove-a-new-authentication-attempt-with-that-authority-fails',
  'revoke-the-local-protected-deployment-private-key',
  'mark-the-local-deployment-record-disconnected',
  'preserve-the-running-site-hostgraph-and-immutable-release-history',
]);

const DISCONNECT_HELD = Object.freeze([
  'stop-or-delete-the-running-site',
  'runtime-or-release-change',
  'dns-mutation',
  'caddy-firewall-or-tls-reconfiguration',
  'provider-payment',
  'hive-writes',
  'value-movement',
]);

const PUBLICATION_MIGRATION_HELD = Object.freeze([
  'runtime-redeploy-or-replacement',
  'release-redeploy-or-change',
  'hostname-publication',
  'dns-mutation',
  'open-tcp-443',
  'caddy-publication-apply',
  'tls-issuance',
  'provider-payment',
  'hive-writes',
  'value-movement',
]);

function executionError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function requireBuildProvenance(value) {
  const provenance = value && typeof value === 'object' ? value : {};
  if (
    !/^[a-f0-9]{40}$/i.test(String(provenance.sourceSha || ''))
    || !/^[a-f0-9]{40}$/i.test(String(provenance.sourceTree || ''))
    || !/^v24\./.test(String(provenance.nodeVersion || ''))
    || !String(provenance.packageVersion || '').trim()
  ) {
    throw executionError(
      'DEPLOYMENT_INSTALLED_PROVENANCE_INVALID',
      'Installed HiVenues provenance is incomplete for deployment.',
    );
  }
  return Object.freeze({
    sourceSha: String(provenance.sourceSha).toLowerCase(),
    sourceTree: String(provenance.sourceTree).toLowerCase(),
    nodeVersion: String(provenance.nodeVersion),
    packageVersion: String(provenance.packageVersion),
  });
}

function readRuntimeBundle(root) {
  return loadRuntimeProvenance(
    path.join(root, 'runtime-provenance.json'),
    path.join(root, 'runtime-manifest.json'),
  );
}

function sameRuntimeProvenance(actual, expected) {
  return Boolean(
    actual
    && actual.sourceSha === expected.sourceSha
    && actual.sourceTree === expected.sourceTree
    && actual.nodeVersion === expected.nodeVersion
    && actual.packageVersion === expected.packageVersion
  );
}

function materializeInstalledRuntimeBundle({
  runtimeBundlesRoot,
  buildProvenance,
  runtimeBuilder = buildPublicRuntimeBundle,
} = {}) {
  if (!runtimeBundlesRoot) {
    throw new TypeError('Installed deployment composition requires a runtime bundle root.');
  }
  const provenance = requireBuildProvenance(buildProvenance);
  const identity = stableDigest(provenance).slice(0, 24);
  const root = path.join(path.resolve(runtimeBundlesRoot), 'runtime-' + identity);

  if (fs.existsSync(root)) {
    const existing = readRuntimeBundle(root);
    if (!sameRuntimeProvenance(existing, provenance)) {
      throw executionError(
        'DEPLOYMENT_RUNTIME_BUNDLE_PROVENANCE_MISMATCH',
        'Cached public runtime does not match the installed HiVenues build.',
      );
    }
    return Object.freeze({ root, provenance: existing, reused: true });
  }

  fs.mkdirSync(path.dirname(root), { recursive: true });
  const temporary = root + '.tmp-' + process.pid + '-' + crypto.randomBytes(6).toString('hex');
  try {
    runtimeBuilder({
      outputRoot: temporary,
      sourceSha: provenance.sourceSha,
      sourceTree: provenance.sourceTree,
      nodeVersion: provenance.nodeVersion,
    });
    const built = readRuntimeBundle(temporary);
    if (!sameRuntimeProvenance(built, provenance)) {
      throw executionError(
        'DEPLOYMENT_RUNTIME_BUNDLE_PROVENANCE_MISMATCH',
        'Generated public runtime does not match the installed HiVenues build.',
      );
    }
    fs.renameSync(temporary, root);
    return Object.freeze({ root, provenance: built, reused: false });
  } catch (error) {
    fs.rmSync(temporary, { recursive: true, force: true });
    throw error;
  }
}

function sameExactRuntime(actual, expected) {
  return Boolean(
    actual
    && expected
    && actual.sourceSha === expected.sourceSha
    && actual.sourceTree === expected.sourceTree
    && actual.packageVersion === expected.packageVersion
    && actual.nodeVersion === expected.nodeVersion
    && actual.bundleDigest === expected.bundleDigest
  );
}

function findCachedRuntimeBundle(runtimeBundlesRoot, expected) {
  if (!expected || !fs.existsSync(runtimeBundlesRoot)) return null;
  for (const name of fs.readdirSync(runtimeBundlesRoot)) {
    if (!name.startsWith('runtime-')) continue;
    const root = path.join(runtimeBundlesRoot, name);
    let provenance;
    try {
      provenance = readRuntimeBundle(root);
    } catch {
      continue;
    }
    if (sameExactRuntime(provenance, expected)) {
      return Object.freeze({ root, provenance, reused: true });
    }
  }
  return null;
}

function sameReadBackArtifacts(left, right) {
  return Boolean(
    left
    && right
    && left.status === 'healthy'
    && right.status === 'healthy'
    && sameExactRuntime(left.runtime, right.runtime)
    && left.deployment?.hostSlug === right.deployment?.hostSlug
    && left.deployment?.releaseId === right.deployment?.releaseId
    && left.deployment?.releaseDigest === right.deployment?.releaseDigest
    && left.deployment?.packageDigest === right.deployment?.packageDigest
  );
}

function requireRemoteRecord(record) {
  if (!record) {
    throw executionError('DEPLOYMENT_NOT_FOUND', 'Deployment target was not found.');
  }
  if (record.providerKind !== 'ssh-server') {
    throw executionError(
      'DEPLOYMENT_TARGET_KIND_INVALID',
      'Remote deployment consequence review requires a verified server target.',
    );
  }
  if (!MUTATION_STATES.has(record.state)) {
    throw executionError(
      'DEPLOYMENT_MUTATION_STATE_INVALID',
      'Server target is not ready for an exact Release deployment review.',
    );
  }
  if (!record.authorityRef) {
    throw executionError(
      'DEPLOYMENT_AUTHORITY_REQUIRED',
      'Server target has no protected deployment authority.',
    );
  }
  if (!record.selectedRelease || !record.package) {
    throw executionError(
      'DEPLOYMENT_RELEASE_REQUIRED',
      'Choose and package an immutable Release before server deployment.',
    );
  }

  const facts = record.targetPublicFacts || {};
  if (
    !String(facts.host || '').trim()
    || !String(facts.username || '').trim()
    || !Number.isInteger(Number(facts.port || 22))
    || !String(facts.trustedHostKeyFingerprint || '').trim()
    || facts.hostKeyTrustState !== 'trusted'
  ) {
    throw executionError(
      'DEPLOYMENT_TARGET_NOT_TRUSTED',
      'Server target must have complete public facts and an explicitly trusted SSH host fingerprint.',
    );
  }
  if (!record.activeRelease && facts.verifiedDedicatedTarget !== true) {
    throw executionError(
      'DEPLOYMENT_TARGET_NOT_DEDICATED',
      'First bootstrap requires a read-only verified dedicated target with no unrelated public listener or service conflict.',
    );
  }
  return record;
}

function exactPackage(packageBuilder, record) {
  const prepared = packageBuilder.build({
    hostSlug: record.hostSlug,
    releaseId: record.selectedRelease.id,
  });
  if (
    prepared.releaseId !== record.selectedRelease.id
    || prepared.releaseDigest !== record.selectedRelease.digest
    || prepared.releaseId !== record.package.releaseId
    || prepared.releaseDigest !== record.package.releaseDigest
    || prepared.packageDigest !== record.package.packageDigest
  ) {
    throw executionError(
      'DEPLOYMENT_PACKAGE_STALE',
      'Prepared deployment package no longer matches the exact selected Release.',
    );
  }
  return prepared;
}

function activeReadBackExpectation(record) {
  if (!record?.activeRelease || !record?.runtimeProfile) {
    throw executionError(
      'DEPLOYMENT_PUBLICATION_ACTIVE_DEPLOYMENT_REQUIRED',
      'Publication capability migration requires a confirmed active runtime and Release.',
    );
  }
  return Object.freeze({
    runtime: Object.freeze({
      sourceSha: record.runtimeProfile.sourceSha,
      sourceTree: record.runtimeProfile.sourceTree,
      packageVersion: record.runtimeProfile.packageVersion,
      nodeVersion: record.runtimeProfile.nodeVersion,
      bundleDigest: record.runtimeProfile.bundleDigest,
    }),
    deployment: Object.freeze({
      hostSlug: record.hostSlug,
      releaseId: record.activeRelease.id,
      releaseDigest: record.activeRelease.digest,
      packageDigest: record.activeRelease.packageDigest,
    }),
  });
}

function publicationReviewIdentity(record) {
  const facts = record?.targetPublicFacts || {};
  return Object.freeze({
    deploymentId: String(record?.id || ''),
    state: String(record?.state || ''),
    authorityRef: String(record?.authorityRef || ''),
    target: Object.freeze({
      host: String(facts.host || ''),
      port: Number(facts.port || 22),
      username: String(facts.username || ''),
      bootstrapUsername: String(facts.bootstrapUsername || ''),
      trustedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint || ''),
      hostKeyTrustState: String(facts.hostKeyTrustState || ''),
    }),
    activeRelease: record?.activeRelease ? Object.freeze({ ...record.activeRelease }) : null,
    runtimeProfile: record?.runtimeProfile ? Object.freeze({ ...record.runtimeProfile }) : null,
    publicEndpoint: record?.publicEndpoint
      ? JSON.parse(JSON.stringify(record.publicEndpoint))
      : null,
  });
}

function publicationReviewStateDigest(record) {
  return stableDigest(publicationReviewIdentity(record));
}

function rollbackReviewIdentity(record) {
  const facts = record?.targetPublicFacts || {};
  return Object.freeze({
    deploymentId: String(record?.id || ''),
    state: String(record?.state || ''),
    stateReason: String(record?.stateReason || ''),
    authorityRef: String(record?.authorityRef || ''),
    target: Object.freeze({
      host: String(facts.host || ''),
      port: Number(facts.port || 22),
      username: String(facts.username || ''),
      bootstrapUsername: String(facts.bootstrapUsername || ''),
      trustedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint || ''),
    }),
    activeRelease: record?.activeRelease ? Object.freeze({ ...record.activeRelease }) : null,
    previousRelease: record?.previousRelease ? Object.freeze({ ...record.previousRelease }) : null,
    runtimeProfile: record?.runtimeProfile ? Object.freeze({ ...record.runtimeProfile }) : null,
    publicEndpoint: record?.publicEndpoint
      ? JSON.parse(JSON.stringify(record.publicEndpoint))
      : null,
  });
}

function rollbackReviewStateDigest(record) {
  return stableDigest(rollbackReviewIdentity(record));
}

function releaseReadBackExpectation(record, release) {
  if (!record?.runtimeProfile || !release) {
    throw executionError(
      'DEPLOYMENT_ROLLBACK_UNAVAILABLE',
      'Rollback requires an exact preserved runtime and previous Release.',
    );
  }
  return Object.freeze({
    runtime: Object.freeze({
      sourceSha: record.runtimeProfile.sourceSha,
      sourceTree: record.runtimeProfile.sourceTree,
      packageVersion: record.runtimeProfile.packageVersion,
      nodeVersion: record.runtimeProfile.nodeVersion,
      bundleDigest: record.runtimeProfile.bundleDigest,
    }),
    deployment: Object.freeze({
      hostSlug: record.hostSlug,
      releaseId: release.id,
      releaseDigest: release.digest,
      packageDigest: release.packageDigest,
    }),
  });
}

function disconnectRemovalStarted(record) {
  return (
    record?.state === 'degraded'
    && record?.stateReason === 'authority-disconnect-removal-started'
    && ['removal-started', 'remote-removed'].includes(
      String(record?.targetPublicFacts?.authorityDisconnectState || ''),
    )
  );
}

function disconnectRecoveryMarked(record) {
  return (
    disconnectRemovalStarted(record)
    && record?.targetPublicFacts?.authorityDisconnectState === 'remote-removed'
  );
}

function publicationHelperArtifact() {
  const filePath = path.resolve(__dirname, '../deploy/publication-helper-runtime.js');
  const content = canonicalRuntimeFileBytes(
    'src/deploy/publication-helper-runtime.js',
    fs.readFileSync(filePath),
  );
  return Object.freeze({
    filePath,
    content,
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
  });
}

class InstalledRemoteDeploymentService {
  constructor({
    deploymentStore,
    packageBuilder,
    authorityStore,
    runtimeBundlesRoot,
    buildProvenance,
    runtimeBuilder = buildPublicRuntimeBundle,
    targetFactory = (options) => new SshRemoteDeploymentTarget(options),
    publicationObserver = null,
    now = Date.now,
  } = {}) {
    if (!deploymentStore) throw new TypeError('Installed remote deployment requires a deployment store.');
    if (!packageBuilder || typeof packageBuilder.build !== 'function') {
      throw new TypeError('Installed remote deployment requires a package builder.');
    }
    if (!authorityStore) throw new TypeError('Installed remote deployment requires an authority store.');
    if (!runtimeBundlesRoot) throw new TypeError('Installed remote deployment requires a runtime bundle root.');
    if (typeof targetFactory !== 'function') throw new TypeError('Installed remote deployment requires a target factory.');

    this.deploymentStore = deploymentStore;
    this.packageBuilder = packageBuilder;
    this.authorityStore = authorityStore;
    this.runtimeBundlesRoot = path.resolve(runtimeBundlesRoot);
    this.buildProvenance = requireBuildProvenance(buildProvenance);
    this.runtimeBuilder = runtimeBuilder;
    this.targetFactory = targetFactory;
    this.now = now;
    this.publicationObserver = publicationObserver || new NodePublicationObserver({ now });
  }

  artifacts(deploymentId) {
    const record = requireRemoteRecord(this.deploymentStore.get(deploymentId));
    let runtime = null;
    if (record.pendingRuntimeProfile) {
      runtime = findCachedRuntimeBundle(
        this.runtimeBundlesRoot,
        record.pendingRuntimeProfile,
      );
      if (!runtime) {
        throw executionError(
          'DEPLOYMENT_PENDING_RUNTIME_BUNDLE_MISSING',
          'The exact pending runtime bundle is not available in the preserved local cache.',
        );
      }
    } else {
      runtime = materializeInstalledRuntimeBundle({
        runtimeBundlesRoot: this.runtimeBundlesRoot,
        buildProvenance: this.buildProvenance,
        runtimeBuilder: this.runtimeBuilder,
      });
    }
    const releasePackage = exactPackage(this.packageBuilder, record);
    return Object.freeze({ record, runtime, releasePackage });
  }

  inspectReadBack(deploymentId) {
    const { record, runtime, releasePackage } = this.artifacts(deploymentId);
    const facts = record.targetPublicFacts;
    const release = loadReleasePackage(path.resolve(releasePackage.packagePath)).manifest;
    const expected = desiredReadBack(runtime.provenance, release);
    const targetOptions = (username) => ({
      authorityStore: this.authorityStore,
      authorityId: record.authorityRef,
      target: {
        host: String(facts.host),
        port: Number(facts.port || 22),
        username,
      },
      bootstrapUsername: String(facts.bootstrapUsername || facts.username),
      expectedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint),
      hostSlug: record.hostSlug,
    });
    const providerUsername = String(facts.username);
    const plan = createReferenceBootstrapPlan({
      runtimeProvenance: runtime.provenance,
      releaseManifest: release,
      bootstrapUsername: String(facts.bootstrapUsername || facts.username),
    });
    const deploymentUsername = plan.deploymentUser;
    const providerTarget = this.targetFactory(targetOptions(providerUsername));

    return Promise.resolve(providerTarget.readBack()).then(async (actual) => {
      let restrictedActual = null;
      if (deploymentUsername !== providerUsername) {
        const restrictedTarget = this.targetFactory(targetOptions(deploymentUsername));
        restrictedActual = await restrictedTarget.readBack();
      } else {
        restrictedActual = actual;
      }

      const observed = restrictedActual || actual;
      const cachedRuntime = observed?.runtime
        ? findCachedRuntimeBundle(this.runtimeBundlesRoot, observed.runtime)
        : null;
      const releaseMatches = Boolean(
        observed
        && observed.status === 'healthy'
        && observed.deployment?.hostSlug === expected.deployment.hostSlug
        && observed.deployment?.releaseId === expected.deployment.releaseId
        && observed.deployment?.releaseDigest === expected.deployment.releaseDigest
        && observed.deployment?.packageDigest === expected.deployment.packageDigest
      );
      const restrictedAuthorityState = String(
        restrictedActual?.bootstrap?.authorityState || '',
      );
      const restrictedMatchesObserved = Boolean(
        actual && restrictedActual && sameReadBackArtifacts(actual, restrictedActual)
      );
      const providerConsistency = Boolean(
        restrictedMatchesObserved
        || (
          !actual
          && restrictedActual
          && restrictedAuthorityState === 'restricted-deployment-user'
        )
      );
      const recoverable = Boolean(
        observed
        && observed.status === 'healthy'
        && cachedRuntime
        && releaseMatches
        && restrictedActual
        && providerConsistency
        && ['restricted-login-proven', 'restricted-deployment-user'].includes(
          restrictedAuthorityState,
        )
      );

      return Object.freeze({
        deploymentId: record.id,
        target: Object.freeze({
          host: String(facts.host),
          port: Number(facts.port || 22),
          username: providerUsername,
          trustedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint),
        }),
        expected: Object.freeze({
          status: 'healthy',
          runtime: Object.freeze({ ...expected.runtime }),
          deployment: Object.freeze({ ...expected.deployment }),
        }),
        actual: actual
          ? Object.freeze({
              status: actual.status,
              runtime: Object.freeze({ ...(actual.runtime || {}) }),
              deployment: Object.freeze({ ...(actual.deployment || {}) }),
              bootstrap: Object.freeze({ ...(actual.bootstrap || {}) }),
            })
          : null,
        mismatches: readBackMismatchFields(actual, expected),
        matches: readBackMismatchFields(actual, expected).length === 0,
        recovery: Object.freeze({
          providerUsername,
          deploymentUsername,
          restrictedActual: restrictedActual
            ? Object.freeze({
                status: restrictedActual.status,
                runtime: Object.freeze({ ...(restrictedActual.runtime || {}) }),
                deployment: Object.freeze({ ...(restrictedActual.deployment || {}) }),
                bootstrap: Object.freeze({ ...(restrictedActual.bootstrap || {}) }),
              })
            : null,
          cachedRuntimeMatch: Boolean(cachedRuntime),
          cachedRuntime: cachedRuntime
            ? Object.freeze({
                root: cachedRuntime.root,
                provenance: Object.freeze({ ...cachedRuntime.provenance }),
              })
            : null,
          releaseMatches,
          restrictedMatchesObserved,
          providerConsistency,
          restrictedAuthorityState,
          recoverable,
        }),
      });
    });
  }

  async inspectPublicationCapability(deploymentId) {
    const record = requireRemoteRecord(this.deploymentStore.get(deploymentId));
    if (!record.activeRelease || !record.runtimeProfile) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_ACTIVE_DEPLOYMENT_REQUIRED',
        'Publication capability inspection requires a confirmed active runtime and Release.',
      );
    }
    const facts = record.targetPublicFacts || {};
    const bootstrapUsername = String(facts.bootstrapUsername || facts.username);
    const plan = createReferenceBootstrapPlan({
      runtimeProvenance: record.runtimeProfile,
      releaseManifest: {
        hostSlug: record.hostSlug,
        releaseId: record.activeRelease.id,
        releaseDigest: record.activeRelease.digest,
        packageDigest: record.activeRelease.packageDigest,
      },
      bootstrapUsername,
    });
    const target = this.targetFactory({
      authorityStore: this.authorityStore,
      authorityId: record.authorityRef,
      target: {
        host: String(facts.host),
        port: Number(facts.port || 22),
        username: String(facts.username),
      },
      bootstrapUsername,
      expectedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint),
      hostSlug: record.hostSlug,
    });
    if (!target || typeof target.publicationStatus !== 'function') {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_CAPABILITY_UNAVAILABLE',
        'Publication capability inspection is unavailable in this runtime.',
      );
    }
    let result;
    let publicationStatusError = null;
    try {
      result = await target.publicationStatus(plan);
    } catch (error) {
      if (
        error?.code !== 'DEPLOYMENT_PUBLICATION_STATUS_FAILED'
        && error?.code !== 'DEPLOYMENT_PUBLICATION_STATUS_INVALID'
      ) throw error;
      publicationStatusError = error;
      result = null;
    }
    let bootstrapAuthorityAccessible = null;
    if (
      bootstrapUsername
      && bootstrapUsername !== String(facts.username)
      && typeof target.bootstrapAuthorityAccessible === 'function'
    ) {
      bootstrapAuthorityAccessible = await target.bootstrapAuthorityAccessible(plan);
    }
    if (publicationStatusError) {
      if (
        bootstrapAuthorityAccessible === true
        && typeof target.publicationMigrationRecoveryEvidence === 'function'
      ) {
        const recoveryEvidence = await target.publicationMigrationRecoveryEvidence(plan);
        if (recoveryEvidence.eligible === true) {
          return Object.freeze({
            deploymentId: record.id,
            hostSlug: record.hostSlug,
            capability: 'migration-incomplete',
            reason: String(publicationStatusError.code),
            bootstrapAuthorityAccessible: true,
            migrationRecoveryEvidence: recoveryEvidence,
          });
        }
        throw executionError(
          'DEPLOYMENT_PUBLICATION_MIGRATION_RECOVERY_UNSAFE',
          'Publication helper status failed, but the server no longer proves the unpublished Stage-3 baseline required for migration recovery.',
        );
      }
      throw publicationStatusError;
    }
    let exactDeploymentMatches = null;
    if (
      result?.capability === 'ready'
      && typeof target.readBack === 'function'
    ) {
      const actual = await target.readBack();
      exactDeploymentMatches = readBackMatches(
        actual,
        activeReadBackExpectation(record),
      );
    }
    return Object.freeze({
      deploymentId: record.id,
      hostSlug: record.hostSlug,
      ...result,
      ...(bootstrapAuthorityAccessible === null
        ? {}
        : { bootstrapAuthorityAccessible }),
      ...(exactDeploymentMatches === null
        ? {}
        : { exactDeploymentMatches }),
    });
  }

  async checkDns(deploymentId) {
    const record = requireRemoteRecord(this.deploymentStore.get(deploymentId));
    if (!record.publicEndpoint) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_DOMAIN_PLAN_REQUIRED',
        'Prepare a domain plan before checking DNS.',
      );
    }
    const checkedEndpoint = record.publicEndpoint;
    const observation = await this.publicationObserver.observeDns(checkedEndpoint);
    const endpoint = recordDnsObservation(checkedEndpoint, observation);
    this.deploymentStore.setPublicEndpointIfUnchanged(
      record.id,
      checkedEndpoint,
      endpoint,
    );
    return endpoint;
  }

  async prepareHostnamePublicationReview(deploymentId) {
    const record = requireRemoteRecord(this.deploymentStore.get(deploymentId));
    if (!record.publicEndpoint) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_DOMAIN_PLAN_REQUIRED',
        'Prepare a domain plan before reviewing hostname publication.',
      );
    }
    if (
      record.publicEndpoint.domainState !== 'dns-confirmed'
      || record.publicEndpoint.dns?.observation?.matches !== true
    ) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_DNS_REQUIRED',
        'The exact prepared DNS records must be confirmed before live hostname review.',
      );
    }
    const checkedAt = Date.parse(String(record.publicEndpoint.dns.observation.checkedAt || ''));
    const now = Number(this.now());
    if (
      !Number.isFinite(checkedAt)
      || !Number.isFinite(now)
      || checkedAt > now + 2 * 60 * 1000
      || now - checkedAt > PUBLICATION_DNS_MAX_AGE_MS
    ) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_DNS_STALE',
        'Check DNS again before reviewing the live hostname publication.',
      );
    }
    const stateDigest = publicationReviewStateDigest(record);
    const publication = await this.inspectPublicationCapability(deploymentId);
    const latest = requireRemoteRecord(this.deploymentStore.get(deploymentId));
    if (publicationReviewStateDigest(latest) !== stateDigest) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_REVIEW_STALE',
        'Deployment or domain facts changed while the publication review was being prepared. Review the current state again.',
      );
    }
    const review = prepareStage4PublicationReview({
      preflight: record.publicEndpoint,
      deployment: record,
      publication,
    });
    const facts = record.targetPublicFacts || {};
    const core = {
      stateDigest,
      ...review,
      target: Object.freeze({
        host: String(facts.host || ''),
        port: Number(facts.port || 22),
        username: String(facts.username || ''),
        trustedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint || ''),
      }),
      runtime: Object.freeze({ ...record.runtimeProfile }),
      release: Object.freeze({
        hostSlug: record.hostSlug,
        releaseId: record.activeRelease.id,
        releaseDigest: record.activeRelease.digest,
        packageDigest: record.activeRelease.packageDigest,
      }),
    };
    return Object.freeze({
      ...core,
      reviewDigest: stableDigest(core),
    });
  }

  async publishHostname(deploymentId, {
    reviewDigest,
    confirmation,
  } = {}) {
    if (confirmation !== 'publish-reviewed-hostname') {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_CONFIRMATION_REQUIRED',
        'Explicit hostname publication confirmation is required.',
      );
    }
    const submitted = String(reviewDigest || '').trim().toLowerCase();
    const review = await this.prepareHostnamePublicationReview(deploymentId);
    if (!/^[a-f0-9]{64}$/.test(submitted) || submitted !== review.reviewDigest) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_REVIEW_STALE',
        'Hostname publication facts changed after review. Review the consequence again.',
      );
    }

    const record = requireRemoteRecord(this.deploymentStore.get(deploymentId));
    if (publicationReviewStateDigest(record) !== review.stateDigest) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_REVIEW_STALE',
        'Deployment or domain facts changed after publication review. Review the current state again.',
      );
    }
    const endpointBeforePublication = record.publicEndpoint;
    const facts = record.targetPublicFacts || {};
    const plan = createReferenceBootstrapPlan({
      runtimeProvenance: record.runtimeProfile,
      releaseManifest: {
        hostSlug: record.hostSlug,
        releaseId: record.activeRelease.id,
        releaseDigest: record.activeRelease.digest,
        packageDigest: record.activeRelease.packageDigest,
      },
      bootstrapUsername: String(facts.bootstrapUsername || facts.username),
    });
    const target = this.targetFactory({
      authorityStore: this.authorityStore,
      authorityId: record.authorityRef,
      target: {
        host: String(facts.host),
        port: Number(facts.port || 22),
        username: String(facts.username),
      },
      bootstrapUsername: String(facts.bootstrapUsername || facts.username),
      expectedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint),
      hostSlug: record.hostSlug,
    });
    if (
      !target
      || typeof target.applyPublication !== 'function'
      || typeof target.publicationStatus !== 'function'
      || typeof target.readBack !== 'function'
    ) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_APPLY_UNAVAILABLE',
        'Restricted hostname publication is unavailable in this runtime.',
      );
    }

    if (!review.alreadyApplied) {
      const applied = await target.applyPublication(plan, review.hostname);
      if (
        applied.capability !== 'ready'
        || applied.status?.state !== 'configured'
        || applied.status?.hostname !== review.hostname
      ) {
        throw executionError(
          'DEPLOYMENT_PUBLICATION_APPLY_FAILED',
          'The restricted publication helper did not confirm the exact reviewed hostname.',
        );
      }
    }

    const exactReadBack = await target.readBack();
    if (!readBackMatches(exactReadBack, {
      runtime: review.runtime,
      deployment: review.release,
    })) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_READBACK_CHANGED',
        'The active runtime or immutable Release changed during hostname publication.',
      );
    }
    const confirmedPublication = await target.publicationStatus(plan);
    if (
      confirmedPublication.capability !== 'ready'
      || confirmedPublication.status?.state !== 'configured'
      || confirmedPublication.status?.hostname !== review.hostname
    ) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_APPLY_FAILED',
        'The server no longer confirms the exact reviewed hostname publication.',
      );
    }

    const current = requireRemoteRecord(this.deploymentStore.get(deploymentId));
    if (publicationReviewStateDigest(current) !== review.stateDigest) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_REVIEW_STALE',
        'Deployment or domain facts changed while hostname publication was in progress. Re-open the current publication state.',
      );
    }
    const requesting = markTlsRequesting(endpointBeforePublication);
    this.deploymentStore.setPublicEndpointIfUnchanged(
      current.id,
      endpointBeforePublication,
      requesting,
    );
    return Object.freeze({
      deploymentId: current.id,
      hostname: review.hostname,
      publicationState: 'configured',
      tlsState: requesting.tls.state,
      alreadyApplied: review.alreadyApplied,
    });
  }

  async verifyPublicHttps(deploymentId) {
    let record = requireRemoteRecord(this.deploymentStore.get(deploymentId));
    if (!record.publicEndpoint || record.publicEndpoint.domainState !== 'dns-confirmed') {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_DNS_REQUIRED',
        'Confirmed DNS is required before secure public verification.',
      );
    }

    const dnsEndpoint = record.publicEndpoint;
    const dnsObservation = await this.publicationObserver.observeDns(dnsEndpoint);
    const refreshedDns = recordDnsObservation(dnsEndpoint, dnsObservation);
    this.deploymentStore.setPublicEndpointIfUnchanged(
      record.id,
      dnsEndpoint,
      refreshedDns,
    );
    if (refreshedDns.domainState !== 'dns-confirmed') {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_DNS_REQUIRED',
        'DNS no longer exactly matches the reviewed deployment destination.',
      );
    }
    record = requireRemoteRecord(this.deploymentStore.get(deploymentId));

    const publication = await this.inspectPublicationCapability(deploymentId);
    if (
      publication.capability !== 'ready'
      || publication.status?.state !== 'configured'
      || publication.status?.hostname !== record.publicEndpoint.hostname
      || publication.bootstrapAuthorityAccessible === true
      || publication.exactDeploymentMatches !== true
    ) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_CONFIGURED_REQUIRED',
        'The exact hostname publication must be configured and the deployment re-proven before secure public verification.',
      );
    }

    const checkedEndpoint = record.publicEndpoint;
    const tlsObservation = await this.publicationObserver.observeTls(checkedEndpoint.hostname);
    const withTls = recordTlsObservation(checkedEndpoint, tlsObservation);
    this.deploymentStore.setPublicEndpointIfUnchanged(
      record.id,
      checkedEndpoint,
      withTls,
    );
    if (withTls.tls.state !== 'verified') {
      return withTls;
    }

    const publicObservation = await this.publicationObserver.readPublicHealth(checkedEndpoint.hostname);
    const expected = activeReadBackExpectation(record);
    const completed = recordPublicReadBack(withTls, publicObservation, {
      runtime: expected.runtime,
      release: expected.deployment,
    });
    this.deploymentStore.setPublicEndpointIfUnchanged(
      record.id,
      withTls,
      completed,
    );
    return completed;
  }

  async prepareRollbackReview(deploymentId) {
    const record = requireRemoteRecord(this.deploymentStore.get(deploymentId));
    const rollbackRecovery = (
      (record.state === 'deploying' && record.stateReason === 'rollback-started')
      || (record.state === 'degraded' && record.stateReason === 'rollback-failed')
    );
    if (
      !record.previousRelease
      || !record.activeRelease
      || !record.runtimeProfile
      || (!['rollback-available', 'healthy'].includes(record.state) && !rollbackRecovery)
    ) {
      throw executionError(
        'DEPLOYMENT_ROLLBACK_UNAVAILABLE',
        'This deployment does not have an exact previous Release available for rollback.',
      );
    }
    if (record.publicEndpoint?.publicReadBack?.state !== 'verified') {
      throw executionError(
        'DEPLOYMENT_ROLLBACK_PUBLIC_PROOF_REQUIRED',
        'Verify the currently active public Release before reviewing rollback.',
      );
    }

    const facts = record.targetPublicFacts || {};
    const plan = createReferenceBootstrapPlan({
      runtimeProvenance: record.runtimeProfile,
      releaseManifest: {
        hostSlug: record.hostSlug,
        releaseId: record.activeRelease.id,
        releaseDigest: record.activeRelease.digest,
        packageDigest: record.activeRelease.packageDigest,
      },
      bootstrapUsername: String(facts.bootstrapUsername || facts.username),
    });
    const target = this.targetFactory({
      authorityStore: this.authorityStore,
      authorityId: record.authorityRef,
      target: {
        host: String(facts.host),
        port: Number(facts.port || 22),
        username: String(facts.username),
      },
      bootstrapUsername: String(facts.bootstrapUsername || facts.username),
      expectedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint),
      hostSlug: record.hostSlug,
    });
    if (
      !target
      || typeof target.readBack !== 'function'
      || typeof target.publicationStatus !== 'function'
      || typeof target.bootstrapAuthorityAccessible !== 'function'
      || typeof target.activateExistingRelease !== 'function'
    ) {
      throw executionError(
        'DEPLOYMENT_ROLLBACK_UNAVAILABLE',
        'Exact server rollback is unavailable in this runtime.',
      );
    }

    const currentExpected = activeReadBackExpectation(record);
    const previousExpected = releaseReadBackExpectation(record, record.previousRelease);
    const actual = await target.readBack();
    let remoteState = '';
    if (readBackMatches(actual, currentExpected)) {
      remoteState = 'active-release';
    } else if (readBackMatches(actual, previousExpected)) {
      remoteState = 'previous-release-already-active';
    } else {
      throw executionError(
        'DEPLOYMENT_ROLLBACK_READBACK_MISMATCH',
        'The server matches neither the current active Release nor the exact rollback candidate.',
      );
    }

    const publication = await target.publicationStatus(plan);
    const bootstrapAccessible = await target.bootstrapAuthorityAccessible(plan);
    const hostname = String(record.publicEndpoint?.hostname || '');
    if (
      publication.capability !== 'ready'
      || publication.status?.state !== 'configured'
      || publication.status?.hostname !== hostname
      || bootstrapAccessible !== false
    ) {
      throw executionError(
        'DEPLOYMENT_ROLLBACK_PUBLICATION_REQUIRED',
        'Rollback requires the existing restricted published hostname with bootstrap authority removed.',
      );
    }

    const core = {
      version: 1,
      deploymentId: record.id,
      hostSlug: record.hostSlug,
      target: {
        host: String(facts.host),
        port: Number(facts.port || 22),
        username: String(facts.username),
        trustedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint || ''),
      },
      hostname,
      runtime: Object.freeze({ ...record.runtimeProfile }),
      currentRelease: Object.freeze({ ...record.activeRelease }),
      rollbackRelease: Object.freeze({ ...record.previousRelease }),
      remoteState,
      consequences: ROLLBACK_CONSEQUENCES,
      held: ROLLBACK_HELD,
      stateDigest: rollbackReviewStateDigest(record),
    };
    return Object.freeze({
      ...core,
      reviewDigest: stableDigest(core),
    });
  }

  async rollback(deploymentId, {
    reviewDigest,
    confirmation,
  } = {}) {
    if (confirmation !== 'rollback-to-previous-release') {
      throw executionError(
        'DEPLOYMENT_ROLLBACK_CONFIRMATION_REQUIRED',
        'Explicit exact-Release rollback confirmation is required.',
      );
    }
    const submitted = String(reviewDigest || '').trim().toLowerCase();
    const review = await this.prepareRollbackReview(deploymentId);
    if (!/^[a-f0-9]{64}$/.test(submitted) || submitted !== review.reviewDigest) {
      throw executionError(
        'DEPLOYMENT_ROLLBACK_REVIEW_STALE',
        'Rollback facts changed after review. Review the current deployment again.',
      );
    }

    let record = requireRemoteRecord(this.deploymentStore.get(deploymentId));
    if (rollbackReviewStateDigest(record) !== review.stateDigest) {
      throw executionError(
        'DEPLOYMENT_ROLLBACK_REVIEW_STALE',
        'Deployment state changed after rollback review.',
      );
    }
    const facts = record.targetPublicFacts || {};
    const plan = createReferenceBootstrapPlan({
      runtimeProvenance: record.runtimeProfile,
      releaseManifest: {
        hostSlug: record.hostSlug,
        releaseId: record.previousRelease.id,
        releaseDigest: record.previousRelease.digest,
        packageDigest: record.previousRelease.packageDigest,
      },
      bootstrapUsername: String(facts.bootstrapUsername || facts.username),
    });
    const target = this.targetFactory({
      authorityStore: this.authorityStore,
      authorityId: record.authorityRef,
      target: {
        host: String(facts.host),
        port: Number(facts.port || 22),
        username: String(facts.username),
      },
      bootstrapUsername: String(facts.bootstrapUsername || facts.username),
      expectedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint),
      hostSlug: record.hostSlug,
    });

    const displaced = Object.freeze({ ...record.activeRelease });
    const rollbackRelease = Object.freeze({ ...record.previousRelease });
    const beforeExpected = activeReadBackExpectation(record);
    const afterExpected = releaseReadBackExpectation(record, rollbackRelease);

    if (!(record.state === 'deploying' && record.stateReason === 'rollback-started')) {
      this.deploymentStore.transition(record.id, 'deploying', {
        reason: 'rollback-started',
        patch: { healthState: 'checking' },
      });
    }

    try {
      const before = await target.readBack();
      if (readBackMatches(before, beforeExpected)) {
        await target.activateExistingRelease(plan, rollbackRelease);
      } else if (!readBackMatches(before, afterExpected)) {
        throw executionError(
          'DEPLOYMENT_ROLLBACK_READBACK_MISMATCH',
          'The server changed before rollback and matches neither admitted Release.',
        );
      }

      const after = await target.readBack();
      if (!readBackMatches(after, afterExpected)) {
        throw executionError(
          'DEPLOYMENT_ROLLBACK_READBACK_MISMATCH',
          'Server read-back did not match the exact rollback Release.',
        );
      }

      record = this.deploymentStore.get(record.id);
      if (
        record.state !== 'deploying'
        || record.stateReason !== 'rollback-started'
        || record.activeRelease?.id !== displaced.id
        || record.previousRelease?.id !== rollbackRelease.id
      ) {
        throw executionError(
          'DEPLOYMENT_ROLLBACK_REVIEW_STALE',
          'Local deployment state changed while rollback was in progress.',
        );
      }

      return this.deploymentStore.transition(record.id, 'rollback-available', {
        reason: 'rollback-readback-match',
        patch: {
          activeRelease: {
            ...rollbackRelease,
            deployedAt: new Date(this.now()).toISOString(),
          },
          previousRelease: displaced,
          healthState: 'healthy',
          rollbackState: 'available',
          lastConfirmedAt: new Date(this.now()).toISOString(),
        },
      });
    } catch (error) {
      const current = this.deploymentStore.get(deploymentId);
      if (current?.state === 'deploying' && current.stateReason === 'rollback-started') {
        this.deploymentStore.transition(deploymentId, 'degraded', {
          reason: 'rollback-failed',
          patch: {
            healthState: 'degraded',
            rollbackState: 'available',
          },
        });
      }
      throw error;
    }
  }

  async prepareDisconnectReview(deploymentId) {
    const record = requireRemoteRecord(this.deploymentStore.get(deploymentId));
    const removalStarted = disconnectRemovalStarted(record);
    const markedRecovery = disconnectRecoveryMarked(record);
    if (
      !removalStarted
      && (
        !['healthy', 'rollback-available'].includes(record.state)
        || record.publicEndpoint?.publicReadBack?.state !== 'verified'
      )
    ) {
      throw executionError(
        'DEPLOYMENT_DISCONNECT_PUBLIC_PROOF_REQUIRED',
        'Verify the current public Release before disconnecting deployment authority.',
      );
    }

    const facts = record.targetPublicFacts || {};
    let authority = null;
    let localAuthorityPresent = true;
    try {
      authority = this.authorityStore.publicRecord(record.authorityRef);
    } catch (error) {
      if (!markedRecovery || error?.code !== 'DEPLOYMENT_AUTHORITY_NOT_FOUND') throw error;
      localAuthorityPresent = false;
      authority = {
        id: record.authorityRef,
        publicKey: '',
        publicKeyFingerprint: String(facts.authorityDisconnectFingerprint || ''),
      };
    }

    let remoteAuthorityRemoved = markedRecovery;
    let exactDeploymentConfirmed = markedRecovery;
    if (localAuthorityPresent) {
      const target = this.targetFactory({
        authorityStore: this.authorityStore,
        authorityId: record.authorityRef,
        target: {
          host: String(facts.host),
          port: Number(facts.port || 22),
          username: String(facts.username),
        },
        bootstrapUsername: String(facts.bootstrapUsername || facts.username),
        expectedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint),
        hostSlug: record.hostSlug,
      });
      if (
        !target
        || typeof target.deploymentAuthorityAccessible !== 'function'
        || typeof target.removeDeploymentAuthority !== 'function'
        || typeof target.readBack !== 'function'
      ) {
        throw executionError(
          'DEPLOYMENT_DISCONNECT_UNAVAILABLE',
          'Deployment authority disconnect is unavailable in this runtime.',
        );
      }

      const accessible = await target.deploymentAuthorityAccessible();
      remoteAuthorityRemoved = accessible === false;
      if (remoteAuthorityRemoved && !removalStarted) {
        throw executionError(
          'DEPLOYMENT_DISCONNECT_REMOTE_STATE_AMBIGUOUS',
          'Deployment authority is already unavailable before the reviewed disconnect began. Do not revoke local authority automatically.',
        );
      }
      if (!remoteAuthorityRemoved) {
        const actual = await target.readBack();
        exactDeploymentConfirmed = readBackMatches(actual, activeReadBackExpectation(record));
        if (!exactDeploymentConfirmed) {
          throw executionError(
            'DEPLOYMENT_DISCONNECT_READBACK_REQUIRED',
            'The exact active runtime and Release must be confirmed before deployment authority is removed.',
          );
        }
      }
    }

    const core = {
      version: 1,
      deploymentId: record.id,
      hostSlug: record.hostSlug,
      target: {
        host: String(facts.host),
        port: Number(facts.port || 22),
        username: String(facts.username),
        trustedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint || ''),
      },
      hostname: String(record.publicEndpoint?.hostname || ''),
      release: Object.freeze({ ...record.activeRelease }),
      runtime: Object.freeze({ ...record.runtimeProfile }),
      authority: {
        id: String(record.authorityRef || ''),
        publicKeyFingerprint: String(authority.publicKeyFingerprint || ''),
        localAuthorityPresent,
        remoteAuthorityRemoved,
      },
      exactDeploymentConfirmed,
      consequences: DISCONNECT_CONSEQUENCES,
      held: DISCONNECT_HELD,
      stateDigest: rollbackReviewStateDigest(record),
    };
    return Object.freeze({
      ...core,
      reviewDigest: stableDigest(core),
    });
  }

  async disconnectAuthority(deploymentId, {
    reviewDigest,
    confirmation,
  } = {}) {
    if (confirmation !== 'disconnect-deployment-authority') {
      throw executionError(
        'DEPLOYMENT_DISCONNECT_CONFIRMATION_REQUIRED',
        'Explicit deployment-authority disconnect confirmation is required.',
      );
    }
    const submitted = String(reviewDigest || '').trim().toLowerCase();
    const review = await this.prepareDisconnectReview(deploymentId);
    if (!/^[a-f0-9]{64}$/.test(submitted) || submitted !== review.reviewDigest) {
      throw executionError(
        'DEPLOYMENT_DISCONNECT_REVIEW_STALE',
        'Disconnect facts changed after review. Review the current deployment again.',
      );
    }

    let record = requireRemoteRecord(this.deploymentStore.get(deploymentId));
    if (rollbackReviewStateDigest(record) !== review.stateDigest) {
      throw executionError(
        'DEPLOYMENT_DISCONNECT_REVIEW_STALE',
        'Deployment state changed after disconnect review.',
      );
    }

    let authority = null;
    if (review.authority.localAuthorityPresent) {
      authority = this.authorityStore.publicRecord(record.authorityRef);
    }

    if (!disconnectRemovalStarted(record)) {
      if (!authority) {
        throw executionError(
          'DEPLOYMENT_DISCONNECT_RECOVERY_STATE_INVALID',
          'Local deployment authority is unavailable before server-side disconnect intent was persisted.',
        );
      }
      this.deploymentStore.transition(deploymentId, 'degraded', {
        reason: 'authority-disconnect-removal-started',
        patch: {
          targetPublicFacts: {
            ...record.targetPublicFacts,
            authorityDisconnectState: 'removal-started',
            authorityDisconnectFingerprint: authority.publicKeyFingerprint,
          },
          healthState: 'unknown',
          rollbackState: record.rollbackState,
        },
      });
      record = this.deploymentStore.get(deploymentId);
    }

    if (!review.authority.remoteAuthorityRemoved) {
      if (!authority) {
        authority = this.authorityStore.publicRecord(record.authorityRef);
      }
      const facts = record.targetPublicFacts || {};
      const plan = createReferenceBootstrapPlan({
        runtimeProvenance: record.runtimeProfile,
        releaseManifest: {
          hostSlug: record.hostSlug,
          releaseId: record.activeRelease.id,
          releaseDigest: record.activeRelease.digest,
          packageDigest: record.activeRelease.packageDigest,
        },
        bootstrapUsername: String(facts.bootstrapUsername || facts.username),
      });
      const target = this.targetFactory({
        authorityStore: this.authorityStore,
        authorityId: record.authorityRef,
        target: {
          host: String(facts.host),
          port: Number(facts.port || 22),
          username: String(facts.username),
        },
        bootstrapUsername: String(facts.bootstrapUsername || facts.username),
        expectedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint),
        hostSlug: record.hostSlug,
      });

      await target.removeDeploymentAuthority(plan, authority.publicKey);
      if (await target.deploymentAuthorityAccessible()) {
        throw executionError(
          'DEPLOYMENT_DISCONNECT_REMOTE_AUTHORITY_REMAINS',
          'The deployment authority could still authenticate after server-side key removal.',
        );
      }
    }

    record = this.deploymentStore.get(deploymentId);
    if (!disconnectRecoveryMarked(record)) {
      this.deploymentStore.setTargetPublicFacts(deploymentId, {
        ...record.targetPublicFacts,
        authorityDisconnectState: 'remote-removed',
        authorityDisconnectFingerprint: (
          record.targetPublicFacts.authorityDisconnectFingerprint
          || authority?.publicKeyFingerprint
          || review.authority.publicKeyFingerprint
        ),
      });
      record = this.deploymentStore.get(deploymentId);
    }

    if (!disconnectRecoveryMarked(record)) {
      throw executionError(
        'DEPLOYMENT_DISCONNECT_RECOVERY_STATE_INVALID',
        'Server-side authority removal was not persisted before local key revocation.',
      );
    }

    try {
      this.authorityStore.revoke(record.authorityRef);
    } catch (error) {
      if (error?.code !== 'DEPLOYMENT_AUTHORITY_NOT_FOUND') throw error;
    }
    return this.deploymentStore.disconnect(deploymentId, 'deployment-authority-disconnected');
  }

  async preparePublicationMigrationReview(deploymentId) {
    const record = requireRemoteRecord(this.deploymentStore.get(deploymentId));
    if (
      !['healthy', 'rollback-available'].includes(record.state)
      || !record.activeRelease
      || !record.runtimeProfile
    ) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_ACTIVE_DEPLOYMENT_REQUIRED',
        'Finish a healthy exact deployment before preparing the server upgrade.',
      );
    }
    if (!record.publicEndpoint) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_DOMAIN_PLAN_REQUIRED',
        'Prepare a domain plan before preparing the server publishing upgrade.',
      );
    }

    const capability = await this.inspectPublicationCapability(deploymentId);
    if (
      capability.capability === 'ready'
      && capability.status?.state !== 'unconfigured'
    ) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_MIGRATION_STATE_INVALID',
        'This server already has a non-empty publication state and is not eligible for the one-time capability migration.',
      );
    }
    if (
      capability.capability === 'ready'
      && capability.status?.state === 'unconfigured'
      && capability.exactDeploymentMatches === false
    ) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_MIGRATION_STATE_INVALID',
        'The server publishing capability is present but the active runtime/Release proof no longer matches.',
      );
    }
    if (
      capability.capability === 'ready'
      && capability.status?.state === 'unconfigured'
      && capability.bootstrapAuthorityAccessible === false
      && capability.exactDeploymentMatches === true
    ) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_MIGRATION_NOT_REQUIRED',
        'The publication capability is already installed, bootstrap authority is removed, and the exact deployment still matches.',
      );
    }
    if (
      capability.capability !== 'upgrade-required'
      && capability.capability !== 'migration-incomplete'
      && !(capability.capability === 'ready' && capability.status?.state === 'unconfigured')
    ) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_MIGRATION_STATE_INVALID',
        'Server publication capability state is not eligible for the one-time migration.',
      );
    }

    const facts = record.targetPublicFacts || {};
    const bootstrapUsername = String(facts.bootstrapUsername || '').trim();
    const currentUsername = String(facts.username || '').trim();
    if (!bootstrapUsername || bootstrapUsername === currentUsername) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_MIGRATION_BOOTSTRAP_ACCOUNT_INVALID',
        'The original bootstrap account is not available as a separate temporary migration authority.',
      );
    }

    const authority = this.authorityStore.publicRecord(record.authorityRef);
    const helper = publicationHelperArtifact();
    const core = {
      version: 1,
      deploymentId: record.id,
      hostSlug: record.hostSlug,
      target: {
        host: String(facts.host),
        port: Number(facts.port || 22),
        currentUsername,
        bootstrapUsername,
        trustedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint || ''),
      },
      authority: {
        id: String(record.authorityRef),
        publicKey: String(authority.publicKey || ''),
        publicKeyFingerprint: String(authority.publicKeyFingerprint || ''),
      },
      current: {
        release: {
          id: record.activeRelease.id,
          digest: record.activeRelease.digest,
          packageDigest: record.activeRelease.packageDigest,
        },
        runtime: {
          sourceSha: record.runtimeProfile.sourceSha,
          sourceTree: record.runtimeProfile.sourceTree,
          packageVersion: record.runtimeProfile.packageVersion,
          nodeVersion: record.runtimeProfile.nodeVersion,
          bundleDigest: record.runtimeProfile.bundleDigest,
        },
        publicationCapability: capability.capability,
        publicationState: capability.status?.state || 'upgrade-required',
      },
      helper: {
        sha256: helper.sha256,
        installedPath: '/usr/local/libexec/hivenues-publication-' + record.hostSlug,
      },
      consequences: PUBLICATION_MIGRATION_CONSEQUENCES,
      held: PUBLICATION_MIGRATION_HELD,
    };
    return Object.freeze({
      ...core,
      reviewDigest: stableDigest(core),
    });
  }

  async migratePublicationCapability(deploymentId, {
    reviewDigest,
    confirmation,
  } = {}) {
    if (confirmation !== 'upgrade-reference-publication-capability') {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_MIGRATION_CONFIRMATION_REQUIRED',
        'Explicit one-time reference-server upgrade confirmation is required.',
      );
    }
    const submitted = String(reviewDigest || '').trim().toLowerCase();
    const review = await this.preparePublicationMigrationReview(deploymentId);
    if (!/^[a-f0-9]{64}$/.test(submitted) || submitted !== review.reviewDigest) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_MIGRATION_REVIEW_STALE',
        'Server upgrade facts changed after review. Review the one-time upgrade again.',
      );
    }

    const record = requireRemoteRecord(this.deploymentStore.get(deploymentId));
    const facts = record.targetPublicFacts || {};
    const bootstrapUsername = String(facts.bootstrapUsername || '');
    const plan = createReferenceBootstrapPlan({
      runtimeProvenance: record.runtimeProfile,
      releaseManifest: {
        hostSlug: record.hostSlug,
        releaseId: record.activeRelease.id,
        releaseDigest: record.activeRelease.digest,
        packageDigest: record.activeRelease.packageDigest,
      },
      bootstrapUsername,
    });
    const target = this.targetFactory({
      authorityStore: this.authorityStore,
      authorityId: record.authorityRef,
      target: {
        host: String(facts.host),
        port: Number(facts.port || 22),
        username: String(facts.username),
      },
      bootstrapUsername,
      expectedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint),
      hostSlug: record.hostSlug,
    });
    if (
      !target
      || typeof target.readBack !== 'function'
      || typeof target.publicationStatus !== 'function'
      || typeof target.bootstrapAuthorityAccessible !== 'function'
      || typeof target.publicationMigrationRecoveryEvidence !== 'function'
      || typeof target.migratePublicationCapability !== 'function'
      || typeof target.finalizeAuthorityNarrowing !== 'function'
    ) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_MIGRATION_UNAVAILABLE',
        'One-time server publication-capability migration is unavailable in this runtime.',
      );
    }

    const expected = activeReadBackExpectation(record);
    const before = await target.readBack();
    if (!readBackMatches(before, expected)) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_MIGRATION_READBACK_REQUIRED',
        'The server no longer matches the exact healthy runtime and Release frozen for this upgrade.',
      );
    }

    const bootstrapAvailable = await target.bootstrapAuthorityAccessible(plan);
    if (!bootstrapAvailable) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_MIGRATION_BOOTSTRAP_AUTHORITY_REQUIRED',
        'Temporarily restore the exact reviewed deployment public key to the original bootstrap account before running this one-time server upgrade.',
      );
    }

    const helper = publicationHelperArtifact();
    const migrated = await target.migratePublicationCapability({
      plan,
      helperSource: helper.content,
      helperSha256: helper.sha256,
    });
    if (
      migrated.capability !== 'ready'
      || migrated.status?.state !== 'unconfigured'
    ) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_MIGRATION_CAPABILITY_FAILED',
        'The restricted publication capability was not proven ready after migration.',
      );
    }

    await target.finalizeAuthorityNarrowing(plan);
    if (await target.bootstrapAuthorityAccessible(plan)) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_MIGRATION_AUTHORITY_CLEANUP_FAILED',
        'Temporary bootstrap authority remained accessible after migration.',
      );
    }

    const after = await target.readBack();
    if (!readBackMatches(after, expected)) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_MIGRATION_READBACK_CHANGED',
        'The active runtime or immutable Release changed during the server capability upgrade.',
      );
    }
    const finalCapability = await target.publicationStatus(plan);
    if (
      finalCapability.capability !== 'ready'
      || finalCapability.status?.state !== 'unconfigured'
    ) {
      throw executionError(
        'DEPLOYMENT_PUBLICATION_MIGRATION_FINAL_PROOF_FAILED',
        'Final restricted publication capability proof did not remain ready and unconfigured.',
      );
    }

    return Object.freeze({
      deploymentId: record.id,
      hostSlug: record.hostSlug,
      publication: finalCapability,
      runtime: Object.freeze({ ...expected.runtime }),
      release: Object.freeze({ ...expected.deployment }),
      bootstrapAuthorityRemoved: true,
    });
  }

  async prepareRecoveryFinalization(deploymentId) {
    const diagnostic = await this.inspectReadBack(deploymentId);
    if (!diagnostic.recovery?.recoverable) {
      throw executionError(
        'DEPLOYMENT_RECOVERY_PROOF_REQUIRED',
        'Interrupted deployment recovery has not been proven read-only.',
      );
    }
    const record = requireRemoteRecord(this.deploymentStore.get(deploymentId));
    if (record.activeRelease) {
      throw executionError(
        'DEPLOYMENT_RECOVERY_ACTIVE_RELEASE_PRESENT',
        'This recovery finalization is limited to an interrupted first deployment.',
      );
    }
    const cached = diagnostic.recovery.cachedRuntime;
    const runtime = cached.provenance;
    const core = {
      version: 1,
      deploymentId: record.id,
      hostSlug: record.hostSlug,
      state: record.state,
      target: {
        host: diagnostic.target.host,
        port: diagnostic.target.port,
        bootstrapUsername: diagnostic.recovery.providerUsername,
        deploymentUsername: diagnostic.recovery.deploymentUsername,
        trustedHostKeyFingerprint: diagnostic.target.trustedHostKeyFingerprint,
      },
      release: {
        id: record.package.releaseId,
        digest: record.package.releaseDigest,
        packageDigest: record.package.packageDigest,
      },
      runtime: {
        sourceSha: runtime.sourceSha,
        sourceTree: runtime.sourceTree,
        packageVersion: runtime.packageVersion,
        nodeVersion: runtime.nodeVersion,
        bundleDigest: runtime.bundleDigest,
      },
      authority: {
        observed: diagnostic.recovery.restrictedAuthorityState,
        target: 'restricted-deployment-user',
        serverMutationRequired:
          diagnostic.recovery.restrictedAuthorityState === 'restricted-login-proven',
      },
      consequences: RECOVERY_CONSEQUENCES,
      held: RECOVERY_HELD,
    };
    return Object.freeze({
      ...core,
      reviewDigest: stableDigest(core),
    });
  }

  async finalizeInterruptedRecovery(deploymentId, {
    reviewDigest,
    confirmation,
  } = {}) {
    if (confirmation !== 'finalize-interrupted-recovery') {
      throw executionError(
        'DEPLOYMENT_RECOVERY_CONFIRMATION_REQUIRED',
        'Explicit interrupted-recovery consequence confirmation is required.',
      );
    }
    const submitted = String(reviewDigest || '').trim().toLowerCase();
    const review = await this.prepareRecoveryFinalization(deploymentId);
    if (!/^[a-f0-9]{64}$/.test(submitted) || submitted !== review.reviewDigest) {
      throw executionError(
        'DEPLOYMENT_RECOVERY_REVIEW_STALE',
        'Recovery facts changed after review. Review the exact recovery consequence again.',
      );
    }

    const record = requireRemoteRecord(this.deploymentStore.get(deploymentId));
    const cachedRuntime = findCachedRuntimeBundle(this.runtimeBundlesRoot, review.runtime);
    if (!cachedRuntime) {
      throw executionError(
        'DEPLOYMENT_RECOVERY_RUNTIME_CACHE_MISSING',
        'The proven recovered runtime is no longer available in the local cache.',
      );
    }
    const releasePackage = exactPackage(this.packageBuilder, record);
    const release = loadReleasePackage(path.resolve(releasePackage.packagePath)).manifest;
    const expected = desiredReadBack(cachedRuntime.provenance, release);
    const facts = record.targetPublicFacts;
    const bootstrapUsername = String(facts.bootstrapUsername || facts.username);
    const plan = createReferenceBootstrapPlan({
      runtimeProvenance: cachedRuntime.provenance,
      releaseManifest: release,
      bootstrapUsername,
    });
    const target = this.targetFactory({
      authorityStore: this.authorityStore,
      authorityId: record.authorityRef,
      target: {
        host: String(facts.host),
        port: Number(facts.port || 22),
        username: plan.deploymentUser,
      },
      bootstrapUsername,
      expectedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint),
      hostSlug: record.hostSlug,
    });

    this.deploymentStore.setPendingRuntimeProfile(
      deploymentId,
      cachedRuntime.provenance,
    );
    let current = this.deploymentStore.get(deploymentId);
    if (current.state !== 'deploying') {
      current = this.deploymentStore.transition(deploymentId, 'deploying', {
        reason: 'interrupted-recovery-finalization-started',
        patch: { healthState: 'checking' },
      });
    }

    try {
      let readBack = await target.readBack();
      if (!readBackArtifactsMatch(readBack, expected)) {
        throw executionError(
          'DEPLOYMENT_RECOVERY_READBACK_MISMATCH',
          'Restricted-account read-back no longer matches the proven runtime and Release.',
        );
      }
      const authorityState = String(readBack.bootstrap?.authorityState || '');
      if (
        !['restricted-login-proven', 'restricted-deployment-user'].includes(authorityState)
      ) {
        throw executionError(
          'DEPLOYMENT_RECOVERY_AUTHORITY_STATE_INVALID',
          'Restricted-account authority state is no longer recoverable.',
        );
      }

      if (authorityState === 'restricted-login-proven') {
        await target.finalizeAuthorityNarrowing(plan);
        readBack = await target.readBack();
      }

      if (!readBackMatches(readBack, expected)) {
        throw executionError(
          'DEPLOYMENT_RECOVERY_AUTHORITY_NARROWING_INCOMPLETE',
          'Recovered deployment did not reach exact restricted authority after finalization.',
        );
      }

      const confirmedAt = new Date(this.now()).toISOString();
      return this.deploymentStore.transition(deploymentId, 'healthy', {
        reason: 'interrupted-deployment-recovered',
        patch: {
          activeRelease: {
            id: release.releaseId,
            digest: release.releaseDigest,
            packageDigest: release.packageDigest,
            deployedAt: confirmedAt,
          },
          previousRelease: null,
          targetPublicFacts: {
            ...this.deploymentStore.get(deploymentId).targetPublicFacts,
            username: plan.deploymentUser,
            bootstrapUsername,
            bootstrapAuthorityState: 'restricted-deployment-user',
          },
          runtimeProfile: {
            kind: 'hivenues-public-runtime',
            sourceSha: cachedRuntime.provenance.sourceSha,
            sourceTree: cachedRuntime.provenance.sourceTree,
            packageVersion: cachedRuntime.provenance.packageVersion,
            nodeVersion: cachedRuntime.provenance.nodeVersion,
            bundleDigest: cachedRuntime.provenance.bundleDigest,
          },
          pendingRuntimeProfile: null,
          healthState: 'healthy',
          rollbackState: 'unavailable',
          lastConfirmedAt: confirmedAt,
        },
      });
    } catch (error) {
      const latest = this.deploymentStore.get(deploymentId);
      if (latest?.state === 'deploying') {
        this.deploymentStore.transition(deploymentId, 'degraded', {
          reason: 'interrupted-recovery-finalization-failed',
          patch: {
            healthState: 'degraded',
            rollbackState: 'unavailable',
          },
        });
      }
      throw error;
    }
  }

  prepareReview(deploymentId) {
    const current = this.deploymentStore.get(deploymentId);
    if (
      (current?.state === 'deploying' && current?.stateReason === 'rollback-started')
      || (
        current?.state === 'degraded'
        && ['rollback-failed', 'authority-disconnect-removal-started'].includes(
          String(current?.stateReason || ''),
        )
      )
    ) {
      throw executionError(
        'DEPLOYMENT_LIFECYCLE_OPERATION_IN_PROGRESS',
        'Finish the current rollback or authority-disconnect lifecycle before reviewing another deployment.',
      );
    }
    const { record, runtime, releasePackage } = this.artifacts(deploymentId);
    const facts = record.targetPublicFacts;
    const core = {
      version: 1,
      deploymentId: record.id,
      hostSlug: record.hostSlug,
      state: record.state,
      target: {
        host: String(facts.host),
        port: Number(facts.port || 22),
        currentUsername: String(facts.username),
        bootstrapUsername: String(facts.bootstrapUsername || facts.username),
        trustedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint),
        verifiedOs: String(facts.verifiedOs || ''),
        verifiedArchitecture: String(facts.verifiedArchitecture || ''),
        dedicatedTargetVerified: facts.verifiedDedicatedTarget === true,
        publicTcpPorts: Array.isArray(facts.verifiedPublicTcpPorts)
          ? facts.verifiedPublicTcpPorts.map(Number)
          : [],
      },
      release: {
        id: releasePackage.releaseId,
        digest: releasePackage.releaseDigest,
        packageDigest: releasePackage.packageDigest,
      },
      runtime: {
        sourceSha: runtime.provenance.sourceSha,
        sourceTree: runtime.provenance.sourceTree,
        packageVersion: runtime.provenance.packageVersion,
        nodeVersion: runtime.provenance.nodeVersion,
        bundleDigest: runtime.provenance.bundleDigest,
      },
      consequences: CONSEQUENCES,
      held: HELD,
    };
    return Object.freeze({
      ...core,
      reviewDigest: stableDigest(core),
    });
  }

  async deploy(deploymentId, {
    reviewDigest,
    confirmation,
  } = {}) {
    if (confirmation !== 'deploy-exact-release') {
      throw executionError(
        'DEPLOYMENT_CONSEQUENCE_CONFIRMATION_REQUIRED',
        'Explicit deployment consequence confirmation is required.',
      );
    }
    const submitted = String(reviewDigest || '').trim().toLowerCase();
    const review = this.prepareReview(deploymentId);
    if (!/^[a-f0-9]{64}$/.test(submitted) || submitted !== review.reviewDigest) {
      throw executionError(
        'DEPLOYMENT_CONSEQUENCE_REVIEW_STALE',
        'Deployment facts changed after review. Review the exact consequence again.',
      );
    }

    const { record, runtime, releasePackage } = this.artifacts(deploymentId);
    const facts = record.targetPublicFacts;
    const target = this.targetFactory({
      authorityStore: this.authorityStore,
      authorityId: record.authorityRef,
      target: {
        host: String(facts.host),
        port: Number(facts.port || 22),
        username: String(facts.username),
      },
      bootstrapUsername: String(facts.bootstrapUsername || facts.username),
      expectedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint),
      hostSlug: record.hostSlug,
    });
    const coordinator = new ExactReleaseDeploymentCoordinator({
      store: this.deploymentStore,
      target,
      now: this.now,
    });
    return coordinator.deploy(deploymentId, {
      runtimeRoot: runtime.root,
      releasePackageRoot: releasePackage.packagePath,
    });
  }
}

module.exports = {
  CONSEQUENCES,
  HELD,
  RECOVERY_CONSEQUENCES,
  RECOVERY_HELD,
  PUBLICATION_MIGRATION_CONSEQUENCES,
  PUBLICATION_MIGRATION_HELD,
  ROLLBACK_CONSEQUENCES,
  ROLLBACK_HELD,
  DISCONNECT_CONSEQUENCES,
  DISCONNECT_HELD,
  InstalledRemoteDeploymentService,
  findCachedRuntimeBundle,
  materializeInstalledRuntimeBundle,
  requireBuildProvenance,
  sameExactRuntime,
};
