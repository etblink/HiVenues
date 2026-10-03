'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createReferenceBootstrapPlan } = require('../src/deploy/bootstrap-plan');
const {
  rollbackPreflightCommand,
  removeDeploymentAuthorityCommand,
} = require('../src/deploy/ssh-remote-deployment-target');
const {
  createDomainPreflight,
  markTlsRequesting,
  recordDnsObservation,
  recordPublicReadBack,
  recordTlsObservation,
} = require('../src/product/deployment-publication');
const { FileDeploymentStore } = require('../src/product/deployment-store');
const { InstalledRemoteDeploymentService } = require('../src/product/deployment-execution');

const RELEASE_A = Object.freeze({
  id: 'release-stage5-a',
  digest: 'a'.repeat(64),
  packageDigest: 'b'.repeat(64),
});

const RELEASE_B = Object.freeze({
  id: 'release-stage5-b',
  digest: 'c'.repeat(64),
  packageDigest: 'd'.repeat(64),
});

const RUNTIME = Object.freeze({
  kind: 'hivenues-public-runtime',
  sourceSha: '1'.repeat(40),
  sourceTree: '2'.repeat(40),
  packageVersion: '1.0.0',
  nodeVersion: 'v24.19.0',
  bundleDigest: '3'.repeat(64),
});

function expectedReadBack(release) {
  return {
    status: 'healthy',
    runtime: {
      sourceSha: RUNTIME.sourceSha,
      sourceTree: RUNTIME.sourceTree,
      packageVersion: RUNTIME.packageVersion,
      nodeVersion: RUNTIME.nodeVersion,
      bundleDigest: RUNTIME.bundleDigest,
    },
    deployment: {
      hostSlug: 'harbor-and-hearth',
      releaseId: release.id,
      releaseDigest: release.digest,
      packageDigest: release.packageDigest,
    },
    bootstrap: {
      authorityState: 'restricted-deployment-user',
    },
  };
}

function verifiedEndpointFor(release) {
  let endpoint = createDomainPreflight({
    hostname: 'dev.fourthstreetbar.com',
    destinations: [{ kind: 'ipv4', value: '121.127.34.154' }],
  });
  endpoint = recordDnsObservation(endpoint, {
    checkedAt: '2026-10-03T20:30:00.000Z',
    resolver: 'synthetic-stage5a',
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
    validFrom: '2026-10-03T19:00:00.000Z',
    validTo: '2027-01-01T00:00:00.000Z',
    checkedAt: '2026-10-03T20:31:00.000Z',
  });
  return recordPublicReadBack(endpoint, {
    url: 'https://dev.fourthstreetbar.com/__hivenues/health',
    statusCode: 200,
    checkedAt: '2026-10-03T20:31:01.000Z',
    body: expectedReadBack(release),
  }, {
    runtime: {
      sourceSha: RUNTIME.sourceSha,
      sourceTree: RUNTIME.sourceTree,
      packageVersion: RUNTIME.packageVersion,
      nodeVersion: RUNTIME.nodeVersion,
      bundleDigest: RUNTIME.bundleDigest,
    },
    release: {
      hostSlug: 'harbor-and-hearth',
      releaseId: release.id,
      releaseDigest: release.digest,
      packageDigest: release.packageDigest,
    },
  });
}

function authorityFixture() {
  const state = { present: true, revokeCalls: 0 };
  return {
    state,
    publicRecord(id) {
      if (!state.present) {
        const error = new Error('authority missing');
        error.code = 'DEPLOYMENT_AUTHORITY_NOT_FOUND';
        throw error;
      }
      return {
        id,
        kind: 'ssh-key',
        publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCstage5a hivenues-deployment',
        publicKeyFingerprint: 'SHA256:' + 'K'.repeat(43),
      };
    },
    revoke() {
      if (!state.present) return false;
      state.present = false;
      state.revokeCalls += 1;
      return true;
    },
  };
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-stage5a-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const store = new FileDeploymentStore({
    statePath: path.join(root, 'deployment.json'),
    now: () => Date.parse('2026-10-03T20:32:00.000Z'),
    idFactory: () => 'deployment-stage5a',
  });
  const deployment = store.createDraft({
    hostSlug: 'harbor-and-hearth',
    providerKind: 'ssh-server',
    providerProfile: 'privex-reference',
    capabilities: ['DEPLOY_RELEASE', 'HEALTH', 'ROLLBACK', 'DECOMMISSION', 'DOMAIN', 'DNS', 'TLS', 'PUBLISH'],
  });
  store.setAuthorityRef(deployment.id, 'authority-stage5a');
  store.setTargetPublicFacts(deployment.id, {
    host: '121.127.34.154',
    port: 22,
    username: 'hivenues-deploy',
    bootstrapUsername: 'debian',
    trustedHostKeyFingerprint: 'SHA256:' + 'Z'.repeat(43),
    hostKeyTrustState: 'trusted',
    verifiedDedicatedTarget: true,
  });
  store.selectRelease(deployment.id, {
    id: RELEASE_B.id,
    digest: RELEASE_B.digest,
  });
  store.recordPackage(deployment.id, {
    schemaVersion: 1,
    releaseId: RELEASE_B.id,
    releaseDigest: RELEASE_B.digest,
    packageDigest: RELEASE_B.packageDigest,
  });
  store.transition(deployment.id, 'target-ready', { reason: 'test' });
  store.transition(deployment.id, 'verifying', { reason: 'test' });
  store.transition(deployment.id, 'bootstrap-ready', { reason: 'test' });
  store.transition(deployment.id, 'deploying', { reason: 'release-b-started' });
  store.transition(deployment.id, 'rollback-available', {
    reason: 'release-b-readback-match',
    patch: {
      activeRelease: {
        ...RELEASE_B,
        deployedAt: '2026-10-03T20:20:00.000Z',
      },
      previousRelease: {
        ...RELEASE_A,
        deployedAt: '2026-10-03T19:20:00.000Z',
      },
      runtimeProfile: RUNTIME,
      healthState: 'healthy',
      rollbackState: 'available',
      lastConfirmedAt: '2026-10-03T20:20:01.000Z',
    },
  });
  store.setPublicEndpoint(deployment.id, verifiedEndpointFor(RELEASE_B));

  const authorityStore = authorityFixture();
  const remote = {
    release: RELEASE_B,
    authorityAccessible: true,
    rollbackCalls: 0,
    removeCalls: 0,
  };
  const target = {
    async readBack() {
      return expectedReadBack(remote.release);
    },
    async publicationStatus() {
      return {
        capability: 'ready',
        status: {
          version: 1,
          capability: 'ready',
          state: 'configured',
          hostSlug: 'harbor-and-hearth',
          hostname: 'dev.fourthstreetbar.com',
        },
      };
    },
    async bootstrapAuthorityAccessible() {
      return false;
    },
    async activateExistingRelease(_plan, release) {
      remote.rollbackCalls += 1;
      remote.release = {
        id: release.id,
        digest: release.digest,
        packageDigest: release.packageDigest,
      };
      return { release: remote.release };
    },
    async deploymentAuthorityAccessible() {
      return remote.authorityAccessible;
    },
    async removeDeploymentAuthority(_plan, publicKey) {
      assert.match(publicKey, /^ssh-rsa /);
      remote.removeCalls += 1;
      remote.authorityAccessible = false;
      return { removed: true };
    },
  };

  const service = new InstalledRemoteDeploymentService({
    deploymentStore: store,
    packageBuilder: {
      build() {
        throw new Error('Stage 5A rollback/disconnect must not build or upload a new Release.');
      },
    },
    authorityStore,
    runtimeBundlesRoot: path.join(root, 'runtime-bundles'),
    buildProvenance: {
      sourceSha: 'f'.repeat(40),
      sourceTree: 'e'.repeat(40),
      nodeVersion: 'v24.19.0',
      packageVersion: '1.0.0',
    },
    targetFactory() {
      return target;
    },
    now: () => Date.parse('2026-10-03T20:33:00.000Z'),
  });

  return {
    root,
    store,
    deploymentId: deployment.id,
    authorityStore,
    remote,
    target,
    service,
  };
}

function reverifyPublicForActive(f) {
  const record = f.store.get(f.deploymentId);
  f.store.setPublicEndpoint(
    f.deploymentId,
    verifiedEndpointFor(record.activeRelease),
  );
}

test('Era 7 Stage 5A: rollback transport validates the already-installed exact Release before activation', () => {
  const plan = createReferenceBootstrapPlan({
    runtimeProvenance: RUNTIME,
    releaseManifest: {
      hostSlug: 'harbor-and-hearth',
      releaseId: RELEASE_A.id,
      releaseDigest: RELEASE_A.digest,
      packageDigest: RELEASE_A.packageDigest,
    },
    bootstrapUsername: 'debian',
  });
  const runtimePath = '/opt/hivenues/runtime/' + RUNTIME.bundleDigest;
  const releasePath = '/srv/hivenues/releases/' + RELEASE_A.id + '-' + RELEASE_A.digest.slice(0, 12);
  const command = rollbackPreflightCommand(plan, runtimePath, releasePath, RELEASE_A);

  assert.match(command, /rollback-preflight/);
  assert.match(command, /loadReleasePackage/);
  assert.match(command, new RegExp(RELEASE_A.id));
  assert.match(command, new RegExp(RELEASE_A.packageDigest));
  assert.doesNotMatch(command, /curl|sftp|npm ci|systemctl|caddy|nft/);
});

test('Era 7 Stage 5A: authority removal command touches only the steady account authorized_keys', () => {
  const plan = createReferenceBootstrapPlan({
    runtimeProvenance: RUNTIME,
    releaseManifest: {
      hostSlug: 'harbor-and-hearth',
      releaseId: RELEASE_A.id,
      releaseDigest: RELEASE_A.digest,
      packageDigest: RELEASE_A.packageDigest,
    },
    bootstrapUsername: 'debian',
  });
  const key = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCstage5a hivenues-deployment';
  const command = removeDeploymentAuthorityCommand(plan, key);

  assert.match(command, /deployment-authority-remove/);
  assert.match(command, /\/var\/lib\/hivenues-deploy\/\.ssh\/authorized_keys/);
  assert.match(command, /grep -vxF/);
  assert.doesNotMatch(command, /systemctl|caddy|nft|\/etc\/ssh|sshd_config|sudo -n/);
});

test('Era 7 Stage 5A: rollback review binds current B, previous A, runtime, target and public hostname', async (t) => {
  const f = fixture(t);

  const review = await f.service.prepareRollbackReview(f.deploymentId);

  assert.equal(review.currentRelease.id, RELEASE_B.id);
  assert.equal(review.rollbackRelease.id, RELEASE_A.id);
  assert.equal(review.runtime.bundleDigest, RUNTIME.bundleDigest);
  assert.equal(review.target.host, '121.127.34.154');
  assert.equal(review.hostname, 'dev.fourthstreetbar.com');
  assert.equal(review.remoteState, 'active-release');
  assert.match(review.reviewDigest, /^[a-f0-9]{64}$/);
  assert.equal(review.held.includes('runtime-upload-or-replacement'), true);
});

test('Era 7 Stage 5A: exact rollback swaps A/B only after remote read-back and invalidates stale public Release proof', async (t) => {
  const f = fixture(t);
  const review = await f.service.prepareRollbackReview(f.deploymentId);

  const result = await f.service.rollback(f.deploymentId, {
    reviewDigest: review.reviewDigest,
    confirmation: 'rollback-to-previous-release',
  });

  assert.equal(f.remote.rollbackCalls, 1);
  assert.equal(f.remote.release.id, RELEASE_A.id);
  assert.equal(result.activeRelease.id, RELEASE_A.id);
  assert.equal(result.previousRelease.id, RELEASE_B.id);
  assert.equal(result.runtimeProfile.bundleDigest, RUNTIME.bundleDigest);
  assert.equal(result.state, 'rollback-available');
  assert.equal(result.publicEndpoint.tls.state, 'verified');
  assert.equal(result.publicEndpoint.publicReadBack.state, 'unverified');
  assert.equal(
    result.publicEndpoint.publicReadBack.invalidatedReason,
    'deployment-identity-changed',
  );
});

test('Era 7 Stage 5A: interrupted remote rollback is adopted without activating the previous Release twice', async (t) => {
  const f = fixture(t);
  f.remote.release = RELEASE_A;

  const review = await f.service.prepareRollbackReview(f.deploymentId);
  assert.equal(review.remoteState, 'previous-release-already-active');

  const result = await f.service.rollback(f.deploymentId, {
    reviewDigest: review.reviewDigest,
    confirmation: 'rollback-to-previous-release',
  });

  assert.equal(f.remote.rollbackCalls, 0);
  assert.equal(result.activeRelease.id, RELEASE_A.id);
  assert.equal(result.previousRelease.id, RELEASE_B.id);
});

test('Era 7 Stage 5A: rollback refuses a server that matches neither admitted Release', async (t) => {
  const f = fixture(t);
  f.remote.release = {
    id: 'release-unknown',
    digest: '8'.repeat(64),
    packageDigest: '9'.repeat(64),
  };

  await assert.rejects(
    () => f.service.prepareRollbackReview(f.deploymentId),
    (error) => error.code === 'DEPLOYMENT_ROLLBACK_READBACK_MISMATCH',
  );
  assert.equal(f.remote.rollbackCalls, 0);
});

test('Era 7 Stage 5A: reviewed disconnect removes remote key, proves auth failure, revokes local key and preserves site state', async (t) => {
  const f = fixture(t);
  const rollbackReview = await f.service.prepareRollbackReview(f.deploymentId);
  await f.service.rollback(f.deploymentId, {
    reviewDigest: rollbackReview.reviewDigest,
    confirmation: 'rollback-to-previous-release',
  });
  reverifyPublicForActive(f);

  const before = f.store.get(f.deploymentId);
  const review = await f.service.prepareDisconnectReview(f.deploymentId);
  assert.equal(review.authority.remoteAuthorityRemoved, false);
  assert.equal(review.authority.localAuthorityPresent, true);
  assert.equal(review.exactDeploymentConfirmed, true);

  const result = await f.service.disconnectAuthority(f.deploymentId, {
    reviewDigest: review.reviewDigest,
    confirmation: 'disconnect-deployment-authority',
  });

  assert.equal(f.remote.removeCalls, 1);
  assert.equal(f.remote.authorityAccessible, false);
  assert.equal(f.authorityStore.state.present, false);
  assert.equal(f.authorityStore.state.revokeCalls, 1);
  assert.equal(result.state, 'disconnected');
  assert.equal(result.authorityRef, null);
  assert.equal(result.activeRelease.id, RELEASE_A.id);
  assert.equal(result.previousRelease.id, RELEASE_B.id);
  assert.deepEqual(result.publicEndpoint, before.publicEndpoint);
});

test('Era 7 Stage 5A: disconnect resumes after server-side key removal when removal intent was persisted first', async (t) => {
  const f = fixture(t);
  f.remote.release = RELEASE_B;
  f.store.transition(f.deploymentId, 'degraded', {
    reason: 'authority-disconnect-removal-started',
    patch: {
      targetPublicFacts: {
        ...f.store.get(f.deploymentId).targetPublicFacts,
        authorityDisconnectState: 'removal-started',
        authorityDisconnectFingerprint: 'SHA256:' + 'K'.repeat(43),
      },
      healthState: 'unknown',
      rollbackState: 'available',
    },
  });
  f.remote.authorityAccessible = false;

  const review = await f.service.prepareDisconnectReview(f.deploymentId);
  assert.equal(review.authority.remoteAuthorityRemoved, true);

  const result = await f.service.disconnectAuthority(f.deploymentId, {
    reviewDigest: review.reviewDigest,
    confirmation: 'disconnect-deployment-authority',
  });

  assert.equal(f.remote.removeCalls, 0);
  assert.equal(f.authorityStore.state.present, false);
  assert.equal(result.state, 'disconnected');
});

test('Era 7 Stage 5A: disconnect resumes after local authority revocation but before disconnected-state persistence', async (t) => {
  const f = fixture(t);
  f.store.transition(f.deploymentId, 'degraded', {
    reason: 'authority-disconnect-removal-started',
    patch: {
      targetPublicFacts: {
        ...f.store.get(f.deploymentId).targetPublicFacts,
        authorityDisconnectState: 'remote-removed',
        authorityDisconnectFingerprint: 'SHA256:' + 'K'.repeat(43),
      },
      healthState: 'unknown',
      rollbackState: 'available',
    },
  });
  f.remote.authorityAccessible = false;
  f.authorityStore.state.present = false;

  const review = await f.service.prepareDisconnectReview(f.deploymentId);
  assert.equal(review.authority.remoteAuthorityRemoved, true);
  assert.equal(review.authority.localAuthorityPresent, false);

  const result = await f.service.disconnectAuthority(f.deploymentId, {
    reviewDigest: review.reviewDigest,
    confirmation: 'disconnect-deployment-authority',
  });

  assert.equal(result.state, 'disconnected');
  assert.equal(result.authorityRef, null);
});

test('Era 7 Stage 5A: unexplained pre-existing authority failure is not mistaken for a reviewed disconnect', async (t) => {
  const f = fixture(t);
  f.remote.authorityAccessible = false;

  await assert.rejects(
    () => f.service.prepareDisconnectReview(f.deploymentId),
    (error) => error.code === 'DEPLOYMENT_DISCONNECT_REMOTE_STATE_AMBIGUOUS',
  );
  assert.equal(f.authorityStore.state.present, true);
});
