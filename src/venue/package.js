'use strict';

const { z } = require('zod');

const VENUE_PACKAGE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COPY = z.string().trim().min(1).max(1200);
const SHORT_COPY = z.string().trim().min(1).max(240);

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

const venuePackageSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().trim().regex(VENUE_PACKAGE_ID_PATTERN),
    venueId: z.string().trim().regex(VENUE_PACKAGE_ID_PATTERN),
    brand: z
      .object({
        logo: sizedAssetSchema,
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
  return deepFreeze(result.data);
}

module.exports = {
  VENUE_PACKAGE_ID_PATTERN,
  createVenuePackage,
  venuePackageSchema,
};
