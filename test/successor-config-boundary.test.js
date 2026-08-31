'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  PLATFORM_PRODUCTION_REQUIRED_SETTINGS,
  PRODUCTION_REQUIRED_SETTINGS,
  loadConfig,
  productionRequiredSettings,
} = require('../src/config');
const {
  LEGACY_FOURTH_STREET_PRODUCTION_REQUIRED_SETTINGS,
  loadFourthStreetCompatibleVenue,
} = require('../src/deployment/reference/fourth-street-env');
const { FOURTH_STREET_REFERENCE_VENUE } = require('../src/venue/reference/fourth-street');
const { HV3_SYNTHETIC_VENUE } = require('./support/hv3-synthetic-venue');

const PLATFORM_PRODUCTION_SOURCE = Object.freeze({
  NODE_ENV: 'production',
  HIVE_RPC_NODES:
    'https://api.hive.blog,https://api.deathwing.me,https://api.openhive.network',
  HIVE_WRITE_MODE: 'disabled',
  HIVE_WALL_DEFAULT_FEE: '1.000 HBD',
  DISTRIATOR_ENABLED: 'false',
  DISTRIATOR_CLAIM_URL: 'https://distriator.com/#/claim',
  HIVE_APP_TAG: 'fourth-street-bar-app/0.1.0',
  BIND_HOST: '127.0.0.1',
  APP_ORIGIN: 'https://lantern-room.example',
  SESSION_SECRET: 'successor-config-boundary-test-secret-32-bytes',
});

test('legacy Fourth Street flat environment defaults compile the exact reference venue', () => {
  assert.deepEqual(loadFourthStreetCompatibleVenue({}), FOURTH_STREET_REFERENCE_VENUE);
});

test('legacy flat venue names remain a compatibility adapter for inherited deployments', () => {
  const source = {
    NODE_ENV: 'test',
    HIVE_WRITE_MODE: 'disabled',
    VENUE_ID: HV3_SYNTHETIC_VENUE.id,
    SITE_NAME: HV3_SYNTHETIC_VENUE.displayName,
    BAR_ADDRESS: HV3_SYNTHETIC_VENUE.business.address,
    BAR_PHONE: HV3_SYNTHETIC_VENUE.business.phone,
    BAR_HOURS: HV3_SYNTHETIC_VENUE.business.hours,
    BAR_WEBSITE_URL: HV3_SYNTHETIC_VENUE.business.websiteUrl,
    BAR_MAP_URL: HV3_SYNTHETIC_VENUE.business.mapUrl,
    HIVE_COMMUNITY_ID: HV3_SYNTHETIC_VENUE.hive.communityId,
    HIVE_OFFICIAL_BAR_ACCOUNT: HV3_SYNTHETIC_VENUE.hive.officialAccount,
    THREADS_CONTAINER_ACCOUNT: HV3_SYNTHETIC_VENUE.hive.threadsContainerAccount,
    HIVE_PAYMENT_MERCHANT_ACCOUNTS:
      HV3_SYNTHETIC_VENUE.hive.paymentMerchantAccounts.join(','),
  };

  const config = loadConfig(source, { loadDotenv: false });
  assert.deepEqual(config.venue, HV3_SYNTHETIC_VENUE);
  assert.equal(config.site.name, HV3_SYNTHETIC_VENUE.displayName);
  assert.equal(config.hive.communityId, HV3_SYNTHETIC_VENUE.hive.communityId);
  assert.equal(config.hive.officialAccount, HV3_SYNTHETIC_VENUE.hive.officialAccount);
  assert.equal(config.hive.officialBarAccount, HV3_SYNTHETIC_VENUE.hive.officialAccount);
  assert.deepEqual(
    config.payments.merchantAccounts,
    HV3_SYNTHETIC_VENUE.hive.paymentMerchantAccounts,
  );
});

test('programmatic venue composition does not inherit Fourth Street flat-env requirements', () => {
  const required = productionRequiredSettings(
    PLATFORM_PRODUCTION_SOURCE,
    HV3_SYNTHETIC_VENUE,
  );

  assert.deepEqual(required, PLATFORM_PRODUCTION_REQUIRED_SETTINGS);
  for (const name of LEGACY_FOURTH_STREET_PRODUCTION_REQUIRED_SETTINGS) {
    assert.equal(required.includes(name), false, name);
  }

  const config = loadConfig(PLATFORM_PRODUCTION_SOURCE, {
    loadDotenv: false,
    venue: HV3_SYNTHETIC_VENUE,
  });

  assert.deepEqual(config.venue, HV3_SYNTHETIC_VENUE);
  assert.equal(config.site.name, 'The Lantern Room (Fixture)');
  assert.equal(config.hive.communityId, 'hive-654321');
  assert.equal(config.hive.officialAccount, 'lanternroom');
  assert.equal(config.hive.threadsContainerAccount, 'lantern.threads');
  assert.deepEqual(config.payments.merchantAccounts, ['lanternroom']);
  assert.equal(config.hive.writeMode, 'disabled');
  assert.equal(config.payments.enabled, false);
});

test('legacy production compatibility preserves the exact inherited required-setting surface', () => {
  assert.deepEqual(PRODUCTION_REQUIRED_SETTINGS, [
    'SITE_NAME',
    'BAR_ADDRESS',
    'BAR_PHONE',
    'BAR_HOURS',
    'BAR_WEBSITE_URL',
    'BAR_MAP_URL',
    'HIVE_COMMUNITY_ID',
    'THREADS_CONTAINER_ACCOUNT',
    'HIVE_RPC_NODES',
    'HIVE_WRITE_MODE',
    'HIVE_WALL_DEFAULT_FEE',
    'DISTRIATOR_ENABLED',
    'DISTRIATOR_CLAIM_URL',
    'HIVE_APP_TAG',
    'BIND_HOST',
    'APP_ORIGIN',
    'SESSION_SECRET',
  ]);

  assert.throws(
    () =>
      loadConfig(PLATFORM_PRODUCTION_SOURCE, {
        loadDotenv: false,
      }),
    /production requires explicit SITE_NAME, BAR_ADDRESS, BAR_PHONE, BAR_HOURS, BAR_WEBSITE_URL, BAR_MAP_URL, HIVE_COMMUNITY_ID, THREADS_CONTAINER_ACCOUNT/,
  );
});
