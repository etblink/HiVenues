'use strict';

const express = require('express');

const {
  activityLifecycles,
  disclosureFor,
  mechanicRegistry,
} = require('../product/model');
const {
  buildViewModel,
  renderIcs,
} = require('../product/present');

function publicLocals(snapshot) {
  return buildViewModel(snapshot);
}

function createDeployedPublicRouter({ store } = {}) {
  if (!store || typeof store.publicSnapshot !== 'function') {
    throw new TypeError('Deployed public router requires a Release-backed store.');
  }

  const router = express.Router();

  router.get('/', (req, res) => {
    const hosts = store.list()
      .map((slug) => store.publicSnapshot(slug))
      .filter(Boolean)
      .map(publicLocals);
    return res.render('hivenues/index', {
      pageTitle: 'HiVenues',
      hosts,
    });
  });

  router.get('/:slug/activities/:activitySlug/calendar.ics', (req, res) => {
    const snapshot = store.publicSnapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const activity = snapshot.draft.activities.find((item) => item.slug === req.params.activitySlug);
    if (!activity) return res.sendStatus(404);
    res.type('text/calendar; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${activity.slug}.ics"`);
    return res.send(renderIcs(snapshot.draft, activity));
  });

  router.post('/:slug/activities/:activitySlug/rsvp', (req, res) => {
    const snapshot = store.publicSnapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const activity = snapshot.draft.activities.find((item) => item.slug === req.params.activitySlug);
    if (!activity) return res.sendStatus(404);
    if (activity.lifecycle !== 'scheduled') {
      res.status(409);
      if (req.get('HX-Request') === 'true') {
        return res.render('hivenues/fragments/rsvp-closed', {
          activity,
          status: activityLifecycles[activity.lifecycle],
        });
      }
      return res.send('This activity is no longer taking RSVPs.');
    }
    const result = store.recordRsvp(req.params.slug, activity.id, req.body.name);
    if (!result.ok) return res.status(400).send(result.reason);
    if (req.get('HX-Request') === 'true') {
      return res.render('hivenues/fragments/rsvp-receipt', {
        term: snapshot.draft.voice.terms.rsvp_local,
        activity,
      });
    }
    return res.redirect(
      303,
      `/hivenues/${encodeURIComponent(req.params.slug)}/activities/${encodeURIComponent(activity.slug)}?rsvp=recorded`,
    );
  });

  router.get('/:slug/consequence/:mechanicId', (req, res) => {
    const snapshot = store.publicSnapshot(req.params.slug);
    const mechanic = mechanicRegistry[req.params.mechanicId];
    if (!snapshot || !mechanic) return res.sendStatus(404);
    return res.render('hivenues/consequence', {
      pageTitle: `${snapshot.draft.voice.terms[mechanic.id] || mechanic.id} — ${snapshot.draft.identity.displayName}`,
      ...publicLocals(snapshot),
      mechanic,
      term: snapshot.draft.voice.terms[mechanic.id] || mechanic.id,
      disclosure: disclosureFor(mechanic.id, snapshot.draft),
    });
  });

  router.get('/:slug/activities/:activitySlug', (req, res) => {
    const snapshot = store.publicSnapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const view = publicLocals(snapshot);
    const activity = view.activities.find((item) => item.slug === req.params.activitySlug);
    if (!activity) return res.sendStatus(404);
    return res.render(view.family.activityTemplate, {
      pageTitle: `${activity.title} — ${view.graph.identity.displayName}`,
      ...view,
      activity,
    });
  });

  router.get('/:slug', (req, res) => {
    const snapshot = store.publicSnapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const view = publicLocals(snapshot);
    return res.render(view.family.publicTemplate, {
      pageTitle: view.graph.identity.displayName,
      ...view,
      studio: false,
    });
  });

  return router;
}

module.exports = {
  createDeployedPublicRouter,
};
