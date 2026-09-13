# HiVenues V3 Activity Core Authoring Contract 0.1.0

Status: **FROZEN IMPLEMENTATION CONTRACT**  
Operation: **S2 — V3_ACTIVITY_CORE_AUTHORING**  
Canonical base commit: `46654fb997297bdc626dbfcd5c67e7e5a9cbe421`  
Canonical base tree: `edc8d20317fb1c9fe7c97d0ac79df7467da5d030`

## 1. Authority and purpose

This contract is the separately frozen implementation authorization required by `PM4_OPERATOR_GAP_V3_REAUDIT_0_1_0.md` after successful S1.

S1 is canonically integrated at the base above. It established one strict provider-neutral v3 source/migration/renderer family across:

1. migrated physical-host activity;
2. native locationless creator/performer occurrence;
3. native release/premiere.

S2 now asks the next information-bearing question:

> Can ordinary activity facts be created and changed through one strict, reversible, stale-safe authoring transaction model across those same host classes, while stable identity, explicit activity-list ordering, exact persistence, provider neutrality, and v2 compatibility remain intact?

S2 is a domain-authoring proof. It is not full Studio convergence and it is not provider/Hive integration.

## 2. Controlling prior contracts

This contract is subordinate to the accepted repository contracts at the base, especially:

- `docs/HIVE_NATIVE_HOST_PRODUCT_CONTRACT_0_1_0.md`;
- `docs/HOST_ACTIVITY_SOCIAL_OBJECT_CONTRACT_0_1_0.md`;
- `docs/NEXT_GEN_ACTIVITY_SOURCE_AND_MIGRATION_CONTRACT_0_1_0.md`;
- `docs/PM4_OPERATOR_GAP_V3_REAUDIT_0_1_0.md`;
- `docs/NEXT_GEN_EXECUTABLE_SLICE_CONTRACT_0_1_1.md`.

S2 reuses the accepted v2 proposal/history/persistence architecture as an implementation pattern, but v2 source code remains a separate compatibility authority. A v3 command must never be routed through the v2 source parser merely to reuse machinery.

## 3. Exact bounded S2 slice

S2 SHALL implement:

```text
V3_ACTIVITY_AUTHORING_COMMANDS
+
PREVIEW / APPLY / DISCARD
+
EXACT UNDO / REDO HISTORY
+
STALE-DIGEST REJECTION
+
ACTIVITY CREATE / REMOVE
+
ACTIVITY CORE FACT EDITS
+
EXPLICIT ACTIVITY-LIST ORDER EDITS
+
EXPLICIT LOCAL SAVE / REOPEN
+
R1 / R2 / R3 CROSS-HOST EVIDENCE
+
NO EXTERNAL EFFECTS
```

Preferred initial module boundary:

```text
src/venue/v3/authoring-transaction.js
src/venue/v3/source-file.js
test/venue-v3-activity-authoring.test.js
test/venue-v3-source-file.test.js
```

A small test-only local harness may be added if needed, but S2 SHALL NOT grow into the full Studio application.

## 4. Explicitly out of scope

S2 does not authorize:

- production deployment or production routing;
- modification of Fourth Street production state;
- Hive RPC or broadcast;
- Keychain or wallet signing;
- creation/editing of Hive social bindings;
- SPK/3Speak, Podping, or other provider mutation;
- payment, transfer, donation, vote, ticket, reservation, or checkout behavior;
- editing `activity.publicActions`;
- editing `activity.managedMedia`;
- editing `activity.seriesRef`;
- editing any `activityBindings` family;
- menu cardinality;
- Gallery/media authoring;
- general component insertion/removal/recipe editing;
- broad page/component text authoring;
- responsive-design authoring;
- complete cross-host Studio journeys;
- Studio product-language convergence;
- generated-experience visual convergence;
- social-surface reconciliation;
- production cutover.

Those belong to later routed phases, especially S3–S9.

## 5. Governing source authority

Every public S2 operation SHALL begin from a source accepted by:

```text
createV3DeploymentAgnosticVenueSource(...)
```

and every resulting candidate SHALL be revalidated through the same exact authority before it can become a proposal.

S2 SHALL use the existing v3 canonical serialization and digest functions. It SHALL NOT define a second source schema or a second digest domain.

V2 parser/renderer/source bytes SHALL remain unchanged.

## 6. Stable activity identity

Source-owned stable activity identity remains:

```text
activity.id
```

Canonical public routing remains:

```text
/activities/<activity.slug>
```

During S2:

- `id` is assigned once at activity creation and is not operator-editable afterward;
- `slug` is assigned once at activity creation and is not operator-editable afterward;
- changing `title`, time, lifecycle, presence, access, or description SHALL NOT change `id` or `slug`;
- no id/slug may derive from array position, current clock, provider identity, author/permlink, or external state;
- creation derives an initial canonical id/slug from the operator-entered title through deterministic server-owned rules with collision-safe numeric suffixes;
- title edits do not regenerate id/slug;
- an activity created, edited, reordered, saved, reopened, undone, or redone preserves exact identity unless the activity itself is explicitly removed.

Manual routing/slug surgery is outside S2.

## 7. Activity creation semantics

A public `ADD_ACTIVITY` command SHALL provide only ordinary semantic facts, never an arbitrary resource object.

The minimum typed creation payload is:

```text
title
description
lifecycle
temporal
presence
access
```

The server derives:

```text
id
slug
managedMedia = []
publicActions = []
seriesRef = null
```

The command SHALL target one existing `activity-list` component by stable component id. On Apply, the newly created activity id is inserted into that selected list at an explicit stable destination.

This prevents a hidden source-order fallback and makes a newly created activity intentionally visible in one chosen public collection.

The command SHALL support destinations:

```text
BEFORE_ACTIVITY_REFERENCE(<existing activity id>)
END_OF_ACTIVITY_LIST
```

The selected list and destination are server-validated. Cross-list/browser-forged placement authority fails closed.

## 8. Activity removal semantics

A public `REMOVE_ACTIVITY` command targets one stable activity id.

Removal SHALL:

1. remove exactly that activity from `resources.activities`;
2. remove that id from every `activity-list.content.resourceIds` consumer;
3. preserve all unrelated activity/list order exactly;
4. produce an inverse history operation capable of restoring the exact activity resource and every exact former list position.

The operator does not supply the resource snapshot or restoration references. Those are internal history authority only.

Removal SHALL NOT mutate external bindings to make deletion convenient. Because S2 binding collections are frozen/out of scope, an activity with a non-empty external binding is outside S2 authoring and removal SHALL fail closed rather than orphan or rewrite external identity.

## 9. Explicit activity-list ordering

S1 established that public list order is the ordered stable-id array in each `activity-list`, not `resources.activities` source order.

Therefore S2 defines public ordering through `MOVE_ACTIVITY_REFERENCE` rather than by treating resource-array position as presentation authority.

The command SHALL target:

```text
activity-list component id
activity id already present in that list
explicit stable destination
```

Allowed destinations:

```text
BEFORE_ACTIVITY_REFERENCE(<another id in the same list>)
END_OF_ACTIVITY_LIST
```

No-op, missing, duplicate, cross-list, stale, and browser-forged destinations fail closed.

The resource collection itself may remain in canonical creation/migration order; renderer behavior SHALL continue to use explicit list references only.

## 10. Core editable activity facts

S2 SHALL admit ordinary operator editing of exactly these core facts:

### 10.1 Text

```text
title
activity.description
activity.access.note
```

`description` and `access.note` retain source-schema nullability. Public commands SHALL distinguish an explicit clear-to-null action from an omitted field.

### 10.2 Lifecycle

Exactly the existing v3 values:

```text
DRAFT
SCHEDULED
LIVE
COMPLETED
POSTPONED
CANCELLED
```

S2 SHALL NOT infer lifecycle from wall clock.

### 10.3 Access capacity

Exactly:

```text
UNSPECIFIED
AVAILABLE
FULL
```

Capacity and lifecycle remain distinct facts.

### 10.4 Temporal form

S2 SHALL edit temporal semantics as the existing strict discriminated union:

```text
OCCURRENCE { startAt, endAt|null }
RELEASE    { releaseAt }
WINDOW     { startAt, endAt }
```

A temporal-form transition is atomic. Changing OCCURRENCE → RELEASE, for example, removes occurrence-only fields and supplies exactly the required release field in one validated proposal.

No fake start/end values may be retained or synthesized.

### 10.5 Presence and destinations

S2 SHALL edit presence as the existing strict discriminated union:

```text
PHYSICAL_HOST_DEFAULT
ONLINE { destinations[] }
HYBRID { destinations[] }
NONE
```

Destination records remain exact typed data:

```text
id
label
href
```

Destination ids are stable within an activity presence value. The authoring API may replace a complete validated destination set atomically; it may not admit raw JSON or arbitrary fields.

`PHYSICAL_HOST_DEFAULT` remains invalid when `venue.business = null`.

ONLINE/HYBRID destination URLs remain credential-free HTTPS under the v3 parser.

## 11. Frozen non-S2 activity fields

For an existing activity, these fields are preserved byte-semantically by every S2 operation:

```text
id
slug
managedMedia
publicActions
seriesRef
```

except that `id`/`slug` are server-created for a newly added activity and all three non-core payload collections receive the frozen empty/null creation defaults described in section 7.

No S2 command schema SHALL expose a generic path, JSON pointer, resource snapshot, extension bag, arbitrary object patch, or `set(any-path, any-value)` escape hatch.

## 12. Command vocabulary

The public S2 command vocabulary is frozen as:

```text
ADD_ACTIVITY
REMOVE_ACTIVITY
SET_ACTIVITY_TEXT
SET_ACTIVITY_LIFECYCLE
SET_ACTIVITY_ACCESS
SET_ACTIVITY_TEMPORAL
SET_ACTIVITY_PRESENCE
MOVE_ACTIVITY_REFERENCE
```

Internal inverse-only commands MAY include exact restore forms needed for removal/reference restoration. Internal forms SHALL be rejected at the public command boundary.

Every public command SHALL include:

```text
schemaVersion = 1
expectedDraftDigest = <exact current v3 source digest>
```

and only the strict fields required by that command.

Dangerous/prototype keys, unknown keys, malformed scalar types, unsupported enum values, and stale digests fail before mutation.

## 13. Proposal / Apply / Discard

S2 SHALL preserve the accepted transaction philosophy:

```text
COMMAND
  -> VALIDATED TRANSITION
  -> PREVIEW PROPOSAL
  -> explicit APPLY or DISCARD
```

A proposal SHALL bind at minimum:

```text
beforeDigest
afterDigest
validated public command
internal inverse command
resolved stable target
previewSource
```

Proposal creation changes neither accepted draft nor persistent source.

Apply verifies the proposal again against the current accepted draft and adds exactly one history entry.

Discard verifies the proposal but returns the accepted session unchanged.

A second command against a changed/stale draft must fail rather than silently rebase.

## 14. Exact history / Undo / Redo

S2 history SHALL preserve the v2 architecture's strongest invariants:

- every entry binds exact before/after source and digest;
- the forward command must regenerate the exact after-source;
- the inverse command must regenerate the exact before-source;
- history continuity is validated;
- Undo and Redo restore exact canonical source bytes/digests;
- an Apply after Undo truncates stale redo history;
- forged history, inverse payloads, source snapshots, positions, or digest chains fail closed;
- history remains session-local and nonpersistent unless a later contract explicitly authorizes persistent editing history.

S2 SHALL use v3-specific session/proposal/history kinds and schema versions rather than pretending v3 is a v2 session.

## 15. Save / reopen semantics

S2 SHALL add an explicit local v3 source-file persistence boundary.

Save requirements:

- save only a validated accepted v3 draft;
- serialize through the existing canonical v3 serializer;
- write exact canonical bytes with terminal LF behavior defined by that serializer;
- no network access;
- fail closed on symlink/path replacement or unsafe overwrite conditions consistent with the repository's existing local source-file discipline;
- no implicit autosave from Preview;
- no write from Discard;
- no provider/Hive side effect;
- a fresh process/load can reopen the saved source to the exact same v3 digest.

S2 may write only a caller-selected local source file/test workspace. It does not authorize modification of an existing production workspace.

## 16. Cross-host pressure

All public commands, transaction/session machinery, and persistence SHALL be proven against the same three source families retained from S1:

```text
R1 = migrated physical host
R2 = native locationless creator/performer
R3 = native release/premiere
```

Required pressure includes:

### R1 physical

- create an occurrence activity targeting an existing `activity-list`;
- edit lifecycle/access/text;
- exercise physical presence;
- reorder explicit list references;
- exact Undo/Redo;
- save/reopen.

### R2 locationless creator

- create/edit an ONLINE occurrence with explicit destination;
- reject PHYSICAL_HOST_DEFAULT;
- edit destination label/URL through typed presence data;
- convert temporal form without creating physical facts;
- exact Undo/Redo;
- save/reopen.

### R3 release/premiere

- edit a RELEASE activity without fake occurrence fields;
- transition RELEASE ↔ WINDOW or OCCURRENCE atomically and validate exact required fields;
- preserve `presence = NONE` unless the operator explicitly selects another valid presence;
- exact Undo/Redo;
- save/reopen.

One engine/session/persistence family SHALL serve all three. No host/archetype-specific transaction fork is allowed.

## 17. Renderer coupling

Every valid proposal preview and every accepted draft SHALL remain renderable by the S1 generic v3 renderer.

At minimum tests SHALL prove:

- title/description/lifecycle/time/presence edits reach the derived detail page;
- explicit list moves change rendered activity-list order;
- activity removal removes the corresponding list/detail route while unrelated activities remain valid;
- add creates one canonical `/activities/<derived-slug>` route;
- stable id/slug survive ordinary edits and ordering;
- no `/events/<slug>` alias is fabricated for a native S2-created activity;
- migrated legacy aliases remain bound to their migrated activity unless that activity is explicitly removed.

If legacy-route state must be carried outside canonical source, S2 SHALL keep that compatibility mapping explicit rather than smuggling it into provider identity.

## 18. No external-state fabrication

All S2 commands and persistence SHALL leave these root collections exactly unchanged:

```text
activityBindings.hiveSocial
activityBindings.providerMedia
activityBindings.syndication
activityBindings.value
activityBindings.commerce
activityBindings.discovery
```

No author/permlink, provider object id, ticket id, payment identity, destination status, or network observation may be invented.

Tests SHALL make network access fail-fast while core transitions and save/reopen execute successfully.

## 19. Required executable tests

At minimum, S2 qualification SHALL prove:

1. one command/session implementation serves R1/R2/R3;
2. v2 source/parser/renderer bytes remain untouched;
3. `ADD_ACTIVITY` derives collision-safe stable id/slug from title and inserts only into the explicitly selected list;
4. title edits do not change id/slug;
5. description/access-note nullable clear/add round-trip exactly;
6. every lifecycle and capacity value is admitted only where valid;
7. temporal discriminant transitions remove incompatible old fields and require exact new ones;
8. no lifecycle or temporal value is inferred from wall clock;
9. locationless hosts cannot adopt PHYSICAL_HOST_DEFAULT;
10. ONLINE/HYBRID destinations are typed, stable-id, HTTPS-only data;
11. `MOVE_ACTIVITY_REFERENCE` changes explicit list order and rejects no-op/missing/cross-list/stale targets;
12. `REMOVE_ACTIVITY` removes every list reference and Undo restores exact resource + exact list positions;
13. existing `managedMedia`, `publicActions`, `seriesRef`, and every binding family remain unchanged through all ordinary S2 edits;
14. public command parsing rejects internal restore authority and arbitrary paths/objects;
15. Preview leaves accepted state unchanged;
16. Apply creates one exact history entry;
17. Discard is source/digest exact;
18. Undo/Redo are canonical-byte exact and forged history fails closed;
19. Apply-after-Undo truncates stale redo;
20. stale expected digest fails without mutation;
21. preview/accepted source renders through the S1 renderer;
22. native-added activity receives no migrated `/events/` alias;
23. migration legacy mapping remains explicit and stable for untouched migrated activities;
24. explicit save followed by fresh reopen preserves exact digest;
25. Preview/Discard perform no disk write;
26. S2 executes with zero Hive RPC, zero Hive writes, and zero provider writes;
27. the full pre-existing repository suite remains green on Ubuntu and Windows.

## 20. Falsification criteria

S2 is FAILED if safe authoring requires any of the following:

- editing through a v2 source/session by pretending schema v3 is schema v2;
- changing id/slug on ordinary activity edits;
- source-order fallback for public activity order;
- host/archetype-specific command engines;
- raw JSON/path patch authority;
- wall-clock lifecycle inference;
- fake physical facts for locationless hosts;
- fake temporal facts when switching temporal forms;
- fabricating or mutating provider/Hive identities;
- silently rebasing stale commands;
- irreversible removal without exact restoration evidence;
- Preview writing to disk;
- implicit autosave used to make persistence tests pass;
- network access required for a core transition;
- changing v2 compatibility code to avoid implementing v3 authoring correctly.

A failure under this section is architecture evidence and SHALL be reported rather than hidden behind an exception.

## 21. Qualification and next boundary

S2 becomes `QUALIFIED` only when:

- the exact S2 candidate has executable evidence for sections 5–20;
- full deterministic CI passes on Ubuntu and Windows;
- existing v2 and S1 v3 tests remain green;
- no production or external-effect boundary is crossed;
- exact commit/tree/run identities are recorded.

A qualified S2 candidate may then proceed to the already-routed planning boundary:

```text
S3 = V3_ACTIVITY_ACTION_AND_GENERAL_MEDIA_AUTHORING
```

It does not automatically authorize S3 implementation, full Studio convergence, Hive bindings, signed participation, payment, or production cutover.

## 22. Project Lead execution decision

```text
S1 = QUALIFIED_AND_CANONICAL
S2_CONTRACT_0_1_0 = FROZEN
S2_IMPLEMENTATION = AUTHORIZED_ON_FEATURE_BRANCH
PRODUCTION_MUTATION = NO
LIVE_HIVE_EFFECT = NONE
EXTERNAL_PROVIDER_MUTATION = NONE
V2_MUTATION = NO
NEXT_ACTION = IMPLEMENT_AND_QUALIFY_S2
```

If implementation discovers a material conflict with an accepted prior contract, stop that conflicting implementation path and reconcile the contract explicitly rather than silently changing semantics.