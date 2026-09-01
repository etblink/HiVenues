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
NEXT_OPERATION = VENUE_CAPSULE_CID_CONTENT_IDENTITY__BOUNDED_SPIKE
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
- **Deployment-agnostic venue source** — commit `41928f5d900bcbfc90d5edf9b1365d5dd9f7b336`, PR #100.

Runtime admission is the operability bridge the foundations previously lacked: an explicit non-secret validated bootstrap can drive ordinary non-Fourth-Street isolated startup without source injection. The portable workspace then adds an offline deterministic build boundary around one accepted HV-5 authoring document plus one explicit target deployment manifest, producing canonical reviewed inputs, the exact runtime bootstrap, and machine-readable file identities.

PR #98 acceptance followed dual-OS qualification and two review-driven repairs: the builder now enforces the same one-MiB bootstrap ceiling as runtime admission, and the CLI atomically claims its final output directory so its no-overwrite promise remains true under concurrent reservation.

## Current operation — venue-capsule CID content identity bounded spike

```text
NEXT_OPERATION = VENUE_CAPSULE_CID_CONTENT_IDENTITY__BOUNDED_SPIKE
```

PR #100 accepted the topology-independent venue-source boundary after dual-OS qualification, a real HV-2/HV-5 deployment-ID contract repair, and a clean fresh exact-head review. The accepted source canonically identifies its own JSON bytes and can bind later to distinct valid deployment targets without changing those upstream bytes.

That acceptance exposes a narrower unresolved content-identity problem: venue-package media uses same-origin paths such as `/images/logo.jpg`. A path identifies where a deployment serves an asset, but does not independently identify the bytes behind that path. Two deployments can therefore preserve identical source JSON while serving different public media bytes.

The bounded next experiment tests an immutable public **venue capsule**:

```text
venue-source.json
+ public venue media/files
+ frozen capsule/import profile
-> immutable root CIDv1
```

The experiment must remain offline and deterministic. It must freeze every CID-affecting import choice and establish all of the following:

1. two byte-identical capsules materialized independently yield the same CIDv1;
2. mutating one byte of the exact canonical `venue-source.json` changes the root CID;
3. **every non-empty included public file** is independently mutation-tested and a one-byte change in each changes the root CID; for any zero-length included file, adding one byte must change the root;
4. renaming any included relative path changes the root, proving the directory/file structure is bound rather than only file payloads;
5. rebinding the unchanged capsule to distinct valid deployment targets does not change the capsule CID;
6. independently mirrored copies verify to the same identity;
7. the same capsule inventory is evaluated against a frozen baseline consisting of a canonical relative-path/byte-length/per-file-SHA-256 manifest plus ordinary files/Git.

The first spike has an objective outcome and **cannot grant product authority**:

```text
CID_SPIKE_PASS = ALL_CONTENT_BINDING_AND_DETERMINISM_GATES_PASS
CID_SPIKE_FAIL = ANY_REQUIRED_GATE_FAILS
CID_PRODUCT_AUTHORITY_FROM_FIRST_SPIKE = FORBIDDEN
CID_ADOPTION_GATE = SEPARATE_AUTHORIZATION_REQUIRED
CID_CAPABILITY_GAP_REQUIRED = AT_LEAST_ONE_PRE_REGISTERED_GAP_TEST
BASELINE = CANONICAL_FILE_MANIFEST_SHA256_PLUS_ORDINARY_FILES_GIT
```

If any required spike gate fails, CID is rejected at this stage. If all pass, the only positive result is `CID_TECHNICALLY_VIABLE__NO_PRODUCT_AUTHORITY`; there is no discretionary “material advantage” adjudication.

A later CID adoption experiment may be opened only under separate authorization and must pre-register one or more of these objective capability-gap workflows before execution:

1. **HOST_INDEPENDENT_RECOVERY** — with the original web host unavailable and no Git checkout available to the recovering client, recover 100% of capsule files by the root CID from at least two independently administered storage/retrieval locations; byte-for-byte verification and the root CID must match, and loss of either one location alone must not prevent recovery.
2. **STABLE_SUBFILE_CONTENT_ADDRESS_REUSE** — for a frozen multi-chunk public media specimen, a one-byte change must preserve stable content addresses for at least 75% of unchanged payload bytes and prove those unchanged blocks can be reused without retransmission.
3. **STANDARD_NON_GIT_INTEROPERABILITY** — a clean standard IPFS client, given the root CID but no Hive-Venues-specific manifest parser and no Git repository/ref, must retrieve and verify 100% of the capsule from an independently administered location.

For any claimed gap, the corresponding baseline workflow must be run under the same input and authority constraints. `CAPABILITY_GAP = PASS` only when CID passes and the canonical SHA-256 + ordinary files/Git baseline fails that same workflow without adding a new custom content-addressed/chunked retrieval layer. If both approaches pass, the result is `CAPABILITY_GAP = NO`; if neither passes, it is `CAPABILITY_GAP = UNPROVEN`. CID can receive product authority only after all technical-viability gates pass **and** at least one pre-registered capability gap is `PASS` in that separately authorized adoption experiment.

Until then, the ordinary canonical SHA-256 plus files/Git approach remains authoritative.

IPNS is not part of the first experiment. If a mutable pointer is later justified, Hive-Venues' existing venue-owned Hive account may be a stronger update-authority candidate than introducing a second mandatory private key.

No Kubo daemon, IPFS publication, pinning/provider purchase, gateway dependency, IPNS key creation/custody, DNSLink mutation, production deployment, Hive/Keychain write, secret/private publication, real venue outreach, or external effect is authorized.

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

- **CID/IPFS/IPNS:** CIDv1 is now under a bounded offline content-identity experiment for public venue capsules. IPFS publication, provider/pinning, gateways, and IPNS remain unselected and unauthorized.
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
