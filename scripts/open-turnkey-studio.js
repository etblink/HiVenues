#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { startTurnkeyStudio } = require('../src/venue/turnkey-studio');

function usage() {
  process.stderr.write('Usage: npm run venue:studio -- <workspace-directory> [--port <0-65535>]\n');
}

function parseArgs(argv) {
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) return { help: true };
  if (!argv.length) return null;
  const workspaceDirectory = argv[0];
  let port = 0;
  for (let index = 1; index < argv.length; index += 1) {
    if (argv[index] !== '--port' || index + 1 >= argv.length) return null;
    const rawPort = argv[index + 1];
    if (!/^(0|[1-9][0-9]{0,4})$/.test(rawPort)) return null;
    port = Number(rawPort);
    if (!Number.isSafeInteger(port) || port > 65535) return null;
    index += 1;
  }
  return { help: false, port, workspaceDirectory };
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (!args) { usage(); return { exitCode: 2, runtime: null }; }
  if (args.help) { usage(); return { exitCode: 0, runtime: null }; }
  try {
    const runtime = await startTurnkeyStudio({ workspaceDirectory: args.workspaceDirectory, port: args.port });
    process.stdout.write([
      'HiVenues Venue Studio',
      `Workspace: ${path.resolve(args.workspaceDirectory)}`,
      `Open: ${runtime.url}`,
      'Loopback-only: Hive writes/signing/payments/moderation/onboarding and deployment selection are disabled.',
      'Press Ctrl+C to stop.', '',
    ].join('\n'));
    return { exitCode: 0, runtime };
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return { exitCode: 1, runtime: null };
  }
}

if (require.main === module) {
  main().then(({ exitCode, runtime }) => {
    process.exitCode = exitCode;
    if (!runtime) return;
    let closing = false;
    const shutdown = async () => {
      if (closing) return;
      closing = true;
      try { await runtime.close(); } finally { process.exitCode = 0; }
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });
}

module.exports = { main, parseArgs };
