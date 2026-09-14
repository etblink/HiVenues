'use strict';

const express = require('express');
const {
  createV3AuthoringStudioApp,
} = require('../../src/venue/v3/studio-app');
const {
  renderV3RobotsText,
  renderV3Route,
  renderV3SitemapXml,
} = require('../../src/venue/v3/renderer');
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

const REFERENCE_MEDIA_SCENES = Object.freeze({
  migratedPhysical: Object.freeze({
    ariaLabel: 'Northline Hall stage before a show',
    kind: 'stage',
  }),
  nativeCreator: Object.freeze({
    ariaLabel: 'Signal Room microphone and live-session waveform',
    kind: 'studio',
  }),
  nativeRelease: Object.freeze({
    ariaLabel: 'Northstar Afterglow release artwork',
    kind: 'release',
  }),
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

function escapeSvgText(value) {
  return String(value).replace(/[<>&'"]/g, '');
}

function managedSvg(referenceId) {
  const scene = REFERENCE_MEDIA_SCENES[referenceId]
    || { ariaLabel: 'HiVenues managed visual', kind: 'release' };
  const ariaLabel = escapeSvgText(scene.ariaLabel);

  if (scene.kind === 'stage') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-label="${ariaLabel}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#090b13"/><stop offset="1" stop-color="#171d31"/></linearGradient>
    <radialGradient id="rose" cx="50%" cy="20%" r="80%"><stop offset="0" stop-color="#ff6a78" stop-opacity=".9"/><stop offset="1" stop-color="#ff6a78" stop-opacity="0"/></radialGradient>
    <radialGradient id="blue" cx="50%" cy="20%" r="80%"><stop offset="0" stop-color="#8fd4ff" stop-opacity=".8"/><stop offset="1" stop-color="#8fd4ff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#bg)"/>
  <path d="M210 0 L640 760 L820 760 L470 0 Z" fill="url(#rose)" opacity=".48"/>
  <path d="M1130 0 L780 760 L960 760 L1390 0 Z" fill="url(#blue)" opacity=".42"/>
  <rect x="170" y="690" width="1260" height="150" rx="18" fill="#05070c"/>
  <rect x="755" y="380" width="16" height="310" rx="8" fill="#d6d3d1" opacity=".82"/>
  <ellipse cx="763" cy="357" rx="48" ry="62" fill="#f5f5f4" opacity=".88"/>
  <path d="M0 920 C180 820 300 910 470 842 C630 778 760 900 930 830 C1120 752 1320 860 1600 770 L1600 1000 L0 1000 Z" fill="#020305"/>
  <g fill="#292524"><circle cx="190" cy="865" r="58"/><circle cx="390" cy="900" r="70"/><circle cx="620" cy="860" r="62"/><circle cx="1010" cy="875" r="68"/><circle cx="1270" cy="842" r="60"/><circle cx="1470" cy="880" r="72"/></g>
</svg>`;
  }

  if (scene.kind === 'studio') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-label="${ariaLabel}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#120f0d"/><stop offset="1" stop-color="#2a1d18"/></linearGradient>
    <radialGradient id="glow" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#f4a261" stop-opacity=".52"/><stop offset="1" stop-color="#f4a261" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#bg)"/>
  <rect width="1600" height="1000" fill="url(#glow)"/>
  <g fill="none" stroke="#f6bd60" stroke-width="18" stroke-linecap="round" opacity=".78">
    <path d="M120 520 H260 L320 430 L390 610 L470 350 L560 665 L650 470 L735 550"/>
    <path d="M865 550 L950 470 L1040 665 L1130 350 L1210 610 L1280 430 L1340 520 H1480"/>
  </g>
  <rect x="704" y="224" width="192" height="340" rx="96" fill="#f5f5f4" opacity=".92"/>
  <rect x="760" y="540" width="80" height="210" rx="40" fill="#d6d3d1"/>
  <rect x="650" y="742" width="300" height="24" rx="12" fill="#d6d3d1"/>
  <circle cx="800" cy="394" r="42" fill="#2a1d18" opacity=".78"/>
  <g fill="#f5f5f4" opacity=".18"><circle cx="250" cy="210" r="140"/><circle cx="1370" cy="780" r="190"/></g>
</svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-label="${ariaLabel}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#080808"/><stop offset=".55" stop-color="#17110f"/><stop offset="1" stop-color="#2b1711"/></linearGradient>
    <radialGradient id="sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd19a"/><stop offset=".42" stop-color="#f28f5b"/><stop offset="1" stop-color="#b7492f" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#bg)"/>
  <circle cx="1110" cy="420" r="330" fill="url(#sun)" opacity=".95"/>
  <circle cx="1110" cy="420" r="164" fill="#100d0c" opacity=".86"/>
  <circle cx="1110" cy="420" r="236" fill="none" stroke="#ffd19a" stroke-width="3" opacity=".48"/>
  <path d="M0 770 C230 690 380 820 560 744 C760 660 860 790 1040 730 C1240 662 1390 704 1600 620 L1600 1000 L0 1000 Z" fill="#060606"/>
  <path d="M180 300 C390 180 590 210 750 360" fill="none" stroke="#f28f5b" stroke-width="5" opacity=".34"/>
  <path d="M210 350 C410 250 580 270 710 390" fill="none" stroke="#ffd19a" stroke-width="2" opacity=".38"/>
  <g fill="#ffd19a" opacity=".72"><circle cx="248" cy="230" r="6"/><circle cx="430" cy="166" r="4"/><circle cx="655" cy="240" r="5"/><circle cx="884" cy="126" r="4"/></g>
</svg>`;
}

function requestOrigin(request) {
  return `${request.protocol}://${request.get('host')}`;
}

function currentPreviewSource(base) {
  return base.proposal()?.previewSource || base.session().draftSource;
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
  app.get('/robots.txt', (request, response) => {
    response.type('text/plain').send(renderV3RobotsText(currentPreviewSource(base), {
      canonicalOrigin: requestOrigin(request),
    }));
  });
  app.get('/sitemap.xml', (request, response) => {
    response.type('application/xml').send(renderV3SitemapXml(currentPreviewSource(base), {
      canonicalOrigin: requestOrigin(request),
    }));
  });
  app.use('/v3-preview', (request, response) => {
    try {
      response.set('Cache-Control', 'no-store');
      response.type('html').send(renderV3Route(currentPreviewSource(base), request.path || '/', {
        legacyEventRoutes: reference.legacyEventRoutes,
        canonicalOrigin: requestOrigin(request),
      }));
    } catch (error) {
      response.status(404).type('text').send(error.message);
    }
  });
  app.use(base.app);
  return Object.freeze({ ...base, app, source, referenceId });
}

module.exports = {
  createReferenceV3AuthoringStudioFixture,
  withJourneyAssets,
};
