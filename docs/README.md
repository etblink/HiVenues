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
- `POST_HV2_SEQUENCING_DECISION_0_1_0.md` — historical accepted decision that selected venue packaging before HV-3.
- `HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_PREREGISTRATION_0_1_0.md` — frozen HV-3 prospective contract.
- `HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_ACCEPTANCE_0_1_0.md` — accepted HV-3 implementation and qualification record.
- `POST_HV3_SEQUENCING_DECISION_0_1_0.md` — current accepted sequencing decision selecting isolated-venue bootstrap / successor developer experience.
- `HISTORICAL_REF_ARCHIVE_0_1_0.md` — bounded archive policy and provenance for divergent historical refs.

Living documents must be updated when their current-state or routing claims become stale. Historical records must not be rewritten to make old authorization boundaries look current.

## Current successor interpretation

HV-1, HV-2, and HV-3 are accepted. The accepted near-term composition is:

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

The selected next bounded operation is:

```text
HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_PREREGISTRATION
```

HV-4 implementation is not authorized merely because the routing decision exists. A second real venue, live production mutation, and shared-runtime tenancy remain outside the current authorization boundary.

The bootstrap lane is intentionally **venue-type neutral**. The platform is intended to support independently branded venue applications. Fourth Street remains the reference bar, but no mandatory bar/restaurant/club/café taxonomy is inferred from the current evidence. Venue-specific operator/staff vocabulary belongs in the explicit venue package when it genuinely differs.

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

## Historical Hive-Bar milestone evidence

All pre-successor milestone documents, acceptance records, deployment evidence, remediation records, visual artifacts, and release qualification files remain historical Hive-Bar milestone evidence for the operations they document.

Use them to answer questions such as:

- what behavior or safety invariant was originally accepted;
- why a transaction/payment/deployment rule exists;
- what exact source or deployment was qualified at a historical gate;
- what visual or operational evidence supported an accepted milestone.

Do not use a historical milestone file to override a current successor routing decision merely because the older file called itself current at the time.

The original Git object graph is preserved in this repository, and `etblink/Hive-Bar` remains independently available as the source-lineage repository.

## Current navigation rule

For current project status, read in this order:

1. `../README.md`
2. `ROADMAP.md`
3. `POST_HV3_SEQUENCING_DECISION_0_1_0.md`
4. the currently authorized preregistration, when present
5. `HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md`
6. relevant current operating documentation if production is involved
7. historical milestone/preregistration/acceptance evidence only as needed for provenance or inherited invariants.

Prior accepted records remain intentionally frozen. In particular, `POST_HV2_SEQUENCING_DECISION_0_1_0.md` remains the historical record that selected HV-3; it no longer governs current sequencing after accepted HV-3 and the Post-HV-3 decision.
