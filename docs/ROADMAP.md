# HiVenues — Current Program Marker

This file is the **current-state bridge** into the frozen strategic roadmap. It is intentionally short.

The canonical strategic sequence is defined by:

- `docs/HIVENUES_BIG_PICTURE_ROADMAP_0_1_0.md`

The product destination and constraints are defined by the frozen doctrine set referenced from that roadmap. Historical program plans remain available in Git history and historical documents, but they do not override this marker when they describe older PM/HV/Candidate states.

## Verified current state

Era 4 closed against canonical main after the Stage-6 direct-support merge:

```text
CANONICAL_MAIN = e5ffa008c1ccf74131df43b225f8ba8874f8355a
CANONICAL_TREE = a23d0baae246fd81c13fe5d099e2262cf8050e0c
POST_MERGE_CI = #1348 / PASS
POST_MERGE_PRODUCT_BROWSER = #75 / PASS

ERA 0 — RELIABLE CANDIDATE SUBSTRATE          COMPLETE / PRESERVE
ERA 1 — TERRITORY ARCHITECTURE               COMPLETE / PRESERVE
ERA 2 — COMPLETE TERRITORY AUTHORING          COMPLETE / FROZEN
ERA 3 — HOST-NATIVE SOCIAL & COMMUNITY        COMPLETE / FROZEN
ERA 4 — REAL HIVE-BACKED PARTICIPATION        COMPLETE / FROZEN

#301 — REPOSITORY_AND_PRODUCT_CORE_NORMALIZATION   COMPLETE
NEXT OBJECTIVE = ERA 5 — PRODUCT DISTRIBUTION
ACTIVE ERA-5 CHARTER = #323
LIVE VALUE QUALIFICATION = HELD
PRODUCTION DEPLOYMENT / DNS / VPS MUTATION = HELD
```

Era 4 accepted the bounded consequence progression from identity and relationship writes through posting/replying, voting, personal resource/reward state, exact same-account reward claiming, and the first host-native value action: synthetic direct host support using a separately released value-recipient role, fresh sender/recipient state, Active-authority human-wallet approval, pending state after wallet acceptance, and exact transaction/operation read-back before confirmed success.

No customer private key is stored by HiVenues. Provider-observed Hive state, balances, rewards, votes, transactions and receipts remain outside HostGraph truth.

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

## Next objective — Era 5

The next strategic era is **Product Distribution**, governed by **#323**.

The frozen roadmap exit gate is:

> **On a clean supported machine, an ordinary user can install and launch HiVenues without Git, npm, Docker, a shell, manual environment configuration or repository knowledge.**

The first practical target is Windows. Distribution may package the existing loopback server architecture; it does not justify a SPA rewrite.

The bounded first work must prove or decide:

- packaging technology for the current Node/server-rendered application;
- application-owned user-data/workspace location rather than repository-relative defaults;
- packaged EJS/static/dependency asset resolution;
- ordinary launcher/browser-open behavior;
- single-instance/port/shutdown behavior;
- exact version/build provenance and checksums;
- clean-machine install/launch/relaunch persistence;
- a credible signing/reputation strategy for an ordinary Windows artifact.

Era 5 does not authorize production hosting/deployment, account-creation onboarding, new commerce classes, Fourth Street work, or independent Astra.

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

During Era 5, preserve all accepted Era-0–4 behavior while changing how the application is obtained and launched.

Do not introduce merely because packaging code is adjacent:

- production deployment, DNS, VPS or permanent-hosting mutation;
- live-value qualification or unattended Hive writes;
- Hive account-creation authority;
- Fourth Street customer-specific work;
- independent Astra qualification;
- a React/Vue/SPA rewrite;
- broad cleanup or renaming solely for aesthetics.

Packaging may add local installer/runtime/update consequences, but those must remain separate from host Release, Hive consequence state, and future deployment state.

## Successor rule

Before changing product code, a successor should be able to answer:

```text
WHAT IS HIVENUES?
→ A premium, host-first frontend factory for Hive.

WHAT IS THE NORTH STAR?
→ The host’s world becomes the interface to Hive.

WHERE ARE WE?
→ Eras 0–4 are complete/frozen; #301 normalization is complete; Era 5 Product Distribution is next under #323.

WHAT MUST NOT BE LOST?
→ The governing doctrine plus all completed-era acceptance contracts.

WHAT DECIDES THE NEXT PRODUCT PHASE?
→ The canonical big-picture roadmap, verified against repository evidence—not whichever code was edited most recently.
```

> **Do not let implementation adjacency decide product sequence. Let doctrine define the destination, let the roadmap define the journey, and let evidence decide when a gate is actually closed.**
