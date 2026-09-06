# Contextual Canvas text preview 0.1.0

Issue #146, based on canonical `c641bd05fafc9501e5ad5e5743b5322aa5978603`.
The user authorized implementation, review, merge and canonical qualification.

## Product contract

The form editor links to a separate local `/canvas-editor` route. Selecting an
existing home text field exposes one labeled native input and an explicit
**Preview change** action beside the real renderer. The existing `/canvas` route
continues to be GET-only and contains no mutation controls.

The adapter derives eligibility from the semantic field descriptor and source
ownership map. Only operator-owned `text` and `multiline-text` home descendants
with string or explicitly optional null values qualify. It parses one strict
versioned `set-field`, uses the existing semantic command authority gate, strips
the private compatibility envelope, and applies the ordinary source authority
gate before replacing the session proposal once. Optional empty text normalizes
to null. Unsupported controls stay read-only. Source schema, command vocabulary
and structural editing do not change.

Each form carries an unpredictable per-surface token and a revision derived from
the canonical accepted/proposed bytes plus a monotonic session generation. Native
POST requires a matching loopback origin, exact scalar form keys and a bounded
body. Intervening edits, keep, undo, reorder or removal invalidate old forms,
including changes that return to identical source bytes. A conflict shows current
data; missing selections recover to the page selection. Rejections do not mutate
accepted bytes, proposal bytes, revision or status. No automatic rebase occurs.

Both editors share the existing source session. Preview changes remain dirty;
keep accepts them, undo restores accepted bytes, and save remains blocked while
dirty. The renderer receives only the validated proposal. There is no new draft
store, history stack, deployment identity, iframe instrumentation or public route
activation. Production, real-venue mutation, Hive/Keychain, keys, payment authority,
deployment, services and repository settings remain outside this authorization.

## Executable oracle map

| Criterion | Selected CI oracle |
| --- | --- |
| Exact source adaptation, immutable inputs, optional normalization and no leaked deployment reference | `test/canvas-source-preview.test.js`: adapter produces only selected change |
| Strict command shape/type/version, ownership, protected identity and non-home rejection before mutation | Adapter atomic rejection test; existing semantic/source authority suites |
| Every home field derives eligibility and native control kind from existing descriptors | `test/editable-venue-canvas-studio.test.js`: every existing home field |
| One proposal, real renderer, accepted-byte neutrality, keep/undo/save | Studio preview integration test plus existing source-authoring suites |
| Revision invalidation for form/other-tab changes, reorder, removal, keep, discard and ABA | Adapter revision test, Studio stale-tab/removal test, browser conflict activation |
| Token/origin, malformed/duplicate/extra/oversized/unsupported HTTP requests | Studio strict HTTP boundary test, exact byte/status/revision snapshots |
| Original Canvas is GET-only, source-neutral, command-free and selectable | Unchanged `test/read-only-venue-canvas-studio.test.js`, retained browser and current-view states |
| Ready/success/invalid/conflict/unsupported states; keyboard submit, seven selection mirrors, focus, 44px targets, overflow and real renderer | Shared `exerciseEditableCanvasState` in the existing source-authoring browser suite; all five outcomes at Juniper desktop/mobile, ready/unsupported at Fourth Street desktop/mobile |
| Accessible host and preview, classified nonblocking findings, zero external network/RPC | Axe in each new machine state; exact expected 400/409 console classification; existing network/RPC guards; assembly gates |
| Exactly four additional viewport images, original twelve retained, unchanged fourteen-suite envelope | Visual contract test, shared current capture activation and `editableCanvasEvidence` assembly |
| Module-only changes select visual CI without losing existing triggers | Actual Git/CLI fixtures for both modules in `test/qualification-scope-classifier.test.js` |
| Exact commit/tree, unique viewport hashes and all state evidence | Current visual assembly and subsequent downloaded-artifact integrity verification |

`npm run check` includes the Node tests and production dependency audit on both CI
operating systems. The established exact-head pinned Chromium CI substitution
applies to the unavailable local browser. The full visual envelope and both audits
remain required; no existing oracle or runtime configuration is reduced.

## Review and acceptance

Human review must independently assess Studio usability and generated-site
presentation, including the retained evidence and these four current viewports:
`juniper-canvas-edit-desktop`, `juniper-canvas-preview-mobile`,
`juniper-canvas-invalid-mobile`, `juniper-canvas-conflict-desktop`.
Machine success and screenshot capture do not imply visual acceptance.

Before acceptance, review the exact fifteen-path frozen diff and qualified head,
reconfirm fresh main, record the Project Lead judgment and merge explicitly.
Qualify the resulting canonical SHA, reconcile issue #146, then update the
handoff/evidence/milestone records and complete the mandatory Memory OS audit.
CI efficiency review accounts for the new states inside the existing suite and
four distinct current viewports; it cannot remove distinct failure coverage.
