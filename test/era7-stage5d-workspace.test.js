'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const path = require('node:path');
const { createDomainPreflight, recordDnsObservation, recordTlsObservation, recordPublicReadBack } = require('../src/product/deployment-publication');
const { HiVenuesStore } = require('../src/product/store');
const { createHiVenuesApp } = require('../src/product/app');
const { buildOperatorPresentation, contentChanges, publicEvidenceMatches } = require('../src/product/operator-present');
const { InstalledRemoteDeploymentService } = require('../src/product/deployment-execution');
const { fixture, exactFakeTargetFactory } = require('./helpers/stage5d-offline-fixture');

function provenTarget(snapshot) {
  const copy = snapshot.releases[0];
  const runtime = { sourceSha: 'a'.repeat(40), sourceTree: 'b'.repeat(40), packageVersion: '1.0.0', nodeVersion: 'v24.19.0', bundleDigest: 'c'.repeat(64) };
  const release = { hostSlug: snapshot.draft.identity.slug, releaseId: copy.id, releaseDigest: copy.digest, packageDigest: 'd'.repeat(64) };
  const hostname = 'fixture.example.test';
  const checkedAt = '2026-10-04T00:00:00.000Z';
  const dns = recordDnsObservation(createDomainPreflight({ hostname, destinations: [{ kind: 'ipv4', value: '93.184.216.34' }] }), { checkedAt, resolver: 'offline-fixture', records: [{ type: 'A', name: hostname, values: ['93.184.216.34'] }] });
  const tls = recordTlsObservation(dns, { hostname, authorized: true, protocol: 'TLSv1.3', subjectAltNames: [hostname], validFrom: '2026-10-01T00:00:00.000Z', validTo: '2027-01-01T00:00:00.000Z', checkedAt });
  const publicEndpoint = recordPublicReadBack(tls, { url: `https://${hostname}/__hivenues/health`, statusCode: 200, checkedAt, body: { status: 'healthy', runtime, deployment: release } }, { runtime, release });
  return { id: 'real-shaped-offline-fixture', hostSlug: release.hostSlug, providerKind: 'ssh-server', state: 'healthy', activeRelease: { id: copy.id, digest: copy.digest, packageDigest: release.packageDigest }, runtimeProfile: runtime, publicEndpoint };

}
test('Stage 5D: public presentation requires exact current observed and expected identity; simulation never qualifies', () => {
  const snapshot = new HiVenuesStore().snapshot('northline-hall');
  const target = provenTarget(snapshot);
  assert.equal(publicEvidenceMatches(target), true);
  for (const [name, mutate, verified] of [
    ['synthetic', t => { t.providerKind = 'synthetic-offline'; }, false],
    ['unknown', t => { t.publicEndpoint.publicReadBack.state = 'unverified'; }, false],
    ['mismatch', t => { t.publicEndpoint.publicReadBack.state = 'mismatch'; }, false],
    ['stale content', t => { t.activeRelease.digest = 'e'.repeat(64); }, false],
    ['stale runtime', t => { t.runtimeProfile.sourceTree = 'e'.repeat(40); }, false],
    ['wrong observation', t => { t.publicEndpoint.publicReadBack.observation.observed.deployment.releaseId = 'other'; }, false],
    ['legacy evidence', t => { delete t.publicEndpoint.publicReadBack.observation.expected; }, false],
    ['incomplete', t => { t.state = 'deploying'; }, false],
    ['tls pending', t => { t.publicEndpoint.tls.state = 'requesting'; }, false],
    ['management disconnected', t => { t.state = 'disconnected'; }, true],
  ]) {
    const value = JSON.parse(JSON.stringify(target)); mutate(value);
    assert.equal(publicEvidenceMatches(value), verified, name);
    const model = buildOperatorPresentation(snapshot, { deploymentStore: { list: () => [value] }, remoteDeployment: {} });
    assert.equal(model.targets[0]?.baseline?.id || null, verified ? snapshot.releases[0].id : null, name);
  }
});
test('Stage 5D: A online, B approved and C draft never use the latest approved copy as the public baseline', () => {
  const store = new HiVenuesStore(); const slug = 'northline-hall';
  const a = store.snapshot(slug); const target = provenTarget(a);
  store.commit(slug, a.revision, 'draft-b', draft => { draft.facts.tagline = 'B content'; }, ['facts.tagline'], a.draftDigest);
  const b = store.snapshot(slug); store.createRelease(slug, b.revision, b.draftDigest);
  const next = store.snapshot(slug); store.commit(slug, next.revision, 'draft-c', draft => { draft.facts.tagline = 'C content'; }, ['facts.tagline'], next.draftDigest);
  const snapshot = store.snapshot(slug);
  const model = buildOperatorPresentation(snapshot, { deploymentStore: { list: () => [target] }, remoteDeployment: {} });
  assert.equal(model.latest.snapshot.facts.tagline, 'B content');
  assert.equal(model.targets[0].baseline.digest, a.releases[0].digest);
  assert.equal(model.draft.differsFromLatest, true);
  assert.deepEqual(contentChanges(model.targets[0].baseline.snapshot, snapshot.draft).find(c => c.label === 'Headline'), { label: 'Headline', before: a.draft.facts.tagline, after: 'C content' });
});
test('Stage 5D: explicit content approval is stale-guarded, reusable, local-only, and saved preview never follows later edits', async () => {
  const store = new HiVenuesStore(); const slug = 'northline-hall'; const base = `/hivenues/studio/${slug}`;
  const app = createHiVenuesApp({ store, identityServices: false, participationServices: false });
  const original = store.snapshot(slug); const fields = { expectedRevision: original.revision, expectedDraftDigest: original.draftDigest, confirmation: 'approve-exact-content' };
  await request(app).post(`${base}/publish`).type('form').send({ ...fields, confirmation: '' }).expect(400);
  const approved = await request(app).post(`${base}/publish`).type('form').send(fields).expect(303);
  assert.equal(store.snapshot(slug).releases.length, original.releases.length);
  await request(app).get(approved.headers.location).expect(200).expect(/This Studio is local-only/);
  store.commit(slug, original.revision, 'later-draft', draft => { draft.facts.tagline = 'Later edits must not leak'; }, ['facts.tagline'], original.draftDigest);
  await request(app).post(`${base}/publish`).type('form').send(fields).expect(409);
  const preview = await request(app).get(`${approved.headers.location}/preview`).expect(200);
  assert.doesNotMatch(preview.text, /Later edits must not leak/);
  assert.match(preview.text, /Back to saved copy/);
  await request(app).get(`${approved.headers.location}/preview/about`).expect(200).expect(/Back to saved copy/);
  await request(app).post(`${approved.headers.location}/to/anything`).expect(400);
});
test('Stage 5D: publishing routes retain exact service review and execution with an offline target transport', async (t) => {
  const f = fixture(t); const capture = {};
  const remoteDeployment = new InstalledRemoteDeploymentService({ deploymentStore: f.deploymentStore, packageBuilder: f.packageBuilder, authorityStore: {}, runtimeBundlesRoot: path.join(f.root, 'runtime-bundles'), buildProvenance: f.buildProvenance, targetFactory: exactFakeTargetFactory(capture) });
  const app = createHiVenuesApp({ store: f.hostStore, identityServices: false, participationServices: false, deploymentServices: { deploymentStore: f.deploymentStore, packageBuilder: f.packageBuilder, remoteDeployment } });
  const base = `/hivenues/studio/${f.slug}/publish/${f.released.id}/to/${f.deploymentId}`;
  await request(app).post(base).expect(303);
  const review = await request(app).get(`${base}/review`).expect(200);
  assert.match(review.text, /Confirm this destination/);
  assert.equal(capture.options, undefined, 'review cannot construct a mutating transport');
  const reviewDigest = /name="reviewDigest" value="([a-f0-9]+)"/.exec(review.text)[1];
  await request(app).post(`${base}/execute`).type('form').send({ reviewDigest, confirmation: '' }).expect(400);
  await request(app).post(`${base}/execute`).type('form').send({ reviewDigest: '0'.repeat(64), confirmation: 'deploy-exact-release' }).expect(409);
  assert.equal(capture.options, undefined);
  await request(app).post(`${base}/execute`).type('form').send({ reviewDigest, confirmation: 'deploy-exact-release' }).expect(303);
  const installed = f.deploymentStore.get(f.deploymentId);
  assert.equal(installed.activeRelease.id, f.released.id);
  assert.equal(installed.state, 'healthy');
  const result = await request(app).get(`${base}/result`).expect(200);
  assert.match(result.text, /Public check pending/);
  assert.doesNotMatch(result.text, /<h1>Website verified/);
});
test('Stage 5D: result is scoped to the requested copy; address consequences and observation use separate service methods', async () => {
  const store = new HiVenuesStore(); const snapshot = store.snapshot('northline-hall');
  const target = provenTarget(snapshot); const copy = snapshot.releases[0]; const calls = [];
  const remoteDeployment = {
    async prepareHostnamePublicationReview(id) { calls.push(['review', id]); return { hostname: target.publicEndpoint.hostname, reviewDigest: 'a'.repeat(64) }; },
    async publishHostname(id, submission) { calls.push(['publish', id, submission]); if (submission.reviewDigest !== 'a'.repeat(64) || submission.confirmation !== 'publish-reviewed-hostname') throw Object.assign(new Error('Review changed'), { code: 'DEPLOYMENT_PUBLICATION_REVIEW_STALE' }); },
    async verifyPublicHttps(id) { calls.push(['observe', id]); },
  };
  const app = createHiVenuesApp({ store, identityServices: false, participationServices: false, deploymentServices: { remoteDeployment, deploymentStore: { list: () => [target], get: id => id === target.id ? target : null } } });
  const base = `/hivenues/studio/northline-hall/publish/${copy.id}/to/${target.id}`;
  await request(app).get(`${base}/result`).expect(200).expect(/<h1>Website verified<\/h1>/);
  assert.equal(calls.length, 0);
  await request(app).get(`${base}/address`).expect(200).expect(/Publish at fixture.example.test/);
  assert.deepEqual(calls, [['review', target.id]]);
  await request(app).post(`${base}/address`).type('form').send({ reviewDigest: 'a'.repeat(64), confirmation: 'publish-reviewed-hostname', unexpected: 'reject' }).expect(400);
  assert.equal(calls.length, 1);
  await request(app).post(`${base}/address`).type('form').send({ reviewDigest: 'b'.repeat(64), confirmation: 'publish-reviewed-hostname' }).expect(409);
  await request(app).post(`${base}/address`).type('form').send({ reviewDigest: 'a'.repeat(64), confirmation: 'publish-reviewed-hostname' }).expect(303);
  await request(app).post(`${base}/check`).expect(303);
  assert.deepEqual(calls.at(-1), ['observe', target.id]);
  store.commit('northline-hall', snapshot.revision, 'new-copy', draft => { draft.facts.tagline = 'Another approved copy'; }, ['facts.tagline'], snapshot.draftDigest);
  const next = store.snapshot('northline-hall'); const b = store.createRelease('northline-hall', next.revision, next.draftDigest).release;
  const different = base.replace(copy.id, b.id);
  const result = await request(app).get(`${different}/result`).expect(200);
  assert.doesNotMatch(result.text, /<h1>Website verified<\/h1>/);
  assert.match(result.text, /A different copy was verified/);
  const count = calls.length;
  await request(app).post(`${different}/address`).type('form').send({ reviewDigest: 'a'.repeat(64), confirmation: 'publish-reviewed-hostname' }).expect(409);
  assert.equal(calls.length, count, 'no address effect for a different installed copy');
  await request(app).get(base.replace('northline-hall', 'nova-ashby') + '/result').expect(404);
});
