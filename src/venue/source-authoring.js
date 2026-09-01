'use strict';

const {
  OWNERSHIP,
  collectChangedPaths,
  operatorCollectionDefinition,
  ownershipForPath,
} = require('./authoring');
const {
  DeploymentAgnosticVenueSourceError,
  createDeploymentAgnosticVenueSource,
  serializeDeploymentAgnosticVenueSource,
} = require('./source');

class VenueSourceAuthoringError extends Error {
  constructor(message, options = {}) {
    super(`Venue source authoring invalid: ${message}`, options);
    this.name = 'VenueSourceAuthoringError';
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function readPointer(root, pointer) {
  return pointer
    .split('/')
    .slice(1)
    .reduce((cursor, segment) => cursor?.[segment.replace(/~1/g, '/').replace(/~0/g, '~')], root);
}

function buildVenueSourceOwnershipMap(sourceInput) {
  const source = createDeploymentAgnosticVenueSource(sourceInput);
  const entries = {
    '/': OWNERSHIP.PLATFORM_FIXED,
    '/kind': OWNERSHIP.PLATFORM_FIXED,
    '/schemaVersion': OWNERSHIP.PLATFORM_FIXED,
  };

  function visit(value, pointer) {
    const ownership = ownershipForPath(pointer);
    if (!ownership) {
      throw new VenueSourceAuthoringError(`no ownership class is defined for ${pointer}`);
    }
    entries[pointer] = ownership;
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((child, index) => visit(child, `${pointer}/${index}`));
      return;
    }
    for (const [key, child] of Object.entries(value)) visit(child, `${pointer}/${key}`);
  }

  visit(source.venueContext, '/venueContext');
  visit(source.venuePackage, '/venuePackage');
  return Object.freeze(entries);
}

function assertCollectionChangeValid(base, proposed, pointer) {
  const definition = operatorCollectionDefinition(pointer);
  const baseItems = readPointer(base, pointer);
  const proposedItems = readPointer(proposed, pointer);
  if (!definition || !Array.isArray(baseItems) || !Array.isArray(proposedItems)) {
    throw new VenueSourceAuthoringError(`ordinary operator collection edit denied at ${pointer}`);
  }
  if (proposedItems.length > definition.maxItems) {
    throw new VenueSourceAuthoringError(`ordinary operator collection exceeds maxItems at ${pointer}`);
  }
}

function applyOrdinaryOperatorSourceEdit(baseInput, proposedInput) {
  let base;
  let proposed;
  try {
    base = createDeploymentAgnosticVenueSource(baseInput);
    proposed = createDeploymentAgnosticVenueSource(proposedInput);
  } catch (error) {
    if (error instanceof DeploymentAgnosticVenueSourceError) {
      throw new VenueSourceAuthoringError(error.message, { cause: error });
    }
    throw error;
  }

  const changedPaths = collectChangedPaths(base, proposed);
  for (const pointer of changedPaths) {
    const ownership = ownershipForPath(pointer);
    if (ownership === OWNERSHIP.OPERATOR_AUTHORED_COLLECTION) {
      assertCollectionChangeValid(base, proposed, pointer);
      continue;
    }
    if (ownership !== OWNERSHIP.OPERATOR_AUTHORED) {
      throw new VenueSourceAuthoringError(
        `ordinary operator source edit denied at ${pointer || '/'} (${ownership || 'UNCLASSIFIED'})`,
      );
    }
  }

  return proposed;
}

function serializeVenueSourceAuthoringReview(sourceInput) {
  return serializeDeploymentAgnosticVenueSource(sourceInput);
}

function cloneVenueSource(sourceInput) {
  return cloneJson(createDeploymentAgnosticVenueSource(sourceInput));
}

module.exports = {
  VenueSourceAuthoringError,
  applyOrdinaryOperatorSourceEdit,
  buildVenueSourceOwnershipMap,
  cloneVenueSource,
  serializeVenueSourceAuthoringReview,
};
