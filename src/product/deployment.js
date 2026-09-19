'use strict';

const path = require('node:path');

const { FileDeploymentAuthorityStore } = require('./deployment-authority');
const { createDeploymentPackageBuilder } = require('./deployment-package');
const { FileDeploymentStore } = require('./deployment-store');
const { SyntheticDeploymentAdapter } = require('./synthetic-deployment-adapter');

function createLocalDeploymentServices({
  store,
  statePath,
  packageRoot,
  mediaRoot,
  publicRoot = path.join(__dirname, '..', '..', 'public'),
  authorityRoot = '',
  authorityProtector = null,
  authorityIdFactory,
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
      })
    : null;

  return Object.freeze({
    kind: authorityStore ? 'local-stage2a' : 'local-stage1',
    deploymentStore,
    packageBuilder,
    authorityStore,
    adapters: Object.freeze({
      synthetic: syntheticAdapter,
    }),
  });
}

module.exports = {
  createLocalDeploymentServices,
};
