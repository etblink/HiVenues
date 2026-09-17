'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  CommunityDiscussionReader,
  HiveBridgeDiscussionProvider,
  SyntheticBridgeDiscussionProvider,
  assertBridgeDiscussionWire,
  normalizeBridgeDiscussionWire,
} = require('../src/candidate-c/social-discussion');

const ROOT = Object.freeze({ author: 'hostvoice', permlink: 'opening-night' });

function bridgeWire() {
  return {
    'patron-two/re-second': {
      author: 'patron-two',
      permlink: 're-second',
      parent_author: 'patron-one',
      parent_permlink: 'first-reply',
      title: '',
      body: 'A nested response.',
      json_metadata: null,
      created: '2026-09-16T19:04:00',
      updated: null,
      children: 0,
      active_votes: null,
      future_bridge_field: { safely: 'ignored' },
    },
    'hostvoice/opening-night': {
      author: 'hostvoice',
      permlink: 'opening-night',
      parent_author: '',
      parent_permlink: 'community',
      title: 'Opening night notes',
      body: 'Doors are open. **Welcome in.**',
      json_metadata: { tags: ['community'] },
      created: '2026-09-16T19:00:00',
      updated: '2026-09-16T19:01:00',
      children: 2,
      active_votes: [],
      pending_payout_value: '0.000 HBD',
    },
    'patron-one/first-reply': {
      author: 'patron-one',
      permlink: 'first-reply',
      parent_author: 'hostvoice',
      parent_permlink: 'opening-night',
      title: '',
      body: 'Glad to be here.',
      json_metadata: {},
      created: '2026-09-16T19:02:00',
      updated: '2026-09-16T19:02:00',
      children: 1,
      active_votes: [],
    },
  };
}

test('Era 3 discussion normalization accepts the documented keyed Bridge wire shape without relying on provider order', () => {
  const model = normalizeBridgeDiscussionWire(bridgeWire(), ROOT);

  assert.equal(model.schemaVersion, 1);
  assert.equal(model.status, 'ready');
  assert.equal(model.issue, null);
  assert.equal(model.root.id, 'hostvoice/opening-night');
  assert.equal(model.root.authorKey, 'hostvoice');
  assert.equal(model.root.parentId, null);
  assert.match(model.root.bodyHtml, /<strong>Welcome in\.<\/strong>/);
  assert.deepEqual(
    model.replies.map((reply) => reply.id),
    ['patron-one/first-reply', 'patron-two/re-second'],
  );
  assert.equal(model.replies[0].parentId, 'hostvoice/opening-night');
  assert.equal(model.replies[0].depth, 1);
  assert.equal(model.replies[1].parentId, 'patron-one/first-reply');
  assert.equal(model.replies[1].depth, 2);
  assert.equal(Object.hasOwn(model.root, 'pending_payout_value'), false);
  assert.equal(Object.hasOwn(model.root, 'future_bridge_field'), false);
});

test('synthetic and Hive Bridge providers traverse the same adapter and produce identical community read models', async () => {
  const wire = bridgeWire();
  const syntheticProvider = new SyntheticBridgeDiscussionProvider({
    discussions: { 'hostvoice/opening-night': wire },
  });
  const calls = [];
  const hiveProvider = new HiveBridgeDiscussionProvider({
    async call(api, method, params) {
      calls.push({ api, method, params });
      return wire;
    },
  });

  const syntheticModel = await new CommunityDiscussionReader(syntheticProvider).read(ROOT);
  const hiveModel = await new CommunityDiscussionReader(hiveProvider).read(ROOT);

  assert.deepEqual(hiveModel, syntheticModel);
  assert.deepEqual(calls, [{
    api: 'bridge',
    method: 'get_discussion',
    params: ROOT,
  }]);
});

test('Bridge wire validation rejects fixture-convenience arrays and mismatched keyed identities', () => {
  assert.throws(
    () => assertBridgeDiscussionWire(Object.values(bridgeWire())),
    (error) => error?.code === 'HIVE_DISCUSSION_WIRE_INVALID',
  );

  const aliased = bridgeWire();
  aliased['fixture-only-id'] = aliased['patron-one/first-reply'];
  delete aliased['patron-one/first-reply'];
  assert.throws(
    () => assertBridgeDiscussionWire(aliased),
    (error) => error?.code === 'HIVE_DISCUSSION_WIRE_INVALID',
  );
});

test('empty, partial, malformed, and unavailable provider states remain explicit without synthetic fallback', async () => {
  const empty = await new CommunityDiscussionReader(
    new SyntheticBridgeDiscussionProvider(),
  ).read(ROOT);
  assert.deepEqual(empty, {
    schemaVersion: 1,
    status: 'empty',
    issue: null,
    root: null,
    replies: [],
  });

  const partialWire = bridgeWire();
  delete partialWire['hostvoice/opening-night'];
  const partial = normalizeBridgeDiscussionWire(partialWire, ROOT);
  assert.equal(partial.status, 'partial');
  assert.equal(partial.issue, 'root-missing');
  assert.equal(partial.root, null);
  assert.equal(partial.replies.length, 2);

  const malformed = await new CommunityDiscussionReader({
    async getDiscussion() {
      return [{ author: 'fixture', permlink: 'shortcut' }];
    },
  }).read(ROOT);
  assert.equal(malformed.status, 'degraded');
  assert.equal(malformed.issue, 'wire-invalid');
  assert.equal(malformed.root, null);
  assert.deepEqual(malformed.replies, []);

  const unavailable = await new CommunityDiscussionReader({
    async getDiscussion() {
      throw new Error('network unavailable');
    },
  }).read(ROOT);
  assert.equal(unavailable.status, 'unavailable');
  assert.equal(unavailable.issue, 'provider-unavailable');
  assert.equal(unavailable.root, null);
  assert.deepEqual(unavailable.replies, []);
});
