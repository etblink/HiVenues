'use strict';

const { randomBytes } = require('node:crypto');
const { KeychainAuthService } = require('../auth/keychain-auth');
const { ChallengeStore, SessionStore, parseCookies } = require('../auth/session-store');
const { PostingAuthorityVerifier } = require('../hive/posting-authority');

const IDENTITY_COOKIE_NAME = 'hivenues_identity_session';
const IDENTITY_PROOF_CONTEXT = 'HiVenues participation';
const DEFAULT_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function createHiVenuesIdentityServices({
  hiveReadService = null,
  rpcPool = hiveReadService?.rpcPool || null,
  sessionSecret = randomBytes(32).toString('base64url'),
  challengeTtlMs = DEFAULT_CHALLENGE_TTL_MS,
  sessionTtlMs = DEFAULT_SESSION_TTL_MS,
  now = Date.now,
} = {}) {
  if (!rpcPool || typeof rpcPool.call !== 'function') return null;

  const challengeStore = new ChallengeStore({
    ttlMs: challengeTtlMs,
    heading: 'HiVenues identity proof',
    purpose: 'Prove control of this Hive account for HiVenues participation only; no Hive transaction or value action is authorized.',
    now,
  });
  const sessionStore = new SessionStore({
    secret: sessionSecret,
    ttlMs: sessionTtlMs,
    now,
  });
  const postingAuthorityVerifier = new PostingAuthorityVerifier(rpcPool);
  const authorityVerifier = Object.freeze({
    isAuthorized(account, publicKey) {
      return postingAuthorityVerifier.isDirectKeyAuthorized(account, publicKey);
    },
  });
  const identityProof = new KeychainAuthService({
    challengeStore,
    sessionStore,
    authorityVerifier,
  });

  return Object.freeze({
    authorityVerifier,
    postingAuthorityVerifier,
    challengeStore,
    identityProof,
    sessionStore,
    challengeTtlMs,
    sessionTtlMs,
  });
}

function identitySessionContext(sessionStore) {
  return (req, res, next) => {
    if (!sessionStore) {
      req.hivenuesIdentity = null;
      req.hivenuesIdentityToken = '';
      res.locals.hivenuesIdentity = null;
      return next();
    }

    const token = parseCookies(req.get('cookie'))[IDENTITY_COOKIE_NAME] || '';
    const session = sessionStore.get(token);
    req.hivenuesIdentity = session;
    req.hivenuesIdentityToken = token;
    res.locals.hivenuesIdentity = session
      ? { account: session.account, expiresAt: session.expiresAt }
      : null;
    return next();
  };
}

function identitySessionCookie(token, { sessionTtlMs, secure = false }) {
  const maxAge = Math.max(0, Math.floor(sessionTtlMs / 1000));
  return [
    `${IDENTITY_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

function clearIdentitySessionCookie({ secure = false } = {}) {
  return [
    `${IDENTITY_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

module.exports = {
  DEFAULT_CHALLENGE_TTL_MS,
  DEFAULT_SESSION_TTL_MS,
  IDENTITY_COOKIE_NAME,
  IDENTITY_PROOF_CONTEXT,
  clearIdentitySessionCookie,
  createHiVenuesIdentityServices,
  identitySessionContext,
  identitySessionCookie,
};
