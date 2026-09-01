'use strict';

const express = require('express');
const { loadHomeReadModel } = require('../home/read-model');
const { createOnboardingRouter } = require('./onboarding');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { services, venue } = req.app.locals;
    const { officialUpdates, communityPulse } = await loadHomeReadModel({
      services,
      venue,
      logger: req.log,
    });
    res.render('pages/home/index', {
      pageTitle: res.app.locals.siteName,
      officialUpdates,
      communityPulse,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/faq', (req, res) => {
  res.render('pages/faq/index', {
    pageTitle: `FAQ — ${res.app.locals.siteName}`,
  });
});

router.get('/pay', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.render('pages/pay/index', {
    pageTitle: `Pay — ${res.app.locals.siteName}`,
    payment: {
      enabled: req.app.locals.config.payments.enabled,
      merchants: req.app.locals.venue.hive.paymentMerchantAccounts,
    },
    distriator: req.app.locals.config.distriator,
  });
});

router.use(createOnboardingRouter());

module.exports = router;
