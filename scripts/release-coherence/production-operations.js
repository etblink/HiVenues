'use strict';

const { requireMatch } = require('./io');

function assertProductionOperationsCompatibility({ operations }) {
  requireMatch(operations, /Runtime source identity: `\/healthz` publishes the exact deployed beta build label, commit, and tree/, 'operations must define runtime source identity through healthz');
  requireMatch(operations, /last-good.*M17\.3/i, 'operations must retain the currently recorded last-good boundary');
  requireMatch(operations, /in-person onboarding: not production-activated/, 'operations must distinguish onboarding source capability from production activation');
  requireMatch(operations, /Production remains beta until a separately authorized transition/, 'operations must preserve beta-until-authorized semantics');
}

module.exports = { assertProductionOperationsCompatibility };
