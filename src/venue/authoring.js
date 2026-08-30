'use strict';

const { z } = require('zod');
const { composeVenueBootstrap } = require('./bootstrap');
const { createVenueContext } = require('./context');
const { createVenuePackage } = require('./package');
const {
  assertNoSecretMaterial,
  serializeCanonicalJson,
} = require('./safe-document');

const DEPLOYMENT_REFERENCE_ID = z.string().trim().min(1).max(120);

const OWNERSHIP = Object.freeze({
  OPERATOR_AUTHORED: 'OPERATOR_AUTHORED',
  INTEGRATION_OWNED: 'INTEGRATION_OWNED',
  DERIVED: 'DERIVED',
  PLATFORM_FIXED: 'PLATFORM_FIXED',
  DEPLOYMENT_OWNED: 'DEPLOYMENT_OWNED',
  SECURITY_PRIVILEGED: 'SECURITY_PRIVILEGED',
  SECRET_OR_PRIVATE__FORBIDDEN_FROM_AUTHORING_DOCUMENT:
    'SECRET_OR_PRIVATE__FORBIDDEN_FROM_AUTHORING_DOCUMENT',
});

class VenueAuthoringError extends Error {
  constructor(message) {
    super(`Venue authoring invalid: ${message}`);
    this.name = 'VenueAuthoringError';
  }
}

const authoringEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    deploymentRef: z
      .object({
        id: DEPLOYMENT_REFERENCE_ID,
      })
      .strict(),
    venueContext: z.unknown(),
    venuePackage: z.unknown(),
  })
  .strict();

function authoringErrorFactory(message) {
  return new VenueAuthoringError(message);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function parseEnvelope(input) {
  assertNoSecretMaterial(input, {
    location: 'authoring',
    errorFactory: authoringErrorFactory,
  });
  const result = authoringEnvelopeSchema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'authoring'}: ${issue.message}`)
      .join('; ');
    throw new VenueAuthoringError(`input does not match schema version 1: ${details}`);
  }
  return result.data;
}

function createVenueAuthoringDocument(input) {
  const envelope = parseEnvelope(input);
  const venueContext = createVenueContext(envelope.venueContext);
  const venuePackage = createVenuePackage(envelope.venuePackage, venueContext);

  const document = deepFreeze({
    schemaVersion: 1,
    deploymentRef: {
      id: envelope.deploymentRef.id,
    },
    venueContext,
    venuePackage,
  });

  // Completeness is fail-closed: every path present in a valid v1 document must
  // resolve to exactly one ownership class before the document is accepted.
  buildOwnershipMap(document);
  return document;
}

function escapePointerSegment(segment) {
  return String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
}

function joinPointer(base, segment) {
  return `${base}/${escapePointerSegment(segment)}`;
}

function ownershipForPath(pointer) {
  if (pointer === '') return OWNERSHIP.PLATFORM_FIXED;
  if (pointer === '/schemaVersion' || pointer === '/venuePackage/schemaVersion') {
    return OWNERSHIP.PLATFORM_FIXED;
  }

  if (pointer === '/deploymentRef' || pointer === '/deploymentRef/id') {
    return OWNERSHIP.DEPLOYMENT_OWNED;
  }

  if (
    pointer === '/venueContext/id' ||
    pointer === '/venueContext/hive/communityId' ||
    pointer === '/venueContext/hive/officialAccount' ||
    pointer === '/venueContext/hive/threadsContainerAccount' ||
    pointer === '/venuePackage/id' ||
    pointer === '/venuePackage/venueId'
  ) {
    return OWNERSHIP.INTEGRATION_OWNED;
  }

  if (
    pointer === '/venueContext/hive/paymentMerchantAccounts' ||
    /^\/venueContext\/hive\/paymentMerchantAccounts\/\d+$/.test(pointer)
  ) {
    return OWNERSHIP.SECURITY_PRIVILEGED;
  }

  if (
    pointer === '/venueContext/displayName' ||
    /^\/venueContext\/business\/(?:address|phone|hours|websiteUrl|mapUrl)$/.test(pointer) ||
    pointer === '/venuePackage/brand/logo/src' ||
    pointer === '/venuePackage/seo/defaultDescription' ||
    /^\/venuePackage\/home\/hero\/(?:lede|footnote)$/.test(pointer) ||
    /^\/venuePackage\/home\/hero\/image\/(?:src|alt|caption)$/.test(pointer) ||
    /^\/venuePackage\/home\/updates\/(?:heading|unavailableLead|unavailableBody|emptyLead|emptyBody)$/.test(pointer) ||
    /^\/venuePackage\/home\/pathways\/(?:kicker|heading|intro)$/.test(pointer) ||
    /^\/venuePackage\/home\/visit\/(?:kicker|heading|lede|note)$/.test(pointer) ||
    /^\/venuePackage\/home\/community\/(?:kicker|heading|lede)$/.test(pointer) ||
    /^\/venuePackage\/home\/gallery\/(?:kicker|heading|intro)$/.test(pointer) ||
    /^\/venuePackage\/home\/gallery\/items\/\d+\/(?:src|alt|caption)$/.test(pointer) ||
    /^\/venuePackage\/onboarding\/(?:operatorNoun|staffRole)$/.test(pointer)
  ) {
    return OWNERSHIP.OPERATOR_AUTHORED;
  }

  if (
    /^\/venuePackage\/brand\/logo\/(?:width|height)$/.test(pointer) ||
    /^\/venuePackage\/home\/hero\/image\/(?:width|height)$/.test(pointer) ||
    /^\/venuePackage\/home\/gallery\/items\/\d+\/(?:width|height)$/.test(pointer)
  ) {
    return OWNERSHIP.DERIVED;
  }

  // Containers are deliberately protected from ordinary replacement. This
  // keeps v1 edits leaf-oriented and prevents an editor from gaining implicit
  // authority over array cardinality, object structure, or mixed-ownership
  // subtrees merely by replacing a parent value.
  if (
    pointer === '/venueContext' ||
    pointer === '/venueContext/business' ||
    pointer === '/venueContext/hive' ||
    pointer === '/venuePackage' ||
    pointer === '/venuePackage/brand' ||
    pointer === '/venuePackage/brand/logo' ||
    pointer === '/venuePackage/seo' ||
    pointer === '/venuePackage/home' ||
    pointer === '/venuePackage/home/hero' ||
    pointer === '/venuePackage/home/hero/image' ||
    pointer === '/venuePackage/home/updates' ||
    pointer === '/venuePackage/home/pathways' ||
    pointer === '/venuePackage/home/visit' ||
    pointer === '/venuePackage/home/community' ||
    pointer === '/venuePackage/home/gallery' ||
    pointer === '/venuePackage/home/gallery/items' ||
    /^\/venuePackage\/home\/gallery\/items\/\d+$/.test(pointer) ||
    pointer === '/venuePackage/onboarding'
  ) {
    return OWNERSHIP.INTEGRATION_OWNED;
  }

  return null;
}

function buildOwnershipMap(documentInput) {
  const document = documentInput?.schemaVersion === 1 && Object.isFrozen(documentInput)
    ? documentInput
    : createVenueAuthoringDocument(documentInput);
  const entries = {};

  function visit(value, pointer) {
    const ownership = ownershipForPath(pointer);
    if (!ownership) {
      throw new VenueAuthoringError(`no ownership class is defined for ${pointer || '/'}`);
    }
    entries[pointer || '/'] = ownership;

    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((child, index) => visit(child, joinPointer(pointer, index)));
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      visit(child, joinPointer(pointer, key));
    }
  }

  visit(document, '');
  return deepFreeze(entries);
}

function collectChangedPaths(base, proposed, pointer = '') {
  if (Object.is(base, proposed)) return [];

  const baseObject = base && typeof base === 'object';
  const proposedObject = proposed && typeof proposed === 'object';
  if (!baseObject || !proposedObject) return [pointer];

  if (Array.isArray(base) || Array.isArray(proposed)) {
    if (!Array.isArray(base) || !Array.isArray(proposed) || base.length !== proposed.length) {
      return [pointer];
    }
    return base.flatMap((child, index) =>
      collectChangedPaths(child, proposed[index], joinPointer(pointer, index)),
    );
  }

  const baseKeys = Object.keys(base).sort();
  const proposedKeys = Object.keys(proposed).sort();
  if (JSON.stringify(baseKeys) !== JSON.stringify(proposedKeys)) return [pointer];

  return baseKeys.flatMap((key) =>
    collectChangedPaths(base[key], proposed[key], joinPointer(pointer, key)),
  );
}

function applyOrdinaryOperatorEdit(baseInput, proposedInput) {
  const base = createVenueAuthoringDocument(baseInput);
  const proposed = createVenueAuthoringDocument(proposedInput);
  const changedPaths = collectChangedPaths(base, proposed);

  for (const pointer of changedPaths) {
    const ownership = ownershipForPath(pointer);
    if (ownership !== OWNERSHIP.OPERATOR_AUTHORED) {
      throw new VenueAuthoringError(
        `ordinary operator edit denied at ${pointer || '/'} (${ownership || 'UNCLASSIFIED'})`,
      );
    }
  }

  return proposed;
}

function serializeVenueAuthoringReview(documentInput) {
  const document = createVenueAuthoringDocument(documentInput);
  assertNoSecretMaterial(document, {
    location: 'authoring',
    errorFactory: authoringErrorFactory,
  });
  return serializeCanonicalJson(document);
}

function composeVenueBootstrapFromAuthoring(
  authoringInput,
  deploymentManifest,
  { bootstrapId, metadata } = {},
) {
  const document = createVenueAuthoringDocument(authoringInput);
  const envelope = {
    schemaVersion: 1,
    bootstrapId,
    bindings: {
      venueId: document.venueContext.id,
      packageId: document.venuePackage.id,
      deploymentId: document.deploymentRef.id,
    },
    venueContext: document.venueContext,
    venuePackage: document.venuePackage,
    deploymentManifest,
  };
  if (metadata !== undefined) envelope.metadata = metadata;
  return composeVenueBootstrap(envelope);
}

module.exports = {
  OWNERSHIP,
  VenueAuthoringError,
  applyOrdinaryOperatorEdit,
  buildOwnershipMap,
  composeVenueBootstrapFromAuthoring,
  createVenueAuthoringDocument,
  ownershipForPath,
  serializeVenueAuthoringReview,
};
