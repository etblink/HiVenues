'use strict';

const express = require('express');
const { requireHiveAccount, requirePermlink } = require('../http/validation');
const { normalizeBindings, formatCommunityTime } = require('./community-router');
const { buildViewModel } = require('./present');

const SOCIAL_TEMPLATES = Object.freeze({
  poster: Object.freeze({
    hub: 'candidate-c/social/poster-hub',
    member: 'candidate-c/social/poster-member',
    discussion: 'candidate-c/social/poster-discussion',
  }),
  editorial: Object.freeze({
    hub: 'candidate-c/social/editorial-hub',
    member: 'candidate-c/social/editorial-member',
    discussion: 'candidate-c/social/editorial-discussion',
  }),
  hospitality: Object.freeze({
    hub: 'candidate-c/social/hospitality-hub',
    member: 'candidate-c/social/hospitality-member',
    discussion: 'candidate-c/social/hospitality-discussion',
  }),
});

function socialState(status, issue = null, values = {}) {
  return Object.freeze({
    status,
    issue,
    community: null,
    posts: Object.freeze([]),
    threads: Object.freeze([]),
    people: Object.freeze([]),
    ...values,
  });
}

function isSocialBinding(binding) {
  return Boolean(
    binding
      && typeof binding === 'object'
      && !Array.isArray(binding)
      && typeof binding.community === 'string'
      && /^hive-[0-9]{3,12}$/.test(binding.community)
      && typeof binding.threadsAccount === 'string'
      && /^[a-z][a-z0-9.-]{2,15}$/.test(binding.threadsAccount),
  );
}

function hasSocialReadContract(service) {
  return Boolean(
    service
      && typeof service.getCommunity === 'function'
      && typeof service.getCommunityPosts === 'function'
      && typeof service.getLatestThreads === 'function'
      && typeof service.listCommunitySubscribers === 'function'
      && typeof service.getProfiles === 'function'
      && typeof service.getProfile === 'function'
      && typeof service.getAccountPosts === 'function'
      && typeof service.getFollowers === 'function'
      && typeof service.getFollowing === 'function'
      && typeof service.isCommunityMember === 'function',
  );
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validContentPage(value) {
  return isRecord(value)
    && Array.isArray(value.items)
    && isRecord(value.profiles)
    && (value.nextCursor === null || typeof value.nextCursor === 'string');
}

function validThreads(value) {
  return isRecord(value)
    && (value.container === null || isRecord(value.container))
    && Array.isArray(value.threads)
    && isRecord(value.profiles);
}

function validCommunity(value) {
  return value === null || (isRecord(value) && typeof value.name === 'string');
}

function safeAccount(value) {
  try {
    return requireHiveAccount(value);
  } catch {
    return null;
  }
}


function participationCapability(res) {
  return Boolean(res.locals?.hivenuesParticipationAvailable);
}

function verifiedViewer(res) {
  return safeAccount(res.locals?.hivenuesIdentity?.account);
}


function contentCapability(res) {
  return Boolean(res.locals?.hivenuesContentAvailable);
}

function hasContentReadContract(service) {
  return Boolean(
    service
      && typeof service.getPostWithComments === 'function'
      && typeof service.getContentRecord === 'function',
  );
}

async function readDiscussion(hiveReads, binding, author, permlink, viewer, available) {
  const base = {
    status: 'unavailable',
    issue: null,
    actor: viewer || null,
    available: Boolean(available),
    post: null,
    comments: Object.freeze([]),
    profiles: Object.freeze({}),
    updateRecord: null,
  };
  if (!isSocialBinding(binding)) return Object.freeze({ ...base, issue: 'binding-invalid' });
  if (!hasContentReadContract(hiveReads)) {
    return Object.freeze({ ...base, issue: 'provider-not-configured' });
  }

  let discussion;
  try {
    discussion = await hiveReads.getPostWithComments(author, permlink);
  } catch {
    return Object.freeze({ ...base, status: 'missing', issue: 'post-not-found' });
  }
  if (
    !discussion?.post
    || discussion.post.author !== author
    || discussion.post.permlink !== permlink
    || discussion.post.parentAuthor !== ''
    || discussion.post.parentPermlink !== binding.community
    || !Array.isArray(discussion.comments)
  ) {
    return Object.freeze({ ...base, status: 'missing', issue: 'post-not-in-host-community' });
  }

  let updateRecord = null;
  let status = 'ready';
  let issue = null;
  if (viewer === author && available) {
    try {
      updateRecord = await hiveReads.getContentRecord(author, permlink);
      if (
        !updateRecord
        || updateRecord.author !== author
        || updateRecord.permlink !== permlink
        || updateRecord.parentAuthor !== ''
        || updateRecord.parentPermlink !== binding.community
      ) {
        updateRecord = null;
        status = 'partial';
        issue = 'update-record-unavailable';
      }
    } catch {
      status = 'partial';
      issue = 'update-record-unavailable';
    }
  }

  return Object.freeze({
    ...base,
    status,
    issue,
    post: discussion.post,
    comments: Object.freeze(discussion.comments),
    profiles: Object.freeze(discussion.profiles || {}),
    updateRecord,
  });
}

async function readCommunityRelationship(hiveReads, binding, viewer, available) {
  const base = {
    available: Boolean(available),
    actor: viewer || null,
    community: isSocialBinding(binding) ? binding.community : null,
    subscribed: null,
    issue: null,
  };
  if (!available) return Object.freeze({ ...base, issue: 'participation-unavailable' });
  if (!viewer) return Object.freeze({ ...base, issue: 'identity-required' });
  if (!isSocialBinding(binding)) return Object.freeze({ ...base, issue: 'binding-invalid' });
  if (!hiveReads || typeof hiveReads.isCommunityMember !== 'function') {
    return Object.freeze({ ...base, issue: 'relationship-read-unavailable' });
  }
  try {
    const subscribed = await hiveReads.isCommunityMember(viewer, binding.community);
    if (typeof subscribed !== 'boolean') {
      return Object.freeze({ ...base, issue: 'relationship-read-invalid' });
    }
    return Object.freeze({ ...base, subscribed });
  } catch {
    return Object.freeze({ ...base, issue: 'relationship-read-unavailable' });
  }
}

async function readFollowRelationship(hiveReads, target, viewer, available) {
  const base = {
    available: Boolean(available),
    actor: viewer || null,
    target,
    following: null,
    issue: null,
  };
  if (!available) return Object.freeze({ ...base, issue: 'participation-unavailable' });
  if (!viewer) return Object.freeze({ ...base, issue: 'identity-required' });
  if (viewer === target) return Object.freeze({ ...base, issue: 'self-target' });
  if (!hiveReads || typeof hiveReads.getFollowStatus !== 'function') {
    return Object.freeze({ ...base, issue: 'relationship-read-unavailable' });
  }
  try {
    const following = await hiveReads.getFollowStatus(viewer, target);
    if (typeof following !== 'boolean') {
      return Object.freeze({ ...base, issue: 'relationship-read-invalid' });
    }
    return Object.freeze({ ...base, following });
  } catch {
    return Object.freeze({ ...base, issue: 'relationship-read-unavailable' });
  }
}

function profileFor(profiles, name) {
  const profile = profiles?.[name];
  return isRecord(profile) ? profile : null;
}

function mergeProfiles(...maps) {
  return Object.assign({}, ...maps.filter(isRecord));
}

function peopleFromHub({ postsPage, threadsData, subscribers, subscriberProfiles }) {
  const people = new Map();
  const profiles = mergeProfiles(postsPage?.profiles, threadsData?.profiles, subscriberProfiles);

  function touch(name, source, role = null) {
    const account = safeAccount(name);
    if (!account) return;
    const existing = people.get(account) || {
      name: account,
      sources: new Set(),
      role: null,
    };
    existing.sources.add(source);
    if (!existing.role && role) existing.role = String(role);
    people.set(account, existing);
  }

  for (const item of postsPage?.items || []) touch(item.author, 'story');
  for (const item of threadsData?.threads || []) touch(item.author, 'update');
  for (const subscriber of subscribers || []) touch(subscriber?.name, 'subscriber', subscriber?.role);

  return Object.freeze([...people.values()].slice(0, 18).map((person) => {
    const profile = profileFor(profiles, person.name);
    return Object.freeze({
      name: person.name,
      displayName: profile?.displayName || person.name,
      about: profile?.about || '',
      profileImage: profile?.profileImage || `https://images.hive.blog/u/${person.name}/avatar/small`,
      sources: Object.freeze([...person.sources]),
      role: person.role,
    });
  }));
}

async function readSocialHub(hiveReads, binding) {
  if (!binding) return socialState('unavailable', 'social-not-configured');
  if (!isSocialBinding(binding)) return socialState('degraded', 'binding-invalid');
  if (!hasSocialReadContract(hiveReads)) return socialState('unavailable', 'provider-not-configured');

  const [communityResult, postsResult, threadsResult, subscribersResult] = await Promise.allSettled([
    hiveReads.getCommunity(binding.community),
    hiveReads.getCommunityPosts({ name: binding.community, sort: 'created' }),
    hiveReads.getLatestThreads(binding.threadsAccount),
    hiveReads.listCommunitySubscribers(binding.community),
  ]);

  const results = [communityResult, postsResult, threadsResult, subscribersResult];
  if (results.every((result) => result.status === 'rejected')) {
    return socialState('unavailable', 'provider-unavailable');
  }

  const community = communityResult.status === 'fulfilled' ? communityResult.value : null;
  const postsPage = postsResult.status === 'fulfilled' ? postsResult.value : null;
  const threadsData = threadsResult.status === 'fulfilled' ? threadsResult.value : null;
  const subscribers = subscribersResult.status === 'fulfilled' ? subscribersResult.value : [];

  if (
    (communityResult.status === 'fulfilled' && !validCommunity(community))
      || (postsResult.status === 'fulfilled' && !validContentPage(postsPage))
      || (threadsResult.status === 'fulfilled' && !validThreads(threadsData))
      || (subscribersResult.status === 'fulfilled' && !Array.isArray(subscribers))
  ) {
    return socialState('degraded', 'read-contract-invalid');
  }

  const subscriberNames = subscribers
    .map((subscriber) => safeAccount(subscriber?.name))
    .filter(Boolean)
    .slice(0, 18);
  let subscriberProfiles = {};
  let subscriberProfilesUnavailable = false;
  if (subscriberNames.length) {
    try {
      subscriberProfiles = await hiveReads.getProfiles(subscriberNames);
      if (!isRecord(subscriberProfiles)) return socialState('degraded', 'read-contract-invalid');
    } catch {
      subscriberProfilesUnavailable = true;
    }
  }

  const people = peopleFromHub({
    postsPage,
    threadsData,
    subscribers,
    subscriberProfiles,
  });
  const posts = Object.freeze(postsPage?.items || []);
  const threads = Object.freeze(threadsData?.threads || []);
  const failures = results.filter((result) => result.status === 'rejected').length
    + Number(subscriberProfilesUnavailable);
  const hasMaterial = Boolean(community || posts.length || threads.length || people.length);
  const status = failures
    ? (hasMaterial ? 'partial' : 'unavailable')
    : (posts.length || threads.length || people.length ? 'ready' : 'empty');

  return socialState(status, failures ? 'source-partial' : null, {
    community,
    posts,
    threads,
    people,
  });
}

function hubStateCopy(hub, hostName) {
  if (hub.status === 'partial') {
    return {
      heading: 'Some community signals are temporarily missing.',
      body: 'The material that could be read safely is still shown below.',
    };
  }
  if (hub.status === 'empty') {
    return {
      heading: 'It is quiet here right now.',
      body: `${hostName} has no recent public updates or community stories to show yet.`,
    };
  }
  if (hub.status === 'degraded') {
    return {
      heading: 'This community view cannot be shown safely right now.',
      body: 'The read-side contract did not match what HiVenues expects, so nothing was invented to fill the gap.',
    };
  }
  if (hub.issue === 'provider-unavailable') {
    return {
      heading: 'Community updates are temporarily unavailable.',
      body: 'The host site remains available while the public Hive read source reconnects.',
    };
  }
  return {
    heading: 'Community updates are not connected for this place yet.',
    body: 'This surface stays read-only and honest until its public Hive bindings are configured.',
  };
}

function validMemberPage(value) {
  return validContentPage(value);
}

function validConnectionPage(value) {
  return isRecord(value)
    && Array.isArray(value.items)
    && (value.nextCursor === null || typeof value.nextCursor === 'string');
}

async function readMember(hiveReads, binding, account) {
  if (!binding) return { status: 'unavailable', issue: 'social-not-configured', account };
  if (!isSocialBinding(binding)) return { status: 'degraded', issue: 'binding-invalid', account };
  if (!hasSocialReadContract(hiveReads)) return { status: 'unavailable', issue: 'provider-not-configured', account };

  const [profileResult, postsResult, followersResult, followingResult, membershipResult, recentResult] = await Promise.allSettled([
    hiveReads.getProfile(account),
    hiveReads.getAccountPosts({ account }),
    hiveReads.getFollowers(account),
    hiveReads.getFollowing(account),
    hiveReads.isCommunityMember(account, binding.community),
    hiveReads.getCommunityPosts({ name: binding.community, sort: 'created' }),
  ]);

  if (profileResult.status === 'fulfilled' && profileResult.value === null) {
    return { status: 'missing', issue: 'profile-not-found', account };
  }
  if (profileResult.status === 'rejected') {
    return { status: 'unavailable', issue: 'profile-unavailable', account };
  }
  if (!isRecord(profileResult.value) || profileResult.value.name !== account) {
    return { status: 'degraded', issue: 'read-contract-invalid', account };
  }

  if (
    (postsResult.status === 'fulfilled' && !validMemberPage(postsResult.value))
      || (followersResult.status === 'fulfilled' && !validConnectionPage(followersResult.value))
      || (followingResult.status === 'fulfilled' && !validConnectionPage(followingResult.value))
      || (membershipResult.status === 'fulfilled' && typeof membershipResult.value !== 'boolean')
      || (recentResult.status === 'fulfilled' && !validContentPage(recentResult.value))
  ) {
    return { status: 'degraded', issue: 'read-contract-invalid', account };
  }

  const results = [postsResult, followersResult, followingResult, membershipResult, recentResult];
  const failures = results.filter((result) => result.status === 'rejected').length;
  const recentProfiles = recentResult.status === 'fulfilled' ? recentResult.value.profiles : {};
  const relatedPeople = Object.values(recentProfiles)
    .filter((profile) => isRecord(profile) && profile.name && profile.name !== account)
    .slice(0, 6);

  return Object.freeze({
    status: failures ? 'partial' : 'ready',
    issue: failures ? 'source-partial' : null,
    account,
    profile: profileResult.value,
    posts: Object.freeze(postsResult.status === 'fulfilled' ? postsResult.value.items : []),
    followers: Object.freeze(followersResult.status === 'fulfilled' ? followersResult.value.items : []),
    following: Object.freeze(followingResult.status === 'fulfilled' ? followingResult.value.items : []),
    membership: membershipResult.status === 'fulfilled' ? membershipResult.value : null,
    relatedPeople: Object.freeze(relatedPeople),
  });
}

function memberStateCopy(member, hostName) {
  if (member.status === 'partial') {
    return {
      heading: 'Some connection details are temporarily missing.',
      body: `The profile material that could be read safely is still shown in the context of ${hostName}.`,
    };
  }
  if (member.status === 'degraded') {
    return {
      heading: 'This profile cannot be shown safely right now.',
      body: 'The read-side contract was invalid, so HiVenues did not guess at profile or connection state.',
    };
  }
  return {
    heading: 'This profile is temporarily unavailable.',
    body: `Return to ${hostName} while the public profile source reconnects.`,
  };
}

function createCandidateCSocialReadRouter({
  store,
  hiveReadService = null,
  socialBindings = {},
} = {}) {
  if (!store || typeof store.publicSnapshot !== 'function') {
    throw new TypeError('Candidate C social-read router requires a public snapshot store.');
  }

  const router = express.Router();
  const bindings = normalizeBindings(socialBindings);

  router.get('/:slug/community/updates', async (req, res) => {
    const snapshot = store.publicSnapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    const view = buildViewModel(snapshot);
    const template = SOCIAL_TEMPLATES[view.family.id]?.hub;
    if (!template) return res.sendStatus(404);

    const binding = bindings.get(req.params.slug);
    const hub = await readSocialHub(hiveReadService, binding);
    const participation = await readCommunityRelationship(
      hiveReadService,
      binding,
      verifiedViewer(res),
      participationCapability(res),
    );
    const hostHref = `/candidate-c/${encodeURIComponent(view.graph.identity.slug)}`;
    const communityHref = `${hostHref}/community`;
    const socialHref = `${communityHref}/updates`;
    const memberHref = (account) => `${communityHref}/people/${encodeURIComponent(account)}`;
    const discussionHref = (author, permlink) => (
      `${communityHref}/posts/${encodeURIComponent(author)}/${encodeURIComponent(permlink)}`
    );
    const contentPostEndpoint = '/participation/'
      + encodeURIComponent(view.graph.identity.slug)
      + '/content/posts';
    res.set('Cache-Control', 'no-store');
    return res.render(template, {
      pageTitle: `Updates — ${view.graph.identity.displayName}`,
      ...view,
      hub,
      participation,
      hostHref,
      communityHref,
      socialHref,
      memberHref,
      discussionHref,
      contentPostEndpoint,
      hubStateCopy,
      formatCommunityTime,
    });
  });

  router.get('/:slug/community/people/:account', async (req, res) => {
    const snapshot = store.publicSnapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);
    let account;
    try {
      account = requireHiveAccount(req.params.account);
    } catch {
      return res.sendStatus(404);
    }

    const view = buildViewModel(snapshot);
    const template = SOCIAL_TEMPLATES[view.family.id]?.member;
    if (!template) return res.sendStatus(404);
    const binding = bindings.get(req.params.slug);
    const member = await readMember(hiveReadService, binding, account);
    if (member.status === 'missing') return res.sendStatus(404);
    const participation = await readFollowRelationship(
      hiveReadService,
      account,
      verifiedViewer(res),
      participationCapability(res),
    );

    const hostHref = `/candidate-c/${encodeURIComponent(view.graph.identity.slug)}`;
    const communityHref = `${hostHref}/community`;
    const socialHref = `${communityHref}/updates`;
    const memberHref = (name) => `${communityHref}/people/${encodeURIComponent(name)}`;
    res.set('Cache-Control', 'no-store');
    return res.render(template, {
      pageTitle: `${member.profile?.displayName || `@${account}`} — ${view.graph.identity.displayName}`,
      ...view,
      member,
      participation,
      hostHref,
      communityHref,
      socialHref,
      memberHref,
      memberStateCopy,
      formatCommunityTime,
    });
  });


  router.get('/:slug/community/posts/:author/:permlink', async (req, res) => {
    const snapshot = store.publicSnapshot(req.params.slug);
    if (!snapshot) return res.sendStatus(404);

    let author;
    let permlink;
    try {
      author = requireHiveAccount(req.params.author, 'Post author');
      permlink = requirePermlink(req.params.permlink);
    } catch {
      return res.sendStatus(404);
    }

    const view = buildViewModel(snapshot);
    const template = SOCIAL_TEMPLATES[view.family.id]?.discussion;
    if (!template) return res.sendStatus(404);
    const binding = bindings.get(req.params.slug);
    const discussion = await readDiscussion(
      hiveReadService,
      binding,
      author,
      permlink,
      verifiedViewer(res),
      contentCapability(res),
    );
    if (discussion.status === 'missing') return res.sendStatus(404);

    const hostHref = '/candidate-c/' + encodeURIComponent(view.graph.identity.slug);
    const communityHref = hostHref + '/community';
    const socialHref = communityHref + '/updates';
    const memberHref = (account) => communityHref + '/people/' + encodeURIComponent(account);
    const discussionHref = communityHref + '/posts/' + encodeURIComponent(author)
      + '/' + encodeURIComponent(permlink);
    const participationBase = '/participation/' + encodeURIComponent(view.graph.identity.slug)
      + '/content/' + encodeURIComponent(author) + '/' + encodeURIComponent(permlink);
    const contentUpdateEndpoint = participationBase + '/update';
    const contentReplyEndpoint = (parentAuthor, parentPermlink) => (
      participationBase + '/replies/' + encodeURIComponent(parentAuthor)
      + '/' + encodeURIComponent(parentPermlink)
    );

    res.set('Cache-Control', 'no-store');
    return res.render(template, {
      pageTitle: (discussion.post?.title || 'Discussion') + ' — ' + view.graph.identity.displayName,
      ...view,
      discussion,
      hostHref,
      communityHref,
      socialHref,
      memberHref,
      discussionHref,
      contentUpdateEndpoint,
      contentReplyEndpoint,
      formatCommunityTime,
    });
  });

  router.bindings = bindings;
  return router;
}

module.exports = {
  SOCIAL_TEMPLATES,
  createCandidateCSocialReadRouter,
  hasSocialReadContract,
  hubStateCopy,
  isSocialBinding,
  memberStateCopy,
  peopleFromHub,
  readCommunityRelationship,
  readDiscussion,
  readFollowRelationship,
  readMember,
  readSocialHub,
  socialState,
};
