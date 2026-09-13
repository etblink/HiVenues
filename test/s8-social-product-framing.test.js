'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');

const { createApp } = require('../src/app');
const { SessionStore } = require('../src/auth/session-store');
const { createPermlink } = require('../src/hive/social-operations');
const { postSocialMetadata } = require('../src/routes/common');
const { configFrom, logger } = require('./support/test-app');
const {
  HV3_SYNTHETIC_PACKAGE,
} = require('./support/hv3-synthetic-venue');

const ORIGIN = 'http://localhost:3000';
const SESSION_SECRET = 'test-session-secret-that-is-at-least-32-bytes';

function betaApp(account = 'barfriend') {
  const config = configFrom({
    HIVE_WRITE_MODE: 'beta',
    HIVE_SIGNER_MODE: 'keychain',
    SESSION_SECRET,
    RATE_LIMIT_MAX: '1000',
  });
  const sessionStore = new SessionStore({
    secret: config.auth.sessionSecret,
    ttlMs: config.auth.sessionTtlMs,
  });
  const { session, token } = sessionStore.create(account);
  const rpcPool = {
    calls: [],
    getStatus: () => [],
    async call(api, method) {
      this.calls.push({ api, method });
      throw new Error(`Unexpected RPC call ${api}.${method}`);
    },
  };
  const app = createApp({ config, logger, rpcPool, sessionStore });
  return { app, config, rpcPool, session, token };
}

function authorized(builder, fixture) {
  return builder
    .set('origin', ORIGIN)
    .set('cookie', `hive_bar_session=${fixture.token}`)
    .set('x-csrf-token', fixture.session.csrfToken);
}

test('S8.2 post social metadata derives reusable identity from the active venue package', () => {
  const metadata = postSocialMetadata({
    post: {
      author: 'reader-one',
      permlink: 'fixture-note',
      excerpt: '',
    },
    origin: 'https://venue.example',
    siteName: 'The Lantern Room (Fixture)',
    venuePackage: HV3_SYNTHETIC_PACKAGE,
  });

  assert.deepEqual(metadata, {
    canonicalUrl: 'https://venue.example/post/reader-one/fixture-note',
    socialDescription: 'A post by @reader-one on The Lantern Room (Fixture).',
    socialImage: 'https://venue.example/fixtures/lantern-room/logo.svg',
  });
  assert.doesNotMatch(JSON.stringify(metadata), /Fourth Street|4th Street|Hive-Bar/i);
  assert.ok(Object.isFrozen(metadata));
});

test('S8.2 post social metadata preserves authored excerpts while normalizing whitespace and length', () => {
  const metadata = postSocialMetadata({
    post: {
      author: 'reader-one',
      permlink: 'fixture-note',
      excerpt: `  ${'x'.repeat(210)}\nsecond line  `,
    },
    origin: 'https://venue.example',
    siteName: 'The Lantern Room (Fixture)',
    venuePackage: HV3_SYNTHETIC_PACKAGE,
  });

  assert.equal(metadata.socialDescription.length, 200);
  assert.doesNotMatch(metadata.socialDescription, /\s{2,}|\n/);
});

test('S8.2 empty generated content identity uses HiVenues without changing normal slug behavior', () => {
  const options = {
    now: () => Date.UTC(2026, 8, 13, 12, 34, 56, 789),
    random: () => Buffer.from('0102030405', 'hex'),
  };
  assert.equal(
    createPermlink('', options),
    'hivenues-20260913123456789-0102030405',
  );
  assert.equal(
    createPermlink('Pints & Friends', options),
    'pints-friends-20260913123456789-0102030405',
  );
});

test('S8.2 pending confirmation uses HiVenues product language without weakening retry safety or protocol metadata', async () => {
  const fixture = betaApp();
  const prepared = await authorized(
    request(fixture.app).post('/api/social/preflight/post'),
    fixture,
  )
    .send({
      title: 'Venue-generic pending confirmation',
      body: 'Prepared locally; no broadcast occurs in this test.',
      tags: ['reno'],
    })
    .expect(201);

  const operationMetadata = JSON.parse(prepared.body.operations[0][1].json_metadata);
  assert.equal(operationMetadata.app, fixture.config.hive.appTag);
  assert.equal(operationMetadata.app, 'fourth-street-bar-app/0.1.0');

  const accepted = await authorized(
    request(fixture.app).post(`/api/social/preflight/${prepared.body.id}/accepted`),
    fixture,
  )
    .send({})
    .expect(200);

  assert.equal(accepted.body.state, 'broadcast_accepted');
  assert.equal(accepted.body.transactionId, null);
  assert.match(accepted.body.message, /HiVenues couldn’t get a transaction ID/);
  assert.match(accepted.body.message, /Don’t try again yet/);
  assert.doesNotMatch(accepted.body.message, /Hive-Bar/);
  assert.equal(fixture.rpcPool.calls.length, 0);
});
