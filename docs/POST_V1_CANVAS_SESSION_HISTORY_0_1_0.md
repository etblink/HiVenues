# Post-v1 Canvas session history 0.1.0

## Status and authority

| Field | Value |
| --- | --- |
| Tracking issue | `#148` — Add bounded session-only Canvas Undo/Redo history |
| Canonical base | `03be5ee58b26681e3a3f94747cff84d07c748adc` |
| Base tree | `d06d41432e935f69b22525097d801aaec1af5797` |
| Product baseline | HiVenues `v1.0.0` plus accepted issue #146 Canvas contextual text preview |
| Scope | Repository-local session history for existing contextual text preview only |
| Persistent history / schema / structural editing / publishing / deployment | **Not authorized** |

## Decision

The Canvas editor now uses the exact inverse command returned by the accepted semantic Venue Canvas command engine to maintain a bounded in-memory Undo/Redo history. The typed venue source remains the only authoring authority, the existing source session still owns the accepted/proposed boundary, and the real renderer receives only the validated current proposal.

History is intentionally limited to the contextual text commands already authorized by issue #146. No `insert-item`, `remove-item`, or `move-item` command becomes reachable from the Canvas UI.

## History contract

- Maximum retained depth: **50** successful Canvas preview commands.
- Each entry binds the normalized forward semantic command, exact semantic inverse, canonical proposal bytes before and after the command, proposal revisions, and monotonic session generation.
- A successful new preview pushes one undo entry and clears redo.
- Undo applies only the exact top inverse to the exact current proposal boundary and verifies canonical byte restoration plus the semantic engine's inverse-of-inverse.
- Redo applies only the exact recorded forward command to the exact restored boundary and verifies canonical byte restoration plus the exact inverse.
- Stale form revisions, ABA sequences, unrelated source edits, collection mutation, keep/apply, discard, and other session authority transitions fail closed or clear history rather than rebasing it.
- Failed history requests do not mutate accepted bytes, proposal bytes, revision, generation, history stacks, or session status.
- History is process/session memory only: no file, workspace, browser storage, recovery cache, localStorage, IndexedDB, or deployment record is introduced.

## UI contract

The local `/canvas-editor` inspector exposes explicit **Undo preview** and **Redo preview** actions with the last semantic block/field identity. Disabled state truthfully indicates when no action is available. A separate strict loopback POST path handles history actions; the original read-only `/canvas` route remains GET-only and command-free.

The existing source form editor remains compatible and authoritative. Keep/apply still accepts the current proposal, discard restores accepted bytes, and workspace save remains unavailable while the proposal is dirty.

## Qualification

Machine evidence covers exact multi-step round trips, 50-entry eviction, stale and unrelated-mutation invalidation, strict HTTP boundaries, both venue fixtures, real-renderer output, accepted-byte neutrality, keyboard operation, minimum targets, overflow, accessibility, external-network and Hive-RPC guards, and full Ubuntu/Windows deterministic regression.

The current human-review set adds exactly two Juniper viewports:

1. desktop multi-step dirty history with Undo available;
2. mobile post-Undo state with Redo available.

Existing contextual preview, generated-site, read-only Canvas, and source-authoring review states remain retained.

## Hard boundary

This phase does not authorize persistent history, crash recovery, collaboration, structural Canvas editing, component insertion/removal/reordering, source-schema expansion, public authoring, publishing, production deployment, real-venue mutation, Hive/Keychain/key/payment effects, DNS/VPS/service mutation, repository-settings changes, or CI scope reduction.
