'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { provisionCandidateCHost } = require('./provision');
const { CandidateCStore } = require('./store');
const { seedCandidateCHosts } = require('./fixtures');

const STORAGE_VERSION = 1;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/i;

function storeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

class FileCandidateCStore {
  constructor({
    statePath,
    hosts = seedCandidateCHosts(),
    now = Date.now,
    lockTimeoutMs = 2000,
    lockRetryMs = 20,
  } = {}) {
    if (!statePath) throw new TypeError('Candidate C file store requires statePath.');
    this.statePath = path.resolve(statePath);
    this.lockPath = `${this.statePath}.lock`;
    this.hosts = hosts;
    this.now = now;
    this.lockTimeoutMs = lockTimeoutMs;
    this.lockRetryMs = lockRetryMs;
    this.sleepCell = new Int32Array(new SharedArrayBuffer(4));
  }

  list() {
    return this.readStore().list();
  }

  workspace(slug) {
    return this.readStore().workspace(slug);
  }

  snapshot(slug) {
    return this.readStore().snapshot(slug);
  }

  publicSnapshot(slug) {
    return this.readStore().publicSnapshot(slug);
  }

  diagnostics() {
    return this.readStore().diagnostics();
  }

  createHost(graph) {
    return this.mutate((store) => provisionCandidateCHost(store, graph));
  }

  proposal(slug, proposalId) {
    return this.readStore().proposal(slug, proposalId);
  }

  urgentOperation(slug, operationId) {
    return this.readStore().urgentOperation(slug, operationId);
  }

  editActivityStatus(slug, activityId, lifecycle, statusNote, expectedRevision, expectedDigest) {
    return this.draftMutation(slug, expectedRevision, expectedDigest, (store) => (
      store.editActivityStatus(slug, activityId, lifecycle, statusNote, expectedRevision, expectedDigest)
    ));
  }

  proposeUrgent(slug, change) {
    return this.mutate((store) => store.proposeUrgent(slug, change));
  }

  executeUrgent(slug, operationId, expectedLiveReleaseId, expectedRevision, expectedDigest) {
    // CandidateCStore deliberately checks the immutable live Release before
    // checking the working-version tokens. Do not wrap this in draftMutation:
    // doing so would mask a superseded live base as an ordinary stale draft.
    return this.mutate((store) => (
      store.executeUrgent(slug, operationId, expectedLiveReleaseId, expectedRevision, expectedDigest)
    ));
  }

  completeSetup(slug, input, expectedRevision, expectedDigest) {
    return this.draftMutation(slug, expectedRevision, expectedDigest, (store) => (
      store.completeSetup(slug, input, expectedRevision, expectedDigest)
    ));
  }

  editTagline(slug, tagline, expectedRevision, expectedDigest) {
    return this.draftMutation(slug, expectedRevision, expectedDigest, (store) => (
      store.editTagline(slug, tagline, expectedRevision, expectedDigest)
    ));
  }

  editActivity(slug, activityId, fields, expectedRevision, expectedDigest) {
    return this.draftMutation(slug, expectedRevision, expectedDigest, (store) => (
      store.editActivity(slug, activityId, fields, expectedRevision, expectedDigest)
    ));
  }

  editVoiceTerm(slug, mechanicId, term, expectedRevision, expectedDigest) {
    return this.draftMutation(slug, expectedRevision, expectedDigest, (store) => (
      store.editVoiceTerm(slug, mechanicId, term, expectedRevision, expectedDigest)
    ));
  }

  setFocal(slug, mediaId, x, y, expectedRevision, expectedDigest) {
    return this.draftMutation(slug, expectedRevision, expectedDigest, (store) => (
      store.setFocal(slug, mediaId, x, y, expectedRevision, expectedDigest)
    ));
  }

  moveSection(slug, sectionId, delta, expectedRevision, expectedDigest) {
    return this.draftMutation(slug, expectedRevision, expectedDigest, (store) => (
      store.moveSection(slug, sectionId, delta, expectedRevision, expectedDigest)
    ));
  }

  proposeDirection(slug, familyId, expectedRevision, expectedDigest) {
    return this.draftMutation(slug, expectedRevision, expectedDigest, (store) => (
      store.proposeDirection(slug, familyId, expectedRevision, expectedDigest)
    ));
  }

  applyDirection(slug, proposalId, expectedRevision, expectedDigest) {
    return this.draftMutation(slug, expectedRevision, expectedDigest, (store) => (
      store.applyDirection(slug, proposalId, expectedRevision, expectedDigest)
    ));
  }

  undo(slug, expectedRevision, expectedDigest) {
    return this.draftMutation(slug, expectedRevision, expectedDigest, (store) => (
      store.undo(slug, expectedRevision, expectedDigest)
    ));
  }

  createRelease(slug, expectedRevision, expectedDigest) {
    return this.draftMutation(slug, expectedRevision, expectedDigest, (store) => (
      store.createRelease(slug, expectedRevision, expectedDigest)
    ));
  }

  restoreRelease(slug, releaseId, expectedRevision, expectedDigest) {
    return this.draftMutation(slug, expectedRevision, expectedDigest, (store) => (
      store.restoreRelease(slug, releaseId, expectedRevision, expectedDigest)
    ));
  }

  recordRsvp(slug, activityId, name) {
    return this.mutate((store) => store.recordRsvp(slug, activityId, name));
  }

  draftMutation(slug, expectedRevision, expectedDigest, mutator) {
    return this.mutate((store) => {
      const snapshot = store.snapshot(slug);
      if (!snapshot) return { ok: false, reason: 'NOT_FOUND' };
      const parsedRevision = Number(expectedRevision);
      if (!Number.isInteger(parsedRevision) || parsedRevision < 1) {
        return {
          ok: false,
          reason: 'INVALID_REVISION',
          actualRevision: snapshot.revision,
          actualDigest: snapshot.draftDigest,
        };
      }
      if (typeof expectedDigest !== 'string' || !DIGEST_PATTERN.test(expectedDigest)) {
        return {
          ok: false,
          reason: 'INVALID_DRAFT_DIGEST',
          actualRevision: snapshot.revision,
          actualDigest: snapshot.draftDigest,
        };
      }
      if (parsedRevision !== snapshot.revision) {
        return {
          ok: false,
          reason: 'STALE_REVISION',
          actualRevision: snapshot.revision,
          actualDigest: snapshot.draftDigest,
        };
      }
      if (expectedDigest.toLowerCase() !== snapshot.draftDigest) {
        return {
          ok: false,
          reason: 'STALE_DIGEST',
          actualRevision: snapshot.revision,
          actualDigest: snapshot.draftDigest,
        };
      }
      return mutator(store);
    });
  }

  mutate(mutator) {
    return this.withLock(() => {
      const store = this.loadStoreUnlocked(true);
      const result = mutator(store);
      if (result && result.ok) this.writeStoreUnlocked(store);
      return result;
    });
  }

  readStore() {
    if (fs.existsSync(this.statePath)) return this.loadStoreUnlocked(false);
    return this.withLock(() => this.loadStoreUnlocked(true));
  }

  loadStoreUnlocked(initializeIfMissing) {
    if (!fs.existsSync(this.statePath)) {
      if (!initializeIfMissing) throw storeError('CANDIDATE_C_STATE_MISSING', 'Candidate C state file is missing.');
      const seed = new CandidateCStore({ hosts: this.hosts, now: this.now });
      this.writeStoreUnlocked(seed);
      return seed;
    }

    let envelope;
    try {
      envelope = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
    } catch (error) {
      throw storeError('CANDIDATE_C_STATE_PARSE_FAILED', `Candidate C state could not be parsed: ${error.message}`);
    }
    if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
      throw storeError('CANDIDATE_C_STATE_INVALID', 'Candidate C state envelope must be an object.');
    }
    if (envelope.storageVersion !== STORAGE_VERSION) {
      throw storeError(
        'CANDIDATE_C_STATE_VERSION_UNSUPPORTED',
        `Unsupported Candidate C storage version: ${envelope.storageVersion}`
      );
    }
    try {
      return CandidateCStore.fromState(envelope.state, { now: this.now });
    } catch (error) {
      if (error && error.code) throw error;
      throw storeError('CANDIDATE_C_STATE_INVALID', `Candidate C state validation failed: ${error.message}`);
    }
  }

  writeStoreUnlocked(store) {
    const directory = path.dirname(this.statePath);
    fs.mkdirSync(directory, { recursive: true });
    const envelope = {
      storageVersion: STORAGE_VERSION,
      state: store.exportState(),
    };
    const payload = `${JSON.stringify(envelope, null, 2)}\n`;
    const tempPath = `${this.statePath}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
    let fd;
    try {
      fd = fs.openSync(tempPath, 'wx', 0o600);
      fs.writeFileSync(fd, payload, 'utf8');
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fd = undefined;
      fs.renameSync(tempPath, this.statePath);
    } catch (error) {
      if (fd !== undefined) {
        try { fs.closeSync(fd); } catch (_) {}
      }
      try { fs.unlinkSync(tempPath); } catch (_) {}
      throw error;
    }
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
          throw storeError('CANDIDATE_C_STORE_LOCK_TIMEOUT', 'Timed out waiting for Candidate C state lock.');
        }
        Atomics.wait(this.sleepCell, 0, 0, this.lockRetryMs);
      }
    }

    try {
      return action();
    } finally {
      try { fs.closeSync(fd); } finally {
        try { fs.unlinkSync(this.lockPath); } catch (_) {}
      }
    }
  }
}

module.exports = { FileCandidateCStore, STORAGE_VERSION };
