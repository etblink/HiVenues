# Hive-Venues Documentation Index

This index points to documents needed to interpret the **current** successor state. Superseded sequencing, temporary holds, and intermediate routing are recoverable from Git history and are not required living documentation.

## Current documents

- `../README.md` — product/developer entry point and current source boundary.
- `ROADMAP.md` — current product state and sequencing.
- `DEPLOYMENT_AGNOSTIC_VENUE_SOURCE.md` — accepted topology-independent non-secret venue-source contract.
- `PORTABLE_VENUE_WORKSPACE.md` — accepted deterministic offline workspace/build contract.
- `PRODUCTION_OPERATIONS.md` — freshly reconciled Fourth Street operating model and current durable-capability state.
- `HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_CANDIDATE_ACCEPTANCE_0_1_0.md` — accepted technical convergence candidate/evidence; production transition is withheld.
- `HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_DEPLOYMENT_PREREGISTRATION_0_1_0.md` — frozen transition contract retained for use only if a future product/operational reason reopens deployment.
- `HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR_ACCEPTANCE_0_1_0.md` — accepted HV-7 Tier-A result.
- `HV7_SECOND_VENUE_NOMINEE_JUNIPER_WORKS_REQUIREMENTS_0_1_0.md` — frozen Juniper requirements.
- `HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_ACCEPTANCE_0_1_0.md` — accepted visual-authoring foundation.
- `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md` — accepted deployment-bound canonical authoring authority baseline.
- `HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md` — accepted isolated-runtime strategy.

Accepted product-slice implementation and qualification histories remain recoverable from Git/PR history; no extra archival acceptance documents are required on living `main`.

## Current interpretation

HV-1 through HV-6 are accepted foundations. Juniper Works Cooperative is the validated **synthetic** second venue nominee; its 24 frozen requirements passed at Tier-A product-and-architecture evidence.

Fresh HV-8 Phase A is complete. Fourth Street remains healthy and coherent at:

```text
BUILD = beta-fdb5b5b
COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c
ENVIRONMENT = production
WRITE_MODE = beta
READY = ready
```

Operator-side identity agrees with the public edge. Current production has active durable Pay, onboarding, and moderation; controlled/delegated Hive authority is absent. Distriator itself is an external blockchain scanner/rebate service that Hive-Venues cannot enable or disable. Separately, Hive-Venues has a venue-level participation toggle: after a business completes Distriator onboarding, the operator may enable the local post-confirmation rebate handoff. That toggle does not guarantee that Distriator will recognize a particular transaction or issue a rebate, and the current evidence does not establish Fourth Street participation, recognition, or rebate status. HV-8 is technically qualified, but the **production transition is withheld** because deployment compatibility is not itself a product reason to replace the healthy reference deployment.

The moderated homepage community pulse is accepted at commit `9310b2784f816d531b46d35d05ab57e4f996256b` (PR #92). The owner-only Recent activity profile view is accepted at commit `16fbdaa6e3b19c1eca1550a51d83a152eb0259a9` (PR #94). Isolated venue runtime admission is accepted at commit `6b077b91cb7b958769c09befe8d0641689946a7d` (PR #96). The portable venue workspace is accepted at commit `e1d31ae7805e7387ddab1a361bb3815ed54c5aa8` (PR #98). The deployment-agnostic venue source is accepted at commit `41928f5d900bcbfc90d5edf9b1365d5dd9f7b336` (PR #100), after dual-OS qualification, an HV-2/HV-5 deployment-ID domain repair, and a clean fresh exact-head Codex review. All remained bounded source/product work with no production activation.

With that source boundary accepted, the next bounded lane is the venue-capsule CID content-identity spike: test offline whether CIDv1 deterministically binds the exact public source-plus-media bytes across deployment migrations. This is a technical-viability experiment, not IPFS product authority. The first spike cannot authorize adoption; any later adoption requires a separately frozen capability-gap workflow where CID passes and the canonical SHA-256/files/Git baseline fails under identical constraints.

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
NEXT_OPERATION = VENUE_CAPSULE_CID_CONTENT_IDENTITY__BOUNDED_SPIKE
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
VENUE_CAPSULE_CID_CONTENT_IDENTITY__BOUNDED_SPIKE
```

The accepted deployment-agnostic source canonically identifies its own JSON bytes, but same-origin public media paths still identify serving locations rather than independently proving the bytes behind them. The bounded spike therefore tests one immutable public venue capsule containing the canonical source plus public media/files under a frozen deterministic CIDv1 import profile.

The first experiment is offline only. Identical capsules must yield the same CIDv1; a one-byte mutation of the exact canonical `venue-source.json` must change the root; every included public file must independently prove byte sensitivity (one-byte mutation for every non-empty file, or adding one byte to a zero-length file); a path rename must change the root; and rebinding the unchanged capsule to distinct deployment targets must leave the capsule CID unchanged.

This spike can establish only technical viability:

```text
CID_SPIKE_PASS = ALL_CONTENT_BINDING_AND_DETERMINISM_GATES_PASS
CID_SPIKE_FAIL = ANY_REQUIRED_GATE_FAILS
CID_PRODUCT_AUTHORITY_FROM_FIRST_SPIKE = FORBIDDEN
CID_ADOPTION_GATE = SEPARATE_AUTHORIZATION_REQUIRED
```

Any later adoption gate must use a frozen canonical per-file SHA-256 + ordinary files/Git baseline and at least one pre-registered capability-gap workflow. CID advances only when CID passes that workflow and the baseline fails under the same constraints; equivalent results are explicitly **no advantage**.

No Kubo daemon, IPFS publication, pinning/provider purchase, gateway requirement, IPNS key creation/custody, DNSLink mutation, deployment, service restart, environment/symlink mutation, Hive/Keychain write, capability activation, public production authoring, secret/key change, infrastructure/router/tunnel mutation, or venue outreach is authorized.
