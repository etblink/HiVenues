'use strict';

const crypto = require('node:crypto');
const express = require('express');
const { buildCandidateCHostFromInput, localDateTimeToOffsetIso, slugify } = require('./admission');
const { buildViewModel } = require('./present');
const { provisionCandidateCHost } = require('./provision');
const { createCandidateCRouter } = require('./router');
const { CandidateCStore } = require('./store');
const { createCandidateCTerritoryAuthoringRouter } = require('./territory-authoring-router');
const { createCandidateCTerritoryStructureAuthoringRouter } = require('./territory-structure-authoring-router');

const EMPTY_FORM = Object.freeze({
  displayName: '',
  archetype: '',
  timezone: 'America/Los_Angeles',
  presenceMode: 'physical',
  presenceLabel: '',
  address: '',
  tagline: '',
  summary: '',
  contact: '',
  purpose: '',
  presenceMaterial: '',
  direction: 'hospitality',
  participation: '',
  activityTitle: '',
  activityDescription: '',
  activityStartsLocal: '',
  activityEndsLocal: '',
});

const LOOK_ACCENTS = Object.freeze([
  Object.freeze({ label: 'Ember', value: '#ef9f55' }),
  Object.freeze({ label: 'Field violet', value: '#6e59c8' }),
  Object.freeze({ label: 'Warm clay', value: '#a65337' }),
  Object.freeze({ label: 'Harbor blue', value: '#244653' }),
  Object.freeze({ label: 'Garden moss', value: '#647a55' }),
  Object.freeze({ label: 'Bar Gold', value: '#f4a460' }),
]);

function renderNewHost(res, { status = 200, values = EMPTY_FORM, errors = [], reason = '' } = {}) {
  return res.status(status).render('candidate-c/new-host', {
    pageTitle: 'Create a place — HiVenues',
    values: { ...EMPTY_FORM, ...values },
    errors,
    reason,
  });
}

function draftMutation(store, slug, body, label, mutator, manualPaths) {
  const revision = Number(body.expectedRevision);
  const digest = typeof body.expectedDraftDigest === 'string' ? body.expectedDraftDigest : '';
  if (typeof store.draftMutation === 'function') {
    return store.draftMutation(slug, revision, digest, (innerStore) => (
      innerStore.commit(slug, revision, label, mutator, manualPaths, digest)
    ));
  }
  return store.commit(slug, revision, label, mutator, manualPaths, digest);
}

function requiredString(body, field, max, errors, label = field) {
  const value = String(body[field] || '').trim();
  if (!value) errors.push({ path: field, message: `${label} is required.` });
  if (value.length > max) errors.push({ path: field, message: `${label} must be ${max} characters or fewer.` });
  return value;
}

function renderMutationError(res, result) {
  const stale = ['STALE_REVISION', 'STALE_DIGEST', 'INVALID_REVISION', 'INVALID_DRAFT_DIGEST'].includes(result.reason);
  return res.status(stale ? 409 : 400).send(stale ? 'A newer working version exists. Reload before saving.' : result.reason);
}

function activityPresence(graph) {
  if (graph.facts.presence.mode === 'online') return { mode: 'online', platformLabel: graph.facts.presence.label };
  if (graph.facts.presence.mode === 'hybrid') {
    return {
      mode: 'hybrid',
      venueName: graph.identity.displayName,
      address: graph.facts.presence.address,
      platformLabel: graph.facts.presence.label,
    };
  }
  return {
    mode: 'physical',
    venueName: graph.identity.displayName,
    address: graph.facts.presence.address,
  };
}

function uniqueActivitySlug(graph, title) {
  const base = slugify(title) || 'activity';
  const existing = new Set(graph.activities.map((item) => item.slug));
  if (!existing.has(base)) return base;
  let suffix = 2;
  while (existing.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function createCandidateCOperatorRouter({ store = new CandidateCStore() } = {}) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const hosts = store.list().map((slug) => buildViewModel(store.publicSnapshot(slug)));
    return res.render('candidate-c/index', {
      pageTitle: 'Candidate C — HiVenues',
      hosts,
      canCreate: true,
    });
  });

  router.get('/new', (req, res) => renderNewHost(res));

  router.post('/new', (req, res) => {
    const built = buildCandidateCHostFromInput(req.body);
    if (!built.ok) {
      return renderNewHost(res, { status: 400, values: req.body, errors: built.fields || [], reason: built.reason });
    }

    const result = typeof store.createHost === 'function'
      ? store.createHost(built.graph)
      : provisionCandidateCHost(store, built.graph);
    if (!result.ok) {
      const status = ['HOST_SLUG_EXISTS', 'HOST_ID_EXISTS'].includes(result.reason) ? 409 : 400;
      return renderNewHost(res, {
        status,
        values: req.body,
        reason: result.reason,
        errors: [{ path: 'displayName', message: result.reason === 'HOST_SLUG_EXISTS' ? 'A place with this URL already exists.' : 'This place could not be created.' }],
      });
    }

    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(result.slug)}?created=1`);
  });

  router.get('/studio/:slug/content', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    return res.render('candidate-c/content-editor', {
      pageTitle: `Content & visit — ${snapshot.draft.identity.displayName}`,
      ...buildViewModel(snapshot),
      errors: [],
      saved: req.query.saved === '1',
    });
  });

  router.post('/studio/:slug/content', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const errors = [];
    const displayName = requiredString(req.body, 'displayName', 100, errors, 'Name');
    const archetype = requiredString(req.body, 'archetype', 120, errors, 'Type');
    const summary = requiredString(req.body, 'summary', 1200, errors, 'Summary');
    const presenceLabel = requiredString(req.body, 'presenceLabel', 240, errors, 'Presence line');
    const contact = requiredString(req.body, 'contact', 240, errors, 'Contact');
    const purpose = requiredString(req.body, 'purpose', 800, errors, 'Story purpose');
    const presenceMaterial = requiredString(req.body, 'presenceMaterial', 800, errors, 'Story / material copy');
    const participation = requiredString(req.body, 'participation', 800, errors, 'Participation copy');
    const address = String(req.body.address || '').trim();
    if (address.length > 300) errors.push({ path: 'address', message: 'Address must be 300 characters or fewer.' });
    if (snapshot.draft.facts.presence.mode !== 'online' && !address) errors.push({ path: 'address', message: 'A physical or hybrid place needs an address.' });
    if (errors.length) {
      return res.status(400).render('candidate-c/content-editor', {
        pageTitle: `Content & visit — ${snapshot.draft.identity.displayName}`,
        ...buildViewModel(snapshot),
        values: req.body,
        errors,
        saved: false,
      });
    }

    const result = draftMutation(store, req.params.slug, req.body, 'edit-public-content', (draft) => {
      draft.identity.displayName = displayName;
      draft.identity.archetype = archetype;
      draft.facts.summary = summary;
      draft.facts.presence.label = presenceLabel;
      if (address) draft.facts.presence.address = address; else delete draft.facts.presence.address;
      draft.facts.contact = contact;
      draft.intent.purpose = purpose;
      draft.intent.presenceMaterial = presenceMaterial;
      draft.intent.participation = participation;
    }, [
      'identity.displayName',
      'identity.archetype',
      'facts.summary',
      'facts.presence.label',
      'facts.presence.address',
      'facts.contact',
      'intent.purpose',
      'intent.presenceMaterial',
      'intent.participation',
    ]);
    if (!result.ok) return renderMutationError(res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/content?saved=1`);
  });

  router.get('/studio/:slug/activity/new', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    return res.render('candidate-c/activity-new', {
      pageTitle: `Add activity — ${snapshot.draft.identity.displayName}`,
      ...buildViewModel(snapshot),
      values: {},
      errors: [],
    });
  });

  router.post('/studio/:slug/activity/new', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const graph = snapshot.draft;
    const errors = [];
    const title = requiredString(req.body, 'title', 120, errors, 'Title');
    const description = requiredString(req.body, 'description', 1200, errors, 'Description');
    const startsLocal = requiredString(req.body, 'startsLocal', 40, errors, 'Start time');
    const endsLocal = requiredString(req.body, 'endsLocal', 40, errors, 'End time');
    let startsAt;
    let endsAt;
    if (!errors.length) {
      try {
        startsAt = localDateTimeToOffsetIso(startsLocal, graph.identity.timezone);
        endsAt = localDateTimeToOffsetIso(endsLocal, graph.identity.timezone);
        if (Date.parse(endsAt) <= Date.parse(startsAt)) errors.push({ path: 'endsLocal', message: 'End time must be after start time.' });
      } catch (_) {
        errors.push({ path: 'startsLocal', message: 'Choose real local times in the place timezone.' });
      }
    }
    if (errors.length) {
      return res.status(400).render('candidate-c/activity-new', {
        pageTitle: `Add activity — ${graph.identity.displayName}`,
        ...buildViewModel(snapshot),
        values: req.body,
        errors,
      });
    }
    const activityId = `activity-${graph.identity.slug}-${crypto.randomUUID()}`;
    const activitySlug = uniqueActivitySlug(graph, title);
    const heroMedia = graph.media.find((item) => item.id !== `media-${graph.identity.slug}-logo`) || graph.media[0];
    const result = draftMutation(store, req.params.slug, req.body, 'create-activity', (draft) => {
      draft.activities.push({
        id: activityId,
        slug: activitySlug,
        title,
        description,
        startsAt,
        endsAt,
        presence: activityPresence(draft),
        lifecycle: 'scheduled',
        mediaId: heroMedia.id,
        publicActions: [{ mechanic: 'rsvp_local' }, { mechanic: 'calendar_ics' }, { mechanic: 'applaud_hive' }],
      });
    }, [`activities.${activityId}`]);
    if (!result.ok) return renderMutationError(res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}`);
  });

  router.get('/studio/:slug/offer/new', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    return res.render('candidate-c/offer-new', {
      pageTitle: `Add offering — ${snapshot.draft.identity.displayName}`,
      ...buildViewModel(snapshot),
      values: {},
      errors: [],
    });
  });

  router.post('/studio/:slug/offer/new', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const errors = [];
    const title = requiredString(req.body, 'title', 160, errors, 'Name');
    const summary = requiredString(req.body, 'summary', 1200, errors, 'Description');
    const category = String(req.body.category || '').trim();
    const price = String(req.body.price || '').trim();
    if (category.length > 120) errors.push({ path: 'category', message: 'Category must be 120 characters or fewer.' });
    if (price.length > 80) errors.push({ path: 'price', message: 'Price/detail must be 80 characters or fewer.' });
    if (errors.length) {
      return res.status(400).render('candidate-c/offer-new', {
        pageTitle: `Add offering — ${snapshot.draft.identity.displayName}`,
        ...buildViewModel(snapshot),
        values: req.body,
        errors,
      });
    }
    const offerId = `offer-${snapshot.draft.identity.slug}-${crypto.randomUUID()}`;
    const result = draftMutation(store, req.params.slug, req.body, 'create-offer', (draft) => {
      draft.offers.push({ id: offerId, title, summary, ...(category ? { category } : {}), ...(price ? { price } : {}) });
    }, [`offers.${offerId}`]);
    if (!result.ok) return renderMutationError(res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}`);
  });

  router.get('/studio/:slug/brand', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    return res.render('candidate-c/brand-editor', {
      pageTitle: `Look — ${snapshot.draft.identity.displayName}`,
      ...buildViewModel(snapshot),
      accents: LOOK_ACCENTS,
    });
  });

  router.post('/studio/:slug/brand', (req, res) => {
    const accent = String(req.body.accent || '').toLowerCase();
    if (!LOOK_ACCENTS.some((item) => item.value === accent)) return res.status(400).send('Choose one of the supported brand accents.');
    const result = draftMutation(store, req.params.slug, req.body, 'edit-look', (draft) => {
      draft.presentation.accent = accent;
    }, ['presentation.accent']);
    if (!result.ok) return renderMutationError(res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}`);
  });

  router.get('/studio/:slug/media-library', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    return res.render('candidate-c/media-library', {
      pageTitle: `Media — ${snapshot.draft.identity.displayName}`,
      ...buildViewModel(snapshot),
    });
  });

  router.post('/studio/:slug/media-import', (req, res) => {
    if (typeof store.importLocalImage !== 'function') return res.status(501).json({ ok: false, reason: 'LOCAL_MEDIA_REQUIRES_DURABLE_DOGFOOD_STORE' });
    const result = store.importLocalImage(
      req.params.slug,
      req.body,
      Number(req.body.expectedRevision),
      String(req.body.expectedDraftDigest || '')
    );
    if (!result.ok) {
      const stale = ['STALE_REVISION', 'STALE_DIGEST', 'INVALID_REVISION', 'INVALID_DRAFT_DIGEST'].includes(result.reason);
      return res.status(stale ? 409 : 400).json({ ok: false, reason: result.reason, message: result.message || result.reason });
    }
    return res.json({
      ok: true,
      mediaRole: result.mediaRole,
      mediaId: result.mediaId,
      asset: result.asset,
      redirect: `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/media-library`,
    });
  });

  router.use(createCandidateCTerritoryStructureAuthoringRouter({ store }));
  router.use(createCandidateCTerritoryAuthoringRouter({ store }));
  router.use(createCandidateCRouter({ store }));
  router.store = store;
  return router;
}

module.exports = { createCandidateCOperatorRouter, draftMutation };
