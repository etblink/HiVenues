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
NEXT_OPERATION = PORTABLE_VENUE_WORKSPACE__PRODUCT_BUILD
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

HV-8 established that the successor is technically deployable while also establishing that deployment itself would not materially improve the healthy reference product. The result remains:

```text
ABILITY_TO_DEPLOY != REASON_TO_DEPLOY
PRODUCTION_TRANSITION = WITHHELD
```

Current Fourth Street production remains `beta-fdb5b5b`, commit `fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e`, with active durable Pay, onboarding, and moderation; no successor production transition is authorized.

Accepted post-foundation product slices are:

- **Homepage community pulse** — commit `9310b2784f816d531b46d35d05ab57e4f996256b`, PR #92.
- **Owner Recent activity** — commit `16fbdaa6e3b19c1eca1550a51d83a152eb0259a9`, PR #94.
- **Isolated venue runtime admission** — commit `6b077b91cb7b958769c09befe8d0641689946a7d`, PR #96.

Runtime admission is the operability bridge the foundations previously lacked: an explicit non-secret validated bootstrap can now drive ordinary non-Fourth-Street isolated startup without source injection. Acceptance followed dual-OS qualification and four review-driven repairs in the real runtime graph: explicit-admission precedence, durable-store binding, non-reference release provenance, and observable Node/platform binding before listen.

## Current operation — portable venue workspace

```text
NEXT_OPERATION = PORTABLE_VENUE_WORKSPACE__PRODUCT_BUILD
```

The authoring/deployment/runtime layers are now individually sound but still developer-facing as separate files and commands.

The next bounded product build is an offline deterministic **portable venue workspace** boundary:

1. keep the validated HV-5 authoring document as canonical portable venue source;
2. keep deployment manifests/profile facts separate and target-specific;
3. accept one explicit authoring source plus one explicit target deployment definition;
4. validate through existing HV-5/HV-2/HV-4 authorities rather than duplicate schemas;
5. deterministically emit canonical reviewed source, validated target material, the exact bootstrap accepted by runtime admission, and a compact machine-readable identity/checksum manifest;
6. make workspace-local file references host-portable while leaving target release/storage/runtime paths under deployment authority;
7. make rebuild/verification offline and reproducible;
8. reject secret/private material through existing safety boundaries;
9. include no runtime databases, Hive private keys, payment secrets, production state, or other mutable operational custody;
10. do not create a template taxonomy, deployment wizard, hosting-provider dependency, shared tenancy, or production action.

The design rule is:

```text
PORTABLE_VENUE_SOURCE != PORTABLE_DEPLOYMENT_FACTS
```

A future operator should be able to preserve the same venue source while choosing or regenerating a deployment target appropriate to a home PC, VPS, or custom server. Template/starter selection and guided deployment should be built on this workspace boundary rather than around repository internals.

## Product trajectory

```text
STARTER_OR_CUSTOM_SOURCE
-> PORTABLE_VENUE_WORKSPACE
-> CUSTOMIZE / PREVIEW / CONFIRM
-> SELECT_OR_CREATE_DEPLOYMENT_TARGET
-> COMPILE_VALIDATED_BOOTSTRAP
-> READINESS
-> CHOOSE_HOME_PC / VPS / CUSTOM_SERVER
-> GUIDED_DEPLOYMENT
-> HEALTH / BACKUP / UPDATE / ROLLBACK
```

Self-hosting and VPS hosting are both intended first-class future choices. Central hosting is not an architectural requirement. Decentralization remains available by operator choice rather than imposed as ideology.

## Technology posture

Deferred technologies remain secondary to product need.

- **CID/IPFS/IPNS:** potentially useful later for immutable publication artifacts, portable assets, or resilient custody when a concrete product problem justifies them.
- **3Speak/SPK:** potentially useful when venue/community media becomes a concrete product lane.
- **Production visual authoring:** accepted source foundation exists, but public authoring requires real authentication, authorization, persistence, draft/publish, rollback, and audit work.
- **Real second venue:** important eventual evidence synthetic venues cannot supply; outreach remains unauthorized.
- **Helia/OrbitDB:** no present requirement for peer-replicated mutable venue state.
- **Fleet/shared-runtime tenancy:** no present operating pressure justifies increasing shared failure/custody domains.

Technologies are means. Selection should change when a real user/operator/developer problem changes the value equation.

## Controlling rules

```text
PRODUCT_VALUE > ARCHITECTURAL_PURITY
CURRENT_OBSERVATION > HISTORICAL_PROSE
ABILITY_TO_DEPLOY != REASON_TO_DEPLOY
CANONICAL_SOURCE_IDENTITY != PRODUCTION_ACTIVATION
SOURCE_CAPABILITY_PRESENT != PRODUCTION_CAPABILITY_ENABLED
COMPATIBILITY_NAME != PLATFORM_PRODUCT_IDENTITY
ONE_VENUE_RUNTIME = VALID_DEFAULT__NOT_IDEOLOGY
```

## Production and external-effect boundary

No production mutation is authorized. Do not restart the service, change environment files, move `current` or `last-good`, invoke deploy/rollback, issue Hive/Keychain writes, change current Pay/onboarding/moderation/Distriator/V1/controlled-delegated authority, mount visual authoring, change secrets/keys, mutate DNS/VPS/systemd/router/tunnel state, or perform venue outreach.

Fourth Street retains provenance-bearing Hive-Bar-era service names, release paths, identity files, host, and application tag until a separately accepted migration has a concrete reason to change them.
