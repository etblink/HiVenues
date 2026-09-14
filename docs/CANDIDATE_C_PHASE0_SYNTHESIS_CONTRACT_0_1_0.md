# Candidate C — Phase 0 synthesis contract 0.1.0

Frozen adjudication of Fable #246 + Astra #247 + Project Lead #248 under charter #245.

```text
PROGRAM = CANDIDATE_C_SYNTHESIS
PHASE = 0 / ADJUDICATION
STATUS = FROZEN CONTRACT
PRODUCT_CODE = NOT YET AUTHORIZED
NEXT = ISOLATED HTMX/HYBRID ARCHITECTURE SPIKE
LIVE_HIVE_EFFECT = NONE
PAYMENT_EFFECT = NONE
PRODUCTION_EFFECT = NONE
```

## 1. Evidence bound at this gate

### Fable / product-model lane

- issue: #246
- branch: `candidate-c/phase0-fable-lane`
- commit: `81e1fccec854be0e534ff8ab294c4c015b314f55`
- tree: `6b754eab11643b8fb97904556c6266c7f1ba17ed`
- artifact: `docs/CANDIDATE_C_PHASE0_FABLE_LANE_PROPOSAL_0_1_0.md`

### Astra / operator-experience lane

- issue: #247
- PR: #249 (review-only)
- branch: `proposal/candidate-c-astra-phase0-247`
- commit: `90dddc2878188e4f5578f21bb162970193c7f127`
- artifact: `CANDIDATE_C_ASTRA_PHASE0_UX_PROPOSAL_0_1_0.md`

### Project Lead / architecture lane

- issue: #248
- PR: #250 (review-only)
- branch: `candidate-c/phase0-project-lead-htmx`
- commit: `d0739d0299c37bb68716fbc147585b9f03826c22`
- artifact: `docs/CANDIDATE_C_PHASE0_PROJECT_LEAD_ARCHITECTURE_0_1_0.md`

All three lanes stopped before Candidate C product implementation. Fable and Astra froze independently before reading one another's new Phase-0 proposals.

---

## 2. Product doctrine — accepted

### Internal doctrine

> **The host's world becomes the interface to Hive.**

### Customer-facing proposition

> **A place of your own, with participation that can travel.**

### Consequence doctrine

> **Metaphor at the experience layer. Truth at the consequence boundary.**

Host-native language may be playful, branded and culturally specific. Underlying mechanics, authority, value movement and consequences remain exact.

---

## 3. Canonical model — accepted

Candidate C adopts:

> **One canonical host graph; many faithful projections.**

The graph is not a page document. Page structure is one projection/presentation concern over durable domain objects.

### 3.1 Required durable planes

The canonical graph contains, at minimum:

1. **Identity** — Host identity, display name, slug history, archetype suggestion, timezone.
2. **Facts** — summary, presence facts, address/hours/contact/links where applicable.
3. **Activities** — first-class durable time/lifecycle-bearing objects.
4. **Offers** — sibling standing propositions that do not fit Activity lifecycle semantics.
5. **Series / groupings** — durable grouping relationships for Activities where useful.
6. **Media** — durable asset identity, provenance, dimensions/alt policy, provider references, bootstrap-art metadata.
7. **Voice** — typed Mechanic→Term translation plus host nouns/tone guidance.
8. **Presentation** — structural composition family, brand tokens, bounded page roles, arrangements and placement rules.
9. **Bindings** — provider-neutral Hive/social/media/value/commerce/discovery bindings and authority policy.
10. **Intent / Direction basis** — high-level guided-creation intent used to derive and later propose art-direction changes.

Release history is an orthogonal persisted record over graph snapshots rather than another presentation section.

### 3.2 Identity rule

Host IDs and Activity IDs are HiVenues-owned durable identity.

The following must never become Host/Activity identity merely because an integration exists:

- Hive account;
- Hive community id;
- author/permlink;
- 3Speak/SPK media id/CID;
- map/discovery record;
- payment invoice/memo;
- RSS/Podcast GUID;
- provider account/session id;
- slug/title/date.

### 3.3 Placement rule

Presentation references domain objects; it does not contain their identity/authority.

Removing an Activity card from a page cannot delete the Activity. Switching composition cannot delete canonical content. Unplaced content remains recoverable in Studio.

---

## 4. Activity and Offer model — adjudicated

### 4.1 Activity

Adopt the mature HiVenues Activity meaning and invariants, including:

- durable identity;
- discriminated temporal forms;
- explicit presence;
- lifecycle distinct from publication state;
- access/capacity semantics;
- reschedule history rather than re-minting identity;
- series/grouping semantics;
- media roles;
- social-root binding state;
- cancellation-first handling;
- idempotent publication/external-effect discipline;
- observations distinct from asserted state.

Candidate C adds:

- line items such as lineup/tracks/segments;
- explicit schedule history suitable for ICS sequence/review;
- `PublicAction.mechanic` references into the Mechanic registry;
- composition-family-owned canonical Activity-page projection.

### 4.2 Offer

**Accepted:** Fable C1 / Astra T13 resolve to a sibling `Offer` domain object.

Use Activity for something with meaningful temporal/lifecycle semantics: show, stream, release, workshop, premiere, scheduled window, etc.

Use Offer for standing propositions: membership, happy hour, evergreen booking package, menu/catalog proposition, standing reservation opportunity, merch/support package, etc.

Tickets/reservations are usually PublicActions/capabilities attached to an Activity. They may also be attached to an Offer when the proposition is not an Activity.

Studio may visually group Activities and Offers for simplicity; UI grouping does not collapse domain semantics.

---

## 5. Voice / semantic translation — accepted

Voice is first-class product data.

### 5.1 Mechanic registry

Each visitor-facing consequence-capable action names a stable Mechanic.

A Mechanic declares at minimum:

- semantic meaning;
- authority/consequence class;
- whether value moves;
- publicness;
- reversibility/idempotency expectations;
- capability/binding requirements;
- degraded behavior;
- disclosure generator.

Examples include distinct mechanics for:

- follow account;
- subscribe community;
- applaud/vote;
- reply/comment;
- RSVP local;
- reserve;
- external tickets;
- tip;
- purchase;
- watch;
- listen;
- calendar subscription;
- feed subscription;
- sign in;
- capacity/voting-power display.

### 5.2 Term map

Voice maps Mechanic → host-native Term.

Examples:

- vote → Raise a glass / Send a spark / Add to rotation;
- voting capacity → Your pitcher / Your battery / Needle time.

The Term never defines the consequence. Disclosure derives from the Mechanic and current binding/parameters.

### 5.3 Conflation rule

Do not collapse materially different semantics:

- follow account ≠ community subscription;
- vote ≠ tip;
- RSVP ≠ ticket purchase;
- reserve ≠ pay;
- recurring support ≠ membership;
- save/remind ≠ calendar subscription.

A change that remaps underlying mechanic is semantic and requires explicit proposal/review. Pure wording changes remain presentation-level but are still diffable.

---

## 6. Structural compositions — accepted

Candidate C uses **composition families**, not mere themes.

A family changes structural hierarchy, rhythm, page grammar, Activity-list treatment, hero treatment, mobile behavior and Activity-page recipe.

The graph stores references/parameters; renderer code owns the structural recipe.

### 6.1 Composition contract

A family declares:

- supported page roles;
- supported section kinds/slots;
- cardinality/pinning rules;
- default recipes;
- Activity-page recipe;
- responsive behavior;
- accessibility landmark/heading plan;
- bootstrap-art defaults;
- validated bounded parameters.

New families should be registry + renderer + tests, not graph-schema migrations for every visual change.

### 6.2 Multi-page adjudication

**Accepted:** bounded multi-page capability plus first-class Activity pages.

Candidate A's single-page limitation does not become Candidate C doctrine.

A composition family may define a small bounded set of meaningful page roles (for example Home, Menu/Visit, About/Story, Private Events/Services, Catalog) while Activity pages remain canonical derived/public objects.

Candidate C is not an unrestricted page builder. Arbitrary page topology and raw CSS/JS authority are not initial goals.

### 6.3 Legacy composition

`legacy-v3` is allowed only as a **transitional migration family** preserving exact current rendering. Moving to a Candidate C family is an explicit Direction proposal; migration does not silently restyle an existing host.

---

## 7. Guided creation / Direction — accepted

Guided creation is **guided art direction**, not technical setup.

### 7.1 First-run journey

Adopt Astra's four-moment interaction model as the visible UX:

1. **Purpose** — what are you making and what should people do here?
2. **Presence & material** — where does it happen and what real material can we start with?
3. **Direction** — which structural/tonal direction feels closer, shown with the host's current content?
4. **Participation** — what should people be able to do next, expressed in host-native language with truthful consequences?
5. **First draft reveal** — “Here is your place.” Nothing is public yet.

Underlying Intent may store richer normalized fields than the user sees in one session. The UX does not expose a seven-field technical questionnaire or ecosystem app store.

### 7.2 Same graph rule

The setup preview is already the current draft. There is no export/import, basic mode or second schema when entering Studio.

### 7.3 Reversible Direction

Direction remains revisitable later.

A later Direction change:

- starts from the current draft;
- proposes bounded changes;
- protects manual edits by exact revision provenance/baseline, not fuzzy inference;
- lets the operator Keep / Change / Resolve affected items;
- never deletes canonical Activity/Offer/media identity because a composition lacks a slot;
- surfaces unplaced content as recoverable.

Direction is not “rerun setup.”

### 7.4 Truthful bootstrap

Use real media immediately when available. When not available, deterministic abstract/procedural art and strong typography may create a finished first draft.

Never fabricate documentary photographs, customer quotes, popularity, event attendance, dates, prices, people or provider state.

---

## 8. Studio information architecture — accepted

Candidate C takes Astra's calm shell and Candidate A/Fable's deeper controls.

### 8.1 Default shell

Always visible:

- Host/workspace identity;
- draft/live status;
- truthful save state;
- Preview;
- Review release;
- large real rendered canvas.

Primary navigation:

- **Page**;
- **Activities**;
- **Site**.

`Site` exposes deeper lenses:

- Direction;
- Look;
- Voice;
- Connect;
- Details;
- History.

Only one main contextual inspector should compete with the canvas at a time.

### 8.2 Progressive disclosure

Novice/default Studio:

- edit text/media;
- create/edit Activities;
- reorder permitted sections;
- preview;
- release.

Contextual depth:

- placement vs canonical-object scope;
- media focal point/crop;
- action destinations;
- richer Activity settings;
- composition-aware layout controls.

Deeper lenses:

- structural Look;
- semantic Voice;
- provider-purpose Connect;
- host Details;
- release History.

Specialist detail may expose stable ids, binding identity and conflict diagnostics, but there is no raw DB/CSS/JS escape hatch in initial Candidate C.

### 8.3 Mobile

Mobile supports core operation, not a squeezed desktop workspace:

- one workspace at a time;
- Page / Activities / Site navigation;
- contextual bottom sheets for small edits;
- full-screen tasks for long text, Activity creation, media and release review;
- explicit Preview mode;
- no required hover/drag/pinch/two-pane interaction.

---

## 9. Draft / proposal / release lifecycle — adjudicated

Candidate C retains mature safety while removing ordinary editing ceremony.

### 9.1 Ordinary draft edits

Ordinary validated edits write a new durable draft revision directly after server acknowledgment.

Examples:

- copy edits;
- Activity date/title/description;
- bounded section reorder;
- alt text;
- bounded visual parameter changes.

Operator language:

- “Saving…” only while unacknowledged;
- “Saved to draft” only after exact server acknowledgment.

Undo of an acknowledged edit creates another draft revision. Escape/cancel of an unsent field edit is transient and distinct from Undo.

### 9.2 Reviewed proposals

Broad or semantic changes use explicit proposal review before entering the draft, including:

- Direction/composition changes affecting many placements;
- Mechanic remaps;
- broad removal/unplacement;
- consequential provider binding changes;
- slug/URL-family changes;
- historical restore-to-draft;
- other changes whose scope/consequence warrants review.

This preserves the mature proposal engine concept without forcing Preview → Apply for every keystroke.

### 9.3 Release

A Release is an immutable/reconstructible website snapshot bound to an exact reviewed draft revision.

Release includes authored graph/presentation state and retained media dependencies sufficient for faithful rendering.

Release does **not** freeze mutable provider observations such as current inventory, playback health, vote counts or external availability. Those are labeled live observations with source/freshness.

### 9.4 Restore

Restoring a prior Release creates a new draft. It never rewinds public state silently.

### 9.5 Concurrency

Every durable edit and publish request binds an exact prior revision/digest. Stale writes fail closed with comprehensible conflict handling.

### 9.6 Publication boundary

**Website release and external effects are separate operations.**

Publishing HiVenues content does not implicitly:

- broadcast Hive posts;
- vote/comment/follow;
- sign transactions;
- move funds;
- claim rewards;
- upload external media;
- mutate provider records;
- Podping;
- change DNS/VPS/deployment state.

Future coordinated workflows require explicit partial-success/idempotency design.

### 9.7 Whole-host release and urgent operations

Whole-host website release is the default consistency boundary.

Before production use for urgent cancellations/status changes, Candidate C must gain a dependency-closed operational hotfix path that starts from the live Release plus selected urgent changes so unrelated draft work is not accidentally published.

This hotfix is not required in the first architecture spike but is a tracked production requirement.

---

## 10. Hive / ecosystem capability contract — accepted

HiVenues remains host-first and mainstream-friendly while deeply Hive-native underneath.

### 10.1 Accountless first-run

A host can create and publish a credible site without first connecting Hive.

A visitor can use ordinary links, RSS/ICS and applicable local/accountless actions without Hive.

Product-level qualification must include deep Hive-connected references, but **every individual host is not required to bind Hive before being considered a valid HiVenues host**.

### 10.2 Provider-neutral seams

Candidate C carries forward these capability seams conceptually:

- `SocialGraphProvider`;
- `ContentProvider`;
- `SigningProvider`;
- `PaymentProvider`;
- `CommerceProvider`;
- `MediaProvider`;
- `Notifier`;
- `DiscoveryProvider`.

Exact interface boundaries may be refined during implementation. Their domain rule is fixed: provider binding is downstream of HiVenues identity/semantics and provider failure degrades locally.

### 10.3 Current posture

- Hive L1 social/content primitives: core external capability.
- Signer abstraction: adapter seam; Aioha is a candidate adapter family, not domain identity.
- HIVE/HBD value: optional per host, exact consequence boundary.
- V4V: optional/deferred to concrete media-host need.
- Distriator / SpendHBD: optional interoperability for relevant physical/hybrid merchants; never source of truth.
- SPK / 3Speak: optional media adapter behind MediaProvider.
- RSS / Podcasting 2.0: core accountless standard where applicable.
- ICS: core accountless calendar standard where applicable.
- Podping: explicit opt-in external effect; journaled/retryable; never implicit on ordinary publish.
- WorldMapPin: optional discovery binding; never location identity/source of truth.
- Hive communities: optional host capability, distinct from account-follow semantics.
- Hive Engine / HoneyComb / Magi: deferred absent concrete product need.

---

## 11. Migration boundary — accepted

Candidate C migration from mature v3 is deterministic, receipt-producing and non-destructive.

Preserve:

- Host identity;
- Activity identity/slugs and old-route aliases;
- temporal/presence/lifecycle/access facts;
- managed media identity;
- Activity social bindings and primary-root state;
- capability configuration/authority meaning;
- current URLs where accepted;
- provenance/source digest.

Map:

- mature language fields → Voice seed;
- existing page/component tree → `legacy-v3` presentation arrangement;
- design recipes/tokens → Candidate C presentation tokens/overrides;
- current programs → series/grouping semantics after explicit migration rule;
- current public actions → Mechanic mappings without runtime prose inference.

Do not:

- re-mint identity;
- infer semantic Mechanics from arbitrary prose at runtime;
- create external Hive/provider objects during migration;
- automatically restyle a migrated host.

---

## 12. Frontend architecture gate — accepted experiment, not final selection

### 12.1 Current finding

Canonical v3 already uses server-owned state, server-rendered Studio/public HTML, ordinary forms, typed commands, digest guards and real-renderer preview.

HTMX 2.0.10 is installed but is not currently an evident architectural primitive.

### 12.2 First architecture to falsify

Authorize an isolated disposable **H1 / HTMX-first hybrid** spike under the #248 acceptance contract.

Working boundary:

> **Server/HTML owns durable application state. JavaScript owns transient local interaction state.**

Use:

- server-rendered initial documents/fragments;
- HTMX for ordinary commands/swaps/out-of-band dependent updates;
- normal-link/form fallback;
- small targeted client controllers for selection, inline-edit focus, drag ghosts, crop/focal-point gestures, live sliders, device framing, audio playback and similar transient state.

Do not create a client-side canonical Host graph merely to support interaction.

### 12.3 Decision rule

H1 wins only if the bounded spike proves:

- Candidate C draft/release/conflict semantics;
- calm desktop/mobile Studio UX;
- focus/accessibility correctness;
- progressive public HTML/no-JS fallback;
- structural composition freedom;
- provider-local degradation;
- bounded client islands rather than a de facto second state framework.

If H1 cannot meet those without recreating a client framework/state store, prototype the failing subsystem under H2 and compare total state complexity. Framework familiarity or animation smoothness alone cannot justify H2.

---

## 13. Architecture-spike stress case — binding

The first disposable spike must include at minimum:

### Public

- host home;
- dedicated Activity page;
- upcoming Activities;
- accountless RSVP;
- ICS;
- simulated host-native applause/vote with truthful consequence;
- secondary pitcher/capacity update;
- journal pagination;
- provider-degraded state;
- SEO/structured metadata;
- normal-link/form fallback.

### Studio

- guided Intent creates the same canonical graph;
- calm Studio handoff;
- Activity selection/context inspector;
- ordinary Activity date edit;
- dependent draft projection updates;
- inline title edit;
- accessible reorder;
- reversible Direction proposal cancel + accept;
- Voice Mechanic/Term preview;
- exact release review;
- synthetic immutable release;
- restore-to-draft;
- two-tab stale conflict;
- narrow/mobile conflict resolution;
- uncertain publication reconciliation.

### Safety

No live Hive, signer approval, payment, provider mutation, upload, production deployment, DNS or VPS effect.

---

## 14. Explicitly unresolved after Phase 0

These do not block the architecture spike but require later gates:

1. authentication/account model for operators;
2. anonymous draft retention/ownership claim/recovery;
3. production multi-tenant persistence design;
4. exact Activity recurrence model;
5. selective dependency-closed emergency release implementation;
6. real provider adapter qualification;
7. media upload/storage/derivative architecture;
8. analytics/typed visitor-event model;
9. supported-browser/performance numeric budgets;
10. final composition-family catalog and extension policy.

---

## 15. Rejected Phase-0 alternatives

- **Reject:** “page is the data” as the canonical domain model.
- **Reject:** Activities containing their only identity inside page sections.
- **Reject:** one generic template with visual themes only.
- **Reject:** unrestricted arbitrary CSS/JS/layout in initial Studio.
- **Reject:** visible Preview→Apply ceremony for every ordinary edit.
- **Reject:** implicit external-provider effects during website publish.
- **Reject:** mandatory Hive connection during setup or for every host.
- **Reject:** permanent `legacy-v3` as Candidate C's creative ceiling.
- **Reject:** client framework choice by inheritance from either greenfield candidate.
- **Reject:** HTMX choice merely because the dependency already exists.

---

## 16. Phase-0 acceptance and routing

Phase 0 is accepted when this contract is frozen with exact provenance.

The next operation is **not Candidate C production implementation**.

It is:

```text
CANDIDATE_C_PHASE_1A = ISOLATED_ARCHITECTURE_SPIKE
ARCHITECTURE_UNDER_TEST = H1 / HTMX-FIRST HYBRID
CANONICAL_PRODUCT_MUTATION = NO
SPIKE_BRANCH = ISOLATED
LIVE_EXTERNAL_EFFECT = NONE
NEXT_GATE = H1_VS_H2_ARCHITECTURE_ADJUDICATION
```

Only after the spike is measured and adjudicated may Project Lead authorize migration/product implementation.
