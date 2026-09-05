'use strict';

const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
// Run the entry point named by CI, not a test-only implementation of its policy.
const entry = workflow.match(/^        run: node (scripts\/classify-qualification-scope\.js)$/m)?.[1];
assert.ok(entry, 'scope job must invoke the shared executable');
const script = path.join(root, entry);

function fixture(t, initialize = true) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hv-scope-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const repo = path.join(dir, 'repo');
  const output = path.join(dir, 'output');
  fs.mkdirSync(repo);
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  function commit(file) {
    fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
    fs.appendFileSync(path.join(repo, file), 'fixture\n');
    git('add', '--all');
    git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture');
    return git('rev-parse', 'HEAD');
  }
  if (initialize) {
    git('init', '-q');
    git('config', 'user.name', 'Scope fixture');
    git('config', 'user.email', 'scope@example.invalid');
    commit('README.md');
  }
  function run(env = {}, args = []) {
    fs.writeFileSync(output, 'existing=retained\n');
    const result = spawnSync(process.execPath, [script, ...args], {
      cwd: repo, encoding: 'utf8',
      env: { ...process.env, EVENT_NAME: 'pull_request', PR_BASE_SHA: '', PUSH_BEFORE_SHA: '', GITHUB_OUTPUT: output, ...env },
    });
    assert.ifError(result.error);
    return { ...result, output: fs.readFileSync(output, 'utf8') };
  }
  return { repo, output, git, commit, run };
}

function selected(result, value) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.output, `existing=retained\nvisual=${value}\n`);
}

function rejected(result) {
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Qualification scope classification failed:/);
  assert.equal(result.output, 'existing=retained\n', 'failure must not publish a false scope decision');
}

test('Canvas module alone selects visual qualification through the CI executable', (t) => {
  const f = fixture(t);
  const base = f.git('rev-parse', 'HEAD');
  const canvas = 'src/venue/read-only-venue-canvas-surface.js';
  f.commit(canvas);
  assert.equal(f.git('diff', '--name-only', base, 'HEAD'), canvas);
  selected(f.run({ PR_BASE_SHA: base }), true);
  selected(f.run({ EVENT_NAME: 'push', PR_BASE_SHA: 'invalid-unused', PUSH_BEFORE_SHA: base }), true);
});

test('all retained trigger families and exact classifier inputs qualify isolated changes', async (t) => {
  const f = fixture(t);
  const examples = [
    'docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_CANDIDATE_QUALIFICATION_TRIGGER_0_1_0.md',
    'views/nested/page.ejs', 'public/nested/image.svg', 'src/input.css', 'src/app.js',
    'routes/page.js', 'src/routes/page.js', 'src/content/page.js', 'src/onboarding/page.js',
    'src/moderation/page.js', 'src/payments/page.js',
    'src/venue/native-authoring-surface.js', 'src/venue/visual-authoring-session.js',
    'src/venue/source-authoring.js', 'src/venue/source-authoring-session.js',
    'src/venue/source-authoring-surface.js', 'src/venue/context.js', 'src/venue/package.js',
    'src/venue/package-selection.js', 'src/venue/reference/nested/site.js',
    'src/venue/turnkey-studio.js', 'src/venue/managed-assets.js',
    'src/venue/turnkey-workspace.js', 'src/venue/turnkey-readiness.js',
    'scripts/capture-new-visual.js', 'scripts/capture-current-contract-visual.js',
    'scripts/capture-issue-130-presentation-review.js', 'scripts/run-current-visual-contract.js',
    'scripts/assemble-current-visual-evidence.js', 'config/visual-qualification-contract.json',
    'config/issue-130-presentation-review.json', 'test/visual-qualification-contract.test.js',
    'test/issue-130-presentation-quality.test.js', 'test/turnkey-release.test.js',
    'test/support/nested/visual-helper.js', 'test/support/hv6-native-editor-fixture.js',
    'test/support/source-authoring-fixture.js', '.github/workflows/ci.yml',
    'scripts/classify-qualification-scope.js', 'test/qualification-scope-classifier.test.js',
  ];
  for (const file of examples) {
    await t.test(file, () => {
      const base = f.git('rev-parse', 'HEAD');
      f.commit(file);
      assert.equal(f.git('diff', '--name-only', base, 'HEAD'), file);
      selected(f.run({ PR_BASE_SHA: base, PUSH_BEFORE_SHA: 'invalid-unused' }), true);
    });
  }
});

test('documentation, unrelated paths, exact-name near misses and empty diffs retain false selection', (t) => {
  const f = fixture(t);
  for (const file of ['docs/ordinary.md', 'scripts/ordinary.js', '.github/workflows/other.yml',
    'src/venue/read-only-venue-canvas-surfaceXjs', 'src/venue/read-only-venue-canvas-surface.js.bak',
    'scripts/capture-new-visualXjs', 'test/support/helper.js']) {
    const base = f.git('rev-parse', 'HEAD');
    f.commit(file);
    selected(f.run({ PR_BASE_SHA: base }), false);
  }
  selected(f.run({ PR_BASE_SHA: f.git('rev-parse', 'HEAD') }), false);
});

test('missing and all-zero bases use HEAD parent for both event types', (t) => {
  const f = fixture(t);
  f.commit('src/venue/read-only-venue-canvas-surface.js');
  for (const event of ['pull_request', 'push']) {
    for (const base of ['', '0'.repeat(40)]) {
      selected(f.run({ EVENT_NAME: event, PR_BASE_SHA: base, PUSH_BEFORE_SHA: base }), true);
    }
  }
  f.commit('docs/next.md');
  selected(f.run(), false);
});

test('manual dispatch requires visual evidence without needing a repository or base', (t) => {
  const f = fixture(t, false);
  selected(f.run({ EVENT_NAME: 'workflow_dispatch', PR_BASE_SHA: 'invalid', PUSH_BEFORE_SHA: 'invalid' }), true);
});

test('invalid invocation, unavailable revisions and output failures cannot publish false', (t) => {
  const f = fixture(t);
  rejected(f.run()); // Initial commit has no parent for fallback.
  for (const env of [
    { EVENT_NAME: '' }, { EVENT_NAME: 'schedule' }, { GITHUB_OUTPUT: '' },
    { GITHUB_OUTPUT: f.repo }, { PR_BASE_SHA: '--output=bad' },
    { PR_BASE_SHA: 'f'.repeat(40) }, { PR_BASE_SHA: f.git('rev-parse', 'HEAD:README.md') },
  ]) rejected(f.run(env));
  rejected(f.run({ EVENT_NAME: 'workflow_dispatch' }, ['--unexpected']));
  rejected(f.run({ EVENT_NAME: 'workflow_dispatch', GITHUB_OUTPUT: f.repo }));
  const missing = fixture(t, false);
  rejected(missing.run({ PR_BASE_SHA: f.git('rev-parse', 'HEAD') }));
});

test('deletion and rename out of a visual path still select visual evidence', (t) => {
  const f = fixture(t);
  const file = 'src/venue/read-only-venue-canvas-surface.js';
  let base = f.commit(file);
  f.git('mv', file, 'moved.txt');
  f.git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'rename');
  selected(f.run({ PR_BASE_SHA: base }), true);
  base = f.commit(file);
  f.git('rm', file);
  f.git('-c', 'commit.gpgsign=false', 'commit', '-qm', 'delete');
  selected(f.run({ PR_BASE_SHA: base }), true);
});

test('Git quoted paths retain spaces, unicode and POSIX newline characters', (t) => {
  const f = fixture(t);
  const files = ['views/nested/café view.ejs'];
  if (process.platform !== 'win32') files.push('views/line\nbreak.ejs');
  for (const file of files) {
    const base = f.git('rev-parse', 'HEAD');
    f.commit(file);
    selected(f.run({ PR_BASE_SHA: base }), true);
  }
});
