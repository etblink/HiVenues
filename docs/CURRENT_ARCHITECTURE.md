# HiVenues — Current Architecture

This document maps the **current repository** onto the frozen HiVenues architecture doctrine. It does not replace the doctrine.

Canonical architecture doctrine:

- `docs/HIVENUES_RENDERING_AUTHORING_ARCHITECTURE_DOCTRINE_0_1_0.md`

Parent product doctrine:

- `docs/HIVENUES_END_STATE_PRODUCT_DOCTRINE_0_2_0.md`

## Architecture rule

> **Share truth aggressively. Share layout selectively. Keep durable state on the server. Let compositions be genuinely different. Use modern web primitives at the layer where they are strongest.**

The intended implementation shape remains:

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

## Current canonical product boundary

`src/product/app.js` is the ordinary application entry boundary introduced by issue #301.

It currently wraps the already-qualified Era-0–3 implementation in `src/candidate-c/` rather than copying or rewriting it. This is deliberate:

- the proven implementation remains byte/history recognizable;
- qualification and regression paths are not silently broken;
- ordinary callers gain a product-owned import path now;
- later path/module cleanup can be performed with dependency evidence rather than a speculative mass rename.

New ordinary application code should prefer the product boundary and product-owned domain seams. Do not create new external dependencies on `src/candidate-c/` merely because that is where the current implementation lives internally.

### Transitional debt

The current app still contains implementation vocabulary such as:

- `CandidateCStore` and related class/function names;
- `/candidate-c` browser routes;
- `candidate-c` EJS/view and public-asset paths;
- dogfood qualification endpoints in the wrapped implementation.

These names are **not product doctrine** and are not a second product. They should be removed or renamed only when search/dependency evidence shows the change is safe and qualification contracts are preserved.

The ordinary local launcher does not enable the dogfood public-ingress mode. The dedicated historical/qualification launcher remains separate.

## Source classification

### 1. Active product

Primary current product implementation:

- `src/product/` — stable ordinary entry boundary;
- `src/candidate-c/` — qualified Territory/Studio implementation while #301 migration is in progress;
- current EJS views, public assets, and semantic renderers used by that runtime;
- the current HostGraph, Working/Live, Release/History, Territory, Studio, and read-only social/community paths.

The active product preserves the accepted Era-0–3 truths: server-owned canonical host state, durable identity, Working/Live separation, explicit Release, immutable history, working-only Restore, stale-state rejection, urgent isolation, persistence/restart truth, multi-route Territory projection, materially distinct Directions, complete supported Territory authoring, and host-native read-only social/community experience.

### 2. Shared infrastructure

Mature capability modules outside the current product namespace may remain valuable and should be reused when they satisfy current doctrine. Examples include Hive RPC/read normalization, authentication/authority, validation, security middleware, deployment identity, observability, release infrastructure, and provider-oriented helpers.

Rules for reuse:

- the product/domain model owns semantics;
- provider IDs do not become HostGraph identity;
- shared infrastructure must not introduce a second durable client model;
- a reusable service should sit behind a product-owned seam where provider replacement matters;
- old code is reused because it satisfies a current requirement, not because it exists.

### 3. Legacy / compatibility runtime

`src/server.js`, `src/app.js`, older `src/venue/` and v2 authoring paths, and related commands preserve earlier accepted behavior and compatibility evidence.

They are no longer the ordinary product-development entry point.

They must not be deleted merely because the current product has moved beyond them. Before removal, prove that no active runtime, release/recovery path, test, documentation contract, or still-required shared service depends on them.

Explicit compatibility commands remain available as `legacy:*` or other historically named scripts until separately retired.

### 4. Qualification / evidence tooling

Dogfood launchers, browser-capture scripts, milestone visual harnesses, release rehearsals, exact-head evidence helpers, and synthetic fixtures are evidence machinery.

Keep a tool when it protects an enduring product contract or is still needed to reproduce accepted evidence. Archive or remove it when search/dependency evidence proves it is one-off historical sediment and ordinary product-level tests have superseded it.

Do not create a new milestone-specific harness when a reusable product-level test can express the requirement.

### 5. Historical documentation

Historical plans, charters, handoffs, and qualification records remain useful provenance. They do not become current authority merely because they are still in `docs/`.

Current routing is:

1. frozen doctrine set;
2. `HIVENUES_BIG_PICTURE_ROADMAP_0_1_0.md`;
3. `docs/ROADMAP.md` current program marker;
4. active issue/workstream charter;
5. implementation and tests.

## State and persistence

Durable application truth remains server-owned.

The current file-backed product store persists an atomic versioned envelope to a caller-selected state path and maintains local media outside the public semantic HostGraph. The ordinary development launcher defaults to ignored repository-local `data/hivenues-dev-state.json`.

The browser may hold transient interaction state, but it must not become a second durable HostGraph mirror.

Working state, Live Release state, Release history, provider-observed state, deployment state, and future consequential-operation state are distinct concepts and must not be collapsed for convenience.

## Rendering and route model

Public and Preview routes are projections of the same canonical semantic host. Direction-specific compositions are allowed—and expected—to differ structurally in navigation, DOM hierarchy, hierarchy, route grouping, media placement, density, interaction placement, and responsive behavior.

Shared components should share **meaning**, not force one universal page skeleton.

Internal links must preserve context truth. Working Preview navigation must remain in Working Preview; Live routes must remain Live; History/Restore review must not mutate state; provider reads must not claim writes occurred.

## Hive boundary

Era 3 admits real/provider-realistic **read-side** Hive/community state. Era 4 writes remain held while #301 is active.

The governing separation is:

```text
MECHANIC         = exact consequence
VOICE            = host language
PRESENTATION     = Direction/composition-specific visual form
PROVIDER BINDING = external execution/state source
```

HiVenues must not custody customer private keys. Future consequential writes require explicit human-owned wallet authority and truthful reconciliation/read-back before confirmed success where the primitive is observable.

Observed Hive state does not become HostGraph state merely because it is rendered inside the host world.

## Adding or changing product code

Before introducing a new subsystem, answer:

1. Can the current canonical model express the requirement?
2. Is there already a mature shared service that satisfies the capability behind a product-owned seam?
3. Does the change preserve server-owned durable truth?
4. Does reuse share semantics without flattening Direction-specific art direction?
5. Is provider-specific state being kept downstream of canonical product identity?
6. Is the change inside the currently authorized roadmap/workstream boundary?

A new framework, parallel model, provider-specific UI/domain system, or Candidate line requires explicit architectural justification rather than convenience.

## What #301 still needs to normalize

This first promotion boundary does **not** claim the repository is already clean. Remaining evidence-driven work includes:

- determine which `candidate-c` path/route names can be renamed without losing qualification/provenance value;
- classify older runtime modules as shared, compatibility, or dead;
- classify historical npm scripts and visual harnesses before removal;
- reconcile tests around the canonical product boundary;
- remove merged branches where repository permissions permit;
- establish/document ordinary main-branch protection and release/version safeguards;
- perform a final repo-health review before reopening Era 4.

Cleanup is complete only when an engineer can quickly identify the product core, feature-placement rules, focused test path, CI gate, legacy boundary, and next roadmap objective without learning the project’s milestone archaeology first.
