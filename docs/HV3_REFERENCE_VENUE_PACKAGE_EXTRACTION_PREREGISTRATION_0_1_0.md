# HV-3 Reference Venue Package Extraction — Preregistration 0.1.0

## Status

```text
OPERATION = HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION
PREREGISTRATION_VERSION = 0.1.0
STATUS = FROZEN_PREREGISTRATION__IMPLEMENTATION_NOT_STARTED
REPOSITORY = etblink/Hive-Venues
CANONICAL_BASE_COMMIT = 6f880884e5f7320d5742e764d7e9abca4c153a22
CANONICAL_BASE_TREE = 66058ec919886f916bffb920db87baa11275240e
REFERENCE_VENUE = Fourth Street Bar, Reno
SELECTED_LANE = VENUE_PACKAGING
IMPLEMENTATION_STARTED = NO
IMPLEMENTATION_AUTHORIZED_BY_THIS_FILE_ALONE = NO
SECOND_REAL_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = FORBIDDEN
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
CI_GRAPH_RATIONALIZATION = OUTSIDE_HV3_IMPLEMENTATION_SCOPE
IPFS_KUBO_INTEGRATION = OUTSIDE_HV3_IMPLEMENTATION_SCOPE
```

This preregistration prospectively defines the bounded HV-3 implementation before any HV-3 implementation begins. It operationalizes the accepted Post-HV-2 Sequencing Decision without silently broadening the milestone into a platform rebrand, deployment migration, second-venue launch, shared-tenancy project, CI rewrite, or preview-distribution experiment.

## 1. Controlling objective

HV-1 made venue identity, public business information, Hive bindings, and payment merchant identity explicit through a validated venue context.

HV-2 made installation/deployment identity explicit through a validated deployment profile.

The remaining architectural uncertainty is the accepted `VENUE_PACKAGE` layer: strong venue-owned product expression still exists across presentation and application surfaces as direct Fourth Street content and asset references.

HV-3 must answer one bounded question:

> Can Fourth Street's authentic venue-facing product expression become an explicit validated package, consumed by reusable platform presentation, while preserving the accepted Fourth Street experience and proving a meaningfully distinct synthetic venue without a source fork?

HV-3 succeeds only if the answer is demonstrated in code and tests without changing the protected platform/security/deployment semantics described below.

## 2. Architecture under test

The accepted runtime composition remains conceptually:

```text
HIGH_ASSURANCE_PROTOCOL_SECURITY_CORE
+
PLATFORM_APPLICATION_PRIMITIVES
+
VENUE_CONTEXT
+
VENUE_PACKAGE
+
DEPLOYMENT_PROFILE
=
ONE_ISOLATED_VENUE_RUNTIME
```

`VENUE_CONTEXT` and `VENUE_PACKAGE` are separate seams.

The venue context is identity/configuration data already established by HV-1. The venue package is authored venue expression and venue-owned presentation/policy material. HV-3 must not duplicate venue-context facts into a second source of truth merely to make a package object look self-contained.

No request-time tenant selection is introduced. One process still runs one selected venue context/package/deployment composition.

## 3. Frozen ownership taxonomy

### 3.1 Platform / protocol / security core

These remain platform-owned and must not become venue-package configuration:

- Hive operation construction and semantic validation;
- Keychain custody and signing flows;
- explicit operation review before signing;
- authentication/session security semantics;
- payment replay/idempotency/observation semantics;
- moderation and encrypted-inbox security mechanisms;
- onboarding credential-generation and transaction-safety mechanisms;
- generic accessibility and responsive interaction requirements;
- generic failure-state and recovery behavior;
- source/release provenance mechanisms.

The following inherited invariants remain protected:

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

### 3.2 Venue context — HV-1 ownership

The existing validated venue context remains authoritative for facts such as:

- venue id;
- display name;
- public address;
- phone;
- hours;
- public website/map URLs;
- Hive community id;
- official Hive account;
- Threads container account;
- allowed payment merchant accounts.

HV-3 must consume these facts from the existing context rather than restating them in authored content where a direct derivation is sufficient.

### 3.3 Venue package — HV-3 ownership

The explicit venue package may own authored or curated venue-facing expression including:

- authentic venue image references and media metadata;
- hero narrative and venue-specific editorial framing;
- venue-facing section headings, captions, and authored descriptive copy where the language is genuinely venue-specific;
- gallery composition and captions;
- local visit/community framing that is not a universal platform instruction;
- venue-facing brand assets such as the reference logo;
- venue-specific product-expression defaults that are not security or deployment invariants;
- venue-facing onboarding or shell wording only where the semantic content genuinely differs by venue.

Universal interface labels and generic platform instructions should remain in reusable templates rather than being converted into a pseudo-CMS merely to eliminate literals.

Where the only varying fact is the venue's name, address, hours, phone, or another HV-1 context value, templates should normally interpolate the existing context instead of duplicating equivalent copy into the venue package.

### 3.4 Deployment profile — HV-2 ownership

The venue package must not absorb deployment-owned facts, including:

- hosting provider/package/region;
- operating system and pinned runtime installation facts;
- Cloudflare/Caddy/topology facts;
- host/origin/TLS facts;
- service/release root and health/readiness paths;
- storage database paths;
- release provenance filenames;
- last-good/rollback policy;
- deployment runtime profile names;
- automatic deployment policy.

### 3.5 Platform / lineage naming

Existing `Hive-Bar` technology, protocol, release-path, app-tag, service, storage, or provenance naming is not automatically venue-owned.

HV-3 may replace Fourth Street venue identity that is incorrectly hard-coded in reusable presentation with package/context data. It must not use that work as an excuse to rename lineage/protocol/deployment identifiers.

A successor identity/rebranding operation remains separately sequenced.

## 4. Required package contract

The implementation must introduce one explicit validated, deeply immutable venue-package abstraction following the existing repository's validation style.

The implementation should expose a clear construction/validation capability equivalent in semantics to:

```text
venuePackageSchema
createVenuePackage(input)
```

Exact filenames and helper names may vary if the implementation reveals a materially cleaner fit, but the following properties are mandatory:

- malformed authored content or asset metadata is rejected deterministically;
- package objects are deeply immutable after construction;
- package identity binds to exactly one venue id or validated venue context;
- package composition cannot silently override protected deployment/platform facts;
- consumers receive the package through explicit application composition rather than importing the Fourth Street reference package from generic modules;
- the selected package is available to view/render consumers through an explicit runtime/local seam;
- no network lookup is required to construct a package.

## 5. Fourth Street reference package

Fourth Street Bar remains the sole real reference venue in HV-3.

The implementation must create one explicit Fourth Street reference package containing or referencing the authored material necessary to preserve the current accepted presentation.

At minimum, the implementation must account for the venue-specific material currently represented in or consumed by:

```text
src/venue/reference/fourth-street.js
views/common/header.ejs
views/pages/home/index.ejs
views/pages/home/partials/hero.ejs
views/pages/home/partials/latest-updates.ejs
views/pages/home/partials/photos.ejs
views/pages/home/partials/visit.ejs
views/pages/home/partials/community.ejs
views/pages/onboarding/index.ejs
public/images/fourth-street-bar-logo.jpg
public/images/fourth-street-bar-patio.jpg
public/images/fourth-street-bar-pool-table.jpg
public/images/fourth-street-bar-bartender.jpg
public/images/fourth-street-bar-exterior.jpg
```

This list identifies known evidence-bearing surfaces; it is not authorization for arbitrary adjacent redesign.

Binary image relocation, recompression, replacement, or visual retouching is not required for HV-3. Asset files may remain at their accepted paths if the package owns the references and metadata cleanly. Avoid binary churn that adds no architectural evidence.

## 6. Reference-preservation criterion

HV-3 is an extraction milestone, not a redesign milestone.

For Fourth Street, the intended externally visible result is semantic and visual parity with the accepted reference experience except for changes strictly necessary to replace direct literals with package/context consumption.

The implementation must preserve, at minimum:

- current authentic Fourth Street photography;
- current homepage information hierarchy and venue character;
- current visit/community pathways;
- current public business facts;
- current community/Hive bindings;
- current shell usability and accessibility behavior;
- current onboarding security meaning;
- current payment and transaction semantics.

Any visually meaningful difference beyond extraction mechanics must be rejected from HV-3 or separately justified before acceptance.

## 7. Anti-genericization rule

HV-3 must not succeed by reducing Fourth Street to generic placeholder content.

Forbidden examples include:

- replacing authentic images with stock/placeholder images;
- replacing venue-specific narrative with generic "Welcome to our venue" copy;
- deleting useful local context merely because it is difficult to package;
- turning every interface string into package configuration even when it is universal platform language;
- weakening the reference homepage so the synthetic fixture becomes easier to support.

The abstraction must rise to the quality of the reference venue, not lower the reference venue to the abstraction.

## 8. Synthetic alternate-venue proof

HV-3 must include one clearly fictional, offline-only alternate venue fixture.

The fixture must:

- be unmistakably test data rather than a real business/client;
- satisfy the same validation contracts as the Fourth Street package/context;
- use meaningfully distinct display identity, authored copy, media metadata, and venue-facing expression;
- require no network access;
- require no real Hive account custody, domain, deployment, secret, or payment activity;
- use the same platform templates/controllers/composition path as Fourth Street;
- require no source fork or condition such as `if venue === fourthStreet ... else ...` in generic consumers;
- prove that package/context switching changes venue expression while protected platform semantics remain unchanged.

The fixture may use reserved/example URLs and fixture-like Hive identifiers. It is never evidence of a production-ready second venue.

## 9. No-fork and literal-containment criteria

After the extraction, generic platform consumers should not contain canonical Fourth Street literals when those literals represent venue-owned data or authored venue expression.

Remaining Fourth Street/Hive-Bar literals are acceptable only when they belong to an explicit category such as:

- the Fourth Street reference context/package itself;
- accepted deployment-profile compatibility facts;
- protocol/application-tag compatibility facts;
- production operations/provenance records;
- immutable historical documentation/evidence;
- tests that intentionally assert the reference fixture or compatibility boundary;
- visual fixture names/paths whose preservation is itself part of reference evidence.

The implementation must include a bounded literal audit or equivalent test/allowlist demonstrating that generic consumers no longer depend on unclassified venue-owned Fourth Street literals.

A source-level conditional fork keyed to Fourth Street is a failure unless it is inside the explicit reference-package definition or a reference-specific test.

## 10. Primary implementation surface

Expected implementation work is bounded primarily to:

- venue package schema/construction/reference modules under `src/venue/` or the closest existing equivalent;
- application composition/local wiring needed to expose the selected package;
- the known venue-facing templates listed above;
- focused tests/fixtures for package validation, deep immutability, reference parity, synthetic distinctness, and literal containment;
- only the visual-test fixtures/scripts actually required to validate changed surfaces.

Adjacent files may be changed only when required to preserve deterministic build/test behavior or explicit package plumbing. Such changes must be identified during review.

## 11. Explicitly out of scope

HV-3 must not perform or silently authorize:

- live Fourth Street production deployment or mutation;
- admission of a second real venue/client;
- DNS, Cloudflare, Caddy, VPS, systemd, storage-path, secret, or release migration;
- request-time shared-runtime venue selection;
- payment/onboarding/moderation durable-schema tenancy migration;
- Hive operation semantic changes;
- payment lifecycle semantic changes;
- authentication/session semantic changes;
- protocol application-tag changes;
- production service/path namespace renaming;
- package/repository global rebranding;
- dependency/runtime upgrades merely for convenience;
- wholesale CSS/theme redesign;
- image replacement, editing, or optimization unrelated to packaging;
- fleet provisioning/orchestration;
- branch-history cleanup;
- CI workflow rationalization;
- IPFS/Kubo preview or distribution integration.

Those remain separate operations even if they become attractive while HV-3 is underway.

## 12. Implementation failure conditions

The HV-3 candidate must be rejected if any of the following occurs:

1. Fourth Street reference rendering or venue character materially regresses.
2. Protected Hive/payment/auth/onboarding semantics change without separate authorization.
3. Deployment-owned HV-2 facts move into the venue package.
4. Venue-context HV-1 facts are duplicated into conflicting package sources of truth.
5. The synthetic venue requires network access, a real business identity, or real credentials.
6. Supporting the synthetic fixture requires a source fork in generic consumers.
7. Unclassified venue-owned Fourth Street literals remain in generic platform consumers.
8. The package is mutable or bypasses validation.
9. A second real venue or shared-runtime tenancy is implied by tests/documentation.
10. The extraction becomes a broad rebrand, redesign, dependency upgrade, or infrastructure migration.
11. Machine checks pass but human source/rendered review finds genericization or semantic drift.

## 13. Required deterministic qualification

The later implementation must pass the repository's deterministic quality gate on the supported qualification operating systems needed to catch portability differences, currently Ubuntu and Windows.

Required deterministic evidence must include focused tests for:

- valid Fourth Street package construction;
- invalid-package rejection;
- deep immutability;
- venue-id/context binding;
- package/deployment/platform ownership boundaries;
- offline synthetic package construction;
- synthetic/reference meaningful distinctness;
- common generic-consumer path/no source fork;
- bounded literal containment/allowlisting;
- preservation of protected security/payment/release invariants;
- no material test/coverage regression.

## 14. Purposeful visual qualification

HV-3 changes venue-facing presentation, so rendered evidence is required. However, CI ceremony is not an acceptance criterion.

Visual qualification must be selected by changed surface and failure-detection value.

At minimum:

- the Fourth Street homepage must receive the current homepage visual acceptance coverage or a successor-equivalent gate;
- shared shell/header changes must receive a rendered check that exercises the changed shell;
- onboarding presentation must receive its patron/onboarding visual gate if HV-3 changes that surface;
- the synthetic fixture must receive at least one deterministic rendered smoke/structural assertion sufficient to prove package selection without requiring live external data;
- human review of relevant Fourth Street rendered evidence is mandatory.

Unrelated historical visual suites are not automatically required merely because they exist. A full exhaustive visual graph may still be run at a release/acceptance boundary when whole-product confidence justifies its cost.

The qualification record must state which visual gates were run and why they were sufficient.

## 15. Human acceptance criteria

Before HV-3 can be accepted, Project Lead review must confirm:

- the package boundary is understandable and materially reduces hidden venue coupling;
- Fourth Street remains recognizably and substantively the same strong reference product;
- the synthetic fixture proves real abstraction rather than token substitution;
- authored venue content is package-owned while universal UX/security language remains platform-owned;
- no deployment/protocol compatibility fact was casually renamed or moved;
- no second-venue or shared-tenancy claim is overstated;
- the changed architecture is simpler to extend than the pre-HV-3 state.

Machine-green status is necessary where a gate is selected, but it is not sufficient for acceptance.

## 16. Integration protocol

The later implementation must use a clean candidate lineage from the then-current authorized canonical base or from an explicitly re-raced/rebased equivalent.

Before canonical integration:

1. freeze the exact candidate commit/tree;
2. complete required deterministic and relevant visual qualification;
3. complete human source/rendered review;
4. verify the exact aggregate diff and ancestry;
5. fresh-race canonical `main`;
6. reject/rebuild if an intervening canonical change invalidates the qualification;
7. integrate non-forcibly without an unnecessary merge commit when a clean fast-forward is available.

## 17. Preregistration non-effects

Freezing or canonically accepting this preregistration does not itself mean HV-3 implementation has started.

It does not mutate production, create a client/venue, change Hive state, publish to IPFS, install Kubo, rewrite CI, delete branches, or change deployment infrastructure.

A subsequent explicit Project Lead routing/authorization boundary must mark HV-3 implementation as authorized before implementation work begins.

## 18. Post-HV-3 decision boundary

If HV-3 is later implemented and accepted, the project must perform a fresh sequencing decision rather than automatically starting a real second venue or fleet/shared-tenancy work.

Candidate downstream questions may include:

- new-venue bootstrap/developer experience;
- a real isolated second-venue pilot;
- CI/CD graph rationalization if not already completed as separate maintenance;
- branch/ref hygiene execution;
- immutable/static preview publication such as a bounded IPFS/Kubo experiment;
- fleet operations for isolated venue instances;
- successor identity/rebranding;
- shared-runtime tenancy research only if concrete value justifies it.

None of those is selected by this preregistration.
