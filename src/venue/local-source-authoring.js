'use strict';

const http = require('node:http');
const express = require('express');
const helmet = require('helmet');
const { createApp } = require('../app');
const { loadConfig } = require('../config');
const {
  createOfflineSourceAuthoringSurface,
} = require('./source-authoring-surface');
const {
  loadDeploymentAgnosticVenueSourceFile,
} = require('./source-file');

const LOCAL_SOURCE_AUTHORING_HOST = '127.0.0.1';
const LOCAL_SOURCE_AUTHORING_EDITOR_PATH = '/customize';

class LocalSourceAuthoringError extends Error {
  constructor(message, options = {}) {
    super(`Local source authoring failed: ${message}`, options);
    this.name = 'LocalSourceAuthoringError';
  }
}

function silentLogger() {
  return Object.freeze({
    child() { return this; },
    debug() {},
    error() {},
    info() {},
    warn() {},
  });
}

function createOfflineHiveBoundary() {
  const state = {
    rpcAttempts: 0,
    substitutedReadCalls: 0,
  };

  const rpcPool = Object.freeze({
    async call() {
      state.rpcAttempts += 1;
      throw new LocalSourceAuthoringError('Hive RPC is disabled in local source authoring');
    },
    getStatus() {
      return [];
    },
  });

  const hiveReadService = Object.freeze({
    async getOfficialCommunityPosts() {
      state.substitutedReadCalls += 1;
      return [];
    },
    async getCommunityPosts() {
      state.substitutedReadCalls += 1;
      return { items: [], nextCursor: null };
    },
  });

  return Object.freeze({
    hiveReadService,
    rpcPool,
    snapshot() {
      return Object.freeze({ ...state });
    },
  });
}

function createLocalConfig(venueContext, { origin, port }) {
  return loadConfig(
    {
      NODE_ENV: 'development',
      PORT: String(port),
      BIND_HOST: LOCAL_SOURCE_AUTHORING_HOST,
      APP_ORIGIN: origin,
      HIVE_RPC_NODES: 'https://127.0.0.1',
      HIVE_WRITE_MODE: 'disabled',
      HIVE_SIGNER_MODE: 'disabled',
      HIVE_PAYMENT_ENABLED: 'false',
      HIVE_MODERATION_ENABLED: 'false',
      DISTRIATOR_ENABLED: 'false',
      RATE_LIMIT_MAX: '10000',
      LOG_LEVEL: 'silent',
    },
    {
      loadDotenv: false,
      venue: venueContext,
    },
  );
}

function localSecurityMiddleware(origin) {
  return [
    (req, res, next) => {
      const host = req.get('host');
      const expectedHost = new URL(origin).host;
      if (host !== expectedHost) {
        res.status(403).type('text').send('Local venue editor rejected an unexpected Host header.');
        return;
      }

      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        const requestOrigin = req.get('origin');
        if (requestOrigin !== origin) {
          res.status(403).type('text').send('Local venue editor rejected a cross-origin state change.');
          return;
        }
      }
      next();
    },
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          frameSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:', 'https://images.hive.blog'],
          mediaSrc: ["'self'", 'blob:'],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-origin' },
      hsts: false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  ];
}

function applyPreviewProjection(previewApplication, projection) {
  previewApplication.locals.venue = projection.venueContext;
  previewApplication.locals.venuePackage = projection.venuePackage;
  previewApplication.locals.siteName = projection.siteName;
  previewApplication.locals.business = projection.business;
  previewApplication.locals.communityId = projection.venueContext.hive.communityId;
  previewApplication.locals.threadsContainerAccount =
    projection.venueContext.hive.threadsContainerAccount;
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve(server.address());
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen({
      host: LOCAL_SOURCE_AUTHORING_HOST,
      port,
      exclusive: true,
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function startLocalSourceAuthoring({
  sourceFilename,
  port = 0,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('fetchImpl must be a function');
  }
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) {
    throw new TypeError('port must be an integer between 0 and 65535');
  }

  const sourceInput = loadDeploymentAgnosticVenueSourceFile(sourceFilename);

  const hostApplication = express();
  hostApplication.disable('x-powered-by');
  const server = http.createServer(hostApplication);

  let address;
  try {
    address = await listen(server, port);
  } catch (error) {
    throw new LocalSourceAuthoringError('could not bind the loopback listener', { cause: error });
  }

  let runtime;
  try {
    if (!address || typeof address === 'string') {
      throw new LocalSourceAuthoringError('loopback listener did not return a TCP address');
    }

    const origin = `http://${LOCAL_SOURCE_AUTHORING_HOST}:${address.port}`;
    let previewApplication = null;
    const offlineHive = createOfflineHiveBoundary();

    const surface = createOfflineSourceAuthoringSurface({
      sourceInput,
      editorPath: LOCAL_SOURCE_AUTHORING_EDITOR_PATH,
      async renderPreviewHtml(projection) {
        if (!previewApplication) {
          throw new LocalSourceAuthoringError('preview application is not ready');
        }
        applyPreviewProjection(previewApplication, projection);
        const response = await fetchImpl(`${origin}/`, {
          headers: { accept: 'text/html' },
          redirect: 'error',
        });
        if (!response.ok) {
          throw new LocalSourceAuthoringError(
            `local preview renderer returned HTTP ${response.status}`,
          );
        }
        return response.text();
      },
    });

    const config = createLocalConfig(surface.session.acceptedSource.venueContext, {
      origin,
      port: address.port,
    });

    previewApplication = createApp({
      config,
      logger: silentLogger(),
      rpcPool: offlineHive.rpcPool,
      hiveReadService: offlineHive.hiveReadService,
      deploymentIdentity: Object.freeze({
        exact: false,
        build: 'local-source-authoring',
      }),
      onboardingEnvironment: Object.freeze({
        HIVE_ONBOARDING_ENABLED: 'false',
      }),
      venue: surface.session.acceptedSource.venueContext,
      venuePackage: surface.session.acceptedSource.venuePackage,
    });

    for (const middleware of localSecurityMiddleware(origin)) {
      hostApplication.use(middleware);
    }
    hostApplication.use(surface.router);
    hostApplication.use(previewApplication);

    let closed = false;
    runtime = Object.freeze({
      address: Object.freeze({
        address: address.address,
        family: address.family,
        port: address.port,
      }),
      diagnostics: offlineHive.snapshot,
      editorPath: surface.editorPath,
      origin,
      sourceFilePath: surface.sourceFilePath,
      url: `${origin}${surface.editorPath}`,
      async close() {
        if (closed) return;
        closed = true;
        await close(server);
      },
    });
  } catch (error) {
    try {
      await close(server);
    } catch {
      // Preserve the original construction failure.
    }
    if (error instanceof LocalSourceAuthoringError) throw error;
    throw new LocalSourceAuthoringError(error.message, { cause: error });
  }

  return runtime;
}

module.exports = {
  LOCAL_SOURCE_AUTHORING_EDITOR_PATH,
  LOCAL_SOURCE_AUTHORING_HOST,
  LocalSourceAuthoringError,
  createLocalConfig,
  createOfflineHiveBoundary,
  startLocalSourceAuthoring,
};
