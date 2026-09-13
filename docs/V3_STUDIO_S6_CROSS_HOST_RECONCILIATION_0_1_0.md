# HiVenues v3 Studio — S6 Cross-Host Journey Reconciliation 0.1.0

## Status

This record freezes the final reconciliation boundary for:

```text
PM4 / S6.4 = CROSS_HOST_JOURNEY_RECONCILIATION_AND_QUALIFICATION
```

Baseline canonical `main`:

```text
COMMIT = ab6c36d81b1e72f622c10a846b43a06494bc8d4a
TREE   = 3097752bfa03da314667cfcf8f273f0f94ef01bb
```

S6.4 is a reconciliation and qualification slice. It does **not** authorize new semantic breadth, host-specific capability forks, privileged provider/value work, conditional-host breadth from #224, or generated-experience visual redesign from S7 / #226.

## Reconciliation finding

S6.1–S6.3 established the intended operator contract, but the final audit found two acceptance-layer remnants:

1. the historical S4 unit oracle still searched for the superseded visible label `HiVenues v3 Studio`; and
2. the existing R1/R2/R3 Chromium journey visually exercised the S6 product shell and states but did not machine-assert that product-language/state contract.

Neither finding requires a new authoring semantic. The correct S6.4 action is to reconcile the acceptance layer to the already-canonical product.

## Frozen Studio product contract

Across R1 migrated physical, R2 locationless creator, and R3 release hosts, the functional `/v3-studio` must present one shared operator contract:

- product identity: `HiVenues Studio`;
- orientation: `Activity workspace · Live generated preview`;
- editing context: `Edit activity` and `Activity selection`;
- one accessible Studio status region using `role="status"`, `aria-label="Studio status"`, `aria-live="polite"`, and `aria-atomic="true"`;
- persistent-workspace opening state: `Unsaved draft`;
- active proposal state: `Preview`;
- saved state: `Saved workspace`;
- state-specific workspace guidance derived from the existing proposal/session/persistence authority;
- no visible legacy `HiVenues v3 Studio · S4 journey` product label.

The R1/R2/R3 differences that remain are semantic source facts—temporal form, presence form, legacy provenance, public-action role, and managed media—not different Studio transaction grammar or product language.

## Authority boundary

`src/venue/v3/studio-app-core.js` remains the S4 semantic authority for:

- proposal construction and validation;
- apply/discard;
- undo/redo;
- accepted draft digests/history;
- durable source persistence and fresh reopen.

`src/venue/v3/studio-app.js` remains the S6 presentation/feedback adapter. It may decorate product language, state feedback, and safe recovery presentation, but it may not acquire semantic mutation or durable persistence authority.

The reconciliation test must inspect core and adapter separately rather than preserving authority-symbol names as comments in the adapter.

## Cross-host evidence contract

`scripts/capture-v3-cross-host-journeys-visual.js` remains the single browser oracle for complete R1/R2/R3 operator journeys. In addition to the existing transaction, renderer, persistence, accessibility, geometry, keyboard, and zero-external-effect checks, it must machine-assert the S6 product contract at three states for every reference:

```text
OPENING PERSISTENT WORKSPACE = Unsaved draft
ACTIVE PROPOSAL             = Preview
AFTER DURABLE SAVE          = Saved workspace
```

The emitted manifest must retain per-reference product-contract observations and require:

```text
referenceCount = 3
keyboardCompletionCount = 3
s6ProductContractCount = 3
blockingAccessibilityFindings = 0
horizontalOverflowFindings = 0
externalRequests = 0
hiveWrites = 0
providerWrites = 0
payments = 0
signingAttempts = 0
deployments = 0
```

## S6 exit boundary

S6 may close only after the exact S6.4 candidate passes:

1. deterministic verification on Ubuntu and Windows;
2. production dependency audits on Ubuntu and Windows;
3. the dedicated R1/R2/R3 pinned-Chromium qualification with the S6 product assertions above;
4. the repository current-contract Chromium evidence suite selected from the changed capture script;
5. Project Lead visual review of the exact-head v3 artifact;
6. normal two-parent integration preserving the qualified tree; and
7. post-merge qualification on the exact canonical merge.

After those gates pass, routing advances to S7 / #226. Conditional breadth remains independently governed by #224.