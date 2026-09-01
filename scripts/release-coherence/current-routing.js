'use strict';

const { read, requireMatch } = require('./io');

const CURRENT_START = '<!-- HV6_CURRENT_ROUTING_START -->';
const CURRENT_END = '<!-- HV6_CURRENT_ROUTING_END -->';
const NEXT_SUCCESSOR_OPERATION = 'VENUE_HOME_COMMUNITY_PULSE__PRODUCT_BUILD';

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
    [/^SUCCESSOR_FOUNDATIONS = HV1_THROUGH_HV6_ACCEPTED$/m, 'HV-1 through HV-6 must remain accepted'],
    [/^FOURTH_STREET_CLIENT_STATUS = FIRST_REAL_CLIENT__SOLE_REAL_CLIENT$/m, 'Fourth Street must remain first/sole real client'],
    [/^FOURTH_STREET_DEPLOYMENT_STATUS = REFERENCE_DEPLOYMENT$/m, 'Fourth Street must remain the reference deployment'],
    [/^HV7_SECOND_VENUE_NOMINEE = JUNIPER_WORKS_COOPERATIVE$/m, 'Juniper must remain the validated synthetic nominee'],
    [/^HV7_SECOND_VENUE_NOMINEE_STATUS = VALIDATED__SYNTHETIC_TIER_A$/m, 'Juniper evidence must remain Tier-A synthetic'],
    [/^HV7_REQUIREMENT_COUNT = 24$/m, 'HV-7 must retain 24 frozen requirements'],
    [/^HV7_FROZEN_REQUIREMENT_ADJUDICATION = PASS__24_OF_24$/m, 'HV-7 requirement adjudication must remain 24/24'],
    [/^HV8_CURRENT_RUNNING_BUILD = beta-fdb5b5b$/m, 'current running build must remain exactly observed'],
    [/^HV8_CURRENT_RUNNING_COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e$/m, 'current running commit must remain exactly observed'],
    [/^HV8_CURRENT_RUNNING_TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c$/m, 'current running tree must remain exactly observed'],
    [/^HV8_CURRENT_RUNNING_WRITE_MODE = beta$/m, 'current running write mode must remain beta'],
    [/^HV8_CURRENT_RUNNING_READY = ready$/m, 'current running readiness must remain ready'],
    [/^HV8_PHASE_A_READ_ONLY_PREFLIGHT = PASS$/m, 'HV-8 Phase A must reflect the completed fresh observation'],
    [/^HV8_PRODUCTION_CAPABILITY_STATE = OBSERVED__PAYMENTS_ONBOARDING_MODERATION_ACTIVE$/m, 'routing must reflect the observed durable production capability state'],
    [/^HV8_REFERENCE_DEPLOYMENT_CONVERGENCE = TECHNICALLY_QUALIFIED__PRODUCTION_TRANSITION_WITHHELD$/m, 'HV-8 must stop at technical convergence without implying deployment'],
    [new RegExp(`^NEXT_OPERATION = ${NEXT_SUCCESSOR_OPERATION}$`, 'm'), 'next operation must be the selected product build'],
    [/^LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED$/m, 'live production mutation must remain unauthorized'],
    [/^PUBLIC_PRODUCTION_AUTHORING = NOT_AUTHORIZED$/m, 'public production authoring must remain unauthorized'],
    [/^REAL_SECOND_VENUE_AUTHORIZED = NO$/m, 'real second venue must remain unauthorized'],
    [/^VENUE_OUTREACH = NOT_AUTHORIZED$/m, 'venue outreach must remain unauthorized'],
    [/^SHARED_RUNTIME_MULTI_TENANCY = DEFERRED$/m, 'shared tenancy must remain deferred'],
    [/^DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME$/m, 'isolated runtime must remain default'],
  ];
  for (const [pattern, message] of required) requireMatch(block, pattern, `${relativePath}: ${message}`);
  return block;
}

function assertLivingRoutingCoherence({ readme, docsReadme, roadmap }) {
  requireMatch(readme, /^# Hive-Venues$/m, 'README must identify Hive-Venues');
  requireMatch(readme, /Fourth Street Bar in Reno is a real venue, Hive-Venues' first real client, its first venue nominee, and the reference deployment/i, 'README must preserve Fourth Street roles');
  requireMatch(readme, /24 frozen requirements passed at \*\*Tier-A product-and-architecture evidence\*\*/i, 'README must preserve HV-7 evidence result');
  requireMatch(readme, /Phase A.*complete/i, 'README must record the completed HV-8 observation');
  requireMatch(readme, /production transition is withheld/i, 'README must state that technical deployment ability is not a deployment reason');
  requireMatch(readme, /community pulse/i, 'README must identify the selected product-value lane');
  requireMatch(readme, /Production deployment is not authorized/i, 'README must preserve deployment boundary');
  requireMatch(readme, /Canonical source is moving `main` in `etblink\/Hive-Venues`/i, 'README must identify moving source');

  requireMatch(docsReadme, /^# Hive-Venues Documentation Index$/m, 'docs index must identify Hive-Venues');
  requireMatch(docsReadme, /Superseded sequencing, temporary holds, and intermediate routing are recoverable from Git history/i, 'docs index must use Git history rather than living archival state');
  requireMatch(docsReadme, /VENUE_HOME_COMMUNITY_PULSE__PRODUCT_BUILD/, 'docs index must route to the selected product build');
  requireMatch(docsReadme, /production transition.*withheld/i, 'docs index must preserve the HV-8 stop decision');

  requireMatch(roadmap, /^# Hive-Venues Living Roadmap$/m, 'roadmap must identify Hive-Venues');
  requireMatch(roadmap, /Superseded states remain recoverable from Git history/i, 'roadmap must keep superseded state in Git history');
  requireMatch(roadmap, /HV-8.*technically qualified.*transition withheld/is, 'roadmap must close HV-8 without selecting deployment');
  requireMatch(roadmap, /community pulse/i, 'roadmap must select product vitality work rather than another architecture-only lane');

  for (const relativePath of ['README.md', 'docs/README.md', 'docs/ROADMAP.md']) assertCurrentRoutingBlock(relativePath);
}

function assertLivingDocumentGuardrails({ readme }) {
  if (/Canonical `main` and production are aligned on accepted M19\.1/.test(readme)) {
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
