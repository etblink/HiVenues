'use strict';

const {
  MAX_MANAGED_IMAGE_BYTES,
  deriveManagedImage,
} = require('../managed-assets');

const {
  DENSITY_RECIPE_IDS,
  OWNERSHIP,
  SHAPE_RECIPE_IDS,
  SURFACE_RECIPE_IDS,
  TYPOGRAPHY_RECIPE_IDS,
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
const SET_THEME_RECIPE = 'SET_THEME_RECIPE';
const SET_MEDIA_USAGE_ASSET = 'SET_MEDIA_USAGE_ASSET';
const IMPORT_LOCAL_HERO_MEDIA = 'IMPORT_LOCAL_HERO_MEDIA';
const RESTORE_IMPORTED_HERO_MEDIA = 'RESTORE_IMPORTED_HERO_MEDIA';
const MOVE_COMPONENT = 'MOVE_COMPONENT';
const ADD_COMPONENT = 'ADD_COMPONENT';
const REMOVE_COMPONENT = 'REMOVE_COMPONENT';
const RESTORE_COMPONENT = 'RESTORE_COMPONENT';
const BEFORE_COMPONENT = 'BEFORE_COMPONENT';
const END_OF_PAGE = 'END_OF_PAGE';
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const V2_GLOBAL_THEME_TARGET = 'theme:global';
const V2_HERO_MEDIA_SLOT = 'hero-media';
const MAX_IMAGE_BASE64_CHARS = Math.ceil(MAX_MANAGED_IMAGE_BYTES / 3) * 4;
const V2_THEME_RECIPE_DIMENSIONS = deepFreeze({
  typographyRecipeId: {
    id: 'typographyRecipeId',
    label: 'Typography',
    values: [...TYPOGRAPHY_RECIPE_IDS],
  },
  densityRecipeId: {
    id: 'densityRecipeId',
    label: 'Density',
    values: [...DENSITY_RECIPE_IDS],
  },
  shapeRecipeId: {
    id: 'shapeRecipeId',
    label: 'Shape',
    values: [...SHAPE_RECIPE_IDS],
  },
  surfaceRecipeId: {
    id: 'surfaceRecipeId',
    label: 'Surface',
    values: [...SURFACE_RECIPE_IDS],
  },
});

const V2_COMPONENT_CATALOG = deepFreeze({
  'story-intro': {
    id: 'story-intro',
    label: 'Story / Intro',
    kind: 'editorial-intro',
    recipeId: 'intro-legacy-v1',
    content: {
      kicker: null,
      heading: 'Tell your story',
      body: 'Add the details that help guests understand this place.',
      note: null,
    },
    responsive: { tablet: {}, mobile: {} },
  },
  'hours-location': {
    id: 'hours-location',
    label: 'Hours & Location',
    kind: 'hours-location',
    recipeId: 'hours-location-standard',
    content: {
      kicker: null,
      heading: 'Hours & location',
      body: 'Add hours, address, and arrival details for your guests.',
      note: null,
    },
    responsive: { tablet: {}, mobile: {} },
  },
  'contact-visit': {
    id: 'contact-visit',
    label: 'Contact / Visit',
    kind: 'contact-visit',
    recipeId: 'visit-legacy-v1',
    content: {
      kicker: null,
      heading: 'Plan your visit',
      body: 'Add contact details and anything guests should know before arriving.',
      note: null,
    },
    responsive: { tablet: {}, mobile: {} },
  },
});

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

function plainJsonData(value, label) {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => plainJsonData(item, `${label}[${index}]`));
  }
  if (!value || typeof value !== 'object') {
    throw new V2AuthoringTransactionError(`${label} must contain only plain JSON data`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new V2AuthoringTransactionError(`${label} must contain only plain JSON objects`);
  }
  const result = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || DANGEROUS_KEYS.has(key)) {
      throw new V2AuthoringTransactionError(`${label} contains unsafe keys`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new V2AuthoringTransactionError(`${label} fields must be enumerable data`);
    }
    result[key] = plainJsonData(descriptor.value, `${label}.${key}`);
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

function parseThemeTarget(value) {
  const target = plainRecord(value, 'target', new Set(['nodeId']));
  const nodeId = scalarString(target.nodeId, 'target.nodeId', { max: 80 });
  if (nodeId !== V2_GLOBAL_THEME_TARGET) {
    throw new V2AuthoringTransactionError('global theme target is invalid');
  }
  return { nodeId };
}

function themeDimension(value) {
  const id = scalarString(value, 'dimension', { max: 80 });
  const definition = V2_THEME_RECIPE_DIMENSIONS[id];
  if (!definition) throw new V2AuthoringTransactionError('unsupported theme recipe dimension');
  return definition;
}

function parseSetThemeRecipeCommand(value) {
  const command = plainRecord(
    value,
    'command',
    new Set(['schemaVersion', 'type', 'target', 'dimension', 'recipeId', 'expectedDraftDigest']),
  );
  if (command.schemaVersion !== V2_AUTHORING_COMMAND_SCHEMA_VERSION) {
    throw new V2AuthoringTransactionError('unsupported command schema version');
  }
  if (command.type !== SET_THEME_RECIPE) {
    throw new V2AuthoringTransactionError('unsupported command type');
  }
  const definition = themeDimension(command.dimension);
  const recipeId = scalarString(command.recipeId, 'recipeId', { max: 80 });
  if (!definition.values.includes(recipeId)) {
    throw new V2AuthoringTransactionError('unsupported theme recipe value');
  }
  return {
    schemaVersion: V2_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: SET_THEME_RECIPE,
    target: parseThemeTarget(command.target),
    dimension: definition.id,
    recipeId,
    expectedDraftDigest: digest(command.expectedDraftDigest, 'expectedDraftDigest'),
  };
}

function parseMediaUsageCommand(value) {
  const command = plainRecord(
    value,
    'command',
    new Set([
      'schemaVersion',
      'type',
      'target',
      'slot',
      'assetId',
      'alt',
      'decorative',
      'expectedDraftDigest',
    ]),
  );
  if (command.schemaVersion !== V2_AUTHORING_COMMAND_SCHEMA_VERSION) {
    throw new V2AuthoringTransactionError('unsupported command schema version');
  }
  if (command.type !== SET_MEDIA_USAGE_ASSET) {
    throw new V2AuthoringTransactionError('unsupported command type');
  }
  const target = parseComponentTarget(command.target);
  const slot = scalarString(command.slot, 'slot', { max: 40 });
  if (slot !== V2_HERO_MEDIA_SLOT) {
    throw new V2AuthoringTransactionError('unsupported media usage slot');
  }
  const assetId = scalarString(command.assetId, 'assetId', { max: 80 });
  if (typeof command.decorative !== 'boolean') {
    throw new V2AuthoringTransactionError('decorative must be a boolean');
  }
  let alt = null;
  if (command.decorative) {
    if (command.alt !== null) {
      throw new V2AuthoringTransactionError('decorative media must use null alt text');
    }
  } else {
    alt = scalarString(command.alt, 'alt', { max: 240 }).trim();
    if (!alt) throw new V2AuthoringTransactionError('meaningful media requires alt text');
  }
  return {
    schemaVersion: V2_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: SET_MEDIA_USAGE_ASSET,
    target,
    slot,
    assetId,
    alt,
    decorative: command.decorative,
    expectedDraftDigest: digest(command.expectedDraftDigest, 'expectedDraftDigest'),
  };
}

function canonicalImageBase64(value) {
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length > MAX_IMAGE_BASE64_CHARS
    || value.length % 4 !== 0
  ) {
    throw new V2AuthoringTransactionError('image bytes must use bounded canonical base64');
  }
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length === 0 || bytes.toString('base64') !== value) {
    throw new V2AuthoringTransactionError('image bytes must use canonical base64');
  }
  return value;
}

function parseImportLocalHeroMediaCommand(value) {
  const command = plainRecord(
    value,
    'command',
    new Set([
      'schemaVersion',
      'type',
      'target',
      'slot',
      'bytesBase64',
      'alt',
      'decorative',
      'expectedDraftDigest',
    ]),
  );
  if (command.schemaVersion !== V2_AUTHORING_COMMAND_SCHEMA_VERSION) {
    throw new V2AuthoringTransactionError('unsupported command schema version');
  }
  if (command.type !== IMPORT_LOCAL_HERO_MEDIA) {
    throw new V2AuthoringTransactionError('unsupported command type');
  }
  const target = parseComponentTarget(command.target);
  const slot = scalarString(command.slot, 'slot', { max: 40 });
  if (slot !== V2_HERO_MEDIA_SLOT) {
    throw new V2AuthoringTransactionError('unsupported media usage slot');
  }
  if (typeof command.decorative !== 'boolean') {
    throw new V2AuthoringTransactionError('decorative must be a boolean');
  }
  let alt = null;
  if (command.decorative) {
    if (command.alt !== null) {
      throw new V2AuthoringTransactionError('decorative media must use null alt text');
    }
  } else {
    alt = scalarString(command.alt, 'alt', { max: 240 }).trim();
    if (!alt) throw new V2AuthoringTransactionError('meaningful media requires alt text');
  }
  return {
    schemaVersion: V2_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: IMPORT_LOCAL_HERO_MEDIA,
    target,
    slot,
    bytesBase64: canonicalImageBase64(command.bytesBase64),
    alt,
    decorative: command.decorative,
    expectedDraftDigest: digest(command.expectedDraftDigest, 'expectedDraftDigest'),
  };
}

function parseRestoreImportedHeroMediaCommand(value) {
  const command = plainRecord(
    value,
    'internal command',
    new Set([
      'schemaVersion',
      'type',
      'target',
      'slot',
      'importedAssetId',
      'restoreAssetId',
      'alt',
      'decorative',
      'removeImportedAsset',
      'expectedDraftDigest',
    ]),
  );
  if (command.schemaVersion !== V2_AUTHORING_COMMAND_SCHEMA_VERSION) {
    throw new V2AuthoringTransactionError('unsupported command schema version');
  }
  if (command.type !== RESTORE_IMPORTED_HERO_MEDIA) {
    throw new V2AuthoringTransactionError('unsupported command type');
  }
  const target = parseComponentTarget(command.target);
  const slot = scalarString(command.slot, 'slot', { max: 40 });
  if (slot !== V2_HERO_MEDIA_SLOT) {
    throw new V2AuthoringTransactionError('unsupported media usage slot');
  }
  if (typeof command.decorative !== 'boolean' || typeof command.removeImportedAsset !== 'boolean') {
    throw new V2AuthoringTransactionError('internal media restore flags are invalid');
  }
  let alt = null;
  if (command.decorative) {
    if (command.alt !== null) {
      throw new V2AuthoringTransactionError('decorative media must use null alt text');
    }
  } else {
    alt = scalarString(command.alt, 'alt', { max: 240 }).trim();
    if (!alt) throw new V2AuthoringTransactionError('meaningful media requires alt text');
  }
  return {
    schemaVersion: V2_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: RESTORE_IMPORTED_HERO_MEDIA,
    target,
    slot,
    importedAssetId: scalarString(command.importedAssetId, 'importedAssetId', { max: 80 }),
    restoreAssetId: scalarString(command.restoreAssetId, 'restoreAssetId', { max: 80 }),
    alt,
    decorative: command.decorative,
    removeImportedAsset: command.removeImportedAsset,
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

function parsePageTarget(value) {
  const target = plainRecord(value, 'target', new Set(['nodeId']));
  return {
    nodeId: scalarString(target.nodeId, 'target.nodeId', { max: 200 }),
  };
}

function parseAddComponentCommand(value) {
  const command = plainRecord(
    value,
    'command',
    new Set([
      'schemaVersion',
      'type',
      'target',
      'catalogItemId',
      'destination',
      'expectedDraftDigest',
    ]),
  );
  if (command.schemaVersion !== V2_AUTHORING_COMMAND_SCHEMA_VERSION) {
    throw new V2AuthoringTransactionError('unsupported command schema version');
  }
  if (command.type !== ADD_COMPONENT) {
    throw new V2AuthoringTransactionError('unsupported command type');
  }
  return {
    schemaVersion: V2_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: ADD_COMPONENT,
    target: parsePageTarget(command.target),
    catalogItemId: scalarString(command.catalogItemId, 'catalogItemId', { max: 80 }),
    destination: parseMoveDestination(command.destination),
    expectedDraftDigest: digest(command.expectedDraftDigest, 'expectedDraftDigest'),
  };
}

function parseRemoveComponentCommand(value) {
  const command = plainRecord(
    value,
    'command',
    new Set(['schemaVersion', 'type', 'target', 'expectedDraftDigest']),
  );
  if (command.schemaVersion !== V2_AUTHORING_COMMAND_SCHEMA_VERSION) {
    throw new V2AuthoringTransactionError('unsupported command schema version');
  }
  if (command.type !== REMOVE_COMPONENT) {
    throw new V2AuthoringTransactionError('unsupported command type');
  }
  return {
    schemaVersion: V2_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: REMOVE_COMPONENT,
    target: parseComponentTarget(command.target),
    expectedDraftDigest: digest(command.expectedDraftDigest, 'expectedDraftDigest'),
  };
}

function parseRestoreComponentCommand(value) {
  const command = plainRecord(
    value,
    'internal command',
    new Set([
      'schemaVersion',
      'type',
      'target',
      'componentSnapshot',
      'destination',
      'expectedDraftDigest',
    ]),
  );
  if (command.schemaVersion !== V2_AUTHORING_COMMAND_SCHEMA_VERSION) {
    throw new V2AuthoringTransactionError('unsupported command schema version');
  }
  if (command.type !== RESTORE_COMPONENT) {
    throw new V2AuthoringTransactionError('unsupported command type');
  }
  return {
    schemaVersion: V2_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: RESTORE_COMPONENT,
    target: parsePageTarget(command.target),
    componentSnapshot: plainJsonData(command.componentSnapshot, 'componentSnapshot'),
    destination: parseMoveDestination(command.destination),
    expectedDraftDigest: digest(command.expectedDraftDigest, 'expectedDraftDigest'),
  };
}

function parseAuthoringCommand(value, { allowInternal = false } = {}) {
  const command = plainRecord(
    value,
    'command',
    new Set([
      'schemaVersion',
      'type',
      'target',
      'payload',
      'catalogItemId',
      'componentSnapshot',
      'destination',
      'dimension',
      'recipeId',
      'slot',
      'assetId',
      'bytesBase64',
      'importedAssetId',
      'restoreAssetId',
      'removeImportedAsset',
      'alt',
      'decorative',
      'expectedDraftDigest',
    ]),
  );
  if (command.type === SET_FIELD) return parseSetFieldCommand(value);
  if (command.type === SET_THEME_RECIPE) return parseSetThemeRecipeCommand(value);
  if (command.type === SET_MEDIA_USAGE_ASSET) return parseMediaUsageCommand(value);
  if (command.type === IMPORT_LOCAL_HERO_MEDIA) return parseImportLocalHeroMediaCommand(value);
  if (command.type === RESTORE_IMPORTED_HERO_MEDIA && allowInternal) {
    return parseRestoreImportedHeroMediaCommand(value);
  }
  if (command.type === MOVE_COMPONENT) return parseMoveComponentCommand(value);
  if (command.type === ADD_COMPONENT) return parseAddComponentCommand(value);
  if (command.type === REMOVE_COMPONENT) return parseRemoveComponentCommand(value);
  if (command.type === RESTORE_COMPONENT && allowInternal) return parseRestoreComponentCommand(value);
  throw new V2AuthoringTransactionError('unsupported command type');
}

function resolveThemeRecipe(sourceInput, targetInput, dimensionInput, recipeIdInput) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const target = parseThemeTarget(targetInput);
  const definition = themeDimension(dimensionInput);
  const recipeId = scalarString(recipeIdInput, 'recipeId', { max: 80 });
  if (!definition.values.includes(recipeId)) {
    throw new V2AuthoringTransactionError('unsupported theme recipe value');
  }
  const pointer = `/site/brand/design/${definition.id}`;
  const ownership = pathOwnership(pointer);
  if (ownership !== OWNERSHIP.OPERATOR_AUTHORED) {
    throw new V2AuthoringTransactionError('theme recipe is not operator-authored');
  }
  const currentValue = source.site.brand.design[definition.id];
  if (currentValue === recipeId) {
    throw new V2AuthoringTransactionError('theme recipe selection is a no-op');
  }
  return deepFreeze({
    nodeId: target.nodeId,
    dimension: definition.id,
    label: definition.label,
    allowedValues: [...definition.values],
    pointer,
    ownership,
    currentValue,
    recipeId,
  });
}

function withThemeRecipe(sourceInput, resolved) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const candidate = clone(source);
  candidate.site.brand.design[resolved.dimension] = resolved.recipeId;
  return createV2DeploymentAgnosticVenueSource(candidate);
}

function listV2ThemeRecipeOptions(sourceInput) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const pointer = '/site/brand/design';
  if (pathOwnership(pointer) !== OWNERSHIP.OPERATOR_AUTHORED) {
    throw new V2AuthoringTransactionError('global theme design is not operator-authored');
  }
  return deepFreeze({
    target: { nodeId: V2_GLOBAL_THEME_TARGET },
    ownership: OWNERSHIP.OPERATOR_AUTHORED,
    dimensions: Object.values(V2_THEME_RECIPE_DIMENSIONS).map((definition) => ({
      id: definition.id,
      label: definition.label,
      value: source.site.brand.design[definition.id],
      values: [...definition.values],
    })),
  });
}

function resolveMediaUsage(sourceInput, targetInput, slotInput, assetIdInput, altInput, decorativeInput) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const target = parseComponentTarget(targetInput);
  const slot = scalarString(slotInput, 'slot', { max: 40 });
  if (slot !== V2_HERO_MEDIA_SLOT) {
    throw new V2AuthoringTransactionError('unsupported media usage slot');
  }
  const componentId = target.nodeId.startsWith('component:') ? target.nodeId.slice('component:'.length) : '';
  if (!componentId) throw new V2AuthoringTransactionError('media target must be a stable component identity');
  const matches = componentMatches(source, componentId);
  if (matches.length !== 1) {
    throw new V2AuthoringTransactionError('media target is ambiguous or missing');
  }
  const match = matches[0];
  if (match.component.kind !== 'venue-hero') {
    throw new V2AuthoringTransactionError('first media slice supports venue-hero only');
  }
  if (!match.component.content.media) {
    throw new V2AuthoringTransactionError('hero media usage does not exist');
  }
  const assetId = scalarString(assetIdInput, 'assetId', { max: 80 });
  const asset = source.media.assets.find((candidate) => candidate.id === assetId);
  if (!asset) throw new V2AuthoringTransactionError('managed media asset does not exist');
  if (typeof decorativeInput !== 'boolean') {
    throw new V2AuthoringTransactionError('decorative must be a boolean');
  }
  let alt = null;
  if (decorativeInput) {
    if (altInput !== null) {
      throw new V2AuthoringTransactionError('decorative media must use null alt text');
    }
  } else {
    alt = scalarString(altInput, 'alt', { max: 240 }).trim();
    if (!alt) throw new V2AuthoringTransactionError('meaningful media requires alt text');
  }
  const pointer =
    `/site/pages/${match.pageIndex}/components/${match.componentIndex}/content/media`;
  const ownership = pathOwnership(pointer);
  if (ownership !== OWNERSHIP.OPERATOR_AUTHORED) {
    throw new V2AuthoringTransactionError('media usage is not operator-authored');
  }
  const current = clone(match.component.content.media);
  if (
    current.assetId === assetId
    && current.alt === alt
    && current.decorative === decorativeInput
  ) {
    throw new V2AuthoringTransactionError('media usage selection is a no-op');
  }
  return deepFreeze({
    nodeId: target.nodeId,
    slot,
    pageId: match.page.id,
    pageIndex: match.pageIndex,
    componentId: match.component.id,
    componentIndex: match.componentIndex,
    pointer,
    ownership,
    asset: clone(asset),
    assetId,
    alt,
    decorative: decorativeInput,
    current,
  });
}

function withMediaUsage(sourceInput, resolved) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const candidate = clone(source);
  const usage = candidate.site.pages[resolved.pageIndex]
    .components[resolved.componentIndex].content.media;
  usage.assetId = resolved.assetId;
  usage.alt = resolved.alt;
  usage.decorative = resolved.decorative;
  return createV2DeploymentAgnosticVenueSource(candidate);
}

function resolveHeroMediaTarget(sourceInput, targetInput, slotInput = V2_HERO_MEDIA_SLOT) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const target = parseComponentTarget(targetInput);
  const slot = scalarString(slotInput, 'slot', { max: 40 });
  if (slot !== V2_HERO_MEDIA_SLOT) {
    throw new V2AuthoringTransactionError('unsupported media usage slot');
  }
  const componentId = target.nodeId.startsWith('component:')
    ? target.nodeId.slice('component:'.length)
    : '';
  if (!componentId) {
    throw new V2AuthoringTransactionError('media target must be a stable component identity');
  }
  const matches = componentMatches(source, componentId);
  if (matches.length !== 1) {
    throw new V2AuthoringTransactionError('media target is ambiguous or missing');
  }
  const match = matches[0];
  if (match.component.kind !== 'venue-hero' || !match.component.content.media) {
    throw new V2AuthoringTransactionError('first media slice supports an existing venue-hero usage only');
  }
  const pointer = `/site/pages/${match.pageIndex}/components/${match.componentIndex}/content/media`;
  const ownership = pathOwnership(pointer);
  if (ownership !== OWNERSHIP.OPERATOR_AUTHORED) {
    throw new V2AuthoringTransactionError('media usage is not operator-authored');
  }
  return {
    source,
    target,
    slot,
    match,
    pointer,
    ownership,
    current: clone(match.component.content.media),
  };
}

function deriveImportedMediaAsset(bytesBase64) {
  const bytes = Buffer.from(canonicalImageBase64(bytesBase64), 'base64');
  let derived;
  try {
    derived = deriveManagedImage(bytes);
  } catch (error) {
    throw new V2AuthoringTransactionError(`local image inspection failed: ${error.message}`);
  }
  const assetId = `local-image-${derived.digestSha256}`;
  return deepFreeze({
    bytesBase64: bytes.toString('base64'),
    digestSha256: derived.digestSha256,
    mediaType: derived.mediaType,
    extension: derived.extension,
    managedFilename: derived.filename,
    asset: {
      id: assetId,
      src: derived.sourcePath,
      width: derived.width,
      height: derived.height,
    },
  });
}

function resolveLocalHeroMediaImport(
  sourceInput,
  targetInput,
  slotInput,
  bytesBase64Input,
  altInput,
  decorativeInput,
) {
  const context = resolveHeroMediaTarget(sourceInput, targetInput, slotInput);
  const derived = deriveImportedMediaAsset(bytesBase64Input);
  const existing = context.source.media.assets.find(
    (candidate) => candidate.id === derived.asset.id,
  );
  if (existing && JSON.stringify(existing) !== JSON.stringify(derived.asset)) {
    throw new V2AuthoringTransactionError('derived media identity collides with different asset metadata');
  }
  if (
    existing
    && context.current.assetId === derived.asset.id
    && context.current.alt === altInput
    && context.current.decorative === decorativeInput
  ) {
    throw new V2AuthoringTransactionError('local media import is a no-op');
  }

  const candidate = clone(context.source);
  if (!existing) candidate.media.assets.push(clone(derived.asset));
  const usage = candidate.site.pages[context.match.pageIndex]
    .components[context.match.componentIndex].content.media;
  usage.assetId = derived.asset.id;
  usage.alt = altInput;
  usage.decorative = decorativeInput;
  const afterSource = createV2DeploymentAgnosticVenueSource(candidate);
  return deepFreeze({
    ...context,
    asset: clone(derived.asset),
    assetWasAdded: !existing,
    bytesBase64: derived.bytesBase64,
    digestSha256: derived.digestSha256,
    mediaType: derived.mediaType,
    extension: derived.extension,
    alt: altInput,
    decorative: decorativeInput,
    afterSource,
  });
}

function resolveImportedHeroMediaRestore(sourceInput, command) {
  const context = resolveHeroMediaTarget(sourceInput, command.target, command.slot);
  if (context.current.assetId !== command.importedAssetId) {
    throw new V2AuthoringTransactionError('imported media restore no longer matches the hero usage');
  }
  if (!context.source.media.assets.some((asset) => asset.id === command.restoreAssetId)) {
    throw new V2AuthoringTransactionError('restore media asset no longer exists');
  }
  const candidate = clone(context.source);
  const usage = candidate.site.pages[context.match.pageIndex]
    .components[context.match.componentIndex].content.media;
  usage.assetId = command.restoreAssetId;
  usage.alt = command.alt;
  usage.decorative = command.decorative;
  if (command.removeImportedAsset) {
    const index = candidate.media.assets.findIndex((asset) => asset.id === command.importedAssetId);
    if (index < 0) {
      throw new V2AuthoringTransactionError('imported media asset no longer exists');
    }
    candidate.media.assets.splice(index, 1);
  }
  const afterSource = createV2DeploymentAgnosticVenueSource(candidate);
  return deepFreeze({
    ...context,
    importedAssetId: command.importedAssetId,
    restoreAssetId: command.restoreAssetId,
    removeImportedAsset: command.removeImportedAsset,
    alt: command.alt,
    decorative: command.decorative,
    afterSource,
  });
}

function listV2MediaUsageOptions(sourceInput, targetInput, slotInput = V2_HERO_MEDIA_SLOT) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const target = parseComponentTarget(targetInput);
  const slot = scalarString(slotInput, 'slot', { max: 40 });
  if (slot !== V2_HERO_MEDIA_SLOT) {
    throw new V2AuthoringTransactionError('unsupported media usage slot');
  }
  const componentId = target.nodeId.startsWith('component:') ? target.nodeId.slice('component:'.length) : '';
  const matches = componentMatches(source, componentId);
  if (matches.length !== 1) {
    throw new V2AuthoringTransactionError('media target is ambiguous or missing');
  }
  const match = matches[0];
  if (match.component.kind !== 'venue-hero' || !match.component.content.media) {
    throw new V2AuthoringTransactionError('selected component has no supported media usage');
  }
  const pointer =
    `/site/pages/${match.pageIndex}/components/${match.componentIndex}/content/media`;
  const ownership = pathOwnership(pointer);
  if (ownership !== OWNERSHIP.OPERATOR_AUTHORED) {
    throw new V2AuthoringTransactionError('media usage is not operator-authored');
  }
  return deepFreeze({
    target: { nodeId: target.nodeId },
    slot,
    ownership,
    pageId: match.page.id,
    componentId: match.component.id,
    current: clone(match.component.content.media),
    assets: source.media.assets.map((asset) => ({
      id: asset.id,
      width: asset.width,
      height: asset.height,
    })),
  });
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

function catalogItem(catalogItemId) {
  const item = V2_COMPONENT_CATALOG[catalogItemId];
  if (!item) throw new V2AuthoringTransactionError('unknown component catalog item');
  return item;
}

function catalogItemForComponent(component) {
  return Object.values(V2_COMPONENT_CATALOG).find(
    (item) => item.kind === component.kind && item.recipeId === component.recipeId,
  ) || null;
}

function resolvePageCollection(sourceInput, targetInput) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const target = parsePageTarget(targetInput);
  const projection = createV2SemanticCanvasProjection(source);
  const node = listV2CanvasNodes(projection).find((candidate) => candidate.id === target.nodeId);
  if (!node || node.stableIdentity?.type !== 'page-id') {
    throw new V2AuthoringTransactionError('stable page target does not exist');
  }
  const pageIndex = source.site.pages.findIndex((page) => page.id === node.stableIdentity.value);
  if (pageIndex < 0) throw new V2AuthoringTransactionError('stable page target does not exist');
  const page = source.site.pages[pageIndex];
  const collectionPointer = `/site/pages/${pageIndex}/components`;
  const ownership = pathOwnership(collectionPointer);
  if (ownership !== OWNERSHIP.OPERATOR_AUTHORED_COLLECTION) {
    throw new V2AuthoringTransactionError('component collection is not operator-authored');
  }
  return deepFreeze({
    page,
    pageId: page.id,
    pageIndex,
    collectionPointer,
    ownership,
  });
}

function resolvePageDestination(source, pageId, destinationInput) {
  const destination = parseMoveDestination(destinationInput);
  if (destination.kind === BEFORE_COMPONENT) {
    const matches = componentMatches(source, destination.beforeComponentId);
    if (matches.length === 0) {
      throw new V2AuthoringTransactionError('stable destination component does not exist');
    }
    if (matches.length !== 1) {
      throw new V2AuthoringTransactionError('destination component identity is ambiguous');
    }
    if (matches[0].page.id !== pageId) {
      throw new V2AuthoringTransactionError('cross-page component destination is not authorized');
    }
  }
  return destination;
}

function deriveCatalogComponentId(source, catalogItemId) {
  const used = new Set();
  for (const page of source.site.pages) {
    for (const component of page.components) used.add(component.id);
  }
  if (!used.has(catalogItemId)) return catalogItemId;
  for (let suffix = 2; suffix <= 9999; suffix += 1) {
    const candidate = `${catalogItemId}-${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new V2AuthoringTransactionError('component catalog identity space is exhausted');
}

function catalogComponentSnapshot(source, catalogItemId) {
  const item = catalogItem(catalogItemId);
  return {
    id: deriveCatalogComponentId(source, item.id),
    kind: item.kind,
    recipeId: item.recipeId,
    content: clone(item.content),
    responsive: clone(item.responsive),
  };
}

function insertComponentSnapshot(sourceInput, pageIndex, componentInput, destinationInput) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const component = plainJsonData(componentInput, 'componentSnapshot');
  if (componentMatches(source, component.id).length > 0) {
    throw new V2AuthoringTransactionError('component identity already exists');
  }
  const candidate = clone(source);
  const components = candidate.site.pages[pageIndex].components;
  const destination = parseMoveDestination(destinationInput);
  if (destination.kind === END_OF_PAGE) {
    components.push(component);
  } else {
    const destinationIndex = components.findIndex(
      (entry) => entry.id === destination.beforeComponentId,
    );
    if (destinationIndex < 0) {
      throw new V2AuthoringTransactionError('stable destination component no longer exists');
    }
    components.splice(destinationIndex, 0, component);
  }
  return createV2DeploymentAgnosticVenueSource(candidate);
}

function listV2ComponentCatalogOptions() {
  return deepFreeze(
    Object.values(V2_COMPONENT_CATALOG).map((item) => ({
      id: item.id,
      label: item.label,
    })),
  );
}

function listV2ComponentAddDestinations(sourceInput, targetInput) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const page = resolvePageCollection(source, targetInput);
  const destinations = page.page.components.map((component) => ({
    kind: BEFORE_COMPONENT,
    beforeComponentId: component.id,
  }));
  destinations.push({ kind: END_OF_PAGE });
  return deepFreeze({
    pageId: page.pageId,
    pageIndex: page.pageIndex,
    collectionPointer: page.collectionPointer,
    ownership: page.ownership,
    catalog: listV2ComponentCatalogOptions(),
    destinations,
  });
}

function getV2ComponentRemovalContext(sourceInput, targetInput) {
  try {
    const resolved = resolveComponentRemove(sourceInput, targetInput);
    return deepFreeze({
      eligible: true,
      pageId: resolved.pageId,
      componentId: resolved.componentId,
      catalogItemId: resolved.catalogItemId,
      ownership: resolved.ownership,
    });
  } catch (error) {
    if (
      error instanceof V2AuthoringTransactionError
      && /not removable in this bounded catalog slice/.test(error.message)
    ) {
      return deepFreeze({ eligible: false });
    }
    throw error;
  }
}

function resolveComponentAdd(sourceInput, targetInput, catalogItemIdInput, destinationInput) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const page = resolvePageCollection(source, targetInput);
  const item = catalogItem(catalogItemIdInput);
  const destination = resolvePageDestination(source, page.pageId, destinationInput);
  const component = catalogComponentSnapshot(source, item.id);
  return deepFreeze({
    pageId: page.pageId,
    pageIndex: page.pageIndex,
    collectionPointer: page.collectionPointer,
    ownership: page.ownership,
    catalogItemId: item.id,
    component,
    destination,
  });
}

function resolveComponentRemove(sourceInput, targetInput) {
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
  const item = catalogItemForComponent(match.component);
  if (!item) {
    throw new V2AuthoringTransactionError('component is not removable in this bounded catalog slice');
  }
  const collectionPointer = `/site/pages/${match.pageIndex}/components`;
  const ownership = pathOwnership(collectionPointer);
  if (ownership !== OWNERSHIP.OPERATOR_AUTHORED_COLLECTION) {
    throw new V2AuthoringTransactionError('component collection is not operator-authored');
  }
  const inverseDestination = match.componentIndex === match.page.components.length - 1
    ? { kind: END_OF_PAGE }
    : {
        kind: BEFORE_COMPONENT,
        beforeComponentId: match.page.components[match.componentIndex + 1].id,
      };
  return deepFreeze({
    pageId: match.page.id,
    pageIndex: match.pageIndex,
    componentId: match.component.id,
    componentIndex: match.componentIndex,
    componentSnapshot: clone(match.component),
    collectionPointer,
    ownership,
    catalogItemId: item.id,
    inverseDestination,
  });
}

function removeResolvedComponent(sourceInput, resolved) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const candidate = clone(source);
  const components = candidate.site.pages[resolved.pageIndex].components;
  const targetIndex = components.findIndex((component) => component.id === resolved.componentId);
  if (targetIndex < 0) throw new V2AuthoringTransactionError('stable component target no longer exists');
  components.splice(targetIndex, 1);
  return createV2DeploymentAgnosticVenueSource(candidate);
}

function resolveComponentRestore(sourceInput, command) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const page = resolvePageCollection(source, command.target);
  const destination = resolvePageDestination(source, page.pageId, command.destination);
  const snapshot = plainJsonData(command.componentSnapshot, 'componentSnapshot');
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new V2AuthoringTransactionError('componentSnapshot is invalid');
  }
  if (!catalogItemForComponent(snapshot)) {
    throw new V2AuthoringTransactionError('componentSnapshot is outside the bounded catalog restore policy');
  }
  if (componentMatches(source, snapshot.id).length > 0) {
    throw new V2AuthoringTransactionError('component identity already exists');
  }
  const afterSource = insertComponentSnapshot(source, page.pageIndex, snapshot, destination);
  return deepFreeze({
    pageId: page.pageId,
    pageIndex: page.pageIndex,
    collectionPointer: page.collectionPointer,
    ownership: page.ownership,
    componentSnapshot: snapshot,
    destination,
    afterSource,
  });
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

function commandTransition(sourceInput, commandInput, { allowInternal = false } = {}) {
  const source = createV2DeploymentAgnosticVenueSource(sourceInput);
  const command = parseAuthoringCommand(commandInput, { allowInternal });
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

  if (command.type === SET_THEME_RECIPE) {
    const resolved = resolveThemeRecipe(
      source,
      command.target,
      command.dimension,
      command.recipeId,
    );
    const afterSource = withThemeRecipe(source, resolved);
    const afterDigest = deriveV2DeploymentAgnosticVenueSourceDigest(afterSource);
    const validatedCommand = deepFreeze({
      ...command,
      target: { ...command.target },
      dimension: resolved.dimension,
      recipeId: resolved.recipeId,
    });
    const inverseCommand = deepFreeze({
      schemaVersion: V2_AUTHORING_COMMAND_SCHEMA_VERSION,
      type: SET_THEME_RECIPE,
      target: { ...validatedCommand.target },
      dimension: resolved.dimension,
      recipeId: resolved.currentValue,
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
        fieldId: resolved.dimension,
        pageId: null,
        componentId: null,
        sourcePointer: resolved.pointer,
        ownership: resolved.ownership,
        themeDimension: resolved.dimension,
        recipeId: resolved.recipeId,
      },
    });
  }

  if (command.type === IMPORT_LOCAL_HERO_MEDIA) {
    const resolved = resolveLocalHeroMediaImport(
      source,
      command.target,
      command.slot,
      command.bytesBase64,
      command.alt,
      command.decorative,
    );
    const afterSource = resolved.afterSource;
    const afterDigest = deriveV2DeploymentAgnosticVenueSourceDigest(afterSource);
    const validatedCommand = deepFreeze({
      ...command,
      target: { ...command.target },
      bytesBase64: resolved.bytesBase64,
    });
    const inverseCommand = deepFreeze({
      schemaVersion: V2_AUTHORING_COMMAND_SCHEMA_VERSION,
      type: RESTORE_IMPORTED_HERO_MEDIA,
      target: { ...validatedCommand.target },
      slot: resolved.slot,
      importedAssetId: resolved.asset.id,
      restoreAssetId: resolved.current.assetId,
      alt: resolved.current.alt,
      decorative: resolved.current.decorative,
      removeImportedAsset: resolved.assetWasAdded,
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
        fieldId: resolved.slot,
        pageId: resolved.match.page.id,
        componentId: resolved.match.component.id,
        sourcePointer: resolved.pointer,
        ownership: resolved.ownership,
        mediaSlot: resolved.slot,
        assetId: resolved.asset.id,
        assetSrc: resolved.asset.src,
        width: resolved.asset.width,
        height: resolved.asset.height,
        mediaType: resolved.mediaType,
        digestSha256: resolved.digestSha256,
        assetWasAdded: resolved.assetWasAdded,
      },
    });
  }

  if (command.type === RESTORE_IMPORTED_HERO_MEDIA && allowInternal) {
    const resolved = resolveImportedHeroMediaRestore(source, command);
    const afterSource = resolved.afterSource;
    const afterDigest = deriveV2DeploymentAgnosticVenueSourceDigest(afterSource);
    const validatedCommand = deepFreeze({
      ...command,
      target: { ...command.target },
    });
    return deepFreeze({
      command: validatedCommand,
      inverseCommand: null,
      beforeDigest,
      afterDigest,
      afterSource,
      resolvedTarget: {
        nodeId: validatedCommand.target.nodeId,
        fieldId: resolved.slot,
        pageId: resolved.match.page.id,
        componentId: resolved.match.component.id,
        sourcePointer: resolved.pointer,
        ownership: resolved.ownership,
        mediaSlot: resolved.slot,
        assetId: resolved.restoreAssetId,
        removedAssetId: resolved.removeImportedAsset ? resolved.importedAssetId : null,
      },
    });
  }

  if (command.type === SET_MEDIA_USAGE_ASSET) {
    const resolved = resolveMediaUsage(
      source,
      command.target,
      command.slot,
      command.assetId,
      command.alt,
      command.decorative,
    );
    const afterSource = withMediaUsage(source, resolved);
    const afterDigest = deriveV2DeploymentAgnosticVenueSourceDigest(afterSource);
    const normalizedUsage = afterSource.site.pages[resolved.pageIndex]
      .components[resolved.componentIndex].content.media;
    const validatedCommand = deepFreeze({
      ...command,
      target: { ...command.target },
      slot: resolved.slot,
      assetId: normalizedUsage.assetId,
      alt: normalizedUsage.alt,
      decorative: normalizedUsage.decorative,
    });
    const inverseCommand = deepFreeze({
      schemaVersion: V2_AUTHORING_COMMAND_SCHEMA_VERSION,
      type: SET_MEDIA_USAGE_ASSET,
      target: { ...validatedCommand.target },
      slot: resolved.slot,
      assetId: resolved.current.assetId,
      alt: resolved.current.alt,
      decorative: resolved.current.decorative,
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
        fieldId: resolved.slot,
        pageId: resolved.pageId,
        componentId: resolved.componentId,
        sourcePointer: resolved.pointer,
        ownership: resolved.ownership,
        mediaSlot: resolved.slot,
        assetId: normalizedUsage.assetId,
      },
    });
  }

  if (command.type === ADD_COMPONENT) {
    const resolved = resolveComponentAdd(
      source,
      command.target,
      command.catalogItemId,
      command.destination,
    );
    const afterSource = insertComponentSnapshot(
      source,
      resolved.pageIndex,
      resolved.component,
      resolved.destination,
    );
    const afterDigest = deriveV2DeploymentAgnosticVenueSourceDigest(afterSource);
    const validatedCommand = deepFreeze({
      ...command,
      target: { ...command.target },
      destination: { ...resolved.destination },
    });
    const inverseCommand = deepFreeze({
      schemaVersion: V2_AUTHORING_COMMAND_SCHEMA_VERSION,
      type: REMOVE_COMPONENT,
      target: { nodeId: `component:${resolved.component.id}` },
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
        componentId: resolved.component.id,
        catalogItemId: resolved.catalogItemId,
        sourcePointer: resolved.collectionPointer,
        ownership: resolved.ownership,
        destination: { ...resolved.destination },
      },
    });
  }

  if (command.type === REMOVE_COMPONENT) {
    const resolved = resolveComponentRemove(source, command.target);
    const afterSource = removeResolvedComponent(source, resolved);
    const afterDigest = deriveV2DeploymentAgnosticVenueSourceDigest(afterSource);
    const validatedCommand = deepFreeze({
      ...command,
      target: { ...command.target },
    });
    const inverseCommand = deepFreeze({
      schemaVersion: V2_AUTHORING_COMMAND_SCHEMA_VERSION,
      type: RESTORE_COMPONENT,
      target: { nodeId: `page:${resolved.pageId}` },
      componentSnapshot: clone(resolved.componentSnapshot),
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
        catalogItemId: resolved.catalogItemId,
        sourcePointer: resolved.collectionPointer,
        ownership: resolved.ownership,
        destination: { ...resolved.inverseDestination },
      },
    });
  }

  if (command.type === RESTORE_COMPONENT && allowInternal) {
    const resolved = resolveComponentRestore(source, command);
    const afterSource = resolved.afterSource;
    const afterDigest = deriveV2DeploymentAgnosticVenueSourceDigest(afterSource);
    const validatedCommand = deepFreeze({
      ...command,
      target: { ...command.target },
      componentSnapshot: clone(resolved.componentSnapshot),
      destination: { ...resolved.destination },
    });
    const inverseCommand = deepFreeze({
      schemaVersion: V2_AUTHORING_COMMAND_SCHEMA_VERSION,
      type: REMOVE_COMPONENT,
      target: { nodeId: `component:${resolved.componentSnapshot.id}` },
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
        componentId: resolved.componentSnapshot.id,
        catalogItemId: catalogItemForComponent(resolved.componentSnapshot)?.id || null,
        sourcePointer: resolved.collectionPointer,
        ownership: resolved.ownership,
        destination: { ...resolved.destination },
      },
    });
  }

  if (command.type !== MOVE_COMPONENT) {
    throw new V2AuthoringTransactionError('unsupported command type');
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

  if (JSON.stringify(forward.inverseCommand) !== JSON.stringify(entry.inverseCommand)) {
    throw new V2AuthoringTransactionError('history inverse command binding is invalid');
  }

  const inverse = commandTransition(afterSource, entry.inverseCommand, { allowInternal: true });
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

function proposeV2SetThemeRecipe(sessionInput, commandInput) {
  const proposal = proposeV2AuthoringCommand(sessionInput, commandInput);
  if (proposal.command.type !== SET_THEME_RECIPE) {
    throw new V2AuthoringTransactionError('SET_THEME_RECIPE proposal requires SET_THEME_RECIPE command');
  }
  return proposal;
}

function proposeV2SetMediaUsageAsset(sessionInput, commandInput) {
  const proposal = proposeV2AuthoringCommand(sessionInput, commandInput);
  if (proposal.command.type !== SET_MEDIA_USAGE_ASSET) {
    throw new V2AuthoringTransactionError('SET_MEDIA_USAGE_ASSET proposal requires SET_MEDIA_USAGE_ASSET command');
  }
  return proposal;
}

function proposeV2ImportLocalHeroMedia(sessionInput, commandInput) {
  const proposal = proposeV2AuthoringCommand(sessionInput, commandInput);
  if (proposal.command.type !== IMPORT_LOCAL_HERO_MEDIA) {
    throw new V2AuthoringTransactionError('IMPORT_LOCAL_HERO_MEDIA proposal requires IMPORT_LOCAL_HERO_MEDIA command');
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

function proposeV2AddComponent(sessionInput, commandInput) {
  const proposal = proposeV2AuthoringCommand(sessionInput, commandInput);
  if (proposal.command.type !== ADD_COMPONENT) {
    throw new V2AuthoringTransactionError('ADD_COMPONENT proposal requires ADD_COMPONENT command');
  }
  return proposal;
}

function proposeV2RemoveComponent(sessionInput, commandInput) {
  const proposal = proposeV2AuthoringCommand(sessionInput, commandInput);
  if (proposal.command.type !== REMOVE_COMPONENT) {
    throw new V2AuthoringTransactionError('REMOVE_COMPONENT proposal requires REMOVE_COMPONENT command');
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
  ADD_COMPONENT,
  BEFORE_COMPONENT,
  END_OF_PAGE,
  IMPORT_LOCAL_HERO_MEDIA,
  MOVE_COMPONENT,
  REMOVE_COMPONENT,
  SET_FIELD,
  SET_THEME_RECIPE,
  SET_MEDIA_USAGE_ASSET,
  V2_COMPONENT_CATALOG,
  V2_GLOBAL_THEME_TARGET,
  V2_HERO_MEDIA_SLOT,
  V2_THEME_RECIPE_DIMENSIONS,
  V2_AUTHORING_COMMAND_SCHEMA_VERSION,
  V2_AUTHORING_HISTORY_SCHEMA_VERSION,
  V2_AUTHORING_PROPOSAL_SCHEMA_VERSION,
  V2_AUTHORING_SESSION_SCHEMA_VERSION,
  V2AuthoringTransactionError,
  applyV2AuthoringProposal,
  createV2AuthoringSession,
  discardV2AuthoringProposal,
  getV2ComponentRemovalContext,
  listV2ComponentAddDestinations,
  listV2ComponentCatalogOptions,
  listV2ComponentMoveDestinations,
  listV2MediaUsageOptions,
  listV2ThemeRecipeOptions,
  proposeV2AddComponent,
  proposeV2AuthoringCommand,
  proposeV2ImportLocalHeroMedia,
  proposeV2MoveComponent,
  proposeV2RemoveComponent,
  proposeV2SetField,
  proposeV2SetMediaUsageAsset,
  proposeV2SetThemeRecipe,
  redoV2AuthoringSession,
  resolveV2AuthoringTarget: resolveTarget,
  resolveV2ComponentMove: resolveComponentMove,
  undoV2AuthoringSession,
};
