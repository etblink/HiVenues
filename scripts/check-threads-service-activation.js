'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  assessThreadsServiceActivationReadiness,
} = require('../src/social/threads-service-activation-readiness');

const MAX_INPUT_BYTES = 64 * 1024;

function loadInput(filename) {
  const resolved = path.resolve(filename);
  const stat = fs.statSync(resolved);
  if (!stat.isFile()) throw new Error('Threads activation preflight input must be a regular file');
  if (stat.size > MAX_INPUT_BYTES) throw new Error('Threads activation preflight input exceeds 64 KiB');
  const text = fs.readFileSync(resolved, 'utf8');
  return JSON.parse(text);
}

function main(argv = process.argv.slice(2), io = process) {
  if (argv.length !== 1) {
    io.stderr.write('Usage: node scripts/check-threads-service-activation.js <public-snapshot.json>\n');
    return 2;
  }

  try {
    const report = assessThreadsServiceActivationReadiness(loadInput(argv[0]));
    io.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return report.activationReady ? 0 : 3;
  } catch (error) {
    io.stderr.write(`Threads activation preflight failed: ${error.message}\n`);
    return 2;
  }
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = { MAX_INPUT_BYTES, loadInput, main };
