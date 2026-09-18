'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');

const { createHiVenuesApp } = require('../src/product/app');
const { createHiVenuesIdentityServices, IDENTITY_COOKIE_NAME } = require('../src/product/identity');
const { CandidateCStore } = require('../src/candidate-c/store');

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
      assert.equal(\`\${api}.\${method}\`, 'condenser_api.get_accounts');
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
        profileImage: \`https://images.hive.blog/u/\${account}/avatar\`,
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
  const store = options.store || new CandidateCStore();
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
      .get(\`/candidate-c/\${host.slug}/community/updates\`)
      .expect(200);

    assert.match(response.text, /data-hivenues-identity/);
    assert.match(response.text, /data-identity-state="not-identified"/);
    assert.match(response.text, new RegExp(host.copy));
    assert.match(response.text, new RegExp(host.action));
    assert.match(response.text, /Your wallet signs a fresh identity message only/);
    assert.match(response.text, /does not post, follow, vote, pay, or broadcast a Hive transaction/);
    assert.match(response.text, /\/js\/keychain-adapter\.js/);
    assert.match(response.text, /\/js\/hivenues-identity\.js/);
    assert.doesNotMatch(response.text, />\s*(Follow|Subscribe|Vote|Post|Reply|Pay)\s*</i);
  }

  assert.deepEqual(store.diagnostics(), before);
});

test('identity provider unavailability is explicit and does not fabricate an interactive proof control', async () => {
  const { app } = appWith({ identityServices: false });
  const response = await request(app)
    .get('/candidate-c/harbor-and-hearth/community/updates')
    .expect(200);

  assert.match(response.text, /data-identity-state="provider-unavailable"/);
  assert.match(response.text, /Identity proof is temporarily unavailable/);
  assert.match(response.text, /keep browsing this public community without signing in/);
  assert.doesNotMatch(response.text, /data-identity-form/);
  assert.doesNotMatch(response.text, /data-identity-disconnect/);
});

test('verified identity renders as bounded session truth rather than an operation authority', async () => {
  const hiveReadService = productReadService();
  const services = createHiVenuesIdentityServices({
    hiveReadService,
    sessionSecret: 'identity-experience-test-session-secret-0002',
  });
  const { token, session } = services.sessionStore.issue('etblink');
  const { app } = appWith({ hiveReadService, identityServices: services });

  const response = await request(app)
    .get('/candidate-c/northline-hall/community/updates')
    .set('cookie', \`\${IDENTITY_COOKIE_NAME}=\${token}\`)
    .expect(200);

  assert.match(response.text, /data-identity-state="verified"/);
  assert.match(response.text, /@etblink/);
  assert.equal(response.text.includes(session.expiresAt), true);
  assert.match(response.text, /does not authorize a post, vote, follow, payment, or other Hive transaction/);
  assert.match(response.text, /data-identity-disconnect/);
  assert.doesNotMatch(response.text, /data-identity-form/);
});

test('identity proof stays contextual to the social hub rather than becoming a wallet banner on member profiles', async () => {
  const { app } = appWith();
  const member = await request(app)
    .get('/candidate-c/northline-hall/community/people/juniper-lane')
    .expect(200);

  assert.match(member.text, /Juniper Lane/);
  assert.doesNotMatch(member.text, /data-hivenues-identity/);
  assert.doesNotMatch(member.text, /hivenues-identity\.js/);
});

test('frozen direct dogfood renderer does not acquire the new identity surface implicitly', async () => {
  const { createDogfoodApp } = require('../src/candidate-c/dogfood-app');
  const store = new CandidateCStore();
  const app = createDogfoodApp({
    store,
    hiveReadService: productReadService(),
    socialBindings: socialBindings(),
  });

  const response = await request(app)
    .get('/candidate-c/northline-hall/community/updates')
    .expect(200);

  assert.doesNotMatch(response.text, /data-hivenues-identity/);
  assert.doesNotMatch(response.text, /data-identity-form/);
});
