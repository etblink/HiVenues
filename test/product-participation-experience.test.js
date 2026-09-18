'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');

const { createHiVenuesApp } = require('../src/product/app');
const {
  IDENTITY_COOKIE_NAME,
  createHiVenuesIdentityServices,
} = require('../src/product/identity');
const { CandidateCStore } = require('../src/candidate-c/store');

const ORIGIN = 'http://hivenues.test';
const SOCIAL_BINDING = Object.freeze({
  community: 'hive-199299',
  threadsAccount: 'room-notes',
});
const HOSTS = Object.freeze([
  'northline-hall',
  'nova-ashby',
  'harbor-and-hearth',
]);

function socialBindings() {
  return Object.fromEntries(HOSTS.map((slug) => [slug, SOCIAL_BINDING]));
}

function readService({
  membership = false,
  following = false,
  relationshipFailure = false,
} = {}) {
  const rpcPool = {
    async call() {
      throw new Error('Identity authority RPC is not expected while rendering relationship state');
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
        displayName: account === 'etblink' ? 'Evan' : 'Juniper Lane',
        about: 'Printmaker and regular.',
        profileImage: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E',
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
      if (relationshipFailure) throw new Error('relationship read unavailable');
      return membership;
    },
    async getFollowStatus() {
      if (relationshipFailure) throw new Error('relationship read unavailable');
      return following;
    },
    async observeSocialOperation() {
      return false;
    },
  };
}

function appWith({
  membership = false,
  following = false,
  relationshipFailure = false,
  participationServices,
} = {}) {
  const store = new CandidateCStore();
  const hiveReadService = readService({ membership, following, relationshipFailure });
  const identityServices = createHiVenuesIdentityServices({
    rpcPool: hiveReadService.rpcPool,
    sessionSecret: 'participation-experience-session-secret-0001',
  });
  const app = createHiVenuesApp({
    store,
    hiveReadService,
    socialBindings: socialBindings(),
    identityServices,
    identityOrigin: ORIGIN,
    participationServices,
  });
  return { app, store, identityServices };
}

function verified(identityServices, account = 'etblink') {
  const { session, token } = identityServices.sessionStore.create(account);
  return {
    session,
    cookie: IDENTITY_COOKIE_NAME + '=' + token,
  };
}

test('anonymous social hub explains identity requirement without rendering a write control', async () => {
  const { app } = appWith();
  const response = await request(app)
    .get('/candidate-c/northline-hall/community/updates')
    .expect(200);

  assert.match(response.text, /data-participation-surface/);
  assert.match(response.text, /Prove your Hive identity before changing this relationship/);
  assert.match(response.text, /href="\/candidate-c\/northline-hall\/community\/updates#identity"/);
  assert.doesNotMatch(response.text, /data-hivenues-participation/);
  assert.doesNotMatch(response.text, /data-participation-submit/);
});

test('verified community relationship renders subscribe or unsubscribe from canonical read state', async () => {
  for (const [membership, action, label] of [
    [false, 'subscribe', 'Join this room'],
    [true, 'unsubscribe', 'Leave this room'],
  ]) {
    const { app, identityServices } = appWith({ membership });
    const session = verified(identityServices);
    const response = await request(app)
      .get('/candidate-c/northline-hall/community/updates')
      .set('cookie', session.cookie)
      .expect(200);

    assert.match(response.text, /data-hivenues-participation/);
    assert.match(
      response.text,
      new RegExp('data-participation-url="/participation/northline-hall/community/' + action + '"'),
    );
    assert.match(response.text, new RegExp('data-participation-action="' + action + '"'));
    assert.match(response.text, new RegExp(label));
    assert.match(response.text, /Review the exact Hive consequence/);
    assert.match(response.text, /wallet—not HiVenues—will sign and broadcast/i);
    assert.match(response.text, /\/js\/hivenues-participation\.js/);
  }
});

test('verified member relationship renders follow or unfollow only for another account', async () => {
  for (const [following, action, label] of [
    [false, 'follow', 'Follow on Hive'],
    [true, 'unfollow', 'Stop following'],
  ]) {
    const { app, identityServices } = appWith({ following });
    const session = verified(identityServices);
    const response = await request(app)
      .get('/candidate-c/northline-hall/community/people/juniper-lane')
      .set('cookie', session.cookie)
      .expect(200);

    assert.match(response.text, /data-hivenues-participation/);
    assert.match(
      response.text,
      new RegExp(
        'data-participation-url="/participation/northline-hall/people/juniper-lane/' + action + '"',
      ),
    );
    assert.match(response.text, new RegExp(label));
    assert.match(response.text, /data-participation-target="juniper-lane"/);
    assert.match(response.text, /\/js\/keychain-adapter\.js/);
    assert.match(response.text, /\/js\/hivenues-participation\.js/);
    assert.doesNotMatch(response.text, />\s*(Vote|Post|Reply|Pay|Send)\s*</i);
  }

  const own = appWith({ following: false });
  const ownSession = verified(own.identityServices, 'etblink');
  const ownProfile = await request(own.app)
    .get('/candidate-c/northline-hall/community/people/etblink')
    .set('cookie', ownSession.cookie)
    .expect(200);

  assert.match(ownProfile.text, /@etblink/);
  assert.doesNotMatch(ownProfile.text, /data-hivenues-participation/);
});

test('relationship read failure suppresses the action rather than guessing state', async () => {
  const { app, identityServices } = appWith({ relationshipFailure: true });
  const session = verified(identityServices);

  const hub = await request(app)
    .get('/candidate-c/harbor-and-hearth/community/updates')
    .set('cookie', session.cookie)
    .expect(200);
  assert.match(hub.text, /cannot confirm its current Hive state/);
  assert.doesNotMatch(hub.text, /data-hivenues-participation/);

  const member = await request(app)
    .get('/candidate-c/harbor-and-hearth/community/people/juniper-lane')
    .set('cookie', session.cookie)
    .expect(200);
  assert.match(member.text, /cannot confirm its current Hive state/);
  assert.doesNotMatch(member.text, /data-hivenues-participation/);
});

test('disabled participation provider leaves identity/read surfaces useful but suppresses write controls', async () => {
  const { app, identityServices } = appWith({ participationServices: false });
  const session = verified(identityServices);
  const response = await request(app)
    .get('/candidate-c/nova-ashby/community/updates')
    .set('cookie', session.cookie)
    .expect(200);

  assert.match(response.text, /data-identity-state="verified"/);
  assert.match(response.text, /relationship cannot be changed safely right now/i);
  assert.doesNotMatch(response.text, /data-hivenues-participation/);
});

test('relationship controls do not mutate HostGraph simply by rendering', async () => {
  const { app, store, identityServices } = appWith();
  const session = verified(identityServices);
  const before = Object.fromEntries(
    HOSTS.map((slug) => [slug, JSON.stringify(store.publicSnapshot(slug))]),
  );

  await request(app)
    .get('/candidate-c/northline-hall/community/updates')
    .set('cookie', session.cookie)
    .expect(200);
  await request(app)
    .get('/candidate-c/northline-hall/community/people/juniper-lane')
    .set('cookie', session.cookie)
    .expect(200);

  for (const slug of HOSTS) {
    assert.equal(JSON.stringify(store.publicSnapshot(slug)), before[slug]);
  }
});
