'use strict';

const express = require('express');
const { buildViewModel } = require('./present');

const HIVE_SESSION_COOKIE = 'hivenues_hive_session';

function parseCookies(header = '') {
  const result = {};
  for (const pair of String(header).split(';')) {
    const index = pair.indexOf('=');
    if (index < 1) continue;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (key && !Object.hasOwn(result, key)) result[key] = value;
  }
  return result;
}

function requestOrigin(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function sameOrigin(req) {
  const origin = String(req.get('Origin') || '');
  return Boolean(origin) && origin === requestOrigin(req);
}

function publicSession(session) {
  if (!session) return null;
  return Object.freeze({
    account: session.account,
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt,
  });
}

function sessionCookie(token, secure) {
  return [
    `${HIVE_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/candidate-c/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=28800',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

function clearSessionCookie(secure) {
  return [
    `${HIVE_SESSION_COOKIE}=`,
    'Path=/candidate-c/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}

function errorPayload(error) {
  return {
    error: {
      code: String(error?.code || 'HIVE_INTEGRATION_ERROR'),
      message: String(error?.message || 'Hive integration could not complete this request.'),
    },
  };
}

function createCandidateCHiveIntegrationRouter({ store, service, secureCookie = false } = {}) {
  if (!store) throw new TypeError('Candidate C Hive integration router requires a store');
  if (!service) throw new TypeError('Candidate C Hive integration router requires a service');
  const router = express.Router();

  function token(req) {
    return decodeURIComponent(parseCookies(req.get('Cookie'))[HIVE_SESSION_COOKIE] || '');
  }

  function requireMutationOrigin(req, res) {
    if (sameOrigin(req)) return true;
    res.status(403).json({ error: { code: 'HIVE_ORIGIN_REJECTED', message: 'Reload this page before trying again.' } });
    return false;
  }

  function snapshot(req, res) {
    const value = store.snapshot(req.params.slug);
    if (!value) res.sendStatus(404);
    return value;
  }

  router.get('/studio/:slug/hive', async (req, res) => {
    const current = snapshot(req, res);
    if (!current) return;
    const session = service.getSession(token(req), req.params.slug);
    let account = null;
    let health = null;
    let healthError = '';
    try {
      [account, health] = await Promise.all([
        session ? service.getAccountSummary(session.account) : Promise.resolve(null),
        service.health(),
      ]);
    } catch (error) {
      healthError = String(error?.message || 'Hive is temporarily unavailable.');
    }
    return res.render('candidate-c/hive-integration', {
      pageTitle: `Hive — ${current.draft.identity.displayName}`,
      ...buildViewModel(current),
      hiveSession: publicSession(session),
      hiveAccount: account,
      hiveHealth: health,
      hiveHealthError: healthError,
    });
  });

  router.get('/studio/:slug/hive/status', async (req, res) => {
    const current = snapshot(req, res);
    if (!current) return;
    try {
      const session = service.getSession(token(req), req.params.slug);
      const account = session ? await service.getAccountSummary(session.account) : null;
      const health = await service.health();
      return res.json({ connected: Boolean(session), session: publicSession(session), account, health });
    } catch (error) {
      return res.status(503).json(errorPayload(error));
    }
  });

  router.post('/studio/:slug/hive/challenge', async (req, res) => {
    const current = snapshot(req, res);
    if (!current || !requireMutationOrigin(req, res)) return;
    try {
      const challenge = await service.issueChallenge({
        account: req.body?.account,
        origin: requestOrigin(req),
        slug: req.params.slug,
      });
      return res.status(201).json(challenge);
    } catch (error) {
      return res.status(error?.code === 'AUTH_ACCOUNT_NOT_FOUND' ? 404 : 400).json(errorPayload(error));
    }
  });

  router.post('/studio/:slug/hive/verify', async (req, res) => {
    const current = snapshot(req, res);
    if (!current || !requireMutationOrigin(req, res)) return;
    try {
      const session = await service.verify({
        challengeId: req.body?.challengeId,
        account: req.body?.account,
        publicKey: String(req.body?.publicKey || ''),
        signature: String(req.body?.signature || ''),
        slug: req.params.slug,
        origin: requestOrigin(req),
      });
      res.set('Set-Cookie', sessionCookie(session.token, secureCookie));
      return res.status(201).json({
        connected: true,
        account: session.account,
        issuedAt: session.issuedAt,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      return res.status(401).json(errorPayload(error));
    }
  });

  router.post('/studio/:slug/hive/disconnect', (req, res) => {
    const current = snapshot(req, res);
    if (!current || !requireMutationOrigin(req, res)) return;
    service.disconnect(token(req));
    res.set('Set-Cookie', clearSessionCookie(secureCookie));
    return res.status(204).end();
  });

  router.post('/studio/:slug/hive/preflight/profile-post', (req, res) => {
    const current = snapshot(req, res);
    if (!current || !requireMutationOrigin(req, res)) return;
    try {
      const preflight = service.prepareProfilePost({
        token: token(req),
        slug: req.params.slug,
        host: current.draft,
        title: req.body?.title,
        body: req.body?.body,
      });
      return res.status(201).json(preflight);
    } catch (error) {
      return res.status(error?.code === 'HIVE_SESSION_REQUIRED' ? 401 : 400).json(errorPayload(error));
    }
  });

  router.post('/studio/:slug/hive/preflight/:id/begin', (req, res) => {
    const current = snapshot(req, res);
    if (!current || !requireMutationOrigin(req, res)) return;
    try {
      return res.json(service.beginBroadcast({
        id: req.params.id,
        token: token(req),
        slug: req.params.slug,
      }));
    } catch (error) {
      return res.status(error?.code === 'HIVE_SESSION_REQUIRED' ? 401 : 400).json(errorPayload(error));
    }
  });

  router.post('/studio/:slug/hive/preflight/:id/accepted', (req, res) => {
    const current = snapshot(req, res);
    if (!current || !requireMutationOrigin(req, res)) return;
    try {
      return res.json(service.markAccepted({
        id: req.params.id,
        token: token(req),
        slug: req.params.slug,
        transactionId: req.body?.transactionId,
      }));
    } catch (error) {
      return res.status(error?.code === 'HIVE_SESSION_REQUIRED' ? 401 : 400).json(errorPayload(error));
    }
  });

  router.post('/studio/:slug/hive/preflight/:id/observe', async (req, res) => {
    const current = snapshot(req, res);
    if (!current || !requireMutationOrigin(req, res)) return;
    try {
      const result = await service.observe({ id: req.params.id, token: token(req), slug: req.params.slug });
      return res.json(result);
    } catch (error) {
      return res.status(error?.code === 'HIVE_SESSION_REQUIRED' ? 401 : 400).json(errorPayload(error));
    }
  });

  return router;
}

module.exports = {
  HIVE_SESSION_COOKIE,
  clearSessionCookie,
  createCandidateCHiveIntegrationRouter,
  parseCookies,
  publicSession,
  requestOrigin,
  sameOrigin,
  sessionCookie,
};
