'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  HIVENUES_CONTENT_APP,
  buildReply,
  buildRootPost,
  buildRootPostUpdate,
  createContentPermlink,
} = require('../src/product/content-operations');

test('root post emits exactly one comment operation with no beneficiary or reward side effect', () => {
  const result = buildRootPost({
    account: 'etblink',
    community: 'hive-199299',
    title: 'A room note',
    body: 'Hello from the room.',
    permlink: 'a-room-note',
  });

  assert.equal(result.action, 'post');
  assert.equal(result.authority, 'Posting');
  assert.equal(result.operations.length, 1);
  assert.deepEqual(result.operations, [[
    'comment',
    {
      parent_author: '',
      parent_permlink: 'hive-199299',
      author: 'etblink',
      permlink: 'a-room-note',
      title: 'A room note',
      body: 'Hello from the room.',
      json_metadata: JSON.stringify({
        tags: ['hive-199299'],
        app: HIVENUES_CONTENT_APP,
        format: 'markdown',
      }),
    },
  ]]);
  assert.equal(result.operations.some((operation) => operation[0] === 'comment_options'), false);
  assert.match(result.fingerprint, /^[0-9a-f]{64}$/);
  assert.match(result.summary.contentDigest, /^[0-9a-f]{64}$/);
});

test('update can target only the verified author root post and preserves parent/permlink/metadata exactly', () => {
  const existing = {
    author: 'etblink',
    permlink: 'existing-note',
    parentAuthor: '',
    parentPermlink: 'hive-199299',
    title: 'Old title',
    body: 'Old body',
    jsonMetadata: '{"tags":["hive-199299"],"app":"hivenues/1.0.0","format":"markdown"}',
  };
  const result = buildRootPostUpdate({
    account: 'etblink',
    existing,
    title: 'New title',
    body: 'New body',
  });

  assert.equal(result.action, 'update');
  assert.deepEqual(result.operations, [[
    'comment',
    {
      parent_author: '',
      parent_permlink: 'hive-199299',
      author: 'etblink',
      permlink: 'existing-note',
      title: 'New title',
      body: 'New body',
      json_metadata: existing.jsonMetadata,
    },
  ]]);

  assert.throws(
    () => buildRootPostUpdate({
      account: 'someone-else',
      existing,
      title: 'Hijack',
      body: 'No.',
    }),
    /Only the verified author/,
  );

  assert.throws(
    () => buildRootPostUpdate({
      account: 'etblink',
      existing: { ...existing, parentAuthor: 'parent-user' },
      title: 'Nested edit',
      body: 'No.',
    }),
    /Only root Hive posts/,
  );
});

test('reply derives parent identity from canonical parent record and emits one comment operation', () => {
  const result = buildReply({
    account: 'etblink',
    parent: {
      author: 'juniper-lane',
      permlink: 'community-story',
    },
    body: 'Thanks for sharing this.',
    permlink: 're-community-story-001',
  });

  assert.equal(result.action, 'reply');
  assert.deepEqual(result.operations, [[
    'comment',
    {
      parent_author: 'juniper-lane',
      parent_permlink: 'community-story',
      author: 'etblink',
      permlink: 're-community-story-001',
      title: '',
      body: 'Thanks for sharing this.',
      json_metadata: JSON.stringify({
        app: HIVENUES_CONTENT_APP,
        format: 'markdown',
      }),
    },
  ]]);
  assert.equal(result.operations.some((operation) => operation[0] === 'vote'), false);
  assert.equal(result.operations.some((operation) => operation[0] === 'comment_options'), false);
});

test('content permlink is stable for the exact injected time/random seed and collision-resistant across suffixes', () => {
  const baseOptions = {
    now: () => Date.parse('2026-09-18T05:00:00.000Z'),
    random: () => Buffer.from('0011223344', 'hex'),
  };
  assert.equal(
    createContentPermlink('A Room Note', baseOptions),
    'a-room-note-20260918050000000-0011223344',
  );
  assert.notEqual(
    createContentPermlink('A Room Note', baseOptions),
    createContentPermlink('A Room Note', {
      ...baseOptions,
      random: () => Buffer.from('0011223345', 'hex'),
    }),
  );
});

test('content builders enforce public-content byte and identity boundaries', () => {
  assert.throws(
    () => buildRootPost({
      account: 'etblink',
      community: 'not-a-community',
      title: 'Title',
      body: 'Body',
      permlink: 'valid',
    }),
    /community is invalid/i,
  );
  assert.throws(
    () => buildReply({
      account: 'etblink',
      parent: { author: 'bad account', permlink: 'valid' },
      body: 'Reply',
      permlink: 'reply',
    }),
    /Parent author is invalid/,
  );
  assert.throws(
    () => buildRootPost({
      account: 'etblink',
      community: 'hive-199299',
      title: 'x'.repeat(257),
      body: 'Body',
      permlink: 'valid',
    }),
    /256 UTF-8 bytes or fewer/,
  );
});
