# HV-4 Isolated Venue Bootstrap Foundation — Preregistration 0.1.0

## Status

```text
OPERATION = HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION
PREREGISTRATION_VERSION = 0.1.0
STATUS = FROZEN_PREREGISTRATION__IMPLEMENTATION_NOT_STARTED
REPOSITORY = etblink/Hive-Venues
CANONICAL_BASE_COMMIT = 8d97aad58b5fa8187f358f71c53ba2debfc24a84
CANONICAL_BASE_TREE = 30a26e585038cbf41e7f90d1aae163088de9ae85
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

This preregistration prospectively defines the bounded HV-4 implementation before any HV-4 implementation begins. It operationalizes the accepted Post-HV-3 Sequencing Decision without silently turning bootstrap work into a real-client launch, production migration, fleet-control system, shared-runtime tenancy project, distributed-storage experiment, or cosmetic rebrand.

## 1. Controlling objective

HV-1 established an explicit validated venue context.

HV-2 established an explicit validated deployment profile.

HV-3 established an explicit validated venue package.

The remaining near-term uncertainty is whether those accepted seams can be instantiated deliberately as one isolated venue application by a developer/operator who is not reverse-engineering Fourth Street-specific source assumptions.

HV-4 must answer one bounded question:

> Can Hive-Venues take explicit, reviewable, secret-safe venue/context/package/deployment inputs and deterministically construct or validate one isolated venue composition without copying generic source, introducing a venue-type assumption, admitting a real client, or changing production?

HV-4 succeeds only if that question is demonstrated through code, deterministic tests, and human developer/operator review while the protected security, payment, Hive, deployment, and production boundaries remain unchanged.

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

HV-4 does **not** introduce request-time tenant selection. One runtime remains bound to one venue composition.

The bootstrap layer is not a new source of truth for venue, package, or deployment semantics. It is an explicit composition/validation workflow around the existing accepted constructors and ownership boundaries.

## 3. Venue-neutrality rule

Prior project context establishes a resellable / independently branded application direction beyond Fourth Street Bar. The current evidence does not establish a canonical exhaustive list of venue categories.

Therefore HV-4 must not introduce a mandatory taxonomy such as:

```text
bar | restaurant | cafe | nightclub | music_venue | gallery | ...
```

merely to make configuration look generic.

The following rules are frozen:

```text
MANDATORY_VENUE_TYPE_FIELD = NO
BAR_SPECIFIC_GENERIC_PLATFORM_NOUNS = FORBIDDEN
VENUE_SPECIFIC_OPERATOR_VOCABULARY = PACKAGE_OWNED_WHEN_GENUINELY_VARIABLE
FUTURE_CAPABILITY_OR_TYPE_TAXONOMY = REQUIRES_PRODUCT_EVIDENCE
```

A future venue may differ meaningfully from Fourth Street. HV-4 must preserve that possibility without pretending those differences are already fully classified.

The existing Lantern Room synthetic fixture is valuable evidence because it already proves a non-bar vocabulary (`reading room`, `host`) through the same generic rendering path. HV-4 should reuse or extend that fixture rather than invent a real venue category or client.

## 4. Frozen bootstrap input taxonomy

The implementation must make the minimum required inputs understandable and explicitly owned.

### 4.1 Platform-owned invariants

These are not bootstrap customization fields:

- Hive operation construction and semantic validation;
- Keychain custody/signing rules;
- explicit operation review;
- authentication/session security semantics;
- payment replay/idempotency/observation/confirmation semantics;
- moderation and encrypted-inbox security mechanisms;
- onboarding credential-generation and transaction-safety mechanisms;
- generic accessibility/responsive interaction requirements;
- source/release provenance mechanisms;
- one-isolated-venue-per-runtime architecture unless separately superseded.

Bootstrap must not permit arbitrary override of these invariants.

### 4.2 Venue-context inputs — HV-1 ownership

Bootstrap may require or consume the existing venue-context fields, including:

- venue id;
- display name;
- public address;
- phone;
- hours;
- public website/map URLs;
- Hive community id;
- official Hive account;
- Threads container account;
- allowed payment merchant accounts.

The existing `createVenueContext` validation remains authoritative. HV-4 must not create a second weaker context parser.

### 4.3 Venue-package inputs — HV-3 ownership

Bootstrap may require or consume authored venue-expression inputs already accepted under the venue-package schema, including:

- logo/media references and dimensions;
- SEO description;
- authored hero/section/gallery copy;
- authentic or fixture media metadata;
- venue-facing onboarding/operator vocabulary;
- other package-owned expression already allowed by `venuePackageSchema`.

The existing `createVenuePackage` validation and venue-id binding remain authoritative. HV-4 must not duplicate or weaken them.

### 4.4 Deployment-profile inputs — HV-2 ownership

Bootstrap may consume an explicit deployment manifest/profile for an isolated runtime. The existing `compileDeploymentProfile` semantics remain authoritative for:

- deployment id;
- provider/package/region/OS;
- pinned runtime provenance;
- topology/proxy/TLS/application bind facts;
- public/redirect hosts;
- release root/service/health/readiness facts;
- storage paths;
- provenance filenames;
- runtime profile names and release policy.

For the synthetic proof, deployment values must be clearly fictional/test-only and must not imply a live provider account or deployable production target.

### 4.5 Secret/private operational inputs

The bootstrap contract must explicitly distinguish values that may **never** be written into generated committed source or fixture artifacts, including as applicable:

- private Hive keys;
- Keychain credentials;
- session/auth secrets;
- provider/API tokens;
- DNS/Cloudflare credentials;
- SSH keys;
- private deployment credentials;
- any future secret material required by a real venue.

HV-4 must not generate, solicit, persist, echo, or commit real secret values.

A secret placeholder may be named/documented only when needed to explain future operator responsibilities; deterministic fixtures must use non-secret sentinel values or avoid the field entirely.

### 4.6 Optional policy inputs

Only already-accepted, clearly owned venue/deployment policy may be included. HV-4 must not create a generic feature-flag dumping ground or allow bootstrap to override protected protocol/security behavior.

## 5. Bootstrap manifest / artifact boundary

The implementation must provide one explicit, versioned, reviewable bootstrap input format or equivalent deterministic composition contract.

The preferred shape is a **non-secret bootstrap manifest** whose semantic sections bind or embed the three accepted seams rather than restating them in incompatible forms.

Exact filenames may change if implementation reveals a materially cleaner fit, but the contract must be equivalent to:

```text
schemaVersion
bootstrapId
venueContext
venuePackage
deploymentManifest
metadata / non-secret operator notes (optional, bounded)
```

No mandatory `venueType` field is allowed.

The bootstrap layer may call the accepted constructors internally:

```text
createVenueContext(...)
createVenuePackage(..., venue)
compileDeploymentProfile(...)
```

and must fail closed if any section fails its authoritative validator or if identities conflict.

## 6. Deterministic output boundary

HV-4 must produce or expose a deterministic result that a human can review and a test can compare without mutating production.

Acceptable output may be an immutable in-memory composition plus a canonical normalized JSON summary, a generated non-secret fixture bundle, or an equivalent deterministic artifact.

The selected implementation must satisfy all of the following:

- same normalized inputs produce byte-identical or semantically exact normalized output;
- output contains no secret values;
- output clearly binds venue id, package id, and deployment id;
- output makes cross-venue/package mismatch impossible to ignore;
- output does not itself become a deployment credential or hidden mutable control plane;
- generated output is reviewable and may be safely discarded/rebuilt;
- implementation does not duplicate routes/controllers/templates per venue.

HV-4 does not require a full project generator that copies the repository into a new tree. A smaller composition/validation tool is preferred if it proves the architectural question with less machinery.

## 7. CLI / developer workflow criterion

The later implementation must expose a clear developer/operator workflow. A command-line entry point is preferred if it materially improves reproducibility, but exact command naming is not preregistered.

The workflow must let a developer determine:

1. which non-secret files/inputs define a venue;
2. which values are venue-owned versus package-owned versus deployment-owned;
3. which values must remain secret/out-of-repository;
4. how to validate the composition offline;
5. how to see deterministic normalized output;
6. how failures identify the exact invalid ownership/binding boundary.

The workflow must not require reading Fourth Street source modules to understand how a new isolated venue is composed.

## 8. Synthetic proof fixture

The existing fictional Lantern Room fixture is the default HV-4 proof subject.

It currently demonstrates:

```text
id = lantern-room-fixture
displayName = The Lantern Room (Fixture)
operatorNoun = reading room
staffRole = host
real_business = NO
network_requirement = NO
real_credentials = NO
```

HV-4 should reuse its context/package semantics and add only the bootstrap/deployment fixture data needed to prove the full composition.

The synthetic proof must:

- remain unmistakably fictional/test-only;
- require no network access;
- require no real Hive account authority or private credentials;
- require no real DNS, VPS, payment, or provider custody;
- compile through the same authoritative context/package/deployment validators used by reference composition;
- use no Fourth Street-specific conditional in generic bootstrap/application code;
- use materially distinct branding/copy/operator vocabulary from Fourth Street;
- fail closed if its package is paired with Fourth Street context or vice versa;
- fail closed on deployment-profile corruption or identity conflict;
- produce deterministic reviewable output.

The fixture is not evidence that a real second venue is production-ready.

## 9. No-source-fork criterion

HV-4 fails if instantiating the synthetic venue requires any of the following:

- copied route/controller trees;
- copied generic view/template trees;
- source branches per venue;
- conditions such as `if venue === fourthStreet` in generic consumers;
- hidden imports of the Fourth Street reference package in a purportedly generic bootstrap path;
- replacement of the accepted venue-context/package/deployment validators with venue-specific parsing.

Reference-specific modules and fixture modules remain allowed at explicit reference/fixture boundaries.

## 10. Successor developer identity boundary

HV-4 may correct **source/developer-facing** metadata whose current one-off Hive-Bar meaning is now misleading, but only when qualification proves there is no protected production semantic dependency.

The implementation is authorized to evaluate and, if safe, change:

- root `package.json` package name from `hive-bar` to a successor-native private package identity;
- root package description to the Hive-Venues multi-venue platform description;
- corresponding root package-lock metadata required for lock coherence;
- developer-facing script/help text whose only meaning is repository/product identity rather than production compatibility.

The following remain protected compatibility facts and are **not** authorized for rename by HV-4:

- `/opt/hive-bar` production release root;
- `hive-bar.service`;
- `/var/lib/hive-bar/...` storage paths;
- `.hive-bar-commit` and `.hive-bar-tree`;
- Fourth Street production host/redirect host;
- Fourth Street deployment profile id where provenance requires it;
- `fourth-street-bar-app/<version>` Hive application tag;
- historical artifact/document names;
- historical Hive-Bar source-lineage references;
- any current live infrastructure name.

A package metadata rename is not a production migration.

## 11. Source-control and secret-safety gate

HV-4 implementation must add deterministic tests or checks sufficient to prove:

- bootstrap fixtures contain no real secrets;
- generated output excludes secret values;
- bootstrap documentation never instructs operators to commit private keys/tokens;
- existing repository secret scanning still passes;
- no `.env`/provider credential generation is silently introduced;
- fixture hostnames/accounts are clearly reserved/example/test values where possible.

## 12. Failure conditions

The HV-4 candidate must be rejected if any of the following occurs:

1. bootstrap weakens or bypasses HV-1/HV-2/HV-3 validation;
2. a mandatory venue-type taxonomy is introduced without new product evidence;
3. generic bootstrap/application code contains bar-specific assumptions that are not explicit reference-package material;
4. the synthetic fixture requires network access or real custody;
5. cross-venue/package identity mismatch can proceed silently;
6. malformed deployment input does not fail closed;
7. real secrets can appear in generated committed output;
8. supporting another venue requires copying generic source or maintaining a venue-specific branch;
9. source package identity cleanup renames Fourth Street production compatibility names;
10. protected Hive/payment/auth/onboarding/moderation semantics change;
11. live production is mutated;
12. a real second venue is admitted;
13. shared-runtime tenancy is introduced;
14. Kubo/IPFS, Helia/OrbitDB, or fleet orchestration is smuggled into scope;
15. machine checks pass but human developer/operator review finds the workflow confusing or still dependent on reverse-engineering Fourth Street source.

## 13. Deterministic qualification requirements

The later implementation must pass the repository's supported deterministic gates on Ubuntu and Windows.

Focused HV-4 evidence must include tests for:

- valid synthetic bootstrap composition;
- exact deterministic normalized output;
- invalid/missing manifest rejection;
- malformed venue-context rejection through the existing HV-1 validator;
- malformed venue-package rejection through the existing HV-3 validator;
- malformed deployment-manifest rejection through the existing HV-2 compiler;
- cross-venue package rejection;
- immutable or non-mutable result semantics where applicable;
- absence of mandatory venue-type branching;
- distinct Lantern Room operator vocabulary without bar-specific generic code;
- source-control/secret-safety behavior;
- preservation of production compatibility names;
- package/lock metadata coherence if source identity is changed;
- no material test/coverage/security regression.

The complete deterministic quality gate, secret scan, production dependency audit, and inherited functional/release coherence checks must remain green.

## 14. Rendered qualification boundary

HV-4 is primarily developer/bootstrap work. A full visual suite is not automatically required merely because it exists.

Rendered qualification is required only if the implementation changes presentation/runtime surfaces in a way that could alter user-visible behavior.

If source/developer metadata and bootstrap tooling are the only application-adjacent changes, deterministic tests plus an offline synthetic composition/render smoke may be sufficient. Any actual shared template/view/CSS change triggers the relevant current rendered gates and human review.

No visual-scope reduction may hide a real presentation change.

## 15. Human usability review

Before acceptance, Project Lead review must perform the workflow as a developer/operator and answer:

- Is it obvious what inputs are required?
- Are ownership boundaries understandable without reading Fourth Street implementation modules?
- Is the non-secret versus secret boundary explicit?
- Can the Lantern Room fixture be validated/composed from one documented path?
- Does failure output identify malformed or conflicting input clearly?
- Does the workflow avoid a venue-type assumption?
- Does the result demonstrate a genuinely independent venue composition rather than renamed Fourth Street data?
- Are production compatibility names visibly protected from source identity cleanup?
- Is the architecture simpler to instantiate after HV-4 than before it?

Machine-green status is necessary but not sufficient.

## 16. Integration protocol

The later implementation must use a clean candidate lineage from the then-current authorized canonical base or from an explicitly re-raced/rebuilt equivalent.

Before canonical integration:

1. freeze the exact implementation commit/tree;
2. complete focused HV-4 tests and full deterministic qualification;
3. complete any rendered qualification justified by changed surfaces;
4. complete Project Lead human bootstrap usability/source review;
5. inspect exact aggregate diff and ancestry;
6. fresh-race canonical `main`;
7. reject/rebuild if intervening canonical change invalidates qualification;
8. integrate non-forcibly, preserving a clean commit chain when practical.

## 17. Explicit non-effects

HV-4 preregistration and implementation must not silently perform or authorize:

- a real second venue/client launch;
- live Fourth Street deployment or infrastructure mutation;
- Hive account/community creation or authority changes;
- private-key custody changes;
- payment/onboarding/moderation durable-schema tenancy migration;
- request-time shared-runtime tenant selection;
- Kubo/IPFS installation, pinning, or publication;
- Helia/libp2p/OrbitDB integration;
- fleet provisioning or orchestration;
- DNS/Cloudflare/Caddy/VPS/systemd mutation;
- production secret rotation;
- production service/path/storage/provenance/app-tag renaming;
- dependency/runtime upgrades merely for convenience;
- broad UI/theme redesign;
- protocol, payment, authentication, moderation, onboarding, or signing semantic changes.

## 18. Post-HV-4 decision boundary

If HV-4 is later implemented and accepted, the project must perform a fresh sequencing decision.

Candidate downstream questions may include:

- a real isolated second-venue pilot;
- Kubo/IPFS immutable venue-artifact publication;
- fleet provisioning/release management for isolated venue instances;
- further successor developer identity cleanup;
- product-quality work revealed by the bootstrap proof;
- continuity branch-to-tag maintenance;
- Helia/OrbitDB research only if a concrete non-authoritative replicated-data use case exists;
- shared-runtime tenancy research only if concrete value justifies the substantially larger isolation problem.

None of those is selected by this preregistration.

## 19. Preregistration non-effects

Freezing or canonically accepting this file does not itself mean HV-4 implementation has started.

It does not create a real venue, mutate production, publish to IPFS, install distributed-storage software, rename production infrastructure, or authorize shared tenancy.

A subsequent explicit Project Lead implementation authorization/routing event is required before substantive HV-4 implementation begins.
