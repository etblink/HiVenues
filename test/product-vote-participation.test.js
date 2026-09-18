'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');

const { createHiVenuesApp } = require('../src/product/app');
const {
  IDENTITY_COOKIE_NAME,
  createHiVenuesIdentityServices,
} = require('../src/product/identity');
const { HiVenuesStore } = require('../src/product/store');
const { seedHiVenuesHosts } = require('../src/product/fixtures');

const ORIGIN = 'http://hivenues.test';
const SOCIAL_BINDINGS = Object.freeze({
  'northline-hall': Object.freeze({
    community: 'hive-199299',
    threadsAccount: 'room-notes',
  }),
});

function normalized({
  author,
  permlink,
  parentAuthor = '',
  parentPermlink = 'hive-199299',
  body = 'Body',
}) {
  return {
    author,
    permlink,
    parentAuthor,
    parentPermlink,
    title: parentAuthor ? '' : 'Root title',
    bodyHtml: '<p>' + body + '</p>',
    excerpt: body,
    created: '2026-09-18T02:00:00',
    updated: '',
    positiveVotes: 0,
    negativeVotes: 0,
    replyCount: 0,
    payout: 0,
    depth: parentAuthor ? 1 : 0,
  };
}

function voteReads({
  currentWeight = 0,
  observations = [false, true],
  includeTarget = true,
  hostCommunity = 'hive-199299',
} = {}) {
  const calls = [];
  let observationIndex = 0;
  const root = normalized({
    author: 'etblink',
    permlink: 'existing-note',
    parentPermlink: hostCommunity,
  });
  const child = normalized({
    author: 'juniper-lane',
    permlink: 'reply-one',
    parentAuthor: 'etblink',
    parentPermlink: 'existing-note',
  });

  return {
    calls,
    rpcPool: {
      async call() {
        throw new Error('Identity authority RPC is not expected in vote route tests');
      },
    },
    async getProfile(account) {
      return { name: account, displayName: account };
    },
    async getFollowStatus() {
      return false;
    },
    async isCommunityMember() {
      return false;
    },
    async observeSocialOperation() {
      throw new Error('Vote preflight must use dedicated vote observation');
    },
    async getPostWithComments(author, permlink) {
      calls.push({ method: 'getPostWithComments', author, permlink });
      if (author !== root.author || permlink !== root.permlink) {
        const error = new Error('Post not found');
        error.statusCode = 404;
        error.expose = true;
        error.code = 'NOT_FOUND';
        throw error;
      }
      return {
        post: root,
        comments: includeTarget ? [child] : [],
        profiles: {},
      };
    },
    async getVoteWeight(voter, author, permlink) {
      calls.push({ method: 'getVoteWeight', voter, author, permlink });
      if (author === 'missing-target') return null;
      return currentWeight;
    },
    async observeVoteOperation(record) {
      calls.push({
        method: 'observeVoteOperation',
        action: record.action,
        account: record.account,
        operations: structuredClone(record.operations),
      });
      const value = observations[Math.min(observationIndex, observations.length - 1)];
      observationIndex += 1;
      return value;
    },
  };
}

function fixture(options = {}) {
  let hosts;
  if (options.showNegativeVoteAction === true) {
    hosts = seedHiVenuesHosts();
    const host = hosts.find((item) => item.identity.slug === 'northline-hall');
    host.bindings.hive.showNegativeVoteAction = true;
  }
  const store = new HiVenuesStore(hosts ? { hosts } : undefined);
  const readService = options.hiveReadService || voteReads();
  const identityServices = createHiVenuesIdentityServices({
    rpcPool: readService.rpcPool,
    sessionSecret: 'vote-foundation-session-secret-00000001',
  });
  const app = createHiVenuesApp({
    store,
    hiveReadService: readService,
    socialBindings: SOCIAL_BINDINGS,
    identityServices,
    identityOrigin: ORIGIN,
  });
  return { app, store, readService, identityServices };
}

function session(identityServices, account = 'paper-sparrow') {
  const created = identityServices.sessionStore.create(account);
  return {
    session: created.session,
    cookie: IDENTITY_COOKIE_NAME + '=' + created.token,
  };
}

function mutate(testRequest, identity) {
  return testRequest
    .set('origin', ORIGIN)
    .set('x-csrf-token', identity.session.csrfToken)
    .set('cookie', identity.cookie);
}

test('vote preflight derives voter from verified identity and target from canonical host discussion', async () => {
  const { app, store, readService, identityServices } = fixture();
  const verified = session(identityServices);
  const before = JSON.stringify(store.publicSnapshot('northline-hall'));

  const response = await mutate(
    request(app).post(
      '/participation/northline-hall/votes/etblink/existing-note/juniper-lane/reply-one',
    ),
    verified,
  )
    .send({
      voter: 'attacker',
      author: 'attacker',
      permlink: 'not-the-route-target',
      direction: 'upvote',
      percent: 42,
    })
    .expect(201);

  assert.equal(response.body.action, 'vote');
  assert.equal(response.body.account, 'paper-sparrow');
  assert.equal(response.body.signer, 'paper-sparrow');
  assert.equal(response.body.authority, 'Posting');
  assert.equal(response.body.state, 'prepared');
  assert.equal(response.body.summary.kind, 'Hive vote');
  assert.equal(response.body.summary.voter, 'paper-sparrow');
  assert.equal(response.body.summary.author, 'juniper-lane');
  assert.equal(response.body.summary.permlink, 'reply-one');
  assert.equal(response.body.summary.direction, 'upvote');
  assert.equal(response.body.summary.percent, 42);
  assert.equal(response.body.summary.weight, 4200);
  assert.equal(response.body.summary.currentWeight, 0);
  assert.equal(response.body.summary.rootAuthor, 'etblink');
  assert.equal(response.body.summary.rootPermlink, 'existing-note');
  assert.match(response.body.summary.consequence, /42% upvote/);
  assert.deepEqual(response.body.operations, [[
    'vote',
    {
      voter: 'paper-sparrow',
      author: 'juniper-lane',
      permlink: 'reply-one',
      weight: 4200,
    },
  ]]);
  assert.deepEqual(
    readService.calls.map((call) => call.method),
    ['getPostWithComments', 'getVoteWeight'],
  );
  assert.equal(JSON.stringify(store.publicSnapshot('northline-hall')), before);
});

test('negative vote is explicit when the venue presents it and never encoded as a hidden negative percentage', async () => {
  const { app, identityServices } = fixture({ showNegativeVoteAction: true });
  const verified = session(identityServices);

  const response = await mutate(
    request(app).post(
      '/participation/northline-hall/votes/etblink/existing-note/etblink/existing-note',
    ),
    verified,
  )
    .send({ direction: 'downvote', percent: 37 })
    .expect(201);

  assert.equal(response.body.summary.direction, 'downvote');
  assert.equal(response.body.summary.percent, 37);
  assert.equal(response.body.summary.weight, -3700);
  assert.equal(response.body.operations[0][1].weight, -3700);
});

test('hidden negative-vote action is enforced by HiVenues without claiming a Hive protocol ban', async () => {
  const { app, identityServices } = fixture();
  const verified = session(identityServices);

  const response = await mutate(
    request(app).post(
      '/participation/northline-hall/votes/etblink/existing-note/etblink/existing-note',
    ),
    verified,
  )
    .send({ direction: 'downvote', percent: 37 })
    .expect(403);

  assert.equal(response.body.error.code, 'NEGATIVE_VOTE_ACTION_HIDDEN');
  assert.match(response.body.error.message, /does not offer a downvote action/i);
  assert.match(response.body.error.message, /another compatible client/i);
});

test('vote target outside the canonical host discussion fails before preflight', async () => {
  const reads = voteReads({ includeTarget: false });
  const { app, identityServices } = fixture({ hiveReadService: reads });
  const verified = session(identityServices);

  const response = await mutate(
    request(app).post(
      '/participation/northline-hall/votes/etblink/existing-note/juniper-lane/reply-one',
    ),
    verified,
  )
    .send({ direction: 'upvote', percent: 50 })
    .expect(404);

  assert.match(response.body.error.message, /not part of this canonical discussion/i);
  assert.deepEqual(reads.calls.map((call) => call.method), ['getPostWithComments']);
});

test('host-community mismatch fails closed before vote state is read', async () => {
  const reads = voteReads({ hostCommunity: 'hive-188888' });
  const { app, identityServices } = fixture({ hiveReadService: reads });
  const verified = session(identityServices);

  const response = await mutate(
    request(app).post(
      '/participation/northline-hall/votes/etblink/existing-note/etblink/existing-note',
    ),
    verified,
  )
    .send({ direction: 'upvote', percent: 50 })
    .expect(404);

  assert.match(response.body.error.message, /not part of this host community/i);
  assert.deepEqual(reads.calls.map((call) => call.method), ['getPostWithComments']);
});

test('current exact canonical vote state rejects a no-op vote intent', async () => {
  const reads = voteReads({ currentWeight: 7500 });
  const { app, identityServices } = fixture({ hiveReadService: reads });
  const verified = session(identityServices);

  const response = await mutate(
    request(app).post(
      '/participation/northline-hall/votes/etblink/existing-note/etblink/existing-note',
    ),
    verified,
  )
    .send({ direction: 'upvote', percent: 75 })
    .expect(409);

  assert.equal(response.body.error.code, 'VOTE_ALREADY_CONFIRMED');
});

test('wallet acceptance stays pending until exact canonical vote observation succeeds', async () => {
  const reads = voteReads({ observations: [false, true] });
  const { app, identityServices } = fixture({ hiveReadService: reads });
  const verified = session(identityServices);

  const prepared = await mutate(
    request(app).post(
      '/participation/northline-hall/votes/etblink/existing-note/etblink/existing-note',
    ),
    verified,
  )
    .send({ direction: 'upvote', percent: 63 })
    .expect(201);

  const accepted = await mutate(
    request(app).post('/participation/preflight/' + prepared.body.id + '/accepted'),
    verified,
  )
    .send({ transactionId: 'a'.repeat(40) })
    .expect(200);
  assert.equal(accepted.body.state, 'broadcast_accepted');

  const pending = await mutate(
    request(app).post('/participation/preflight/' + prepared.body.id + '/observe'),
    verified,
  ).send({}).expect(200);
  assert.equal(pending.body.state, 'broadcast_accepted');

  const confirmed = await mutate(
    request(app).post('/participation/preflight/' + prepared.body.id + '/observe'),
    verified,
  ).send({}).expect(200);
  assert.equal(confirmed.body.state, 'observed');

  const observed = reads.calls.filter((call) => call.method === 'observeVoteOperation');
  assert.equal(observed.length, 2);
  assert.deepEqual(observed[0].operations, [[
    'vote',
    {
      voter: 'paper-sparrow',
      author: 'etblink',
      permlink: 'existing-note',
      weight: 6300,
    },
  ]]);
  assert.equal(
    reads.calls.some((call) => call.method === 'observeSocialOperation'),
    false,
  );
});

test('duplicate vote intent, invalid direction/magnitude and incomplete vote provider fail closed', async () => {
  const ordinary = fixture();
  const verified = session(ordinary.identityServices);

  const first = await mutate(
    request(ordinary.app).post(
      '/participation/northline-hall/votes/etblink/existing-note/etblink/existing-note',
    ),
    verified,
  )
    .send({ direction: 'upvote', percent: 55 })
    .expect(201);
  assert.equal(first.body.state, 'prepared');

  const duplicate = await mutate(
    request(ordinary.app).post(
      '/participation/northline-hall/votes/etblink/existing-note/etblink/existing-note',
    ),
    verified,
  )
    .send({ direction: 'upvote', percent: 55 })
    .expect(409);
  assert.equal(duplicate.body.error.code, 'DUPLICATE_OPERATION');

  await mutate(
    request(ordinary.app).post(
      '/participation/northline-hall/votes/etblink/existing-note/etblink/existing-note',
    ),
    verified,
  )
    .send({ direction: 'applaud', percent: 55 })
    .expect(400);

  await mutate(
    request(ordinary.app).post(
      '/participation/northline-hall/votes/etblink/existing-note/etblink/existing-note',
    ),
    verified,
  )
    .send({ direction: 'upvote', percent: 0 })
    .expect(400);

  const incompleteReads = {
    rpcPool: { async call() { throw new Error('not expected'); } },
    async getProfile(account) { return { name: account }; },
    async getFollowStatus() { return false; },
    async isCommunityMember() { return false; },
    async observeSocialOperation() { return false; },
  };
  const unavailable = fixture({ hiveReadService: incompleteReads });
  const unavailableSession = session(unavailable.identityServices);

  const provider = await mutate(
    request(unavailable.app).post(
      '/participation/northline-hall/votes/etblink/existing-note/etblink/existing-note',
    ),
    unavailableSession,
  )
    .send({ direction: 'upvote', percent: 50 })
    .expect(503);
  assert.equal(provider.body.error.code, 'VOTE_PROVIDER_UNAVAILABLE');
});
