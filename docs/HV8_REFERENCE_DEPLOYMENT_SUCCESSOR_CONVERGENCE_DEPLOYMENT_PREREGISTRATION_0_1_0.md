# HV-8 Reference Deployment Successor Convergence — Deployment Preregistration 0.1.0

## 0. Frozen status

```text
OPERATION = HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE__DEPLOYMENT_PREREGISTRATION
ROLE = PROJECT_LEAD_PRODUCTION_TRANSITION_PREREGISTRATION
REPOSITORY = etblink/Hive-Venues
PREREGISTRATION_BASE_COMMIT = a46735ebad7f196478ece8973277f1b0a4d2390a
PREREGISTRATION_BASE_TREE = 515d87000204cc43ebe2adc5e699d8ecfac93994
REFERENCE_DEPLOYMENT = FOURTH_STREET_BAR_PRIVEX
CURRENT_PUBLIC_BUILD = beta-fdb5b5b
CURRENT_PUBLIC_COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
CURRENT_PUBLIC_TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c
CURRENT_PUBLIC_WRITE_MODE = beta
CURRENT_PUBLIC_READY = ready
DEPLOY_CANDIDATE = NOT_YET_FROZEN
PRODUCTION_MUTATION = NOT_AUTHORIZED
DEPLOY_HELPER_INVOCATION = NOT_AUTHORIZED
SERVICE_RESTART = NOT_AUTHORIZED
ENVIRONMENT_MUTATION = NOT_AUTHORIZED
HIVE_WRITE = NOT_AUTHORIZED
KEYCHAIN_REQUEST = NOT_AUTHORIZED
```

This preregistration freezes the rules for deciding whether and how the accepted Hive-Venues successor source may later converge with the real Fourth Street reference deployment.

It is intentionally written **before** an exact deploy candidate is frozen and **before** any production mutation is authorized. Its purpose is to prevent candidate convenience, deployment momentum, or unexpected host state from changing the success criteria after the fact.

## 1. Scientific/engineering question

The bounded question is:

> Can one exact accepted Hive-Venues source candidate replace the currently observed Fourth Street release while preserving the established production identity, beta self-signing behavior, custody boundaries, dormant-capability state, exact release/rollback guarantees, and real public product behavior?

This is a successor-convergence test, not permission to redesign Fourth Street production.

## 2. Known entry evidence

The read-only HV-8 audit and exact identity observation establish the public running baseline on 2026-08-31:

```text
STATUS = ok
SERVICE = hive-bar
ENVIRONMENT = production
WRITE_MODE = beta
BUILD = beta-fdb5b5b
COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c
READY = ready
```

GitHub resolves that commit to that exact tree.

The source history from the deployed commit to the HV-8 audit source was observed as a strict ancestor relationship with `ahead_by=135`, `behind_by=0`, and merge base equal to the deployed commit.

These are preregistration facts, but a later production operation must still fresh-observe entry state before mutation.

## 3. Non-goals

This transition is **not** a vehicle for:

```text
production namespace cleanup
/opt/hive-bar rename
hive-bar.service rename
application-tag rename
package-name cleanup
shared-runtime tenancy
fleet operations
payment activation
Distriator activation
in-person onboarding activation
moderation activation
V1 activation
controlled/delegated posting activation
production visual-authoring mount
new secret/key custody
DNS/Cloudflare/VPS/Caddy/systemd redesign
new venue admission or outreach
```

Compatibility/provenance names remain legitimate unless a separately evidenced defect requires migration.

## 4. Candidate-selection rule

The deploy target must be one exact immutable Git commit and tree.

```text
MOVING_MAIN_AS_DEPLOY_TARGET = FORBIDDEN
SHORT_SHA_AS_DEPLOY_TARGET = FORBIDDEN
SYNTHETIC_MERGE_AS_CANONICAL_DEPLOY_TARGET = FORBIDDEN
EXACT_FULL_COMMIT = REQUIRED
EXACT_TREE = REQUIRED
```

The candidate may be selected only after this preregistration and its living-routing reconciliation are canonically integrated and qualified.

Candidate selection must prove:

1. the candidate exists in `etblink/Hive-Venues`;
2. it has one exact tree;
3. the observed deployed commit is a strict ancestor with `behind_by=0`;
4. if the candidate's immediate parent differs from the deployed old commit, the production harness must bind the exact `SourceParentCommit` while retaining the real deployed old release as `OldCommit`;
5. no unreviewed product/source mutation may be added between candidate freeze and deployment qualification;
6. any later source change invalidates the candidate identity and requires a fresh candidate decision.

## 5. Phase A — mandatory read-only production entry preflight

Phase A is required **before any production mutation authorization**.

It must observe without mutation:

```text
PUBLIC_HEALTH_STATUS
PUBLIC_HEALTH_ENVIRONMENT
PUBLIC_HEALTH_WRITE_MODE
PUBLIC_HEALTH_BUILD
PUBLIC_HEALTH_COMMIT
PUBLIC_HEALTH_TREE
PUBLIC_READY_STATUS
CURRENT_SYMLINK_TARGET
CURRENT_INSTALLED_COMMIT
CURRENT_INSTALLED_TREE
LAST_GOOD_SYMLINK_TARGET
LAST_GOOD_INSTALLED_COMMIT
LAST_GOOD_INSTALLED_TREE
ACTIVE_BETA_ENVIRONMENT_SHA256
ACCEPTED_READ_ONLY_ENVIRONMENT_SHA256
```

Required consistency:

```text
PUBLIC_CURRENT_COMMIT == OPERATOR_CURRENT_COMMIT
PUBLIC_CURRENT_TREE == OPERATOR_CURRENT_TREE
PUBLIC_BUILD == beta-<first-seven-current-commit>
CURRENT_RELEASE_OBJECT == REVIEWED_REPOSITORY_OBJECT
LAST_GOOD_RELEASE_OBJECT == REVIEWED_REPOSITORY_OBJECT
```

The entry release is expected from current evidence to be `fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e` / `6420f0ca2392ec4ed968bc2e928151870c3b591c`, but a later operation must trust the fresh observation over this expectation.

### 5.1 Environment evidence rule

Only cryptographic hashes and non-secret metadata may be recorded.

Do **not** print or transfer:

```text
SESSION_SECRET
SSH_PRIVATE_KEYS
HIVE_PRIVATE_KEYS
CUSTOMER_PRIVATE_KEYS
RECOVERY_RECORDS
RAW_PROTECTED_ENVIRONMENT_CONTENTS
```

If environment hashes cannot be obtained without exposing protected content, stop and design a safer observation method.

### 5.2 Phase-A stop conditions

Stop before mutation if:

- public and operator-side current identities disagree;
- current is not an exact reviewed repository object;
- `last-good` is missing, malformed, or cannot be bound to an exact reviewed commit/tree;
- current write mode is not the accepted beta profile unless a separately accepted explanation exists;
- public readiness is not `ready`;
- accepted environment copies cannot be identified safely;
- host state is ambiguous.

## 6. Phase B — exact candidate qualification

The exact candidate must pass a qualification envelope appropriate to the **full deployed-to-candidate delta**, not merely the last commit.

### 6.1 Deterministic qualification

Required on the exact candidate:

```text
NODE = 24.19.0
NPM = 11.17.0
UBUNTU_DETERMINISTIC = PASS
WINDOWS_DETERMINISTIC = PASS
SECRET_SCAN = PASS
RELEASE_COHERENCE = PASS
LINT = PASS
BUILD = PASS
TESTS = PASS
PRODUCTION_DEPENDENCY_AUDIT = PASS_AT_DECLARED_THRESHOLD
```

### 6.2 Rendered qualification

Because the deployed-to-successor delta includes substantial presentation, shell, responsive, accessibility, venue-expression, HV-6 authoring, and HV-7 generality changes, exact-candidate rendered evidence is mandatory even if the final candidate-freeze commit itself changes only governance.

Required:

```text
PINNED_CHROMIUM = PASS
INHERITED_FOURTH_STREET_VISUAL_SUITES = PASS
HV7_JUNIPER_VISUAL_SUITE = PASS
ACCESSIBILITY_GATES = PASS
RESPONSIVE_GATES = PASS
PRESERVED_VISUAL_ARTIFACT = REQUIRED
PROJECT_LEAD_MANUAL_REVIEW = REQUIRED_FOR_REFERENCE_PRODUCT
```

A path classifier may not waive rendered qualification by considering only the final governance commit. The relevant classification scope is the difference between the actually deployed old release and the exact candidate.

### 6.3 Fourth Street product-regression requirements

Candidate evidence must establish that Fourth Street remains a coherent reference product, not merely that generic tests pass.

At minimum preserve:

```text
FOURTH_STREET_VENUE_IDENTITY
FOURTH_STREET_HOME_EXPRESSION
CURRENT_BETA_SIGN_IN_AND_KEYCHAIN_CUSTODY
COMMUNITY_AND_THREADS
PROFILE_AND_SETTINGS
REWARD_CLAIM_REVIEW_BOUNDARY
WALL_AND_ENCRYPTED_INBOX
TWELVE_ACTION_BETA_MANIFEST
CURRENT_PAYMENT_ACTIVATION_STATE
CURRENT_ONBOARDING_ACTIVATION_STATE
CURRENT_MODERATION_ACTIVATION_STATE
CURRENT_V1_DORMANT_STATE
NO_PUBLIC_VISUAL_AUTHORING_MOUNT
NO_PREDECESSOR_COMPATIBILITY_BREAK
```

HV-7 Juniper support must also remain intact; convergence with the reference venue must not undo the generality proof.

## 7. Phase C — release-profile rehearsal before host mutation

Before a production mutation is authorized, the candidate must be shown compatible with the exact reference deployment model and accepted runtime decisions.

Required evidence includes:

```text
REFERENCE_DEPLOYMENT_PROFILE = PASS
DEPLOYMENT_HELPER_CONTRACT = PASS
ROLLBACK_HELPER_CONTRACT = PASS
ANCESTRY_GAP_BINDING = PASS_IF_APPLICABLE
BETA_RELEASE_GATE = PASS_IN_NON_LIVE_REHEARSAL_OR_EQUIVALENT_SAFE_CHECK
PAYMENTS_STATE = EXPLICITLY_PRESERVED
DISTRIATOR_STATE = EXPLICITLY_PRESERVED
ONBOARDING_STATE = EXPLICITLY_PRESERVED
MODERATION_STATE = EXPLICITLY_PRESERVED
V1_STATE = DORMANT
CONTROLLED_DELEGATED_STATE = INERT
PUBLIC_VISUAL_AUTHORING = UNMOUNTED
```

No test may require exposing secret values in CI or repository artifacts.

## 8. Separate production-mutation authorization gate

Successful Phase A/B/C evidence still does not authorize deployment.

A later authorization must bind:

```text
EXACT_OLD_COMMIT
EXACT_OLD_TREE
EXACT_OLD_BUILD
EXACT_LAST_GOOD_COMMIT
EXACT_LAST_GOOD_TREE
ACTIVE_BETA_ENVIRONMENT_SHA256
ACCEPTED_READ_ONLY_ENVIRONMENT_SHA256
EXACT_NEW_COMMIT
EXACT_NEW_TREE
SOURCE_PARENT_COMMIT_IF_REQUIRED
EXACT_QUALIFICATION_RUNS_AND_ARTIFACTS
```

Only after that separate authorization may a production operator execute the established transition.

## 9. If later authorized: frozen production transition algorithm

The transition algorithm is inherited rather than reinvented:

```text
OBSERVE_FRESH_ENTRY
-> PRESERVE_ACCEPTED_BETA_ENVIRONMENT_BYTE_FOR_BYTE
-> ACTIVATE_ACCEPTED_READ_ONLY_ENVIRONMENT
-> RESTART_ONLY_AS_REQUIRED_BY_ACCEPTED_HARNESS
-> QUALIFY_OLD_RELEASE_READ_ONLY
-> INVOKE_EXACT_DEPLOY_HELPER_ONCE
-> QUALIFY_NEW_RELEASE_READ_ONLY
-> VERIFY_EXACT_NEW_BUILD_COMMIT_TREE
-> VERIFY_READY
-> VERIFY_VERSIONED_FIRST_PARTY_ASSETS
-> RESTORE_ACCEPTED_BETA_ENVIRONMENT_BYTE_FOR_BYTE
-> RESTART_ONLY_AS_REQUIRED_BY_ACCEPTED_HARNESS
-> QUALIFY_BETA_RELEASE_GATE
-> QUALIFY_PUBLIC_EDGE
-> PRESERVE_ROLLBACK_IDENTITY
-> STOP_FOR_PROJECT_LEAD_ACCEPTANCE
```

The deploy helper may be invoked at most once by the authorized deployment operation.

An ambiguous deploy-helper or external mutation result must **not** be automatically retried. Observe state first and route to a recovery decision.

## 10. Failure and rollback semantics

### 10.1 Pre-mutation failure

Any failed Phase A/B/C requirement results in:

```text
PRODUCTION_MUTATION = NONE
RESULT = STOPPED_SAFELY
```

### 10.2 Read-only post-switch qualification failure

Use the accepted helper/harness fail-closed behavior. Restore the exact prior installed release as defined by the qualified release machinery; do not improvise a target.

### 10.3 Restored-beta or public-edge failure

If the source switch occurred but accepted beta qualification or public-edge qualification fails, invoke only the separately authorized recovery/rollback path defined by the exact production harness. Do not issue Hive transactions to "test" recovery.

### 10.4 Ambiguous mutation

```text
AUTO_RETRY = FORBIDDEN
SECOND_DEPLOY_HELPER_INVOCATION = FORBIDDEN_WITHOUT_FRESH_ADJUDICATION
```

## 11. Durable-state rule

The HV-8 audit found no source-required durable-state migration merely from successor source presence.

Before mutation, Phase A/C must nevertheless determine whether the **actual protected production environment** currently points at any durable payment, onboarding, or moderation store.

If an active durable capability exists and the candidate implies schema/migration behavior not already proven compatible:

```text
STOP
CLASSIFY_STATE_MIGRATION
AUTHORIZE_SEPARATELY
```

Do not treat database creation or schema mutation as incidental deployment work.

## 12. Production authoring rule

HV-5/HV-6/HV-7 authoring capability remains source-side and unmounted from production HTTP entrypoints.

A successful successor convergence deployment must preserve:

```text
PUBLIC_PRODUCTION_AUTHORING = UNMOUNTED
```

Mounting it would require separate treatment of authentication, operator identity, CSRF, persistence, authorized write paths, audit/recovery, deployment, and rollback. This preregistration grants none of that authority.

## 13. Qualification evidence package

The candidate handoff must record at minimum:

```text
CANDIDATE_COMMIT
CANDIDATE_TREE
CANDIDATE_EXACT_PARENT
DEPLOYED_OLD_COMMIT
DEPLOYED_OLD_TREE
ANCESTRY_COMPARE_RESULT
DETERMINISTIC_CI_RUN_ID
UBUNTU_JOB_ID_AND_RESULT
WINDOWS_JOB_ID_AND_RESULT
RENDERED_RUN_ID
PINNED_CHROMIUM_JOB_ID_AND_RESULT
VISUAL_ARTIFACT_ID
VISUAL_ARTIFACT_SHA256
FOURTH_STREET_MANUAL_REVIEW_RESULT
REFERENCE_DEPLOYMENT_GATE_RESULT
BETA_GATE_REHEARSAL_RESULT
PRODUCTION_DEPENDENCY_AUDIT_RESULT
```

No production mutation may be bundled into candidate qualification.

## 14. Success criteria for preregistered convergence

A later production transition can be called technically successful only if all of the following hold after the authorized operation:

```text
PUBLIC_HEALTH_STATUS = ok
PUBLIC_HEALTH_ENVIRONMENT = production
PUBLIC_HEALTH_WRITE_MODE = beta
PUBLIC_HEALTH_BUILD = beta-<new-short-sha>
PUBLIC_HEALTH_COMMIT = EXACT_NEW_COMMIT
PUBLIC_HEALTH_TREE = EXACT_NEW_TREE
PUBLIC_READY_STATUS = ready
PUBLIC_EDGE = QUALIFIED
ACCEPTED_BETA_ENVIRONMENT = RESTORED_BYTE_IDENTICAL
BETA_RELEASE_GATE = PASS
ROLLBACK_IDENTITY = EXACT_AND_AVAILABLE
UNAUTHORIZED_CAPABILITY_ACTIVATION = NONE
HIVE_WRITE_BY_DEPLOYMENT_OPERATION = NONE
KEYCHAIN_REQUEST_BY_DEPLOYMENT_OPERATION = NONE
PAYMENT_MUTATION_BY_DEPLOYMENT_OPERATION = NONE
ONBOARDING_MUTATION_BY_DEPLOYMENT_OPERATION = NONE
```

Even then:

```text
TECHNICAL_DEPLOYMENT_SUCCESS != PROJECT_LEAD_ACCEPTANCE
```

A separate acceptance decision must follow.

## 15. Current preregistration conclusion

```text
HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE__DEPLOYMENT_PREREGISTRATION = FROZEN_0_1_0
CURRENT_RUNNING_RELEASE = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
CURRENT_RUNNING_TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c
DEPLOY_CANDIDATE = NOT_YET_FROZEN
NEXT_OPERATION = HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE__CANDIDATE_FREEZE_AND_QUALIFICATION
PRODUCTION_MUTATION = NOT_AUTHORIZED
```

The next bounded operation is offline candidate freeze and qualification against this contract. Production remains untouched.