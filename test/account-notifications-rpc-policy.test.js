'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { readAccountNotifications } = require('../src/hive/account-notifications');
const { HiveRpcPool } = require('../src/hive/rpc-pool');

const silentLogger = { warn() {} };

function rpcResponse(id, result) {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

test('account notifications traverse the real read-only RPC pool policy', async () => {
  const requests = [];
  const pool = new HiveRpcPool({
    nodes: ['https://one.example'],
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      requests.push(body);
      return rpcResponse(body.id, [
        {
          id: 1,
          type: 'reply',
          msg: 'alice replied to your post',
          date: '2026-09-01T00:00:00',
          url: '/@alice/welcome',
        },
      ]);
    },
    logger: silentLogger,
  });

  const result = await readAccountNotifications(pool, { account: 'etblink', limit: 20 });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].type, 'reply');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'bridge.account_notifications');
  assert.deepEqual(requests[0].params, { account: 'etblink', limit: 40 });

  await assert.rejects(
    pool.call('network_broadcast_api', 'broadcast_transaction', {}),
    (error) => error.code === 'READ_ONLY_RPC_POLICY',
  );
  await assert.rejects(
    pool.call('bridge', 'unknown_read_method', {}),
    (error) => error.code === 'READ_ONLY_RPC_POLICY',
  );
  assert.equal(requests.length, 1);
});
