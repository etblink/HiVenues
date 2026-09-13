'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { JSDOM } = require('jsdom');

const { createApp } = require('../src/app');
const { SessionStore } = require('../src/auth/session-store');
const { renderV3ActivityDetail } = require('../src/venue/v3/renderer');
const { configFrom, logger } = require('./support/test-app');
const { createFixtureRpc } = require('./support/fixture-rpc');
const { nativeCreatorSource } = require('./support/v3-reference-fixtures');

const ORIGIN = 'http://localhost:3000';
const SESSION_SECRET = 'test-session-secret-that-is-at-least-32-bytes';
const ROOT_AUTHOR = 'etblink';
const ROOT_PERMLINK = 'welcome-fourth-street-bar';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function activitySourceWithBoundDiscussion() {
  const source = clone(nativeCreatorSource());
  source.activityBindings.hiveSocial = [
    {
      version: 1,
      id: 'live-session-social-root',
      activityId: 'live-session-one',
      roles: ['ANNOUNCEMENT', 'PRIMARY_DISCUSSION'],
      primary: true,
      state: 'BOUND',
      operationId: 'publish:live-session-one',
      hiveRef: {
        author: ROOT_AUTHOR,
        permlink: ROOT_PERMLINK,
      },
    },
  ];
  return source;
}

function betaJourneyFixture() {
  const config = configFrom({
    HIVE_WRITE_MODE: 'beta',
    HIVE_SIGNER_MODE: 'keychain',
    SESSION_SECRET,
    RATE_LIMIT_MAX: '1000',
  });
  const rpcPool = createFixtureRpc();
  const sessionStore = new SessionStore({
    secret: config.auth.sessionSecret,
    ttlMs: config.auth.sessionTtlMs,
  });
  const { session, token } = sessionStore.create('barfriend');
  const app = createApp({ config, logger, rpcPool, sessionStore });
  return { app, rpcPool, session, token };
}

function authorized(builder, fixture) {
  return builder
    .set('origin', ORIGIN)
    .set('cookie', `hive_bar_session=${fixture.token}`)
    .set('x-csrf-token', fixture.session.csrfToken);
}

test('S8.3 bound Activity discussion resolves locally and an ordinary verified user can prepare a reply without broadcast', async () => {
  const source = activitySourceWithBoundDiscussion();
  assert.equal(source.capabilities.community.state, 'disabled');
  const activity = source.resources.activities.find((candidate) => candidate.id === 'live-session-one');
  const document = new JSDOM(renderV3ActivityDetail(source, activity.slug)).window.document;
  const discussionLink = document.querySelector('[data-social-role="PRIMARY_DISCUSSION"]');

  assert.ok(discussionLink);
  assert.equal(discussionLink.getAttribute('href'), `/post/${ROOT_AUTHOR}/${ROOT_PERMLINK}`);
  assert.equal(source.activityBindings.hiveSocial[0].activityId, activity.id);

  const fixture = betaJourneyFixture();
  const read = await request(fixture.app)
    .get(discussionLink.getAttribute('href'))
    .expect(200);

  assert.match(read.text, /Welcome to the 4th Street Bar community/);
  assert.match(read.text, /Glad to be here/);
  assert.equal(
    fixture.rpcPool.calls.some(({ method }) => method === 'get_discussion'),
    true,
  );

  const callsBeforePreflight = fixture.rpcPool.calls.length;
  const reply = await authorized(
    request(fixture.app).post('/api/social/preflight/comment'),
    fixture,
  )
    .send({
      body: 'Replying from the Activity-linked discussion as an ordinary verified visitor.',
      parentAuthor: ROOT_AUTHOR,
      parentPermlink: ROOT_PERMLINK,
      author: 'venuehost',
    })
    .expect(201);

  assert.equal(reply.body.broadcastMode, 'beta-self');
  assert.equal(reply.body.state, 'prepared');
  assert.equal(reply.body.account, 'barfriend');
  assert.equal(reply.body.signer, 'barfriend');
  assert.equal(reply.body.authority, 'Posting');
  assert.equal(reply.body.operations[0][0], 'comment');
  assert.equal(reply.body.operations[0][1].author, 'barfriend');
  assert.equal(reply.body.operations[0][1].parent_author, ROOT_AUTHOR);
  assert.equal(reply.body.operations[0][1].parent_permlink, ROOT_PERMLINK);
  assert.equal(fixture.rpcPool.calls.length, callsBeforePreflight);
});
