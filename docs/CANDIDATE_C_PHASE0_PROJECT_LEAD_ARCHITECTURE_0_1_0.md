# Candidate C — Phase 0 — Project Lead architecture proposal 0.1.0

Integration architecture · current HTMX audit · H0/H1/H2 state ownership · vertical-slice contract · decision rule · migration risks · cross-lane adjudication inputs

```text
PROGRAM = CANDIDATE_C_SYNTHESIS
LANE = PROJECT_LEAD / INTEGRATION_AND_ARCHITECTURE
GOVERNING_CHARTER = #245
EXECUTING_ISSUE = #248
CLASS = PROPOSAL_AND_EXPERIMENT_CONTRACT_ONLY
CANDIDATE_C_PRODUCT_CODE = NO
CANONICAL_MAIN_MUTATION = NO
DISPOSABLE_PROTOTYPE = NOT_YET_STARTED
LIVE_HIVE_EFFECT = NONE
PAYMENT_EFFECT = NONE
PRODUCTION_EFFECT = NONE
```

## 0. Executive recommendation

The mature HiVenues repository is already much closer to a hypermedia architecture than its package manifest suggests: the v3 public renderer is server-generated HTML, the v3 Studio is server-rendered HTML with ordinary forms, POST/redirect/GET, server-owned authoring session/proposal state, digest guards, file persistence, and an iframe backed by the same server renderer. HTMX 2.0.10 is installed, but a repository audit of the canonical default branch found no indexed `hx-*`, `htmx`, or `HX-Request` usage. In practical terms, HTMX is currently a dependency, not an architectural primitive.

That makes H1 (HTMX-first) an **evolutionary experiment**, not a rewrite.

My Phase-0 recommendation is therefore:

> **Prototype H1 as the preferred Candidate C transport and interaction architecture, but freeze a hybrid ownership boundary rather than an HTMX ideology.**

The target boundary is:

> **Server/HTML owns durable application state and released projections. JavaScript owns transient local interaction state.**

HTMX should own ordinary command/response interactions, contextual panel loading, partial replacement, out-of-band status updates, and progressive enhancement. Small client controllers may own direct manipulation that would be awkward or latency-sensitive as request-per-pixel interaction: text-edit focus, drag affordances, media focal-point gestures, color sliders, canvas/device framing, audio controls, and similar ephemeral state. Those controllers must submit explicit commands to the server before state becomes durable.

A client-heavy shared-renderer architecture (H2) remains a valid fallback if the bounded experiment proves that H1 cannot provide Candidate B-level calmness and Candidate A-level expressive editing without re-creating a large client state machine in ad hoc JavaScript.

No final framework decision is authorized by this document. This document freezes the experiment contract and the rule by which the experiment will be judged.

---

## 1. Current-state HTMX / interaction audit

### 1.1 Dependency state

Canonical `package.json` includes `htmx.org` 2.0.10 alongside Express/EJS/Tailwind and the existing Node/HTML stack.

Repository-wide code search on canonical `main` for:

- `hx-`
- `htmx`
- `HX-Request`

returned no indexed implementation matches. This does not prove no byte anywhere could contain the text, but combined with direct inspection of the v3 Studio and renderer it is enough to classify the current product as **non-HTMX-driven**.

### 1.2 Current v3 Studio ownership

`src/venue/v3/studio-app-core.js` currently:

- owns an in-process authoring `session` and optional `proposal`;
- creates typed commands with `expectedDraftDigest`;
- renders the entire Studio as server HTML;
- accepts ordinary POSTed forms;
- creates a preview proposal server-side;
- redirects back to the full Studio after each POST;
- uses Apply / Discard / Undo / Redo commands through the mature transaction engine;
- persists accepted draft source separately to a file with expected-digest protection;
- freshly reopens persisted source and verifies its digest;
- renders preview through `/v3-preview` using the real public renderer.

This is already a strong state-ownership foundation. The main transport/presentation cost is that each bounded change generally performs a full document round trip and the Studio UI exposes transaction machinery too directly.

### 1.3 Current public-renderer ownership

`src/venue/v3/renderer/index.js` is server-side HTML generation from the typed source. Navigation and Activity links are normal URLs. Activity detail is already a distinct route shape. The generated public surface does not require a client application runtime to exist.

This is an important preservation target. Candidate C must not sacrifice initial HTML, ordinary links, SEO, accountless use, or provider-local degradation merely to make Studio implementation convenient.

### 1.4 Audit conclusion

H0 can be described as:

> **server-owned state + full-document forms/redirects + server renderer + iframe preview**

H1 is therefore not “replace a SPA with HTMX.” It is:

> **keep server-owned state and server projections, replace full-document interaction churn with semantic fragment transactions, and add small local controllers only where necessary.**

---

## 2. State ownership diagrams

### H0 — mature inherited pattern

```text
canonical source file
       │
       ▼
server authoring session ── expectedDraftDigest
       │
       ├── proposal preview ── Apply / Discard
       │
       ├── Undo / Redo history
       │
       └── Save checkpoint ── atomic file write + fresh reopen digest
       │
       ▼
full Studio HTML document
       │
       ├── ordinary POST form
       └── 303 redirect / full rerender

preview iframe ───────────────► same server public renderer
```

Strengths: one authoritative server state, typed commands, digest guards, renderer parity, accessible no-JS forms.

Weaknesses: full-page interaction churn, exposed implementation-shaped transaction language, difficult contextual updates across canvas/status/inspector without rerender, limited direct manipulation.

### H1 — HTMX-first hypermedia

```text
Canonical Host Record
  ├── draft graph + revision/digest
  ├── immutable releases
  └── typed journal/history
          │
          ▼
server command boundary
(expected revision + intent)
          │
          ├── ordinary edit → accepted draft revision
          ├── reviewed bulk/semantic edit → proposal diff
          ├── conflict → 409 + resolution fragment
          └── publish → immutable release snapshot
          │
          ▼
HTML projection / fragments
  ├── selected canvas region
  ├── contextual inspector
  ├── Activity card/page projections
  ├── draft/live status
  ├── publish/review summary
  └── out-of-band dependent fragments
          │
          ▼
HTMX swaps / normal-form fallback
          │
          └── small JS controllers for transient interaction only
```

Durable graph state never lives only in the browser. HTMX requests include the revision/digest they were based on. The server is responsible for conflict detection and the resulting UI fragment.

### H2 — client-heavy shared-renderer model

```text
Canonical Host Record (server)
          │
          ▼
JSON API / command API
          │
          ▼
client replicated draft/store
  ├── local optimistic graph
  ├── undo/redo stack
  ├── rendered canvas components
  ├── contextual inspector
  ├── provider UI state
  └── publish diff state
          │
          ▼
synchronize back to server
          │
          └── conflict/rebase/recovery logic
```

H2 can deliver rich direct manipulation elegantly, but it creates a second substantial state system that must stay coherent with server authority, release history, feed/SEO projections, provider observations, and stale-edit protection.

---

## 3. Candidate C ownership contract proposed for the experiment

The experiment should assume the following ownership rules, because transport cannot be assessed without them.

### 3.1 Durable server-owned state

Server owns:

- Host identity;
- Activity identity;
- Offer identity if adopted;
- canonical facts;
- media asset identity/provenance;
- Voice mechanic mappings;
- Presentation composition and arrangement;
- provider bindings;
- Intent / Direction basis;
- draft revision history;
- immutable Release snapshots;
- conflict tokens/digests;
- typed external-effect journal;
- provider-observation cache and freshness metadata.

### 3.2 Browser-owned transient state

Browser may temporarily own:

- which object is selected;
- open/closed panel state;
- unsent text composition while a field has focus;
- drag ghost / insertion marker;
- local slider/crop/focal-point position before commit;
- device-preview frame size;
- audio playback position;
- hover/focus affordances;
- staged multi-select UI before a submitted command.

Closing the browser may lose transient state. It must never lose an acknowledged durable edit while displaying “Saved to draft.”

### 3.3 No duplicated semantic authority

Client code may render or animate known server semantics, but may not independently decide:

- whether an Activity is valid;
- what a consequence-bound action actually does;
- whether a provider binding authorizes an action;
- whether a release is publishable;
- whether a stale edit may overwrite a newer revision;
- whether a Voice term changes underlying meaning.

Those are server/domain decisions.

---

## 4. Editing transaction model to test

The mature proposal → Apply/Discard model is safety-significant, but Candidate C should not force every ordinary edit through a visible preview transaction.

The experiment will test **two edit classes** over one command engine:

### Class A — ordinary draft edits

Examples:

- edit headline;
- edit Activity title/date/description;
- reorder an allowed section;
- change alt text;
- adjust a bounded color/type parameter.

Contract:

1. command carries `expectedRevision` / digest;
2. server validates and writes a new draft revision atomically;
3. response returns affected fragments plus new revision/status;
4. Undo submits an inverse/history command that creates another draft revision;
5. stale commands fail with explicit conflict UI rather than overwriting.

Operator language: “Saving…” → “Saved to draft.” No visible Apply step.

### Class B — broad, semantic, or consequence-changing proposals

Examples:

- change Direction/composition across many placements;
- remap a Voice term to a different Mechanic;
- remove content from public projection in bulk;
- connect/disconnect a provider whose loss changes capabilities;
- change host slug/URL family;
- restore a historical release to draft;
- any future operation whose semantics merit review before mutation.

Contract:

1. server derives a bounded proposal diff from exact current revision;
2. operator reviews Keep / Change / Needs decision where applicable;
3. accepting the proposal writes a new draft revision;
4. cancel leaves draft untouched;
5. publish remains a separate later boundary.

This preserves mature safety without making ordinary typing feel like a database transaction wizard.

---

## 5. Exact vertical-slice acceptance contract

The isolated spike uses one synthetic physical music host. It must exercise the same canonical graph concepts that later support creator/media hosts; host-specific source forks are forbidden.

### 5.1 Public experience

Required routes/capabilities:

1. **Host home** — server-rendered document, normal navigation, composition-specific hierarchy.
2. **First-class Activity detail URL** — durable Activity id behind a stable slug route; date/presence/action essentials above supporting media.
3. **Upcoming Activities fragment** — progressively enhanced, but useful as initial HTML.
4. **Accountless RSVP** — ordinary form fallback plus HTMX enhancement; result updates Activity headcount/receipt without replacing unrelated page state.
5. **ICS** — single-Activity download and host calendar subscription from canonical Activity data.
6. **Host-native applause/vote gesture** — simulated only; exact underlying operation disclosed before consequence. No broadcast.
7. **Secondary capacity/pitcher state** — successful simulated applause returns its own updated fragment via out-of-band swap.
8. **Journal pagination** — normal next-page URL plus HTMX partial append/replace.
9. **Provider degraded state** — simulated unavailable social/content provider degrades only the affected region.
10. **SEO/metadata** — meaningful title/description/canonical/OG/JSON-LD from the same canonical graph.
11. **No-JS behavior** — reading, navigation, Activity detail, RSS/ICS, and accountless ordinary forms remain coherent with HTMX disabled. A wallet-specific signed effect is not required to function without JavaScript; its truthful intent/disclosure path must still be understandable.

### 5.2 Studio

Required workflow:

1. Instantiate the same canonical graph from a minimal guided-creation Intent.
2. Land directly in the calm Studio with a beautiful first draft; no conversion step.
3. Select an Activity card in the canvas and open a contextual inspector fragment.
4. Edit the Activity date as a Class-A command.
5. Confirm all dependent draft projections update: home card, dedicated Activity page preview, draft status, calendar/review consequence indicator.
6. Edit a short title inline without a visible Apply transaction.
7. Reorder one allowed section using an accessible non-drag control; optional drag enhancement may call the same command.
8. Open Direction and preview a composition change as a Class-B proposal; cancel once, then accept a layout-only proposal while preserving manual title/date edits.
9. Open Voice and preview one host-native term with its immutable Mechanic/disclosure pairing.
10. Review exact draft revision for publication.
11. Publish to a local synthetic immutable Release snapshot; public projection switches only after release confirmation.
12. Restore an older Release to a **new draft**; live remains unchanged.
13. Open the same host in a second tab, create a competing edit, then submit a stale edit from the first tab. The stale edit must be rejected with a comprehensible conflict fragment and no overwrite.
14. Repeat conflict resolution at narrow/mobile width.
15. Simulate an uncertain publication result and prove idempotent status reconciliation rather than blind retry.

### 5.3 Accessibility / focus contract

- Initial documents use semantic landmarks and heading order.
- HTMX replacement preserves or intentionally restores focus.
- Validation messages are associated with fields and announced.
- Reordering has keyboard/button alternatives.
- Mobile requires no hover, drag, pinch, or simultaneous panes.
- Reduced motion is respected.
- Essential actions remain at least the repository’s accepted target-size baseline.
- HTMX-disabled fallback remains understandable.

### 5.4 State / concurrency contract

- Every durable edit is bound to an exact prior revision/digest.
- Server acknowledgment is the only event that permits “Saved to draft.”
- A stale command cannot silently overwrite.
- Publish binds an exact reviewed draft revision and current live release.
- Duplicate publication request identity cannot duplicate effects.
- Restore never rewinds public state directly.

### 5.5 Side-effect boundary

All provider/Hive/payment/signing behavior in the spike is synthetic or dry-run.

```text
LIVE_HIVE_BROADCAST = 0
SIGNING_APPROVAL = 0
PAYMENT_TRANSFER = 0
PROVIDER_MUTATION = 0
MEDIA_UPLOAD = 0
PRODUCTION_DEPLOY = 0
DNS/VPS_EFFECT = 0
```

---

## 6. What remains client-side even if H1 wins

The H1 experiment is not successful if it merely recreates a framework in unstructured event listeners. The following are explicitly allowed client islands:

- selection overlays / canvas hit testing;
- inline content-edit focus and IME-safe unsent text;
- drag ghost / sortable affordance, with semantic command only on drop;
- media crop/focal point gesture before commit;
- color/spacing slider live preview before commit;
- device preview framing and zoom;
- audio/video playback state;
- keyboard shortcuts;
- optimistic visual affordance while a server command is in flight, provided durable status remains truthful.

Preferred implementation order is native HTML/CSS → HTMX → small vanilla TypeScript controller. A component framework may be introduced for a bounded island only when the experiment records why the island is materially simpler and safer that way.

---

## 7. H0 / H1 / H2 comparison criteria

Score each architecture against the same slice.

| Criterion | H0 evidence question | H1 evidence question | H2 evidence question |
|---|---|---|---|
| Canonical state duplication | Already low | Remains low? | How much graph/store duplication is introduced? |
| Transaction clarity | Safe but operator-heavy | Can ordinary edits become direct without losing safety? | Is optimistic state easier or merely hidden complexity? |
| Draft/release coherence | Checkpoint-oriented | Can revisions/releases be exact server concepts? | Can client draft/rebase stay exact? |
| Undo/redo | Mature session history | Server revision commands + local field cancel? | Client and server history reconciliation cost? |
| Progressive enhancement | Strong full forms | Strong fragments + fallback? | Usually weaker without separate SSR layer |
| SEO/initial HTML | Strong | Strong | Must prove equivalent SSR/server projection |
| Runtime/bundle | Very low | HTMX + small islands | Framework/runtime/store cost |
| Failure behavior | Full reload, simple | Local fragment failure with full fallback | Client recovery and API error state |
| Provider degradation | Server-rendered | Local region swaps and server truth | Client provider-state synchronization |
| Studio responsiveness | Limited | Good enough for ordinary edits? | Likely strongest |
| Direct manipulation | Limited | Islands sufficient? | Strongest |
| Structural composition freedom | Server templates already capable | Same or better | Strong if renderer generalized |
| Testability | Strong pure/server functions | Strong route+fragment tests | More browser/state tests required |
| Cross-platform determinism | Mature | Must preserve | New toolchain/runtime risk |
| Migration cost | none | low-to-moderate | high |
| Maintenance risk | UI stagnation | fragment-contract discipline | dual-state architecture |

---

## 8. Decision rule

### Choose H1 / HTMX-first hybrid if all of the following are true

1. The complete vertical slice passes state/concurrency/accessibility/no-effect contracts.
2. Public pages remain excellent initial HTML with normal-link/form fallback.
3. The Studio can perform Class-A edits without visible transaction ceremony and without a replicated client graph.
4. Direction/Voice/release proposals remain exact server-derived diffs.
5. Focus restoration, validation and mobile interaction remain coherent across fragment swaps.
6. Direct-manipulation islands remain bounded and do not grow into a second semantic store.
7. Migration can reuse the mature transaction/source/rendering machinery instead of bypassing it.
8. Candidate A-level structural compositions are not constrained by HTMX; templates/fragment boundaries stay composition-neutral.

### Choose H2 / client-heavy shared renderer only if

- one or more **core** Studio interactions cannot meet the UX contract under H1 without building a de facto client framework/state store anyway; **and**
- an explicit H2 prototype demonstrates lower total state complexity for those interactions while preserving server release authority, progressive public rendering, accessibility and stale-edit protection.

Raw animation smoothness or developer familiarity is not sufficient reason to choose H2.

### Choose a stronger hybrid if

H1 wins public rendering and most Studio workflows, but one bounded subsystem (for example advanced media editing or future freeform spatial composition) clearly benefits from a component island. In that case the island receives explicit input/output contracts and cannot become canonical graph authority.

---

## 9. Migration and integration risks

### R1 — server in-memory session is not production collaboration

The current v3 Studio keeps session/proposal state in-process. Candidate C needs persisted revisions keyed by Host and editor context so multi-device/conflict behavior is real. HTMX does not solve this; the domain/repository layer must.

### R2 — fragment identity can become accidental architecture

If every DOM id becomes a public API, composition evolution will freeze. Fragment endpoints should be semantic (`ActivityCard`, `DraftStatus`, `Inspector(Activity)`) rather than tied to arbitrary CSS selectors. Composition families decide HTML structure behind those boundaries.

### R3 — out-of-band updates can hide dependency mistakes

A date edit affects multiple projections. The server must derive dependent fragments from graph relationships, not maintain a hand-written list scattered across controllers. Tests should assert dependency closure.

### R4 — undo/redo can split into local and durable meanings

Field-level Escape/cancel is transient. Acknowledged Undo is a new server draft revision. The UI must never blur them.

### R5 — HTMX can encourage route proliferation

Commands should map to domain operations, not one endpoint per visual widget. The mature typed command grammar should remain the core.

### R6 — direct manipulation may pressure premature client-store creation

Resist storing a full graph merely to support dragging. Keep the drag result as a semantic command such as `MOVE_SECTION`.

### R7 — provider observations are not release snapshots

Live inventory, playback availability, vote counts, or provider health may change after release. The release freezes authored graph/binding declarations and retained assets, not the external world.

### R8 — migration fidelity versus Candidate C quality

A `legacy-v3` presentation family may be necessary for exact migration, but it should be transitional. Existing accepted output must not silently change on migration; operators later opt into Direction proposals.

---

## 10. Cross-lane synthesis inputs and preliminary adjudication

This section records Project Lead decisions needed for the Phase-0 gate after reading the frozen Fable and Astra proposals. It is not yet the final Candidate C contract.

### A. Fable C1 / Astra T13 — Activities vs Offers

**Preliminary decision: adopt a sibling `Offer` concept.**

Activity remains a time/lifecycle-bearing occurrence/release/window. Tickets and reservations are usually capabilities/actions attached to an Activity. Standing propositions (happy hour, membership, menu item/package, evergreen booking opportunity, merch) should not be forced through Activity lifecycle/social/ICS semantics.

The Studio may present Activities and Offers through one calm “What people can do” workspace if Astra’s simplicity goal requires it; UI grouping does not require domain collapse.

### B. Fable C2 — visible proposal tier

**Preliminary decision: reject visible proposal/apply ceremony for every ordinary edit.**

Keep typed command, digest guard and revision history underneath. Ordinary edits write a new draft revision after validation. Bulk Direction, semantic Voice remaps, high-impact URL/provider changes, and other broad changes use explicit proposals.

This directly incorporates Astra’s calmness without discarding mature transaction safety.

### C. Fable C3 / Astra T14 — website release vs external effects

**Preliminary decision: adopt strict separation.**

Publishing a HiVenues website Release does not implicitly broadcast Hive posts, sign transactions, move funds, claim rewards, mutate provider records, or Podping. Those are separate reviewed external effects with idempotent journals. Future coordinated workflows may exist, but partial-success recovery must be explicit.

### D. Fable C4 — `legacy-v3` composition

**Preliminary decision: transitional, not a permanent creative family.**

Migration can render exactly through `legacy-v3`; Direction later proposes movement into a Candidate C family. No forced visual migration.

### E. Fable C5 — single-page vs multi-page

**Preliminary decision: preserve bounded multi-page capability plus first-class Activity pages.**

Candidate A’s single-page limitation should not become Candidate C doctrine. Composition families may define supported page roles/grammars. A host should not receive unlimited arbitrary page-builder topology, but restaurant/private-events, organization, festival and catalog use cases justify more than home + Activity pages.

### F. Fable C8 — every qualified host needs Hive binding

**Preliminary decision: reject as a per-host qualification rule.**

A host must be able to create, release and operate a credible mainstream site without first connecting Hive. The Candidate C **reference matrix**, however, must include deep Hive-connected examples proving the frontend-factory thesis. Product qualification requires Hive-native capability coverage across the system, not mandatory Hive binding on every host.

### G. Astra T1 — reversible Direction

**Preliminary decision: adopt.**

Direction is a proposal over the current draft, not regeneration. Protected manual edits are determined from exact revision history/baseline, not fuzzy inference. Unplaced content remains recoverable.

### H. Astra T6 — what a Release freezes

**Preliminary decision: authored graph + retained presentation/media dependencies, not mutable provider observations.**

History should distinguish reproducible authored release from live provider state.

### I. Astra T8 — whole-host release vs urgent Activity operation

**Preliminary decision: whole-host is the default release boundary; production must eventually support dependency-closed operational hotfix release before relying on HiVenues for urgent cancellations.**

The hotfix must begin from the live Release plus the selected urgent change, not accidentally include unrelated draft work. This is not required in the initial architecture spike but is a production requirement to track explicitly.

### J. Astra T9 — accountless setup

**Preliminary decision: adopt.**

Creation and public practical use may precede Hive connection. Connect is goal-driven, optional and progressively introduced.

### K. Astra T10 — anonymous/private draft ownership

**Unresolved / separate security-product decision.**

Phase 0 should not invent an authentication or retention policy. Guided creation can be specified independently; production implementation requires a separate ownership/auth/recovery gate.

### L. Astra T11 — HTMX must prove real UX, not transport

**Adopt as binding acceptance rule for #248.**

The experiment is a failure if it proves only fragment transport while conflict, focus, mobile editing, direct manipulation or release semantics remain inferior.

---

## 11. Experiment sequence after this contract freezes

1. Freeze this architecture/acceptance document.
2. Phase-0 synthesis adjudicates Fable #246 + Astra #247 + Project Lead #248.
3. If the synthesis does not materially alter the H1 contract, create an **isolated disposable spike branch** from canonical main.
4. Implement only the vertical slice in §5, using synthetic data and no external effects.
5. Capture exact code-size/state-ownership inventory, desktop/mobile browser evidence, no-JS behavior, accessibility/focus, two-tab conflict, release/restore, and failure behavior.
6. Record where local JavaScript was necessary and whether it stayed transient.
7. Compare H1 against H0 evidence and an H2 design/prototype only where H1 shows an actual weakness.
8. Freeze H1/H2/hybrid decision.
9. Only then authorize Candidate C product implementation/migration.

---

## 12. Non-goals

- No Candidate C production code in this proposal.
- No merge to canonical main.
- No dependency change.
- No live Hive/provider/payment/signing/deployment operation.
- No assumption that HTMX wins because it is already installed.
- No assumption that React/client-heavy loses because Candidate A/B used it successfully.
- No raw CSS/JS escape hatch for operators.
- No replacement of mature identity/social/consequence contracts without explicit adjudication.
- No automatic migration of current hosts into a new visual family.

---

## 13. Phase-0 Project Lead recommendation

At the architecture boundary, the evidence presently favors **H1 / HTMX-first hybrid as the first architecture to falsify** because it aligns with the mature repository’s strongest existing properties:

- server-owned typed state;
- ordinary HTML/public URLs;
- one renderer authority;
- deterministic command validation;
- digest guards;
- accessible form semantics;
- low client-runtime dependence;
- straightforward SEO/projection generation.

Candidate A and Candidate B demonstrate that the product experience must become dramatically richer. They do **not** demonstrate that durable product state must move into the browser.

The spike must therefore answer the narrower and more useful question:

> Can we keep durable truth on the server while delivering Candidate C’s richer Studio through hypermedia plus bounded interaction islands?

If yes, Candidate C gains the strongest ideas of both greenfields without paying for a second canonical application state machine. If no, the failure evidence will tell us exactly which subsystem justifies a richer client architecture.
