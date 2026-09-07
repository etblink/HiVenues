'use strict';

const http = require('node:http');
const express = require('express');
const helmet = require('helmet');
const {
  createV2AuthoringStudioWorkspaceApp,
} = require('./studio-app');

const V2_TURNKEY_STUDIO_HOST = '127.0.0.1';

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
      host: V2_TURNKEY_STUDIO_HOST,
      port,
      exclusive: true,
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function stateChangeIsSameOrigin(request, origin) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  return request.get('origin') === origin;
}

function createLocalSecurityMiddleware(getOrigin) {
  return (request, response, next) => {
    const origin = getOrigin();
    if (!origin) {
      response.status(503).type('text/plain').send('Venue Studio is not ready.');
      return;
    }
    if (request.get('host') !== new URL(origin).host) {
      response.status(403).type('text/plain').send(
        'Venue Studio rejected an unexpected Host header.',
      );
      return;
    }
    if (!stateChangeIsSameOrigin(request, origin)) {
      response.status(403).type('text/plain').send(
        'Venue Studio rejected a cross-origin state change.',
      );
      return;
    }
    next();
  };
}

function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        frameSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
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
    referrerPolicy: { policy: 'same-origin' },
  });
}

async function startV2TurnkeyStudio({
  workspaceDirectory,
  port = 0,
  fsImpl,
} = {}) {
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) {
    throw new TypeError('v2 Venue Studio port must be an integer from 0 through 65535');
  }

  const studio = createV2AuthoringStudioWorkspaceApp({
    workspaceDirectory,
    ...(fsImpl ? { fsImpl } : {}),
  });
  let origin = null;
  const app = express();
  app.disable('x-powered-by');
  app.use(createLocalSecurityMiddleware(() => origin));
  app.use(securityHeaders());
  app.use(studio.app);

  const server = http.createServer(app);
  const address = await listen(server, port);
  origin = `http://${V2_TURNKEY_STUDIO_HOST}:${address.port}`;

  return Object.freeze({
    app,
    server,
    origin,
    url: `${origin}/studio-authoring`,
    workspaceDirectory: studio.workspaceDirectory,
    session: studio.session,
    proposal: studio.proposal,
    diagnostics: studio.diagnostics,
    persistence: studio.persistence,
    close: () => close(server),
  });
}

module.exports = {
  V2_TURNKEY_STUDIO_HOST,
  startV2TurnkeyStudio,
};
