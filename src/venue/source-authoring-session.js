'use strict';

const {
  OPERATOR_COLLECTIONS,
  OWNERSHIP,
  operatorCollectionDefinition,
  ownershipForPath,
} = require('./authoring');
const {
  controlKindForPointer,
  controlOptionsForPointer,
  semanticSectionForPointer,
} = require('./visual-authoring-session');
const {
  createDeploymentAgnosticVenueSource,
  serializeDeploymentAgnosticVenueSource,
} = require('./source');
const {
  applyOrdinaryOperatorSourceEdit,
  buildVenueSourceOwnershipMap,
} = require('./source-authoring');

const SOURCE_SESSION_STATE = Object.freeze({
  CLEAN: 'CLEAN',
  DIRTY: 'DIRTY',
  VALIDATING: 'VALIDATING',
  REJECTED_WITH_BASE_UNCHANGED: 'REJECTED_WITH_BASE_UNCHANGED',
  ACCEPTED: 'ACCEPTED',
  DISCARDED: 'DISCARDED',
});

class SourceAuthoringSessionError extends Error {
  constructor(message) {
    super(`Source authoring session invalid: ${message}`);
    this.name = 'SourceAuthoringSessionError';
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function decodePointer(pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('/') || pointer === '/') {
    throw new SourceAuthoringSessionError('field pointer must identify a source value');
  }
  return pointer
    .slice(1)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function readAtPointer(document, pointer) {
  let cursor = document;
  for (const segment of decodePointer(pointer)) {
    if (!cursor || typeof cursor !== 'object' || !Object.prototype.hasOwnProperty.call(cursor, segment)) {
      throw new SourceAuthoringSessionError(`field does not exist at ${pointer}`);
    }
    cursor = cursor[segment];
  }
  return cursor;
}

function writeAtPointer(document, pointer, value) {
  const segments = decodePointer(pointer);
  let cursor = document;
  for (const segment of segments.slice(0, -1)) {
    if (!cursor || typeof cursor !== 'object' || !Object.prototype.hasOwnProperty.call(cursor, segment)) {
      throw new SourceAuthoringSessionError(`field does not exist at ${pointer}`);
    }
    cursor = cursor[segment];
  }
  const leaf = segments.at(-1);
  if (!cursor || typeof cursor !== 'object' || !Object.prototype.hasOwnProperty.call(cursor, leaf)) {
    throw new SourceAuthoringSessionError(`field does not exist at ${pointer}`);
  }
  cursor[leaf] = value;
}

function isOptionalPointer(pointer) {
  return /\/home\/programs\/items\/\d+\/link$/.test(pointer)
    || /\/home\/equipmentStatus\/items\/\d+\/group$/.test(pointer);
}

function normalizeEditedValue(pointer, value) {
  if (isOptionalPointer(pointer) && (value === '' || value === null || value === undefined)) return null;
  return value;
}

function editableSourceFieldDescriptors(sourceInput) {
  const source = createDeploymentAgnosticVenueSource(sourceInput);
  const ownership = buildVenueSourceOwnershipMap(source);
  return Object.entries(ownership)
    .filter(([, owner]) => owner === OWNERSHIP.OPERATOR_AUTHORED)
    .map(([pointer]) => Object.freeze({
      pointer,
      ownership: OWNERSHIP.OPERATOR_AUTHORED,
      semanticSection: semanticSectionForPointer(pointer),
      controlKind: controlKindForPointer(pointer),
      options: controlOptionsForPointer(pointer),
      required: !isOptionalPointer(pointer),
      value: readAtPointer(source, pointer),
    }))
    .sort((left, right) => left.pointer.localeCompare(right.pointer));
}

function editableSourceCollectionDescriptors(sourceInput) {
  const source = createDeploymentAgnosticVenueSource(sourceInput);
  const descriptors = [];
  for (const [pointer, definition] of Object.entries(OPERATOR_COLLECTIONS)) {
    try {
      const items = readAtPointer(source, pointer);
      descriptors.push(Object.freeze({
        pointer,
        kind: definition.kind,
        maxItems: definition.maxItems,
        count: items.length,
        items: Object.freeze(items.map((item, index) => Object.freeze({
          id: item.id,
          index,
          label: item.title || item.name || item.id,
        }))),
      }));
    } catch {
      // Optional venue capabilities expose no controls when absent.
    }
  }
  return Object.freeze(descriptors);
}

function canonicalIfValid(sourceInput) {
  try {
    return serializeDeploymentAgnosticVenueSource(sourceInput);
  } catch {
    return null;
  }
}

function createSourceAuthoringSession(baseInput) {
  let accepted = createDeploymentAgnosticVenueSource(baseInput);
  let acceptedCanonical = serializeDeploymentAgnosticVenueSource(accepted);
  let proposal = cloneJson(accepted);
  let state = SOURCE_SESSION_STATE.CLEAN;
  let lastError = null;

  function isDirty() {
    const proposalCanonical = canonicalIfValid(proposal);
    return proposalCanonical === null || proposalCanonical !== acceptedCanonical;
  }

  function refreshDirtyState(preferredCleanState = SOURCE_SESSION_STATE.CLEAN) {
    state = isDirty() ? SOURCE_SESSION_STATE.DIRTY : preferredCleanState;
  }

  function status() {
    return Object.freeze({ state, dirty: isDirty(), error: lastError });
  }

  function listEditableFields() {
    return Object.freeze(editableSourceFieldDescriptors(createDeploymentAgnosticVenueSource(proposal)));
  }

  function listEditableCollections() {
    return editableSourceCollectionDescriptors(createDeploymentAgnosticVenueSource(proposal));
  }

  function validateCollectionPointer(pointer) {
    const definition = operatorCollectionDefinition(pointer);
    if (!definition || ownershipForPath(pointer) !== OWNERSHIP.OPERATOR_AUTHORED_COLLECTION) {
      throw new SourceAuthoringSessionError(`ordinary source collection edit denied at ${pointer}`);
    }
    return definition;
  }

  function mutateCollection(pointer, mutator) {
    validateCollectionPointer(pointer);
    const next = cloneJson(proposal);
    const collection = readAtPointer(next, pointer);
    if (!Array.isArray(collection)) {
      throw new SourceAuthoringSessionError(`collection does not exist at ${pointer}`);
    }
    mutator(collection);
    proposal = cloneJson(createDeploymentAgnosticVenueSource(next));
    lastError = null;
    refreshDirtyState();
    return status();
  }

  function addCollectionItem(pointer, item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new SourceAuthoringSessionError('collection item must be an object');
    }
    return mutateCollection(pointer, (items) => {
      if (items.some((existing) => existing.id === item.id)) {
        throw new SourceAuthoringSessionError(`collection item id already exists: ${item.id}`);
      }
      items.push(cloneJson(item));
    });
  }

  function removeCollectionItem(pointer, itemId) {
    return mutateCollection(pointer, (items) => {
      const index = items.findIndex((item) => item.id === itemId);
      if (index < 0) throw new SourceAuthoringSessionError(`collection item does not exist: ${itemId}`);
      items.splice(index, 1);
    });
  }

  function moveCollectionItem(pointer, itemId, direction) {
    const definition = validateCollectionPointer(pointer);
    if (definition.kind !== 'equipment-status') {
      throw new SourceAuthoringSessionError(`${definition.kind} uses canonical ordering and cannot be manually reordered`);
    }
    if (direction !== 'up' && direction !== 'down') {
      throw new SourceAuthoringSessionError('collection move direction must be up or down');
    }
    return mutateCollection(pointer, (items) => {
      const index = items.findIndex((item) => item.id === itemId);
      if (index < 0) throw new SourceAuthoringSessionError(`collection item does not exist: ${itemId}`);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= items.length) return;
      [items[index], items[target]] = [items[target], items[index]];
    });
  }

  function edit(pointer, value) {
    if (ownershipForPath(pointer) !== OWNERSHIP.OPERATOR_AUTHORED) {
      throw new SourceAuthoringSessionError(`ordinary source edit denied at ${pointer}`);
    }
    const ownership = buildVenueSourceOwnershipMap(createDeploymentAgnosticVenueSource(proposal));
    if (ownership[pointer] !== OWNERSHIP.OPERATOR_AUTHORED) {
      throw new SourceAuthoringSessionError(`field does not exist in the source proposal at ${pointer}`);
    }
    const next = cloneJson(proposal);
    writeAtPointer(next, pointer, normalizeEditedValue(pointer, value));
    proposal = cloneJson(createDeploymentAgnosticVenueSource(next));
    lastError = null;
    refreshDirtyState();
    return status();
  }

  function previewProjection() {
    const source = createDeploymentAgnosticVenueSource(proposal);
    return Object.freeze({
      venueContext: source.venueContext,
      venuePackage: source.venuePackage,
      siteName: source.venueContext.displayName,
      business: source.venueContext.business,
    });
  }

  function apply() {
    state = SOURCE_SESSION_STATE.VALIDATING;
    lastError = null;
    try {
      accepted = applyOrdinaryOperatorSourceEdit(accepted, proposal);
      acceptedCanonical = serializeDeploymentAgnosticVenueSource(accepted);
      proposal = cloneJson(accepted);
      state = SOURCE_SESSION_STATE.ACCEPTED;
      return accepted;
    } catch (error) {
      state = SOURCE_SESSION_STATE.REJECTED_WITH_BASE_UNCHANGED;
      lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  function discard() {
    proposal = cloneJson(accepted);
    lastError = null;
    state = SOURCE_SESSION_STATE.DISCARDED;
    return accepted;
  }

  return Object.freeze({
    get acceptedSource() { return accepted; },
    get proposalDraft() { return Object.freeze(cloneJson(proposal)); },
    get state() { return state; },
    addCollectionItem,
    apply,
    canonicalAccepted: () => acceptedCanonical,
    canonicalProposal: () => serializeDeploymentAgnosticVenueSource(proposal),
    discard,
    edit,
    listEditableCollections,
    listEditableFields,
    moveCollectionItem,
    previewProjection,
    removeCollectionItem,
    status,
  });
}

module.exports = {
  SOURCE_SESSION_STATE,
  SourceAuthoringSessionError,
  createSourceAuthoringSession,
  editableSourceCollectionDescriptors,
  editableSourceFieldDescriptors,
};
