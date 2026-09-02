# Hive-Venues Documentation Index

This index points to documents needed to interpret the **current** successor state. Superseded sequencing, temporary holds, and intermediate routing are recoverable from Git history and are not required living documentation.

## Current documents

- `../README.md` — product/developer entry point and current source boundary.
- `ROADMAP.md` — current product state and sequencing.
- `HIVE_IDENTITY_KEY_MANAGEMENT_MINIMIZATION_AUDIT_0_1_0.md` — accepted minimum venue Hive identity/key model and the evidence for decoupling Posting activation from optional liquid cleanup.
- `DEPLOYMENT_AGNOSTIC_VENUE_SOURCE.md` — accepted topology-independent non-secret venue-source contract.
- `DEPLOYMENT_AGNOSTIC_VENUE_SOURCE_DURABILITY.md` — accepted canonical venue-source save/open and downstream workspace bridge.
- `PORTABLE_VENUE_WORKSPACE.md` — accepted deterministic offline workspace/build contract.
- `PRODUCTION_OPERATIONS.md` — Fourth Street operating model and durable-capability state.
- `HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_CANDIDATE_ACCEPTANCE_0_1_0.md` — accepted technical convergence candidate/evidence; production transition is withheld.
- `HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_DEPLOYMENT_PREREGISTRATION_0_1_0.md` — frozen transition contract retained only if a future product/operational reason reopens deployment.
- `HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR_ACCEPTANCE_0_1_0.md` — accepted HV-7 Tier-A result.
- `HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_ACCEPTANCE_0_1_0.md` — accepted visual-authoring foundation.
- `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md` — accepted deployment-bound canonical authoring authority baseline.
- `HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md` — accepted isolated-runtime strategy.

Accepted implementation and qualification histories remain recoverable from Git/PR history; no extra archival acceptance documents are required on living `main`.

## Current interpretation

HV-1 through HV-6 are accepted foundations. Juniper Works Cooperative is the validated synthetic second-venue nominee; its 24 frozen requirements passed at Tier-A product-and-architecture evidence. HV-8 established technical successor convergence while preserving the decision that the **production transition is withheld**.

Current Fourth Street production remains independently pinned to `beta-fdb5b5b`, commit `fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e`; no successor production transition is authorized.

Post-foundation product/source progression is now:

```text
PORTABLE_VENUE_WORKSPACE = ACCEPTED
DEPLOYMENT_AGNOSTIC_VENUE_SOURCE = ACCEPTED
DEPLOYMENT_AGNOSTIC_SOURCE_AUTHORING = ACCEPTED
DEPLOYMENT_AGNOSTIC_SOURCE_DURABILITY = ACCEPTED
LOCAL_SOURCE_AUTHORING_OPERATOR_LAUNCHER = ACCEPTED
```

PR #102 accepted ordinary deployment-agnostic customize/preview/Keep/Discard authoring. PR #103 accepted durable canonical `venue-source.json` save/open plus the existing workspace bridge. PR #104 accepted a loopback-only local operator launcher that composes the real renderer and accepted source-authoring surface while forcing Hive capability off.

The CID program is complete for now:

```text
CID_TECHNICAL_VIABILITY = PASS__NO_PRODUCT_AUTHORITY
CID_CAPABILITY_GAP = PASS__STABLE_SUBFILE_CONTENT_ADDRESS_REUSE
CID_PRODUCT_ADOPTION = DEFERRED_WITHOUT_PREJUDICE
```

CIDv1 was technically viable and one genuine stable-subfile-reuse capability gap was demonstrated against the canonical SHA-256/files/Git baseline. Current product evidence does not justify adopting Kubo/CAR/import-profile/provider complexity, so ordinary SHA-256 plus files/Git remains canonical. This is a deferral, not a rejection of future CID use.

The Hive identity/key minimization audit is also complete at the repository-design level:

```text
HIVE_IDENTITY_KEY_MINIMIZATION = ACCEPTED__TWO_VENUE_IDENTITIES__ONE_SERVER_POSTING_CREDENTIAL
THREADS_ACTIVE_ACCOUNT_AUTH = OPTIONAL_CLEANUP_ONLY__NOT_POSTING_ACTIVATION_PREREQUISITE
SERVER_ACTIVE_OWNER_PRIVATE_KEY_CUSTODY = FORBIDDEN
RECURRENT_TRANSFER = NONE
```

The minimum ordinary venue model is one official/merchant identity plus one low-value Threads automation principal. Community, onboarding creator, staff/moderation, patron, payment-recipient, RC-sponsor, and recovery responsibilities remain explicit protocol/operator roles without becoming additional server private-key roles. Normal Threads-container author rewards route directly to the official venue through the 100% beneficiary policy; merchant Active account authorization is retained only as an optional Keychain-side capability for transferring stray liquid balances from the Threads account.

Canonical integrated source is moving `main`; production remains independently pinned to its observed exact release.

<!-- HV6_CURRENT_ROUTING_START -->
```text
SUCCESSOR_FOUNDATIONS = HV1_THROUGH_HV6_ACCEPTED
FOURTH_STREET_CLIENT_STATUS = FIRST_REAL_CLIENT__SOLE_REAL_CLIENT
FOURTH_STREET_DEPLOYMENT_STATUS = REFERENCE_DEPLOYMENT
HV7_SECOND_VENUE_NOMINEE = JUNIPER_WORKS_COOPERATIVE
HV7_SECOND_VENUE_NOMINEE_STATUS = VALIDATED__SYNTHETIC_TIER_A
HV7_REQUIREMENT_COUNT = 24
HV7_FROZEN_REQUIREMENT_ADJUDICATION = PASS__24_OF_24
HV8_CURRENT_RUNNING_BUILD = beta-fdb5b5b
HV8_CURRENT_RUNNING_COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
HV8_CURRENT_RUNNING_TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c
HV8_CURRENT_RUNNING_WRITE_MODE = beta
HV8_CURRENT_RUNNING_READY = ready
HV8_PHASE_A_READ_ONLY_PREFLIGHT = PASS
HV8_PRODUCTION_CAPABILITY_STATE = OBSERVED__PAYMENTS_ONBOARDING_MODERATION_ACTIVE
HV8_REFERENCE_DEPLOYMENT_CONVERGENCE = TECHNICALLY_QUALIFIED__PRODUCTION_TRANSITION_WITHHELD
VENUE_HOME_COMMUNITY_PULSE = ACCEPTED
PROFILE_RECENT_ACTIVITY = ACCEPTED
ISOLATED_VENUE_RUNTIME_ADMISSION = ACCEPTED
PORTABLE_VENUE_WORKSPACE = ACCEPTED
DEPLOYMENT_AGNOSTIC_VENUE_SOURCE = ACCEPTED
DEPLOYMENT_AGNOSTIC_SOURCE_AUTHORING = ACCEPTED
DEPLOYMENT_AGNOSTIC_SOURCE_DURABILITY = ACCEPTED
LOCAL_SOURCE_AUTHORING_OPERATOR_LAUNCHER = ACCEPTED
CID_TECHNICAL_VIABILITY = PASS__NO_PRODUCT_AUTHORITY
CID_CAPABILITY_GAP = PASS__STABLE_SUBFILE_CONTENT_ADDRESS_REUSE
CID_PRODUCT_ADOPTION = DEFERRED_WITHOUT_PREJUDICE
HIVE_IDENTITY_KEY_MINIMIZATION = ACCEPTED__TWO_VENUE_IDENTITIES__ONE_SERVER_POSTING_CREDENTIAL
THREADS_ACTIVE_ACCOUNT_AUTH = OPTIONAL_CLEANUP_ONLY__NOT_POSTING_ACTIVATION_PREREQUISITE
NEXT_OPERATION = THREADS_POSTING_ACTIVATION_LIQUID_CLEANUP_DECOUPLING__BOUNDED_REPAIR
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
PUBLIC_PRODUCTION_AUTHORING = NOT_AUTHORIZED
REAL_SECOND_VENUE_AUTHORIZED = NO
VENUE_OUTREACH = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```
<!-- HV6_CURRENT_ROUTING_END -->

## Current operation

```text
THREADS_POSTING_ACTIVATION_LIQUID_CLEANUP_DECOUPLING__BOUNDED_REPAIR
```

The next repository operation is a bounded **Posting activation versus optional liquid-cleanup readiness decoupling** repair. The accepted audit found that current Threads activation preflight correctly requires exact direct Posting authority and correctly forbids server Active/Owner/Memo credentials, but it currently also makes merchant Active account authorization a prerequisite for machine Posting readiness.

That coupling is stronger than necessary. The repair must keep machine Posting readiness scoped to the exact Threads Posting credential while moving merchant Active `account_auths` into a separate optional cleanup capability. Absence of merchant Active authorization must disable/fail-close only the manual liquid-balance transfer; it must not block Posting-only container lifecycle readiness.

Issue #110 remains the separate live-activation boundary. This routing does not authorize a real Threads key, authority mutation, signer activation, Hive transaction, RC delegation, funds movement, or production deployment.

The beneficiary economics boundary remains separately unactivated: venue beneficiary policy and voluntary Hive-Venues creator donation still require explicit disclosure and exact-operation review before any future implementation/activation.

A separate test-suite audit will classify the deterministic test inventory by live invariant and true platform sensitivity before any deletion or Windows-scope reduction.

No production deployment, Hive/Keychain write, secret/key change, account-role migration, beneficiary activation, CI-policy reduction, venue outreach, or infrastructure mutation is authorized by this routing reconciliation.
