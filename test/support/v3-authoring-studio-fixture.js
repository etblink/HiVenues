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

const REFERENCE_MEDIA_LABELS = Object.freeze({
  migratedPhysical: Object.freeze({ title: 'Northline Hall', subtitle: 'Live room artwork' }),
  nativeCreator: Object.freeze({ title: 'Signal Room', subtitle: 'Session artwork' }),
  nativeRelease: Object.freeze({ title: 'Northstar', subtitle: 'Release artwork' }),
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

function managedSvg(referenceId) {
  const copy = REFERENCE_MEDIA_LABELS[referenceId] || { title: 'HiVenues host', subtitle: 'Managed artwork' };
  const title = String(copy.title).replace(/[<>&'"]/g, '');
  const subtitle = String(copy.subtitle).replace(/[<>&'"]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-label="${title} — ${subtitle}">
  <rect width="1600" height="1000" fill="#e7e5e4"/>
  <circle cx="1290" cy="180" r="340" fill="#292524" opacity=".08"/>
  <circle cx="260" cy="860" r="420" fill="#292524" opacity=".06"/>
  <text x="100" y="170" fill="#292524" font-family="system-ui,sans-serif" font-size="54" font-weight="700">${title}</text>
  <text x="102" y="235" fill="#57534e" font-family="system-ui,sans-serif" font-size="28">${subtitle}</text>
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
  app.get('/fixtures/v3-s4/:asset', (_request, response) => {
    response.type('image/svg+xml').send(managedSvg(referenceId));
  });
  app.get('/fixtures/v2-renderer/:asset', (_request, response) => {
    response.type('image/svg+xml').send(managedSvg(referenceId));
  });
  app.use(base.app);
  return Object.freeze({ ...base, app, source, referenceId });
}

module.exports = {
  createReferenceV3AuthoringStudioFixture,
  withJourneyAssets,
};