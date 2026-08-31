'use strict';

const { requireMatch } = require('./io');

function assertAcceptedGovernanceBindings({ architectureDecision, hv5Acceptance, hv6Acceptance, postHv6Reconciliation }) {
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
}

module.exports = { assertAcceptedGovernanceBindings };
