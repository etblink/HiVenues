'use strict';

class ThreadsServiceSigner {
  constructor({
    enabled = false,
    account,
    credentialId = null,
    broadcast = null,
  } = {}) {
    this.enabled = Boolean(enabled);
    this.account = String(account || '').trim().toLowerCase();
    this.credentialId = credentialId;
    this.broadcast = broadcast;

    if (this.enabled) {
      if (!String(credentialId || '').startsWith('synthetic:')) {
        throw new Error('Foundation Threads signer accepts synthetic test credentials only');
      }
      if (typeof broadcast !== 'function') {
        throw new Error('Enabled foundation Threads signer requires a synthetic broadcast function');
      }
    }
    Object.freeze(this);
  }

  async broadcastEnvelope(envelope) {
    if (!this.enabled) {
      const error = new Error('Threads service signing is disabled');
      error.code = 'THREADS_SERVICE_SIGNER_DISABLED';
      throw error;
    }
    if (!envelope || envelope.authority !== 'Posting') {
      throw new Error('Threads service signer accepts Posting-authority envelopes only');
    }
    if (String(envelope.account || '').toLowerCase() !== this.account) {
      throw new Error('Threads service signer account does not match the envelope account');
    }
    return this.broadcast({
      credentialId: this.credentialId,
      account: this.account,
      operations: envelope.operations,
      fingerprint: envelope.fingerprint,
    });
  }
}

function createThreadsServiceSigner(options) {
  return new ThreadsServiceSigner(options);
}

module.exports = { ThreadsServiceSigner, createThreadsServiceSigner };
