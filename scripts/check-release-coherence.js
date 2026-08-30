'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { RELEASE_APP_TAG, PACKAGE_VERSION } = require('../src/release/release-version');
const { V1_ACTIONS } = require('../src/v1/actions');

const root = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

function assertReleaseCoherence() {
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  const manifest = JSON.parse(read('ops/privex/manifest.json'));
  const envExample = read('.env.example');
  const privexEnv = read('ops/privex/hive-bar.env.example');
  const workflow = read('.github/workflows/ci.yml');
  const readme = read('README.md');
  const docsReadme = read('docs/README.md');
  const roadmap = read('docs/ROADMAP.md');
  const architectureDecision = read('docs/HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md');
  const hv2Preregistration = read('docs/HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION_PREREGISTRATION_0_1_0.md');
  const operations = read('docs/PRODUCTION_OPERATIONS.md');

  if (pkg.version !== PACKAGE_VERSION) throw new Error('package version source is inconsistent');
  if (lock.packages?.['']?.version !== PACKAGE_VERSION) {
    throw new Error('package-lock root version must match package.json');
  }
  if (manifest.release?.hiveAppTag !== RELEASE_APP_TAG) {
    throw new Error('Privex manifest app tag must match the derived release app tag');
  }
  for (const [name, source] of [['.env.example', envExample], ['ops/privex/hive-bar.env.example', privexEnv]]) {
    requireMatch(
      source,
      new RegExp(`^HIVE_APP_TAG=${RELEASE_APP_TAG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'),
      `${name} must use the derived release app tag`,
    );
  }

  requireMatch(workflow, /uses:\s+actions\/checkout@[0-9a-f]{40}(?:\s+#.*)?$/m, 'checkout must be pinned by full commit SHA');
  requireMatch(workflow, /uses:\s+actions\/setup-node@[0-9a-f]{40}(?:\s+#.*)?$/m, 'setup-node must be pinned by full commit SHA');

  // Living successor documents must describe the moving source and current routing,
  // without pretending historical Fourth Street production evidence is current source identity.
  requireMatch(readme, /^# Hive-Venues$/m, 'README must identify the successor product as Hive-Venues');
  requireMatch(readme, /Node\.js\s+24\.19\.0/, 'README must state the pinned Node runtime');
  requireMatch(readme, /npm\s+11\.17\.0/, 'README must state the pinned npm runtime');
  requireMatch(
    readme,
    /Canonical source is the `main` branch of `etblink\/Hive-Venues`/,
    'README must identify Hive-Venues main as the moving canonical source',
  );
  requireMatch(
    readme,
    /HV-1, the Venue Context Foundation, is accepted and canonical/,
    'README must identify HV-1 as accepted',
  );
  requireMatch(
    readme,
    /next bounded implementation operation is \*\*HV-2: Reference Deployment Profile Extraction\*\*/i,
    'README must route to HV-2 deployment profile extraction',
  );

  requireMatch(docsReadme, /^# Hive-Venues Documentation Index$/m, 'documentation index must identify Hive-Venues');
  requireMatch(
    docsReadme,
    /Canonical integrated source is `main` in `etblink\/Hive-Venues`/,
    'documentation index must identify Hive-Venues main as canonical source',
  );
  requireMatch(
    docsReadme,
    /historical Hive-Bar milestone evidence/i,
    'documentation index must preserve historical Hive-Bar evidence as historical',
  );

  requireMatch(roadmap, /^# Hive-Venues Living Roadmap$/m, 'roadmap must identify the successor roadmap');
  requireMatch(roadmap, /^REPOSITORY = etblink\/Hive-Venues$/m, 'roadmap must bind the successor repository');
  requireMatch(roadmap, /^HV1_VENUE_CONTEXT_FOUNDATION = ACCEPTED$/m, 'roadmap must bind accepted HV-1');
  requireMatch(
    roadmap,
    /^NEXT_OPERATION = HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION$/m,
    'roadmap must route to the preregistered HV-2 operation',
  );
  requireMatch(
    roadmap,
    /^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m,
    'roadmap must not imply shared-runtime tenancy is already accepted',
  );
  requireMatch(
    roadmap,
    /The last recorded accepted production transition in the inherited roadmap is M19\.2/,
    'roadmap must preserve the historical M19.2 production boundary',
  );

  requireMatch(
    architectureDecision,
    /^STATUS = ACCEPTED_SUCCESSOR_ARCHITECTURE_DECISION$/m,
    'architecture decision must remain accepted',
  );
  requireMatch(
    architectureDecision,
    /^SHARED_RUNTIME_MULTI_TENANCY_AUTHORIZED = NO$/m,
    'architecture decision must keep shared-runtime tenancy unauthorized',
  );
  requireMatch(
    architectureDecision,
    /^LIVE_PRODUCTION_MUTATION_AUTHORIZED = NO$/m,
    'architecture decision must keep production mutation unauthorized',
  );
  requireMatch(
    architectureDecision,
    /HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION/,
    'architecture decision must route to HV-2',
  );

  requireMatch(
    hv2Preregistration,
    /^OPERATION = HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION$/m,
    'HV-2 preregistration must bind the intended operation',
  );
  requireMatch(
    hv2Preregistration,
    /^STATUS = FROZEN_PREREGISTRATION__IMPLEMENTATION_NOT_STARTED$/m,
    'HV-2 preregistration must remain frozen before implementation acceptance',
  );
  requireMatch(
    hv2Preregistration,
    /^LIVE_PRODUCTION_MUTATION = FORBIDDEN$/m,
    'HV-2 preregistration must keep live production mutation forbidden',
  );

  requireMatch(
    operations,
    /Runtime source identity: `\/healthz` publishes the exact deployed beta build label, commit, and tree/,
    'operations must define runtime source identity through healthz',
  );
  requireMatch(operations, /last-good.*M17\.3/i, 'operations must retain M17.3 as the last-good boundary');
  requireMatch(
    operations,
    /in-person onboarding: not production-activated/,
    'operations must distinguish onboarding source capability from production activation',
  );

  if (/Canonical `main` and production are aligned on accepted M19\.1/.test(readme + docsReadme + roadmap)) {
    throw new Error('living documentation must not pin moving main to the historical M19.1 production event');
  }
  if (/\bMIT License\b/i.test(readme)) {
    throw new Error('README must not claim an open-source license that the repository does not provide');
  }

  if (!Array.isArray(manifest.v1?.selfSignedActions)) {
    throw new Error('Privex manifest must publish the frozen V1 self-signing action set');
  }
  if (JSON.stringify(manifest.v1.selfSignedActions) !== JSON.stringify(V1_ACTIONS)) {
    throw new Error('Privex manifest V1 action set must match src/v1/actions.js');
  }
  if (manifest.runtimeProfiles?.wiredV1 !== 'privex-v1-self-signing') {
    throw new Error('Privex manifest must identify the wired V1 runtime profile');
  }
  if (manifest.runtimeProfiles?.acceptedBeta !== 'privex-beta-self-signing') {
    throw new Error('Privex manifest must retain the accepted beta runtime profile');
  }
  if (manifest.v1?.status !== 'runtime-wired-not-production-activated') {
    throw new Error('Privex manifest must distinguish V1 runtime wiring from production activation');
  }
  if (manifest.release?.lastGoodPath !== '/opt/hive-bar/last-good') {
    throw new Error('Privex manifest must publish the canonical last-good path');
  }
  if (manifest.release?.lastGoodPolicy !== 'previous-validated-current-before-switch') {
    throw new Error('Privex manifest must publish the reviewed last-good update policy');
  }

  for (const requiredPath of [
    'docs/README.md',
    'docs/ROADMAP.md',
    'docs/PRODUCTION_OPERATIONS.md',
    'docs/HIVE_VENUES_SUCCESSOR_BASELINE_0_1_0.md',
    'docs/HV1_VENUE_CONTEXT_FOUNDATION_PREREGISTRATION_0_1_0.md',
    'docs/HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md',
    'docs/HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION_PREREGISTRATION_0_1_0.md',
    'docs/M17_1_V1_PRODUCT_BOUNDARY.md',
    'docs/M17_2_SOURCE_OF_TRUTH_AND_V1_GATE.md',
    'docs/M17_3_RUNTIME_V1_WIRING_AND_OPERATIONAL_ACCEPTANCE.md',
    'docs/M17_4_FUNCTIONAL_V1_BASELINE.md',
    'docs/M19_1_COPY_AND_ONBOARDING_READINESS.md',
    'docs/M19_3_IN_PERSON_HIVE_ONBOARDING.md',
  ]) {
    if (!fs.existsSync(path.join(root, requiredPath))) {
      throw new Error(`required living/release document is missing: ${requiredPath}`);
    }
  }

  return Object.freeze({
    product: 'Hive-Venues',
    packageVersion: PACKAGE_VERSION,
    appTag: RELEASE_APP_TAG,
    v1ActionCount: V1_ACTIONS.length,
    nextOperation: 'HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION',
  });
}

if (require.main === module) {
  try {
    process.stdout.write(`${JSON.stringify(assertReleaseCoherence())}\n`);
  } catch (error) {
    process.stderr.write(`Hive-Venues release coherence refused: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { assertReleaseCoherence };
