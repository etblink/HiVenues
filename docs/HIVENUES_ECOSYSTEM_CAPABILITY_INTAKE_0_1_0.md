# HiVenues Ecosystem Capability Intake 0.1.0

## Status and authority

```text
OPERATION = HIVENUES_ECOSYSTEM_CAPABILITY_INTAKE
TRACKING_ISSUE = #211
CLASS = EXTERNAL_CAPABILITY_RESEARCH_AND_ARCHITECTURE_INTAKE_ONLY
CANONICAL_BASE_COMMIT = 0830a731e846a87a2bc6d33bd5be102d2fc31fad
CANONICAL_BASE_TREE = ba4fb1a0aadc4975642b606196612370f998747f
CANONICAL_BASE_CI = 766__PASS
IMPLEMENTATION_AUTHORIZATION = NO
SCHEMA_MUTATION = NO
DEPENDENCY_INSTALLATION = NO
PRODUCTION_MUTATION = NO
LIVE_HIVE_EFFECT = NO
EXTERNAL_SERVICE_MUTATION = NO
```

This intake is the required predecessor to `HOST_ACTIVITY_SOCIAL_OBJECT_CONTRACT`.

It answers one bounded question:

> Which existing Hive / Hive-adjacent capabilities should HiVenues treat as canonical primitives, provider-adapted capabilities, optional interoperability, reference patterns, deferred capabilities, or rejected dependencies?

The governing architectural rule is:

```text
HIVENUES_OWNS_DOMAIN_MEANING_AND_COMPOSITION
EXTERNAL_SERVICES_OWN_THEIR_NATIVE_INFRASTRUCTURE_AND_CANONICAL_STATE
PROVIDER_BINDING_MUST_NOT_BECOME_DOMAIN_IDENTITY
```

A provider may supply storage, media processing, signing, payment routing, cashback, discovery, signaling, or programmable settlement. It does not thereby become the owner of the stable HiVenues host or activity identity.

---

## 1. Executive adjudication

The next generation should **reuse ecosystem infrastructure aggressively while keeping a narrow provider-neutral domain model**.

### High-value adoption decisions

```text
HIVE_L1_SOCIAL_AND_VALUE_PRIMITIVES = USE_AS_CANONICAL_EXTERNAL_PRIMITIVE
AIOHA_SIGNER_PROVIDER_ABSTRACTION = ADAPT_BEHIND_HIVENUES_CAPABILITY_SEAM
SPK_3SPEAK_MEDIA = ADAPT_BEHIND_HIVENUES_CAPABILITY_SEAM
V4V_LIGHTNING_BRIDGE = OPTIONAL_INTEROP
DISTRIATOR_SPENDHBD = OPTIONAL_INTEROP
PODPING_PODCASTING2_SIGNALING = OPTIONAL_INTEROP
WORLDMAPPIN_DISCOVERY = OPTIONAL_INTEROP
RSS_PODCASTING2_SYNDICATION = USE_AS_CANONICAL_EXTERNAL_PRIMITIVE__WHEN_APPLICABLE
ICALENDAR_ICS_EXPORT = USE_AS_CANONICAL_EXTERNAL_PRIMITIVE__WHEN_APPLICABLE
MAGI = DEFER
HONEYCOMB = REFERENCE_PATTERN_ONLY
BREAKAWAY = REFERENCE_PATTERN_ONLY
HIVE_ENGINE = DEFER
```

### Product consequence

HiVenues should become an **orchestration and experience layer**, not a proprietary replacement for the rest of the Hive ecosystem.

For example, one creator activity may legitimately bind to:

```text
HIVENUES_ACTIVITY_ID
    + HIVE_AUTHOR_PERMLINK
    + SPK_OR_3SPEAK_MEDIA_BINDING
    + OPTIONAL_PODPING_FEED_SIGNAL
    + OPTIONAL_V4V_VALUE_DESTINATION
    + OPTIONAL_EXTERNAL_TICKET_OR_RESERVATION_TARGET
```

Those bindings are related objects with separate authority and failure domains. None of them replaces the stable HiVenues activity identity.

---

## 2. Classification vocabulary

### `USE_AS_CANONICAL_EXTERNAL_PRIMITIVE`

The external protocol/state is itself the truth HiVenues intends to reference rather than recreate.

Examples: Hive account identity, Hive author/permlink, Hive votes/comments, HIVE/HBD transfers, RSS feed URLs, standards-compliant iCalendar export.

### `ADAPT_BEHIND_HIVENUES_CAPABILITY_SEAM`

The capability is valuable enough for first-class integration, but the provider-specific API/object model must remain behind a HiVenues-owned semantic interface.

### `OPTIONAL_INTEROP`

A host may bind/use the capability, but HiVenues remains fully coherent without it and its absence cannot invalidate unrelated product behavior.

### `REFERENCE_PATTERN_ONLY`

The system demonstrates a useful architecture/product pattern, but HiVenues should not currently import it as a product dependency.

### `DEFER`

The capability is potentially useful, but there is not yet enough concrete product need to justify integration complexity.

### `REJECT`

The capability would duplicate an existing canonical primitive, create unacceptable lock-in/authority risk, or contradict current product doctrine.

---

## 3. Canonical identity hierarchy

Provider-neutral identity is the most important invariant produced by this intake.

```text
HOST_ID = HIVENUES_DOMAIN_IDENTITY
ACTIVITY_ID = HIVENUES_DOMAIN_IDENTITY

HIVE_ACCOUNT = EXTERNAL_CANONICAL_SOCIAL_IDENTITY
HIVE_AUTHOR_PERMLINK = EXTERNAL_CANONICAL_CONTENT_IDENTITY
SPK_CID = EXTERNAL_CONTENT_ADDRESS
THREESPEAK_MEDIA_ID = PROVIDER_MEDIA_BINDING
PODPING_FEED_URL = EXTERNAL_SYNDICATION_IDENTITY
V4V_INVOICE_OR_BRIDGE_REFERENCE = PROVIDER_PAYMENT_BINDING
DISTRIATOR_BUSINESS_OR_CLAIM_ID = PROVIDER_COMMERCE_BINDING
MAGI_CONTRACT_ID = PROVIDER_PROGRAMMABLE_EXECUTION_BINDING
WORLDMAPPIN_PIN_OR_INDEX_ID = PROVIDER_DISCOVERY_BINDING
```

The domain relationship is many-to-many where reality requires it.

One activity may have multiple media renditions, multiple ticket/support destinations, and one or more Hive social objects over its lifecycle. Conversely, one media object may be reused by more than one HiVenues component without becoming the component identity.

---

## 4. Hive L1 / Hivemind / native social primitives

### Classification

`USE_AS_CANONICAL_EXTERNAL_PRIMITIVE`

### Why

Hive itself already owns the identities and state that HiVenues must not reproduce locally:

- Hive account names and public authority state;
- posts/comments identified by author + permlink;
- replies/conversation trees;
- votes and reward state;
- follows;
- Hive Communities membership/subscription/moderation state;
- HIVE/HBD balances and transfers;
- transaction inclusion/finality state.

### HiVenues responsibility

HiVenues owns:

- host-native language and presentation;
- semantic preflight/review;
- operation construction policy;
- signer routing;
- reconciliation;
- honest failure/degraded states;
- binding chain-native objects to stable host/activity identities.

HiVenues does **not** own a shadow social graph or a locally authoritative copy of chain state.

### Activity-contract implication

The upcoming social-object contract may use `author/permlink` as the canonical identity of a Hive content object, but it must not use it as the stable HiVenues activity identity.

---

## 5. Aioha + Keychain / HiveAuth / HiveSigner signer family

### Classification

`ADAPT_BEHIND_HIVENUES_CAPABILITY_SEAM`

### Current documented capability

Hive's current developer resources describe Keychain, HiveAuth, and HiveSigner as supported authentication/signing approaches and explicitly list Aioha as an authentication-provider integration library.

Current Aioha documentation exposes one browser-side interface across:

- Hive Keychain;
- HiveAuth;
- HiveSigner;
- Ledger;
- Peak Vault;
- MetaMask Snap.

Aioha also exposes transaction helpers and can act as a signer for WAX-powered applications.

### Adjudication

HiVenues should define its own narrow signer contract and investigate Aioha as the first implementation of the **provider adapter**, rather than implementing every wallet/authentication provider independently.

Conceptually:

```text
HIVENUES_OPERATION_ENVELOPE
    -> CONSEQUENCE_REVIEW
    -> AUTHORITY_REQUIREMENT
    -> SIGNER_ADAPTER
         -> AIOHA
              -> KEYCHAIN | HIVEAUTH | HIVESIGNER | ...
    -> BROADCAST_RESULT
    -> CANONICAL_RECONCILIATION
```

### Critical security boundary

Aioha must not become the owner of operation semantics.

HiVenues must still determine:

- exact operation type and fields;
- exact authority tier required;
- what the user is told before signing;
- whether the operation is permitted by current product policy;
- post-broadcast reconciliation.

Convenience methods such as transfer/vote must not bypass HiVenues consequence review.

### Migration posture

The mature Keychain path remains authoritative until a separately governed security/compatibility implementation proves the adapter can preserve or improve all accepted guarantees.

`AIOHA_CANDIDATE != AUTOMATIC_REPLACEMENT_OF_EXISTING_KEYCHAIN_CODE`

### Failure semantics

If one signer provider is unavailable, another compatible provider may remain available. If no safe signer path is available, signed actions fail closed while public read-only behavior remains available.

---

## 6. SPK Network / 3Speak media infrastructure

### Classification

`ADAPT_BEHIND_HIVENUES_CAPABILITY_SEAM`

### Current documented capability

SPK describes a decentralized infrastructure layer for peer-to-peer storage, video encoding, and content delivery using IPFS-related infrastructure and network incentives.

Hive's current Developer Portal documents an SPK-powered video hosting service used by 3Speak and Ecency with APIs covering:

- session management;
- video and thumbnail upload;
- metadata update;
- status queries;
- existing-video update;
- thumbnail update;
- publication marking.

SPK's public `trole` infrastructure documents upload contracts, chunked upload, CID-based authorization/checking, storage statistics, and content flag state.

### Adjudication

HiVenues should not build a proprietary video storage/encoding/CDN stack.

Instead define a semantic media capability such as:

```text
MEDIA_PROVIDER
  createUploadSession()
  uploadAsset()
  observeProcessing()
  resolvePlayback()
  resolveContentAddress()
  updateMetadata()
  publishIfSupported()
```

The initial adapter may target SPK/3Speak.

### Identity rule

- `HiVenues media asset id` remains the stable domain identity for authoring/reference.
- IPFS/SPK CID is a durable external content address where available.
- 3Speak-specific IDs/permlinks are provider/social bindings.
- a Hive `author/permlink` associated with the media is a Hive social object, not the media asset identity itself.

### Activity-contract implication

An activity such as a livestream, concert, comedy set, premiere, or replay may bind to one or more media objects without requiring the activity to be represented as a video object.

This is particularly important for:

- streamer live/replay flows;
- bands and performance video;
- comedy clips/specials;
- podcasts/interviews;
- venue recaps.

### Failure semantics

If SPK/3Speak upload/encoding is unavailable:

- the activity/source record remains valid;
- media processing state is honestly unavailable/failed;
- existing safe playback references may remain usable;
- HiVenues must not fabricate completed processing;
- provider failure must not mutate activity identity.

### Lock-in posture

The canonical source should be able to substitute another future media provider without changing `hostId`, `activityId`, or component identity.

---

## 7. RSS / Podcasting 2.0 / Podping

### Classifications

```text
RSS_PODCASTING2 = USE_AS_CANONICAL_EXTERNAL_PRIMITIVE__WHEN_APPLICABLE
PODPING = OPTIONAL_INTEROP
```

### Current documented capability

Podping uses Hive to relay compact notifications that an RSS/Podcasting 2.0 feed changed. Current writer documentation supports reasons including:

- `update`;
- `live`;
- `liveEnd`.

The feed remains the canonical content/syndication source; the podping is a notification to consumers that they should fetch it.

Current Podping software uses a Hive account and Posting authority to write signals, and current server documentation warns that self-hosted writer endpoints require careful authentication/exposure discipline.

### Adjudication

For podcasts, serialized audio/video, and compatible livestream/feed scenarios:

- use standards-based RSS/Podcasting 2.0 rather than inventing a HiVenues proprietary feed;
- treat Podping as optional fast signaling around the feed;
- do not confuse a Podping with the activity or media identity.

### Activity-contract implication

The upcoming contract should allow:

```text
activity.syndication.feedUrl
activity.syndication.medium
activity.syndication.providerBindings[]
```

conceptually, without freezing exact schema syntax here.

A `live` or `liveEnd` signal may mirror an activity transition, but the signal is evidence/notification of that transition, not the canonical HiVenues state transition itself.

### Failure semantics

Podping failure delays notification but does not invalidate the RSS feed or the HiVenues activity.

---

## 8. V4V.app HIVE/HBD ↔ Lightning bridge

### Classification

`OPTIONAL_INTEROP`

### Current documented capability

The current V4V site describes itself as a Bitcoin Lightning wallet/bridge for Hive. It supports:

- paying Lightning invoices or Lightning addresses from HIVE/HBD;
- receiving Lightning and converting to Hive/HBD;
- QR-based Hive/HBD receiving;
- point-of-sale use for merchants accepting Hive/HBD or Lightning;
- a small hosted `KeepSats` balance.

Public material also describes a hosted API and backend bridge that watches Hive and Lightning.

### Adjudication

V4V is valuable for:

- physical merchant checkout;
- performers accepting support/payment from Lightning users;
- creator value-for-value flows;
- cross-ecosystem payment reach.

It must remain behind a **value/payment interoperability seam**, not become the canonical HiVenues payment architecture.

Native Hive/HBD transfers remain independently representable.

### Canonical-state rule

- Hive owns HIVE/HBD transaction truth.
- Bitcoin/Lightning owns its native settlement truth.
- V4V owns bridge/invoice/conversion coordination and any hosted KeepSats state.
- HiVenues owns host-native presentation, declared destination, preflight, and reconciliation status.

### Security / consequence rule

Any V4V-enabled transfer or payment remains a financial action. It requires exact asset/amount/destination/conversion disclosure appropriate to the operation and must not be presented as equivalent to a Hive vote or other non-transfer social support.

### Activity-contract implication

An activity may expose a support/payment destination, but a V4V invoice/reference must remain an optional binding around the activity.

### Failure semantics

If V4V is unavailable, Lightning interoperability becomes unavailable. Native non-V4V Hive social behavior and any separately supported native HBD flow remain unaffected.

---

## 9. Distriator / SpendHBD

### Classification

`OPTIONAL_INTEROP`

### Current documented capability

Current public Distriator/SpendHBD behavior couples:

- physical business discovery;
- HBD/Lightning payment evidence;
- Hive-authenticated business reviews;
- cashback/discount eligibility and claims.

Public development material documents unauthenticated paginated APIs for business records and business reviews. Review responses include Hive username and Hive post permlink alongside business/reward data.

Current SpendHBD review flows also reference QR invoices from V4V/Keychain for eligible purchases.

### Adjudication

Distriator is particularly valuable for the physical-host archetype, but should not become universal HiVenues infrastructure.

Potential HiVenues integration modes:

```text
READ_BUSINESS_DISCOVERY = OPTIONAL
READ_HIVE_BACKED_REVIEWS = OPTIONAL
LINK_OR_HANDOFF_TO_CASHBACK_CLAIM = OPTIONAL
EMBED_CLAIM_FLOW = DEFER_UNTIL_EXACT_API_AND_AUTHORITY_REVIEW
```

### Identity rule

- `Distriator business id` is a provider binding.
- the stable HiVenues host id remains independent.
- a review's Hive author/permlink is the canonical Hive content identity and may safely be referenced as such.

### Activity-contract implication

Distriator should not shape the universal activity model. A purchase/check-in/review may later become an activity-related participation edge, but the baseline social-object contract must work with no Distriator account.

### Failure semantics

If Distriator is unavailable, the host site, Hive community/social objects, and unrelated payment paths remain usable. Cashback/discovery/review aggregation shows an honest unavailable state.

---

## 10. WorldMapPin

### Classification

`OPTIONAL_INTEROP`

### Current documented capability

WorldMapPin is an active Hive travel/geospatial project that maps Hive posts to locations. Current public project materials describe location pinning and a multi-year development program for a Hive map service/mobile application.

Distriator has also published an integration in which business/review information can be consumed by mapping clients.

### Adjudication

WorldMapPin is potentially useful for:

- local venue discovery;
- tour/show discovery;
- location-linked public Hive stories/reviews;
- travel/physical community contexts.

It is not universal and should not own host location truth.

### Identity rule

Host address/coordinates remain canonical HiVenues domain facts where applicable. A WorldMapPin reference is an external discovery/index binding.

### Failure semantics

Map/discovery enrichment may disappear while the host's own location/visit experience remains valid.

---

## 11. Magi

### Classification

`DEFER`

### Current documented capability

Current Magi documentation describes:

- cross-chain native asset settlement/swaps;
- HBD-routed liquidity;
- validator-managed vaults;
- WASM smart contracts;
- Hive-native identity integration;
- Bitcoin and Ethereum mainnet support with additional chains planned;
- feeless in-protocol transactions using an RC model.

Hive's Developer Portal currently lists Magi as a Hive Layer-2 smart-contract system whose code/state is stored on IPFS with validator anchor records on Hive.

### Adjudication

Magi is strategically interesting, but no current baseline HiVenues requirement justifies making cross-chain smart contracts part of the core host/activity contract.

Do **not** make ordinary activities, ticket links, creator support, or venue payments depend on Magi merely because it can express them.

### Re-open conditions

Re-evaluate Magi when a concrete use case requires one or more of:

- programmable multi-party settlement;
- escrow;
- trust-minimized cross-chain payment;
- token-gated rights that cannot be represented safely with existing primitives;
- automated royalty/split logic;
- another specific smart-contract invariant with a measurable product benefit.

### Activity-contract implication

Reserve the conceptual possibility of external programmable bindings, but do not freeze a Magi-specific field into the baseline activity schema.

---

## 12. HoneyComb

### Classification

`REFERENCE_PATTERN_ONLY`

### Current documented capability

Hive's current Developer Portal describes HoneyComb as a customizable DAO system in the Hive ecosystem and notes that it powers DLUX and the 3Speak/SPK claim chain.

### Adjudication

HoneyComb demonstrates useful patterns for:

- decentralized service coordination;
- token/community state;
- layer-2 application logic.

No current HiVenues baseline requirement justifies importing a DAO/token-chain dependency.

Use it as architectural evidence that provider-specific service economies can remain outside Hive L1/domain identity.

---

## 13. Breakaway Communities

### Classification

`REFERENCE_PATTERN_ONLY`

### Current documented capability

SPK describes Breakaway as infrastructure for creating tokenized community social frontends on Hive and presents multiple community-specific frontends as examples.

### Adjudication

Breakaway independently validates an important HiVenues idea:

> a specific community can have a purpose-built frontend while retaining Hive as the social substrate.

That is valuable evidence, not a reason to make HiVenues a Breakaway skin or dependency.

HiVenues differentiates itself through:

- host/activity semantic authoring;
- generated host-specific public experiences;
- productized Studio;
- physical + creator archetype range;
- explicit consequence-bound operational workflows.

---

## 14. Hive Engine

### Classification

`DEFER`

### Current documented capability

Hive's Developer Portal describes Hive Engine as a smart-contract sidechain for custom tokens and other contract logic driven by Hive-published data.

### Adjudication

Do not introduce host tokens, loyalty assets, or custom token economics into the baseline product contract.

Re-open only when a specific host requirement and user-value case survives product review.

---

## 15. Open web standards: iCalendar / HTTPS / structured metadata

### Classification

`USE_AS_CANONICAL_EXTERNAL_PRIMITIVE__WHEN_APPLICABLE`

### Adjudication

HiVenues should prefer established web standards over proprietary equivalents for interoperable edges that do not require a Hive-specific protocol.

Examples:

- iCalendar/ICS for adding scheduled activities to user calendars;
- ordinary HTTPS URLs for external ticketing, booking, stream destinations, or merchant systems;
- standards-based structured metadata/JSON-LD where appropriate for search/discovery;
- RSS/Podcasting 2.0 for serialized media syndication.

These standards are not substitutes for Hive-native identity/social participation. They are interoperability surfaces around it.

---

## 16. Capability adoption matrix

| Capability | Classification | Canonical truth owner | Stable external identifier useful to HiVenues | Signing / authority | Physical host | Creator/performer | Activity-contract impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hive L1 / Hivemind | USE_AS_CANONICAL_EXTERNAL_PRIMITIVE | Hive | account, author/permlink, tx ids | operation-specific Hive authority | high | high | **core** |
| Aioha signer adapter | ADAPT_BEHIND_HIVENUES_CAPABILITY_SEAM | no domain truth; routes signer providers | provider/session refs only | user-controlled provider | high | high | operation-signing seam |
| Keychain | provider under signer seam | user wallet + Hive | account/signature/tx | Posting/Active/etc by op | high | high | signed participation |
| HiveAuth | provider under signer seam | user wallet + Hive | account/auth session | operation-specific | high | high | signed participation |
| HiveSigner | provider under signer seam | Hive + scoped auth service | account/token/tx | scoped delegated authority | high | high | signed participation |
| SPK / 3Speak | ADAPT_BEHIND_HIVENUES_CAPABILITY_SEAM | SPK/IPFS + provider metadata | CID/media id; related Hive permlink | upload/provider auth; Hive publish where applicable | medium | **very high** | media binding, live/replay |
| RSS / Podcasting 2.0 | USE_AS_CANONICAL_EXTERNAL_PRIMITIVE when applicable | feed publisher | feed URL/item GUID | publisher-specific | low-medium | **high** | syndication binding |
| Podping | OPTIONAL_INTEROP | Podping signal on Hive; feed remains source | feed URL + signal | Posting for writer | low | high for podcast/live | update/live signaling only |
| V4V.app | OPTIONAL_INTEROP | Hive/Lightning native ledgers + bridge coordination | invoice/bridge refs | financial signing/payment | **high** | high | optional support/payment |
| Distriator | OPTIONAL_INTEROP | Distriator eligibility/claim; Hive for review/payment chain objects | business id, claim id, review author/permlink | login/claim/payment dependent | **very high** | low-medium | no universal activity dependency |
| WorldMapPin | OPTIONAL_INTEROP | map/index service; Hive for pinned content | map/pin/index refs | service/content dependent | high | medium for tour/travel | discovery only |
| Magi | DEFER | Magi L2 + native chains | contract/asset mapping ids | Magi wallet/contract authority | future | future | reserve extension only |
| HoneyComb | REFERENCE_PATTERN_ONLY | HoneyComb chain/DAO | implementation-specific | implementation-specific | low | medium | none now |
| Breakaway | REFERENCE_PATTERN_ONLY | Hive + Breakaway app state | community/frontend refs | Hive + app-specific | medium | high | conceptual validation |
| Hive Engine | DEFER | Hive Engine sidechain | contract/token ids | sidechain operations | future | future | none now |
| iCalendar/ICS | USE_AS_CANONICAL_EXTERNAL_PRIMITIVE when applicable | exported calendar representation | URL/file/UID | none for public export | high | high | schedule interoperability |

---

## 17. Provider-neutral capability seams recommended for later implementation

This intake recommends **interfaces**, not code or exact schema.

### 17.1 `SignerAdapter`

Responsibilities:

- provider availability;
- authenticate/prove account control;
- request signature/broadcast for an already-reviewed operation envelope;
- return normalized broadcast/cancel/error result.

Does not own operation semantics.

### 17.2 `MediaProvider`

Responsibilities:

- upload session;
- asset upload;
- processing/encoding state;
- playback resolution;
- external content addresses;
- provider metadata/publication binding.

Does not own HiVenues media/activity identity.

### 17.3 `ValueRail`

Responsibilities:

- describe supported asset/rail;
- quote or generate destination/invoice where applicable;
- expose exact financial consequence;
- report provider settlement/bridge state;
- reconcile against native ledger evidence where possible.

Does not conflate vote-based support with transfer-based support.

### 17.4 `CommerceInterop`

Responsibilities:

- external merchant/business binding;
- discovery/review/cashback projection;
- claim/handoff eligibility if separately implemented.

Does not own host identity or ordinary site facts.

### 17.5 `SyndicationProvider`

Responsibilities:

- expose standards-based feed identity;
- publish/observe update signaling where separately authorized;
- distinguish feed content from notification transport.

### 17.6 `DiscoveryProvider`

Responsibilities:

- publish/resolve optional geospatial or ecosystem discovery bindings;
- never replace canonical host location/activity facts.

### 17.7 `ProgrammableExecutionProvider`

Reserved extension category for Magi/other future smart-contract systems.

No baseline implementation is authorized.

---

## 18. Consequence tiers across ecosystem integrations

Provider reuse must not blur action risk.

### Tier R — read-only projection

Examples:

- read 3Speak playback metadata;
- read Distriator business/reviews;
- read WorldMapPin discovery;
- read Hive posts/votes/community state.

No signer required.

### Tier P — Posting/social consequence

Examples:

- Hive vote;
- reply/post;
- Community subscribe;
- provider action that creates a Hive post/custom_json under Posting authority;
- Podping write.

Requires explicit user or separately authorized service Posting boundary.

### Tier F — financial consequence

Examples:

- HBD/HIVE transfer;
- V4V payment/bridge action;
- cashback claim that triggers value transfer where the user/provider action requires it;
- future Magi asset movement.

Requires exact amount/asset/destination/fee or conversion review and correct authority.

### Tier X — privileged programmable / infrastructure consequence

Examples:

- deploy or call financially consequential smart contract;
- alter server-held service signer;
- configure production storage contract with cost/resource consequence;
- change beneficiary/merchant/recovery authority.

Requires separate privileged workflow and must not be reachable through ordinary content editing.

---

## 19. Activity/social-object implications to carry forward

The ecosystem survey changes the upcoming contract in seven important ways.

### A1 — `Activity` must be provider-neutral

An activity is a stable HiVenues domain object whose meaning survives provider changes.

### A2 — social identity and media identity are separate

A Hive post may discuss an activity. A 3Speak/SPK object may contain its media. Neither one automatically **is** the activity.

### A3 — one activity may have lifecycle bindings

Conceptual examples:

```text
ANNOUNCEMENT_POST
PRE_EVENT_DISCUSSION
LIVE_MEDIA_BINDING
LIVE_SIGNAL
REPLAY_MEDIA_BINDING
RECAP_POST
TICKET_OR_RESERVATION_TARGET
SUPPORT_OR_PAYMENT_BINDING
```

The contract must decide which relationships are optional, singular, repeatable, or stable without reducing them to one provider's model.

### A4 — durable social continuity should prefer Hive author/permlink

Where a specific Hive discussion is intentionally bound as an activity's durable social object, the canonical external identity is `author/permlink`.

Editing local activity facts must not silently replace that identity.

### A5 — value rails are attachments, not activity identity

V4V/HBD/Lightning/support links bind to an activity or host; they do not define it.

### A6 — feed signaling is notification, not identity

Podping may signal `live`, `liveEnd`, or `update`, but HiVenues lifecycle state must remain coherent even if the signal fails or arrives late.

### A7 — external capability failure must be localizable

An activity with valid domain facts and Hive conversation must remain understandable if 3Speak encoding, V4V Lightning, Distriator cashback, or WorldMapPin discovery is temporarily unavailable.

---

## 20. What HiVenues should deliberately NOT build now

This intake rejects near-term proprietary reimplementation of:

- a general-purpose blockchain wallet;
- a private-key custody system for ordinary users;
- a video transcoding/CDN/storage network;
- a Lightning node/bridge;
- a cashback network;
- a global merchant discovery network;
- a podcast update signaling network;
- a custom token/DAO chain;
- a cross-chain smart-contract network;
- a proprietary calendar format;
- a proprietary podcast/feed format.

HiVenues should build the **host/activity semantic layer, orchestration, authoring UX, consequence review, and coherent generated experience** that those systems do not provide together.

---

## 21. What HiVenues uniquely owns after ecosystem reuse

Even after aggressive reuse, the core product remains substantial and distinctive.

HiVenues owns:

1. stable host identity and archetype-neutral product contract;
2. stable domain activity/resource identities;
3. semantic authoring Studio;
4. host-specific information architecture and visual design system;
5. relationships among business/creator facts, activities, media, Hive social objects, and optional external capabilities;
6. host-native translation of Hive actions without semantic deception;
7. consequence review and authority routing;
8. provider-neutral capability orchestration;
9. truthful degradation/failure behavior;
10. release qualification, accessibility, responsive behavior, provenance, and production safety.

The ecosystem integrations make HiVenues **more focused**, not less important.

---

## 22. Source register

Research was performed against current public material available on 2026-09-12/13 UTC.

### Hive core / authentication

- Hive Developer Portal — Authentication: https://developers.hive.io/quickstart/authentication.html
- Hive Developer Portal — Resources / Aioha / HiveAuth / HiveSigner / Keychain: https://developers.hive.io/resources/
- Hive Developer Portal — SDK Reference: https://developers.hive.io/resources/sdk_reference.html
- Aioha documentation: https://aioha.dev/docs
- Aioha package/repository: https://www.npmjs.com/package/@aioha/aioha and https://github.com/aioha-hive/aioha

### SPK / 3Speak

- SPK Network: https://spk.network/
- Hive Developer Portal — VideoHoster: https://developers.hive.io/services/videoHoster.html
- SPK `trole` public infrastructure/API documentation: https://github.com/spknetwork/trole

### V4V

- V4V current application/help text: https://v4v.app/
- V4V status surface: https://v4v.app/status
- Public V4V architecture/proposal background: https://ecency.com/proposals/244

### Distriator / SpendHBD

- Distriator: https://distriator.com/
- Public business/review API development description: https://hive.blog/hive-139531/@sagarkothari88/hive-dapps-dev-update-worldmappin-distriator-integration
- Public cashback processing/API development description: https://app.blocktunes.net/@sagarkothari88/hive-dapps-update-cashbackdistriatorcom-working-on-faster-claims

### Podping / Podcasting 2.0

- Podping Hive writer: https://github.com/Podcastindex-org/podping-hivewriter
- Podping cloud server: https://github.com/Podcastindex-org/podping.cloud
- Podcast Namespace Podping proposal/specification: https://github.com/Podcastindex-org/podcast-namespace/blob/main/proposal-docs/podping/podping.md

### Magi / layer 2

- Magi documentation: https://docs.magi.eco/
- Hive Developer Portal — Magi: https://developers.hive.io/layer2/magi.html
- Hive Developer Portal — Layer 2: https://developers.hive.io/layer2/

### HoneyComb / Breakaway / Hive Engine

- Hive Developer Portal — HoneyComb: https://developers.hive.io/layer2/honeycomb.html
- Hive Developer Portal — Hive Engine: https://developers.hive.io/layer2/engine.html
- SPK Network / Breakaway overview: https://spk.network/

### WorldMapPin

- WorldMapPin: https://worldmappin.com/
- WorldMapPin 2026 project reporting / public Hive presence: https://hive.blog/hive-163772/@worldmappin/worldmappin-transparency-and-strategy-report-2026-hive-163772

### Evidence limitation

This is a product-architecture intake, not a production integration certification.

Public documentation can establish current claimed/documented capability and visible API surfaces. It does **not** by itself establish:

- SLA;
- security audit status;
- production reliability under HiVenues load;
- economic sustainability;
- API stability commitments;
- exact undocumented edge cases;
- suitability of any provider for production financial custody.

Each first implementation must therefore perform a separately bounded provider-specific technical/security qualification before production activation.

---

## 23. Acceptance adjudication

```text
ECOSYSTEM_CAPABILITY_INTAKE = COMPLETE_CANDIDATE

HIGH_LEVERAGE_REUSE_FOUND = YES
PROVIDER_NEUTRAL_DOMAIN_IDENTITY_REQUIRED = YES
SIGNER_AGGREGATION_CANDIDATE = AIOHA
FIRST_CLASS_MEDIA_PROVIDER_CANDIDATE = SPK_3SPEAK
OPTIONAL_LIGHTNING_INTEROP = V4V
OPTIONAL_PHYSICAL_COMMERCE_INTEROP = DISTRIATOR
OPTIONAL_GEOSPATIAL_DISCOVERY = WORLDMAPPIN
OPTIONAL_CREATOR_FEED_SIGNALING = PODPING
PROGRAMMABLE_CROSS_CHAIN_BASELINE_DEPENDENCY = NO

HOST_ACTIVITY_SOCIAL_OBJECT_CONTRACT_UNBLOCKED_AFTER_CANONICAL_ACCEPTANCE = YES
IMPLEMENTATION = NOT_AUTHORIZED
EXTERNAL_MUTATION = NOT_AUTHORIZED
PRODUCTION_TRANSITION = WITHHELD
```

## 24. Next operation

After this intake is canonically accepted, the next bounded product-architecture operation should be:

```text
HOST_ACTIVITY_SOCIAL_OBJECT_CONTRACT
```

It should use this intake to freeze:

- provider-neutral activity identity;
- activity lifecycle;
- durable Hive social-object binding;
- announcement/discussion/live/replay/recap relationships;
- media-provider bindings;
- syndication/update signaling;
- optional value/commerce bindings;
- reconciliation when external operations only partially succeed;
- physical and creator/performer qualification examples.

It must still stop before source/schema implementation.