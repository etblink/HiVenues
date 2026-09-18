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
const { seedCandidateCHosts } = require('../src/candidate-c/fixtures');

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
  body: 'Exact public body.',
  bodyHtml: '<p>Exact public body.</p>',
  excerpt: 'Exact public body.',
  primaryImage: '',
  created: '2026-09-18T01:00:00',
  updated: '',
  positiveVotes: 7,
  negativeVotes: 2,
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
  bodyHtml: '<p>A canonical response.</p>',
  excerpt: 'A canonical response.',
  primaryImage: '',
  created: '2026-09-18T01:05:00',
  updated: '',
  positiveVotes: 1,
  negativeVotes: 1,
  replyCount: 0,
  payout: 0,
  depth: 1,
});

function hosts() {
  const values = seedCandidateCHosts();
  const northline = values.find((host) => host.identity.slug === 'northline-hall');
  northline.bindings.hive.showNegativeVoteAction = true;
  northline.voice.terms.downvote_hive = 'Not for this room';

  const nova = values.find((host) => host.identity.slug === 'nova-ashby');
  nova.bindings.hive.showNegativeVoteAction = false;
  nova.voice.terms.downvote_hive = 'Push back';

  const harbor = values.find((host) => host.identity.slug === 'harbor-and-hearth');
  harbor.bindings.hive.showNegativeVoteAction = true;
  harbor.voice.terms.downvote_hive = 'Not for this table';
  return values;
}

function reads({ voteFailure = false } = {}) {
  return {
    rpcPool: {
      async call() {
        throw new Error('Identity authority RPC is not expected in vote experience tests');
      },
    },
    async getProfile(account) { return { name: account, displayName: account }; },
    async getFollowStatus() { return false; },
    async isCommunityMember() { return false; },
    async observeSocialOperation() { return false; },
    async getContentRecord(author, permlink) {
      if (author === ROOT.author && permlink === ROOT.permlink) {
        return {
          author, permlink,
          parentAuthor: ROOT.parentAuthor,
          parentPermlink: ROOT.parentPermlink,
          title: ROOT.title,
          body: ROOT.body,
          jsonMetadata: '{"tags":["hive-199299"]}',
        };
      }
      return null;
    },
    async getPostWithComments(author, permlink) {
      if (author !== ROOT.author || permlink !== ROOT.permlink) {
        const error = new Error('Post not found');
        error.statusCode = 404;
        throw error;
      }
      return {
        post: ROOT,
        comments: [COMMENT],
        profiles: {
          etblink: { name: 'etblink', displayName: 'Evan' },
          'juniper-lane': { name: 'juniper-lane', displayName: 'Juniper Lane' },
        },
      };
    },
    async observeContentOperation() { return false; },
    async getVoteWeight(voter, author, permlink) {
      if (voteFailure) throw new Error('vote read unavailable');
      assert.equal(voter, 'paper-sparrow');
      if (author === ROOT.author && permlink === ROOT.permlink) return 4200;
      if (author === COMMENT.author && permlink === COMMENT.permlink) return -1700;
      return null;
    },
    async observeVoteOperation() { return false; },
  };
}

function fixture(options = {}) {
  const store = new CandidateCStore({ hosts: hosts() });
  const hiveReadService = reads(options);
  const identityServices = createHiVenuesIdentityServices({
    rpcPool: hiveReadService.rpcPool,
    sessionSecret: 'vote-experience-session-secret-000000001',
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

function verified(identityServices) {
  const { token } = identityServices.sessionStore.create('paper-sparrow');
  return IDENTITY_COOKIE_NAME + '=' + token;
}

test('Poster discussion presents host-native positive and enabled negative vote actions over exact canonical state', async () => {
  const { app, identityServices } = fixture();
  const response = await request(app)
    .get('/candidate-c/northline-hall/community/posts/etblink/room-note')
    .set('cookie', verified(identityServices))
    .expect(200);

  assert.match(response.text, /data-hivenues-vote/);
  assert.match(response.text, /data-vote-direction="upvote">Raise a glass</);
  assert.match(response.text, /data-vote-direction="downvote">Not for this room</);
  assert.match(
    response.text,
    /data-vote-url="\/participation\/northline-hall\/votes\/etblink\/room-note\/etblink\/room-note"/,
  );
  assert.match(response.text, /\+42% from @paper-sparrow/);
  assert.match(response.text, /-17% from @paper-sparrow/);
  assert.match(response.text, /Signed Hive weight/);
  assert.match(response.text, /Your wallet—not HiVenues—will sign and broadcast this vote/);
  assert.match(response.text, /title="Positive Hive votes"[^>]*>.*7/s);
  assert.match(response.text, /title="Negative Hive votes"[^>]*>.*2/s);
  assert.match(response.text, /\/js\/hivenues-vote\.js/);
});

test('venue-hidden negative action stays absent while canonical negative-vote counts remain visible', async () => {
  const { app, identityServices } = fixture();
  const response = await request(app)
    .get('/candidate-c/nova-ashby/community/posts/etblink/room-note')
    .set('cookie', verified(identityServices))
    .expect(200);

  assert.match(response.text, /data-vote-direction="upvote">Send a spark</);
  assert.doesNotMatch(response.text, /data-vote-direction="downvote"/);
  assert.doesNotMatch(response.text, />Push back</);
  assert.match(response.text, /title="Negative Hive votes"[^>]*>.*2/s);
  assert.match(response.text, /\+42% from @paper-sparrow/);
});

test('Hospitality uses its own vote vocabulary and presentation while preserving one Hive vote mechanic', async () => {
  const { app, identityServices } = fixture();
  const response = await request(app)
    .get('/candidate-c/harbor-and-hearth/community/posts/etblink/room-note')
    .set('cookie', verified(identityServices))
    .expect(200);

  assert.match(response.text, /cc-vote--hospitality/);
  assert.match(response.text, /data-vote-direction="upvote">Send compliments</);
  assert.match(response.text, /data-vote-direction="downvote">Not for this table</);
  assert.match(response.text, /<dt>Hive mechanic<\/dt><dd>vote<\/dd>/);
});

test('anonymous visitors still see truthful positive and negative vote totals without a signing control', async () => {
  const { app } = fixture();
  const response = await request(app)
    .get('/candidate-c/northline-hall/community/posts/etblink/room-note')
    .expect(200);

  assert.match(response.text, /title="Positive Hive votes"[^>]*>.*7/s);
  assert.match(response.text, /title="Negative Hive votes"[^>]*>.*2/s);
  assert.doesNotMatch(response.text, /data-hivenues-vote/);
});

test('vote read failure suppresses vote actions without suppressing canonical public vote totals', async () => {
  const { app, identityServices } = fixture({ voteFailure: true });
  const response = await request(app)
    .get('/candidate-c/northline-hall/community/posts/etblink/room-note')
    .set('cookie', verified(identityServices))
    .expect(200);

  assert.doesNotMatch(response.text, /data-hivenues-vote/);
  assert.match(response.text, /Current vote state could not be confirmed safely/);
  assert.match(response.text, /title="Negative Hive votes"[^>]*>.*2/s);
});

test('rendering vote state does not mutate the canonical HostGraph', async () => {
  const { app, store, identityServices } = fixture();
  const before = JSON.stringify(store.publicSnapshot('northline-hall'));

  await request(app)
    .get('/candidate-c/northline-hall/community/posts/etblink/room-note')
    .set('cookie', verified(identityServices))
    .expect(200);

  assert.equal(JSON.stringify(store.publicSnapshot('northline-hall')), before);
});
