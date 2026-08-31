'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { NEXT_SUCCESSOR_OPERATION, assertCurrentRoutingBlock } = require('../scripts/release-coherence/current-routing');

const root = path.join(__dirname, '..');
function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), 'utf8'); }

test('living current-routing blocks agree on accepted Post-HV7 sequencing and HV8 read-only audit', () => {
  const readme = assertCurrentRoutingBlock('README.md');
  const docsIndex = assertCurrentRoutingBlock('docs/README.md');
  const roadmap = assertCurrentRoutingBlock('docs/ROADMAP.md');

  assert.equal(NEXT_SUCCESSOR_OPERATION, 'HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_READINESS__READ_ONLY_AUDIT');
  assert.match(readme, /^POST_HV7_SEQUENCING_DECISION = PROJECT_LEAD_ACCEPTED$/m);
  assert.match(readme, /^SELECTED_NEXT_LANE = FOURTH_STREET_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE$/m);
  assert.match(docsIndex, /^PROPOSED_NEXT_MILESTONE = HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_READINESS$/m);
  assert.match(roadmap, /^SECOND_REAL_VENUE_AUTHORIZED = NO$/m);
});

test('current sequencing advances without rewriting preserved HV7 history', () => {
  const requirements = read('docs/HV7_SECOND_VENUE_NOMINEE_JUNIPER_WORKS_REQUIREMENTS_0_1_0.md');
  const confrontation = read('docs/HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION_0_1_0.md');
  const acceptance = read('docs/HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR_ACCEPTANCE_0_1_0.md');
  const neutralPostHv7 = read('docs/POST_HV7_JUNIPER_REPAIR_LIVING_ROUTING_RECONCILIATION_0_1_0.md');
  const decision = read('docs/POST_HV7_SEQUENCING_DECISION_0_1_0.md');
  const current = read('docs/POST_HV7_SEQUENCING_LIVING_ROUTING_RECONCILIATION_0_1_0.md');

  assert.match(requirements, /^HV7_REQUIREMENT_COUNT = 24$/m);
  assert.match(confrontation, /HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION/);
  assert.match(acceptance, /^FINAL_REQUIREMENTS_PASS = 24$/m);
  assert.match(neutralPostHv7, /^NEXT_OPERATION = POST_HV7_SEQUENCING_DECISION__READ_ONLY$/m);
  assert.match(decision, /^POST_HV7_SEQUENCING_DECISION = PROJECT_LEAD_ACCEPTED$/m);
  assert.match(decision, /^NEXT_OPERATION = HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_READINESS__READ_ONLY_AUDIT$/m);
  assert.match(current, /^NEXT_OPERATION = HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_READINESS__READ_ONLY_AUDIT$/m);
  assert.match(current, /^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m);
});

test('selected foundation has no GrapesJS dependency or hidden evaluation package', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies?.grapesjs, undefined);
  assert.equal(pkg.devDependencies?.grapesjs, undefined);
  assert.equal(fs.existsSync(path.join(root, 'test/support/hv6-grapesjs-eval-package/package.json')), false);
});
