# Main-Tree Retirement Batch-002 Docket 0.1.0

## 1. Status and authority boundary

```text
OPERATION = MAIN_TREE_RETIREMENT_BATCH_002_DOCKET
STATUS = FROZEN_PROPOSED_RETIREMENT_DOCKET__NO_TAG_OR_DELETION_AUTHORITY
REPOSITORY = etblink/Hive-Venues
RETIREMENT_ID = batch-20260831-002
DOCKET_VERSION = 0.1.0
DOCKET_PATH = docs/MAIN_TREE_RETIREMENT_BATCH_002_DOCKET_0_1_0.md

POLICY_VERSION = 0.1.1
POLICY_PATH = docs/MAIN_TREE_HISTORICAL_ARTIFACT_RETIREMENT_POLICY_0_1_1.md
POLICY_BLOB_SHA = 4c9f189101bfc2eef9764303b9aa50bac55ba401

AUDIT_BASE_COMMIT = ea55ec0617ab63cd7ae9ff58d9dd91aa3223278e
AUDIT_BASE_TREE = e601feb1538b05ee5e238fa1cd8834030c3aa141
AUDIT_PR = 62
FINAL_AUDIT_HEAD = 459d005e0bb39df3995b27c4df2ddba086849c1b
FINAL_AUDIT_RUN = 33367881317
FINAL_AUDIT_JOB = 99412251832
FINAL_AUDIT_RESULT = PASS

EXPECTED_CHECKPOINT_TAG = archive/main-tree/batch-20260831-002
CHECKPOINT_TAG_CREATION_AUTHORIZED = NO
DELETION_AUTHORIZED = NO
PRODUCTION_MUTATION = NO
PRODUCT_LANE_SELECTION = NO
```

This docket freezes the result of the Batch-002 read-only inventory and consumer audit under Main-Tree Historical Artifact Retirement Policy 0.1.1. It classifies exactly eight superseded routing/sequencing records as proposed retirement candidates.

This docket does **not** authorize creation of the checkpoint tag, deletion of any file, movement or deletion of any existing tag, product implementation, production deployment, Hive mutation, payment or signing authority change, real-second-venue admission, or shared-runtime tenancy.

The docket intentionally does not contain `CANONICAL_DOCKET_COMMIT`, `CANONICAL_DOCKET_TREE`, `CHECKPOINT_COMMIT`, or `CHECKPOINT_TREE`. Those identities cannot be known without self-reference and belong to later phases after this docket has a qualified canonical Git identity.

## 2. Audit method

The disposable audit surface was PR #62. Its workflow never entered canonical `main` and used only `contents: read` authority. It checked out exact canonical source rather than treating the PR merge tree as the audit corpus. Credentials were not persisted.

The final audit examined:

1. exact canonical commit and tree identity;
2. exact blob custody for every candidate;
3. exact tracked-tree path and filename consumers using `git grep` while distinguishing references internal to the proposed retirement cluster from external consumers;
4. generic Markdown/document enumeration surfaces in `scripts`, `test`, and `.github`;
5. annotated Git tag messages as a provenance-consumer category not visible to tracked-tree `git grep`;
6. current living routing, current machine checks, deterministic tests, visual-evidence harness scope, CI/workflows, production/runbooks, current successor acceptance records, and retirement-policy requirements through Project Lead direct review.

Search-index absence was not used as proof of non-consumption.

## 3. Useful narrowing history

The final batch is intentionally smaller than the initial inventory because the audit was allowed to fail closed.

### 3.1 Initial 13-path audit — useful failure

```text
HEAD = 45ca47da69f9025850ad2b05a152f8c94fed7037
RUN = 33367478963
JOB = 99411037057
RESULT = FAIL_EXPECTED_CONSUMER_FOUND
```

Exact custody passed for all initial candidates, but the audit found:

```text
PINNED_PATH = docs/POST_HV4_SEQUENCING_DECISION_0_1_0.md
PINNED_BLOB = 1aa5566a634630bb54f567a904fe245f5befe3ad
CONSUMER = docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_0_1_0.md
BINDING = CONTROLLING_DECISION = docs/POST_HV4_SEQUENCING_DECISION_0_1_0.md
CLASSIFICATION = PINNED_HISTORICAL_DEPENDENCY
```

The accepted HV-5 preregistration was not rewritten merely to make housekeeping pass. `POST_HV4_SEQUENCING_DECISION_0_1_0.md` is outside Batch-002.

### 3.2 Narrowed 12-path tracked-tree audit — PASS, then expanded review

```text
HEAD = fb4495c7c4b3b49913a926bf46a01b01c049ed9a
RUN = 33367575099
JOB = 99411317500
TRACKED_TREE_RESULT = PASS_NO_EXACT_EXTERNAL_CONSUMERS
GENERIC_DOC_ENUMERATION = NONE_FOUND
```

Project Lead review then identified immutable annotated tag messages as an additional provenance-consumer category that tracked-tree grep cannot observe.

### 3.3 Tag-aware 12-path audit — useful failure

```text
HEAD = e0e1467c66e1bffd29c832ffd6211683d174d354
RUN = 33367812939
JOB = 99412046954
TRACKED_TREE_RESULT = PASS
ANNOTATED_TAG_RESULT = FAIL_EXPECTED_PROVENANCE_CONSUMER_FOUND
```

The immutable Batch-001 checkpoint tag:

```text
TAG = archive/main-tree/batch-20260830-001
TAG_OBJECT_SHA = e636c9f26d787c0db72db4ff833a07c340f49aa1
```

names:

```text
docs/MAIN_TREE_RETIREMENT_BATCH_001_DOCKET_0_1_0.md
docs/MAIN_TREE_RETIREMENT_BATCH_001_CHECKPOINT_AUTHORIZATION_0_1_0.md
```

The Project Lead conservatively kept the complete four-file Batch-001 provenance chain together on living `main` rather than splitting one closed historical operation across current-tree and archive-only records. Those four files are outside Batch-002.

### 3.4 Final eight-path audit — PASS

```text
HEAD = 459d005e0bb39df3995b27c4df2ddba086849c1b
RUN = 33367881317
JOB = 99412251832
EXACT_BLOB_CUSTODY = PASS
TRACKED_TREE_EXTERNAL_CONSUMERS = NONE_FOUND
ANNOTATED_TAG_PROVENANCE_CONSUMERS = NONE_FOUND
GENERIC_DOC_ENUMERATION = NONE_FOUND
AUDIT_RESULT = PASS
```

One reference exists inside the proposed retirement cluster:

```text
TARGET = docs/POST_HV3_SEQUENCING_DECISION_0_1_0.md
SOURCE = docs/POST_HV4_LIVING_ROUTING_RECONCILIATION_0_1_0.md
DISPOSITION = INTERNAL_HISTORICAL_REFERENCE__RETIRES_WITH_SAME_CLUSTER
```

It is not an external live consumer.

## 4. Current authority and invariant disposition

The eight candidates do not define current routing. Current successor routing is represented locally by the living/current surfaces, including:

```text
README.md
docs/README.md
docs/ROADMAP.md
docs/POST_HV6_LIVING_ROUTING_RECONCILIATION_0_1_0.md
docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_ACCEPTANCE_0_1_0.md
docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md
docs/HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md
```

Those current authorities preserve, among other things:

```text
HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION = ACCEPTED
SELECTED_ADAPTER = NATIVE_EXISTING_STACK
POST_HV6_SEQUENCING_DECISION = PENDING
SELECTED_NEXT_LANE = NONE
NEXT_OPERATION = POST_HV6_SEQUENCING_DECISION__READ_ONLY
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
REAL_SECOND_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```

No new live-invariant migration is required for the eight candidates. Their prior wording and exact historical state remain recoverable through Git history and, if later separately authorized, the Batch-002 immutable checkpoint tag.

## 5. Exact proposed-retirement ledger

### B2-001

```text
PATH = docs/POST_HV2_SEQUENCING_DECISION_0_1_0.md
BLOB_SHA = f02e95413ad94e8e048c448dc8c8746854963c68
CLASSIFICATION = RETIREABLE_HISTORICAL
RETIREMENT_REASON = SUPERSEDED_POST_HV2_PRODUCT_SEQUENCING_RECORD__NO_LONGER_CURRENT_ROUTING
CURRENT_CONSUMERS = NONE_FOUND
CONSUMER_DISPOSITION = SUPERSEDED_BY_ACCEPTED_CURRENT_AUTHORITY
LIVE_INVARIANT_REPLACEMENT = CURRENT_POST_HV6_ROUTING_SURFACES
RECOVERY_TAG = archive/main-tree/batch-20260831-002
RECOVERY_PATH = docs/POST_HV2_SEQUENCING_DECISION_0_1_0.md
DELETION_AUTHORIZED = NO
```

### B2-002

```text
PATH = docs/POST_HV3_ROUTING_RECONCILIATION_0_1_0.md
BLOB_SHA = 4505a18f28202ffd865389a2f04f3a00ff42056a
CLASSIFICATION = RETIREABLE_HISTORICAL
RETIREMENT_REASON = SUPERSEDED_POST_HV3_ROUTING_RECONCILIATION__NO_LONGER_CURRENT_ROUTING
CURRENT_CONSUMERS = NONE_FOUND
CONSUMER_DISPOSITION = SUPERSEDED_BY_ACCEPTED_CURRENT_AUTHORITY
LIVE_INVARIANT_REPLACEMENT = CURRENT_POST_HV6_ROUTING_SURFACES
RECOVERY_TAG = archive/main-tree/batch-20260831-002
RECOVERY_PATH = docs/POST_HV3_ROUTING_RECONCILIATION_0_1_0.md
DELETION_AUTHORIZED = NO
```

### B2-003

```text
PATH = docs/POST_HV3_SEQUENCING_DECISION_0_1_0.md
BLOB_SHA = 6889b996bbaaedfee9922b4106452c4d3ef2f45a
CLASSIFICATION = RETIREABLE_HISTORICAL
RETIREMENT_REASON = SUPERSEDED_POST_HV3_PRODUCT_SEQUENCING_RECORD__NO_LONGER_CURRENT_ROUTING
CURRENT_CONSUMERS = INTERNAL_CLUSTER_REFERENCE_FROM_POST_HV4_LIVING_ROUTING_ONLY
CONSUMER_DISPOSITION = INTERNAL_HISTORICAL_REFERENCE_RETIRES_IN_SAME_BATCH
LIVE_INVARIANT_REPLACEMENT = CURRENT_POST_HV6_ROUTING_SURFACES
RECOVERY_TAG = archive/main-tree/batch-20260831-002
RECOVERY_PATH = docs/POST_HV3_SEQUENCING_DECISION_0_1_0.md
DELETION_AUTHORIZED = NO
```

### B2-004

```text
PATH = docs/POST_HV4_DECISION_ROUTING_RECONCILIATION_0_1_0.md
BLOB_SHA = 5a8f4fdb8bb68fec7804aed6ac21e6dc5b53d0e0
CLASSIFICATION = RETIREABLE_HISTORICAL
RETIREMENT_REASON = SUPERSEDED_POST_HV4_DECISION_ROUTING_RECONCILIATION__NO_LONGER_CURRENT_ROUTING
CURRENT_CONSUMERS = NONE_FOUND
CONSUMER_DISPOSITION = SUPERSEDED_BY_ACCEPTED_CURRENT_AUTHORITY
LIVE_INVARIANT_REPLACEMENT = CURRENT_POST_HV6_ROUTING_SURFACES
RECOVERY_TAG = archive/main-tree/batch-20260831-002
RECOVERY_PATH = docs/POST_HV4_DECISION_ROUTING_RECONCILIATION_0_1_0.md
DELETION_AUTHORIZED = NO
```

### B2-005

```text
PATH = docs/POST_HV4_LIVING_ROUTING_RECONCILIATION_0_1_0.md
BLOB_SHA = ed6573d94a7e3bd04a45cc79903f2e8bd9e204f5
CLASSIFICATION = RETIREABLE_HISTORICAL
RETIREMENT_REASON = SUPERSEDED_POST_HV4_LIVING_ROUTING_SNAPSHOT__REPLACED_BY_POST_HV6_LIVING_ROUTING
CURRENT_CONSUMERS = NONE_EXTERNAL__CONTAINS_INTERNAL_CLUSTER_REFERENCE_TO_POST_HV3_SEQUENCING
CONSUMER_DISPOSITION = SUPERSEDED_BY_ACCEPTED_CURRENT_AUTHORITY__INTERNAL_REFERENCE_RETIRES_TOGETHER
LIVE_INVARIANT_REPLACEMENT = docs/POST_HV6_LIVING_ROUTING_RECONCILIATION_0_1_0.md
RECOVERY_TAG = archive/main-tree/batch-20260831-002
RECOVERY_PATH = docs/POST_HV4_LIVING_ROUTING_RECONCILIATION_0_1_0.md
DELETION_AUTHORIZED = NO
```

### B2-006

```text
PATH = docs/POST_HV5_DECISION_ROUTING_RECONCILIATION_0_1_0.md
BLOB_SHA = 2c5a937cbe10c7123cf752b8175d26caeaf263d2
CLASSIFICATION = RETIREABLE_HISTORICAL
RETIREMENT_REASON = SUPERSEDED_POST_HV5_DECISION_ROUTING_RECONCILIATION__NO_LONGER_CURRENT_ROUTING
CURRENT_CONSUMERS = NONE_FOUND
CONSUMER_DISPOSITION = SUPERSEDED_BY_ACCEPTED_CURRENT_AUTHORITY
LIVE_INVARIANT_REPLACEMENT = CURRENT_POST_HV6_ROUTING_SURFACES
RECOVERY_TAG = archive/main-tree/batch-20260831-002
RECOVERY_PATH = docs/POST_HV5_DECISION_ROUTING_RECONCILIATION_0_1_0.md
DELETION_AUTHORIZED = NO
```

### B2-007

```text
PATH = docs/POST_HV5_LIVING_ROUTING_RECONCILIATION_0_1_0.md
BLOB_SHA = 508ad6a71f249c0b40a7c37c57d693bffc82c74c
CLASSIFICATION = RETIREABLE_HISTORICAL
RETIREMENT_REASON = SUPERSEDED_POST_HV5_LIVING_ROUTING_SNAPSHOT__REPLACED_BY_POST_HV6_LIVING_ROUTING
CURRENT_CONSUMERS = NONE_FOUND
CONSUMER_DISPOSITION = SUPERSEDED_BY_ACCEPTED_CURRENT_AUTHORITY
LIVE_INVARIANT_REPLACEMENT = docs/POST_HV6_LIVING_ROUTING_RECONCILIATION_0_1_0.md
RECOVERY_TAG = archive/main-tree/batch-20260831-002
RECOVERY_PATH = docs/POST_HV5_LIVING_ROUTING_RECONCILIATION_0_1_0.md
DELETION_AUTHORIZED = NO
```

### B2-008

```text
PATH = docs/POST_HV5_SEQUENCING_DECISION_0_1_0.md
BLOB_SHA = 8b9bfb4edea0bb3e8c3c32c5da2683a49d84fb8f
CLASSIFICATION = RETIREABLE_HISTORICAL
RETIREMENT_REASON = EXHAUSTED_POST_HV5_PRODUCT_SEQUENCING_RECORD__HV6_ACCEPTED_AND_CURRENT_ROUTING_ADVANCED
CURRENT_CONSUMERS = NONE_FOUND
CONSUMER_DISPOSITION = SUPERSEDED_BY_ACCEPTED_HV6_AND_POST_HV6_CURRENT_AUTHORITY
LIVE_INVARIANT_REPLACEMENT = HV6_ACCEPTANCE_AND_CURRENT_POST_HV6_ROUTING_SURFACES
RECOVERY_TAG = archive/main-tree/batch-20260831-002
RECOVERY_PATH = docs/POST_HV5_SEQUENCING_DECISION_0_1_0.md
DELETION_AUTHORIZED = NO
```

## 6. Explicit exclusions and protections

### 6.1 Post-HV4 sequencing decision — pinned

```text
PATH = docs/POST_HV4_SEQUENCING_DECISION_0_1_0.md
BLOB_SHA = 1aa5566a634630bb54f567a904fe245f5befe3ad
CLASSIFICATION = PINNED_HISTORICAL_DEPENDENCY
CURRENT_CONSUMER = docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_0_1_0.md
CONSUMER_BINDING = CONTROLLING_DECISION
BATCH_002_DELETION_AUTHORIZED = NO
```

No accepted HV-5 record is rewritten by this operation.

### 6.2 Batch-001 provenance chain — retained together

```text
docs/MAIN_TREE_RETIREMENT_BATCH_001_DOCKET_0_1_0.md
docs/MAIN_TREE_RETIREMENT_BATCH_001_CHECKPOINT_AUTHORIZATION_0_1_0.md
docs/MAIN_TREE_RETIREMENT_BATCH_001_EXECUTION_AUTHORIZATION_0_1_0.md
docs/MAIN_TREE_RETIREMENT_BATCH_001_COMPLETION_0_1_0.md
```

At least the first two paths are explicitly named by immutable annotated tag `archive/main-tree/batch-20260830-001`. The Project Lead keeps the entire completed provenance chain together rather than fragmenting the operation across living-tree and archive-only records.

### 6.3 Retirement Policy 0.1.0 — retained

`docs/MAIN_TREE_HISTORICAL_ARTIFACT_RETIREMENT_POLICY_0_1_0.md` remains outside this batch because governing Policy 0.1.1 explicitly binds it as the superseded policy and records its exact blob identity.

### 6.4 Other historical product records — unadjudicated here

Hive-Bar-era M1–M19 documents, visual/design specifications, production records, acceptance evidence, runbooks, and other successor milestone records are not implicitly classified by this docket. They require their own future consumer audit if retirement is considered.

## 7. Qualification requirement

This docket must itself pass the repository changed-path classifier and deterministic Ubuntu and Windows qualification before it may be accepted canonically.

Because this candidate changes only governance/documentation, UI/UX screenshot evidence is not a binding qualification gate and should not be selected merely because the file is unfamiliar. A successful screenshot capture would not constitute Project Lead visual approval in any event.

After qualification, the Project Lead must observe the exact clean docket identity:

```text
DOCKET_FREEZE_COMMIT = TO_BE_OBSERVED_AFTER_QUALIFICATION
DOCKET_FREEZE_TREE = TO_BE_OBSERVED_AFTER_QUALIFICATION
DOCKET_BLOB_SHA = TO_BE_OBSERVED_AFTER_QUALIFICATION
DOCKET_EXACT_PARENT = TO_BE_OBSERVED_AFTER_QUALIFICATION
```

These placeholders are descriptive, not self-referential docket fields binding the containing commit/tree.

## 8. Next boundary if docket is accepted

Only after the exact canonical docket identity is observed may a separate checkpoint-authorization record be constructed under Policy 0.1.1.

That later record must independently decide whether tag creation is authorized and bind the exact checkpoint target. Until then:

```text
CHECKPOINT_TAG_CREATION = FORBIDDEN
FILE_DELETION = FORBIDDEN
```

Even a later verified checkpoint tag would still be necessary but insufficient for deletion: a separate explicit retirement-execution authorization and separately qualified deletion candidate would remain required.
