# HiVenues — Hive Ecosystem Integration Doctrine 0.1.0

```text
DOCUMENT = HIVENUES_HIVE_ECOSYSTEM_INTEGRATION_DOCTRINE
VERSION = 0.1.0
STATUS = CANONICAL / FROZEN COMPANION DOCTRINE
PARENT_DOCTRINE = HIVENUES_END_STATE_PRODUCT_DOCTRINE_0_1_0
PREDECESSOR_RESEARCH = HIVENUES_ECOSYSTEM_CAPABILITY_INTAKE_0_1_0
CURRENT_IMPLEMENTATION = NOT DEFINITIONAL
IMPLEMENTATION = SUBORDINATE TO THIS DOCTRINE
AMENDMENT = EXPLICIT DOCTRINE REVISION ONLY
```

## 0. Why this document exists

HiVenues previously protected qualification by treating live Hive effects as broadly prohibited. That was appropriate for clean-room product testing, but it must not harden into the product architecture.

The end-state product is a **premium, host-first frontend factory for Hive**. Hive and selected Hive-ecosystem capabilities therefore belong underneath the product as first-class infrastructure, not as radioactive exceptions and not as provider-branded product surfaces.

This document freezes the architecture and sequencing needed to get there without losing custody safety, product truth, provider replaceability, or the host-first experience.

The governing sentence is:

> **Hive everywhere it is useful; keys nowhere in HiVenues; every consequential write owned by the human wallet.**

The governing product sentence remains:

> **The host's world becomes the interface to Hive.**

---

# Part I — Non-negotiable architecture

## 1. The HiVenues host graph remains canonical

HiVenues owns stable product/domain identity:

```text
HOST_ID = HIVENUES_DOMAIN_IDENTITY
ACTIVITY_ID = HIVENUES_DOMAIN_IDENTITY
OFFER_ID = HIVENUES_DOMAIN_IDENTITY
MEDIA_ROLE = HIVENUES_DOMAIN_SEMANTICS
VOICE_TERM = HIVENUES_EXPERIENCE_SEMANTICS
```

External identities bind to those objects; they do not replace them.

Examples:

```text
HIVE_ACCOUNT = EXTERNAL_CANONICAL_SOCIAL_IDENTITY
HIVE_AUTHOR_PERMLINK = EXTERNAL_CANONICAL_CONTENT_IDENTITY
SPK_CID = EXTERNAL_CONTENT_ADDRESS
THREESPEAK_MEDIA_ID = PROVIDER_MEDIA_BINDING
WORLDMAPPIN_ID = PROVIDER_DISCOVERY_BINDING
RSS_FEED_URL = EXTERNAL_SYNDICATION_IDENTITY
PODPING_SIGNAL = OPTIONAL_EXTERNAL_SIGNAL
DISTRIATOR_BINDING = PROVIDER_COMMERCE_BINDING
HIVE_ENGINE_ASSET = EXTERNAL_ASSET_BINDING
```

No provider may become the primary identity of a HiVenues host, Activity, Offer, page, composition, or Studio object merely because that provider currently supplies infrastructure.

Provider replacement, outage, or removal must not invalidate unrelated host content or identity.

---

## 2. Provider seams are mandatory

The intended architecture is:

```text
CANONICAL_HIVENUES_HOST_GRAPH
        |
        +-- HiveReadProvider
        +-- SigningProvider
        |     +-- Keychain
        |     +-- HiveAuth
        |     +-- HiveSigner
        |     +-- optional Aioha-backed adapters
        |
        +-- SocialProvider        -> Hive L1 / Hivemind
        +-- VideoProvider         -> 3Speak / SPK
        +-- LocationProvider      -> WorldMapPin-compatible projection
        +-- FeedProvider          -> RSS / Podcasting 2.0 / Podping
        +-- CommerceProvider      -> HBD / V4V / Distriator
        +-- AssetProvider         -> Hive Engine
        +-- future providers      -> capability-specific adapters
```

Provider-specific APIs, SDKs, object models, retries, credentials and quirks belong behind these seams.

The provider interface may be replaced without redefining HiVenues domain objects or visitor-facing semantics.

---

## 3. HiVenues never takes custody of customer private keys

This is a product invariant, not merely a current implementation detail.

HiVenues must not request, accept, persist, proxy, log, export, back up, or otherwise take custody of:

- Hive owner keys;
- active private keys;
- posting private keys;
- memo private keys;
- master passwords;
- seed phrases or equivalent wallet recovery secrets.

Ordinary user-authorized Hive writes are signed in a user-controlled wallet or signer environment.

The preferred reference model is:

```text
HIVENUES_PREPARES_EXACT_OPERATION
        -> HUMAN_READABLE_CONSEQUENCE_REVIEW
        -> REQUIRED_AUTHORITY_DISCLOSED
        -> USER_WALLET_OPENS
        -> HUMAN_APPROVES_OR_REJECTS
        -> WALLET_BROADCASTS
        -> HIVENUES_READS_CANONICAL_STATE_BACK
        -> ONLY_THEN_CONFIRMED
```

A server-side relay may exist only where a protocol genuinely requires it and only under an explicitly designed service-identity model. It must never smuggle customer private-key custody into HiVenues.

---

## 4. Authority tiers are explicit and never silently escalated

HiVenues must distinguish at least:

- read-only observation;
- Posting-authority actions;
- Active-authority / value-moving actions;
- Owner-authority account administration.

A feature designed for Posting authority must not silently request Active authority.

A financial/value-moving feature must disclose that it requires a stronger authority than ordinary social participation.

Owner authority is not an ordinary application authorization path.

---

## 5. Reads are normal; writes are explicit

Live public-chain reads are ordinary product behavior and should not require special fear or ceremony.

Examples include:

- account/profile lookup;
- authority lookup;
- balances and public resource state;
- posts/comments;
- votes;
- follows/subscriptions;
- community state;
- transaction/content observation;
- public metadata and interoperable provider state.

Writes require an exact consequence boundary.

No automatic retry may create a plausible double-broadcast condition after wallet acceptance.

---

## 6. Wallet acceptance is not confirmation

A successful signer callback proves only that the signer accepted or submitted the operation as reported by that provider.

HiVenues must reconcile against canonical external state before presenting a public write as confirmed whenever the underlying primitive allows reliable observation.

For Hive L1 this normally means observing the exact transaction or resulting canonical object on-chain.

Pending, unknown and delayed states are first-class states. They must not be collapsed into failure in a way that invites duplicate submission.

---

## 7. Host-native metaphor; exact consequence disclosure

The visitor-facing language may be radically host-specific:

```text
Hive vote        -> Send applause
Follow account   -> Stay connected
Community join   -> Join the regulars
Tip/support      -> Buy the artist a coffee
Voting capacity  -> The host's chosen capacity metaphor
```

But immediately before a consequential action, HiVenues must truthfully disclose what will happen, which account is acting, what authority is required, whether value moves, and whether the action is public/reversible.

Provider and blockchain vocabulary should remain out of the ordinary public experience unless needed for consequence truth or an explicitly advanced surface.

---

# Part II — Provider decisions

## 8. Hive L1 / Hivemind social and value primitives

```text
CLASSIFICATION = USE_AS_CANONICAL_EXTERNAL_PRIMITIVE
PRIORITY = NOW
```

Hive owns the canonical external state for:

- account identity and authorities;
- posts/comments and author+permlink identity;
- replies/conversations;
- votes;
- follows;
- community subscription/membership/moderation state;
- HIVE/HBD balances and transfers;
- transaction inclusion and chain-observable results.

HiVenues owns the experience, policy, operation construction, consequence review, signer routing, host binding, reconciliation and degraded behavior.

HiVenues must not create an authoritative shadow social graph when Hive already owns that state.

---

## 9. Signing providers: Keychain first, provider-neutral contract always

```text
SIGNING_PROVIDER_SEAM = REQUIRED_NOW
REFERENCE_PROVIDER = HIVE_KEYCHAIN
AIOHA = CANDIDATE_ADAPTER / NOT_DOMAIN_OWNER
HIVEAUTH = FUTURE_ADAPTER
HIVESIGNER = FUTURE_ADAPTER
```

The direct Keychain flow is the reference implementation because it makes the HiVenues safety contract explicit and testable.

Aioha may later reduce duplicated provider plumbing across Keychain, HiveAuth, HiveSigner and other supported signers, but it must sit behind a HiVenues-owned `SigningProvider` contract.

No signer library owns:

- operation semantics;
- authority selection policy;
- consequence language;
- whether an action is allowed;
- the HiVenues host/session model;
- canonical reconciliation.

A signer/provider migration must not require redesigning visitor mechanics or host domain objects.

---

## 10. SocialProvider: Hive L1

```text
CLASSIFICATION = FIRST_CLASS
PRIORITY = NOW / IMMEDIATELY_AFTER_CURRENT_#276_SLICE
```

The next Hive-native product surface should make the already-modeled social mechanics real, including where appropriate:

- posts and host updates;
- comments/replies;
- host-native applause/voting;
- account following/unfollowing;
- community subscribe/unsubscribe;
- read-only profile/community/content surfaces;
- resource/voting-capacity observation.

These operations should be exposed through host-native Voice rather than generic blockchain controls.

---

## 11. 3Speak / SPK media

```text
CLASSIFICATION = ADAPT_BEHIND_HIVENUES_CAPABILITY_SEAM
PROVIDER_SEAM = VideoProvider / MediaProvider
PRIORITY = PREPARE_SEAM_NOW; PROVIDER_INTEGRATION_NEXT
```

HiVenues should support serious creator/venue video without making 3Speak or SPK the domain model.

A host media object remains a HiVenues media role/binding. SPK content addressing or a 3Speak media identity is an external binding/rendition.

The public site must remain coherent if the external provider is temporarily unavailable.

---

## 12. WorldMapPin-compatible location interoperability

```text
CLASSIFICATION = OPTIONAL_INTEROP
PROVIDER_SEAM = LocationProvider
PRIORITY = SOON
```

HiVenues canonical place/presence facts remain authoritative for the host.

Where useful, HiVenues may project compatible location metadata outward for ecosystem discovery. The external index/pin is not the host's identity or canonical address record.

---

## 13. RSS / Podcasting 2.0 / Podping

```text
RSS_PODCASTING2 = CANONICAL_EXTERNAL_PRIMITIVE_WHEN_APPLICABLE
PODPING = OPTIONAL_INTEROP_SIGNALING
PROVIDER_SEAM = FeedProvider
PRIORITY = HOST_TYPE_DEPENDENT
```

Feeds are portable infrastructure and should be supported directly for publications, podcasts, creators and other relevant hosts.

Podping may be emitted through a dedicated provider/relay boundary when useful.

A reference Podping implementation requiring a Posting private key is not permission to put customer Posting keys on a HiVenues server. The integration must preserve the no-custody doctrine.

---

## 14. Commerce: HBD, V4V and Distriator

```text
CLASSIFICATION = FIRST_CLASS_CAPABILITY_SEAM + OPTIONAL_PROVIDER_INTEROP
PROVIDER_SEAM = CommerceProvider / PaymentProvider
PRIORITY = PREPARE_NOW; ENABLE_LIVE_VALUE_MOVEMENT_IN_DEDICATED_PHASE
```

Physical venues and creators are strong use cases for Hive-native commerce.

HiVenues should support host-native experiences such as:

- pay a tab;
- tip/support;
- purchase or claim an offer;
- pay with HBD;
- provider-assisted commerce/cashback where appropriate.

Live value-moving operations require a dedicated qualification phase because they normally require Active authority and introduce stronger duplicate-submission and receipt/reconciliation obligations.

This is a sequencing requirement, not a reason to keep commerce architecturally absent.

Distriator/V4V may supply routing, merchant discovery, cashback or bridge capability behind the commerce seam. They do not own HiVenues Offer identity or host identity.

---

## 15. Hive Engine

```text
CLASSIFICATION = READ_PROVIDER_SOON / WRITE_ECONOMICS_DEFERRED
PROVIDER_SEAM = AssetProvider
READ_PRIORITY = AFTER_CORE_HIVE_SOCIAL
CUSTOM_TOKEN_OR_NFT_ECONOMICS = DEFER
```

This explicitly refines the earlier ecosystem intake classification of `HIVE_ENGINE = DEFER`.

Read-only support may become useful for optional host memberships, balances, rewards or asset-aware presentation without committing HiVenues to custom token economics.

Creating HiVenues-specific tokens, NFTs, markets or economic systems remains deferred until a concrete product requirement justifies them.

---

## 16. Magi, HoneyComb, Breakaway and deeper execution frameworks

```text
MAGI = DEFER
HONEYCOMB = REFERENCE_PATTERN_ONLY
BREAKAWAY = REFERENCE_PATTERN_ONLY
```

These systems may continue to inform architecture, decentralization or application-runtime thinking.

They must not displace the canonical host graph or become dependencies merely because integration is technically possible.

A later product need may reopen them through an explicit doctrine revision or bounded architecture decision.

---

# Part III — Failure and product-quality rules

## 17. Provider failure must be bounded

A provider outage should degrade only the capability that depends on that provider.

Examples:

- video outage must not erase event facts;
- signer outage must not make public pages unusable;
- location-index outage must not erase canonical address/presence facts;
- commerce-provider outage must not erase Offer content;
- Hive Engine outage must not invalidate the host;
- Podping outage must not invalidate the RSS feed.

The public site should explain the unavailable action honestly and preserve useful host information.

---

## 18. Shared infrastructure, not a second product architecture

Provider adapters and signer modules may be shared browser/server infrastructure.

They must not become a second durable client-side state model or a provider-specific parallel Studio.

Candidate C's bounded custom-client-island architecture remains binding unless separately and explicitly superseded. Hive integration should use shared infrastructure modules and server-owned canonical state rather than multiplying product islands.

---

## 19. No fake-success states

HiVenues must not claim:

- connected before identity control is verified;
- published before canonical state is observable where observation is available;
- paid before payment evidence is sufficient;
- uploaded before the provider has accepted/persisted media;
- subscribed/followed/voted merely because a UI button was clicked.

Pending and degraded states must be rendered honestly.

---

# Part IV — Sequence

## 20. Intended execution order

Unless an explicit Project Lead decision supersedes this sequence for a documented reason:

```text
1. #276 CORE HIVE INTEGRATION
   - live reads
   - Keychain identity proof
   - deterministic operation review
   - human wallet approval
   - chain read-back

2. CORE HIVE SOCIAL MECHANICS
   - vote/applause
   - follow/unfollow
   - community participation
   - posts/comments
   - voting/resource reads

3. PROVIDER INTERFACE HARDENING
   - SigningProvider
   - SocialProvider
   - VideoProvider
   - LocationProvider
   - FeedProvider
   - CommerceProvider
   - AssetProvider

4. SPK / 3SPEAK MEDIA
   - external media binding
   - graceful degradation

5. LOCATION + FEED INTEROP
   - WorldMapPin-compatible projection
   - RSS / Podcasting 2.0
   - optional Podping signaling

6. COMMERCE QUALIFICATION
   - HBD / V4V / Distriator seam
   - Active-authority consequence boundary
   - receipt/reconciliation contract

7. HIVE ENGINE READS
   - optional host asset/reward/member surfaces
   - no custom-token commitment

8. REOPEN DEFERRED SYSTEMS ONLY WHEN A PRODUCT NEED EXISTS
```

The sequence may be interleaved with non-Hive product remediation, but later provider work must not bypass the earlier authority/reconciliation foundations.

---

# Part V — Governance against drift

## 21. Doctrine precedence

Order of authority:

```text
HIVENUES_END_STATE_PRODUCT_DOCTRINE
    > HIVENUES_HIVE_ECOSYSTEM_INTEGRATION_DOCTRINE
    > explicit phase/issue charter
    > provider adapter contract
    > implementation
    > tests written merely to match implementation
```

The earlier `HIVENUES_ECOSYSTEM_CAPABILITY_INTAKE_0_1_0.md` remains useful research and evidence. Where its classifications conflict with this doctrine, **this doctrine controls**.

---

## 22. Required drift check for future Hive/ecosystem work

Before accepting any Hive/provider phase, the Project Lead must be able to answer yes to all applicable questions:

- Does the canonical HiVenues host/activity identity remain provider-neutral?
- Could the provider be replaced without redefining the host?
- Are customer private keys still outside HiVenues custody?
- Is the required authority tier explicit and minimal?
- Does the human see the real consequence before a write?
- Is wallet approval distinct from canonical confirmation?
- Is duplicate-broadcast risk handled honestly?
- Does provider failure degrade locally rather than corrupt the host?
- Is provider/blockchain language translated into the host's world except at consequence boundaries?
- Does this avoid creating a provider-specific parallel product architecture?
- Are live financial/value-moving effects separately qualified at the stronger authority boundary?

A phase that cannot satisfy these questions must either be redesigned or propose an explicit doctrine amendment.

---

## 23. Amendment rule

This document is intentionally frozen at 0.1.0.

Future implementation, provider popularity, SDK convenience, first-customer pressure or an existing code path is **not** sufficient reason to silently violate it.

A change to these principles requires:

1. an explicit doctrine-revision commit;
2. a documented rationale and tradeoff;
3. identification of which prior invariant changes;
4. Project Lead adjudication;
5. corresponding qualification changes where the consequence boundary changes.

Until that happens, future successors should treat this file as the binding default for Hive and Hive-ecosystem work.
