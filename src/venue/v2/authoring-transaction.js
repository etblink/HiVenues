'use strict';

const {
  OWNERSHIP,
  createV2DeploymentAgnosticVenueSource,
  createV2SemanticCanvasProjection,
  deriveV2DeploymentAgnosticVenueSourceDigest,
  listV2CanvasNodes,
  pathOwnership,
  serializeV2DeploymentAgnosticVenueSource,
} = require('./source');

const V2_AUTHORING_COMMAND_SCHEMA_VERSION = 1;
const V2_AUTHORING_SESSION_SCHEMA_VERSION = 1;
const V2_AUTHORING_PROPOSAL_SCHEMA_VERSION = 1;
const V2_AUTHORING_HISTORY_SCHEMA_VERSION = 1;
const SET_FIELD = 'SET_FIELD';
const MOVE_COMPONENT = 'MOVE_COMPONENT';
const BEFORE_COMPONENT = 'BEFORE_COMPONENT';
const END_OF_PAGE = 'END_OF_PAGE';
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

class V2AuthoringTransactionError extends Error {
  constructor(message) {
    super(`HiVenues v2 authoring transaction error: ${message}`);
    this.name = 'V2AuthoringTransactionError';
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function plainRecord(value, label, allowedKeys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new V2AuthoringTransactionError(`${label} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new V2AuthoringTransactionError(`${label} must be a plain object`);
  }

  const result = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || DANGEROUS_KEYS.has(key) || !allowedKeys.has(key)) {
      throw new V2AuthoringTransactionError(`${label} contains unsupported keys`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new V2AuthoringTransactionError(`${label} fields must be enumerable scalar data`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function scalarString(value, label, { max = 1200 } = {}) {
  if (typeof value !== 'string') {
    throw new V2AuthoringTransactionError(`${label} must be a string`);
  }
  if (value.length === 0 || value.length > max || value.includes('\0')) {
    throw new V2AuthoringTransactionError(`${label} is outside the bounded scalar-text contract`);
  }
  return value;
}

function digest(value, label) {
  if (typeof value !== 'string' || !DIGEST_PATTERN.test(value)) {
    throw new V2AuthoringTransactionError(`${label} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function parseTarget(value) {
  const target = plainRecord(value, 'target', new Set(['nodeId', 'fieldId']));
  return {
    nodeId: scalarString(target.nodeId, 'target.nodeId', { max: 200 }),
    fieldId: scalarString(target.fieldId, 'target.fieldId', { max: 100 }),
  };
}

function parseSetFieldCommand(value) {
  const command = plainRecord(
    value,
    'command',
    new Set(['schemaVersion', 'type', 'target', 'payload', 'expectedDraftDigest']),
  );
  if (command.schemaVersion !== V2_AUTHORING_COMMAND_SCHEMA_VERSION) {
    throw new V2AuthoringTransactionError('unsupported command schema version');
  }
  if (command.type !== SET_FIELD) {
    throw new V2AuthoringTransactionError('unsupported command type');
  }
  const payload = plainRecord(command.payload, 'payload', new Set(['value']));
  return {
    schemaVersion: V2_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: SET_FIELD,
    target: parseTarget(command.target),
    payload: {
      value: scalarString(payload.value, 'payload.value'),
    },
    expectedDraftDigest: digest(command.expectedDraftDigest, 'expectedDraftDigest'),
  };
}

function parseComponentTarget(value) {
  const target = plainRecord(value, 'target', new Set(['nodeId']));
  return {
    nodeId: scalarString(target.nodeId, 'target.nodeId', { max: 200 }),
  };
}

function parseMoveDestination(value) {
  const destination = plainRecord(
    value,
    'destination',
    new Set(['kind', 'beforeComponentId']),
  );
  if (destination.kind === BEFORE_COMPONENT) {
    return {
      kind: BEFORE_COMPONENT,
      beforeComponentId: scalarString(
        destination.beforeComponentId,
        'destination.beforeComponentId',
        { max: 80 },
      ),
    };
  }
  if (destination.kind === END_OF_PAGE) {
    if (Object.hasOwn(destination, 'beforeComponentId')) {
      throw new V2AuthoringTransactionError(
        'END_OF_PAGE destination cannot include beforeComponentId',
      );
    }
    return { kind: END_OF_PAGE };
  }
  throw new V2AuthoringTransactionError('unsupported component destination');
}

function parseMoveComponentCommand(value) {
  const command = plainRecord(
    value,
    'command',
    new Set(['schemaVersion', 'type', 'target', 'destination', 'expectedDraftDigest']),
  );
  if (command.schemaVersion !== V2_AUTHORING_COMMAND_SCHEMA_VERSION) {
    throw new V2AuthoringTransactionError('unsupported command schema version');
  }
  if (command.type !== MOVE_COMPONENT) {
    throw new V2AuthoringTransactionError('unsupported command type');
  }
  return {
    schemaVersion: V2_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: MOVE_COMPONENT,
    target: parseComponentTarget(command.target),
    destination: parseMoveDestination(command.destination),
    expectedDraftDigest: digest(command.expectedDraftDigest, 'expectedDraftDigest'),
  };
}

function parseAuthoringCommand(value) {
  const command = plainRecord(
    value,
    'command',
    new Set([
      'schemaVersion',
      'type',
      'target',
      'payload',
      'destination',
      'expectedDraftDigest',
    ]),
  );
  if (command.type === SET_FIELD) return parseSetFieldCommand(value);
  if (command.type === MOVE_COMPONENT) return parseMoveComponentCommand(value);
  throw new V2AuthoringTransactionError('unsupported command type');
}

function componentMatches(source, componentId) {
  const matches = [];
  source.site.pages.forEach((page, pageIndex) => {
    page.components.forEach((component, componentIndex) => {
      if (component.id === componentId) {
        matches.push({ page, pageIndex, component, componentIndex });
      }
    });
  });
  return matches;
}

function resolveTarget(sourceInput, targetInput) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const target = parseTarget(targetInput);
  const projection = createV2SemanticCanvasProjection(source);
  const node = listV2CanvasNodes(projection).find((candidate) => candidate.id === target.nodeId);
  if (!node) throw new V2AuthoringTransactionError('stable target does not exist');

  if (node.stableIdentity?.type === 'page-id') {
    if (target.fieldId !== 'title') {
      throw new V2AuthoringTransactionError('first SET_FIELD slice allows only page title at page scope');
    }
    const pageIndex = source.site.pages.findIndex((page) => page.id === node.stableIdentity.value);
    if (pageIndex < 0) throw new V2AuthoringTransactionError('stable page target does not exist');
    const pointer = `/site/pages/${pageIndex}/title`;
    const ownership = pathOwnership(pointer);
    if (ownership !== OWNERSHIP.OPERATOR_AUTHORED) {
      throw new V2AuthoringTransactionError('target field is not ordinary operator-authored content');
    }
    return deepFreeze({
      targetType: 'page-title',
      pageId: node.stableIdentity.value,
      componentId: null,
      fieldId: target.fieldId,
      pageIndex,
      componentIndex: null,
      pointer,
      ownership,
      currentValue: source.site.pages[pageIndex].title,
    });
  }

  if (node.stableIdentity?.type !== 'component-id') {
    throw new V2AuthoringTransactionError('first SET_FIELD slice allows only page/component text fields');
  }
  if (!node.fields.some((field) => field.fieldId === target.fieldId)) {
    throw new V2AuthoringTransactionError('field does not belong to stable target');
  }

  const matches = componentMatches(source, node.stableIdentity.value);
  if (matches.length !== 1) {
    throw new V2AuthoringTransactionError('component stable identity is ambiguous or missing');
  }
  const match = matches[0];
  if (!Object.hasOwn(match.component.content, target.fieldId)) {
    throw new V2AuthoringTransactionError('field does not belong to component content');
  }
  const currentValue = match.component.content[target.fieldId];
  if (typeof currentValue !== 'string') {
    throw new V2AuthoringTransactionError('first SET_FIELD slice allows only existing scalar string fields');
  }

  const pointer =
    `/site/pages/${match.pageIndex}/components/${match.componentIndex}/content/${target.fieldId}`;
  const ownership = pathOwnership(pointer);
  if (ownership !== OWNERSHIP.OPERATOR_AUTHORED) {
    throw new V2AuthoringTransactionError('target field is not ordinary operator-authored content');
  }

  return deepFreeze({
    targetType: 'component-content',
    pageId: match.page.id,
    componentId: match.component.id,
    fieldId: target.fieldId,
    pageIndex: match.pageIndex,
    componentIndex: match.componentIndex,
    pointer,
    ownership,
    currentValue,
  });
}

function targetValue(source, resolved) {
  if (resolved.targetType === 'page-title') {
    return source.site.pages[resolved.pageIndex].title;
  }
  return source.site.pages[resolved.pageIndex]
    .components[resolved.componentIndex]
    .content[resolved.fieldId];
}

function withTargetValue(source, resolved, value) {
  const candidate = clone(source);
  if (resolved.targetType === 'page-title') {
    candidate.site.pages[resolved.pageIndex].title = value;
  } else {
    candidate.site.pages[resolved.pageIndex]
      .components[resolved.componentIndex]
      .content[resolved.fieldId] = value;
  }
  return createV2DeploymentAgnosticVenueSource(candidate);
}

function resolveComponentMove(sourceInput, targetInput, destinationInput) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const target = parseComponentTarget(targetInput);
  const destination = parseMoveDestination(destinationInput);
  const projection = createV2SemanticCanvasProjection(source);
  const node = listV2CanvasNodes(projection).find((candidate) => candidate.id === target.nodeId);
  if (!node || node.stableIdentity?.type !== 'component-id') {
    throw new V2AuthoringTransactionError('stable component target does not exist');
  }

  const matches = componentMatches(source, node.stableIdentity.value);
  if (matches.length !== 1) {
    throw new V2AuthoringTransactionError('component stable identity is ambiguous or missing');
  }
  const match = matches[0];
  const collectionPointer = `/site/pages/${match.pageIndex}/components`;
  const ownership = pathOwnership(collectionPointer);
  if (ownership !== OWNERSHIP.OPERATOR_AUTHORED_COLLECTION) {
    throw new V2AuthoringTransactionError('component collection is not operator-authored');
  }

  const pageComponentIds = match.page.components.map((component) => component.id);
  if (destination.kind === BEFORE_COMPONENT) {
    if (destination.beforeComponentId === match.component.id) {
      throw new V2AuthoringTransactionError('component cannot move before itself');
    }
    const destinationMatches = componentMatches(source, destination.beforeComponentId);
    if (destinationMatches.length === 0) {
      throw new V2AuthoringTransactionError('stable destination component does not exist');
    }
    if (destinationMatches.length !== 1) {
      throw new V2AuthoringTransactionError('destination component identity is ambiguous');
    }
    if (destinationMatches[0].page.id !== match.page.id) {
      throw new V2AuthoringTransactionError('cross-page component movement is not authorized');
    }
  }

  const inverseDestination = match.componentIndex === pageComponentIds.length - 1
    ? { kind: END_OF_PAGE }
    : {
        kind: BEFORE_COMPONENT,
        beforeComponentId: pageComponentIds[match.componentIndex + 1],
      };

  return deepFreeze({
    targetNodeId: target.nodeId,
    pageId: match.page.id,
    pageIndex: match.pageIndex,
    componentId: match.component.id,
    componentIndex: match.componentIndex,
    collectionPointer,
    ownership,
    destination,
    inverseDestination,
    beforeOrder: pageComponentIds,
  });
}

function listV2ComponentMoveDestinations(sourceInput, targetInput) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const target = parseComponentTarget(targetInput);
  const projection = createV2SemanticCanvasProjection(source);
  const node = listV2CanvasNodes(projection).find((candidate) => candidate.id === target.nodeId);
  if (!node || node.stableIdentity?.type !== 'component-id') {
    throw new V2AuthoringTransactionError('stable component target does not exist');
  }
  const matches = componentMatches(source, node.stableIdentity.value);
  if (matches.length !== 1) {
    throw new V2AuthoringTransactionError('component stable identity is ambiguous or missing');
  }
  const match = matches[0];
  const collectionPointer = `/site/pages/${match.pageIndex}/components`;
  const ownership = pathOwnership(collectionPointer);
  if (ownership !== OWNERSHIP.OPERATOR_AUTHORED_COLLECTION) {
    throw new V2AuthoringTransactionError('component collection is not operator-authored');
  }

  const components = match.page.components;
  const destinations = [];
  for (let index = 0; index < components.length; index += 1) {
    const sibling = components[index];
    if (sibling.id === match.component.id) continue;
    if (index === match.componentIndex + 1) continue;
    destinations.push({
      kind: BEFORE_COMPONENT,
      beforeComponentId: sibling.id,
    });
  }
  if (match.componentIndex !== components.length - 1) {
    destinations.push({ kind: END_OF_PAGE });
  }

  return deepFreeze({
    pageId: match.page.id,
    componentId: match.component.id,
    position: match.componentIndex + 1,
    count: components.length,
    ownership,
    collectionPointer,
    destinations,
  });
}

function withComponentMove(sourceInput, resolved) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const candidate = clone(source);
  const components = candidate.site.pages[resolved.pageIndex].components;
  const targetIndex = components.findIndex((component) => component.id === resolved.componentId);
  if (targetIndex < 0) {
    throw new V2AuthoringTransactionError('stable component target no longer exists');
  }

  const [component] = components.splice(targetIndex, 1);
  if (resolved.destination.kind === END_OF_PAGE) {
    components.push(component);
  } else {
    const destinationIndex = components.findIndex(
      (candidateComponent) => candidateComponent.id === resolved.destination.beforeComponentId,
    );
    if (destinationIndex < 0) {
      throw new V2AuthoringTransactionError('stable destination component no longer exists');
    }
    components.splice(destinationIndex, 0, component);
  }

  const afterOrder = components.map((candidateComponent) => candidateComponent.id);
  if (afterOrder.every((id, index) => id === resolved.beforeOrder[index])) {
    throw new V2AuthoringTransactionError('component move is a no-op');
  }
  return createV2DeploymentAgnosticVenueSource(candidate);
}

function commandTransition(sourceInput, commandInput) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const command = parseAuthoringCommand(commandInput);
  const beforeDigest = deriveV2DeploymentAgnosticVenueSourceDigest(source);
  if (command.expectedDraftDigest !== beforeDigest) {
    throw new V2AuthoringTransactionError('stale expected draft digest');
  }

  if (command.type === SET_FIELD) {
    const resolved = resolveTarget(source, command.target);
    const afterSource = withTargetValue(source, resolved, command.payload.value);
    const normalizedValue = targetValue(afterSource, resolved);
    const afterDigest = deriveV2DeploymentAgnosticVenueSourceDigest(afterSource);
    const validatedCommand = deepFreeze({
      ...command,
      target: { ...command.target },
      payload: { value: normalizedValue },
    });
    const inverseCommand = deepFreeze({
      schemaVersion: V2_AUTHORING_COMMAND_SCHEMA_VERSION,
      type: SET_FIELD,
      target: { ...validatedCommand.target },
      payload: { value: resolved.currentValue },
      expectedDraftDigest: afterDigest,
    });
    return deepFreeze({
      command: validatedCommand,
      inverseCommand,
      beforeDigest,
      afterDigest,
      afterSource,
      resolvedTarget: {
        nodeId: validatedCommand.target.nodeId,
        fieldId: validatedCommand.target.fieldId,
        pageId: resolved.pageId,
        componentId: resolved.componentId,
        sourcePointer: resolved.pointer,
        ownership: resolved.ownership,
      },
    });
  }

  const resolved = resolveComponentMove(source, command.target, command.destination);
  const afterSource = withComponentMove(source, resolved);
  const afterDigest = deriveV2DeploymentAgnosticVenueSourceDigest(afterSource);
  const validatedCommand = deepFreeze({
    ...command,
    target: { ...command.target },
    destination: { ...command.destination },
  });
  const inverseCommand = deepFreeze({
    schemaVersion: V2_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: MOVE_COMPONENT,
    target: { ...validatedCommand.target },
    destination: { ...resolved.inverseDestination },
    expectedDraftDigest: afterDigest,
  });
  return deepFreeze({
    command: validatedCommand,
    inverseCommand,
    beforeDigest,
    afterDigest,
    afterSource,
    resolvedTarget: {
      nodeId: validatedCommand.target.nodeId,
      fieldId: null,
      pageId: resolved.pageId,
      componentId: resolved.componentId,
      sourcePointer: resolved.collectionPointer,
      ownership: resolved.ownership,
      destination: { ...resolved.destination },
    },
  });
}

function validateHistoryEntry(entryInput, expectedBeforeDigest) {
  const entry = plainRecord(
    entryInput,
    'history entry',
    new Set([
      'kind',
      'schemaVersion',
      'command',
      'inverseCommand',
      'beforeDigest',
      'afterDigest',
      'beforeSource',
      'afterSource',
    ]),
  );
  if (entry.kind !== 'hivenues-v2-authoring-history-entry') {
    throw new V2AuthoringTransactionError('history entry kind is invalid');
  }
  if (entry.schemaVersion !== V2_AUTHORING_HISTORY_SCHEMA_VERSION) {
    throw new V2AuthoringTransactionError('history entry schema version is invalid');
  }

  const beforeSource = createV2DeploymentAgnosticVenueSource(entry.beforeSource);
  const afterSource = createV2DeploymentAgnosticVenueSource(entry.afterSource);
  const beforeDigest = deriveV2DeploymentAgnosticVenueSourceDigest(beforeSource);
  const afterDigest = deriveV2DeploymentAgnosticVenueSourceDigest(afterSource);
  if (entry.beforeDigest !== beforeDigest || entry.afterDigest !== afterDigest) {
    throw new V2AuthoringTransactionError('history entry source/digest binding is invalid');
  }
  if (beforeDigest !== expectedBeforeDigest) {
    throw new V2AuthoringTransactionError('history chain continuity is invalid');
  }

  const forward = commandTransition(beforeSource, entry.command);
  if (forward.beforeDigest !== beforeDigest || forward.afterDigest !== afterDigest) {
    throw new V2AuthoringTransactionError('history command digest binding is invalid');
  }
  if (
    serializeV2DeploymentAgnosticVenueSource(forward.afterSource)
    !== serializeV2DeploymentAgnosticVenueSource(afterSource)
  ) {
    throw new V2AuthoringTransactionError('history command/source binding is invalid');
  }

  const inverse = commandTransition(afterSource, entry.inverseCommand);
  if (
    inverse.afterDigest !== beforeDigest
    || serializeV2DeploymentAgnosticVenueSource(inverse.afterSource)
      !== serializeV2DeploymentAgnosticVenueSource(beforeSource)
  ) {
    throw new V2AuthoringTransactionError('history inverse command/source binding is invalid');
  }

  return deepFreeze({
    kind: 'hivenues-v2-authoring-history-entry',
    schemaVersion: V2_AUTHORING_HISTORY_SCHEMA_VERSION,
    command: forward.command,
    inverseCommand: inverse.command,
    beforeDigest,
    afterDigest,
    beforeSource,
    afterSource,
  });
}

function validateHistory(historyInput, baselineDigest) {
  if (!Array.isArray(historyInput)) {
    throw new V2AuthoringTransactionError('history must be an array');
  }
  const result = [];
  let expectedBeforeDigest = baselineDigest;
  for (const entryInput of historyInput) {
    const entry = validateHistoryEntry(entryInput, expectedBeforeDigest);
    result.push(entry);
    expectedBeforeDigest = entry.afterDigest;
  }
  return result;
}

function makeSession({ baselineSource, draftSource, history, historyIndex }) {
  const baseline = createV2DeploymentAgnosticVenueSource(baselineSource);
  const draft = createV2DeploymentAgnosticVenueSource(draftSource);
  const baselineDigest = deriveV2DeploymentAgnosticVenueSourceDigest(baseline);
  const draftDigest = deriveV2DeploymentAgnosticVenueSourceDigest(draft);
  const validatedHistory = validateHistory(history, baselineDigest);
  if (
    !Number.isInteger(historyIndex)
    || historyIndex < 0
    || historyIndex > validatedHistory.length
  ) {
    throw new V2AuthoringTransactionError('history index is invalid');
  }

  const expectedDraftDigest = historyIndex === 0
    ? baselineDigest
    : validatedHistory[historyIndex - 1].afterDigest;
  if (draftDigest !== expectedDraftDigest) {
    throw new V2AuthoringTransactionError('accepted draft is not bound to history position');
  }

  return deepFreeze({
    kind: 'hivenues-v2-authoring-session',
    schemaVersion: V2_AUTHORING_SESSION_SCHEMA_VERSION,
    baselineSource: baseline,
    baselineDigest,
    draftSource: draft,
    draftDigest,
    history: validatedHistory,
    historyIndex,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < validatedHistory.length,
    authority: {
      persistent: false,
      runtimeWired: false,
      externalEffects: false,
      publishable: false,
    },
  });
}

function assertSession(value) {
  if (!value || typeof value !== 'object' || value.kind !== 'hivenues-v2-authoring-session') {
    throw new V2AuthoringTransactionError('authoring session is invalid');
  }
  if (value.schemaVersion !== V2_AUTHORING_SESSION_SCHEMA_VERSION) {
    throw new V2AuthoringTransactionError('authoring session schema version is invalid');
  }
  const session = makeSession({
    baselineSource: value.baselineSource,
    draftSource: value.draftSource,
    history: value.history,
    historyIndex: value.historyIndex,
  });
  if (session.baselineDigest !== value.baselineDigest || session.draftDigest !== value.draftDigest) {
    throw new V2AuthoringTransactionError('authoring session digest binding is invalid');
  }
  return session;
}

function createV2AuthoringSession(sourceInput) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  return makeSession({
    baselineSource: source,
    draftSource: source,
    history: [],
    historyIndex: 0,
  });
}

function proposeV2AuthoringCommand(sessionInput, commandInput) {
  const session = assertSession(sessionInput);
  const transition = commandTransition(session.draftSource, commandInput);

  return deepFreeze({
    kind: 'hivenues-v2-authoring-proposal',
    schemaVersion: V2_AUTHORING_PROPOSAL_SCHEMA_VERSION,
    status: 'PREVIEW_NOT_APPLIED',
    beforeDigest: transition.beforeDigest,
    afterDigest: transition.afterDigest,
    command: transition.command,
    inverseCommand: transition.inverseCommand,
    resolvedTarget: transition.resolvedTarget,
    previewSource: transition.afterSource,
    authority: {
      acceptedDraftChanged: false,
      persistent: false,
      externalEffects: false,
    },
  });
}

function proposeV2SetField(sessionInput, commandInput) {
  const proposal = proposeV2AuthoringCommand(sessionInput, commandInput);
  if (proposal.command.type !== SET_FIELD) {
    throw new V2AuthoringTransactionError('SET_FIELD proposal requires SET_FIELD command');
  }
  return proposal;
}

function proposeV2MoveComponent(sessionInput, commandInput) {
  const proposal = proposeV2AuthoringCommand(sessionInput, commandInput);
  if (proposal.command.type !== MOVE_COMPONENT) {
    throw new V2AuthoringTransactionError('MOVE_COMPONENT proposal requires MOVE_COMPONENT command');
  }
  return proposal;
}

function verifyProposal(session, value) {
  if (!value || typeof value !== 'object'
    || value.kind !== 'hivenues-v2-authoring-proposal'
    || value.schemaVersion !== V2_AUTHORING_PROPOSAL_SCHEMA_VERSION
    || value.status !== 'PREVIEW_NOT_APPLIED') {
    throw new V2AuthoringTransactionError('proposal is invalid');
  }

  const rebuilt = proposeV2AuthoringCommand(session, value.command);
  if (
    rebuilt.beforeDigest !== value.beforeDigest
    || rebuilt.afterDigest !== value.afterDigest
    || serializeV2DeploymentAgnosticVenueSource(rebuilt.previewSource)
      !== serializeV2DeploymentAgnosticVenueSource(value.previewSource)
  ) {
    throw new V2AuthoringTransactionError('proposal source/digest binding is invalid');
  }
  if (JSON.stringify(rebuilt.inverseCommand) !== JSON.stringify(value.inverseCommand)) {
    throw new V2AuthoringTransactionError('proposal inverse binding is invalid');
  }
  return rebuilt;
}

function applyV2AuthoringProposal(sessionInput, proposalInput) {
  const session = assertSession(sessionInput);
  const proposal = verifyProposal(session, proposalInput);
  const retainedHistory = session.history.slice(0, session.historyIndex);
  const entry = deepFreeze({
    kind: 'hivenues-v2-authoring-history-entry',
    schemaVersion: V2_AUTHORING_HISTORY_SCHEMA_VERSION,
    command: proposal.command,
    inverseCommand: proposal.inverseCommand,
    beforeDigest: session.draftDigest,
    afterDigest: proposal.afterDigest,
    beforeSource: session.draftSource,
    afterSource: proposal.previewSource,
  });
  retainedHistory.push(entry);

  return makeSession({
    baselineSource: session.baselineSource,
    draftSource: proposal.previewSource,
    history: retainedHistory,
    historyIndex: retainedHistory.length,
  });
}

function discardV2AuthoringProposal(sessionInput, proposalInput) {
  const session = assertSession(sessionInput);
  verifyProposal(session, proposalInput);
  return session;
}

function undoV2AuthoringSession(sessionInput) {
  const session = assertSession(sessionInput);
  if (!session.canUndo) throw new V2AuthoringTransactionError('nothing to undo');
  const entry = session.history[session.historyIndex - 1];
  if (entry.afterDigest !== session.draftDigest) {
    throw new V2AuthoringTransactionError('undo history no longer matches accepted draft');
  }
  return makeSession({
    baselineSource: session.baselineSource,
    draftSource: entry.beforeSource,
    history: session.history,
    historyIndex: session.historyIndex - 1,
  });
}

function redoV2AuthoringSession(sessionInput) {
  const session = assertSession(sessionInput);
  if (!session.canRedo) throw new V2AuthoringTransactionError('nothing to redo');
  const entry = session.history[session.historyIndex];
  if (entry.beforeDigest !== session.draftDigest) {
    throw new V2AuthoringTransactionError('redo history no longer matches accepted draft');
  }
  return makeSession({
    baselineSource: session.baselineSource,
    draftSource: entry.afterSource,
    history: session.history,
    historyIndex: session.historyIndex + 1,
  });
}

module.exports = {
  BEFORE_COMPONENT,
  END_OF_PAGE,
  MOVE_COMPONENT,
  SET_FIELD,
  V2_AUTHORING_COMMAND_SCHEMA_VERSION,
  V2_AUTHORING_HISTORY_SCHEMA_VERSION,
  V2_AUTHORING_PROPOSAL_SCHEMA_VERSION,
  V2_AUTHORING_SESSION_SCHEMA_VERSION,
  V2AuthoringTransactionError,
  applyV2AuthoringProposal,
  createV2AuthoringSession,
  discardV2AuthoringProposal,
  listV2ComponentMoveDestinations,
  proposeV2AuthoringCommand,
  proposeV2MoveComponent,
  proposeV2SetField,
  redoV2AuthoringSession,
  resolveV2AuthoringTarget: resolveTarget,
  resolveV2ComponentMove: resolveComponentMove,
  undoV2AuthoringSession,
};
