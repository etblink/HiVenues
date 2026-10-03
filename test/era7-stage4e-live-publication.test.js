'use strict';

const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createReferenceBootstrapPlan } = require('../src/deploy/bootstrap-plan');
const { SshRemoteDeploymentTarget } = require('../src/deploy/ssh-remote-deployment-target');
const { NodePublicationObserver } = require('../src/product/deployment-publication-observer');
const {
  createDomainPreflight,
  markTlsRequesting,
  prepareStage4PublicationReview,
  recordDnsObservation,
} = require('../src/product/deployment-publication');
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
    hostKeyTrustState: 'trusted',
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
    now: () => Date.parse('2026-10-03T20:02:00.000Z'),
  });
  return { ...f, service, target, remote, observer };
}

test('Era 7 Stage 4E: injected DNS observer checks required and opposite address families without mutation', async () => {
  const calls = [];
  const noData = () => {
    const error = new Error('no data');
    error.code = 'ENODATA';
    throw error;
  };
  const observer = new NodePublicationObserver({
    resolver: {
      async resolve4(name) {
        calls.push(['A', name]);
        if (name === 'a.example.com') return ['121.127.34.154'];
        if (name === 'v6.example.com') return noData();
        return ['121.127.34.154'];
      },
      async resolve6(name) {
        calls.push(['AAAA', name]);
        if (name === 'v6.example.com') return ['2606:4700::1111'];
        if (name === 'a.example.com') return noData();
        return ['2606:4700::1111'];
      },
      async resolveCname(name) {
        calls.push(['CNAME', name]);
        if (name === 'c.example.com') return ['target.example.com'];
        return noData();
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
    ['CNAME', 'a.example.com'],
    ['AAAA', 'a.example.com'],
    ['CNAME', 'v6.example.com'],
    ['A', 'v6.example.com'],
  ]);
  assert.equal(result.checkedAt, '2026-10-03T20:00:00.000Z');
  assert.equal(result.records.length, 3);
  assert.equal(result.conflictingRecords.length, 0);
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
  assert.equal(review.target.host, '121.127.34.154');
  assert.equal(review.target.username, 'hivenues-deploy');
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


test('Era 7 Stage 4E: remote publication transport invokes only helper apply with the exact hostname', async () => {
  let observedCommand = '';
  let observedUsername = '';
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
  const authorityStore = {
    publicRecord() {
      return {
        publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCstage4e hivenues-stage4e',
      };
    },
    withPrivateKey(_id, action) {
      return action('synthetic-private-key');
    },
  };
  const transport = {
    withSession(options, action) {
      observedUsername = options.target.username;
      return action({
        async exec(command) {
          observedCommand = command;
          return {
            stdout: JSON.stringify({
              version: 1,
              capability: 'ready',
              state: 'configured',
              hostSlug: 'harbor-and-hearth',
              hostname: 'dev.fourthstreetbar.com',
              appliedAt: '2026-10-03T20:03:00.000Z',
              caddyConfigSha256: '6'.repeat(64),
              firewallPolicySha256: '7'.repeat(64),
            }) + '\n',
            stderr: '',
            code: 0,
          };
        },
      });
    },
  };
  const target = new SshRemoteDeploymentTarget({
    authorityStore,
    authorityId: 'authority-stage4e',
    target: {
      host: '121.127.34.154',
      port: 22,
      username: 'hivenues-deploy',
    },
    expectedHostKeyFingerprint: 'SHA256:' + 'Z'.repeat(43),
    hostSlug: 'harbor-and-hearth',
    bootstrapUsername: 'debian',
    transport,
  });

  const result = await target.applyPublication(plan, 'dev.fourthstreetbar.com');

  assert.equal(observedUsername, 'hivenues-deploy');
  assert.equal(
    observedCommand,
    "sudo -n '/usr/local/libexec/hivenues-publication-harbor-and-hearth' apply 'dev.fourthstreetbar.com'",
  );
  assert.equal(result.status.state, 'configured');
  assert.equal(result.status.hostname, 'dev.fourthstreetbar.com');
});


test('Era 7 Stage 4E: TLS observer records independent certificate identity and authorization', async () => {
  let observedOptions = null;
  const observer = new NodePublicationObserver({
    tlsConnect(options) {
      observedOptions = options;
      const socket = new EventEmitter();
      socket.authorized = true;
      socket.setTimeout = () => {};
      socket.getProtocol = () => 'TLSv1.3';
      socket.getPeerCertificate = () => ({
        subjectaltname: 'DNS:dev.fourthstreetbar.com, DNS:other.example.com',
        valid_from: 'Oct  3 19:00:00 2026 GMT',
        valid_to: 'Jan  1 00:00:00 2027 GMT',
      });
      socket.end = () => {};
      socket.destroy = () => {};
      process.nextTick(() => socket.emit('secureConnect'));
      return socket;
    },
    httpsRequest() {
      throw new Error('not used');
    },
    now: () => Date.parse('2026-10-03T20:20:00.000Z'),
  });

  const result = await observer.observeTls('dev.fourthstreetbar.com');

  assert.equal(observedOptions.host, 'dev.fourthstreetbar.com');
  assert.equal(observedOptions.servername, 'dev.fourthstreetbar.com');
  assert.equal(observedOptions.port, 443);
  assert.equal(observedOptions.rejectUnauthorized, false);
  assert.equal(result.authorized, true);
  assert.equal(result.protocol, 'TLSv1.3');
  assert.deepEqual(result.subjectAltNames, [
    'dev.fourthstreetbar.com',
    'other.example.com',
  ]);
  assert.equal(result.checkedAt, '2026-10-03T20:20:00.000Z');
});

test('Era 7 Stage 4E: HTTPS observer requests only the exact health URL with normal certificate verification', async () => {
  let observedUrl = '';
  let observedOptions = null;
  const observer = new NodePublicationObserver({
    resolver: {},
    tlsConnect() {
      throw new Error('not used');
    },
    httpsRequest(url, options, callback) {
      observedUrl = url;
      observedOptions = options;
      const request = new EventEmitter();
      request.setTimeout = () => {};
      request.destroy = (error) => request.emit('error', error);
      request.end = () => {
        const response = new EventEmitter();
        response.statusCode = 200;
        response.destroy = (error) => response.emit('error', error);
        callback(response);
        process.nextTick(() => {
          response.emit('data', Buffer.from(JSON.stringify(exactReadBack()), 'utf8'));
          response.emit('end');
        });
      };
      return request;
    },
    now: () => Date.parse('2026-10-03T20:21:00.000Z'),
  });

  const result = await observer.readPublicHealth('dev.fourthstreetbar.com');

  assert.equal(observedUrl, 'https://dev.fourthstreetbar.com/__hivenues/health');
  assert.equal(observedOptions.rejectUnauthorized, true);
  assert.equal(observedOptions.servername, 'dev.fourthstreetbar.com');
  assert.equal(result.statusCode, 200);
  assert.equal(result.checkedAt, '2026-10-03T20:21:00.000Z');
  assert.equal(result.body.deployment.releaseId, RELEASE.id);
});


test('Era 7 Stage 4E: publication review requires explicit proof that bootstrap authority is gone', () => {
  const preflight = recordDnsObservation(createDomainPreflight({
    hostname: 'dev.fourthstreetbar.com',
    destinations: [{ kind: 'ipv4', value: '121.127.34.154' }],
  }), {
    checkedAt: '2026-10-03T20:30:00.000Z',
    resolver: 'synthetic',
    records: [{
      type: 'A',
      name: 'dev.fourthstreetbar.com',
      values: ['121.127.34.154'],
    }],
  });

  assert.throws(
    () => prepareStage4PublicationReview({
      preflight,
      deployment: {
        id: 'deployment-stage4e',
        state: 'healthy',
        activeRelease: {
          id: RELEASE.id,
          digest: RELEASE.digest,
          packageDigest: RELEASE.packageDigest,
        },
      },
      publication: {
        capability: 'ready',
        status: {
          state: 'unconfigured',
          hostSlug: 'harbor-and-hearth',
        },
        exactDeploymentMatches: true,
      },
    }),
    (error) => error.code === 'DEPLOYMENT_PUBLICATION_BOOTSTRAP_AUTHORITY_HELD',
  );
});

test('Era 7 Stage 4E: already-configured different hostname fails closed', () => {
  const preflight = recordDnsObservation(createDomainPreflight({
    hostname: 'dev.fourthstreetbar.com',
    destinations: [{ kind: 'ipv4', value: '121.127.34.154' }],
  }), {
    checkedAt: '2026-10-03T20:31:00.000Z',
    resolver: 'synthetic',
    records: [{
      type: 'A',
      name: 'dev.fourthstreetbar.com',
      values: ['121.127.34.154'],
    }],
  });

  assert.throws(
    () => prepareStage4PublicationReview({
      preflight,
      deployment: {
        id: 'deployment-stage4e',
        state: 'healthy',
        activeRelease: {
          id: RELEASE.id,
          digest: RELEASE.digest,
          packageDigest: RELEASE.packageDigest,
        },
      },
      publication: {
        capability: 'ready',
        status: {
          state: 'configured',
          hostSlug: 'harbor-and-hearth',
          hostname: 'other.example.com',
        },
        exactDeploymentMatches: true,
        bootstrapAuthorityAccessible: false,
      },
    }),
    (error) => error.code === 'DEPLOYMENT_PUBLICATION_HOSTNAME_CONFLICT',
  );
});


test('Era 7 Stage 4E: publication review cannot regress an already-started TLS proof', () => {
  const confirmed = recordDnsObservation(createDomainPreflight({
    hostname: 'dev.fourthstreetbar.com',
    destinations: [{ kind: 'ipv4', value: '121.127.34.154' }],
  }), {
    checkedAt: '2026-10-03T20:32:00.000Z',
    resolver: 'synthetic',
    records: [{
      type: 'A',
      name: 'dev.fourthstreetbar.com',
      values: ['121.127.34.154'],
    }],
  });
  const requesting = markTlsRequesting(confirmed);

  assert.throws(
    () => prepareStage4PublicationReview({
      preflight: requesting,
      deployment: {
        id: 'deployment-stage4e',
        state: 'healthy',
        activeRelease: {
          id: RELEASE.id,
          digest: RELEASE.digest,
          packageDigest: RELEASE.packageDigest,
        },
      },
      publication: {
        capability: 'ready',
        status: {
          state: 'configured',
          hostSlug: 'harbor-and-hearth',
          hostname: 'dev.fourthstreetbar.com',
        },
        exactDeploymentMatches: true,
        bootstrapAuthorityAccessible: false,
      },
    }),
    (error) => error.code === 'DEPLOYMENT_PUBLICATION_TLS_STATE_INVALID',
  );
});


test('Era 7 Stage 4E: stale DNS proof must be checked again before live publication review', async (t) => {
  const f = serviceFixture(t);
  await f.service.checkDns(f.deploymentId);
  f.service.now = () => Date.parse('2026-10-03T20:20:01.000Z');

  await assert.rejects(
    () => f.service.prepareHostnamePublicationReview(f.deploymentId),
    (error) => error.code === 'DEPLOYMENT_PUBLICATION_DNS_STALE',
  );
  assert.equal(f.remote.applyCalls, 0);
});


test('Era 7 Stage 4E corrective: unexpected opposite-family DNS address prevents exact confirmation', async () => {
  const observer = new NodePublicationObserver({
    resolver: {
      async resolve4() {
        return ['121.127.34.154'];
      },
      async resolve6() {
        return ['2606:4700::9999'];
      },
      async resolveCname() {
        return [];
      },
    },
    now: () => Date.parse('2026-10-03T20:33:00.000Z'),
  });
  const preflight = createDomainPreflight({
    hostname: 'dev.fourthstreetbar.com',
    destinations: [{ kind: 'ipv4', value: '121.127.34.154' }],
  });

  const observed = await observer.observeDns(preflight);
  const endpoint = recordDnsObservation(preflight, observed);

  assert.equal(observed.conflictingRecords.length, 1);
  assert.equal(observed.conflictingRecords[0].type, 'AAAA');
  assert.equal(endpoint.domainState, 'dns-mismatch');
  assert.equal(endpoint.dns.observation.matches, false);
  assert.equal(endpoint.dns.observation.conflictingRecords[0].values[0], '2606:4700::9999');
});

test('Era 7 Stage 4E corrective: equivalent IPv6 spellings canonicalize before DNS comparison', () => {
  const preflight = createDomainPreflight({
    hostname: 'v6.example.com',
    destinations: [{
      kind: 'ipv6',
      value: '2606:4700:0000:0000:0000:0000:0000:1111',
    }],
  });
  const endpoint = recordDnsObservation(preflight, {
    checkedAt: '2026-10-03T20:34:00.000Z',
    resolver: 'synthetic',
    records: [{
      type: 'AAAA',
      name: 'v6.example.com',
      values: ['2606:4700::1111'],
    }],
  });

  assert.equal(preflight.dns.requirements[0].values[0], '2606:4700::1111');
  assert.equal(endpoint.domainState, 'dns-confirmed');
  assert.equal(endpoint.dns.observation.matches, true);
});

test('Era 7 Stage 4E corrective: unsupported resolver operation fails closed instead of persisting mismatch evidence', async () => {
  const observer = new NodePublicationObserver({
    resolver: {
      async resolve4() {
        const error = new Error('resolver operation unsupported');
        error.code = 'ENOTIMP';
        throw error;
      },
      async resolve6() {
        const error = new Error('no data');
        error.code = 'ENODATA';
        throw error;
      },
      async resolveCname() {
        return [];
      },
    },
  });

  await assert.rejects(
    () => observer.observeDns({
      dns: {
        requirements: [{
          type: 'A',
          name: 'dev.fourthstreetbar.com',
          values: ['121.127.34.154'],
        }],
      },
    }),
    (error) => error.code === 'DEPLOYMENT_DNS_OBSERVATION_UNAVAILABLE',
  );
});


test('Era 7 Stage 4E corrective: conflicting opposite-family DNS recheck invalidates downstream TLS and public proof', async (t) => {
  const f = serviceFixture(t);
  await f.service.checkDns(f.deploymentId);
  const review = await f.service.prepareHostnamePublicationReview(f.deploymentId);
  await f.service.publishHostname(f.deploymentId, {
    reviewDigest: review.reviewDigest,
    confirmation: 'publish-reviewed-hostname',
  });
  let endpoint = await f.service.verifyPublicHttps(f.deploymentId);
  assert.equal(endpoint.tls.state, 'verified');
  assert.equal(endpoint.publicReadBack.state, 'verified');

  f.observer.observeDns = async function observeConflictingDns() {
    this.dnsCalls += 1;
    return {
      checkedAt: '2026-10-03T20:03:00.000Z',
      resolver: 'synthetic-stage4e',
      records: [{
        type: 'A',
        name: 'dev.fourthstreetbar.com',
        values: ['121.127.34.154'],
      }],
      conflictingRecords: [{
        type: 'AAAA',
        name: 'dev.fourthstreetbar.com',
        values: ['2606:4700::9999'],
      }],
    };
  };

  endpoint = await f.service.checkDns(f.deploymentId);

  assert.equal(endpoint.domainState, 'dns-mismatch');
  assert.equal(endpoint.dns.observation.matches, false);
  assert.equal(endpoint.tls.state, 'awaiting-dns');
  assert.equal(endpoint.tls.observation, null);
  assert.equal(endpoint.publicReadBack.state, 'unverified');
});


test('Era 7 Stage 4E corrective: legacy expanded IPv6 requirements match canonical resolver answers', () => {
  const legacy = JSON.parse(JSON.stringify(createDomainPreflight({
    hostname: 'v6.example.com',
    destinations: [{ kind: 'ipv6', value: '2606:4700::1111' }],
  })));
  legacy.dns.requirements[0].values[0] = '2606:4700:0000:0000:0000:0000:0000:1111';

  const endpoint = recordDnsObservation(legacy, {
    checkedAt: '2026-10-03T20:35:00.000Z',
    resolver: 'synthetic',
    records: [{
      type: 'AAAA',
      name: 'v6.example.com',
      values: ['2606:4700::1111'],
    }],
  });

  assert.equal(endpoint.domainState, 'dns-confirmed');
  assert.equal(endpoint.dns.observation.matches, true);
});

test('Era 7 Stage 4E corrective: in-flight DNS result cannot overwrite a replaced domain plan', async (t) => {
  const f = serviceFixture(t);
  let resolveObservation;
  f.observer.observeDns = () => new Promise((resolve) => {
    resolveObservation = resolve;
  });

  const pending = f.service.checkDns(f.deploymentId);
  f.store.setPublicEndpoint(f.deploymentId, createDomainPreflight({
    hostname: 'new.example.com',
    destinations: [{ kind: 'ipv4', value: '121.127.34.154' }],
  }));
  resolveObservation({
    checkedAt: '2026-10-03T20:36:00.000Z',
    resolver: 'synthetic',
    records: [{
      type: 'A',
      name: 'dev.fourthstreetbar.com',
      values: ['121.127.34.154'],
    }],
  });

  await assert.rejects(
    () => pending,
    (error) => error.code === 'DEPLOYMENT_PUBLIC_ENDPOINT_STALE',
  );
  const current = f.store.get(f.deploymentId).publicEndpoint;
  assert.equal(current.hostname, 'new.example.com');
  assert.equal(current.domainState, 'dns-instructions-ready');
});

test('Era 7 Stage 4E corrective: in-flight DNS recheck cannot regress newer TLS-requesting state', async (t) => {
  const f = serviceFixture(t);
  await f.service.checkDns(f.deploymentId);
  const confirmed = f.store.get(f.deploymentId).publicEndpoint;

  let resolveObservation;
  f.observer.observeDns = () => new Promise((resolve) => {
    resolveObservation = resolve;
  });
  const pending = f.service.checkDns(f.deploymentId);

  f.store.setPublicEndpoint(f.deploymentId, markTlsRequesting(confirmed));
  resolveObservation({
    checkedAt: '2026-10-03T20:37:00.000Z',
    resolver: 'synthetic',
    records: [{
      type: 'A',
      name: 'dev.fourthstreetbar.com',
      values: ['121.127.34.154'],
    }],
  });

  await assert.rejects(
    () => pending,
    (error) => error.code === 'DEPLOYMENT_PUBLIC_ENDPOINT_STALE',
  );
  assert.equal(f.store.get(f.deploymentId).publicEndpoint.tls.state, 'requesting');
});


test('Era 7 Stage 4E: address requirement fails exact DNS proof when the hostname is actually an alias', async () => {
  const observer = new NodePublicationObserver({
    resolver: {
      async resolve4() {
        return ['121.127.34.154'];
      },
      async resolve6() {
        const error = new Error('no data');
        error.code = 'ENODATA';
        throw error;
      },
      async resolveCname() {
        return ['other.example.com'];
      },
    },
    now: () => Date.parse('2026-10-03T20:38:00.000Z'),
  });
  const preflight = createDomainPreflight({
    hostname: 'dev.fourthstreetbar.com',
    destinations: [{ kind: 'ipv4', value: '121.127.34.154' }],
  });

  const observed = await observer.observeDns(preflight);
  const endpoint = recordDnsObservation(preflight, observed);

  assert.equal(endpoint.domainState, 'dns-mismatch');
  assert.equal(endpoint.dns.observation.matches, false);
  assert.equal(endpoint.dns.observation.conflictingRecords[0].type, 'CNAME');
  assert.equal(endpoint.dns.observation.conflictingRecords[0].values[0], 'other.example.com');
});
