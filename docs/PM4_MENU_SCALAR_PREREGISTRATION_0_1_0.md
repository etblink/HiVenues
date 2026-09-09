# PM4 shared menu text — preregistration 0.1.0

Refs #199 and PM1 §12 restaurant menu maintenance. Canonical base
`3e4f6dcf6e1c98b12fc7fdc8e1b1c45c81a17d4c`; PR206 canonical CI753 accepted.
Issue #199 remains open.

## Frozen family

`SET_MENU_FIELD` edits existing menu title, section title, item name, optional
item description and optional price label. The target names a stable menu
resource node, nullable section/item identities, and one server-known field.
The server resolves nested membership, source position and operator ownership.
No browser source pointers, array positions, raw objects, replacement IDs,
cardinality, ordering, media or schema authority. Optional descriptions/prices
can be cleared to null; required names/titles cannot be blank. All existing
canonical source bounds and normalization apply.

One canonical menu changes in every consuming menu/menu-preview component.
The selected nested entry stays selected through preview, Apply/Discard and
history. A native entry picker keeps only the selected entry's fields visible;
operator labels describe menus, sections, dishes and prices, without requiring
source editing. An active proposal has explicit Apply/Discard and no competing
mutation controls. Accepted draft, preview and saved checkpoint stay distinct.

## Completion criteria and executable oracles

| Criterion | Evidence class | Oracle |
| --- | --- | --- |
| Stable nested membership, field/nullability bounds, canonical validation; stale/no-op/forged inputs rejected | CI | `test/venue-v2-menu-scalar.test.js` in Ubuntu/Windows deterministic gate |
| All five fields, null add/clear, unrelated bytes preserved, every intended shared consumer | CI | Same transaction tests and real renderer |
| Exact proposal/discard/apply/multi-step Undo/Redo; inverse tampering rejected | CI | Same transaction/history tests |
| Native entry picker, strict occurrence/form/query binding, preview lock and surviving selection | CI | Same Studio HTTP tests; `scripts/capture-v2-menu-scalar-visual.js` |
| Explicit Save followed by fresh Node process and byte-exact reopen | CI | Same workspace/HTTP test |
| Keyboard editing; responsive actual-menu preview; Axe and viewport geometry | CI | Pinned Chromium script, three representative captures with visible subject and corresponding controls |
| New test and capture activate the consumed CI classifier independently | CI | `test/qualification-scope-classifier.test.js` |
| Studio usability, generated-menu truth, platform authority | Project Lead | Exact candidate diff, manifest and three PNGs, independent A/B/C review |

Keep the complete existing qualification envelope. Run the new bounded browser
journey early; measure its incremental cost. No speculative pruning. Require
canonical post-merge qualification and artifact binding when SHA changes.

Menu resource/section/item creation, removal and ordering form the next separate
cardinality family. Other #199 obligations remain actions, timestamp editing,
general media, component recipes/catalog and full fresh-archetype journeys.
Complete #199 before explicit idealized-vs-current 2026 visual convergence;
then #200 final measured quality/release gates. No production, live Hive,
Keychain, key/payment, infrastructure or real venue effects.
