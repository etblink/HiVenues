'use strict';

const { createDeploymentAgnosticVenueSource, extractDeploymentAgnosticVenueSource } = require('./source');
const { applyOrdinaryOperatorSourceEdit, buildVenueSourceOwnershipMap } = require('./source-authoring');
const { OWNERSHIP } = require('./authoring');
const { createSemanticVenueCanvasContract, findVenueCanvasBlock, parseVenueCanvasCommand, createSetFieldCommand, applyVenueCanvasCommand } = require('./semantic-venue-canvas-contract');

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

function previewCanvasSourceField(sourceInput, commandInput) {
  const source = createDeploymentAgnosticVenueSource(sourceInput);
  const command = parseVenueCanvasCommand(commandInput);
  if (command.type !== 'set-field') throw new TypeError('Only text field preview is supported');
  const field = canvasTextField(source, command.blockId, command.fieldId);
  if (!field.editable || !(typeof command.value === 'string' || (command.value === null && !field.required))) {
    throw new TypeError('Text field preview denied');
  }
  const value = !field.required && command.value === '' ? null : command.value;
  const applied = applyVenueCanvasCommand(commandDocument(source), createSetFieldCommand({ ...command, value }));
  return applyOrdinaryOperatorSourceEdit(source, extractDeploymentAgnosticVenueSource(applied.document));
}

module.exports = { canvasTextField, previewCanvasSourceField };
