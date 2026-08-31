'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const request = require('supertest');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config');
const { createVenuePackage } = require('../src/venue/package');
const { selectVenuePackage } = require('../src/venue/package-selection');
const { FOURTH_STREET_REFERENCE_PACKAGE } = require('../src/venue/reference/fourth-street-package');
const { FOURTH_STREET_REFERENCE_VENUE } = require('../src/venue/reference/fourth-street');
const { logger } = require('./support/test-app');
const {
  HV3_SYNTHETIC_PACKAGE,
  HV3_SYNTHETIC_VENUE,
} = require('./support/hv3-synthetic-venue');

const ROOT = path.join(__dirname, '..');

function configFrom() {
  return loadConfig(
    { NODE_ENV: 'test', HIVE_WRITE_MODE: 'disabled' },
    { loadDotenv: false },
  );
}

function mutableClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function collectKeys(value, keys = new Set()) {
  if (!value || typeof value !== 'object') return keys;
  for (const [key, child] of Object.entries(value)) {
    keys.add(key);
    collectKeys(child, keys);
  }
  return keys;
}

function fixtureReadService(calls) {
  return {
    async getOfficialCommunityPosts(options) {
      calls.push(options);
      return [];
    },
  };
}

test('HV-3 constructs an exact deeply immutable Fourth Street reference package', () => {
  const selected = selectVenuePackage(FOURTH_STREET_REFERENCE_VENUE);
  assert.deepEqual(selected, FOURTH_STREET_REFERENCE_PACKAGE);
  assert.equal(selected.venueId, FOURTH_STREET_REFERENCE_VENUE.id);
  assert.equal(Object.isFrozen(selected), true);
  assert.equal(Object.isFrozen(selected.brand), true);
  assert.equal(Object.isFrozen(selected.brand.logo), true);
  assert.equal(Object.isFrozen(selected.home), true);
  assert.equal(Object.isFrozen(selected.home.hero.image), true);
  assert.equal(Object.isFrozen(selected.home.gallery.items), true);
  assert.ok(selected.home.gallery.items.every((item) => Object.isFrozen(item)));
  assert.deepEqual(
    [selected.home.hero.image, ...selected.home.gallery.items].map(({ src }) => src),
    [
      '/images/fourth-street-bar-patio.jpg',
      '/images/fourth-street-bar-pool-table.jpg',
      '/images/fourth-street-bar-bartender.jpg',
      '/images/fourth-street-bar-exterior.jpg',
    ],
  );
});

test('HV-3 rejects malformed, privileged, remote-media, and cross-venue packages closed', () => {
  const remoteMedia = mutableClone(FOURTH_STREET_REFERENCE_PACKAGE);
  remoteMedia.brand.logo.src = 'https://cdn.example/fourth-street-logo.jpg';
  assert.throws(() => createVenuePackage(remoteMedia, FOURTH_STREET_REFERENCE_VENUE), /same-origin path/);

  const traversal = mutableClone(FOURTH_STREET_REFERENCE_PACKAGE);
  traversal.home.hero.image.src = '/images/../secret.jpg';
  assert.throws(() => createVenuePackage(traversal, FOURTH_STREET_REFERENCE_VENUE), /traverse directories/);

  const privileged = mutableClone(FOURTH_STREET_REFERENCE_PACKAGE);
  privileged.hive = { communityId: 'hive-000000' };
  assert.throws(() => createVenuePackage(privileged, FOURTH_STREET_REFERENCE_VENUE), /Invalid venue package/);

  const missingCopy = mutableClone(FOURTH_STREET_REFERENCE_PACKAGE);
  missingCopy.home.hero.lede = '';
  assert.throws(() => createVenuePackage(missingCopy, FOURTH_STREET_REFERENCE_VENUE), /Invalid venue package/);

  assert.throws(
    () => selectVenuePackage(HV3_SYNTHETIC_VENUE),
    /bound to fourth-street-bar-reno, not lantern-room-fixture/,
  );
  assert.throws(
    () => createVenuePackage(HV3_SYNTHETIC_PACKAGE, FOURTH_STREET_REFERENCE_VENUE),
    /bound to lantern-room-fixture, not fourth-street-bar-reno/,
  );
});

test('HV-3 keeps deployment, protocol, Hive routing, auth, and payment ownership out of the package', () => {
  const keys = collectKeys(FOURTH_STREET_REFERENCE_PACKAGE);
  for (const forbiddenKey of [
    'address',
    'phone',
    'hours',
    'websiteUrl',
    'mapUrl',
    'communityId',
    'officialAccount',
    'threadsContainerAccount',
    'paymentMerchantAccounts',
    'rpcNodes',
    'writeMode',
    'signerMode',
    'appTag',
    'auth',
    'payments',
    'deployment',
    'provider',
    'serviceName',
  ]) {
    assert.equal(keys.has(forbiddenKey), false, forbiddenKey);
  }

  const base = configFrom();
  const app = createApp({
    config: base,
    venue: HV3_SYNTHETIC_VENUE,
    venuePackage: HV3_SYNTHETIC_PACKAGE,
    logger,
    deploymentIdentity: { build: 'hv3-test', commit: 'test', tree: 'test' },
  });
  const rebound = app.locals.config;
  assert.equal(rebound.hive.writeMode, base.hive.writeMode);
  assert.equal(rebound.hive.signerMode, base.hive.signerMode);
  assert.equal(rebound.hive.writesEnabled, base.hive.writesEnabled);
  assert.equal(rebound.hive.appTag, base.hive.appTag);
  assert.deepEqual(rebound.hive.rpcNodes, base.hive.rpcNodes);
  assert.equal(rebound.payments.enabled, base.payments.enabled);
  assert.equal(rebound.distriator.enabled, base.distriator.enabled);
  assert.deepEqual(rebound.auth, base.auth);
  assert.deepEqual(rebound.server, base.server);
  app.locals.services.receiptStore?.close?.();
});

test('HV-3 synthetic fixture renders through the shared platform path without network or Fourth Street expression', async () => {
  const calls = [];
  const base = configFrom();
  const app = createApp({
    config: base,
    venue: HV3_SYNTHETIC_VENUE,
    venuePackage: HV3_SYNTHETIC_PACKAGE,
    logger,
    hiveReadService: fixtureReadService(calls),
    deploymentIdentity: { build: 'hv3-synthetic', commit: 'test', tree: 'test' },
  });

  const home = await request(app).get('/').expect(200);
  assert.match(home.text, /The Lantern Room \(Fixture\)/);
  assert.match(home.text, /fictional quiet reading room/i);
  assert.match(home.text, /\/fixtures\/lantern-room\/reading-room\.jpg/);
  assert.match(home.text, /Distinct synthetic media metadata/);
  assert.match(home.text, /1 Example Way, Testville, NV 89000/);
  assert.match(home.text, /Anyone can browse the public community/);
  assert.match(home.text, /Your private keys stay in Keychain/);
  assert.doesNotMatch(home.text, /4th Street Bar|fourth-street-bar-|1114 East 4th Street/i);
  assert.deepEqual(calls, [{ account: 'lanternroom', community: 'hive-654321', limit: 3 }]);

  const onboarding = await request(app).get('/create-account').expect(200);
  assert.match(onboarding.text, /Create your Hive account at The Lantern Room \(Fixture\)/);
  assert.match(onboarding.text, /one-time QR to the host/);
  assert.match(onboarding.text, /The reading room remains the owner of the delegated Hive Power/);
  assert.match(onboarding.text, /Never enter a Hive private key into The Lantern Room \(Fixture\)/);
  assert.match(onboarding.text, /Hive Keychain keeps your Hive credentials on your device/);
  assert.doesNotMatch(onboarding.text, /4th Street Bar|bartender/);

  const onboardingSource = fs.readFileSync(
    path.join(ROOT, 'views/pages/onboarding/index.ejs'),
    'utf8',
  );
  assert.match(onboardingSource, /Hive-Bar receives only the four public keys/);

  app.locals.services.receiptStore?.close?.();
});

test('HV-3 generic consumers contain no unclassified Fourth Street venue literals or reference fork', () => {
  const genericConsumers = [
    'src/app.js',
    'src/routes/index.js',
    'views/common/head.ejs',
    'views/common/header.ejs',
    'views/common/footer.ejs',
    'views/pages/home/index.ejs',
    'views/pages/home/partials/hero.ejs',
    'views/pages/home/partials/latest-updates.ejs',
    'views/pages/home/partials/photos.ejs',
    'views/pages/home/partials/visit.ejs',
    'views/pages/home/partials/community.ejs',
    'views/pages/onboarding/index.ejs',
  ];
  const forbidden = [
    /4th Street Bar/i,
    /fourthstreetbar/i,
    /fourthst\.threads/i,
    /hive-108590/i,
    /1114 (?:E\.|East) 4th Street/i,
    /4thstreetbarreno\.com/i,
    /\/images\/fourth-street-bar-/i,
  ];
  for (const relative of genericConsumers) {
    const source = fs.readFileSync(path.join(ROOT, relative), 'utf8');
    for (const pattern of forbidden) assert.doesNotMatch(source, pattern, `${relative}: ${pattern}`);
  }

  const appSource = fs.readFileSync(path.join(ROOT, 'src/app.js'), 'utf8');
  const selectionSource = fs.readFileSync(path.join(ROOT, 'src/venue/package-selection.js'), 'utf8');
  assert.doesNotMatch(appSource, /reference\/fourth-street|FOURTH_STREET/);
  assert.match(appSource, /selectVenuePackage\(venue, options\.venuePackage\)/);
  assert.match(selectionSource, /FOURTH_STREET_REFERENCE_PACKAGE/);
  assert.doesNotMatch(selectionSource, /venue\.id\s*===|switch\s*\(\s*venue/);
});
