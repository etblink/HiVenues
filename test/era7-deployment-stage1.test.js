'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');

const { createHiVenuesApp } = require('../src/product/app');
const { buildDeploymentPackage } = require('../src/product/deployment-package');
const { FileDeploymentStore } = require('../src/product/deployment-store');
const { createLocalDeploymentServices } = require('../src/product/deployment');
const { ProvisioningFileHiVenuesStore } = require('../src/product/provisioning-file-store');
const { SyntheticDeploymentAdapter } = require('../src/product/synthetic-deployment-adapter');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_PUBLIC_ROOT = path.join(PROJECT_ROOT, 'public');

function externalZero(store) {
  assert.deepEqual(store.diagnostics().external, {
    hiveRpcAttempts: 0,
    hiveWrites: 0,
    providerWrites: 0,
    payments: 0,
    signingAttempts: 0,
    deployments: 0,
  });
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-era7-stage1-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const statePath = path.join(root, 'workspace', 'state.json');
  const mediaRoot = path.join(root, 'media');
  const deploymentStatePath = path.join(root, 'deployment', 'state.json');
  const packageRoot = path.join(root, 'deployment', 'packages');
  const publicRoot = path.join(root, 'public');
  const sourceAsset = path.join(SOURCE_PUBLIC_ROOT, 'hivenues', 'media', 'harbor-hearth-table.svg');
  const copiedAsset = path.join(publicRoot, 'hivenues', 'media', 'harbor-hearth-table.svg');
  fs.mkdirSync(path.dirname(copiedAsset), { recursive: true });
  fs.copyFileSync(sourceAsset, copiedAsset);

  const store = new ProvisioningFileHiVenuesStore({ statePath, mediaRoot });
  const deploymentStore = new FileDeploymentStore({
    statePath: deploymentStatePath,
    now: () => Date.parse('2026-09-19T08:00:00.000Z'),
    idFactory: () => 'stage1-target',
  });
  const adapter = new SyntheticDeploymentAdapter({
    store: deploymentStore,
    now: () => Date.parse('2026-09-19T08:00:00.000Z'),
  });

  return {
    root,
    store,
    deploymentStore,
    adapter,
    mediaRoot,
    publicRoot,
    packageRoot,
    deploymentStatePath,
  };
}

function createRelease(store, slug) {
  const snapshot = store.snapshot(slug);
  const result = store.createRelease(slug, snapshot.revision, snapshot.draftDigest);
  assert.equal(result.ok, true);
  return result.release;
}

function editTaglineAndRelease(store, slug, tagline) {
  let snapshot = store.snapshot(slug);
  const edited = store.editTagline(
    slug,
    tagline,
    snapshot.revision,
    snapshot.draftDigest,
  );
  assert.equal(edited.ok, true);
  snapshot = store.snapshot(slug);
  return createRelease(store, slug);
}

test('Era 7 Stage 1: deployment state persists outside HostGraph and rejects secret-shaped fields', (t) => {
  const { store, deploymentStore, deploymentStatePath } = fixture(t);
  const beforeHost = JSON.stringify(store.snapshot('harbor-and-hearth'));

  const draft = deploymentStore.createDraft({
    hostSlug: 'harbor-and-hearth',
    providerKind: 'synthetic-offline',
    providerProfile: 'synthetic-local',
    capabilities: ['VERIFY_TARGET', 'DEPLOY_RELEASE', 'ROLLBACK'],
  });
  assert.equal(draft.state, 'target-draft');
  assert.equal(fs.existsSync(deploymentStatePath), true);

  const restarted = new FileDeploymentStore({ statePath: deploymentStatePath });
  assert.equal(restarted.get(draft.id).hostSlug, 'harbor-and-hearth');
  assert.deepEqual(restarted.get(draft.id).capabilities, [
    'DEPLOY_RELEASE',
    'ROLLBACK',
    'VERIFY_TARGET',
  ]);

  assert.throws(
    () => restarted.setTargetPublicFacts(draft.id, { apiToken: 'must-not-persist' }),
    (error) => error.code === 'DEPLOYMENT_SECRET_REJECTED',
  );
  assert.throws(
    () => restarted.transition(draft.id, 'target-ready', {
      patch: { targetPublicFacts: { privateKey: 'must-not-persist' } },
    }),
    (error) => error.code === 'DEPLOYMENT_SECRET_REJECTED',
  );

  assert.equal(JSON.stringify(store.snapshot('harbor-and-hearth')), beforeHost);
  externalZero(store);
});

test('Era 7 Stage 1: exact Release package is deterministic and rejects media tampering', (t) => {
  const { store, mediaRoot, publicRoot, packageRoot } = fixture(t);
  const slug = 'harbor-and-hearth';
  const release = createRelease(store, slug);

  const first = buildDeploymentPackage({
    store,
    hostSlug: slug,
    releaseId: release.id,
    mediaRoot,
    publicRoot,
    packageRoot,
  });
  assert.equal(first.releaseId, release.id);
  assert.equal(first.releaseDigest, release.digest);
  assert.match(first.packageDigest, /^[a-f0-9]{64}$/);
  assert.equal(first.media.length, 1);
  assert.equal(first.media[0].sha256, release.snapshot.media[0].asset.sha256);
  assert.equal(fs.existsSync(path.join(first.packagePath, 'manifest.json')), true);
  assert.equal(fs.existsSync(path.join(first.packagePath, 'release.json')), true);
  assert.equal(fs.existsSync(path.join(first.packagePath, first.media[0].packagePath)), true);

  const second = buildDeploymentPackage({
    store,
    hostSlug: slug,
    releaseId: release.id,
    mediaRoot,
    publicRoot,
    packageRoot,
  });
  assert.equal(second.packageDigest, first.packageDigest);
  assert.equal(second.packagePath, first.packagePath);
  assert.equal(second.reused, true);

  const tamperedRoot = path.join(path.dirname(publicRoot), 'tampered-public');
  const tamperedAsset = path.join(tamperedRoot, 'hivenues', 'media', 'harbor-hearth-table.svg');
  fs.mkdirSync(path.dirname(tamperedAsset), { recursive: true });
  fs.copyFileSync(path.join(publicRoot, 'hivenues', 'media', 'harbor-hearth-table.svg'), tamperedAsset);
  fs.appendFileSync(tamperedAsset, '\n<!-- tampered -->\n');

  assert.throws(
    () => buildDeploymentPackage({
      store,
      hostSlug: slug,
      releaseId: release.id,
      mediaRoot,
      publicRoot: tamperedRoot,
      packageRoot: path.join(path.dirname(packageRoot), 'tampered-packages'),
    }),
    (error) => (
      error.code === 'DEPLOYMENT_MEDIA_BYTES_MISMATCH'
      || error.code === 'DEPLOYMENT_MEDIA_DIGEST_MISMATCH'
    ),
  );

  externalZero(store);
});

test('Era 7 Stage 1: synthetic adapter proves Release A to B, degraded state, rollback and disconnect with zero external effects', (t) => {
  const {
    store,
    deploymentStore,
    adapter,
    mediaRoot,
    publicRoot,
    packageRoot,
    deploymentStatePath,
  } = fixture(t);
  const slug = 'harbor-and-hearth';

  const releaseA = createRelease(store, slug);
  const packageA = buildDeploymentPackage({
    store,
    hostSlug: slug,
    releaseId: releaseA.id,
    mediaRoot,
    publicRoot,
    packageRoot,
  });

  const target = deploymentStore.createDraft({
    hostSlug: slug,
    providerKind: adapter.profile().kind,
    providerProfile: adapter.profile().profile,
    capabilities: adapter.profile().capabilities,
  });
  deploymentStore.selectRelease(target.id, releaseA);
  deploymentStore.recordPackage(target.id, packageA);
  adapter.markTargetReady(target.id);
  adapter.verify(target.id);
  let record = adapter.deploy(target.id, packageA, {
    sourceSha: 'synthetic-stage1-runtime',
    sourceTree: 'synthetic-stage1-tree',
  });
  assert.equal(record.state, 'healthy');
  assert.equal(record.activeRelease.id, releaseA.id);
  assert.equal(record.activeRelease.digest, releaseA.digest);
  assert.equal(record.previousRelease, null);

  const releaseB = editTaglineAndRelease(store, slug, 'Dinner follows the tide — Stage 1 B.');
  const packageB = buildDeploymentPackage({
    store,
    hostSlug: slug,
    releaseId: releaseB.id,
    mediaRoot,
    publicRoot,
    packageRoot,
  });
  deploymentStore.selectRelease(target.id, releaseB);
  deploymentStore.recordPackage(target.id, packageB);
  record = adapter.deploy(target.id, packageB);
  assert.equal(record.state, 'rollback-available');
  assert.equal(record.activeRelease.id, releaseB.id);
  assert.equal(record.previousRelease.id, releaseA.id);

  record = adapter.degrade(target.id);
  assert.equal(record.state, 'degraded');
  assert.equal(record.healthState, 'degraded');

  record = adapter.rollback(target.id);
  assert.equal(record.state, 'rollback-available');
  assert.equal(record.activeRelease.id, releaseA.id);
  assert.equal(record.previousRelease.id, releaseB.id);
  assert.equal(record.healthState, 'healthy');

  const restarted = new FileDeploymentStore({ statePath: deploymentStatePath });
  assert.equal(restarted.get(target.id).activeRelease.id, releaseA.id);
  assert.equal(restarted.get(target.id).previousRelease.id, releaseB.id);

  const disconnected = new SyntheticDeploymentAdapter({ store: restarted }).disconnect(target.id);
  assert.equal(disconnected.state, 'disconnected');
  assert.equal(disconnected.authorityRef, null);
  assert.equal(store.snapshot(slug).releases.some((item) => item.id === releaseA.id), true);
  assert.equal(store.snapshot(slug).releases.some((item) => item.id === releaseB.id), true);
  externalZero(store);
});

test('Era 7 Stage 1: Studio exercises only the synthetic local deployment lifecycle', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-era7-stage1-router-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const statePath = path.join(root, 'workspace', 'state.json');
  const mediaRoot = path.join(root, 'media');
  const deploymentStatePath = path.join(root, 'deployment', 'state.json');
  const packageRoot = path.join(root, 'deployment', 'packages');
  const publicRoot = path.join(root, 'public');
  const sourceAsset = path.join(SOURCE_PUBLIC_ROOT, 'hivenues', 'media', 'harbor-hearth-table.svg');
  const copiedAsset = path.join(publicRoot, 'hivenues', 'media', 'harbor-hearth-table.svg');
  fs.mkdirSync(path.dirname(copiedAsset), { recursive: true });
  fs.copyFileSync(sourceAsset, copiedAsset);

  const store = new ProvisioningFileHiVenuesStore({ statePath, mediaRoot });
  const releaseA = createRelease(store, 'harbor-and-hearth');
  const deploymentServices = createLocalDeploymentServices({
    store,
    statePath: deploymentStatePath,
    packageRoot,
    mediaRoot,
    publicRoot,
    now: () => Date.parse('2026-09-19T09:00:00.000Z'),
    idFactory: () => 'router-target',
  });
  const app = createHiVenuesApp({
    store,
    identityServices: false,
    participationServices: false,
    deploymentServices,
  });

  const studio = await request(app)
    .get('/hivenues/studio/harbor-and-hearth')
    .expect(200);
  assert.match(studio.text, /data-studio-deployment/);

  let response = await request(app)
    .get('/hivenues/studio/harbor-and-hearth/deploy')
    .expect(200);
  assert.match(response.text, /data-deployment-stage1/);
  assert.match(response.text, /data-deployment-profile/);
  assert.match(response.text, /data-deployment-stage1-boundary/);

  await request(app)
    .post('/hivenues/studio/harbor-and-hearth/deploy/targets')
    .expect(303);

  const target = deploymentServices.deploymentStore.list('harbor-and-hearth')[0];
  assert(target);
  assert.equal(target.state, 'target-draft');

  await request(app)
    .post(`/hivenues/studio/harbor-and-hearth/deploy/${target.id}/release`)
    .type('form')
    .send({ releaseId: releaseA.id })
    .expect(303);

  await request(app)
    .post(`/hivenues/studio/harbor-and-hearth/deploy/${target.id}/target-ready`)
    .expect(303);
  await request(app)
    .post(`/hivenues/studio/harbor-and-hearth/deploy/${target.id}/verify`)
    .expect(303);
  await request(app)
    .post(`/hivenues/studio/harbor-and-hearth/deploy/${target.id}/deploy`)
    .expect(303);

  response = await request(app)
    .get('/hivenues/studio/harbor-and-hearth/deploy')
    .expect(200);
  assert.match(response.text, new RegExp('data-deployment-record="' + target.id + '"'));
  assert.match(response.text, /data-active-release/);
  assert.equal(deploymentServices.deploymentStore.get(target.id).activeRelease.id, releaseA.id);

  externalZero(store);
});
