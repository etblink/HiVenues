'use strict';

const { version: PACKAGE_VERSION } = require('../../package.json');
const { REFERENCE_DEPLOYMENT_PROFILE } = require('../deployment/reference/fourth-street-privex');

const RELEASE_APP_TAG = REFERENCE_DEPLOYMENT_PROFILE.release.hiveAppTag;

module.exports = {
  PACKAGE_VERSION,
  RELEASE_APP_TAG,
};
