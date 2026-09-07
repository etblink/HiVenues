'use strict';

const express = require('express');
const {
  SAFE_V2_AUTHORING_STUDIO_ERROR,
  createV2AuthoringStudioApp,
  createV2AuthoringStudioWorkspaceApp,
} = require('../../src/venue/v2/studio-app');
const {
  REFERENCE_FACTORIES,
} = require('./v2-renderer-fixture');

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
  <text x="110" y="170" fill="${foreground}" font-family="system-ui,sans-serif" font-size="58" font-weight="700">${safe}</text>
  <text x="112" y="235" fill="${foreground}" opacity=".72" font-family="system-ui,sans-serif" font-size="28">Synthetic HiVenues reference artwork</text>
</svg>`;
}

function withReferenceAssets(base) {
  const app = express();
  app.get('/fixtures/v2-renderer/:asset', (request, response, next) => {
    const spec = SYNTHETIC_ASSETS[request.params.asset];
    if (!spec) return next();
    return response.type('image/svg+xml').send(syntheticSvg(...spec));
  });
  app.use(base.app);
  return Object.freeze({ ...base, app });
}

function createV2AuthoringStudioFixture(sourceInput, options = {}) {
  return withReferenceAssets(createV2AuthoringStudioApp(sourceInput, options));
}

function createReferenceV2AuthoringStudioFixture(referenceId, options = {}) {
  const factory = REFERENCE_FACTORIES[referenceId];
  if (!factory) throw new TypeError(`Unknown v2 authoring Studio reference: ${referenceId}`);
  return createV2AuthoringStudioFixture(factory, options);
}

function createV2AuthoringStudioWorkspaceFixture(options = {}) {
  return withReferenceAssets(createV2AuthoringStudioWorkspaceApp(options));
}

module.exports = {
  SAFE_V2_AUTHORING_STUDIO_ERROR,
  createReferenceV2AuthoringStudioFixture,
  createV2AuthoringStudioFixture,
  createV2AuthoringStudioWorkspaceFixture,
};
