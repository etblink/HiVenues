'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

function parseArgs(argv) {
  const index = argv.indexOf('--bundle');
  if (index < 0 || !argv[index + 1]) throw new Error('--bundle is required.');
  return { bundle: path.resolve(argv[index + 1]) };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReady(file, child, output, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
    if (child.exitCode !== null) {
      throw new Error(
        'Runtime exited before readiness with code ' + child.exitCode
        + '\nstdout:\n' + output.stdout
        + '\nstderr:\n' + output.stderr
      );
    }
    await sleep(100);
  }
  throw new Error(
    'Timed out waiting for runtime readiness.'
    + '\nstdout:\n' + output.stdout
    + '\nstderr:\n' + output.stderr
  );
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

function launch({ runtime, script, cwd, env, readyFile, shutdownFile }) {
  const child = spawn(runtime, [
    script,
    '--no-open',
    '--port', '0',
    '--ready-url-file', readyFile,
    '--shutdown-file', shutdownFile,
  ], {
    cwd,
    env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = { stdout: '', stderr: '' };
  child.stdout.on('data', (chunk) => { output.stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output.stderr += chunk.toString(); });
  return { child, output };
}

async function readRuntime(paths, expectedUrl, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fs.existsSync(paths.runtimeDiagnosticsPath)) {
      const record = JSON.parse(fs.readFileSync(paths.runtimeDiagnosticsPath, 'utf8'));
      if (record.status === 'running' && (!expectedUrl || record.url === expectedUrl)) return record;
    }
    await sleep(100);
  }
  throw new Error('Timed out waiting for running runtime diagnostics.');
}

async function waitForAbsent(file, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!fs.existsSync(file)) return;
    await sleep(100);
  }
  throw new Error('Timed out waiting for runtime marker removal: ' + file);
}

async function main() {
  const { bundle } = parseArgs(process.argv.slice(2));
  const runtime = path.join(bundle, 'runtime', process.platform === 'win32' ? 'node.exe' : 'node');
  const appRoot = path.join(bundle, 'app');
  const script = path.join(appRoot, 'scripts', 'hivenues-installed.js');
  const publicRuntimeBuilder = path.join(appRoot, 'scripts', 'era7', 'build-public-runtime-bundle.js');
  const publicRuntimeEntry = path.join(appRoot, 'scripts', 'hivenues-public-runtime.js');
  const installedLicense = path.join(appRoot, 'LICENSE');
  const launcher = path.join(bundle, 'HiVenues Studio.exe');
  assert.ok(fs.existsSync(runtime), 'private runtime is present');
  assert.ok(fs.existsSync(script), 'installed runtime entry is present');
  assert.ok(fs.existsSync(publicRuntimeBuilder), 'installed public-runtime builder is present');
  assert.ok(fs.existsSync(publicRuntimeEntry), 'installed public-runtime entry is present');
  assert.ok(fs.existsSync(installedLicense), 'installed license required by public runtime is present');
  if (process.platform === 'win32') assert.ok(fs.existsSync(launcher), 'native Windows launcher is present');

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-era5-proof-'));
  const unrelatedCwd = path.join(temp, 'unrelated-cwd');
  const localAppData = path.join(temp, 'LocalAppData');
  fs.mkdirSync(unrelatedCwd, { recursive: true });
  const env = { ...process.env, LOCALAPPDATA: localAppData };
  const bundledProvenance = JSON.parse(
    fs.readFileSync(path.join(bundle, 'build-provenance.json'), 'utf8'),
  );
  const deploymentRuntimeRoot = path.join(temp, 'deployment-runtime-proof');
  const buildRuntime = spawnSync(runtime, [
    publicRuntimeBuilder,
    '--output', deploymentRuntimeRoot,
    '--source-sha', bundledProvenance.sourceSha,
    '--source-tree', bundledProvenance.sourceTree,
    '--node-version', bundledProvenance.nodeVersion,
  ], {
    cwd: appRoot,
    env: { ...env, PATH: '' },
    windowsHide: true,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  assert.equal(
    buildRuntime.status,
    0,
    'installed public runtime build failed without developer tooling:\n'
      + (buildRuntime.stdout || '') + '\n' + (buildRuntime.stderr || ''),
  );
  const deploymentRuntimeProvenance = JSON.parse(
    fs.readFileSync(path.join(deploymentRuntimeRoot, 'runtime-provenance.json'), 'utf8'),
  );
  assert.equal(deploymentRuntimeProvenance.sourceSha, bundledProvenance.sourceSha);
  assert.equal(deploymentRuntimeProvenance.sourceTree, bundledProvenance.sourceTree);
  assert.equal(deploymentRuntimeProvenance.nodeVersion, bundledProvenance.nodeVersion);
  assert.equal(deploymentRuntimeProvenance.packageVersion, bundledProvenance.packageVersion);

  const dataRoot = path.join(localAppData, 'HiVenues Studio');
  const runtimePaths = {
    runtimeDiagnosticsPath: path.join(dataRoot, 'diagnostics', 'runtime.json'),
    currentUrlPath: path.join(dataRoot, 'diagnostics', 'current-url.txt'),
  };
  const ready1 = path.join(temp, 'ready-1.txt');
  const stop1 = path.join(temp, 'stop-1');

  const firstLaunch = launch({ runtime, script, cwd: unrelatedCwd, env, readyFile: ready1, shutdownFile: stop1 });
  const first = firstLaunch.child;
  const url1 = await waitForReady(ready1, first, firstLaunch.output);
  const info1 = await readRuntime(runtimePaths, url1);
  assert.equal(path.resolve(info1.appRoot), path.resolve(bundle, 'app'));
  assert.ok(path.resolve(info1.dataRoot).startsWith(path.resolve(localAppData)));
  assert.ok(path.resolve(info1.statePath).startsWith(path.resolve(localAppData)));
  assert.ok(path.resolve(info1.mediaRoot).startsWith(path.resolve(localAppData)));
  assert.equal(fs.readFileSync(runtimePaths.currentUrlPath, 'utf8').trim(), url1);
  assert.ok(fs.existsSync(info1.statePath));

  const response = await fetch(url1);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /HiVenues/);
  const firstDigest = digest(info1.statePath);

  const ready2 = path.join(temp, 'ready-2.txt');
  const stop2 = path.join(temp, 'stop-2');
  const secondLaunch = launch({ runtime, script, cwd: unrelatedCwd, env, readyFile: ready2, shutdownFile: stop2 });
  const second = secondLaunch.child;
  const secondExit = await waitForExit(second);
  assert.equal(secondExit.code, 73);
  assert.match(secondLaunch.output.stderr, /HIVENUES_ALREADY_RUNNING/);
  assert.equal(fs.existsSync(ready2), false);

  fs.writeFileSync(stop1, 'stop\n');
  const firstExit = await waitForExit(first);
  assert.equal(firstExit.code, 0);
  assert.equal(fs.existsSync(runtimePaths.currentUrlPath), false);

  const ready3 = path.join(temp, 'ready-3.txt');
  const stop3 = path.join(temp, 'stop-3');
  const thirdLaunch = launch({ runtime, script, cwd: unrelatedCwd, env, readyFile: ready3, shutdownFile: stop3 });
  const third = thirdLaunch.child;
  const url3 = await waitForReady(ready3, third, thirdLaunch.output);
  const info3 = await readRuntime(runtimePaths, url3);
  assert.equal(info3.statePath, info1.statePath);
  assert.equal(digest(info3.statePath), firstDigest);
  const response3 = await fetch(url3);
  assert.equal(response3.status, 200);
  fs.writeFileSync(stop3, 'stop\n');
  const thirdExit = await waitForExit(third);
  assert.equal(thirdExit.code, 0);

  let launcherUrl = null;
  if (process.platform === 'win32') {
    const launcherStop = path.join(temp, 'launcher-stop');
    const launcherRun = spawn(launcher, ['--no-open', '--shutdown-file', launcherStop], {
      cwd: unrelatedCwd,
      env,
      windowsHide: true,
      stdio: 'ignore',
    });
    const launcherExit = await waitForExit(launcherRun);
    assert.equal(launcherExit.code, 0);

    const deadline = Date.now() + 15000;
    while (Date.now() < deadline && !fs.existsSync(runtimePaths.currentUrlPath)) await sleep(100);
    assert.ok(fs.existsSync(runtimePaths.currentUrlPath), 'native launcher publishes a current Studio URL');
    launcherUrl = fs.readFileSync(runtimePaths.currentUrlPath, 'utf8').trim();
    const launcherInfo = await readRuntime(runtimePaths, launcherUrl);
    assert.equal(launcherInfo.statePath, info1.statePath);
    assert.equal(digest(launcherInfo.statePath), firstDigest);
    const launcherResponse = await fetch(launcherUrl);
    assert.equal(launcherResponse.status, 200);

    const secondLauncher = spawn(launcher, ['--no-open'], {
      cwd: unrelatedCwd,
      env,
      windowsHide: true,
      stdio: 'ignore',
    });
    const secondLauncherExit = await waitForExit(secondLauncher);
    assert.equal(secondLauncherExit.code, 0);
    const afterSecondLauncher = await readRuntime(runtimePaths, launcherUrl);
    assert.equal(afterSecondLauncher.pid, launcherInfo.pid);

    fs.writeFileSync(launcherStop, 'stop\n');
    await waitForAbsent(runtimePaths.currentUrlPath);
  }

  process.stdout.write(JSON.stringify({
    result: 'PASS',
    runtime,
    appRoot: info1.appRoot,
    dataRoot: info1.dataRoot,
    firstUrl: url1,
    relaunchUrl: url3,
    launcherUrl,
    stateDigest: firstDigest,
    provenance: info1.provenance,
    deploymentRuntime: {
      sourceSha: deploymentRuntimeProvenance.sourceSha,
      sourceTree: deploymentRuntimeProvenance.sourceTree,
      nodeVersion: deploymentRuntimeProvenance.nodeVersion,
      packageVersion: deploymentRuntimeProvenance.packageVersion,
      bundleDigest: deploymentRuntimeProvenance.bundleDigest,
      builtWithoutDeveloperTooling: true,
    },
  }, null, 2) + '\n');
  fs.rmSync(temp, { recursive: true, force: true });
}

main().catch((error) => {
  process.stderr.write((error.stack || error.message) + '\n');
  process.exitCode = 1;
});
