# Issue 154: Canvas equipment lifecycle

Operators can add and remove equipment inside an existing equipment-status section, review the shared proposal in the real renderer, and restore changes through the existing session history.

## Completion contract and evidence

| Criterion | Evidence class | Required oracle |
| --- | --- | --- |
| Add exactly the six existing operator fields, append and select the new item, preserve stable identity through rename and replay | CI | `canvas-equipment-lifecycle.test.js`: mixed lifecycle; HTTP lifecycle; source-authoring visual `equipment-added` |
| Remove only equipment items, confirm their name, support cancellation, select the parent | CI + visual review | HTTP lifecycle; visual `equipment-confirm` and `equipment-removed` |
| Restore exact contents and sibling placement for first, middle, last and only items, with one history entry per operation | CI | removal-position test; mixed exact-byte Undo/Redo roundtrip |
| Preserve max-50 session history, invalidate redo branches and unrelated draft actions, reject stale and ABA requests | CI | stale/ABA/history test; existing source-authoring and editable-Canvas tests |
| Reject forged identity, malformed values, extra/duplicate parameters, over-capacity and absent/cross-collection requests atomically | CI | model boundary and HTTP rejection tests |
| Keep original Canvas GET-only, accepted source and deployment/workspace boundaries unchanged | CI | HTTP boundary test; existing deterministic envelope and source-authoring visual suite |
| Render empty, full, invalid, added, confirmation and removed states with keyboard operation, valid selection/focus, 44px targets, no horizontal overflow or blocking Axe findings | CI + visual review | source-authoring visual suite on desktop/mobile; six additional current viewport captures |
| Preserve original text editing, stable-destination moves, history, Fourth Street and independent Juniper behavior | CI + visual review | all 14 existing visual machine suites and original 20 review viewports retained |
| Bind qualification and acceptance to exact Git identity, inspect rendered artifacts and requalify canonical merge SHA | Project Lead review | exact-head diff and artifact review; fresh main race; postmerge CI |

## Implementation boundaries

The source remains v1. No missing section is created. Gallery and programs structural editing remain unavailable in Canvas. The existing semantic command engine and ordinary operator ownership gate validate every forward command and inverse.

An add request carries no operator-supplied ID. The session mints an ID from the current revision and normalized fields, with collision checking against current siblings. It is generated once, retained in the command and inverse, and never recomputed on rename or replay. IDs are collection-local; they are not public credentials or globally unique external identifiers. Status check time is explicitly supplied by the operator and must include a timezone.

Native POST forms retain same-origin loopback and token guards, strict field counts and a 32KB body limit. Invalid add entries remain available for correction. Stale requests resolve against the current draft without applying the stale operation. Removal uses a native disclosure with the equipment name, explicit confirmation, and a cancellation link. Successful history transitions choose a surviving parent or restored item before rendering.

Undo and Redo remain at most 50 session-only commands. Other draft actions clear them. Keeping the proposal through the existing form editor remains the persistence boundary. Production deployment, live Hive writes, credentials, payment authority, public authoring, and real venue admission are outside this operation.

## CI efficiency

Reuse the existing source-authoring browser process and geometry, renderer, network and Axe oracles. Add twelve machine activations (six states at two viewports) and six representative viewport PNGs: 34 editable-Canvas machine states and 26 total current review PNGs. Retain every prior suite and representative capture. The additional states expose distinct list, validation, selection and confirmation behaviors; none is subsumed by the previous text or reorder captures. No dependency, workflow job, or build setup is added.
