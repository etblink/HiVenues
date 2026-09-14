# Candidate C — Astra Phase-0 operator experience proposal

Version: 0.1.0 · 2026-09-14 · FROZEN INDEPENDENT PROPOSAL · Awaiting Phase-0 adjudication

Role: Candidate C Operator-Experience / Studio Lead.
Governing charter: [#245](https://github.com/etblink/HiVenues/issues/245), including launch and anti-convergence comments.
Assignment: [#247](https://github.com/etblink/HiVenues/issues/247).
Proposal branch: `proposal/candidate-c-astra-phase0-247`.
Base: `c0877a3e737a4ef4e28a3237914d92a19e8fd5fa`.
Artifact: `CANDIDATE_C_ASTRA_PHASE0_UX_PROPOSAL_0_1_0.md`.

## 1. Recommendation and evidence boundary

Make Studio a place to shape and operate a host's world. Begin with a few visible creative decisions; deepen the same draft through selection, contextual controls, and explicit lenses. Release a reviewed snapshot through a separate consequence boundary.

The central recommendation is **reversible art direction**. A direction change proposes a set of changes to the existing host graph. It never regenerates the host from a setup questionnaire or treats detailed edits as disposable output.

The experience should let an ordinary operator create a compelling first draft without choosing a provider, understanding a schema, or connecting a wallet. It should let an experienced operator change composition, vocabulary, and participation semantics without resorting to a generic block editor.

This is a design proposal, not a description of implemented behavior. Inputs actually read are #245, its two comments, #247, repository metadata, and base commit metadata. Root AGENTS.md was requested and returned 404. Frozen A/B strengths and mature requirements are used as stated in #245; their implementations and browser evidence were not independently re-audited in this lane. No new Fable #246 proposal, comments, artifact, or PR was read. No #248 proposal was read. No ecosystem compatibility research or provider qualification was performed. Provider names below identify candidates or explanatory examples, not verified integrations.

Only this proposal is added. No Candidate C product code, canonical-main mutation, deployment, signing, provider configuration, payment, or live Hive operation is part of this work. “Frozen” means the exact proposal commit is the reference for adjudication; it does not mean the proposal is accepted or the branch is technically write-protected. Later changes must be separately versioned and must preserve this reference.

## 2. End-to-end journey

Illustrative hosts below are fictional test fixtures, not existing customers or claims about predecessor builds.

A small music hall operator enters “Northline Hall,” chooses “Bring people to upcoming shows,” and identifies a physical place. The preview becomes an event-led editorial site rather than a general marketing homepage. They add one real poster and a room photograph, choose a restrained late-night direction, and see their actual words and images in three genuinely different compositions. They create Friday's show in the preview, leave optional social participation for later, then enter Studio exactly where they were. A short review distinguishes missing practical details from optional improvements. The first publish puts only the approved website release live.

An independent audio artist instead chooses “Listen to my latest work” and online presence. Their draft leads with a listening experience and a release, with a compact archive and accountless subscription options. It does not inherit the hall's schedule, visit block, or ticket language. Both use the same Host/Activity concepts and release model.

The emotional target, “It already looks like us,” is a hypothesis to test. Do not manufacture it through fabricated testimonials, invented events, stock claims, or fake popularity. A sparse but intentional identity is preferable to a rich false site.

### Setup step map

The normal path has four conversational moments followed by the draft. Each moment has one main decision, optional expansion, back navigation, and a persistent “Continue with this” action. Do not display a long mandatory checklist or a percentage that changes as branches appear.

| Moment | Prompt and minimum answer | What changes in the actual preview | Why / branching / escape |
| --- | --- | --- | --- |
| 1 — Purpose | “What are you making, and what should people do here?” Host name plus one primary visitor goal; host kind is a helpful suggestion | Name, navigation emphasis, lead content, and primary action hierarchy | Avoid hard genre templates. Allow one secondary goal, keep all others revisitable. “Explore first” creates a clearly temporary draft identity |
| 2 — Presence and material | “Where does this happen? What can we start with?” Physical / online / hybrid; continuous / occasional / release-led rhythm | Visit information or online destination; schedule or release emphasis; uploaded media replaces bootstrap art immediately | No street address required for online hosts. Upload, paste text, select an existing asset, or skip. Existing URLs/accounts are optional source candidates, not automatic import authorization |
| 3 — Direction | “Which feels closer to you?” Up to three compositions showing the same current content; tone choices alongside a real copy sample | Spatial hierarchy, density, image treatment, typography, section order, and copy proposals visibly differ | Compare with equal content. No abstract swatch quiz. Expose a single adjustment at a time. “Keep this, change the energy” preserves chosen structural constraints |
| 4 — Participation | “What should people be able to do next?” Goal-relevant choices and editable host wording | Preview the action in context and its plain-language consequence disclosure | Show accountless options first when useful; provider connection is deferred. Skip retains the main visitor journey. A metaphor changes presentation, never the underlying action |
| First draft | “Here is your place.” Choose a suggested next task or edit directly | Full draft, with unresolved material marked only in Studio | Guided flow ends without publishing, onboarding modal stack, or forced account/provider connection |

Presence and rhythm are independent: a physical record shop can be release-led; an online community can run scheduled events. Backing up preserves later answers unless a concrete dependency breaks; then explain the dependency and retain the displaced material.

Optional imports show source, ownership/usage question, proposed items, and duplicate matches before acceptance. A pasted URL does not start an ongoing synchronization relationship. Imported copy is editable draft content with provenance; a live embed is an explicit binding with different behavior. Failed imports offer manual entry without losing progress.

Bootstrap art is abstract, locally reproducible if feasible, and identified in Studio. Never fabricate venue photographs or imply an event happened. Sample dates, prices, people, and quotes remain nonpublishable sample content. Where no media exists, typography and composition must carry the site.

Vocabulary suggestions appear only when a corresponding participation action exists. For a bar, “Raise a glass” can represent an encouragement gesture; it cannot silently mean a paid drink, ticket, transfer, or guaranteed reward. Preview includes the accessible name and the visitor's consequence sheet, not just the decorative icon.

### Optional capability suggestions

| Host goal | Initial experience proposal | What remains conditional |
| --- | --- | --- |
| Let people keep up | RSS, calendar subscription or single-event ICS when applicable | Feed privacy, stable URLs, update/cancellation semantics |
| Encourage conversation or support | Host-language participation with exact action disclosure | Hive identity binding, signer availability, permissions and authority |
| Share audio/video | Add owned media or a source reference; explore podcast/video services | SPK/3Speak, Podping and Podcasting 2.0 qualification; content rights and delivery reliability |
| Sell or accept support | Clear destination and action label | HIVE/HBD/V4V, ticket services, Distriator/SpendHBD require separate capability and consequence decisions |
| Help people find a place | Visit details and directions | WorldMapPin or another map provider is optional, not Host identity |

Do not present an ecosystem app store during creation. Connect may later explain alternatives. Token/community machinery such as Hive Engine, HoneyComb or Magi receives no default slot without a concrete operator need.

## 3. Setup → Studio and return to Direction

The setup preview is already the current draft. Entering Studio preserves its identity, revision, selected composition, assets, Activity records, vocabulary and bindings. There is no conversion, export/import, or “unlock advanced mode” operation.

At handoff the operator sees:

- Host name, “Private draft · Never published,” and truthful save status.
- The same preview, with “Edit anything” and at most one relevant suggestion, such as “Add Friday's time.”
- “Review release,” available as a route even if the review will explain blockers.

A transient introduction points to selecting content and opening Direction. Dismissing it is durable; it does not become a permanent dashboard.

**Direction** remains a lens reachable from the main workspace menu and Look. It reads current graph values and opens alternatives as previews. It retains explicit operator choices, not just the original setup answers.

Applying a later direction opens a bounded change review: “Change layout and type; keep your words, event details, links and images.” Each affected item is marked Keep, Change or Needs a decision. Hand-edited copy is protected by default. Replacing it requires choosing the proposed copy. No fuzzy inference may silently classify detailed work as safe to overwrite.

Changing composition preserves canonical content even if some content has no slot in the new layout. Such content appears in “Not placed on this page”; public removals appear in release review. Never delete an Activity because it disappears from the home page.

Undo returns to the preceding draft revision. Undo itself is a new revision and cannot bypass a concurrent edit. Cancelling the proposal changes nothing. Reopening Direction starts from the current draft, not its historical setup state.

## 4. Studio information architecture

The default desktop view gives most space to the website canvas. One compact top bar carries Host/workspace, draft/live label, save status, Preview and Review release. A narrow navigation region carries **Page**, **Activities**, and **Site**; it may collapse when space is tight. Only one editing inspector is open at a time.

| Place | Contents | Visibility rule |
| --- | --- | --- |
| Page | Current page outline, sections, placement, page-specific settings; switch to a dedicated Activity page | Page outline opens on request; no permanent tree plus inspector plus asset manager |
| Activities | Human-readable list, search, date/status filters, create and edit | Separate focused workspace; returns to the prior canvas position |
| Site | Direction, Look, Voice, Connect, Details; History entry | One menu exposes these lenses; do not put seven permanent top-level tabs on the canvas |
| Context inspector | Selected text, image, section, action or Activity-specific settings | Opens on selection; labels the object and whether changes affect this placement or all projections |
| Look | Composition, type, palette, rhythm, media treatment, responsive variants | Visual previews first; deeper controls explicitly expanded |
| Voice | Tone guidance, host terms, action labels, accessible names, consequence-copy previews | Editable mappings to semantic actions, not unrestricted search-and-replace |
| Connect | Capability purpose, binding status, source, failure fallback and authority | Optional services never occupy the default canvas chrome |
| Details | Host facts, place/timezone, contact, ownership, URL settings, accessibility essentials | Facts are referenced by pages; duplicating a section does not duplicate authority over a fact |
| History | Website releases and restore-to-draft | Accessible from Site and live status; never an ambiguous global Undo |

“What's On” is a host-facing navigation label or a view inside Activities, not a second event database. A creator can call the equivalent view “Releases.” Studio keeps the stable label “Activities” with the host term alongside it so instructions and support remain comprehensible.

Selection has clear boundaries and a breadcrumb only when necessary, such as Page → Show listing → Friday's show. Clicking the show title offers “Edit show everywhere” and “Edit this listing's appearance.” Inline controls must not imply that a canonical fact belongs only to one card.

Canvas edit mode intercepts links with clear editing behavior. Preview mode removes edit affordances and makes visitor links operable. A “Draft preview — actions are demonstrations” marker prevents preview signing, payments or provider writes. The visitor consequence flow can be demonstrated without invoking a signer.

## 5. Progressive disclosure contract

Levels describe routes into the same model, not permissions or separate modes.

| Level | Entry | Operator can do | Deferred or constrained |
| --- | --- | --- | --- |
| First draft | Guided creation | Choose intent, material, composition, tone and useful participation | No provider catalog, schema identifiers, token setup or arbitrary canvas layout |
| Everyday | Default Studio | Edit words/images, create an Activity, reorder permitted sections, preview and review release | Safe composition rules constrain spacing and hierarchy |
| Context | Select an object | Crop/focal point, local treatment, action destination, placement visibility, Activity details | Show dependencies and affected projections before canonical changes |
| Deeper control | Look / Voice / Connect / Details | Choose structural variants, tune semantic vocabulary, bind capabilities, manage host facts | Permission-sensitive work goes through its own consequence flow |
| Specialist | Explicit advanced expansion within a lens | Inspect binding identity, canonical references, revision conflicts and supported composition parameters | No raw database edits, arbitrary JavaScript, destructive regeneration or unsupported CSS escape hatch in initial scope |

Novices should be able to produce and maintain a real public site without opening Connect or specialist controls. Experts gain power through structural compositions and validated parameters; the initial contract is deliberately not a universal design application. Search/command navigation can shorten expert travel but must never be the only route.

## 6. Desktop and mobile interaction model

### Desktop

Text selection opens inline editing for short copy. Long-form work opens a focused editor with contextual preview. Enter/Done commits the local edit for saving; Escape discards only the uncommitted field edit. Undo of an acknowledged change creates a new draft revision. The UI distinguishes editing focus from selecting an element.

Images open an asset chooser with alt text, focal point, crop preview and Replace. Replacement retains placement intent but requires an alt-text check. Dragging section order is optional; Move up/down and destination controls provide equivalent keyboard access. An invalid drop explains the composition constraint and leaves order unchanged.

Selecting a primary action opens its host label, semantic action, destination/binding and visitor disclosure. The operator can inspect how the button behaves for accountless, disconnected, connected and unavailable states.

Panels restore focus to their trigger on close. Validation is attached to the field and summarized when needed. Keyboard editing must not accidentally activate a public link or release.

### Mobile

Use a single workspace at a time. The top area retains Host, draft/live status and save status; a compact bottom navigation offers Page, Activities and Site. Review release remains a labeled action in the top menu, never an unlabeled icon. All core tasks have a visible navigation route.

Tap selects; a separate Edit action enters editing. A bottom sheet shows short contextual controls; long text, Activity creation, media choice and release review use full-screen tasks. Back returns to the same selected object and scroll position. Opening the software keyboard prioritizes the field and save status rather than squeezing in an unusable live canvas.

Preview is a dedicated full-screen view with a clear return to editing. Reorder uses Move before/after and arrow controls. Crop supports buttons and focal-point selection as alternatives to precision gestures. Do not require hover, drag, pinch or two simultaneous panes.

Release review is grouped by consequences with expandable changes and a final textual button such as “Publish website changes.” Conflict resolution compares versions sequentially if side-by-side reading is cramped. Mobile supports save recovery, restore-to-draft and connection diagnosis; provider-specific signing support must be qualified separately.

## 7. Draft and release lifecycle

A website release captures the graph projection and its presentation dependencies, not the entire external world. Public feeds, availability and provider status may change after release. Show that distinction in review and history.

### Operator language

| Condition | Visible language | Allowed next step / invariant |
| --- | --- | --- |
| Never released | “Private draft · Never published” | Edit or review; no suggestion that the site is already public |
| Unacknowledged edit | “Saving…” | Do not imply durable storage |
| Server acknowledgement | “Saved to draft” with time available | Acknowledges the exact draft revision |
| Save failure | “Not saved. Keep this page open.” | Retry and recovery/export where supported; do not claim offline recovery without verified durable local storage |
| Current browser cannot reach server | “Offline · Changes not saved to server” | Retain local work where possible; release unavailable |
| Draft matches release | “Live · No unpublished changes” | View live or begin an edit |
| Draft differs | “Live site unchanged · Draft has changes” | Review those changes |
| Another editor changed affected data | “A newer draft is available” | Resolve before overwriting or publishing |
| Review prepared | “Ready to publish this reviewed draft” | Confirmation binds exact revision and current live release |
| Publication in progress | “Publishing…” | Duplicate submission cannot create duplicate effects |
| Publication confirmed | “Live · Release [number]” and timestamp | Success only after the public release pointer is confirmed |
| Result uncertain | “Publication status unconfirmed” | Check status using the original request identity before retrying |
| Publication failed | “Not published · Previous release still live” only if verified | Preserve draft; otherwise show uncertain status |
| Historical release restored | “Restored to draft · Live site unchanged” | Inspect, repair stale dependencies and review as a new release |

Release numbers are human labels; canonical identities remain durable behind them.

### Review and publication

1. Review waits for acknowledged saves and binds a specific draft revision. Block review confirmation if edits or unresolved conflicts remain.
2. Summarize changes in human terms: new show and its URL; date changed on three projections; removed home-page section; changed participation wording; connected live video source. Group factual, visual, navigation and external-dependency effects.
3. Preview the exact reviewed snapshot at desktop and mobile widths and expose dedicated Activity pages. Do not review a moving working draft.
4. Separate blocking problems from recommendations. Broken required actions, invalid activity times, unsafe disclosure, unresolved conflicts and publishable sample facts block affected release content. Optional missing art or disconnected optional capabilities need an honest fallback, not a blanket block.
5. Confirm with the action's scope: “Publish website changes.” If the draft or live release changes meanwhile, mark review outdated and recompute; do not silently publish newer work.
6. Atomically select the reviewed release, or keep the old one live. The architecture lane must establish the mechanism. Return a verifiable receipt and live URL; refresh public state before declaring success.

A release must preserve or reconstruct its authored content, composition version, voice mapping, owned asset references and binding declarations. Secrets are never part of a snapshot. Mutable external media requires an explicit preservation policy; without one, history promises authored configuration, not pixel-perfect recovery.

### Concurrency, restoration and external actions

Each save carries an expected revision. Nonoverlapping edits may be merged only when deterministically safe and reported; same-field or structural conflicts require an explicit choice. A human-readable conflict shows “Your version,” “Saved version” and affected locations. No last-writer-wins fallback. Release confirmation also checks the previously live release, preventing accidental rollback of another operator's publication.

Restoring a historical release creates a new draft revision and preserves intervening history. Warn before replacing current draft work, provide a recoverable checkpoint, and revalidate obsolete bindings/compositions/assets. No restore may undo a Hive transaction, resurrect sold inventory, change provider authority, or silently move the public release.

Website publication never doubles as Hive posting, voting, token transfer, payment or a provider configuration write. If a future workflow offers “Publish and share,” show separately reviewable actions, authorization and receipts; partial success must remain visible. This proposal recommends keeping them separate initially.

At the visitor boundary, a host metaphor has an exact accessible consequence summary. For example: “Raise a glass — send a Hive vote as @account on [item], at [weight]. No money transfer.” If an operation has value, authority, capacity or permanence implications, disclose the actual qualified facts before approval; never invent a guaranteed reward. Authority selection and signer approval belong to that operation, not website release.

Private draft content must not leak through public Activity URLs, RSS/ICS, social previews or indexable draft previews. Sharing a draft preview requires an explicit scoped access decision. Details of authentication and revocation remain architecture work.

## 8. First-class Activity editing

Activities represent durable host happenings or opportunities. Type affects prompts and presentation; it must not substitute for identity. Human title and context lead the editor; identifiers are available in Details for diagnosis.

Create starts with “What are people coming for?” Suggestions include event, stream, release and offer. Ticket and reservation opportunities usually attach to an Activity as participation actions; they are not automatically duplicate events. A standalone booking opportunity can be an Activity when it has independent purpose and URL. The graph lane must adjudicate this relationship.

The initial editor asks only:

- Name and one-sentence invitation.
- When: scheduled time, date-only, available from/until, or intentionally unscheduled where valid.
- Where: venue, online destination or both.
- Main action: attend, watch, listen, reserve, get tickets, claim an offer or learn more.

Expand only relevant fields: timezone and doors time for a show; access destination for a stream; track/media for a release; expiry and conditions for an offer; provider terms and availability source for reservations/tickets. Times remain tied to an explicit timezone with visitor-local conversion labeled when used. Date-only information is not silently turned into midnight. End-before-start and ambiguous daylight-saving times demand resolution.

The inspector immediately previews the dedicated Activity page, its home-page card and calendar/feed representation where enabled. A date edit names all affected projections. Card styling belongs to placement; facts belong to the Activity.

Draft, scheduled/happening/ended, cancelled, and sold out are different dimensions. “Scheduled” describes event timing, never deferred website publication. Capacity/availability may be provider-observed data, not a manually asserted fact. Label its source and freshness; an outage cannot become “Sold out” or “Confirmed.”

For Phase 0, recommend host-wide website releases as the default consistency boundary. An urgent cancellation can enter review from its Activity, but the review must disclose every pending change in that release. Do not pretend a single-Activity publish excludes unrelated changes. Selective publication requires dependency closure and should be adjudicated separately.

Cancellation preserves the Activity URL, explains status, removes inappropriate calls to action and propagates through released projections. Hiding a card does not cancel the Activity. Archive removes routine listings while retaining a useful historical page. Retirement/removal receives a separate URL and feed impact review. Display-name and slug changes must not change durable identity; old URLs require an explicit redirect policy.

Duplicating creates a new Activity identity and clears provider bindings by default. Recurring occurrences need distinct time/cancellation semantics; do not fake recurrence by copying the title while retaining one transaction target. Detailed recurrence UX is deferred.

A reservation request is not a confirmed reservation; an outbound ticket link is not inventory ownership. The visitor receives provider attribution and confirmation only from verified completion evidence. Failed optional social/video services should leave the Activity's practical facts and remaining valid actions usable.

## 9. Quality guardrails and later evidence

Composition should determine structure, not merely recolor a common skeleton. Ship a bounded family of structural grammars with explicit content requirements and optional slots: schedule-led hall, listening-led artist, story-led organization, for example. These are creative starting points, not hard host taxonomies.

| Area | Guardrail | Consequence of a problem |
| --- | --- | --- |
| Hierarchy | One dominant visitor action per primary region; meaningful heading structure | Offer a recommended alternative and preview; prevent structurally invalid output |
| Typography and layout | Tested type pairings, responsive scales, line lengths and spacing ranges | Tune within composition limits; no unrestricted coordinates |
| Color and access | Validate text/action contrast, focus visibility, semantic labels and non-color status | Block an inaccessible essential action; show an accessible alternative |
| Media | Responsive delivery, focal points, alt-text decisions, no autoplay audio; restrained motion with reduced-motion behavior | Require essential accessibility decisions; use a deliberate empty/media fallback |
| Truth | No fabricated content, copied sample facts, misleading metaphor or false availability | Block the affected release content until corrected or omitted |
| Long/empty content | Real long titles, missing images, zero and many Activities must remain coherent | Change supported layout or expose overflow before release |
| Mobile | No clipped primary actions; touch targets and keyboard flow checked at narrow widths | Prevent release of known unusable essential journeys |
| Providers | Local failure boundary, source/freshness labeling, fallback actions | Disable only the affected capability; retain useful host content |
| Portability | Stable Activity URLs, accountless paths where applicable, provider-neutral host identity | Flag dependencies; do not equate changing provider with changing host |
| Performance | Media/font/embed budgets with measured public-page behavior | Warn on excess; block only a defined essential-journey failure |

A Phase-0 document cannot establish browser quality. The following are proposed future acceptance scenarios, not executed tests or implementation authorization:

1. Use the same ordinary task set with a physical hall, online audio artist and hybrid community. Confirm visibly different information hierarchy and compositions with their real fixture content, not palette swaps.
2. Ask at least five representative nondeveloper operators to create a draft, edit a fact, find deeper control and explain what is live. Initial gate: all correctly distinguish draft/live before attempting release; at least four complete the core tasks without facilitator rescue. This is formative evidence, not a statistically validated market claim.
3. Revisit Direction after manual copy, crop and Activity edits. Show the proposed diff, cancel, then apply a layout-only change. Confirm identities/facts/protected edits survive and unplaced content remains recoverable.
4. Run narrow phone, desktop, keyboard-only and screen-reader task passes covering editing, preview, conflict resolution and release. Capture focus/validation behavior as well as screenshots.
5. Exercise two editors, failed save, uncertain publish result, concurrent release and restore. Confirm the language above matches actual state; no stale overwrite or unreviewed public change.
6. Inspect cancellation, changed slug, zero Activities, long titles, missing media and an unavailable optional provider across home, Activity page and accountless projections.
7. Demonstrate an accountless visitor and a host-language Hive action. Observe whether users understand the real action before approval. No live effect is needed to qualify the prototype interaction.
8. Capture comparable desktop/mobile screenshots plus short task recordings, exact build/revision and fixture identities. Record visual defects independently of CI. Performance/accessibility thresholds and supported browser matrix must be frozen before implementation qualification.

## 10. Explicit contradictions and tradeoffs for adjudication

These are unresolved contract decisions. Recommendations are not silent amendments to #245.

| ID | Tension with charter / competing alternative | Astra recommendation and cost | Decision required |
| --- | --- | --- | --- |
| T1 | Beautiful guided generation can conflict with exact later edits; alternative is one-click regeneration | Direction proposes reversible changes with protected edits. More review complexity; less instant transformation | Adopt protection/placement rules as graph contract |
| T2 | Radical differentiation versus premium restraint; alternative is unrestricted design canvas | Structural compositions plus bounded parameters. Reject arbitrary CSS/JS/layout initially; some hosts will outgrow the system | Define supported expressive surface and extension boundary |
| T3 | Look / Voice / Connect power versus calm default shell; alternative is permanent tabs | Put lenses behind Site and selection. One extra navigation step for frequent experts | Freeze default shell and test discoverability |
| T4 | Real-media-first versus procedural first-draft delight | Real assets win immediately; abstract bootstrap art supports sparse starts. No invented documentary imagery | Approve art provenance and sample-content release rules |
| T5 | One canonical graph versus “page is the data” convenience | Facts and identity survive placement changes; page edits explicitly declare scope. A little extra explanation replaces accidental duplication | Define canonical ownership and unplaced-content behavior |
| T6 | Immutable release promise versus live feeds, embeds and inventory | Freeze authored state and binding declarations; separately label changing observations. Pixel-exact restoration is not universally promised | Freeze what a release reproduces and asset retention policy |
| T7 | Frictionless participation versus exact consequences | Host-native gesture plus a brief precise consequence boundary; never disguise transfers as votes. Added friction is acceptable | Establish semantic disclosure contract and safe repeated-action policy |
| T8 | Independent Activities and urgent operations versus host-wide consistency | Begin with whole-host review. Urgent cancellation may expose unrelated draft work; selective release is deferred | Decide whether selective dependency-aware release is necessary at launch |
| T9 | “Frontend factory for Hive” versus accountless setup | Creation and practical visitor use can precede Hive connection. Hive-native power appears when it serves a goal | Confirm minimum launch capability without forced ecosystem onboarding |
| T10 | Guided creation simplicity versus durable private drafts | Identity for the draft exists immediately; operator authentication and anonymous retention require separate policy | Choose retention, ownership claim and cross-device recovery without assuming a wallet |
| T11 | Rich direct manipulation versus HTMX/server-state hypothesis | Specify behavior without selecting a framework. Server owns durable revisions; richer transient interaction is acceptable | #248 must prove save/conflict/focus/mobile behavior, not only HTML transport |
| T12 | Mature machinery reuse versus a clean operator experience | Reuse verified semantics/adapters behind calm workflows; do not import predecessor dashboard density | Freeze migration mappings and qualification evidence before reuse |
| T13 | Unified Activities versus distinct commerce concepts | Treat tickets/reservations primarily as capabilities attached to a happening; permit standalone opportunities where meaningful | Graph lane decides cardinality, recurrence and availability ownership |
| T14 | Complete publishing workflow versus concealed multi-service effects | Website release and external posts/payments remain separate initial operations | Decide future coordinated workflows and partial-success recovery explicitly |

I challenge Candidate B parity in three places: a restrained shell alone is insufficient without structural compositions; editable Voice must be a first-class semantic lens; real-media presentation must still serve operators who have no media. I also reject flattening Candidate A's page-data convenience into a graph where removal from a page destroys a domain object.

## 11. Proposed Phase-0 synthesis contract and stop

Project Lead should adjudicate T1–T14 against the independently frozen graph and architecture proposals. The minimum UX contract to take forward is:

- One durable draft graph from first setup choice through expert editing.
- Reversible Direction with explicit scope, protected manual edits and recoverable unplaced content.
- A quiet default shell with contextual access to structural Look, semantic Voice and purpose-led Connect.
- First-class Activity identity and dedicated public projection.
- Exact save/release/conflict/restore language with reviewed revision binding.
- Separate authored snapshots, live observations and externally authorized operations.
- Mobile parity for core operation, and later browser-visible evidence for quality claims.

Suggested architecture-slice UX stress case for #248: edit an Activity date from its home-page card; observe its dedicated page update in draft; introduce a second-editor conflict; resolve on mobile; review the exact snapshot; simulate uncertain publication; restore an older release to draft. This is an input to that lane, not its experiment plan or an authorization to implement.

### Deliverable coverage

| #247 deliverable | Location |
| --- | --- |
| End-to-end journey | §2 |
| Step map, rationale and preview | §2 |
| Setup → Studio | §3 |
| Studio information architecture | §4 |
| Progressive-disclosure matrix | §5 |
| Desktop and mobile interaction | §6 |
| Draft/release language and lifecycle | §7 |
| Activity editing | §8 |
| Quality guardrails | §9 |
| Contradictions/tradeoffs | §10 |
| Optional low-fidelity diagrams | Omitted; interaction tables are the specification |

Validation for this proposal is documentary: coverage of every required question, explicit treatment of contradictions, and verification of a one-file proposal diff and committed content. No build, browser test, accessibility audit, provider check or usability study is claimed. Those gates remain future work.

The commit containing this version is the immutable reference to report with the proposal PR. The PR is for review only; it must not be merged as an implicit Candidate C implementation authorization. Stop at this freeze. Do not read #246 or begin synthesis, product code or architecture experiments in this assignment.
