'use strict';

const express = require('express');
const { FeatureUnavailableError } = require('../src/lib/errors');
const { requireAppOrigin, requireCsrf, requireSession } = require('../src/middleware/session');
const { decodeHivePaymentInvoice } = require('../src/payments/invoice-decoder');
const { RECEIPT_STATES } = require('../src/payments/receipt-store');

function responseRecord(record, config, message) {
  const confirmed = record.state === RECEIPT_STATES.CHAIN_CONFIRMED;
  const distriatorHandoff = Object.freeze({
    available: confirmed,
    url: confirmed ? config.distriator.claimUrl : null,
    external: true,
  });
  return {
    ...record,
    paid: confirmed,
    distriatorHandoff,
    // Compatibility alias for already-qualified clients. Active product semantics use
    // distriatorHandoff; Hive-Bar does not determine Distriator eligibility or payout.
    rebate: distriatorHandoff,
    message,
  };
}

function requireBetaPaymentMode(config) {
  return (_req, _res, next) => {
    if (!config.payments.enabled) {
      const legacyControlledRequest = config.hive.writeMode === 'controlled';
      return next(
        new FeatureUnavailableError('Hive-Bar Pay is currently disabled.', {
          code: legacyControlledRequest ? 'CONTROLLED_ACTION_NOT_ALLOWED' : 'PAYMENT_DISABLED',
        }),
      );
    }
    if (config.hive.writeMode !== 'beta' || config.hive.signerMode !== 'keychain') {
      return next(
        new FeatureUnavailableError(
          'Hive-Bar Pay requires the accepted beta + Hive Keychain self-signing runtime.',
          { code: 'PAYMENT_RUNTIME_UNAVAILABLE' },
        ),
      );
    }
    return next();
  };
}

function requireMerchantBinding(config) {
  return (_req, _res, next) => {
    if (config.payments.merchantAccounts.length === 0) {
      return next(
        new FeatureUnavailableError('Hive-Bar Pay has no approved merchant destination.', {
          code: 'PAYMENT_MERCHANT_UNAVAILABLE',
        }),
      );
    }
    return next();
  };
}

function receiptStore(req) {
  const store = req.app.locals.services.receiptStore;
  if (!store) {
    throw new FeatureUnavailableError(
      'Hive-Bar Pay receipt storage is unavailable. Do not start or repeat a payment.',
      { code: 'PAYMENT_STORE_UNAVAILABLE' },
    );
  }
  return store;
}

function createPaymentRouter({ config, now = Date.now }) {
  const router = express.Router();
  const protectedReceipt = [requireAppOrigin(config), requireSession, requireCsrf];
  const protectedPayment = [
    ...protectedReceipt,
    requireBetaPaymentMode(config),
    requireMerchantBinding(config),
  ];

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/recent', requireSession, (req, res, next) => {
    try {
      const record = receiptStore(req).latest(
        req.hiveSession.id,
        req.hiveSession.account,
      );
      res.json(record ? responseRecord(record, config, 'Most recent durable receipt loaded.') : null);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', requireSession, (req, res, next) => {
    try {
      const record = receiptStore(req).get(
        req.params.id,
        req.hiveSession.id,
        req.hiveSession.account,
      );
      res.json(responseRecord(record, config, 'Durable receipt loaded.'));
    } catch (error) {
      next(error);
    }
  });

  router.post('/preflight', ...protectedPayment, (req, res, next) => {
    try {
      const envelope = decodeHivePaymentInvoice(req.body?.uri, {
        account: req.hiveSession.account,
        merchantAccounts: config.payments.merchantAccounts,
      });
      const record = receiptStore(req).createValidated({
        sessionId: req.hiveSession.id,
        envelope,
      });
      res.status(201).json(
        responseRecord(
          record,
          config,
          'Invoice validated. Review the immutable transfer before opening Hive Keychain.',
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/awaiting-signature', ...protectedPayment, (req, res, next) => {
    try {
      const record = receiptStore(req).markAwaitingSignature(
        req.params.id,
        req.hiveSession.id,
        req.hiveSession.account,
      );
      res.json(responseRecord(record, config, 'Exact review accepted; one Keychain request may open.'));
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/cancel', ...protectedReceipt, (req, res, next) => {
    try {
      const record = receiptStore(req).cancel(
        req.params.id,
        req.hiveSession.id,
        req.hiveSession.account,
      );
      res.json(responseRecord(record, config, 'Cancelled before broadcast acceptance. No second payment was created.'));
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/accepted', ...protectedReceipt, (req, res, next) => {
    try {
      const record = receiptStore(req).markBroadcastAccepted(
        req.params.id,
        req.hiveSession.id,
        req.body?.transactionId,
        req.hiveSession.account,
      );
      req.log.info(
        {
          account: record.account,
          merchant: record.merchant,
          amount: record.amount,
          fingerprint: record.fingerprint,
          transactionId: record.transactionId,
        },
        'Hive-Bar Pay broadcast accepted by Keychain',
      );
      res.json(
        responseRecord(
          record,
          config,
          record.transactionId
            ? 'Broadcast accepted by Keychain; payment is pending exact confirmation on two Hive nodes and irreversible settlement.'
            : 'Broadcast accepted without a transaction id. Do not retry; the receipt remains pending for manual reconciliation.',
        ),
      );
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/observe', ...protectedReceipt, async (req, res, next) => {
    try {
      let record = receiptStore(req).get(
        req.params.id,
        req.hiveSession.id,
        req.hiveSession.account,
      );
      const observation = record.transactionId
        ? await req.app.locals.services.paymentObserver.observe(record)
        : {
            status: 'pending',
            diagnostic: 'No transaction id was returned; do not retry and reconcile this pending receipt manually',
          };
      record = receiptStore(req).applyObservation(
        req.params.id,
        req.hiveSession.id,
        observation,
        req.hiveSession.account,
      );
      const broadcastAtMs = Date.parse(record.broadcastAt || '');
      if (
        record.state === RECEIPT_STATES.BROADCAST_ACCEPTED &&
        Number.isFinite(broadcastAtMs) &&
        now() - broadcastAtMs >= config.payments.confirmationTimeoutMs
      ) {
        record = receiptStore(req).markConfirmationTimeout(
          req.params.id,
          req.hiveSession.id,
          undefined,
          req.hiveSession.account,
        );
      }

      let message = record.diagnostic || 'Payment remains pending. Recheck the chain before paying again.';
      if (record.state === RECEIPT_STATES.CHAIN_CONFIRMED) {
        message = `Paid — exact transfer confirmed irreversibly on independent Hive nodes in block ${record.blockNumber}.`;
        req.log.info(
          {
            account: record.account,
            merchant: record.merchant,
            amount: record.amount,
            fingerprint: record.fingerprint,
            transactionId: record.transactionId,
            blockNumber: record.blockNumber,
          },
          'Hive-Bar Pay transfer irreversibly confirmed on two Hive nodes',
        );
      } else if (record.state === RECEIPT_STATES.CONFIRMATION_TIMEOUT) {
        message = 'Confirmation timed out. The receipt is still pending; recheck the chain and do not pay again.';
      }
      res.json(responseRecord(record, config, message));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createPaymentRouter,
  receiptStore,
  requireBetaPaymentMode,
  requireMerchantBinding,
  responseRecord,
};
