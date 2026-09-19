'use strict';

const path = require('node:path');

const { FileDeploymentAuthorityStore } = require('./deployment-authority');
const { createDeploymentPackageBuilder } = require('./deployment-package');
const { FileDeploymentStore } = require('./deployment-store');
const { SshTargetVerificationService } = require('./deployment-target-verification');
const { Ssh2ReadOnlyVerificationTransport } = require('./ssh2-readonly-transport');
const { SyntheticDeploymentAdapter } = require('./synthetic-deployment-adapter');
const { InstalledRemoteDeploymentService } = require('./deployment-execution');

function createLocalDeploymentServices({
  store,
  statePath,
  packageRoot,
  mediaRoot,
  publicRoot = path.join(__dirname, '..', '..', 'public'),
  authorityRoot = '',
  authorityProtector = null,
  authorityIdFactory,
  authorityKeyPairFactory,
  verificationTransport,
  now = Date.now,
  idFactory,
} = {}) {
  if (!store) throw new TypeError('HiVenues local deployment services require the HostGraph store.');
  if (!statePath) throw new TypeError('HiVenues local deployment services require a deployment state path.');
  if (!packageRoot) throw new TypeError('HiVenues local deployment services require a deployment package root.');
  if (!mediaRoot) throw new TypeError('HiVenues local deployment services require a media root.');

  const deploymentStore = new FileDeploymentStore({
    statePath,
    now,
    ...(idFactory ? { idFactory } : {}),
  });
  const packageBuilder = createDeploymentPackageBuilder({
    store,
    mediaRoot,
    publicRoot,
    packageRoot,
  });
  const syntheticAdapter = new SyntheticDeploymentAdapter({
    store: deploymentStore,
    now,
  });
  const authorityStore = authorityRoot && authorityProtector
    ? new FileDeploymentAuthorityStore({
        root: authorityRoot,
        protector: authorityProtector,
        now,
        ...(authorityIdFactory ? { idFactory: authorityIdFactory } : {}),
        ...(authorityKeyPairFactory ? { keyPairFactory: authorityKeyPairFactory } : {}),
      })
    : null;
  const sshVerificationTransport = authorityStore
    ? (
        verificationTransport === false
          ? null
          : (verificationTransport || new Ssh2ReadOnlyVerificationTransport())
      )
    : null;
  const targetVerifier = authorityStore && sshVerificationTransport
    ? new SshTargetVerificationService({
        store: deploymentStore,
        authorityStore,
        transport: sshVerificationTransport,
        now,
      })
    : null;

  return Object.freeze({
    kind: targetVerifier ? 'local-stage2b' : (authorityStore ? 'local-stage2a' : 'local-stage1'),
    deploymentStore,
    packageBuilder,
    authorityStore,
    targetVerifier,
    adapters: Object.freeze({
      synthetic: syntheticAdapter,
    }),
  });
}


function createInstalledDeploymentServices({
  runtimeBundlesRoot,
  buildProvenance,
  remoteTargetFactory,
  runtimeBuilder,
  ...options
} = {}) {
  const local = createLocalDeploymentServices(options);
  if (!local.authorityStore || !local.targetVerifier) {
    throw new TypeError('Installed deployment services require protected authority and SSH verification.');
  }
  const remoteDeployment = new InstalledRemoteDeploymentService({
    deploymentStore: local.deploymentStore,
    packageBuilder: local.packageBuilder,
    authorityStore: local.authorityStore,
    runtimeBundlesRoot,
    buildProvenance,
    ...(remoteTargetFactory ? { targetFactory: remoteTargetFactory } : {}),
    ...(runtimeBuilder ? { runtimeBuilder } : {}),
    ...(options.now ? { now: options.now } : {}),
  });
  return Object.freeze({
    ...local,
    kind: 'installed-stage3b',
    remoteDeployment,
  });
}

module.exports = {
  createInstalledDeploymentServices,
  createLocalDeploymentServices,
};
