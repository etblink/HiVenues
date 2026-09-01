'use strict';

const SUPPORTED_ACCOUNT_NOTIFICATION_TYPES = Object.freeze([
  'reply',
  'mention',
  'vote',
  'follow',
  'reblog',
  'subscribe',
]);

const TYPE_LABELS = Object.freeze({
  reply: 'Reply',
  mention: 'Mention',
  vote: 'Vote',
  follow: 'Follow',
  reblog: 'Reblog',
  subscribe: 'Community',
});

const HIVE_ACCOUNT_PATTERN = /^(?=.{3,64}$)[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/;
const PERMLINK_PATTERN = /^[a-z0-9][a-z0-9-]{0,255}$/;
const COMMUNITY_PATTERN = /^hive-[0-9]{3,12}$/;
const ZONELESS_HIVE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

function boundedLimit(value, fallback = 20) {
  const parsed = Number(value);
  return Math.min(50, Math.max(1, Number.isFinite(parsed) ? Math.floor(parsed) : fallback));
}

function normalizeNotificationDate(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  const candidate = ZONELESS_HIVE_TIME.test(raw) ? `${raw}Z` : raw;
  const date = new Date(candidate);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function safeHiveAccount(value) {
  const account = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return HIVE_ACCOUNT_PATTERN.test(account) ? account : null;
}

function safePermlink(value) {
  const permlink = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return PERMLINK_PATTERN.test(permlink) ? permlink : null;
}

function safePath(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || raw.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return null;
  let pathname;
  try {
    pathname = new URL(raw, 'https://hive.invalid/').pathname;
  } catch {
    return null;
  }
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return '';
    }
  });
}

function localRouteForNotificationUrl(value) {
  const segments = safePath(value);
  if (!segments || segments.length === 0 || segments.some((segment) => !segment)) return null;

  if (segments.length === 1 && segments[0].startsWith('@')) {
    const account = safeHiveAccount(segments[0].slice(1));
    return account ? `/profile/${account}` : null;
  }

  let authorSegment;
  let permlinkSegment;
  if (segments.length === 2 && segments[0].startsWith('@')) {
    [authorSegment, permlinkSegment] = segments;
  } else if (
    segments.length === 3 &&
    (COMMUNITY_PATTERN.test(segments[0]) || /^[a-z0-9-]{1,64}$/.test(segments[0])) &&
    segments[1].startsWith('@')
  ) {
    [, authorSegment, permlinkSegment] = segments;
  } else {
    return null;
  }

  const author = safeHiveAccount(authorSegment.slice(1));
  const permlink = safePermlink(permlinkSegment);
  return author && permlink ? `/post/${author}/${permlink}` : null;
}

function normalizeAccountNotification(raw = {}) {
  const type = typeof raw.type === 'string' ? raw.type.trim().toLowerCase() : '';
  if (!SUPPORTED_ACCOUNT_NOTIFICATION_TYPES.includes(type)) return null;

  const id = String(raw.id ?? '').trim();
  if (!/^\d{1,30}$/.test(id)) return null;

  const message = typeof raw.msg === 'string' ? raw.msg.trim().replace(/\s+/g, ' ') : '';
  if (!message) return null;

  return Object.freeze({
    id,
    type,
    label: TYPE_LABELS[type],
    message: message.slice(0, 500),
    date: normalizeNotificationDate(raw.date),
    localRoute: localRouteForNotificationUrl(raw.url),
  });
}

function normalizeAccountNotifications(rawItems, { limit = 20 } = {}) {
  const maximum = boundedLimit(limit);
  const items = [];
  const seenIds = new Set();
  for (const raw of Array.isArray(rawItems) ? rawItems : []) {
    const item = normalizeAccountNotification(raw);
    if (!item || seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    items.push(item);
    if (items.length >= maximum) break;
  }
  return items;
}

async function readAccountNotifications(rpcPool, { account, limit = 20 } = {}) {
  if (!rpcPool || typeof rpcPool.call !== 'function') {
    throw new TypeError('Account notifications require a Hive RPC pool');
  }
  const username = safeHiveAccount(account);
  if (!username) throw new TypeError('Account notifications require a valid Hive account');
  const visibleLimit = boundedLimit(limit);
  const requestLimit = Math.min(100, Math.max(visibleLimit, visibleLimit * 2));
  const raw = await rpcPool.call('bridge', 'account_notifications', {
    account: username,
    limit: requestLimit,
  });
  return {
    items: normalizeAccountNotifications(raw, { limit: visibleLimit }),
  };
}

module.exports = {
  SUPPORTED_ACCOUNT_NOTIFICATION_TYPES,
  localRouteForNotificationUrl,
  normalizeAccountNotification,
  normalizeAccountNotifications,
  normalizeNotificationDate,
  readAccountNotifications,
};