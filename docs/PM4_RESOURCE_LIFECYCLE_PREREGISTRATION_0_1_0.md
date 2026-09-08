# PM4 resource lifecycle and list order — preregistration 0.1.0

Issue #199; canonical base `1f200547e0b582ca508752decba652b245a3baf8`.
Advances PM1 §12 equipment and show creation/order journeys. Does not close #199.

## Frozen command family

Add existing-model events, programs and equipment through typed operator inputs.
The selected stable list component determines the resource kind; the server mints
the ID (and event slug), derives ownership and placement, and validates the entire
canonical source. Required times come from the operator, never the server clock.
No raw source objects, supplied IDs, indexes, paths, recipes, menus, media or action
objects are admitted. Existing scalar fields remain the editing route.

`ADD_RESOURCE` creates one resource and appends its reference to the selected list.
Other curated lists remain unchanged. `MOVE_RESOURCE` changes only the selected
list's display order, using a stable before-resource identity or end sentinel.
The canonical resource array is not display order. `REMOVE_RESOURCE` deletes the
shared resource and all matching references, explicitly warning which lists are
affected. A named confirmation is required by the Studio. Empty lists are valid.
Exact resource snapshots and all reference positions are private inverse history,
never browser authority. Undo restores original bytes, IDs, order and references.
Selection falls back to the surviving list after removal or history replay.

## Criteria and oracles

| Criterion | Class | Required oracle |
| --- | --- | --- |
| Stable IDs, typed payload, ownership, schema, no-op/stale rejection | CI | `test/venue-v2-resource-lifecycle.test.js`, Ubuntu + Windows npm test |
| Add/discard/apply, remove/restore, local order, exact multi-step inverse and forged-history rejection | CI | same transaction tests |
| Shared consumers and event-detail creation/removal | CI | same tests through real renderer |
| Strict forms, occurrence mismatch, named confirmation, surviving selection | CI | same tests through real Studio HTTP routes |
| Explicit Save, restart and exact reopen after lifecycle edits | CI | lifecycle workspace test using fresh temp workspace and recreated app |
| Empty/list/add/move/remove preview states, keyboard controls, responsive geometry/Axe | CI | `scripts/capture-v2-resource-lifecycle-visual.js` in pinned Chromium CI |
| Studio usability, generated truth, authority boundaries | Project Lead review | exact candidate screenshots + diff + evidence manifest, independently A/B/C |

One bounded browser journey per resource kind; eight captures include the capacity limit, ordinary
creation controls as well as representative add, move,
remove and empty states rather than every history step. Existing browser suites
remain; no scope reduction or new dependency. Canonical post-merge CI remains
required. Menus, action editing, timestamp editing, general media, component recipes
and full fresh-archetype closure stay open under #199. Complete #199 before the
user-approved idealized-vs-current 2026 visual work, then #200 final measured gates.

Evidence framing amendment after CI #750 review: every lifecycle screenshot must
show the reviewed resource or empty state inside the real preview viewport and
the lifecycle inspector controls. The capture script asserts the subject heading
is within that viewport and records its text and geometry. An unrelated hero
capture cannot satisfy generated-output review even when DOM content checks pass.
The active lifecycle preview must offer Apply/Discard, suppress component reorder
actions, and disable Undo/Redo until the proposal is resolved. HTTP and browser
oracles check these controls against the existing server-side proposal lock.

No schema expansion, production selection/deploy, Hive/Keychain/key/payment,
infrastructure, real venue admission or repository-setting effects.
