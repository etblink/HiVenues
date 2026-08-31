'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { NEXT_SUCCESSOR_OPERATION, assertCurrentRoutingBlock } = require('../scripts/release-coherence/current-routing');

const root = path.join(__dirname, '..');
function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), 'utf8'); }

test('living current-routing blocks agree on exact identity, frozen preregistration, and one authoritative next operation', () => {
  const readme = assertCurrentRoutingBlock('README.md');
  const docsIndex = assertCurrentRoutingBlock('docs/README.md');
  const roadmap = assertCurrentRoutingBlock('docs/ROADMAP.md');

  for (const block of [readme, docsIndex, roadmap]) {
    assert.match(block, new RegExp(`^NEXT_OPERATION = ${NEXT_SUCCESSOR_OPERATION}$`, 'm'));
    assert.match(block, /^HV8_REFERENCE_DEPLOYMENT_EXACT_IDENTITY_OBSERVATION = COMPLETE__PASS$/m);
    assert.match(block, /^HV8_READINESS_IDENTITY_HOLD = CLEARED$/m);
    assert.match(block, /^HV8_DEPLOYMENT_PREREGISTRATION = FROZEN_0_1_0$/m);
    assert.match(block, /^HV8_DEPLOY_CANDIDATE = NOT_YET_FROZEN$/m);
    assert.match(block, /^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m);
  }

  assert.match(readme, /^POST_HV7_SEQUENCING_DECISION = PROJECT_LEAD_ACCEPTED$/m);
  assert.match(readme, /^SELECTED_NEXT_LANE = FOURTH_STREET_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE$/m);
  assert.match(docsIndex, /^HV8_CURRENT_RUNNING_COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e$/m);
  assert.match(docsIndex, /^HV8_CURRENT_RUNNING_TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c$/m);
  assert.match(roadmap, /^SECOND_REAL_VENUE_AUTHORIZED = NO$/m);
});

test('current sequencing advances without rewriting preserved HV7, Post-HV7, or audit-time hold history', () => {
  const requirements = read('docs/HV7_SECOND_VENUE_NOMINEE_JUNIPER_WORKS_REQUIREMENTS_0_1_0.md');
  const confrontation = read('docs/HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION_0_1_0.md');
  const acceptance = read('docs/HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR_ACCEPTANCE_0_1_0.md');
  const neutralPostHv7 = read('docs/POST_HV7_JUNIPER_REPAIR_LIVING_ROUTING_RECONCILIATION_0_1_0.md');
  const decision = read('docs/POST_HV7_SEQUENCING_DECISION_0_1_0.md');
  const postHv7Routing = read('docs/POST_HV7_SEQUENCING_LIVING_ROUTING_RECONCILIATION_0_1_0.md');
  const hv8Audit = read('docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_READINESS_READ_ONLY_AUDIT_0_1_0.md');
  const hv8OldRouting = read('docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_READINESS_LIVING_ROUTING_RECONCILIATION_0_1_0.md');
  const identity = read('docs/HV8_REFERENCE_DEPLOYMENT_EXACT_IDENTITY_OBSERVATION_0_1_0.md');
  const preregDecision = read('docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_PREREGISTRATION_DECISION_0_1_0.md');
  const prereg = read('docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_DEPLOYMENT_PREREGISTRATION_0_1_0.md');
  const current = read('docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_PREREGISTRATION_LIVING_ROUTING_RECONCILIATION_0_1_0.md');

  assert.match(requirements, /^HV7_REQUIREMENT_COUNT = 24$/m);
  assert.match(confrontation, /HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION/);
  assert.match(acceptance, /^FINAL_REQUIREMENTS_PASS = 24$/m);
  assert.match(neutralPostHv7, /^NEXT_OPERATION = POST_HV7_SEQUENCING_DECISION__READ_ONLY$/m);
  assert.match(decision, /^POST_HV7_SEQUENCING_DECISION = PROJECT_LEAD_ACCEPTED$/m);
  assert.match(postHv7Routing, /^NEXT_OPERATION = HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_READINESS__READ_ONLY_AUDIT$/m);
  assert.match(hv8Audit, /^HV8_DEPLOYMENT_PREREGISTRATION_READINESS = HOLD$/m);
  assert.match(hv8OldRouting, /^NEXT_OPERATION = HV8_REFERENCE_DEPLOYMENT_EXACT_IDENTITY_OBSERVATION__READ_ONLY$/m);
  assert.match(identity, /^HV8_READINESS_IDENTITY_HOLD = CLEARED$/m);
  assert.match(preregDecision, /^HV8_DEPLOYMENT_PREREGISTRATION = AUTHORIZED$/m);
  assert.match(prereg, /^DEPLOY_CANDIDATE = NOT_YET_FROZEN$/m);
  assert.match(current, new RegExp(`^NEXT_OPERATION = ${NEXT_SUCCESSOR_OPERATION}$`, 'm'));
  assert.match(current, /^PRODUCTION_MUTATION = NOT_AUTHORIZED$/m);
});

test('selected foundation has no GrapesJS dependency or hidden evaluation package', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies?.grapesjs, undefined);
  assert.equal(pkg.devDependencies?.grapesjs, undefined);
  assert.equal(fs.existsSync(path.join(root, 'test/support/hv6-grapesjs-eval-package/package.json')), false);
});
