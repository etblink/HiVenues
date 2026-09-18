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
const COMMUNITY = 'hive-199299';
const SOCIAL_BINDINGS = Object.freeze({
  'northline-hall': Object.freeze({ community: COMMUNITY, threadsAccount: 'room-notes' }),
  'nova-ashby': Object.freeze({ community: COMMUNITY, threadsAccount: 'room-notes' }),
  'harbor-and-hearth': Object.freeze({ community: COMMUNITY, threadsAccount: 'room-notes' }),
});

const ROOT = Object.freeze({
  author: 'etblink',
  permlink: 'room-note',
  parentAuthor: '',
  parentPermlink: COMMUNITY,
  title: 'A note from the room',
  body: 'This is the exact public body.',
  bodyHtml: '<p>This is the exact public body.</p>',
  excerpt: 'This is the exact public body.',
  primaryImage: '',
  created: '2026-09-18T01:00:00',
  updated: '',
  positiveVotes: 0,
  negativeVotes: 0,
  replyCount: 1,
  payout: 0,
  depth: 0,
});
const COMMENT = Object.freeze({
  author: 'juniper-lane',
  permlink: 're-room-note',
  parentAuthor: 'etblink',
  parentPermlink: 'room-note',
  title: 'Untitled',
  bodyHtml: '<p>I am here too.</p>',
  excerpt: 'I am here too.',
  primaryImage: '',
  created: '2026-09-18T01:05:00',
  updated: '',
  positiveVotes: 0,
  negativeVotes: 0,
  replyCount: 0,
  payout: 0,
  depth: 1,
});

function readService({ contentAvailable = true, root = ROOT } = {}) {
  const service = {
    rpcPool: {
      async call() {
        throw new Error('Identity authority RPC is not expected in content rendering tests');
      },
    },
    async getCommunity(name) {
      return {
        name,
        title: 'Rooms & Regulars',
        aboutHtml: '<p>A public community.</p>',
        subscriberCount: 3,
      };
    },
    async getCommunityPosts() {
      return {
        items: [root],
        profiles: {
          etblink: { name: 'etblink', displayName: 'Evan', profileImage: 'data:image/svg+xml,%3Csvg/%3E' },
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
    async getProfiles(accounts) {
      return Object.fromEntries(accounts.map((name) => [name, {
        name,
        displayName: name,
        about: '',
        profileImage: 'data:image/svg+xml,%3Csvg/%3E',
      }]));
    },
    async getProfile(account) {
      return {
        name: account,
        displayName: account,
        about: '',
        profileImage: 'data:image/svg+xml,%3Csvg/%3E',
        followerCount: 0,
        followingCount: 0,
        postCount: 1,
      };
    },
    async getAccountPosts() {
      return { items: [root], profiles: {}, nextCursor: null };
    },
    async getFollowers() {
      return { items: [], nextCursor: null };
    },
    async getFollowing() {
      return { items: [], nextCursor: null };
    },
    async getFollowStatus() {
      return false;
    },
    async isCommunityMember() {
      return false;
    },
    async observeSocialOperation() {
      return false;
    },
  };

  if (contentAvailable) {
    service.getContentRecord = async (author, permlink) => {
      if (author === root.author && permlink === root.permlink) {
        return {
          author: root.author,
          permlink: root.permlink,
          parentAuthor: root.parentAuthor,
          parentPermlink: root.parentPermlink,
          title: root.title,
          body: root.body,
          jsonMetadata: '{"tags":["hive-199299"],"app":"hivenues/1.0.0","format":"markdown"}',
        };
      }
      if (author === COMMENT.author && permlink === COMMENT.permlink) {
        return {
          author: COMMENT.author,
          permlink: COMMENT.permlink,
          parentAuthor: COMMENT.parentAuthor,
          parentPermlink: COMMENT.parentPermlink,
          title: '',
          body: 'I am here too.',
          jsonMetadata: '{"app":"hivenues/1.0.0","format":"markdown"}',
        };
      }
      return null;
    };
    service.getPostWithComments = async (author, permlink) => {
      if (author !== root.author || permlink !== root.permlink) {
        const error = new Error('Post not found');
        error.statusCode = 404;
        throw error;
      }
      return {
        post: root,
        comments: [COMMENT],
        profiles: {
          etblink: { name: 'etblink', displayName: 'Evan' },
          'juniper-lane': { name: 'juniper-lane', displayName: 'Juniper Lane' },
        },
      };
    };
    service.observeContentOperation = async () => false;
  }

  return service;
}

function fixture({ contentAvailable = true, root = ROOT } = {}) {
  const store = new CandidateCStore();
  const hiveReadService = readService({ contentAvailable, root });
  const identityServices = createHiVenuesIdentityServices({
    rpcPool: hiveReadService.rpcPool,
    sessionSecret: 'content-rendering-session-secret-0000001',
  });
  const app = createHiVenuesApp({
    store,
    hiveReadService,
    socialBindings: SOCIAL_BINDINGS,
    identityServices,
    identityOrigin: ORIGIN,
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

test('anonymous hub remains read-only and links public posts into canonical discussion routes', async () => {
  const { app } = fixture();
  const response = await request(app)
    .get('/candidate-c/northline-hall/community/updates')
    .expect(200);

  assert.match(response.text, /href="\/candidate-c\/northline-hall\/community\/posts\/etblink\/room-note"/);
  assert.match(response.text, /Open discussion/);
  assert.doesNotMatch(response.text, /data-hivenues-content/);
  assert.doesNotMatch(response.text, /Review public note/);
});

test('verified hub renders a host-native root-post composer without raw Hive fields', async () => {
  const { app, identityServices } = fixture();
  const session = verified(identityServices);
  const response = await request(app)
    .get('/candidate-c/northline-hall/community/updates')
    .set('cookie', session.cookie)
    .expect(200);

  assert.match(response.text, /data-hivenues-content/);
  assert.match(response.text, /data-content-mode="post"/);
  assert.match(response.text, /data-content-url="\/participation\/northline-hall\/content\/posts"/);
  assert.match(response.text, /Pin something up/);
  assert.match(response.text, /Wall preview/);
  assert.match(response.text, /Review the exact public Hive consequence/);
  assert.doesNotMatch(response.text, /json_metadata|parent_author|required_posting_auths/i);
  assert.match(response.text, /\/js\/hivenues-content\.js/);
});

test('all three Directions render materially distinct root-post voice on the same content mechanic', async () => {
  const expected = new Map([
    ['northline-hall', ['Pin something up', 'Add a new public note']],
    ['nova-ashby', ['Contribute', 'Prepare a new dispatch']],
    ['harbor-and-hearth', ['Leave a note', 'Share something with the table']],
  ]);

  for (const [slug, phrases] of expected) {
    const { app, identityServices } = fixture();
    const session = verified(identityServices);
    const response = await request(app)
      .get('/candidate-c/' + slug + '/community/updates')
      .set('cookie', session.cookie)
      .expect(200);

    for (const phrase of phrases) assert.match(response.text, new RegExp(phrase));
    assert.match(response.text, /data-content-mode="post"/);
  }
});

test('canonical discussion renders root, comments, own-post update and root/nested reply composers', async () => {
  const { app, identityServices } = fixture();
  const session = verified(identityServices);
  const response = await request(app)
    .get('/candidate-c/northline-hall/community/posts/etblink/room-note')
    .set('cookie', session.cookie)
    .expect(200);

  assert.match(response.text, /A note from the room/);
  assert.match(response.text, /This is the exact public body/);
  assert.match(response.text, /I am here too/);
  assert.match(response.text, /data-content-mode="update"/);
  assert.match(
    response.text,
    /data-content-url="\/participation\/northline-hall\/content\/etblink\/room-note\/update"/,
  );
  assert.match(
    response.text,
    /data-content-url="\/participation\/northline-hall\/content\/etblink\/room-note\/replies\/etblink\/room-note"/,
  );
  assert.match(
    response.text,
    /data-content-url="\/participation\/northline-hall\/content\/etblink\/room-note\/replies\/juniper-lane\/re-room-note"/,
  );
  assert.match(response.text, /Revise my public note/);
  assert.match(response.text, /Currently public/);
  assert.match(response.text, /After this update/);
  assert.match(response.text, /Write underneath/);
  assert.doesNotMatch(response.text, />\s*(Vote|Pay|Send|Transfer)\s*</i);
});

test('another verified account can reply but cannot see an update composer for someone else’s post', async () => {
  const { app, identityServices } = fixture();
  const session = verified(identityServices, 'paper-sparrow');
  const response = await request(app)
    .get('/candidate-c/northline-hall/community/posts/etblink/room-note')
    .set('cookie', session.cookie)
    .expect(200);

  assert.doesNotMatch(response.text, /data-content-mode="update"/);
  assert.match(response.text, /data-content-mode="reply"/);
  assert.match(response.text, /data-content-actor="paper-sparrow"/);
});

test('anonymous discussion remains readable but exposes no composer', async () => {
  const { app } = fixture();
  const response = await request(app)
    .get('/candidate-c/harbor-and-hearth/community/posts/etblink/room-note')
    .expect(200);

  assert.match(response.text, /A note from the room/);
  assert.match(response.text, /I am here too/);
  assert.doesNotMatch(response.text, /data-hivenues-content/);
});

test('content capability failure suppresses composers without breaking public reads', async () => {
  const { app, identityServices } = fixture({ contentAvailable: false });
  const session = verified(identityServices);
  const response = await request(app)
    .get('/candidate-c/nova-ashby/community/updates')
    .set('cookie', session.cookie)
    .expect(200);

  assert.match(response.text, /A note from the room/);
  assert.doesNotMatch(response.text, /data-hivenues-content/);
});

test('content outside the bound host community cannot be opened as a host discussion', async () => {
  const foreign = { ...ROOT, parentPermlink: 'hive-188888' };
  const { app } = fixture({ root: foreign });

  await request(app)
    .get('/candidate-c/northline-hall/community/posts/etblink/room-note')
    .expect(404);
});

test('rendering content surfaces never mutates HostGraph', async () => {
  const { app, store, identityServices } = fixture();
  const session = verified(identityServices);
  const before = JSON.stringify(store.publicSnapshot('northline-hall'));

  await request(app)
    .get('/candidate-c/northline-hall/community/updates')
    .set('cookie', session.cookie)
    .expect(200);
  await request(app)
    .get('/candidate-c/northline-hall/community/posts/etblink/room-note')
    .set('cookie', session.cookie)
    .expect(200);

  assert.equal(JSON.stringify(store.publicSnapshot('northline-hall')), before);
});
