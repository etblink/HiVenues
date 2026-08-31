# Hive-Venues Living Roadmap

This document records **current** successor state and current/next sequencing. Superseded roadmap text remains recoverable from Git history and is not copied forward as a historical snapshot.

## Current state

<!-- HV6_CURRENT_ROUTING_START -->
```text
REPOSITORY = etblink/Hive-Venues
PRODUCT = Hive-Venues
REFERENCE_VENUE = Fourth Street Bar, Reno
FOURTH_STREET_REAL_CLIENT_STATUS = SOLE_REAL_CLIENT_AND_REFERENCE_DEPLOYMENT
SOURCE_LINEAGE = etblink/Hive-Bar
HV1_VENUE_CONTEXT_FOUNDATION = ACCEPTED
HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION = ACCEPTED
HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION = ACCEPTED
HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION = ACCEPTED
HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION = ACCEPTED
HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION = ACCEPTED
POST_HV3_SEQUENCING_DECISION = HISTORICAL_ACCEPTED__SUPERSEDED_FOR_CURRENT_ROUTING
POST_HV4_SEQUENCING_DECISION = HISTORICAL_ACCEPTED__SUPERSEDED_FOR_CURRENT_ROUTING
POST_HV5_SEQUENCING_DECISION = HISTORICAL_ACCEPTED__SUPERSEDED_FOR_CURRENT_ROUTING
POST_HV6_SEQUENCING_DECISION = PROJECT_LEAD_ACCEPTED
HV7_CANDIDATE_EVIDENCE_MODEL_AMENDMENT = ACCEPTED
POST_HV6_SELECTED_LANE_LABEL = HISTORICAL_ACCEPTED__SUPERSEDED_BY_HV7_EVIDENCE_MODEL_AMENDMENT
SELECTED_NEXT_LANE = ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT
HV7_CANDIDATE_MODE = SYNTHETIC_ADVERSARIAL
PROPOSED_NEXT_MILESTONE = HV7_ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT
HV6_PREREGISTRATION = ACCEPTED
HV6_PHASE_B_TECHNOLOGY_SELECTION = COMPLETE
SELECTED_ADAPTER = NATIVE_EXISTING_STACK
HV6_PHASE_C_IMPLEMENTATION_AUTHORIZATION = HISTORICAL_ACCEPTED__EXHAUSTED_BY_ACCEPTED_IMPLEMENTATION
HV6_PHASE_C_IMPLEMENTATION = ACCEPTED
NEXT_OPERATION = HV7_ADVERSARIAL_SECOND_VENUE_CANDIDATE_DESIGN__READ_ONLY
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
TECHNOLOGY_SELECTED = NATIVE_EXISTING_STACK
GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED
GRAPESJS_STUDIO_SDK = NOT_SELECTED
OPTIONAL_STARTER_ARCHETYPES = SUPPORTING_FIXTURES__NONAUTHORITATIVE
SECOND_REAL_VENUE = OPTIONAL_REAL_EVIDENCE_TIER__NOT_REQUIRED__NOT_AUTHORIZED
REAL_SECOND_VENUE_REQUIRED = NO
SECOND_REAL_VENUE_AUTHORIZED = NO
VENUE_OUTREACH = NOT_AUTHORIZED
SYNTHETIC_HV7_CANDIDATE = SELECTED_EXPERIMENT_MODE__TIER_A_ARCHITECTURAL_FALSIFICATION
SYNTHETIC_HV7_REAL_OPERATOR_USABILITY_EVIDENCE = NO
CID_PUBLICATION = ELIGIBLE_DOWNSTREAM__NOT_SELECTED
IPNS = ELIGIBLE_AFTER_CID_ARTIFACT__NOT_SOURCE_IDENTITY
THREESPEAK_SPK_MEDIA = ELIGIBLE_DOWNSTREAM__NOT_SELECTED
SUCCESSOR_PACKAGE_IDENTITY_CLEANUP = ELIGIBLE_ADJACENT_MAINTENANCE__NOT_SELECTED_PRODUCT_LANE
FLEET_OPERATIONS = DEFERRED
HELIA_ORBITDB_REPLICATION = DEFERRED
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```
<!-- HV6_CURRENT_ROUTING_END -->

Canonical source moves independently of milestone identities. Resolve exact current `main` commit/tree from GitHub when qualifying or releasing.

## Accepted successor foundation

### HV-1 — Venue Context Foundation — COMPLETE

Established validated venue identity, public business facts, Hive bindings, and merchant identity as explicit runtime input.

### HV-2 — Reference Deployment Profile Extraction — COMPLETE

Separated deployment identity and Fourth Street/Privex compatibility facts from generic platform code while preserving provenance-bearing production names.

### HV-3 — Reference Venue Package Extraction — COMPLETE

Separated authored venue expression and media from generic platform machinery and proved a meaningfully different fictional venue can use the same generic application path offline.

### HV-4 — Isolated Venue Bootstrap Foundation — COMPLETE

Established deterministic, secret-safe one-venue composition across venue context, venue package, deployment profile, and explicit identity bindings.

### HV-5 — Venue Authoring Contract Foundation — COMPLETE

Established one strict editor-independent canonical authoring envelope, executable ownership classes, fail-closed ordinary-operator editing, deterministic serialization, direct source/code authoring, and projection back into the accepted isolated-runtime boundary.

### HV-6 — Operator Visual Authoring Adapter Foundation — COMPLETE

HV-6 accepted a native existing-stack visual adapter under the HV-5 authority model.

Current accepted implementation identity:

```text
IMPLEMENTATION_COMMIT = 3b774468ff1ed347a35500f2a29062a63ed62621
IMPLEMENTATION_TREE = 5cde834eaf267aef8e6e824fd13b75e54045bb2c
IMPLEMENTATION_PARENT = edd7dbc32204115c2326f431e278860de2d748af
QUALIFICATION_PR = 55
QUALIFICATION_HEAD = 3a432687518a961da219f763efe2333b4dca55d8
QUALIFICATION_CI_RUN = 33359910931
RENDERED_ARTIFACT_ID = 9746470417
RENDERED_ARTIFACT_SHA256 = b6fedcb4c11e1b508fa3747591d41c2e537c91497336cdf07ba1324e95788a11
ACCEPTANCE_COMMIT = 6ad7c55a4e02a126d6d91f07847d76cfd33b8b8d
ACCEPTANCE_TREE = 58df05137560873463fc0cd2dc634f967677bee5
ACCEPTANCE_PR = 56
ACCEPTANCE_CI_RUN = 33360515127
SELECTED_ADAPTER = NATIVE_EXISTING_STACK
GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED
```

The accepted authority flow is:

```text
ACCEPTED_HV5_DOCUMENT
-> NATIVE_VISUAL_ADAPTER_PROJECTION
-> OPERATOR_INTERACTION
-> PROPOSED_HV5_DOCUMENT
-> applyOrdinaryOperatorEdit(base, proposed)
-> ACCEPTED_HV5_DOCUMENT
-> CANONICAL_SERIALIZATION
```

The accepted implementation shape is:

```text
SEMANTIC_SECTION_NAVIGATOR
+
TYPED_FIELD_INSPECTOR_DERIVED_FROM_HV5_OWNERSHIP
+
TRUTHFUL_REVIEW_PREVIEW_FROM_PROPOSED_HV5_STATE
```

The selected foundation keeps editable authority derived from HV-5, provides real-renderer review preview, preserves Apply/Discard/reload semantics, protects non-operator authority, preserves direct-source independence, remains venue-neutral, and has cross-platform/rendered evidence. The schema-v1 gallery stable-identity limitation remains explicit rather than hidden behind heuristics.

A source authoring foundation is not a production authoring mount. Any later live authoring operation must separately establish operator authentication, session/CSRF/origin ownership, persistence destination, deployment behavior, and production authorization.

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
+
BOOTSTRAP_COMPOSITION_BINDINGS
+
CANONICAL_AUTHORING_CONTRACT
+
NATIVE_VISUAL_AUTHORING_ADAPTER
=
ONE_ISOLATED_VENUE_RUNTIME
```

Visual tooling remains subordinate to the HV-5 domain model. Front-end visibility, arbitrary HTML/scripts, component trees, generated HTML/CSS, autosave state, and editor project state are not platform authority.

## Post-HV-6 sequencing — HISTORICAL DECISION PRESERVED, CURRENT INTERPRETATION AMENDED

The Project Lead's original independent read-only sequencing decision remains frozen in `POST_HV6_SEQUENCING_DECISION_0_1_0.md`:

```text
HISTORICAL_SELECTED_NEXT_LANE = REAL_ISOLATED_SECOND_VENUE_PILOT
HISTORICAL_PROPOSED_NEXT_MILESTONE = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT
HISTORICAL_NEXT_OPERATION = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT__PREREGISTRATION
```

That decision was followed by the canonical 0.1.0 HV-7 preregistration. Before that preregistration was accepted, new authoritative product context established that Fourth Street Bar remains the sole real client/reference deployment and that architectural falsification does not require recruiting another real venue.

The accepted 0.1.1 evidence-model amendment therefore supersedes the real-only interpretation for current routing without rewriting either historical artifact:

```text
CURRENT_SELECTED_NEXT_LANE = ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT
CURRENT_HV7_CANDIDATE_UNIVERSE = REAL_OR_SYNTHETIC_ALLOWED
PROJECT_LEAD_SELECTED_CANDIDATE_MODE = SYNTHETIC_ADVERSARIAL
CURRENT_PROPOSED_MILESTONE = HV7_ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT
CURRENT_NEXT_OPERATION = HV7_ADVERSARIAL_SECOND_VENUE_CANDIDATE_DESIGN__READ_ONLY
```

No substantive HV-7 implementation is authorized by this roadmap.

## Candidate dispositions

### Synthetic adversarial second venue — SELECTED EXPERIMENT MODE, DESIGN NEXT

A deliberately constructed synthetic venue is the selected next HV-7 experiment mode. It is valid Tier-A evidence for architectural falsification provided its requirement packet is frozen before implementation and is materially independent from Fourth Street.

The design must pressure multiple dimensions rather than merely reskinning the existing fixture:

- vocabulary;
- operating model;
- content structure;
- customer/member relationship;
- operator needs;
- Hive/deployment binding assumptions;
- visual-authoring semantics;
- compatibility-seam containment.

Synthetic HV-7 may test venue neutrality, no Fourth Street/bar leakage, no generic source fork, HV-1/HV-2/HV-3/HV-4 composition generality, HV-5 ownership fit, HV-6 structural visual-authoring generality, isolated-runtime sufficiency, and compatibility boundaries.

It may **not** establish real-client adoption, independent real-operator usability, real venue permission/admission, real-world operational fit, real Hive onboarding, or real deployment readiness.

### Real second venue — OPTIONAL LATER EVIDENCE TIER, NOT REQUIRED OR AUTHORIZED

A later real client/operator may provide a stronger Tier-B evidence layer if and when such evidence exists. HV-7 does not require real-venue research, recruitment, or outreach merely to continue architectural testing.

No real second venue is currently authorized or admitted. Venue outreach remains unauthorized.

### Native existing-stack adapter — ACCEPTED

The existing EJS/HTMX/vanilla-JS/Tailwind/Express stack plus HV-5 authoring functions is the accepted visual-authoring foundation.

### GrapesJS Core — EVALUATED, NOT SELECTED

The losing evaluation remains available in Git history and existing evidence until separately retired. It is not a selected production or foundation dependency. Studio SDK remains unselected.

### Successor package/developer identity cleanup — ELIGIBLE ADJACENT MAINTENANCE

Developer-facing inherited `hive-bar` metadata remains a known mismatch distinct from the intentionally preserved Fourth Street production compatibility namespace. It is not selected as the next product lane.

### Optional archetypes — SUPPORTING, NONAUTHORITATIVE

Examples may be useful convenience/evidence layers but are not a mandatory platform taxonomy. The synthetic HV-7 candidate is an adversarial experiment, not a canonical venue-type archetype.

### CID/IPFS/IPNS publication — ELIGIBLE DOWNSTREAM

Git commit/tree identity remains source provenance. Any content-addressed publication operation must separately define its deterministic artifact and digest/CID construction profile. IPNS would be an optional mutable pointer, not source identity.

### 3Speak/SPK media — ELIGIBLE DOWNSTREAM

Potential media/storage/delivery capability only. It must not become authority for private keys, authentication, payments, or onboarding custody.

### Fleet operations, Helia/OrbitDB, shared-runtime multi-tenancy — DEFERRED

Fleet tooling should follow observed multi-venue operations rather than hypothetical repetition. Replicated mutable state requires a concrete bounded domain. Shared runtime tenancy remains unjustified; one isolated venue per runtime remains the default.

## HV-7 current hard boundary before candidate design

```text
HV7_HISTORICAL_PREREGISTRATION_0_1_0 = CANONICAL__REAL_ONLY_REQUIREMENTS_SUPERSEDED
HV7_CANDIDATE_EVIDENCE_MODEL_AMENDMENT_0_1_1 = ACCEPTED
HV7_CANDIDATE_MODE = SYNTHETIC_ADVERSARIAL
HV7_SYNTHETIC_CANDIDATE_REQUIREMENT_PACKET = NOT_YET_FROZEN
HV7_IMPLEMENTATION = NOT_AUTHORIZED
REAL_SECOND_VENUE_REQUIRED = NO
REAL_SECOND_VENUE_AUTHORIZED = NO
REAL_SECOND_VENUE_ADMISSION = NOT_AUTHORIZED
VENUE_OUTREACH = NOT_AUTHORIZED
SYNTHETIC_HV7_REAL_OPERATOR_USABILITY_EVIDENCE = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
```

The next read-only candidate-design operation may define and freeze the fictional venue concept and independent requirements. It may not implement the candidate or repair the platform in response to anticipated mismatches.

## Venue-category boundary

Current evidence still does **not** establish a canonical exhaustive venue taxonomy. Generic platform/security code must remain venue-neutral. Authentic operator/staff/customer vocabulary belongs to venue-owned configuration. Optional starter archetypes may compose convenience defaults but do not define platform identity.

## Production boundary

Fourth Street remains the **sole real client and reference compatibility deployment**. Hive-Bar-era service names, release paths, storage paths, release identity files, host, and Hive application tag remain deployment facts until a separately accepted migration changes them.

The last recorded accepted production transition in the inherited roadmap is M19.2. Do not infer current runtime identity from that historical event; inspect installed release/build identity for operational decisions.

Successor source changes do not authorize deployment, account creation, delegation, payment activation, write-mode escalation, secret rotation, or infrastructure mutation.

## History and retirement policy

`POST_HV6_LIVING_ROUTING_RECONCILIATION_0_1_0.md` remains a truthful historical record of the neutral boundary before the original sequencing decision. `POST_HV6_SEQUENCING_DECISION_0_1_0.md` and `HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT_PREREGISTRATION_0_1_0.md` remain truthful historical records of the pre-amendment real-only path. The accepted 0.1.1 amendment and its living-routing reconciliation control current interpretation.

Historical files currently present on `main` may be retired under a separately bounded housekeeping operation after reachability/recovery is verified. Deleting such a path from the current tree does not erase the underlying Git history.
