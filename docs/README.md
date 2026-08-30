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
- `HISTORICAL_REF_ARCHIVE_0_1_0.md` — bounded archive policy and provenance for divergent historical refs.

`POST_HV2_SEQUENCING_DECISION_0_1_0.md` and `POST_HV3_SEQUENCING_DECISION_0_1_0.md` remain immutable historical sequencing records. The latter correctly selected HV-4 at the time but no longer governs current routing after accepted HV-4.

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

The next bounded operation is:

```text
POST_HV4_SEQUENCING_DECISION__READ_ONLY
```

No next substantive implementation is selected until that decision is accepted.

Candidate lanes may be compared in that decision, including real isolated second-venue admission, developer/no-code authoring, optional archetype/capability starters, successor package/developer identity cleanup, content-addressed publication/provenance, media integrations, and fleet tooling. Their appearance as candidates is not authorization or selection.

The platform remains intentionally **venue-type neutral** at its core. Independently branded venues may use authentic vocabulary and optional future starter configurations, but no mandatory bar/restaurant/club/café/band/streamer/news/store taxonomy is currently part of platform authority.

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
3. `HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_ACCEPTANCE_0_1_0.md`
4. the accepted post-HV-4 sequencing decision, once one exists
5. `HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md`
6. relevant current operating documentation if production is involved
7. historical milestone/preregistration/sequencing/acceptance evidence only as needed for provenance or inherited invariants.

Prior accepted routing records remain intentionally frozen. `POST_HV3_SEQUENCING_DECISION_0_1_0.md` correctly selected HV-4 from the post-HV-3 boundary; accepted HV-4 now supersedes it for current routing. Until the fresh post-HV-4 decision is accepted, the project is deliberately at a sequencing-decision boundary rather than silently continuing a prior lane.
