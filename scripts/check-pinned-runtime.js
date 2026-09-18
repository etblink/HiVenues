'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function normalizeVersion(value) {
  return String(value || '').trim().replace(/^v/, '');
}

function repositoryRuntime(root = path.resolve(__dirname, '..')) {
  const nodeVersion = normalizeVersion(fs.readFileSync(path.join(root, '.nvmrc'), 'utf8'));
  const packageRecord = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const packageManager = String(packageRecord.packageManager || '').trim();
  const match = /^npm@(.+)$/.exec(packageManager);
  if (!nodeVersion) throw new Error('.nvmrc must pin an exact Node version');
  if (!match || !normalizeVersion(match[1])) {
    throw new Error('package.json#packageManager must pin an exact npm version');
  }
  return Object.freeze({
    nodeVersion,
    npmVersion: normalizeVersion(match[1]),
  });
}

function assertPinnedRuntime(nodeVersion, npmVersion, expected = repositoryRuntime()) {
  const actualNode = normalizeVersion(nodeVersion);
  const actualNpm = normalizeVersion(npmVersion);

  if (actualNode !== expected.nodeVersion) {
    throw new Error(`Node must be exactly ${expected.nodeVersion}; found ${actualNode || 'unknown'}`);
  }
  if (actualNpm !== expected.npmVersion) {
    throw new Error(`npm must be exactly ${expected.npmVersion}; found ${actualNpm || 'unknown'}`);
  }

  return Object.freeze({ nodeVersion: actualNode, npmVersion: actualNpm });
}

function installedNpmVersion() {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath ? process.execPath : path.join(path.dirname(process.execPath), 'npm');
  const args = npmExecPath ? [npmExecPath, '--version'] : ['--version'];
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 10_000,
  }).trim();
}

if (require.main === module) {
  try {
    const summary = assertPinnedRuntime(process.versions.node, installedNpmVersion());
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  } catch (error) {
    process.stderr.write(`HiVenues runtime refused: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  assertPinnedRuntime,
  normalizeVersion,
  repositoryRuntime,
};
