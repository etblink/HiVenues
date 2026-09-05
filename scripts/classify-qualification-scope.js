'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

// The single executable selection policy. '*' retains Bash case semantics,
// including nested directories. Exact classifier inputs also qualify themselves.
const visualPatterns = [
  'docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_CANDIDATE_QUALIFICATION_TRIGGER_0_1_0.md',
  'views/*',
  'public/*',
  'src/input.css',
  'src/app.js',
  'routes/*',
  'src/routes/*',
  'src/content/*',
  'src/onboarding/*',
  'src/moderation/*',
  'src/payments/*',
  'src/venue/native-authoring-surface.js',
  'src/venue/visual-authoring-session.js',
  'src/venue/source-authoring.js',
  'src/venue/source-authoring-session.js',
  'src/venue/source-authoring-surface.js',
  'src/venue/context.js',
  'src/venue/package.js',
  'src/venue/package-selection.js',
  'src/venue/reference/*',
  'src/venue/turnkey-studio.js',
  'src/venue/managed-assets.js',
  'src/venue/turnkey-workspace.js',
  'src/venue/turnkey-readiness.js',
  'scripts/capture-*-visual.js',
  'scripts/capture-current-contract-visual.js',
  'scripts/capture-issue-130-presentation-review.js',
  'scripts/run-current-visual-contract.js',
  'scripts/assemble-current-visual-evidence.js',
  'config/visual-qualification-contract.json',
  'config/issue-130-presentation-review.json',
  'test/visual-qualification-contract.test.js',
  'test/issue-130-presentation-quality.test.js',
  'test/turnkey-release.test.js',
  'test/support/*visual*',
  'test/support/hv6-native-editor-fixture.js',
  'test/support/source-authoring-fixture.js',
  'src/venue/read-only-venue-canvas-surface.js',
  'src/venue/canvas-source-preview.js',
  'src/venue/editable-venue-canvas-surface.js',
  '.github/workflows/ci.yml',
  'scripts/classify-qualification-scope.js',
  'test/qualification-scope-classifier.test.js',
].map((pattern) => new RegExp('^' + pattern.split('*')
  .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('[\\s\\S]*') + '$'));

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function main() {
  if (process.argv.length !== 2) throw new Error('Usage: node scripts/classify-qualification-scope.js (environment inputs only)');
  const { EVENT_NAME, PR_BASE_SHA, PUSH_BEFORE_SHA, GITHUB_OUTPUT } = process.env;
  if (!['pull_request', 'push', 'workflow_dispatch'].includes(EVENT_NAME)) {
    throw new Error('EVENT_NAME must be pull_request, push, or workflow_dispatch');
  }
  if (!GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required');

  let visual = EVENT_NAME === 'workflow_dispatch';
  if (!visual) {
    let base = EVENT_NAME === 'pull_request' ? PR_BASE_SHA : PUSH_BEFORE_SHA;
    if (!base || /^0+$/.test(base)) base = git(['rev-parse', '--verify', 'HEAD^']).trim();
    if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(base)) throw new Error('Base must be a full Git commit SHA');
    // Resolve a commit, reject missing objects, and separate revisions from paths.
    const commit = git(['rev-parse', '--verify', base + '^{commit}']).trim();
    // Include both sides of renames; deleting a visual path must still qualify.
    const changed = git(['diff', '--no-renames', '--name-only', '-z', commit, 'HEAD', '--'])
      .split('\0').filter(Boolean);
    console.log('Changed paths: ' + JSON.stringify(changed));
    visual = changed.some((path) => visualPatterns.some((pattern) => pattern.test(path)));
  } else {
    console.log('Manual qualification: current-contract UI/UX visual evidence selected.');
  }

  // No output is emitted until invocation and Git comparison have succeeded.
  fs.appendFileSync(GITHUB_OUTPUT, 'visual=' + visual + '\n');
  console.log('UI/UX visual evidence required: ' + visual);
}

try {
  main();
} catch (error) {
  console.error('Qualification scope classification failed: ' + error.message);
  process.exitCode = 1;
}
