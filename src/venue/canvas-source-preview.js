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
    });
  }
  const parent = findVenueCanvasBlock(contract, block.placement.parentId);
  const index = parent.children.findIndex((entry) => entry.id === block.id);
  if (index < 0) throw new TypeError('Movable Canvas item is outside its parent collection');
  const moveCommand = (direction) => {
    if (!['up', 'down'].includes(direction)) throw new TypeError('Canvas move direction must be up or down');
    if (direction === 'up') {
      if (index === 0) throw new TypeError('Canvas item is already first');
      return createMoveItemCommand({ blockId: block.id, beforeBlockId: parent.children[index - 1].id });
    }
    if (index === parent.children.length - 1) throw new TypeError('Canvas item is already last');
    return createMoveItemCommand({ blockId: block.id, beforeBlockId: parent.children[index + 2]?.id || null });
  };
  return Object.freeze({
    editable: true,
    blockId: block.id,
    itemId: block.stableIdentity.value,
    index,
    count: parent.children.length,
    canMoveUp: index > 0,
    canMoveDown: index < parent.children.length - 1,
    command: moveCommand,
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
    const allowed = [];
    if (move.canMoveUp) allowed.push(move.command('up'));
    if (move.canMoveDown) allowed.push(move.command('down'));
    if (!allowed.some((candidate) => JSON.stringify(candidate) === JSON.stringify(command))) {
      throw new TypeError('Only one-step Canvas item moves are supported');
    }
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
  canvasMoveItem,
  canvasTextField,
  previewCanvasSourceCommandWithInverse,
  previewCanvasSourceField,
  previewCanvasSourceFieldWithInverse,
};
