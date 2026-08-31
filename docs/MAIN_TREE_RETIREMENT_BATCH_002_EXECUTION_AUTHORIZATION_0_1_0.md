# Main-Tree Retirement Batch-002 Execution Authorization 0.1.0

## 1. Status

```text
OPERATION = MAIN_TREE_RETIREMENT_BATCH_002_EXECUTION_AUTHORIZATION
STATUS = PROJECT_LEAD_RETIREMENT_EXECUTION_AUTHORIZATION
REPOSITORY = etblink/Hive-Venues
RETIREMENT_ID = batch-20260831-002
POLICY_VERSION = 0.1.1
POLICY_PATH = docs/MAIN_TREE_HISTORICAL_ARTIFACT_RETIREMENT_POLICY_0_1_1.md
POLICY_BLOB_SHA = 4c9f189101bfc2eef9764303b9aa50bac55ba401

DOCKET_PATH = docs/MAIN_TREE_RETIREMENT_BATCH_002_DOCKET_0_1_0.md
DOCKET_FREEZE_COMMIT = 5d05927ef326537f195f7b1a746388b6bdb23124
DOCKET_FREEZE_TREE = a226d9d1597add51dd8aed4185e9b480dd93f9a2
DOCKET_BLOB_SHA = 9e1ae1b2d4e0204bbc0acf0c9694c616562cc18e
DOCKET_QUALIFICATION_RUN = 33368192386

CHECKPOINT_AUTHORIZATION_PATH = docs/MAIN_TREE_RETIREMENT_BATCH_002_CHECKPOINT_AUTHORIZATION_0_1_0.md
CHECKPOINT_AUTHORIZATION_COMMIT = 51cbd4a289de718ef23758fa761508bd41bb1edc
CHECKPOINT_AUTHORIZATION_TREE = a15980b953a0122f19d0e8fba7ba4bf86dda589f
CHECKPOINT_AUTHORIZATION_BLOB_SHA = e96f3e4974ac0274cfa96d1ef3e6af33f1182808
CHECKPOINT_AUTHORIZATION_QUALIFICATION_RUN = 33368670068

VERIFIED_CHECKPOINT_TAG = archive/main-tree/batch-20260831-002
VERIFIED_TAG_OBJECT_SHA = 8c2929e72a029116fb73c9bad197d4550721b2db
VERIFIED_TAG_OBJECT_TYPE = tag
VERIFIED_TAG_PEELED_COMMIT = 5d05927ef326537f195f7b1a746388b6bdb23124
VERIFIED_TAG_PEELED_TREE = a226d9d1597add51dd8aed4185e9b480dd93f9a2
TAG_CREATION_WORKFLOW_RUN = 33370562048
INDEPENDENT_TAG_OBJECT_API_VERIFICATION = PASS
INDEPENDENT_ARCHIVE_LEDGER_VERIFICATION = PASS__19_TOTAL__18_PREEXISTING_UNCHANGED

PRIVILEGED_TAG_WORKFLOW_TEARDOWN_COMMIT = 57ae51370d80bf975cf589a274e17bac0817d1fc
PRIVILEGED_TAG_WORKFLOW_TEARDOWN_TREE = a15980b953a0122f19d0e8fba7ba4bf86dda589f
PRIVILEGED_TAG_WORKFLOW_TEARDOWN_QUALIFICATION_RUN = 33370851083
PRIVILEGED_TAG_WORKFLOW_PRESENT_ON_CANONICAL_MAIN = NO

FILE_DELETION_AUTHORIZED = YES__EXACT_EIGHT_PATHS_ONLY
DELETION_CANDIDATE_MAY_CHANGE_OTHER_PATHS = NO
ARCHIVE_TAG_MUTATION_AUTHORIZED = NO
PRODUCTION_MUTATION = NO
PRODUCT_LANE_SELECTION = NO
```

## 2. Project Lead decision

The Project Lead authorizes one bounded living-tree retirement candidate under Main-Tree Historical Artifact Retirement Policy 0.1.1.

The prerequisite custody chain is complete:

1. exact-tree consumer auditing failed closed when genuine consumers were found and narrowed the proposed batch rather than rewriting accepted history;
2. the accepted docket classifies the final eight records `RETIREABLE_HISTORICAL` with no live-invariant migration required;
3. the accepted HV-5 preregistration's controlling Post-HV4 sequencing record was excluded as a pinned historical dependency;
4. the Batch-001 provenance chain was excluded and retained together after annotated-tag metadata was identified as a provenance consumer;
5. the separately authorized Batch-002 checkpoint tag was created as an annotated Git tag object and independently re-fetched;
6. the tag peels to the exact docket-freeze commit/tree and preserves every candidate at its docketed blob SHA;
7. all eighteen pre-existing archive-tag object SHAs were independently re-fetched unchanged after creation of the nineteenth Batch-002 tag;
8. the temporary `contents: write` workflow was removed, qualified on Ubuntu and Windows, and is absent from canonical `main`.

No migration, navigation edit, checker edit, code edit, or product edit is required for this retirement.

## 3. Exact authorized deletion scope

The deletion candidate may remove exactly the following eight paths and no others:

```text
PATH = docs/POST_HV2_SEQUENCING_DECISION_0_1_0.md
ARCHIVED_BLOB_SHA = f02e95413ad94e8e048c448dc8c8746854963c68

PATH = docs/POST_HV3_ROUTING_RECONCILIATION_0_1_0.md
ARCHIVED_BLOB_SHA = 4505a18f28202ffd865389a2f04f3a00ff42056a

PATH = docs/POST_HV3_SEQUENCING_DECISION_0_1_0.md
ARCHIVED_BLOB_SHA = 6889b996bbaaedfee9922b4106452c4d3ef2f45a

PATH = docs/POST_HV4_DECISION_ROUTING_RECONCILIATION_0_1_0.md
ARCHIVED_BLOB_SHA = 5a8f4fdb8bb68fec7804aed6ac21e6dc5b53d0e0

PATH = docs/POST_HV4_LIVING_ROUTING_RECONCILIATION_0_1_0.md
ARCHIVED_BLOB_SHA = ed6573d94a7e3bd04a45cc79903f2e8bd9e204f5

PATH = docs/POST_HV5_DECISION_ROUTING_RECONCILIATION_0_1_0.md
ARCHIVED_BLOB_SHA = 2c5a937cbe10c7123cf752b8175d26caeaf263d2

PATH = docs/POST_HV5_LIVING_ROUTING_RECONCILIATION_0_1_0.md
ARCHIVED_BLOB_SHA = 508ad6a71f249c0b40a7c37c57d693bffc82c74c

PATH = docs/POST_HV5_SEQUENCING_DECISION_0_1_0.md
ARCHIVED_BLOB_SHA = 8b9bfb4edea0bb3e8c3c32c5da2683a49d84fb8f
```

Each path must still resolve to the stated blob SHA on the deletion candidate's exact canonical parent immediately before removal. Any mismatch stops the operation.

The deletion candidate must contain exactly eight changed paths, all deletions. It may not edit living navigation, tests, workflows, source, or other governance records merely to accompany the retirement.

## 4. Explicit exclusions

The following are outside this authorization and must remain present and unchanged:

```text
PATH = docs/POST_HV4_SEQUENCING_DECISION_0_1_0.md
BLOB_SHA = 1aa5566a634630bb54f567a904fe245f5befe3ad
CLASSIFICATION = PINNED_HISTORICAL_DEPENDENCY
REASON = accepted HV-5 preregistration names it as CONTROLLING_DECISION

PATH = docs/MAIN_TREE_HISTORICAL_ARTIFACT_RETIREMENT_POLICY_0_1_0.md
BLOB_SHA = 20fdc93086fcca679b16d646d98f88bd854c7c8b
DELETION_AUTHORIZED = NO

BATCH_001_PROVENANCE_CHAIN = RETAIN_TOGETHER
DELETION_AUTHORIZED = NO
```

Also protected from this operation are all current architecture/acceptance/routing contracts, application/runtime source, tests, workflows, deployment/runbook records, all archive refs, and every non-docketed file.

## 5. Qualification and canonical integration

The exact eight-deletion candidate must:

- be one clean commit whose parent is this accepted execution-authorization commit;
- contain exactly eight changed paths, all deletions;
- pass the repository changed-path classifier;
- pass deterministic Ubuntu and Windows qualification;
- run UI/UX visual evidence or live-Hive gates only if the classifier genuinely selects them;
- be integrated only after a fresh canonical-main race check;
- use a non-force fast-forward when the qualified candidate remains the direct child of canonical `main`.

A screenshot is neither required nor useful for a docs-only historical-file deletion unless an independently justified UI/UX effect exists.

## 6. Required post-retirement recovery verification

After canonical integration, independently verify in one bounded pass:

```text
ALL_EIGHT_AUTHORIZED_PATHS_ABSENT_FROM_MAIN = YES
POST_HV4_SEQUENCING_DECISION_PRESENT_AT_PINNED_BLOB = YES
RETIREMENT_POLICY_0_1_0_PRESENT_AT_PINNED_BLOB = YES
BATCH_001_PROVENANCE_CHAIN_PRESENT = YES
CHECKPOINT_TAG_PRESENT = YES
CHECKPOINT_TAG_OBJECT_SHA = 8c2929e72a029116fb73c9bad197d4550721b2db
CHECKPOINT_TAG_OBJECT_TYPE = tag
CHECKPOINT_PEELED_COMMIT = 5d05927ef326537f195f7b1a746388b6bdb23124
CHECKPOINT_PEELED_TREE = a226d9d1597add51dd8aed4185e9b480dd93f9a2
ALL_EIGHT_PATHS_RECOVERABLE_THROUGH_CHECKPOINT_AT_DOCKETED_BLOBS = YES
ARCHIVE_TAG_LEDGER_UNCHANGED = YES
```

Then freeze one compact Batch-002 completion record containing the final canonical retirement commit/tree, qualification evidence, checkpoint identity, and recovery verification. Do not rewrite the docket or prior authorization records post hoc.

## 7. Non-effects

This authorization does not authorize:

- deletion of any ninth file;
- modification or deletion of any archive tag;
- Git-history rewriting;
- branch cleanup;
- application/runtime refactoring;
- test or CI changes;
- production or infrastructure mutation;
- Hive writes or authority changes;
- payment, signing, authentication, moderation, or private-key changes;
- real second-venue admission;
- selection of the next product lane.

After Batch-002 completion, repository maintenance may proceed to a separately bounded successor-codebase quality audit. That audit may challenge inherited Hive-Bar architecture and code quality, but it is not authorized by this retirement record itself.
