'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const ROOT = path.resolve(__dirname, '..');
const CONTRACT_PATH = path.join(ROOT, 'config', 'visual-qualification-contract.json');
const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
const rawRoot = path.resolve(ROOT, process.env.VISUAL_RAW_ROOT || contract.execution.rawRoot);
const logRoot = path.resolve(ROOT, 'artifacts', 'visual-contract-logs');
const summaryPath = path.resolve(ROOT, 'artifacts', 'current-visual-machine-summary.json');
const maxConcurrency = Number(process.env.VISUAL_MAX_CONCURRENCY || contract.execution.maxConcurrency);

assert.ok(Number.isInteger(maxConcurrency) && maxConcurrency >= 1 && maxConcurrency <= 4);
fs.rmSync(rawRoot, { recursive: true, force: true });
fs.rmSync(logRoot, { recursive: true, force: true });
fs.mkdirSync(rawRoot, { recursive: true });
fs.mkdirSync(logRoot, { recursive: true });

function safeOutput(outputDir) {
  const value = path.resolve(rawRoot, outputDir);
  assert.ok(value.startsWith(`${rawRoot}${path.sep}`), `Unsafe visual output directory: ${outputDir}`);
  return value;
}

function runSuite(suite) {
  return new Promise((resolve) => {
    const started = performance.now();
    const output = safeOutput(suite.outputDir);
    const child = spawn(suite.command[0], suite.command.slice(1), {
      cwd: ROOT,
      env: { ...process.env, [suite.outputEnv]: output },
      shell: false,
      windowsHide: true,
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', (error) => {
      stderr.push(Buffer.from(`${error.stack || error.message}\n`));
    });
    child.on('close', (code, signal) => {
      const durationMs = Math.round(performance.now() - started);
      const out = Buffer.concat(stdout).toString('utf8');
      const err = Buffer.concat(stderr).toString('utf8');
      fs.writeFileSync(path.join(logRoot, `${suite.id}.stdout.log`), out);
      fs.writeFileSync(path.join(logRoot, `${suite.id}.stderr.log`), err);
      resolve({
        id: suite.id,
        command: suite.command,
        outputDir: suite.outputDir,
        durationMs,
        exitCode: code,
        signal: signal || null,
        stdoutTail: out.trim().split(/\r?\n/).slice(-8),
        stderrTail: err.trim().split(/\r?\n/).slice(-8),
      });
    });
  });
}

async function main() {
  const pending = [...contract.machineSuites];
  const results = [];
  const running = new Set();
  const wallStarted = performance.now();

  async function launch(suite) {
    const promise = runSuite(suite).then((result) => {
      results.push(result);
      running.delete(promise);
      const seconds = (result.durationMs / 1000).toFixed(1);
      const marker = result.exitCode === 0 ? 'PASS' : 'FAIL';
      process.stdout.write(`[${marker}] ${result.id} ${seconds}s\n`);
      if (result.exitCode !== 0) {
        if (result.stdoutTail.length) process.stdout.write(`${result.stdoutTail.join('\n')}\n`);
        if (result.stderrTail.length) process.stderr.write(`${result.stderrTail.join('\n')}\n`);
      }
      return result;
    });
    running.add(promise);
  }

  while (pending.length || running.size) {
    while (pending.length && running.size < maxConcurrency) await launch(pending.shift());
    if (running.size) await Promise.race(running);
  }

  results.sort((left, right) => contract.machineSuites.findIndex(({ id }) => id === left.id)
    - contract.machineSuites.findIndex(({ id }) => id === right.id));
  const wallDurationMs = Math.round(performance.now() - wallStarted);
  const summary = {
    contractId: contract.contractId,
    maxConcurrency,
    wallDurationMs,
    wallSeconds: Number((wallDurationMs / 1000).toFixed(3)),
    baselineVisualWallSecondsApprox: contract.baseline.visualWallSecondsApprox,
    suites: results,
  };
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  const failures = results.filter(({ exitCode }) => exitCode !== 0);
  assert.deepEqual(failures, [], `${failures.length} current visual-contract suite(s) failed`);
  process.stdout.write(`Current visual machine contract PASS: ${results.length} suites in ${summary.wallSeconds}s\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
