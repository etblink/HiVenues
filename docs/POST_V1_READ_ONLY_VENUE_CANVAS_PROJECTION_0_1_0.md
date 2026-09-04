# Post-v1 read-only Venue Canvas projection 0.1.0

## Status and authority

| Field | Value |
| --- | --- |
| Tracking issue | `#140` — Prototype a read-only synchronized Venue Canvas projection |
| Prototype date | 2026-09-04 |
| Canonical base commit | `c2bd4f389e41aa475c78f038cd91428d90f56f58` |
| Canonical base tree | `9b406f5dc5db52044ba2a0b1051afe2d38b7ca6e` |
| Product baseline | HiVenues `v1.0.0` |
| Projection implementation | `src/venue/read-only-venue-canvas-projection.js` |
| Conformance tests | `test/read-only-venue-canvas-projection.test.js` |
| Runtime, renderer, or Studio wiring | **None** |
| Source-schema migration | **None** |
| Production, deployment, identity, payment, Hive, or key effects | **None** |

This document records the independently reversible, read-only projection prototype authorized by issue `#140`. It does not authorize rendered UI, mutation commands, persistence, publishing, deployment, or any source-schema change.

## Decision

The prototype models synchronized selection before any UI integration is attempted. It derives a deterministic presentation model from the canonical semantic Venue Canvas contract and scopes that model to the `page.home` subtree.

The v1 venue authoring document remains the only source of truth. The semantic contract remains the structural authority. The projection carries only read-only identities, labels, source pointers, selection state, and semantic navigation targets. It cannot apply a command or persist a result.

The model intentionally avoids browser focus or event choreography. The earlier HV-6 technology evaluation showed that an editor-owned canvas could reclaim focus and make a direct selection bridge unreliable. This prototype instead freezes the semantic identity and navigation behavior that a later native UI must implement and qualify.

## Projection envelope

| Property | Value |
| --- | --- |
| `kind` | `hivenues-read-only-venue-canvas-projection` |
| `schemaVersion` | `1` |
| `source` | Existing v1 schema, venue, and deployment-reference identities |
| `authority.canonicalDocument` | `venue-authoring-document-v1` |
| `authority.semanticContract` | `hivenues-semantic-venue-canvas-contract` |
| `authority.scopeRootBlockId` | `page.home` |
| `authority.allowedInteractions` | `select`, `navigate` |
| `authority.derived` | `true` |
| `authority.persistent` | `false` |
| `authority.mutable` | `false` |
| `authority.runtimeWired` | `false` |

Derivation validates input through `createSemanticVenueCanvasContract`. The returned graph is deeply frozen, and canonical serialization uses the repository's existing canonical JSON serializer. Derivation does not alter the caller's source bytes.

## Selection envelope

Every explicit selection is a strict plain JSON object with exactly these properties:

| Property | Rule |
| --- | --- |
| `kind` | Exactly `hivenues-semantic-venue-canvas-selection` |
| `schemaVersion` | Exactly `1` |
| `blockId` | Non-empty bounded semantic block identity |
| `fieldId` | `null` for a block or a non-empty bounded field identity |

When no selection is supplied, the deterministic default is the scoped root `page.home`. An explicit selection must resolve to a present block inside that subtree. A non-null field must belong to that exact block.

Malformed envelopes, additional properties, unsupported versions, unknown blocks, blocks outside the scoped subtree, stale collection identities, and mismatched fields fail closed. There is no nearest-item or default-selection recovery because it could hide stale operator intent.

## One semantic identity across views

The normalized selection object is shared by reference across the projection's selection-aware views:

- `canvas.selection` and exactly one selected semantic card;
- `tree.selection` and exactly one selected semantic row;
- `inspector.selection`, the selected block context, and an exact selected field when applicable;
- `focusTarget.selection` plus a semantic preferred surface;
- `diagnostics.selection`, stable identity, source pointers, depth, and navigation index; and
- the current item in `navigation.targets`.

A field selection therefore keeps its containing block selected in the canvas and tree while the inspector identifies the exact field. This is a model invariant, not a DOM-focus claim.

Canvas cards and tree rows expose deterministic semantic labels, scoped parent/depth relationships, stable identity, and selection state. Inspector fields expose descriptor metadata and are explicitly marked `readOnly`. The projection deliberately carries neither contract capabilities nor child mutation policy.

## Accessible semantic navigation

The navigation order is depth-first by semantic block order, with each block followed by its fields in contract order. It does not wrap.

Every target is another strict selection envelope that can be passed back to the stateless projection function. The model exposes:

| Target | Meaning |
| --- | --- |
| `previous` / `next` | Adjacent target in complete block-and-field semantic order |
| `containingBlock` | Block-level target for a selected field |
| `parentBlock` | Parent of the selected block inside the scoped tree |
| `firstChild` | First semantic child block |
| `firstField` | First inspector field for the selected block |

These targets are the contract for later keyboard, assistive-technology, and non-drag controls. They are not key bindings, event handlers, CSS selectors, DOM IDs, or focus calls.

## Stable collection identity

Operator-defined collection order may change source array indexes. Selection does not follow an index.

For example, `home.equipment-status.item.wood-shop` with field `name` remains the same selection after the item moves. Its diagnostic source pointers and position in semantic navigation update from the newly derived contract, while its stable block and field identities remain unchanged across canvas, tree, inspector, focus, and diagnostics.

## Conformance oracles

| Oracle | Required evidence |
| --- | --- |
| Determinism | Fourth Street and Lantern Room each produce equal projections and stable canonical bytes |
| Deep immutability | Every object and array in each returned projection is frozen |
| Source neutrality | Exact canonical v1 bytes remain unchanged after derivation |
| Default selection | Omitted selection resolves only to `page.home` |
| One identity | Canvas, tree, inspector, focus, diagnostics, and current navigation target share the normalized selection object |
| Field synchronization | One field selects its containing card/row and exact inspector descriptor |
| Navigation | Every target can be projected again with correct position and adjacent targets |
| Fail closed | Malformed, stale, mismatched, unknown, and out-of-scope selections return no projection |
| Reorder stability | Equipment selection follows stable item/field identity while diagnostic indexes update |
| Read-only boundary | No set, insert, remove, or move capability appears in the projection |
| Surface boundary | Only the projection module, its test, and this record change |

Human visual review and external-observation evidence are not applicable because this prototype has no rendered or externally active surface.

## Follow-on boundary

Completion can inform a separately authorized native UI prototype. It does not itself authorize Studio or renderer wiring. A later rendered phase must separately define real-renderer integration, DOM semantics, keyboard bindings, focus behavior, screen-reader behavior, responsive presentation, visual evidence, and human review while preserving this read-only selection identity and the canonical authoring boundary.
