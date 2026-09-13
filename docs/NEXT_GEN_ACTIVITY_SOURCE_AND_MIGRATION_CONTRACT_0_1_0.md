# HiVenues Next-Generation Activity Source and Migration Contract 0.1.0

## Status and authority

```text
OPERATION = NEXT_GEN_ACTIVITY_SOURCE_AND_MIGRATION_CONTRACT
TRACKING_ISSUE = #215
CLASS = SOURCE_ARCHITECTURE_AND_MIGRATION_CONTRACT_ONLY
CANONICAL_BASE_COMMIT = 42fc8fcf49399f7c49901892ff565b7be1f1ec9e
CANONICAL_BASE_TREE = 76470eec5467c0b0d51c18669508ccd76df13f42
CANONICAL_BASE_CI = 770__PASS
IMPLEMENTATION_AUTHORIZATION = NO
SCHEMA_CODE_CHANGE = NO
MIGRATION_EXECUTION = NO
PRODUCTION_MUTATION = NO
LIVE_HIVE_EFFECT = NO
EXTERNAL_PROVIDER_MUTATION = NO
ASTRA_CODE_PORT = NO
```

Controlling inputs:

- `docs/HIVE_NATIVE_HOST_PRODUCT_CONTRACT_0_1_0.md`;
- `docs/HIVENUES_ECOSYSTEM_CAPABILITY_INTAKE_0_1_0.md`;
- `docs/HOST_ACTIVITY_SOCIAL_OBJECT_CONTRACT_0_1_0.md`;
- accepted PM2 semantic source, renderer, persistence, ownership and v1→v2 migration behavior;
- accepted PM3/PM4 typed-authoring, validation, history and persistence machinery;
- still-open Issue #199, whose remaining historical task matrix is explicitly subject to a later next-generation re-audit.

This contract answers one question:

> **What is the smallest versioned source boundary that can represent the accepted host/activity model without silently changing accepted `venue.v2` meaning, and how must existing v2 sources migrate into it?**

It does not implement or execute that migration.

---

## 1. Executive decision

The next-generation canonical semantic source is a new schema version.

```text
NEXT_GENERATION_SCHEMA_VERSION = 3
SOURCE_KIND = hive-venues-deployment-agnostic-source
V2_REINTERPRETED_IN_PLACE = NO
V2_REMAINS_VALID_HISTORICAL_CONTRACT = YES
V2_TO_V3_MIGRATION = EXPLICIT_DETERMINISTIC_OPERATION
```

The existing source kind remains suitable. The semantic break is expressed through `schemaVersion = 3`, not by pretending version-2 bytes acquired new meanings.

The expected persisted compatibility filename is:

```text
venue-source-v3.json
```

`venue` in implementation filenames/paths remains accepted compatibility vocabulary. Product-facing meaning is the broader **host** concept established by the Hive-native host product contract.

```text
HOST = PRODUCT_CONCEPT
VENUE = ACCEPTED_IMPLEMENTATION_COMPATIBILITY_VOCABULARY
```

No repository-wide rename is required by this contract.

---

## 2. Why v2 cannot truthfully be stretched in place

The current executable v2 source is strict and already accepted.

Its relevant properties include:

- `schemaVersion = 2` is a literal parser requirement;
- persisted source is explicitly handled as `venue-source-v2.json`;
- the root `venue.business` object requires physical address, phone, hours, website URL and map URL;
- `resources.events[]` is a specifically shaped event collection;
- v2 events contain stable `id` and `slug`, start/end timestamps, `scheduled|full|cancelled`, description, optional managed-media id, access note and external action;
- `event-list` is a specific component kind whose `resourceIds` point into `resources.events`;
- the renderer derives event details from those event resources;
- the default event leaf path is `/events/<slug>`;
- event structured data assumes the host is a physical `Place` and uses `venue.business.address`;
- v2 source-file parsing, digesting and atomic persistence run through the v2 validator.

The accepted next-generation contracts now require:

- first-class non-physical hosts;
- activities that may be physical, online, hybrid or locationless;
- occurrence, release and window temporal forms;
- a domain lifecycle distinct from access/capacity state;
- optional durable Hive social roots;
- optional external media, syndication, value, commerce and discovery bindings;
- durable activity identity independent of those bindings.

Those are semantic changes, not harmless optional display fields.

Therefore:

```text
ADD_NEW_MEANING_TO_SCHEMA_VERSION_2 = REJECTED
EXPLICIT_SCHEMA_VERSION_3 = ACCEPTED
```

---

## 3. Version-dispatch contract

A future implementation must distinguish source versions before parsing version-specific semantics.

Conceptually:

```text
READ_JSON_ENVELOPE
    |
    +-- schemaVersion == 2 --> exact existing v2 parser
    |
    +-- schemaVersion == 3 --> exact v3 parser
    |
    +-- otherwise ----------> FAIL_CLOSED
```

The v2 parser must not be weakened to accept v3-only fields.

The v3 parser must not silently accept version-2 bytes as though they were native v3.

Migration is an explicit transformation:

```text
VALID_V2_SOURCE
    -> MIGRATE_V2_TO_V3
    -> VALIDATE_COMPLETE_V3_SOURCE
    -> CANONICAL_SERIALIZE
    -> DIGEST
    -> OPTIONAL_SEPARATELY_AUTHORIZED_PERSISTENCE
```

This contract authorizes none of those implementation steps.

---

## 4. v3 source envelope

The v3 envelope retains the mature PM2 architecture rather than replacing it.

Conceptually:

```text
source
  kind
  schemaVersion = 3
  provenance
  venue                  # compatibility name; semantically the host
  media
  resources
    activities
    programs
    menus
    equipment
  activityBindings
    hiveSocial
    providerMedia
    syndication
    value
    commerce
    discovery
  site
  capabilities
```

The exact executable property syntax will be implemented later, but the ownership boundaries in this document are binding.

### Preserved architectural family

The following remain accepted:

```text
ONE_CANONICAL_SEMANTIC_SOURCE
STABLE_IDENTITY_NOT_ARRAY_POSITION
TYPED_COMPONENTS
TYPED_RESOURCES
MANAGED_MEDIA
CURATED_DESIGN_RECIPES
ONE_RESPONSIVE_SOURCE
REAL_RENDERER_PREVIEW
TYPED_AUTHORING_COMMANDS
VALIDATED_PERSISTENCE
```

Version 3 is an evolution of that architecture, not a greenfield replacement.

---

## 5. Host compatibility envelope

### 5.1 Stable host identity survives migration

For a v2→v3 migration:

```text
v2 venue.id          -> v3 venue.id          EXACT
v2 venue.displayName -> v3 venue.displayName EXACT
v2 venue.language    -> v3 venue.language    EXACT
```

The stable host/domain identity does not change merely because the product vocabulary has broadened from physical venue to host.

### 5.2 Physical business facts become conditional in v3

Version 2 requires a complete physical-business object.

Version 3 must allow:

```text
venue.business = COMPLETE_PHYSICAL_BUSINESS_FACTS
OR
venue.business = NULL / ABSENT_BY_SCHEMA
```

A native v3 creator, streamer, band, comedian, podcaster or other locationless host must not fabricate:

- a street address;
- public hours;
- a map URL;
- a merchant role;
- a payment recipient;
- a storefront.

### 5.3 Migrated v2 business facts are preserved exactly

Every valid v2 source necessarily has its accepted physical-business facts. Migration preserves them without reinterpretation.

No migration-time web lookup, geocoding, provider read or normalization is permitted.

### 5.4 Conditional component validity

A v3 source with no physical-business facts must not use a component whose renderer semantics require missing physical facts unless that component itself is redesigned under a separately governed semantic contract.

In particular, legacy physical visit/location projections cannot silently manufacture placeholder information for a locationless host.

### 5.5 Canonical web origin is not physical-business authority

The v3 renderer must not require a physical-business website URL merely to construct canonical activity URLs for a creator host.

Canonical deployment origin remains a renderer/deployment concern. Physical-business `websiteUrl`, when present, remains a domain fact rather than a universal routing prerequisite.

---

## 6. Provider-neutral activity collection

Version 3 replaces the narrow canonical `resources.events[]` collection with a generalized:

```text
resources.activities[]
```

An activity remains a stable source resource, not a renderer page or provider object.

Every activity must support these semantic domains:

```text
IDENTITY
HUMAN_MEANING
TEMPORAL_FORM
DOMAIN_LIFECYCLE
PRESENCE
ACCESS
SOURCE_MANAGED_MEDIA_REFERENCES
PUBLIC_ACTIONS
OPTIONAL_SERIES_RELATIONSHIP
```

External social/media/value/commerce/discovery identity belongs in the separate binding seam defined later in this document.

---

## 7. Activity identity

Every activity has one stable source-owned id.

```text
activity.id = ACTIVITY_ID
```

The id:

- is stable across ordinary edits;
- is stable across reschedule/postpone/cancel/complete transitions;
- is stable across provider replacement;
- is stable across adding/removing a replay;
- is stable across socialization;
- is stable across route-label changes;
- does not derive from title, date, slug, author/permlink, CID, ticket URL or array position.

### v2 migration identity rule

```text
v2 event.id -> v3 activity.id EXACT
```

No prefixing, renumbering or regenerated UUID is permitted merely because the resource kind changes from event to activity.

This preserves the accepted semantic identity represented by existing event ids and prevents downstream authoring/history references from being needlessly severed.

### Resource-kind namespace

Existing resource ids are unique within their typed collections, not necessarily across every resource kind.

Version 3 therefore continues typed stable identity:

```text
resource:activity:<id>
resource:program:<id>
resource:menu:<id>
resource:equipment:<id>
```

An activity id equal to a program id is not itself a collision because resource kind remains part of typed selection identity.

---

## 8. Activity public slug and route identity

A public slug is not activity identity.

```text
activity.id != activity.slug
```

Version 3 retains a validated stable public slug for addressable activity detail experiences.

### v2 migration slug rule

```text
v2 event.slug -> v3 activity.slug EXACT
```

Migration must fail closed if the resulting v3 activity slug set violates v3 uniqueness rules.

### Canonical v3 route family

The generalized renderer family uses:

```text
/activities/<slug>
```

as the default next-generation activity leaf namespace.

### Legacy route compatibility

Every migrated v2 event must remain reachable through its accepted effective route:

```text
/events/<same-slug>
```

The implementation may satisfy this through a compatibility resolver/redirect/alias, but it may not turn an existing accepted public URL into an unexplained 404 merely because the internal resource kind changed.

The initial migration must retain a deterministic compatibility map:

```text
legacy /events/<slug> -> activity.id
```

Route compatibility is subordinate to stable activity identity.

### Canonical metadata transition

A later implementation/release decision may choose whether migrated pages advertise `/events/...` or `/activities/...` as canonical metadata during a transition. That SEO/release decision is not needed to establish activity identity and is not authorized here.

---

## 9. Temporal model

Version 3 must represent the temporal distinctions already accepted by the activity contract.

Conceptually, the source uses a discriminated form equivalent to:

```text
OCCURRENCE
  startAt
  endAt? / endAt where required by supported subtype

RELEASE
  releaseAt

WINDOW
  startAt
  endAt
```

The exact executable field names may follow this conceptual structure, but an implementation may not force every release into a fake concert-like start/end pair.

### v2 migration

Every v2 event is already represented as start/end.

Therefore:

```text
v2 event.startAt -> activity.temporal.kind = OCCURRENCE
                  -> activity.temporal.startAt = EXACT INPUT

v2 event.endAt   -> activity.temporal.endAt = EXACT INPUT
```

No timezone conversion, wall-clock inference or date normalization beyond accepted canonical serialization is allowed during migration.

### No wall-clock lifecycle inference

Migration output must not depend on the time at which the migration happens.

A v2 event whose timestamp is in the past does not become `COMPLETED` merely because the migration command happened later.

```text
MIGRATION_RESULT = PURE_FUNCTION_OF_CANONICAL_INPUT
CURRENT_CLOCK = NOT_AN_INPUT
```

---

## 10. Domain lifecycle versus access/capacity

Version 2 overloaded `event.state` with both lifecycle and capacity semantics:

```text
scheduled
full
cancelled
```

Version 3 separates them.

Minimum domain lifecycle vocabulary:

```text
DRAFT
SCHEDULED
LIVE
COMPLETED
POSTPONED
CANCELLED
```

Access/capacity is a separate semantic domain.

### Deterministic v2 state map

```text
v2 scheduled
    -> lifecycle = SCHEDULED
    -> capacity/access fullness = UNSPECIFIED

v2 cancelled
    -> lifecycle = CANCELLED
    -> capacity/access fullness = UNSPECIFIED

v2 full
    -> lifecycle = SCHEDULED
    -> capacity/access fullness = FULL
```

This is intentionally asymmetric.

`full` is not converted into `COMPLETED`, `CANCELLED`, `SOLD_OUT`, or any financial/ticket-provider state that v2 never asserted.

No `LIVE`, `COMPLETED` or `POSTPONED` state is inferred for migrated v2 events.

---

## 11. Presence / destination model

Version 3 must support:

```text
PHYSICAL
ONLINE
HYBRID
NONE
```

Presence expresses where/how a participant encounters the activity. It does not determine activity identity.

### 11.1 Physical

May reference the host's default physical-business location and optionally later-approved activity-specific place/room facts.

### 11.2 Online

May contain one or more explicit source-owned public destination/action references. A media provider observation does not silently become domain presence authority.

### 11.3 Hybrid

May combine a physical location with online destination semantics.

### 11.4 None

Valid for a release/premiere or another activity for which attendance location is not applicable.

### v2 migration rule

The accepted v2 renderer projects every v2 event as occurring at the physical venue and emits `Place` structured data from the v2 venue business address.

Therefore the truthful deterministic migration is:

```text
v2 event
  -> activity.presence = PHYSICAL_HOST_DEFAULT
```

The migration references the already-migrated v2 physical-business facts rather than duplicating or inventing a second address.

It must **not** inspect `externalAction.href` and guess that an old event was online merely because the URL happens to look like a stream link.

Richer online/hybrid/none semantics are native-v3 authoring capabilities, not retroactive historical inference.

---

## 12. Description and human meaning

Migration preserves ordinary source meaning exactly where the fields are equivalent:

```text
v2 event.title       -> activity.title       EXACT
v2 event.description -> activity.description EXACT
v2 event.accessNote  -> activity.access.note EXACT / null-preserving
```

No content is scraped from Hive posts, provider pages, ticket pages, media metadata or public websites to enrich migration.

No title is rewritten to host-native vocabulary during migration.

---

## 13. Source-managed media continuity

Current v2 `event.mediaAssetId` points into the canonical managed-media collection.

That is already source-owned media identity and must remain distinct from external provider media.

Migration therefore maps:

```text
v2 event.mediaAssetId
    -> v3 activity source-managed media reference
    -> semantic role = PROMO / PRIMARY_VISUAL_COMPATIBILITY
```

The referenced managed-media asset id remains unchanged.

If the v2 reference is null, migration does not create a placeholder.

If the input is valid v2, the asset cross-reference has already passed v2 validation; v3 must validate it again against the migrated media set before acceptance.

### Not an SPK/3Speak inference

A managed media URL that happens to point at a provider does not become a provider binding merely because its hostname is recognizable.

```text
MANAGED_MEDIA_REFERENCE != PROVIDER_MEDIA_BINDING
```

Provider-native media identity requires separately established provider semantics.

---

## 14. Existing external action continuity

Version 2 allows an event `externalAction` with a label and HTTPS URL.

Version 3 generalizes public activity actions without inferring provider consequence.

Migration maps an existing action to one deterministic provider-neutral external action, preserving:

- label exactly;
- URL exactly;
- association with the same activity.

A deterministic source-owned action id may be derived from the stable activity id under the v3 implementation contract, for example through a fixed migration convention. The implementation must not use array position as action identity.

### Semantic non-inference

Migration must not guess that the action is:

- a ticket purchase;
- a reservation;
- a stream;
- a payment;
- a V4V invoice;
- a Distriator claim;
- a checkout;
- a subscription.

Its migrated semantic role remains equivalent to legacy external action until an operator or later typed migration has evidence for a more specific role.

```text
URL_SHAPE != CONSEQUENCE_SEMANTICS
```

---

## 15. Programs / series boundary

Current v2 `programs[]` and next-generation activities remain distinct resource kinds.

The migration must not collapse every v2 program into an activity or every event into a program.

Why:

- current program resources already have their own accepted identity and authoring semantics;
- timestamps alone do not prove that a program is a recurring-series root;
- the activity contract permits but does not require a series/program relationship;
- speculative grouping would invent domain meaning.

### v3 relationship seam

An activity may carry an optional typed relationship equivalent to:

```text
seriesRef = null
OR
seriesRef = { kind: program, id: <stable-program-id> }
```

This allows a future explicitly authored recurring-program relationship while reusing stable program identity.

### Migration default

```text
EVERY_MIGRATED_V2_EVENT.seriesRef = null
```

unless a future separately authorized migration has an explicit canonical v2 relationship to consume. Current v2 does not provide one.

Existing v2 `programs[]` migrate as programs, preserving stable ids and existing fields under the smallest compatible v3 representation.

---

## 16. Activity binding seam

Domain activity facts and external system identities remain separate.

Version 3 therefore has a separate typed activity-binding seam rather than embedding provider ids into activity identity.

Conceptual families:

```text
activityBindings.hiveSocial
activityBindings.providerMedia
activityBindings.syndication
activityBindings.value
activityBindings.commerce
activityBindings.discovery
```

Every binding references a stable `activityId`.

No binding record may redefine that activity id.

### Required cross-reference invariant

```text
FOR_EACH_ACTIVITY_BINDING:
  referenced activityId MUST EXIST
```

Unknown/orphaned activity references fail closed.

### Provider-neutral extensibility

Provider-specific details belong behind family-specific schemas/adapters. The source seam stores only durable identity/configuration necessary to associate a canonical external object with an activity.

It is not a generic arbitrary-JSON extension bag.

---

## 17. Hive social binding source boundary

A confirmed Hive social binding may eventually store canonical content identity such as:

```text
activityId
author
permlink
semantic role(s)
primary-root designation
```

The cross-validator must enforce:

```text
SOCIALIZED_ACTIVITY_PRIMARY_ROOT_COUNT = EXACTLY_ONE
```

when an activity is intentionally socialized.

### What source does not own

The canonical source does not own live Hive truth such as:

- current votes;
- rewards;
- reply counts;
- current post availability;
- community subscription state;
- account authority state.

Those remain Hive-owned read state.

### Planned/ambiguous publication state

The accepted activity contract requires durable publication intent before broadcast and reconcile-before-retry behavior.

That operation journal is a **separate later contract**. It must not be confused with domain activity identity or fabricated during v2 migration.

---

## 18. External media binding source boundary

A future provider-media binding may associate an activity with a durable provider object and role such as:

```text
PROMO
LIVE
REPLAY
CLIP
CATALOG
```

The provider object may include SPK/3Speak identity under a separately qualified adapter.

The source stores the durable binding necessary for composition. Live provider health/encoding progress remains provider/runtime observation unless a later contract explicitly promotes a durable fact.

Provider replacement does not change activity id.

---

## 19. Syndication/value/commerce/discovery boundaries

Version 3 must have typed places for these relationships without making them universal.

### Syndication

Examples may later include RSS/Podcasting 2.0 item identity and Podping-related references.

Signals never become activity lifecycle authority.

### Value

Examples may later include source configuration for vote-based support or a provider/value endpoint.

A transient invoice/payment result is not activity identity and is not invented by migration.

### Commerce

Examples may later include ticket/reservation providers or Distriator-related discovery/claim surfaces.

A URL does not prove settlement.

### Discovery

Examples may later include WorldMapPin or other discovery references.

A physical discovery index does not become canonical activity location authority.

### Migration default

All external binding families for migrated v2 events start empty.

```text
hiveSocial     = []
providerMedia  = []
syndication    = []
value          = []
commerce       = []
discovery      = []
```

This is absence of known canonical binding, not evidence that no external object exists in the world.

---

## 20. No fabricated external state rule

The migration may use only canonical input bytes plus fixed migration rules.

It must not perform or infer from:

- Hive RPC;
- Hive account history;
- post search;
- Keychain or other signer state;
- SPK/3Speak lookup;
- URL HEAD/GET requests;
- DNS;
- ticket-provider APIs;
- V4V/Lightning state;
- Distriator/SpendHBD state;
- Podping/feed lookup;
- WorldMapPin lookup;
- payment history;
- local browser caches;
- current clock time;
- operator memory.

```text
MIGRATION_NETWORK_ACCESS = FORBIDDEN
MIGRATION_EXTERNAL_SIDE_EFFECT = FORBIDDEN
```

A later reconciliation/onboarding workflow may establish bindings separately.

---

## 21. Component migration

Current v2 `event-list` components project `resources.events`.

Version 3's canonical generalized component family is:

```text
activity-list
```

### Deterministic component mapping

For every v2 `event-list` component:

```text
component.id                 -> EXACT SAME ID
component.kind               -> activity-list
component.recipeId           -> SAME RECIPE ID where admitted by v3 registry
component.content.resourceIds -> EXACT SAME ORDERED IDS
component responsive state   -> EXACT PRESERVATION
```

Those resource ids now resolve into `resources.activities` after the event→activity migration.

### Recipe compatibility

Accepted visual recipe ids used by event lists should be admitted for `activity-list` when their layout semantics remain valid.

Migration should not change visual composition merely to rename the resource family.

If a particular recipe cannot truthfully support `activity-list`, migration must use one explicit deterministic replacement documented in the implementation contract or fail closed. Silent arbitrary fallback is forbidden.

### No compatibility fork

A migrated physical show and a native creator livestream must use the same generalized renderer/component family.

```text
NO_EVENT_ONLY_RENDERER_FORK
NO_STREAMER_RENDERER_FORK
```

Host-native labels remain content/registry presentation, not source forks.

---

## 22. Derived detail rendering

Version 3 keeps the PM2 principle that an activity detail experience is derived from the stable resource.

```text
ACTIVITY_RESOURCE
    -> DERIVED_ACTIVITY_DETAIL
```

The detail experience is not a second hand-authored page authority.

A v3 activity detail may compose, where available:

- current canonical source facts;
- source-managed media;
- activity actions;
- social-root projection;
- provider media/replay projection;
- optional value/commerce/discovery surfaces.

Unavailable optional binding families degrade locally without corrupting the route or source facts.

---

## 23. Structured-data compatibility

Migrated v2 events retain the semantics that made `schema.org/Event` appropriate under the accepted v2 renderer.

Version 3 must not force every native activity into `Event` structured data merely because old physical shows used it.

A release, media premiere or other activity may require a different structured-data type or none until separately qualified.

### Physical migrated event

Its migrated physical-host-default presence permits Event structured data to continue using the preserved host physical facts.

### Non-physical native activity

Absence of `venue.business` must not cause invented `Place` data.

```text
NO_FAKE_STRUCTURED_DATA_FOR_SCHEMA_CONVENIENCE
```

---

## 24. Navigation and route collision rules

Version 3 preserves existing stable page/navigation identity.

Migrating events to activities does not renumber pages, components or navigation entries.

Activity slugs must be unique within the activity route namespace.

The implementation must also reject any configured route alias that collides with:

- another activity alias;
- a reserved capability route;
- an explicit page route where router precedence would become ambiguous.

Migration does not resolve ambiguity by guessing or appending random suffixes.

```text
AMBIGUOUS_ROUTE_MIGRATION = FAIL_CLOSED
```

---

## 25. Provenance contract

A migrated v3 source must identify that it came from v2.

Conceptually, provenance must be capable of recording:

```text
origin = v2-migration
sourceSchemaVersion = 2
sourceDigest = exact canonical v2 source digest
migrationContractVersion = 0.1.0 / implementation-specific frozen id
```

A native v3 source instead records its native origin according to the v3 implementation contract.

### Deterministic source output

Wall-clock migration time must not be injected into canonical source bytes if it would make identical v2 input produce different v3 source output.

Operational receipts may record execution time outside the canonical source digest.

---

## 26. Deterministic migration receipt

A future migration command should produce a separately auditable receipt containing at least:

```text
input source path / selected source identity
input schema version
input canonical digest
migration implementation/version identity
output schema version
output canonical digest
validation result
persisted/not-persisted result
```

If execution time is recorded, it belongs to the receipt rather than semantic source output.

The receipt is evidence, not a second mutable source authority.

---

## 27. Persistence contract

The accepted v2 stale-write and atomic-save discipline remains mandatory.

A future v3 source-file implementation must preserve equivalent guarantees:

1. validate the complete source before serialization;
2. canonical-serialize deterministically;
3. enforce bounded source-file size;
4. inspect expected persisted digest before save;
5. write through a unique temporary regular file;
6. perform a closing stale-digest gate before replacement;
7. atomically rename only after all gates pass;
8. fail closed on symlink/invalid file conditions;
9. leave no successful-looking state after failure.

Migration itself does not weaken those rules.

### Separate migration and persistence

A safe implementation should be able to compute and validate the proposed v3 migration in memory before any file replacement.

```text
MIGRATION_TRANSFORM
!=
PERSISTENCE_AUTHORIZATION
```

---

## 28. v2 source preservation and rollback

An automatic reverse v3→v2 migration is **not** promised.

Once a v3 source uses semantics unavailable in v2—such as online presence, release temporal form, Hive social binding, provider media binding or generalized lifecycle—the representation is not losslessly expressible as v2.

Therefore:

```text
AUTOMATIC_V3_TO_V2_DOWNGRADE = UNSUPPORTED
```

Rollback during a separately authorized transition uses preserved exact v2 source/deployment provenance, not lossy reconstruction from v3.

The v2 source remains historical evidence and may remain the active production authority until a separately qualified production transition occurs.

### One active mutable authority

After a workspace is intentionally promoted to v3, the system must not allow v2 and v3 copies to be edited independently as co-equal canonical source.

```text
ONE_WORKSPACE = ONE_ACTIVE_CANONICAL_SOURCE_VERSION
```

---

## 29. Complete v2 event → v3 activity field map

The controlling migration map is:

| v2 field / meaning | v3 result | Rule |
|---|---|---|
| `event.id` | `activity.id` | exact preservation |
| `event.slug` | `activity.slug` | exact preservation |
| `event.title` | `activity.title` | exact preservation |
| `event.startAt` | occurrence start | exact timestamp |
| `event.endAt` | occurrence end | exact timestamp |
| `event.state=scheduled` | lifecycle scheduled | no access inference |
| `event.state=cancelled` | lifecycle cancelled | identity retained |
| `event.state=full` | lifecycle scheduled + capacity full | separate lifecycle/access domains |
| `event.description` | activity description | exact preservation |
| `event.mediaAssetId` | source-managed promo/primary visual ref | same asset id; null preserved |
| `event.accessNote` | access note | exact/null preservation |
| `event.externalAction.label` | external action label | exact preservation |
| `event.externalAction.href` | external action URL | exact preservation |
| implicit v2 venue place | physical host-default presence | preserves accepted renderer meaning |
| no v2 series relation | `seriesRef=null` | no inference |
| no v2 activity social binding | no binding | no inference |
| no v2 provider-media binding | no binding | no inference |
| no v2 syndication binding | no binding | no inference |
| no v2 value/commerce binding | no binding | no inference |
| no v2 discovery binding | no binding | no inference |

This map is more authoritative than provider heuristics or current web state.

---

## 30. Resource and component cross-reference algorithm

A future deterministic migration must conceptually:

1. parse the input through the exact v2 parser;
2. record the canonical v2 digest;
3. copy unchanged semantic domains that are valid in v3;
4. migrate every v2 event to exactly one v3 activity using section 29;
5. preserve each event id as the resulting activity id;
6. rewrite every `event-list` component to `activity-list` while preserving component id and ordered `resourceIds`;
7. validate every migrated activity-list id resolves to an activity;
8. validate media references against migrated managed media;
9. preserve programs/menus/equipment under their explicit compatibility mappings;
10. initialize all external activity-binding collections empty;
11. validate v3 route/slug/cross-reference uniqueness;
12. validate complete v3 source;
13. canonical-serialize and digest the result;
14. return the proposal/receipt without external writes unless a separately authorized persistence step exists.

### Cardinality invariant

```text
COUNT(v3 activities) = COUNT(v2 events)
```

for the base migration defined here.

No v2 event is dropped because it is old, cancelled, full, lacking media, or lacking an external action.

---

## 31. Collision and ambiguity policy

Migration fails closed rather than inventing repairs for:

- duplicate event ids that somehow bypass the v2 validity gate;
- duplicate event slugs;
- invalid referenced media;
- unresolved event-list resource ids;
- route compatibility collisions introduced by surrounding routing configuration;
- invalid v3 cross references;
- unsupported source version;
- source bytes that do not pass exact v2 validation.

No automatic strategy may:

- append random id suffixes;
- change slugs opportunistically;
- drop duplicate items;
- merge activities by title/date similarity;
- infer series membership;
- query external systems to resolve ambiguity.

---

## 32. Existing typed-authoring machinery: reusable core

The next generation should preserve the strongest current implementation work rather than abandon it.

The following #199/PM3 machinery is architecturally reusable:

```text
STABLE_TYPED_SELECTION
SERVER_DERIVED_OWNERSHIP
PROPOSAL -> REAL_RENDERER_PREVIEW -> APPLY/DISCARD
STALE_DIGEST_REJECTION
NO_OP_REJECTION
COMPLETE_SOURCE_VALIDATION
EXACT_INVERSE_HISTORY
UNDO/REDO
EXPLICIT_SAVE
FRESH_PROCESS_REOPEN
RESOURCE_LIFECYCLE_PATTERN
RESOURCE_LIST_ORDER_PATTERN
SHARED_CONSUMER_UPDATE_PROOFS
MANAGED_MEDIA_DISCIPLINE
```

These are source-architecture mechanisms, not event-specific product assumptions.

### Stable-id preservation matters

Because migrated event ids survive as activity ids, accepted authoring concepts that resolve by stable resource id can evolve to `resource:activity:<id>` without manufacturing new domain identity.

---

## 33. Existing event-specific authoring: do not deepen it blindly

The following historical #199 obligations touch the now-superseded narrow event model and must be re-audited before implementation:

- event/show timestamp editing;
- event ticket/external-action specialization;
- show creation/removal/order UX;
- event-list recipe/catalog work;
- event-specific detail expectations;
- full live-music fresh-archetype journey.

Existing accepted v2 behavior remains valid compatibility behavior.

But new feature work should not deepen `resources.events[]` simply because the old queue contains an adjacent gap.

```text
MAINTAIN_ACCEPTED_V2 = YES
EXPAND_V2_EVENT_MODEL_AS_NEXT_GEN_PATH = NO
```

---

## 34. #199 families likely reusable after re-audit

The following remain plausibly relevant to both v2 compatibility and v3 product quality, but this contract does not authorize them:

- menu resource/section/item lifecycle and ordering;
- general managed media admission;
- semantic action editing;
- component recipe/catalog completion;
- responsive preview;
- exact persistence/reopen journeys;
- accessibility and keyboard alternatives;
- full fresh-operator journeys.

They must be reconsidered against the accepted host/activity doctrine before resuming.

A first-class non-physical creator/performer journey is mandatory in that re-audit.

---

## 35. No migration-time source broadening by convenience

The migration is not a chance to clean up every historical modeling choice.

It must not additionally:

- rename every `venue` implementation identifier to `host`;
- restructure menus;
- restructure equipment;
- rewrite design tokens;
- regenerate media ids;
- change page ids/slugs;
- change navigation labels;
- enable Hive Community capability;
- add official Hive accounts;
- enable Transaction capability;
- introduce new provider dependencies;
- rewrite copy;
- normalize operator vocabulary;
- adopt Astra source code.

Only changes required by the accepted v3 boundary and explicit deterministic migration belong in the base migration.

---

## 36. Source-valid unbound v3 state

Version 3 must preserve the distinction:

```text
SOURCE_VALID != HIVENUE_PRODUCT_QUALIFIED
```

A migrated or newly authored v3 source may be valid while:

- no activity is socialized;
- no provider media is bound;
- no payment/value surface exists;
- the host's Hive integration is incomplete;
- optional external services are unavailable.

This is required for:

- offline authoring;
- deterministic migration;
- synthetic fixtures;
- staged onboarding;
- safe recovery.

Full HiVenue product qualification remains governed by the host product contract and requires the meaningful Hive-native read/participation loop defined there.

---

## 37. Migration performs no qualification upgrade

A successful v2→v3 source migration means only:

```text
SOURCE_REPRESENTATION_UPGRADE = SUCCESS
```

It does **not** mean:

```text
HIVENUE_PRODUCT_QUALIFIED
HIVE_SOCIAL_ROOT_CONFIRMED
CREATOR_HOST_VALIDATED
PROVIDER_MEDIA_READY
PAYMENT_READY
PRODUCTION_READY
```

Those require their own evidence.

---

## 38. Physical reference adjudication

Consider a current v2 live-music venue.

Input event:

```text
id = friday-band
slug = friday-band
start/end = accepted ISO timestamps
state = full
mediaAssetId = show-poster
accessNote = Doors at 7
externalAction = { label: Tickets, href: https://... }
```

Migration result:

```text
activity.id = friday-band
activity.slug = friday-band
temporal = OCCURRENCE with exact start/end
lifecycle = SCHEDULED
capacity = FULL
presence = PHYSICAL_HOST_DEFAULT
description/access note = preserved
managed media = show-poster
external action = exact label/href, provider-neutral
seriesRef = null
external bindings = empty
legacy route /events/friday-band remains resolvable
```

No Hive post, ticket settlement, payment state or series membership is invented.

**Result: PASS.**

---

## 39. Locationless creator reference adjudication

A native v3 streamer may validly have:

```text
venue.business = null
activity.temporal = OCCURRENCE
activity.presence = ONLINE
activity.lifecycle = SCHEDULED
activity seriesRef = optional
```

The same canonical source/renderer family can later bind:

- one Hive primary social root;
- an SPK/3Speak live/replay object;
- a feed/syndication identity;
- optional support/value surfaces.

No fake street address or map URL is needed.

**Result: PASS.**

This is precisely why v2 cannot remain the next-generation schema version.

---

## 40. Release/premiere reference adjudication

A native v3 creator release may validly have:

```text
temporal = RELEASE
presence = NONE
lifecycle = SCHEDULED / COMPLETED as explicitly authored
```

It may later bind social/media/value relationships while keeping the same activity id after the release moment.

No fake end time or physical location is required.

**Result: PASS.**

---

## 41. Rejected alternative: mutate v2 in place

Rejected because it would:

- make accepted version-2 bytes change meaning without changing version;
- force the v2 parser/persistence contract to broaden silently;
- blur provenance;
- make old fixtures ambiguous;
- conflate compatibility maintenance with next-generation design.

```text
REJECT = SILENT_V2_SEMANTIC_EXPANSION
```

---

## 42. Rejected alternative: infer Hive social roots from old content

Rejected because v2 source does not encode the required canonical activity↔post relationship.

Searching Hive for similar title/date text would be heuristic and could bind the wrong post.

```text
REJECT = MIGRATION_BY_CONTENT_GUESSING
```

---

## 43. Rejected alternative: convert `externalAction` by URL heuristics

Rejected because identical URL forms can represent very different consequences.

Migration cannot safely decide whether a URL is tickets, RSVP, stream, payment, merchant checkout, information or something else merely from host/path patterns.

```text
REJECT = PROVIDER_SEMANTICS_FROM_URL_SHAPE
```

---

## 44. Rejected alternative: map all programs to series automatically

Rejected because current v2 program semantics do not prove grouping intent for event/activity occurrences.

```text
REJECT = PROGRAM_EQUALS_SERIES_BY_ASSUMPTION
```

Version 3 provides an optional relation seam; migration leaves it unset.

---

## 45. Rejected alternative: create separate physical and creator source schemas

Rejected because it violates the accepted host contract.

```text
REJECT = VENUE_SCHEMA + STREAMER_SCHEMA + BAND_SCHEMA
ACCEPT = ONE_SEMANTIC_V3_SOURCE_WITH_CONDITIONAL_TRAITS
```

---

## 46. Rejected alternative: make provider binding the activity record

Rejected because it would surrender domain identity to external infrastructure.

```text
ACTIVITY != HIVE_POST
ACTIVITY != VIDEO
ACTIVITY != STREAM
ACTIVITY != TICKET_OBJECT
ACTIVITY != INVOICE
```

Bindings remain typed references around a source-owned activity.

---

## 47. Implementation prerequisites after this contract

This document still authorizes no implementation.

Before the first source-code slice, the implementation operation must bind:

1. exact canonical base;
2. exact v3 source module/file boundary;
3. exact v2 parser left unchanged;
4. exact v3 parser and cross-reference rules;
5. exact migration function signature;
6. deterministic migration fixtures;
7. stable-id preservation tests;
8. state/fullness mapping tests;
9. physical-host-default presence mapping tests;
10. zero-binding fabrication tests;
11. event-list→activity-list mapping tests;
12. legacy `/events/<slug>` compatibility tests;
13. pure/no-network migration test seam;
14. source serialization/digest determinism;
15. stale-save/atomic persistence rules if persistence is in scope;
16. explicit production/Hive/provider non-effect boundary.

---

## 48. Smallest first implementation slice implied by this contract

If separately authorized after the required #199 re-audit/routing decision, the smallest useful provider-neutral source slice is:

```text
V3_SOURCE_PARSER
+
V2_TO_V3_PURE_MIGRATOR
+
ACTIVITY_RESOURCE
+
ACTIVITY_LIST / ACTIVITY_DETAIL READ PROJECTION
+
LEGACY_EVENT_ROUTE_COMPATIBILITY
+
NO_EXTERNAL_BINDING_WRITES
```

It should prove:

- stable identity;
- deterministic migration;
- one physical migrated reference;
- one native locationless creator reference;
- one native release/premiere reference;
- renderer generality;
- no external effects.

It should **not** simultaneously implement Hive publication, SPK upload, payment, Podping or production transition.

---

## 49. #199 routing consequence

Issue #199 remains open.

Its historical queue must not resume mechanically from the last v2-adjacent task.

The next bounded operation after canonical acceptance of this contract is:

```text
PM4_OPERATOR_GAP_REAUDIT_AGAINST_NEXT_GEN_V3
```

That re-audit must classify each remaining #199 obligation as:

```text
REUSE_UNCHANGED
REEXPRESS_FOR_V3
DEFER_UNTIL_AFTER_FIRST_V3_SLICE
SUPERSEDED
STILL_V2_COMPATIBILITY_ONLY
```

Only after that classification should implementation sequencing resume.

This preserves completed PM3/#199 machinery while preventing sunk-cost continuation of obsolete event-specific assumptions.

---

## 50. Acceptance adjudication

```text
NEXT_GEN_ACTIVITY_SOURCE_AND_MIGRATION_CONTRACT = COMPLETE_CANDIDATE

NEXT_GENERATION_SCHEMA_VERSION = 3
SOURCE_KIND_CHANGED = NO
V2_REINTERPRETED_IN_PLACE = NO
V2_REMAINS_VALID = YES
V3_PERSISTED_COMPATIBILITY_FILENAME = venue-source-v3.json
PRODUCT_CONCEPT = HOST
IMPLEMENTATION_COMPATIBILITY_VOCABULARY_VENUE_ALLOWED = YES
PHYSICAL_BUSINESS_UNIVERSAL_IN_V3 = NO
V2_HOST_ID_PRESERVED = YES
V2_EVENT_ID_TO_ACTIVITY_ID = EXACT
V2_EVENT_SLUG_PRESERVED = YES
V2_EVENT_TEMPORAL_FORM = OCCURRENCE
V2_EVENT_PRESENCE = PHYSICAL_HOST_DEFAULT
V2_FULL_IS_LIFECYCLE_STATE = NO
V2_FULL_MAP = SCHEDULED_PLUS_CAPACITY_FULL
WALL_CLOCK_MIGRATION_INFERENCE = FORBIDDEN
PROGRAM_TO_SERIES_AUTO_INFERENCE = FORBIDDEN
HIVE_SOCIAL_ROOT_FABRICATION = FORBIDDEN
PROVIDER_BINDING_FABRICATION = FORBIDDEN
PAYMENT_SETTLEMENT_FABRICATION = FORBIDDEN
LEGACY_EVENT_ROUTE_COMPATIBILITY = REQUIRED
EVENT_LIST_TO_ACTIVITY_LIST = DETERMINISTIC
MANAGED_MEDIA_IDENTITY_PRESERVED = YES
EXTERNAL_ACTION_PROVIDER_INFERENCE = FORBIDDEN
V2_TO_V3_NETWORK_ACCESS = FORBIDDEN
V3_TO_V2_AUTOMATIC_DOWNGRADE = UNSUPPORTED
ONE_ACTIVE_MUTABLE_SOURCE_VERSION_PER_WORKSPACE = REQUIRED
TYPED_AUTHORING_CORE_REUSABLE = YES
HISTORICAL_199_QUEUE_RESUME_MECHANICALLY = NO
NEXT_OPERATION = PM4_OPERATOR_GAP_REAUDIT_AGAINST_NEXT_GEN_V3

SCHEMA_IMPLEMENTATION = NOT_AUTHORIZED
MIGRATION_EXECUTION = NOT_AUTHORIZED
LIVE_HIVE_EFFECT = NONE
EXTERNAL_PROVIDER_MUTATION = NONE
PRODUCTION_TRANSITION = WITHHELD
```

---

## 51. Hard stop

Acceptance of this document means the next-generation source/migration boundary is sufficiently frozen to govern later work.

It does **not** mean schema version 3 exists in executable code.

It does **not** mean any workspace has been migrated.

It does **not** mean any Hive/provider binding has been created.

It does **not** mean production has moved from v1/v2 machinery.

```text
DOCUMENTED_ARCHITECTURE != IMPLEMENTED_ARCHITECTURE
VALID_MIGRATION_CONTRACT != EXECUTED_MIGRATION
NEXT_GEN_DIRECTION != PRODUCTION_TRANSITION
```
