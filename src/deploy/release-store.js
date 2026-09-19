'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { stableDigest } = require('../product/model');

function runtimeStoreError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function clone(value) {
  return structuredClone(value);
}

function writeAtomicJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temp = filePath + '.tmp-' + process.pid + '-' + crypto.randomBytes(6).toString('hex');
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temp, filePath);
}

function loadReleasePackage(packagePath) {
  const root = path.resolve(packagePath);
  const manifestPath = path.join(root, 'manifest.json');
  const releasePath = path.join(root, 'release.json');
  let manifest;
  let snapshot;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    snapshot = JSON.parse(fs.readFileSync(releasePath, 'utf8'));
  } catch (error) {
    throw runtimeStoreError(
      'DEPLOYED_RELEASE_UNREADABLE',
      'Deployed Release package could not be read: ' + error.message,
    );
  }

  if (
    !manifest
    || manifest.schemaVersion !== 1
    || typeof manifest.hostSlug !== 'string'
    || typeof manifest.releaseId !== 'string'
    || !/^[a-f0-9]{64}$/.test(String(manifest.releaseDigest || ''))
    || !/^[a-f0-9]{64}$/.test(String(manifest.packageDigest || ''))
    || !Array.isArray(manifest.media)
  ) {
    throw runtimeStoreError('DEPLOYED_RELEASE_MANIFEST_INVALID', 'Deployed Release manifest is invalid.');
  }
  if (stableDigest(snapshot) !== manifest.releaseDigest) {
    throw runtimeStoreError(
      'DEPLOYED_RELEASE_DIGEST_MISMATCH',
      'Deployed Release snapshot does not match its manifest digest.',
    );
  }

  for (const media of manifest.media) {
    if (
      !media
      || typeof media.publicPath !== 'string'
      || typeof media.packagePath !== 'string'
      || !/^[a-f0-9]{64}$/.test(String(media.sha256 || ''))
      || !Number.isInteger(media.bytes)
      || media.bytes < 0
    ) {
      throw runtimeStoreError('DEPLOYED_RELEASE_MEDIA_INVALID', 'Deployed Release media manifest is invalid.');
    }
    const filePath = path.resolve(root, media.packagePath);
    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
      throw runtimeStoreError('DEPLOYED_RELEASE_MEDIA_INVALID', 'Deployed Release media path escapes its package.');
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      throw runtimeStoreError('DEPLOYED_RELEASE_MEDIA_MISSING', 'Deployed Release media is missing.');
    }
    const bytes = fs.readFileSync(filePath);
    if (bytes.length !== media.bytes) {
      throw runtimeStoreError('DEPLOYED_RELEASE_MEDIA_BYTES_MISMATCH', 'Deployed Release media byte count changed.');
    }
    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    if (digest !== media.sha256) {
      throw runtimeStoreError('DEPLOYED_RELEASE_MEDIA_DIGEST_MISMATCH', 'Deployed Release media digest changed.');
    }
  }

  return Object.freeze({
    root,
    manifest: Object.freeze(clone(manifest)),
    snapshot: Object.freeze(clone(snapshot)),
  });
}

class DeployedReleaseStore {
  constructor({
    packagePath,
    runtimeStatePath,
    now = Date.now,
    idFactory = () => crypto.randomUUID(),
  } = {}) {
    if (!packagePath) throw new TypeError('Deployed Release store requires packagePath.');
    if (!runtimeStatePath) throw new TypeError('Deployed Release store requires runtimeStatePath.');
    this.release = loadReleasePackage(packagePath);
    this.runtimeStatePath = path.resolve(runtimeStatePath);
    this.now = now;
    this.idFactory = idFactory;
    this.mediaRoot = '';
    this.ensureRuntimeState();
  }

  list() {
    return [this.release.manifest.hostSlug];
  }

  snapshot() {
    return null;
  }

  publicSnapshot(slug) {
    if (slug !== this.release.manifest.hostSlug) return null;
    const release = {
      id: this.release.manifest.releaseId,
      kind: this.release.manifest.releaseKind,
      draftRevision: Number(this.release.manifest.draftRevision || 1),
      digest: this.release.manifest.releaseDigest,
      createdAt: this.release.manifest.releaseCreatedAt,
      snapshot: clone(this.release.snapshot),
    };
    return {
      revision: release.draftRevision,
      draft: clone(this.release.snapshot),
      releases: [release],
      liveReleaseId: release.id,
      manualPaths: [],
      draftDigest: release.digest,
    };
  }

  recordRsvp(slug, activityId, name) {
    if (slug !== this.release.manifest.hostSlug) return { ok: false, reason: 'NOT_FOUND' };
    const label = String(name || '').trim();
    if (!label || label.length > 120) return { ok: false, reason: 'INVALID_NAME' };
    const activity = this.release.snapshot.activities.find((item) => item.id === activityId);
    if (!activity) return { ok: false, reason: 'ACTIVITY_NOT_FOUND' };

    const state = this.readRuntimeState();
    const record = {
      id: 'rsvp-' + this.idFactory(),
      activityId,
      name: label,
      createdAt: new Date(this.now()).toISOString(),
    };
    state.rsvps.push(record);
    writeAtomicJson(this.runtimeStatePath, state);
    return { ok: true, record: clone(record) };
  }

  diagnostics() {
    const state = this.readRuntimeState();
    return {
      releaseId: this.release.manifest.releaseId,
      releaseDigest: this.release.manifest.releaseDigest,
      packageDigest: this.release.manifest.packageDigest,
      rsvps: state.rsvps.length,
    };
  }

  mediaFile(publicPath) {
    const record = this.release.manifest.media.find((item) => item.publicPath === publicPath);
    if (!record) return null;
    const filePath = path.resolve(this.release.root, record.packagePath);
    if (filePath !== this.release.root && !filePath.startsWith(this.release.root + path.sep)) return null;
    return Object.freeze({
      path: filePath,
      mime: record.mime,
      bytes: record.bytes,
      sha256: record.sha256,
    });
  }

  ensureRuntimeState() {
    if (fs.existsSync(this.runtimeStatePath)) {
      this.readRuntimeState();
      return;
    }
    writeAtomicJson(this.runtimeStatePath, {
      version: 1,
      hostSlug: this.release.manifest.hostSlug,
      rsvps: [],
    });
  }

  readRuntimeState() {
    let state;
    try {
      state = JSON.parse(fs.readFileSync(this.runtimeStatePath, 'utf8'));
    } catch (error) {
      throw runtimeStoreError('DEPLOYED_RUNTIME_STATE_INVALID', 'Deployed runtime state could not be read: ' + error.message);
    }
    if (
      !state
      || state.version !== 1
      || state.hostSlug !== this.release.manifest.hostSlug
      || !Array.isArray(state.rsvps)
    ) {
      throw runtimeStoreError('DEPLOYED_RUNTIME_STATE_INVALID', 'Deployed runtime state is invalid.');
    }
    return state;
  }
}

module.exports = {
  DeployedReleaseStore,
  loadReleasePackage,
};
