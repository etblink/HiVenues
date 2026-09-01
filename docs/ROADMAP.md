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
NEXT_OPERATION = ISOLATED_VENUE_RUNTIME_ADMISSION__PRODUCT_BUILD
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
PUBLIC_PRODUCTION_AUTHORING = NOT_AUTHORIZED
REAL_SECOND_VENUE_AUTHORIZED = NO
VENUE_OUTREACH = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```
<!-- HV6_CURRENT_ROUTING_END -->

Canonical source moves independently of deployment identity. The healthy Fourth Street reference deployment remains on its observed exact release; source work may advance without implying production transition.

## Accepted foundation

HV-1 through HV-6 are accepted. HV-7 validated Juniper Works Cooperative as a synthetic non-bar venue and passed all 24 frozen requirements at Tier-A product-and-architecture evidence.

The baseline remains one isolated venue per runtime. HV-5 remains canonical authoring authority. HV-6 remains subordinate to HV-5. Shared tenancy remains deferred because there is still no authentic product requirement that justifies its additional coupling.

## HV-8 conclusion — technically qualified, transition withheld

Fresh Phase-A read-only observation closed the deployment-compatibility uncertainty rather than creating a deployment obligation. Public and operator-side identity agree on the healthy running `beta-fdb5b5b` release; `last-good` is its exact parent release; the accepted beta and read-only environment byte identities are cryptographically bound without exposing their contents.

The observation also corrected the inherited production model: Pay, onboarding, and moderation are currently active against durable state; Distriator is disabled; controlled/delegated Hive authority is absent. `docs/PRODUCTION_OPERATIONS.md` is the current operational source for those facts.

The previously qualified successor candidate remains useful technical evidence. Its successful deployment compatibility does not materially improve the product merely by being exercised against production now. The production transition is therefore withheld.

```text
ABILITY_TO_DEPLOY != REASON_TO_DEPLOY
PRODUCTION_TRANSITION = WITHHELD
```

If a future product or operational need creates a real reason to deploy, the frozen HV-8 transition contract and exact candidate evidence remain available. They do not capture current product sequencing.

## Accepted product slice — homepage community pulse

The homepage community pulse is accepted at commit `9310b2784f816d531b46d35d05ab57e4f996256b` through PR #92. It keeps official venue updates distinct, adds compact moderation-aware community activity, excludes official duplication and the Threads container, fails read lanes independently, and adds no signing authority, persistence, infrastructure, or external effect.

## Accepted product slice — profile Recent activity

The owner-only Recent activity view is accepted at commit `16fbdaa6e3b19c1eca1550a51d83a152eb0259a9` through PR #94.

The accepted slice:

1. adds owner-only `/profile/:username/activity`;
2. reads `bridge.account_notifications` through the real central read-only RPC policy;
3. presents only supported social notification types whose meaning can be stated truthfully;
4. maps only conservative safe upstream post/profile links into local routes;
5. provides ready, empty, and unavailable states without turning the rest of the profile into a failure domain;
6. makes no unread/read claim and stores no notification state;
7. adds no signer, provider, database, infrastructure, or write authority;
8. repaired an inherited mobile accessible-name defect in the shared signed-in account link.

Acceptance required dual-OS deterministic qualification, the real `HiveRpcPool` allowlist regression, full pinned-Chromium evidence, candidate-specific Axe coverage, artifact-integrity verification, PR-review reconciliation, and manual visual review. A prior green CI candidate was deliberately rejected when review found that its fake RPC fixture bypassed the real runtime allowlist; only the repaired candidate was accepted.

## Current operation — isolated venue runtime admission

```text
NEXT_OPERATION = ISOLATED_VENUE_RUNTIME_ADMISSION__PRODUCT_BUILD
```

HV-4 already validates a non-secret bootstrap with venue/package/deployment three-way binding. HV-5 already validates and canonically serializes the non-secret authoring document. HV-6 already gives ordinary operators a subordinate typed visual Apply/Discard workflow. But ordinary `startServer()` still starts through the compiled Fourth Street path; a validated second venue cannot become an isolated runtime without developer source injection.

The next bounded product build should close that gap without crossing into deployment:

1. accept one explicit non-secret venue/bootstrap source at ordinary startup;
2. parse it before venue-specific production configuration is finalized;
3. validate it through existing HV-4/HV-5/domain/deployment authorities rather than parallel schemas;
4. use existing `loadConfig(..., { venue })` and ordinary `createApp()` composition;
5. fail closed for missing, malformed, partial, unknown, or three-way-binding-incoherent explicit admission;
6. verify deployment-profile/runtime coherence before listening, including the runtime facts the existing profile already owns;
7. preserve the current Fourth Street-compatible default when no explicit admission source is configured;
8. prove a synthetic non-Fourth-Street isolated runtime starts through the ordinary path without source edits or network/external effects;
9. add no shared-runtime tenancy, venue taxonomy, public authoring, secret storage, deployment automation, or production mutation.

This is a product-operability step: make the accepted isolated-runtime architecture usable by validated data rather than requiring platform-source customization.

## Technology posture

Deferred technologies remain secondary to product need.

- **CID/IPFS/IPNS:** potentially useful later for immutable publication artifacts, portable venue packages, or content-addressed media when one of those becomes a real product need. Not selected now.
- **3Speak/SPK:** potentially useful when venue/community media becomes a concrete product lane. A future media abstraction should start from the user experience, not from provider adoption. Not selected now.
- **Production visual authoring:** the typed HV-6 source adapter is accepted, but a public operator workflow would require real authentication, authorization, draft/publish, persistence, rollback, and audit requirements. Not selected now.
- **Real second venue:** important eventual evidence that synthetic venues cannot supply. Outreach remains unauthorized and should begin when the product is ready to learn honestly from an independent operator.
- **Helia/OrbitDB:** no present requirement for offline-first peer replication or non-authoritative shared mutable venue state. Deferred.
- **Fleet/shared-runtime tenancy:** no present venue-count or operating-cost pressure that justifies increasing shared failure/custody domains. Deferred.

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

No production mutation is authorized. Do not restart the service, change environment files, move `current` or `last-good`, invoke deploy/rollback, issue Hive/Keychain writes, change current Pay/onboarding/moderation/Distriator/V1/controlled-delegated authority, mount visual authoring, change secrets/keys, mutate DNS/VPS/systemd, or perform venue outreach.

Fourth Street retains provenance-bearing Hive-Bar-era service names, release paths, identity files, host, and application tag until a separately accepted migration has a concrete reason to change them.