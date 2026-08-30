# Hive-Venues Living Roadmap

This is the living current/next sequencing document for the successor repository. Historical Hive-Bar milestone files preserve accepted evidence and prior decisions but do not redefine this roadmap.

## Current state

```text
REPOSITORY = etblink/Hive-Venues
PRODUCT = Hive-Venues
REFERENCE_VENUE = Fourth Street Bar, Reno
SOURCE_LINEAGE = etblink/Hive-Bar
HV1_VENUE_CONTEXT_FOUNDATION = ACCEPTED
HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION = ACCEPTED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
NEXT_OPERATION = POST_HV2_SEQUENCING_DECISION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
```

HV-1 is canonical at commit `ca553af0215d5d4165791a4af695b9cd70ff138c`, tree `15ff602871723a15557376cb59dabb151a658b47`.

The accepted clean HV-2 implementation is commit `1b7549b31bd8692497061eaacfdcbc39a91b8a20`, tree `64bc51e164b7fdc4218d8928897627dfc7602028`, a direct child of the exact pre-HV-2 canonical parent `0bfa6753f08c87242ffbf9c9cc7a059c7e71a497`. Its acceptance and qualification evidence is recorded in `HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION_ACCEPTANCE_0_1_0.md`.

The successor architecture is frozen in `HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md`. It adopts a hybrid preservation/reconstruction strategy: retain proven protocol/security/payment/operational machinery, reconstruct platform and deployment boundaries where needed, and preserve or improve strong venue-specific product work.

The canonical source branch can advance after this document is written. Resolve the exact current `main` commit/tree from GitHub when qualifying or releasing rather than treating milestone identities above as permanent source pins.

## Production lineage boundary

Fourth Street's existing production environment remains the reference compatibility deployment. Hive-Bar-era service names, release paths, storage paths, release identity files, host, and Hive application tag are provenance-bearing deployment facts and remain unchanged unless a later production migration is separately qualified and authorized.

The last recorded accepted production transition in the inherited roadmap is M19.2. Do not infer current runtime identity from that historical event; inspect the installed release/build identity for any operational decision.

Successor source changes do not authorize deployment, account creation, delegation, payment activation, write-mode escalation, secret rotation, or infrastructure mutation.

## HV-0 — Successor migration and baseline — COMPLETE

Completed:

- preserve the original Hive-Bar Git object graph rather than flattening history;
- mirror all 34 source branch tips at their exact source SHAs;
- establish the successor repository and product identity;
- run a read-only inherited baseline audit;
- freeze the successor baseline and HV-1 preregistration.

Inherited baseline evidence included 532/532 tests passing, 81.93% line coverage, 73.82% branch coverage, 87.27% function coverage, and zero reported npm vulnerabilities.

## HV-1 — Venue Context Foundation — COMPLETE

Purpose: establish the first explicit venue boundary while preserving Fourth Street behavior.

Accepted result:

- validated, deeply frozen venue context;
- canonical Fourth Street reference venue;
- explicit venue injection into application construction;
- home and Pay route wiring consume venue bindings rather than hidden canonical identifiers;
- existing environment contract retained as a compatibility input layer;
- synthetic alternate venue construction proven without network access;
- transaction/payment/onboarding engines unchanged.

Acceptance evidence:

- 538/538 full builder tests passing;
- 6/6 focused venue-context tests passing;
- coverage 82.14% lines / 73.88% branches / 87.36% functions;
- zero reported npm vulnerabilities;
- Ubuntu and Windows deterministic CI passing;
- M18.2, M18.3, M18.4, UX-1A, UX-1B, UX-1C, UX-1D, and UX-1F visual acceptance passing;
- independent Project Lead source and rendered-evidence review passing.

HV-1 establishes a seam; it does not establish shared-runtime multi-tenancy.

## Successor Architecture Reconciliation — CURRENT GOVERNANCE BASELINE

The accepted architecture is:

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

Why:

- Hive transaction builders and security primitives are largely account/payload/config driven and reusable;
- the payment lifecycle and related safety machinery are high-value shared assets;
- current payment, moderation, and onboarding persistence is venue-local and not tenant-keyed;
- release/deployment facts require an explicit deployment-profile boundary rather than scattered provider/venue literals;
- current Fourth Street editorial/visual work demonstrates that venue specificity should be supported, not erased.

## HV-2 — Reference Deployment Profile Extraction — COMPLETE

Purpose: make deployment identity an explicit validated dependency while preserving the exact current Fourth Street/Privex reference values.

Accepted result:

- `ops/privex/manifest.json` remains the reviewed reference source for Fourth Street deployment-specific facts;
- a validated, deeply immutable deployment profile is compiled from that manifest;
- release/readiness/storage/onboarding consumers resolve deployment-owned facts through the profile where safe;
- the Fourth Street reference profile preserves exact host, provider, topology, service, release-root, storage, provenance, runtime-profile, app-tag, and release-policy behavior;
- a provider-neutral synthetic deployment compiles offline without changing venue identity;
- Windows path/filename portability is explicitly fail-closed;
- venue-owned merchant policy remains outside the deployment profile;
- no live production change, second venue, persistent schema change, protocol semantic change, or shared-runtime tenancy was introduced.

Acceptance evidence:

- clean implementation commit `1b7549b31bd8692497061eaacfdcbc39a91b8a20`, tree `64bc51e164b7fdc4218d8928897627dfc7602028`;
- exact one-commit clean history from canonical parent `0bfa6753f08c87242ffbf9c9cc7a059c7e71a497`;
- 543-test deterministic suite with zero failures on Ubuntu and Windows, with only the two expected non-Windows Bash assertions skipped on Windows;
- secret scan passed across 414 repository files;
- zero reported production npm vulnerabilities;
- clean-SHA M18.2, M18.3, M18.4, UX-1A, UX-1B, UX-1C, UX-1D, and UX-1F visual acceptance passed;
- independent C2-E, C2-F, and UX-1E visual workflows passed;
- aggregate coverage improved from 82.24/73.77/87.36 to 82.50/74.06/87.64 for lines/branches/functions;
- the inherited coverage-mode-only M15.5.4 Tailwind exact-byte assertion failed identically on the exact parent and candidate and was not introduced or worsened by HV-2;
- independent Project Lead source, abstraction, portability, lifecycle, and qualification review passed.

The detailed acceptance record is `HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION_ACCEPTANCE_0_1_0.md`.

HV-2 establishes a deployment seam. It does not establish shared-runtime multi-tenancy or authorize any production deployment.

## Post-HV-2 sequencing decision — NEXT

The accepted architecture requires a fresh sequencing decision after HV-2. Completing HV-2 does not silently authorize the next substantive implementation lane.

The next operation is therefore:

```text
NEXT_OPERATION = POST_HV2_SEQUENCING_DECISION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
```

That decision must re-evaluate the current evidence and choose among candidate lanes only if a lane is actually justified. Momentum, prior listing order, or architectural neatness is not sufficient authorization.

## Post-HV-2 candidate lanes — NOT YET SEQUENCED

Candidate work includes, without priority order:

### Successor identity and developer experience

- reconcile package metadata and runtime logging from Hive-Bar lineage to Hive-Venues where doing so does not alter the Fourth Street protocol/deployment identity;
- create a clean new-venue bootstrap/development experience;
- distinguish platform names, venue names, deployment names, and protocol application tags explicitly.

### Venue packaging

- move venue-local editorial content, photography/assets, branding, and policy defaults behind a coherent venue-package boundary;
- preserve the strong Fourth Street homepage and other evidence-supported venue work as the reference package;
- prevent genericization from producing low-character template sites.

### Shared product quality

- improve shared navigation/shell identity so venue identity does not compete with implementation lineage;
- improve desktop profile/social information density where human review supports it;
- preserve strong accessibility, responsive behavior, operation review, payment safety communication, and failure-state semantics;
- use human rendered-evidence review as well as automated visual gates for meaningful presentation work.

### New venue readiness

- construct a complete synthetic/offline second venue package and isolated deployment profile;
- only then select a real second-venue pilot, with explicit custody/identity/configuration evidence;
- prove that a second venue requires configuration/content/policy work rather than a source fork.

### Fleet operations

- investigate safe repeatable provisioning, release, health, rollback, and upgrade management for multiple isolated venue instances;
- keep secrets, durable stores, domains, and failure domains isolated per venue by default.

### Shared-runtime tenancy research — OPTIONAL / DEFERRED

Only if concrete product/operational value justifies it:

- design explicit venue ownership for payment receipts, moderation state, onboarding requests, sessions/preflights, idempotency/replay domains, secrets, and observability;
- preregister migrations and isolation tests;
- prove cross-venue data and authority isolation before admitting multiple real venues to one runtime.

No shared-runtime implementation is implied by the platform name.

## Persistent quality tracks

Every successor milestone should be evaluated across the whole product rather than only its named architectural goal.

### Security and custody

Preserve Keychain-local custody, no server Hive private keys, no server Hive broadcast RPC, explicit review, fail-closed authorization, and no automatic retry after ambiguous acceptance.

### Financial/payment integrity

Preserve canonical amount handling, merchant validation, durable receipt state, payer serialization, invoice replay protection, idempotency, independent observation, and chain-confirmed success semantics.

### Product and UX

Keep venue character strong; prefer plain patron language; maintain accessible touch/focus/contrast behavior; and use real rendered evidence for meaningful visual decisions.

### Data and isolation

Treat current durable stores as venue-local until explicitly migrated. Do not imply tenancy merely because context/profile objects exist.

### Operations and provenance

Preserve exact-commit release identity, fail-closed readiness, rollback discipline, and source-versus-runtime identity separation.

### Maintainability and developer experience

Reduce duplicated deployment/venue constants, make dependencies explicit, keep architecture boundaries machine-testable, and avoid carrying old names into new universal abstractions without a compatibility reason.

## Historical Hive-Bar line

The inherited M1–M20/C2/UX milestones remain in Git history and historical documentation. In particular, M17–M19 capture important beta/V1 readiness, presentation, deployment, and onboarding evidence. They remain authoritative for what those operations established at the time.

They are no longer the living successor sequence. New work is governed by HV milestones and this roadmap.
