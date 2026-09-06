'use strict';

const { createDeploymentAgnosticVenueSource, extractDeploymentAgnosticVenueSource } = require('./source');
const { applyOrdinaryOperatorSourceEdit, buildVenueSourceOwnershipMap } = require('./source-authoring');
const { OWNERSHIP } = require('./authoring');
const {
  CAPABILITY,
  COMMAND_TYPE,
  createSemanticVenueCanvasContract,
  findVenueCanvasBlock,
  parseVenueCanvasCommand,
  createSetFieldCommand,
  createMoveItemCommand,
  applyVenueCanvasCommand,
} = require('./semantic-venue-canvas-contract');

// Compatibility envelope for the existing command engine, never a deployment.
function commandDocument(source) {
  return { schemaVersion: source.schemaVersion, deploymentRef: { id: 'offline-canvas-text-preview' }, venueContext: source.venueContext, venuePackage: source.venuePackage };
}

function canvasTextField(sourceInput, blockId, fieldId) {
  const source = createDeploymentAgnosticVenueSource(sourceInput);
  if (typeof blockId !== 'string' || !blockId.startsWith('home.')) throw new TypeError('Home field required');
  const block = findVenueCanvasBlock(createSemanticVenueCanvasContract(commandDocument(source)), blockId);
  const field = block.fields.find((entry) => entry.id === fieldId);
  if (!field) throw new TypeError('Unknown field');
  const value = field.sourcePointer.split('/').slice(1).reduce((obj, key) => obj[key.replace(/~1/g, '/').replace(/~0/g, '~')], source);
  const editable = ['text', 'multiline-text'].includes(field.controlKind)
    && buildVenueSourceOwnershipMap(source)[field.sourcePointer] === OWNERSHIP.OPERATOR_AUTHORED
    && (typeof value === 'string' || (value === null && !field.required));
  return Object.freeze({ ...field, value, editable });
}

const COLLECTION_END_DESTINATION = '__collection_end__';
const EQUIPMENT_COLLECTION = 'home.equipment-status';

function canvasEquipmentCollection(sourceInput, blockId) {
  const source = createDeploymentAgnosticVenueSource(sourceInput);
  const contract = createSemanticVenueCanvasContract(commandDocument(source));
  const block = findVenueCanvasBlock(contract, blockId);
  if (block.id !== EQUIPMENT_COLLECTION || !block.capabilities.includes(CAPABILITY.INSERT_ITEM)) {
    throw new TypeError('Canvas equipment collection is unavailable');
  }
  return Object.freeze({ count: block.children.length, maximum: block.childPolicy.cardinality.maximum,
    canAdd: block.children.length < block.childPolicy.cardinality.maximum });
}

function canvasMoveItem(sourceInput, blockId) {
  const source = createDeploymentAgnosticVenueSource(sourceInput);
  const contract = createSemanticVenueCanvasContract(commandDocument(source));
  const block = findVenueCanvasBlock(contract, blockId);
  const editable = block.placement?.parentId === 'home.equipment-status'
    && block.stableIdentity?.source === 'operator-collection-id'
    && block.capabilities.includes(CAPABILITY.MOVE_ITEM);
  if (!editable) {
    return Object.freeze({
      editable: false,
      blockId: block.id,
      itemId: block.stableIdentity?.value || null,
      index: null,
      count: null,
      canMoveUp: false,
      canMoveDown: false,
      destinations: Object.freeze([]),
    });
  }
  const parent = findVenueCanvasBlock(contract, block.placement.parentId);
  const index = parent.children.findIndex((entry) => entry.id === block.id);
  if (index < 0) throw new TypeError('Movable Canvas item is outside its parent collection');
  const siblingsWithoutSelected = parent.children.filter((entry) => entry.id !== block.id);
  const destinations = Object.freeze(parent.children.map((_entry, targetIndex) => {
    const before = targetIndex === parent.children.length - 1
      ? null
      : siblingsWithoutSelected[targetIndex];
    return Object.freeze({
      position: targetIndex + 1,
      current: targetIndex === index,
      value: before ? before.id : COLLECTION_END_DESTINATION,
      beforeBlockId: before?.id || null,
    });
  }));
  const commandTo = (destination) => {
    const target = destinations.find((entry) => entry.value === destination);
    if (!target) throw new TypeError('Canvas move destination is unavailable');
    if (target.current) throw new TypeError('Canvas move destination is already current');
    return createMoveItemCommand({ blockId: block.id, beforeBlockId: target.beforeBlockId });
  };
  const moveCommand = (direction) => {
    if (!['up', 'down'].includes(direction)) throw new TypeError('Canvas move direction must be up or down');
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0) throw new TypeError('Canvas item is already first');
    if (targetIndex >= parent.children.length) throw new TypeError('Canvas item is already last');
    return commandTo(destinations[targetIndex].value);
  };
  return Object.freeze({
    editable: true,
    blockId: block.id,
    itemId: block.stableIdentity.value,
    index,
    count: parent.children.length,
    canMoveUp: index > 0,
    canMoveDown: index < parent.children.length - 1,
    destinations,
    command: moveCommand,
    commandTo,
  });
}

function previewCanvasSourceCommandWithInverse(sourceInput, commandInput) {
  const source = createDeploymentAgnosticVenueSource(sourceInput);
  const command = parseVenueCanvasCommand(commandInput);
  let forwardCommand;
  if (command.type === COMMAND_TYPE.SET_FIELD) {
    const field = canvasTextField(source, command.blockId, command.fieldId);
    if (!field.editable || !(typeof command.value === 'string' || (command.value === null && !field.required))) {
      throw new TypeError('Text field preview denied');
    }
    const value = !field.required && command.value === '' ? null : command.value;
    forwardCommand = createSetFieldCommand({ ...command, value });
  } else if (command.type === COMMAND_TYPE.MOVE_ITEM) {
    const move = canvasMoveItem(source, command.blockId);
    if (!move.editable) throw new TypeError('Canvas item move denied');
    const allowed = move.destinations
      .filter((destination) => !destination.current)
      .map((destination) => move.commandTo(destination.value));
    if (!allowed.some((candidate) => JSON.stringify(candidate) === JSON.stringify(command))) {
      throw new TypeError('Canvas item move is outside the current stable destination set');
    }
    forwardCommand = command;
  } else if (command.type === COMMAND_TYPE.INSERT_ITEM) {
    const collection = canvasEquipmentCollection(source, command.blockId);
    if (!collection.canAdd) throw new TypeError('Canvas equipment collection is full');
    forwardCommand = command;
  } else if (command.type === COMMAND_TYPE.REMOVE_ITEM) {
    const item = canvasMoveItem(source, command.blockId);
    if (!item.editable) throw new TypeError('Canvas equipment removal denied');
    forwardCommand = command;
  } else {
    throw new TypeError('Canvas preview command type is unsupported');
  }
  const applied = applyVenueCanvasCommand(commandDocument(source), forwardCommand);
  return Object.freeze({
    source: applyOrdinaryOperatorSourceEdit(source, extractDeploymentAgnosticVenueSource(applied.document)),
    forwardCommand,
    inverseCommand: applied.inverseCommand,
  });
}

function previewCanvasSourceFieldWithInverse(sourceInput, commandInput) {
  const command = parseVenueCanvasCommand(commandInput);
  if (command.type !== COMMAND_TYPE.SET_FIELD) throw new TypeError('Only text field preview is supported');
  return previewCanvasSourceCommandWithInverse(sourceInput, command);
}

function previewCanvasSourceField(sourceInput, commandInput) {
  return previewCanvasSourceFieldWithInverse(sourceInput, commandInput).source;
}

module.exports = {
  EQUIPMENT_COLLECTION,
  canvasEquipmentCollection,
  COLLECTION_END_DESTINATION,
  canvasMoveItem,
  canvasTextField,
  previewCanvasSourceCommandWithInverse,
  previewCanvasSourceField,
  previewCanvasSourceFieldWithInverse,
};
