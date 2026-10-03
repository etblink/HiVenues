'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');

const { createHiVenuesApp } = require('../src/product/app');
const { createDomainPreflight } = require('../src/product/deployment-publication');
const { FileDeploymentStore } = require('../src/product/deployment-store');
const { ProvisioningFileHiVenuesStore } = require('../src/product/provisioning-file-store');

function fixture(t, diagnostic, { withDomain = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-era7-stage4c-'));
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
    now: () => Date.parse('2026-10-03T18:00:00.000Z'),
    idFactory: () => 'stage4c-target',
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
        deployedAt: '2026-10-03T17:59:00.000Z',
      },
      runtimeProfile: {
        kind: 'hivenues-public-runtime',
        sourceSha: '1'.repeat(40),
        sourceTree: '2'.repeat(40),
        packageVersion: '1.0.0',
        nodeVersion: 'v24.19.0',
        bundleDigest: '3'.repeat(64),
      },
      healthState: 'healthy',
    },
  });
  if (withDomain) {
    deploymentStore.setPublicEndpoint(deployment.id, createDomainPreflight({
      hostname: 'dev.fourthstreetbar.com',
      destinations: [{ kind: 'ipv4', value: '121.127.34.154' }],
    }));
  }

  let inspections = 0;
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
    remoteDeployment: {
      async inspectPublicationCapability(id) {
        inspections += 1;
        assert.equal(id, deployment.id);
        return diagnostic;
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
    app,
    store,
    deploymentStore,
    deploymentId: deployment.id,
    inspections: () => inspections,
  };
}

test('Era 7 Stage 4C: prepared domain offers one explicit read-only server-readiness action', async (t) => {
  const diagnostic = {
    deploymentId: 'stage4c-target',
    hostSlug: 'harbor-and-hearth',
    capability: 'upgrade-required',
    reason: 'publication-capability-upgrade-required',
  };
  const f = fixture(t, diagnostic);

  const response = await request(f.app)
    .get('/hivenues/studio/harbor-and-hearth/deploy')
    .expect(200);

  assert.match(response.text, /data-publication-capability-check/);
  assert.match(response.text, /data-check-publication-capability/);
  assert.match(response.text, />Check server readiness</);
  assert.match(response.text, /read-only check/);
  assert.equal(f.inspections(), 0);
});

test('Era 7 Stage 4C: old server reports a human-facing one-time upgrade requirement with zero mutation', async (t) => {
  const diagnostic = {
    deploymentId: 'stage4c-target',
    hostSlug: 'harbor-and-hearth',
    capability: 'upgrade-required',
    reason: 'publication-capability-upgrade-required',
  };
  const f = fixture(t, diagnostic);
  const beforeDeployment = JSON.stringify(f.deploymentStore.get(f.deploymentId));
  const beforeHost = JSON.stringify(f.store.snapshot('harbor-and-hearth'));

  const response = await request(f.app)
    .get('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/publication-capability')
    .expect(200);

  assert.match(response.text, /data-publication-capability-upgrade-required/);
  assert.match(response.text, /One-time server upgrade required/);
  assert.match(response.text, /will not fall back to broad administrator access/);
  assert.match(response.text, /dev\.fourthstreetbar\.com/);
  assert.match(response.text, /data-publication-readonly-boundary/);
  assert.equal(f.inspections(), 1);
  assert.equal(JSON.stringify(f.deploymentStore.get(f.deploymentId)), beforeDeployment);
  assert.equal(JSON.stringify(f.store.snapshot('harbor-and-hearth')), beforeHost);
  assert.deepEqual(f.store.diagnostics().external, {
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    deployments: 0,
  });
});

test('Era 7 Stage 4C: ready publication capability is translated into ordinary operator language', async (t) => {
  const diagnostic = {
    deploymentId: 'stage4c-target',
    hostSlug: 'harbor-and-hearth',
    capability: 'ready',
    status: {
      version: 1,
      capability: 'ready',
      state: 'unconfigured',
      hostSlug: 'harbor-and-hearth',
    },
  };
  const f = fixture(t, diagnostic);

  const response = await request(f.app)
    .get('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/publication-capability')
    .expect(200);

  assert.match(response.text, /data-publication-capability-ready/);
  assert.match(response.text, /Server ready for secure publishing/);
  assert.match(response.text, /Ready, not yet configured/);
  assert.match(response.text, /DNS, hostname routing and TLS remain separate/);
  assert.equal(f.inspections(), 1);
});

test('Era 7 Stage 4C: configured and drifted capability states remain distinct', async (t) => {
  const configured = fixture(t, {
    deploymentId: 'stage4c-target',
    hostSlug: 'harbor-and-hearth',
    capability: 'ready',
    status: {
      version: 1,
      capability: 'ready',
      state: 'configured',
      hostSlug: 'harbor-and-hearth',
      hostname: 'dev.fourthstreetbar.com',
      appliedAt: '2026-10-03T17:50:00.000Z',
      caddyConfigSha256: '4'.repeat(64),
      firewallPolicySha256: '5'.repeat(64),
    },
  });
  let response = await request(configured.app)
    .get('/hivenues/studio/harbor-and-hearth/deploy/' + configured.deploymentId + '/publication-capability')
    .expect(200);
  assert.match(response.text, /Publishing configuration already present/);
  assert.match(response.text, /dev\.fourthstreetbar\.com/);

  const drifted = fixture(t, {
    deploymentId: 'stage4c-target',
    hostSlug: 'harbor-and-hearth',
    capability: 'ready',
    status: {
      version: 1,
      capability: 'ready',
      state: 'drifted',
      hostSlug: 'harbor-and-hearth',
      hostname: 'dev.fourthstreetbar.com',
      reason: 'managed-config-drift',
    },
  });
  response = await request(drifted.app)
    .get('/hivenues/studio/harbor-and-hearth/deploy/' + drifted.deploymentId + '/publication-capability')
    .expect(200);
  assert.match(response.text, /data-publication-capability-drifted/);
  assert.match(response.text, /needs attention before we continue/);
  assert.match(response.text, /managed-config-drift/);
});

test('Era 7 Stage 4C: direct readiness check fails closed until a domain plan exists', async (t) => {
  const f = fixture(t, {
    deploymentId: 'stage4c-target',
    hostSlug: 'harbor-and-hearth',
    capability: 'ready',
    status: {
      version: 1,
      capability: 'ready',
      state: 'unconfigured',
      hostSlug: 'harbor-and-hearth',
    },
  }, { withDomain: false });

  const response = await request(f.app)
    .get('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/publication-capability')
    .expect(409);

  assert.match(response.text, /Prepare a domain plan before checking server publishing readiness/);
  assert.equal(f.inspections(), 0);
});
