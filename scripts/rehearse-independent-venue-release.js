'use strict';

const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { once } = require('node:events');
const { startServer } = require('../src/server');
const {
  assertProductionInvariantCoverage,
  promoteRelease,
  readPointer,
  rollbackRelease,
  stageReleaseIdentity,
  CURRENT_POINTER_FILENAME,
} = require('../src/release/non-production-rehearsal');
const { HV4_SYNTHETIC_BOOTSTRAP_INPUT } = require('../test/support/hv4-synthetic-bootstrap');

const PREVIOUS_IDENTITY = Object.freeze({
  commit: '1'.repeat(40),
  tree: 'a'.repeat(40),
});
const CANDIDATE_IDENTITY = Object.freeze({
  commit: '2'.repeat(40),
  tree: 'b'.repeat(40),
});

const silentLogger = Object.freeze({
  child() {
    return this;
  },
  debug() {},
  error() {},
  fatal() {},
  info() {},
  trace() {},
  warn() {},
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function manifestPathForNativePath(nativePath) {
  const normalized = path.resolve(nativePath).replace(/\\/g, '/');
  if (process.platform !== 'win32') return path.posix.normalize(normalized);
  const match = /^[A-Za-z]:(\/.*)$/.exec(normalized);
  if (!match) throw new Error(`Unable to derive portable rehearsal path from ${nativePath}`);
  return path.posix.normalize(match[1]);
}

function createIsolatedRoot() {
  const nativeRoot = fs.mkdtempSync(path.join(process.cwd(), '.hive-venues-release-rehearsal-'));
  const manifestRoot = manifestPathForNativePath(nativeRoot);
  if (path.resolve(manifestRoot) !== path.resolve(nativeRoot)) {
    fs.rmSync(nativeRoot, { recursive: true, force: true });
    throw new Error(
      `Portable rehearsal path does not resolve to the isolated native root: ${manifestRoot}`,
    );
  }
  return Object.freeze({
    nativeRoot,
    manifestRoot,
  });
}

async function findAvailablePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

function runtimeBootstrap({ manifestRoot, port }) {
  const bootstrap = clone(HV4_SYNTHETIC_BOOTSTRAP_INPUT);
  const deployment = bootstrap.deploymentManifest;
  deployment.runtime.nodeVersion = process.versions.node;
  deployment.runtime.platform = `${process.platform}-${process.arch}`;
  deployment.topology.applicationAddress = `127.0.0.1:${port}`;
  deployment.release.root = manifestRoot;
  deployment.release.lastGoodPath = `${manifestRoot}/last-good`;
  deployment.release.hiveAppTag = 'lantern-room-fixture/0.0.0';
  deployment.storage.paymentDatabase = `${manifestRoot}/state/payments.sqlite3`;
  deployment.storage.onboardingDatabase = `${manifestRoot}/state/onboarding.sqlite3`;
  return bootstrap;
}

function environmentForRelease({ bootstrapPath, port }) {
  return {
    NODE_ENV: 'production',
    PORT: String(port),
    BIND_HOST: '127.0.0.1',
    TRUST_PROXY: 'loopback',
    APP_ORIGIN: 'https://lantern-room.example.invalid',
    SESSION_SECRET: 'independent-venue-release-rehearsal-secret-32-bytes',
    HIVE_VENUE_ADMISSION_MODE: 'explicit-bootstrap',
    HIVE_VENUE_BOOTSTRAP_PATH: bootstrapPath,
    HIVE_RPC_NODES:
      'https://api.hive.blog,https://api.deathwing.me,https://api.openhive.network',
    HIVE_WRITE_MODE: 'disabled',
    HIVE_WALL_DEFAULT_FEE: '1.000 HBD',
    HIVE_MODERATION_ENABLED: 'false',
    HIVE_PAYMENT_ENABLED: 'false',
    HIVE_PAYMENT_RECEIPT_DB_PATH: ':memory:',
    HIVE_ONBOARDING_ENABLED: 'false',
    HIVE_ONBOARDING_DB_PATH: ':memory:',
    DISTRIATOR_ENABLED: 'false',
    DISTRIATOR_CLAIM_URL: 'https://distriator.com/',
    HIVE_APP_TAG: 'lantern-room-fixture/0.0.0',
    LOG_LEVEL: 'silent',
  };
}

function createRpcPool() {
  return Object.freeze({
    async call() {
      return {};
    },
    async callNode() {
      return {};
    },
    getStatus() {
      return [];
    },
  });
}

function stageRelease({ rootDir, identity, commitFilename, treeFilename }) {
  return stageReleaseIdentity({
    rootDir,
    identity,
    commitFilename,
    treeFilename,
  });
}

function writeBootstrapForRelease({ release, manifestRoot, port }) {
  const bootstrap = runtimeBootstrap({ manifestRoot, port });
  const bootstrapDirectory = path.join(
    manifestRoot,
    'rehearsal-runtime',
    release.identity.commit,
  );
  fs.mkdirSync(bootstrapDirectory, { recursive: true });
  const bootstrapPath = path.join(bootstrapDirectory, 'venue-bootstrap.rehearsal.json');
  fs.writeFileSync(bootstrapPath, `${JSON.stringify(bootstrap, null, 2)}\n`, 'utf8');
  return bootstrapPath;
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return Object.freeze({ reachable: true, status: response.status, body });
  } catch {
    return Object.freeze({ reachable: false, status: null, body: null });
  }
}

async function startAndObserveRelease({
  release,
  manifestRoot,
}) {
  const port = await findAvailablePort();
  const bootstrapPath = writeBootstrapForRelease({ release, manifestRoot, port });
  const environment = environmentForRelease({ bootstrapPath, port });
  const running = startServer({
    environment,
    loadDotenv: false,
    releaseRoot: release.releasePath,
    logger: silentLogger,
    rpcPool: createRpcPool(),
    installSignalHandlers: false,
  });
  await once(running.server, 'listening');

  try {
    const baseUrl = `http://127.0.0.1:${port}`;
    const health = await fetchJson(`${baseUrl}/healthz`);
    const readiness = await fetchJson(`${baseUrl}/readyz`);
    const healthIdentityMatches =
      health.reachable === true &&
      health.status === 200 &&
      health.body?.status === 'ok' &&
      health.body?.writeMode === 'disabled' &&
      health.body?.service === HV4_SYNTHETIC_BOOTSTRAP_INPUT.venueContext.id &&
      health.body?.commit === release.identity.commit &&
      health.body?.tree === release.identity.tree;
    const readinessMatches =
      readiness.reachable === true &&
      readiness.status === 200 &&
      readiness.body?.status === 'ready';

    if (!healthIdentityMatches || !readinessMatches) {
      throw new Error(
        `Release observation mismatch for ${release.identity.commit}: ` +
          `health=${JSON.stringify(health)} readiness=${JSON.stringify(readiness)}`,
      );
    }

    return Object.freeze({
      health: Object.freeze({
        status: health.status,
        body: health.body,
        exactIdentity: true,
      }),
      readiness: Object.freeze({
        status: readiness.status,
        body: readiness.body,
        expectedReady: true,
      }),
    });
  } finally {
    const closed = once(running.server, 'close');
    running.shutdown('rehearsal');
    await closed;
  }
}

async function injectPostPromotionServiceFailure({ release, manifestRoot }) {
  const port = await findAvailablePort();
  const bootstrapPath = writeBootstrapForRelease({ release, manifestRoot, port });
  const running = startServer({
    environment: environmentForRelease({ bootstrapPath, port }),
    loadDotenv: false,
    releaseRoot: release.releasePath,
    logger: silentLogger,
    rpcPool: createRpcPool(),
    installSignalHandlers: false,
  });
  await once(running.server, 'listening');

  const closed = once(running.server, 'close');
  running.shutdown('rehearsal-injected-post-promotion-failure');
  await closed;

  const baseUrl = `http://127.0.0.1:${port}`;
  const health = await fetchJson(`${baseUrl}/healthz`);
  const readiness = await fetchJson(`${baseUrl}/readyz`);
  if (health.reachable || readiness.reachable) {
    throw new Error('Injected post-promotion service failure remained reachable');
  }

  return Object.freeze({
    failure: 'INJECTED_POST_PROMOTION_SERVICE_UNAVAILABLE',
    health: Object.freeze({ reachable: false }),
    readiness: Object.freeze({ reachable: false }),
    productionFailureClass: 'POST_SWITCH_HEALTH_UNREACHABLE',
  });
}

async function runIndependentVenueReleaseRehearsal(options = {}) {
  const repositoryRoot = path.resolve(options.repositoryRoot || path.join(__dirname, '..'));
  const isolated = createIsolatedRoot();
  const rootDir = isolated.manifestRoot;
  const provenance = HV4_SYNTHETIC_BOOTSTRAP_INPUT.deploymentManifest.provenance;

  try {
    const productionInvariantCrosscheck = assertProductionInvariantCoverage(repositoryRoot);
    const previous = stageRelease({
      rootDir,
      identity: PREVIOUS_IDENTITY,
      commitFilename: provenance.commitFilename,
      treeFilename: provenance.treeFilename,
    });
    const candidate = stageRelease({
      rootDir,
      identity: CANDIDATE_IDENTITY,
      commitFilename: provenance.commitFilename,
      treeFilename: provenance.treeFilename,
    });

    const previousInitial = await startAndObserveRelease({
      release: previous,
      manifestRoot: rootDir,
    });
    promoteRelease({
      rootDir,
      identity: previous.identity,
      commitFilename: provenance.commitFilename,
      treeFilename: provenance.treeFilename,
    });

    const candidatePrePromotion = await startAndObserveRelease({
      release: candidate,
      manifestRoot: rootDir,
    });
    const candidatePromotion = promoteRelease({
      rootDir,
      identity: candidate.identity,
      commitFilename: provenance.commitFilename,
      treeFilename: provenance.treeFilename,
    });

    const candidatePostPromotionFailure = await injectPostPromotionServiceFailure({
      release: candidate,
      manifestRoot: rootDir,
    });
    const rollback = rollbackRelease({
      rootDir,
      commitFilename: provenance.commitFilename,
      treeFilename: provenance.treeFilename,
    });
    const restoredPrevious = await startAndObserveRelease({
      release: previous,
      manifestRoot: rootDir,
    });
    const finalCurrent = readPointer(rootDir, CURRENT_POINTER_FILENAME);

    if (finalCurrent?.identity.commit !== previous.identity.commit) {
      throw new Error('Final current release did not restore the previous exact identity');
    }

    return Object.freeze({
      schemaVersion: 1,
      rehearsal: 'independent-venue-release-lifecycle',
      status: 'PASS',
      venue: Object.freeze({
        id: HV4_SYNTHETIC_BOOTSTRAP_INPUT.venueContext.id,
        displayName: HV4_SYNTHETIC_BOOTSTRAP_INPUT.venueContext.displayName,
        synthetic: true,
        fourthStreet: false,
      }),
      scope: Object.freeze({
        environment: 'NON_PRODUCTION_REPOSITORY_LOCAL',
        network: 'LOOPBACK_ONLY',
        privilegedHostMutation: false,
        productionMutation: false,
        liveHiveWrite: false,
        realKeyMaterial: false,
      }),
      pointerMechanism: 'PORTABLE_ATOMIC_REHEARSAL_MANIFEST__NOT_PRODUCTION_SYMLINK_MECHANISM',
      identityOrigin: 'SYNTHETIC_REHEARSAL_ONLY__FORMAT_EXACT_NOT_GIT_PROVENANCE',
      productionInvariantCrosscheck,
      releases: Object.freeze({
        previous: previous.identity,
        candidate: candidate.identity,
      }),
      phases: Object.freeze({
        previousInitial,
        candidatePrePromotion,
        candidatePromotion: Object.freeze({
          previous: candidatePromotion.previous?.identity || null,
          current: candidatePromotion.current.identity,
        }),
        candidatePostPromotionFailure,
        rollback: Object.freeze({
          from: rollback.currentBefore?.identity || null,
          restored: rollback.restored.identity,
        }),
        restoredPrevious,
      }),
      final: Object.freeze({
        current: finalCurrent.identity,
        rollbackVerified: true,
        healthVerified: true,
        readinessVerified: true,
      }),
    });
  } finally {
    fs.rmSync(isolated.nativeRoot, { recursive: true, force: true });
  }
}

async function main() {
  try {
    const result = await runIndependentVenueReleaseRehearsal();
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        schemaVersion: 1,
        rehearsal: 'independent-venue-release-lifecycle',
        status: 'FAIL',
        error: error.message,
      })}\n`,
    );
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void main();
}

module.exports = {
  CANDIDATE_IDENTITY,
  PREVIOUS_IDENTITY,
  manifestPathForNativePath,
  runIndependentVenueReleaseRehearsal,
};
