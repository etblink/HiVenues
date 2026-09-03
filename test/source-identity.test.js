'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const pkg = require('../package.json');
const {
  LEGACY_FOURTH_STREET_DEPLOYMENT,
  PLATFORM_NAME,
} = require('../src/platform/identity');
const { isInstalledPrivexRelease } = require('../src/server');

test('distinguishes HiVenues platform identity from preserved Fourth Street deployment identity', () => {
  assert.equal(PLATFORM_NAME, 'HiVenues');
  assert.match(pkg.description, /multi-venue community and social platform powered by Hive/i);
  assert.match(pkg.description, /Fourth Street Bar as the reference deployment/i);

  assert.equal(LEGACY_FOURTH_STREET_DEPLOYMENT.serviceName, 'hive-bar');
  assert.equal(LEGACY_FOURTH_STREET_DEPLOYMENT.releaseRoot, '/opt/hive-bar');
  assert.equal(isInstalledPrivexRelease('/opt/hive-bar/current'), true);
  assert.equal(isInstalledPrivexRelease('/opt/hive-bar/releases/0123456789abcdef'), true);
  assert.equal(isInstalledPrivexRelease('/opt/hive-venues/current'), false);
});

test('private npm package-manager identity is final HiVenues while historical deploy paths remain stable', () => {
  assert.equal(pkg.private, true);
  assert.equal(pkg.name, 'hivenues');
});
