'use strict';

const path = require('node:path');
const {
  LOCAL_HOST,
  createHiVenuesApp,
  createHiVenuesStore,
  startHiVenuesServer,
} = require('../src/product/app');
const { createHiVenuesHiveReadService } = require('../src/product/hive-read');

const DEFAULT_STATE_PATH = path.join(__dirname, '..', 'data', 'hivenues-dev-state.json');

function usage() {
  return [
    'Usage: node scripts/hivenues-studio.js [--state <path>] [--port <port>]',
    '',
    `  --state PATH  Durable local HiVenues state file (default ${path.relative(process.cwd(), DEFAULT_STATE_PATH)}).`,
    '  --port PORT   Local loopback port (default 4173).',
    '',
    'This launcher is for ordinary local product development. It binds only to 127.0.0.1 and performs no Hive writes, deployment, DNS, provider, payment, or other external effects.',
  ].join('\n');
}

function parseArgs(argv) {
  const options = { statePath: DEFAULT_STATE_PATH, port: 4173 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') return { help: true, ...options };
    if (arg === '--state') {
      const value = argv[index + 1];
      if (!value) throw new Error('--state requires a path.');
      options.statePath = path.resolve(value);
      index += 1;
      continue;
    }
    if (arg === '--port') {
      options.port = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
    throw new Error('--port must be an integer from 1 to 65535.');
  }
  return options;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  if (options.help) {
    console.log(usage());
    return;
  }

  const statePath = path.resolve(options.statePath);
  const store = createHiVenuesStore({ statePath });
  // Initialize or validate durable local state before the listener opens.
  store.list();
  const hiveReadService = createHiVenuesHiveReadService();
  const app = createHiVenuesApp({
    store,
    hiveReadService,
    identityOrigin: `http://${LOCAL_HOST}:${options.port}`,
  });
  const server = await startHiVenuesServer(app, { port: options.port });
  const port = server.address().port;

  console.log('HiVenues Studio');
  console.log(`Bind:   ${LOCAL_HOST}:${port}`);
  console.log(`State:  ${statePath}`);
  console.log(`Studio:   http://${LOCAL_HOST}:${port}/hivenues`);
  console.log(`Identity: http://${LOCAL_HOST}:${port}/identity/session`);
  console.log('Hive:     public reads available; server signing/broadcast disabled');
  console.log('Mutating external effects: disabled');

  let closing = false;
  const close = () => {
    if (closing) return;
    closing = true;
    server.close((error) => {
      if (error) {
        console.error(`HiVenues Studio shutdown failed: ${error.message}`);
        process.exitCode = 1;
      }
    });
  };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_STATE_PATH,
  parseArgs,
  usage,
};
