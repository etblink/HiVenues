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
    [/^FOURTH_STREET_VENUE_STATUS = REAL_VENUE$/m, 'Fourth Street must remain a real venue'],
    [/^FOURTH_STREET_CLIENT_STATUS = FIRST_REAL_CLIENT__SOLE_REAL_CLIENT$/m, 'Fourth Street must remain the first and currently sole real client'],
    [/^FOURTH_STREET_NOMINEE_STATUS = FIRST_VENUE_NOMINEE$/m, 'Fourth Street must remain the first venue nominee'],
    [/^FOURTH_STREET_DEPLOYMENT_STATUS = REFERENCE_DEPLOYMENT$/m, 'Fourth Street must remain the reference deployment'],
    [/^HV7_SECOND_VENUE_PRODUCT_ROLE = SECOND_VENUE_NOMINEE$/m, 'HV-7 must retain the second venue nominee role'],
    [/^HV7_SECOND_VENUE_NOMINEE = JUNIPER_WORKS_COOPERATIVE$/m, 'Juniper Works must be selected'],
    [/^HV7_SECOND_VENUE_NOMINEE_REALITY = SYNTHETIC$/m, 'Juniper Works must remain synthetic'],
    [/^HV7_SECOND_VENUE_NOMINEE_STATUS = SELECTED__REQUIREMENTS_FROZEN$/m, 'Juniper Works requirements must be frozen'],
    [/^HV7_REQUIREMENTS_PACKET = FROZEN_0_1_0$/m, 'the 0.1.0 requirement packet must control'],
    [/^HV7_REQUIREMENT_COUNT = 24$/m, 'all 24 requirements must remain frozen'],
    [/^SELECTED_NEXT_LANE = ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT$/m, 'adversarial isolated second-venue pilot must remain selected'],
    [/^HV7_CANDIDATE_MODE = SYNTHETIC_ADVERSARIAL$/m, 'synthetic adversarial evidence mode must remain selected'],
    [/^HV7_ADVERSARIAL_INTERPRETATION = PRODUCT_CREDIBLE_FALSIFICATION__NOT_MAXIMIZED_INCOMPATIBILITY$/m, 'adversarial must remain product-credible'],
    [/^HV7_DESIGN_METHOD = ARCHITECTURE_AWARE_PRODUCT_FIRST$/m, 'design method must remain architecture-aware and product-first'],
    [/^HV7_ARTIFICIAL_BLINDNESS = NOT_REQUIRED$/m, 'artificial blindness must not be required'],
    [/^HV7_REQUIREMENTS_FREEZE_BEFORE_IMPLEMENTATION = COMPLETE$/m, 'requirements freeze must be complete'],
    [/^HV7_POST_FREEZE_REQUIREMENT_REWRITE_TO_FORCE_PLATFORM_FIT = FORBIDDEN$/m, 'requirement rewriting to force a pass must remain forbidden'],
    [/^PROPOSED_NEXT_MILESTONE = HV7_ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT$/m, 'amended HV-7 milestone must remain current'],
    [/^NEXT_OPERATION = HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION__READ_ONLY$/m, 'next operation must be the Juniper architecture confrontation'],
    [/^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'substantive implementation must remain unauthorized'],
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

  for (const obsolete of [
    /^SELECTED_NEXT_LANE = REAL_ISOLATED_SECOND_VENUE_PILOT$/m,
    /^NEXT_OPERATION = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT__PREREGISTRATION$/m,
    /^NEXT_OPERATION = HV7_ADVERSARIAL_SECOND_VENUE_CANDIDATE_DESIGN__READ_ONLY$/m,
    /^HV7_SECOND_VENUE_NOMINEE_STATUS = DESIGN_PENDING__SYNTHETIC_ALLOWED$/m,
    /^HV7_REQUIREMENTS_FREEZE_BEFORE_IMPLEMENTATION = REQUIRED$/m,
    /^FOURTH_STREET_REAL_CLIENT_STATUS = SOLE_REAL_CLIENT_AND_REFERENCE_DEPLOYMENT$/m,
  ]) {
    assert.doesNotMatch(block, obsolete, `${relativePath}: obsolete or conflated current state must not return`);
  }
  return block;
}

test('living current-routing blocks agree on frozen Juniper Works second-nominee state', () => {
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

test('current routing preserves pre-freeze history while binding the Juniper freeze and confrontation route', () => {
  const decision = read('docs/POST_HV6_SEQUENCING_DECISION_0_1_0.md');
  const historicalPreregistration = read('docs/HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT_PREREGISTRATION_0_1_0.md');
  const amendment = read('docs/HV7_SECOND_VENUE_CANDIDATE_EVIDENCE_MODEL_AMENDMENT_0_1_1.md');
  const amendmentAcceptance = read('docs/HV7_SECOND_VENUE_CANDIDATE_EVIDENCE_MODEL_AMENDMENT_ACCEPTANCE_0_1_1.md');
  const preSelectionRouting = read('docs/HV7_CANDIDATE_EVIDENCE_MODEL_LIVING_ROUTING_RECONCILIATION_0_1_1.md');
  const requirements = read('docs/HV7_SECOND_VENUE_NOMINEE_JUNIPER_WORKS_REQUIREMENTS_0_1_0.md');
  const postFreezeRouting = read('docs/HV7_JUNIPER_WORKS_POST_FREEZE_LIVING_ROUTING_RECONCILIATION_0_1_0.md');

  assert.match(decision, /^SELECTED_NEXT_LANE = REAL_ISOLATED_SECOND_VENUE_PILOT$/m);
  assert.match(decision, /^NEXT_OPERATION = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT__PREREGISTRATION$/m);
  assert.match(historicalPreregistration, /^SPECIFIC_REAL_VENUE = UNSELECTED$/m);
  assert.match(amendment, /^HV7_SECOND_VENUE_CANDIDATE = REAL_OR_SYNTHETIC_ALLOWED$/m);
  assert.match(amendmentAcceptance, /^PROJECT_LEAD_SELECTED_CANDIDATE_MODE = SYNTHETIC_ADVERSARIAL$/m);
  assert.match(preSelectionRouting, /^HV7_SECOND_VENUE_NOMINEE_STATUS = DESIGN_PENDING__SYNTHETIC_ALLOWED$/m);
  assert.match(preSelectionRouting, /^NEXT_OPERATION = HV7_ADVERSARIAL_SECOND_VENUE_CANDIDATE_DESIGN__READ_ONLY$/m);

  assert.match(requirements, /^SECOND_VENUE_NOMINEE = JUNIPER_WORKS_COOPERATIVE$/m);
  assert.match(requirements, /^HV7_REQUIREMENT_COUNT = 24$/m);
  assert.match(requirements, /^NEXT_OPERATION_AFTER_FREEZE = HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION__READ_ONLY$/m);

  assert.match(postFreezeRouting, /^HV7_SECOND_VENUE_NOMINEE = JUNIPER_WORKS_COOPERATIVE$/m);
  assert.match(postFreezeRouting, /^HV7_SECOND_VENUE_NOMINEE_STATUS = SELECTED__REQUIREMENTS_FROZEN$/m);
  assert.match(postFreezeRouting, /^NEXT_OPERATION = HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION__READ_ONLY$/m);
  assert.match(postFreezeRouting, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m);
});

test('selected foundation has no GrapesJS dependency or hidden evaluation package', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies?.grapesjs, undefined);
  assert.equal(pkg.devDependencies?.grapesjs, undefined);
  assert.equal(fs.existsSync(path.join(root, 'test/support/hv6-grapesjs-eval-package/package.json')), false);
});
