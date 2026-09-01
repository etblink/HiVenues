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
NEXT_OPERATION = VENUE_HOME_COMMUNITY_PULSE__PRODUCT_BUILD
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

## Current operation — community pulse product build

```text
NEXT_OPERATION = VENUE_HOME_COMMUNITY_PULSE__PRODUCT_BUILD
```

The highest-value immediate uncertainty is product vitality: can a venue's front door make its Hive community feel active and worth revisiting rather than presenting only venue-authored announcements?

The smallest honest build is to use capabilities already present and trusted:

1. keep official venue updates as an editorial voice;
2. add a compact read-only community pulse drawn from the venue Hive community;
3. reuse the existing merchant-local moderation policy rather than inventing a homepage moderation path;
4. exclude duplicate official-account roots and the dedicated Threads container from the pulse;
5. fail soft and independently if either official updates or community activity is temporarily unavailable;
6. preserve one clear venue-led visual hierarchy and accessible browser behavior;
7. add no signing authority, persistence, infrastructure, or external effect.

This is ordinary product engineering, not a new governance program. Browser evidence should decide visual quality after deterministic tests pass.

## Technology posture

Deferred technologies were reconsidered only far enough to choose the next product lane. None currently beats the community-pulse build on expected user value per unit complexity.

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
