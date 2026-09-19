'use strict';

const path = require('node:path');

const {
  createDeployedPublicApp,
  startDeployedPublicServer,
} = require('../src/deploy/public-runtime');

async function main() {
  const packagePath = path.resolve(process.env.HIVENUES_RELEASE_PACKAGE || '');
  const runtimeStatePath = path.resolve(process.env.HIVENUES_RUNTIME_STATE || '');
  const provenancePath = path.resolve(process.env.HIVENUES_RUNTIME_PROVENANCE || '');
  const manifestPath = path.resolve(process.env.HIVENUES_RUNTIME_MANIFEST || '');
  const port = Number(process.env.PORT || 4317);

  if (!process.env.HIVENUES_RELEASE_PACKAGE) {
    throw new Error('HIVENUES_RELEASE_PACKAGE is required.');
  }
  if (!process.env.HIVENUES_RUNTIME_STATE) {
    throw new Error('HIVENUES_RUNTIME_STATE is required.');
  }
  if (!process.env.HIVENUES_RUNTIME_PROVENANCE) {
    throw new Error('HIVENUES_RUNTIME_PROVENANCE is required.');
  }
  if (!process.env.HIVENUES_RUNTIME_MANIFEST) {
    throw new Error('HIVENUES_RUNTIME_MANIFEST is required.');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer from 1 through 65535.');
  }

  const { app, readBack } = createDeployedPublicApp({
    packagePath,
    runtimeStatePath,
    provenancePath,
    manifestPath,
  });
  await startDeployedPublicServer(app, { port });

  const state = readBack();
  console.log('HiVenues deployed runtime');
  console.log('Bind:     127.0.0.1:' + port);
  console.log('Release:  ' + state.deployment.releaseId);
  console.log('Digest:   ' + state.deployment.releaseDigest);
  console.log('Runtime:  ' + state.runtime.sourceSha);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
