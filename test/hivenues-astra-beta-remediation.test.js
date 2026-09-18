'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const { createHiVenuesApp } = require('../src/product/app');
const { MAX_MULTIPART_BYTES } = require('../src/product/local-media');
const { ProvisioningFileHiVenuesStore } = require('../src/product/provisioning-file-store');

function runtime(t, provenance = null) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-astra-beta-remediation-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const statePath = path.join(root, 'state.json');
  const mediaRoot = path.join(root, 'media');
  const store = new ProvisioningFileHiVenuesStore({ statePath, mediaRoot });
  const app = createHiVenuesApp({ store, provenance });
  return { root, statePath, mediaRoot, store, app };
}

function tokens(store, slug) {
  const snapshot = store.snapshot(slug);
  return { expectedRevision: snapshot.revision, expectedDraftDigest: snapshot.draftDigest };
}

function mutate(store, slug, label, mutator, manualPaths = []) {
  const state = store.snapshot(slug);
  return store.draftMutation(slug, state.revision, state.draftDigest, (inner) => (
    inner.commit(slug, state.revision, label, mutator, manualPaths, state.draftDigest)
  ));
}

test('Astra beta remediation: existing Activity can be rescheduled without identity change and stays draft-only until Release', async (t) => {
  const { store, app } = runtime(t);
  const slug = 'northline-hall';
  const beforeDraft = store.snapshot(slug);
  const activity = beforeDraft.draft.activities[0];
  const beforeLive = store.publicSnapshot(slug).draft.activities.find((item) => item.id === activity.id);
  const beforeIdentity = { id: activity.id, slug: activity.slug, mediaId: activity.mediaId, publicActions: structuredClone(activity.publicActions) };

  const schedulePage = await request(app)
    .get(`/hivenues/studio/${slug}/activity/${activity.id}/schedule`)
    .expect(200);
  assert.match(schedulePage.text, /Activity · schedule/);
  assert.match(schedulePage.text, new RegExp(beforeDraft.draft.identity.timezone.replace('/', '\\/')));

  await request(app)
    .post(`/hivenues/studio/${slug}/activity/${activity.id}/schedule`)
    .type('form')
    .send({
      ...tokens(store, slug),
      startsLocal: '2026-11-12T18:30',
      endsLocal: '2026-11-12T21:15',
    })
    .expect(303);

  const after = store.snapshot(slug);
  const edited = after.draft.activities.find((item) => item.id === activity.id);
  assert.equal(edited.id, beforeIdentity.id);
  assert.equal(edited.slug, beforeIdentity.slug);
  assert.equal(edited.mediaId, beforeIdentity.mediaId);
  assert.deepEqual(edited.publicActions, beforeIdentity.publicActions);
  assert.notEqual(edited.startsAt, beforeLive.startsAt);
  assert.equal(store.publicSnapshot(slug).draft.activities.find((item) => item.id === activity.id).startsAt, beforeLive.startsAt, 'schedule leaked live before Release');

  await request(app)
    .post(`/hivenues/studio/${slug}/release`)
    .type('form')
    .send(tokens(store, slug))
    .expect(303);
  const released = store.publicSnapshot(slug).draft.activities.find((item) => item.id === activity.id);
  assert.equal(released.startsAt, edited.startsAt);
  assert.equal(released.endsAt, edited.endsAt);

  const ics = await request(app)
    .get(`/hivenues/${slug}/activities/${activity.slug}/calendar.ics`)
    .expect(200);
  assert.match(ics.text, new RegExp(`DTSTART:${new Date(edited.startsAt).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`));
  assert.match(ics.text, new RegExp(`DTEND:${new Date(edited.endsAt).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`));
});

test('Astra beta remediation: invalid Activity reschedule preserves the current working schedule and explains the error', async (t) => {
  const { store, app } = runtime(t);
  const slug = 'northline-hall';
  const activity = store.snapshot(slug).draft.activities[0];
  const before = store.snapshot(slug);

  const response = await request(app)
    .post(`/hivenues/studio/${slug}/activity/${activity.id}/schedule`)
    .type('form')
    .send({
      ...tokens(store, slug),
      startsLocal: '2026-11-12T21:15',
      endsLocal: '2026-11-12T18:30',
    })
    .expect(400);
  assert.match(response.text, /End time must be after start time/);
  assert.equal(store.snapshot(slug).revision, before.revision);
  assert.equal(store.snapshot(slug).draftDigest, before.draftDigest);
});

test('Astra beta remediation: Poster, Editorial and Hospitality keep authored invitation and offer detail visible', async (t) => {
  const { store, app } = runtime(t);
  const slug = 'harbor-and-hearth';
  const marker = 'INVITATION-PARITY-269';
  const detail = '$29 beta detail';
  const category = 'Beta category';

  let state = store.snapshot(slug);
  let result = mutate(store, slug, 'beta-parity-fixture', (draft) => {
    draft.intent.participation = marker;
    if (!draft.offers.length) draft.offers.push({ id: 'offer-beta-269', title: 'Beta offering', summary: 'Beta summary' });
    draft.offers[0].category = category;
    draft.offers[0].price = detail;
  }, ['intent.participation', `offers.${state.draft.offers[0]?.id || 'offer-beta-269'}.category`, `offers.${state.draft.offers[0]?.id || 'offer-beta-269'}.price`]);
  assert.equal(result.ok, true);

  for (const family of ['poster', 'editorial', 'hospitality']) {
    result = mutate(store, slug, `direction-${family}`, (draft) => {
      draft.presentation.compositionFamily = family;
      draft.intent.direction = family;
    });
    assert.equal(result.ok, true);
    state = store.snapshot(slug);
    assert.equal(store.createRelease(slug, state.revision, state.draftDigest).ok, true);
    const publicPage = await request(app).get(`/hivenues/${slug}`).expect(200);
    assert.match(publicPage.text, new RegExp(marker), `${family} omitted authored participation`);
    assert.match(publicPage.text, new RegExp(category), `${family} omitted offer category`);
    assert.match(publicPage.text, /\$29 beta detail/, `${family} omitted offer detail`);
  }
});

test('Astra beta remediation: oversized multipart media becomes a safe 413 product response without draft mutation or stack leak', async (t) => {
  const { store, app } = runtime(t);
  const slug = 'harbor-and-hearth';
  const before = store.snapshot(slug);
  const huge = Buffer.alloc(MAX_MULTIPART_BYTES + 1024, 0x41);

  const response = await request(app)
    .post(`/hivenues/studio/${slug}/media-import`)
    .field('expectedRevision', String(before.revision))
    .field('expectedDraftDigest', before.draftDigest)
    .field('role', 'hero')
    .field('alt', 'Too large')
    .field('caption', 'Must not persist')
    .attach('image', huge, { filename: 'oversized.png', contentType: 'image/png' })
    .expect(413);

  assert.match(response.text, /larger than the 8 MiB limit/i);
  assert.match(response.text, /Choose a smaller JPEG or PNG/i);
  assert.doesNotMatch(response.text, /PayloadTooLargeError|node_modules|dogfood-app\.js|raw-body/i);
  assert.equal(store.snapshot(slug).revision, before.revision);
  assert.equal(store.snapshot(slug).draftDigest, before.draftDigest);
});

test('Astra beta remediation: Quick Connect accepts the same phone contact model as deep maintenance', async (t) => {
  const { store, app } = runtime(t);
  const slug = 'harbor-and-hearth';
  const inspector = await request(app)
    .get(`/hivenues/studio/${slug}/inspect?resource=connect`)
    .expect(200);
  assert.match(inspector.text, /<label for="cc-contact">Contact<\/label>/);
  assert.match(inspector.text, /type="text" name="contact"/);
  assert.doesNotMatch(inspector.text, /Contact email/);

  await request(app)
    .post(`/hivenues/studio/${slug}/connect`)
    .type('form')
    .send({ ...tokens(store, slug), contact: '(702) 555-0147' })
    .expect(303);
  assert.equal(store.snapshot(slug).draft.facts.contact, '(702) 555-0147');

  const state = store.snapshot(slug);
  assert.equal(store.createRelease(slug, state.revision, state.draftDigest).ok, true);
  const publicPage = await request(app).get(`/hivenues/${slug}`).expect(200);
  assert.match(publicPage.text, /href="tel:7025550147"/);
});

test('Astra beta remediation: dogfood build proof exposes only read-only HEAD/TREE provenance', async (t) => {
  const provenance = { commit: 'a'.repeat(40), tree: 'b'.repeat(40) };
  const { app } = runtime(t, provenance);
  const response = await request(app).get('/__dogfood/build').expect(200);
  assert.equal(response.headers['content-type'].startsWith('text/plain'), true);
  assert.match(response.text, new RegExp(`HEAD ${provenance.commit}`));
  assert.match(response.text, new RegExp(`TREE ${provenance.tree}`));
  assert.doesNotMatch(response.text, /state|secret|cookie/i);
});
