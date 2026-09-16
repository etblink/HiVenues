'use strict';

const express = require('express');
const { disclosureFor, mechanicRegistry } = require('./model');
const { buildViewModel, renderIcs } = require('./present');
const { createCandidateCPreviewTerritoryRouter, createCandidateCPublicTerritoryRouter } = require('./territory-router');

function previewLocals(snapshot) {
  return { ...buildViewModel(snapshot), draftPreview: true, studio: false };
}

function previewActivityPath(slug, activitySlug) {
  return `/candidate-c/studio/${encodeURIComponent(slug)}/preview/activities/${encodeURIComponent(activitySlug)}`;
}

function createCandidateCPreviewRouter({ store } = {}) {
  if (!store) throw new TypeError('Candidate C preview router requires a store.');
  const router = express.Router();

  router.get('/studio/:slug/preview', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const view = previewLocals(snapshot);
    return res.render(view.family.publicTemplate, { pageTitle: `${view.graph.identity.displayName} — draft preview`, ...view });
  });

  router.get('/studio/:slug/preview/activities/:activitySlug', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const view = previewLocals(snapshot);
    const activity = view.activities.find((item) => item.slug === req.params.activitySlug);
    if (!activity) return res.sendStatus(404);
    return res.render(view.family.activityTemplate, { pageTitle: `${activity.title} — ${view.graph.identity.displayName} — draft preview`, ...view, activity });
  });

  router.get('/studio/:slug/preview/activities/:activitySlug/calendar.ics', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const activity = snapshot.draft.activities.find((item) => item.slug === req.params.activitySlug);
    if (!activity) return res.sendStatus(404);
    const publicActivityPath = `/candidate-c/${snapshot.draft.identity.slug}/activities/${activity.slug}`;
    const draftActivityPath = previewActivityPath(snapshot.draft.identity.slug, activity.slug);
    const calendar = renderIcs(snapshot.draft, activity).replace(`URL:${publicActivityPath}`, `URL:${draftActivityPath}`);
    res.type('text/calendar; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${activity.slug}-draft-preview.ics"`);
    res.set('Cache-Control', 'no-store');
    return res.send(calendar);
  });

  router.get('/studio/:slug/preview/consequence/:mechanicId', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    const mechanic = mechanicRegistry[req.params.mechanicId];
    if (!snapshot || !mechanic) return res.sendStatus(404);
    return res.render('candidate-c/consequence', {
      pageTitle: `${snapshot.draft.voice.terms[mechanic.id] || mechanic.id} — ${snapshot.draft.identity.displayName} — draft preview`,
      ...previewLocals(snapshot),
      mechanic,
      term: snapshot.draft.voice.terms[mechanic.id] || mechanic.id,
      disclosure: disclosureFor(mechanic.id, snapshot.draft),
    });
  });

  // #285 convergence seam: this top-level router already runs before the legacy
  // operator/public router in the qualified runtime. New semantic surfaces share
  // one implementation while their snapshot source stays explicit: Preview reads
  // Working, public territory routes read only the live Release. Existing qualified
  // home/activity/consequence routes above remain untouched.
  router.use(createCandidateCPreviewTerritoryRouter({ store }));
  router.use(createCandidateCPublicTerritoryRouter({ store }));

  return router;
}

module.exports = { createCandidateCPreviewRouter, previewActivityPath };
