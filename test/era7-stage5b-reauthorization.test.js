'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createReferenceBootstrapPlan } = require('../src/deploy/bootstrap-plan');
const {
  finalizeReauthorizationCommand,
  restoreDeploymentAuthorityCommand,
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
  id: 'release-stage5b-a',
  digest: 'a'.repeat(64),
  packageDigest: 'b'.repeat(64),
});

const RELEASE_B = Object.freeze({
  id: 'release-stage5b-b',
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

const PUBLIC_KEY = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCstage5b hivenues-deployment';
const KEY_FINGERPRINT = 'SHA256:' + 'R'.repeat(43);

function exactReadBack(authorityState = 'restricted-deployment-user') {
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
      releaseId: RELEASE_A.id,
      releaseDigest: RELEASE_A.digest,
      packageDigest: RELEASE_A.packageDigest,
    },
    bootstrap: {
      authorityState,
    },
  };
}

function verifiedEndpoint() {
  let endpoint = createDomainPreflight({
    hostname: 'dev.fourthstreetbar.com',
    destinations: [{ kind: 'ipv4', value: '121.127.34.154' }],
  });
  endpoint = recordDnsObservation(endpoint, {
    checkedAt: '2026-10-03T23:20:00.000Z',
    resolver: 'stage5b-test',
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
    checkedAt: '2026-10-03T23:20:01.000Z',
  });
  return recordPublicReadBack(endpoint, {
    url: 'https://dev.fourthstreetbar.com/__hivenues/health',
    statusCode: 200,
    checkedAt: '2026-10-03T23:20:02.000Z',
    body: exactReadBack(),
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
      releaseId: RELEASE_A.id,
      releaseDigest: RELEASE_A.digest,
      packageDigest: RELEASE_A.packageDigest,
    },
  });
}

function authorityFixture() {
  const records = new Map();
  let next = 0;
  return {
    records,
    createSshAuthority() {
      next += 1;
      const id = 'authority-stage5b-' + next;
      records.set(id, {
        id,
        publicKey: PUBLIC_KEY,
        publicKeyFingerprint: KEY_FINGERPRINT,
      });
      return { id };
    },
    publicRecord(id) {
      const record = records.get(id);
      if (!record) {
        const error = new Error('authority missing');
        error.code = 'DEPLOYMENT_AUTHORITY_NOT_FOUND';
        throw error;
      }
      return { ...record };
    },
    revoke(id) {
      return records.delete(id);
    },
  };
}

function fixture(t, {
  inspection = null,
  reauthorized = null,
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-stage5b-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const store = new FileDeploymentStore({
    statePath: path.join(root, 'deployment.json'),
    now: () => Date.parse('2026-10-03T23:21:00.000Z'),
    idFactory: () => 'stage5b',
  });
  const deployment = store.createDraft({
    hostSlug: 'harbor-and-hearth',
    providerKind: 'ssh-server',
    providerProfile: 'privex-reference',
    capabilities: ['DEPLOY_RELEASE', 'HEALTH', 'ROLLBACK', 'DECOMMISSION', 'DOMAIN', 'DNS', 'TLS', 'PUBLISH'],
  });
  store.setAuthorityRef(deployment.id, 'authority-old');
  store.setTargetPublicFacts(deployment.id, {
    host: '121.127.34.154',
    port: 22,
    username: 'hivenues-deploy',
    bootstrapUsername: 'debian',
    trustedHostKeyFingerprint: 'SHA256:' + 'Z'.repeat(43),
    hostKeyTrustState: 'trusted',
    verifiedOs: 'Debian GNU/Linux 13 (trixie)',
    verifiedArchitecture: 'x86_64',
    verifiedDedicatedTarget: true,
    bootstrapAuthorityState: 'restricted-deployment-user',
  });
  store.selectRelease(deployment.id, {
    id: RELEASE_A.id,
    digest: RELEASE_A.digest,
  });
  store.recordPackage(deployment.id, {
    schemaVersion: 1,
    releaseId: RELEASE_A.id,
    releaseDigest: RELEASE_A.digest,
    packageDigest: RELEASE_A.packageDigest,
  });
  store.transition(deployment.id, 'target-ready', { reason: 'test' });
  store.transition(deployment.id, 'verifying', { reason: 'test' });
  store.transition(deployment.id, 'bootstrap-ready', { reason: 'test' });
  store.transition(deployment.id, 'deploying', { reason: 'test' });
  store.transition(deployment.id, 'rollback-available', {
    reason: 'test-public-a',
    patch: {
      activeRelease: { ...RELEASE_A, deployedAt: '2026-10-03T22:00:00.000Z' },
      previousRelease: { ...RELEASE_B, deployedAt: '2026-10-03T21:00:00.000Z' },
      runtimeProfile: RUNTIME,
      healthState: 'healthy',
      rollbackState: 'available',
      lastConfirmedAt: '2026-10-03T22:00:01.000Z',
    },
  });
  store.setPublicEndpoint(deployment.id, verifiedEndpoint());
  store.disconnect(deployment.id, 'deployment-authority-disconnected');

  const authorityStore = authorityFixture();
  const remote = {
    inspectCalls: 0,
    reauthorizeCalls: 0,
    inspection: inspection || {
      bootstrapAccessible: true,
      steadyAccessible: false,
      readBack: exactReadBack('bootstrap-admin'),
      publication: {
        capability: 'ready',
        status: {
          version: 1,
          capability: 'ready',
          state: 'configured',
          hostSlug: 'harbor-and-hearth',
          hostname: 'dev.fourthstreetbar.com',
        },
      },
    },
    result: reauthorized || {
      beforeFinalizeReadBack: exactReadBack('restricted-login-pending'),
      readBack: exactReadBack('restricted-deployment-user'),
      publication: {
        capability: 'ready',
        status: {
          version: 1,
          capability: 'ready',
          state: 'configured',
          hostSlug: 'harbor-and-hearth',
          hostname: 'dev.fourthstreetbar.com',
        },
      },
      bootstrapAuthorityAccessible: false,
      steadyAuthorityAccessible: true,
    },
  };

  const target = {
    async inspectReauthorizationBaseline() {
      remote.inspectCalls += 1;
      return remote.inspection;
    },
    async reauthorizeExistingDeployment() {
      remote.reauthorizeCalls += 1;
      return remote.result;
    },
  };

  const service = new InstalledRemoteDeploymentService({
    deploymentStore: store,
    packageBuilder: {
      build() {
        throw new Error('Stage 5B re-authorization must not build or upload a Release.');
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
    now: () => Date.parse('2026-10-03T23:22:00.000Z'),
  });

  let publicProofCalls = 0;
  service.verifyPublicHttps = async (deploymentId) => {
    publicProofCalls += 1;
    return store.get(deploymentId).publicEndpoint;
  };

  return {
    root,
    store,
    deploymentId: deployment.id,
    authorityStore,
    remote,
    service,
    publicProofCalls: () => publicProofCalls,
  };
}

test('Era 7 Stage 5B: server-side re-authorization scripts touch authority only', () => {
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

  const restore = restoreDeploymentAuthorityCommand(plan, PUBLIC_KEY);
  assert.match(restore, /deployment-authority-restore/);
  assert.match(restore, /\/var\/lib\/hivenues-deploy\/\.ssh\/authorized_keys/);
  assert.match(restore, /restricted-login-pending/);
  assert.doesNotMatch(restore, /apt-get|npm|systemctl|caddy|nft|release-current|runtime-current/);

  const finalize = finalizeReauthorizationCommand(plan, PUBLIC_KEY);
  assert.match(finalize, /deployment-reauthorization-finalize/);
  assert.match(finalize, /restricted-deployment-user/);
  assert.match(finalize, /authorized_keys/);
  assert.doesNotMatch(finalize, /apt-get|npm|systemctl|caddy|nft|release-current|runtime-current/);
});

test('Era 7 Stage 5B: only disconnected exact deployments can begin re-authorization', (t) => {
  const f = fixture(t);

  const prepared = f.service.beginReauthorization(f.deploymentId);

  assert.equal(prepared.deployment.state, 'reauthorizing');
  assert.equal(prepared.deployment.authorityRef, 'authority-stage5b-1');
  assert.equal(prepared.deployment.activeRelease.id, RELEASE_A.id);
  assert.equal(prepared.deployment.previousRelease.id, RELEASE_B.id);
  assert.equal(prepared.deployment.targetPublicFacts.reauthorizationState, 'prepared');
  assert.equal(prepared.authority.publicKeyFingerprint, KEY_FINGERPRINT);

  assert.throws(
    () => f.service.beginReauthorization(f.deploymentId),
    (error) => error.code === 'DEPLOYMENT_REAUTHORIZATION_STATE_INVALID',
  );
});

test('Era 7 Stage 5B: review binds fresh authority to exact preserved server, runtime, Release and hostname', async (t) => {
  const f = fixture(t);
  f.service.beginReauthorization(f.deploymentId);

  const review = await f.service.prepareReauthorizationReview(f.deploymentId);

  assert.equal(review.release.id, RELEASE_A.id);
  assert.equal(review.previousRelease.id, RELEASE_B.id);
  assert.equal(review.runtime.bundleDigest, RUNTIME.bundleDigest);
  assert.equal(review.target.host, '121.127.34.154');
  assert.equal(review.target.bootstrapUsername, 'debian');
  assert.equal(review.target.deploymentUsername, 'hivenues-deploy');
  assert.equal(review.hostname, 'dev.fourthstreetbar.com');
  assert.equal(review.authority.publicKeyFingerprint, KEY_FINGERPRINT);
  assert.equal(review.remoteState, 'bootstrap-temporary-only');
  assert.match(review.reviewDigest, /^[a-f0-9]{64}$/);
  assert.equal(review.held.includes('runtime-or-release-upload'), true);
});

test('Era 7 Stage 5B: exact mismatch fails closed before authority mutation', async (t) => {
  const f = fixture(t, {
    inspection: {
      bootstrapAccessible: true,
      steadyAccessible: false,
      readBack: {
        ...exactReadBack('bootstrap-admin'),
        deployment: {
          ...exactReadBack().deployment,
          releaseId: 'release-unexpected',
        },
      },
      publication: {
        capability: 'ready',
        status: {
          version: 1,
          capability: 'ready',
          state: 'configured',
          hostSlug: 'harbor-and-hearth',
          hostname: 'dev.fourthstreetbar.com',
        },
      },
    },
  });
  f.service.beginReauthorization(f.deploymentId);

  await assert.rejects(
    () => f.service.prepareReauthorizationReview(f.deploymentId),
    (error) => error.code === 'DEPLOYMENT_REAUTHORIZATION_READBACK_MISMATCH',
  );
  assert.equal(f.remote.reauthorizeCalls, 0);
});

test('Era 7 Stage 5B: reviewed re-authorization preserves A/B history and returns same record to managed state', async (t) => {
  const f = fixture(t);
  f.service.beginReauthorization(f.deploymentId);
  const review = await f.service.prepareReauthorizationReview(f.deploymentId);

  const result = await f.service.reauthorizeDeployment(f.deploymentId, {
    reviewDigest: review.reviewDigest,
    confirmation: 'reauthorize-deployment-management',
  });

  assert.equal(f.remote.reauthorizeCalls, 1);
  assert.equal(f.publicProofCalls(), 1);
  assert.equal(result.state, 'rollback-available');
  assert.equal(result.healthState, 'healthy');
  assert.equal(result.rollbackState, 'available');
  assert.equal(result.activeRelease.id, RELEASE_A.id);
  assert.equal(result.previousRelease.id, RELEASE_B.id);
  assert.equal(result.authorityRef, 'authority-stage5b-1');
  assert.equal(result.targetPublicFacts.username, 'hivenues-deploy');
  assert.equal(result.targetPublicFacts.bootstrapAuthorityState, 'restricted-deployment-user');
  assert.equal(result.targetPublicFacts.reauthorizationState, 'complete');
  assert.equal(Object.hasOwn(result.targetPublicFacts, 'authorityDisconnectState'), false);
  assert.equal(result.publicEndpoint.publicReadBack.state, 'verified');
});

test('Era 7 Stage 5B: retry accepts already-finalized remote authority without changing deployment identity', async (t) => {
  const f = fixture(t, {
    inspection: {
      bootstrapAccessible: false,
      steadyAccessible: true,
      readBack: exactReadBack('restricted-deployment-user'),
      publication: {
        capability: 'ready',
        status: {
          version: 1,
          capability: 'ready',
          state: 'configured',
          hostSlug: 'harbor-and-hearth',
          hostname: 'dev.fourthstreetbar.com',
        },
      },
    },
  });
  f.service.beginReauthorization(f.deploymentId);

  const review = await f.service.prepareReauthorizationReview(f.deploymentId);
  assert.equal(review.remoteState, 'steady-authority-already-restored');

  const result = await f.service.reauthorizeDeployment(f.deploymentId, {
    reviewDigest: review.reviewDigest,
    confirmation: 'reauthorize-deployment-management',
  });

  assert.equal(result.state, 'rollback-available');
  assert.equal(result.activeRelease.id, RELEASE_A.id);
  assert.equal(result.previousRelease.id, RELEASE_B.id);
});

test('Era 7 Stage 5B: reauthorizing state and fresh authority survive store restart', (t) => {
  const f = fixture(t);
  const prepared = f.service.beginReauthorization(f.deploymentId);

  const restarted = new FileDeploymentStore({
    statePath: path.join(f.root, 'deployment.json'),
    now: () => Date.parse('2026-10-03T23:23:00.000Z'),
  });
  const record = restarted.get(f.deploymentId);

  assert.equal(record.state, 'reauthorizing');
  assert.equal(record.authorityRef, prepared.authority.id);
  assert.equal(record.activeRelease.id, RELEASE_A.id);
  assert.equal(record.previousRelease.id, RELEASE_B.id);
  assert.equal(record.publicEndpoint.publicReadBack.state, 'verified');
});
