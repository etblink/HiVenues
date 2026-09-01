'use strict';

const path = require('node:path');
const express = require('express');
const { createApp } = require('../../src/app');
const { createStaticAssetUrl } = require('../../src/release/static-assets');
const { configFrom, logger } = require('./test-app');

const ROOT = path.join(__dirname, '..', '..');
const UX1F_STATUSES = Object.freeze(['ready', 'empty', 'unavailable']);
const UX1F_UPDATES = Object.freeze([
  {
    author: 'fourthstreetbar',
    permlink: 'patio-lights-at-sunset',
    title: 'Patio lights at sunset',
    excerpt: 'A quick look at the patio as the evening settles over East 4th Street.',
  },
  {
    author: 'fourthstreetbar',
    permlink: 'from-behind-the-bar',
    title: 'From behind the bar',
    excerpt: 'A short update from the people keeping the conversation moving tonight.',
  },
  {
    author: 'fourthstreetbar',
    permlink: 'join-the-community-conversation',
    title: 'Join the community conversation',
    excerpt: 'See what friends of 4th Street Bar are posting and talking about online.',
  },
]);
const UX1F_PULSE_CANDIDATES = Object.freeze([
  {
    author: 'fourthstreetbar', permlink: 'official-duplicate', parentAuthor: '',
    title: 'Official duplicate', excerpt: 'Should remain in the official lane.', replyCount: 2, positiveVotes: 8,
  },
  {
    author: 'poolregular', permlink: 'league-night-recap', parentAuthor: '',
    title: 'League night recap', excerpt: 'A regular shares a quick recap from the pool tables.', replyCount: 4, positiveVotes: 12,
  },
  {
    author: 'fourthst.threads', permlink: 'threads-container', parentAuthor: '',
    title: 'Threads container', excerpt: 'Dedicated Threads material belongs elsewhere.', replyCount: 7, positiveVotes: 20,
  },
  {
    author: 'renoafterdark', permlink: 'patio-weather-was-perfect', parentAuthor: '',
    title: 'Patio weather was perfect', excerpt: 'A visitor posts about an easy evening on the patio.', replyCount: 1, positiveVotes: 6,
  },
  {
    author: 'replyonly', permlink: 'not-a-root', parentAuthor: 'someone',
    title: 'A reply', excerpt: 'Replies do not become homepage pulse cards.', replyCount: 0, positiveVotes: 1,
  },
  {
    author: 'eastfourthfriend', permlink: 'good-conversation-tonight', parentAuthor: '',
    title: 'Good conversation tonight', excerpt: 'A community member keeps the conversation going online.', replyCount: 3, positiveVotes: 9,
  },
]);
const UX1F_PULSE = Object.freeze(
  UX1F_PULSE_CANDIDATES.filter((item) => (
    item.parentAuthor === '' &&
    item.author !== 'fourthstreetbar' &&
    item.author !== 'fourthst.threads'
  )),
);

function createUx1fVisualFixture(status = 'ready', pulseStatus = status) {
  if (!UX1F_STATUSES.includes(status)) throw new TypeError(`Unsupported UX-1F status: ${status}`);
  if (!UX1F_STATUSES.includes(pulseStatus)) throw new TypeError(`Unsupported UX-1F pulse status: ${pulseStatus}`);

  const config = configFrom({
    HIVE_WRITE_MODE: 'disabled',
    HIVE_SIGNER_MODE: 'disabled',
    RATE_LIMIT_MAX: '10000',
    SESSION_SECRET: 'ux-1f-home-visual-session-secret-at-least-32-bytes',
  });
  const readCalls = [];
  const moderationCalls = [];
  const unexpectedReadCalls = [];
  const hiveReadService = new Proxy({
    async getOfficialCommunityPosts(options) {
      readCalls.push({ method: 'getOfficialCommunityPosts', options: structuredClone(options) });
      if (status === 'unavailable') throw new Error('UX-1F deterministic update outage');
      return status === 'ready' ? structuredClone(UX1F_UPDATES) : [];
    },
  }, {
    get(target, property, receiver) {
      if (Reflect.has(target, property)) return Reflect.get(target, property, receiver);
      if (typeof property !== 'string') return Reflect.get(target, property, receiver);
      return async (...args) => {
        unexpectedReadCalls.push({ method: property, args: structuredClone(args) });
        throw new Error(`UX-1F visual fixture forbids unexpected read: ${property}`);
      };
    },
  });
  const moderationService = {
    async getCommunityPosts(options) {
      moderationCalls.push({
        method: 'getCommunityPosts',
        options: {
          name: options.name,
          sort: options.sort,
          cursor: options.cursor,
          contentFilter: options.contentFilter,
        },
      });
      if (pulseStatus === 'unavailable') throw new Error('UX-1F deterministic community pulse outage');
      if (pulseStatus === 'empty') return { items: [] };
      return { items: structuredClone(UX1F_PULSE_CANDIDATES).filter(options.contentFilter) };
    },
  };
  const rpcPool = {
    calls: [],
    getStatus: () => [],
    async call(api, method, params) {
      this.calls.push({ api, method, params: structuredClone(params) });
      throw new Error(`UX-1F visual fixture forbids Hive RPC: ${api}.${method}`);
    },
  };
  const application = createApp({ config, logger, rpcPool, hiveReadService, moderationService });
  application.locals.assetUrl = createStaticAssetUrl(path.join(ROOT, 'public'));
  application.locals.currentYear = 2026;

  const mutationAttempts = [];
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    mutationAttempts.push({ method: req.method, path: req.originalUrl });
    return res.status(405).json({
      error: {
        code: 'UX_1F_VISUAL_MUTATION_FORBIDDEN',
        message: 'The UX-1F visual fixture is presentation-only.',
      },
    });
  });
  app.use(application);

  return {
    app,
    config,
    hiveReadService,
    moderationCalls,
    moderationService,
    mutationAttempts,
    pulseStatus,
    readCalls,
    rpcPool,
    status,
    unexpectedReadCalls,
  };
}

module.exports = {
  UX1F_PULSE,
  UX1F_PULSE_CANDIDATES,
  UX1F_STATUSES,
  UX1F_UPDATES,
  createUx1fVisualFixture,
};
