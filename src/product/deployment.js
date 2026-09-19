'use strict';

const path = require('node:path');

const { createDeploymentPackageBuilder } = require('./deployment-package');
const { FileDeploymentStore } = require('./deployment-store');
const { SyntheticDeploymentAdapter } = require('./synthetic-deployment-adapter');

function createLocalDeploymentServices({
  store,
  statePath,
  packageRoot,
  mediaRoot,
  publicRoot = path.join(__dirname, '..', '..', 'public'),
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

  return Object.freeze({
    kind: 'local-stage1',
    deploymentStore,
    packageBuilder,
    adapters: Object.freeze({
      synthetic: syntheticAdapter,
    }),
  });
}

module.exports = {
  createLocalDeploymentServices,
};
