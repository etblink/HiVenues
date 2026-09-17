# HiVenues

> **The host’s world becomes the interface to Hive.**

HiVenues is a **premium, host-first frontend factory for Hive**. It enables a nondeveloper to create and operate a distinctive digital territory whose public experience belongs to the host while Hive can supply portable identity, content, social, community, and economic primitives underneath where useful.

HiVenues is not fundamentally a venue website builder, a generic SaaS template engine, or a blockchain dashboard. A host may be a physical venue, creator, artist, publication, organization, community, event program, or another identity with a digital world to operate.

## Current program state

```text
ERA 0 — RELIABLE CANDIDATE SUBSTRATE          COMPLETE / PRESERVE CONTRACTS
ERA 1 — TERRITORY ARCHITECTURE               COMPLETE / PRESERVE CONTRACTS
ERA 2 — COMPLETE TERRITORY AUTHORING          COMPLETE / FROZEN
ERA 3 — HOST-NATIVE SOCIAL & COMMUNITY        COMPLETE / FROZEN
#301 — REPOSITORY / PRODUCT-CORE NORMALIZATION COMPLETE
ERA 4 — REAL HIVE-BACKED PARTICIPATION        NEXT / REQUIRES BOUNDED CHARTER
EXTERNAL EFFECTS                              ZERO
```

The strategic roadmap continues through distribution, Hive onboarding, deployment, richer Directions, value/commerce, operational completion, synthetic qualification, independent Astra, the first real customer, and broader release. See `docs/HIVENUES_BIG_PICTURE_ROADMAP_0_1_0.md` and `docs/ROADMAP.md`.

## Developer quick start

Requirements: Node.js 24.x within the range in `package.json` and npm 11.x.

```bash
npm ci --ignore-scripts --no-fund
npm run dev
```

`npm run dev` launches the canonical local HiVenues Studio path on loopback (`127.0.0.1:4173`) and uses ignored durable state at `data/hivenues-dev-state.json` by default.

A custom local state file or port may be supplied directly:

```bash
node scripts/hivenues-studio.js --state ./data/my-state.json --port 4317
```

The local launcher performs **no Hive writes, signing, deployment, DNS, provider mutation, payment, or other external effect**.

Before proposing a merge:

```bash
npm run check
```

See `docs/DEVELOPMENT.md` for the ordinary contribution loop.

## Canonical product core

`src/product/` is the stable ordinary application boundary. `src/product/app.js` owns application composition.

The already-qualified Era-0–3 implementation still contains internal `candidate-c` naming. That is implementation-history debt, not a second product line, not a compatibility promise, and not an architectural authority. New ordinary work should enter through product-owned boundaries and seams rather than adding fresh dependencies on the historical namespace.

The current product includes the server-owned HostGraph, Working/Live separation, explicit Release and History, Restore, stale-state protection, urgent isolation, durable persistence, multi-route Territory projection, materially distinct Directions, supported Studio authoring, and host-native read-only social/community surfaces.

Existing `/candidate-c` routes, views, assets, identifiers, or qualification names may be migrated later when a concrete product or maintenance requirement justifies the blast radius. Their continued existence does not reopen #301.

## Repository map

| Area | Role |
| --- | --- |
| `src/product/` | Canonical product boundary and application composition root. |
| `src/candidate-c/` | Current qualified Era-0–3 implementation internals carrying historical naming debt. Do not extend the naming by default. |
| `src/hive/`, `src/auth/`, and other capability modules | Reusable shared infrastructure only where the current product actually consumes it. |
| older server/venue/v2/V1/deployment paths | Unreleased historical implementation. No compatibility status; remove when not required by current product or an enduring qualification contract. |
| `scripts/hivenues-studio.js` | Ordinary loopback local Studio launcher. |
| `scripts/candidate-c-dogfood.js` | Retained qualification launcher; not the ordinary product entry point. |
| milestone-specific scripts/tests/docs | Maintenance candidates. Keep only when they protect an enduring current contract that cannot be expressed by ordinary product-level tests. |
| `docs/HIVENUES_*DOCTRINE*` | Frozen product, journey, Hive, distribution, and architecture doctrine. |
| `docs/HIVENUES_BIG_PICTURE_ROADMAP_0_1_0.md` | Strategic execution roadmap. |
| `docs/ROADMAP.md` | Current verified program marker. |
| `docs/CURRENT_ARCHITECTURE.md` | Current implementation map. |

## Cleanup rule

HiVenues has not shipped a public product that requires backwards compatibility with superseded development architectures.

Therefore:

- Git history is the archive;
- old code does not earn retention merely because it once passed a milestone;
- stale tests must not force current docs, package identity, commands, or architecture to preserve superseded assumptions;
- shared primitives may be retained only when the current product actually depends on them;
- qualification tooling may be retained only when it protects an enduring current contract;
- dead development paths should be deleted rather than renamed `legacy` and carried forward indefinitely;
- cleanup debt does not outrank product roadmap work unless it creates real ambiguity, risk, or maintenance cost.

## Governing product rules

- **One canonical semantic host; many faithful projections.**
- **Share truth aggressively; share layout selectively.**
- **Durable state is server-owned.**
- **Directions are structural art direction, not themes.**
- **Canvas first; progressive control afterward.**
- **Metaphor at the experience layer; truth at the consequence boundary.**
- **Hive is foundational but not a wallet-first gate.**
- **No customer private-key custody.**
- **Professional 2026 visual, interaction, responsive, and accessibility quality is a product requirement.**

## Architecture direction

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

## Next development boundary

Normalization is complete. The strategic next objective is **Era 4 — Real Hive-Backed Participation**.

Era 4 product code should not begin from implementation adjacency. Open a bounded Era-4 charter/issue first that identifies the exact consequence class being admitted, the existing provider-neutral seam it reuses, human-wallet authority requirements, read-back/reconciliation semantics, degraded behavior, tests/evidence, and explicit held scope.

Until such a charter authorizes a concrete slice, preserve the current zero-external-effect boundary: no Hive broadcasts/signing, follow/unfollow or posting/voting writes, value movement, production deployment/DNS/VPS mutation, Fourth Street customer work, or unrelated framework rewrite.

## Canonical doctrine and roadmap

Read these before major product work:

1. `docs/HIVENUES_END_STATE_PRODUCT_DOCTRINE_0_2_0.md`
2. `docs/HIVENUES_CANONICAL_USER_JOURNEY_0_2_0.md`
3. `docs/HIVENUES_HIVE_ECOSYSTEM_INTEGRATION_DOCTRINE_0_2_0.md`
4. `docs/HIVENUES_DISTRIBUTION_ONBOARDING_DEPLOYMENT_DOCTRINE_0_1_0.md`
5. `docs/HIVENUES_RENDERING_AUTHORING_ARCHITECTURE_DOCTRINE_0_1_0.md`
6. `docs/HIVENUES_BIG_PICTURE_ROADMAP_0_1_0.md`
7. `docs/ROADMAP.md`

Doctrine defines the destination, the roadmap defines the journey, active issue charters define bounded work, and current product tests protect accepted contracts. Implementation archaeology does not set product priority.
