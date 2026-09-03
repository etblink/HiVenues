#!/usr/bin/env node
'use strict';
const { auditHiVenuesReleaseNames } = require('../src/release/hivenues-name-audit');
try {
  const result = auditHiVenuesReleaseNames();
  process.stdout.write(`HIVENUES_RELEASE_NAME_AUDIT=PASS\nPRODUCT=${result.product}\nVERSION=${result.version}\n`);
} catch (error) {
  process.stderr.write(`HIVENUES_RELEASE_NAME_AUDIT=FAIL\n${error.message}\n`);
  process.exitCode = 1;
}
