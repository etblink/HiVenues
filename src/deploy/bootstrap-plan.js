'use strict';

const path = require('node:path');

function planError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function requireDigest(value, label) {
  const digest = String(value || '').trim();
  if (!/^[a-f0-9]{64}$/.test(digest)) {
    throw planError('DEPLOYED_BOOTSTRAP_PLAN_INVALID', label + ' digest is invalid.');
  }
  return digest;
}

function requireSlug(value) {
  const slug = String(value || '').trim();
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(slug)) {
    throw planError('DEPLOYED_BOOTSTRAP_PLAN_INVALID', 'Host slug is invalid for deployment.');
  }
  return slug;
}

function createReferenceBootstrapPlan({
  runtimeProvenance,
  releaseManifest,
  runtimePort = 4317,
  bootstrapUsername = 'root',
} = {}) {
  if (
    !runtimeProvenance
    || !releaseManifest
    || !Number.isInteger(runtimePort)
    || runtimePort < 1024
    || runtimePort > 65535
  ) {
    throw planError('DEPLOYED_BOOTSTRAP_PLAN_INVALID', 'Bootstrap inputs are invalid.');
  }

  const hostSlug = requireSlug(releaseManifest.hostSlug);
  const initialRemoteAccount = String(bootstrapUsername || '').trim();
  if (!/^[A-Za-z_][A-Za-z0-9_-]{0,31}$/.test(initialRemoteAccount)) {
    throw planError('DEPLOYED_BOOTSTRAP_PLAN_INVALID', 'Bootstrap remote account is invalid.');
  }
  const bundleDigest = requireDigest(runtimeProvenance.bundleDigest, 'Runtime bundle');
  const releaseDigest = requireDigest(releaseManifest.releaseDigest, 'Release');
  const packageDigest = requireDigest(releaseManifest.packageDigest, 'Release package');
  const runtimeRoot = '/opt/hivenues/runtime/' + bundleDigest;
  const releaseRoot = '/srv/hivenues/releases/' + releaseManifest.releaseId + '-' + releaseDigest.slice(0, 12);
  const runtimeCurrent = '/opt/hivenues/runtime/current';
  const releaseCurrent = '/srv/hivenues/releases/current-' + hostSlug;
  const stateRoot = '/var/lib/hivenues/' + hostSlug;
  if (runtimeProvenance.nodeVersion !== 'v24.19.0') {
    throw planError(
      'DEPLOYED_BOOTSTRAP_PLAN_INVALID',
      'Reference deployment requires qualified Node v24.19.0.',
    );
  }
  const nodeRoot = '/opt/hivenues/node/v24.19.0';

  return Object.freeze({
    version: 1,
    profile: 'debian-systemd-caddy-v1',
    runtimePort,
    runtimeUser: 'hivenues',
    deploymentUser: 'hivenues-deploy',
    privilegeModel: Object.freeze({
      initialAuthority: 'bootstrap-admin',
      initialRemoteAccount,
      steadyStateAuthority: 'restricted-deployment-user',
      steadyRemoteAccount: 'hivenues-deploy',
      runtimeLogin: false,
      authorityNarrowing: Object.freeze([
        'create-restricted-deployment-account',
        'install-same-deployment-public-key',
        'prove-restricted-ssh-login',
        'remove-exact-bootstrap-authorized-key',
        'persist-restricted-remote-account',
      ]),
    }),
    paths: Object.freeze({
      runtimeRoot,
      releaseRoot,
      nodeRoot,
      runtimeCurrent,
      releaseCurrent,
      stateRoot,
      runtimeState: path.posix.join(stateRoot, 'runtime-state.json'),
      environmentFile: '/etc/hivenues/' + hostSlug + '.env',
      serviceUnit: '/etc/systemd/system/hivenues-' + hostSlug + '.service',
      caddyConfig: '/etc/hivenues/' + hostSlug + '.caddy',
      caddyService: '/etc/systemd/system/hivenues-caddy.service',
      firewallPolicy: '/etc/hivenues/' + hostSlug + '.nft',
      firewallService: '/etc/systemd/system/hivenues-firewall.service',
      sudoersFile: '/etc/sudoers.d/hivenues-' + hostSlug,
      activeRecord: path.posix.join(stateRoot, 'active-deployment.json'),
    }),
    ownership: Object.freeze({
      runtimeArtifacts: 'hivenues-deploy:hivenues',
      releaseArtifacts: 'hivenues-deploy:hivenues',
      runtimeState: 'hivenues:hivenues',
      rootConfiguration: 'root:root',
    }),
    nodeDistribution: Object.freeze({
      version: 'v24.19.0',
      npmVersion: '11.17.0',
      architecture: 'x86_64',
      archiveName: 'node-v24.19.0-linux-x64.tar.xz',
      url: 'https://nodejs.org/dist/v24.19.0/node-v24.19.0-linux-x64.tar.xz',
      sha256: '14b342e71204f811bde6153be8e04b62aef63c236fef92b55f9c83154b409647',
      installRoot: nodeRoot,
      nodePath: nodeRoot + '/bin/node',
      npmPath: nodeRoot + '/bin/npm',
    }),
    runtime: Object.freeze({
      sourceSha: runtimeProvenance.sourceSha,
      sourceTree: runtimeProvenance.sourceTree,
      packageVersion: runtimeProvenance.packageVersion,
      nodeVersion: runtimeProvenance.nodeVersion,
      bundleDigest,
      installCommand: nodeRoot + '/bin/npm ci --omit=dev --ignore-scripts',
      startCommand: nodeRoot + '/bin/node scripts/hivenues-public-runtime.js',
      bindHost: '127.0.0.1',
    }),
    release: Object.freeze({
      hostSlug,
      releaseId: releaseManifest.releaseId,
      releaseDigest,
      packageDigest,
    }),
    operations: Object.freeze([
      'ensure-runtime-user',
      'ensure-deployment-user',
      'ensure-bounded-directories',
      'install-qualified-node-runtime',
      'install-runtime-bundle',
      'install-locked-production-dependencies',
      'install-exact-release-package',
      'write-runtime-environment-once',
      'write-systemd-service-once',
      'write-caddy-http-config-once',
      'write-bounded-firewall-policy-once',
      'activate-runtime-pointer',
      'activate-release-pointer',
      'restart-named-service',
      'verify-loopback-health',
      'narrow-bootstrap-authority',
      'read-back-runtime-and-release',
    ]),
    held: Object.freeze([
      'custom-domain',
      'dns-mutation',
      'tls-issuance',
      'provider-payment',
    ]),
  });
}

module.exports = {
  createReferenceBootstrapPlan,
};
