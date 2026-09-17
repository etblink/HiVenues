'use strict';

// Deprecated compatibility export. Product readiness is defined by the canonical
// roadmap, not by this historical module name.
const {
  TurnkeyWiringError,
  REQUIRED_TURNKEY_FILES,
  evaluateTurnkeyWiring,
} = require('./turnkey-wiring-readiness');

module.exports = {
  HiVenuesV1ReadinessError: TurnkeyWiringError,
  REQUIRED_TURNKEY_FILES,
  evaluateHiVenuesV1Readiness: evaluateTurnkeyWiring,
};
