'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  assetEquivalent,
  operationEquivalent,
  transactionMatchesRecord,
} = require('../src/hive/operation-equivalence');

const txid = 'a'.repeat(40);

test('transfer equivalence accepts exact HIVE and HBD amounts but never crosses symbols', () => {
  assert.equal(assetEquivalent('1.250 HIVE', { amount: '1250', precision: 3, nai: '@@000000021' }), true);
  assert.equal(assetEquivalent('1.250 HBD', { amount: '1250', precision: 3, nai: '@@000000013' }), true);
  assert.equal(assetEquivalent('1.250 HIVE', { amount: '1250', precision: 3, nai: '@@000000013' }), false);

  assert.equal(operationEquivalent(
    ['transfer', { from: 'fourthst.threads', to: 'fourthstreetbar', amount: '2.000 HIVE', memo: 'claim' }],
    { type: 'transfer_operation', value: {
      from: 'fourthst.threads', to: 'fourthstreetbar',
      amount: { amount: '2000', precision: 3, nai: '@@000000021' }, memo: 'claim',
    } },
  ), true);
});

test('comment_options equivalence normalizes wrapper shape, object key order, and HBD asset encoding', () => {
  const expected = ['comment_options', {
    author: 'fourthst.threads',
    permlink: 'threads-2026-09-01',
    max_accepted_payout: '1000000.000 HBD',
    percent_hbd: 10000,
    allow_votes: true,
    allow_curation_rewards: true,
    extensions: [[0, { beneficiaries: [{ account: 'fourthstreetbar', weight: 10000 }] }]],
  }];
  const actual = {
    type: 'comment_options_operation',
    value: {
      extensions: [[0, { beneficiaries: [{ weight: 10000, account: 'fourthstreetbar' }] }]],
      allow_curation_rewards: true,
      allow_votes: true,
      percent_hbd: 10000,
      max_accepted_payout: { amount: '1000000000', precision: 3, nai: '@@000000013' },
      permlink: 'threads-2026-09-01',
      author: 'fourthst.threads',
    },
  };
  assert.equal(operationEquivalent(expected, actual), true);

  const changed = structuredClone(actual);
  changed.value.extensions[0][1].beneficiaries[0].weight = 9999;
  assert.equal(operationEquivalent(expected, changed), false);
});

test('exact transaction matching binds the full reviewed comment plus comment_options array', () => {
  const record = {
    transactionId: txid,
    operations: [
      ['comment', {
        parent_author: '', parent_permlink: 'hive-108590', author: 'fourthst.threads',
        permlink: 'threads-2026-09-01', title: 'Threads', body: 'container',
        json_metadata: '{"hive_venues":{"kind":"threads-container","version":1,"venue":"fourth-street-bar-reno"}}',
      }],
      ['comment_options', {
        author: 'fourthst.threads', permlink: 'threads-2026-09-01',
        max_accepted_payout: '1000000.000 HBD', percent_hbd: 10000,
        allow_votes: true, allow_curation_rewards: true,
        extensions: [[0, { beneficiaries: [{ account: 'fourthstreetbar', weight: 10000 }] }]],
      }],
    ],
  };
  const transaction = {
    transaction_id: txid,
    operations: structuredClone(record.operations),
  };
  assert.equal(transactionMatchesRecord(record, transaction), true);

  transaction.operations[1][1].extensions[0][1].beneficiaries[0].weight = 5000;
  assert.equal(transactionMatchesRecord(record, transaction), false);
});

test('exact transaction matching handles a two-asset manual claim and rejects omission', () => {
  const record = {
    transactionId: txid,
    operations: [
      ['transfer', { from: 'fourthst.threads', to: 'fourthstreetbar', amount: '1.000 HIVE', memo: 'claim' }],
      ['transfer', { from: 'fourthst.threads', to: 'fourthstreetbar', amount: '2.000 HBD', memo: 'claim' }],
    ],
  };
  const transaction = { transaction_id: txid, operations: [
    { type: 'transfer_operation', value: {
      from: 'fourthst.threads', to: 'fourthstreetbar',
      amount: { amount: '1000', precision: 3, nai: '@@000000021' }, memo: 'claim',
    } },
    { type: 'transfer_operation', value: {
      from: 'fourthst.threads', to: 'fourthstreetbar',
      amount: { amount: '2000', precision: 3, nai: '@@000000013' }, memo: 'claim',
    } },
  ] };
  assert.equal(transactionMatchesRecord(record, transaction), true);
  transaction.operations.pop();
  assert.equal(transactionMatchesRecord(record, transaction), false);
});

test('transaction match requires the exact accepted transaction id', () => {
  const record = { transactionId: txid, operations: [] };
  assert.equal(transactionMatchesRecord(record, { transaction_id: 'b'.repeat(40), operations: [] }), false);
  assert.equal(transactionMatchesRecord({ transactionId: null, operations: [] }, { transaction_id: txid, operations: [] }), false);
});
