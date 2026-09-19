'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { stableDigest } = require('./model');

function packageError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function safeChild(root, relative) {
  const base = path.resolve(root);
  const target = path.resolve(base, relative);
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw packageError('DEPLOYMENT_MEDIA_PATH_REJECTED', 'Deployment media path escapes its admitted root.');
  }
  return target;
}

function mediaSourcePath({ mediaRoot, publicRoot, hostSlug, assetPath }) {
  const publicPath = String(assetPath || '');
  const localPrefix = '/hivenues/media/local/';
  if (publicPath.startsWith(localPrefix)) {
    const relative = publicPath.slice(localPrefix.length);
    const normalized = relative.replaceAll('/', path.sep);
    const expectedPrefix = hostSlug + path.sep;
    if (!normalized.startsWith(expectedPrefix)) {
      throw packageError(
        'DEPLOYMENT_MEDIA_HOST_MISMATCH',
        'Deployment media path does not belong to the selected host.',
      );
    }
    return safeChild(mediaRoot, normalized);
  }

  if (!publicPath.startsWith('/hivenues/media/')) {
    throw packageError('DEPLOYMENT_MEDIA_PATH_REJECTED', 'Deployment media path is outside the admitted media namespace.');
  }
  return safeChild(publicRoot, publicPath.replace(/^\/+/, '').replaceAll('/', path.sep));
}

function extensionFor(asset) {
  const byMime = {
    'image/svg+xml': '.svg',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
  };
  return byMime[asset.mime] || '';
}

function requireExactRelease(store, hostSlug, releaseId) {
  const snapshot = store.snapshot(hostSlug);
  if (!snapshot) throw packageError('DEPLOYMENT_HOST_NOT_FOUND', 'HiVenues host was not found.');
  const release = snapshot.releases.find((item) => item.id === releaseId);
  if (!release) throw packageError('DEPLOYMENT_RELEASE_NOT_FOUND', 'Selected immutable Release was not found.');
  const calculated = stableDigest(release.snapshot);
  if (calculated !== release.digest) {
    throw packageError('DEPLOYMENT_RELEASE_DIGEST_MISMATCH', 'Selected Release digest does not match its immutable snapshot.');
  }
  return structuredClone(release);
}

function buildDeploymentPackage({
  store,
  hostSlug,
  releaseId,
  mediaRoot,
  publicRoot,
  packageRoot,
}) {
  if (!store || typeof store.snapshot !== 'function') throw new TypeError('Deployment package builder requires a HiVenues store.');
  if (!mediaRoot || !publicRoot || !packageRoot) throw new TypeError('Deployment package builder requires media, public and package roots.');

  const release = requireExactRelease(store, hostSlug, releaseId);
  const mediaRecords = [];
  const mediaCopies = [];

  for (const media of release.snapshot.media) {
    if (!media.asset) continue;
    const source = mediaSourcePath({
      mediaRoot,
      publicRoot,
      hostSlug,
      assetPath: media.asset.path,
    });
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
      throw packageError('DEPLOYMENT_MEDIA_MISSING', 'Release media is missing: ' + media.id);
    }
    const bytes = fs.readFileSync(source);
    if (bytes.length !== media.asset.bytes) {
      throw packageError('DEPLOYMENT_MEDIA_BYTES_MISMATCH', 'Release media byte count does not match: ' + media.id);
    }
    const digest = sha256(bytes);
    if (digest !== media.asset.sha256) {
      throw packageError('DEPLOYMENT_MEDIA_DIGEST_MISMATCH', 'Release media digest does not match: ' + media.id);
    }
    const packagePath = 'media/' + digest + extensionFor(media.asset);
    mediaRecords.push({
      mediaId: media.id,
      publicPath: media.asset.path,
      packagePath,
      mime: media.asset.mime,
      bytes: media.asset.bytes,
      sha256: media.asset.sha256,
    });
    mediaCopies.push({ source, packagePath });
  }

  mediaRecords.sort((left, right) => left.mediaId.localeCompare(right.mediaId));
  mediaCopies.sort((left, right) => left.packagePath.localeCompare(right.packagePath));

  const core = {
    schemaVersion: 1,
    hostSlug,
    hostId: release.snapshot.identity.hostId,
    releaseId: release.id,
    releaseKind: release.kind,
    releaseDigest: release.digest,
    releaseCreatedAt: release.createdAt,
    media: mediaRecords,
  };
  const packageDigest = stableDigest({
    manifest: core,
    releaseSnapshot: release.snapshot,
  });
  const manifest = Object.freeze({ ...core, packageDigest });

  const target = path.join(
    path.resolve(packageRoot),
    hostSlug,
    release.id + '-' + release.digest.slice(0, 12),
  );

  if (fs.existsSync(target)) {
    const existingManifestPath = path.join(target, 'manifest.json');
    if (!fs.existsSync(existingManifestPath)) {
      throw packageError('DEPLOYMENT_PACKAGE_COLLISION', 'Existing deployment package directory is incomplete.');
    }
    const existing = JSON.parse(fs.readFileSync(existingManifestPath, 'utf8'));
    if (existing.packageDigest !== packageDigest) {
      throw packageError('DEPLOYMENT_PACKAGE_COLLISION', 'Existing deployment package does not match this immutable Release.');
    }
    return Object.freeze({
      ...manifest,
      packagePath: target,
      reused: true,
    });
  }

  const parent = path.dirname(target);
  fs.mkdirSync(parent, { recursive: true });
  const temp = target + '.tmp-' + process.pid + '-' + crypto.randomBytes(6).toString('hex');
  fs.mkdirSync(temp, { recursive: false });
  try {
    fs.mkdirSync(path.join(temp, 'media'), { recursive: true });
    fs.writeFileSync(
      path.join(temp, 'release.json'),
      JSON.stringify(release.snapshot, null, 2) + '\n',
      'utf8',
    );
    for (const copy of mediaCopies) {
      const destination = safeChild(temp, copy.packagePath.replaceAll('/', path.sep));
      fs.copyFileSync(copy.source, destination, fs.constants.COPYFILE_EXCL);
    }
    fs.writeFileSync(
      path.join(temp, 'manifest.json'),
      JSON.stringify(manifest, null, 2) + '\n',
      'utf8',
    );
    fs.renameSync(temp, target);
  } catch (error) {
    fs.rmSync(temp, { recursive: true, force: true });
    throw error;
  }

  return Object.freeze({
    ...manifest,
    packagePath: target,
    reused: false,
  });
}

function createDeploymentPackageBuilder(options) {
  return Object.freeze({
    build(input) {
      return buildDeploymentPackage({ ...options, ...input });
    },
  });
}

module.exports = {
  buildDeploymentPackage,
  createDeploymentPackageBuilder,
  mediaSourcePath,
  requireExactRelease,
};
