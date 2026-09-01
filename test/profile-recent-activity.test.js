'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { SESSION_COOKIE_NAME } = require('../src/auth/session-store');
const { createFixtureRpc, fixture } = require('./support/fixture-rpc');
const { createFixtureApp } = require('./support/test-app');

const ACCOUNT = fixture.profiles[0].name;

function createActivityRpc({ mode = 'ready' } = {}) {
  const base = createFixtureRpc();
  const originalCall = base.call.bind(base);
  base.call = async (api, method, params) => {
    if (api === 'bridge' && method === 'account_notifications') {
      base.calls.push({ api, method, params: structuredClone(params) });
      if (mode === 'unavailable') throw new Error('deterministic account-notification outage');
      if (mode === 'empty') return [];
      return [
        {
          id: 101,
          type: 'vote',
          score: 25,
          date: '2026-08-31T12:30:00',
          msg: '@friend voted on your post ($0.013)',
          url: `@${ACCOUNT}/fixture-post`,
        },
        {
          id: 102,
          type: 'set_role',
          score: 30,
          date: '2026-08-31T12:20:00',
          msg: 'Administrative noise should not render',
          url: `@${ACCOUNT}`,
        },
        {
          id: 103,
          type: 'mention',
          score: 20,
          date: '2026-08-31T12:10:00',
          msg: '<img src=x onerror=alert(1)> @someone mentioned you',
          url: `/hive-108590/@someone/mention-reply`,
        },
      ];
    }
    return originalCall(api, method, params);
  };
  return base;
}

function ownerSession(app) {
  return app.locals.services.sessionStore.create(ACCOUNT).token;
}

function cookie(token) {
  return `${SESSION_COOKIE_NAME}=${token}`;
}

test('owner Recent activity renders normalized supported notifications with no read-state claim', async () => {
  const rpcPool = createActivityRpc();
  const { app } = createFixtureApp({ rpcPool });
  const response = await request(app)
    .get(`/profile/${ACCOUNT}/activity`)
    .set('Cookie', cookie(ownerSession(app)))
    .expect(200);

  assert.match(response.headers['cache-control'] || '', /no-store/i);
  assert.match(response.text, /data-profile-activity-state="ready"/);
  assert.match(response.text, /Recent activity/);
  assert.match(response.text, /not an unread inbox/i);
  assert.match(response.text, /@friend voted on your post/);
  assert.match(response.text, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(response.text, /<img src=x onerror=alert\(1\)>/);
  assert.doesNotMatch(response.text, /Administrative noise should not render/);
  assert.match(response.text, new RegExp(`href="/post/${ACCOUNT}/fixture-post"`));
  assert.match(response.text, /href="\/post\/someone\/mention-reply"/);
  assert.match(response.text, /href="\/profile\/[^\"]+\/activity"[^>]*aria-current="page"/);

  const notificationCalls = rpcPool.calls.filter(
    ({ api, method }) => api === 'bridge' && method === 'account_notifications',
  );
  assert.deepEqual(notificationCalls, [
    {
      api: 'bridge',
      method: 'account_notifications',
      params: { account: ACCOUNT, limit: 40 },
    },
  ]);
});

test('Recent activity is owner-only and does not query notifications before authorization', async () => {
  const rpcPool = createActivityRpc();
  const { app } = createFixtureApp({ rpcPool });

  await request(app).get(`/profile/${ACCOUNT}/activity`).expect(401);
  const outsider = app.locals.services.sessionStore.create('fartman69').token;
  await request(app)
    .get(`/profile/${ACCOUNT}/activity`)
    .set('Cookie', cookie(outsider))
    .expect(403);

  assert.equal(
    rpcPool.calls.filter(({ method }) => method === 'account_notifications').length,
    0,
  );
});

test('Recent activity empty and unavailable states keep the owner profile usable', async () => {
  for (const [mode, expectedState, expectedText] of [
    ['empty', 'empty', /No recent activity to show/],
    ['unavailable', 'unavailable', /Recent activity is temporarily unavailable/],
  ]) {
    const rpcPool = createActivityRpc({ mode });
    const { app } = createFixtureApp({ rpcPool });
    const response = await request(app)
      .get(`/profile/${ACCOUNT}/activity`)
      .set('Cookie', cookie(ownerSession(app)))
      .expect(200);
    assert.match(response.text, new RegExp(`data-profile-activity-state="${expectedState}"`));
    assert.match(response.text, expectedText);
    assert.doesNotMatch(response.text, /deterministic account-notification outage/);
  }
});

test('HTMX Recent activity response returns only the activity panel', async () => {
  const rpcPool = createActivityRpc();
  const { app } = createFixtureApp({ rpcPool });
  const response = await request(app)
    .get(`/profile/${ACCOUNT}/activity`)
    .set('Cookie', cookie(ownerSession(app)))
    .set('HX-Request', 'true')
    .expect(200);

  assert.match(response.text, /data-profile-activity-state="ready"/);
  assert.doesNotMatch(response.text, /<!DOCTYPE html>/i);
  assert.doesNotMatch(response.text, /<nav class="profile-tabs/);
});