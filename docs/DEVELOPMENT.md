# HiVenues — Development Workflow

This is the ordinary contributor path for the current HiVenues product. Superseded development architectures are not supported compatibility surfaces.

## Requirements

Use the Node/npm versions admitted by `package.json` and CI.

```bash
npm ci --ignore-scripts --no-fund
```

## Run the current product

```bash
npm run dev
```

This launches the canonical local Studio path on `127.0.0.1:4173` with durable local state at `data/hivenues-dev-state.json` by default.

The launcher is intentionally bounded:

- loopback only;
- durable local file-backed state;
- no Hive writes or signing;
- no provider mutation;
- no payments/value movement;
- no deployment, DNS, VPS, or permanent hosting effects.

Custom local state or port:

```bash
node scripts/hivenues-studio.js --state ./data/experiment.json --port 4317
```

Use a new path for a clean synthetic state and reuse the same path to resume.

There is no supported `legacy` development runtime. If old code is still in the tree, it is either a currently reused primitive behind a current seam or maintenance/deletion debt.

## Focused tests first

Use the narrowest current product test that protects the behavior being changed. For example:

```bash
node --test --test-concurrency=1 test/product-entrypoint.test.js
```

Then run the full required gate:

```bash
npm run check
```

`npm run check` covers secrets scanning, lint, build, the repository test suite, and the production dependency audit wrapper. Historical compatibility gates are not part of the current product contract.

A green check protects technical contracts. It does not by itself prove professional visual/product quality when a change affects Studio or generated host experiences.

## Browser/visual evidence

Use browser/native-width/visual evidence when a change materially affects Studio interaction/layout, Direction output, responsive/mobile behavior, route/Preview/Live context, real-media treatment, accessibility-visible UI, degraded/error/empty states, or another acceptance claim that tests alone cannot establish.

Prefer reusable product-level qualification. Do not add milestone-specific harnesses when an ordinary current-product test can express the requirement.

## Branch and PR loop

```text
prioritized issue
→ short-lived branch
→ bounded implementation
→ focused tests
→ npm run check
→ visual/browser evidence when relevant
→ ordinary PR
→ required CI
→ review
→ merge
→ delete branch where tooling permits
```

Rules:

- no feature work directly on `main`;
- one coherent objective per branch;
- do not preserve superseded code merely because it is old or once qualified;
- reuse only primitives that satisfy a current requirement;
- delete stale tests/scripts/docs together with the obsolete behavior they protect;
- do not use implementation adjacency to begin a later roadmap phase;
- do not create broad cleanup work merely to erase historical names when no concrete risk or ambiguity exists.

## CI

Ordinary CI verifies the deterministic repository gate on Windows and Ubuntu plus production dependency audits. The optional live Hive smoke remains separately controlled and read-only.

A PR is not qualified merely because one platform passes.

## Main-branch safeguards

Recommended ordinary GitHub settings:

- require pull requests before merge;
- require ordinary CI checks;
- require up-to-date branches when practical;
- block force pushes and branch deletion;
- avoid direct feature pushes to `main`;
- use review requirements proportionate to the active maintainer count;
- reserve administrator bypass for genuine recovery;
- enable automatic head-branch deletion after merge when appropriate for this repository.

The #301 exit audit found that `main` is currently reported as unprotected and repository rulesets are empty. The installed GitHub integration cannot administer the branch-protection endpoint. That is an administrative recommendation, not application-code work and not a reason to invent custom governance machinery inside HiVenues.

## Release/version policy

`package.json` version is a product release version, not a merge counter.

Do not increment it for every PR. Change it only when intentionally producing a distributable HiVenues build whose scope and provenance are recorded.

Until distribution opens, merges may advance `main` without claiming an end-user release exists.

When releases begin, preserve exact source commit/tree provenance, CI/qualification state, artifact checksums, durable-state migration notes, and separation between Studio application version and host content Release version.

## Source placement

Consult `docs/CURRENT_ARCHITECTURE.md`.

- `src/product/` is the canonical ordinary product boundary and application composition root;
- `src/candidate-c/` contains current qualified Era-0–3 implementation internals carrying historical naming debt; new ordinary features should not deepen that naming by default;
- shared infrastructure belongs behind product-owned seams only when currently consumed;
- superseded development code has no compatibility status;
- qualification tooling stays only when it protects an enduring current contract;
- provider-specific identifiers/state must not become canonical HostGraph identity.

Do not create Candidate D, a second HostGraph, a provider-specific product model, or a client-side durable host mirror.

## Current authorization boundary

Repository/product-core normalization is complete. The next strategic objective is **Era 4 — Real Hive-Backed Participation**.

Do not begin Era-4 implementation merely because the roadmap points there. First open a bounded issue/charter that defines the exact consequence being admitted, authority/signing boundary, provider-neutral seam, degraded behavior, reconciliation/read-back semantics, focused tests, browser evidence where needed, and explicitly held scope.

Until such a charter authorizes a concrete slice, preserve zero external effects: no signing/Hive broadcast, social writes, value movement/payments, production deployment/DNS/VPS mutation, customer-specific Fourth Street work, independent Astra, or framework rewrite.
