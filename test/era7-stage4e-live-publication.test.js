'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createReferenceBootstrapPlan } = require('../src/deploy/bootstrap-plan');
const { NodePublicationObserver } = require('../src/product/deployment-publication-observer');
const { createDomainPreflight } = require('../src/product/deployment-publication');
const { FileDeploymentStore } = require('../src/product/deployment-store');
const { InstalledRemoteDeploymentService } = require('../src/product/deployment-execution');

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

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-stage4e-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const store = new FileDeploymentStore({
    statePath: path.join(root, 'deployment.json'),
    now: () => Date.parse('2026-10-03T20:00:00.000Z'),
    idFactory: () => 'deployment-stage4e',
  });
  const deployment = store.createDraft({
    hostSlug: 'harbor-and-hearth',
    providerKind: 'ssh-server',
    providerProfile: 'privex-reference',
    capabilities: ['PUBLISH', 'DOMAIN', 'DNS', 'TLS', 'HEALTH'],
  });
  store.setAuthorityRef(deployment.id, 'authority-stage4e');
  store.setTargetPublicFacts(deployment.id, {
    host: '121.127.34.154',
    port: 22,
    username: 'hivenues-deploy',
    bootstrapUsername: 'debian',
    trustedHostKeyFingerprint: 'SHA256:' + 'Z'.repeat(43),
    verifiedDedicatedTarget: true,
  });
  store.selectRelease(deployment.id, {
    id: RELEASE.id,
    digest: RELEASE.digest,
  });
  store.recordPackage(deployment.id, {
    schemaVersion: 1,
    releaseId: RELEASE.id,
    releaseDigest: RELEASE.digest,
    packageDigest: RELEASE.packageDigest,
  });
  store.transition(deployment.id, 'target-ready', { reason: 'test' });
  store.transition(deployment.id, 'verifying', { reason: 'test' });
  store.transition(deployment.id, 'bootstrap-ready', { reason: 'test' });
  store.transition(deployment.id, 'deploying', { reason: 'test' });
  store.transition(deployment.id, 'healthy', {
    reason: 'exact-release-readback-match',
    patch: {
      activeRelease: {
        id: RELEASE.id,
        digest: RELEASE.digest,
        packageDigest: RELEASE.packageDigest,
        deployedAt: '2026-10-03T19:45:00.000Z',
      },
      runtimeProfile: RUNTIME,
      healthState: 'healthy',
      rollbackState: 'unavailable',
    },
  });
  store.setPublicEndpoint(deployment.id, createDomainPreflight({
    hostname: 'dev.fourthstreetbar.com',
    destinations: [{ kind: 'ipv4', value: '121.127.34.154' }],
  }));

  return { root, store, deploymentId: deployment.id };
}

function serviceFixture(t) {
  const f = fixture(t);
  const remote = {
    publicationState: 'unconfigured',
    publicationHostname: '',
    applyCalls: 0,
  };
  const target = {
    async publicationStatus() {
      return {
        capability: 'ready',
        status: {
          version: 1,
          capability: 'ready',
          state: remote.publicationState,
          hostSlug: 'harbor-and-hearth',
          ...(remote.publicationHostname ? { hostname: remote.publicationHostname } : {}),
        },
      };
    },
    async bootstrapAuthorityAccessible() {
      return false;
    },
    async readBack() {
      return exactReadBack();
    },
    async applyPublication(_plan, hostname) {
      remote.applyCalls += 1;
      remote.publicationState = 'configured';
      remote.publicationHostname = hostname;
      return this.publicationStatus();
    },
  };
  const observer = {
    dnsCalls: 0,
    tlsCalls: 0,
    publicCalls: 0,
    async observeDns() {
      this.dnsCalls += 1;
      return {
        checkedAt: '2026-10-03T20:01:00.000Z',
        resolver: 'synthetic-stage4e',
        records: [{
          type: 'A',
          name: 'dev.fourthstreetbar.com',
          values: ['121.127.34.154'],
        }],
      };
    },
    async observeTls() {
      this.tlsCalls += 1;
      return {
        hostname: 'dev.fourthstreetbar.com',
        authorized: true,
        protocol: 'TLSv1.3',
        subjectAltNames: ['dev.fourthstreetbar.com'],
        validFrom: '2026-10-03T19:00:00.000Z',
        validTo: '2027-01-01T00:00:00.000Z',
        checkedAt: '2026-10-03T20:02:00.000Z',
      };
    },
    async readPublicHealth() {
      this.publicCalls += 1;
      return {
        url: 'https://dev.fourthstreetbar.com/__hivenues/health',
        statusCode: 200,
        checkedAt: '2026-10-03T20:02:01.000Z',
        body: exactReadBack(),
      };
    },
  };
  const service = new InstalledRemoteDeploymentService({
    deploymentStore: f.store,
    packageBuilder: { build() { throw new Error('Stage 4E must not rebuild or redeploy the Release.'); } },
    authorityStore: {},
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
    publicationObserver: observer,
  });
  return { ...f, service, target, remote, observer };
}

test('Era 7 Stage 4E: injected DNS observer returns exact A/AAAA/CNAME records without mutation', async () => {
  const calls = [];
  const observer = new NodePublicationObserver({
    resolver: {
      async resolve4(name) {
        calls.push(['A', name]);
        return ['121.127.34.154'];
      },
      async resolve6(name) {
        calls.push(['AAAA', name]);
        return ['2606:4700::1111'];
      },
      async resolveCname(name) {
        calls.push(['CNAME', name]);
        return ['target.example.com'];
      },
    },
    now: () => Date.parse('2026-10-03T20:00:00.000Z'),
  });

  const result = await observer.observeDns({
    dns: {
      requirements: [
        { type: 'A', name: 'a.example.com', values: ['121.127.34.154'] },
        { type: 'AAAA', name: 'v6.example.com', values: ['2606:4700::1111'] },
        { type: 'CNAME', name: 'c.example.com', values: ['target.example.com'] },
      ],
    },
  });

  assert.deepEqual(calls, [
    ['A', 'a.example.com'],
    ['AAAA', 'v6.example.com'],
    ['CNAME', 'c.example.com'],
  ]);
  assert.equal(result.checkedAt, '2026-10-03T20:00:00.000Z');
  assert.equal(result.records.length, 3);
});

test('Era 7 Stage 4E: DNS check persists exact confirmed observation and no server publication', async (t) => {
  const f = serviceFixture(t);

  const endpoint = await f.service.checkDns(f.deploymentId);

  assert.equal(endpoint.domainState, 'dns-confirmed');
  assert.equal(endpoint.dns.observation.matches, true);
  assert.equal(endpoint.dns.observation.resolver, 'synthetic-stage4e');
  assert.equal(endpoint.tls.state, 'ready-for-request');
  assert.equal(f.remote.applyCalls, 0);
  assert.equal(f.observer.dnsCalls, 1);
});

test('Era 7 Stage 4E: live publication review is unavailable before exact DNS confirmation', async (t) => {
  const f = serviceFixture(t);

  await assert.rejects(
    () => f.service.prepareHostnamePublicationReview(f.deploymentId),
    (error) => error.code === 'DEPLOYMENT_PUBLICATION_DNS_REQUIRED',
  );
  assert.equal(f.remote.applyCalls, 0);
});

test('Era 7 Stage 4E: live publication review binds DNS proof, exact Release and restricted capability', async (t) => {
  const f = serviceFixture(t);
  await f.service.checkDns(f.deploymentId);

  const review = await f.service.prepareHostnamePublicationReview(f.deploymentId);

  assert.equal(review.hostname, 'dev.fourthstreetbar.com');
  assert.equal(review.dnsObservation.records[0].values[0], '121.127.34.154');
  assert.equal(review.release.releaseId, RELEASE.id);
  assert.equal(review.runtime.bundleDigest, RUNTIME.bundleDigest);
  assert.equal(review.publicationState, 'unconfigured');
  assert.equal(review.alreadyApplied, false);
  assert.match(review.reviewDigest, /^[a-f0-9]{64}$/);
  assert.equal(review.held.includes('runtime-or-release-redeployment'), true);
  assert.equal(review.held.includes('unrelated-dns-records'), true);
});

test('Era 7 Stage 4E: explicit publication applies only reviewed hostname and enters TLS requesting state', async (t) => {
  const f = serviceFixture(t);
  await f.service.checkDns(f.deploymentId);
  const before = f.store.get(f.deploymentId);
  const review = await f.service.prepareHostnamePublicationReview(f.deploymentId);

  const result = await f.service.publishHostname(f.deploymentId, {
    reviewDigest: review.reviewDigest,
    confirmation: 'publish-reviewed-hostname',
  });

  const after = f.store.get(f.deploymentId);
  assert.equal(result.hostname, 'dev.fourthstreetbar.com');
  assert.equal(result.tlsState, 'requesting');
  assert.equal(f.remote.applyCalls, 1);
  assert.equal(f.remote.publicationState, 'configured');
  assert.equal(f.remote.publicationHostname, 'dev.fourthstreetbar.com');
  assert.equal(after.publicEndpoint.tls.state, 'requesting');
  assert.deepEqual(after.activeRelease, before.activeRelease);
  assert.deepEqual(after.runtimeProfile, before.runtimeProfile);
});

test('Era 7 Stage 4E: interrupted local persistence resumes an already-applied exact hostname without reapplying it', async (t) => {
  const f = serviceFixture(t);
  await f.service.checkDns(f.deploymentId);
  f.remote.publicationState = 'configured';
  f.remote.publicationHostname = 'dev.fourthstreetbar.com';

  const review = await f.service.prepareHostnamePublicationReview(f.deploymentId);
  assert.equal(review.alreadyApplied, true);

  const result = await f.service.publishHostname(f.deploymentId, {
    reviewDigest: review.reviewDigest,
    confirmation: 'publish-reviewed-hostname',
  });

  assert.equal(result.alreadyApplied, true);
  assert.equal(f.remote.applyCalls, 0);
  assert.equal(f.store.get(f.deploymentId).publicEndpoint.tls.state, 'requesting');
});

test('Era 7 Stage 4E: TLS and public HTTPS proof persist exact active runtime and immutable Release', async (t) => {
  const f = serviceFixture(t);
  await f.service.checkDns(f.deploymentId);
  const review = await f.service.prepareHostnamePublicationReview(f.deploymentId);
  await f.service.publishHostname(f.deploymentId, {
    reviewDigest: review.reviewDigest,
    confirmation: 'publish-reviewed-hostname',
  });

  const endpoint = await f.service.verifyPublicHttps(f.deploymentId);

  assert.equal(endpoint.tls.state, 'verified');
  assert.equal(endpoint.publicReadBack.state, 'verified');
  assert.equal(endpoint.publicReadBack.mismatchFields.length, 0);
  assert.equal(endpoint.publicReadBack.observation.expected.release.releaseId, RELEASE.id);
  assert.equal(endpoint.publicReadBack.observation.expected.runtime.bundleDigest, RUNTIME.bundleDigest);
  assert.equal(f.observer.tlsCalls, 1);
  assert.equal(f.observer.publicCalls, 1);
});

test('Era 7 Stage 4E: wrong public Release remains an explicit mismatch', async (t) => {
  const f = serviceFixture(t);
  await f.service.checkDns(f.deploymentId);
  const review = await f.service.prepareHostnamePublicationReview(f.deploymentId);
  await f.service.publishHostname(f.deploymentId, {
    reviewDigest: review.reviewDigest,
    confirmation: 'publish-reviewed-hostname',
  });
  f.observer.readPublicHealth = async function readWrongPublicHealth() {
    this.publicCalls += 1;
    const body = exactReadBack();
    body.deployment.releaseId = 'release-wrong';
    return {
      url: 'https://dev.fourthstreetbar.com/__hivenues/health',
      statusCode: 200,
      checkedAt: '2026-10-03T20:02:01.000Z',
      body,
    };
  };

  const endpoint = await f.service.verifyPublicHttps(f.deploymentId);

  assert.equal(endpoint.tls.state, 'verified');
  assert.equal(endpoint.publicReadBack.state, 'mismatch');
  assert.equal(endpoint.publicReadBack.mismatchFields.includes('deployment.releaseId'), true);
});

test('Era 7 Stage 4E: target plan remains the exact qualified runtime and Release contract', () => {
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

  assert.equal(plan.release.releaseId, RELEASE.id);
  assert.equal(plan.runtime.bundleDigest, RUNTIME.bundleDigest);
  assert.equal(plan.paths.publicationHelper, '/usr/local/libexec/hivenues-publication-harbor-and-hearth');
});
