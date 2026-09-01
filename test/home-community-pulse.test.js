'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  HOME_PULSE_LIMIT,
  HOME_UPDATES_LIMIT,
  createPulseContentFilter,
  loadHomeReadModel,
} = require('../src/home/read-model');
const { ModerationService } = require('../src/moderation/moderation-service');

const venue = {
  hive: {
    communityId: 'hive-108590',
    officialAccount: 'fourthstreetbar',
    threadsContainerAccount: 'fourthst.threads',
  },
};

function post(author, permlink, parentAuthor = '') {
  return {
    author,
    permlink,
    parentAuthor,
    title: permlink,
    excerpt: `Excerpt ${permlink}`,
    replyCount: 0,
    positiveVotes: 0,
  };
}

test('community pulse eligibility keeps roots while excluding official and Threads-container authors', () => {
  const filter = createPulseContentFilter(venue);
  assert.equal(filter(post('alice', 'hello')), true);
  assert.equal(filter(post('fourthstreetbar', 'official')), false);
  assert.equal(filter(post('fourthst.threads', 'container')), false);
  assert.equal(filter(post('alice', 'reply', 'bob')), false);
  assert.equal(filter(null), false);
});

test('home read model performs bounded independent reads and caps the pulse', async () => {
  const calls = [];
  const candidates = [post('alice', 'one'), post('bob', 'two'), post('carol', 'three'), post('dave', 'four')];
  const model = await loadHomeReadModel({
    venue,
    services: {
      hiveReads: {
        async getOfficialCommunityPosts(options) {
          calls.push(['official', options]);
          return [post('fourthstreetbar', 'news')];
        },
      },
      moderation: {
        async getCommunityPosts(options) {
          calls.push(['pulse', options]);
          return { items: candidates.filter(options.contentFilter) };
        },
      },
    },
  });

  assert.equal(HOME_UPDATES_LIMIT, 3);
  assert.equal(HOME_PULSE_LIMIT, 3);
  assert.deepEqual(calls[0][1], { account: 'fourthstreetbar', community: 'hive-108590', limit: 3 });
  assert.equal(calls[1][1].name, 'hive-108590');
  assert.equal(calls[1][1].sort, 'created');
  assert.equal(calls[1][1].cursor, null);
  assert.equal(typeof calls[1][1].contentFilter, 'function');
  assert.equal(model.officialUpdates.status, 'ready');
  assert.equal(model.communityPulse.status, 'ready');
  assert.deepEqual(model.communityPulse.items.map((item) => item.author), ['alice', 'bob', 'carol']);
});

test('official and community failures are isolated from one another', async () => {
  const warnings = [];
  const logger = { warn(meta, message) { warnings.push({ meta, message }); } };
  const pulseReady = await loadHomeReadModel({
    venue,
    logger,
    services: {
      hiveReads: { async getOfficialCommunityPosts() { throw new Error('official down'); } },
      moderation: {
        async getCommunityPosts({ contentFilter }) {
          return { items: [post('alice', 'one')].filter(contentFilter) };
        },
      },
    },
  });
  assert.equal(pulseReady.officialUpdates.status, 'unavailable');
  assert.equal(pulseReady.communityPulse.status, 'ready');

  const officialReady = await loadHomeReadModel({
    venue,
    logger,
    services: {
      hiveReads: { async getOfficialCommunityPosts() { return [post('fourthstreetbar', 'news')]; } },
      moderation: { async getCommunityPosts() { throw new Error('moderation down'); } },
    },
  });
  assert.equal(officialReady.officialUpdates.status, 'ready');
  assert.equal(officialReady.communityPulse.status, 'unavailable');
  assert.equal(warnings.length, 2);
});

test('merchant moderation composes with homepage eligibility rather than replacing it', async () => {
  let delegated = null;
  const service = new ModerationService({
    config: {
      hive: { communityId: 'hive-108590' },
      moderation: { enabled: true, operatorAccounts: ['etblink'] },
    },
    scanPageLimit: 4,
    store: {
      snapshot() {
        return {
          accounts: ['hidden'],
          content: [{ author: 'bob', permlink: 'hidden-post' }],
        };
      },
    },
    hiveReads: {
      async getCommunityPosts(options) {
        delegated = options;
        return { items: [] };
      },
    },
  });

  await service.getCommunityPosts({
    name: 'hive-108590',
    sort: 'created',
    contentFilter: createPulseContentFilter(venue),
  });

  assert.equal(delegated.scanPageLimit, 4);
  assert.equal(delegated.contentFilter(post('alice', 'ok')), true);
  assert.equal(delegated.contentFilter(post('hidden', 'x')), false);
  assert.equal(delegated.contentFilter(post('bob', 'hidden-post')), false);
  assert.equal(delegated.contentFilter(post('fourthstreetbar', 'official')), false);
  assert.equal(delegated.contentFilter(post('fourthst.threads', 'container')), false);
  assert.equal(delegated.contentFilter(post('alice', 'reply', 'bob')), false);
});

test('invalid caller content filter is rejected instead of weakening moderation', async () => {
  const service = new ModerationService({
    config: {
      hive: { communityId: 'hive-108590' },
      moderation: { enabled: true, operatorAccounts: ['etblink'] },
    },
    store: { snapshot() { return { accounts: [], content: [] }; } },
    hiveReads: { async getCommunityPosts() { throw new Error('must not delegate'); } },
  });
  await assert.rejects(
    service.getCommunityPosts({ name: 'hive-108590', contentFilter: 'not-a-function' }),
    /contentFilter must be a function/,
  );
});
