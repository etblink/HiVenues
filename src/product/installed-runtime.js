'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SHA1_PATTERN = /^[a-f0-9]{40}$/i;

function runtimeError(code, message, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.code = code;
  return error;
}

function ensureParent(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function writeAtomic(file, payload) {
  ensureParent(file);
  const temp = file + '.tmp-' + process.pid + '-' + Date.now();
  let fd;
  try {
    fd = fs.openSync(temp, 'wx', 0o600);
    fs.writeFileSync(fd, payload, 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = undefined;
    fs.renameSync(temp, file);
  } catch (error) {
    if (fd !== undefined) {
      try { fs.closeSync(fd); } catch (_) {}
    }
    try { fs.unlinkSync(temp); } catch (_) {}
    throw error;
  }
}

function writeJsonAtomic(file, value) {
  writeAtomic(file, JSON.stringify(value, null, 2) + '\n');
}

function writeTextAtomic(file, value) {
  writeAtomic(file, String(value));
}

function pidIsAlive(pid, kill = process.kill) {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try {
    kill(pid, 0);
    return true;
  } catch (error) {
    return Boolean(error && error.code === 'EPERM');
  }
}

function acquireInstanceLock(lockPath, {
  pid = process.pid,
  now = Date.now,
  isAlive = pidIsAlive,
} = {}) {
  ensureParent(lockPath);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = fs.openSync(lockPath, 'wx', 0o600);
      fs.writeFileSync(fd, JSON.stringify({
        version: 1,
        pid,
        startedAt: new Date(now()).toISOString(),
      }) + '\n', 'utf8');
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      return () => {
        try {
          const record = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
          if (Number(record.pid) === pid) fs.unlinkSync(lockPath);
        } catch (_) {}
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let stale = true;
      try {
        const record = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        stale = !isAlive(Number(record.pid));
      } catch (_) {}
      if (!stale) {
        throw runtimeError('HIVENUES_ALREADY_RUNNING', 'HiVenues Studio is already running.');
      }
      try { fs.unlinkSync(lockPath); } catch (_) {}
    }
  }
  throw runtimeError('HIVENUES_INSTANCE_LOCK_FAILED', 'HiVenues could not acquire its runtime lock.');
}

function readBuildProvenance(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (error) {
    throw runtimeError('HIVENUES_PROVENANCE_MISSING', 'HiVenues build provenance is missing.', error);
  }
  let record;
  try {
    record = JSON.parse(raw);
  } catch (error) {
    throw runtimeError('HIVENUES_PROVENANCE_INVALID', 'HiVenues build provenance is invalid JSON.', error);
  }
  if (
    !record
    || typeof record !== 'object'
    || !SHA1_PATTERN.test(String(record.sourceSha || ''))
    || !SHA1_PATTERN.test(String(record.sourceTree || ''))
    || !/^v24\./.test(String(record.nodeVersion || ''))
    || !String(record.packageVersion || '').trim()
  ) {
    throw runtimeError('HIVENUES_PROVENANCE_INVALID', 'HiVenues build provenance is incomplete.');
  }
  return Object.freeze({ ...record });
}

function publishRuntimeReady({
  paths,
  readyUrlFile = '',
  runtime,
  now = Date.now,
}) {
  const record = Object.freeze({
    version: 1,
    status: 'running',
    startedAt: new Date(now()).toISOString(),
    ...runtime,
  });
  writeJsonAtomic(paths.runtimeDiagnosticsPath, record);
  writeTextAtomic(paths.currentUrlPath, runtime.url + '\n');
  if (readyUrlFile) writeTextAtomic(readyUrlFile, runtime.url + '\n');
  return record;
}

function markRuntimeStopped({
  paths,
  url,
  pid = process.pid,
  now = Date.now,
  reason = 'normal',
  productDiagnostics = null,
}) {
  try {
    const current = fs.readFileSync(paths.currentUrlPath, 'utf8').trim();
    if (current === url) fs.unlinkSync(paths.currentUrlPath);
  } catch (_) {}

  let prior = {};
  try {
    prior = JSON.parse(fs.readFileSync(paths.runtimeDiagnosticsPath, 'utf8'));
  } catch (_) {}
  if (Number(prior.pid) !== pid && prior.status === 'running') return;
  writeJsonAtomic(paths.runtimeDiagnosticsPath, {
    ...prior,
    version: 1,
    status: 'stopped',
    stoppedAt: new Date(now()).toISOString(),
    stopReason: reason,
    pid,
    url,
    ...(productDiagnostics ? { productDiagnostics } : {}),
  });
}

module.exports = {
  acquireInstanceLock,
  markRuntimeStopped,
  pidIsAlive,
  publishRuntimeReady,
  readBuildProvenance,
  writeJsonAtomic,
  writeTextAtomic,
};
