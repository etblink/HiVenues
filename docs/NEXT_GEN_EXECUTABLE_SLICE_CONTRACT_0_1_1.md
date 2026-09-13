# HiVenues Next-Generation Executable Slice Contract 0.1.1

Status: **FROZEN IMPLEMENTATION CONTRACT**  
Scope: **FIRST PROVIDER-NEUTRAL V3 SOURCE / MIGRATION / RENDERER SLICE**  
Supersedes: `NEXT_GEN_EXECUTABLE_SLICE_CONTRACT_0_1_0.md`  
Canonical implementation base: `f2b1ca995d02a5e276a3dd91235e92b1693da921`  
Canonical implementation-base tree: `792c6dbc70d11067952c4ec85af24ae783d92514`

## 1. Correction and authority

Version 0.1.0 of this implementation contract is retained only as provenance of a Project Lead reconstruction error. It is non-governing.

This 0.1.1 contract is derived directly from the already-accepted repository contracts at the implementation base, especially:

- `docs/HIVE_NATIVE_HOST_PRODUCT_CONTRACT_0_1_0.md`;
- `docs/HOST_ACTIVITY_SOCIAL_OBJECT_CONTRACT_0_1_0.md`;
- `docs/NEXT_GEN_ACTIVITY_SOURCE_AND_MIGRATION_CONTRACT_0_1_0.md`;
- `docs/PM4_OPERATOR_GAP_V3_REAUDIT_0_1_0.md`.

When this document is narrower, those accepted contracts remain authoritative outside the slice. This document may make previously conceptual executable syntax concrete, but it may not reverse their semantic decisions.

## 2. Information question

The first executable slice exists to test the highest-risk next-generation architecture claim:

> Can accepted v2 physical-event data migrate without identity loss into one strict v3 source family that also truthfully represents a locationless creator occurrence and a locationless release/premiere, while one generalized activity renderer handles all three and legacy event links survive, with no network/provider/Hive state fabrication?

A failure is an informative architecture result. Downstream Studio, provider, payment, and production work must not be used to hide such a failure.

## 3. Exact bounded slice

The executable candidate SHALL contain:

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

It SHALL also provide deterministic serialization/digesting and isolated local preview/test seams sufficient to prove those behaviors.

The v2 parser and renderer remain intact compatibility authorities during this operation.

## 4. Explicitly excluded

This contract does not authorize:

- production deployment/cutover;
- mutation of any production venue or workspace;
- Hive publication, social-root creation, votes, replies, transfers, or other writes;
- Keychain signing or other wallet/signature flows;
- live Hive RPC reads;
- SPK/3Speak upload or live provider reads;
- Podping/feed publication;
- ticket/reservation provider mutation;
- payment/value transfer or invoice execution;
- onboarding;
- Studio authoring, persistence, undo/redo, or Save;
- broad menu cardinality, Gallery/media authoring, or component-recipe editing;
- visual-convergence acceptance;
- external provider mutation of any kind.

Migration network access is forbidden.

## 5. Frozen source version and envelope

The v3 source keeps the accepted source kind and implementation compatibility vocabulary:

```text
kind = hive-venues-deployment-agnostic-source
schemaVersion = 3
```

The executable v3 root SHALL contain exactly:

```text
kind
schemaVersion
provenance
venue
media
resources
activityBindings
site
capabilities
```

Unknown root fields fail closed.

### 5.1 Provenance

Native v3 source:

```text
provenance = {
  origin: "native-v3",
  sourceSchemaVersion: null,
  sourceDigest: null,
  migrationContractVersion: null,
  starterId: string|null
}
```

Migrated v2 source:

```text
provenance = {
  origin: "v2-migration",
  sourceSchemaVersion: 2,
  sourceDigest: <exact canonical v2 digest>,
  migrationContractVersion: "next-gen-activity-source-migration/0.1.0",
  starterId: <preserved v2 starter id/null>
}
```

No wall-clock execution time enters canonical v3 source bytes.

### 5.2 Venue / host compatibility object

For this first slice:

```text
venue = {
  id,
  displayName,
  business,
  language
}
```

`venue.id`, `venue.displayName`, and `venue.language` retain accepted compatibility meaning.

`venue.business` is either:

- the accepted complete physical-business object; or
- `null` for a source-valid locationless host.

A native locationless creator SHALL NOT fabricate address, hours, map URL, phone, storefront, or merchant facts.

### 5.3 Media

The existing source-managed media collection remains canonical source data. This slice may implement only the smallest v3 validation needed to preserve migrated v2 media and activity references, but it may not reinterpret a managed-media URL as a provider binding.

### 5.4 Resources

The v3 resources object SHALL contain exactly:

```text
resources = {
  activities: [],
  programs: [],
  menus: [],
  equipment: []
}
```

Programs remain a distinct resource kind. They are not an activity `type`.

For the base v2→v3 migration:

```text
COUNT(v3 resources.activities) = COUNT(v2 resources.events)
```

Existing v2 programs/menus/equipment are preserved under their smallest compatible v3 representation; the migration does not invent activity-series relationships.

## 6. Executable activity shape

For this first slice, every activity SHALL use the following exact executable core:

```text
activity = {
  id: string,
  slug: string,
  title: string,
  description: string|null,
  temporal: Temporal,
  lifecycle: "DRAFT"|"SCHEDULED"|"LIVE"|"COMPLETED"|"POSTPONED"|"CANCELLED",
  presence: Presence,
  access: {
    note: string|null,
    capacity: "UNSPECIFIED"|"AVAILABLE"|"FULL"
  },
  managedMedia: [
    { assetId: string, role: "PROMO"|"PRIMARY_VISUAL_COMPATIBILITY" }
  ],
  publicActions: [
    { id: string, role: "LEGACY_EXTERNAL", label: string, href: string }
  ],
  seriesRef: null | { kind: "program", id: string }
}
```

No arbitrary extension bag is admitted.

### 6.1 Temporal discriminated union

Exactly one of:

```text
{ kind: "OCCURRENCE", startAt: ISO_TIMESTAMP, endAt: ISO_TIMESTAMP|null }
{ kind: "RELEASE", releaseAt: ISO_TIMESTAMP }
{ kind: "WINDOW", startAt: ISO_TIMESTAMP, endAt: ISO_TIMESTAMP }
```

The validator SHALL reject temporal fields belonging to another variant.

A release/premiere must not receive fake occurrence start/end values merely to satisfy a renderer.

### 6.2 Presence discriminated union

Exactly one of:

```text
{ kind: "PHYSICAL_HOST_DEFAULT" }
{ kind: "ONLINE", destinations: [{ id, label, href }] }
{ kind: "HYBRID", destinations: [{ id, label, href }] }
{ kind: "NONE" }
```

`ONLINE` and `HYBRID` require at least one explicit HTTPS destination for this slice.

`PHYSICAL_HOST_DEFAULT` requires non-null `venue.business`.

`NONE` requires no fabricated physical location.

### 6.3 Stable identity

Activity identity is source-owned `activity.id`.

It SHALL NOT derive from title, date, slug, array position, provider object, author/permlink, URL, or current clock.

## 7. V2 → V3 pure migrator

The implementation SHALL expose a pure transformation equivalent to:

```text
migrateV2DeploymentAgnosticVenueSourceToV3(validV2Source)
  -> complete validated deeply-frozen V3 source
```

The migrator MUST parse/validate through the exact existing v2 contract and must not weaken v2 validation.

It must perform no network access and no external mutation.

### 7.1 Required event field mapping

For each valid v2 event:

```text
v2 event.id          -> activity.id          EXACT
v2 event.slug        -> activity.slug        EXACT
v2 event.title       -> activity.title       EXACT
v2 event.description -> activity.description EXACT
v2 event.startAt     -> temporal.kind = OCCURRENCE; temporal.startAt EXACT
v2 event.endAt       -> temporal.endAt EXACT
v2 event.accessNote  -> access.note EXACT/null-preserving
```

State mapping:

```text
scheduled -> lifecycle SCHEDULED + capacity UNSPECIFIED
cancelled -> lifecycle CANCELLED + capacity UNSPECIFIED
full      -> lifecycle SCHEDULED + capacity FULL
```

No `LIVE`, `COMPLETED`, or `POSTPONED` state is inferred from wall clock.

Presence mapping:

```text
every migrated valid v2 event -> { kind: "PHYSICAL_HOST_DEFAULT" }
```

The migrator SHALL NOT inspect an old external-action URL to guess online/hybrid presence.

Managed media mapping:

- null v2 `mediaAssetId` -> empty `managedMedia`;
- otherwise preserve the exact asset id with role `PRIMARY_VISUAL_COMPATIBILITY`.

External action mapping:

- null v2 action -> empty `publicActions`;
- otherwise preserve label/href exactly as role `LEGACY_EXTERNAL`;
- deterministic action id = `activity:<activity.id>:legacy-external`.

Every migrated activity gets:

```text
seriesRef = null
```

No program/series relationship is inferred.

## 8. Activity binding seam

V3 external identities are separate from activity domain facts.

The exact first-slice root is:

```text
activityBindings = {
  hiveSocial: [],
  providerMedia: [],
  syndication: [],
  value: [],
  commerce: [],
  discovery: []
}
```

The first slice SHALL validate these as typed collections but permits only empty collections in native fixtures and migration output.

This is intentional: the operation proves the provider-neutral core without fabricating external state.

No activity-local `socialization` field or author/permlink field is allowed by this first-slice source schema.

A later binding operation may add durable external identities under the accepted contracts; that work is out of scope here.

## 9. Site/component executable boundary

V3 preserves one semantic source and typed components.

For this first slice, the implementation SHALL admit the smallest component subset required by the three frozen references:

```text
venue-hero
editorial-intro
contact-visit
activity-list
```

A derived activity detail is renderer-generated from the stable activity resource and is **not** a second hand-authored page/component authority.

### 9.1 Component base

Each component has:

```text
id
kind
recipeId
content
responsive
```

The implementation may reuse accepted v2 recipe identifiers when their semantics remain valid.

It MUST reject raw HTML, raw style/CSS objects, arbitrary free-positioning, and unknown component kinds.

### 9.2 `activity-list`

`activity-list` content SHALL contain an ordered `resourceIds` array of stable activity ids plus the accepted bounded human-copy fields needed by the renderer.

Every referenced id must resolve. Missing ids fail closed. Source-order fallback is forbidden.

### 9.3 Physical-only visit component

`contact-visit` is valid only when `venue.business` is non-null. It SHALL fail validation for locationless native hosts in this slice rather than fabricate placeholders.

## 10. Routing

### 10.1 Canonical v3 activity route

The canonical generalized activity detail route is:

```text
/activities/<slug>
```

All activities share this route family regardless of host archetype, temporal form, or presence.

Activity slugs are unique within the activity namespace.

### 10.2 Migrated-v2 legacy compatibility

Every migrated v2 event SHALL also remain resolvable at:

```text
/events/<same-slug>
```

The migration output SHALL expose a deterministic in-memory compatibility map equivalent to:

```text
legacy /events/<slug> -> activity.id
```

Native v3 activities do not gain `/events/` aliases merely because they are occurrence-like.

Missing or ambiguous route resolution fails closed.

## 11. Renderer

The implementation SHALL expose one generic read-only v3 renderer family for all three frozen references.

Runtime code SHALL contain no behavior branch keyed to:

- host/venue id;
- fixture id;
- reference id;
- synthetic host name;
- `physical` versus `creator` versus `release` as an archetype discriminator.

Legitimate branching on validated semantic traits such as temporal kind, presence kind, lifecycle, or component kind is required and is not an archetype fork.

### 11.1 Activity detail projection

Derived activity detail SHALL visibly preserve source facts and truthfully vary by semantic traits:

- occurrence timestamps are rendered as occurrence time facts;
- release time is rendered as a release fact without fake end time;
- window renders its actual interval;
- physical-host-default may render physical host facts;
- online may render validated destination action(s);
- none renders no fake location;
- cancelled/postponed lifecycle is not hidden;
- managed source media and public actions render only when present.

The renderer MUST escape untrusted text/content.

### 11.2 No provider fabrication

No social discussion, live provider state, ticket settlement, support/payment state, or other external object may be invented because an activity lacks bindings.

Source-valid unbound v3 state is expected in this slice.

## 12. Frozen first-slice reference pressure

Exactly three reference families SHALL pressure the same parser and renderer.

### V3-R1 — migrated physical host

Input: one deterministic valid v2 physical-host source containing at least one event.

Required evidence:

- migration succeeds through the exact v2 parser;
- event id and slug are preserved exactly;
- occurrence timestamps preserved exactly;
- physical-host-default presence;
- state/fullness map follows section 7;
- source-managed media/action identity preserved where present;
- all external binding collections remain empty;
- canonical `/activities/<slug>` detail works;
- legacy `/events/<slug>` resolves the same activity.

### V3-R2 — native locationless creator / performer

Required source facts:

- `venue.business = null`;
- one occurrence activity using `ONLINE` presence;
- no fabricated street address/hours/map;
- same source/renderer family as R1;
- canonical activity route works;
- no `/events/` compatibility alias required;
- external binding collections remain empty.

### V3-R3 — native release / premiere

Required source facts:

- `venue.business = null`;
- one `RELEASE` temporal activity;
- `presence.kind = NONE`;
- no fake end time or physical place;
- same source/renderer family as R1/R2;
- canonical activity route works;
- external binding collections remain empty.

Shared invariant:

```text
R1_SOURCE_FAMILY = R2_SOURCE_FAMILY = R3_SOURCE_FAMILY
R1_RENDERER_FAMILY = R2_RENDERER_FAMILY = R3_RENDERER_FAMILY
HOST_SPECIFIC_SCHEMA_FORK = NO
HOST_SPECIFIC_RENDERER_FORK = NO
```

The bar/restaurant/workshop visual-diversity challenge belongs to later cross-host/visual convergence work; it is not substituted for the accepted first-slice pressure set.

## 13. Determinism, freezing, and safety

The v3 validator SHALL return a deeply frozen canonical object.

The implementation SHALL provide deterministic canonical serialization and SHA-256 digesting in a distinct v3 digest domain.

For equivalent valid input:

- serialization is byte-stable;
- digest is stable;
- rendering is deterministic;
- rendering does not mutate source;
- migration output depends only on canonical validated v2 input plus frozen migration rules.

Secrets/private keys/tokens are forbidden source fields. Unknown fields fail closed rather than being ignored.

## 14. Required strict validation

Tests SHALL demonstrate fail-closed behavior for at least:

- unsupported `kind` or `schemaVersion`;
- unknown root fields;
- invalid/unknown provenance fields;
- duplicate activity ids;
- duplicate activity slugs;
- malformed ISO timestamps;
- invalid temporal discriminant/field combinations;
- invalid lifecycle;
- invalid presence discriminant/field combinations;
- physical-host-default with null business facts;
- bad/unknown managed-media reference;
- public action with invalid/non-HTTPS URL;
- seriesRef to missing program id;
- activity-list reference to missing activity id;
- duplicate page/component ids or ambiguous page routes;
- locationless host using `contact-visit`;
- non-empty external-binding family during this bounded first slice;
- raw HTML/style/CSS escape hatches;
- any v2 source that does not pass the exact existing v2 parser before migration.

## 15. Required executable tests

At minimum the candidate SHALL prove:

1. v2 parser source file remains unchanged from the implementation base;
2. all three frozen references use the same v3 parser and renderer;
3. R1 migration preserves exact activity id/slug and accepted field mappings;
4. v2 `full` becomes `SCHEDULED + FULL`, not another lifecycle;
5. migration result is unchanged by current wall clock;
6. migration performs no network operation;
7. no activity bindings are fabricated;
8. R2 has no physical business facts and renders an online occurrence truthfully;
9. R3 renders release semantics with no fake occurrence end/location;
10. canonical `/activities/<slug>` resolves all three;
11. migrated R1 legacy `/events/<slug>` resolves the same stable activity;
12. native R2/R3 do not silently acquire migrated-event aliases;
13. `activity-list` preserves explicit ordered stable-id selection and fails on missing refs;
14. malformed v3 variants fail for the strictness classes in section 14;
15. canonical serialization/digesting is deterministic and source is deeply frozen;
16. renderer source contains none of the frozen fixture/host identities;
17. renderer escapes hostile content and does not admit script/raw HTML;
18. isolated preview/read projection incurs zero Hive RPC attempts, zero Hive writes, and zero provider writes by construction;
19. all pre-existing v2 tests continue passing unchanged.

The existing repository test seam is `node --test --test-concurrency=1 test/*.test.js`; new v3 tests SHALL live in top-level `test/*.test.js` so the normal gate executes them.

## 16. Preferred initial module boundary

The first implementation SHOULD use:

```text
src/venue/v3/source.js
src/venue/v3/migrate-v2.js
src/venue/v3/renderer/index.js
test/support/v3-reference-fixtures.js
test/venue-v3-source-migration.test.js
test/venue-v3-renderer.test.js
```

Additional local fixture/media files are allowed only when needed for deterministic source-managed media evidence.

No v2 file needs modification for the first slice.

## 17. CI qualification

Focused tests are not sufficient for acceptance.

Before merge, the exact candidate SHALL pass the repository's normal deterministic quality gate, including Ubuntu and Windows verification. Existing lint/build/test/release-coherence gates may not be weakened, skipped, or special-cased to make v3 pass.

If changed-path classification activates the visual-acceptance job, that job must also pass or the candidate is not qualified.

## 18. Falsification criteria

Reject the first v3 slice if passing requires any of the following:

- rewriting accepted v2 bytes in place;
- weakening or changing the v2 parser;
- changing migrated event ids/slugs merely because they become activities;
- using wall clock to infer migration lifecycle;
- converting `full` into completed/cancelled or another invented lifecycle;
- inferring online/hybrid presence from a legacy action URL;
- inventing Hive author/permlink or any external provider identity;
- fabricating a physical address for a creator;
- giving a release fake occurrence timestamps;
- creating creator-specific or release-specific source schemas;
- creating host/archetype-specific renderer forks;
- making migrated `/events/<slug>` links disappear;
- network access during migration;
- an arbitrary JSON extension bag or raw styling escape hatch;
- broadening the operation into provider behavior to mask a domain-model failure.

Such a result is `FIRST_V3_SLICE = FAILED`, not a reason to add exceptions until tests turn green.

## 19. Pass condition

The slice is `QUALIFIED` only when:

- sections 5–18 have executable evidence;
- exact candidate commit/tree are recorded;
- the full required CI gate is green;
- v2 remains unchanged and usable;
- production and all external-effect boundaries remain untouched.

A pass authorizes the next already-routed operation only at the planning boundary:

```text
S2 = V3_ACTIVITY_CORE_AUTHORING
```

It does not itself authorize production transition, provider integration, signed Hive participation, or payment/value behavior.

## 20. Project Lead execution decision

```text
IMPLEMENTATION_CONTRACT_0_1_1 = FROZEN
FIRST_V3_EXECUTABLE_SLICE = AUTHORIZED_ON_FEATURE_BRANCH
PRODUCTION_MUTATION = NO
LIVE_HIVE_EFFECT = NONE
EXTERNAL_PROVIDER_MUTATION = NONE
V2_MUTATION = NO
NEXT_ACTION = IMPLEMENT_AND_QUALIFY_S1
```

Implementation SHALL stop and report rather than silently depart from this contract if an unforeseen conflict with the accepted source/re-audit contracts appears.