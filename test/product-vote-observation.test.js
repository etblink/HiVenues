'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { HiveReadService } = require('../src/hive/read-service');

function serviceWith(posts) {
  const calls = [];
  let index = 0;
  return {
    calls,
    service: new HiveReadService({
      async call(api, method, params) {
        calls.push({ api, method, params: structuredClone(params) });
        assert.equal(api + '.' + method, 'bridge.get_post');
        const value = posts[Math.min(index, posts.length - 1)];
        index += 1;
        return structuredClone(value);
      },
    }),
  };
}

function voteRecord(weight) {
  return {
    action: 'vote',
    account: 'paper-sparrow',
    operations: [[
      'vote',
      {
        voter: 'paper-sparrow',
        author: 'etblink',
        permlink: 'room-note',
        weight,
      },
    ]],
  };
}

test('canonical vote weight read distinguishes no vote, exact vote and missing target', async () => {
  const { service, calls } = serviceWith([
    {
      author: 'etblink',
      permlink: 'room-note',
      active_votes: [],
    },
    {
      author: 'etblink',
      permlink: 'room-note',
      active_votes: [{ voter: 'paper-sparrow', percent: 4200 }],
    },
    {
      author: 'someone-else',
      permlink: 'room-note',
      active_votes: [{ voter: 'paper-sparrow', percent: 4200 }],
    },
  ]);

  assert.equal(await service.getVoteWeight('paper-sparrow', 'etblink', 'room-note'), 0);
  assert.equal(await service.getVoteWeight('paper-sparrow', 'etblink', 'room-note'), 4200);
  assert.equal(await service.getVoteWeight('paper-sparrow', 'etblink', 'room-note'), null);
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[0].params, { author: 'etblink', permlink: 'room-note' });
});

test('exact signed vote observation confirms only the intended voter target and weight', async () => {
  const { service } = serviceWith([
    {
      author: 'etblink',
      permlink: 'room-note',
      active_votes: [{ voter: 'paper-sparrow', percent: 3700 }],
    },
    {
      author: 'etblink',
      permlink: 'room-note',
      active_votes: [{ voter: 'paper-sparrow', percent: 2500 }],
    },
    {
      author: 'etblink',
      permlink: 'room-note',
      active_votes: [{ voter: 'paper-sparrow', percent: -3700 }],
    },
    {
      author: 'etblink',
      permlink: 'room-note',
      active_votes: [{ voter: 'paper-sparrow', percent: -3700 }],
    },
  ]);

  assert.equal(await service.observeVoteOperation(voteRecord(3700)), true);
  assert.equal(await service.observeVoteOperation(voteRecord(3700)), false);
  assert.equal(await service.observeVoteOperation(voteRecord(-3700)), true);
  assert.equal(await service.observeSocialOperation(voteRecord(-3700)), true);
});

test('vote observer refuses malformed or out-of-range operation weight without fabricating success', async () => {
  const { service, calls } = serviceWith([{
    author: 'etblink',
    permlink: 'room-note',
    active_votes: [{ voter: 'paper-sparrow', percent: 10000 }],
  }]);

  assert.equal(await service.observeVoteOperation({
    operations: [['comment', { author: 'etblink', permlink: 'room-note' }]],
  }), false);
  assert.equal(await service.observeVoteOperation(voteRecord(10001)), false);
  assert.equal(await service.observeVoteOperation(voteRecord(-10001)), false);
  assert.equal(calls.length, 0);
});
