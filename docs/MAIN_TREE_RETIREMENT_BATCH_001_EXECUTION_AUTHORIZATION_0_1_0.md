# Main-Tree Retirement Batch-001 Execution Authorization 0.1.0

## Status

```text
OPERATION = MAIN_TREE_RETIREMENT_BATCH_001_EXECUTION_AUTHORIZATION
STATUS = FROZEN_RETIREMENT_EXECUTION_AUTHORIZATION
REPOSITORY = etblink/Hive-Venues
RETIREMENT_ID = batch-20260830-001
AUTHORIZATION_VERSION = 0.1.0

GOVERNING_POLICY_VERSION = 0.1.1
GOVERNING_POLICY_PATH = docs/MAIN_TREE_HISTORICAL_ARTIFACT_RETIREMENT_POLICY_0_1_1.md
GOVERNING_POLICY_COMMIT = a6ca632bcaa57fc0ca05b9250a608f6a34d6b36b
GOVERNING_POLICY_TREE = d74ac006886d905947439ed71d763129c3952fb8

DOCKET_PATH = docs/MAIN_TREE_RETIREMENT_BATCH_001_DOCKET_0_1_0.md
DOCKET_FREEZE_COMMIT = 5753918b653e5ea4e860c29fd342252a934b40c3
DOCKET_FREEZE_TREE = fff9ab7827f66902bf2a3a6ea0273badd92805bf
DOCKET_BLOB_SHA = f3954d477a9448b14bfa6557921ac5e72606073c

CHECKPOINT_AUTHORIZATION_PATH = docs/MAIN_TREE_RETIREMENT_BATCH_001_CHECKPOINT_AUTHORIZATION_0_1_0.md
CHECKPOINT_AUTHORIZATION_COMMIT = 49dc1aadfb81c9d3e199c3dad1733794c46bb4a2
CHECKPOINT_AUTHORIZATION_TREE = 491c7f39d866059588d6d974081e1d37486da25f
CHECKPOINT_AUTHORIZATION_BLOB = 6ed21c5f89f0da9245a34d1d39aca0a14eba2c1b

VERIFIED_CHECKPOINT_TAG = archive/main-tree/batch-20260830-001
VERIFIED_TAG_OBJECT_SHA = e636c9f26d787c0db72db4ff833a07c340f49aa1
VERIFIED_TAG_OBJECT_TYPE = tag
VERIFIED_TAG_PEELED_COMMIT = 5753918b653e5ea4e860c29fd342252a934b40c3
VERIFIED_TAG_PEELED_TREE = fff9ab7827f66902bf2a3a6ea0273badd92805bf
TAG_VERIFICATION_WORKFLOW_RUN = 33344208582
TAG_VERIFICATION_WORKFLOW_JOB = 99345141655
INDEPENDENT_TAG_OBJECT_API_VERIFICATION = PASS

PRIVILEGED_TAG_WORKFLOW_TEARDOWN_COMMIT = 507ed568dc7718f536296b1d62260ad83157a568
PRIVILEGED_TAG_WORKFLOW_TEARDOWN_TREE = 491c7f39d866059588d6d974081e1d37486da25f
PRIVILEGED_TAG_WORKFLOW_PRESENT_ON_CANONICAL_MAIN = NO

FILE_DELETION_AUTHORIZED = YES__EXACT_SIX_PATHS_ONLY
DELETION_CANDIDATE_MAY_CHANGE_OTHER_PATHS = NO
M15_SPEC_DELETION_AUTHORIZED = NO
PRODUCTION_MUTATION = NO
```

## Decision

The Project Lead authorizes one bounded living-tree retirement candidate under Main-Tree Historical Artifact Retirement Policy 0.1.1.

The prerequisite custody chain is complete:

1. the exact-tree consumer audit found no current exact consumers or generic documentation-enumeration dependency for the six docketed C2 records;
2. the accepted docket classifies those six records `RETIREABLE_HISTORICAL` and requires no live-invariant migration;
3. the annotated checkpoint tag was created only after separate checkpoint authorization;
4. the remote tag was re-fetched and verified as a Git object of type `tag`, peeling to the exact accepted checkpoint commit/tree;
5. the tag annotation binds the retirement ID, checkpoint, docket path/blob, authorization record path, and immutability policy;
6. all six archived paths were verified at their docketed blob SHAs through the checkpoint;
7. the temporary `contents: write` workflow was then removed, qualified on Ubuntu, Windows, and the repository-selected visual suite, and is absent from canonical `main`.

No additional migration, navigation edit, machine-check edit, or product-code edit is required for Batch-001.

## Exact deletion scope

The deletion candidate is authorized to remove exactly these paths and no others:

```text
PATH = docs/C2_C_1_WALLET_PRODUCT_IDENTITY_SPATIAL_REDESIGN.md
ARCHIVED_BLOB_SHA = 2ea7578d2832e82601de2c53787375d404fb3f99

PATH = docs/C2_C_WALLET_SEMANTIC_REDESIGN.md
ARCHIVED_BLOB_SHA = 458149dbfcc2dfc4bb0c76ebdf6ee00c1a120953

PATH = docs/C2_D_1_BETA_IMAGE_PIPELINE.md
ARCHIVED_BLOB_SHA = 8116d6b6bda99d5c8b2d15a23478cb80a696ff08

PATH = docs/C2_E_MERCHANT_LOCAL_MODERATION.md
ARCHIVED_BLOB_SHA = 87a87ac5066d1a61aeea12cfa3faeb9a7ae4cc73

PATH = docs/C2_F_ONBOARDING_DURABILITY_RECOVERY.md
ARCHIVED_BLOB_SHA = 9a0f92a4888fd7d7d2817d65b513d46874f7cae8

PATH = docs/C2_G_1_PAYMENT_BACKUP_RESTORE.md
ARCHIVED_BLOB_SHA = 39a4fda4220cc0a0877b0d55df30184becf4ad53
```

Each path must still resolve to the stated blob SHA on the deletion candidate's canonical parent immediately before removal. Any mismatch invalidates the authorization for that path and the candidate must stop rather than deleting a different object.

## Explicitly protected from this operation

The following file remains a pinned historical dependency and is not authorized for deletion:

```text
PATH = docs/HIVE_BAR_M15_UI_UX_MODERNIZATION_SPECIFICATION_0_1_0.md
BLOB_SHA = 6a9ee7b6fb31542cafc499ff3e265ec7e2ba24f0
CLASSIFICATION = PINNED_HISTORICAL_DEPENDENCY
DELETION_AUTHORIZED = NO
```

No other historical record, product file, test, script, workflow, navigation file, deployment record, or source file may be changed in the Batch-001 deletion candidate.

## Qualification and integration

The exact six-deletion candidate must:

- be one clean commit on the accepted execution-authorization commit;
- contain exactly six changed paths, all deletions;
- pass the repository changed-path classifier;
- pass deterministic Ubuntu and Windows qualification;
- run rendered/live-Hive gates only if the repository classifier actually selects them;
- be integrated only after a fresh canonical-main race check;
- use non-force fast-forward integration when the qualified candidate remains a direct child of canonical `main`.

## Post-retirement verification

After canonical integration, verify in one bounded pass:

```text
ALL_SIX_AUTHORIZED_PATHS_ABSENT_FROM_MAIN = YES
M15_PINNED_SPEC_PRESENT_AND_UNCHANGED = YES
CHECKPOINT_TAG_PRESENT = YES
CHECKPOINT_TAG_OBJECT_SHA = e636c9f26d787c0db72db4ff833a07c340f49aa1
CHECKPOINT_TAG_OBJECT_TYPE = tag
CHECKPOINT_PEELED_COMMIT = 5753918b653e5ea4e860c29fd342252a934b40c3
CHECKPOINT_PEELED_TREE = fff9ab7827f66902bf2a3a6ea0273badd92805bf
ALL_SIX_PATHS_RECOVERABLE_THROUGH_CHECKPOINT_AT_DOCKETED_BLOBS = YES
```

Then freeze one compact retirement-completion record containing the final canonical retirement commit/tree, qualification evidence, tag identity, and recovery result. Do not rewrite the original docket or authorization records post hoc.

## Non-effects

This authorization does not authorize:

- deletion of any seventh file;
- deletion or modification of the M15 modernization specification;
- archive-tag movement, replacement, or deletion;
- Git history rewriting;
- branch cleanup;
- application/runtime changes;
- production or infrastructure mutation;
- Hive writes or authority changes;
- payment, onboarding, moderation, or authentication changes;
- HV-6 implementation or dependency adoption;
- a real second venue;
- CID/IPNS or 3Speak/SPK work;
- shared-runtime multi-tenancy.

After Batch-001 completion, the project returns to the already-selected product lane:

```text
NEXT_OPERATION = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION
```
