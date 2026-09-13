# HiVenues Host Activity and Durable Hive Social-Object Contract 0.1.0

## Status and authority

```text
OPERATION = HOST_ACTIVITY_SOCIAL_OBJECT_CONTRACT
TRACKING_ISSUE = #213
CLASS = PRODUCT_ARCHITECTURE_AND_QUALIFICATION_CONTRACT_ONLY
CANONICAL_BASE_COMMIT = 41f0316450296dd3e185ea5cec3d4f33818010eb
CANONICAL_BASE_TREE = be35e521cae37974b8f09e456d1c8887a26729af
CANONICAL_BASE_CI = 768__PASS
IMPLEMENTATION_AUTHORIZATION = NO
SCHEMA_MUTATION = NO
DEPENDENCY_INSTALLATION = NO
PRODUCTION_MUTATION = NO
LIVE_HIVE_EFFECT = NO
EXTERNAL_PROVIDER_MUTATION = NO
ASTRA_CODE_PORT = NO
```

Controlling inputs:

- `docs/HIVE_NATIVE_HOST_PRODUCT_CONTRACT_0_1_0.md`;
- `docs/HIVENUES_ECOSYSTEM_CAPABILITY_INTAKE_0_1_0.md`;
- accepted PM2 semantic resource/event architecture;
- accepted user-controlled signing, least-privilege, accessibility, provenance, and deployment boundaries.

This contract answers one question:

> **What is a HiVenues activity, and how can it accumulate durable Hive social continuity and external capabilities without surrendering its stable domain identity or creating competing sources of truth?**

It does not implement the answer.

---

## 1. Executive decision

A HiVenues **activity** is a stable host-domain object representing a meaningful occurrence, live session, release, premiere, gathering, performance, launch, workshop, AMA, meetup, or comparable audience-facing unit of host activity.

The activity is **not**:

- a Hive post;
- a 3Speak video;
- an SPK CID;
- a Podping signal;
- a V4V invoice;
- a Distriator claim;
- a ticket URL;
- a calendar event file;
- a renderer page;
- a social feed card.

Those may bind to the activity.

The controlling identity rule is:

```text
ACTIVITY_ID = HIVENUES_DOMAIN_IDENTITY

HIVE_AUTHOR_PERMLINK = EXTERNAL_CANONICAL_CONTENT_IDENTITY
MEDIA_PROVIDER_OBJECT = EXTERNAL_MEDIA_BINDING
SYNDICATION_OBJECT = EXTERNAL_INTEROP_BINDING
VALUE_OR_COMMERCE_OBJECT = EXTERNAL_CONSEQUENCE_BINDING
DISCOVERY_OBJECT = EXTERNAL_DISCOVERY_BINDING

NONE_OF_THE_ABOVE = ACTIVITY_ID
```

An activity can therefore survive:

- a date/time change;
- a venue-room change;
- a stream-provider change;
- replacement of a broken video rendition;
- addition of a replay;
- a new ticket provider;
- optional V4V/Distriator/WorldMapPin integrations;
- the end of the live moment;
- later recap content;
- ordinary copy edits.

Its identity changes only when the operator is actually creating a different domain activity.

---

## 2. Why activity is a first-class domain object

The accepted PM2 architecture already established the right foundation: stable event resources are independent from the visual components that project them, and event detail pages are renderer-derived rather than hand-authored duplicates.

The next generation generalizes that principle beyond physical venue events.

```text
DOMAIN_ACTIVITY
    -> may be projected by multiple components
    -> may derive one stable activity detail route
    -> may bind one durable Hive social root
    -> may bind additional Hive content objects
    -> may bind media/live/replay objects
    -> may expose optional commerce/value/discovery surfaces
    -> remains one activity throughout
```

This prevents visual layout, social publishing, media hosting, and payment infrastructure from becoming accidental domain authorities.

---

## 3. Universal activity core

The exact future schema is not frozen here, but every implementation must be capable of representing the following semantic concepts without an archetype-specific source fork.

### 3.1 Identity

- stable `activityId`;
- owning `hostId`;
- stable public route/slug where the activity is publicly addressable;
- optional stable `seriesId` / program relationship;
- creation/provenance identity sufficient for deterministic authoring/history.

Identity never depends on array position, provider id, title, date, or URL.

### 3.2 Human meaning

- title/name;
- description/summary;
- host-native activity vocabulary;
- imagery/media references where appropriate;
- access notes and public status;
- optional participants/performers/collaborators where later source design supports them.

### 3.3 Time

The model must support at least:

```text
SCHEDULED_OCCURRENCE
RELEASE_MOMENT
OPEN_INTERVAL_OR_WINDOW
```

without pretending every activity has the same temporal shape.

Examples:

- a concert has start/end;
- a livestream has scheduled start and may acquire actual live/end observations;
- a song/video/special premiere may primarily have a release moment;
- a multi-day festival/workshop window may span an interval.

The exact future source syntax may use a discriminated temporal model. The semantic distinction is binding.

### 3.4 Presence / destination

The domain model must support:

```text
PHYSICAL
ONLINE
HYBRID
NO_LOCATION_APPLICABLE
```

A physical activity may have address/room/visit/access facts.

An online activity may have one or more approved destinations such as a stream or meeting URL.

A hybrid activity may have both.

A release may have no attendance location at all.

A street address is never required merely because historical source vocabulary says `venue`.

### 3.5 Public action surfaces

An activity may expose semantic actions such as:

- tickets;
- reservation/RSVP;
- watch/listen;
- join discussion;
- add to calendar;
- external information;
- support/pay where separately enabled;
- another later-approved bounded action.

An action is not authority to mutate the service it points to.

---

## 4. Activity classification: traits over archetype forks

The product should avoid one giant provider-shaped `type` enum and avoid separate schemas for bars, streamers, bands, and comedians.

Activity meaning should be expressed through bounded semantic traits and registries.

Examples of useful orthogonal dimensions include:

```text
TEMPORAL_FORM = occurrence | release | window
PRESENCE_MODE = physical | online | hybrid | none
LIVE_CAPABILITY = none | planned | available
MEDIA_CAPABILITY = none | promo | live | replay | catalog
ACCESS_MODE = open | ticketed | reserved | restricted | external
SOCIALIZATION = unbound | planned | bound
```

These are conceptual dimensions, not frozen property names.

A future semantic registry may still expose host-friendly nouns such as:

- Show;
- Livestream;
- Workshop;
- Meetup;
- Premiere;
- Release;
- AMA;
- Event.

Those nouns control authoring language, validation, and recipes. They must not create renderer forks or change the core identity/authority model.

---

## 5. Activity lifecycle

### 5.1 Domain status

The activity source owns the public domain lifecycle.

The minimum semantic states are:

```text
DRAFT
SCHEDULED
LIVE
COMPLETED
POSTPONED
CANCELLED
```

Exact implementation may use a compatible discriminated model, but it must preserve these meanings where applicable.

### `DRAFT`

The activity exists for authoring but is not yet presented as a scheduled public occurrence/release.

No Hive object is required.

### `SCHEDULED`

Canonical public timing/destination facts exist and the activity may be publicly rendered.

A Hive social object remains optional until the activity is intentionally socialized.

### `LIVE`

The host/domain source currently presents the activity as in progress.

Provider observations may inform this transition, but no external provider silently becomes the activity-state authority.

### `COMPLETED`

The live/occurrence/release moment has concluded. The stable activity route and social history may remain public indefinitely.

### `POSTPONED`

The activity is not cancelled, but the prior schedule is no longer authoritative and a replacement schedule may be unknown.

### `CANCELLED`

The activity will not occur as planned. Cancellation preserves the activity identity and historical/social record.

### 5.2 Archive is presentation/retention, not a replacement identity

An ended or cancelled activity may move into an archive experience, but it remains the same activity.

```text
COMPLETED_ACTIVITY + REPLAY + RECAP + DISCUSSION
=
ARCHIVED_EXPERIENCE_OF_THE_SAME_ACTIVITY
```

The product must not create a new activity merely to render a replay or recap.

---

## 6. Rescheduling and material fact changes

### Identity rule

```text
RESCHEDULE != NEW_ACTIVITY
POSTPONE != NEW_ACTIVITY
CANCEL != DELETE_ACTIVITY
TITLE_EDIT != NEW_ACTIVITY
LOCATION_EDIT != NEW_ACTIVITY
STREAM_PROVIDER_CHANGE != NEW_ACTIVITY
```

A new activity id is justified only when the operator is actually creating a different occurrence/domain object.

### Schedule history

A later implementation should preserve sufficient provenance to distinguish the current schedule from previously published schedule facts when a material change occurred.

The exact audit/history syntax is deferred, but ordinary overwrite-with-no-history is insufficient once the activity has been publicly socialized.

### Material-change classes

At minimum, these are socially material when a durable Hive social root already exists:

- cancellation;
- postponement;
- start date/time change;
- physical location change;
- online destination change where users would otherwise arrive at the wrong place;
- material access/ticket/age restriction change.

Changing these facts must not be blocked merely because Hive signing is unavailable. **Correct domain facts take priority over synchronization convenience.**

Instead, the product records that a social notice/update is required or recommended and exposes a separately signed workflow.

```text
CORRECT_SOURCE_FACTS_FIRST
+
EXPLICIT_SOCIAL_NOTICE_STATE
+
SEPARATELY_SIGNED_UPDATE
```

No chain outage is allowed to force the operator to leave wrong public event facts in HiVenues.

---

## 7. Programs / series versus activity occurrences

A recurring program or series is not the same object as one activity occurrence.

Examples:

```text
SERIES: Tuesday Night Stream
ACTIVITY: Tuesday Night Stream — 2026-09-15

SERIES: Friday Live Music
ACTIVITY: The Example Band — 2026-10-02

SERIES: Comedy Tour 2027
ACTIVITY: Las Vegas Show — 2027-02-04
```

### Contract

- series/program identity may group activities;
- changing the series does not change an existing activity id;
- each occurrence may have its own schedule, access, media, social root, and recap;
- an activity may exist without a series;
- series-level social/community objects are outside this contract and must not substitute for activity-level social identity when an activity is intentionally socialized.

This preserves PM2's useful distinction between stable reusable program resources and event occurrences while generalizing it for creators.

---

## 8. Socialization lifecycle

An activity and its Hive social object have separate lifecycles.

Conceptual socialization states:

```text
SOCIAL_UNBOUND
SOCIAL_ROOT_PLANNED
SOCIAL_ROOT_BOUND
SOCIAL_ROOT_DEGRADED
SOCIAL_ROOT_SUPERSEDED_BY_RECOVERY
```

These are product semantics, not frozen schema names.

### 8.1 `SOCIAL_UNBOUND`

The activity exists without a Hive discussion binding.

This is valid for:

- drafts;
- migrations;
- imported/external events;
- activities whose operator has not yet chosen to socialize them;
- offline/local authoring.

### 8.2 `SOCIAL_ROOT_PLANNED`

A specific publication intent, author, planned permlink/content identity, and operation id have been persisted before signing/broadcast.

No successful post may be implied yet.

### 8.3 `SOCIAL_ROOT_BOUND`

A real Hive content object has been observed and bound by canonical `author/permlink`.

### 8.4 `SOCIAL_ROOT_DEGRADED`

The binding is known, but current read health cannot confirm or render it safely.

This is external-service degradation, not loss of activity identity.

### 8.5 Recovery/supersession

Replacing a primary social root is exceptional.

A recovery may be needed if, for example, the original content is provably unusable for the intended product relationship. Such a change must:

- be explicit;
- preserve the old binding in provenance/history;
- record the reason;
- not occur through an ordinary activity edit;
- not silently strand existing conversation.

---

## 9. Durable primary Hive social root

### Executive decision

A **socialized activity has exactly one designated primary Hive social root**.

The primary social root is the durable conversation anchor for the activity.

It is identified by:

```text
HIVE_CONTENT_REF = author + permlink
```

and may additionally carry chain/community/parent context as required for correct rendering and audit.

### Important qualification distinction

```text
VALID_ACTIVITY != MUST_HAVE_HIVE_POST
PUBLIC_ACTIVITY != MUST_HAVE_HIVE_POST
SOCIALIZED_ACTIVITY = MUST_HAVE_ONE_PRIMARY_SOCIAL_ROOT
```

This preserves source-valid preconnection/draft/imported states while making “activity as social object” concrete when the host elects to socialize the activity.

### Primary-root stability

Once successfully bound:

```text
TITLE_EDIT != NEW_SOCIAL_ROOT
DATE_EDIT != NEW_SOCIAL_ROOT
LOCATION_EDIT != NEW_SOCIAL_ROOT
MEDIA_EDIT != NEW_SOCIAL_ROOT
STATUS_CHANGE != NEW_SOCIAL_ROOT
```

Hive post body/title edits, when desired, are separately signed Hive transactions against the **same** author/permlink.

---

## 10. Additional Hive social-object roles

One primary social root does not mean one Hive post forever.

An activity may bind additional Hive content objects with explicit semantic roles.

Initial role vocabulary should be bounded around meanings such as:

```text
ANNOUNCEMENT
PRIMARY_DISCUSSION
LIVE_THREAD
UPDATE
MEDIA_POST
RECAP
```

Exact future property names are deferred.

### Role composition

The same Hive object may serve more than one role.

For example:

```text
ANNOUNCEMENT + PRIMARY_DISCUSSION
```

may intentionally be the same `author/permlink`.

A second activity may instead use:

```text
PRIMARY_DISCUSSION = durable pre-event thread
LIVE_THREAD = separate high-volume live discussion
RECAP = post-event summary
```

### Cardinality principle

- exactly one primary social root for a socialized activity;
- zero or more secondary social bindings;
- secondary bindings never silently replace the primary root;
- duplicate role publication must be prevented or explicitly supported by later cardinality rules.

---

## 11. Source facts versus Hive post content

This is the central anti-drift rule.

### 11.1 HiVenues source owns domain facts

Examples:

- current activity title;
- canonical schedule;
- current location/destination;
- cancellation/postponement state;
- access note;
- ticket/reservation/watch URLs modeled as domain actions;
- current descriptive activity facts.

### 11.2 Hive owns Hive content

Examples:

- published post body/title;
- replies;
- votes;
- reward state;
- edit history observable through the chain/ecosystem;
- `author/permlink` identity.

### 11.3 Published prose is a snapshot/communication artifact

A Hive announcement may include activity details at publication time.

That copy does **not** become the canonical source from which HiVenues later reconstructs activity facts.

```text
DO_NOT_PARSE_HIVE_POST_BACK_INTO_ACTIVITY_SOURCE
DO_NOT_TREAT_PUBLISHED_SNAPSHOT_AS_CURRENT_SCHEDULE_AUTHORITY
```

The generated HiVenues activity page should render current canonical domain facts from source while presenting the real Hive discussion as a social layer.

### 11.4 Canonical-detail link

Where appropriate, the published social object should be capable of pointing users to the stable activity detail URL for current operational facts.

This is a product-quality rule, not permission to make the web page an opaque substitute for meaningful Hive content.

---

## 12. Editing after publication

Editing activity source after social publication is ordinary and expected.

The Studio must distinguish:

```text
EDIT_ACTIVITY_FACTS
EDIT_HIVE_POST
PUBLISH_HIVE_UPDATE
DO_NOT_NOTIFY_HIVE
```

as separate consequences.

### Domain edit

A domain edit participates in ordinary typed source validation/history/persistence and does not request a Hive signature.

### Edit Hive post

Editing a bound announcement/post is a separately reviewed Hive operation against its existing `author/permlink`.

### Publish update

A material change may be communicated through a new update/reply object while retaining the same primary social root.

### Do not notify

For immaterial copy changes, the operator may intentionally make no chain update.

The application must not silently choose among these actions.

---

## 13. Cancellation and postponement

Cancellation/postponement is where competing truth is most dangerous.

### Contract

1. The source status changes first and becomes immediately authoritative for the HiVenues-generated experience.
2. If a primary social root exists, the product derives a visible `SOCIAL_NOTICE_NEEDED`-equivalent condition.
3. The operator may separately publish or edit a Hive notice through the correct signer.
4. If Hive signing/broadcast fails, the HiVenues page remains correctly cancelled/postponed and the notice state remains unresolved.
5. No failed social notice may roll the domain source back to a false scheduled state.

This avoids unsafe distributed-transaction behavior.

---

## 14. Media binding contract

### Identity separation

```text
ACTIVITY_ID != MEDIA_ASSET_ID
ACTIVITY_ID != SPK_CID
ACTIVITY_ID != THREESPEAK_VIDEO_ID
ACTIVITY_ID != STREAM_URL
```

An activity may have zero or more semantic media bindings.

Useful media roles include:

```text
PROMO
LIVE
REPLAY
CLIP
AUDIO
GALLERY_OR_RECAP
```

Exact schema names are deferred.

### SPK / 3Speak posture

The ecosystem intake selected SPK/3Speak as the leading first-class media-provider candidate behind a HiVenues `MediaProvider` seam.

The activity contract therefore assumes that later implementation can bind:

- provider object id;
- external content address/CID where available;
- processing state;
- playback resolution;
- related Hive publication where applicable;

without making any of those values the activity identity.

### Provider replacement

If a replay moves providers:

- the activity id remains unchanged;
- the old provider binding may be retained as superseded provenance;
- the new binding becomes the preferred playback source through an explicit source change;
- the social root remains unchanged unless separately changed through exceptional recovery.

---

## 15. Live state and provider observations

A media provider may report that a stream is live or ended.

A Podping signal may report `live` or `liveEnd`.

Those are observations/signals, not the sole canonical activity-state authority.

```text
PROVIDER_LIVE_STATE = OBSERVATION
PODPING_SIGNAL = NOTIFICATION
ACTIVITY_STATUS = HIVENUES_DOMAIN_STATE
```

A later implementation may adopt safe reconciliation policy such as:

- suggest transition to LIVE when provider confirms live;
- automatically derive a read-only “stream currently available” presentation state;
- suggest completion when the provider ends;

but provider data may not silently rewrite canonical business facts without an accepted rule.

The renderer may show both:

- canonical activity status;
- real-time provider availability.

They are not required to be the same data field.

---

## 16. Replay and recap continuity

The event ending should deepen the object rather than destroy it.

Conceptual lifecycle:

```text
SCHEDULED ACTIVITY
    -> ANNOUNCEMENT / PRIMARY DISCUSSION
    -> LIVE PARTICIPATION
    -> COMPLETED ACTIVITY
    -> REPLAY BINDING
    -> RECAP CONTENT
    -> DURABLE ARCHIVE + CONTINUING CONVERSATION
```

A replay is attached to the same activity.

A recap post may be a secondary social binding.

Existing replies/votes/community memory remain attached to the primary root.

This is the core meaning of **“the room continues after the visit / show / stream.”**

---

## 17. RSS / Podcasting 2.0 and Podping

### RSS / Podcasting 2.0

For podcast, serialized creator media, or compatible live-feed cases, a feed URL and item GUID may be valid external syndication identities.

They do not replace `activityId`.

One activity may bind to a feed item where the activity corresponds to an episode/live item.

### Podping

A Podping write is an optional update-notification side effect.

```text
PODPING_UPDATE != ACTIVITY_EDIT
PODPING_LIVE != ACTIVITY_LIVE_TRANSITION
PODPING_LIVE_END != ACTIVITY_COMPLETION
```

If a Podping fails after a feed/activity update succeeds:

- the activity/feed remains authoritative;
- notification is marked failed/pending;
- retry may be offered under the correct Posting/service authority;
- no duplicate activity is created.

---

## 18. Calendar interoperability

Where timing exists, iCalendar/ICS export should derive from canonical activity facts.

The calendar representation is an interoperability projection.

```text
ICS_UID_OR_FILE != ACTIVITY_ID
```

A later implementation should use a stable mapping so calendar updates can represent reschedules rather than generating unrelated duplicates.

The exact UID/versioning rules are an implementation detail to freeze when calendar export becomes executable.

---

## 19. Value and support bindings

An activity may expose support/value actions.

These must preserve semantic distinctions.

### Vote-based support

A Hive vote/curation action is a social operation.

It is not a direct payment.

### Transfer/payment support

HBD/HIVE transfer, V4V Lightning bridge, or other payment action is a financial operation.

It is not a vote.

### Contract

```text
SOCIAL_SUPPORT != FINANCIAL_TRANSFER
```

The rendered host-native language may use words such as “Support,” but consequence review must make the actual operation unmistakable before signing.

### Identity

A V4V invoice, Lightning address, merchant account, or payment reference is an optional binding to the host/activity.

It never becomes `activityId` or the primary social root.

---

## 20. Commerce bindings

Activities may bind semantic commerce/access targets such as:

- ticket provider;
- reservation/RSVP provider;
- merchant checkout;
- Distriator/SpendHBD-related discovery/review/cashback handoff;
- approved external commerce URL.

### Contract

- external commerce state is not canonical activity identity;
- the activity source may own the configured relationship/action label/approved destination;
- provider truth such as ticket inventory, claim eligibility, or cashback state remains provider-owned;
- HiVenues must not fabricate provider success;
- a commerce outage must not erase the activity or social discussion.

Distriator remains optional physical-host interoperability, not a universal activity requirement.

---

## 21. Discovery bindings

WorldMapPin or another discovery service may index a physical activity/host.

Such a binding may improve:

- local event discovery;
- tour discovery;
- location-linked social content;
- review/story discovery.

It does not own location truth.

Canonical activity/host location remains a HiVenues domain fact where applicable.

---

## 22. Operation consequence classes

The ecosystem intake defined consequence tiers. This contract applies them to activity workflows.

### R — read-only

Examples:

- render activity facts;
- read primary Hive discussion;
- read provider playback status;
- read ticket/discovery/cashback metadata.

No signer.

### P — Posting/social

Examples:

- create primary social root;
- edit Hive announcement;
- publish update/recap;
- reply/vote/subscribe;
- Podping signal where service/user Posting authority applies.

Must use explicit Posting-capable authority path appropriate to the operation.

### F — financial

Examples:

- HBD/HIVE payment;
- V4V bridge/payment;
- financially consequential claim/transfer.

Must disclose exact asset/amount/destination/fee/conversion semantics as applicable and use correct authority.

### X — privileged infrastructure/programmatic

Examples:

- service signer activation;
- beneficiary/merchant policy change;
- production provider credential mutation;
- future smart-contract deployment.

Never an ordinary activity-edit side effect.

---

## 23. Signer abstraction

The ecosystem intake identified Aioha as a strong future signer-provider adapter candidate.

This contract does not select an executable dependency.

It does require the later social-object implementation to use a semantic signer boundary:

```text
HIVENUES_OPERATION_INTENT
    -> VALIDATION
    -> CONSEQUENCE REVIEW
    -> AUTHORITY REQUIREMENT
    -> SIGNER ADAPTER
    -> BROADCAST RESULT
    -> CANONICAL READ RECONCILIATION
```

The signer adapter must not decide:

- what activity action means;
- what operation fields to generate;
- whether the product permits the action;
- whether a financial action may be mislabeled as social support;
- whether a successful-looking local state may precede reconciliation.

Aioha or any alternative provider is transport/signing infrastructure, not product authority.

---

## 24. Idempotent social publication

Creating a primary social root is an irreversible external side effect once broadcast.

Blind retries are forbidden.

Before requesting signature/broadcast, HiVenues must persist enough durable intent to recover the operation, conceptually including:

- stable operation/intent id;
- `activityId`;
- intended social role;
- intended author;
- planned permlink/content identity;
- payload/content digest or equivalent immutable evidence;
- authority class;
- creation timestamp/state.

### Planned permlink rule

The planned content identity must be either:

- deterministically derived under a frozen collision-safe rule; or
- generated once and persisted before signing.

A retry may not silently generate a new permlink merely because the previous broadcast response was ambiguous.

### Ambiguous result

If broadcast outcome is unknown:

1. query canonical Hive state for the exact planned `author/permlink`;
2. if present and semantically matches the persisted intent, bind it;
3. if absent and failure is confirmed, allow an explicit retry of the same intent;
4. if state cannot be resolved, remain `RECONCILIATION_REQUIRED` rather than creating another post.

This prevents duplicate activity roots under network failure.

---

## 25. Cross-system partial success

HiVenues must not pretend that source persistence, Hive broadcast, media processing, Podping signaling, and payment-provider actions form one atomic transaction.

```text
NO_FAKE_CROSS_PROVIDER_ATOMICITY
```

Each side effect has its own journal/reconciliation state.

### Example A — Hive post succeeded, binding save failed

- do not repost;
- recover the exact author/permlink from the persisted publication intent and canonical Hive read;
- repair the local binding;
- record provenance.

### Example B — activity source update succeeded, Hive notice failed

- keep the correct source update;
- show pending/failed social notice state;
- allow explicit retry;
- do not revert canonical facts.

### Example C — media upload succeeded, source binding failed

- retain/recover provider object identity from the upload intent/result;
- repair source binding if policy permits;
- do not blindly upload a duplicate.

### Example D — Podping failed, feed update succeeded

- feed/activity remains authoritative;
- retry notification only.

### Example E — payment succeeded, UI confirmation failed

- do not instruct the user to pay again until native/provider settlement state is reconciled;
- display an indeterminate/reconciling state.

---

## 26. External side-effect journal

A later implementation needs a durable operation/evidence journal separate from ordinary content fields.

Conceptually each external operation progresses through states such as:

```text
PREPARED
REVIEWED
SIGN_REQUESTED
BROADCAST_OR_PROVIDER_REQUEST_SENT
RESULT_OBSERVED
CANONICAL_STATE_CONFIRMED
BINDING_PERSISTED
RECONCILED

or

CANCELLED
FAILED_CONFIRMED
RECONCILIATION_REQUIRED
```

Exact names/storage are implementation decisions.

The contract requirement is that an irreversible external effect cannot be inferred solely from a transient browser success message.

---

## 27. Source release versus external publication

An operator can change/release ordinary activity facts without signing Hive.

An operator can publish a Hive social object without thereby deploying production infrastructure.

```text
ACTIVITY_SOURCE_MUTATION != HIVE_PUBLICATION
ACTIVITY_SOURCE_RELEASE != HIVE_PUBLICATION
HIVE_PUBLICATION != DEPLOYMENT
MEDIA_UPLOAD != HIVE_PUBLICATION
VALUE_ACTION != SOCIAL_PUBLICATION
```

A future coordinated workflow may offer these steps together, but it must present them as separate consequence domains and retain recoverable partial-success state.

---

## 28. Deletion and retention

### Activity deletion before external binding

A local draft with no external/public identity may follow later accepted resource-deletion policy.

### Activity with durable external bindings

Once an activity has a primary Hive social root, replay, payment evidence, or other durable public relationship, ordinary deletion is unsafe.

The product should prefer:

- cancel;
- unpublish from ordinary navigation while retaining stable route where policy requires;
- archive;
- redact operator-owned source fields where legally/operationally required under a separate policy;
- preserve external-reference provenance.

A later implementation must define exact deletion/tombstone semantics before permitting destructive operations.

This contract rejects silent hard deletion of a socialized activity as an ordinary editor action.

---

## 29. Rendering contract

The activity detail experience is derived from the activity resource and its bindings.

It is not a second hand-authored page authority.

A renderer should be able to compose, as applicable:

```text
CURRENT CANONICAL FACTS
STATUS / TIMING / DESTINATION
HOST / SERIES CONTEXT
PRIMARY ACTIONS
LIVE OR REPLAY MEDIA
PRIMARY HIVE DISCUSSION
SECONDARY UPDATES / RECAP
OPTIONAL SUPPORT / COMMERCE
OPTIONAL DISCOVERY / SYNDICATION LINKS
```

### Graceful degradation

If one provider fails:

- current source facts continue rendering;
- available bindings continue rendering;
- unavailable binding shows an honest localized state;
- no fabricated cached success replaces canonical truth;
- the stable activity route remains coherent.

### Responsive/accessibility

Activity/media/social/commerce compositions remain inside the accepted one-source responsive design and accessibility contract.

No creator-specific or venue-specific renderer fork is authorized.

---

## 30. Studio contract

The Studio must present activity/domain editing separately from integration consequences.

Conceptual operator experience:

```text
ACTIVITY
  Details
  Timing
  Presence / destination
  Access / actions
  Media
  Social
  Syndication
  Value / commerce
  Integration health
```

This is conceptual IA, not a frozen UI.

### Ordinary source edits

Use typed proposal/apply/persistence/history semantics under existing Studio rules.

### Social actions

Examples:

- Create discussion;
- Publish announcement;
- Post update;
- Edit published announcement;
- Publish recap.

These must visibly cross into the Hive-signing boundary.

### Media/provider actions

Upload/create live/replay media must visibly cross into provider-side effects and show processing/reconciliation state.

### Financial actions

Never appear as ordinary content editing.

---

## 31. Visitor product contract

The visitor should experience one coherent host-native activity, not a dashboard of integrations.

A typical physical-show experience might read conceptually as:

```text
Show details
Tickets
Conversation
Who is going / community participation where supported
Photos or replay afterward
Support / pay only where relevant
```

A streamer experience might read:

```text
Next stream
Watch live
Join the conversation
Support / boost with truthful semantics
Replay
Related episodes / next stream
```

The product may hide protocol vocabulary in ordinary presentation, but consequence review and provenance surfaces must reveal enough truth when actions matter.

---

## 32. Qualification example A — Fourth Street-style physical show

### Domain

```text
host = Fourth Street-style bar
activity = one scheduled live-music performance
presence = PHYSICAL
status = SCHEDULED -> COMPLETED
series = optional Friday Live Music
```

Canonical source owns:

- performer/show title;
- date/time;
- physical location/room;
- age/access note;
- ticket/RSVP/external action;
- cancellation/postponement state.

### Social

The host chooses to socialize the show.

An announcement published under the intended Hive host/community context is also designated the primary social root.

Visitors can read the conversation unsigned and participate through user-controlled Hive signing.

If the show moves from 8 PM to 9 PM:

- source changes to 9 PM immediately;
- `activityId` is unchanged;
- primary author/permlink is unchanged;
- social-notice-needed state appears;
- a separately signed update/edit may inform Hive users.

### Optional bindings

- ticket/reservation URL;
- HBD native payment or V4V payment/support surface;
- Distriator-related merchant/review/cashback handoff;
- WorldMapPin discovery;
- post-show media/replay/recap.

None is required for activity identity.

### Result

`PASS` without a physical-host-specific source fork.

---

## 33. Qualification example B — locationless streamer session

### Domain

```text
host = streamer/creator
series = Tuesday Night Live
activity = one dated stream session
presence = ONLINE
status = SCHEDULED -> LIVE -> COMPLETED
physical address = NONE
merchant identity = NOT_REQUIRED
```

Canonical source owns:

- session title;
- scheduled time;
- current public stream/watch destination configuration;
- description;
- access/status;
- series relationship.

### Social

The creator uses an account-rooted Hive social model.

The announcement becomes the primary social root.

Audience replies/votes occur against real Hive state.

### Media

A future SPK/3Speak adapter may provide:

- live media binding;
- processing state;
- replay after completion;
- CID/provider identity.

The stream provider does not become `activityId`.

### Syndication

If the creator publishes an RSS/Podcasting 2.0 feed:

- the activity may map to an episode/live item;
- Podping may signal live/update/end;
- feed/signals remain external bindings.

### Failure example

If 3Speak replay processing fails after the stream:

- completed activity page remains valid;
- Hive discussion remains valid;
- replay area shows processing/unavailable state;
- no replacement activity is created.

### Result

`PASS` with no street-address, restaurant, or merchant assumptions.

---

## 34. Qualification example C — band/comic/creator release or premiere

### Domain

```text
host = band / comedian / creator
activity = release or premiere
presence = NO_LOCATION_APPLICABLE or ONLINE
TEMPORAL_FORM = RELEASE_MOMENT
end time = OPTIONAL / NOT_REQUIRED
```

Canonical source owns:

- release title;
- release/premiere time;
- description;
- media/actions;
- availability state.

### Social

A release announcement/discussion becomes the durable primary root.

Conversation and rewards continue after the release moment.

### Media

One or more 3Speak/SPK/audio/external media bindings may be attached.

### Value

Optional vote-based support and/or transfer-based support may coexist only if their semantics are clearly distinguished.

### Archive

After release, the same activity page remains the persistent context for:

- media;
- conversation;
- recap/update posts;
- related future activities.

### Result

`PASS` without pretending a release is a brick-and-mortar event.

---

## 35. Generalization tests

A later implementation fails this contract if any of the following becomes true:

1. activity identity is derived from `author/permlink`;
2. activity identity is derived from 3Speak/SPK/media provider identity;
3. changing media provider requires creating a new activity;
4. rescheduling creates a new activity by default;
5. source facts are reconstructed by parsing the latest Hive post;
6. editing source silently edits Hive;
7. editing Hive silently mutates source;
8. a Podping or provider live state silently becomes canonical activity state without accepted reconciliation policy;
9. ticket/payment/Distriator/V4V identity becomes the activity primary key;
10. provider outage makes unrelated activity facts disappear;
11. retries can create duplicate primary social roots after ambiguous broadcast;
12. a streamer requires fake street-address/merchant fields;
13. a physical venue requires creator-only feed/media fields;
14. an archetype requires a separate renderer/source fork;
15. ordinary activity editing can trigger a financial action;
16. socialized activity can be silently hard-deleted with durable conversation stranded.

---

## 36. Compatibility with accepted PM2 event architecture

The accepted PM2 contract established stable event resources and renderer-derived event detail pages with identities independent from visual components.

This contract **extends the product architecture conceptually** from venue events to host activities.

It does not mutate the existing schema or reinterpret existing valid v2 bytes.

### Future migration pressure

A later separately authorized implementation/migration may map current event concepts such as:

- stable id;
- slug;
- title;
- start/end;
- state;
- description;
- media reference;
- access note;
- external action;

into the generalized activity model while preserving identity and route compatibility where safe.

Exact migration behavior must be frozen before implementation.

```text
CURRENT_V2_EVENT_BYTES_KEEP_CURRENT_MEANING
THIS_CONTRACT_DOES_NOT_SILENTLY_UPGRADE_SCHEMA
```

---

## 37. Compatibility with host product qualification

The host-level contract requires a fully qualified HiVenue to expose real Hive read state and at least one meaningful user-controlled signed participation loop.

This activity contract does **not** require every activity to be socialized.

However, once a host uses socialized activities as its participation loop, qualification must prove:

- real primary Hive social root;
- unsigned public read;
- at least one meaningful signed action;
- truthful consequence review;
- post-action reconciliation;
- honest failure state.

A locally mocked discussion does not satisfy this requirement.

---

## 38. Provider qualification remains separate

The ecosystem intake established promising providers, not production certifications.

Before first executable production integration, each provider needs bounded technical/security qualification appropriate to its consequence class.

Examples:

- Aioha signer compatibility/security review;
- SPK/3Speak upload/processing/playback contract and failure review;
- V4V financial-flow review;
- Distriator API/auth/claim review;
- Podping service-signing/security review.

This activity contract does not grant those authorizations.

---

## 39. Implementation seams implied by this contract

A later implementation will likely need semantic seams broadly equivalent to:

```text
ActivityRepository / ActivityCommands
SocialObjectBinding
ExternalOperationJournal
SignerAdapter
MediaProvider
SyndicationProvider
ValueRail
CommerceInterop
DiscoveryProvider
```

These are architecture concepts, not frozen code names or module boundaries.

The important dependency direction is:

```text
ACTIVITY DOMAIN
    -> references capability abstractions
    -> never imports provider identity as domain identity
```

---

## 40. Initial implementation sequence implied by the contract

This document still authorizes **no implementation**.

If separately authorized, the safest sequence is:

1. freeze generalized activity source/migration contract;
2. implement provider-neutral activity resource and renderer projection with no external writes;
3. implement social-binding read model and stable primary-root rendering;
4. implement external-operation journal/idempotency model;
5. implement one bounded Hive primary-root publication path through existing signer discipline;
6. prove ambiguous-broadcast recovery and source-vs-Hive partial-success behavior;
7. add SPK/3Speak media adapter under a separately qualified provider contract;
8. add optional syndication/value/commerce/discovery capabilities one at a time;
9. qualify physical + creator references;
10. only then consider production transition.

This sequence intentionally proves identity/reconciliation before adding integration breadth.

---

## 41. Acceptance adjudication

```text
HOST_ACTIVITY_SOCIAL_OBJECT_CONTRACT = COMPLETE_CANDIDATE

ACTIVITY_IDENTITY = HIVENUES_DOMAIN_OWNED
ACTIVITY_PROVIDER_NEUTRAL = YES
DRAFT_ACTIVITY_REQUIRES_HIVE_POST = NO
PUBLIC_ACTIVITY_REQUIRES_HIVE_POST = NO
SOCIALIZED_ACTIVITY_PRIMARY_ROOT_COUNT = EXACTLY_ONE
PRIMARY_HIVE_IDENTITY = AUTHOR_PERMLINK
PRIMARY_ROOT_MUTABLE_BY_ORDINARY_ACTIVITY_EDIT = NO
DOMAIN_FACTS_CAN_BE_CORRECTED_WITHOUT_HIVE_SIGNING = YES
MATERIAL_CHANGE_SOCIAL_NOTICE_MODEL = EXPLICIT_SEPARATE_CONSEQUENCE
MEDIA_IDENTITY_SEPARATE = YES
SYNDICATION_IDENTITY_SEPARATE = YES
VALUE_COMMERCE_IDENTITY_SEPARATE = YES
PROVIDER_SIGNAL_IS_ACTIVITY_AUTHORITY = NO
FAKE_CROSS_PROVIDER_ATOMICITY = FORBIDDEN
AMBIGUOUS_BROADCAST_BLIND_RETRY = FORBIDDEN
ARCHIVE_PRESERVES_ACTIVITY_AND_CONVERSATION = YES
PHYSICAL_REFERENCE = PASS
LOCATIONLESS_STREAMER_REFERENCE = PASS
RELEASE_PREMIERE_REFERENCE = PASS

SCHEMA_IMPLEMENTATION = NOT_AUTHORIZED
HIVE_PUBLICATION = NOT_AUTHORIZED
EXTERNAL_PROVIDER_MUTATION = NOT_AUTHORIZED
PRODUCTION_TRANSITION = WITHHELD
```

---

## 42. Next bounded operations after acceptance

After this contract is canonically accepted, do **not** jump immediately to broad integration implementation.

The highest-value next operation should first reconcile this next-generation contract with the current executable PM2/v2 source and remaining #199 operator-work sequence, then freeze the smallest implementation boundary that proves the new model without destabilizing existing production machinery.

Candidate sequencing:

```text
NEXT_1 = NEXT_GEN_ACTIVITY_SOURCE_AND_MIGRATION_CONTRACT
NEXT_2 = REAUDIT_REMAINING_199_AGAINST_NEXT_GEN_DOCTRINE
NEXT_3 = FIRST_PROVIDER_NEUTRAL_ACTIVITY_IMPLEMENTATION_SLICE
```

Exact routing remains a Project Lead decision after canonical acceptance of this document.