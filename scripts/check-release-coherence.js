'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { REFERENCE_DEPLOYMENT_PROFILE } = require('../src/deployment/reference/fourth-street-privex');
const { RELEASE_APP_TAG, PACKAGE_VERSION } = require('../src/release/release-version');
const { V1_ACTIONS } = require('../src/v1/actions');

const root = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) throw new Error(message);
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
  const hv2Preregistration = read('docs/HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION_PREREGISTRATION_0_1_0.md');
  const hv2Acceptance = read('docs/HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION_ACCEPTANCE_0_1_0.md');
  const postHv2Decision = read('docs/POST_HV2_SEQUENCING_DECISION_0_1_0.md');
  const hv3Preregistration = read('docs/HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_PREREGISTRATION_0_1_0.md');
  const hv3Acceptance = read('docs/HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_ACCEPTANCE_0_1_0.md');
  const postHv3Decision = read('docs/POST_HV3_SEQUENCING_DECISION_0_1_0.md');
  const hv4Preregistration = read('docs/HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_PREREGISTRATION_0_1_0.md');
  const hv4Acceptance = read('docs/HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_ACCEPTANCE_0_1_0.md');
  const postHv4Reconciliation = read('docs/POST_HV4_LIVING_ROUTING_RECONCILIATION_0_1_0.md');
  const postHv4Decision = read('docs/POST_HV4_SEQUENCING_DECISION_0_1_0.md');
  const postHv4DecisionReconciliation = read('docs/POST_HV4_DECISION_ROUTING_RECONCILIATION_0_1_0.md');
  const hv5Preregistration = read('docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_0_1_0.md');
  const hv5PreregistrationAcceptance = read('docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_ACCEPTANCE_0_1_0.md');
  const hv5ImplementationAuthorization = read('docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_AUTHORIZATION_0_1_0.md');
  const hv5ImplementationRoutingReconciliation = read('docs/HV5_IMPLEMENTATION_AUTHORIZATION_ROUTING_RECONCILIATION_0_1_0.md');
  const hv5Implementation = read('docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_0_1_0.md');
  const hv5ImplementationReview = read('docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_REVIEW_0_1_0.md');
  const hv5Acceptance = read('docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md');
  const postHv5Reconciliation = read('docs/POST_HV5_LIVING_ROUTING_RECONCILIATION_0_1_0.md');
  const operations = read('docs/PRODUCTION_OPERATIONS.md');

  // Preserve the inherited exact release/runtime sources of truth.
  if (pkg.version !== PACKAGE_VERSION) throw new Error('package version source is inconsistent');
  if (lock.packages?.['']?.version !== PACKAGE_VERSION) {
    throw new Error('package-lock root version must match package.json');
  }
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
    requireMatch(
      source,
      new RegExp(`^HIVE_APP_TAG=${RELEASE_APP_TAG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'),
      `${name} must use the derived release app tag`,
    );
  }

  requireMatch(workflow, /uses:\s+actions\/checkout@[0-9a-f]{40}(?:\s+#.*)?$/m, 'checkout must be pinned by full commit SHA');
  requireMatch(workflow, /uses:\s+actions\/setup-node@[0-9a-f]{40}(?:\s+#.*)?$/m, 'setup-node must be pinned by full commit SHA');

  // Living successor truth after HV-5 acceptance.
  requireMatch(readme, /^# Hive-Venues$/m, 'README must identify the successor product as Hive-Venues');
  requireMatch(readme, /Node\.js\s+24\.19\.0/, 'README must state the pinned Node runtime');
  requireMatch(readme, /npm\s+11\.17\.0/, 'README must state the pinned npm runtime');
  requireMatch(readme, /Canonical source is the `main` branch of `etblink\/Hive-Venues`/, 'README must identify moving canonical source');
  requireMatch(readme, /The first five successor architecture milestones are accepted/i, 'README must identify five accepted successor milestones');
  requireMatch(readme, /HV-5 is canonically accepted/i, 'README must bind accepted HV-5');
  requireMatch(readme, /neutral Post-HV-5 sequencing boundary/i, 'README must identify the neutral post-HV-5 boundary');
  requireMatch(readme, /No post-HV-5 product lane has been selected/i, 'README must not preselect a post-HV-5 lane');
  requireMatch(readme, /platform does not currently require a universal venue-type taxonomy/i, 'README must preserve venue-type neutrality');
  requireMatch(readme, /GrapesJS remains an evaluation candidate until separately selected/i, 'README must keep GrapesJS non-authoritative');

  requireMatch(docsReadme, /^# Hive-Venues Documentation Index$/m, 'documentation index must identify Hive-Venues');
  requireMatch(docsReadme, /Canonical integrated source is `main` in `etblink\/Hive-Venues`/, 'documentation index must identify canonical source');
  for (const requiredName of [
    'HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION_ACCEPTANCE_0_1_0.md',
    'POST_HV2_SEQUENCING_DECISION_0_1_0.md',
    'HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_ACCEPTANCE_0_1_0.md',
    'POST_HV3_SEQUENCING_DECISION_0_1_0.md',
    'HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_ACCEPTANCE_0_1_0.md',
    'POST_HV4_SEQUENCING_DECISION_0_1_0.md',
    'HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_0_1_0.md',
    'HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_ACCEPTANCE_0_1_0.md',
    'HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_AUTHORIZATION_0_1_0.md',
    'HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_0_1_0.md',
    'HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_REVIEW_0_1_0.md',
    'HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md',
    'POST_HV5_LIVING_ROUTING_RECONCILIATION_0_1_0.md',
  ]) {
    requireMatch(docsReadme, new RegExp(requiredName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `documentation index must route to ${requiredName}`);
  }
  requireMatch(docsReadme, /historical Hive-Bar milestone evidence/i, 'documentation index must preserve historical Hive-Bar evidence as historical');
  requireMatch(docsReadme, /HV-1 through HV-5 are accepted/i, 'documentation index must bind accepted HV-5');
  requireMatch(docsReadme, /POST_HV5_SEQUENCING_DECISION = PENDING/, 'documentation index must preserve sequencing pending');
  requireMatch(docsReadme, /SELECTED_NEXT_LANE = NONE/, 'documentation index must remain lane-neutral');
  requireMatch(docsReadme, /NEXT_OPERATION = POST_HV5_SEQUENCING_DECISION__READ_ONLY/, 'documentation index must route current work to sequencing');
  requireMatch(docsReadme, /NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED/, 'documentation index must keep implementation unauthorized');

  requireMatch(roadmap, /^# Hive-Venues Living Roadmap$/m, 'roadmap must identify the successor roadmap');
  requireMatch(roadmap, /^REPOSITORY = etblink\/Hive-Venues$/m, 'roadmap must bind the successor repository');
  requireMatch(roadmap, /^HV1_VENUE_CONTEXT_FOUNDATION = ACCEPTED$/m, 'roadmap must bind accepted HV-1');
  requireMatch(roadmap, /^HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION = ACCEPTED$/m, 'roadmap must bind accepted HV-2');
  requireMatch(roadmap, /^HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION = ACCEPTED$/m, 'roadmap must bind accepted HV-3');
  requireMatch(roadmap, /^HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION = ACCEPTED$/m, 'roadmap must bind accepted HV-4');
  requireMatch(roadmap, /^HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION = ACCEPTED$/m, 'roadmap must bind accepted HV-5');
  requireMatch(roadmap, /^POST_HV3_SEQUENCING_DECISION = HISTORICAL_ACCEPTED__SUPERSEDED_FOR_CURRENT_ROUTING$/m, 'roadmap must preserve post-HV-3 historical routing');
  requireMatch(roadmap, /^POST_HV4_SEQUENCING_DECISION = HISTORICAL_ACCEPTED__SUPERSEDED_FOR_CURRENT_ROUTING$/m, 'roadmap must preserve post-HV-4 as historical');
  requireMatch(roadmap, /^POST_HV5_SEQUENCING_DECISION = PENDING$/m, 'roadmap must preserve post-HV-5 pending state');
  requireMatch(roadmap, /^SELECTED_NEXT_LANE = NONE$/m, 'roadmap must not preselect a lane');
  requireMatch(roadmap, /^PROPOSED_NEXT_MILESTONE = NONE$/m, 'roadmap must not preselect a milestone');
  requireMatch(roadmap, /^NEXT_OPERATION = POST_HV5_SEQUENCING_DECISION__READ_ONLY$/m, 'roadmap must route to post-HV-5 sequencing');
  requireMatch(roadmap, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'roadmap must keep substantive implementation unauthorized');
  requireMatch(roadmap, /^GRAPESJS = ELIGIBLE_POST_HV5_ADAPTER_CANDIDATE__NOT_SELECTED$/m, 'roadmap must keep GrapesJS unselected');
  requireMatch(roadmap, /^OPTIONAL_STARTER_ARCHETYPES = SUPPORTING_FIXTURES__NONAUTHORITATIVE$/m, 'roadmap must keep archetypes non-authoritative');
  requireMatch(roadmap, /^SECOND_REAL_VENUE = ELIGIBLE_FOR_FRESH_SEQUENCING_REASSESSMENT$/m, 'roadmap must recognize the completed one-gate prerequisite');
  requireMatch(roadmap, /^SECOND_REAL_VENUE_AUTHORIZED = NO$/m, 'roadmap must keep a real second venue unauthorized');
  requireMatch(roadmap, /^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m, 'roadmap must keep production mutation unauthorized');
  requireMatch(roadmap, /^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m, 'roadmap must keep shared-runtime tenancy deferred');
  requireMatch(roadmap, /^DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME$/m, 'roadmap must preserve isolated-runtime default');
  requireMatch(roadmap, /Current evidence still does \*\*not\*\* establish a canonical exhaustive venue taxonomy/i, 'roadmap must preserve venue-type neutrality');
  requireMatch(roadmap, /The last recorded accepted production transition in the inherited roadmap is M19\.2/, 'roadmap must preserve the historical M19.2 production boundary');

  // Accepted architecture decision remains authoritative for the isolated-runtime safety model.
  requireMatch(architectureDecision, /^STATUS = ACCEPTED_SUCCESSOR_ARCHITECTURE_DECISION$/m, 'architecture decision must remain accepted');
  requireMatch(architectureDecision, /^SHARED_RUNTIME_MULTI_TENANCY_AUTHORIZED = NO$/m, 'architecture decision must keep shared-runtime tenancy unauthorized');
  requireMatch(architectureDecision, /^LIVE_PRODUCTION_MUTATION_AUTHORIZED = NO$/m, 'architecture decision must keep production mutation unauthorized');
  requireMatch(architectureDecision, /HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION/, 'architecture decision must preserve its historical HV-2 sequencing rationale');

  // Preserve key historical HV-2 prospective/acceptance/routing bindings.
  requireMatch(hv2Preregistration, /^OPERATION = HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION$/m, 'HV-2 preregistration must bind the intended operation');
  requireMatch(hv2Preregistration, /^STATUS = FROZEN_PREREGISTRATION__IMPLEMENTATION_NOT_STARTED$/m, 'HV-2 preregistration must remain frozen prospective evidence');
  requireMatch(hv2Preregistration, /^LIVE_PRODUCTION_MUTATION = FORBIDDEN$/m, 'HV-2 preregistration must keep live production mutation forbidden');
  requireMatch(hv2Acceptance, /^OPERATION = HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION$/m, 'HV-2 acceptance must bind the operation');
  requireMatch(hv2Acceptance, /^STATUS = ACCEPTED$/m, 'HV-2 acceptance must remain accepted');
  requireMatch(hv2Acceptance, /^EXPECTED_CANONICAL_PARENT = 0bfa6753f08c87242ffbf9c9cc7a059c7e71a497$/m, 'HV-2 acceptance must bind its canonical parent');
  requireMatch(hv2Acceptance, /^IMPLEMENTATION_COMMIT = 1b7549b31bd8692497061eaacfdcbc39a91b8a20$/m, 'HV-2 acceptance must bind its clean implementation');
  requireMatch(hv2Acceptance, /^IMPLEMENTATION_TREE = 64bc51e164b7fdc4218d8928897627dfc7602028$/m, 'HV-2 acceptance must bind its tree');
  requireMatch(hv2Acceptance, /^LIVE_PRODUCTION_MUTATION = NO$/m, 'HV-2 acceptance must preserve no live mutation');
  requireMatch(postHv2Decision, /^SELECTED_NEXT_LANE = VENUE_PACKAGING$/m, 'post-HV-2 decision must preserve its historical selection');
  requireMatch(postHv2Decision, /^NEXT_OPERATION = HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_PREREGISTRATION$/m, 'post-HV-2 decision must preserve historical routing');
  requireMatch(postHv2Decision, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'post-HV-2 decision must preserve its non-authorization boundary');

  // Preserve key historical HV-3 prospective/acceptance/routing bindings.
  requireMatch(hv3Preregistration, /^OPERATION = HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION$/m, 'HV-3 preregistration must bind HV-3');
  requireMatch(hv3Preregistration, /^STATUS = FROZEN_PREREGISTRATION__IMPLEMENTATION_NOT_STARTED$/m, 'HV-3 preregistration must remain frozen prospective evidence');
  requireMatch(hv3Preregistration, /^LIVE_SUCCESSOR_PRODUCTION_MUTATION = FORBIDDEN$/m, 'HV-3 preregistration must keep production mutation forbidden');
  requireMatch(hv3Acceptance, /^STATUS = ACCEPTED$/m, 'HV-3 acceptance must remain accepted');
  requireMatch(hv3Acceptance, /^IMPLEMENTATION_COMMIT = 291b93c696c6265c2da4ad5caaaaee9701cb69a8$/m, 'HV-3 acceptance must bind its clean implementation');
  requireMatch(hv3Acceptance, /^IMPLEMENTATION_TREE = b39401e8154545bec2e6704455b53c3b8938b5b6$/m, 'HV-3 acceptance must bind its tree');
  requireMatch(hv3Acceptance, /^QUALIFICATION_PR = 14$/m, 'HV-3 acceptance must bind qualification PR');
  requireMatch(hv3Acceptance, /^QUALIFICATION_CI_RUN = 33327969282$/m, 'HV-3 acceptance must bind qualification CI');
  requireMatch(hv3Acceptance, /^CONSOLIDATED_RENDERED_GATE = PASS$/m, 'HV-3 acceptance must preserve rendered qualification');
  requireMatch(postHv3Decision, /^SELECTED_NEXT_LANE = ISOLATED_VENUE_BOOTSTRAP_AND_SUCCESSOR_DX$/m, 'post-HV-3 decision must preserve its historical selection');
  requireMatch(postHv3Decision, /^NEXT_OPERATION = HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_PREREGISTRATION$/m, 'post-HV-3 decision must preserve historical routing');
  requireMatch(postHv3Decision, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'post-HV-3 decision must preserve historical non-authorization');

  // Preserve HV-4 prospective, accepted implementation, neutral reconciliation, and historical selection of HV-5.
  requireMatch(hv4Preregistration, /^OPERATION = HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION$/m, 'HV-4 preregistration must bind HV-4');
  requireMatch(hv4Preregistration, /^STATUS = FROZEN_PREREGISTRATION__IMPLEMENTATION_NOT_STARTED$/m, 'HV-4 preregistration must remain frozen prospective evidence');
  requireMatch(hv4Preregistration, /^MANDATORY_VENUE_TYPE_ENUM = FORBIDDEN_WITHOUT_NEW_PRODUCT_EVIDENCE$/m, 'HV-4 preregistration must preserve venue neutrality');
  requireMatch(hv4Acceptance, /^STATUS = PROJECT_LEAD_ACCEPTED$/m, 'HV-4 acceptance must remain Project Lead accepted');
  requireMatch(hv4Acceptance, /^ACCEPTED_IMPLEMENTATION_COMMIT = c59f6aac948e5be59647694b3b60310d2b8faa30$/m, 'HV-4 acceptance must bind clean implementation');
  requireMatch(hv4Acceptance, /^ACCEPTED_IMPLEMENTATION_TREE = dd74fa3944b348d86e9bef7c827a13cb8ab21ee2$/m, 'HV-4 acceptance must bind implementation tree');
  requireMatch(hv4Acceptance, /^QUALIFICATION_CI_RUN = 33334114135$/m, 'HV-4 acceptance must bind qualification CI');
  requireMatch(postHv4Reconciliation, /^SELECTED_NEXT_LANE = NONE$/m, 'post-HV-4 neutral reconciliation must preserve its historical neutral boundary');
  requireMatch(postHv4Reconciliation, /^NEXT_OPERATION = POST_HV4_SEQUENCING_DECISION__READ_ONLY$/m, 'post-HV-4 reconciliation must preserve historical routing');
  requireMatch(postHv4Decision, /^STATUS = FROZEN_PROJECT_LEAD_SEQUENCING_DECISION$/m, 'post-HV-4 decision must remain frozen');
  requireMatch(postHv4Decision, /^SELECTED_NEXT_LANE = CANONICAL_VENUE_AUTHORING_CONTRACT$/m, 'post-HV-4 decision must preserve selection of HV-5 lane');
  requireMatch(postHv4Decision, /^PROPOSED_MILESTONE = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION$/m, 'post-HV-4 decision must preserve proposed HV-5');
  requireMatch(postHv4Decision, /^NEXT_OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION$/m, 'post-HV-4 decision must preserve historical routing');
  requireMatch(postHv4DecisionReconciliation, /^SELECTED_NEXT_LANE = CANONICAL_VENUE_AUTHORING_CONTRACT$/m, 'post-HV-4 decision reconciliation must preserve selected lane');
  requireMatch(postHv4DecisionReconciliation, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'post-HV-4 decision reconciliation must preserve historical non-authorization');

  // Bind the complete HV-5 governance and implementation chain.
  requireMatch(hv5Preregistration, /^OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION$/m, 'HV-5 preregistration must bind HV-5');
  requireMatch(hv5Preregistration, /^STATUS = FROZEN_PREREGISTRATION__IMPLEMENTATION_NOT_STARTED$/m, 'HV-5 preregistration must remain frozen prospective evidence');
  requireMatch(hv5Preregistration, /^IMPLEMENTATION_AUTHORIZED_BY_THIS_FILE_ALONE = NO$/m, 'HV-5 preregistration must preserve its own non-authorization');
  requireMatch(hv5Preregistration, /^GRAPESJS_CORE = POST_HV5_ADAPTER_CANDIDATE__NOT_HV5_CORE_DEPENDENCY$/m, 'HV-5 preregistration must keep GrapesJS outside core');
  requireMatch(hv5Preregistration, /^SECOND_REAL_VENUE_AUTHORIZED = NO$/m, 'HV-5 preregistration must keep real second venue unauthorized');
  requireMatch(hv5PreregistrationAcceptance, /^STATUS = PROJECT_LEAD_ACCEPTED$/m, 'HV-5 preregistration acceptance must remain accepted');
  requireMatch(hv5PreregistrationAcceptance, /^CANONICAL_PREREGISTRATION_COMMIT = f54a2a198ca5f9c37d5d78f6f97d06211a5d2869$/m, 'HV-5 preregistration acceptance must bind exact commit');
  requireMatch(hv5PreregistrationAcceptance, /^CANONICAL_PREREGISTRATION_TREE = 74e7a4c76dc00f208bc24eef464fb8c104ff87ba$/m, 'HV-5 preregistration acceptance must bind exact tree');
  requireMatch(hv5PreregistrationAcceptance, /^HV5_IMPLEMENTATION_AUTHORIZED_BY_THIS_ACCEPTANCE = NO$/m, 'HV-5 prereg acceptance must not itself authorize implementation');
  requireMatch(hv5ImplementationAuthorization, /^STATUS = PROJECT_LEAD_IMPLEMENTATION_AUTHORIZATION$/m, 'HV-5 implementation authorization must remain explicit');
  requireMatch(hv5ImplementationAuthorization, /^AUTHORIZED_CANONICAL_BASE_COMMIT = 57f6292f411c5fae656e0b097ef0e75f1eff30e7$/m, 'HV-5 authorization must bind accepted base');
  requireMatch(hv5ImplementationAuthorization, /^HV5_IMPLEMENTATION_AUTHORIZED = YES$/m, 'HV-5 authorization must preserve historical authorization');
  requireMatch(hv5ImplementationAuthorization, /^BROWSER_WYSIWYG_EDITOR = NOT_AUTHORIZED$/m, 'HV-5 authorization must have kept WYSIWYG outside scope');
  requireMatch(hv5ImplementationRoutingReconciliation, /^HV5_IMPLEMENTATION = AUTHORIZED__NOT_YET_ACCEPTED$/m, 'pre-implementation reconciliation must preserve its historical state');
  requireMatch(hv5ImplementationRoutingReconciliation, /^NEW_SUBSTANTIVE_IMPLEMENTATION_IN_THIS_RECONCILIATION = NO$/m, 'pre-implementation reconciliation must remain maintenance only');

  requireMatch(hv5Implementation, /^OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION$/m, 'HV-5 implementation guide must bind HV-5');
  requireMatch(hv5Implementation, /^DOCUMENT_ROLE = IMPLEMENTATION_CONTRACT_AND_OPERATOR_GUIDE$/m, 'HV-5 implementation guide must have a durable role');
  requireMatch(hv5ImplementationReview, /^PROJECT_LEAD_IMPLEMENTATION_REVIEW = PASS$/m, 'HV-5 implementation review must record PASS');
  requireMatch(hv5ImplementationReview, /^REVIEWED_IMPLEMENTATION_HEAD = 0cdb7277f34ff3832aca29c19f489776c11f2f00$/m, 'HV-5 review must bind reviewed implementation head');
  requireMatch(hv5ImplementationReview, /^REVIEWED_QUALIFICATION_RUN = 33339236850$/m, 'HV-5 review must preserve pre-review qualification evidence');

  requireMatch(hv5Acceptance, /^OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION$/m, 'HV-5 acceptance must bind HV-5');
  requireMatch(hv5Acceptance, /^STATUS = PROJECT_LEAD_ACCEPTED$/m, 'HV-5 acceptance must record Project Lead acceptance');
  requireMatch(hv5Acceptance, /^QUALIFICATION_PR = 31$/m, 'HV-5 acceptance must bind qualification PR');
  requireMatch(hv5Acceptance, /^QUALIFICATION_CI_RUN = 33339685417$/m, 'HV-5 acceptance must bind final implementation CI');
  requireMatch(hv5Acceptance, /^ACCEPTED_IMPLEMENTATION_COMMIT = 932bb2fe109acfca9cb4ab0514dabc7553edf764$/m, 'HV-5 acceptance must bind clean implementation commit');
  requireMatch(hv5Acceptance, /^ACCEPTED_IMPLEMENTATION_TREE = aeaddf2bda5bdc89997caeaa8e4e472839ae8b10$/m, 'HV-5 acceptance must bind clean implementation tree');
  requireMatch(hv5Acceptance, /^HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION = ACCEPTED$/m, 'HV-5 acceptance must accept the milestone');
  requireMatch(hv5Acceptance, /^NEXT_OPERATION_AFTER_ACCEPTANCE = POST_HV5_LIVING_ROUTING_RECONCILIATION$/m, 'HV-5 acceptance must route first to neutral reconciliation');
  requireMatch(hv5Acceptance, /^NEXT_SUBSTANTIVE_IMPLEMENTATION_AUTHORIZED = NO$/m, 'HV-5 acceptance must not authorize a later lane');

  requireMatch(postHv5Reconciliation, /^OPERATION = POST_HV5_LIVING_ROUTING_RECONCILIATION$/m, 'post-HV-5 reconciliation must bind its operation');
  requireMatch(postHv5Reconciliation, /^ROLE = BOUNDED_MAINTENANCE_AND_NAVIGATION_RECONCILIATION$/m, 'post-HV-5 reconciliation must remain maintenance');
  requireMatch(postHv5Reconciliation, /^SCIENTIFIC_OR_PRODUCT_LANE_SELECTION = NO$/m, 'post-HV-5 reconciliation must not select a lane');
  requireMatch(postHv5Reconciliation, /^NEW_SUBSTANTIVE_IMPLEMENTATION = NO$/m, 'post-HV-5 reconciliation must not implement a lane');
  requireMatch(postHv5Reconciliation, /^PRODUCTION_MUTATION = NO$/m, 'post-HV-5 reconciliation must not mutate production');
  requireMatch(postHv5Reconciliation, /^POST_HV5_SEQUENCING_DECISION = PENDING$/m, 'post-HV-5 reconciliation must preserve pending sequencing');
  requireMatch(postHv5Reconciliation, /^SELECTED_NEXT_LANE = NONE$/m, 'post-HV-5 reconciliation must be lane-neutral');
  requireMatch(postHv5Reconciliation, /^NEXT_OPERATION = POST_HV5_SEQUENCING_DECISION__READ_ONLY$/m, 'post-HV-5 reconciliation must route to sequencing');
  requireMatch(postHv5Reconciliation, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'post-HV-5 reconciliation must preserve non-authorization');
  requireMatch(postHv5Reconciliation, /^SECOND_REAL_VENUE_AUTHORIZED = NO$/m, 'post-HV-5 reconciliation must keep a real second venue unauthorized');

  // Preserve production and inherited runtime safety irrespective of successor source progress.
  requireMatch(operations, /Runtime source identity: `\/healthz` publishes the exact deployed beta build label, commit, and tree/, 'operations must define runtime source identity through healthz');
  requireMatch(operations, /last-good.*M17\.3/i, 'operations must retain M17.3 as the last-good boundary');
  requireMatch(operations, /in-person onboarding: not production-activated/, 'operations must distinguish onboarding source capability from production activation');
  requireMatch(operations, /Production remains beta until a separately authorized transition/, 'operations must preserve beta-until-authorized semantics');

  if (/Canonical `main` and production are aligned on accepted M19\.1/.test(readme + docsReadme + roadmap)) {
    throw new Error('living documentation must not pin moving main to historical M19.1 production');
  }
  if (/\bMIT License\b/i.test(readme)) {
    throw new Error('README must not claim an open-source license that the repository does not provide');
  }

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
    'docs/HIVE_VENUES_SUCCESSOR_BASELINE_0_1_0.md',
    'docs/HV1_VENUE_CONTEXT_FOUNDATION_PREREGISTRATION_0_1_0.md',
    'docs/HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md',
    'docs/HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION_PREREGISTRATION_0_1_0.md',
    'docs/HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION_ACCEPTANCE_0_1_0.md',
    'docs/POST_HV2_SEQUENCING_DECISION_0_1_0.md',
    'docs/HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_PREREGISTRATION_0_1_0.md',
    'docs/HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_ACCEPTANCE_0_1_0.md',
    'docs/POST_HV3_SEQUENCING_DECISION_0_1_0.md',
    'docs/HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_PREREGISTRATION_0_1_0.md',
    'docs/HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_ACCEPTANCE_0_1_0.md',
    'docs/POST_HV4_LIVING_ROUTING_RECONCILIATION_0_1_0.md',
    'docs/POST_HV4_SEQUENCING_DECISION_0_1_0.md',
    'docs/POST_HV4_DECISION_ROUTING_RECONCILIATION_0_1_0.md',
    'docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_0_1_0.md',
    'docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_ACCEPTANCE_0_1_0.md',
    'docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_AUTHORIZATION_0_1_0.md',
    'docs/HV5_IMPLEMENTATION_AUTHORIZATION_ROUTING_RECONCILIATION_0_1_0.md',
    'docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_0_1_0.md',
    'docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_REVIEW_0_1_0.md',
    'docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md',
    'docs/POST_HV5_LIVING_ROUTING_RECONCILIATION_0_1_0.md',
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
    acceptedSuccessorMilestones: 5,
    nextOperation: 'POST_HV5_SEQUENCING_DECISION__READ_ONLY',
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
