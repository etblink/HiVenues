'use strict';

const assert = require('node:assert/strict');
const {
  DEFAULT_HIVE_RPC_NODES,
  createHiVenuesHiveReadService,
} = require('../src/product/hive-read');
const {
  requireCommunityId,
  requireHiveAccount,
} = require('../src/http/validation');

function parseRpcNodes(value) {
  const nodes = String(value || '')
    .split(',')
    .map((node) => node.trim())
    .filter(Boolean);
  return nodes.length > 0 ? [...new Set(nodes)] : [...DEFAULT_HIVE_RPC_NODES];
}

function positiveInteger(value, fallback) {
  const number = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

async function run() {
  const writeMode = String(process.env.HIVE_WRITE_MODE || 'disabled').trim().toLowerCase();
  assert.equal(writeMode, 'disabled', 'Live smoke requires disabled Hive writes');

  const communityId = requireCommunityId(process.env.HIVE_COMMUNITY_ID || 'hive-108590');
  const threadsContainerAccount = requireHiveAccount(
    process.env.THREADS_CONTAINER_ACCOUNT || 'fourthst.threads',
    'Threads container account',
  );
  const reads = createHiVenuesHiveReadService({
    nodes: parseRpcNodes(process.env.HIVE_RPC_NODES),
    timeoutMs: positiveInteger(process.env.HIVE_RPC_TIMEOUT_MS, 8000),
    failureThreshold: positiveInteger(process.env.HIVE_RPC_FAILURE_THRESHOLD, 2),
    cooldownMs: positiveInteger(process.env.HIVE_RPC_COOLDOWN_MS, 30000),
  });

  const [head, community, postsPage, threadsData] = await Promise.all([
    reads.rpcPool.call('condenser_api', 'get_dynamic_global_properties', []),
    reads.getCommunity(communityId),
    reads.getCommunityPosts({ name: communityId, sort: 'created' }),
    reads.getLatestThreads(threadsContainerAccount),
  ]);

  assert.ok(Number(head?.head_block_number) > 0, 'Hive head block is missing');
  assert.equal(community?.name, communityId, 'Configured community was not returned');
  assert.ok(Array.isArray(postsPage.items), 'Community posts are not an array');
  assert.ok(Array.isArray(threadsData.threads), 'Threads are not an array');

  let sampledProfile = null;
  let sampledDiscussion = null;
  let sampledWallet = null;
  let sampledFollowers = null;
  let sampledFollowing = null;
  if (postsPage.items[0]) {
    const first = postsPage.items[0];
    [sampledProfile, sampledDiscussion, sampledWallet, sampledFollowers, sampledFollowing] =
      await Promise.all([
        reads.getProfile(first.author),
        reads.getPostWithComments(first.author, first.permlink),
        reads.getWallet(first.author),
        reads.getFollowers(first.author),
        reads.getFollowing(first.author),
      ]);
    assert.equal(sampledProfile?.name, first.author, 'Sample author profile did not normalize');
    assert.equal(sampledDiscussion.post.author, first.author, 'Sample post discussion did not normalize');
    assert.equal(sampledWallet.account, first.author, 'Sample wallet did not normalize');
    assert.ok(Array.isArray(sampledFollowers.items), 'Sample followers did not normalize');
    assert.ok(Array.isArray(sampledFollowing.items), 'Sample following did not normalize');
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        status: 'passed',
        mode: 'read-only',
        headBlock: Number(head.head_block_number),
        community: community.name,
        communityPostsObserved: postsPage.items.length,
        nextCommunityPageAvailable: Boolean(postsPage.nextCursor),
        threadsContainerAccount,
        threadContainerObserved: Boolean(threadsData.container),
        threadsObserved: threadsData.threads.length,
        sampledAuthor: sampledProfile?.name || null,
        sampledComments: sampledDiscussion?.comments.length ?? null,
        sampledWalletDisplayedAt: sampledWallet?.displayedAt || null,
        sampledFollowers: sampledFollowers?.items.length ?? null,
        sampledFollowing: sampledFollowing?.items.length ?? null,
      },
      null,
      2,
    )}\n`,
  );
}

run().catch((error) => {
  process.stderr.write(`Live read-only smoke failed: ${error.message}\n`);
  process.exitCode = 1;
});
