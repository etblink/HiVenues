'use strict';

const { clone, validateHostGraph } = require('./model');

function provisionCandidateCHost(store, graph) {
  if (!store || !(store.workspaces instanceof Map) || typeof store.snapshot !== 'function') {
    throw new TypeError('Candidate C provisioning requires a CandidateCStore-compatible instance.');
  }

  let validated;
  try {
    validated = validateHostGraph(graph);
  } catch (error) {
    return { ok: false, reason: 'INVALID_HOST_GRAPH', detail: error.message };
  }

  if (store.workspaces.has(validated.identity.slug)) return { ok: false, reason: 'HOST_SLUG_EXISTS' };
  for (const slug of store.list()) {
    const existing = store.snapshot(slug);
    if (existing?.draft.identity.hostId === validated.identity.hostId) return { ok: false, reason: 'HOST_ID_EXISTS' };
  }

  store.workspaces.set(validated.identity.slug, {
    revision: 1,
    draft: clone(validated),
    history: [{ revision: 1, label: 'seed', draft: clone(validated) }],
    manualPaths: new Set(),
    releases: [],
    liveReleaseId: null,
    proposals: new Map(),
    urgent: new Map(),
    rsvps: new Map(),
  });

  return {
    ok: true,
    slug: validated.identity.slug,
    release: null,
    snapshot: store.snapshot(validated.identity.slug),
  };
}

module.exports = { provisionCandidateCHost };
