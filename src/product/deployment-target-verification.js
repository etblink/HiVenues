'use strict';

function verificationError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeFingerprint(value) {
  const fingerprint = String(value || '').trim();
  if (!/^SHA256:[A-Za-z0-9+/]{20,}$/.test(fingerprint)) {
    throw verificationError('DEPLOYMENT_HOST_FINGERPRINT_INVALID', 'Observed SSH host fingerprint is invalid.');
  }
  return fingerprint;
}

function normalizedTargetFacts(record) {
  const host = String(record?.targetPublicFacts?.host || '').trim();
  const username = String(record?.targetPublicFacts?.username || '').trim();
  const port = Number(record?.targetPublicFacts?.port || 22);
  if (!host || !username || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw verificationError('DEPLOYMENT_TARGET_FACTS_INCOMPLETE', 'Deployment target needs host, port and username before verification.');
  }
  return { host, port, username };
}

class SshTargetVerificationService {
  constructor({
    store,
    authorityStore,
    transport,
    now = Date.now,
  } = {}) {
    if (!store) throw new TypeError('SSH target verification requires a deployment store.');
    if (!authorityStore) throw new TypeError('SSH target verification requires an authority store.');
    if (
      !transport
      || typeof transport.observeHostKey !== 'function'
      || typeof transport.inspect !== 'function'
    ) {
      throw new TypeError('SSH target verification requires a transport.');
    }
    this.store = store;
    this.authorityStore = authorityStore;
    this.transport = transport;
    this.now = now;
  }

  async verify(deploymentId) {
    const record = this.store.get(deploymentId);
    if (!record) throw verificationError('DEPLOYMENT_NOT_FOUND', 'Deployment target was not found.');
    if (!record.authorityRef) {
      throw verificationError('DEPLOYMENT_AUTHORITY_REQUIRED', 'Deployment target needs a deployment authority before verification.');
    }
    if (!['target-ready', 'degraded', 'unreachable'].includes(record.state)) {
      throw verificationError('DEPLOYMENT_VERIFY_STATE_INVALID', 'Deployment target is not ready for read-only verification.');
    }

    const target = normalizedTargetFacts(record);
    const observed = normalizeFingerprint(await this.transport.observeHostKey(target));
    const trusted = String(record.targetPublicFacts?.trustedHostKeyFingerprint || '').trim();

    if (!trusted || trusted !== observed) {
      const nextFacts = {
        ...record.targetPublicFacts,
        observedHostKeyFingerprint: observed,
        hostKeyTrustState: trusted ? 'changed-review-required' : 'first-review-required',
      };
      return this.store.transition(deploymentId, 'host-key-review', {
        reason: trusted ? 'ssh-host-key-changed' : 'ssh-host-key-first-seen',
        patch: {
          targetPublicFacts: nextFacts,
          healthState: 'review-required',
        },
      });
    }

    this.store.transition(deploymentId, 'verifying', {
      reason: 'ssh-read-only-verification',
      patch: { healthState: 'checking' },
    });

    let inspection;
    try {
      inspection = await this.authorityStore.withPrivateKey(
        record.authorityRef,
        (privateKey) => this.transport.inspect({
          ...target,
          expectedHostKeyFingerprint: trusted,
          privateKey,
        }),
      );
    } catch (error) {
      this.store.transition(deploymentId, 'degraded', {
        reason: 'ssh-read-only-verification-failed',
        patch: { healthState: 'degraded' },
      });
      throw error;
    }

    const refreshed = this.store.get(deploymentId);
    const targetPublicFacts = {
      ...refreshed.targetPublicFacts,
      hostKeyTrustState: 'trusted',
      observedHostKeyFingerprint: trusted,
      verifiedOs: String(inspection?.os || '').trim(),
      verifiedArchitecture: String(inspection?.architecture || '').trim(),
      verifiedMemoryMb: Number(inspection?.memoryMb || 0),
      verifiedDiskMb: Number(inspection?.diskMb || 0),
    };
    return this.store.transition(deploymentId, 'bootstrap-ready', {
      reason: 'ssh-read-only-verification-passed',
      patch: {
        targetPublicFacts,
        healthState: 'ready',
        lastConfirmedAt: new Date(this.now()).toISOString(),
      },
    });
  }

  acceptObservedHostKey(deploymentId, fingerprint) {
    const record = this.store.get(deploymentId);
    if (!record) throw verificationError('DEPLOYMENT_NOT_FOUND', 'Deployment target was not found.');
    if (record.state !== 'host-key-review') {
      throw verificationError('DEPLOYMENT_HOST_KEY_REVIEW_STATE_INVALID', 'Deployment target is not awaiting host-key review.');
    }
    const accepted = normalizeFingerprint(fingerprint);
    const observed = normalizeFingerprint(record.targetPublicFacts?.observedHostKeyFingerprint);
    if (accepted !== observed) {
      throw verificationError('DEPLOYMENT_HOST_KEY_REVIEW_MISMATCH', 'Accepted host fingerprint does not match the observed target.');
    }
    return this.store.transition(deploymentId, 'target-ready', {
      reason: 'ssh-host-key-accepted',
      patch: {
        targetPublicFacts: {
          ...record.targetPublicFacts,
          trustedHostKeyFingerprint: accepted,
          hostKeyTrustState: 'trusted',
        },
        healthState: 'unknown',
      },
    });
  }
}

class ScriptedSshVerificationTransport {
  constructor({
    hostKeyFingerprint,
    inspection = {},
  } = {}) {
    this.hostKeyFingerprint = normalizeFingerprint(hostKeyFingerprint);
    this.inspection = {
      os: 'Debian GNU/Linux 13',
      architecture: 'x86_64',
      memoryMb: 1024,
      diskMb: 20480,
      ...inspection,
    };
    this.calls = [];
  }

  async observeHostKey(target) {
    this.calls.push({ kind: 'observe-host-key', target: { ...target } });
    return this.hostKeyFingerprint;
  }

  async inspect(input) {
    this.calls.push({
      kind: 'inspect',
      target: {
        host: input.host,
        port: input.port,
        username: input.username,
      },
      expectedHostKeyFingerprint: input.expectedHostKeyFingerprint,
      privateKeyBytes: Buffer.byteLength(input.privateKey),
    });
    if (input.expectedHostKeyFingerprint !== this.hostKeyFingerprint) {
      throw verificationError('DEPLOYMENT_HOST_KEY_CHANGED', 'SSH host fingerprint changed before authentication.');
    }
    if (!Buffer.isBuffer(input.privateKey) || input.privateKey.length < 100) {
      throw verificationError('DEPLOYMENT_AUTHORITY_INVALID', 'Deployment private key was unavailable.');
    }
    return { ...this.inspection };
  }
}

module.exports = {
  ScriptedSshVerificationTransport,
  SshTargetVerificationService,
  normalizeFingerprint,
  normalizedTargetFacts,
};
