'use strict';

const { createHash } = require('node:crypto');
const {
  EQUIPMENT_COLLECTION,
  canvasEquipmentCollection,
  canvasMoveItem,
  previewCanvasSourceCommandWithInverse,
  previewCanvasSourceFieldWithInverse,
} = require('./canvas-source-preview');
const { createInsertItemCommand, createRemoveItemCommand } = require('./semantic-venue-canvas-contract');

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

const CANVAS_HISTORY_LIMIT = 50;

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
  let revision = 0;
  let canvasUndoHistory = [];
  let canvasRedoHistory = [];

  function isDirty() {
    const proposalCanonical = canonicalIfValid(proposal);
    return proposalCanonical === null || proposalCanonical !== acceptedCanonical;
  }

  function refreshDirtyState(preferredCleanState = SOURCE_SESSION_STATE.CLEAN) {
    revision += 1;
    state = isDirty() ? SOURCE_SESSION_STATE.DIRTY : preferredCleanState;
  }

  function proposalRevision() {
    return createHash('sha256').update(String(revision) + '\0' + acceptedCanonical + '\0' + serializeDeploymentAgnosticVenueSource(proposal)).digest('hex');
  }

  function canvasConflict(message, code = 'CANVAS_HISTORY_CONFLICT') {
    const error = new SourceAuthoringSessionError(message);
    error.code = code;
    return error;
  }

  function assertCanvasRevision(expectedRevision) {
    if (typeof expectedRevision !== 'string' || expectedRevision !== proposalRevision()) {
      throw canvasConflict('the draft changed; review current values before trying again', 'STALE_CANVAS_PROPOSAL');
    }
  }

  function clearCanvasHistory() {
    canvasUndoHistory = [];
    canvasRedoHistory = [];
  }

  function historyEntrySummary(entry) {
    if (!entry) return null;
    return Object.freeze({
      type: entry.forwardCommand.type,
      blockId: entry.forwardCommand.blockId,
      fieldId: entry.forwardCommand.fieldId || null,
      generation: entry.generation,
      ...(entry.forwardCommand.type === 'insert-item'
        ? { itemBlockId: entry.forwardCommand.blockId + '.item.' + entry.forwardCommand.item.id } : {}),
    });
  }

  function canvasHistoryStatus() {
    return Object.freeze({
      limit: CANVAS_HISTORY_LIMIT,
      undoCount: canvasUndoHistory.length,
      redoCount: canvasRedoHistory.length,
      canUndo: canvasUndoHistory.length > 0,
      canRedo: canvasRedoHistory.length > 0,
      undo: historyEntrySummary(canvasUndoHistory.at(-1)),
      redo: historyEntrySummary(canvasRedoHistory.at(-1)),
    });
  }

  function recordCanvasPreview(applied, beforeCanonical, beforeRevision) {
    proposal = cloneJson(applied.source);
    lastError = null;
    refreshDirtyState();
    const entry = Object.freeze({
      forwardCommand: Object.freeze(cloneJson(applied.forwardCommand)),
      inverseCommand: Object.freeze(cloneJson(applied.inverseCommand)),
      beforeCanonical,
      afterCanonical: serializeDeploymentAgnosticVenueSource(proposal),
      beforeRevision,
      afterRevision: proposalRevision(),
      generation: revision,
    });
    canvasUndoHistory.push(entry);
    if (canvasUndoHistory.length > CANVAS_HISTORY_LIMIT) canvasUndoHistory.shift();
    canvasRedoHistory = [];
    return status();
  }

  function previewCanvasField(command, expectedRevision) {
    assertCanvasRevision(expectedRevision);
    const beforeCanonical = serializeDeploymentAgnosticVenueSource(proposal);
    const beforeRevision = proposalRevision();
    return recordCanvasPreview(
      previewCanvasSourceFieldWithInverse(proposal, command),
      beforeCanonical,
      beforeRevision,
    );
  }

  function previewCanvasMove(blockId, direction, expectedRevision) {
    assertCanvasRevision(expectedRevision);
    const move = canvasMoveItem(proposal, blockId);
    if (!move.editable) throw canvasConflict('this Canvas item cannot be reordered', 'CANVAS_MOVE_DENIED');
    const command = move.command(direction);
    const beforeCanonical = serializeDeploymentAgnosticVenueSource(proposal);
    const beforeRevision = proposalRevision();
    return recordCanvasPreview(
      previewCanvasSourceCommandWithInverse(proposal, command),
      beforeCanonical,
      beforeRevision,
    );
  }

  function previewCanvasMoveTo(blockId, destination, expectedRevision) {
    assertCanvasRevision(expectedRevision);
    const move = canvasMoveItem(proposal, blockId);
    if (!move.editable) throw canvasConflict('this Canvas item cannot be reordered', 'CANVAS_MOVE_DENIED');
    const command = move.commandTo(destination);
    const beforeCanonical = serializeDeploymentAgnosticVenueSource(proposal);
    const beforeRevision = proposalRevision();
    return recordCanvasPreview(
      previewCanvasSourceCommandWithInverse(proposal, command),
      beforeCanonical,
      beforeRevision,
    );
  }

  function previewCanvasAddEquipment(blockId, values, expectedRevision) {
    assertCanvasRevision(expectedRevision);
    if (!canvasEquipmentCollection(proposal, blockId).canAdd) throw canvasConflict('equipment list is full', 'CANVAS_EQUIPMENT_FULL');
    const keys = ['name', 'state', 'note', 'accessNote', 'lastUpdated', 'group'];
    if (!values || ![Object.prototype, null].includes(Object.getPrototypeOf(values))
      || Object.keys(values).length !== keys.length || keys.some(key => typeof values[key] !== 'string')) {
      throw new TypeError('Equipment fields must be exactly the supported string fields');
    }
    // Identity is minted once from a revision-bound command, never recomputed on rename or replay.
    const fields = Object.fromEntries(keys.map(key => [key, values[key].trim()]));
    fields.group = fields.group || null;
    const seed = createHash('sha256').update(expectedRevision + '\0' + JSON.stringify(fields)).digest('hex').slice(0, 24);
    const ids = new Set(proposal.venuePackage.home.equipmentStatus.items.map(item => item.id));
    let id = 'equipment-' + seed;
    for (let suffix = 1; ids.has(id); suffix += 1) id = 'equipment-' + seed + '-' + suffix;
    const beforeCanonical = serializeDeploymentAgnosticVenueSource(proposal);
    const beforeRevision = proposalRevision();
    const result = recordCanvasPreview(previewCanvasSourceCommandWithInverse(proposal,
      createInsertItemCommand({ blockId, item: { id, ...fields } })), beforeCanonical, beforeRevision);
    return Object.freeze({ ...result, blockId: EQUIPMENT_COLLECTION + '.item.' + id });
  }

  function previewCanvasRemoveEquipment(blockId, expectedRevision) {
    assertCanvasRevision(expectedRevision);
    const beforeCanonical = serializeDeploymentAgnosticVenueSource(proposal);
    const beforeRevision = proposalRevision();
    return recordCanvasPreview(previewCanvasSourceCommandWithInverse(proposal,
      createRemoveItemCommand({ blockId })), beforeCanonical, beforeRevision);
  }

  function undoCanvasPreview(expectedRevision) {
    assertCanvasRevision(expectedRevision);
    const entry = canvasUndoHistory.at(-1);
    if (!entry) throw canvasConflict('there is no Canvas preview change to undo', 'CANVAS_HISTORY_UNAVAILABLE');
    if (serializeDeploymentAgnosticVenueSource(proposal) !== entry.afterCanonical) {
      throw canvasConflict('the Canvas history no longer matches the current draft');
    }
    const applied = previewCanvasSourceCommandWithInverse(proposal, entry.inverseCommand);
    const nextCanonical = serializeDeploymentAgnosticVenueSource(applied.source);
    if (nextCanonical !== entry.beforeCanonical
      || JSON.stringify(applied.inverseCommand) !== JSON.stringify(entry.forwardCommand)) {
      throw canvasConflict('the Canvas inverse command did not restore the recorded draft exactly');
    }
    proposal = cloneJson(applied.source);
    lastError = null;
    refreshDirtyState();
    canvasUndoHistory.pop();
    canvasRedoHistory.push(entry);
    return status();
  }

  function redoCanvasPreview(expectedRevision) {
    assertCanvasRevision(expectedRevision);
    const entry = canvasRedoHistory.at(-1);
    if (!entry) throw canvasConflict('there is no Canvas preview change to redo', 'CANVAS_HISTORY_UNAVAILABLE');
    if (serializeDeploymentAgnosticVenueSource(proposal) !== entry.beforeCanonical) {
      throw canvasConflict('the Canvas history no longer matches the current draft');
    }
    const applied = previewCanvasSourceCommandWithInverse(proposal, entry.forwardCommand);
    const nextCanonical = serializeDeploymentAgnosticVenueSource(applied.source);
    if (nextCanonical !== entry.afterCanonical
      || JSON.stringify(applied.inverseCommand) !== JSON.stringify(entry.inverseCommand)) {
      throw canvasConflict('the Canvas forward command did not restore the recorded draft exactly');
    }
    proposal = cloneJson(applied.source);
    lastError = null;
    refreshDirtyState();
    canvasRedoHistory.pop();
    canvasUndoHistory.push(entry);
    return status();
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
    clearCanvasHistory();
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
    clearCanvasHistory();
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
      revision += 1;
      clearCanvasHistory();
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
    revision += 1;
    clearCanvasHistory();
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
    canvasHistoryStatus,
    discard,
    edit,
    listEditableCollections,
    listEditableFields,
    moveCollectionItem,
    previewProjection,
    previewCanvasField,
    previewCanvasMove,
    previewCanvasMoveTo,
    previewCanvasAddEquipment,
    previewCanvasRemoveEquipment,
    proposalRevision,
    redoCanvasPreview,
    removeCollectionItem,
    status,
    undoCanvasPreview,
  });
}

module.exports = {
  CANVAS_HISTORY_LIMIT,
  SOURCE_SESSION_STATE,
  SourceAuthoringSessionError,
  createSourceAuthoringSession,
  editableSourceCollectionDescriptors,
  editableSourceFieldDescriptors,
};
