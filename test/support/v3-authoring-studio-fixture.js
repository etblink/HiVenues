'use strict';

const express = require('express');
const {
  createV3AuthoringStudioApp,
} = require('../../src/venue/v3/studio-app');
const {
  createV3DeploymentAgnosticVenueSource,
} = require('../../src/venue/v3/source');
const {
  migratedPhysicalReference,
  nativeCreatorSource,
  nativeReleaseSource,
} = require('./v3-reference-fixtures');

const REFERENCES = Object.freeze({
  migratedPhysical: () => {
    const migrated = migratedPhysicalReference();
    return { source: migrated.source, legacyEventRoutes: migrated.legacyEventRoutes };
  },
  nativeCreator: () => ({ source: nativeCreatorSource(), legacyEventRoutes: {} }),
  nativeRelease: () => ({ source: nativeReleaseSource(), legacyEventRoutes: {} }),
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function withJourneyAssets(source, referenceId) {
  const candidate = clone(source);
  for (const suffix of ['a', 'b']) {
    const id = `s4-${referenceId.toLowerCase()}-promo-${suffix}`;
    candidate.media.assets.push({
      id,
      src: `/fixtures/v3-s4/${id}.svg`,
      width: 1600,
      height: 1000,
    });
  }
  return createV3DeploymentAgnosticVenueSource(candidate);
}

function syntheticSvg(label) {
  const safe = String(label).replace(/[<>&'"]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-label="${safe}">
  <rect width="1600" height="1000" fill="#e7e5e4"/>
  <circle cx="1290" cy="180" r="340" fill="#292524" opacity=".08"/>
  <circle cx="260" cy="860" r="420" fill="#292524" opacity=".06"/>
  <text x="100" y="170" fill="#292524" font-family="system-ui,sans-serif" font-size="54" font-weight="700">${safe}</text>
  <text x="102" y="235" fill="#57534e" font-family="system-ui,sans-serif" font-size="28">Synthetic S4 managed media</text>
</svg>`;
}

function createReferenceV3AuthoringStudioFixture(referenceId, options = {}) {
  const factory = REFERENCES[referenceId];
  if (!factory) throw new TypeError(`Unknown v3 S4 Studio reference: ${referenceId}`);
  const reference = factory();
  const source = withJourneyAssets(reference.source, referenceId);
  const base = createV3AuthoringStudioApp(source, {
    sourceFilename: options.sourceFilename || null,
    legacyEventRoutes: reference.legacyEventRoutes,
  });
  const app = express();
  app.get('/fixtures/v3-s4/:asset', (request, response) => {
    response.type('image/svg+xml').send(syntheticSvg(request.params.asset));
  });
  app.get('/fixtures/v2-renderer/:asset', (request, response) => {
    response.type('image/svg+xml').send(syntheticSvg(request.params.asset));
  });
  app.use(base.app);
  return Object.freeze({ ...base, app, source, referenceId });
}

module.exports = {
  createReferenceV3AuthoringStudioFixture,
  withJourneyAssets,
};
