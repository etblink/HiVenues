'use strict';

const { read, requireMatch } = require('./io');

const CURRENT_START = '<!-- HV6_CURRENT_ROUTING_START -->';
const CURRENT_END = '<!-- HV6_CURRENT_ROUTING_END -->';
const NEXT_SUCCESSOR_OPERATION =
  'HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR__PROJECT_LEAD_ACCEPTANCE_DECISION';

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
    [/^HV6_PHASE_C_IMPLEMENTATION = ACCEPTED$/m, 'Phase C implementation must be accepted'],
    [/^POST_HV6_SEQUENCING_DECISION = PROJECT_LEAD_ACCEPTED$/m, 'historical Post-HV-6 sequencing decision must remain accepted'],
    [/^HV7_CANDIDATE_EVIDENCE_MODEL_AMENDMENT = ACCEPTED$/m, 'HV-7 evidence-model amendment must be accepted'],
    [/^POST_HV6_SELECTED_LANE_LABEL = HISTORICAL_ACCEPTED__SUPERSEDED_BY_HV7_EVIDENCE_MODEL_AMENDMENT$/m, 'historical real-only lane label must remain superseded for current routing'],
    [/^FOURTH_STREET_VENUE_STATUS = REAL_VENUE$/m, 'Fourth Street must remain a real venue'],
    [/^FOURTH_STREET_CLIENT_STATUS = FIRST_REAL_CLIENT__SOLE_REAL_CLIENT$/m, 'Fourth Street must remain the first and currently sole real client'],
    [/^FOURTH_STREET_NOMINEE_STATUS = FIRST_VENUE_NOMINEE$/m, 'Fourth Street must remain the first venue nominee'],
    [/^FOURTH_STREET_DEPLOYMENT_STATUS = REFERENCE_DEPLOYMENT$/m, 'Fourth Street must remain the reference deployment'],
    [/^HV7_SECOND_VENUE_PRODUCT_ROLE = SECOND_VENUE_NOMINEE$/m, 'HV-7 must retain the second-venue-nominee role'],
    [/^HV7_SECOND_VENUE_NOMINEE = JUNIPER_WORKS_COOPERATIVE$/m, 'Juniper Works must be the selected second venue nominee'],
    [/^HV7_SECOND_VENUE_NOMINEE_REALITY = SYNTHETIC$/m, 'Juniper Works must remain explicitly synthetic'],
    [/^HV7_SECOND_VENUE_NOMINEE_STATUS = SELECTED__REQUIREMENTS_FROZEN$/m, 'Juniper Works requirements must be frozen'],
    [/^HV7_REQUIREMENTS_PACKET = FROZEN_0_1_0$/m, 'the frozen 0.1.0 requirement packet must control'],
    [/^HV7_REQUIREMENT_COUNT = 24$/m, 'the current packet must retain 24 frozen requirements'],
    [/^SELECTED_NEXT_LANE = ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT$/m, 'adversarial isolated second-venue pilot must remain the selected lane'],
    [/^HV7_CANDIDATE_MODE = SYNTHETIC_ADVERSARIAL$/m, 'synthetic adversarial evidence mode must remain selected'],
    [/^HV7_ADVERSARIAL_INTERPRETATION = PRODUCT_CREDIBLE_FALSIFICATION__NOT_MAXIMIZED_INCOMPATIBILITY$/m, 'adversarial must remain product-credible falsification'],
    [/^HV7_DESIGN_METHOD = ARCHITECTURE_AWARE_PRODUCT_FIRST$/m, 'HV-7 must remain architecture-aware and product-first'],
    [/^HV7_ARTIFICIAL_BLINDNESS = NOT_REQUIRED$/m, 'artificial blindness must not be required'],
    [/^HV7_REQUIREMENTS_FREEZE_BEFORE_IMPLEMENTATION = COMPLETE$/m, 'requirements freeze must be complete before implementation'],
    [/^HV7_POST_FREEZE_REQUIREMENT_REWRITE_TO_FORCE_PLATFORM_FIT = FORBIDDEN$/m, 'requirements may not be rewritten merely to force platform fit'],
    [/^PROPOSED_NEXT_MILESTONE = HV7_ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT$/m, 'amended HV-7 milestone must remain current'],
    [/^HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION = COMPLETE__READ_ONLY$/m, 'the architecture confrontation must remain complete and read-only'],
    [/^HV7_PLATFORM_GENERALITY_REPAIR_PREREGISTRATION = ACCEPTED$/m, 'the repair preregistration must remain accepted'],
    [/^HV7_PLATFORM_GENERALITY_REPAIR_IMPLEMENTATION_AUTHORIZATION = ACCEPTED$/m, 'the repair implementation authorization must remain accepted'],
    [/^HV7_PLATFORM_GENERALITY_REPAIR_IMPLEMENTATION = CANDIDATE_IMPLEMENTED__PRE_ACCEPTANCE$/m, 'the repair must remain a pre-acceptance candidate'],
    [/^HV7_PRE_ACCEPTANCE_QUALIFICATION = REQUIRED_ON_EXACT_FINAL_HEAD$/m, 'exact-final-head qualification must remain required'],
    [new RegExp(`^NEXT_OPERATION = ${NEXT_SUCCESSOR_OPERATION}$`, 'm'), 'next product operation must be the Juniper repair Project Lead acceptance decision'],
    [/^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'further substantive implementation must remain unauthorized'],
    [/^GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED$/m, 'GrapesJS Core must remain evaluated and not selected'],
    [/^GRAPESJS_STUDIO_SDK = NOT_SELECTED$/m, 'Studio SDK must remain unselected'],
    [/^REAL_SECOND_VENUE_REQUIRED = NO$/m, 'a real second venue must not be required'],
    [/^(?:REAL_SECOND_VENUE_AUTHORIZED|SECOND_REAL_VENUE_AUTHORIZED) = NO$/m, 'real second venue must remain unauthorized'],
    [/^VENUE_OUTREACH = NOT_AUTHORIZED$/m, 'venue outreach must remain unauthorized'],
    [/^SYNTHETIC_HV7_REAL_OPERATOR_USABILITY_EVIDENCE = NO$/m, 'synthetic evidence must not claim real-operator usability'],
    [/^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m, 'live production mutation must remain unauthorized'],
    [/^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m, 'shared runtime tenancy must remain deferred'],
    [/^DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME$/m, 'isolated runtime must remain default'],
  ];
  for (const [pattern, message] of required) requireMatch(block, pattern, `${relativePath}: ${message}`);

  const obsolete = [
    /^POST_HV6_SEQUENCING_DECISION = PENDING$/m,
    /^SELECTED_NEXT_LANE = NONE$/m,
    /^SELECTED_NEXT_LANE = REAL_ISOLATED_SECOND_VENUE_PILOT$/m,
    /^PROPOSED_NEXT_MILESTONE = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT$/m,
    /^NEXT_OPERATION = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT__PREREGISTRATION$/m,
    /^NEXT_OPERATION = POST_HV6_SEQUENCING_DECISION__READ_ONLY$/m,
    /^NEXT_OPERATION = HV7_ADVERSARIAL_SECOND_VENUE_CANDIDATE_DESIGN__READ_ONLY$/m,
    /^NEXT_OPERATION = HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION__READ_ONLY$/m,
    /^HV7_SECOND_VENUE_NOMINEE_STATUS = DESIGN_PENDING__SYNTHETIC_ALLOWED$/m,
    /^HV7_REQUIREMENTS_FREEZE_BEFORE_IMPLEMENTATION = REQUIRED$/m,
    /^FOURTH_STREET_REAL_CLIENT_STATUS = SOLE_REAL_CLIENT_AND_REFERENCE_DEPLOYMENT$/m,
  ];
  if (
    obsolete.some((pattern) => pattern.test(block)) ||
    /HV6_BOUNDED_DUAL_CANDIDATE_IMPLEMENTATION_AND_EVALUATION/.test(block) ||
    /HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_AND_QUALIFICATION/.test(block) ||
    /AUTHORIZED__NOT_YET_ACCEPTED/.test(block)
  ) {
    throw new Error(`${relativePath}: superseded or pre-acceptance routing leaked into the current-routing block`);
  }
  return block;
}

function assertLivingRoutingCoherence({ readme, docsReadme, roadmap }) {
  requireMatch(readme, /^# Hive-Venues$/m, 'README must identify Hive-Venues');
  requireMatch(readme, /The first six successor architecture\/product-foundation milestones are accepted/i, 'README must identify six accepted successor milestones');
  requireMatch(readme, /Canonical source is the `main` branch of `etblink\/Hive-Venues`/, 'README must identify moving canonical source');
  requireMatch(readme, /platform does not currently require a universal venue-type taxonomy/i, 'README must preserve venue-type neutrality');
  requireMatch(readme, /Fourth Street Bar in Reno is a real venue, Hive-Venues' first real client, its first venue nominee, and the reference deployment/i, 'README must preserve distinct Fourth Street roles');
  requireMatch(readme, /Juniper Works Cooperative.*synthetic second venue nominee/i, 'README must identify the selected synthetic second venue nominee');
  requireMatch(readme, /24 authentic product requirements were frozen in `docs\/HV7_SECOND_VENUE_NOMINEE_JUNIPER_WORKS_REQUIREMENTS_0_1_0\.md`/i, 'README must identify the frozen Juniper Works requirements packet');
  requireMatch(readme, /read-only architecture confrontation is complete/i, 'README must identify the completed architecture confrontation');
  requireMatch(readme, /repair candidate now exists on PR #91/i, 'README must identify the implemented repair candidate');
  requireMatch(readme, /PR #91 must remain draft and unmerged through that adjudication/i, 'README must preserve the pre-acceptance merge boundary');
  requireMatch(docsReadme, /^# Hive-Venues Documentation Index$/m, 'documentation index must identify Hive-Venues');
  requireMatch(docsReadme, /Canonical integrated source is `main` in `etblink\/Hive-Venues`/, 'documentation index must identify canonical source');
  requireMatch(docsReadme, /Juniper Works Cooperative is the selected \*\*synthetic second venue nominee\*\*/i, 'documentation index must identify Juniper as selected nominee');
  requireMatch(docsReadme, /current operation is `HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR__PROJECT_LEAD_ACCEPTANCE_DECISION`/i, 'documentation index must identify the pre-acceptance Project Lead decision route');
  requireMatch(docsReadme, /PR #91 remains draft and unmerged until that adjudication is complete/i, 'documentation index must preserve the merge boundary');
  requireMatch(roadmap, /^# Hive-Venues Living Roadmap$/m, 'roadmap must identify the successor roadmap');
  requireMatch(roadmap, /^REPOSITORY = etblink\/Hive-Venues$/m, 'roadmap must bind the successor repository');
  requireMatch(roadmap, /Current operation — PRE-ACCEPTANCE QUALIFICATION AND PROJECT LEAD DECISION/i, 'roadmap must identify the pre-acceptance decision phase');

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
