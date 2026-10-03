'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const { createReferenceBootstrapPlan } = require('../src/deploy/bootstrap-plan');
const {
  initialBootstrapCommand,
  steadyInstallCommand,
} = require('../src/deploy/ssh-remote-deployment-target');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fixture() {
  const plan = createReferenceBootstrapPlan({
    runtimeProvenance: {
      sourceSha: 'a'.repeat(40),
      sourceTree: 'b'.repeat(40),
      packageVersion: '1.0.0',
      nodeVersion: 'v24.19.0',
      bundleDigest: 'c'.repeat(64),
    },
    releaseManifest: {
      hostSlug: 'harbor-and-hearth',
      releaseId: 'release-stage3c-permissions',
      releaseDigest: 'd'.repeat(64),
      packageDigest: 'e'.repeat(64),
    },
    bootstrapUsername: 'debian',
  });
  const runtime = {
    path: plan.paths.runtimeRoot,
    stagingPath: '/var/tmp/hivenues-runtime-' + 'c'.repeat(24),
  };
  const release = {
    path: plan.paths.releaseRoot,
    stagingPath: '/var/tmp/hivenues-release-' + 'e'.repeat(24),
  };
  return { plan, runtime, release };
}

test('Era 7 Stage 3C: initial and steady artifact handoff grants group read/traverse without world access', () => {
  const { plan, runtime, release } = fixture();
  const bootstrap = initialBootstrapCommand(plan, runtime, release, {
    full: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCdummy permissions',
  });
  const steady = steadyInstallCommand(plan, runtime, release);

  const runtimeMode = "chmod -R g+rX,o-rwx -- '" + runtime.path + "'";
  const releaseMode = "chmod -R g+rX,o-rwx -- '" + release.path + "'";

  assert.match(bootstrap, new RegExp(escapeRegExp(runtimeMode)));
  assert.match(bootstrap, new RegExp(escapeRegExp(releaseMode)));
  assert.match(steady, new RegExp(escapeRegExp(runtimeMode)));
  assert.match(steady, new RegExp(escapeRegExp(releaseMode)));
  assert.ok(
    bootstrap.indexOf(runtimeMode) < bootstrap.indexOf(' ci --omit=dev'),
    'runtime group access must be normalized before npm ci',
  );
});

test('Era 7 Stage 3C: permission normalization converts 0700/0600 staged tree to group-readable private tree', (t) => {
  if (process.platform === 'win32') {
    t.skip('POSIX permission qualification runs on non-Windows CI.');
    return;
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-stage3c-modes-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const nested = path.join(root, 'nested');
  const file = path.join(nested, 'artifact.txt');
  fs.mkdirSync(nested, { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, 'artifact\n', { mode: 0o600 });
  fs.chmodSync(root, 0o700);
  fs.chmodSync(nested, 0o700);
  fs.chmodSync(file, 0o600);

  const result = spawnSync('/bin/sh', ['-c', 'chmod -R g+rX,o-rwx -- "$1"', 'sh', root], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);

  const mode = (value) => fs.statSync(value).mode & 0o777;
  assert.equal(mode(root), 0o750);
  assert.equal(mode(nested), 0o750);
  assert.equal(mode(file), 0o640);
});
