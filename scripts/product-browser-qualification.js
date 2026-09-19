'use strict';
/* global document, window, getComputedStyle */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const {
  createHiVenuesApp,
  startHiVenuesServer,
} = require('../src/product/app');
const {
  IDENTITY_COOKIE_NAME,
  createHiVenuesIdentityServices,
} = require('../src/product/identity');
const { HiVenuesStore } = require('../src/product/store');
const { seedHiVenuesHosts } = require('../src/product/fixtures');

const OUTPUT_ROOT = process.env.HIVENUES_PRODUCT_BROWSER_ROOT
  || path.join('artifacts', 'product-browser', 'participation');
const EXACT_SHA = process.env.HIVENUES_PRODUCT_BROWSER_EXACT_SHA || 'LOCAL_UNBOUND';
const EXACT_TREE = process.env.HIVENUES_PRODUCT_BROWSER_EXACT_TREE || 'LOCAL_UNBOUND';
const COMMUNITY = 'hive-199299';
const THREADS_ACCOUNT = 'room-notes';
const SOCIAL_BINDING = Object.freeze({ community: COMMUNITY, threadsAccount: THREADS_ACCOUNT });
const DESKTOP = Object.freeze({ width: 1440, height: 1000 });
const MOBILE = Object.freeze({ width: 390, height: 844 });
const HOSTS = Object.freeze([
  Object.freeze({
    slug: 'northline-hall',
    family: 'poster',
    heading: 'Put your name to the wall',
  }),
  Object.freeze({
    slug: 'nova-ashby',
    family: 'editorial',
    heading: 'Sign the register',
  }),
  Object.freeze({
    slug: 'harbor-and-hearth',
    family: 'hospitality',
    heading: 'Introduce yourself',
  }),
]);

async function signingKey(seed = 'hivenues-era4-browser-identity') {
  const { PrivateKey } = await import('hive-tx');
  return PrivateKey.fromSeed(seed);
}

function signMessage(key, message) {
  const digest = crypto.createHash('sha256').update(message, 'utf8').digest();
  return key.sign(digest).customToString();
}

function socialBindings() {
  return Object.fromEntries(HOSTS.map((host) => [host.slug, SOCIAL_BINDING]));
}

function qualificationHosts() {
  const hosts = seedHiVenuesHosts();
  const posterHost = hosts.find((host) => host.identity.slug === 'northline-hall');
  posterHost.bindings.hive.showNegativeVoteAction = true;
  posterHost.voice.terms.downvote_hive = 'Not for this room';
  posterHost.bindings.hive.valueRecipient = 'northline-pay';
  posterHost.voice.terms.support_hive = 'Support the room';

  const editorialHost = hosts.find((host) => host.identity.slug === 'nova-ashby');
  editorialHost.bindings.hive.showNegativeVoteAction = false;
  editorialHost.voice.terms.downvote_hive = 'Push back';
  editorialHost.bindings.hive.valueRecipient = 'nova-pay';
  editorialHost.voice.terms.support_hive = 'Support the work';

  const hospitalityHost = hosts.find((host) => host.identity.slug === 'harbor-and-hearth');
  hospitalityHost.bindings.hive.showNegativeVoteAction = true;
  hospitalityHost.voice.terms.downvote_hive = 'Not for this table';
  hospitalityHost.bindings.hive.valueRecipient = 'harbor-pay';
  hospitalityHost.voice.terms.support_hive = 'Leave something for the house';
  return hosts;
}

function contentKey(author, permlink) {
  return String(author) + '/' + String(permlink);
}

function browserContentRecord({
  author,
  permlink,
  parentAuthor = '',
  parentPermlink,
  title = '',
  body,
  jsonMetadata,
  created = '2026-09-18T01:00:00',
}) {
  return {
    author,
    permlink,
    parentAuthor,
    parentPermlink,
    title,
    body,
    jsonMetadata,
    created,
  };
}

function normalizeBrowserContent(raw, replyCount = 0, voteRecords = []) {
  const votes = voteRecords.filter(
    (item) => item.author === raw.author && item.permlink === raw.permlink && item.weight !== 0,
  );
  return {
    author: raw.author,
    permlink: raw.permlink,
    parentAuthor: raw.parentAuthor,
    parentPermlink: raw.parentPermlink,
    title: raw.title || 'Untitled',
    body: raw.body,
    bodyHtml: '<p>' + String(raw.body || '') + '</p>',
    excerpt: String(raw.body || ''),
    primaryImage: '',
    created: raw.created || '2026-09-18T01:00:00',
    updated: '',
    positiveVotes: votes.filter((item) => item.weight > 0).length,
    negativeVotes: votes.filter((item) => item.weight < 0).length,
    replyCount,
    payout: 0,
    depth: raw.parentAuthor ? 1 : 0,
  };
}

function productReadService(publicKey) {
  const rpcCalls = [];
  const followState = new Set();
  const communityState = new Set();
  const contentRecords = new Map();
  const voteState = new Map();
  const rewardState = new Map([[
    'etblink',
    {
      rewardHive: '1.000 HIVE',
      rewardHbd: '0.500 HBD',
      rewardVests: '1000.000000 VESTS',
      lastClaim: null,
    },
  ]]);
  const liquidState = new Map([
    ['etblink', { hive: 12_345n, hbd: 6_789n }],
    ['northline-pay', { hive: 500n, hbd: 250n }],
    ['nova-pay', { hive: 100n, hbd: 100n }],
    ['harbor-pay', { hive: 300n, hbd: 300n }],
  ]);
  let lastSupport = null;
  const canonicalLiquid = (units, symbol) => (
    (units / 1000n).toString() + '.' + (units % 1000n).toString().padStart(3, '0') + ' ' + symbol
  );
  const parseLiquid = (value, symbol) => {
    const match = /^(0|[1-9][0-9]*)\.([0-9]{3}) (HIVE|HBD)$/.exec(String(value || ''));
    assert.ok(match, 'synthetic liquid asset must be canonical');
    assert.equal(match[3], symbol);
    return BigInt(match[1]) * 1000n + BigInt(match[2]);
  };
  const followKey = (follower, following) => follower + '->' + following;
  const communityKey = (account, community) => account + '->' + community;
  const voteKey = (voter, author, permlink) => voter + '->' + author + '/' + permlink;
  const voteRecords = () => Array.from(voteState.values());

  const seedRoot = browserContentRecord({
    author: 'etblink',
    permlink: 'room-note',
    parentPermlink: COMMUNITY,
    title: 'A note from the room',
    body: 'This is the exact public body.',
    jsonMetadata: '{"tags":["hive-199299"],"app":"hivenues/1.0.0","format":"markdown"}',
  });
  const seedReply = browserContentRecord({
    author: 'juniper-lane',
    permlink: 're-room-note',
    parentAuthor: 'etblink',
    parentPermlink: 'room-note',
    body: 'I am here too.',
    jsonMetadata: '{"app":"hivenues/1.0.0","format":"markdown"}',
    created: '2026-09-18T01:05:00',
  });
  contentRecords.set(contentKey(seedRoot.author, seedRoot.permlink), seedRoot);
  contentRecords.set(contentKey(seedReply.author, seedReply.permlink), seedReply);
  voteState.set(voteKey('external-reader', seedRoot.author, seedRoot.permlink), {
    voter: 'external-reader',
    author: seedRoot.author,
    permlink: seedRoot.permlink,
    weight: -2500,
  });

  function roots() {
    return Array.from(contentRecords.values())
      .filter((item) => item.parentAuthor === '' && item.parentPermlink === COMMUNITY);
  }

  function commentsFor(root) {
    const rootId = contentKey(root.author, root.permlink);
    const belongs = (item) => {
      let cursor = item;
      const seen = new Set();
      while (cursor?.parentAuthor) {
        const parentId = contentKey(cursor.parentAuthor, cursor.parentPermlink);
        if (parentId === rootId) return true;
        if (seen.has(parentId)) return false;
        seen.add(parentId);
        cursor = contentRecords.get(parentId);
      }
      return false;
    };
    return Array.from(contentRecords.values()).filter(
      (item) => item.parentAuthor && belongs(item),
    );
  }

  const service = {
    rpcPool: {
      calls: rpcCalls,
      async call(api, method, params) {
        rpcCalls.push({ api, method, params: structuredClone(params) });
        assert.equal(api + '.' + method, 'condenser_api.get_accounts');
        return (params?.[0] || []).map((name) => ({
          name,
          posting: {
            weight_threshold: 1,
            account_auths: [],
            key_auths: [[publicKey, 1]],
          },
        }));
      },
    },
    async getCommunity(name) {
      return {
        name,
        title: 'Rooms & Regulars',
        aboutHtml: '<p>A public community around this place.</p>',
        subscriberCount: 3,
      };
    },
    async getCommunityPosts() {
      const items = roots().map((item) => normalizeBrowserContent(
        item,
        commentsFor(item).length,
        voteRecords(),
      ));
      return {
        items,
        profiles: {
          etblink: {
            name: 'etblink',
            displayName: 'Evan',
            profileImage: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E',
          },
        },
        nextCursor: null,
      };
    },
    async getLatestThreads() {
      return { container: null, threads: [], profiles: {} };
    },
    async listCommunitySubscribers() {
      return [];
    },
    async getProfiles(accounts = []) {
      return Object.fromEntries(accounts.map((name) => [name, {
        name,
        displayName: name,
        about: '',
        profileImage: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E',
      }]));
    },
    async getWallet(account) {
      const rewards = rewardState.get(account) || {
        rewardHive: '0.000 HIVE',
        rewardHbd: '0.000 HBD',
        rewardVests: '0.000000 VESTS',
        lastClaim: null,
      };
      const hive = Number.parseFloat(rewards.rewardHive);
      const hbd = Number.parseFloat(rewards.rewardHbd);
      const vestingShares = Number.parseFloat(rewards.rewardVests);
      const hasClaimableRewards = hive > 0 || hbd > 0 || vestingShares > 0;
      return {
        account,
        displayedAt: '2026-09-18T12:00:00.000Z',
        liquidHive: 12.345,
        liquidHbd: 6.789,
        hivePower: 550,
        resourceCreditsPercent: 60,
        votingPowerPercent: 70,
        beerSegmentsFilled: 7,
        milestone: { name: 'Synthetic', progressPercent: 10, hasNextLevel: true, max: 1000 },
        rewards: {
          hive,
          hbd,
          hivePower: hasClaimableRewards ? 0.5 : 0,
          vestingShares,
        },
        hasClaimableRewards,
      };
    },
    async getAccountRecord(account) {
      const rewards = rewardState.get(account) || {
        rewardHive: '0.000 HIVE',
        rewardHbd: '0.000 HBD',
        rewardVests: '0.000000 VESTS',
        lastClaim: null,
      };
      const liquid = liquidState.get(account);
      if (!liquid) throw new Error('Synthetic Hive account not found: ' + account);
      return {
        name: account,
        balance: canonicalLiquid(liquid.hive, 'HIVE'),
        hbd_balance: canonicalLiquid(liquid.hbd, 'HBD'),
        reward_hive_balance: rewards.rewardHive,
        reward_hbd_balance: rewards.rewardHbd,
        reward_vesting_balance: rewards.rewardVests,
      };
    },
    async getProfile(account) {
      return {
        name: account,
        displayName: account,
        about: '',
        profileImage: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E',
        followerCount: 0,
        followingCount: 0,
        postCount: roots().filter((item) => item.author === account).length,
      };
    },
    async getAccountPosts({ account } = {}) {
      return {
        items: roots()
          .filter((item) => !account || item.author === account)
          .map((item) => normalizeBrowserContent(item, commentsFor(item).length, voteRecords())),
        profiles: {},
        nextCursor: null,
      };
    },
    async getFollowers() {
      return { items: [], nextCursor: null };
    },
    async getFollowing() {
      return { items: [], nextCursor: null };
    },
    async getFollowStatus(follower, following) {
      return followState.has(followKey(follower, following));
    },
    async isCommunityMember(account, community) {
      return communityState.has(communityKey(account, community));
    },
    setFollowState(follower, following, value) {
      const key = followKey(follower, following);
      if (value) followState.add(key);
      else followState.delete(key);
    },
    setCommunityState(account, community, value) {
      const key = communityKey(account, community);
      if (value) communityState.add(key);
      else communityState.delete(key);
    },
    async observeSocialOperation(record) {
      const operation = record?.operations?.[0];
      const [type, value] = Array.isArray(operation) ? operation : [];
      if (type === 'custom_json' && value?.id === 'follow') {
        const [, payload] = JSON.parse(value.json);
        const following = Array.isArray(payload?.what) && payload.what.includes('blog');
        return followState.has(followKey(payload.follower, payload.following)) === following;
      }
      if (type === 'custom_json' && value?.id === 'community') {
        const [action, payload] = JSON.parse(value.json);
        const subscribed = action === 'subscribe';
        return communityState.has(communityKey(record.account, payload.community)) === subscribed;
      }
      return false;
    },
    async getContentRecord(author, permlink) {
      const value = contentRecords.get(contentKey(author, permlink));
      return value ? structuredClone(value) : null;
    },
    async getPostWithComments(author, permlink) {
      const root = contentRecords.get(contentKey(author, permlink));
      if (!root || root.parentAuthor !== '' || root.parentPermlink !== COMMUNITY) {
        const error = new Error('Post not found');
        error.statusCode = 404;
        error.expose = true;
        error.code = 'NOT_FOUND';
        throw error;
      }
      const comments = commentsFor(root);
      return {
        post: normalizeBrowserContent(root, comments.length, voteRecords()),
        comments: comments.map((item) => normalizeBrowserContent(item, 0, voteRecords())),
        profiles: Object.fromEntries(
          Array.from(new Set([root.author, ...comments.map((item) => item.author)]))
            .map((name) => [name, { name, displayName: name }]),
        ),
      };
    },
    async getVoteWeight(voter, author, permlink) {
      if (!contentRecords.has(contentKey(author, permlink))) return null;
      return voteState.get(voteKey(voter, author, permlink))?.weight || 0;
    },
    async observeVoteOperation(record) {
      const [type, value] = record?.operations?.[0] || [];
      if (type !== 'vote' || !value) return false;
      return (await this.getVoteWeight(value.voter, value.author, value.permlink)) === Number(value.weight);
    },
    applyVoteOperation(value) {
      assert.equal(contentRecords.has(contentKey(value.author, value.permlink)), true);
      const weight = Number(value.weight);
      assert.equal(Number.isInteger(weight), true);
      assert.ok(weight >= -10000 && weight <= 10000);
      voteState.set(voteKey(value.voter, value.author, value.permlink), {
        voter: value.voter,
        author: value.author,
        permlink: value.permlink,
        weight,
      });
    },
    voteSnapshot() {
      return voteRecords().map((item) => structuredClone(item));
    },
    async observeRewardClaimOperation(record) {
      const rewards = rewardState.get(record.account);
      const lastClaim = rewards?.lastClaim;
      if (!lastClaim || !record.transactionId) return false;
      return lastClaim.transactionId === record.transactionId
        && JSON.stringify(lastClaim.operations) === JSON.stringify(record.operations);
    },
    applyRewardClaimOperation(value, transactionId) {
      const rewards = rewardState.get(value.account);
      assert.ok(rewards, 'synthetic reward account must exist');
      assert.equal(value.reward_hive, rewards.rewardHive);
      assert.equal(value.reward_hbd, rewards.rewardHbd);
      assert.equal(value.reward_vests, rewards.rewardVests);
      const operations = [[
        'claim_reward_balance',
        {
          account: value.account,
          reward_hive: value.reward_hive,
          reward_hbd: value.reward_hbd,
          reward_vests: value.reward_vests,
        },
      ]];
      rewardState.set(value.account, {
        rewardHive: '0.000 HIVE',
        rewardHbd: '0.000 HBD',
        rewardVests: '0.000000 VESTS',
        lastClaim: { transactionId, operations },
      });
    },
    rewardSnapshot(account) {
      return structuredClone(rewardState.get(account) || null);
    },
    async observeSupportOperation(record) {
      if (!lastSupport || !record.transactionId) return false;
      const exact = lastSupport.transactionId === record.transactionId
        && JSON.stringify(lastSupport.operations) === JSON.stringify(record.operations);
      if (!exact) return false;
      lastSupport.observations += 1;
      return lastSupport.observations >= 2;
    },
    applySupportOperation(value, transactionId) {
      const sender = liquidState.get(value.from);
      const recipient = liquidState.get(value.to);
      assert.ok(sender, 'synthetic support sender must exist');
      assert.ok(recipient, 'synthetic support recipient must exist');
      assert.equal(value.memo, 'hivenues-support:v1');
      const symbol = String(value.amount).endsWith(' HBD') ? 'HBD' : 'HIVE';
      const units = parseLiquid(value.amount, symbol);
      const field = symbol === 'HBD' ? 'hbd' : 'hive';
      assert.ok(units > 0n);
      assert.ok(sender[field] >= units);
      sender[field] -= units;
      recipient[field] += units;
      const operations = [[
        'transfer',
        {
          from: value.from,
          to: value.to,
          amount: value.amount,
          memo: value.memo,
        },
      ]];
      lastSupport = { transactionId, operations, observations: 0 };
    },
    liquidSnapshot(account) {
      const liquid = liquidState.get(account);
      return liquid ? {
        hive: canonicalLiquid(liquid.hive, 'HIVE'),
        hbd: canonicalLiquid(liquid.hbd, 'HBD'),
      } : null;
    },
    async observeContentOperation(record) {
      const [type, value] = record?.operations?.[0] || [];
      if (type !== 'comment' || !value) return false;
      const observed = contentRecords.get(contentKey(value.author, value.permlink));
      if (!observed) return false;
      return observed.author === value.author
        && observed.permlink === value.permlink
        && observed.parentAuthor === value.parent_author
        && observed.parentPermlink === value.parent_permlink
        && observed.title === value.title
        && observed.body === value.body
        && observed.jsonMetadata === value.json_metadata;
    },
    applyContentOperation(value) {
      const key = contentKey(value.author, value.permlink);
      const existing = contentRecords.get(key);
      contentRecords.set(key, browserContentRecord({
        author: value.author,
        permlink: value.permlink,
        parentAuthor: value.parent_author,
        parentPermlink: value.parent_permlink,
        title: value.title,
        body: value.body,
        jsonMetadata: value.json_metadata,
        created: existing?.created || '2026-09-18T02:00:00',
      }));
    },
    contentSnapshot() {
      return Array.from(contentRecords.values()).map((item) => structuredClone(item));
    },
  };

  return service;
}

function applyAuthorizedRelationshipOperation(hiveReadService, account, operations, counters) {
  assert.equal(Array.isArray(operations), true);
  assert.equal(operations.length, 1);
  const [type, value] = operations[0];
  assert.equal(type, 'custom_json');
  assert.deepEqual(value.required_auths, []);
  assert.deepEqual(value.required_posting_auths, [account]);

  if (value.id === 'follow') {
    const [action, payload] = JSON.parse(value.json);
    assert.equal(action, 'follow');
    assert.equal(payload.follower, account);
    assert.equal(typeof payload.following, 'string');
    const following = Array.isArray(payload.what) && payload.what.includes('blog');
    hiveReadService.setFollowState(account, payload.following, following);
  } else if (value.id === 'community') {
    const [action, payload] = JSON.parse(value.json);
    assert.ok(['subscribe', 'unsubscribe'].includes(action));
    assert.equal(payload.community, COMMUNITY);
    hiveReadService.setCommunityState(account, payload.community, action === 'subscribe');
  } else {
    assert.fail('unauthorized wallet operation id: ' + String(value.id));
  }

  counters.walletBroadcasts.push({
    account,
    operations: structuredClone(operations),
  });
  return crypto.createHash('sha1')
    .update(JSON.stringify([account, operations, counters.walletBroadcasts.length]))
    .digest('hex');
}


function applyAuthorizedRewardClaimOperation(hiveReadService, account, operations, counters) {
  assert.equal(Array.isArray(operations), true);
  assert.equal(operations.length, 1);
  const [type, value] = operations[0];
  assert.equal(type, 'claim_reward_balance');
  assert.equal(value.account, account);
  assert.match(value.reward_hive, /^\d+\.\d{3} HIVE$/);
  assert.match(value.reward_hbd, /^\d+\.\d{3} HBD$/);
  assert.match(value.reward_vests, /^\d+\.\d{6} VESTS$/);
  const transactionId = crypto.createHash('sha1')
    .update(JSON.stringify([account, operations, counters.rewardClaimBroadcasts.length + 1]))
    .digest('hex');
  hiveReadService.applyRewardClaimOperation(value, transactionId);
  counters.rewardClaimBroadcasts.push({
    account,
    operations: structuredClone(operations),
    transactionId,
  });
  return transactionId;
}


function applyAuthorizedSupportOperation(hiveReadService, account, operations, counters) {
  assert.equal(Array.isArray(operations), true);
  assert.equal(operations.length, 1);
  const [type, value] = operations[0];
  assert.equal(type, 'transfer');
  assert.equal(value.from, account);
  assert.equal(value.to, 'northline-pay');
  assert.match(value.amount, /^\d+\.\d{3} (HIVE|HBD)$/);
  assert.equal(value.memo, 'hivenues-support:v1');
  const transactionId = crypto.createHash('sha1')
    .update(JSON.stringify([account, operations, counters.supportBroadcasts.length + 1]))
    .digest('hex');
  hiveReadService.applySupportOperation(value, transactionId);
  counters.supportBroadcasts.push({
    account,
    operations: structuredClone(operations),
    transactionId,
  });
  return transactionId;
}


function applyAuthorizedVoteOperation(hiveReadService, account, operations, counters) {
  assert.equal(Array.isArray(operations), true);
  assert.equal(operations.length, 1);
  const [type, value] = operations[0];
  assert.equal(type, 'vote');
  assert.equal(value.voter, account);
  assert.equal(typeof value.author, 'string');
  assert.equal(typeof value.permlink, 'string');
  assert.equal(Number.isInteger(value.weight), true);
  assert.ok(value.weight >= -10000 && value.weight <= 10000);
  hiveReadService.applyVoteOperation(value);
  counters.voteBroadcasts.push({
    account,
    operations: structuredClone(operations),
  });
  return crypto.createHash('sha1')
    .update(JSON.stringify([account, operations, counters.voteBroadcasts.length]))
    .digest('hex');
}


function applyAuthorizedContentOperation(hiveReadService, account, operations, counters) {
  assert.equal(Array.isArray(operations), true);
  assert.equal(operations.length, 1);
  const [type, value] = operations[0];
  assert.equal(type, 'comment');
  assert.equal(value.author, account);
  assert.equal(typeof value.permlink, 'string');
  assert.equal(typeof value.body, 'string');
  assert.equal(typeof value.json_metadata, 'string');
  hiveReadService.applyContentOperation(value);
  counters.contentBroadcasts.push({
    account,
    operations: structuredClone(operations),
  });
  return crypto.createHash('sha1')
    .update(JSON.stringify([account, operations, counters.contentBroadcasts.length]))
    .digest('hex');
}

async function createAuthenticatedContext(
  browser,
  counters,
  origin,
  identityServices,
  account = 'etblink',
  viewport = DESKTOP,
) {
  const context = await createTrackedContext(browser, counters, viewport);
  const { token } = identityServices.sessionStore.create(account);
  await context.addCookies([{
    name: IDENTITY_COOKIE_NAME,
    value: token,
    url: origin,
    httpOnly: true,
    sameSite: 'Strict',
  }]);
  return context;
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function isLocalRequest(url) {
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) return true;
  try {
    return ['127.0.0.1', 'localhost'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

async function stopServer(server) {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => {
    const forceTimer = setTimeout(() => server.closeAllConnections?.(), 1000);
    forceTimer.unref?.();
    server.close((error) => {
      clearTimeout(forceTimer);
      if (error) reject(error);
      else resolve();
    });
  });
}

async function pageAudit(page, axeSource, label) {
  await page.addScriptTag({ content: axeSource });
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    incompleteImages: Array.from(document.images)
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .length,
  }));
  const controls = await page.evaluate(() => {
    const held = /\b(vote|upvote|downvote|pay|send|tip|transfer|claim|reward)\b/i;
    const unauthorized = Array.from(document.querySelectorAll('a, button, input[type="submit"], [role="button"]'))
      .map((node) => ({
        text: (node.textContent || node.value || '').trim(),
        tag: node.tagName,
        authorizedVote: Boolean(node.closest('[data-hivenues-vote]')),
        authorizedRewardClaim: Boolean(node.closest('[data-hivenues-reward-claim]')),
        authorizedSupport: Boolean(node.closest('[data-hivenues-support]')),
      }))
      .filter((item) => (
        held.test(item.text)
        && !item.authorizedVote
        && !item.authorizedRewardClaim
        && !item.authorizedSupport
      ));
    const relationship = Array.from(document.querySelectorAll('[data-hivenues-participation]'))
      .map((root) => ({
        action: root.dataset.participationAction || '',
        target: root.dataset.participationTarget || '',
        button: root.querySelector('[data-participation-submit]')?.textContent?.trim() || '',
      }));
    const invalidRelationship = relationship.filter(
      (item) => !['follow', 'unfollow', 'subscribe', 'unsubscribe'].includes(item.action),
    );
    const content = Array.from(document.querySelectorAll('[data-hivenues-content]'))
      .map((root) => ({
        mode: root.dataset.contentMode || '',
        actor: root.dataset.contentActor || '',
        target: root.dataset.contentTarget || '',
      }));
    const invalidContent = content.filter(
      (item) => !['post', 'update', 'reply'].includes(item.mode),
    );
    const vote = Array.from(document.querySelectorAll('[data-hivenues-vote]'))
      .map((root) => ({
        actor: root.dataset.voteActor || '',
        url: root.dataset.voteUrl || '',
        directions: Array.from(root.querySelectorAll('[data-vote-direction]'))
          .map((button) => button.dataset.voteDirection || ''),
      }));
    const invalidVote = vote.filter((item) => (
      !item.actor
      || !/\/participation\/[^/]+\/votes\//.test(item.url)
      || !item.directions.includes('upvote')
      || item.directions.some((direction) => !['upvote', 'downvote'].includes(direction))
    ));
    const rewardClaim = Array.from(document.querySelectorAll('[data-hivenues-reward-claim]'))
      .map((root) => ({
        actor: root.dataset.rewardActor || '',
        url: root.dataset.rewardUrl || '',
        buttons: root.querySelectorAll('[data-reward-submit]').length,
      }));
    const invalidRewardClaim = rewardClaim.filter((item) => (
      !item.actor
      || !/^\/participation\/[^/]+\/rewards\/claim$/.test(item.url)
      || item.buttons !== 1
    ));
    const support = Array.from(document.querySelectorAll('[data-hivenues-support]'))
      .map((root) => ({
        actor: root.dataset.supportActor || '',
        recipient: root.dataset.supportRecipient || '',
        url: root.dataset.supportUrl || '',
        forms: root.querySelectorAll('[data-support-form]').length,
        assets: Array.from(root.querySelectorAll('[data-support-asset] option'))
          .map((option) => option.value),
      }));
    const invalidSupport = support.filter((item) => (
      !item.actor
      || !item.recipient
      || !/^\/participation\/[^/]+\/support$/.test(item.url)
      || item.forms !== 1
      || JSON.stringify(item.assets) !== JSON.stringify(['HIVE', 'HBD'])
    ));
    return {
      unauthorized,
      relationship,
      invalidRelationship,
      content,
      invalidContent,
      vote,
      invalidVote,
      rewardClaim,
      invalidRewardClaim,
      support,
      invalidSupport,
    };
  });
  const accessibility = await page.evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    const blocking = result.violations.filter((item) => ['serious', 'critical'].includes(item.impact));
    return {
      violationCount: result.violations.length,
      blockingCount: blocking.length,
      blocking: blocking.map((item) => ({
        id: item.id,
        impact: item.impact,
        nodes: item.nodes.slice(0, 5).map((node) => node.target),
      })),
    };
  });

  assert.equal(geometry.overflow, false, label + ': horizontal overflow');
  assert.equal(geometry.incompleteImages, 0, label + ': incomplete images');
  assert.deepEqual(controls.unauthorized, [], label + ': unauthorized held-write controls');
  assert.deepEqual(controls.invalidRelationship, [], label + ': invalid relationship controls');
  assert.deepEqual(controls.invalidContent, [], label + ': invalid content controls');
  assert.deepEqual(controls.invalidVote, [], label + ': invalid vote controls');
  assert.deepEqual(controls.invalidRewardClaim, [], label + ': invalid reward claim controls');
  assert.deepEqual(controls.invalidSupport, [], label + ': invalid direct-support controls');
  assert.equal(
    accessibility.blockingCount,
    0,
    label + ': blocking accessibility ' + JSON.stringify(accessibility.blocking),
  );

  return { label, geometry, controls, accessibility };
}

async function capture(page, axeSource, manifest, label) {
  const audit = await pageAudit(page, axeSource, label);
  const file = label + '.png';
  const filePath = path.join(OUTPUT_ROOT, file);
  await page.screenshot({ path: filePath, fullPage: true, animations: 'disabled' });
  const fingerprint = await page.evaluate(() => ({
    bodyClass: document.body.className,
    identityState: document.querySelector('[data-hivenues-identity]')?.dataset.identityState || '',
    identityHeading: document.querySelector('.cc-identity h2')?.textContent?.trim() || '',
    background: getComputedStyle(document.body).backgroundColor,
  }));
  const record = {
    file,
    label,
    viewport: await page.viewportSize(),
    sha256: sha256File(filePath),
    fingerprint,
  };
  manifest.audits.push(audit);
  manifest.screenshots.push(record);
  return record;
}

async function createTrackedContext(browser, counters, viewport = DESKTOP) {
  const context = await browser.newContext({ viewport });
  context.on('request', (request) => {
    const url = request.url();
    counters.requests.push(url);
    if (!isLocalRequest(url)) counters.externalRequests.push(url);
  });
  return context;
}

async function runDirectionEvidence(browser, axeSource, origin, manifest, counters) {
  const context = await createTrackedContext(browser, counters);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    for (const host of HOSTS) {
      for (const [viewportName, viewport] of [['desktop', DESKTOP], ['mobile390', MOBILE]]) {
        await page.setViewportSize(viewport);
        await page.goto(
          origin + '/hivenues/' + host.slug + '/community/updates',
          { waitUntil: 'networkidle' },
        );
        await page.locator('[data-identity-state="not-identified"]').waitFor();
        const text = await page.locator('.cc-identity').textContent();
        assert.ok(text.includes(host.heading), host.slug + ': Direction identity heading missing');
        assert.ok(text.includes('Connect an existing Hive account'), host.slug + ': existing-account path missing');
        assert.ok(text.includes('Create an account without giving HiVenues your keys'), host.slug + ': create-account path missing');
        assert.ok(text.includes('Keep using this host without connecting Hive'), host.slug + ': not-now path missing');
        assert.ok(text.includes('private key'), host.slug + ': key-custody truth missing');
        assert.ok(text.includes('does not post'), host.slug + ': consequence truth missing');
        const createAccount = page.locator('[data-identity-create-account]');
        assert.equal(await createAccount.getAttribute('href'), 'https://signup.hive.io/');
        assert.equal(await createAccount.getAttribute('target'), '_blank');
        assert.match(await createAccount.getAttribute('rel'), /noopener/);
        assert.equal(
          await page.locator('[data-identity-not-now]').getAttribute('href'),
          '/hivenues/' + host.slug,
        );
        const record = await capture(
          page,
          axeSource,
          manifest,
          host.family + '-' + viewportName + '-not-identified',
        );
        assert.ok(
          record.fingerprint.bodyClass.includes('cc-social--' + host.family),
          host.family + ': Direction body class missing',
        );
      }
    }
    const desktop = manifest.screenshots.filter((item) => item.label.endsWith('-desktop-not-identified'));
    assert.equal(desktop.length, 3);
    assert.equal(new Set(desktop.map((item) => item.sha256)).size, 3);
    assert.equal(new Set(desktop.map((item) => item.fingerprint.background)).size, 3);
  } finally {
    await context.close();
  }
}

async function runStudioOnboardingEvidence(browser, axeSource, origin, manifest, counters) {
  const context = await createTrackedContext(browser, counters);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    for (const [viewportName, viewport] of [['desktop', DESKTOP], ['mobile390', MOBILE]]) {
      await page.setViewportSize(viewport);
      await page.goto(origin + '/hivenues/studio/northline-hall', { waitUntil: 'networkidle' });
      const siteMenu = page.locator('.cc-studio-commandbar details').filter({ hasText: 'Site' });
      await siteMenu.locator('summary').click();
      await siteMenu.locator('a[href="/hivenues/studio/northline-hall/hive"]').click();
      await page.locator('[data-identity-onboarding]').waitFor();

      const text = await page.locator('.cc-identity').textContent();
      assert.match(text, /Connect an existing Hive account/);
      assert.match(text, /Create a Hive account through the ecosystem/);
      assert.match(text, /Keep building without Hive/);
      assert.match(
        await page.locator('.cc-consequence-card').textContent(),
        /identity is not blanket signing authority/i,
      );
      assert.equal(
        await page.locator('[data-identity-create-account]').getAttribute('href'),
        'https://signup.hive.io/',
      );
      assert.equal(
        await page.locator('[data-identity-not-now]').getAttribute('href'),
        '/hivenues/studio/northline-hall',
      );
      await capture(page, axeSource, manifest, 'studio-hive-onboarding-' + viewportName);
    }
  } finally {
    await context.close();
  }
}

async function installApprovalWallet(context, key, publicKey) {
  await context.exposeFunction('hivenuesSignIdentity', async (_account, message) => ({
    signature: signMessage(key, message),
    publicKey,
  }));
  await context.addInitScript(() => {
    let keychainApi = null;
    Object.defineProperty(window, 'HiVenuesKeychain', {
      configurable: true,
      get() {
        return keychainApi;
      },
      set(api) {
        class SyntheticRelationshipWallet extends api.KeychainAdapter {
          async broadcast(args) {
            window.__relationshipApproval = args;
            return new Promise((resolve, reject) => {
              window.__resolveRelationshipApproval = resolve;
              window.__rejectRelationshipApproval = reject;
            });
          }
        }
        keychainApi = Object.freeze({
          ...api,
          KeychainAdapter: SyntheticRelationshipWallet,
        });
      },
    });

    window.hive_keychain = {
      requestHandshake(callback) {
        callback({ success: true });
      },
      requestSignBuffer(account, message, authority, callback, _memo, title) {
        window.__identityApproval = { account, message, authority, callback, title };
      },
    };
    window.__approveIdentity = async () => {
      const pending = window.__identityApproval;
      if (!pending) throw new Error('No identity approval is pending.');
      const signed = await window.hivenuesSignIdentity(pending.account, pending.message);
      pending.callback({
        success: true,
        result: signed.signature,
        publicKey: signed.publicKey,
        data: {
          username: pending.account,
          message: pending.message,
        },
      });
    };
  });
}

async function inspectPendingRelationship(page) {
  return page.evaluate(() => ({
    account: window.__relationshipApproval?.account || '',
    authority: window.__relationshipApproval?.authority || '',
    operations: window.__relationshipApproval?.operations || [],
  }));
}

async function approvePendingRelationship(page, hiveReadService, counters) {
  const pending = await inspectPendingRelationship(page);
  assert.equal(pending.account, 'etblink');
  assert.equal(pending.authority, 'Posting');
  const transactionId = applyAuthorizedRelationshipOperation(
    hiveReadService,
    pending.account,
    pending.operations,
    counters,
  );
  await page.evaluate((tx) => {
    window.__resolveRelationshipApproval({
      accepted: true,
      transactionId: tx,
    });
  }, transactionId);
  return { ...pending, transactionId };
}

async function rejectPendingRelationship(page, code = 'KEYCHAIN_CANCELLED') {
  await page.evaluate((value) => {
    const error = new Error('Synthetic wallet rejection');
    error.code = value;
    window.__rejectRelationshipApproval(error);
  }, code);
}

async function runApprovalEvidence(browser, axeSource, origin, manifest, counters, key, publicKey) {
  const context = await createTrackedContext(browser, counters);
  await installApprovalWallet(context, key, publicKey);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    await page.goto(origin + '/hivenues/northline-hall/community/updates', { waitUntil: 'networkidle' });
    await page.locator('[data-identity-account]').fill('etblink');
    await page.locator('[data-identity-submit]').click();
    await page.locator('[data-identity-state="awaiting-wallet"]').waitFor();
    await capture(page, axeSource, manifest, 'poster-desktop-awaiting-wallet');

    const walletState = await page.evaluate(() => ({
      account: window.__identityApproval?.account,
      authority: window.__identityApproval?.authority,
      title: window.__identityApproval?.title,
      message: window.__identityApproval?.message,
    }));
    assert.equal(walletState.account, 'etblink');
    assert.equal(walletState.authority, 'Posting');
    assert.match(walletState.title, /HiVenues identity proof/);
    assert.match(walletState.message, /no Hive transaction or value action is authorized/);

    await page.evaluate(() => window.__approveIdentity());
    await page.locator('[data-identity-state="verified"]').waitFor({ timeout: 15000 });
    const verified = await capture(page, axeSource, manifest, 'poster-desktop-verified');
    assert.equal(verified.fingerprint.identityState, 'verified');
    assert.match(await page.locator('.cc-identity').textContent(), /@etblink/);
    assert.match(
      await page.locator('.cc-identity').textContent(),
      /does not authorize a post, vote, follow, payment, or other Hive transaction/,
    );

    await page.locator('[data-identity-disconnect]').click();
    await page.locator('[data-identity-state="not-identified"]').waitFor({ timeout: 15000 });
    assert.match(
      await page.locator('.cc-identity').textContent(),
      /Public browsing stays open whether or not you identify yourself/,
    );
  } finally {
    await context.close();
  }
}

async function runRelationshipDirectionEvidence(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
  );
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    for (const host of HOSTS) {
      for (const [viewportName, viewport] of [['desktop', DESKTOP], ['mobile390', MOBILE]]) {
        await page.setViewportSize(viewport);
        await page.goto(
          origin + '/hivenues/' + host.slug + '/community/updates',
          { waitUntil: 'networkidle' },
        );
        const control = page.locator('[data-hivenues-participation]');
        await control.waitFor();
        assert.equal(await control.getAttribute('data-participation-action'), 'subscribe');
        assert.equal(await control.getAttribute('data-participation-target'), COMMUNITY);
        const composer = page.locator('[data-hivenues-content][data-content-mode="post"]');
        await composer.waitFor();
        assert.equal(await composer.getAttribute('data-content-actor'), 'etblink');
        assert.match(await composer.textContent(), /Review|public|wallet/i);
        await capture(
          page,
          axeSource,
          manifest,
          host.family + '-' + viewportName + '-community-ready',
        );
      }

      await page.setViewportSize(DESKTOP);
      await page.goto(
        origin + '/hivenues/' + host.slug + '/community/people/juniper-lane',
        { waitUntil: 'networkidle' },
      );
      const follow = page.locator('[data-hivenues-participation]');
      await follow.waitFor();
      assert.equal(await follow.getAttribute('data-participation-action'), 'follow');
      assert.equal(await follow.getAttribute('data-participation-target'), 'juniper-lane');
      await capture(
        page,
        axeSource,
        manifest,
        host.family + '-desktop-follow-ready',
      );
    }
  } finally {
    await context.close();
  }
}

async function runRelationshipJourneys(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
  hiveReadService,
  key,
  publicKey,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
  );
  await installApprovalWallet(context, key, publicKey);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  async function reviewAndApprove(expectedAction, expectedId, labelPrefix) {
    const root = page.locator('[data-hivenues-participation]');
    assert.equal(await root.getAttribute('data-participation-action'), expectedAction);
    await root.locator('[data-participation-submit]').click();
    await page.locator('[data-participation-review][open]').waitFor();
    assert.equal(await root.getAttribute('data-participation-state'), 'review');
    const reviewText = await page.locator('[data-participation-review]').textContent();
    assert.match(reviewText, /Verified account/);
    assert.match(reviewText, new RegExp(expectedAction));
    assert.match(reviewText, /Posting|Technical operation details/i);
    await capture(page, axeSource, manifest, labelPrefix + '-review');

    await page.locator('[data-participation-confirm]').click();
    await page.locator('[data-participation-state="awaiting-wallet"]').waitFor();
    await capture(page, axeSource, manifest, labelPrefix + '-awaiting-wallet');

    const pending = await inspectPendingRelationship(page);
    assert.equal(pending.account, 'etblink');
    assert.equal(pending.authority, 'Posting');
    assert.equal(pending.operations.length, 1);
    assert.equal(pending.operations[0][0], 'custom_json');
    assert.equal(pending.operations[0][1].id, expectedId);
    return approvePendingRelationship(page, hiveReadService, counters);
  }

  try {
    await page.goto(origin + '/hivenues/northline-hall/community/updates', {
      waitUntil: 'networkidle',
    });
    await reviewAndApprove('subscribe', 'community', 'poster-community-subscribe');
    await page.waitForFunction(() => (
      document.querySelector('[data-hivenues-participation]')?.dataset.participationAction === 'unsubscribe'
    ));
    assert.equal(await hiveReadService.isCommunityMember('etblink', COMMUNITY), true);
    await capture(page, axeSource, manifest, 'poster-community-subscribed');

    await reviewAndApprove('unsubscribe', 'community', 'poster-community-unsubscribe');
    await page.waitForFunction(() => (
      document.querySelector('[data-hivenues-participation]')?.dataset.participationAction === 'subscribe'
    ));
    assert.equal(await hiveReadService.isCommunityMember('etblink', COMMUNITY), false);
    await capture(page, axeSource, manifest, 'poster-community-unsubscribed');

    await page.goto(
      origin + '/hivenues/northline-hall/community/people/juniper-lane',
      { waitUntil: 'networkidle' },
    );
    await reviewAndApprove('follow', 'follow', 'poster-follow');
    await page.waitForFunction(() => (
      document.querySelector('[data-hivenues-participation]')?.dataset.participationAction === 'unfollow'
    ));
    assert.equal(await hiveReadService.getFollowStatus('etblink', 'juniper-lane'), true);
    await capture(page, axeSource, manifest, 'poster-follow-confirmed');

    await reviewAndApprove('unfollow', 'follow', 'poster-unfollow');
    await page.waitForFunction(() => (
      document.querySelector('[data-hivenues-participation]')?.dataset.participationAction === 'follow'
    ));
    assert.equal(await hiveReadService.getFollowStatus('etblink', 'juniper-lane'), false);
    await capture(page, axeSource, manifest, 'poster-unfollow-confirmed');
  } finally {
    await context.close();
  }
}

async function runRelationshipCancellationEvidence(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
  hiveReadService,
  key,
  publicKey,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
    'paper-sparrow',
  );
  await installApprovalWallet(context, key, publicKey);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    await page.goto(origin + '/hivenues/nova-ashby/community/updates', {
      waitUntil: 'networkidle',
    });
    const root = page.locator('[data-hivenues-participation]');
    await root.locator('[data-participation-submit]').click();
    await page.locator('[data-participation-review][open]').waitFor();
    await page.locator('[data-participation-confirm]').click();
    await page.locator('[data-participation-state="awaiting-wallet"]').waitFor();
    await rejectPendingRelationship(page);
    await page.locator('[data-participation-state="cancelled"]').waitFor();
    assert.equal(await hiveReadService.isCommunityMember('paper-sparrow', COMMUNITY), false);
    assert.match(
      await root.locator('[data-participation-status]').textContent(),
      /Nothing was broadcast/,
    );
    await capture(page, axeSource, manifest, 'editorial-community-wallet-cancelled');
  } finally {
    await context.close();
  }
}

async function runRelationshipProviderUnavailableEvidence(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
  hiveReadService,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
    'blue-cup',
  );
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    await page.goto(
      origin + '/hivenues/harbor-and-hearth/community/people/juniper-lane',
      { waitUntil: 'networkidle' },
    );
    const root = page.locator('[data-hivenues-participation]');
    await root.locator('[data-participation-submit]').click();
    await page.locator('[data-participation-review][open]').waitFor();
    await page.locator('[data-participation-confirm]').click();
    await page.locator('[data-participation-state="provider-unavailable"]').waitFor();
    assert.equal(await hiveReadService.getFollowStatus('blue-cup', 'juniper-lane'), false);
    assert.match(
      await root.locator('[data-participation-status]').textContent(),
      /(Hive Keychain was not found|human-owned Hive wallet)/i,
    );
    await capture(page, axeSource, manifest, 'hospitality-follow-wallet-unavailable');
  } finally {
    await context.close();
  }
}

async function approvePendingContent(page, hiveReadService, counters) {
  const pending = await inspectPendingRelationship(page);
  assert.equal(pending.account, 'etblink');
  assert.equal(pending.authority, 'Posting');
  assert.equal(pending.operations.length, 1);
  assert.equal(pending.operations[0][0], 'comment');
  const transactionId = applyAuthorizedContentOperation(
    hiveReadService,
    pending.account,
    pending.operations,
    counters,
  );
  await page.evaluate((tx) => {
    window.__resolveRelationshipApproval({
      accepted: true,
      transactionId: tx,
    });
  }, transactionId);
  return { ...pending, transactionId };
}

async function approvePendingVote(page, hiveReadService, counters) {
  const pending = await inspectPendingRelationship(page);
  assert.equal(pending.account, 'etblink');
  assert.equal(pending.authority, 'Posting');
  assert.equal(pending.operations.length, 1);
  assert.equal(pending.operations[0][0], 'vote');
  const transactionId = applyAuthorizedVoteOperation(
    hiveReadService,
    pending.account,
    pending.operations,
    counters,
  );
  await page.evaluate((tx) => {
    window.__resolveRelationshipApproval({
      accepted: true,
      transactionId: tx,
    });
  }, transactionId);
  return { ...pending, transactionId };
}

async function approvePendingRewardClaim(page, hiveReadService, counters) {
  const pending = await inspectPendingRelationship(page);
  assert.equal(pending.account, 'etblink');
  assert.equal(pending.authority, 'Posting');
  assert.equal(pending.operations.length, 1);
  assert.equal(pending.operations[0][0], 'claim_reward_balance');
  const transactionId = applyAuthorizedRewardClaimOperation(
    hiveReadService,
    pending.account,
    pending.operations,
    counters,
  );
  await page.evaluate((tx) => {
    window.__resolveRelationshipApproval({
      accepted: true,
      transactionId: tx,
    });
  }, transactionId);
  return { ...pending, transactionId };
}

async function approvePendingSupport(page, hiveReadService, counters) {
  const pending = await inspectPendingRelationship(page);
  assert.equal(pending.account, 'etblink');
  assert.equal(pending.authority, 'Active');
  assert.equal(pending.operations.length, 1);
  assert.equal(pending.operations[0][0], 'transfer');
  const transactionId = applyAuthorizedSupportOperation(
    hiveReadService,
    pending.account,
    pending.operations,
    counters,
  );
  await page.evaluate((tx) => {
    window.__resolveRelationshipApproval({
      accepted: true,
      transactionId: tx,
    });
  }, transactionId);
  return { ...pending, transactionId };
}

async function runResourceRewardEvidence(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
  );
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  const cases = [
    {
      slug: 'northline-hall',
      family: 'poster',
      title: 'Your participation energy',
      metaphor: 'Raise-a-glass strength',
      claimAction: 'Collect rewards',
    },
    {
      slug: 'nova-ashby',
      family: 'editorial',
      title: 'Your participation capacity',
      metaphor: 'Recommendation strength',
      claimAction: 'Claim rewards',
    },
    {
      slug: 'harbor-and-hearth',
      family: 'hospitality',
      title: 'Your participation readiness',
      metaphor: 'Applause strength',
      claimAction: 'Collect rewards',
    },
  ];

  try {
    for (const item of cases) {
      for (const [viewportName, viewport] of [['desktop', DESKTOP], ['mobile390', MOBILE]]) {
        await page.setViewportSize(viewport);
        await page.goto(
          origin + '/hivenues/' + item.slug + '/community/people/etblink',
          { waitUntil: 'networkidle' },
        );
        const resource = page.locator('.cc-resource-state').first();
        await resource.waitFor();
        assert.match(await resource.textContent(), new RegExp(item.title));
        assert.match(await resource.textContent(), new RegExp(item.metaphor));
        assert.match(await resource.textContent(), /70\.0%/);
        assert.match(await resource.textContent(), /60\.0%/);
        assert.match(await resource.textContent(), /550\.000 HP/);
        assert.match(await resource.textContent(), /Resource Credits \(RC\)/);
        assert.match(await resource.textContent(), /Claimable rewards/);
        assert.match(
          await resource.locator('[data-reward-submit]').textContent(),
          new RegExp(item.claimAction),
        );
        assert.match(
          await resource.textContent(),
          /only available change here is claiming these exact pending rewards/i,
        );
        assert.equal(
          await resource.locator('[data-reward-submit]').count(),
          1,
        );
        await capture(
          page,
          axeSource,
          manifest,
          item.family + '-resource-reward-' + viewportName,
        );
      }
    }
  } finally {
    await context.close();
  }
}

async function runRewardClaimJourney(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
  hiveReadService,
  key,
  publicKey,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
  );
  await installApprovalWallet(context, key, publicKey);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    await page.goto(
      origin + '/hivenues/northline-hall/community/people/etblink',
      { waitUntil: 'networkidle' },
    );
    const root = page.locator('[data-hivenues-reward-claim]').first();
    await root.waitFor();
    assert.equal(await root.locator('[data-reward-submit]').textContent(), 'Collect rewards');

    await root.locator('[data-reward-submit]').click();
    const dialog = root.locator('[data-reward-review][open]');
    await dialog.waitFor();
    assert.equal(await root.getAttribute('data-reward-state'), 'review');
    assert.equal(await dialog.locator('[data-reward-review-account]').textContent(), '@etblink');
    assert.equal(await dialog.locator('[data-reward-review-hive]').textContent(), '1.000 HIVE');
    assert.equal(await dialog.locator('[data-reward-review-hbd]').textContent(), '0.500 HBD');
    assert.equal(
      await dialog.locator('[data-reward-review-vests]').textContent(),
      '1000.000000 VESTS',
    );
    assert.equal(await dialog.locator('[data-reward-review-authority]').textContent(), 'Posting');
    assert.match(
      await dialog.locator('[data-reward-review-operations]').textContent(),
      /claim_reward_balance/,
    );
    await capture(page, axeSource, manifest, 'poster-reward-claim-review');

    await dialog.locator('[data-reward-confirm]').click();
    await page.locator('[data-reward-state="awaiting-wallet"]').waitFor();
    await capture(page, axeSource, manifest, 'poster-reward-claim-awaiting-wallet');

    const reload = page.waitForEvent('load');
    await approvePendingRewardClaim(page, hiveReadService, counters);
    await reload;
    await page.waitForLoadState('networkidle');

    const resource = page.locator('.cc-resource-state').first();
    await resource.waitFor();
    assert.equal(await resource.locator('[data-hivenues-reward-claim]').count(), 0);
    assert.match(await resource.textContent(), /No claimable Hive rewards are waiting right now/);
    assert.match(await resource.textContent(), /This resource view is read-only/);
    const rewardSnapshot = hiveReadService.rewardSnapshot('etblink');
    assert.equal(rewardSnapshot.rewardHive, '0.000 HIVE');
    assert.equal(rewardSnapshot.rewardHbd, '0.000 HBD');
    assert.equal(rewardSnapshot.rewardVests, '0.000000 VESTS');
    await capture(page, axeSource, manifest, 'poster-reward-claim-confirmed');
  } finally {
    await context.close();
  }
}

async function runSupportPresentationEvidence(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
) {
  const context = await createTrackedContext(browser, counters);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  const cases = [
    {
      slug: 'northline-hall',
      family: 'poster',
      action: 'Support the room',
      recipient: 'northline-pay',
    },
    {
      slug: 'nova-ashby',
      family: 'editorial',
      action: 'Support the work',
      recipient: 'nova-pay',
    },
    {
      slug: 'harbor-and-hearth',
      family: 'hospitality',
      action: 'Leave something for the house',
      recipient: 'harbor-pay',
    },
  ];

  try {
    for (const item of cases) {
      for (const [viewportName, viewport] of [['desktop', DESKTOP], ['mobile390', MOBILE]]) {
        await page.setViewportSize(viewport);
        await page.goto(
          origin + '/hivenues/' + item.slug + '/support',
          { waitUntil: 'networkidle' },
        );
        assert.equal(await page.locator('h1').textContent(), item.action);
        assert.match(await page.locator('.cc-support-mast').textContent(), new RegExp('@' + item.recipient));
        assert.match(await page.locator('.cc-support-truth').textContent(), /direct support, not checkout/i);
        assert.match(await page.locator('.cc-support-truth').textContent(), /Active/);
        assert.match(await page.locator('.cc-support-truth').textContent(), /irreversible/i);
        assert.equal(await page.locator('[data-hivenues-support]').count(), 0);
        assert.equal(await page.locator('[data-identity-state="not-identified"]').count(), 1);
        await capture(
          page,
          axeSource,
          manifest,
          item.family + '-direct-support-' + viewportName + '-identity-required',
        );
      }
    }
  } finally {
    await context.close();
  }
}

async function runSupportJourney(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
  hiveReadService,
  key,
  publicKey,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
  );
  await installApprovalWallet(context, key, publicKey);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    assert.deepEqual(hiveReadService.liquidSnapshot('etblink'), {
      hive: '12.345 HIVE',
      hbd: '6.789 HBD',
    });
    assert.deepEqual(hiveReadService.liquidSnapshot('northline-pay'), {
      hive: '0.500 HIVE',
      hbd: '0.250 HBD',
    });

    await page.goto(
      origin + '/hivenues/northline-hall/support',
      { waitUntil: 'networkidle' },
    );
    const root = page.locator('[data-hivenues-support]').first();
    await root.waitFor();
    assert.equal(await root.getAttribute('data-support-actor'), 'etblink');
    assert.equal(await root.getAttribute('data-support-recipient'), 'northline-pay');
    assert.match(await root.textContent(), /Support the room/);

    await root.locator('[data-support-amount]').fill('1.250');
    await root.locator('[data-support-asset]').selectOption('HIVE');
    await root.locator('[data-support-form]').evaluate((form) => form.requestSubmit());

    const dialog = root.locator('[data-support-review][open]');
    await dialog.waitFor();
    assert.equal(await root.getAttribute('data-support-state'), 'review');
    assert.equal(await dialog.locator('[data-support-review-sender]').textContent(), '@etblink');
    assert.equal(await dialog.locator('[data-support-review-recipient]').textContent(), '@northline-pay');
    assert.equal(await dialog.locator('[data-support-review-amount]').textContent(), '1.250 HIVE');
    assert.equal(await dialog.locator('[data-support-review-balance]').textContent(), '12.345 HIVE');
    assert.equal(await dialog.locator('[data-support-review-authority]').textContent(), 'Active');
    assert.equal(await dialog.locator('[data-support-review-memo]').textContent(), 'hivenues-support:v1');
    assert.match(await dialog.textContent(), /not proof of a purchase/i);
    assert.match(await dialog.textContent(), /normally irreversible/i);
    assert.match(await dialog.locator('[data-support-review-operations]').textContent(), /"transfer"/);
    await capture(page, axeSource, manifest, 'poster-direct-support-review');

    await dialog.locator('[data-support-confirm]').click();
    await page.locator('[data-support-state="awaiting-wallet"]').waitFor();
    const pendingWallet = await inspectPendingRelationship(page);
    assert.equal(pendingWallet.account, 'etblink');
    assert.equal(pendingWallet.authority, 'Active');
    assert.deepEqual(pendingWallet.operations, [[
      'transfer',
      {
        from: 'etblink',
        to: 'northline-pay',
        amount: '1.250 HIVE',
        memo: 'hivenues-support:v1',
      },
    ]]);
    await capture(page, axeSource, manifest, 'poster-direct-support-awaiting-wallet');

    await approvePendingSupport(page, hiveReadService, counters);
    await page.locator('[data-support-state="pending"]').waitFor({ timeout: 5000 });
    assert.match(
      await root.locator('[data-support-status]').textContent(),
      /(accepted|pending|confirmation)/i,
    );
    await capture(page, axeSource, manifest, 'poster-direct-support-canonical-pending');

    await page.locator('[data-support-state="confirmed"]').waitFor({ timeout: 7000 });
    assert.match(
      await root.locator('[data-support-status]').textContent(),
      /Confirmed on Hive\. 1\.250 HIVE was sent to @northline-pay\./,
    );
    assert.equal(await root.locator('[data-support-submit]').isDisabled(), true);
    assert.deepEqual(hiveReadService.liquidSnapshot('etblink'), {
      hive: '11.095 HIVE',
      hbd: '6.789 HBD',
    });
    assert.deepEqual(hiveReadService.liquidSnapshot('northline-pay'), {
      hive: '1.750 HIVE',
      hbd: '0.250 HBD',
    });
    assert.equal(counters.supportBroadcasts.length, 1);
    await capture(page, axeSource, manifest, 'poster-direct-support-confirmed');
  } finally {
    await context.close();
  }
}

async function runValueRecipientStudioEvidence(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  store,
) {
  const context = await createTrackedContext(browser, counters);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    await page.setViewportSize(DESKTOP);
    await page.goto(origin + '/hivenues/studio/northline-hall', { waitUntil: 'networkidle' });
    await page.locator('.cc-studio-commandbar details').filter({ hasText: 'Site' }).locator('summary').click();
    await page.getByRole('button', { name: 'Support & value' }).click();
    const inspector = page.locator('#candidate-inspector');
    await inspector.getByText('Choose who receives direct support.').waitFor();
    assert.equal(await inspector.locator('input[name="valueRecipient"]').inputValue(), 'northline-pay');
    assert.match(await inspector.textContent(), /separate money-recipient role/i);
    assert.match(await inspector.textContent(), /No private key is stored here/i);
    assert.match(await inspector.textContent(), /Working version only/i);
    await capture(page, axeSource, manifest, 'poster-studio-value-recipient-desktop');

    const liveBefore = store.publicSnapshot('northline-hall').draftDigest;
    const releasedRecipient = store.publicSnapshot('northline-hall').draft.bindings.hive.valueRecipient;
    assert.equal(releasedRecipient, 'northline-pay');
    await inspector.locator('input[name="valueRecipient"]').fill('northline-alt');
    const saved = page.waitForResponse((response) => (
      response.request().method() === 'POST'
      && new URL(response.url()).pathname === '/hivenues/studio/northline-hall/value-recipient'
    ));
    await inspector.getByRole('button', { name: 'Save value recipient' }).click();
    assert.equal((await saved).status(), 200);
    await inspector.locator('input[name="valueRecipient"]').waitFor();
    assert.equal(
      await inspector.locator('input[name="valueRecipient"]').inputValue(),
      'northline-alt',
    );
    assert.equal(
      store.snapshot('northline-hall').draft.bindings.hive.valueRecipient,
      'northline-alt',
    );
    assert.equal(
      store.publicSnapshot('northline-hall').draft.bindings.hive.valueRecipient,
      'northline-pay',
    );
    assert.equal(store.publicSnapshot('northline-hall').draftDigest, liveBefore);

    await page.setViewportSize(MOBILE);
    await capture(page, axeSource, manifest, 'poster-studio-value-recipient-mobile390');
  } finally {
    await context.close();
  }
}

async function runVotePolicyStudioEvidence(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
) {
  const context = await createTrackedContext(browser, counters);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    for (const [viewportName, viewport] of [['desktop', DESKTOP], ['mobile390', MOBILE]]) {
      await page.setViewportSize(viewport);
      await page.goto(origin + '/hivenues/studio/northline-hall', { waitUntil: 'networkidle' });
      await page.locator('.cc-studio-commandbar details').filter({ hasText: 'Site' }).locator('summary').click();
      await page.locator('button[hx-get*="resource=participation"]').click();
      const inspector = page.locator('#candidate-inspector');
      await inspector.getByText('Choose whether this site shows a downvote action.').waitFor();
      assert.equal(
        await inspector.locator('input[name="showNegativeVoteAction"][value="show"]').isChecked(),
        true,
      );
      assert.match(await inspector.textContent(), /does not make downvotes impossible on Hive/i);
      assert.match(await inspector.textContent(), /another compatible Hive client/i);
      await capture(
        page,
        axeSource,
        manifest,
        'poster-studio-vote-policy-' + viewportName,
      );
    }
  } finally {
    await context.close();
  }
}

async function runVotePresentationEvidence(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
  );
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  const cases = [
    {
      slug: 'northline-hall',
      family: 'poster',
      negativeShown: true,
      positiveLabel: 'Raise a glass',
      negativeLabel: 'Not for this room',
    },
    {
      slug: 'nova-ashby',
      family: 'editorial',
      negativeShown: false,
      positiveLabel: 'Send a spark',
      negativeLabel: 'Push back',
    },
  ];

  try {
    for (const item of cases) {
      for (const [viewportName, viewport] of [['desktop', DESKTOP], ['mobile390', MOBILE]]) {
        await page.setViewportSize(viewport);
        await page.goto(
          origin + '/hivenues/' + item.slug + '/community/posts/etblink/room-note',
          { waitUntil: 'networkidle' },
        );
        const vote = page.locator('.cc-discussion-root [data-hivenues-vote]').first();
        await vote.waitFor();
        assert.equal(await vote.locator('[data-vote-direction="upvote"]').textContent(), item.positiveLabel);
        assert.equal(await vote.locator('[data-vote-direction="downvote"]').count(), item.negativeShown ? 1 : 0);
        if (item.negativeShown) {
          assert.equal(
            await vote.locator('[data-vote-direction="downvote"]').textContent(),
            item.negativeLabel,
          );
        } else {
          assert.doesNotMatch(await vote.textContent(), new RegExp(item.negativeLabel, 'i'));
        }
        assert.equal(
          await page.locator('.cc-discussion-root [title="Negative Hive votes"]').first().textContent(),
          '↓ 1',
        );
        await capture(
          page,
          axeSource,
          manifest,
          item.family + '-vote-' + (item.negativeShown ? 'enabled-' : 'hidden-') + viewportName,
        );
      }
    }
  } finally {
    await context.close();
  }
}

async function runVoteJourneys(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
  hiveReadService,
  key,
  publicKey,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
  );
  await installApprovalWallet(context, key, publicKey);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  async function cast(direction, percent, labelPrefix, expectedWeight) {
    const vote = page.locator('.cc-discussion-root [data-hivenues-vote]').first();
    await vote.waitFor();
    await vote.locator('[data-vote-percent]').evaluate((input, value) => {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, String(percent));
    await vote.locator('[data-vote-direction="' + direction + '"]').click();

    const dialog = vote.locator('[data-vote-review][open]');
    await dialog.waitFor();
    assert.equal(await vote.getAttribute('data-vote-state'), 'review');
    assert.equal(await dialog.locator('[data-vote-review-account]').textContent(), '@etblink');
    assert.equal(await dialog.locator('[data-vote-review-direction]').textContent(), direction);
    assert.equal(await dialog.locator('[data-vote-review-percent]').textContent(), percent + '%');
    assert.equal(
      Number(await dialog.locator('[data-vote-review-weight]').textContent()),
      expectedWeight,
    );
    assert.equal(await dialog.locator('[data-vote-review-authority]').textContent(), 'Posting');
    assert.match(await dialog.locator('[data-vote-review-operations]').textContent(), /"vote"/);
    await capture(page, axeSource, manifest, labelPrefix + '-review');

    await dialog.locator('[data-vote-confirm]').click();
    await page.locator('[data-vote-state="awaiting-wallet"]').waitFor();
    await capture(page, axeSource, manifest, labelPrefix + '-awaiting-wallet');

    const reload = page.waitForEvent('load');
    await approvePendingVote(page, hiveReadService, counters);
    await reload;
    await page.waitForLoadState('networkidle');
    const refreshed = page.locator('.cc-discussion-root [data-hivenues-vote]').first();
    await refreshed.waitFor();
    assert.match(
      await refreshed.locator('[data-vote-current]').textContent(),
      new RegExp((expectedWeight > 0 ? '\\+' : '') + (expectedWeight / 100) + '% from @etblink'),
    );
    await capture(page, axeSource, manifest, labelPrefix + '-confirmed');
  }

  try {
    await page.goto(
      origin + '/hivenues/northline-hall/community/posts/etblink/room-note',
      { waitUntil: 'networkidle' },
    );
    await cast('upvote', 42, 'poster-vote-upvote', 4200);
    await cast('downvote', 37, 'poster-vote-downvote', -3700);
  } finally {
    await context.close();
  }
}

async function runContentJourneys(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
  hiveReadService,
  key,
  publicKey,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
  );
  await installApprovalWallet(context, key, publicKey);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  async function reviewAndApprove(root, expectedAction, labelPrefix) {
    await root.locator('[data-content-submit]').click();
    const dialog = root.locator('[data-content-review][open]');
    await dialog.waitFor();
    assert.equal(await root.getAttribute('data-content-state'), 'review');
    assert.equal(await dialog.locator('[data-content-review-action]').textContent(), expectedAction);
    assert.equal(await dialog.locator('[data-content-review-account]').textContent(), '@etblink');
    assert.match(await dialog.locator('[data-content-review-operations]').textContent(), /"comment"/);
    await capture(page, axeSource, manifest, labelPrefix + '-review');

    await dialog.locator('[data-content-confirm]').click();
    await page.locator('[data-content-state="awaiting-wallet"]').waitFor();
    await capture(page, axeSource, manifest, labelPrefix + '-awaiting-wallet');
    return approvePendingContent(page, hiveReadService, counters);
  }

  try {
    await page.goto(origin + '/hivenues/northline-hall/community/updates', {
      waitUntil: 'networkidle',
    });
    const post = page.locator('[data-hivenues-content][data-content-mode="post"]');
    await post.locator('[data-content-title]').fill('Browser-qualified room note');
    await post.locator('[data-content-body]').fill('Published through the exact Stage 3 human-wallet path.');
    await reviewAndApprove(post, 'post', 'poster-content-post');
    await page.waitForURL(/\/hivenues\/northline-hall\/community\/posts\/etblink\//, {
      timeout: 15000,
    });
    await page.getByText('Browser-qualified room note', { exact: true }).first().waitFor();
    await capture(page, axeSource, manifest, 'poster-content-post-confirmed');

    await page.locator('.cc-content-task--update > summary').click();
    const update = page.locator('[data-hivenues-content][data-content-mode="update"]');
    await update.locator('[data-content-title]').fill('Browser-qualified room note — revised');
    await update.locator('[data-content-body]').fill('The same public post, revised through my own wallet.');
    await update.locator('[data-content-submit]').click();
    const updateDialog = update.locator('[data-content-review][open]');
    await updateDialog.waitFor();
    assert.match(await updateDialog.textContent(), /Currently public/);
    assert.match(await updateDialog.textContent(), /After this update/);
    assert.match(await updateDialog.textContent(), /Browser-qualified room note/);
    assert.match(await updateDialog.textContent(), /Browser-qualified room note — revised/);
    await capture(page, axeSource, manifest, 'poster-content-update-review');
    await updateDialog.locator('[data-content-confirm]').click();
    await page.locator('[data-content-state="awaiting-wallet"]').waitFor();
    await capture(page, axeSource, manifest, 'poster-content-update-awaiting-wallet');
    const updateReload = page.waitForEvent('load');
    await approvePendingContent(page, hiveReadService, counters);
    await updateReload;
    await page.waitForLoadState('networkidle');
    await page.getByText('Browser-qualified room note — revised', { exact: true }).first().waitFor({
      timeout: 15000,
    });
    await capture(page, axeSource, manifest, 'poster-content-update-confirmed');

    const reply = page.locator('[data-hivenues-content][data-content-mode="reply"]').first();
    await reply.locator('[data-content-body]').fill('A browser-qualified public response.');
    const replyReload = page.waitForEvent('load');
    await reviewAndApprove(reply, 'reply', 'poster-content-reply');
    await replyReload;
    await page.waitForLoadState('networkidle');
    await page.getByText('A browser-qualified public response.', { exact: true }).first().waitFor({
      timeout: 15000,
    });
    await capture(page, axeSource, manifest, 'poster-content-reply-confirmed');
  } finally {
    await context.close();
  }
}

async function runContentCancellationEvidence(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
  key,
  publicKey,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
    'paper-sparrow',
  );
  await installApprovalWallet(context, key, publicKey);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    await page.goto(origin + '/hivenues/nova-ashby/community/updates', {
      waitUntil: 'networkidle',
    });
    const root = page.locator('[data-hivenues-content][data-content-mode="post"]');
    await root.locator('[data-content-title]').fill('Cancelled dispatch');
    await root.locator('[data-content-body]').fill('This must never become canonical content.');
    await root.locator('[data-content-submit]').click();
    await root.locator('[data-content-review][open]').waitFor();
    await root.locator('[data-content-confirm]').click();
    await page.locator('[data-content-state="awaiting-wallet"]').waitFor();
    await rejectPendingRelationship(page);
    await page.locator('[data-content-state="cancelled"]').waitFor();
    assert.match(
      await root.locator('[data-content-status]').textContent(),
      /Nothing was published/,
    );
    await capture(page, axeSource, manifest, 'editorial-content-wallet-cancelled');
  } finally {
    await context.close();
  }
}

async function runContentProviderUnavailableEvidence(
  browser,
  axeSource,
  origin,
  manifest,
  counters,
  identityServices,
) {
  const context = await createAuthenticatedContext(
    browser,
    counters,
    origin,
    identityServices,
    'blue-cup',
  );
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    await page.goto(origin + '/hivenues/harbor-and-hearth/community/updates', {
      waitUntil: 'networkidle',
    });
    const root = page.locator('[data-hivenues-content][data-content-mode="post"]');
    await root.locator('[data-content-title]').fill('Unavailable note');
    await root.locator('[data-content-body]').fill('This stays a draft because no human wallet is available.');
    await root.locator('[data-content-submit]').click();
    await root.locator('[data-content-review][open]').waitFor();
    await root.locator('[data-content-confirm]').click();
    await page.locator('[data-content-state="provider-unavailable"]').waitFor();
    assert.match(
      await root.locator('[data-content-status]').textContent(),
      /(Hive Keychain was not found|human-owned Hive wallet)/i,
    );
    await capture(page, axeSource, manifest, 'hospitality-content-wallet-unavailable');
  } finally {
    await context.close();
  }
}

async function runCancellationEvidence(browser, axeSource, origin, manifest, counters) {
  const context = await createTrackedContext(browser, counters);
  await context.addInitScript(() => {
    window.hive_keychain = {
      requestHandshake(callback) {
        callback({ success: true });
      },
      requestSignBuffer(_account, _message, _authority, callback) {
        callback({ success: false, error: 'User cancelled the request.' });
      },
    };
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    await page.goto(origin + '/hivenues/nova-ashby/community/updates', { waitUntil: 'networkidle' });
    await page.locator('[data-identity-account]').fill('etblink');
    await page.locator('[data-identity-submit]').click();
    await page.locator('[data-identity-state="cancelled"]').waitFor();
    const text = await page.locator('.cc-identity').textContent();
    assert.match(text, /No Hive transaction or participation action occurred/);
    await capture(page, axeSource, manifest, 'editorial-desktop-cancelled');
  } finally {
    await context.close();
  }
}

async function runUnavailableEvidence(browser, axeSource, publicKey, manifest) {
  const store = new HiVenuesStore({ hosts: qualificationHosts() });
  const before = store.diagnostics();
  const hiveReadService = productReadService(publicKey);
  const app = createHiVenuesApp({
    store,
    hiveReadService,
    socialBindings: socialBindings(),
    identityServices: false,
  });
  const server = await startHiVenuesServer(app, { port: 0 });
  const origin = 'http://127.0.0.1:' + server.address().port;
  const counters = { requests: [], externalRequests: [], consoleErrors: [] };
  const context = await createTrackedContext(browser, counters);
  const page = await context.newPage();
  page.on('pageerror', (error) => counters.consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') counters.consoleErrors.push(message.text());
  });

  try {
    await page.goto(origin + '/hivenues/harbor-and-hearth/community/updates', { waitUntil: 'networkidle' });
    await page.locator('[data-identity-state="provider-unavailable"]').waitFor();
    assert.match(
      await page.locator('.cc-identity').textContent(),
      /keep browsing this public community without signing in/,
    );
    await capture(page, axeSource, manifest, 'hospitality-desktop-provider-unavailable');
    assert.deepEqual(store.diagnostics(), before);
    assert.deepEqual(counters.externalRequests, []);
    assert.deepEqual(counters.consoleErrors, []);
  } finally {
    await context.close();
    await stopServer(server);
  }
}

function publicReleaseInvariant(snapshot) {
  return {
    revision: snapshot.revision,
    draft: snapshot.draft,
    releases: snapshot.releases,
    liveReleaseId: snapshot.liveReleaseId,
    draftDigest: snapshot.draftDigest,
  };
}

async function main() {
  fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });

  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  const key = await signingKey();
  const publicKey = key.createPublic().toString();
  const store = new HiVenuesStore({ hosts: qualificationHosts() });
  const before = store.diagnostics();
  const beforePublicSnapshots = Object.fromEntries(
    HOSTS.map(({ slug }) => [
      slug,
      JSON.stringify(publicReleaseInvariant(store.publicSnapshot(slug))),
    ]),
  );
  const hiveReadService = productReadService(publicKey);
  const identityServices = createHiVenuesIdentityServices({
    hiveReadService,
    sessionSecret: 'product-browser-identity-session-secret-0001',
  });
  const app = createHiVenuesApp({
    store,
    hiveReadService,
    identityServices,
    socialBindings: socialBindings(),
  });
  const server = await startHiVenuesServer(app, { port: 0 });
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  const counters = {
    requests: [],
    externalRequests: [],
    consoleErrors: [],
    walletBroadcasts: [],
    contentBroadcasts: [],
    voteBroadcasts: [],
    rewardClaimBroadcasts: [],
    supportBroadcasts: [],
  };
  const manifest = {
    qualification: 'hivenues-product-browser-participation',
    candidate: EXACT_SHA,
    tree: EXACT_TREE,
    synthetic: true,
    liveHiveRequired: false,
    screenshots: [],
    audits: [],
    scenarios: [
      'three-direction-not-identified',
      'progressive-account-onboarding',
      'studio-progressive-account-onboarding',
      'awaiting-wallet',
      'verified',
      'disconnect',
      'wallet-cancelled',
      'provider-unavailable',
      'three-direction-community-controls',
      'three-direction-follow-controls',
      'community-subscribe',
      'community-unsubscribe',
      'follow',
      'unfollow',
      'relationship-wallet-cancelled',
      'relationship-wallet-unavailable',
      'three-direction-content-composers',
      'root-post',
      'own-post-update',
      'reply',
      'content-wallet-cancelled',
      'content-wallet-unavailable',
      'vote-enabled-desktop-mobile',
      'vote-hidden-desktop-mobile',
      'vote-review',
      'vote-wallet-pending',
      'vote-canonical-confirmation',
      'three-direction-resource-reward-owner-state',
      'studio-value-recipient-working-only',
      'reward-claim-review',
      'reward-claim-wallet-pending',
      'reward-claim-canonical-confirmation',
      'three-direction-direct-support-identity-required',
      'direct-support-review',
      'direct-support-wallet-pending',
      'direct-support-canonical-pending',
      'direct-support-canonical-confirmation',
    ],
  };

  try {
    await runDirectionEvidence(browser, axeSource, origin, manifest, counters);
    await runStudioOnboardingEvidence(browser, axeSource, origin, manifest, counters);
    await runApprovalEvidence(browser, axeSource, origin, manifest, counters, key, publicKey);
    await runCancellationEvidence(browser, axeSource, origin, manifest, counters);
    await runUnavailableEvidence(browser, axeSource, publicKey, manifest);
    await runRelationshipDirectionEvidence(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
    );
    await runRelationshipJourneys(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
      hiveReadService,
      key,
      publicKey,
    );
    await runRelationshipCancellationEvidence(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
      hiveReadService,
      key,
      publicKey,
    );
    await runRelationshipProviderUnavailableEvidence(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
      hiveReadService,
    );
    await runResourceRewardEvidence(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
    );
    await runRewardClaimJourney(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
      hiveReadService,
      key,
      publicKey,
    );
    await runSupportPresentationEvidence(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
    );
    await runSupportJourney(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
      hiveReadService,
      key,
      publicKey,
    );
    await runValueRecipientStudioEvidence(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      store,
    );
    await runVotePolicyStudioEvidence(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
    );
    await runVotePresentationEvidence(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
    );
    await runVoteJourneys(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
      hiveReadService,
      key,
      publicKey,
    );
    await runContentJourneys(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
      hiveReadService,
      key,
      publicKey,
    );
    await runContentCancellationEvidence(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
      key,
      publicKey,
    );
    await runContentProviderUnavailableEvidence(
      browser,
      axeSource,
      origin,
      manifest,
      counters,
      identityServices,
    );
  } finally {
    await browser.close();
    await stopServer(server);
  }

  assert.deepEqual(store.diagnostics(), before, 'identity browser journey mutated HostGraph diagnostics');
  for (const { slug } of HOSTS) {
    assert.equal(
      JSON.stringify(publicReleaseInvariant(store.publicSnapshot(slug))),
      beforePublicSnapshots[slug],
      slug + ': browser participation journey mutated the released Host snapshot',
    );
  }
  assert.deepEqual(counters.externalRequests, [], 'unexpected external browser requests');
  assert.deepEqual(counters.consoleErrors, [], 'unexpected console/page errors');

  const observedPaths = counters.requests
    .filter((url) => isLocalRequest(url))
    .map((url) => {
      try { return new URL(url).pathname; } catch { return ''; }
    });
  const mutatingIdentityPaths = new Set(
    observedPaths.filter((value) => ['/identity/challenge', '/identity/verify', '/identity/disconnect'].includes(value)),
  );
  assert.equal(mutatingIdentityPaths.has('/identity/challenge'), true);
  assert.equal(mutatingIdentityPaths.has('/identity/verify'), true);
  assert.equal(mutatingIdentityPaths.has('/identity/disconnect'), true);
  const unauthorizedHeldMutationPaths = observedPaths.filter((value) => (
    /\/(payment|pay|send|transfer|broadcast|reward|claim)\b/i.test(value)
    && !/^\/participation\/[^/]+\/rewards\/claim$/.test(value)
    && !/^\/participation\/[^/]+\/support$/.test(value)
  ));
  assert.deepEqual(
    unauthorizedHeldMutationPaths,
    [],
    'browser invoked a held mutation path',
  );
  assert.equal(
    observedPaths.some((value) => /\/participation\/[^/]+\/community\/(subscribe|unsubscribe)$/.test(value)),
    true,
    'browser never exercised community participation',
  );
  assert.equal(
    observedPaths.some((value) => /\/participation\/[^/]+\/people\/[^/]+\/(follow|unfollow)$/.test(value)),
    true,
    'browser never exercised follow participation',
  );
  assert.equal(
    observedPaths.some((value) => /\/participation\/[^/]+\/votes\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/.test(value)),
    true,
    'browser never exercised vote participation',
  );
  assert.equal(
    observedPaths.some((value) => /^\/participation\/[^/]+\/rewards\/claim$/.test(value)),
    true,
    'browser never exercised reward claiming',
  );
  assert.equal(
    observedPaths.some((value) => /^\/participation\/[^/]+\/support$/.test(value)),
    true,
    'browser never exercised direct host support',
  );
  assert.equal(counters.walletBroadcasts.length, 4);
  assert.deepEqual(
    counters.walletBroadcasts.map((entry) => {
      const operation = entry.operations[0][1];
      return operation.id === 'community'
        ? JSON.parse(operation.json)[0]
        : (JSON.parse(operation.json)[1].what.length ? 'follow' : 'unfollow');
    }),
    ['subscribe', 'unsubscribe', 'follow', 'unfollow'],
  );
  assert.equal(counters.contentBroadcasts.length, 3);
  assert.deepEqual(
    counters.contentBroadcasts.map((entry) => entry.operations[0][0]),
    ['comment', 'comment', 'comment'],
  );
  assert.deepEqual(
    counters.contentBroadcasts.map((entry) => {
      const value = entry.operations[0][1];
      if (value.parent_author) return 'reply';
      return value.permlink.includes('browser-qualified-room-note')
        && value.title.includes('revised')
        ? 'update'
        : 'post';
    }),
    ['post', 'update', 'reply'],
  );
  assert.equal(counters.voteBroadcasts.length, 2);
  assert.deepEqual(
    counters.voteBroadcasts.map((entry) => entry.operations[0][1].weight),
    [4200, -3700],
  );
  assert.deepEqual(
    counters.voteBroadcasts.map((entry) => entry.operations[0][1].voter),
    ['etblink', 'etblink'],
  );
  assert.equal(counters.rewardClaimBroadcasts.length, 1);
  assert.deepEqual(counters.rewardClaimBroadcasts[0].operations, [[
    'claim_reward_balance',
    {
      account: 'etblink',
      reward_hive: '1.000 HIVE',
      reward_hbd: '0.500 HBD',
      reward_vests: '1000.000000 VESTS',
    },
  ]]);
  assert.match(counters.rewardClaimBroadcasts[0].transactionId, /^[0-9a-f]{40}$/);
  assert.equal(counters.supportBroadcasts.length, 1);
  assert.deepEqual(counters.supportBroadcasts[0].operations, [[
    'transfer',
    {
      from: 'etblink',
      to: 'northline-pay',
      amount: '1.250 HIVE',
      memo: 'hivenues-support:v1',
    },
  ]]);
  assert.match(counters.supportBroadcasts[0].transactionId, /^[0-9a-f]{40}$/);
  assert.equal(
    hiveReadService.voteSnapshot().some((item) => (
      item.voter === 'external-reader'
      && item.author === 'etblink'
      && item.permlink === 'room-note'
      && item.weight === -2500
    )),
    true,
    'canonical external negative vote disappeared from synthetic Hive state',
  );
  assert.equal(
    hiveReadService.rpcPool.calls.some((call) => /broadcast|custom_json|vote|comment|transfer/.test(call.method)),
    false,
    'identity browser journey reached a write RPC method',
  );

  manifest.summary = {
    directionCount: HOSTS.length,
    screenshotCount: manifest.screenshots.length,
    auditCount: manifest.audits.length,
    blockingAccessibilityFindings: manifest.audits.reduce(
      (sum, item) => sum + item.accessibility.blockingCount,
      0,
    ),
    horizontalOverflowFindings: manifest.audits.filter((item) => item.geometry.overflow).length,
    incompleteImageFindings: manifest.audits.filter((item) => item.geometry.incompleteImages > 0).length,
    unauthorizedWriteLikeControls: manifest.audits.reduce(
      (sum, item) => sum
        + item.controls.unauthorized.length
        + item.controls.invalidRelationship.length
        + item.controls.invalidContent.length
        + item.controls.invalidVote.length
        + item.controls.invalidRewardClaim.length
        + item.controls.invalidSupport.length,
      0,
    ),
    externalRequests: counters.externalRequests.length,
    unexpectedConsoleErrors: counters.consoleErrors.length,
    authorityRpcCalls: hiveReadService.rpcPool.calls.length,
    authorizedRelationshipBroadcasts: counters.walletBroadcasts.length,
    authorizedContentBroadcasts: counters.contentBroadcasts.length,
    authorizedVoteBroadcasts: counters.voteBroadcasts.length,
    authorizedRewardClaimBroadcasts: counters.rewardClaimBroadcasts.length,
    authorizedSupportBroadcasts: counters.supportBroadcasts.length,
  };

  assert.equal(manifest.summary.directionCount, 3);
  assert.equal(manifest.summary.screenshotCount, 77);
  assert.equal(manifest.summary.blockingAccessibilityFindings, 0);
  assert.equal(manifest.summary.horizontalOverflowFindings, 0);
  assert.equal(manifest.summary.incompleteImageFindings, 0);
  assert.equal(manifest.summary.unauthorizedWriteLikeControls, 0);
  assert.equal(manifest.summary.externalRequests, 0);
  assert.equal(manifest.summary.unexpectedConsoleErrors, 0);
  assert.equal(manifest.summary.authorizedRelationshipBroadcasts, 4);
  assert.equal(manifest.summary.authorizedContentBroadcasts, 3);
  assert.equal(manifest.summary.authorizedVoteBroadcasts, 2);
  assert.equal(manifest.summary.authorizedRewardClaimBroadcasts, 1);
  assert.equal(manifest.summary.authorizedSupportBroadcasts, 1);

  fs.writeFileSync(
    path.join(OUTPUT_ROOT, 'manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  process.stdout.write(JSON.stringify(manifest.summary) + '\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
