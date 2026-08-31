'use strict';

const { requireMatch } = require('./io');

function assertAcceptedGovernanceBindings({ architectureDecision, hv5Acceptance, hv6Acceptance }) {
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
}

module.exports = { assertAcceptedGovernanceBindings };
