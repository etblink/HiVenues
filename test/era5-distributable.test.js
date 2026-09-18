'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  crc32,
  writeDeterministicZip,
} = require('../scripts/era5/build-windows-distributable');

function hash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

test('CRC-32 matches the standard check vector', () => {
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
});

test('deterministic ZIP ignores source mtimes and sorts paths canonically', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-dist-test-'));
  const root = path.join(temp, 'bundle');
  const outputA = path.join(temp, 'a.zip');
  const outputB = path.join(temp, 'b.zip');

  try {
    fs.mkdirSync(path.join(root, 'z'), { recursive: true });
    fs.mkdirSync(path.join(root, 'a'), { recursive: true });
    fs.writeFileSync(path.join(root, 'z', 'later.txt'), 'same bytes\n');
    fs.writeFileSync(path.join(root, 'a', 'first.txt'), 'first\n');

    const oldTime = new Date('2001-01-01T00:00:00Z');
    fs.utimesSync(path.join(root, 'z', 'later.txt'), oldTime, oldTime);
    writeDeterministicZip({ root, output: outputA, prefix: 'HiVenues/' });

    const newTime = new Date('2030-12-31T23:59:59Z');
    fs.utimesSync(path.join(root, 'z', 'later.txt'), newTime, newTime);
    fs.utimesSync(path.join(root, 'a', 'first.txt'), newTime, newTime);
    writeDeterministicZip({ root, output: outputB, prefix: 'HiVenues/' });

    assert.equal(hash(outputA), hash(outputB));
    assert.deepEqual(fs.readFileSync(outputA), fs.readFileSync(outputB));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
