# Post-v1 Canvas stable-item reorder 0.1.0

## Status and authority

| Field | Value |
| --- | --- |
| Tracking issue | `#150` — bounded stable-item reordering |
| Canonical base | `bdabe030f50d68c541d155c0f28ed694399a9d4b` |
| Base tree | `3834f13ef7846f34f75265ed0b324cc97ce52d57` |
| Predecessor | Issue #148 / PR #149 session-only Canvas history |
| Scope | Existing equipment-status items, one-step Move up / Move down |
| Insert/remove/schema/persistent history/publish/deploy | **Not authorized** |

## Decision

HiVenues exposes the semantic Venue Canvas engine's already-accepted `move-item` capability only for existing operator-owned equipment-status items. The UI uses explicit one-step Move up / Move down controls bound to stable semantic item IDs. No generic drag-and-drop authority is introduced.

The same source-authoring session remains authoritative for accepted/proposed state. Each successful move is applied through the semantic command engine, returns an exact inverse, and enters the bounded session-only Undo/Redo history established by Issue #148.

## Structural boundary

- `home.equipment-status.item.<stable-id>` is the only Canvas-movable class in this phase.
- Programs remain canonical-order and cannot be manually reordered.
- Fixed home slots and gallery topology remain immovable.
- Insert-item and remove-item remain unreachable from Canvas UI.
- The read-only `/canvas` surface remains GET-only and mutation-free.
- Reorder controls never derive authority from array indexes; index is observational, while commands bind stable block IDs.
- A move is exactly one sibling position per submitted command.

## History and conflict contract

Move entries share the existing maximum-50 in-memory history stack with contextual text previews. Undo/Redo applies the exact semantic inverse/forward command to exact canonical proposal boundaries. Stale revisions, ABA transitions, unrelated source changes, unsupported directions, collection mismatch, keep/apply, discard, and other authority transitions fail closed or clear history rather than rebasing it.

No localStorage, IndexedDB, recovery cache, workspace history, cross-session restore, or other persistent history is added.

## Acceptance intent

Qualification must prove one-step boundary truth, stable selection after reorder, exact mixed text+move round trips, strict HTTP rejection, two-venue regression safety, real-renderer proposal use, keyboard and target-size accessibility, no horizontal clipping, current visual evidence, Ubuntu/Windows deterministic checks, and production dependency audits.

## Hard exclusions

This phase does not authorize item insertion/removal, arbitrary drag-and-drop, schema/component expansion, persistent history, collaboration, public authoring, publishing, deployment, real-venue mutation, Hive/Keychain/key/payment effects, DNS/VPS/service mutation, repository-settings changes, or CI scope reduction.
