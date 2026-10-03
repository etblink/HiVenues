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

function publicLocals(snapshot, {
  publicRouteBase,
} = {}) {
  return {
    ...buildViewModel(snapshot),
    ...(typeof publicRouteBase === 'string' ? { publicRouteBase } : {}),
    publicCapabilities: Object.freeze({
      community: false,
      support: false,
    }),
  };
}

function requireDedicatedSnapshot(store, hostSlug) {
  const snapshot = store.publicSnapshot(hostSlug);
  if (!snapshot) return null;
  return snapshot;
}

function activityFor(snapshot, activitySlug) {
  return snapshot?.draft?.activities?.find((item) => item.slug === activitySlug) || null;
}

function canonicalActivityPath(activitySlug) {
  return '/activities/' + encodeURIComponent(activitySlug);
}

function createDeployedPublicRouter({
  store,
  hostSlug,
} = {}) {
  if (!store || typeof store.publicSnapshot !== 'function') {
    throw new TypeError('Deployed public router requires a Release-backed store.');
  }
  const dedicatedHostSlug = String(hostSlug || '').trim();
  if (!dedicatedHostSlug) {
    throw new TypeError('Deployed public router requires one dedicated host slug.');
  }

  const router = express.Router();
  const snapshot = () => requireDedicatedSnapshot(store, dedicatedHostSlug);

  router.get('/', (_req, res) => {
    const current = snapshot();
    if (!current) return res.sendStatus(404);
    const view = publicLocals(current, { publicRouteBase: '' });
    return res.render(view.family.publicTemplate, {
      pageTitle: view.graph.identity.displayName,
      ...view,
      studio: false,
    });
  });

  router.get('/activities/:activitySlug/calendar.ics', (req, res) => {
    const current = snapshot();
    const activity = activityFor(current, req.params.activitySlug);
    if (!current || !activity) return res.sendStatus(404);
    res.type('text/calendar; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${activity.slug}.ics"`);
    return res.send(renderIcs(current.draft, activity, { publicRouteBase: '' }));
  });

  router.post('/activities/:activitySlug/rsvp', (req, res) => {
    const current = snapshot();
    const activity = activityFor(current, req.params.activitySlug);
    if (!current || !activity) return res.sendStatus(404);
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
    const result = store.recordRsvp(dedicatedHostSlug, activity.id, req.body.name);
    if (!result.ok) return res.status(400).send(result.reason);
    if (req.get('HX-Request') === 'true') {
      return res.render('hivenues/fragments/rsvp-receipt', {
        term: current.draft.voice.terms.rsvp_local,
        activity,
      });
    }
    return res.redirect(
      303,
      canonicalActivityPath(activity.slug) + '?rsvp=recorded',
    );
  });

  router.get('/consequence/:mechanicId', (req, res) => {
    const current = snapshot();
    const mechanic = mechanicRegistry[req.params.mechanicId];
    if (!current || !mechanic) return res.sendStatus(404);
    return res.render('hivenues/consequence', {
      pageTitle: `${current.draft.voice.terms[mechanic.id] || mechanic.id} — ${current.draft.identity.displayName}`,
      ...publicLocals(current, { publicRouteBase: '' }),
      mechanic,
      term: current.draft.voice.terms[mechanic.id] || mechanic.id,
      disclosure: disclosureFor(mechanic.id, current.draft),
    });
  });

  router.get('/activities/:activitySlug', (req, res) => {
    const current = snapshot();
    if (!current) return res.sendStatus(404);
    const view = publicLocals(current, { publicRouteBase: '' });
    const activity = view.activities.find((item) => item.slug === req.params.activitySlug);
    if (!activity) return res.sendStatus(404);
    return res.render(view.family.activityTemplate, {
      pageTitle: `${activity.title} — ${view.graph.identity.displayName}`,
      ...view,
      activity,
    });
  });

  function rejectWrongLegacySlug(req, res) {
    if (req.params.slug !== dedicatedHostSlug) {
      res.sendStatus(404);
      return true;
    }
    return false;
  }

  router.get('/hivenues/:slug', (req, res) => {
    if (rejectWrongLegacySlug(req, res)) return;
    return res.redirect(308, '/');
  });

  router.get('/hivenues/:slug/activities/:activitySlug', (req, res) => {
    if (rejectWrongLegacySlug(req, res)) return;
    const current = snapshot();
    if (!activityFor(current, req.params.activitySlug)) return res.sendStatus(404);
    return res.redirect(308, canonicalActivityPath(req.params.activitySlug));
  });

  router.get('/hivenues/:slug/activities/:activitySlug/calendar.ics', (req, res) => {
    if (rejectWrongLegacySlug(req, res)) return;
    const current = snapshot();
    if (!activityFor(current, req.params.activitySlug)) return res.sendStatus(404);
    return res.redirect(308, canonicalActivityPath(req.params.activitySlug) + '/calendar.ics');
  });

  router.post('/hivenues/:slug/activities/:activitySlug/rsvp', (req, res) => {
    if (rejectWrongLegacySlug(req, res)) return;
    const current = snapshot();
    if (!activityFor(current, req.params.activitySlug)) return res.sendStatus(404);
    return res.redirect(308, canonicalActivityPath(req.params.activitySlug) + '/rsvp');
  });

  router.get('/hivenues/:slug/consequence/:mechanicId', (req, res) => {
    if (rejectWrongLegacySlug(req, res)) return;
    if (!mechanicRegistry[req.params.mechanicId]) return res.sendStatus(404);
    return res.redirect(
      308,
      '/consequence/' + encodeURIComponent(req.params.mechanicId),
    );
  });

  return router;
}

module.exports = {
  canonicalActivityPath,
  createDeployedPublicRouter,
  publicLocals,
};
