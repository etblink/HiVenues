'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

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
