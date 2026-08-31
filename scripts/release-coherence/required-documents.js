'use strict';

const { exists } = require('./io');

const REQUIRED_LIVING_RELEASE_DOCUMENTS = Object.freeze([
  'docs/README.md',
  'docs/ROADMAP.md',
  'docs/PRODUCTION_OPERATIONS.md',
  'docs/HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md',
  'docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md',
  'docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_ACCEPTANCE_0_1_0.md',
  'docs/HV7_SECOND_VENUE_NOMINEE_JUNIPER_WORKS_REQUIREMENTS_0_1_0.md',
  'docs/HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR_ACCEPTANCE_0_1_0.md',
  'docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_DEPLOYMENT_PREREGISTRATION_0_1_0.md',
]);

function assertRequiredLivingReleaseDocuments() {
  for (const requiredPath of REQUIRED_LIVING_RELEASE_DOCUMENTS) {
    if (!exists(requiredPath)) throw new Error(`required living/release document is missing: ${requiredPath}`);
  }
}

module.exports = { assertRequiredLivingReleaseDocuments, REQUIRED_LIVING_RELEASE_DOCUMENTS };
