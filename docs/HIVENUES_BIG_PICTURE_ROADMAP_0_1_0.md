# HiVenues — Big-Picture Product Roadmap 0.1.0

```text
DOCUMENT = HIVENUES_BIG_PICTURE_ROADMAP
VERSION = 0.1.0
STATUS = CANONICAL / FROZEN EXECUTION ROADMAP
PARENT_DOCTRINES =
  docs/HIVENUES_END_STATE_PRODUCT_DOCTRINE_0_2_0.md
  docs/HIVENUES_CANONICAL_USER_JOURNEY_0_2_0.md
  docs/HIVENUES_HIVE_ECOSYSTEM_INTEGRATION_DOCTRINE_0_2_0.md
  docs/HIVENUES_DISTRIBUTION_ONBOARDING_DEPLOYMENT_DOCTRINE_0_1_0.md
  docs/HIVENUES_RENDERING_AUTHORING_ARCHITECTURE_DOCTRINE_0_1_0.md
SCOPE = PROGRAM SEQUENCING, PHASE GATES, ANTI-DRIFT ORIENTATION
IMPLEMENTATION = SUBORDINATE TO DOCTRINE AND THIS ROADMAP
CURRENT_IMPLEMENTATION = EVIDENCE / NOT DEFINITIONAL
CURRENT_STATE_POINTER = docs/ROADMAP.md + ACTIVE ISSUE / WORKSTREAM CHARTER
AMENDMENT = EXPLICIT VERSIONED REVISION ONLY
```

## 0. Why this roadmap exists

HiVenues is now large enough that sequential drift is a major program risk.

A project can drift even when every local decision is individually reasonable:

- the adjacent code makes one feature easy to add;
- a green test suite encourages another incremental extension;
- a convenient provider API starts shaping the product model;
- visual polish is applied to the wrong product surface;
- customer-specific needs arrive before the general product is ready;
- deployment and onboarding are postponed as “release engineering” even though they are part of the nondeveloper promise.

The doctrine set protects HiVenues from **conceptual drift**.

This roadmap protects HiVenues from **sequential drift**: doing sensible things in an order that slowly carries the product away from its intended end state.

This document is not a giant backlog. It is the shortest durable explanation of:

- the program's major sequence;
- where the product is going;
- why the major phases are ordered this way;
- what each phase must visibly prove before the next one opens;
- what kinds of work remain intentionally held until their proper phase.

Current program state belongs in `docs/ROADMAP.md` and the active issue/workstream charter, not in this frozen roadmap.

The roadmap may be revised when evidence changes the optimal sequence. Revision must be explicit and versioned. Implementation momentum may not silently rewrite it.

---

# Part I — Permanent orientation

## 1. North Star

> **The host’s world becomes the interface to Hive.**

HiVenues is a **premium, host-first frontend factory for Hive**.

The end-state product allows a nondeveloper to:

1. obtain and install HiVenues without developer tooling;
2. create a distinctive professional host territory;
3. progressively author pages, content, media, participation, social/community and appropriate value capability;
4. connect or create Hive identity only when useful;
5. Review and Release deliberately;
6. deploy without a terminal;
7. connect a domain and obtain HTTPS through a guided product flow;
8. operate, update, recover and roll back the host over time.

A beautiful generator that ends at local preview is incomplete.

A deployable website builder that exposes generic blockchain UX is incomplete.

A Hive application that visually treats every host the same is incomplete.

The complete product must satisfy all three dimensions simultaneously:

```text
HOST-SPECIFIC CREATIVE PRODUCT
        +
HIVE-NATIVE PARTICIPATION / PORTABILITY
        +
NONDEVELOPER OPERATIONAL LIFECYCLE
```

---

## 2. Governance hierarchy

For program decisions, use this order:

```text
CANONICAL PRODUCT / JOURNEY / HIVE / DISTRIBUTION / ARCHITECTURE DOCTRINES
        ↓
BIG-PICTURE PRODUCT ROADMAP
        ↓
CURRENT PROGRAM MARKER / ACTIVE CHARTER
        ↓
BOUNDED WORKSTREAM
        ↓
ISSUE / PR / IMPLEMENTATION
        ↓
TESTS WRITTEN TO PROTECT THOSE CONTRACTS
```

If a lower layer conflicts with a higher layer, surface the conflict explicitly.

Do not “fix” doctrine or roadmap by making tests agree with implementation.

---

## 3. Permanent anti-drift questions

Before opening any major workstream, answer:

1. **Which roadmap milestone does this advance?**
2. **Why is this the right time for it?**
3. **What user-visible or operator-visible capability will exist afterward that does not exist now?**
4. **What existing truth must be preserved?**
5. **What remains intentionally out of scope?**

At acceptance, answer:

1. **What roadmap gate did the evidence actually close?**
2. **Did we improve the product, or merely add architecture?**
3. **Did exact-head screenshots/browser evidence meet the professional 2026 bar?**
4. **Did the work create a new hidden dependency on a provider, customer, framework or implementation accident?**
5. **Is the next roadmap milestone still the highest-value next move?**

For any attractive new feature, ask:

> **Required now, required later, or not required?**

Do not implement “later” merely because the adjacent code makes it convenient.

---

# Part II — Program eras

## Era 0 — Reliable Candidate substrate

### Required foundation

This era establishes and thereafter preserves hard operational truths including:

- canonical server-owned host state;
- durable object identity;
- Working versus Live separation;
- explicit first Release;
- immutable Release History;
- working-only Restore;
- stale edit / stale Release / stale urgent rejection;
- urgent live-first isolation from unrelated draft work;
- restart persistence;
- Activity lifecycle truth;
- local media/logo/focal support and safe failure boundaries;
- Preview versus public continuity;
- built-in responsive review plus native-mobile qualification;
- consequence truth and Voice separation;
- bounded client-side interaction state;
- no unauthorized external effects.

### Program rule

Do not keep rebuilding this substrate simply because later features create new surface area.

Extend it deliberately while preserving its contracts.

---

## Era 1 — Territory architecture

### Canonical evidence

#285 / PR #286 established the Territory Kernel v2 vertical slice.

It proved:

- HostGraph v1/v2 coexistence without silent historical migration;
- one server-owned semantic territory projection;
- multi-route public and Working Preview surfaces;
- route-context truth across Working and Live;
- same semantic host rendered through materially different Poster, Editorial and Hospitality territory grammars;
- Studio route-aware Working review;
- exact-head desktop/native-390 visual evidence;
- accepted CI modernization reconciliation;
- zero unauthorized external effects.

### Gate closed

> **One canonical semantic host can project into a real multi-page territory and materially different Directions without losing state truth.**

### Program rule

Once this gate is closed, territory architecture is foundation rather than an excuse to remain in architecture work.

Subsequent work must make that territory fully constructible and operable through normal product workflows.

---

# Part III — Convergence sequence

## Era 2 — Complete Territory Authoring

### Purpose

Turn the proven territory model into a complete creative product for a nondeveloper.

### Required operator-authored domains

Through ordinary Studio workflows, the operator should be able to create and maintain, as applicable:

- host identity and presence;
- navigation / semantic route structure;
- Activities;
- Offers / menu / catalog-like content;
- long-form stories/posts;
- short-form Updates / microblogging content;
- people / profiles;
- gallery / media groupings;
- About / Visit / Contact;
- Voice and participation language;
- Direction/composition choice;
- bounded typography, density, hierarchy and media treatment;
- responsive/focal decisions.

Short-form content is a first-class semantic capability. The canonical abstraction should remain provider-neutral (for example `Update` / short-form content), while Voice and presentation may call it Threads, Snaps, Dispatches, Notes, From the Bar, or another host-native term.

INLEO Threads and PeakD Snaps are future product references, not canonical product abstractions.

### Studio requirements

- canvas-first;
- contextual/direct editing where practical;
- progressive disclosure;
- coherent SVG utility icon system;
- no Basic/Advanced fork;
- no ordinary raw JSON/CSS/source escape hatch;
- no second client-side host model;
- mobile interaction designed around tasks rather than compressed desktop panels.

### Exit gate

> **A capable nondeveloper can recreate the feature-rich synthetic reference host entirely through supported Studio workflows, with no fixtures, source editing, JSON editing, CLI or terminal.**

### Held during this era

- live Hive broadcast as a requirement;
- production deployment;
- value movement;
- customer-specific Fourth Street work.

---

## Era 3 — Host-Native Social & Community Experience

### Purpose

Make the territory behave like a real application rather than a static multi-page website.

### Capability target

- short-form feed / Updates;
- long-form post/detail;
- replies/comments/discussion;
- profiles/member/patron surfaces;
- community/member views;
- follow/subscription/recommendation affordances;
- host-native participation vocabulary;
- useful disconnected/degraded states.

### Product rule

These must feel like natural parts of the host world, not one generic Hive social UI inserted into every composition.

The same semantic capability may become:

- venue wall;
- editorial ticker;
- creator dispatch stream;
- community bulletin;
- visual card stream;
- another Direction-specific form.

### Exit gate

> **A synthetic host can express a coherent social/content experience across multiple Directions while preserving the same semantic truth and without displaying a generic blockchain dashboard.**

---

## Era 4 — Real Hive-Backed Participation

### Purpose

Bring accepted Hive capability substrate underneath the now-valid host-native product surfaces.

### Preferred sequence

```text
PUBLIC READS
→ ACCOUNT / PROFILE STATE
→ COMMUNITY / CONTENT STATE
→ IDENTITY PROOF
→ FOLLOW / COMMUNITY ACTIONS
→ POST / UPDATE / REPLY
→ VOTE / RECOMMEND / APPLAUSE
→ RESOURCE / REWARD STATE
→ LATER VALUE ACTIONS
```

### Governing separation

```text
MECHANIC = exact consequence
VOICE = host language
PRESENTATION = Direction/composition-specific visual form
PROVIDER BINDING = external execution/state source
```

### Visitor progression

> **browse → understand → participate where possible → identify when useful → sign only at consequence**

### Short-form integration rule

When implementing Hive-backed short-form content, inspect current INLEO Threads, PeakD Snaps and Hive/Hivemind conventions for product and interoperability lessons.

Do not freeze HiVenues to either frontend’s terminology or implementation convention.

A dedicated Threads/service account is permissible only if concrete implementation evidence proves it necessary. It is not part of the canonical product abstraction.

### Exit gate

> **The same host-native social/content experience can use real Hive-backed identity/state/actions under the accepted authority ceiling without exposing provider ceremony as the primary UX.**

---

## Era 5 — Product Distribution

### Purpose

Prove that HiVenues itself can be obtained and started by a nondeveloper.

### First practical target

A signed/qualified **Windows installation path** may be the first complete distribution proof, followed by other supported platforms.

### Ordinary operator journey

```text
GitHub Release / first-party release channel
→ download installer
→ install
→ launch HiVenues Studio
→ local workspace opens
```

Not:

```text
git clone
npm install
.env
terminal
```

### Architecture rule

Packaging may preserve the existing server-rendered architecture through a packaged loopback runtime / launcher.

Distribution does not justify a SPA rewrite.

### Exit gate

> **On a clean supported machine, an ordinary user can install and launch HiVenues without Git, npm, Docker, a shell, manual environment configuration or repository knowledge.**

---

## Era 6 — Hive Account Onboarding

### Purpose

Make Hive adoption optional, progressive and non-custodial.

### Existing account

```text
enter/select public @account
→ read public state
→ wallet proof when needed
→ verified binding
```

No private key or master password enters HiVenues.

### No Hive account

```text
Connect existing Hive account
Create Hive account
Not now
```

The initial production path may use vetted ecosystem account-creation providers and return the operator to HiVenues for wallet-based verification.

A future HiVenues-sponsored account-creation service is possible but requires its own explicit security/service/abuse/recovery design.

### Role binding rule

Ask only for roles when the corresponding capability is enabled:

- host identity;
- community;
- content/service binding if actually needed;
- merchant/value recipient.

Do not present one giant blockchain setup form.

### Exit gate

> **A person with or without a pre-existing Hive account can reach the capabilities they need without developer help, secret-key custody by HiVenues, or unnecessary blockchain ceremony.**

---

## Era 7 — Deployment Product

### Purpose

Close the nondeveloper lifecycle from approved Release to a real live deployment.

### Reference-provider path

The first no-terminal deployment proof should use a concrete supported provider while the deployment architecture remains provider-neutral and permits future adapters.

### Initial no-terminal reference-provider path

```text
Create immutable Release
→ Deploy
→ supported reference provider / other adapter available
→ HiVenues generates deployment-only SSH key locally
→ guided provider purchase/provisioning
→ operator supplies/authorizes resulting server target
→ HiVenues verifies server
→ HiVenues bootstraps restricted runtime automatically
→ deploy exact Release
→ domain wizard
→ DNS verification
→ TLS
→ health/read-back
→ Live deployment confirmed
```

### State separation

Keep these distinct:

```text
HOST RELEASE VERSION
≠ DEPLOYMENT STATE
≠ SERVER RUNTIME VERSION
≠ DOMAIN / DNS / TLS STATE
≠ PROVIDER PAYMENT STATE
```

Deployment credentials must not become HostGraph content.

### Exit gate

> **An ordinary operator can put an approved HiVenues Release on the public Internet using the reference provider without opening a terminal or manually administering the server.**

---

## Era 8 — Richer Direction & Design System

### Purpose

Deepen visual differentiation after the product has enough real application surface to stress it meaningfully.

### Why this follows social/application capability

Designing many Directions while the product contains mostly brochure content risks building beautiful systems that do not generalize to feeds, profiles, discussion, value and operation.

### Expansion areas

- additional Directions;
- multiple recipes/compositions within Directions;
- navigation models;
- typography pairings/scale systems;
- density/spacing systems;
- shape/corner/border language;
- hero grammars;
- content hierarchy/emphasis;
- gallery/media choreography;
- feed/list/card/timeline treatments;
- profile/community treatment;
- host-native icon/illustration language;
- motion/transition character;
- responsive art direction.

### Exit gate

> **The same feature-rich host can become several professional 2026 digital territories with materially different application-level art direction, not merely different styling.**

---

## Era 9 — Value / Commerce / V4V

### Purpose

Introduce value only after identity/social consequence handling is mature.

### Potential capabilities

- tip/support;
- creator contribution;
- pay tab;
- purchase an Offer;
- ticket/reservation payment where admitted;
- infrastructure/provider payment assistance.

### V4V / Lightning

V4V/Lightning may be useful as a payment bridge where it reduces friction.

Potentially valuable contexts include:

1. paying infrastructure/provider invoices where compatible;
2. later host-facing value actions where one rail can be translated into another.

V4V is not deployment architecture and is not a mandatory dependency.

### Authority rule

```text
HOST-NATIVE ACTION
→ EXACT VALUE OPERATION
→ HUMAN-READABLE CONSEQUENCE
→ AUTHORITY DISCLOSURE
→ HUMAN APPROVAL
→ PAYMENT / BROADCAST
→ CANONICAL RECEIPT / READ-BACK
→ CONFIRMED STATE
```

### Exit gate

> **Value actions can feel native to the host while authority, amount, recipient, pending state and canonical confirmation remain exact.**

---

## Era 10 — Operational & Mobile Completion

### Purpose

Make HiVenues something a host can run continuously, not something they generate once.

### Required operating surface

- unpublished-change awareness;
- current/upcoming Activities;
- Offers/content updates;
- social/community attention;
- media/integration failures;
- provider degraded states;
- pending/failed consequences;
- Releases / History / Restore;
- urgent changes;
- deployment health;
- runtime update state;
- domain/TLS health;
- backup/export/recovery;
- rollback;
- touch/mobile operation.

### Exit gate

> **A host operator can maintain the territory over time from desktop and mobile without developer intervention for ordinary operation.**

---

# Part IV — Qualification eras

## Era 11 — Internal Maximal Synthetic Qualification

### Purpose

Prove the substantially complete product internally before spending an independent Astra cycle.

### Strongest specimen

The maximal synthetic host must be created through the actual packaged product and normal Studio workflows.

No fixture/source intervention may substitute for a capability that end users are supposed to author.

### End-to-end internal journey

```text
fresh supported machine
→ install HiVenues
→ create fictional host
→ author complete territory
→ author long-form + short-form content
→ configure profiles/community/participation
→ connect or create Hive identity when useful
→ exercise admitted real Hive reads/actions
→ review multiple Directions/recipes
→ Release
→ deploy through supported no-terminal flow
→ connect domain/TLS
→ operate
→ update
→ deploy new Release
→ rollback/recover
```

### Additional synthetic archetypes

After the maximal specimen, create materially different fictional hosts such as:

- nightlife/hospitality;
- artist/musician/creator;
- publication/editorial;
- community/organization;
- conference/gallery/hybrid local business.

### Exit gate

```text
STUDIO = SUBSTANTIALLY_COMPLETE_FOR_END_STATE_TARGET
GENERATED_FRONTENDS = PROFESSIONAL_2026_BAR
HOST_NATIVE_HIVE_THESIS = VISIBLY_REALIZED
INSTALLATION = NONDEVELOPER
DEPLOYMENT = NONDEVELOPER
SAME_HOST_MULTI_DIRECTION_PROOF = PASS
SYNTHETIC_ARCHETYPE_SUITE = PASS
INTERNAL_PRODUCT_GATE = PASS
```

Only then open the independent synthetic Astra campaign.

---

## Era 12 — Independent Synthetic Astra

### Purpose

Use an independent operator to find non-obvious failures in a nearly complete product.

Astra should test:

- clean installation;
- first-run discovery;
- complete authoring;
- long-form and short-form content;
- social/community/profile experience;
- Hive onboarding and consequence clarity;
- visual/compositional quality;
- same-host Direction differentiation;
- mobile/touch;
- sparse/dense states;
- Release/History/urgent/conflict/persistence;
- deployment/domain/TLS where admitted;
- operation/update/recovery;
- unauthorized-effect boundaries.

### Gate

> **Independent synthetic qualification accepts HiVenues as a coherent near-end-state product rather than a candidate implementation.**

Only then may the first real customer become the next program gate.

---

## Era 13 — Fourth Street Bar First Customer

### Status

**HOLD**

### Purpose

Fourth Street Bar is the first real customer validation of the already-qualified general product.

It is not responsible for proving the fundamental product model.

The existing `fourthstreetbar.com` Hive-Bar beta creates no compatibility, migration, preservation or visual obligation for HiVenues. It may be replaced when the qualified HiVenues customer phase is eventually authorized.

### Entry requirements

- internal end-state gate passed;
- independent synthetic Astra accepted;
- exact customer packet/facts frozen;
- clean-room ordinary-operator trial charter opened.

### Gate

> **A real host can adopt HiVenues without product-team coaching, fabricated facts or developer rescue, and the resulting territory is good enough to become its real frontend.**

---

## Era 14 — Broader Release

### Purpose

Only after the first-customer lifecycle succeeds should HiVenues be treated as ready for ordinary strangers to download and use.

### Required proof

The program should have evidence covering:

- installer/distribution;
- first-run creation;
- complete authoring;
- Hive account onboarding;
- social/content participation;
- hosting purchase/provisioning guidance;
- deployment;
- custom domain/TLS;
- operation;
- application/runtime updates;
- backup/recovery;
- rollback;
- security/consequence boundaries.

### Gate

> **HiVenues can credibly be handed to a nondeveloper who has never seen the repository and still fulfill its product promise end to end.**

---

# Part V — Sequencing revision rule

The exact boundaries between Eras 3–10 may be split, merged or partially interleaved when dependency evidence makes that safer or more efficient.

However, an explicit roadmap revision is required before a major reordering that changes the intended product-validation logic.

Current completion state, active work, and held operational scope are recorded in `docs/ROADMAP.md` and the active issue/workstream charter.

---

# Part VI — Successor handoff rule

Every Project Lead successor should be able to answer, before changing product code:

```text
WHAT IS HIVENUES?
→ A premium host-first frontend factory for Hive.

WHERE ARE WE?
→ Read `docs/ROADMAP.md` and the active issue/workstream charter, then verify against repository evidence.

WHAT IS THE NEXT GATE?
→ Use the current program marker to identify the active/next roadmap gate; do not infer status from this frozen file.

WHAT MUST NOT BE LOST?
→ The controlling doctrine plus all completed-era acceptance contracts.

WHAT MUST NOT BE STARTED EARLY?
→ Anything held by the current program marker or active charter unless a dedicated explicit authorization changes the boundary.
```

A successor should not infer program priority merely from the most recently edited code.

---

# Final roadmap rule

> **Do not let implementation adjacency decide product sequence. Let doctrine define the destination, let the roadmap define the journey, and let evidence decide when a gate is actually closed.**
