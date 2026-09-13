'use strict';

const {
  V3_NATIVE_ACTIVITY_PUBLIC_ACTION_ROLES,
  createV3DeploymentAgnosticVenueSource,
  deriveV3DeploymentAgnosticVenueSourceDigest,
  serializeV3DeploymentAgnosticVenueSource,
} = require('./source');

const V3_ACTIVITY_AUTHORING_COMMAND_SCHEMA_VERSION = 1;
const V3_ACTIVITY_AUTHORING_SESSION_SCHEMA_VERSION = 1;
const V3_ACTIVITY_AUTHORING_PROPOSAL_SCHEMA_VERSION = 1;
const V3_ACTIVITY_AUTHORING_HISTORY_SCHEMA_VERSION = 1;

const ADD_ACTIVITY = 'ADD_ACTIVITY';
const REMOVE_ACTIVITY = 'REMOVE_ACTIVITY';
const RESTORE_ACTIVITY = 'RESTORE_ACTIVITY';
const SET_ACTIVITY_TEXT = 'SET_ACTIVITY_TEXT';
const SET_ACTIVITY_LIFECYCLE = 'SET_ACTIVITY_LIFECYCLE';
const SET_ACTIVITY_ACCESS = 'SET_ACTIVITY_ACCESS';
const SET_ACTIVITY_TEMPORAL = 'SET_ACTIVITY_TEMPORAL';
const SET_ACTIVITY_PRESENCE = 'SET_ACTIVITY_PRESENCE';
const MOVE_ACTIVITY_REFERENCE = 'MOVE_ACTIVITY_REFERENCE';
const BEFORE_ACTIVITY_REFERENCE = 'BEFORE_ACTIVITY_REFERENCE';
const END_OF_ACTIVITY_LIST = 'END_OF_ACTIVITY_LIST';

const ADD_ACTIVITY_PUBLIC_ACTION = 'ADD_ACTIVITY_PUBLIC_ACTION';
const SET_ACTIVITY_PUBLIC_ACTION = 'SET_ACTIVITY_PUBLIC_ACTION';
const REMOVE_ACTIVITY_PUBLIC_ACTION = 'REMOVE_ACTIVITY_PUBLIC_ACTION';
const RESTORE_ACTIVITY_PUBLIC_ACTION = 'RESTORE_ACTIVITY_PUBLIC_ACTION';
const MOVE_ACTIVITY_PUBLIC_ACTION = 'MOVE_ACTIVITY_PUBLIC_ACTION';
const BEFORE_PUBLIC_ACTION = 'BEFORE_PUBLIC_ACTION';
const END_OF_PUBLIC_ACTIONS = 'END_OF_PUBLIC_ACTIONS';

const ADD_ACTIVITY_MANAGED_MEDIA = 'ADD_ACTIVITY_MANAGED_MEDIA';
const REMOVE_ACTIVITY_MANAGED_MEDIA = 'REMOVE_ACTIVITY_MANAGED_MEDIA';
const RESTORE_ACTIVITY_MANAGED_MEDIA = 'RESTORE_ACTIVITY_MANAGED_MEDIA';
const MOVE_ACTIVITY_MANAGED_MEDIA = 'MOVE_ACTIVITY_MANAGED_MEDIA';
const BEFORE_MANAGED_MEDIA = 'BEFORE_MANAGED_MEDIA';
const END_OF_MANAGED_MEDIA = 'END_OF_MANAGED_MEDIA';

const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ACTION_ID_PATTERN = /^[a-z0-9]+(?:(?:-|:)[a-z0-9]+)*$/;
const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const LIFECYCLES = new Set([
  'DRAFT',
  'SCHEDULED',
  'LIVE',
  'COMPLETED',
  'POSTPONED',
  'CANCELLED',
]);
const CAPACITIES = new Set(['UNSPECIFIED', 'AVAILABLE', 'FULL']);
const NATIVE_PUBLIC_ACTION_ROLES = new Set(V3_NATIVE_ACTIVITY_PUBLIC_ACTION_ROLES);
const MANAGED_MEDIA_ROLES = new Set(['PROMO', 'PRIMARY_VISUAL_COMPATIBILITY']);

class V3ActivityAuthoringError extends Error {
  constructor(message, options = {}) {
    super(`HiVenues v3 activity authoring error: ${message}`, options);
    this.name = 'V3ActivityAuthoringError';
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
    throw new V3ActivityAuthoringError(`${label} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new V3ActivityAuthoringError(`${label} must be a plain object`);
  }
  const result = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || DANGEROUS_KEYS.has(key) || !allowedKeys.has(key)) {
      throw new V3ActivityAuthoringError(`${label} contains unsupported keys`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new V3ActivityAuthoringError(`${label} fields must be enumerable data`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function scalarString(value, label, { min = 1, max = 240 } = {}) {
  if (typeof value !== 'string' || value.length < min || value.length > max || value.includes('\0')) {
    throw new V3ActivityAuthoringError(`${label} is outside the bounded string contract`);
  }
  return value;
}

function nullableString(value, label, { max = 2400 } = {}) {
  if (value === null) return null;
  return scalarString(value, label, { max });
}

function digest(value, label = 'expectedDraftDigest') {
  if (typeof value !== 'string' || !DIGEST_PATTERN.test(value)) {
    throw new V3ActivityAuthoringError(`${label} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function stableId(value, label) {
  const id = scalarString(value, label, { min: 2, max: 160 });
  if (!ID_PATTERN.test(id)) throw new V3ActivityAuthoringError(`${label} is not a stable id`);
  return id;
}

function stableActionId(value, label) {
  const id = scalarString(value, label, { min: 2, max: 160 });
  if (!ACTION_ID_PATTERN.test(id)) throw new V3ActivityAuthoringError(`${label} is not a stable action id`);
  return id;
}

function parseActivityTarget(value) {
  const target = plainRecord(value, 'activity target', new Set(['activityId']));
  return { activityId: stableId(target.activityId, 'activity target.activityId') };
}

function parseActionTarget(value) {
  const target = plainRecord(value, 'public action target', new Set(['activityId', 'actionId']));
  return {
    activityId: stableId(target.activityId, 'public action target.activityId'),
    actionId: stableActionId(target.actionId, 'public action target.actionId'),
  };
}

function parseManagedMediaIdentity(value, label = 'managed media target') {
  const target = plainRecord(value, label, new Set(['assetId', 'role']));
  const role = scalarString(target.role, `${label}.role`, { max: 80 });
  if (!MANAGED_MEDIA_ROLES.has(role)) throw new V3ActivityAuthoringError(`${label}.role is unsupported`);
  return {
    assetId: stableId(target.assetId, `${label}.assetId`),
    role,
  };
}

function parseManagedMediaTarget(value) {
  const target = plainRecord(value, 'managed media target', new Set(['activityId', 'assetId', 'role']));
  const role = scalarString(target.role, 'managed media target.role', { max: 80 });
  if (!MANAGED_MEDIA_ROLES.has(role)) throw new V3ActivityAuthoringError('managed media target.role is unsupported');
  return {
    activityId: stableId(target.activityId, 'managed media target.activityId'),
    assetId: stableId(target.assetId, 'managed media target.assetId'),
    role,
  };
}

function parseListTarget(value) {
  const target = plainRecord(value, 'activity-list target', new Set(['componentId']));
  return { componentId: stableId(target.componentId, 'activity-list target.componentId') };
}

function parseDestination(value) {
  const destination = plainRecord(
    value,
    'activity-list destination',
    new Set(['kind', 'beforeActivityId']),
  );
  if (destination.kind === END_OF_ACTIVITY_LIST) {
    if (Object.hasOwn(destination, 'beforeActivityId')) {
      throw new V3ActivityAuthoringError('END_OF_ACTIVITY_LIST cannot include beforeActivityId');
    }
    return { kind: END_OF_ACTIVITY_LIST };
  }
  if (destination.kind === BEFORE_ACTIVITY_REFERENCE) {
    return {
      kind: BEFORE_ACTIVITY_REFERENCE,
      beforeActivityId: stableId(destination.beforeActivityId, 'destination.beforeActivityId'),
    };
  }
  throw new V3ActivityAuthoringError('unsupported activity-list destination');
}

function parseActionDestination(value) {
  const destination = plainRecord(
    value,
    'public action destination',
    new Set(['kind', 'beforeActionId']),
  );
  if (destination.kind === END_OF_PUBLIC_ACTIONS) {
    if (Object.hasOwn(destination, 'beforeActionId')) {
      throw new V3ActivityAuthoringError('END_OF_PUBLIC_ACTIONS cannot include beforeActionId');
    }
    return { kind: END_OF_PUBLIC_ACTIONS };
  }
  if (destination.kind === BEFORE_PUBLIC_ACTION) {
    return {
      kind: BEFORE_PUBLIC_ACTION,
      beforeActionId: stableActionId(destination.beforeActionId, 'destination.beforeActionId'),
    };
  }
  throw new V3ActivityAuthoringError('unsupported public action destination');
}

function parseManagedMediaDestination(value) {
  const destination = plainRecord(
    value,
    'managed media destination',
    new Set(['kind', 'beforeAssetId', 'beforeRole']),
  );
  if (destination.kind === END_OF_MANAGED_MEDIA) {
    if (Object.hasOwn(destination, 'beforeAssetId') || Object.hasOwn(destination, 'beforeRole')) {
      throw new V3ActivityAuthoringError('END_OF_MANAGED_MEDIA cannot include before media identity');
    }
    return { kind: END_OF_MANAGED_MEDIA };
  }
  if (destination.kind === BEFORE_MANAGED_MEDIA) {
    const role = scalarString(destination.beforeRole, 'destination.beforeRole', { max: 80 });
    if (!MANAGED_MEDIA_ROLES.has(role)) throw new V3ActivityAuthoringError('destination.beforeRole is unsupported');
    return {
      kind: BEFORE_MANAGED_MEDIA,
      beforeAssetId: stableId(destination.beforeAssetId, 'destination.beforeAssetId'),
      beforeRole: role,
    };
  }
  throw new V3ActivityAuthoringError('unsupported managed media destination');
}

function parseTemporal(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new V3ActivityAuthoringError('temporal must be a typed object');
  }
  if (value.kind === 'OCCURRENCE') {
    const temporal = plainRecord(value, 'temporal', new Set(['kind', 'startAt', 'endAt']));
    return {
      kind: 'OCCURRENCE',
      startAt: scalarString(temporal.startAt, 'temporal.startAt', { max: 40 }),
      endAt: temporal.endAt === null
        ? null
        : scalarString(temporal.endAt, 'temporal.endAt', { max: 40 }),
    };
  }
  if (value.kind === 'RELEASE') {
    const temporal = plainRecord(value, 'temporal', new Set(['kind', 'releaseAt']));
    return {
      kind: 'RELEASE',
      releaseAt: scalarString(temporal.releaseAt, 'temporal.releaseAt', { max: 40 }),
    };
  }
  if (value.kind === 'WINDOW') {
    const temporal = plainRecord(value, 'temporal', new Set(['kind', 'startAt', 'endAt']));
    return {
      kind: 'WINDOW',
      startAt: scalarString(temporal.startAt, 'temporal.startAt', { max: 40 }),
      endAt: scalarString(temporal.endAt, 'temporal.endAt', { max: 40 }),
    };
  }
  throw new V3ActivityAuthoringError('unsupported temporal kind');
}

function parseDestinationRecord(value, index) {
  const destination = plainRecord(
    value,
    `presence.destinations[${index}]`,
    new Set(['id', 'label', 'href']),
  );
  return {
    id: stableId(destination.id, `presence.destinations[${index}].id`),
    label: scalarString(destination.label, `presence.destinations[${index}].label`),
    href: scalarString(destination.href, `presence.destinations[${index}].href`, { max: 2000 }),
  };
}

function parsePresence(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new V3ActivityAuthoringError('presence must be a typed object');
  }
  if (value.kind === 'PHYSICAL_HOST_DEFAULT' || value.kind === 'NONE') {
    const presence = plainRecord(value, 'presence', new Set(['kind']));
    return { kind: presence.kind };
  }
  if (value.kind === 'ONLINE' || value.kind === 'HYBRID') {
    const presence = plainRecord(value, 'presence', new Set(['kind', 'destinations']));
    if (!Array.isArray(presence.destinations)) {
      throw new V3ActivityAuthoringError('presence.destinations must be an array');
    }
    const destinations = presence.destinations.map(parseDestinationRecord);
    const seen = new Set();
    for (const destination of destinations) {
      if (seen.has(destination.id)) {
        throw new V3ActivityAuthoringError('presence destination ids must be unique');
      }
      seen.add(destination.id);
    }
    return { kind: presence.kind, destinations };
  }
  throw new V3ActivityAuthoringError('unsupported presence kind');
}

function parseAccess(value) {
  const access = plainRecord(value, 'access', new Set(['note', 'capacity']));
  const capacity = scalarString(access.capacity, 'access.capacity', { max: 40 });
  if (!CAPACITIES.has(capacity)) throw new V3ActivityAuthoringError('unsupported access capacity');
  return {
    note: nullableString(access.note, 'access.note', { max: 240 }),
    capacity,
  };
}

function parseLifecycle(value) {
  const lifecycle = scalarString(value, 'lifecycle', { max: 40 });
  if (!LIFECYCLES.has(lifecycle)) throw new V3ActivityAuthoringError('unsupported lifecycle');
  return lifecycle;
}

function parseCommandEnvelope(value, allowedKeys) {
  const command = plainRecord(
    value,
    'command',
    new Set(['schemaVersion', 'type', 'expectedDraftDigest', ...allowedKeys]),
  );
  if (command.schemaVersion !== V3_ACTIVITY_AUTHORING_COMMAND_SCHEMA_VERSION) {
    throw new V3ActivityAuthoringError('unsupported command schema version');
  }
  return command;
}

function parseAddActivityCommand(value) {
  const command = parseCommandEnvelope(value, [
    'target',
    'title',
    'description',
    'lifecycle',
    'temporal',
    'presence',
    'access',
    'destination',
  ]);
  if (command.type !== ADD_ACTIVITY) throw new V3ActivityAuthoringError('unsupported command type');
  return {
    schemaVersion: V3_ACTIVITY_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: ADD_ACTIVITY,
    target: parseListTarget(command.target),
    title: scalarString(command.title, 'title'),
    description: nullableString(command.description, 'description'),
    lifecycle: parseLifecycle(command.lifecycle),
    temporal: parseTemporal(command.temporal),
    presence: parsePresence(command.presence),
    access: parseAccess(command.access),
    destination: parseDestination(command.destination),
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseRemoveActivityCommand(value) {
  const command = parseCommandEnvelope(value, ['target']);
  if (command.type !== REMOVE_ACTIVITY) throw new V3ActivityAuthoringError('unsupported command type');
  return {
    schemaVersion: V3_ACTIVITY_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: REMOVE_ACTIVITY,
    target: parseActivityTarget(command.target),
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseRestoreActivityCommand(value) {
  const command = parseCommandEnvelope(value, [
    'resourceIndex',
    'activitySnapshot',
    'listSnapshots',
  ]);
  if (command.type !== RESTORE_ACTIVITY) throw new V3ActivityAuthoringError('unsupported command type');
  if (!Number.isInteger(command.resourceIndex) || command.resourceIndex < 0) {
    throw new V3ActivityAuthoringError('resourceIndex is invalid');
  }
  if (!command.activitySnapshot || typeof command.activitySnapshot !== 'object' || Array.isArray(command.activitySnapshot)) {
    throw new V3ActivityAuthoringError('activitySnapshot must be a plain object');
  }
  if (!Array.isArray(command.listSnapshots)) {
    throw new V3ActivityAuthoringError('listSnapshots must be an array');
  }
  const listSnapshots = command.listSnapshots.map((entry, index) => {
    const snapshot = plainRecord(
      entry,
      `listSnapshots[${index}]`,
      new Set(['componentId', 'resourceIds']),
    );
    if (!Array.isArray(snapshot.resourceIds)) {
      throw new V3ActivityAuthoringError(`listSnapshots[${index}].resourceIds must be an array`);
    }
    return {
      componentId: stableId(snapshot.componentId, `listSnapshots[${index}].componentId`),
      resourceIds: snapshot.resourceIds.map((id, itemIndex) => (
        stableId(id, `listSnapshots[${index}].resourceIds[${itemIndex}]`)
      )),
    };
  });
  return {
    schemaVersion: V3_ACTIVITY_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: RESTORE_ACTIVITY,
    resourceIndex: command.resourceIndex,
    activitySnapshot: clone(command.activitySnapshot),
    listSnapshots,
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseSetTextCommand(value) {
  const command = parseCommandEnvelope(value, ['target', 'field', 'value']);
  if (command.type !== SET_ACTIVITY_TEXT) throw new V3ActivityAuthoringError('unsupported command type');
  const field = scalarString(command.field, 'field', { max: 40 });
  if (!['title', 'description'].includes(field)) {
    throw new V3ActivityAuthoringError('unsupported activity text field');
  }
  const normalizedValue = field === 'description'
    ? nullableString(command.value, 'value')
    : scalarString(command.value, 'value');
  return {
    schemaVersion: V3_ACTIVITY_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: SET_ACTIVITY_TEXT,
    target: parseActivityTarget(command.target),
    field,
    value: normalizedValue,
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseSetLifecycleCommand(value) {
  const command = parseCommandEnvelope(value, ['target', 'lifecycle']);
  if (command.type !== SET_ACTIVITY_LIFECYCLE) {
    throw new V3ActivityAuthoringError('unsupported command type');
  }
  return {
    schemaVersion: V3_ACTIVITY_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: SET_ACTIVITY_LIFECYCLE,
    target: parseActivityTarget(command.target),
    lifecycle: parseLifecycle(command.lifecycle),
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseSetAccessCommand(value) {
  const command = parseCommandEnvelope(value, ['target', 'access']);
  if (command.type !== SET_ACTIVITY_ACCESS) throw new V3ActivityAuthoringError('unsupported command type');
  return {
    schemaVersion: V3_ACTIVITY_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: SET_ACTIVITY_ACCESS,
    target: parseActivityTarget(command.target),
    access: parseAccess(command.access),
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseSetTemporalCommand(value) {
  const command = parseCommandEnvelope(value, ['target', 'temporal']);
  if (command.type !== SET_ACTIVITY_TEMPORAL) throw new V3ActivityAuthoringError('unsupported command type');
  return {
    schemaVersion: V3_ACTIVITY_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: SET_ACTIVITY_TEMPORAL,
    target: parseActivityTarget(command.target),
    temporal: parseTemporal(command.temporal),
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseSetPresenceCommand(value) {
  const command = parseCommandEnvelope(value, ['target', 'presence']);
  if (command.type !== SET_ACTIVITY_PRESENCE) throw new V3ActivityAuthoringError('unsupported command type');
  return {
    schemaVersion: V3_ACTIVITY_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: SET_ACTIVITY_PRESENCE,
    target: parseActivityTarget(command.target),
    presence: parsePresence(command.presence),
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseMoveReferenceCommand(value) {
  const command = parseCommandEnvelope(value, ['target', 'activityId', 'destination']);
  if (command.type !== MOVE_ACTIVITY_REFERENCE) {
    throw new V3ActivityAuthoringError('unsupported command type');
  }
  return {
    schemaVersion: V3_ACTIVITY_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: MOVE_ACTIVITY_REFERENCE,
    target: parseListTarget(command.target),
    activityId: stableId(command.activityId, 'activityId'),
    destination: parseDestination(command.destination),
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseAddPublicActionCommand(value) {
  const command = parseCommandEnvelope(value, ['target', 'role', 'label', 'href', 'destination']);
  if (command.type !== ADD_ACTIVITY_PUBLIC_ACTION) throw new V3ActivityAuthoringError('unsupported command type');
  const role = scalarString(command.role, 'role', { max: 80 });
  if (!NATIVE_PUBLIC_ACTION_ROLES.has(role)) {
    throw new V3ActivityAuthoringError('public action creation requires a native semantic role');
  }
  return {
    schemaVersion: 1,
    type: ADD_ACTIVITY_PUBLIC_ACTION,
    target: parseActivityTarget(command.target),
    role,
    label: scalarString(command.label, 'label'),
    href: scalarString(command.href, 'href', { max: 2000 }),
    destination: parseActionDestination(command.destination),
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseSetPublicActionCommand(value) {
  const command = parseCommandEnvelope(value, ['target', 'label', 'href']);
  if (command.type !== SET_ACTIVITY_PUBLIC_ACTION) throw new V3ActivityAuthoringError('unsupported command type');
  return {
    schemaVersion: 1,
    type: SET_ACTIVITY_PUBLIC_ACTION,
    target: parseActionTarget(command.target),
    label: scalarString(command.label, 'label'),
    href: scalarString(command.href, 'href', { max: 2000 }),
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseRemovePublicActionCommand(value) {
  const command = parseCommandEnvelope(value, ['target']);
  if (command.type !== REMOVE_ACTIVITY_PUBLIC_ACTION) throw new V3ActivityAuthoringError('unsupported command type');
  return {
    schemaVersion: 1,
    type: REMOVE_ACTIVITY_PUBLIC_ACTION,
    target: parseActionTarget(command.target),
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseRestorePublicActionCommand(value) {
  const command = parseCommandEnvelope(value, ['target', 'index', 'actionSnapshot']);
  if (command.type !== RESTORE_ACTIVITY_PUBLIC_ACTION) throw new V3ActivityAuthoringError('unsupported command type');
  if (!Number.isInteger(command.index) || command.index < 0) {
    throw new V3ActivityAuthoringError('public action restore index is invalid');
  }
  if (!command.actionSnapshot || typeof command.actionSnapshot !== 'object' || Array.isArray(command.actionSnapshot)) {
    throw new V3ActivityAuthoringError('actionSnapshot must be a plain object');
  }
  return {
    schemaVersion: 1,
    type: RESTORE_ACTIVITY_PUBLIC_ACTION,
    target: parseActivityTarget(command.target),
    index: command.index,
    actionSnapshot: clone(command.actionSnapshot),
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseMovePublicActionCommand(value) {
  const command = parseCommandEnvelope(value, ['target', 'destination']);
  if (command.type !== MOVE_ACTIVITY_PUBLIC_ACTION) throw new V3ActivityAuthoringError('unsupported command type');
  return {
    schemaVersion: 1,
    type: MOVE_ACTIVITY_PUBLIC_ACTION,
    target: parseActionTarget(command.target),
    destination: parseActionDestination(command.destination),
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseAddManagedMediaCommand(value) {
  const command = parseCommandEnvelope(value, ['target', 'assetId', 'role', 'destination']);
  if (command.type !== ADD_ACTIVITY_MANAGED_MEDIA) throw new V3ActivityAuthoringError('unsupported command type');
  if (command.role !== 'PROMO') {
    throw new V3ActivityAuthoringError('managed media creation admits PROMO only');
  }
  return {
    schemaVersion: 1,
    type: ADD_ACTIVITY_MANAGED_MEDIA,
    target: parseActivityTarget(command.target),
    assetId: stableId(command.assetId, 'assetId'),
    role: 'PROMO',
    destination: parseManagedMediaDestination(command.destination),
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseRemoveManagedMediaCommand(value) {
  const command = parseCommandEnvelope(value, ['target']);
  if (command.type !== REMOVE_ACTIVITY_MANAGED_MEDIA) throw new V3ActivityAuthoringError('unsupported command type');
  return {
    schemaVersion: 1,
    type: REMOVE_ACTIVITY_MANAGED_MEDIA,
    target: parseManagedMediaTarget(command.target),
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseRestoreManagedMediaCommand(value) {
  const command = parseCommandEnvelope(value, ['target', 'index', 'mediaSnapshot']);
  if (command.type !== RESTORE_ACTIVITY_MANAGED_MEDIA) throw new V3ActivityAuthoringError('unsupported command type');
  if (!Number.isInteger(command.index) || command.index < 0) {
    throw new V3ActivityAuthoringError('managed media restore index is invalid');
  }
  return {
    schemaVersion: 1,
    type: RESTORE_ACTIVITY_MANAGED_MEDIA,
    target: parseActivityTarget(command.target),
    index: command.index,
    mediaSnapshot: parseManagedMediaIdentity(command.mediaSnapshot, 'mediaSnapshot'),
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseMoveManagedMediaCommand(value) {
  const command = parseCommandEnvelope(value, ['target', 'destination']);
  if (command.type !== MOVE_ACTIVITY_MANAGED_MEDIA) throw new V3ActivityAuthoringError('unsupported command type');
  return {
    schemaVersion: 1,
    type: MOVE_ACTIVITY_MANAGED_MEDIA,
    target: parseManagedMediaTarget(command.target),
    destination: parseManagedMediaDestination(command.destination),
    expectedDraftDigest: digest(command.expectedDraftDigest),
  };
}

function parseActivityAuthoringCommand(value, { allowInternal = false } = {}) {
  const root = plainRecord(
    value,
    'command',
    new Set([
      'schemaVersion',
      'type',
      'expectedDraftDigest',
      'target',
      'title',
      'description',
      'lifecycle',
      'temporal',
      'presence',
      'access',
      'destination',
      'field',
      'value',
      'activityId',
      'resourceIndex',
      'activitySnapshot',
      'listSnapshots',
      'role',
      'label',
      'href',
      'assetId',
      'index',
      'actionSnapshot',
      'mediaSnapshot',
    ]),
  );
  if (root.type === ADD_ACTIVITY) return parseAddActivityCommand(value);
  if (root.type === REMOVE_ACTIVITY) return parseRemoveActivityCommand(value);
  if (root.type === SET_ACTIVITY_TEXT) return parseSetTextCommand(value);
  if (root.type === SET_ACTIVITY_LIFECYCLE) return parseSetLifecycleCommand(value);
  if (root.type === SET_ACTIVITY_ACCESS) return parseSetAccessCommand(value);
  if (root.type === SET_ACTIVITY_TEMPORAL) return parseSetTemporalCommand(value);
  if (root.type === SET_ACTIVITY_PRESENCE) return parseSetPresenceCommand(value);
  if (root.type === MOVE_ACTIVITY_REFERENCE) return parseMoveReferenceCommand(value);
  if (root.type === ADD_ACTIVITY_PUBLIC_ACTION) return parseAddPublicActionCommand(value);
  if (root.type === SET_ACTIVITY_PUBLIC_ACTION) return parseSetPublicActionCommand(value);
  if (root.type === REMOVE_ACTIVITY_PUBLIC_ACTION) return parseRemovePublicActionCommand(value);
  if (root.type === MOVE_ACTIVITY_PUBLIC_ACTION) return parseMovePublicActionCommand(value);
  if (root.type === ADD_ACTIVITY_MANAGED_MEDIA) return parseAddManagedMediaCommand(value);
  if (root.type === REMOVE_ACTIVITY_MANAGED_MEDIA) return parseRemoveManagedMediaCommand(value);
  if (root.type === MOVE_ACTIVITY_MANAGED_MEDIA) return parseMoveManagedMediaCommand(value);
  if (root.type === RESTORE_ACTIVITY && allowInternal) return parseRestoreActivityCommand(value);
  if (root.type === RESTORE_ACTIVITY_PUBLIC_ACTION && allowInternal) return parseRestorePublicActionCommand(value);
  if (root.type === RESTORE_ACTIVITY_MANAGED_MEDIA && allowInternal) return parseRestoreManagedMediaCommand(value);
  throw new V3ActivityAuthoringError('unsupported command type');
}

function findActivity(source, activityId) {
  const indexes = [];
  source.resources.activities.forEach((activity, index) => {
    if (activity.id === activityId) indexes.push(index);
  });
  if (indexes.length !== 1) throw new V3ActivityAuthoringError('activity identity is missing or ambiguous');
  const index = indexes[0];
  return { activity: source.resources.activities[index], index };
}

function findPublicAction(activity, actionId) {
  const indexes = [];
  activity.publicActions.forEach((action, index) => {
    if (action.id === actionId) indexes.push(index);
  });
  if (indexes.length !== 1) throw new V3ActivityAuthoringError('public action identity is missing or ambiguous');
  const index = indexes[0];
  return { action: activity.publicActions[index], index };
}

function mediaKey(value) {
  return `${value.assetId}\0${value.role}`;
}

function findManagedMedia(activity, identity) {
  const key = mediaKey(identity);
  const indexes = [];
  activity.managedMedia.forEach((media, index) => {
    if (mediaKey(media) === key) indexes.push(index);
  });
  if (indexes.length !== 1) throw new V3ActivityAuthoringError('managed media identity is missing or ambiguous');
  const index = indexes[0];
  return { media: activity.managedMedia[index], index };
}

function activityLists(source) {
  const matches = [];
  source.site.pages.forEach((page, pageIndex) => {
    page.components.forEach((component, componentIndex) => {
      if (component.kind === 'activity-list') {
        matches.push({ page, pageIndex, component, componentIndex });
      }
    });
  });
  return matches;
}

function findActivityList(source, componentId) {
  const matches = activityLists(source).filter((match) => match.component.id === componentId);
  if (matches.length !== 1) {
    throw new V3ActivityAuthoringError('activity-list component identity is missing or ambiguous');
  }
  return matches[0];
}

function deriveActivityIdentity(source, title) {
  const normalized = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/g, '');
  if (!normalized || !ID_PATTERN.test(normalized)) {
    throw new V3ActivityAuthoringError('title cannot produce a stable activity identity');
  }
  const usedIds = new Set(source.resources.activities.map((activity) => activity.id));
  const usedSlugs = new Set(source.resources.activities.map((activity) => activity.slug));
  for (let suffix = 1; suffix <= 9999; suffix += 1) {
    const candidate = suffix === 1 ? normalized : `${normalized}-${suffix}`;
    if (!usedIds.has(candidate) && !usedSlugs.has(candidate)) {
      return { id: candidate, slug: candidate };
    }
  }
  throw new V3ActivityAuthoringError('activity identity space is exhausted');
}

function derivePublicActionIdentity(activity, role) {
  const base = `action:${activity.id}:${role.toLowerCase()}`;
  const used = new Set(activity.publicActions.map((action) => action.id));
  for (let suffix = 1; suffix <= 9999; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new V3ActivityAuthoringError('public action identity space is exhausted');
}

function destinationInsertIndex(resourceIds, destination, movingId = null) {
  const remaining = movingId === null
    ? [...resourceIds]
    : resourceIds.filter((id) => id !== movingId);
  if (destination.kind === END_OF_ACTIVITY_LIST) return remaining.length;
  const index = remaining.indexOf(destination.beforeActivityId);
  if (index < 0) throw new V3ActivityAuthoringError('destination activity reference does not exist');
  return index;
}

function insertReference(resourceIds, activityId, destination, movingId = null) {
  const remaining = movingId === null
    ? [...resourceIds]
    : resourceIds.filter((id) => id !== movingId);
  const index = destinationInsertIndex(resourceIds, destination, movingId);
  remaining.splice(index, 0, activityId);
  return remaining;
}

function inverseDestination(resourceIds, activityId) {
  const index = resourceIds.indexOf(activityId);
  if (index < 0) throw new V3ActivityAuthoringError('activity reference does not exist');
  const next = resourceIds[index + 1];
  return next
    ? { kind: BEFORE_ACTIVITY_REFERENCE, beforeActivityId: next }
    : { kind: END_OF_ACTIVITY_LIST };
}

function actionDestinationInsertIndex(actions, destination, movingId = null) {
  const remaining = movingId === null ? [...actions] : actions.filter((action) => action.id !== movingId);
  if (destination.kind === END_OF_PUBLIC_ACTIONS) return remaining.length;
  const index = remaining.findIndex((action) => action.id === destination.beforeActionId);
  if (index < 0) throw new V3ActivityAuthoringError('destination public action does not exist');
  return index;
}

function insertPublicAction(actions, action, destination, movingId = null) {
  const remaining = movingId === null ? [...actions] : actions.filter((entry) => entry.id !== movingId);
  const index = actionDestinationInsertIndex(actions, destination, movingId);
  remaining.splice(index, 0, action);
  return remaining;
}

function inverseActionDestination(actions, actionId) {
  const index = actions.findIndex((action) => action.id === actionId);
  if (index < 0) throw new V3ActivityAuthoringError('public action does not exist');
  const next = actions[index + 1];
  return next ? { kind: BEFORE_PUBLIC_ACTION, beforeActionId: next.id } : { kind: END_OF_PUBLIC_ACTIONS };
}

function mediaDestinationInsertIndex(media, destination, movingKey = null) {
  const remaining = movingKey === null ? [...media] : media.filter((entry) => mediaKey(entry) !== movingKey);
  if (destination.kind === END_OF_MANAGED_MEDIA) return remaining.length;
  const beforeKey = mediaKey({ assetId: destination.beforeAssetId, role: destination.beforeRole });
  const index = remaining.findIndex((entry) => mediaKey(entry) === beforeKey);
  if (index < 0) throw new V3ActivityAuthoringError('destination managed media does not exist');
  return index;
}

function insertManagedMedia(media, usage, destination, movingKey = null) {
  const remaining = movingKey === null ? [...media] : media.filter((entry) => mediaKey(entry) !== movingKey);
  const index = mediaDestinationInsertIndex(media, destination, movingKey);
  remaining.splice(index, 0, usage);
  return remaining;
}

function inverseManagedMediaDestination(media, identity) {
  const key = mediaKey(identity);
  const index = media.findIndex((entry) => mediaKey(entry) === key);
  if (index < 0) throw new V3ActivityAuthoringError('managed media does not exist');
  const next = media[index + 1];
  return next
    ? { kind: BEFORE_MANAGED_MEDIA, beforeAssetId: next.assetId, beforeRole: next.role }
    : { kind: END_OF_MANAGED_MEDIA };
}

function validateCandidate(candidate) {
  try {
    return createV3DeploymentAgnosticVenueSource(candidate);
  } catch (error) {
    throw new V3ActivityAuthoringError(error.message, { cause: error });
  }
}

function transitionAdd(source, command, beforeDigest) {
  const list = findActivityList(source, command.target.componentId);
  const identity = deriveActivityIdentity(source, command.title);
  const activity = {
    id: identity.id,
    slug: identity.slug,
    title: command.title,
    description: command.description,
    temporal: clone(command.temporal),
    lifecycle: command.lifecycle,
    presence: clone(command.presence),
    access: clone(command.access),
    managedMedia: [],
    publicActions: [],
    seriesRef: null,
  };
  const candidate = clone(source);
  candidate.resources.activities.push(activity);
  const ids = candidate.site.pages[list.pageIndex].components[list.componentIndex].content.resourceIds;
  candidate.site.pages[list.pageIndex].components[list.componentIndex].content.resourceIds = insertReference(
    ids,
    activity.id,
    command.destination,
  );
  const afterSource = validateCandidate(candidate);
  const afterDigest = deriveV3DeploymentAgnosticVenueSourceDigest(afterSource);
  const validatedCommand = deepFreeze({ ...command, target: { ...command.target } });
  const inverseCommand = deepFreeze({
    schemaVersion: V3_ACTIVITY_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: REMOVE_ACTIVITY,
    target: { activityId: activity.id },
    expectedDraftDigest: afterDigest,
  });
  return deepFreeze({
    command: validatedCommand,
    inverseCommand,
    beforeDigest,
    afterDigest,
    afterSource,
    resolvedTarget: {
      activityId: activity.id,
      slug: activity.slug,
      componentId: list.component.id,
      sourcePointer: '/resources/activities',
    },
  });
}

function transitionRemove(source, command, beforeDigest) {
  const found = findActivity(source, command.target.activityId);
  const snapshots = [];
  const candidate = clone(source);
  for (const list of activityLists(source)) {
    if (list.component.content.resourceIds.includes(found.activity.id)) {
      snapshots.push({
        componentId: list.component.id,
        resourceIds: [...list.component.content.resourceIds],
      });
      const ids = candidate.site.pages[list.pageIndex].components[list.componentIndex].content.resourceIds;
      candidate.site.pages[list.pageIndex].components[list.componentIndex].content.resourceIds = ids.filter(
        (id) => id !== found.activity.id,
      );
    }
  }
  candidate.resources.activities.splice(found.index, 1);
  const afterSource = validateCandidate(candidate);
  const afterDigest = deriveV3DeploymentAgnosticVenueSourceDigest(afterSource);
  const inverseCommand = deepFreeze({
    schemaVersion: V3_ACTIVITY_AUTHORING_COMMAND_SCHEMA_VERSION,
    type: RESTORE_ACTIVITY,
    resourceIndex: found.index,
    activitySnapshot: clone(found.activity),
    listSnapshots: snapshots,
    expectedDraftDigest: afterDigest,
  });
  return deepFreeze({
    command: deepFreeze({ ...command, target: { ...command.target } }),
    inverseCommand,
    beforeDigest,
    afterDigest,
    afterSource,
    resolvedTarget: {
      activityId: found.activity.id,
      slug: found.activity.slug,
      affectedLists: snapshots.map((snapshot) => snapshot.componentId),
      sourcePointer: `/resources/activities/${found.index}`,
    },
  });
}

function transitionRestore(source, command, beforeDigest) {
  if (command.resourceIndex > source.resources.activities.length) {
    throw new V3ActivityAuthoringError('restore resource index is outside the collection');
  }
  const candidate = clone(source);
  candidate.resources.activities.splice(command.resourceIndex, 0, clone(command.activitySnapshot));
  for (const snapshot of command.listSnapshots) {
    const list = findActivityList(source, snapshot.componentId);
    candidate.site.pages[list.pageIndex].components[list.componentIndex].content.resourceIds = [
      ...snapshot.resourceIds,
    ];
  }
  const afterSource = validateCandidate(candidate);
  const afterDigest = deriveV3DeploymentAgnosticVenueSourceDigest(afterSource);
  return deepFreeze({
    command: deepFreeze(clone(command)),
    inverseCommand: null,
    beforeDigest,
    afterDigest,
    afterSource,
    resolvedTarget: {
      activityId: command.activitySnapshot.id,
      slug: command.activitySnapshot.slug,
      sourcePointer: `/resources/activities/${command.resourceIndex}`,
    },
  });
}

function transitionField(source, command, beforeDigest) {
  const found = findActivity(source, command.target.activityId);
  const candidate = clone(source);
  const activity = candidate.resources.activities[found.index];
  let previous;
  let inverse;

  if (command.type === SET_ACTIVITY_TEXT) {
    previous = activity[command.field];
    activity[command.field] = command.value;
    inverse = {
      schemaVersion: 1,
      type: SET_ACTIVITY_TEXT,
      target: { activityId: activity.id },
      field: command.field,
      value: previous,
    };
  } else if (command.type === SET_ACTIVITY_LIFECYCLE) {
    previous = activity.lifecycle;
    activity.lifecycle = command.lifecycle;
    inverse = {
      schemaVersion: 1,
      type: SET_ACTIVITY_LIFECYCLE,
      target: { activityId: activity.id },
      lifecycle: previous,
    };
  } else if (command.type === SET_ACTIVITY_ACCESS) {
    previous = clone(activity.access);
    activity.access = clone(command.access);
    inverse = {
      schemaVersion: 1,
      type: SET_ACTIVITY_ACCESS,
      target: { activityId: activity.id },
      access: previous,
    };
  } else if (command.type === SET_ACTIVITY_TEMPORAL) {
    previous = clone(activity.temporal);
    activity.temporal = clone(command.temporal);
    inverse = {
      schemaVersion: 1,
      type: SET_ACTIVITY_TEMPORAL,
      target: { activityId: activity.id },
      temporal: previous,
    };
  } else if (command.type === SET_ACTIVITY_PRESENCE) {
    previous = clone(activity.presence);
    activity.presence = clone(command.presence);
    inverse = {
      schemaVersion: 1,
      type: SET_ACTIVITY_PRESENCE,
      target: { activityId: activity.id },
      presence: previous,
    };
  } else {
    throw new V3ActivityAuthoringError('unsupported activity field transition');
  }

  const afterSource = validateCandidate(candidate);
  const afterDigest = deriveV3DeploymentAgnosticVenueSourceDigest(afterSource);
  if (afterDigest === beforeDigest) throw new V3ActivityAuthoringError('activity change is a no-op');
  inverse.expectedDraftDigest = afterDigest;
  return deepFreeze({
    command: deepFreeze(clone(command)),
    inverseCommand: deepFreeze(inverse),
    beforeDigest,
    afterDigest,
    afterSource,
    resolvedTarget: {
      activityId: found.activity.id,
      slug: found.activity.slug,
      field: command.field || command.type,
      sourcePointer: `/resources/activities/${found.index}`,
    },
  });
}

function transitionMoveReference(source, command, beforeDigest) {
  findActivity(source, command.activityId);
  const list = findActivityList(source, command.target.componentId);
  const originalIds = [...list.component.content.resourceIds];
  if (!originalIds.includes(command.activityId)) {
    throw new V3ActivityAuthoringError('activity is not referenced by the selected activity-list');
  }
  if (
    command.destination.kind === BEFORE_ACTIVITY_REFERENCE
    && command.destination.beforeActivityId === command.activityId
  ) {
    throw new V3ActivityAuthoringError('activity-list move cannot target itself');
  }
  const oldDestination = inverseDestination(originalIds, command.activityId);
  const moved = insertReference(originalIds, command.activityId, command.destination, command.activityId);
  if (JSON.stringify(moved) === JSON.stringify(originalIds)) {
    throw new V3ActivityAuthoringError('activity-list move is a no-op');
  }
  const candidate = clone(source);
  candidate.site.pages[list.pageIndex].components[list.componentIndex].content.resourceIds = moved;
  const afterSource = validateCandidate(candidate);
  const afterDigest = deriveV3DeploymentAgnosticVenueSourceDigest(afterSource);
  const inverseCommand = deepFreeze({
    schemaVersion: 1,
    type: MOVE_ACTIVITY_REFERENCE,
    target: { componentId: list.component.id },
    activityId: command.activityId,
    destination: oldDestination,
    expectedDraftDigest: afterDigest,
  });
  return deepFreeze({
    command: deepFreeze(clone(command)),
    inverseCommand,
    beforeDigest,
    afterDigest,
    afterSource,
    resolvedTarget: {
      activityId: command.activityId,
      componentId: list.component.id,
      sourcePointer: `/site/pages/${list.pageIndex}/components/${list.componentIndex}/content/resourceIds`,
    },
  });
}

function transitionAddPublicAction(source, command, beforeDigest) {
  const found = findActivity(source, command.target.activityId);
  const action = {
    id: derivePublicActionIdentity(found.activity, command.role),
    role: command.role,
    label: command.label,
    href: command.href,
  };
  const candidate = clone(source);
  candidate.resources.activities[found.index].publicActions = insertPublicAction(
    candidate.resources.activities[found.index].publicActions,
    action,
    command.destination,
  );
  const afterSource = validateCandidate(candidate);
  const afterDigest = deriveV3DeploymentAgnosticVenueSourceDigest(afterSource);
  const inverseCommand = deepFreeze({
    schemaVersion: 1,
    type: REMOVE_ACTIVITY_PUBLIC_ACTION,
    target: { activityId: found.activity.id, actionId: action.id },
    expectedDraftDigest: afterDigest,
  });
  return deepFreeze({
    command: deepFreeze(clone(command)), inverseCommand, beforeDigest, afterDigest, afterSource,
    resolvedTarget: { activityId: found.activity.id, actionId: action.id, sourcePointer: `/resources/activities/${found.index}/publicActions` },
  });
}

function transitionSetPublicAction(source, command, beforeDigest) {
  const found = findActivity(source, command.target.activityId);
  const located = findPublicAction(found.activity, command.target.actionId);
  const candidate = clone(source);
  const action = candidate.resources.activities[found.index].publicActions[located.index];
  const previous = { label: action.label, href: action.href };
  action.label = command.label;
  action.href = command.href;
  const afterSource = validateCandidate(candidate);
  const afterDigest = deriveV3DeploymentAgnosticVenueSourceDigest(afterSource);
  if (afterDigest === beforeDigest) throw new V3ActivityAuthoringError('public action change is a no-op');
  const inverseCommand = deepFreeze({
    schemaVersion: 1,
    type: SET_ACTIVITY_PUBLIC_ACTION,
    target: clone(command.target),
    label: previous.label,
    href: previous.href,
    expectedDraftDigest: afterDigest,
  });
  return deepFreeze({
    command: deepFreeze(clone(command)), inverseCommand, beforeDigest, afterDigest, afterSource,
    resolvedTarget: { activityId: found.activity.id, actionId: located.action.id, role: located.action.role, sourcePointer: `/resources/activities/${found.index}/publicActions/${located.index}` },
  });
}

function transitionRemovePublicAction(source, command, beforeDigest) {
  const found = findActivity(source, command.target.activityId);
  const located = findPublicAction(found.activity, command.target.actionId);
  const candidate = clone(source);
  candidate.resources.activities[found.index].publicActions.splice(located.index, 1);
  const afterSource = validateCandidate(candidate);
  const afterDigest = deriveV3DeploymentAgnosticVenueSourceDigest(afterSource);
  const inverseCommand = deepFreeze({
    schemaVersion: 1,
    type: RESTORE_ACTIVITY_PUBLIC_ACTION,
    target: { activityId: found.activity.id },
    index: located.index,
    actionSnapshot: clone(located.action),
    expectedDraftDigest: afterDigest,
  });
  return deepFreeze({
    command: deepFreeze(clone(command)), inverseCommand, beforeDigest, afterDigest, afterSource,
    resolvedTarget: { activityId: found.activity.id, actionId: located.action.id, sourcePointer: `/resources/activities/${found.index}/publicActions/${located.index}` },
  });
}

function transitionRestorePublicAction(source, command, beforeDigest) {
  const found = findActivity(source, command.target.activityId);
  if (command.index > found.activity.publicActions.length) throw new V3ActivityAuthoringError('public action restore index is outside the collection');
  const candidate = clone(source);
  candidate.resources.activities[found.index].publicActions.splice(command.index, 0, clone(command.actionSnapshot));
  const afterSource = validateCandidate(candidate);
  const afterDigest = deriveV3DeploymentAgnosticVenueSourceDigest(afterSource);
  return deepFreeze({ command: deepFreeze(clone(command)), inverseCommand: null, beforeDigest, afterDigest, afterSource, resolvedTarget: { activityId: found.activity.id, actionId: command.actionSnapshot.id, sourcePointer: `/resources/activities/${found.index}/publicActions/${command.index}` } });
}

function transitionMovePublicAction(source, command, beforeDigest) {
  const found = findActivity(source, command.target.activityId);
  findPublicAction(found.activity, command.target.actionId);
  if (command.destination.kind === BEFORE_PUBLIC_ACTION && command.destination.beforeActionId === command.target.actionId) {
    throw new V3ActivityAuthoringError('public action move cannot target itself');
  }
  const original = [...found.activity.publicActions];
  const oldDestination = inverseActionDestination(original, command.target.actionId);
  const moving = original.find((action) => action.id === command.target.actionId);
  const moved = insertPublicAction(original, moving, command.destination, command.target.actionId);
  if (JSON.stringify(moved) === JSON.stringify(original)) throw new V3ActivityAuthoringError('public action move is a no-op');
  const candidate = clone(source);
  candidate.resources.activities[found.index].publicActions = moved;
  const afterSource = validateCandidate(candidate);
  const afterDigest = deriveV3DeploymentAgnosticVenueSourceDigest(afterSource);
  const inverseCommand = deepFreeze({ schemaVersion: 1, type: MOVE_ACTIVITY_PUBLIC_ACTION, target: clone(command.target), destination: oldDestination, expectedDraftDigest: afterDigest });
  return deepFreeze({ command: deepFreeze(clone(command)), inverseCommand, beforeDigest, afterDigest, afterSource, resolvedTarget: { activityId: found.activity.id, actionId: command.target.actionId, sourcePointer: `/resources/activities/${found.index}/publicActions` } });
}

function transitionAddManagedMedia(source, command, beforeDigest) {
  const found = findActivity(source, command.target.activityId);
  const usage = { assetId: command.assetId, role: command.role };
  const candidate = clone(source);
  candidate.resources.activities[found.index].managedMedia = insertManagedMedia(
    candidate.resources.activities[found.index].managedMedia,
    usage,
    command.destination,
  );
  const afterSource = validateCandidate(candidate);
  const afterDigest = deriveV3DeploymentAgnosticVenueSourceDigest(afterSource);
  const inverseCommand = deepFreeze({ schemaVersion: 1, type: REMOVE_ACTIVITY_MANAGED_MEDIA, target: { activityId: found.activity.id, assetId: usage.assetId, role: usage.role }, expectedDraftDigest: afterDigest });
  return deepFreeze({ command: deepFreeze(clone(command)), inverseCommand, beforeDigest, afterDigest, afterSource, resolvedTarget: { activityId: found.activity.id, assetId: usage.assetId, role: usage.role, sourcePointer: `/resources/activities/${found.index}/managedMedia` } });
}

function transitionRemoveManagedMedia(source, command, beforeDigest) {
  const found = findActivity(source, command.target.activityId);
  const located = findManagedMedia(found.activity, command.target);
  const candidate = clone(source);
  candidate.resources.activities[found.index].managedMedia.splice(located.index, 1);
  const afterSource = validateCandidate(candidate);
  const afterDigest = deriveV3DeploymentAgnosticVenueSourceDigest(afterSource);
  const inverseCommand = deepFreeze({ schemaVersion: 1, type: RESTORE_ACTIVITY_MANAGED_MEDIA, target: { activityId: found.activity.id }, index: located.index, mediaSnapshot: clone(located.media), expectedDraftDigest: afterDigest });
  return deepFreeze({ command: deepFreeze(clone(command)), inverseCommand, beforeDigest, afterDigest, afterSource, resolvedTarget: { activityId: found.activity.id, assetId: located.media.assetId, role: located.media.role, sourcePointer: `/resources/activities/${found.index}/managedMedia/${located.index}` } });
}

function transitionRestoreManagedMedia(source, command, beforeDigest) {
  const found = findActivity(source, command.target.activityId);
  if (command.index > found.activity.managedMedia.length) throw new V3ActivityAuthoringError('managed media restore index is outside the collection');
  const candidate = clone(source);
  candidate.resources.activities[found.index].managedMedia.splice(command.index, 0, clone(command.mediaSnapshot));
  const afterSource = validateCandidate(candidate);
  const afterDigest = deriveV3DeploymentAgnosticVenueSourceDigest(afterSource);
  return deepFreeze({ command: deepFreeze(clone(command)), inverseCommand: null, beforeDigest, afterDigest, afterSource, resolvedTarget: { activityId: found.activity.id, assetId: command.mediaSnapshot.assetId, role: command.mediaSnapshot.role, sourcePointer: `/resources/activities/${found.index}/managedMedia/${command.index}` } });
}

function transitionMoveManagedMedia(source, command, beforeDigest) {
  const found = findActivity(source, command.target.activityId);
  const located = findManagedMedia(found.activity, command.target);
  const movingKey = mediaKey(located.media);
  if (command.destination.kind === BEFORE_MANAGED_MEDIA && mediaKey({ assetId: command.destination.beforeAssetId, role: command.destination.beforeRole }) === movingKey) {
    throw new V3ActivityAuthoringError('managed media move cannot target itself');
  }
  const original = [...found.activity.managedMedia];
  const oldDestination = inverseManagedMediaDestination(original, located.media);
  const moved = insertManagedMedia(original, located.media, command.destination, movingKey);
  if (JSON.stringify(moved) === JSON.stringify(original)) throw new V3ActivityAuthoringError('managed media move is a no-op');
  const candidate = clone(source);
  candidate.resources.activities[found.index].managedMedia = moved;
  const afterSource = validateCandidate(candidate);
  const afterDigest = deriveV3DeploymentAgnosticVenueSourceDigest(afterSource);
  const inverseCommand = deepFreeze({ schemaVersion: 1, type: MOVE_ACTIVITY_MANAGED_MEDIA, target: clone(command.target), destination: oldDestination, expectedDraftDigest: afterDigest });
  return deepFreeze({ command: deepFreeze(clone(command)), inverseCommand, beforeDigest, afterDigest, afterSource, resolvedTarget: { activityId: found.activity.id, assetId: located.media.assetId, role: located.media.role, sourcePointer: `/resources/activities/${found.index}/managedMedia` } });
}

function commandTransition(sourceInput, commandInput, { allowInternal = false } = {}) {
  const source = createV3DeploymentAgnosticVenueSource(sourceInput);
  const command = parseActivityAuthoringCommand(commandInput, { allowInternal });
  const beforeDigest = deriveV3DeploymentAgnosticVenueSourceDigest(source);
  if (command.expectedDraftDigest !== beforeDigest) {
    throw new V3ActivityAuthoringError('stale expected draft digest');
  }
  if (command.type === ADD_ACTIVITY) return transitionAdd(source, command, beforeDigest);
  if (command.type === REMOVE_ACTIVITY) return transitionRemove(source, command, beforeDigest);
  if (command.type === RESTORE_ACTIVITY && allowInternal) return transitionRestore(source, command, beforeDigest);
  if (command.type === MOVE_ACTIVITY_REFERENCE) return transitionMoveReference(source, command, beforeDigest);
  if (command.type === ADD_ACTIVITY_PUBLIC_ACTION) return transitionAddPublicAction(source, command, beforeDigest);
  if (command.type === SET_ACTIVITY_PUBLIC_ACTION) return transitionSetPublicAction(source, command, beforeDigest);
  if (command.type === REMOVE_ACTIVITY_PUBLIC_ACTION) return transitionRemovePublicAction(source, command, beforeDigest);
  if (command.type === RESTORE_ACTIVITY_PUBLIC_ACTION && allowInternal) return transitionRestorePublicAction(source, command, beforeDigest);
  if (command.type === MOVE_ACTIVITY_PUBLIC_ACTION) return transitionMovePublicAction(source, command, beforeDigest);
  if (command.type === ADD_ACTIVITY_MANAGED_MEDIA) return transitionAddManagedMedia(source, command, beforeDigest);
  if (command.type === REMOVE_ACTIVITY_MANAGED_MEDIA) return transitionRemoveManagedMedia(source, command, beforeDigest);
  if (command.type === RESTORE_ACTIVITY_MANAGED_MEDIA && allowInternal) return transitionRestoreManagedMedia(source, command, beforeDigest);
  if (command.type === MOVE_ACTIVITY_MANAGED_MEDIA) return transitionMoveManagedMedia(source, command, beforeDigest);
  return transitionField(source, command, beforeDigest);
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
  if (entry.kind !== 'hivenues-v3-activity-authoring-history-entry') {
    throw new V3ActivityAuthoringError('history entry kind is invalid');
  }
  if (entry.schemaVersion !== V3_ACTIVITY_AUTHORING_HISTORY_SCHEMA_VERSION) {
    throw new V3ActivityAuthoringError('history entry schema version is invalid');
  }
  const beforeSource = createV3DeploymentAgnosticVenueSource(entry.beforeSource);
  const afterSource = createV3DeploymentAgnosticVenueSource(entry.afterSource);
  const beforeDigest = deriveV3DeploymentAgnosticVenueSourceDigest(beforeSource);
  const afterDigest = deriveV3DeploymentAgnosticVenueSourceDigest(afterSource);
  if (beforeDigest !== expectedBeforeDigest) {
    throw new V3ActivityAuthoringError('history chain continuity is invalid');
  }
  if (entry.beforeDigest !== beforeDigest || entry.afterDigest !== afterDigest) {
    throw new V3ActivityAuthoringError('history source/digest binding is invalid');
  }
  const forward = commandTransition(beforeSource, entry.command);
  if (
    forward.afterDigest !== afterDigest
    || serializeV3DeploymentAgnosticVenueSource(forward.afterSource)
      !== serializeV3DeploymentAgnosticVenueSource(afterSource)
  ) {
    throw new V3ActivityAuthoringError('history forward command binding is invalid');
  }
  if (JSON.stringify(forward.inverseCommand) !== JSON.stringify(entry.inverseCommand)) {
    throw new V3ActivityAuthoringError('history inverse command binding is invalid');
  }
  const inverse = commandTransition(afterSource, entry.inverseCommand, { allowInternal: true });
  if (
    inverse.afterDigest !== beforeDigest
    || serializeV3DeploymentAgnosticVenueSource(inverse.afterSource)
      !== serializeV3DeploymentAgnosticVenueSource(beforeSource)
  ) {
    throw new V3ActivityAuthoringError('history inverse/source binding is invalid');
  }
  return deepFreeze({
    kind: 'hivenues-v3-activity-authoring-history-entry',
    schemaVersion: V3_ACTIVITY_AUTHORING_HISTORY_SCHEMA_VERSION,
    command: forward.command,
    inverseCommand: forward.inverseCommand,
    beforeDigest,
    afterDigest,
    beforeSource,
    afterSource,
  });
}

function makeSession({ baselineSource, draftSource, history, historyIndex }) {
  const baseline = createV3DeploymentAgnosticVenueSource(baselineSource);
  const draft = createV3DeploymentAgnosticVenueSource(draftSource);
  const baselineDigest = deriveV3DeploymentAgnosticVenueSourceDigest(baseline);
  const draftDigest = deriveV3DeploymentAgnosticVenueSourceDigest(draft);
  if (!Array.isArray(history)) throw new V3ActivityAuthoringError('history must be an array');
  const validatedHistory = [];
  let expected = baselineDigest;
  for (const entry of history) {
    const validated = validateHistoryEntry(entry, expected);
    validatedHistory.push(validated);
    expected = validated.afterDigest;
  }
  if (!Number.isInteger(historyIndex) || historyIndex < 0 || historyIndex > validatedHistory.length) {
    throw new V3ActivityAuthoringError('history index is invalid');
  }
  const expectedDraftDigest = historyIndex === 0
    ? baselineDigest
    : validatedHistory[historyIndex - 1].afterDigest;
  if (draftDigest !== expectedDraftDigest) {
    throw new V3ActivityAuthoringError('accepted draft is not bound to history position');
  }
  return deepFreeze({
    kind: 'hivenues-v3-activity-authoring-session',
    schemaVersion: V3_ACTIVITY_AUTHORING_SESSION_SCHEMA_VERSION,
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
  if (
    !value
    || typeof value !== 'object'
    || value.kind !== 'hivenues-v3-activity-authoring-session'
    || value.schemaVersion !== V3_ACTIVITY_AUTHORING_SESSION_SCHEMA_VERSION
  ) {
    throw new V3ActivityAuthoringError('authoring session is invalid');
  }
  const session = makeSession({
    baselineSource: value.baselineSource,
    draftSource: value.draftSource,
    history: value.history,
    historyIndex: value.historyIndex,
  });
  if (session.baselineDigest !== value.baselineDigest || session.draftDigest !== value.draftDigest) {
    throw new V3ActivityAuthoringError('authoring session digest binding is invalid');
  }
  return session;
}

function createV3ActivityAuthoringSession(sourceInput) {
  const source = createV3DeploymentAgnosticVenueSource(sourceInput);
  return makeSession({ baselineSource: source, draftSource: source, history: [], historyIndex: 0 });
}

function proposeV3ActivityAuthoringCommand(sessionInput, commandInput) {
  const session = assertSession(sessionInput);
  const transition = commandTransition(session.draftSource, commandInput);
  return deepFreeze({
    kind: 'hivenues-v3-activity-authoring-proposal',
    schemaVersion: V3_ACTIVITY_AUTHORING_PROPOSAL_SCHEMA_VERSION,
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

function verifyProposal(session, value) {
  if (
    !value
    || typeof value !== 'object'
    || value.kind !== 'hivenues-v3-activity-authoring-proposal'
    || value.schemaVersion !== V3_ACTIVITY_AUTHORING_PROPOSAL_SCHEMA_VERSION
    || value.status !== 'PREVIEW_NOT_APPLIED'
  ) {
    throw new V3ActivityAuthoringError('proposal is invalid');
  }
  const rebuilt = proposeV3ActivityAuthoringCommand(session, value.command);
  if (
    rebuilt.beforeDigest !== value.beforeDigest
    || rebuilt.afterDigest !== value.afterDigest
    || serializeV3DeploymentAgnosticVenueSource(rebuilt.previewSource)
      !== serializeV3DeploymentAgnosticVenueSource(value.previewSource)
    || JSON.stringify(rebuilt.inverseCommand) !== JSON.stringify(value.inverseCommand)
  ) {
    throw new V3ActivityAuthoringError('proposal binding is invalid');
  }
  return rebuilt;
}

function applyV3ActivityAuthoringProposal(sessionInput, proposalInput) {
  const session = assertSession(sessionInput);
  const proposal = verifyProposal(session, proposalInput);
  const retainedHistory = session.history.slice(0, session.historyIndex);
  retainedHistory.push(deepFreeze({
    kind: 'hivenues-v3-activity-authoring-history-entry',
    schemaVersion: V3_ACTIVITY_AUTHORING_HISTORY_SCHEMA_VERSION,
    command: proposal.command,
    inverseCommand: proposal.inverseCommand,
    beforeDigest: session.draftDigest,
    afterDigest: proposal.afterDigest,
    beforeSource: session.draftSource,
    afterSource: proposal.previewSource,
  }));
  return makeSession({
    baselineSource: session.baselineSource,
    draftSource: proposal.previewSource,
    history: retainedHistory,
    historyIndex: retainedHistory.length,
  });
}

function discardV3ActivityAuthoringProposal(sessionInput, proposalInput) {
  const session = assertSession(sessionInput);
  verifyProposal(session, proposalInput);
  return session;
}

function undoV3ActivityAuthoringSession(sessionInput) {
  const session = assertSession(sessionInput);
  if (!session.canUndo) throw new V3ActivityAuthoringError('nothing to undo');
  const entry = session.history[session.historyIndex - 1];
  return makeSession({
    baselineSource: session.baselineSource,
    draftSource: entry.beforeSource,
    history: session.history,
    historyIndex: session.historyIndex - 1,
  });
}

function redoV3ActivityAuthoringSession(sessionInput) {
  const session = assertSession(sessionInput);
  if (!session.canRedo) throw new V3ActivityAuthoringError('nothing to redo');
  const entry = session.history[session.historyIndex];
  return makeSession({
    baselineSource: session.baselineSource,
    draftSource: entry.afterSource,
    history: session.history,
    historyIndex: session.historyIndex + 1,
  });
}

module.exports = {
  ADD_ACTIVITY,
  ADD_ACTIVITY_MANAGED_MEDIA,
  ADD_ACTIVITY_PUBLIC_ACTION,
  BEFORE_ACTIVITY_REFERENCE,
  BEFORE_MANAGED_MEDIA,
  BEFORE_PUBLIC_ACTION,
  END_OF_ACTIVITY_LIST,
  END_OF_MANAGED_MEDIA,
  END_OF_PUBLIC_ACTIONS,
  MOVE_ACTIVITY_MANAGED_MEDIA,
  MOVE_ACTIVITY_PUBLIC_ACTION,
  MOVE_ACTIVITY_REFERENCE,
  REMOVE_ACTIVITY,
  REMOVE_ACTIVITY_MANAGED_MEDIA,
  REMOVE_ACTIVITY_PUBLIC_ACTION,
  SET_ACTIVITY_ACCESS,
  SET_ACTIVITY_LIFECYCLE,
  SET_ACTIVITY_PRESENCE,
  SET_ACTIVITY_PUBLIC_ACTION,
  SET_ACTIVITY_TEMPORAL,
  SET_ACTIVITY_TEXT,
  V3_ACTIVITY_AUTHORING_COMMAND_SCHEMA_VERSION,
  V3_ACTIVITY_AUTHORING_HISTORY_SCHEMA_VERSION,
  V3_ACTIVITY_AUTHORING_PROPOSAL_SCHEMA_VERSION,
  V3_ACTIVITY_AUTHORING_SESSION_SCHEMA_VERSION,
  V3ActivityAuthoringError,
  applyV3ActivityAuthoringProposal,
  createV3ActivityAuthoringSession,
  discardV3ActivityAuthoringProposal,
  parseV3ActivityAuthoringCommand: parseActivityAuthoringCommand,
  proposeV3ActivityAuthoringCommand,
  redoV3ActivityAuthoringSession,
  undoV3ActivityAuthoringSession,
};