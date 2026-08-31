# Main-Tree Retirement Batch-002 Checkpoint Authorization 0.1.0

## 1. Status

```text
OPERATION = MAIN_TREE_RETIREMENT_BATCH_002_CHECKPOINT_AUTHORIZATION
STATUS = PROJECT_LEAD_CHECKPOINT_TAG_AUTHORIZATION__NO_FILE_DELETION_AUTHORITY
REPOSITORY = etblink/Hive-Venues
RETIREMENT_ID = batch-20260831-002
POLICY_VERSION = 0.1.1
POLICY_PATH = docs/MAIN_TREE_HISTORICAL_ARTIFACT_RETIREMENT_POLICY_0_1_1.md
POLICY_BLOB_SHA = 4c9f189101bfc2eef9764303b9aa50bac55ba401

DOCKET_PATH = docs/MAIN_TREE_RETIREMENT_BATCH_002_DOCKET_0_1_0.md
DOCKET_FREEZE_COMMIT = 5d05927ef326537f195f7b1a746388b6bdb23124
DOCKET_FREEZE_TREE = a226d9d1597add51dd8aed4185e9b480dd93f9a2
DOCKET_BLOB_SHA = 9e1ae1b2d4e0204bbc0acf0c9694c616562cc18e
DOCKET_EXACT_PARENT = ea55ec0617ab63cd7ae9ff58d9dd91aa3223278e
DOCKET_QUALIFICATION_RUN = 33368192386
DOCKET_QUALIFICATION = CLASSIFIER_PASS__UBUNTU_PASS__WINDOWS_PASS
DOCKET_UI_UX_VISUAL_EVIDENCE = SKIPPED_BY_SCOPE

EXPECTED_CHECKPOINT_TAG = archive/main-tree/batch-20260831-002
AUTHORIZED_CHECKPOINT_COMMIT = 5d05927ef326537f195f7b1a746388b6bdb23124
AUTHORIZED_CHECKPOINT_TREE = a226d9d1597add51dd8aed4185e9b480dd93f9a2
TAG_OBJECT_TYPE_REQUIRED = annotated
TAG_CREATION_AUTHORIZED = YES
FILE_DELETION_AUTHORIZED = NO
PRODUCTION_MUTATION = NO
PRODUCT_LANE_SELECTION = NO
```

This record authorizes exactly one immutable annotated checkpoint tag for Batch-002 after this authorization record itself qualifies and becomes canonical. It does not authorize deletion of any file.

The checkpoint target is deliberately the already-existing canonical docket-freeze commit, not the commit containing this authorization record. This avoids a circular hash requirement: the checkpoint identity was objectively fixed before this authorization record existed.

## 2. Project Lead authorization finding

The Project Lead independently reviewed the accepted Batch-002 docket, the governing Policy 0.1.1 boundary, the final exact-tree/tag-aware audit, the useful fail-closed exclusions, and the docket qualification result.

Finding:

```text
DOCKET = ACCEPTED_CANONICAL
FINAL_RETIREMENT_SCOPE = EIGHT_EXACT_SUPERSEDED_ROUTING_RECORDS
LIVE_INVARIANT_MIGRATION_REQUIRED = NO
PINNED_POST_HV4_SEQUENCING_DECISION = EXCLUDED
BATCH_001_PROVENANCE_CHAIN = EXCLUDED_AND_RETAINED_TOGETHER
RETIREMENT_POLICY_0_1_0 = EXCLUDED_AND_RETAINED
CHECKPOINT_TARGET = EXACT_PRE_RETIREMENT_CANONICAL_DOCKET_TREE
CHECKPOINT_TAG_CREATION = AUTHORIZED_AFTER_THIS_RECORD_IS_CANONICAL
FILE_DELETION = NOT_AUTHORIZED
```

The prior audit failures are positive evidence that the retirement process is fail-closed: paths were removed from the candidate set when actual tracked-tree or annotated-tag consumers were found. No accepted historical record was rewritten merely to make cleanup succeed.

## 3. Exact checkpoint custody contract

Before tag creation, the execution mechanism must independently verify:

```text
CURRENT_OR_REACHABLE_CHECKPOINT_COMMIT = 5d05927ef326537f195f7b1a746388b6bdb23124
CHECKPOINT_TREE = a226d9d1597add51dd8aed4185e9b480dd93f9a2
DOCKET_PATH = docs/MAIN_TREE_RETIREMENT_BATCH_002_DOCKET_0_1_0.md
DOCKET_BLOB_SHA = 9e1ae1b2d4e0204bbc0acf0c9694c616562cc18e
```

The authorized checkpoint must contain all eight docketed candidates at exactly these blobs:

```text
docs/POST_HV2_SEQUENCING_DECISION_0_1_0.md = f02e95413ad94e8e048c448dc8c8746854963c68
docs/POST_HV3_ROUTING_RECONCILIATION_0_1_0.md = 4505a18f28202ffd865389a2f04f3a00ff42056a
docs/POST_HV3_SEQUENCING_DECISION_0_1_0.md = 6889b996bbaaedfee9922b4106452c4d3ef2f45a
docs/POST_HV4_DECISION_ROUTING_RECONCILIATION_0_1_0.md = 5a8f4fdb8bb68fec7804aed6ac21e6dc5b53d0e0
docs/POST_HV4_LIVING_ROUTING_RECONCILIATION_0_1_0.md = ed6573d94a7e3bd04a45cc79903f2e8bd9e204f5
docs/POST_HV5_DECISION_ROUTING_RECONCILIATION_0_1_0.md = 2c5a937cbe10c7123cf752b8175d26caeaf263d2
docs/POST_HV5_LIVING_ROUTING_RECONCILIATION_0_1_0.md = 508ad6a71f249c0b40a7c37c57d693bffc82c74c
docs/POST_HV5_SEQUENCING_DECISION_0_1_0.md = 8b9bfb4edea0bb3e8c3c32c5da2683a49d84fb8f
```

Any mismatch stops execution. No substitute tree, reconstructed approximation, or later main tree may be used as the checkpoint target.

## 4. Annotated tag contract

The only authorized new archive ref is:

```text
refs/tags/archive/main-tree/batch-20260831-002
```

The tag must be an annotated Git tag object. A lightweight tag is insufficient.

The annotation must name at least:

```text
RETIREMENT_ID = batch-20260831-002
CHECKPOINT_COMMIT = 5d05927ef326537f195f7b1a746388b6bdb23124
CHECKPOINT_TREE = a226d9d1597add51dd8aed4185e9b480dd93f9a2
RETIREMENT_DOCKET_PATH = docs/MAIN_TREE_RETIREMENT_BATCH_002_DOCKET_0_1_0.md
RETIREMENT_DOCKET_BLOB_SHA = 9e1ae1b2d4e0204bbc0acf0c9694c616562cc18e
CHECKPOINT_AUTHORIZATION_RECORD_PATH = docs/MAIN_TREE_RETIREMENT_BATCH_002_CHECKPOINT_AUTHORIZATION_0_1_0.md
IMMUTABLE_BY_PROJECT_POLICY = YES
```

If the tag is absent, the later bounded authenticated execution mechanism may create it exactly once. If a ref with that name already exists, execution must stop unless it is independently proven to be an annotated tag object whose peeled commit, tree, docket identity, candidate blobs, and annotation all equal this authorization exactly. It may never be force-moved or silently replaced.

No existing archive tag may be moved, deleted, or rewritten by Batch-002.

## 5. Required post-creation verification

Tag creation is not considered successful until independent read-back establishes all of the following:

1. the tag ref exists at `archive/main-tree/batch-20260831-002`;
2. the ref points to an object of Git type `tag`;
3. the annotated tag object peels to exactly `5d05927ef326537f195f7b1a746388b6bdb23124`;
4. the peeled checkpoint tree is exactly `a226d9d1597add51dd8aed4185e9b480dd93f9a2`;
5. the docket exists at blob `9e1ae1b2d4e0204bbc0acf0c9694c616562cc18e`;
6. all eight candidate paths exist at their docketed blob SHAs;
7. the annotation contains the required retirement/checkpoint/docket/authorization/immutability identities;
8. no existing archive tag changed as a side effect.

A green execution workflow is not sufficient evidence by itself; the Project Lead must independently re-fetch and verify the remote Git objects.

## 6. Qualification and sequencing boundary

This authorization record must pass the repository changed-path classifier plus deterministic Ubuntu and Windows qualification before canonical integration.

It is governance/documentation only. UI/UX screenshot capture is not a binding qualification gate and should not run merely because the file is new. Live Hive smoke is likewise not required by this scope.

Only after this exact authorization record is canonical may the bounded authenticated tag-creation operation execute.

Even after a valid checkpoint tag exists and is independently verified:

```text
FILE_DELETION_AUTHORIZED = NO
```

A separate explicit Project Lead retirement-execution authorization must still exist before any docketed path may be removed from living `main`. The later deletion candidate must be separately bounded and qualified.
