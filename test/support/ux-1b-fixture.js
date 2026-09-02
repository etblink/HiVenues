'use strict';

const path = require('node:path');
const express = require('express');
const { createApp } = require('../../src/app');
const { SessionStore } = require('../../src/auth/session-store');
const { createStaticAssetUrl } = require('../../src/release/static-assets');
const { withVenueContext } = require('../../src/venue/context');
const { configFrom, logger } = require('./test-app');
const { createUx1aRpc } = require('./ux-1a-fixture');

const ROOT = path.join(__dirname, '..', '..');
const ACCOUNT = 'etblink';
const CREATOR_DONATION_WEIGHT = 125;
const THREADS_LIQUID_HIVE = '1.234 HIVE';
const THREADS_LIQUID_HBD = '5.678 HBD';

function createUx1bVisualFixture() {
  const baseConfig = configFrom({
    HIVE_WRITE_MODE: 'beta',
    HIVE_SIGNER_MODE: 'keychain',
    RATE_LIMIT_MAX: '10000',
    SESSION_SECRET: 'ux-1b-visual-session-secret-that-is-at-least-32-bytes',
  });
  const config = withVenueContext(baseConfig, {
    ...baseConfig.venue,
    hive: {
      ...baseConfig.venue.hive,
      beneficiaryPolicy: {
        venueUserPost: { enabled: false, weight: null },
        creatorDonation: { enabled: true, weight: CREATOR_DONATION_WEIGHT },
      },
    },
  });
  const baseRpc = createUx1aRpc({ populated: true });
  let threadsFundsAuthorized = true;
  const rpcPool = {
    calls: baseRpc.calls,
    getStatus: baseRpc.getStatus,
    async call(api, method, params) {
      const key = `${api}.${method}`;
      const requestedAccounts = Array.isArray(params?.[0]) ? params[0] : [];
      if (
        key === 'condenser_api.get_accounts' &&
        requestedAccounts.length === 1 &&
        requestedAccounts[0] === config.hive.threadsContainerAccount
      ) {
        this.calls.push({ api, method, params: structuredClone(params) });
        return [{
          name: config.hive.threadsContainerAccount,
          balance: THREADS_LIQUID_HIVE,
          hbd_balance: THREADS_LIQUID_HBD,
          active: {
            weight_threshold: 1,
            account_auths: threadsFundsAuthorized
              ? [[config.hive.officialAccount, 1]]
              : [],
            key_auths: [],
          },
        }];
      }
      return baseRpc.call(api, method, params);
    },
  };
  const sessionStore = new SessionStore({
    secret: config.auth.sessionSecret,
    ttlMs: config.auth.sessionTtlMs,
  });
  const { token } = sessionStore.create(ACCOUNT);
  const { token: merchantToken } = sessionStore.create(config.hive.officialAccount);
  const application = createApp({ config, logger, rpcPool, sessionStore });
  application.locals.assetUrl = createStaticAssetUrl(path.join(ROOT, 'public'));
  const mutationAttempts = [];
  const app = express();
  app.use((req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    mutationAttempts.push({ method: req.method, path: req.originalUrl });
    return res.status(405).json({ error: { code: 'UX_1B_VISUAL_MUTATION_FORBIDDEN' } });
  });
  app.use(application);

  return {
    account: ACCOUNT,
    app,
    config,
    creatorDonationWeight: CREATOR_DONATION_WEIGHT,
    merchantAccount: config.hive.officialAccount,
    merchantToken,
    mutationAttempts,
    rpcPool,
    setThreadsFundsAuthorized(value) {
      threadsFundsAuthorized = Boolean(value);
    },
    threadsLiquidHbd: THREADS_LIQUID_HBD,
    threadsLiquidHive: THREADS_LIQUID_HIVE,
    token,
  };
}

module.exports = { createUx1bVisualFixture };
