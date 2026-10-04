# Era 7 Stage 5D — operator workspace, A–C

Governing charter: #398. This implementation follows owner approval of the Stage 5D design study. It does not satisfy #374 or authorize D–E.

## Lineage and scope

The dedicated `feature/era7-stage5d-operator-workspace-ac` branch starts at the exact assessed #397 acceptance candidate:

- Commit: `e469282b39d533f1803dcd47b61663dbf05043de`
- Tree: `9955d14e52114a091201118f7bc649e0153578ca`

The historical #397 branch is unchanged and remains unmerged. Integration is an owner decision. The original independent first-use findings remain frozen outside the repository; implementation evaluation is explicitly subsequent evaluation.

## A. Derived operator contract

`operator-present.js` joins the current draft, immutable saved copies and destination records at request time. It adds no durable state and no client state mirror.

Public success requires the existing publication contract to validate the stored DNS/TLS/read-back evidence, plus exact correspondence between expected/observed identity and the current active content/package/runtime. Synthetic targets never enter the public website list. Incomplete, mismatched, missing and invalidated proof cannot supply a public content comparison. A disconnected management boundary remains visible independently of the last accepted website observation.

Comparisons name their baseline: the selected destination's last verified website. Latest approved content is never substituted for the public website. A result page also checks that the observed active copy is the copy named in this publishing journey. Another verified copy is not success for this attempt.

## B. Workspace and editing

The workspace has four destinations: Edit website, Content, Website and History. The operator home reads draft records, so a new unpublished place is immediately accessible. It does not label a local Release projection as a public website.

The existing Direction-specific canvas and contextual authoring remain. Navigation, preview and the next action remain accessible on a phone. HTMX saves return coherent draft status, canvas/navigation and operator status fragments. The transient Studio client continues to own only interaction feedback, focus and presentation geometry.

Creation and ordinary editing copy now describe the venue and the draft. All three public Directions remain structurally distinct. Draft previews have persistent identity and a return link. Immutable saved-copy previews reuse the same server renderer and preserve their own activity, calendar and Territory routes, independent of later draft edits.

## C. One publishing journey

1. Review the draft. Explicitly confirm the exact content and save it as an immutable copy; revision and content-digest guards reject stale reviews. Identical content can reuse its existing saved copy without duplicating it or changing Release semantics.
2. Continue with that named copy. Later draft edits do not alter it. Choose one destination explicitly; selection/package preparation is local only.
3. Review exact destination consequences. The current deployment service prepares the same digest-bound review. The operator confirms the server, exact copy and scope. Existing strict submission parsing and service stale-review checks gate execution.
4. Show the observed result. Exact server installation remains distinct from public HTTPS proof. Address publication has its own existing exact service review and consequence confirmation. Public verification calls the existing read-only observation method. No synthetic result establishes public proof.

The original protected server-connection and DNS setup tools remain available for setup that precedes exact execution. They retain selected-copy continuation links. The familiar journey handles a checked destination and continues through address confirmation and result; this pass does not replace the provider/authority setup engine or the specialist recovery surfaces.

This local Studio offers review/save/preview and states that internet publishing is unavailable. Synthetic tools are labelled at the entry and per target. No real provider, VPS, DNS, TLS, Hive, payment or other external mutation was used for implementation evaluation.

## Preserved boundaries

No changes to HostGraph, Release storage semantics, deployment engine/coordinator, authority storage, public evidence validation, rollback restrictions, restart persistence, DNS/TLS validation, wallet signing or economic services. The existing release-selection route and new journey share one extracted selection function; its checks are unchanged. Legacy safety routes remain available.

History is a minimal destination for saved copies with separate links to existing draft restoration and website recovery. Redesigned restoration, rollback, urgent divergence, reconnection and app lifecycle remain D–E. No arbitrary historical copy becomes an eligible rollback.

## Qualification and owner evaluation

`test/era7-stage5d-workspace.test.js` covers evidence variants, A-public/B-approved/C-draft divergence, stale content approval, exact-copy preview isolation, cross-host ownership, strict destination/address submission, stale exact-service execution and result identity. Its deployment exercise uses the real installed service and coordinator with an in-memory target transport.

The product browser qualifier now covers the new workspace at 1440, 390 and 320 pixels, explicit content approval, destination review, exact execution and the honest public-check-pending result. These screenshots carry an offline qualification banner. Existing participation, authority, deployment, runtime and recovery qualification remains applicable. Live-provider and public-Internet proof are not claimed.

The post-implementation operator walkthrough uses retained Juniper Room state and creates a new fictional Cedar Listening House. Expectations are recorded before consequential actions. It exercises create, edit, HTMX save, mobile workspace, draft preview, exact saved-copy preview, approval/reuse, Website/History entry, and a separately labelled offline installed-service journey. It found and corrected toolbar contrast, hidden mobile save feedback, obsolete viewport diagnostics, publishing steps shown in local-only mode, and draft Preview leaking into the saved-copy review context.

Final commit/tree, test counts, browser manifests and applicable CI results belong in the PR and the accompanying owner review report. Stop at owner review; do not merge #397 or claim #374 acceptance.
