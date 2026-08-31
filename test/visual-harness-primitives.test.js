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

test('M18.2, M18.3, M18.4, HV-6, and UX-1F visual suites consume shared mechanical primitives without sharing suite policy', () => {
  const m18 = fs.readFileSync(path.join(ROOT, 'scripts/capture-m18-visual.js'), 'utf8');
  const m183 = fs.readFileSync(path.join(ROOT, 'scripts/capture-m18-3-visual.js'), 'utf8');
  const m184 = fs.readFileSync(path.join(ROOT, 'scripts/capture-m18-4-visual.js'), 'utf8');
  const hv6 = fs.readFileSync(path.join(ROOT, 'scripts/capture-hv6-native-visual.js'), 'utf8');
  const ux1f = fs.readFileSync(path.join(ROOT, 'scripts/capture-ux-1f-visual.js'), 'utf8');

  for (const source of [m18, m183, m184, hv6, ux1f]) {
    assert.match(source, /require\('\.\/support\/visual-harness'\)/);
    assert.doesNotMatch(source, /require\('node:crypto'\)/);
    assert.doesNotMatch(source, /function listen\(app\)/);
    assert.doesNotMatch(source, /function sha256\(/);
  }

  assert.doesNotMatch(m18, /require\('node:child_process'\)/);
  assert.doesNotMatch(m18, /async function closeServer\(/);
  assert.match(m18, /async function installNetworkGuard\(context, \{ baseUrl, documentPath \}\)/);
  assert.match(m18, /async function settlePresentation\(page\)/);
  assert.match(m18, /const KEYCHAIN_STUB/);

  assert.match(m183, /require\('node:child_process'\)/);
  assert.match(m183, /const git = createGitReader\(ROOT\);/);
  assert.match(m183, /npm: execFileSync\('npm', \['--version'\]/);
  assert.match(m183, /const KEYCHAIN_STUB/);
  assert.match(m183, /await new Promise\(\(resolve\) => server\.close\(resolve\)\)/);

  assert.doesNotMatch(m184, /require\('node:child_process'\)/);
  assert.match(m184, /const KEYCHAIN_STUB/);
  assert.match(m184, /const IMAGE_PLACEHOLDER/);
  assert.match(m184, /await new Promise\(\(resolve\) => server\.close\(resolve\)\)/);

  assert.match(hv6, /async function runAxe\(target\)/);
  assert.match(hv6, /LANTERN_EVALUATION_ASSETS/);
  assert.match(ux1f, /async function accessibilityEvidence\(page, label\)/);
  assert.match(ux1f, /const KEYCHAIN_STUB/);
});
