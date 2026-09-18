'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const request = require('supertest');

const { CandidateCStore } = require('../src/candidate-c/store');
const { createCandidateCRouter } = require('../src/candidate-c/router');

function appFixture() {
  const store = new CandidateCStore();
  const app = express();
  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('view engine', 'ejs');
  app.use(express.urlencoded({ extended: false }));
  app.use('/candidate-c', createCandidateCRouter({ store }));
  return { app, store };
}

function tokens(store, slug) {
  const snapshot = store.snapshot(slug);
  return {
    expectedRevision: snapshot.revision,
    expectedDraftDigest: snapshot.draftDigest,
  };
}

test('Studio offers an ordinary show/hide downvote presentation control with protocol-truth copy', async () => {
  const { app } = appFixture();
  const response = await request(app)
    .get('/candidate-c/studio/northline-hall/inspect?resource=participation')
    .expect(200);

  assert.match(response.text, /Show a downvote action alongside the positive vote/);
  assert.match(response.text, /Hide the downvote action on this HiVenue/);
  assert.match(response.text, /does not make downvotes impossible on Hive/i);
  assert.match(response.text, /another compatible Hive client/i);
});

test('negative-vote presentation policy is draft-owned, explicit and release-gated', async () => {
  const { app, store } = appFixture();
  const beforePublic = store.publicSnapshot('northline-hall');
  assert.notEqual(beforePublic.draft.bindings.hive.showNegativeVoteAction, true);

  await request(app)
    .post('/candidate-c/studio/northline-hall/participation')
    .set('HX-Request', 'true')
    .type('form')
    .send({
      ...tokens(store, 'northline-hall'),
      showNegativeVoteAction: 'show',
    })
    .expect(200)
    .expect(/Show a downvote action alongside the positive vote/);

  const draft = store.snapshot('northline-hall');
  assert.equal(draft.draft.bindings.hive.showNegativeVoteAction, true);
  assert.equal(typeof draft.draft.voice.terms.downvote_hive, 'string');
  assert.ok(draft.manualPaths.includes('bindings.hive.showNegativeVoteAction'));
  assert.notEqual(store.publicSnapshot('northline-hall').draft.bindings.hive.showNegativeVoteAction, true);

  await request(app)
    .post('/candidate-c/studio/northline-hall/participation')
    .set('HX-Request', 'true')
    .type('form')
    .send({
      ...tokens(store, 'northline-hall'),
      showNegativeVoteAction: 'hide',
    })
    .expect(200);

  assert.equal(store.snapshot('northline-hall').draft.bindings.hive.showNegativeVoteAction, false);
});

test('participation setting rejects ambiguous values instead of inventing a policy', async () => {
  const { app, store } = appFixture();
  await request(app)
    .post('/candidate-c/studio/northline-hall/participation')
    .type('form')
    .send({
      ...tokens(store, 'northline-hall'),
      showNegativeVoteAction: 'maybe',
    })
    .expect(400)
    .expect(/Choose whether HiVenues should show a negative-vote action/);
});
