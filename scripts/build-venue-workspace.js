'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  WORKSPACE_FILENAMES,
  buildPortableVenueWorkspace,
} = require('../src/venue/workspace');

function usage() {
  process.stderr.write(
    'Usage: node scripts/build-venue-workspace.js <authoring.json> <deployment-manifest.json> <output-directory>\n',
  );
}

function readJson(filename, label) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(filename), 'utf8'));
  } catch (error) {
    throw new Error(`${label} could not be read as JSON: ${error.message}`);
  }
}

function materializeWorkspace(outputDirectory, workspace) {
  const outputPath = path.resolve(outputDirectory);
  const parent = path.dirname(outputPath);
  if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) {
    throw new Error(`output parent directory does not exist: ${parent}`);
  }
  let claimed = false;
  let committed = false;
  try {
    try {
      fs.mkdirSync(outputPath, { mode: 0o700 });
      claimed = true;
    } catch (error) {
      if (error?.code === 'EEXIST') {
        throw new Error(`output directory already exists: ${outputPath}`);
      }
      throw error;
    }

    for (const filename of Object.values(WORKSPACE_FILENAMES).sort()) {
      fs.writeFileSync(path.join(outputPath, filename), workspace.files[filename], {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      });
    }
    committed = true;
  } finally {
    if (claimed && !committed) fs.rmSync(outputPath, { recursive: true, force: true });
  }
  return outputPath;
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

  let authoringDocument;
  let deploymentManifest;
  try {
    authoringDocument = readJson(argv[0], 'Venue authoring source');
    deploymentManifest = readJson(argv[1], 'Deployment manifest');
  } catch (error) {
    process.stderr.write(`Portable venue workspace build failed: ${error.message}\n`);
    return 2;
  }

  try {
    const workspace = buildPortableVenueWorkspace({ authoringDocument, deploymentManifest });
    materializeWorkspace(argv[2], workspace);
    process.stdout.write(workspace.files[WORKSPACE_FILENAMES.manifest]);
    return 0;
  } catch (error) {
    process.stderr.write(`Portable venue workspace build failed: ${error.message}\n`);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { main, materializeWorkspace };
