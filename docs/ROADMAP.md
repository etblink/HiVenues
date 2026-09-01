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
NEXT_OPERATION = DEPLOYMENT_AGNOSTIC_VENUE_SOURCE__PRODUCT_BUILD
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
- **Portable venue workspace** — commit `e1d31ae7805e7387ddab1a361bb3815ed54c5aa8`, PR #98.

Runtime admission is the operability bridge the foundations previously lacked: an explicit non-secret validated bootstrap can drive ordinary non-Fourth-Street isolated startup without source injection. The portable workspace then adds an offline deterministic build boundary around one accepted HV-5 authoring document plus one explicit target deployment manifest, producing canonical reviewed inputs, the exact runtime bootstrap, and machine-readable file identities.

PR #98 acceptance followed dual-OS qualification and two review-driven repairs: the builder now enforces the same one-MiB bootstrap ceiling as runtime admission, and the CLI atomically claims its final output directory so its no-overwrite promise remains true under concurrent reservation.

## Current operation — deployment-agnostic venue source

```text
NEXT_OPERATION = DEPLOYMENT_AGNOSTIC_VENUE_SOURCE__PRODUCT_BUILD
```

The accepted workspace made the next semantic boundary observable. HV-5 schema v1 was intentionally frozen with:

```json
{
  "schemaVersion": 1,
  "deploymentRef": { "id": "deployment-profile-id" },
  "venueContext": {},
  "venuePackage": {}
}
```

`deploymentRef.id` is `DEPLOYMENT_OWNED`, and the real Fourth Street target is `fourth-street-privex`. Its separate deployment manifest owns Privex/provider, Node/platform, Cloudflare/Caddy topology, public hosts, `/opt/hive-bar`, service name, durable storage paths, and provenance filenames. Therefore the complete HV-5 document is correctly **deployment-bound**; it is not the byte-invariant source we want a future operator to preserve while moving a venue from a home PC to a VPS.

This is not a retroactive HV-5 failure. HV-5 correctly satisfied its frozen authoring-contract question. The new operator-choice hosting goal introduces a stronger product requirement.

The next bounded implementation must define one canonical non-secret **deployment-agnostic venue source** that:

1. contains accepted venue context/package state but no deployment reference;
2. delegates to HV-1/HV-3 validators instead of defining a shadow domain schema;
3. reuses shared secret/private rejection and deterministic canonical-JSON semantics;
4. preserves protected integration/security ownership rather than turning those fields into routine operator content;
5. binds explicitly and later to one separately validated deployment target;
6. produces the existing deployment-bound HV-5 authoring document and downstream HV-4/workspace artifacts rather than creating a second deployment system;
7. proves one byte-identical source can bind to at least two distinct valid synthetic deployment targets;
8. fails closed if binding changes venue/package identity or violates existing deployment/three-way authorities;
9. performs no network access or external mutation;
10. does not yet create starter/template taxonomy or deployment-wizard UX.

The intended dependency is:

```text
DEPLOYMENT_AGNOSTIC_VENUE_SOURCE
        |
        +--> HV1/HV3 validation + protected ownership semantics
        |
        +--> EXPLICIT_DEPLOYMENT_BINDING
                |
                +--> DEPLOYMENT_BOUND_HV5_AUTHORING
                +--> HV4_BOOTSTRAP
                +--> PORTABLE_VENUE_WORKSPACE
                +--> RUNTIME_ADMISSION
```

## Product trajectory

```text
STARTER_OR_CUSTOM_SOURCE
-> DEPLOYMENT_AGNOSTIC_VENUE_SOURCE
-> CUSTOMIZE / PREVIEW / CONFIRM
-> CHOOSE_HOME_PC / VPS / CUSTOM_SERVER
-> SELECT_OR_CREATE_DEPLOYMENT_TARGET
-> COMPILE_DEPLOYMENT_BOUND_AUTHORING + BOOTSTRAP + WORKSPACE
-> READINESS
-> GUIDED_DEPLOYMENT
-> HEALTH / BACKUP / UPDATE / ROLLBACK
```

Self-hosting and VPS hosting are both intended first-class future choices. Central hosting is not an architectural requirement. Decentralization remains available by operator choice rather than imposed as ideology.

The important portability contract is now precise: **venue source state should remain stable when only the hosting topology changes; deployment target state is expected to change.**

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
DEPLOYMENT_AGNOSTIC_VENUE_SOURCE != DEPLOYMENT_BOUND_HV5_AUTHORING
VENUE_SOURCE_PORTABILITY != DEPLOYMENT_TARGET_PORTABILITY
```

## Production and external-effect boundary

No production mutation is authorized. Do not restart the service, change environment files, move `current` or `last-good`, invoke deploy/rollback, issue Hive/Keychain writes, change current Pay/onboarding/moderation/Distriator/V1/controlled-delegated authority, mount visual authoring, change secrets/keys, mutate DNS/VPS/systemd/router/tunnel state, or perform venue outreach.

Fourth Street retains provenance-bearing Hive-Bar-era service names, release paths, identity files, host, and application tag until a separately accepted migration has a concrete reason to change them.
