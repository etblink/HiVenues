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

`src/product/app.js` is the ordinary application entry boundary introduced by #301.

It currently wraps the qualified Era-0–3 implementation under `src/candidate-c/` so the repository can establish one product-owned entry point before renaming active internals. This is a migration seam, not a compatibility layer.

New ordinary application code must use the product boundary or product-owned domain seams. Do not create new dependencies on `src/candidate-c/` simply because current internals still live there.

### Transitional naming debt

Current internals still include `CandidateC*` identifiers, `/candidate-c` routes, candidate-c views/assets, and dogfood qualification endpoints. These are not durable product names. #301 should remove them as the active dependency set is migrated and requalified.

## Source classification

### 1. Active product

- `src/product/` — canonical ordinary product boundary;
- the portions of `src/candidate-c/` used by that boundary — current qualified Studio/Territory implementation pending promotion/rename;
- current EJS views/assets and semantic renderers consumed by that implementation;
- current HostGraph, Working/Live, Release/History, Territory, Studio, and read-only social/community paths.

Accepted Era-0–3 contracts remain controlling: server-owned canonical host state, durable identity, Working/Live separation, explicit Release, immutable history, working-only Restore, stale rejection, urgent isolation, restart persistence, multi-route Territory projection, materially distinct Directions, complete supported authoring, and host-native read-only social/community experience.

### 2. Shared infrastructure

Older modules may be retained **only** when the current product actually consumes a capability that still satisfies current doctrine—for example Hive RPC/read normalization, authentication/authority helpers, validation, security middleware, or observability.

Retention rules:

- product/domain semantics stay product-owned;
- provider IDs do not become HostGraph identity;
- no second durable client model;
- provider-replaceable capabilities sit behind product-owned seams;
- reuse is justified by a current dependency, never by historical milestone status.

### 3. Superseded development code

Older server, venue/v2, V1, historical deployment, and milestone-specific paths have **no backwards-compatibility status** merely because they once worked.

HiVenues has not shipped a public product whose users depend on those development architectures. Git history is the archive.

For every superseded path, classify it as either:

1. **currently reused primitive** — keep or move behind a current product-owned seam; or
2. **not required by the current product** — delete it, along with tests/scripts/docs whose only purpose is preserving it.

Do not create `legacy:*` commands or compatibility gates simply to keep unreleased historical runtimes executable.

### 4. Qualification tooling

Keep qualification tooling only when it protects an enduring current product contract that ordinary focused tests cannot adequately cover. One-off milestone screenshot campaigns, exact old release rehearsals, and superseded harnesses are deletion candidates.

The current Candidate-C dogfood launcher is temporarily useful while the qualified implementation namespace itself is being migrated. It should not become permanent architecture by inertia.

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

Era 3 admits real/provider-realistic **read-side** Hive/community state. Era 4 writes remain held while #301 is active.

```text
MECHANIC         = exact consequence
VOICE            = host language
PRESENTATION     = Direction/composition-specific visual form
PROVIDER BINDING = external execution/state source
```

HiVenues must not custody customer private keys. Future consequential writes require explicit human-owned wallet authority and truthful reconciliation/read-back before confirmed success where observable.

Observed Hive state does not become HostGraph state merely because it is rendered inside the host world.

## Adding or changing product code

Before introducing a subsystem, answer:

1. Can the current canonical model express the requirement?
2. Is there a currently useful shared primitive that already satisfies the capability behind a product-owned seam?
3. Does the change preserve server-owned durable truth?
4. Does reuse share semantics without flattening Direction-specific art direction?
5. Is provider-specific state downstream of canonical product identity?
6. Is the change inside the authorized roadmap/workstream boundary?

A new framework, parallel model, provider-specific product model, or Candidate line requires explicit architectural justification.

## What #301 still needs to normalize

- migrate/rename active `candidate-c` internals and browser routes;
- identify current dependencies on older modules, promote useful primitives, and delete the rest;
- remove obsolete npm scripts, milestone harnesses, stale tests, and superseded docs;
- collapse the test suite toward current product-level contracts rather than historical milestone preservation;
- remove merged branches where permissions permit;
- establish ordinary main-branch protection and release/version safeguards;
- perform a final repo-health review before reopening Era 4.

Cleanup is complete only when a competent engineer can identify the current product, its code, ordinary dev/test loop, feature-placement rules, and next objective without learning unreleased historical architectures.
