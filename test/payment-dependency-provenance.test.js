'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  decodeHiveSigningUri,
  resolveHiveSigningTransaction,
} = require('../src/payments/hive-signing-uri');

const root = path.join(__dirname, '..');

function canonicalLf(value) {
  return String(value).replace(/\r\n?/g, '\n');
}

function assertScriptDisabledInstallsNeedNoPatch(workflow) {
  const normalized = canonicalLf(workflow);
  const installs = normalized.match(/run: npm ci --ignore-scripts --no-fund/g) || [];

  assert.equal(
    installs.length,
    3,
    'CI must retain deterministic, visual, and manual-smoke script-disabled install paths',
  );
  assert.doesNotMatch(normalized, /patch-package/);
  assert.doesNotMatch(normalized, /Apply pinned dependency patch/);
  assert.doesNotMatch(normalized, /lockfile-generator|Generate dependency-free lock candidate/);
}

test('binds the source-owned payment URI decoder and retired dependency provenance closed', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lockfile = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const lockRoot = lockfile.packages[''];
  const invoiceDecoder = fs.readFileSync(
    path.join(root, 'src', 'payments', 'invoice-decoder.js'),
    'utf8',
  );

  assert.equal(packageJson.engines.node, '>=24.15 <25');
  assert.equal(packageJson.engines.npm, '>=11');
  assert.equal(packageJson.packageManager, 'npm@11.17.0');
  assert.equal(packageJson.dependencies['@zxing/browser'], '0.2.1');
  assert.equal(lockfile.packages['node_modules/@zxing/browser'].version, '0.2.1');

  assert.equal(packageJson.dependencies['hive-uri'], undefined);
  assert.equal(packageJson.dependencies['patch-package'], undefined);
  assert.equal(packageJson.scripts.postinstall, undefined);
  assert.equal(lockRoot.dependencies['hive-uri'], undefined);
  assert.equal(lockRoot.dependencies['patch-package'], undefined);
  assert.equal(lockRoot.hasInstallScript, undefined);
  assert.equal(lockfile.packages['node_modules/hive-uri'], undefined);
  assert.equal(lockfile.packages['node_modules/patch-package'], undefined);
  assert.deepEqual(lockRoot.dependencies, packageJson.dependencies);
  assert.deepEqual(lockRoot.devDependencies, packageJson.devDependencies);

  assert.equal(typeof decodeHiveSigningUri, 'function');
  assert.equal(typeof resolveHiveSigningTransaction, 'function');
  assert.match(invoiceDecoder, /require\('\.\/hive-signing-uri'\)/);
  assert.doesNotMatch(invoiceDecoder, /require\(['"]hive-uri['"]\)/);

  assert.equal(fs.existsSync(path.join(root, 'patches', 'hive-uri+0.2.8.patch')), false);
  assert.equal(fs.existsSync(path.join(root, 'test', 'hive-signing-uri-compat.test.js')), false);
});

test('keeps CI installs immutable without post-install patch mutation', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
  const attributes = canonicalLf(fs.readFileSync(path.join(root, '.gitattributes'), 'utf8'));

  assertScriptDisabledInstallsNeedNoPatch(workflow);
  assert.match(workflow, /ubuntu-latest/);
  assert.match(workflow, /windows-latest/);
  assert.match(attributes, /^\.github\/workflows\/\*\.yml text eol=lf$/m);
  assert.match(attributes, /^\.github\/workflows\/\*\.yaml text eol=lf$/m);
  assert.doesNotMatch(attributes, /^patches\/\*\.patch /m);
});

test('binds identical CI provenance under simulated LF and Windows CRLF checkouts', () => {
  const workflow = canonicalLf(
    fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8'),
  );
  const windowsWorkflow = workflow.replace(/\n/g, '\r\n');

  assertScriptDisabledInstallsNeedNoPatch(workflow);
  assertScriptDisabledInstallsNeedNoPatch(windowsWorkflow);
});
