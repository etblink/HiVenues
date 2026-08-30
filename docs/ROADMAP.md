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
SELECTED_NEXT_LANE = NONE_PENDING_POST_HV4_SEQUENCING_DECISION
PROPOSED_MILESTONE = NONE_PENDING_POST_HV4_SEQUENCING_DECISION
NEXT_OPERATION = POST_HV4_SEQUENCING_DECISION__READ_ONLY
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
SECOND_REAL_VENUE_AUTHORIZED = NO
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

The core ownership seams and the deterministic bootstrap composition now exist. The next uncertainty is therefore a **sequencing** question: which capability should be proven next to turn the accepted isolated-venue architecture into a useful successor platform without weakening the assurance boundary or prematurely automating an unproven product model?

## Post-HV-3 Sequencing Decision — COMPLETE / HISTORICAL

The accepted Post-HV-3 decision correctly selected isolated-venue bootstrap and successor DX, leading to HV-4. That decision is preserved in `POST_HV3_SEQUENCING_DECISION_0_1_0.md` but is superseded for current routing by accepted HV-4.

It must not be rewritten to pretend it anticipated or selected the post-HV-4 lane.

## Venue-category boundary after HV-4

Hive-Venues is intended to support independently branded venue applications beyond Fourth Street. Current evidence still does **not** provide a canonical exhaustive venue taxonomy.

Therefore the platform core remains venue-type neutral:

- no mandatory `bar | restaurant | club | cafe | band | streamer | news | store | ...` enum is inferred merely for abstraction;
- generic platform/security code must not depend on bar-specific nouns or category branching;
- venue package content may provide authentic operator/staff/customer vocabulary where it genuinely differs;
- future starter archetypes may be evaluated as optional authoring conveniences or capability bundles rather than platform identity;
- hybrid real-world entities are expected to cross category boundaries, which argues against making a starter taxonomy authoritative.

## Post-HV-4 Sequencing Decision — NEXT

The next bounded operation is only:

```text
POST_HV4_SEQUENCING_DECISION__READ_ONLY
```

Its purpose is to compare the credible post-HV-4 lanes against the accepted evidence and select the smallest next uncertainty worth proving. It is not implementation authorization.

At minimum, the decision should compare:

1. **Real isolated second-venue pilot** — test the bootstrap contract against a real independently branded client/venue, with separately authorized business identity, content, Hive identity/community, domain, policy, custody, and deployment.
2. **Successor authoring / no-code developer experience** — make the accepted venue/package/bootstrap model approachable to nontechnical operators while preserving one canonical validated representation and retaining an advanced source/code path. GrapesJS is an evaluation candidate for the visual-editor layer, not a preselected dependency.
3. **Optional archetype/capability starters** — evaluate bar, band, streamer/influencer, news, digital store, and hybrid starting experiences as non-authoritative convenience layers over the venue-neutral core.
4. **Successor developer/package identity maintenance** — remove remaining source-development assumptions such as inherited `hive-bar` package metadata where doing so does not rename Fourth Street production provenance.
5. **Content-addressed publication and provenance** — define an immutable venue artifact and test Git commit/tree + artifact digest + CID binding; evaluate IPNS separately as a mutable naming layer over successive immutable CIDs rather than replacing Git source identity.
6. **3Speak / SPKNetwork media capability** — evaluate a concrete media use case such as venue video/channel embedding, publishing, storage, or transcoding without transferring auth/payment/private-state authority.
7. **Fleet operations** — automate per-venue provisioning/release only if the accepted bootstrap contract is sufficiently complete and the product value outweighs orchestration complexity.
8. **Helia / OrbitDB replicated state** — remain deferred unless a concrete non-authoritative mutable data domain emerges with explicit privacy, access-control, conflict-resolution, and product-value requirements.
9. **Shared-runtime multi-tenancy** — remain deferred absent a separately proven tenant ownership/isolation model across payments, moderation, onboarding, sessions, secrets, replay/idempotency, and observability.

The sequencing decision may reject, defer, combine, or narrow these candidates. This roadmap does not preselect a winner.

## Production lineage boundary

Fourth Street's existing production environment remains the reference compatibility deployment. Hive-Bar-era service names, release paths, storage paths, release identity files, host, and Hive application tag remain provenance-bearing deployment facts unless a later production migration is separately qualified and authorized.

The last recorded accepted production transition in the inherited roadmap is M19.2. Do not infer current runtime identity from that historical event; inspect installed release/build identity for any operational decision.

Successor source changes do not authorize deployment, account creation, delegation, payment activation, write-mode escalation, secret rotation, or infrastructure mutation.

## Candidate-lane status after HV-4

### Real isolated second-venue pilot — ELIGIBLE FOR SEQUENCING

HV-4 removed the prior technical gate that bootstrap composition had not yet been proven. A real pilot still carries materially new business, identity, custody, content, domain, infrastructure, and operational obligations and therefore requires its own authorization if selected.

### Successor no-code / WYSIWYG authoring — ELIGIBLE FOR SEQUENCING

Potentially high leverage for platform usability. The desired architecture is one canonical validated venue/package/bootstrap model with multiple authoring surfaces—not separate visual and developer configuration systems. GrapesJS may be evaluated as an implementation framework only after the editable schema, component permissions, serialization contract, sanitization boundary, preview model, and escape hatch to source/code are defined.

### Optional archetype/capability starters — ELIGIBLE FOR SEQUENCING

Bar, band, streamer/influencer, news, digital store, and hybrid examples are useful product evidence. They should initially compete as starter experiences or composable capabilities, not as a mandatory platform enum.

### CID / IPFS / IPNS publication — ELIGIBLE FOR SEQUENCING

A hybrid provenance model is preferred for evaluation:

```text
GIT_COMMIT_SHA = source/provenance event
GIT_TREE_SHA = exact source tree
ARTIFACT_DIGEST = exact deterministic publication payload
CID = immutable content-addressed publication identity
IPNS = optional mutable name pointing to successive immutable CIDs
```

A future experiment must define the publication artifact explicitly; it must not pretend the dynamic Express runtime is already a static site or expose administrative IPFS interfaces publicly.

### 3Speak / SPKNetwork — ELIGIBLE FOR SEQUENCING

Interesting primarily as a media/content capability. It is not currently selected and must not become authoritative for Hive private keys, authentication, payments, onboarding custody, or other security-critical private state merely because it participates in decentralized media/storage infrastructure.

### Successor package/developer identity cleanup — ELIGIBLE MAINTENANCE CANDIDATE

The repository still contains developer-facing inherited `hive-bar` package metadata. That is distinct from Fourth Street's intentionally preserved production compatibility namespace. A bounded maintenance operation may be appropriate if sequencing judges the mismatch materially harmful to onboarding or tooling.

### Fleet operations — ELIGIBLE BUT NOT SELECTED

HV-4 now defines a repeatable per-venue composition contract, removing one earlier blocker. Fleet work still needs evidence that automating provisioning/release is more valuable than first improving authoring or proving a real second venue.

### Helia + OrbitDB replicated state — DEFERRED

Requires a concrete non-authoritative data domain with explicit privacy, access-control, conflict-resolution, and product-value justification. Canonical Hive state, payment receipts, auth/session authority, and onboarding credential custody are not candidates by default.

### Shared-runtime multi-tenancy — DEFERRED

No current evidence justifies weakening one-isolated-venue-per-runtime. Payment, moderation, onboarding, session/preflight, secret, replay/idempotency, and observability ownership are not tenant-migrated.

### Continuity branch-to-tag migration — OPTIONAL MAINTENANCE

The four `continuity/*` refs remain out of the substantive roadmap. They may later become milestone tags after exact semantic verification.

### Shared product quality — PERSISTENT TRACK

Accessibility, responsive behavior, navigation, social/profile composition, payment safety communication, onboarding clarity, and reference-venue quality remain continuous acceptance concerns.

## Historical Hive-Bar line

The inherited M1–M20/C2/UX milestones remain in Git history and historical documentation. In particular, M17–M19 capture important beta/V1 readiness, presentation, deployment, and onboarding evidence. They remain authoritative for what those operations established at the time.

They are no longer the living successor sequence. New work is governed by HV milestones and this roadmap.

## Historical routing rule

Earlier accepted sequencing records remain immutable historical evidence. `POST_HV2_SEQUENCING_DECISION_0_1_0.md` correctly selected HV-3 at its boundary, and `POST_HV3_SEQUENCING_DECISION_0_1_0.md` correctly selected HV-4 at its boundary.

Accepted HV-4 now supersedes those records for current routing. Until a fresh post-HV-4 sequencing decision is accepted:

```text
SELECTED_NEXT_LANE = NONE
NEXT_OPERATION = POST_HV4_SEQUENCING_DECISION__READ_ONLY
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
```
