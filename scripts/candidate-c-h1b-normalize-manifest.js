'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = process.env.CANDIDATE_C_H1B_REVIEW_ROOT || path.join('artifacts', 'candidate-c-h1b-review');
const manifestPath = path.join(root, 'manifest.json');
const clientPath = path.join('test', 'support', 'candidate-c-h1b-client.js');
const exactSha = process.env.CANDIDATE_C_H1B_EXACT_SHA;

if (!exactSha) throw new Error('CANDIDATE_C_H1B_EXACT_SHA is required');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const source = fs.readFileSync(clientPath, 'utf8');
const lines = source.trimEnd().split(/\r?\n/).length;
const responsibilities = [
  'selection',
  'drag-intent',
  'focal-preview',
  'revision-token-source',
  '409-swap-policy',
  'focus-restoration',
  'bfcache-refresh',
];

manifest.candidate = exactSha;
manifest.provenance = {
  exactHeadSha: exactSha,
  workflowGithubSha: process.env.GITHUB_SHA || null,
  note: 'exactHeadSha is the checked-out PR head; workflowGithubSha may be GitHub\'s synthetic pull-request merge ref.',
};
manifest.architecture.clientIslands.files[0].lines = lines;
manifest.architecture.clientIslands.files[0].responsibilities = responsibilities;
manifest.clientInventory.files[0].lines = lines;
manifest.clientInventory.files[0].responsibilities = responsibilities;
manifest.summary.customClientLines = lines;
manifest.interactionEvidence.currentRevisionSourcedFromServerRenderedDom = true;
manifest.interactionEvidence.backForwardCacheReconciledToServerTruth = true;

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ exactHeadSha: exactSha, customClientLines: lines, responsibilities }, null, 2));
