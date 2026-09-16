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
const { contactFor } = require('../src/candidate-c/present');

function input(overrides = {}) {
  return {
    displayName: 'Truthful Bar',
    archetype: 'neighborhood bar',
    timezone: 'America/Los_Angeles',
    presenceMode: 'physical',
    presenceLabel: 'Reno, Nevada · open daily',
    address: '111 Example Street, Reno, NV 89501',
    tagline: 'A neighborhood place with a real local atmosphere.',
    summary: 'A truthful fresh host with only the facts the operator actually has.',
    contact: 'https://example.com/',
    purpose: 'Give visitors a trustworthy front door for the place.',
    presenceMaterial: 'Real venue photography, dark surfaces, warm light, and direct language.',
    direction: 'hospitality',
    participation: 'Plan a visit and see what the place is about.',
    activityTitle: '',
    activityDescription: '',
    activityStartsLocal: '',
    activityEndsLocal: '',
    ...overrides,
  };
}

function tempState(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-truthful-host-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, 'state.json');
}

test('fresh-host admission permits a truthful zero-activity initial state', () => {
  const result = buildCandidateCHostFromInput(input(), { randomUUID: () => '22222222-2222-4222-8222-222222222222' });
  assert.equal(result.ok, true);
  assert.equal(result.graph.activities.length, 0);
  assert.equal(result.graph.facts.contact, 'https://example.com/');
  assert.equal(result.graph.media.length, 1);
});

test('optional activity is all-or-none and refuses partial fabricated placeholders', () => {
  const partial = buildCandidateCHostFromInput(input({ activityTitle: 'Unverified event' }));
  assert.equal(partial.ok, false);
  assert.equal(partial.reason, 'INVALID_HOST_INPUT');
  assert(partial.fields.some((field) => field.path === 'activityDescription'));
  assert(partial.fields.some((field) => field.path === 'activityStartsLocal'));
  assert(partial.fields.some((field) => field.path === 'activityEndsLocal'));
});

test('contact rendering preserves email, phone, web, and plain-text consequences', () => {
  assert.deepEqual(contactFor('hello@example.com'), { label: 'hello@example.com', href: 'mailto:hello@example.com', kind: 'email' });
  assert.deepEqual(contactFor('(775) 324-7827'), { label: '(775) 324-7827', href: 'tel:7753247827', kind: 'phone' });
  assert.deepEqual(contactFor('https://example.com/'), { label: 'https://example.com/', href: 'https://example.com/', kind: 'web' });
  assert.deepEqual(contactFor('Front desk'), { label: 'Front desk', href: null, kind: 'text' });
});

test('fresh host stays working-only across restart until an explicit first Release', async (t) => {
  const statePath = tempState(t);
  const store = new ProvisioningFileCandidateCStore({ statePath });
  const app = createDogfoodApp({ store });

  const created = await request(app).post('/candidate-c/new').type('form').send(input()).expect(303);
  assert.equal(created.headers.location, '/candidate-c/studio/truthful-bar?created=1');

  const studio = await request(app).get(created.headers.location).expect(200);
  assert.match(studio.text, /Nothing is live yet/);
  await request(app).get('/candidate-c/studio/truthful-bar/preview').expect(200).expect(/Truthful Bar/);
  await request(app).get('/candidate-c/truthful-bar').expect(404);
  await request(app).get('/candidate-c/studio/truthful-bar/urgent').expect(409);
  const publicIndex = await request(app).get('/candidate-c/').expect(200);
  assert.doesNotMatch(publicIndex.text, /Truthful Bar/);

  const beforeRestart = store.snapshot('truthful-bar');
  assert.equal(beforeRestart.draft.activities.length, 0);
  assert.deepEqual(beforeRestart.releases, []);
  assert.equal(beforeRestart.liveReleaseId, null);
  assert.equal(store.publicSnapshot('truthful-bar'), null);

  const restarted = new ProvisioningFileCandidateCStore({ statePath });
  const afterRestart = restarted.snapshot('truthful-bar');
  assert.equal(afterRestart.draft.activities.length, 0);
  assert.equal(afterRestart.draft.facts.contact, 'https://example.com/');
  assert.deepEqual(afterRestart.releases, []);
  assert.equal(afterRestart.liveReleaseId, null);
  assert.equal(restarted.publicSnapshot('truthful-bar'), null);

  const restartedApp = createDogfoodApp({ store: restarted });
  await request(restartedApp)
    .post('/candidate-c/studio/truthful-bar/release')
    .type('form')
    .send({
      expectedRevision: afterRestart.revision,
      expectedDraftDigest: afterRestart.draftDigest,
    })
    .expect(303);

  const released = restarted.snapshot('truthful-bar');
  assert.equal(released.releases.length, 1);
  assert.equal(released.releases[0].kind, 'full');
  assert.match(released.releases[0].id, /^release-1-/);
  assert.equal(released.liveReleaseId, released.releases[0].id);

  const publicPage = await request(restartedApp).get('/candidate-c/truthful-bar').expect(200);
  assert.match(publicPage.text, /Truthful Bar/);
  assert.match(publicPage.text, /href="https:\/\/example\.com\/"/);
  assert.doesNotMatch(publicPage.text, /mailto:https:/);
  assert.doesNotMatch(publicPage.text, /What.s on|NEXT|CURRENT \/|Unverified event/i);

  const releasedIndex = await request(restartedApp).get('/candidate-c/').expect(200);
  assert.match(releasedIndex.text, /Truthful Bar/);

  const secondRestart = new ProvisioningFileCandidateCStore({ statePath });
  const persistedRelease = secondRestart.snapshot('truthful-bar');
  assert.equal(persistedRelease.releases.length, 1);
  assert.equal(secondRestart.publicSnapshot('truthful-bar').draft.facts.contact, 'https://example.com/');
});

test('durable state rejects mixed unpublished/live publication pointers', async (t) => {
  const statePath = tempState(t);
  const store = new ProvisioningFileCandidateCStore({ statePath });
  const app = createDogfoodApp({ store });
  await request(app).post('/candidate-c/new').type('form').send(input()).expect(303);

  const envelope = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const workspace = envelope.state.workspaces.find((item) => item.slug === 'truthful-bar');
  assert(workspace);
  assert.deepEqual(workspace.releases, []);
  assert.equal(workspace.liveReleaseId, null);
  workspace.liveReleaseId = 'release-that-does-not-exist';
  fs.writeFileSync(statePath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');

  assert.throws(
    () => new ProvisioningFileCandidateCStore({ statePath }).snapshot('truthful-bar'),
    (error) => error.code === 'CANDIDATE_C_INVALID_PERSISTED_STATE'
  );
});
