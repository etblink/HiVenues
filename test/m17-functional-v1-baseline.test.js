'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  EXPECTED_APP_TAG,
  EXPECTED_V1_ACTIONS,
  EXPECTED_VERSION,
  assertFunctionalV1Baseline,
} = require('../scripts/check-functional-v1-baseline');
const { BETA_ACTIONS } = require('../src/beta/actions');
const { V1_ACTIONS } = require('../src/v1/actions');

const root = path.join(__dirname, '..');
const NEXT_SUCCESSOR_OPERATION =
  'HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR__PROJECT_LEAD_ACCEPTANCE_DECISION';

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('functional V1 remains pre-final while successor routing advances independently', () => {
  const summary = assertFunctionalV1Baseline();

  assert.equal(EXPECTED_VERSION, '0.1.0');
  assert.equal(EXPECTED_APP_TAG, 'fourth-street-bar-app/0.1.0');
  assert.deepEqual(EXPECTED_V1_ACTIONS, [
    'post', 'thread', 'comment', 'vote', 'follow', 'unfollow',
    'subscribe', 'unsubscribe', 'profile', 'claim-rewards', 'wall', 'inbox',
  ]);
  assert.deepEqual(V1_ACTIONS, EXPECTED_V1_ACTIONS);
  assert.deepEqual(BETA_ACTIONS, [
    'post', 'comment', 'vote', 'follow', 'unfollow', 'subscribe',
    'unsubscribe', 'profile', 'claim-rewards', 'wall', 'inbox', 'thread',
  ]);
  assert.deepEqual(summary, {
    profile: 'm17-functional-v1-baseline',
    packageVersion: '0.1.0',
    appTag: 'fourth-street-bar-app/0.1.0',
    v1ActionCount: 12,
    productionProfile: 'privex-beta-self-signing',
    v1ProductionActivated: false,
    finalRelease: false,
    successorRouting: NEXT_SUCCESSOR_OPERATION,
  });
});

test('last-good bookkeeping is atomic and explicit rollback stays explicit', () => {
  const deploy = read('ops/privex/bin/hive-bar-deploy');
  const rollback = read('ops/privex/bin/hive-bar-rollback');

  assert.match(deploy, /^readonly last_good="\$app_root\/last-good"$/m);
  assert.match(deploy, /previous="\$\(readlink -f "\$current"/);
  assert.match(deploy, /expected_previous_tree="\$\(git --git-dir="\$repository" rev-parse/);
  assert.match(deploy, /\[\[ "\$previous_tree" == "\$expected_previous_tree" \]\]/);
  assert.match(deploy, /last_good_staging="\$app_root\/\.last-good\.\$\{previous_commit\}\.\$\$"/);
  assert.match(deploy, /ln -s "\$previous" "\$last_good_staging"/);
  assert.match(deploy, /mv -Tf "\$last_good_staging" "\$last_good"/);
  assert.match(deploy, /if \[\[ "\$previous" != "\$release" \]\]; then/);

  assert.match(rollback, /provide exactly one previously installed full commit SHA/);
  assert.match(rollback, /commit must be 40 lowercase hexadecimal characters/);
  assert.doesNotMatch(rollback, /commit=.*last_good/);
});

test('Juniper pre-acceptance routing coexists with unchanged production safety boundary', () => {
  const readme = read('README.md');
  const roadmap = read('docs/ROADMAP.md');
  const index = read('docs/README.md');
  const operations = read('docs/PRODUCTION_OPERATIONS.md');
  const requirements = read('docs/HV7_SECOND_VENUE_NOMINEE_JUNIPER_WORKS_REQUIREMENTS_0_1_0.md');
  const postFreeze = read('docs/HV7_JUNIPER_WORKS_POST_FREEZE_LIVING_ROUTING_RECONCILIATION_0_1_0.md');
  const preAcceptance = read('docs/HV7_JUNIPER_WORKS_PRE_ACCEPTANCE_LIVING_ROUTING_RECONCILIATION_0_1_0.md');

  assert.match(readme, /^# Hive-Venues$/m);
  assert.match(readme, /first six successor architecture\/product-foundation milestones are accepted/i);
  assert.match(readme, /Fourth Street Bar in Reno is a real venue, Hive-Venues' first real client, its first venue nominee, and the reference deployment/i);
  assert.match(readme, /Juniper Works Cooperative.*synthetic second venue nominee/i);
  assert.match(readme, /24 authentic product requirements were frozen/i);
  assert.match(readme, /read-only architecture confrontation is complete/i);
  assert.match(readme, /repair candidate now exists on PR #91/i);
  assert.match(readme, /No further substantive HV-7 implementation is authorized at this boundary/i);

  for (const source of [roadmap, index]) {
    assert.match(source, /^HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION = ACCEPTED$/m);
    assert.match(source, /^POST_HV6_SEQUENCING_DECISION = PROJECT_LEAD_ACCEPTED$/m);
    assert.match(source, /^HV7_CANDIDATE_EVIDENCE_MODEL_AMENDMENT = ACCEPTED$/m);
    assert.match(source, /^FOURTH_STREET_VENUE_STATUS = REAL_VENUE$/m);
    assert.match(source, /^FOURTH_STREET_CLIENT_STATUS = FIRST_REAL_CLIENT__SOLE_REAL_CLIENT$/m);
    assert.match(source, /^FOURTH_STREET_NOMINEE_STATUS = FIRST_VENUE_NOMINEE$/m);
    assert.match(source, /^FOURTH_STREET_DEPLOYMENT_STATUS = REFERENCE_DEPLOYMENT$/m);
    assert.match(source, /^HV7_SECOND_VENUE_PRODUCT_ROLE = SECOND_VENUE_NOMINEE$/m);
    assert.match(source, /^HV7_SECOND_VENUE_NOMINEE = JUNIPER_WORKS_COOPERATIVE$/m);
    assert.match(source, /^HV7_SECOND_VENUE_NOMINEE_REALITY = SYNTHETIC$/m);
    assert.match(source, /^HV7_SECOND_VENUE_NOMINEE_STATUS = SELECTED__REQUIREMENTS_FROZEN$/m);
    assert.match(source, /^HV7_REQUIREMENTS_PACKET = FROZEN_0_1_0$/m);
    assert.match(source, /^HV7_REQUIREMENT_COUNT = 24$/m);
    assert.match(source, /^SELECTED_NEXT_LANE = ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT$/m);
    assert.match(source, /^HV7_CANDIDATE_MODE = SYNTHETIC_ADVERSARIAL$/m);
    assert.match(source, /^HV7_REQUIREMENTS_FREEZE_BEFORE_IMPLEMENTATION = COMPLETE$/m);
    assert.match(source, /^HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION = COMPLETE__READ_ONLY$/m);
    assert.match(source, /^HV7_PLATFORM_GENERALITY_REPAIR_PREREGISTRATION = ACCEPTED$/m);
    assert.match(source, /^HV7_PLATFORM_GENERALITY_REPAIR_IMPLEMENTATION_AUTHORIZATION = ACCEPTED$/m);
    assert.match(source, /^HV7_PLATFORM_GENERALITY_REPAIR_IMPLEMENTATION = CANDIDATE_IMPLEMENTED__PRE_ACCEPTANCE$/m);
    assert.match(source, /^HV7_PRE_ACCEPTANCE_QUALIFICATION = REQUIRED_ON_EXACT_FINAL_HEAD$/m);
    assert.match(source, new RegExp(`^NEXT_OPERATION = ${NEXT_SUCCESSOR_OPERATION}$`, 'm'));
    assert.match(source, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m);
    assert.match(source, /^REAL_SECOND_VENUE_REQUIRED = NO$/m);
    assert.match(source, /^(?:REAL_SECOND_VENUE_AUTHORIZED|SECOND_REAL_VENUE_AUTHORIZED) = NO$/m);
    assert.match(source, /^VENUE_OUTREACH = NOT_AUTHORIZED$/m);
    assert.match(source, /^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m);
    assert.match(source, /^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m);
  }

  assert.match(requirements, /^SECOND_VENUE_NOMINEE = JUNIPER_WORKS_COOPERATIVE$/m);
  assert.match(requirements, /^HV7_REQUIREMENT_COUNT = 24$/m);
  assert.match(requirements, /^PLATFORM_IMPLEMENTATION = NOT_AUTHORIZED_BY_THIS_PACKET$/m);
  assert.match(postFreeze, /^NEXT_OPERATION = HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION__READ_ONLY$/m);
  assert.match(postFreeze, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m);
  assert.match(preAcceptance, /^ARCHITECTURE_CONFRONTATION = COMPLETE__READ_ONLY$/m);
  assert.match(preAcceptance, /^PLATFORM_GENERALITY_REPAIR_IMPLEMENTATION = CANDIDATE_IMPLEMENTED__PRE_ACCEPTANCE$/m);
  assert.match(preAcceptance, new RegExp(`^NEXT_OPERATION = ${NEXT_SUCCESSOR_OPERATION}$`, 'm'));

  assert.match(operations, /canonical repository source: moving branch `main`/);
  assert.match(operations, /Production remains beta until a separately authorized transition/);
  assert.match(operations, /last-good.*M17\.3/i);
});
