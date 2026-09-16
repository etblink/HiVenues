'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const { CandidateCStore } = require('../src/candidate-c/store');
const { createCandidateCRouter } = require('../src/candidate-c/router');
const { createCandidateCPreviewRouter } = require('../src/candidate-c/preview-router');
const { getMaximalTerritoryHost } = require('../src/candidate-c/territory-fixture');
const { seedCandidateCHosts } = require('../src/candidate-c/fixtures');

function storeFor(host) {
  return new CandidateCStore({
    hosts: [structuredClone(host)],
    now: () => Date.parse('2026-09-16T05:30:00Z'),
  });
}

function appFor(store) {
  const app = express();
  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('view engine', 'ejs');
  app.use(express.urlencoded({ extended: false }));
  app.use('/candidate-c', createCandidateCPreviewRouter({ store }));
  app.use('/candidate-c', createCandidateCRouter({ store }));
  return app;
}

test('Studio exposes transient semantic page review without replacing the canvas or durable host state', async () => {
  const store = storeFor(getMaximalTerritoryHost());
  const app = appFor(store);
  const before = store.snapshot('lantern-relay');

  const studio = await request(app).get('/candidate-c/studio/lantern-relay').expect(200);
  assert.match(studio.text, /aria-label="Review visitor page"/);
  assert.match(studio.text, /data-review-surface="canvas"[^>]*aria-current="page"/);
  assert.match(studio.text, /review\?surface=stories-index/);
  assert.match(studio.text, /review\?surface=gallery/);
  assert.match(studio.text, /review\?surface=people-index/);
  assert.match(studio.text, />Wide</);
  assert.match(studio.text, />Narrow review</);
  assert.doesNotMatch(studio.text, /cc-territory-review__frame/);

  const review = await request(app)
    .get('/candidate-c/studio/lantern-relay/review?surface=stories-index')
    .set('HX-Request', 'true')
    .expect(200);
  assert.match(review.text, /data-selected-review="stories-index"/);
  assert.match(review.text, /Working visitor preview/);
  assert.match(review.text, /Nothing in this review becomes live until Release/);
  assert.match(review.text, /src="\/candidate-c\/studio\/lantern-relay\/preview\/stories"/);
  assert.match(review.text, /sandbox="allow-same-origin"/);
  assert.doesNotMatch(review.text, /allow-forms|allow-scripts/);

  const after = store.snapshot('lantern-relay');
  assert.equal(after.revision, before.revision);
  assert.equal(after.draftDigest, before.draftDigest);
});

test('Studio semantic review has ordinary full Preview fallback and rejects unknown surfaces', async () => {
  const app = appFor(storeFor(getMaximalTerritoryHost()));

  await request(app)
    .get('/candidate-c/studio/lantern-relay/review?surface=stories-index')
    .expect(303)
    .expect('Location', '/candidate-c/studio/lantern-relay/preview/stories');

  const canvas = await request(app)
    .get('/candidate-c/studio/lantern-relay/review?surface=canvas')
    .set('HX-Request', 'true')
    .expect(200);
  assert.match(canvas.text, /data-selected-review="canvas"/);
  assert.doesNotMatch(canvas.text, /cc-territory-review__frame/);

  await request(app)
    .get('/candidate-c/studio/lantern-relay/review?surface=story-detail:story-lantern-roofline-001')
    .set('HX-Request', 'true')
    .expect(400)
    .expect(/UNKNOWN_STUDIO_REVIEW_SURFACE/);
});

test('v1 Studio review exposes only derivable territory pages and fabricates no v2 surfaces', async () => {
  const northline = seedCandidateCHosts().find((host) => host.identity.slug === 'northline-hall');
  const app = appFor(storeFor(northline));
  const studio = await request(app).get('/candidate-c/studio/northline-hall').expect(200);

  assert.match(studio.text, /review\?surface=activities-index/);
  assert.match(studio.text, /review\?surface=offers/);
  assert.match(studio.text, /review\?surface=about-visit/);
  assert.doesNotMatch(studio.text, /review\?surface=stories-index/);
  assert.doesNotMatch(studio.text, /review\?surface=gallery/);
  assert.doesNotMatch(studio.text, /review\?surface=people-index/);

  await request(app)
    .get('/candidate-c/studio/northline-hall/review?surface=stories-index')
    .set('HX-Request', 'true')
    .expect(400);
});
