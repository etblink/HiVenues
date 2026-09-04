'use strict';

const { serializeCanonicalJson } = require('./safe-document');
const {
  VENUE_CANVAS_CONTRACT_KIND,
  createSemanticVenueCanvasContract,
  findVenueCanvasBlock,
} = require('./semantic-venue-canvas-contract');

const READ_ONLY_VENUE_CANVAS_PROJECTION_KIND =
  'hivenues-read-only-venue-canvas-projection';
const READ_ONLY_VENUE_CANVAS_PROJECTION_SCHEMA_VERSION = 1;
const VENUE_CANVAS_SELECTION_KIND = 'hivenues-semantic-venue-canvas-selection';
const VENUE_CANVAS_SELECTION_SCHEMA_VERSION = 1;
const SCOPE_ROOT_BLOCK_ID = 'page.home';

class ReadOnlyVenueCanvasProjectionError extends Error {
  constructor(message) {
    super('Read-only venue canvas projection invalid: ' + message);
    this.name = 'ReadOnlyVenueCanvasProjectionError';
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function isPlainObject(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function assertExactKeys(input, expectedKeys, label) {
  const ownKeys = Reflect.ownKeys(input);
  if (ownKeys.some((key) => typeof key !== 'string')) {
    throw new ReadOnlyVenueCanvasProjectionError(label + ' keys must be strings');
  }
  const actual = ownKeys.sort();
  const expected = [...expectedKeys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new ReadOnlyVenueCanvasProjectionError(
      label + ' keys must be exactly ' + expected.join(', '),
    );
  }
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      throw new ReadOnlyVenueCanvasProjectionError(
        label + ' properties must be enumerable JSON data properties',
      );
    }
  }
}

function assertIdentifier(value, label) {
  if (typeof value !== 'string' || !value || value.length > 240) {
    throw new ReadOnlyVenueCanvasProjectionError(
      label + ' must be a non-empty bounded string',
    );
  }
}

function normalizedSelection(blockId, fieldId) {
  assertIdentifier(blockId, 'blockId');
  if (fieldId !== null) assertIdentifier(fieldId, 'fieldId');
  return deepFreeze({
    kind: VENUE_CANVAS_SELECTION_KIND,
    schemaVersion: VENUE_CANVAS_SELECTION_SCHEMA_VERSION,
    blockId,
    fieldId,
  });
}

function createVenueCanvasSelection(input) {
  if (!isPlainObject(input)) {
    throw new ReadOnlyVenueCanvasProjectionError('selection builder input must be a plain object');
  }
  const keys = Object.keys(input);
  const expected = keys.includes('fieldId')
    ? ['blockId', 'fieldId']
    : ['blockId'];
  assertExactKeys(input, expected, 'selection builder input');
  const fieldId = Object.prototype.hasOwnProperty.call(input, 'fieldId')
    ? input.fieldId
    : null;
  return normalizedSelection(input.blockId, fieldId);
}

function parseVenueCanvasSelection(input) {
  if (!isPlainObject(input)) {
    throw new ReadOnlyVenueCanvasProjectionError('selection must be a plain object');
  }
  assertExactKeys(
    input,
    ['kind', 'schemaVersion', 'blockId', 'fieldId'],
    'selection',
  );
  if (input.kind !== VENUE_CANVAS_SELECTION_KIND) {
    throw new ReadOnlyVenueCanvasProjectionError('selection kind is unsupported');
  }
  if (input.schemaVersion !== VENUE_CANVAS_SELECTION_SCHEMA_VERSION) {
    throw new ReadOnlyVenueCanvasProjectionError('selection schema version is unsupported');
  }
  return normalizedSelection(input.blockId, input.fieldId);
}

function serializeVenueCanvasSelection(input) {
  return serializeCanonicalJson(parseVenueCanvasSelection(input));
}

function scopedBlocks(scopeRoot) {
  const records = [];

  function visit(block, depth, parentBlockId) {
    records.push({ block, depth, parentBlockId });
    for (const child of block.children) visit(child, depth + 1, block.id);
  }

  visit(scopeRoot, 0, null);
  return records;
}

function selectionMatches(left, right) {
  return left.blockId === right.blockId && left.fieldId === right.fieldId;
}

function selectionTargets(records, requestedSelection) {
  let selection = null;
  const targets = [];

  function append(blockId, fieldId) {
    const target = selectionMatches(requestedSelection, { blockId, fieldId })
      ? requestedSelection
      : normalizedSelection(blockId, fieldId);
    if (target === requestedSelection) selection = target;
    targets.push(target);
  }

  for (const { block } of records) {
    append(block.id, null);
    for (const field of block.fields) append(block.id, field.id);
  }

  return { selection, targets };
}

function words(value) {
  const phrase = value
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase();
  return phrase ? phrase[0].toUpperCase() + phrase.slice(1) : value;
}

function blockLabel(block) {
  const kind = words(block.kind);
  if (block.stableIdentity.source === 'operator-collection-id') {
    return kind + ': ' + words(block.stableIdentity.value);
  }
  return kind;
}

function identityRecord(block) {
  return {
    source: block.stableIdentity.source,
    value: block.stableIdentity.value,
  };
}

function canvasCard(record, selection) {
  const { block, depth, parentBlockId } = record;
  return {
    blockId: block.id,
    kind: block.kind,
    label: blockLabel(block),
    parentBlockId,
    depth,
    childBlockIds: block.children.map((child) => child.id),
    stableIdentity: identityRecord(block),
    sourcePointer: block.sourcePointer,
    selected: block.id === selection.blockId,
    selectedFieldId: block.id === selection.blockId ? selection.fieldId : null,
  };
}

function treeRow(record, selection) {
  const { block, depth, parentBlockId } = record;
  return {
    blockId: block.id,
    kind: block.kind,
    label: blockLabel(block),
    parentBlockId,
    depth,
    childCount: block.children.length,
    expanded: block.children.length > 0,
    stableIdentity: identityRecord(block),
    sourcePointer: block.sourcePointer,
    selected: block.id === selection.blockId,
  };
}

function inspectorField(field, selection) {
  return {
    fieldId: field.id,
    label: words(field.id),
    sourcePointer: field.sourcePointer,
    controlKind: field.controlKind,
    options: [...field.options],
    required: field.required,
    readOnly: true,
    selected: field.id === selection.fieldId,
  };
}

function targetFor(targets, blockId, fieldId = null) {
  return targets.find((target) => (
    target.blockId === blockId && target.fieldId === fieldId
  )) || null;
}

function navigationModel(targets, selection, selectedRecord) {
  const currentIndex = targets.indexOf(selection);
  const selectedBlock = selectedRecord.block;
  return {
    order: 'semantic-depth-first-block-then-fields',
    wraps: false,
    currentIndex,
    position: currentIndex + 1,
    targetCount: targets.length,
    targets,
    previous: targets[currentIndex - 1] || null,
    next: targets[currentIndex + 1] || null,
    containingBlock: selection.fieldId === null
      ? null
      : targetFor(targets, selection.blockId),
    parentBlock: selectedRecord.parentBlockId === null
      ? null
      : targetFor(targets, selectedRecord.parentBlockId),
    firstChild: selectedBlock.children.length === 0
      ? null
      : targetFor(targets, selectedBlock.children[0].id),
    firstField: selectedBlock.fields.length === 0
      ? null
      : targetFor(targets, selectedBlock.id, selectedBlock.fields[0].id),
  };
}

function createReadOnlyVenueCanvasProjection(authoringInput, selectionInput) {
  const contract = createSemanticVenueCanvasContract(authoringInput);
  const scopeRoot = findVenueCanvasBlock(contract, SCOPE_ROOT_BLOCK_ID);
  const records = scopedBlocks(scopeRoot);
  const requestedSelection = selectionInput === undefined
    ? createVenueCanvasSelection({ blockId: SCOPE_ROOT_BLOCK_ID })
    : parseVenueCanvasSelection(selectionInput);
  const { selection, targets } = selectionTargets(records, requestedSelection);

  if (!selection) {
    const selectedBlock = records.find(({ block }) => block.id === requestedSelection.blockId);
    if (!selectedBlock) {
      throw new ReadOnlyVenueCanvasProjectionError(
        'selection block is outside the ' + SCOPE_ROOT_BLOCK_ID + ' scope',
      );
    }
    throw new ReadOnlyVenueCanvasProjectionError(
      'unknown fieldId ' + requestedSelection.fieldId
        + ' for blockId ' + requestedSelection.blockId,
    );
  }

  const selectedRecord = records.find(({ block }) => block.id === selection.blockId);
  const selectedBlock = selectedRecord.block;
  const selectedField = selection.fieldId === null
    ? null
    : selectedBlock.fields.find((field) => field.id === selection.fieldId);
  const cards = records.map((record) => canvasCard(record, selection));
  const rows = records.map((record) => treeRow(record, selection));
  const fields = selectedBlock.fields.map((field) => inspectorField(field, selection));
  const navigation = navigationModel(targets, selection, selectedRecord);

  return deepFreeze({
    kind: READ_ONLY_VENUE_CANVAS_PROJECTION_KIND,
    schemaVersion: READ_ONLY_VENUE_CANVAS_PROJECTION_SCHEMA_VERSION,
    source: {
      schemaVersion: contract.source.schemaVersion,
      venueId: contract.source.venueId,
      deploymentRefId: contract.source.deploymentRefId,
    },
    authority: {
      canonicalDocument: contract.authority.canonicalDocument,
      semanticContract: VENUE_CANVAS_CONTRACT_KIND,
      scopeRootBlockId: SCOPE_ROOT_BLOCK_ID,
      allowedInteractions: ['select', 'navigate'],
      derived: true,
      persistent: false,
      mutable: false,
      runtimeWired: false,
    },
    selection,
    canvas: {
      selection,
      cards,
    },
    tree: {
      selection,
      rows,
    },
    inspector: {
      selection,
      block: {
        blockId: selectedBlock.id,
        kind: selectedBlock.kind,
        label: blockLabel(selectedBlock),
        stableIdentity: identityRecord(selectedBlock),
        sourcePointer: selectedBlock.sourcePointer,
      },
      fields,
    },
    focusTarget: {
      selection,
      surface: selectedField ? 'inspector-field' : 'canvas-card',
    },
    diagnostics: {
      selection,
      scopeRootBlockId: SCOPE_ROOT_BLOCK_ID,
      depth: selectedRecord.depth,
      stableIdentity: identityRecord(selectedBlock),
      blockSourcePointer: selectedBlock.sourcePointer,
      fieldSourcePointer: selectedField ? selectedField.sourcePointer : null,
      navigationIndex: navigation.currentIndex,
    },
    navigation,
  });
}

function serializeReadOnlyVenueCanvasProjection(authoringInput, selectionInput) {
  return serializeCanonicalJson(
    createReadOnlyVenueCanvasProjection(authoringInput, selectionInput),
  );
}

module.exports = {
  READ_ONLY_VENUE_CANVAS_PROJECTION_KIND,
  READ_ONLY_VENUE_CANVAS_PROJECTION_SCHEMA_VERSION,
  ReadOnlyVenueCanvasProjectionError,
  SCOPE_ROOT_BLOCK_ID,
  VENUE_CANVAS_SELECTION_KIND,
  VENUE_CANVAS_SELECTION_SCHEMA_VERSION,
  createReadOnlyVenueCanvasProjection,
  createVenueCanvasSelection,
  parseVenueCanvasSelection,
  serializeReadOnlyVenueCanvasProjection,
  serializeVenueCanvasSelection,
};
