'use strict';

const express = require('express');
const { activityLifecycles, disclosureFor, mechanicRegistry } = require('./model');
const { buildViewModel, compositionRegistry, renderIcs } = require('./present');
const { CandidateCStore } = require('./store');
const { describePath, unpublishedDraftPaths, verifyUrgentOperation } = require('./urgent');

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
    activityLifecycles,
    selectedResource,
  };
}

function urgentReviewLocals(snapshot, operation) {
  const view = candidateLocals(snapshot);
  const base = snapshot.releases.find((item) => item.id === operation.baseReleaseId) || null;
  const live = view.release;
  // Review renders from a fresh re-derivation against the immutable base Release,
  // verified equal to the persisted closure — never from persisted metadata alone.
  const verified = base ? verifyUrgentOperation(base, operation) : { ok: false, reason: 'NO_BASE' };
  const derived = verified.ok ? verified.derived : null;
  const baseIsLive = Boolean(derived && live && base.id === live.id && base.digest === operation.baseDigest);
  const liveActivity = derived ? derived.activity : null;
  const unpublished = live ? unpublishedDraftPaths(live.snapshot, snapshot.draft) : [];
  const changed = derived ? derived.closure.changed : [];
  const retained = derived ? derived.closure.retained : [];
  const carryPaths = new Set(changed);
  const afterActivity = derived ? derived.snapshot.activities.find((item) => item.id === operation.change.activityId) : null;
  const valueFor = (activity, path) => {
    if (!activity) return '—';
    if (path.endsWith('.lifecycle')) return activityLifecycles[activity.lifecycle].label;
    if (path.endsWith('.statusNote')) return activity.statusNote || '—';
    return '—';
  };
  return {
    ...view,
    operation,
    baseRelease: base,
    baseIsLive,
    provenanceVerified: verified.ok,
    provenanceFailure: verified.ok ? null : verified.reason,
    liveActivity,
    urgentSnapshot: derived ? derived.snapshot : null,
    closureProof: derived ? derived.proof : null,
    changedRows: changed.map((path) => ({
      path,
      ...describePath(path, base ? base.snapshot : null),
      before: valueFor(liveActivity, path),
      after: valueFor(afterActivity, path),
    })),
    retainedRows: retained.map((path) => ({ path, ...describePath(path, base ? base.snapshot : null) })),
    unpublishedRows: unpublished.filter((path) => !carryPaths.has(path)).map((path) => ({ path, ...describePath(path, snapshot.draft) })),
    draftAlsoEditsTarget: unpublished.some((path) => carryPaths.has(path)),
    describePath,
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
    const releasedNotice = typeof req.query.released === 'string' ? req.query.released : '';
    return res.render('candidate-c/studio', {
      pageTitle: `${snapshot.draft.identity.displayName} Studio — HiVenues`,
      ...candidateLocals(snapshot),
      releasedNotice: snapshot.releases.some((item) => item.id === releasedNotice) ? releasedNotice : '',
      releasedUrgent: req.query.urgent === '1',
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

  router.post('/studio/:slug/activity-status', (req, res) => {
    const result = store.editActivityStatus(
      req.params.slug,
      req.body.activityId,
      req.body.lifecycle,
      req.body.statusNote,
      currentRevision(req),
      currentDigest(req)
    );
    return mutationResponse(req, res, store, req.params.slug, result, `activity:${req.body.activityId}`);
  });

  // Workstream E — urgent operation from the live Release.
  router.get('/studio/:slug/urgent', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const view = candidateLocals(snapshot);
    if (!view.release) return res.sendStatus(409);
    const liveActivities = view.release.snapshot.activities;
    const requested = String(req.query.activity || '');
    const activity = liveActivities.find((item) => item.id === requested) || liveActivities[0] || null;
    const draftActivity = requested ? snapshot.draft.activities.find((item) => item.id === requested) : null;
    return res.render('candidate-c/urgent-compose', {
      pageTitle: `Urgent update — ${snapshot.draft.identity.displayName}`,
      ...view,
      liveActivities,
      activity,
      notLiveYet: Boolean(requested && !activity && draftActivity),
      noChange: req.query.nochange === '1',
    });
  });

  router.post('/studio/:slug/urgent', (req, res) => {
    const result = store.proposeUrgent(req.params.slug, {
      kind: 'activity-status',
      activityId: req.body.activityId,
      lifecycle: req.body.lifecycle,
      statusNote: req.body.statusNote,
    });
    if (!result.ok && result.reason === 'URGENT_NO_CHANGE') {
      return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/urgent?activity=${encodeURIComponent(String(req.body.activityId || ''))}&nochange=1`);
    }
    if (!result.ok) return res.status(result.reason === 'NOT_FOUND' ? 404 : 400).send(result.reason);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/urgent/${encodeURIComponent(result.operation.id)}`);
  });

  router.get('/studio/:slug/urgent/:operationId', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    const operation = store.urgentOperation(req.params.slug, req.params.operationId);
    if (!snapshot || !operation) return res.sendStatus(404);
    return res.render('candidate-c/urgent-review', {
      pageTitle: `Review urgent update — ${snapshot.draft.identity.displayName}`,
      ...urgentReviewLocals(snapshot, operation),
      failure: null,
    });
  });

  router.post('/studio/:slug/urgent/:operationId/publish', (req, res) => {
    const result = store.executeUrgent(
      req.params.slug,
      req.params.operationId,
      req.body.expectedLiveReleaseId,
      currentRevision(req),
      currentDigest(req)
    );
    if (result.ok) {
      return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}?released=${encodeURIComponent(result.release.id)}&urgent=1`);
    }
    if (result.reason === 'NOT_FOUND' || result.reason === 'URGENT_NOT_FOUND') return res.sendStatus(404);
    const snapshot = store.snapshot(req.params.slug);
    const operation = store.urgentOperation(req.params.slug, req.params.operationId);
    return res.status(409).render('candidate-c/urgent-review', {
      pageTitle: `Review urgent update — ${snapshot.draft.identity.displayName}`,
      ...urgentReviewLocals(snapshot, operation),
      failure: result,
    });
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
    return mutationResponse(req, res, store, req.params.slug, result, String(req.body.resource || ''));
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
    if (activity.lifecycle !== 'scheduled') {
      res.status(409);
      if (isHtmx(req)) {
        return res.render('candidate-c/fragments/rsvp-closed', { activity, status: activityLifecycles[activity.lifecycle] });
      }
      return res.send('This activity is no longer taking RSVPs.');
    }
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