# Hive-Venues Living Roadmap

This is the living current/next sequencing document for the successor repository. Historical Hive-Bar milestones, prior successor preregistrations, and prior sequencing decisions preserve accepted evidence and past authorization boundaries but do not redefine this roadmap.

## Current state

```text
REPOSITORY = etblink/Hive-Venues
PRODUCT = Hive-Venues
REFERENCE_VENUE = Fourth Street Bar, Reno
SOURCE_LINEAGE = etblink/Hive-Bar
HV1_VENUE_CONTEXT_FOUNDATION = ACCEPTED
HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION = ACCEPTED
HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION = ACCEPTED
HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION = ACCEPTED
POST_HV3_SEQUENCING_DECISION = HISTORICAL_ACCEPTED__SUPERSEDED_FOR_CURRENT_ROUTING
POST_HV4_SEQUENCING_DECISION = ACCEPTED
SELECTED_NEXT_LANE = CANONICAL_VENUE_AUTHORING_CONTRACT
PROPOSED_MILESTONE = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION
NEXT_OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
GRAPESJS = EVALUATION_CANDIDATE__NOT_SELECTED_DEPENDENCY
OPTIONAL_STARTER_ARCHETYPES = SUPPORTING_FIXTURES__NONAUTHORITATIVE
SECOND_REAL_VENUE = DEFERRED_ONE_GATE
SECOND_REAL_VENUE_AUTHORIZED = NO
CID_PUBLICATION = ELIGIBLE_DOWNSTREAM__NOT_SELECTED
IPNS = ELIGIBLE_AFTER_CID_ARTIFACT__NOT_SOURCE_IDENTITY
THREESPEAK_SPK_MEDIA = ELIGIBLE_DOWNSTREAM__NOT_SELECTED
FLEET_OPERATIONS = DEFERRED
HELIA_ORBITDB_REPLICATION = DEFERRED
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```

Canonical source moves independently of milestone identities. Resolve exact current `main` commit/tree from GitHub when qualifying or releasing.

## Accepted successor sequence

### HV-0 — Successor migration and baseline — COMPLETE

Preserved the original Hive-Bar Git object graph, established Hive-Venues as the successor repository/product identity, and froze the inherited assurance baseline.

### HV-1 — Venue Context Foundation — COMPLETE

Established a validated, deeply frozen venue context and explicit application injection for venue identity, public business facts, Hive bindings, and merchant identity. It proved an alternate synthetic venue context offline without introducing shared-runtime multi-tenancy.

### HV-2 — Reference Deployment Profile Extraction — COMPLETE

Established a validated, deeply immutable deployment profile compiled from the reviewed Fourth Street/Privex manifest while preserving exact reference behavior and provenance-bearing compatibility names. It separated deployment-owned facts from venue identity and platform logic.

### HV-3 — Reference Venue Package Extraction — COMPLETE

Accepted clean implementation:

```text
PARENT = b5901cf6f4a603df11eca5c942d63caad5f009a8
COMMIT = 291b93c696c6265c2da4ad5caaaaee9701cb69a8
TREE = b39401e8154545bec2e6704455b53c3b8938b5b6
QUALIFICATION_PR = 14
QUALIFICATION_CI_RUN = 33327969282
```

HV-3 introduced a strict, deeply immutable venue-package abstraction; bound authored expression/media to venue identity; migrated selected reusable presentation surfaces away from hidden Fourth Street literals; preserved Fourth Street's authentic presentation; and proved a meaningfully distinct fictional alternate package offline without a source fork.

Acceptance details live in `HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_ACCEPTANCE_0_1_0.md`.

### HV-4 — Isolated Venue Bootstrap Foundation — COMPLETE

Accepted implementation:

```text
AUTHORIZED_BASE = 20590dff2222a6dc855fabb9f0c4f8cb37cc2670
IMPLEMENTATION_COMMIT = c59f6aac948e5be59647694b3b60310d2b8faa30
IMPLEMENTATION_TREE = dd74fa3944b348d86e9bef7c827a13cb8ab21ee2
QUALIFICATION_PR = 22
QUALIFICATION_CI_RUN = 33334114135
ACCEPTANCE_RECORD_TREE = 1113150e749c1071809d7b10af953c9f965e1b47
```

HV-4 established a strict offline bootstrap envelope that:

- delegates venue, package, and deployment validation to the accepted HV-1/HV-3/HV-2 authorities rather than creating parallel domain schemas;
- requires explicit venue/package/deployment composition bindings and fails closed on mismatch;
- rejects secret-bearing fields, recognizable private-key material, URL userinfo credentials, and sensitive URL query-parameter names before review output;
- emits deeply immutable composition and deterministic canonical review JSON;
- proves a meaningfully non-bar Lantern Room isolated composition with one test-only deployment and no source fork;
- proves that the valid Fourth Street deployment manifest cannot be silently paired with Lantern Room under conflicting bindings;
- preserves Fourth Street production compatibility paths, service names, storage locations, provenance names, host/application identity, and runtime semantics;
- changes no production system and admits no real second venue.

Acceptance details live in `HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_ACCEPTANCE_0_1_0.md`.

## Current architecture baseline

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
+
BOOTSTRAP_COMPOSITION_BINDINGS
=
ONE_ISOLATED_VENUE_RUNTIME
```

The core ownership seams and deterministic bootstrap composition exist. The accepted Post-HV-4 Sequencing Decision identifies the next uncertainty as **authoring ownership**: what an operator may edit, what is derived, what is platform/deployment/security authority, and how multiple authoring surfaces converge on one canonical validated representation.

## Post-HV-3 Sequencing Decision — COMPLETE / HISTORICAL

The accepted Post-HV-3 decision correctly selected isolated-venue bootstrap and successor DX, leading to HV-4. That decision is preserved in `POST_HV3_SEQUENCING_DECISION_0_1_0.md` but is superseded for current routing.

It must not be rewritten to pretend it anticipated or selected the post-HV-4 lane.

## Post-HV-4 Sequencing Decision — COMPLETE / CURRENT

The accepted decision is preserved in `POST_HV4_SEQUENCING_DECISION_0_1_0.md`.

It selects:

```text
SELECTED_NEXT_LANE = CANONICAL_VENUE_AUTHORING_CONTRACT
PROPOSED_MILESTONE = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION
NEXT_OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
```

The selected lane is deliberately narrower than “build a visual editor.” HV-5 must define the canonical, editor-independent authoring contract first. GrapesJS is an evaluation candidate for a later adapter, not a selected dependency or source of truth.

## Venue-category boundary after HV-4

Hive-Venues is intended to support independently branded venue applications beyond Fourth Street. Current evidence still does **not** provide a canonical exhaustive venue taxonomy.

Therefore the platform core remains venue-type neutral:

- no mandatory `bar | restaurant | club | cafe | band | streamer | news | store | ...` enum is inferred merely for abstraction;
- generic platform/security code must not depend on bar-specific nouns or category branching;
- venue package content may provide authentic operator/staff/customer vocabulary where it genuinely differs;
- starter archetypes may be evaluated as optional authoring conveniences or capability bundles rather than platform identity;
- hybrid real-world entities are expected to cross category boundaries, which argues against making a starter taxonomy authoritative.

## HV-5 — Venue Authoring Contract Foundation — PREREGISTRATION NEXT

The next bounded operation is only:

```text
HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION
```

The preregistration must freeze at least:

- one versioned canonical persisted authoring representation independent of any particular editor framework;
- stable schema/component identities and future migration policy;
- explicit ownership classes for operator-authored, derived, platform-fixed, deployment-owned, security-privileged, and secret/private-forbidden values;
- deterministic compilation through the existing HV-1 venue-context, HV-3 venue-package, and HV-4 bootstrap authorities rather than parallel validators;
- deployment-profile treatment as deployment authority/reference by default, not ordinary visual-editor state;
- deterministic serialization and round-trip meaning preservation;
- preview that renders only validated canonical state and does not create a second configuration authority;
- an advanced source/code escape hatch using the same canonical representation and validators;
- a component/capability contract that forbids arbitrary executable script injection;
- at least one meaningfully non-bar fixture;
- optional starter archetypes as non-authoritative convenience evidence;
- an explicit GrapesJS evaluation gate distinguishing core GrapesJS from Studio SDK and addressing persistence, licensing/deployment, component constraints, assets, sanitization, accessibility, and editor-state authority.

Freezing the preregistration does **not** authorize substantive HV-5 implementation.

## Candidate-lane dispositions after the Post-HV-4 decision

### Real isolated second-venue pilot — DEFERRED ONE GATE

A real second venue remains the strongest downstream falsification test. It is deferred only because no suitable real venue is currently identified/authorized and the operator authoring boundary is still implicit. After HV-5, the next sequencing decision should strongly prefer a real pilot if one is available. If a suitable real pilot becomes concretely available before HV-5 implementation begins, sequencing may be reopened rather than forcing an artificial delay.

### GrapesJS / WYSIWYG — EVALUATION CANDIDATE, NOT SELECTED DEPENDENCY

The desired dependency direction is:

```text
HIVE_VENUES_CANONICAL_AUTHORING_CONTRACT
-> validated venue/package/bootstrap authorities
-> optional source/code authoring
-> optional visual-editor adapter
```

not:

```text
EDITOR_INTERNAL_MODEL
-> becomes platform source of truth
```

GrapesJS may be evaluated only under the HV-5 preregistration contract.

### Optional archetype/capability starters — SUPPORTING FIXTURES

Bar, band, streamer/influencer, news, digital store, and hybrid examples remain useful convenience/evidence layers but are not a mandatory core taxonomy.

### Successor package/developer identity cleanup — ELIGIBLE ADJACENT MAINTENANCE

Developer-facing inherited `hive-bar` package metadata remains a known mismatch. It is distinct from Fourth Street's intentionally preserved production compatibility namespace and may be corrected in bounded maintenance when proven safe.

### CID / IPFS / IPNS publication — ELIGIBLE DOWNSTREAM

The preferred future provenance model remains:

```text
GIT_COMMIT_SHA = source/provenance event
GIT_TREE_SHA = exact source tree
ARTIFACT_DIGEST = exact deterministic publication payload
CID = immutable content-addressed publication identity
IPNS = optional mutable name pointing to successive immutable CIDs
```

A publication operation must first define the exact deterministic public artifact. IPNS does not replace Git source identity and its signing-key custody requires a separate operational boundary.

### 3Speak / SPKNetwork — ELIGIBLE DOWNSTREAM

Interesting as a venue/creator media capability, storage, encoding, or delivery layer. It must not become authoritative for Hive private keys, authentication, payments, onboarding custody, or other protected private state.

### Fleet operations — DEFERRED

Fleet tooling should follow a stable authoring contract and preferably at least one real second-venue deployment rather than automate a still-developer-oriented workflow prematurely.

### Helia + OrbitDB replicated state — DEFERRED

Requires a concrete non-authoritative mutable data domain with explicit privacy, access-control, conflict-resolution, and product-value justification. Canonical Hive state, payment receipts, auth/session authority, and onboarding credential custody are not candidates by default.

### Shared-runtime multi-tenancy — DEFERRED

No current evidence justifies weakening one-isolated-venue-per-runtime. Payment, moderation, onboarding, session/preflight, secret, replay/idempotency, and observability ownership are not tenant-migrated.

### Continuity branch-to-tag migration — OPTIONAL MAINTENANCE

The four `continuity/*` refs remain out of the substantive roadmap. They may later become milestone tags after exact semantic verification.

### Shared product quality — PERSISTENT TRACK

Accessibility, responsive behavior, navigation, social/profile composition, payment safety communication, onboarding clarity, and reference-venue quality remain continuous acceptance concerns.

## Production lineage boundary

Fourth Street's existing production environment remains the reference compatibility deployment. Hive-Bar-era service names, release paths, storage paths, release identity files, host, and Hive application tag remain provenance-bearing deployment facts unless a later production migration is separately qualified and authorized.

The last recorded accepted production transition in the inherited roadmap is M19.2. Do not infer current runtime identity from that historical event; inspect installed release/build identity for any operational decision.

Successor source changes do not authorize deployment, account creation, delegation, payment activation, write-mode escalation, secret rotation, or infrastructure mutation.

## Historical Hive-Bar line

The inherited M1–M20/C2/UX milestones remain in Git history and historical documentation. In particular, M17–M19 capture important beta/V1 readiness, presentation, deployment, and onboarding evidence. They remain authoritative for what those operations established at the time.

They are no longer the living successor sequence. New work is governed by HV milestones and this roadmap.

## Historical routing rule

Earlier accepted sequencing records remain immutable historical evidence. `POST_HV2_SEQUENCING_DECISION_0_1_0.md` correctly selected HV-3 at its boundary, `POST_HV3_SEQUENCING_DECISION_0_1_0.md` correctly selected HV-4 at its boundary, and `POST_HV4_SEQUENCING_DECISION_0_1_0.md` now governs the current lane.

Current routing is:

```text
SELECTED_NEXT_LANE = CANONICAL_VENUE_AUTHORING_CONTRACT
NEXT_OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
```
