'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');
const {
  closeServer,
  createGitReader,
  listenLoopback,
  sha256,
} = require('../scripts/support/visual-harness');

const ROOT = path.join(__dirname, '..');

test('shared visual harness primitives preserve deterministic hashing, provenance, and loopback lifecycle', async () => {
  assert.equal(
    sha256('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );

  const git = createGitReader(ROOT);
  assert.match(git('rev-parse', 'HEAD'), /^[0-9a-f]{40}$/);
  assert.match(git('rev-parse', 'HEAD^{tree}'), /^[0-9a-f]{40}$/);

  const app = http.createServer((_req, res) => res.end('ok'));
  const server = await listenLoopback(app);
  const address = server.address();
  assert.equal(address.address, '127.0.0.1');
  assert.ok(address.port > 0);
  assert.equal(server.listening, true);
  await closeServer(server);
  assert.equal(server.listening, false);
});

test('HV-6 and UX-1F visual suites consume shared mechanical primitives without sharing suite policy', () => {
  const hv6 = fs.readFileSync(path.join(ROOT, 'scripts/capture-hv6-native-visual.js'), 'utf8');
  const ux1f = fs.readFileSync(path.join(ROOT, 'scripts/capture-ux-1f-visual.js'), 'utf8');

  for (const source of [hv6, ux1f]) {
    assert.match(source, /require\('\.\/support\/visual-harness'\)/);
    assert.doesNotMatch(source, /require\('node:crypto'\)/);
    assert.doesNotMatch(source, /function listen\(app\)/);
    assert.doesNotMatch(source, /function sha256\(/);
  }

  assert.match(hv6, /async function runAxe\(target\)/);
  assert.match(hv6, /LANTERN_EVALUATION_ASSETS/);
  assert.match(ux1f, /async function accessibilityEvidence\(page, label\)/);
  assert.match(ux1f, /const KEYCHAIN_STUB/);
});
