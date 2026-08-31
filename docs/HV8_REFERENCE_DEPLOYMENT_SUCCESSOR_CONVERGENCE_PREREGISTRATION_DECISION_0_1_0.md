# HV-8 Reference Deployment Successor Convergence — Deployment Preregistration Decision 0.1.0

## Status

```text
OPERATION = HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE__PREREGISTRATION_DECISION
ROLE = PROJECT_LEAD_INDEPENDENT_PRODUCTION_SEQUENCING
REPOSITORY = etblink/Hive-Venues
DECISION_BASE_COMMIT = f7120f0fe18504a33bf31afd9dd1b0fa91f9d64b
DECISION_BASE_TREE = e089ec11e9e29fb6b2697ab0e2807b040344e806
HV8_READINESS_AUDIT = COMPLETE
HV8_EXACT_IDENTITY_OBSERVATION = COMPLETE__PASS
HV8_DEPLOYMENT_PREREGISTRATION_READINESS = PASS
HV8_DEPLOYMENT_PREREGISTRATION = AUTHORIZED
NEXT_OPERATION = HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE__DEPLOYMENT_PREREGISTRATION
FOURTH_STREET_DEPLOYMENT = NOT_AUTHORIZED
PRODUCTION_MUTATION = NOT_AUTHORIZED
```

This decision authorizes only the writing and qualification of a bounded production-deployment preregistration for successor convergence. It does not authorize source deployment or any production mutation.

## 1. Decision question

The question is:

> Now that the current Fourth Street running release is exactly identified and successor compatibility has passed the HV-8 read-only audit, is there enough evidence to freeze a safe, falsifiable production-convergence contract without yet touching production?

The answer is **yes**.

## 2. Evidence now available

The accepted HV-8 audit established:

```text
SOURCE_AND_ARCHITECTURE_READINESS = PASS
PRODUCTION_COMPATIBILITY = PASS_WITH_IDENTITY_OBSERVATION_HOLD
PLATFORM_REPAIR_REQUIRED = NO
RELEASE_MODEL_COMPATIBILITY = PASS
ROLLBACK_MODEL_COMPATIBILITY = PASS
BETA_ACTION_MANIFEST_DELTA = NONE
PUBLIC_PRODUCTION_VISUAL_AUTHORING_IMPLIED_BY_SOURCE_DEPLOYMENT = NO
SOURCE_REQUIRED_PRODUCTION_NAMESPACE_MIGRATION = NO
```

The subsequent exact identity observation directly established the running production process as:

```text
BUILD = beta-fdb5b5b
COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c
ENVIRONMENT = production
WRITE_MODE = beta
READY = ready
```

GitHub resolves the observed commit to that same exact tree.

The prior epistemic hold is therefore cleared rather than waived.

## 3. Why preregistration is the right next boundary

The source/deployment gap is large enough that an informal deployment plan would be inappropriate. The observed production commit is a strict ancestor of accepted successor source, while the source delta spans product presentation, successor architecture extraction, venue/package/bootstrap/authoring foundations, Juniper generality repairs, governance, tests, and release-coherence work.

That does **not** mean every source commit is a separate production migration. It means the production transition must be frozen against exact invariants before a candidate is selected or a host is touched.

A preregistration is high value because it can resolve in advance:

```text
WHAT_EXACT_OLD_RELEASE_IS_ACCEPTED_AT_ENTRY
WHAT_OPERATOR_SIDE_FACTS_MUST_BE_OBSERVED
WHAT_EXACT_NEW_CANDIDATE_CAN_BE_ELIGIBLE
WHAT_QUALIFICATION_THE_CANDIDATE_MUST_PASS
WHICH_CAPABILITIES_MUST_REMAIN_DORMANT
WHAT_READ_ONLY_DEPLOYMENT_PHASE_MUST_PROVE
WHAT_COUNTS_AS_SUCCESS_OR_AMBIGUITY
WHAT_ROLLBACK_TARGET_MUST_EXIST
WHAT_EXTERNAL_EFFECT_REQUIRES_SEPARATE_AUTHORIZATION
```

No production effect is needed to freeze those rules.

## 4. Preregistration authorization

The next operation is authorized as:

```text
HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE__DEPLOYMENT_PREREGISTRATION
```

It may:

```text
inspect accepted source and production-operating contracts
bind current public health identity
specify operator-side read-only preflight requirements
specify exact candidate-selection rules
specify deterministic/rendered qualification requirements
specify release-gate and rollback requirements
specify fail-closed stop conditions
specify later production authorization boundaries
update living routing after the preregistration is frozen
```

It may not:

```text
select moving main implicitly as a deploy target without freezing an exact commit/tree
restart production
change environment files
change current or last-good symlinks
create or remove releases on the host
invoke deploy or rollback helpers
issue Hive or Keychain writes
activate payments, Distriator, onboarding, moderation, V1, controlled/delegated modes, or production visual authoring
change secrets, keys, DNS, Cloudflare, VPS, Caddy, or systemd
```

## 5. Mandatory preregistration architecture

The preregistration must separate at least four phases.

### Phase A — operator-side read-only entry observation

Before any later mutation authorization can be considered, observe without mutation:

```text
CURRENT_SYMLINK_TARGET
CURRENT_INSTALLED_COMMIT
CURRENT_INSTALLED_TREE
PUBLIC_HEALTH_BUILD_COMMIT_TREE
PUBLIC_READY_STATUS
LAST_GOOD_SYMLINK_TARGET
LAST_GOOD_INSTALLED_COMMIT
LAST_GOOD_INSTALLED_TREE
ACTIVE_BETA_ENVIRONMENT_SHA256
ACCEPTED_READ_ONLY_ENVIRONMENT_SHA256
```

Environment **contents must not be disclosed**. Hashes and non-secret identities are sufficient.

The public health identity already observed on 2026-08-31 may be used as the current public baseline, but any actual later deployment operation must fresh-observe it at entry.

### Phase B — exact source candidate freeze and qualification

The deploy candidate must be one exact Git commit/tree, not the moving `main` label. It must prove ancestry from the observed deployed old release and bind an explicit source parent when an accepted source-only ancestry gap exists.

Because the source delta includes substantial presentation and venue-generalization changes, the candidate qualification envelope must include:

```text
DUAL_OS_DETERMINISTIC_QUALIFICATION
PINNED_CHROMIUM_RENDERED_QUALIFICATION
FOURTH_STREET_REGRESSION_EVIDENCE
HV7_JUNIPER_REGRESSION_EVIDENCE
RELEASE_COHERENCE
REFERENCE_DEPLOYMENT_PROFILE_GATE
BETA_RELEASE_GATE_REHEARSAL_WITHOUT_LIVE_WRITES
PRODUCTION_DEPENDENCY_AUDIT
```

A documentation-only qualification is insufficient for the actual deploy candidate.

### Phase C — separately authorized production transition

Only a later explicit production-mutation authorization may permit the established deployment invariant:

```text
preserve accepted beta environment byte-for-byte
activate accepted read-only deployment environment
qualify old release read-only
invoke exact deploy helper at most once
qualify exact new release while writes remain disabled
restore accepted beta environment byte-for-byte
qualify beta gate
qualify public edge behavior
```

Ambiguous external mutation is never automatically retried.

### Phase D — post-transition acceptance

A successful technical deployment is not automatically Project Lead acceptance. Post-transition evidence must bind exact build/commit/tree, readiness, edge behavior, preserved capability boundaries, and rollback identity before the successor convergence transition is accepted and living routing advances.

## 6. Dormant capabilities must stay dormant

The preregistration must explicitly prohibit source presence from becoming activation authority.

Unless separately authorized, the transition must preserve:

```text
PAYMENTS = CURRENT_ACCEPTED_PRODUCTION_STATE
DISTRIATOR = CURRENT_ACCEPTED_PRODUCTION_STATE
ONBOARDING = CURRENT_ACCEPTED_PRODUCTION_STATE
MODERATION = CURRENT_ACCEPTED_PRODUCTION_STATE
V1 = DORMANT
CONTROLLED_DELEGATED_MODES = INERT
PUBLIC_PRODUCTION_VISUAL_AUTHORING = UNMOUNTED
SERVER_HELD_HIVE_PRIVATE_KEYS = NO
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```

No migration or activation may be smuggled into a source convergence deployment merely because the code exists.

## 7. Stop conditions

The preregistration must require a hard stop before production mutation if any of these is unresolved:

```text
fresh observed old build/commit/tree differs from the preregistered entry identity
operator-side current identity disagrees with public health identity
last-good cannot be bound to an exact verified installed commit/tree
accepted environment hashes cannot be observed safely
candidate is not an exact qualified commit/tree
candidate history diverges from the deployed old release
required deterministic or rendered qualification fails
reference deployment or beta gate fails
unexpected durable-state migration is required
production authoring becomes mounted unexpectedly
payment/onboarding/moderation/V1/controlled state drifts
rollback evidence is ambiguous
```

A stop is a successful safety outcome, not pressure to weaken the gate.

## 8. Project Lead decision

```text
HV8_DEPLOYMENT_PREREGISTRATION_READINESS = PASS
HV8_DEPLOYMENT_PREREGISTRATION = AUTHORIZED
NEXT_OPERATION = HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE__DEPLOYMENT_PREREGISTRATION
DEPLOY_CANDIDATE = NOT_YET_FROZEN
PRODUCTION_MUTATION = NOT_AUTHORIZED
```

The project has enough exact evidence to design the transition rigorously. It does not yet have authorization to perform it.