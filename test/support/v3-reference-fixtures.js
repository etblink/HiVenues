'use strict';

const path = require('node:path');
const express = require('express');
const {
  DEFAULT_DESIGN_COLORS,
} = require('../../src/venue/v2/source');
const {
  V3_SOURCE_KIND,
  createV3DeploymentAgnosticVenueSource,
} = require('../../src/venue/v3/source');
const {
  buildV2ToV3LegacyEventRouteMap,
  migrateV2DeploymentAgnosticVenueSourceToV3,
} = require('../../src/venue/v3/migrate-v2');
const {
  renderV3PublicStylesheet,
  renderV3Route,
} = require('../../src/venue/v3/renderer');
const {
  musicSource,
} = require('./v2-renderer-fixture');

const ROOT = path.join(__dirname, '..', '..');
const PUBLIC_ROOT = path.join(ROOT, 'public');

function baseDesign(overrides = {}) {
  return {
    colors: { ...DEFAULT_DESIGN_COLORS, ...(overrides.colors || {}) },
    typographyRecipeId: overrides.typographyRecipeId || 'type-system-sans',
    densityRecipeId: overrides.densityRecipeId || 'density-standard',
    shapeRecipeId: overrides.shapeRecipeId || 'shape-soft',
    surfaceRecipeId: overrides.surfaceRecipeId || 'surface-layered',
  };
}

function disabledCapabilities() {
  return {
    community: { state: 'disabled' },
    transaction: { state: 'disabled' },
  };
}

function emptyBindings() {
  return {
    hiveSocial: [],
    providerMedia: [],
    syndication: [],
    value: [],
    commerce: [],
    discovery: [],
  };
}

function narrativeHero({ eyebrow, heading, body, note = null }) {
  return {
    id: 'home-hero',
    kind: 'venue-hero',
    recipeId: 'hero-text-led',
    content: {
      eyebrow,
      heading,
      body,
      note,
      media: null,
      primaryAction: null,
    },
    responsive: { tablet: {}, mobile: { textMeasure: 'narrow' } },
  };
}

function activityList({ id, kicker, heading, intro, resourceIds }) {
  return {
    id,
    kind: 'activity-list',
    recipeId: 'list-card-grid',
    content: {
      kicker,
      heading,
      intro,
      emptyLead: 'Nothing is scheduled yet.',
      emptyBody: 'New activity will appear here when it is ready.',
      resourceIds,
    },
    responsive: { tablet: { columns: 2 }, mobile: { columns: 1, density: 'compact' } },
  };
}

function migratedPhysicalReference() {
  const v2 = musicSource();
  return {
    source: migrateV2DeploymentAgnosticVenueSourceToV3(v2),
    legacyEventRoutes: buildV2ToV3LegacyEventRouteMap(v2),
    v2,
  };
}

function nativeCreatorSource() {
  return createV3DeploymentAgnosticVenueSource({
    kind: V3_SOURCE_KIND,
    schemaVersion: 3,
    provenance: {
      origin: 'native-v3',
      sourceSchemaVersion: null,
      sourceDigest: null,
      migrationContractVersion: null,
      starterId: 'creator-live',
    },
    venue: {
      id: 'signal-room-creator',
      displayName: 'Signal Room Creator Example',
      business: null,
      language: {
        operatorNoun: 'creator',
        staffRole: 'host',
      },
    },
    media: { assets: [] },
    resources: {
      activities: [
        {
          id: 'live-session-one',
          slug: 'live-session-one',
          title: 'Live Session One',
          description: 'A synthetic online creator session used to prove locationless occurrence semantics.',
          temporal: {
            kind: 'OCCURRENCE',
            startAt: '2026-10-05T19:00:00-07:00',
            endAt: '2026-10-05T20:15:00-07:00',
          },
          lifecycle: 'SCHEDULED',
          presence: {
            kind: 'ONLINE',
            destinations: [
              {
                id: 'watch-live',
                label: 'Watch live',
                href: 'https://stream.example/live-session-one',
              },
            ],
          },
          access: {
            note: 'Open online session.',
            capacity: 'AVAILABLE',
          },
          managedMedia: [],
          publicActions: [],
          seriesRef: null,
        },
      ],
      programs: [],
      menus: [],
      equipment: [],
    },
    activityBindings: emptyBindings(),
    site: {
      id: 'signal-room-site',
      homePageId: 'home',
      brand: {
        logoAssetId: null,
        design: baseDesign({
          typographyRecipeId: 'type-grotesk-display',
          shapeRecipeId: 'shape-crisp',
          surfaceRecipeId: 'surface-flat',
        }),
      },
      pages: [
        {
          id: 'home',
          slug: '',
          title: 'Home',
          seo: {
            title: 'Signal Room Creator Example',
            description: 'Synthetic locationless creator reference for HiVenues v3.',
          },
          components: [
            narrativeHero({
              eyebrow: 'Independent creator',
              heading: 'A host without a fabricated storefront',
              body: 'This reference exists to prove that HiVenues can represent online host activity without inventing physical venue facts.',
              note: 'Synthetic reference only.',
            }),
            activityList({
              id: 'home-activities',
              kicker: 'Upcoming',
              heading: 'Live sessions',
              intro: 'The activity remains a HiVenues domain object even when its destination is online.',
              resourceIds: ['live-session-one'],
            }),
          ],
        },
      ],
      navigation: [
        { id: 'nav-home', label: 'Home', target: { kind: 'page', pageId: 'home' } },
      ],
    },
    capabilities: disabledCapabilities(),
  });
}

function nativeReleaseSource() {
  return createV3DeploymentAgnosticVenueSource({
    kind: V3_SOURCE_KIND,
    schemaVersion: 3,
    provenance: {
      origin: 'native-v3',
      sourceSchemaVersion: null,
      sourceDigest: null,
      migrationContractVersion: null,
      starterId: 'creator-release',
    },
    venue: {
      id: 'northstar-release-host',
      displayName: 'Northstar Release Host Example',
      business: null,
      language: {
        operatorNoun: 'artist',
        staffRole: 'team',
      },
    },
    media: { assets: [] },
    resources: {
      activities: [
        {
          id: 'afterglow-release',
          slug: 'afterglow-release',
          title: 'Afterglow Release',
          description: 'A synthetic release/premiere proving that an activity can have a release moment with no fake attendance location.',
          temporal: {
            kind: 'RELEASE',
            releaseAt: '2026-11-14T09:00:00-08:00',
          },
          lifecycle: 'SCHEDULED',
          presence: { kind: 'NONE' },
          access: {
            note: null,
            capacity: 'UNSPECIFIED',
          },
          managedMedia: [],
          publicActions: [],
          seriesRef: null,
        },
      ],
      programs: [],
      menus: [],
      equipment: [],
    },
    activityBindings: emptyBindings(),
    site: {
      id: 'northstar-release-site',
      homePageId: 'home',
      brand: {
        logoAssetId: null,
        design: baseDesign({
          typographyRecipeId: 'type-editorial',
          densityRecipeId: 'density-generous',
          surfaceRecipeId: 'surface-flat',
        }),
      },
      pages: [
        {
          id: 'home',
          slug: '',
          title: 'Home',
          seo: {
            title: 'Northstar Release Host Example',
            description: 'Synthetic release/premiere reference for HiVenues v3.',
          },
          components: [
            narrativeHero({
              eyebrow: 'New release',
              heading: 'A release is an activity without a fake room',
              body: 'This reference pressures release-time semantics independently of physical occurrence assumptions.',
              note: 'Synthetic reference only.',
            }),
            activityList({
              id: 'home-releases',
              kicker: 'Release',
              heading: 'Premieres and releases',
              intro: 'A release moment uses the same activity family as other host activity without pretending to be a concert.',
              resourceIds: ['afterglow-release'],
            }),
          ],
        },
      ],
      navigation: [
        { id: 'nav-home', label: 'Home', target: { kind: 'page', pageId: 'home' } },
      ],
    },
    capabilities: disabledCapabilities(),
  });
}

function createV3PreviewFixture(sourceInput, options = {}) {
  const source = createV3DeploymentAgnosticVenueSource(sourceInput);
  const legacyEventRoutes = options.legacyEventRoutes || {};
  const diagnostics = {
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
  };
  const app = express();
  app.get('/__hivenues-v3/styles.css', (_request, response) => {
    response.type('text/css').send(renderV3PublicStylesheet());
  });
  app.use(express.static(PUBLIC_ROOT, { fallthrough: true, index: false }));
  app.use((request, response) => {
    try {
      response.type('html').send(renderV3Route(source, request.path, { legacyEventRoutes }));
    } catch (error) {
      response.status(404).type('text').send(error.message);
    }
  });
  return { app, diagnostics, legacyEventRoutes, source };
}

const REFERENCE_FACTORIES = Object.freeze({
  migratedPhysical: () => migratedPhysicalReference().source,
  nativeCreator: nativeCreatorSource,
  nativeRelease: nativeReleaseSource,
});

module.exports = {
  REFERENCE_FACTORIES,
  createV3PreviewFixture,
  migratedPhysicalReference,
  nativeCreatorSource,
  nativeReleaseSource,
};
