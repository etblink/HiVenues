'use strict';

const HOME_UPDATES_LIMIT = 3;
const HOME_PULSE_LIMIT = 3;

function createPulseContentFilter(venue) {
  const excludedAuthors = new Set([
    venue?.hive?.officialAccount,
    venue?.hive?.threadsContainerAccount,
  ].filter(Boolean));

  return (item) => Boolean(
    item &&
      item.parentAuthor === '' &&
      item.author &&
      !excludedAuthors.has(item.author),
  );
}

async function loadOfficialUpdates({ hiveReads, venue, logger }) {
  try {
    const items = await hiveReads.getOfficialCommunityPosts({
      account: venue.hive.officialAccount,
      community: venue.hive.communityId,
      limit: HOME_UPDATES_LIMIT,
    });
    return { items, status: items.length > 0 ? 'ready' : 'empty' };
  } catch (error) {
    logger?.warn?.({ err: error }, 'Official home-page updates are unavailable');
    return { items: [], status: 'unavailable' };
  }
}

async function loadCommunityPulse({ moderation, venue, logger }) {
  try {
    const page = await moderation.getCommunityPosts({
      name: venue.hive.communityId,
      sort: 'created',
      cursor: null,
      contentFilter: createPulseContentFilter(venue),
    });
    const items = Array.isArray(page?.items) ? page.items.slice(0, HOME_PULSE_LIMIT) : [];
    return { items, status: items.length > 0 ? 'ready' : 'empty' };
  } catch (error) {
    logger?.warn?.({ err: error }, 'Home-page community pulse is unavailable');
    return { items: [], status: 'unavailable' };
  }
}

async function loadHomeReadModel({ services, venue, logger = null }) {
  const [officialUpdates, communityPulse] = await Promise.all([
    loadOfficialUpdates({ hiveReads: services.hiveReads, venue, logger }),
    loadCommunityPulse({ moderation: services.moderation, venue, logger }),
  ]);
  return { officialUpdates, communityPulse };
}

module.exports = {
  HOME_PULSE_LIMIT,
  HOME_UPDATES_LIMIT,
  createPulseContentFilter,
  loadHomeReadModel,
};
