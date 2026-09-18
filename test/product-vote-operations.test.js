'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildVote,
  requireVoteDirection,
  requireVotePercent,
  voteWeight,
} = require('../src/product/vote-operations');

test('product vote builder derives exact positive and negative Posting-authority Hive vote vectors', () => {
  const up = buildVote({
    account: 'etblink',
    author: 'barfriend',
    permlink: 'hello-room',
    direction: 'upvote',
    percent: 42,
  });
  assert.equal(up.action, 'vote');
  assert.equal(up.account, 'etblink');
  assert.equal(up.authority, 'Posting');
  assert.deepEqual(up.operations, [[
    'vote',
    {
      voter: 'etblink',
      author: 'barfriend',
      permlink: 'hello-room',
      weight: 4200,
    },
  ]]);
  assert.deepEqual(up.summary, {
    kind: 'Hive vote',
    voter: 'etblink',
    author: 'barfriend',
    permlink: 'hello-room',
    direction: 'upvote',
    percent: 42,
    weight: 4200,
  });
  assert.match(up.fingerprint, /^[0-9a-f]{64}$/);

  const down = buildVote({
    account: 'etblink',
    author: 'barfriend',
    permlink: 'hello-room',
    direction: 'downvote',
    percent: 37,
  });
  assert.deepEqual(down.operations, [[
    'vote',
    {
      voter: 'etblink',
      author: 'barfriend',
      permlink: 'hello-room',
      weight: -3700,
    },
  ]]);
  assert.equal(down.summary.direction, 'downvote');
  assert.equal(down.summary.percent, 37);
  assert.equal(down.summary.weight, -3700);
  assert.notEqual(down.fingerprint, up.fingerprint);
});

test('vote magnitude is explicit and maps whole-number 1..100 percent to exact signed Hive weight', () => {
  assert.equal(voteWeight('upvote', 1), 100);
  assert.equal(voteWeight('upvote', 100), 10000);
  assert.equal(voteWeight('downvote', 1), -100);
  assert.equal(voteWeight('downvote', 100), -10000);
  assert.equal(requireVotePercent('50'), 50);
  assert.equal(requireVoteDirection('UPVOTE'), 'upvote');
  assert.equal(requireVoteDirection(' downvote '), 'downvote');
});

test('vote builder fails closed for hidden direction, zero/unvote, fractional and out-of-range magnitude', () => {
  for (const direction of ['', 'recommend', 'applaud', 'positive', 'negative']) {
    assert.throws(
      () => buildVote({
        account: 'etblink',
        author: 'barfriend',
        permlink: 'hello-room',
        direction,
        percent: 50,
      }),
      /Vote direction must be upvote or downvote/,
    );
  }

  for (const percent of [0, -1, 101, 12.5, '', null, undefined, 'forty']) {
    assert.throws(
      () => buildVote({
        account: 'etblink',
        author: 'barfriend',
        permlink: 'hello-room',
        direction: 'upvote',
        percent,
      }),
      /Vote percentage must be a whole number from 1 to 100/,
    );
  }
});

test('voter identity is supplied by the product boundary rather than encoded in presentation vocabulary', () => {
  const envelope = buildVote({
    account: 'paper-sparrow',
    author: 'etblink',
    permlink: 'room-note',
    direction: 'upvote',
    percent: 75,
  });
  assert.equal(envelope.operations[0][1].voter, 'paper-sparrow');
  assert.equal(envelope.summary.kind, 'Hive vote');
  assert.equal(Object.hasOwn(envelope.summary, 'recommend'), false);
  assert.equal(Object.hasOwn(envelope.summary, 'applaud'), false);
});
