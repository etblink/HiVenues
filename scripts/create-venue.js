#!/usr/bin/env node
'use strict';

const readline = require('node:readline/promises');
const { createTurnkeyWorkspace, slugifyVenueId } = require('../src/venue/turnkey-workspace');

const FLAG_TO_FIELD = Object.freeze({
  '--name': 'displayName', '--id': 'id', '--community': 'communityId', '--official': 'officialAccount',
  '--threads': 'threadsContainerAccount', '--merchant': 'paymentMerchantAccount', '--address': 'address',
  '--phone': 'phone', '--hours': 'hours', '--website': 'websiteUrl', '--map': 'mapUrl',
});

function usage() {
  return `HiVenues venue creator\n\nUsage: npm run venue:create -- <workspace-directory> [options]\n\nOptions:\n  --name <name>          Venue name\n  --id <slug>            Venue id (defaults from name)\n  --community <id>       Hive community id\n  --official <account>   Official Hive account\n  --threads <account>    Hive Threads container account\n  --merchant <account>   Payment merchant account (defaults to official)\n  --address <text>       Street address\n  --phone <text>         Phone number\n  --hours <text>         Opening hours\n  --website <https-url>  Venue website\n  --map <https-url>      Directions link\n  --help                 Show this help\n`;
}

function parseArgs(argv) {
  const result = { answers: {}, workspaceDirectory: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') { result.help = true; continue; }
    if (token.startsWith('--')) {
      const field = FLAG_TO_FIELD[token];
      if (!field) throw new Error(`Unknown option: ${token}`);
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${token}`);
      result.answers[field] = value;
      index += 1;
      continue;
    }
    if (result.workspaceDirectory) throw new Error('Provide only one workspace directory');
    result.workspaceDirectory = token;
  }
  return result;
}

async function askMissing(parsed, { input = process.stdin, output = process.stdout } = {}) {
  const answers = { ...parsed.answers };
  const rl = readline.createInterface({ input, output });
  const ask = async (field, label, defaultValue = '') => {
    if (answers[field]) return;
    const suffix = defaultValue ? ` [${defaultValue}]` : '';
    const response = (await rl.question(`${label}${suffix}: `)).trim();
    answers[field] = response || defaultValue;
  };
  try {
    await ask('displayName', 'Venue name');
    await ask('id', 'Venue id', answers.displayName ? slugifyVenueId(answers.displayName) : '');
    await ask('communityId', 'Hive community id');
    await ask('officialAccount', 'Official Hive account');
    await ask('threadsContainerAccount', 'Hive Threads container account');
    await ask('paymentMerchantAccount', 'Payment merchant account', answers.officialAccount || '');
    await ask('address', 'Street address');
    await ask('phone', 'Phone number');
    await ask('hours', 'Opening hours');
    await ask('websiteUrl', 'Website (https://)');
    await ask('mapUrl', 'Directions link (https://)');
  } finally { rl.close(); }
  return answers;
}

async function main(argv = process.argv.slice(2)) {
  const parsed = parseArgs(argv);
  if (parsed.help) { process.stdout.write(usage()); return; }
  if (!parsed.workspaceDirectory) throw new Error('Workspace directory is required. Run with --help for usage.');
  const answers = await askMissing(parsed);
  const created = createTurnkeyWorkspace({ workspaceDirectory: parsed.workspaceDirectory, answers });
  process.stdout.write(`Created HiVenues workspace: ${created.root}\n`);
  process.stdout.write(`Venue source: ${created.sourceFile}\nManaged media: ${created.assetDirectory}\n`);
  process.stdout.write(`Next: npm run venue:studio -- "${created.root}"\n`);
}

if (require.main === module) main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
module.exports = { askMissing, main, parseArgs, usage };
