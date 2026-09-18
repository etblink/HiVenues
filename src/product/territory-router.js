'use strict';

const express = require('express');
const { buildViewModel, mediaFor } = require('./present');
const { buildTerritoryProjection, findTerritorySurface, rebaseTerritoryProjection, templateForSurface } = require('./territory');

function previewBase(graph) {
  return `/studio/studio/${encodeURIComponent(graph.identity.slug)}/preview`;
}

function territoryLocals(snapshot, { draftPreview = false } = {}) {
  const view = buildViewModel(snapshot);
  const graph = view.graph;
  const baseProjection = buildTerritoryProjection(graph);
  const territory = draftPreview ? rebaseTerritoryProjection(baseProjection, previewBase(graph)) : baseProjection;
  const people = graph.schemaVersion === 2 ? graph.people.map((profile) => ({ ...profile, media: profile.mediaId ? mediaFor(graph, profile.mediaId) : null })) : [];
  const peopleById = new Map(people.map((profile) => [profile.id, profile]));
  const stories = graph.schemaVersion === 2 ? graph.stories.map((story) => ({ ...story, media: story.mediaIds.map((id) => mediaFor(graph, id)).filter(Boolean), authors: story.authorProfileIds.map((id) => peopleById.get(id)).filter(Boolean) })) : [];
  const galleryMedia = graph.schemaVersion === 2 ? graph.gallery.mediaIds.map((id) => mediaFor(graph, id)).filter(Boolean) : [];
  return {
    ...view,
    territory,
    people,
    stories,
    galleryMedia,
    draftPreview,
    studio: false,
    activityPaths: Object.fromEntries(graph.activities.map((activity) => [activity.id, findTerritorySurface(territory, 'activity-detail', activity.slug)?.path || null])),
    storyPaths: Object.fromEntries(stories.map((story) => [story.id, findTerritorySurface(territory, 'story-detail', story.slug)?.path || null])),
    profilePaths: Object.fromEntries(people.map((profile) => [profile.id, findTerritorySurface(territory, 'profile-detail', profile.slug)?.path || null])),
  };
}

function pageTitleFor(view, surface, resource) {
  if (surface.role === 'about-visit') return `About — ${view.graph.identity.displayName}`;
  if (surface.role === 'gallery') return `${view.graph.gallery?.title || 'Gallery'} — ${view.graph.identity.displayName}`;
  if (surface.role.endsWith('-index') || surface.role === 'offers') return `${surface.label} — ${view.graph.identity.displayName}`;
  return `${resource?.title || resource?.displayName || surface.label} — ${view.graph.identity.displayName}`;
}

function resourceForSurface(view, surface) {
  if (!surface.resourceId) return null;
  if (surface.role === 'story-detail') return view.stories.find((item) => item.id === surface.resourceId) || null;
  if (surface.role === 'profile-detail') return view.people.find((item) => item.id === surface.resourceId) || null;
  return null;
}

function renderSurface(res, snapshot, role, resourceSlug, { draftPreview = false } = {}) {
  if (!snapshot) return res.sendStatus(404);
  const view = territoryLocals(snapshot, { draftPreview });
  const surface = findTerritorySurface(view.territory, role, resourceSlug);
  if (!surface) return res.sendStatus(404);
  const template = templateForSurface(view.territory, surface);
  if (!template) return res.sendStatus(404);
  const resource = resourceForSurface(view, surface);
  if (surface.kind === 'detail' && !resource) return res.sendStatus(404);
  return res.render(template, {
    ...view,
    surface,
    resource,
    story: surface.role === 'story-detail' ? resource : null,
    profile: surface.role === 'profile-detail' ? resource : null,
    pageTitle: `${pageTitleFor(view, surface, resource)}${draftPreview ? ' — draft preview' : ''}`,
  });
}

function installTerritoryRoutes(router, { store, draftPreview }) {
  const prefix = draftPreview ? '/studio/:slug/preview' : '/:slug';
  const snapshotFor = draftPreview ? (slug) => store.snapshot(slug) : (slug) => store.publicSnapshot(slug);
  const render = (role, param = null) => (req, res) => renderSurface(res, snapshotFor(req.params.slug), role, param ? req.params[param] : null, { draftPreview });
  router.get(`${prefix}/activities`, render('activities-index'));
  router.get(`${prefix}/offers`, render('offers'));
  router.get(`${prefix}/stories`, render('stories-index'));
  router.get(`${prefix}/stories/:storySlug`, render('story-detail', 'storySlug'));
  router.get(`${prefix}/gallery`, render('gallery'));
  router.get(`${prefix}/people`, render('people-index'));
  router.get(`${prefix}/people/:profileSlug`, render('profile-detail', 'profileSlug'));
  router.get(`${prefix}/about`, render('about-visit'));
}

function createHiVenuesPreviewTerritoryRouter({ store } = {}) {
  if (!store) throw new TypeError('HiVenues preview territory router requires a store.');
  const router = express.Router();
  installTerritoryRoutes(router, { store, draftPreview: true });
  return router;
}

function createHiVenuesPublicTerritoryRouter({ store } = {}) {
  if (!store) throw new TypeError('HiVenues public territory router requires a store.');
  const router = express.Router();
  installTerritoryRoutes(router, { store, draftPreview: false });
  return router;
}

module.exports = { createHiVenuesPreviewTerritoryRouter, createHiVenuesPublicTerritoryRouter, renderSurface, territoryLocals };
