'use strict';

const path = require('node:path');

const DNS_HOST_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

class DeploymentProfileError extends Error {
  constructor(message) {
    super(`Deployment profile invalid: ${message}`);
    this.name = 'DeploymentProfileError';
  }
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DeploymentProfileError(`${label} must be an object`);
  }
  return value;
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value !== value.trim()) {
    throw new DeploymentProfileError(`${label} must be a non-empty trimmed string`);
  }
  return value;
}

function requireBoolean(value, label) {
  if (typeof value !== 'boolean') {
    throw new DeploymentProfileError(`${label} must be a boolean`);
  }
  return value;
}

function requirePositiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new DeploymentProfileError(`${label} must be a positive integer`);
  }
  return value;
}

function requireHostname(value, label) {
  const hostname = requireString(value, label);
  if (hostname !== hostname.toLowerCase() || !DNS_HOST_PATTERN.test(hostname)) {
    throw new DeploymentProfileError(`${label} must be a lowercase canonical DNS hostname`);
  }
  return hostname;
}

function requirePosixAbsolutePath(value, label) {
  const filename = requireString(value, label);
  if (
    filename.includes('\\') ||
    !path.posix.isAbsolute(filename) ||
    path.posix.normalize(filename) !== filename
  ) {
    throw new DeploymentProfileError(`${label} must be a normalized absolute POSIX path`);
  }
  return filename;
}

function requireRoutePath(value, label) {
  const route = requireString(value, label);
  if (
    !route.startsWith('/') ||
    route.startsWith('//') ||
    route.includes('\\') ||
    route.includes('?') ||
    route.includes('#')
  ) {
    throw new DeploymentProfileError(`${label} must be an absolute application path without query or fragment`);
  }
  return route;
}

function requireFilename(value, label) {
  const filename = requireString(value, label);
  if (filename.includes('/') || filename.includes('\\') || filename === '.' || filename === '..') {
    throw new DeploymentProfileError(`${label} must be a filename without path separators`);
  }
  return filename;
}

function parseApplicationAddress(value) {
  const address = requireString(value, 'topology.applicationAddress');
  const match = /^([^:\s]+):([0-9]{1,5})$/.exec(address);
  if (!match) {
    throw new DeploymentProfileError('topology.applicationAddress must use host:port form');
  }
  const port = Number(match[2]);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new DeploymentProfileError('topology.applicationAddress port must be between 1 and 65535');
  }
  return Object.freeze({ address, bindHost: match[1], port });
}

function resolveTlsMode(topology) {
  const generic = topology.tlsMode;
  const cloudflareCompatibility = topology.cloudflareTlsMode;
  if (
    generic !== undefined &&
    cloudflareCompatibility !== undefined &&
    generic !== cloudflareCompatibility
  ) {
    throw new DeploymentProfileError(
      'topology.tlsMode and topology.cloudflareTlsMode must agree when both are present',
    );
  }
  return requireString(generic ?? cloudflareCompatibility, 'topology.tlsMode');
}

function deriveTopologyLabel({ instances, edgeProxy, reverseProxy }) {
  const count = instances === 1 ? 'single-instance' : `${instances}-instances`;
  const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${count}-${slug(edgeProxy)}-${slug(reverseProxy)}`;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function compileDeploymentProfile(rawManifest) {
  const manifest = assertPlainObject(rawManifest, 'manifest');
  if (manifest.schemaVersion !== 1) {
    throw new DeploymentProfileError('schemaVersion must be exactly 1');
  }

  const deployment = assertPlainObject(manifest.deployment, 'deployment');
  const runtime = assertPlainObject(manifest.runtime, 'runtime');
  const topology = assertPlainObject(manifest.topology, 'topology');
  const release = assertPlainObject(manifest.release, 'release');
  const storage = assertPlainObject(manifest.storage, 'storage');
  const provenance = assertPlainObject(manifest.provenance, 'provenance');
  const runtimeProfiles = assertPlainObject(manifest.runtimeProfiles, 'runtimeProfiles');
  const application = parseApplicationAddress(topology.applicationAddress);

  const nodeVersion = requireString(runtime.nodeVersion, 'runtime.nodeVersion');
  const npmVersion = requireString(runtime.npmVersion, 'runtime.npmVersion');
  const runtimeSource = requireString(runtime.source, 'runtime.source');
  const runtimeSha256 = requireString(runtime.sha256, 'runtime.sha256');
  if (!/^https:\/\//.test(runtimeSource)) {
    throw new DeploymentProfileError('runtime.source must use HTTPS');
  }
  if (!SHA256_PATTERN.test(runtimeSha256)) {
    throw new DeploymentProfileError('runtime.sha256 must be 64 lowercase hexadecimal characters');
  }

  const profile = {
    schemaVersion: 1,
    id: requireString(deployment.id, 'deployment.id'),
    provider: {
      name: requireString(manifest.provider, 'provider'),
      package: requireString(manifest.package, 'package'),
      region: requireString(manifest.region, 'region'),
      operatingSystem: requireString(manifest.operatingSystem, 'operatingSystem'),
    },
    runtime: {
      nodeVersion,
      npmVersion,
      platform: requireString(runtime.platform, 'runtime.platform'),
      source: runtimeSource,
      sha256: runtimeSha256,
    },
    topology: {
      instances: requirePositiveInteger(topology.instances, 'topology.instances'),
      edgeProxy: requireString(topology.edgeProxy, 'topology.edgeProxy'),
      edgeDnsMode: requireString(topology.edgeDnsMode, 'topology.edgeDnsMode'),
      reverseProxy: requireString(topology.reverseProxy, 'topology.reverseProxy'),
      application: {
        address: application.address,
        bindHost: application.bindHost,
        port: application.port,
        trustProxy: requireString(topology.applicationTrustProxy, 'topology.applicationTrustProxy'),
      },
      visitorIpHeader: requireString(topology.visitorIpHeader, 'topology.visitorIpHeader'),
      originIngress: requireString(topology.originIngress, 'topology.originIngress'),
      tlsMode: resolveTlsMode(topology),
    },
    release: {
      root: requirePosixAbsolutePath(release.root, 'release.root'),
      service: requireFilename(release.service, 'release.service'),
      publicHost: requireHostname(release.publicHost, 'release.publicHost'),
      redirectHost: requireHostname(release.redirectHost, 'release.redirectHost'),
      hiveAppTag: requireString(release.hiveAppTag, 'release.hiveAppTag'),
      healthPath: requireRoutePath(release.healthPath, 'release.healthPath'),
      readinessPath: requireRoutePath(release.readinessPath, 'release.readinessPath'),
      automaticDeploys: requireBoolean(release.automaticDeploys, 'release.automaticDeploys'),
      exactCommitRequired: requireBoolean(release.exactCommitRequired, 'release.exactCommitRequired'),
      lastGoodPath: requirePosixAbsolutePath(release.lastGoodPath, 'release.lastGoodPath'),
      lastGoodPolicy: requireString(release.lastGoodPolicy, 'release.lastGoodPolicy'),
    },
    storage: {
      paymentDatabase: requirePosixAbsolutePath(storage.paymentDatabase, 'storage.paymentDatabase'),
      onboardingDatabase: requirePosixAbsolutePath(storage.onboardingDatabase, 'storage.onboardingDatabase'),
    },
    provenance: {
      commitFilename: requireFilename(provenance.commitFilename, 'provenance.commitFilename'),
      treeFilename: requireFilename(provenance.treeFilename, 'provenance.treeFilename'),
    },
    runtimeProfiles: {
      deploymentBaseline: requireString(runtimeProfiles.deploymentBaseline, 'runtimeProfiles.deploymentBaseline'),
      acceptedBeta: requireString(runtimeProfiles.acceptedBeta, 'runtimeProfiles.acceptedBeta'),
      wiredV1: requireString(runtimeProfiles.wiredV1, 'runtimeProfiles.wiredV1'),
    },
  };

  profile.topology.label = deriveTopologyLabel(profile.topology);
  return deepFreeze(profile);
}

module.exports = {
  DeploymentProfileError,
  compileDeploymentProfile,
};
