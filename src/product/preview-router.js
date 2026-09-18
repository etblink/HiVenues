'use strict';

const express = require('express');
const { disclosureFor, mechanicRegistry } = require('./model');
const { buildViewModel, renderIcs } = require('./present');
const { createHiVenuesPreviewTerritoryRouter, createHiVenuesPublicTerritoryRouter, territoryLocals } = require('./territory-router');

function previewLocals(snapshot) {
  return { ...buildViewModel(snapshot), draftPreview: true, studio: false };
}

function previewActivityPath(slug, activitySlug) {
  return `/studio/studio/${encodeURIComponent(slug)}/preview/activities/${encodeURIComponent(activitySlug)}`;
}

function topLevelReviewSurface(view, key) {
  const surface = view.territory.surfaces.find((item) => item.key === key) || null;
  if (!surface) return null;
  return view.territory.navigation.some((entry) => entry.surfaceRole === surface.role) ? surface : null;
}

function createHiVenuesPreviewRouter({ store } = {}) {
  if (!store) throw new TypeError('HiVenues preview router requires a store.');
  const router = express.Router();

  // Studio review is a transient projection, never durable host state. HTMX swaps
  // this fragment into the existing canvas. A non-HTMX request falls back to the
  // ordinary full Preview so the route does not become a second Studio mode.
  router.get('/studio/:slug/review', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const requested = String(req.query.surface || 'canvas');
    const view = territoryLocals(snapshot, { draftPreview: true });
    res.set('Cache-Control', 'no-store');

    if (requested === 'canvas') {
      if (req.get('HX-Request') !== 'true') {
        return res.redirect(303, `/studio/studio/${encodeURIComponent(req.params.slug)}`);
      }
      return res.render('studio/fragments/studio-canvas', {
        ...view,
        selectedReviewKey: 'canvas',
      });
    }

    const surface = topLevelReviewSurface(view, requested);
    if (!surface) return res.status(400).send('UNKNOWN_STUDIO_REVIEW_SURFACE');
    if (req.get('HX-Request') !== 'true') return res.redirect(303, surface.path);
    return res.render('studio/fragments/territory-review', {
      ...view,
      surface,
      selectedReviewKey: surface.key,
    });
  });

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
    const publicActivityPath = `/studio/${snapshot.draft.identity.slug}/activities/${activity.slug}`;
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
    return res.render('studio/consequence', {
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
  router.use(createHiVenuesPreviewTerritoryRouter({ store }));
  router.use(createHiVenuesPublicTerritoryRouter({ store }));

  return router;
}

module.exports = { createHiVenuesPreviewRouter, previewActivityPath };
