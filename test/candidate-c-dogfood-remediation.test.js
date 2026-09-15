'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const { buildCandidateCHostFromInput } = require('../src/candidate-c/admission');
const { createDogfoodApp } = require('../src/candidate-c/dogfood-app');
const { ProvisioningFileCandidateCStore } = require('../src/candidate-c/provisioning-file-store');

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl9sAAAAASUVORK5CYII=', 'base64');

function tempRuntime(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-remediation-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const statePath = path.join(root, 'state.json');
  const mediaRoot = path.join(root, 'media');
  const store = new ProvisioningFileCandidateCStore({ statePath, mediaRoot });
  const app = createDogfoodApp({ store });
  return { root, statePath, mediaRoot, store, app };
}

function tokens(store, slug) {
  const snapshot = store.snapshot(slug);
  return { expectedRevision: snapshot.revision, expectedDraftDigest: snapshot.draftDigest };
}

function freshHostInput() {
  return {
    displayName: 'Remediation House',
    archetype: 'neighborhood place',
    timezone: 'America/Los_Angeles',
    presenceMode: 'physical',
    presenceLabel: 'Reno, Nevada · open daily',
    address: '111 Example Street, Reno, NV 89501',
    tagline: 'A real place, plainly told.',
    summary: 'A truthful zero-event host used to prove ordinary post-creation authoring.',
    contact: '(775) 324-7827',
    purpose: 'Give visitors a useful and truthful front door.',
    presenceMaterial: 'Warm light, real photography, direct language and local character.',
    direction: 'poster',
    participation: 'Plan a visit and understand the place before arriving.',
    activityTitle: '', activityDescription: '', activityStartsLocal: '', activityEndsLocal: '',
  };
}

test('dogfood remediation: visitor-visible content stays draft-only until an explicit Release and survives restart', async (t) => {
  const { statePath, mediaRoot, store, app } = tempRuntime(t);
  const slug = 'harbor-and-hearth';
  const beforeLive = store.publicSnapshot(slug);
  const beforeDraft = store.snapshot(slug);

  await request(app).post(`/candidate-c/studio/${slug}/content`).type('form').send({
    ...tokens(store, slug),
    displayName: 'Harbor & Hearth Reno',
    archetype: 'neighborhood dining room',
    summary: 'Edited visitor summary.',
    presenceLabel: 'Reno · evenings',
    address: '111 Test Street, Reno, NV 89501',
    contact: '(775) 324-7827',
    purpose: 'Edited public story purpose.',
    presenceMaterial: 'Edited visitor-facing atmosphere copy.',
    participation: 'Call or come by.',
  }).expect(303);

  const draft = store.snapshot(slug);
  assert.equal(draft.draft.identity.slug, beforeDraft.draft.identity.slug, 'public rename must not mutate stable host URL identity');
  assert.equal(draft.draft.identity.displayName, 'Harbor & Hearth Reno');
  assert.equal(draft.draft.facts.summary, 'Edited visitor summary.');
  assert.equal(draft.draft.facts.contact, '(775) 324-7827');
  assert.equal(draft.draft.intent.presenceMaterial, 'Edited visitor-facing atmosphere copy.');
  assert.equal(store.publicSnapshot(slug).draft.facts.summary, beforeLive.draft.facts.summary, 'live site changed before Release');

  const restartedBeforeRelease = new ProvisioningFileCandidateCStore({ statePath, mediaRoot });
  assert.equal(restartedBeforeRelease.snapshot(slug).draft.facts.summary, 'Edited visitor summary.');
  assert.equal(restartedBeforeRelease.publicSnapshot(slug).draft.facts.summary, beforeLive.draft.facts.summary);

  const released = restartedBeforeRelease.createRelease(slug, restartedBeforeRelease.snapshot(slug).revision, restartedBeforeRelease.snapshot(slug).draftDigest);
  assert.equal(released.ok, true);
  assert.equal(restartedBeforeRelease.publicSnapshot(slug).draft.facts.summary, 'Edited visitor summary.');
  assert.deepEqual(restartedBeforeRelease.diagnostics().external, {
    hiveRpcAttempts: 0, hiveWrites: 0, providerWrites: 0, payments: 0, signingAttempts: 0, deployments: 0,
  });
});

test('dogfood remediation: zero-event host can add an Activity and Offering later without developer intervention', async (t) => {
  const { store, app } = tempRuntime(t);
  const built = buildCandidateCHostFromInput(freshHostInput(), { randomUUID: () => '33333333-3333-4333-8333-333333333333' });
  assert.equal(built.ok, true);
  assert.equal(store.createHost(built.graph).ok, true);
  const slug = built.graph.identity.slug;
  assert.equal(store.snapshot(slug).draft.activities.length, 0);
  assert.equal(store.snapshot(slug).draft.offers.length, 0);

  await request(app).post(`/candidate-c/studio/${slug}/activity/new`).type('form').send({
    ...tokens(store, slug),
    title: 'Qualification gathering',
    description: 'A bounded synthetic activity used only to prove the add-later authoring path.',
    startsLocal: '2026-10-10T18:00',
    endsLocal: '2026-10-10T20:00',
  }).expect(303);
  assert.equal(store.snapshot(slug).draft.activities.length, 1);
  assert.equal(store.snapshot(slug).draft.activities[0].presence.address, freshHostInput().address);

  await request(app).post(`/candidate-c/studio/${slug}/offer/new`).type('form').send({
    ...tokens(store, slug),
    title: 'House information',
    summary: 'A truthful later-added offering record.',
    category: 'At the place',
    price: '',
  }).expect(303);
  assert.equal(store.snapshot(slug).draft.offers.length, 1);
  assert.equal(store.snapshot(slug).draft.offers[0].title, 'House information');
});

test('dogfood remediation: local image import derives bytes, keeps hero/logo roles separate, rejects stale authority and survives restart', async (t) => {
  const { statePath, mediaRoot, store, app } = tempRuntime(t);
  const slug = 'harbor-and-hearth';
  const initial = store.snapshot(slug);
  const heroId = initial.draft.media[0].id;

  await request(app).post(`/candidate-c/studio/${slug}/media-import`)
    .field('expectedRevision', String(initial.revision))
    .field('expectedDraftDigest', initial.draftDigest)
    .field('role', 'hero')
    .field('alt', 'Owner-supplied one-pixel qualification image')
    .field('caption', 'Qualification image')
    .attach('image', PNG_1X1, { filename: 'venue.png', contentType: 'image/png' })
    .expect(303);

  const heroSnapshot = store.snapshot(slug);
  const hero = heroSnapshot.draft.media.find((item) => item.id === heroId);
  assert.equal(hero.kind, 'image');
  assert.equal(hero.asset.mime, 'image/png');
  assert.equal(hero.asset.width, 1);
  assert.equal(hero.asset.height, 1);
  assert.equal(hero.asset.bytes, PNG_1X1.length);
  assert.match(hero.asset.sha256, /^[a-f0-9]{64}$/);
  assert.match(hero.asset.path, /^\/candidate-c\/media\/local\/harbor-and-hearth\/[a-f0-9]{24}\.png$/);
  assert.equal(fs.existsSync(path.join(mediaRoot, slug, path.basename(hero.asset.path))), true);

  const filesAfterHero = fs.readdirSync(path.join(mediaRoot, slug));
  await request(app).post(`/candidate-c/studio/${slug}/media-import`)
    .field('expectedRevision', String(initial.revision))
    .field('expectedDraftDigest', initial.draftDigest)
    .field('role', 'hero')
    .field('alt', 'Stale import')
    .attach('image', PNG_1X1, { filename: 'stale.png', contentType: 'image/png' })
    .expect(409);
  assert.deepEqual(fs.readdirSync(path.join(mediaRoot, slug)), filesAfterHero, 'stale media import left a new file behind');

  await request(app).post(`/candidate-c/studio/${slug}/media-import`)
    .field('expectedRevision', String(heroSnapshot.revision))
    .field('expectedDraftDigest', heroSnapshot.draftDigest)
    .field('role', 'logo')
    .field('alt', 'Official qualification logo')
    .field('caption', 'Owner-supplied logo')
    .attach('image', PNG_1X1, { filename: 'logo.png', contentType: 'image/png' })
    .expect(303);

  const withLogo = store.snapshot(slug);
  const logo = withLogo.draft.media.find((item) => item.id === `media-${slug}-logo`);
  assert(logo);
  assert.equal(logo.asset.sha256, hero.asset.sha256);
  assert.equal(withLogo.draft.media.find((item) => item.id === heroId).asset.sha256, hero.asset.sha256, 'logo import replaced hero role');

  const restarted = new ProvisioningFileCandidateCStore({ statePath, mediaRoot });
  assert.equal(restarted.snapshot(slug).draft.media.find((item) => item.id === heroId).asset.sha256, hero.asset.sha256);
  assert.equal(restarted.snapshot(slug).draft.media.find((item) => item.id === `media-${slug}-logo`).asset.sha256, hero.asset.sha256);
  assert.deepEqual(restarted.diagnostics().external, {
    hiveRpcAttempts: 0, hiveWrites: 0, providerWrites: 0, payments: 0, signingAttempts: 0, deployments: 0,
  });
});

test('dogfood remediation: Studio exposes complete draft preview, mobile review and ordinary empty-state authoring paths', async (t) => {
  const { store, app } = tempRuntime(t);
  const built = buildCandidateCHostFromInput(freshHostInput(), { randomUUID: () => '44444444-4444-4444-8444-444444444444' });
  assert.equal(built.ok, true);
  assert.equal(store.createHost(built.graph).ok, true);
  const slug = built.graph.identity.slug;

  const studio = await request(app).get(`/candidate-c/studio/${slug}`).expect(200);
  assert.match(studio.text, /Site preview · Poster room/);
  assert.match(studio.text, /Content &amp; visit/);
  assert.match(studio.text, /\+ Add activity/);
  assert.match(studio.text, /\+ Add offering/);
  assert.match(studio.text, /Import media/);
  assert.match(studio.text, /Complete visitor page/);
  assert.match(studio.text, /Mobile · 390px/);
  assert.match(studio.text, new RegExp(`/candidate-c/studio/${slug}/preview\\?r=`));

  const draftPreview = await request(app).get(`/candidate-c/studio/${slug}/preview`).expect(200);
  assert.match(draftPreview.text, /A truthful zero-event host/);
  assert.doesNotMatch(draftPreview.text, /Deterministic HiVenues bootstrap artwork derived/);
});
