'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const { CandidateCStore } = require('../src/candidate-c/store');
const { createCandidateCRouter } = require('../src/candidate-c/router');

const ROOT = path.join(__dirname, '..');
const ISLAND = path.join(ROOT, 'public', 'js', 'candidate-c-studio.js');

function appFixture() {
  const store = new CandidateCStore({ now: () => Date.parse('2026-09-14T23:45:00Z') });
  const app = express();
  app.set('views', path.join(ROOT, 'views'));
  app.set('view engine', 'ejs');
  app.use(express.urlencoded({ extended: false }));
  app.use('/candidate-c', createCandidateCRouter({ store }));
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

test('Workstream F: Candidate C ships exactly one bounded custom client island and no inline scripts', () => {
  const source = fs.readFileSync(ISLAND, 'utf8');
  const lines = source.split('\n').length - 1;
  assert.ok(lines < 150, `island grew to ${lines} lines`);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
  assert.match(source, /durableStateMirror: false/);
  // The Candidate C island itself remains presentation-only except for the
  // pageshow reconcile. Hive wallet/network behavior lives in the shared
  // platform Keychain integration modules, not a second Candidate C island.
  assert.equal((source.match(/fetch\(/g) || []).length, 1);
  assert.match(source, /fetch\(window\.location\.href/);

  const publicJs = fs.readdirSync(path.join(ROOT, 'public', 'js')).filter((file) => file.startsWith('candidate-c'));
  assert.deepEqual(publicJs, ['candidate-c-studio.js']);

  for (const file of listEjs(path.join(ROOT, 'views', 'candidate-c'))) {
    const view = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(view, /<script(?![^>]*src=)[^>]*>/, `${path.relative(ROOT, file)} has an inline script`);
    assert.doesNotMatch(view, /\son[a-z]+=|hx-on/, `${path.relative(ROOT, file)} has an inline handler`);
    const scripts = view.match(/<script[^>]*src="([^"]+)"/g) || [];
    const hiveIntegrationView = path.basename(file) === 'hive-integration.ejs';
    for (const tag of scripts) {
      const allowed = hiveIntegrationView
        ? /\/js\/(keychain-adapter|hive-integration)\.js/.test(tag)
        : /\/htmx\/htmx\.min\.js|\/js\/candidate-c-studio\.js/.test(tag);
      assert.equal(allowed, true, `${path.relative(ROOT, file)}: ${tag}`);
    }
  }
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
    ['connect', { contact: 'measured@example.test' }],
    ['media', { mediaId: 'media-harbor-table-001', x: 10, y: 90 }],
    ['move', { sectionId: 'hero', delta: 1 }],
    ['undo', { resource: 'page.order' }],
  ];
  for (const [route, body] of edits) {
    const response = await request(app).post(`/candidate-c/studio/${slug}/${route}`).set('HX-Request', 'true').type('form').send({ ...tokens(), ...body }).expect(200);
    const oob = (response.text.match(/hx-swap-oob="/g) || []).length;
    assert.equal(oob, 2, `${route}: ${oob} OOB regions`);
    assert.match(response.text, /id="candidate-inspector"/, route);
    assert.match(response.text, /id="draft-status"[^>]*hx-swap-oob="outerHTML"/, route);
    assert.match(response.text, /id="candidate-canvas-slot" hx-swap-oob="innerHTML"/, route);
  }
  const undone = await request(app).post(`/candidate-c/studio/${slug}/undo`).set('HX-Request', 'true').type('form').send({ ...tokens(), resource: 'look' }).expect(200);
  assert.match(undone.text, /Set the accent\./, 'undo keeps the selected panel open');

  for (const page of [`/candidate-c/studio/${slug}/urgent`, `/candidate-c/studio/${slug}/release`]) {
    const response = await request(app).get(page).expect(200);
    assert.doesNotMatch(response.text, /<script/, `${page} ships no script`);
  }
});
