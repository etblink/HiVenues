'use strict';

const { randomBytes } = require('node:crypto');
const { verifyCompactSignature } = require('../auth/keychain-auth');
const { requireHiveAccount } = require('../http/validation');
const { AuthenticationError, ValidationError } = require('../lib/errors');
const { PostingAuthorityVerifier } = require('../hive/posting-authority');
const { buildPost, createPermlink } = require('../hive/social-operations');

const DEFAULT_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const DEFAULT_PREFLIGHT_TTL_MS = 5 * 60 * 1000;
const TRANSACTION_ID_PATTERN = /^[0-9a-f]{40}$/i;

function randomToken(bytes = 24) {
  return randomBytes(bytes).toString('base64url');
}

function safeProfileMetadata(account) {
  for (const raw of [account?.posting_json_metadata, account?.json_metadata]) {
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed.profile || parsed;
    } catch (_) {
      // Malformed public profile metadata should not block account connection.
    }
  }
  return {};
}

function accountSummary(account) {
  const profile = safeProfileMetadata(account);
  return Object.freeze({
    name: String(account?.name || ''),
    displayName: String(profile?.name || '').trim(),
    about: String(profile?.about || '').trim(),
    profileImage: String(profile?.profile_image || '').trim(),
    postingAuthorityThreshold: Number(account?.posting?.weight_threshold || 0),
  });
}

class CandidateCHiveIntegrationService {
  constructor({
    rpcPool,
    authorityVerifier,
    verifySignature = verifyCompactSignature,
    now = Date.now,
    random = randomToken,
    challengeTtlMs = DEFAULT_CHALLENGE_TTL_MS,
    sessionTtlMs = DEFAULT_SESSION_TTL_MS,
    preflightTtlMs = DEFAULT_PREFLIGHT_TTL_MS,
  } = {}) {
    if (!rpcPool || typeof rpcPool.call !== 'function') throw new TypeError('Hive integration requires an RPC pool');
    this.rpcPool = rpcPool;
    this.authorityVerifier = authorityVerifier || new PostingAuthorityVerifier(rpcPool);
    this.verifySignature = verifySignature;
    this.now = now;
    this.random = random;
    this.challengeTtlMs = challengeTtlMs;
    this.sessionTtlMs = sessionTtlMs;
    this.preflightTtlMs = preflightTtlMs;
    this.challenges = new Map();
    this.sessions = new Map();
    this.preflights = new Map();
  }

  prune() {
    const now = this.now();
    for (const [id, value] of this.challenges) if (value.expiresAtMs <= now) this.challenges.delete(id);
    for (const [id, value] of this.sessions) if (value.expiresAtMs <= now) this.sessions.delete(id);
    for (const [id, value] of this.preflights) if (value.expiresAtMs <= now) this.preflights.delete(id);
  }

  async getAccount(accountValue) {
    const account = requireHiveAccount(accountValue);
    const result = await this.rpcPool.call('condenser_api', 'get_accounts', [[account]]);
    return Array.isArray(result) ? result.find((item) => item?.name === account) || null : null;
  }

  async getAccountSummary(accountValue) {
    const account = await this.getAccount(accountValue);
    if (!account) return null;
    return accountSummary(account);
  }

  async health() {
    const properties = await this.rpcPool.call('condenser_api', 'get_dynamic_global_properties', []);
    return Object.freeze({
      connected: true,
      headBlockNumber: Number(properties?.head_block_number || 0),
      headBlockId: String(properties?.head_block_id || ''),
      time: String(properties?.time || ''),
      nodes: typeof this.rpcPool.getStatus === 'function' ? this.rpcPool.getStatus() : [],
    });
  }

  async issueChallenge({ account: accountValue, origin, slug }) {
    this.prune();
    const account = requireHiveAccount(accountValue);
    const found = await this.getAccount(account);
    if (!found) {
      throw new AuthenticationError('That Hive account does not exist.', { code: 'AUTH_ACCOUNT_NOT_FOUND' });
    }
    const normalizedOrigin = new URL(String(origin)).origin;
    const placeSlug = String(slug || '').trim();
    if (!placeSlug) throw new ValidationError('Place identity is required');
    const id = this.random(24);
    const nonce = this.random(32);
    const issuedAtMs = this.now();
    const expiresAtMs = issuedAtMs + this.challengeTtlMs;
    const issuedAt = new Date(issuedAtMs).toISOString();
    const expiresAt = new Date(expiresAtMs).toISOString();
    const message = [
      'HiVenues Hive connection',
      `Place: ${placeSlug}`,
      `Account: @${account}`,
      `Origin: ${normalizedOrigin}`,
      `Nonce: ${nonce}`,
      `Issued: ${issuedAt}`,
      `Expires: ${expiresAt}`,
      'Purpose: Verify Hive account control only; no transaction or broadcast is authorized.',
    ].join(' | ');
    this.challenges.set(id, {
      id,
      account,
      slug: placeSlug,
      origin: normalizedOrigin,
      message,
      expiresAtMs,
    });
    return Object.freeze({ id, account, message, issuedAt, expiresAt });
  }

  async verify({ challengeId, account: accountValue, publicKey, signature, slug, origin }) {
    const account = requireHiveAccount(accountValue);
    const id = String(challengeId || '');
    const challenge = this.challenges.get(id);

    // Consume the selected challenge exactly once before validating it. Do not
    // prune it first: an expired challenge is a distinct, user-actionable state
    // from an unknown or replayed challenge and #276 requires that distinction.
    this.challenges.delete(id);
    this.prune();

    if (!challenge) {
      throw new AuthenticationError('This Hive verification request is invalid or has already been used.', {
        code: 'AUTH_CHALLENGE_INVALID',
      });
    }
    if (challenge.expiresAtMs <= this.now()) {
      throw new AuthenticationError('This Hive verification request has expired.', { code: 'AUTH_CHALLENGE_EXPIRED' });
    }
    const normalizedOrigin = new URL(String(origin)).origin;
    if (challenge.account !== account || challenge.slug !== slug || challenge.origin !== normalizedOrigin) {
      throw new AuthenticationError('The Hive verification response does not match the request.', {
        code: 'AUTH_CHALLENGE_MISMATCH',
      });
    }
    const validSignature = await this.verifySignature({ message: challenge.message, publicKey, signature });
    if (!validSignature) {
      throw new AuthenticationError('The Hive signature is invalid.', { code: 'AUTH_SIGNATURE_INVALID' });
    }
    const authorized = await this.authorityVerifier.isAuthorized(account, publicKey);
    if (!authorized) {
      throw new AuthenticationError('That key is not authorized by the account posting authority.', {
        code: 'AUTHORITY_MISMATCH',
      });
    }
    const token = this.random(32);
    const issuedAtMs = this.now();
    const session = Object.freeze({
      token,
      account,
      slug,
      issuedAt: new Date(issuedAtMs).toISOString(),
      expiresAt: new Date(issuedAtMs + this.sessionTtlMs).toISOString(),
      expiresAtMs: issuedAtMs + this.sessionTtlMs,
    });
    this.sessions.set(token, session);
    return session;
  }

  getSession(tokenValue, slug) {
    this.prune();
    const token = String(tokenValue || '');
    const session = this.sessions.get(token) || null;
    if (!session || session.slug !== slug) return null;
    return session;
  }

  disconnect(tokenValue) {
    const token = String(tokenValue || '');
    if (token) this.sessions.delete(token);
  }

  prepareProfilePost({ token, slug, host, title, body }) {
    this.prune();
    const session = this.getSession(token, slug);
    if (!session) throw new AuthenticationError('Connect and verify a Hive account first.', { code: 'HIVE_SESSION_REQUIRED' });
    const postTitle = String(title || '').trim();
    const postBody = String(body || '').trim();
    if (!postTitle) throw new ValidationError('Post title is required');
    if (!postBody) throw new ValidationError('Post body is required');
    const envelope = buildPost({
      account: session.account,
      payload: {
        title: postTitle,
        body: postBody,
        permlink: createPermlink(postTitle, { now: this.now }),
        destination: 'profile',
        tags: ['hivenues'],
      },
      config: {
        hive: {
          appTag: 'hivenues/0.1.0',
          beneficiaryPolicy: {},
          communityId: 'hive-108590',
          officialAccount: '',
        },
      },
    });
    const id = this.random(24);
    const createdAtMs = this.now();
    const comment = envelope.operations.find((operation) => Array.isArray(operation) && operation[0] === 'comment');
    const expected = comment?.[1] || {};
    const preflight = {
      id,
      slug,
      account: session.account,
      authority: envelope.authority,
      operations: envelope.operations,
      fingerprint: envelope.fingerprint,
      summary: Object.freeze({
        ...envelope.summary,
        host: String(host?.identity?.displayName || ''),
        consequence: `Publish one permanent Hive profile post from @${session.account}.`,
      }),
      expected: Object.freeze({
        author: expected.author,
        permlink: expected.permlink,
        title: expected.title,
        body: expected.body,
      }),
      state: 'prepared',
      transactionId: null,
      createdAt: new Date(createdAtMs).toISOString(),
      expiresAtMs: createdAtMs + this.preflightTtlMs,
    };
    this.preflights.set(id, preflight);
    return this.publicPreflight(preflight);
  }

  beginBroadcast({ id, token, slug }) {
    this.prune();
    const session = this.getSession(token, slug);
    if (!session) throw new AuthenticationError('Connect and verify a Hive account first.', { code: 'HIVE_SESSION_REQUIRED' });
    const preflight = this.preflights.get(String(id || ''));
    if (!preflight || preflight.slug !== slug || preflight.account !== session.account) {
      throw new ValidationError('Hive action review is missing or expired');
    }
    if (preflight.state !== 'prepared') {
      throw new ValidationError('This Hive action is already in progress. Do not submit it again.');
    }

    // The short TTL protects a prepared-but-abandoned review. Once the exact
    // reviewed operation is deliberately handed to the wallet, retain its
    // reconciliation record for the rest of the verified session so a slow
    // wallet approval cannot produce an acknowledged chain write with no local
    // path to read it back.
    preflight.state = 'wallet-open';
    preflight.expiresAtMs = session.expiresAtMs;
    return this.publicPreflight(preflight);
  }

  requirePreflight(idValue, token, slug) {
    this.prune();
    const session = this.getSession(token, slug);
    if (!session) throw new AuthenticationError('Connect and verify a Hive account first.', { code: 'HIVE_SESSION_REQUIRED' });
    const preflight = this.preflights.get(String(idValue || ''));
    if (!preflight || preflight.slug !== slug || preflight.account !== session.account) {
      throw new ValidationError('Hive action review is missing or expired');
    }
    return preflight;
  }

  markAccepted({ id, token, slug, transactionId }) {
    const preflight = this.requirePreflight(id, token, slug);
    if (preflight.state !== 'wallet-open') {
      throw new ValidationError('Open this reviewed Hive action in the wallet before recording acceptance');
    }
    const rawId = String(transactionId || '').trim();
    if (rawId && !TRANSACTION_ID_PATTERN.test(rawId)) throw new ValidationError('Hive returned an invalid transaction id');
    preflight.state = 'wallet-approved';
    preflight.transactionId = rawId ? rawId.toLowerCase() : null;
    return this.publicPreflight(preflight);
  }

  async observe({ id, token, slug }) {
    const preflight = this.requirePreflight(id, token, slug);
    if (!['wallet-approved', 'chain-observable'].includes(preflight.state)) {
      throw new ValidationError('Approve this Hive action in the wallet before checking the chain');
    }
    const content = await this.rpcPool.call(
      'condenser_api',
      'get_content',
      [preflight.expected.author, preflight.expected.permlink],
    );
    const observed = Boolean(
      content &&
      content.author === preflight.expected.author &&
      content.permlink === preflight.expected.permlink &&
      content.title === preflight.expected.title &&
      content.body === preflight.expected.body,
    );
    if (observed) preflight.state = 'chain-observable';
    return Object.freeze({ ...this.publicPreflight(preflight), observed });
  }

  publicPreflight(preflight) {
    return Object.freeze({
      id: preflight.id,
      account: preflight.account,
      authority: preflight.authority,
      operations: preflight.operations,
      fingerprint: preflight.fingerprint,
      summary: preflight.summary,
      state: preflight.state,
      transactionId: preflight.transactionId,
      createdAt: preflight.createdAt,
    });
  }
}

module.exports = {
  CandidateCHiveIntegrationService,
  DEFAULT_CHALLENGE_TTL_MS,
  DEFAULT_PREFLIGHT_TTL_MS,
  DEFAULT_SESSION_TTL_MS,
  TRANSACTION_ID_PATTERN,
  accountSummary,
  safeProfileMetadata,
};
