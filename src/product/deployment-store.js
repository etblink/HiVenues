'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DEPLOYMENT_STORAGE_VERSION = 1;

const DEPLOYMENT_CAPABILITIES = Object.freeze([
  'DISCOVER',
  'QUOTE',
  'PROVISION_HANDOFF',
  'VERIFY_TARGET',
  'COMPUTE',
  'STORE',
  'PUBLISH',
  'CONTENT_ADDRESS',
  'BOOTSTRAP_RUNTIME',
  'DEPLOY_RELEASE',
  'DOMAIN',
  'DNS',
  'TLS',
  'HEALTH',
  'ROLLBACK',
  'DECOMMISSION',
]);

const DEPLOYMENT_STATES = Object.freeze([
  'target-draft',
  'awaiting-provider',
  'target-ready',
  'host-key-review',
  'verifying',
  'bootstrap-ready',
  'deploying',
  'awaiting-dns',
  'awaiting-tls',
  'healthy',
  'degraded',
  'unreachable',
  'rollback-available',
  'disconnected',
]);

const TRANSITIONS = Object.freeze({
  'target-draft': new Set(['awaiting-provider', 'target-ready', 'disconnected']),
  'awaiting-provider': new Set(['target-ready', 'disconnected']),
  'target-ready': new Set(['host-key-review', 'verifying', 'disconnected']),
  'host-key-review': new Set(['target-ready', 'disconnected']),
  verifying: new Set(['bootstrap-ready', 'degraded', 'unreachable', 'disconnected']),
  'bootstrap-ready': new Set(['deploying', 'disconnected']),
  deploying: new Set(['healthy', 'rollback-available', 'awaiting-dns', 'awaiting-tls', 'degraded', 'unreachable']),
  'awaiting-dns': new Set(['awaiting-tls', 'healthy', 'degraded', 'unreachable', 'disconnected']),
  'awaiting-tls': new Set(['healthy', 'degraded', 'unreachable', 'disconnected']),
  healthy: new Set(['deploying', 'rollback-available', 'degraded', 'unreachable', 'disconnected']),
  degraded: new Set(['host-key-review', 'verifying', 'deploying', 'disconnected']),
  unreachable: new Set(['host-key-review', 'verifying', 'disconnected']),
  'rollback-available': new Set(['deploying', 'healthy', 'degraded', 'unreachable', 'disconnected']),
  disconnected: new Set(),
});

const FORBIDDEN_SECRET_KEYS = /(?:private.?key|password|secret|token|credential|mnemonic|recovery.?key)/i;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;

function deploymentError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function clone(value) {
  return structuredClone(value);
}

function assertNoSecrets(value, pathParts = []) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecrets(item, [...pathParts, String(index)]));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_SECRET_KEYS.test(key)) {
      throw deploymentError(
        'DEPLOYMENT_SECRET_REJECTED',
        'Deployment state may not contain secret field: ' + [...pathParts, key].join('.'),
      );
    }
    assertNoSecrets(child, [...pathParts, key]);
  }
}

function normalizedCapabilities(capabilities) {
  const known = new Set(DEPLOYMENT_CAPABILITIES);
  const result = [...new Set((capabilities || []).map((item) => String(item || '').trim()).filter(Boolean))];
  for (const capability of result) {
    if (!known.has(capability)) {
      throw deploymentError('DEPLOYMENT_CAPABILITY_UNKNOWN', 'Unknown deployment capability: ' + capability);
    }
  }
  return result.sort();
}

function requireReleaseRef(release) {
  const id = String(release?.id || '').trim();
  const digest = String(release?.digest || '').trim().toLowerCase();
  if (!id || !DIGEST_PATTERN.test(digest)) {
    throw deploymentError('DEPLOYMENT_RELEASE_INVALID', 'Deployment Release reference is invalid.');
  }
  return Object.freeze({ id, digest });
}

function writeAtomicJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const payload = JSON.stringify(value, null, 2) + '\n';
  const temp = file + '.tmp-' + process.pid + '-' + crypto.randomBytes(6).toString('hex');
  let fd;
  try {
    fd = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(fd, payload, 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(temp, file);
  } catch (error) {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch {}
    }
    try { fs.unlinkSync(temp); } catch {}
    throw error;
  }
}

class FileDeploymentStore {
  constructor({
    statePath,
    now = Date.now,
    idFactory = () => crypto.randomUUID(),
    lockTimeoutMs = 2000,
    lockRetryMs = 20,
  } = {}) {
    if (!statePath) throw new TypeError('HiVenues deployment store requires statePath.');
    this.statePath = path.resolve(statePath);
    this.lockPath = this.statePath + '.lock';
    this.now = now;
    this.idFactory = idFactory;
    this.lockTimeoutMs = lockTimeoutMs;
    this.lockRetryMs = lockRetryMs;
    this.sleepCell = new Int32Array(new SharedArrayBuffer(4));
  }

  list(hostSlug = '') {
    const state = this.readState();
    return state.deployments
      .filter((item) => !hostSlug || item.hostSlug === hostSlug)
      .map((item) => clone(item));
  }

  get(deploymentId) {
    const record = this.readState().deployments.find((item) => item.id === deploymentId);
    return record ? clone(record) : null;
  }

  createDraft({
    hostSlug,
    providerKind,
    providerProfile,
    capabilities = [],
  }) {
    const slug = String(hostSlug || '').trim();
    const kind = String(providerKind || '').trim();
    const profile = String(providerProfile || '').trim();
    if (!slug || !kind || !profile) {
      throw deploymentError('DEPLOYMENT_DRAFT_INVALID', 'Deployment target draft requires host, provider kind and provider profile.');
    }
    const capabilityList = normalizedCapabilities(capabilities);
    return this.mutate((state) => {
      const timestamp = new Date(this.now()).toISOString();
      const record = {
        version: 1,
        id: 'deployment-' + this.idFactory(),
        hostSlug: slug,
        providerKind: kind,
        providerProfile: profile,
        capabilities: capabilityList,
        state: 'target-draft',
        stateReason: '',
        providerState: 'not-requested',
        paymentState: 'not-requested',
        targetPublicFacts: {},
        authorityRef: null,
        selectedRelease: null,
        package: null,
        activeRelease: null,
        previousRelease: null,
        runtimeProfile: null,
        domainState: 'domain-unconfigured',
        tlsState: 'unconfigured',
        healthState: 'unknown',
        rollbackState: 'unavailable',
        createdAt: timestamp,
        updatedAt: timestamp,
        lastConfirmedAt: null,
        history: [{ from: null, to: 'target-draft', at: timestamp, reason: 'created' }],
      };
      assertNoSecrets(record);
      state.deployments.push(record);
      return clone(record);
    });
  }

  selectRelease(deploymentId, release) {
    const selected = requireReleaseRef(release);
    return this.update(deploymentId, (record) => {
      if (record.state === 'disconnected') {
        throw deploymentError('DEPLOYMENT_DISCONNECTED', 'Disconnected deployment targets cannot select a Release.');
      }
      record.selectedRelease = selected;
      record.package = null;
      return record;
    });
  }

  recordPackage(deploymentId, packageRecord) {
    const digest = String(packageRecord?.packageDigest || '').trim().toLowerCase();
    if (!DIGEST_PATTERN.test(digest)) {
      throw deploymentError('DEPLOYMENT_PACKAGE_INVALID', 'Deployment package digest is invalid.');
    }
    return this.update(deploymentId, (record) => {
      if (!record.selectedRelease) {
        throw deploymentError('DEPLOYMENT_RELEASE_REQUIRED', 'Select an immutable Release before preparing a deployment package.');
      }
      if (
        record.selectedRelease.id !== packageRecord.releaseId
        || record.selectedRelease.digest !== String(packageRecord.releaseDigest || '').toLowerCase()
      ) {
        throw deploymentError('DEPLOYMENT_PACKAGE_RELEASE_MISMATCH', 'Deployment package does not match the selected Release.');
      }
      record.package = {
        schemaVersion: Number(packageRecord.schemaVersion),
        releaseId: packageRecord.releaseId,
        releaseDigest: String(packageRecord.releaseDigest).toLowerCase(),
        packageDigest: digest,
      };
      return record;
    });
  }

  setTargetPublicFacts(deploymentId, facts) {
    const publicFacts = clone(facts || {});
    assertNoSecrets(publicFacts);
    return this.update(deploymentId, (record) => {
      record.targetPublicFacts = publicFacts;
      return record;
    });
  }

  setAuthorityRef(deploymentId, authorityRef) {
    const value = String(authorityRef || '').trim();
    if (!/^authority-[A-Za-z0-9._-]+$/.test(value)) {
      throw deploymentError('DEPLOYMENT_AUTHORITY_REF_INVALID', 'Deployment authority reference is invalid.');
    }
    return this.update(deploymentId, (record) => {
      if (record.state === 'disconnected') {
        throw deploymentError('DEPLOYMENT_DISCONNECTED', 'Disconnected deployment targets cannot acquire authority.');
      }
      record.authorityRef = value;
      return record;
    });
  }

  transition(deploymentId, nextState, {
    reason = '',
    patch = {},
  } = {}) {
    if (!DEPLOYMENT_STATES.includes(nextState)) {
      throw deploymentError('DEPLOYMENT_STATE_UNKNOWN', 'Unknown deployment state: ' + nextState);
    }
    assertNoSecrets(patch);
    return this.update(deploymentId, (record) => {
      const allowed = TRANSITIONS[record.state];
      if (!allowed || !allowed.has(nextState)) {
        throw deploymentError(
          'DEPLOYMENT_TRANSITION_INVALID',
          'Deployment state may not transition from ' + record.state + ' to ' + nextState + '.',
        );
      }
      const from = record.state;
      record.state = nextState;
      record.stateReason = String(reason || '');
      for (const key of [
        'providerState',
        'paymentState',
        'targetPublicFacts',
        'authorityRef',
        'activeRelease',
        'previousRelease',
        'runtimeProfile',
        'domainState',
        'tlsState',
        'healthState',
        'rollbackState',
        'lastConfirmedAt',
      ]) {
        if (Object.hasOwn(patch, key)) record[key] = clone(patch[key]);
      }
      const at = new Date(this.now()).toISOString();
      record.history.push({ from, to: nextState, at, reason: String(reason || '') });
      return record;
    });
  }

  disconnect(deploymentId, reason = 'operator-disconnect') {
    const record = this.get(deploymentId);
    if (!record) throw deploymentError('DEPLOYMENT_NOT_FOUND', 'Deployment target was not found.');
    if (record.state === 'disconnected') return record;
    return this.transition(deploymentId, 'disconnected', {
      reason,
      patch: {
        authorityRef: null,
        healthState: 'unknown',
        rollbackState: 'unavailable',
      },
    });
  }

  update(deploymentId, updater) {
    return this.mutate((state) => {
      const record = state.deployments.find((item) => item.id === deploymentId);
      if (!record) throw deploymentError('DEPLOYMENT_NOT_FOUND', 'Deployment target was not found.');
      const result = updater(record) || record;
      result.updatedAt = new Date(this.now()).toISOString();
      assertNoSecrets(result);
      return clone(result);
    });
  }

  readState() {
    if (!fs.existsSync(this.statePath)) {
      return this.withLock(() => {
        if (!fs.existsSync(this.statePath)) {
          this.writeStateUnlocked({ storageVersion: DEPLOYMENT_STORAGE_VERSION, deployments: [] });
        }
        return this.loadStateUnlocked();
      });
    }
    return this.loadStateUnlocked();
  }

  mutate(mutator) {
    return this.withLock(() => {
      const state = fs.existsSync(this.statePath)
        ? this.loadStateUnlocked()
        : { storageVersion: DEPLOYMENT_STORAGE_VERSION, deployments: [] };
      const result = mutator(state);
      this.writeStateUnlocked(state);
      return result;
    });
  }

  loadStateUnlocked() {
    let envelope;
    try {
      envelope = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
    } catch (error) {
      throw deploymentError('DEPLOYMENT_STATE_PARSE_FAILED', 'Deployment state could not be parsed: ' + error.message);
    }
    if (
      !envelope
      || typeof envelope !== 'object'
      || Array.isArray(envelope)
      || envelope.storageVersion !== DEPLOYMENT_STORAGE_VERSION
      || !Array.isArray(envelope.deployments)
    ) {
      throw deploymentError('DEPLOYMENT_STATE_INVALID', 'Deployment state envelope is invalid.');
    }
    for (const record of envelope.deployments) {
      if (
        !record
        || record.version !== 1
        || typeof record.id !== 'string'
        || !DEPLOYMENT_STATES.includes(record.state)
        || !Array.isArray(record.capabilities)
      ) {
        throw deploymentError('DEPLOYMENT_STATE_INVALID', 'Deployment record is invalid.');
      }
      normalizedCapabilities(record.capabilities);
      assertNoSecrets(record);
    }
    return envelope;
  }

  writeStateUnlocked(state) {
    assertNoSecrets(state);
    writeAtomicJson(this.statePath, state);
  }

  withLock(action) {
    fs.mkdirSync(path.dirname(this.statePath), { recursive: true });
    const deadline = Date.now() + this.lockTimeoutMs;
    let fd;
    while (fd === undefined) {
      try {
        fd = fs.openSync(this.lockPath, 'wx', 0o600);
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        if (Date.now() >= deadline) {
          throw deploymentError('DEPLOYMENT_STORE_LOCK_TIMEOUT', 'Timed out waiting for deployment state lock.');
        }
        Atomics.wait(this.sleepCell, 0, 0, this.lockRetryMs);
      }
    }
    try {
      return action();
    } finally {
      try { fs.closeSync(fd); } finally {
        try { fs.unlinkSync(this.lockPath); } catch {}
      }
    }
  }
}

module.exports = {
  DEPLOYMENT_CAPABILITIES,
  DEPLOYMENT_STATES,
  FileDeploymentStore,
  assertNoSecrets,
  requireReleaseRef,
};
