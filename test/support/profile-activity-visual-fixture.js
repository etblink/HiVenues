'use strict';

const path = require('node:path');
const express = require('express');
const { SessionStore } = require('../../src/auth/session-store');
const { createApp } = require('../../src/app');
const { createStaticAssetUrl } = require('../../src/release/static-assets');
const { configFrom, logger } = require('./test-app');

const FIXTURE_ACCOUNT = 'etblink';
const FIXTURE_NOW_MS = Date.parse('2026-09-01T00:00:00Z');
const FIXTURE_SESSION_SECRET = 'profile-activity-visual-session-secret-at-least-32-bytes';
const ACTIVITY_STATUSES = Object.freeze(['ready', 'empty', 'unavailable']);

const FIXTURE_PROFILE = Object.freeze({
  name: FIXTURE_ACCOUNT,
  displayName: 'Evan',
  about: 'Building the 4th Street Bar community.',
  profileImage: '/images/fourth-street-bar-logo.jpg',
  followerCount: 42,
  followingCount: 17,
  postCount: 123,
  reputation: '68.4',
});

const FIXTURE_NOTIFICATIONS = Object.freeze([
  {
    id: 501,
    type: 'reply',
    score: 30,
    date: '2026-08-31T23:50:00',
    msg: '@reno-friend replied to your post',
    url: '@etblink/patio-conversation',
  },
  {
    id: 502,
    type: 'mention',
    score: 28,
    date: '2026-08-31T22:40:00',
    msg: '@neighbor mentioned you in a community post',
    url: '/hive-108590/@neighbor/community-night',
  },
  {
    id: 503,
    type: 'vote',
    score: 24,
    date: '2026-08-31T21:15:00',
    msg: '@barfriend voted on your post ($0.042)',
    url: '@etblink/patio-conversation',
  },
  {
    id: 504,
    type: 'follow',
    score: 20,
    date: '2026-08-31T20:05:00',
    msg: '@newfriend followed you',
    url: '@newfriend',
  },
  {
    id: 505,
    type: 'reblog',
    score: 18,
    date: '2026-08-31T19:30:00',
    msg: '@community-member reblogged your post',
    url: '@etblink/patio-conversation',
  },
]);

function deterministicSessionRandom() {
  const values = ['profile-activity-visual-session', 'profile-activity-visual-csrf'];
  return () => {
    const value = values.shift();
    if (!value) throw new Error('Profile activity visual fixture requested unexpected randomness');
    return value;
  };
}

function createActivityRpc(status) {
  const calls = [];
  return {
    calls,
    getStatus: () => [],
    async call(api, method, params) {
      calls.push({ api, method, params: structuredClone(params) });
      if (api === 'bridge' && method === 'account_notifications') {
        if (status === 'unavailable') throw new Error('deterministic activity outage');
        return status === 'ready' ? structuredClone(FIXTURE_NOTIFICATIONS) : [];
      }
      throw new Error(`Profile activity visual fixture forbids unexpected Hive RPC: ${api}.${method}`);
    },
  };
}

function createVisualReadService() {
  const calls = [];
  return {
    calls,
    async getProfile(account) {
      calls.push({ method: 'getProfile', account });
      if (account !== FIXTURE_ACCOUNT) return null;
      return structuredClone(FIXTURE_PROFILE);
    },
  };
}

function createProfileActivityVisualFixture(status = 'ready') {
  if (!ACTIVITY_STATUSES.includes(status)) throw new TypeError(`Unsupported activity status: ${status}`);

  const config = configFrom({
    HIVE_WRITE_MODE: 'disabled',
    HIVE_SIGNER_MODE: 'disabled',
    RATE_LIMIT_MAX: '10000',
    SESSION_SECRET: FIXTURE_SESSION_SECRET,
  });
  const sessionStore = new SessionStore({
    secret: config.auth.sessionSecret,
    ttlMs: config.auth.sessionTtlMs,
    now: () => FIXTURE_NOW_MS,
    random: deterministicSessionRandom(),
  });
  const { token } = sessionStore.create(FIXTURE_ACCOUNT);
  const rpcPool = createActivityRpc(status);
  const hiveReadService = createVisualReadService();
  const application = createApp({
    config,
    logger,
    now: () => FIXTURE_NOW_MS,
    rpcPool,
    hiveReadService,
    sessionStore,
  });
  application.locals.assetUrl = createStaticAssetUrl(path.join(__dirname, '..', '..', 'public'));
  application.locals.currentYear = new Date(FIXTURE_NOW_MS).getUTCFullYear();

  const mutationAttempts = [];
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    mutationAttempts.push({ method: req.method, path: req.originalUrl });
    return res.status(405).json({
      error: {
        code: 'PROFILE_ACTIVITY_VISUAL_MUTATION_FORBIDDEN',
        message: 'The profile activity visual fixture is presentation-only.',
      },
    });
  });
  app.use(application);

  return {
    app,
    config,
    hiveReadService,
    mutationAttempts,
    rpcPool,
    status,
    token,
  };
}

module.exports = {
  ACTIVITY_STATUSES,
  FIXTURE_ACCOUNT,
  FIXTURE_NOTIFICATIONS,
  FIXTURE_NOW_MS,
  createProfileActivityVisualFixture,
};