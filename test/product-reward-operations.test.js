'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { buildRewardClaim } = require('../src/product/reward-operations');

test('reward claim builder uses the verified account and exact current canonical balances', () => {
  const envelope = buildRewardClaim({
    account: 'paper-sparrow',
    accountRecord: {
      name: 'paper-sparrow',
      reward_hive_balance: '1.000 HIVE',
      reward_hbd_balance: '0.500 HBD',
      reward_vesting_balance: '1000.000000 VESTS',
    },
  });

  assert.equal(envelope.action, 'claim-rewards');
  assert.equal(envelope.account, 'paper-sparrow');
  assert.equal(envelope.authority, 'Posting');
  assert.deepEqual(envelope.operations, [[
    'claim_reward_balance',
    {
      account: 'paper-sparrow',
      reward_hive: '1.000 HIVE',
      reward_hbd: '0.500 HBD',
      reward_vests: '1000.000000 VESTS',
    },
  ]]);
  assert.deepEqual(envelope.summary, {
    kind: 'Claim current Hive rewards',
    account: 'paper-sparrow',
    rewardHive: '1.000 HIVE',
    rewardHbd: '0.500 HBD',
    rewardVests: '1000.000000 VESTS',
  });
  assert.match(envelope.fingerprint, /^[0-9a-f]{64}$/);
});

test('reward claim builder accepts canonical NAI asset objects and normalizes them for review', () => {
  const envelope = buildRewardClaim({
    account: 'paper-sparrow',
    accountRecord: {
      name: 'paper-sparrow',
      reward_hive_balance: { amount: '1000', precision: 3, nai: '@@000000021' },
      reward_hbd_balance: { amount: '500', precision: 3, nai: '@@000000013' },
      reward_vesting_balance: { amount: '1000000000', precision: 6, nai: '@@000000037' },
    },
  });

  assert.deepEqual(envelope.operations[0][1], {
    account: 'paper-sparrow',
    reward_hive: '1.000 HIVE',
    reward_hbd: '0.500 HBD',
    reward_vests: '1000.000000 VESTS',
  });
});

test('reward claim builder blocks zero claims, account mismatch and malformed chain state', () => {
  assert.throws(
    () => buildRewardClaim({
      account: 'paper-sparrow',
      accountRecord: {
        name: 'paper-sparrow',
        reward_hive_balance: '0.000 HIVE',
        reward_hbd_balance: '0.000 HBD',
        reward_vesting_balance: '0.000000 VESTS',
      },
    }),
    (error) => error.code === 'NO_CLAIMABLE_REWARDS' && error.statusCode === 409,
  );

  assert.throws(
    () => buildRewardClaim({
      account: 'paper-sparrow',
      accountRecord: {
        name: 'someone-else',
        reward_hive_balance: '1.000 HIVE',
        reward_hbd_balance: '0.000 HBD',
        reward_vesting_balance: '0.000000 VESTS',
      },
    }),
    /unavailable for this account/i,
  );

  assert.throws(
    () => buildRewardClaim({
      account: 'paper-sparrow',
      accountRecord: {
        name: 'paper-sparrow',
        reward_hive_balance: '1.00 HIVE',
        reward_hbd_balance: '0.000 HBD',
        reward_vesting_balance: '0.000000 VESTS',
      },
    }),
    /HIVE reward balance is invalid/i,
  );
});
