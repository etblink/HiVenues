# Candidate C Phase 2B — Workstream E: dependency-closed urgent website operation 0.1.0

Tracks #258 (Workstream E) under builder charter #260. Starts from the exact D freeze `3083ef2f1e35ec1517157a3141c1c5df33da8aff`.

## Requirement carried from the Phase-0 contract

> An urgent cancellation/status/hotfix path must be able to start from the **live Release** plus a dependency-closed set of selected urgent changes, without accidentally publishing unrelated draft work.

## Design in one paragraph

An **urgent update** is a second, deliberately narrow way to create a website Release. The ordinary whole-host Release from the working version remains the default consistency boundary and is unchanged. An urgent update never reads the working draft as an input: it starts from the live Release snapshot, applies exactly one bounded change (`activity-status`: an Activity's `lifecycle` and optional `statusNote`), derives the closure of everything that change depends on to render truthfully, proves that the result differs from the live snapshot at exactly the declared paths, shows the operator three lists (what changes, what stays live unchanged, what stays in Studio unpublished), and — only if the live Release and the working version are both still exactly what the review was prepared against — publishes a new immutable Release of kind `urgent` with explicit base/operation provenance. The same status change is then carried into the working version as its own revision so that the next whole-site release cannot silently regress the cancellation.

## Why "activity status" and nothing more

Cancellation/status is the minimum qualifying example in #258/#260. The implementation is intentionally *not* a partial-publishing engine:

- `URGENT_CHANGE_KINDS = ['activity-status']` (`src/candidate-c/urgent.js`);
- one change per operation; one operation per Release; an operation is single-use;
- targets must already exist on the live site (`URGENT_TARGET_NOT_LIVE` otherwise) — publishing a brand-new Activity is a whole-host Release, by design;
- no arbitrary path selection UI exists, and none is needed by the evidence gathered.

Evidence did not demonstrate that broader machinery is required. If a later phase needs a second kind (for example an urgent `facts.presence.label` "doors moved to 8 PM" change), it enters through `normalizeChange`/`deriveUrgentClosure` with its own declared closure, not through a generic picker.

## Closure model

`src/candidate-c/urgent.js`:

- `graphPaths(graph)` flattens a Host graph to a deterministic `path → value` map. Collections whose items carry HiVenues identity (`activities`, `offers`, `media`) are keyed by **id** (`activities.<id>.title`), and each collection also emits `<collection>#ids` so membership/order changes are visible without masquerading as item edits. `presentation.arrangement` is one value because its order is the fact.
- `diffGraphPaths(before, after)` — sorted list of paths whose values differ.
- `deriveUrgentClosure(liveGraph, change)` returns:
  - `closure.authorized` — the field envelope the operator may touch: `activities.<id>.lifecycle`, `activities.<id>.statusNote`;
  - `closure.changed` — the **exact actual graph diff** live→result (a lifecycle-only change lists one path; an exact no-op is refused with `URGENT_NO_CHANGE` and can never mint a Release);
  - `closure.retained` — retained-live dependencies: the Activity's `title`, `slug`, `startsAt`, `endsAt`, `presence`, `publicActions`; `media.<mediaId>`; `voice.terms.<mechanic>` for every public action; `presentation.compositionFamily`, `presentation.arrangement`, `presentation.accent`;
  - `proof` — `baseDigest`, `resultDigest`, `actualChanged` (= `closure.changed`), `unexpectedChanges` (actual − authorized; must be empty), `retainedMismatch` (any retained path whose value moved; must be empty), `closed` (boolean).

Closure and proof are **derived data**. They are persisted for provenance display only and are never trusted:

- `verifyUrgentOperation(baseRelease, operation)` re-derives from the immutable base Release snapshot + `operation.change` and requires exact equality of `closure.authorized/changed/retained` and every proof field (`URGENT_PROVENANCE_MISMATCH` names the fields otherwise);
- `verifyUrgentRelease(baseRelease, release, derived)` requires `release.changedPaths` to equal the actual diff base→release snapshot **and** the re-derived `closure.changed`, and `release.digest` to equal the re-derived result digest;
- `importState` runs both for every persisted operation (review or released) and requires every `kind: 'urgent'` Release to be coupled to a released operation that points back at it — any tampered derived field fails closed with `CANDIDATE_C_INVALID_PERSISTED_STATE`;
- `executeUrgent` sources Release `changedPaths`, carry-forward `manualPaths`, and the exact draft carry set from the fresh derivation only; draft carry transplants only those exact changed paths and refuses any carry diff outside that set;
- the review page renders its changed/retained rows from the fresh derivation and withholds the publish form if verification fails.

(Corrective passes for Project Lead findings E-PROVENANCE-1A/1B and E-DRAFT-PRESERVATION-1 on #260.)

## Store semantics (`src/candidate-c/store.js`, `file-store.js`)

| Operation | Inputs bound | Fails closed when |
| --- | --- | --- |
| `proposeUrgent(slug, change)` | live Release id + digest at proposal time | no live Release; unsupported kind; invalid lifecycle; target not live; closure open |
| `executeUrgent(slug, opId, expectedLiveReleaseId, expectedRevision, expectedDigest)` | operation base id/digest **and** form's expected live id **and** draft revision+digest | operation missing/used (`URGENT_ALREADY_RELEASED`); live Release moved (`STALE_LIVE_RELEASE`); draft moved (`STALE_REVISION` / `STALE_DIGEST` / `INVALID_*`); persisted closure/proof ≠ fresh derivation (`URGENT_PROVENANCE_MISMATCH`); re-derived closure not closed; empty actual diff (`URGENT_NO_CHANGE`) |

Result of a successful execution:

1. a new Release `{ kind: 'urgent', baseReleaseId, operationId, changedPaths (= exact actual diff base→snapshot), draftRevision: base.draftRevision, digest, snapshot }` appended and made live;
2. the working version receives one new revision labelled `urgent-carry:<releaseId>` transplanting only the exact freshly-derived `changedPaths` from the urgent Release result (those paths are added to `manualPaths`, while every other draft path is preserved);
3. the operation becomes `state: 'released'` with `releaseId`/`releasedAt`.

Persistence stays on storage version 1: new fields are additive and strictly validated on load (release `kind` ∈ {full, urgent}; urgent releases must name an existing, different base Release, an operation id and string `changedPaths`; urgent operations must reference an existing base Release whose digest matches `baseDigest`, carry a normalizable change, a closure and a closed proof, and — if released — a Release of kind `urgent` pointing back at them). Records written by the D freeze (no `kind`, no `urgent` array) load as `kind: 'full'` / no operations.

### Why the carry-forward into the draft

Without it, the very next ordinary Release could republish stale live-state fields from the working version and silently regress the urgent truth. The carry is an explicit, undoable revision; review states it plainly ("also carried into your working version as its own step"). The urgent truth wins only at paths that actually changed on the live site. Draft-only edits at every other path — including the other field inside the authorized status envelope — remain exactly as the operator left them.

## Operator surface

- Activity inspector: a **Status** control for the ordinary draft path (`POST /studio/:slug/activity-status`) and an **On the live site** block showing the live status with **Change the live status now** (`GET /studio/:slug/urgent?activity=<id>`).
- Compose (`views/candidate-c/urgent-compose.ejs`): activity list *as it appears live*, three status choices in operator language, optional 240-character note, consequence statement. Plain HTML form; no script.
- Review (`views/candidate-c/urgent-review.ejs`): **What changes** (before/after table), **Stays live, unchanged** (retained dependencies with resolved names), **Stays in Studio, not published** (draft − live, minus the carried paths), technical details (base/result digests, closure proof), and the publish form bound to `expectedLiveReleaseId` + draft tokens. All fail-closed outcomes render on this page with HTTP 409 and a specific, calm explanation.
- Studio: a released notice (`?released=<id>&urgent=1`) — "Live site updated. The urgent status change is live. Your other working edits are still here, unpublished."
- Release review/History: an **Urgent update** entry card; urgent releases labelled "Version N + urgent update" with base/changed-path provenance under Technical details.

## Public surface

All three families (poster, editorial, hospitality) render `views/candidate-c/_status.ejs` on the home Activity block and the Activity page: a `role="status"` chip (**Cancelled** / **Already happened**) with the note. RSVP is closed at the consequence boundary: the form is not rendered and a direct `POST …/rsvp` returns 409 with nothing recorded. The ICS projection carries `STATUS:CANCELLED` and a `Cancelled:` summary prefix. Studio canvases show the same chip so the operator sees it in the site preview.

## Evidence map (#260 required tests)

| Requirement | Deterministic (`test/candidate-c-phase2b-urgent.test.js`) | Browser (`scripts/candidate-c-phase2b-urgent-browser.js`) |
| --- | --- | --- |
| live Release differs from current draft | `divergeDraft` asserts digests differ | tagline edited in browser before compose; `proof.unpublishedDraftPathsBefore` |
| draft has unrelated edits that stay unpublished | tagline + description edits; asserted absent from public after urgent release, present in Studio | `facts.tagline` listed as unpublished; public tagline unchanged; canvas shows draft headline |
| urgent status change selected | compose/propose | compose page, radio + note |
| dependency closure explicit/provable | `closure.authorized/changed/retained`, `proof.closed`, `actualChanged === changed`; lifecycle-only / note-only / note-removal / no-op cases; 16 tamper cases on persisted derived fields fail closed on import | `data-urgent-closed="true"`, retained list includes the Activity's media |
| review distinguishes changed vs retained-live | `data-urgent-changed`/`data-urgent-retained`/`data-urgent-unpublished` rows | same, read from the DOM |
| public surface from new immutable urgent Release | `publicSnapshot.liveReleaseId === release.id`; `kind: 'urgent'` | `proof.urgentRelease`, screenshots 06/07 |
| unrelated draft edits remain in Studio, still not live | asserted after release | screenshot 05 + assertions |
| restart preserves state and provenance | file-store restart; tamper tests | fresh `FileCandidateCStore` on the same state file after publish |
| stale revision/digest conflict fail-closed | STALE_REVISION / STALE_DIGEST / STALE_LIVE_RELEASE / replay | second session releases first → 409 review page (screenshot 04) |

Browser summary at the frozen head: 12 screenshots (desktop + 390px), 0 blocking accessibility findings, 0 horizontal overflow, 0 incomplete images, 0 external requests, 0 unexpected console/page errors, all external-effect counters 0.

## Known limitations

- One change kind only (by charter). Offers/Media/Voice have no urgent path.
- The status note is plain text (240 chars); no links.
- "Already happened" is operator-set; nothing auto-completes an Activity by clock.
- Abandoned review-state operations are retained in persistence for provenance; there is no purge.
