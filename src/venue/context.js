'use strict';

const { z } = require('zod');

const VENUE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;
const HIVE_ACCOUNT_PATTERN = /^(?=.{3,64}$)[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/;
const COMMUNITY_PATTERN = /^hive-[0-9]{3,12}$/;

function httpsUrl(value, context) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    context.addIssue({ code: 'custom', message: 'Must be a valid URL' });
    return z.NEVER;
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
    context.addIssue({ code: 'custom', message: 'Must be a credential-free HTTPS URL' });
    return z.NEVER;
  }
  return parsed.toString();
}

const venueContextSchema = z
  .object({
    id: z.string().trim().regex(VENUE_ID_PATTERN),
    displayName: z.string().trim().min(1).max(80),
    business: z
      .object({
        address: z.string().trim().min(1).max(200),
        phone: z.string().trim().min(1).max(40),
        hours: z.string().trim().min(1).max(120),
        websiteUrl: z.string().trim().transform(httpsUrl),
        mapUrl: z.string().trim().transform(httpsUrl),
      })
      .strict(),
    hive: z
      .object({
        communityId: z.string().trim().regex(COMMUNITY_PATTERN),
        officialAccount: z.string().trim().regex(HIVE_ACCOUNT_PATTERN),
        threadsContainerAccount: z.string().trim().regex(HIVE_ACCOUNT_PATTERN),
        paymentMerchantAccounts: z
          .array(z.string().trim().regex(HIVE_ACCOUNT_PATTERN))
          .transform((accounts) => [...new Set(accounts)]),
      })
      .strict(),
  })
  .strict();

function createVenueContext(input) {
  const result = venueContextSchema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'venue'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid venue context: ${details}`);
  }
  return deepFreeze(result.data);
}

function withVenueContext(config, venueInput) {
  if (!config || typeof config !== 'object') {
    throw new TypeError('A validated application configuration is required');
  }
  const venue = createVenueContext(venueInput);
  return deepFreeze({
    ...config,
    venue,
    site: {
      ...(config.site || {}),
      name: venue.displayName,
      business: venue.business,
    },
    hive: {
      ...(config.hive || {}),
      communityId: venue.hive.communityId,
      officialAccount: venue.hive.officialAccount,
      officialBarAccount: venue.hive.officialAccount,
      threadsContainerAccount: venue.hive.threadsContainerAccount,
    },
    payments: {
      ...(config.payments || {}),
      merchantAccounts: [...venue.hive.paymentMerchantAccounts],
    },
  });
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

module.exports = {
  COMMUNITY_PATTERN,
  HIVE_ACCOUNT_PATTERN,
  VENUE_ID_PATTERN,
  createVenueContext,
  venueContextSchema,
  withVenueContext,
};
