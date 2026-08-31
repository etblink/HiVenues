'use strict';

const { read, requireMatch } = require('./io');

const CURRENT_START = '<!-- HV6_CURRENT_ROUTING_START -->';
const CURRENT_END = '<!-- HV6_CURRENT_ROUTING_END -->';

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
    [/^POST_HV6_SELECTED_LANE_LABEL = HISTORICAL_ACCEPTED__SUPERSEDED_BY_HV7_EVIDENCE_MODEL_AMENDMENT$/m, 'historical real-only lane label must be explicitly superseded for current routing'],
    [/^FOURTH_STREET_REAL_CLIENT_STATUS = SOLE_REAL_CLIENT_AND_REFERENCE_DEPLOYMENT$/m, 'Fourth Street must remain the sole real client and reference deployment'],
    [/^SELECTED_NEXT_LANE = ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT$/m, 'adversarial isolated second-venue pilot must be the selected current lane'],
    [/^HV7_CANDIDATE_MODE = SYNTHETIC_ADVERSARIAL$/m, 'synthetic adversarial mode must be selected'],
    [/^PROPOSED_NEXT_MILESTONE = HV7_ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT$/m, 'amended HV-7 milestone must be proposed'],
    [/^NEXT_OPERATION = HV7_ADVERSARIAL_SECOND_VENUE_CANDIDATE_DESIGN__READ_ONLY$/m, 'next product operation must be read-only adversarial candidate design'],
    [/^NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED$/m, 'substantive implementation must remain unauthorized'],
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

  if (/HV6_BOUNDED_DUAL_CANDIDATE_IMPLEMENTATION_AND_EVALUATION/.test(block) ||
      /HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_AND_QUALIFICATION/.test(block) ||
      /AUTHORIZED__NOT_YET_ACCEPTED/.test(block) ||
      /^POST_HV6_SEQUENCING_DECISION = PENDING$/m.test(block) ||
      /^SELECTED_NEXT_LANE = NONE$/m.test(block) ||
      /^SELECTED_NEXT_LANE = REAL_ISOLATED_SECOND_VENUE_PILOT$/m.test(block) ||
      /^PROPOSED_NEXT_MILESTONE = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT$/m.test(block) ||
      /^NEXT_OPERATION = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT__PREREGISTRATION$/m.test(block) ||
      /^NEXT_OPERATION = POST_HV6_SEQUENCING_DECISION__READ_ONLY$/m.test(block)) {
    throw new Error(`${relativePath}: superseded routing leaked into the current-routing block`);
  }
  return block;
}

function assertLivingRoutingCoherence({ readme, docsReadme, roadmap }) {
  requireMatch(readme, /^# Hive-Venues$/m, 'README must identify Hive-Venues');
  requireMatch(readme, /The first six successor architecture\/product-foundation milestones are accepted/i, 'README must identify six accepted successor milestones');
  requireMatch(readme, /Canonical source is the `main` branch of `etblink\/Hive-Venues`/, 'README must identify moving canonical source');
  requireMatch(readme, /platform does not currently require a universal venue-type taxonomy/i, 'README must preserve venue-type neutrality');
  requireMatch(readme, /Fourth Street Bar in Reno is the sole real client and reference deployment/i, 'README must identify Fourth Street as the sole real client/reference deployment');
  requireMatch(docsReadme, /^# Hive-Venues Documentation Index$/m, 'documentation index must identify Hive-Venues');
  requireMatch(docsReadme, /Canonical integrated source is `main` in `etblink\/Hive-Venues`/, 'documentation index must identify canonical source');
  requireMatch(roadmap, /^# Hive-Venues Living Roadmap$/m, 'roadmap must identify the successor roadmap');
  requireMatch(roadmap, /^REPOSITORY = etblink\/Hive-Venues$/m, 'roadmap must bind the successor repository');

  for (const relativePath of ['README.md', 'docs/README.md', 'docs/ROADMAP.md']) assertCurrentRoutingBlock(relativePath);
}

function assertLivingDocumentGuardrails({ readme, docsReadme, roadmap }) {
  if (/Canonical `main` and production are aligned on accepted M19\.1/.test(readme + docsReadme + roadmap)) {
    throw new Error('living documentation must not pin moving main to historical M19.1 production');
  }
  if (/\bMIT License\b/i.test(readme)) throw new Error('README must not claim an open-source license that the repository does not provide');
}

module.exports = {
  assertCurrentRoutingBlock,
  assertLivingDocumentGuardrails,
  assertLivingRoutingCoherence,
  currentRouting,
};
