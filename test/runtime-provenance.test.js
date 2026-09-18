'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  assertPinnedRuntime,
  normalizeVersion,
  repositoryRuntime,
} = require('../scripts/check-pinned-runtime');

test('runtime provenance is owned by .nvmrc and packageManager', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-runtime-provenance-'));
  try {
    fs.writeFileSync(path.join(root, '.nvmrc'), '24.19.0\n');
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ packageManager: 'npm@11.17.0' }));
    assert.deepEqual(repositoryRuntime(root), {
      nodeVersion: '24.19.0',
      npmVersion: '11.17.0',
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('pinned runtime rejects version drift without deployment metadata', () => {
  const expected = { nodeVersion: '24.19.0', npmVersion: '11.17.0' };
  assert.deepEqual(assertPinnedRuntime('v24.19.0', '11.17.0', expected), expected);
  assert.throws(() => assertPinnedRuntime('24.18.0', '11.17.0', expected), /Node must be exactly/);
  assert.throws(() => assertPinnedRuntime('24.19.0', '11.16.0', expected), /npm must be exactly/);
  assert.equal(normalizeVersion('v24.19.0'), '24.19.0');
});
