'use strict';

const crypto = require('node:crypto');
const express = require('express');
const { localDateTimeToOffsetIso, slugify } = require('./admission');
const { buildViewModel } = require('./present');

const TERRITORY_PRIORITIES = Object.freeze([
  'home',
  'activities',
  'stories',
  'offers',
  'gallery',
  'people',
  'about-visit',
]);

const TERRITORY_LABELS = Object.freeze({
  home: 'Home',
  activities: 'Activities',
  stories: 'Stories',
  offers: 'Offers',
  gallery: 'Gallery',
  people: 'People',
  'about-visit': 'About & visit',
});

const RECIPE_BY_FAMILY = Object.freeze({
  poster: Object.freeze({ emphasis: 'events', density: 'dense', navigation: 'compact', mediaRhythm: 'hero-led' }),
  editorial: Object.freeze({ emphasis: 'stories', density: 'balanced', navigation: 'editorial', mediaRhythm: 'alternating' }),
  hospitality: Object.freeze({ emphasis: 'hospitality', density: 'airy', navigation: 'expanded', mediaRhythm: 'gallery-led' }),
});

const STORY_KINDS = Object.freeze([
  Object.freeze({ id: 'update', label: 'Update', help: 'A short timely note.' }),
  Object.freeze({ id: 'dispatch', label: 'Dispatch', help: 'A field note or recurring host post.' }),
  Object.freeze({ id: 'essay', label: 'Essay', help: 'A longer-form story.' }),
]);

function listField(value) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}

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
      reason: 'INVALID_TERRITORY_CONTENT',
      message: error?.issues?.[0]?.message || error?.message || 'The territory change is invalid.',
    };
  }
}

function mutationError(res, result) {
  const stale = ['STALE_REVISION', 'STALE_DIGEST', 'INVALID_REVISION', 'INVALID_DRAFT_DIGEST'].includes(result.reason);
  if (stale) return res.status(409).send('A newer working version exists. Reload before saving this change.');
  if (result.reason === 'NOT_FOUND') return res.sendStatus(404);
  return res.status(400).send(result.message || result.reason);
}

function defaultRecipe(graph) {
  return { ...RECIPE_BY_FAMILY[graph.presentation.compositionFamily] };
}

function upgradeGraphToV2(graph) {
  if (graph.schemaVersion === 2) return structuredClone(graph);
  return {
    schemaVersion: 2,
    identity: structuredClone(graph.identity),
    facts: structuredClone(graph.facts),
    activities: structuredClone(graph.activities),
    offers: structuredClone(graph.offers),
    stories: [],
    people: [],
    gallery: {
      title: 'Gallery',
      summary: 'Media selected in Studio will appear here.',
      mediaIds: [],
    },
    media: structuredClone(graph.media),
    voice: structuredClone(graph.voice),
    presentation: {
      ...structuredClone(graph.presentation),
      recipe: defaultRecipe(graph),
    },
    navigation: {
      priorities: [...TERRITORY_PRIORITIES],
      labels: { ...TERRITORY_LABELS },
    },
    bindings: structuredClone(graph.bindings),
    intent: structuredClone(graph.intent),
  };
}

function authoringLocals(snapshot, extra = {}) {
  const graph = snapshot.draft;
  return {
    ...buildViewModel(snapshot),
    storyKinds: STORY_KINDS,
    isTerritoryV2: graph.schemaVersion === 2,
    ...extra,
  };
}

function requiredString(body, field, max, errors, label = field) {
  const value = String(body[field] || '').trim();
  if (!value) errors.push({ path: field, message: `${label} is required.` });
  if (value.length > max) errors.push({ path: field, message: `${label} must be ${max} characters or fewer.` });
  return value;
}

function optionalString(body, field, max, errors, label = field) {
  const value = String(body[field] || '').trim();
  if (value.length > max) errors.push({ path: field, message: `${label} must be ${max} characters or fewer.` });
  return value;
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

function parseStoryInput(body, graph) {
  const errors = [];
  const title = requiredString(body, 'title', 160, errors, 'Title');
  const dek = optionalString(body, 'dek', 320, errors, 'Summary');
  const bodyText = requiredString(body, 'body', 16000, errors, 'Story body');
  const kind = String(body.kind || 'update');
  if (!STORY_KINDS.some((item) => item.id === kind)) errors.push({ path: 'kind', message: 'Choose a supported story type.' });
  const authorProfileIds = listField(body.authorProfileIds);
  const mediaIds = listField(body.mediaIds);
  const peopleIds = new Set(graph.people.map((item) => item.id));
  const knownMediaIds = new Set(graph.media.map((item) => item.id));
  if (authorProfileIds.length > 8) errors.push({ path: 'authorProfileIds', message: 'Choose no more than 8 people.' });
  if (mediaIds.length > 24) errors.push({ path: 'mediaIds', message: 'Choose no more than 24 media items.' });
  for (const id of authorProfileIds) if (!peopleIds.has(id)) errors.push({ path: 'authorProfileIds', message: 'One selected person no longer exists.' });
  for (const id of mediaIds) if (!knownMediaIds.has(id)) errors.push({ path: 'mediaIds', message: 'One selected media item no longer exists.' });
  const publishedAt = parsePublishedAt(body, graph.identity.timezone, errors);
  return { errors, value: { title, dek, body: bodyText, kind, authorProfileIds, mediaIds, publishedAt } };
}

function rawListField(value) {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (value === undefined || value === null) return [];
  return [String(value)];
}

function linkRowsFromBody(body) {
  const labels = rawListField(body.linkLabel);
  const urls = rawListField(body.linkUrl);
  const count = Math.max(labels.length, urls.length);
  return Array.from({ length: count }, (_, index) => ({ label: labels[index] || '', url: urls[index] || '' }));
}

function parseProfileInput(body, graph) {
  const errors = [];
  const displayName = requiredString(body, 'displayName', 120, errors, 'Name');
  const role = optionalString(body, 'role', 160, errors, 'Role');
  const bio = requiredString(body, 'bio', 2000, errors, 'Bio');
  const mediaId = String(body.mediaId || '').trim();
  if (mediaId && !graph.media.some((item) => item.id === mediaId)) errors.push({ path: 'mediaId', message: 'Choose media that still exists in this host.' });
  const links = [];
  const rows = linkRowsFromBody(body);
  if (rows.length > 12) errors.push({ path: 'links', message: 'Use no more than 12 links.' });
  for (const [index, row] of rows.entries()) {
    if (!row.label && !row.url) continue;
    if (!row.label || !row.url) {
      errors.push({ path: `links.${index + 1}`, message: 'Each link needs both a label and URL.' });
      continue;
    }
    if (row.label.length > 80) errors.push({ path: `links.${index + 1}`, message: 'Link labels must be 80 characters or fewer.' });
    try {
      const url = new URL(row.url);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
      links.push({ label: row.label, url: url.toString() });
    } catch (_) {
      errors.push({ path: `links.${index + 1}`, message: 'Use a complete http:// or https:// URL.' });
    }
  }
  return { errors, value: { displayName, role, bio, mediaId, links }, rows };
}

function storyValues(story, graph) {
  if (!story) return {};
  return {
    ...story,
    publishedLocal: toLocalInput(story.publishedAt, graph.identity.timezone),
  };
}

function profileLinkRows(profile, minimumRows = 2) {
  const links = profile?.links ? structuredClone(profile.links) : [];
  while (links.length < minimumRows) links.push({ label: '', url: '' });
  return links;
}

function renderStoryForm(res, snapshot, { status = 200, story = null, values = null, errors = [] } = {}) {
  return res.status(status).render('candidate-c/territory-story-form', authoringLocals(snapshot, {
    pageTitle: `${story ? 'Edit story' : 'Add story'} — ${snapshot.draft.identity.displayName}`,
    story,
    values: values || storyValues(story, snapshot.draft),
    errors,
  }));
}

function renderProfileForm(res, snapshot, { status = 200, profile = null, values = null, errors = [], linkRows = null } = {}) {
  return res.status(status).render('candidate-c/territory-profile-form', authoringLocals(snapshot, {
    pageTitle: `${profile ? 'Edit person' : 'Add person'} — ${snapshot.draft.identity.displayName}`,
    profile,
    values: values || profile || {},
    errors,
    linkRows: linkRows || profileLinkRows(profile),
  }));
}

function requireV2(snapshot, res) {
  if (snapshot.draft.schemaVersion !== 2) {
    res.status(409).send('Enable territory content in this working draft before adding stories, people or gallery selections.');
    return false;
  }
  return true;
}

function createCandidateCTerritoryAuthoringRouter({ store }) {
  if (!store) throw new TypeError('Territory authoring requires a Candidate C store.');
  const router = express.Router();

  router.get('/studio/:slug/territory-content', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    return res.render('candidate-c/territory-content', authoringLocals(snapshot, {
      pageTitle: `Territory content — ${snapshot.draft.identity.displayName}`,
      upgraded: req.query.upgraded === '1',
      saved: req.query.saved === '1',
    }));
  });

  router.post('/studio/:slug/territory-content/enable', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (snapshot.draft.schemaVersion === 2) {
      return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/territory-content`);
    }
    const result = draftMutation(store, req.params.slug, req.body, 'enable-territory-v2', (draft) => {
      const upgraded = upgradeGraphToV2(draft);
      for (const key of Object.keys(draft)) delete draft[key];
      Object.assign(draft, upgraded);
    }, ['schemaVersion', 'stories', 'people', 'gallery', 'navigation', 'presentation.recipe']);
    if (!result.ok) return mutationError(res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/territory-content?upgraded=1`);
  });

  router.get('/studio/:slug/territory-content/story/new', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    return renderStoryForm(res, snapshot);
  });

  router.post('/studio/:slug/territory-content/story/new', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    const parsed = parseStoryInput(req.body, snapshot.draft);
    if (parsed.errors.length) return renderStoryForm(res, snapshot, { status: 400, values: req.body, errors: parsed.errors });
    const storyId = `story-${snapshot.draft.identity.slug}-${crypto.randomUUID()}`;
    const storySlug = uniqueSlug(snapshot.draft.stories, parsed.value.title, 'story');
    const result = draftMutation(store, req.params.slug, req.body, 'create-story', (draft) => {
      draft.stories.push({
        id: storyId,
        slug: storySlug,
        kind: parsed.value.kind,
        title: parsed.value.title,
        ...(parsed.value.dek ? { dek: parsed.value.dek } : {}),
        body: parsed.value.body,
        ...(parsed.value.publishedAt ? { publishedAt: parsed.value.publishedAt } : {}),
        authorProfileIds: parsed.value.authorProfileIds,
        mediaIds: parsed.value.mediaIds,
      });
    }, [`stories.${storyId}`]);
    if (!result.ok) return mutationError(res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/territory-content?saved=1`);
  });

  router.get('/studio/:slug/territory-content/story/:storyId', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    const story = snapshot.draft.stories.find((item) => item.id === req.params.storyId);
    if (!story) return res.sendStatus(404);
    return renderStoryForm(res, snapshot, { story });
  });

  router.post('/studio/:slug/territory-content/story/:storyId', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    const story = snapshot.draft.stories.find((item) => item.id === req.params.storyId);
    if (!story) return res.sendStatus(404);
    const parsed = parseStoryInput(req.body, snapshot.draft);
    if (parsed.errors.length) return renderStoryForm(res, snapshot, { status: 400, story, values: req.body, errors: parsed.errors });
    const result = draftMutation(store, req.params.slug, req.body, 'edit-story', (draft) => {
      const target = draft.stories.find((item) => item.id === story.id);
      target.kind = parsed.value.kind;
      target.title = parsed.value.title;
      if (parsed.value.dek) target.dek = parsed.value.dek; else delete target.dek;
      target.body = parsed.value.body;
      if (parsed.value.publishedAt) target.publishedAt = parsed.value.publishedAt; else delete target.publishedAt;
      target.authorProfileIds = parsed.value.authorProfileIds;
      target.mediaIds = parsed.value.mediaIds;
    }, [
      `stories.${story.id}.kind`,
      `stories.${story.id}.title`,
      `stories.${story.id}.dek`,
      `stories.${story.id}.body`,
      `stories.${story.id}.publishedAt`,
      `stories.${story.id}.authorProfileIds`,
      `stories.${story.id}.mediaIds`,
    ]);
    if (!result.ok) return mutationError(res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/territory-content?saved=1`);
  });

  router.post('/studio/:slug/territory-content/story/:storyId/delete', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    const story = snapshot.draft.stories.find((item) => item.id === req.params.storyId);
    if (!story) return res.sendStatus(404);
    const result = draftMutation(store, req.params.slug, req.body, 'delete-story', (draft) => {
      draft.stories = draft.stories.filter((item) => item.id !== story.id);
    }, [`stories.${story.id}`]);
    if (!result.ok) return mutationError(res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/territory-content?saved=1`);
  });

  router.get('/studio/:slug/territory-content/profile/new', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    return renderProfileForm(res, snapshot);
  });

  router.post('/studio/:slug/territory-content/profile/new', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    const parsed = parseProfileInput(req.body, snapshot.draft);
    if (parsed.errors.length) return renderProfileForm(res, snapshot, { status: 400, values: req.body, errors: parsed.errors, linkRows: parsed.rows });
    const profileId = `person-${snapshot.draft.identity.slug}-${crypto.randomUUID()}`;
    const profileSlug = uniqueSlug(snapshot.draft.people, parsed.value.displayName, 'person');
    const result = draftMutation(store, req.params.slug, req.body, 'create-profile', (draft) => {
      draft.people.push({
        id: profileId,
        slug: profileSlug,
        displayName: parsed.value.displayName,
        ...(parsed.value.role ? { role: parsed.value.role } : {}),
        bio: parsed.value.bio,
        ...(parsed.value.mediaId ? { mediaId: parsed.value.mediaId } : {}),
        links: parsed.value.links,
      });
    }, [`people.${profileId}`]);
    if (!result.ok) return mutationError(res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/territory-content?saved=1`);
  });

  router.get('/studio/:slug/territory-content/profile/:profileId', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    const profile = snapshot.draft.people.find((item) => item.id === req.params.profileId);
    if (!profile) return res.sendStatus(404);
    return renderProfileForm(res, snapshot, { profile });
  });

  router.post('/studio/:slug/territory-content/profile/:profileId', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    const profile = snapshot.draft.people.find((item) => item.id === req.params.profileId);
    if (!profile) return res.sendStatus(404);
    const parsed = parseProfileInput(req.body, snapshot.draft);
    if (parsed.errors.length) return renderProfileForm(res, snapshot, { status: 400, profile, values: req.body, errors: parsed.errors, linkRows: parsed.rows });
    const result = draftMutation(store, req.params.slug, req.body, 'edit-profile', (draft) => {
      const target = draft.people.find((item) => item.id === profile.id);
      target.displayName = parsed.value.displayName;
      if (parsed.value.role) target.role = parsed.value.role; else delete target.role;
      target.bio = parsed.value.bio;
      if (parsed.value.mediaId) target.mediaId = parsed.value.mediaId; else delete target.mediaId;
      target.links = parsed.value.links;
    }, [
      `people.${profile.id}.displayName`,
      `people.${profile.id}.role`,
      `people.${profile.id}.bio`,
      `people.${profile.id}.mediaId`,
      `people.${profile.id}.links`,
    ]);
    if (!result.ok) return mutationError(res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/territory-content?saved=1`);
  });

  router.post('/studio/:slug/territory-content/profile/:profileId/delete', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    const profile = snapshot.draft.people.find((item) => item.id === req.params.profileId);
    if (!profile) return res.sendStatus(404);
    const referenced = snapshot.draft.stories.filter((story) => story.authorProfileIds.includes(profile.id));
    if (referenced.length) {
      return res.status(409).send(`Remove ${profile.displayName} from ${referenced.length} credited stor${referenced.length === 1 ? 'y' : 'ies'} before deleting this profile.`);
    }
    const result = draftMutation(store, req.params.slug, req.body, 'delete-profile', (draft) => {
      draft.people = draft.people.filter((item) => item.id !== profile.id);
    }, [`people.${profile.id}`]);
    if (!result.ok) return mutationError(res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/territory-content?saved=1`);
  });

  router.get('/studio/:slug/territory-content/gallery', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    return res.render('candidate-c/territory-gallery-form', authoringLocals(snapshot, { pageTitle: `Gallery — ${snapshot.draft.identity.displayName}`, values: snapshot.draft.gallery, errors: [] }));
  });

  router.post('/studio/:slug/territory-content/gallery', (req, res) => {
    const snapshot = store.snapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    if (!requireV2(snapshot, res)) return undefined;
    const errors = [];
    const title = requiredString(req.body, 'title', 120, errors, 'Gallery title');
    const summary = requiredString(req.body, 'summary', 600, errors, 'Gallery summary');
    const selected = snapshot.draft.media.flatMap((media, index) => {
      if (String(req.body[`include_${index}`] || '') !== '1') return [];
      const rawOrder = Number(req.body[`order_${index}`]);
      const order = Number.isFinite(rawOrder) && rawOrder >= 1 ? rawOrder : index + 1;
      return [{ mediaId: media.id, order, index }];
    }).sort((a, b) => a.order - b.order || a.index - b.index);
    const mediaIds = selected.map((item) => item.mediaId);
    if (mediaIds.length > 60) errors.push({ path: 'mediaIds', message: 'Choose no more than 60 media items.' });
    if (errors.length) {
      return res.status(400).render('candidate-c/territory-gallery-form', authoringLocals(snapshot, {
        pageTitle: `Gallery — ${snapshot.draft.identity.displayName}`,
        values: { title, summary, mediaIds },
        errors,
      }));
    }
    const result = draftMutation(store, req.params.slug, req.body, 'edit-gallery', (draft) => {
      draft.gallery.title = title;
      draft.gallery.summary = summary;
      draft.gallery.mediaIds = mediaIds;
    }, ['gallery.title', 'gallery.summary', 'gallery.mediaIds']);
    if (!result.ok) return mutationError(res, result);
    return res.redirect(303, `/candidate-c/studio/${encodeURIComponent(req.params.slug)}/territory-content?saved=1`);
  });

  return router;
}

module.exports = {
  createCandidateCTerritoryAuthoringRouter,
  upgradeGraphToV2,
};
