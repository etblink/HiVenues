# Post-HV-3 Successor Sequencing Decision 0.1.0

## Status

```text
OPERATION = POST_HV3_SEQUENCING_DECISION
STATUS = FROZEN_PROJECT_LEAD_SEQUENCING_DECISION
REPOSITORY = etblink/Hive-Venues
DECISION_BASE_COMMIT = 4e5f5da091db932ff96261c23ef0e7a44312917c
DECISION_BASE_TREE = b0864448c62bd8e36a18a77aa985938f2090197e
HV1_VENUE_CONTEXT_FOUNDATION = ACCEPTED
HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION = ACCEPTED
HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION = ACCEPTED
HISTORICAL_DIVERGENT_REF_ARCHIVE = COMPLETE
ACTIVE_BRANCH_SURFACE = MAIN_PLUS_FOUR_CONTINUITY_REFS
SELECTED_NEXT_LANE = ISOLATED_VENUE_BOOTSTRAP_AND_SUCCESSOR_DX
PROPOSED_MILESTONE = HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION
NEXT_OPERATION = HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
SECOND_REAL_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
KUBO_IPFS_EXPERIMENT = ELIGIBLE_DOWNSTREAM_RESEARCH__NOT_SELECTED
ORBITDB_HELIA_REPLICATION = DEFERRED_PENDING_CONCRETE_NONAUTHORITATIVE_USE_CASE
CONTINUITY_REF_TAG_MIGRATION = OPTIONAL_MAINTENANCE__NOT_SELECTED
```

This record performs the fresh sequencing decision required by the accepted HV-3 preregistration. It selects only the next bounded preregistration operation. It does not implement HV-4, admit a real venue, mutate production, install Kubo, introduce Helia/OrbitDB, or authorize shared-runtime tenancy.

## 1. Controlling question

HV-1, HV-2, and HV-3 have now made the near-term source composition model explicit:

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

The next question is therefore no longer whether these boundaries can be extracted from Fourth Street. They can.

The controlling post-HV-3 question is:

> Which bounded operation most usefully proves that the accepted source-level composition can be instantiated intentionally for another isolated venue configuration without admitting a real client, forking the application, changing production, or introducing shared-runtime tenancy?

## 2. Current evidence

The decision uses the current canonical successor repository and accepted evidence.

### 2.1 The three composition seams now exist

- HV-1 provides validated, immutable venue identity/business/Hive bindings.
- HV-2 provides validated, immutable deployment identity and reference deployment facts.
- HV-3 provides validated, immutable authored venue expression/media packaging bound to a venue id.

The missing capability is not another abstraction layer. It is a deliberate developer/operator path for composing those layers into a new isolated venue instance without hand-editing Fourth Street-oriented source assumptions.

### 2.2 Developer/source identity is still visibly inherited

The canonical `package.json` still declares:

```text
name = hive-bar
description = A focused Hive community experience for 4th Street Bar.
```

That was tolerable while the successor ownership model was still being proven. It is now an active developer-experience ambiguity because the repository and platform are Hive-Venues while package metadata still describes the single reference application.

This does **not** mean the Fourth Street production service/path/application-tag namespace should be renamed. Those remain provenance-bearing compatibility facts under the accepted deployment boundary.

### 2.3 Runtime composition is explicit but bootstrap is implicit

Application construction can receive a venue context and venue package explicitly, but canonical startup still naturally defaults to the Fourth Street reference composition. There is no accepted, documented, validated new-venue bootstrap contract that tells a future operator which inputs are required, which are venue-owned, which are deployment-owned, which may be generated, and which must remain outside source control.

### 2.4 A real second venue is unnecessary to test bootstrap correctness

A real client would immediately add business consent, Hive account/community custody, domain, branding, operational, payment, content, secret, and deployment obligations. Those are valuable later validation, but they are not necessary to prove the source-level bootstrap contract.

An offline synthetic isolated venue is sufficient to test whether the platform can be instantiated cleanly without source forks or hidden Fourth Street dependencies.

## 3. Candidate-lane adjudication

### 3.1 Isolated venue bootstrap and successor developer experience — SELECTED

This is the first lane whose prerequisite was explicitly completed by HV-3.

The prior post-HV-2 decision deferred broad successor identity/developer-experience cleanup because platform, venue, deployment, and protocol identities were not yet separated clearly enough. HV-3 completed the remaining venue-package ownership boundary, so that reason for deferral no longer applies.

A bounded bootstrap milestone can now test the architecture end-to-end at source/configuration level while also correcting developer-facing successor identity where doing so is safe.

The important objective is **not** a cosmetic rename. It is a reproducible isolated-venue composition contract.

### 3.2 Real isolated second-venue pilot — DEFERRED ONE GATE

A real second venue is now more plausible than before HV-3, but it should follow a synthetic/offline bootstrap proof.

HV-4 should make a later real pilot cheaper and safer by exposing the exact required inputs and preventing ad hoc source edits. The next sequencing decision may select a real pilot if the bootstrap contract proves clean and a suitable venue is actually available.

### 3.3 Kubo / immutable IPFS publication experiment — ELIGIBLE, NOT SELECTED

A bounded immutable publication experiment is technically and architecturally interesting after HV-3 because venue package/context material now has a clearer content boundary.

However, the current application is a dynamic Express/EJS service, not an already-defined static export artifact. Starting with Kubo now would force the experiment to choose its publication object before the new-venue bootstrap/input contract is settled.

The Kubo lane therefore remains a strong downstream research candidate, ideally publishing a deliberately defined immutable venue snapshot/package artifact rather than pretending the whole dynamic application is already a static site.

Any later Kubo operation must keep its administrative RPC private and must not imply a production migration merely because local publishing succeeds.

### 3.4 Helia + OrbitDB replicated-data experiment — DEFERRED

OrbitDB addresses a different question from Kubo publication: replicated local-first application data using Helia/libp2p.

The current project does not yet have a concrete non-authoritative state domain whose product value clearly requires peer-to-peer replication. Introducing replicated mutable state without that use case would add synchronization, persistence, identity/access-control, privacy, and conflict-resolution complexity before the project knows what problem it is solving.

OrbitDB remains eligible for later research when a specific data class can be named that is:

- useful when replicated peer-to-peer or offline-first;
- non-authoritative relative to Hive or protected server state;
- safe to expose under an explicit access-control and privacy model;
- not payment receipts, authentication/session authority, onboarding credential custody, or canonical Hive state.

### 3.5 Fleet operations — DEFERRED

Fleet provisioning and release management will become more useful after the bootstrap contract defines a repeatable per-venue input bundle. Building fleet tooling first would automate an instantiation process that is not yet formally defined.

### 3.6 Shared-runtime multi-tenancy — DEFERRED

The accepted default remains one isolated venue per runtime.

Payment receipts, moderation state, onboarding requests, session/preflight ownership, secrets, replay/idempotency domains, and observability have not been migrated to explicit tenant ownership. No evidence currently justifies weakening the isolation model.

### 3.7 Continuity branch-to-tag migration — OPTIONAL MAINTENANCE

The divergent historical branch archive has already reduced the active branch namespace to `main` plus four continuity milestone refs while preserving rejected/superseded/imported history as annotated archive tags.

The four continuity branches may later be converted to milestone tags if their semantics are confirmed. That is low-risk repository hygiene, but it produces little product or architectural information and is not selected as the next milestone.

### 3.8 Shared product-quality work — PERSISTENT TRACK

Accessibility, responsive behavior, social/profile composition, payment safety communication, onboarding clarity, navigation, and venue quality remain continuous acceptance concerns. They do not currently displace the bootstrap boundary as the highest-information next architecture operation.

## 4. Selected next operation

The next bounded operation is only:

```text
HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_PREREGISTRATION
```

The proposed later implementation is:

```text
HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION
```

The preregistration must be frozen before substantive implementation.

## 5. Required HV-4 preregistration contents

The preregistration must define at least the following.

### 5.1 Exact canonical base

Bind the exact then-current canonical `main` commit and tree before any HV-4 implementation begins.

### 5.2 Bootstrap input taxonomy

Define the minimum inputs required to instantiate one isolated venue runtime, separated explicitly into:

- platform-owned constants/invariants;
- venue-context inputs;
- venue-package authored/media inputs;
- deployment-profile inputs;
- secret/private operational inputs that must never be generated into committed source;
- optional feature/policy inputs whose ownership is already accepted.

### 5.3 Offline synthetic bootstrap proof

Require a clearly fictional venue that can be initialized entirely offline from explicit fixture inputs and produces a valid context/package/deployment composition without editing generic application source.

The proof must fail closed on missing, conflicting, cross-venue, malformed, or unsafe inputs.

### 5.4 No source-fork criterion

Creating the synthetic isolated venue may add fixture/configuration material but must not require copied route/controller/template trees or conditionals keyed to a specific real venue inside generic consumers.

### 5.5 Successor developer identity boundary

The preregistration must decide which **source/developer-facing** inherited names should now become successor-native, including `package.json` package name/description if safe.

It must separately freeze the compatibility names that remain intentionally Fourth Street/Hive-Bar lineage facts, including as applicable:

- production service name;
- production release/storage paths;
- deployed provenance filenames;
- Fourth Street application tag;
- current production host and deployment profile identity.

No source identity cleanup may silently become a production namespace migration.

### 5.6 Bootstrap output boundary

The preregistration must define whether the bootstrap produces configuration modules, validated JSON, generated source-owned fixture material, documentation, or another deterministic artifact. Generated output must be reviewable, reproducible, and free of secrets.

It must not introduce a hidden mutable control plane.

### 5.7 Human usability test

The later implementation must be reviewable as a real developer/operator workflow: a person should be able to understand which files/inputs create a venue and why without reverse-engineering Fourth Street source.

### 5.8 Explicit non-effects

HV-4 must not silently perform or authorize:

- a real second venue/client launch;
- live Fourth Street deployment mutation;
- Hive account/community creation or authority changes;
- payment/onboarding/moderation tenant-schema migration;
- shared-runtime request-time tenant selection;
- Kubo/IPFS installation or publication;
- Helia/OrbitDB integration;
- fleet orchestration;
- DNS, Cloudflare, Caddy, VPS, systemd, secret, or production storage migration;
- Fourth Street app-tag/service/path renaming;
- broad UI redesign unrelated to proving bootstrap correctness.

## 6. Qualification expectations for later HV-4 implementation

The prospective implementation should require:

- deterministic bootstrap output from frozen synthetic inputs;
- schema/validation failure tests;
- cross-venue binding rejection;
- secret-safety/source-control checks;
- source-fork/literal-containment checks where appropriate;
- full inherited deterministic quality gates on Ubuntu and Windows;
- no material coverage or security regression;
- rendered qualification only for presentation surfaces actually changed by the bootstrap/source-identity work, plus whole-product acceptance when justified;
- Project Lead human review of the bootstrap workflow and resulting synthetic composition;
- a fresh canonical `main` race before integration.

## 7. Why this ordering is preferable

The resulting sequence is:

```text
HV-1  -> explicit venue context
HV-2  -> explicit deployment profile
HV-3  -> explicit venue package
HV-4  -> reproducible isolated-venue bootstrap contract
then  -> reassess real second venue / Kubo publication / fleet / identity follow-through
```

This ordering converts the accepted architecture from a set of explicit seams into an intentionally reproducible instantiation path before adding another real-world venue or another distributed-systems layer.

It also gives a future Kubo experiment a better-defined immutable publication object and gives any later fleet tooling a better-defined per-venue input contract.

## 8. Routing consequence

Upon canonical acceptance of this decision, living routing surfaces should be reconciled to:

```text
HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION = ACCEPTED
POST_HV3_SEQUENCING_DECISION = ACCEPTED
SELECTED_NEXT_LANE = ISOLATED_VENUE_BOOTSTRAP_AND_SUCCESSOR_DX
PROPOSED_MILESTONE = HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION
NEXT_OPERATION = HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
SECOND_REAL_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
KUBO_IPFS_EXPERIMENT = ELIGIBLE_DOWNSTREAM_RESEARCH__NOT_SELECTED
ORBITDB_HELIA_REPLICATION = DEFERRED_PENDING_CONCRETE_NONAUTHORITATIVE_USE_CASE
```

Historical HV-1/HV-2/HV-3 preregistrations and prior sequencing records remain immutable evidence of what was authorized at their respective boundaries. They must not be rewritten to sound current.
