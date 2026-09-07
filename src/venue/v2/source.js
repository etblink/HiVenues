'use strict';

const crypto = require('node:crypto');
const { z } = require('zod');
const { HIVE_ACCOUNT_PATTERN, COMMUNITY_PATTERN, VENUE_ID_PATTERN } = require('../context');
const { contrastRatio } = require('../package');
const { assertNoSecretMaterial, serializeCanonicalJson } = require('../safe-document');

const V2_SOURCE_KIND = 'hive-venues-deployment-agnostic-source';
const V2_SOURCE_SCHEMA_VERSION = 2;
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COPY = z.string().trim().min(1).max(1200);
const SHORT_COPY = z.string().trim().min(1).max(240);
const ID = z.string().trim().min(2).max(80).regex(ID_PATTERN);
const HEX_COLOR = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).transform((value) => value.toLowerCase());

const OWNERSHIP = Object.freeze({
  PLATFORM_FIXED: 'PLATFORM_FIXED',
  OPERATOR_AUTHORED: 'OPERATOR_AUTHORED',
  OPERATOR_AUTHORED_COLLECTION: 'OPERATOR_AUTHORED_COLLECTION',
  OPERATOR_COLLECTION_ID: 'OPERATOR_COLLECTION_ID',
  INTEGRATION_OWNED: 'INTEGRATION_OWNED',
  SECURITY_PRIVILEGED: 'SECURITY_PRIVILEGED',
  DERIVED: 'DERIVED',
  DEPLOYMENT_OWNED: 'DEPLOYMENT_OWNED',
  SECRET_OR_PRIVATE__FORBIDDEN_FROM_SOURCE: 'SECRET_OR_PRIVATE__FORBIDDEN_FROM_SOURCE',
});

const TYPOGRAPHY_RECIPE_IDS = Object.freeze([
  'type-system-sans',
  'type-editorial',
  'type-grotesk-display',
  'type-poster',
]);
const DENSITY_RECIPE_IDS = Object.freeze([
  'density-compact',
  'density-standard',
  'density-generous',
]);
const SHAPE_RECIPE_IDS = Object.freeze([
  'shape-crisp',
  'shape-soft',
  'shape-rounded',
]);
const SURFACE_RECIPE_IDS = Object.freeze([
  'surface-flat',
  'surface-layered',
  'surface-elevated',
]);
const ASPECT_RECIPE_IDS = Object.freeze([
  'aspect-original',
  'aspect-landscape-wide',
  'aspect-landscape',
  'aspect-square',
  'aspect-portrait',
]);

const DEFAULT_DESIGN_COLORS = Object.freeze({
  canvas: '#080706',
  surface: '#11100f',
  surfaceRaised: '#191613',
  surfaceStrong: '#241f1b',
  border: '#3c342e',
  text: '#f7f1e8',
  textMuted: '#c8bfb4',
  textSubtle: '#9b9085',
  accent: '#f4a460',
  accentHover: '#f7bd82',
  accentText: '#080706',
  focusRing: '#f4a460',
  info: '#8fb4e0',
  success: '#76b78a',
  warning: '#f0b86b',
  danger: '#f08a8a',
});

const V1_DESIGN_RECIPE_DEFAULTS = Object.freeze({
  typographyRecipeId: 'type-system-sans',
  densityRecipeId: 'density-standard',
  shapeRecipeId: 'shape-soft',
  surfaceRecipeId: 'surface-layered',
});

const RESPONSIVE_OVERRIDE_KEYS = Object.freeze([
  'layoutVariant',
  'alignment',
  'density',
  'mediaPosition',
  'aspectRecipeId',
  'textMeasure',
  'columns',
]);

const COMPONENT_RECIPE_REGISTRY = deepFreeze({
  'hero-legacy-v1': recipe(['venue-hero'], { layoutVariant: 'stacked', alignment: 'start' }, ['alignment', 'aspectRecipeId']),
  'hero-immersive-media': recipe(['venue-hero'], { layoutVariant: 'feature', alignment: 'start' }, ['alignment', 'aspectRecipeId', 'textMeasure']),
  'hero-editorial-split': recipe(['venue-hero'], { layoutVariant: 'split', alignment: 'start', mediaPosition: 'end' }, ['layoutVariant', 'alignment', 'mediaPosition', 'aspectRecipeId', 'textMeasure']),
  'hero-poster': recipe(['venue-hero'], { layoutVariant: 'feature', alignment: 'start' }, ['alignment', 'aspectRecipeId', 'textMeasure']),
  'hero-text-led': recipe(['venue-hero'], { layoutVariant: 'stacked', alignment: 'start' }, ['alignment', 'textMeasure']),
  'gallery-legacy-v1': recipe(['gallery'], { layoutVariant: 'grid', columns: 3 }, ['columns', 'aspectRecipeId']),
  'gallery-disciplined-grid': recipe(['gallery'], { layoutVariant: 'grid', columns: 3 }, ['columns', 'aspectRecipeId']),
  'gallery-feature-grid': recipe(['gallery'], { layoutVariant: 'feature', columns: 2 }, ['columns', 'aspectRecipeId']),
  'gallery-strip': recipe(['gallery'], { layoutVariant: 'list', columns: 1 }, ['aspectRecipeId']),
  'updates-legacy-v1': recipe(['official-updates'], { layoutVariant: 'list' }, ['density']),
  'intro-legacy-v1': recipe(['editorial-intro'], { layoutVariant: 'stacked', alignment: 'start' }, ['alignment', 'textMeasure']),
  'visit-legacy-v1': recipe(['contact-visit'], { layoutVariant: 'stacked', alignment: 'start' }, ['alignment', 'textMeasure']),
  'hours-location-standard': recipe(['hours-location'], { layoutVariant: 'stacked', alignment: 'start' }, ['alignment', 'textMeasure']),
  'community-legacy-v1': recipe(['community-entry'], { layoutVariant: 'stacked', alignment: 'start' }, ['alignment', 'textMeasure']),
  'community-card': recipe(['community-entry'], { layoutVariant: 'feature', alignment: 'start' }, ['alignment', 'textMeasure']),
  'program-list-legacy-v1': recipe(['program-list'], { layoutVariant: 'list', density: 'standard' }, ['density']),
  'equipment-status-legacy-v1': recipe(['equipment-status'], { layoutVariant: 'list', density: 'standard' }, ['density']),
  'list-editorial-rows': recipe(['event-list', 'program-list', 'menu', 'menu-preview'], { layoutVariant: 'list', density: 'standard' }, ['density', 'textMeasure']),
  'list-compact-rows': recipe(['event-list', 'program-list', 'menu', 'menu-preview', 'equipment-status'], { layoutVariant: 'list', density: 'compact' }, ['density', 'textMeasure']),
  'list-card-grid': recipe(['event-list', 'program-list', 'menu-preview'], { layoutVariant: 'grid', columns: 3, density: 'standard' }, ['columns', 'density']),
  'list-poster-rows': recipe(['event-list'], { layoutVariant: 'list', density: 'compact' }, ['density', 'aspectRecipeId']),
  'status-grid': recipe(['equipment-status'], { layoutVariant: 'grid', columns: 3, density: 'standard' }, ['columns', 'density']),
});

const COMPONENT_KINDS = Object.freeze([
  'venue-hero',
  'gallery',
  'hours-location',
  'contact-visit',
  'event-list',
  'program-list',
  'menu',
  'menu-preview',
  'equipment-status',
  'community-entry',
  'official-updates',
  'editorial-intro',
]);

class V2VenueSourceError extends Error {
  constructor(message, options = {}) {
    super(`HiVenues v2 source invalid: ${message}`, options);
    this.name = 'V2VenueSourceError';
  }
}

function errorFactory(message) {
  return new V2VenueSourceError(message);
}

function recipe(componentKinds, defaults, allowedOverrides) {
  return {
    componentKinds: [...componentKinds],
    defaults: { ...defaults },
    allowedOverrides: [...allowedOverrides],
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function httpsUrl(value, context) {
  let url;
  try {
    url = new URL(value);
  } catch {
    context.addIssue({ code: 'custom', message: 'Must be a valid URL' });
    return z.NEVER;
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    context.addIssue({ code: 'custom', message: 'Must be a credential-free HTTPS URL' });
    return z.NEVER;
  }
  return url.toString();
}

function isoTimestamp(value, context) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || Number.isNaN(Date.parse(value))) {
    context.addIssue({ code: 'custom', message: 'Timestamp must be ISO-8601 with an explicit offset' });
  }
}

const HTTPS_URL = z.string().trim().transform(httpsUrl);
const ISO_TIMESTAMP = z.string().trim().max(40).superRefine(isoTimestamp);

const localAssetPath = z.string().trim().min(2).max(240).superRefine((value, context) => {
  if (!value.startsWith('/') || value.startsWith('//')) {
    context.addIssue({ code: 'custom', message: 'Managed media must use an absolute same-origin path' });
    return;
  }
  if (value.includes('\\') || value.includes('?') || value.includes('#') || value.includes('\0')) {
    context.addIssue({ code: 'custom', message: 'Managed media path is not normalized' });
    return;
  }
  const segments = value.split('/').slice(1);
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    context.addIssue({ code: 'custom', message: 'Managed media path may not traverse directories' });
  }
});

const mediaAssetSchema = z.object({
  id: ID,
  src: localAssetPath,
  width: z.number().int().positive().max(8192),
  height: z.number().int().positive().max(8192),
}).strict();

const focalPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
}).strict();

const mediaTreatmentSchema = z.object({
  focalPoint: focalPointSchema,
  fit: z.enum(['cover', 'contain']),
  aspectRecipeId: z.enum(ASPECT_RECIPE_IDS),
}).strict();

const mediaUsageSchema = z.object({
  assetId: ID,
  alt: SHORT_COPY.nullable(),
  decorative: z.boolean(),
  treatment: mediaTreatmentSchema,
}).strict().superRefine((value, context) => {
  if (value.decorative && value.alt !== null) {
    context.addIssue({ code: 'custom', message: 'Decorative media usage must not provide alt text' });
  }
  if (!value.decorative && value.alt === null) {
    context.addIssue({ code: 'custom', message: 'Meaningful media usage requires alt text' });
  }
});

const galleryUsageSchema = z.object({
  id: ID,
  assetId: ID,
  alt: SHORT_COPY.nullable(),
  decorative: z.boolean(),
  caption: SHORT_COPY.nullable(),
  treatment: mediaTreatmentSchema,
}).strict().superRefine((value, context) => {
  if (value.decorative && value.alt !== null) {
    context.addIssue({ code: 'custom', message: 'Decorative gallery usage must not provide alt text' });
  }
  if (!value.decorative && value.alt === null) {
    context.addIssue({ code: 'custom', message: 'Meaningful gallery usage requires alt text' });
  }
});

const actionSchema = z.object({
  label: SHORT_COPY,
  href: HTTPS_URL,
}).strict();

const eventResourceSchema = z.object({
  id: ID,
  slug: z.string().trim().min(1).max(100).regex(SLUG_PATTERN),
  title: SHORT_COPY,
  startAt: ISO_TIMESTAMP,
  endAt: ISO_TIMESTAMP,
  state: z.enum(['scheduled', 'full', 'cancelled']),
  description: COPY,
  mediaAssetId: ID.nullable().default(null),
  accessNote: SHORT_COPY.nullable().default(null),
  externalAction: actionSchema.nullable().default(null),
}).strict().superRefine((value, context) => {
  if (Date.parse(value.endAt) <= Date.parse(value.startAt)) {
    context.addIssue({ code: 'custom', message: 'Event endAt must be after startAt' });
  }
});

const programResourceSchema = z.object({
  id: ID,
  title: SHORT_COPY,
  startAt: ISO_TIMESTAMP,
  endAt: ISO_TIMESTAMP,
  description: COPY,
  accessNote: SHORT_COPY,
  state: z.enum(['scheduled', 'full', 'cancelled']),
  link: HTTPS_URL.nullable().default(null),
}).strict().superRefine((value, context) => {
  if (Date.parse(value.endAt) <= Date.parse(value.startAt)) {
    context.addIssue({ code: 'custom', message: 'Program endAt must be after startAt' });
  }
});

const menuItemSchema = z.object({
  id: ID,
  name: SHORT_COPY,
  description: SHORT_COPY.nullable().default(null),
  priceLabel: z.string().trim().min(1).max(80).nullable().default(null),
}).strict();

const menuSectionSchema = z.object({
  id: ID,
  title: SHORT_COPY,
  items: z.array(menuItemSchema).max(80),
}).strict();

const menuResourceSchema = z.object({
  id: ID,
  title: SHORT_COPY,
  sections: z.array(menuSectionSchema).min(1).max(40),
}).strict();

const equipmentResourceSchema = z.object({
  id: ID,
  name: SHORT_COPY,
  state: z.enum(['available', 'limited', 'maintenance', 'offline']),
  note: SHORT_COPY,
  accessNote: SHORT_COPY,
  lastUpdated: ISO_TIMESTAMP,
  group: SHORT_COPY.nullable().default(null),
}).strict();

const beneficiaryComponentSchema = z.object({
  enabled: z.boolean(),
  weight: z.number().int().min(1).max(10_000).nullable(),
}).strict().superRefine((value, context) => {
  if (value.enabled && value.weight === null) {
    context.addIssue({ code: 'custom', message: 'Enabled beneficiary policy requires a weight' });
  }
});

const beneficiaryPolicySchema = z.object({
  venueUserPost: beneficiaryComponentSchema,
  creatorDonation: beneficiaryComponentSchema,
}).strict().superRefine((value, context) => {
  const total = [value.venueUserPost, value.creatorDonation]
    .filter((entry) => entry.enabled)
    .reduce((sum, entry) => sum + (entry.weight || 0), 0);
  if (total > 10_000) {
    context.addIssue({ code: 'custom', message: 'Combined beneficiary weights cannot exceed 10000' });
  }
});

const communityCapabilitySchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('disabled') }).strict(),
  z.object({
    state: z.literal('configured'),
    binding: z.object({
      communityId: z.string().trim().regex(COMMUNITY_PATTERN),
      officialAccount: z.string().trim().regex(HIVE_ACCOUNT_PATTERN),
      threadsContainerAccount: z.string().trim().regex(HIVE_ACCOUNT_PATTERN),
    }).strict(),
  }).strict(),
]);

const transactionCapabilitySchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('disabled') }).strict(),
  z.object({
    state: z.literal('configured'),
    binding: z.object({
      merchantAccounts: z.array(z.string().trim().regex(HIVE_ACCOUNT_PATTERN))
        .transform((accounts) => [...new Set(accounts)]),
      beneficiaryPolicy: beneficiaryPolicySchema.optional(),
    }).strict(),
  }).strict(),
]);

const designColorsSchema = z.object({
  canvas: HEX_COLOR,
  surface: HEX_COLOR,
  surfaceRaised: HEX_COLOR,
  surfaceStrong: HEX_COLOR,
  border: HEX_COLOR,
  text: HEX_COLOR,
  textMuted: HEX_COLOR,
  textSubtle: HEX_COLOR,
  accent: HEX_COLOR,
  accentHover: HEX_COLOR,
  accentText: HEX_COLOR,
  focusRing: HEX_COLOR,
  info: HEX_COLOR,
  success: HEX_COLOR,
  warning: HEX_COLOR,
  danger: HEX_COLOR,
}).strict().superRefine((colors, context) => {
  const textPairs = [
    ['text', 'canvas'],
    ['text', 'surface'],
    ['text', 'surfaceRaised'],
    ['textMuted', 'canvas'],
    ['textMuted', 'surface'],
    ['textMuted', 'surfaceRaised'],
    ['textSubtle', 'canvas'],
    ['textSubtle', 'surface'],
    ['accent', 'canvas'],
    ['accent', 'surface'],
    ['accentText', 'accent'],
    ['accentText', 'accentHover'],
  ];
  for (const [foreground, background] of textPairs) {
    if (contrastRatio(colors[foreground], colors[background]) < 4.5) {
      context.addIssue({
        code: 'custom',
        message: `Insufficient contrast for ${foreground} on ${background}`,
      });
    }
  }
  for (const background of ['canvas', 'surface']) {
    if (contrastRatio(colors.focusRing, colors[background]) < 3) {
      context.addIssue({
        code: 'custom',
        message: `Insufficient focusRing contrast on ${background}`,
      });
    }
  }
});

const globalDesignSchema = z.object({
  colors: designColorsSchema,
  typographyRecipeId: z.enum(TYPOGRAPHY_RECIPE_IDS),
  densityRecipeId: z.enum(DENSITY_RECIPE_IDS),
  shapeRecipeId: z.enum(SHAPE_RECIPE_IDS),
  surfaceRecipeId: z.enum(SURFACE_RECIPE_IDS),
}).strict();

const responsiveOverrideSchema = z.object({
  layoutVariant: z.enum(['split', 'stacked', 'compact-stacked', 'grid', 'list', 'feature']).optional(),
  alignment: z.enum(['start', 'center']).optional(),
  density: z.enum(['compact', 'standard', 'generous']).optional(),
  mediaPosition: z.enum(['start', 'end']).optional(),
  aspectRecipeId: z.enum(ASPECT_RECIPE_IDS).optional(),
  textMeasure: z.enum(['narrow', 'standard', 'wide']).optional(),
  columns: z.number().int().min(1).max(4).optional(),
}).strict();

const responsiveSchema = z.object({
  tablet: responsiveOverrideSchema.default({}),
  mobile: responsiveOverrideSchema.default({}),
}).strict().default({ tablet: {}, mobile: {} });

const heroContentSchema = z.object({
  eyebrow: SHORT_COPY.nullable().default(null),
  heading: SHORT_COPY.nullable().default(null),
  body: COPY,
  note: SHORT_COPY.nullable().default(null),
  media: mediaUsageSchema.nullable().default(null),
  primaryAction: actionSchema.nullable().default(null),
}).strict();

const galleryContentSchema = z.object({
  kicker: SHORT_COPY.nullable().default(null),
  heading: SHORT_COPY,
  intro: COPY.nullable().default(null),
  items: z.array(galleryUsageSchema).min(1).max(24),
}).strict();

const simpleNarrativeSchema = z.object({
  kicker: SHORT_COPY.nullable().default(null),
  heading: SHORT_COPY,
  body: COPY,
  note: COPY.nullable().default(null),
}).strict();

const resourceListContentSchema = z.object({
  kicker: SHORT_COPY.nullable().default(null),
  heading: SHORT_COPY,
  intro: COPY.nullable().default(null),
  emptyLead: SHORT_COPY.nullable().default(null),
  emptyBody: COPY.nullable().default(null),
  resourceIds: z.array(ID).max(100),
}).strict();

const updatesContentSchema = z.object({
  heading: SHORT_COPY,
  unavailableLead: SHORT_COPY,
  unavailableBody: COPY,
  emptyLead: SHORT_COPY,
  emptyBody: COPY,
}).strict();

const COMPONENT_CONTENT_SCHEMAS = Object.freeze({
  'venue-hero': heroContentSchema,
  gallery: galleryContentSchema,
  'hours-location': simpleNarrativeSchema,
  'contact-visit': simpleNarrativeSchema,
  'event-list': resourceListContentSchema,
  'program-list': resourceListContentSchema,
  menu: resourceListContentSchema,
  'menu-preview': resourceListContentSchema,
  'equipment-status': resourceListContentSchema,
  'community-entry': simpleNarrativeSchema,
  'official-updates': updatesContentSchema,
  'editorial-intro': simpleNarrativeSchema,
});

const RESOURCE_KIND_FOR_COMPONENT = Object.freeze({
  'event-list': 'events',
  'program-list': 'programs',
  menu: 'menus',
  'menu-preview': 'menus',
  'equipment-status': 'equipment',
});

const componentShellSchema = z.object({
  id: ID,
  kind: z.enum(COMPONENT_KINDS),
  recipeId: ID,
  content: z.unknown(),
  responsive: responsiveSchema,
}).strict();

const pageSchema = z.object({
  id: ID,
  slug: z.string().trim().max(100).refine(
    (value) => value === '' || SLUG_PATTERN.test(value),
    'Page slug must be empty for home or a canonical lowercase slug',
  ),
  title: SHORT_COPY,
  seo: z.object({
    title: SHORT_COPY.nullable().default(null),
    description: SHORT_COPY,
  }).strict(),
  components: z.array(componentShellSchema).max(40),
}).strict();

const navigationTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('page'), pageId: ID }).strict(),
  z.object({ kind: z.literal('capability'), capability: z.enum(['community', 'transaction']) }).strict(),
  z.object({ kind: z.literal('external'), href: HTTPS_URL }).strict(),
]);

const navigationEntrySchema = z.object({
  id: ID,
  label: SHORT_COPY,
  target: navigationTargetSchema,
}).strict();

const rootSchema = z.object({
  kind: z.literal(V2_SOURCE_KIND),
  schemaVersion: z.literal(V2_SOURCE_SCHEMA_VERSION),
  provenance: z.object({
    origin: z.enum(['native-v2', 'v1-migration']),
    sourceSchemaVersion: z.number().int().positive().nullable(),
    sourcePackageId: ID.nullable(),
    starterId: ID.nullable().default(null),
  }).strict(),
  venue: z.object({
    id: z.string().trim().regex(VENUE_ID_PATTERN),
    displayName: z.string().trim().min(1).max(80),
    business: z.object({
      address: z.string().trim().min(1).max(200),
      phone: z.string().trim().min(1).max(40),
      hours: z.string().trim().min(1).max(120),
      websiteUrl: HTTPS_URL,
      mapUrl: HTTPS_URL,
    }).strict(),
    language: z.object({
      operatorNoun: z.string().trim().min(2).max(40).regex(/^[a-z][a-z -]*$/),
      staffRole: z.string().trim().min(2).max(40).regex(/^[a-z][a-z -]*$/),
    }).strict(),
  }).strict(),
  media: z.object({
    assets: z.array(mediaAssetSchema).max(200),
  }).strict(),
  resources: z.object({
    events: z.array(eventResourceSchema).max(200),
    programs: z.array(programResourceSchema).max(200),
    menus: z.array(menuResourceSchema).max(40),
    equipment: z.array(equipmentResourceSchema).max(200),
  }).strict(),
  site: z.object({
    id: ID,
    homePageId: ID,
    brand: z.object({
      logoAssetId: ID,
      design: globalDesignSchema,
    }).strict(),
    pages: z.array(pageSchema).min(1).max(24),
    navigation: z.array(navigationEntrySchema).max(24),
  }).strict(),
  capabilities: z.object({
    community: communityCapabilitySchema,
    transaction: transactionCapabilitySchema,
  }).strict(),
}).strict();

function uniqueIds(values, label) {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value.id)) {
      throw new V2VenueSourceError(`duplicate ${label} id: ${value.id}`);
    }
    seen.add(value.id);
  }
  return seen;
}

function validateNestedMenuIds(menus) {
  for (const menu of menus) {
    uniqueIds(menu.sections, `menu section in ${menu.id}`);
    for (const section of menu.sections) {
      uniqueIds(section.items, `menu item in ${menu.id}/${section.id}`);
    }
  }
}

function validateComponent(component) {
  const contentSchema = COMPONENT_CONTENT_SCHEMAS[component.kind];
  if (!contentSchema) throw new V2VenueSourceError(`unknown component kind: ${component.kind}`);
  const contentResult = contentSchema.safeParse(component.content);
  if (!contentResult.success) {
    throw new V2VenueSourceError(
      `component ${component.id} content invalid: ${contentResult.error.issues.map((issue) => issue.message).join('; ')}`,
    );
  }
  const recipeDefinition = COMPONENT_RECIPE_REGISTRY[component.recipeId];
  if (!recipeDefinition) {
    throw new V2VenueSourceError(`unknown component recipe: ${component.recipeId}`);
  }
  if (!recipeDefinition.componentKinds.includes(component.kind)) {
    throw new V2VenueSourceError(
      `recipe ${component.recipeId} is incompatible with component kind ${component.kind}`,
    );
  }
  for (const viewport of ['tablet', 'mobile']) {
    for (const key of Object.keys(component.responsive[viewport])) {
      if (!recipeDefinition.allowedOverrides.includes(key)) {
        throw new V2VenueSourceError(
          `responsive override ${key} is not allowed for recipe ${component.recipeId}`,
        );
      }
    }
  }
  return {
    ...component,
    content: contentResult.data,
  };
}

function componentMediaUsages(component) {
  if (component.kind === 'venue-hero' && component.content.media) {
    return [component.content.media];
  }
  if (component.kind === 'gallery') return component.content.items;
  return [];
}

function validateCrossReferences(source) {
  const mediaIds = uniqueIds(source.media.assets, 'media');
  const pageIds = uniqueIds(source.site.pages, 'page');
  uniqueIds(source.site.navigation, 'navigation');
  const allComponentIds = new Set();
  const slugs = new Set();
  for (const page of source.site.pages) {
    if (slugs.has(page.slug)) throw new V2VenueSourceError(`duplicate page slug: ${page.slug}`);
    slugs.add(page.slug);
    for (const component of page.components) {
      if (allComponentIds.has(component.id)) {
        throw new V2VenueSourceError(`duplicate component id: ${component.id}`);
      }
      allComponentIds.add(component.id);
    }
  }

  if (!pageIds.has(source.site.homePageId)) {
    throw new V2VenueSourceError('homePageId must reference an existing page');
  }
  const homePage = source.site.pages.find((page) => page.id === source.site.homePageId);
  if (homePage.slug !== '') {
    throw new V2VenueSourceError('home page must use the empty root slug');
  }
  if (source.site.pages.filter((page) => page.slug === '').length !== 1) {
    throw new V2VenueSourceError('exactly one page must use the root slug');
  }
  if (!mediaIds.has(source.site.brand.logoAssetId)) {
    throw new V2VenueSourceError('brand logoAssetId must reference managed media');
  }

  const resourceIds = {
    events: uniqueIds(source.resources.events, 'event'),
    programs: uniqueIds(source.resources.programs, 'program'),
    menus: uniqueIds(source.resources.menus, 'menu'),
    equipment: uniqueIds(source.resources.equipment, 'equipment'),
  };
  validateNestedMenuIds(source.resources.menus);

  const eventSlugs = new Set();
  for (const event of source.resources.events) {
    if (eventSlugs.has(event.slug)) {
      throw new V2VenueSourceError(`duplicate event slug: ${event.slug}`);
    }
    eventSlugs.add(event.slug);
    if (event.mediaAssetId && !mediaIds.has(event.mediaAssetId)) {
      throw new V2VenueSourceError(`event ${event.id} references missing media ${event.mediaAssetId}`);
    }
  }

  for (const page of source.site.pages) {
    for (const component of page.components) {
      const resourceKind = RESOURCE_KIND_FOR_COMPONENT[component.kind];
      if (resourceKind) {
        for (const id of component.content.resourceIds) {
          if (!resourceIds[resourceKind].has(id)) {
            throw new V2VenueSourceError(
              `component ${component.id} references missing ${resourceKind} resource ${id}`,
            );
          }
        }
      }
      if (component.kind === 'community-entry' && source.capabilities.community.state !== 'configured') {
        throw new V2VenueSourceError('community-entry requires configured Community capability');
      }
      for (const usage of componentMediaUsages(component)) {
        if (!mediaIds.has(usage.assetId)) {
          throw new V2VenueSourceError(
            `component ${component.id} references missing media ${usage.assetId}`,
          );
        }
      }
      if (component.kind === 'gallery') uniqueIds(component.content.items, `gallery usage in ${component.id}`);
    }
  }

  for (const entry of source.site.navigation) {
    if (entry.target.kind === 'page' && !pageIds.has(entry.target.pageId)) {
      throw new V2VenueSourceError(
        `navigation ${entry.id} references missing page ${entry.target.pageId}`,
      );
    }
    if (
      entry.target.kind === 'capability'
      && source.capabilities[entry.target.capability].state !== 'configured'
    ) {
      throw new V2VenueSourceError(
        `navigation ${entry.id} references disabled capability ${entry.target.capability}`,
      );
    }
  }
}

function createV2DeploymentAgnosticVenueSource(input) {
  assertNoSecretMaterial(input, {
    location: 'v2 deployment-agnostic venue source',
    errorFactory,
  });
  const result = rootSchema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'source'}: ${issue.message}`)
      .join('; ');
    throw new V2VenueSourceError(details);
  }

  const source = clone(result.data);
  for (const page of source.site.pages) {
    page.components = page.components.map(validateComponent);
  }
  validateCrossReferences(source);
  return deepFreeze(source);
}

function serializeV2DeploymentAgnosticVenueSource(input) {
  return serializeCanonicalJson(createV2DeploymentAgnosticVenueSource(input));
}

function deriveV2DeploymentAgnosticVenueSourceDigest(input) {
  const bytes = serializeV2DeploymentAgnosticVenueSource(input);
  return crypto
    .createHash('sha256')
    .update('hive-venues-deployment-agnostic-source-v2\0', 'utf8')
    .update(bytes, 'utf8')
    .digest('hex');
}

function pathOwnership(pointer) {
  if (pointer === '') return OWNERSHIP.PLATFORM_FIXED;
  if (pointer === '/kind' || pointer === '/schemaVersion') return OWNERSHIP.PLATFORM_FIXED;
  if (/^\/provenance(?:\/.*)?$/.test(pointer)) return OWNERSHIP.DERIVED;

  if (pointer === '/venue/id' || pointer === '/site/id') return OWNERSHIP.INTEGRATION_OWNED;

  if (
    /^\/venue\/(?:displayName|business\/(?:address|phone|hours|websiteUrl|mapUrl)|language\/(?:operatorNoun|staffRole))$/.test(pointer)
  ) return OWNERSHIP.OPERATOR_AUTHORED;

  if (pointer === '/media/assets') return OWNERSHIP.OPERATOR_AUTHORED_COLLECTION;
  if (/^\/media\/assets\/\d+$/.test(pointer)) return OWNERSHIP.OPERATOR_AUTHORED_COLLECTION;
  if (/^\/media\/assets\/\d+\/id$/.test(pointer)) return OWNERSHIP.OPERATOR_COLLECTION_ID;
  if (/^\/media\/assets\/\d+\/(?:width|height)$/.test(pointer)) return OWNERSHIP.DERIVED;
  if (/^\/media\/assets\/\d+\/src$/.test(pointer)) return OWNERSHIP.OPERATOR_AUTHORED;

  if (/^\/resources\/(?:events|programs|menus|equipment)$/.test(pointer)) {
    return OWNERSHIP.OPERATOR_AUTHORED_COLLECTION;
  }
  if (/^\/resources\/(?:events|programs|menus|equipment)\/\d+$/.test(pointer)) {
    return OWNERSHIP.OPERATOR_AUTHORED_COLLECTION;
  }
  if (/^\/resources\/(?:events|programs|menus|equipment)\/\d+\/id$/.test(pointer)) {
    return OWNERSHIP.OPERATOR_COLLECTION_ID;
  }
  if (/^\/resources\/(?:events|programs|equipment)\/\d+\/.+/.test(pointer)) {
    return OWNERSHIP.OPERATOR_AUTHORED;
  }
  if (/^\/resources\/menus\/\d+\/sections$/.test(pointer)) return OWNERSHIP.OPERATOR_AUTHORED_COLLECTION;
  if (/^\/resources\/menus\/\d+\/sections\/\d+$/.test(pointer)) return OWNERSHIP.OPERATOR_AUTHORED_COLLECTION;
  if (/^\/resources\/menus\/\d+\/sections\/\d+\/id$/.test(pointer)) return OWNERSHIP.OPERATOR_COLLECTION_ID;
  if (/^\/resources\/menus\/\d+\/sections\/\d+\/items$/.test(pointer)) return OWNERSHIP.OPERATOR_AUTHORED_COLLECTION;
  if (/^\/resources\/menus\/\d+\/sections\/\d+\/items\/\d+$/.test(pointer)) return OWNERSHIP.OPERATOR_AUTHORED_COLLECTION;
  if (/^\/resources\/menus\/\d+\/sections\/\d+\/items\/\d+\/id$/.test(pointer)) return OWNERSHIP.OPERATOR_COLLECTION_ID;
  if (/^\/resources\/menus\/\d+\/.+/.test(pointer)) return OWNERSHIP.OPERATOR_AUTHORED;

  if (pointer === '/site/homePageId') return OWNERSHIP.OPERATOR_AUTHORED;
  if (/^\/site\/brand(?:\/.*)?$/.test(pointer)) return OWNERSHIP.OPERATOR_AUTHORED;
  if (pointer === '/site/pages') return OWNERSHIP.OPERATOR_AUTHORED_COLLECTION;
  if (/^\/site\/pages\/\d+$/.test(pointer)) return OWNERSHIP.OPERATOR_AUTHORED_COLLECTION;
  if (/^\/site\/pages\/\d+\/id$/.test(pointer)) return OWNERSHIP.OPERATOR_COLLECTION_ID;
  if (/^\/site\/pages\/\d+\/components$/.test(pointer)) return OWNERSHIP.OPERATOR_AUTHORED_COLLECTION;
  if (/^\/site\/pages\/\d+\/components\/\d+$/.test(pointer)) return OWNERSHIP.OPERATOR_AUTHORED_COLLECTION;
  if (/^\/site\/pages\/\d+\/components\/\d+\/id$/.test(pointer)) return OWNERSHIP.OPERATOR_COLLECTION_ID;
  if (/^\/site\/pages\/\d+\/components\/\d+\/kind$/.test(pointer)) return OWNERSHIP.PLATFORM_FIXED;
  if (/^\/site\/pages\/\d+\/.+/.test(pointer)) return OWNERSHIP.OPERATOR_AUTHORED;

  if (pointer === '/site/navigation') return OWNERSHIP.OPERATOR_AUTHORED_COLLECTION;
  if (/^\/site\/navigation\/\d+$/.test(pointer)) return OWNERSHIP.OPERATOR_AUTHORED_COLLECTION;
  if (/^\/site\/navigation\/\d+\/id$/.test(pointer)) return OWNERSHIP.OPERATOR_COLLECTION_ID;
  if (/^\/site\/navigation\/\d+\/.+/.test(pointer)) return OWNERSHIP.OPERATOR_AUTHORED;

  if (/^\/capabilities\/community(?:\/.*)?$/.test(pointer)) return OWNERSHIP.INTEGRATION_OWNED;
  if (/^\/capabilities\/transaction(?:\/.*)?$/.test(pointer)) return OWNERSHIP.SECURITY_PRIVILEGED;

  if (
    pointer === '/venue'
    || pointer === '/venue/business'
    || pointer === '/venue/language'
    || pointer === '/media'
    || pointer === '/resources'
    || pointer === '/site'
    || pointer === '/site/brand'
    || pointer === '/capabilities'
  ) return OWNERSHIP.PLATFORM_FIXED;

  return null;
}

function buildV2OwnershipMap(input) {
  const source = createV2DeploymentAgnosticVenueSource(input);
  const entries = {};

  function visit(value, pointer) {
    const ownership = pathOwnership(pointer);
    if (!ownership) throw new V2VenueSourceError(`no ownership class for ${pointer || '/'}`);
    entries[pointer || '/'] = ownership;
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((child, index) => visit(child, `${pointer}/${index}`));
      return;
    }
    for (const [key, child] of Object.entries(value)) visit(child, `${pointer}/${key}`);
  }

  visit(source, '');
  return deepFreeze(entries);
}

function resolveResponsiveComponent(componentInput, viewport) {
  if (!['desktop', 'tablet', 'mobile'].includes(viewport)) {
    throw new V2VenueSourceError('viewport must be desktop, tablet, or mobile');
  }
  const shell = componentShellSchema.parse(componentInput);
  const component = validateComponent(shell);
  const definition = COMPONENT_RECIPE_REGISTRY[component.recipeId];
  const values = { ...definition.defaults };
  const sources = Object.fromEntries(Object.keys(values).map((key) => [key, 'desktop']));

  if (viewport === 'tablet' || viewport === 'mobile') {
    for (const [key, value] of Object.entries(component.responsive.tablet)) {
      values[key] = value;
      sources[key] = 'tablet';
    }
  }
  if (viewport === 'mobile') {
    for (const [key, value] of Object.entries(component.responsive.mobile)) {
      values[key] = value;
      sources[key] = 'mobile';
    }
  }

  return deepFreeze({
    viewport,
    recipeId: component.recipeId,
    values,
    sources,
  });
}

function resetResponsiveOverride(componentInput, viewport, key) {
  if (!['tablet', 'mobile'].includes(viewport)) {
    throw new V2VenueSourceError('responsive reset viewport must be tablet or mobile');
  }
  if (!RESPONSIVE_OVERRIDE_KEYS.includes(key)) {
    throw new V2VenueSourceError(`unknown responsive override field: ${key}`);
  }
  const shell = componentShellSchema.parse(componentInput);
  const component = validateComponent(shell);
  const result = clone(component);
  delete result.responsive[viewport][key];
  return deepFreeze(validateComponent(result));
}

function componentResourceReferences(component) {
  const resourceKind = RESOURCE_KIND_FOR_COMPONENT[component.kind];
  if (!resourceKind) return [];
  return component.content.resourceIds.map((id) => ({ resourceKind, resourceId: id }));
}

function createV2SemanticCanvasProjection(input) {
  const source = createV2DeploymentAgnosticVenueSource(input);
  const pageNodes = source.site.pages.map((page, pageIndex) => ({
    id: `page:${page.id}`,
    kind: 'page',
    stableIdentity: { type: 'page-id', value: page.id },
    sourcePointer: `/site/pages/${pageIndex}`,
    fields: [
      { id: `page:${page.id}:field:title`, fieldId: 'title' },
      { id: `page:${page.id}:field:slug`, fieldId: 'slug' },
    ],
    children: page.components.map((component, componentIndex) => ({
      id: `component:${component.id}`,
      kind: component.kind,
      stableIdentity: { type: 'component-id', value: component.id },
      sourcePointer: `/site/pages/${pageIndex}/components/${componentIndex}`,
      fields: Object.keys(component.content).sort().map((fieldId) => ({
        id: `component:${component.id}:field:${fieldId}`,
        fieldId,
      })),
      children: componentResourceReferences(component).map(({ resourceKind, resourceId }) => ({
        id: `resource:${resourceKind}:${resourceId}`,
        kind: 'resource-reference',
        stableIdentity: { type: 'resource-id', value: `${resourceKind}:${resourceId}` },
        sourcePointer: null,
        fields: [],
        children: [],
      })),
    })),
  }));

  return deepFreeze({
    kind: 'hivenues-v2-semantic-canvas-projection',
    schemaVersion: 1,
    authority: {
      canonicalSource: 'hive-venues-deployment-agnostic-source-v2',
      derived: true,
      persistent: false,
      runtimeWired: false,
    },
    root: {
      id: `venue:${source.venue.id}`,
      kind: 'venue',
      stableIdentity: { type: 'venue-id', value: source.venue.id },
      sourcePointer: '/venue',
      fields: [],
      children: pageNodes,
    },
  });
}

function listV2CanvasNodes(projectionInput) {
  const result = [];
  function visit(node) {
    result.push(node);
    for (const child of node.children || []) visit(child);
  }
  visit(projectionInput.root);
  return result;
}

module.exports = {
  ASPECT_RECIPE_IDS,
  COMPONENT_KINDS,
  COMPONENT_RECIPE_REGISTRY,
  DEFAULT_DESIGN_COLORS,
  DENSITY_RECIPE_IDS,
  OWNERSHIP,
  SHAPE_RECIPE_IDS,
  SURFACE_RECIPE_IDS,
  TYPOGRAPHY_RECIPE_IDS,
  V1_DESIGN_RECIPE_DEFAULTS,
  V2_SOURCE_KIND,
  V2_SOURCE_SCHEMA_VERSION,
  V2VenueSourceError,
  buildV2OwnershipMap,
  createV2DeploymentAgnosticVenueSource,
  createV2SemanticCanvasProjection,
  deriveV2DeploymentAgnosticVenueSourceDigest,
  listV2CanvasNodes,
  pathOwnership,
  resetResponsiveOverride,
  resolveResponsiveComponent,
  serializeV2DeploymentAgnosticVenueSource,
};
