'use strict';

const path = require('node:path');
const { PAYMENT_SCHEMA_VERSION, ReceiptStore, inspectReceiptStore } = require('../src/payments/receipt-store');
const { PAYMENT_DB_PATH } = require('../src/release/payment-storage');

function preparePaymentStorage(filename = PAYMENT_DB_PATH) {
  const target = String(filename || '').trim();
  if (!target || target === ':memory:' || !path.isAbsolute(target)) {
    throw new Error('Payment storage preparation requires an absolute durable SQLite path');
  }
  const store = new ReceiptStore({ filename: target, requireExisting: true });
  store.close();
  const inspection = inspectReceiptStore(target);
  if (inspection.schemaVersion !== PAYMENT_SCHEMA_VERSION) {
    throw new Error('Prepared payment database has an unsupported schema version');
  }
  return inspection;
}

if (require.main === module) {
  try {
    const inspection = preparePaymentStorage(process.argv[2]);
    process.stdout.write(`${JSON.stringify(inspection)}
`);
  } catch (error) {
    process.stderr.write(`Hive-Bar payment storage preparation refused: ${error.message}
`);
    process.exitCode = 1;
  }
}

module.exports = { preparePaymentStorage };
