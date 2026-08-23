'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'pay-tab.js'), 'utf8');

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function receipt(state, values = {}) {
  return {
    id: 'receipt-1', account: 'etblink', merchant: 'fourthstreetbar', amount: '0.001 HBD',
    operations: [['transfer', { from: 'etblink', to: 'fourthstreetbar', amount: '0.001 HBD', memo: 'v4v-pos:tab-123' }]],
    summary: { kind: 'Verified Pay Tab transfer' }, fingerprint: 'f'.repeat(64), authority: 'Active', state,
    transactionId: null, blockNumber: null, rebate: { available: false, url: null, external: true }, message: 'state updated', ...values,
  };
}

function browser() {
  const dom = new JSDOM(`<!doctype html><main data-pay-tab>
    <button data-pay-camera-start></button><button data-pay-camera-stop hidden></button><input type="file" data-pay-image><video data-pay-video class="hidden"></video>
    <form data-pay-form><textarea name="uri" data-pay-uri>hive://sign/op/example</textarea><button type="submit">Validate</button></form><p data-pay-status></p>
    <section data-pay-receipt hidden><p data-pay-receipt-state></p><span data-pay-receipt-account></span><span data-pay-receipt-merchant></span><span data-pay-receipt-amount></span><span data-pay-receipt-block></span><span data-pay-receipt-transaction></span><span data-pay-receipt-fingerprint></span><p data-pay-receipt-message></p><button data-pay-recheck hidden></button><div data-pay-rebate hidden></div></section>
  </main>`, { runScripts: 'outside-only', url: 'https://hive-bar.example/pay' });
  dom.window.eval(source);
  return dom;
}

test('calls Active Keychain exactly once and cannot render Paid before chain confirmation', async () => {
  const dom = browser();
  const requests = [];
  let broadcasts = 0;
  const controller = new dom.window.HiveBarPay.PayTabController({
    documentRef: dom.window.document,
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      if (url === '/auth/session') return response({ authenticated: true, account: 'etblink', csrfToken: 'csrf-1' });
      if (url === '/api/payments/preflight') return response(receipt('Validated'), 201);
      if (url.endsWith('/awaiting-signature')) return response(receipt('AwaitingSignature'));
      if (url.endsWith('/accepted')) return response(receipt('BroadcastAccepted', { transactionId: 'a'.repeat(40), message: 'Broadcast accepted; pending.' }));
      if (url.endsWith('/observe')) {
        assert.doesNotMatch(dom.window.document.querySelector('[data-pay-receipt-state]').textContent, /^Paid/);
        return response(receipt('ChainConfirmed', { transactionId: 'a'.repeat(40), blockNumber: 109000000, rebate: { available: true, url: 'https://distriator.com/', external: true }, message: 'Paid after exact two-node confirmation.' }));
      }
      throw new Error(`Unexpected URL ${url}`);
    },
    keychainFactory: () => ({ async broadcast(value) { broadcasts += 1; assert.equal(value.authority, 'Active'); return { accepted: true, transactionId: 'a'.repeat(40) }; } }),
    review: async () => true, waitImpl: async () => {},
  });
  try {
    await controller.run(dom.window.document.querySelector('form'));
    assert.equal(broadcasts, 1);
    assert.equal(dom.window.document.querySelector('[data-pay-receipt-state]').textContent, 'Paid — confirmed on Hive');
    assert.equal(dom.window.document.querySelector('[data-pay-rebate]').hidden, false);
    assert.equal(requests.filter(({ url }) => url.endsWith('/accepted')).length, 1);
  } finally { dom.window.close(); }
});

test('review cancellation records Cancelled without opening Keychain', async () => {
  const dom = browser();
  let broadcasts = 0;
  const controller = new dom.window.HiveBarPay.PayTabController({
    documentRef: dom.window.document,
    fetchImpl: async (url) => {
      if (url === '/auth/session') return response({ authenticated: true, account: 'etblink', csrfToken: 'csrf-1' });
      if (url === '/api/payments/preflight') return response(receipt('Validated'), 201);
      if (url.endsWith('/cancel')) return response(receipt('Cancelled', { message: 'Cancelled.' }));
      throw new Error(`Unexpected URL ${url}`);
    },
    keychainFactory: () => ({ async broadcast() { broadcasts += 1; } }), review: async () => false,
  });
  try {
    await controller.run(dom.window.document.querySelector('form'));
    assert.equal(broadcasts, 0);
    assert.equal(dom.window.document.querySelector('[data-pay-receipt-state]').textContent, 'Cancelled — nothing was broadcast');
  } finally { dom.window.close(); }
});

test('explicit Keychain cancellation is the only post-review error that releases the receipt', async () => {
  const dom = browser();
  let cancelCalls = 0;
  const controller = new dom.window.HiveBarPay.PayTabController({
    documentRef: dom.window.document,
    fetchImpl: async (url) => {
      if (url === '/auth/session') return response({ authenticated: true, account: 'etblink', csrfToken: 'csrf-1' });
      if (url === '/api/payments/preflight') return response(receipt('Validated'), 201);
      if (url.endsWith('/awaiting-signature')) return response(receipt('AwaitingSignature'));
      if (url.endsWith('/cancel')) { cancelCalls += 1; return response(receipt('Cancelled')); }
      throw new Error(`Unexpected URL ${url}`);
    },
    keychainFactory: () => ({ async broadcast() { const error = new Error('cancelled'); error.code = 'KEYCHAIN_CANCELLED'; throw error; } }),
    review: async () => true,
  });
  try {
    await controller.run(dom.window.document.querySelector('form'));
    assert.equal(cancelCalls, 1);
    assert.equal(dom.window.document.querySelector('[data-pay-receipt-state]').textContent, 'Cancelled — nothing was broadcast');
  } finally { dom.window.close(); }
});

test('ambiguous Keychain failure records acceptance with no txid and never cancels or broadcasts again', async () => {
  const dom = browser();
  let cancelCalls = 0;
  let acceptedCalls = 0;
  let broadcasts = 0;
  const controller = new dom.window.HiveBarPay.PayTabController({
    documentRef: dom.window.document,
    fetchImpl: async (url, options) => {
      if (url === '/auth/session') return response({ authenticated: true, account: 'etblink', csrfToken: 'csrf-1' });
      if (url === '/api/payments/preflight') return response(receipt('Validated'), 201);
      if (url.endsWith('/awaiting-signature')) return response(receipt('AwaitingSignature'));
      if (url.endsWith('/cancel')) { cancelCalls += 1; return response(receipt('Cancelled')); }
      if (url.endsWith('/accepted')) {
        acceptedCalls += 1;
        assert.deepEqual(JSON.parse(options.body), { transactionId: null });
        return response(receipt('BroadcastAccepted', { message: 'Broadcast acceptance is ambiguous.' }));
      }
      throw new Error(`Unexpected URL ${url}`);
    },
    keychainFactory: () => ({ async broadcast() { broadcasts += 1; const error = new Error('Hive Keychain did not respond in time.'); error.code = 'KEYCHAIN_TIMEOUT'; throw error; } }),
    review: async () => true,
  });
  try {
    await controller.run(dom.window.document.querySelector('form'));
    assert.equal(broadcasts, 1);
    assert.equal(cancelCalls, 0);
    assert.equal(acceptedCalls, 1);
    assert.equal(dom.window.document.querySelector('[data-pay-receipt-state]').textContent, 'Broadcast accepted — confirmation pending');
    assert.match(dom.window.document.querySelector('[data-pay-status]').textContent, /Do not pay again or retry automatically/);
  } finally { dom.window.close(); }
});

test('decodes imported QR images locally without uploading the file', async () => {
  const dom = browser();
  const revoked = [];
  dom.window.URL.createObjectURL = () => 'blob:local-image';
  dom.window.URL.revokeObjectURL = (value) => revoked.push(value);
  const controller = new dom.window.HiveBarPay.PayTabController({ documentRef: dom.window.document, qrReaderFactory: () => ({ async decodeFromImageUrl(value) { assert.equal(value, 'blob:local-image'); return { getText: () => 'hive://sign/transfer/fourthstreetbar/0.001%20HBD' }; } }) });
  try {
    await controller.importImage({ type: 'image/png', size: 1000 });
    assert.equal(dom.window.document.querySelector('[data-pay-uri]').value, 'hive://sign/transfer/fourthstreetbar/0.001%20HBD');
    assert.deepEqual(revoked, ['blob:local-image']);
  } finally { dom.window.close(); }
});
