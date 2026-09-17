'use strict';

const { normalizeDiscussion } = require('../hive/normalizers');

const READ_MODEL_SCHEMA_VERSION = 1;

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireIdentifier(value, label) {
  if (typeof value !== 'string' || !value || value !== value.trim()) {
    throw new TypeError(`${label} must be a non-empty trimmed string`);
  }
  return value;
}

function contentKey(author, permlink) {
  return `${requireIdentifier(author, 'Hive author')}/${requireIdentifier(permlink, 'Hive permlink')}`;
}

function wireShapeError(message) {
  const error = new TypeError(message);
  error.code = 'HIVE_DISCUSSION_WIRE_INVALID';
  return error;
}

function assertBridgeDiscussionWire(rawDiscussion) {
  if (!isRecord(rawDiscussion)) {
    throw wireShapeError('bridge.get_discussion must return an object keyed by author/permlink');
  }

  const seen = new Set();
  for (const [key, entry] of Object.entries(rawDiscussion)) {
    if (!isRecord(entry)) {
      throw wireShapeError(`bridge.get_discussion entry ${key} must be an object`);
    }

    let canonicalKey;
    try {
      canonicalKey = contentKey(entry.author, entry.permlink);
    } catch {
      throw wireShapeError(`bridge.get_discussion entry ${key} is missing canonical author/permlink identity`);
    }

    if (key !== canonicalKey) {
      throw wireShapeError(`bridge.get_discussion key ${key} does not match ${canonicalKey}`);
    }
    if (seen.has(canonicalKey)) {
      throw wireShapeError(`bridge.get_discussion contains duplicate content identity ${canonicalKey}`);
    }
    seen.add(canonicalKey);
  }

  return rawDiscussion;
}

function readContent(item) {
  const id = contentKey(item.author, item.permlink);
  const parentId = item.parentAuthor && item.parentPermlink
    ? contentKey(item.parentAuthor, item.parentPermlink)
    : null;

  return Object.freeze({
    id,
    authorKey: item.author,
    title: item.title,
    bodyHtml: item.bodyHtml,
    excerpt: item.excerpt,
    primaryImage: item.primaryImage,
    publishedAt: item.created,
    updatedAt: item.updated,
    parentId,
    depth: item.depth,
    replyCount: item.replyCount,
  });
}

function readState(status, issue = null) {
  return Object.freeze({
    schemaVersion: READ_MODEL_SCHEMA_VERSION,
    status,
    issue,
    root: null,
    replies: Object.freeze([]),
  });
}

function normalizeBridgeDiscussionWire(rawDiscussion, { author, permlink }) {
  const rootAuthor = requireIdentifier(author, 'Root author');
  const rootPermlink = requireIdentifier(permlink, 'Root permlink');
  const wire = assertBridgeDiscussionWire(rawDiscussion);
  const normalized = normalizeDiscussion(wire, rootAuthor, rootPermlink);
  const root = normalized.post ? readContent(normalized.post) : null;
  const replies = Object.freeze(normalized.comments.map(readContent));
  const status = root ? 'ready' : replies.length ? 'partial' : 'empty';

  return Object.freeze({
    schemaVersion: READ_MODEL_SCHEMA_VERSION,
    status,
    issue: status === 'partial' ? 'root-missing' : null,
    root,
    replies,
  });
}

class SyntheticBridgeDiscussionProvider {
  constructor({ discussions = {} } = {}) {
    if (!isRecord(discussions)) {
      throw new TypeError('Synthetic discussion provider requires an object of raw Bridge responses');
    }
    this.discussions = new Map(Object.entries(discussions));
  }

  async getDiscussion({ author, permlink }) {
    const key = contentKey(author, permlink);
    return this.discussions.get(key) || {};
  }
}

class HiveBridgeDiscussionProvider {
  constructor(rpcPool) {
    if (!rpcPool || typeof rpcPool.call !== 'function') {
      throw new TypeError('Hive Bridge discussion provider requires an RPC pool');
    }
    this.rpcPool = rpcPool;
  }

  async getDiscussion({ author, permlink }) {
    return this.rpcPool.call('bridge', 'get_discussion', { author, permlink });
  }
}

class CommunityDiscussionReader {
  constructor(provider) {
    if (!provider || typeof provider.getDiscussion !== 'function') {
      throw new TypeError('Community discussion reader requires a discussion provider');
    }
    this.provider = provider;
  }

  async read({ author, permlink }) {
    const rootAuthor = requireIdentifier(author, 'Root author');
    const rootPermlink = requireIdentifier(permlink, 'Root permlink');
    let rawDiscussion;

    try {
      rawDiscussion = await this.provider.getDiscussion({
        author: rootAuthor,
        permlink: rootPermlink,
      });
    } catch {
      return readState('unavailable', 'provider-unavailable');
    }

    try {
      return normalizeBridgeDiscussionWire(rawDiscussion, {
        author: rootAuthor,
        permlink: rootPermlink,
      });
    } catch {
      return readState('degraded', 'wire-invalid');
    }
  }
}

module.exports = {
  CommunityDiscussionReader,
  HiveBridgeDiscussionProvider,
  READ_MODEL_SCHEMA_VERSION,
  SyntheticBridgeDiscussionProvider,
  assertBridgeDiscussionWire,
  contentKey,
  normalizeBridgeDiscussionWire,
};
