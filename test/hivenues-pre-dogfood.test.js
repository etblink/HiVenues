'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const { buildHiVenuesHostFromInput, localDateTimeToOffsetIso } = require('../src/product/admission');
const { createDogfoodApp, DOGFOOD_HOST, startDogfoodServer } = require('../src/product/dogfood-app');
const { ProvisioningFileHiVenuesStore } = require('../src/product/provisioning-file-store');
const { parseArgs } = require('../scripts/hivenues-dogfood');

function input(overrides = {}) {
  return {
    displayName: 'Dogfood House',
    archetype: 'neighborhood gathering place',
    timezone: 'America/Los_Angeles',
    presenceMode: 'physical',
    presenceLabel: 'Downtown Las Vegas · doors at 7 PM',
    address: '123 Example Street, Las Vegas, NV',
    tagline: 'A real place for a real night.',
    summary: 'A bounded operator-created host used to prove HiVenues fresh-host admission without source editing.',
    contact: 'hello@dogfood.example',
    purpose: 'Give people a trustworthy front door for the place and its next gathering.',
    presenceMaterial: 'Warm light, close tables, neighborhood scale, direct language.',
    direction: 'hospitality',
    participation: 'See what is happening, save a place, and keep the date.',
    activityTitle: 'Friday Gathering',
    activityDescription: 'An actual scheduled gathering represented through typed operator facts.',
    activityStartsLocal: '2026-09-18T19:30',
    activityEndsLocal: '2026-09-18T22:30',
    ...overrides,
  };
}

function tempState(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-hivenues-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return path.join(dir, 'state.json');
}

function build(raw = input()) {
  return buildHiVenuesHostFromInput(raw, { randomUUID: () => '11111111-1111-4111-8111-111111111111' });
}

test('typed admission derives a bounded canonical host and timezone offsets', () => {
  assert.equal(localDateTimeToOffsetIso('2026-09-18T19:30', 'America/Los_Angeles'), '2026-09-18T19:30:00-07:00');
  const result = build();
  assert.equal(result.ok, true);
  assert.equal(result.graph.identity.slug, 'dogfood-house');
  assert.match(result.graph.identity.hostId, /^host-dogfood-house-/);
  assert.equal(result.graph.bindings.hive.state, 'disconnected');
  assert.equal(result.graph.bindings.media.state, 'local');
  assert.equal(result.graph.activities.length, 1);
  assert.equal(result.graph.activities[0].startsAt, '2026-09-18T19:30:00-07:00');
  assert.equal(result.graph.activities[0].presence.mode, 'physical');
  assert.equal(result.graph.media[0].kind, 'bootstrap-art');
  assert.equal(result.graph.presentation.compositionFamily, 'hospitality');
});

test('admission rejects unknown authority, reserved slugs, malformed timezones and physical places without addresses', () => {
  assert.equal(build({ ...input(), bindings: { hive: { state: 'connected' } } }).ok, false);
  assert.equal(build(input({ displayName: 'Studio' })).reason, 'INVALID_HOST_SLUG');
  assert.equal(build(input({ timezone: 'Not/A_Timezone' })).ok, false);
  assert.equal(build(input({ address: '' })).ok, false);
});

test('fresh host provisioning is durable, collision-safe, and remains unpublished until explicit Release', (t) => {
  const statePath = tempState(t);
  const store = new ProvisioningFileHiVenuesStore({ statePath });
  const graph = build().graph;
  const created = store.createHost(graph);
  assert.equal(created.ok, true);
  assert.equal(created.snapshot.revision, 1);
  assert.deepEqual(created.snapshot.releases, []);
  assert.equal(created.snapshot.liveReleaseId, null);
  assert.equal(store.publicSnapshot('dogfood-house'), null);
  assert.deepEqual(store.diagnostics().external, {
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    deployments: 0,
  });

  const collision = store.createHost(build(input({ activityTitle: 'Another Night' })).graph);
  assert.equal(collision.ok, false);
  assert.equal(collision.reason, 'HOST_SLUG_EXISTS');

  const restarted = new ProvisioningFileHiVenuesStore({ statePath });
  const snapshot = restarted.snapshot('dogfood-house');
  assert(snapshot);
  assert.equal(snapshot.draft.facts.tagline, graph.facts.tagline);
  assert.equal(snapshot.draft.activities[0].title, 'Friday Gathering');
  assert.deepEqual(snapshot.releases, []);
  assert.equal(snapshot.liveReleaseId, null);
  assert.equal(restarted.publicSnapshot('dogfood-house'), null);

  const released = restarted.createRelease('dogfood-house', snapshot.revision, snapshot.draftDigest);
  assert.equal(released.ok, true);
  const live = restarted.snapshot('dogfood-house');
  assert.equal(live.releases.length, 1);
  assert.equal(live.releases[0].kind, 'full');
  assert.equal(live.liveReleaseId, live.releases[0].id);
  assert(restarted.publicSnapshot('dogfood-house'));
});

test('existing Workstream-E urgent release semantics operate after an explicit first Release and survive restart', (t) => {
  const statePath = tempState(t);
  const store = new ProvisioningFileHiVenuesStore({ statePath });
  const graph = build().graph;
  assert.equal(store.createHost(graph).ok, true);
  const unpublished = store.snapshot('dogfood-house');
  const firstRelease = store.createRelease('dogfood-house', unpublished.revision, unpublished.draftDigest);
  assert.equal(firstRelease.ok, true);
  const before = store.snapshot('dogfood-house');
  assert(before.liveReleaseId);

  const proposed = store.proposeUrgent('dogfood-house', {
    kind: 'activity-status',
    activityId: graph.activities[0].id,
    lifecycle: 'cancelled',
    statusNote: 'Cancelled for the dogfood provenance test.',
  });
  assert.equal(proposed.ok, true);
  const executed = store.executeUrgent(
    'dogfood-house',
    proposed.operation.id,
    before.liveReleaseId,
    before.revision,
    before.draftDigest
  );
  assert.equal(executed.ok, true);
  assert.equal(executed.release.kind, 'urgent');
  assert.equal(executed.release.baseReleaseId, before.liveReleaseId);
  assert.equal(executed.release.snapshot.activities[0].lifecycle, 'cancelled');
  assert.equal(executed.snapshot.draft.activities[0].lifecycle, 'cancelled');
  assert.equal(executed.snapshot.draft.facts.tagline, graph.facts.tagline);

  const restarted = new ProvisioningFileHiVenuesStore({ statePath });
  const live = restarted.publicSnapshot('dogfood-house');
  assert.equal(live.draft.activities[0].lifecycle, 'cancelled');
  assert.equal(live.releases.find((item) => item.id === live.liveReleaseId).kind, 'urgent');
});

test('operator router creates a working-only host, then serves it publicly after explicit Release', async (t) => {
  const store = new ProvisioningFileHiVenuesStore({ statePath: tempState(t) });
  const app = createDogfoodApp({ store });
  await request(app).get('/hivenues').expect(200).expect(/Create a place/);
  await request(app).get('/hivenues/new').expect(200).expect(/Start with the host, not a template/).expect(/Purpose/).expect(/Presence/).expect(/Direction/).expect(/Participation/);
  const created = await request(app).post('/hivenues/new').type('form').send(input()).expect(303);
  assert.equal(created.headers.location, '/hivenues/studio/dogfood-house?created=1');
  await request(app).get('/hivenues/studio/dogfood-house').expect(200).expect(/Dogfood House/).expect(/Here is your place/).expect(/Nothing is live yet/);
  await request(app).get('/hivenues/dogfood-house').expect(404);

  const working = store.snapshot('dogfood-house');
  await request(app)
    .post('/hivenues/studio/dogfood-house/release')
    .type('form')
    .send({ expectedRevision: working.revision, expectedDraftDigest: working.draftDigest })
    .expect(303);
  await request(app).get('/hivenues/dogfood-house').expect(200).expect(/Dogfood House/);

  await request(app).post('/hivenues/new').type('form').send(input()).expect(409).expect(/already exists/);
  await request(app).post('/hivenues/new').type('form').send({ ...input(), bindings: 'forbidden' }).expect(400);
});

test('public-ingress mode fails closed, issues a bounded session, rejects foreign-origin mutations, and never persists the secret', async (t) => {
  const statePath = tempState(t);
  const store = new ProvisioningFileHiVenuesStore({ statePath });
  const secret = 'dogfood-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const app = createDogfoodApp({ store, publicIngress: true, accessSecret: secret, secureCookie: false });
  const agent = request.agent(app);

  await agent.get('/hivenues').set('Host', 'dogfood.test').expect(303).expect('Location', '/__dogfood/access');
  await agent.post('/__dogfood/access')
    .set('Host', 'dogfood.test')
    .set('Origin', 'http://dogfood.test')
    .type('form').send({ accessSecret: 'wrong-secret' }).expect(401);
  const login = await agent.post('/__dogfood/access')
    .set('Host', 'dogfood.test')
    .set('Origin', 'http://dogfood.test')
    .type('form').send({ accessSecret: secret }).expect(303);
  assert.match(login.headers['set-cookie'][0], /HttpOnly/i);
  assert.match(login.headers['set-cookie'][0], /SameSite=Strict/i);
  await agent.get('/hivenues').set('Host', 'dogfood.test').expect(200);
  await agent.post('/hivenues/new')
    .set('Host', 'dogfood.test')
    .set('Origin', 'https://evil.example')
    .type('form').send(input()).expect(403).expect(/DOGFOOD_ORIGIN_REJECTED/);
  await agent.post('/hivenues/new')
    .set('Host', 'dogfood.test')
    .set('Origin', 'http://dogfood.test')
    .set('Sec-Fetch-Site', 'same-origin')
    .type('form').send(input()).expect(303);
  assert.equal(fs.readFileSync(statePath, 'utf8').includes(secret), false);
});

test('public-ingress default cookie is Secure when HTTPS is represented by the trusted loopback proxy', async (t) => {
  const store = new ProvisioningFileHiVenuesStore({ statePath: tempState(t) });
  const secret = 'secure-cookie-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const app = createDogfoodApp({ store, publicIngress: true, accessSecret: secret });
  const response = await request(app).post('/__dogfood/access')
    .set('Host', 'dogfood.example')
    .set('X-Forwarded-Proto', 'https')
    .set('Origin', 'https://dogfood.example')
    .type('form').send({ accessSecret: secret }).expect(303);
  assert.match(response.headers['set-cookie'][0], /Secure/i);
});

test('dogfood launcher binds loopback only and requires an explicit state path', async (t) => {
  assert.throws(() => parseArgs([]), /--state is required/);
  assert.deepEqual(parseArgs(['--state', 'state.json', '--port', '4321', '--public-ingress']), {
    statePath: 'state.json', port: 4321, publicIngress: true,
  });
  const store = new ProvisioningFileHiVenuesStore({ statePath: tempState(t) });
  const server = await startDogfoodServer(createDogfoodApp({ store }), { port: 0 });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  assert.equal(server.address().address, DOGFOOD_HOST);
  assert.equal(server.address().family, 'IPv4');
});
