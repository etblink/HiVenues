'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const { createUx1cVisualFixture } = require('./support/ux-1c-fixture');

const ROOT = path.join(__dirname, '..');
const capture = fs.readFileSync(path.join(ROOT, 'scripts', 'capture-ux-1c-visual.js'), 'utf8');
const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const visualContract = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'visual-qualification-contract.json'), 'utf8'));

test('UX-1C visual fixture is authenticated, deterministic, and mutation-fail-closed', async () => {
  const fixture = createUx1cVisualFixture();
  assert.equal(fixture.account, 'etblink');
  assert.equal(fixture.config.hive.writeMode, 'beta');
  assert.equal(fixture.config.hive.signerMode, 'keychain');
  assert.equal(fixture.config.hive.v1SelfSigningEnabled, false);
  const page = await request(fixture.app).get('/post/etblink/welcome-fourth-street-bar').set('cookie', `hive_bar_session=${fixture.token}`).expect(200);
  assert.equal((page.text.match(/data-vote-control/g) || []).length, 2);
  assert.match(page.text, /\/js\/vote-presentation\.js\?v=[0-9a-f]{64}/);
  assert.match(page.text, /data-vote-open="upvote"/);
  assert.match(page.text, /data-vote-open="downvote"/);
  assert.match(page.text, /data-vote-dialog/);
  assert.match(page.text, /type="range"\s+name="percent"\s+value="100"/);
  await request(fixture.app).post('/api/social/preflight/vote').send({ author: 'etblink', permlink: 'welcome-fourth-street-bar', direction: 'upvote', percent: 50 }).expect(405)
    .expect(({ body }) => assert.equal(body.error.code, 'UX_1C_VISUAL_MUTATION_FORBIDDEN'));
  assert.deepEqual(fixture.mutationAttempts, [{ method: 'POST', path: '/api/social/preflight/vote' }]);
});

test('UX-1C pinned-Chromium contract covers neutral, contextual weighted directions, and repeated-form isolation', () => {
  assert.equal(packageJson.scripts['test:visual:ux-1c'], 'node scripts/capture-ux-1c-visual.js');
  assert.match(capture, /Object\.freeze\(\[390, 1440\]\)/);
  for (const scenario of ['root-neutral-100','root-upvote-50','root-downvote-25','comment-downvote-50-isolated']) assert.match(capture, new RegExp(scenario));
  assert.match(capture, /UX-1C visual qualification forbids Keychain signing/);
  assert.match(capture, /\[data-vote-open=/);
  assert.match(capture, /dialogOpen/);
  assert.match(capture, /page\.keyboard\.press\('ArrowLeft'\)/);
  assert.match(capture, /otherForms/);
  assert.match(capture, /tapTargetErrors/);
  assert.match(capture, /triggerAccessibilityErrors/);
  assert.match(capture, /dialogAccessibilityErrors/);
  assert.match(capture, /statusOwnershipErrors/);
  assert.match(capture, /assert\.deepEqual\(fixture\.mutationAttempts, \[\]\)/);
  assert.match(capture, /assert\.equal\(evidence\.scrollY, 0\)/);
});

test('UX-1B and UX-1C remain distinct retained machine oracles without serial-order coupling', () => {
  const job = workflow.match(/  visual-acceptance:\n[\s\S]*?(?=\n  live-read-smoke:)/)?.[0];
  const ux1b = visualContract.machineSuites.find(({ id }) => id === 'composer');
  const ux1c = visualContract.machineSuites.find(({ id }) => id === 'weighted-voting');
  assert.ok(job);
  assert.ok(ux1b);
  assert.ok(ux1c);
  assert.deepEqual(ux1b.command, ['npm', 'run', 'test:visual:ux-1b']);
  assert.deepEqual(ux1c.command, ['npm', 'run', 'test:visual:ux-1c']);
  assert.equal(ux1b.outputEnv, 'UX_1B_VISUAL_OUTPUT');
  assert.equal(ux1c.outputEnv, 'UX_1C_VISUAL_OUTPUT');
  assert.notEqual(ux1b.outputDir, ux1c.outputDir);
  assert.match(job, /npx --no-install playwright install --with-deps chromium/);
  assert.match(job, /node scripts\/run-current-visual-contract\.js/);
  assert.match(job, /current-visual-evidence-\$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
  assert.match(job, /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
});
