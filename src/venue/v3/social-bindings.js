'use strict';

const { HIVE_ACCOUNT_PATTERN } = require('../context');

const HIVE_SOCIAL_BINDING_VERSION = 1;
const HIVE_SOCIAL_ROLES = Object.freeze([
  'ANNOUNCEMENT',
  'PRIMARY_DISCUSSION',
  'LIVE_THREAD',
  'UPDATE',
  'MEDIA_POST',
  'RECAP',
]);
const HIVE_SOCIAL_STATES = Object.freeze([
  'PLANNED',
  'BOUND',
  'DEGRADED',
  'RECONCILIATION_REQUIRED',
]);

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OPERATION_ID_PATTERN = /^[a-z0-9]+(?:(?:-|:)[a-z0-9]+)*$/;
const PERMLINK_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

class V3SocialBindingError extends Error {
  constructor(message) {
    super(`HiVenues v3 social binding invalid: ${message}`);
    this.name = 'V3SocialBindingError';
  }
}

function fail(message) {
  throw new V3SocialBindingError(message);
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
}

function assertExactKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${label} contains unsupported field ${key}`);
  }
}

function assertId(value, label) {
  if (typeof value !== 'string' || value.length < 2 || value.length > 80 || !ID_PATTERN.test(value)) {
    fail(`${label} must be a stable lowercase semantic id`);
  }
}

function assertHiveAccount(value, label) {
  if (typeof value !== 'string' || !HIVE_ACCOUNT_PATTERN.test(value)) {
    fail(`${label} must be a valid Hive account`);
  }
}

function assertPermlink(value, label) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 255 || !PERMLINK_PATTERN.test(value)) {
    fail(`${label} must be a normalized Hive permlink`);
  }
}

function assertOperationId(value) {
  if (
    typeof value !== 'string' ||
    value.length < 2 ||
    value.length > 160 ||
    !OPERATION_ID_PATTERN.test(value)
  ) {
    fail('operationId must be a stable lowercase operation id');
  }
}

function normalizedRoles(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > HIVE_SOCIAL_ROLES.length) {
    fail('roles must contain at least one bounded social role');
  }
  const unique = [...new Set(value)];
  if (unique.length !== value.length) fail('roles must not contain duplicates');
  for (const role of unique) {
    if (!HIVE_SOCIAL_ROLES.includes(role)) fail(`unsupported social role ${role}`);
  }
  return unique;
}

function normalizeHiveRef(value) {
  assertPlainObject(value, 'hiveRef');
  assertExactKeys(value, new Set(['author', 'permlink']), 'hiveRef');
  assertHiveAccount(value.author, 'hiveRef.author');
  assertPermlink(value.permlink, 'hiveRef.permlink');
  return Object.freeze({ author: value.author, permlink: value.permlink });
}

function normalizeHiveSocialBinding(input) {
  assertPlainObject(input, 'binding');
  assertExactKeys(
    input,
    new Set([
      'version',
      'id',
      'activityId',
      'roles',
      'primary',
      'state',
      'operationId',
      'hiveRef',
    ]),
    'binding',
  );

  if (input.version !== HIVE_SOCIAL_BINDING_VERSION) {
    fail(`version must equal ${HIVE_SOCIAL_BINDING_VERSION}`);
  }
  assertId(input.id, 'id');
  assertId(input.activityId, 'activityId');
  if (typeof input.primary !== 'boolean') fail('primary must be boolean');
  if (!HIVE_SOCIAL_STATES.includes(input.state)) fail(`unsupported social state ${input.state}`);
  assertOperationId(input.operationId);

  const roles = normalizedRoles(input.roles);
  if (input.primary && !roles.includes('PRIMARY_DISCUSSION')) {
    fail('primary social root must include PRIMARY_DISCUSSION role');
  }
  if (!input.primary && roles.includes('PRIMARY_DISCUSSION')) {
    fail('PRIMARY_DISCUSSION role belongs only to the designated primary social root');
  }

  return Object.freeze({
    version: HIVE_SOCIAL_BINDING_VERSION,
    id: input.id,
    activityId: input.activityId,
    roles: Object.freeze(roles),
    primary: input.primary,
    state: input.state,
    operationId: input.operationId,
    hiveRef: normalizeHiveRef(input.hiveRef),
  });
}

function activityIdsFromSource(source) {
  const activities = source?.resources?.activities;
  if (!Array.isArray(activities)) fail('source.resources.activities must be an array');
  const ids = new Set();
  for (const activity of activities) {
    assertId(activity?.id, 'source activity id');
    if (ids.has(activity.id)) fail(`source contains duplicate activity ${activity.id}`);
    ids.add(activity.id);
  }
  return ids;
}

function hiveRefKey(binding) {
  return `${binding.hiveRef.author}/${binding.hiveRef.permlink}`;
}

function validateHiveSocialBindings(source, inputs) {
  if (!Array.isArray(inputs)) fail('bindings must be an array');
  if (inputs.length > 500) fail('bindings exceed the bounded social-binding limit');

  const activityIds = activityIdsFromSource(source);
  const bindings = inputs.map(normalizeHiveSocialBinding);
  const bindingIds = new Set();
  const hiveRefs = new Set();
  const byActivity = new Map();

  for (const binding of bindings) {
    if (!activityIds.has(binding.activityId)) {
      fail(`binding ${binding.id} references unknown activity ${binding.activityId}`);
    }
    if (bindingIds.has(binding.id)) fail(`duplicate binding id ${binding.id}`);
    bindingIds.add(binding.id);

    const refKey = hiveRefKey(binding);
    if (hiveRefs.has(refKey)) fail(`duplicate Hive content reference ${refKey}`);
    hiveRefs.add(refKey);

    const activityBindings = byActivity.get(binding.activityId) || [];
    activityBindings.push(binding);
    byActivity.set(binding.activityId, activityBindings);
  }

  for (const [activityId, activityBindings] of byActivity) {
    const primary = activityBindings.filter((binding) => binding.primary);
    if (primary.length !== 1) {
      fail(`socialized activity ${activityId} must have exactly one primary social root`);
    }
  }

  return Object.freeze(bindings);
}

function socializationStateForPrimary(primary) {
  if (!primary) return 'SOCIAL_UNBOUND';
  if (primary.state === 'PLANNED') return 'SOCIAL_ROOT_PLANNED';
  if (primary.state === 'BOUND') return 'SOCIAL_ROOT_BOUND';
  if (primary.state === 'DEGRADED') return 'SOCIAL_ROOT_DEGRADED';
  return 'RECONCILIATION_REQUIRED';
}

function projectActivitySocialState(source, inputs, activityId) {
  assertId(activityId, 'activityId');
  const activityIds = activityIdsFromSource(source);
  if (!activityIds.has(activityId)) fail(`unknown activity ${activityId}`);
  const bindings = validateHiveSocialBindings(source, inputs)
    .filter((binding) => binding.activityId === activityId);
  const primary = bindings.find((binding) => binding.primary) || null;

  return Object.freeze({
    activityId,
    socializationState: socializationStateForPrimary(primary),
    primary,
    secondary: Object.freeze(bindings.filter((binding) => !binding.primary)),
  });
}

function assertPrimarySocialRootStable(source, previousInputs, nextInputs) {
  const previous = validateHiveSocialBindings(source, previousInputs);
  const next = validateHiveSocialBindings(source, nextInputs);
  const nextPrimaryByActivity = new Map(
    next.filter((binding) => binding.primary).map((binding) => [binding.activityId, binding]),
  );

  for (const binding of previous) {
    if (!binding.primary || binding.state === 'PLANNED') continue;
    const candidate = nextPrimaryByActivity.get(binding.activityId);
    if (!candidate) fail(`published primary social root for ${binding.activityId} may not be removed`);
    if (hiveRefKey(candidate) !== hiveRefKey(binding)) {
      fail(`published primary social root for ${binding.activityId} may not change author/permlink`);
    }
  }

  return next;
}

module.exports = {
  HIVE_SOCIAL_BINDING_VERSION,
  HIVE_SOCIAL_ROLES,
  HIVE_SOCIAL_STATES,
  V3SocialBindingError,
  assertPrimarySocialRootStable,
  normalizeHiveSocialBinding,
  projectActivitySocialState,
  validateHiveSocialBindings,
};
