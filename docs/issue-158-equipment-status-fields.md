# Issue 158: Existing equipment status and check-time editing

Canvas can now preview the existing equipment item's `state` and `lastUpdated`
fields alongside its text fields. The select reads its options from the semantic
contract. Check time remains text with explicit UTC/offset guidance; browser-local
time conversion never changes the operator's supplied value.

The field adapter admits these two controls only for existing equipment items.
Other enum/date fields, protected identity, assets and non-home fields retain
their existing restrictions. Every change uses the ordinary source ownership
gate and shared revision-bound command/history machinery. Identical values keep
the existing field-command behavior: unchanged source bytes with an undoable
neutral command. No new schema or persistence model is introduced.

## Concrete validation defect found

The new rejection oracle demonstrated that the shared timestamp validator
accepted February 30 because `Date.parse` normalized it. Canonical package
validation now checks ISO date/time shape and calendar day validity before the
existing parse/range check. Valid leap days, UTC and explicit offsets remain
supported. This also protects program timestamps and ordinary form editing.
Previously admitted impossible or non-ISO timestamps now fail validation.

## Frozen criteria and evidence

| Criterion | Executable oracle |
| --- | --- |
| All statuses, UTC/offset check times, stable IDs/order and exact inverse replay | `Equipment typed fields accept every status and offset timestamps with exact inverse history and stable source` |
| Invalid values and unrelated enum/date, asset and protected identity stay denied atomically | `Equipment typed fields reject malformed values and other field authority atomically` |
| Stale/ABA, removed item and other editor mutations do not rebase history | `Equipment typed field revisions reject ABA, removal and other editor changes without rebasing history` |
| Native controls, invalid attempts, escaped values, selection, current conflict values and real renderer | The two equipment-field HTTP tests in `test/canvas-equipment-fields.test.js` |
| Shared calendar validation covers equipment and program timestamps | `Canonical timestamps reject impossible dates across equipment and programs while preserving valid offsets` |
| Keep/save, atomic failure/retry and reopen persist edited status/time | Existing real Studio lifecycle case in `test/turnkey-release.test.js`, extended through the new native controls |
| Every available field follows the declared eligibility boundary | Existing exhaustive descriptor/HTTP test in `test/editable-venue-canvas-studio.test.js` |
| Keyboard use, focus, accessibility, selected mirrors and real preview on desktop/mobile | Four `field-*` states in `exerciseEditableCanvasState`, executed by the existing source-authoring visual suite |
| Responsive presentation approval | Four new current viewport captures: desktop status choices, mobile changed status, desktop offset time and mobile invalid time; exact-head manual review required |

All existing gates remain. The 14-suite machine envelope gains four states inside
the existing authoring suite; the bounded review set grows from 26 to 30 captures.
These cover distinct new controls and rejection guidance. No browser job, install
or repeated full build is added. Canonical postmerge qualification is still required.
