'use strict';

// #301 promotes the proven Territory/Studio runtime behind a stable product
// boundary before any broad internal rename. The current implementation still
// lives under src/candidate-c so historical qualification paths and frozen
// Era 0-3 contracts remain intact while ordinary callers stop depending on an
// experimental namespace.
const {
  DOGFOOD_HOST,
  createDogfoodApp,
  startDogfoodServer,
} = require('../candidate-c/dogfood-app');
const { ProvisioningFileCandidateCStore } = require('../candidate-c/provisioning-file-store');

const LOCAL_HOST = DOGFOOD_HOST;

function createHiVenuesStore({ statePath, ...options } = {}) {
  if (!statePath) throw new TypeError('HiVenues local store requires statePath.');
  return new ProvisioningFileCandidateCStore({ statePath, ...options });
}

function createHiVenuesApp(options = {}) {
  return createDogfoodApp(options);
}

function startHiVenuesServer(app, options = {}) {
  return startDogfoodServer(app, options);
}

module.exports = {
  LOCAL_HOST,
  createHiVenuesApp,
  createHiVenuesStore,
  startHiVenuesServer,
};
