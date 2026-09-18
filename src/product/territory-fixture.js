'use strict';

const { validateHostGraph } = require('./model');

// A deliberately rich, clearly fictional reference host used to falsify the
// Territory Kernel. It is not customer data and every visual is explicitly
// synthetic bootstrap material.
const maximalTerritoryHost = validateHostGraph({
  schemaVersion: 2,
  identity: {
    hostId: 'host-lantern-relay-001',
    slug: 'lantern-relay',
    displayName: 'Lantern Relay',
    archetype: 'fictional neighborhood arts house and listening room',
    timezone: 'America/Los_Angeles',
  },
  facts: {
    tagline: 'Small rooms. Long signals.',
    summary: 'A fictional HiVenues reference house for live sound, print, neighborhood suppers, field recordings, and the people who keep the signal moving.',
    presence: {
      mode: 'physical',
      label: 'Synthetic District · Thursday–Sunday · reference host only',
      address: '1 Reference Way, Example City, NV',
    },
    contact: 'hello@lantern-relay.example',
  },
  activities: [
    {
      id: 'activity-lantern-listening-001',
      slug: 'after-dark-listening-room',
      title: 'After Dark Listening Room',
      description: 'A close-room set built around field recordings, soft electronics, and a single long table after the final track.',
      startsAt: '2026-09-19T20:00:00-07:00',
      endsAt: '2026-09-19T22:30:00-07:00',
      presence: {
        mode: 'physical',
        venueName: 'Lantern Relay',
        address: '1 Reference Way, Example City, NV',
      },
      lifecycle: 'scheduled',
      mediaId: 'media-lantern-room-001',
      publicActions: [
        { mechanic: 'rsvp_local' },
        { mechanic: 'calendar_ics' },
        { mechanic: 'applaud_hive' },
      ],
    },
    {
      id: 'activity-lantern-print-001',
      slug: 'night-shift-print-club',
      title: 'Night Shift Print Club',
      description: 'An open table for one-color posters, imperfect registration, and swapping editions before the ink dries.',
      startsAt: '2026-09-10T18:30:00-07:00',
      endsAt: '2026-09-10T21:00:00-07:00',
      presence: {
        mode: 'physical',
        venueName: 'Lantern Relay',
        address: '1 Reference Way, Example City, NV',
      },
      lifecycle: 'completed',
      statusNote: 'This edition has wrapped. The archive remains available.',
      mediaId: 'media-lantern-print-001',
      publicActions: [
        { mechanic: 'calendar_ics' },
        { mechanic: 'applaud_hive' },
      ],
    },
    {
      id: 'activity-lantern-supper-001',
      slug: 'courtyard-supper-number-seven',
      title: 'Courtyard Supper No. 7',
      description: 'A fictional late-summer shared table with a short reading between courses.',
      startsAt: '2026-09-13T18:00:00-07:00',
      endsAt: '2026-09-13T21:00:00-07:00',
      presence: {
        mode: 'physical',
        venueName: 'Lantern Relay',
        address: '1 Reference Way, Example City, NV',
      },
      lifecycle: 'cancelled',
      statusNote: 'Cancelled in this synthetic reference so lifecycle treatment can be tested.',
      mediaId: 'media-lantern-table-001',
      publicActions: [
        { mechanic: 'calendar_ics' },
      ],
    },
  ],
  offers: [
    {
      id: 'offer-lantern-membership-001',
      category: 'Keep the room moving',
      title: 'Relay membership',
      summary: 'A fictional monthly supporter circle with early notices and archive access.',
      price: '$12 / month',
    },
    {
      id: 'offer-lantern-riso-001',
      category: 'From the press',
      title: 'Night map risograph',
      summary: 'A synthetic three-ink foldout map from the reference archive.',
      price: '$18',
    },
    {
      id: 'offer-lantern-room-001',
      category: 'Use the room',
      title: 'Listening-room residency',
      summary: 'A bounded residency format for rehearsals, readings, recording, or small public work.',
    },
  ],
  stories: [
    {
      id: 'story-lantern-roofline-001',
      slug: 'the-roofline-is-an-instrument',
      kind: 'essay',
      title: 'The roofline is an instrument',
      dek: 'Notes on listening to a neighborhood after the storefronts go dark.',
      body: 'This synthetic essay gives the Editorial direction enough long-form material to behave like a publication rather than a decorated event listing. It follows the room outward: vents, buses, late kitchens, a distant loading dock, and the quiet intervals that make each sound legible.',
      publishedAt: '2026-09-12T09:00:00-07:00',
      authorProfileIds: ['person-lantern-mara-001'],
      mediaIds: ['media-lantern-roofline-001'],
    },
    {
      id: 'story-lantern-press-001',
      slug: 'from-the-press-table',
      kind: 'dispatch',
      title: 'From the press table',
      dek: 'A short dispatch from the latest Night Shift Print Club.',
      body: 'Ink density, paper scraps, and notes from a deliberately fictional print night. This item is short enough to test a dispatch rhythm against the longer essay surface.',
      publishedAt: '2026-09-11T14:30:00-07:00',
      authorProfileIds: ['person-lantern-eli-001'],
      mediaIds: ['media-lantern-print-001'],
    },
    {
      id: 'story-lantern-window-001',
      slug: 'window-light-update',
      kind: 'update',
      title: 'Window light, 6:42 PM',
      body: 'A compact synthetic update used to test whether a host can publish something smaller than an essay without collapsing into a generic social feed.',
      publishedAt: '2026-09-15T18:42:00-07:00',
      authorProfileIds: ['person-lantern-jo-001'],
      mediaIds: ['media-lantern-room-001'],
    },
  ],
  people: [
    {
      id: 'person-lantern-mara-001',
      slug: 'mara-vale',
      displayName: 'Mara Vale',
      role: 'Fictional program steward',
      bio: 'A synthetic profile for testing contributor identity, authorship, and host-native people surfaces.',
      mediaId: 'media-lantern-portrait-001',
      links: [
        { label: 'Reference notebook', url: 'https://example.com/lantern-relay/mara' },
      ],
    },
    {
      id: 'person-lantern-eli-001',
      slug: 'eli-sorn',
      displayName: 'Eli Sorn',
      role: 'Fictional print-room lead',
      bio: 'A synthetic profile used to test role, byline, and people-index treatment across composition families.',
      mediaId: 'media-lantern-portrait-002',
      links: [],
    },
    {
      id: 'person-lantern-jo-001',
      slug: 'jo-cass',
      displayName: 'Jo Cass',
      role: 'Fictional sound resident',
      bio: 'A synthetic resident profile for testing a compact contributor with both event and story relationships.',
      mediaId: 'media-lantern-portrait-003',
      links: [],
    },
  ],
  gallery: {
    title: 'Room studies',
    summary: 'Synthetic studies of the listening room, print table, courtyard, roofline, and people of the reference host.',
    mediaIds: [
      'media-lantern-room-001',
      'media-lantern-print-001',
      'media-lantern-table-001',
      'media-lantern-roofline-001',
      'media-lantern-portrait-001',
      'media-lantern-portrait-002',
      'media-lantern-portrait-003',
    ],
  },
  media: [
    {
      id: 'media-lantern-room-001',
      kind: 'bootstrap-art',
      alt: 'Synthetic amber listening-room study with a low stage and a long table.',
      provenance: 'Deterministic HiVenues synthetic reference artwork; not documentary photography.',
      focal: { x: 58, y: 45 },
      palette: ['#17120f', '#70402d', '#d98b50', '#f1ddbe'],
    },
    {
      id: 'media-lantern-print-001',
      kind: 'bootstrap-art',
      alt: 'Synthetic cobalt and warm-red print-table study with paper layers and registration marks.',
      provenance: 'Deterministic HiVenues synthetic reference artwork; not documentary photography.',
      focal: { x: 48, y: 52 },
      palette: ['#152238', '#335c9a', '#c75a43', '#efe7d3'],
    },
    {
      id: 'media-lantern-table-001',
      kind: 'bootstrap-art',
      alt: 'Synthetic courtyard table study with linen, low lamps, and dark foliage.',
      provenance: 'Deterministic HiVenues synthetic reference artwork; not documentary photography.',
      focal: { x: 51, y: 64 },
      palette: ['#182018', '#687154', '#ad754e', '#eadbc1'],
    },
    {
      id: 'media-lantern-roofline-001',
      kind: 'bootstrap-art',
      alt: 'Synthetic violet roofline study with antenna silhouettes and a pale evening sky.',
      provenance: 'Deterministic HiVenues synthetic reference artwork; not documentary photography.',
      focal: { x: 61, y: 35 },
      palette: ['#25223b', '#665d8a', '#c0b6dc', '#f0e5ce'],
    },
    {
      id: 'media-lantern-portrait-001',
      kind: 'bootstrap-art',
      alt: 'Synthetic abstract portrait study for Mara Vale.',
      provenance: 'Deterministic HiVenues synthetic reference artwork; not a real person.',
      focal: { x: 50, y: 42 },
      palette: ['#261b18', '#8c5e48', '#d7a36f', '#f0d9bb'],
    },
    {
      id: 'media-lantern-portrait-002',
      kind: 'bootstrap-art',
      alt: 'Synthetic abstract portrait study for Eli Sorn.',
      provenance: 'Deterministic HiVenues synthetic reference artwork; not a real person.',
      focal: { x: 52, y: 40 },
      palette: ['#17252d', '#3d6b76', '#a6beb5', '#eee3c9'],
    },
    {
      id: 'media-lantern-portrait-003',
      kind: 'bootstrap-art',
      alt: 'Synthetic abstract portrait study for Jo Cass.',
      provenance: 'Deterministic HiVenues synthetic reference artwork; not a real person.',
      focal: { x: 47, y: 44 },
      palette: ['#282238', '#755f88', '#c79791', '#efdfcb'],
    },
  ],
  voice: {
    terms: {
      rsvp_local: 'Hold a place',
      calendar_ics: 'Keep the date',
      applaud_hive: 'Send a signal',
      voting_capacity: 'Your signal strength',
      follow_account: 'Stay on the relay',
    },
    tone: 'warm, precise, art-house, neighborly, never platform-first',
  },
  presentation: {
    compositionFamily: 'poster',
    arrangement: ['hero', 'activities', 'stories', 'gallery', 'offers', 'people', 'about'],
    accent: '#d98b50',
    recipe: {
      emphasis: 'balanced',
      density: 'balanced',
      navigation: 'expanded',
      mediaRhythm: 'alternating',
    },
  },
  navigation: {
    priorities: ['home', 'activities', 'stories', 'gallery', 'offers', 'people', 'about-visit'],
    labels: {
      activities: 'What is on',
      stories: 'Dispatches',
      offers: 'Take something with you',
      gallery: 'Room studies',
      people: 'People',
      'about-visit': 'Find the room',
    },
  },
  bindings: {
    hive: { state: 'disconnected', account: null, communityId: null },
    media: { state: 'local', provider: null },
  },
  intent: {
    purpose: 'Prove that one semantic host can become several distinct, credible territories without duplicating its truth.',
    presenceMaterial: 'Warm dark room, paper, signal lights, roofline air, long tables, imperfect ink.',
    direction: 'poster',
    participation: 'Attend, read, keep a date, meet the people, support the room, and later carry participation through Hive without needing blockchain vocabulary.',
  },
});

function getMaximalTerritoryHost() {
  return structuredClone(maximalTerritoryHost);
}

module.exports = { getMaximalTerritoryHost };
