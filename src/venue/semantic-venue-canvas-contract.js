'use strict';

const {
  applyOrdinaryOperatorEdit,
  createVenueAuthoringDocument,
  serializeVenueAuthoringReview,
} = require('./authoring');
const { ITEM_ID_PATTERN } = require('./package');
const { serializeCanonicalJson } = require('./safe-document');
const { editableFieldDescriptors } = require('./visual-authoring-session');

const VENUE_CANVAS_CONTRACT_KIND = 'hivenues-semantic-venue-canvas-contract';
const VENUE_CANVAS_CONTRACT_SCHEMA_VERSION = 1;
const VENUE_CANVAS_COMMAND_KIND = 'hivenues-semantic-venue-canvas-command';
const VENUE_CANVAS_COMMAND_SCHEMA_VERSION = 1;

const COMMAND_TYPE = Object.freeze({
  SET_FIELD: 'set-field',
  INSERT_ITEM: 'insert-item',
  REMOVE_ITEM: 'remove-item',
  MOVE_ITEM: 'move-item',
});

const ORDER_POLICY = Object.freeze({
  FIXED: 'fixed',
  CANONICAL: 'canonical-start-time-then-id',
  OPERATOR_DEFINED: 'operator-defined',
});

const CAPABILITY = Object.freeze({
  SELECT: 'select',
  SET_FIELD: 'set-field',
  INSERT_ITEM: 'insert-item',
  REMOVE_ITEM: 'remove-item',
  MOVE_ITEM: 'move-item',
});

const SETTINGS_BLOCK_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'settings.identity',
    kind: 'venue-identity',
    section: 'identity',
    sourcePointer: '/venueContext',
    minimum: 1,
    maximum: 1,
  }),
  Object.freeze({
    id: 'settings.business',
    kind: 'venue-business',
    section: 'business',
    sourcePointer: '/venueContext/business',
    minimum: 1,
    maximum: 1,
  }),
  Object.freeze({
    id: 'settings.brand',
    kind: 'venue-brand',
    section: 'brand',
    sourcePointer: '/venuePackage/brand',
    minimum: 1,
    maximum: 1,
  }),
  Object.freeze({
    id: 'settings.theme',
    kind: 'venue-theme',
    section: 'theme',
    sourcePointer: '/venuePackage/brand/theme',
    minimum: 0,
    maximum: 1,
  }),
  Object.freeze({
    id: 'settings.seo',
    kind: 'venue-seo',
    section: 'seo',
    sourcePointer: '/venuePackage/seo',
    minimum: 1,
    maximum: 1,
  }),
  Object.freeze({
    id: 'settings.onboarding',
    kind: 'venue-onboarding-language',
    section: 'onboarding',
    sourcePointer: '/venuePackage/onboarding',
    minimum: 1,
    maximum: 1,
  }),
]);

const HOME_BLOCK_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'home.hero',
    kind: 'venue-hero',
    section: 'hero',
    sourcePointer: '/venuePackage/home/hero',
    minimum: 1,
    maximum: 1,
  }),
  Object.freeze({
    id: 'home.updates',
    kind: 'venue-updates',
    section: 'updates',
    sourcePointer: '/venuePackage/home/updates',
    minimum: 1,
    maximum: 1,
  }),
  Object.freeze({
    id: 'home.programs',
    kind: 'venue-programs',
    itemKind: 'venue-program',
    section: 'programs',
    sourcePointer: '/venuePackage/home/programs',
    collectionPointer: '/venuePackage/home/programs/items',
    minimum: 0,
    maximum: 1,
    maximumItems: 12,
    orderPolicy: ORDER_POLICY.CANONICAL,
  }),
  Object.freeze({
    id: 'home.equipment-status',
    kind: 'venue-equipment-status',
    itemKind: 'venue-equipment-status-item',
    section: 'equipment-status',
    sourcePointer: '/venuePackage/home/equipmentStatus',
    collectionPointer: '/venuePackage/home/equipmentStatus/items',
    minimum: 0,
    maximum: 1,
    maximumItems: 20,
    orderPolicy: ORDER_POLICY.OPERATOR_DEFINED,
  }),
  Object.freeze({
    id: 'home.pathways',
    kind: 'venue-pathways',
    section: 'pathways',
    sourcePointer: '/venuePackage/home/pathways',
    minimum: 1,
    maximum: 1,
  }),
  Object.freeze({
    id: 'home.visit',
    kind: 'venue-visit',
    section: 'visit',
    sourcePointer: '/venuePackage/home/visit',
    minimum: 1,
    maximum: 1,
  }),
  Object.freeze({
    id: 'home.community',
    kind: 'venue-community',
    section: 'community',
    sourcePointer: '/venuePackage/home/community',
    minimum: 1,
    maximum: 1,
  }),
  Object.freeze({
    id: 'home.gallery',
    kind: 'venue-gallery-fixed-topology',
    section: 'gallery',
    sourcePointer: '/venuePackage/home/gallery',
    minimum: 1,
    maximum: 1,
  }),
]);

class SemanticVenueCanvasContractError extends Error {
  constructor(message) {
    super('Semantic venue canvas contract invalid: ' + message);
    this.name = 'SemanticVenueCanvasContractError';
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function assertJsonSerializable(value, label, ancestors = new WeakSet()) {
  if (
    value === null
    || typeof value === 'string'
    || typeof value === 'boolean'
  ) return;
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return;
    throw new SemanticVenueCanvasContractError(label + ' must be JSON serializable');
  }
  if (!value || typeof value !== 'object') {
    throw new SemanticVenueCanvasContractError(label + ' must be JSON serializable');
  }
  if (ancestors.has(value)) {
    throw new SemanticVenueCanvasContractError(label + ' must be JSON serializable');
  }
  if (!Array.isArray(value) && !isPlainObject(value)) {
    throw new SemanticVenueCanvasContractError(label + ' must be JSON serializable');
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new SemanticVenueCanvasContractError(label + ' must be JSON serializable');
  }

  ancestors.add(value);
  if (Array.isArray(value)) {
    const keys = Object.keys(value);
    if (
      keys.length !== value.length
      || keys.some((key, index) => key !== String(index))
    ) {
      throw new SemanticVenueCanvasContractError(label + ' must be JSON serializable');
    }
    for (const entry of value) assertJsonSerializable(entry, label, ancestors);
  } else {
    for (const entry of Object.values(value)) assertJsonSerializable(entry, label, ancestors);
  }
  ancestors.delete(value);
}

function cloneJson(value, label = 'value') {
  assertJsonSerializable(value, label);
  let serialized;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new SemanticVenueCanvasContractError(label + ' must be JSON serializable');
  }
  if (serialized === undefined) {
    throw new SemanticVenueCanvasContractError(label + ' must be JSON serializable');
  }
  return JSON.parse(serialized);
}

function isPlainObject(value) {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function decodePointer(pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('/') || pointer === '/') {
    throw new SemanticVenueCanvasContractError('source pointer must identify a document value');
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
      throw new SemanticVenueCanvasContractError('source value does not exist at ' + pointer);
    }
    cursor = cursor[segment];
  }
  return cursor;
}

function readOptionalAtPointer(document, pointer) {
  try {
    return readAtPointer(document, pointer);
  } catch {
    return undefined;
  }
}

function writeAtPointer(document, pointer, value) {
  const segments = decodePointer(pointer);
  let cursor = document;
  for (const segment of segments.slice(0, -1)) {
    if (!cursor || typeof cursor !== 'object' || !Object.prototype.hasOwnProperty.call(cursor, segment)) {
      throw new SemanticVenueCanvasContractError('source value does not exist at ' + pointer);
    }
    cursor = cursor[segment];
  }
  const leaf = segments.at(-1);
  if (!cursor || typeof cursor !== 'object' || !Object.prototype.hasOwnProperty.call(cursor, leaf)) {
    throw new SemanticVenueCanvasContractError('source value does not exist at ' + pointer);
  }
  cursor[leaf] = cloneJson(value, 'field value');
}

function relativeFieldId(pointer, sourcePointer) {
  if (!pointer.startsWith(sourcePointer + '/')) {
    throw new SemanticVenueCanvasContractError(
      'field ' + pointer + ' is outside block source ' + sourcePointer,
    );
  }
  return decodePointer(pointer.slice(sourcePointer.length))
    .join('.');
}

function fieldContract(field, sourcePointer) {
  return {
    id: relativeFieldId(field.pointer, sourcePointer),
    sourcePointer: field.pointer,
    controlKind: field.controlKind,
    options: [...field.options],
    required: field.required,
  };
}

function fixedPlacement(definition, parentId) {
  return {
    parentId,
    orderPolicy: ORDER_POLICY.FIXED,
    cardinality: {
      minimum: definition.minimum,
      maximum: definition.maximum,
    },
  };
}

function fixedSlots(definitions) {
  return definitions.map((definition) => ({
    blockId: definition.id,
    kind: definition.kind,
    cardinality: {
      minimum: definition.minimum,
      maximum: definition.maximum,
    },
  }));
}

function fieldsForSection(fieldDescriptors, definition) {
  return fieldDescriptors
    .filter((field) => field.semanticSection === definition.section)
    .filter((field) => field.pointer.startsWith(definition.sourcePointer + '/'))
    .filter((field) => (
      !definition.collectionPointer
      || !field.pointer.startsWith(definition.collectionPointer + '/')
    ))
    .map((field) => fieldContract(field, definition.sourcePointer));
}

function itemBlockId(parentId, itemId) {
  return parentId + '.item.' + itemId;
}

function collectionItemBlock(definition, item, index, fieldDescriptors) {
  const sourcePointer = definition.collectionPointer + '/' + index;
  const fields = fieldDescriptors
    .filter((field) => field.pointer.startsWith(sourcePointer + '/'))
    .map((field) => fieldContract(field, sourcePointer));
  const capabilities = [
    CAPABILITY.SELECT,
    CAPABILITY.SET_FIELD,
    CAPABILITY.REMOVE_ITEM,
  ];
  if (definition.orderPolicy === ORDER_POLICY.OPERATOR_DEFINED) {
    capabilities.push(CAPABILITY.MOVE_ITEM);
  }
  return {
    id: itemBlockId(definition.id, item.id),
    kind: definition.itemKind,
    sourcePointer,
    stableIdentity: {
      source: 'operator-collection-id',
      value: item.id,
    },
    placement: {
      parentId: definition.id,
      orderPolicy: definition.orderPolicy,
      cardinality: {
        minimum: 0,
        maximum: definition.maximumItems,
      },
    },
    capabilities,
    fields,
    childPolicy: null,
    children: [],
  };
}

function semanticBlock(definition, parentId, document, fieldDescriptors) {
  const source = readOptionalAtPointer(document, definition.sourcePointer);
  if (source === undefined) return null;

  const fields = fieldsForSection(fieldDescriptors, definition);
  if (!definition.collectionPointer) {
    return {
      id: definition.id,
      kind: definition.kind,
      sourcePointer: definition.sourcePointer,
      stableIdentity: {
        source: 'semantic-slot',
        value: definition.id,
      },
      placement: fixedPlacement(definition, parentId),
      capabilities: [
        CAPABILITY.SELECT,
        ...(fields.length ? [CAPABILITY.SET_FIELD] : []),
      ],
      fields,
      childPolicy: null,
      children: [],
    };
  }

  const items = readAtPointer(document, definition.collectionPointer);
  return {
    id: definition.id,
    kind: definition.kind,
    sourcePointer: definition.sourcePointer,
    stableIdentity: {
      source: 'semantic-slot',
      value: definition.id,
    },
    placement: fixedPlacement(definition, parentId),
    capabilities: [
      CAPABILITY.SELECT,
      CAPABILITY.SET_FIELD,
      CAPABILITY.INSERT_ITEM,
    ],
    fields,
    childPolicy: {
      collectionPointer: definition.collectionPointer,
      allowedKinds: [definition.itemKind],
      fixedSlots: [],
      orderPolicy: definition.orderPolicy,
      cardinality: {
        minimum: 0,
        maximum: definition.maximumItems,
      },
    },
    children: items.map((item, index) => (
      collectionItemBlock(definition, item, index, fieldDescriptors)
    )),
  };
}

function groupBlock({ id, kind, parentId, definitions, document, fieldDescriptors }) {
  const children = definitions
    .map((definition) => semanticBlock(definition, id, document, fieldDescriptors))
    .filter(Boolean);
  return {
    id,
    kind,
    sourcePointer: null,
    stableIdentity: {
      source: 'semantic-slot',
      value: id,
    },
    placement: {
      parentId,
      orderPolicy: ORDER_POLICY.FIXED,
      cardinality: {
        minimum: 1,
        maximum: 1,
      },
    },
    capabilities: [CAPABILITY.SELECT],
    fields: [],
    childPolicy: {
      collectionPointer: null,
      allowedKinds: definitions.map((definition) => definition.kind),
      fixedSlots: fixedSlots(definitions),
      orderPolicy: ORDER_POLICY.FIXED,
      cardinality: {
        minimum: definitions.filter((definition) => definition.minimum > 0).length,
        maximum: definitions.length,
      },
    },
    children,
  };
}

function createSemanticVenueCanvasContract(authoringInput) {
  const document = createVenueAuthoringDocument(authoringInput);
  const fieldDescriptors = editableFieldDescriptors(document);
  const settings = groupBlock({
    id: 'venue.settings',
    kind: 'venue-settings',
    parentId: 'venue',
    definitions: SETTINGS_BLOCK_DEFINITIONS,
    document,
    fieldDescriptors,
  });
  const home = groupBlock({
    id: 'page.home',
    kind: 'venue-home-page',
    parentId: 'venue',
    definitions: HOME_BLOCK_DEFINITIONS,
    document,
    fieldDescriptors,
  });

  return deepFreeze({
    kind: VENUE_CANVAS_CONTRACT_KIND,
    schemaVersion: VENUE_CANVAS_CONTRACT_SCHEMA_VERSION,
    source: {
      schemaVersion: document.schemaVersion,
      venueId: document.venueContext.id,
      deploymentRefId: document.deploymentRef.id,
    },
    authority: {
      canonicalDocument: 'venue-authoring-document-v1',
      mutationGate: 'ordinary-operator-authority',
      derived: true,
      persistent: false,
      runtimeWired: false,
    },
    root: {
      id: 'venue',
      kind: 'venue',
      sourcePointer: null,
      stableIdentity: {
        source: 'venue-context-id',
        value: document.venueContext.id,
      },
      placement: null,
      capabilities: [CAPABILITY.SELECT],
      fields: [],
      childPolicy: {
        collectionPointer: null,
        allowedKinds: [
          'venue-settings',
          'venue-home-page',
        ],
        fixedSlots: [
          {
            blockId: 'venue.settings',
            kind: 'venue-settings',
            cardinality: { minimum: 1, maximum: 1 },
          },
          {
            blockId: 'page.home',
            kind: 'venue-home-page',
            cardinality: { minimum: 1, maximum: 1 },
          },
        ],
        orderPolicy: ORDER_POLICY.FIXED,
        cardinality: {
          minimum: 2,
          maximum: 2,
        },
      },
      children: [settings, home],
    },
  });
}

function assertContract(contract) {
  if (
    !contract
    || contract.kind !== VENUE_CANVAS_CONTRACT_KIND
    || contract.schemaVersion !== VENUE_CANVAS_CONTRACT_SCHEMA_VERSION
    || !contract.root
  ) {
    throw new SemanticVenueCanvasContractError('contract kind or schema version is unsupported');
  }
}

function listVenueCanvasBlocks(contract) {
  assertContract(contract);
  const blocks = [];
  function visit(block) {
    blocks.push(block);
    for (const child of block.children) visit(child);
  }
  visit(contract.root);
  return Object.freeze(blocks);
}

function findVenueCanvasBlock(contract, blockId) {
  if (typeof blockId !== 'string' || !blockId) {
    throw new SemanticVenueCanvasContractError('blockId must be a non-empty string');
  }
  const block = listVenueCanvasBlocks(contract).find((entry) => entry.id === blockId);
  if (!block) {
    throw new SemanticVenueCanvasContractError('unknown blockId ' + blockId);
  }
  return block;
}

function assertExactKeys(input, expectedKeys, label) {
  const actual = Object.keys(input).sort();
  const expected = [...expectedKeys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new SemanticVenueCanvasContractError(
      label + ' keys must be exactly ' + expected.join(', '),
    );
  }
}

function assertIdentifier(value, label) {
  if (typeof value !== 'string' || !value || value.length > 240) {
    throw new SemanticVenueCanvasContractError(label + ' must be a non-empty bounded string');
  }
}

function assertBeforeBlockId(value) {
  if (value !== null) assertIdentifier(value, 'beforeBlockId');
}

function parseVenueCanvasCommand(input) {
  if (!isPlainObject(input)) {
    throw new SemanticVenueCanvasContractError('command must be a plain object');
  }
  if (input.kind !== VENUE_CANVAS_COMMAND_KIND) {
    throw new SemanticVenueCanvasContractError('command kind is unsupported');
  }
  if (input.schemaVersion !== VENUE_CANVAS_COMMAND_SCHEMA_VERSION) {
    throw new SemanticVenueCanvasContractError('command schema version is unsupported');
  }
  if (!Object.values(COMMAND_TYPE).includes(input.type)) {
    throw new SemanticVenueCanvasContractError('command type is unsupported');
  }

  if (input.type === COMMAND_TYPE.SET_FIELD) {
    assertExactKeys(
      input,
      ['kind', 'schemaVersion', 'type', 'blockId', 'fieldId', 'value'],
      COMMAND_TYPE.SET_FIELD,
    );
    assertIdentifier(input.blockId, 'blockId');
    assertIdentifier(input.fieldId, 'fieldId');
    return deepFreeze({
      kind: input.kind,
      schemaVersion: input.schemaVersion,
      type: input.type,
      blockId: input.blockId,
      fieldId: input.fieldId,
      value: cloneJson(input.value, 'field value'),
    });
  }

  if (input.type === COMMAND_TYPE.INSERT_ITEM) {
    assertExactKeys(
      input,
      ['kind', 'schemaVersion', 'type', 'blockId', 'item', 'beforeBlockId'],
      COMMAND_TYPE.INSERT_ITEM,
    );
    assertIdentifier(input.blockId, 'blockId');
    assertBeforeBlockId(input.beforeBlockId);
    if (!isPlainObject(input.item)) {
      throw new SemanticVenueCanvasContractError('insert item must be a plain object');
    }
    if (
      typeof input.item.id !== 'string'
      || input.item.id.trim() !== input.item.id
      || input.item.id.length < 2
      || input.item.id.length > 80
      || !ITEM_ID_PATTERN.test(input.item.id)
    ) {
      throw new SemanticVenueCanvasContractError('insert item requires a canonical stable id');
    }
    return deepFreeze({
      kind: input.kind,
      schemaVersion: input.schemaVersion,
      type: input.type,
      blockId: input.blockId,
      item: cloneJson(input.item, 'insert item'),
      beforeBlockId: input.beforeBlockId,
    });
  }

  if (input.type === COMMAND_TYPE.REMOVE_ITEM) {
    assertExactKeys(
      input,
      ['kind', 'schemaVersion', 'type', 'blockId'],
      COMMAND_TYPE.REMOVE_ITEM,
    );
    assertIdentifier(input.blockId, 'blockId');
    return deepFreeze({
      kind: input.kind,
      schemaVersion: input.schemaVersion,
      type: input.type,
      blockId: input.blockId,
    });
  }

  assertExactKeys(
    input,
    ['kind', 'schemaVersion', 'type', 'blockId', 'beforeBlockId'],
    COMMAND_TYPE.MOVE_ITEM,
  );
  assertIdentifier(input.blockId, 'blockId');
  assertBeforeBlockId(input.beforeBlockId);
  return deepFreeze({
    kind: input.kind,
    schemaVersion: input.schemaVersion,
    type: input.type,
    blockId: input.blockId,
    beforeBlockId: input.beforeBlockId,
  });
}

function createSetFieldCommand({ blockId, fieldId, value } = {}) {
  return parseVenueCanvasCommand({
    kind: VENUE_CANVAS_COMMAND_KIND,
    schemaVersion: VENUE_CANVAS_COMMAND_SCHEMA_VERSION,
    type: COMMAND_TYPE.SET_FIELD,
    blockId,
    fieldId,
    value,
  });
}

function createInsertItemCommand({ blockId, item, beforeBlockId = null } = {}) {
  return parseVenueCanvasCommand({
    kind: VENUE_CANVAS_COMMAND_KIND,
    schemaVersion: VENUE_CANVAS_COMMAND_SCHEMA_VERSION,
    type: COMMAND_TYPE.INSERT_ITEM,
    blockId,
    item,
    beforeBlockId,
  });
}

function createRemoveItemCommand({ blockId } = {}) {
  return parseVenueCanvasCommand({
    kind: VENUE_CANVAS_COMMAND_KIND,
    schemaVersion: VENUE_CANVAS_COMMAND_SCHEMA_VERSION,
    type: COMMAND_TYPE.REMOVE_ITEM,
    blockId,
  });
}

function createMoveItemCommand({ blockId, beforeBlockId = null } = {}) {
  return parseVenueCanvasCommand({
    kind: VENUE_CANVAS_COMMAND_KIND,
    schemaVersion: VENUE_CANVAS_COMMAND_SCHEMA_VERSION,
    type: COMMAND_TYPE.MOVE_ITEM,
    blockId,
    beforeBlockId,
  });
}

function hasCapability(block, capability) {
  return block.capabilities.includes(capability);
}

function parentBlock(contract, block) {
  if (!block.placement?.parentId) {
    throw new SemanticVenueCanvasContractError('block ' + block.id + ' has no command parent');
  }
  return findVenueCanvasBlock(contract, block.placement.parentId);
}

function applySetField(draft, contract, command) {
  const block = findVenueCanvasBlock(contract, command.blockId);
  if (!hasCapability(block, CAPABILITY.SET_FIELD)) {
    throw new SemanticVenueCanvasContractError('set-field is denied for block ' + block.id);
  }
  const field = block.fields.find((entry) => entry.id === command.fieldId);
  if (!field) {
    throw new SemanticVenueCanvasContractError(
      'unknown fieldId ' + command.fieldId + ' for block ' + block.id,
    );
  }
  const previousValue = cloneJson(readAtPointer(draft, field.sourcePointer), 'previous field value');
  writeAtPointer(draft, field.sourcePointer, command.value);
  return createSetFieldCommand({
    blockId: block.id,
    fieldId: field.id,
    value: previousValue,
  });
}

function assertCollectionParent(block) {
  if (!block.childPolicy?.collectionPointer) {
    throw new SemanticVenueCanvasContractError('block ' + block.id + ' is not a collection');
  }
}

function blockItemId(block) {
  if (block.stableIdentity?.source !== 'operator-collection-id') {
    throw new SemanticVenueCanvasContractError('block ' + block.id + ' has no collection item identity');
  }
  return block.stableIdentity.value;
}

function applyInsertItem(draft, contract, command) {
  const parent = findVenueCanvasBlock(contract, command.blockId);
  assertCollectionParent(parent);
  if (!hasCapability(parent, CAPABILITY.INSERT_ITEM)) {
    throw new SemanticVenueCanvasContractError('insert-item is denied for block ' + parent.id);
  }
  const targetBlockId = itemBlockId(parent.id, command.item.id);
  if (parent.children.some((child) => child.id === targetBlockId)) {
    throw new SemanticVenueCanvasContractError('collection item already exists: ' + command.item.id);
  }
  if (
    parent.childPolicy.orderPolicy === ORDER_POLICY.CANONICAL
    && command.beforeBlockId !== null
  ) {
    throw new SemanticVenueCanvasContractError(
      parent.id + ' uses canonical ordering and does not accept manual insertion position',
    );
  }

  const items = readAtPointer(draft, parent.childPolicy.collectionPointer);
  const item = cloneJson(command.item, 'insert item');
  if (command.beforeBlockId === null) {
    items.push(item);
  } else {
    const before = parent.children.find((child) => child.id === command.beforeBlockId);
    if (!before) {
      throw new SemanticVenueCanvasContractError(
        'beforeBlockId must identify a child of ' + parent.id,
      );
    }
    const index = items.findIndex((entry) => entry.id === blockItemId(before));
    items.splice(index, 0, item);
  }

  return createRemoveItemCommand({ blockId: targetBlockId });
}

function applyRemoveItem(draft, contract, command) {
  const block = findVenueCanvasBlock(contract, command.blockId);
  if (!hasCapability(block, CAPABILITY.REMOVE_ITEM)) {
    throw new SemanticVenueCanvasContractError('remove-item is denied for block ' + block.id);
  }
  const parent = parentBlock(contract, block);
  assertCollectionParent(parent);
  const itemId = blockItemId(block);
  const items = readAtPointer(draft, parent.childPolicy.collectionPointer);
  const index = items.findIndex((item) => item.id === itemId);
  if (index < 0) {
    throw new SemanticVenueCanvasContractError('collection item does not exist: ' + itemId);
  }
  const removed = cloneJson(items[index], 'removed item');
  const nextBlock = parent.children[index + 1] || null;
  items.splice(index, 1);

  return createInsertItemCommand({
    blockId: parent.id,
    item: removed,
    beforeBlockId: parent.childPolicy.orderPolicy === ORDER_POLICY.OPERATOR_DEFINED
      ? nextBlock?.id || null
      : null,
  });
}

function applyMoveItem(draft, contract, command) {
  const block = findVenueCanvasBlock(contract, command.blockId);
  if (!hasCapability(block, CAPABILITY.MOVE_ITEM)) {
    throw new SemanticVenueCanvasContractError('move-item is denied for block ' + block.id);
  }
  const parent = parentBlock(contract, block);
  assertCollectionParent(parent);
  if (parent.childPolicy.orderPolicy !== ORDER_POLICY.OPERATOR_DEFINED) {
    throw new SemanticVenueCanvasContractError(parent.id + ' does not use operator-defined order');
  }
  if (command.beforeBlockId === block.id) {
    throw new SemanticVenueCanvasContractError('a block cannot be moved before itself');
  }

  const before = command.beforeBlockId === null
    ? null
    : parent.children.find((child) => child.id === command.beforeBlockId);
  if (command.beforeBlockId !== null && !before) {
    throw new SemanticVenueCanvasContractError(
      'beforeBlockId must identify a sibling of ' + block.id,
    );
  }

  const items = readAtPointer(draft, parent.childPolicy.collectionPointer);
  const itemId = blockItemId(block);
  const sourceIndex = items.findIndex((item) => item.id === itemId);
  if (sourceIndex < 0) {
    throw new SemanticVenueCanvasContractError('collection item does not exist: ' + itemId);
  }
  const priorOrder = items.map((item) => item.id);
  const oldNext = parent.children[sourceIndex + 1] || null;
  const [item] = items.splice(sourceIndex, 1);
  if (before === null) {
    items.push(item);
  } else {
    const beforeItemId = blockItemId(before);
    const targetIndex = items.findIndex((entry) => entry.id === beforeItemId);
    items.splice(targetIndex, 0, item);
  }
  if (JSON.stringify(items.map((entry) => entry.id)) === JSON.stringify(priorOrder)) {
    throw new SemanticVenueCanvasContractError('move-item must change operator-defined order');
  }

  return createMoveItemCommand({
    blockId: block.id,
    beforeBlockId: oldNext?.id || null,
  });
}

function applyVenueCanvasCommand(baseInput, commandInput) {
  const base = createVenueAuthoringDocument(baseInput);
  const contract = createSemanticVenueCanvasContract(base);
  const command = parseVenueCanvasCommand(commandInput);
  const draft = cloneJson(base, 'authoring document');
  let inverseCommand;

  if (command.type === COMMAND_TYPE.SET_FIELD) {
    inverseCommand = applySetField(draft, contract, command);
  } else if (command.type === COMMAND_TYPE.INSERT_ITEM) {
    inverseCommand = applyInsertItem(draft, contract, command);
  } else if (command.type === COMMAND_TYPE.REMOVE_ITEM) {
    inverseCommand = applyRemoveItem(draft, contract, command);
  } else {
    inverseCommand = applyMoveItem(draft, contract, command);
  }

  const proposed = createVenueAuthoringDocument(draft);
  const document = createVenueAuthoringDocument(applyOrdinaryOperatorEdit(base, proposed));
  return deepFreeze({
    document,
    canonicalDocument: serializeVenueAuthoringReview(document),
    contract: createSemanticVenueCanvasContract(document),
    inverseCommand,
  });
}

function serializeSemanticVenueCanvasContract(authoringInput) {
  return serializeCanonicalJson(createSemanticVenueCanvasContract(authoringInput));
}

module.exports = {
  CAPABILITY,
  COMMAND_TYPE,
  ORDER_POLICY,
  SemanticVenueCanvasContractError,
  VENUE_CANVAS_COMMAND_KIND,
  VENUE_CANVAS_COMMAND_SCHEMA_VERSION,
  VENUE_CANVAS_CONTRACT_KIND,
  VENUE_CANVAS_CONTRACT_SCHEMA_VERSION,
  applyVenueCanvasCommand,
  createInsertItemCommand,
  createMoveItemCommand,
  createRemoveItemCommand,
  createSemanticVenueCanvasContract,
  createSetFieldCommand,
  findVenueCanvasBlock,
  listVenueCanvasBlocks,
  parseVenueCanvasCommand,
  serializeSemanticVenueCanvasContract,
};
