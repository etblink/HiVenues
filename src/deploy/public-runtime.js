'use strict';

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');

const { createDeployedPublicRouter } = require('./public-router');
const { DeployedReleaseStore } = require('./release-store');

const LOOPBACK_HOST = '127.0.0.1';
const SHA1_PATTERN = /^[a-f0-9]{40}$/;

function runtimeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function sha256(value) {
  return require('node:crypto').createHash('sha256').update(value).digest('hex');
}

function loadRuntimeProvenance(filePath, manifestPath) {
  let record;
  let manifest;
  try {
    record = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw runtimeError(
      'DEPLOYED_RUNTIME_PROVENANCE_UNREADABLE',
      'Deployed runtime provenance could not be read: ' + error.message,
    );
  }

  if (
    !record
    || record.version !== 1
    || !SHA1_PATTERN.test(String(record.sourceSha || ''))
    || !SHA1_PATTERN.test(String(record.sourceTree || ''))
    || typeof record.packageVersion !== 'string'
    || !record.packageVersion
    || typeof record.nodeVersion !== 'string'
    || !record.nodeVersion
    || !/^[a-f0-9]{64}$/.test(String(record.bundleDigest || ''))
    || !manifest
    || manifest.version !== 1
    || !Array.isArray(manifest.files)
    || manifest.sourceSha !== record.sourceSha
    || manifest.sourceTree !== record.sourceTree
    || manifest.packageVersion !== record.packageVersion
    || manifest.nodeVersion !== record.nodeVersion
    || manifest.bundleDigest !== record.bundleDigest
  ) {
    throw runtimeError(
      'DEPLOYED_RUNTIME_PROVENANCE_INVALID',
      'Deployed runtime provenance is invalid.',
    );
  }

  const manifestCore = {
    version: manifest.version,
    sourceSha: manifest.sourceSha,
    sourceTree: manifest.sourceTree,
    packageVersion: manifest.packageVersion,
    nodeVersion: manifest.nodeVersion,
    files: manifest.files,
  };
  const calculatedBundleDigest = sha256(Buffer.from(JSON.stringify(manifestCore), 'utf8'));
  if (calculatedBundleDigest !== manifest.bundleDigest) {
    throw runtimeError(
      'DEPLOYED_RUNTIME_BUNDLE_DIGEST_MISMATCH',
      'Deployed runtime bundle manifest digest changed.',
    );
  }

  const runtimeRoot = path.dirname(path.resolve(manifestPath));
  for (const file of manifest.files) {
    if (
      !file
      || typeof file.path !== 'string'
      || !Number.isInteger(file.bytes)
      || file.bytes < 0
      || !/^[a-f0-9]{64}$/.test(String(file.sha256 || ''))
    ) {
      throw runtimeError(
        'DEPLOYED_RUNTIME_MANIFEST_INVALID',
        'Deployed runtime bundle manifest contains an invalid file record.',
      );
    }
    const resolved = path.resolve(runtimeRoot, file.path);
    if (resolved !== runtimeRoot && !resolved.startsWith(runtimeRoot + path.sep)) {
      throw runtimeError(
        'DEPLOYED_RUNTIME_MANIFEST_INVALID',
        'Deployed runtime bundle file escapes its runtime root.',
      );
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      throw runtimeError(
        'DEPLOYED_RUNTIME_FILE_MISSING',
        'Deployed runtime bundle file is missing: ' + file.path,
      );
    }
    const bytes = fs.readFileSync(resolved);
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256) {
      throw runtimeError(
        'DEPLOYED_RUNTIME_FILE_DIGEST_MISMATCH',
        'Deployed runtime bundle file changed: ' + file.path,
      );
    }
  }

  return Object.freeze({
    version: 1,
    sourceSha: record.sourceSha,
    sourceTree: record.sourceTree,
    packageVersion: record.packageVersion,
    nodeVersion: record.nodeVersion,
    bundleDigest: record.bundleDigest,
  });
}

function createDeployedPublicApp({
  packagePath,
  runtimeStatePath,
  provenancePath,
  manifestPath,
  root = path.join(__dirname, '..', '..'),
  now = Date.now,
  idFactory,
} = {}) {
  if (!packagePath || !runtimeStatePath || !provenancePath || !manifestPath) {
    throw new TypeError('Deployed public runtime requires package, state, provenance and manifest paths.');
  }

  const store = new DeployedReleaseStore({
    packagePath,
    runtimeStatePath,
    now,
    ...(idFactory ? { idFactory } : {}),
  });
  const provenance = loadRuntimeProvenance(provenancePath, manifestPath);
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.set('views', path.join(root, 'views'));
  app.set('view engine', 'ejs');
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));
  app.use('/css', express.static(path.join(root, 'public', 'css'), {
    dotfiles: 'deny',
    index: false,
    redirect: false,
  }));
  app.use('/js', express.static(path.join(root, 'public', 'js'), {
    dotfiles: 'deny',
    index: false,
    redirect: false,
  }));
  app.use('/htmx', express.static(path.dirname(require.resolve('htmx.org')), {
    dotfiles: 'deny',
    index: false,
    redirect: false,
  }));

  app.get('/hivenues/media/*path', (req, res, next) => {
    const publicPath = req.originalUrl.split('?')[0];
    const media = store.mediaFile(publicPath);
    if (!media) return next();
    res.type(media.mime);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('ETag', '"' + media.sha256 + '"');
    return res.sendFile(media.path);
  });

  const readBack = () => Object.freeze({
    version: 1,
    status: 'healthy',
    runtime: {
      sourceSha: provenance.sourceSha,
      sourceTree: provenance.sourceTree,
      packageVersion: provenance.packageVersion,
      nodeVersion: provenance.nodeVersion,
      bundleDigest: provenance.bundleDigest,
      platform: process.platform + '-' + process.arch,
    },
    deployment: {
      hostSlug: store.release.manifest.hostSlug,
      releaseId: store.release.manifest.releaseId,
      releaseDigest: store.release.manifest.releaseDigest,
      packageDigest: store.release.manifest.packageDigest,
    },
  });

  app.get('/__hivenues/health', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    return res.json(readBack());
  });

  app.get('/__hivenues/release', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    return res.json(readBack().deployment);
  });

  app.get('/', (_req, res) => (
    res.redirect(303, '/hivenues/' + encodeURIComponent(store.release.manifest.hostSlug))
  ));

  app.use('/hivenues', createDeployedPublicRouter({ store }));

  app.use((_req, res) => res.sendStatus(404));
  return Object.freeze({ app, store, provenance, readBack });
}

function startDeployedPublicServer(app, {
  port = 4317,
  host = LOOPBACK_HOST,
} = {}) {
  if (host !== LOOPBACK_HOST) {
    throw runtimeError(
      'DEPLOYED_RUNTIME_BIND_REJECTED',
      'HiVenues deployed runtime must bind loopback behind the qualified reverse proxy.',
    );
  }
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => resolve(server));
    server.once('error', reject);
  });
}

module.exports = {
  LOOPBACK_HOST,
  createDeployedPublicApp,
  loadRuntimeProvenance,
  startDeployedPublicServer,
};
