# Main-Tree Retirement Batch-001 Checkpoint Authorization 0.1.0

## 1. Status

```text
OPERATION = MAIN_TREE_RETIREMENT_BATCH_001_CHECKPOINT_AUTHORIZATION
STATUS = FROZEN_CHECKPOINT_AUTHORIZATION__FILE_DELETION_NOT_AUTHORIZED
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
DOCKET_EXACT_PARENT = a6ca632bcaa57fc0ca05b9250a608f6a34d6b36b

EXPECTED_CHECKPOINT_TAG = archive/main-tree/batch-20260830-001
AUTHORIZED_CHECKPOINT_COMMIT = 5753918b653e5ea4e860c29fd342252a934b40c3
AUTHORIZED_CHECKPOINT_TREE = fff9ab7827f66902bf2a3a6ea0273badd92805bf
TAG_OBJECT_TYPE_REQUIRED = annotated
TAG_CREATION_AUTHORIZED = YES
FILE_DELETION_AUTHORIZED = NO
PRODUCTION_MUTATION = NO
```

This record authorizes one bounded provenance operation only: creation and verification of an annotated Git tag named `archive/main-tree/batch-20260830-001` pointing to the exact already-existing Batch-001 docket-freeze commit.

It does not authorize removal of any historical file.

## 2. Why this target is non-self-referential

Policy 0.1.1 requires the checkpoint target to be an already-existing exact commit/tree whose identities can be known before tag creation. The docket-freeze commit satisfies that requirement.

The checkpoint authorization record itself is intentionally a later commit and therefore is not part of the tagged checkpoint tree. It authorizes the exact prior checkpoint without attempting to make its own containing commit/tree part of the target identity.

The authorized checkpoint contains:

- the accepted governing retirement policy lineage;
- the accepted Batch-001 docket at the exact docket blob SHA;
- all six proposed retirement candidates at their audited blob SHAs;
- the pre-retirement living tree before any candidate file deletion.

## 3. Exact archived candidate custody required

Before and after tag creation, the authorized checkpoint must resolve these paths exactly:

```text
PATH = docs/C2_C_1_WALLET_PRODUCT_IDENTITY_SPATIAL_REDESIGN.md
BLOB_SHA = 2ea7578d2832e82601de2c53787375d404fb3f99

PATH = docs/C2_C_WALLET_SEMANTIC_REDESIGN.md
BLOB_SHA = 458149dbfcc2dfc4bb0c76ebdf6ee00c1a120953

PATH = docs/C2_D_1_BETA_IMAGE_PIPELINE.md
BLOB_SHA = 8116d6b6bda99d5c8b2d15a23478cb80a696ff08

PATH = docs/C2_E_MERCHANT_LOCAL_MODERATION.md
BLOB_SHA = 87a87ac5066d1a61aeea12cfa3faeb9a7ae4cc73

PATH = docs/C2_F_ONBOARDING_DURABILITY_RECOVERY.md
BLOB_SHA = 9a0f92a4888fd7d7d2817d65b513d46874f7cae8

PATH = docs/C2_G_1_PAYMENT_BACKUP_RESTORE.md
BLOB_SHA = 39a4fda4220cc0a0877b0d55df30184becf4ad53
```

The excluded M15 modernization specification is not authorized for retirement and is not part of the six-path deletion scope.

## 4. Authorized tag annotation semantics

The annotated tag message must bind at least:

```text
RETIREMENT_ID = batch-20260830-001
CHECKPOINT_COMMIT = 5753918b653e5ea4e860c29fd342252a934b40c3
CHECKPOINT_TREE = fff9ab7827f66902bf2a3a6ea0273badd92805bf
RETIREMENT_DOCKET_PATH = docs/MAIN_TREE_RETIREMENT_BATCH_001_DOCKET_0_1_0.md
RETIREMENT_DOCKET_BLOB_SHA = f3954d477a9448b14bfa6557921ac5e72606073c
CHECKPOINT_AUTHORIZATION_RECORD_PATH = docs/MAIN_TREE_RETIREMENT_BATCH_001_CHECKPOINT_AUTHORIZATION_0_1_0.md
IMMUTABLE_BY_PROJECT_POLICY = YES
```

No deterministic tag-object SHA is preregistered because an annotated tag object also binds tagger metadata. Correctness is instead established through object type, annotation semantics, peeled commit/tree, docket identity, and candidate blob verification.

## 5. Authorized execution mechanism

A temporary GitHub Actions workflow may serve as the authenticated Git substrate under the already accepted bounded-workflow lifecycle:

```text
TEMPORARY_CAPABILITY
-> PR_DRY_RUN
-> QUALIFY
-> CANONICALIZE_EXACT_WORKFLOW
-> PUSH_TO_CANONICAL_MAIN_EXECUTES_AUTHENTICATED_GIT_MECHANICS
-> INDEPENDENTLY_VERIFY_TAG_OBJECT_AND_POSTCONDITIONS
-> REMOVE_PRIVILEGED_WORKFLOW
```

The workflow must:

- use only narrowly scoped `contents: write`;
- pin checkout/action SHAs;
- fetch sufficient full Git history and tags;
- persist credentials only for the bounded authenticated tag push;
- perform dry-run verification only on pull requests;
- permit mutation only on `push` to `refs/heads/main`;
- freshly fetch canonical `main` and refuse mutation unless the workflow event commit equals exact canonical `main`;
- verify the authorized checkpoint commit/tree, docket blob, and all six candidate blobs before mutation;
- verify the expected tag is absent, or if already present, require it to be an annotated tag peeling to the exact authorized checkpoint and then perform no replacement;
- create only an annotated tag, never a lightweight tag;
- push only the expected tag ref;
- re-fetch and verify Git object type `tag`, required annotation semantics, peeled commit/tree, docket blob, and all six candidate blobs;
- perform no file deletion;
- perform no unrelated ref mutation;
- stop fail-closed on every mismatch.

After successful independent verification, the privileged workflow must be removed from canonical `main` in a separate bounded teardown operation.

## 6. Explicit non-effects

This authorization does not authorize:

- deletion or modification of any Batch-001 candidate file;
- retirement of the pinned M15 specification;
- force-pushing or rewriting history;
- moving or replacing an existing conflicting archive tag;
- branch deletion;
- application/runtime changes;
- production deployment or infrastructure mutation;
- Hive account, authority, signing, or transaction mutation;
- payment/onboarding/moderation/authentication changes;
- HV-6 implementation;
- GrapesJS dependency adoption;
- real second-venue admission;
- CID/IPNS publication;
- 3Speak/SPK integration;
- shared-runtime multi-tenancy.

## 7. Hard stop after tag verification

Even after successful annotated-tag creation and verification:

```text
CHECKPOINT_TAG_VERIFIED = YES
FILE_DELETION_AUTHORIZED = NO
```

A separate Project Lead retirement-execution authorization must bind the verified tag object/ref/peeled checkpoint and explicitly name the six deletable paths before a deletion candidate may be canonically integrated.
