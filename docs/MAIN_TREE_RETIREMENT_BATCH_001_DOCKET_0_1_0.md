# Main-Tree Retirement Batch-001 Docket 0.1.0

## 1. Status

```text
OPERATION = MAIN_TREE_RETIREMENT_BATCH_001_DOCKET_AND_CONSUMER_AUDIT
STATUS = FROZEN_DOCKET__DELETION_NOT_AUTHORIZED
REPOSITORY = etblink/Hive-Venues
RETIREMENT_ID = batch-20260830-001
DOCKET_VERSION = 0.1.0
DOCKET_PATH = docs/MAIN_TREE_RETIREMENT_BATCH_001_DOCKET_0_1_0.md

GOVERNING_POLICY_VERSION = 0.1.1
GOVERNING_POLICY_PATH = docs/MAIN_TREE_HISTORICAL_ARTIFACT_RETIREMENT_POLICY_0_1_1.md
GOVERNING_POLICY_COMMIT = a6ca632bcaa57fc0ca05b9250a608f6a34d6b36b
GOVERNING_POLICY_TREE = d74ac006886d905947439ed71d763129c3952fb8

DOCKET_BASE_COMMIT = a6ca632bcaa57fc0ca05b9250a608f6a34d6b36b
DOCKET_BASE_TREE = d74ac006886d905947439ed71d763129c3952fb8

AUDIT_BASE_COMMIT = d069e76b971f64f7bea2434163e769bc9b1e678c
AUDIT_BASE_TREE = 609f8e1a6591742627990909fbc8fb2bf2c100bc
AUDIT_PR = 37
INITIAL_AUDIT_RUN = 33342668749
INITIAL_AUDIT_JOB = 99341008467
NARROWED_AUDIT_RUN = 33342704348
NARROWED_AUDIT_JOB = 99341102352
NARROWED_AUDIT_RESULT = PASS_NO_EXACT_EXTERNAL_CONSUMERS

EXPECTED_CHECKPOINT_TAG = archive/main-tree/batch-20260830-001
AUTHORIZED_CHECKPOINT_COMMIT = UNBOUND_PENDING_CHECKPOINT_AUTHORIZATION
AUTHORIZED_CHECKPOINT_TREE = UNBOUND_PENDING_CHECKPOINT_AUTHORIZATION
CHECKPOINT_TAG_CREATION_AUTHORIZED = NO
DELETION_AUTHORIZED = NO
PRODUCTION_MUTATION = NO
```

This docket freezes the first bounded candidate set under Main-Tree Historical Artifact Retirement Policy 0.1.1.

It classifies six inherited C2 evidence documents as proposed `RETIREABLE_HISTORICAL` after exact-tree consumer audit. It does **not** delete them, authorize an archive tag, or authorize a deletion candidate.

The exact Git commit/tree/blob identity of this docket is intentionally not embedded here. Policy 0.1.1 corrected the impossible self-referential requirement from Policy 0.1.0. After this docket qualifies and becomes canonical, a separate checkpoint-authorization record must bind the then-known docket commit/tree/blob and exact authorized checkpoint target.

## 2. Audit method and evidence

GitHub indexed search was used only as preliminary evidence because the code-search endpoint reported incomplete indexing. It was therefore not accepted as the controlling proof of non-consumption.

A disposable read-only GitHub Actions audit was constructed in PR #37 with these controls:

```text
PERMISSIONS = contents: read
CHECKOUT_ACTION = actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
PERSIST_CREDENTIALS = false
CHECKOUT_REF = d069e76b971f64f7bea2434163e769bc9b1e678c
EXPECTED_TREE = 609f8e1a6591742627990909fbc8fb2bf2c100bc
REF_MUTATION = NO
SOURCE_MUTATION = NO
PRODUCTION_MUTATION = NO
```

The workflow:

1. checked out the exact canonical audit baseline rather than the PR merge tree;
2. verified the expected commit and tree;
3. verified each candidate path resolved to its preregistered blob SHA;
4. ran exact `git grep` searches for both full path and filename across the checked-out tracked tree, excluding only the candidate itself;
5. scanned `scripts`, `test`, and `.github` for generic documentation-enumeration patterns involving directory walking/globbing;
6. failed closed if an external exact consumer was found.

### 2.1 Initial seven-file run — useful rejection

Initial audit run:

```text
RUN = 33342668749
JOB = 99341008467
RESULT = FAIL_EXTERNAL_CONSUMER_FOUND
```

All seven initial candidate blobs passed custody, but the audit found that:

```text
docs/HIVE_BAR_M15_UI_UX_MODERNIZATION_SPECIFICATION_0_1_0.md
```

is explicitly named as the governing specification by four later historical records:

```text
docs/M15_2_APPLICATION_SHELL_AND_DESIGN_PRIMITIVES.md
docs/M15_3_CORE_SOCIAL_SURFACES.md
docs/M15_4_WALLET_PAY_MODERNIZATION.md
docs/M15_5_CROSS_PLATFORM_VISUAL_ACCEPTANCE.md
```

The M15 specification was therefore removed from Batch-001 rather than rewriting legitimate historical consumers merely to make the audit pass.

Its controlling disposition is:

```text
CLASSIFICATION = PINNED_HISTORICAL_DEPENDENCY
BATCH_001 = EXCLUDED
MIGRATION_ATTEMPTED = NO
RETIREMENT_AUTHORIZED = NO
```

### 2.2 Narrowed six-file run — accepted audit evidence

Narrowed audit:

```text
HEAD = ea2c1017f5facc45e3ae093bbc1ccd982c9a40c7
RUN = 33342704348
JOB = 99341102352
RESULT = PASS_NO_EXACT_EXTERNAL_CONSUMERS
```

The job verified the exact canonical audit baseline, verified all six blob identities, emitted `NO_EXACT_EXTERNAL_CONSUMER` for every candidate, and returned no generic documentation-enumeration hits from `scripts`, `test`, or `.github`.

PR #37 was then closed unmerged. Its temporary workflow remains qualification/audit history only and is not part of canonical `main`.

## 3. Batch-001 candidate ledger

### 3.1 Wallet semantic redesign

```text
PATH = docs/C2_C_WALLET_SEMANTIC_REDESIGN.md
BLOB_SHA = 458149dbfcc2dfc4bb0c76ebdf6ee00c1a120953
CLASSIFICATION = RETIREABLE_HISTORICAL
RETIREMENT_REASON = SUPERSEDED_HISTORICAL_DESIGN_EVIDENCE_WITH_NO_CURRENT_EXACT_TREE_CONSUMER
CURRENT_CONSUMERS = NONE_FOUND
CONSUMER_DISPOSITION = NOT_A_LIVE_INVARIANT
LIVE_INVARIANT_REPLACEMENT = NONE_REQUIRED
AUDIT_METHOD = EXACT_CHECKED_OUT_TREE_GIT_GREP_PLUS_GENERIC_ENUMERATION_SCAN
RECOVERY_TAG = archive/main-tree/batch-20260830-001
RECOVERY_PATH = docs/C2_C_WALLET_SEMANTIC_REDESIGN.md
DELETION_AUTHORIZED = NO
```

### 3.2 Wallet product-identity/spatial redesign

```text
PATH = docs/C2_C_1_WALLET_PRODUCT_IDENTITY_SPATIAL_REDESIGN.md
BLOB_SHA = 2ea7578d2832e82601de2c53787375d404fb3f99
CLASSIFICATION = RETIREABLE_HISTORICAL
RETIREMENT_REASON = SUPERSEDED_HISTORICAL_DESIGN_EVIDENCE_WITH_NO_CURRENT_EXACT_TREE_CONSUMER
CURRENT_CONSUMERS = NONE_FOUND
CONSUMER_DISPOSITION = NOT_A_LIVE_INVARIANT
LIVE_INVARIANT_REPLACEMENT = NONE_REQUIRED
AUDIT_METHOD = EXACT_CHECKED_OUT_TREE_GIT_GREP_PLUS_GENERIC_ENUMERATION_SCAN
RECOVERY_TAG = archive/main-tree/batch-20260830-001
RECOVERY_PATH = docs/C2_C_1_WALLET_PRODUCT_IDENTITY_SPATIAL_REDESIGN.md
DELETION_AUTHORIZED = NO
```

### 3.3 Beta image pipeline

```text
PATH = docs/C2_D_1_BETA_IMAGE_PIPELINE.md
BLOB_SHA = 8116d6b6bda99d5c8b2d15a23478cb80a696ff08
CLASSIFICATION = RETIREABLE_HISTORICAL
RETIREMENT_REASON = SUPERSEDED_HISTORICAL_FEATURE_DESIGN_EVIDENCE_WITH_NO_CURRENT_EXACT_TREE_CONSUMER
CURRENT_CONSUMERS = NONE_FOUND
CONSUMER_DISPOSITION = NOT_A_LIVE_INVARIANT
LIVE_INVARIANT_REPLACEMENT = NONE_REQUIRED
AUDIT_METHOD = EXACT_CHECKED_OUT_TREE_GIT_GREP_PLUS_GENERIC_ENUMERATION_SCAN
RECOVERY_TAG = archive/main-tree/batch-20260830-001
RECOVERY_PATH = docs/C2_D_1_BETA_IMAGE_PIPELINE.md
DELETION_AUTHORIZED = NO
```

### 3.4 Merchant-local moderation

```text
PATH = docs/C2_E_MERCHANT_LOCAL_MODERATION.md
BLOB_SHA = 87a87ac5066d1a61aeea12cfa3faeb9a7ae4cc73
CLASSIFICATION = RETIREABLE_HISTORICAL
RETIREMENT_REASON = SUPERSEDED_HISTORICAL_FEATURE_DESIGN_EVIDENCE_WITH_NO_CURRENT_EXACT_TREE_CONSUMER
CURRENT_CONSUMERS = NONE_FOUND
CONSUMER_DISPOSITION = NOT_A_LIVE_INVARIANT
LIVE_INVARIANT_REPLACEMENT = NONE_REQUIRED
AUDIT_METHOD = EXACT_CHECKED_OUT_TREE_GIT_GREP_PLUS_GENERIC_ENUMERATION_SCAN
RECOVERY_TAG = archive/main-tree/batch-20260830-001
RECOVERY_PATH = docs/C2_E_MERCHANT_LOCAL_MODERATION.md
DELETION_AUTHORIZED = NO
```

### 3.5 Onboarding durability/recovery

```text
PATH = docs/C2_F_ONBOARDING_DURABILITY_RECOVERY.md
BLOB_SHA = 9a0f92a4888fd7d7d2817d65b513d46874f7cae8
CLASSIFICATION = RETIREABLE_HISTORICAL
RETIREMENT_REASON = SUPERSEDED_HISTORICAL_FEATURE_DESIGN_EVIDENCE_WITH_NO_CURRENT_EXACT_TREE_CONSUMER
CURRENT_CONSUMERS = NONE_FOUND
CONSUMER_DISPOSITION = NOT_A_LIVE_INVARIANT
LIVE_INVARIANT_REPLACEMENT = NONE_REQUIRED
AUDIT_METHOD = EXACT_CHECKED_OUT_TREE_GIT_GREP_PLUS_GENERIC_ENUMERATION_SCAN
RECOVERY_TAG = archive/main-tree/batch-20260830-001
RECOVERY_PATH = docs/C2_F_ONBOARDING_DURABILITY_RECOVERY.md
DELETION_AUTHORIZED = NO
```

### 3.6 Payment backup/restore

```text
PATH = docs/C2_G_1_PAYMENT_BACKUP_RESTORE.md
BLOB_SHA = 39a4fda4220cc0a0877b0d55df30184becf4ad53
CLASSIFICATION = RETIREABLE_HISTORICAL
RETIREMENT_REASON = SUPERSEDED_HISTORICAL_OPERATIONAL_DESIGN_EVIDENCE_WITH_NO_CURRENT_EXACT_TREE_CONSUMER
CURRENT_CONSUMERS = NONE_FOUND
CONSUMER_DISPOSITION = NOT_A_LIVE_INVARIANT
LIVE_INVARIANT_REPLACEMENT = NONE_REQUIRED
AUDIT_METHOD = EXACT_CHECKED_OUT_TREE_GIT_GREP_PLUS_GENERIC_ENUMERATION_SCAN
RECOVERY_TAG = archive/main-tree/batch-20260830-001
RECOVERY_PATH = docs/C2_G_1_PAYMENT_BACKUP_RESTORE.md
DELETION_AUTHORIZED = NO
```

## 4. Explicit Batch-001 exclusion

The following initially considered file is explicitly **not** part of Batch-001:

```text
PATH = docs/HIVE_BAR_M15_UI_UX_MODERNIZATION_SPECIFICATION_0_1_0.md
BLOB_SHA = 6a9ee7b6fb31542cafc499ff3e265ec7e2ba24f0
CLASSIFICATION = PINNED_HISTORICAL_DEPENDENCY
CURRENT_CONSUMERS = 4_EXACT_HISTORICAL_GOVERNING_SPEC_REFERENCES
BATCH_001 = EXCLUDED
DELETION_AUTHORIZED = NO
```

Its four exact consumers are preserved in Section 2.1. No consumer migration or semantic rewrite is authorized by this docket.

## 5. Audit limitations and bounded inference

The accepted evidence establishes that no **tracked exact path/filename consumer** and no scanned generic docs-enumeration surface exists for the six candidates in the exact audit baseline tree.

It does not claim that the historical concepts described in those files have ceased to influence later implementation. Current code/tests may embody accepted behavior that was once motivated by them without literally consuming the documents. That is not a reason to keep every original design record in the living tree because the accepted runtime/tests remain current local authorities and the historical blobs remain recoverable through Git history and, before deletion, the required archive checkpoint.

No claim is made that GitHub indexed search is complete.

## 6. Required checkpoint-authorization boundary

If this docket is accepted, the next archive-specific operation is **not deletion**.

The Project Lead must first observe the accepted docket's exact identities:

```text
DOCKET_FREEZE_COMMIT = TO_BE_OBSERVED_AFTER_CANONICALIZATION
DOCKET_FREEZE_TREE = TO_BE_OBSERVED_AFTER_CANONICALIZATION
DOCKET_BLOB_SHA = TO_BE_OBSERVED_AFTER_CANONICALIZATION
DOCKET_EXACT_PARENT = TO_BE_OBSERVED_AFTER_CANONICALIZATION
```

A separate checkpoint-authorization record must then bind those identities and choose the exact checkpoint commit/tree permitted for:

```text
archive/main-tree/batch-20260830-001
```

That record must retain:

```text
TAG_CREATION_AUTHORIZED = explicit separate decision
FILE_DELETION_AUTHORIZED = NO
```

until the annotated tag has been created and independently verified.

## 7. Tag execution requirements

If checkpoint authorization is later accepted, annotated tag creation may use the repository's proven temporary GitHub Actions authenticated-Git pattern.

The mutation workflow must be separately qualified and must, at minimum:

- use narrowly scoped `contents: write`;
- pin checkout/action SHAs;
- fetch full history/tags;
- dry-run on PR;
- mutate only on push to exact canonical `main`;
- fresh-fetch and verify the event commit equals canonical `main`;
- verify the expected archive tag is absent or already exact;
- create an annotated tag, never a lightweight tag;
- push the exact tag ref;
- refetch and verify Git object type `tag`;
- peel to the authorized checkpoint commit/tree;
- verify this accepted docket at its recorded docket blob SHA;
- verify every six candidate paths at the exact blob SHAs in Section 3;
- stop without deletion on any mismatch;
- remove the temporary privileged workflow after successful independent verification.

## 8. Explicit non-effects

This docket does not authorize:

- deletion of any file;
- creation, movement, or deletion of any archive tag;
- migration or rewriting of the pinned M15 provenance cluster;
- force rewriting of Git history;
- modification of any Batch-001 historical candidate before checkpoint custody;
- application/runtime changes;
- production deployment or infrastructure mutation;
- Hive writes or account/authority changes;
- payment/onboarding/moderation/authentication authority changes;
- HV-6 implementation or dependency adoption;
- real second-venue admission;
- CID/IPNS publication;
- 3Speak/SPK integration;
- shared-runtime multi-tenancy.

## 9. Current hard stop

```text
BATCH_001_CONSUMER_AUDIT = PASS_FOR_SIX_C2_RECORDS
BATCH_001_DOCKET = FROZEN_IF_ACCEPTED
CHECKPOINT_AUTHORIZATION = NOT_YET_CREATED
ANNOTATED_CHECKPOINT_TAG = NOT_YET_CREATED
ANNOTATED_CHECKPOINT_TAG_VERIFIED = NO
FILE_DELETION_AUTHORIZED = NO

NEXT_ARCHIVE_STEP_AFTER_DOCKET_ACCEPTANCE =
OBSERVE_EXACT_DOCKET_IDENTITY_AND_FREEZE_SEPARATE_CHECKPOINT_AUTHORIZATION_RECORD
```
