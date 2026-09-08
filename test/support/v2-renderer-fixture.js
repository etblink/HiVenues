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

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function findPage(source, pageId) {
  const page = source.site.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new Error(`missing reference page: ${pageId}`);
  return page;
}

function findComponent(source, componentId) {
  for (const page of source.site.pages) {
    const component = page.components.find((candidate) => candidate.id === componentId);
    if (component) return component;
  }
  throw new Error(`missing reference component: ${componentId}`);
}

function configureReferenceComposition(sourceInput, config = {}) {
  const source = cloneJson(sourceInput);
  const home = findPage(source, source.site.homePageId);

  if (config.design) Object.assign(source.site.brand.design, config.design);

  for (const [componentId, recipeId] of Object.entries(config.componentRecipes || {})) {
    findComponent(source, componentId).recipeId = recipeId;
  }
  for (const [componentId, contentPatch] of Object.entries(config.componentContent || {})) {
    Object.assign(findComponent(source, componentId).content, cloneJson(contentPatch));
  }
  for (const [componentId, responsive] of Object.entries(config.componentResponsive || {})) {
    findComponent(source, componentId).responsive = cloneJson(responsive);
  }
  for (const [componentId, itemPatches] of Object.entries(config.componentItemPatches || {})) {
    const items = findComponent(source, componentId).content.items;
    for (const [itemId, patch] of Object.entries(itemPatches)) {
      const item = items.find((candidate) => candidate.id === itemId);
      if (!item) throw new Error(`missing reference item: ${componentId}/${itemId}`);
      Object.assign(item, cloneJson(patch));
    }
  }

  if (config.homeOrder) {
    const byId = new Map(home.components.map((component) => [component.id, component]));
    const ordered = config.homeOrder.map((componentId) => {
      const component = byId.get(componentId);
      if (!component) throw new Error(`missing home component in order: ${componentId}`);
      return component;
    });
    if (ordered.length !== home.components.length || new Set(config.homeOrder).size !== home.components.length) {
      throw new Error('home order must name every home component exactly once');
    }
    home.components = ordered;
  }

  for (const pageSpec of config.pages || []) {
    if (source.site.pages.some((page) => page.id === pageSpec.id || page.slug === pageSpec.slug)) {
      throw new Error(`duplicate reference page: ${pageSpec.id}`);
    }
    source.site.pages.push({
      id: pageSpec.id,
      slug: pageSpec.slug,
      title: pageSpec.title,
      seo: cloneJson(pageSpec.seo),
      components: pageSpec.components.map((componentSpec) => {
        const component = cloneJson(findComponent(source, componentSpec.sourceId));
        component.id = componentSpec.id;
        if (componentSpec.recipeId) component.recipeId = componentSpec.recipeId;
        if (componentSpec.contentPatch) Object.assign(component.content, cloneJson(componentSpec.contentPatch));
        return component;
      }),
    });
  }

  if (config.navigation) source.site.navigation = cloneJson(config.navigation);
  return createV2DeploymentAgnosticVenueSource(source);
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
  const source = createV2DeploymentAgnosticVenueSource({
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
        { id: 'dining-room', src: '/fixtures/v2-renderer/restaurant-dining.jpg', width: 320, height: 200 },
        { id: 'private-room', src: '/fixtures/v2-renderer/restaurant-private.jpg', width: 320, height: 240 },
        { id: 'plate', src: '/fixtures/v2-renderer/restaurant-table.jpg', width: 320, height: 240 },
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
            description: 'Synthetic restaurant reference for the HiVenues v2 renderer.',
          },
          components: [
            {
              id: 'home-hero',
              kind: 'venue-hero',
              recipeId: 'hero-editorial-split',
              content: {
                eyebrow: 'Waterfront dining',
                heading: 'A warmer kind of gathering',
                body: 'Seasonal cooking, a calm room, and an evening designed around the table.',
                note: 'Demonstration venue · business details and imagery are synthetic.',
                media: mediaUsage('dining-room', 'Waterfront dining room at sunset', 'aspect-landscape'),
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
                intro: 'Seasonal highlights with descriptions and prices presented as accessible page content.',
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
                intro: 'Private dining, candlelit table settings, and room details in a calm editorial rhythm.',
                items: [
                  {
                    id: 'gallery-private',
                    assetId: 'private-room',
                    alt: 'Private dining room set for a gathering',
                    decorative: false,
                    caption: 'Private dining room',
                    treatment: mediaTreatment('aspect-landscape', 0.45, 0.5),
                  },
                  {
                    id: 'gallery-plate',
                    assetId: 'plate',
                    alt: 'Candlelit table setting with glassware and flowers',
                    decorative: false,
                    caption: 'Table setting',
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
                body: 'Hours, location, and contact details come from stable venue facts rather than page-specific duplication.',
                note: 'Demonstration venue; address, hours, and contact details are fictional.',
              },
              responsive: { tablet: {}, mobile: {} },
            },
          ],
        },
        {
          id: 'menu',
          slug: 'menu',
          title: 'Menu',
          seo: { title: 'Dinner menu', description: 'Synthetic accessible dinner menu.' },
          components: [
            {
              id: 'menu-main',
              kind: 'menu',
              recipeId: 'list-editorial-rows',
              content: {
                kicker: 'Dinner',
                heading: 'The menu',
                intro: 'Seasonal dishes and prices remain readable, searchable page content.',
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
          seo: { title: null, description: 'Synthetic private-events information.' },
          components: [
            {
              id: 'private-events-intro',
              kind: 'editorial-intro',
              recipeId: 'intro-legacy-v1',
              content: {
                kicker: 'Private events',
                heading: 'A room for your gathering',
                body: 'Host dinners and celebrations with a dedicated room, a clear inquiry path, and the same venue-first visual language.',
                note: 'Demonstration inquiry only; no reservation or payment is processed.',
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
  return configureReferenceComposition(source, {
    pages: [
      {
        id: 'gallery',
        slug: 'gallery',
        title: 'Gallery',
        seo: { title: 'Gallery', description: 'Demonstration dining-room and seasonal-food imagery.' },
        components: [{ sourceId: 'home-gallery', id: 'gallery-main' }],
      },
      {
        id: 'visit',
        slug: 'visit',
        title: 'Visit',
        seo: { title: 'Visit Harbor & Hearth Example', description: 'Demonstration hours, location, and contact information.' },
        components: [{ sourceId: 'home-visit', id: 'visit-main' }],
      },
    ],
    navigation: [
      { id: 'nav-home', label: 'Home', target: { kind: 'page', pageId: 'home' } },
      { id: 'nav-menu', label: 'Menu', target: { kind: 'page', pageId: 'menu' } },
      { id: 'nav-private', label: 'Private Events', target: { kind: 'page', pageId: 'private-events' } },
      { id: 'nav-gallery', label: 'Gallery', target: { kind: 'page', pageId: 'gallery' } },
      { id: 'nav-visit', label: 'Visit', target: { kind: 'page', pageId: 'visit' } },
    ],
  });
}

function musicSource() {
  const source = createV2DeploymentAgnosticVenueSource({
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
          description: 'A late-summer headline set built around bright guitars, layered vocals, and a full-room finish.',
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
          description: 'An all-ages night of electronic pop, rhythmic noise, and a closing collaborative set.',
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
          seo: { title: 'Northline Hall Example', description: 'Synthetic live-music reference for HiVenues.' },
          components: [
            {
              id: 'home-hero',
              kind: 'venue-hero',
              recipeId: 'hero-poster',
              content: {
                eyebrow: 'Live music',
                heading: 'Live music lives here',
                body: 'Two upcoming nights, clear ticket actions, and the venue details you need before the lights go down.',
                note: 'Demonstration venue · lineup, tickets, and venue details are fictional.',
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
                intro: 'See what is playing, when doors open, and how to get tickets.',
                emptyLead: 'No shows listed.',
                emptyBody: 'New dates will appear here.',
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
                body: 'Find the address, doors information, and practical details before you arrive.',
                note: 'Demonstration venue; address, hours, and contact details are fictional.',
              },
              responsive: { tablet: {}, mobile: {} },
            },
          ],
        },
        {
          id: 'shows',
          slug: 'shows',
          title: 'Shows',
          seo: { title: 'Upcoming shows', description: 'Synthetic upcoming live-music events.' },
          components: [
            {
              id: 'shows-list',
              kind: 'event-list',
              recipeId: 'list-poster-rows',
              content: {
                kicker: 'Calendar',
                heading: 'Upcoming shows',
                intro: 'Open any show for date, access details, artwork, and the ticket link.',
                emptyLead: 'No shows listed.',
                emptyBody: 'New dates will appear here.',
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
  return configureReferenceComposition(source, {
    pages: [
      {
        id: 'visit',
        slug: 'visit',
        title: 'Visit',
        seo: { title: 'Visit Northline Hall Example', description: 'Demonstration venue location and practical visit information.' },
        components: [{ sourceId: 'home-visit', id: 'visit-main' }],
      },
    ],
    navigation: [
      { id: 'nav-home', label: 'Home', target: { kind: 'page', pageId: 'home' } },
      { id: 'nav-shows', label: 'Shows', target: { kind: 'page', pageId: 'shows' } },
      { id: 'nav-visit', label: 'Visit', target: { kind: 'page', pageId: 'visit' } },
    ],
  });
}

function fourthStreetSource() {
  const source = migrateV1DeploymentAgnosticVenueSource(
    extractDeploymentAgnosticVenueSource(FOURTH_STREET_AUTHORING_INPUT),
  );
  return configureReferenceComposition(source, {
    componentRecipes: {
      'home-hero': 'hero-immersive-media',
      'home-gallery': 'gallery-feature-grid',
      'home-community-entry': 'community-card',
    },
    componentContent: {
      'home-hero': {
        eyebrow: 'East 4th Street · Reno',
        primaryAction: { label: 'Plan your visit', href: 'https://4thstreetbarreno.com/' },
      },
    },
    componentResponsive: {
      'home-hero': { tablet: {}, mobile: { textMeasure: 'narrow' } },
      'home-gallery': { tablet: { columns: 2 }, mobile: { columns: 1 } },
    },
    homeOrder: [
      'home-hero',
      'home-pathways',
      'home-gallery',
      'home-visit',
      'home-official-updates',
      'home-community-entry',
    ],
    pages: [
      {
        id: 'gallery',
        slug: 'gallery',
        title: 'Gallery',
        seo: { title: '4th Street Bar gallery', description: 'A real look at 4th Street Bar in Reno.' },
        components: [{ sourceId: 'home-gallery', id: 'gallery-main' }],
      },
      {
        id: 'visit',
        slug: 'visit',
        title: 'Visit',
        seo: { title: 'Visit 4th Street Bar', description: 'Hours, address, and visit information for 4th Street Bar in Reno.' },
        components: [{ sourceId: 'home-visit', id: 'visit-main' }],
      },
    ],
    navigation: [
      { id: 'nav-home', label: 'Home', target: { kind: 'page', pageId: 'home' } },
      { id: 'nav-gallery', label: 'Gallery', target: { kind: 'page', pageId: 'gallery' } },
      { id: 'nav-visit', label: 'Visit', target: { kind: 'page', pageId: 'visit' } },
      { id: 'nav-community', label: 'Community', target: { kind: 'capability', capability: 'community' } },
    ],
  });
}

function juniperSource() {
  const source = migrateV1DeploymentAgnosticVenueSource(
    extractDeploymentAgnosticVenueSource(JUNIPER_WORKS_AUTHORING_INPUT),
  );
  return configureReferenceComposition(source, {
    design: {
      typographyRecipeId: 'type-grotesk-display',
      densityRecipeId: 'density-standard',
      shapeRecipeId: 'shape-crisp',
      surfaceRecipeId: 'surface-flat',
    },
    componentRecipes: {
      'home-hero': 'hero-text-led',
      'home-programs': 'list-card-grid',
      'home-equipment-status': 'status-grid',
      'home-gallery': 'gallery-disciplined-grid',
      'home-community-entry': 'community-card',
    },
    componentContent: {
      'home-hero': {
        eyebrow: 'Member-run workshop · Reno',
        note: 'Demonstration workshop — no live venue, account, or deployment is represented.',
        primaryAction: { label: 'Explore programs', href: 'https://juniper-works.example/programs' },
      },
      'home-programs': {
        intro: 'Orientations, classes, and build sessions help visitors find a useful first step into the workshop.',
      },
      'home-gallery': {
        intro: 'Member projects show the range of materials, tools, and shared-shop work.',
      },
    },
    componentItemPatches: {
      'home-gallery': {
        'gallery-01': { caption: 'Wood project' },
        'gallery-02': { caption: 'Metal project' },
        'gallery-03': { caption: 'Textile project' },
      },
    },
    componentResponsive: {
      'home-hero': { tablet: {}, mobile: { textMeasure: 'narrow' } },
      'home-programs': { tablet: { columns: 2 }, mobile: { columns: 1, density: 'compact' } },
      'home-equipment-status': { tablet: { columns: 2 }, mobile: { columns: 1, density: 'compact' } },
      'home-gallery': { tablet: { columns: 2 }, mobile: { columns: 1 } },
    },
    homeOrder: [
      'home-hero',
      'home-programs',
      'home-equipment-status',
      'home-pathways',
      'home-gallery',
      'home-visit',
      'home-official-updates',
      'home-community-entry',
    ],
    pages: [
      {
        id: 'programs',
        slug: 'programs',
        title: 'Programs',
        seo: { title: 'Juniper Works programs', description: 'Synthetic workshop orientations, classes, and build sessions.' },
        components: [{ sourceId: 'home-programs', id: 'programs-main' }],
      },
      {
        id: 'equipment',
        slug: 'equipment',
        title: 'Equipment',
        seo: { title: 'Juniper Works equipment', description: 'Synthetic workshop equipment and area status.' },
        components: [{ sourceId: 'home-equipment-status', id: 'equipment-main' }],
      },
      {
        id: 'projects',
        slug: 'projects',
        title: 'Projects',
        seo: { title: 'Juniper Works projects', description: 'Synthetic member-project gallery.' },
        components: [{ sourceId: 'home-gallery', id: 'projects-main' }],
      },
      {
        id: 'visit',
        slug: 'visit',
        title: 'Visit',
        seo: { title: 'Visit Juniper Works', description: 'Synthetic first-visit and workshop access information.' },
        components: [{ sourceId: 'home-visit', id: 'visit-main' }],
      },
    ],
    navigation: [
      { id: 'nav-home', label: 'Home', target: { kind: 'page', pageId: 'home' } },
      { id: 'nav-programs', label: 'Programs', target: { kind: 'page', pageId: 'programs' } },
      { id: 'nav-equipment', label: 'Equipment', target: { kind: 'page', pageId: 'equipment' } },
      { id: 'nav-projects', label: 'Projects', target: { kind: 'page', pageId: 'projects' } },
      { id: 'nav-visit', label: 'Visit', target: { kind: 'page', pageId: 'visit' } },
      { id: 'nav-community', label: 'Community', target: { kind: 'capability', capability: 'community' } },
    ],
  });
}

const REFERENCE_FACTORIES = Object.freeze({
  'fourth-street': fourthStreetSource,
  juniper: juniperSource,
  restaurant: restaurantSource,
  'live-music': musicSource,
});

function svgArtwork(width, height, label, body, background = '#111') {
  const safeLabel = String(label).replace(/[<>&'"]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${safeLabel}">
  <rect width="${width}" height="${height}" fill="${background}"/>
  ${body}
</svg>`;
}

function restaurantLogoSvg() {
  return svgArtwork(640, 640, 'Harbor & Hearth wordmark', `
  <rect x="44" y="44" width="552" height="552" rx="44" fill="#fbf7f0" stroke="#6b3b13" stroke-width="10"/>
  <circle cx="320" cy="255" r="132" fill="#6b3b13" opacity=".10"/>
  <path d="M250 175v165M390 175v165M250 255h140" stroke="#6b3b13" stroke-width="22" stroke-linecap="round"/>
  <text x="320" y="445" text-anchor="middle" fill="#211a16" font-family="Georgia,serif" font-size="44" font-weight="700">HARBOR &amp; HEARTH</text>
  <text x="320" y="494" text-anchor="middle" fill="#6b5b50" font-family="system-ui,sans-serif" font-size="22" letter-spacing="5">DINNER · PRIVATE EVENTS</text>`, '#f3eadf');
}

function musicLogoSvg() {
  return svgArtwork(640, 640, 'Northline Hall wordmark', `
  <circle cx="320" cy="260" r="168" fill="none" stroke="#ff6a78" stroke-width="18"/>
  <path d="M185 260h70l42-110 58 218 45-132 55 24" fill="none" stroke="#8fd4ff" stroke-width="18" stroke-linejoin="round"/>
  <text x="320" y="495" text-anchor="middle" fill="#f8f9fd" font-family="Arial Black,system-ui,sans-serif" font-size="47">NORTHLINE HALL</text>
  <text x="320" y="540" text-anchor="middle" fill="#b4bccf" font-family="system-ui,sans-serif" font-size="22" letter-spacing="5">LIVE MUSIC · RENO</text>`, '#111525');
}

function musicStageSvg() {
  return svgArtwork(1600, 1000, 'Concert stage with lights and crowd silhouettes', `
  <defs><linearGradient id="stage-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17213a"/><stop offset="1" stop-color="#090b13"/></linearGradient></defs>
  <rect width="1600" height="1000" fill="url(#stage-bg)"/>
  <g opacity=".78">
    <path d="M210 80 510 760H360Z" fill="#ff6a78"/><path d="M610 60 760 760H540Z" fill="#8fd4ff"/>
    <path d="M980 70 1120 760H900Z" fill="#ffd173"/><path d="M1370 80 1250 760H1450Z" fill="#ff6a78"/>
  </g>
  <rect x="260" y="600" width="1080" height="120" rx="18" fill="#111525" stroke="#555d78" stroke-width="8"/>
  <g fill="#e6e9f1"><circle cx="600" cy="560" r="38"/><rect x="570" y="590" width="60" height="145" rx="20"/><circle cx="1020" cy="555" r="38"/><rect x="990" y="585" width="60" height="150" rx="20"/></g>
  <g fill="#05070d"><path d="M0 870c150-120 290-90 390 0 120-135 290-110 390 0 120-145 300-110 390 0 140-120 285-95 430 0v130H0Z"/></g>`, '#171d31');
}

function musicPosterOneSvg() {
  return svgArtwork(1000, 1400, 'The Static Lights concert poster', `
  <defs><linearGradient id="p1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#351728"/><stop offset=".55" stop-color="#7f2947"/><stop offset="1" stop-color="#16192a"/></linearGradient></defs>
  <rect width="1000" height="1400" fill="url(#p1)"/>
  <circle cx="760" cy="360" r="260" fill="#ff929d" opacity=".22"/>
  <circle cx="260" cy="870" r="300" fill="#8fd4ff" opacity=".14"/>
  <g fill="none" stroke="#ff929d" stroke-width="16" opacity=".9"><path d="M80 600c220-230 390 230 610 0s270 20 270 20"/><path d="M70 680c260-180 370 180 600 0s290 10 290 10"/></g>
  <text x="82" y="170" fill="#fff7fa" font-family="Arial Black,system-ui,sans-serif" font-size="94">THE STATIC</text>
  <text x="82" y="270" fill="#fff7fa" font-family="Arial Black,system-ui,sans-serif" font-size="94">LIGHTS</text>
  <text x="82" y="1160" fill="#ffcad0" font-family="system-ui,sans-serif" font-size="42" font-weight="800">SEPT 18 · NORTHLINE HALL</text>
  <text x="82" y="1220" fill="#d9ddea" font-family="system-ui,sans-serif" font-size="30">21+ · doors 7:00 PM</text>`, '#351728');
}

function musicPosterTwoSvg() {
  return svgArtwork(1000, 1400, 'Signal Noise concert poster', `
  <rect width="1000" height="1400" fill="#102b3c"/>
  <g stroke="#8fd4ff" stroke-width="6" opacity=".55">
    <path d="M0 190h1000M0 390h1000M0 590h1000M0 790h1000M0 990h1000"/>
    <path d="M180 0v1400M380 0v1400M580 0v1400M780 0v1400"/>
  </g>
  <rect x="90" y="90" width="820" height="760" fill="#0b1520" stroke="#8fd4ff" stroke-width="12"/>
  <path d="M130 540 270 310l120 210 130-300 150 330 130-180 70 170" fill="none" stroke="#ff6a78" stroke-width="24" stroke-linejoin="round"/>
  <text x="100" y="990" fill="#f8f9fd" font-family="Arial Black,system-ui,sans-serif" font-size="112">SIGNAL</text>
  <text x="100" y="1100" fill="#8fd4ff" font-family="Arial Black,system-ui,sans-serif" font-size="112">/ NOISE</text>
  <text x="105" y="1225" fill="#d9ddea" font-family="system-ui,sans-serif" font-size="38" font-weight="800">SEPT 26 · ALL AGES</text>
  <text x="105" y="1285" fill="#b4bccf" font-family="system-ui,sans-serif" font-size="30">doors 6:30 PM · Northline Hall</text>`, '#102b3c');
}

const SYNTHETIC_ASSETS = Object.freeze({
  'restaurant-logo.svg': restaurantLogoSvg(),
  'music-logo.svg': musicLogoSvg(),
  'music-stage.svg': musicStageSvg(),
  'music-poster-one.svg': musicPosterOneSvg(),
  'music-poster-two.svg': musicPosterTwoSvg(),
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
