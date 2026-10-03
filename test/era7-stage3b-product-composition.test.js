'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  InstalledRemoteDeploymentService,
  materializeInstalledRuntimeBundle,
} = require('../src/product/deployment-execution');
const { createDeploymentPackageBuilder } = require('../src/product/deployment-package');
const { FileDeploymentStore } = require('../src/product/deployment-store');
const { ProvisioningFileHiVenuesStore } = require('../src/product/provisioning-file-store');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-era7-stage3b-composition-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const slug = 'harbor-and-hearth';
  const hostStore = new ProvisioningFileHiVenuesStore({
    statePath: path.join(root, 'workspace', 'state.json'),
    mediaRoot: path.join(root, 'media'),
  });
  let snapshot = hostStore.snapshot(slug);
  const released = hostStore.createRelease(slug, snapshot.revision, snapshot.draftDigest);
  assert.equal(released.ok, true);

  const packageBuilder = createDeploymentPackageBuilder({
    store: hostStore,
    mediaRoot: path.join(root, 'media'),
    publicRoot: path.join(PROJECT_ROOT, 'public'),
    packageRoot: path.join(root, 'packages'),
  });
  const packageRecord = packageBuilder.build({
    hostSlug: slug,
    releaseId: released.release.id,
  });

  const deploymentStore = new FileDeploymentStore({
    statePath: path.join(root, 'deployment', 'state.json'),
    now: () => Date.parse('2026-09-19T17:00:00.000Z'),
    idFactory: () => 'stage3b-composition',
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
  deploymentStore.setAuthorityRef(deployment.id, 'authority-stage3b-composition');
  deploymentStore.setTargetPublicFacts(deployment.id, {
    host: '203.0.113.55',
    port: 22,
    username: 'root',
    trustedHostKeyFingerprint: 'SHA256:' + 'Q'.repeat(43),
    observedHostKeyFingerprint: 'SHA256:' + 'Q'.repeat(43),
    hostKeyTrustState: 'trusted',
    verifiedOs: 'Debian GNU/Linux 13',
    verifiedArchitecture: 'x86_64',
    verifiedMemoryMb: 1024,
    verifiedDiskMb: 20480,
    verifiedPublicTcpPorts: [22],
    verifiedUnexpectedPublicTcpPorts: [],
    verifiedSystemCaddyActive: false,
    verifiedHiVenuesCaddyActive: false,
    verifiedHiVenuesFirewallActive: false,
    verifiedDedicatedTarget: true,
    verifiedTargetConflicts: [],
  });
  deploymentStore.transition(deployment.id, 'target-ready', {
    reason: 'server-public-facts-recorded',
  });
  deploymentStore.transition(deployment.id, 'verifying', {
    reason: 'ssh-read-only-verification',
  });
  deploymentStore.transition(deployment.id, 'bootstrap-ready', {
    reason: 'ssh-read-only-verification-passed',
  });
  deploymentStore.selectRelease(deployment.id, released.release);
  deploymentStore.recordPackage(deployment.id, packageRecord);

  const buildProvenance = {
    sourceSha: 'a'.repeat(40),
    sourceTree: 'b'.repeat(40),
    nodeVersion: 'v24.19.0',
    packageVersion: '1.0.0',
  };

  return {
    root,
    slug,
    hostStore,
    released: released.release,
    packageBuilder,
    packageRecord,
    deploymentStore,
    deploymentId: deployment.id,
    buildProvenance,
  };
}

function exactFakeTargetFactory(capture) {
  return (options) => {
    capture.options = options;
    let runtime = null;
    let release = null;
    let active = false;
    return {
      async installRuntime(runtimeRoot) {
        runtime = JSON.parse(
          fs.readFileSync(path.join(runtimeRoot, 'runtime-provenance.json'), 'utf8'),
        );
        return { provenance: runtime, path: '/opt/hivenues/runtime/' + runtime.bundleDigest };
      },
      async installRelease(packageRoot) {
        release = JSON.parse(
          fs.readFileSync(path.join(packageRoot, 'manifest.json'), 'utf8'),
        );
        return { manifest: release, path: '/srv/hivenues/releases/' + release.releaseId };
      },
      async activate() {
        active = true;
      },
      async readBack() {
        if (!active) return null;
        return {
          status: 'healthy',
          runtime: {
            sourceSha: runtime.sourceSha,
            sourceTree: runtime.sourceTree,
            packageVersion: runtime.packageVersion,
            nodeVersion: runtime.nodeVersion,
            bundleDigest: runtime.bundleDigest,
          },
          deployment: {
            hostSlug: release.hostSlug,
            releaseId: release.releaseId,
            releaseDigest: release.releaseDigest,
            packageDigest: release.packageDigest,
          },
          bootstrap: {
            profile: 'debian-systemd-caddy-v1',
            runtimeUser: 'hivenues',
            deploymentUser: 'hivenues-deploy',
            runtimePort: 4317,
            authorityState: 'restricted-deployment-user',
          },
        };
      },
    };
  };
}

test('Era 7 Stage 3B composition: installed provenance deterministically materializes the public runtime without Git', (t) => {
  const f = fixture(t);
  const service = new InstalledRemoteDeploymentService({
    deploymentStore: f.deploymentStore,
    packageBuilder: f.packageBuilder,
    authorityStore: {},
    runtimeBundlesRoot: path.join(f.root, 'runtime-bundles'),
    buildProvenance: f.buildProvenance,
    targetFactory: () => { throw new Error('target must not be constructed during review'); },
  });

  const first = service.prepareReview(f.deploymentId);
  const second = service.prepareReview(f.deploymentId);

  assert.equal(first.reviewDigest, second.reviewDigest);
  assert.equal(first.runtime.sourceSha, f.buildProvenance.sourceSha);
  assert.equal(first.runtime.sourceTree, f.buildProvenance.sourceTree);
  assert.equal(first.runtime.nodeVersion, 'v24.19.0');
  assert.equal(first.release.id, f.released.id);
  assert.equal(first.release.digest, f.released.digest);
  assert.equal(first.release.packageDigest, f.packageRecord.packageDigest);
  assert.equal(first.target.host, '203.0.113.55');
  assert.equal(first.target.trustedHostKeyFingerprint, 'SHA256:' + 'Q'.repeat(43));

  const bundles = fs.readdirSync(path.join(f.root, 'runtime-bundles'));
  assert.equal(bundles.length, 1);
  assert.equal(
    fs.existsSync(path.join(f.root, 'runtime-bundles', bundles[0], 'runtime-provenance.json')),
    true,
  );
});

test('Era 7 Stage 3B composition: explicit exact review drives the qualified coordinator path', async (t) => {
  const f = fixture(t);
  const capture = {};
  const service = new InstalledRemoteDeploymentService({
    deploymentStore: f.deploymentStore,
    packageBuilder: f.packageBuilder,
    authorityStore: {},
    runtimeBundlesRoot: path.join(f.root, 'runtime-bundles'),
    buildProvenance: f.buildProvenance,
    targetFactory: exactFakeTargetFactory(capture),
    now: () => Date.parse('2026-09-19T17:15:00.000Z'),
  });
  const review = service.prepareReview(f.deploymentId);

  await assert.rejects(
    () => service.deploy(f.deploymentId, {
      reviewDigest: review.reviewDigest,
      confirmation: '',
    }),
    (error) => error.code === 'DEPLOYMENT_CONSEQUENCE_CONFIRMATION_REQUIRED',
  );

  const result = await service.deploy(f.deploymentId, {
    reviewDigest: review.reviewDigest,
    confirmation: 'deploy-exact-release',
  });

  assert.equal(result.state, 'healthy');
  assert.equal(result.activeRelease.id, f.released.id);
  assert.equal(result.activeRelease.packageDigest, f.packageRecord.packageDigest);
  assert.equal(result.runtimeProfile.sourceSha, f.buildProvenance.sourceSha);
  assert.equal(result.runtimeProfile.sourceTree, f.buildProvenance.sourceTree);
  assert.equal(capture.options.target.username, 'root');
  assert.equal(capture.options.bootstrapUsername, 'root');
  assert.equal(capture.options.expectedHostKeyFingerprint, 'SHA256:' + 'Q'.repeat(43));
  assert.equal(capture.options.authorityId, 'authority-stage3b-composition');
});

test('Era 7 Stage 3B composition: a stale consequence review cannot mutate a changed Release selection', async (t) => {
  const f = fixture(t);
  let targetConstructed = false;
  const service = new InstalledRemoteDeploymentService({
    deploymentStore: f.deploymentStore,
    packageBuilder: f.packageBuilder,
    authorityStore: {},
    runtimeBundlesRoot: path.join(f.root, 'runtime-bundles'),
    buildProvenance: f.buildProvenance,
    targetFactory: () => {
      targetConstructed = true;
      throw new Error('stale review must fail before target construction');
    },
  });
  const review = service.prepareReview(f.deploymentId);

  let snapshot = f.hostStore.snapshot(f.slug);
  const edited = f.hostStore.editTagline(
    f.slug,
    'A newer immutable Release for stale-review qualification.',
    snapshot.revision,
    snapshot.draftDigest,
  );
  assert.equal(edited.ok, true);
  snapshot = f.hostStore.snapshot(f.slug);
  const releasedB = f.hostStore.createRelease(f.slug, snapshot.revision, snapshot.draftDigest);
  assert.equal(releasedB.ok, true);
  const packageB = f.packageBuilder.build({
    hostSlug: f.slug,
    releaseId: releasedB.release.id,
  });
  f.deploymentStore.selectRelease(f.deploymentId, releasedB.release);
  f.deploymentStore.recordPackage(f.deploymentId, packageB);

  await assert.rejects(
    () => service.deploy(f.deploymentId, {
      reviewDigest: review.reviewDigest,
      confirmation: 'deploy-exact-release',
    }),
    (error) => error.code === 'DEPLOYMENT_CONSEQUENCE_REVIEW_STALE',
  );
  assert.equal(targetConstructed, false);
});

test('Era 7 Stage 3C: exact read-back diagnostic is read-only and names the mismatched field', async (t) => {
  const f = fixture(t);
  const calls = {
    readBack: 0,
    mutation: 0,
  };
  let review;
  const service = new InstalledRemoteDeploymentService({
    deploymentStore: f.deploymentStore,
    packageBuilder: f.packageBuilder,
    authorityStore: {},
    runtimeBundlesRoot: path.join(f.root, 'runtime-bundles'),
    buildProvenance: f.buildProvenance,
    targetFactory: () => ({
      async readBack() {
        calls.readBack += 1;
        return {
          status: 'healthy',
          runtime: {
            ...review.runtime,
            sourceSha: 'f'.repeat(40),
          },
          deployment: {
            hostSlug: f.slug,
            releaseId: review.release.id,
            releaseDigest: review.release.digest,
            packageDigest: review.release.packageDigest,
          },
          bootstrap: {
            authorityState: 'restricted-login-proven',
          },
        };
      },
      async installRuntime() {
        calls.mutation += 1;
        throw new Error('read-back diagnostic must not install runtime');
      },
      async installRelease() {
        calls.mutation += 1;
        throw new Error('read-back diagnostic must not install release');
      },
      async activate() {
        calls.mutation += 1;
        throw new Error('read-back diagnostic must not activate');
      },
      async finalizeAuthorityNarrowing() {
        calls.mutation += 1;
        throw new Error('read-back diagnostic must not narrow authority');
      },
    }),
  });
  review = service.prepareReview(f.deploymentId);

  const diagnostic = await service.inspectReadBack(f.deploymentId);

  assert.equal(calls.readBack, 2);
  assert.equal(calls.mutation, 0);
  assert.equal(diagnostic.matches, false);
  assert.deepEqual(diagnostic.mismatches, ['runtime.sourceSha']);
  assert.equal(diagnostic.expected.runtime.sourceSha, f.buildProvenance.sourceSha);
  assert.equal(diagnostic.actual.runtime.sourceSha, 'f'.repeat(40));
});

test('Era 7 Stage 3C: exact read-back diagnostic distinguishes unavailable read-back', async (t) => {
  const f = fixture(t);
  const service = new InstalledRemoteDeploymentService({
    deploymentStore: f.deploymentStore,
    packageBuilder: f.packageBuilder,
    authorityStore: {},
    runtimeBundlesRoot: path.join(f.root, 'runtime-bundles'),
    buildProvenance: f.buildProvenance,
    targetFactory: () => ({
      async readBack() {
        return null;
      },
    }),
  });

  const diagnostic = await service.inspectReadBack(f.deploymentId);

  assert.equal(diagnostic.actual, null);
  assert.equal(diagnostic.matches, false);
  assert.deepEqual(diagnostic.mismatches, ['readback-unavailable']);
});

test('Era 7 Stage 3C: interrupted recovery proof finds cached predecessor runtime and restricted authority', async (t) => {
  const f = fixture(t);
  const runtimeBundlesRoot = path.join(f.root, 'runtime-bundles');
  const predecessor = materializeInstalledRuntimeBundle({
    runtimeBundlesRoot,
    buildProvenance: {
      sourceSha: 'c'.repeat(40),
      sourceTree: 'd'.repeat(40),
      nodeVersion: 'v24.19.0',
      packageVersion: '1.0.0',
    },
  });
  const reviewService = new InstalledRemoteDeploymentService({
    deploymentStore: f.deploymentStore,
    packageBuilder: f.packageBuilder,
    authorityStore: {},
    runtimeBundlesRoot,
    buildProvenance: f.buildProvenance,
    targetFactory: () => ({ async readBack() { return null; } }),
  });
  const currentReview = reviewService.prepareReview(f.deploymentId);

  let mutationCalls = 0;
  const service = new InstalledRemoteDeploymentService({
    deploymentStore: f.deploymentStore,
    packageBuilder: f.packageBuilder,
    authorityStore: {},
    runtimeBundlesRoot,
    buildProvenance: f.buildProvenance,
    targetFactory: (options) => ({
      async readBack() {
        return {
          status: 'healthy',
          runtime: {
            sourceSha: predecessor.provenance.sourceSha,
            sourceTree: predecessor.provenance.sourceTree,
            packageVersion: predecessor.provenance.packageVersion,
            nodeVersion: predecessor.provenance.nodeVersion,
            bundleDigest: predecessor.provenance.bundleDigest,
          },
          deployment: {
            hostSlug: f.slug,
            releaseId: currentReview.release.id,
            releaseDigest: currentReview.release.digest,
            packageDigest: currentReview.release.packageDigest,
          },
          bootstrap: {
            authorityState: options.target.username === 'hivenues-deploy'
              ? 'restricted-login-proven'
              : 'bootstrap-admin',
          },
        };
      },
      async installRuntime() {
        mutationCalls += 1;
      },
      async installRelease() {
        mutationCalls += 1;
      },
      async activate() {
        mutationCalls += 1;
      },
      async finalizeAuthorityNarrowing() {
        mutationCalls += 1;
      },
    }),
  });

  const diagnostic = await service.inspectReadBack(f.deploymentId);

  assert.equal(mutationCalls, 0);
  assert.equal(diagnostic.matches, false);
  assert.equal(diagnostic.recovery.cachedRuntimeMatch, true);
  assert.equal(diagnostic.recovery.releaseMatches, true);
  assert.equal(diagnostic.recovery.restrictedMatchesObserved, true);
  assert.equal(diagnostic.recovery.restrictedAuthorityState, 'restricted-login-proven');
  assert.equal(diagnostic.recovery.recoverable, true);
  assert.equal(
    diagnostic.recovery.cachedRuntime.provenance.bundleDigest,
    predecessor.provenance.bundleDigest,
  );
});

test('Era 7 Stage 3C: recovery finalization narrows authority and adopts proven runtime without redeploy', async (t) => {
  const f = fixture(t);
  const runtimeBundlesRoot = path.join(f.root, 'runtime-bundles');
  const recoveredRuntime = materializeInstalledRuntimeBundle({
    runtimeBundlesRoot,
    buildProvenance: {
      sourceSha: 'c'.repeat(40),
      sourceTree: 'd'.repeat(40),
      nodeVersion: 'v24.19.0',
      packageVersion: '1.0.0',
    },
  });

  f.deploymentStore.transition(f.deploymentId, 'deploying', {
    reason: 'legacy-interrupted-first-deploy',
    patch: { healthState: 'checking' },
  });
  f.deploymentStore.transition(f.deploymentId, 'degraded', {
    reason: 'legacy-interrupted-first-deploy',
    patch: { healthState: 'degraded' },
  });

  let authorityState = 'restricted-login-proven';
  let finalizations = 0;
  let forbiddenMutationCalls = 0;
  const service = new InstalledRemoteDeploymentService({
    deploymentStore: f.deploymentStore,
    packageBuilder: f.packageBuilder,
    authorityStore: {},
    runtimeBundlesRoot,
    buildProvenance: f.buildProvenance,
    targetFactory: (options) => ({
      async readBack() {
        return {
          status: 'healthy',
          runtime: { ...recoveredRuntime.provenance },
          deployment: {
            hostSlug: f.slug,
            releaseId: f.packageRecord.releaseId,
            releaseDigest: f.packageRecord.releaseDigest,
            packageDigest: f.packageRecord.packageDigest,
          },
          bootstrap: {
            authorityState: options.target.username === 'hivenues-deploy'
              ? authorityState
              : 'bootstrap-admin',
          },
        };
      },
      async finalizeAuthorityNarrowing(plan) {
        assert.equal(options.target.username, 'hivenues-deploy');
        assert.equal(plan.deploymentUser, 'hivenues-deploy');
        finalizations += 1;
        authorityState = 'restricted-deployment-user';
        return true;
      },
      async installRuntime() {
        forbiddenMutationCalls += 1;
        throw new Error('recovery finalization must not install runtime');
      },
      async installRelease() {
        forbiddenMutationCalls += 1;
        throw new Error('recovery finalization must not install Release');
      },
      async activate() {
        forbiddenMutationCalls += 1;
        throw new Error('recovery finalization must not activate services');
      },
    }),
  });

  const review = await service.prepareRecoveryFinalization(f.deploymentId);
  assert.equal(review.authority.observed, 'restricted-login-proven');
  assert.equal(review.authority.serverMutationRequired, true);
  assert.equal(review.runtime.bundleDigest, recoveredRuntime.provenance.bundleDigest);

  const result = await service.finalizeInterruptedRecovery(f.deploymentId, {
    reviewDigest: review.reviewDigest,
    confirmation: 'finalize-interrupted-recovery',
  });

  assert.equal(forbiddenMutationCalls, 0);
  assert.equal(finalizations, 1);
  assert.equal(result.state, 'healthy');
  assert.equal(result.healthState, 'healthy');
  assert.equal(result.activeRelease.id, f.packageRecord.releaseId);
  assert.equal(result.activeRelease.packageDigest, f.packageRecord.packageDigest);
  assert.equal(result.runtimeProfile.bundleDigest, recoveredRuntime.provenance.bundleDigest);
  assert.equal(result.pendingRuntimeProfile, null);
  assert.equal(result.targetPublicFacts.username, 'hivenues-deploy');
  assert.equal(result.targetPublicFacts.bootstrapUsername, 'root');
  assert.equal(
    result.targetPublicFacts.bootstrapAuthorityState,
    'restricted-deployment-user',
  );
});

test('Era 7 Stage 3C: post-narrowing crash remains recoverable when provider account no longer authenticates', async (t) => {
  const f = fixture(t);
  const runtimeBundlesRoot = path.join(f.root, 'runtime-bundles');
  const recoveredRuntime = materializeInstalledRuntimeBundle({
    runtimeBundlesRoot,
    buildProvenance: {
      sourceSha: 'c'.repeat(40),
      sourceTree: 'd'.repeat(40),
      nodeVersion: 'v24.19.0',
      packageVersion: '1.0.0',
    },
  });
  f.deploymentStore.setPendingRuntimeProfile(
    f.deploymentId,
    recoveredRuntime.provenance,
  );
  f.deploymentStore.transition(f.deploymentId, 'deploying', {
    reason: 'simulated-crash-after-authority-narrowing',
    patch: { healthState: 'checking' },
  });
  f.deploymentStore.transition(f.deploymentId, 'degraded', {
    reason: 'simulated-crash-after-authority-narrowing',
    patch: { healthState: 'degraded' },
  });

  const service = new InstalledRemoteDeploymentService({
    deploymentStore: f.deploymentStore,
    packageBuilder: f.packageBuilder,
    authorityStore: {},
    runtimeBundlesRoot,
    buildProvenance: f.buildProvenance,
    targetFactory: (options) => ({
      async readBack() {
        if (options.target.username !== 'hivenues-deploy') return null;
        return {
          status: 'healthy',
          runtime: { ...recoveredRuntime.provenance },
          deployment: {
            hostSlug: f.slug,
            releaseId: f.packageRecord.releaseId,
            releaseDigest: f.packageRecord.releaseDigest,
            packageDigest: f.packageRecord.packageDigest,
          },
          bootstrap: {
            authorityState: 'restricted-deployment-user',
          },
        };
      },
    }),
  });

  const diagnostic = await service.inspectReadBack(f.deploymentId);

  assert.equal(diagnostic.actual, null);
  assert.equal(diagnostic.recovery.restrictedAuthorityState, 'restricted-deployment-user');
  assert.equal(diagnostic.recovery.providerConsistency, true);
  assert.equal(diagnostic.recovery.cachedRuntimeMatch, true);
  assert.equal(diagnostic.recovery.releaseMatches, true);
  assert.equal(diagnostic.recovery.recoverable, true);

  const review = await service.prepareRecoveryFinalization(f.deploymentId);
  assert.equal(review.authority.serverMutationRequired, false);
});

