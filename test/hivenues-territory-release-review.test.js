'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const { seedHiVenuesHosts } = require('../src/product/fixtures');
const { createHiVenuesOperatorRouter } = require('../src/product/operator-router');
const { createHiVenuesPreviewRouter } = require('../src/product/preview-router');
const { HiVenuesStore } = require('../src/product/store');

function storeForNorthline() {
  const host = structuredClone(seedHiVenuesHosts().find((item) => item.identity.slug === 'northline-hall'));
  return new HiVenuesStore({ hosts: [host], now: () => Date.parse('2026-09-16T18:00:00Z') });
}

function appFor(store) {
  const app = express();
  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('view engine', 'ejs');
  app.use(express.urlencoded({ extended: false }));
  app.use('/hivenues', createHiVenuesPreviewRouter({ store }));
  app.use('/hivenues', createHiVenuesOperatorRouter({ store }));
  return app;
}

function concurrency(snapshot) {
  return {
    expectedRevision: String(snapshot.revision),
    expectedDraftDigest: snapshot.draftDigest,
  };
}

async function post(app, url, snapshot, fields = {}) {
  return request(app)
    .post(url)
    .type('form')
    .send({ ...concurrency(snapshot), ...fields })
    .expect(303);
}

test('release review truthfully enumerates unpublished Territory v2 changes', async () => {
  const store = storeForNorthline();
  const app = appFor(store);
  const slug = 'northline-hall';
  let snapshot = store.snapshot(slug);
  const originalLiveDigest = store.publicSnapshot(slug).draftDigest;

  await post(app, `/hivenues/studio/${slug}/territory-content/enable`, snapshot);
  snapshot = store.snapshot(slug);

  await post(app, `/hivenues/studio/${slug}/territory-content/profile/new`, snapshot, {
    displayName: 'Release Witness',
    role: 'Program host',
    bio: 'A deterministic profile used to verify consequence-boundary release truth.',
  });
  snapshot = store.snapshot(slug);
  const profile = snapshot.draft.people[0];
  assert.ok(profile?.id);

  await post(app, `/hivenues/studio/${slug}/territory-content/update/new`, snapshot, {
    body: 'This Working-only Update must be named in Release impact.',
    title: 'Release truth Update',
    authorProfileId: profile.id,
  });
  snapshot = store.snapshot(slug);

  await post(app, `/hivenues/studio/${slug}/territory-content/gallery`, snapshot, {
    title: 'Release truth gallery',
    summary: 'One existing host media item selected for the public gallery.',
    include_0: '1',
    order_0: '1',
  });
  snapshot = store.snapshot(slug);

  await post(app, `/hivenues/studio/${slug}/territory-content/navigation`, snapshot, {
    label_home: 'Front room', order_home: '2',
    label_activities: 'Nights', order_activities: '3',
    label_stories: 'Dispatches', order_stories: '1',
    label_offers: 'Offers', order_offers: '4',
    label_gallery: 'Views', order_gallery: '5',
    label_people: 'People', order_people: '6',
    'label_about-visit': 'Visit', 'order_about-visit': '7',
  });
  snapshot = store.snapshot(slug);

  assert.equal(store.publicSnapshot(slug).draftDigest, originalLiveDigest);
  const review = await request(app).get(`/hivenues/studio/${slug}/release`).expect(200);
  assert.match(review.text, /Stories and Updates changed\./);
  assert.match(review.text, /Public profiles changed\./);
  assert.match(review.text, /Gallery changed\./);
  assert.match(review.text, /Visitor navigation changed\./);
  assert.match(review.text, /1 Story \/ Update/);
  assert.match(review.text, /1 Profile/);
  assert.match(review.text, /1 Gallery item/);
  assert.doesNotMatch(review.text, /No visitor-facing difference was detected/);

  await post(app, `/hivenues/studio/${slug}/release`, snapshot);
  const postRelease = await request(app).get(`/hivenues/studio/${slug}/release`).expect(200);
  assert.match(postRelease.text, /No visitor-facing difference was detected from the current live website\./);
  assert.deepEqual(store.diagnostics().external, {
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    deployments: 0,
  });
});
