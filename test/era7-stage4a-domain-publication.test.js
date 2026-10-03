'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { FileDeploymentStore } = require('../src/product/deployment-store');
const {
  createDomainPreflight,
  invalidatePublicReadBack,
  isPublicIpv4,
  isPublicIpv6,
  normalizeHostname,
  prepareStage4LiveReview,
  recordDnsObservation,
  recordPublicReadBack,
  recordTlsObservation,
  requirePreflight,
} = require('../src/product/deployment-publication');

const runtime = Object.freeze({
  sourceSha: '1'.repeat(40),
  sourceTree: '2'.repeat(40),
  packageVersion: '1.0.0',
  nodeVersion: 'v24.19.0',
  bundleDigest: '3'.repeat(64),
});

const release = Object.freeze({
  hostSlug: 'harbor-and-hearth',
  releaseId: 'release-seed-050783a6ee',
  releaseDigest: '4'.repeat(64),
  packageDigest: '5'.repeat(64),
});

function preflight() {
  return createDomainPreflight({
    hostname: 'dev.fourthstreetbar.com',
    destinations: [{ kind: 'ipv4', value: '121.127.34.154' }],
  });
}

function confirmedDns() {
  return recordDnsObservation(preflight(), {
    checkedAt: '2026-10-03T10:00:00.000Z',
    resolver: 'synthetic-stage4a',
    records: [{
      type: 'A',
      name: 'dev.fourthstreetbar.com',
      values: ['121.127.34.154'],
    }],
  });
}

function verifiedTls() {
  return recordTlsObservation(confirmedDns(), {
    hostname: 'dev.fourthstreetbar.com',
    authorized: true,
    protocol: 'TLSv1.3',
    subjectAltNames: ['dev.fourthstreetbar.com'],
    validFrom: '2026-10-03T09:55:00.000Z',
    validTo: '2027-01-01T00:00:00.000Z',
    checkedAt: '2026-10-03T10:05:00.000Z',
  });
}

test('Era 7 Stage 4A: hostname contract accepts a real FQDN and rejects URL-shaped/operator-ambiguous input', () => {
  assert.equal(normalizeHostname('Dev.FourthStreetBar.com.'), 'dev.fourthstreetbar.com');
  for (const value of [
    'https://dev.fourthstreetbar.com',
    'dev.fourthstreetbar.com/path',
    'dev.fourthstreetbar.com:443',
    'localhost',
    '*.fourthstreetbar.com',
  ]) {
    assert.throws(
      () => normalizeHostname(value),
      (error) => error.code === 'DEPLOYMENT_DOMAIN_HOSTNAME_INVALID',
    );
  }
});

test('Era 7 Stage 4A: preflight produces exact provider-neutral DNS instructions without mutation', () => {
  const value = preflight();
  assert.equal(value.hostname, 'dev.fourthstreetbar.com');
  assert.equal(value.domainState, 'dns-instructions-ready');
  assert.equal(value.tls.state, 'awaiting-dns');
  assert.equal(value.publicReadBack.state, 'unverified');
  assert.deepEqual(value.dns.requirements, [{
    type: 'A',
    name: 'dev.fourthstreetbar.com',
    values: ['121.127.34.154'],
  }]);
  assert.doesNotThrow(() => requirePreflight(JSON.parse(JSON.stringify(value))));
});

test('Era 7 Stage 4A: DNS observation confirms only the exact required destination and never infers TLS', () => {
  const mismatch = recordDnsObservation(preflight(), {
    checkedAt: '2026-10-03T10:00:00.000Z',
    records: [{ type: 'A', name: 'dev.fourthstreetbar.com', values: ['203.0.113.99'] }],
  });
  assert.equal(mismatch.domainState, 'dns-mismatch');
  assert.equal(mismatch.tls.state, 'awaiting-dns');

  const confirmed = confirmedDns();
  assert.equal(confirmed.domainState, 'dns-confirmed');
  assert.equal(confirmed.dns.observation.matches, true);
  assert.equal(confirmed.tls.state, 'ready-for-request');
  assert.equal(confirmed.publicReadBack.state, 'unverified');
});

test('Era 7 Stage 4A: TLS stays distinct from DNS and requires an authorized valid certificate for the exact hostname', () => {
  assert.throws(
    () => recordTlsObservation(preflight(), {
      hostname: 'dev.fourthstreetbar.com',
      authorized: true,
      protocol: 'TLSv1.3',
      subjectAltNames: ['dev.fourthstreetbar.com'],
      validFrom: '2026-10-03T09:55:00.000Z',
      validTo: '2027-01-01T00:00:00.000Z',
      checkedAt: '2026-10-03T10:05:00.000Z',
    }),
    (error) => error.code === 'DEPLOYMENT_TLS_DNS_REQUIRED',
  );

  const wrongName = recordTlsObservation(confirmedDns(), {
    hostname: 'dev.fourthstreetbar.com',
    authorized: true,
    protocol: 'TLSv1.3',
    subjectAltNames: ['other.example.com'],
    validFrom: '2026-10-03T09:55:00.000Z',
    validTo: '2027-01-01T00:00:00.000Z',
    checkedAt: '2026-10-03T10:05:00.000Z',
  });
  assert.equal(wrongName.tls.state, 'degraded');

  const verified = verifiedTls();
  assert.equal(verified.domainState, 'dns-confirmed');
  assert.equal(verified.tls.state, 'verified');
  assert.equal(verified.tls.observation.verified, true);
});

test('Era 7 Stage 4A: public HTTPS read-back rejects generic success and proves exact runtime plus immutable Release', () => {
  const generic = recordPublicReadBack(verifiedTls(), {
    url: 'https://dev.fourthstreetbar.com/__hivenues/health',
    statusCode: 200,
    checkedAt: '2026-10-03T10:06:00.000Z',
    body: { status: 'healthy' },
  }, { runtime, release });
  assert.equal(generic.publicReadBack.state, 'mismatch');
  assert.ok(generic.publicReadBack.mismatchFields.includes('runtime.sourceSha'));
  assert.ok(generic.publicReadBack.mismatchFields.includes('deployment.releaseId'));

  const exact = recordPublicReadBack(verifiedTls(), {
    url: 'https://dev.fourthstreetbar.com/__hivenues/health',
    statusCode: 200,
    checkedAt: '2026-10-03T10:06:00.000Z',
    body: {
      version: 1,
      status: 'healthy',
      runtime,
      deployment: release,
    },
  }, { runtime, release });
  assert.equal(exact.publicReadBack.state, 'verified');
  assert.deepEqual(exact.publicReadBack.mismatchFields, []);
});

test('Era 7 Stage 4A: deployment store persists publication proof outside HostGraph and keeps summary state derived', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-era7-stage4a-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const statePath = path.join(root, 'deployment-state.json');
  const store = new FileDeploymentStore({
    statePath,
    now: () => Date.parse('2026-10-03T10:07:00.000Z'),
    idFactory: () => 'stage4a-target',
  });
  const deployment = store.createDraft({
    hostSlug: 'harbor-and-hearth',
    providerKind: 'ssh-server',
    providerProfile: 'privex-reference',
    capabilities: ['DOMAIN', 'DNS', 'TLS', 'HEALTH'],
  });
  const endpoint = confirmedDns();
  const saved = store.setPublicEndpoint(deployment.id, endpoint);
  assert.equal(saved.publicEndpoint.hostname, 'dev.fourthstreetbar.com');
  assert.equal(saved.domainState, 'dns-confirmed');
  assert.equal(saved.tlsState, 'ready-for-request');

  const restarted = new FileDeploymentStore({ statePath });
  const recovered = restarted.get(deployment.id);
  assert.deepEqual(recovered.publicEndpoint, JSON.parse(JSON.stringify(endpoint)));
  assert.equal(recovered.domainState, recovered.publicEndpoint.domainState);
  assert.equal(recovered.tlsState, recovered.publicEndpoint.tls.state);

  const tampered = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  tampered.deployments[0].tlsState = 'verified';
  fs.writeFileSync(statePath, JSON.stringify(tampered), 'utf8');
  assert.throws(
    () => new FileDeploymentStore({ statePath }).get(deployment.id),
    (error) => error.code === 'DEPLOYMENT_STATE_INVALID',
  );
});

test('Era 7 Stage 4A: live consequence review is bounded and does not silently authorize unrelated effects', () => {
  const review = prepareStage4LiveReview({
    preflight: preflight(),
    deployment: {
      id: 'deployment-stage4a',
      state: 'healthy',
      activeRelease: {
        id: release.releaseId,
        digest: release.releaseDigest,
        packageDigest: release.packageDigest,
      },
    },
  });
  assert.equal(review.hostname, 'dev.fourthstreetbar.com');
  assert.equal(
    review.consequences.includes('verify-public-https-exact-runtime-release-readback'),
    true,
  );
  assert.equal(review.held.includes('provider-payment'), true);
  assert.equal(review.held.includes('hive-writes'), true);
  assert.equal(review.held.includes('unrelated-dns-records'), true);

  assert.throws(
    () => prepareStage4LiveReview({
      preflight: preflight(),
      deployment: {
        id: 'deployment-stage4a',
        state: 'degraded',
        activeRelease: review.activeRelease,
      },
    }),
    (error) => error.code === 'DEPLOYMENT_DOMAIN_HEALTHY_REQUIRED',
  );
});


test('Era 7 Stage 4A corrective: publication destinations reject non-public and documentation address ranges', () => {
  for (const value of ['0.0.0.0', '10.0.0.1', '100.64.0.1', '127.0.0.1', '169.254.1.1', '172.16.0.1', '192.168.1.1', '198.51.100.7', '203.0.113.7', '224.0.0.1']) {
    assert.equal(isPublicIpv4(value), false, value);
    assert.throws(
      () => createDomainPreflight({
        hostname: 'dev.fourthstreetbar.com',
        destinations: [{ kind: 'ipv4', value }],
      }),
      (error) => error.code === 'DEPLOYMENT_DOMAIN_DESTINATION_NOT_PUBLIC',
    );
  }
  assert.equal(isPublicIpv4('121.127.34.154'), true);
  assert.equal(isPublicIpv6('2001:4860:4860::8888'), true);
  assert.equal(isPublicIpv6('::1'), false);
  assert.equal(isPublicIpv6('fe80::1'), false);
  assert.equal(isPublicIpv6('2001:db8::1'), false);
});

test('Era 7 Stage 4A corrective: asserted DNS/TLS/public verified summaries are rejected without supporting evidence', () => {
  const assertedDns = JSON.parse(JSON.stringify(preflight()));
  assertedDns.domainState = 'dns-confirmed';
  assert.throws(
    () => requirePreflight(assertedDns),
    (error) => error.code === 'DEPLOYMENT_DOMAIN_PREFLIGHT_INVALID',
  );

  const assertedTls = JSON.parse(JSON.stringify(confirmedDns()));
  assertedTls.tls = { state: 'verified', observation: null };
  assert.throws(
    () => requirePreflight(assertedTls),
    (error) => error.code === 'DEPLOYMENT_DOMAIN_PREFLIGHT_INVALID',
  );

  const assertedPublic = JSON.parse(JSON.stringify(verifiedTls()));
  assertedPublic.publicReadBack = {
    state: 'verified',
    observation: null,
    mismatchFields: [],
  };
  assert.throws(
    () => requirePreflight(assertedPublic),
    (error) => error.code === 'DEPLOYMENT_DOMAIN_PREFLIGHT_INVALID',
  );
});

test('Era 7 Stage 4A corrective: exact DNS recheck preserves independent TLS and public proof while mismatch invalidates both', () => {
  const proven = recordPublicReadBack(verifiedTls(), {
    url: 'https://dev.fourthstreetbar.com/__hivenues/health',
    statusCode: 200,
    checkedAt: '2026-10-03T10:06:00.000Z',
    body: {
      version: 1,
      status: 'healthy',
      runtime,
      deployment: release,
    },
  }, { runtime, release });
  assert.equal(proven.publicReadBack.state, 'verified');

  const rechecked = recordDnsObservation(proven, {
    checkedAt: '2026-10-03T10:07:00.000Z',
    records: [{
      type: 'A',
      name: 'dev.fourthstreetbar.com',
      values: ['121.127.34.154'],
    }],
  });
  assert.equal(rechecked.domainState, 'dns-confirmed');
  assert.equal(rechecked.tls.state, 'verified');
  assert.equal(rechecked.publicReadBack.state, 'verified');
  assert.equal(rechecked.publicReadBack.observation.expected.release.releaseId, release.releaseId);

  const changed = recordDnsObservation(rechecked, {
    checkedAt: '2026-10-03T10:08:00.000Z',
    records: [{
      type: 'A',
      name: 'dev.fourthstreetbar.com',
      values: ['121.127.34.155'],
    }],
  });
  assert.equal(changed.domainState, 'dns-mismatch');
  assert.equal(changed.tls.state, 'awaiting-dns');
  assert.equal(changed.tls.observation, null);
  assert.equal(changed.publicReadBack.state, 'unverified');
});

test('Era 7 Stage 4A corrective: verified public read-back persists exact observed and expected runtime/Release identity', () => {
  const proven = recordPublicReadBack(verifiedTls(), {
    url: 'https://dev.fourthstreetbar.com/__hivenues/health',
    statusCode: 200,
    checkedAt: '2026-10-03T10:06:00.000Z',
    body: {
      version: 1,
      status: 'healthy',
      runtime,
      deployment: release,
    },
  }, { runtime, release });

  assert.deepEqual(proven.publicReadBack.observation.expected.runtime, runtime);
  assert.deepEqual(proven.publicReadBack.observation.expected.release, release);
  assert.equal(proven.publicReadBack.observation.observed.runtime.bundleDigest, runtime.bundleDigest);
  assert.equal(proven.publicReadBack.observation.observed.deployment.releaseId, release.releaseId);
  assert.doesNotThrow(() => requirePreflight(JSON.parse(JSON.stringify(proven))));

  const contradicted = JSON.parse(JSON.stringify(proven));
  contradicted.publicReadBack.observation.observed.deployment.releaseId = 'release-other';
  assert.throws(
    () => requirePreflight(contradicted),
    (error) => error.code === 'DEPLOYMENT_DOMAIN_PREFLIGHT_INVALID',
  );

  const invalidated = invalidatePublicReadBack(proven, 'deployment-identity-changed');
  assert.equal(invalidated.tls.state, 'verified');
  assert.equal(invalidated.publicReadBack.state, 'unverified');
  assert.equal(invalidated.publicReadBack.invalidatedReason, 'deployment-identity-changed');
});

test('Era 7 Stage 4A corrective: deployment identity change invalidates stale public proof but preserves domain/TLS evidence', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-era7-stage4a-identity-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const statePath = path.join(root, 'deployment-state.json');
  const store = new FileDeploymentStore({
    statePath,
    now: () => Date.parse('2026-10-03T10:09:00.000Z'),
    idFactory: () => 'stage4a-identity',
  });
  const deployment = store.createDraft({
    hostSlug: 'harbor-and-hearth',
    providerKind: 'ssh-server',
    providerProfile: 'privex-reference',
    capabilities: ['DOMAIN', 'DNS', 'TLS', 'HEALTH'],
  });
  store.transition(deployment.id, 'target-ready', { reason: 'test' });
  store.transition(deployment.id, 'verifying', { reason: 'test' });
  store.transition(deployment.id, 'bootstrap-ready', { reason: 'test' });
  store.transition(deployment.id, 'deploying', { reason: 'test' });
  store.transition(deployment.id, 'healthy', {
    reason: 'test',
    patch: {
      activeRelease: {
        id: release.releaseId,
        digest: release.releaseDigest,
        packageDigest: release.packageDigest,
        deployedAt: '2026-10-03T10:00:00.000Z',
      },
      runtimeProfile: { kind: 'hivenues-public-runtime', ...runtime },
      healthState: 'healthy',
    },
  });

  const proven = recordPublicReadBack(verifiedTls(), {
    url: 'https://dev.fourthstreetbar.com/__hivenues/health',
    statusCode: 200,
    checkedAt: '2026-10-03T10:06:00.000Z',
    body: {
      version: 1,
      status: 'healthy',
      runtime,
      deployment: release,
    },
  }, { runtime, release });
  store.setPublicEndpoint(deployment.id, proven);
  assert.equal(store.get(deployment.id).publicEndpoint.publicReadBack.state, 'verified');

  store.transition(deployment.id, 'deploying', { reason: 'release-b-started' });
  store.transition(deployment.id, 'rollback-available', {
    reason: 'release-b-readback-match',
    patch: {
      activeRelease: {
        id: 'release-b',
        digest: '6'.repeat(64),
        packageDigest: '7'.repeat(64),
        deployedAt: '2026-10-03T10:10:00.000Z',
      },
      runtimeProfile: {
        kind: 'hivenues-public-runtime',
        ...runtime,
        sourceSha: '8'.repeat(40),
        sourceTree: '9'.repeat(40),
        bundleDigest: 'a'.repeat(64),
      },
    },
  });

  const changed = store.get(deployment.id);
  assert.equal(changed.domainState, 'dns-confirmed');
  assert.equal(changed.tlsState, 'verified');
  assert.equal(changed.publicEndpoint.publicReadBack.state, 'unverified');
  assert.equal(
    changed.publicEndpoint.publicReadBack.invalidatedReason,
    'deployment-identity-changed',
  );
  assert.doesNotThrow(() => new FileDeploymentStore({ statePath }).get(deployment.id));
});

test('Era 7 Stage 4A corrective: persisted verified proof must match the deployment active identity', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-era7-stage4a-tamper-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const statePath = path.join(root, 'deployment-state.json');
  const store = new FileDeploymentStore({
    statePath,
    now: () => Date.parse('2026-10-03T10:09:00.000Z'),
    idFactory: () => 'stage4a-tamper',
  });
  const deployment = store.createDraft({
    hostSlug: 'harbor-and-hearth',
    providerKind: 'ssh-server',
    providerProfile: 'privex-reference',
    capabilities: ['DOMAIN', 'DNS', 'TLS', 'HEALTH'],
  });
  store.transition(deployment.id, 'target-ready', { reason: 'test' });
  store.transition(deployment.id, 'verifying', { reason: 'test' });
  store.transition(deployment.id, 'bootstrap-ready', { reason: 'test' });
  store.transition(deployment.id, 'deploying', { reason: 'test' });
  store.transition(deployment.id, 'healthy', {
    reason: 'test',
    patch: {
      activeRelease: {
        id: release.releaseId,
        digest: release.releaseDigest,
        packageDigest: release.packageDigest,
        deployedAt: '2026-10-03T10:00:00.000Z',
      },
      runtimeProfile: { kind: 'hivenues-public-runtime', ...runtime },
    },
  });
  const proven = recordPublicReadBack(verifiedTls(), {
    url: 'https://dev.fourthstreetbar.com/__hivenues/health',
    statusCode: 200,
    checkedAt: '2026-10-03T10:06:00.000Z',
    body: { version: 1, status: 'healthy', runtime, deployment: release },
  }, { runtime, release });
  store.setPublicEndpoint(deployment.id, proven);

  const tampered = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  tampered.deployments[0].activeRelease.id = 'release-tampered';
  fs.writeFileSync(statePath, JSON.stringify(tampered), 'utf8');
  assert.throws(
    () => new FileDeploymentStore({ statePath }).get(deployment.id),
    (error) => error.code === 'DEPLOYMENT_STATE_INVALID',
  );
});
