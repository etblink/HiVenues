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
  const bundleDigest = requireDigest(runtimeProvenance.bundleDigest, 'Runtime bundle');
  const releaseDigest = requireDigest(releaseManifest.releaseDigest, 'Release');
  const packageDigest = requireDigest(releaseManifest.packageDigest, 'Release package');
  const runtimeRoot = '/opt/hivenues/runtime/' + bundleDigest;
  const releaseRoot = '/srv/hivenues/releases/' + releaseManifest.releaseId + '-' + releaseDigest.slice(0, 12);
  const runtimeCurrent = '/opt/hivenues/current';
  const releaseCurrent = '/srv/hivenues/current/' + hostSlug;
  const stateRoot = '/var/lib/hivenues/' + hostSlug;

  return Object.freeze({
    version: 1,
    profile: 'debian-systemd-caddy-v1',
    runtimePort,
    runtimeUser: 'hivenues',
    deploymentUser: 'hivenues-deploy',
    privilegeModel: Object.freeze({
      initialAuthority: 'bootstrap-root',
      steadyStateAuthority: 'restricted-deployment-user',
      runtimeLogin: false,
    }),
    paths: Object.freeze({
      runtimeRoot,
      releaseRoot,
      runtimeCurrent,
      releaseCurrent,
      stateRoot,
      runtimeState: path.posix.join(stateRoot, 'runtime-state.json'),
      environmentFile: '/etc/hivenues/' + hostSlug + '.env',
      serviceUnit: '/etc/systemd/system/hivenues-' + hostSlug + '.service',
      activeRecord: path.posix.join(stateRoot, 'active-deployment.json'),
    }),
    runtime: Object.freeze({
      sourceSha: runtimeProvenance.sourceSha,
      sourceTree: runtimeProvenance.sourceTree,
      packageVersion: runtimeProvenance.packageVersion,
      nodeVersion: runtimeProvenance.nodeVersion,
      bundleDigest,
      installCommand: 'npm ci --omit=dev --ignore-scripts',
      startCommand: 'node scripts/hivenues-public-runtime.js',
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
