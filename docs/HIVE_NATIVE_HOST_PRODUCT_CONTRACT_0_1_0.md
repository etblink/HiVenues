# HiVenues Hive-Native Host Product Contract 0.1.0

## Status and authority

```text
OPERATION = HIVE_NATIVE_HOST_PRODUCT_CONTRACT
TRACKING_ISSUE = #209
CLASS = PRODUCT_ARCHITECTURE_AND_QUALIFICATION_CONTRACT_ONLY
CANONICAL_BASE_COMMIT = e72d8cabd0df85ecb1b23a3a80b5d0fcdadaae92
CANONICAL_BASE_TREE = 138484693aa9e65e8b6e0fc72a0136637532eff0
CANONICAL_BASE_CI = 764__PASS
IMPLEMENTATION_AUTHORIZATION = NO
SCHEMA_MUTATION = NO
PRODUCTION_MUTATION = NO
LIVE_HIVE_EFFECT = NO
ASTRA_CODE_PORT = NO
```

This contract translates the accepted HiVenues product doctrine into a universal product architecture that must remain coherent across physical venues and non-physical creator/performer hosts.

It answers one question:

> **What must be true of every fully qualified HiVenue?**

It does not implement the answer.

The separately routed `HOST_ACTIVITY_SOCIAL_OBJECT_CONTRACT` remains responsible for the detailed event/livestream/show/release ↔ Hive content identity model. This contract deliberately does not freeze author/permlink creation timing, activity mutation semantics, or activity-specific signing.

---

## 1. Governing product definition

HiVenues gives a **host identity** its own purpose-built Hive frontend.

The host supplies:

- brand and visual identity;
- context and vocabulary;
- public facts and domain content;
- programming/activity model;
- audience relationship;
- product goals.

Hive supplies:

- portable public identity;
- public content and conversation;
- social relationships and participation;
- community context;
- curation/reward semantics;
- economic primitives where the host enables them.

HiVenues translates Hive into the language and experience of the host while preserving semantic truth at every consequence boundary.

```text
HOST_IDENTITY_FIRST_EXPERIENCE
+
HIVE_FOUNDATIONAL_INFRASTRUCTURE
+
DOMAIN_NATIVE_TRANSLATION
=
HIVENUES
```

The product is not a generic website builder with an optional blockchain plug-in, and it is not a generic Hive frontend with interchangeable branding.

---

## 2. Universal host concept

A `host identity` is the stable real-world or creator-led subject whose context organizes the experience.

Examples include:

- a bar, restaurant, workshop, club, store, gallery, or local venue;
- a streamer, influencer, comedian, podcaster, artist, DJ, or other creator;
- a band or performance group;
- a brand, organization, club, collective, or community;
- an event-centered or recurring-program identity.

### 2.1 Universal host properties

Every fully qualified HiVenue has, conceptually:

1. one stable HiVenues host identity;
2. a human-readable display identity and brand;
3. one coherent public experience rendered from canonical semantic source;
4. a validated public Hive identity binding for the host;
5. a validated Hive-native social root for public community/content context;
6. a public read path that does not require a wallet or signing action;
7. a portable audience identity path using the audience member's own Hive account;
8. at least one meaningful explicit signed Hive participation loop;
9. truthful consequence/reconciliation behavior for that signed loop.

A physical address, storefront, merchant role, payment recipient, ticket provider, menu, or Threads automation account is **not** universal.

### 2.2 Host identity is not identical to a Hive account

The HiVenues host identity is a product/domain identity. It may be bound to one or more Hive protocol identities, but the two concepts are not interchangeable.

This preserves stable HiVenues identity if a supported public integration role changes while avoiding a proprietary social identity layer for users.

---

## 3. Foundational Hive substrate

The accepted doctrine says Hive is foundational. This contract gives that statement a testable meaning.

A fully qualified HiVenue must satisfy all five foundational domains below.

### H1 — Host public Hive identity

A host has a validated **official public Hive account** or equivalent later-approved Hive account binding representing the host in public social/publishing contexts.

For a physical merchant, this account may also be the merchant/payment identity.

For a creator, band, comedian, streamer, or organization, it may simply be the official creator/group account.

Merchant semantics do not follow merely from being the official host account.

### H2 — Hive-native social root

A host has a validated public social root through which audience members can understand the host's Hive-native community/content context.

Initial conceptual social-root classes are:

```text
ACCOUNT_ROOTED
COMMUNITY_ROOTED
HYBRID
```

- `ACCOUNT_ROOTED` — the official host account and its public content/social relationships are the principal root.
- `COMMUNITY_ROOTED` — a Hive Communities community is the principal context, with the host's official account retaining an explicit relationship to it.
- `HYBRID` — both account and community roots are first-class and intentionally linked.

The exact future source syntax is not frozen here.

### Critical distinction

```text
COMMUNITY_AS_PRODUCT_DIMENSION = UNIVERSAL
HIVE_COMMUNITIES_PROTOCOL_OBJECT = CONDITIONAL
```

HiVenues must always provide a meaningful audience/community relationship. It must **not** force every streamer, artist, comedian, band, or brand to create a Hive Communities object merely to satisfy an implementation assumption.

### H3 — Portable audience Hive identity

Audience social identity is the user's Hive identity.

HiVenues must not create a proprietary HiVenues social-account system merely to hide Hive.

Anonymous/public visitors may browse without authentication. When identity is required for a Hive action, the product uses a user-controlled Hive authentication/signing path.

Local preferences or non-identity convenience state may exist, but they cannot masquerade as a separate social identity graph.

### H4 — Public Hive read projection

A fully qualified HiVenue exposes at least one host-native public projection of real Hive state, such as:

- official posts/updates;
- community posts;
- conversation/replies;
- audience/member relationship state;
- public profile/social identity;
- curation/reward context;
- another later-approved real Hive projection.

The surface may use host-native language and visual treatment. It may not invent engagement or pretend local demo state is canonical Hive state.

### H5 — Signed participation loop

A fully qualified HiVenue demonstrates at least one meaningful audience action that produces a real, explicit Hive operation under user-controlled authority and then reconciles against canonical/authoritative read state.

Examples include, where supported:

- vote/curate/support-by-vote;
- reply/comment;
- follow/unfollow;
- subscribe/unsubscribe to a Hive Community;
- publish a post/Thread;
- another later-approved social operation.

The exact minimum action set may vary by archetype. The requirement that **at least one real signed participation loop exists** does not.

A brochure experience with a Hive logo or read-only account link is not, by itself, a fully qualified HiVenue.

---

## 4. Source validity is not product qualification

The mature v2 architecture correctly needs valid intermediate states in which Hive bindings are absent or temporarily unavailable.

This remains accepted.

```text
SCHEMA_REPRESENTABILITY != PRODUCT_QUALIFICATION
```

Conceptual lifecycle:

```text
SOURCE_VALID_UNBOUND
    |
    v
HIVE_IDENTITY_BOUND
    |
    v
SOCIAL_READ_READY
    |
    v
SIGNED_PARTICIPATION_READY
    |
    v
HIVENUE_PRODUCT_QUALIFIED
```

### 4.1 `SOURCE_VALID_UNBOUND`

Useful for:

- fresh authoring before integration setup;
- synthetic fixtures;
- local/offline development;
- migration;
- incomplete setup that must fail closed.

This state may render a public preview. It may not be presented as proof that the product is a fully qualified HiVenue.

### 4.2 `HIVE_IDENTITY_BOUND`

The host's public Hive identity and intended social-root binding are complete and valid at the source/integration layer.

Binding does not itself grant private authority or production activation.

### 4.3 `SOCIAL_READ_READY`

The runtime can resolve the bound public Hive identities and render truthful public Hive state with honest unavailable/empty/error states.

### 4.4 `SIGNED_PARTICIPATION_READY`

At least one host-native social action has the correct user-controlled authority path, preflight/review semantics, cancellation/failure behavior, broadcast path, and post-operation reconciliation.

### 4.5 `HIVENUE_PRODUCT_QUALIFIED`

The host satisfies the complete universal product contract, including semantic site quality, Hive-native read and participation, responsive/accessibility requirements, and exact release qualification.

---

## 5. Qualification versus runtime health

A previously qualified HiVenue does not cease to be architecturally qualified merely because a Hive RPC endpoint is temporarily unavailable.

The runtime must distinguish:

```text
PRODUCT_QUALIFICATION
!=
CURRENT_EXTERNAL_SERVICE_HEALTH
```

During Hive read degradation:

- host-owned public facts and safe cached/static experience may remain available;
- social surfaces must show an honest unavailable/degraded state;
- stale data must not be presented as confirmed live state when freshness matters;
- signed actions must fail closed if safe preflight/broadcast/reconciliation cannot be completed;
- the application must not silently substitute fabricated local success.

---

## 6. Ownership and authority domains

The next generation preserves the mature separation between source truth, Hive truth, and deployment truth.

### 6.1 HiVenues canonical source owns

- host/domain identity;
- host display facts and vocabulary;
- managed public media references;
- semantic site composition;
- stable domain resources;
- approved design tokens/recipes;
- public integration bindings and intended capability configuration;
- operator-authored presentation/content that is not itself on-chain state.

### 6.2 Hive owns

- Hive account identity/state;
- posts/comments and author/permlink identity;
- votes and reward state;
- follows;
- Hive Community membership/subscription/moderation state;
- balances and chain economic state;
- any other canonical chain state.

HiVenues may project and reconcile Hive state. It may not redefine it locally as canonical truth.

### 6.3 Deployment/runtime owns

- deployment identity and host/service routing;
- environment and activation state;
- secrets/private credentials;
- production signer activation;
- health/readiness;
- rollback/recovery state;
- caches whose authority is explicitly subordinate to canonical source/Hive state.

### 6.4 User signer owns

Interactive user authority remains user-controlled, normally through Hive Keychain or another separately accepted user-controlled signer.

No product-language improvement may silently turn an interactive user action into ambient server authority.

---

## 7. Two approvals: authoring/release versus Hive signing

HiVenues must keep ordinary host/site authoring distinct from Hive transactions.

```text
SITE_SOURCE_MUTATION != HIVE_TRANSACTION
SITE_RELEASE != HIVE_PUBLISH
HIVE_PUBLISH != PRODUCTION_DEPLOY
```

An operator may edit brand copy, schedule data, media, or composition without signing a Hive transaction merely because the product is Hive-native.

A Hive publish, vote, follow, subscription, transfer, or other chain operation requires an explicit authority path appropriate to the actual operation.

A future workflow may intentionally coordinate source and Hive actions, but the product must still expose which authority domain is changing and what happens if only one side succeeds.

---

## 8. Translation and semantic-truth contract

The principal UX rule is:

```text
PRESERVE_REAL_HIVE_SEMANTICS
+
TRANSLATE_INTO_HOST_NATIVE_LANGUAGE
+
REVEAL_PROTOCOL_DETAIL_WHEN_CONSEQUENCE_OR_AUDIT_REQUIRES_IT
```

### 8.1 Translation is allowed

Examples:

- a bar may represent curation weight through venue-native language/visual metaphor;
- a streamer may label a vote-based action as audience support/boosting where the copy remains truthful;
- a band may present a Hive conversation as fan discussion;
- a host may call a Community subscription “Join the community.”

### 8.2 Semantic deception is forbidden

A translated action must not misstate what occurs.

Examples:

- “Support” must distinguish a Hive vote from a token transfer when that distinction matters;
- a public reply must disclose that it becomes public Hive content before signing;
- a transfer/payment flow must disclose asset, amount, sender, recipient, and authority before signing;
- a vote-weight metaphor must still expose the actual percentage/consequence in the review seam where needed;
- no successful-looking state may appear before authoritative broadcast/reconciliation.

Host-native language is a presentation layer over real protocol semantics, not permission to invent different semantics.

---

## 9. Universal Studio and generated-experience obligations

A next-generation HiVenues Studio remains semantic, not free-form.

Every fully supported archetype must use the same architectural family:

```text
SEMANTIC_SOURCE
-> TYPED AUTHORING COMMANDS
-> REAL RENDERER PREVIEW
-> VALIDATED PERSISTENCE
-> RESPONSIVE GENERATED EXPERIENCE
```

Universal obligations:

1. canonical stable identities are not array positions;
2. one responsive semantic source drives desktop/tablet/mobile;
3. the Studio previews the real renderer;
4. operator changes use typed/validated state rather than arbitrary DOM/CSS edits;
5. proposal/Apply/Discard and stale-input protection remain where consequence requires them;
6. Undo/Redo/history and explicit persistence remain deterministic;
7. accessibility semantics are part of validity, not a later cosmetic pass;
8. design recipes remain bounded and host-expressive rather than generic CSS authority;
9. a new archetype may add semantic vocabulary/registry kinds only through governed extension, not a renderer fork;
10. visual quality is a release criterion independent of schema validity.

A streamer must not need a separate “streamer app” codebase, and a restaurant must not need a separate “restaurant renderer” merely to look appropriate.

---

## 10. Universal versus conditional product model

The following classification is controlling for later schema and PM4 re-audit work.

### 10.1 UNIVERSAL — every fully qualified HiVenue

- stable host identity;
- brand/display identity;
- semantic public experience;
- responsive/accessibility baseline;
- official public Hive account binding;
- Hive-native social root;
- public Hive read projection;
- portable audience Hive identity;
- at least one explicit signed participation loop;
- truthful authority/consequence review;
- canonical post-action reconciliation;
- semantic Studio/real-renderer authoring model;
- deterministic provenance/release qualification.

### 10.2 CONDITIONAL BY HOST TRAIT / ARCHETYPE

Examples include:

- street address, map, hours, visit information;
- reservations/bookings;
- menus and hospitality offerings;
- equipment/availability status;
- age/access rules;
- livestream schedule and external stream destinations;
- episodes/releases/clips/media catalog;
- tour dates and ticket links;
- merch/product links;
- services/commissions;
- member/program schedules;
- local payment/tab workflow.

Absence of an irrelevant physical-business field is not a product defect for a non-physical host.

### 10.3 CONDITIONAL HIVE INTEGRATION / OPERATING ROLES

- Hive Communities `communityId`;
- Threads container account;
- machine-managed Threads root lifecycle;
- merchant/payment recipient role;
- onboarding creator account;
- beneficiary policy;
- RC sponsor/delegator;
- moderation/staff role delegation;
- wallet/reward-claim surface;
- private messaging;
- Distriator/V4V or later external Hive-adjacent services.

These roles must be introduced only when the host/product feature actually needs them.

### 10.4 SECURITY-PRIVILEGED CONDITIONAL CAPABILITIES

- token transfer/payment;
- authority mutation;
- machine private-key activation;
- beneficiary changes;
- account creation/onboarding with value-bearing resources;
- any operation requiring Active/Owner authority or equivalent high-consequence permissions.

No fully qualified HiVenue is required to enable these merely to prove Hive nativeness.

---

## 11. Official host account and least-privilege rule

The existing Fourth Street identity/key-minimization result remains valid for its operating topology, but it is not a universal archetype count.

For the universal product contract:

```text
MINIMUM_UNIVERSAL_PUBLIC_HOST_HIVE_ACCOUNT = 1
UNIVERSAL_THREADS_AUTOMATION_ACCOUNT = NO
UNIVERSAL_MERCHANT_ACCOUNT_ROLE = NO
UNIVERSAL_SERVER_PRIVATE_KEY = NO
```

The official account may legitimately serve multiple roles when doing so is semantically and operationally safe.

A dedicated machine account may be introduced only for a feature that has a concrete machine-signing need. If introduced:

- the account must be low-value where practical;
- the credential class must be the minimum exact authority required;
- Active/Owner private keys remain outside server custody unless a future separately governed security decision proves otherwise;
- machine operation and unrelated liquid-funds cleanup/payment authority may not be coupled merely for convenience.

---

## 12. Host social-root contract

A social root is not merely a navigation link. It determines how the host's public Hive activity and audience relationship are organized.

### ACCOUNT_ROOTED

Appropriate when the host itself is naturally the social nucleus, such as many creators, performers, bands, or brands.

Expected product behavior may include:

- official-account posts/updates;
- replies/conversations around those posts;
- follow/unfollow;
- vote/support-by-vote;
- profile/social context.

### COMMUNITY_ROOTED

Appropriate when a shared group context is primary, such as a venue community, club, collective, or topic-centered host.

Expected product behavior may include:

- community posts;
- Threads where supported;
- subscribe/unsubscribe;
- community conversation;
- official host posts clearly identified within that context.

### HYBRID

Appropriate when both host-account publishing and a Hive Community are materially important.

The product must explain the relationship rather than expose two unrelated social silos.

### Invariant

Changing social-root class is an integration-level operation, not ordinary page-copy editing.

The exact source fields and migration rules are deferred to a later implementation contract.

---

## 13. Content, rewards, and economic semantics

Hive-native does not mean every host must have a wallet dashboard or token-transfer checkout.

It does mean HiVenues must preserve the fact that real Hive content and curation can have reward/economic consequences.

Rules:

- real Hive posts/comments remain identified as real public Hive content at the consequence/review boundary;
- vote/curation interactions preserve real vote semantics;
- payout/reward information, when shown, comes from authoritative Hive data and is not fabricated;
- reward-bearing content may be translated into host-native presentation without pretending rewards are proprietary HiVenues points;
- explicit token transfer/payment is a separate conditional capability with stricter review and authority requirements;
- “support” by vote and “support” by transfer must never be silently conflated.

---

## 14. Host publishing contract

A fully qualified HiVenue must have a coherent host-side route to public Hive communication, but this contract does not require one universal signer topology.

Acceptable future patterns may include:

- operator self-signing through Keychain as the official host account;
- authorized staff self-signing under supported Hive/community roles;
- a narrowly scoped separately authorized machine Posting signer for a justified automation role;
- another later accepted least-privilege pattern.

The universal rules are:

1. the publisher identity is explicit;
2. the authority class is explicit;
3. ordinary Studio Save/Release does not silently publish on Hive;
4. server custody is not introduced merely to reduce clicks;
5. successful publication is reconciled to canonical Hive content identity/state.

Detailed activity-linked publication is deferred to the social-object contract.

---

## 15. Reference-pressure adjudication

This contract is intentionally tested against two unlike host classes.

### Reference pressure A — Fourth Street-style physical venue

A valid physical-host realization can include:

```text
HOST = physical local venue
OFFICIAL_HIVE_ACCOUNT = venue-controlled official account
SOCIAL_ROOT = COMMUNITY_ROOTED or HYBRID
PUBLIC_SITE = brand + visit + schedule/events + community context
AUDIENCE_IDENTITY = user Hive account
SIGNED_LOOP = vote/reply/subscribe/follow as supported
LOCATION_HOURS = PRESENT
MERCHANT_PAYMENT = CONDITIONAL
THREADS_AUTOMATION = CONDITIONAL
```

This reference proves local-place and merchant pressure without making merchant/payment/location universal.

### Reference pressure B — synthetic creator/streamer with no public location

A valid non-physical realization can include:

```text
HOST = creator / streamer
OFFICIAL_HIVE_ACCOUNT = creator-controlled official account
SOCIAL_ROOT = ACCOUNT_ROOTED or HYBRID
PUBLIC_SITE = brand + current/next activity + latest work + community conversation
AUDIENCE_IDENTITY = user Hive account
SIGNED_LOOP = vote/reply/follow or another supported social action
PUBLIC_STREET_ADDRESS = ABSENT
MERCHANT_ROLE = NOT_REQUIRED
THREADS_AUTOMATION = NOT_REQUIRED
LOCAL_PAYMENT_TAB = NOT_REQUIRED
```

This reference must be able to reach full qualification without fake address, fake merchant, or venue-specific fields.

### Generality verdict

If either reference requires a bespoke source envelope or renderer fork, the architecture has failed the generality contract.

---

## 16. Additional archetype pressure matrix

| Archetype | Universal Hive-native core | Typical conditional domain pressure |
| --- | --- | --- |
| Bar / restaurant | official account + social root + public read + signed participation | location, hours, menu, events, reservation, payment |
| Streamer | official account + social root + public read + signed participation | stream schedule, platform destinations, clips, recurring live sessions |
| Comedian | official account + social root + public read + signed participation | tour dates, ticket links, clips/specials, fan discussion |
| Band / performer | official account + social root + public read + signed participation | releases, shows, media, merch/tickets |
| Influencer / creator | official account + social root + public read + signed participation | latest work, campaigns, collaborations, media |
| Brand / organization | official account + social root + public read + signed participation | products/projects, announcements, programs, events |

This matrix does not create six products. It creates six pressures on one semantic platform.

---

## 17. Product-facing vocabulary and compatibility vocabulary

The broader product concept uses `host` because `venue` is too narrow for creator-led identities.

The mature implementation contains accepted `venue` identifiers in source schemas, paths, CLIs, tests, deployment records, and production compatibility seams.

Therefore:

```text
HOST = CURRENT PRODUCT CONCEPT
VENUE = ACCEPTED IMPLEMENTATION/PROVENANCE COMPATIBILITY VOCABULARY
```

This contract does **not** authorize a repository-wide rename.

A later implementation plan must change vocabulary only where it materially improves product correctness/generalization and can preserve migration/provenance safely.

---

## 18. Failure modes this contract forbids

A candidate next-generation HiVenues architecture fails if it does any of the following:

1. qualifies a brochure-only host as complete merely because it can render pages;
2. requires a physical address for every host;
3. requires a merchant/payment role for every host;
4. requires a Hive Communities object for every host;
5. invents a proprietary HiVenues audience identity graph;
6. presents local/demo engagement as canonical Hive state;
7. makes public reading require Keychain/signing;
8. makes ordinary Studio editing implicitly broadcast Hive operations;
9. hides the economic difference between a vote and a transfer;
10. grants server signing authority merely because Hive is foundational;
11. forces creators and physical venues into separate source models or renderer forks;
12. exposes raw Hive jargon everywhere instead of translating it contextually;
13. translates Hive so aggressively that users cannot tell what they are signing;
14. treats temporary RPC failure as permission to fabricate success;
15. weakens accessibility, provenance, deterministic CI, rollback, or production safety for visual polish.

---

## 19. Implementation consequences — routing only

This product contract implies future architecture work, but authorizes none of it.

Likely later implementation questions include:

- whether the v2 `venue` root evolves, is wrapped, or remains a compatibility representation behind a broader host projection;
- how `officialAccount` and social-root bindings are represented without making Community optional in the old product-doctrine sense;
- how current `capabilities.community` disabled/configured states map to authoring/preconnection versus product qualification;
- how ACCOUNT_ROOTED and HYBRID social roots project into navigation/components;
- which typed Studio flows configure host identity and Hive social roots;
- which creator-focused semantic components/resources are needed;
- how existing Fourth Street-specific identity roles remain valid without becoming universal.

These are implementation-design questions, not permissions to mutate the repository runtime now.

---

## 20. Required successor operation

After this contract is accepted, the next separately governed product-design operation is:

```text
HOST_ACTIVITY_SOCIAL_OBJECT_CONTRACT
```

That operation should decide how a meaningful host activity—event, livestream, show, premiere, AMA, release, tour date, recurring program, or equivalent—can retain durable Hive social identity without duplicating domain truth.

It must bind author/permlink identity, creation timing, update/cancellation semantics, signer model, failure/reconciliation behavior, and migration separately.

---

## 21. Acceptance criteria

`HIVE_NATIVE_HOST_PRODUCT_CONTRACT` is acceptable only if all of the following remain true:

1. exact base is `e72d8cabd0df85ecb1b23a3a80b5d0fcdadaae92`;
2. operation remains documentation/product-architecture only;
3. historical PM1/PM2 records are not rewritten;
4. no source/schema/parser/runtime/test/workflow file changes;
5. no production or Hive external effect;
6. host scope includes physical and non-physical identities;
7. official public Hive account is universal for full product qualification;
8. community as a product dimension is universal while Hive Communities object is conditional;
9. public reading remains unsigned;
10. audience social identity remains portable Hive identity;
11. full product qualification requires at least one explicit signed Hive participation loop;
12. signer authority remains least privilege and consequence-bound;
13. site release, Hive publish, and production deploy remain separate authority domains;
14. source validity/preconnection remains distinguishable from product qualification;
15. physical and synthetic creator/streamer pressure both fit without custom source/renderer forks;
16. payment, merchant, Threads automation, and street location remain conditional rather than universal;
17. semantic Studio, real-renderer preview, accessibility, provenance, and deterministic qualification remain preserved;
18. exact-head repository CI passes without weakening an oracle;
19. detailed host-activity social-object design remains unstarted by this operation.

## Hard stop

```text
HIVE_NATIVE_HOST_PRODUCT_CONTRACT = DESIGN_ONLY
IMPLEMENTATION = NOT_AUTHORIZED
SOURCE_SCHEMA_MIGRATION = NOT_AUTHORIZED
HOST_ACTIVITY_SOCIAL_OBJECT_CONTRACT = NEXT__SEPARATE_OPERATION
ASTRA_ADVERSARIAL_REVIEW = LATER__AFTER_CANONICAL_NEXT_GEN_IMPLEMENTATION_FREEZE
PRODUCTION_TRANSITION = WITHHELD
LIVE_HIVE_EFFECT = NOT_AUTHORIZED
```
