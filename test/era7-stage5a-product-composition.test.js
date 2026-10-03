'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');

const { createHiVenuesApp } = require('../src/product/app');
const {
  createDomainPreflight,
  markTlsRequesting,
  recordDnsObservation,
  recordPublicReadBack,
  recordTlsObservation,
} = require('../src/product/deployment-publication');
const { FileDeploymentStore } = require('../src/product/deployment-store');
const { ProvisioningFileHiVenuesStore } = require('../src/product/provisioning-file-store');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-stage5a-ui-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const store = new ProvisioningFileHiVenuesStore({
    statePath: path.join(root, 'workspace.json'),
    mediaRoot: path.join(root, 'media'),
  });
  const snapshot = store.snapshot('harbor-and-hearth');
  const releaseBResult = store.createRelease(
    'harbor-and-hearth',
    snapshot.revision,
    snapshot.draftDigest,
  );
  assert.equal(releaseBResult.ok, true);
  const releaseB = releaseBResult.release;
  const releaseA = {
    id: 'release-stage5a-previous',
    digest: 'a'.repeat(64),
    packageDigest: 'b'.repeat(64),
    deployedAt: '2026-10-03T19:00:00.000Z',
  };
  const packageDigestB = 'c'.repeat(64);
  const runtime = {
    kind: 'hivenues-public-runtime',
    sourceSha: '1'.repeat(40),
    sourceTree: '2'.repeat(40),
    packageVersion: '1.0.0',
    nodeVersion: 'v24.19.0',
    bundleDigest: '3'.repeat(64),
  };

  const deploymentStore = new FileDeploymentStore({
    statePath: path.join(root, 'deployment.json'),
    now: () => Date.parse('2026-10-03T21:00:00.000Z'),
    idFactory: () => 'stage5a-ui',
  });
  const deployment = deploymentStore.createDraft({
    hostSlug: 'harbor-and-hearth',
    providerKind: 'ssh-server',
    providerProfile: 'privex-reference',
    capabilities: ['DEPLOY_RELEASE', 'HEALTH', 'ROLLBACK', 'DECOMMISSION', 'DOMAIN', 'DNS', 'TLS', 'PUBLISH'],
  });
  deploymentStore.setAuthorityRef(deployment.id, 'authority-stage5a-ui');
  deploymentStore.setTargetPublicFacts(deployment.id, {
    host: '121.127.34.154',
    port: 22,
    username: 'hivenues-deploy',
    bootstrapUsername: 'debian',
    trustedHostKeyFingerprint: 'SHA256:' + 'Z'.repeat(43),
    hostKeyTrustState: 'trusted',
    verifiedDedicatedTarget: true,
  });
  deploymentStore.selectRelease(deployment.id, releaseB);
  deploymentStore.recordPackage(deployment.id, {
    schemaVersion: 1,
    releaseId: releaseB.id,
    releaseDigest: releaseB.digest,
    packageDigest: packageDigestB,
  });
  deploymentStore.transition(deployment.id, 'target-ready', { reason: 'test' });
  deploymentStore.transition(deployment.id, 'verifying', { reason: 'test' });
  deploymentStore.transition(deployment.id, 'bootstrap-ready', { reason: 'test' });
  deploymentStore.transition(deployment.id, 'deploying', { reason: 'release-b-started' });
  deploymentStore.transition(deployment.id, 'rollback-available', {
    reason: 'release-b-readback-match',
    patch: {
      activeRelease: {
        id: releaseB.id,
        digest: releaseB.digest,
        packageDigest: packageDigestB,
        deployedAt: '2026-10-03T20:00:00.000Z',
      },
      previousRelease: releaseA,
      runtimeProfile: runtime,
      healthState: 'healthy',
      rollbackState: 'available',
    },
  });

  let endpoint = createDomainPreflight({
    hostname: 'dev.fourthstreetbar.com',
    destinations: [{ kind: 'ipv4', value: '121.127.34.154' }],
  });
  endpoint = recordDnsObservation(endpoint, {
    checkedAt: '2026-10-03T20:30:00.000Z',
    resolver: 'synthetic-stage5a-ui',
    records: [{
      type: 'A',
      name: 'dev.fourthstreetbar.com',
      values: ['121.127.34.154'],
    }],
  });
  endpoint = markTlsRequesting(endpoint);
  endpoint = recordTlsObservation(endpoint, {
    hostname: 'dev.fourthstreetbar.com',
    authorized: true,
    protocol: 'TLSv1.3',
    subjectAltNames: ['dev.fourthstreetbar.com'],
    validFrom: '2026-10-03T20:00:00.000Z',
    validTo: '2027-01-01T00:00:00.000Z',
    checkedAt: '2026-10-03T20:31:00.000Z',
  });
  endpoint = recordPublicReadBack(endpoint, {
    url: 'https://dev.fourthstreetbar.com/__hivenues/health',
    statusCode: 200,
    checkedAt: '2026-10-03T20:31:01.000Z',
    body: {
      status: 'healthy',
      runtime,
      deployment: {
        hostSlug: 'harbor-and-hearth',
        releaseId: releaseB.id,
        releaseDigest: releaseB.digest,
        packageDigest: packageDigestB,
      },
    },
  }, {
    runtime,
    release: {
      hostSlug: 'harbor-and-hearth',
      releaseId: releaseB.id,
      releaseDigest: releaseB.digest,
      packageDigest: packageDigestB,
    },
  });
  deploymentStore.setPublicEndpoint(deployment.id, endpoint);

  const calls = {
    rollback: null,
    disconnect: null,
    revoke: 0,
  };
  const authorityStore = {
    publicRecord() {
      return {
        id: 'authority-stage5a-ui',
        kind: 'ssh-key',
        publicKey: 'ssh-rsa AAAAB3NzaStage5AUI hivenues-deployment',
        publicKeyFingerprint: 'SHA256:' + 'K'.repeat(43),
      };
    },
    revoke() {
      calls.revoke += 1;
      return true;
    },
  };
  const remoteDeployment = {
    async prepareRollbackReview() {
      return {
        version: 1,
        deploymentId: deployment.id,
        hostSlug: 'harbor-and-hearth',
        target: {
          host: '121.127.34.154',
          port: 22,
          username: 'hivenues-deploy',
          trustedHostKeyFingerprint: 'SHA256:' + 'Z'.repeat(43),
        },
        hostname: 'dev.fourthstreetbar.com',
        runtime,
        currentRelease: {
          id: releaseB.id,
          digest: releaseB.digest,
          packageDigest: packageDigestB,
        },
        rollbackRelease: releaseA,
        remoteState: 'active-release',
        consequences: ['activate-only-the-already-installed-exact-previous-release'],
        held: ['runtime-upload-or-replacement', 'dns-mutation'],
        reviewDigest: '8'.repeat(64),
      };
    },
    async rollback(id, submission) {
      calls.rollback = { id, submission };
    },
    async prepareDisconnectReview() {
      return {
        version: 1,
        deploymentId: deployment.id,
        hostSlug: 'harbor-and-hearth',
        target: {
          host: '121.127.34.154',
          port: 22,
          username: 'hivenues-deploy',
          trustedHostKeyFingerprint: 'SHA256:' + 'Z'.repeat(43),
        },
        hostname: 'dev.fourthstreetbar.com',
        release: {
          id: releaseB.id,
          digest: releaseB.digest,
          packageDigest: packageDigestB,
        },
        runtime,
        authority: {
          id: 'authority-stage5a-ui',
          publicKeyFingerprint: 'SHA256:' + 'K'.repeat(43),
          localAuthorityPresent: true,
          remoteAuthorityRemoved: false,
        },
        exactDeploymentConfirmed: true,
        consequences: ['remove-only-the-exact-hivenues-deployment-public-key-from-the-steady-server-account'],
        held: ['stop-or-delete-the-running-site', 'dns-mutation'],
        reviewDigest: '7'.repeat(64),
      };
    },
    async disconnectAuthority(id, submission) {
      calls.disconnect = { id, submission };
    },
    async inspectPublicationCapability() {
      return {
        capability: 'ready',
        status: {
          state: 'configured',
          hostname: 'dev.fourthstreetbar.com',
        },
        bootstrapAuthorityAccessible: false,
        exactDeploymentMatches: true,
      };
    },
    async checkDns() {},
    async prepareHostnamePublicationReview() {},
    async publishHostname() {},
    async verifyPublicHttps() {},
  };
  const services = {
    deploymentStore,
    packageBuilder: {
      build() {
        return {
          schemaVersion: 1,
          releaseId: releaseB.id,
          releaseDigest: releaseB.digest,
          packageDigest: packageDigestB,
        };
      },
    },
    authorityStore,
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

  return { app, deploymentStore, deploymentId: deployment.id, calls, releaseA, releaseB };
}

test('Era 7 Stage 5A composition: installed deployment page exposes reviewed real rollback and authority disconnect', async (t) => {
  const f = fixture(t);

  const response = await request(f.app)
    .get('/hivenues/studio/harbor-and-hearth/deploy')
    .expect(200);

  assert.match(response.text, /data-deployment-stage5a/);
  assert.match(response.text, /data-real-rollback-entry/);
  assert.match(response.text, /data-review-real-rollback/);
  assert.match(response.text, /data-real-disconnect-entry/);
  assert.match(response.text, /data-review-real-disconnect/);
  assert.doesNotMatch(response.text, /data-disconnect-deployment/);
});

test('Era 7 Stage 5A composition: rollback review shows exact A/B/runtime/target consequence and requires confirmation', async (t) => {
  const f = fixture(t);

  const response = await request(f.app)
    .get('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/rollback-review')
    .expect(200);

  assert.match(response.text, /data-real-rollback-review/);
  assert.match(response.text, /data-rollback-current-release/);
  assert.match(response.text, new RegExp(f.releaseB.id));
  assert.match(response.text, /data-rollback-target-release/);
  assert.match(response.text, new RegExp(f.releaseA.id));
  assert.match(response.text, /data-rollback-preserved-runtime/);
  assert.match(response.text, /121\.127\.34\.154/);
  assert.match(response.text, /data-confirm-real-rollback/);
});

test('Era 7 Stage 5A composition: rollback confirmation forwards only review digest and confirmation', async (t) => {
  const f = fixture(t);

  await request(f.app)
    .post('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/rollback-exact')
    .type('form')
    .send({
      reviewDigest: '8'.repeat(64),
      confirmation: 'rollback-to-previous-release',
    })
    .expect(303);

  assert.deepEqual(f.calls.rollback, {
    id: f.deploymentId,
    submission: {
      reviewDigest: '8'.repeat(64),
      confirmation: 'rollback-to-previous-release',
    },
  });
});

test('Era 7 Stage 5A composition: authority disconnect review says site and local host history remain', async (t) => {
  const f = fixture(t);

  const response = await request(f.app)
    .get('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/disconnect-review')
    .expect(200);

  assert.match(response.text, /data-real-disconnect-review/);
  assert.match(response.text, /Disconnect HiVenues management without taking the published site down/);
  assert.match(response.text, /data-disconnect-deployment-proof/);
  assert.match(response.text, /data-disconnect-authority-proof/);
  assert.match(response.text, /data-confirm-real-disconnect/);
  assert.match(response.text, /stop-or-delete-the-running-site/);
});

test('Era 7 Stage 5A composition: authority disconnect confirmation is separate from legacy local disconnect', async (t) => {
  const f = fixture(t);

  await request(f.app)
    .post('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/disconnect-authority')
    .type('form')
    .send({
      reviewDigest: '7'.repeat(64),
      confirmation: 'disconnect-deployment-authority',
    })
    .expect(303);

  assert.deepEqual(f.calls.disconnect, {
    id: f.deploymentId,
    submission: {
      reviewDigest: '7'.repeat(64),
      confirmation: 'disconnect-deployment-authority',
    },
  });
  assert.equal(f.calls.revoke, 0);
});

test('Era 7 Stage 5A composition: legacy one-click disconnect cannot revoke a real server authority', async (t) => {
  const f = fixture(t);

  const response = await request(f.app)
    .post('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/disconnect')
    .expect(409);

  assert.match(response.text, /must use the reviewed deployment-authority disconnect flow/);
  assert.equal(f.calls.revoke, 0);
  assert.equal(f.deploymentStore.get(f.deploymentId).state, 'rollback-available');
});
