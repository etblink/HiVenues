'use strict';

const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { requireHiveAccount } = require('../http/validation');
const {
  AuthorizationError,
  FeatureUnavailableError,
} = require('../lib/errors');
const {
  IDENTITY_PROOF_CONTEXT,
  clearIdentitySessionCookie,
  identitySessionCookie,
} = require('./identity');

function requestOrigin(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function expectedOrigin(req, fixedOrigin) {
  return fixedOrigin || requestOrigin(req);
}

function assertSameOrigin(req, fixedOrigin) {
  const expected = expectedOrigin(req, fixedOrigin);
  if (!req.get('origin') || req.get('origin') !== expected) {
    throw new AuthorizationError('The identity request origin is not allowed', {
      code: 'ORIGIN_NOT_ALLOWED',
    });
  }
  return expected;
}

function requireIdentityServices(services) {
  if (!services?.identityProof || !services?.sessionStore) {
    throw new FeatureUnavailableError('Hive identity proof is temporarily unavailable', {
      code: 'IDENTITY_PROVIDER_UNAVAILABLE',
    });
  }
  return services;
}

function sendIdentityError(res, error) {
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  const expose = error?.expose === true;
  return res.status(statusCode).json({
    error: {
      code: String(error?.code || 'IDENTITY_PROOF_FAILED'),
      message: expose
        ? String(error.message)
        : 'Hive identity proof could not be completed.',
    },
  });
}

function createHiVenuesIdentityRouter({
  services = null,
  fixedOrigin = '',
  secureCookie = false,
  context = IDENTITY_PROOF_CONTEXT,
  attemptWindowMs = 60_000,
  attemptLimit = 10,
} = {}) {
  const router = express.Router();
  const attemptLimiter = rateLimit({
    windowMs: attemptWindowMs,
    limit: attemptLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({
      error: {
        code: 'IDENTITY_RATE_LIMITED',
        message: 'Too many identity proof attempts; please try again shortly.',
      },
    }),
  });

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.post('/challenge', attemptLimiter, (req, res) => {
    try {
      const origin = assertSameOrigin(req, fixedOrigin);
      const active = requireIdentityServices(services);
      const account = requireHiveAccount(req.body?.account);
      const challenge = active.identityProof.issueChallenge(account, { origin, context });
      return res.status(201).json(challenge);
    } catch (error) {
      return sendIdentityError(res, error);
    }
  });

  router.post('/verify', attemptLimiter, async (req, res) => {
    try {
      const origin = assertSameOrigin(req, fixedOrigin);
      const active = requireIdentityServices(services);
      const account = requireHiveAccount(req.body?.account);
      const { session, token } = await active.identityProof.verify({
        challengeId: req.body?.challengeId,
        account,
        publicKey: String(req.body?.publicKey || ''),
        signature: String(req.body?.signature || ''),
        origin,
        context,
      });

      res.set('Set-Cookie', identitySessionCookie(token, {
        sessionTtlMs: active.sessionTtlMs,
        secure: secureCookie || req.secure,
      }));
      return res.status(201).json({
        authenticated: true,
        account: session.account,
        csrfToken: session.csrfToken,
        issuedAt: session.issuedAt,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      return sendIdentityError(res, error);
    }
  });

  router.get('/session', (req, res) => {
    if (!req.hivenuesIdentity) return res.json({ authenticated: false });
    return res.json({
      authenticated: true,
      account: req.hivenuesIdentity.account,
      csrfToken: req.hivenuesIdentity.csrfToken,
      issuedAt: req.hivenuesIdentity.issuedAt,
      expiresAt: req.hivenuesIdentity.expiresAt,
    });
  });

  router.post('/disconnect', (req, res) => {
    try {
      assertSameOrigin(req, fixedOrigin);
      const active = requireIdentityServices(services);
      if (!req.hivenuesIdentity) {
        throw new AuthorizationError('A verified Hive identity session is required', {
          code: 'SESSION_REQUIRED',
          statusCode: 401,
        });
      }
      const supplied = String(req.get('x-csrf-token') || '');
      if (!supplied || supplied !== req.hivenuesIdentity.csrfToken) {
        throw new AuthorizationError('The request security token is invalid', {
          code: 'CSRF_INVALID',
        });
      }

      active.sessionStore.destroy(req.hivenuesIdentityToken);
      res.set('Set-Cookie', clearIdentitySessionCookie({
        secure: secureCookie || req.secure,
      }));
      return res.status(204).end();
    } catch (error) {
      return sendIdentityError(res, error);
    }
  });

  return router;
}

module.exports = {
  assertSameOrigin,
  createHiVenuesIdentityRouter,
  expectedOrigin,
  requestOrigin,
  sendIdentityError,
};
