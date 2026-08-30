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
HV5_PREREGISTRATION = ACCEPTED
HV5_IMPLEMENTATION_AUTHORIZATION = ACCEPTED
HV5_IMPLEMENTATION = AUTHORIZED__NOT_YET_ACCEPTED
NEXT_OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = AUTHORIZED_WITHIN_HV5_BOUNDARY
GRAPESJS = POST_HV5_ADAPTER_CANDIDATE__NOT_HV5_DEPENDENCY
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

HV-4 established a strict offline bootstrap envelope that delegates venue, package, and deployment validation to the accepted authorities; requires explicit three-way identity bindings; rejects secret/private and credential-bearing material; emits deterministic canonical review JSON; proves a non-bar Lantern Room isolated composition; and preserves Fourth Street production compatibility without source forks, production mutation, or a real second venue.

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

The core ownership seams and deterministic bootstrap composition exist. The accepted Post-HV-4 Sequencing Decision identified the next uncertainty as **authoring ownership**: what an operator may edit, what is derived, what is platform/deployment/security authority, and how multiple authoring surfaces converge on one canonical validated representation.

## Post-HV-4 Sequencing Decision — COMPLETE

The accepted decision is preserved in `POST_HV4_SEQUENCING_DECISION_0_1_0.md` and selected:

```text
SELECTED_NEXT_LANE = CANONICAL_VENUE_AUTHORING_CONTRACT
PROPOSED_MILESTONE = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION
```

That sequencing choice has now progressed through preregistration, Project Lead preregistration acceptance, and explicit bounded implementation authorization. The historical decision file remains frozen; current routing is carried here.

## HV-5 — Venue Authoring Contract Foundation — IMPLEMENTATION AUTHORIZED

Canonical prospective/governance sequence:

```text
PREREGISTRATION_COMMIT = f54a2a198ca5f9c37d5d78f6f97d06211a5d2869
PREREGISTRATION_TREE = 74e7a4c76dc00f208bc24eef464fb8c104ff87ba
PREREGISTRATION_ACCEPTANCE_COMMIT = 57f6292f411c5fae656e0b097ef0e75f1eff30e7
IMPLEMENTATION_AUTHORIZATION_COMMIT = 2ae7dcefec4d499d6ba4bef462c8003945b40d0f
IMPLEMENTATION_AUTHORIZATION_TREE = c4532fc69600807158a2cb4a9b0cc16ed6b58669
```

HV-5 core implementation is now authorized only within the exact accepted preregistration and authorization records.

The implementation must establish:

- one strict schema-version-1 canonical JSON authoring envelope;
- the accepted HV-1 `venueContext` and HV-3 `venuePackage` shapes as the domain authorities, not duplicated schemas;
- `deploymentRef.id` only, with the deployment manifest/profile remaining separately owned;
- an executable ownership model assigning every v1 path to exactly one class;
- ordinary-operator patch enforcement that cannot alter protected identity, Hive/payment, deployment, schema, derived, secret, or executable authority;
- deterministic HV-4-compatible canonical JSON bytes across Ubuntu and Windows;
- secret/private-material rejection at least as strict as HV-4;
- a direct source/code validation path that requires no visual editor or network access;
- Fourth Street semantic-equivalence evidence;
- Lantern Room non-bar evidence through the same generic code path;
- compatibility with the existing HV-4 bootstrap boundary when deployment authority is separately supplied.

The implementation is **not** authorized to add GrapesJS core or Studio SDK, build a browser WYSIWYG editor, introduce a freeform page tree, create a mandatory venue taxonomy, admit a real second venue, mutate production, publish CID/IPNS state, integrate 3Speak/SPK, add Helia/OrbitDB, build fleet operations, or enable shared-runtime tenancy.

HV-5 itself remains unaccepted until a qualified implementation passes all preregistered gates and Project Lead human authoring review.

## Venue-category boundary

Current evidence still does **not** establish a canonical exhaustive venue taxonomy. Therefore:

- no mandatory `bar | restaurant | club | cafe | band | streamer | news | store | ...` enum is inferred merely for abstraction;
- generic platform/security code must not depend on bar-specific nouns or category branching;
- venue-package content may provide authentic operator/staff/customer vocabulary where it genuinely differs;
- starter archetypes may later be optional authoring conveniences or capability bundles rather than platform identity;
- hybrid real-world entities are expected to cross category boundaries, which argues against making a starter taxonomy authoritative.

## Candidate-lane dispositions after HV-5

These are not selected now. Successful HV-5 acceptance must be followed by a fresh sequencing decision.

### Real isolated second-venue pilot — DEFERRED ONE GATE

A real second venue remains the strongest downstream falsification test. After HV-5, the next sequencing decision should strongly prefer a real pilot if a suitable venue is available.

### GrapesJS / WYSIWYG — POST-HV-5 ADAPTER CANDIDATE

The desired dependency direction remains:

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

HV-5 core therefore does not install GrapesJS.

### Optional archetype/capability starters — SUPPORTING FIXTURES

Bar, band, streamer/influencer, news, digital store, and hybrid examples remain useful convenience/evidence layers but are not a mandatory core taxonomy.

### Successor package/developer identity cleanup — ELIGIBLE ADJACENT MAINTENANCE

Developer-facing inherited `hive-bar` package metadata remains a known mismatch. It is distinct from Fourth Street's intentionally preserved production compatibility namespace and is not part of the authorized HV-5 implementation.

### CID / IPFS / IPNS publication — ELIGIBLE DOWNSTREAM

Preferred future provenance model:

```text
GIT_COMMIT_SHA = source/provenance event
GIT_TREE_SHA = exact source tree
ARTIFACT_DIGEST = exact deterministic publication payload
CID = immutable content-addressed publication identity
IPNS = optional mutable name pointing to successive immutable CIDs
```

A later publication operation must define the exact deterministic public artifact first. IPNS does not replace Git source identity and its signing-key custody requires a separate operational boundary.

### 3Speak / SPKNetwork — ELIGIBLE DOWNSTREAM

Interesting as a venue/creator media capability, storage, encoding, or delivery layer. It must not become authoritative for Hive private keys, authentication, payments, onboarding custody, or other protected private state.

### Fleet operations — DEFERRED

Fleet tooling should follow a stable accepted authoring contract and preferably at least one real second-venue deployment.

### Helia + OrbitDB replicated state — DEFERRED

Requires a concrete non-authoritative mutable data domain with explicit privacy, access-control, conflict-resolution, and product-value justification.

### Shared-runtime multi-tenancy — DEFERRED

No current evidence justifies weakening one-isolated-venue-per-runtime. Payment, moderation, onboarding, session/preflight, secret, replay/idempotency, and observability ownership are not tenant-migrated.

## Production lineage boundary

Fourth Street's existing production environment remains the reference compatibility deployment. Hive-Bar-era service names, release paths, storage paths, release identity files, host, and Hive application tag remain provenance-bearing deployment facts unless a later production migration is separately qualified and authorized.

The last recorded accepted production transition in the inherited roadmap is M19.2. Do not infer current runtime identity from that historical event; inspect installed release/build identity for any operational decision.

Successor source changes do not authorize deployment, account creation, delegation, payment activation, write-mode escalation, secret rotation, or infrastructure mutation.

## Historical Hive-Bar line

The inherited M1–M20/C2/UX milestones remain in Git history and historical documentation. In particular, M17–M19 capture important beta/V1 readiness, presentation, deployment, and onboarding evidence. They remain authoritative for what those operations established at the time.

They are no longer the living successor sequence. New work is governed by HV milestones and this roadmap.

## Historical routing rule

Earlier accepted sequencing records remain immutable historical evidence. `POST_HV2_SEQUENCING_DECISION_0_1_0.md` correctly selected HV-3 at its boundary, `POST_HV3_SEQUENCING_DECISION_0_1_0.md` correctly selected HV-4 at its boundary, and `POST_HV4_SEQUENCING_DECISION_0_1_0.md` correctly selected the HV-5 lane. Current execution routing is the authorized HV-5 implementation described above.
