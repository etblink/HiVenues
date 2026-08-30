# HV-4 Isolated Venue Bootstrap Foundation — Preregistration 0.1.0

## Status

```text
OPERATION = HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION
PREREGISTRATION_VERSION = 0.1.0
STATUS = FROZEN_PREREGISTRATION__IMPLEMENTATION_NOT_STARTED
REPOSITORY = etblink/Hive-Venues
CANONICAL_BASE_COMMIT = 065c54d091d72100596452f65c691a7bbb0fffc6
CANONICAL_BASE_TREE = 5ee69126b7be06c801201bdbf164912fbc0a505d
REFERENCE_VENUE = Fourth Street Bar, Reno
SYNTHETIC_PROOF_VENUE = The Lantern Room (Fixture)
SELECTED_LANE = ISOLATED_VENUE_BOOTSTRAP_AND_SUCCESSOR_DX
IMPLEMENTATION_STARTED = NO
IMPLEMENTATION_AUTHORIZED_BY_THIS_FILE_ALONE = NO
SECOND_REAL_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = FORBIDDEN
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
MANDATORY_VENUE_TYPE_ENUM = FORBIDDEN_WITHOUT_NEW_PRODUCT_EVIDENCE
KUBO_IPFS_INTEGRATION = OUTSIDE_HV4_SCOPE
HELIA_ORBITDB_INTEGRATION = OUTSIDE_HV4_SCOPE
FLEET_ORCHESTRATION = OUTSIDE_HV4_SCOPE
```

This preregistration prospectively defines HV-4 before implementation. It operationalizes the accepted Post-HV-3 Sequencing Decision without silently turning bootstrap work into a real-client launch, production migration, fleet-control system, shared-runtime tenancy project, distributed-storage experiment, or cosmetic rebrand.

## 1. Controlling question

HV-1 established a validated venue context. HV-2 established a validated deployment profile. HV-3 established a validated venue package.

HV-4 asks:

> Can Hive-Venues take explicit, reviewable, secret-safe venue/context/package/deployment inputs and deterministically construct or validate one isolated venue composition without copying generic source, introducing an unsupported venue-type assumption, admitting a real client, or changing production?

Success requires code, deterministic tests, and human developer/operator review while all protected Hive, security, payment, deployment, and production boundaries remain unchanged.

## 2. Architecture under test

The accepted composition remains:

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

HV-4 does not introduce request-time tenant selection. The bootstrap layer is a composition/validation workflow around the accepted seams, not a replacement source of truth for them.

## 3. Venue-neutrality rule

The project direction includes independently branded venue applications beyond Fourth Street. The available project evidence does not establish an exhaustive canonical venue-category taxonomy.

Therefore HV-4 freezes these rules:

```text
MANDATORY_VENUE_TYPE_FIELD = NO
BAR_SPECIFIC_GENERIC_PLATFORM_NOUNS = FORBIDDEN
VENUE_SPECIFIC_OPERATOR_VOCABULARY = PACKAGE_OWNED_WHEN_GENUINELY_VARIABLE
FUTURE_CAPABILITY_OR_TYPE_TAXONOMY = REQUIRES_PRODUCT_EVIDENCE
```

HV-4 must not invent a mandatory `bar | restaurant | cafe | club | ...` enum merely to appear generic. A future taxonomy may be introduced only when real product requirements justify it.

The existing Lantern Room fixture is the default non-bar proof. It already demonstrates `reading room` / `host` vocabulary through the same generic rendering path and is preferable to inventing a real venue or unsupported category model.

## 4. Authoritative input ownership

### Platform / security invariants

The following are not bootstrap customization fields:

- Hive operation construction and semantic validation;
- Keychain-local custody and signing;
- explicit operation review before signing;
- authentication/session security semantics;
- payment replay, idempotency, observation, and confirmation semantics;
- moderation and encrypted-inbox security mechanisms;
- onboarding credential-generation and transaction-safety mechanisms;
- generic accessibility/responsive requirements;
- exact source/release provenance mechanisms;
- one-isolated-venue-per-runtime architecture unless separately superseded.

Bootstrap must not permit arbitrary override of these invariants.

### Venue context — HV-1 ownership

Bootstrap may consume the existing venue-context fields such as venue id, display name, public business data, Hive community/account bindings, Threads container account, and approved merchant accounts.

`createVenueContext(...)` remains authoritative. HV-4 must not create a second weaker venue-context parser.

### Venue package — HV-3 ownership

Bootstrap may consume package-owned authored expression, logo/media references and dimensions, SEO copy, homepage/gallery copy, and genuinely variable venue-facing operator/staff vocabulary.

`createVenuePackage(..., venue)` remains authoritative. HV-4 must preserve venue-id binding and must not duplicate or weaken that validator.

### Deployment profile — HV-2 ownership

Bootstrap may consume an explicit deployment manifest/profile for one isolated runtime. `compileDeploymentProfile(...)` remains authoritative for deployment id, provider/runtime/topology facts, hosts, release/service paths, storage paths, provenance filenames, runtime profile names, and release policy.

Synthetic deployment values must be unmistakably fixture/test-only and must not imply a real provider account or deployable production target.

## 5. Secret/private operational boundary

HV-4 must explicitly distinguish non-secret bootstrap inputs from values that may never be written into committed generated artifacts, including private Hive keys, Keychain credentials, session/auth secrets, provider/API tokens, DNS/Cloudflare credentials, SSH keys, and other private deployment credentials.

The bootstrap flow must not generate, solicit, persist, echo, or commit real secret values. Deterministic fixtures must use clearly non-secret sentinel/example values or omit secret fields entirely.

## 6. Bootstrap contract

Implementation must provide one explicit, versioned, reviewable non-secret bootstrap input format or an equivalent deterministic composition contract.

The preferred semantic shape is:

```text
schemaVersion
bootstrapId
venueContext
venuePackage
deploymentManifest
metadata / non-secret operator notes (optional, bounded)
```

No mandatory `venueType` field is allowed.

The implementation should compose the accepted constructors rather than re-parse their domains:

```text
createVenueContext(...)
createVenuePackage(..., venue)
compileDeploymentProfile(...)
```

It must fail closed on malformed input, missing required input, venue/package mismatch, unsafe deployment input, or conflicting identities.

## 7. Deterministic review output

HV-4 must expose a deterministic result a human can review and a test can compare without production mutation. This may be an immutable in-memory composition plus canonical normalized JSON, a generated non-secret fixture bundle, or an equivalently deterministic artifact.

Requirements:

- same normalized inputs produce byte-identical or semantically exact normalized output;
- output contains no secret values;
- venue id, package id, and deployment id are explicit;
- cross-identity mismatch cannot be ignored;
- generated output is disposable/rebuildable and not a hidden control plane;
- no routes, controllers, generic templates, or source branches are copied per venue.

A small composition/validation tool is preferred over a large project generator if it proves the architecture with less machinery.

## 8. Developer/operator workflow

The later implementation must make it obvious:

1. which non-secret inputs define one isolated venue application;
2. which values are venue-, package-, deployment-, or platform-owned;
3. which values must remain secret/out of source control;
4. how to validate the composition offline;
5. how to inspect deterministic normalized output;
6. how malformed/conflicting input is reported.

A CLI is preferred if it materially improves reproducibility, but exact command naming is not preregistered.

A developer must not need to reverse-engineer Fourth Street source modules to understand how another isolated venue is composed.

## 9. Synthetic proof fixture

The existing fictional Lantern Room fixture remains the default proof subject:

```text
id = lantern-room-fixture
displayName = The Lantern Room (Fixture)
operatorNoun = reading room
staffRole = host
real_business = NO
network_requirement = NO
real_credentials = NO
```

HV-4 may add only the bootstrap/deployment fixture data needed to prove the full composition.

The proof must remain offline, fictional, credential-free, and non-deploying; use the same authoritative validators and generic composition path as the reference; preserve materially distinct branding/copy/vocabulary; reject cross-pairing with Fourth Street; reject malformed deployment input; and produce deterministic reviewable output.

It is not evidence that a real second venue is production-ready.

## 10. No-source-fork criterion

HV-4 fails if another venue requires copied route/controller/view trees, a venue-specific source branch, generic code such as `if venue === fourthStreet`, hidden imports of Fourth Street reference data in the generic bootstrap path, or replacement of the accepted validators with venue-specific parsing.

Reference-specific and fixture-specific modules remain allowed at explicit reference/fixture boundaries.

## 11. Successor developer identity boundary

HV-4 may evaluate and, if qualification proves safety, correct source/developer-facing metadata whose current one-off Hive-Bar identity is misleading, including:

- root private package name;
- root package description;
- corresponding package-lock root metadata;
- developer-facing help/script text that has no production compatibility meaning.

HV-4 may **not** rename provenance-bearing Fourth Street production compatibility facts, including:

- `/opt/hive-bar`;
- `hive-bar.service`;
- `/var/lib/hive-bar/...`;
- `.hive-bar-commit` / `.hive-bar-tree`;
- Fourth Street production hosts;
- protected deployment-profile identity where provenance requires it;
- `fourth-street-bar-app/<version>`;
- historical Hive-Bar artifacts/document names and source-lineage references;
- any live infrastructure name.

Source package metadata cleanup is not a production migration.

## 12. Required failure gates

Reject HV-4 if any of the following occurs:

1. HV-1/HV-2/HV-3 validation is weakened or bypassed;
2. a mandatory venue-type taxonomy is introduced without new product evidence;
3. bar-specific assumptions remain in generic bootstrap/application code;
4. the synthetic fixture requires network access or real custody;
5. venue/package mismatch can proceed silently;
6. malformed deployment input does not fail closed;
7. secrets can appear in generated committed output;
8. supporting another venue requires copied generic source or venue-specific branches;
9. source identity cleanup renames protected production compatibility facts;
10. protected Hive/payment/auth/onboarding/moderation semantics change;
11. live production is mutated or a real second venue is admitted;
12. shared-runtime tenancy is introduced;
13. Kubo/IPFS, Helia/OrbitDB, or fleet orchestration is smuggled into scope;
14. machine checks pass but human developer/operator review still finds the workflow dependent on reverse-engineering Fourth Street.

## 13. Qualification requirements

The later implementation must pass the repository's deterministic gates on Ubuntu and Windows plus secret scanning, production dependency audit, release coherence, and inherited functional-V1 checks.

Focused HV-4 tests must cover:

- valid Lantern Room bootstrap composition;
- deterministic normalized output;
- invalid/missing manifest rejection;
- malformed venue context through HV-1 validation;
- malformed venue package through HV-3 validation;
- malformed deployment manifest through HV-2 compilation;
- cross-venue package rejection;
- result immutability/non-mutation where applicable;
- absence of mandatory venue-type branching;
- distinct `reading room` / `host` vocabulary without bar-specific generic code;
- secret-safety behavior;
- preservation of production compatibility names;
- package/lock coherence if source metadata changes;
- no material test, coverage, or security regression.

Rendered qualification is required only if implementation actually changes presentation/runtime surfaces. No visual-scope reduction may hide a real user-visible change.

## 14. Human acceptance review

Before acceptance, Project Lead review must perform the bootstrap workflow and confirm that required inputs, ownership boundaries, secret handling, offline validation, deterministic output, and failure messages are understandable without inspecting Fourth Street internals; that Lantern Room demonstrates genuine independent composition; that no unsupported venue taxonomy is required; and that production compatibility names remain visibly protected.

Machine-green status remains necessary but insufficient.

## 15. Explicit non-effects

Neither this preregistration nor later bounded HV-4 implementation may silently authorize or perform:

- a real second venue/client launch;
- live Fourth Street deployment or infrastructure mutation;
- Hive account/community creation or authority changes;
- private-key custody changes;
- payment/onboarding/moderation tenant-schema migration;
- request-time shared-runtime tenant selection;
- Kubo/IPFS installation, pinning, or publication;
- Helia/libp2p/OrbitDB integration;
- fleet provisioning/orchestration;
- DNS/Cloudflare/Caddy/VPS/systemd mutation;
- production secret rotation;
- production service/path/storage/provenance/app-tag renaming;
- convenience dependency/runtime upgrades;
- broad UI/theme redesign;
- protocol, payment, authentication, moderation, onboarding, or signing semantic changes.

## 16. Integration and post-HV-4 boundary

Any later HV-4 implementation candidate must be cleanly based or explicitly rebuilt/re-raced, fully qualified, human-reviewed, exact-diff reviewed, fresh-raced against canonical `main`, and integrated non-forcibly when possible.

If HV-4 is later implemented and accepted, perform a fresh sequencing decision. Candidate downstream questions may include a real isolated second-venue pilot, a bounded Kubo/IPFS immutable-publication experiment, fleet operations, further successor identity cleanup, continuity branch-to-tag maintenance, and Helia/OrbitDB research only if a concrete non-authoritative replicated-data use case emerges.

None is selected by this preregistration.

Freezing this file does not itself authorize HV-4 implementation. A subsequent explicit Project Lead implementation-authorization event is required before substantive implementation begins.
