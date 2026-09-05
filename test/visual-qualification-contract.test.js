'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'visual-qualification-contract.json'), 'utf8'));
const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

function unique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

test('Issue146 adds exactly four synthetic edit outcomes while retaining the 14-suite envelope', () => {
  assert.equal(contract.machineSuites.length, 14);
  assert.equal(contract.reviewScenarios.length, 16);
  const states = contract.reviewScenarios.filter(x => x.mode === 'canvas-edit');
  assert.deepEqual(states.map(x => [x.id, x.outcome, x.viewport.width]), [
    ['juniper-canvas-edit-desktop', 'ready', 1440], ['juniper-canvas-preview-mobile', 'success', 390],
    ['juniper-canvas-invalid-mobile', 'invalid', 390], ['juniper-canvas-conflict-desktop', 'conflict', 1440],
  ]);
  for (const state of states) {
    assert.equal(state.fixture, 'juniper');
    assert.deepEqual(state.selection, { blockId: 'home.hero', fieldId: 'lede' });
  }
  assert.equal(contract.reviewScenarios.filter(x => x.mode === 'canvas').length, 2);
});

test('current visual qualification contract is explicit and machine-readable', () => {
  assert.equal(contract.schemaVersion, 1);
  assert.equal(contract.contractId, 'HV_CURRENT_VISUAL_QUALIFICATION_V1');
  assert.equal(contract.baseline.runNumber, 508);
  assert.equal(contract.baseline.pngCount, 177);
  assert.equal(contract.baseline.uploadedBytes, 56195537);
  assert.ok(contract.execution.maxConcurrency >= 2 && contract.execution.maxConcurrency <= 4);
  assert.deepEqual(contract.breakpointContract.semanticTransitions, [640, 1200]);
  assert.ok(contract.machineSuites.length >= 10);
  unique(contract.machineSuites.map(({ id }) => id), 'machine suite ids');
  unique(contract.machineSuites.map(({ outputDir }) => outputDir), 'machine suite output directories');
  for (const suite of contract.machineSuites) {
    assert.ok(Array.isArray(suite.command) && suite.command.length >= 2, suite.id);
    assert.ok(Array.isArray(suite.invariants) && suite.invariants.length > 0, suite.id);
    assert.ok(suite.outputDir && suite.outputEnv, suite.id);
    if (suite.command[0] === 'npm' && suite.command[1] === 'run') {
      assert.ok(packageJson.scripts[suite.command[2]], `Missing npm script ${suite.command[2]}`);
    } else if (suite.command[0] === 'node') {
      assert.ok(fs.existsSync(path.join(ROOT, suite.command[1])), `Missing node script ${suite.command[1]}`);
    } else {
      assert.fail(`Unsupported visual suite command: ${suite.command.join(' ')}`);
    }
  }
  assert.deepEqual(contract.reviewRules, {
    screenshotMode: 'viewport-only',
    fullPageScreenshotsAllowed: false,
    maxReviewHeight: 1100,
    note: contract.reviewRules.note,
  });
  assert.match(contract.reviewRules.note, /Historical full-page PNGs are ephemeral/i);
});

test('historical HV-6 evidence is explicitly superseded by stronger current authoring evidence', () => {
  assert.equal(contract.machineSuites.some(({ id }) => id === 'hv6-native'), false);
  const hv6 = contract.supersededHistoricalSuites.find(({ id }) => id === 'hv6-native');
  assert.ok(hv6);
  assert.deepEqual(hv6.replacements, ['source-authoring', 'second-venue', 'current-viewport-review']);
  assert.match(hv6.reason, /synthetic Juniper/i);
  assert.match(hv6.reason, /4th Street Bar/i);
  assert.equal(contract.currentReviewOracle.id, 'current-viewport-review');
  assert.deepEqual(contract.currentReviewOracle.command, ['node', 'scripts/capture-current-contract-visual.js']);
  assert.doesNotMatch(workflow, /test:visual:hv6-native/);
});

test('human review set is real-viewport, bounded, representative, and synthetic for generic identity editing', () => {
  assert.ok(contract.reviewScenarios.length >= 10 && contract.reviewScenarios.length <= 20);
  unique(contract.reviewScenarios.map(({ id }) => id), 'review scenario ids');
  for (const scenario of contract.reviewScenarios) {
    assert.ok(scenario.viewport.width >= 320, scenario.id);
    assert.ok(scenario.viewport.height > 0 && scenario.viewport.height <= contract.reviewRules.maxReviewHeight, scenario.id);
    assert.ok(['application', 'source-authoring'].includes(scenario.kind), scenario.id);
  }
  assert.ok(contract.reviewScenarios.some(({ id }) => id === 'home-mobile'));
  assert.ok(contract.reviewScenarios.some(({ id }) => id === 'home-desktop'));
  assert.ok(contract.reviewScenarios.some(({ id }) => id === 'community-mobile'));
  assert.ok(contract.reviewScenarios.some(({ id }) => id === 'threads-mobile'));
  assert.ok(contract.reviewScenarios.some(({ id, authenticated }) => id === 'pay-mobile' && authenticated === true));
  const fourthStreet = contract.reviewScenarios.find(({ id }) => id === 'fourth-street-authoring-mobile');
  const juniper = contract.reviewScenarios.find(({ id }) => id === 'juniper-authoring-mobile');
  assert.equal(fourthStreet.fixture, 'fourth-street');
  assert.equal(juniper.fixture, 'juniper');
});

test('accessibility findings are classified rather than hidden behind PASS', () => {
  const findings = contract.accessibilityContract.classifiedNonBlocking;
  assert.deepEqual(contract.accessibilityContract.blockingImpacts, ['serious', 'critical']);
  assert.deepEqual(
    findings.map(({ suite, id, impact }) => ({ suite, id, impact })),
    [
      { suite: 'wall-inbox', id: 'page-has-heading-one', impact: 'moderate' },
      { suite: 'source-authoring', id: 'landmark-unique', impact: 'moderate' },
    ],
  );
  assert.ok(findings.every(({ reason }) => reason.length >= 40));
});

test('workflow preserves universal qualification and deliberate full-path semantics', () => {
  assert.match(workflow, /matrix:[\s\S]*ubuntu-latest[\s\S]*windows-latest/);
  assert.match(workflow, /Run deterministic quality gate[\s\S]*npm run check/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /node scripts\/run-current-visual-contract\.js/);
  assert.match(workflow, /node scripts\/capture-current-contract-visual\.js/);
  assert.match(workflow, /node scripts\/assemble-current-visual-evidence\.js/);
  assert.match(workflow, /artifacts\/current-visual-review/);
  assert.doesNotMatch(workflow, /path:\s*artifacts\s*$/m);
  assert.match(workflow, /Live Hive read-only smoke/);
  assert.match(workflow, /if: github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow, /HIVE_WRITE_MODE: disabled/);
  assert.match(workflow, /npm run smoke:live/);
});
