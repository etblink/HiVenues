'use strict';

const crypto = require('node:crypto');
const { z } = require('zod');
const { HIVE_ACCOUNT_PATTERN, COMMUNITY_PATTERN, VENUE_ID_PATTERN } = require('../context');
const { assertNoSecretMaterial, serializeCanonicalJson } = require('../safe-document');
const {
  ASPECT_RECIPE_IDS,
  COMPONENT_RECIPE_REGISTRY: V2_COMPONENT_RECIPE_REGISTRY,
  DENSITY_RECIPE_IDS,
  SHAPE_RECIPE_IDS,
  SURFACE_RECIPE_IDS,
  TYPOGRAPHY_RECIPE_IDS,
} = require('../v2/source');

const V3_SOURCE_KIND = 'hive-venues-deployment-agnostic-source';
const V3_SOURCE_SCHEMA_VERSION = 3;
const V3_MIGRATION_CONTRACT_VERSION = 'next-gen-activity-source-migration/0.1.0';
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ACTION_ID_PATTERN = /^[a-z0-9]+(?:(?:-|:)[a-z0-9]+)*$/;
const SLUG_PATTERN = ID_PATTERN;
const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const ID = z.string().trim().min(2).max(80).regex(ID_PATTERN);
const ACTION_ID = z.string().trim().min(2).max(160).regex(ACTION_ID_PATTERN);
const SHORT_COPY = z.string().trim().min(1).max(240);
const COPY = z.string().trim().min(1).max(2400);

class V3VenueSourceError extends Error {
  constructor(message, options = {}) {
    super(`HiVenues v3 source invalid: ${message}`, options);
    this.name = 'V3VenueSourceError';
  }
}

function errorFactory(message) {
  return new V3VenueSourceError(message);
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
const SLUG = z.string().trim().min(1).max(100).regex(SLUG_PATTERN);

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

const physicalBusinessSchema = z.object({
  address: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(1).max(40),
  hours: z.string().trim().min(1).max(120),
  websiteUrl: HTTPS_URL,
  mapUrl: HTTPS_URL,
}).strict();

const languageSchema = z.object({
  operatorNoun: z.string().trim().min(2).max(40).regex(/^[a-z][a-z -]*$/),
  staffRole: z.string().trim().min(2).max(40).regex(/^[a-z][a-z -]*$/),
}).strict();

const provenanceSchema = z.discriminatedUnion('origin', [
  z.object({
    origin: z.literal('native-v3'),
    sourceSchemaVersion: z.null(),
    sourceDigest: z.null(),
    migrationContractVersion: z.null(),
    starterId: ID.nullable(),
  }).strict(),
  z.object({
    origin: z.literal('v2-migration'),
    sourceSchemaVersion: z.literal(2),
    sourceDigest: z.string().regex(SHA256_PATTERN),
    migrationContractVersion: z.literal(V3_MIGRATION_CONTRACT_VERSION),
    starterId: ID.nullable(),
  }).strict(),
]);

const temporalSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('OCCURRENCE'),
    startAt: ISO_TIMESTAMP,
    endAt: ISO_TIMESTAMP.nullable(),
  }).strict().superRefine((value, context) => {
    if (value.endAt !== null && Date.parse(value.endAt) <= Date.parse(value.startAt)) {
      context.addIssue({ code: 'custom', message: 'Occurrence endAt must be after startAt' });
    }
  }),
  z.object({
    kind: z.literal('RELEASE'),
    releaseAt: ISO_TIMESTAMP,
  }).strict(),
  z.object({
    kind: z.literal('WINDOW'),
    startAt: ISO_TIMESTAMP,
    endAt: ISO_TIMESTAMP,
  }).strict().superRefine((value, context) => {
    if (Date.parse(value.endAt) <= Date.parse(value.startAt)) {
      context.addIssue({ code: 'custom', message: 'Window endAt must be after startAt' });
    }
  }),
]);

const destinationSchema = z.object({
  id: ID,
  label: SHORT_COPY,
  href: HTTPS_URL,
}).strict();

const presenceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('PHYSICAL_HOST_DEFAULT') }).strict(),
  z.object({
    kind: z.literal('ONLINE'),
    destinations: z.array(destinationSchema).min(1).max(12),
  }).strict(),
  z.object({
    kind: z.literal('HYBRID'),
    destinations: z.array(destinationSchema).min(1).max(12),
  }).strict(),
  z.object({ kind: z.literal('NONE') }).strict(),
]);

const managedMediaSchema = z.object({
  assetId: ID,
  role: z.enum(['PROMO', 'PRIMARY_VISUAL_COMPATIBILITY']),
}).strict();

const publicActionSchema = z.object({
  id: ACTION_ID,
  role: z.literal('LEGACY_EXTERNAL'),
  label: SHORT_COPY,
  href: HTTPS_URL,
}).strict();

const seriesRefSchema = z.object({
  kind: z.literal('program'),
  id: ID,
}).strict();

const activitySchema = z.object({
  id: ID,
  slug: SLUG,
  title: SHORT_COPY,
  description: COPY.nullable(),
  temporal: temporalSchema,
  lifecycle: z.enum(['DRAFT', 'SCHEDULED', 'LIVE', 'COMPLETED', 'POSTPONED', 'CANCELLED']),
  presence: presenceSchema,
  access: z.object({
    note: SHORT_COPY.nullable(),
    capacity: z.enum(['UNSPECIFIED', 'AVAILABLE', 'FULL']),
  }).strict(),
  managedMedia: z.array(managedMediaSchema).max(12),
  publicActions: z.array(publicActionSchema).max(24),
  seriesRef: seriesRefSchema.nullable(),
}).strict();

const programResourceSchema = z.object({
  id: ID,
  title: SHORT_COPY,
  startAt: ISO_TIMESTAMP,
  endAt: ISO_TIMESTAMP,
  description: COPY,
  accessNote: SHORT_COPY,
  state: z.enum(['scheduled', 'full', 'cancelled']),
  link: HTTPS_URL.nullable(),
}).strict().superRefine((value, context) => {
  if (Date.parse(value.endAt) <= Date.parse(value.startAt)) {
    context.addIssue({ code: 'custom', message: 'Program endAt must be after startAt' });
  }
});

const menuItemSchema = z.object({
  id: ID,
  name: SHORT_COPY,
  description: SHORT_COPY.nullable(),
  priceLabel: z.string().trim().min(1).max(80).nullable(),
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
  group: SHORT_COPY.nullable(),
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
  canvas: z.string().regex(HEX_PATTERN),
  surface: z.string().regex(HEX_PATTERN),
  surfaceRaised: z.string().regex(HEX_PATTERN),
  surfaceStrong: z.string().regex(HEX_PATTERN),
  border: z.string().regex(HEX_PATTERN),
  text: z.string().regex(HEX_PATTERN),
  textMuted: z.string().regex(HEX_PATTERN),
  textSubtle: z.string().regex(HEX_PATTERN),
  accent: z.string().regex(HEX_PATTERN),
  accentHover: z.string().regex(HEX_PATTERN),
  accentText: z.string().regex(HEX_PATTERN),
  focusRing: z.string().regex(HEX_PATTERN),
  info: z.string().regex(HEX_PATTERN),
  success: z.string().regex(HEX_PATTERN),
  warning: z.string().regex(HEX_PATTERN),
  danger: z.string().regex(HEX_PATTERN),
}).strict().transform((colors) => Object.fromEntries(
  Object.entries(colors).map(([key, value]) => [key, value.toLowerCase()]),
));

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

const actionSchema = z.object({
  label: SHORT_COPY,
  href: HTTPS_URL,
}).strict();

const heroContentSchema = z.object({
  eyebrow: SHORT_COPY.nullable(),
  heading: SHORT_COPY.nullable(),
  body: COPY,
  note: SHORT_COPY.nullable(),
  media: mediaUsageSchema.nullable(),
  primaryAction: actionSchema.nullable(),
}).strict();

const simpleNarrativeSchema = z.object({
  kicker: SHORT_COPY.nullable(),
  heading: SHORT_COPY,
  body: COPY,
  note: COPY.nullable(),
}).strict();

const activityListContentSchema = z.object({
  kicker: SHORT_COPY.nullable(),
  heading: SHORT_COPY,
  intro: COPY.nullable(),
  emptyLead: SHORT_COPY.nullable(),
  emptyBody: COPY.nullable(),
  resourceIds: z.array(ID).max(100),
}).strict();

const V3_COMPONENT_KINDS = Object.freeze([
  'venue-hero',
  'editorial-intro',
  'contact-visit',
  'activity-list',
]);

const COMPONENT_CONTENT_SCHEMAS = Object.freeze({
  'venue-hero': heroContentSchema,
  'editorial-intro': simpleNarrativeSchema,
  'contact-visit': simpleNarrativeSchema,
  'activity-list': activityListContentSchema,
});

const ALLOWED_RECIPE_IDS = new Set([
  'hero-legacy-v1',
  'hero-immersive-media',
  'hero-editorial-split',
  'hero-poster',
  'hero-text-led',
  'intro-legacy-v1',
  'visit-legacy-v1',
  'list-editorial-rows',
  'list-compact-rows',
  'list-card-grid',
  'list-poster-rows',
]);

function v3RecipeDefinition(recipeId) {
  if (!ALLOWED_RECIPE_IDS.has(recipeId)) return null;
  const v2 = V2_COMPONENT_RECIPE_REGISTRY[recipeId];
  if (!v2) return null;
  return {
    componentKinds: v2.componentKinds.map((kind) => kind === 'event-list' ? 'activity-list' : kind),
    defaults: { ...v2.defaults },
    allowedOverrides: [...v2.allowedOverrides],
  };
}

const componentShellSchema = z.object({
  id: ID,
  kind: z.enum(V3_COMPONENT_KINDS),
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
    title: SHORT_COPY.nullable(),
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

const emptyBindingRecordSchema = z.never();
const activityBindingsSchema = z.object({
  hiveSocial: z.array(emptyBindingRecordSchema).max(0),
  providerMedia: z.array(emptyBindingRecordSchema).max(0),
  syndication: z.array(emptyBindingRecordSchema).max(0),
  value: z.array(emptyBindingRecordSchema).max(0),
  commerce: z.array(emptyBindingRecordSchema).max(0),
  discovery: z.array(emptyBindingRecordSchema).max(0),
}).strict();

const rootSchema = z.object({
  kind: z.literal(V3_SOURCE_KIND),
  schemaVersion: z.literal(V3_SOURCE_SCHEMA_VERSION),
  provenance: provenanceSchema,
  venue: z.object({
    id: z.string().trim().regex(VENUE_ID_PATTERN),
    displayName: z.string().trim().min(1).max(80),
    business: physicalBusinessSchema.nullable(),
    language: languageSchema,
  }).strict(),
  media: z.object({
    assets: z.array(mediaAssetSchema).max(200),
  }).strict(),
  resources: z.object({
    activities: z.array(activitySchema).max(500),
    programs: z.array(programResourceSchema).max(200),
    menus: z.array(menuResourceSchema).max(40),
    equipment: z.array(equipmentResourceSchema).max(200),
  }).strict(),
  activityBindings: activityBindingsSchema,
  site: z.object({
    id: ID,
    homePageId: ID,
    brand: z.object({
      logoAssetId: ID.nullable(),
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
    if (seen.has(value.id)) throw new V3VenueSourceError(`duplicate ${label} id: ${value.id}`);
    seen.add(value.id);
  }
  return seen;
}

function validateNestedMenuIds(menus) {
  for (const menu of menus) {
    uniqueIds(menu.sections, `menu section in ${menu.id}`);
    for (const section of menu.sections) uniqueIds(section.items, `menu item in ${menu.id}/${section.id}`);
  }
}

function validateComponent(component) {
  const contentSchema = COMPONENT_CONTENT_SCHEMAS[component.kind];
  if (!contentSchema) throw new V3VenueSourceError(`unknown component kind: ${component.kind}`);
  const contentResult = contentSchema.safeParse(component.content);
  if (!contentResult.success) {
    throw new V3VenueSourceError(
      `component ${component.id} content invalid: ${contentResult.error.issues.map((issue) => issue.message).join('; ')}`,
    );
  }
  const recipeDefinition = v3RecipeDefinition(component.recipeId);
  if (!recipeDefinition) throw new V3VenueSourceError(`unknown component recipe: ${component.recipeId}`);
  if (!recipeDefinition.componentKinds.includes(component.kind)) {
    throw new V3VenueSourceError(
      `recipe ${component.recipeId} is incompatible with component kind ${component.kind}`,
    );
  }
  for (const viewport of ['tablet', 'mobile']) {
    for (const key of Object.keys(component.responsive[viewport])) {
      if (!recipeDefinition.allowedOverrides.includes(key)) {
        throw new V3VenueSourceError(
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

function validateCrossReferences(source) {
  const mediaIds = uniqueIds(source.media.assets, 'media asset');
  const activityIds = uniqueIds(source.resources.activities, 'activity');
  const programIds = uniqueIds(source.resources.programs, 'program');
  uniqueIds(source.resources.menus, 'menu');
  uniqueIds(source.resources.equipment, 'equipment');
  validateNestedMenuIds(source.resources.menus);

  const activitySlugs = new Set();
  for (const activity of source.resources.activities) {
    if (activitySlugs.has(activity.slug)) throw new V3VenueSourceError(`duplicate activity slug: ${activity.slug}`);
    activitySlugs.add(activity.slug);
    if (activity.presence.kind === 'PHYSICAL_HOST_DEFAULT' && source.venue.business === null) {
      throw new V3VenueSourceError(`activity ${activity.id} requires physical host business facts`);
    }
    uniqueIds(activity.presence.destinations || [], `destination in ${activity.id}`);
    uniqueIds(activity.publicActions, `public action in ${activity.id}`);
    for (const media of activity.managedMedia) {
      if (!mediaIds.has(media.assetId)) {
        throw new V3VenueSourceError(`activity ${activity.id} references missing media ${media.assetId}`);
      }
    }
    if (activity.seriesRef && !programIds.has(activity.seriesRef.id)) {
      throw new V3VenueSourceError(`activity ${activity.id} references missing program ${activity.seriesRef.id}`);
    }
  }

  if (source.site.brand.logoAssetId !== null && !mediaIds.has(source.site.brand.logoAssetId)) {
    throw new V3VenueSourceError(`brand references missing media ${source.site.brand.logoAssetId}`);
  }

  const pageIds = uniqueIds(source.site.pages, 'page');
  const pageSlugs = new Set();
  const componentIds = new Set();
  for (const page of source.site.pages) {
    if (pageSlugs.has(page.slug)) throw new V3VenueSourceError(`duplicate page slug: ${page.slug || '<home>'}`);
    pageSlugs.add(page.slug);
    for (const component of page.components) {
      if (componentIds.has(component.id)) throw new V3VenueSourceError(`duplicate component id: ${component.id}`);
      componentIds.add(component.id);
      if (component.kind === 'venue-hero' && component.content.media) {
        if (!mediaIds.has(component.content.media.assetId)) {
          throw new V3VenueSourceError(`component ${component.id} references missing media ${component.content.media.assetId}`);
        }
      }
      if (component.kind === 'activity-list') {
        for (const id of component.content.resourceIds) {
          if (!activityIds.has(id)) {
            throw new V3VenueSourceError(`component ${component.id} references missing activity ${id}`);
          }
        }
      }
      if (component.kind === 'contact-visit' && source.venue.business === null) {
        throw new V3VenueSourceError(`component ${component.id} requires physical host business facts`);
      }
    }
  }
  if (!pageIds.has(source.site.homePageId)) throw new V3VenueSourceError(`missing home page ${source.site.homePageId}`);

  uniqueIds(source.site.navigation, 'navigation');
  for (const entry of source.site.navigation) {
    if (entry.target.kind === 'page' && !pageIds.has(entry.target.pageId)) {
      throw new V3VenueSourceError(`navigation ${entry.id} references missing page ${entry.target.pageId}`);
    }
    if (
      entry.target.kind === 'capability'
      && source.capabilities[entry.target.capability].state !== 'configured'
    ) {
      throw new V3VenueSourceError(
        `navigation ${entry.id} references disabled capability ${entry.target.capability}`,
      );
    }
  }
}

function createV3DeploymentAgnosticVenueSource(input) {
  assertNoSecretMaterial(input, {
    location: 'v3 deployment-agnostic venue source',
    errorFactory,
  });
  const result = rootSchema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'source'}: ${issue.message}`)
      .join('; ');
    throw new V3VenueSourceError(details);
  }

  const source = clone(result.data);
  for (const page of source.site.pages) page.components = page.components.map(validateComponent);
  validateCrossReferences(source);
  return deepFreeze(source);
}

function serializeV3DeploymentAgnosticVenueSource(input) {
  return serializeCanonicalJson(createV3DeploymentAgnosticVenueSource(input));
}

function deriveV3DeploymentAgnosticVenueSourceDigest(input) {
  const bytes = serializeV3DeploymentAgnosticVenueSource(input);
  return crypto
    .createHash('sha256')
    .update('hive-venues-deployment-agnostic-source-v3\0', 'utf8')
    .update(bytes, 'utf8')
    .digest('hex');
}

module.exports = {
  V3_MIGRATION_CONTRACT_VERSION,
  V3_SOURCE_KIND,
  V3_SOURCE_SCHEMA_VERSION,
  V3VenueSourceError,
  createV3DeploymentAgnosticVenueSource,
  deriveV3DeploymentAgnosticVenueSourceDigest,
  serializeV3DeploymentAgnosticVenueSource,
};
