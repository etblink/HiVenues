# HiVenues — Current Architecture

This document maps the **current repository** onto the frozen HiVenues architecture doctrine. It does not replace the doctrine.

Canonical doctrine:

- `docs/HIVENUES_RENDERING_AUTHORING_ARCHITECTURE_DOCTRINE_0_1_0.md`
- `docs/HIVENUES_END_STATE_PRODUCT_DOCTRINE_0_2_0.md`

## Architecture rule

> **Share truth aggressively. Share layout selectively. Keep durable state on the server. Let compositions be genuinely different. Use modern web primitives at the layer where they are strongest.**

```text
SERVER-OWNED CANONICAL MODEL
        ↓
EJS SEMANTIC COMPONENTS / FRAGMENTS
        ↓
DIRECTION-SPECIFIC COMPOSITIONS
        ↓
HTMX FOR SERVER-STATE TRANSITIONS
BOUNDED JS FOR LOCAL INTERACTION
        ↓
CONTAINER QUERIES FOR COMPONENT SPACE
MEDIA QUERIES FOR VIEWPORT SPACE
SUBGRID WHERE SHARED TRACKS ARE REAL
SVG FOR VECTOR UI / HOST-NATIVE VISUAL SEMANTICS
```

## Canonical product boundary

`src/product/app.js` is the ordinary application composition root.

It owns application assembly directly and composes the qualified Era-0–4 implementation from product-owned modules under `src/product/`.

The active Studio/Territory namespace is `/hivenues`; current templates live under `views/hivenues/`; current browser assets use HiVenues-owned names. The unreleased Candidate-C namespace has no compatibility status and is preserved only in Git history.

New ordinary application code must use the product boundary or an explicitly justified shared capability seam.

## Source classification

### 1. Active product

- `src/product/` — canonical product implementation and application composition root;
- `views/hivenues/` and HiVenues-owned public assets — current Studio/Territory rendering surface;
- current HostGraph, Working/Live, Release/History, Territory, Studio, social/community participation, Hive consequence, reward-claim, and direct-support paths.

Accepted Era-0–4 contracts remain controlling: server-owned canonical host state, durable identity, Working/Live separation, explicit Release, immutable history, working-only Restore, stale rejection, urgent isolation, restart persistence, multi-route Territory projection, materially distinct Directions, complete supported authoring, host-native social/community experience, human-owned wallet authority, pending-before-observed consequence semantics, provider-observed state outside HostGraph, and exact canonical confirmation for admitted Hive writes.

### 2. Shared infrastructure

The only shared source areas outside `src/product/` are small capability seams transitively consumed by the current product: Hive RPC/read and consequence primitives, authentication/authority helpers, HTTP validation/errors, social preflight state, and markdown/MathML rendering.

Retention rules:

- product/domain semantics stay product-owned;
- provider IDs do not become HostGraph identity;
- no second durable client model;
- provider-replaceable capabilities sit behind product-owned seams;
- reuse is justified by a current dependency, never by historical milestone status.

### 3. Superseded development code

The active tree no longer carries a parallel historical server/venue/v1/v2/deployment application stack. Those unreleased architectures, along with their milestone-only tooling and documents, remain available in Git history.

If future archaeology reveals another superseded path, it earns retention only when the current product has a concrete dependency on it. Do not recreate `legacy:*` commands or compatibility gates merely to make historical runtimes executable.

### 4. Qualification tooling

Keep qualification tooling only when it protects an enduring current product contract that ordinary focused tests cannot adequately cover. One-off milestone screenshot campaigns, exact old release rehearsals, and superseded harnesses remain maintenance candidates.

Current qualification entrypoints are product-owned. Superseded milestone-specific browser campaigns and unreleased compatibility shims are not retained on the active tree merely for historical reproducibility; Git history preserves them.

### 5. Historical documentation

Historical plans, charters, handoffs, and evidence remain recoverable from Git history. Current authority is:

1. frozen doctrine set;
2. `HIVENUES_BIG_PICTURE_ROADMAP_0_1_0.md`;
3. `docs/ROADMAP.md` current marker;
4. active issue/workstream charter;
5. current implementation and tests.

Historical documents should not claim current authority merely because they remain in the tree.

## State and persistence

Durable application truth remains server-owned.

The current file-backed product store persists an atomic versioned envelope to a caller-selected state path and maintains local media outside the semantic HostGraph. The ordinary development launcher defaults to ignored `data/hivenues-dev-state.json`.

The browser may hold transient interaction state but must not become a second durable HostGraph mirror.

Working state, Live Release state, Release history, provider-observed state, deployment state, and future consequential-operation state remain distinct concepts.

## Rendering and route model

Public and Preview routes are projections of the same canonical semantic host. Direction-specific compositions are expected to differ structurally in navigation, DOM hierarchy, route grouping, media placement, density, interaction placement, and responsive behavior.

Shared components should share **meaning**, not force one universal page skeleton.

Working Preview navigation must remain in Working Preview; Live routes must remain Live; History/Restore review must not mutate state; provider reads must not claim writes occurred.

## Hive boundary

Era 4 admits bounded real Hive-backed participation through product-owned consequence seams: identity proof, follow/community actions, content/reply, vote, personal resource/reward reads, exact reward claiming, and synthetic direct host support.

```text
MECHANIC         = exact consequence
VOICE            = host language
PRESENTATION     = Direction/composition-specific visual form
PROVIDER BINDING = external execution/state source
```

HiVenues does not custody customer private keys. Admitted writes require explicit human-owned wallet authority. Wallet/provider acceptance is pending, not confirmed success; confirmation requires the consequence-specific canonical read-back/observation contract.

Observed Hive state, rewards, balances and transaction receipts do not become HostGraph state merely because they are rendered inside the host world.

Era 5 distribution must package these contracts unchanged. Installation/launch consequences are a new local application boundary, not authority to broaden Hive writes.

## Adding or changing product code

Before introducing a subsystem, answer:

1. Can the current canonical model express the requirement?
2. Is there a currently useful shared primitive that already satisfies the capability behind a product-owned seam?
3. Does the change preserve server-owned durable truth?
4. Does reuse share semantics without flattening Direction-specific art direction?
5. Is provider-specific state downstream of canonical product identity?
6. Is the change inside the authorized roadmap/workstream boundary?

A new framework, parallel model, provider-specific product model, or Candidate line requires explicit architectural justification.

## #301 closure and remaining maintenance debt

The #301 repository/product-core normalization exit audit passed on the green canonical main after PRs #302 and #303. The repository now has an obvious canonical product root, install/dev/check commands, current documentation hierarchy, feature-placement rule, ordinary PR/CI loop, and next roadmap objective.

Remaining items are primarily repository administration rather than product-code debt:

- merged branch deletion where repository tooling permits;
- main-branch protection/ruleset configuration in GitHub administration;
- dependency/build-pipeline simplification only when current reachability evidence justifies it.

These should be handled opportunistically or by bounded maintenance issues when they create concrete ambiguity, risk, or cost. They do not outrank Era-5 distribution work merely because they are old.

The installed-runtime, native-launcher, and reproducible Windows x64 distributable boundaries are now proven and product-owned. The next architectural task is Era-5 Tranche 3: qualify the ordinary Windows install/update/uninstall lifecycle on a clean supported machine, including durable-work preservation and the accepted signing/reputation boundary, while preserving all frozen Era-0–4 contracts.
