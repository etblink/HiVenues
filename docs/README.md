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
- `POST_HV4_SEQUENCING_DECISION_0_1_0.md` — historical accepted Project Lead sequencing decision that selected the canonical venue-authoring contract.
- `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_0_1_0.md` — frozen HV-5 prospective implementation contract.
- `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_ACCEPTANCE_0_1_0.md` — Project Lead acceptance of the HV-5 preregistration.
- `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_AUTHORIZATION_0_1_0.md` — historical bounded authorization for the offline HV-5 core implementation.
- `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_0_1_0.md` — accepted HV-5 implementation/operator contract.
- `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_REVIEW_0_1_0.md` — historical pre-acceptance Project Lead implementation review.
- `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md` — permanent accepted HV-5 implementation/qualification record.
- `POST_HV5_LIVING_ROUTING_RECONCILIATION_0_1_0.md` — neutral current-state reconciliation after HV-5 acceptance.
- `HISTORICAL_REF_ARCHIVE_0_1_0.md` — bounded archive policy and provenance for divergent historical refs.

`POST_HV2_SEQUENCING_DECISION_0_1_0.md`, `POST_HV3_SEQUENCING_DECISION_0_1_0.md`, and `POST_HV4_SEQUENCING_DECISION_0_1_0.md` remain immutable historical sequencing records. They correctly selected HV-3, HV-4, and HV-5 at their respective boundaries but no longer govern current routing.

Living documents must be updated when their current-state or routing claims become stale. Historical records must not be rewritten to make old authorization boundaries look current.

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

HV-4 proves deterministic, secret-safe offline composition and review of one isolated venue without a source fork. HV-5 adds one editor-independent canonical authoring document and an executable ownership/ordinary-edit boundary without creating a second venue/package/deployment authority.

Current routing is deliberately neutral:

```text
HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION = ACCEPTED
POST_HV5_SEQUENCING_DECISION = PENDING
SELECTED_NEXT_LANE = NONE
NEXT_OPERATION = POST_HV5_SEQUENCING_DECISION__READ_ONLY
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
```

No later lane is selected by this reconciliation. GrapesJS/WYSIWYG, a real isolated second-venue pilot, optional starter archetypes, successor developer/package identity cleanup, CID/IPFS/IPNS publication, 3Speak/SPK media, and fleet tooling are candidate lanes only. Helia/OrbitDB mutable replication and shared-runtime multi-tenancy remain deferred absent a concrete bounded need.

The core remains **venue-type neutral**. Optional bar/band/streamer/news/store/hybrid starters may later be useful conveniences or evidence packs but are not a mandatory platform taxonomy.

A real isolated second venue is still unauthorized. HV-5 has removed the previous authoring-contract prerequisite, so a real pilot is now eligible for fresh sequencing consideration, not automatically authorized.

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
3. `POST_HV5_LIVING_ROUTING_RECONCILIATION_0_1_0.md`
4. `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md`
5. `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_0_1_0.md`
6. `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_REVIEW_0_1_0.md`
7. `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_AUTHORIZATION_0_1_0.md`
8. `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_ACCEPTANCE_0_1_0.md`
9. `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_0_1_0.md`
10. `POST_HV4_SEQUENCING_DECISION_0_1_0.md` for the historical decision that selected HV-5
11. relevant current operating documentation if production is involved
12. earlier historical milestone/preregistration/sequencing/acceptance evidence only as needed for provenance or inherited invariants.

Prior accepted routing records remain intentionally frozen. The current boundary is **Post-HV-5 Sequencing Decision pending**. No substantive post-HV-5 implementation is authorized by the acceptance record or this navigation reconciliation.
