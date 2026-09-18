'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  acquireInstanceLock,
  markRuntimeStopped,
  pidIsAlive,
  publishRuntimeReady,
  readBuildProvenance,
} = require('../src/product/installed-runtime');
const { resolveInstalledPaths } = require('../src/product/runtime-paths');

test('instance lock rejects a live owner and recovers a stale owner', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-runtime-lock-'));
  const lockPath = path.join(directory, 'runtime.lock');
  try {
    const release = acquireInstanceLock(lockPath, {
      pid: 111,
      now: () => 0,
      isAlive: (pid) => pid === 111,
    });
    assert.throws(
      () => acquireInstanceLock(lockPath, { pid: 222, isAlive: (pid) => pid === 111 }),
      (error) => error.code === 'HIVENUES_ALREADY_RUNNING',
    );
    release();
    fs.writeFileSync(lockPath, JSON.stringify({ pid: 333 }) + '\n');
    const recovered = acquireInstanceLock(lockPath, {
      pid: 444,
      isAlive: () => false,
    });
    assert.equal(JSON.parse(fs.readFileSync(lockPath, 'utf8')).pid, 444);
    recovered();
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('pid liveness treats EPERM as alive and ESRCH as absent', () => {
  assert.equal(pidIsAlive(123, () => { const error = new Error(); error.code = 'EPERM'; throw error; }), true);
  assert.equal(pidIsAlive(123, () => { const error = new Error(); error.code = 'ESRCH'; throw error; }), false);
  assert.equal(pidIsAlive(0, () => {}), false);
});

test('build provenance is mandatory and validated', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-provenance-'));
  const file = path.join(directory, 'build-provenance.json');
  try {
    assert.throws(() => readBuildProvenance(file), (error) => error.code === 'HIVENUES_PROVENANCE_MISSING');
    fs.writeFileSync(file, JSON.stringify({
      sourceSha: 'a'.repeat(40),
      sourceTree: 'b'.repeat(40),
      nodeVersion: 'v24.19.0',
      packageVersion: '1.0.0',
    }));
    const record = readBuildProvenance(file);
    assert.equal(record.sourceSha, 'a'.repeat(40));
    fs.writeFileSync(file, '{}');
    assert.throws(() => readBuildProvenance(file), (error) => error.code === 'HIVENUES_PROVENANCE_INVALID');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('runtime readiness and stop state are published without moving durable work', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hivenues-runtime-diag-'));
  const localAppData = path.join(directory, 'LocalAppData');
  const readyFile = path.join(directory, 'ready-url.txt');
  const paths = resolveInstalledPaths({
    platform: 'win32',
    env: { LOCALAPPDATA: localAppData },
    homedir: directory,
  });
  try {
    const runtime = {
      pid: process.pid,
      url: 'http://127.0.0.1:4317/hivenues',
      bind: '127.0.0.1:4317',
      appRoot: 'C:\\Program Files\\HiVenues Studio\\app',
      dataRoot: paths.dataRoot,
      statePath: paths.statePath,
      mediaRoot: paths.mediaRoot,
      diagnosticsRoot: paths.diagnosticsRoot,
      provenance: {
        sourceSha: 'a'.repeat(40),
        sourceTree: 'b'.repeat(40),
        nodeVersion: 'v24.19.0',
        packageVersion: '1.0.0',
      },
    };
    publishRuntimeReady({ paths, readyUrlFile: readyFile, runtime, now: () => 0 });
    assert.equal(fs.readFileSync(paths.currentUrlPath, 'utf8').trim(), runtime.url);
    assert.equal(fs.readFileSync(readyFile, 'utf8').trim(), runtime.url);
    assert.equal(JSON.parse(fs.readFileSync(paths.runtimeDiagnosticsPath, 'utf8')).status, 'running');

    markRuntimeStopped({ paths, url: runtime.url, now: () => 1000, reason: 'requested' });
    assert.equal(fs.existsSync(paths.currentUrlPath), false);
    const stopped = JSON.parse(fs.readFileSync(paths.runtimeDiagnosticsPath, 'utf8'));
    assert.equal(stopped.status, 'stopped');
    assert.equal(stopped.stopReason, 'requested');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
