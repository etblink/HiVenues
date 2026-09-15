# Candidate C Phase 2B — Workstream F: client-island inventory and H1 adjudication 0.1.0

Tracks #258 (Workstream F) under builder charter #260. Audits the **actual final Candidate C implementation** at the E/F freeze, not an assumed architecture.

H1 (the falsifiable default since Phase 1):

> Server/HTML owns durable application state. JavaScript owns transient local interaction state.

## Method

Two instruments, both reproducible:

- `test/candidate-c-phase2b-h1.test.js` — static and HTTP-level accounting: enumerates custom client files under `public/js/candidate-c*`, forbids inline scripts/handlers in `views/candidate-c/**`, counts OOB regions on every Studio edit response, and checks that Workstream E pages ship no script.
- `scripts/candidate-c-phase2b-h1-browser.js` — Chromium measurement: ten representative edits (A–E), focus/selection after each swap, stale conflict, reload, BFCache/history return, browser storage, and the whole Workstream E path plus a full-page Studio save with **JavaScript disabled**. Writes `artifacts/candidate-c-phase2b-h1-review/manifest.json`.

## Inventory — every Candidate C custom client island

There is exactly **one**.

### `public/js/candidate-c-studio.js` — 120 lines, 4.5 KB, loaded only by `views/candidate-c/studio.ejs`

| Aspect | Finding |
| --- | --- |
| Responsibilities (declared at runtime in `window.CandidateCStudio.responsibilities`) | open/close the mobile contextual inspector; restore focus after server-rendered inspector swaps; preview media focal position before an explicit server commit; mark transient saving state while an HTMX request is in flight; render server-owned stale-revision conflicts without treating them as successful saves; reconcile page restoration with current server truth |
| Durable Host/Activity/Offer/Media/Presentation/draft/Release state mirrored client-side | **None.** `durableStateMirror: false`. The island reads one DOM attribute (`#draft-status[data-revision]`) and two range inputs; it holds no graph data, no revision cache, no release list. `localStorage` is empty after the full flow; `sessionStorage` holds only htmx's own `htmx-current-path-for-history` key. |
| Network | one `fetch(window.location.href, { cache: 'no-store' })` in the `pageshow` reconcile (lines 99–115); no other requests originate in custom code |
| Representative OOB/targeted region counts | every Studio edit — headline, activity text, **activity status (E)**, offer (D), look (D), voice (D), connect (D), media focal (B), section order, undo — returns **1 targeted swap (`#candidate-inspector`, outerHTML) + 2 OOB regions (`#draft-status` outerHTML, `#candidate-canvas-slot` innerHTML) = 3 regions**, response 3.4–10.1 KB. Min = max = 3 across all ten. |
| Focus behaviour | after each swap `document.activeElement` is the new panel's `<h2>` (tabindex −1). **Defect found and fixed in this workstream:** the frozen island focused `event.detail.target`, which for `outerHTML` swaps is the detached previous panel, so focus silently fell to `<body>` after every save. Fixed by re-querying the live `#candidate-inspector` (line 90). |
| Selection behaviour | selection is server-rendered (`selectedResource` in the swapped panel); the inspector stays open (`data-open="true"`) and shows the same task after each save. **Improvement made:** Undo now carries the selected resource so the panel does not collapse to "Choose something to shape." |
| Stale-conflict behaviour | 409 response → `beforeSwap` forces the swap of the server-rendered conflict panel (`role="alert"`), save-state reads **Not saved**, the document keeps its old rendered revision (11) while the server is at 12, and the stale write changed nothing server-side (`draftUnchangedByStaleWrite: true`). |
| Refresh reconstruction | `page.reload()` renders server truth: rendered revision = server revision (12), canvas headline is the other writer's text. Nothing is rehydrated from the client. |
| BFCache/history | navigate to Release review → server-side edit → `history.back()`: the `pageshow` reconcile detects the revision mismatch, reloads once, and the restored document shows server revision 13 with the "Changed while away." headline. |
| Complexity added by Media (B) | one `input` listener setting two CSS custom properties and an `<output>` (lines 41–52, 60–62); zero requests during slider movement (measured), a single POST on Save. |
| Complexity added by D controls | **zero lines.** Offer, Look, Voice, Connect are plain HTMX forms rendered by the server. |
| Complexity added by E urgent operation | **zero lines.** The draft status control is another HTMX inspector form (same 3-region response). Compose and review are full-page HTML forms with **no `<script>` at all**; the released notice is server-rendered from the redirect query. The entire urgent path was executed and published with JavaScript disabled. |

### Everything else

| Surface | Custom JS | Notes |
| --- | --- | --- |
| Public home pages (3 families) | 0 | no script tag |
| Public Activity pages (3 families) | 0 custom | `htmx.min.js` (local, unmodified) for the RSVP fragment; plain form fallback works |
| Setup, Direction, Direction review, Release review, Consequence | 0 | full-page forms; Setup save verified with JavaScript disabled |
| Urgent compose / review (E) | 0 | verified with JavaScript disabled |
| Inline `<script>` or `on*=`/`hx-on` handlers in `views/candidate-c/**` | 0 | asserted by test |
| Test-only client harnesses under `test/support/candidate-c-*` | not shipped | excluded from the inventory by definition |

## H1 adjudication

Finding: **`H1_CONTINUE`**.

Grounds, in falsification terms:

1. **No subsystem mirrors durable state.** After B (real media), D (Look/Voice/Connect/Offer depth) and E (urgent operation), the only client-held values are two slider positions and a rendered revision attribute used purely to detect staleness. Browser storage contains no HiVenues data.
2. **Region fan-out did not grow.** Every one of ten representative edits, including the new E status control, is exactly three server-rendered regions. Media, D and E added depth on the server, not orchestration on the client.
3. **The hardest new flow needs no JavaScript.** The dependency-closed urgent operation — the Phase-0 production requirement — is a plain-form, full-page task that publishes correctly with scripting disabled. A subsystem that H1 could not carry would have shown up here first.
4. **Conflict, refresh and history behave as server-truth reconciliation**, not client reconciliation: 409 panels are server-rendered; reload and BFCache return both converge on the server revision with one bounded reload.
5. **The one client defect found (focus after outerHTML swap) was a bug in the transient-interaction layer**, fixed in four lines, and is not evidence for moving durable state client-side.

Nothing in the measured evidence justifies `HYBRID_NARROW_<SUBSYSTEM>` or `H2_REQUIRED_FOR_<SUBSYSTEM>` for any subsystem. This is not a cosmetic preservation: the instruments above would report region growth, storage use, script additions on E pages, or failed no-JS publication if a later change crosses the line.

## Watch-list for the next phase (not findings)

- If Media authoring grows a real crop/drag surface, the focal preview may become the first candidate for `HYBRID_NARROW_MEDIA_FOCAL` — it would still commit through the same server revision.
- Multi-Activity hosts with long rails at 390px may need server-side pagination of the rail before any client-side filtering is considered.
