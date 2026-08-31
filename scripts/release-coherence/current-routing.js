'use strict';

const { read, requireMatch } = require('./io');

const CURRENT_START = '<!-- HV6_CURRENT_ROUTING_START -->';
const CURRENT_END = '<!-- HV6_CURRENT_ROUTING_END -->';
const NEXT_SUCCESSOR_OPERATION = 'HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_READINESS__READ_ONLY_AUDIT';

function currentRouting(relativePath) {
  const source = read(relativePath);
  const starts = source.split(CURRENT_START).length - 1;
  const ends = source.split(CURRENT_END).length - 1;
  if (starts !== 1 || ends !== 1) throw new Error(`${relativePath} must contain exactly one current-routing marker pair`);
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
    [/^HV6_PHASE_C_IMPLEMENTATION = ACCEPTED$/m, 'HV-6 implementation must remain accepted'],
    [/^POST_HV6_SEQUENCING_DECISION = PROJECT_LEAD_ACCEPTED$/m, 'historical Post-HV-6 sequencing must remain accepted'],
    [/^HV7_CANDIDATE_EVIDENCE_MODEL_AMENDMENT = ACCEPTED$/m, 'HV-7 evidence amendment must remain accepted'],
    [/^FOURTH_STREET_VENUE_STATUS = REAL_VENUE$/m, 'Fourth Street must remain real'],
    [/^FOURTH_STREET_CLIENT_STATUS = FIRST_REAL_CLIENT__SOLE_REAL_CLIENT$/m, 'Fourth Street must remain first/sole real client'],
    [/^FOURTH_STREET_NOMINEE_STATUS = FIRST_VENUE_NOMINEE$/m, 'Fourth Street must remain first nominee'],
    [/^FOURTH_STREET_DEPLOYMENT_STATUS = REFERENCE_DEPLOYMENT$/m, 'Fourth Street must remain reference deployment'],
    [/^HV7_SECOND_VENUE_NOMINEE = JUNIPER_WORKS_COOPERATIVE$/m, 'Juniper must remain selected nominee'],
    [/^HV7_SECOND_VENUE_NOMINEE_REALITY = SYNTHETIC$/m, 'Juniper must remain synthetic'],
    [/^HV7_SECOND_VENUE_NOMINEE_STATUS = VALIDATED__SYNTHETIC_TIER_A$/m, 'Juniper validation must remain Tier-A'],
    [/^HV7_REQUIREMENTS_PACKET = FROZEN_0_1_0$/m, 'HV-7 frozen packet must remain controlling'],
    [/^HV7_REQUIREMENT_COUNT = 24$/m, 'HV-7 must retain 24 frozen requirements'],
    [/^HV7_PLATFORM_GENERALITY_REPAIR_IMPLEMENTATION = ACCEPTED$/m, 'HV-7 repair must remain accepted'],
    [/^HV7_PRE_ACCEPTANCE_QUALIFICATION = COMPLETE__PASS$/m, 'HV-7 qualification must remain complete/pass'],
    [/^HV7_FROZEN_REQUIREMENT_ADJUDICATION = PASS__24_OF_24$/m, 'HV-7 requirement adjudication must remain 24/24'],
    [/^HV7_PLATFORM_GENERALITY_REPAIR_ACCEPTANCE = PROJECT_LEAD_ACCEPTED$/m, 'HV-7 Project Lead acceptance must remain explicit'],
    [/^HV7_SYNTHETIC_TIER_A_PRODUCT_AND_ARCHITECTURE = ACCEPTED$/m, 'HV-7 evidence ceiling must remain Tier-A'],
    [/^HV7_ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT = ACCEPTED__SYNTHETIC_TIER_A$/m, 'HV-7 pilot must remain accepted at Tier-A only'],
    [/^POST_HV7_JUNIPER_REPAIR_LIVING_ROUTING_RECONCILIATION = HISTORICAL_COMPLETE__SUPERSEDED_FOR_CURRENT_ROUTING$/m, 'neutral post-HV7 route must be historical for current routing'],
    [/^POST_HV7_SEQUENCING_DECISION = PROJECT_LEAD_ACCEPTED$/m, 'Post-HV7 sequencing decision must be accepted'],
    [/^SELECTED_NEXT_LANE = FOURTH_STREET_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE$/m, 'reference deployment convergence must be selected'],
    [/^PROPOSED_NEXT_MILESTONE = HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_READINESS$/m, 'HV-8 readiness must be proposed next milestone'],
    [/^POST_HV7_SEQUENCING_LIVING_ROUTING_RECONCILIATION = COMPLETE$/m, 'post-HV7 sequencing routing reconciliation must be complete'],
    [new RegExp(`^NEXT_OPERATION = ${NEXT_SUCCESSOR_OPERATION}$`, 'm'), 'next operation must be the HV-8 read-only readiness audit'],
    [/^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'substantive implementation must remain unauthorized'],
    [/^GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED$/m, 'GrapesJS Core must remain unselected'],
    [/^GRAPESJS_STUDIO_SDK = NOT_SELECTED$/m, 'Studio SDK must remain unselected'],
    [/^REAL_SECOND_VENUE_REQUIRED = NO$/m, 'real second venue must not be required'],
    [/^(?:REAL_SECOND_VENUE_AUTHORIZED|SECOND_REAL_VENUE_AUTHORIZED) = NO$/m, 'real second venue must remain unauthorized'],
    [/^VENUE_OUTREACH = NOT_AUTHORIZED$/m, 'venue outreach must remain unauthorized'],
    [/^SYNTHETIC_HV7_REAL_OPERATOR_USABILITY_EVIDENCE = NO$/m, 'synthetic evidence must not claim real-operator usability'],
    [/^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m, 'live production mutation must remain unauthorized'],
    [/^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m, 'shared tenancy must remain deferred'],
    [/^DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME$/m, 'isolated runtime must remain default'],
  ];
  for (const [pattern, message] of required) requireMatch(block, pattern, `${relativePath}: ${message}`);

  const obsolete = [
    /^NEXT_OPERATION = POST_HV7_SEQUENCING_DECISION__READ_ONLY$/m,
    /^POST_HV7_JUNIPER_REPAIR_LIVING_ROUTING_RECONCILIATION = COMPLETE$/m,
    /^HV7_SECOND_VENUE_NOMINEE_STATUS = SELECTED__REQUIREMENTS_FROZEN$/m,
    /^HV7_PLATFORM_GENERALITY_REPAIR_IMPLEMENTATION = CANDIDATE_IMPLEMENTED__PRE_ACCEPTANCE$/m,
    /^HV7_PRE_ACCEPTANCE_QUALIFICATION = REQUIRED_ON_EXACT_FINAL_HEAD$/m,
    /^NEXT_OPERATION = HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR__PROJECT_LEAD_ACCEPTANCE_DECISION$/m,
    /^NEXT_OPERATION = HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION__READ_ONLY$/m,
    /^NEXT_OPERATION = HV7_ADVERSARIAL_SECOND_VENUE_CANDIDATE_DESIGN__READ_ONLY$/m,
    /^NEXT_OPERATION = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT__PREREGISTRATION$/m,
  ];
  if (obsolete.some((pattern) => pattern.test(block)) || /AUTHORIZED__NOT_YET_ACCEPTED/.test(block)) {
    throw new Error(`${relativePath}: superseded lifecycle routing leaked into current routing`);
  }
  return block;
}

function assertLivingRoutingCoherence({ readme, docsReadme, roadmap }) {
  requireMatch(readme, /^# Hive-Venues$/m, 'README must identify Hive-Venues');
  requireMatch(readme, /Fourth Street Bar in Reno is a real venue, Hive-Venues' first real client, its first venue nominee, and the reference deployment/i, 'README must preserve Fourth Street roles');
  requireMatch(readme, /frozen 24-requirement product packet passed at \*\*Tier-A product-and-architecture evidence\*\*/i, 'README must preserve HV-7 evidence result');
  requireMatch(readme, /first HV-8 operation is a \*\*read-only reference-deployment readiness audit\*\*/i, 'README must identify HV-8 read-only audit');
  requireMatch(readme, /Historical M19\.2 deployment evidence is not current installed identity/i, 'README must preserve installed-identity epistemic rule');
  requireMatch(readme, /Canonical source is the moving `main` branch of `etblink\/Hive-Venues`/, 'README must identify moving source');

  requireMatch(docsReadme, /^# Hive-Venues Documentation Index$/m, 'docs index must identify Hive-Venues');
  requireMatch(docsReadme, /HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_READINESS__READ_ONLY_AUDIT/, 'docs index must route to HV-8');
  requireMatch(docsReadme, /HISTORICAL_M19_2_DEPLOYMENT_RECORD != CURRENT_INSTALLED_IDENTITY/, 'docs index must preserve epistemic rule');
  requireMatch(docsReadme, /Canonical integrated source is moving `main` in `etblink\/Hive-Venues`/, 'docs index must identify moving source');

  requireMatch(roadmap, /^# Hive-Venues Living Roadmap$/m, 'roadmap must identify Hive-Venues');
  requireMatch(roadmap, /^REPOSITORY = etblink\/Hive-Venues$/m, 'roadmap must bind repository');
  requireMatch(roadmap, /Post-HV-7 sequencing — ACCEPTED/i, 'roadmap must record accepted sequencing');
  requireMatch(roadmap, /HV-8 — reference deployment successor readiness/i, 'roadmap must record HV-8');

  for (const relativePath of ['README.md', 'docs/README.md', 'docs/ROADMAP.md']) assertCurrentRoutingBlock(relativePath);
}

function assertLivingDocumentGuardrails({ readme, docsReadme, roadmap }) {
  if (/Canonical `main` and production are aligned on accepted M19\.1/.test(readme + docsReadme + roadmap)) {
    throw new Error('living documentation must not pin moving main to historical production');
  }
  if (/\bMIT License\b/i.test(readme)) throw new Error('README must not claim an absent open-source license');
}

module.exports = {
  NEXT_SUCCESSOR_OPERATION,
  assertCurrentRoutingBlock,
  assertLivingDocumentGuardrails,
  assertLivingRoutingCoherence,
  currentRouting,
};
