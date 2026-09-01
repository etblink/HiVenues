# Hive-Venues Documentation Index

This index points to documents needed to interpret the **current** successor state. Superseded sequencing, temporary holds, and intermediate routing are recoverable from Git history and are not required living documentation.

## Current documents

- `../README.md` — product/developer entry point and current source boundary.
- `ROADMAP.md` — current product state and sequencing.
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
NEXT_OPERATION = VENUE_HIVE_IDENTITY_AND_KEY_MANAGEMENT_MINIMIZATION__BOUNDED_AUDIT
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
VENUE_HIVE_IDENTITY_AND_KEY_MANAGEMENT_MINIMIZATION__BOUNDED_AUDIT
```

The current lane is a bounded **Hive identity and key-management minimization** audit. It does not change any Hive account, authority, key, community role, beneficiary, server secret, or production behavior.

The audit will distinguish protocol identities from ordinary operator key burden; evaluate the dedicated Threads account as a Posting-only automation principal for container lifecycle; keep the merchant account under merchant custody; preserve the community identity as a protocol/recovery boundary; and evaluate delegated RC, reward routing, and beneficiary composition without granting the server merchant Active/Owner authority.

The same design boundary will adjudicate two separate beneficiary policies:

- a venue beneficiary policy configured by the venue and plainly disclosed to the posting user;
- a voluntary Hive-Venues creator-donation beneficiary controlled by an unchecked per-post user checkbox.

A separate test-suite audit will classify the 700-test deterministic inventory by live invariant and true platform sensitivity before any deletion or Windows-scope reduction.

No production deployment, Hive/Keychain write, secret/key change, account-role migration, beneficiary activation, CI-policy reduction, venue outreach, or infrastructure mutation is authorized by this routing reconciliation.
