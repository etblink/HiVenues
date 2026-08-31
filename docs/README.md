# Hive-Venues Documentation Index

This index separates **living successor documentation**, **current Fourth Street operating documentation**, and **historical Hive-Bar / earlier successor evidence**.

## Living successor documentation

These documents govern current interpretation and sequencing:

- `../README.md` — Hive-Venues product/developer entry point and current source boundary.
- `ROADMAP.md` — the only living current/next successor milestone roadmap.
- `HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md` — accepted hybrid preservation/reconstruction architecture and isolated-venue runtime decision.
- `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md` — permanent accepted HV-5 implementation/qualification record.
- `POST_HV5_SEQUENCING_DECISION_0_1_0.md` — accepted Project Lead sequencing decision selecting the operator visual-authoring-adapter lane and proposing HV-6.
- `HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION_0_1_0.md` — frozen prospective HV-6 product, authority, evidence, and technology-evaluation contract.
- `HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION_ACCEPTANCE_0_1_0.md` — accepted Project Lead review of the HV-6 prospective contract.
- `HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_IMPLEMENTATION_AUTHORIZATION_0_1_0.md` — canonical bounded offline dual-candidate implementation/evaluation authorization.
- `HV6_IMPLEMENTATION_AUTHORIZATION_ROUTING_RECONCILIATION_0_1_0.md` — current routing boundary from authorization into bounded implementation/evaluation once canonical.
- `HISTORICAL_REF_ARCHIVE_0_1_0.md` — established archive-tag policy for divergent historical branch refs.

Earlier HV preregistrations, acceptance records, sequencing decisions, and reconciliation records remain immutable historical evidence. They preserve the exact authorization and provenance boundary that existed at the time, but they no longer define current routing when superseded by a later accepted decision or authorization.

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
HV6_PREREGISTRATION = ACCEPTED
HV6_IMPLEMENTATION_AUTHORIZATION = ACCEPTED
HV6_IMPLEMENTATION = AUTHORIZED_AS_BOUNDED_EVALUATION
NEXT_OPERATION = HV6_BOUNDED_DUAL_CANDIDATE_IMPLEMENTATION_AND_EVALUATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = AUTHORIZED_WITHIN_HV6_EVALUATION_BOUNDARY
TECHNOLOGY_SELECTED = NO
GRAPESJS_CORE = EVALUATION_CANDIDATE__NOT_SELECTED_PRODUCTION_DEPENDENCY
GRAPESJS_STUDIO_SDK = REFERENCE_ONLY__NOT_SELECTED_DEPENDENCY
REAL_SECOND_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```

HV-6 is intentionally an **adapter-foundation** milestone, not permission to make an editor's internal project format authoritative. The canonical direction is:

```text
ACCEPTED_HV5_DOCUMENT
-> VISUAL_ADAPTER_PROJECTION
-> OPERATOR_INTERACTION
-> PROPOSED_HV5_DOCUMENT
-> applyOrdinaryOperatorEdit(base, proposed)
-> ACCEPTED_HV5_DOCUMENT
-> CANONICAL_SERIALIZATION
```

The authorized implementation is a bounded comparison of thin vertical slices:

```text
CANDIDATE_A = GRAPESJS_CORE_ADAPTER
CANDIDATE_B = MINIMAL_NATIVE_EXISTING_STACK_ADAPTER
TECHNOLOGY_WINNER_PRESELECTED = NO
```

GrapesJS Core is a serious evaluation candidate but is not selected merely because it is feature-rich. If Candidate A needs Core, the evaluated version must be refreshed from official upstream sources and pinned exactly. Studio SDK remains reference-only. A minimal native/existing-stack adapter must be compared on actual operator usability, authority preservation, round-trip behavior, accessibility, responsive quality, maintenance burden, and venue neutrality.

The direct JSON/source authoring path remains mandatory. Editor project JSON, component trees, generated HTML/CSS, autosave state, front-end visibility, arbitrary scripts, or generic page-builder topology may not replace the HV-5 authoring authority.

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

Historical evidence may be **retired from the living `main` tree** only under the accepted main-tree retirement/archive policy that preserves an exact pre-retirement checkpoint ref plus per-path provenance. Removing a historical file from current `main` must never be treated as deleting, repudiating, or superseding its evidence.

## Current navigation rule

For current project status, read in this order:

1. `../README.md`
2. `ROADMAP.md`
3. `HV6_IMPLEMENTATION_AUTHORIZATION_ROUTING_RECONCILIATION_0_1_0.md`
4. `HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_IMPLEMENTATION_AUTHORIZATION_0_1_0.md`
5. `HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION_ACCEPTANCE_0_1_0.md`
6. `HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION_0_1_0.md`
7. `POST_HV5_SEQUENCING_DECISION_0_1_0.md`
8. `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md`
9. relevant current operating documentation if production is involved
10. earlier historical milestone/preregistration/sequencing/acceptance/reconciliation evidence only as needed for provenance or inherited invariants.

The current boundary is **HV-6 bounded dual-candidate implementation and evaluation next**. That authorization does not select a technology, deploy an editor, admit a real second venue, mutate live Fourth Street, or alter Hive/payment/key authority.
