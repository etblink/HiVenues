'use strict';

/**
 * Workstream E — dependency-closed urgent website operation.
 *
 * An urgent operation starts from the live Release snapshot (never the working
 * draft), applies one bounded change, and proves that the resulting snapshot
 * differs from the live snapshot at exactly the declared paths. Everything the
 * changed content depends on to render truthfully (its media, the Voice terms
 * of its public actions, the composition family and arrangement) is listed as
 * retained-live so review can show what changes and what stays exactly as it is.
 *
 * Only one change kind exists: `activity-status`. Cancellation/status is the
 * minimum qualifying example from the Phase-0 contract; this module is not a
 * general partial-publishing engine.
 */

const { activityLifecycles, clone, stableDigest, validateHostGraph } = require('./model');

const URGENT_CHANGE_KINDS = Object.freeze(['activity-status']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Flatten a Host graph into a deterministic path → value map. Collections whose
 * items carry HiVenues identity (activities, offers, media) are keyed by id so
 * that reordering or unrelated insertions never masquerade as edits to an item.
 * Arrangement is one value because its order is the fact.
 */
function graphPaths(graph, prefix = '', out = new Map()) {
  if (Array.isArray(graph)) {
    const identified = graph.every((item) => isPlainObject(item) && typeof item.id === 'string');
    if (identified) {
      for (const item of graph) graphPaths(item, `${prefix}.${item.id}`, out);
      out.set(`${prefix}#ids`, graph.map((item) => item.id).join(','));
      return out;
    }
    out.set(prefix, JSON.stringify(graph));
    return out;
  }
  if (isPlainObject(graph)) {
    for (const key of Object.keys(graph).sort()) {
      graphPaths(graph[key], prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  out.set(prefix, graph === undefined ? undefined : JSON.stringify(graph));
  return out;
}

/** Sorted list of paths whose values differ between two graphs. */
function diffGraphPaths(before, after) {
  const a = graphPaths(before);
  const b = graphPaths(after);
  const paths = new Set([...a.keys(), ...b.keys()]);
  const changed = [];
  for (const path of paths) {
    if (a.get(path) !== b.get(path)) changed.push(path);
  }
  return changed.sort();
}

function normalizeChange(input) {
  const kind = String(input?.kind || '');
  if (!URGENT_CHANGE_KINDS.includes(kind)) return { ok: false, reason: 'UNSUPPORTED_URGENT_CHANGE' };
  const activityId = String(input.activityId || '').trim();
  const lifecycle = String(input.lifecycle || '').trim();
  if (!activityId) return { ok: false, reason: 'ACTIVITY_REQUIRED' };
  if (!Object.hasOwn(activityLifecycles, lifecycle)) return { ok: false, reason: 'INVALID_LIFECYCLE' };
  const statusNote = String(input.statusNote || '').trim().slice(0, 240);
  return { ok: true, change: { kind, activityId, lifecycle, statusNote } };
}

/** Apply the bounded change to a clone of `graph`. Throws if the target is absent. */
function applyUrgentChange(graph, change) {
  const next = clone(graph);
  const activity = next.activities.find((item) => item.id === change.activityId);
  if (!activity) throw new Error('URGENT_TARGET_NOT_LIVE');
  activity.lifecycle = change.lifecycle;
  if (change.statusNote) activity.statusNote = change.statusNote;
  else delete activity.statusNote;
  return validateHostGraph(next);
}

/**
 * Derive the dependency closure for a change against the live snapshot.
 * Returns the declared changed paths, the retained-live dependency paths, and
 * a proof object that the actual diff equals the declaration.
 */
function deriveUrgentClosure(liveGraph, rawChange) {
  const normalized = normalizeChange(rawChange);
  if (!normalized.ok) return normalized;
  const { change } = normalized;
  const activity = liveGraph.activities.find((item) => item.id === change.activityId);
  if (!activity) return { ok: false, reason: 'URGENT_TARGET_NOT_LIVE' };

  const base = `activities.${activity.id}`;
  const authorizedPaths = [`${base}.lifecycle`, `${base}.statusNote`];
  const dependencies = [
    `${base}.title`,
    `${base}.slug`,
    `${base}.startsAt`,
    `${base}.endsAt`,
    `${base}.presence`,
    `${base}.publicActions`,
    `media.${activity.mediaId}`,
    ...activity.publicActions.map((action) => `voice.terms.${action.mechanic}`),
    'presentation.compositionFamily',
    'presentation.arrangement',
    'presentation.accent',
  ];

  let snapshot;
  try {
    snapshot = applyUrgentChange(liveGraph, change);
  } catch (error) {
    return { ok: false, reason: error.message === 'URGENT_TARGET_NOT_LIVE' ? error.message : 'URGENT_CHANGE_INVALID' };
  }

  const actualChanged = diffGraphPaths(liveGraph, snapshot);
  // `authorized` is the field envelope the operator may touch; `changed` is the
  // exact actual graph diff and is the only thing Release provenance may carry.
  const unexpected = actualChanged.filter((path) => !authorizedPaths.includes(path));
  const livePaths = graphPaths(liveGraph);
  const nextPaths = graphPaths(snapshot);
  const retainedMismatch = dependencies.filter((prefix) => {
    for (const [path, value] of livePaths) {
      if ((path === prefix || path.startsWith(`${prefix}.`)) && nextPaths.get(path) !== value) return true;
    }
    return false;
  });
  if (actualChanged.length === 0) return { ok: false, reason: 'URGENT_NO_CHANGE' };
  const closed = unexpected.length === 0 && retainedMismatch.length === 0;

  return {
    ok: true,
    change,
    activity: clone(activity),
    closure: {
      authorized: authorizedPaths,
      changed: actualChanged,
      retained: dependencies,
    },
    proof: {
      baseDigest: stableDigest(liveGraph),
      resultDigest: stableDigest(snapshot),
      actualChanged,
      unexpectedChanges: unexpected,
      retainedMismatch,
      closed,
    },
    snapshot,
  };
}

function sameList(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, index) => item === b[index]);
}

/**
 * Re-derive an operation's closure and proof from its immutable base Release
 * snapshot and its change, and require exact equality with the persisted copy.
 * Persisted closure/proof are derived data and are never trusted on their own.
 */
function verifyUrgentOperation(baseRelease, operation) {
  if (!baseRelease || !operation) return { ok: false, reason: 'URGENT_PROVENANCE_MISSING' };
  if (operation.baseDigest !== baseRelease.digest || stableDigest(baseRelease.snapshot) !== baseRelease.digest) {
    return { ok: false, reason: 'URGENT_BASE_DIGEST_MISMATCH' };
  }
  const derived = deriveUrgentClosure(baseRelease.snapshot, operation.change);
  if (!derived.ok) return { ok: false, reason: `URGENT_REDERIVE_FAILED:${derived.reason}` };
  if (!derived.proof.closed) return { ok: false, reason: 'URGENT_CLOSURE_OPEN' };
  const closure = operation.closure || {};
  const proof = operation.proof || {};
  const mismatches = [];
  if (!sameList(closure.authorized, derived.closure.authorized)) mismatches.push('closure.authorized');
  if (!sameList(closure.changed, derived.closure.changed)) mismatches.push('closure.changed');
  if (!sameList(closure.retained, derived.closure.retained)) mismatches.push('closure.retained');
  if (proof.baseDigest !== derived.proof.baseDigest) mismatches.push('proof.baseDigest');
  if (proof.resultDigest !== derived.proof.resultDigest) mismatches.push('proof.resultDigest');
  if (!sameList(proof.actualChanged, derived.proof.actualChanged)) mismatches.push('proof.actualChanged');
  if (!sameList(proof.unexpectedChanges, derived.proof.unexpectedChanges)) mismatches.push('proof.unexpectedChanges');
  if (!sameList(proof.retainedMismatch, derived.proof.retainedMismatch)) mismatches.push('proof.retainedMismatch');
  if (proof.closed !== derived.proof.closed) mismatches.push('proof.closed');
  if (mismatches.length) return { ok: false, reason: 'URGENT_PROVENANCE_MISMATCH', mismatches };
  return { ok: true, derived };
}

/**
 * Prove that an urgent Release's provenance is exactly the actual graph diff
 * from its base Release snapshot to its own snapshot, and that its digests
 * match the re-derived operation result.
 */
function verifyUrgentRelease(baseRelease, release, derived) {
  const actual = diffGraphPaths(baseRelease.snapshot, release.snapshot);
  if (!sameList(release.changedPaths, actual)) return { ok: false, reason: 'URGENT_RELEASE_CHANGED_PATHS_MISMATCH', actual };
  if (!sameList(release.changedPaths, derived.closure.changed)) return { ok: false, reason: 'URGENT_RELEASE_CLOSURE_MISMATCH' };
  if (release.digest !== derived.proof.resultDigest || stableDigest(derived.snapshot) !== release.digest) {
    return { ok: false, reason: 'URGENT_RELEASE_DIGEST_MISMATCH' };
  }
  return { ok: true };
}

/**
 * Compare the working draft against the live snapshot so review can list
 * exactly which draft edits will remain unpublished by the urgent operation.
 */
function unpublishedDraftPaths(liveGraph, draftGraph) {
  return diffGraphPaths(liveGraph, draftGraph);
}

function describePath(path, graph = null) {
  const activityLabel = (id) => (graph && graph.activities.find((item) => item.id === id) || {}).title || id;
  const offerLabel = (id) => (graph && graph.offers.find((item) => item.id === id) || {}).title || id;
  const mediaLabel = (id) => {
    const media = graph && graph.media.find((item) => item.id === id);
    if (!media) return id;
    return media.kind === 'bootstrap-art' ? 'house artwork' : `${media.kind} — ${media.alt}`;
  };
  const voiceLabel = (mechanicId) => (graph && graph.voice.terms[mechanicId]) ? `“${graph.voice.terms[mechanicId]}”` : mechanicId;

  const activity = path.match(/^activities\.([^.]+)\.(.+)$/);
  if (activity) {
    const field = activity[2];
    const words = {
      lifecycle: 'status',
      statusNote: 'status note',
      title: 'title',
      description: 'description',
      publicActions: 'visitor actions',
      presence: 'where it happens',
      startsAt: 'start time',
      endsAt: 'end time',
      slug: 'web address',
      mediaId: 'image',
    };
    return { group: 'Activity', item: activityLabel(activity[1]), field: words[field] || field };
  }
  if (path === 'activities#ids') return { group: 'Activities', item: 'which activities exist', field: '' };
  const offer = path.match(/^offers\.([^.]+)\.(.+)$/);
  if (offer) return { group: 'Offer', item: offerLabel(offer[1]), field: offer[2] };
  if (path === 'offers#ids') return { group: 'Offers', item: 'which offers exist', field: '' };
  const media = path.match(/^media\.([^.]+)(?:\.(.+))?$/);
  if (media) return { group: 'Media', item: mediaLabel(media[1]), field: media[2] === 'focal' ? 'focus point' : (media[2] || 'the whole asset') };
  if (path === 'media#ids') return { group: 'Media', item: 'which assets exist', field: '' };
  const voice = path.match(/^voice\.terms\.(.+)$/);
  if (voice) return { group: 'Voice', item: voiceLabel(voice[1]), field: 'visitor-facing words' };
  if (path === 'voice.tone') return { group: 'Voice', item: 'tone', field: '' };
  if (path === 'facts.tagline') return { group: 'Page', item: 'first impression', field: 'headline' };
  if (path === 'facts.summary') return { group: 'Page', item: 'summary', field: '' };
  if (path === 'facts.contact') return { group: 'Connect', item: 'contact email', field: '' };
  if (path.startsWith('facts.presence')) return { group: 'Page', item: 'where to find you', field: '' };
  if (path === 'presentation.compositionFamily') return { group: 'Direction', item: 'visual direction', field: '' };
  if (path === 'presentation.arrangement') return { group: 'Page', item: 'section order', field: '' };
  if (path === 'presentation.accent') return { group: 'Look', item: 'accent color', field: '' };
  if (path.startsWith('intent.')) return { group: 'Direction', item: 'guided answers', field: path.slice('intent.'.length) };
  if (path.startsWith('bindings.')) return { group: 'Connect', item: 'connections', field: path.slice('bindings.'.length) };
  return { group: 'Site', item: path, field: '' };
}

module.exports = {
  URGENT_CHANGE_KINDS,
  applyUrgentChange,
  deriveUrgentClosure,
  describePath,
  diffGraphPaths,
  graphPaths,
  normalizeChange,
  unpublishedDraftPaths,
  verifyUrgentOperation,
  verifyUrgentRelease,
};
