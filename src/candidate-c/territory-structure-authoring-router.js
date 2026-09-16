'use strict';

const crypto = require('node:crypto');
const express = require('express');
const { localDateTimeToOffsetIso, slugify } = require('./admission');
const { buildViewModel } = require('./present');

const NAVIGATION_ROLES = Object.freeze([
  Object.freeze({ id: 'home', defaultLabel: 'Home', help: 'The territory front door.' }),
  Object.freeze({ id: 'activities', defaultLabel: 'Activities', help: 'Events, sessions and scheduled experiences.' }),
  Object.freeze({ id: 'stories', defaultLabel: 'Stories', help: 'Updates, dispatches and longer-form posts.' }),
  Object.freeze({ id: 'offers', defaultLabel: 'Offers', help: 'Menu, catalog or other host offerings.' }),
  Object.freeze({ id: 'gallery', defaultLabel: 'Gallery', help: 'A selected media collection.' }),
  Object.freeze({ id: 'people', defaultLabel: 'People', help: 'Public-facing host profiles.' }),
  Object.freeze({ id: 'about-visit', defaultLabel: 'About & visit', help: 'Identity, presence and contact information.' }),
]);

// Territory v2 stores the semantic presentation recipe that each bounded
// Direction represents. Keep this aligned with the defaults assigned when a
// v1 host explicitly enables Territory content.
const DIRECTION_RECIPE_BY_FAMILY = Object.freeze({
  poster: Object.freeze({ emphasis: 'events', density: 'dense', navigation: 'compact', mediaRhythm: 'hero-led' }),
  editorial: Object.freeze({ emphasis: 'stories', density: 'balanced', navigation: 'editorial', mediaRhythm: 'alternating' }),
  hospitality: Object.freeze({ emphasis: 'hospitality', density: 'airy', navigation: 'expanded', mediaRhythm: 'gallery-led' }),
});

function currentRevision(body) {
  return Number(body.expectedRevision);
}

function currentDigest(body) {
  return typeof body.expectedDraftDigest === 'string' ? body.expectedDraftDigest : '';
}

function draftMutation(store, slug, body, label, mutator, manualPaths = []) {
  const revision = currentRevision(body);
  const digest = currentDigest(body);
  try {
    if (typeof store.draftMutation === 'function') {
      return store.draftMutation(slug, revision, digest, (innerStore) => (
        innerStore.commit(slug, revision, label, mutator, manualPaths, digest)
      ));
    }
    return store.commit(slug, revision, label, mutator, manualPaths, digest);
  } catch (error) {
    return {
      ok: false,
      reason: 'INVALID_TERRITORY_STRUCTURE',
      message: error?.issues?.[0]?.message || error?.message || 'The territory change is invalid.',
    };
  }
}

function applyDirectionWithTerritoryRecipe(store, slug, proposalId, body) {
  const revision = currentRevision(body);
  const digest = currentDigest(body);
  const apply = (innerStore) => {
    const workspace = innerStore.workspace(slug);
    if (!workspace) return { ok: false, reason: 'NOT_FOUND' };
    const proposal = innerStore.proposal(slug, proposalId);
    if (!proposal) return { ok: false, reason: 'PROPOSAL_NOT_FOUND' };
    if (proposal.baseRevision !== workspace.revision) {
      return { ok: false, reason: 'STALE_REVISION', actualRevision: workspace.revision };
    }
    const result = innerStore.commit(slug, revision, 'apply-direction', (draft) => {
      draft.presentation.compositionFamily = proposal.familyId;
      draft.intent.direction = proposal.familyId;
      if (draft.schemaVersion === 2) {
        draft.presentation.recipe = { ...DIRECTION_RECIPE_BY_FAMILY[proposal.familyId] };
      }
    }, [], digest);
    if (result.ok) workspace.proposals.delete(proposalId);
    return result;
  };

  try {
    if (typeof store.draftMutation === 'function') {
      return store.draftMutation(slug, revision, digest, apply);
    }
    return apply(store);
  } catch (error) {
    return {
      ok: false,
      reason: 'INVALID_TERRITORY_STRUCTURE',
      message: error?.issues?.[0]?.message || error?.message || 'The Direction change is invalid.',
    };
  }
}

function mutationError(res, result) {
  const stale = ['STALE_REVISION', 'STALE_DIGEST', 'INVALID_REVISION', 'INVALID_DRAFT_DIGEST'].includes(result.reason);
  if (stale) return res.status(409).send('A newer working version exists. Reload before saving this change.');
  if (result.reason === 'NOT_FOUND') return res.sendStatus(404);
  return res.status(400).send(result.message || result.reason);
}

function requireV2(snapshot, res) {
  if (snapshot.draft.schemaVersion !== 2) {
    res.status(409).send('Enable territory content in this working draft before writing Updates or shaping navigation.');
    return false;
  }
  return true;
}

function listField(value) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}

function uniqueSlug(items, seed, fallback) {
  const base = slugify(seed) || fallback;
  const existing = new Set(items.map((item) => item.slug));
  if (!existing.has(base)) return base;
  let suffix = 2;
  while (existing.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function toLocalInput(iso, timezone) {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

function parsePublishedAt(body, timezone, errors) {
  const local = String(body.publishedLocal || '').trim();
  if (!local) return undefined;
  try {
    return localDateTimeToOffsetIso(local, timezone);
  } catch (_) {
    errors.push({ path: 'publishedLocal', message: 'Choose a real local date and time.' });
    return undefined;
  }
}

function deriveUpdateTitle(bodyText) {
  const compact = String(bodyText || '').replace(/\s+/g, ' ').trim();
  if (compact.length <= 72) return compact;
  return `${compact.slice(0, 69).trimEnd()}…`;
}

function parseUpdateInput(body, graph) {
  const errors = [];
  const bodyText = String(body.body || '').trim();
  if (!bodyText) errors.push({ path: 'body', message: 'Write an Update before saving.' });
  if (bodyText.length > 800) errors.push({ path: 'body', message: 'Updates must be 800 characters or fewer.' });
  const explicitTitle = String(body.title || '').trim();
  if (explicitTitle.length > 160) errors.push({ path: 'title', message: 'Update labels must be 160 characters or fewer.' });
  const title = explicitTitle || deriveUpdateTitle(bodyText);
  const authorProfileId = String(body.authorProfileId || '').trim();
  if (authorProfileId && !graph.people.some((profile) => profile.id === authorProfileId)) {
    errors.push({ path: 'authorProfileId', message: 'The selected person no longer exists.' });
  }
  const mediaIds = listField(body.mediaIds);
  const knownMediaIds = new Set(graph.media.map((item) => item.id));
  if (mediaIds.length > 4) errors.push({ path: 'mediaIds', message: 'Choose no more than 4 media items for an Update.' });
  for (const id of mediaIds) {
    if (!knownMediaIds.has(id)) errors.push({ path: 'mediaIds', message: 'One selected media item no longer exists.' });
  }
  const publishedAt = parsePublishedAt(body, graph.identity.timezone, errors);
  return {
    errors,
    value: {
      title,
      body: bodyText,
      publishedAt,
      authorProfileIds: authorProfileId ? [authorProfileId] : [],
      mediaIds,
    },
  };
}

function updateValues(update, graph) {
  if (!update) return {};
  return {
    title: update.title,
    body: update.body,
    publishedLocal: toLocalInput(update.publishedAt, graph.identity.timezone),
    authorProfileId: update.authorProfileIds[0] || '',
    mediaIds: update.mediaIds,
  };
}

function renderUpdateForm(res, snapshot, { status = 200, update = null, values = null, errors = [] } = {}) {
  return res.status(status).render('candidate-c/territory-update-form', {
    pageTitle: `${update ? 'Edit Update' : 'Write an Update'} — ${snapshot.draft.identity.displayName}`,
    ...buildViewModel(snapshot),
    update,
    values: values || updateValues(update, snapshot.draft),
    errors,
  });
}

function surfaceAvailable(graph, role) {
  if (role === 'home' || role === 'about-visit') return true;
  if (role === 'activities') return graph.activities.length > 0;
  if (role === 'stories') return graph.stories.length > 0;
  if (role === 'offers') return graph.offers.length > 0;
  if (role === 'gallery') return graph.gallery.mediaIds.length > 0;
  if (role === 'people') return graph.people.length > 0;
  return false;
}

function navigationRows(graph, values = null) {
  const currentOrder = new Map(graph.navigation.priorities.map((role, index) => [role, index + 1]));
  return NAVIGATION_ROLES.map((role, canonicalIndex) => ({
    ...role,
    order: values ? String(values[`order_${role.id}`] || currentOrder.get(role.id) || canonicalIndex + 1) : currentOrder.get(role.id) || canonicalIndex + 1,
    label: values ? String(values[`label_${role.id}`] || '') : graph.navigation.labels[role.id] || role.defaultLabel,
    available: surfaceAvailable(graph, role.id),
  }));
}

function parseNavigationInput(body, graph) {
  const errors = [];
  const rows = NAVIGATION_ROLES.map((role) => {
    const label = String(body[`label_${role.id}`] || '').trim();
    if (!label) errors.push({ path: `label_${role.id}`, message: `${role.defaultLabel} needs a visitor-facing label.` });
    if (label.length > 80) errors.push({ path: `label_${role.id}`, message: `${role.defaultLabel} labels must be 80 characters or fewer.` });
    const order = Number(body[`order_${role.id}`]);
    if (!Number.isInteger(order) || order < 1 || order > NAVIGATION_ROLES.length) {
      errors.push({ path: `order_${role.id}`, message: `${role.defaultLabel} order must be a whole number from 1 to ${NAVIGATION_ROLES.length}.` });
    }
    return { role: role.id, label, order };
  });
  const validOrders = rows.filter((row) => Number.isInteger(row.order)).map((row) => row.order);
  if (new Set(validOrders).size !== NAVIGATION_ROLES.length) {
    errors.push({ path: 'navigation', message: 'Use each navigation position exactly once.' });
  }
  const priorities = [...rows].sort((a, b) => a.order - b.order).map((row) => row.role);
  const labels = Object.fromEntries(rows.map((row) => [row.role, row.label]));
  return { errors, value: { priorities, labels }, rows: navigationRows(graph, body) };
}

function renderNavigationForm(res, snapshot, { status = 200, values = null, errors = [] } = {}) {
  return res.status(status).render('candidate-c/territory-navigation-form', {
    pageTitle: `Navigation — ${snapshot.draft.identity.displayName}`,
    ...buildViewModel(snapshot),
    navigationRows: navigationRows(snapshot.draft, values),
    errors,
  });
}

function createCandidateCTerritoryStructureAuthoringRouter({ store }) {
  if (!store) throw new TypeError('Territory structure authoring requires a Candidate C store.');
  const router = express.Router();

  router.get('/studio/:slug/territory-content/update/new', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    return renderUpdateForm(res, snapshot);
  });

  router.post('/studio/:slug/territory-content/update/new', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    const parsed = parseUpdateInput(req.body, snapshot.draft);
    if (parsed.errors.length) return renderUpdateForm(res, snapshot, { status: 400, values: req.body, errors: parsed.errors });
    const updateId = `story-${snapshot.draft.identity.slug}-${crypto.randomUUID()}`;
    const updateSlug = uniqueSlug(snapshot.draft.stories, parsed.value.title, 'update');
    const result = draftMutation(store, req.params.slug, req.body, 'create-update', (draft) => {
      draft.stories.push({
        id: updateId,
        slug: updateSlug,
        kind: 'update',
        title: parsed.value.title,
        body: parsed.value.body,
        ...(parsed.value.publishedAt ? { publishedAt: parsed.value.publishedAt } : {}),
        authorProfileIds: parsed.value.authorProfileIds,
        mediaIds: parsed.value.mediaIds,
      });
    }, [`stories.${updateId}`]);
    if (!result.ok) return mutationError(res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/territory-content?saved=1`);
  });

  router.get('/studio/:slug/territory-content/update/:updateId', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    const update = snapshot.draft.stories.find((item) => item.id === req.params.updateId && item.kind === 'update');
    if (!update) return res.sendStatus(404);
    return renderUpdateForm(res, snapshot, { update });
  });

  router.post('/studio/:slug/territory-content/update/:updateId', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    const update = snapshot.draft.stories.find((item) => item.id === req.params.updateId && item.kind === 'update');
    if (!update) return res.sendStatus(404);
    const parsed = parseUpdateInput(req.body, snapshot.draft);
    if (parsed.errors.length) return renderUpdateForm(res, snapshot, { status: 400, update, values: req.body, errors: parsed.errors });
    const result = draftMutation(store, req.params.slug, req.body, 'edit-update', (draft) => {
      const target = draft.stories.find((item) => item.id === update.id);
      target.title = parsed.value.title;
      target.body = parsed.value.body;
      if (parsed.value.publishedAt) target.publishedAt = parsed.value.publishedAt; else delete target.publishedAt;
      target.authorProfileIds = parsed.value.authorProfileIds;
      target.mediaIds = parsed.value.mediaIds;
    }, [
      `stories.${update.id}.title`,
      `stories.${update.id}.body`,
      `stories.${update.id}.publishedAt`,
      `stories.${update.id}.authorProfileIds`,
      `stories.${update.id}.mediaIds`,
    ]);
    if (!result.ok) return mutationError(res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/territory-content?saved=1`);
  });

  router.post('/studio/:slug/territory-content/update/:updateId/delete', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    const update = snapshot.draft.stories.find((item) => item.id === req.params.updateId && item.kind === 'update');
    if (!update) return res.sendStatus(404);
    const result = draftMutation(store, req.params.slug, req.body, 'delete-update', (draft) => {
      draft.stories = draft.stories.filter((item) => item.id !== update.id);
    }, [`stories.${update.id}`]);
    if (!result.ok) return mutationError(res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/territory-content?saved=1`);
  });

  router.get('/studio/:slug/territory-content/navigation', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    return renderNavigationForm(res, snapshot);
  });

  router.post('/studio/:slug/territory-content/navigation', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    const parsed = parseNavigationInput(req.body, snapshot.draft);
    if (parsed.errors.length) return renderNavigationForm(res, snapshot, { status: 400, values: req.body, errors: parsed.errors });
    const result = draftMutation(store, req.params.slug, req.body, 'edit-territory-navigation', (draft) => {
      draft.navigation.priorities = parsed.value.priorities;
      draft.navigation.labels = parsed.value.labels;
    }, ['navigation.priorities', 'navigation.labels']);
    if (!result.ok) return mutationError(res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/territory-content?saved=1`);
  });

  // Territory v2 Direction changes carry their bounded presentation recipe as
  // part of the same durable Working mutation. This route is registered before
  // the legacy Candidate C apply handler and deliberately preserves v1 behavior.
  router.post('/studio/:slug/direction/:proposalId/apply', (req, res) => {
    const result = applyDirectionWithTerritoryRecipe(store, req.params.slug, req.params.proposalId, req.body);
    if (!result.ok) return mutationError(res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}`);
  });

  return router;
}

module.exports = {
  DIRECTION_RECIPE_BY_FAMILY,
  NAVIGATION_ROLES,
  applyDirectionWithTerritoryRecipe,
  createCandidateCTerritoryStructureAuthoringRouter,
  deriveUpdateTitle,
};
