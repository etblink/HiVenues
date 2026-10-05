'use strict';

const express = require('express');
const { documentInventory, documentUrl, renderDraftPage } = require('./draft-document');

const VIEWPORTS = Object.freeze({
  desktop: { width: 1200, height: 800, label: 'Desktop · 1200 × 800' },
  'desktop-short': { width: 1200, height: 600, label: 'Desktop · 1200 × 600' },
  phone: { width: 390, height: 720, label: 'Phone · 390 × 720' },
  'phone-short': { width: 390, height: 568, label: 'Phone · 390 × 568' },
});

function createAuthoringProofRouter({ store }) {
  const router = express.Router();
  router.use(['/studio/:slug/authoring-proof', '/studio/:slug/authoring-document'], (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).set('Allow', 'GET, HEAD').send('READ_ONLY_AUTHORING_PROOF');
    return next();
  });
  function context(req) {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return null;
    const base = '/hivenues/studio/' + encodeURIComponent(req.params.slug);
    const pages = documentInventory(snapshot, base + '/preview');
    const surface = pages.find((item) => item.key === (req.query.surface || 'home'));
    return surface ? { snapshot, base, pages, surface } : null;
  }
  router.get('/studio/:slug/authoring-document', (req, res) => {
    const ctx = context(req);
    if (!ctx) return res.sendStatus(404);
    return renderDraftPage(req, res, ctx.snapshot, { role: ctx.surface.role, resourceSlug: ctx.surface.resourceSlug, documentOnly: true });
  });
  router.get('/studio/:slug/authoring-proof', (req, res) => {
    const ctx = context(req);
    if (!ctx) return res.sendStatus(404);
    const viewportKey = req.query.viewport || 'desktop';
    const viewport = VIEWPORTS[viewportKey];
    const mode = req.query.mode || 'studio';
    if (!Object.hasOwn(VIEWPORTS, viewportKey) || !['studio', 'preview'].includes(mode)) return res.sendStatus(400);
    const identity = '&revision=' + ctx.snapshot.revision + '&digest=' + encodeURIComponent(ctx.snapshot.draftDigest);
    const documentPath = ctx.base + '/authoring-document?surface=' + encodeURIComponent(ctx.surface.key) + identity;
    res.set({
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; frame-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.render('hivenues/authoring-proof', {
      pageTitle: 'Document fidelity proof — ' + ctx.snapshot.draft.identity.displayName,
      ...ctx, viewportKey, viewport, viewports: VIEWPORTS, mode,
      framePath: mode === 'studio' ? documentPath : documentUrl(ctx.surface.path, ctx.snapshot),
    });
  });
  return router;
}

module.exports = { createAuthoringProofRouter, VIEWPORTS };
