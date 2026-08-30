# Hive-Venues Successor Architecture Decision 0.1.0

## Status

```text
STATUS = ACCEPTED_SUCCESSOR_ARCHITECTURE_DECISION
REPOSITORY = etblink/Hive-Venues
DECISION_BASE_COMMIT = ca553af0215d5d4165791a4af695b9cd70ff138c
DECISION_BASE_TREE = 15ff602871723a15557376cb59dabb151a658b47
HV1_VENUE_CONTEXT_FOUNDATION = ACCEPTED
LIVE_PRODUCTION_MUTATION_AUTHORIZED = NO
SHARED_RUNTIME_MULTI_TENANCY_AUTHORIZED = NO
SECOND_REAL_VENUE_AUTHORIZED = NO
```

This decision records the architecture chosen after the inherited Hive-Bar baseline audit, HV-1 implementation and qualification, direct source review, persistence review, release/deployment review, and human review of accepted rendered evidence.

It governs the successor project; it does not rewrite historical Hive-Bar milestone evidence.

## 1. Product objective

Hive-Venues is not constrained to making the inherited application multi-tenant. The project objective is to produce the highest-quality venue community product that can be responsibly reused across independent venues.

The successor may preserve, refactor, replace, or reconstruct inherited layers according to evidence. Existing behavior is not protected merely because it is old. Existing behavior that has strong safety, protocol, usability, or operational evidence should not be discarded merely to make the architecture look cleaner.

Fourth Street Bar is the reference venue and first real deployment. It is neither a disposable demo nor the universal platform definition.

## 2. Chosen strategy: hybrid preservation and reconstruction

The successor will use a hybrid strategy:

```text
PRESERVE_HIGH_ASSURANCE_ENGINES
+
RECONSTRUCT_PLATFORM_AND_DEPLOYMENT_BOUNDARIES
+
PRESERVE_OR_IMPROVE_STRONG_VENUE_PRODUCT_WORK
```

The inherited codebase contains unusually strong transaction, payment, authorization, failure-state, accessibility, provenance, and deployment-safety machinery. Those properties are assets.

The inherited repository also contains extensive coupling between Fourth Street identity and platform configuration, release policy, filesystem namespaces, documentation, and operational assumptions. Those are not universal platform invariants.

The successor should therefore rebuild around proven machinery rather than either (a) performing a global rebrand in place or (b) rewriting the entire application from scratch.

## 3. Default runtime architecture

The default near-term architecture is:

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

### 3.1 High-assurance protocol/security core

This layer includes reusable mechanisms such as:

- Hive read services and bounded RPC behavior;
- deterministic Hive operation construction and fingerprints;
- Keychain-local signing and authority separation;
- server-verified sessions and request ownership;
- explicit review before signing;
- no server private Hive keys;
- no server broadcast RPC implementation;
- no automatic rebroadcast after ambiguous acceptance;
- independent post-signing observation;
- payment invoice validation, idempotency, receipt state, replay prevention, and observation;
- defensive input normalization and sanitization;
- release identity/provenance mechanisms as a concept.

Venue identity must not be introduced into these mechanisms unless a protocol operation genuinely requires a venue-scoped input.

### 3.2 Platform application primitives

This layer composes common application behavior: authentication, social surfaces, profile/wallet presentation, payment UX primitives, moderation/onboarding services, navigation, accessibility, and shared visual foundations.

These primitives may be redesigned where doing so improves the product. Their public behavior remains subject to safety and regression evidence.

### 3.3 Venue package

A venue package owns venue-specific product expression and policy, including as appropriate:

- venue identity and public business information;
- Hive community and official/container account bindings;
- approved payment merchant accounts;
- venue-local editorial content;
- real photography and other venue assets;
- brand/theme decisions;
- venue-specific feature policy defaults where they are not universal security rules.

Venue specificity is not a defect. A good venue package should make a venue feel like itself rather than like a generic reskin.

The current Fourth Street homepage is evidence for this principle: its authentic photography, neighborhood/venue framing, and visit/community pathways are useful reference-venue product work and should be preserved or improved, not erased solely for genericity.

### 3.4 Deployment profile

A deployment profile owns environment- and installation-specific facts, including as appropriate:

- public host and application origin;
- provider, region, OS, proxy, and network topology;
- service name and release root;
- persistent storage paths;
- application/protocol release tag;
- health/readiness paths;
- rollback and exact-commit deployment policy;
- expected runtime profile and feature activation decisions.

The current Fourth Street Privex deployment values are reference-deployment facts, not universal Hive-Venues constants.

### 3.5 One venue per runtime by default

A running instance must initially resolve exactly one validated venue package and one validated deployment profile at process construction/startup.

HV-1 does not authorize hostname, path, header, cookie, or request-time tenant switching.

A fleet may eventually run many isolated venue instances from the same platform source. That is sufficient to establish a genuine multi-venue product without forcing unrelated venues to share process memory, secrets, durable databases, or failure domains.

## 4. Why shared-runtime multi-tenancy is deferred

The inherited durable stores are strong but single-venue in schema and semantics. Payment receipts, local moderation state, and onboarding requests do not currently carry a venue identifier. Session/preflight and deployment assumptions are also constructed around one application identity.

Therefore, putting multiple real venues into one runtime now would require more than routing. It would require explicit tenant ownership and isolation across durable state, idempotency/replay domains, sessions, feature policy, secrets, observability, and operational recovery.

Until such work has a concrete product benefit and its own migration plan:

```text
SHARED_RUNTIME_TENANCY = DEFERRED
ISOLATED_VENUE_RUNTIME = DEFAULT
```

No future decision is prohibited. The burden is simply on shared tenancy to demonstrate that its value exceeds the additional security and migration complexity.

## 5. Fourth Street compatibility policy

The existing Fourth Street production namespace is provenance-bearing. Paths and names such as `/opt/hive-bar`, `hive-bar.service`, `.hive-bar-commit`, `.hive-bar-tree`, current storage paths, `fourthstreetbar.com`, and the current Fourth Street Hive application tag must not be casually renamed in the live deployment.

The successor may represent those values through a clean reference deployment profile while preserving the exact existing values.

A later migration to successor-native service/path names requires a separately bounded, rollback-qualified production migration. Source cleanup alone does not authorize that migration.

## 6. Product-quality policy

The successor is authorized to improve the whole product, not merely configuration or tenancy.

Evidence from the inherited application supports selective preservation:

- the Fourth Street homepage has strong venue-specific content and visual hierarchy;
- Pay communicates review, merchant identity, local QR handling, and duplicate-payment safety well;
- mobile presentation is generally coherent;
- accessibility and failure-state behavior are extensively tested.

Evidence also supports future redesign work:

- repository/package/developer identity still says Hive-Bar in many living surfaces;
- shared shell/navigation can better separate venue identity from Hive implementation identity;
- some desktop social/profile layouts underuse space and expose implementation lineage too prominently;
- release and configuration code confuses reference-deployment facts with universal platform rules.

Accordingly, future UX work should preserve interaction and safety invariants while being free to reconstruct presentation where human review supports improvement.

## 7. Preserved safety invariants

Unless a separately authorized operation proves a safe supersession, successor work must preserve at least:

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
PRODUCTION_MUTATION = SEPARATELY_AUTHORIZED
```

An abstraction is not successful if it weakens these properties.

## 8. Immediate sequencing consequence

The next bounded implementation operation is:

```text
HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION
```

Its purpose is to establish a validated deployment-profile boundary and express the existing Fourth Street/Privex production assumptions through that boundary without changing their accepted values or touching production.

HV-2 must be preregistered before implementation and must not:

- deploy or mutate the live Fourth Street service;
- add a second real venue;
- introduce request-time tenant selection;
- change transaction or payment semantics;
- change durable database schemas;
- change the Fourth Street Hive application tag;
- rename the live service/release/storage namespace;
- weaken the existing release gates.

The existing `ops/privex/manifest.json` is a strong candidate source for the reference deployment profile because it already represents reviewed topology and release policy as data. HV-2 should prefer eliminating duplicated literals over inventing another parallel constant system.

## 9. Later sequencing is evidence-driven

After HV-2, sequencing will be re-adjudicated. Candidate lanes include:

- successor package/repository/developer identity cleanup;
- venue content/asset packaging;
- shared shell and navigation reconstruction;
- profile/social desktop quality work;
- developer/bootstrap tooling for a new isolated venue deployment;
- first second-venue pilot;
- fleet/orchestration tooling;
- only if justified, tenant-scoped persistence and shared-runtime research.

This list is not a preregistered order and does not pre-authorize any lane.

## 10. Success criterion

The successor architecture succeeds when independent venues can receive high-quality, venue-specific products from one rigorously maintained platform lineage without sacrificing transaction safety, operational isolation, or the character of each venue.
