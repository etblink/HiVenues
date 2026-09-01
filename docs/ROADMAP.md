# Hive-Venues Living Roadmap

This document records **current** successor state and current/next sequencing. Superseded states remain recoverable from Git history rather than being carried as living branch state.

## Current state

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

Canonical source moves independently of deployment identity. The healthy Fourth Street reference deployment remains on its observed exact release; source work may advance without implying production transition.

## Accepted platform/product state

HV-1 through HV-6 are accepted foundations. HV-7 validated Juniper Works Cooperative as a synthetic non-bar venue and passed all 24 frozen requirements at Tier-A product-and-architecture evidence. Shared-runtime tenancy remains deferred; one isolated venue per runtime remains the accepted default.

HV-8 established that the successor is technically deployable while also establishing that deployment itself would not materially improve the healthy reference product:

```text
ABILITY_TO_DEPLOY != REASON_TO_DEPLOY
PRODUCTION_TRANSITION = WITHHELD
```

Current Fourth Street production remains `beta-fdb5b5b`, commit `fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e`, with active durable Pay, onboarding, and moderation; no successor production transition is authorized.

Accepted post-foundation product/source slices are:

- **Homepage community pulse** — PR #92.
- **Owner Recent activity** — PR #94.
- **Isolated venue runtime admission** — PR #96.
- **Portable venue workspace** — PR #98.
- **Deployment-agnostic venue source** — PR #100.
- **Deployment-agnostic source authoring** — commit `a7cae27ab69eae49301f5d0279ab8c6f79254e81`, PR #102.
- **Deployment-agnostic source durability** — commit `0ac2d8c298b62efdb3f1a284caf0b62beafc7f8e`, PR #103.
- **Local operator launcher** — commit `c8587b22c68cc7983e575b813909cef9eb9a4d2e`, PR #104.

The operator-facing source path is therefore now:

```text
venue-source.json
-> LOCAL_LOOPBACK_AUTHORING
-> CUSTOMIZE / PREVIEW
-> KEEP / DISCARD
-> SAVE / REOPEN venue-source.json
-> LATER_SELECT_DEPLOYMENT_TARGET
-> EXISTING_WORKSPACE / RUNTIME_CHAIN
```

## Completed CID lane

The CID technical spike and comparative capability-gap adjudication are complete:

```text
CID_TECHNICALLY_VIABLE__NO_PRODUCT_AUTHORITY
CID_CAPABILITY_GAP = PASS__STABLE_SUBFILE_CONTENT_ADDRESS_REUSE
CID_PRODUCT_ADOPTION = DEFERRED_WITHOUT_PREJUDICE
BASELINE = CANONICAL_SHA256_PLUS_ORDINARY_FILES_GIT
```

The frozen CID construction passed determinism, byte/path sensitivity, independent materialization, and deployment-neutrality. The comparative test also demonstrated a genuine stable-subfile content-address-reuse capability that the baseline does not natively provide. Adoption remains deferred because current Hive-Venues product workflows have not justified the added Kubo/CAR/import-profile/provider complexity.

This result is evidence-responsive rather than ideological: CID/IPFS may be reconsidered if future venue workflows make the proven capability gap valuable enough to outweigh operational complexity.

## Current operation — Hive identity and key-management minimization

```text
NEXT_OPERATION = VENUE_HIVE_IDENTITY_AND_KEY_MANAGEMENT_MINIMIZATION__BOUNDED_AUDIT
```

The current operation is a bounded **Hive identity and key-management minimization** audit. It asks whether the platform can reduce ordinary merchant key-management burden while preserving useful protocol separation and automation safety.

Working hypothesis to test rather than assume:

1. **Merchant identity** — one ordinary venue account remains merchant-controlled; its Active/Owner/private posting keys are not placed on the Hive-Venues server.
2. **Community identity** — the `hive-...` protocol identity remains a recovery/ownership boundary; routine venue administration should use delegated roles where Hive supports them rather than requiring daily community-owner key handling.
3. **Threads service identity** — a dedicated low-value account may remain justified for automatic container-post lifecycle. If retained, server custody should be bounded to the minimum Posting authority needed for root-container creation/rotation; Resource Credits can be delegated instead of requiring meaningful owned stake.
4. **Container economics** — preserve legitimate reward upside while avoiding server-held merchant Active/Owner authority. Prefer direct beneficiary routing to the merchant where protocol semantics support it; any residual-balance mechanism must not widen production-server authority without explicit justification.
5. **Rotation policy** — do not invent a hard thread-count limit. Determine container rotation from actual Hive/Hivemind retrieval behavior, pagination, age, child count, or other measured operational constraints.

No Hive account, role, key, authority, community permission, server secret, or on-chain state changes during this audit.

## Beneficiary economics design boundary

The identity audit shares one protocol seam with two product beneficiary policies. They should be designed together so `comment_options` composition, beneficiary merging, total-weight bounds, disclosure, and exact-operation review are solved once.

### Venue beneficiary policy

Initial target:

```text
DEFAULT = OFF
OPERATOR_UI = OFF / ON + PERCENTAGE
RECIPIENT = DERIVED_TRUSTED_VENUE_OR_MERCHANT_IDENTITY
HIDDEN_BENEFICIARY = FORBIDDEN
USER_DISCLOSURE_BEFORE_KEYCHAIN = REQUIRED
INITIAL_SCOPE = VENUE_CONTEXT_CONTENT__TO_BE_ADJUDICATED
```

The venue may choose a beneficiary percentage for eligible user-authored venue content, but the user must see the exact economic effect before signing. The policy must not be represented as per-post optional if the venue actually requires it for publication through that venue.

### Voluntary Hive-Venues creator donation

Initial target:

```text
PLATFORM_AVAILABILITY = TOGGLEABLE
PLATFORM_PERCENTAGE = ADJUSTABLE
RECIPIENT = TRUSTED_HIVE_VENUES_CREATOR_CONFIGURATION
USER_CONTROL = PER_POST_CHECKBOX
CHECKBOX_DEFAULT = UNCHECKED
EXACT_PERCENTAGE_IN_LABEL = REQUIRED
```

A normal user should see a simple checkbox near the composer, e.g. `Donate 2% of this post's author rewards to the creator of Hive-Venues`. Participation is voluntary per post. If both venue and creator beneficiaries apply, the final signing review must show both allocations and the author's remaining share. Duplicate recipient accounts must be canonically combined at the protocol level without hiding the distinct economic reasons in the review UI. Total beneficiary weight must fail closed rather than silently rescale when it would exceed Hive limits.

No beneficiary implementation or Hive write is authorized until this design contract is adjudicated.

## Engineering-health companion operation

A bounded `TEST_SUITE_LIVE_INVARIANT_AND_CROSS_PLATFORM_SCOPE_AUDIT` will examine the deterministic suite before changing CI policy.

Current evidence says the full `npm run check`, including every `test/*.test.js`, is mirrored on Ubuntu and Windows even though many tests are platform-neutral. The audit will classify tests by:

- live invariant protected;
- unique versus duplicate evidence;
- historical defect/regression value;
- platform sensitivity;
- cost and failure-diagnostic value.

The likely target is full deterministic regression on a primary OS plus an explicit Windows portability contract, while retaining periodic/exhaustive Windows coverage until reduced-scope equivalence is proven. **No test deletion or Windows-coverage reduction is authorized by this hypothesis.**

## Product trajectory

```text
STARTER_OR_CUSTOM_SOURCE
-> DEPLOYMENT_AGNOSTIC_VENUE_SOURCE
-> LOCAL_AUTHORING / SAVE / REOPEN
-> CHOOSE_HOME_PC / VPS / CUSTOM_SERVER
-> SELECT_OR_CREATE_DEPLOYMENT_TARGET
-> COMPILE_DEPLOYMENT_BOUND_AUTHORING + BOOTSTRAP + WORKSPACE
-> READINESS
-> GUIDED_DEPLOYMENT
-> HEALTH / BACKUP / UPDATE / ROLLBACK
```

Self-hosting and VPS hosting are both intended first-class future choices. Central hosting is not an architectural requirement. Technologies are means; selection should change when a real user/operator/developer problem changes the value equation.

## Controlling rules

```text
PRODUCT_VALUE > ARCHITECTURAL_PURITY
CURRENT_OBSERVATION > HISTORICAL_PROSE
ABILITY_TO_DEPLOY != REASON_TO_DEPLOY
CANONICAL_SOURCE_IDENTITY != PRODUCTION_ACTIVATION
SOURCE_CAPABILITY_PRESENT != PRODUCTION_CAPABILITY_ENABLED
COMPATIBILITY_NAME != PLATFORM_PRODUCT_IDENTITY
ONE_VENUE_RUNTIME = VALID_DEFAULT__NOT_IDEOLOGY
DEPLOYMENT_AGNOSTIC_VENUE_SOURCE != DEPLOYMENT_BOUND_HV5_AUTHORING
VENUE_SOURCE_PORTABILITY != DEPLOYMENT_TARGET_PORTABILITY
PROTOCOL_ROLE_COUNT != DAILY_KEY_SET_COUNT
AUTOMATION_AUTHORITY = MINIMUM_REQUIRED_AUTHORITY
USER_BENEFICIARY_CONSENT = VISIBLE_EXACT_OPERATION
```

## Production and external-effect boundary

No production mutation is authorized. Do not restart the service, change environment files, move `current` or `last-good`, invoke deploy/rollback, issue Hive/Keychain writes, change account authorities or keys, activate beneficiaries, change current Pay/onboarding/moderation/Distriator/V1 behavior, mount public authoring, mutate DNS/VPS/systemd/router/tunnel state, or perform venue outreach.

Fourth Street retains provenance-bearing Hive-Bar-era service names, release paths, identity files, host, and application tag until a separately accepted migration has a concrete reason to change them.
