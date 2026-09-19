'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { buildPublicRuntimeBundle } = require('../scripts/era7/build-public-runtime-bundle');
const { createReferenceBootstrapPlan } = require('../src/deploy/bootstrap-plan');
const { ExactReleaseDeploymentCoordinator } = require('../src/deploy/deployment-coordinator');
const { LocalMutableDeploymentTarget } = require('../src/deploy/local-mutable-target');
const { FileDeploymentStore } = require('../src/product/deployment-store');
const { buildDeploymentPackage } = require('../src/product/deployment-package');
const { ProvisioningFileHiVenuesStore } = require('../src/product/provisioning-file-store');

const PROJECT_ROOT = path.resolve(__dirname, '..');

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

function createRelease(store, slug) {
  const snapshot = store.snapshot(slug);
  const result = store.createRelease(slug, snapshot.revision, snapshot.draftDigest);
  assert.equal(result.ok, true);
  return result.release;
}

function editAndRelease(store, slug, tagline) {
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

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-era7-stage3a-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const slug = 'harbor-and-hearth';
  const store = new ProvisioningFileHiVenuesStore({
    statePath: path.join(root, 'workspace', 'state.json'),
    mediaRoot: path.join(root, 'media'),
  });
  const releaseA = createRelease(store, slug);
  const packageA = buildDeploymentPackage({
    store,
    hostSlug: slug,
    releaseId: releaseA.id,
    mediaRoot: path.join(root, 'media'),
    publicRoot: path.join(PROJECT_ROOT, 'public'),
    packageRoot: path.join(root, 'packages'),
  });
  const runtimeRoot = path.join(root, 'runtime-bundle');
  const runtime = buildPublicRuntimeBundle({
    outputRoot: runtimeRoot,
    sourceSha: '1'.repeat(40),
    sourceTree: '2'.repeat(40),
    nodeVersion: process.version,
  });

  const deploymentStore = new FileDeploymentStore({
    statePath: path.join(root, 'deployment', 'state.json'),
    now: () => Date.parse('2026-09-19T15:00:00.000Z'),
    idFactory: () => 'stage3a-target',
  });
  const deployment = deploymentStore.createDraft({
    hostSlug: slug,
    providerKind: 'ssh-server',
    providerProfile: 'privex-reference',
    capabilities: [
      'VERIFY_TARGET',
      'COMPUTE',
      'STORE',
      'PUBLISH',
      'BOOTSTRAP_RUNTIME',
      'DEPLOY_RELEASE',
      'HEALTH',
      'ROLLBACK',
    ],
  });
  deploymentStore.setTargetPublicFacts(deployment.id, {
    host: '127.0.0.1',
    port: 22,
    username: 'root',
    trustedHostKeyFingerprint: 'SHA256:Stage3AQualificationFingerprint000000000000000',
    hostKeyTrustState: 'trusted',
    verifiedOs: 'Debian GNU/Linux 13',
    verifiedArchitecture: 'x86_64',
    verifiedMemoryMb: 1024,
    verifiedDiskMb: 20480,
  });
  deploymentStore.setAuthorityRef(deployment.id, 'authority-stage3a');
  deploymentStore.transition(deployment.id, 'target-ready', {
    reason: 'stage3a-target-ready',
  });
  deploymentStore.transition(deployment.id, 'verifying', {
    reason: 'stage3a-verifying',
    patch: { healthState: 'checking' },
  });
  deploymentStore.transition(deployment.id, 'bootstrap-ready', {
    reason: 'stage3a-readonly-verification-passed',
    patch: { healthState: 'ready' },
  });
  deploymentStore.selectRelease(deployment.id, releaseA);
  deploymentStore.recordPackage(deployment.id, packageA);

  const target = new LocalMutableDeploymentTarget({
    root: path.join(root, 'remote-target'),
  });
  const coordinator = new ExactReleaseDeploymentCoordinator({
    store: deploymentStore,
    target,
    now: () => Date.parse('2026-09-19T15:00:00.000Z'),
  });

  return {
    root,
    slug,
    store,
    releaseA,
    packageA,
    runtimeRoot,
    runtime,
    deploymentStore,
    deploymentId: deployment.id,
    target,
    coordinator,
  };
}

test('Era 7 Stage 3A: reference bootstrap plan is fixed, least-privilege, and keeps domain/TLS held', (t) => {
  const f = fixture(t);
  const runtimeProvenance = JSON.parse(
    fs.readFileSync(path.join(f.runtimeRoot, 'runtime-provenance.json'), 'utf8'),
  );
  const releaseManifest = JSON.parse(
    fs.readFileSync(path.join(f.packageA.packagePath, 'manifest.json'), 'utf8'),
  );
  const plan = createReferenceBootstrapPlan({
    runtimeProvenance,
    releaseManifest,
  });

  assert.equal(plan.profile, 'debian-systemd-caddy-v1');
  assert.equal(plan.runtimeUser, 'hivenues');
  assert.equal(plan.deploymentUser, 'hivenues-deploy');
  assert.equal(plan.privilegeModel.initialAuthority, 'bootstrap-admin');
  assert.equal(plan.privilegeModel.initialRemoteAccount, 'root');
  assert.equal(plan.privilegeModel.steadyStateAuthority, 'restricted-deployment-user');
  assert.equal(plan.privilegeModel.steadyRemoteAccount, 'hivenues-deploy');
  assert.equal(plan.privilegeModel.runtimeLogin, false);
  assert.deepEqual(plan.privilegeModel.authorityNarrowing, [
    'create-restricted-deployment-account',
    'install-same-deployment-public-key',
    'prove-restricted-ssh-login',
    'remove-exact-bootstrap-authorized-key',
    'persist-restricted-remote-account',
  ]);
  assert.deepEqual(plan.ownership, {
    runtimeArtifacts: 'hivenues-deploy:hivenues',
    releaseArtifacts: 'hivenues-deploy:hivenues',
    runtimeState: 'hivenues:hivenues',
    rootConfiguration: 'root:root',
  });
  assert.equal(plan.runtime.bindHost, '127.0.0.1');
  assert.equal(plan.runtimePort, 4317);
  assert.equal(plan.runtime.installCommand, 'npm ci --omit=dev --ignore-scripts');
  assert.equal(plan.runtime.bundleDigest, f.runtime.bundleDigest);
  assert.equal(plan.release.releaseId, f.releaseA.id);
  assert.equal(plan.release.releaseDigest, f.releaseA.digest);
  assert.equal(plan.release.packageDigest, f.packageA.packageDigest);
  assert.deepEqual(plan.held, [
    'custom-domain',
    'dns-mutation',
    'tls-issuance',
    'provider-payment',
  ]);
});

test('Era 7 Stage 3A: exact Release deploy read-back is idempotent and never mutates HostGraph', (t) => {
  const f = fixture(t);
  const hostBefore = JSON.stringify(f.store.snapshot(f.slug));

  let result = f.coordinator.deploy(f.deploymentId, {
    runtimeRoot: f.runtimeRoot,
    releasePackageRoot: f.packageA.packagePath,
  });
  assert.equal(result.state, 'healthy');
  assert.equal(result.activeRelease.id, f.releaseA.id);
  assert.equal(result.activeRelease.digest, f.releaseA.digest);
  assert.equal(result.activeRelease.packageDigest, f.packageA.packageDigest);
  assert.equal(result.previousRelease, null);
  assert.equal(result.runtimeProfile.bundleDigest, f.runtime.bundleDigest);
  assert.equal(result.healthState, 'healthy');
  assert.equal(result.targetPublicFacts.username, 'hivenues-deploy');
  assert.equal(
    result.targetPublicFacts.bootstrapAuthorityState,
    'restricted-deployment-user',
  );

  const readBack = f.target.readBack();
  assert.equal(readBack.status, 'healthy');
  assert.equal(readBack.runtime.bundleDigest, f.runtime.bundleDigest);
  assert.equal(readBack.deployment.releaseId, f.releaseA.id);
  assert.equal(readBack.deployment.releaseDigest, f.releaseA.digest);
  assert.equal(readBack.deployment.packageDigest, f.packageA.packageDigest);
  assert.equal(readBack.bootstrap.authorityState, 'restricted-deployment-user');
  assert.equal(readBack.bootstrap.deploymentUser, 'hivenues-deploy');

  const targetFingerprint = f.target.fingerprint();
  const mutationsBefore = f.target.operations.filter((item) => (
    item === 'install-runtime'
    || item === 'install-release'
    || item === 'activate'
  )).length;

  result = f.coordinator.deploy(f.deploymentId, {
    runtimeRoot: f.runtimeRoot,
    releasePackageRoot: f.packageA.packagePath,
  });
  assert.equal(result.state, 'healthy');
  assert.equal(f.target.fingerprint(), targetFingerprint);
  const mutationsAfter = f.target.operations.filter((item) => (
    item === 'install-runtime'
    || item === 'install-release'
    || item === 'activate'
  )).length;
  assert.equal(mutationsAfter, mutationsBefore);

  assert.equal(JSON.stringify(f.store.snapshot(f.slug)), hostBefore);
  externalZero(f.store);
});

test('Era 7 Stage 3A: partial failure preserves Release A and safe retry activates Release B with rollback provenance', (t) => {
  const f = fixture(t);
  f.coordinator.deploy(f.deploymentId, {
    runtimeRoot: f.runtimeRoot,
    releasePackageRoot: f.packageA.packagePath,
  });

  const releaseB = editAndRelease(
    f.store,
    f.slug,
    'Dinner follows the tide — deployed Release B.',
  );
  const packageB = buildDeploymentPackage({
    store: f.store,
    hostSlug: f.slug,
    releaseId: releaseB.id,
    mediaRoot: path.join(f.root, 'media'),
    publicRoot: path.join(PROJECT_ROOT, 'public'),
    packageRoot: path.join(f.root, 'packages'),
  });
  f.deploymentStore.selectRelease(f.deploymentId, releaseB);
  f.deploymentStore.recordPackage(f.deploymentId, packageB);

  f.target.failAt = 'activate';
  assert.throws(
    () => f.coordinator.deploy(f.deploymentId, {
      runtimeRoot: f.runtimeRoot,
      releasePackageRoot: packageB.packagePath,
    }),
    (error) => error.code === 'DEPLOYED_TARGET_INJECTED_FAILURE',
  );

  let record = f.deploymentStore.get(f.deploymentId);
  assert.equal(record.state, 'degraded');
  assert.equal(record.healthState, 'degraded');
  assert.equal(record.activeRelease.id, f.releaseA.id);
  assert.equal(f.target.readBack().deployment.releaseId, f.releaseA.id);

  record = f.coordinator.deploy(f.deploymentId, {
    runtimeRoot: f.runtimeRoot,
    releasePackageRoot: packageB.packagePath,
  });
  assert.equal(record.state, 'rollback-available');
  assert.equal(record.activeRelease.id, releaseB.id);
  assert.equal(record.activeRelease.digest, releaseB.digest);
  assert.equal(record.previousRelease.id, f.releaseA.id);
  assert.equal(record.previousRelease.digest, f.releaseA.digest);
  assert.equal(record.rollbackState, 'available');
  assert.equal(f.target.readBack().deployment.releaseId, releaseB.id);

  const previous = f.target.previousReadBack();
  assert(previous);
  assert.equal(previous.release.releaseId, f.releaseA.id);
  externalZero(f.store);
});

test('Era 7 Stage 3A: mismatched Release artifact is rejected before mutation state begins', (t) => {
  const f = fixture(t);
  const releaseB = editAndRelease(f.store, f.slug, 'Mismatched Release B.');
  const packageB = buildDeploymentPackage({
    store: f.store,
    hostSlug: f.slug,
    releaseId: releaseB.id,
    mediaRoot: path.join(f.root, 'media'),
    publicRoot: path.join(PROJECT_ROOT, 'public'),
    packageRoot: path.join(f.root, 'packages'),
  });

  assert.throws(
    () => f.coordinator.deploy(f.deploymentId, {
      runtimeRoot: f.runtimeRoot,
      releasePackageRoot: packageB.packagePath,
    }),
    (error) => error.code === 'DEPLOYMENT_ARTIFACT_MISMATCH',
  );
  const record = f.deploymentStore.get(f.deploymentId);
  assert.equal(record.state, 'bootstrap-ready');
  assert.equal(f.target.readBack(), null);
  externalZero(f.store);
});
