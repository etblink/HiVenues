'use strict';

const express = require('express');
const {
  requireCommunitySort,
  requireConfiguredCommunity,
  requireHiveAccount,
} = require('../http/validation');
const { NotFoundError } = require('../lib/errors');
const { inspectThreadsFunds } = require('../hive/threads-foundation');

const router = express.Router();

async function requireCommunity(req) {
  const communityId = req.app.locals.config.hive.communityId;
  const communityInfo = await req.app.locals.services.hiveReads.getCommunity(communityId);
  if (!communityInfo) throw new NotFoundError('The configured community was not found');
  return communityInfo;
}

async function membershipForSession(req) {
  if (!req.hiveSession) return null;
  try {
    return await req.app.locals.services.hiveReads.isCommunityMember(
      req.hiveSession.account,
      req.app.locals.config.hive.communityId,
    );
  } catch (error) {
    req.log.warn({ err: error }, 'community membership read failed');
    return null;
  }
}

function enableModerationControls(req, res) {
  res.locals.showModerationControls = req.app.locals.services.moderation.isOperator(
    req.hiveSession?.account,
  );
}

function threadContainerOptions(req) {
  return { venueId: req.app.locals.config.venue.id, allowLegacyFallback: true };
}

async function threadsFundsAlertForSession(req) {
  const config = req.app.locals.config;
  if (req.hiveSession?.account !== config.hive.officialAccount) return null;
  try {
    const accountRecord = await req.app.locals.services.hiveReads.getAccountRecord(
      config.hive.threadsContainerAccount,
    );
    return inspectThreadsFunds({
      venue: config.venue,
      accountRecord,
      viewerAccount: req.hiveSession.account,
    });
  } catch (error) {
    req.log.warn({ err: error }, 'Threads funds alert read failed');
    return null;
  }
}

async function communityPostsForRequest(req, { name, sort, cursor }) {
  const hiveReads = req.app.locals.services.hiveReads;
  const container = await hiveReads.getLatestThreadContainer(
    req.app.locals.config.hive.threadsContainerAccount,
    threadContainerOptions(req),
  );
  return req.app.locals.services.moderation.getCommunityPosts({
    name,
    sort,
    cursor,
    excludeContent: container,
  });
}

router.get('/', async (req, res, next) => {
  try {
    enableModerationControls(req, res);
    const communityId = req.app.locals.config.hive.communityId;
    const sort = requireCommunitySort(req.query.sort || 'created');
    const [communityInfo, membership] = await Promise.all([
      requireCommunity(req),
      membershipForSession(req),
    ]);
    let postsPage = null;
    let feedError = false;

    try {
      postsPage = await communityPostsForRequest(req, {
        name: communityId,
        sort,
        cursor: req.query.after,
      });
    } catch (error) {
      if (error?.code === 'MODERATION_STORE_UNAVAILABLE') throw error;
      feedError = true;
      req.log.warn({ err: error }, 'community feed read failed while community info remained available');
    }

    res.render('pages/community/index', {
      pageTitle: `Community — ${req.app.locals.config.site.name}`,
      activeView: 'posts',
      communityInfo,
      communityName: communityId,
      feedError,
      postsPage,
      threadsData: null,
      membership,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/threads', async (req, res, next) => {
  try {
    enableModerationControls(req, res);
    const [threadsData, threadsFundsAlert] = await Promise.all([
      req.app.locals.services.moderation.getLatestThreads(
        req.app.locals.config.hive.threadsContainerAccount,
        threadContainerOptions(req),
      ),
      threadsFundsAlertForSession(req),
    ]);
    if (req.get('HX-Request') === 'true') {
      return res.render('pages/community/partials/community-thread-list', {
        ...threadsData,
        threadsContainerAccount: req.app.locals.config.hive.threadsContainerAccount,
        threadsFundsAlert,
      });
    }

    const [communityInfo, membership] = await Promise.all([
      requireCommunity(req),
      membershipForSession(req),
    ]);
    return res.render('pages/community/index', {
      pageTitle: `Threads — ${req.app.locals.config.site.name}`,
      activeView: 'threads',
      communityInfo,
      communityName: req.app.locals.config.hive.communityId,
      feedError: false,
      postsPage: null,
      threadsData,
      threadsFundsAlert,
      membership,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:communityName/community-posts', async (req, res, next) => {
  try {
    enableModerationControls(req, res);
    const communityName = requireConfiguredCommunity(
      req.params.communityName,
      req.app.locals.config,
    );
    const sort = requireCommunitySort(req.query.sort || 'created');
    const postsPage = await communityPostsForRequest(req, {
      name: communityName,
      sort,
      cursor: req.query.after,
    });

    res.render('pages/community/partials/community-post-list', {
      communityName,
      postsPage,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/api/community/:communityName/subscribers', async (req, res, next) => {
  try {
    const communityName = requireConfiguredCommunity(
      req.params.communityName,
      req.app.locals.config,
    );
    const subscribers = await req.app.locals.services.hiveReads.listCommunitySubscribers(
      communityName,
      req.query.lastSubscriber || '',
    );
    res.set('Cache-Control', 'public, max-age=60').json(subscribers);
  } catch (error) {
    next(error);
  }
});

router.get('/check-membership', async (req, res, next) => {
  try {
    const username = requireHiveAccount(req.query.username);
    const community = requireConfiguredCommunity(req.query.community, req.app.locals.config);
    const isMember = await req.app.locals.services.hiveReads.isCommunityMember(
      username,
      community,
    );
    res.set('Cache-Control', 'no-store').json({ isMember });
  } catch (error) {
    next(error);
  }
});

router.get('/api/latest-thread-container', async (req, res, next) => {
  try {
    const container = await req.app.locals.services.hiveReads.getLatestThreadContainer(
      req.app.locals.config.hive.threadsContainerAccount,
      threadContainerOptions(req),
    );
    if (!container) throw new NotFoundError('No thread container is available yet');
    res.set('Cache-Control', 'public, max-age=30').json(container);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
