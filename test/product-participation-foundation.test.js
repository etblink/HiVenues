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

const ORIGIN = 'http://hivenues.test';
const SESSION_SECRET = 'hivenues-participation-foundation-secret-0001';
const SOCIAL_BINDINGS = Object.freeze({
  'northline-hall': Object.freeze({
    community: 'hive-199299',
    threadsAccount: 'room-notes',
  }),
  'harbor-and-hearth': Object.freeze({
    community: 'hive-188888',
    threadsAccount: 'table-notes',
  }),
});

function readService({
  followState = false,
  membershipState = false,
  profileExists = true,
  observations = [false, true],
} = {}) {
  const calls = [];
  let observationIndex = 0;
  return {
    calls,
    async getProfile(account) {
      calls.push({ method: 'getProfile', account });
      return profileExists ? { name: account, displayName: account } : null;
    },
    async getFollowStatus(follower, following) {
      calls.push({ method: 'getFollowStatus', follower, following });
      return followState;
    },
    async isCommunityMember(account, community) {
      calls.push({ method: 'isCommunityMember', account, community });
      return membershipState;
    },
    async observeSocialOperation(record) {
      calls.push({
        method: 'observeSocialOperation',
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

function identityServices() {
  return createHiVenuesIdentityServices({
    rpcPool: {
      async call() {
        throw new Error('Identity authority RPC must not run in participation foundation tests');
      },
    },
    sessionSecret: SESSION_SECRET,
  });
}

function fixture(options = {}) {
  const store = options.store || new HiVenuesStore();
  const hiveReadService = options.hiveReadService || readService();
  const identities = options.identityServices || identityServices();
  const app = createHiVenuesApp({
    store,
    hiveReadService,
    socialBindings: SOCIAL_BINDINGS,
    identityServices: identities,
    identityOrigin: ORIGIN,
    participationServices: options.participationServices,
  });
  return { app, store, hiveReadService, identities };
}

function verifiedSession(identities, account = 'etblink') {
  const { session, token } = identities.sessionStore.create(account);
  return {
    session,
    cookie: IDENTITY_COOKIE_NAME + '=' + token,
  };
}

function mutation(testRequest, session) {
  return testRequest
    .set('origin', ORIGIN)
    .set('x-csrf-token', session.session.csrfToken)
    .set('cookie', session.cookie)
    .send({});
}

test('follow preflight is derived from verified identity and route context without broadcasting', async () => {
  const { app, store, hiveReadService, identities } = fixture();
  const session = verifiedSession(identities);
  const before = JSON.stringify(store.publicSnapshot('northline-hall'));

  const prepared = await mutation(
    request(app).post('/participation/northline-hall/people/barfriend/follow'),
    session,
  ).expect(201);

  assert.equal(prepared.body.account, 'etblink');
  assert.equal(prepared.body.signer, 'etblink');
  assert.equal(prepared.body.action, 'follow');
  assert.equal(prepared.body.authority, 'Posting');
  assert.equal(prepared.body.state, 'prepared');
  assert.equal(prepared.body.transactionId, null);
  assert.equal(prepared.body.summary.hostSlug, 'northline-hall');
  assert.equal(prepared.body.summary.following, 'barfriend');
  assert.match(prepared.body.summary.consequence, /@etblink will follow @barfriend on Hive/);
  assert.match(prepared.body.message, /Nothing has been broadcast/);
  assert.deepEqual(prepared.body.operations, [[
    'custom_json',
    {
      required_auths: [],
      required_posting_auths: ['etblink'],
      id: 'follow',
      json: '["follow",{"follower":"etblink","following":"barfriend","what":["blog"]}]',
    },
  ]]);

  assert.deepEqual(
    hiveReadService.calls.map((call) => call.method),
    ['getProfile', 'getFollowStatus'],
  );
  assert.equal(JSON.stringify(store.publicSnapshot('northline-hall')), before);
});

test('community preflight ignores client-supplied target and uses the host binding exactly', async () => {
  const { app, store, hiveReadService, identities } = fixture();
  const session = verifiedSession(identities);
  const before = JSON.stringify(store.publicSnapshot('harbor-and-hearth'));

  const prepared = await request(app)
    .post('/participation/harbor-and-hearth/community/subscribe')
    .set('origin', ORIGIN)
    .set('x-csrf-token', session.session.csrfToken)
    .set('cookie', session.cookie)
    .send({ community: 'hive-999999', account: 'attacker' })
    .expect(201);

  assert.equal(prepared.body.account, 'etblink');
  assert.equal(prepared.body.action, 'subscribe');
  assert.equal(prepared.body.summary.community, 'hive-188888');
  assert.equal(prepared.body.summary.hostSlug, 'harbor-and-hearth');
  assert.deepEqual(prepared.body.operations, [[
    'custom_json',
    {
      required_auths: [],
      required_posting_auths: ['etblink'],
      id: 'community',
      json: '["subscribe",{"community":"hive-188888"}]',
    },
  ]]);
  assert.deepEqual(hiveReadService.calls, [{
    method: 'isCommunityMember',
    account: 'etblink',
    community: 'hive-188888',
  }]);
  assert.equal(JSON.stringify(store.publicSnapshot('harbor-and-hearth')), before);
});

test('wallet acceptance stays pending until canonical Hive readback observes the exact operation', async () => {
  const hiveReadService = readService({ observations: [false, true] });
  const { app, identities } = fixture({ hiveReadService });
  const session = verifiedSession(identities);

  const prepared = await mutation(
    request(app).post('/participation/northline-hall/people/barfriend/follow'),
    session,
  ).expect(201);

  const accepted = await mutation(
    request(app).post('/participation/preflight/' + prepared.body.id + '/accepted'),
    session,
  )
    .send({ transactionId: 'a'.repeat(40) })
    .expect(200);

  assert.equal(accepted.body.state, 'broadcast_accepted');
  assert.equal(accepted.body.transactionId, 'a'.repeat(40));
  assert.match(accepted.body.message, /still waiting for canonical Hive confirmation/);

  const pending = await mutation(
    request(app).post('/participation/preflight/' + prepared.body.id + '/observe'),
    session,
  ).expect(200);
  assert.equal(pending.body.state, 'broadcast_accepted');
  assert.equal(pending.body.observationChecks, 1);
  assert.match(pending.body.message, /still waiting for canonical Hive confirmation/);

  const confirmed = await mutation(
    request(app).post('/participation/preflight/' + prepared.body.id + '/observe'),
    session,
  ).expect(200);
  assert.equal(confirmed.body.state, 'observed');
  assert.equal(confirmed.body.observationChecks, 2);
  assert.equal(confirmed.body.message, 'Confirmed on Hive.');

  const observed = hiveReadService.calls.filter((call) => call.method === 'observeSocialOperation');
  assert.equal(observed.length, 2);
  assert.equal(
    hiveReadService.calls.some((call) => /broadcast|sign/i.test(call.method)),
    false,
  );
});

test('current canonical relationship state rejects no-op intents before preflight', async () => {
  const following = fixture({ hiveReadService: readService({ followState: true }) });
  const followingSession = verifiedSession(following.identities);

  const alreadyFollowed = await mutation(
    request(following.app).post('/participation/northline-hall/people/barfriend/follow'),
    followingSession,
  ).expect(409);
  assert.equal(alreadyFollowed.body.error.code, 'RELATIONSHIP_ALREADY_CONFIRMED');

  const notFollowing = fixture({ hiveReadService: readService({ followState: false }) });
  const notFollowingSession = verifiedSession(notFollowing.identities);
  const alreadyUnfollowed = await mutation(
    request(notFollowing.app).post('/participation/northline-hall/people/barfriend/unfollow'),
    notFollowingSession,
  ).expect(409);
  assert.equal(alreadyUnfollowed.body.error.code, 'RELATIONSHIP_ALREADY_CONFIRMED');

  const subscribed = fixture({ hiveReadService: readService({ membershipState: true }) });
  const subscribedSession = verifiedSession(subscribed.identities);
  const alreadySubscribed = await mutation(
    request(subscribed.app).post('/participation/northline-hall/community/subscribe'),
    subscribedSession,
  ).expect(409);
  assert.equal(alreadySubscribed.body.error.code, 'RELATIONSHIP_ALREADY_CONFIRMED');
});

test('preflight is bound to one verified identity session and duplicate intent is refused', async () => {
  const { app, identities } = fixture();
  const first = verifiedSession(identities, 'etblink');
  const second = verifiedSession(identities, 'barfriend');

  const prepared = await mutation(
    request(app).post('/participation/northline-hall/people/paper-sparrow/follow'),
    first,
  ).expect(201);

  const duplicate = await mutation(
    request(app).post('/participation/northline-hall/people/paper-sparrow/follow'),
    first,
  ).expect(409);
  assert.equal(duplicate.body.error.code, 'DUPLICATE_OPERATION');

  const foreignSession = await mutation(
    request(app).post('/participation/preflight/' + prepared.body.id + '/accepted'),
    second,
  )
    .send({ transactionId: 'b'.repeat(40) })
    .expect(403);
  assert.equal(foreignSession.body.error.code, 'PREFLIGHT_SESSION_MISMATCH');
});

test('origin, CSRF, identity, host, profile, binding and transaction-id boundaries fail closed', async () => {
  const missingProfile = fixture({ hiveReadService: readService({ profileExists: false }) });
  const session = verifiedSession(missingProfile.identities);

  const foreignOrigin = await request(missingProfile.app)
    .post('/participation/northline-hall/people/barfriend/follow')
    .set('origin', 'https://attacker.example')
    .set('x-csrf-token', session.session.csrfToken)
    .set('cookie', session.cookie)
    .send({})
    .expect(403);
  assert.equal(foreignOrigin.body.error.code, 'ORIGIN_NOT_ALLOWED');

  const wrongCsrf = await request(missingProfile.app)
    .post('/participation/northline-hall/people/barfriend/follow')
    .set('origin', ORIGIN)
    .set('x-csrf-token', 'wrong')
    .set('cookie', session.cookie)
    .send({})
    .expect(403);
  assert.equal(wrongCsrf.body.error.code, 'CSRF_INVALID');

  const anonymous = await request(missingProfile.app)
    .post('/participation/northline-hall/people/barfriend/follow')
    .set('origin', ORIGIN)
    .set('x-csrf-token', session.session.csrfToken)
    .send({})
    .expect(401);
  assert.equal(anonymous.body.error.code, 'IDENTITY_SESSION_REQUIRED');

  await mutation(
    request(missingProfile.app).post('/participation/not-a-host/people/barfriend/follow'),
    session,
  ).expect(404);

  const absentProfile = await mutation(
    request(missingProfile.app).post('/participation/northline-hall/people/barfriend/follow'),
    session,
  ).expect(404);
  assert.equal(absentProfile.body.error.code, 'NOT_FOUND');

  const unbound = fixture();
  const unboundSession = verifiedSession(unbound.identities);
  const invalidBinding = await mutation(
    request(unbound.app).post('/participation/nova-ashby/community/subscribe'),
    unboundSession,
  ).expect(503);
  assert.equal(invalidBinding.body.error.code, 'COMMUNITY_NOT_BOUND');

  const valid = fixture();
  const validSession = verifiedSession(valid.identities);
  const prepared = await mutation(
    request(valid.app).post('/participation/northline-hall/people/barfriend/follow'),
    validSession,
  ).expect(201);
  const invalidTransaction = await mutation(
    request(valid.app).post('/participation/preflight/' + prepared.body.id + '/accepted'),
    validSession,
  )
    .send({ transactionId: 'not-a-transaction' })
    .expect(400);
  assert.equal(invalidTransaction.body.error.code, 'VALIDATION_ERROR');
});

test('participation provider unavailability is explicit and cannot fabricate a preflight', async () => {
  const store = new HiVenuesStore();
  const identities = identityServices();
  const app = createHiVenuesApp({
    store,
    identityServices: identities,
    identityOrigin: ORIGIN,
    socialBindings: SOCIAL_BINDINGS,
    participationServices: false,
  });
  const session = verifiedSession(identities);

  const unavailable = await mutation(
    request(app).post('/participation/northline-hall/community/subscribe'),
    session,
  ).expect(503);
  assert.equal(unavailable.body.error.code, 'PARTICIPATION_PROVIDER_UNAVAILABLE');
});

test('accepted preflight cannot be cancelled and invalid follow targets never reach preparation', async () => {
  const { app, identities } = fixture();
  const session = verifiedSession(identities);

  const selfFollow = await mutation(
    request(app).post('/participation/northline-hall/people/etblink/follow'),
    session,
  ).expect(400);
  assert.equal(selfFollow.body.error.code, 'VALIDATION_ERROR');

  const prepared = await mutation(
    request(app).post('/participation/northline-hall/people/barfriend/follow'),
    session,
  ).expect(201);
  await mutation(
    request(app).post('/participation/preflight/' + prepared.body.id + '/accepted'),
    session,
  )
    .send({ transactionId: null })
    .expect(200);

  const cancel = await mutation(
    request(app).post('/participation/preflight/' + prepared.body.id + '/cancel'),
    session,
  ).expect(409);
  assert.equal(cancel.body.error.code, 'PREFLIGHT_NOT_CANCELLABLE');
});
