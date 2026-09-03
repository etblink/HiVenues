#!/usr/bin/env node
'use strict';

const { qualifyTurnkeyWorkspace } = require('../src/venue/turnkey-readiness');

function main(argv = process.argv.slice(2)) {
  const workspaceDirectory = argv[0];
  if (!workspaceDirectory || argv.length !== 1) throw new Error('Usage: npm run venue:ready -- <workspace-directory>');
  const result = qualifyTurnkeyWorkspace({ workspaceDirectory });
  process.stdout.write('HIVENUES_TURNKEY_READINESS=PASS\n');
  process.stdout.write(`WORKSPACE=${result.workspace}\nSOURCE_SHA256=${result.sourceSha256}\n`);
  process.stdout.write(`MEDIA_REFERENCES=${result.media.length}\nREHEARSAL_WORKSPACE_ID=${result.rehearsalWorkspaceId}\n`);
  process.stdout.write('No production deployment, Hive write, key operation, DNS change, or funds movement occurred.\n');
}

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`HIVENUES_TURNKEY_READINESS=FAIL\n${error.message}\n`); process.exitCode = 1; }
}
module.exports = { main };
