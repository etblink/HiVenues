'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  SUPPORTED_ACCOUNT_NOTIFICATION_TYPES,
  localRouteForNotificationUrl,
  normalizeAccountNotification,
  normalizeAccountNotifications,
  normalizeNotificationDate,
  readAccountNotifications,
} = require('../src/hive/account-notifications');

test('supported account notification types are a narrow frozen social set', () => {
  assert.deepEqual(SUPPORTED_ACCOUNT_NOTIFICATION_TYPES, [
    'reply',
    'mention',
    'vote',
    'follow',
    'reblog',
    'subscribe',
  ]);
  assert.equal(Object.isFrozen(SUPPORTED_ACCOUNT_NOTIFICATION_TYPES), true);
});

test('notification dates treat Hive zoneless timestamps as UTC', () => {
  assert.equal(normalizeNotificationDate('2019-11-20T07:48:06'), '2019-11-20T07:48:06.000Z');
  assert.equal(normalizeNotificationDate('bad date'), '');
});

test('notification URL mapping stays on conservative local post/profile routes', () => {
  assert.equal(localRouteForNotificationUrl('@alice/a-post'), '/post/alice/a-post');
  assert.equal(localRouteForNotificationUrl('/hive-108590/@alice/a-post?x=1'), '/post/alice/a-post');
  assert.equal(localRouteForNotificationUrl('@alice'), '/profile/alice');
  assert.equal(localRouteForNotificationUrl('https://evil.example/@alice/a-post'), null);
  assert.equal(localRouteForNotificationUrl('//evil.example/@alice/a-post'), null);
  assert.equal(localRouteForNotificationUrl('/settings'), null);
});

test('normalizer omits unsupported or malformed records and truncates message text', () => {
  assert.equal(
    normalizeAccountNotification({ id: 1, type: 'set_role', msg: 'role', url: '@alice' }),
    null,
  );
  assert.equal(normalizeAccountNotification({ id: 'not-an-id', type: 'vote', msg: 'vote' }), null);
  assert.equal(normalizeAccountNotification({ id: 2, type: 'vote', msg: '   ' }), null);
  const normalized = normalizeAccountNotification({
    id: 3,
    type: 'mention',
    date: '2026-08-31T12:00:00',
    msg: `  @bob mentioned you ${'x'.repeat(600)}  `,
    url: '/hive-108590/@bob/hello',
  });
  assert.equal(normalized.id, '3');
  assert.equal(normalized.type, 'mention');
  assert.equal(normalized.label, 'Mention');
  assert.equal(normalized.localRoute, '/post/bob/hello');
  assert.equal(normalized.date, '2026-08-31T12:00:00.000Z');
  assert.equal(normalized.message.length, 500);
});

test('normalizer deduplicates by id and enforces visible limit', () => {
  const raw = Array.from({ length: 8 }, (_, index) => ({
    id: index < 2 ? 1 : index,
    type: 'reply',
    msg: `reply ${index}`,
    url: '@alice/post',
  }));
  const items = normalizeAccountNotifications(raw, { limit: 3 });
  assert.deepEqual(items.map((item) => item.id), ['1', '2', '3']);
});

test('reader validates account, bounds upstream request, and returns normalized visible items', async () => {
  const calls = [];
  const rpcPool = {
    async call(api, method, params) {
      calls.push({ api, method, params });
      return [
        { id: 1, type: 'set_role', msg: 'skip', url: '@alice' },
        {
          id: 2,
          type: 'vote',
          msg: '@bob voted on your post',
          date: '2026-08-31T12:00:00',
          url: '@alice/post',
        },
      ];
    },
  };
  const page = await readAccountNotifications(rpcPool, { account: 'Alice', limit: 20 });
  assert.deepEqual(calls, [
    {
      api: 'bridge',
      method: 'account_notifications',
      params: { account: 'alice', limit: 40 },
    },
  ]);
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].type, 'vote');
  await assert.rejects(
    () => readAccountNotifications(rpcPool, { account: 'not valid' }),
    /valid Hive account/,
  );
});