'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const request = require('supertest');

const { CandidateCStore } = require('../src/candidate-c/store');
const { createCandidateCRouter } = require('../src/candidate-c/router');

function fixture() {
  const store = new CandidateCStore({ now: () => Date.parse('2026-09-18T16:00:00Z') });
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

test('value recipient is an optional HostGraph binding and historical hosts remain byte-stable until edited', () => {
  const { store } = fixture();
  const snapshot = store.snapshot('northline-hall');
  const live = store.publicSnapshot('northline-hall');

  assert.equal(Object.hasOwn(snapshot.draft.bindings.hive, 'valueRecipient'), false);
  assert.equal(Object.hasOwn(live.draft.bindings.hive, 'valueRecipient'), false);
  assert.equal(snapshot.draftDigest, live.draftDigest);
});

test('Studio value-recipient edit is Working-only until Release and creates host-native support Voice', async () => {
  const { app, store } = fixture();
  const slug = 'northline-hall';
  const beforeLive = store.publicSnapshot(slug);

  const response = await request(app)
    .post('/candidate-c/studio/' + slug + '/value-recipient')
    .set('HX-Request', 'true')
    .type('form')
    .send({
      ...tokens(store, slug),
      valueRecipient: 'northline-support',
    })
    .expect(200);

  assert.match(response.text, /northline-support/);
  assert.match(response.text, /separate money-recipient role/i);

  const working = store.snapshot(slug);
  assert.equal(working.draft.bindings.hive.valueRecipient, 'northline-support');
  assert.equal(working.draft.voice.terms.support_hive, 'Support the room');

  const stillLive = store.publicSnapshot(slug);
  assert.equal(stillLive.draftDigest, beforeLive.draftDigest);
  assert.equal(Object.hasOwn(stillLive.draft.bindings.hive, 'valueRecipient'), false);
  assert.equal(Object.hasOwn(stillLive.draft.voice.terms, 'support_hive'), false);

  const released = store.createRelease(slug, working.revision, working.draftDigest);
  assert.equal(released.ok, true);
  const live = store.publicSnapshot(slug);
  assert.equal(live.draft.bindings.hive.valueRecipient, 'northline-support');
  assert.equal(live.draft.voice.terms.support_hive, 'Support the room');
});

test('clearing value recipient disables the binding in Working without silently changing Live', async () => {
  const { app, store } = fixture();
  const slug = 'northline-hall';

  await request(app)
    .post('/candidate-c/studio/' + slug + '/value-recipient')
    .set('HX-Request', 'true')
    .type('form')
    .send({ ...tokens(store, slug), valueRecipient: 'northline-support' })
    .expect(200);
  let working = store.snapshot(slug);
  assert.equal(store.createRelease(slug, working.revision, working.draftDigest).ok, true);

  await request(app)
    .post('/candidate-c/studio/' + slug + '/value-recipient')
    .set('HX-Request', 'true')
    .type('form')
    .send({ ...tokens(store, slug), valueRecipient: '' })
    .expect(200);

  working = store.snapshot(slug);
  assert.equal(working.draft.bindings.hive.valueRecipient, null);
  assert.equal(store.publicSnapshot(slug).draft.bindings.hive.valueRecipient, 'northline-support');
});

test('invalid recipient is rejected without any Working or Live mutation', async () => {
  const { app, store } = fixture();
  const slug = 'northline-hall';
  const beforeWorking = JSON.stringify(store.snapshot(slug));
  const beforeLive = JSON.stringify(store.publicSnapshot(slug));

  const response = await request(app)
    .post('/candidate-c/studio/' + slug + '/value-recipient')
    .set('HX-Request', 'true')
    .type('form')
    .send({ ...tokens(store, slug), valueRecipient: 'NOT VALID!!!' })
    .expect(400);

  assert.match(response.text, /Value recipient is invalid/);
  assert.equal(JSON.stringify(store.snapshot(slug)), beforeWorking);
  assert.equal(JSON.stringify(store.publicSnapshot(slug)), beforeLive);
});

test('Tranche A configuration never creates a public support transfer control', async () => {
  const { app, store } = fixture();
  const slug = 'northline-hall';

  await request(app)
    .post('/candidate-c/studio/' + slug + '/value-recipient')
    .set('HX-Request', 'true')
    .type('form')
    .send({ ...tokens(store, slug), valueRecipient: 'northline-support' })
    .expect(200);

  const working = store.snapshot(slug);
  assert.equal(store.createRelease(slug, working.revision, working.draftDigest).ok, true);

  const publicPage = await request(app)
    .get('/candidate-c/' + slug)
    .expect(200);

  assert.doesNotMatch(publicPage.text, /data-hivenues-support/);
  assert.doesNotMatch(publicPage.text, /Support the room/);
  assert.doesNotMatch(publicPage.text, /claim_reward_balance|\btransfer\b/i);
});
