# Hive-Venues Documentation Index

This index separates **living successor documentation**, **current Fourth Street operating documentation**, and **historical Hive-Bar / earlier successor evidence**.

## Living successor documentation

These documents govern current interpretation and sequencing:

- `../README.md` — Hive-Venues product/developer entry point and current source boundary.
- `ROADMAP.md` — the only living current/next successor milestone roadmap.
- `HIVE_VENUES_SUCCESSOR_BASELINE_0_1_0.md` — exact source-lineage migration and inherited baseline boundary.
- `HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md` — accepted hybrid preservation/reconstruction architecture and isolated-venue runtime decision.
- `HV1_VENUE_CONTEXT_FOUNDATION_PREREGISTRATION_0_1_0.md` — frozen HV-1 prospective contract.
- `HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION_PREREGISTRATION_0_1_0.md` — frozen HV-2 prospective contract.
- `HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION_ACCEPTANCE_0_1_0.md` — accepted HV-2 implementation and qualification record.
- `HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_PREREGISTRATION_0_1_0.md` — frozen HV-3 prospective contract.
- `HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_ACCEPTANCE_0_1_0.md` — accepted HV-3 implementation and qualification record.
- `HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_PREREGISTRATION_0_1_0.md` — frozen HV-4 prospective contract.
- `HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_ACCEPTANCE_0_1_0.md` — accepted HV-4 implementation and qualification record.
- `POST_HV4_SEQUENCING_DECISION_0_1_0.md` — accepted Project Lead sequencing decision selecting the canonical venue-authoring contract as the next lane and HV-5 preregistration as the next operation.
- `HISTORICAL_REF_ARCHIVE_0_1_0.md` — bounded archive policy and provenance for divergent historical refs.

`POST_HV2_SEQUENCING_DECISION_0_1_0.md` and `POST_HV3_SEQUENCING_DECISION_0_1_0.md` remain immutable historical sequencing records. They correctly selected HV-3 and HV-4 at their respective boundaries but no longer govern current routing.

Living documents must be updated when their current-state or routing claims become stale. Historical records must not be rewritten to make old authorization boundaries look current.

## Current successor interpretation

HV-1, HV-2, HV-3, and HV-4 are accepted. The accepted near-term composition is:

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

HV-4 proves deterministic, secret-safe offline composition and review of one isolated venue without a source fork. It does not admit a real second venue, change Fourth Street production, or establish shared-runtime tenancy.

The accepted Post-HV-4 Sequencing Decision selects:

```text
SELECTED_NEXT_LANE = CANONICAL_VENUE_AUTHORING_CONTRACT
PROPOSED_MILESTONE = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION
NEXT_OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
```

HV-5 is intentionally narrower than “build a no-code editor.” The preregistration must first define one editor-independent canonical authoring representation, ownership classes, deterministic serialization/compilation, preview semantics, and a source/code escape hatch. GrapesJS is an evaluation candidate for a visual adapter, not a selected dependency or configuration authority.

Optional bar/band/streamer/news/store/hybrid starters remain non-authoritative convenience layers. The core remains **venue-type neutral**. A real isolated second venue is deferred only one gate and should be strongly reassessed after HV-5 or earlier if a suitable pilot becomes concretely available.

CID publication, IPNS mutable naming, 3Speak/SPK media, fleet tooling, Helia/OrbitDB replication, and shared-runtime multi-tenancy remain downstream or deferred exactly as recorded in `POST_HV4_SEQUENCING_DECISION_0_1_0.md`; naming them here does not authorize implementation.

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

This historical Hive-Bar milestone evidence remains the authoritative record for what those bounded operations established at the time.

Use it to answer questions such as:

- what behavior or safety invariant was originally accepted;
- why a transaction/payment/deployment rule exists;
- what exact source or deployment was qualified at a historical gate;
- what visual or operational evidence supported an accepted milestone.

Do not use a historical milestone file to override current successor routing merely because the older file called itself current at the time.

The original Git object graph is preserved in this repository, and `etblink/Hive-Bar` remains independently available as the source-lineage repository.

## Current navigation rule

For current project status, read in this order:

1. `../README.md`
2. `ROADMAP.md`
3. `POST_HV4_SEQUENCING_DECISION_0_1_0.md`
4. `HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_ACCEPTANCE_0_1_0.md`
5. the HV-5 preregistration once frozen
6. `HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md`
7. relevant current operating documentation if production is involved
8. historical milestone/preregistration/sequencing/acceptance evidence only as needed for provenance or inherited invariants.

Prior accepted routing records remain intentionally frozen. The accepted Post-HV-4 decision now governs current sequencing; the project is at the HV-5 preregistration boundary and no substantive HV-5 implementation is authorized yet.
