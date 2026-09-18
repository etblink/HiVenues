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
const { DIRECTION_RECIPE_BY_FAMILY } = require('../src/product/territory-structure-authoring-router');

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

test('Territory v2 Direction apply keeps the bounded recipe aligned without leaking Working to Live', async () => {
  const host = structuredClone(seedHiVenuesHosts().find((item) => item.identity.slug === 'northline-hall'));
  const store = new HiVenuesStore({ hosts: [host], now: () => Date.parse('2026-09-16T21:15:00Z') });
  const app = appFor(store);
  const slug = 'northline-hall';

  let snapshot = store.snapshot(slug);
  await request(app)
    .post(`/hivenues/studio/${slug}/territory-content/enable`)
    .type('form')
    .send(concurrency(snapshot))
    .expect(303);

  snapshot = store.snapshot(slug);
  assert.equal(snapshot.draft.schemaVersion, 2);
  assert.equal(snapshot.draft.presentation.compositionFamily, 'poster');
  assert.deepEqual(snapshot.draft.presentation.recipe, DIRECTION_RECIPE_BY_FAMILY.poster);
  assert.equal(store.publicSnapshot(slug).draft.schemaVersion, 1);
  assert.equal(store.publicSnapshot(slug).draft.presentation.compositionFamily, 'poster');

  const proposalResponse = await request(app)
    .post(`/hivenues/studio/${slug}/direction/propose`)
    .type('form')
    .send({ ...concurrency(snapshot), familyId: 'editorial' })
    .expect(303);

  const reviewPath = proposalResponse.headers.location;
  assert.match(reviewPath, new RegExp(`^/hivenues/studio/${slug}/direction/`));
  const review = await request(app).get(reviewPath).expect(200);
  assert.match(review.text, /Editorial field notes/);

  await request(app)
    .post(`${reviewPath}/apply`)
    .type('form')
    .send(concurrency(snapshot))
    .expect(303);

  const after = store.snapshot(slug);
  assert.equal(after.revision, snapshot.revision + 1);
  assert.equal(after.draft.presentation.compositionFamily, 'editorial');
  assert.equal(after.draft.intent.direction, 'editorial');
  assert.deepEqual(after.draft.presentation.recipe, DIRECTION_RECIPE_BY_FAMILY.editorial);

  const live = store.publicSnapshot(slug);
  assert.equal(live.draft.schemaVersion, 1);
  assert.equal(live.draft.presentation.compositionFamily, 'poster');
  assert.deepEqual(store.diagnostics().external, {
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    deployments: 0,
  });
});
