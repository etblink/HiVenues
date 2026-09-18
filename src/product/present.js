'use strict';

const { activityLifecycles, disclosureFor, formatActivityTime, mechanicRegistry } = require('./model');

const compositionRegistry = Object.freeze({
  poster: Object.freeze({
    id: 'poster',
    label: 'Poster room',
    publicTemplate: 'hivenues/compositions/poster',
    activityTemplate: 'hivenues/compositions/poster-activity',
    studioClass: 'cc-family-poster',
    description: 'Tactile venue grammar with oversized type, stacked show information, close-room rhythm, and warm dark surfaces.',
  }),
  editorial: Object.freeze({
    id: 'editorial',
    label: 'Editorial field notes',
    publicTemplate: 'hivenues/compositions/editorial',
    activityTemplate: 'hivenues/compositions/editorial-activity',
    studioClass: 'cc-family-editorial',
    description: 'Open editorial grammar with asymmetrical columns, quiet annotation, media-led pacing, and publication-like whitespace.',
  }),
  hospitality: Object.freeze({
    id: 'hospitality',
    label: 'Hospitality table',
    publicTemplate: 'hivenues/compositions/hospitality',
    activityTemplate: 'hivenues/compositions/hospitality-activity',
    studioClass: 'cc-family-hospitality',
    description: 'Image-led hospitality grammar with a compact service masthead, menu-first hierarchy, table invitations, and calm editorial warmth.',
  }),
});

function isLogoMedia(graph, media) {
  return media?.id === `media-${graph.identity.slug}-logo`;
}

function mediaFor(graph, mediaId) {
  return graph.media.find((item) => item.id === mediaId)
    || graph.media.find((item) => !isLogoMedia(graph, item))
    || graph.media[0];
}

function contactFor(value) {
  const label = String(value || '').trim();
  if (/^https?:\/\//i.test(label)) return { label, href: label, kind: 'web' };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(label)) return { label, href: `mailto:${label}`, kind: 'email' };
  if (/^[+0-9().\-\s]+$/.test(label)) {
    const tel = label.replace(/[^\d+]/g, '');
    if (/^\+?\d{7,15}$/.test(tel)) return { label, href: `tel:${tel}`, kind: 'phone' };
  }
  return { label, href: null, kind: 'text' };
}

function buildViewModel(snapshot) {
  if (!snapshot) return null;
  const graph = snapshot.draft;
  const family = compositionRegistry[graph.presentation.compositionFamily];
  const liveRelease = snapshot.releases.find((item) => item.id === snapshot.liveReleaseId) || null;
  const logoMedia = graph.media.find((item) => isLogoMedia(graph, item)) || null;
  const heroMedia = graph.media.find((item) => !isLogoMedia(graph, item)) || graph.media[0];
  const activities = graph.activities.map((activity) => ({
    ...activity,
    humanTime: formatActivityTime(activity, graph.identity.timezone),
    status: activityLifecycles[activity.lifecycle],
    open: activity.lifecycle === 'scheduled',
    live: liveRelease ? liveRelease.snapshot.activities.find((item) => item.id === activity.id) || null : null,
    media: mediaFor(graph, activity.mediaId),
    actions: activity.publicActions.map((action) => ({
      mechanic: action.mechanic,
      term: graph.voice.terms[action.mechanic] || action.mechanic,
      disclosure: disclosureFor(action.mechanic, graph),
      definition: mechanicRegistry[action.mechanic],
    })),
  }));
  const featuredActivity = activities[0] || null;
  const discoverableActivities = featuredActivity ? activities.filter((activity) => activity.id !== featuredActivity.id) : [];
  return {
    graph,
    family,
    activities,
    featuredActivity,
    primaryActivity: featuredActivity,
    discoverableActivities,
    media: graph.media,
    heroMedia,
    logoMedia,
    contact: contactFor(graph.facts.contact),
    release: liveRelease,
    lifecycles: activityLifecycles,
    revision: snapshot.revision,
    releases: snapshot.releases,
    liveReleaseId: snapshot.liveReleaseId,
    manualPaths: snapshot.manualPaths || [],
    draftDigest: snapshot.draftDigest,
  };
}

function escapeIcs(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function utcStamp(value) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function renderIcs(graph, activity) {
  const location = activity.presence.mode === 'online'
    ? activity.presence.platformLabel
    : activity.presence.address;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HiVenues//HiVenues Phase 2A//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(activity.id)}@hivenues.local`,
    `DTSTAMP:${utcStamp(activity.startsAt)}`,
    `DTSTART:${utcStamp(activity.startsAt)}`,
    `DTEND:${utcStamp(activity.endsAt)}`,
    `SUMMARY:${escapeIcs(activity.lifecycle === 'cancelled' ? `Cancelled: ${activity.title}` : activity.title)}`,
    `DESCRIPTION:${escapeIcs(activity.statusNote ? `${activity.statusNote}\n\n${activity.description}` : activity.description)}`,
    `STATUS:${activity.lifecycle === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    `LOCATION:${escapeIcs(location)}`,
    `URL:/hivenues/${escapeIcs(graph.identity.slug)}/activities/${escapeIcs(activity.slug)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

module.exports = { buildViewModel, compositionRegistry, contactFor, mediaFor, renderIcs };
