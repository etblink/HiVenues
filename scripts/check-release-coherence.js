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
  const operations = read('docs/PRODUCTION_OPERATIONS.md');

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

  requireMatch(readme, /^# Hive-Venues$/m, 'README must identify the successor product as Hive-Venues');
  requireMatch(readme, /Node\.js\s+24\.19\.0/, 'README must state the pinned Node runtime');
  requireMatch(readme, /npm\s+11\.17\.0/, 'README must state the pinned npm runtime');
  requireMatch(readme, /Canonical source is the `main` branch of `etblink\/Hive-Venues`/, 'README must identify moving canonical source');
  requireMatch(readme, /HV-3 — Reference Venue Package Extraction/i, 'README must identify accepted HV-3');
  requireMatch(readme, /HV-4 — Isolated Venue Bootstrap Foundation/i, 'README must identify accepted HV-4');
  requireMatch(readme, /accepted \*\*Post-HV-4 Sequencing Decision\*\* selects the canonical venue-authoring contract/i, 'README must identify the accepted post-HV-4 lane');
  requireMatch(readme, /next bounded operation is \*\*HV-5 Venue Authoring Contract Foundation Preregistration\*\*/i, 'README must route to HV-5 preregistration');
  requireMatch(readme, /HV-5 implementation is not yet authorized/i, 'README must preserve the HV-5 non-authorization boundary');
  requireMatch(readme, /platform does not currently require a universal venue-type taxonomy/i, 'README must preserve venue-type neutrality');
  requireMatch(readme, /GrapesJS is an explicit evaluation candidate.*not a selected dependency/i, 'README must keep GrapesJS non-authoritative');

  requireMatch(docsReadme, /^# Hive-Venues Documentation Index$/m, 'documentation index must identify Hive-Venues');
  requireMatch(docsReadme, /Canonical integrated source is `main` in `etblink\/Hive-Venues`/, 'documentation index must identify canonical source');
  for (const requiredName of [
    'HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION_ACCEPTANCE_0_1_0.md',
    'POST_HV2_SEQUENCING_DECISION_0_1_0.md',
    'HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_ACCEPTANCE_0_1_0.md',
    'POST_HV3_SEQUENCING_DECISION_0_1_0.md',
    'HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_PREREGISTRATION_0_1_0.md',
    'HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_ACCEPTANCE_0_1_0.md',
    'POST_HV4_SEQUENCING_DECISION_0_1_0.md',
  ]) {
    requireMatch(docsReadme, new RegExp(requiredName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `documentation index must route to ${requiredName}`);
  }
  requireMatch(docsReadme, /historical Hive-Bar milestone evidence/i, 'documentation index must preserve historical Hive-Bar evidence as historical');
  requireMatch(docsReadme, /NEXT_OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION/, 'documentation index must route current work to HV-5 preregistration');
  requireMatch(docsReadme, /NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED/, 'documentation index must preserve HV-5 non-authorization');
  requireMatch(docsReadme, /GrapesJS is an evaluation candidate.*not a selected dependency/i, 'documentation index must keep GrapesJS non-authoritative');

  requireMatch(roadmap, /^# Hive-Venues Living Roadmap$/m, 'roadmap must identify the successor roadmap');
  requireMatch(roadmap, /^REPOSITORY = etblink\/Hive-Venues$/m, 'roadmap must bind the successor repository');
  requireMatch(roadmap, /^HV1_VENUE_CONTEXT_FOUNDATION = ACCEPTED$/m, 'roadmap must bind accepted HV-1');
  requireMatch(roadmap, /^HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION = ACCEPTED$/m, 'roadmap must bind accepted HV-2');
  requireMatch(roadmap, /^HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION = ACCEPTED$/m, 'roadmap must bind accepted HV-3');
  requireMatch(roadmap, /^HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION = ACCEPTED$/m, 'roadmap must bind accepted HV-4');
  requireMatch(roadmap, /^POST_HV3_SEQUENCING_DECISION = HISTORICAL_ACCEPTED__SUPERSEDED_FOR_CURRENT_ROUTING$/m, 'roadmap must preserve post-HV-3 as historical current-routing predecessor');
  requireMatch(roadmap, /^POST_HV4_SEQUENCING_DECISION = ACCEPTED$/m, 'roadmap must bind accepted post-HV-4 sequencing');
  requireMatch(roadmap, /^SELECTED_NEXT_LANE = CANONICAL_VENUE_AUTHORING_CONTRACT$/m, 'roadmap must bind the selected post-HV-4 lane');
  requireMatch(roadmap, /^PROPOSED_MILESTONE = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION$/m, 'roadmap must identify proposed HV-5');
  requireMatch(roadmap, /^NEXT_OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION$/m, 'roadmap must route to HV-5 preregistration');
  requireMatch(roadmap, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'roadmap must keep substantive implementation unauthorized');
  requireMatch(roadmap, /^GRAPESJS = EVALUATION_CANDIDATE__NOT_SELECTED_DEPENDENCY$/m, 'roadmap must keep GrapesJS non-authoritative');
  requireMatch(roadmap, /^OPTIONAL_STARTER_ARCHETYPES = SUPPORTING_FIXTURES__NONAUTHORITATIVE$/m, 'roadmap must keep starter archetypes non-authoritative');
  requireMatch(roadmap, /^SECOND_REAL_VENUE = DEFERRED_ONE_GATE$/m, 'roadmap must preserve the one-gate real-pilot deferral');
  requireMatch(roadmap, /^SECOND_REAL_VENUE_AUTHORIZED = NO$/m, 'roadmap must keep a real second venue unauthorized');
  requireMatch(roadmap, /^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m, 'roadmap must keep production mutation unauthorized');
  requireMatch(roadmap, /^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m, 'roadmap must keep shared-runtime tenancy deferred');
  requireMatch(roadmap, /^DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME$/m, 'roadmap must preserve isolated-runtime default');
  requireMatch(roadmap, /The last recorded accepted production transition in the inherited roadmap is M19\.2/, 'roadmap must preserve the historical M19.2 production boundary');
  requireMatch(roadmap, /platform core remains venue-type neutral/i, 'roadmap must state venue-type-neutral platform semantics');

  requireMatch(architectureDecision, /^STATUS = ACCEPTED_SUCCESSOR_ARCHITECTURE_DECISION$/m, 'architecture decision must remain accepted');
  requireMatch(architectureDecision, /^SHARED_RUNTIME_MULTI_TENANCY_AUTHORIZED = NO$/m, 'architecture decision must keep shared-runtime tenancy unauthorized');
  requireMatch(architectureDecision, /^LIVE_PRODUCTION_MUTATION_AUTHORIZED = NO$/m, 'architecture decision must keep production mutation unauthorized');
  requireMatch(architectureDecision, /HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION/, 'architecture decision must preserve its historical HV-2 sequencing rationale');

  // Preserve the full historical HV-2 contract/acceptance/routing integrity checks.
  requireMatch(hv2Preregistration, /^OPERATION = HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION$/m, 'HV-2 preregistration must bind the intended operation');
  requireMatch(hv2Preregistration, /^STATUS = FROZEN_PREREGISTRATION__IMPLEMENTATION_NOT_STARTED$/m, 'HV-2 preregistration must remain the frozen prospective contract');
  requireMatch(hv2Preregistration, /^LIVE_PRODUCTION_MUTATION = FORBIDDEN$/m, 'HV-2 preregistration must keep live production mutation forbidden');

  requireMatch(hv2Acceptance, /^OPERATION = HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION$/m, 'HV-2 acceptance must bind the operation');
  requireMatch(hv2Acceptance, /^STATUS = ACCEPTED$/m, 'HV-2 acceptance must record accepted status');
  requireMatch(hv2Acceptance, /^CANONICAL_INTEGRATION_AUTHORIZED = YES$/m, 'HV-2 acceptance must authorize canonical integration');
  requireMatch(hv2Acceptance, /^EXPECTED_CANONICAL_PARENT = 0bfa6753f08c87242ffbf9c9cc7a059c7e71a497$/m, 'HV-2 acceptance must bind the exact canonical parent');
  requireMatch(hv2Acceptance, /^IMPLEMENTATION_COMMIT = 1b7549b31bd8692497061eaacfdcbc39a91b8a20$/m, 'HV-2 acceptance must bind the clean implementation commit');
  requireMatch(hv2Acceptance, /^IMPLEMENTATION_TREE = 64bc51e164b7fdc4218d8928897627dfc7602028$/m, 'HV-2 acceptance must bind the clean implementation tree');
  requireMatch(hv2Acceptance, /^LIVE_PRODUCTION_MUTATION = NO$/m, 'HV-2 acceptance must record no live production mutation');
  requireMatch(hv2Acceptance, /^COVERAGE_NO_MATERIAL_REGRESSION = PASS$/m, 'HV-2 acceptance must record the coverage gate');
  requireMatch(hv2Acceptance, /^NEXT_OPERATION_AFTER_INTEGRATION = POST_HV2_SEQUENCING_DECISION$/m, 'HV-2 acceptance must preserve its historical route to post-HV-2 sequencing');
  requireMatch(hv2Acceptance, /^NEXT_SUBSTANTIVE_IMPLEMENTATION_AUTHORIZED = NO$/m, 'HV-2 acceptance must not pre-authorize successor implementation');

  requireMatch(postHv2Decision, /^OPERATION = POST_HV2_SEQUENCING_DECISION$/m, 'post-HV-2 decision must bind its operation');
  requireMatch(postHv2Decision, /^STATUS = FROZEN_PROJECT_LEAD_SEQUENCING_DECISION$/m, 'post-HV-2 decision must remain frozen historical evidence');
  requireMatch(postHv2Decision, /^SELECTED_NEXT_LANE = VENUE_PACKAGING$/m, 'post-HV-2 decision must preserve its selected lane');
  requireMatch(postHv2Decision, /^NEXT_OPERATION = HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_PREREGISTRATION$/m, 'post-HV-2 historical routing must remain intact');
  requireMatch(postHv2Decision, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'post-HV-2 decision must preserve its non-authorization boundary');
  requireMatch(postHv2Decision, /^SECOND_REAL_VENUE_AUTHORIZED = NO$/m, 'post-HV-2 decision must preserve its second-venue boundary');
  requireMatch(postHv2Decision, /^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m, 'post-HV-2 decision must preserve its tenancy boundary');

  // Preserve the full historical HV-3 contract/acceptance/routing integrity checks.
  requireMatch(hv3Preregistration, /^OPERATION = HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION$/m, 'HV-3 preregistration must bind HV-3');
  requireMatch(hv3Preregistration, /^STATUS = FROZEN_PREREGISTRATION__IMPLEMENTATION_NOT_STARTED$/m, 'HV-3 preregistration must remain frozen prospective evidence');
  requireMatch(hv3Preregistration, /^LIVE_SUCCESSOR_PRODUCTION_MUTATION = FORBIDDEN$/m, 'HV-3 preregistration must keep production mutation forbidden');
  requireMatch(hv3Preregistration, /^SECOND_REAL_VENUE_AUTHORIZED = NO$/m, 'HV-3 preregistration must keep real second venue unauthorized');
  requireMatch(hv3Preregistration, /^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m, 'HV-3 preregistration must preserve isolated-runtime routing');

  requireMatch(hv3Acceptance, /^OPERATION = HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION$/m, 'HV-3 acceptance must bind the operation');
  requireMatch(hv3Acceptance, /^STATUS = ACCEPTED$/m, 'HV-3 acceptance must be accepted');
  requireMatch(hv3Acceptance, /^EXPECTED_CANONICAL_PARENT = b5901cf6f4a603df11eca5c942d63caad5f009a8$/m, 'HV-3 acceptance must bind its canonical parent');
  requireMatch(hv3Acceptance, /^IMPLEMENTATION_COMMIT = 291b93c696c6265c2da4ad5caaaaee9701cb69a8$/m, 'HV-3 acceptance must bind the clean implementation commit');
  requireMatch(hv3Acceptance, /^IMPLEMENTATION_TREE = b39401e8154545bec2e6704455b53c3b8938b5b6$/m, 'HV-3 acceptance must bind the clean implementation tree');
  requireMatch(hv3Acceptance, /^QUALIFICATION_PR = 14$/m, 'HV-3 acceptance must bind qualification PR');
  requireMatch(hv3Acceptance, /^QUALIFICATION_CI_RUN = 33327969282$/m, 'HV-3 acceptance must bind qualification CI');
  requireMatch(hv3Acceptance, /^UBUNTU_DETERMINISTIC_GATE = PASS$/m, 'HV-3 acceptance must preserve Ubuntu qualification');
  requireMatch(hv3Acceptance, /^WINDOWS_DETERMINISTIC_GATE = PASS$/m, 'HV-3 acceptance must preserve Windows qualification');
  requireMatch(hv3Acceptance, /^CONSOLIDATED_RENDERED_GATE = PASS$/m, 'HV-3 acceptance must preserve rendered qualification');
  requireMatch(hv3Acceptance, /^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NO$/m, 'HV-3 acceptance must record no live production mutation');
  requireMatch(hv3Acceptance, /^SECOND_REAL_VENUE_ADMITTED = NO$/m, 'HV-3 acceptance must record no real second venue');
  requireMatch(hv3Acceptance, /^SHARED_RUNTIME_MULTI_TENANCY = NO$/m, 'HV-3 acceptance must record no shared tenancy');
  requireMatch(hv3Acceptance, /^NEXT_OPERATION_AFTER_ACCEPTANCE = POST_HV3_SEQUENCING_DECISION$/m, 'HV-3 acceptance must preserve its post-acceptance boundary');
  requireMatch(hv3Acceptance, /^NEXT_SUBSTANTIVE_IMPLEMENTATION_AUTHORIZED = NO$/m, 'HV-3 acceptance must preserve its non-authorization boundary');

  requireMatch(postHv3Decision, /^OPERATION = POST_HV3_SEQUENCING_DECISION$/m, 'post-HV-3 decision must bind its operation');
  requireMatch(postHv3Decision, /^STATUS = FROZEN_PROJECT_LEAD_SEQUENCING_DECISION$/m, 'post-HV-3 decision must be frozen');
  requireMatch(postHv3Decision, /^SELECTED_NEXT_LANE = ISOLATED_VENUE_BOOTSTRAP_AND_SUCCESSOR_DX$/m, 'post-HV-3 decision must select bootstrap/DX');
  requireMatch(postHv3Decision, /^NEXT_OPERATION = HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_PREREGISTRATION$/m, 'post-HV-3 decision must route to HV-4 preregistration');
  requireMatch(postHv3Decision, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'post-HV-3 decision must not pre-authorize implementation');
  requireMatch(postHv3Decision, /^SECOND_REAL_VENUE_AUTHORIZED = NO$/m, 'post-HV-3 decision must keep a real second venue unauthorized');
  requireMatch(postHv3Decision, /^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m, 'post-HV-3 decision must keep production mutation unauthorized');
  requireMatch(postHv3Decision, /^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m, 'post-HV-3 decision must keep shared-runtime tenancy deferred');

  // Bind the frozen HV-4 prospective contract, accepted result, and neutral post-acceptance reconciliation.
  requireMatch(hv4Preregistration, /^OPERATION = HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION$/m, 'HV-4 preregistration must bind HV-4');
  requireMatch(hv4Preregistration, /^STATUS = FROZEN_PREREGISTRATION__IMPLEMENTATION_NOT_STARTED$/m, 'HV-4 preregistration must remain frozen prospective evidence');
  requireMatch(hv4Preregistration, /^IMPLEMENTATION_AUTHORIZED_BY_THIS_FILE_ALONE = NO$/m, 'HV-4 preregistration must preserve its non-authorization boundary');
  requireMatch(hv4Preregistration, /^SECOND_REAL_VENUE_AUTHORIZED = NO$/m, 'HV-4 preregistration must keep a real second venue unauthorized');
  requireMatch(hv4Preregistration, /^LIVE_SUCCESSOR_PRODUCTION_MUTATION = FORBIDDEN$/m, 'HV-4 preregistration must keep production mutation forbidden');
  requireMatch(hv4Preregistration, /^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m, 'HV-4 preregistration must preserve isolated-runtime routing');
  requireMatch(hv4Preregistration, /^MANDATORY_VENUE_TYPE_ENUM = FORBIDDEN_WITHOUT_NEW_PRODUCT_EVIDENCE$/m, 'HV-4 preregistration must preserve venue-type neutrality');

  requireMatch(hv4Acceptance, /^OPERATION = HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION$/m, 'HV-4 acceptance must bind the operation');
  requireMatch(hv4Acceptance, /^STATUS = PROJECT_LEAD_ACCEPTED$/m, 'HV-4 acceptance must record Project Lead acceptance');
  requireMatch(hv4Acceptance, /^ACCEPTED_IMPLEMENTATION_COMMIT = c59f6aac948e5be59647694b3b60310d2b8faa30$/m, 'HV-4 acceptance must bind the clean implementation commit');
  requireMatch(hv4Acceptance, /^ACCEPTED_IMPLEMENTATION_TREE = dd74fa3944b348d86e9bef7c827a13cb8ab21ee2$/m, 'HV-4 acceptance must bind the qualified implementation tree');
  requireMatch(hv4Acceptance, /^QUALIFICATION_PR = 22$/m, 'HV-4 acceptance must bind qualification PR');
  requireMatch(hv4Acceptance, /^QUALIFICATION_CI_RUN = 33334114135$/m, 'HV-4 acceptance must bind qualification CI');
  requireMatch(hv4Acceptance, /^SECOND_REAL_VENUE_ADMITTED = NO$/m, 'HV-4 acceptance must record no real second venue');
  requireMatch(hv4Acceptance, /^PRODUCTION_MUTATION = NO$/m, 'HV-4 acceptance must record no production mutation');
  requireMatch(hv4Acceptance, /^SHARED_RUNTIME_MULTI_TENANCY = NO$/m, 'HV-4 acceptance must record no shared-runtime tenancy');

  requireMatch(postHv4Reconciliation, /^OPERATION = POST_HV4_LIVING_ROUTING_RECONCILIATION$/m, 'post-HV-4 reconciliation must bind its operation');
  requireMatch(postHv4Reconciliation, /^ROLE = BOUNDED_MAINTENANCE_AND_NAVIGATION_RECONCILIATION$/m, 'post-HV-4 reconciliation must remain bounded maintenance');
  requireMatch(postHv4Reconciliation, /^SCIENTIFIC_OR_PRODUCT_LANE_SELECTION = NO$/m, 'post-HV-4 reconciliation must not select a product lane');
  requireMatch(postHv4Reconciliation, /^NEW_SUBSTANTIVE_IMPLEMENTATION = NO$/m, 'post-HV-4 reconciliation must not implement a new lane');
  requireMatch(postHv4Reconciliation, /^PRODUCTION_MUTATION = NO$/m, 'post-HV-4 reconciliation must not mutate production');
  requireMatch(postHv4Reconciliation, /^SELECTED_NEXT_LANE = NONE$/m, 'post-HV-4 reconciliation must preserve the neutral sequencing boundary it recorded at the time');
  requireMatch(postHv4Reconciliation, /^NEXT_OPERATION = POST_HV4_SEQUENCING_DECISION__READ_ONLY$/m, 'post-HV-4 reconciliation must preserve its historical route to read-only sequencing');
  requireMatch(postHv4Reconciliation, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'post-HV-4 reconciliation must keep its historical substantive non-authorization');

  // Bind the accepted Post-HV-4 sequencing decision without rewriting the earlier neutral reconciliation.
  requireMatch(postHv4Decision, /^OPERATION = POST_HV4_SEQUENCING_DECISION$/m, 'post-HV-4 decision must bind its operation');
  requireMatch(postHv4Decision, /^STATUS = FROZEN_PROJECT_LEAD_SEQUENCING_DECISION$/m, 'post-HV-4 decision must remain frozen');
  requireMatch(postHv4Decision, /^SELECTED_NEXT_LANE = CANONICAL_VENUE_AUTHORING_CONTRACT$/m, 'post-HV-4 decision must select the canonical authoring contract');
  requireMatch(postHv4Decision, /^PROPOSED_MILESTONE = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION$/m, 'post-HV-4 decision must identify proposed HV-5');
  requireMatch(postHv4Decision, /^NEXT_OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION$/m, 'post-HV-4 decision must route to HV-5 preregistration');
  requireMatch(postHv4Decision, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'post-HV-4 decision must not pre-authorize HV-5 implementation');
  requireMatch(postHv4Decision, /^GRAPESJS = EVALUATION_CANDIDATE__NOT_SELECTED_DEPENDENCY$/m, 'post-HV-4 decision must keep GrapesJS non-authoritative');
  requireMatch(postHv4Decision, /^SECOND_REAL_VENUE = DEFERRED_ONE_GATE__REASSESS_AFTER_HV5_OR_IF_SUITABLE_REAL_PILOT_BECOMES_AVAILABLE$/m, 'post-HV-4 decision must preserve the one-gate real-pilot disposition');
  requireMatch(postHv4Decision, /^IPNS = ELIGIBLE_MUTABLE_NAMING_LAYER_AFTER_CID_ARTIFACT__NOT_SOURCE_IDENTITY$/m, 'post-HV-4 decision must preserve IPNS as a downstream naming layer');
  requireMatch(postHv4Decision, /^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m, 'post-HV-4 decision must keep shared-runtime tenancy deferred');
  requireMatch(postHv4Decision, /^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m, 'post-HV-4 decision must keep production mutation unauthorized');

  requireMatch(postHv4DecisionReconciliation, /^OPERATION = POST_HV4_DECISION_ROUTING_RECONCILIATION$/m, 'post-HV-4 decision reconciliation must bind its operation');
  requireMatch(postHv4DecisionReconciliation, /^ROLE = BOUNDED_MAINTENANCE_AND_NAVIGATION_RECONCILIATION$/m, 'post-HV-4 decision reconciliation must remain bounded maintenance');
  requireMatch(postHv4DecisionReconciliation, /^SCIENTIFIC_OR_PRODUCT_LANE_SELECTION = NO$/m, 'post-HV-4 decision reconciliation must not perform lane selection');
  requireMatch(postHv4DecisionReconciliation, /^NEW_SUBSTANTIVE_IMPLEMENTATION = NO$/m, 'post-HV-4 decision reconciliation must not implement HV-5');
  requireMatch(postHv4DecisionReconciliation, /^POST_HV4_SEQUENCING_DECISION = ACCEPTED$/m, 'post-HV-4 decision reconciliation must bind accepted sequencing');
  requireMatch(postHv4DecisionReconciliation, /^SELECTED_NEXT_LANE = CANONICAL_VENUE_AUTHORING_CONTRACT$/m, 'post-HV-4 decision reconciliation must bind the selected lane');
  requireMatch(postHv4DecisionReconciliation, /^NEXT_OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION$/m, 'post-HV-4 decision reconciliation must route to HV-5 preregistration');
  requireMatch(postHv4DecisionReconciliation, /^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'post-HV-4 decision reconciliation must preserve non-authorization');

  requireMatch(operations, /Runtime source identity: `\/healthz` publishes the exact deployed beta build label, commit, and tree/, 'operations must define runtime source identity through healthz');
  requireMatch(operations, /last-good.*M17\.3/i, 'operations must retain M17.3 as the last-good boundary');
  requireMatch(operations, /in-person onboarding: not production-activated/, 'operations must distinguish onboarding source capability from production activation');

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
    acceptedSuccessorMilestones: 4,
    nextOperation: 'HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION',
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
