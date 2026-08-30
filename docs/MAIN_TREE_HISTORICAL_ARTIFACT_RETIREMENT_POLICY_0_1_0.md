# Main-Tree Historical Artifact Retirement Policy 0.1.0

## 1. Status

```text
OPERATION = MAIN_TREE_HISTORICAL_ARTIFACT_RETIREMENT_POLICY
STATUS = FROZEN_PROJECT_LEAD_POLICY
REPOSITORY = etblink/Hive-Venues
POLICY_VERSION = 0.1.0
POLICY_BASE_COMMIT = 594bc8180c8fc1cd787146892f888a30fec94b9e
POLICY_BASE_TREE = 342eef6b91052177d732da7982fbe0f3c720e589

RETIREMENT_EXECUTION_AUTHORIZED_BY_POLICY_ALONE = NO
HISTORICAL_FILE_DELETION_AUTHORIZED_BY_POLICY_ALONE = NO
ARCHIVE_REF_TYPE = ANNOTATED_GIT_TAG
ARCHIVE_TAG_NAMESPACE = archive/main-tree/<retirement-id>
TAG_MUST_PRECEDE_FILE_DELETION = YES
TAG_MUST_BE_REFETCHED_AND_VERIFIED = YES
PER_PATH_BLOB_SHA_REQUIRED = YES
CONSUMER_AUDIT_REQUIRED = YES
LIVE_INVARIANT_MIGRATION_REQUIRED_BEFORE_RETIREMENT = YES
OFFLINE_CI_MAY_REQUIRE_ARCHIVE_TAG_FETCH = NO
PRODUCTION_MUTATION = NO
```

This policy establishes a scalable way to remove superseded historical evidence files from the **living `main` tree** without erasing, repudiating, or making their provenance difficult to recover.

It adapts the already accepted `HISTORICAL_REF_ARCHIVE_0_1_0.md` pattern from branch refs to files that are present in canonical history.

This policy is governance only. It does not retire, move, rewrite, or delete any historical file by itself.

## 2. Why retirement is needed

Hive-Venues intentionally preserves a large body of inherited Hive-Bar milestone evidence and successor governance evidence. Keeping that history reachable is valuable. Keeping every historical artifact permanently present in the current working tree is not necessarily valuable.

As the repository grows, a permanently accumulating living tree creates avoidable costs:

- slower human navigation;
- noisier code/document search;
- harder distinction between current authority and historical evidence;
- more accidental mechanical coupling to superseded documents;
- larger maintenance surfaces for navigation and coherence checks;
- increased risk that an old document is mistaken for current routing merely because it is easy to find on `main`.

The goal is therefore:

```text
PRESERVE_HISTORY_AND_RECOVERY
+
REDUCE_LIVING_TREE_NOISE
+
KEEP_CURRENT_INVARIANTS_OFFLINE_AND_LOCAL
```

not:

```text
DELETE_HISTORY
OR
HIDE_REJECTED_EVIDENCE
OR
REWRITE_PRIOR_GOVERNANCE
```

## 3. Core distinction: Git history versus living tree

Deleting a path in a later Git commit does not erase the earlier blob or earlier commit history.

However, this project requires more than incidental Git reachability. Before any bounded retirement batch removes files from current `main`, the exact pre-retirement state must also receive a deliberate immutable archive checkpoint ref.

The checkpoint ref provides a stable human- and machine-addressable recovery point even after the living tree advances.

Therefore:

```text
CURRENT_MAIN = living operational/source/navigation surface
ARCHIVE_CHECKPOINT_TAG = exact complete pre-retirement tree
RETIREMENT_DOCKET = per-path provenance and recovery ledger
GIT_HISTORY = underlying immutable source history
```

These roles are complementary.

## 4. Archive checkpoint standard

Every retirement batch must have one unique retirement ID.

Recommended format:

```text
retirement-id = batch-YYYYMMDD-NNN
```

The archive tag must be:

```text
archive/main-tree/<retirement-id>
```

Example:

```text
archive/main-tree/batch-20260830-001
```

The archive ref must be an **annotated Git tag**, not a lightweight tag and not a branch alias.

The annotated tag must point to the exact canonical pre-retirement checkpoint commit that contains:

1. every historical file proposed for deletion;
2. the final accepted retirement docket for that batch;
3. any already-completed migration of live invariants away from the files being retired;
4. the exact living navigation state against which deletion is being performed.

The tag annotation should name:

- retirement ID;
- exact checkpoint commit;
- exact checkpoint tree;
- canonical retirement-docket path;
- statement that the tag preserves the full pre-retirement tree and is immutable by project policy.

Archive checkpoint tags are immutable by project policy. Moving or deleting one requires a separately reviewed provenance operation.

## 5. Mandatory retirement phases

A retirement batch must proceed through the following gates in order.

### Phase A — read-only inventory and consumer audit

Before mutation, enumerate candidate paths and classify every candidate.

For each path, inspect at least:

- current living documentation references;
- scripts and machine checks;
- deterministic tests;
- rendered/visual tests and evidence harnesses;
- CI/workflow references;
- production/deployment/runbook references;
- source comments or fixtures that use the artifact as a semantic source;
- current governance/navigation documents;
- successor historical records that bind exact path identity.

A file is not retireable merely because it is old, superseded, or historical.

The Post-HV-5 routing reconciliation supplied a concrete counterexample: historical M17/M18/M19 documentation language still had active regression-test consumers. Those consumers had to be preserved rather than casually removed.

### Phase B — live-invariant migration

If a historical artifact still carries a **current** invariant, that invariant must be moved to an appropriate current authority before the source evidence file may retire.

Acceptable replacement surfaces include:

- current code tests;
- compact invariant ledgers;
- current release/deployment checks;
- living operational documentation;
- current architecture/ownership contracts;
- other small current machine-readable or human-readable authorities.

The replacement must preserve meaning without pretending the historical source never existed.

No deterministic gate may require network access or archive-tag checkout merely to validate current source.

Therefore:

```text
ARCHIVE_TAG = forensic/recovery evidence
CURRENT_LEDGER_OR_TEST = live invariant authority
```

and never:

```text
NORMAL_CI -> network fetch of archive tag -> historical document parsing
```

### Phase C — canonical retirement docket

After consumer audit and any required invariant migrations are accepted, create a canonical retirement docket while all proposed-to-retire files are still present on `main`.

The docket must be a normal file in the living tree and must be included in the eventual checkpoint tag.

Minimum per-path fields:

```text
PATH
BLOB_SHA
CLASSIFICATION
RETIREMENT_REASON
CURRENT_CONSUMERS
CONSUMER_DISPOSITION
LIVE_INVARIANT_REPLACEMENT
RECOVERY_TAG
RECOVERY_PATH
DELETION_AUTHORIZED = NO|PENDING|YES
```

The docket must also bind:

```text
RETIREMENT_ID
DOCKET_VERSION
CANONICAL_DOCKET_COMMIT
CANONICAL_DOCKET_TREE
EXPECTED_CHECKPOINT_TAG
EXPECTED_CHECKPOINT_COMMIT
EXPECTED_CHECKPOINT_TREE
```

The docket itself does not authorize deletion unless a later explicit Project Lead execution authorization says so.

### Phase D — annotated checkpoint tag creation and verification

Only after the docket and any prerequisite migrations are canonical may the archive checkpoint tag be created.

Before any file deletion:

1. the tag name must be absent or already resolve to the exact authorized checkpoint;
2. create the annotated tag when absent;
3. re-fetch the tag ref;
4. verify the ref points to a Git object of type `tag`;
5. read the annotated tag object;
6. verify the tag peels to the exact docket checkpoint commit;
7. verify that commit's tree equals the exact expected checkpoint tree;
8. verify every docketed path at that checkpoint resolves to the recorded blob SHA.

If any one of those checks fails:

```text
RETIREMENT_EXECUTION = STOP
FILE_DELETION = FORBIDDEN
```

### Phase E — bounded deletion candidate

Only after the checkpoint tag has independently verified may a separate retirement branch remove the exact docketed paths authorized for that batch.

The deletion candidate may additionally update:

- living navigation that should no longer enumerate retired paths;
- current historical-artifact index/ledger;
- machine checks that must assert the new living-tree absence/presence contract.

It may not introduce unrelated substantive product work.

### Phase F — qualification and clean canonical integration

The deletion candidate must pass the repository's changed-path classifier and all required deterministic gates on Ubuntu and Windows.

Rendered qualification is required only if the changed-path classifier or actual content changes make it relevant.

Live-Hive access remains separately gated and should normally be unnecessary for documentation retirement.

If construction history is multi-commit, the Project Lead should prefer the established exact-tree transfer pattern:

```text
QUALIFIED_PR_TREE
== SYNTHETIC_MERGE_TREE
== CLEAN_CANONICAL_RETIREMENT_TREE
```

with one clean canonical retirement commit when commit-independence has been established.

### Phase G — post-retirement verification

After canonical integration:

- verify current `main` exact commit/tree;
- verify all authorized retired paths are absent from current `main`;
- verify non-docketed paths are not accidentally deleted;
- re-fetch and verify the archive checkpoint tag again;
- verify the archived checkpoint still exposes every retired path at its recorded blob SHA;
- verify current deterministic gates do not need archive/network access;
- record the final canonical retirement commit/tree in the docket or a bounded completion record.

## 6. Classification model

Every candidate must receive one primary classification.

### `KEEP_LIVING`

Current product/developer/operational/navigation authority. Do not retire.

Examples include the current README, living roadmap, current documentation index, current production runbook, and active preregistration/authorization records.

### `KEEP_CANONICAL_CONTRACT`

A durable accepted architecture, safety, schema, protocol, deployment, or governance contract that should remain easy to inspect on `main` even if not the newest routing document.

Retirement requires a separate explicit decision, not ordinary historical cleanup.

### `PINNED_HISTORICAL_DEPENDENCY`

Historical evidence that is still directly consumed by tests, scripts, CI, runbooks, active provenance checks, or current semantics.

It may become retireable only after the consumer is deliberately migrated or removed for independently justified reasons.

### `RETIREABLE_HISTORICAL`

Historical evidence with no remaining current semantic, machine, operational, or navigation dependency after audit.

It may be listed in a retirement docket, subject to checkpoint-tag and explicit execution authorization.

### `SOURCE_LINEAGE_PROTECTED`

Evidence whose easy presence on current `main` is still important to source-lineage, licensing, legal, security-response, custody, or recovery obligations.

Do not retire under a routine batch.

### `REJECTED_OR_EXPLORATORY_EVIDENCE`

Historical rejected, exploratory, or superseded evidence. This classification does **not** imply automatic retirement. Preserve it when it remains relevant to why a path was rejected, a safety rule exists, or a later clean candidate differs.

If unconsumed and fully recoverable through the checkpoint, it can also receive a docket disposition of `RETIREABLE_AFTER_AUDIT`.

## 7. Consumer-audit rule

The consumer audit is fail-closed.

If it is unclear whether a file is consumed:

```text
CLASSIFICATION = PINNED_HISTORICAL_DEPENDENCY
```

until the ambiguity is resolved.

Search-index absence alone is insufficient evidence of no consumer. Exact source/test/workflow inspection should be preferred where practical.

Consumer categories should be recorded explicitly:

```text
LIVING_NAVIGATION
SCRIPT_OR_MACHINE_CHECK
DETERMINISTIC_TEST
RENDERED_TEST_OR_HARNESS
CI_WORKFLOW
PRODUCTION_OR_DEPLOYMENT_RUNBOOK
SOURCE_FIXTURE_OR_COMMENT
GOVERNANCE_BINDING
NONE_FOUND
```

## 8. Active invariant migration rule

Retirement must never lower assurance by deleting the only local expression of a still-current rule.

Before a `PINNED_HISTORICAL_DEPENDENCY` can become `RETIREABLE_HISTORICAL`, the docket must identify exactly what happened to each consumer:

```text
MIGRATED_TO_CURRENT_AUTHORITY
SUPERSEDED_BY_ACCEPTED_CURRENT_AUTHORITY
REMOVED_AS_PROVEN_REDUNDANT
NOT_A_LIVE_INVARIANT
```

Any migration must qualify before the checkpoint tag is created.

The historical document can then retire as evidence because the live rule survives independently in the current tree.

## 9. Recovery contract

Every retired file must remain recoverable by exact tag and path.

Canonical recovery form:

```text
git show archive/main-tree/<retirement-id>:<path>
```

Full archived-tree inspection:

```text
git ls-tree -r archive/main-tree/<retirement-id>
```

Exact blob verification:

```text
git rev-parse archive/main-tree/<retirement-id>:<path>
```

The docket's recorded blob SHA must match that value.

Reintroducing a retired file into current `main` is not a restoration side effect. It is a new reviewed source change and must preserve the original provenance reference.

## 10. Docket batching guidance

Prefer bounded, coherent batches rather than deleting hundreds of files at once.

A first batch should favor candidates that are:

- clearly historical;
- large/noisy enough that retirement materially improves navigation;
- demonstrably unconsumed;
- already preserved in the original Hive-Bar lineage or immutable Git history;
- not required by current release/deployment/security checks;
- not current successor contracts.

Do not mix ambiguous files into an otherwise clean batch merely to maximize deletion count.

## 11. Current known pinned examples

At policy freeze time, at least the following are known to have live consumers and therefore must **not** be assumed retireable:

```text
docs/M17_4_FUNCTIONAL_V1_BASELINE.md
docs/M19_1_COPY_AND_ONBOARDING_READINESS.md
```

More generally, `scripts/check-release-coherence.js`, `scripts/check-functional-v1-baseline.js`, and multiple M17/M18/M19 tests currently bind historical evidence and living historical-navigation language.

These are examples, not an exhaustive list. The first retirement docket must perform a fresh path-by-path consumer audit.

## 12. Relationship to branch archive policy

`HISTORICAL_REF_ARCHIVE_0_1_0.md` remains the accepted policy/evidence for divergent active branch refs archived as annotated tags under:

```text
archive/branch/<original-branch-name>
```

This policy uses a separate namespace:

```text
archive/main-tree/<retirement-id>
```

The distinction is intentional:

- branch archive tags preserve a divergent branch tip before active-ref removal;
- main-tree checkpoint tags preserve a complete canonical pre-retirement tree before path removal.

Neither mechanism canonizes, merges, rewrites, or semantically endorses historical content merely by preserving it.

## 13. Tag-creation capability boundary

Actual file retirement requires a tool or operator capable of creating **annotated Git tag objects and refs** and then independently verifying them.

A lightweight tag, temporary branch, GitHub release, PR ref, or prose-only commit reference is not an acceptable substitute.

If the available execution environment cannot create and verify the required annotated checkpoint tag:

```text
POLICY_AND_DOCKET_WORK = ALLOWED
LIVE_INVARIANT_MIGRATION = ALLOWED_IF_SEPARATELY_AUTHORIZED
HISTORICAL_FILE_DELETION = HARD_STOP
```

The absence of tag-write capability must never be bypassed by weakening the checkpoint requirement.

## 14. Explicit non-effects

This policy does not authorize:

- deletion of any current or historical file;
- movement or deletion of an existing archive tag;
- force rewriting of canonical history;
- rewriting historical documents to sound current;
- deletion of rejected/adverse evidence because it is inconvenient;
- changes to application/runtime semantics;
- deployment, DNS, VPS, Caddy, systemd, or production mutation;
- Hive account/community/authority changes;
- payment, onboarding, moderation, authentication, or private-key authority changes;
- HV-6 implementation;
- GrapesJS dependency adoption;
- real second-venue admission;
- CID/IPNS publication;
- 3Speak/SPK integration;
- shared-runtime multi-tenancy.

## 15. First execution boundary

After this policy is accepted, the next archive-specific operation should be a **read-only / no-deletion first retirement-batch docket and consumer audit**.

Recommended operation:

```text
MAIN_TREE_RETIREMENT_BATCH_001_DOCKET_AND_CONSUMER_AUDIT
```

That operation may classify candidate paths and, if separately authorized, prepare prerequisite invariant migrations. It may not delete historical files.

Actual deletion remains blocked until:

```text
POLICY_ACCEPTED
+
BATCH_DOCKET_ACCEPTED
+
ALL_REQUIRED_LIVE_INVARIANT_MIGRATIONS_ACCEPTED
+
ANNOTATED_CHECKPOINT_TAG_CREATED
+
ANNOTATED_CHECKPOINT_TAG_REFETCHED_AND_VERIFIED
+
SEPARATE_RETIREMENT_EXECUTION_AUTHORIZATION
```

Only then may a bounded deletion candidate exist.
