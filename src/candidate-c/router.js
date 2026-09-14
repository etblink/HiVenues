'use strict';

const express = require('express');
const { disclosureFor, mechanicRegistry } = require('./model');
const { buildViewModel, compositionRegistry, renderIcs } = require('./present');
const { CandidateCStore } = require('./store');

const LOOK_ACCENTS = Object.freeze([
  Object.freeze({ id: 'ember', label: 'Ember', value: '#ef9f55' }),
  Object.freeze({ id: 'violet', label: 'Field violet', value: '#6e59c8' }),
  Object.freeze({ id: 'clay', label: 'Warm clay', value: '#a65337' }),
  Object.freeze({ id: 'harbor', label: 'Harbor blue', value: '#244653' }),
  Object.freeze({ id: 'moss', label: 'Garden moss', value: '#647a55' }),
]);

function isHtmx(req) {
  return req.get('HX-Request') === 'true';
}

function currentRevision(req) {
  return Number(req.body.expectedRevision);
}

function currentDigest(req) {
  return typeof req.body.expectedDraftDigest === 'string' ? req.body.expectedDraftDigest : '';
}

function renderConflict(req, res, actualRevision) {
  res.status(409);
  if (isHtmx(req)) {
    return res.render('candidate-c/fragments/conflict', { actualRevision });
  }
  return res.status(409).send('A newer version exists. Reload before saving this change.');
}

function candidateLocals(snapshot, selectedResource = '') {
  return {
    ...buildViewModel(snapshot),
    compositionRegistry,
    mechanicRegistry,
    lookAccents: LOOK_ACCENTS,
    selectedResource,
  };
}

function mutationFailure(req, res, result) {
  if (['STALE_REVISION', 'STALE_DIGEST', 'INVALID_REVISION', 'INVALID_DRAFT_DIGEST'].includes(result.reason)) {
    return renderConflict(req, res, result.actualRevision);
  }
  return res.status(result.reason === 'NOT_FOUND' ? 404 : 400).send(result.reason);
}

function mutationResponse(req, res, store, slug, result, selectedResource) {
  if (!result.ok) return mutationFailure(req, res, result);
  if (isHtmx(req)) {
    return res.render('candidate-c/fragments/studio-update', candidateLocals(result.snapshot, selectedResource));
  }
  return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(slug)}`);
}

function canonicalDraftMutation(store, slug, req, label, mutator, manualPaths) {
  const revision = currentRevision(req);
  const digest = currentDigest(req);
  if (typeof store.draftMutation === 'function') {
    return store.draftMutation(slug, revision, digest, (innerStore) => (
      innerStore.commit(slug, revision, label, mutator, manualPaths, digest)
    ));
  }
  return store.commit(slug, revision, label, mutator, manualPaths, digest);
}

function createCandidateCRouter({ store = new CandidateCStore() } = {}) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set('X-HiVenues-Candidate-C', 'phase-2b');
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
    const result = store.completeSetup(req.params.slug, req.body, currentRevision(req), currentDigest(req));
    if (!result.ok) return mutationFailure(req, res, result);
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
    const result = store.editTagline(req.params.slug, req.body.tagline, currentRevision(req), currentDigest(req));
    return mutationResponse(req, res, store, req.params.slug, result, 'facts.tagline');
  });

  router.post('/studio/:slug/activity', (req, res) => {
    const result = store.editActivity(req.params.slug, req.body.activityId, {
      title: req.body.title,
      description: req.body.description,
    }, currentRevision(req), currentDigest(req));
    return mutationResponse(req, res, store, req.params.slug, result, `activity:${req.body.activityId}`);
  });

  router.post('/studio/:slug/offer', (req, res) => {
    const offerId = String(req.body.offerId || '');
    const title = String(req.body.title || '').trim();
    const summary = String(req.body.summary || '').trim();
    if (!offerId || !title || !summary) return res.status(400).send('Offer title and description are required.');
    const category = String(req.body.category || '').trim();
    const price = String(req.body.price || '').trim();
    const result = canonicalDraftMutation(store, req.params.slug, req, 'edit-offer', (draft) => {
      const offer = draft.offers.find((item) => item.id === offerId);
      if (!offer) throw new Error('Offer not found');
      offer.title = title;
      offer.summary = summary;
      if (category) offer.category = category; else delete offer.category;
      if (price) offer.price = price; else delete offer.price;
    }, [
      `offers.${offerId}.title`,
      `offers.${offerId}.summary`,
      `offers.${offerId}.category`,
      `offers.${offerId}.price`,
    ]);
    return mutationResponse(req, res, store, req.params.slug, result, `offer:${offerId}`);
  });

  router.post('/studio/:slug/look', (req, res) => {
    const accent = String(req.body.accent || '').toLowerCase();
    if (!LOOK_ACCENTS.some((item) => item.value === accent)) return res.status(400).send('INVALID_LOOK_ACCENT');
    const result = canonicalDraftMutation(store, req.params.slug, req, 'edit-look', (draft) => {
      draft.presentation.accent = accent;
    }, ['presentation.accent']);
    return mutationResponse(req, res, store, req.params.slug, result, 'look');
  });

  router.post('/studio/:slug/voice', (req, res) => {
    const result = store.editVoiceTerm(req.params.slug, req.body.mechanicId, req.body.term, currentRevision(req), currentDigest(req));
    return mutationResponse(req, res, store, req.params.slug, result, `voice:${req.body.mechanicId}`);
  });

  router.post('/studio/:slug/connect', (req, res) => {
    const contact = String(req.body.contact || '').trim();
    if (!contact) return res.status(400).send('Contact is required.');
    const result = canonicalDraftMutation(store, req.params.slug, req, 'edit-contact', (draft) => {
      draft.facts.contact = contact;
    }, ['facts.contact']);
    return mutationResponse(req, res, store, req.params.slug, result, 'connect');
  });

  router.post('/studio/:slug/media', (req, res) => {
    const result = store.setFocal(req.params.slug, req.body.mediaId, req.body.x, req.body.y, currentRevision(req), currentDigest(req));
    return mutationResponse(req, res, store, req.params.slug, result, `media:${req.body.mediaId}`);
  });

  router.post('/studio/:slug/move', (req, res) => {
    const result = store.moveSection(req.params.slug, req.body.sectionId, req.body.delta, currentRevision(req), currentDigest(req));
    return mutationResponse(req, res, store, req.params.slug, result, 'page.order');
  });

  router.post('/studio/:slug/undo', (req, res) => {
    const result = store.undo(req.params.slug, currentRevision(req), currentDigest(req));
    return mutationResponse(req, res, store, req.params.slug, result, '');
  });

  router.post('/studio/:slug/direction/propose', (req, res) => {
    const result = store.proposeDirection(req.params.slug, req.body.familyId, currentRevision(req), currentDigest(req));
    if (!result.ok) return mutationFailure(req, res, result);
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
    const result = store.applyDirection(req.params.slug, req.params.proposalId, currentRevision(req), currentDigest(req));
    if (!result.ok) return mutationFailure(req, res, result);
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
    const result = store.createRelease(req.params.slug, currentRevision(req), currentDigest(req));
    if (!result.ok) return mutationFailure(req, res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}?released=${encodeURIComponent(result.release.id)}`);
  });

  router.post('/studio/:slug/releases/:releaseId/restore', (req, res) => {
    const result = store.restoreRelease(req.params.slug, req.params.releaseId, currentRevision(req), currentDigest(req));
    if (!result.ok) return mutationFailure(req, res, result);
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