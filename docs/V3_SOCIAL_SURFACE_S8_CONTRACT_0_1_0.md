# HiVenues v3 Social Surface — S8 Contract 0.1.0

Status: FROZEN S8.0 CONTRACT

## 1. Provenance and governing authority

This contract opens PM4 S8 (`SOCIAL_SURFACE_RECONCILIATION`) from the exact post-cleanup canonical baseline:

```text
ENTRY_COMMIT = 249ecb9ae75562c5b766573fa7f7697491326a8a
ENTRY_TREE   = 0dfbf108c90a04e38949fcae03231aee2157fca2
GOVERNING_ISSUE = #234
ROADMAP = #160
SOCIAL_OBJECT_CONTRACT = #213
PREDECESSOR = #226 / S7
```

S8 follows completed S6 Studio convergence and completed S7 generated-experience visual convergence. It does not reopen their accepted authoring, renderer, source-authority, responsive, accessibility, or side-effect boundaries.

## 2. Product-level purpose

S8 reconciles the live social experience with the accepted v3 product model.

The public product remains **a venue experience first**. Hive identity, community, social interaction, and economic primitives are capabilities underneath that experience rather than the site's foreground information architecture. The venue can use those capabilities without requiring an ordinary operator or visitor to understand Hive implementation vocabulary.

The controlling semantic rule from #213 is:

```text
Venue -> Activity -> transient/social interaction state
Post -> Activity association is explicit when present
```

`Activity` remains the canonical public content/navigation abstraction. An Activity can represent scheduled, recurring, release, promotion, special, ticketed, online, hybrid, or other venue programming already admitted by the v3 source. Event does not return as a competing public taxonomy. Comments, replies, reactions, follows, subscriptions, RSVPs, saves, and other interaction state do not become venue-content authority.

## 3. Evidence model and anti-drift rule

S8 is informed by three evidence lines without treating any one as automatic implementation authority:

1. The original HiVenues founding article/screenshots establish the product intent: a venue-specific experience backed by Hive rather than a generic blockchain application with venue decoration.
2. The mature canonical repository establishes proven safety and operational constraints: typed source authority, read/write separation, explicit identity/authority, preflight review, Keychain user approval, observation, moderation, deployment separation, and deterministic qualification.
3. The independent Astra greenfield challenge is comparative 2026 product/design evidence. Its frozen result may reveal better product abstractions or historical baggage, but it is not canonical source and is not copied into S8 merely because it is newer.

V3 is the synthesis target. Existing implementation does not win merely because it exists; greenfield implementation does not win merely because it is independent.

## 4. Exact live entry inventory

S8 scope is defined only by paths that exist and are live at `ENTRY_TREE`, plus new S8-owned files created from this branch. Stale historical paths, retired sub-app paths, prior handoff guesses, and nonexistent guard scripts are not authority.

### 4.1 Native v3 semantic authority

```text
src/venue/v3/source.js
  blob = ad55c09a92d390be2f8b5305e40ba124d7e76c08

src/venue/v3/renderer/index.js
src/venue/v3/authoring-transaction.js
src/venue/v3/studio-app-core.js
src/venue/v3/studio-app.js
```

At entry, the v3 source owns `Activity` plus optional `community` and `transaction` capabilities. Social reconciliation must project through this model rather than inventing a parallel site taxonomy.

### 4.2 Mounted social write boundary

```text
src/routes/social.js
  blob = 993efd0751b9371c8fd04def03d12ee41d7259c7

src/hive/social-operations.js
  blob = 689c09e8648cf5d08feac78c41f9226bda650fa9

src/app.js
  blob = 601b60cb746de6cd4a1f4430b59a59c792ae01a3
```

The application mounts `/api/social`. The write path already provides app-origin, authenticated-session, CSRF, configured write-mode, signer/author, preflight, Keychain acceptance, observation, and controlled-mode audit boundaries. Social-operation envelopes explicitly use Posting authority.

These are proven safety mechanics. S8 may adapt payload semantics and product language, but it must not casually replace or weaken this substrate.

### 4.3 Mounted public social reads

```text
src/routes/community.js
  blob = 5a37e6a93a16c8297598559e25df60ad625fcfdd

src/routes/profile.js
  blob = 58dd7342aac58c8592158b71155e2a4c527ec7d6

src/hive/read-service.js
  blob = 1de39ce644d409292746a2a0d1cd6c4a00e08ce8
```

The live application exposes community posts/Threads, membership, profile posts, followers/following, follow state, wall/inbox message history, and owner-only account activity. These are real public/social surfaces at entry even where their product framing predates v3.

### 4.4 Live shared UI families

The entry tree includes and renders the shared post/comment/composer/vote/share family and community/profile/post views, including:

```text
views/common/post.ejs
views/common/comment.ejs
views/common/composer.ejs
views/common/composer/*
views/common/vote-form.ejs
views/common/share-action.ejs
views/pages/community/*
views/pages/profile/*
views/partials/full-post.ejs
```

These are eligible for S8 reconciliation only where they remain reached from the mounted entry application. Historical tests or files alone do not make a surface current.

### 4.5 Infrastructure that is not public product taxonomy

Threads operator activation/readiness/signing and controlled-pilot machinery remains important safety/operations infrastructure. It is not, by existence alone, a public v3 concept or a reason to shape the visitor information architecture around Threads administration.

## 5. Baseline findings

The exact entry state is neither a blank slate nor already reconciled.

### 5.1 Proven substrate to preserve

- Social writes are explicit and gated.
- Posting authority is declared in the operation envelope.
- Keychain remains the user's approval boundary for self-signing modes.
- Preflight fingerprints and post-approval observation reduce accidental duplicate/ambiguous writes.
- Controlled mode has separate delegated-identity/operator audit behavior.
- Community/profile reads are separate from mutation code.
- Existing product-framing tests already require local Memo-key decryption and prohibit `Hive-Bar` wording on at least the Inbox surface.

### 5.2 Product/semantic seams to reconcile

- `src/routes/social.js` still contains live HiVenues-facing failure copy naming `Hive-Bar`.
- `src/hive/social-operations.js` still uses `hive-bar` as a generated-permlink fallback.
- Post/thread/comment Hive metadata presently carries Hive tags/app/format/image information but no accepted explicit `Post -> Activity` association.
- Community/profile routes and view hierarchy predate the v3 venue-first semantic model and therefore require adjudication rather than automatic preservation as top-level product taxonomy.
- Operator Threads concerns sit near visitor social code and must remain an explicit infrastructure boundary.

These seams are evidence for reconciliation. They do not authorize broad social feature expansion.

## 6. Frozen invariants

S8 implementation MUST preserve all of the following:

1. One authoritative v3 venue document and one shared renderer family.
2. S7 venue-first generated-experience semantics and side-effect-free rendering.
3. `Activity` as the canonical public content object; no competing Event or social-content taxonomy.
4. Optional capability behavior: a venue without configured community/social capability must still be a complete valid venue experience.
5. Explicit `Post -> Activity` association when an association exists; unassociated general venue/community posts remain representable without fabricating an Activity.
6. Comments/replies/reactions/follows/subscriptions/RSVP/save state remain interaction state, not source-document ownership.
7. Existing app-origin/session/CSRF/write-mode/preflight/Keychain/observation boundaries for user social writes.
8. Posting and Active authority remain distinct; S8 does not smuggle value movement or stronger authority into a Posting-action surface.
9. No server custody of user Posting, Active, Owner, or Memo private keys.
10. No founder/owner-only data fixture may be required for a normal newly registered user's reusable public/social workflow.
11. No new dependency on retired `/Hive-Venues` sub-app routing/storage or other historical topology.
12. No host-specific renderer fork or separate desktop/mobile semantic tree.
13. No implicit Hive RPC write, provider write, signing request, payment, deployment, DNS/VPS mutation, or repository-settings mutation during rendering or qualification.
14. Accessibility, keyboard, focus, responsive, moderation, and failure-state obligations remain real acceptance criteria.

## 7. S8 semantic association rule

When a Hive post is semantically about one canonical Activity, S8 may carry a stable association to that Activity through a bounded, versioned HiVenues metadata field. The association must be validated against the authoritative v3 venue document before the product presents it as an Activity-linked post.

The association must not:

- copy the entire Activity into Hive metadata;
- turn a post into source authority for the Activity;
- require all posts to have an Activity;
- let a reply/comment silently select a different Activity than its parent product context;
- create a retired Event object as an intermediary;
- grant stronger authority than the underlying social operation already requires.

Read paths must fail soft when metadata is absent, malformed, from another venue, or references an unknown Activity. The post remains a post; the UI simply does not claim an Activity association it cannot validate.

## 8. Product-language rule

Ordinary visitor/operator copy should describe the user goal first: venue updates, discussion, follow, reply, RSVP, tickets, messages, community, and similar concepts. Hive may be named where identity, immutability, authority, fees, public-chain persistence, or Keychain approval materially matters.

Historical `Hive-Bar` product naming may remain in immutable history or explicit compatibility identifiers when changing it would break protocol/provenance. It must not remain in new or live HiVenues-facing copy merely from inheritance.

## 9. S8 sequence

```text
S8.0  EXACT-BASELINE INVENTORY + SOCIAL CONTRACT FREEZE
S8.1  V3 SOCIAL SEMANTIC ASSOCIATION / CAPABILITY PROJECTION
S8.2  VENUE-FIRST PUBLIC SOCIAL FRAMING + LIVE-SURFACE RECONCILIATION
S8.3  GENERIC-USER FLOW + DISABLED-CAPABILITY BEHAVIOR
S8.4  CROSS-HOST SOCIAL QUALIFICATION + VISUAL EVIDENCE
S8.5  EXACT CANDIDATE QUALIFICATION / PROVENANCE / S9 HANDOFF
```

Adjacent slices may share an implementation commit only when the semantic authority remains auditable. S8.0 itself precedes behavior mutation.

## 10. Qualification contract

A substantive S8 candidate must at minimum establish:

- existing social-operation, preflight, observation, moderation, identity, and relevant profile/community tests remain green;
- v3 Activity/source/renderer and S7 visual contracts remain green;
- direct S8 tests cover Activity association validation, absent/malformed/foreign/unknown association behavior, optional community capability, and venue-first product language;
- generic-user fixtures do not require founder/official-account identity except where an explicitly privileged operator function is being tested;
- browser evidence covers representative enabled and disabled social capability states when presentation changes are made;
- zero external writes, Keychain approvals, payments, provider mutations, deployments, or infrastructure mutations occur during qualification.

A new S8 visual capture script must be explicitly included in the browser workflow that owns it before S8 accepts its evidence. PR #233 intentionally prevents future S8 capture files from silently falling through both the legacy and dedicated browser workflows.

## 11. Stop and routing rule

If reconciliation demonstrates that the v3 source genuinely lacks a social capability required by the accepted product—not merely one inherited from Hive-Bar—the missing capability must be added through a bounded typed contract with explicit optionality and migration behavior. It must not be smuggled into presentation code or a host-specific branch.

S8 closes only when the **live** HiVenues social experience is a coherent optional capability of the v3 venue/Activity product while the mature Hive safety substrate remains intact.

On successful S8 closure, route to `S9 = measured quality / release gates` under #160.
