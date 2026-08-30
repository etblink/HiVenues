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
HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION = ACCEPTED
POST_HV3_SEQUENCING_DECISION = HISTORICAL_ACCEPTED__SUPERSEDED_FOR_CURRENT_ROUTING
POST_HV4_SEQUENCING_DECISION = HISTORICAL_ACCEPTED__SUPERSEDED_FOR_CURRENT_ROUTING
POST_HV5_SEQUENCING_DECISION = ACCEPTED
SELECTED_NEXT_LANE = OPERATOR_VISUAL_AUTHORING_ADAPTER
PROPOSED_MILESTONE = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION
NEXT_OPERATION = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
GRAPESJS_CORE = PRIMARY_EVALUATION_CANDIDATE__NOT_SELECTED_DEPENDENCY
GRAPESJS_STUDIO_SDK = SECONDARY_REFERENCE__NOT_SELECTED_DEPENDENCY
OPTIONAL_STARTER_ARCHETYPES = SUPPORTING_FIXTURES__NONAUTHORITATIVE
SECOND_REAL_VENUE = HIGH_PRIORITY_AFTER_OR_DURING_REASSESSMENT__NOT_AUTHORIZED
SECOND_REAL_VENUE_AUTHORIZED = NO
CID_PUBLICATION = ELIGIBLE_DOWNSTREAM__NOT_SELECTED
IPNS = ELIGIBLE_AFTER_CID_ARTIFACT__NOT_SOURCE_IDENTITY
THREESPEAK_SPK_MEDIA = ELIGIBLE_DOWNSTREAM__NOT_SELECTED
SUCCESSOR_PACKAGE_IDENTITY_CLEANUP = ELIGIBLE_ADJACENT_MAINTENANCE__NOT_SELECTED
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

Established a validated, deeply frozen venue context and explicit application injection for venue identity, public business facts, Hive bindings, and merchant identity.

### HV-2 — Reference Deployment Profile Extraction — COMPLETE

Established a validated, deeply immutable deployment profile compiled from the reviewed Fourth Street/Privex manifest while preserving exact reference behavior and provenance-bearing compatibility names.

### HV-3 — Reference Venue Package Extraction — COMPLETE

Accepted clean implementation:

```text
PARENT = b5901cf6f4a603df11eca5c942d63caad5f009a8
COMMIT = 291b93c696c6265c2da4ad5caaaaee9701cb69a8
TREE = b39401e8154545bec2e6704455b53c3b8938b5b6
QUALIFICATION_PR = 14
QUALIFICATION_CI_RUN = 33327969282
```

HV-3 introduced a strict, deeply immutable venue-package abstraction and proved a meaningfully distinct fictional alternate package offline without a source fork.

### HV-4 — Isolated Venue Bootstrap Foundation — COMPLETE

Accepted implementation:

```text
AUTHORIZED_BASE = 20590dff2222a6dc855fabb9f0c4f8cb37cc2670
IMPLEMENTATION_COMMIT = c59f6aac948e5be59647694b3b60310d2b8faa30
IMPLEMENTATION_TREE = dd74fa3944b348d86e9bef7c827a13cb8ab21ee2
QUALIFICATION_PR = 22
QUALIFICATION_CI_RUN = 33334114135
```

HV-4 established strict offline bootstrap composition, explicit three-way venue/package/deployment binding, secret/private rejection, deterministic canonical review JSON, and Lantern Room non-bar composition evidence.

### HV-5 — Venue Authoring Contract Foundation — COMPLETE

Canonical accepted implementation:

```text
AUTHORIZED_ROUTING_BASE = 2e2ab303f3a685729f915786df9b409b81b42508
IMPLEMENTATION_COMMIT = 932bb2fe109acfca9cb4ab0514dabc7553edf764
IMPLEMENTATION_TREE = aeaddf2bda5bdc89997caeaa8e4e472839ae8b10
IMPLEMENTATION_PARENT = 2e2ab303f3a685729f915786df9b409b81b42508
QUALIFICATION_PR = 31
QUALIFICATION_HEAD = 720557a213f15fff05f7afc178bc10f10360dfcb
QUALIFICATION_CI_RUN = 33339685417
ACCEPTANCE_COMMIT = 6529cc4ba9acf5ad76e6f23939fc4460c5afacf5
ACCEPTANCE_TREE = a6a63c8e14069741cb63a77da7a62ca4e691b9ca
ACCEPTANCE_CI_RUN = 33340059312
```

HV-5 established one strict editor-independent schema-v1 canonical authoring envelope, delegated venue/package validity to HV-1/HV-3, retained deployment authority in HV-4, added explicit ownership classes and fail-closed ordinary-operator edit enforcement, centralized HV-4/HV-5 secret/private and canonical-document safety, preserved direct source/code authoring, and proved Fourth Street equivalence plus Lantern Room non-bar generality.

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
+
CANONICAL_AUTHORING_CONTRACT
=
ONE_ISOLATED_VENUE_RUNTIME
```

The project now has explicit identity, package, deployment, bootstrap, and authoring/ownership seams. Visual tooling can therefore be evaluated as a disposable adapter rather than a source of truth.

## Post-HV-5 Sequencing Decision — COMPLETE

The accepted decision is preserved in `POST_HV5_SEQUENCING_DECISION_0_1_0.md`.

Exact accepted routing consequence:

```text
SELECTED_NEXT_LANE = OPERATOR_VISUAL_AUTHORING_ADAPTER
PROPOSED_MILESTONE = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION
NEXT_OPERATION = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
GRAPESJS_CORE = PRIMARY_EVALUATION_CANDIDATE__NOT_SELECTED_DEPENDENCY
```

The decision chose the visual/operator lane because it directly exercises the newly accepted HV-5 ownership contract, is reversible and offline-testable, materially advances ordinary-operator usability, and prepares rather than replaces the later real second-venue falsification test.

## HV-6 — Operator Visual Authoring Adapter Foundation — PREREGISTRATION NEXT

No HV-6 implementation is authorized yet.

The preregistration must freeze at least:

- `HV5_AUTHORING_DOCUMENT` as the sole canonical authoring authority;
- editor project/persistence state as non-authoritative and disposable;
- editable controls derived only from HV-5 `OPERATOR_AUTHORED` paths;
- read-only or absent controls for integration, deployment, derived, platform-fixed, security-privileged, and forbidden/private paths;
- no arbitrary HTML/script/event-handler/unknown-field authority;
- preview derived from the accepted renderer or a bounded deterministic projection;
- no-op load/save byte identity for Fourth Street and Lantern Room;
- allowed-edit round-trip/reload equivalence through the HV-5 operator gate;
- preservation of direct JSON/source authoring without visual-editor installation;
- a technology comparison between `GRAPESJS_CORE_ADAPTER` and `MINIMAL_NATIVE_OR_EXISTING_STACK_ADAPTER`;
- licensing, accessibility, responsive behavior, deterministic reload, implementation burden, injection safety, and venue-neutrality gates.

The preregistration may evaluate technology. It may not select a dependency by reputation or visual appeal alone.

## Venue-category boundary

Current evidence still does **not** establish a canonical exhaustive venue taxonomy. Therefore:

- no mandatory `bar | restaurant | club | cafe | band | streamer | news | store | ...` enum is inferred merely for abstraction;
- generic platform/security code must not depend on bar-specific nouns or category branching;
- venue-package content may provide authentic operator/staff/customer vocabulary where it genuinely differs;
- starter archetypes may later be optional authoring conveniences or capability bundles rather than platform identity;
- hybrid real-world entities are expected to cross category boundaries.

## Candidate-lane dispositions after the Post-HV-5 decision

### Real isolated second-venue pilot — HIGH PRIORITY, NOT AUTHORIZED

A real second venue remains the strongest direct falsification test of whether the accepted venue/package/bootstrap/authoring abstractions survive contact with an independently branded real operator. It is deferred one bounded operator-usability gate, unless a concrete pilot becomes available earlier and sequencing is explicitly re-adjudicated.

### GrapesJS Core — PRIMARY HV-6 EVALUATION CANDIDATE

The accepted dependency direction is:

```text
HV5_CANONICAL_AUTHORING_DOCUMENT
-> OPTIONAL_VISUAL_ADAPTER
-> HV5_OPERATOR_EDIT_GATE
-> HV5_CANONICAL_AUTHORING_DOCUMENT
```

not:

```text
EDITOR_INTERNAL_PROJECT_MODEL
-> PLATFORM_SOURCE_OF_TRUTH
```

GrapesJS project JSON or exported HTML/CSS may not become canonical Hive-Venues state. Studio SDK remains a secondary reference and is not selected.

### Optional archetype/capability starters — SUPPORTING FIXTURES

Bar, band, streamer/influencer, news, digital store, and hybrid examples remain useful convenience/evidence layers but are not a mandatory core taxonomy.

### Successor package/developer identity cleanup — ELIGIBLE ADJACENT MAINTENANCE

Developer-facing inherited `hive-bar` package metadata remains a known mismatch. It is distinct from Fourth Street's intentionally preserved production compatibility namespace.

### CID / IPFS / IPNS publication — ELIGIBLE DOWNSTREAM

Preferred provenance model remains:

```text
GIT_COMMIT_SHA = source/provenance event
GIT_TREE_SHA = exact source tree
ARTIFACT_DIGEST = exact deterministic publication payload
CID = immutable content-addressed publication identity
IPNS = optional mutable name pointing to successive immutable CIDs
```

A publication operation must first define the deterministic public artifact and CID construction profile. IPNS does not replace Git source identity and its signing-key custody is a separate operational boundary.

### 3Speak / SPKNetwork — ELIGIBLE DOWNSTREAM

Potential media/storage/encoding/delivery capability. It must not become authoritative for Hive private keys, authentication, payments, onboarding custody, or other protected private state.

### Fleet operations — DEFERRED

Fleet tooling should preferably follow at least one accepted real second-venue deployment so it automates observed operational repetition rather than hypothetical repetition.

### Helia + OrbitDB replicated state — DEFERRED

Requires a concrete non-authoritative mutable data domain with explicit privacy, access-control, conflict-resolution, and product-value justification.

### Shared-runtime multi-tenancy — DEFERRED

No current evidence justifies weakening one-isolated-venue-per-runtime. Payment, moderation, onboarding, session/preflight, secret, replay/idempotency, and observability ownership are not tenant-migrated.

## Production lineage boundary

Fourth Street's existing production environment remains the reference compatibility deployment. Hive-Bar-era service names, release paths, storage paths, release identity files, host, and Hive application tag remain provenance-bearing deployment facts unless a later production migration is separately qualified and authorized.

The last recorded accepted production transition in the inherited roadmap is M19.2. Do not infer current runtime identity from that historical event; inspect installed release/build identity for any operational decision.

Successor source changes do not authorize deployment, account creation, delegation, payment activation, write-mode escalation, secret rotation, or infrastructure mutation.

## Historical Hive-Bar line

M17–M19 capture important beta/V1 readiness, presentation, deployment, and onboarding evidence. They remain authoritative for what those operations established at the time.

The inherited M1–M20/C2/UX milestones and earlier successor governance files remain authoritative evidence for what they established at the time, but they do not all need to remain permanently present in the living `main` tree.

A separate main-tree historical-artifact retirement/archive policy may retire historical files only after an immutable checkpoint ref preserves the exact pre-retirement tree and a retirement manifest records each path/blob/recovery location. Retirement from `main` must never be interpreted as evidence deletion or supersession of accepted facts.

## Historical routing rule

Earlier accepted sequencing records remain immutable historical evidence. `POST_HV2_SEQUENCING_DECISION_0_1_0.md` selected HV-3 at its boundary, `POST_HV3_SEQUENCING_DECISION_0_1_0.md` selected HV-4, `POST_HV4_SEQUENCING_DECISION_0_1_0.md` selected HV-5, and `POST_HV5_SEQUENCING_DECISION_0_1_0.md` now governs current routing to HV-6 preregistration.
