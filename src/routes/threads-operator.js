'use strict';

const express = require('express');
const { buildThreadsFundsClaim } = require('../hive/threads-foundation');
const { AuthorizationError, ConflictError, FeatureUnavailableError, ValidationError } = require('../lib/errors');
const { requireAppOrigin, requireCsrf, requireSession } = require('../middleware/session');

const TRANSACTION_ID_PATTERN = /^[0-9a-f]{40}$/i;
const THREADS_FUNDS_ACTION = 'threads-funds-claim';

function threadsFundsAppError(error) {
  if (error?.code === 'NO_THREADS_FUNDS_TO_CLAIM') {
    return new ConflictError(error.message, { code: error.code });
  }
  if (
    error?.code === 'THREADS_ACTIVE_AUTH_REQUIRED' ||
    error?.code === 'THREADS_FUNDS_MERCHANT_SIGNER_REQUIRED'
  ) {
    return new AuthorizationError(error.message, { code: error.code });
  }
  if (error?.name === 'ValidationError') return new ValidationError(error.message);
  return error;
}

function requireMerchantSession(config) {
  return (req, _res, next) => {
    if (
      config.hive.writeMode !== 'beta' ||
      !config.hive.betaSelfSigningEnabled ||
      config.hive.signerMode !== 'keychain'
    ) {
      return next(new FeatureUnavailableError(
        'Threads funds claims require the accepted beta + Hive Keychain self-signing runtime.',
        { code: 'THREADS_FUNDS_RUNTIME_UNAVAILABLE' },
      ));
    }
    if (req.hiveSession?.account !== config.hive.officialAccount) {
      return next(new AuthorizationError('Only the venue merchant can claim Threads funds', {
        code: 'THREADS_FUNDS_MERCHANT_REQUIRED',
      }));
    }
    return next();
  };
}

function requireThreadsFundsRecord(store, id, sessionId) {
  const record = store.get(id, sessionId);
  if (record.action !== THREADS_FUNDS_ACTION) {
    throw new ValidationError('The prepared Threads funds action is invalid');
  }
  return record;
}

function createThreadsOperatorRouter({ config }) {
  const router = express.Router();
  const protectedWrite = [
    requireAppOrigin(config),
    requireSession,
    requireCsrf,
    requireMerchantSession(config),
  ];

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.post('/funds/preflight', ...protectedWrite, async (req, res, next) => {
    try {
      const accountRecord = await req.app.locals.services.hiveReads.getAccountRecord(
        config.hive.threadsContainerAccount,
      );
      const envelope = buildThreadsFundsClaim({
        venue: config.venue,
        accountRecord,
        signerAccount: req.hiveSession.account,
      });
      const preflight = req.app.locals.services.preflightStore.create({
        sessionId: req.hiveSession.id,
        envelope,
        signer: envelope.signer,
      });
      res.status(201).json({
        ...preflight,
        broadcastMode: 'manual-merchant-claim',
      });
    } catch (error) {
      next(threadsFundsAppError(error));
    }
  });

  router.post('/funds/preflight/:id/cancel', ...protectedWrite, (req, res, next) => {
    try {
      requireThreadsFundsRecord(
        req.app.locals.services.preflightStore,
        req.params.id,
        req.hiveSession.id,
      );
      req.app.locals.services.preflightStore.cancel(req.params.id, req.hiveSession.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.post('/funds/preflight/:id/accepted', ...protectedWrite, (req, res, next) => {
    try {
      requireThreadsFundsRecord(
        req.app.locals.services.preflightStore,
        req.params.id,
        req.hiveSession.id,
      );
      const rawTransactionId = req.body?.transactionId;
      const transactionId = rawTransactionId ? String(rawTransactionId) : null;
      if (transactionId && !TRANSACTION_ID_PATTERN.test(transactionId)) {
        throw new ValidationError('A valid Hive transaction id is required');
      }
      const preflight = req.app.locals.services.preflightStore.markAccepted(
        req.params.id,
        req.hiveSession.id,
        transactionId?.toLowerCase() || null,
      );
      req.log.info({
        merchant: req.hiveSession.account,
        sourceAccount: preflight.account,
        signer: preflight.signer,
        fingerprint: preflight.fingerprint,
        transactionId: preflight.transactionId,
      }, 'Manual Threads funds claim accepted by Keychain');
      res.json({
        ...preflight,
        message: transactionId
          ? 'Keychain approved the manual claim. Waiting for Hive to confirm it.'
          : 'Keychain approved the manual claim, but no transaction ID was returned. Do not try again yet.',
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/funds/preflight/:id/observe', ...protectedWrite, async (req, res, next) => {
    try {
      const record = requireThreadsFundsRecord(
        req.app.locals.services.preflightStore,
        req.params.id,
        req.hiveSession.id,
      );
      const observation = await req.app.locals.services.hiveReads.observeExactTransaction(record);
      const preflight = req.app.locals.services.preflightStore.markObserved(
        req.params.id,
        req.hiveSession.id,
        observation,
      );
      res.json({
        ...preflight,
        message: preflight.state === 'observed'
          ? 'Threads funds were claimed to the venue account.'
          : 'The manual claim is still waiting for Hive confirmation.',
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  THREADS_FUNDS_ACTION,
  createThreadsOperatorRouter,
  requireMerchantSession,
  requireThreadsFundsRecord,
  threadsFundsAppError,
};
