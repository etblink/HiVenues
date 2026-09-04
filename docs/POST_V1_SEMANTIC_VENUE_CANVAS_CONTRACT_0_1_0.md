# Post-v1 semantic Venue Canvas contract 0.1.0

## Status and authority

| Field | Value |
| --- | --- |
| Tracking issue | `#138` — Prototype the semantic Venue Canvas contract |
| Prototype date | 2026-09-04 |
| Canonical base commit | `3e099325ebdf95f4fe1f68e80fddbc4ffc905ebb` |
| Canonical base tree | `61ab53095b6d2311de3f83bca3577693b8757258` |
| Product baseline | HiVenues `v1.0.0` |
| Contract implementation | `src/venue/semantic-venue-canvas-contract.js` |
| Conformance tests | `test/semantic-venue-canvas-contract.test.js` |
| Runtime or Studio wiring | **None** |
| Source-schema migration | **None** |
| Production, deployment, identity, payment, Hive, or key effects | **None** |

This document records the independently reversible contract prototype authorized by issue `#138`. It does not authorize a canvas UI, renderer changes, persistence changes, publishing, deployment, or a new source document. A later phase requires its own issue and acceptance boundary.

## Decision

The semantic Venue Canvas is a deterministic, deeply immutable projection of the validated v1 venue authoring document. The v1 document remains the sole authoring source of truth.

The contract gives a future canvas three bounded things:

1. stable semantic block and field identities;
2. explicit placement, ordering, and cardinality policy; and
3. versioned commands whose accepted mutations pass the existing ordinary-operator authority gate and return an inverse command.

The contract is not persisted in a venue document and is not wired into the current Studio or any runtime route. Deriving it cannot change source bytes.

## Contract envelope

The exported envelope is identified by:

| Property | Value |
| --- | --- |
| `kind` | `hivenues-semantic-venue-canvas-contract` |
| `schemaVersion` | `1` |
| `source.schemaVersion` | Validated v1 authoring schema version |
| `source.venueId` | Canonical venue-context identity |
| `source.deploymentRefId` | Existing deployment reference identity |
| `authority.canonicalDocument` | `venue-authoring-document-v1` |
| `authority.mutationGate` | `ordinary-operator-authority` |
| `authority.derived` | `true` |
| `authority.persistent` | `false` |
| `authority.runtimeWired` | `false` |

Serialization uses the existing canonical JSON serializer. Identical valid inputs therefore produce identical contract bytes.

## Semantic tree and identity

The root contains two fixed groups in order: `venue.settings` and `page.home`.

| Region | Fixed semantic slots, in order |
| --- | --- |
| `venue.settings` | `settings.identity`, `settings.business`, `settings.brand`, optional `settings.theme`, `settings.seo`, `settings.onboarding` |
| `page.home` | `home.hero`, `home.updates`, optional `home.programs`, optional `home.equipment-status`, `home.pathways`, `home.visit`, `home.community`, `home.gallery` |

Each block declares its semantic `id`, `kind`, source pointer, stable-identity source, placement policy, capabilities, fields, child policy, and present children. Each child policy uses a uniform string-valued `allowedKinds` array; fixed policies also expose their ordered `fixedSlots`. Optional slots remain declared there even when no source object exists.

Identity rules are:

| Element | Identity rule | Consequence |
| --- | --- | --- |
| Venue root | v1 `venueContext.id` | Contract remains bound to the canonical venue identity |
| Fixed group or section | Frozen semantic slot ID | Identity is independent of presentation position |
| Program item | `home.programs.item.<item.id>` | Identity follows the operator item across canonical sorting |
| Equipment item | `home.equipment-status.item.<item.id>` | Identity follows the operator item across manual reordering |
| Field | Path relative to its semantic block | A field such as `name` is stable when an item index changes |

Collection indexes may appear in diagnostic source pointers, but they are never the semantic item identity.

## Placement, ordering, and cardinality

| Surface | Placement policy | Cardinality | Mutation consequence |
| --- | --- | --- | --- |
| Root groups | Fixed | Exactly two | Cannot insert, remove, or move |
| Settings slots | Fixed | Required or optional as v1 defines | Cannot insert, remove, or move |
| Home slots | Fixed | Required or optional as v1 defines | Cannot insert, remove, or move |
| Programs | Canonical: `startAt`, then `id` | 0–12 items | Insert/remove allowed; manual position and move denied |
| Equipment status | Operator-defined | 0–20 items | Insert/remove/move allowed by stable sibling identity |
| Gallery | Fixed topology | Existing v1 gallery shape | Field edits allowed; item insert/remove/move denied |

The gallery remains fixed because v1 gallery entries do not have stable item IDs. Giving those entries arbitrary structural authority would require a separately reviewed source-schema migration.

## Capability vocabulary

The complete capability vocabulary is:

- `select`
- `set-field`
- `insert-item`
- `remove-item`
- `move-item`

The contract provides no capability for raw HTML, scripts, raw CSS, document replacement, arbitrary topology, publishing, deployment, Hive writes, key access, or payments.

## Command envelope

All commands are strict plain JSON objects with no additional properties:

| Property | Value |
| --- | --- |
| `kind` | `hivenues-semantic-venue-canvas-command` |
| `schemaVersion` | `1` |
| `type` | One of the four command types below |

| Command | Required payload | Returned inverse |
| --- | --- | --- |
| `set-field` | `blockId`, `fieldId`, JSON `value` | `set-field` with the prior value |
| `insert-item` | collection `blockId`, item with canonical stable `id`, nullable `beforeBlockId` | `remove-item` for the inserted stable block ID |
| `remove-item` | item `blockId` | `insert-item` with the removed item and its prior stable sibling position when operator-ordered |
| `move-item` | item `blockId`, nullable sibling `beforeBlockId` | `move-item` restoring its prior stable sibling position |

`beforeBlockId: null` means the end of an operator-defined collection. Canonically ordered program insertions must use `null`; the v1 validator chooses their position. A move must identify an allowed item, reference a sibling in the same collection when non-null, and change the order.

## Mutation path

Every attempted mutation follows the same closed path:

1. validate the base as a v1 venue authoring document;
2. derive the semantic contract;
3. parse an exact, versioned command;
4. resolve semantic IDs and check the block capability;
5. clone the v1 document and apply one bounded proposed change;
6. validate the proposed v1 document;
7. pass it through `applyOrdinaryOperatorEdit`;
8. validate and canonically serialize the accepted document;
9. derive the new contract and return a versioned inverse command.

An invalid command throws before any accepted document is returned. The caller's source object is not mutated. Validation failures, protected identity paths, duplicate IDs, unknown IDs, invalid siblings, self-moves, no-op moves, collection overflow, and unsupported kinds, versions, or command types fail closed.

## Inverse semantics

For every accepted command in scope, applying the returned inverse to the accepted document must reproduce the exact canonical v1 bytes from before the command.

This is a one-step semantic reversibility contract, not a history stack. Undo/redo storage, command grouping, collaboration, persistence, and recovery policy remain future work.

## Conformance oracles

| Oracle | Required evidence |
| --- | --- |
| Determinism | Fourth Street and Lantern Room produce equal immutable contracts and stable serialized bytes |
| Source neutrality | Contract derivation leaves exact canonical v1 bytes unchanged |
| Stable identity | Equipment block and field IDs follow the item ID when its array index changes |
| Canonical ordering | Program insertion is sorted by existing v1 `startAt`/`id` rules and rejects manual placement |
| Operator ordering | Equipment insert/remove/move use stable sibling IDs and return exact inverses |
| Reversibility | Each accepted command plus inverse restores exact canonical source bytes |
| Fail closed | Malformed, unknown, protected, invalid, duplicate, overflow, unsupported, self, and no-op cases return no accepted mutation |
| Authority | Every accepted mutation passes the existing ordinary-operator gate |
| Surface boundary | The diff contains only the module, its tests, and this record; no route, renderer, Studio UI, schema, dependency, release threshold, or CI-scope change |

No human visual review or external evidence is applicable because the prototype exposes no UI and uses only repository fixtures.

## Follow-on boundary

Completion of this prototype can inform a separately authorized read-only canvas phase. It does not itself authorize that phase. Any follow-on must keep the v1 authoring document authoritative, consume this derived contract without persistence drift, and define its own code paths, tests, visual evidence, accessibility evidence, and acceptance decision.
