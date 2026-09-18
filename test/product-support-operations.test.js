'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  SUPPORT_MEMO,
  buildDirectSupport,
} = require('../src/product/support-operations');

function sender(overrides = {}) {
  return {
    name: 'paper-sparrow',
    balance: '12.345 HIVE',
    hbd_balance: '6.789 HBD',
    ...overrides,
  };
}

function recipient(overrides = {}) {
  return {
    name: 'northline-pay',
    ...overrides,
  };
}

test('direct support builds one exact Active-authority HIVE transfer to the released recipient', () => {
  const envelope = buildDirectSupport({
    account: 'paper-sparrow',
    recipient: 'northline-pay',
    amount: '1.250',
    asset: 'HIVE',
    senderRecord: sender(),
    recipientRecord: recipient(),
  });

  assert.equal(envelope.action, 'support-host');
  assert.equal(envelope.account, 'paper-sparrow');
  assert.equal(envelope.authority, 'Active');
  assert.deepEqual(envelope.operations, [[
    'transfer',
    {
      from: 'paper-sparrow',
      to: 'northline-pay',
      amount: '1.250 HIVE',
      memo: SUPPORT_MEMO,
    },
  ]]);
  assert.deepEqual(envelope.summary, {
    kind: 'Direct host support',
    sender: 'paper-sparrow',
    recipient: 'northline-pay',
    amount: '1.250 HIVE',
    asset: 'HIVE',
    availableBalance: '12.345 HIVE',
    memo: SUPPORT_MEMO,
  });
  assert.match(envelope.fingerprint, /^[0-9a-f]{64}$/);
});

test('direct support accepts HBD and canonical NAI balance objects', () => {
  const envelope = buildDirectSupport({
    account: 'paper-sparrow',
    recipient: 'northline-pay',
    amount: '2.000 HBD',
    asset: 'HBD',
    senderRecord: sender({
      hbd_balance: { amount: '6789', precision: 3, nai: '@@000000013' },
    }),
    recipientRecord: recipient(),
  });

  assert.equal(envelope.summary.amount, '2.000 HBD');
  assert.equal(envelope.summary.availableBalance, '6.789 HBD');
  assert.equal(envelope.operations[0][1].amount, '2.000 HBD');
});

test('direct support rejects unsupported, malformed, zero and over-balance amounts', () => {
  for (const value of [
    { amount: '1.000', asset: 'VESTS', pattern: /only in HIVE or HBD/i },
    { amount: '1', asset: 'HIVE', pattern: /exactly three decimals/i },
    { amount: '1.00', asset: 'HIVE', pattern: /exactly three decimals/i },
    { amount: '0.000', asset: 'HIVE', pattern: /positive amount/i },
  ]) {
    assert.throws(
      () => buildDirectSupport({
        account: 'paper-sparrow',
        recipient: 'northline-pay',
        amount: value.amount,
        asset: value.asset,
        senderRecord: sender(),
        recipientRecord: recipient(),
      }),
      value.pattern,
    );
  }

  assert.throws(
    () => buildDirectSupport({
      account: 'paper-sparrow',
      recipient: 'northline-pay',
      amount: '12.346',
      asset: 'HIVE',
      senderRecord: sender(),
      recipientRecord: recipient(),
    }),
    (error) => error.code === 'SUPPORT_BALANCE_INSUFFICIENT' && error.statusCode === 409,
  );
});

test('direct support rejects self-recipient, stale sender and unavailable released recipient', () => {
  assert.throws(
    () => buildDirectSupport({
      account: 'paper-sparrow',
      recipient: 'paper-sparrow',
      amount: '1.000',
      asset: 'HIVE',
      senderRecord: sender(),
      recipientRecord: { name: 'paper-sparrow' },
    }),
    (error) => error.code === 'SUPPORT_SELF_RECIPIENT',
  );

  assert.throws(
    () => buildDirectSupport({
      account: 'paper-sparrow',
      recipient: 'northline-pay',
      amount: '1.000',
      asset: 'HIVE',
      senderRecord: sender({ name: 'someone-else' }),
      recipientRecord: recipient(),
    }),
    /sender balance is unavailable/i,
  );

  assert.throws(
    () => buildDirectSupport({
      account: 'paper-sparrow',
      recipient: 'northline-pay',
      amount: '1.000',
      asset: 'HIVE',
      senderRecord: sender(),
      recipientRecord: recipient({ name: 'other-pay' }),
    }),
    /released host value recipient is unavailable/i,
  );
});
