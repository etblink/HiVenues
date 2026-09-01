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
function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), 'utf8'); }

test('living current-routing blocks agree on current accepted invariants and one product-valued next operation', () => {
  const readme = assertCurrentRoutingBlock('README.md');
  const docsIndex = assertCurrentRoutingBlock('docs/README.md');
  const roadmap = assertCurrentRoutingBlock('docs/ROADMAP.md');

  for (const block of [readme, docsIndex, roadmap]) {
    assert.match(block, new RegExp(`^NEXT_OPERATION = ${NEXT_SUCCESSOR_OPERATION}$`, 'm'));
    assert.match(block, /^SUCCESSOR_FOUNDATIONS = HV1_THROUGH_HV6_ACCEPTED$/m);
    assert.match(block, /^HV7_SECOND_VENUE_NOMINEE_STATUS = VALIDATED__SYNTHETIC_TIER_A$/m);
    assert.match(block, /^HV7_FROZEN_REQUIREMENT_ADJUDICATION = PASS__24_OF_24$/m);
    assert.match(block, /^HV8_CURRENT_RUNNING_COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e$/m);
    assert.match(block, /^HV8_CURRENT_RUNNING_TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c$/m);
    assert.match(block, /^HV8_PHASE_A_READ_ONLY_PREFLIGHT = PASS$/m);
    assert.match(block, /^HV8_PRODUCTION_CAPABILITY_STATE = OBSERVED__PAYMENTS_ONBOARDING_MODERATION_ACTIVE$/m);
    assert.match(block, /^HV8_REFERENCE_DEPLOYMENT_CONVERGENCE = TECHNICALLY_QUALIFIED__PRODUCTION_TRANSITION_WITHHELD$/m);
    assert.match(block, /^VENUE_HOME_COMMUNITY_PULSE = ACCEPTED$/m);
    assert.match(block, /^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m);
    assert.match(block, /^PUBLIC_PRODUCTION_AUTHORING = NOT_AUTHORIZED$/m);
  }
});

test('current branch retains governing evidence while completed product slices move into current accepted state', () => {
  const requirements = read('docs/HV7_SECOND_VENUE_NOMINEE_JUNIPER_WORKS_REQUIREMENTS_0_1_0.md');
  const acceptance = read('docs/HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR_ACCEPTANCE_0_1_0.md');
  const preregistration = read('docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_DEPLOYMENT_PREREGISTRATION_0_1_0.md');
  const candidateAcceptance = read('docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_CANDIDATE_ACCEPTANCE_0_1_0.md');
  const readme = read('README.md');
  const docsIndex = read('docs/README.md');
  const roadmap = read('docs/ROADMAP.md');

  assert.match(requirements, /^HV7_REQUIREMENT_COUNT = 24$/m);
  assert.match(acceptance, /^FINAL_REQUIREMENTS_PASS = 24$/m);
  assert.match(preregistration, /^PRODUCTION_MUTATION = NOT_AUTHORIZED$/m);
  assert.match(candidateAcceptance, /^DEPLOY_CANDIDATE = FROZEN$/m);
  assert.match(candidateAcceptance, /^DEPLOYMENT_AUTHORIZED = NO$/m);
  assert.match(docsIndex, /recoverable from Git history/i);
  assert.match(readme, /community pulse is accepted/i);
  assert.match(roadmap, /ABILITY_TO_DEPLOY != REASON_TO_DEPLOY/);
  assert.match(roadmap, /PROFILE_RECENT_ACTIVITY__PRODUCT_BUILD/);
});

test('selected foundation has no GrapesJS dependency or hidden evaluation package', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies?.grapesjs, undefined);
  assert.equal(pkg.devDependencies?.grapesjs, undefined);
  assert.equal(fs.existsSync(path.join(root, 'test/support/hv6-grapesjs-eval-package/package.json')), false);
});