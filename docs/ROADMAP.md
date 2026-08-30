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
POST_HV5_SEQUENCING_DECISION = PENDING
SELECTED_NEXT_LANE = NONE
PROPOSED_NEXT_MILESTONE = NONE
NEXT_OPERATION = POST_HV5_SEQUENCING_DECISION__READ_ONLY
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
GRAPESJS = ELIGIBLE_POST_HV5_ADAPTER_CANDIDATE__NOT_SELECTED
OPTIONAL_STARTER_ARCHETYPES = SUPPORTING_FIXTURES__NONAUTHORITATIVE
SECOND_REAL_VENUE = ELIGIBLE_FOR_FRESH_SEQUENCING_REASSESSMENT
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

### HV-4 — Isolated Venue Bootstrap Foundation — COMPLETE

Accepted implementation:

```text
AUTHORIZED_BASE = 20590dff2222a6dc855fabb9f0c4f8cb37cc2670
IMPLEMENTATION_COMMIT = c59f6aac948e5be59647694b3b60310d2b8faa30
IMPLEMENTATION_TREE = dd74fa3944b348d86e9bef7c827a13cb8ab21ee2
QUALIFICATION_PR = 22
QUALIFICATION_CI_RUN = 33334114135
```

HV-4 established a strict offline bootstrap envelope that delegates venue, package, and deployment validation to the accepted authorities; requires explicit three-way identity bindings; rejects secret/private and credential-bearing material; emits deterministic canonical review JSON; proves a non-bar Lantern Room isolated composition; and preserves Fourth Street production compatibility without source forks, production mutation, or a real second venue.

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

HV-5 established one strict editor-independent schema-v1 canonical authoring envelope, delegated venue/package validity to HV-1/HV-3, retained deployment authority in HV-4, added explicit ownership classes and fail-closed ordinary-operator edit enforcement, centralized HV-4/HV-5 secret/private and canonical-document safety, preserved direct source/code authoring through an offline CLI, and proved both Fourth Street equivalence and Lantern Room non-bar generality.

The accepted implementation does not introduce a visual-editor dependency, a mandatory venue taxonomy, a real second venue, production mutation, CID/IPNS publication, 3Speak/SPK integration, replicated state, fleet operations, or shared-runtime multi-tenancy.

Acceptance details live in `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md`.

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

The project now has explicit identity, package, deployment, bootstrap, and authoring/ownership seams. A visual editor can be evaluated as an adapter rather than a source of truth; a real second venue can be evaluated against a stable authoring/bootstrap boundary; publication/media/fleet work can be evaluated without first inventing authoring authority.

## Post-HV-4 Sequencing Decision — HISTORICAL COMPLETE

`POST_HV4_SEQUENCING_DECISION_0_1_0.md` correctly selected the canonical venue-authoring-contract lane and proposed HV-5 at that historical boundary. HV-5 is now accepted, so that decision no longer governs current routing.

## Post-HV-5 Sequencing Decision — PENDING

The next operation is a fresh **read-only Project Lead sequencing decision**. It must compare eligible candidate lanes on product leverage, falsification/risk reduction, reversibility, prerequisite maturity, operational burden, and compatibility with the accepted authority boundaries.

This roadmap deliberately does not preselect a winner.

```text
NEXT_OPERATION = POST_HV5_SEQUENCING_DECISION__READ_ONLY
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
SELECTED_NEXT_LANE = NONE
```

## Venue-category boundary

Current evidence still does **not** establish a canonical exhaustive venue taxonomy. Therefore:

- no mandatory `bar | restaurant | club | cafe | band | streamer | news | store | ...` enum is inferred merely for abstraction;
- generic platform/security code must not depend on bar-specific nouns or category branching;
- venue-package content may provide authentic operator/staff/customer vocabulary where it genuinely differs;
- starter archetypes may later be optional authoring conveniences or capability bundles rather than platform identity;
- hybrid real-world entities are expected to cross category boundaries, which argues against making a starter taxonomy authoritative.

## Candidate-lane dispositions at the Post-HV-5 boundary

These dispositions define eligibility only. They do not select or authorize implementation.

### Real isolated second-venue pilot — ELIGIBLE FOR FRESH REASSESSMENT

The previous one-gate authoring prerequisite is now satisfied. A real second venue remains the strongest direct falsification test of whether the accepted venue/package/bootstrap/authoring abstractions survive contact with an independently branded real operator. It remains unauthorized until selected and separately preregistered/authorized.

### GrapesJS / WYSIWYG — ELIGIBLE VISUAL-ADAPTER CANDIDATE

The accepted dependency direction is now enforceable:

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

A visual-editor operation must therefore prove adapter round-trip/ownership behavior against HV-5 rather than replace HV-5.

### Optional archetype/capability starters — SUPPORTING FIXTURES

Bar, band, streamer/influencer, news, digital store, and hybrid examples remain useful convenience/evidence layers but are not a mandatory core taxonomy.

### Successor package/developer identity cleanup — ELIGIBLE ADJACENT MAINTENANCE

Developer-facing inherited `hive-bar` package metadata remains a known mismatch. It is distinct from Fourth Street's intentionally preserved production compatibility namespace. Cleanup is eligible but should not displace higher-information product validation unless it blocks a selected lane.

### CID / IPFS / IPNS publication — ELIGIBLE DOWNSTREAM

Preferred provenance model remains:

```text
GIT_COMMIT_SHA = source/provenance event
GIT_TREE_SHA = exact source tree
ARTIFACT_DIGEST = exact deterministic publication payload
CID = immutable content-addressed publication identity
IPNS = optional mutable name pointing to successive immutable CIDs
```

A publication operation must first define the deterministic public artifact. IPNS does not replace Git source identity and its signing-key custody is a separate operational boundary.

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

The inherited M1–M20/C2/UX milestones remain in Git history and historical documentation. In particular, M17–M19 capture important beta/V1 readiness, presentation, deployment, and onboarding evidence. They remain authoritative for what those operations established at the time.

They are no longer the living successor sequence. New work is governed by HV milestones and this roadmap.

## Historical routing rule

Earlier accepted sequencing records remain immutable historical evidence. `POST_HV2_SEQUENCING_DECISION_0_1_0.md` correctly selected HV-3 at its boundary, `POST_HV3_SEQUENCING_DECISION_0_1_0.md` correctly selected HV-4, and `POST_HV4_SEQUENCING_DECISION_0_1_0.md` correctly selected HV-5. Current routing is the neutral Post-HV-5 sequencing boundary described above.
