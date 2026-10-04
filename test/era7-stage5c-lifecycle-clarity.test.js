'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const ejs = require('ejs');
const request = require('supertest');

const { createHiVenuesApp } = require('../src/product/app');
const { buildViewModel } = require('../src/product/present');
const { HiVenuesStore } = require('../src/product/store');

const VIEWS = path.join(__dirname, '..', 'views', 'hivenues');

async function renderView(name, data) {
  return ejs.renderFile(path.join(VIEWS, name + '.ejs'), data);
}

function model() {
  const store = new HiVenuesStore();
  const snapshot = store.snapshot('harbor-and-hearth');
  return { store, snapshot, view: buildViewModel(snapshot) };
}

test('Era 7 Stage 5C: Website Release review explicitly separates Release creation from external deployment', async () => {
  const { store } = model();
  const app = createHiVenuesApp({
    store,
    identityServices: false,
    participationServices: false,
  });

  const response = await request(app)
    .get('/hivenues/studio/harbor-and-hearth/release')
    .expect(200);

  assert.match(response.text, /Latest website Release/);
  assert.match(response.text, /does <strong>not<\/strong> update[\s\S]*external server/i);
  assert.match(response.text, /Create website Release/);
  assert.match(response.text, /Putting a Release online is separate/);
  assert.match(response.text, /Deployment is the separate action/);
  assert.doesNotMatch(response.text, /<p class="cc-kicker">Currently live<\/p>/);
  assert.doesNotMatch(response.text, />Publish website release<\/button>/);
});

test('Era 7 Stage 5C: deployment page leads with the human lifecycle and moves raw state behind technical disclosure', async () => {
  const { view } = model();
  const release = view.releases.find((item) => item.id === view.liveReleaseId) || view.releases[0];
  const deployment = {
    version: 1,
    id: 'deployment-stage5c',
    hostSlug: 'harbor-and-hearth',
    providerKind: 'ssh-server',
    providerProfile: 'privex-reference',
    capabilities: [],
    state: 'rollback-available',
    stateReason: 'exact-release-readback-match',
    providerState: 'ready',
    paymentState: 'not-requested',
    targetPublicFacts: {
      host: '203.0.113.10',
      port: 22,
      username: 'hivenues-deploy',
      bootstrapUsername: 'debian',
    },
    authorityRef: 'authority-stage5c',
    authorityPublic: null,
    selectedRelease: { id: release.id, digest: release.digest },
    package: {
      schemaVersion: 1,
      releaseId: release.id,
      releaseDigest: release.digest,
      packageDigest: 'a'.repeat(64),
    },
    activeRelease: {
      id: release.id,
      digest: release.digest,
      packageDigest: 'a'.repeat(64),
      deployedAt: '2026-10-04T01:00:00.000Z',
    },
    previousRelease: null,
    runtimeProfile: {
      kind: 'hivenues-public-runtime',
      sourceSha: '1'.repeat(40),
      sourceTree: '2'.repeat(40),
      packageVersion: '1.0.0',
      nodeVersion: 'v24.19.0',
      bundleDigest: '3'.repeat(64),
    },
    pendingRuntimeProfile: null,
    publicEndpoint: {
      hostname: 'dev.example.test',
      domainState: 'dns-confirmed',
      dns: {
        requirements: [{ type: 'A', name: 'dev.example.test', values: ['203.0.113.10'] }],
        observation: null,
      },
      tls: { state: 'verified' },
      publicReadBack: { state: 'verified' },
    },
    healthState: 'healthy',
    rollbackState: 'available',
    history: [],
  };

  const html = await renderView('deployment', {
    pageTitle: 'Deployment — Harbor & Hearth',
    ...view,
    deploymentAvailable: true,
    deploymentProfile: {
      capabilities: ['DEPLOY_RELEASE'],
      externalEffects: false,
    },
    deploymentAuthorityAvailable: false,
    deploymentVerificationAvailable: false,
    deploymentMutationAvailable: false,
    deploymentPublicationInspectionAvailable: false,
    deploymentPublicationExecutionAvailable: false,
    deploymentLifecycleAvailable: false,
    deploymentReauthorizationAvailable: false,
    deployments: [deployment],
    error: '',
  });

  assert.match(html, /Working changes → Website Release → Put online → Connect domain → Verify public site/);
  assert.match(html, /data-deployment-human-status/);
  assert.match(html, /Public site is online and verified/);
  assert.match(html, /Website Release online:/);
  assert.match(html, /data-open-public-site/);
  assert.match(html, /data-deployment-technical-details/);
  assert.match(html, /<summary>Technical deployment details<\/summary>/);
  assert.match(html, /Internal state:[\s\S]*rollback-available/);
  assert.match(html, /Advanced and qualification targets/);
  assert.match(html, /Website Release to put online/);
  assert.match(html, /Prepare this Website Release/);
  assert.match(html, /Public site is serving the expected Website Release/);
  assert.match(html, /<summary>Exact verification<\/summary>/);
});

test('Era 7 Stage 5C: verified public site still surfaces a newer Website Release that has not been deployed', async () => {
  const { view } = model();
  const releaseA = view.releases.find((item) => item.id === view.liveReleaseId) || view.releases[0];
  const releaseB = {
    ...structuredClone(releaseA),
    id: 'release-stage5c-newer',
    digest: '9'.repeat(64),
    draftRevision: releaseA.draftRevision + 1,
  };
  const releases = [...view.releases, releaseB];
  const deployment = {
    version: 1,
    id: 'deployment-stage5c-newer-release',
    hostSlug: 'harbor-and-hearth',
    providerKind: 'ssh-server',
    providerProfile: 'privex-reference',
    capabilities: [],
    state: 'rollback-available',
    stateReason: 'exact-release-readback-match',
    providerState: 'ready',
    paymentState: 'not-requested',
    targetPublicFacts: {
      host: '203.0.113.12',
      port: 22,
      username: 'hivenues-deploy',
      bootstrapUsername: 'debian',
    },
    authorityRef: 'authority-stage5c-newer-release',
    authorityPublic: null,
    selectedRelease: { id: releaseA.id, digest: releaseA.digest },
    package: {
      schemaVersion: 1,
      releaseId: releaseA.id,
      releaseDigest: releaseA.digest,
      packageDigest: 'a'.repeat(64),
    },
    activeRelease: {
      id: releaseA.id,
      digest: releaseA.digest,
      packageDigest: 'a'.repeat(64),
      deployedAt: '2026-10-04T01:00:00.000Z',
    },
    previousRelease: null,
    runtimeProfile: {
      kind: 'hivenues-public-runtime',
      sourceSha: '1'.repeat(40),
      sourceTree: '2'.repeat(40),
      packageVersion: '1.0.0',
      nodeVersion: 'v24.19.0',
      bundleDigest: '3'.repeat(64),
    },
    pendingRuntimeProfile: null,
    publicEndpoint: {
      hostname: 'dev.example.test',
      domainState: 'dns-confirmed',
      dns: {
        requirements: [{ type: 'A', name: 'dev.example.test', values: ['203.0.113.12'] }],
        observation: null,
      },
      tls: { state: 'verified' },
      publicReadBack: { state: 'verified' },
    },
    healthState: 'healthy',
    rollbackState: 'available',
    history: [],
  };

  const html = await renderView('deployment', {
    pageTitle: 'Deployment — Harbor & Hearth',
    ...view,
    releases,
    liveReleaseId: releaseB.id,
    deploymentAvailable: true,
    deploymentProfile: { capabilities: ['DEPLOY_RELEASE'], externalEffects: false },
    deploymentAuthorityAvailable: false,
    deploymentVerificationAvailable: false,
    deploymentMutationAvailable: false,
    deploymentPublicationInspectionAvailable: false,
    deploymentPublicationExecutionAvailable: false,
    deploymentLifecycleAvailable: false,
    deploymentReauthorizationAvailable: false,
    deployments: [deployment],
    error: '',
  });

  assert.match(html, /Public site is verified; a newer Website Release is ready/);
  assert.match(html, new RegExp('data-latest-website-release[\\s\\S]*Version ' + releaseB.draftRevision));
  assert.match(html, new RegExp('data-public-website-release[\\s\\S]*Version ' + releaseA.draftRevision));
  assert.match(html, /Choose the newer Website Release below/);
  assert.doesNotMatch(html, /No deployment action is required/);
});

test('Era 7 Stage 5C P1: interrupted deployment is never presented as publicly verified from stale proof', async () => {
  const { view } = model();
  const release = view.releases.find((item) => item.id === view.liveReleaseId) || view.releases[0];
  const deployment = {
    version: 1,
    id: 'deployment-stage5c-interrupted',
    hostSlug: 'harbor-and-hearth',
    providerKind: 'ssh-server',
    providerProfile: 'privex-reference',
    capabilities: [],
    state: 'deploying',
    stateReason: 'exact-release-deployment-started',
    providerState: 'ready',
    paymentState: 'not-requested',
    targetPublicFacts: {
      host: '203.0.113.11',
      port: 22,
      username: 'hivenues-deploy',
      bootstrapUsername: 'debian',
    },
    authorityRef: 'authority-stage5c-interrupted',
    authorityPublic: null,
    selectedRelease: { id: release.id, digest: release.digest },
    package: {
      schemaVersion: 1,
      releaseId: release.id,
      releaseDigest: release.digest,
      packageDigest: 'b'.repeat(64),
    },
    activeRelease: {
      id: release.id,
      digest: release.digest,
      packageDigest: 'a'.repeat(64),
      deployedAt: '2026-10-04T01:00:00.000Z',
    },
    previousRelease: null,
    runtimeProfile: {
      kind: 'hivenues-public-runtime',
      sourceSha: '1'.repeat(40),
      sourceTree: '2'.repeat(40),
      packageVersion: '1.0.0',
      nodeVersion: 'v24.19.0',
      bundleDigest: '3'.repeat(64),
    },
    pendingRuntimeProfile: {
      kind: 'hivenues-public-runtime',
      sourceSha: '4'.repeat(40),
      sourceTree: '5'.repeat(40),
      packageVersion: '1.0.0',
      nodeVersion: 'v24.19.0',
      bundleDigest: '6'.repeat(64),
    },
    publicEndpoint: {
      hostname: 'dev.example.test',
      domainState: 'dns-confirmed',
      dns: {
        requirements: [{ type: 'A', name: 'dev.example.test', values: ['203.0.113.11'] }],
        observation: null,
      },
      tls: { state: 'verified' },
      publicReadBack: { state: 'verified' },
    },
    healthState: 'checking',
    rollbackState: 'unavailable',
    history: [],
  };

  const html = await renderView('deployment', {
    pageTitle: 'Deployment — Harbor & Hearth',
    ...view,
    deploymentAvailable: true,
    deploymentProfile: { capabilities: ['DEPLOY_RELEASE'], externalEffects: false },
    deploymentAuthorityAvailable: false,
    deploymentVerificationAvailable: false,
    deploymentMutationAvailable: true,
    deploymentPublicationInspectionAvailable: false,
    deploymentPublicationExecutionAvailable: false,
    deploymentLifecycleAvailable: false,
    deploymentReauthorizationAvailable: false,
    deployments: [deployment],
    error: '',
  });

  assert.match(html, /Public update is incomplete/);
  assert.match(html, /Review and resume the interrupted deployment/);
  assert.doesNotMatch(html, /Public site is online and verified/);
  assert.doesNotMatch(html, /No deployment action is required/);
});

test('Era 7 Stage 5C: established deployment review uses update language instead of first-bootstrap language', async () => {
  const { view } = model();
  const release = view.releases.find((item) => item.id === view.liveReleaseId) || view.releases[0];
  const deployment = {
    id: 'deployment-stage5c-review',
    state: 'rollback-available',
    activeRelease: {
      id: release.id,
      digest: release.digest,
      packageDigest: 'a'.repeat(64),
    },
  };
  const review = {
    target: {
      currentUsername: 'hivenues-deploy',
      bootstrapUsername: 'debian',
      host: '203.0.113.10',
      port: 22,
      trustedHostKeyFingerprint: 'SHA256:' + 'Z'.repeat(43),
      verifiedOs: 'Debian GNU/Linux 13 (trixie)',
      verifiedArchitecture: 'x86_64',
    },
    release: {
      id: release.id,
      digest: release.digest,
      packageDigest: 'a'.repeat(64),
    },
    runtime: {
      sourceSha: '1'.repeat(40),
      sourceTree: '2'.repeat(40),
      bundleDigest: '3'.repeat(64),
      nodeVersion: 'v24.19.0',
      packageVersion: '1.0.0',
    },
    consequences: [
      'upload-qualified-public-runtime',
      'configure-named-systemd-caddy-firewall-services',
      'remove-exact-bootstrap-authorized-key',
    ],
    held: ['provider-payment', 'dns-mutation'],
    reviewDigest: '4'.repeat(64),
  };

  const html = await renderView('deployment-review', {
    pageTitle: 'Public website review — Harbor & Hearth',
    ...view,
    deployment,
    review,
  });

  assert.match(html, /Update the public-site runtime without changing the Website Release/);
  assert.match(html, /Use the existing restricted HiVenues deployment account/);
  assert.match(html, />\s*Update public-site runtime\s*<\/button>/);
  assert.match(html, /<summary>Exact technical details<\/summary>/);
  assert.match(html, /Raw consequence identifiers/);
  assert.doesNotMatch(html, /Bootstrap server and deploy this exact Release/);
  assert.doesNotMatch(html, /Original bootstrap account retained only for exact-key cleanup/);
});

test('Era 7 Stage 5C: first deployment retains truthful first-server setup language', async () => {
  const { view } = model();
  const release = view.releases.find((item) => item.id === view.liveReleaseId) || view.releases[0];
  const html = await renderView('deployment-review', {
    pageTitle: 'Public website review — Harbor & Hearth',
    ...view,
    deployment: {
      id: 'deployment-stage5c-first',
      state: 'bootstrap-ready',
      activeRelease: null,
    },
    review: {
      target: {
        currentUsername: 'debian',
        bootstrapUsername: 'debian',
        host: '203.0.113.10',
        port: 22,
        trustedHostKeyFingerprint: 'SHA256:' + 'Q'.repeat(43),
        verifiedOs: 'Debian GNU/Linux 13 (trixie)',
        verifiedArchitecture: 'x86_64',
      },
      release: {
        id: release.id,
        digest: release.digest,
        packageDigest: 'a'.repeat(64),
      },
      runtime: {
        sourceSha: '1'.repeat(40),
        sourceTree: '2'.repeat(40),
        bundleDigest: '3'.repeat(64),
        nodeVersion: 'v24.19.0',
        packageVersion: '1.0.0',
      },
      consequences: ['bootstrap-or-update-bounded-hivenues-runtime'],
      held: ['provider-payment'],
      reviewDigest: '5'.repeat(64),
    },
  });

  assert.match(html, /Set up this server and put the Website Release online/);
  assert.match(html, />\s*Set up server and put Release online\s*<\/button>/);
  assert.match(html, /Move ongoing management to the restricted deployment account/);
});
