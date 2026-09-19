'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const { loadRuntimeProvenance } = require('./public-runtime');
const { loadReleasePackage } = require('./release-store');

function targetError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function writeAtomicJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temp = filePath + '.tmp-' + process.pid + '-' + crypto.randomBytes(6).toString('hex');
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temp, filePath);
}

function copyTree(source, destination) {
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
    throw targetError('DEPLOYED_TARGET_SOURCE_MISSING', 'Deployment source directory is missing.');
  }
  fs.cpSync(source, destination, {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
}

class LocalMutableDeploymentTarget {
  constructor({
    root,
    failAt = '',
  } = {}) {
    if (!root) throw new TypeError('Local mutable deployment target requires root.');
    this.root = path.resolve(root);
    this.failAt = String(failAt || '');
    this.operations = [];
    fs.mkdirSync(this.root, { recursive: true });
  }

  maybeFail(operation) {
    this.operations.push(operation);
    if (this.failAt && this.failAt === operation) {
      this.failAt = '';
      throw targetError(
        'DEPLOYED_TARGET_INJECTED_FAILURE',
        'Injected Stage-3A target failure at ' + operation + '.',
      );
    }
  }

  installRuntime(runtimeRoot) {
    this.maybeFail('install-runtime');
    const source = path.resolve(runtimeRoot);
    const manifestPath = path.join(source, 'runtime-manifest.json');
    const provenancePath = path.join(source, 'runtime-provenance.json');
    const provenance = loadRuntimeProvenance(provenancePath, manifestPath);
    const destination = path.join(this.root, 'runtime', provenance.bundleDigest);

    const reused = fs.existsSync(destination);
    if (!reused) {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      copyTree(source, destination);
    }

    const verified = loadRuntimeProvenance(
      path.join(destination, 'runtime-provenance.json'),
      path.join(destination, 'runtime-manifest.json'),
    );
    if (verified.bundleDigest !== provenance.bundleDigest) {
      throw targetError('DEPLOYED_TARGET_RUNTIME_MISMATCH', 'Installed runtime bundle does not match.');
    }
    return Object.freeze({
      reused,
      path: destination,
      provenance: verified,
    });
  }

  installRelease(packageRoot) {
    this.maybeFail('install-release');
    const source = path.resolve(packageRoot);
    const release = loadReleasePackage(source);
    const destination = path.join(
      this.root,
      'releases',
      release.manifest.releaseId + '-' + release.manifest.releaseDigest.slice(0, 12),
    );

    const reused = fs.existsSync(destination);
    if (!reused) {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      copyTree(source, destination);
    }

    const verified = loadReleasePackage(destination);
    if (
      verified.manifest.releaseDigest !== release.manifest.releaseDigest
      || verified.manifest.packageDigest !== release.manifest.packageDigest
    ) {
      throw targetError('DEPLOYED_TARGET_RELEASE_MISMATCH', 'Installed Release package does not match.');
    }
    return Object.freeze({
      reused,
      path: destination,
      manifest: verified.manifest,
    });
  }

  activate({
    runtime,
    release,
    plan,
  }) {
    this.maybeFail('activate');
    if (!runtime?.provenance || !release?.manifest || !plan) {
      throw targetError('DEPLOYED_TARGET_ACTIVATION_INVALID', 'Deployment activation inputs are invalid.');
    }

    const record = {
      version: 1,
      activatedAt: new Date().toISOString(),
      runtime: {
        bundleDigest: runtime.provenance.bundleDigest,
        sourceSha: runtime.provenance.sourceSha,
        sourceTree: runtime.provenance.sourceTree,
        packageVersion: runtime.provenance.packageVersion,
        nodeVersion: runtime.provenance.nodeVersion,
        path: runtime.path,
      },
      release: {
        hostSlug: release.manifest.hostSlug,
        releaseId: release.manifest.releaseId,
        releaseDigest: release.manifest.releaseDigest,
        packageDigest: release.manifest.packageDigest,
        path: release.path,
      },
      bootstrap: {
        profile: plan.profile,
        runtimeUser: plan.runtimeUser,
        deploymentUser: plan.deploymentUser,
        runtimePort: plan.runtimePort,
        authorityState: 'restricted-deployment-user',
      },
    };

    const currentPath = path.join(this.root, 'active-deployment.json');
    const previousPath = path.join(this.root, 'previous-deployment.json');
    if (fs.existsSync(currentPath)) {
      fs.copyFileSync(currentPath, previousPath);
    }
    writeAtomicJson(currentPath, record);
    return Object.freeze(record);
  }

  readBack() {
    this.maybeFail('read-back');
    const currentPath = path.join(this.root, 'active-deployment.json');
    if (!fs.existsSync(currentPath)) return null;
    const record = JSON.parse(fs.readFileSync(currentPath, 'utf8'));

    const runtime = loadRuntimeProvenance(
      path.join(record.runtime.path, 'runtime-provenance.json'),
      path.join(record.runtime.path, 'runtime-manifest.json'),
    );
    const release = loadReleasePackage(record.release.path);

    return Object.freeze({
      status: 'healthy',
      runtime: Object.freeze({
        sourceSha: runtime.sourceSha,
        sourceTree: runtime.sourceTree,
        packageVersion: runtime.packageVersion,
        nodeVersion: runtime.nodeVersion,
        bundleDigest: runtime.bundleDigest,
      }),
      deployment: Object.freeze({
        hostSlug: release.manifest.hostSlug,
        releaseId: release.manifest.releaseId,
        releaseDigest: release.manifest.releaseDigest,
        packageDigest: release.manifest.packageDigest,
      }),
      bootstrap: Object.freeze({
        profile: record.bootstrap.profile,
        runtimeUser: record.bootstrap.runtimeUser,
        deploymentUser: record.bootstrap.deploymentUser,
        runtimePort: record.bootstrap.runtimePort,
        authorityState: record.bootstrap.authorityState,
      }),
    });
  }

  previousReadBack() {
    const previousPath = path.join(this.root, 'previous-deployment.json');
    if (!fs.existsSync(previousPath)) return null;
    const record = JSON.parse(fs.readFileSync(previousPath, 'utf8'));
    return Object.freeze(record);
  }

  fingerprint() {
    const files = [];
    const walk = (directory) => {
      for (const name of fs.readdirSync(directory).sort()) {
        const full = path.join(directory, name);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) walk(full);
        else if (stat.isFile()) {
          const relative = path.relative(this.root, full).replaceAll('\\', '/');
          const bytes = fs.readFileSync(full);
          files.push([relative, bytes.length, sha256(bytes)]);
        }
      }
    };
    walk(this.root);
    return sha256(Buffer.from(JSON.stringify(files), 'utf8'));
  }
}

module.exports = {
  LocalMutableDeploymentTarget,
};
