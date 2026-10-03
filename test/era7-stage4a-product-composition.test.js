'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');

const { createHiVenuesApp } = require('../src/product/app');
const { FileDeploymentStore } = require('../src/product/deployment-store');
const { ProvisioningFileHiVenuesStore } = require('../src/product/provisioning-file-store');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-era7-stage4a-ui-'));
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

  const deploymentStore = new FileDeploymentStore({
    statePath: path.join(root, 'deployment.json'),
    now: () => Date.parse('2026-10-03T11:00:00.000Z'),
    idFactory: () => 'stage4a-ui',
  });
  const deployment = deploymentStore.createDraft({
    hostSlug: 'harbor-and-hearth',
    providerKind: 'ssh-server',
    providerProfile: 'privex-reference',
    capabilities: ['DOMAIN', 'DNS', 'TLS', 'HEALTH'],
  });
  deploymentStore.setTargetPublicFacts(deployment.id, {
    host: '121.127.34.154',
    port: 22,
    username: 'hivenues-deploy',
  });
  deploymentStore.selectRelease(deployment.id, released.release);
  deploymentStore.transition(deployment.id, 'target-ready', {
    reason: 'test-target-ready',
    patch: { providerState: 'ready' },
  });
  deploymentStore.transition(deployment.id, 'verifying', { reason: 'test-verifying' });
  deploymentStore.transition(deployment.id, 'bootstrap-ready', {
    reason: 'test-bootstrap-ready',
  });
  deploymentStore.transition(deployment.id, 'deploying', { reason: 'test-deploying' });
  deploymentStore.transition(deployment.id, 'healthy', {
    reason: 'test-exact-readback',
    patch: {
      activeRelease: {
        id: released.release.id,
        digest: released.release.digest,
        packageDigest: 'a'.repeat(64),
        deployedAt: '2026-10-03T10:59:00.000Z',
      },
      healthState: 'healthy',
    },
  });

  const services = {
    deploymentStore,
    packageBuilder: {},
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
  };

  const app = createHiVenuesApp({
    store,
    identityServices: false,
    participationServices: false,
    deploymentServices: services,
  });

  return {
    root,
    store,
    deploymentStore,
    deploymentId: deployment.id,
    app,
  };
}

test('Era 7 Stage 4A composition: healthy server exposes a human-facing local domain preflight', async (t) => {
  const f = fixture(t);

  let response = await request(f.app)
    .get('/hivenues/studio/harbor-and-hearth/deploy')
    .expect(200);

  assert.match(response.text, /data-deployment-stage4a/);
  assert.match(response.text, /data-domain-preflight-form/);
  assert.match(response.text, />Connect a domain</);

  await request(f.app)
    .post('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/domain/preflight')
    .type('form')
    .send({ hostname: 'dev.fourthstreetbar.com' })
    .expect(303);

  const saved = f.deploymentStore.get(f.deploymentId);
  assert.equal(saved.publicEndpoint.hostname, 'dev.fourthstreetbar.com');
  assert.equal(saved.domainState, 'dns-instructions-ready');
  assert.deepEqual(saved.publicEndpoint.dns.requirements, [{
    type: 'A',
    name: 'dev.fourthstreetbar.com',
    values: ['121.127.34.154'],
  }]);

  response = await request(f.app)
    .get('/hivenues/studio/harbor-and-hearth/deploy')
    .expect(200);

  assert.match(response.text, /data-domain-hostname-value/);
  assert.match(response.text, /dev\.fourthstreetbar\.com/);
  assert.match(response.text, /121\.127\.34\.154/);
  assert.match(response.text, /Nothing has been changed yet/);
  assert.match(response.text, /data-domain-consequence-review/);
  assert.match(response.text, /DNS has not been checked yet/);

  const before = JSON.stringify(f.store.snapshot('harbor-and-hearth'));
  assert.equal(JSON.stringify(f.store.snapshot('harbor-and-hearth')), before);
  assert.deepEqual(f.store.diagnostics().external, {
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    deployments: 0,
  });
});

test('Era 7 Stage 4A composition: domain preflight rejects URL-shaped input and does not advance public state', async (t) => {
  const f = fixture(t);

  const response = await request(f.app)
    .post('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/domain/preflight')
    .type('form')
    .send({ hostname: 'https://dev.fourthstreetbar.com/path' })
    .expect(400);

  assert.match(response.text, /Domain hostname is invalid/);
  assert.equal(f.deploymentStore.get(f.deploymentId).publicEndpoint, null);
});


test('Era 7 Stage 4A corrective composition: non-public server IP cannot become a public DNS instruction', async (t) => {
  const f = fixture(t);
  f.deploymentStore.setTargetPublicFacts(f.deploymentId, {
    host: '10.0.0.7',
    port: 22,
    username: 'hivenues-deploy',
  });

  const response = await request(f.app)
    .post('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/domain/preflight')
    .type('form')
    .send({ hostname: 'dev.fourthstreetbar.com' })
    .expect(400);

  assert.match(response.text, /publicly routable IPv4 destination/);
  assert.equal(f.deploymentStore.get(f.deploymentId).publicEndpoint, null);
});
