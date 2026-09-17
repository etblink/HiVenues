# HiVenues — Current Program Marker

This file is the **current-state bridge** into the frozen strategic roadmap. It is intentionally short.

The canonical strategic sequence is defined by:

- `docs/HIVENUES_BIG_PICTURE_ROADMAP_0_1_0.md`

The product destination and constraints are defined by the frozen doctrine set referenced from that roadmap. Historical program plans remain available in Git history and historical documents, but they do not override this marker when they describe older PM/HV/Candidate states.

## Verified current state

The #301 exit audit was performed against:

```text
EXIT_AUDIT_MAIN = 75375fb1aa6fb1ae4513f7d1e12d2f8427bd5844
EXIT_AUDIT_TREE = e8b9b421b58ac24c4451645d18d9b377a23e35c8
POST_MERGE_CI = #1264 / PASS

ERA 0 — RELIABLE CANDIDATE SUBSTRATE          COMPLETE / PRESERVE
ERA 1 — TERRITORY ARCHITECTURE               COMPLETE / PRESERVE
ERA 2 — COMPLETE TERRITORY AUTHORING          COMPLETE / FROZEN
ERA 3 — HOST-NATIVE SOCIAL & COMMUNITY        COMPLETE / FROZEN

#301 — REPOSITORY_AND_PRODUCT_CORE_NORMALIZATION   COMPLETE
NEXT OBJECTIVE = ERA 4 — REAL HIVE-BACKED PARTICIPATION
ERA 4 IMPLEMENTATION = REQUIRES BOUNDED CHARTER / ISSUE
EXTERNAL EFFECTS = ZERO UNTIL EXPLICITLY AUTHORIZED
```

Era 2 was closed through the Territory Authoring workstream. Era 3 was subsequently closed after read-only social/community discovery, provider-realistic Hive reads, host-native Direction-specific presentation, degraded/failure states, browser qualification, and confirmation that observed Hive state does not enter HostGraph.

## #301 normalization outcome

Normalization established the ordinary product/repository loop:

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
→ branch cleanup where tooling permits
→ release/version when appropriate
```

The objective closed with:

1. `src/product/app.js` as the canonical application composition root;
2. an obvious install/dev/check command surface;
3. README, current architecture, current roadmap, and development instructions aligned;
4. obsolete compatibility gates and milestone-only CI/test machinery substantially reduced;
5. superseded development code explicitly denied backwards-compatibility status;
6. remaining historical `candidate-c` naming classified as non-authoritative implementation debt rather than a second product line;
7. ordinary CI green on Windows and Ubuntu plus production dependency audits;
8. exact recommended main-branch safeguards documented where the available integration cannot administer GitHub branch protection;
9. a fresh exit audit confirming all 12 #301 repository questions can be answered from the repository without project archaeology.

Remaining historical names, branches, scripts, or documents may be cleaned when concrete dependency evidence and maintenance value justify it. They do not independently reopen normalization.

## Next objective — Era 4

The next strategic era is **Real Hive-Backed Participation**.

The roadmap's preferred authority progression remains:

```text
PUBLIC READS
→ ACCOUNT / PROFILE STATE
→ COMMUNITY / CONTENT STATE
→ IDENTITY PROOF
→ FOLLOW / COMMUNITY ACTIONS
→ POST / UPDATE / REPLY
→ VOTE / RECOMMEND / APPLAUSE
→ RESOURCE / REWARD STATE
→ LATER VALUE ACTIONS
```

This ordering is a planning preference, not blanket authorization. Before Era-4 product code begins, open a bounded charter/issue specifying the first admitted consequence class, authority boundary, wallet/signing provider seam, reconciliation/read-back behavior, degraded states, qualification evidence, and held scope.

The governing separation remains:

```text
MECHANIC         = exact consequence
VOICE            = host language
PRESENTATION     = Direction-specific visual form
PROVIDER BINDING = external execution/state source
```

No customer private keys belong in HiVenues. A provider or wallet acceptance must not be presented as confirmed success until the product has the appropriate canonical read-back/reconciliation evidence for that consequence.

## Remaining strategic sequence

Unless a future explicit roadmap revision changes the program logic:

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

Until a bounded Era-4 charter explicitly authorizes a concrete slice, do not introduce:

- Hive writes, signing, broadcast, follow/unfollow, subscribe/unsubscribe, posting, replying, or voting;
- value movement or payments;
- production deployment, DNS, VPS, or permanent hosting mutation;
- Fourth Street customer work;
- independent Astra qualification;
- a React/Vue/SPA rewrite;
- broad cleanup or renaming solely for aesthetics.

## Successor rule

Before changing product code, a successor should be able to answer:

```text
WHAT IS HIVENUES?
→ A premium, host-first frontend factory for Hive.

WHAT IS THE NORTH STAR?
→ The host’s world becomes the interface to Hive.

WHERE ARE WE?
→ Eras 0–3 are complete/frozen; #301 normalization is complete; Era 4 is next and requires a bounded charter.

WHAT MUST NOT BE LOST?
→ The governing doctrine plus all completed-era acceptance contracts.

WHAT DECIDES THE NEXT PRODUCT PHASE?
→ The canonical big-picture roadmap, verified against repository evidence—not whichever code was edited most recently.
```

> **Do not let implementation adjacency decide product sequence. Let doctrine define the destination, let the roadmap define the journey, and let evidence decide when a gate is actually closed.**
