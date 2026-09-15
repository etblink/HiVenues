'use strict';

const crypto = require('node:crypto');
const { z } = require('zod');
const { validateHostGraph } = require('./model');

const RESERVED_SLUGS = new Set(['new', 'studio']);
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const inputSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
  archetype: z.string().trim().min(1).max(120),
  timezone: z.string().trim().min(1).max(100),
  presenceMode: z.enum(['physical', 'online', 'hybrid']),
  presenceLabel: z.string().trim().min(1).max(240),
  address: z.string().trim().max(300),
  tagline: z.string().trim().min(1).max(180),
  summary: z.string().trim().min(1).max(1200),
  contact: z.string().trim().min(1).max(240),
  purpose: z.string().trim().min(1).max(800),
  presenceMaterial: z.string().trim().min(1).max(800),
  direction: z.enum(['poster', 'editorial', 'hospitality']),
  participation: z.string().trim().min(1).max(800),
  activityTitle: z.string().trim().min(1).max(120),
  activityDescription: z.string().trim().min(1).max(1200),
  activityStartsLocal: z.string().trim().regex(LOCAL_DATETIME),
  activityEndsLocal: z.string().trim().regex(LOCAL_DATETIME),
}).strict().superRefine((input, ctx) => {
  if (input.presenceMode !== 'online' && !input.address) {
    ctx.addIssue({ code: 'custom', path: ['address'], message: 'A physical or hybrid place needs an address.' });
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: input.timezone }).format(new Date());
  } catch (_) {
    ctx.addIssue({ code: 'custom', path: ['timezone'], message: 'Use a valid IANA timezone such as America/Los_Angeles.' });
  }
});

const directionDefaults = Object.freeze({
  poster: Object.freeze({ accent: '#ef9f55', palette: ['#160d0b', '#6d2918', '#ef9f55', '#f7e0bd'], arrangement: ['hero', 'activity', 'story', 'details', 'offer'], tone: 'warm, direct, memorable, event-led' }),
  editorial: Object.freeze({ accent: '#6e59c8', palette: ['#f5f1ff', '#bdaeff', '#6e59c8', '#242039'], arrangement: ['story', 'hero', 'activity', 'offer', 'details'], tone: 'clear, editorial, curious, composed' }),
  hospitality: Object.freeze({ accent: '#a65337', palette: ['#f2e9da', '#a65337', '#244653', '#647a55'], arrangement: ['hero', 'offer', 'story', 'activity', 'details'], tone: 'welcoming, grounded, service-aware, precise' }),
});

function slugify(value) {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return slug;
}

function localParts(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
}

function zonedParts(timestamp, timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function sameParts(a, b) {
  return a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour && a.minute === b.minute;
}

function localDateTimeToOffsetIso(localValue, timezone) {
  const target = localParts(localValue);
  if (!target) throw new Error('INVALID_LOCAL_DATETIME');
  const targetAsUtc = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute, 0, 0);
  let instant = targetAsUtc;
  for (let index = 0; index < 4; index += 1) {
    const represented = zonedParts(instant, timezone);
    const representedAsUtc = Date.UTC(represented.year, represented.month - 1, represented.day, represented.hour, represented.minute, 0, 0);
    instant += targetAsUtc - representedAsUtc;
  }
  if (!sameParts(zonedParts(instant, timezone), target)) throw new Error('NONEXISTENT_LOCAL_DATETIME');
  const offsetMinutes = Math.round((targetAsUtc - instant) / 60000);
  const sign = offsetMinutes < 0 ? '-' : '+';
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const minutes = String(absolute % 60).padStart(2, '0');
  return `${localValue}:00${sign}${hours}:${minutes}`;
}

function activityPresence(input) {
  if (input.presenceMode === 'online') return { mode: 'online', platformLabel: input.presenceLabel };
  if (input.presenceMode === 'hybrid') {
    return { mode: 'hybrid', venueName: input.displayName, address: input.address, platformLabel: input.presenceLabel };
  }
  return { mode: 'physical', venueName: input.displayName, address: input.address };
}

function buildCandidateCHostFromInput(rawInput, { randomUUID = crypto.randomUUID } = {}) {
  const parsed = inputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      ok: false,
      reason: 'INVALID_HOST_INPUT',
      fields: parsed.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    };
  }
  const input = parsed.data;
  const slug = slugify(input.displayName);
  if (!slug || RESERVED_SLUGS.has(slug)) return { ok: false, reason: 'INVALID_HOST_SLUG', fields: [{ path: 'displayName', message: 'Choose a name that produces a usable, non-reserved URL.' }] };

  let startsAt;
  let endsAt;
  try {
    startsAt = localDateTimeToOffsetIso(input.activityStartsLocal, input.timezone);
    endsAt = localDateTimeToOffsetIso(input.activityEndsLocal, input.timezone);
  } catch (error) {
    return { ok: false, reason: error.message, fields: [{ path: 'activityStartsLocal', message: 'Choose real local times in the selected timezone.' }] };
  }
  if (Date.parse(endsAt) <= Date.parse(startsAt)) {
    return { ok: false, reason: 'INVALID_ACTIVITY_WINDOW', fields: [{ path: 'activityEndsLocal', message: 'The activity must end after it starts.' }] };
  }

  const defaults = directionDefaults[input.direction];
  const mediaId = `media-${slug}-bootstrap-001`;
  const activityId = `activity-${slug}-001`;
  const activitySlug = slugify(input.activityTitle) || 'first-activity';
  const graph = {
    schemaVersion: 1,
    identity: {
      hostId: `host-${slug}-${randomUUID()}`,
      slug,
      displayName: input.displayName,
      archetype: input.archetype,
      timezone: input.timezone,
    },
    facts: {
      tagline: input.tagline,
      summary: input.summary,
      presence: {
        mode: input.presenceMode,
        label: input.presenceLabel,
        ...(input.address ? { address: input.address } : {}),
      },
      contact: input.contact,
    },
    activities: [{
      id: activityId,
      slug: activitySlug,
      title: input.activityTitle,
      description: input.activityDescription,
      startsAt,
      endsAt,
      presence: activityPresence(input),
      lifecycle: 'scheduled',
      mediaId,
      publicActions: [{ mechanic: 'rsvp_local' }, { mechanic: 'calendar_ics' }, { mechanic: 'applaud_hive' }],
    }],
    offers: [],
    media: [{
      id: mediaId,
      kind: 'bootstrap-art',
      alt: `Abstract HiVenues house artwork for ${input.displayName}.`,
      provenance: 'Deterministic HiVenues bootstrap artwork derived from the operator-selected composition direction; not documentary photography.',
      focal: { x: 50, y: 50 },
      palette: [...defaults.palette],
    }],
    voice: {
      terms: {
        rsvp_local: 'Save my place',
        calendar_ics: 'Add to my calendar',
        applaud_hive: 'Send applause',
        voting_capacity: 'Voting capacity',
        follow_account: 'Stay connected',
      },
      tone: defaults.tone,
    },
    presentation: {
      compositionFamily: input.direction,
      arrangement: [...defaults.arrangement],
      accent: defaults.accent,
    },
    bindings: {
      hive: { state: 'disconnected', account: null, communityId: null },
      media: { state: 'local', provider: null },
    },
    intent: {
      purpose: input.purpose,
      presenceMaterial: input.presenceMaterial,
      direction: input.direction,
      participation: input.participation,
    },
  };

  try {
    return { ok: true, graph: validateHostGraph(graph) };
  } catch (error) {
    return { ok: false, reason: 'INVALID_HOST_GRAPH', fields: [{ path: '', message: error.message }] };
  }
}

module.exports = { buildCandidateCHostFromInput, localDateTimeToOffsetIso, slugify };
