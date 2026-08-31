'use strict';

const {
  HIVE_ACCOUNT_PATTERN,
  createVenueContext,
} = require('../../venue/context');
const { FOURTH_STREET_REFERENCE_VENUE } = require('../../venue/reference/fourth-street');

const LEGACY_FOURTH_STREET_PRODUCTION_REQUIRED_SETTINGS = Object.freeze([
  'SITE_NAME',
  'BAR_ADDRESS',
  'BAR_PHONE',
  'BAR_HOURS',
  'BAR_WEBSITE_URL',
  'BAR_MAP_URL',
  'HIVE_COMMUNITY_ID',
  'THREADS_CONTAINER_ACCOUNT',
]);

function legacyValue(source, name, fallback) {
  return source[name] === undefined ? fallback : source[name];
}

function legacyPaymentMerchantAccounts(source) {
  const raw = legacyValue(
    source,
    'HIVE_PAYMENT_MERCHANT_ACCOUNTS',
    FOURTH_STREET_REFERENCE_VENUE.hive.paymentMerchantAccounts.join(','),
  );
  if (typeof raw !== 'string') {
    throw new Error(
      'Invalid Hive-Bar compatibility configuration: HIVE_PAYMENT_MERCHANT_ACCOUNTS must be a string',
    );
  }

  const accounts = raw
    .split(',')
    .map((account) => account.trim().toLowerCase())
    .filter(Boolean);

  for (const account of accounts) {
    if (!HIVE_ACCOUNT_PATTERN.test(account)) {
      throw new Error(
        `Invalid Hive-Bar compatibility configuration: HIVE_PAYMENT_MERCHANT_ACCOUNTS: Invalid Hive account in allowlist: ${account}`,
      );
    }
  }

  return [...new Set(accounts)];
}

function loadFourthStreetCompatibleVenue(source = {}) {
  const reference = FOURTH_STREET_REFERENCE_VENUE;
  try {
    return createVenueContext({
      id: legacyValue(source, 'VENUE_ID', reference.id),
      displayName: legacyValue(source, 'SITE_NAME', reference.displayName),
      business: {
        address: legacyValue(source, 'BAR_ADDRESS', reference.business.address),
        phone: legacyValue(source, 'BAR_PHONE', reference.business.phone),
        hours: legacyValue(source, 'BAR_HOURS', reference.business.hours),
        websiteUrl: legacyValue(source, 'BAR_WEBSITE_URL', reference.business.websiteUrl),
        mapUrl: legacyValue(source, 'BAR_MAP_URL', reference.business.mapUrl),
      },
      hive: {
        communityId: legacyValue(source, 'HIVE_COMMUNITY_ID', reference.hive.communityId),
        officialAccount: legacyValue(
          source,
          'HIVE_OFFICIAL_BAR_ACCOUNT',
          reference.hive.officialAccount,
        ),
        threadsContainerAccount: legacyValue(
          source,
          'THREADS_CONTAINER_ACCOUNT',
          reference.hive.threadsContainerAccount,
        ),
        paymentMerchantAccounts: legacyPaymentMerchantAccounts(source),
      },
    });
  } catch (error) {
    if (error.message.startsWith('Invalid Hive-Bar compatibility configuration:')) throw error;
    throw new Error(`Invalid Hive-Bar compatibility venue: ${error.message}`);
  }
}

module.exports = {
  LEGACY_FOURTH_STREET_PRODUCTION_REQUIRED_SETTINGS,
  loadFourthStreetCompatibleVenue,
};
