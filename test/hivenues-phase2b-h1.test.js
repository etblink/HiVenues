'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const { HiVenuesStore } = require('../src/product/store');
const { createHiVenuesRouter } = require('../src/product/router');

const ROOT = path.join(__dirname, '..');
const ISLAND = path.join(ROOT, 'public', 'js', 'hivenues-studio.js');

function appFixture() {
  const store = new HiVenuesStore({ now: () => Date.parse('2026-09-14T23:45:00Z') });
  const app = express();
  app.set('views', path.join(ROOT, 'views'));
  app.set('view engine', 'ejs');
  app.use(express.urlencoded({ extended: false }));
  app.use('/hivenues', createHiVenuesRouter({ store }));
  return { app, store };
}

function listEjs(directory, out = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) listEjs(full, out);
    else if (entry.name.endsWith('.ejs')) out.push(full);
  }
  return out;
}

test('Workstream F + Era 4: HiVenues ships only bounded named client islands and no inline scripts', () => {
  const source = fs.readFileSync(ISLAND, 'utf8');
  const lines = source.split('\n').length - 1;
  assert.ok(lines < 150, `island grew to ${lines} lines`);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
  assert.match(source, /durableStateMirror: false/);
  // The only fetch is the pageshow reconcile against the current document URL.
  assert.equal((source.match(/fetch\(/g) || []).length, 1);
  assert.match(source, /fetch\(window\.location\.href/);

  const publicJs = fs.readdirSync(path.join(ROOT, 'public', 'js')).filter((file) => file.startsWith('hivenues'));
  assert.deepEqual(publicJs, [
    'hivenues-content.js',
    'hivenues-identity.js',
    'hivenues-participation.js',
    'hivenues-reward-claim.js',
    'hivenues-studio.js',
    'hivenues-support.js',
    'hivenues-vote.js',
  ]);

  for (const file of listEjs(path.join(ROOT, 'views', 'hivenues'))) {
    const view = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(view, /<script(?![^>]*src=)[^>]*>/, `${path.relative(ROOT, file)} has an inline script`);
    assert.doesNotMatch(view, /\son[a-z]+=|hx-on/, `${path.relative(ROOT, file)} has an inline handler`);
    const relative = path.relative(ROOT, file).split(path.sep).join('/');
    const scripts = view.match(/<script[^>]*src="([^"]+)"/g) || [];
    for (const tag of scripts) {
      assert.match(
        tag,
        /\/htmx\/htmx\.min\.js|\/js\/hivenues-studio\.js|\/js\/keychain-adapter\.js|\/js\/hivenues-identity\.js|\/js\/hivenues-participation\.js|\/js\/hivenues-content\.js|\/js\/hivenues-vote\.js|\/js\/hivenues-reward-claim\.js|\/js\/hivenues-support\.js/,
        `${relative}: ${tag}`,
      );
      if (/hivenues-identity/.test(tag)) {
        assert.match(
          relative,
          /^(views\/hivenues\/social\/(poster|editorial|hospitality)-hub\.ejs|views\/hivenues\/(support|hive-onboarding)\.ejs)$/,
          `${relative}: identity client escaped an admitted identity surface`,
        );
      }
      if (/hivenues-participation/.test(tag)) {
        assert.match(
          relative,
          /^views\/hivenues\/social\/(poster|editorial|hospitality)-(hub|member)\.ejs$/,
          `${relative}: relationship client escaped the social participation surface`,
        );
      }
      if (/hivenues-content/.test(tag)) {
        assert.match(
          relative,
          /^views\/hivenues\/social\/(poster|editorial|hospitality)-(hub|discussion)\.ejs$/,
          `${relative}: content client escaped the social content surface`,
        );
      }
      if (/hivenues-vote/.test(tag)) {
        assert.match(
          relative,
          /^views\/hivenues\/social\/(poster|editorial|hospitality)-discussion\.ejs$/,
          `${relative}: vote client escaped the canonical discussion surface`,
        );
      }
      if (/hivenues-reward-claim/.test(tag)) {
        assert.match(
          relative,
          /^views\/hivenues\/social\/(poster|editorial|hospitality)-member\.ejs$/,
          `${relative}: reward claim client escaped the verified member surface`,
        );
      }
      if (/hivenues-support/.test(tag)) {
        assert.match(
          relative,
          /^views\/hivenues\/support\.ejs$/,
          `${relative}: direct-support client escaped the released support surface`,
        );
      }
      if (/keychain-adapter/.test(tag)) {
        assert.match(
          relative,
          /^(views\/hivenues\/social\/(poster|editorial|hospitality)-(hub|member|discussion)\.ejs|views\/hivenues\/(support|hive-onboarding)\.ejs)$/,
          `${relative}: signer client escaped an admitted human-wallet surface`,
        );
      }
    }
  }

  for (const family of ['poster', 'editorial', 'hospitality']) {
    const hub = fs.readFileSync(
      path.join(ROOT, 'views', 'hivenues', 'social', `${family}-hub.ejs`),
      'utf8',
    );
    assert.match(hub, /\/js\/keychain-adapter\.js/);
    assert.match(hub, /\/js\/hivenues-identity\.js/);
    assert.match(hub, /\/js\/hivenues-participation\.js/);
    assert.match(hub, /\/js\/hivenues-content\.js/);

    const member = fs.readFileSync(
      path.join(ROOT, 'views', 'hivenues', 'social', `${family}-member.ejs`),
      'utf8',
    );
    assert.match(member, /\/js\/keychain-adapter\.js/);
    assert.match(member, /\/js\/hivenues-participation\.js/);
    assert.match(member, /\/js\/hivenues-reward-claim\.js/);
    assert.doesNotMatch(member, /\/js\/hivenues-identity\.js/);
    assert.doesNotMatch(member, /\/js\/hivenues-content\.js/);

    const discussion = fs.readFileSync(
      path.join(ROOT, 'views', 'hivenues', 'social', `${family}-discussion.ejs`),
      'utf8',
    );
    assert.match(discussion, /\/js\/keychain-adapter\.js/);
    assert.match(discussion, /\/js\/hivenues-content\.js/);
    assert.match(discussion, /\/js\/hivenues-vote\.js/);
    assert.doesNotMatch(discussion, /\/js\/hivenues-identity\.js/);
    assert.doesNotMatch(discussion, /\/js\/hivenues-participation\.js/);
  }

  const support = fs.readFileSync(
    path.join(ROOT, 'views', 'hivenues', 'support.ejs'),
    'utf8',
  );
  assert.match(support, /\/js\/keychain-adapter\.js/);
  assert.match(support, /\/js\/hivenues-identity\.js/);
  assert.match(support, /\/js\/hivenues-support\.js/);
  assert.doesNotMatch(support, /\/js\/hivenues-participation\.js/);
  assert.doesNotMatch(support, /\/js\/hivenues-content\.js/);
  assert.doesNotMatch(support, /\/js\/hivenues-vote\.js/);
  assert.doesNotMatch(support, /\/js\/hivenues-reward-claim\.js/);

  const hiveOnboarding = fs.readFileSync(
    path.join(ROOT, 'views', 'hivenues', 'hive-onboarding.ejs'),
    'utf8',
  );
  assert.match(hiveOnboarding, /\/js\/keychain-adapter\.js/);
  assert.match(hiveOnboarding, /\/js\/hivenues-identity\.js/);
  assert.doesNotMatch(hiveOnboarding, /\/js\/hivenues-participation\.js/);
  assert.doesNotMatch(hiveOnboarding, /\/js\/hivenues-content\.js/);
  assert.doesNotMatch(hiveOnboarding, /\/js\/hivenues-vote\.js/);
  assert.doesNotMatch(hiveOnboarding, /\/js\/hivenues-reward-claim\.js/);
  assert.doesNotMatch(hiveOnboarding, /\/js\/hivenues-support\.js/);
});

test('Workstream F: every Studio edit response is one targeted swap plus exactly two OOB regions; E pages ship no script', async () => {
  const { app, store } = appFixture();
  const slug = 'harbor-and-hearth';
  const tokens = () => ({ expectedRevision: store.snapshot(slug).revision, expectedDraftDigest: store.snapshot(slug).draftDigest });
  const edits = [
    ['tagline', { tagline: 'Measured.' }],
    ['activity', { activityId: 'activity-harbor-supper-001', title: 'Measured', description: 'Measured.' }],
    ['activity-status', { activityId: 'activity-harbor-supper-001', lifecycle: 'completed', statusNote: 'Measured.' }],
    ['offer', { offerId: 'offer-harbor-carrots-001', title: 'Measured', summary: 'Measured.' }],
    ['look', { accent: '#244653' }],
    ['voice', { mechanicId: 'rsvp_local', term: 'Measured' }],
    ['value-recipient', { valueRecipient: 'harbor-pay' }],
    ['connect', { contact: 'measured@example.test' }],
    ['media', { mediaId: 'media-harbor-table-001', x: 10, y: 90 }],
    ['move', { sectionId: 'hero', delta: 1 }],
    ['undo', { resource: 'page.order' }],
  ];
  for (const [route, body] of edits) {
    const response = await request(app).post(`/hivenues/studio/${slug}/${route}`).set('HX-Request', 'true').type('form').send({ ...tokens(), ...body }).expect(200);
    const oob = (response.text.match(/hx-swap-oob="/g) || []).length;
    assert.equal(oob, 2, `${route}: ${oob} OOB regions`);
    assert.match(response.text, /id="candidate-inspector"/, route);
    assert.match(response.text, /id="draft-status"[^>]*hx-swap-oob="outerHTML"/, route);
    assert.match(response.text, /id="hivenuesanvas-slot" hx-swap-oob="innerHTML"/, route);
  }
  const undone = await request(app).post(`/hivenues/studio/${slug}/undo`).set('HX-Request', 'true').type('form').send({ ...tokens(), resource: 'look' }).expect(200);
  assert.match(undone.text, /Set the accent\./, 'undo keeps the selected panel open');

  for (const page of [`/hivenues/studio/${slug}/urgent`, `/hivenues/studio/${slug}/release`]) {
    const response = await request(app).get(page).expect(200);
    assert.doesNotMatch(response.text, /<script/, `${page} ships no script`);
  }
});
