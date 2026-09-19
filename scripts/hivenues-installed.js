'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { clearInterval, setInterval } = require('node:timers');

const {
  LOCAL_HOST,
  createHiVenuesApp,
  createHiVenuesStore,
  startHiVenuesServer,
} = require('../src/product/app');
const { createLocalDeploymentServices } = require('../src/product/deployment');
const { createPlatformAuthorityProtector } = require('../src/product/deployment-authority');
const { createHiVenuesHiveReadService } = require('../src/product/hive-read');
const { resolveInstalledPaths } = require('../src/product/runtime-paths');
const {
  acquireInstanceLock,
  markRuntimeStopped,
  publishRuntimeReady,
  readBuildProvenance,
} = require('../src/product/installed-runtime');

const appRoot = path.resolve(__dirname, '..');
const bundleRoot = path.resolve(appRoot, '..');

function parseArgs(argv) {
  const options = {
    port: 0,
    readyUrlFile: '',
    shutdownFile: '',
    noOpen: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--port') options.port = Number(argv[++index]);
    else if (arg === '--ready-url-file') options.readyUrlFile = path.resolve(argv[++index] || '');
    else if (arg === '--shutdown-file') options.shutdownFile = path.resolve(argv[++index] || '');
    else if (arg === '--no-open') options.noOpen = true;
    else throw new Error('Unknown installed-runtime argument: ' + arg);
  }
  if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
    throw new Error('--port must be an integer from 0 to 65535.');
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const paths = resolveInstalledPaths();
  const provenance = readBuildProvenance(path.join(bundleRoot, 'build-provenance.json'));
  let releaseInstance = () => {};
  let server = null;
  let timer = null;
  let runtime = null;
  let store = null;

  try {
    releaseInstance = acquireInstanceLock(paths.instanceLockPath);

    store = createHiVenuesStore({
      statePath: paths.statePath,
      mediaRoot: paths.mediaRoot,
    });
    store.list();

    const hiveReadService = createHiVenuesHiveReadService();
    const authorityProtector = process.platform === 'win32'
      ? createPlatformAuthorityProtector()
      : null;
    const deploymentServices = createLocalDeploymentServices({
      store,
      statePath: paths.deploymentStatePath,
      packageRoot: paths.deploymentPackagesRoot,
      mediaRoot: paths.mediaRoot,
      authorityRoot: authorityProtector ? paths.deploymentAuthorityRoot : '',
      authorityProtector,
    });
    const app = createHiVenuesApp({
      store,
      hiveReadService,
      provenance: {
        commit: provenance.sourceSha,
        tree: provenance.sourceTree,
      },
      identityOrigin: '',
      deploymentServices,
    });

    server = await startHiVenuesServer(app, { port: options.port });
    const port = server.address().port;
    const url = `http://${LOCAL_HOST}:${port}/hivenues`;
    runtime = {
      pid: process.pid,
      url,
      bind: `${LOCAL_HOST}:${port}`,
      appRoot,
      dataRoot: paths.dataRoot,
      statePath: paths.statePath,
      mediaRoot: paths.mediaRoot,
      deploymentStatePath: paths.deploymentStatePath,
      deploymentPackagesRoot: paths.deploymentPackagesRoot,
      deploymentAuthorityRoot: authorityProtector ? paths.deploymentAuthorityRoot : null,
      deploymentAuthorityProtector: authorityProtector?.kind || null,
      diagnosticsRoot: paths.diagnosticsRoot,
      provenance,
    };
    publishRuntimeReady({
      paths,
      readyUrlFile: options.readyUrlFile,
      runtime,
    });
    process.stdout.write(JSON.stringify(runtime) + '\n');

    let closing = false;
    const close = (reason = 'normal') => {
      if (closing) return;
      closing = true;
      if (timer) clearInterval(timer);
      server.close((error) => {
        markRuntimeStopped({
          paths,
          url,
          reason: error ? 'server-close-error' : reason,
          productDiagnostics: typeof store?.diagnostics === 'function' ? store.diagnostics() : null,
        });
        releaseInstance();
        if (error) process.exitCode = 1;
      });
    };

    process.once('SIGINT', () => close('sigint'));
    process.once('SIGTERM', () => close('sigterm'));

    if (options.shutdownFile) {
      timer = setInterval(() => {
        if (fs.existsSync(options.shutdownFile)) close('requested');
      }, 100);
      timer.unref();
    }
  } catch (error) {
    if (runtime?.url) {
      markRuntimeStopped({
        paths,
        url: runtime.url,
        reason: 'startup-error',
        productDiagnostics: typeof store?.diagnostics === 'function' ? store.diagnostics() : null,
      });
    }
    releaseInstance();
    if (error.code === 'HIVENUES_ALREADY_RUNNING') {
      process.stderr.write('HIVENUES_ALREADY_RUNNING\n');
      process.exitCode = 73;
      return;
    }
    throw error;
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write((error.stack || error.message) + '\n');
    process.exitCode = 1;
  });
}

module.exports = { main, parseArgs };
