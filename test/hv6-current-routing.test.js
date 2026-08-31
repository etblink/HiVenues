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
    [/^POST_HV6_SEQUENCING_DECISION = PROJECT_LEAD_ACCEPTED$/m, 'historical Post-HV-6 sequencing must remain accepted'],
    [/^HV7_CANDIDATE_EVIDENCE_MODEL_AMENDMENT = ACCEPTED$/m, 'HV-7 evidence-model amendment must be accepted'],
    [/^POST_HV6_SELECTED_LANE_LABEL = HISTORICAL_ACCEPTED__SUPERSEDED_BY_HV7_EVIDENCE_MODEL_AMENDMENT$/m, 'historical real-only lane label must be superseded for current routing'],
    [/^FOURTH_STREET_REAL_CLIENT_STATUS = SOLE_REAL_CLIENT_AND_REFERENCE_DEPLOYMENT$/m, 'Fourth Street must remain sole real client/reference deployment'],
    [/^SELECTED_NEXT_LANE = ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT$/m, 'adversarial isolated second-venue pilot must be selected'],
    [/^HV7_CANDIDATE_MODE = SYNTHETIC_ADVERSARIAL$/m, 'synthetic adversarial candidate mode must be selected'],
    [/^PROPOSED_NEXT_MILESTONE = HV7_ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT$/m, 'amended HV-7 milestone must be proposed'],
    [/^NEXT_OPERATION = HV7_ADVERSARIAL_SECOND_VENUE_CANDIDATE_DESIGN__READ_ONLY$/m, 'next operation must be read-only adversarial candidate design'],
    [/^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'no post-HV-6 implementation may be implicitly authorized'],
    [/^GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED$/m, 'GrapesJS Core must remain evaluated and not selected'],
    [/^GRAPESJS_STUDIO_SDK = NOT_SELECTED$/m, 'Studio SDK must remain unselected'],
    [/^REAL_SECOND_VENUE_REQUIRED = NO$/m, 'a real second venue must not be required'],
    [/^VENUE_OUTREACH = NOT_AUTHORIZED$/m, 'venue outreach must remain unauthorized'],
    [/^SYNTHETIC_HV7_REAL_OPERATOR_USABILITY_EVIDENCE = NO$/m, 'synthetic evidence must not claim real-operator usability'],
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
  assert.doesNotMatch(block, /^SELECTED_NEXT_LANE = REAL_ISOLATED_SECOND_VENUE_PILOT$/m, `${relativePath}: obsolete real-only lane must not remain current`);
  assert.doesNotMatch(block, /^PROPOSED_NEXT_MILESTONE = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT$/m, `${relativePath}: obsolete real-only milestone must not remain current`);
  assert.doesNotMatch(block, /^NEXT_OPERATION = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT__PREREGISTRATION$/m, `${relativePath}: integrated historical preregistration must not remain the next operation`);
  assert.doesNotMatch(block, /^NEXT_OPERATION = POST_HV6_SEQUENCING_DECISION__READ_ONLY$/m, `${relativePath}: read-only sequencing must not remain current after acceptance`);
  assert.doesNotMatch(block, /HV6_BOUNDED_DUAL_CANDIDATE_IMPLEMENTATION_AND_EVALUATION/, `${relativePath}: current routing must not route back to Phase B`);
  assert.doesNotMatch(block, /HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_AND_QUALIFICATION/, `${relativePath}: current routing must not route back to Phase C`);
  assert.doesNotMatch(block, /AUTHORIZED__NOT_YET_ACCEPTED/, `${relativePath}: current routing must not describe accepted Phase C as pending`);
  assert.doesNotMatch(block, /EVALUATION_CANDIDATE__NOT_SELECTED_PRODUCTION_DEPENDENCY/, `${relativePath}: GrapesJS must not reappear as an active candidate`);
  return block;
}

test('living current-routing blocks agree on the accepted HV7 amendment and synthetic-adversarial next mode', () => {
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

test('current routing preserves the historical Post-HV-6 decision while binding the accepted HV7 evidence-model amendment', () => {
  const acceptance = read('docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_ACCEPTANCE_0_1_0.md');
  const priorReconciliation = read('docs/POST_HV6_LIVING_ROUTING_RECONCILIATION_0_1_0.md');
  const decision = read('docs/POST_HV6_SEQUENCING_DECISION_0_1_0.md');
  const historicalPreregistration = read('docs/HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT_PREREGISTRATION_0_1_0.md');
  const amendment = read('docs/HV7_SECOND_VENUE_CANDIDATE_EVIDENCE_MODEL_AMENDMENT_0_1_1.md');
  const amendmentAcceptance = read('docs/HV7_SECOND_VENUE_CANDIDATE_EVIDENCE_MODEL_AMENDMENT_ACCEPTANCE_0_1_1.md');
  const routingReconciliation = read('docs/HV7_CANDIDATE_EVIDENCE_MODEL_LIVING_ROUTING_RECONCILIATION_0_1_1.md');

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

  assert.match(historicalPreregistration, /^SPECIFIC_REAL_VENUE = UNSELECTED$/m);
  assert.match(amendment, /^HV7_SECOND_VENUE_CANDIDATE = REAL_OR_SYNTHETIC_ALLOWED$/m);
  assert.match(amendment, /^REAL_SECOND_VENUE_REQUIRED = NO$/m);
  assert.match(amendmentAcceptance, /^HV7_CANDIDATE_EVIDENCE_MODEL_AMENDMENT = ACCEPTED$/m);
  assert.match(amendmentAcceptance, /^PROJECT_LEAD_SELECTED_CANDIDATE_MODE = SYNTHETIC_ADVERSARIAL$/m);
  assert.match(routingReconciliation, /^CURRENT_SELECTED_LANE = ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT$/m);
  assert.match(routingReconciliation, /^CURRENT_CANDIDATE_MODE = SYNTHETIC_ADVERSARIAL$/m);
  assert.match(routingReconciliation, /^NEXT_OPERATION = HV7_ADVERSARIAL_SECOND_VENUE_CANDIDATE_DESIGN__READ_ONLY$/m);
});

test('selected foundation has no GrapesJS dependency or hidden evaluation package', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies?.grapesjs, undefined);
  assert.equal(pkg.devDependencies?.grapesjs, undefined);
  assert.equal(fs.existsSync(path.join(root, 'test/support/hv6-grapesjs-eval-package/package.json')), false);
});
