'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const express = require('express');
const request = require('supertest');
const { HiVenuesStore } = require('../src/product/store');
const { FileHiVenuesStore } = require('../src/product/file-store');
const { createHiVenuesRouter } = require('../src/product/router');

function appFixture(store = new HiVenuesStore({ now: () => Date.parse('2026-09-14T23:45:00Z') })) {
  const app = express();
  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('view engine', 'ejs');
  app.use(express.urlencoded({ extended: false }));
  app.use('/hivenues', createHiVenuesRouter({ store }));
  return { app, store };
}

function tokens(store, slug) {
  const snapshot = store.snapshot(slug);
  return { expectedRevision: snapshot.revision, expectedDraftDigest: snapshot.draftDigest };
}

function assertExternalZero(store) {
  assert.deepEqual(store.diagnostics().external, {
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    deployments: 0,
  });
}

test('Workstream D Studio exposes Offers, Look, Voice and Participation without internal operator jargon', async () => {
  const { app, store } = appFixture();
  const studio = await request(app).get('/hivenues/studio/harbor-and-hearth').expect(200);
  assert.match(studio.text, />Offers</);
  assert.match(studio.text, />Look</);
  assert.match(studio.text, />Voice</);
  assert.match(studio.text, />Participation</);
  assert.match(studio.text, /resource=connect/);
  assert.match(studio.text, /id="draft-status"[^>]*data-revision="1"/);
  assert.match(studio.text, /class="cc-studio-commandbar" aria-label="Shape your place"/);
  assert.match(studio.text, /class="cc-studio-stage" aria-label="Your place"/);
  assert.match(studio.text, /id="hivenuesanvas-slot"/);
  assert.doesNotMatch(studio.text, /Real rendered canvas|Draft r1|canonical object|server revision/i);

  const voice = await request(app).get('/hivenues/studio/harbor-and-hearth/inspect?resource=voice').expect(200);
  for (const term of Object.values(store.snapshot('harbor-and-hearth').draft.voice.terms)) assert.match(voice.text, new RegExp(term));
  assert.match(voice.text, /what the action actually does stays explicit/i);
  assertExternalZero(store);
});

test('Offer and Look edits use revision plus digest, update the canonical graph and keep live Release immutable', async () => {
  const { app, store } = appFixture();
  const initialPublic = store.publicSnapshot('harbor-and-hearth');
  const initialDigest = initialPublic.draftDigest;
  const offerId = 'offer-harbor-carrots-001';

  await request(app)
    .post('/hivenues/studio/harbor-and-hearth/offer')
    .set('HX-Request', 'true')
    .type('form')
    .send({
      ...tokens(store, 'harbor-and-hearth'),
      offerId,
      title: 'Coal-roasted carrots · ember glaze',
      summary: 'Cultured cream, hazelnut, preserved lemon, soft herbs, and ember glaze.',
      category: 'From the field',
      price: '$17',
    })
    .expect(200)
    .expect(/Coal-roasted carrots · ember glaze/)
    .expect(/id="hivenuesanvas-slot" hx-swap-oob="innerHTML"/);

  const afterOffer = store.snapshot('harbor-and-hearth');
  assert.equal(afterOffer.revision, 2);
  assert.equal(afterOffer.draft.offers[0].price, '$17');
  assert.ok(afterOffer.manualPaths.includes(`offers.${offerId}.title`));
  assert.equal(store.publicSnapshot('harbor-and-hearth').draftDigest, initialDigest);
  assert.equal(store.publicSnapshot('harbor-and-hearth').draft.offers[0].title, initialPublic.draft.offers[0].title);

  await request(app)
    .post('/hivenues/studio/harbor-and-hearth/look')
    .set('HX-Request', 'true')
    .type('form')
    .send({ ...tokens(store, 'harbor-and-hearth'), accent: '#244653' })
    .expect(200)
    .expect(/id="hivenuesanvas-slot" hx-swap-oob="innerHTML"/)
    .expect(/border-top:5px solid #244653/);
  assert.equal(store.snapshot('harbor-and-hearth').draft.presentation.accent, '#244653');

  await request(app)
    .post('/hivenues/studio/harbor-and-hearth/look')
    .set('HX-Request', 'true')
    .type('form')
    .send({ ...tokens(store, 'harbor-and-hearth'), accent: '#ffffff' })
    .expect(400)
    .expect(/INVALID_LOOK_ACCENT/);
  assertExternalZero(store);
});

test('Connect edits visitor contact only and cannot mutate Hive or media bindings', async () => {
  const { app, store } = appFixture();
  const before = store.snapshot('northline-hall');
  const bindings = structuredClone(before.draft.bindings);

  await request(app)
    .post('/hivenues/studio/northline-hall/connect')
    .set('HX-Request', 'true')
    .type('form')
    .send({ ...tokens(store, 'northline-hall'), contact: 'hello@northlinehall.example' })
    .expect(200)
    .expect(/hello@northlinehall\.example/);

  const after = store.snapshot('northline-hall');
  assert.equal(after.draft.facts.contact, 'hello@northlinehall.example');
  assert.deepEqual(after.draft.bindings, bindings);
  assert.ok(after.manualPaths.includes('facts.contact'));
  assertExternalZero(store);
});

test('durable D mutation rejects stale dual-token state and survives restart', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-hivenues-studio-d-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const statePath = path.join(directory, 'state.json');
  const store = new FileHiVenuesStore({ statePath, now: () => Date.parse('2026-09-14T23:45:00Z') });
  const { app } = appFixture(store);
  const before = store.snapshot('harbor-and-hearth');

  await request(app)
    .post('/hivenues/studio/harbor-and-hearth/connect')
    .set('HX-Request', 'true')
    .type('form')
    .send({ expectedRevision: before.revision, expectedDraftDigest: before.draftDigest, contact: 'tables@harbor.example' })
    .expect(200);

  await request(app)
    .post('/hivenues/studio/harbor-and-hearth/look')
    .set('HX-Request', 'true')
    .type('form')
    .send({ expectedRevision: before.revision, expectedDraftDigest: before.draftDigest, accent: '#244653' })
    .expect(409)
    .expect(/newer version exists/i);

  const restarted = new FileHiVenuesStore({ statePath });
  assert.equal(restarted.snapshot('harbor-and-hearth').draft.facts.contact, 'tables@harbor.example');
  assert.equal(restarted.snapshot('harbor-and-hearth').draft.presentation.accent, '#a65337');
  assertExternalZero(restarted);
});