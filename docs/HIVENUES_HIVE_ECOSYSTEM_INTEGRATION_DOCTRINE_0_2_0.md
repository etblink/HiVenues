# HiVenues — Hive Ecosystem Integration Doctrine 0.2.0

```text
DOCUMENT = HIVENUES_HIVE_ECOSYSTEM_INTEGRATION_DOCTRINE
VERSION = 0.2.0
STATUS = CANONICAL / FROZEN COMPANION DOCTRINE
PREDECESSOR = docs/HIVENUES_HIVE_ECOSYSTEM_INTEGRATION_DOCTRINE_0_1_0.md
PARENT_DOCTRINE = docs/HIVENUES_END_STATE_PRODUCT_DOCTRINE_0_2_0.md
ARCHITECTURE_COMPANION = docs/HIVENUES_RENDERING_AUTHORING_ARCHITECTURE_DOCTRINE_0_1_0.md
CURRENT_IMPLEMENTATION = NOT DEFINITIONAL
IMPLEMENTATION = SUBORDINATE TO THIS DOCTRINE
AMENDMENT = EXPLICIT VERSIONED REVISION ONLY
```

## 0. Revision model

This document inherits the 0.1.0 Hive Ecosystem Integration Doctrine in full except where strengthened below.

The governing sentence remains:

> **Hive everywhere it is useful; keys nowhere in HiVenues; every consequential write owned by the human wallet.**

The governing product sentence remains:

> **The host’s world becomes the interface to Hive.**

0.2.0 clarifies that “interface to Hive” means real host-native application surfaces, not a generic integrations panel bolted onto a brochure website.

---

# Part I — Hive capabilities belong in the host world

## 1. Hive-backed social/content/value features are frontend capabilities, not dashboard widgets

Where useful to a host, HiVenues should be able to present Hive-backed capabilities as natural parts of the host’s frontend, including:

- host updates/feed;
- long-form posts;
- comments and replies;
- follow/unfollow;
- community subscribe/unsubscribe;
- profile/member/patron surfaces;
- vote/recommend/applause mechanics;
- public resource/reward/capacity state;
- support/tip/value actions;
- commerce/payment actions behind appropriate authority boundaries.

These experiences may have dedicated routes or composition regions.

They should not default to a generic “Hive” page or blockchain dashboard when the capability can be expressed naturally in host language.

---

## 2. The 2024 host-native interaction principle remains normative

The founding bar prototype’s beer-mug voting and pitcher/resource metaphors demonstrated the intended relationship between mechanic and presentation:

- the underlying action remains exact;
- the host may rename it;
- the host may visualize it differently;
- the host may place it in a different interaction context;
- the consequence boundary must still reveal the truth.

Future hosts may use entirely different metaphors.

The system should support expressive SVG/icon/illustration representations of mechanics where appropriate while keeping the canonical mechanic typed and provider-neutral.

This principle applies not only to voting, but also to follow, community, rewards/resources, support, payment and other admitted mechanics.

---

# Part II — Social/content projections

## 3. Hive social state should project into route-level host experiences

The canonical HiVenues host graph should be capable of projecting Hive social/content state into coherent host routes such as:

```text
/community
/updates
/post/:id
/people
/profile/:account
```

Exact routes are composition-dependent and not doctrinally fixed.

The important rule is that these surfaces remain **host-native projections of canonical external Hive state**, not independent shadow data models.

The host may call them by different names and organize them differently.

---

## 4. Do not build an authoritative shadow Hive

Where Hive owns the canonical external primitive, HiVenues should read and reconcile that state rather than inventing a second authoritative social graph/content system.

Examples include:

- account identity;
- posts/comments;
- votes;
- follows;
- community membership/subscription;
- balances and chain-observable value state.

HiVenues may maintain local drafts, presentation metadata, host bindings, moderation/display preferences, caches and degraded-state helpers.

Those must not silently replace the chain/Hivemind state they represent.

---

# Part III — Identity and participation progression

## 5. Public usefulness still comes before wallet ceremony

The preferred visitor progression remains:

> **browse → understand → participate where possible → identify when useful → sign only at consequence**

A host frontend should not open with wallet connection merely because it has Hive-backed features.

Read-only profile/feed/community information may be visible without signing.

Local/accountless actions should remain available where truthful.

Signing appears only when the actual mechanic requires it.

---

## 6. Connected identity should feel like host participation, not provider setup

When a visitor connects a Hive identity, the ordinary public experience should explain the host-level benefit:

- participate as yourself;
- follow this host;
- join the community;
- comment/respond;
- recommend/support;
- carry identity across compatible host experiences.

Provider selection and authority detail belong at the consequence/integration boundary, not as the dominant public mental model.

---

# Part IV — Host-native resource/reward/value surfaces

## 7. Resource and reward state may be visually translated

Read-only Hive state such as balances, voting/resource capacity, reward-related state or other public account state may be projected into host-native UI when that helps the experience.

The presentation may use:

- host-specific labels;
- SVG gauges/metaphors;
- progress/energy/capacity metaphors;
- profile/patron/member presentation;
- composition-specific placement.

But the system must retain access to the exact underlying measurement and explain it truthfully when needed.

A metaphor must never imply value, authority or capability that the underlying state does not provide.

---

## 8. Value movement is visually integrated but authority-separated

A host may present actions such as:

- tip/support;
- pay a tab;
- purchase an Offer;
- contribute to a creator;
- another host-native value action.

The visible action may be deeply integrated into the composition.

Execution still requires:

```text
EXACT OPERATION
→ HUMAN-READABLE CONSEQUENCE
→ AUTHORITY DISCLOSURE
→ USER WALLET APPROVAL
→ BROADCAST
→ CANONICAL READ-BACK / RECEIPT
→ CONFIRMED STATE
```

A beautiful host-native payment control is not permission to weaken the Active-authority or duplicate-submission safety contract.

---

# Part V — Studio integration model

## 9. Hive integration should be progressively disclosed across two surfaces

### Host experience configuration

Creative/semantic controls belong near the thing being designed:

- visitor-facing term;
- icon/metaphor;
- placement;
- explanatory copy;
- degraded/unconnected presentation;
- whether the mechanic appears in this composition.

### Integration/authority configuration

Provider/identity/authority controls belong in deeper integration surfaces:

- verified host/account binding;
- signer availability;
- provider health;
- required authority;
- operation preflight;
- reconciliation evidence;
- disconnect/recovery.

Do not make the operator repeatedly configure blockchain plumbing while simply adjusting how a host action looks.

---

## 10. Voice and presentation remain separate from mechanic identity

The domain relationship is:

```text
MECHANIC = EXACT CONSEQUENCE
VOICE = HOST LANGUAGE
PRESENTATION = DIRECTION/COMPOSITION-SPECIFIC VISUAL FORM
PROVIDER BINDING = EXTERNAL EXECUTION/STATE SOURCE
```

Changing Voice or Presentation must not silently change Mechanic or provider authority.

Changing provider must not require changing the host’s public vocabulary unless the underlying capability itself changes.

---

# Part VI — Rendering architecture for Hive surfaces

## 11. Hive-backed surfaces follow the same server-rendered architecture doctrine

Public Hive-backed feed/profile/community/value surfaces should use the same architectural rules as the rest of HiVenues:

- server-owned canonical/derived state;
- semantic EJS components and fragments;
- composition-specific assemblies;
- HTMX for server-state transitions where useful;
- bounded JavaScript for local/wallet interaction;
- container queries for component-space adaptation;
- media queries for actual viewport/device-shell concerns;
- subgrid selectively where aligned semantic tracks are valuable;
- SVG for accessible vector mechanics/icons where appropriate.

Do not create a separate SPA just for Hive integration unless a future explicit architecture revision proves that necessary.

---

## 12. Composition owns presentation of the same social mechanic

A vote/recommend mechanic may appear very differently in different compositions.

A feed may be:

- dense editorial index;
- visual card stream;
- venue wall;
- artist dispatch log;
- community bulletin;
- another host-appropriate pattern.

The underlying post/vote/comment/follow semantics remain shared.

Do not force every composition to use one generic “Hive post card” partial as its visible design.

Reuse semantic subcomponents and helpers while permitting art-directed markup.

---

# Part VII — Degradation and truth

## 13. Disconnected and degraded states are part of the design

A host frontend with unavailable signer/provider capability should remain useful.

Examples:

- posts can remain readable if signing is unavailable;
- an unavailable vote action can explain itself without breaking the article;
- a disconnected visitor can still browse profiles/community content;
- a commerce-provider outage must not erase Offer information;
- a resource-state read failure must not invalidate the host page.

Degradation should be compositionally integrated, not dumped as raw provider errors.

---

## 14. Pending states deserve first-class visual treatment

Consequential writes may be:

- awaiting wallet approval;
- wallet-approved but not yet observable;
- broadcast/accepted;
- canonically confirmed;
- delayed/unknown;
- failed/rejected.

HiVenues should render these states distinctly and truthfully.

Do not collapse “wallet callback returned” into “done.”

Do not invite duplicate value/social writes through ambiguous retry UX.

---

# Part VIII — Synthetic-first Hive qualification

## 15. End-state Hive capability should be proven on synthetic hosts before Fourth Street

The future synthetic-first Astra campaign should include a fictional feature-saturated host with enough Hive integration to exercise the then-admitted capability set.

Depending on the authorized stage, this may include:

- public account/profile reads;
- feed/posts/comments;
- follow/community state;
- host-native vote/recommend presentation;
- resource/reward reads;
- wallet identity verification;
- explicit user-approved Posting-authority actions;
- chain read-back;
- separately authorized value/commerce flows if that authority phase has already passed.

The specimen must make those capabilities feel like part of the host’s frontend rather than a technology demo.

Only after synthetic independent qualification should the first real customer inherit the capability set.

---

# Part IX — Added drift checks

## 16. Mandatory questions

In addition to the 0.1.0 Hive drift checks, ask:

1. Does this capability appear inside the host’s world or as a generic Hive dashboard/widget?
2. Could a different Direction present the same mechanic in a materially different host-native form?
3. Is the exact Mechanic still typed separately from Voice, Presentation and Provider binding?
4. Does read-only social/content state work without wallet ceremony where possible?
5. Does signing occur only at the real consequence boundary?
6. Can degraded provider state leave the surrounding host page useful?
7. Are route-level feed/post/profile/community surfaces projections of canonical external state rather than shadow systems?
8. Are host-native SVG/metaphor treatments truthful to the underlying state?
9. Has the feature been exercised on synthetic hosts before becoming a first-customer dependency?
10. Could the provider be replaced without redefining the host experience or canonical identity?

---

# Current program implication

```text
#276_CORE_HIVE_SUBSTRATE = ACCEPTED / FROZEN INPUT TO #284 RECONCILIATION
#284_END_STATE_CONVERGENCE = ACTIVE
NEXT_HIVE_WORK = INTEGRATE SOCIAL / CONTENT / HOST-NATIVE SURFACES INTO END_STATE PRODUCT
ASTRA = SYNTHETIC FIRST AFTER INTERNAL GATE
FOURTH_STREET = HOLD
```

---

# Final integration doctrine

> **HiVenues should make Hive capabilities feel as though they belong to the host’s own application: socially and visually translated, operationally exact, provider-neutral, progressively disclosed, and always signed by the human whose authority is actually required.**