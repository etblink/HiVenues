'use strict';

const referenceManifest = require('../../../ops/privex/manifest.json');
const { compileDeploymentProfile } = require('../profile');

const REFERENCE_DEPLOYMENT_PROFILE = compileDeploymentProfile(referenceManifest);

module.exports = {
  REFERENCE_DEPLOYMENT_PROFILE,
};
