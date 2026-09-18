'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

function parseArgs(argv) {
  const index = argv.indexOf('--bundle');
  if (index < 0 || !argv[index + 1]) throw new Error('--bundle is required.');
  return { bundle: path.resolve(argv[index + 1]) };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFile(file, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    await sleep(100);
  }
  throw new Error('Timed out waiting for runtime readiness.');
}

function waitForExit(child, timeoutMs = 10000) {
  return Promise.race([
    new Promise((resolve, reject) => {
      child.once('exit', (code, signal) => resolve({ code, signal }));
      child.once('error', reject);
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out waiting for runtime exit.')), timeoutMs)),
  ]);
}

function digest(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

async function launch({ runtime, bootstrap, cwd, env, readyFile, shutdownFile }) {
  return spawn(runtime, [
    bootstrap,
    '--no-open',
    '--port', '0',
    '--ready-file', readyFile,
    '--shutdown-file', shutdownFile,
  ], {
    cwd,
    env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function main() {
  const { bundle } = parseArgs(process.argv.slice(2));
  const runtime = path.join(bundle, 'runtime', process.platform === 'win32' ? 'node.exe' : 'node');
  const bootstrap = path.join(bundle, 'app', 'scripts', 'era5', 'installed-bootstrap.js');
  assert.ok(fs.existsSync(runtime), 'private runtime is present');
  assert.ok(fs.existsSync(bootstrap), 'installed bootstrap is present');

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-era5-proof-'));
  const unrelatedCwd = path.join(temp, 'unrelated-cwd');
  const localAppData = path.join(temp, 'LocalAppData');
  fs.mkdirSync(unrelatedCwd, { recursive: true });
  const env = { ...process.env, LOCALAPPDATA: localAppData };
  const ready1 = path.join(temp, 'ready-1.json');
  const stop1 = path.join(temp, 'stop-1');

  const first = await launch({ runtime, bootstrap, cwd: unrelatedCwd, env, readyFile: ready1, shutdownFile: stop1 });
  const info1 = await waitForFile(ready1);
  assert.equal(path.resolve(info1.appRoot), path.resolve(bundle, 'app'));
  assert.ok(path.resolve(info1.dataRoot).startsWith(path.resolve(localAppData)));
  assert.ok(path.resolve(info1.statePath).startsWith(path.resolve(localAppData)));
  assert.ok(path.resolve(info1.mediaRoot).startsWith(path.resolve(localAppData)));
  assert.ok(fs.existsSync(info1.statePath));

  const response = await fetch(info1.url);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /HiVenues/);
  const firstDigest = digest(info1.statePath);

  const ready2 = path.join(temp, 'ready-2.json');
  const stop2 = path.join(temp, 'stop-2');
  const second = await launch({ runtime, bootstrap, cwd: unrelatedCwd, env, readyFile: ready2, shutdownFile: stop2 });
  let secondErr = '';
  second.stderr.on('data', (chunk) => { secondErr += chunk.toString(); });
  const secondExit = await waitForExit(second);
  assert.equal(secondExit.code, 73);
  assert.match(secondErr, /HIVENUES_ALREADY_RUNNING/);
  assert.equal(fs.existsSync(ready2), false);

  fs.writeFileSync(stop1, 'stop\n');
  const firstExit = await waitForExit(first);
  assert.equal(firstExit.code, 0);

  const ready3 = path.join(temp, 'ready-3.json');
  const stop3 = path.join(temp, 'stop-3');
  const third = await launch({ runtime, bootstrap, cwd: unrelatedCwd, env, readyFile: ready3, shutdownFile: stop3 });
  const info3 = await waitForFile(ready3);
  assert.equal(info3.statePath, info1.statePath);
  assert.equal(digest(info3.statePath), firstDigest);
  const response3 = await fetch(info3.url);
  assert.equal(response3.status, 200);
  fs.writeFileSync(stop3, 'stop\n');
  const thirdExit = await waitForExit(third);
  assert.equal(thirdExit.code, 0);

  process.stdout.write(JSON.stringify({
    result: 'PASS',
    runtime,
    appRoot: info1.appRoot,
    dataRoot: info1.dataRoot,
    firstUrl: info1.url,
    relaunchUrl: info3.url,
    stateDigest: firstDigest,
    provenance: info1.provenance,
  }, null, 2) + '\n');
  fs.rmSync(temp, { recursive: true, force: true });
}

main().catch((error) => {
  process.stderr.write((error.stack || error.message) + '\n');
  process.exitCode = 1;
});
