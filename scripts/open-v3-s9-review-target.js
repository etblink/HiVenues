#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const {
  startV3S9ReviewTarget,
} = require('./support/v3-s9-review-target');

function buildIdentity() {
  try {
    return execFileSync('git', ['rev-parse', '--verify', 'HEAD^{commit}'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

async function main() {
  if (process.argv.length !== 2) {
    throw new Error('Usage: node scripts/open-v3-s9-review-target.js');
  }

  const target = await startV3S9ReviewTarget({ buildIdentity: buildIdentity() });
  let closing = false;

  async function shutdown(exitCode = 0) {
    if (closing) return;
    closing = true;
    const diagnostics = await target.close();
    process.stdout.write(`\nS9_REVIEW_TARGET_CLOSED ${JSON.stringify(diagnostics)}\n`);
    process.exitCode = exitCode;
  }

  process.stdout.write('HiVenues S9 review target is ready.\n');
  process.stdout.write(`INDEX ${target.indexUrl}\n`);
  process.stdout.write(`MANIFEST ${new URL('manifest.json', target.indexUrl)}\n`);
  for (const reference of target.manifest.references) {
    process.stdout.write(`${reference.referenceId} STUDIO ${reference.urls.studio}\n`);
    process.stdout.write(`${reference.referenceId} HOME ${reference.urls.home}\n`);
    process.stdout.write(`${reference.referenceId} ACTIVITY ${reference.urls.activity}\n`);
  }
  process.stdout.write('Press Ctrl+C to stop and remove temporary workspaces.\n');

  process.once('SIGINT', () => void shutdown(0));
  process.once('SIGTERM', () => void shutdown(0));
  await new Promise((resolve) => {
    const timer = globalThis.setInterval(() => {}, 60_000);
    timer.unref();
    process.once('beforeExit', () => {
      globalThis.clearInterval(timer);
      resolve();
    });
  });
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
