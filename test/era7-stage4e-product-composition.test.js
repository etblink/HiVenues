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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-stage4e-ui-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const store = new ProvisioningFileHiVenuesStore({
    statePath: path.join(root, 'workspace.json'),
    mediaRoot: path.join(root, 'media'),
  });
  const snapshot = store.snapshot('harbor-and-hearth');
  const released = store.createRelease(
    'harbor-and-hearth',
    snapshot.revision,
    snapshot.draftDigest,
  );
  assert.equal(released.ok, true);

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
    now: () => Date.parse('2026-10-03T20:10:00.000Z'),
    idFactory: () => 'stage4e-ui',
  });
  const deployment = deploymentStore.createDraft({
    hostSlug: 'harbor-and-hearth',
    providerKind: 'ssh-server',
    providerProfile: 'privex-reference',
    capabilities: ['PUBLISH', 'DOMAIN', 'DNS', 'TLS', 'HEALTH'],
  });
  deploymentStore.setTargetPublicFacts(deployment.id, {
    host: '121.127.34.154',
    port: 22,
    username: 'hivenues-deploy',
    bootstrapUsername: 'debian',
  });
  deploymentStore.selectRelease(deployment.id, released.release);
  deploymentStore.transition(deployment.id, 'target-ready', { reason: 'test' });
  deploymentStore.transition(deployment.id, 'verifying', { reason: 'test' });
  deploymentStore.transition(deployment.id, 'bootstrap-ready', { reason: 'test' });
  deploymentStore.transition(deployment.id, 'deploying', { reason: 'test' });
  deploymentStore.transition(deployment.id, 'healthy', {
    reason: 'test-exact-readback',
    patch: {
      activeRelease: {
        id: released.release.id,
        digest: released.release.digest,
        packageDigest: 'a'.repeat(64),
        deployedAt: '2026-10-03T20:00:00.000Z',
      },
      runtimeProfile: runtime,
      healthState: 'healthy',
    },
  });
  deploymentStore.setPublicEndpoint(deployment.id, createDomainPreflight({
    hostname: 'dev.fourthstreetbar.com',
    destinations: [{ kind: 'ipv4', value: '121.127.34.154' }],
  }));

  const exactRelease = {
    hostSlug: 'harbor-and-hearth',
    releaseId: released.release.id,
    releaseDigest: released.release.digest,
    packageDigest: 'a'.repeat(64),
  };

  const remoteDeployment = {
    async inspectPublicationCapability() {
      return {
        deploymentId: deployment.id,
        hostSlug: 'harbor-and-hearth',
        capability: 'ready',
        status: {
          version: 1,
          capability: 'ready',
          state: 'unconfigured',
          hostSlug: 'harbor-and-hearth',
        },
        bootstrapAuthorityAccessible: false,
        exactDeploymentMatches: true,
      };
    },
    async checkDns() {
      const record = deploymentStore.get(deployment.id);
      deploymentStore.setPublicEndpoint(deployment.id, recordDnsObservation(record.publicEndpoint, {
        checkedAt: '2026-10-03T20:11:00.000Z',
        resolver: 'synthetic-ui',
        records: [{
          type: 'A',
          name: 'dev.fourthstreetbar.com',
          values: ['121.127.34.154'],
        }],
      }));
    },
    async prepareHostnamePublicationReview() {
      return {
        version: 1,
        hostname: 'dev.fourthstreetbar.com',
        deploymentId: deployment.id,
        activeRelease: deploymentStore.get(deployment.id).activeRelease,
        dnsObservation: deploymentStore.get(deployment.id).publicEndpoint.dns.observation,
        publicationState: 'unconfigured',
        alreadyApplied: false,
        target: {
          host: '121.127.34.154',
          port: 22,
          username: 'hivenues-deploy',
          trustedHostKeyFingerprint: 'SHA256:' + 'Z'.repeat(43),
        },
        consequences: [
          'apply-only-the-reviewed-hostname-through-the-restricted-publication-helper',
          'restart-only-hivenues-caddy-and-firewall-services',
        ],
        held: [
          'runtime-or-release-redeployment',
          'unrelated-dns-records',
          'hive-writes',
          'value-movement',
        ],
        runtime,
        release: exactRelease,
        reviewDigest: '9'.repeat(64),
      };
    },
    async publishHostname(_id, submission) {
      assert.deepEqual(submission, {
        reviewDigest: '9'.repeat(64),
        confirmation: 'publish-reviewed-hostname',
      });
      const record = deploymentStore.get(deployment.id);
      deploymentStore.setPublicEndpoint(deployment.id, markTlsRequesting(record.publicEndpoint));
    },
    async verifyPublicHttps() {
      const record = deploymentStore.get(deployment.id);
      const tls = recordTlsObservation(record.publicEndpoint, {
        hostname: 'dev.fourthstreetbar.com',
        authorized: true,
        protocol: 'TLSv1.3',
        subjectAltNames: ['dev.fourthstreetbar.com'],
        validFrom: '2026-10-03T20:00:00.000Z',
        validTo: '2027-01-01T00:00:00.000Z',
        checkedAt: '2026-10-03T20:12:00.000Z',
      });
      const completed = recordPublicReadBack(tls, {
        url: 'https://dev.fourthstreetbar.com/__hivenues/health',
        statusCode: 200,
        checkedAt: '2026-10-03T20:12:01.000Z',
        body: {
          status: 'healthy',
          runtime,
          deployment: exactRelease,
        },
      }, {
        runtime,
        release: exactRelease,
      });
      deploymentStore.setPublicEndpoint(deployment.id, completed);
    },
  };

  const services = {
    deploymentStore,
    packageBuilder: {},
    authorityStore: {},
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

  return { app, store, deploymentStore, deploymentId: deployment.id };
}

test('Era 7 Stage 4E composition: prepared DNS shows guided handoff and read-only check', async (t) => {
  const f = fixture(t);

  const response = await request(f.app)
    .get('/hivenues/studio/harbor-and-hearth/deploy')
    .expect(200);

  assert.match(response.text, /data-domain-dns-instructions/);
  assert.match(response.text, /dev\.fourthstreetbar\.com/);
  assert.match(response.text, /121\.127\.34\.154/);
  assert.match(response.text, /data-domain-dns-check/);
  assert.match(response.text, />Check DNS</);
  assert.match(response.text, /does not edit DNS/);
});

test('Era 7 Stage 4E composition: exact DNS confirmation unlocks explicit publication review', async (t) => {
  const f = fixture(t);

  await request(f.app)
    .post('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/domain/check')
    .expect(303);

  let response = await request(f.app)
    .get('/hivenues/studio/harbor-and-hearth/deploy')
    .expect(200);

  assert.match(response.text, /Domain records confirmed/);
  assert.match(response.text, /data-domain-dns-observation/);
  assert.match(response.text, /synthetic-ui/);
  assert.match(response.text, /data-review-live-publication/);

  response = await request(f.app)
    .get('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/publication-review')
    .expect(200);

  assert.match(response.text, /data-live-publication-review/);
  assert.match(response.text, /data-live-publication-dns-proof/);
  assert.match(response.text, /data-live-publication-release-proof/);
  assert.match(response.text, /hivenues-deploy@121\.127\.34\.154:22/);
  assert.match(response.text, /data-live-publication-consequences/);
  assert.match(response.text, /data-live-publication-held/);
  assert.match(response.text, /data-confirm-live-publication/);
  assert.match(response.text, /Publish dev\.fourthstreetbar\.com securely/);
});

test('Era 7 Stage 4E composition: explicit publication confirmation advances only to TLS requesting', async (t) => {
  const f = fixture(t);
  await request(f.app)
    .post('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/domain/check')
    .expect(303);

  await request(f.app)
    .post('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/publication-apply')
    .type('form')
    .send({
      reviewDigest: '9'.repeat(64),
      confirmation: 'publish-reviewed-hostname',
    })
    .expect(303);

  const saved = f.deploymentStore.get(f.deploymentId);
  assert.equal(saved.publicEndpoint.domainState, 'dns-confirmed');
  assert.equal(saved.publicEndpoint.tls.state, 'requesting');
  assert.equal(saved.publicEndpoint.publicReadBack.state, 'unverified');

  const response = await request(f.app)
    .get('/hivenues/studio/harbor-and-hearth/deploy')
    .expect(200);
  assert.match(response.text, /data-domain-public-verification/);
  assert.match(response.text, /data-verify-public-https/);
  assert.doesNotMatch(response.text, /data-public-readback-verified/);
});

test('Era 7 Stage 4E composition: independent TLS plus exact public read-back completes visible proof', async (t) => {
  const f = fixture(t);
  await request(f.app)
    .post('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/domain/check')
    .expect(303);
  await request(f.app)
    .post('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/publication-apply')
    .type('form')
    .send({
      reviewDigest: '9'.repeat(64),
      confirmation: 'publish-reviewed-hostname',
    })
    .expect(303);

  await request(f.app)
    .post('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/publication-verify')
    .expect(303);

  const saved = f.deploymentStore.get(f.deploymentId);
  assert.equal(saved.publicEndpoint.tls.state, 'verified');
  assert.equal(saved.publicEndpoint.publicReadBack.state, 'verified');

  const response = await request(f.app)
    .get('/hivenues/studio/harbor-and-hearth/deploy')
    .expect(200);

  assert.match(response.text, /data-domain-tls-verified/);
  assert.match(response.text, /data-public-readback-verified/);
  assert.match(response.text, /Live HTTPS exact Release confirmed/);
  assert.match(response.text, /https:\/\/dev\.fourthstreetbar\.com\/__hivenues\/health/);
  assert.deepEqual(f.store.diagnostics().external, {
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    deployments: 0,
  });
});
