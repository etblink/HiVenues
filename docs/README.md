# Hive-Venues Documentation Index

This index points to the documents needed to interpret the **current** successor state. Superseded wording and prior routing remain recoverable from Git commit history and do not need to be duplicated inside living documents.

## Current successor documents

- `../README.md` — product/developer entry point and current source boundary.
- `ROADMAP.md` — living current/next successor roadmap.
- `POST_HV6_LIVING_ROUTING_RECONCILIATION_0_1_0.md` — current neutral post-HV-6 routing boundary once canonical.
- `HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_ACCEPTANCE_0_1_0.md` — permanent HV-6 acceptance record.
- `HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_REVIEW_0_1_0.md` — Project Lead Phase-C implementation review.
- `HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_0_1_0.md` — accepted Phase-C implementation record.
- `HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_TECHNOLOGY_SELECTION_0_1_0.md` — Phase-B technology selection and comparative evidence.
- `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md` — accepted HV-5 authoring authority baseline.
- `HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md` — accepted isolated-venue successor architecture.
- `PRODUCTION_OPERATIONS.md` — current Fourth Street production operating model until superseded.
- `HISTORICAL_REF_ARCHIVE_0_1_0.md` — branch/ref archival policy for divergent historical refs.

Older milestone, preregistration, authorization, sequencing, and reconciliation files may remain in the repository until separately retired, but they do not define current routing. Their prior versions and deleted paths remain recoverable through Git history.

## Current successor interpretation

HV-1 through HV-6 are accepted. The accepted composition is:

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

<!-- HV6_CURRENT_ROUTING_START -->
```text
HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION = ACCEPTED
HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION = ACCEPTED
POST_HV5_SEQUENCING_DECISION = HISTORICAL_ACCEPTED__SUPERSEDED_FOR_CURRENT_ROUTING
POST_HV6_SEQUENCING_DECISION = PENDING
SELECTED_NEXT_LANE = NONE
PROPOSED_NEXT_MILESTONE = NONE
HV6_PHASE_B_TECHNOLOGY_SELECTION = COMPLETE
SELECTED_ADAPTER = NATIVE_EXISTING_STACK
HV6_PHASE_C_IMPLEMENTATION_AUTHORIZATION = HISTORICAL_ACCEPTED__EXHAUSTED_BY_ACCEPTED_IMPLEMENTATION
HV6_PHASE_C_IMPLEMENTATION = ACCEPTED
NEXT_OPERATION = POST_HV6_SEQUENCING_DECISION__READ_ONLY
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
TECHNOLOGY_SELECTED = NATIVE_EXISTING_STACK
GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED
GRAPESJS_STUDIO_SDK = NOT_SELECTED
REAL_SECOND_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```
<!-- HV6_CURRENT_ROUTING_END -->

The next product-governance operation is a fresh read-only Post-HV-6 sequencing decision. No substantive post-HV-6 implementation is currently authorized. Separately bounded repository housekeeping may proceed without selecting a product lane.

## Accepted authoring boundary

HV-6 remains subordinate to HV-5:

```text
ACCEPTED_HV5_DOCUMENT
-> NATIVE_VISUAL_ADAPTER_PROJECTION
-> OPERATOR_INTERACTION
-> PROPOSED_HV5_DOCUMENT
-> applyOrdinaryOperatorEdit(base, proposed)
-> ACCEPTED_HV5_DOCUMENT
-> CANONICAL_SERIALIZATION
```

Editable controls derive from HV-5 ownership. The real application renderer supplies truthful review preview. Front-end visibility, component trees, arbitrary HTML/scripts, generated HTML/CSS, autosave state, editor project state, or any other shadow model may not become canonical authority. The direct JSON/source authoring path remains independent.

GrapesJS Core remains `EVALUATED_AND_NOT_SELECTED`; Studio SDK remains unselected. No GrapesJS dependency belongs to the accepted native foundation.

## Current candidate dispositions

A real isolated second venue is high priority for fresh sequencing because it is the strongest direct falsification test of the accepted abstractions, but it is not authorized. Successor package/developer identity cleanup is eligible adjacent maintenance. CID/IPFS/IPNS publication and 3Speak/SPK media remain downstream candidates. Fleet tooling, Helia/OrbitDB mutable replication, and shared-runtime multi-tenancy remain deferred.

The platform remains venue-type neutral. Optional starter archetypes may be useful later, but no exhaustive venue-type enum is canonical.

## Current Fourth Street operating documentation

The existing Fourth Street deployment retains its provenance-bearing Hive-Bar-era namespace and runbooks until a separately accepted migration changes them. Current operating inputs include `PRODUCTION_OPERATIONS.md`, `../.env.example`, `../ops/privex/hive-bar.env.example`, and `../ops/privex/manifest.json`.

Canonical integrated source is `main` in `etblink/Hive-Venues`. Because source advances independently of production, resolve the exact commit/tree when qualifying or releasing. A source commit never authorizes deployment by itself.

## Navigation rule

For current project status, read in this order:

1. `../README.md`
2. `ROADMAP.md`
3. `POST_HV6_LIVING_ROUTING_RECONCILIATION_0_1_0.md`
4. `HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_ACCEPTANCE_0_1_0.md`
5. `HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_REVIEW_0_1_0.md`
6. `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md`
7. current operating documentation when production is involved.

The current boundary is **Post-HV-6 sequencing pending, no substantive implementation authorized**. Exact superseded routing is available from Git history rather than copied into this living index.
