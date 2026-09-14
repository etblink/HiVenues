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

const harbor = validateHostGraph({
  schemaVersion: 1,
  identity: {
    hostId: 'host-harbor-hearth-001',
    slug: 'harbor-and-hearth',
    displayName: 'Harbor & Hearth',
    archetype: 'waterfront neighborhood kitchen',
    timezone: 'America/Los_Angeles',
  },
  facts: {
    tagline: 'Dinner follows the tide.',
    summary: 'A small waterfront kitchen for wood fire, cold water, bright vegetables, and long tables after sunset.',
    presence: {
      mode: 'physical',
      label: 'Ballard waterfront · dinner Thursday–Sunday from 5 PM',
      address: '1708 Dock Street, Seattle, WA',
    },
    contact: 'table@harborandhearth.example',
  },
  activities: [
    {
      id: 'activity-harbor-supper-001',
      slug: 'sunday-harvest-table',
      title: 'Sunday Table — Harvest Supper',
      description: 'One shared table, a five-course late-summer menu, and a final plate served as the harbor turns blue.',
      startsAt: '2026-09-20T18:00:00-07:00',
      endsAt: '2026-09-20T21:00:00-07:00',
      presence: {
        mode: 'physical',
        venueName: 'Harbor & Hearth',
        address: '1708 Dock Street, Seattle, WA',
      },
      lifecycle: 'scheduled',
      mediaId: 'media-harbor-table-001',
      publicActions: [
        { mechanic: 'rsvp_local' },
        { mechanic: 'calendar_ics' },
        { mechanic: 'applaud_hive' },
      ],
    },
  ],
  offers: [
    {
      id: 'offer-harbor-carrots-001',
      category: 'From the field',
      title: 'Coal-roasted carrots',
      summary: 'Cultured cream, hazelnut, preserved lemon, and soft herbs.',
      price: '$16',
    },
    {
      id: 'offer-harbor-rockfish-001',
      category: 'From the water',
      title: 'Line-caught rockfish',
      summary: 'Charred tomato broth, fennel, mussels, and grilled bread.',
      price: '$32',
    },
    {
      id: 'offer-harbor-cake-001',
      category: 'Something sweet',
      title: 'Olive-oil cake',
      summary: 'Blackberry, bay leaf cream, and sea salt.',
      price: '$12',
    },
  ],
  media: [
    {
      id: 'media-harbor-table-001',
      kind: 'image',
      alt: 'Illustrated warm dining table with ceramic plates, candlelight, herbs, and a deep blue harbor window.',
      provenance: 'HiVenues synthetic house artwork admitted locally for Candidate C; not documentary photography.',
      focal: { x: 53, y: 62 },
      palette: ['#f2e9da', '#a65337', '#244653', '#647a55'],
      asset: {
        version: 1,
        storage: 'repo-local',
        path: '/candidate-c/media/harbor-hearth-table.svg',
        mime: 'image/svg+xml',
        bytes: 4110,
        width: 1600,
        height: 1200,
        sha256: '85828539d64d5d815be0f59ec1f7d19c1d9f9b05bb3b1db4d1e7ca1977c9f5b4',
      },
    },
  ],
  voice: {
    terms: {
      rsvp_local: 'Save a seat',
      calendar_ics: 'Add dinner to my calendar',
      applaud_hive: 'Send compliments',
      voting_capacity: 'Your cellar key',
      follow_account: 'Stay for the next table',
    },
    tone: 'quietly generous, ingredient-led, warm, precise',
  },
  presentation: {
    compositionFamily: 'hospitality',
    arrangement: ['hero', 'offer', 'story', 'activity', 'details'],
    accent: '#a65337',
  },
  bindings: {
    hive: { state: 'disconnected', account: null, communityId: null },
    media: { state: 'local', provider: null },
  },
  intent: {
    purpose: 'Turn a neighborhood dinner service into an inviting front door with menu, table and supper information close at hand.',
    presenceMaterial: 'Linen, ceramic, ember, salt air, shared tables, deep harbor blue.',
    direction: 'hospitality',
    participation: 'Read the menu, plan a visit, save a supper seat, and keep in touch without platform vocabulary.',
  },
});

function seedCandidateCHosts() {
  return [northline, nova, harbor].map((host) => structuredClone(host));
}

module.exports = { seedCandidateCHosts };
