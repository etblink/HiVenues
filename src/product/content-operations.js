'use strict';

const { createHash } = require('node:crypto');
const { requireHiveAccount, requirePermlink } = require('../http/validation');
const { ValidationError } = require('../lib/errors');
const {
  LIMITS,
  createPermlink,
  fingerprint,
  utf8Bytes,
} = require('../hive/social-operations');
const { version } = require('../../package.json');

const HIVENUES_CONTENT_APP = `hivenues/${version}`;

function requireText(value, label, maxBytes, { trim = false } = {}) {
  const raw = String(value ?? '');
  if (!raw.trim()) throw new ValidationError(`${label} is required`);
  const text = trim ? raw.trim() : raw;
  if (utf8Bytes(text) > maxBytes) {
    throw new ValidationError(
      `${label} must be ${maxBytes.toLocaleString('en-US')} UTF-8 bytes or fewer`,
    );
  }
  return text;
}

function requireCommunity(value) {
  const community = String(value || '').trim().toLowerCase();
  if (!/^hive-[0-9]{3,12}$/.test(community)) {
    throw new ValidationError('Hive community is invalid');
  }
  return community;
}

function requireMetadata(value) {
  const metadata = typeof value === 'string' ? value : JSON.stringify(value || {});
  if (utf8Bytes(metadata) > LIMITS.metadataBytes) {
    throw new ValidationError(
      `JSON metadata must be ${LIMITS.metadataBytes.toLocaleString('en-US')} UTF-8 bytes or fewer`,
    );
  }
  try {
    JSON.parse(metadata);
  } catch {
    throw new ValidationError('JSON metadata must be valid JSON');
  }
  return metadata;
}

function contentDigest({ title = '', body = '', parentAuthor = '', parentPermlink = '', jsonMetadata = '' }) {
  return createHash('sha256')
    .update(JSON.stringify({
      title,
      body,
      parentAuthor,
      parentPermlink,
      jsonMetadata,
    }), 'utf8')
    .digest('hex');
}

function envelope(action, account, operation, summary) {
  const operations = Object.freeze([Object.freeze(operation)]);
  return Object.freeze({
    action,
    account,
    authority: 'Posting',
    operations,
    fingerprint: fingerprint(operations),
    summary: Object.freeze(summary),
  });
}

function rootMetadata(community, appTag) {
  return requireMetadata({
    tags: [community],
    app: appTag,
    format: 'markdown',
  });
}

function replyMetadata(appTag) {
  return requireMetadata({
    app: appTag,
    format: 'markdown',
  });
}

function buildRootPost({
  account: accountValue,
  community: communityValue,
  title: titleValue,
  body: bodyValue,
  permlink: permlinkValue,
  appTag = HIVENUES_CONTENT_APP,
}) {
  const account = requireHiveAccount(accountValue);
  const community = requireCommunity(communityValue);
  const title = requireText(titleValue, 'Title', LIMITS.titleBytes, { trim: true });
  const body = requireText(bodyValue, 'Post body', LIMITS.postBodyBytes);
  const permlink = requirePermlink(permlinkValue);
  const jsonMetadata = rootMetadata(community, appTag);

  const value = {
    parent_author: '',
    parent_permlink: community,
    author: account,
    permlink,
    title,
    body,
    json_metadata: jsonMetadata,
  };
  const operation = ['comment', value];

  return envelope('post', account, operation, {
    kind: 'Community post',
    author: account,
    community,
    permlink,
    title,
    bodyBytes: utf8Bytes(body),
    contentDigest: contentDigest({
      title,
      body,
      parentAuthor: '',
      parentPermlink: community,
      jsonMetadata,
    }),
  });
}

function buildRootPostUpdate({
  account: accountValue,
  existing,
  title: titleValue,
  body: bodyValue,
}) {
  const account = requireHiveAccount(accountValue);
  if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
    throw new ValidationError('Existing Hive content is required');
  }
  const author = requireHiveAccount(existing.author, 'Existing content author');
  if (author !== account) {
    throw new ValidationError('Only the verified author can update this Hive post');
  }
  const parentAuthor = String(existing.parentAuthor || '');
  if (parentAuthor) throw new ValidationError('Only root Hive posts can be updated in this stage');

  const parentPermlink = requirePermlink(existing.parentPermlink);
  const permlink = requirePermlink(existing.permlink);
  const title = requireText(titleValue, 'Title', LIMITS.titleBytes, { trim: true });
  const body = requireText(bodyValue, 'Post body', LIMITS.postBodyBytes);
  const jsonMetadata = requireMetadata(existing.jsonMetadata);

  const value = {
    parent_author: '',
    parent_permlink: parentPermlink,
    author: account,
    permlink,
    title,
    body,
    json_metadata: jsonMetadata,
  };
  const operation = ['comment', value];

  return envelope('update', account, operation, {
    kind: 'Update own post',
    author: account,
    parentPermlink,
    permlink,
    title,
    bodyBytes: utf8Bytes(body),
    contentDigest: contentDigest({
      title,
      body,
      parentAuthor: '',
      parentPermlink,
      jsonMetadata,
    }),
  });
}

function buildReply({
  account: accountValue,
  parent,
  body: bodyValue,
  permlink: permlinkValue,
  appTag = HIVENUES_CONTENT_APP,
}) {
  const account = requireHiveAccount(accountValue);
  if (!parent || typeof parent !== 'object' || Array.isArray(parent)) {
    throw new ValidationError('Canonical Hive parent content is required');
  }
  const parentAuthor = requireHiveAccount(parent.author, 'Parent author');
  const parentPermlink = requirePermlink(parent.permlink);
  const permlink = requirePermlink(permlinkValue);
  const body = requireText(bodyValue, 'Reply body', LIMITS.commentBodyBytes);
  const jsonMetadata = replyMetadata(appTag);

  const value = {
    parent_author: parentAuthor,
    parent_permlink: parentPermlink,
    author: account,
    permlink,
    title: '',
    body,
    json_metadata: jsonMetadata,
  };
  const operation = ['comment', value];

  return envelope('reply', account, operation, {
    kind: 'Reply',
    author: account,
    parentAuthor,
    parentPermlink,
    permlink,
    bodyBytes: utf8Bytes(body),
    contentDigest: contentDigest({
      title: '',
      body,
      parentAuthor,
      parentPermlink,
      jsonMetadata,
    }),
  });
}

function createContentPermlink(value, options) {
  return createPermlink(value, options);
}

module.exports = {
  HIVENUES_CONTENT_APP,
  buildReply,
  buildRootPost,
  buildRootPostUpdate,
  contentDigest,
  createContentPermlink,
};
