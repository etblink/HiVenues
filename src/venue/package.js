'use strict';

const { z } = require('zod');

const VENUE_PACKAGE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ITEM_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COPY = z.string().trim().min(1).max(1200);
const SHORT_COPY = z.string().trim().min(1).max(240);
const ITEM_ID = z.string().trim().min(2).max(80).regex(ITEM_ID_PATTERN);
const HEX_COLOR = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).transform((value) => value.toLowerCase());
const ISO_TIMESTAMP = z.string().trim().max(40).superRefine((value, context) => {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value) || Number.isNaN(Date.parse(value))) {
    context.addIssue({ code: 'custom', message: 'Timestamp must be a valid ISO-8601 value with an explicit offset' });
  }
});

const httpsUrl = z.string().trim().url().superRefine((value, context) => {
  if (new URL(value).protocol !== 'https:') {
    context.addIssue({ code: 'custom', message: 'Venue links must use HTTPS' });
  }
});

const localAssetPath = z
  .string()
  .trim()
  .min(2)
  .max(240)
  .superRefine((value, context) => {
    if (!value.startsWith('/') || value.startsWith('//')) {
      context.addIssue({ code: 'custom', message: 'Venue media must use an absolute same-origin path' });
      return;
    }
    if (value.includes('\\') || value.includes('?') || value.includes('#') || value.includes('\0')) {
      context.addIssue({ code: 'custom', message: 'Venue media paths may not contain escapes, query strings, fragments, or NUL bytes' });
      return;
    }
    const segments = value.split('/').slice(1);
    if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
      context.addIssue({ code: 'custom', message: 'Venue media paths must be normalized and may not traverse directories' });
    }
  });

const sizedAssetSchema = z
  .object({
    src: localAssetPath,
    width: z.number().int().positive().max(8192),
    height: z.number().int().positive().max(8192),
  })
  .strict();

const editorialAssetSchema = z
  .object({
    src: localAssetPath,
    alt: SHORT_COPY,
    width: z.number().int().positive().max(8192),
    height: z.number().int().positive().max(8192),
    caption: SHORT_COPY,
  })
  .strict();

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const value = hex.slice(1);
  return 0.2126 * channel(Number.parseInt(value.slice(0, 2), 16))
    + 0.7152 * channel(Number.parseInt(value.slice(2, 4), 16))
    + 0.0722 * channel(Number.parseInt(value.slice(4, 6), 16));
}

function contrastRatio(left, right) {
  const a = luminance(left);
  const b = luminance(right);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const venueThemeSchema = z
  .object({
    canvas: HEX_COLOR,
    surface: HEX_COLOR,
    border: HEX_COLOR,
    text: HEX_COLOR,
    mutedText: HEX_COLOR,
    accent: HEX_COLOR,
    accentHover: HEX_COLOR,
  })
  .strict()
  .superRefine((theme, context) => {
    for (const [foreground, background, minimum, label] of [
      [theme.text, theme.canvas, 4.5, 'text on canvas'],
      [theme.text, theme.surface, 4.5, 'text on surface'],
      [theme.mutedText, theme.canvas, 4.5, 'muted text on canvas'],
      [theme.mutedText, theme.surface, 4.5, 'muted text on surface'],
      [theme.accent, theme.canvas, 4.5, 'accent text on canvas and canvas text on accent'],
      [theme.accent, theme.surface, 4.5, 'accent text on surface'],
      [theme.accentHover, theme.canvas, 4.5, 'canvas text on accent hover'],
      [theme.border, theme.canvas, 1.5, 'border against canvas'],
      [theme.border, theme.surface, 1.5, 'border against surface'],
    ]) {
      if (contrastRatio(foreground, background) < minimum) {
        context.addIssue({ code: 'custom', message: `Theme contrast is insufficient for ${label}` });
      }
    }
  });

const programItemSchema = z
  .object({
    id: ITEM_ID,
    title: SHORT_COPY,
    startAt: ISO_TIMESTAMP,
    endAt: ISO_TIMESTAMP,
    description: COPY,
    accessNote: SHORT_COPY,
    state: z.enum(['scheduled', 'full', 'cancelled']),
    link: httpsUrl.nullable().default(null),
  })
  .strict()
  .superRefine((item, context) => {
    if (Date.parse(item.endAt) <= Date.parse(item.startAt)) {
      context.addIssue({ code: 'custom', message: 'Program endAt must be after startAt' });
    }
  });

const equipmentItemSchema = z
  .object({
    id: ITEM_ID,
    name: SHORT_COPY,
    state: z.enum(['available', 'limited', 'maintenance', 'offline']),
    note: SHORT_COPY,
    accessNote: SHORT_COPY,
    lastUpdated: ISO_TIMESTAMP,
    group: SHORT_COPY.nullable().default(null),
  })
  .strict();

function uniqueItemIds(items, context) {
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) {
      context.addIssue({ code: 'custom', message: `Collection item id must be unique: ${item.id}` });
    }
    ids.add(item.id);
  }
}

const programsSchema = z
  .object({
    kicker: SHORT_COPY,
    heading: SHORT_COPY,
    intro: COPY,
    emptyLead: SHORT_COPY,
    emptyBody: COPY,
    items: z.array(programItemSchema).max(12).superRefine(uniqueItemIds),
  })
  .strict();

const equipmentStatusSchema = z
  .object({
    kicker: SHORT_COPY,
    heading: SHORT_COPY,
    intro: COPY,
    emptyLead: SHORT_COPY,
    emptyBody: COPY,
    items: z.array(equipmentItemSchema).max(20).superRefine(uniqueItemIds),
  })
  .strict();

const venuePackageSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().trim().regex(VENUE_PACKAGE_ID_PATTERN),
    venueId: z.string().trim().regex(VENUE_PACKAGE_ID_PATTERN),
    brand: z
      .object({
        logo: sizedAssetSchema,
        theme: venueThemeSchema.optional(),
      })
      .strict(),
    seo: z
      .object({
        defaultDescription: SHORT_COPY,
      })
      .strict(),
    home: z
      .object({
        hero: z
          .object({
            lede: COPY,
            footnote: SHORT_COPY,
            image: editorialAssetSchema,
          })
          .strict(),
        updates: z
          .object({
            heading: SHORT_COPY,
            unavailableLead: SHORT_COPY,
            unavailableBody: SHORT_COPY,
            emptyLead: SHORT_COPY,
            emptyBody: SHORT_COPY,
          })
          .strict(),
        programs: programsSchema.optional(),
        equipmentStatus: equipmentStatusSchema.optional(),
        pathways: z
          .object({
            kicker: SHORT_COPY,
            heading: SHORT_COPY,
            intro: COPY,
          })
          .strict(),
        visit: z
          .object({
            kicker: SHORT_COPY,
            heading: SHORT_COPY,
            lede: COPY,
            note: COPY,
          })
          .strict(),
        community: z
          .object({
            kicker: SHORT_COPY,
            heading: SHORT_COPY,
            lede: COPY,
          })
          .strict(),
        gallery: z
          .object({
            kicker: SHORT_COPY,
            heading: SHORT_COPY,
            intro: COPY,
            items: z.array(editorialAssetSchema).min(1).max(6),
          })
          .strict(),
      })
      .strict(),
    onboarding: z
      .object({
        operatorNoun: z.string().trim().min(2).max(40).regex(/^[a-z][a-z -]*$/),
        staffRole: z.string().trim().min(2).max(40).regex(/^[a-z][a-z -]*$/),
      })
      .strict(),
  })
  .strict();

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function venueIdOf(expectedVenue) {
  if (typeof expectedVenue === 'string') return expectedVenue;
  return expectedVenue?.id || null;
}

function createVenuePackage(input, expectedVenue = null) {
  const result = venuePackageSchema.safeParse(input);
  if (!result.success) {
    throw new TypeError(`Invalid venue package: ${result.error.issues.map((issue) => issue.message).join('; ')}`);
  }
  const expectedVenueId = venueIdOf(expectedVenue);
  if (expectedVenueId && result.data.venueId !== expectedVenueId) {
    throw new TypeError(
      `Venue package ${result.data.id} is bound to ${result.data.venueId}, not ${expectedVenueId}`,
    );
  }

  if (result.data.home.programs) {
    result.data.home.programs.items.sort((left, right) => {
      const timeOrder = Date.parse(left.startAt) - Date.parse(right.startAt);
      return timeOrder || left.id.localeCompare(right.id);
    });
  }

  return deepFreeze(result.data);
}

module.exports = {
  ITEM_ID_PATTERN,
  VENUE_PACKAGE_ID_PATTERN,
  contrastRatio,
  createVenuePackage,
  venuePackageSchema,
};
