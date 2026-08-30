'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const { createApp } = require('../src/app');
const { configFrom, logger } = require('./support/test-app');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

function emptyConnectionApp() {
  const profile = {
    name: 'emptyacct', displayName: 'Empty Account', about: '',
    profileImage: '/images/fourth-street-bar-logo.jpg', followerCount: 0,
    followingCount: 0, postCount: 0, reputation: '25.0',
  };
  const calls = [];
  const hiveReadService = {
    async getProfile(account) { calls.push(['getProfile', account]); return profile; },
    async getFollowers(account, cursor) { calls.push(['getFollowers', account, cursor]); return { items: [], nextCursor: null }; },
    async getFollowing(account, cursor) { calls.push(['getFollowing', account, cursor]); return { items: [], nextCursor: null }; },
  };
  const rpcPool = { getStatus: () => [], async call() { throw new Error('M18.4 empty-state route test forbids RPC'); } };
  return { app: createApp({ config: configFrom(), logger, rpcPool, hiveReadService }), calls };
}

test('M18.4 renders empty Followers and Following as full pages and HTMX fragments', async () => {
  const { app, calls } = emptyConnectionApp();
  for (const [kind, message] of [
    ['followers', 'This account has no followers yet.'],
    ['following', 'This account is not following anyone yet.'],
  ]) {
    const full = await request(app).get(`/profile/emptyacct/${kind}`).expect(200);
    assert.match(full.text, new RegExp(message.replace('.', '\\.')));
    assert.match(full.text, /<!doctype html>/i);
    assert.doesNotMatch(full.text, /ReferenceError|error is not defined/);

    const fragment = await request(app)
      .get(`/profile/emptyacct/${kind}`)
      .set('HX-Request', 'true')
      .expect(200);
    assert.match(fragment.text, new RegExp(message.replace('.', '\\.')));
    assert.doesNotMatch(fragment.text, /<!doctype html>/i);
    assert.doesNotMatch(fragment.text, /ReferenceError|error is not defined/);
  }
  assert.deepEqual(calls.map(([method]) => method), [
    'getProfile', 'getFollowers', 'getProfile', 'getFollowers',
    'getProfile', 'getFollowing', 'getProfile', 'getFollowing',
  ]);
});

test('M18.4 keeps optional connection error handling safe without requiring an error local', () => {
  const template = read('views/pages/profile/partials/follow-list.ejs');
  assert.match(template, /typeof error !== 'undefined' && error/);
  assert.doesNotMatch(template, /else if \(error\)/);
});

test('M18.4 keeps exact byte enforcement while presenting friendly length feedback', () => {
  const files = [
    'views/pages/community/partials/community-post-list.ejs',
    'views/pages/community/partials/community-thread-list.ejs',
    'views/partials/full-post.ejs',
    'views/common/comment.ejs',
    'views/pages/profile/partials/settings.ejs',
    'views/pages/profile/partials/wall-posts.ejs',
  ].map(read).join('\n');
  assert.match(files, /maxBytes: 256/);
  assert.match(files, /maxBytes: 32768/);
  assert.match(files, /maxBytes: 500/);
  assert.match(files, /maxBytes: 8192/);
  assert.match(files, /data-max-bytes="512"/);
  assert.match(files, /maxBytes: privateOnly \? 1500 : 2000/);
  assert.doesNotMatch(files, /byte limit/);

  const client = read('public/js/composer-presentation.js');
  assert.match(client, /WALL_PRIVATE_LIMIT = 1500/);
  assert.match(client, /WALL_PUBLIC_LIMIT = 2000/);
  assert.match(client, /new global\.TextEncoder\(\)\.encode\(String\(value \|\| ''\)\)\.byteLength/);
  assert.match(client, /const bytes = utf8Bytes\(input\.value\)/);
  assert.match(client, /\$\{bytes\.toLocaleString\(\)\} \/ \$\{maximum\.toLocaleString\(\)\} used/);
  assert.match(client, /This text is too long\. Shorten it and try again\./);
  assert.match(client, /closest\('\[data-composer-field\]'\)/);
  assert.match(client, /closest\('\[data-composer-form\]'\)/);
  assert.doesNotMatch(read('public/js/social-actions.js'), /\[data-max-bytes\]/);
});

test('M18.4 distinguishes future sign-in-required follow copy from unavailable capability copy', () => {
  const profile = read('views/pages/profile/partials/profile-info-card.ejs');
  assert.match(profile, /!hiveSession && canWriteAction\('follow'\)/);
  assert.match(profile, /Sign in with Hive Keychain to follow this account\./);
  assert.match(profile, /Following isn’t available here yet\./);
});

test('M18.4 historical acceptance remains bound after the successor documentation transition', () => {
  const roadmap = read('docs/ROADMAP.md');
  const index = read('docs/README.md');
  const operations = read('docs/PRODUCTION_OPERATIONS.md');
  const workflow = read('.github/workflows/ci.yml');

  assert.match(roadmap, /## Historical Hive-Bar line/);
  assert.match(roadmap, /M17–M19 capture important beta\/V1 readiness, presentation, deployment, and onboarding evidence/);
  assert.match(roadmap, /They remain authoritative for what those operations established at the time/);

  assert.match(index, /All pre-successor milestone documents, acceptance records, deployment evidence, remediation records, visual artifacts, and release qualification files remain historical evidence/);
  assert.match(index, /what visual or operational evidence supported an accepted milestone/);

  assert.match(
    operations,
    /last recorded accepted production transition: M19\.2 deployed M19\.1 commit `e01407f5f29e3d0a1d41fe33fca129399b4cd2d4`, tree `1a4bb993ad59ca67032997d8938696a079a71e1f`/,
  );
  assert.match(operations, /Production remains beta until a separately authorized transition/);

  assert.match(workflow, /Consolidated visual acceptance \(Ubuntu \/ pinned Chromium\)/);
  assert.match(workflow, /M18_4_VISUAL_OUTPUT: artifacts\/m18-4-visual/);
  assert.match(workflow, /npm run test:visual:m18-4/);
});

test('M18.4 live qualification explicitly reads both social-graph directions without writes', () => {
  const smoke = read('scripts/live-read-smoke.js');
  assert.match(smoke, /reads\.getFollowers\(first\.author\)/);
  assert.match(smoke, /reads\.getFollowing\(first\.author\)/);
  assert.match(smoke, /config\.hive\.writesEnabled, false/);
});
