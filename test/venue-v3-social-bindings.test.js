'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  assertPrimarySocialRootStable,
  projectActivitySocialState,
  validateHiveSocialBindings,
} = require('../src/venue/v3/social-bindings');
const { nativeCreatorSource } = require('./support/v3-reference-fixtures');

function primary(overrides = {}) {
  return {
    version: 1,
    id: 'live-session-social-root',
    activityId: 'live-session-one',
    roles: ['ANNOUNCEMENT', 'PRIMARY_DISCUSSION'],
    primary: true,
    state: 'PLANNED',
    operationId: 'socialize:live-session-one',
    hiveRef: {
      author: 'venuehost',
      permlink: 'live-session-one',
    },
    ...overrides,
  };
}

function secondary(overrides = {}) {
  return {
    version: 1,
    id: 'live-session-recap',
    activityId: 'live-session-one',
    roles: ['RECAP'],
    primary: false,
    state: 'BOUND',
    operationId: 'recap:live-session-one',
    hiveRef: {
      author: 'venuehost',
      permlink: 'live-session-one-recap',
    },
    ...overrides,
  };
}

test('S8.1 absence of Hive bindings leaves a valid v3 Activity socially unbound', () => {
  const source = nativeCreatorSource();
  const projected = projectActivitySocialState(source, [], 'live-session-one');

  assert.equal(projected.socializationState, 'SOCIAL_UNBOUND');
  assert.equal(projected.primary, null);
  assert.deepEqual(projected.secondary, []);
});

test('S8.1 one primary root can carry announcement and primary-discussion roles', () => {
  const source = nativeCreatorSource();
  const projected = projectActivitySocialState(source, [primary()], 'live-session-one');

  assert.equal(projected.socializationState, 'SOCIAL_ROOT_PLANNED');
  assert.equal(projected.primary.activityId, 'live-session-one');
  assert.equal(projected.primary.hiveRef.author, 'venuehost');
  assert.equal(projected.primary.hiveRef.permlink, 'live-session-one');
  assert.deepEqual(projected.primary.roles, ['ANNOUNCEMENT', 'PRIMARY_DISCUSSION']);
});

test('S8.1 bound and degraded roots project without changing Activity identity', () => {
  const source = nativeCreatorSource();
  for (const [state, expected] of [
    ['BOUND', 'SOCIAL_ROOT_BOUND'],
    ['DEGRADED', 'SOCIAL_ROOT_DEGRADED'],
    ['RECONCILIATION_REQUIRED', 'RECONCILIATION_REQUIRED'],
  ]) {
    const projected = projectActivitySocialState(source, [primary({ state })], 'live-session-one');
    assert.equal(projected.activityId, 'live-session-one');
    assert.equal(projected.socializationState, expected);
  }
});

test('S8.1 secondary social objects remain explicit roles beneath one primary root', () => {
  const source = nativeCreatorSource();
  const projected = projectActivitySocialState(
    source,
    [primary({ state: 'BOUND' }), secondary()],
    'live-session-one',
  );

  assert.equal(projected.primary.id, 'live-session-social-root');
  assert.equal(projected.secondary.length, 1);
  assert.deepEqual(projected.secondary[0].roles, ['RECAP']);
});

test('S8.1 every socialized Activity has exactly one primary root', () => {
  const source = nativeCreatorSource();

  assert.throws(
    () => validateHiveSocialBindings(source, [secondary()]),
    /must have exactly one primary social root/,
  );
  assert.throws(
    () => validateHiveSocialBindings(source, [primary(), primary({
      id: 'second-primary',
      operationId: 'socialize:second-primary',
      hiveRef: { author: 'venuehost', permlink: 'second-primary' },
    })]),
    /must have exactly one primary social root/,
  );
});

test('S8.1 PRIMARY_DISCUSSION is reserved to the designated primary root', () => {
  const source = nativeCreatorSource();

  assert.throws(
    () => validateHiveSocialBindings(source, [primary({ roles: ['ANNOUNCEMENT'] })]),
    /primary social root must include PRIMARY_DISCUSSION/,
  );
  assert.throws(
    () => validateHiveSocialBindings(source, [primary(), secondary({
      roles: ['PRIMARY_DISCUSSION'],
    })]),
    /belongs only to the designated primary social root/,
  );
});

test('S8.1 social bindings may reference only canonical Activity ids', () => {
  const source = nativeCreatorSource();
  assert.throws(
    () => validateHiveSocialBindings(source, [primary({ activityId: 'invented-activity' })]),
    /references unknown activity invented-activity/,
  );
});

test('S8.1 one Hive content identity is represented by one binding record with multiple roles', () => {
  const source = nativeCreatorSource();
  assert.throws(
    () => validateHiveSocialBindings(source, [primary(), secondary({
      hiveRef: { author: 'venuehost', permlink: 'live-session-one' },
    })]),
    /duplicate Hive content reference venuehost\/live-session-one/,
  );
});

test('S8.1 published or ambiguous primary roots cannot silently change author/permlink', () => {
  const source = nativeCreatorSource();

  for (const state of ['BOUND', 'DEGRADED', 'RECONCILIATION_REQUIRED']) {
    const before = [primary({ state })];
    const after = [primary({
      state: 'BOUND',
      hiveRef: { author: 'venuehost', permlink: 'replacement-root' },
    })];
    assert.throws(
      () => assertPrimarySocialRootStable(source, before, after),
      /may not change author\/permlink/,
    );
  }
});

test('S8.1 published primary roots cannot disappear through an ordinary update', () => {
  const source = nativeCreatorSource();
  assert.throws(
    () => assertPrimarySocialRootStable(source, [primary({ state: 'BOUND' })], []),
    /may not be removed/,
  );
});

test('S8.1 validation is projection-only and does not mutate canonical Activity facts', () => {
  const source = nativeCreatorSource();
  const before = JSON.stringify(source.resources.activities[0]);
  validateHiveSocialBindings(source, [primary({ state: 'BOUND' })]);
  assert.equal(JSON.stringify(source.resources.activities[0]), before);
});
