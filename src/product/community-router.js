'use strict';

const express = require('express');
const { buildViewModel } = require('./present');
const { READ_MODEL_SCHEMA_VERSION } = require('./social-discussion');

const COMMUNITY_TEMPLATES = Object.freeze({
  poster: 'studio/community/poster',
  editorial: 'studio/community/editorial',
  hospitality: 'studio/community/hospitality',
});

function normalizeBindings(bindings) {
  if (bindings instanceof Map) return new Map(bindings);
  if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings)) return new Map();
  return new Map(Object.entries(bindings));
}

function discussionState(status, issue) {
  return Object.freeze({
    schemaVersion: READ_MODEL_SCHEMA_VERSION,
    status,
    issue,
    root: null,
    replies: Object.freeze([]),
  });
}

function unavailableDiscussion(issue) {
  return discussionState('unavailable', issue);
}

function degradedDiscussion(issue) {
  return discussionState('degraded', issue);
}

function isDiscussionBinding(binding) {
  return Boolean(
    binding
    && typeof binding === 'object'
    && !Array.isArray(binding)
    && typeof binding.author === 'string'
    && binding.author.trim()
    && binding.author === binding.author.trim()
    && typeof binding.permlink === 'string'
    && binding.permlink.trim()
    && binding.permlink === binding.permlink.trim()
  );
}

function replyDepthClass(depth) {
  const bounded = Math.max(1, Math.min(6, Number(depth) || 1));
  return `cc-community-reply--depth-${bounded}`;
}

function formatCommunityTime(value, timeZone) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const source = value.trim();
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/i.test(source) ? source : `${source}Z`;
  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp)) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone,
      timeZoneName: 'short',
    }).format(new Date(timestamp));
  } catch {
    return '';
  }
}

function communityStateCopy(community, hostName) {
  if (community.status === 'partial') {
    return {
      heading: 'The opening note is temporarily unavailable.',
      body: 'The conversation that followed is still here.',
    };
  }
  if (community.status === 'empty') {
    return {
      heading: 'No community notes are here yet.',
      body: `${hostName} has not published a conversation on this surface yet.`,
    };
  }
  if (community.status === 'degraded') {
    return {
      heading: 'This conversation cannot be shown safely right now.',
      body: 'The source response did not match the discussion contract, so HiVenues did not guess or substitute content.',
    };
  }
  if (community.issue === 'provider-unavailable') {
    return {
      heading: 'Community conversation is temporarily unavailable.',
      body: 'The public host remains available while the conversation source reconnects.',
    };
  }
  return {
    heading: 'Community conversation is not connected for this place yet.',
    body: 'This public surface stays honest until a read-only conversation source is connected.',
  };
}

function createHiVenuesCommunityRouter({
  store,
  discussionReader = null,
  discussionBindings = {},
} = {}) {
  if (!store || typeof store.publicSnapshot !== 'function') {
    throw new TypeError('HiVenues community router requires a public snapshot store.');
  }

  const router = express.Router();
  const bindings = normalizeBindings(discussionBindings);

  router.get('/:slug/community', async (req, res) => {
    const snapshot = store.publicSnapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);

    const view = buildViewModel(snapshot);
    const template = COMMUNITY_TEMPLATES[view.family.id];
    if (!template) return res.sendStatus(404);

    const binding = bindings.get(req.params.slug);
    let community;
    if (!binding) {
      community = unavailableDiscussion('discussion-not-configured');
    } else if (!isDiscussionBinding(binding)) {
      community = degradedDiscussion('binding-invalid');
    } else if (!discussionReader || typeof discussionReader.read !== 'function') {
      community = unavailableDiscussion('provider-not-configured');
    } else {
      try {
        community = await discussionReader.read(binding);
      } catch {
        community = degradedDiscussion('reader-failure');
      }
    }

    const hostHref = `/studio/${encodeURIComponent(view.graph.identity.slug)}`;
    res.set('Cache-Control', 'no-store');
    return res.render(template, {
      pageTitle: `Community — ${view.graph.identity.displayName}`,
      ...view,
      community,
      hostHref,
      communityStateCopy,
      formatCommunityTime,
      replyDepthClass,
    });
  });

  router.bindings = bindings;
  return router;
}

module.exports = {
  COMMUNITY_TEMPLATES,
  createHiVenuesCommunityRouter,
  communityStateCopy,
  degradedDiscussion,
  formatCommunityTime,
  isDiscussionBinding,
  normalizeBindings,
  replyDepthClass,
  unavailableDiscussion,
};
