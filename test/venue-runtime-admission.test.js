'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const test = require('node:test');
const { loadConfig } = require('../src/config');
const { parseOnboardingConfig } = require('../src/onboarding/config');
const { startServer } = require('../src/server');
const {
  VenueRuntimeAdmissionError,
  assertVenueRuntimeCoherence,
  currentRuntimeFacts,
  isAdmittedReleaseRoot,
  loadVenueRuntimeAdmission,
} = require('../src/venue/runtime-admission');
const { HV4_SYNTHETIC_BOOTSTRAP_INPUT } = require('./support/hv4-synthetic-bootstrap');

const logger = {
  child() {
    return this;
  },
  error() {},
  fatal() {},
  info() {},
  warn() {},
};

const deploymentIdentity = Object.freeze({
  build: 'test-runtime-admission',
  commit: '0123456789abcdef0123456789abcdef01234567',
  tree: '89abcdef0123456789abcdef0123456789abcdef',
  exact: true,
});

function cloneBootstrap() {
  return JSON.parse(JSON.stringify(HV4_SYNTHETIC_BOOTSTRAP_INPUT));
}

function runtimeBootstrap(port = 4100) {
  const bootstrap = cloneBootstrap();
  bootstrap.deploymentManifest.runtime.nodeVersion = process.versions.node;
  bootstrap.deploymentManifest.runtime.platform = `${process.platform}-${process.arch}`;
  bootstrap.deploymentManifest.topology.applicationAddress = `127.0.0.1:${port}`;
  bootstrap.deploymentManifest.release.hiveAppTag = 'lantern-room-fixture/0.0.0';
  return bootstrap;
}

function writeBootstrap(t, input) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-venues-admission-'));
  const filename = path.join(directory, 'venue-bootstrap.json');
  fs.writeFileSync(filename, `${JSON.stringify(input, null, 2)}\n`, 'utf8');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return filename;
}

function matchingEnvironment(filename, port = 4100) {
  const deployment = runtimeBootstrap(port).deploymentManifest;
  return {
    NODE_ENV: 'test',
    PORT: String(port),
    BIND_HOST: '127.0.0.1',
    TRUST_PROXY: 'loopback',
    APP_ORIGIN: 'https://lantern-room.example.invalid',
    HIVE_APP_TAG: 'lantern-room-fixture/0.0.0',
    HIVE_PAYMENT_RECEIPT_DB_PATH: deployment.storage.paymentDatabase,
    HIVE_ONBOARDING_DB_PATH: deployment.storage.onboardingDatabase,
    HIVE_VENUE_BOOTSTRAP_PATH: filename,
    LOG_LEVEL: 'silent',
  };
}

async function findAvailablePort() {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close((error) => (error ? reject(error) : resolve())));
  return port;
}

test('ordinary startup has no explicit venue admission when no bootstrap path is configured', () => {
  assert.equal(loadVenueRuntimeAdmission({}, { loadDotenv: false }), null);
});

test('explicit venue admission fails closed for missing, malformed, or unstable production sources', (t) => {
  assert.throws(
    () =>
      loadVenueRuntimeAdmission(
        { HIVE_VENUE_BOOTSTRAP_PATH: path.join(os.tmpdir(), 'missing-hive-venues-bootstrap.json') },
        { loadDotenv: false },
      ),
    (error) => error instanceof VenueRuntimeAdmissionError && /cannot read explicit bootstrap file/.test(error.message),
  );

  assert.throws(
    () =>
      loadVenueRuntimeAdmission(
        { NODE_ENV: 'production', HIVE_VENUE_BOOTSTRAP_PATH: 'relative/venue-bootstrap.json' },
        { loadDotenv: false },
      ),
    (error) => error instanceof VenueRuntimeAdmissionError && /must be absolute in production/.test(error.message),
  );

  const filename = writeBootstrap(t, { schemaVersion: 999 });
  assert.throws(
    () => loadVenueRuntimeAdmission({ HIVE_VENUE_BOOTSTRAP_PATH: filename }, { loadDotenv: false }),
    (error) => error instanceof VenueRuntimeAdmissionError && /explicit bootstrap source is invalid/.test(error.message),
  );
});

test('explicit bootstrap is composed through existing HV-4 venue/package/deployment authority', (t) => {
  const filename = writeBootstrap(t, cloneBootstrap());
  const admission = loadVenueRuntimeAdmission(
    { HIVE_VENUE_BOOTSTRAP_PATH: filename },
    { loadDotenv: false },
  );

  assert.equal(admission.source, 'explicit-bootstrap-file');
  assert.equal(admission.bootstrapPath, path.resolve(filename));
  assert.equal(admission.composition.bootstrapId, 'lantern-room-offline-bootstrap');
  assert.deepEqual(admission.composition.identity, {
    venueId: 'lantern-room-fixture',
    packageId: 'lantern-room-fixture-package',
    deploymentId: 'lantern-room-offline-deployment',
  });
});

test('preloaded config cannot silently bypass an explicit bootstrap request', (t) => {
  const filename = writeBootstrap(t, runtimeBootstrap());
  const legacyConfig = loadConfig({}, { loadDotenv: false });

  assert.throws(
    () =>
      startServer({
        config: legacyConfig,
        environment: matchingEnvironment(filename),
        loadDotenv: false,
        deploymentIdentity,
        logger,
        rpcPool: { call: async () => [], callNode: async () => null, getStatus: () => [] },
        installSignalHandlers: false,
      }),
    (error) => error instanceof VenueRuntimeAdmissionError && /venue\.id/.test(error.message),
  );

  assert.throws(
    () =>
      startServer({
        config: legacyConfig,
        environment: {
          HIVE_VENUE_BOOTSTRAP_PATH: path.join(os.tmpdir(), 'missing-explicit-bootstrap.json'),
        },
        loadDotenv: false,
        deploymentIdentity,
        logger,
        installSignalHandlers: false,
      }),
    (error) => error instanceof VenueRuntimeAdmissionError && /cannot read explicit bootstrap file/.test(error.message),
  );
});

test('deployment/runtime facts and active or durable stores must agree before an admitted venue may listen', (t) => {
  const filename = writeBootstrap(t, runtimeBootstrap());
  const environment = matchingEnvironment(filename);
  const admission = loadVenueRuntimeAdmission(environment, { loadDotenv: false });
  const config = loadConfig(environment, {
    loadDotenv: false,
    venue: admission.composition.venueContext,
  });
  const onboardingConfig = parseOnboardingConfig(environment, config.hive);
  const runtimeFacts = currentRuntimeFacts();

  assert.equal(
    assertVenueRuntimeCoherence(admission, config, { onboardingConfig }),
    admission,
  );
  assert.equal(
    assertVenueRuntimeCoherence(
      admission,
      { ...config, payments: { ...config.payments, enabled: false, receiptDbPath: ':memory:' } },
      { onboardingConfig: { ...onboardingConfig, enabled: false, dbPath: ':memory:' } },
    ),
    admission,
  );
  assert.throws(
    () =>
      assertVenueRuntimeCoherence(admission, config, {
        onboardingConfig,
        runtimeFacts: { ...runtimeFacts, nodeVersion: '99.99.99' },
      }),
    (error) => error instanceof VenueRuntimeAdmissionError && /runtime\.nodeVersion/.test(error.message),
  );
  assert.throws(
    () =>
      assertVenueRuntimeCoherence(admission, config, {
        onboardingConfig,
        runtimeFacts: { ...runtimeFacts, platform: 'wrong-platform' },
      }),
    (error) => error instanceof VenueRuntimeAdmissionError && /runtime\.platform/.test(error.message),
  );
  assert.throws(
    () =>
      assertVenueRuntimeCoherence(
        admission,
        { ...config, server: { ...config.server, port: 4199 } },
        { onboardingConfig },
      ),
    (error) => error instanceof VenueRuntimeAdmissionError && /topology\.application\.port/.test(error.message),
  );
  assert.throws(
    () =>
      assertVenueRuntimeCoherence(
        admission,
        { ...config, auth: { ...config.auth, appOrigin: 'https://wrong.example.invalid' } },
        { onboardingConfig },
      ),
    (error) => error instanceof VenueRuntimeAdmissionError && /release\.publicHost/.test(error.message),
  );
  assert.throws(
    () =>
      assertVenueRuntimeCoherence(
        admission,
        { ...config, payments: { ...config.payments, receiptDbPath: '/tmp/wrong-payments.sqlite3' } },
        { onboardingConfig },
      ),
    (error) => error instanceof VenueRuntimeAdmissionError && /storage\.paymentDatabase/.test(error.message),
  );
  assert.throws(
    () =>
      assertVenueRuntimeCoherence(admission, config, {
        onboardingConfig: { ...onboardingConfig, dbPath: '/tmp/wrong-onboarding.sqlite3' },
      }),
    (error) => error instanceof VenueRuntimeAdmissionError && /storage\.onboardingDatabase/.test(error.message),
  );
  assert.throws(
    () =>
      assertVenueRuntimeCoherence(
        admission,
        { ...config, moderation: { ...config.moderation, enabled: true } },
        { onboardingConfig },
      ),
    (error) => error instanceof VenueRuntimeAdmissionError && /moderation\.storage/.test(error.message),
  );
});

test('production release roots and exact provenance are bound to the admitted deployment', (t) => {
  const filename = writeBootstrap(t, runtimeBootstrap());
  const environment = matchingEnvironment(filename);
  const admission = loadVenueRuntimeAdmission(environment, { loadDotenv: false });
  const baseConfig = loadConfig(environment, {
    loadDotenv: false,
    venue: admission.composition.venueContext,
  });
  const config = { ...baseConfig, env: 'production', isProduction: true };
  const onboardingConfig = parseOnboardingConfig(environment, config.hive);
  const declaredRoot = admission.composition.deploymentProfile.release.root;

  assert.equal(isAdmittedReleaseRoot(`${declaredRoot}/current`, declaredRoot), true);
  assert.equal(isAdmittedReleaseRoot(`${declaredRoot}/releases/${deploymentIdentity.commit}`, declaredRoot), true);
  assert.equal(isAdmittedReleaseRoot(`${declaredRoot}/releases/not-a-commit`, declaredRoot), false);
  assert.equal(isAdmittedReleaseRoot('/opt/another-venue/current', declaredRoot), false);

  assert.equal(
    assertVenueRuntimeCoherence(admission, config, {
      onboardingConfig,
      releaseRoot: `${declaredRoot}/current`,
      deploymentIdentity,
    }),
    admission,
  );
  assert.throws(
    () =>
      assertVenueRuntimeCoherence(admission, config, {
        onboardingConfig,
        releaseRoot: '/opt/another-venue/current',
        deploymentIdentity,
      }),
    (error) => error instanceof VenueRuntimeAdmissionError && /release\.root/.test(error.message),
  );
  assert.throws(
    () =>
      assertVenueRuntimeCoherence(admission, config, {
        onboardingConfig,
        releaseRoot: `${declaredRoot}/current`,
        deploymentIdentity: { ...deploymentIdentity, exact: false },
      }),
    (error) => error instanceof VenueRuntimeAdmissionError && /release\.exactCommitRequired/.test(error.message),
  );
  assert.throws(
    () =>
      assertVenueRuntimeCoherence(admission, config, {
        onboardingConfig,
        releaseRoot: `${declaredRoot}/releases/${'f'.repeat(40)}`,
        deploymentIdentity,
      }),
    (error) => error instanceof VenueRuntimeAdmissionError && /release\.commit/.test(error.message),
  );
});

test('ordinary startServer rejects an admitted runtime that does not match the current process', (t) => {
  const bootstrap = runtimeBootstrap();
  bootstrap.deploymentManifest.runtime.nodeVersion = '99.99.99';
  const filename = writeBootstrap(t, bootstrap);

  assert.throws(
    () =>
      startServer({
        environment: matchingEnvironment(filename),
        loadDotenv: false,
        deploymentIdentity,
        logger,
        rpcPool: { call: async () => [], callNode: async () => null, getStatus: () => [] },
        installSignalHandlers: false,
      }),
    (error) => error instanceof VenueRuntimeAdmissionError && /runtime\.nodeVersion/.test(error.message),
  );
});

test('ordinary startServer consumes a synthetic non-Fourth-Street bootstrap without source injection', async (t) => {
  const port = await findAvailablePort();
  const bootstrap = runtimeBootstrap(port);
  const filename = writeBootstrap(t, bootstrap);
  const environment = matchingEnvironment(filename, port);
  const rpcPool = { call: async () => [], callNode: async () => null, getStatus: () => [] };

  const running = startServer({
    environment,
    loadDotenv: false,
    deploymentIdentity,
    logger,
    rpcPool,
    receiptStore: { close() {} },
    installSignalHandlers: false,
  });
  await once(running.server, 'listening');

  try {
    assert.equal(running.venueAdmission.composition.bootstrapId, 'lantern-room-offline-bootstrap');
    assert.equal(running.config.venue.id, 'lantern-room-fixture');
    assert.equal(running.config.hive.communityId, 'hive-654321');
    assert.equal(running.app.locals.siteName, 'The Lantern Room (Fixture)');
    assert.equal(running.app.locals.venuePackage.id, 'lantern-room-fixture-package');
    assert.equal(running.server.address().port, port);
  } finally {
    const closed = once(running.server, 'close');
    running.shutdown('test');
    await closed;
  }
});
