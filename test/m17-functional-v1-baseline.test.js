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
    successorRouting: 'POST_HV6_SEQUENCING_DECISION__READ_ONLY',
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

test('accepted HV-6 coexists with the unchanged production safety boundary', () => {
  const readme = read('README.md');
  const roadmap = read('docs/ROADMAP.md');
  const index = read('docs/README.md');
  const operations = read('docs/PRODUCTION_OPERATIONS.md');
  const hv5Acceptance = read('docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md');
  const hv6Acceptance = read('docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_ACCEPTANCE_0_1_0.md');
  const postHv6 = read('docs/POST_HV6_LIVING_ROUTING_RECONCILIATION_0_1_0.md');

  assert.match(readme, /^# Hive-Venues$/m);
  assert.match(readme, /first six successor architecture\/product-foundation milestones are accepted/i);
  assert.match(readme, /HV-6 is canonically accepted/i);
  assert.match(readme, /next product-governance operation is a fresh \*\*Post-HV-6 Sequencing Decision\*\*/i);
  assert.match(readme, /No new substantive implementation is currently authorized/i);

  for (const source of [roadmap, index]) {
    assert.match(source, /^HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION = ACCEPTED$/m);
    assert.match(source, /^POST_HV6_SEQUENCING_DECISION = PENDING$/m);
    assert.match(source, /^SELECTED_NEXT_LANE = NONE$/m);
    assert.match(source, /^NEXT_OPERATION = POST_HV6_SEQUENCING_DECISION__READ_ONLY$/m);
    assert.match(source, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m);
    assert.match(source, /^GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED$/m);
    assert.match(source, /^(?:REAL_SECOND_VENUE_AUTHORIZED|SECOND_REAL_VENUE_AUTHORIZED) = NO$/m);
    assert.match(source, /^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m);
    assert.match(source, /^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m);
  }

  assert.match(hv5Acceptance, /^HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION = ACCEPTED$/m);
  assert.match(hv6Acceptance, /^STATUS = PROJECT_LEAD_ACCEPTED$/m);
  assert.match(hv6Acceptance, /^ACCEPTED_IMPLEMENTATION_COMMIT = 3b774468ff1ed347a35500f2a29062a63ed62621$/m);
  assert.match(hv6Acceptance, /^HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION = ACCEPTED$/m);
  assert.match(hv6Acceptance, /^PUBLIC_PRODUCTION_AUTHORING_ROUTE = NOT_AUTHORIZED$/m);
  assert.match(postHv6, /^OPERATION = POST_HV6_LIVING_ROUTING_RECONCILIATION$/m);
  assert.match(postHv6, /^NEXT_OPERATION = POST_HV6_SEQUENCING_DECISION__READ_ONLY$/m);
  assert.match(postHv6, /^NEW_SUBSTANTIVE_IMPLEMENTATION = NO$/m);

  assert.match(operations, /canonical repository source: moving branch `main`/);
  assert.match(operations, /Production remains beta until a separately authorized transition/);
  assert.match(operations, /last-good.*M17\.3/i);
});
