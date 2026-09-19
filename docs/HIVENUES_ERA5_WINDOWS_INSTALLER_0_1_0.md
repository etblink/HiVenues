# HiVenues Era 5 — Windows Installer Decision 0.1.0

Status: **FROZEN CANDIDATE — Tranche-3 clean-machine qualification pending**

Governing issue: #323

## Purpose

Tranche 3 layers an ordinary Windows installation lifecycle over the frozen Tranche-2 reproducible Windows x64 distributable without changing the canonical HiVenues product architecture.

The selected candidate is a **per-user NSIS EXE installer** around the already-qualified bundle:

```text
HiVenues-Studio-<package-version>-windows-x64-setup.exe
```

The installer remains subordinate to the frozen Era-5 runtime/distributable decisions:

```text
thin native launcher
→ private pinned Node 24 runtime
→ ordinary packaged HiVenues app tree
→ loopback-only server
→ system browser
→ application-owned durable user data
```

This document freezes the candidate installer/lifecycle contract. Acceptance still requires exact-head GitHub Actions evidence from the fresh-Windows qualification workflow.

## Installer technology decision

Use **NSIS 3.12.x**, pinned in CI to the currently approved Chocolatey package version `3.12.0`.

Why this is the preferred Tranche-3 installer seam:

- it can package the frozen Tranche-2 bundle without introducing a new desktop/runtime framework;
- it supports an ordinary Windows EXE install/uninstall experience;
- it can install per-user without elevation;
- it supports Start-menu and Add/Remove Programs integration;
- its build can be driven from exact source and emit independent provenance/checksum sidecars;
- it does not require changing the server-owned EJS/HTMX/bounded-JS application architecture;
- it leaves room for a future Store channel or other packaging technology without changing the canonical local runtime/data model.

NSIS is an installer implementation choice, not a HiVenues domain dependency.

## Per-user installation contract

Default program location:

```text
%LOCALAPPDATA%\Programs\HiVenues Studio
```

Durable user-owned application data remains separate:

```text
%LOCALAPPDATA%\HiVenues Studio
  workspace\state.json
  media\
  diagnostics\
  runtime.lock
```

The installer therefore requires no administrator elevation for the ordinary supported path.

The installer creates:

- the installed native `HiVenues Studio.exe` launcher;
- the private `runtime\node.exe`;
- the packaged `app\` tree;
- embedded build provenance;
- a per-user Start-menu shortcut;
- a per-user Add/Remove Programs registration;
- a normal uninstaller.

## Update / repair semantics

An install over an existing installation may replace the application/runtime program tree, but it must not move, rewrite, publish, or delete the durable user workspace/media/history merely because application files are refreshed.

The Tranche-3 proof treats same-version reinstall as the bounded **repair/update-style replacement-install semantic**:

```text
replace app/runtime files
≠ replace user workspace
≠ publish a host
≠ deploy a host
≠ perform Hive/value consequences
```

A future network-delivered auto-updater is not selected by this decision and is not required to prove the current installer/data-preservation boundary.

## Uninstall semantics

Ordinary uninstall removes HiVenues program material owned by the installation:

- app tree;
- private runtime;
- launcher;
- uninstaller;
- Start-menu shortcut;
- Add/Remove Programs registration;
- HiVenues installation-location/version registration.

Ordinary uninstall **does not delete**:

```text
%LOCALAPPDATA%\HiVenues Studio
```

including the user workspace, imported media, Release History, and diagnostics/support material.

This is deliberate. Application removal must not silently destroy user-created work.

A future explicit "remove my data too" workflow, if ever admitted, would be a separate reviewed consequence rather than an implicit uninstall side effect.

## Installer provenance contract

The build emits:

```text
HiVenues-Studio-<version>-windows-x64-setup.exe
HiVenues-Studio-<version>-windows-x64-setup.sha256
HiVenues-Studio-<version>-windows-x64-setup.provenance.json
```

The installer provenance binds at least:

- exact source SHA;
- exact source tree;
- package version;
- pinned Node version;
- package-manager identity;
- NSIS technology/version;
- install scope;
- default program path;
- durable data path;
- installer SHA-256 and byte length;
- explicit signing state.

The installer checksum/provenance are independently verified before qualification starts.

## Fresh-Windows qualification boundary

The clean-machine job intentionally starts on a fresh `windows-latest` runner **without checking out the repository and without setting up Node**.

It receives only the installer qualification artifact produced by the preceding build job.

Before launching HiVenues it removes developer Node from `PATH` and verifies that no `node` executable is available through that sanitized launch environment. The installed adjacent private `runtime\node.exe` must therefore carry the product.

The qualification scenario must exercise:

```text
install
→ launch installed app
→ open Studio over loopback
→ create a synthetic host
→ edit Working state
→ explicit Release
→ verify released host
→ graceful close
→ verify local scenario consequence evidence
→ repair/update-style reinstall
→ relaunch and verify preserved host
→ uninstall
→ verify program integration removed
→ verify durable user data retained exactly
→ reinstall
→ relaunch
→ verify same released host returns
```

The job also verifies:

- installer SHA-256/provenance consistency;
- per-user install location;
- Start-menu registration;
- Add/Remove Programs registration;
- presence of the private runtime;
- absence of a developer Node dependency;
- exact durable state SHA-256 preservation across repair-style reinstall, uninstall, and reinstall.

## External-effect interpretation

The clean-machine scenario intentionally exercises only local authoring and local Release behavior.

Shutdown diagnostics are used to demonstrate that **this scenario** caused no unintended:

- Hive write;
- provider write;
- payment/value operation;
- signing attempt;
- production deployment.

Zero counters in this qualification are **scenario evidence, not a permanent HiVenues invariant**.

Intentional future Hive, value, deployment, and provider workflows are expected to produce external effects when the user explicitly invokes the admitted consequence.

## Windows signing / trust strategy

The Tranche-3 qualification installer remains explicitly **unsigned** so installer mechanics can be qualified before external signing enrollment is available.

Era-5 exit requires an accepted production signing/reputation path.

The selected trust architecture is:

```text
exact public source SHA/tree
→ reproducible unsigned build boundary
→ qualification / promotion of exact unsigned hash
→ Authenticode signing under the maintainer's verified individual publisher identity
→ trusted timestamp
→ signed-artifact SHA-256 + provenance
→ first-party release
```

### Publisher identity

The intended Windows publisher is the project's maintainer under a **verified individual identity**. A company/DBA identity is not required for the current HiVenues release model.

### Signing provider

The current reference path is **Microsoft Azure Artifact Signing / Public Trust** or a successor Microsoft-supported equivalent that:

- produces publicly trusted Authenticode signatures;
- keeps private signing key material out of the HiVenues repository and distributable;
- permits tightly scoped CI/release authorization;
- supports SHA-256 Authenticode and trusted timestamping.

Enrollment/account creation and any paid external service activation are owner-side operational prerequisites and are not performed by this Tranche-3 PR.

### Release authority

Production signing is a release consequence, not ordinary PR CI.

The intended production pipeline must:

- keep pull-request qualification unsigned;
- sign only an exact promoted source/artifact identity;
- protect release-signing authority separately from ordinary build permissions;
- prefer short-lived/federated workload identity rather than a reusable signing secret;
- record the unsigned pre-signing artifact hash and the final signed artifact hash separately.

Signing legitimately changes executable bytes. Reproducibility is therefore preserved at the unsigned build boundary rather than falsely requiring independently timestamped signed binaries to be byte-for-byte identical.

### Reputation

A valid publicly trusted Authenticode signature establishes publisher identity and tamper evidence but does not deterministically guarantee immediate SmartScreen reputation for a new publisher.

Era-5 acceptance therefore requires a truthful reputation strategy, not an impossible guarantee that a brand-new download can never display a reputation warning.

The accepted strategy is:

- stable verified individual publisher identity;
- publicly trusted Authenticode signing;
- trusted timestamping;
- first-party release/provenance/checksums;
- stable release continuity so reputation can accumulate;
- no claim that SmartScreen reputation is equivalent to cryptographic signature validity.

Microsoft Store distribution may later be added as an additional high-trust discovery/distribution channel. It is not required for this Tranche and does not justify an MSIX or application-architecture rewrite by itself.

## Held scope

This Tranche does not authorize:

- broad public release;
- production signing before the release-authority controls and external enrollment exist;
- automatic network update transport;
- production hosting/deployment/DNS/VPS mutation;
- Hive account-creation authority;
- new value/commerce classes;
- Fourth Street customer work;
- independent Astra;
- a SPA/desktop-framework rewrite.

## Acceptance rule

This candidate decision becomes an **accepted Tranche-3 installer boundary** only after the exact PR head passes:

1. ordinary repository CI required for the changed implementation;
2. the fresh-Windows `Era 5 clean-machine installer` workflow;
3. any other exact-head product/runtime qualification triggered by the PR.

The accepted evidence must identify the exact source SHA/tree and preserve the generated clean-machine evidence artifact.

Until that proof is green, this document freezes the intended contract but does **not** claim Tranche 3 complete.
