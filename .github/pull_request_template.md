## Purpose / issue

<!-- Link the durable work item when one exists, e.g. `Closes #123`. Do not use `Closes` unless this PR fully satisfies the issue. -->

## Exact candidate

- Base / expected parent:
- Head:
- Tree:
- Intended changed paths:

## Product / authority boundaries

<!-- State any production, Hive, key, payment, deployment, CI-scope, or other external-effect boundaries that remain closed. A PR or Issue is not authorization for those effects. -->

## Qualification classification

- Expected deterministic gates:
- Expected live-read lane: required / skipped
- Expected pinned-browser visual lane: required / skipped

## Conditional presentation states

<!-- Changed-path selection can trigger visual CI without exercising a new conditional UI branch. -->

- [ ] This PR adds or materially changes no conditionally rendered presentation state.
- [ ] This PR does add/change conditional presentation; every materially distinct new state is enumerated below, activated by deterministic fixture state, and covered by representative responsive browser evidence.

Conditional states and activation evidence (delete if not applicable):

- State:
  - Fixture / activation:
  - Capture / assertion:

## Acceptance boundary

- [ ] Green CI is treated as qualification evidence, not Project Lead acceptance.
- [ ] If presentation changed, the exact-head visual artifact will be integrity-checked and the new/changed states manually reviewed before acceptance.
- [ ] A fresh base/main race check will be performed before canonical integration.
