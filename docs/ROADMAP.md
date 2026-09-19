# HiVenues — Current Program Marker

This file is the **current-state bridge** into the frozen strategic roadmap. It is intentionally short.

The canonical strategic sequence is defined by:

- `docs/HIVENUES_BIG_PICTURE_ROADMAP_0_1_0.md`

The product destination and constraints are defined by the frozen doctrine set referenced from that roadmap. Historical program plans remain available in Git history and historical documents, but they do not override this marker when they describe older PM/HV/Candidate states.

## Verified current state

Era 4 remains frozen. Era 5 Tranches 0–3 established the Windows installed-runtime, reproducible distributable, ordinary per-user installer, and clean-machine lifecycle boundary. Era 6 Hive Account Onboarding is now complete and qualified while the paid external Era-5 Public Trust gate remains intentionally parked:

```text
CANONICAL_MAIN = a7495dcf4290dddf9eb2d559acfaa58f40b65ba6
ERA6_STAGE2_QUALIFIED_SOURCE = 604fd0d1a05c8b16697e8e65f967d97cd61cfd26
ERA6_STAGE3_QUALIFIED_SOURCE = 62e62e13367a681eb67604f12ab9ba8060cdfc6f

TRANCHE_3_QUALIFIED_SOURCE = fb61afbafb7bf038481b17b9bb9e716fa568c101
TRANCHE_3_PR_HEAD_CI = #1383 / PASS
TRANCHE_3_PR_HEAD_PRODUCT_BROWSER = #101 / PASS
TRANCHE_3_PR_HEAD_RUNTIME_PROOF = #21 / PASS
TRANCHE_3_PR_HEAD_WINDOWS_DISTRIBUTABLE = #7 / PASS
TRANCHE_3_PR_HEAD_CLEAN_MACHINE_INSTALLER = #5 / PASS

ERA 0 — RELIABLE CANDIDATE SUBSTRATE          COMPLETE / PRESERVE
ERA 1 — TERRITORY ARCHITECTURE               COMPLETE / PRESERVE
ERA 2 — COMPLETE TERRITORY AUTHORING          COMPLETE / FROZEN
ERA 3 — HOST-NATIVE SOCIAL & COMMUNITY        COMPLETE / FROZEN
ERA 4 — REAL HIVE-BACKED PARTICIPATION        COMPLETE / FROZEN

#301 — REPOSITORY_AND_PRODUCT_CORE_NORMALIZATION   COMPLETE
CURRENT PRODUCT-BUILDING STATE = ERA 6 — HIVE ACCOUNT ONBOARDING COMPLETE / QUALIFIED
ERA 5 TRANCHE 0 = COMPLETE / FROZEN
ERA 5 TRANCHE 1 = COMPLETE / QUALIFIED
ERA 5 TRANCHE 2 = COMPLETE / FROZEN
ERA 5 TRANCHE 3 = COMPLETE / FROZEN
ERA 5 SIGNING REPOSITORY BOUNDARY = COMPLETE / QUALIFIED
ERA 5 PAID PUBLIC-TRUST ENROLLMENT = DEFERRED UNTIL EXTERNAL-RELEASE READINESS
ERA 6 ACCOUNT ONBOARDING = COMPLETE / QUALIFIED
NEXT PRODUCT-BUILDING BOUNDARY = ERA 7 — DEPLOYMENT PRODUCT
ACTIVE ERA-5 CHARTER = #323 / FINAL TRUST GATE OPEN
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
6. the historical Candidate-C active namespace normalized away, with Git history retained as the archive;
7. ordinary CI green on Windows and Ubuntu plus production dependency audits;
8. exact recommended main-branch safeguards documented where the available integration cannot administer GitHub branch protection;
9. a fresh exit audit confirming all 12 #301 repository questions can be answered from the repository without project archaeology.

Remaining historical names, branches, scripts, or documents may be cleaned when concrete dependency evidence and maintenance value justify it. They do not independently reopen normalization.

## Completed Era 6 / parked Era-5 trust gate

Era 6 — **Hive Account Onboarding**, governed by **#336**, is complete and qualified.

The accepted product path now supports:

- useful accountless browsing and Studio authoring;
- an explicit Connect existing / Create account / Not now decision surface;
- public account review before wallet ceremony;
- fresh Posting-authority identity proof with canonical authority verification;
- bounded local identity sessions that are not operation authority;
- provider-neutral external account creation through the official Hive signup directory;
- a resumable local handoff that stores no account name, provider choice, password, key, or recovery secret;
- return from external creation into the same public-review → wallet-verification path;
- desktop and mobile browser qualification;
- no HiVenues-sponsored account creation, secret custody, production deployment, or unintended Hive write.

Era 5 — **Product Distribution**, governed by **#323**, remains open only at its intentionally parked external Public Trust signing gate.

The frozen roadmap exit gate is:

> **On a clean supported machine, an ordinary user can install and launch HiVenues without Git, npm, Docker, a shell, manual environment configuration or repository knowledge.**

The first practical target is Windows. Distribution may package the existing loopback server architecture; it does not justify a SPA rewrite.

Tranche 0 froze the private-Node/app-tree/system-browser architecture. Tranche 1 productized the installed runtime and qualified the native Windows launcher. Tranche 2 supplies a versioned Windows x64 ZIP from exact source with embedded provenance, SHA-256 sidecars, byte-for-byte double-build reproducibility, ordinary Windows extraction, and full installed-runtime/native-launcher qualification from the extracted artifact. Tranche 3 now adds a per-user NSIS installer and has proven the real clean-machine lifecycle: install without source/developer tooling, launch through the normal application entry, create/edit/Release a synthetic host, preserve state through repair-style reinstall, preserve user work through uninstall, and restore the released host after reinstall.

The repository-side **production signing / reputation boundary** is now complete and qualified. PR #334 proved exact unsigned promotion, manual-only protected signing authority, GitHub OIDC, immutable Azure action pins, rejection of unsigned artifacts at the signed finalizer, and preserved clean-machine lifecycle behavior.

The remaining Era-5 trust gate requires external paid infrastructure and verified publisher enrollment:

- Azure Pay-As-You-Go billing;
- Microsoft Artifact Signing Basic account;
- individual Public Trust identity validation;
- Public Trust certificate profile;
- least-privilege GitHub OIDC workload identity;
- first real Authenticode-signed and time-stamped installer;
- signed clean-machine qualification.

The project owner has intentionally **deferred that paid external enrollment until HiVenues is materially closer to external distribution**. This avoids carrying an idle signing subscription while preserving the complete repository-side architecture.

This remains an allowed roadmap interleave, not an Era-5 completion claim. Era 5 stays open at its final external trust gate while the next product-building boundary advances to **Era 7 — Deployment Product**. The deferred signing gate must still be resumed before broad external release.

Production hosting/deployment, unrelated new commerce classes, Fourth Street customer work, independent Astra, and broad release remain held unless their roadmap boundary is explicitly opened.

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

### Future deployment reference

For future **Era 7 — Deployment Product** work, **Privex is the current preferred/reference VPS provider** because of its fit with the Hive ecosystem and interoperability. This is a current operational preference, not a product-model dependency: the deployment architecture must remain provider-neutral and preserve room for other adapters.

## Current hard boundary

Preserve all accepted Era-0–6 behavior. Until a dedicated Era-7 charter explicitly opens deployment work, do not infer production authority merely because deployment is next in the roadmap.

Do not introduce merely because adjacent code makes it convenient:

- production deployment, DNS, VPS or permanent-hosting mutation;
- live-value qualification or unattended Hive writes;
- Hive account-creation authority;
- Fourth Street customer-specific work;
- independent Astra qualification;
- a React/Vue/SPA rewrite;
- broad cleanup or renaming solely for aesthetics.

Local installer/runtime/update consequences, Hive identity, host Release, and future deployment consequences must remain separate authority boundaries.

## Successor rule

Before changing product code, a successor should be able to answer:

```text
WHAT IS HIVENUES?
→ A premium, host-first frontend factory for Hive.

WHAT IS THE NORTH STAR?
→ The host’s world becomes the interface to Hive.

WHERE ARE WE?
→ Eras 0–4 are complete/frozen; #301 normalization is complete; Era 5 Tranches 0–3 plus the repository-side signing boundary are complete with paid Public Trust enrollment intentionally parked; Era 6 Hive Account Onboarding is complete/qualified; Era 7 Deployment Product is the next product-building boundary.

WHAT MUST NOT BE LOST?
→ The governing doctrine plus all completed-era acceptance contracts.

WHAT DECIDES THE NEXT PRODUCT PHASE?
→ The canonical big-picture roadmap, verified against repository evidence—not whichever code was edited most recently.
```

> **Do not let implementation adjacency decide product sequence. Let doctrine define the destination, let the roadmap define the journey, and let evidence decide when a gate is actually closed.**
