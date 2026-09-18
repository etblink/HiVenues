# HiVenues Era 5 — Windows Packaging Decision 0.1.0

Status: **FROZEN — Tranche-0 Windows runtime proof accepted 2026-09-18**

Governing issue: #323

## Decision question

How should the existing server-owned HiVenues application become an ordinary Windows application without requiring Git, Node, npm, Docker, a shell, environment-file editing, or repository knowledge?

## Candidate decision

Use a **thin Windows launcher around a private packaged Node 24 runtime plus an ordinary packaged HiVenues application tree**, and open the system browser to the loopback Studio.

The installed shape is:

```text
HiVenues Studio launcher
        ↓
private Node 24 runtime
        ↓
packaged app tree
  src/
  views/
  public/
  production node_modules/
        ↓
127.0.0.1:<dynamic-port>
        ↓
system browser → /hivenues
```

Durable user work is not stored beside the executable. On Windows it belongs below:

```text
%LOCALAPPDATA%\HiVenues Studio\
  workspace\state.json
  media\
  diagnostics\
  runtime.lock
```

## Why this candidate leads

### Existing application compatibility

HiVenues is deliberately filesystem-oriented today:

- CommonJS modules load an ordinary dependency graph.
- EJS reads view files.
- Express serves browser assets from the packaged public tree.
- `htmx.org` is resolved from the production dependency tree.
- product modules already resolve views/assets from `__dirname`, not the current working directory.

A private Node runtime plus an ordinary app tree preserves those assumptions instead of replacing them with a packaging-specific virtual filesystem.

### Node SEA comparison

Node 24 SEA is technically viable, including embedded assets. But the injected SEA main script has a restricted, non-file-based `require()` unless the application is bundled into one script or explicitly bridges back to a filesystem `createRequire()`. HiVenues would therefore still need either:

1. a new bundling/asset abstraction for EJS/static/package dependencies; or
2. an external app tree beside the SEA executable.

Option 2 collapses back toward the private-runtime layout while adding SEA injection/build complexity. SEA remains useful evidence and may later be reconsidered for the thin launcher itself, but it is not the preferred container for the full HiVenues application.

### Browser loopback vs desktop shell

A dedicated Chromium/WebView shell is not justified for the first Windows distribution proof. HiVenues is already a loopback web application and Product Browser qualification covers that surface. Using the system browser:

- preserves the current EJS/HTMX/bounded-JS architecture;
- avoids shipping a second browser engine;
- avoids adding a desktop framework merely for chrome;
- keeps wallet/browser integration in its natural environment.

A bounded shell can be reconsidered only if an ordinary installed workflow cannot meet product requirements in the system browser.

## Tranche-0 proof requirements

The candidate does not freeze until CI proves on Windows that:

1. the build creates a private Node runtime and a production-only app tree;
2. the private runtime launches while the process current working directory is unrelated to the app;
3. Studio responds successfully on loopback using a dynamically selected port;
4. state and imported-media roots resolve below a test `LOCALAPPDATA`, not beside the executable;
5. the first launch creates durable state;
6. a second simultaneous launch is rejected by an application-data instance lock;
7. graceful shutdown releases the lock;
8. a relaunch opens the same state file with the same digest;
9. build provenance records exact source SHA/tree and Node version.

## Installer/signing boundary

Tranche 0 does **not** select final installer technology. MSI/MSIX/EXE packaging, update behavior, uninstall preservation, Start-menu registration, and Authenticode signing are Tranche 2 concerns after the runtime layout is proven.

For production-quality non-Store distribution, the Windows artifact must be signed using an accepted trusted signing path. Signing is necessary for publisher identity, but new binaries may still encounter SmartScreen reputation warnings. Microsoft Store distribution can remain a later distribution option and does not change the local runtime architecture.

## Held scope

This decision does not authorize:

- Hive account creation;
- production hosting/DNS/VPS automation;
- new value/commerce mechanics;
- Fourth Street customer work;
- a SPA rewrite;
- Electron or another desktop framework without new evidence.

## Accepted Tranche-0 proof

The candidate architecture was accepted after **Era 5 runtime proof #5** passed on Windows x64.

Exact proof input:

```text
SOURCE_SHA  = bdb2b95d97372dd81b47093ee9861d6bc2778d5c
SOURCE_TREE = c025174bd59eeddaf318757060032a761c40fa97
NODE        = v24.19.0
RUNTIME     = runtime/node.exe
APP         = app/
```

Observed installed-style qualification:

- private runtime bundle built successfully with production-only dependencies;
- launch succeeded from an unrelated current working directory;
- data root resolved beneath the supplied Windows `LOCALAPPDATA`;
- first Studio URL: `http://127.0.0.1:50137/hivenues`;
- simultaneous second launch was rejected by the application-data instance lock;
- graceful shutdown released the lock;
- relaunch succeeded on a newly selected loopback port: `http://127.0.0.1:50139/hivenues`;
- the state file persisted with the identical SHA-256 digest:
  `db5d2a6f0d4283261de8a8705b24b6eab03500d71f292988e38504fc5922c1f4`.

The selected architecture is therefore **FROZEN for Era 5 Tranche 1**:

> thin Windows launcher boundary + private Node runtime + ordinary packaged HiVenues app tree + system browser + application-owned user data.

This freeze does not select the final installer technology or signing provider. Those remain downstream Era-5 packaging decisions.
