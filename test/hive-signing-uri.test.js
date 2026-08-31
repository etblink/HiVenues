'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  decodeHiveSigningUri,
  resolveHiveSigningTransaction,
} = require('../src/payments/hive-signing-uri');
const {
  encodeBase64u,
  encodeMsg,
  encodeOp,
  encodeOps,
  encodeTx,
} = require('./support/hive-signing-uri-fixtures');

const RESOLVE_OPTIONS = Object.freeze({
  ref_block_num: 1234,
  ref_block_prefix: 5678900,
  expiration: '2026-08-31T12:34:56',
  signers: ['etblink', 'barfriend'],
  preferred_signer: 'barfriend',
});

function transfer(overrides = {}) {
  return ['transfer', {
    from: '__signer',
    to: 'fourthstreetbar',
    amount: '1.000 HBD',
    memo: 'source-owned parser fixture',
    ...overrides,
  }];
}

test('source-owned Hive signing URI parser decodes tx, op, ops, msg, and transfer actions', () => {
  const tx = {
    ref_block_num: '__ref_block_num',
    ref_block_prefix: '__ref_block_prefix',
    expiration: '__expiration',
    extensions: [],
    operations: [transfer()],
  };
  assert.deepEqual(decodeHiveSigningUri(encodeTx(tx)).tx, tx);
  assert.deepEqual(decodeHiveSigningUri(encodeOp(transfer())).tx.operations, [transfer()]);
  assert.deepEqual(
    decodeHiveSigningUri(encodeOps([transfer(), ['vote', { voter: '__signer' }]])).tx.operations,
    [transfer(), ['vote', { voter: '__signer' }]],
  );
  assert.deepEqual(decodeHiveSigningUri(encodeMsg({ message: '__signer says hello' })).tx, {
    message: '__signer says hello',
  });

  const specialized = `hive://sign/transfer/fourthstreetbar/1.000%20HBD/${encodeBase64u('special memo')}?s=etblink&a=active`;
  const decoded = decodeHiveSigningUri(specialized);
  assert.deepEqual(decoded.params, { authority: 'active', signer: 'etblink' });
  assert.deepEqual(decoded.tx.operations, [[
    'transfer',
    {
      from: '__signer',
      to: 'fourthstreetbar',
      amount: '1.000 HBD',
      memo: 'special memo',
    },
  ]]);
});

test('source-owned parser preserves Hive URI query parameter semantics', () => {
  const uri = encodeOp(transfer(), {
    no_broadcast: true,
    signer: 'etblink',
    callback: 'https://example.com/callback?id={{id}}',
    authority: 'active',
  });
  assert.deepEqual(decodeHiveSigningUri(uri).params, {
    callback: 'https://example.com/callback?id={{id}}',
    no_broadcast: true,
    authority: 'active',
    signer: 'etblink',
  });
});

test('source-owned resolver recursively replaces the four protocol placeholders and selects the requested signer', () => {
  const unresolved = decodeHiveSigningUri(encodeTx({
    ref_block_num: '__ref_block_num',
    ref_block_prefix: '__ref_block_prefix',
    expiration: '__expiration',
    extensions: [],
    operations: [[
      'custom_json',
      {
        required_auths: ['__signer'],
        required_posting_auths: [],
        id: 'fixture',
        json: '["fixture",{"account":"__signer","label":"prefix-__signer"}]',
      },
    ]],
  }, { signer: 'etblink' }));

  const resolved = resolveHiveSigningTransaction(unresolved.tx, unresolved.params, RESOLVE_OPTIONS);
  assert.equal(resolved.signer, 'etblink');
  assert.equal(resolved.tx.ref_block_num, '1234');
  assert.equal(resolved.tx.ref_block_prefix, '5678900');
  assert.equal(resolved.tx.expiration, '2026-08-31T12:34:56');
  assert.deepEqual(resolved.tx.operations[0][1].required_auths, ['etblink']);
  assert.equal(
    resolved.tx.operations[0][1].json,
    '["fixture",{"account":"etblink","label":"prefix-etblink"}]',
  );
});

test('source-owned resolver rejects an unavailable requested signer', () => {
  const decoded = decodeHiveSigningUri(encodeOp(transfer(), { signer: 'intruder' }));
  assert.throws(
    () => resolveHiveSigningTransaction(decoded.tx, decoded.params, RESOLVE_OPTIONS),
    /Signer 'intruder' not available/,
  );
});

test('source-owned parser rejects malformed protocol, action, payload, transfer, and UTF-8 values closed', () => {
  for (const uri of [
    'https://sign/op/abc',
    'hive://other/op/abc',
    'hive://sign/unknown/abc',
    'hive://sign/op/%%%',
    'hive://sign/op/_w..',
    'hive://sign/transfer/fourthstreetbar',
    'hive://sign/transfer/fourthstreetbar/1.000%20HBD/%%%',
  ]) {
    assert.throws(() => decodeHiveSigningUri(uri), uri);
  }
});
