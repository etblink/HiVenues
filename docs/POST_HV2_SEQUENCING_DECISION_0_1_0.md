# Post-HV-2 Successor Sequencing Decision 0.1.0

## Status

```text
OPERATION = POST_HV2_SEQUENCING_DECISION
STATUS = FROZEN_PROJECT_LEAD_SEQUENCING_DECISION
REPOSITORY = etblink/Hive-Venues
DECISION_BASE_COMMIT = 554e6e82a062e1fb6f6e7d5dba454f94519c1619
DECISION_BASE_TREE = 479b654fccbd52a1b5bc5183eea7f58f3195e212
HV1_VENUE_CONTEXT_FOUNDATION = ACCEPTED
HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION = ACCEPTED
SELECTED_NEXT_LANE = VENUE_PACKAGING
PROPOSED_MILESTONE = HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION
NEXT_OPERATION = HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
HV3_IMPLEMENTATION_AUTHORIZED = NO
SECOND_REAL_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
```

This record performs the fresh evidence-driven sequencing decision required after accepted HV-2. It selects the next bounded governance operation only. It does not preregister HV-3, implement HV-3, admit a second real venue, alter production, or authorize shared-runtime tenancy.

## 1. Controlling question

After HV-1 established an explicit venue-context seam and HV-2 established an explicit deployment-profile seam, which next bounded operation most directly tests the accepted successor architecture while preserving the strongest inherited product and safety evidence?

The accepted architecture is:

```text
HIGH_ASSURANCE_PROTOCOL_SECURITY_CORE
+
PLATFORM_APPLICATION_PRIMITIVES
+
VENUE_PACKAGE
+
DEPLOYMENT_PROFILE
=
ONE_ISOLATED_VENUE_RUNTIME
```

HV-1 and HV-2 made the venue-context and deployment-profile boundaries explicit. The venue-package layer remains comparatively implicit: Fourth Street identity, editorial material, photography/assets, venue-facing product expression, and some venue policy remain distributed through the inherited application even though the architecture says they are first-class venue-owned material.

The sequencing problem is therefore not simply what feature would be useful next. It is which operation best reduces the remaining architectural uncertainty without prematurely introducing a real second venue, shared runtime, or production migration.

## 2. Evidence used

This decision is based only on the current canonical successor repository and accepted project evidence, including:

- the accepted Hive-Venues successor architecture decision;
- accepted HV-1 venue-context implementation and qualification;
- accepted HV-2 deployment-profile implementation and qualification;
- the living successor roadmap and documentation index;
- preserved historical Hive-Bar product, safety, visual, release, and deployment evidence insofar as it remains relevant to accepted successor invariants.

No external source search, new third-party architecture authority, live production mutation, or second-venue evidence was introduced for this sequencing decision.

## 3. Candidate-lane adjudication

### 3.1 Successor identity and developer experience

Useful, but not selected as the immediate milestone.

Repository/package/runtime naming still contains inherited Hive-Bar identity and eventually needs a clean developer experience. However, a broad naming cleanup before the venue-package boundary is explicit risks confusing four different identities:

- platform identity;
- venue identity;
- deployment identity;
- protocol/application-tag identity.

The current Fourth Street production namespace is provenance-bearing and must not be renamed merely for source neatness. Identity cleanup is therefore better performed after the package/deployment ownership model is more explicit.

### 3.2 Venue packaging

Selected.

The accepted architecture explicitly names `VENUE_PACKAGE` as a first-class layer. The existing Fourth Street product provides unusually useful evidence for what that layer must preserve: authentic venue photography, business/community identity, local editorial framing, visit pathways, and venue-specific product character.

A bounded reference-package extraction can test whether this material can become an explicit dependency without flattening Fourth Street into a generic template and without requiring a real second venue.

This is the most direct unresolved architectural test remaining after HV-1 and HV-2.

### 3.3 Shared product quality

Important as a persistent quality track, but not selected as the next standalone architecture milestone.

Shared shell, navigation, profile density, accessibility, responsive behavior, payment safety communication, and failure-state UX remain legitimate improvement targets. They should continue to be evaluated during successor work. They do not currently provide a stronger architecture-reduction argument than making the venue-package layer explicit.

### 3.4 New venue readiness

Not yet selected for a real pilot.

A second real venue would introduce custody, business identity, configuration, operational, domain, content, and policy questions that are unnecessary for proving the package abstraction itself. A synthetic/offline alternate venue is sufficient for HV-3 qualification.

A real second-venue pilot should remain downstream of a proven venue package and isolated deployment profile.

### 3.5 Fleet operations

Deferred.

Repeatable provisioning, health, release, rollback, and upgrade management for multiple isolated venue instances becomes more meaningful after the source-level venue package and deployment profile contracts are stable.

### 3.6 Shared-runtime tenancy

Remains deferred.

Nothing in HV-1, HV-2, or this decision changes the accepted default of one isolated venue per runtime. Payment receipts, moderation state, onboarding requests, session/preflight ownership, secrets, replay/idempotency domains, and observability have not been migrated to explicit tenant ownership.

No shared-runtime implementation or schema migration is authorized.

## 4. Selected next operation

The next bounded operation is:

```text
HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_PREREGISTRATION
```

Its purpose is to freeze, prospectively and before implementation, the exact boundary for a proposed:

```text
HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION
```

The preregistration must define the operation tightly enough that implementation cannot quietly become a global rebrand, a second-venue launch, a product genericization exercise, or a shared-tenancy migration.

## 5. Required HV-3 preregistration contents

Before any HV-3 implementation begins, the preregistration must bind at least the following.

### 5.1 Exact canonical base

The preregistration must bind the exact canonical `main` commit and tree observed immediately before the preregistration write.

### 5.2 Reference package identity

Fourth Street Bar remains the reference venue and first real deployment. The preregistration must define which facts belong to the reference venue package, including as appropriate:

- venue identity and public business information;
- Hive community and official/container account bindings where venue-owned;
- approved payment merchant identity/policy where venue-owned rather than deployment-owned;
- editorial content;
- photography and other authentic venue assets;
- venue-facing brand/theme decisions;
- venue-specific feature policy defaults that are not universal safety rules.

### 5.3 Boundary against deployment profile

HV-3 must not absorb deployment-owned facts already separated by HV-2, including provider/topology, release root/service, storage paths, host/origin, runtime profile, provenance filenames, rollback policy, or other installation-specific facts except where a typed reference is required.

### 5.4 Boundary against platform/security core

HV-3 must not make venue identity a hidden dependency of reusable protocol/security mechanisms. It must preserve at least:

```text
NO_SERVER_PRIVATE_HIVE_KEYS = TRUE
NO_SERVER_HIVE_BROADCAST_RPC = TRUE
KEYCHAIN_CUSTODY = LOCAL_TO_USER
EXPLICIT_OPERATION_REVIEW = REQUIRED
AMBIGUOUS_ACCEPTANCE_AUTO_RETRY = FORBIDDEN
PAYMENT_REPLAY_PROTECTION = REQUIRED
PAYMENT_IDEMPOTENCY = REQUIRED
PAYMENT_CHAIN_CONFIRMATION = OBSERVED_NOT_ASSUMED
PRODUCTION_RELEASE_IDENTITY = EXACT
```

### 5.5 Synthetic alternate-venue proof

The preregistration must require an offline synthetic alternate venue package that proves, without network access and without a source fork, that the platform can construct a meaningfully distinct venue identity/product expression while leaving the Fourth Street reference package intact.

The synthetic package is a test fixture, not a real business and not authorization to create or operate a second venue.

### 5.6 Anti-genericization criterion

Success is not merely replacing literals with variables.

HV-3 must preserve or improve the accepted Fourth Street product character. The reference homepage, authentic photography, community/visit pathways, and other strong venue-specific work must not be degraded into generic placeholder content merely to satisfy abstraction.

Human rendered-evidence review remains required for meaningful presentation changes.

### 5.7 No-fork criterion

The synthetic alternate venue must be expressible through explicit package/configuration/content/policy inputs rather than a long-lived source-code fork. Any platform primitive that still requires direct canonical Fourth Street literals after the extraction must be identified and justified or repaired within the preregistered scope.

### 5.8 Non-effects

HV-3 preregistration and implementation must not silently authorize or perform:

- live Fourth Street production mutation;
- a second real venue;
- DNS, proxy, VPS, systemd, secret, or release migration;
- shared-runtime request-time tenant selection;
- payment/onboarding/moderation durable-schema migration;
- Hive transaction semantic changes;
- payment lifecycle semantic changes;
- package/runtime upgrades merely for convenience;
- protocol application-tag changes;
- production service/path namespace renaming.

Any such operation requires separate explicit authorization and qualification.

## 6. Qualification expectations for later HV-3 implementation

The preregistration should require the later implementation to demonstrate, at minimum:

- deterministic construction and deep immutability of the reference venue package;
- exact preservation of accepted Fourth Street venue behavior unless a specific presentation change is separately justified;
- offline construction of a synthetic alternate package;
- explicit tests for package/deployment/platform ownership boundaries;
- absence or justified containment of canonical Fourth Street literals in generic platform consumers;
- no material regression in the deterministic test suite or coverage;
- Ubuntu and Windows qualification where the repository currently requires both;
- inherited and relevant successor visual gates;
- human source and rendered-evidence review;
- a fresh canonical `main` race before integration.

Machine-green status alone remains insufficient for acceptance.

## 7. Why this ordering is preferable

The selected sequence makes the accepted architecture testable in the smallest meaningful steps:

```text
HV-1  -> explicit venue context
HV-2  -> explicit deployment profile
HV-3  -> explicit venue package
then  -> reassess bootstrap / second-venue / fleet / identity work
```

This ordering proves the source-level composition model before introducing additional real-world custody or infrastructure. It also gives later developer-experience and identity cleanup a clearer ownership model, reducing the risk that cleanup accidentally renames reference-deployment facts or erases venue character.

## 8. Explicit non-decisions

This sequencing decision does not decide:

- the exact HV-3 file layout;
- whether all venue content must live in one directory or module;
- whether future themes use CSS variables, compiled assets, or another mechanism;
- whether a real second venue will be admitted after HV-3;
- whether fleet orchestration will be built;
- whether shared-runtime multi-tenancy will ever be worthwhile;
- whether the Fourth Street production namespace should later migrate to successor-native names;
- whether IPFS or another preview/distribution mechanism should later be adopted.

Those questions remain open until evidence and a bounded authorization justify them.

## 9. Routing consequence

Upon canonical acceptance of this sequencing decision, living routing surfaces should be reconciled to:

```text
NEXT_OPERATION = HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
HV3_IMPLEMENTATION_STARTED = NO
SECOND_REAL_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
```

The preregistration must be frozen and qualified before any HV-3 implementation branch is authorized.
