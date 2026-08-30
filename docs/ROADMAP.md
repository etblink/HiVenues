# Hive-Venues Living Roadmap

This is the living current/next sequencing document for the successor repository. Historical Hive-Bar milestones, prior successor preregistrations, and prior sequencing decisions preserve accepted evidence and past authorization boundaries but do not redefine this roadmap.

## Current state

```text
REPOSITORY = etblink/Hive-Venues
PRODUCT = Hive-Venues
REFERENCE_VENUE = Fourth Street Bar, Reno
SOURCE_LINEAGE = etblink/Hive-Bar
HV1_VENUE_CONTEXT_FOUNDATION = ACCEPTED
HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION = ACCEPTED
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
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```

Canonical source moves independently of milestone identities. Resolve exact current `main` commit/tree from GitHub when qualifying or releasing.

## Accepted successor sequence

### HV-0 — Successor migration and baseline — COMPLETE

Preserved the original Hive-Bar Git object graph, established Hive-Venues as the successor repository/product identity, and froze the inherited assurance baseline.

### HV-1 — Venue Context Foundation — COMPLETE

Established a validated, deeply frozen venue context and explicit application injection for venue identity, public business facts, Hive bindings, and merchant identity. It proved an alternate synthetic venue context offline without introducing shared-runtime multi-tenancy.

### HV-2 — Reference Deployment Profile Extraction — COMPLETE

Established a validated, deeply immutable deployment profile compiled from the reviewed Fourth Street/Privex manifest while preserving exact reference behavior and provenance-bearing compatibility names. It separated deployment-owned facts from venue identity and platform logic.

### HV-3 — Reference Venue Package Extraction — COMPLETE

Accepted clean implementation:

```text
PARENT = b5901cf6f4a603df11eca5c942d63caad5f009a8
COMMIT = 291b93c696c6265c2da4ad5caaaaee9701cb69a8
TREE = b39401e8154545bec2e6704455b53c3b8938b5b6
QUALIFICATION_PR = 14
QUALIFICATION_CI_RUN = 33327969282
```

HV-3 introduced a strict, deeply immutable venue-package abstraction; bound authored expression/media to venue identity; migrated selected reusable presentation surfaces away from hidden Fourth Street literals; preserved Fourth Street's authentic presentation; and proved a meaningfully distinct fictional alternate package offline without a source fork.

Acceptance details live in `HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_ACCEPTANCE_0_1_0.md`.

## Current architecture baseline

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

The three explicit seams now exist. The next uncertainty is no longer whether Fourth Street-specific facts can be separated. The next uncertainty is whether a developer/operator can intentionally instantiate another isolated venue composition from explicit, reviewable, secret-safe inputs without editing generic application source.

## Post-HV-3 Sequencing Decision — COMPLETE

The accepted Post-HV-3 decision selected:

```text
SELECTED_NEXT_LANE = ISOLATED_VENUE_BOOTSTRAP_AND_SUCCESSOR_DX
PROPOSED_MILESTONE = HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION
NEXT_OPERATION = HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
```

Why:

- HV-1/HV-2/HV-3 now make venue, deployment, and authored-expression ownership explicit;
- package metadata and developer-facing assumptions still visibly inherit the one-off Hive-Bar identity;
- a reproducible bootstrap contract is the smallest next test of whether the architecture can actually instantiate another isolated venue without source forks;
- a real second venue would add unnecessary business/custody/infrastructure obligations before bootstrap correctness is proven;
- fleet automation would automate a process not yet formally defined;
- Kubo/IPFS publication is promising but needs a deliberately defined immutable publication object;
- Helia/OrbitDB replicated state remains unjustified until a concrete non-authoritative replicated data domain is identified.

The accepted decision is `POST_HV3_SEQUENCING_DECISION_0_1_0.md`.

## Venue-category boundary

Hive-Venues is intended to support independently branded venue applications beyond Fourth Street. Current project evidence does **not** provide a canonical exhaustive venue taxonomy.

Therefore the bootstrap foundation must be venue-type neutral:

- no mandatory `bar | restaurant | club | cafe | ...` enum is introduced merely for abstraction;
- generic platform code should not require bar-specific nouns;
- venue package content may provide authentic operator/staff/customer vocabulary where it genuinely differs;
- platform/security semantics remain universal regardless of venue vocabulary;
- future product evidence may justify explicit capabilities or venue classifications later, but HV-4 must not guess them now.

## HV-4 — Isolated Venue Bootstrap Foundation — PREREGISTRATION NEXT

The next bounded operation is only:

```text
HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_PREREGISTRATION
```

The preregistration must freeze, at minimum:

- exact canonical source base;
- minimum bootstrap input taxonomy across platform, venue context, venue package, deployment profile, optional policy, and secret/private operational inputs;
- deterministic reviewable output format;
- offline synthetic bootstrap proof;
- no-source-fork criterion;
- venue-type neutrality and independently branded vocabulary support;
- developer-facing successor identity boundary;
- explicit preservation of Fourth Street production compatibility names;
- fail-closed validation for malformed/missing/cross-venue/unsafe inputs;
- source-control secret exclusion;
- human developer/operator usability review;
- deterministic Ubuntu/Windows qualification;
- explicit non-effects forbidding real-client admission, production mutation, shared-runtime tenancy, fleet orchestration, Kubo/IPFS publication, Helia/OrbitDB integration, protocol/payment/auth semantic changes, and unrelated UI redesign.

The preregistration itself does not authorize implementation.

## Production lineage boundary

Fourth Street's existing production environment remains the reference compatibility deployment. Hive-Bar-era service names, release paths, storage paths, release identity files, host, and Hive application tag remain provenance-bearing deployment facts unless a later production migration is separately qualified and authorized.

The last recorded accepted production transition in the inherited roadmap is M19.2. Do not infer current runtime identity from that historical event; inspect installed release/build identity for any operational decision.

Successor source changes do not authorize deployment, account creation, delegation, payment activation, write-mode escalation, secret rotation, or infrastructure mutation.

## Candidate-lane disposition after HV-3

### Real isolated second-venue pilot — DEFERRED ONE GATE

Potentially valuable after HV-4 proves bootstrap from synthetic/offline inputs. A real pilot requires separate business identity, content, Hive account/community, domain, policy, custody, and deployment authorization.

### Kubo / immutable IPFS publication — ELIGIBLE DOWNSTREAM RESEARCH

Eligible after a deliberate immutable venue publication artifact is defined. A Kubo experiment must not pretend the dynamic Express application is already a static site or expose administrative APIs publicly.

### Helia + OrbitDB replicated state — DEFERRED

Requires a concrete non-authoritative data domain with explicit privacy, access-control, conflict-resolution, and product-value justification. Canonical Hive state, payment receipts, auth/session authority, and onboarding credential custody are not candidates by default.

### Fleet operations — DEFERRED

Meaningful after HV-4 defines a repeatable per-venue input/output contract.

### Shared-runtime multi-tenancy — DEFERRED

No current evidence justifies weakening one-isolated-venue-per-runtime. Payment, moderation, onboarding, session/preflight, secret, replay/idempotency, and observability ownership are not tenant-migrated.

### Continuity branch-to-tag migration — OPTIONAL MAINTENANCE

The four `continuity/*` refs remain out of the substantive roadmap. They may later become milestone tags after exact semantic verification.

### Shared product quality — PERSISTENT TRACK

Accessibility, responsive behavior, navigation, social/profile composition, payment safety communication, onboarding clarity, and reference-venue quality remain continuous acceptance concerns.

## Historical routing rule

Earlier accepted sequencing records remain immutable historical evidence. In particular, `POST_HV2_SEQUENCING_DECISION_0_1_0.md` correctly recorded, at that time:

```text
POST_HV2_SEQUENCING_DECISION = ACCEPTED
SELECTED_NEXT_LANE = VENUE_PACKAGING
NEXT_OPERATION = HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
HV3_IMPLEMENTATION_STARTED = NO
SECOND_REAL_VENUE_AUTHORIZED = NO
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
```

That snapshot is superseded for current routing by accepted HV-3 and `POST_HV3_SEQUENCING_DECISION_0_1_0.md`; it is retained here only to make the transition explicit during the routing-checker reconciliation and must not be interpreted as current authorization.
