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
HV8_DEPLOYMENT_PREREGISTRATION = FROZEN_0_1_0
HV8_DEPLOY_CANDIDATE = 02ac081d2cfaee599f98e4fb8d9367638cd8d500
HV8_DEPLOY_CANDIDATE_TREE = 49b7b561af89fc99534d2a2974215bfe7a3db3c3
HV8_CANDIDATE_QUALIFICATION = PROJECT_LEAD_ACCEPTED
NEXT_OPERATION = HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE__PHASE_A_READ_ONLY_PRODUCTION_PREFLIGHT
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
PUBLIC_PRODUCTION_AUTHORING = NOT_AUTHORIZED
REAL_SECOND_VENUE_AUTHORIZED = NO
VENUE_OUTREACH = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```
<!-- HV6_CURRENT_ROUTING_END -->

Canonical source moves independently of deployment identity. Resolve exact `main` whenever qualifying; never use the moving branch label as a deploy target. The accepted HV-8 target is the exact historical candidate above.

## Accepted foundation

HV-1 through HV-6 are accepted. HV-7 validated Juniper Works Cooperative as a synthetic non-bar venue and passed all 24 frozen requirements at Tier-A product-and-architecture evidence.

The baseline remains one isolated venue per runtime. HV-5 remains canonical authoring authority. HV-6 remains subordinate to HV-5. Shared tenancy remains deferred.

## Current Fourth Street production identity

Current evidence binds the running reference deployment to:

```text
BUILD = beta-fdb5b5b
COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c
ENVIRONMENT = production
WRITE_MODE = beta
READY = ready
```

Phase A must freshly re-observe these facts rather than treating this roadmap as operational proof.

## HV-8 deployment preregistration — FROZEN

The controlling prospective production-transition contract is:

```text
docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_DEPLOYMENT_PREREGISTRATION_0_1_0.md
```

The accepted exact candidate and qualification result are:

```text
docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_CANDIDATE_ACCEPTANCE_0_1_0.md
```

The candidate passed Ubuntu and Windows deterministic qualification, 631/631 tests, zero production dependency vulnerabilities, the complete pinned-Chromium evidence chain, artifact integrity verification, Project Lead manual visual review, strict deployed-old ancestry, and the non-live production-harness contract rehearsal.

## Current operation — Phase A read-only production preflight

```text
NEXT_OPERATION = HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE__PHASE_A_READ_ONLY_PRODUCTION_PREFLIGHT
```

Before any production mutation can be considered, Phase A must freshly establish without mutation:

- public health status, environment, write mode, build, commit, tree, and readiness;
- operator-side `current` target plus exact installed commit/tree;
- operator-side `last-good` target plus exact installed commit/tree;
- SHA-256 of the active accepted beta environment;
- SHA-256 of the accepted read-only environment;
- agreement between public and operator-side release identity.

Only hashes and non-secret metadata may be recorded. Protected environment contents, session secrets, SSH keys, Hive private keys, customer private keys, and recovery material must not be exposed. Any ambiguity is a hard stop.

The canonical deployment harness's existing `Observe` mode is for an already-installed new candidate and is not a substitute for this pre-deployment old-release entry observation.

## Controlling rules

```text
CURRENT_OBSERVATION > HISTORICAL_PROSE
EXACT_FROZEN_CANDIDATE != MOVING_MAIN
CANONICAL_SOURCE_IDENTITY != PRODUCTION_ACTIVATION
SOURCE_CAPABILITY_PRESENT != PRODUCTION_CAPABILITY_ENABLED
COMPATIBILITY_NAME != PLATFORM_PRODUCT_IDENTITY
DEPLOYMENT_QUALIFIED != DEPLOYMENT_AUTHORIZED
TECHNICAL_DEPLOYMENT_SUCCESS != PROJECT_LEAD_ACCEPTANCE
```

## Production boundary

No production mutation is authorized. Do not restart the service, change environment files, move `current` or `last-good`, invoke deploy/rollback, issue Hive/Keychain writes, activate Pay/Distriator/onboarding/moderation/V1/controlled-delegated state, mount visual authoring, change secrets/keys, or mutate DNS/VPS/systemd.

Fourth Street retains provenance-bearing Hive-Bar-era service names, release paths, identity files, host, and application tag until a separately accepted migration changes them.

## Deferred lanes

A real second venue/operator, package/developer identity cleanup, CID/IPFS, 3Speak/SPK, and production visual authoring remain eligible or potentially useful but are not selected while reference-deployment convergence is active.

Fleet operations, Helia/OrbitDB replication, and shared-runtime multi-tenancy remain deferred.
