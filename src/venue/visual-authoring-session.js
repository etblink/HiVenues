'use strict';

const {
  OPERATOR_COLLECTIONS,
  OWNERSHIP,
  applyOrdinaryOperatorEdit,
  buildOwnershipMap,
  createVenueAuthoringDocument,
  operatorCollectionDefinition,
  ownershipForPath,
  serializeVenueAuthoringReview,
} = require('./authoring');

const SESSION_STATE = Object.freeze({
  CLEAN: 'CLEAN',
  DIRTY: 'DIRTY',
  VALIDATING: 'VALIDATING',
  REJECTED_WITH_BASE_UNCHANGED: 'REJECTED_WITH_BASE_UNCHANGED',
  ACCEPTED: 'ACCEPTED',
  DISCARDED: 'DISCARDED',
});

class VisualAuthoringSessionError extends Error {
  constructor(message) {
    super(`Visual authoring session invalid: ${message}`);
    this.name = 'VisualAuthoringSessionError';
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function decodePointer(pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('/') || pointer === '/') {
    throw new VisualAuthoringSessionError('field pointer must identify a document value');
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
      throw new VisualAuthoringSessionError(`field does not exist at ${pointer}`);
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
      throw new VisualAuthoringSessionError(`field does not exist at ${pointer}`);
    }
    cursor = cursor[segment];
  }
  const leaf = segments.at(-1);
  if (!cursor || typeof cursor !== 'object' || !Object.prototype.hasOwnProperty.call(cursor, leaf)) {
    throw new VisualAuthoringSessionError(`field does not exist at ${pointer}`);
  }
  cursor[leaf] = value;
}

function semanticSectionForPointer(pointer) {
  if (pointer === '/venueContext/displayName') return 'identity';
  if (pointer.startsWith('/venueContext/business/')) return 'business';
  if (pointer.startsWith('/venuePackage/brand/theme/')) return 'theme';
  if (pointer.startsWith('/venuePackage/brand/')) return 'brand';
  if (pointer.startsWith('/venuePackage/seo/')) return 'seo';
  if (pointer.startsWith('/venuePackage/home/hero/')) return 'hero';
  if (pointer.startsWith('/venuePackage/home/updates/')) return 'updates';
  if (pointer.startsWith('/venuePackage/home/programs/')) return 'programs';
  if (pointer.startsWith('/venuePackage/home/equipmentStatus/')) return 'equipment-status';
  if (pointer.startsWith('/venuePackage/home/pathways/')) return 'pathways';
  if (pointer.startsWith('/venuePackage/home/visit/')) return 'visit';
  if (pointer.startsWith('/venuePackage/home/community/')) return 'community';
  if (pointer.startsWith('/venuePackage/home/gallery/')) return 'gallery';
  if (pointer.startsWith('/venuePackage/onboarding/')) return 'onboarding';
  return 'venue';
}

function controlKindForPointer(pointer) {
  if (/\/brand\/theme\/(?:canvas|surface|border|text|mutedText|accent|accentHover)$/.test(pointer)) return 'color';
  if (/\/items\/\d+\/state$/.test(pointer)) return 'select';
  if (/\/items\/\d+\/(?:startAt|endAt|lastUpdated)$/.test(pointer)) return 'datetime-offset';
  if (/\/items\/\d+\/link$/.test(pointer)) return 'optional-url';
  if (/\/(?:websiteUrl|mapUrl)$/.test(pointer)) return 'url';
  if (/\/src$/.test(pointer)) return 'asset-path';
  if (/\/(?:lede|intro|note|description|accessNote|defaultDescription|unavailableBody|emptyBody)$/.test(pointer)) {
    return 'multiline-text';
  }
  return 'text';
}

function controlOptionsForPointer(pointer) {
  if (/\/home\/programs\/items\/\d+\/state$/.test(pointer)) {
    return Object.freeze(['scheduled', 'full', 'cancelled']);
  }
  if (/\/home\/equipmentStatus\/items\/\d+\/state$/.test(pointer)) {
    return Object.freeze(['available', 'limited', 'maintenance', 'offline']);
  }
  return Object.freeze([]);
}

function isOptionalPointer(pointer) {
  return /\/home\/programs\/items\/\d+\/link$/.test(pointer)
    || /\/home\/equipmentStatus\/items\/\d+\/group$/.test(pointer);
}

function normalizeEditedValue(pointer, value) {
  if (isOptionalPointer(pointer) && (value === '' || value === null || value === undefined)) return null;
  return value;
}

function editableFieldDescriptors(documentInput) {
  const document = createVenueAuthoringDocument(documentInput);
  const ownership = buildOwnershipMap(document);
  return Object.entries(ownership)
    .filter(([, owner]) => owner === OWNERSHIP.OPERATOR_AUTHORED)
    .map(([pointer]) => Object.freeze({
      pointer,
      ownership: OWNERSHIP.OPERATOR_AUTHORED,
      semanticSection: semanticSectionForPointer(pointer),
      controlKind: controlKindForPointer(pointer),
      options: controlOptionsForPointer(pointer),
      required: !isOptionalPointer(pointer),
      value: readAtPointer(document, pointer),
    }))
    .sort((left, right) => left.pointer.localeCompare(right.pointer));
}

function editableCollectionDescriptors(documentInput) {
  const document = createVenueAuthoringDocument(documentInput);
  const descriptors = [];
  for (const [pointer, definition] of Object.entries(OPERATOR_COLLECTIONS)) {
    try {
      const items = readAtPointer(document, pointer);
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
      // Optional capabilities that are not present in a v1 document expose no
      // collection authority and therefore no visual collection controls.
    }
  }
  return Object.freeze(descriptors);
}

function canonicalIfValid(documentInput) {
  try {
    return serializeVenueAuthoringReview(documentInput);
  } catch {
    return null;
  }
}

function createVisualAuthoringSessionInternal(baseInput, applyGate) {
  if (typeof applyGate !== 'function') {
    throw new VisualAuthoringSessionError('apply gate must be a function');
  }

  let accepted = createVenueAuthoringDocument(baseInput);
  let acceptedCanonical = serializeVenueAuthoringReview(accepted);
  let proposal = cloneJson(accepted);
  let state = SESSION_STATE.CLEAN;
  let lastError = null;

  function isDirty() {
    const proposalCanonical = canonicalIfValid(proposal);
    return proposalCanonical === null || proposalCanonical !== acceptedCanonical;
  }

  function refreshDirtyState(preferredCleanState = SESSION_STATE.CLEAN) {
    state = isDirty() ? SESSION_STATE.DIRTY : preferredCleanState;
  }

  function status() {
    return Object.freeze({
      state,
      dirty: isDirty(),
      error: lastError,
    });
  }

  function listEditableFields() {
    const validProposal = createVenueAuthoringDocument(proposal);
    return Object.freeze(editableFieldDescriptors(validProposal));
  }

  function listEditableCollections() {
    const validProposal = createVenueAuthoringDocument(proposal);
    return editableCollectionDescriptors(validProposal);
  }

  function validateCollectionPointer(pointer) {
    const definition = operatorCollectionDefinition(pointer);
    if (!definition || ownershipForPath(pointer) !== OWNERSHIP.OPERATOR_AUTHORED_COLLECTION) {
      throw new VisualAuthoringSessionError(`ordinary visual collection edit denied at ${pointer}`);
    }
    return definition;
  }

  function mutateCollection(pointer, mutator) {
    validateCollectionPointer(pointer);
    const next = cloneJson(proposal);
    const collection = readAtPointer(next, pointer);
    if (!Array.isArray(collection)) {
      throw new VisualAuthoringSessionError(`collection does not exist at ${pointer}`);
    }
    mutator(collection);
    createVenueAuthoringDocument(next);
    proposal = next;
    lastError = null;
    refreshDirtyState();
    return status();
  }

  function addCollectionItem(pointer, item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new VisualAuthoringSessionError('collection item must be an object');
    }
    return mutateCollection(pointer, (items) => {
      if (items.some((existing) => existing.id === item.id)) {
        throw new VisualAuthoringSessionError(`collection item id already exists: ${item.id}`);
      }
      items.push(cloneJson(item));
    });
  }

  function removeCollectionItem(pointer, itemId) {
    return mutateCollection(pointer, (items) => {
      const index = items.findIndex((item) => item.id === itemId);
      if (index < 0) throw new VisualAuthoringSessionError(`collection item does not exist: ${itemId}`);
      items.splice(index, 1);
    });
  }

  function moveCollectionItem(pointer, itemId, direction) {
    const definition = validateCollectionPointer(pointer);
    if (definition.kind !== 'equipment-status') {
      throw new VisualAuthoringSessionError(`${definition.kind} uses canonical ordering and cannot be manually reordered`);
    }
    if (direction !== 'up' && direction !== 'down') {
      throw new VisualAuthoringSessionError('collection move direction must be up or down');
    }
    return mutateCollection(pointer, (items) => {
      const index = items.findIndex((item) => item.id === itemId);
      if (index < 0) throw new VisualAuthoringSessionError(`collection item does not exist: ${itemId}`);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= items.length) return;
      [items[index], items[target]] = [items[target], items[index]];
    });
  }

  function edit(pointer, value) {
    const ownership = ownershipForPath(pointer);
    if (ownership !== OWNERSHIP.OPERATOR_AUTHORED) {
      throw new VisualAuthoringSessionError(
        `ordinary visual edit denied at ${pointer} (${ownership || 'UNCLASSIFIED'})`,
      );
    }
    const acceptedOwnership = buildOwnershipMap(createVenueAuthoringDocument(proposal))[pointer];
    if (acceptedOwnership !== OWNERSHIP.OPERATOR_AUTHORED) {
      throw new VisualAuthoringSessionError(`field does not exist in the proposal document at ${pointer}`);
    }
    const next = cloneJson(proposal);
    writeAtPointer(next, pointer, normalizeEditedValue(pointer, value));
    createVenueAuthoringDocument(next);
    proposal = next;
    lastError = null;
    refreshDirtyState();
    return status();
  }

  function previewProjection() {
    const validProposal = createVenueAuthoringDocument(proposal);
    return Object.freeze({
      venueContext: validProposal.venueContext,
      venuePackage: validProposal.venuePackage,
      siteName: validProposal.venueContext.displayName,
      business: validProposal.venueContext.business,
    });
  }

  function apply() {
    state = SESSION_STATE.VALIDATING;
    lastError = null;
    try {
      const nextAccepted = applyGate(accepted, proposal);
      accepted = createVenueAuthoringDocument(nextAccepted);
      acceptedCanonical = serializeVenueAuthoringReview(accepted);
      proposal = cloneJson(accepted);
      state = SESSION_STATE.ACCEPTED;
      return accepted;
    } catch (error) {
      state = SESSION_STATE.REJECTED_WITH_BASE_UNCHANGED;
      lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  function discard() {
    proposal = cloneJson(accepted);
    lastError = null;
    state = SESSION_STATE.DISCARDED;
    return accepted;
  }

  return Object.freeze({
    get acceptedDocument() {
      return accepted;
    },
    get proposalDraft() {
      return Object.freeze(cloneJson(proposal));
    },
    get state() {
      return state;
    },
    addCollectionItem,
    apply,
    canonicalAccepted: () => acceptedCanonical,
    canonicalProposal: () => serializeVenueAuthoringReview(proposal),
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

function createVisualAuthoringSession(baseInput) {
  return createVisualAuthoringSessionInternal(baseInput, applyOrdinaryOperatorEdit);
}

function createVisualAuthoringSessionForTest(baseInput, { applyGate } = {}) {
  return createVisualAuthoringSessionInternal(baseInput, applyGate);
}

module.exports = {
  SESSION_STATE,
  VisualAuthoringSessionError,
  controlKindForPointer,
  controlOptionsForPointer,
  createVisualAuthoringSession,
  createVisualAuthoringSessionForTest,
  editableCollectionDescriptors,
  editableFieldDescriptors,
  semanticSectionForPointer,
};
