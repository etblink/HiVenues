'use strict';

const { HiveReadService } = require('../hive/read-service');
const { HiveRpcPool } = require('../hive/rpc-pool');

const DEFAULT_HIVE_RPC_NODES = Object.freeze([
  'https://api.hive.blog',
  'https://api.deathwing.me',
  'https://api.openhive.network',
]);

function createHiVenuesHiveReadService({
  nodes = DEFAULT_HIVE_RPC_NODES,
  timeoutMs = 8000,
  failureThreshold = 2,
  cooldownMs = 30000,
  fetchImpl = globalThis.fetch,
  logger = null,
  now = Date.now,
} = {}) {
  const rpcPool = new HiveRpcPool({
    nodes: [...nodes],
    timeoutMs,
    failureThreshold,
    cooldownMs,
    fetchImpl,
    logger,
    now,
  });
  return new HiveReadService(rpcPool, { now });
}

module.exports = {
  DEFAULT_HIVE_RPC_NODES,
  createHiVenuesHiveReadService,
};
