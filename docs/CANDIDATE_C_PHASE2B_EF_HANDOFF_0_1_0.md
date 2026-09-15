# Candidate C Phase 2B — E/F builder handoff notes 0.1.0

Builder: Fable 5.1 under charter #260 (parent #258). Start: exact D freeze `3083ef2f1e35ec1517157a3141c1c5df33da8aff` (tree `8d2c8dd15902807a322c02eb50af42e916577266`) on `candidate-c/phase2b-ef-fable`. Exact final commit/tree, bundle and evidence digests are recorded in the out-of-tree handoff manifest that accompanies the Git bundle (they cannot be written into the tree they describe).

Companion documents:

- `docs/CANDIDATE_C_PHASE2B_WORKSTREAM_E_URGENT_OPERATION_0_1_0.md` — E design and closure proof.
- `docs/CANDIDATE_C_PHASE2B_WORKSTREAM_F_CLIENT_ISLAND_INVENTORY_0_1_0.md` — F inventory and the H1 finding (`H1_CONTINUE`).

## Corrective pass (Project Lead review on #260: `NOT_ACCEPTED / BLOCKED_ON_E_PROVENANCE_1`)

Bounded to the E provenance invariant; no other product change.

- **1B** — `closure.changed` and Release `changedPaths` are now the exact actual graph diff; the authorized field envelope is stored separately as `closure.authorized`; an exact no-op is refused (`URGENT_NO_CHANGE`) at derive, propose, execute and HTTP compose (calm "Nothing would change." notice).
- **1A** — persisted closure/proof are treated as derived data: `verifyUrgentOperation` / `verifyUrgentRelease` re-derive from the immutable base Release + change and require exact equality; `importState` runs them for every operation and every urgent Release (including operation↔base↔Release coupling and base→result diff equality); `executeUrgent` sources provenance and carry paths from the fresh derivation only; the review page renders from the fresh derivation.
- Tests added: lifecycle-only, note-only, note removal, exact no-op, exact base→result provenance equality, in-memory tampered closure at execution, and 16 persisted-tamper cases (`closure.authorized/changed/retained`, every proof field, `operation.change`, Release `changedPaths` superset/subset/order, operation↔Release decoupling, self-referential base).
- **E-DRAFT-PRESERVATION-1** — urgent carry-forward now transplants only the exact freshly-derived `closure.changed` paths into the current draft; draft-only edits elsewhere in the same authorized envelope are preserved. Focused tests cover lifecycle-only urgent carry with a draft-only note, note-only urgent carry with a draft-only lifecycle, exact carry diff scoping, and durable restart preservation.

## What changed since the D freeze (architectural summary)

| Area | Change |
| --- | --- |
| `src/candidate-c/model.js` | `activity.statusNote` (optional, ≤240); `activityLifecycles` registry with operator/public labels |
| `src/candidate-c/urgent.js` (new) | id-keyed graph path flattening, deterministic diff, `activity-status` closure derivation (authorized envelope vs exact changed set) with machine-checkable proof, `verifyUrgentOperation` / `verifyUrgentRelease` re-derivation checks, operator path labels |
| `src/candidate-c/store.js` | `editActivityStatus` (draft path); `proposeUrgent` / `urgentOperation` / `executeUrgent`; Releases carry `kind` (`full`/`urgent`) and urgent provenance (`baseReleaseId`, `operationId`, `changedPaths`); per-workspace `urgent` operations persisted; strict fail-closed validation of all new fields; exact-path urgent result carried into the draft as revision `urgent-carry:<releaseId>` without overwriting unrelated draft-only status fields |
| `src/candidate-c/file-store.js` | lock-guarded delegation for the three new mutations and one read |
| `src/candidate-c/present.js` | activity `status`/`open`/`live` projections; ICS `STATUS:` and `Cancelled:` summary |
| `src/candidate-c/router.js` | `POST /studio/:slug/activity-status`; `GET/POST /studio/:slug/urgent`; `GET /studio/:slug/urgent/:id`; `POST …/urgent/:id/publish` (409 renders the review page with a specific reason); RSVP refused (409) when an activity is not open; released notice locals; Undo keeps the selected task |
| Views | `urgent-compose.ejs`, `urgent-review.ejs`, `_status.ejs`, `fragments/rsvp-closed.ejs`; inspector Status control + live-status entry; release review urgent entry + history provenance; Studio released notice; status chip on 3 home, 3 Activity and 3 canvas templates; RSVP form hidden when closed |
| CSS | status chip (light/dark surfaces, specificity-safe), diff table, live note, notice, urgent form; radio sizing inside `.cc-choice` (also fixes the frozen Setup page); poster hero/canvas headline `overflow-wrap` guard |
| Client island | one 4-line fix: focus restoration after `outerHTML` swaps targeted the detached panel |
| Tests | `test/candidate-c-phase2b-urgent.test.js` (13), `test/candidate-c-phase2b-h1.test.js` (2) |
| Browser qualification | `scripts/candidate-c-phase2b-urgent-browser.js` (E), `scripts/candidate-c-phase2b-h1-browser.js` (F), `scripts/candidate-c-phase2b-closure-browser.js` (Phase 2B matrix); one wait added to the frozen D Studio harness to remove a race |
| CI | `.github/workflows/candidate-c-phase2b-browser.yml` runs the new suites and publishes their evidence |

Doctrines preserved: host world first; one canonical Host graph; metaphor at the experience layer / truth at consequence boundaries (RSVP closes server-side, ICS carries status); server/HTML owns durable state; exact revision + digest conflicts; immutable Releases with truthful provenance; calm operator language with specialist truth under "Technical details"; `/candidate-c` isolation unchanged.

## Reproduction for an independent tester

Requirements: exactly Node 24.19.0 / npm 11.17.0 (`ops/privex/manifest.json`), Chromium for Playwright 1.62.1.

```bash
git clone <bundle-or-remote> HiVenues && cd HiVenues
git checkout candidate-c/phase2b-ef-fable
git rev-parse HEAD 'HEAD^{tree}'              # must equal the manifest's final commit/tree
git merge-base --is-ancestor 3083ef2f1e35ec1517157a3141c1c5df33da8aff HEAD && echo "descends from D freeze"
npm run release:check:runtime
npm ci --ignore-scripts --no-fund
npx --no-install playwright install --with-deps chromium

# Deterministic gate (same as CI "verify" + audit)
npm run check

# Candidate C Phase 2B suites only
node --test --test-concurrency=1 test/candidate-c-phase2b-*.test.js

# Browser evidence (writes artifacts/candidate-c-phase2b-*-review/{manifest.json,*.png})
export CANDIDATE_C_PHASE2B_EXACT_SHA=$(git rev-parse HEAD)
node scripts/candidate-c-phase2b-browser.js          # B/C (frozen)
node scripts/candidate-c-phase2b-studio-browser.js   # D (frozen; harness wait added)
node scripts/candidate-c-phase2b-urgent-browser.js   # E
node scripts/candidate-c-phase2b-h1-browser.js       # F
node scripts/candidate-c-phase2b-closure-browser.js  # Phase 2B matrix
CANDIDATE_C_PHASE2A_EXACT_SHA=$(git rev-parse HEAD) node scripts/candidate-c-phase2a-browser.js  # 2A regression

# Run the product yourself
CANDIDATE_C_STATE_PATH=/tmp/candidate-c-state.json npm start
# open http://127.0.0.1:<port>/candidate-c  → Studio → an Activity → "Change the live status now"
```

Every manifest must show `blockingAccessibilityFindings: 0`, `horizontalOverflowFindings: 0`, `externalRequests: 0`, `unexpectedConsoleErrors: 0` and all six external-effect counters at 0.

## Known limitations / deferred

- **No CI run ids.** The builder environment has no push or GitHub API access to `etblink/HiVenues`; the branch is delivered as a Git bundle. Ubuntu + Windows CI must be run by the Project Lead at the exact final head (opening a draft PR against `candidate-c/phase2b-production-substrate`). Locally, `npm run check` passed with exit 0 (1232 pass / 0 fail, audit clean) on Linux x64.
- **Local Chromium differs from CI's pin.** Local qualification ran on Chromium 141.0.7390.37 (the container's preinstalled build) instead of the Playwright 1.62.1 pinned revision; CI installs the pinned build.
- Urgent operation covers `activity-status` only (by charter). Offers/Media/Voice have no urgent path.
- Abandoned review-state urgent operations are kept for provenance; no purge exists.
- Studio has no operator-facing "compare working version to live" view outside the urgent review; the review's "Stays in Studio, not published" list is the only place the draft/live diff is shown.
- `docs/CANDIDATE_C_PHASE2A_IMPLEMENTATION_NOTES_0_1_0.md` is not rewritten; E/F notes live in the two companion documents.
- The Fourth Street Bar specimen is intentionally **not** built (reserved for the independent Astra operator exercise).
