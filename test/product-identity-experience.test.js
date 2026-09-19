'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');

const { createHiVenuesApp } = require('../src/product/app');
const { createHiVenuesIdentityServices, IDENTITY_COOKIE_NAME } = require('../src/product/identity');
const { HiVenuesStore } = require('../src/product/store');

const ORIGIN = 'http://hivenues.test';
const SOCIAL_BINDING = Object.freeze({ community: 'hive-199299', threadsAccount: 'room-notes' });
const HOSTS = Object.freeze([
  Object.freeze({ slug: 'northline-hall', copy: 'Put your name to the wall', action: 'Prove who I am' }),
  Object.freeze({ slug: 'nova-ashby', copy: 'Sign the register', action: 'Verify my identity' }),
  Object.freeze({ slug: 'harbor-and-hearth', copy: 'Introduce yourself', action: 'Introduce myself' }),
]);

function socialBindings() {
  return Object.fromEntries(HOSTS.map(({ slug }) => [slug, SOCIAL_BINDING]));
}

function productReadService() {
  const rpcPool = {
    async call(api, method, params) {
      assert.equal(`${api}.${method}`, 'condenser_api.get_accounts');
      return (params?.[0] || []).map((name) => ({
        name,
        posting: {
          weight_threshold: 1,
          account_auths: [],
          key_auths: [['STM_TEST_PUBLIC_KEY', 1]],
        },
      }));
    },
  };

  return {
    rpcPool,
    async getCommunity(name) {
      return {
        name,
        title: 'Rooms & Regulars',
        aboutHtml: '<p>A public community around this place.</p>',
        subscriberCount: 3,
      };
    },
    async getCommunityPosts() {
      return { items: [], profiles: {}, nextCursor: null };
    },
    async getLatestThreads() {
      return { container: null, threads: [], profiles: {} };
    },
    async listCommunitySubscribers() {
      return [];
    },
    async getProfiles() {
      return {};
    },
    async getProfile(account) {
      return {
        name: account,
        displayName: 'Juniper Lane',
        about: 'Printmaker and regular.',
        profileImage: `https://images.hive.blog/u/${account}/avatar`,
        followerCount: 4,
        followingCount: 2,
        postCount: 1,
      };
    },
    async getAccountPosts() {
      return { items: [], profiles: {}, nextCursor: null };
    },
    async getFollowers() {
      return { items: [], nextCursor: null };
    },
    async getFollowing() {
      return { items: [], nextCursor: null };
    },
    async isCommunityMember() {
      return false;
    },
  };
}

function appWith(options = {}) {
  const store = options.store || new HiVenuesStore();
  const hiveReadService = options.hiveReadService || productReadService();
  const app = createHiVenuesApp({
    store,
    hiveReadService,
    socialBindings: socialBindings(),
    identityOrigin: ORIGIN,
    identitySessionSecret: 'identity-experience-test-session-secret-0001',
    ...options,
  });
  return { app, store, hiveReadService };
}

test('canonical social hubs introduce one host-native identity mechanic across three Directions', async () => {
  const { app, store } = appWith();
  const before = store.diagnostics();

  for (const host of HOSTS) {
    const response = await request(app)
      .get(`/hivenues/${host.slug}/community/updates`)
      .expect(200);

    assert.match(response.text, /data-hivenues-identity/);
    assert.match(response.text, /data-identity-state="not-identified"/);
    assert.match(response.text, /data-identity-onboarding/);
    assert.match(response.text, /data-identity-path="existing"/);
    assert.match(response.text, /data-identity-path="create"/);
    assert.match(response.text, /data-identity-path="later"/);
    assert.match(response.text, /data-identity-form/);
    assert.match(response.text, /data-identity-account-review/);
    assert.match(response.text, /data-identity-review-account/);
    assert.match(response.text, /data-identity-verify/);
    assert.match(response.text, /data-identity-proof-boundary/);
    assert.match(response.text, /data-identity-recovery-boundary/);
    assert.match(response.text, /href="https:\/\/signup\.hive\.io\/"[^>]*data-identity-create-account|data-identity-create-account[^>]*href="https:\/\/signup\.hive\.io\//);
    assert.match(response.text, /data-identity-creation-resume/);
    assert.match(response.text, /data-identity-created-account-ready/);
    assert.match(response.text, /data-identity-not-now/);
    assert.match(response.text, /\/js\/keychain-adapter\.js/);
    assert.match(response.text, /\/js\/hivenues-identity\.js/);
  }

  assert.deepEqual(store.diagnostics(), before);
});

test('Studio exposes optional progressive Hive onboarding without mutating host truth', async () => {
  const { app, store } = appWith();
  const before = JSON.stringify(store.snapshot('northline-hall'));

  const studio = await request(app)
    .get('/hivenues/studio/northline-hall')
    .expect(200);
  assert.match(
    studio.text,
    /data-studio-hive-onboarding[^>]*href="\/hivenues\/studio\/northline-hall\/hive"|href="\/hivenues\/studio\/northline-hall\/hive"[^>]*data-studio-hive-onboarding/,
  );

  const response = await request(app)
    .get('/hivenues/studio/northline-hall/hive')
    .expect(200);

  assert.match(response.text, /data-hivenues-identity/);
  assert.match(response.text, /data-identity-onboarding/);
  assert.match(response.text, /data-identity-path="existing"/);
  assert.match(response.text, /data-identity-path="create"/);
  assert.match(response.text, /data-identity-path="later"/);
  assert.match(response.text, /data-identity-account-review/);
  assert.match(response.text, /data-identity-review-account/);
  assert.match(response.text, /data-identity-verify/);
  assert.match(response.text, /data-identity-proof-boundary/);
  assert.match(response.text, /data-identity-recovery-boundary/);
  assert.match(response.text, /data-identity-creation-resume/);
  assert.match(response.text, /data-identity-created-account-ready/);
  assert.match(response.text, /data-identity-authority-boundary/);
  assert.match(response.text, /href="https:\/\/signup\.hive\.io\/"[^>]*data-identity-create-account|data-identity-create-account[^>]*href="https:\/\/signup\.hive\.io\//);
  assert.match(response.text, /data-identity-not-now/);
  assert.equal(JSON.stringify(store.snapshot('northline-hall')), before);
});

test('identity provider unavailability is explicit and does not fabricate an interactive proof control', async () => {
  const { app } = appWith({ identityServices: false });
  const response = await request(app)
    .get('/hivenues/harbor-and-hearth/community/updates')
    .expect(200);

  assert.match(response.text, /data-identity-state="provider-unavailable"/);
  assert.doesNotMatch(response.text, /data-identity-form/);
  assert.doesNotMatch(response.text, /data-identity-disconnect/);
});

test('verified identity renders as bounded session truth rather than an operation authority', async () => {
  const hiveReadService = productReadService();
  const services = createHiVenuesIdentityServices({
    hiveReadService,
    sessionSecret: 'identity-experience-test-session-secret-0002',
  });
  const { token, session } = services.sessionStore.create('etblink');
  const { app } = appWith({ hiveReadService, identityServices: services });

  const response = await request(app)
    .get('/hivenues/northline-hall/community/updates')
    .set('cookie', `${IDENTITY_COOKIE_NAME}=${token}`)
    .expect(200);

  assert.match(response.text, /data-identity-state="verified"/);
  assert.match(response.text, /@etblink/);
  assert.equal(response.text.includes(session.expiresAt), true);
  assert.match(response.text, /data-identity-disconnect/);
  assert.doesNotMatch(response.text, /data-identity-form/);
});

test('identity proof stays contextual to the social hub rather than becoming a wallet banner on member profiles', async () => {
  const { app } = appWith();
  const member = await request(app)
    .get('/hivenues/northline-hall/community/people/juniper-lane')
    .expect(200);

  assert.match(member.text, /Juniper Lane/);
  assert.doesNotMatch(member.text, /data-hivenues-identity/);
  assert.doesNotMatch(member.text, /hivenues-identity\.js/);
});

