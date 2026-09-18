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
const SOCIAL_BINDINGS = Object.freeze({
  'northline-hall': Object.freeze({
    community: 'hive-199299',
    threadsAccount: 'room-notes',
  }),
});

function contentRecord(overrides = {}) {
  return {
    author: 'etblink',
    permlink: 'existing-note',
    parentAuthor: '',
    parentPermlink: 'hive-199299',
    title: 'Existing title',
    body: 'Existing body',
    jsonMetadata: '{"tags":["hive-199299"],"app":"hivenues/1.0.0","format":"markdown"}',
    ...overrides,
  };
}

function normalizedContent(raw) {
  return {
    author: raw.author,
    permlink: raw.permlink,
    parentAuthor: raw.parentAuthor,
    parentPermlink: raw.parentPermlink,
    title: raw.title,
    bodyHtml: '<p>' + raw.body + '</p>',
    excerpt: raw.body,
    created: '2026-09-18T01:00:00',
    updated: '',
    positiveVotes: 0,
    negativeVotes: 0,
    replyCount: 0,
    payout: 0,
    depth: raw.parentAuthor ? 1 : 0,
  };
}

function hiveReads({
  existing = contentRecord(),
  comments = [],
  observe = [false, true],
} = {}) {
  const calls = [];
  let observation = 0;
  return {
    calls,
    rpcPool: {
      async call() {
        throw new Error('Identity authority RPC is not expected in content route tests');
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
      throw new Error('Content preflight must not use social observation');
    },
    async getContentRecord(author, permlink) {
      calls.push({ method: 'getContentRecord', author, permlink });
      const all = [existing, ...comments];
      return all.find((item) => item.author === author && item.permlink === permlink) || null;
    },
    async getPostWithComments(author, permlink) {
      calls.push({ method: 'getPostWithComments', author, permlink });
      if (!existing || existing.author !== author || existing.permlink !== permlink) {
        const error = new Error('Post not found');
        error.statusCode = 404;
        error.expose = true;
        error.code = 'NOT_FOUND';
        throw error;
      }
      return {
        post: normalizedContent(existing),
        comments: comments.map(normalizedContent),
        profiles: {},
      };
    },
    async observeContentOperation(record) {
      calls.push({
        method: 'observeContentOperation',
        action: record.action,
        operations: structuredClone(record.operations),
      });
      const result = observe[Math.min(observation, observe.length - 1)];
      observation += 1;
      return result;
    },
  };
}

function fixture(options = {}) {
  const store = new CandidateCStore();
  const readService = options.hiveReadService || hiveReads();
  const identityServices = createHiVenuesIdentityServices({
    rpcPool: readService.rpcPool,
    sessionSecret: 'content-experience-session-secret-00000001',
  });
  const app = createHiVenuesApp({
    store,
    hiveReadService: readService,
    socialBindings: SOCIAL_BINDINGS,
    identityServices,
    identityOrigin: ORIGIN,
    contentPermlinkFactory: options.contentPermlinkFactory || ((value) => {
      const slug = String(value || 'content').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      return slug + '-fixed';
    }),
  });
  return { app, store, readService, identityServices };
}

function session(identityServices, account = 'etblink') {
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

test('root post preflight derives author, community, permlink and metadata server-side', async () => {
  const { app, store, identityServices } = fixture();
  const verified = session(identityServices);
  const before = JSON.stringify(store.publicSnapshot('northline-hall'));

  const response = await mutate(
    request(app).post('/participation/northline-hall/content/posts'),
    verified,
  )
    .send({
      title: 'A Room Note',
      body: 'Hello from the room.',
      author: 'attacker',
      community: 'hive-999999',
      permlink: 'client-permlink',
    })
    .expect(201);

  assert.equal(response.body.action, 'post');
  assert.equal(response.body.account, 'etblink');
  assert.equal(response.body.signer, 'etblink');
  assert.equal(response.body.state, 'prepared');
  assert.equal(response.body.summary.community, 'hive-199299');
  assert.equal(response.body.summary.permlink, 'a-room-note-fixed');
  assert.equal(
    response.body.summary.discussionHref,
    '/candidate-c/northline-hall/community/posts/etblink/a-room-note-fixed',
  );
  assert.deepEqual(response.body.operations, [[
    'comment',
    {
      parent_author: '',
      parent_permlink: 'hive-199299',
      author: 'etblink',
      permlink: 'a-room-note-fixed',
      title: 'A Room Note',
      body: 'Hello from the room.',
      json_metadata: '{"tags":["hive-199299"],"app":"hivenues/1.0.0","format":"markdown"}',
    },
  ]]);
  assert.equal(response.body.operations.some((operation) => operation[0] === 'comment_options'), false);
  assert.equal(JSON.stringify(store.publicSnapshot('northline-hall')), before);
});

test('own-post update re-reads canonical discussion and preserves content identity', async () => {
  const reads = hiveReads();
  const { app, identityServices } = fixture({ hiveReadService: reads });
  const verified = session(identityServices);

  const response = await mutate(
    request(app).post('/participation/northline-hall/content/etblink/existing-note/update'),
    verified,
  )
    .send({
      title: 'Revised title',
      body: 'Revised public body.',
      author: 'someone-else',
      parentPermlink: 'hive-999999',
    })
    .expect(201);

  assert.equal(response.body.action, 'update');
  assert.deepEqual(response.body.operations, [[
    'comment',
    {
      parent_author: '',
      parent_permlink: 'hive-199299',
      author: 'etblink',
      permlink: 'existing-note',
      title: 'Revised title',
      body: 'Revised public body.',
      json_metadata: '{"tags":["hive-199299"],"app":"hivenues/1.0.0","format":"markdown"}',
    },
  ]]);
  assert.deepEqual(
    reads.calls.slice(0, 2).map((call) => call.method),
    ['getPostWithComments', 'getContentRecord'],
  );
});

test('update cannot target another author even if the route content exists', async () => {
  const existing = contentRecord({ author: 'juniper-lane' });
  const reads = hiveReads({ existing });
  const { app, identityServices } = fixture({ hiveReadService: reads });
  const verified = session(identityServices, 'etblink');

  const response = await mutate(
    request(app).post('/participation/northline-hall/content/juniper-lane/existing-note/update'),
    verified,
  )
    .send({ title: 'No', body: 'No' })
    .expect(403);

  assert.equal(response.body.error.code, 'CONTENT_AUTHOR_MISMATCH');
  assert.equal(reads.calls.length, 0);
});

test('reply parent must belong to the current canonical host discussion', async () => {
  const child = contentRecord({
    author: 'juniper-lane',
    permlink: 'reply-one',
    parentAuthor: 'etblink',
    parentPermlink: 'existing-note',
    title: '',
    body: 'First reply.',
    jsonMetadata: '{"app":"hivenues/1.0.0","format":"markdown"}',
  });
  const reads = hiveReads({ comments: [child] });
  const { app, identityServices } = fixture({ hiveReadService: reads });
  const verified = session(identityServices);

  const accepted = await mutate(
    request(app).post(
      '/participation/northline-hall/content/etblink/existing-note/replies/juniper-lane/reply-one',
    ),
    verified,
  )
    .send({
      body: 'Nested response.',
      parentAuthor: 'attacker',
      parentPermlink: 'not-real',
    })
    .expect(201);

  assert.equal(accepted.body.action, 'reply');
  assert.equal(accepted.body.summary.parentAuthor, 'juniper-lane');
  assert.equal(accepted.body.summary.parentPermlink, 'reply-one');
  assert.deepEqual(accepted.body.operations[0][1], {
    parent_author: 'juniper-lane',
    parent_permlink: 'reply-one',
    author: 'etblink',
    permlink: 're-reply-one-fixed',
    title: '',
    body: 'Nested response.',
    json_metadata: '{"app":"hivenues/1.0.0","format":"markdown"}',
  });

  const stale = await mutate(
    request(app).post(
      '/participation/northline-hall/content/etblink/existing-note/replies/attacker/not-real',
    ),
    verified,
  )
    .send({ body: 'Should fail.' })
    .expect(404);

  assert.match(stale.body.error.message, /not part of this canonical discussion/i);
});

test('host-community mismatch fails closed before content preflight', async () => {
  const reads = hiveReads({
    existing: contentRecord({ parentPermlink: 'hive-188888' }),
  });
  const { app, identityServices } = fixture({ hiveReadService: reads });
  const verified = session(identityServices);

  const response = await mutate(
    request(app).post('/participation/northline-hall/content/etblink/existing-note/update'),
    verified,
  )
    .send({ title: 'Title', body: 'Body' })
    .expect(404);

  assert.match(response.body.error.message, /not part of this host community/i);
});

test('content wallet acceptance remains pending until exact content observation succeeds', async () => {
  const reads = hiveReads({ observe: [false, true] });
  const { app, identityServices } = fixture({ hiveReadService: reads });
  const verified = session(identityServices);

  const prepared = await mutate(
    request(app).post('/participation/northline-hall/content/posts'),
    verified,
  )
    .send({ title: 'Pending note', body: 'Waiting for canonical readback.' })
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

  assert.equal(
    reads.calls.filter((call) => call.method === 'observeContentOperation').length,
    2,
  );
  assert.equal(
    reads.calls.some((call) => call.method === 'observeSocialOperation'),
    false,
  );
});

test('content provider contract and anonymous mutation fail closed', async () => {
  const incompleteReads = {
    rpcPool: {
      async call() {
        throw new Error('not expected');
      },
    },
    async getProfile(account) { return { name: account }; },
    async getFollowStatus() { return false; },
    async isCommunityMember() { return false; },
    async observeSocialOperation() { return false; },
  };
  const unavailable = fixture({ hiveReadService: incompleteReads });
  const verified = session(unavailable.identityServices);

  const provider = await mutate(
    request(unavailable.app).post('/participation/northline-hall/content/posts'),
    verified,
  )
    .send({ title: 'Title', body: 'Body' })
    .expect(503);
  assert.equal(provider.body.error.code, 'CONTENT_PROVIDER_UNAVAILABLE');

  const ordinary = fixture();
  const anonymous = await request(ordinary.app)
    .post('/participation/northline-hall/content/posts')
    .set('origin', ORIGIN)
    .set('x-csrf-token', 'not-a-session-token')
    .send({ title: 'Title', body: 'Body' })
    .expect(401);
  assert.equal(anonymous.body.error.code, 'IDENTITY_SESSION_REQUIRED');
});
