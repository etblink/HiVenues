# Hive-Venues Documentation Index

This index separates **living successor documentation**, **current Fourth Street operating documentation**, and **historical Hive-Bar / earlier successor evidence**.

## Living successor documentation

These documents govern current interpretation and sequencing:

- `../README.md` — Hive-Venues product/developer entry point and current source boundary.
- `ROADMAP.md` — the only living current/next successor milestone roadmap.
- `HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md` — accepted hybrid preservation/reconstruction architecture and isolated-venue runtime decision.
- `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md` — permanent accepted HV-5 implementation/qualification record.
- `POST_HV5_LIVING_ROUTING_RECONCILIATION_0_1_0.md` — historical neutral reconciliation immediately after HV-5 acceptance.
- `POST_HV5_SEQUENCING_DECISION_0_1_0.md` — accepted Project Lead sequencing decision selecting the operator visual-authoring-adapter lane and proposing HV-6.
- `HISTORICAL_REF_ARCHIVE_0_1_0.md` — established archive-tag policy for divergent historical branch refs.

Earlier HV preregistrations, acceptance records, sequencing decisions, and reconciliation records remain immutable historical evidence. They preserve the exact authorization and provenance boundary that existed at the time, but they no longer define current routing when superseded by a later accepted decision.

Living documents must be updated when current-state or routing claims become stale. Historical records must not be rewritten to make old authorization boundaries look current.

## Current successor interpretation

HV-1 through HV-5 are accepted. The accepted near-term composition is:

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

Current routing is:

```text
HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION = ACCEPTED
POST_HV5_SEQUENCING_DECISION = ACCEPTED
SELECTED_NEXT_LANE = OPERATOR_VISUAL_AUTHORING_ADAPTER
PROPOSED_MILESTONE = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION
NEXT_OPERATION = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
GRAPESJS_CORE = PRIMARY_EVALUATION_CANDIDATE__NOT_SELECTED_DEPENDENCY
GRAPESJS_STUDIO_SDK = SECONDARY_REFERENCE__NOT_SELECTED_DEPENDENCY
REAL_SECOND_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```

HV-6 is intentionally an **adapter-foundation** milestone, not permission to make an editor's internal project format authoritative. Its preregistration must freeze the canonical direction:

```text
HV5_CANONICAL_AUTHORING_DOCUMENT
-> VISUAL_ADAPTER
-> PROPOSED_OPERATOR_EDIT
-> HV5_OPERATOR_EDIT_GATE
-> VALIDATED_HV5_CANONICAL_AUTHORING_DOCUMENT
```

GrapesJS Core is a serious primary evaluation candidate but is not selected merely because it is feature-rich. A minimal native/existing-stack adapter must be compared against it before dependency selection. The direct JSON/source authoring path remains mandatory.

A real isolated second venue remains the strongest eventual falsification test and is high priority after this bounded operator-usability gate. It remains unauthorized unless separately selected/preregistered/authorized, or sequencing is explicitly reopened because a concrete pilot becomes available earlier.

CID/IPFS/IPNS publication, 3Speak/SPK media, optional starter archetypes, successor package/developer identity cleanup, and fleet tooling remain downstream or adjacent candidates. Helia/OrbitDB mutable replication and shared-runtime multi-tenancy remain deferred absent a concrete bounded need.

The core remains **venue-type neutral**. Optional bar/band/streamer/news/store/hybrid starters may later be useful conveniences or evidence packs but are not a mandatory platform taxonomy.

## Current Fourth Street operating documentation

Until a successor deployment migration is separately accepted, the existing Fourth Street deployment retains its provenance-bearing Hive-Bar-era namespace and runbooks:

- `PRODUCTION_OPERATIONS.md` — current production operating model and exact-release safety boundary.
- `../.env.example` — inherited-compatible application environment example.
- `../ops/privex/hive-bar.env.example` — Fourth Street/Privex environment profile example.
- `../ops/privex/manifest.json` — machine-readable reviewed Fourth Street production topology and release profiles.

These are reference-deployment documents, not universal Hive-Venues architecture. HV-2 established an explicit deployment-profile boundary around those facts without renaming the live compatibility namespace.

## Source identity versus production identity

Canonical integrated source is `main` in `etblink/Hive-Venues`. Because `main` advances independently of production, resolve its exact commit/tree from GitHub whenever qualifying or releasing.

The existing Fourth Street deployment carries its own installed release identity using the inherited exact-release mechanism. Historical records such as M19.2 prove what was deployed at that event; they are not a substitute for reading current installed release/build identity.

A source commit in Hive-Venues never authorizes a live deployment by itself.

## Historical Hive-Bar evidence

All pre-successor milestone documents, acceptance records, deployment evidence, remediation records, visual artifacts, and release qualification files remain historical evidence for the operations they document.

Earlier successor milestone/preregistration/acceptance/decision/reconciliation records likewise remain historical evidence once superseded for current routing. Historical evidence remains authoritative for what the bounded operation established at the time.

Use historical evidence to answer questions such as:

- what behavior or safety invariant was originally accepted;
- why a transaction/payment/deployment rule exists;
- what exact source or deployment was qualified at a historical gate;
- what visual or operational evidence supported an accepted milestone.

The original Git object graph is preserved in this repository, and `etblink/Hive-Bar` remains independently available as the source-lineage repository.

Historical evidence may be **retired from the living `main` tree** only under a separately accepted main-tree retirement/archive policy that preserves an exact pre-retirement checkpoint ref plus per-path provenance. Removing a historical file from current `main` must never be treated as deleting, repudiating, or superseding its evidence.

## Current navigation rule

For current project status, read in this order:

1. `../README.md`
2. `ROADMAP.md`
3. `POST_HV5_SEQUENCING_DECISION_0_1_0.md`
4. `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md`
5. relevant accepted HV-5 implementation/preregistration records only when the exact authoring contract or provenance is needed
6. relevant current operating documentation if production is involved
7. earlier historical milestone/preregistration/sequencing/acceptance/reconciliation evidence only as needed for provenance or inherited invariants.

The current boundary is **HV-6 preregistration next**. No HV-6 substantive implementation is authorized by the Post-HV-5 decision alone.
