'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  buildPublicRuntimeBundle,
  canonicalRuntimeFileBytes,
} = require('../scripts/era7/build-public-runtime-bundle');

const HELPER_RELATIVE = 'src/deploy/publication-helper-runtime.js';
const HELPER_SHEBANG = '#!/opt/hivenues/node/v24.19.0/bin/node';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

test('Era 7 Stage 4D corrective: repository helper keeps a Linux-valid LF shebang', () => {
  const bytes = fs.readFileSync(path.resolve(__dirname, '..', HELPER_RELATIVE));
  const text = bytes.toString('utf8');

  assert.equal(text.startsWith(HELPER_SHEBANG + '\n'), true);
  assert.equal(text.includes('\r'), false);
});

test('Era 7 Stage 4D corrective: CRLF helper input canonicalizes to identical LF executable bytes', () => {
  const lf = Buffer.from(
    HELPER_SHEBANG + "\n'use strict';\nprocess.stdout.write('ok\\n');\n",
    'utf8',
  );
  const crlf = Buffer.from(lf.toString('utf8').replaceAll('\n', '\r\n'), 'utf8');

  const canonicalLf = canonicalRuntimeFileBytes(HELPER_RELATIVE, lf);
  const canonicalCrlf = canonicalRuntimeFileBytes(HELPER_RELATIVE, crlf);

  assert.deepEqual(canonicalCrlf, canonicalLf);
  assert.equal(canonicalCrlf.includes(13), false);
  assert.equal(canonicalCrlf.toString('utf8').startsWith(HELPER_SHEBANG + '\n'), true);
});

test('Era 7 Stage 4D corrective: unexpected publication helper shebang is rejected', () => {
  const wrong = Buffer.from('#!/usr/bin/env node\r\nconsole.log("wrong");\r\n', 'utf8');

  assert.throws(
    () => canonicalRuntimeFileBytes(HELPER_RELATIVE, wrong),
    (error) => error.code === 'DEPLOYED_RUNTIME_EXECUTABLE_SHEBANG_INVALID',
  );
});

test('Era 7 Stage 4D corrective: runtime bundle stores LF helper bytes and manifests the exact digest', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-stage4d-helper-lf-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const output = path.join(root, 'runtime');
  buildPublicRuntimeBundle({
    outputRoot: output,
    sourceSha: '1'.repeat(40),
    sourceTree: '2'.repeat(40),
    nodeVersion: 'v24.19.0',
  });

  const helperPath = path.join(output, ...HELPER_RELATIVE.split('/'));
  const bytes = fs.readFileSync(helperPath);
  const manifest = JSON.parse(fs.readFileSync(path.join(output, 'runtime-manifest.json'), 'utf8'));
  const entry = manifest.files.find((item) => item.path === HELPER_RELATIVE);

  assert.ok(entry);
  assert.equal(bytes.includes(13), false);
  assert.equal(bytes.toString('utf8').startsWith(HELPER_SHEBANG + '\n'), true);
  assert.equal(entry.bytes, bytes.length);
  assert.equal(entry.sha256, sha256(bytes));
});

test('Era 7 Stage 4D corrective: gitattributes pins the Linux publication helper to LF', () => {
  const attributes = fs.readFileSync(path.resolve(__dirname, '..', '.gitattributes'), 'utf8');
  assert.match(
    attributes,
    /^src\/deploy\/publication-helper-runtime\.js text eol=lf$/m,
  );
});
