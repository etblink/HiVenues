# Hive-Venues Documentation Index

This index separates **living successor documentation**, **current Fourth Street operating documentation**, and **historical Hive-Bar milestone evidence**.

## Living successor documentation

These documents govern current successor interpretation and sequencing:

- `../README.md` — Hive-Venues product/developer entry point and current source boundary.
- `ROADMAP.md` — the only living current/next successor milestone roadmap.
- `HIVE_VENUES_SUCCESSOR_BASELINE_0_1_0.md` — exact source-lineage migration and inherited baseline boundary.
- `HV1_VENUE_CONTEXT_FOUNDATION_PREREGISTRATION_0_1_0.md` — frozen HV-1 contract.
- `HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md` — accepted hybrid preservation/reconstruction architecture and isolated-venue runtime decision.
- `HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION_PREREGISTRATION_0_1_0.md` — frozen prospective HV-2 contract.
- `HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION_ACCEPTANCE_0_1_0.md` — Project Lead HV-2 acceptance, qualification, non-effects, and post-HV-2 routing record.
- `POST_HV2_SEQUENCING_DECISION_0_1_0.md` — accepted Project Lead lane selection: venue packaging, with only HV-3 preregistration authorized next.

Living documents must be updated when their current-state or routing claims become stale. They must not silently rewrite the meaning of historical evidence.

## Current Fourth Street operating documentation

Until a successor deployment migration is separately accepted, the existing Fourth Street deployment retains its provenance-bearing Hive-Bar-era namespace and runbooks:

- `PRODUCTION_OPERATIONS.md` — current production operating model and exact-release safety boundary.
- `../.env.example` — inherited-compatible application environment example.
- `../ops/privex/hive-bar.env.example` — Fourth Street/Privex environment profile example.
- `../ops/privex/manifest.json` — machine-readable reviewed Fourth Street production topology and release profiles.

These are reference-deployment documents, not universal Hive-Venues architecture. HV-2 establishes an explicit validated deployment-profile boundary around those facts while preserving their exact reference values and making no live production change.

## Source identity versus production identity

Canonical integrated source is `main` in `etblink/Hive-Venues`. Because `main` can advance independently of production, resolve its exact commit/tree from GitHub when qualifying or releasing.

The existing Fourth Street deployment carries its own installed release identity using the inherited exact-release mechanism. Historical records such as M19.2 prove what was deployed at that event; they are not a substitute for reading the current installed release/build identity.

A source commit in Hive-Venues never authorizes a live deployment by itself.

## Historical Hive-Bar evidence

All pre-successor milestone documents, acceptance records, deployment evidence, remediation records, visual artifacts, and release qualification files remain historical evidence for the operations they document.

Use them to answer questions such as:

- what behavior or safety invariant was originally accepted;
- why a transaction/payment/deployment rule exists;
- what exact source or deployment was qualified at a historical gate;
- what visual or operational evidence supported an accepted milestone.

Do not use a historical milestone file to override a current successor routing decision merely because the older document called itself current at the time.

The original Git object graph is preserved in this repository, and `etblink/Hive-Bar` remains independently available as the source-lineage repository.

## Current architecture interpretation

The default successor model is:

```text
HIGH_ASSURANCE_PROTOCOL_SECURITY_CORE
+
PLATFORM_APPLICATION_PRIMITIVES
+
VENUE_PACKAGE
+
DEPLOYMENT_PROFILE
=
ONE_ISOLATED_VENUE_RUNTIME
```

The venue-context seam introduced by HV-1 and the deployment-profile seam accepted in HV-2 do not mean the application is already shared-runtime multi-tenant. Payment, moderation, onboarding, and other durable state remain venue-local until explicitly migrated.

Venue-specific editorial content and assets are first-class product material. The accepted Post-HV-2 Sequencing Decision selects venue packaging as the next lane precisely because Fourth Street's strong content, authentic media, local framing, and venue-facing product expression remain comparatively distributed through application and presentation surfaces.

The next operation is preregistration for the proposed HV-3 Reference Venue Package Extraction. No HV-3 implementation, second real venue, production mutation, or shared-runtime tenancy is authorized by that routing decision.

## Navigation rule

For current project status, read in this order:

1. `../README.md`
2. `ROADMAP.md`
3. `HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md`
4. `POST_HV2_SEQUENCING_DECISION_0_1_0.md`
5. the preregistration for a currently authorized implementation operation, when one exists
6. relevant current operating documentation if production is involved
7. historical milestone evidence only as needed for provenance or inherited invariants.

The accepted Post-HV-2 Sequencing Decision authorizes only the next governance operation:

```text
NEXT_OPERATION = HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
```

No HV-3 implementation may begin until the prospective preregistration is separately frozen and qualified.
