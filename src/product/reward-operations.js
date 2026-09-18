'use strict';

const { requireHiveAccount } = require('../http/validation');
const { ConflictError, ValidationError } = require('../lib/errors');
const { parseAsset } = require('../hive/assets');
const { fingerprint } = require('../hive/social-operations');

function canonicalReward(value, symbol, zeroValue) {
  const parsed = parseAsset(value ?? zeroValue, symbol);
  if (!parsed) throw new ValidationError(`Current ${symbol} reward balance is invalid`);
  return parsed;
}

function buildRewardClaim({ account: accountValue, accountRecord }) {
  const account = requireHiveAccount(accountValue);
  if (!accountRecord || accountRecord.name !== account) {
    throw new ValidationError('Current reward balances are unavailable for this account');
  }

  const rewardHive = canonicalReward(
    accountRecord.reward_hive_balance,
    'HIVE',
    '0.000 HIVE',
  );
  const rewardHbd = canonicalReward(
    accountRecord.reward_hbd_balance,
    'HBD',
    '0.000 HBD',
  );
  const rewardVests = canonicalReward(
    accountRecord.reward_vesting_balance,
    'VESTS',
    '0.000000 VESTS',
  );

  if (rewardHive.units === 0n && rewardHbd.units === 0n && rewardVests.units === 0n) {
    throw new ConflictError('There are no current Hive rewards to claim', {
      code: 'NO_CLAIMABLE_REWARDS',
    });
  }

  const operation = Object.freeze([
    'claim_reward_balance',
    Object.freeze({
      account,
      reward_hive: rewardHive.canonical,
      reward_hbd: rewardHbd.canonical,
      reward_vests: rewardVests.canonical,
    }),
  ]);
  const operations = Object.freeze([operation]);

  return Object.freeze({
    action: 'claim-rewards',
    account,
    authority: 'Posting',
    operations,
    fingerprint: fingerprint(operations),
    summary: Object.freeze({
      kind: 'Claim current Hive rewards',
      account,
      rewardHive: rewardHive.canonical,
      rewardHbd: rewardHbd.canonical,
      rewardVests: rewardVests.canonical,
    }),
  });
}

module.exports = {
  buildRewardClaim,
  canonicalReward,
};
