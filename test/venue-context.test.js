'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config');
const { createVenueContext } = require('../src/venue/context');
const { FOURTH_STREET_REFERENCE_VENUE } = require('../src/venue/reference/fourth-street');

function testConfig(options = {}) {
  return loadConfig(
    { NODE_ENV: 'test', HIVE_WRITE_MODE: 'disabled' },
    { loadDotenv: false, ...options },
  );
}

function syntheticVenue() {
  return createVenueContext({
    id: 'synthetic-venue',
    displayName: 'Synthetic Venue',
    business: {
      address: '1 Test Avenue, Example, NV 89000',
      phone: '(555) 010-2000',
      hours: 'Daily, 10:00 a.m.–10:00 p.m.',
      websiteUrl: 'https://venue.example/',
      mapUrl: 'https://venue.example/map',
    },
    hive: {
      communityId: 'hive-123456',
      officialAccount: 'syntheticvenue',
      threadsContainerAccount: 'synthetic.threads',
      paymentMerchantAccounts: ['syntheticvenue'],
    },
  });
}

test('default configuration compiles the canonical Fourth Street reference venue', () => {
  const config = testConfig();
  assert.deepEqual(config.venue, FOURTH_STREET_REFERENCE_VENUE);
  assert.equal(config.site.name, config.venue.displayName);
  assert.deepEqual(config.site.business, config.venue.business);
  assert.equal(config.hive.communityId, config.venue.hive.communityId);
  assert.equal(config.hive.officialAccount, config.venue.hive.officialAccount);
  assert.equal(config.hive.officialBarAccount, config.venue.hive.officialAccount);
  assert.equal(config.hive.threadsContainerAccount, config.venue.hive.threadsContainerAccount);
  assert.deepEqual(config.payments.merchantAccounts, config.venue.hive.paymentMerchantAccounts);
  assert.equal(Object.isFrozen(config.venue), true);
  assert.equal(Object.isFrozen(config.venue.business), true);
  assert.equal(Object.isFrozen(config.venue.hive), true);
});

test('explicit synthetic venue context rebinds application venue-scoped identity without network access', () => {
  const venue = syntheticVenue();
  const config = testConfig();
  const app = createApp({
    config,
    venue,
    deploymentIdentity: { build: 'test', commit: 'test', tree: 'test' },
  });

  assert.equal(app.locals.venue.id, 'synthetic-venue');
  assert.equal(app.locals.siteName, 'Synthetic Venue');
  assert.equal(app.locals.business.address, '1 Test Avenue, Example, NV 89000');
  assert.equal(app.locals.config.hive.communityId, 'hive-123456');
  assert.equal(app.locals.config.hive.officialAccount, 'syntheticvenue');
  assert.equal(app.locals.config.hive.officialBarAccount, 'syntheticvenue');
  assert.equal(app.locals.config.hive.threadsContainerAccount, 'synthetic.threads');
  assert.deepEqual(app.locals.config.payments.merchantAccounts, ['syntheticvenue']);
  assert.equal(app.locals.config.hive.writeMode, config.hive.writeMode);
  assert.equal(app.locals.config.hive.appTag, config.hive.appTag);

  app.locals.services.receiptStore?.close?.();
});

test('loadConfig accepts an explicit venue without changing deployment safety settings', () => {
  const venue = syntheticVenue();
  const config = testConfig({ venue });
  assert.deepEqual(config.venue, venue);
  assert.equal(config.hive.writeMode, 'disabled');
  assert.equal(config.hive.writesEnabled, false);
  assert.equal(config.payments.enabled, false);
  assert.equal(config.hive.appTag, 'fourth-street-bar-app/0.1.0');
});

test('generic app and primary route wiring contain no canonical Fourth Street identifiers', () => {
  const files = ['src/app.js', 'routes/index.js'];
  const forbidden = /fourthstreetbar|fourthst\.threads|hive-108590|1114 E\. 4th Street|4thstreetbarreno\.com/i;
  for (const file of files) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.doesNotMatch(source, forbidden, file);
  }
});

test('venue context preserves an empty merchant list while Pay is disabled', () => {
  const config = loadConfig(
    {
      NODE_ENV: 'test',
      HIVE_WRITE_MODE: 'disabled',
      HIVE_PAYMENT_ENABLED: 'false',
      HIVE_PAYMENT_MERCHANT_ACCOUNTS: '',
    },
    { loadDotenv: false },
  );
  assert.deepEqual(config.venue.hive.paymentMerchantAccounts, []);
  assert.deepEqual(config.payments.merchantAccounts, []);
  assert.equal(config.payments.enabled, false);
});

test('venue context validation rejects unsafe identity and URL values', () => {
  assert.throws(
    () => createVenueContext({ ...syntheticVenue(), id: 'Synthetic Venue' }),
    /Invalid venue context/,
  );
  assert.throws(
    () =>
      createVenueContext({
        ...syntheticVenue(),
        business: { ...syntheticVenue().business, websiteUrl: 'http://venue.example/' },
      }),
    /credential-free HTTPS URL/,
  );
});
