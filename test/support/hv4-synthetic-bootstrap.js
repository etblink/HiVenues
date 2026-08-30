'use strict';

const { HV3_SYNTHETIC_PACKAGE, HV3_SYNTHETIC_VENUE } = require('./hv3-synthetic-venue');

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

const HV4_SYNTHETIC_DEPLOYMENT_MANIFEST = deepFreeze({
  schemaVersion: 1,
  deployment: {
    id: 'lantern-room-offline-deployment',
  },
  provider: 'Offline Fixture Provider',
  package: 'NO-ACCOUNT',
  region: 'Fixture Region',
  operatingSystem: 'Fixture OS',
  runtime: {
    nodeVersion: '24.19.0',
    npmVersion: '11.17.0',
    platform: 'linux-x64',
    source: 'https://runtime.example.invalid/node-v24.19.0-linux-x64.tar.xz',
    sha256: '0'.repeat(64),
  },
  topology: {
    instances: 1,
    edgeProxy: 'Fixture Edge',
    edgeDnsMode: 'offline-fixture',
    reverseProxy: 'Fixture Proxy',
    applicationAddress: '127.0.0.1:4100',
    applicationTrustProxy: 'loopback',
    visitorIpHeader: 'X-Fixture-Visitor-IP',
    originIngress: 'offline-only',
    tlsMode: 'fixture-strict',
  },
  release: {
    root: '/tmp/hive-venues/lantern-room-fixture',
    service: 'lantern-room-fixture.service',
    publicHost: 'lantern-room.example.invalid',
    redirectHost: 'www.lantern-room.example.invalid',
    hiveAppTag: 'lantern-room-fixture/0.0.0-test',
    healthPath: '/healthz',
    readinessPath: '/readyz',
    automaticDeploys: false,
    exactCommitRequired: true,
    lastGoodPath: '/tmp/hive-venues/lantern-room-fixture/last-good',
    lastGoodPolicy: 'fixture-previous-release',
  },
  storage: {
    paymentDatabase: '/tmp/hive-venues/lantern-room-fixture/payments.sqlite3',
    onboardingDatabase: '/tmp/hive-venues/lantern-room-fixture/onboarding.sqlite3',
  },
  provenance: {
    commitFilename: '.lantern-room-fixture-commit',
    treeFilename: '.lantern-room-fixture-tree',
  },
  runtimeProfiles: {
    deploymentBaseline: 'fixture-read-only',
    acceptedBeta: 'fixture-beta',
    wiredV1: 'fixture-v1',
  },
});

const HV4_SYNTHETIC_BOOTSTRAP_INPUT = deepFreeze({
  schemaVersion: 1,
  bootstrapId: 'lantern-room-offline-bootstrap',
  bindings: {
    venueId: HV3_SYNTHETIC_VENUE.id,
    packageId: HV3_SYNTHETIC_PACKAGE.id,
    deploymentId: HV4_SYNTHETIC_DEPLOYMENT_MANIFEST.deployment.id,
  },
  venueContext: HV3_SYNTHETIC_VENUE,
  venuePackage: HV3_SYNTHETIC_PACKAGE,
  deploymentManifest: HV4_SYNTHETIC_DEPLOYMENT_MANIFEST,
  metadata: {
    notes: 'Fictional offline bootstrap proof. No real venue, account, credential, or infrastructure is represented.',
  },
});

module.exports = {
  HV4_SYNTHETIC_BOOTSTRAP_INPUT,
  HV4_SYNTHETIC_DEPLOYMENT_MANIFEST,
};
