'use strict';

const express = require('express');
const { requireHiveAccount } = require('../http/validation');
const {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  FeatureUnavailableError,
  NotFoundError,
  ValidationError,
} = require('../lib/errors');
const {
  buildCommunitySubscription,
  buildFollow,
} = require('../hive/social-operations');
const { isSocialBinding } = require('../candidate-c/social-read-router');
const { assertSameOrigin } = require('./identity-router');

const TRANSACTION_ID_PATTERN = /^[0-9a-f]{40}$/i;
const FOLLOW_ACTIONS = new Set(['follow', 'unfollow']);
const COMMUNITY_ACTIONS = new Set(['subscribe', 'unsubscribe']);

function normalizeBindings(bindings) {
  if (bindings instanceof Map) return new Map(bindings);
  if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings)) return new Map();
  return new Map(Object.entries(bindings));
}

function requireParticipationServices(services) {
  if (!services?.preflightStore || !services?.hiveReadService) {
    throw new FeatureUnavailableError('Hive participation is temporarily unavailable', {
      code: 'PARTICIPATION_PROVIDER_UNAVAILABLE',
    });
  }
  return services;
}

function requireVerifiedIdentity(req) {
  if (!req.hivenuesIdentity) {
    throw new AuthenticationError('Prove your Hive identity before using this action', {
      code: 'IDENTITY_SESSION_REQUIRED',
    });
  }
  return req.hivenuesIdentity;
}

function requireIdentityCsrf(req, identity) {
  const supplied = String(req.get('x-csrf-token') || '');
  if (!supplied || supplied !== identity.csrfToken) {
    throw new AuthorizationError('The request security token is invalid', {
      code: 'CSRF_INVALID',
    });
  }
}

function liveHost(store, slug) {
  const snapshot = store.publicSnapshot(slug);
  if (!snapshot) throw new NotFoundError('Host not found');
  return snapshot;
}

function hostSummary(snapshot) {
  return Object.freeze({
    hostSlug: snapshot.draft.identity.slug,
    hostName: snapshot.draft.identity.displayName,
  });
}

function contextualEnvelope(envelope, snapshot, additions = {}) {
  return Object.freeze({
    ...envelope,
    summary: Object.freeze({
      ...envelope.summary,
      ...hostSummary(snapshot),
      ...additions,
    }),
  });
}

function requireAction(value, allowed, label) {
  const action = String(value || '').trim().toLowerCase();
  if (!allowed.has(action)) throw new ValidationError(label + ' action is invalid');
  return action;
}

function participationMessage(record) {
  if (record.state === 'observed') return 'Confirmed on Hive.';
  if (record.state === 'broadcast_accepted') {
    return 'Your wallet accepted this action. HiVenues is still waiting for canonical Hive confirmation.';
  }
  return 'This action is prepared for human review. Nothing has been broadcast.';
}

function sendParticipationError(res, error) {
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
  const expose = error?.expose === true;
  return res.status(statusCode).json({
    error: {
      code: String(error?.code || 'PARTICIPATION_FAILED'),
      message: expose
        ? String(error.message)
        : 'This Hive participation action could not be completed.',
    },
  });
}

function createHiVenuesParticipationRouter({
  store,
  services = null,
  socialBindings = {},
  fixedOrigin = '',
} = {}) {
  if (!store || typeof store.publicSnapshot !== 'function') {
    throw new TypeError('HiVenues participation router requires a public snapshot store.');
  }

  const router = express.Router();
  const bindings = normalizeBindings(socialBindings);

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  function protect(req) {
    assertSameOrigin(req, fixedOrigin);
    const identity = requireVerifiedIdentity(req);
    requireIdentityCsrf(req, identity);
    const active = requireParticipationServices(services);
    return { identity, active };
  }

  router.post('/:slug/people/:account/:action', async (req, res) => {
    try {
      const { identity, active } = protect(req);
      const snapshot = liveHost(store, req.params.slug);
      const action = requireAction(req.params.action, FOLLOW_ACTIONS, 'Follow');
      const target = requireHiveAccount(req.params.account, 'Follow target');
      if (target === identity.account) {
        throw new ValidationError('An account cannot follow itself');
      }

      const profile = await active.hiveReadService.getProfile(target);
      if (!profile || profile.name !== target) throw new NotFoundError('Hive member profile not found');

      const desired = action === 'follow';
      const current = await active.hiveReadService.getFollowStatus(identity.account, target);
      if (current === desired) {
        throw new ConflictError(
          desired
            ? '@' + identity.account + ' already follows @' + target
            : '@' + identity.account + ' does not currently follow @' + target,
          { code: 'RELATIONSHIP_ALREADY_CONFIRMED' },
        );
      }

      const envelope = contextualEnvelope(
        buildFollow({
          account: identity.account,
          payload: { following: target },
          following: desired,
        }),
        snapshot,
        {
          consequence: desired
            ? '@' + identity.account + ' will follow @' + target + ' on Hive.'
            : '@' + identity.account + ' will stop following @' + target + ' on Hive.',
        },
      );
      const preflight = active.preflightStore.create({
        sessionId: identity.id,
        envelope,
        signer: identity.account,
      });
      return res.status(201).json({
        ...preflight,
        message: participationMessage(preflight),
      });
    } catch (error) {
      return sendParticipationError(res, error);
    }
  });

  router.post('/:slug/community/:action', async (req, res) => {
    try {
      const { identity, active } = protect(req);
      const snapshot = liveHost(store, req.params.slug);
      const action = requireAction(req.params.action, COMMUNITY_ACTIONS, 'Community');
      const binding = bindings.get(req.params.slug);
      if (!isSocialBinding(binding)) {
        throw new FeatureUnavailableError('This host does not have a valid Hive community binding', {
          code: 'COMMUNITY_NOT_BOUND',
        });
      }

      const desired = action === 'subscribe';
      const current = await active.hiveReadService.isCommunityMember(
        identity.account,
        binding.community,
      );
      if (current === desired) {
        throw new ConflictError(
          desired
            ? '@' + identity.account + ' is already subscribed to ' + binding.community
            : '@' + identity.account + ' is not currently subscribed to ' + binding.community,
          { code: 'RELATIONSHIP_ALREADY_CONFIRMED' },
        );
      }

      const envelope = contextualEnvelope(
        buildCommunitySubscription({
          account: identity.account,
          community: binding.community,
          subscribing: desired,
        }),
        snapshot,
        {
          consequence: desired
            ? '@' + identity.account + ' will subscribe to ' + binding.community + ' on Hive.'
            : '@' + identity.account + ' will unsubscribe from ' + binding.community + ' on Hive.',
        },
      );
      const preflight = active.preflightStore.create({
        sessionId: identity.id,
        envelope,
        signer: identity.account,
      });
      return res.status(201).json({
        ...preflight,
        message: participationMessage(preflight),
      });
    } catch (error) {
      return sendParticipationError(res, error);
    }
  });

  router.post('/preflight/:id/cancel', (req, res) => {
    try {
      const { identity, active } = protect(req);
      active.preflightStore.cancel(req.params.id, identity.id);
      return res.status(204).end();
    } catch (error) {
      return sendParticipationError(res, error);
    }
  });

  router.post('/preflight/:id/accepted', (req, res) => {
    try {
      const { identity, active } = protect(req);
      const rawTransactionId = req.body?.transactionId;
      const transactionId = rawTransactionId ? String(rawTransactionId).toLowerCase() : null;
      if (transactionId && !TRANSACTION_ID_PATTERN.test(transactionId)) {
        throw new ValidationError('A valid Hive transaction id is required');
      }
      const preflight = active.preflightStore.markAccepted(
        req.params.id,
        identity.id,
        transactionId,
      );
      return res.json({
        ...preflight,
        message: participationMessage(preflight),
      });
    } catch (error) {
      return sendParticipationError(res, error);
    }
  });

  router.post('/preflight/:id/observe', async (req, res) => {
    try {
      const { identity, active } = protect(req);
      const record = active.preflightStore.get(req.params.id, identity.id);
      const observed = await active.hiveReadService.observeSocialOperation(record);
      const preflight = active.preflightStore.markObserved(
        req.params.id,
        identity.id,
        observed,
      );
      return res.json({
        ...preflight,
        message: participationMessage(preflight),
      });
    } catch (error) {
      return sendParticipationError(res, error);
    }
  });

  router.bindings = bindings;
  return router;
}

module.exports = {
  COMMUNITY_ACTIONS,
  FOLLOW_ACTIONS,
  TRANSACTION_ID_PATTERN,
  createHiVenuesParticipationRouter,
  participationMessage,
  sendParticipationError,
};
