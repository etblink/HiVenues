'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { EXPECTED_APP_TAG, EXPECTED_V1_ACTIONS, EXPECTED_VERSION, assertFunctionalV1Baseline } = require('../scripts/check-functional-v1-baseline');
const { NEXT_SUCCESSOR_OPERATION } = require('../scripts/release-coherence/current-routing');
const { BETA_ACTIONS } = require('../src/beta/actions');
const { V1_ACTIONS } = require('../src/v1/actions');

const root = path.join(__dirname, '..');
function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), 'utf8'); }

test('functional V1 remains pre-final while successor routing advances independently', () => {
  const summary = assertFunctionalV1Baseline();
  assert.equal(EXPECTED_VERSION, '0.1.0');
  assert.equal(EXPECTED_APP_TAG, 'fourth-street-bar-app/0.1.0');
  assert.deepEqual(EXPECTED_V1_ACTIONS, ['post','thread','comment','vote','follow','unfollow','subscribe','unsubscribe','profile','claim-rewards','wall','inbox']);
  assert.deepEqual(V1_ACTIONS, EXPECTED_V1_ACTIONS);
  assert.deepEqual(BETA_ACTIONS, ['post','comment','vote','follow','unfollow','subscribe','unsubscribe','profile','claim-rewards','wall','inbox','thread']);
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

test('HV8 current state binds exact production identity and keeps deployment mutation unauthorized', () => {
  const readme = read('README.md');
  const roadmap = read('docs/ROADMAP.md');
  const operations = read('docs/PRODUCTION_OPERATIONS.md');
  const preregistration = read('docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_DEPLOYMENT_PREREGISTRATION_0_1_0.md');

  assert.match(readme, /^HV8_CURRENT_RUNNING_COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e$/m);
  assert.match(readme, /^HV8_CURRENT_RUNNING_TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c$/m);
  assert.match(readme, /^HV8_CURRENT_RUNNING_WRITE_MODE = beta$/m);
  assert.match(readme, /^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m);
  assert.match(roadmap, /^HV8_DEPLOYMENT_PREREGISTRATION = FROZEN_0_1_0$/m);
  assert.match(preregistration, /^PRODUCTION_MUTATION = NOT_AUTHORIZED$/m);
  assert.match(preregistration, /^DEPLOY_CANDIDATE = NOT_YET_FROZEN$/m);
  assert.match(operations, /Do not infer current production source/i);
});
