'use strict';

const path = require('node:path');

const { createReferenceBootstrapPlan } = require('./bootstrap-plan');
const { loadRuntimeProvenance } = require('./public-runtime');
const { loadReleasePackage } = require('./release-store');

function coordinatorError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function sameRelease(left, right) {
  return Boolean(
    left
    && right
    && left.id === right.id
    && left.digest === right.digest
    && left.packageDigest === right.packageDigest
  );
}

function readRuntime(runtimeRoot) {
  const root = path.resolve(runtimeRoot);
  return loadRuntimeProvenance(
    path.join(root, 'runtime-provenance.json'),
    path.join(root, 'runtime-manifest.json'),
  );
}

function desiredReadBack(runtime, release) {
  return {
    runtime: {
      sourceSha: runtime.sourceSha,
      sourceTree: runtime.sourceTree,
      packageVersion: runtime.packageVersion,
      nodeVersion: runtime.nodeVersion,
      bundleDigest: runtime.bundleDigest,
    },
    deployment: {
      hostSlug: release.hostSlug,
      releaseId: release.releaseId,
      releaseDigest: release.releaseDigest,
      packageDigest: release.packageDigest,
    },
  };
}

function readBackArtifactsMatch(actual, expected) {
  if (!actual || actual.status !== 'healthy') return false;
  return (
    actual.runtime?.sourceSha === expected.runtime.sourceSha
    && actual.runtime?.sourceTree === expected.runtime.sourceTree
    && actual.runtime?.packageVersion === expected.runtime.packageVersion
    && actual.runtime?.nodeVersion === expected.runtime.nodeVersion
    && actual.runtime?.bundleDigest === expected.runtime.bundleDigest
    && actual.deployment?.hostSlug === expected.deployment.hostSlug
    && actual.deployment?.releaseId === expected.deployment.releaseId
    && actual.deployment?.releaseDigest === expected.deployment.releaseDigest
    && actual.deployment?.packageDigest === expected.deployment.packageDigest
  );
}

function readBackMatches(actual, expected) {
  return (
    readBackArtifactsMatch(actual, expected)
    && actual.bootstrap?.authorityState === 'restricted-deployment-user'
  );
}

class ExactReleaseDeploymentCoordinator {
  constructor({
    store,
    target,
    now = Date.now,
  } = {}) {
    if (!store) throw new TypeError('Exact Release deployment coordinator requires a deployment store.');
    if (
      !target
      || typeof target.installRuntime !== 'function'
      || typeof target.installRelease !== 'function'
      || typeof target.activate !== 'function'
      || typeof target.readBack !== 'function'
    ) {
      throw new TypeError('Exact Release deployment coordinator requires a mutable target.');
    }
    this.store = store;
    this.target = target;
    this.now = now;
  }

  async deploy(deploymentId, {
    runtimeRoot,
    releasePackageRoot,
  } = {}) {
    const record = this.store.get(deploymentId);
    if (!record) throw coordinatorError('DEPLOYMENT_NOT_FOUND', 'Deployment target was not found.');
    if (record.providerKind !== 'ssh-server') {
      throw coordinatorError(
        'DEPLOYMENT_TARGET_KIND_INVALID',
        'Exact Release deployment requires a verified server target.',
      );
    }
    if (!['bootstrap-ready', 'healthy', 'rollback-available', 'degraded'].includes(record.state)) {
      throw coordinatorError(
        'DEPLOYMENT_MUTATION_STATE_INVALID',
        'Server target is not in an accepted mutation state.',
      );
    }
    const verifiedOs = String(record.targetPublicFacts?.verifiedOs || '');
    const verifiedArchitecture = String(record.targetPublicFacts?.verifiedArchitecture || '');
    if (!/Debian GNU\/Linux 13/i.test(verifiedOs) || verifiedArchitecture !== 'x86_64') {
      throw coordinatorError(
        'DEPLOYMENT_TARGET_PROFILE_UNSUPPORTED',
        'Reference bootstrap currently requires verified Debian GNU/Linux 13 on x86_64.',
      );
    }
    if (!record.selectedRelease || !record.package) {
      throw coordinatorError(
        'DEPLOYMENT_RELEASE_REQUIRED',
        'Choose and package an immutable Release before server deployment.',
      );
    }
    if (!runtimeRoot || !releasePackageRoot) {
      throw coordinatorError(
        'DEPLOYMENT_ARTIFACT_REQUIRED',
        'Runtime and Release artifacts are required for server deployment.',
      );
    }

    const runtime = readRuntime(runtimeRoot);
    const releasePackage = loadReleasePackage(path.resolve(releasePackageRoot));
    const release = releasePackage.manifest;

    if (
      release.releaseId !== record.selectedRelease.id
      || release.releaseDigest !== record.selectedRelease.digest
      || release.releaseId !== record.package.releaseId
      || release.releaseDigest !== record.package.releaseDigest
      || release.packageDigest !== record.package.packageDigest
    ) {
      throw coordinatorError(
        'DEPLOYMENT_ARTIFACT_MISMATCH',
        'Deployment artifacts do not match the exact selected Release.',
      );
    }

    const plan = createReferenceBootstrapPlan({
      runtimeProvenance: runtime,
      releaseManifest: release,
      bootstrapUsername: record.targetPublicFacts?.username || 'root',
    });
    const expected = desiredReadBack(runtime, release);
    const priorActive = record.activeRelease ? { ...record.activeRelease } : null;
    const priorPrevious = record.previousRelease ? { ...record.previousRelease } : null;
    const desiredActive = {
      id: release.releaseId,
      digest: release.releaseDigest,
      packageDigest: release.packageDigest,
      deployedAt: new Date(this.now()).toISOString(),
    };

    this.store.transition(deploymentId, 'deploying', {
      reason: 'exact-release-deployment-started',
      patch: { healthState: 'checking' },
    });

    try {
      let readBack = await this.target.readBack();
      if (!readBackMatches(readBack, expected)) {
        const installedRuntime = await this.target.installRuntime(runtimeRoot);
        const installedRelease = await this.target.installRelease(releasePackageRoot);
        await this.target.activate({
          runtime: installedRuntime,
          release: installedRelease,
          plan,
        });
        readBack = await this.target.readBack();
      }

      if (!readBackArtifactsMatch(readBack, expected)) {
        throw coordinatorError(
          'DEPLOYMENT_READBACK_MISMATCH',
          'Server read-back did not match the exact runtime and Release.',
        );
      }

      if (
        readBack.bootstrap?.authorityState === 'restricted-login-proven'
        && typeof this.target.finalizeAuthorityNarrowing === 'function'
      ) {
        this.store.setTargetPublicFacts(deploymentId, {
          ...record.targetPublicFacts,
          username: plan.privilegeModel.steadyRemoteAccount,
          bootstrapAuthorityState: 'restricted-login-proven',
        });
        await this.target.finalizeAuthorityNarrowing(plan);
        readBack = await this.target.readBack();
      }

      if (!readBackMatches(readBack, expected)) {
        throw coordinatorError(
          'DEPLOYMENT_AUTHORITY_NARROWING_INCOMPLETE',
          'Server authority was not narrowed after exact deployment read-back.',
        );
      }

      const desiredRef = {
        id: desiredActive.id,
        digest: desiredActive.digest,
        packageDigest: desiredActive.packageDigest,
      };
      const priorActiveRef = priorActive
        ? {
            id: priorActive.id,
            digest: priorActive.digest,
            packageDigest: priorActive.packageDigest,
          }
        : null;
      const previousRelease = (
        priorActiveRef && !sameRelease(priorActiveRef, desiredRef)
          ? priorActive
          : priorPrevious
      );
      const nextState = previousRelease ? 'rollback-available' : 'healthy';

      return this.store.transition(deploymentId, nextState, {
        reason: 'exact-release-readback-match',
        patch: {
          activeRelease: desiredActive,
          previousRelease,
          targetPublicFacts: {
            ...this.store.get(deploymentId).targetPublicFacts,
            username: plan.privilegeModel.steadyRemoteAccount,
            bootstrapAuthorityState: plan.privilegeModel.steadyStateAuthority,
          },
          runtimeProfile: {
            kind: 'hivenues-public-runtime',
            sourceSha: runtime.sourceSha,
            sourceTree: runtime.sourceTree,
            packageVersion: runtime.packageVersion,
            nodeVersion: runtime.nodeVersion,
            bundleDigest: runtime.bundleDigest,
          },
          healthState: 'healthy',
          rollbackState: previousRelease ? 'available' : 'unavailable',
          lastConfirmedAt: new Date(this.now()).toISOString(),
        },
      });
    } catch (error) {
      this.store.transition(deploymentId, 'degraded', {
        reason: 'exact-release-deployment-failed',
        patch: {
          healthState: 'degraded',
          rollbackState: priorActive ? 'available' : record.rollbackState,
        },
      });
      throw error;
    }
  }
}

module.exports = {
  ExactReleaseDeploymentCoordinator,
  readBackArtifactsMatch,
  readBackMatches,
};
