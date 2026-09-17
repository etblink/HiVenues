# HiVenues — Current Program Marker

This file is the **current-state bridge** into the frozen strategic roadmap. It is intentionally short.

The canonical strategic sequence is defined by:

- `docs/HIVENUES_BIG_PICTURE_ROADMAP_0_1_0.md`

The product destination and constraints are defined by the frozen doctrine set referenced from that roadmap. Historical program plans remain available in Git history and historical documents, but they do not override this marker when they describe older PM/HV/Candidate states.

## Verified current state

At the opening of issue #301:

```text
CANONICAL_MAIN = 0eecced8d29889fba98bea14d00040d10f980cb9
CANONICAL_TREE = 87bbe759ceaf7cd4e5d73249952d5c56894d76ee

ERA 0 — RELIABLE CANDIDATE SUBSTRATE          COMPLETE / PRESERVE
ERA 1 — TERRITORY ARCHITECTURE               COMPLETE / PRESERVE
ERA 2 — COMPLETE TERRITORY AUTHORING          COMPLETE / FROZEN
ERA 3 — HOST-NATIVE SOCIAL & COMMUNITY        COMPLETE / FROZEN

CURRENT OBJECTIVE = #301 REPOSITORY_AND_PRODUCT_CORE_NORMALIZATION
ERA 4 — REAL HIVE-BACKED PARTICIPATION        HELD UNTIL #301 CLOSES
PRODUCT FEATURE EXPANSION                     PAUSED FOR NORMALIZATION
EXTERNAL EFFECTS                              ZERO
```

Era 2 was closed through the Territory Authoring workstream. Era 3 was subsequently closed after read-only social/community discovery, provider-realistic Hive reads, host-native Direction-specific presentation, degraded/failure states, browser qualification, and confirmation that observed Hive state does not enter HostGraph.

## Current objective — #301

The immediate job is to make the repository express the product that has already won.

The target ordinary contribution loop is:

```text
prioritized issue
→ short-lived branch
→ implementation using the existing product architecture
→ focused tests
→ npm run check
→ browser/visual evidence only when the change needs it
→ ordinary PR review
→ required CI
→ merge
→ delete branch
→ release/version when appropriate
```

The normalization objective includes:

1. promote the qualified Territory/Studio product behind an obvious canonical product boundary;
2. distinguish active product code, shared infrastructure, legacy/compatibility code, qualification/evidence tools, and historical documentation;
3. make README, architecture, current roadmap, and development instructions agree;
4. establish obvious install/dev/check commands;
5. remove old sediment only after dependency/search evidence proves removal safe;
6. use ordinary branch/PR/CI/release safeguards rather than project-specific governance machinery where standard repository practice is sufficient.

Normalization is **not** a rewrite. Existing mature infrastructure should be reused behind product-owned seams. No Candidate D or parallel product line is authorized.

## Strategic sequence after normalization

Unless a future explicit roadmap revision changes the program logic, the remaining eras are:

```text
ERA 4  — REAL HIVE-BACKED PARTICIPATION
ERA 5  — PRODUCT DISTRIBUTION
ERA 6  — HIVE ACCOUNT ONBOARDING
ERA 7  — DEPLOYMENT PRODUCT
ERA 8  — RICHER DIRECTION & DESIGN SYSTEM
ERA 9  — VALUE / COMMERCE / V4V
ERA 10 — OPERATIONAL & MOBILE COMPLETION
ERA 11 — INTERNAL MAXIMAL SYNTHETIC QUALIFICATION
ERA 12 — INDEPENDENT SYNTHETIC ASTRA
ERA 13 — FOURTH STREET BAR FIRST CUSTOMER
ERA 14 — BROADER RELEASE
```

The boundaries between intermediate eras may be split or partially interleaved when dependency evidence makes that safer, but a major reordering of the product-validation logic requires an explicit roadmap revision.

## Current hard boundary

Issue #301 does not authorize:

- Hive writes, signing, broadcast, follow/unfollow, subscribe/unsubscribe, posting, replying, or voting;
- value movement or payments;
- production deployment, DNS, VPS, or permanent hosting mutation;
- Fourth Street customer work;
- independent Astra qualification;
- a React/Vue/SPA rewrite;
- bulk deletion or cosmetic renaming without dependency evidence.

## Successor rule

Before changing product code, a successor should be able to answer:

```text
WHAT IS HIVENUES?
→ A premium, host-first frontend factory for Hive.

WHAT IS THE NORTH STAR?
→ The host’s world becomes the interface to Hive.

WHERE ARE WE?
→ Eras 0–3 are complete/frozen; #301 normalization is active; Era 4 is held.

WHAT MUST NOT BE LOST?
→ The governing doctrine plus all completed-era acceptance contracts.

WHAT DECIDES THE NEXT PRODUCT PHASE?
→ The canonical big-picture roadmap, verified against repository evidence—not whichever code was edited most recently.
```

> **Do not let implementation adjacency decide product sequence. Let doctrine define the destination, let the roadmap define the journey, and let evidence decide when a gate is actually closed.**
