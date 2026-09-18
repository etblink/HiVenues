# HiVenues Era 5 — Windows Distributable 0.1.0

Status: **CANDIDATE — freezes after exact-head reproducibility and extracted-artifact qualification are green**

Governing issue: #323

## Purpose

Tranche 2 turns the accepted Windows installed-runtime architecture into a concrete first-party distributable artifact without prematurely choosing MSI versus MSIX.

The candidate artifact is:

```text
HiVenues-Studio-<package-version>-windows-x64.zip
```

It contains one top-level versioned directory with:

```text
HiVenues Studio.exe
runtime/node.exe
app/
build-provenance.json
```

The app tree contains only the current pruned HiVenues product/shared-core source, EJS views, rendered browser assets, the installed runtime entry, locked production dependencies, and package manifests.

## Artifact contract

The Windows x64 ZIP must:

1. include the qualified native launcher;
2. include the private pinned Node 24 runtime;
3. require no separately installed Node/npm/developer stack;
4. preserve the application-owned data model below the per-user application-data root;
5. bind exact source commit, source tree, Node version, package version, platform, architecture, and package manager in embedded build provenance;
6. publish an external SHA-256 sidecar;
7. publish a machine-readable distributable provenance sidecar;
8. be byte-for-byte reproducible across two independent builds in the same exact-source Windows CI job;
9. extract successfully with ordinary Windows ZIP tooling;
10. pass the existing installed-runtime/launcher qualification from the extracted archive.

## Reproducibility controls

The native launcher is linked as a reproducible PE. The ZIP writer is owned by HiVenues and normalizes:

- file ordering;
- path separators;
- ZIP timestamps;
- header metadata;
- compression settings.

Source filesystem mtimes therefore do not enter the archive identity.

The workflow builds the native launcher, private runtime/app bundle, and final ZIP twice. It rejects the candidate if either launcher SHA-256 or archive SHA-256 differs.

## Naming and checksum surfaces

For package version `1.0.0`, the expected files are:

```text
HiVenues-Studio-1.0.0-windows-x64.zip
HiVenues-Studio-1.0.0-windows-x64.sha256
HiVenues-Studio-1.0.0-windows-x64.provenance.json
```

The version is sourced from the packaged application manifest rather than duplicated in workflow configuration.

## Signing status

This Tranche-2 qualification artifact is intentionally **unsigned**. It is not a broad-release artifact and must not be presented as one.

Era-5 exit still requires an accepted Windows signing/reputation strategy and an ordinary installer/update/uninstall path. Signing may legitimately change final executable/archive bytes; signed release reproducibility will therefore be handled as a provenance/signing pipeline boundary rather than pretending a post-signature artifact can preserve the unsigned build hash.

## Held decisions

This artifact does not yet select:

- MSI versus MSIX versus another ordinary Windows installer;
- update transport/policy;
- uninstall UI/registration details;
- production signing provider;
- Microsoft Store distribution.

Those decisions must be layered on top of this qualified distributable without moving workspace/media into the installation tree or changing the server-owned product architecture.

## Freeze rule

Promote this document to **FROZEN** only after the exact PR head passes:

- normal Windows/Ubuntu CI;
- Product Browser where triggered;
- Era-5 runtime proof;
- Era-5 Windows distributable double-build reproducibility;
- extracted-artifact installed-runtime qualification.
