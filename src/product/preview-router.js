'use strict';

const express = require('express');
const { renderIcs } = require('./present');
const { createHiVenuesPublicTerritoryRouter, territoryLocals } = require('./territory-router');

const { renderDraftPage } = require('./draft-document');

function previewActivityPath(slug, activitySlug) {
  return `/hivenues/studio/${encodeURIComponent(slug)}/preview/activities/${encodeURIComponent(activitySlug)}`;
}

function topLevelReviewSurface(view, key) {
  const surface = view.territory.surfaces.find((item) => item.key === key) || null;
  if (!surface) return null;
  return view.territory.navigation.some((entry) => entry.surfaceRole === surface.role) ? surface : null;
}

function createHiVenuesPreviewRouter({ store, allowDocumentMode = false } = {}) {
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
        return res.redirect(303, `/hivenues/studio/${encodeURIComponent(req.params.slug)}`);
      }
      return res.render('hivenues/fragments/studio-canvas', {
        ...view,
        selectedReviewKey: 'canvas',
      });
    }

    const surface = topLevelReviewSurface(view, requested);
    if (!surface) return res.status(400).send('UNKNOWN_STUDIO_REVIEW_SURFACE');
    if (req.get('HX-Request') !== 'true') return res.redirect(303, surface.path);
    return res.render('hivenues/fragments/territory-review', {
      ...view,
      surface,
      selectedReviewKey: surface.key,
    });
  });

  const render = (role, param = null) => (req, res) => {
    const documentOnly = req.query.document === '1';
    if ('document' in req.query && (!allowDocumentMode || !documentOnly)) return res.sendStatus(404);
    return renderDraftPage(req, res, store.snapshot(req.params.slug), {
      role, resourceSlug: param ? req.params[param] : null, documentOnly,
    });
  };
  router.get('/studio/:slug/preview', render('home'));
  router.get('/studio/:slug/preview/activities/:activitySlug', render('activity-detail', 'activitySlug'));
  router.get('/studio/:slug/preview/activities', render('activities-index'));
  router.get('/studio/:slug/preview/offers', render('offers'));
  router.get('/studio/:slug/preview/stories', render('stories-index'));
  router.get('/studio/:slug/preview/stories/:storySlug', render('story-detail', 'storySlug'));
  router.get('/studio/:slug/preview/gallery', render('gallery'));
  router.get('/studio/:slug/preview/people', render('people-index'));
  router.get('/studio/:slug/preview/people/:profileSlug', render('profile-detail', 'profileSlug'));
  router.get('/studio/:slug/preview/about', render('about-visit'));
  router.get('/studio/:slug/preview/consequence/:mechanicId', render('consequence', 'mechanicId'));

  router.get('/studio/:slug/preview/activities/:activitySlug/calendar.ics', (req, res) => {
    if ('document' in req.query) return res.sendStatus(404);
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const activity = snapshot.draft.activities.find((item) => item.slug === req.params.activitySlug);
    if (!activity) return res.sendStatus(404);
    const draftRouteBase = res.locals.previewRouteBase || `/hivenues/studio/${encodeURIComponent(snapshot.draft.identity.slug)}/preview`;
    const calendar = renderIcs(snapshot.draft, activity, {
      publicRouteBase: draftRouteBase,
    });
    res.type('text/calendar; charset=utf-8');
    res.set('Content-Disposition', `attachment; filename="${activity.slug}-draft-preview.ics"`);
    res.set('Cache-Control', 'no-store');
    return res.send(calendar);
  });

  // Public territory continues to read only immutable live Release snapshots.
  router.use(createHiVenuesPublicTerritoryRouter({ store }));

  return router;
}

module.exports = { createHiVenuesPreviewRouter, previewActivityPath };
