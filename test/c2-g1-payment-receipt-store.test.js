'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const hiveUri = require('hive-uri');
const { decodeHivePaymentInvoice } = require('../src/payments/invoice-decoder');
const {
  PAYMENT_SCHEMA_VERSION,
  RECEIPT_STATES,
  ReceiptStore,
  inspectReceiptStore,
} = require('../src/payments/receipt-store');

function envelope(memo = 'v4v-pos:tab-123', amount = '0.001 HBD', account = 'etblink') {
  return decodeHivePaymentInvoice(
    hiveUri.encodeOp([
      'transfer',
      { from: '__signer', to: 'fourthstreetbar', amount, memo },
    ], { signer: account, authority: 'active' }),
    { account, merchantAccounts: ['fourthstreetbar'] },
  );
}

test('persists the strict payment lifecycle, restart recovery, and schema-v2 inspection', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-bar-receipts-'));
  const filename = path.join(directory, 'receipts.sqlite');
  fs.closeSync(fs.openSync(filename, 'wx', 0o600));
  let now = Date.parse('2026-08-13T08:00:00Z');
  let store = new ReceiptStore({ filename, requireExisting: true, now: () => now, random: () => 'receipt-1' });
  try {
    let receipt = store.createValidated({ sessionId: 'session-1', envelope: envelope() });
    assert.equal(receipt.state, RECEIPT_STATES.VALIDATED);
    assert.equal(receipt.amount, '0.001 HBD');
    assert.equal(store.health().schemaVersion, PAYMENT_SCHEMA_VERSION);
    assert.throws(() => store.get(receipt.id, 'session-2', 'intruder'), /belongs to another verified account/);
    receipt = store.markAwaitingSignature(receipt.id, 'session-1');
    now += 1000;
    receipt = store.markBroadcastAccepted(receipt.id, 'session-1', 'a'.repeat(40));
    store.close();

    store = new ReceiptStore({ filename, requireExisting: true, now: () => now });
    receipt = store.latest('session-after-restart', 'etblink');
    assert.equal(receipt.transactionId, 'a'.repeat(40));
    assert.equal(receipt.state, RECEIPT_STATES.BROADCAST_ACCEPTED);
    receipt = store.applyObservation(receipt.id, 'session-after-restart', { status: 'pending', diagnostic: 'one node only' }, 'etblink');
    assert.equal(receipt.observationChecks, 1);
    receipt = store.markConfirmationTimeout(receipt.id, 'session-after-restart', undefined, 'etblink');
    assert.equal(receipt.state, RECEIPT_STATES.CONFIRMATION_TIMEOUT);
    receipt = store.applyObservation(receipt.id, 'session-after-restart', {
      status: 'confirmed', blockNumber: 109000000, transactionIndex: 3, chainTimestamp: '2026-08-13T08:00:05',
    }, 'etblink');
    assert.equal(receipt.state, RECEIPT_STATES.CHAIN_CONFIRMED);
    assert.equal(receipt.observationChecks, 2);
    assert.deepEqual(inspectReceiptStore(filename), { schemaVersion: PAYMENT_SCHEMA_VERSION, integrity: 'ok' });
  } finally {
    store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('serializes one unresolved payment per payer and releases the lane only after cancel or confirmation', () => {
  const store = new ReceiptStore({ random: (() => { let value = 0; return () => `receipt-${++value}`; })() });
  try {
    const first = store.createValidated({ sessionId: 'session-1', envelope: envelope('memo-1') });
    assert.throws(
      () => store.createValidated({ sessionId: 'session-1', envelope: envelope('memo-2') }),
      (error) => error.code === 'PAYMENT_UNRESOLVED',
    );
    assert.equal(store.cancel(first.id, 'session-1').state, RECEIPT_STATES.CANCELLED);
    const second = store.createValidated({ sessionId: 'session-1', envelope: envelope('memo-2') });
    store.markAwaitingSignature(second.id, 'session-1');
    store.markBroadcastAccepted(second.id, 'session-1', 'b'.repeat(40));
    assert.throws(
      () => store.createValidated({ sessionId: 'session-1', envelope: envelope('memo-3') }),
      (error) => error.code === 'PAYMENT_UNRESOLVED',
    );
    store.applyObservation(second.id, 'session-1', { status: 'confirmed', blockNumber: 1, transactionIndex: 0 });
    assert.equal(store.createValidated({ sessionId: 'session-1', envelope: envelope('memo-3') }).state, RECEIPT_STATES.VALIDATED);
  } finally { store.close(); }
});

test('cancellation never releases an exact invoice fingerprint for replay', () => {
  const store = new ReceiptStore({ random: (() => { let value = 0; return () => `receipt-${++value}`; })() });
  try {
    const first = store.createValidated({ sessionId: 'session-1', envelope: envelope('same-invoice') });
    store.cancel(first.id, 'session-1');
    assert.throws(
      () => store.createValidated({ sessionId: 'session-1', envelope: envelope('same-invoice') }),
      (error) => error.code === 'DUPLICATE_PAYMENT',
    );
    assert.equal(store.createValidated({ sessionId: 'session-1', envelope: envelope('fresh-invoice') }).state, RECEIPT_STATES.VALIDATED);
  } finally { store.close(); }
});

test('enforces transaction idempotency across different payers without weakening payer serialization', () => {
  const store = new ReceiptStore({ random: (() => { let value = 0; return () => `receipt-${++value}`; })() });
  try {
    const first = store.createValidated({ sessionId: 'session-1', envelope: envelope('memo-1', '0.001 HBD', 'etblink') });
    store.markAwaitingSignature(first.id, 'session-1');
    store.markBroadcastAccepted(first.id, 'session-1', 'a'.repeat(40));

    const second = store.createValidated({ sessionId: 'session-2', envelope: envelope('memo-2', '0.001 HBD', 'barfriend') });
    store.markAwaitingSignature(second.id, 'session-2', 'barfriend');
    assert.throws(
      () => store.markBroadcastAccepted(second.id, 'session-2', 'a'.repeat(40), 'barfriend'),
      (error) => error.code === 'DUPLICATE_TRANSACTION',
    );
  } finally { store.close(); }
});
