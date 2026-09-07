'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  deriveDeploymentAgnosticVenueSourceDigest,
  extractDeploymentAgnosticVenueSource,
} = require('../src/venue/source');
const {
  DEFAULT_DESIGN_COLORS,
  OWNERSHIP,
  V2_SOURCE_KIND,
  buildV2OwnershipMap,
  createV2DeploymentAgnosticVenueSource,
  createV2SemanticCanvasProjection,
  deriveV2DeploymentAgnosticVenueSourceDigest,
  listV2CanvasNodes,
  resetResponsiveOverride,
  resolveResponsiveComponent,
  serializeV2DeploymentAgnosticVenueSource,
} = require('../src/venue/v2/source');
const {
  mapV1Theme,
  migrateV1DeploymentAgnosticVenueSource,
} = require('../src/venue/v2/migrate-v1');
const {
  FOURTH_STREET_AUTHORING_INPUT,
} = require('./support/hv5-authoring-fixtures');
const {
  JUNIPER_WORKS_AUTHORING_INPUT,
} = require('./support/hv7-juniper-venue');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function design(overrides = {}) {
  return {
    colors: { ...DEFAULT_DESIGN_COLORS, ...(overrides.colors || {}) },
    typographyRecipeId: overrides.typographyRecipeId || 'type-system-sans',
    densityRecipeId: overrides.densityRecipeId || 'density-standard',
    shapeRecipeId: overrides.shapeRecipeId || 'shape-soft',
    surfaceRecipeId: overrides.surfaceRecipeId || 'surface-layered',
  };
}

function mediaUsage(assetId, alt, aspectRecipeId = 'aspect-landscape-wide') {
  return {
    assetId,
    alt,
    decorative: false,
    treatment: {
      focalPoint: { x: 0.5, y: 0.5 },
      fit: 'cover',
      aspectRecipeId,
    },
  };
}

function restaurantFixture() {
  return {
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
      language: {
        operatorNoun: 'restaurant',
        staffRole: 'host',
      },
    },
    media: {
      assets: [
        {
          id: 'logo',
          src: '/fixtures/v2/restaurant/logo.svg',
          width: 600,
          height: 600,
        },
        {
          id: 'dining-room',
          src: '/fixtures/v2/restaurant/dining-room.svg',
          width: 1600,
          height: 1000,
        },
        {
          id: 'private-dining',
          src: '/fixtures/v2/restaurant/private-dining.svg',
          width: 1200,
          height: 900,
        },
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
              title: 'Starters',
              items: [
                {
                  id: 'oysters',
                  name: 'Oysters',
                  description: 'Daily selection',
                  priceLabel: '$18',
                },
              ],
            },
            {
              id: 'mains',
              title: 'Mains',
              items: [
                {
                  id: 'market-fish',
                  name: 'Market fish',
                  description: 'Seasonal vegetables and herbs',
                  priceLabel: '$34',
                },
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
      brand: {
        logoAssetId: 'logo',
        design: design({
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
            title: null,
            description: 'Synthetic restaurant fixture for HiVenues v2 foundation tests.',
          },
          components: [
            {
              id: 'home-hero',
              kind: 'venue-hero',
              recipeId: 'hero-editorial-split',
              content: {
                eyebrow: 'Synthetic restaurant reference',
                heading: 'A warmer kind of gathering',
                body: 'A fixture-only restaurant experience used to prove semantic venue composition.',
                note: null,
                media: mediaUsage('dining-room', 'Synthetic dining room overlooking a harbor'),
                primaryAction: {
                  label: 'Reserve',
                  href: 'https://harbor-hearth.example/reservations',
                },
              },
              responsive: {
                tablet: { layoutVariant: 'stacked' },
                mobile: {},
              },
            },
            {
              id: 'home-gallery',
              kind: 'gallery',
              recipeId: 'gallery-feature-grid',
              content: {
                kicker: 'The space',
                heading: 'Gather by the water',
                intro: 'Synthetic venue imagery for deterministic tests.',
                items: [
                  {
                    id: 'gallery-private-dining',
                    assetId: 'private-dining',
                    alt: 'Synthetic private dining room',
                    decorative: false,
                    caption: 'Fixture private dining room',
                    treatment: {
                      focalPoint: { x: 0.45, y: 0.5 },
                      fit: 'cover',
                      aspectRecipeId: 'aspect-landscape',
                    },
                  },
                ],
              },
              responsive: {
                tablet: { columns: 2 },
                mobile: { columns: 1 },
              },
            },
            {
              id: 'home-visit',
              kind: 'contact-visit',
              recipeId: 'visit-legacy-v1',
              content: {
                kicker: 'Visit',
                heading: 'Plan your evening',
                body: 'Find the synthetic venue and review hours before visiting.',
                note: 'Fixture-only address and contact details.',
              },
              responsive: { tablet: {}, mobile: {} },
            },
          ],
        },
        {
          id: 'menu',
          slug: 'menu',
          title: 'Menu',
          seo: {
            title: 'Dinner menu',
            description: 'Synthetic accessible dinner menu.',
          },
          components: [
            {
              id: 'menu-main',
              kind: 'menu',
              recipeId: 'list-editorial-rows',
              content: {
                kicker: 'Dinner',
                heading: 'Seasonal menu',
                intro: 'Fixture-only menu content.',
                emptyLead: null,
                emptyBody: null,
                resourceIds: ['dinner'],
              },
              responsive: { tablet: {}, mobile: {} },
            },
          ],
        },
        {
          id: 'private-events',
          slug: 'private-events',
          title: 'Private Events',
          seo: {
            title: null,
            description: 'Synthetic private-events information.',
          },
          components: [
            {
              id: 'private-events-intro',
              kind: 'editorial-intro',
              recipeId: 'intro-legacy-v1',
              content: {
                kicker: 'Private events',
                heading: 'Host a gathering',
                body: 'Fixture-only private-events copy.',
                note: null,
              },
              responsive: { tablet: {}, mobile: {} },
            },
          ],
        },
      ],
      navigation: [
        {
          id: 'nav-home',
          label: 'Home',
          target: { kind: 'page', pageId: 'home' },
        },
        {
          id: 'nav-menu',
          label: 'Menu',
          target: { kind: 'page', pageId: 'menu' },
        },
        {
          id: 'nav-private-events',
          label: 'Private Events',
          target: { kind: 'page', pageId: 'private-events' },
        },
      ],
    },
    capabilities: {
      community: { state: 'disabled' },
      transaction: { state: 'disabled' },
    },
  };
}

function musicFixture() {
  return {
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
        address: '200 Example Music Ave, Reno, NV 89501',
        phone: '(555) 010-9000',
        hours: 'Event hours vary by show.',
        websiteUrl: 'https://northline-hall.example/',
        mapUrl: 'https://northline-hall.example/visit',
      },
      language: {
        operatorNoun: 'music venue',
        staffRole: 'venue staff',
      },
    },
    media: {
      assets: [
        {
          id: 'logo',
          src: '/fixtures/v2/music/logo.svg',
          width: 600,
          height: 600,
        },
        {
          id: 'venue-stage',
          src: '/fixtures/v2/music/stage.svg',
          width: 1600,
          height: 1000,
        },
        {
          id: 'show-poster',
          src: '/fixtures/v2/music/show-poster.svg',
          width: 1000,
          height: 1400,
        },
      ],
    },
    resources: {
      events: [
        {
          id: 'fixture-show-one',
          slug: 'fixture-show-one',
          title: 'Fixture Artist One',
          startAt: '2026-09-18T20:00:00-07:00',
          endAt: '2026-09-18T23:00:00-07:00',
          state: 'scheduled',
          description: 'Synthetic live-music event used only for HiVenues tests.',
          mediaAssetId: 'show-poster',
          accessNote: '21+ fixture event',
          externalAction: {
            label: 'Tickets',
            href: 'https://northline-hall.example/tickets/fixture-show-one',
          },
        },
      ],
      programs: [],
      menus: [],
      equipment: [],
    },
    site: {
      id: 'northline-hall-site',
      homePageId: 'home',
      brand: {
        logoAssetId: 'logo',
        design: design({
          typographyRecipeId: 'type-poster',
          densityRecipeId: 'density-standard',
          shapeRecipeId: 'shape-crisp',
          surfaceRecipeId: 'surface-elevated',
        }),
      },
      pages: [
        {
          id: 'home',
          slug: '',
          title: 'Home',
          seo: {
            title: null,
            description: 'Synthetic live-music venue fixture for HiVenues v2 tests.',
          },
          components: [
            {
              id: 'home-hero',
              kind: 'venue-hero',
              recipeId: 'hero-poster',
              content: {
                eyebrow: 'Live music',
                heading: 'Live music lives here',
                body: 'Synthetic event-forward venue copy.',
                note: null,
                media: mediaUsage('venue-stage', 'Synthetic live-music venue stage'),
                primaryAction: {
                  label: 'See shows',
                  href: 'https://northline-hall.example/shows',
                },
              },
              responsive: { tablet: {}, mobile: {} },
            },
            {
              id: 'home-shows',
              kind: 'event-list',
              recipeId: 'list-poster-rows',
              content: {
                kicker: 'Upcoming',
                heading: 'Shows',
                intro: 'Fixture-only events.',
                emptyLead: 'No shows listed.',
                emptyBody: 'Check back for fixture events.',
                resourceIds: ['fixture-show-one'],
              },
              responsive: { tablet: {}, mobile: { density: 'compact' } },
            },
          ],
        },
        {
          id: 'shows',
          slug: 'shows',
          title: 'Shows',
          seo: {
            title: 'Upcoming shows',
            description: 'Synthetic upcoming live-music events.',
          },
          components: [
            {
              id: 'shows-list',
              kind: 'event-list',
              recipeId: 'list-poster-rows',
              content: {
                kicker: 'Calendar',
                heading: 'Upcoming shows',
                intro: null,
                emptyLead: 'No shows listed.',
                emptyBody: 'Check back for fixture events.',
                resourceIds: ['fixture-show-one'],
              },
              responsive: { tablet: {}, mobile: { density: 'compact' } },
            },
          ],
        },
      ],
      navigation: [
        {
          id: 'nav-home',
          label: 'Home',
          target: { kind: 'page', pageId: 'home' },
        },
        {
          id: 'nav-shows',
          label: 'Shows',
          target: { kind: 'page', pageId: 'shows' },
        },
      ],
    },
    capabilities: {
      community: { state: 'disabled' },
      transaction: { state: 'disabled' },
    },
  };
}

function sourceFromAuthoring(authoring) {
  return extractDeploymentAgnosticVenueSource(authoring);
}

function nodeIds(projection) {
  return listV2CanvasNodes(projection).map((node) => node.id).sort();
}

test('v2 accepts a complete public-only restaurant without Hive capability identity', () => {
  const source = createV2DeploymentAgnosticVenueSource(restaurantFixture());

  assert.equal(source.schemaVersion, 2);
  assert.equal(source.capabilities.community.state, 'disabled');
  assert.equal(source.capabilities.transaction.state, 'disabled');
  assert.equal(source.site.pages.length, 3);
  assert.deepEqual(source.resources.menus[0].sections[0].items[0], {
    id: 'oysters',
    name: 'Oysters',
    description: 'Daily selection',
    priceLabel: '$18',
  });
  assert.equal(Object.isFrozen(source), true);
  assert.equal(Object.isFrozen(source.site.pages), true);
  assert.equal(Object.prototype.hasOwnProperty.call(source, 'deploymentRef'), false);
});

test('v2 canonical source serialization is stable across root insertion order and uses its own digest domain', () => {
  const original = restaurantFixture();
  const reordered = {
    capabilities: original.capabilities,
    site: original.site,
    resources: original.resources,
    media: original.media,
    venue: original.venue,
    provenance: original.provenance,
    schemaVersion: original.schemaVersion,
    kind: original.kind,
  };

  assert.equal(
    serializeV2DeploymentAgnosticVenueSource(original),
    serializeV2DeploymentAgnosticVenueSource(reordered),
  );

  const v1 = sourceFromAuthoring(FOURTH_STREET_AUTHORING_INPUT);
  const migrated = migrateV1DeploymentAgnosticVenueSource(v1);
  assert.notEqual(
    deriveDeploymentAgnosticVenueSourceDigest(v1),
    deriveV2DeploymentAgnosticVenueSourceDigest(migrated),
  );
});

test('v2 source fails closed for unknown authority, secrets, raw style escape hatches, and recipe errors', () => {
  const cases = [];

  const unknownRoot = clone(restaurantFixture());
  unknownRoot.deploymentRef = { id: 'forbidden' };
  cases.push(unknownRoot);

  const secret = clone(restaurantFixture());
  secret.apiToken = 'do-not-admit';
  cases.push(secret);

  const rawStyle = clone(restaurantFixture());
  rawStyle.site.pages[0].components[0].content.style = { marginTop: '37px' };
  cases.push(rawStyle);

  const unknownKind = clone(restaurantFixture());
  unknownKind.site.pages[0].components[0].kind = 'raw-html';
  cases.push(unknownKind);

  const unknownRecipe = clone(restaurantFixture());
  unknownRecipe.site.pages[0].components[0].recipeId = 'hero-secret-custom-css';
  cases.push(unknownRecipe);

  const incompatibleRecipe = clone(restaurantFixture());
  incompatibleRecipe.site.pages[0].components[0].recipeId = 'gallery-strip';
  cases.push(incompatibleRecipe);

  const customBreakpoint = clone(restaurantFixture());
  customBreakpoint.site.pages[0].components[0].responsive.desktop = { alignment: 'center' };
  cases.push(customBreakpoint);

  for (const candidate of cases) {
    assert.throws(() => createV2DeploymentAgnosticVenueSource(candidate));
  }
});

test('v2 validates media accessibility, references, capability prerequisites, and stable routes', () => {
  const decorativeConflict = clone(restaurantFixture());
  decorativeConflict.site.pages[0].components[0].content.media.decorative = true;
  assert.throws(
    () => createV2DeploymentAgnosticVenueSource(decorativeConflict),
    /Decorative media usage must not provide alt text/,
  );

  const missingMedia = clone(restaurantFixture());
  missingMedia.site.pages[0].components[0].content.media.assetId = 'missing-media';
  assert.throws(
    () => createV2DeploymentAgnosticVenueSource(missingMedia),
    /references missing media/,
  );

  const missingMenu = clone(restaurantFixture());
  missingMenu.site.pages[1].components[0].content.resourceIds = ['missing-menu'];
  assert.throws(
    () => createV2DeploymentAgnosticVenueSource(missingMenu),
    /references missing menus resource/,
  );

  const disabledCommunity = clone(restaurantFixture());
  disabledCommunity.site.pages[0].components.push({
    id: 'home-community',
    kind: 'community-entry',
    recipeId: 'community-card',
    content: {
      kicker: 'Community',
      heading: 'Join us',
      body: 'Fixture-only community entry.',
      note: null,
    },
    responsive: { tablet: {}, mobile: {} },
  });
  assert.throws(
    () => createV2DeploymentAgnosticVenueSource(disabledCommunity),
    /requires configured Community capability/,
  );

  const duplicateSlug = clone(restaurantFixture());
  duplicateSlug.site.pages[2].slug = 'menu';
  assert.throws(
    () => createV2DeploymentAgnosticVenueSource(duplicateSlug),
    /duplicate page slug/,
  );

  const duplicateEventSlug = clone(musicFixture());
  duplicateEventSlug.resources.events.push({
    ...clone(duplicateEventSlug.resources.events[0]),
    id: 'fixture-show-two',
  });
  assert.throws(
    () => createV2DeploymentAgnosticVenueSource(duplicateEventSlug),
    /duplicate event slug/,
  );
});

test('configured capability bindings are strict and transaction authority stays privileged', () => {
  const incompleteCommunity = clone(restaurantFixture());
  incompleteCommunity.capabilities.community = {
    state: 'configured',
    binding: {
      communityId: 'hive-108590',
      officialAccount: 'fourthstreetbar',
    },
  };
  assert.throws(() => createV2DeploymentAgnosticVenueSource(incompleteCommunity));

  const configured = clone(restaurantFixture());
  configured.capabilities.transaction = {
    state: 'configured',
    binding: {
      merchantAccounts: ['fourthstreetbar'],
    },
  };
  const source = createV2DeploymentAgnosticVenueSource(configured);
  const ownership = buildV2OwnershipMap(source);

  assert.equal(
    ownership['/capabilities/transaction/binding/merchantAccounts'],
    OWNERSHIP.SECURITY_PRIVILEGED,
  );
  assert.equal(
    ownership['/capabilities/community/state'],
    OWNERSHIP.INTEGRATION_OWNED,
  );
  assert.equal(
    ownership['/site/pages/0/components/0/id'],
    OWNERSHIP.OPERATOR_COLLECTION_ID,
  );
  assert.equal(
    ownership['/media/assets/0/width'],
    OWNERSHIP.DERIVED,
  );
  assert.equal(
    ownership['/provenance/sourcePackageId'],
    OWNERSHIP.DERIVED,
  );
});

test('responsive resolution inherits Desktop to Tablet to Mobile and reset restores exact inheritance', () => {
  const input = restaurantFixture().site.pages[0].components[0];
  const component = clone(input);
  component.responsive = {
    tablet: {
      layoutVariant: 'stacked',
      alignment: 'center',
    },
    mobile: {
      alignment: 'start',
    },
  };

  const desktop = resolveResponsiveComponent(component, 'desktop');
  const tablet = resolveResponsiveComponent(component, 'tablet');
  const mobile = resolveResponsiveComponent(component, 'mobile');

  assert.equal(desktop.values.layoutVariant, 'split');
  assert.equal(desktop.values.alignment, 'start');
  assert.equal(tablet.values.layoutVariant, 'stacked');
  assert.equal(tablet.values.alignment, 'center');
  assert.equal(tablet.sources.alignment, 'tablet');
  assert.equal(mobile.values.layoutVariant, 'stacked');
  assert.equal(mobile.values.alignment, 'start');
  assert.equal(mobile.sources.alignment, 'mobile');

  const withoutMobile = resetResponsiveOverride(component, 'mobile', 'alignment');
  const inheritedMobile = resolveResponsiveComponent(withoutMobile, 'mobile');
  assert.equal(inheritedMobile.values.alignment, 'center');
  assert.equal(inheritedMobile.sources.alignment, 'tablet');

  const withoutTablet = resetResponsiveOverride(withoutMobile, 'tablet', 'alignment');
  const resetMobile = resolveResponsiveComponent(withoutTablet, 'mobile');
  assert.equal(resetMobile.values.alignment, 'start');
  assert.equal(resetMobile.sources.alignment, 'desktop');

  const invalid = clone(component);
  invalid.responsive.tablet.columns = 4;
  assert.throws(
    () => resolveResponsiveComponent(invalid, 'tablet'),
    /responsive override columns is not allowed/,
  );
});

test('Fourth Street v1 migration is deterministic and preserves venue, Hive, payment, media, and colors', () => {
  const v1 = sourceFromAuthoring(FOURTH_STREET_AUTHORING_INPUT);
  const first = migrateV1DeploymentAgnosticVenueSource(v1);
  const second = migrateV1DeploymentAgnosticVenueSource(clone(v1));

  assert.equal(
    serializeV2DeploymentAgnosticVenueSource(first),
    serializeV2DeploymentAgnosticVenueSource(second),
  );
  assert.equal(
    deriveV2DeploymentAgnosticVenueSourceDigest(first),
    deriveV2DeploymentAgnosticVenueSourceDigest(second),
  );

  assert.equal(first.venue.id, v1.venueContext.id);
  assert.equal(first.venue.displayName, v1.venueContext.displayName);
  assert.deepEqual(first.venue.business, v1.venueContext.business);
  assert.equal(first.provenance.sourcePackageId, v1.venuePackage.id);
  assert.equal(first.capabilities.community.state, 'configured');
  assert.deepEqual(first.capabilities.community.binding, {
    communityId: v1.venueContext.hive.communityId,
    officialAccount: v1.venueContext.hive.officialAccount,
    threadsContainerAccount: v1.venueContext.hive.threadsContainerAccount,
  });
  assert.equal(first.capabilities.transaction.state, 'configured');
  assert.deepEqual(
    first.capabilities.transaction.binding.merchantAccounts,
    v1.venueContext.hive.paymentMerchantAccounts,
  );
  assert.equal(first.media.assets[0].src, v1.venuePackage.brand.logo.src);
  assert.equal(first.media.assets[1].src, v1.venuePackage.home.hero.image.src);

  const mappedTheme = mapV1Theme(v1.venuePackage.brand.theme);
  assert.deepEqual(first.site.brand.design.colors, mappedTheme);
  for (const [v1Key, v2Key] of [
    ['canvas', 'canvas'],
    ['surface', 'surface'],
    ['border', 'border'],
    ['text', 'text'],
    ['mutedText', 'textMuted'],
    ['accent', 'accent'],
    ['accentHover', 'accentHover'],
  ]) {
    assert.equal(first.site.brand.design.colors[v2Key], v1.venuePackage.brand.theme[v1Key]);
  }
});

test('Juniper migration preserves synthetic identity and stable program/equipment ids with deterministic gallery usages', () => {
  const v1 = sourceFromAuthoring(JUNIPER_WORKS_AUTHORING_INPUT);
  const migrated = migrateV1DeploymentAgnosticVenueSource(v1);

  assert.equal(migrated.venue.id, 'juniper-works-fixture');
  assert.equal(migrated.provenance.sourcePackageId, v1.venuePackage.id);
  assert.deepEqual(
    migrated.resources.programs.map((item) => item.id),
    v1.venuePackage.home.programs.items.map((item) => item.id),
  );
  assert.deepEqual(
    migrated.resources.equipment.map((item) => item.id),
    v1.venuePackage.home.equipmentStatus.items.map((item) => item.id),
  );

  const gallery = migrated.site.pages[0].components.find((component) => component.id === 'home-gallery');
  assert.deepEqual(
    gallery.content.items.map((item) => item.id),
    ['gallery-01', 'gallery-02', 'gallery-03'],
  );
  assert.deepEqual(
    gallery.content.items.map((item) => item.assetId),
    ['gallery-image-01', 'gallery-image-02', 'gallery-image-03'],
  );
});

test('restaurant and live-music references share one parser while proving menu and event resource breadth', () => {
  const restaurant = createV2DeploymentAgnosticVenueSource(restaurantFixture());
  const music = createV2DeploymentAgnosticVenueSource(musicFixture());

  assert.equal(restaurant.capabilities.community.state, 'disabled');
  assert.equal(music.capabilities.community.state, 'disabled');
  assert.equal(restaurant.resources.menus[0].id, 'dinner');
  assert.equal(music.resources.events[0].slug, 'fixture-show-one');

  const restaurantKinds = new Set(
    restaurant.site.pages.flatMap((page) => page.components.map((component) => component.kind)),
  );
  const musicKinds = new Set(
    music.site.pages.flatMap((page) => page.components.map((component) => component.kind)),
  );
  assert.equal(restaurantKinds.has('menu'), true);
  assert.equal(restaurantKinds.has('gallery'), true);
  assert.equal(musicKinds.has('event-list'), true);
  assert.equal(musicKinds.has('venue-hero'), true);
});

test('stable source and Canvas identities survive array reordering', () => {
  const original = createV2DeploymentAgnosticVenueSource(restaurantFixture());
  const reorderedInput = clone(original);
  reorderedInput.site.pages.reverse();
  const home = reorderedInput.site.pages.find((page) => page.id === 'home');
  home.components.reverse();
  reorderedInput.site.navigation.reverse();
  reorderedInput.media.assets.reverse();
  reorderedInput.resources.menus.reverse();

  const reordered = createV2DeploymentAgnosticVenueSource(reorderedInput);

  assert.deepEqual(
    [...original.site.pages.map((page) => page.id)].sort(),
    [...reordered.site.pages.map((page) => page.id)].sort(),
  );
  assert.deepEqual(
    [...original.site.navigation.map((entry) => entry.id)].sort(),
    [...reordered.site.navigation.map((entry) => entry.id)].sort(),
  );
  assert.deepEqual(
    [...original.media.assets.map((asset) => asset.id)].sort(),
    [...reordered.media.assets.map((asset) => asset.id)].sort(),
  );

  const beforeProjection = createV2SemanticCanvasProjection(original);
  const afterProjection = createV2SemanticCanvasProjection(reordered);
  assert.deepEqual(nodeIds(beforeProjection), nodeIds(afterProjection));

  const componentNode = listV2CanvasNodes(afterProjection)
    .find((node) => node.id === 'component:menu-main');
  assert.equal(componentNode.stableIdentity.value, 'menu-main');
  assert.equal(
    componentNode.children.some((node) => node.id === 'resource:menus:dinner'),
    true,
  );
  assert.equal(afterProjection.authority.runtimeWired, false);
  assert.equal(afterProjection.authority.persistent, false);
});

test('v2 design contrast and recipe validation fail closed instead of silently correcting brand intent', () => {
  const lowContrast = clone(restaurantFixture());
  lowContrast.site.brand.design.colors.text = lowContrast.site.brand.design.colors.canvas;
  assert.throws(
    () => createV2DeploymentAgnosticVenueSource(lowContrast),
    /Insufficient contrast/,
  );

  const badFocus = clone(restaurantFixture());
  badFocus.site.brand.design.colors.focusRing = badFocus.site.brand.design.colors.canvas;
  assert.throws(
    () => createV2DeploymentAgnosticVenueSource(badFocus),
    /Insufficient focusRing contrast/,
  );

  const unknownTypography = clone(restaurantFixture());
  unknownTypography.site.brand.design.typographyRecipeId = 'font-arbitrary-url';
  assert.throws(() => createV2DeploymentAgnosticVenueSource(unknownTypography));
});

test('v2 foundation emits stable evidence digests for the migration and public-only fixtures', () => {
  const fourth = migrateV1DeploymentAgnosticVenueSource(sourceFromAuthoring(FOURTH_STREET_AUTHORING_INPUT));
  const juniper = migrateV1DeploymentAgnosticVenueSource(sourceFromAuthoring(JUNIPER_WORKS_AUTHORING_INPUT));
  const restaurant = createV2DeploymentAgnosticVenueSource(restaurantFixture());
  const music = createV2DeploymentAgnosticVenueSource(musicFixture());

  const evidence = {
    fourthStreet: {
      venueId: fourth.venue.id,
      sourcePackageId: fourth.provenance.sourcePackageId,
      digest: deriveV2DeploymentAgnosticVenueSourceDigest(fourth),
    },
    juniper: {
      venueId: juniper.venue.id,
      sourcePackageId: juniper.provenance.sourcePackageId,
      digest: deriveV2DeploymentAgnosticVenueSourceDigest(juniper),
    },
    restaurant: {
      venueId: restaurant.venue.id,
      digest: deriveV2DeploymentAgnosticVenueSourceDigest(restaurant),
    },
    liveMusic: {
      venueId: music.venue.id,
      digest: deriveV2DeploymentAgnosticVenueSourceDigest(music),
    },
  };

  for (const item of Object.values(evidence)) {
    assert.match(item.digest, /^[0-9a-f]{64}$/);
  }

  console.log('V2_FOUNDATION_EVIDENCE', JSON.stringify(evidence));
});
