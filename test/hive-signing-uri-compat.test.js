'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const patchedHiveUri = require('hive-uri');
const {
  decodeHiveSigningUri,
  resolveHiveSigningTransaction,
} = require('../src/payments/hive-signing-uri');
const {
  encodeBase64u,
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
const capturedV4v = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'payments', 'v4v-hbd-blank-payer.txt'),
  'utf8',
).trim();

function transfer(overrides = {}) {
  return ['transfer', {
    from: '__signer',
    to: 'fourthstreetbar',
    amount: '1.000 HBD',
    memo: 'compatibility fixture',
    ...overrides,
  }];
}

test('source-owned decoder is structurally equivalent to patched hive-uri 0.2.8 on the accepted payment-relevant corpus', () => {
  const reusableTx = {
    ref_block_num: '__ref_block_num',
    ref_block_prefix: '__ref_block_prefix',
    expiration: '__expiration',
    extensions: [],
    operations: [transfer({ memo: 'prefix-__signer' })],
  };
  const corpus = [
    capturedV4v,
    encodeOp(transfer()),
    encodeOp(transfer(), {
      signer: 'etblink',
      authority: 'active',
      callback: 'https://example.com/callback?id={{id}}',
    }),
    encodeOps([transfer(), ['vote', { voter: '__signer', author: 'alice', permlink: 'post', weight: 1 }]]),
    encodeTx(reusableTx, { signer: 'etblink' }),
    `hive://sign/transfer/fourthstreetbar/1.000%20HBD/${encodeBase64u('special memo')}?s=etblink&a=active`,
  ];

  for (const uri of corpus) {
    const expectedDecoded = patchedHiveUri.decode(uri);
    const actualDecoded = decodeHiveSigningUri(uri);
    assert.deepEqual(actualDecoded, expectedDecoded, uri);
    assert.deepEqual(
      resolveHiveSigningTransaction(actualDecoded.tx, actualDecoded.params, RESOLVE_OPTIONS),
      patchedHiveUri.resolveTransaction(expectedDecoded.tx, expectedDecoded.params, RESOLVE_OPTIONS),
      uri,
    );
  }
});

test('source-owned decoder and patched hive-uri reject the same malformed payment-relevant URI classes', () => {
  for (const uri of [
    'https://example.com/pay',
    'hive://other/op/abc',
    'hive://sign/unknown/abc',
    'hive://sign/op/%%%',
    'hive://sign/op/_w..',
    'hive://sign/transfer/fourthstreetbar',
    'hive://sign/transfer/fourthstreetbar/1.000%20HBD/%%%',
  ]) {
    assert.throws(() => patchedHiveUri.decode(uri), `patched dependency accepted ${uri}`);
    assert.throws(() => decodeHiveSigningUri(uri), `source-owned parser accepted ${uri}`);
  }
});

test('source-owned resolver and patched hive-uri both refuse an unavailable requested signer', () => {
  const uri = encodeOp(transfer(), { signer: 'intruder' });
  const expectedDecoded = patchedHiveUri.decode(uri);
  const actualDecoded = decodeHiveSigningUri(uri);
  assert.throws(() => patchedHiveUri.resolveTransaction(expectedDecoded.tx, expectedDecoded.params, RESOLVE_OPTIONS));
  assert.throws(() => resolveHiveSigningTransaction(actualDecoded.tx, actualDecoded.params, RESOLVE_OPTIONS));
});
