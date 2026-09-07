'use strict';

const { createDeploymentAgnosticVenueSource } = require('../source');
const {
  DEFAULT_DESIGN_COLORS,
  V1_DESIGN_RECIPE_DEFAULTS,
  V2_SOURCE_KIND,
  V2_SOURCE_SCHEMA_VERSION,
  createV2DeploymentAgnosticVenueSource,
} = require('./source');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mapV1Theme(theme) {
  if (!theme) return { ...DEFAULT_DESIGN_COLORS };
  return {
    canvas: theme.canvas,
    surface: theme.surface,
    surfaceRaised: theme.surface,
    surfaceStrong: theme.surface,
    border: theme.border,
    text: theme.text,
    textMuted: theme.mutedText,
    textSubtle: theme.mutedText,
    accent: theme.accent,
    accentHover: theme.accentHover,
    accentText: theme.canvas,
    focusRing: theme.accent,
    info: DEFAULT_DESIGN_COLORS.info,
    success: DEFAULT_DESIGN_COLORS.success,
    warning: DEFAULT_DESIGN_COLORS.warning,
    danger: DEFAULT_DESIGN_COLORS.danger,
  };
}

function mediaTreatment() {
  return {
    focalPoint: { x: 0.5, y: 0.5 },
    fit: 'cover',
    aspectRecipeId: 'aspect-original',
  };
}

function meaningfulUsage(assetId, alt) {
  return {
    assetId,
    alt,
    decorative: false,
    treatment: mediaTreatment(),
  };
}

function migrateCapabilityState(venueContext) {
  const hive = venueContext.hive;
  const community = {
    state: 'configured',
    binding: {
      communityId: hive.communityId,
      officialAccount: hive.officialAccount,
      threadsContainerAccount: hive.threadsContainerAccount,
    },
  };

  const merchantAccounts = [...hive.paymentMerchantAccounts];
  const hasBeneficiaryPolicy = Boolean(hive.beneficiaryPolicy);
  const transaction = merchantAccounts.length > 0 || hasBeneficiaryPolicy
    ? {
        state: 'configured',
        binding: {
          merchantAccounts,
          ...(hasBeneficiaryPolicy
            ? { beneficiaryPolicy: clone(hive.beneficiaryPolicy) }
            : {}),
        },
      }
    : { state: 'disabled' };

  return { community, transaction };
}

function migrateV1DeploymentAgnosticVenueSource(input) {
  const v1 = createDeploymentAgnosticVenueSource(input);
  const mediaAssets = [
    {
      id: 'logo',
      src: v1.venuePackage.brand.logo.src,
      width: v1.venuePackage.brand.logo.width,
      height: v1.venuePackage.brand.logo.height,
    },
    {
      id: 'hero-image',
      src: v1.venuePackage.home.hero.image.src,
      width: v1.venuePackage.home.hero.image.width,
      height: v1.venuePackage.home.hero.image.height,
    },
  ];

  const components = [
    {
      id: 'home-hero',
      kind: 'venue-hero',
      recipeId: 'hero-legacy-v1',
      content: {
        eyebrow: null,
        heading: null,
        body: v1.venuePackage.home.hero.lede,
        note: v1.venuePackage.home.hero.footnote,
        media: meaningfulUsage('hero-image', v1.venuePackage.home.hero.image.alt),
        primaryAction: null,
      },
    },
    {
      id: 'home-official-updates',
      kind: 'official-updates',
      recipeId: 'updates-legacy-v1',
      content: clone(v1.venuePackage.home.updates),
    },
  ];

  const resources = {
    events: [],
    programs: [],
    menus: [],
    equipment: [],
  };

  if (v1.venuePackage.home.programs) {
    resources.programs = clone(v1.venuePackage.home.programs.items);
    components.push({
      id: 'home-programs',
      kind: 'program-list',
      recipeId: 'program-list-legacy-v1',
      content: {
        kicker: v1.venuePackage.home.programs.kicker,
        heading: v1.venuePackage.home.programs.heading,
        intro: v1.venuePackage.home.programs.intro,
        emptyLead: v1.venuePackage.home.programs.emptyLead,
        emptyBody: v1.venuePackage.home.programs.emptyBody,
        resourceIds: resources.programs.map((program) => program.id),
      },
    });
  }

  if (v1.venuePackage.home.equipmentStatus) {
    resources.equipment = clone(v1.venuePackage.home.equipmentStatus.items);
    components.push({
      id: 'home-equipment-status',
      kind: 'equipment-status',
      recipeId: 'equipment-status-legacy-v1',
      content: {
        kicker: v1.venuePackage.home.equipmentStatus.kicker,
        heading: v1.venuePackage.home.equipmentStatus.heading,
        intro: v1.venuePackage.home.equipmentStatus.intro,
        emptyLead: v1.venuePackage.home.equipmentStatus.emptyLead,
        emptyBody: v1.venuePackage.home.equipmentStatus.emptyBody,
        resourceIds: resources.equipment.map((item) => item.id),
      },
    });
  }

  components.push(
    {
      id: 'home-pathways',
      kind: 'editorial-intro',
      recipeId: 'intro-legacy-v1',
      content: {
        kicker: v1.venuePackage.home.pathways.kicker,
        heading: v1.venuePackage.home.pathways.heading,
        body: v1.venuePackage.home.pathways.intro,
        note: null,
      },
    },
    {
      id: 'home-visit',
      kind: 'contact-visit',
      recipeId: 'visit-legacy-v1',
      content: {
        kicker: v1.venuePackage.home.visit.kicker,
        heading: v1.venuePackage.home.visit.heading,
        body: v1.venuePackage.home.visit.lede,
        note: v1.venuePackage.home.visit.note,
      },
    },
    {
      id: 'home-community-entry',
      kind: 'community-entry',
      recipeId: 'community-legacy-v1',
      content: {
        kicker: v1.venuePackage.home.community.kicker,
        heading: v1.venuePackage.home.community.heading,
        body: v1.venuePackage.home.community.lede,
        note: null,
      },
    },
  );

  const galleryItems = v1.venuePackage.home.gallery.items.map((item, index) => {
    const suffix = String(index + 1).padStart(2, '0');
    const assetId = `gallery-image-${suffix}`;
    const usageId = `gallery-${suffix}`;
    mediaAssets.push({
      id: assetId,
      src: item.src,
      width: item.width,
      height: item.height,
    });
    return {
      id: usageId,
      assetId,
      alt: item.alt,
      decorative: false,
      caption: item.caption,
      treatment: mediaTreatment(),
    };
  });

  components.push({
    id: 'home-gallery',
    kind: 'gallery',
    recipeId: 'gallery-legacy-v1',
    content: {
      kicker: v1.venuePackage.home.gallery.kicker,
      heading: v1.venuePackage.home.gallery.heading,
      intro: v1.venuePackage.home.gallery.intro,
      items: galleryItems,
    },
  });

  const capabilities = migrateCapabilityState(v1.venueContext);
  const source = {
    kind: V2_SOURCE_KIND,
    schemaVersion: V2_SOURCE_SCHEMA_VERSION,
    provenance: {
      origin: 'v1-migration',
      sourceSchemaVersion: 1,
      sourcePackageId: v1.venuePackage.id,
      starterId: null,
    },
    venue: {
      id: v1.venueContext.id,
      displayName: v1.venueContext.displayName,
      business: clone(v1.venueContext.business),
      language: clone(v1.venuePackage.onboarding),
    },
    media: {
      assets: mediaAssets,
    },
    resources,
    site: {
      id: `${v1.venueContext.id}-site`,
      homePageId: 'home',
      brand: {
        logoAssetId: 'logo',
        design: {
          colors: mapV1Theme(v1.venuePackage.brand.theme),
          ...V1_DESIGN_RECIPE_DEFAULTS,
        },
      },
      pages: [
        {
          id: 'home',
          slug: '',
          title: 'Home',
          seo: {
            title: null,
            description: v1.venuePackage.seo.defaultDescription,
          },
          components,
        },
      ],
      navigation: [
        {
          id: 'nav-home',
          label: 'Home',
          target: { kind: 'page', pageId: 'home' },
        },
        {
          id: 'nav-community',
          label: 'Community',
          target: { kind: 'capability', capability: 'community' },
        },
      ],
    },
    capabilities,
  };

  return createV2DeploymentAgnosticVenueSource(source);
}

module.exports = {
  mapV1Theme,
  migrateV1DeploymentAgnosticVenueSource,
};
