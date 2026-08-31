'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const CURRENT_START = '<!-- HV6_CURRENT_ROUTING_START -->';
const CURRENT_END = '<!-- HV6_CURRENT_ROUTING_END -->';
const SECOND_VENUE_ROUTE = /^(?:SECOND_REAL_VENUE_AUTHORIZED|REAL_SECOND_VENUE_AUTHORIZED) = NO$/gm;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function currentRouting(relativePath) {
  const source = read(relativePath);
  const starts = source.split(CURRENT_START).length - 1;
  const ends = source.split(CURRENT_END).length - 1;
  assert.equal(starts, 1, `${relativePath} must contain exactly one current-routing start marker`);
  assert.equal(ends, 1, `${relativePath} must contain exactly one current-routing end marker`);
  const start = source.indexOf(CURRENT_START) + CURRENT_START.length;
  const end = source.indexOf(CURRENT_END, start);
  assert.ok(end > start, `${relativePath} current-routing markers must be ordered`);
  return source.slice(start, end);
}

function assertCurrentPostHv6Block(relativePath) {
  const block = currentRouting(relativePath);
  for (const [pattern, message] of [
    [/^HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION = ACCEPTED$/m, 'HV-6 must be accepted'],
    [/^HV6_PHASE_B_TECHNOLOGY_SELECTION = COMPLETE$/m, 'Phase B must remain complete'],
    [/^SELECTED_ADAPTER = NATIVE_EXISTING_STACK$/m, 'native existing stack must remain selected'],
    [/^HV6_PHASE_C_IMPLEMENTATION = ACCEPTED$/m, 'Phase C implementation must be accepted'],
    [/^POST_HV6_SEQUENCING_DECISION = PROJECT_LEAD_ACCEPTED$/m, 'Post-HV-6 sequencing must be accepted'],
    [/^SELECTED_NEXT_LANE = REAL_ISOLATED_SECOND_VENUE_PILOT$/m, 'real isolated second-venue pilot must be selected'],
    [/^PROPOSED_NEXT_MILESTONE = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT$/m, 'HV-7 pre-admission pilot must be proposed'],
    [/^NEXT_OPERATION = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT__PREREGISTRATION$/m, 'next product operation must be HV-7 preregistration'],
    [/^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'no post-HV-6 implementation may be implicitly authorized'],
    [/^GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED$/m, 'GrapesJS Core must remain evaluated and not selected'],
    [/^GRAPESJS_STUDIO_SDK = NOT_SELECTED$/m, 'Studio SDK must remain unselected'],
    [/^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m, 'live production mutation must remain unauthorized'],
    [/^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m, 'shared runtime tenancy must remain deferred'],
    [/^DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME$/m, 'isolated runtime must remain default'],
  ]) {
    assert.match(block, pattern, `${relativePath}: ${message}`);
  }

  const secondVenueMatches = [...block.matchAll(SECOND_VENUE_ROUTE)];
  assert.equal(secondVenueMatches.length, 1, `${relativePath}: exactly one recognized real-second-venue authorization key must remain NO`);

  assert.doesNotMatch(block, /^POST_HV6_SEQUENCING_DECISION = PENDING$/m, `${relativePath}: neutral pre-decision routing must be superseded`);
  assert.doesNotMatch(block, /^SELECTED_NEXT_LANE = NONE$/m, `${relativePath}: selected lane must not regress to NONE`);
  assert.doesNotMatch(block, /^NEXT_OPERATION = POST_HV6_SEQUENCING_DECISION__READ_ONLY$/m, `${relativePath}: read-only sequencing must not remain current after acceptance`);
  assert.doesNotMatch(block, /HV6_BOUNDED_DUAL_CANDIDATE_IMPLEMENTATION_AND_EVALUATION/, `${relativePath}: current routing must not route back to Phase B`);
  assert.doesNotMatch(block, /HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_AND_QUALIFICATION/, `${relativePath}: current routing must not route back to Phase C`);
  assert.doesNotMatch(block, /AUTHORIZED__NOT_YET_ACCEPTED/, `${relativePath}: current routing must not describe accepted Phase C as pending`);
  assert.doesNotMatch(block, /EVALUATION_CANDIDATE__NOT_SELECTED_PRODUCTION_DEPENDENCY/, `${relativePath}: GrapesJS must not reappear as an active candidate`);
  return block;
}

test('living current-routing blocks agree on accepted Post-HV-6 sequencing and bounded HV-7 preregistration', () => {
  const readme = assertCurrentPostHv6Block('README.md');
  const docsIndex = assertCurrentPostHv6Block('docs/README.md');
  const roadmap = assertCurrentPostHv6Block('docs/ROADMAP.md');

  assert.match(docsIndex, /^TECHNOLOGY_SELECTED = NATIVE_EXISTING_STACK$/m);
  assert.match(roadmap, /^TECHNOLOGY_SELECTED = NATIVE_EXISTING_STACK$/m);
  assert.match(roadmap, /^HV1_VENUE_CONTEXT_FOUNDATION = ACCEPTED$/m);
  assert.match(roadmap, /^HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION = ACCEPTED$/m);
  assert.match(roadmap, /^SECOND_REAL_VENUE_AUTHORIZED = NO$/m);
  assert.match(readme, /^POST_HV5_SEQUENCING_DECISION = HISTORICAL_ACCEPTED__SUPERSEDED_FOR_CURRENT_ROUTING$/m);
});

test('current routing is bound to the exact Post-HV-6 sequencing decision while preserving the prior neutral record as history', () => {
  const acceptance = read('docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_ACCEPTANCE_0_1_0.md');
  const priorReconciliation = read('docs/POST_HV6_LIVING_ROUTING_RECONCILIATION_0_1_0.md');
  const decision = read('docs/POST_HV6_SEQUENCING_DECISION_0_1_0.md');

  assert.match(acceptance, /^STATUS = PROJECT_LEAD_ACCEPTED$/m);
  assert.match(acceptance, /^ACCEPTED_IMPLEMENTATION_COMMIT = 3b774468ff1ed347a35500f2a29062a63ed62621$/m);
  assert.match(acceptance, /^SELECTED_ADAPTER = NATIVE_EXISTING_STACK$/m);
  assert.match(acceptance, /^REAL_SECOND_VENUE_ADMISSION = NOT_AUTHORIZED$/m);

  assert.match(priorReconciliation, /^OPERATION = POST_HV6_LIVING_ROUTING_RECONCILIATION$/m);
  assert.match(priorReconciliation, /^POST_HV6_SEQUENCING_DECISION = PENDING$/m);
  assert.match(priorReconciliation, /^REAL_SECOND_VENUE_AUTHORIZED = NO$/m);

  assert.match(decision, /^OPERATION = POST_HV6_SEQUENCING_DECISION__READ_ONLY$/m);
  assert.match(decision, /^CANONICAL_READ_ONLY_BASE_COMMIT = c43e18b7b02f77a71d019aeb3066d7726da0aa7e$/m);
  assert.match(decision, /^CANONICAL_READ_ONLY_BASE_TREE = a824027539d5cda9eaf0e21018e67f69e8784b78$/m);
  assert.match(decision, /^POST_HV6_SEQUENCING_DECISION = PROJECT_LEAD_ACCEPTED$/m);
  assert.match(decision, /^SELECTED_NEXT_LANE = REAL_ISOLATED_SECOND_VENUE_PILOT$/m);
  assert.match(decision, /^PROPOSED_NEXT_MILESTONE = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT$/m);
  assert.match(decision, /^NEXT_OPERATION = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT__PREREGISTRATION$/m);
  assert.match(decision, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m);
  assert.match(decision, /^REAL_SECOND_VENUE_AUTHORIZED = NO$/m);
  assert.match(decision, /^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m);
});

test('selected foundation has no GrapesJS dependency or hidden evaluation package', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies?.grapesjs, undefined);
  assert.equal(pkg.devDependencies?.grapesjs, undefined);
  assert.equal(fs.existsSync(path.join(root, 'test/support/hv6-grapesjs-eval-package/package.json')), false);
});
