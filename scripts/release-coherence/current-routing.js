'use strict';

const { read, requireMatch } = require('./io');

const CURRENT_START = '<!-- HV6_CURRENT_ROUTING_START -->';
const CURRENT_END = '<!-- HV6_CURRENT_ROUTING_END -->';
const NEXT_SUCCESSOR_OPERATION = 'POST_HV7_SEQUENCING_DECISION__READ_ONLY';

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

function assertCurrentRoutingBlock(relativePath) {
  const block = currentRouting(relativePath);
  const required = [
    [/^HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION = ACCEPTED$/m, 'HV-6 must be accepted'],
    [/^SELECTED_ADAPTER = NATIVE_EXISTING_STACK$/m, 'native existing stack must remain selected'],
    [/^HV6_PHASE_C_IMPLEMENTATION = ACCEPTED$/m, 'HV-6 Phase C must remain accepted'],
    [/^POST_HV6_SEQUENCING_DECISION = PROJECT_LEAD_ACCEPTED$/m, 'historical Post-HV-6 sequencing must remain accepted'],
    [/^HV7_CANDIDATE_EVIDENCE_MODEL_AMENDMENT = ACCEPTED$/m, 'HV-7 evidence amendment must remain accepted'],
    [/^FOURTH_STREET_VENUE_STATUS = REAL_VENUE$/m, 'Fourth Street must remain a real venue'],
    [/^FOURTH_STREET_CLIENT_STATUS = FIRST_REAL_CLIENT__SOLE_REAL_CLIENT$/m, 'Fourth Street must remain the first and sole real client'],
    [/^FOURTH_STREET_NOMINEE_STATUS = FIRST_VENUE_NOMINEE$/m, 'Fourth Street must remain the first nominee'],
    [/^FOURTH_STREET_DEPLOYMENT_STATUS = REFERENCE_DEPLOYMENT$/m, 'Fourth Street must remain the reference deployment'],
    [/^HV7_SECOND_VENUE_PRODUCT_ROLE = SECOND_VENUE_NOMINEE$/m, 'HV-7 must retain the second-nominee product role'],
    [/^HV7_SECOND_VENUE_NOMINEE = JUNIPER_WORKS_COOPERATIVE$/m, 'Juniper Works must remain the selected nominee'],
    [/^HV7_SECOND_VENUE_NOMINEE_REALITY = SYNTHETIC$/m, 'Juniper Works must remain explicitly synthetic'],
    [/^HV7_SECOND_VENUE_NOMINEE_STATUS = VALIDATED__SYNTHETIC_TIER_A$/m, 'Juniper must remain validated only at synthetic Tier-A'],
    [/^HV7_REQUIREMENTS_PACKET = FROZEN_0_1_0$/m, 'the frozen requirement packet must remain controlling'],
    [/^HV7_REQUIREMENT_COUNT = 24$/m, 'the frozen packet must retain 24 requirements'],
    [/^HV7_CANDIDATE_MODE = SYNTHETIC_ADVERSARIAL$/m, 'synthetic adversarial mode must remain the accepted evidence mode'],
    [/^HV7_REQUIREMENTS_FREEZE_BEFORE_IMPLEMENTATION = COMPLETE$/m, 'requirements freeze must remain complete'],
    [/^HV7_POST_FREEZE_REQUIREMENT_REWRITE_TO_FORCE_PLATFORM_FIT = FORBIDDEN$/m, 'requirements may not be rewritten to force a pass'],
    [/^HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION = COMPLETE__READ_ONLY$/m, 'confrontation must remain complete/read-only'],
    [/^HV7_PLATFORM_GENERALITY_REPAIR_PREREGISTRATION = ACCEPTED$/m, 'repair preregistration must remain accepted'],
    [/^HV7_PLATFORM_GENERALITY_REPAIR_IMPLEMENTATION_AUTHORIZATION = ACCEPTED$/m, 'repair implementation authorization must remain accepted'],
    [/^HV7_PLATFORM_GENERALITY_REPAIR_IMPLEMENTATION = ACCEPTED$/m, 'repair implementation must now be accepted'],
    [/^HV7_PRE_ACCEPTANCE_QUALIFICATION = COMPLETE__PASS$/m, 'pre-acceptance qualification must remain recorded as complete/pass'],
    [/^HV7_FROZEN_REQUIREMENT_ADJUDICATION = PASS__24_OF_24$/m, 'all frozen requirements must remain accepted as pass'],
    [/^HV7_PLATFORM_GENERALITY_REPAIR_ACCEPTANCE = PROJECT_LEAD_ACCEPTED$/m, 'Project Lead acceptance must remain explicit'],
    [/^HV7_SYNTHETIC_TIER_A_PRODUCT_AND_ARCHITECTURE = ACCEPTED$/m, 'accepted evidence tier must remain Tier-A product-and-architecture'],
    [/^HV7_ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT = ACCEPTED__SYNTHETIC_TIER_A$/m, 'HV-7 pilot must remain accepted at synthetic Tier-A only'],
    [/^POST_HV7_JUNIPER_REPAIR_LIVING_ROUTING_RECONCILIATION = COMPLETE$/m, 'post-acceptance reconciliation must be complete'],
    [new RegExp(`^NEXT_OPERATION = ${NEXT_SUCCESSOR_OPERATION}$`, 'm'), 'next operation must be fresh Post-HV-7 sequencing'],
    [/^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'substantive implementation must remain unauthorized before sequencing'],
    [/^GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED$/m, 'GrapesJS Core must remain unselected'],
    [/^GRAPESJS_STUDIO_SDK = NOT_SELECTED$/m, 'Studio SDK must remain unselected'],
    [/^REAL_SECOND_VENUE_REQUIRED = NO$/m, 'a real second venue must not be required'],
    [/^(?:REAL_SECOND_VENUE_AUTHORIZED|SECOND_REAL_VENUE_AUTHORIZED) = NO$/m, 'a real second venue must remain unauthorized'],
    [/^VENUE_OUTREACH = NOT_AUTHORIZED$/m, 'venue outreach must remain unauthorized'],
    [/^SYNTHETIC_HV7_REAL_OPERATOR_USABILITY_EVIDENCE = NO$/m, 'synthetic evidence must not claim real-operator usability'],
    [/^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m, 'live production mutation must remain unauthorized'],
    [/^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m, 'shared runtime tenancy must remain deferred'],
    [/^DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME$/m, 'isolated runtime must remain default'],
  ];
  for (const [pattern, message] of required) requireMatch(block, pattern, `${relativePath}: ${message}`);

  const obsolete = [
    /^SELECTED_NEXT_LANE = ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT$/m,
    /^PROPOSED_NEXT_MILESTONE = HV7_ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT$/m,
    /^HV7_SECOND_VENUE_NOMINEE_STATUS = SELECTED__REQUIREMENTS_FROZEN$/m,
    /^HV7_PLATFORM_GENERALITY_REPAIR_IMPLEMENTATION = CANDIDATE_IMPLEMENTED__PRE_ACCEPTANCE$/m,
    /^HV7_PRE_ACCEPTANCE_QUALIFICATION = REQUIRED_ON_EXACT_FINAL_HEAD$/m,
    /^NEXT_OPERATION = HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR__PROJECT_LEAD_ACCEPTANCE_DECISION$/m,
    /^NEXT_OPERATION = HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION__READ_ONLY$/m,
    /^NEXT_OPERATION = HV7_ADVERSARIAL_SECOND_VENUE_CANDIDATE_DESIGN__READ_ONLY$/m,
    /^NEXT_OPERATION = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT__PREREGISTRATION$/m,
    /^SELECTED_NEXT_LANE = REAL_ISOLATED_SECOND_VENUE_PILOT$/m,
    /^HV7_SECOND_VENUE_NOMINEE_STATUS = DESIGN_PENDING__SYNTHETIC_ALLOWED$/m,
    /^HV7_REQUIREMENTS_FREEZE_BEFORE_IMPLEMENTATION = REQUIRED$/m,
    /^FOURTH_STREET_REAL_CLIENT_STATUS = SOLE_REAL_CLIENT_AND_REFERENCE_DEPLOYMENT$/m,
  ];
  if (obsolete.some((pattern) => pattern.test(block)) || /AUTHORIZED__NOT_YET_ACCEPTED/.test(block)) {
    throw new Error(`${relativePath}: superseded lifecycle routing leaked into the current-routing block`);
  }
  return block;
}

function assertLivingRoutingCoherence({ readme, docsReadme, roadmap }) {
  requireMatch(readme, /^# Hive-Venues$/m, 'README must identify Hive-Venues');
  requireMatch(readme, /The first six successor architecture\/product-foundation milestones are accepted/i, 'README must preserve foundation status');
  requireMatch(readme, /Canonical source is the `main` branch of `etblink\/Hive-Venues`/, 'README must identify moving canonical source');
  requireMatch(readme, /platform still does not require a universal venue-type taxonomy/i, 'README must preserve venue-type neutrality');
  requireMatch(readme, /Fourth Street Bar in Reno is a real venue, Hive-Venues' first real client, its first venue nominee, and the reference deployment/i, 'README must preserve Fourth Street roles');
  requireMatch(readme, /Juniper Works Cooperative.*synthetic/i, 'README must identify Juniper as synthetic');
  requireMatch(readme, /24-requirement product packet has passed.*Tier-A product-and-architecture evidence/is, 'README must state the accepted synthetic evidence result');
  requireMatch(readme, /next operation is a fresh \*\*read-only Post-HV-7 sequencing decision\*\*/i, 'README must route to post-HV-7 sequencing');

  requireMatch(docsReadme, /^# Hive-Venues Documentation Index$/m, 'documentation index must identify Hive-Venues');
  requireMatch(docsReadme, /Canonical integrated source is `main` in `etblink\/Hive-Venues`/, 'documentation index must identify canonical source');
  requireMatch(docsReadme, /validated synthetic second venue nominee/i, 'documentation index must identify Juniper validation');
  requireMatch(docsReadme, /all 24 requirements PASS at \*\*Tier-A product-and-architecture evidence\*\*/i, 'documentation index must preserve the evidence ceiling');
  requireMatch(docsReadme, /POST_HV7_SEQUENCING_DECISION__READ_ONLY/, 'documentation index must route to sequencing');

  requireMatch(roadmap, /^# Hive-Venues Living Roadmap$/m, 'roadmap must identify the successor roadmap');
  requireMatch(roadmap, /^REPOSITORY = etblink\/Hive-Venues$/m, 'roadmap must bind the repository');
  requireMatch(roadmap, /HV-7 — synthetic adversarial second-venue validation ACCEPTED/i, 'roadmap must record HV-7 acceptance');
  requireMatch(roadmap, /Current operation — POST-HV-7 SEQUENCING/i, 'roadmap must identify current operation');

  for (const relativePath of ['README.md', 'docs/README.md', 'docs/ROADMAP.md']) assertCurrentRoutingBlock(relativePath);
}

function assertLivingDocumentGuardrails({ readme, docsReadme, roadmap }) {
  if (/Canonical `main` and production are aligned on accepted M19\.1/.test(readme + docsReadme + roadmap)) {
    throw new Error('living documentation must not pin moving main to historical M19.1 production');
  }
  if (/\bMIT License\b/i.test(readme)) throw new Error('README must not claim an open-source license that the repository does not provide');
}

module.exports = {
  NEXT_SUCCESSOR_OPERATION,
  assertCurrentRoutingBlock,
  assertLivingDocumentGuardrails,
  assertLivingRoutingCoherence,
  currentRouting,
};
