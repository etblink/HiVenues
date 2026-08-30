'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const referenceManifest = require('../ops/privex/manifest.json');
const { DeploymentProfileError, compileDeploymentProfile } = require('../src/deployment/profile');
const { REFERENCE_DEPLOYMENT_PROFILE } = require('../src/deployment/reference/fourth-street-privex');
const { FOURTH_STREET_REFERENCE_VENUE } = require('../src/venue/reference/fourth-street');
const { DEFAULT_ONBOARDING_DB_PATH } = require('../src/onboarding/config');
const { PAYMENT_DB_PATH } = require('../src/release/payment-storage');
const { RELEASE_PUBLIC_HOST } = require('../src/release/privex-readiness');
const { RELEASE_APP_TAG } = require('../src/release/release-version');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const clone = (value) => JSON.parse(JSON.stringify(value));

function syntheticManifest() {
  const manifest = clone(referenceManifest);
  manifest.deployment.id = 'synthetic-offline-deployment';
  manifest.provider = 'Example Provider';
  manifest.package = 'SYNTHETIC-PLAN';
  manifest.region = 'Test Region';
  manifest.operatingSystem = 'Test OS';
  manifest.runtime.nodeVersion = '24.19.0';
  manifest.runtime.npmVersion = '11.17.0';
  manifest.runtime.platform = 'linux-x64';
  manifest.runtime.source = 'https://runtime.example.invalid/node.tar.xz';
  manifest.runtime.sha256 = '0'.repeat(64);
  manifest.topology.instances = 2;
  manifest.topology.edgeProxy = 'Example Edge';
  manifest.topology.edgeDnsMode = 'synthetic';
  manifest.topology.reverseProxy = 'Example Proxy';
  manifest.topology.applicationAddress = '127.0.0.1:4100';
  manifest.topology.applicationTrustProxy = 'loopback';
  manifest.topology.visitorIpHeader = 'X-Test-Visitor-IP';
  manifest.topology.originIngress = 'test-only';
  manifest.topology.cloudflareTlsMode = 'synthetic-strict';
  manifest.release.root = '/tmp/hive-venues-synthetic';
  manifest.release.service = 'hive-venues-synthetic.service';
  manifest.release.publicHost = 'venue.example.invalid';
  manifest.release.redirectHost = 'www.venue.example.invalid';
  manifest.release.hiveAppTag = 'synthetic-hive-venues/0.0.0-test';
  manifest.release.healthPath = '/healthz';
  manifest.release.readinessPath = '/readyz';
  manifest.release.automaticDeploys = false;
  manifest.release.exactCommitRequired = true;
  manifest.release.lastGoodPath = '/tmp/hive-venues-synthetic/last-good';
  manifest.release.lastGoodPolicy = 'synthetic-previous-release';
  manifest.storage.paymentDatabase = '/tmp/hive-venues-synthetic/payments.sqlite3';
  manifest.storage.onboardingDatabase = '/tmp/hive-venues-synthetic/onboarding.sqlite3';
  manifest.provenance.commitFilename = '.synthetic-commit';
  manifest.provenance.treeFilename = '.synthetic-tree';
  manifest.runtimeProfiles.deploymentBaseline = 'synthetic-read-only';
  manifest.runtimeProfiles.acceptedBeta = 'synthetic-beta';
  manifest.runtimeProfiles.wiredV1 = 'synthetic-v1';
  return manifest;
}

function expectInvalid(mutator, pattern) {
  const manifest = syntheticManifest();
  mutator(manifest);
  assert.throws(() => compileDeploymentProfile(manifest), (error) => {
    assert.equal(error instanceof DeploymentProfileError, true);
    assert.match(error.message, pattern);
    return true;
  });
}

test('HV-2 compiles the reviewed Fourth Street manifest into the exact immutable reference deployment', () => {
  const deployment = REFERENCE_DEPLOYMENT_PROFILE;

  assert.equal(deployment.id, 'fourth-street-privex');
  assert.deepEqual(deployment.provider, {
    name: 'Privex',
    package: 'V1-US-NVME',
    region: 'US West',
    operatingSystem: 'Debian 13',
  });
  assert.equal(deployment.runtime.nodeVersion, '24.19.0');
  assert.equal(deployment.runtime.npmVersion, '11.17.0');
  assert.equal(deployment.runtime.platform, 'linux-x64');
  assert.equal(deployment.topology.instances, 1);
  assert.equal(deployment.topology.edgeProxy, 'Cloudflare');
  assert.equal(deployment.topology.reverseProxy, 'Caddy');
  assert.deepEqual(deployment.topology.application, {
    address: '127.0.0.1:3000',
    bindHost: '127.0.0.1',
    port: 3000,
    trustProxy: 'loopback',
  });
  assert.equal(deployment.topology.label, 'single-instance-cloudflare-caddy');
  assert.equal(deployment.release.publicHost, 'fourthstreetbar.com');
  assert.equal(deployment.release.redirectHost, 'www.fourthstreetbar.com');
  assert.equal(deployment.release.root, '/opt/hive-bar');
  assert.equal(deployment.release.service, 'hive-bar.service');
  assert.equal(deployment.release.hiveAppTag, 'fourth-street-bar-app/0.1.0');
  assert.equal(deployment.release.lastGoodPath, '/opt/hive-bar/last-good');
  assert.equal(deployment.storage.paymentDatabase, '/var/lib/hive-bar/payments/receipts.sqlite3');
  assert.equal(deployment.storage.onboardingDatabase, '/var/lib/hive-bar/onboarding/onboarding.sqlite3');
  assert.equal(deployment.provenance.commitFilename, '.hive-bar-commit');
  assert.equal(deployment.provenance.treeFilename, '.hive-bar-tree');
  assert.deepEqual(deployment.runtimeProfiles, {
    deploymentBaseline: 'privex-public-read-only',
    acceptedBeta: 'privex-beta-self-signing',
    wiredV1: 'privex-v1-self-signing',
  });

  for (const value of [
    deployment,
    deployment.provider,
    deployment.runtime,
    deployment.topology,
    deployment.topology.application,
    deployment.release,
    deployment.storage,
    deployment.provenance,
    deployment.runtimeProfiles,
  ]) {
    assert.equal(Object.isFrozen(value), true);
  }
});

test('HV-2 compatibility aliases resolve from the reference deployment profile without semantic drift', () => {
  assert.equal(RELEASE_PUBLIC_HOST, REFERENCE_DEPLOYMENT_PROFILE.release.publicHost);
  assert.equal(RELEASE_APP_TAG, REFERENCE_DEPLOYMENT_PROFILE.release.hiveAppTag);
  assert.equal(PAYMENT_DB_PATH, REFERENCE_DEPLOYMENT_PROFILE.storage.paymentDatabase);
  assert.equal(DEFAULT_ONBOARDING_DB_PATH, REFERENCE_DEPLOYMENT_PROFILE.storage.onboardingDatabase);
});

test('HV-2 compiles a fully synthetic deployment offline without changing the venue package', () => {
  const venueIdentityBefore = JSON.stringify(FOURTH_STREET_REFERENCE_VENUE);
  const deployment = compileDeploymentProfile(syntheticManifest());

  assert.equal(deployment.id, 'synthetic-offline-deployment');
  assert.equal(deployment.provider.name, 'Example Provider');
  assert.equal(deployment.release.publicHost, 'venue.example.invalid');
  assert.equal(deployment.topology.application.port, 4100);
  assert.equal(deployment.storage.paymentDatabase, '/tmp/hive-venues-synthetic/payments.sqlite3');
  assert.equal(deployment.runtimeProfiles.acceptedBeta, 'synthetic-beta');
  assert.equal(Object.isFrozen(deployment), true);
  assert.equal(JSON.stringify(FOURTH_STREET_REFERENCE_VENUE), venueIdentityBefore);
  assert.equal(FOURTH_STREET_REFERENCE_VENUE.hive.paymentMerchantAccounts[0], 'fourthstreetbar');
});

test('HV-2 rejects malformed deployment manifests before release consumers can use them', () => {
  expectInvalid((manifest) => { manifest.schemaVersion = 2; }, /schemaVersion must be exactly 1/);
  expectInvalid((manifest) => { manifest.release.publicHost = 'HTTPS:\/\/VENUE.EXAMPLE.INVALID'; }, /lowercase canonical DNS hostname/);
  expectInvalid((manifest) => { manifest.topology.applicationAddress = '127.0.0.1'; }, /host:port form/);
  expectInvalid((manifest) => { manifest.topology.applicationAddress = '127.0.0.1:70000'; }, /between 1 and 65535/);
  expectInvalid((manifest) => { manifest.release.root = 'relative/releases'; }, /normalized absolute POSIX path/);
  expectInvalid((manifest) => { manifest.storage.paymentDatabase = '../payments.sqlite3'; }, /normalized absolute POSIX path/);
  expectInvalid((manifest) => { manifest.release.automaticDeploys = 'false'; }, /must be a boolean/);
  expectInvalid((manifest) => { manifest.provenance.commitFilename = 'nested\/commit'; }, /filename without path separators/);
  expectInvalid((manifest) => { manifest.runtime.sha256 = 'not-a-sha'; }, /64 lowercase hexadecimal characters/);
});

test('HV-2 removes deployment-owned literals from migrated generic consumers while retaining venue-owned merchant policy', () => {
  const paymentStorage = read('src/release/payment-storage.js');
  const onboardingConfig = read('src/onboarding/config.js');
  const releaseVersion = read('src/release/release-version.js');
  const privexReadiness = read('src/release/privex-readiness.js');
  const betaReadiness = read('src/release/beta-readiness.js');

  assert.doesNotMatch(paymentStorage, /\/var\/lib\/hive-bar\/payments\/receipts\.sqlite3/);
  assert.doesNotMatch(onboardingConfig, /\/var\/lib\/hive-bar\/onboarding\/onboarding\.sqlite3/);
  assert.doesNotMatch(releaseVersion, /fourth-street-bar-app\//);
  assert.doesNotMatch(privexReadiness, /['"]fourthstreetbar\.com['"]/);
  assert.doesNotMatch(privexReadiness, /['"]V1-US-NVME['"]/);
  assert.doesNotMatch(privexReadiness, /['"]US West['"]/);
  assert.doesNotMatch(privexReadiness, /['"]Debian 13['"]/);
  assert.match(betaReadiness, /merchantAccounts\[0\] !== 'fourthstreetbar'/);
  assert.match(betaReadiness, /enabled Pay requires @fourthstreetbar as the sole merchant recipient/);
});
