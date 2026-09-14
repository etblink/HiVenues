'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const { renderV3ActivityDetail } = require('../src/venue/v3/renderer');
const { nativeCreatorSource } = require('./support/v3-reference-fixtures');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sourceWithSocialState(state = 'BOUND') {
  const source = clone(nativeCreatorSource());
  source.activityBindings.hiveSocial = [
    {
      version: 1,
      id: 'live-session-social-root',
      activityId: 'live-session-one',
      roles: ['ANNOUNCEMENT', 'PRIMARY_DISCUSSION'],
      primary: true,
      state,
      operationId: 'publish:live-session-one',
      hiveRef: {
        author: 'alice',
        permlink: 'live-session-one',
      },
    },
  ];
  return source;
}

function documentFrom(source) {
  const activity = source.resources.activities[0];
  return new JSDOM(renderV3ActivityDetail(source, activity.slug)).window.document;
}

test('S8.2 a BOUND Activity social root renders one venue-local Discussion action', () => {
  const document = documentFrom(sourceWithSocialState('BOUND'));
  const discussion = document.querySelector('.v3-activity-discussion');
  assert.ok(discussion);
  assert.equal(discussion.dataset.socialState, 'SOCIAL_ROOT_BOUND');
  assert.equal(discussion.querySelector('h2').textContent, 'Discussion');
  assert.match(discussion.textContent, /public conversation about this activity/i);

  const link = discussion.querySelector('[data-social-role="PRIMARY_DISCUSSION"]');
  assert.ok(link);
  assert.equal(link.textContent, 'Join discussion');
  assert.equal(link.getAttribute('href'), '/post/alice/live-session-one');
  assert.equal(document.querySelectorAll('.v3-activity-discussion').length, 1);
});

test('S8.2 unbound Activity remains complete without social chrome', () => {
  const source = clone(nativeCreatorSource());
  const document = documentFrom(source);
  assert.equal(document.querySelector('.v3-activity-discussion'), null);
  assert.equal(document.querySelector('h1').textContent, source.resources.activities[0].title);
  assert.match(document.body.textContent, /Join online/);
});

for (const state of ['PLANNED', 'DEGRADED', 'RECONCILIATION_REQUIRED']) {
  test(`S8.2 ${state} social root does not masquerade as a confirmed public discussion`, () => {
    const document = documentFrom(sourceWithSocialState(state));
    assert.equal(document.querySelector('.v3-activity-discussion'), null);
    assert.equal(
      [...document.querySelectorAll('a')].some((link) => link.getAttribute('href') === '/post/alice/live-session-one'),
      false,
    );
  });
}

test('S8.2 Discussion action respects renderer basePath without changing Hive identity', () => {
  const source = sourceWithSocialState('BOUND');
  const activity = source.resources.activities[0];
  const document = new JSDOM(renderV3ActivityDetail(source, activity.slug, { basePath: '/venue/demo' })).window.document;
  const link = document.querySelector('[data-social-role="PRIMARY_DISCUSSION"]');
  assert.equal(link.getAttribute('href'), '/venue/demo/post/alice/live-session-one');
  assert.equal(source.activityBindings.hiveSocial[0].hiveRef.author, 'alice');
  assert.equal(source.activityBindings.hiveSocial[0].hiveRef.permlink, 'live-session-one');
});
