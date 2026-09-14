'use strict';

const crypto = require('node:crypto');
const { z } = require('zod');

const mechanicRegistry = Object.freeze({
  rsvp_local: Object.freeze({
    id: 'rsvp_local',
    meaning: 'Record an accountless RSVP inside HiVenues.',
    consequenceClass: 'local-write',
    movesValue: false,
    public: false,
    reversible: true,
    capability: 'local-rsvp',
    degradedBehavior: 'Show event facts and calendar action without RSVP.',
  }),
  calendar_ics: Object.freeze({
    id: 'calendar_ics',
    meaning: 'Download a standards-based calendar event.',
    consequenceClass: 'download',
    movesValue: false,
    public: false,
    reversible: true,
    capability: 'ics',
    degradedBehavior: 'Show event date, time and location as ordinary text.',
  }),
  applaud_hive: Object.freeze({
    id: 'applaud_hive',
    meaning: 'Cast a Hive vote on the host-selected social object.',
    consequenceClass: 'signed-public-write',
    movesValue: false,
    public: true,
    reversible: 'protocol-dependent',
    capability: 'hive-vote',
    degradedBehavior: 'Explain that Hive participation is not connected and do not attempt a write.',
  }),
  voting_capacity: Object.freeze({
    id: 'voting_capacity',
    meaning: 'Display voting-power capacity associated with a connected Hive identity.',
    consequenceClass: 'read-only-observation',
    movesValue: false,
    public: false,
    reversible: true,
    capability: 'hive-account-observation',
    degradedBehavior: 'Show the host-native label with an explicit disconnected state.',
  }),
  follow_account: Object.freeze({
    id: 'follow_account',
    meaning: 'Follow a Hive account. This is distinct from subscribing to a Hive community.',
    consequenceClass: 'signed-public-write',
    movesValue: false,
    public: true,
    reversible: true,
    capability: 'hive-follow-account',
    degradedBehavior: 'Offer the public profile link or explain that account following is not connected.',
  }),
});

const mediaSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['bootstrap-art', 'image', 'video']),
  alt: z.string().min(1),
  provenance: z.string().min(1),
  focal: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }),
  palette: z.array(z.string().min(1)).min(2).max(5),
});

const activitySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(1200),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  presence: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('physical'), venueName: z.string().min(1), address: z.string().min(1) }),
    z.object({ mode: z.literal('online'), platformLabel: z.string().min(1) }),
    z.object({ mode: z.literal('hybrid'), venueName: z.string().min(1), address: z.string().min(1), platformLabel: z.string().min(1) }),
  ]),
  lifecycle: z.enum(['scheduled', 'cancelled', 'completed']),
  mediaId: z.string().min(1),
  publicActions: z.array(z.object({ mechanic: z.string().min(1) })),
});

const hostGraphSchema = z.object({
  schemaVersion: z.literal(1),
  identity: z.object({
    hostId: z.string().min(1),
    slug: z.string().min(1),
    displayName: z.string().min(1),
    archetype: z.string().min(1),
    timezone: z.string().min(1),
  }),
  facts: z.object({
    tagline: z.string().min(1).max(180),
    summary: z.string().min(1).max(1200),
    presence: z.object({
      mode: z.enum(['physical', 'online', 'hybrid']),
      label: z.string().min(1),
      address: z.string().optional(),
    }),
    contact: z.string().min(1),
  }),
  activities: z.array(activitySchema),
  offers: z.array(z.object({ id: z.string().min(1), title: z.string().min(1), summary: z.string().min(1) })),
  media: z.array(mediaSchema),
  voice: z.object({
    terms: z.record(z.string(), z.string().min(1)),
    tone: z.string().min(1),
  }),
  presentation: z.object({
    compositionFamily: z.enum(['poster', 'editorial']),
    arrangement: z.array(z.string().min(1)),
    accent: z.string().min(1),
  }),
  bindings: z.object({
    hive: z.object({
      state: z.enum(['disconnected', 'read-only', 'connected']),
      account: z.string().nullable(),
      communityId: z.string().nullable(),
    }),
    media: z.object({ state: z.enum(['local', 'degraded', 'connected']), provider: z.string().nullable() }),
  }),
  intent: z.object({
    purpose: z.string(),
    presenceMaterial: z.string(),
    direction: z.enum(['poster', 'editorial']),
    participation: z.string(),
  }),
});

function validateHostGraph(graph) {
  const parsed = hostGraphSchema.parse(graph);
  for (const activity of parsed.activities) {
    for (const action of activity.publicActions) {
      if (!mechanicRegistry[action.mechanic]) {
        throw new Error(`Unknown Candidate C mechanic: ${action.mechanic}`);
      }
    }
  }
  for (const [mechanicId] of Object.entries(parsed.voice.terms)) {
    if (!mechanicRegistry[mechanicId]) {
      throw new Error(`Voice term references unknown Candidate C mechanic: ${mechanicId}`);
    }
  }
  return parsed;
}

function stableDigest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function clone(value) {
  return structuredClone(value);
}

function formatActivityTime(activity, timezone) {
  const start = new Date(activity.startsAt);
  const end = new Date(activity.endsAt);
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  });
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  });
  return `${dateFormatter.format(start)} · ${timeFormatter.format(start)}–${timeFormatter.format(end)}`;
}

function disclosureFor(mechanicId, graph) {
  const mechanic = mechanicRegistry[mechanicId];
  if (!mechanic) throw new Error(`Unknown mechanic: ${mechanicId}`);
  if (mechanicId === 'applaud_hive') {
    if (graph.bindings.hive.state === 'disconnected') {
      return 'This would cast a public Hive vote if a Hive identity were connected. Nothing will be signed or broadcast in this Candidate C phase.';
    }
    return 'This action represents a public Hive vote. Candidate C Phase 2A keeps the consequence disconnected and will not request a signature or broadcast.';
  }
  if (mechanicId === 'follow_account') {
    return 'This mechanic means following a Hive account. It does not join or subscribe to a Hive community, and Phase 2A will not broadcast it.';
  }
  return mechanic.meaning;
}

module.exports = {
  clone,
  disclosureFor,
  formatActivityTime,
  hostGraphSchema,
  mechanicRegistry,
  stableDigest,
  validateHostGraph,
};
