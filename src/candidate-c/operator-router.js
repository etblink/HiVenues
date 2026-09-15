'use strict';

const express = require('express');
const { buildCandidateCHostFromInput } = require('./admission');
const { buildViewModel } = require('./present');
const { provisionCandidateCHost } = require('./provision');
const { createCandidateCRouter } = require('./router');
const { CandidateCStore } = require('./store');

const EMPTY_FORM = Object.freeze({
  displayName: '',
  archetype: '',
  timezone: 'America/Los_Angeles',
  presenceMode: 'physical',
  presenceLabel: '',
  address: '',
  tagline: '',
  summary: '',
  contact: '',
  purpose: '',
  presenceMaterial: '',
  direction: 'hospitality',
  participation: '',
  activityTitle: '',
  activityDescription: '',
  activityStartsLocal: '',
  activityEndsLocal: '',
});

function renderNewHost(res, { status = 200, values = EMPTY_FORM, errors = [], reason = '' } = {}) {
  return res.status(status).render('candidate-c/new-host', {
    pageTitle: 'Create a place — HiVenues',
    values: { ...EMPTY_FORM, ...values },
    errors,
    reason,
  });
}

function createCandidateCOperatorRouter({ store = new CandidateCStore() } = {}) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const hosts = store.list().map((slug) => buildViewModel(store.publicSnapshot(slug)));
    return res.render('candidate-c/index', {
      pageTitle: 'Candidate C — HiVenues',
      hosts,
      canCreate: true,
    });
  });

  router.get('/new', (req, res) => renderNewHost(res));

  router.post('/new', (req, res) => {
    const built = buildCandidateCHostFromInput(req.body);
    if (!built.ok) {
      return renderNewHost(res, { status: 400, values: req.body, errors: built.fields || [], reason: built.reason });
    }

    const result = typeof store.createHost === 'function'
      ? store.createHost(built.graph)
      : provisionCandidateCHost(store, built.graph);
    if (!result.ok) {
      const status = ['HOST_SLUG_EXISTS', 'HOST_ID_EXISTS'].includes(result.reason) ? 409 : 400;
      return renderNewHost(res, {
        status,
        values: req.body,
        reason: result.reason,
        errors: [{ path: 'displayName', message: result.reason === 'HOST_SLUG_EXISTS' ? 'A place with this URL already exists.' : 'This place could not be created.' }],
      });
    }

    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(result.slug)}?created=1`);
  });

  router.use(createCandidateCRouter({ store }));
  router.store = store;
  return router;
}

module.exports = { createCandidateCOperatorRouter };
