'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  RUNTIME_DEPENDENCIES,
  buildPublicRuntimeBundle,
} = require('./build-public-runtime-bundle');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function gitValue(args) {
  return execFileSync('git', args, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

function npmExecutable() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-public-runtime-qualification-'));
  const bundleRoot = path.join(root, 'bundle');

  try {
    const bundle = buildPublicRuntimeBundle({
      outputRoot: bundleRoot,
      sourceSha: gitValue(['rev-parse', 'HEAD']),
      sourceTree: gitValue(['rev-parse', 'HEAD^{tree}']),
      nodeVersion: process.version,
    });

    execFileSync(
      npmExecutable(),
      ['ci', '--omit=dev', '--ignore-scripts', '--no-fund', '--no-audit'],
      {
        cwd: bundleRoot,
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
      },
    );

    const tree = JSON.parse(execFileSync(
      npmExecutable(),
      ['ls', '--omit=dev', '--depth=0', '--json'],
      {
        cwd: bundleRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'inherit'],
      },
    ));
    const installed = Object.keys(tree.dependencies || {}).sort();
    const expected = [...RUNTIME_DEPENDENCIES].sort();
    if (JSON.stringify(installed) !== JSON.stringify(expected)) {
      throw new Error(
        'Public runtime installed top-level dependency set changed: '
        + JSON.stringify(installed),
      );
    }

    execFileSync(
      process.execPath,
      ['-e', "require('./src/deploy/public-runtime'); require('./src/deploy/public-router');"],
      {
        cwd: bundleRoot,
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
      },
    );

    process.stdout.write(JSON.stringify({
      status: 'PASS',
      bundleDigest: bundle.bundleDigest,
      fileCount: bundle.fileCount,
      dependencies: expected,
      sourceSha: bundle.sourceSha,
      sourceTree: bundle.sourceTree,
      nodeVersion: process.version,
    }, null, 2) + '\n');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main();
