'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  NEXT_SUCCESSOR_OPERATION,
  assertCurrentRoutingBlock,
} = require('../scripts/release-coherence/current-routing');

const root = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('living current-routing blocks agree on accepted HV-7 synthetic Tier-A state', () => {
  const readme = assertCurrentRoutingBlock('README.md');
  const docsIndex = assertCurrentRoutingBlock('docs/README.md');
  const roadmap = assertCurrentRoutingBlock('docs/ROADMAP.md');

  assert.equal(NEXT_SUCCESSOR_OPERATION, 'POST_HV7_SEQUENCING_DECISION__READ_ONLY');
  assert.match(readme, /^HV7_CANONICAL_IMPLEMENTATION = 25b8c79c9016275375902cece355ae78ce75a341$/m);
  assert.match(readme, /^HV7_CANONICAL_TREE = af5b2d780040aa28eb0ec0db7c85177fdd80fcea$/m);
  assert.match(docsIndex, /^HV7_PR91 = CLOSED__UNMERGED__EXACT_QUALIFIED_TREE_TRANSFERRED$/m);
  assert.match(roadmap, /^SECOND_REAL_VENUE_AUTHORIZED = NO$/m);
});

test('acceptance and current reconciliation advance routing without rewriting preserved history', () => {
  const decision = read('docs/POST_HV6_SEQUENCING_DECISION_0_1_0.md');
  const historicalPreregistration = read('docs/HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT_PREREGISTRATION_0_1_0.md');
  const amendment = read('docs/HV7_SECOND_VENUE_CANDIDATE_EVIDENCE_MODEL_AMENDMENT_0_1_1.md');
  const requirements = read('docs/HV7_SECOND_VENUE_NOMINEE_JUNIPER_WORKS_REQUIREMENTS_0_1_0.md');
  const postFreeze = read('docs/HV7_JUNIPER_WORKS_POST_FREEZE_LIVING_ROUTING_RECONCILIATION_0_1_0.md');
  const confrontation = read('docs/HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION_0_1_0.md');
  const preAcceptance = read('docs/HV7_JUNIPER_WORKS_PRE_ACCEPTANCE_LIVING_ROUTING_RECONCILIATION_0_1_0.md');
  const acceptance = read('docs/HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR_ACCEPTANCE_0_1_0.md');
  const current = read('docs/POST_HV7_JUNIPER_REPAIR_LIVING_ROUTING_RECONCILIATION_0_1_0.md');

  assert.match(decision, /^SELECTED_NEXT_LANE = REAL_ISOLATED_SECOND_VENUE_PILOT$/m);
  assert.match(historicalPreregistration, /^SPECIFIC_REAL_VENUE = UNSELECTED$/m);
  assert.match(amendment, /^HV7_SECOND_VENUE_CANDIDATE = REAL_OR_SYNTHETIC_ALLOWED$/m);
  assert.match(requirements, /^SECOND_VENUE_NOMINEE = JUNIPER_WORKS_COOPERATIVE$/m);
  assert.match(requirements, /^HV7_REQUIREMENT_COUNT = 24$/m);
  assert.match(postFreeze, /^NEXT_OPERATION = HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION__READ_ONLY$/m);
  assert.match(confrontation, /HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION/);
  assert.match(preAcceptance, /^PLATFORM_GENERALITY_REPAIR_IMPLEMENTATION = CANDIDATE_IMPLEMENTED__PRE_ACCEPTANCE$/m);
  assert.match(preAcceptance, /^NEXT_OPERATION = HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR__PROJECT_LEAD_ACCEPTANCE_DECISION$/m);

  assert.match(acceptance, /^STATUS = PROJECT_LEAD_ACCEPTED$/m);
  assert.match(acceptance, /^FINAL_REQUIREMENTS_PASS = 24$/m);
  assert.match(acceptance, /^EVIDENCE_TIER = TIER_A_PRODUCT_AND_ARCHITECTURE$/m);
  assert.match(current, /^PLATFORM_GENERALITY_REPAIR = PROJECT_LEAD_ACCEPTED$/m);
  assert.match(current, /^NEXT_OPERATION = POST_HV7_SEQUENCING_DECISION__READ_ONLY$/m);
  assert.match(current, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m);
});

test('selected foundation has no GrapesJS dependency or hidden evaluation package', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies?.grapesjs, undefined);
  assert.equal(pkg.devDependencies?.grapesjs, undefined);
  assert.equal(fs.existsSync(path.join(root, 'test/support/hv6-grapesjs-eval-package/package.json')), false);
});
