'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');

const { createHiVenuesApp } = require('../src/product/app');
const { HiVenuesStore } = require('../src/product/store');

function fixture() {
  const store = new HiVenuesStore();
  const slug = 'harbor-and-hearth';
  const snapshot = store.snapshot(slug);
  const release = snapshot.releases.find((item) => item.id === snapshot.liveReleaseId)
    || snapshot.releases[0];
  const record = {
    version: 1,
    id: 'deployment-stage5b-ui',
    hostSlug: slug,
    providerKind: 'ssh-server',
    providerProfile: 'privex-reference',
    capabilities: ['DEPLOY_RELEASE', 'HEALTH', 'ROLLBACK', 'DECOMMISSION'],
    state: 'disconnected',
    stateReason: 'deployment-authority-disconnected',
    providerState: 'ready',
    paymentState: 'not-requested',
    targetPublicFacts: {
      host: '121.127.34.154',
      port: 22,
      username: 'hivenues-deploy',
      bootstrapUsername: 'debian',
      trustedHostKeyFingerprint: 'SHA256:' + 'Z'.repeat(43),
    },
    authorityRef: null,
    selectedRelease: { id: release.id, digest: release.digest },
    package: null,
    activeRelease: {
      id: release.id,
      digest: release.digest,
      packageDigest: 'a'.repeat(64),
      deployedAt: '2026-10-03T22:00:00.000Z',
    },
    previousRelease: {
      id: 'release-stage5b-previous',
      digest: 'b'.repeat(64),
      packageDigest: 'c'.repeat(64),
      deployedAt: '2026-10-03T21:00:00.000Z',
    },
    runtimeProfile: {
      kind: 'hivenues-public-runtime',
      sourceSha: '1'.repeat(40),
      sourceTree: '2'.repeat(40),
      packageVersion: '1.0.0',
      nodeVersion: 'v24.19.0',
      bundleDigest: '3'.repeat(64),
    },
    pendingRuntimeProfile: null,
    publicEndpoint: null,
    domainState: 'domain-unconfigured',
    tlsState: 'unconfigured',
    healthState: 'unknown',
    rollbackState: 'unavailable',
    createdAt: '2026-10-03T20:00:00.000Z',
    updatedAt: '2026-10-03T22:47:00.000Z',
    lastConfirmedAt: '2026-10-03T22:42:00.000Z',
    history: [
      { from: 'degraded', to: 'disconnected', at: '2026-10-03T22:47:00.000Z', reason: 'deployment-authority-disconnected' },
    ],
  };

  const calls = {
    begin: 0,
    review: 0,
    execute: null,
  };
  const remoteDeployment = {
    beginReauthorization(id) {
      assert.equal(id, record.id);
      calls.begin += 1;
    },
    async prepareReauthorizationReview(id) {
      assert.equal(id, record.id);
      calls.review += 1;
      return {
        version: 1,
        deploymentId: record.id,
        hostSlug: slug,
        target: {
          host: '121.127.34.154',
          port: 22,
          bootstrapUsername: 'debian',
          deploymentUsername: 'hivenues-deploy',
          trustedHostKeyFingerprint: record.targetPublicFacts.trustedHostKeyFingerprint,
        },
        authority: {
          id: 'authority-stage5b-ui',
          publicKey: 'ssh-rsa AAAAB3NzaStage5BUI hivenues-deployment',
          publicKeyFingerprint: 'SHA256:' + 'R'.repeat(43),
        },
        runtime: record.runtimeProfile,
        release: record.activeRelease,
        previousRelease: record.previousRelease,
        hostname: 'dev.fourthstreetbar.com',
        remoteState: 'bootstrap-temporary-only',
        consequences: ['install-only-the-fresh-reviewed-public-key-for-the-steady-deployment-account'],
        held: ['runtime-or-release-upload', 'dns-mutation'],
        stateDigest: '8'.repeat(64),
        reviewDigest: '7'.repeat(64),
      };
    },
    async reauthorizeDeployment(id, submission) {
      calls.execute = { id, submission };
    },
    async prepareRollbackReview() {},
    async rollback() {},
    async prepareDisconnectReview() {},
    async disconnectAuthority() {},
    async checkDns() {},
    async prepareHostnamePublicationReview() {},
    async publishHostname() {},
    async verifyPublicHttps() {},
  };

  const deploymentStore = {
    list(hostSlug) {
      return hostSlug === slug ? [structuredClone(record)] : [];
    },
    get(id) {
      return id === record.id ? structuredClone(record) : null;
    },
  };

  const services = {
    deploymentStore,
    packageBuilder: { build() { throw new Error('not used'); } },
    authorityStore: {
      publicRecord(id) {
        if (id !== 'authority-stage5b-ui') throw new Error('unexpected authority');
        return {
          id,
          publicKey: 'ssh-rsa AAAAB3NzaStage5BUI hivenues-deployment',
          publicKeyFingerprint: 'SHA256:' + 'R'.repeat(43),
        };
      },
    },
    adapters: {
      synthetic: {
        profile() {
          return {
            kind: 'synthetic-offline',
            profile: 'synthetic-local',
            capabilities: [],
            externalEffects: false,
          };
        },
      },
    },
    remoteDeployment,
  };

  const app = createHiVenuesApp({
    store,
    identityServices: false,
    participationServices: false,
    deploymentServices: services,
  });

  return { app, record, calls, slug };
}

test('Era 7 Stage 5B composition: disconnected real deployment offers explicit management reconnection', async () => {
  const f = fixture();
  const response = await request(f.app)
    .get('/hivenues/studio/' + f.slug + '/deploy')
    .expect(200);

  assert.match(response.text, /data-deployment-stage5b/);
  assert.match(response.text, /data-reauthorization-entry/);
  assert.match(response.text, /Prepare management reconnection/);
  assert.doesNotMatch(response.text, /data-select-deployment-release/);
});

test('Era 7 Stage 5B composition: prepare is local-only and routes through the reauthorization service', async () => {
  const f = fixture();

  await request(f.app)
    .post('/hivenues/studio/' + f.slug + '/deploy/' + f.record.id + '/reauthorization/prepare')
    .expect(303);

  assert.equal(f.calls.begin, 1);
});

test('Era 7 Stage 5B composition: reauthorizing state exposes exact key handoff and hides deployment mutation controls', async () => {
  const f = fixture();
  f.record.state = 'reauthorizing';
  f.record.stateReason = 'deployment-reauthorization-prepared';
  f.record.authorityRef = 'authority-stage5b-ui';
  f.record.targetPublicFacts.reauthorizationState = 'prepared';

  const response = await request(f.app)
    .get('/hivenues/studio/' + f.slug + '/deploy')
    .expect(200);

  assert.match(response.text, /data-reauthorization-prepared/);
  assert.match(response.text, /Restore the exact public key above to/);
  assert.match(response.text, /data-review-reauthorization/);
  assert.match(response.text, /AAAAB3NzaStage5BUI/);
  assert.doesNotMatch(response.text, /data-select-deployment-release/);
  assert.doesNotMatch(response.text, /data-review-exact-deployment/);
});

test('Era 7 Stage 5B composition: review shows preserved deployment and bounded authority-only consequence', async () => {
  const f = fixture();
  f.record.state = 'reauthorizing';
  f.record.authorityRef = 'authority-stage5b-ui';

  const response = await request(f.app)
    .get('/hivenues/studio/' + f.slug + '/deploy/' + f.record.id + '/reauthorization-review')
    .expect(200);

  assert.equal(f.calls.review, 1);
  assert.match(response.text, /data-reauthorization-review/);
  assert.match(response.text, /Reconnect HiVenues management without re-bootstrapping/);
  assert.match(response.text, /data-reauthorization-deployment/);
  assert.match(response.text, /data-reauthorization-authority/);
  assert.match(response.text, /runtime-or-release-upload/);
  assert.match(response.text, /data-confirm-reauthorization/);
});

test('Era 7 Stage 5B composition: confirmation forwards only digest and explicit reauthorization confirmation', async () => {
  const f = fixture();
  f.record.state = 'reauthorizing';
  f.record.authorityRef = 'authority-stage5b-ui';

  await request(f.app)
    .post('/hivenues/studio/' + f.slug + '/deploy/' + f.record.id + '/reauthorize-authority')
    .type('form')
    .send({
      reviewDigest: '7'.repeat(64),
      confirmation: 'reauthorize-deployment-management',
    })
    .expect(303);

  assert.deepEqual(f.calls.execute, {
    id: f.record.id,
    submission: {
      reviewDigest: '7'.repeat(64),
      confirmation: 'reauthorize-deployment-management',
    },
  });
});
