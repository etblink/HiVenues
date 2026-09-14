'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createV3DeploymentAgnosticVenueSource,
  deriveV3DeploymentAgnosticVenueSourceDigest,
  serializeV3DeploymentAgnosticVenueSource,
} = require('../src/venue/v3/source');
const { nativeCreatorSource } = require('./support/v3-reference-fixtures');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function socializedCreator(overrides = {}) {
  const source = clone(nativeCreatorSource());
  source.activityBindings.hiveSocial = [
    {
      version: 1,
      id: 'live-session-social-root',
      activityId: 'live-session-one',
      roles: ['ANNOUNCEMENT', 'PRIMARY_DISCUSSION'],
      primary: true,
      state: 'BOUND',
      operationId: 'publish:live-session-one',
      hiveRef: {
        author: 'alice',
        permlink: 'live-session-one',
      },
      ...overrides,
    },
  ];
  return source;
}

test('S8.1 canonical v3 source admits one normalized Hive social root without requiring Community', () => {
  const input = socializedCreator();
  const parsed = createV3DeploymentAgnosticVenueSource(input);

  assert.equal(parsed.capabilities.community.state, 'disabled');
  assert.equal(parsed.resources.activities[0].id, 'live-session-one');
  assert.equal(parsed.resources.activities[0].title, input.resources.activities[0].title);
  assert.deepEqual(parsed.activityBindings.hiveSocial, [
    {
      version: 1,
      id: 'live-session-social-root',
      activityId: 'live-session-one',
      roles: ['ANNOUNCEMENT', 'PRIMARY_DISCUSSION'],
      primary: true,
      state: 'BOUND',
      operationId: 'publish:live-session-one',
      hiveRef: {
        author: 'alice',
        permlink: 'live-session-one',
      },
    },
  ]);
  assert.ok(Object.isFrozen(parsed));
  assert.ok(Object.isFrozen(parsed.activityBindings.hiveSocial));
  assert.ok(Object.isFrozen(parsed.activityBindings.hiveSocial[0]));
});

test('S8.1 canonical serialization and digest include the social binding deterministically', () => {
  const input = socializedCreator();
  const serialized = serializeV3DeploymentAgnosticVenueSource(input);
  const roundTrip = createV3DeploymentAgnosticVenueSource(JSON.parse(serialized));
  const boundDigest = deriveV3DeploymentAgnosticVenueSourceDigest(input);
  const unboundDigest = deriveV3DeploymentAgnosticVenueSourceDigest(nativeCreatorSource());

  assert.deepEqual(roundTrip.activityBindings.hiveSocial, input.activityBindings.hiveSocial);
  assert.equal(boundDigest, deriveV3DeploymentAgnosticVenueSourceDigest(roundTrip));
  assert.notEqual(boundDigest, unboundDigest);
});

test('S8.1 canonical source rejects Hive social bindings that point at unknown Activities', () => {
  const input = socializedCreator({ activityId: 'missing-activity' });
  assert.throws(
    () => createV3DeploymentAgnosticVenueSource(input),
    /binding live-session-social-root references unknown activity missing-activity/,
  );
});

test('S8.1 canonical source rejects a socialized Activity without exactly one primary root', () => {
  const input = socializedCreator({
    roles: ['ANNOUNCEMENT'],
    primary: false,
  });
  assert.throws(
    () => createV3DeploymentAgnosticVenueSource(input),
    /socialized activity live-session-one must have exactly one primary social root/,
  );
});

test('S8.1 canonical source delegates strict binding shape validation to the frozen social contract', () => {
  const input = socializedCreator();
  input.activityBindings.hiveSocial[0].activitySnapshot = {
    title: 'This must never become a second activity authority',
  };
  assert.throws(
    () => createV3DeploymentAgnosticVenueSource(input),
    /binding contains unsupported field activitySnapshot/,
  );
});
