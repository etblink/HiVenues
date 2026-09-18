'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');

const { CandidateCStore } = require('../src/candidate-c/store');
const { createHiVenuesApp } = require('../src/product/app');
const {
  IDENTITY_COOKIE_NAME,
  createHiVenuesIdentityServices,
} = require('../src/product/identity');

const SLUG = 'northline-hall';

function releaseRecipient(store, recipient = 'northline-pay') {
  const before = store.snapshot(SLUG);
  const edited = store.commit(
    SLUG,
    before.revision,
    'test-support-surface',
    (draft) => {
      draft.bindings.hive.valueRecipient = recipient;
      draft.voice.terms.support_hive = 'Support the room';
    },
    ['bindings.hive.valueRecipient', 'voice.terms.support_hive'],
    before.draftDigest,
  );
  assert.equal(edited.ok, true);
  const working = store.snapshot(SLUG);
  assert.equal(store.createRelease(SLUG, working.revision, working.draftDigest).ok, true);
}

function reads() {
  return {
    rpcPool: {
      async call() {
        throw new Error('RPC not expected in direct-support surface rendering tests');
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
      return false;
    },
    async getAccountRecord(account) {
      return {
        name: account,
        balance: '10.000 HIVE',
        hbd_balance: '10.000 HBD',
      };
    },
    async observeSupportOperation() {
      return false;
    },
  };
}

function fixture({ release = true, supportAvailable = true } = {}) {
  const store = new CandidateCStore();
  if (release) releaseRecipient(store);
  const hiveReadService = reads();
  const identityServices = createHiVenuesIdentityServices({
    rpcPool: hiveReadService.rpcPool,
    sessionSecret: 'support-surface-session-secret-000001',
  });
  const app = createHiVenuesApp({
    store,
    hiveReadService: supportAvailable ? hiveReadService : null,
    identityServices,
  });
  return { app, store, identityServices };
}

function cookie(identityServices, account = 'paper-sparrow') {
  const created = identityServices.sessionStore.create(account);
  return IDENTITY_COOKIE_NAME + '=' + created.token;
}

test('public territory links direct support only after the recipient is released', async () => {
  const before = fixture({ release: false });
  const beforePage = await request(before.app)
    .get('/candidate-c/' + SLUG)
    .expect(200);
  assert.doesNotMatch(beforePage.text, /\/candidate-c\/northline-hall\/support/);

  const workingOnlyStore = new CandidateCStore();
  const working = workingOnlyStore.snapshot(SLUG);
  const edited = workingOnlyStore.commit(
    SLUG,
    working.revision,
    'working-only-support',
    (draft) => {
      draft.bindings.hive.valueRecipient = 'northline-pay';
      draft.voice.terms.support_hive = 'Support the room';
    },
    ['bindings.hive.valueRecipient', 'voice.terms.support_hive'],
    working.draftDigest,
  );
  assert.equal(edited.ok, true);
  const workingOnlyReads = reads();
  const workingIdentity = createHiVenuesIdentityServices({
    rpcPool: workingOnlyReads.rpcPool,
    sessionSecret: 'working-only-support-session-0001',
  });
  const workingOnlyApp = createHiVenuesApp({
    store: workingOnlyStore,
    hiveReadService: workingOnlyReads,
    identityServices: workingIdentity,
  });
  const workingOnlyPage = await request(workingOnlyApp)
    .get('/candidate-c/' + SLUG)
    .expect(200);
  assert.doesNotMatch(workingOnlyPage.text, /\/candidate-c\/northline-hall\/support/);

  const released = fixture();
  const releasedPage = await request(released.app)
    .get('/candidate-c/' + SLUG)
    .expect(200);
  assert.match(releasedPage.text, /href="\/candidate-c\/northline-hall\/support"/);
  assert.match(releasedPage.text, />Support the room</);
});

test('unverified support page explains consequence but does not expose a transfer form', async () => {
  const { app } = fixture();
  const response = await request(app)
    .get('/candidate-c/' + SLUG + '/support')
    .expect(200);

  assert.match(response.text, /This is direct support, not checkout/i);
  assert.match(response.text, /@northline-pay/);
  assert.match(response.text, /normally irreversible/i);
  assert.match(response.text, /data-hivenues-identity/);
  assert.doesNotMatch(response.text, /data-hivenues-support/);
  assert.doesNotMatch(response.text, /\/js\/hivenues-support\.js/);
});

test('verified support page exposes exactly one bounded support form and exact-review client', async () => {
  const { app, identityServices } = fixture();
  const response = await request(app)
    .get('/candidate-c/' + SLUG + '/support')
    .set('cookie', cookie(identityServices))
    .expect(200);

  assert.match(response.text, /data-hivenues-support/);
  assert.match(response.text, /data-support-url="\/participation\/northline-hall\/support"/);
  assert.match(response.text, /data-support-recipient="northline-pay"/);
  assert.match(response.text, /data-support-actor="paper-sparrow"/);
  assert.match(response.text, /<option value="HIVE">HIVE<\/option>/);
  assert.match(response.text, /<option value="HBD">HBD<\/option>/);
  assert.match(response.text, /Wallet authority<\/dt>/);
  assert.match(response.text, /Exact operation/);
  assert.match(response.text, /\/js\/hivenues-support\.js/);
  assert.equal((response.text.match(/data-hivenues-support/g) || []).length, 1);
});

test('released recipient route fails closed when not configured and degrades when support provider is unavailable', async () => {
  const missing = fixture({ release: false });
  await request(missing.app)
    .get('/candidate-c/' + SLUG + '/support')
    .expect(404);

  const unavailable = fixture({ supportAvailable: false });
  const response = await request(unavailable.app)
    .get('/candidate-c/' + SLUG + '/support')
    .set('cookie', cookie(unavailable.identityServices))
    .expect(200);

  assert.match(response.text, /Direct support is temporarily unavailable/);
  assert.doesNotMatch(response.text, /data-hivenues-support/);
  assert.doesNotMatch(response.text, /\/js\/hivenues-support\.js/);
});
