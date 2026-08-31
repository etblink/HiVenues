'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { REFERENCE_DEPLOYMENT_PROFILE } = require('../src/deployment/reference/fourth-street-privex');
const { RELEASE_APP_TAG, PACKAGE_VERSION } = require('../src/release/release-version');
const { V1_ACTIONS } = require('../src/v1/actions');

const root = path.join(__dirname, '..');
const CURRENT_START = '<!-- HV6_CURRENT_ROUTING_START -->';
const CURRENT_END = '<!-- HV6_CURRENT_ROUTING_END -->';

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
}

function currentRouting(relativePath) {
  const source = read(relativePath);
  const starts = source.split(CURRENT_START).length - 1;
  const ends = source.split(CURRENT_END).length - 1;
  if (starts !== 1 || ends !== 1) {
    throw new Error(`${relativePath} must contain exactly one current-routing marker pair`);
  }
  const start = source.indexOf(CURRENT_START) + CURRENT_START.length;
  const end = source.indexOf(CURRENT_END, start);
  if (end <= start) throw new Error(`${relativePath} current-routing markers must be ordered`);
  return source.slice(start, end);
}

function assertReferenceDeploymentProfile() {
  const deployment = REFERENCE_DEPLOYMENT_PROFILE;
  const expected = [
    [deployment.id, 'fourth-street-privex', 'deployment id'],
    [deployment.provider.name, 'Privex', 'provider'],
    [deployment.provider.package, 'V1-US-NVME', 'package'],
    [deployment.provider.region, 'US West', 'region'],
    [deployment.provider.operatingSystem, 'Debian 13', 'operating system'],
    [deployment.runtime.nodeVersion, '24.19.0', 'Node runtime'],
    [deployment.runtime.npmVersion, '11.17.0', 'npm runtime'],
    [deployment.runtime.platform, 'linux-x64', 'runtime platform'],
    [deployment.topology.instances, 1, 'instance count'],
    [deployment.topology.edgeProxy, 'Cloudflare', 'edge proxy'],
    [deployment.topology.edgeDnsMode, 'proxied', 'edge DNS mode'],
    [deployment.topology.reverseProxy, 'Caddy', 'reverse proxy'],
    [deployment.topology.application.address, '127.0.0.1:3000', 'application address'],
    [deployment.topology.application.bindHost, '127.0.0.1', 'application bind host'],
    [deployment.topology.application.port, 3000, 'application port'],
    [deployment.topology.application.trustProxy, 'loopback', 'application trust proxy'],
    [deployment.topology.visitorIpHeader, 'CF-Connecting-IP', 'visitor IP header'],
    [deployment.topology.originIngress, 'cloudflare-only', 'origin ingress'],
    [deployment.topology.tlsMode, 'full-strict', 'TLS mode'],
    [deployment.release.publicHost, 'fourthstreetbar.com', 'public host'],
    [deployment.release.redirectHost, 'www.fourthstreetbar.com', 'redirect host'],
    [deployment.release.root, '/opt/hive-bar', 'release root'],
    [deployment.release.service, 'hive-bar.service', 'service name'],
    [deployment.release.healthPath, '/healthz', 'health path'],
    [deployment.release.readinessPath, '/readyz', 'readiness path'],
    [deployment.release.automaticDeploys, false, 'automatic deploy policy'],
    [deployment.release.exactCommitRequired, true, 'exact commit policy'],
    [deployment.release.lastGoodPath, '/opt/hive-bar/last-good', 'last-good path'],
    [deployment.release.lastGoodPolicy, 'previous-validated-current-before-switch', 'last-good policy'],
    [deployment.storage.paymentDatabase, '/var/lib/hive-bar/payments/receipts.sqlite3', 'payment database'],
    [deployment.storage.onboardingDatabase, '/var/lib/hive-bar/onboarding/onboarding.sqlite3', 'onboarding database'],
    [deployment.provenance.commitFilename, '.hive-bar-commit', 'commit provenance filename'],
    [deployment.provenance.treeFilename, '.hive-bar-tree', 'tree provenance filename'],
    [deployment.runtimeProfiles.deploymentBaseline, 'privex-public-read-only', 'deployment baseline profile'],
    [deployment.runtimeProfiles.acceptedBeta, 'privex-beta-self-signing', 'accepted beta profile'],
    [deployment.runtimeProfiles.wiredV1, 'privex-v1-self-signing', 'wired V1 profile'],
  ];

  for (const [actual, frozen, label] of expected) {
    if (actual !== frozen) throw new Error(`reference deployment ${label} drifted`);
  }
  if (deployment.release.hiveAppTag !== `fourth-street-bar-app/${PACKAGE_VERSION}`) {
    throw new Error('reference deployment app tag must remain derived from the package version');
  }
  if (!Object.isFrozen(deployment) || !Object.isFrozen(deployment.release) || !Object.isFrozen(deployment.storage)) {
    throw new Error('reference deployment profile must be deeply immutable');
  }
  return deployment;
}

function assertCurrentRoutingBlock(relativePath) {
  const block = currentRouting(relativePath);
  const required = [
    [/^HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION = ACCEPTED$/m, 'HV-6 must be accepted'],
    [/^SELECTED_ADAPTER = NATIVE_EXISTING_STACK$/m, 'native existing stack must remain selected'],
    [/^HV6_PHASE_C_IMPLEMENTATION = ACCEPTED$/m, 'Phase C implementation must be accepted'],
    [/^POST_HV6_SEQUENCING_DECISION = PENDING$/m, 'Post-HV-6 sequencing must remain pending'],
    [/^SELECTED_NEXT_LANE = NONE$/m, 'no post-HV-6 lane may be preselected'],
    [/^NEXT_OPERATION = POST_HV6_SEQUENCING_DECISION__READ_ONLY$/m, 'next product operation must be read-only sequencing'],
    [/^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'substantive implementation must remain unauthorized'],
    [/^GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED$/m, 'GrapesJS Core must remain evaluated and not selected'],
    [/^GRAPESJS_STUDIO_SDK = NOT_SELECTED$/m, 'Studio SDK must remain unselected'],
    [/^(?:REAL_SECOND_VENUE_AUTHORIZED|SECOND_REAL_VENUE_AUTHORIZED) = NO$/m, 'real second venue must remain unauthorized'],
    [/^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m, 'live production mutation must remain unauthorized'],
    [/^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m, 'shared runtime tenancy must remain deferred'],
    [/^DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME$/m, 'isolated runtime must remain default'],
  ];
  for (const [pattern, message] of required) requireMatch(block, pattern, `${relativePath}: ${message}`);

  if (/HV6_BOUNDED_DUAL_CANDIDATE_IMPLEMENTATION_AND_EVALUATION/.test(block) ||
      /HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_AND_QUALIFICATION/.test(block) ||
      /AUTHORIZED__NOT_YET_ACCEPTED/.test(block)) {
    throw new Error(`${relativePath}: superseded HV-6 routing leaked into the current-routing block`);
  }
  return block;
}

function assertReleaseCoherence() {
  const pkg = JSON.parse(read('package.json'));
  const lock = JSON.parse(read('package-lock.json'));
  const manifest = JSON.parse(read('ops/privex/manifest.json'));
  const deployment = assertReferenceDeploymentProfile();
  const envExample = read('.env.example');
  const privexEnv = read('ops/privex/hive-bar.env.example');
  const workflow = read('.github/workflows/ci.yml');
  const readme = read('README.md');
  const docsReadme = read('docs/README.md');
  const roadmap = read('docs/ROADMAP.md');
  const architectureDecision = read('docs/HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md');
  const hv5Acceptance = read('docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md');
  const hv6Acceptance = read('docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_ACCEPTANCE_0_1_0.md');
  const postHv6Reconciliation = read('docs/POST_HV6_LIVING_ROUTING_RECONCILIATION_0_1_0.md');
  const operations = read('docs/PRODUCTION_OPERATIONS.md');

  if (pkg.version !== PACKAGE_VERSION) throw new Error('package version source is inconsistent');
  if (lock.packages?.['']?.version !== PACKAGE_VERSION) throw new Error('package-lock root version must match package.json');
  if (manifest.release?.hiveAppTag !== RELEASE_APP_TAG || deployment.release.hiveAppTag !== RELEASE_APP_TAG) {
    throw new Error('Privex manifest, deployment profile, and release app tag must agree');
  }
  if (manifest.storage?.paymentDatabase !== deployment.storage.paymentDatabase) {
    throw new Error('Privex manifest payment database must match the deployment profile');
  }
  if (manifest.storage?.onboardingDatabase !== deployment.storage.onboardingDatabase) {
    throw new Error('Privex manifest onboarding database must match the deployment profile');
  }
  if (manifest.provenance?.commitFilename !== deployment.provenance.commitFilename ||
      manifest.provenance?.treeFilename !== deployment.provenance.treeFilename) {
    throw new Error('Privex manifest provenance filenames must match the deployment profile');
  }

  for (const [name, source] of [['.env.example', envExample], ['ops/privex/hive-bar.env.example', privexEnv]]) {
    requireMatch(source, new RegExp(`^HIVE_APP_TAG=${RELEASE_APP_TAG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'), `${name} must use the derived release app tag`);
  }

  requireMatch(workflow, /uses:\s+actions\/checkout@[0-9a-f]{40}(?:\s+#.*)?$/m, 'checkout must be pinned by full commit SHA');
  requireMatch(workflow, /uses:\s+actions\/setup-node@[0-9a-f]{40}(?:\s+#.*)?$/m, 'setup-node must be pinned by full commit SHA');

  requireMatch(readme, /^# Hive-Venues$/m, 'README must identify Hive-Venues');
  requireMatch(readme, /The first six successor architecture\/product-foundation milestones are accepted/i, 'README must identify six accepted successor milestones');
  requireMatch(readme, /Canonical source is the `main` branch of `etblink\/Hive-Venues`/, 'README must identify moving canonical source');
  requireMatch(readme, /platform does not currently require a universal venue-type taxonomy/i, 'README must preserve venue-type neutrality');
  requireMatch(docsReadme, /^# Hive-Venues Documentation Index$/m, 'documentation index must identify Hive-Venues');
  requireMatch(docsReadme, /Canonical integrated source is `main` in `etblink\/Hive-Venues`/, 'documentation index must identify canonical source');
  requireMatch(roadmap, /^# Hive-Venues Living Roadmap$/m, 'roadmap must identify the successor roadmap');
  requireMatch(roadmap, /^REPOSITORY = etblink\/Hive-Venues$/m, 'roadmap must bind the successor repository');

  for (const relativePath of ['README.md', 'docs/README.md', 'docs/ROADMAP.md']) assertCurrentRoutingBlock(relativePath);

  requireMatch(architectureDecision, /^STATUS = ACCEPTED_SUCCESSOR_ARCHITECTURE_DECISION$/m, 'architecture decision must remain accepted');
  requireMatch(architectureDecision, /^SHARED_RUNTIME_MULTI_TENANCY_AUTHORIZED = NO$/m, 'architecture decision must keep shared-runtime tenancy unauthorized');
  requireMatch(architectureDecision, /^LIVE_PRODUCTION_MUTATION_AUTHORIZED = NO$/m, 'architecture decision must keep production mutation unauthorized');

  requireMatch(hv5Acceptance, /^HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION = ACCEPTED$/m, 'HV-5 must remain accepted');
  requireMatch(hv6Acceptance, /^STATUS = PROJECT_LEAD_ACCEPTED$/m, 'HV-6 acceptance must remain Project Lead accepted');
  requireMatch(hv6Acceptance, /^ACCEPTED_IMPLEMENTATION_COMMIT = 3b774468ff1ed347a35500f2a29062a63ed62621$/m, 'HV-6 acceptance must bind the accepted implementation commit');
  requireMatch(hv6Acceptance, /^ACCEPTED_IMPLEMENTATION_TREE = 5cde834eaf267aef8e6e824fd13b75e54045bb2c$/m, 'HV-6 acceptance must bind the accepted implementation tree');
  requireMatch(hv6Acceptance, /^SELECTED_ADAPTER = NATIVE_EXISTING_STACK$/m, 'HV-6 acceptance must bind the native adapter');
  requireMatch(hv6Acceptance, /^HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION = ACCEPTED$/m, 'HV-6 acceptance must bind the accepted milestone');
  requireMatch(hv6Acceptance, /^PUBLIC_PRODUCTION_AUTHORING_ROUTE = NOT_AUTHORIZED$/m, 'HV-6 acceptance must keep production authoring unauthorized');
  requireMatch(hv6Acceptance, /^REAL_SECOND_VENUE_ADMISSION = NOT_AUTHORIZED$/m, 'HV-6 acceptance must keep real second venue unauthorized');

  requireMatch(postHv6Reconciliation, /^OPERATION = POST_HV6_LIVING_ROUTING_RECONCILIATION$/m, 'post-HV-6 reconciliation must bind its operation');
  requireMatch(postHv6Reconciliation, /^CANONICAL_ACCEPTANCE_BASE_COMMIT = 6ad7c55a4e02a126d6d91f07847d76cfd33b8b8d$/m, 'post-HV-6 reconciliation must bind the acceptance commit');
  requireMatch(postHv6Reconciliation, /^POST_HV6_SEQUENCING_DECISION = PENDING$/m, 'post-HV-6 reconciliation must keep sequencing pending');
  requireMatch(postHv6Reconciliation, /^SELECTED_NEXT_LANE = NONE$/m, 'post-HV-6 reconciliation must remain lane-neutral');
  requireMatch(postHv6Reconciliation, /^NEXT_OPERATION = POST_HV6_SEQUENCING_DECISION__READ_ONLY$/m, 'post-HV-6 reconciliation must route to read-only sequencing');
  requireMatch(postHv6Reconciliation, /^NEW_SUBSTANTIVE_IMPLEMENTATION = NO$/m, 'post-HV-6 reconciliation must not implement a new product lane');

  requireMatch(operations, /Runtime source identity: `\/healthz` publishes the exact deployed beta build label, commit, and tree/, 'operations must define runtime source identity through healthz');
  requireMatch(operations, /last-good.*M17\.3/i, 'operations must retain the currently recorded last-good boundary');
  requireMatch(operations, /in-person onboarding: not production-activated/, 'operations must distinguish onboarding source capability from production activation');
  requireMatch(operations, /Production remains beta until a separately authorized transition/, 'operations must preserve beta-until-authorized semantics');

  if (/Canonical `main` and production are aligned on accepted M19\.1/.test(readme + docsReadme + roadmap)) {
    throw new Error('living documentation must not pin moving main to historical M19.1 production');
  }
  if (/\bMIT License\b/i.test(readme)) throw new Error('README must not claim an open-source license that the repository does not provide');

  if (!Array.isArray(manifest.v1?.selfSignedActions) || JSON.stringify(manifest.v1.selfSignedActions) !== JSON.stringify(V1_ACTIONS)) {
    throw new Error('Privex manifest V1 action set must match src/v1/actions.js');
  }
  if (manifest.runtimeProfiles?.wiredV1 !== 'privex-v1-self-signing') throw new Error('Privex manifest must identify the wired V1 runtime profile');
  if (manifest.runtimeProfiles?.acceptedBeta !== 'privex-beta-self-signing') throw new Error('Privex manifest must retain the accepted beta runtime profile');
  if (manifest.v1?.status !== 'runtime-wired-not-production-activated') throw new Error('Privex manifest must distinguish V1 runtime wiring from production activation');
  if (manifest.release?.lastGoodPath !== '/opt/hive-bar/last-good') throw new Error('Privex manifest must publish the canonical last-good path');
  if (manifest.release?.lastGoodPolicy !== 'previous-validated-current-before-switch') throw new Error('Privex manifest must publish the reviewed last-good update policy');

  for (const requiredPath of [
    'docs/README.md',
    'docs/ROADMAP.md',
    'docs/PRODUCTION_OPERATIONS.md',
    'docs/HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md',
    'docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md',
    'docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_ACCEPTANCE_0_1_0.md',
    'docs/POST_HV6_LIVING_ROUTING_RECONCILIATION_0_1_0.md',
  ]) {
    if (!fs.existsSync(path.join(root, requiredPath))) throw new Error(`required living/release document is missing: ${requiredPath}`);
  }

  return Object.freeze({
    product: 'Hive-Venues',
    packageVersion: PACKAGE_VERSION,
    appTag: RELEASE_APP_TAG,
    v1ActionCount: V1_ACTIONS.length,
    acceptedSuccessorMilestones: 6,
    nextOperation: 'POST_HV6_SEQUENCING_DECISION__READ_ONLY',
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
