#!/usr/bin/env node
'use strict';

const readline = require('node:readline/promises');
const { slugifyVenueId } = require('../src/venue/turnkey-workspace');
const {
  V2_STARTER_IDS,
  createV2TurnkeyWorkspace,
} = require('../src/venue/v2/turnkey-workspace');

const FLAG_TO_FIELD = Object.freeze({
  '--name': 'displayName',
  '--id': 'id',
  '--starter': 'starter',
  '--address': 'address',
  '--phone': 'phone',
  '--hours': 'hours',
  '--website': 'websiteUrl',
  '--map': 'mapUrl',
});

function usage() {
  return `HiVenues v2 venue creator

Usage: npm run venue:create:v2 -- <workspace-directory> [options]

Options:
  --name <name>          Venue name
  --id <slug>            Venue id (defaults from name)
  --starter <id>         Starter: ${V2_STARTER_IDS.join(', ')}
  --address <text>       Street address
  --phone <text>         Phone number
  --hours <text>         Opening hours
  --website <https-url>  Venue website
  --map <https-url>      Directions link
  --help                 Show this help

Hive/community/payment identifiers are not required for a fresh v2 workspace.
`;
}

function parseArgs(argv) {
  const result = { answers: {}, workspaceDirectory: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      result.help = true;
      continue;
    }
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
    await ask('starter', `Starter (${V2_STARTER_IDS.join('/')})`, 'general');
    await ask('address', 'Street address');
    await ask('phone', 'Phone number');
    await ask('hours', 'Opening hours');
    await ask('websiteUrl', 'Website (https://)');
    await ask('mapUrl', 'Directions link (https://)');
  } finally {
    rl.close();
  }
  return answers;
}

async function main(argv = process.argv.slice(2), io = {}) {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    (io.output || process.stdout).write(usage());
    return null;
  }
  if (!parsed.workspaceDirectory) {
    throw new Error('Workspace directory is required. Run with --help for usage.');
  }
  const answers = await askMissing(parsed, io);
  const created = createV2TurnkeyWorkspace({
    workspaceDirectory: parsed.workspaceDirectory,
    answers,
  });
  const output = io.output || process.stdout;
  output.write(`Created HiVenues v2 workspace: ${created.root}\n`);
  output.write(`V2 source: ${created.sourceFile}\nManaged media: ${created.assetDirectory}\n`);
  output.write('Hive/community/payment capabilities: disabled by default\n');
  output.write(`Next: npm run venue:studio:v2 -- "${created.root}"\n`);
  return created;
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { askMissing, main, parseArgs, usage };
