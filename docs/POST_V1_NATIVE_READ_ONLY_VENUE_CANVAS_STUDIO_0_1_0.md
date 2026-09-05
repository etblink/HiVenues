# Native read-only Venue Canvas in Studio 0.1.0

Issue #142 integrates the accepted semantic selection projection into the local Venue Studio. The operator can explore a real venue preview alongside page structure and a contextual inspector. Every view derives from the current Studio proposal and one strict semantic selection.

| Boundary | Contract |
| --- | --- |
| Canonical base | `a62e0716ef0b99258fd5b32fe5d202073803ef4e` |
| Base tree | `1ae89407736bffa0120f4316d414154cc100848b` |
| Product baseline | HiVenues `v1.0.0` |
| Entry | One Studio link; frozen API adds `canvasPath = editorPath + "/canvas"` |
| Source | `session.proposalDraft`; accepted source remains owned by the existing session |
| Route | GET with `Cache-Control: no-store`; POST is absent |
| Default | An absent query selects `page.home` |
| Explicit query | Exactly one scalar `blockId` and optional scalar `fieldId` |
| Invalid selection | Neutral HTTP 400; proposal, accepted bytes, and session status stay unchanged |
| Renderer | Existing `previewPath` iframe, with no editor-only venue rendering or DOM instrumentation |
| Interaction | Ordinary links; selection and navigation only |
| Persistence / schema | No new persistence, source schema, or deployment binding |

## Source adaptation

The previously accepted projection takes a v1 bound-authoring envelope, while Studio owns a deployment-agnostic source envelope. `projectStudioSource` validates the existing source and supplies an internal, constant local projection reference solely to satisfy that model's input shape. The reference never reaches the HTML, downloadable source, session, deployment configuration, or authoring authority. No real deployment identity is invented or selected. Tests prove the accepted and proposed canonical bytes remain exact.

The projection remains immutable and stateless. Its existing model-only `runtimeWired` declaration describes the model; this separately authorized adapter provides the local HTML route. Neither component exposes mutation commands.

## Workspace and navigation

Desktop uses a compact Studio top bar, page structure rail, wide real-renderer Canvas, and contextual inspector. The Canvas control group shows the selected block and its children, derived from the projection cards. The complete semantic tree and Previous/Next/Containing block/Parent block/First child/First field links provide access to the remaining structure in model order.

A field selection keeps its containing Canvas control and tree row selected. The inspector, selected-context summary, diagnostics, and current navigation target expose the same exact block and field IDs. Source pointers and navigation indexes are diagnostics, not identity. Reordering Juniper equipment changes those diagnostics while retaining stable `wood-shop`/`name` selection.

Explicit navigation focuses the selected-context summary. Default entry does not steal focus. Native links support Enter and Tab, minimum 44 × 44 CSS-pixel targets, visible outline treatment, textual selected labels, and `aria-current`. Mobile uses one column and named Canvas, Tree, and Inspector jump links. Reduced-motion mode has no animation or scrolling dependency.

The iframe is the real renderer. Selection through semantic controls does not select, scroll, highlight, instrument, or edit elements inside that rendered page. The read-only Canvas has no form, edit field, command payload, save action, publish action, or deploy action. Returning to the existing form editor retains its four-stage preview/keep/save/undo workflow.

## Completion criteria and evidence classes

| Criterion | Evidence class and executable oracle |
| --- | --- |
| API, entry link, default/block/field identities for Fourth Street and Juniper | CI: `test/read-only-venue-canvas-studio.test.js` |
| Every rendered block/field/navigation link round-trips | CI: exhaustive target and link test in that suite |
| Invalid query shape/identity, stale removal, safe 400, exact source and session neutrality | CI: route and parser tests in that suite |
| Stable equipment selection after reorder, changed pointer/index | CI: Juniper reorder test |
| GET cannot apply/discard/save; POST absent; no mutation controls or leaked internal reference | CI: source snapshots, route and static markup tests |
| Existing form editor preview/keep/download/undo remains authoritative | CI: integration regression and existing authoring suites |
| Dynamic values and URLs escaped | CI: malicious display-name and URL round-trip regressions |
| Responsive geometry, real preview, exact focus, native keyboard round-trip, 44px links, reduced motion | CI: `capture-source-authoring-visual.js`, Fourth Street and Juniper at 1440 × 1000 and 390 × 844 |
| Preview viewport integrity, browser errors, external requests, Hive RPC calls | CI: same browser machine suite with loopback fixture and network/RPC assertions |
| Axe serious/critical gate and classified lesser findings | CI: host and preview Axe checks plus `assemble-current-visual-evidence.js` |
| Exactly two new current viewport captures | CI: visual contract test, `capture-current-contract-visual.js`, assembly identities/geometry/hash verification |
| Full regression and platform portability | CI: existing Ubuntu/Windows deterministic and production audit jobs; local `npm run check` |
| Visual job selected for this candidate | CI classifier: changed source-authoring, visual contract, and capture/assembly paths |
| Readable real preview, calm desktop hierarchy, intentional mobile layout, understandable selection | Project Lead manual review of exact-head viewport artifacts |
| Fourth Street reference identity, Juniper synthetic evidence, separate generated-home track | CI identity assertions plus independent Project Lead visual review |
| Eight-path scope, authority and architecture | Exact-diff Project Lead review against issue #142 |
| Live external observation | Not applicable: this phase has no live effect |

The current review adds only `fourth-street-canvas-desktop` and `juniper-canvas-mobile`. Existing generated-home captures remain an independent review track. Historical full-page images remain machine intermediates; human acceptance uses actual viewport captures. The machine suite shares its Canvas inspection helper with the current capture to avoid divergent geometry definitions. The full historical qualification envelope is retained; no CI scope reduction is made.

## Acceptance and follow-on boundary

Candidate implementation is not acceptance. Acceptance requires all frozen machine criteria, exact-head CI including the visual job, code and manual visual review, a fresh-main race, an explicit Project Lead merge decision, canonical post-merge qualification, issue reconciliation, and the post-milestone Memory OS audit. Exact accepted commit/tree/run identities belong in the PR and project evidence ledger.

Any command application, direct iframe hit testing, drag/drop, inline editing, undo/redo, recovery cache, persistence, component/schema expansion, public authoring, publishing, or deployment needs a separate frozen phase and authorization. Production, real venues, Hive/Keychain, keys, authorities, payments, DNS, VPS, services, dependencies, and repository settings are outside issue #142.
