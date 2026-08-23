'use strict';

const { createApp } = require('../../src/app');
const { loadConfig } = require('../../src/config');
const { createFixtureRpc } = require('./fixture-rpc');

const FIXTURE_NOW_MS = Date.parse('2026-08-11T12:00:00Z');

const logger = {
  child() {
    return this;
  },
  error() {},
  info() {},
  warn() {},
};

function configFrom(overrides = {}) {
  const source = {
    NODE_ENV: 'test',
    HIVE_WRITE_MODE: 'disabled',
    ...overrides,
  };

  // Historical payment fixtures predate C2-G.1 and expressed payment enablement
  // through controlled mode. Translate only test fixtures that explicitly provide
  // a receipt database path; application/runtime configuration remains unchanged.
  if (
    source.NODE_ENV === 'test' &&
    source.HIVE_WRITE_MODE === 'controlled' &&
    Object.prototype.hasOwnProperty.call(overrides, 'HIVE_PAYMENT_RECEIPT_DB_PATH')
  ) {
    source.HIVE_WRITE_MODE = 'beta';
    source.HIVE_SIGNER_MODE = 'keychain';
    source.HIVE_CONTROLLED_ACCOUNTS = '';
    source.HIVE_CONTROLLED_ACTIONS = '';
    source.HIVE_PAYMENT_ENABLED = 'true';
  }

  return loadConfig(source, { loadDotenv: false });
}

function createFixtureApp({ configOverrides = {}, rpcPool = createFixtureRpc() } = {}) {
  return {
    app: createApp({
      config: configFrom(configOverrides),
      logger,
      now: () => FIXTURE_NOW_MS,
      rpcPool,
    }),
    rpcPool,
  };
}

module.exports = { FIXTURE_NOW_MS, configFrom, createFixtureApp, logger };
