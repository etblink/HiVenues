'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { buildPublicRuntimeBundle } = require('../../scripts/era7/build-public-runtime-bundle');
const { ExactReleaseDeploymentCoordinator } = require('../deploy/deployment-coordinator');
const { loadRuntimeProvenance } = require('../deploy/public-runtime');
const { SshRemoteDeploymentTarget } = require('../deploy/ssh-remote-deployment-target');
const { stableDigest } = require('./model');

const MUTATION_STATES = new Set([
  'bootstrap-ready',
  'deploying',
  'healthy',
  'rollback-available',
  'degraded',
]);

const CONSEQUENCES = Object.freeze([
  'upload-qualified-public-runtime',
  'upload-exact-immutable-release',
  'bootstrap-or-update-bounded-hivenues-runtime',
  'configure-named-systemd-caddy-firewall-services',
  'prove-restricted-hivenues-deploy-login',
  'remove-exact-bootstrap-authorized-key',
  'verify-exact-runtime-release-health-readback',
]);

const HELD = Object.freeze([
  'provider-payment',
  'custom-domain',
  'dns-mutation',
  'tls-issuance',
]);

function executionError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function requireBuildProvenance(value) {
  const provenance = value && typeof value === 'object' ? value : {};
  if (
    !/^[a-f0-9]{40}$/i.test(String(provenance.sourceSha || ''))
    || !/^[a-f0-9]{40}$/i.test(String(provenance.sourceTree || ''))
    || !/^v24\./.test(String(provenance.nodeVersion || ''))
    || !String(provenance.packageVersion || '').trim()
  ) {
    throw executionError(
      'DEPLOYMENT_INSTALLED_PROVENANCE_INVALID',
      'Installed HiVenues provenance is incomplete for deployment.',
    );
  }
  return Object.freeze({
    sourceSha: String(provenance.sourceSha).toLowerCase(),
    sourceTree: String(provenance.sourceTree).toLowerCase(),
    nodeVersion: String(provenance.nodeVersion),
    packageVersion: String(provenance.packageVersion),
  });
}

function readRuntimeBundle(root) {
  return loadRuntimeProvenance(
    path.join(root, 'runtime-provenance.json'),
    path.join(root, 'runtime-manifest.json'),
  );
}

function sameRuntimeProvenance(actual, expected) {
  return Boolean(
    actual
    && actual.sourceSha === expected.sourceSha
    && actual.sourceTree === expected.sourceTree
    && actual.nodeVersion === expected.nodeVersion
    && actual.packageVersion === expected.packageVersion
  );
}

function materializeInstalledRuntimeBundle({
  runtimeBundlesRoot,
  buildProvenance,
  runtimeBuilder = buildPublicRuntimeBundle,
} = {}) {
  if (!runtimeBundlesRoot) {
    throw new TypeError('Installed deployment composition requires a runtime bundle root.');
  }
  const provenance = requireBuildProvenance(buildProvenance);
  const identity = stableDigest(provenance).slice(0, 24);
  const root = path.join(path.resolve(runtimeBundlesRoot), 'runtime-' + identity);

  if (fs.existsSync(root)) {
    const existing = readRuntimeBundle(root);
    if (!sameRuntimeProvenance(existing, provenance)) {
      throw executionError(
        'DEPLOYMENT_RUNTIME_BUNDLE_PROVENANCE_MISMATCH',
        'Cached public runtime does not match the installed HiVenues build.',
      );
    }
    return Object.freeze({ root, provenance: existing, reused: true });
  }

  fs.mkdirSync(path.dirname(root), { recursive: true });
  const temporary = root + '.tmp-' + process.pid + '-' + crypto.randomBytes(6).toString('hex');
  try {
    runtimeBuilder({
      outputRoot: temporary,
      sourceSha: provenance.sourceSha,
      sourceTree: provenance.sourceTree,
      nodeVersion: provenance.nodeVersion,
    });
    const built = readRuntimeBundle(temporary);
    if (!sameRuntimeProvenance(built, provenance)) {
      throw executionError(
        'DEPLOYMENT_RUNTIME_BUNDLE_PROVENANCE_MISMATCH',
        'Generated public runtime does not match the installed HiVenues build.',
      );
    }
    fs.renameSync(temporary, root);
    return Object.freeze({ root, provenance: built, reused: false });
  } catch (error) {
    fs.rmSync(temporary, { recursive: true, force: true });
    throw error;
  }
}

function requireRemoteRecord(record) {
  if (!record) {
    throw executionError('DEPLOYMENT_NOT_FOUND', 'Deployment target was not found.');
  }
  if (record.providerKind !== 'ssh-server') {
    throw executionError(
      'DEPLOYMENT_TARGET_KIND_INVALID',
      'Remote deployment consequence review requires a verified server target.',
    );
  }
  if (!MUTATION_STATES.has(record.state)) {
    throw executionError(
      'DEPLOYMENT_MUTATION_STATE_INVALID',
      'Server target is not ready for an exact Release deployment review.',
    );
  }
  if (!record.authorityRef) {
    throw executionError(
      'DEPLOYMENT_AUTHORITY_REQUIRED',
      'Server target has no protected deployment authority.',
    );
  }
  if (!record.selectedRelease || !record.package) {
    throw executionError(
      'DEPLOYMENT_RELEASE_REQUIRED',
      'Choose and package an immutable Release before server deployment.',
    );
  }

  const facts = record.targetPublicFacts || {};
  if (
    !String(facts.host || '').trim()
    || !String(facts.username || '').trim()
    || !Number.isInteger(Number(facts.port || 22))
    || !String(facts.trustedHostKeyFingerprint || '').trim()
    || facts.hostKeyTrustState !== 'trusted'
  ) {
    throw executionError(
      'DEPLOYMENT_TARGET_NOT_TRUSTED',
      'Server target must have complete public facts and an explicitly trusted SSH host fingerprint.',
    );
  }
  return record;
}

function exactPackage(packageBuilder, record) {
  const prepared = packageBuilder.build({
    hostSlug: record.hostSlug,
    releaseId: record.selectedRelease.id,
  });
  if (
    prepared.releaseId !== record.selectedRelease.id
    || prepared.releaseDigest !== record.selectedRelease.digest
    || prepared.releaseId !== record.package.releaseId
    || prepared.releaseDigest !== record.package.releaseDigest
    || prepared.packageDigest !== record.package.packageDigest
  ) {
    throw executionError(
      'DEPLOYMENT_PACKAGE_STALE',
      'Prepared deployment package no longer matches the exact selected Release.',
    );
  }
  return prepared;
}

class InstalledRemoteDeploymentService {
  constructor({
    deploymentStore,
    packageBuilder,
    authorityStore,
    runtimeBundlesRoot,
    buildProvenance,
    runtimeBuilder = buildPublicRuntimeBundle,
    targetFactory = (options) => new SshRemoteDeploymentTarget(options),
    now = Date.now,
  } = {}) {
    if (!deploymentStore) throw new TypeError('Installed remote deployment requires a deployment store.');
    if (!packageBuilder || typeof packageBuilder.build !== 'function') {
      throw new TypeError('Installed remote deployment requires a package builder.');
    }
    if (!authorityStore) throw new TypeError('Installed remote deployment requires an authority store.');
    if (!runtimeBundlesRoot) throw new TypeError('Installed remote deployment requires a runtime bundle root.');
    if (typeof targetFactory !== 'function') throw new TypeError('Installed remote deployment requires a target factory.');

    this.deploymentStore = deploymentStore;
    this.packageBuilder = packageBuilder;
    this.authorityStore = authorityStore;
    this.runtimeBundlesRoot = path.resolve(runtimeBundlesRoot);
    this.buildProvenance = requireBuildProvenance(buildProvenance);
    this.runtimeBuilder = runtimeBuilder;
    this.targetFactory = targetFactory;
    this.now = now;
  }

  artifacts(deploymentId) {
    const record = requireRemoteRecord(this.deploymentStore.get(deploymentId));
    const runtime = materializeInstalledRuntimeBundle({
      runtimeBundlesRoot: this.runtimeBundlesRoot,
      buildProvenance: this.buildProvenance,
      runtimeBuilder: this.runtimeBuilder,
    });
    const releasePackage = exactPackage(this.packageBuilder, record);
    return Object.freeze({ record, runtime, releasePackage });
  }

  prepareReview(deploymentId) {
    const { record, runtime, releasePackage } = this.artifacts(deploymentId);
    const facts = record.targetPublicFacts;
    const core = {
      version: 1,
      deploymentId: record.id,
      hostSlug: record.hostSlug,
      state: record.state,
      target: {
        host: String(facts.host),
        port: Number(facts.port || 22),
        currentUsername: String(facts.username),
        bootstrapUsername: String(facts.bootstrapUsername || facts.username),
        trustedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint),
        verifiedOs: String(facts.verifiedOs || ''),
        verifiedArchitecture: String(facts.verifiedArchitecture || ''),
      },
      release: {
        id: releasePackage.releaseId,
        digest: releasePackage.releaseDigest,
        packageDigest: releasePackage.packageDigest,
      },
      runtime: {
        sourceSha: runtime.provenance.sourceSha,
        sourceTree: runtime.provenance.sourceTree,
        packageVersion: runtime.provenance.packageVersion,
        nodeVersion: runtime.provenance.nodeVersion,
        bundleDigest: runtime.provenance.bundleDigest,
      },
      consequences: CONSEQUENCES,
      held: HELD,
    };
    return Object.freeze({
      ...core,
      reviewDigest: stableDigest(core),
    });
  }

  async deploy(deploymentId, {
    reviewDigest,
    confirmation,
  } = {}) {
    if (confirmation !== 'deploy-exact-release') {
      throw executionError(
        'DEPLOYMENT_CONSEQUENCE_CONFIRMATION_REQUIRED',
        'Explicit deployment consequence confirmation is required.',
      );
    }
    const submitted = String(reviewDigest || '').trim().toLowerCase();
    const review = this.prepareReview(deploymentId);
    if (!/^[a-f0-9]{64}$/.test(submitted) || submitted !== review.reviewDigest) {
      throw executionError(
        'DEPLOYMENT_CONSEQUENCE_REVIEW_STALE',
        'Deployment facts changed after review. Review the exact consequence again.',
      );
    }

    const { record, runtime, releasePackage } = this.artifacts(deploymentId);
    const facts = record.targetPublicFacts;
    const target = this.targetFactory({
      authorityStore: this.authorityStore,
      authorityId: record.authorityRef,
      target: {
        host: String(facts.host),
        port: Number(facts.port || 22),
        username: String(facts.username),
      },
      bootstrapUsername: String(facts.bootstrapUsername || facts.username),
      expectedHostKeyFingerprint: String(facts.trustedHostKeyFingerprint),
      hostSlug: record.hostSlug,
    });
    const coordinator = new ExactReleaseDeploymentCoordinator({
      store: this.deploymentStore,
      target,
      now: this.now,
    });
    return coordinator.deploy(deploymentId, {
      runtimeRoot: runtime.root,
      releasePackageRoot: releasePackage.packagePath,
    });
  }
}

module.exports = {
  CONSEQUENCES,
  HELD,
  InstalledRemoteDeploymentService,
  materializeInstalledRuntimeBundle,
  requireBuildProvenance,
};
