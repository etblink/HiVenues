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
  qualifiedNodePath,
  steadyInstallCommand,
} = require('../src/deploy/ssh-remote-deployment-target');

function planFixture() {
  return createReferenceBootstrapPlan({
    runtimeProvenance: {
      sourceSha: 'a'.repeat(40),
      sourceTree: 'b'.repeat(40),
      packageVersion: '1.0.0',
      nodeVersion: 'v24.19.0',
      bundleDigest: 'c'.repeat(64),
    },
    releaseManifest: {
      hostSlug: 'harbor-and-hearth',
      releaseId: 'release-stage3c-node-path',
      releaseDigest: 'd'.repeat(64),
      packageDigest: 'e'.repeat(64),
    },
    bootstrapUsername: 'debian',
  });
}

test('Era 7 Stage 3C: every bootstrap-time npm invocation carries the qualified Node PATH', () => {
  const plan = planFixture();
  const expectedPath = '/opt/hivenues/node/v24.19.0/bin:/usr/bin:/bin';
  assert.equal(qualifiedNodePath(plan.nodeDistribution), expectedPath);

  const runtime = {
    path: plan.paths.runtimeRoot,
    stagingPath: '/var/tmp/hivenues-runtime-' + 'c'.repeat(24),
  };
  const release = {
    path: plan.paths.releaseRoot,
    stagingPath: '/var/tmp/hivenues-release-' + 'e'.repeat(24),
  };
  const bootstrap = initialBootstrapCommand(plan, runtime, release, {
    full: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCdummy stage3c',
  });
  const steady = steadyInstallCommand(plan, runtime, release);

  assert.match(
    bootstrap,
    /env PATH='\/opt\/hivenues\/node\/v24\.19\.0\/bin:\/usr\/bin:\/bin' '\/opt\/hivenues\/node\/v24\.19\.0\/bin\/npm' --version/,
  );
  assert.match(
    bootstrap,
    /runuser -u hivenues-deploy -- env HOME=\/var\/lib\/hivenues-deploy PATH='\/opt\/hivenues\/node\/v24\.19\.0\/bin:\/usr\/bin:\/bin' '\/opt\/hivenues\/node\/v24\.19\.0\/bin\/npm'/,
  );
  assert.match(
    steady,
    /HOME=\/var\/lib\/hivenues-deploy PATH='\/opt\/hivenues\/node\/v24\.19\.0\/bin:\/usr\/bin:\/bin' '\/opt\/hivenues\/node\/v24\.19\.0\/bin\/npm'/,
  );
  assert.doesNotMatch(bootstrap, /apt-get install[^\n]*\bnodejs\b/);
});

test('Era 7 Stage 3C: env-node npm entry point needs the qualified bundle on PATH', (t) => {
  if (process.platform === 'win32') {
    t.skip('POSIX shebang/PATH qualification runs on non-Windows CI.');
    return;
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-node-path-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const bin = path.join(root, 'qualified-bin');
  const empty = path.join(root, 'empty-bin');
  fs.mkdirSync(bin);
  fs.mkdirSync(empty);

  const node = path.join(bin, 'node');
  const npm = path.join(bin, 'npm');
  fs.writeFileSync(node, '#!/bin/sh\n/bin/printf "11.17.0\\n"\n', { mode: 0o755 });
  fs.writeFileSync(npm, '#!/usr/bin/env node\nignored-by-fake-node\n', { mode: 0o755 });

  const withoutQualifiedPath = spawnSync(npm, [], {
    env: { ...process.env, PATH: empty },
    encoding: 'utf8',
  });
  assert.notEqual(withoutQualifiedPath.status, 0);

  const withQualifiedPath = spawnSync(npm, [], {
    env: { ...process.env, PATH: bin + ':' + empty },
    encoding: 'utf8',
  });
  assert.equal(withQualifiedPath.status, 0, withQualifiedPath.stderr);
  assert.equal(withQualifiedPath.stdout.trim(), '11.17.0');
});
