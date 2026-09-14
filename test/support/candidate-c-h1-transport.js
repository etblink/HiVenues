'use strict';

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const {
  createCandidateCH1Spike,
} = require('./candidate-c-h1-spike');

const STUDIO_ISLAND = `'use strict';

document.addEventListener('htmx:beforeSwap', (event) => {
  if (event.detail.xhr.status === 409) {
    event.detail.shouldSwap = true;
    event.detail.isError = false;
  }
});

document.addEventListener('htmx:afterSwap', () => {
  const conflict = document.getElementById('conflict');
  if (conflict) {
    conflict.setAttribute('tabindex', '-1');
    conflict.focus({ preventScroll: false });
    return;
  }
  const title = document.querySelector('#activity-inspector input[name="title"]');
  if (title) title.focus({ preventScroll: true });
});
`;

function htmxClassicAssetFilename() {
  // htmx.org 2.x intentionally exposes the ESM build as package "main".
  // A classic browser <script> must use dist/htmx.min.js instead.
  return path.join(path.dirname(require.resolve('htmx.org')), 'htmx.min.js');
}

function createCandidateCH1Transport(options = {}) {
  const fixture = createCandidateCH1Spike(options);
  const app = express();

  // Transport-owned static assets are registered before the isolated core app.
  // This keeps the spike's durable domain state entirely server-side while
  // proving the browser transport with the package's intended classic bundle.
  app.get('/candidate-c/htmx.js', (_request, response) => {
    response.type('application/javascript').send(fs.readFileSync(htmxClassicAssetFilename(), 'utf8'));
  });
  app.get('/candidate-c/studio-island.js', (_request, response) => {
    response.type('application/javascript').send(STUDIO_ISLAND);
  });

  // The island is transport-only: 409 swap policy and focus restoration.
  // It carries no Host, Activity, draft, release, binding, or provider state.
  app.use((request, response, next) => {
    if (!request.path.startsWith('/studio')) return next();
    const send = response.send.bind(response);
    response.send = (body) => {
      let output = body;
      if (typeof output === 'string' && output.includes('</head>') && !output.includes('/candidate-c/studio-island.js')) {
        output = output.replace('</head>', '<script src="/candidate-c/studio-island.js" defer></script></head>');
      }
      return send(output);
    };
    return next();
  });

  app.use(fixture.app);

  return Object.freeze({
    ...fixture,
    app,
    transport: Object.freeze({
      htmxAsset: htmxClassicAssetFilename(),
      durableClientState: false,
      clientIslandResponsibilities: Object.freeze(['409-swap-policy', 'focus-restoration']),
    }),
  });
}

module.exports = {
  STUDIO_ISLAND,
  createCandidateCH1Transport,
  htmxClassicAssetFilename,
};
