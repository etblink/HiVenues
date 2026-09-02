'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { loadConfig } = require('../src/config');
const { startServer } = require('../src/server');
const {
  VENUE_ADMISSION_MODE_ENV,
  VENUE_ADMISSION_MODES,
  VENUE_BOOTSTRAP_PATH_ENV,
  VenueRuntimeAdmissionError,
  loadVenueRuntimeAdmission,
  resolveVenueAdmissionMode,
} = require('../src/venue/runtime-admission');
const { HV4_SYNTHETIC_BOOTSTRAP_INPUT } = require('./support/hv4-synthetic-bootstrap');


const LEGACY_PRODUCTION_SOURCE = Object.freeze({
  NODE_ENV: 'production',
  SITE_NAME: '4th Street Bar',
  BAR_ADDRESS: '1114 E. 4th Street, Reno, NV 89512',
  BAR_PHONE: '(775) 324-7827',
  BAR_HOURS: 'Daily, 12:00 p.m.–2:00 a.m.',
  BAR_WEBSITE_URL: 'https://4thstreetbarreno.com/',
  BAR_MAP_URL:
    'https://www.google.com/maps/search/?api=1&query=1114%20E.%204th%20Street%2C%20Reno%2C%20NV%2089512',
  HIVE_COMMUNITY_ID: 'hive-108590',
  THREADS_CONTAINER_ACCOUNT: 'fourthst.threads',
});

function cloneBootstrap() {
  return JSON.parse(JSON.stringify(HV4_SYNTHETIC_BOOTSTRAP_INPUT));
}

function loadVirtualBootstrap(source) {
  const raw = `${JSON.stringify(cloneBootstrap(), null, 2)}\n`;
  return loadVenueRuntimeAdmission(source, {
    loadDotenv: false,
    readFileSync: () => raw,
    statSync: () => ({
      isFile: () => true,
      size: Buffer.byteLength(raw, 'utf8'),
    }),
  });
}

test('compatibility is the default admission policy and preserves the inherited no-bootstrap fallback', () => {
  assert.equal(resolveVenueAdmissionMode({}), VENUE_ADMISSION_MODES.COMPATIBILITY);
  assert.equal(loadVenueRuntimeAdmission({}, { loadDotenv: false }), null);
});

test('an explicit bootstrap path is mechanically classified as explicit admission when mode is omitted', () => {
  assert.equal(
    resolveVenueAdmissionMode({ [VENUE_BOOTSTRAP_PATH_ENV]: 'synthetic/venue-bootstrap.json' }),
    VENUE_ADMISSION_MODES.EXPLICIT_BOOTSTRAP,
  );
});

test('unrecognized production defaults to explicit-bootstrap instead of inheriting Fourth Street', () => {
  const source = { NODE_ENV: 'production' };
  assert.equal(resolveVenueAdmissionMode(source), VENUE_ADMISSION_MODES.EXPLICIT_BOOTSTRAP);
  assert.throws(
    () => loadVenueRuntimeAdmission(source, { loadDotenv: false }),
    (error) =>
      error instanceof VenueRuntimeAdmissionError &&
      error.message.includes(`${VENUE_BOOTSTRAP_PATH_ENV} is required`),
  );
});

test('complete legacy production configuration preserves compatibility without a new live env requirement', () => {
  assert.equal(
    resolveVenueAdmissionMode(LEGACY_PRODUCTION_SOURCE),
    VENUE_ADMISSION_MODES.COMPATIBILITY,
  );
  assert.equal(
    loadVenueRuntimeAdmission(LEGACY_PRODUCTION_SOURCE, { loadDotenv: false }),
    null,
  );
});

test('complete non-Fourth legacy flat-env production is still routed to explicit admission', () => {
  const genericLegacySource = {
    ...LEGACY_PRODUCTION_SOURCE,
    SITE_NAME: 'The Lantern Room',
    HIVE_COMMUNITY_ID: 'hive-654321',
    THREADS_CONTAINER_ACCOUNT: 'lantern.threads',
  };

  assert.equal(
    resolveVenueAdmissionMode(genericLegacySource),
    VENUE_ADMISSION_MODES.EXPLICIT_BOOTSTRAP,
  );
  assert.throws(
    () => loadVenueRuntimeAdmission(genericLegacySource, { loadDotenv: false }),
    (error) =>
      error instanceof VenueRuntimeAdmissionError &&
      error.message.includes(`${VENUE_BOOTSTRAP_PATH_ENV} is required`),
  );
});

test('production cannot opt into compatibility unless legacy config resolves to Fourth Street', () => {
  assert.throws(
    () =>
      resolveVenueAdmissionMode({
        ...LEGACY_PRODUCTION_SOURCE,
        SITE_NAME: 'The Lantern Room',
        [VENUE_ADMISSION_MODE_ENV]: VENUE_ADMISSION_MODES.COMPATIBILITY,
      }),
    (error) =>
      error instanceof VenueRuntimeAdmissionError &&
      /compatibility in production requires the recognized Fourth Street legacy deployment identity/.test(
        error.message,
      ),
  );
});

test('successor-native explicit-bootstrap mode fails closed when the bootstrap path is absent', () => {
  assert.throws(
    () =>
      loadVenueRuntimeAdmission(
        { [VENUE_ADMISSION_MODE_ENV]: VENUE_ADMISSION_MODES.EXPLICIT_BOOTSTRAP },
        { loadDotenv: false },
      ),
    (error) =>
      error instanceof VenueRuntimeAdmissionError &&
      error.message.includes(
        `${VENUE_BOOTSTRAP_PATH_ENV} is required when ${VENUE_ADMISSION_MODE_ENV}=${VENUE_ADMISSION_MODES.EXPLICIT_BOOTSTRAP}`,
      ),
  );
});

test('unknown admission modes fail closed instead of silently selecting a compatibility path', () => {
  assert.throws(
    () => resolveVenueAdmissionMode({ [VENUE_ADMISSION_MODE_ENV]: 'successor-ish' }),
    (error) =>
      error instanceof VenueRuntimeAdmissionError &&
      /HIVE_VENUE_ADMISSION_MODE must be compatibility or explicit-bootstrap/.test(error.message),
  );
});

test('explicit-bootstrap mode composes an independent non-Fourth-Street venue and deployment', () => {
  const admission = loadVirtualBootstrap({
    [VENUE_ADMISSION_MODE_ENV]: VENUE_ADMISSION_MODES.EXPLICIT_BOOTSTRAP,
    [VENUE_BOOTSTRAP_PATH_ENV]: 'synthetic/venue-bootstrap.json',
  });

  assert.equal(admission.mode, VENUE_ADMISSION_MODES.EXPLICIT_BOOTSTRAP);
  assert.equal(admission.source, 'explicit-bootstrap-file');
  assert.equal(admission.composition.bootstrapId, 'lantern-room-offline-bootstrap');
  assert.deepEqual(admission.composition.identity, {
    venueId: 'lantern-room-fixture',
    packageId: 'lantern-room-fixture-package',
    deploymentId: 'lantern-room-offline-deployment',
  });
});

test('explicit-bootstrap policy cannot be bypassed by a preloaded legacy-compatible config', () => {
  const legacyConfig = loadConfig({}, { loadDotenv: false });
  let listenCalled = false;

  assert.throws(
    () =>
      startServer({
        environment: {
          [VENUE_ADMISSION_MODE_ENV]: VENUE_ADMISSION_MODES.EXPLICIT_BOOTSTRAP,
        },
        loadDotenv: false,
        config: legacyConfig,
        app: {
          listen() {
            listenCalled = true;
            throw new Error('listen should not be reached');
          },
        },
        installSignalHandlers: false,
      }),
    (error) =>
      error instanceof VenueRuntimeAdmissionError &&
      error.message.includes(`${VENUE_BOOTSTRAP_PATH_ENV} is required`),
  );
  assert.equal(listenCalled, false);
});
