'use strict';

const {
  V2_SOURCE_KIND,
  createV2DeploymentAgnosticVenueSource,
  deriveV2DeploymentAgnosticVenueSourceDigest,
} = require('../v2/source');
const {
  V3_MIGRATION_CONTRACT_VERSION,
  V3_SOURCE_KIND,
  createV3DeploymentAgnosticVenueSource,
} = require('./source');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function migrateEvent(event) {
  const capacity = event.state === 'full' ? 'FULL' : 'UNSPECIFIED';
  const lifecycle = event.state === 'cancelled' ? 'CANCELLED' : 'SCHEDULED';
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    temporal: {
      kind: 'OCCURRENCE',
      startAt: event.startAt,
      endAt: event.endAt,
    },
    lifecycle,
    presence: { kind: 'PHYSICAL_HOST_DEFAULT' },
    access: {
      note: event.accessNote,
      capacity,
    },
    managedMedia: event.mediaAssetId === null
      ? []
      : [{ assetId: event.mediaAssetId, role: 'PRIMARY_VISUAL_COMPATIBILITY' }],
    publicActions: event.externalAction === null
      ? []
      : [{
        id: `activity:${event.id}:legacy-external`,
        role: 'LEGACY_EXTERNAL',
        label: event.externalAction.label,
        href: event.externalAction.href,
      }],
    seriesRef: null,
  };
}

function migrateComponent(component) {
  const migrated = clone(component);
  if (migrated.kind === 'event-list') migrated.kind = 'activity-list';
  return migrated;
}

function migrateSite(site) {
  const migrated = clone(site);
  migrated.pages = migrated.pages.map((page) => ({
    ...page,
    components: page.components.map(migrateComponent),
  }));
  return migrated;
}

function migrateV2DeploymentAgnosticVenueSourceToV3(input) {
  const v2 = createV2DeploymentAgnosticVenueSource(input);
  if (v2.kind !== V2_SOURCE_KIND) throw new Error('unexpected v2 source kind');
  const v2Digest = deriveV2DeploymentAgnosticVenueSourceDigest(v2);

  return createV3DeploymentAgnosticVenueSource({
    kind: V3_SOURCE_KIND,
    schemaVersion: 3,
    provenance: {
      origin: 'v2-migration',
      sourceSchemaVersion: 2,
      sourceDigest: v2Digest,
      migrationContractVersion: V3_MIGRATION_CONTRACT_VERSION,
      starterId: v2.provenance.starterId,
    },
    venue: clone(v2.venue),
    media: clone(v2.media),
    resources: {
      activities: v2.resources.events.map(migrateEvent),
      programs: clone(v2.resources.programs),
      menus: clone(v2.resources.menus),
      equipment: clone(v2.resources.equipment),
    },
    activityBindings: {
      hiveSocial: [],
      providerMedia: [],
      syndication: [],
      value: [],
      commerce: [],
      discovery: [],
    },
    site: migrateSite(v2.site),
    capabilities: clone(v2.capabilities),
  });
}

function buildV2ToV3LegacyEventRouteMap(input) {
  const v2 = createV2DeploymentAgnosticVenueSource(input);
  return Object.freeze(Object.fromEntries(
    v2.resources.events.map((event) => [`/events/${event.slug}`, event.id]),
  ));
}

module.exports = {
  buildV2ToV3LegacyEventRouteMap,
  migrateV2DeploymentAgnosticVenueSourceToV3,
};
