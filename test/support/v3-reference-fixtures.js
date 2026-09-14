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
  renderV3RobotsText,
  renderV3Route,
  renderV3SitemapXml,
} = require('../../src/venue/v3/renderer');
const {
  musicSource,
} = require('./v2-renderer-fixture');

const ROOT = path.join(__dirname, '..', '..');
const PUBLIC_ROOT = path.join(ROOT, 'public');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

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

function polishMigratedPhysicalSource(sourceInput) {
  const source = clone(sourceInput);
  source.venue.displayName = 'Northline Hall';
  for (const page of source.site.pages) {
    if (page.slug === '') {
      page.seo.title = 'Northline Hall · Live music in the Riverside District';
      page.seo.description = 'Independent live music, touring artists, and upcoming shows at Northline Hall.';
    }
    for (const component of page.components) {
      const content = component.content || {};
      if (component.kind === 'venue-hero') {
        if (Object.hasOwn(content, 'eyebrow')) content.eyebrow = 'Independent live music';
        if (Object.hasOwn(content, 'heading')) content.heading = 'Close to the stage. Built for the music.';
        if (Object.hasOwn(content, 'body')) content.body = 'Touring artists, local favorites, and late sets in the Riverside District.';
        if (Object.hasOwn(content, 'note')) content.note = 'Doors and set times vary by show.';
        if (content.media && Object.hasOwn(content.media, 'alt')) content.media.alt = 'Northline Hall stage before a show';
      }
      if (component.kind === 'activity-list') {
        if (Object.hasOwn(content, 'kicker')) content.kicker = 'On stage';
        if (Object.hasOwn(content, 'heading')) content.heading = 'Upcoming shows';
        if (Object.hasOwn(content, 'intro')) content.intro = 'Find your next night at Northline Hall.';
      }
      if (component.kind === 'editorial-intro') {
        if (Object.hasOwn(content, 'kicker')) content.kicker = 'Northline Hall';
        if (Object.hasOwn(content, 'heading')) content.heading = 'A neighborhood room for live music';
        if (Object.hasOwn(content, 'body')) content.body = 'A focused room, a welcoming floor, and a calendar that moves between local voices and touring acts.';
        if (Object.hasOwn(content, 'note')) content.note = null;
      }
    }
  }
  return createV3DeploymentAgnosticVenueSource(source);
}

function migratedPhysicalReference() {
  const v2 = musicSource();
  return {
    source: polishMigratedPhysicalSource(migrateV2DeploymentAgnosticVenueSourceToV3(v2)),
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
      displayName: 'Signal Room',
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
          description: 'A live studio session with new songs, works in progress, and time for audience questions.',
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
            title: 'Signal Room · Live sessions',
            description: 'Live studio sessions, new songs, and conversations from Signal Room.',
          },
          components: [
            narrativeHero({
              eyebrow: 'Independent creator',
              heading: 'Songs in progress. Conversation in real time.',
              body: 'Signal Room is a home for intimate livestreams, first listens, and the stories behind the work.',
              note: 'Join from wherever you are.',
            }),
            activityList({
              id: 'home-activities',
              kicker: 'Upcoming',
              heading: 'Live sessions',
              intro: 'Drop into the next session for music, conversation, and a closer look at what is taking shape.',
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
      displayName: 'Northstar',
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
          title: 'Afterglow',
          description: 'Northstar’s new release arrives with a warm, late-night pulse and a quieter final turn.',
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
          publicActions: [
            {
              id: 'listen-afterglow',
              role: 'LISTEN',
              label: 'Listen to Afterglow',
              href: 'https://northstar.example/releases/afterglow',
            },
          ],
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
            title: 'Northstar · Afterglow',
            description: 'Afterglow, the new release from Northstar, arrives November 14.',
          },
          components: [
            narrativeHero({
              eyebrow: 'New release',
              heading: 'Afterglow arrives November 14',
              body: 'A new release from Northstar, built for the hour when the city gets quieter and the details come forward.',
              note: 'Listen from release morning.',
            }),
            activityList({
              id: 'home-releases',
              kicker: 'Release',
              heading: 'New from Northstar',
              intro: 'Open the release for timing and the first listening link.',
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

function requestOrigin(request) {
  return `${request.protocol}://${request.get('host')}`;
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
  app.get('/robots.txt', (request, response) => {
    response.type('text/plain').send(renderV3RobotsText(source, { canonicalOrigin: requestOrigin(request) }));
  });
  app.get('/sitemap.xml', (request, response) => {
    response.type('application/xml').send(renderV3SitemapXml(source, { canonicalOrigin: requestOrigin(request) }));
  });
  app.use(express.static(PUBLIC_ROOT, { fallthrough: true, index: false }));
  app.use((request, response) => {
    try {
      response.type('html').send(renderV3Route(source, request.path, {
        legacyEventRoutes,
        canonicalOrigin: requestOrigin(request),
      }));
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