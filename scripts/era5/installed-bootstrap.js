'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { clearInterval, setInterval } = require('node:timers');

const bundleRoot = path.resolve(__dirname, '..', '..');
const appRoot = path.join(bundleRoot, 'app');
const requireFromApp = createRequire(path.join(appRoot, 'package.json'));

const {
  LOCAL_HOST,
  createHiVenuesApp,
  createHiVenuesStore,
  startHiVenuesServer,
} = requireFromApp('./src/product/app.js');
const { createHiVenuesHiveReadService } = requireFromApp('./src/product/hive-read.js');
const { resolveInstalledPaths } = requireFromApp('./src/product/runtime-paths.js');

function parseArgs(argv) {
  const options = { openBrowser: true, port: 0, readyFile: '', shutdownFile: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--no-open') options.openBrowser = false;
    else if (arg === '--port') options.port = Number(argv[++i]);
    else if (arg === '--ready-file') options.readyFile = path.resolve(argv[++i] || '');
    else if (arg === '--shutdown-file') options.shutdownFile = path.resolve(argv[++i] || '');
    else throw new Error('Unknown installed-runtime proof argument: ' + arg);
  }
  if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
    throw new Error('--port must be an integer from 0 to 65535.');
  }
  return options;
}

function pidIsAlive(pid) {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error && error.code === 'EPERM';
  }
}

function acquireInstanceLock(lockPath) {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = fs.openSync(lockPath, 'wx', 0o600);
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid }) + '\n', 'utf8');
      fs.closeSync(fd);
      return () => {
        try {
          const record = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
          if (record.pid === process.pid) fs.unlinkSync(lockPath);
        } catch (_) {}
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let stale = true;
      try {
        const record = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
        stale = !pidIsAlive(Number(record.pid));
      } catch (_) {}
      if (!stale) {
        const conflict = new Error('HiVenues Studio is already running.');
        conflict.code = 'HIVENUES_ALREADY_RUNNING';
        throw conflict;
      }
      try { fs.unlinkSync(lockPath); } catch (_) {}
    }
  }
  throw new Error('HiVenues could not acquire its runtime lock.');
}

function writeReady(file, payload) {
  if (!file) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

function openSystemBrowser(url) {
  if (process.platform === 'win32') {
    const { spawn } = require('node:child_process');
    const child = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    return;
  }
  throw new Error('The Tranche-0 browser opener is qualified only for Windows.');
}

function provenance() {
  try {
    return JSON.parse(fs.readFileSync(path.join(bundleRoot, 'build-provenance.json'), 'utf8'));
  } catch (_) {
    return { sourceSha: 'UNKNOWN', sourceTree: 'UNKNOWN' };
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const installed = resolveInstalledPaths();
  let releaseInstance = () => {};
  let server;
  let timer;
  try {
    releaseInstance = acquireInstanceLock(installed.instanceLockPath);
    const store = createHiVenuesStore({
      statePath: installed.statePath,
      mediaRoot: installed.mediaRoot,
    });
    store.list();

    const hiveReadService = createHiVenuesHiveReadService();
    const app = createHiVenuesApp({
      store,
      hiveReadService,
      provenance: { commit: provenance().sourceSha, tree: provenance().sourceTree },
      // No fixed origin is necessary for a dynamic loopback port: the product
      // already derives and enforces the exact request origin when this is empty.
      identityOrigin: '',
    });
    server = await startHiVenuesServer(app, { port: options.port });
    const port = server.address().port;
    const url = `http://${LOCAL_HOST}:${port}/hivenues`;
    const ready = {
      pid: process.pid,
      url,
      bind: `${LOCAL_HOST}:${port}`,
      appRoot,
      dataRoot: installed.dataRoot,
      statePath: installed.statePath,
      mediaRoot: installed.mediaRoot,
      provenance: provenance(),
    };
    writeReady(options.readyFile, ready);
    process.stdout.write(JSON.stringify(ready) + '\n');

    if (options.openBrowser) openSystemBrowser(url);

    let closing = false;
    const close = () => {
      if (closing) return;
      closing = true;
      if (timer) clearInterval(timer);
      server.close((error) => {
        releaseInstance();
        if (error) process.exitCode = 1;
      });
    };
    process.once('SIGINT', close);
    process.once('SIGTERM', close);

    if (options.shutdownFile) {
      timer = setInterval(() => {
        if (fs.existsSync(options.shutdownFile)) close();
      }, 100);
      timer.unref();
    }
  } catch (error) {
    releaseInstance();
    if (error.code === 'HIVENUES_ALREADY_RUNNING') {
      process.stderr.write('HIVENUES_ALREADY_RUNNING\n');
      process.exitCode = 73;
      return;
    }
    throw error;
  }
}

main().catch((error) => {
  process.stderr.write((error.stack || error.message) + '\n');
  process.exitCode = 1;
});
