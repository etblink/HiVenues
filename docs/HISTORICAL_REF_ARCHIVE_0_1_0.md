# Historical Ref Archive 0.1.0

## Status

This record defines the first bounded migration of historical divergent branch refs out of the active Hive-Venues branch namespace and into annotated archive tags.

This operation preserves commit reachability and provenance. It does **not** merge, reinterpret, revive, or canonize any archived branch content.

Canonical baseline at archive-candidate construction:

```text
main = 40652f8e616826d139a75f5ceac3a60f6b703d0c
```

The four `continuity/*` refs are explicitly out of scope and remain branches pending a separate milestone-ref decision.

## Archive policy

For every branch in the table below:

1. the remote branch tip must equal the exact recorded SHA;
2. the archive tag name must either be absent or already resolve to that exact commit;
3. the migration must create an **annotated** tag when absent;
4. every archive tag must be re-fetched and verified before any branch deletion begins;
5. only after all fourteen archive tags verify may the corresponding branch refs be deleted;
6. canonical `main` content is not derived from any archived branch;
7. deleting a branch ref does not delete the commit history because the archive tag remains a ref to the exact tip.

Archive tag namespace:

```text
archive/branch/<original-branch-name>
```

These archive tags are immutable by project policy. Moving or deleting one requires a separately reviewed provenance operation.

## Divergent branch archive ledger

| Original branch | Exact tip | Archive tag | Classification | Evidence / disposition |
| --- | --- | --- | --- | --- |
| `automation/hive-venues-baseline-audit` | `8f07116ec357d51d03bfdf3c037570717a403c9c` | `archive/branch/automation/hive-venues-baseline-audit` | `SUCCESSOR_BASELINE_AUTOMATION_SCAFFOLD` | Noncanonical successor baseline/audit automation history; not part of canonical `main`. |
| `automation/hv1-venue-context-builder` | `f4830e82a129fe24f510597aecdcff087360707f` | `archive/branch/automation/hv1-venue-context-builder` | `SUCCESSOR_HV1_BUILDER_SCAFFOLD` | Noncanonical HV-1 builder/repair construction history; accepted HV-1 was reconstructed and integrated separately. |
| `automation/post-hv2-routing-reconciliation-builder` | `a7d654bb4609a97abea1de25e87209982ec47f28` | `archive/branch/automation/post-hv2-routing-reconciliation-builder` | `SUCCESSOR_NONCANONICAL_BUILDER` | Hive-Venues PR #10 explicitly records this seven-commit branch as noncanonical construction history that must not be merged directly. |
| `codex/c2-g1c-r5-4-import-diagnostic` | `166dd220b18e096d82e81833172a04b99f72e76d` | `archive/branch/codex/c2-g1c-r5-4-import-diagnostic` | `IMPORTED_HIVE_BAR_HISTORICAL_BRANCH` | Exact branch and tip remain in `etblink/Hive-Bar`; duplicate active branch in successor is not required for custody. |
| `codex/m18-4-beta-readiness-closure` | `dff288723a8e69e728c50d30aaa36aa5d101464a` | `archive/branch/codex/m18-4-beta-readiness-closure` | `IMPORTED_HIVE_BAR_HISTORICAL_BRANCH` | Exact branch and tip remain in `etblink/Hive-Bar`; duplicate active branch in successor is not required for custody. |
| `codex/m2-live-smoke-validation` | `3bf8fad3ec46b1b00ebbfc3cd6070010f252ffd8` | `archive/branch/codex/m2-live-smoke-validation` | `IMPORTED_HIVE_BAR_HISTORICAL_BRANCH` | Exact branch and tip remain in `etblink/Hive-Bar`; duplicate active branch in successor is not required for custody. |
| `codex/m2-read-only-slice` | `9085e9d00d73f61e0ea0b450832f28ac782ef36d` | `archive/branch/codex/m2-read-only-slice` | `IMPORTED_HIVE_BAR_HISTORICAL_BRANCH` | Exact branch and tip remain in `etblink/Hive-Bar`; duplicate active branch in successor is not required for custody. |
| `maintenance/ci-graph-rationalization` | `3f0c4c551817ecdecc26b3e29fd23ae42f9ad987` | `archive/branch/maintenance/ci-graph-rationalization` | `REJECTED_SUCCESSOR_CANDIDATE` | Hive-Venues PR #11 records deterministic rejection; superseded by the clean accepted v2 candidate. |
| `parseMarkdown` | `12aaaad684141ea77eae5a7a7170719742f1d84e` | `archive/branch/parseMarkdown` | `IMPORTED_HIVE_BAR_HISTORICAL_BRANCH` | Exact branch and tip remain in `etblink/Hive-Bar`; duplicate active branch in successor is not required for custody. |
| `platform/hv2-acceptance-reconciliation` | `d6b61e0531d52ad09d90cb4772ea214c260239fc` | `archive/branch/platform/hv2-acceptance-reconciliation` | `REJECTED_SUCCESSOR_CANDIDATE` | Hive-Venues PR #6 records rejection for a stale lifecycle consumer and supersession by a clean rebuild. |
| `platform/hv2-acceptance-reconciliation-v2` | `afe7a09f2239b7d6d75d85c3163a81d85eb5ecb1` | `archive/branch/platform/hv2-acceptance-reconciliation-v2` | `REJECTED_SUCCESSOR_CANDIDATE` | Hive-Venues PR #7 records rejection for stale lifecycle test expectations and supersession by v3. |
| `platform/hv2-reference-deployment-profile` | `8ea27a878872befb9e719f82ae05337c7bb8b2e8` | `archive/branch/platform/hv2-reference-deployment-profile` | `SUPERSEDED_EXPLORATORY_SUCCESSOR_CANDIDATE` | Hive-Venues PR #3 records exploratory status and supersession by the clean accepted HV-2 implementation. |
| `platform/hv3-reference-venue-package` | `1c9a1522096ddea38ee99b89a92d883eafb52d6f` | `archive/branch/platform/hv3-reference-venue-package` | `REJECTED_SUCCESSOR_CANDIDATE` | Hive-Venues PR #13 records rejection of two erroneous new test expectations; clean v2 was rebuilt and accepted separately. |
| `qualification/hv2-coverage-compare` | `5fe94d07d89a7f60a0937e0fa5ef57a564808c72` | `archive/branch/qualification/hv2-coverage-compare` | `DISPOSABLE_SUCCESSOR_QUALIFICATION` | Hive-Venues PR #5 explicitly records this as a disposable noncanonical coverage-comparison surface that must not be merged. |

## Non-divergent maintenance scaffolding

The archive execution may also delete the following **without** creating archive tags because their tips are already canonical-history commits:

- `maintenance/remove-one-shot-ref-hygiene` — expected tip `40652f8e616826d139a75f5ceac3a60f6b703d0c`;
- the archive candidate branch itself, but only after its exact tip is canonical `main`.

These deletions do not remove unique commit reachability.

## Explicit non-effects

This operation does not:

- alter Hive transaction semantics;
- alter authentication, onboarding, payment, storage, venue, deployment, or runtime behavior;
- merge any historical branch;
- alter the original `etblink/Hive-Bar` repository;
- alter `continuity/*` refs;
- select Kubo, Helia, OrbitDB, IPFS, or any other architecture lane.

## Postcondition

If the operation succeeds exactly as specified, the active Hive-Venues branch namespace should contain only:

```text
main
continuity/v0.4.1-handoff-freeze
continuity/v0.5.0-c2-b-closure-freeze
continuity/v0.5.0-c2-b-closure-freeze-check
continuity/v0.5.0-c2-b-closure-freeze-final
```

plus no temporary archive-execution branch.
