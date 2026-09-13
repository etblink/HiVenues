# HiVenues Documentation Index

This index points to documents needed to interpret the **current** HiVenues product state. Historical sequencing and superseded product doctrine remain recoverable from Git history and their original decision records.

## Current controlling documents

- `../README.md` — current product/developer entry point and current implementation boundary.
- `HIVENUES_PRODUCT_DOCTRINE_RECONCILIATION_0_1_0.md` — **current product doctrine and routing** after the 2024 founding-artifact review and independent Astra comparison.
- `ROADMAP.md` — current product state and forward sequencing.
- `PRODUCTION_OPERATIONS.md` — Fourth Street production state, exact runtime identity, capability state, and deployment/recovery boundary.
- `HIVE_IDENTITY_KEY_MANAGEMENT_MINIMIZATION_AUDIT_0_1_0.md` — accepted least-privilege Hive identity/key model.
- `DEPLOYMENT_AGNOSTIC_VENUE_SOURCE.md` — accepted deployment-agnostic source architecture.
- `DEPLOYMENT_AGNOSTIC_VENUE_SOURCE_DURABILITY.md` — accepted source persistence/reopen boundary.
- `PORTABLE_VENUE_WORKSPACE.md` — accepted deterministic portable workspace/build contract.

## Current product interpretation

```text
HOST_IDENTITY_FIRST_EXPERIENCE
+
HIVE_FOUNDATIONAL_INFRASTRUCTURE
+
DOMAIN_NATIVE_TRANSLATION
=
HIVENUES
```

A HiVenues host may be a physical place, creator, performer, band/group, brand/organization, or event-centered identity. The current implementation still uses accepted `venue` compatibility vocabulary in schemas, paths, CLIs, tests, and production records; that vocabulary does not limit current product scope.

Hive-native social identity/community is now a **foundational product dimension**, while public read-only browsing remains available without mandatory sign-in and transaction authority remains separately privileged.

The current v2 schema can still represent Community disabled for preconnection authoring, tests, offline development, fallback, and incomplete setup:

```text
SCHEMA_REPRESENTABILITY != PRODUCT_QUALIFICATION
```

Do not infer from that representability that a brochure-only source is the complete definition of a production-qualified HiVenue.

## Historical PM1 records

The following remain important provenance and design evidence but do not by themselves override the current reconciliation record:

- `PM1_PUBLIC_VENUE_OPTIONAL_COMMUNITY_ARCHITECTURE_0_1_0.md` — historical venue-first / optional-Community decision. Its optional-Hive **product doctrine** is now superseded; its security, anonymous-reading, progressive-setup, and authority-separation reasoning remains useful within scope.
- `PM1_REFERENCE_EXPERIENCES_AND_FLAGSHIP_VISUAL_TARGETS_0_1_0.md` — historical physical-venue reference and visual-quality contract. Its reference evidence remains useful, but future broad product qualification must add at least one non-physical creator/performer archetype.

Historical documents are not rewritten to make them appear to have said something different.

## Current implementation foundations that remain accepted

The product correction does not discard the mature engineering path. Current future work must preserve unless separately superseded:

- semantic authoring rather than free-form page construction;
- one responsive semantic source;
- real renderer as preview authority;
- stable semantic identities;
- typed proposal/Apply/Discard authoring;
- stale-digest and forged-target rejection;
- exact Undo/Redo and explicit Save/reopen;
- user/merchant Keychain-side signing boundaries;
- least-privilege server signing exceptions where separately accepted;
- separately privileged transaction authority;
- accessibility/browser evidence;
- deterministic cross-platform qualification;
- exact deployment identity and rollback/recovery discipline.

## Current PM4 routing

```text
ISSUE_198_REFERENCE_VISUAL_WORK = CLOSED
ISSUE_199_OPERATOR_JOURNEYS = OPEN__REQUIRES_DOCTRINE_REAUDIT
ISSUE_200_MEASURED_RELEASE_GATES = OPEN__LATER_GATE
```

Issue #199 must not simply resume its historical checklist. Re-audit the remaining task families under the broader host/Hive-native doctrine, and include a non-physical creator/performer journey.

Issue #200 remains the later measured quality/release gate, but its exact final reference matrix must be reconciled to the broadened host scope before execution.

## Current sequence

```text
HIVENUES_PRODUCT_DOCTRINE_RECONCILIATION_V0_1
-> HIVE_NATIVE_HOST_PRODUCT_CONTRACT
-> HOST_ACTIVITY_SOCIAL_OBJECT_CONTRACT
-> PM4_OPERATOR_GAP_REAUDIT
-> PM4_RELEVANT_OPERATOR_IMPLEMENTATION
-> STUDIO_PRODUCT_LANGUAGE_AND_INTERACTION_CONVERGENCE
-> GENERATED_EXPERIENCE_VISUAL_CONVERGENCE
-> SOCIAL_SURFACE_RECONCILIATION
-> MEASURED_QUALITY_RELEASE_GATES
-> EXTERNAL_OPERATOR_AND_AUDIENCE_VALIDATION
```

No downstream operation is automatically authorized by its presence in the sequence.

## Production boundary

Current source progression does not authorize production progression.

```text
PRODUCTION_TRANSITION = WITHHELD
LIVE_HIVE_WRITE_OR_KEY_MUTATION = NOT_AUTHORIZED
PAYMENT_MUTATION = NOT_AUTHORIZED
INFRASTRUCTURE_MUTATION = NOT_AUTHORIZED
REAL_HOST_OUTREACH_OR_ONBOARDING = NOT_AUTHORIZED
```

Fourth Street remains governed by `PRODUCTION_OPERATIONS.md`. Historical accepted implementation and qualification records remain available through Git/PR history when deeper provenance is required.
