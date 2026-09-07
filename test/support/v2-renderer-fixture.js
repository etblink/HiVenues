'use strict';

const path = require('node:path');
const express = require('express');
const { extractDeploymentAgnosticVenueSource } = require('../../src/venue/source');
const {
  DEFAULT_DESIGN_COLORS,
  V2_SOURCE_KIND,
  createV2DeploymentAgnosticVenueSource,
} = require('../../src/venue/v2/source');
const { migrateV1DeploymentAgnosticVenueSource } = require('../../src/venue/v2/migrate-v1');
const {
  renderV2EventDetail,
  renderV2Page,
  renderV2PublicStylesheet,
  renderV2ThemeStylesheet,
} = require('../../src/venue/v2/renderer');
const {
  FOURTH_STREET_AUTHORING_INPUT,
} = require('./hv5-authoring-fixtures');
const {
  JUNIPER_WORKS_AUTHORING_INPUT,
} = require('./hv7-juniper-venue');

const ROOT = path.join(__dirname, '..', '..');
const PUBLIC_ROOT = path.join(ROOT, 'public');

function mediaTreatment(aspectRecipeId = 'aspect-landscape-wide', x = 0.5, y = 0.5) {
  return {
    focalPoint: { x, y },
    fit: 'cover',
    aspectRecipeId,
  };
}

function mediaUsage(assetId, alt, aspectRecipeId = 'aspect-landscape-wide') {
  return {
    assetId,
    alt,
    decorative: false,
    treatment: mediaTreatment(aspectRecipeId),
  };
}

function restaurantDesign() {
  return {
    colors: {
      canvas: '#fbf7f0',
      surface: '#ffffff',
      surfaceRaised: '#f3eadf',
      surfaceStrong: '#2b211b',
      border: '#786b5f',
      text: '#211a16',
      textMuted: '#554840',
      textSubtle: '#61544b',
      accent: '#6b3b13',
      accentHover: '#4e2b0e',
      accentText: '#ffffff',
      focusRing: '#6b3b13',
      info: '#315a80',
      success: '#316440',
      warning: '#815d13',
      danger: '#8a3030',
    },
    typographyRecipeId: 'type-editorial',
    densityRecipeId: 'density-generous',
    shapeRecipeId: 'shape-soft',
    surfaceRecipeId: 'surface-flat',
  };
}

function musicDesign() {
  return {
    colors: {
      ...DEFAULT_DESIGN_COLORS,
      canvas: '#090b13',
      surface: '#111525',
      surfaceRaised: '#171d31',
      surfaceStrong: '#090b13',
      border: '#555d78',
      text: '#f8f9fd',
      textMuted: '#cbd0dd',
      textSubtle: '#b4bccf',
      accent: '#ff6a78',
      accentHover: '#ff929d',
      accentText: '#090b13',
      focusRing: '#8fd4ff',
      info: '#8fd4ff',
      success: '#78d39b',
      warning: '#ffd173',
      danger: '#ff8791',
    },
    typographyRecipeId: 'type-poster',
    densityRecipeId: 'density-standard',
    shapeRecipeId: 'shape-crisp',
    surfaceRecipeId: 'surface-elevated',
  };
}

function restaurantSource() {
  return createV2DeploymentAgnosticVenueSource({
    kind: V2_SOURCE_KIND,
    schemaVersion: 2,
    provenance: {
      origin: 'native-v2',
      sourceSchemaVersion: null,
      sourcePackageId: null,
      starterId: 'restaurant-editorial',
    },
    venue: {
      id: 'harbor-hearth-example',
      displayName: 'Harbor & Hearth Example',
      business: {
        address: '100 Example Harbor Way, Reno, NV 89501',
        phone: '(555) 010-8000',
        hours: 'Tue–Sun, 4:00 p.m.–10:00 p.m.',
        websiteUrl: 'https://harbor-hearth.example/',
        mapUrl: 'https://harbor-hearth.example/visit',
      },
      language: { operatorNoun: 'restaurant', staffRole: 'host' },
    },
    media: {
      assets: [
        { id: 'logo', src: '/fixtures/v2-renderer/restaurant-logo.svg', width: 640, height: 640 },
        { id: 'dining-room', src: '/fixtures/v2-renderer/restaurant-dining.svg', width: 1600, height: 1000 },
        { id: 'private-room', src: '/fixtures/v2-renderer/restaurant-private.svg', width: 1200, height: 900 },
        { id: 'plate', src: '/fixtures/v2-renderer/restaurant-plate.svg', width: 1200, height: 900 },
      ],
    },
    resources: {
      events: [],
      programs: [],
      menus: [
        {
          id: 'dinner',
          title: 'Dinner',
          sections: [
            {
              id: 'starters',
              title: 'To begin',
              items: [
                { id: 'oysters', name: 'Oysters', description: 'Daily selection, citrus mignonette', priceLabel: '$18' },
                { id: 'carrots', name: 'Fire-roasted carrots', description: 'Herbs, cultured cream, seed crunch', priceLabel: '$15' },
              ],
            },
            {
              id: 'mains',
              title: 'From the hearth',
              items: [
                { id: 'market-fish', name: 'Market fish', description: 'Seasonal vegetables and brown butter', priceLabel: '$34' },
                { id: 'short-rib', name: 'Braised short rib', description: 'Potato, greens, red wine jus', priceLabel: '$38' },
              ],
            },
          ],
        },
      ],
      equipment: [],
    },
    site: {
      id: 'harbor-hearth-site',
      homePageId: 'home',
      brand: { logoAssetId: 'logo', design: restaurantDesign() },
      pages: [
        {
          id: 'home',
          slug: '',
          title: 'Home',
          seo: {
            title: 'Harbor & Hearth Example',
            description: 'A fictional waterfront restaurant concept with seasonal dining and private gatherings.',
          },
          components: [
            {
              id: 'home-hero',
              kind: 'venue-hero',
              recipeId: 'hero-editorial-split',
              content: {
                eyebrow: 'Waterfront dining · concept venue',
                heading: 'A warmer kind of gathering',
                body: 'Seasonal cooking, a calm room, and an evening designed around the table.',
                note: 'Concept venue · all details and imagery are fictional.',
                media: mediaUsage('dining-room', 'Synthetic waterfront dining room'),
                primaryAction: { label: 'Reserve a table', href: 'https://harbor-hearth.example/reservations' },
              },
              responsive: {
                tablet: { layoutVariant: 'stacked' },
                mobile: { textMeasure: 'narrow' },
              },
            },
            {
              id: 'home-menu',
              kind: 'menu-preview',
              recipeId: 'list-editorial-rows',
              content: {
                kicker: 'Dinner',
                heading: 'A short seasonal menu',
                intro: 'A concise dinner menu centered on the hearth, the harbor, and the season.',
                emptyLead: null,
                emptyBody: null,
                resourceIds: ['dinner'],
              },
              responsive: { tablet: {}, mobile: { density: 'compact' } },
            },
            {
              id: 'home-gallery',
              kind: 'gallery',
              recipeId: 'gallery-feature-grid',
              content: {
                kicker: 'The room',
                heading: 'Made for unhurried evenings',
                intro: 'Two intimate rooms and a kitchen-led table, framed for slow evenings by the water.',
                items: [
                  {
                    id: 'gallery-private',
                    assetId: 'private-room',
                    alt: 'Synthetic private dining room',
                    decorative: false,
                    caption: 'Private dining · concept imagery',
                    treatment: mediaTreatment('aspect-landscape', 0.45, 0.5),
                  },
                  {
                    id: 'gallery-plate',
                    assetId: 'plate',
                    alt: 'Synthetic plated seasonal dish',
                    decorative: false,
                    caption: 'Seasonal plate · concept imagery',
                    treatment: mediaTreatment('aspect-square', 0.5, 0.45),
                  },
                ],
              },
              responsive: { tablet: { columns: 2 }, mobile: { columns: 1 } },
            },
            {
              id: 'home-visit',
              kind: 'contact-visit',
              recipeId: 'visit-legacy-v1',
              content: {
                kicker: 'Visit',
                heading: 'Plan an evening by the water',
                body: 'Dinner begins at four, with a waterfront address, evening hours, and directions gathered in one place.',
                note: 'Concept venue · address, hours, and contact details are fictional.',
              },
              responsive: { tablet: {}, mobile: {} },
            },
          ],
        },
        {
          id: 'menu',
          slug: 'menu',
          title: 'Menu',
          seo: { title: 'Dinner menu', description: 'Seasonal starters and hearth-led mains at the fictional Harbor & Hearth concept.' },
          components: [
            {
              id: 'menu-main',
              kind: 'menu',
              recipeId: 'list-editorial-rows',
              content: {
                kicker: 'Dinner',
                heading: 'The menu',
                intro: 'Seasonal starters and hearth-led mains, with prices shown directly on the page.',
                emptyLead: null,
                emptyBody: null,
                resourceIds: ['dinner'],
              },
              responsive: { tablet: {}, mobile: { density: 'compact' } },
            },
          ],
        },
        {
          id: 'private-events',
          slug: 'private-events',
          title: 'Private Events',
          seo: { title: null, description: 'Private dining and gathering information for the fictional Harbor & Hearth concept.' },
          components: [
            {
              id: 'private-events-intro',
              kind: 'editorial-intro',
              recipeId: 'intro-legacy-v1',
              content: {
                kicker: 'Private events',
                heading: 'A room for your gathering',
                body: 'Gather around a private table for dinners, celebrations, and small receptions overlooking the water.',
                note: 'Concept venue · inquiry details are fictional.',
              },
              responsive: { tablet: {}, mobile: {} },
            },
          ],
        },
      ],
      navigation: [
        { id: 'nav-home', label: 'Home', target: { kind: 'page', pageId: 'home' } },
        { id: 'nav-menu', label: 'Menu', target: { kind: 'page', pageId: 'menu' } },
        { id: 'nav-private', label: 'Private Events', target: { kind: 'page', pageId: 'private-events' } },
      ],
    },
    capabilities: {
      community: { state: 'disabled' },
      transaction: { state: 'disabled' },
    },
  });
}

function musicSource() {
  return createV2DeploymentAgnosticVenueSource({
    kind: V2_SOURCE_KIND,
    schemaVersion: 2,
    provenance: {
      origin: 'native-v2',
      sourceSchemaVersion: null,
      sourcePackageId: null,
      starterId: 'live-music-poster',
    },
    venue: {
      id: 'northline-hall-example',
      displayName: 'Northline Hall Example',
      business: {
        address: '200 Example Music Avenue, Reno, NV 89501',
        phone: '(555) 010-9000',
        hours: 'Event hours vary by show.',
        websiteUrl: 'https://northline-hall.example/',
        mapUrl: 'https://northline-hall.example/visit',
      },
      language: { operatorNoun: 'music venue', staffRole: 'venue staff' },
    },
    media: {
      assets: [
        { id: 'logo', src: '/fixtures/v2-renderer/music-logo.svg', width: 640, height: 640 },
        { id: 'stage', src: '/fixtures/v2-renderer/music-stage.svg', width: 1600, height: 1000 },
        { id: 'poster-one', src: '/fixtures/v2-renderer/music-poster-one.svg', width: 1000, height: 1400 },
        { id: 'poster-two', src: '/fixtures/v2-renderer/music-poster-two.svg', width: 1000, height: 1400 },
      ],
    },
    resources: {
      events: [
        {
          id: 'fixture-show-one',
          slug: 'fixture-show-one',
          title: 'The Static Lights',
          startAt: '2026-09-18T20:00:00-07:00',
          endAt: '2026-09-18T23:00:00-07:00',
          state: 'scheduled',
          description: 'Guitar glow, analog synths, and a late-night headline set from The Static Lights.',
          mediaAssetId: 'poster-one',
          accessNote: '21+ · doors 7:00 PM',
          externalAction: { label: 'Tickets', href: 'https://northline-hall.example/tickets/fixture-show-one' },
        },
        {
          id: 'fixture-show-two',
          slug: 'fixture-show-two',
          title: 'Signal / Noise',
          startAt: '2026-09-26T19:30:00-07:00',
          endAt: '2026-09-26T22:30:00-07:00',
          state: 'scheduled',
          description: 'A genre-blurring all-ages bill built around live electronics, drums, and luminous guitar.',
          mediaAssetId: 'poster-two',
          accessNote: 'All ages · doors 6:30 PM',
          externalAction: { label: 'Tickets', href: 'https://northline-hall.example/tickets/fixture-show-two' },
        },
      ],
      programs: [],
      menus: [],
      equipment: [],
    },
    site: {
      id: 'northline-hall-site',
      homePageId: 'home',
      brand: { logoAssetId: 'logo', design: musicDesign() },
      pages: [
        {
          id: 'home',
          slug: '',
          title: 'Home',
          seo: { title: 'Northline Hall Example', description: 'A fictional live-music concept with upcoming shows, ticket links, and venue details.' },
          components: [
            {
              id: 'home-hero',
              kind: 'venue-hero',
              recipeId: 'hero-poster',
              content: {
                eyebrow: 'Live music · concept venue',
                heading: 'Live music lives here',
                body: 'Big sound, close sightlines, and a calendar built for finding your next night out.',
                note: 'Concept venue · artists, events, and venue details are fictional.',
                media: mediaUsage('stage', 'Synthetic live-music stage under dramatic lights'),
                primaryAction: { label: 'See upcoming shows', href: 'https://northline-hall.example/shows' },
              },
              responsive: { tablet: {}, mobile: { textMeasure: 'narrow' } },
            },
            {
              id: 'home-shows',
              kind: 'event-list',
              recipeId: 'list-poster-rows',
              content: {
                kicker: 'Upcoming',
                heading: 'Shows',
                intro: 'Pick a date, scan the door policy, and open any show for the full event details.',
                emptyLead: 'No shows listed.',
                emptyBody: 'Check back for newly announced dates.',
                resourceIds: ['fixture-show-one', 'fixture-show-two'],
              },
              responsive: { tablet: {}, mobile: { density: 'compact' } },
            },
            {
              id: 'home-visit',
              kind: 'contact-visit',
              recipeId: 'visit-legacy-v1',
              content: {
                kicker: 'The venue',
                heading: 'Doors, location, and venue details',
                body: 'Find the room, check the doors policy on each show, and plan the night before you arrive.',
                note: 'Concept venue · address, hours, and event details are fictional.',
              },
              responsive: { tablet: {}, mobile: {} },
            },
          ],
        },
        {
          id: 'shows',
          slug: 'shows',
          title: 'Shows',
          seo: { title: 'Upcoming shows', description: 'Upcoming fictional concerts, doors information, and ticket links for Northline Hall Example.' },
          components: [
            {
              id: 'shows-list',
              kind: 'event-list',
              recipeId: 'list-poster-rows',
              content: {
                kicker: 'Calendar',
                heading: 'Upcoming shows',
                intro: 'Upcoming nights at Northline Hall, with tickets and full details one tap away.',
                emptyLead: 'No shows listed.',
                emptyBody: 'Check back for newly announced dates.',
                resourceIds: ['fixture-show-one', 'fixture-show-two'],
              },
              responsive: { tablet: {}, mobile: { density: 'compact' } },
            },
          ],
        },
      ],
      navigation: [
        { id: 'nav-home', label: 'Home', target: { kind: 'page', pageId: 'home' } },
        { id: 'nav-shows', label: 'Shows', target: { kind: 'page', pageId: 'shows' } },
      ],
    },
    capabilities: {
      community: { state: 'disabled' },
      transaction: { state: 'disabled' },
    },
  });
}

function fourthStreetSource() {
  const source = migrateV1DeploymentAgnosticVenueSource(
    extractDeploymentAgnosticVenueSource(FOURTH_STREET_AUTHORING_INPUT),
  );
  const home = source.site.pages.find((page) => page.id === source.site.homePageId);
  const hero = home && home.components.find((component) => component.kind === 'venue-hero');
  if (!hero) throw new Error('Fourth Street PM4 reference requires a venue hero');
  hero.recipeId = 'hero-immersive-media';
  return createV2DeploymentAgnosticVenueSource(source);
}

function juniperSource() {
  return migrateV1DeploymentAgnosticVenueSource(
    extractDeploymentAgnosticVenueSource(JUNIPER_WORKS_AUTHORING_INPUT),
  );
}

const REFERENCE_FACTORIES = Object.freeze({
  'fourth-street': fourthStreetSource,
  juniper: juniperSource,
  restaurant: restaurantSource,
  'live-music': musicSource,
});

function syntheticSvg(label, background, foreground, width, height, subtitle) {
  const safe = (value) => String(value).replace(/[<>&'"]/g, '');
  const safeLabel = safe(label);
  const safeSubtitle = safe(subtitle);
  const short = Math.min(width, height);
  const pad = Math.round(short * 0.08);
  const titleSize = Math.max(34, Math.round(short * 0.075));
  const subtitleSize = Math.max(18, Math.round(short * 0.032));
  const lowerY = Math.round(height * 0.68);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${safeLabel}">
  <defs>
    <linearGradient id="wash" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${background}"/>
      <stop offset="1" stop-color="${foreground}" stop-opacity=".20"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#wash)"/>
  <circle cx="${Math.round(width * 0.78)}" cy="${Math.round(height * 0.20)}" r="${Math.round(short * 0.29)}" fill="${foreground}" opacity=".10"/>
  <circle cx="${Math.round(width * 0.18)}" cy="${Math.round(height * 0.82)}" r="${Math.round(short * 0.34)}" fill="${foreground}" opacity=".07"/>
  <rect x="${pad}" y="${lowerY}" width="${width - (pad * 2)}" height="${Math.max(pad * 2, Math.round(height * 0.20))}" rx="${Math.round(short * 0.035)}" fill="${background}" opacity=".42"/>
  <text x="${pad}" y="${Math.round(height * 0.20)}" fill="${foreground}" font-family="system-ui,sans-serif" font-size="${titleSize}" font-weight="800">${safeLabel}</text>
  <text x="${pad}" y="${Math.round(height * 0.20) + Math.round(subtitleSize * 1.8)}" fill="${foreground}" opacity=".78" font-family="system-ui,sans-serif" font-size="${subtitleSize}" font-weight="600">${safeSubtitle}</text>
</svg>`;
}

const SYNTHETIC_ASSETS = Object.freeze({
  'restaurant-logo.svg': syntheticSvg('Harbor & Hearth', '#f3eadf', '#211a16', 640, 640, 'Waterfront dining · concept mark'),
  'restaurant-dining.svg': syntheticSvg('Harbor & Hearth', '#a76e43', '#fffaf3', 1600, 1000, 'Waterfront dining · concept image'),
  'restaurant-private.svg': syntheticSvg('Private dining', '#d7c2a9', '#2b211b', 1200, 900, 'Gather by the water · concept image'),
  'restaurant-plate.svg': syntheticSvg('From the hearth', '#6d7462', '#fffaf3', 1200, 900, 'Seasonal menu · concept image'),
  'music-logo.svg': syntheticSvg('Northline Hall', '#111525', '#ff6a78', 640, 640, 'Live music · concept mark'),
  'music-stage.svg': syntheticSvg('Northline Hall', '#171d31', '#8fd4ff', 1600, 1000, 'Live room · concept image'),
  'music-poster-one.svg': syntheticSvg('The Static Lights', '#351728', '#ff929d', 1000, 1400, 'September 18 · 8 PM'),
  'music-poster-two.svg': syntheticSvg('Signal / Noise', '#102b3c', '#8fd4ff', 1000, 1400, 'September 26 · 7:30 PM'),
});

function createV2RendererPreviewFixture(sourceInput) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const app = express();
  const diagnostics = { requests: 0, hiveRpcAttempts: 0, writes: 0 };

  app.disable('x-powered-by');
  app.use((request, _response, next) => {
    diagnostics.requests += 1;
    next();
  });
  app.get('/__hivenues-v2/styles.css', (_request, response) => {
    response.type('text/css').send(renderV2PublicStylesheet());
  });
  app.get('/__hivenues-v2/theme.css', (_request, response) => {
    response.type('text/css').send(renderV2ThemeStylesheet(source));
  });
  app.get('/fixtures/v2-renderer/:asset', (request, response, next) => {
    const svg = SYNTHETIC_ASSETS[request.params.asset];
    if (!svg) return next();
    return response.type('image/svg+xml').send(svg);
  });
  app.use(express.static(PUBLIC_ROOT, { fallthrough: true, index: false }));

  app.get('/community', (_request, response) => {
    if (source.capabilities.community.state !== 'configured') {
      response.status(404).type('text/plain').send('Community capability is disabled.');
      return;
    }
    response.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Community · ${source.venue.displayName}</title></head><body><main><h1>Community</h1><p>Read-only renderer foundation placeholder. No Hive RPC was attempted.</p><p><a href="/">Back to venue</a></p></main></body></html>`);
  });

  app.get('/events/:eventSlug', (request, response) => {
    try {
      response.type('html').send(renderV2EventDetail(source, request.params.eventSlug));
    } catch (error) {
      response.status(404).type('text/plain').send(error.message);
    }
  });

  app.get('/', (_request, response) => {
    response.type('html').send(renderV2Page(source));
  });

  app.get('/:pageSlug', (request, response) => {
    try {
      response.type('html').send(renderV2Page(source, { pageSlug: request.params.pageSlug }));
    } catch (error) {
      response.status(404).type('text/plain').send(error.message);
    }
  });

  return Object.freeze({
    app,
    source,
    diagnostics: () => Object.freeze({ ...diagnostics }),
  });
}

module.exports = {
  REFERENCE_FACTORIES,
  createV2RendererPreviewFixture,
  fourthStreetSource,
  juniperSource,
  musicSource,
  restaurantSource,
};
