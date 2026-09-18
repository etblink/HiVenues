'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { HiveReadService } = require('../src/hive/read-service');

function expectedPost(overrides = {}) {
  return {
    author: 'etblink',
    permlink: 'room-note',
    parent_author: '',
    parent_permlink: 'hive-199299',
    title: 'Room note',
    body: 'Exact public body.',
    json_metadata: '{"tags":["hive-199299"],"app":"hivenues/1.0.0","format":"markdown"}',
    ...overrides,
  };
}

function recordFor(raw = expectedPost()) {
  return {
    account: raw.author,
    operations: [[
      'comment',
      {
        parent_author: raw.parent_author,
        parent_permlink: raw.parent_permlink,
        author: raw.author,
        permlink: raw.permlink,
        title: raw.title,
        body: raw.body,
        json_metadata: raw.json_metadata,
      },
    ]],
  };
}

test('canonical content record preserves exact author/permlink/parent/title/body/metadata for consequence checks', async () => {
  const raw = expectedPost();
  const calls = [];
  const service = new HiveReadService({
    async call(api, method, params) {
      calls.push({ api, method, params });
      assert.equal(api, 'bridge');
      assert.equal(method, 'get_post');
      return raw;
    },
  });

  const record = await service.getContentRecord('etblink', 'room-note');
  assert.deepEqual(record, {
    author: 'etblink',
    permlink: 'room-note',
    parentAuthor: '',
    parentPermlink: 'hive-199299',
    title: 'Room note',
    body: 'Exact public body.',
    jsonMetadata: raw.json_metadata,
  });
  assert.deepEqual(calls[0].params, { author: 'etblink', permlink: 'room-note' });
});

test('exact content observation requires every public consequence field to match', async () => {
  const raw = expectedPost();
  const service = new HiveReadService({
    async call(_api, method) {
      assert.equal(method, 'get_post');
      return raw;
    },
  });

  assert.equal(await service.observeContentOperation(recordFor(raw)), true);

  for (const mismatch of [
    { title: 'Different title' },
    { body: 'Different body' },
    { parent_permlink: 'hive-188888' },
    { parent_author: 'someone-else' },
    { json_metadata: '{"app":"different"}' },
  ]) {
    const mismatched = recordFor({ ...raw, ...mismatch });
    assert.equal(await service.observeContentOperation(mismatched), false);
  }
});

test('exact content observation stays pending when canonical content is absent or identity mismatches', async () => {
  const absent = new HiveReadService({
    async call() {
      return null;
    },
  });
  assert.equal(await absent.observeContentOperation(recordFor()), false);

  const wrongIdentity = new HiveReadService({
    async call() {
      return expectedPost({ author: 'someone-else' });
    },
  });
  assert.equal(await wrongIdentity.getContentRecord('etblink', 'room-note'), null);
});
