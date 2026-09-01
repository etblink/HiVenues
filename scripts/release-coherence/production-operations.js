'use strict';

const { requireMatch } = require('./io');

function assertProductionOperationsCompatibility({ operations }) {
  requireMatch(
    operations,
    /Runtime source identity: `\/healthz` publishes the exact deployed beta build label, commit, and tree/,
    'operations must define runtime source identity through healthz',
  );
  requireMatch(
    operations,
    /canonical-source beta manifest remains: `post`, `comment`, `vote`, `follow`, `unfollow`, `subscribe`, `unsubscribe`, `profile`, `claim-rewards`, `wall`, `inbox`, `thread`/,
    'operations must preserve the exact canonical-source beta manifest including profile',
  );
  requireMatch(
    operations,
    /^COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e$/m,
    'operations must bind the freshly observed current release',
  );
  requireMatch(
    operations,
    /^LAST_GOOD = \/opt\/hive-bar\/releases\/09ff0802bcfe8920eb88ed2f347ddd51253b524a$/m,
    'operations must bind the freshly observed last-good release',
  );
  requireMatch(
    operations,
    /^ACTIVE_BETA_ENVIRONMENT_SHA256 = c42a3062d8e54dbd6cef8f0715e93e297be50821bfa47996866cf31018db8f97$/m,
    'operations must bind the current active beta environment bytes without exposing contents',
  );
  requireMatch(operations, /^PAYMENTS_ENABLED = true$/m, 'operations must reflect currently enabled Pay');
  requireMatch(operations, /^PAYMENT_STORE_SCHEMA_VERSION = 2$/m, 'operations must reflect the observed payment store schema');
  requireMatch(operations, /^ONBOARDING_ACTIVE = true$/m, 'operations must reflect currently active onboarding');
  requireMatch(operations, /^ONBOARDING_STORE_SCHEMA_VERSION = 1$/m, 'operations must reflect the observed onboarding store schema');
  requireMatch(operations, /^MODERATION_ENABLED = true$/m, 'operations must reflect currently enabled moderation');
  requireMatch(
    operations,
    /Distriator itself does not belong in that application enabled\/disabled capability block\.[\s\S]*external service[\s\S]*Hive-Venues cannot enable or disable Distriator/i,
    'operations must preserve the external-service control boundary',
  );
  requireMatch(
    operations,
    /distinct \*\*venue participation toggle\*\*[\s\S]*business must first complete[\s\S]*Distriator onboarding/i,
    'operations must preserve the venue onboarding/participation toggle semantics',
  );
  requireMatch(
    operations,
    /historical environment-key spelling is `DISTRIATOR_ENABLED`[\s\S]*venue is onboarded for Distriator rebate participation/i,
    'operations must define the legacy key as venue participation rather than external service control',
  );
  requireMatch(
    operations,
    /^DISTRIATOR_VENUE_PARTICIPATION = NOT_ESTABLISHED_IN_CURRENT_EVIDENCE$/m,
    'operations must keep current venue participation evidence-bound',
  );
  requireMatch(
    operations,
    /^DISTRIATOR_RECOGNITION = NOT_ESTABLISHED_IN_CURRENT_EVIDENCE$/m,
    'operations must keep Distriator recognition evidence-bound',
  );
  requireMatch(
    operations,
    /^DISTRIATOR_REBATE_ISSUED = NOT_ESTABLISHED_IN_CURRENT_EVIDENCE$/m,
    'operations must keep Distriator rebate evidence-bound',
  );
  requireMatch(
    operations,
    /^HV8_REFERENCE_DEPLOYMENT_CONVERGENCE = TECHNICALLY_QUALIFIED__PRODUCTION_TRANSITION_WITHHELD$/m,
    'operations must record the withheld successor production transition',
  );
  requireMatch(operations, /Production remains beta until a separately authorized transition/i, 'operations must preserve beta-until-authorized semantics');
}

module.exports = { assertProductionOperationsCompatibility };
