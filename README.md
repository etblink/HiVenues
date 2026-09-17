# HiVenues

> **The host’s world becomes the interface to Hive.**

HiVenues is a **premium, host-first frontend factory for Hive**. It enables a nondeveloper to create and operate a distinctive digital territory whose public experience belongs to the host while Hive can supply portable identity, content, social, community, and economic primitives underneath where useful.

HiVenues is not fundamentally a venue website builder, a generic SaaS template engine, or a blockchain dashboard. A host may be a physical venue, creator, artist, publication, organization, community, event program, or another identity with a digital world to operate.

## Current program state

As of the canonical Era-3 checkpoint:

```text
ERA 0 — RELIABLE CANDIDATE SUBSTRATE          COMPLETE / PRESERVE
ERA 1 — TERRITORY ARCHITECTURE               COMPLETE / PRESERVE
ERA 2 — COMPLETE TERRITORY AUTHORING          COMPLETE / FROZEN
ERA 3 — HOST-NATIVE SOCIAL & COMMUNITY        COMPLETE / FROZEN
#301 — REPOSITORY / PRODUCT-CORE NORMALIZATION ACTIVE
ERA 4 — REAL HIVE-BACKED PARTICIPATION        HELD UNTIL #301 CLOSES
EXTERNAL EFFECTS                              ZERO
```

The strategic roadmap continues beyond Era 4 through distribution, Hive onboarding, deployment, richer Directions, value/commerce, operational completion, synthetic qualification, independent Astra, the first real customer, and broader release. See `docs/HIVENUES_BIG_PICTURE_ROADMAP_0_1_0.md` and the current marker in `docs/ROADMAP.md`.

## Developer quick start

Requirements: Node.js 24.x within the range in `package.json` and npm 11.x.

```bash
npm ci --ignore-scripts --no-fund
npm run dev
```

`npm run dev` now launches the canonical local HiVenues Studio development path on loopback (`127.0.0.1:4173`) and uses an ignored durable state file at `data/hivenues-dev-state.json` by default.

A custom local state file or port may be supplied directly:

```bash
node scripts/hivenues-studio.js --state ./data/my-state.json --port 4317
```

The local launcher performs **no Hive writes, signing, deployment, DNS, provider mutation, payment, or other external effect**.

Run the ordinary repository quality gate before proposing a merge:

```bash
npm run check
```

For contribution workflow, focused testing, CI expectations, and release/version policy, see `docs/DEVELOPMENT.md`.

## Canonical product core

`src/product/` is the stable ordinary entry boundary for the current product.

During issue #301, the already-qualified Era-0–3 implementation remains under `src/candidate-c/` while it is promoted deliberately rather than renamed wholesale. That namespace is **transitional implementation vocabulary**, not a competing product and not permission to create a Candidate D.

The currently qualified product includes the server-owned HostGraph, Working/Live separation, explicit Release and History, Restore, stale-state protection, urgent isolation, durable persistence, multi-route Territory projection, materially distinct Directions, supported Studio authoring, and host-native read-only social/community surfaces.

Some internal and browser routes still contain `/candidate-c`. Removing that vocabulary is cleanup work only after dependency and qualification evidence shows the change is safe. Ordinary callers should enter through the product boundary instead of adding new dependencies on the transitional namespace.

## Repository map

| Area | Role |
| --- | --- |
| `src/product/` | Canonical product entry boundary for ordinary development. |
| `src/candidate-c/` | Current qualified Era-0–3 implementation; transitional namespace during #301. |
| `src/hive/`, `src/auth/`, `src/deployment/`, and other capability modules | Mature shared infrastructure. Reuse behind product-owned seams rather than duplicating provider logic. |
| `src/server.js`, `src/app.js`, older venue/v2 paths | Legacy/compatibility runtime and historical substrate. Preserve until dependency evidence supports retirement. |
| `scripts/hivenues-studio.js` | Ordinary loopback local Studio launcher. |
| `scripts/candidate-c-dogfood.js` | Retained qualification harness for historical/exact-head dogfood workflows; not the default developer launcher. |
| milestone/visual/rehearsal scripts and historical docs | Qualification evidence and historical machinery. Do not treat them as the ordinary product path. |
| `docs/HIVENUES_*DOCTRINE*` | Frozen product, journey, Hive, distribution, and architecture doctrine. |
| `docs/HIVENUES_BIG_PICTURE_ROADMAP_0_1_0.md` | Canonical strategic execution roadmap. |
| `docs/ROADMAP.md` | Current verified program marker and routing bridge. |
| `docs/CURRENT_ARCHITECTURE.md` | Current repository/architecture map for implementation decisions. |

## Preserved legacy turnkey compatibility

The older local venue turnkey workflow remains preserved while #301 classifies compatibility dependencies. These are **not** the ordinary current product path, but the existing deterministic wiring gate still protects them:

```bash
npm run venue:create -- ./my-venue
npm run venue:studio -- ./my-venue
npm run venue:ready -- ./my-venue
```

Do not extend this workflow for new product features. Its retention is compatibility/evidence work until a later dependency audit proves it can be retired or absorbed safely.

## Governing product rules

The doctrine set controls implementation, not the other way around. The shortest working rules are:

- **One canonical semantic host; many faithful projections.** Studio, Preview, Live, routes, open projections, and provider-backed surfaces must not become competing durable models.
- **Share truth aggressively; share layout selectively.** Reuse semantic decisions without forcing unrelated hosts into one universal page skeleton.
- **Durable state is server-owned.** Use server rendering/HTMX for durable transitions and bounded JavaScript for transient local interaction.
- **Directions are structural art direction, not themes.** Navigation, hierarchy, route topology, media choreography, density, interaction placement, and responsive behavior may differ materially.
- **Canvas first; progressive control afterward.** Studio should be a professional creative product, not an administrative database UI.
- **Metaphor at the experience layer; truth at the consequence boundary.** Voice and presentation may be host-native while the underlying mechanic, authority, public consequence, and value movement remain exact.
- **Hive is foundational but not a wallet-first gate.** Public usefulness comes first; identity and signing appear only when a real consequence requires them.
- **No customer private-key custody.** Consequential Hive writes ultimately belong to the human-controlled wallet and require canonical read-back before confirmed success where observable.
- **Professional 2026 quality is a product requirement.** Green tests protect contracts but do not substitute for visual, interaction, responsive, and accessibility judgement.

## Architecture direction

The frozen architecture doctrine is summarized as:

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

A React/Vue/SPA rewrite is not the default direction. Framework or subsystem changes require evidence that the existing model cannot meet a concrete product requirement.

See `docs/CURRENT_ARCHITECTURE.md` and `docs/HIVENUES_RENDERING_AUTHORING_ARCHITECTURE_DOCTRINE_0_1_0.md`.

## Current development boundary

Issue #301 is repository normalization, **not Era 4 product expansion**. Until that objective closes, do not introduce:

- Hive signing or broadcast;
- follow/unfollow, subscribe/unsubscribe, post/reply/vote writes;
- value movement or payments;
- production deployment, DNS, VPS, or permanent hosting mutation;
- Fourth Street customer work;
- independent Astra qualification;
- a parallel Candidate/product architecture;
- a gratuitous SPA rewrite.

Historical commands remain available under explicit names where compatibility still requires them. In particular, the prior runtime can be launched with `npm run legacy:start` or `npm run legacy:dev`; those are not the current product-development default.

## Canonical doctrine and roadmap

Read these before major product work:

1. `docs/HIVENUES_END_STATE_PRODUCT_DOCTRINE_0_2_0.md`
2. `docs/HIVENUES_CANONICAL_USER_JOURNEY_0_2_0.md`
3. `docs/HIVENUES_HIVE_ECOSYSTEM_INTEGRATION_DOCTRINE_0_2_0.md`
4. `docs/HIVENUES_DISTRIBUTION_ONBOARDING_DEPLOYMENT_DOCTRINE_0_1_0.md`
5. `docs/HIVENUES_RENDERING_AUTHORING_ARCHITECTURE_DOCTRINE_0_1_0.md`
6. `docs/HIVENUES_BIG_PICTURE_ROADMAP_0_1_0.md`
7. `docs/ROADMAP.md` for the current verified marker

The doctrine defines the destination, the big-picture roadmap defines the program sequence, current issue charters define bounded work, and tests protect accepted contracts. Implementation adjacency does not set product priority.
