# Issue 156: Equipment workspace persistence qualification

Canvas proposal tests and the existing turnkey image-import test cover different
parts of the authoring workflow. This operation connects equipment editing to the
actual loopback Studio, atomic workspace save, restart, and real renderer.

## Frozen criteria and executable oracles

Both new cases in `test/turnkey-release.test.js` run in the universal deterministic
Linux and Windows CI gates. They use public HTTP forms and filesystem results,
without access to the Studio's private session.

| Criterion | Oracle |
| --- | --- |
| Add, rename, reorder, remove, Undo and Redo preserve exact item identity, fields and sibling order across keep/save/reopen | `Canvas equipment survives keep, failed save, retry and reopen with exact identity, fields and order` compares independent expected canonical source bytes and reopened renderer cards |
| Preview and keep alone leave disk unchanged; an unkept proposal cannot be saved | Same test asserts unchanged bytes after each boundary and HTTP 409 before keep |
| Failed atomic replacement preserves saved bytes, accepted edits and retryability | Same test injects a rename failure through the existing filesystem seam, requires HTTP 500, verifies no temporary-file residue, then saves successfully |
| Source history and old form authority do not survive a new runtime | Same test requires disabled Undo/Redo after restart and rejects the previous session's form token |
| Closing before explicit save recovers the previous saved state | `Closing Studio before workspace save loses both unkept and kept equipment proposals, with no persisted history` exercises both boundaries in separate temporary workspaces |
| Reopened content matches saved IDs, names, status, timestamp, note, access instructions and group | Shared real-renderer assertions compare each field and item order, plus zero Hive RPC attempts |
| Saved equipment remains a valid turnkey source | The integration test runs offline readiness and verifies that qualification itself leaves the saved bytes unchanged |

## Scope and acceptance

The fixture seeds an already-present equipment section into a synthetic temporary
workspace. It does not add a product section-creation capability. No runtime,
schema, dependency, UI, workflow, or persistence behavior is changed unless these
tests identify a concrete defect.

This is an integration coverage change. The existing visual contract remains
intact; there is no new or materially changed presentation state to capture.
Required CI selection continues to be determined by the existing classifier.
Exact-diff review, fresh-main comparison, and canonical postmerge qualification
remain required before completion.

Two integration cases reuse the existing turnkey test process. Failure injection
is deterministic on both operating systems and does not rely on permission bits.
No browser job or screenshot is added. All prior tests and platform gates remain.
