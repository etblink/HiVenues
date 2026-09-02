'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createThreadsServiceSigner } = require('../src/social/threads-service-signer');

test('Threads service signer is disabled by default', async () => {
  const signer = createThreadsServiceSigner({ account: 'fourthst.threads' });
  await assert.rejects(
    signer.broadcastEnvelope({
      account: 'fourthst.threads',
      authority: 'Posting',
      operations: [],
      fingerprint: 'a'.repeat(64),
    }),
    (error) => error.code === 'THREADS_SERVICE_SIGNER_DISABLED',
  );
});

test('foundation seam rejects non-synthetic credentials', () => {
  assert.throws(() => createThreadsServiceSigner({
    enabled: true,
    account: 'fourthst.threads',
    credentialId: 'real-key-material',
    broadcast: async () => ({ ok: true }),
  }), /synthetic test credentials only/);
});

test('synthetic seam can exercise exact Posting envelope without any real key', async () => {
  const calls = [];
  const signer = createThreadsServiceSigner({
    enabled: true,
    account: 'fourthst.threads',
    credentialId: 'synthetic:threads-posting-fixture',
    async broadcast(payload) {
      calls.push(payload);
      return { transactionId: 'synthetic-transaction' };
    },
  });
  const envelope = {
    account: 'fourthst.threads',
    authority: 'Posting',
    operations: [['comment', { author: 'fourthst.threads' }]],
    fingerprint: 'b'.repeat(64),
  };
  const result = await signer.broadcastEnvelope(envelope);
  assert.deepEqual(result, { transactionId: 'synthetic-transaction' });
  assert.deepEqual(calls, [{
    credentialId: 'synthetic:threads-posting-fixture',
    account: 'fourthst.threads',
    operations: envelope.operations,
    fingerprint: envelope.fingerprint,
  }]);
});
