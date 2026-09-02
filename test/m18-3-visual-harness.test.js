'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const capture = fs.readFileSync(path.join(ROOT, 'scripts', 'capture-m18-3-visual.js'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
const visualContract = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'visual-qualification-contract.json'), 'utf8'));

test('M18.3 freezes seven scenarios at the accepted six widths', () => {
  assert.match(capture, /Object\.freeze\(\[360, 390, 768, 1024, 1440, 1600\]\)/);
  for (const id of [
    'home-signed-out',
    'wall-signed-out',
    'wall-authenticated',
    'wall-private-expanded',
    'pay-signed-out',
    'pay-authenticated-ready',
    'pay-authenticated-receipt',
  ]) assert.match(capture, new RegExp(`id: '${id}'`));
  assert.match(capture, /WIDTHS\.length \* SCENARIOS\.length/);
});

test('M18.3 harness is fail-closed for mutations, Hive RPC, outbound network, and Keychain', () => {
  assert.match(capture, /M18_3_VISUAL_MUTATION_FORBIDDEN/);
  assert.match(capture, /M18\.3 visual fixture forbids Hive RPC/);
  assert.match(capture, /reason: 'outbound-origin'/);
  assert.match(capture, /reason: 'mutation-method'/);
  assert.match(capture, /M18\.3 visual qualification forbids Keychain signing/);
  assert.match(capture, /assert\.deepEqual\(current\.mutationAttempts, \[\]\)/);
  assert.match(capture, /assert\.deepEqual\(current\.rpcPool\.calls, \[\]\)/);
});

test('M18.3 image readiness eagerly triggers lazy images and fails within a bounded wait', () => {
  assert.match(capture, /const IMAGE_READY_TIMEOUT_MS = 5000;/);
  assert.match(capture, /image\.loading = 'eager'/);
  assert.match(capture, /Image readiness timed out/);
  assert.match(capture, /Image failed to load/);
  assert.match(capture, /image\.naturalWidth === 0/);
  assert.match(capture, /Image readiness failed/);
});

test('M18.3 full-page capture scroll-walks the document before screenshotting', () => {
  assert.match(capture, /async function paintFullDocument\(page\)/);
  assert.match(capture, /Math\.floor\(globalThis\.innerHeight \* 0\.75\)/);
  assert.match(capture, /await paintFullDocument\(page\)/);
  assert.match(capture, /pageEvidence\.paintWalk = paintEvidence/);
  assert.match(capture, /assert\.equal\(paintEvidence\.finalScrollY, 0/);
  assert.match(capture, /page\.screenshot\(\{ path: filename, fullPage: true/);
});

test('M18.3 harness gates responsive geometry and long receipt proof', () => {
  assert.match(capture, /horizontalOverflow <= 1/);
  assert.match(capture, /outsideFocusables/);
  assert.match(capture, /undersizedButtonsAndSummaries/);
  assert.match(capture, /footerLineBottom <= footer\.navigationTop \+ 1/);
  assert.match(capture, /receiptOverflow <= 1/);
  assert.match(capture, /'a'\.repeat\(80\)/);
  assert.match(capture, /'b'\.repeat\(64\)/);
});

test('M18.2 and M18.3 remain distinct retained machine suites in current visual qualification', () => {
  assert.equal(packageJson.scripts['test:visual:m18-3'], 'node scripts/capture-m18-3-visual.js');
  assert.equal(packageJson.scripts['test:visual:m18'], 'node scripts/capture-m18-visual.js');
  const m18 = visualContract.machineSuites.find(({ id }) => id === 'm18-shell');
  const m183 = visualContract.machineSuites.find(({ id }) => id === 'm18-wall-pay');
  assert.ok(m18);
  assert.ok(m183);
  assert.deepEqual(m18.command, ['npm', 'run', 'test:visual:m18']);
  assert.equal(m18.outputEnv, 'M18_VISUAL_OUTPUT');
  assert.equal(m18.outputDir, 'm18-visual');
  assert.deepEqual(m183.command, ['npm', 'run', 'test:visual:m18-3']);
  assert.equal(m183.outputEnv, 'M18_3_VISUAL_OUTPUT');
  assert.equal(m183.outputDir, 'm18-3-visual');
  assert.match(workflow, /UI\/UX current-contract evidence \(Ubuntu \/ pinned Chromium\)/);
  assert.match(workflow, /node scripts\/run-current-visual-contract\.js/);
});
