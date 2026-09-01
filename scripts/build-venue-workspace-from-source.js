'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  loadDeploymentAgnosticVenueSourceFile,
} = require('../src/venue/source-file');
const {
  WORKSPACE_FILENAMES,
} = require('../src/venue/workspace');
const {
  buildPortableVenueWorkspaceFromSource,
} = require('../src/venue/workspace-from-source');
const { materializeWorkspace } = require('./build-venue-workspace');

function usage() {
  process.stderr.write(
    'Usage: node scripts/build-venue-workspace-from-source.js <venue-source.json> <deployment-manifest.json> <output-directory>\n',
  );
}

function readJson(filename, label) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(filename), 'utf8'));
  } catch (error) {
    throw new Error(`${label} could not be read as JSON: ${error.message}`);
  }
}

function main(argv) {
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '-h')) {
    usage();
    return 0;
  }
  if (argv.length !== 3) {
    usage();
    return 2;
  }

  let venueSource;
  let deploymentManifest;
  try {
    venueSource = loadDeploymentAgnosticVenueSourceFile(argv[0]);
    deploymentManifest = readJson(argv[1], 'Deployment manifest');
  } catch (error) {
    process.stderr.write(`Portable venue workspace build from source failed: ${error.message}\n`);
    return 2;
  }

  try {
    const workspace = buildPortableVenueWorkspaceFromSource({
      venueSource,
      deploymentManifest,
    });
    materializeWorkspace(argv[2], workspace);
    process.stdout.write(workspace.files[WORKSPACE_FILENAMES.manifest]);
    return 0;
  } catch (error) {
    process.stderr.write(`Portable venue workspace build from source failed: ${error.message}\n`);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { main };
