#!/usr/bin/env node
'use strict';

const { evaluateTurnkeyWiring } = require('../src/release/turnkey-wiring-readiness');

try {
  const result = evaluateTurnkeyWiring();
  process.stdout.write(`${JSON.stringify({ gate: 'TURNKEY_WORKFLOW_PRESENT', status: 'PASS', ...result })}\n`);
} catch (error) {
  process.stderr.write(`TURNKEY_WORKFLOW_PRESENT=FAIL\n${error.message}\n`);
  process.exitCode = 1;
}
