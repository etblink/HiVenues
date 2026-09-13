# HiVenues Product Doctrine Reconciliation 0.1.0

## Status and authority

```text
OPERATION = HIVENUES_PRODUCT_DOCTRINE_RECONCILIATION_V0_1
CLASS = DOCUMENTATION_AND_ROUTING_ONLY
CANONICAL_BASE_COMMIT = 9351655112a25fd8a1d115d8c402534726b1e035
CANONICAL_BASE_TREE = 15e1d93a6f84bbca233e9313410b29bc88ef470b
IMPLEMENTATION_AUTHORIZATION = NO
SCHEMA_MUTATION = NO
PRODUCTION_MUTATION = NO
HIVE_WRITE_OR_KEY_EFFECT = NO
ASTRA_CODE_PORT = NO
```

This record reconciles current HiVenues product routing after executive review of:

1. the original 2024 HiVenues founding article;
2. the ten original 2024 prototype screenshots;
3. the independently developed GPT-6 Astra greenfield HiVenues result;
4. the frozen existing-HiVenues ↔ Astra comparison;
5. the subsequent executive decision and scope amendment.

It changes **current product doctrine and sequencing only**. It does not rewrite accepted history, alter runtime semantics, loosen current validators, change the v2 source, activate a capability, deploy anything, or authorize any real Hive effect.

---

## 1. Bound external decision evidence

The independent comparison froze the following exact inputs:

```text
EXISTING_HIVENUES_COMMIT = 9351655112a25fd8a1d115d8c402534726b1e035
EXISTING_HIVENUES_TREE = 15e1d93a6f84bbca233e9313410b29bc88ef470b

ASTRA_GREENFIELD_COMMIT = e7a03c1aa7e5b8a30e7e8a77b3d927f9e168daf2
ASTRA_GREENFIELD_TREE = 9810d4d44fae5bb43bfd28ce8a350306307aa22c

PROJECT_OBSERVATORY_COMPARISON_FREEZE_COMMIT = ef1a3e8bf5800e5a9f048215c080c468bda17f28
PROJECT_OBSERVATORY_COMPARISON_FREEZE_TREE = c1811edce27ef9dd3423f7b5caed6fd505e1bf41
```

The executive product decision was then recorded in Project Observatory:

```text
EXECUTIVE_PRODUCT_ADJUDICATION_COMMIT = 5ff1c67db83564b15777557537871d06b95ef6be
EXECUTIVE_PRODUCT_ADJUDICATION_TREE = 4ec02c596c5080cb536648c0ce9c0eb907b174b0
FILE = decisions/HIVENUES_EXECUTIVE_PRODUCT_ADJUDICATION_0_1_0.md
```

The executive scope amendment broadened the product beyond physical venues:

```text
EXECUTIVE_SCOPE_AMENDMENT_COMMIT = e8e86520b8d56e782c7e0e474ae00682464e180e
EXECUTIVE_SCOPE_AMENDMENT_TREE = 8d18c47c2fced8b07d3987a2544a61b668e647b0
FILE = decisions/HIVENUES_EXECUTIVE_SCOPE_AMENDMENT_0_1_0.md
```

Those Observatory records are decision evidence. This in-repository record is the current HiVenues routing consequence.

---

## 2. Current governing product definition

HiVenues is not limited to brick-and-mortar venues and is not primarily a generic website builder with optional blockchain features.

The governing product definition is:

> **HiVenues gives a host identity its own purpose-built Hive frontend. The host supplies the brand, context, vocabulary, content model, audience relationship, and goals; Hive supplies portable identity, community, publishing, social interaction, durable public content, rewards, and economic primitives. HiVenues translates those primitives into the language and experience of the host rather than exposing a generic blockchain application.**

Internal shorthand:

```text
HOST_IDENTITY_FIRST_EXPERIENCE
+
HIVE_FOUNDATIONAL_INFRASTRUCTURE
+
DOMAIN_NATIVE_TRANSLATION
=
HIVENUES
```

A **host identity** may be, for example:

- a bar, restaurant, workshop, club, store, or other physical place;
- a streamer, influencer, comedian, podcaster, artist, DJ, or other creator;
- a band or performance group;
- a brand, organization, club, collective, or community;
- an event-centered or recurring-program identity.

These are archetype pressures on one product, not separate products and not permission for host-specific renderer forks.

A physical street address, storefront, merchant role, or local-business schema is **not** a universal HiVenues requirement.

---

## 3. Precise relationship to historical PM1 doctrine

`PM1_PUBLIC_VENUE_OPTIONAL_COMMUNITY_ARCHITECTURE_0_1_0.md` remains an accepted historical product-architecture record for the decision made on 2026-09-06. It is not edited or retroactively reinterpreted.

Its central historical decisions included:

```text
PUBLIC_VENUE_SITE = UNIVERSAL_PRODUCT_SURFACE
COMMUNITY_CAPABILITY = OPTIONAL
TRANSACTION_CAPABILITY = OPTIONAL_AND_SEPARATELY_PRIVILEGED
```

Current executive review supersedes only the **product-doctrine claim** that a complete non-Hive brochure site is, by itself, the defining HiVenues product.

Current doctrine is instead:

```text
HIVE_NATIVE_SOCIAL_IDENTITY_AND_COMMUNITY = FOUNDATIONAL_PRODUCT_DIMENSION
PUBLIC_BROWSING_WITHOUT_SIGN_IN = REQUIRED
TRANSACTION_AUTHORITY = SEPARATELY_PRIVILEGED
```

### Important non-consequence

This doctrine change does **not** immediately invalidate the existing v2 representation in which Community is disabled.

The current system still needs safe states for:

- fresh authoring before a Hive binding is configured;
- synthetic references and tests;
- offline/local development;
- read-only/fallback operation;
- temporary Hive-read unavailability;
- migrations and incomplete setup that must fail closed before activation.

Therefore:

```text
SCHEMA_REPRESENTABILITY != PRODUCT_QUALIFICATION
```

A source may be valid as an authoring/preconnection state without yet satisfying the future qualification contract for a fully realized HiVenue.

No current parser or schema rule changes in this operation.

---

## 4. Product-facing vocabulary versus compatibility vocabulary

The mature repository contains many accepted `venue` names in schemas, source paths, CLIs, deployment records, tests, and historical production compatibility seams.

This reconciliation does **not** perform a vocabulary migration.

For current implementation/provenance:

```text
VENUE_COMPATIBILITY_VOCABULARY = PRESERVED
HOST_PRODUCT_CONCEPT = CURRENT_BROADER_PRODUCT_MODEL
```

Future architecture work may decide where product-facing `host` language improves generalization without creating needless migration risk. Existing exact identifiers must not be renamed merely for cosmetic consistency.

---

## 5. Reaffirmed implementation doctrines

The executive product correction does not discard the mature engineering foundation. The following remain controlling unless separately superseded.

### 5.1 Semantic authoring rather than free-form web construction

Keep semantic pages, resources, components, recipes, stable identities, and bounded operator authority. Do not become an arbitrary HTML/CSS/JavaScript page builder.

### 5.2 One responsive semantic source

Desktop, tablet, and mobile remain views of one semantic composition rather than independent content trees.

### 5.3 Real renderer as preview authority

Studio must continue to preview the actual renderer rather than a disconnected imitation.

### 5.4 Typed authoring integrity

Preserve stable target identity, proposal/preview, Apply/Discard, stale-digest rejection, validation, exact inverse history, Undo/Redo, explicit persistence, and exact reopen behavior.

### 5.5 Hive identity is portable user identity

Do not create a proprietary HiVenues social identity merely to hide Hive.

### 5.6 Public reading does not require signing

A visitor should be able to understand the host, public content, schedule/events, and public community context without mandatory Keychain interaction.

### 5.7 Signing and authority remain consequence-bound

Hive-native does not mean ambient authority. User and merchant signing stays explicit; server private-key custody remains least privilege; transaction capability remains separately privileged.

### 5.8 Accessibility, provenance, deterministic CI, and production safety remain release requirements

Visual or product-language improvement may not weaken accessibility, source truth, auditability, rollback, exact deployment identity, or cross-platform qualification without separate evidence and authorization.

---

## 6. Product translation doctrine

The 2024 prototype and independent Astra line both support the same core UX principle:

```text
PRESERVE_REAL_HIVE_SEMANTICS
+
TRANSLATE_INTO_HOST_NATIVE_LANGUAGE
+
REVEAL_PROTOCOL_DETAIL_WHEN_CONSEQUENCE_OR_AUDIT_REQUIRES_IT
```

Examples may include host-native language for participation, support, influence, audience/community membership, or rewards while still truthfully disclosing what will become public/on-chain, who signs, and whether value moves.

The objective is not to make Hive invisible by making it optional.

The objective is to make Hive **native enough that users can focus on the host and community**.

---

## 7. Social-object direction

The independent Astra comparison identified a high-value direction that is now accepted for separate design: meaningful host activity should be capable of retaining durable social identity.

For a physical venue this may be a show or gathering. For a non-physical host it may be:

- a livestream;
- a premiere;
- an AMA;
- a release or launch;
- a tour date;
- a comedy performance;
- a recurring program;
- another bounded shared moment.

Desired principle:

```text
HOST_ACTIVITY_BUSINESS_OR_PROGRAM_STATE
+
STABLE_HIVE_SOCIAL_IDENTITY
=
DURABLE_COMMUNITY_CONTEXT
```

This reconciliation does **not** freeze author/permlink fields, creation timing, mutation semantics, signer rules, or migration. Those require a separately preregistered design operation before implementation.

---

## 8. Reference and qualification model

The existing physical-venue reference set remains useful, but it is no longer sufficient to prove product generality.

Future acceptance must include at least one first-class **non-physical creator/performer** reference.

A future reference matrix should therefore exert pressure from both classes:

```text
PHYSICAL_HOST_PRESSURE
  hospitality / local venue / visit / schedule / payment or booking where relevant

NON_PHYSICAL_HOST_PRESSURE
  creator or performer / publishing / audience / stream-release-show lifecycle / community / support
```

No reference may acquire a custom source model or renderer fork solely to pass its archetype.

The original 2024 Fourth Street screenshots remain intent evidence, not a UI specification. Astra Lowlight/Forma remain modern product-quality references, not code dependencies. Existing canonical HiVenues references remain source-integrity/accessibility/regression evidence.

---

## 9. Current PM4 routing consequence

Issue #199 remains open, but its old task list must not be resumed mechanically.

Before the remaining implementation families are selected, re-audit them against the reconciled doctrine.

Likely still-relevant operator needs include:

- action editing such as ticket/reservation/support destinations where semantically appropriate;
- timestamps/schedules;
- general managed media;
- component recipe editing;
- remaining resource/menu lifecycle gaps;
- complete fresh-authoring journeys;
- responsive preview and exact persistence.

The new acceptance matrix must also include at least one non-physical creator/performer journey.

Issue #200 remains the later measured quality/release gate. Its four-reference historical PM1 criteria remain useful evidence, but final PM4 release adjudication must be reconciled to the broadened host scope before it is executed.

---

## 10. Current forward sequence

This reconciliation replaces stale living-roadmap sequencing with the following product-maturation order:

```text
1. HIVENUES_PRODUCT_DOCTRINE_RECONCILIATION_V0_1          <- THIS OPERATION
2. HIVE_NATIVE_HOST_PRODUCT_CONTRACT                       <- DESIGN / PREREGISTRATION
3. HOST_ACTIVITY_SOCIAL_OBJECT_CONTRACT                    <- DESIGN / PREREGISTRATION
4. PM4_OPERATOR_GAP_REAUDIT                                <- BOUNDED SELECTION
5. PM4_RELEVANT_OPERATOR_IMPLEMENTATION                    <- BOUNDED FAMILIES
6. STUDIO_PRODUCT_LANGUAGE_AND_INTERACTION_CONVERGENCE
7. GENERATED_EXPERIENCE_VISUAL_CONVERGENCE
8. SOCIAL_SURFACE_RECONCILIATION
9. MEASURED_QUALITY_RELEASE_GATES                           <- ISSUE #200 CLASS
10. EXTERNAL_OPERATOR_AND_AUDIENCE_VALIDATION
```

Do not begin Step 2 or later as an implied consequence of this documentation operation.

---

## 11. Production and external-effect boundary

This operation does not alter the accepted Fourth Street production state and does not authorize a successor cutover.

Preserve:

```text
PRODUCTION_TRANSITION = WITHHELD
LIVE_HIVE_WRITE = NOT_AUTHORIZED
KEY_OR_AUTHORITY_MUTATION = NOT_AUTHORIZED
PAYMENT_MUTATION = NOT_AUTHORIZED
DNS_VPS_SYSTEMD_MUTATION = NOT_AUTHORIZED
REAL_HOST_ONBOARDING_OR_OUTREACH = NOT_AUTHORIZED
```

Existing production compatibility names, service paths, exact release identity, health/readiness, durable stores, and rollback discipline remain governed by `PRODUCTION_OPERATIONS.md` and their accepted evidence.

---

## 12. Closure criteria for this operation

`HIVENUES_PRODUCT_DOCTRINE_RECONCILIATION_V0_1` is complete only when:

1. this record exists on a branch based exactly on canonical `9351655112...`;
2. root product language no longer defines HiVenues as brick-and-mortar-only or generic-site-first;
3. the living roadmap routes future work through the broadened Hive-native host doctrine;
4. the documentation index points to this current decision;
5. historical PM1 documents remain byte-unchanged;
6. source/runtime/schema/test/application files are unchanged;
7. Issue #160 and #199 receive routing-only comments after canonical integration;
8. remote `main` is rechecked before any fast-forward publication;
9. no production or Hive effect occurs.

After canonical integration, stop. The next product-contract operation requires separate authorization.
