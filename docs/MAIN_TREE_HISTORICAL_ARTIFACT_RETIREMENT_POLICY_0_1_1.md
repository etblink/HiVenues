# Main-Tree Historical Artifact Retirement Policy 0.1.1

## 1. Status and corrective scope

```text
OPERATION = MAIN_TREE_HISTORICAL_ARTIFACT_RETIREMENT_POLICY
STATUS = CORRECTIVE_SUPERSEDING_PROJECT_LEAD_POLICY
REPOSITORY = etblink/Hive-Venues
POLICY_VERSION = 0.1.1
SUPERSEDES_POLICY_VERSION = 0.1.0
SUPERSEDED_POLICY_PATH = docs/MAIN_TREE_HISTORICAL_ARTIFACT_RETIREMENT_POLICY_0_1_0.md
SUPERSEDED_POLICY_BLOB_SHA = 20fdc93086fcca679b16d646d98f88bd854c7c8b
POLICY_0_1_1_BASE_COMMIT = d069e76b971f64f7bea2434163e769bc9b1e678c
POLICY_0_1_1_BASE_TREE = 609f8e1a6591742627990909fbc8fb2bf2c100bc

CORRECTION_REASON = REMOVE_CRYPTOGRAPHICALLY_SELF_REFERENTIAL_DOCKET_IDENTITY_REQUIREMENT
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

Policy 0.1.0 correctly established the retirement architecture and safety boundary, but its Phase-C docket contract required a docket file to contain `CANONICAL_DOCKET_COMMIT` and `CANONICAL_DOCKET_TREE` for the commit/tree containing that same docket. That requirement is impossible to satisfy exactly: inserting the containing tree or commit identity changes the docket blob, which changes the tree and therefore the commit.

This 0.1.1 policy preserves the substantive 0.1.0 safeguards and corrects only the provenance-binding mechanics. The exact docket commit/tree/blob are now bound **after the docket exists and qualifies**, in a separate checkpoint-authorization record. No requirement is weakened: the archive tag still may not be created until the exact docket freeze identity is known, and no historical file may be deleted until the annotated tag and every docketed archived blob have been independently verified.

Policy 0.1.0 remains immutable historical evidence of the original policy freeze. Policy 0.1.1 governs all retirement operations after its acceptance.

## 2. Purpose

Hive-Venues intentionally preserves substantial inherited Hive-Bar and successor evidence. Git history should remain exact and recoverable, but every historical artifact does not need to remain indefinitely in the current working tree.

The policy objective is:

```text
PRESERVE_HISTORY_AND_RECOVERY
+
REDUCE_LIVING_TREE_NOISE
+
KEEP_CURRENT_INVARIANTS_OFFLINE_AND_LOCAL
+
MAKE_EVERY_RETIREMENT_REVERSIBLE_AND_AUDITABLE
```

It is not:

```text
DELETE_HISTORY
OR
HIDE_REJECTED_OR_ADVERSE_EVIDENCE
OR
REWRITE_PRIOR_GOVERNANCE
OR
WEAKEN_CURRENT_ASSURANCE
```

Deleting a path from a later `main` commit is permitted only after a deliberate immutable checkpoint ref preserves the exact full pre-retirement tree and the current tree no longer depends on the retiring artifact for a live invariant.

## 3. Provenance roles

```text
CURRENT_MAIN = living operational/source/navigation surface
ARCHIVE_CHECKPOINT_TAG = exact complete pre-retirement tree
RETIREMENT_DOCKET = per-path proposed-retirement provenance and consumer ledger
CHECKPOINT_AUTHORIZATION_RECORD = post-docket exact identity binding and tag authorization
RETIREMENT_COMPLETION_RECORD = post-deletion canonical result and recovery verification
GIT_HISTORY = underlying immutable source history
```

These surfaces are complementary and must not be conflated.

The docket describes **what is proposed** before its own final Git identity exists. The later checkpoint-authorization record binds **the exact accepted docket object and containing checkpoint** after those identities are objectively available.

## 4. Archive checkpoint standard

Every retirement batch must have one unique retirement ID.

Recommended form:

```text
batch-YYYYMMDD-NNN
```

The corresponding checkpoint tag is:

```text
archive/main-tree/<retirement-id>
```

The archive ref must be an **annotated Git tag**, not a lightweight tag, branch alias, PR ref, GitHub Release, or prose-only SHA reference.

The annotated tag must point to the exact authorized pre-retirement checkpoint commit containing:

1. every path proposed for retirement;
2. the accepted retirement docket;
3. all accepted prerequisite live-invariant migrations, if any;
4. the exact living navigation state against which deletion will occur;
5. the accepted checkpoint-authorization record when the chosen sequencing makes that record part of the checkpoint tree, or otherwise an authorization record that unambiguously binds the exact checkpoint target before tag creation.

The tag annotation must name at least:

```text
RETIREMENT_ID
CHECKPOINT_COMMIT
CHECKPOINT_TREE
RETIREMENT_DOCKET_PATH
RETIREMENT_DOCKET_BLOB_SHA
CHECKPOINT_AUTHORIZATION_RECORD_PATH
IMMUTABLE_BY_PROJECT_POLICY = YES
```

Archive checkpoint tags are immutable by project policy. Moving or deleting one requires a separately reviewed provenance operation.

## 5. Mandatory phases

A retirement batch proceeds through these gates in order.

### Phase A — read-only inventory and consumer audit

For each candidate, establish its exact path/blob identity and inspect at least:

- living navigation;
- scripts and machine checks;
- deterministic tests;
- rendered/visual tests and evidence harnesses;
- CI/workflows;
- production/deployment/runbooks;
- source fixtures/comments that treat the file as semantic authority;
- governance records that bind exact path identity;
- generic file-enumeration machinery that may consume documents without naming them literally.

A file is not retireable merely because it is old, superseded, large, inconvenient, or absent from search-index results.

The audit is fail-closed. If consumption is ambiguous:

```text
CLASSIFICATION = PINNED_HISTORICAL_DEPENDENCY
```

until resolved.

### Phase B — live-invariant migration

If a historical artifact still carries a current invariant, that invariant must be moved to an appropriate current local authority before the evidence file may retire.

Acceptable current authorities include:

- current code tests;
- compact invariant ledgers;
- current release/deployment checks;
- living operational documentation;
- current architecture/ownership contracts.

The migration must qualify independently before the retirement checkpoint is frozen.

Normal deterministic CI may not require fetching an archive tag or historical document over the network.

```text
ARCHIVE_TAG = forensic/recovery evidence
CURRENT_LOCAL_AUTHORITY = live invariant authority
```

### Phase C — canonical retirement docket freeze

After the consumer audit and any required migrations, create a docket while all proposed-to-retire files remain present in `main`.

The docket must bind only identities that can exist without self-reference.

Required batch-level fields:

```text
RETIREMENT_ID
DOCKET_VERSION
DOCKET_PATH
POLICY_VERSION
POLICY_PATH
AUDIT_BASE_COMMIT
AUDIT_BASE_TREE
AUDIT_EVIDENCE
EXPECTED_CHECKPOINT_TAG
DELETION_AUTHORIZED = NO
CHECKPOINT_TAG_CREATION_AUTHORIZED = NO
```

Required per-path fields:

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
DELETION_AUTHORIZED = NO
```

The docket **must not** attempt to contain any of these self-referential values for the commit/tree that contains itself:

```text
CANONICAL_DOCKET_COMMIT
CANONICAL_DOCKET_TREE
CHECKPOINT_COMMIT
CHECKPOINT_TREE
```

Those identities are intentionally unknown until after the docket freeze commit exists.

The docket itself authorizes neither tag creation nor deletion.

### Phase D — docket qualification and exact identity observation

The docket candidate must pass the repository's changed-path classifier and all required deterministic Ubuntu/Windows gates.

After qualification, the Project Lead must observe and record externally:

```text
DOCKET_FREEZE_COMMIT
DOCKET_FREEZE_TREE
DOCKET_BLOB_SHA
DOCKET_EXACT_PARENT
```

If construction history is multi-commit and commit-independence is established, use the established exact-tree reconstruction pattern so the accepted docket can be a clean direct child of the intended canonical base.

Only after that clean docket identity exists may the next record be constructed.

### Phase E — checkpoint-authorization record

Create a separate immutable record that binds the now-known docket and checkpoint identities.

Required fields include:

```text
RETIREMENT_ID
POLICY_VERSION
DOCKET_PATH
DOCKET_FREEZE_COMMIT
DOCKET_FREEZE_TREE
DOCKET_BLOB_SHA
EXPECTED_CHECKPOINT_TAG
AUTHORIZED_CHECKPOINT_COMMIT
AUTHORIZED_CHECKPOINT_TREE
TAG_OBJECT_TYPE_REQUIRED = annotated
TAG_CREATION_AUTHORIZED = YES|NO
FILE_DELETION_AUTHORIZED = NO
```

The checkpoint-authorization record must identify the exact commit that the annotated tag is allowed to target.

The authorized checkpoint must still contain every docketed path at its recorded blob SHA and must contain the accepted docket. If prerequisite migrations were required, it must also contain those accepted migrations.

If including the checkpoint-authorization record itself in the tagged checkpoint would create another self-reference, the record must instead bind an already-existing exact checkpoint commit/tree and authorize creation of the tag against that pre-existing target. The authorization record's own later commit identity is not part of the target identity unless a non-self-referential sequencing construction proves otherwise.

No circular hash requirement may be introduced merely to make the authorization record appear self-contained.

### Phase F — annotated checkpoint tag creation and verification

Only after the checkpoint-authorization record is accepted may the tag be created.

Before any file deletion:

1. verify the tag name is absent or already resolves to the exact authorized checkpoint;
2. create an annotated tag when absent;
3. re-fetch the tag ref;
4. verify the ref points to an object of Git type `tag`;
5. inspect the annotated tag object;
6. peel it to the exact authorized checkpoint commit;
7. verify the checkpoint tree equals the authorized checkpoint tree;
8. verify the accepted docket exists at the authorized docket blob SHA;
9. verify every docketed path resolves to its recorded blob SHA;
10. verify the tag annotation binds the required retirement/checkpoint/docket identities.

If any check fails:

```text
RETIREMENT_EXECUTION = STOP
FILE_DELETION = FORBIDDEN
```

### Phase G — separate bounded deletion candidate

Only after the annotated checkpoint is independently verified may a separate branch remove exactly the paths later authorized for deletion.

The candidate may additionally update:

- living navigation that should no longer enumerate retired paths;
- a current historical-artifact index/ledger;
- machine checks that assert the new living-tree contract.

It may not introduce unrelated product work.

A separate explicit Project Lead retirement-execution authorization must exist before canonical deletion integration. A verified checkpoint is necessary but not sufficient authorization by itself.

### Phase H — qualification and clean canonical integration

The deletion candidate must pass all required deterministic Ubuntu/Windows gates. Rendered or live-Hive gates run only if the changed-path classifier or actual semantics require them.

Prefer clean exact-tree integration when construction history is multi-commit and the qualified result is commit-independent.

### Phase I — post-retirement verification

After canonical integration:

- verify exact current `main` commit/tree;
- verify only authorized docketed paths are absent;
- verify non-docketed paths were not accidentally removed;
- re-fetch and verify the archive tag again;
- verify every retired path remains recoverable through the tag at its docketed blob SHA;
- verify deterministic CI remains local/offline with respect to archive evidence;
- freeze a bounded completion record containing the final retirement commit/tree and recovery-verification result.

Do not rewrite the original docket to insert post-hoc commit identities. The docket remains the immutable pre-execution record; completion facts belong in the later completion record.

## 6. Classification model

Every candidate receives one primary classification.

### `KEEP_LIVING`

Current product, developer, operational, routing, or navigation authority. Do not retire.

### `KEEP_CANONICAL_CONTRACT`

A durable accepted architecture, safety, schema, protocol, deployment, or governance contract that should remain directly inspectable on `main`. Routine cleanup may not retire it.

### `PINNED_HISTORICAL_DEPENDENCY`

Historical evidence still directly consumed by tests, scripts, CI, runbooks, governance, provenance checks, or current semantics.

It may become retireable only after each live consumer is deliberately migrated, superseded by accepted current authority, or shown to be non-live for independently justified reasons.

### `RETIREABLE_HISTORICAL`

Historical evidence with no remaining current semantic, machine, operational, routing, or navigation dependency after exact-tree audit.

This classification permits inclusion in a docket. It does not itself authorize tag creation or deletion.

### `SOURCE_LINEAGE_PROTECTED`

Evidence whose direct presence remains important to licensing, legal, security-response, source-lineage, custody, or recovery obligations. Do not retire routinely.

### `REJECTED_OR_EXPLORATORY_EVIDENCE`

Rejected, exploratory, or superseded evidence. Rejection never implies automatic deletion. Preserve adverse/rejected evidence whenever it remains useful to explain a safety rule, rejected path, or later clean reconstruction.

## 7. Consumer categories and disposition

Record consumer categories explicitly:

```text
LIVING_NAVIGATION
SCRIPT_OR_MACHINE_CHECK
DETERMINISTIC_TEST
RENDERED_TEST_OR_HARNESS
CI_WORKFLOW
PRODUCTION_OR_DEPLOYMENT_RUNBOOK
SOURCE_FIXTURE_OR_COMMENT
GOVERNANCE_BINDING
GENERIC_ENUMERATION
NONE_FOUND
```

For a formerly pinned artifact, each consumer must receive one disposition before retirement:

```text
MIGRATED_TO_CURRENT_AUTHORITY
SUPERSEDED_BY_ACCEPTED_CURRENT_AUTHORITY
REMOVED_AS_PROVEN_REDUNDANT
NOT_A_LIVE_INVARIANT
```

Search-index absence alone is never sufficient evidence of `NONE_FOUND`. Prefer exact checked-out-tree inspection such as bounded `git grep`, direct path reads, and inspection of generic enumeration machinery.

## 8. Recovery contract

Every retired file remains recoverable by exact tag and path.

```text
git show archive/main-tree/<retirement-id>:<path>
git ls-tree -r archive/main-tree/<retirement-id>
git rev-parse archive/main-tree/<retirement-id>:<path>
```

The final command must equal the docket's recorded blob SHA.

Reintroducing a retired path into current `main` is a new reviewed source change, not an automatic restoration side effect. Its historical recovery ref must remain explicit.

## 9. Batching guidance

Prefer bounded coherent batches. A good first batch contains artifacts that are:

- clearly historical;
- materially noisy or large;
- demonstrably unconsumed by exact-tree audit;
- preserved in immutable Git history and the future checkpoint;
- not required by current release/deployment/security checks;
- not current successor contracts.

Do not mix ambiguous or pinned artifacts into a clean batch merely to increase deletion count.

A failed audit that reveals a dependency is useful evidence and should narrow the batch rather than trigger cosmetic rewrites intended only to make the audit pass.

## 10. Current known pinned examples

At the 0.1.1 corrective boundary, known pinned examples include at least:

```text
docs/M17_4_FUNCTIONAL_V1_BASELINE.md
docs/M19_1_COPY_AND_ONBOARDING_READINESS.md
docs/HIVE_BAR_M15_UI_UX_MODERNIZATION_SPECIFICATION_0_1_0.md
```

The M15 modernization specification is explicitly named as the governing specification by:

```text
docs/M15_2_APPLICATION_SHELL_AND_DESIGN_PRIMITIVES.md
docs/M15_3_CORE_SOCIAL_SURFACES.md
docs/M15_4_WALLET_PAY_MODERNIZATION.md
docs/M15_5_CROSS_PLATFORM_VISUAL_ACCEPTANCE.md
```

It is therefore outside routine Batch-001 retirement unless that M15 provenance cluster is later adjudicated as a coherent unit.

## 11. Relationship to historical branch archive policy

`HISTORICAL_REF_ARCHIVE_0_1_0.md` governs divergent historical branch refs preserved under:

```text
archive/branch/<original-branch-name>
```

This policy uses:

```text
archive/main-tree/<retirement-id>
```

Branch archive tags preserve divergent branch tips before active-ref removal. Main-tree checkpoint tags preserve complete canonical pre-retirement trees before path removal. Neither archive mechanism canonizes or semantically endorses historical content merely by preserving it.

## 12. Authenticated tag-execution capability

The lack of a direct connector action for annotated Git tag creation does **not** imply that tag creation is unavailable.

The repository already has a proven bounded GitHub Actions pattern in which Chat owns classification, exact identities, policy, fail-closed rules, qualification, and postconditions while an ephemeral workflow supplies authenticated Git mechanics.

A tag-creation operation may therefore use a temporary workflow only if it follows the established lifecycle:

```text
TEMPORARY_CAPABILITY
-> PR_DRY_RUN
-> QUALIFY
-> CANONICALIZE_EXACT_WORKFLOW
-> PUSH_TO_CANONICAL_MAIN_EXECUTES_AUTHENTICATED_GIT_MECHANICS
-> INDEPENDENTLY_VERIFY_TAG_OBJECT_AND_POSTCONDITIONS
-> REMOVE_PRIVILEGED_WORKFLOW
```

For any such workflow:

- `contents: write` must be narrowly scoped;
- checkout/action versions must be pinned;
- full Git history/tags must be fetched as needed;
- credentials may persist only for the bounded authenticated mutation;
- PR execution must be dry-run only;
- mutation must require a push event on exact canonical `main`;
- event commit must equal freshly fetched canonical `main` before mutation;
- expected tag absence/exact-target checks must fail closed;
- the tag must be annotated;
- post-push re-fetch and tag-object verification are mandatory;
- the privileged workflow must be removed after successful verification.

Do not substitute polling, force pushes, lightweight tags, or unverified refs.

## 13. Explicit non-effects

This policy does not authorize:

- deletion of any current or historical file;
- creation, movement, or deletion of an archive tag by itself;
- force rewriting canonical history;
- rewriting historical documents to sound current;
- deletion of rejected/adverse evidence because it is inconvenient;
- application/runtime semantic changes;
- deployment, DNS, VPS, Caddy, systemd, or production mutation;
- Hive account/community/authority changes;
- payment, onboarding, moderation, authentication, or private-key authority changes;
- HV-6 implementation;
- GrapesJS dependency adoption;
- real second-venue admission;
- CID/IPNS publication;
- 3Speak/SPK integration;
- shared-runtime multi-tenancy.

## 14. First execution boundary under 0.1.1

After this corrective policy is accepted, archive-specific work may proceed with:

```text
MAIN_TREE_RETIREMENT_BATCH_001_DOCKET_AND_CONSUMER_AUDIT
```

The already executed read-only audit evidence may be incorporated if its exact canonical baseline, workflow run, candidate blobs, and results are bound in the docket.

Actual deletion remains blocked until all of the following exist and verify:

```text
POLICY_0_1_1_ACCEPTED
+
BATCH_DOCKET_ACCEPTED
+
ALL_REQUIRED_LIVE_INVARIANT_MIGRATIONS_ACCEPTED
+
CHECKPOINT_AUTHORIZATION_ACCEPTED
+
ANNOTATED_CHECKPOINT_TAG_CREATED
+
ANNOTATED_CHECKPOINT_TAG_REFETCHED_AND_VERIFIED
+
SEPARATE_RETIREMENT_EXECUTION_AUTHORIZATION
```

Only then may an authorized bounded deletion candidate be canonically integrated.
