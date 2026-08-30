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

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('C2-A exposes the reviewed profile action in beta while preserving the pre-final functional V1 baseline', () => {
  const summary = assertFunctionalV1Baseline();

  assert.equal(EXPECTED_VERSION, '0.1.0');
  assert.equal(EXPECTED_APP_TAG, 'fourth-street-bar-app/0.1.0');
  assert.deepEqual(EXPECTED_V1_ACTIONS, [
    'post',
    'thread',
    'comment',
    'vote',
    'follow',
    'unfollow',
    'subscribe',
    'unsubscribe',
    'profile',
    'claim-rewards',
    'wall',
    'inbox',
  ]);
  assert.deepEqual(V1_ACTIONS, EXPECTED_V1_ACTIONS);
  assert.deepEqual(BETA_ACTIONS, [
    'post',
    'comment',
    'vote',
    'follow',
    'unfollow',
    'subscribe',
    'unsubscribe',
    'profile',
    'claim-rewards',
    'wall',
    'inbox',
    'thread',
  ]);
  assert.deepEqual(summary, {
    profile: 'm17-functional-v1-baseline',
    packageVersion: '0.1.0',
    appTag: 'fourth-street-bar-app/0.1.0',
    v1ActionCount: 12,
    productionProfile: 'privex-beta-self-signing',
    v1ProductionActivated: false,
    finalRelease: false,
    successorRouting: 'HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION',
  });
});

test('M17.4 last-good bookkeeping is atomic and does not weaken explicit rollback', () => {
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

test('accepted M17 invariants coexist with historical M19.2 evidence and selected Post-HV-5 routing', () => {
  const readme = read('README.md');
  const roadmap = read('docs/ROADMAP.md');
  const operations = read('docs/PRODUCTION_OPERATIONS.md');
  const index = read('docs/README.md');
  const milestone = read('docs/M17_4_FUNCTIONAL_V1_BASELINE.md');
  const hv5Acceptance = read('docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md');
  const neutralReconciliation = read('docs/POST_HV5_LIVING_ROUTING_RECONCILIATION_0_1_0.md');
  const decision = read('docs/POST_HV5_SEQUENCING_DECISION_0_1_0.md');
  const decisionReconciliation = read('docs/POST_HV5_DECISION_ROUTING_RECONCILIATION_0_1_0.md');

  assert.match(readme, /^# Hive-Venues$/m);
  assert.match(readme, /The first five successor architecture milestones are accepted/);
  assert.match(readme, /accepted \*\*Post-HV-5 Sequencing Decision\*\*/i);
  assert.match(readme, /operator visual authoring adapter/i);
  assert.match(readme, /next operation is \*\*HV-6 preregistration only\*\*/i);
  assert.match(readme, /No HV-6 substantive implementation is authorized yet/i);
  assert.match(readme, /last recorded accepted production transition in the inherited record is M19\.2/);
  assert.match(readme, /No successor source refactor by itself authorizes deployment/);

  assert.match(roadmap, /^HV1_VENUE_CONTEXT_FOUNDATION = ACCEPTED$/m);
  assert.match(roadmap, /^HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION = ACCEPTED$/m);
  assert.match(roadmap, /^HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION = ACCEPTED$/m);
  assert.match(roadmap, /^HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION = ACCEPTED$/m);
  assert.match(roadmap, /^HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION = ACCEPTED$/m);
  assert.match(roadmap, /^POST_HV3_SEQUENCING_DECISION = HISTORICAL_ACCEPTED__SUPERSEDED_FOR_CURRENT_ROUTING$/m);
  assert.match(roadmap, /^POST_HV4_SEQUENCING_DECISION = HISTORICAL_ACCEPTED__SUPERSEDED_FOR_CURRENT_ROUTING$/m);
  assert.match(roadmap, /^POST_HV5_SEQUENCING_DECISION = ACCEPTED$/m);
  assert.match(roadmap, /^SELECTED_NEXT_LANE = OPERATOR_VISUAL_AUTHORING_ADAPTER$/m);
  assert.match(roadmap, /^PROPOSED_MILESTONE = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION$/m);
  assert.match(roadmap, /^NEXT_OPERATION = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION$/m);
  assert.match(roadmap, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m);
  assert.match(roadmap, /^GRAPESJS_CORE = PRIMARY_EVALUATION_CANDIDATE__NOT_SELECTED_DEPENDENCY$/m);
  assert.match(roadmap, /^SECOND_REAL_VENUE_AUTHORIZED = NO$/m);
  assert.match(roadmap, /^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m);
  assert.match(roadmap, /^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m);

  assert.match(hv5Acceptance, /^HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION = ACCEPTED$/m);
  assert.match(hv5Acceptance, /^ACCEPTED_IMPLEMENTATION_COMMIT = 932bb2fe109acfca9cb4ab0514dabc7553edf764$/m);
  assert.match(hv5Acceptance, /^ACCEPTED_IMPLEMENTATION_TREE = aeaddf2bda5bdc89997caeaa8e4e472839ae8b10$/m);

  assert.match(neutralReconciliation, /^OPERATION = POST_HV5_LIVING_ROUTING_RECONCILIATION$/m);
  assert.match(neutralReconciliation, /^SELECTED_NEXT_LANE = NONE$/m);
  assert.match(neutralReconciliation, /^NEXT_OPERATION = POST_HV5_SEQUENCING_DECISION__READ_ONLY$/m);

  assert.match(decision, /^STATUS = FROZEN_PROJECT_LEAD_SEQUENCING_DECISION$/m);
  assert.match(decision, /^SELECTED_NEXT_LANE = OPERATOR_VISUAL_AUTHORING_ADAPTER$/m);
  assert.match(decision, /^PROPOSED_MILESTONE = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION$/m);
  assert.match(decision, /^NEXT_OPERATION = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION$/m);
  assert.match(decision, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m);

  assert.match(decisionReconciliation, /^OPERATION = POST_HV5_DECISION_ROUTING_RECONCILIATION$/m);
  assert.match(decisionReconciliation, /^SELECTED_NEXT_LANE = OPERATOR_VISUAL_AUTHORING_ADAPTER$/m);
  assert.match(decisionReconciliation, /^NEXT_OPERATION = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION$/m);
  assert.match(decisionReconciliation, /^NEW_SUBSTANTIVE_IMPLEMENTATION = NO$/m);

  assert.match(
    operations,
    /last recorded accepted production transition: M19\.2 deployed M19\.1 commit `e01407f5f29e3d0a1d41fe33fca129399b4cd2d4`, tree `1a4bb993ad59ca67032997d8938696a079a71e1f`/,
  );
  assert.match(operations, /canonical repository source: moving branch `main`/);
  assert.match(operations, /Production remains beta until a separately authorized transition/);
  assert.match(operations, /last-good.*M17\.3/i);

  assert.match(index, /Historical Hive-Bar and successor evidence/);
  assert.match(index, /original Git object graph is preserved/);
  assert.match(index, /POST_HV5_SEQUENCING_DECISION_0_1_0\.md/);
  assert.match(index, /NEXT_OPERATION = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION/);

  assert.match(milestone, /No cosmetic redesign is required for M17\.4 acceptance/);
  assert.match(milestone, /canonicalization is not part of this source-qualification authorization/);
});
