#!/usr/bin/env node
'use strict';
const { evaluateHiVenuesV1Readiness } = require('../src/release/hivenues-v1-readiness');
try {
  const result = evaluateHiVenuesV1Readiness();
  process.stdout.write(`${JSON.stringify({ gate: 'HIVENUES_V1_0_0_RELEASE', status: 'PASS', ...result })}\n`);
} catch (error) {
  process.stderr.write(`HIVENUES_V1_0_0_RELEASE=FAIL\n${error.message}\n`);
  process.exitCode = 1;
}
