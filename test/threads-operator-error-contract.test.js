'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { requireMerchantSession } = require('../src/routes/threads-operator');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'routes', 'threads-operator.js'),
  'utf8',
);

test('Threads funds preflight maps pure foundation failures into canonical app errors', () => {
  assert.match(source, /ConflictError/);
  assert.match(source, /NO_THREADS_FUNDS_TO_CLAIM/);
  assert.match(source, /THREADS_ACTIVE_AUTH_REQUIRED/);
  assert.match(source, /THREADS_FUNDS_MERCHANT_SIGNER_REQUIRED/);
  assert.match(source, /new ValidationError\(error\.message\)/);
  assert.match(source, /next\(threadsFundsAppError\(error\)\)/);
});

function runMerchantGate(config, account = 'fourthstreetbar') {
  let observed = Symbol('not-called');
  requireMerchantSession(config)(
    { hiveSession: { account } },
    {},
    (error) => { observed = error || null; },
  );
  return observed;
}

test('Threads funds claims require the accepted beta + Keychain write runtime', () => {
  const accepted = {
    hive: {
      writeMode: 'beta',
      betaSelfSigningEnabled: true,
      signerMode: 'keychain',
      officialAccount: 'fourthstreetbar',
    },
  };
  assert.equal(runMerchantGate(accepted), null);

  for (const hive of [
    { ...accepted.hive, writeMode: 'disabled' },
    { ...accepted.hive, writeMode: 'controlled' },
    { ...accepted.hive, writeMode: 'production' },
    { ...accepted.hive, betaSelfSigningEnabled: false },
    { ...accepted.hive, signerMode: 'disabled' },
  ]) {
    const error = runMerchantGate({ hive });
    assert.equal(error.code, 'THREADS_FUNDS_RUNTIME_UNAVAILABLE');
    assert.equal(error.statusCode, 503);
  }
});

