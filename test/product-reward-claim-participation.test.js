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

function rewardReads({
  zero = false,
  observations = [false, true],
  omitObservation = false,
} = {}) {
  const calls = [];
  let observationIndex = 0;
  const reads = {
    calls,
    rpcPool: {
      async call() {
        throw new Error('Identity authority RPC is not expected in reward route tests');
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
      throw new Error('Reward claim must use dedicated exact transaction observation');
    },
    async getAccountRecord(account) {
      calls.push({ method: 'getAccountRecord', account });
      return {
        name: account,
        reward_hive_balance: zero ? '0.000 HIVE' : '1.000 HIVE',
        reward_hbd_balance: zero ? '0.000 HBD' : '0.500 HBD',
        reward_vesting_balance: zero ? '0.000000 VESTS' : '1000.000000 VESTS',
      };
    },
  };
  if (!omitObservation) {
    reads.observeRewardClaimOperation = async (record) => {
      calls.push({
        method: 'observeRewardClaimOperation',
        account: record.account,
        action: record.action,
        transactionId: record.transactionId,
        operations: structuredClone(record.operations),
      });
      const value = observations[Math.min(observationIndex, observations.length - 1)];
      observationIndex += 1;
      return value;
    };
  }
  return reads;
}

function fixture(options = {}) {
  const store = new CandidateCStore();
  const readService = options.hiveReadService || rewardReads(options);
  const identityServices = createHiVenuesIdentityServices({
    rpcPool: readService.rpcPool,
    sessionSecret: 'reward-claim-session-secret-0000000001',
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

test('reward preflight ignores caller amounts and rereads exact current rewards for the verified account', async () => {
  const { app, store, readService, identityServices } = fixture();
  const verified = session(identityServices);
  const before = JSON.stringify(store.publicSnapshot('northline-hall'));

  const response = await mutate(
    request(app).post('/participation/northline-hall/rewards/claim'),
    verified,
  )
    .send({
      account: 'attacker',
      reward_hive: '999999.000 HIVE',
      reward_hbd: '999999.000 HBD',
      reward_vests: '999999999.000000 VESTS',
    })
    .expect(201);

  assert.equal(response.body.action, 'claim-rewards');
  assert.equal(response.body.account, 'paper-sparrow');
  assert.equal(response.body.signer, 'paper-sparrow');
  assert.equal(response.body.authority, 'Posting');
  assert.deepEqual(response.body.operations, [[
    'claim_reward_balance',
    {
      account: 'paper-sparrow',
      reward_hive: '1.000 HIVE',
      reward_hbd: '0.500 HBD',
      reward_vests: '1000.000000 VESTS',
    },
  ]]);
  assert.match(response.body.summary.consequence, /exact current Hive rewards/i);
  assert.deepEqual(
    readService.calls.map((call) => call.method),
    ['getAccountRecord'],
  );
  assert.equal(JSON.stringify(store.publicSnapshot('northline-hall')), before);
});

test('zero current rewards fail before any wallet preflight exists', async () => {
  const { app, identityServices } = fixture({ zero: true });
  const verified = session(identityServices);

  const response = await mutate(
    request(app).post('/participation/northline-hall/rewards/claim'),
    verified,
  ).send({}).expect(409);

  assert.equal(response.body.error.code, 'NO_CLAIMABLE_REWARDS');
  assert.match(response.body.error.message, /no current Hive rewards/i);
});

test('reward claim remains pending until dedicated exact transaction observation succeeds', async () => {
  const reads = rewardReads({ observations: [false, true] });
  const { app, identityServices } = fixture({ hiveReadService: reads });
  const verified = session(identityServices);

  const prepared = await mutate(
    request(app).post('/participation/northline-hall/rewards/claim'),
    verified,
  ).send({}).expect(201);

  const accepted = await mutate(
    request(app).post('/participation/preflight/' + prepared.body.id + '/accepted'),
    verified,
  )
    .send({ transactionId: 'b'.repeat(40) })
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

  const observed = reads.calls.filter((call) => call.method === 'observeRewardClaimOperation');
  assert.equal(observed.length, 2);
  assert.equal(observed[0].transactionId, 'b'.repeat(40));
  assert.deepEqual(observed[0].operations, [[
    'claim_reward_balance',
    {
      account: 'paper-sparrow',
      reward_hive: '1.000 HIVE',
      reward_hbd: '0.500 HBD',
      reward_vests: '1000.000000 VESTS',
    },
  ]]);
  assert.equal(reads.calls.some((call) => call.method === 'observeSocialOperation'), false);
});

test('a later identical reward amount can be prepared after the earlier exact claim is canonically observed', async () => {
  const reads = rewardReads({ observations: [true] });
  const { app, identityServices } = fixture({ hiveReadService: reads });
  const verified = session(identityServices);

  const first = await mutate(
    request(app).post('/participation/northline-hall/rewards/claim'),
    verified,
  ).send({}).expect(201);

  await mutate(
    request(app).post('/participation/preflight/' + first.body.id + '/accepted'),
    verified,
  ).send({ transactionId: 'd'.repeat(40) }).expect(200);

  const observed = await mutate(
    request(app).post('/participation/preflight/' + first.body.id + '/observe'),
    verified,
  ).send({}).expect(200);
  assert.equal(observed.body.state, 'observed');

  const later = await mutate(
    request(app).post('/participation/northline-hall/rewards/claim'),
    verified,
  ).send({}).expect(201);
  assert.notEqual(later.body.id, first.body.id);
  assert.deepEqual(later.body.operations, first.body.operations);
});

test('duplicate reward intent and incomplete provider fail closed', async () => {
  const ordinary = fixture();
  const verified = session(ordinary.identityServices);

  const first = await mutate(
    request(ordinary.app).post('/participation/northline-hall/rewards/claim'),
    verified,
  ).send({}).expect(201);
  assert.equal(first.body.state, 'prepared');

  const duplicate = await mutate(
    request(ordinary.app).post('/participation/northline-hall/rewards/claim'),
    verified,
  ).send({}).expect(409);
  assert.equal(duplicate.body.error.code, 'DUPLICATE_OPERATION');

  const unavailable = fixture({ hiveReadService: rewardReads({ omitObservation: true }) });
  const unavailableSession = session(unavailable.identityServices);

  const response = await mutate(
    request(unavailable.app).post('/participation/northline-hall/rewards/claim'),
    unavailableSession,
  ).send({}).expect(503);
  assert.equal(response.body.error.code, 'REWARD_CLAIM_PROVIDER_UNAVAILABLE');
});

test('reward claim keeps same-origin, verified-session and CSRF consequence boundaries', async () => {
  const { app, identityServices } = fixture();
  const verified = session(identityServices);

  await request(app)
    .post('/participation/northline-hall/rewards/claim')
    .set('origin', ORIGIN)
    .send({})
    .expect(401);

  await request(app)
    .post('/participation/northline-hall/rewards/claim')
    .set('origin', 'https://attacker.example')
    .set('cookie', verified.cookie)
    .set('x-csrf-token', verified.session.csrfToken)
    .send({})
    .expect(403);

  await request(app)
    .post('/participation/northline-hall/rewards/claim')
    .set('origin', ORIGIN)
    .set('cookie', verified.cookie)
    .set('x-csrf-token', 'wrong')
    .send({})
    .expect(403);
});
