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
