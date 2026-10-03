'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');

const { createReferenceBootstrapPlan } = require('../src/deploy/bootstrap-plan');
const {
  publicationMigrationActivateCommand,
  publicationMigrationDirectoriesCommand,
} = require('../src/deploy/ssh-remote-deployment-target');
const { createHiVenuesApp } = require('../src/product/app');
const { FileDeploymentStore } = require('../src/product/deployment-store');
const {
  InstalledRemoteDeploymentService,
} = require('../src/product/deployment-execution');
const { createDomainPreflight } = require('../src/product/deployment-publication');
const { ProvisioningFileHiVenuesStore } = require('../src/product/provisioning-file-store');

const RELEASE = Object.freeze({
  id: 'release-seed-050783a6ee',
  digest: '4'.repeat(64),
  packageDigest: '5'.repeat(64),
});

const RUNTIME = Object.freeze({
  kind: 'hivenues-public-runtime',
  sourceSha: '1'.repeat(40),
  sourceTree: '2'.repeat(40),
  packageVersion: '1.0.0',
  nodeVersion: 'v24.19.0',
  bundleDigest: '3'.repeat(64),
});

function deploymentFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-stage4d-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const deploymentStore = new FileDeploymentStore({
    statePath: path.join(root, 'deployment.json'),
    now: () => Date.parse('2026-10-03T18:30:00.000Z'),
    idFactory: () => 'deployment-stage4d',
  });
  const deployment = deploymentStore.createDraft({
    hostSlug: 'harbor-and-hearth',
    providerKind: 'ssh-server',
    providerProfile: 'privex-reference',
    capabilities: ['PUBLISH', 'DOMAIN', 'DNS', 'TLS', 'HEALTH'],
  });
  deploymentStore.setAuthorityRef(deployment.id, 'authority-stage4d');
  deploymentStore.setTargetPublicFacts(deployment.id, {
    host: '121.127.34.154',
    port: 22,
    username: 'hivenues-deploy',
    bootstrapUsername: 'debian',
    trustedHostKeyFingerprint: 'SHA256:' + 'Z'.repeat(43),
    hostKeyTrustState: 'trusted',
    verifiedDedicatedTarget: true,
  });
  deploymentStore.selectRelease(deployment.id, {
    id: RELEASE.id,
    digest: RELEASE.digest,
  });
  deploymentStore.recordPackage(deployment.id, {
    schemaVersion: 1,
    releaseId: RELEASE.id,
    releaseDigest: RELEASE.digest,
    packageDigest: RELEASE.packageDigest,
  });
  deploymentStore.transition(deployment.id, 'target-ready', { reason: 'test' });
  deploymentStore.transition(deployment.id, 'verifying', { reason: 'test' });
  deploymentStore.transition(deployment.id, 'bootstrap-ready', { reason: 'test' });
  deploymentStore.transition(deployment.id, 'deploying', { reason: 'test' });
  deploymentStore.transition(deployment.id, 'healthy', {
    reason: 'exact-release-readback-match',
    patch: {
      activeRelease: {
        id: RELEASE.id,
        digest: RELEASE.digest,
        packageDigest: RELEASE.packageDigest,
        deployedAt: '2026-10-03T18:00:00.000Z',
      },
      runtimeProfile: RUNTIME,
      healthState: 'healthy',
      rollbackState: 'unavailable',
    },
  });
  deploymentStore.setPublicEndpoint(deployment.id, createDomainPreflight({
    hostname: 'dev.fourthstreetbar.com',
    destinations: [{ kind: 'ipv4', value: '121.127.34.154' }],
  }));

  return { root, deploymentStore, deploymentId: deployment.id };
}

function exactReadBack() {
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
      releaseId: RELEASE.id,
      releaseDigest: RELEASE.digest,
      packageDigest: RELEASE.packageDigest,
    },
    bootstrap: {
      authorityState: 'restricted-deployment-user',
    },
  };
}

function authorityStore() {
  return {
    publicRecord(id) {
      assert.equal(id, 'authority-stage4d');
      return {
        id,
        publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCstage4d hivenues-stage4d',
        publicKeyFingerprint: 'SHA256:' + 'K'.repeat(43),
      };
    },
    withPrivateKey() {
      throw new Error('fake service target should not use a real private key');
    },
  };
}

function serviceFixture(t) {
  const f = deploymentFixture(t);
  const state = {
    capabilityReady: false,
    bootstrapAvailable: true,
    migrated: 0,
    finalized: 0,
    helperSha256: '',
  };
  const target = {
    async publicationStatus() {
      if (!state.capabilityReady) {
        return {
          capability: 'upgrade-required',
          reason: 'publication-capability-upgrade-required',
        };
      }
      return {
        capability: 'ready',
        status: {
          version: 1,
          capability: 'ready',
          state: 'unconfigured',
          hostSlug: 'harbor-and-hearth',
        },
      };
    },
    async readBack() {
      return exactReadBack();
    },
    async bootstrapAuthorityAccessible() {
      return state.bootstrapAvailable;
    },
    async migratePublicationCapability({ helperSource, helperSha256 }) {
      assert.ok(Buffer.byteLength(helperSource) > 1000);
      assert.match(helperSha256, /^[a-f0-9]{64}$/);
      state.helperSha256 = helperSha256;
      state.migrated += 1;
      state.capabilityReady = true;
      return this.publicationStatus();
    },
    async finalizeAuthorityNarrowing() {
      state.finalized += 1;
      state.bootstrapAvailable = false;
      return true;
    },
  };
  const service = new InstalledRemoteDeploymentService({
    deploymentStore: f.deploymentStore,
    packageBuilder: { build() { throw new Error('migration must not build or redeploy a Release'); } },
    authorityStore: authorityStore(),
    runtimeBundlesRoot: path.join(f.root, 'runtime-bundles'),
    buildProvenance: {
      sourceSha: 'a'.repeat(40),
      sourceTree: 'b'.repeat(40),
      nodeVersion: 'v24.19.0',
      packageVersion: '1.0.0',
    },
    targetFactory() {
      return target;
    },
  });
  return { ...f, service, state };
}

test('Era 7 Stage 4D: migration root commands never redeploy runtime/Release or activate publication', () => {
  const plan = createReferenceBootstrapPlan({
    runtimeProvenance: RUNTIME,
    releaseManifest: {
      hostSlug: 'harbor-and-hearth',
      releaseId: RELEASE.id,
      releaseDigest: RELEASE.digest,
      packageDigest: RELEASE.packageDigest,
    },
    bootstrapUsername: 'debian',
  });

  const directories = publicationMigrationDirectoriesCommand(plan);
  const activate = publicationMigrationActivateCommand(plan, 'a'.repeat(64));
  const combined = directories + '\n' + activate;

  assert.match(combined, /hivenues-publication-harbor-and-hearth/);
  assert.match(combined, /visudo -cf/);
  assert.match(combined, /systemctl daemon-reload/);
  assert.match(combined, /hivenues-caddy\.service/);
  assert.match(combined, /hivenues-firewall\.service/);
  assert.ok(
    activate.indexOf('install -m 0440') < activate.indexOf('install -m 0755'),
    'restricted helper sudo authority must be installed before the helper executable becomes canonical',
  );
  assert.doesNotMatch(combined, /systemctl (?:restart|start|stop|enable)/);
  assert.doesNotMatch(combined, /current-harbor-and-hearth|active-deployment|runtime-state/);
  assert.doesNotMatch(combined, /tcp dport 443|auto_https|acme|certificate/);
  assert.doesNotMatch(combined, /npm |node-v24|releases\/release|runtime\/current/);
});

test('Era 7 Stage 4D: review exposes only public bootstrap authority and freezes unchanged deployment identity', async (t) => {
  const f = serviceFixture(t);
  const review = await f.service.preparePublicationMigrationReview(f.deploymentId);

  assert.equal(review.target.currentUsername, 'hivenues-deploy');
  assert.equal(review.target.bootstrapUsername, 'debian');
  assert.match(review.authority.publicKey, /^ssh-rsa /);
  assert.match(review.authority.publicKeyFingerprint, /^SHA256:/);
  assert.equal(review.current.release.id, RELEASE.id);
  assert.equal(review.current.runtime.bundleDigest, RUNTIME.bundleDigest);
  assert.equal(review.current.publicationCapability, 'upgrade-required');
  assert.match(review.helper.sha256, /^[a-f0-9]{64}$/);
  assert.equal(review.held.includes('dns-mutation'), true);
  assert.equal(review.held.includes('runtime-redeploy-or-replacement'), true);
  assert.equal(Object.hasOwn(review.authority, 'privateKey'), false);
});

test('Era 7 Stage 4D: migration proves exact runtime/Release, installs capability, and removes temporary bootstrap access', async (t) => {
  const f = serviceFixture(t);
  const before = JSON.stringify(f.deploymentStore.get(f.deploymentId));
  const review = await f.service.preparePublicationMigrationReview(f.deploymentId);

  const result = await f.service.migratePublicationCapability(f.deploymentId, {
    reviewDigest: review.reviewDigest,
    confirmation: 'upgrade-reference-publication-capability',
  });

  assert.equal(result.publication.capability, 'ready');
  assert.equal(result.publication.status.state, 'unconfigured');
  assert.equal(result.bootstrapAuthorityRemoved, true);
  assert.equal(result.release.releaseId, RELEASE.id);
  assert.equal(result.runtime.bundleDigest, RUNTIME.bundleDigest);
  assert.equal(f.state.migrated, 1);
  assert.equal(f.state.finalized, 1);
  assert.equal(f.state.bootstrapAvailable, false);
  assert.match(f.state.helperSha256, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(f.deploymentStore.get(f.deploymentId)), before);
});

test('Era 7 Stage 4D: migration fails closed before mutation when temporary bootstrap authority is absent', async (t) => {
  const f = serviceFixture(t);
  f.state.bootstrapAvailable = false;
  const review = await f.service.preparePublicationMigrationReview(f.deploymentId);

  await assert.rejects(
    () => f.service.migratePublicationCapability(f.deploymentId, {
      reviewDigest: review.reviewDigest,
      confirmation: 'upgrade-reference-publication-capability',
    }),
    (error) => error.code === 'DEPLOYMENT_PUBLICATION_MIGRATION_BOOTSTRAP_AUTHORITY_REQUIRED',
  );
  assert.equal(f.state.migrated, 0);
  assert.equal(f.state.finalized, 0);
});

test('Era 7 Stage 4D: migration review is stale if capability state changes before confirmation', async (t) => {
  const f = serviceFixture(t);
  const review = await f.service.preparePublicationMigrationReview(f.deploymentId);
  f.state.capabilityReady = true;

  await assert.rejects(
    () => f.service.migratePublicationCapability(f.deploymentId, {
      reviewDigest: review.reviewDigest,
      confirmation: 'upgrade-reference-publication-capability',
    }),
    (error) => error.code === 'DEPLOYMENT_PUBLICATION_MIGRATION_REVIEW_STALE',
  );
  assert.equal(f.state.migrated, 0);
});

test('Era 7 Stage 4D: installed UI presents public key, bounded consequences, and explicit confirmation', async (t) => {
  const f = deploymentFixture(t);
  const hostStore = new ProvisioningFileHiVenuesStore({
    statePath: path.join(f.root, 'workspace.json'),
    mediaRoot: path.join(f.root, 'media'),
  });
  let executed = null;
  const review = {
    version: 1,
    deploymentId: f.deploymentId,
    hostSlug: 'harbor-and-hearth',
    target: {
      host: '121.127.34.154',
      port: 22,
      currentUsername: 'hivenues-deploy',
      bootstrapUsername: 'debian',
      trustedHostKeyFingerprint: 'SHA256:' + 'Z'.repeat(43),
    },
    authority: {
      id: 'authority-stage4d',
      publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCstage4d hivenues-stage4d',
      publicKeyFingerprint: 'SHA256:' + 'K'.repeat(43),
    },
    current: {
      release: {
        id: RELEASE.id,
        digest: RELEASE.digest,
        packageDigest: RELEASE.packageDigest,
      },
      runtime: RUNTIME,
      publicationCapability: 'upgrade-required',
      publicationState: 'upgrade-required',
    },
    helper: {
      sha256: '6'.repeat(64),
      installedPath: '/usr/local/libexec/hivenues-publication-harbor-and-hearth',
    },
    consequences: ['install-root-owned-publication-helper', 'remove-the-exact-temporary-bootstrap-key-again'],
    held: ['dns-mutation', 'tls-issuance', 'release-redeploy-or-change'],
    reviewDigest: '7'.repeat(64),
  };
  const services = {
    deploymentStore: f.deploymentStore,
    packageBuilder: {},
    authorityStore: {},
    adapters: {
      synthetic: {
        profile() {
          return { kind: 'synthetic-offline', profile: 'synthetic-local', capabilities: [], externalEffects: false };
        },
      },
    },
    remoteDeployment: {
      async inspectPublicationCapability() {
        return {
          deploymentId: f.deploymentId,
          hostSlug: 'harbor-and-hearth',
          capability: 'upgrade-required',
          reason: 'publication-capability-upgrade-required',
        };
      },
      async preparePublicationMigrationReview() {
        return review;
      },
      async migratePublicationCapability(id, submission) {
        executed = { id, submission };
        return { publication: { capability: 'ready', status: { state: 'unconfigured' } } };
      },
    },
  };
  const app = createHiVenuesApp({
    store: hostStore,
    identityServices: false,
    participationServices: false,
    deploymentServices: services,
  });

  let response = await request(app)
    .get('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/publication-capability')
    .expect(200);
  assert.match(response.text, /data-review-publication-upgrade/);

  response = await request(app)
    .get('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/publication-upgrade-review')
    .expect(200);
  assert.match(response.text, /data-publication-upgrade-review/);
  assert.match(response.text, /Original bootstrap key was intentionally removed/i);
  assert.match(response.text, /AAAAB3NzaC1yc2EAAAADAQABAAABAQCstage4d/);
  assert.match(response.text, /dns-mutation/);
  assert.match(response.text, /data-confirm-publication-upgrade/);

  response = await request(app)
    .post('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/publication-upgrade')
    .type('form')
    .send({
      reviewDigest: review.reviewDigest,
      confirmation: 'upgrade-reference-publication-capability',
    })
    .expect(303);
  assert.equal(
    response.headers.location,
    '/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/publication-capability',
  );
  assert.deepEqual(executed, {
    id: f.deploymentId,
    submission: {
      reviewDigest: review.reviewDigest,
      confirmation: 'upgrade-reference-publication-capability',
    },
  });
});


test('Era 7 Stage 4D: readiness keeps interrupted key-cleanup discoverable after capability install', async (t) => {
  const f = serviceFixture(t);
  f.state.capabilityReady = true;
  f.state.bootstrapAvailable = true;

  const diagnostic = await f.service.inspectPublicationCapability(f.deploymentId);

  assert.equal(diagnostic.capability, 'ready');
  assert.equal(diagnostic.status.state, 'unconfigured');
  assert.equal(diagnostic.bootstrapAuthorityAccessible, true);
});

test('Era 7 Stage 4D: ready capability UI warns when temporary bootstrap authority still remains', async (t) => {
  const f = deploymentFixture(t);
  const hostStore = new ProvisioningFileHiVenuesStore({
    statePath: path.join(f.root, 'workspace-interrupted.json'),
    mediaRoot: path.join(f.root, 'media-interrupted'),
  });
  const services = {
    deploymentStore: f.deploymentStore,
    packageBuilder: {},
    authorityStore: {},
    adapters: {
      synthetic: {
        profile() {
          return { kind: 'synthetic-offline', profile: 'synthetic-local', capabilities: [], externalEffects: false };
        },
      },
    },
    remoteDeployment: {
      async inspectPublicationCapability() {
        return {
          deploymentId: f.deploymentId,
          hostSlug: 'harbor-and-hearth',
          capability: 'ready',
          status: {
            version: 1,
            capability: 'ready',
            state: 'unconfigured',
            hostSlug: 'harbor-and-hearth',
          },
          bootstrapAuthorityAccessible: true,
        };
      },
      async preparePublicationMigrationReview() {
        return {};
      },
      async migratePublicationCapability() {
        return {};
      },
    },
  };
  const app = createHiVenuesApp({
    store: hostStore,
    identityServices: false,
    participationServices: false,
    deploymentServices: services,
  });

  const response = await request(app)
    .get('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/publication-capability')
    .expect(200);

  assert.match(response.text, /data-publication-bootstrap-authority-warning/);
  assert.match(response.text, /Temporary bootstrap access still needs to be removed/);
  assert.match(response.text, /data-finalize-publication-upgrade/);
  assert.doesNotMatch(response.text, /data-publication-capability-ready/);
  assert.match(response.text, /Capability installed · bootstrap cleanup pending/);
});


test('Era 7 Stage 4D: partial helper/sudo state remains recoverable when bootstrap authority is still present', async (t) => {
  const f = deploymentFixture(t);
  const target = {
    async publicationStatus() {
      const error = new Error('synthetic partial publication install');
      error.code = 'DEPLOYMENT_PUBLICATION_STATUS_FAILED';
      throw error;
    },
    async bootstrapAuthorityAccessible() {
      return true;
    },
  };
  const service = new InstalledRemoteDeploymentService({
    deploymentStore: f.deploymentStore,
    packageBuilder: { build() { throw new Error('not used'); } },
    authorityStore: authorityStore(),
    runtimeBundlesRoot: path.join(f.root, 'runtime-bundles-partial'),
    buildProvenance: {
      sourceSha: 'a'.repeat(40),
      sourceTree: 'b'.repeat(40),
      nodeVersion: 'v24.19.0',
      packageVersion: '1.0.0',
    },
    targetFactory() {
      return target;
    },
  });

  const diagnostic = await service.inspectPublicationCapability(f.deploymentId);
  assert.equal(diagnostic.capability, 'migration-incomplete');
  assert.equal(diagnostic.reason, 'DEPLOYMENT_PUBLICATION_STATUS_FAILED');
  assert.equal(diagnostic.bootstrapAuthorityAccessible, true);

  const review = await service.preparePublicationMigrationReview(f.deploymentId);
  assert.equal(review.current.publicationCapability, 'migration-incomplete');
});

test('Era 7 Stage 4D: partial migration UI keeps bounded resume path visible', async (t) => {
  const f = deploymentFixture(t);
  const hostStore = new ProvisioningFileHiVenuesStore({
    statePath: path.join(f.root, 'workspace-partial.json'),
    mediaRoot: path.join(f.root, 'media-partial'),
  });
  const services = {
    deploymentStore: f.deploymentStore,
    packageBuilder: {},
    authorityStore: {},
    adapters: {
      synthetic: {
        profile() {
          return { kind: 'synthetic-offline', profile: 'synthetic-local', capabilities: [], externalEffects: false };
        },
      },
    },
    remoteDeployment: {
      async inspectPublicationCapability() {
        return {
          deploymentId: f.deploymentId,
          hostSlug: 'harbor-and-hearth',
          capability: 'migration-incomplete',
          reason: 'DEPLOYMENT_PUBLICATION_STATUS_FAILED',
          bootstrapAuthorityAccessible: true,
        };
      },
      async preparePublicationMigrationReview() {
        return {};
      },
      async migratePublicationCapability() {
        return {};
      },
    },
  };
  const app = createHiVenuesApp({
    store: hostStore,
    identityServices: false,
    participationServices: false,
    deploymentServices: services,
  });

  const response = await request(app)
    .get('/hivenues/studio/harbor-and-hearth/deploy/' + f.deploymentId + '/publication-capability')
    .expect(200);

  assert.match(response.text, /data-publication-migration-incomplete/);
  assert.match(response.text, /needs to be resumed/);
  assert.match(response.text, /data-resume-publication-upgrade/);
});


test('Era 7 Stage 4D: ready capability readiness also proves the exact active runtime and Release', async (t) => {
  const f = serviceFixture(t);
  f.state.capabilityReady = true;
  f.state.bootstrapAvailable = false;

  const diagnostic = await f.service.inspectPublicationCapability(f.deploymentId);

  assert.equal(diagnostic.capability, 'ready');
  assert.equal(diagnostic.status.state, 'unconfigured');
  assert.equal(diagnostic.bootstrapAuthorityAccessible, false);
  assert.equal(diagnostic.exactDeploymentMatches, true);

  await assert.rejects(
    () => f.service.preparePublicationMigrationReview(f.deploymentId),
    (error) => error.code === 'DEPLOYMENT_PUBLICATION_MIGRATION_NOT_REQUIRED',
  );
});
