# HiVenues PM4 Operator-Gap v3 Re-audit 0.1.0

## Status and authority

```text
OPERATION = PM4_OPERATOR_GAP_REAUDIT_AGAINST_NEXT_GEN_V3
TRACKING_ISSUE = #217
PARENT_QUEUE = #199
CLASS = DOCUMENTATION_CLASSIFICATION_AND_ROUTING_ONLY
CANONICAL_BASE_COMMIT = c9e7e3f01f1b3d497e946c9997def4ef0c7ead23
CANONICAL_BASE_TREE = 6b586951003ab8cdb6394014fa9683b4d817b67a
CANONICAL_BASE_CI = 772__PASS
IMPLEMENTATION_AUTHORIZATION = NO
SCHEMA_CODE_CHANGE = NO
MIGRATION_EXECUTION = NO
LIVE_HIVE_EFFECT = NO
EXTERNAL_PROVIDER_MUTATION = NO
PRODUCTION_TRANSITION = WITHHELD
ASTRA_CODE_PORT = NO
```

This record performs the bounded re-audit required by the accepted HiVenues product doctrine and schema-v3 source/migration contract before any remaining historical Issue #199 implementation resumes.

It answers one question:

> **Which unfinished PM4 operator obligations still deserve implementation under the current host/activity/v3 product model, and in what order?**

It does not implement those obligations.

---

## 1. Controlling inputs

The controlling current records are:

- `docs/HIVENUES_PRODUCT_DOCTRINE_RECONCILIATION_0_1_0.md`;
- `docs/HIVE_NATIVE_HOST_PRODUCT_CONTRACT_0_1_0.md`;
- `docs/HOST_ACTIVITY_SOCIAL_OBJECT_CONTRACT_0_1_0.md`;
- `docs/NEXT_GEN_ACTIVITY_SOURCE_AND_MIGRATION_CONTRACT_0_1_0.md`;
- accepted PM3 semantic Studio, transaction, history, managed-media and persistence machinery;
- accepted Issue #199 implementation through PRs #205, #206 and #207;
- Issue #199's historical task matrix and later routing correction.

Historical PM1/PM2 decisions remain provenance. Current doctrine controls new routing where those records conflict with the broadened host model.

---

## 2. Frozen classification vocabulary

Every material unfinished historical obligation receives one primary classification from:

```text
REUSE_UNCHANGED
REEXPRESS_FOR_V3
DEFER_UNTIL_AFTER_FIRST_V3_SLICE
SUPERSEDED
STILL_V2_COMPATIBILITY_ONLY
```

Meanings:

### `REUSE_UNCHANGED`

The existing architectural mechanism remains valid as-is and should be carried into v3 rather than redesigned for novelty.

### `REEXPRESS_FOR_V3`

The user/operator need remains valid, but its historical event/physical-venue expression is no longer the correct next-generation semantic contract.

### `DEFER_UNTIL_AFTER_FIRST_V3_SLICE`

The feature remains legitimate, but implementing it before proving the generalized v3 source/migration/renderer would reduce information gain and risk work against the wrong source boundary.

### `SUPERSEDED`

The historical obligation, as stated, no longer represents the governing product requirement. A newer doctrine replaces it.

### `STILL_V2_COMPATIBILITY_ONLY`

The behavior remains relevant only to preserve accepted v2 semantics/legacy routes/workspaces and must not be generalized into the v3 product merely because it already exists.

---

## 3. Exact accepted implementation baseline

The re-audit does not erase accepted work.

### 3.1 PR #205 — shared resource scalar authoring

Accepted capabilities include typed edits to existing event/program/equipment resources through stable identity, server-derived ownership/pointers, whole-source validation, proposal/Apply/Discard, exact inverse history, Undo/Redo, explicit Save and fresh-process reopen.

The generic transaction/history mechanisms remain valuable.

The exact v2 event field vocabulary does not automatically become the v3 activity vocabulary.

### 3.2 PR #206 — resource lifecycle and list ordering

Accepted capabilities include typed creation/removal/list-order operations for v2 event/program/equipment resources, server-generated stable identities, shared-consumer consequences, exact private restore, surviving selection and Save/reopen.

Again, the stable-resource mechanics remain valuable.

The v2 event object and its lifecycle semantics are not the next-generation activity contract.

### 3.3 PR #207 — shared menu scalar authoring

Accepted menu/section/item scalar editing remains real evidence for nested semantic authoring, shared-consumer update behavior, exact history and persistence.

### 3.4 Menu cardinality was not accepted implementation

After PR #207, a menu resource/section/item creation/removal/order family was preregistered historically.

It did not become an accepted canonical implementation before the product-doctrine reconciliation redirected the queue.

Therefore:

```text
MENU_CARDINALITY_IMPLEMENTED = NO
MENU_CARDINALITY_ACCEPTED = NO
MENU_CARDINALITY_AUTOMATIC_NEXT_PRIORITY = NO
```

No audit may count that preregistration as completed evidence.

---

## 4. Current product constraints that change the audit

Current doctrine requires:

```text
HOST_IDENTITY_FIRST_EXPERIENCE
+
HIVE_FOUNDATIONAL_INFRASTRUCTURE
+
DOMAIN_NATIVE_TRANSLATION
```

A host may be physical or non-physical.

A street address, merchant role, menu, equipment list, reservation provider, ticket provider or local-business map is conditional rather than universal.

A fully qualified HiVenue eventually needs real Hive-native public/social participation, but source-valid preconnection and offline states remain legitimate.

The accepted schema-v3 direction additionally requires:

```text
resources.events[] -> resources.activities[]
```

with provider-neutral activity identity, physical/online/hybrid/none presence, occurrence/release/window temporal forms, lifecycle separate from capacity/access, and optional external bindings.

These facts mean the old four-physical-reference PM4 task list can no longer be treated as an ordered implementation backlog.

---

## 5. Governing audit principle

The next action should be selected by information value, not historical queue position.

The highest-risk unproved next-generation claim is now:

> One versioned semantic source and renderer family can represent a migrated physical host activity, a native locationless creator/performer activity, and a native release/premiere without a host-specific schema or renderer fork.

Until that is executable, broad operator controls built directly against v2 may deepen the wrong abstraction.

Therefore:

```text
PROVE_V3_GENERALITY_BEFORE_BROADENING_V2_OPERATOR_SURFACE = YES
```

This is not an argument for discarding mature v2 mechanisms. It is an argument for carrying the right mechanisms forward after the new semantic boundary exists.

---

## 6. Re-audit matrix — accepted mechanisms

These are not unfinished features, but their disposition controls reuse.

| Historical mechanism | Primary classification | Current disposition |
| --- | --- | --- |
| Stable semantic target identity | `REUSE_UNCHANGED` | Required in v3; identity must not depend on array position. |
| Server-derived ownership/pointers | `REUSE_UNCHANGED` | Preserve fail-closed authority; browser must not gain source-pointer authority. |
| Proposal → real-renderer Preview → Apply/Discard | `REUSE_UNCHANGED` | Remains the correct ordinary authoring architecture. |
| Stale-digest and no-op rejection | `REUSE_UNCHANGED` | Remains a core integrity gate. |
| Exact inverse history / Undo / Redo | `REUSE_UNCHANGED` | Carry forward to v3 typed commands. |
| Whole-source validation after mutation | `REUSE_UNCHANGED` | v3 validator becomes the final v3 mutation gate. |
| Explicit Save and fresh-process exact reopen | `REUSE_UNCHANGED` | Required for v3 workspace authoring as well. |
| Atomic/stale-save persistence discipline | `REUSE_UNCHANGED` | The v3 contract explicitly preserves it. |
| One responsive semantic source | `REUSE_UNCHANGED` | No separate creator/mobile content tree. |
| Real renderer as Studio preview authority | `REUSE_UNCHANGED` | No disconnected mock preview. |
| Accessibility/keyboard/geometry qualification | `REUSE_UNCHANGED` | Remains release/authoring validity evidence. |
| Managed-media source ownership and intrinsic-dimension truth | `REUSE_UNCHANGED` | Provider media remains separate from source-managed public media. |
| Existing v2 `event.state = scheduled|full|cancelled` semantics | `STILL_V2_COMPATIBILITY_ONLY` | Preserve for v2. Do not import into v3, where lifecycle and capacity are separated. |
| Existing v2 `/events/<slug>` event leaf | `STILL_V2_COMPATIBILITY_ONLY` | Preserve via legacy route compatibility; next-generation canonical resource is activity. |

---

## 7. Gap A — menu resource/section/item cardinality and ordering

### Historical need

Restaurant operators still cannot complete all menu resource/section/item creation, removal and ordering workflows through the ordinary Studio.

### Product relevance

The need is legitimate for hospitality hosts.

It is not universal to creators, performers, bands, streamers or many other host identities.

Menus remain a valid conditional v3 resource family; the v3 source contract does not require replacing them.

### Classification

```text
MENU_CARDINALITY_AND_ORDER = DEFER_UNTIL_AFTER_FIRST_V3_SLICE
```

### Reason

Implementing menu cardinality now would prove additional depth in an already-working physical-host domain while providing almost no evidence about the new product-generalization risk.

The historical preregistration may be mined for invariants later, but it is not binding implementation authority after this re-audit.

### Later reuse

When resumed, preserve:

- server-generated stable ids;
- exact nested membership derivation;
- exact history/restore;
- shared-consumer truth;
- collection bounds;
- explicit Save/reopen;
- no raw JSON/source-pointer authority.

---

## 8. Gap B — ticket, reservation and generic external-action editing

### Historical need

The old matrix separately named ticket links and reservation CTAs.

### Current semantic finding

The accepted activity contract generalizes these into host/activity-native public actions such as:

- ticket;
- reservation/RSVP;
- watch/listen;
- external information;
- calendar;
- support/value where separately enabled.

The v3 migration contract also explicitly forbids inferring provider semantics from an existing v2 `externalAction` URL.

### Classification

```text
TICKET_RESERVATION_EXTERNAL_ACTION_EDITING = REEXPRESS_FOR_V3
```

### Required next-generation expression

A later operator contract must edit typed provider-neutral semantic actions around a stable activity/host source object.

It must not be a generic URL field mislabeled by URL-shape heuristics.

Financial/payment consequence remains separately privileged.

### Sequencing dependency

Do not implement this before the v3 activity/action representation exists.

---

## 9. Gap C — event/show timestamp editing

### Historical need

Operators need to correct schedules without editing raw source.

### Current semantic finding

The old event start/end pair is too narrow for:

- occurrence;
- release moment;
- open interval/window;
- postponement;
- locationless creator activity.

### Classification

```text
EVENT_SHOW_TIMESTAMP_EDITING = REEXPRESS_FOR_V3
```

### Required next-generation expression

Typed activity temporal authoring must preserve the v3 discriminated temporal form.

A release must not receive fake concert-like start/end values merely to reuse an old widget.

Schedule corrections remain source mutations and must not require Hive signing.

If a social root later exists, material schedule change may separately create a social-notice obligation.

---

## 10. Gap D — show/event creation, removal and ordering

### Historical state

PR #206 already implemented v2 event creation/removal/list ordering.

The missing issue is no longer whether HiVenues can perform resource lifecycle mechanics; it can.

The issue is whether those mechanics can operate against the generalized activity model.

### Classification

```text
V2_EVENT_LIFECYCLE_MECHANICS = REUSE_UNCHANGED
NEXT_GEN_SHOW_EVENT_OBJECT = REEXPRESS_FOR_V3
```

For the unfinished next-generation obligation, the primary classification is:

```text
ACTIVITY_CREATION_REMOVAL_ORDERING = REEXPRESS_FOR_V3
```

### Important deletion constraint

A v3 activity with durable external bindings cannot use an ordinary destructive deletion policy merely because a local draft can.

Before external bindings exist, the first provider-neutral v3 slice may prove local activity resource identity without solving external-bound deletion recovery.

---

## 11. Gap E — general managed media beyond Hero

### Historical need

The ordinary Studio has accepted Hero-media selection/import but not a complete generalized authoring path for Gallery, activity promo media and other semantic media usages.

### Current semantic finding

Source-managed public media remains valid in v3 and is deliberately distinct from SPK/3Speak/provider-media bindings.

The operator need therefore survives, but its activity-related usages need the v3 resource shape first.

### Classification

```text
GENERAL_MANAGED_MEDIA_AUTHORING = REEXPRESS_FOR_V3
```

### Sequencing dependency

The first v3 slice should preserve/migrate existing managed-media references and prove renderer use.

Broader media admission/editing should follow once native v3 media usages are stable.

Provider upload is a separate later operation.

---

## 12. Gap F — Gallery/private-event/component insertion

### Historical need

The old physical-reference matrix wanted additional Gallery/Private Events components available through ordinary component insertion/removal.

### Current finding

Gallery remains a legitimate conditional semantic component.

`Private Events` is not a universal component kind and its event-shaped meaning now belongs under generalized activity semantics where applicable.

### Classification

```text
GALLERY_COMPONENT_CARDINALITY = DEFER_UNTIL_AFTER_FIRST_V3_SLICE
PRIVATE_EVENTS_AS_EVENT_SPECIFIC_COMPONENT = REEXPRESS_FOR_V3
```

The generic component-library mechanism itself remains `REUSE_UNCHANGED`.

No physical-archetype catalog completion should block proof of locationless creator support.

---

## 13. Gap G — per-component recipe editing

### Historical need

The Studio can select global theme recipes, but not every component recipe through ordinary operator controls.

### Current finding

Bounded semantic recipe selection remains useful across hosts.

However, an event-list-specific recipe editor would immediately target the superseded next-generation component family.

### Classification

```text
GENERAL_COMPONENT_RECIPE_EDITING = DEFER_UNTIL_AFTER_FIRST_V3_SLICE
EVENT_LIST_SPECIFIC_RECIPE_EDITING = SUPERSEDED
```

### Later rule

When resumed, recipe authority must target the generalized component registry—including `activity-list`—and preserve server-owned compatible recipe enums. No arbitrary CSS authority is created.

---

## 14. Gap H — event-list and Event-detail-specific expectations

### Historical need

The live-music journey named event-list recipe changes, Event detail inspection and `/events/<slug>` behavior.

### Current finding

The user need for a list plus derived detail experience remains valid.

The event-specific next-generation object does not.

### Classification

```text
EVENT_LIST_AS_NEXT_GEN_COMPONENT = SUPERSEDED
EVENT_DETAIL_AS_NEXT_GEN_LEAF = SUPERSEDED
LEGACY_V2_EVENT_LIST_AND_EVENT_DETAIL = STILL_V2_COMPATIBILITY_ONLY
ACTIVITY_LIST_AND_ACTIVITY_DETAIL = REEXPRESS_FOR_V3
```

The first v3 slice must prove `activity-list` and derived activity detail while preserving migrated `/events/<slug>` compatibility.

---

## 15. Gap I — responsive preview, accessibility and keyboard behavior

### Historical need

Every fresh operator journey needs credible desktop/tablet/mobile preview and accessible controls.

### Classification

```text
RESPONSIVE_PREVIEW = REUSE_UNCHANGED
ACCESSIBILITY_KEYBOARD_GEOMETRY = REUSE_UNCHANGED
```

### Qualification meaning

These remain cross-cutting gates, not a separate host feature.

A creator reference must use the same responsive source and preview architecture rather than a parallel creator UI.

---

## 16. Gap J — exact persistence and history

### Historical need

Accepted operator work must survive explicit Save and fresh-process reopen exactly.

### Classification

```text
PROPOSAL_APPLY_DISCARD_HISTORY = REUSE_UNCHANGED
EXPLICIT_SAVE_FRESH_PROCESS_REOPEN = REUSE_UNCHANGED
STALE_PERSISTED_BASELINE_PROTECTION = REUSE_UNCHANGED
```

### v3 qualification consequence

The first v3 source/parser/migration slice need not expose the full Studio authoring surface, but any persisted v3 implementation must retain the accepted atomic/stale-save contract.

No workspace may have v2 and v3 as competing mutable authorities.

---

## 17. Gap K — complete fresh-archetype operator journeys

### Historical need

Issue #199 aimed to prove complete ordinary operator tasks rather than isolated command APIs.

That acceptance principle remains correct.

The old physical-only reference matrix is no longer sufficient.

### Classification

```text
FOUR_PHYSICAL_REFERENCE_ONLY_JOURNEY_CLOSURE = SUPERSEDED
COMPLETE_OPERATOR_JOURNEY_ACCEPTANCE = REEXPRESS_FOR_V3
```

### Minimum current pressure set

A later v3 journey matrix must contain at least:

```text
P1 = MIGRATED_PHYSICAL_HOST_ACTIVITY
P2 = NATIVE_LOCATIONLESS_CREATOR_OR_PERFORMER_ACTIVITY
P3 = NATIVE_RELEASE_OR_PREMIERE_ACTIVITY
```

Hospitality/menu and operational/equipment references remain useful conditional pressure but do not replace P2/P3.

### No fork rule

All references must use the same source/renderer architectural family.

---

## 18. Gap L — historical Community-capability journey language

### Historical state

The old matrix considered “review Community when enabled” sufficient as a bounded physical-venue task because PM1 treated Community as optional product capability.

### Current doctrine

Current doctrine says:

```text
HIVE_NATIVE_SOCIAL_IDENTITY_AND_COMMUNITY = FOUNDATIONAL_PRODUCT_DIMENSION
HIVE_COMMUNITIES_PROTOCOL_OBJECT = CONDITIONAL
PUBLIC_READING_WITHOUT_SIGNING = REQUIRED
```

### Classification

```text
COMMUNITY_AS_OPTIONAL_PRODUCT_DIMENSION = SUPERSEDED
HIVE_COMMUNITY_ID_REQUIRED_FOR_EVERY_HOST = SUPERSEDED
```

The historical journey item is therefore not retained as an Issue #199 checkbox.

Current Hive-native social read and signed participation obligations are governed by the host/social contracts and later social-surface reconciliation work, not by resurrecting the old optional-Community UI task.

---

## 19. Gap M — physical-only business fields and components

### Historical state

Address, hours, map, Visit and related physical facts were effectively universal in v2.

### Current doctrine

They are conditional host traits in v3.

### Classification

```text
PHYSICAL_BUSINESS_FACTS_AS_UNIVERSAL = SUPERSEDED
HOURS_LOCATION_VISIT_FOR_PHYSICAL_HOSTS = REUSE_UNCHANGED
```

### Consequence

Native creator references must not fabricate physical facts.

Existing v2 physical references retain their accepted data and renderer behavior through compatibility/migration.

---

## 20. Gap N — menu scalar editing already accepted

PR #207 already proves scalar nested menu authoring.

### Classification

```text
MENU_SCALAR_AUTHORING_MECHANISM = REUSE_UNCHANGED
```

This does not elevate menu cardinality to immediate next priority.

The accepted mechanism becomes reusable evidence when conditional hospitality authoring resumes.

---

## 21. Gap O — program/equipment authoring already accepted

PRs #205/#206 prove substantial program/equipment scalar and lifecycle mechanics.

Programs and equipment remain valid conditional v3 resource families.

### Classification

```text
PROGRAM_EQUIPMENT_AUTHORING_MECHANICS = REUSE_UNCHANGED
```

No new implementation slice is justified merely to rewrite those accepted controls before v3 activity generality is proved.

---

## 22. Gap P — ticket/payment/support semantic distinctions

The historical ticket/reservation backlog must not absorb payment or Hive-support semantics by convenience.

### Classification

```text
NON_FINANCIAL_ACTIVITY_ACTION_AUTHORING = REEXPRESS_FOR_V3
PAYMENT_VALUE_SUPPORT_IMPLEMENTATION = DEFER_UNTIL_AFTER_FIRST_V3_SLICE
```

A vote-based support action, token transfer, ticket provider link and reservation URL are distinct consequences.

Later implementation must preserve those distinctions rather than one generic “Support” or “Action” mutation path.

---

## 23. Gap Q — visual convergence and Studio product language

The historical queue previously placed visual convergence after #199.

The newer product doctrine refines the sequence rather than cancelling the quality goal.

### Classification

```text
VISUAL_CONVERGENCE_AS_OPERATOR_GAP = SUPERSEDED
VISUAL_CONVERGENCE_AS_LATER_PRODUCT_MATURATION_PHASE = REUSE_UNCHANGED
```

Meaning: visual convergence remains required later, but it is not an excuse to keep every conditional #199 feature on the critical path first.

Studio product-language convergence should occur after enough v3 operator semantics exist to avoid polishing obsolete v2 terminology.

---

## 24. Consolidated routing matrix

| Remaining material obligation | Classification | Next routing |
| --- | --- | --- |
| Menu resource/section/item create/remove/order | `DEFER_UNTIL_AFTER_FIRST_V3_SLICE` | Resume only after v3 generality proof; hospitality-conditional. |
| Ticket/reservation/external action editing | `REEXPRESS_FOR_V3` | Typed provider-neutral activity/host actions after v3 source exists. |
| Event/show timestamp editing | `REEXPRESS_FOR_V3` | Activity temporal forms, not universal start/end editor. |
| Show/event lifecycle as next-gen object | `REEXPRESS_FOR_V3` | Activity lifecycle/presence/access semantics. |
| Existing lifecycle/history mechanics | `REUSE_UNCHANGED` | Port architecture, not v2 event vocabulary. |
| General Gallery/non-Hero/activity managed media | `REEXPRESS_FOR_V3` | Preserve source-managed media; broaden after v3 slice. |
| Gallery component insertion | `DEFER_UNTIL_AFTER_FIRST_V3_SLICE` | Conditional component breadth. |
| Private Events event-specific component | `REEXPRESS_FOR_V3` | Express through generalized activity components. |
| General per-component recipe editing | `DEFER_UNTIL_AFTER_FIRST_V3_SLICE` | Target generalized component registry later. |
| Event-list-specific recipe editing | `SUPERSEDED` | Future target is activity-list. |
| Event-list/Event-detail as next-gen model | `SUPERSEDED` | Replaced by activity-list/activity-detail. |
| Existing v2 event route/detail | `STILL_V2_COMPATIBILITY_ONLY` | Preserve `/events/<slug>` compatibility. |
| Responsive preview | `REUSE_UNCHANGED` | Same semantic responsive source for all host classes. |
| Accessibility/keyboard/geometry | `REUSE_UNCHANGED` | Cross-cutting acceptance gate. |
| Proposal/history/Undo/Redo | `REUSE_UNCHANGED` | Core v3 authoring machinery. |
| Explicit Save/fresh-process reopen | `REUSE_UNCHANGED` | Core persistence requirement. |
| Four-physical-reference-only closure | `SUPERSEDED` | Insufficient for product generality. |
| Complete operator journey acceptance | `REEXPRESS_FOR_V3` | Physical + locationless creator + release/premiere pressure. |
| Community as optional product dimension | `SUPERSEDED` | Hive-native community/social dimension is foundational; protocol Community object conditional. |
| Physical business facts as universal | `SUPERSEDED` | Physical facts are conditional in v3. |
| Hours/location/visit for physical hosts | `REUSE_UNCHANGED` | Remain valid conditional physical-host features. |
| Menu scalar authoring | `REUSE_UNCHANGED` | Already accepted; preserve. |
| Program/equipment authoring mechanics | `REUSE_UNCHANGED` | Already accepted; preserve. |
| Payment/value/support implementation | `DEFER_UNTIL_AFTER_FIRST_V3_SLICE` | Separate consequence contracts later. |
| Visual convergence as #199 operator gap | `SUPERSEDED` | Later maturation phase, not this queue's immediate critical path. |

---

## 25. What Issue #199 means after this re-audit

Issue #199 remains a valid historical PM4 operator-journey umbrella, but its unchecked historical matrix is not a mandatory linear backlog.

After this re-audit, #199 should be interpreted as:

> Close the operator-authoring gaps that remain necessary to prove coherent, ordinary semantic authoring under the current HiVenues product model, while preserving accepted v2 compatibility and routing conditional/non-critical breadth appropriately.

It should **not** mean:

> Finish every unimplemented field/control imagined for the old four physical references before any next-generation architecture is allowed to exist.

### Issue-state decision

```text
ISSUE_199 = REMAINS_OPEN
OLD_LINEAR_QUEUE = RETIRED
ACCEPTED_IMPLEMENTATION_EVIDENCE = PRESERVED
```

No closure of #199 is performed by this audit.

---

## 26. Highest-value first executable successor

The implementation slice implied by the accepted #215 contract remains the highest-value next executable operation.

### Decision

```text
FIRST_V3_EXECUTABLE_SLICE = ACCEPT_AS_NEXT
```

### Bounded slice

```text
V3_SOURCE_PARSER
+
V2_TO_V3_PURE_MIGRATOR
+
ACTIVITY_RESOURCE
+
ACTIVITY_LIST / ACTIVITY_DETAIL READ_PROJECTION
+
LEGACY_EVENT_ROUTE_COMPATIBILITY
+
NO_EXTERNAL_BINDING_WRITES
```

### Why this comes before more operator controls

It directly tests the highest-risk architecture claim:

1. accepted v2 physical data can migrate without identity loss;
2. native v3 can represent a locationless creator/performer;
3. native v3 can represent a release/premiere without fake physical/time fields;
4. one generalized renderer family can project all three;
5. existing `/events/<slug>` links can survive migration;
6. no Hive/provider state needs to be fabricated to make the model work.

If this slice fails conceptually or structurally, broad new operator UI built first would have been misdirected.

If it succeeds, the existing typed-authoring machinery has a stable semantic target to extend.

---

## 27. Reference pressure for the first v3 slice

The first v3 implementation must include deterministic fixtures/references representing:

### V3-R1 — migrated physical host

A valid v2 physical event migrates to the exact same stable activity id and slug, with physical-host-default presence and legacy `/events/<slug>` compatibility.

### V3-R2 — native locationless creator/performer

A creator host has no fake business address/map/hours and can represent an online or locationless occurrence using the same v3 schema/renderer family.

### V3-R3 — native release/premiere

A release uses release temporal semantics and no physical place without fake start/end/location data.

### Shared requirement

```text
R1_SOURCE_FAMILY = R2_SOURCE_FAMILY = R3_SOURCE_FAMILY
R1_RENDERER_FAMILY = R2_RENDERER_FAMILY = R3_RENDERER_FAMILY
HOST_SPECIFIC_SCHEMA_FORK = NO
HOST_SPECIFIC_RENDERER_FORK = NO
```

---

## 28. What the first v3 slice must not absorb

Do not expand it into:

- Hive publication;
- Keychain signing;
- social-root creation;
- SPK/3Speak upload;
- Podping/feed publication;
- ticket-provider mutation;
- reservations mutation;
- payments/transfers;
- menu cardinality;
- broad Gallery/media authoring;
- component recipe editor;
- visual convergence;
- production cutover.

Those are separate evidence questions.

The first slice is useful precisely because its success/failure can be attributed to the generalized semantic architecture rather than a bundle of integrations.

---

## 29. Operator implementation sequence after the first v3 slice

Assuming the first v3 slice passes, the current best bounded sequence is:

```text
S1 = FIRST_PROVIDER_NEUTRAL_V3_SOURCE_MIGRATION_RENDERER_SLICE
S2 = V3_ACTIVITY_CORE_AUTHORING
S3 = V3_ACTIVITY_ACTION_AND_GENERAL_MEDIA_AUTHORING
S4 = CROSS_HOST_COMPLETE_OPERATOR_JOURNEYS
S5 = CONDITIONAL_HOST_BREADTH_REASSESSMENT
S6 = STUDIO_PRODUCT_LANGUAGE_AND_INTERACTION_CONVERGENCE
S7 = GENERATED_EXPERIENCE_VISUAL_CONVERGENCE
S8 = SOCIAL_SURFACE_RECONCILIATION
S9 = MEASURED_QUALITY_RELEASE_GATES
```

This sequence is routing, not implementation authorization.

### S2 — v3 activity core authoring

Expected concern set:

- stable activity create/update/order;
- lifecycle;
- temporal form editing;
- presence/destination editing;
- source-owned description/access facts;
- existing proposal/history/save machinery.

### S3 — actions and general source-managed media

Expected concern set:

- typed provider-neutral public actions;
- source-managed activity/gallery media usages;
- no provider-side mutation;
- semantic consequence distinctions.

### S4 — complete cross-host journeys

At minimum physical + creator/performer + release/premiere.

### S5 — conditional breadth reassessment

Only here should the project decide which conditional gaps—menu cardinality, Gallery catalog breadth, equipment edge cases, advanced recipes—still materially block target product quality.

This prevents conditional physical-host breadth from becoming permanent critical-path work by inertia.

---

## 30. Relationship to Hive-native product qualification

This audit deliberately does not confuse source/authoring readiness with full HiVenue product qualification.

A fully qualified future HiVenue still needs the Hive-native obligations frozen by the host contract, including real public Hive projection and at least one explicit signed participation loop with reconciliation.

However, implementing those before the generalized v3 domain model exists would couple protocol effects to an unstable source abstraction.

Therefore:

```text
V3_DOMAIN_GENERALITY_FIRST
THEN_SOCIAL_READ_BINDING
THEN_SIGNED_PARTICIPATION
```

This is sequencing, not a retreat from Hive nativeness.

---

## 31. Relationship to external product validation

The first v3 slice is an engineering/domain-model test, not market validation.

Later complete operator journeys should be usable by the product owner and external operators, but this audit does not claim that an architecture passing deterministic fixtures proves user comprehension or demand.

Likewise, visual convergence should be judged visually, not inferred from schema validity.

---

## 32. Failure conditions for the next implementation slice

The first v3 slice should be rejected if it requires any of the following to pass:

- rewriting accepted v2 bytes in place;
- changing migrated event ids merely because they become activities;
- inventing Hive author/permlink identity;
- inferring online/hybrid presence from a legacy action URL;
- fabricating a physical address for a creator;
- giving a release fake occurrence timestamps;
- creating a creator-specific source schema;
- creating a creator-specific renderer fork;
- making `/events/<slug>` legacy links disappear;
- using current wall clock to decide migration lifecycle;
- performing network access during migration;
- broadening the slice to hide a core-model failure behind provider behavior.

---

## 33. Acceptance adjudication

```text
PM4_OPERATOR_GAP_REAUDIT_AGAINST_NEXT_GEN_V3 = COMPLETE_CANDIDATE

ISSUE_199 = REMAINS_OPEN
HISTORICAL_LINEAR_QUEUE = RETIRED
PR205_ACCEPTED_EVIDENCE = PRESERVED
PR206_ACCEPTED_EVIDENCE = PRESERVED
PR207_ACCEPTED_EVIDENCE = PRESERVED
MENU_CARDINALITY_ACCEPTED_IMPLEMENTATION = NO

TYPED_AUTHORING_CORE = REUSE_UNCHANGED
RESPONSIVE_PREVIEW = REUSE_UNCHANGED
ACCESSIBILITY_KEYBOARD_GEOMETRY = REUSE_UNCHANGED
EXACT_HISTORY_PERSISTENCE = REUSE_UNCHANGED

MENU_CARDINALITY = DEFER_UNTIL_AFTER_FIRST_V3_SLICE
TICKET_RESERVATION_ACTIONS = REEXPRESS_FOR_V3
EVENT_TIMESTAMP_EDITOR = REEXPRESS_FOR_V3
NEXT_GEN_EVENT_OBJECT = REEXPRESS_FOR_V3_AS_ACTIVITY
GENERAL_MANAGED_MEDIA = REEXPRESS_FOR_V3
GENERAL_COMPONENT_RECIPE_EDITING = DEFER_UNTIL_AFTER_FIRST_V3_SLICE
EVENT_LIST_SPECIFIC_RECIPE = SUPERSEDED
EVENT_LIST_EVENT_DETAIL_AS_NEXT_GEN = SUPERSEDED
LEGACY_V2_EVENT_ROUTE_DETAIL = STILL_V2_COMPATIBILITY_ONLY
FOUR_PHYSICAL_ONLY_JOURNEY_CLOSURE = SUPERSEDED
COMPLETE_OPERATOR_JOURNEYS = REEXPRESS_FOR_V3
COMMUNITY_AS_OPTIONAL_PRODUCT_DIMENSION = SUPERSEDED
PHYSICAL_BUSINESS_AS_UNIVERSAL = SUPERSEDED
PAYMENT_VALUE_SUPPORT_IMPLEMENTATION = DEFER_UNTIL_AFTER_FIRST_V3_SLICE

FIRST_V3_EXECUTABLE_SLICE =
  V3_SOURCE_PARSER
  + V2_TO_V3_PURE_MIGRATOR
  + ACTIVITY_RESOURCE
  + ACTIVITY_LIST_ACTIVITY_DETAIL_READ_PROJECTION
  + LEGACY_EVENT_ROUTE_COMPATIBILITY
  + NO_EXTERNAL_BINDING_WRITES

FIRST_V3_REFERENCE_PRESSURE =
  MIGRATED_PHYSICAL_HOST
  + NATIVE_LOCATIONLESS_CREATOR_OR_PERFORMER
  + NATIVE_RELEASE_OR_PREMIERE

IMPLEMENTATION = NOT_AUTHORIZED
SCHEMA_CODE_CHANGE = NOT_AUTHORIZED
LIVE_HIVE_EFFECT = NONE
EXTERNAL_PROVIDER_MUTATION = NONE
PRODUCTION_TRANSITION = WITHHELD
```

---

## 34. Hard stop

Acceptance of this audit authorizes only the routing conclusion.

It does not create schema v3.

It does not migrate a workspace.

It does not resume menu cardinality.

It does not authorize Hive/provider/payment effects.

It does not close #199 or #200.

The next executable operation requires a separately frozen implementation contract rooted at the then-current canonical `main`.
