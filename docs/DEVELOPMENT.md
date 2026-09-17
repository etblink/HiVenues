# HiVenues — Development Workflow

This is the ordinary contributor path for the current HiVenues product. Historical milestone workflows remain in the repository only where they still preserve compatibility or evidence.

## Requirements

Use the Node/npm versions admitted by `package.json` and CI.

Install dependencies with:

```bash
npm ci --ignore-scripts --no-fund
```

## Run the current product

```bash
npm run dev
```

This launches the canonical local Studio development path on `127.0.0.1:4173` and uses `data/hivenues-dev-state.json` by default.

The local launcher is intentionally bounded:

- loopback only;
- durable local file-backed state;
- no Hive writes or signing;
- no provider mutation;
- no payments/value movement;
- no deployment, DNS, VPS, or permanent hosting effects.

To use a different state path or port:

```bash
node scripts/hivenues-studio.js --state ./data/experiment.json --port 4317
```

For a clean synthetic development state, use a new path. To resume, reuse the same path.

### Legacy runtime

The pre-promotion runtime remains available explicitly while #301 classifies compatibility dependencies:

```bash
npm run legacy:dev
npm run legacy:start
```

Do not add new ordinary product work there unless a current requirement explicitly belongs to a preserved compatibility/shared-infrastructure path.

## Focused tests first

Use the narrowest existing test file that protects the behavior being changed. Node's built-in test runner is the repository convention:

```bash
node --test --test-concurrency=1 test/product-entrypoint.test.js
```

Replace the filename with the relevant focused test. Avoid adding milestone-specific test commands when an ordinary product-level test file is sufficient.

After focused tests, run the full required quality gate:

```bash
npm run check
```

`npm run check` currently includes secrets checks, preserved turnkey-wiring compatibility checks, lint, build, the full deterministic test suite, and the production dependency audit wrapper.

A green check proves protected technical contracts. It does **not** by itself prove professional visual/product quality when the change affects the Studio or generated host experience.

## When browser/visual evidence is required

Use browser/native-width/visual evidence when a change materially affects any of the following:

- Studio interaction or layout;
- Direction/composition output;
- responsive/mobile behavior;
- route navigation or Preview/Live context;
- real-media treatment;
- accessibility-visible UI;
- degraded/error/empty states;
- a product-quality acceptance claim that cannot be established by unit/integration tests alone.

Do not require screenshot campaigns for documentation-only, narrowly internal, or nonvisual refactors unless they touch a previously qualified visual contract.

Prefer reusable browser qualification over one-off milestone harnesses.

## Branch and pull-request loop

Use an ordinary short-lived branch from current `main`:

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
→ delete branch
```

Rules:

- do not perform feature work directly on `main`;
- keep a branch scoped to one coherent issue/objective;
- do not bundle unrelated cleanup merely because nearby files are old;
- use existing architecture before inventing a subsystem;
- surface conflicts with doctrine/roadmap rather than silently narrowing them;
- preserve exact evidence for consequential or qualification-sensitive changes;
- do not use implementation adjacency as a reason to begin a later roadmap phase.

## CI

The ordinary CI workflow runs on push/PR and currently verifies the deterministic repository gate on supported Windows and Ubuntu environments plus production dependency audits. The optional live Hive smoke remains separately controlled and must not be converted into a write path.

A PR should not be treated as qualified merely because one local platform passes.

## Main-branch safeguards

Where repository administration permissions allow it, `main` should use ordinary GitHub protections rather than custom governance code. Recommended settings:

- require pull requests before merge;
- require the repository's ordinary CI checks to pass;
- require the branch to be up to date before merge when GitHub's merge queue/protection model makes that practical;
- block force pushes and branch deletion;
- avoid direct feature pushes to `main`;
- use review requirements appropriate to the number of active maintainers without creating fake process overhead;
- keep administrator bypass limited to genuine recovery situations.

If the installed GitHub integration cannot inspect or change these settings, treat this section as the explicit recommended repository configuration rather than trying to encode branch protection inside application code.

## Release and version policy

`package.json` version is a **product release version**, not a merge counter.

Do not increment it for every PR. Change the product version when intentionally producing a distributable/releaseable HiVenues build whose scope and provenance are recorded.

Until the distribution era is opened, normal development merges may advance `main` without claiming that a new end-user installer/product release exists.

When versioned product releases begin, preserve:

- exact source commit/tree provenance;
- CI/qualification state;
- checksums for distributed artifacts;
- compatibility/migration notes when durable state format changes;
- separation between Studio application version, deployed runtime version, and host Release/content version.

A host content Release is never implied by a repository/package release.

## Source-placement rules

Before choosing a location for new code, consult `docs/CURRENT_ARCHITECTURE.md`.

In brief:

- `src/product/` is the canonical ordinary product boundary;
- `src/candidate-c/` is the current qualified implementation but a transitional namespace during #301;
- shared infrastructure belongs behind product-owned seams;
- legacy/compatibility code is not the default extension point;
- qualification tooling should remain separate from product semantics;
- provider-specific identifiers and state must not become canonical HostGraph identity.

Do not create a Candidate D, a second HostGraph, a provider-specific product model, or a client-side durable host mirror.

## Current authorization boundary

While #301 remains active, development is repository/product-core normalization only. Era 4 is held.

Not authorized by this workflow:

- signing or Hive broadcast;
- follow/unfollow, subscribe/unsubscribe, post/reply/vote writes;
- value movement/payments;
- production deployment or DNS/VPS mutation;
- customer-specific Fourth Street work;
- independent Astra;
- a framework rewrite.

The next product phase opens only after #301's exit condition and repo-health review are satisfied.
