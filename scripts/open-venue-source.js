'use strict';

const path = require('node:path');
const {
  startLocalSourceAuthoring,
} = require('../src/venue/local-source-authoring');

function usage() {
  process.stderr.write(
    'Usage: node scripts/open-venue-source.js <venue-source.json> [--port <0-65535>]\n',
  );
}

function parseArgs(argv) {
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) {
    return { help: true };
  }
  if (argv.length < 1) return null;

  const sourceFilename = argv[0];
  let port = 0;
  for (let index = 1; index < argv.length; index += 1) {
    if (argv[index] !== '--port' || index + 1 >= argv.length) return null;
    const rawPort = argv[index + 1];
    if (!/^(0|[1-9][0-9]{0,4})$/.test(rawPort)) return null;
    port = Number(rawPort);
    if (!Number.isSafeInteger(port) || port > 65535) return null;
    index += 1;
  }

  return { help: false, port, sourceFilename };
}

async function main(argv) {
  const args = parseArgs(argv);
  if (!args) {
    usage();
    return { exitCode: 2, runtime: null };
  }
  if (args.help) {
    usage();
    return { exitCode: 0, runtime: null };
  }

  try {
    const runtime = await startLocalSourceAuthoring({
      sourceFilename: args.sourceFilename,
      port: args.port,
    });
    process.stdout.write(
      [
        'Hive-Venues local venue editor',
        `Source: ${path.resolve(args.sourceFilename)}`,
        `Open: ${runtime.url}`,
        'This editor is loopback-only. Hive writes, signing, payments, moderation, onboarding, and deployment are disabled.',
        'Press Ctrl+C to stop.',
        '',
      ].join('\n'),
    );
    return { exitCode: 0, runtime };
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return { exitCode: 1, runtime: null };
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).then(({ exitCode, runtime }) => {
    process.exitCode = exitCode;
    if (!runtime) return;

    let closing = false;
    const shutdown = async () => {
      if (closing) return;
      closing = true;
      try {
        await runtime.close();
      } finally {
        process.exitCode = 0;
      }
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });
}

module.exports = {
  main,
  parseArgs,
};
