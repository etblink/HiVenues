'use strict';

const path = require('node:path');
const express = require('express');
const {
  renderV2EventDetail,
  renderV2PublicStylesheet,
  renderV2ThemeStylesheet,
} = require('../../src/venue/v2/renderer');
const {
  SAFE_V2_READ_ONLY_STUDIO_ERROR,
  V2ReadOnlyStudioError,
  renderV2ReadOnlyStudioPreview,
  renderV2ReadOnlyStudioSurface,
} = require('../../src/venue/v2/studio-read-only');
const {
  REFERENCE_FACTORIES,
} = require('./v2-renderer-fixture');

const PUBLIC_ROOT = path.join(__dirname, '..', '..', 'public');

const SYNTHETIC_ASSETS = Object.freeze({
  'restaurant-logo.svg': ['Harbor & Hearth · logo', '#f3eadf', '#211a16'],
  'restaurant-dining.svg': ['Harbor & Hearth · dining room', '#a76e43', '#fffaf3'],
  'restaurant-private.svg': ['Harbor & Hearth · private dining', '#d7c2a9', '#2b211b'],
  'restaurant-plate.svg': ['Harbor & Hearth · seasonal plate', '#6d7462', '#fffaf3'],
  'music-logo.svg': ['Northline Hall · logo', '#111525', '#ff6a78'],
  'music-stage.svg': ['Northline Hall · stage', '#171d31', '#8fd4ff'],
  'music-poster-one.svg': ['The Static Lights · poster', '#351728', '#ff929d'],
  'music-poster-two.svg': ['Signal / Noise · poster', '#102b3c', '#8fd4ff'],
});

function syntheticSvg(label, background, foreground) {
  const safe = String(label).replace(/[<>&'"]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-label="${safe}">
  <rect width="1600" height="1000" fill="${background}"/>
  <circle cx="1240" cy="210" r="320" fill="${foreground}" opacity=".08"/>
  <circle cx="300" cy="860" r="420" fill="${foreground}" opacity=".06"/>
  <path d="M0 720 C360 570 590 890 960 670 C1210 520 1380 610 1600 490 V1000 H0Z" fill="${foreground}" opacity=".09"/>
  <text x="110" y="170" fill="${foreground}" font-family="system-ui,sans-serif" font-size="58" font-weight="700">${safe}</text>
  <text x="112" y="235" fill="${foreground}" opacity=".72" font-family="system-ui,sans-serif" font-size="28">Synthetic HiVenues reference artwork</text>
</svg>`;
}

function queryObject(request) {
  const allowed = new Set(['nodeId', 'fieldId', 'viewport']);
  const keys = Object.keys(request.query);
  if (keys.some((key) => !allowed.has(key))) {
    throw new V2ReadOnlyStudioError('query contains unsupported keys');
  }
  const result = {};
  for (const key of keys) {
    const value = request.query[key];
    if (typeof value !== 'string' || value.length === 0) {
      throw new V2ReadOnlyStudioError('query values must be non-empty scalar strings');
    }
    result[key] = value;
  }
  return result;
}

function createV2ReadOnlyStudioFixture(sourceInput) {
  const sourceFactory = typeof sourceInput === 'function' ? sourceInput : () => sourceInput;
  const source = sourceFactory();
  const app = express();
  const diagnostics = {
    requests: 0,
    studioGets: 0,
    previewGets: 0,
    mutationRequests: 0,
    hiveRpcAttempts: 0,
    writes: 0,
  };

  app.disable('x-powered-by');
  app.use((request, _response, next) => {
    diagnostics.requests += 1;
    if (!['GET', 'HEAD'].includes(request.method)) diagnostics.mutationRequests += 1;
    next();
  });

  app.get('/studio', (request, response) => {
    diagnostics.studioGets += 1;
    try {
      response.type('html').send(renderV2ReadOnlyStudioSurface({
        sourceInput: source,
        query: queryObject(request),
        studioPath: '/studio',
        previewPathForPage(page) {
          return `/studio-preview/page/${encodeURIComponent(page.id)}`;
        },
      }));
    } catch (error) {
      if (error instanceof V2ReadOnlyStudioError) {
        response.status(400).type('text/plain').send(SAFE_V2_READ_ONLY_STUDIO_ERROR);
        return;
      }
      throw error;
    }
  });

  function previewOptions() {
    return {
      basePath: '/studio-preview/site',
      stylesheetHref: '/__hivenues-v2/styles.css',
      themeStylesheetHref: '/__hivenues-v2/theme.css',
      eventBasePath: '/events',
      capabilityPaths: {
        community: '/community',
        transaction: '/pay',
      },
    };
  }

  function sendPreviewPage(response, pageId) {
    diagnostics.previewGets += 1;
    try {
      response.type('html').send(renderV2ReadOnlyStudioPreview(
        source,
        pageId,
        previewOptions(),
      ));
    } catch (error) {
      response.status(404).type('text/plain').send(error.message);
    }
  }

  app.get('/studio-preview/page/:pageId', (request, response) => {
    sendPreviewPage(response, request.params.pageId);
  });
  app.get('/studio-preview/site/', (_request, response) => {
    sendPreviewPage(response, source.site.homePageId);
  });
  app.get('/studio-preview/site/community', (_request, response) => {
    if (source.capabilities.community.state !== 'configured') {
      response.status(404).type('text/plain').send('Community capability is disabled.');
      return;
    }
    response.type('html').send('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Community preview</title></head><body><main><h1>Community</h1><p>Read-only Studio capability placeholder. No Hive RPC was attempted.</p></main></body></html>');
  });
  app.get('/studio-preview/site/events/:eventSlug', (request, response) => {
    diagnostics.previewGets += 1;
    try {
      response.type('html').send(renderV2EventDetail(
        source,
        request.params.eventSlug,
        previewOptions(),
      ));
    } catch (error) {
      response.status(404).type('text/plain').send(error.message);
    }
  });
  app.get('/studio-preview/site/:pageSlug', (request, response, next) => {
    if (request.params.pageSlug === '__hivenues-v2') return next();
    const page = source.site.pages.find((candidate) => candidate.slug === request.params.pageSlug);
    if (!page) {
      response.status(404).type('text/plain').send('Preview page not found.');
      return;
    }
    sendPreviewPage(response, page.id);
  });

  app.get('/studio-preview/site/__hivenues-v2/styles.css', (_request, response) => {
    response.type('text/css').send(renderV2PublicStylesheet());
  });
  app.get('/studio-preview/site/__hivenues-v2/theme.css', (_request, response) => {
    response.type('text/css').send(renderV2ThemeStylesheet(source));
  });

  app.use(express.static(PUBLIC_ROOT, { fallthrough: true, index: false }));

  app.get('/fixtures/v2-renderer/:asset', (request, response) => {
    const spec = SYNTHETIC_ASSETS[request.params.asset];
    if (!spec) {
      response.status(404).type('text/plain').send('Fixture asset not found.');
      return;
    }
    response.type('image/svg+xml').send(syntheticSvg(...spec));
  });

  app.all('/studio', (request, response, next) => {
    if (['GET', 'HEAD'].includes(request.method)) return next();
    response.status(405).set('Allow', 'GET, HEAD').type('text/plain').send('Read-only Studio accepts GET and HEAD only.');
  });
  app.use('/studio-preview', (request, response, next) => {
    if (['GET', 'HEAD'].includes(request.method)) return next();
    response.status(405).set('Allow', 'GET, HEAD').type('text/plain').send('Read-only preview accepts GET and HEAD only.');
  });

  return Object.freeze({
    app,
    source,
    diagnostics() {
      return Object.freeze({ ...diagnostics });
    },
  });
}

function createReferenceV2ReadOnlyStudioFixture(referenceId) {
  const factory = REFERENCE_FACTORIES[referenceId];
  if (!factory) throw new TypeError(`Unknown v2 Studio reference: ${referenceId}`);
  return createV2ReadOnlyStudioFixture(factory);
}

module.exports = {
  createReferenceV2ReadOnlyStudioFixture,
  createV2ReadOnlyStudioFixture,
};
