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
const { NEXT_SUCCESSOR_OPERATION } = require('../scripts/release-coherence/current-routing');
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
    successorRouting: NEXT_SUCCESSOR_OPERATION,
  });
  assert.equal(NEXT_SUCCESSOR_OPERATION, 'POST_HV7_SEQUENCING_DECISION__READ_ONLY');
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

test('accepted synthetic HV-7 routing coexists with unchanged production safety boundary', () => {
  const readme = read('README.md');
  const roadmap = read('docs/ROADMAP.md');
  const index = read('docs/README.md');
  const operations = read('docs/PRODUCTION_OPERATIONS.md');
  const requirements = read('docs/HV7_SECOND_VENUE_NOMINEE_JUNIPER_WORKS_REQUIREMENTS_0_1_0.md');
  const preAcceptance = read('docs/HV7_JUNIPER_WORKS_PRE_ACCEPTANCE_LIVING_ROUTING_RECONCILIATION_0_1_0.md');
  const acceptance = read('docs/HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR_ACCEPTANCE_0_1_0.md');
  const current = read('docs/POST_HV7_JUNIPER_REPAIR_LIVING_ROUTING_RECONCILIATION_0_1_0.md');

  assert.match(readme, /24-requirement product packet has passed.*Tier-A product-and-architecture evidence/is);
  assert.match(readme, /does \*\*not\*\* prove another real client/i);
  assert.match(roadmap, /^HV7_FROZEN_REQUIREMENT_ADJUDICATION = PASS__24_OF_24$/m);
  assert.match(index, /^HV7_SYNTHETIC_TIER_A_PRODUCT_AND_ARCHITECTURE = ACCEPTED$/m);
  assert.match(current, /^NEXT_OPERATION = POST_HV7_SEQUENCING_DECISION__READ_ONLY$/m);
  assert.match(current, /^PRODUCTION_MUTATION = NOT_AUTHORIZED$/m);

  assert.match(requirements, /^PLATFORM_IMPLEMENTATION = NOT_AUTHORIZED_BY_THIS_PACKET$/m);
  assert.match(preAcceptance, /^NEXT_OPERATION = HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR__PROJECT_LEAD_ACCEPTANCE_DECISION$/m);
  assert.match(acceptance, /^REAL_SECOND_CLIENT_ESTABLISHED = NO$/m);
  assert.match(acceptance, /^REAL_OPERATOR_USABILITY_ESTABLISHED = NO$/m);
  assert.match(acceptance, /^REAL_DEPLOYMENT_READINESS_ESTABLISHED = NO$/m);

  assert.match(operations, /canonical repository source: moving branch `main`/);
  assert.match(operations, /Production remains beta until a separately authorized transition/);
  assert.match(operations, /last-good.*M17\.3/i);
});
