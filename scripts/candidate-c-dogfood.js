'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createDogfoodApp, DOGFOOD_HOST, startDogfoodServer } = require('../src/candidate-c/dogfood-app');
const { ProvisioningFileCandidateCStore } = require('../src/candidate-c/provisioning-file-store');

function usage() {
  return [
    'Usage: node scripts/candidate-c-dogfood.js --state <path> [--port <port>] [--public-ingress]',
    '',
    '  --state PATH       Explicit durable Candidate C state file. Required.',
    '  --port PORT        Local loopback port (default 4173).',
    '  --public-ingress   Enable the temporary dogfood access gate for a Quick Tunnel.',
    '',
    'Public-ingress mode requires CANDIDATE_C_DOGFOOD_ACCESS_SECRET with at least 32 characters.',
    'The launcher always binds 127.0.0.1 and never configures Cloudflare, DNS, Hive, providers, payments, or deployment.',
  ].join('\n');
}

function parseArgs(argv) {
  const options = { statePath: '', port: 4173, publicIngress: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') return { help: true, ...options };
    if (arg === '--public-ingress') {
      options.publicIngress = true;
      continue;
    }
    if (arg === '--state') {
      options.statePath = String(argv[index + 1] || '');
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
  if (!options.statePath) throw new Error('--state is required. Use a new path for a clean start or the same path to resume.');
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) throw new Error('--port must be an integer from 1 to 65535.');
  return options;
}

function gitValue(args) {
  const result = spawnSync('git', args, { cwd: path.join(__dirname, '..'), encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? String(result.stdout || '').trim() : 'UNKNOWN';
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
  const store = new ProvisioningFileCandidateCStore({ statePath });
  // Initialize or validate the durable envelope before opening a listener.
  store.list();
  const app = createDogfoodApp({
    store,
    publicIngress: options.publicIngress,
    accessSecret: process.env.CANDIDATE_C_DOGFOOD_ACCESS_SECRET || '',
  });
  const server = await startDogfoodServer(app, { port: options.port });
  const port = server.address().port;
  const commit = gitValue(['rev-parse', 'HEAD']);
  const tree = gitValue(['rev-parse', 'HEAD^{tree}']);

  console.log('Candidate C dogfood launcher');
  console.log(`Source commit: ${commit}`);
  console.log(`Source tree:   ${tree}`);
  console.log(`Bind:          ${DOGFOOD_HOST}:${port}`);
  console.log(`State:         ${statePath}`);
  console.log(`Places:        http://${DOGFOOD_HOST}:${port}/candidate-c`);
  console.log(`Create:        http://${DOGFOOD_HOST}:${port}/candidate-c/new`);
  console.log(`Ingress gate:  ${options.publicIngress ? 'ENABLED (temporary dogfood only)' : 'disabled (loopback only)'}`);
  if (options.publicIngress) {
    console.log(`Tunnel target: http://${DOGFOOD_HOST}:${port}`);
    console.log('The access secret is intentionally not printed or persisted.');
  }

  let closing = false;
  const close = () => {
    if (closing) return;
    closing = true;
    server.close((error) => {
      if (error) {
        console.error(`Dogfood launcher shutdown failed: ${error.message}`);
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

module.exports = { parseArgs, usage };
