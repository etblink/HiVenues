'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const request = require('supertest');
const { BETA_ACTIONS } = require('../src/beta/actions');
const { FIRST_PARTY_ASSETS } = require('../src/release/static-assets');
const { V1_ACTIONS } = require('../src/v1/actions');
const {
  UX1F_PULSE,
  UX1F_UPDATES,
  createUx1fVisualFixture,
} = require('./support/ux-1f-fixture');

const ROOT = path.join(__dirname, '..');
const EXPECTED_BETA_ACTIONS = [
  'post', 'comment', 'vote', 'follow', 'unfollow', 'subscribe', 'unsubscribe',
  'profile', 'claim-rewards', 'wall', 'inbox', 'thread',
];
const EXPECTED_READ_OPTIONS = {
  account: 'fourthstreetbar',
  community: 'hive-108590',
  limit: 3,
};

function documentFor(html) {
  return new JSDOM(html, { url: 'https://fourthstreetbar.com/' }).window.document;
}

function assetPath(href) {
  return new URL(href, 'https://fourthstreetbar.com/').pathname;
}

function assertBoundedHomeReads(fixture) {
  assert.deepEqual(fixture.readCalls, [{ method: 'getOfficialCommunityPosts', options: EXPECTED_READ_OPTIONS }]);
  assert.equal(fixture.moderationCalls.length, 1);
  const pulseOptions = fixture.moderationCalls[0].options;
  assert.equal(pulseOptions.name, 'hive-108590');
  assert.equal(pulseOptions.sort, 'created');
  assert.equal(pulseOptions.cursor, null);
  assert.equal(typeof pulseOptions.contentFilter, 'function');
  assert.equal(pulseOptions.contentFilter({ author: 'regular', parentAuthor: '' }), true);
  assert.equal(pulseOptions.contentFilter({ author: 'fourthstreetbar', parentAuthor: '' }), false);
  assert.equal(pulseOptions.contentFilter({ author: 'fourthst.threads', parentAuthor: '' }), false);
  assert.equal(pulseOptions.contentFilter({ author: 'regular', parentAuthor: 'someone' }), false);
  assert.deepEqual(fixture.unexpectedReadCalls, []);
  assert.deepEqual(fixture.rpcPool.calls, []);
  assert.deepEqual(fixture.mutationAttempts, []);
}

test('UX-1F ready homepage combines venue editorial voice with a moderated community pulse', async () => {
  const fixture = createUx1fVisualFixture('ready');
  const response = await request(fixture.app).get('/').expect(200);
  const document = documentFor(response.text);
  const main = document.querySelector('main[data-ux-1f-surface="home"]');

  assert.ok(main);
  assert.deepEqual(Array.from(main.children, (element) => element.classList[0]), [
    'home-hero',
    'home-updates',
    'home-community-pulse',
    'home-pathways',
    'home-gallery',
  ]);
  assert.equal(main.querySelectorAll('h1').length, 1);
  assert.equal(main.querySelector('h1')?.textContent.trim(), '4th Street Bar');
  assert.equal(main.querySelector('img[src="/images/fourth-street-bar-logo.jpg"]'), null);

  const hero = main.querySelector('[data-home-hero]');
  assert.equal(hero?.querySelector('.home-hero__image')?.getAttribute('src'), '/images/fourth-street-bar-patio.jpg');
  assert.equal(hero?.querySelector('.home-hero__image')?.getAttribute('loading'), null);
  assert.equal(hero?.querySelector('.home-hero__primary')?.getAttribute('href'), '/community');
  assert.equal(hero?.querySelector('.home-hero__secondary')?.getAttribute('href'), '#visit');

  const updates = main.querySelector('[data-home-updates-state="ready"]');
  assert.equal(updates?.querySelectorAll('.home-update').length, UX1F_UPDATES.length);
  assert.deepEqual(
    Array.from(updates?.querySelectorAll('.home-update h3 a') || [], (link) => link.getAttribute('href')),
    UX1F_UPDATES.map(({ author, permlink }) => `/post/${author}/${permlink}`),
  );

  const pulse = main.querySelector('[data-home-community-pulse-state="ready"]');
  assert.equal(pulse?.querySelectorAll('.home-community-card').length, UX1F_PULSE.length);
  assert.deepEqual(
    Array.from(pulse?.querySelectorAll('.home-community-card h3 a') || [], (link) => link.getAttribute('href')),
    UX1F_PULSE.map(({ author, permlink }) => `/post/${author}/${permlink}`),
  );
  assert.doesNotMatch(pulse?.textContent || '', /Official duplicate|Threads container|A reply/);
  assert.match(pulse?.textContent || '', /From the community/);
  assert.equal(pulse?.querySelector('form'), null);

  const images = Array.from(main.querySelectorAll('img'));
  assert.deepEqual(images.map((image) => image.getAttribute('src')), [
    '/images/fourth-street-bar-patio.jpg',
    '/images/fourth-street-bar-pool-table.jpg',
    '/images/fourth-street-bar-bartender.jpg',
    '/images/fourth-street-bar-exterior.jpg',
  ]);
  assert.ok(images.every((image) => image.getAttribute('alt') && image.getAttribute('width') && image.getAttribute('height')));
  assert.equal(images.filter((image) => image.getAttribute('loading') === 'lazy').length, 3);

  const visit = main.querySelector('#visit');
  assert.match(visit?.textContent || '', /1114 E\. 4th Street, Reno, NV 89512/);
  assert.match(visit?.textContent || '', /Daily, 12:00 p\.m\.–2:00 a\.m\./);
  assert.equal(visit?.querySelectorAll('a').length, 1);
  assert.ok(visit?.querySelector('a[href^="https://www.google.com/maps/"]'));
  assert.doesNotMatch(visit?.textContent || '', /Official bar website/i);
  assert.match(visit?.textContent || '', /Holiday hours may vary/);
  assert.equal(main.querySelector('.home-pathway--community a[href="/community"]')?.textContent.trim(), 'Browse the community');
  assert.equal(main.querySelector('.home-pathway--community a[href="/create-account"]')?.textContent.trim(), 'New to Hive?');
  assertBoundedHomeReads(fixture);
});

test('official updates and community pulse fail independently without collapsing the useful homepage', async () => {
  for (const [updateStatus, pulseStatus] of [
    ['empty', 'ready'],
    ['unavailable', 'ready'],
    ['ready', 'empty'],
    ['ready', 'unavailable'],
  ]) {
    const fixture = createUx1fVisualFixture(updateStatus, pulseStatus);
    const response = await request(fixture.app).get('/').expect(200);
    const document = documentFor(response.text);
    const main = document.querySelector('main[data-ux-1f-surface="home"]');
    const updates = main?.querySelector(`[data-home-updates-state="${updateStatus}"]`);
    const pulse = main?.querySelector(`[data-home-community-pulse-state="${pulseStatus}"]`);

    assert.ok(updates, `${updateStatus}/${pulseStatus}`);
    assert.ok(pulse, `${updateStatus}/${pulseStatus}`);
    assert.ok(main.querySelector('a[href="/community"]'));
    assert.ok(main.querySelector('a[href="#visit"]'));
    assert.ok(main.querySelector('.home-gallery__grid'));
    if (updateStatus === 'unavailable') {
      assert.equal(updates.querySelector('.home-updates-note')?.getAttribute('role'), 'status');
    }
    if (pulseStatus === 'unavailable') {
      assert.equal(pulse.querySelector('.home-community-pulse__note')?.getAttribute('role'), 'status');
      assert.match(pulse.textContent, /temporarily unavailable/i);
    }
    if (pulseStatus === 'empty') assert.match(pulse.textContent, /quiet right now/i);
    if (pulseStatus === 'ready') assert.equal(pulse.querySelectorAll('.home-community-card').length, 3);
    assertBoundedHomeReads(fixture);
  }
});

test('community pulse remains homepage-scoped, versioned, and read-only', () => {
  const indexSource = fs.readFileSync(path.join(ROOT, 'views/pages/home/index.ejs'), 'utf8');
  const headSource = fs.readFileSync(path.join(ROOT, 'views/common/head.ejs'), 'utf8');
  const routeSource = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
  const readModelSource = fs.readFileSync(path.join(ROOT, 'src/home/read-model.js'), 'utf8');
  const css = fs.readFileSync(path.join(ROOT, 'public/css/home-community-pulse.css'), 'utf8');

  assert.match(indexSource, /assetUrl\('\/css\/home-community-pulse\.css'\)/);
  assert.match(indexSource, /partials\/community-pulse/);
  assert.doesNotMatch(headSource, /home-community-pulse\.css/);
  assert.ok(FIRST_PARTY_ASSETS.includes('/css/home-community-pulse.css'));
  assert.match(css, /\.home-community-pulse\s*\{/);
  assert.match(css, /min-height:\s*44px/);
  assert.doesNotMatch(css, /@import\s+url\(/i);
  assert.doesNotMatch(css, /https?:\/\//i);

  assert.equal((routeSource.match(/loadHomeReadModel\(/g) || []).length, 1);
  assert.match(readModelSource, /getOfficialCommunityPosts\(/);
  assert.match(readModelSource, /moderation\.getCommunityPosts\(/);
  assert.match(readModelSource, /sort:\s*'created'/);
  assert.match(readModelSource, /venue\?\.hive\?\.officialAccount/);
  assert.match(readModelSource, /venue\?\.hive\?\.threadsContainerAccount/);
  assert.match(readModelSource, /Promise\.all\(/);
});

test('UX-1F remains read-only while beta action exposure leaves V1 and signer policy inactive in the fixture', async () => {
  const fixture = createUx1fVisualFixture('empty');
  const response = await request(fixture.app).get('/').expect(200);
  const document = documentFor(response.text);

  assert.deepEqual(BETA_ACTIONS, EXPECTED_BETA_ACTIONS);
  assert.equal(BETA_ACTIONS.includes('thread'), true);
  assert.equal(BETA_ACTIONS.includes('profile'), true);
  assert.equal(V1_ACTIONS.length, 12);
  assert.equal(V1_ACTIONS.includes('profile'), true);
  assert.equal(fixture.config.hive.writeMode, 'disabled');
  assert.equal(fixture.config.hive.signerMode, 'disabled');
  assert.equal(fixture.config.hive.betaSelfSigningEnabled, false);
  assert.equal(fixture.config.hive.v1SelfSigningEnabled, false);
  assert.equal(fixture.config.payments.enabled, false);
  assert.equal(fixture.config.distriator.enabled, false);
  assert.equal(document.querySelector('main form'), null);
  assertBoundedHomeReads(fixture);
});

test('UX-1F home document loads the scoped versioned community pulse asset without changing shared pages', async () => {
  const fixture = createUx1fVisualFixture('empty');
  const response = await request(fixture.app).get('/').expect(200);
  const document = documentFor(response.text);
  const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'), (link) => assetPath(link.href));

  assert.deepEqual(stylesheets, [
    '/css/style.css',
    '/css/m15-social.css',
    '/css/ux-1f-home.css',
    '/css/hv7-structured-home.css',
    '/css/home-community-pulse.css',
  ]);
  assertBoundedHomeReads(fixture);
});
