# HiVenues Era 7 Stage 5C — Lifecycle clarity

**Issue:** #396  
**Parent usability gate:** #374

## Purpose

Stage 5C translates the already-proven deployment machinery into an ordinary operator lifecycle without weakening any exact internal state or safety boundary.

The product must make this sequence legible:

```text
Working changes
→ Website Release
→ Put Release online
→ Connect domain
→ Verify public site
```

## Terminology contract

### Working

Working is what the operator is editing now.

Saving Working changes never:

- creates a Website Release;
- updates an external deployment;
- changes DNS or TLS;
- mutates a provider.

### Website Release

A Website Release is an immutable approved website snapshot inside HiVenues.

Creating a Website Release:

- freezes the exact approved website version;
- does not by itself update an external server;
- does not change a domain, DNS, TLS or provider state.

The UI therefore uses **Latest Website Release**, not **Currently Live**, for this state.

### Put online

Deployment places an exact Website Release on a server.

A deployment review must describe the lifecycle that will actually execute:

- first-server setup language only for an initial bootstrap;
- update language for an already-established restricted deployment;
- runtime-maintenance language when content is unchanged and only the qualified runtime changes.

Raw consequence identifiers, hashes and provenance remain available under technical disclosure.

### Public site

The public site is not considered confirmed merely because a Website Release exists or a server update returned successfully.

Public confirmation remains:

```text
exact Release deployment
→ domain/DNS state
→ TLS verification
→ public exact runtime/Release read-back
```

Only that proof justifies **Public site is online and verified**.

## Progressive disclosure

Ordinary status appears before:

- deployment IDs;
- internal deployment-state names;
- package/release digests;
- Git source SHA/tree;
- runtime bundle digest;
- raw consequence identifiers.

Those details are preserved and inspectable under **Technical deployment details** / **Exact technical details**.

## Ordinary deployment status

Each real deployment gets one human-readable status and one next-step explanation.

Examples:

- **Server verified and ready**
- **Website Release is on the server**
- **Website is deployed; public verification is not complete**
- **Public site is online and verified**
- **Deployment needs attention**
- **Public site preserved; Studio management is disconnected**
- **Reconnecting Studio management**

The internal state machine remains unchanged.

## Release feedback

After creating a Website Release, Studio must say that:

- the latest Website Release changed;
- an external deployment did not change automatically;
- putting the Release online remains a separate Deployment step.

Urgent updates obey the same rule: they create a new immutable Website Release and do not silently update an external deployment.

## Preservation requirements

Stage 5C does not change:

- HostGraph or Release semantics;
- exact deployment packages;
- deployment state transitions;
- authority separation;
- fail-closed recovery;
- DNS/TLS/public-read-back proof;
- rollback semantics;
- non-custodial Hive authority;
- restart persistence.

## Acceptance

Repository qualification must pass the normal seven workflows and independent review.

Final Stage-5 usability acceptance is by the project owner under #374. A separate fresh-human trial is not required.
