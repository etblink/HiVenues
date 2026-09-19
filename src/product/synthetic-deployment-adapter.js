'use strict';

const SYNTHETIC_CAPABILITIES = Object.freeze([
  'PROVISION_HANDOFF',
  'VERIFY_TARGET',
  'COMPUTE',
  'STORE',
  'PUBLISH',
  'BOOTSTRAP_RUNTIME',
  'DEPLOY_RELEASE',
  'DOMAIN',
  'TLS',
  'HEALTH',
  'ROLLBACK',
  'DECOMMISSION',
]);

function requireRecord(store, deploymentId) {
  const record = store.get(deploymentId);
  if (!record) {
    const error = new Error('Synthetic deployment target was not found.');
    error.code = 'DEPLOYMENT_NOT_FOUND';
    throw error;
  }
  return record;
}

class SyntheticDeploymentAdapter {
  constructor({ store, now = Date.now } = {}) {
    if (!store) throw new TypeError('Synthetic deployment adapter requires a deployment store.');
    this.store = store;
    this.now = now;
  }

  profile() {
    return Object.freeze({
      kind: 'synthetic-offline',
      profile: 'synthetic-local',
      capabilities: [...SYNTHETIC_CAPABILITIES],
      externalEffects: false,
    });
  }

  markAwaitingProvider(deploymentId) {
    return this.store.transition(deploymentId, 'awaiting-provider', {
      reason: 'synthetic-provider-handoff',
      patch: { providerState: 'awaiting-provider' },
    });
  }

  markTargetReady(deploymentId, facts = {}) {
    const current = requireRecord(this.store, deploymentId);
    if (current.state === 'target-draft') {
      this.markAwaitingProvider(deploymentId);
    }
    this.store.setTargetPublicFacts(deploymentId, {
      transport: 'synthetic',
      targetLabel: 'Offline synthetic target',
      ...facts,
    });
    return this.store.transition(deploymentId, 'target-ready', {
      reason: 'synthetic-target-ready',
      patch: {
        providerState: 'ready',
        paymentState: 'not-required',
      },
    });
  }

  verify(deploymentId) {
    const current = requireRecord(this.store, deploymentId);
    if (current.state !== 'target-ready' && current.state !== 'degraded' && current.state !== 'unreachable') {
      throw new Error('Synthetic target must be ready or recovering before verification.');
    }
    this.store.transition(deploymentId, 'verifying', {
      reason: 'synthetic-read-only-verification',
      patch: { healthState: 'checking' },
    });
    return this.store.transition(deploymentId, 'bootstrap-ready', {
      reason: 'synthetic-verification-passed',
      patch: {
        authorityRef: 'synthetic:no-secret-authority',
        healthState: 'ready',
        lastConfirmedAt: new Date(this.now()).toISOString(),
      },
    });
  }

  deploy(deploymentId, manifest, runtimeProfile = {}) {
    const current = requireRecord(this.store, deploymentId);
    if (!current.selectedRelease || !current.package) {
      throw new Error('Synthetic deployment requires a selected Release and prepared package.');
    }
    if (
      current.selectedRelease.id !== manifest.releaseId
      || current.selectedRelease.digest !== manifest.releaseDigest
      || current.package.packageDigest !== manifest.packageDigest
    ) {
      const error = new Error('Synthetic deployment package does not match the selected Release.');
      error.code = 'DEPLOYMENT_PACKAGE_RELEASE_MISMATCH';
      throw error;
    }
    if (!['bootstrap-ready', 'healthy', 'rollback-available', 'degraded'].includes(current.state)) {
      throw new Error('Synthetic deployment target is not ready to deploy.');
    }

    const previous = current.activeRelease ? { ...current.activeRelease } : null;
    this.store.transition(deploymentId, 'deploying', {
      reason: 'synthetic-deploy',
      patch: { healthState: 'checking' },
    });

    const activeRelease = {
      id: manifest.releaseId,
      digest: manifest.releaseDigest,
      packageDigest: manifest.packageDigest,
      deployedAt: new Date(this.now()).toISOString(),
    };
    const nextState = previous ? 'rollback-available' : 'healthy';
    return this.store.transition(deploymentId, nextState, {
      reason: 'synthetic-public-readback-match',
      patch: {
        activeRelease,
        previousRelease: previous,
        runtimeProfile: {
          kind: 'synthetic-runtime',
          version: 'stage1',
          ...runtimeProfile,
        },
        healthState: 'healthy',
        rollbackState: previous ? 'available' : 'unavailable',
        domainState: 'synthetic',
        tlsState: 'synthetic',
        lastConfirmedAt: new Date(this.now()).toISOString(),
      },
    });
  }

  degrade(deploymentId, reason = 'synthetic-health-failure') {
    const current = requireRecord(this.store, deploymentId);
    if (!['healthy', 'rollback-available'].includes(current.state)) {
      throw new Error('Synthetic target must be healthy before degradation can be simulated.');
    }
    return this.store.transition(deploymentId, 'degraded', {
      reason,
      patch: { healthState: 'degraded' },
    });
  }

  markUnreachable(deploymentId) {
    const current = requireRecord(this.store, deploymentId);
    if (!['verifying', 'deploying', 'healthy', 'rollback-available'].includes(current.state)) {
      throw new Error('Synthetic target cannot become unreachable from its current state.');
    }
    return this.store.transition(deploymentId, 'unreachable', {
      reason: 'synthetic-unreachable',
      patch: { healthState: 'unreachable' },
    });
  }

  rollback(deploymentId) {
    const current = requireRecord(this.store, deploymentId);
    if (!current.previousRelease) {
      const error = new Error('Synthetic target has no prior deployed Release to roll back to.');
      error.code = 'DEPLOYMENT_ROLLBACK_UNAVAILABLE';
      throw error;
    }
    if (!['rollback-available', 'healthy', 'degraded'].includes(current.state)) {
      throw new Error('Synthetic target is not in a rollback-capable state.');
    }

    const rollbackTarget = { ...current.previousRelease };
    const displaced = current.activeRelease ? { ...current.activeRelease } : null;
    this.store.transition(deploymentId, 'deploying', {
      reason: 'synthetic-rollback',
      patch: { healthState: 'checking' },
    });
    return this.store.transition(deploymentId, 'rollback-available', {
      reason: 'synthetic-rollback-readback-match',
      patch: {
        activeRelease: {
          ...rollbackTarget,
          deployedAt: new Date(this.now()).toISOString(),
        },
        previousRelease: displaced,
        healthState: 'healthy',
        rollbackState: displaced ? 'available' : 'unavailable',
        lastConfirmedAt: new Date(this.now()).toISOString(),
      },
    });
  }

  disconnect(deploymentId) {
    return this.store.disconnect(deploymentId, 'synthetic-disconnect');
  }
}

module.exports = {
  SYNTHETIC_CAPABILITIES,
  SyntheticDeploymentAdapter,
};
