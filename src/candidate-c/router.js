'use strict';

const express = require('express');
const { disclosureFor, mechanicRegistry } = require('./model');
const { buildViewModel, compositionRegistry, renderIcs } = require('./present');
const { CandidateCStore } = require('./store');

function isHtmx(req) {
  return req.get('HX-Request') === 'true';
}

function currentRevision(req) {
  return Number(req.body.expectedRevision);
}

function renderConflict(req, res, actualRevision) {
  res.status(409);
  if (isHtmx(req)) {
    return res.render('candidate-c/fragments/conflict', { actualRevision });
  }
  return res.status(409).send('A newer Candidate C draft exists. Reload before saving this change.');
}

function candidateLocals(snapshot, selectedResource = '') {
  return {
    ...buildViewModel(snapshot),
    compositionRegistry,
    mechanicRegistry,
    selectedResource,
  };
}

function mutationResponse(req, res, store, slug, result, selectedResource) {
  if (!result.ok) {
    if (result.reason === 'STALE_REVISION') return renderConflict(req, res, result.actualRevision);
    return res.status(result.reason === 'NOT_FOUND' ? 404 : 400).send(result.reason);
  }
  if (isHtmx(req)) {
    return res.render('candidate-c/fragments/studio-update', candidateLocals(result.snapshot, selectedResource));
  }
  return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(slug)}`);
}

function createCandidateCRouter({ store = new CandidateCStore() } = {}) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set('X-HiVenues-Candidate-C', 'phase-2a');
    next();
  });

  router.get('/', (req, res) => {
    const hosts = store.list().map((slug) => buildViewModel(store.publicSnapshot(slug)));
    res.render('candidate-c/index', {
      pageTitle: 'Candidate C — HiVenues',
      hosts,
    });
  });

  router.get('/studio/:slug/setup', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    return res.render('candidate-c/setup', {
      pageTitle: `Shape ${snapshot.draft.identity.displayName} — HiVenues`,
      ...candidateLocals(snapshot),
    });
  });

  router.post('/studio/:slug/setup', (req, res) => {
    const result = store.completeSetup(req.params.slug, req.body, currentRevision(req));
    if (!result.ok) {
      if (result.reason === 'STALE_REVISION') return renderConflict(req, res, result.actualRevision);
      return res.status(400).send(result.reason);
    }
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}`);
  });

  router.get('/studio/:slug/preview', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const view = buildViewModel(snapshot);
    return res.render(view.family.publicTemplate, {
      pageTitle: `${view.graph.identity.displayName} — draft preview`,
      ...view,
      studio: false,
    });
  });

  router.get('/studio/:slug/direction', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    return res.render('candidate-c/direction', {
      pageTitle: `Direction — ${snapshot.draft.identity.displayName}`,
      ...candidateLocals(snapshot),
    });
  });

  router.get('/studio/:slug', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    return res.render('candidate-c/studio', {
      pageTitle: `${snapshot.draft.identity.displayName} Studio — HiVenues`,
      ...candidateLocals(snapshot),
    });
  });

  router.get('/studio/:slug/inspect', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    return res.render('candidate-c/fragments/inspector', candidateLocals(snapshot, String(req.query.resource || '')));
  });

  router.post('/studio/:slug/tagline', (req, res) => {
    const result = store.editTagline(req.params.slug, req.body.tagline, currentRevision(req));
    return mutationResponse(req, res, store, req.params.slug, result, 'facts.tagline');
  });

  router.post('/studio/:slug/activity', (req, res) => {
    const result = store.editActivity(req.params.slug, req.body.activityId, {
      title: req.body.title,
      description: req.body.description,
    }, currentRevision(req));
    return mutationResponse(req, res, store, req.params.slug, result, `activity:${req.body.activityId}`);
  });

  router.post('/studio/:slug/voice', (req, res) => {
    const result = store.editVoiceTerm(req.params.slug, req.body.mechanicId, req.body.term, currentRevision(req));
    return mutationResponse(req, res, store, req.params.slug, result, `voice:${req.body.mechanicId}`);
  });

  router.post('/studio/:slug/media', (req, res) => {
    const result = store.setFocal(req.params.slug, req.body.mediaId, req.body.x, req.body.y, currentRevision(req));
    return mutationResponse(req, res, store, req.params.slug, result, `media:${req.body.mediaId}`);
  });

  router.post('/studio/:slug/move', (req, res) => {
    const result = store.moveSection(req.params.slug, req.body.sectionId, req.body.delta, currentRevision(req));
    return mutationResponse(req, res, store, req.params.slug, result, 'page.order');
  });

  router.post('/studio/:slug/undo', (req, res) => {
    const result = store.undo(req.params.slug, currentRevision(req));
    return mutationResponse(req, res, store, req.params.slug, result, '');
  });

  router.post('/studio/:slug/direction/propose', (req, res) => {
    const result = store.proposeDirection(req.params.slug, req.body.familyId, currentRevision(req));
    if (!result.ok) {
      if (result.reason === 'STALE_REVISION') return renderConflict(req, res, result.actualRevision);
      return res.status(400).send(result.reason);
    }
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/direction/${encodeURIComponent(result.proposal.id)}`);
  });

  router.get('/studio/:slug/direction/:proposalId', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    const proposal = store.proposal(req.params.slug, req.params.proposalId);
    if (!snapshot || !proposal) return res.sendStatus(404);
    const proposedGraph = structuredClone(snapshot.draft);
    proposedGraph.presentation.compositionFamily = proposal.familyId;
    proposedGraph.intent.direction = proposal.familyId;
    const proposedSnapshot = { ...snapshot, draft: proposedGraph };
    return res.render('candidate-c/direction-review', {
      pageTitle: `Review direction — ${snapshot.draft.identity.displayName}`,
      proposal,
      current: candidateLocals(snapshot),
      proposed: candidateLocals(proposedSnapshot),
    });
  });

  router.post('/studio/:slug/direction/:proposalId/apply', (req, res) => {
    const result = store.applyDirection(req.params.slug, req.params.proposalId, currentRevision(req));
    if (!result.ok) {
      if (result.reason === 'STALE_REVISION') return renderConflict(req, res, result.actualRevision);
      return res.status(400).send(result.reason);
    }
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}`);
  });

  router.get('/studio/:slug/release', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    return res.render('candidate-c/release-review', {
      pageTitle: `Review release — ${snapshot.draft.identity.displayName}`,
      ...candidateLocals(snapshot),
    });
  });

  router.post('/studio/:slug/release', (req, res) => {
    const result = store.createRelease(req.params.slug, currentRevision(req));
    if (!result.ok) {
      if (result.reason === 'STALE_REVISION') return renderConflict(req, res, result.actualRevision);
      return res.status(400).send(result.reason);
    }
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}?released=${encodeURIComponent(result.release.id)}`);
  });

  router.post('/studio/:slug/releases/:releaseId/restore', (req, res) => {
    const result = store.restoreRelease(req.params.slug, req.params.releaseId, currentRevision(req));
    if (!result.ok) {
      if (result.reason === 'STALE_REVISION') return renderConflict(req, res, result.actualRevision);
      return res.status(400).send(result.reason);
    }
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}`);
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
    const result = store.recordRsvp(req.params.slug, activity.id, req.body.name);
    if (!result.ok) return res.status(400).send(result.reason);
    if (isHtmx(req)) {
      return res.render('candidate-c/fragments/rsvp-receipt', {
        term: snapshot.draft.voice.terms.rsvp_local,
        activity,
      });
    }
    return res.redirect(303, `/candidate-c/${encodeURIComponent(req.params.slug)}/activities/${encodeURIComponent(activity.slug)}?rsvp=recorded`);
  });

  router.get('/:slug/consequence/:mechanicId', (req, res) => {
    const snapshot = store.publicSnapshot(req.params.slug);
    const mechanic = mechanicRegistry[req.params.mechanicId];
    if (!snapshot || !mechanic) return res.sendStatus(404);
    return res.render('candidate-c/consequence', {
      pageTitle: `${snapshot.draft.voice.terms[mechanic.id] || mechanic.id} — ${snapshot.draft.identity.displayName}`,
      ...candidateLocals(snapshot),
      mechanic,
      term: snapshot.draft.voice.terms[mechanic.id] || mechanic.id,
      disclosure: disclosureFor(mechanic.id, snapshot.draft),
    });
  });

  router.get('/:slug/activities/:activitySlug', (req, res) => {
    const snapshot = store.publicSnapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const view = buildViewModel(snapshot);
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
    const view = buildViewModel(snapshot);
    return res.render(view.family.publicTemplate, {
      pageTitle: view.graph.identity.displayName,
      ...view,
      studio: false,
    });
  });

  router.store = store;
  return router;
}

module.exports = { createCandidateCRouter };
