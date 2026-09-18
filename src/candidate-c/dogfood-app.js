'use strict';

// Compatibility boundary for historical Candidate-C qualification callers.
// The ordinary product composition root is src/product/app.js.
const {
  LOCAL_HOST,
  SESSION_COOKIE,
  createHiVenuesApp,
  requireSameOrigin,
  startHiVenuesServer,
} = require('../product/app');

const DOGFOOD_HOST = LOCAL_HOST;

function createDogfoodApp(options = {}) {
  const identityServices = Object.prototype.hasOwnProperty.call(options, 'identityServices')
    ? options.identityServices
    : false;
  return createHiVenuesApp({
    ...options,
    identityServices,
  });
}

module.exports = {
  DOGFOOD_HOST,
  SESSION_COOKIE,
  createDogfoodApp,
  requireSameOrigin,
  startDogfoodServer: startHiVenuesServer,
};
