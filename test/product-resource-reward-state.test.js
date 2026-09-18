'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { createHiVenuesApp } = require('../src/product/app');
const { IDENTITY_COOKIE_NAME, createHiVenuesIdentityServices } = require('../src/product/identity');
const { CandidateCStore } = require('../src/candidate-c/store');
const { readPersonalResourceRewardState } = require('../src/candidate-c/social-read-router');

const ORIGIN = 'http://hivenues.test';
const COMMUNITY = 'hive-199299';
const SOCIAL_BINDINGS = Object.freeze({
  'northline-hall': { community: COMMUNITY, threadsAccount: 'room-notes' },
  'nova-ashby': { community: COMMUNITY, threadsAccount: 'room-notes' },
  'harbor-and-hearth': { community: COMMUNITY, threadsAccount: 'room-notes' },
});

function profile(name) {
  return {
    name,
    displayName: name,
    about: 'A public profile.',
    profileImage: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E',
    followerCount: 2,
    followingCount: 3,
    postCount: 4,
  };
}

function page() {
  return { items: [], profiles: {}, nextCursor: null };
}

function reads({ walletFailure = false, invalidWallet = false } = {}) {
  const calls = [];
  return {
    calls,
    rpcPool: { async call() { throw new Error('not expected'); } },
    async getCommunity(name) { return { name, title: 'Community' }; },
    async getCommunityPosts() { return page(); },
    async getLatestThreads() { return { container: null, threads: [], profiles: {} }; },
    async listCommunitySubscribers() { return []; },
    async getProfiles(accounts) { return Object.fromEntries(accounts.map((name) => [name, profile(name)])); },
    async getProfile(account) { return profile(account); },
    async getAccountPosts() { return page(); },
    async getFollowers() { return { items: [], nextCursor: null }; },
    async getFollowing() { return { items: [], nextCursor: null }; },
    async isCommunityMember() { return true; },
    async getFollowStatus() { return false; },
    async getWallet(account) {
      calls.push({ method: 'getWallet', account });
      if (walletFailure) throw new Error('wallet unavailable');
      return {
        account,
        votingPowerPercent: invalidWallet ? 110 : 70,
        resourceCreditsPercent: 60,
        hivePower: 550,
        rewards: { hive: 1, hbd: 0.5, hivePower: 0.5, vestingShares: 1000 },
        hasClaimableRewards: true,
        displayedAt: '2026-09-18T12:00:00.000Z',
      };
    },
  };
}

function fixture(options = {}) {
  const store = new CandidateCStore();
  const hiveReadService = reads(options);
  const identityServices = createHiVenuesIdentityServices({
    rpcPool: hiveReadService.rpcPool,
    sessionSecret: 'resource-state-session-secret-000000001',
  });
  const app = createHiVenuesApp({
    store,
    hiveReadService,
    socialBindings: SOCIAL_BINDINGS,
    identityServices,
    identityOrigin: ORIGIN,
  });
  return { app, store, hiveReadService, identityServices };
}

function cookie(identityServices, account) {
  const { token } = identityServices.sessionStore.create(account);
  return IDENTITY_COOKIE_NAME + '=' + token;
}

test('personal resource/reward projection is owner-only and exact', async () => {
  const hiveReads = reads();
  const owner = await readPersonalResourceRewardState(hiveReads, 'paper-sparrow', 'paper-sparrow');
  assert.equal(owner.visible, true);
  assert.equal(owner.status, 'ready');
  assert.equal(owner.votingPowerPercent, 70);
  assert.equal(owner.resourceCreditsPercent, 60);
  assert.equal(owner.hivePower, 550);
  assert.deepEqual(owner.rewards, { hive: 1, hbd: 0.5, hivePower: 0.5, vestingShares: 1000 });

  assert.equal((await readPersonalResourceRewardState(hiveReads, 'paper-sparrow', null)).visible, false);
  assert.equal((await readPersonalResourceRewardState(hiveReads, 'paper-sparrow', 'someone-else')).visible, false);
  assert.equal(hiveReads.calls.length, 1);
});

test('invalid or unavailable wallet state fails closed', async () => {
  const invalid = await readPersonalResourceRewardState(reads({ invalidWallet: true }), 'paper-sparrow', 'paper-sparrow');
  assert.equal(invalid.status, 'degraded');
  assert.equal(invalid.votingPowerPercent, null);
  assert.equal(invalid.rewards, null);

  const unavailable = await readPersonalResourceRewardState(reads({ walletFailure: true }), 'paper-sparrow', 'paper-sparrow');
  assert.equal(unavailable.status, 'unavailable');
  assert.equal(unavailable.resourceCreditsPercent, null);
});

test('Poster owner profile renders host-native resource/reward truth with no write control', async () => {
  const { app, identityServices, hiveReadService } = fixture();
  const response = await request(app)
    .get('/candidate-c/northline-hall/community/people/paper-sparrow')
    .set('cookie', cookie(identityServices, 'paper-sparrow'))
    .expect(200);

  assert.match(response.text, /cc-resource-state--poster/);
  assert.match(response.text, /Your participation energy/);
  assert.match(response.text, /Raise-a-glass strength/);
  assert.match(response.text, /70\.0%/);
  assert.match(response.text, /60\.0%/);
  assert.match(response.text, /550\.000 HP/);
  assert.match(response.text, /Voting power/);
  assert.match(response.text, /Resource Credits \(RC\)/);
  assert.match(response.text, /Claimable rewards/);
  assert.match(response.text, /1000\.000000 VESTS/);
  assert.match(response.text, /Read-only in this stage/);
  assert.doesNotMatch(response.text, /data-m4-action="claim-rewards"/);
  assert.doesNotMatch(response.text, /Review reward claim/);
  assert.equal(hiveReadService.calls.length, 1);
});

test('Editorial and Hospitality keep the same protocol state under distinct host language', async () => {
  const { app, identityServices } = fixture();
  const owner = cookie(identityServices, 'paper-sparrow');

  const editorial = await request(app)
    .get('/candidate-c/nova-ashby/community/people/paper-sparrow')
    .set('cookie', owner)
    .expect(200);
  assert.match(editorial.text, /cc-resource-state--editorial/);
  assert.match(editorial.text, /Your participation capacity/);
  assert.match(editorial.text, /Recommendation strength/);

  const hospitality = await request(app)
    .get('/candidate-c/harbor-and-hearth/community/people/paper-sparrow')
    .set('cookie', owner)
    .expect(200);
  assert.match(hospitality.text, /cc-resource-state--hospitality/);
  assert.match(hospitality.text, /Your participation readiness/);
  assert.match(hospitality.text, /Applause strength/);
});

test('anonymous and other-member views stay profile-first rather than becoming wallet dashboards', async () => {
  const { app, identityServices, hiveReadService } = fixture();

  const anonymous = await request(app)
    .get('/candidate-c/northline-hall/community/people/paper-sparrow')
    .expect(200);
  assert.doesNotMatch(anonymous.text, /cc-resource-state/);

  const other = await request(app)
    .get('/candidate-c/northline-hall/community/people/paper-sparrow')
    .set('cookie', cookie(identityServices, 'someone-else'))
    .expect(200);
  assert.doesNotMatch(other.text, /cc-resource-state/);
  assert.equal(hiveReadService.calls.length, 0);
});

test('resource/reward rendering never mutates HostGraph', async () => {
  const { app, store, identityServices } = fixture();
  const before = JSON.stringify(store.publicSnapshot('northline-hall'));
  await request(app)
    .get('/candidate-c/northline-hall/community/people/paper-sparrow')
    .set('cookie', cookie(identityServices, 'paper-sparrow'))
    .expect(200);
  assert.equal(JSON.stringify(store.publicSnapshot('northline-hall')), before);
});
