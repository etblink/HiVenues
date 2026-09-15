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

test('operator can create and restart a zero-activity physical host with web contact without fake mailto output', async (t) => {
  const statePath = tempState(t);
  const store = new ProvisioningFileCandidateCStore({ statePath });
  const app = createDogfoodApp({ store });

  const created = await request(app).post('/candidate-c/new').type('form').send(input()).expect(303);
  assert.equal(created.headers.location, '/candidate-c/studio/truthful-bar?created=1');

  const publicPage = await request(app).get('/candidate-c/truthful-bar').expect(200);
  assert.match(publicPage.text, /Truthful Bar/);
  assert.match(publicPage.text, /href="https:\/\/example\.com\/"/);
  assert.doesNotMatch(publicPage.text, /mailto:https:/);
  assert.doesNotMatch(publicPage.text, /What.s on|NEXT|CURRENT \/|Unverified event/i);

  const snapshot = store.snapshot('truthful-bar');
  assert.equal(snapshot.draft.activities.length, 0);
  assert.equal(snapshot.releases.length, 1);
  assert.equal(snapshot.releases[0].kind, 'full');

  const restarted = new ProvisioningFileCandidateCStore({ statePath });
  assert.equal(restarted.snapshot('truthful-bar').draft.activities.length, 0);
  assert.equal(restarted.snapshot('truthful-bar').draft.facts.contact, 'https://example.com/');
});
