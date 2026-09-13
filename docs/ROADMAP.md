# HiVenues Living Roadmap

This document records **current** product state and current/next sequencing. Superseded sequencing remains recoverable from Git history and historical decision records rather than being presented as current routing.

## Current canonical source baseline for this reconciliation

```text
CANONICAL_MAIN_AT_OPEN = 9351655112a25fd8a1d115d8c402534726b1e035
CANONICAL_TREE_AT_OPEN = 15e1d93a6f84bbca233e9313410b29bc88ef470b
CANONICAL_CI_757 = SUCCESS
PM3 = ACCEPTED
PM4_REFERENCE_VISUAL_SLICE_ISSUE_198 = CLOSED
PM4_OPERATOR_JOURNEY_ISSUE_199 = OPEN
PM4_MEASURED_RELEASE_GATE_ISSUE_200 = OPEN
PRODUCTION_TRANSITION = WITHHELD
```

Canonical source identity remains independent of production deployment identity. The healthy Fourth Street reference deployment remains independently pinned to its accepted production release until a separately authorized transition has a concrete product or operational reason.

---

## Current product doctrine

The controlling product definition is now:

> **HiVenues gives a host identity its own purpose-built Hive frontend. The host supplies the brand, context, vocabulary, content model, audience relationship, and goals; Hive supplies portable identity, community, publishing, social interaction, durable public content, rewards, and economic primitives. HiVenues translates those primitives into the language and experience of the host rather than exposing a generic blockchain application.**

```text
HOST_IDENTITY_FIRST_EXPERIENCE
+
HIVE_FOUNDATIONAL_INFRASTRUCTURE
+
DOMAIN_NATIVE_TRANSLATION
=
HIVENUES
```

A host may be a physical place, creator, performer, band/group, brand/organization, or event-centered identity. A street address, storefront, local-business role, or merchant function is not universal product state.

See `HIVENUES_PRODUCT_DOCTRINE_RECONCILIATION_0_1_0.md` for the exact decision boundary and provenance.

### Historical PM1 relationship

`PM1_PUBLIC_VENUE_OPTIONAL_COMMUNITY_ARCHITECTURE_0_1_0.md` remains an accepted historical record and is not rewritten.

Its historical choice to define Community as an optional product capability is **superseded at the product-doctrine level**. Current doctrine treats Hive-native social identity/community as a foundational product dimension while retaining:

- anonymous/read-only public browsing;
- separately privileged transaction authority;
- safe preconnection/offline authoring states;
- fail-closed unavailable/disabled states;
- explicit Keychain/user-controlled signing where authority is required.

Therefore:

```text
SCHEMA_REPRESENTABILITY != PRODUCT_QUALIFICATION
```

The current v2 source may legally represent Community disabled without that state becoming the definition of a fully realized HiVenue.

---

## Product scope and reference pressure

The existing venue references remain valuable but no longer exhaust the product domain.

Future qualification must exert pressure from both:

```text
PHYSICAL_HOSTS
  hospitality / local venue / workshop / store / physical event

NON_PHYSICAL_HOSTS
  streamer / influencer / comedian / band / DJ / podcaster / artist / creator / brand / group
```

At least one non-physical creator/performer archetype must become a first-class qualification reference before broad product generality is claimed.

Archetypes are semantic/product pressures on one platform, not permission for host-specific schema forks, renderer forks, or separate products.

---

## Reaffirmed platform foundations

The doctrine correction preserves the mature implementation strengths already established:

```text
SEMANTIC_AUTHORING = REAFFIRMED
ONE_RESPONSIVE_SOURCE = REAFFIRMED
REAL_RENDERER_PREVIEW_AUTHORITY = REAFFIRMED
STABLE_SEMANTIC_IDENTITY = REAFFIRMED
TYPED_AUTHORING_TRANSACTIONS = REAFFIRMED
PROPOSAL_APPLY_DISCARD = REAFFIRMED
STALE_DIGEST_REJECTION = REAFFIRMED
EXACT_UNDO_REDO_HISTORY = REAFFIRMED
EXPLICIT_SAVE_AND_REOPEN = REAFFIRMED
LOCAL_USER_CONTROLLED_HIVE_SIGNING = REAFFIRMED
TRANSACTION_PRIVILEGE_SEPARATION = REAFFIRMED
ACCESSIBILITY_AND_BROWSER_EVIDENCE = REAFFIRMED
CROSS_PLATFORM_DETERMINISTIC_CI = REAFFIRMED
PRODUCTION_IDENTITY_AND_ROLLBACK_DISCIPLINE = REAFFIRMED
```

Do not trade these away to reproduce the 2024 prototype or to port the independent Astra implementation.

---

## Current product-language doctrine

The user should experience the host/community first and protocol machinery only where it improves truth, consent, or auditability.

```text
PRESERVE_REAL_HIVE_SEMANTICS
+
TRANSLATE_INTO_HOST_NATIVE_LANGUAGE
+
REVEAL_PROTOCOL_DETAIL_WHEN_CONSEQUENCE_OR_AUDIT_REQUIRES_IT
```

Public reading should not require sign-in. Social/economic actions must still reveal their material consequences before signing: who signs, whether the result is public/on-chain, whether value moves, and whether HiVenues can reverse it.

---

## Host activity as durable social context

A separate future design operation will evaluate binding meaningful host activity to stable Hive social identity.

Examples include:

- physical shows/gatherings;
- livestreams;
- premieres;
- AMAs;
- releases/launches;
- tour dates;
- comedy performances;
- recurring programs.

Target principle:

```text
HOST_ACTIVITY_STATE
+
STABLE_HIVE_SOCIAL_IDENTITY
=
DURABLE_COMMUNITY_CONTEXT
```

No author/permlink schema, signer rule, migration, or implementation is authorized by this roadmap.

---

## PM4 state and routing

### Issue #198 — reference composition/media

Closed. Its accepted work remains useful reference-quality evidence, but the later independent Astra result establishes a higher modern visual/product reference ceiling. Existing reference fixtures remain important for source neutrality, accessibility, responsive behavior, and regression evidence.

### Issue #199 — complete operator journeys

Open. Do **not** resume the old gap list mechanically.

First perform a bounded re-audit against the reconciled host/Hive-native doctrine. Likely still-relevant task families include:

- resource/menu lifecycle work where still open;
- ticket/reservation/support/action editing where semantically applicable;
- timestamp/schedule editing;
- general managed media;
- component-recipe editing;
- complete fresh-host journeys;
- responsive preview;
- exact Save/reopen.

The acceptance matrix must add at least one non-physical creator/performer journey.

### Issue #200 — measured release gates

Open and remains the later PM4 release gate. Its existing PM1 four-reference criteria remain useful evidence, but the exact final matrix must be reconciled to the broadened host scope before execution. Green CI alone does not establish product acceptance.

---

## Current forward sequence

```text
1. HIVENUES_PRODUCT_DOCTRINE_RECONCILIATION_V0_1          <- CURRENT
2. HIVE_NATIVE_HOST_PRODUCT_CONTRACT                       <- SEPARATE DESIGN AUTHORIZATION
3. HOST_ACTIVITY_SOCIAL_OBJECT_CONTRACT                    <- SEPARATE DESIGN AUTHORIZATION
4. PM4_OPERATOR_GAP_REAUDIT                                <- BOUNDED SELECTION
5. PM4_RELEVANT_OPERATOR_IMPLEMENTATION                    <- BOUNDED FAMILIES
6. STUDIO_PRODUCT_LANGUAGE_AND_INTERACTION_CONVERGENCE
7. GENERATED_EXPERIENCE_VISUAL_CONVERGENCE
8. SOCIAL_SURFACE_RECONCILIATION
9. MEASURED_QUALITY_RELEASE_GATES                           <- ISSUE #200 CLASS
10. EXTERNAL_OPERATOR_AND_AUDIENCE_VALIDATION
```

No later step is authorized simply because it appears here.

---

## Existing production state remains separate

Fourth Street Bar remains the real reference deployment. The current product-doctrine reconciliation does not alter its production status, enabled capabilities, deployment identity, or recovery discipline.

The controlling production record remains `PRODUCTION_OPERATIONS.md`.

```text
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
PUBLIC_PRODUCTION_AUTHORING = NOT_AUTHORIZED
HIVE_WRITE_OR_KEY_MUTATION = NOT_AUTHORIZED
PAYMENT_MUTATION = NOT_AUTHORIZED
DNS_VPS_SYSTEMD_MUTATION = NOT_AUTHORIZED
REAL_HOST_OUTREACH_OR_ONBOARDING = NOT_AUTHORIZED
```

Historical Hive identity/key minimization, Threads least-privilege work, beneficiary-economics boundaries, CID findings, deployment-agnostic source work, portable workspace work, and production-convergence evidence remain valid within their accepted scopes. They are not erased by this product-routing update.

---

## Controlling rules

```text
PRODUCT_TRUTH > ROADMAP_INERTIA
HOST_SCOPE != BRICK_AND_MORTAR_ONLY
HIVE_FOUNDATIONAL != HIVE_JARGON_EVERYWHERE
PUBLIC_READING != SIGNING_REQUIREMENT
SCHEMA_REPRESENTABILITY != PRODUCT_QUALIFICATION
COMPATIBILITY_VOCABULARY != PRODUCT_SCOPE
SEMANTIC_AUTHORING != FREEFORM_PAGE_BUILDER
VISUAL_QUALITY_IMPROVEMENT != AUTHORITY_WEAKENING
CANONICAL_SOURCE_IDENTITY != PRODUCTION_ACTIVATION
ABILITY_TO_DEPLOY != REASON_TO_DEPLOY
AUTOMATION_AUTHORITY = MINIMUM_REQUIRED_AUTHORITY
USER_ECONOMIC_CONSEQUENCE = VISIBLE_BEFORE_SIGNING
```

## Immediate stop boundary

This roadmap update is part of `HIVENUES_PRODUCT_DOCTRINE_RECONCILIATION_V0_1` only.

After the documentation/routing candidate is canonically integrated and the relevant roadmap issues receive routing comments, **stop before product-contract design or code implementation**.
