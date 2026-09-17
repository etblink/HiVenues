'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const pkg = require('../package.json');
const { PLATFORM_NAME } = require('../src/platform/identity');

test('package identity exposes only the current HiVenues product contract', () => {
  assert.equal(PLATFORM_NAME, 'HiVenues');
  assert.equal(pkg.private, true);
  assert.equal(pkg.name, 'hivenues');
  assert.equal(pkg.main, 'src/product/app.js');
  assert.match(pkg.description, /premium, host-first frontend factory for Hive/i);
  assert.equal(pkg.scripts.start, 'node scripts/hivenues-studio.js');
  assert.equal(pkg.scripts.dev, 'npm run build:css && node --watch scripts/hivenues-studio.js');

  for (const obsolete of [
    'legacy:start',
    'legacy:dev',
    'venue:create',
    'venue:studio',
    'venue:ready',
    'venue:create:v2',
    'venue:studio:v2',
    'check:turnkey-wiring',
    'release:check:functional-v1',
    'release:check:hivenues-v1',
    'start:read-only',
    'start:privex',
  ]) {
    assert.equal(Object.hasOwn(pkg.scripts, obsolete), false, `obsolete package script remains: ${obsolete}`);
  }
});
