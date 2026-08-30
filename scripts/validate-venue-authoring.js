'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  createVenueAuthoringDocument,
  serializeVenueAuthoringReview,
} = require('../src/venue/authoring');

function usage() {
  process.stderr.write('Usage: node scripts/validate-venue-authoring.js <non-secret-authoring.json>\n');
}

function main(argv) {
  if (argv.length !== 1 || argv[0] === '--help' || argv[0] === '-h') {
    usage();
    return argv.length === 1 ? 0 : 2;
  }

  let input;
  try {
    input = JSON.parse(fs.readFileSync(path.resolve(argv[0]), 'utf8'));
  } catch (error) {
    process.stderr.write(`HV-5 authoring input could not be read as JSON: ${error.message}\n`);
    return 2;
  }

  try {
    const document = createVenueAuthoringDocument(input);
    process.stdout.write(serializeVenueAuthoringReview(document));
    return 0;
  } catch (error) {
    process.stderr.write(`HV-5 authoring validation failed: ${error.message}\n`);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { main };
