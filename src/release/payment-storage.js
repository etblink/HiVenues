'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  PAYMENT_SCHEMA_VERSION,
  ReceiptStore,
  assertSafeDatabaseTarget,
  inspectReceiptStore,
} = require('../payments/receipt-store');

const PAYMENT_DB_PATH = '/var/lib/hive-bar/payments/receipts.sqlite3';

function isSafePaymentDatabasePath(filename, { requireExisting = false } = {}) {
  if (filename !== PAYMENT_DB_PATH || path.basename(filename) !== 'receipts.sqlite3') return false;
  if (!requireExisting && !fs.existsSync(path.dirname(filename))) return true;
  try {
    assertSafeDatabaseTarget(filename, { requireExisting });
    return true;
  } catch {
    return false;
  }
}

function preparePaymentStore(filename = PAYMENT_DB_PATH) {
  if (filename !== PAYMENT_DB_PATH) {
    throw new Error(`Payment database path must be exactly ${PAYMENT_DB_PATH}`);
  }
  assertSafeDatabaseTarget(filename);
  const store = new ReceiptStore({ filename });
  try {
    const health = store.health();
    if (health.schemaVersion !== PAYMENT_SCHEMA_VERSION) {
      throw new Error('Payment database schema preparation failed');
    }
  } finally {
    store.close();
  }
  fs.chmodSync(filename, 0o600);
  return inspectReceiptStore(filename);
}

module.exports = {
  PAYMENT_DB_PATH,
  isSafePaymentDatabasePath,
  preparePaymentStore,
};
