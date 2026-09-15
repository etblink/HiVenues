'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const { createDogfoodApp } = require('../src/candidate-c/dogfood-app');
const { MAX_MULTIPART_BYTES } = require('../src/candidate-c/local-media');
const { contactFor } = require('../src/candidate-c/present');
const { ProvisioningFileCandidateCStore } = require('../src/candidate-c/provisioning-file-store');

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl9sAAAAASUVORK5CYII=', 'base64');

function runtime(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-astra-adversarial-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const store = new ProvisioningFileCandidateCStore({ statePath: path.join(root, 'state.json'), mediaRoot: path.join(root, 'media') });
  return { store, app: createDogfoodApp({ store }) };
}

function tokens(store, slug) {
  const snapshot = store.snapshot(slug);
  return { expectedRevision: snapshot.revision, expectedDraftDigest: snapshot.draftDigest };
}

function contentPayload(store, slug, contact) {
  const graph = store.snapshot(slug).draft;
  return {
    ...tokens(store, slug),
    displayName: graph.identity.displayName,
    archetype: graph.identity.archetype,
    summary: graph.facts.summary,
    presenceLabel: graph.facts.presence.label,
    address: graph.facts.presence.address || '',
    contact,
    purpose: graph.intent.purpose,
    presenceMaterial: graph.intent.presenceMaterial,
    participation: graph.intent.participation,
  };
}

test('Astra beta adversarial: Quick and deep Contact accept the same four public consequence classes', async (t) => {
  const { store, app } = runtime(t);
  const slug = 'harbor-and-hearth';
  const cases = [
    ['operator@example.test', { kind: 'email', href: 'mailto:operator@example.test' }],
    ['(702) 555-0199', { kind: 'phone', href: 'tel:7025550199' }],
    ['https://contact.example.test/', { kind: 'web', href: 'https://contact.example.test/' }],
    ['Ask at the front desk', { kind: 'text', href: null }],
  ];

  for (const [value, expected] of cases) {
    await request(app)
      .post(`/candidate-c/studio/${slug}/connect`)
      .type('form')
      .send({ ...tokens(store, slug), contact: value })
      .expect(303);
    assert.equal(store.snapshot(slug).draft.facts.contact, value);
    assert.deepEqual({ kind: contactFor(value).kind, href: contactFor(value).href }, expected);

    await request(app)
      .post(`/candidate-c/studio/${slug}/content`)
      .type('form')
      .send(contentPayload(store, slug, value))
      .expect(303);
    assert.equal(store.snapshot(slug).draft.facts.contact, value);
  }
});

test('Astra beta adversarial: cancelled Hospitality state cannot present as NEXT and closes RSVP', async (t) => {
  const { store, app } = runtime(t);
  const slug = 'harbor-and-hearth';
  let state = store.snapshot(slug);
  const activityId = state.draft.activities[0].id;
  assert.equal(store.draftMutation(slug, state.revision, state.draftDigest, (inner) => inner.commit(
    slug,
    state.revision,
    'cancelled-hospitality-proof',
    (draft) => {
      draft.presentation.compositionFamily = 'hospitality';
      draft.intent.direction = 'hospitality';
      const activity = draft.activities.find((item) => item.id === activityId);
      activity.lifecycle = 'cancelled';
      activity.statusNote = 'Synthetic cancellation proof.';
    },
    [`activities.${activityId}.lifecycle`, `activities.${activityId}.statusNote`],
    state.draftDigest
  )).ok, true);
  state = store.snapshot(slug);
  assert.equal(store.createRelease(slug, state.revision, state.draftDigest).ok, true);

  const home = await request(app).get(`/candidate-c/${slug}`).expect(200);
  assert.match(home.text, /data-activity-status="cancelled"/);
  assert.match(home.text, /<strong>Cancelled<\/strong>/);
  assert.doesNotMatch(home.text, />NEXT</);
  const activity = store.publicSnapshot(slug).draft.activities[0];
  const detail = await request(app).get(`/candidate-c/${slug}/activities/${activity.slug}`).expect(200);
  assert.match(detail.text, /data-rsvp-closed/);
  assert.match(detail.text, /RSVPs are closed/);
});

test('Astra beta adversarial: urgent execution from a superseded live Release fails closed', (t) => {
  const { store } = runtime(t);
  const slug = 'northline-hall';
  const activity = store.publicSnapshot(slug).draft.activities[0];
  const operationResult = store.proposeUrgent(slug, {
    kind: 'activity-status',
    activityId: activity.id,
    lifecycle: 'cancelled',
    statusNote: 'Synthetic stale urgent proof.',
  });
  assert.equal(operationResult.ok, true);
  const operation = operationResult.operation;

  let state = store.snapshot(slug);
  assert.equal(store.editTagline(slug, 'Advance live before stale urgent executes.', state.revision, state.draftDigest).ok, true);
  state = store.snapshot(slug);
  assert.equal(store.createRelease(slug, state.revision, state.draftDigest).ok, true);
  const advancedLive = store.publicSnapshot(slug).liveReleaseId;
  assert.notEqual(advancedLive, operation.baseReleaseId);

  state = store.snapshot(slug);
  const stale = store.executeUrgent(slug, operation.id, operation.baseReleaseId, state.revision, state.draftDigest);
  assert.equal(stale.ok, false);
  assert.equal(stale.reason, 'STALE_LIVE_RELEASE');
  assert.equal(store.publicSnapshot(slug).liveReleaseId, advancedLive);
  assert.equal(store.publicSnapshot(slug).draft.activities.find((item) => item.id === activity.id).lifecycle, 'scheduled');
});

test('Astra beta adversarial: active durable media root serves imported bytes before and after a safe oversized rejection', async (t) => {
  const { store, app } = runtime(t);
  const slug = 'harbor-and-hearth';
  let state = store.snapshot(slug);

  await request(app)
    .post(`/candidate-c/studio/${slug}/media-import`)
    .field('expectedRevision', String(state.revision))
    .field('expectedDraftDigest', state.draftDigest)
    .field('role', 'hero')
    .field('alt', 'Synthetic durable media proof')
    .attach('image', PNG_1X1, { filename: 'durable.png', contentType: 'image/png' })
    .expect(303);

  state = store.snapshot(slug);
  const hero = state.draft.media.find((item) => item.id !== `media-${slug}-logo`);
  assert(hero.asset?.path);
  const served = await request(app).get(hero.asset.path).expect(200).expect('Content-Type', /image\/png/);
  assert.equal(Buffer.compare(served.body, PNG_1X1), 0);

  const beforeRejected = store.snapshot(slug);
  await request(app)
    .post(`/candidate-c/studio/${slug}/media-import`)
    .field('expectedRevision', String(beforeRejected.revision))
    .field('expectedDraftDigest', beforeRejected.draftDigest)
    .field('role', 'hero')
    .field('alt', 'Oversized durable media proof')
    .attach('image', Buffer.alloc(MAX_MULTIPART_BYTES + 1024, 0x41), { filename: 'oversized.png', contentType: 'image/png' })
    .expect(413)
    .expect(/larger than the 8 MiB limit/i);

  assert.equal(store.snapshot(slug).revision, beforeRejected.revision);
  assert.equal(store.snapshot(slug).draftDigest, beforeRejected.draftDigest);
  const servedAfter = await request(app).get(hero.asset.path).expect(200).expect('Content-Type', /image\/png/);
  assert.equal(Buffer.compare(servedAfter.body, PNG_1X1), 0);
});
