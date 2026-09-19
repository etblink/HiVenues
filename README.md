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
ERA 4 — REAL HIVE-BACKED PARTICIPATION        COMPLETE / FROZEN
ERA 5 — PRODUCT DISTRIBUTION                  FINAL EXTERNAL TRUST GATE PARKED
ERA 5 TRANCHE 3 — CLEAN-MACHINE INSTALLER     COMPLETE / FROZEN
ERA 5 SIGNING REPOSITORY BOUNDARY             COMPLETE / QUALIFIED
NEXT PRODUCT BOUNDARY — ERA 6                  HIVE ACCOUNT ONBOARDING
PAID PUBLIC-TRUST SIGNING                      DEFERRED UNTIL RELEASE READINESS
LIVE VALUE / PRODUCTION DEPLOYMENT            HELD
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

The active Era-0–4 implementation is normalized under the canonical `src/product/` boundary. Ordinary product routes, EJS views, browser assets, runtime symbols, and current regression tests use HiVenues-owned naming rather than the historical Candidate-C namespace.

The current product includes the server-owned HostGraph, Working/Live separation, explicit Release and History, Restore, stale-state protection, urgent isolation, durable persistence, multi-route Territory projection, materially distinct Directions, supported Studio authoring, host-native social/community participation, human-wallet content/vote actions, personal resource/reward state, exact reward claiming, and a qualified synthetic direct-support transfer surface.

Git history remains the archive for superseded Candidate-C implementation and qualification artifacts; no unreleased compatibility alias is retained merely for archaeology.

## Repository map

| Area | Role |
| --- | --- |
| `src/product/` | Canonical product implementation, domain modules, and application composition root. |
| `views/hivenues/` | Canonical HiVenues Studio/Territory EJS surface. |
| `public/` | Current browser assets, including HiVenues-owned CSS/JS/media namespaces. |
| `src/hive/`, `src/auth/`, `src/http/`, `src/lib/`, `src/social/`, `src/content/` | Small shared capability seams that are transitively consumed by the current product. |
| `scripts/hivenues-studio.js` | Ordinary loopback local Studio launcher. |
| `scripts/hivenues-installed.js` + `native/windows/` | Installed-runtime entry and minimal native Windows launcher. |
| `scripts/product-browser-qualification.js` | Current end-to-end browser qualification for enduring product contracts. |
| `scripts/era5/` | Current Windows distribution build/qualification tooling. |
| Git history | Archive for deleted Candidate, milestone, venue/v1/v2, deployment, and superseded qualification implementation. |
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

## Economic model and license

HiVenues follows the frozen **Sovereign Core + Paid Convenience + Hive-Aligned Upside** model.

The sovereign core remains open and self-hostable. The primary commercial opportunity is optional managed deployment/operations, support, professional services, and future marketplace services—not charging users for permission to use their own software, identity, data, or Hive relationships.

Economic invariants include:

- no mandatory HiVenues percentage tax on direct peer-to-peer Hive value transfers;
- no core revenue model based on sale of user data or surveillance advertising;
- no HiVenues ICO, founder pre-mine, or speculative project token by default;
- cancellation of paid services must preserve a practical exit/migration path;
- DHF/DAO funding and Value-for-Value may supplement, but not replace, a real customer/service economy;
- sustainable business surplus may be aligned with Hive through prudent HIVE/HP treasury accumulation;
- commercial competition is allowed; artificial proprietary lock-in is not the moat.

HiVenues-owned software is licensed under **AGPL-3.0-or-later**. Third-party components retain their own licenses. The repository remains `"private": true` in package metadata only to prevent accidental npm publication.

See `docs/HIVENUES_SOVEREIGN_SERVICES_ECONOMIC_DOCTRINE_0_1_0.md`.

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

Era 4 is complete and **Era 5 — Product Distribution is active** under issue **#323**.

Tranche 0 froze the Windows runtime architecture: a minimal native launcher around a private Node 24 runtime and ordinary packaged HiVenues app tree, using the system browser over loopback and application-owned user data. Tranche 1 productized that lifecycle and qualified the real Win32 launcher. Tranche 2 established the reproducible Windows x64 distributable. Tranche 3 then qualified the per-user NSIS installer on a fresh Windows runner, including install/launch/create-edit-Release, repair-style reinstall, uninstall-preserved durable state, and reinstall restoration without developer tooling.

The repository-side production-signing boundary is now qualified: exact unsigned promotion, manual-only protected signing authority, GitHub OIDC, pinned Azure actions, signed-provenance finalization, and signed clean-machine qualification are wired and preflighted.

The remaining paid external signing step—Azure Pay-As-You-Go, Microsoft Artifact Signing Public Trust individual enrollment, certificate profile, and first real signed installer qualification—is intentionally deferred until HiVenues is materially closer to external distribution.

Accordingly, the next product-building boundary is **Era 6 — Hive Account Onboarding**. Era 5 remains technically open at its final external trust gate; that gate must be resumed before broad external release.

Still held unless separately authorized: production deployment/DNS/VPS mutation, unrelated new commerce classes, Fourth Street customer work, independent Astra, and unrelated framework replacement.

## Canonical doctrine and roadmap

Read these before major product work:

1. `docs/HIVENUES_END_STATE_PRODUCT_DOCTRINE_0_2_0.md`
2. `docs/HIVENUES_CANONICAL_USER_JOURNEY_0_2_0.md`
3. `docs/HIVENUES_HIVE_ECOSYSTEM_INTEGRATION_DOCTRINE_0_2_0.md`
4. `docs/HIVENUES_DISTRIBUTION_ONBOARDING_DEPLOYMENT_DOCTRINE_0_1_0.md`
5. `docs/HIVENUES_RENDERING_AUTHORING_ARCHITECTURE_DOCTRINE_0_1_0.md`
6. `docs/HIVENUES_SOVEREIGN_SERVICES_ECONOMIC_DOCTRINE_0_1_0.md`
7. `docs/HIVENUES_BIG_PICTURE_ROADMAP_0_1_0.md`
8. `docs/ROADMAP.md`

Doctrine defines the destination, the roadmap defines the journey, active issue charters define bounded work, and current product tests protect accepted contracts. Implementation archaeology does not set product priority.
