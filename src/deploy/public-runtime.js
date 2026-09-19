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

function loadRuntimeProvenance(filePath) {
  let record;
  try {
    record = JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
  ) {
    throw runtimeError(
      'DEPLOYED_RUNTIME_PROVENANCE_INVALID',
      'Deployed runtime provenance is invalid.',
    );
  }
  return Object.freeze({
    version: 1,
    sourceSha: record.sourceSha,
    sourceTree: record.sourceTree,
    packageVersion: record.packageVersion,
    nodeVersion: record.nodeVersion,
  });
}

function createDeployedPublicApp({
  packagePath,
  runtimeStatePath,
  provenancePath,
  root = path.join(__dirname, '..', '..'),
  now = Date.now,
  idFactory,
} = {}) {
  if (!packagePath || !runtimeStatePath || !provenancePath) {
    throw new TypeError('Deployed public runtime requires package, state and provenance paths.');
  }

  const store = new DeployedReleaseStore({
    packagePath,
    runtimeStatePath,
    now,
    ...(idFactory ? { idFactory } : {}),
  });
  const provenance = loadRuntimeProvenance(provenancePath);
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
