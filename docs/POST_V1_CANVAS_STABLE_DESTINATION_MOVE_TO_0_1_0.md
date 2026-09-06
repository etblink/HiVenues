# Post-v1 Canvas stable-destination Move to 0.1.0

## Status and authority

| Field | Value |
| --- | --- |
| Tracking issue | `#152` |
| Canonical base | `a7733e8a986cdb3e9458b848de0ef9d7c5b2bd7b` |
| Base tree | `ce28d1bc6571a26a17e9cab3336d5082d5d18b65` |
| Predecessor | Issue #150 / PR #151 |
| Scope | Existing equipment-status items only; stable-destination Move to |
| New semantic command type | **None** |
| Insert/remove/drag/schema/persistence/publish/deploy | **Not authorized** |

## Decision

HiVenues extends the accepted Canvas reorder surface with a non-drag **Move to…** destination control. It does not create a new mutation model. The server derives the same semantic `move-item` command already accepted in Issue #150 from the current revision-bound sibling set.

Destination authority is never a raw array index. Each valid submitted value is either the exact stable sibling block ID that the selected item should move before, or the explicit collection-end sentinel. Ordinal position is presentation only.

## Reorder contract

- Existing **Move up** and **Move down** remain available.
- **Move to…** exposes every final position in the selected equipment-status collection.
- The current position is visible but disabled and cannot be submitted as a successful mutation.
- A multi-position move is exactly one semantic command and one history entry.
- Selection remains bound to the moved stable item.
- The semantic engine returns the exact inverse command, which enters the same maximum-50 session-only Undo/Redo stack.
- Undo/Redo verifies exact canonical before/after bytes and inverse symmetry.
- Fresh destination options are recomputed after every move from the current semantic contract.

## Fail-closed boundary

Stale revisions, current/no-op destination, unknown or cross-collection destination, unsupported block, wrong token/origin, malformed or over-parameterized form, ABA/replay conflict, or mismatched history boundary must leave source proposal, accepted bytes, history, selection, and authority unchanged.

The original `/canvas` surface remains GET-only.

## Accessibility and visual qualification

The native destination select and submit button are keyboard and single-pointer operable, with visible focus and minimum 44px targets. The existing two reorder review states are evolved rather than adding new review screenshots: desktop reorder-ready shows all three controls, while mobile post-move demonstrates direct destination movement with Undo available.

## Hard exclusions

No item creation/deletion, stable-ID generation, generic drag-and-drop, programs reorder, fixed-slot movement, gallery topology changes, schema expansion, persistent history/recovery, collaboration, public authoring, publishing/deployment, live venue mutation, Hive/Keychain/key/payment effects, DNS/VPS/service mutation, repository-setting changes, or CI scope reduction.
