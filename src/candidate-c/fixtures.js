'use strict';

const { validateHostGraph } = require('./model');

const northline = validateHostGraph({
  schemaVersion: 1,
  identity: {
    hostId: 'host-northline-001',
    slug: 'northline-hall',
    displayName: 'Northline Hall',
    archetype: 'neighborhood live room',
    timezone: 'America/Los_Angeles',
  },
  facts: {
    tagline: 'Good nights live here.',
    summary: 'A close room for live sound, late sets, and the people who keep showing up.',
    presence: {
      mode: 'physical',
      label: 'Downtown Las Vegas · doors open 7 PM on show nights',
      address: '416 Northline Avenue, Las Vegas, NV',
    },
    contact: 'hello@northline.example',
  },
  activities: [
    {
      id: 'activity-northline-friday-001',
      slug: 'friday-night-assembly',
      title: 'Friday Night Assembly',
      description: 'Three local sets, one close stage, and a room built for staying through the encore.',
      startsAt: '2026-09-18T19:30:00-07:00',
      endsAt: '2026-09-18T23:15:00-07:00',
      presence: {
        mode: 'physical',
        venueName: 'Northline Hall',
        address: '416 Northline Avenue, Las Vegas, NV',
      },
      lifecycle: 'scheduled',
      mediaId: 'media-northline-stage-001',
      publicActions: [
        { mechanic: 'rsvp_local' },
        { mechanic: 'calendar_ics' },
        { mechanic: 'applaud_hive' },
      ],
    },
  ],
  offers: [
    {
      id: 'offer-northline-private-001',
      title: 'Private room nights',
      summary: 'Small-room buyouts for rehearsals, listening parties, and community gatherings.',
    },
  ],
  media: [
    {
      id: 'media-northline-stage-001',
      kind: 'bootstrap-art',
      alt: 'Abstract amber stage-light study with a low horizon and close-room atmosphere.',
      provenance: 'Deterministic HiVenues bootstrap artwork; not documentary photography.',
      focal: { x: 56, y: 42 },
      palette: ['#160d0b', '#6d2918', '#ef9f55', '#f7e0bd'],
    },
  ],
  voice: {
    terms: {
      rsvp_local: 'Save me a spot',
      calendar_ics: 'Put it on my calendar',
      applaud_hive: 'Raise a glass',
      voting_capacity: 'Your pitcher',
      follow_account: 'Become a regular',
    },
    tone: 'warm, tactile, neighborly, a little nocturnal',
  },
  presentation: {
    compositionFamily: 'poster',
    arrangement: ['hero', 'activity', 'story', 'details', 'offer'],
    accent: '#ef9f55',
  },
  bindings: {
    hive: { state: 'disconnected', account: null, communityId: null },
    media: { state: 'local', provider: null },
  },
  intent: {
    purpose: 'Give the neighborhood one memorable place to discover the next live night.',
    presenceMaterial: 'Dark wood, amber light, close stage, hand-set poster energy.',
    direction: 'poster',
    participation: 'Attend, remember the date, support the room and artists.',
  },
});

const nova = validateHostGraph({
  schemaVersion: 1,
  identity: {
    hostId: 'host-nova-001',
    slug: 'nova-ashby',
    displayName: 'Nova Ashby',
    archetype: 'locationless creator and field-note studio',
    timezone: 'America/New_York',
  },
  facts: {
    tagline: 'Cities that do not exist yet.',
    summary: 'Field notes, live sessions, and speculative urban stories from a studio that moves with the work.',
    presence: {
      mode: 'online',
      label: 'Locationless · sessions stream from wherever the work is happening',
    },
    contact: 'studio@novaashby.example',
  },
  activities: [
    {
      id: 'activity-nova-session-001',
      slug: 'soft-infrastructure-live-session',
      title: 'Soft Infrastructure — Live Session',
      description: 'A live visual notebook about night buses, informal routes, and the systems people invent between official maps.',
      startsAt: '2026-09-20T20:00:00-04:00',
      endsAt: '2026-09-20T21:10:00-04:00',
      presence: {
        mode: 'online',
        platformLabel: 'HiVenues session room',
      },
      lifecycle: 'scheduled',
      mediaId: 'media-nova-grid-001',
      publicActions: [
        { mechanic: 'rsvp_local' },
        { mechanic: 'calendar_ics' },
        { mechanic: 'applaud_hive' },
      ],
    },
  ],
  offers: [
    {
      id: 'offer-nova-notes-001',
      title: 'Field-note dispatches',
      summary: 'Occasional essays, sketches, references, and recordings from works in progress.',
    },
  ],
  media: [
    {
      id: 'media-nova-grid-001',
      kind: 'bootstrap-art',
      alt: 'Abstract lavender city-grid study with offset blocks and a luminous vertical route.',
      provenance: 'Deterministic HiVenues bootstrap artwork; not documentary photography.',
      focal: { x: 63, y: 34 },
      palette: ['#f5f1ff', '#bdaeff', '#6e59c8', '#242039'],
    },
  ],
  voice: {
    terms: {
      rsvp_local: 'Hold my place',
      calendar_ics: 'Keep the session',
      applaud_hive: 'Send a spark',
      voting_capacity: 'Your battery',
      follow_account: 'Follow the signal',
    },
    tone: 'editorial, curious, lucid, lightly speculative',
  },
  presentation: {
    compositionFamily: 'editorial',
    arrangement: ['story', 'hero', 'activity', 'offer', 'details'],
    accent: '#6e59c8',
  },
  bindings: {
    hive: { state: 'disconnected', account: null, communityId: null },
    media: { state: 'local', provider: null },
  },
  intent: {
    purpose: 'Make the current research feel like a living publication rather than a social profile.',
    presenceMaterial: 'Field notes, diagrams, live sessions, quiet editorial pacing.',
    direction: 'editorial',
    participation: 'Join a session, keep a date, follow the work without needing platform literacy.',
  },
});

function seedCandidateCHosts() {
  return [northline, nova].map((host) => structuredClone(host));
}

module.exports = { seedCandidateCHosts };
