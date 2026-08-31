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

function assertCurrentSelectedNativeBlock(relativePath) {
  const block = currentRouting(relativePath);
  for (const [pattern, message] of [
    [/^HV6_PHASE_B_TECHNOLOGY_SELECTION = COMPLETE$/m, 'Phase B must be complete'],
    [/^SELECTED_ADAPTER = NATIVE_EXISTING_STACK$/m, 'native existing stack must be selected'],
    [/^HV6_PHASE_C_IMPLEMENTATION_AUTHORIZATION = ACCEPTED$/m, 'Phase C authorization must be accepted'],
    [/^HV6_PHASE_C_IMPLEMENTATION = AUTHORIZED__NOT_YET_ACCEPTED$/m, 'Phase C must be authorized but not accepted'],
    [/^NEXT_OPERATION = HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_AND_QUALIFICATION$/m, 'next operation must be selected-native Phase C'],
    [/^NEXT_SUBSTANTIVE_IMPLEMENTATION = AUTHORIZED_WITHIN_SELECTED_NATIVE_PHASE_C_BOUNDARY$/m, 'substantive work must remain inside Phase C'],
    [/^GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED$/m, 'GrapesJS Core must remain rejected'],
    [/^GRAPESJS_STUDIO_SDK = NOT_SELECTED$/m, 'Studio SDK must remain unselected'],
    [/^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m, 'live production mutation must remain unauthorized'],
    [/^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m, 'shared runtime tenancy must remain deferred'],
    [/^DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME$/m, 'isolated runtime must remain default'],
  ]) {
    assert.match(block, pattern, `${relativePath}: ${message}`);
  }

  const secondVenueMatches = [...block.matchAll(SECOND_VENUE_ROUTE)];
  assert.equal(secondVenueMatches.length, 1, `${relativePath}: exactly one recognized second-real-venue authorization key must remain NO`);

  assert.doesNotMatch(block, /^TECHNOLOGY_SELECTED = NO$/m, `${relativePath} current routing must not claim technology is unselected`);
  assert.doesNotMatch(block, /^NEXT_OPERATION = HV6_BOUNDED_DUAL_CANDIDATE_IMPLEMENTATION_AND_EVALUATION$/m, `${relativePath} current routing must not route back to Phase B`);
  assert.doesNotMatch(block, /EVALUATION_CANDIDATE__NOT_SELECTED_PRODUCTION_DEPENDENCY/, `${relativePath} current routing must not present GrapesJS as an active candidate`);
  return block;
}

test('living current-routing blocks agree semantically on selected-native HV-6 Phase C', () => {
  const readme = assertCurrentSelectedNativeBlock('README.md');
  const docsIndex = assertCurrentSelectedNativeBlock('docs/README.md');
  const roadmap = assertCurrentSelectedNativeBlock('docs/ROADMAP.md');

  assert.match(docsIndex, /^TECHNOLOGY_SELECTED = NATIVE_EXISTING_STACK$/m);
  assert.match(roadmap, /^TECHNOLOGY_SELECTED = NATIVE_EXISTING_STACK$/m);
  assert.match(roadmap, /^HV1_VENUE_CONTEXT_FOUNDATION = ACCEPTED$/m);
  assert.match(roadmap, /^HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION = ACCEPTED$/m);
  assert.match(roadmap, /^SECOND_REAL_VENUE_AUTHORIZED = NO$/m);

  assert.match(readme, /HV6_PHASE_C_IMPLEMENTATION_AUTHORIZATION = ACCEPTED/);
});

test('current routing is bound to the exact Phase-B selection and Phase-C authorization records', () => {
  const selection = read('docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_TECHNOLOGY_SELECTION_0_1_0.md');
  const authorization = read('docs/HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_AUTHORIZATION_0_1_0.md');
  const reconciliation = read('docs/HV6_NATIVE_PHASE_C_AUTHORIZATION_ROUTING_RECONCILIATION_0_1_0.md');

  assert.match(selection, /^AUTHORIZED_CANONICAL_BASE_COMMIT = 906bee55c638891117df23b7392de92e8d620ad7$/m);
  assert.match(selection, /^PROJECT_LEAD_TECHNOLOGY_SELECTION = PASS$/m);
  assert.match(selection, /^SELECTED_ADAPTER = NATIVE_EXISTING_STACK$/m);
  assert.match(selection, /^GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED$/m);
  assert.match(selection, /^PHASE_C_FULL_FOUNDATION_IMPLEMENTATION_AUTHORIZED_BY_THIS_FILE = NO$/m);

  assert.match(authorization, /^CANONICAL_BASE_COMMIT = 863a0ec766efe7c8f82f1e720fdc892ef1d4acac$/m);
  assert.match(authorization, /^CANONICAL_BASE_TREE = 6e9fe0773a1ce0bb99838ff269a2b07f4fa13210$/m);
  assert.match(authorization, /^SELECTED_ADAPTER = NATIVE_EXISTING_STACK$/m);
  assert.match(authorization, /^GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED$/m);
  assert.match(authorization, /^PHASE_C_IMPLEMENTATION_AUTHORIZED = YES$/m);
  assert.match(authorization, /^PRODUCTION_DEPLOYMENT_AUTHORIZED = NO$/m);
  assert.match(authorization, /^LIVE_FOURTH_STREET_MUTATION_AUTHORIZED = NO$/m);
  assert.match(authorization, /^REAL_SECOND_VENUE_ADMISSION_AUTHORIZED = NO$/m);

  assert.match(reconciliation, /^OPERATION = HV6_NATIVE_PHASE_C_AUTHORIZATION_ROUTING_RECONCILIATION$/m);
  assert.match(reconciliation, /^CANONICAL_AUTHORIZATION_BASE = 84e44fc54700e2102e1f826f2fb76791695bd15a$/m);
  assert.match(reconciliation, /^CANONICAL_AUTHORIZATION_TREE = 66041556e4e6323d3d955da4fa705384f347ca96$/m);
  assert.match(reconciliation, /^SELECTED_ADAPTER = NATIVE_EXISTING_STACK$/m);
  assert.match(reconciliation, /^HV6_PHASE_C_IMPLEMENTATION_AUTHORIZATION = ACCEPTED$/m);
  assert.match(reconciliation, /^HV6_PHASE_C_IMPLEMENTATION = AUTHORIZED__NOT_YET_ACCEPTED$/m);
  assert.match(reconciliation, /^NEXT_OPERATION = HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_AND_QUALIFICATION$/m);
  assert.match(reconciliation, /^NEW_SUBSTANTIVE_IMPLEMENTATION_IN_THIS_RECONCILIATION = NO$/m);
  assert.match(reconciliation, /^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m);
  assert.match(reconciliation, /^SECOND_REAL_VENUE_AUTHORIZED = NO$/m);
});

test('selected-native routing preserves historical compatibility without confusing it for current state', () => {
  for (const relativePath of ['README.md', 'docs/README.md', 'docs/ROADMAP.md']) {
    const source = read(relativePath);
    assert.match(source, /Historical bounded-evaluation routing snapshot — not current/i, `${relativePath} must label the compatibility snapshot as historical`);
  }

  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies?.grapesjs, undefined);
  assert.equal(pkg.devDependencies?.grapesjs, undefined);
  assert.equal(fs.existsSync(path.join(root, 'test/support/hv6-grapesjs-eval-package/package.json')), false);
});
