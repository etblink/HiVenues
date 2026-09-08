# PM4 operator-journey task matrix and resource-scalar authoring preregistration 0.1.0

## Status

This document preregisters the first bounded Issue #199 implementation slice against the accepted PM1 section-12 operator journeys.

Canonical opening baseline:

- repository: `etblink/HiVenues`
- branch: `main`
- commit: `6f26056abb6f5cc230c3e818009e20dedfe6f1ba`
- tree: `f64237d3b108f379be6facfa35f90e2006c4827c`
- Issue #198: accepted and closed
- canonical CI #743: success

This slice advances PM4 Track A and Track C by adding ordinary typed resource editing through the existing real-renderer Studio. It does not accept Issue #199, Issue #200, or PM4 as a whole.

## PM1 section-12 task audit

| Archetype | Operator task | Opening state |
| --- | --- | --- |
| Fourth Street | Select Hero | SUPPORTED |
| Fourth Street | Change approved Hero copy | SUPPORTED |
| Fourth Street | Change Hero media | SUPPORTED |
| Fourth Street | Add or position Events/Updates | PARTIAL — existing same-page movement is supported; Events/Updates insertion is not in the bounded component catalog |
| Fourth Street | Review Community when enabled | SUPPORTED |
| Fourth Street | Mobile preview | SUPPORTED |
| Fourth Street | Undo | SUPPORTED |
| Fourth Street | Save workspace | SUPPORTED |
| Juniper | Find Programs and Equipment | SUPPORTED |
| Juniper | Add/edit/reorder equipment item | MISSING |
| Juniper | Edit a program | MISSING |
| Juniper | Inspect responsive behavior | SUPPORTED |
| Juniper | Save/reopen exact state | SUPPORTED |
| Restaurant | Import venue imagery | PARTIAL — Hero import exists; general Gallery/non-Hero media admission does not |
| Restaurant | Edit Hero | SUPPORTED |
| Restaurant | Add/update menu content | MISSING |
| Restaurant | Configure external reservation CTA | MISSING |
| Restaurant | Add/reorder Private Events and Gallery | PARTIAL — existing components can move; their insertion is not in the bounded catalog |
| Restaurant | Change design recipe/theme | PARTIAL — global curated Theme exists; per-component recipe editing does not |
| Restaurant | Mobile/tablet review | SUPPORTED |
| Restaurant | Save/reopen | SUPPORTED |
| Live music | Create/update a show | MISSING |
| Live music | Provide ticket link | MISSING |
| Live music | Inspect Event detail | SUPPORTED |
| Live music | Reorder/feature upcoming shows | MISSING |
| Live music | Change event-list recipe | MISSING |
| Live music | Mobile/tablet review | SUPPORTED |
| Live music | Save/reopen | SUPPORTED |

The canonical v2 source already marks resource collections and their ordinary fields as operator-owned. The missing authority is the transaction and Studio surface, not a second source model.

## First bounded command family

Name:

`RESOURCE_SCALAR_SET_FIELD_V1`

The existing `SET_FIELD` proposal/apply/discard/history command family is extended to existing stable resource identities. A browser may provide only:

- the stable resource node identity;
- a server-known resource field id;
- the operator-entered scalar value;
- the expected accepted-draft digest.

The server resolves the canonical collection, index, source pointer, ownership and schema consequence. Browser-provided source pointers, array indexes, replacement IDs, raw resource objects, schema fragments and renderer objects are rejected.

### Authorized fields

Event:

- `title` — text
- `state` — one of `scheduled`, `full`, `cancelled`
- `description` — text

Program:

- `title` — text
- `state` — one of `scheduled`, `full`, `cancelled`
- `description` — text
- `accessNote` — text

Equipment:

- `name` — text
- `state` — one of `available`, `limited`, `maintenance`, `offline`
- `note` — text
- `accessNote` — text

All values remain subject to the canonical v2 schema after mutation.

## Explicit exclusions

This slice does not authorize:

- resource creation, removal or ordering;
- event/program timestamps;
- event slug;
- ticket or other `externalAction` objects;
- program link nullability;
- event media assignment;
- equipment group nullability;
- menus, menu sections or menu items;
- Gallery/non-Hero media;
- per-component recipe editing;
- resource-reference list editing;
- raw JSON/source-code editing;
- source pointers or array indexes supplied by the browser;
- source-schema changes.

Those obligations remain visible for later Issue #199 slices.

## Required transaction proof

The implementation must:

1. resolve `resource:<collection>:<id>` against the canonical source server-side;
2. reject unknown, duplicated, stale, forged and out-of-scope targets;
3. retain exact proposal, real-renderer preview, Apply, Discard, Undo and Redo semantics;
4. reject no-op values and invalid enum/schema values;
5. construct an exact inverse command;
6. preserve IDs, ordering, unrelated resources, page/component structure, media, design, venue facts and capabilities;
7. update every consumer of a shared resource from the one canonical resource mutation;
8. preserve explicit Save and exact process-restart/reopen behavior through the existing workspace checkpoint.

## Required operator proof

When an existing resource reference is selected, the Studio must show plain-language controls derived from the server-owned field descriptor.

- free text uses bounded text controls;
- enum fields use curated select controls;
- implementation paths and raw object structure remain hidden.

Required shared-consumer demonstrations:

- Juniper program/equipment edits update each intended resource consumer;
- a live-music event edit updates both event-list consumers and the derived Event detail.

## Qualification

The exact candidate must pass:

- selected deterministic tests on Ubuntu;
- selected deterministic tests on Windows;
- production dependency audits;
- bounded pinned-Chromium evidence through the real Studio and renderer;
- human Track-A usability / Track-B generated-truth / Track-C authority review for this slice.

Green CI is qualification, not acceptance.

## Preserved boundaries

Repository/local Studio only. No production v2 selection, publish/deploy, real venue onboarding or mutation, Hive/Keychain/payment/key/DNS/VPS/systemd/infrastructure effects, branch-protection/settings changes, or Issue #200 acceptance.
