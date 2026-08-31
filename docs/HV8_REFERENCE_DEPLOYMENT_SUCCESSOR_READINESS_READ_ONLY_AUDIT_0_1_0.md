# HV-8 Reference Deployment Successor Readiness — Read-Only Audit 0.1.0

## Status

```text
OPERATION = HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_READINESS__READ_ONLY_AUDIT
ROLE = PROJECT_LEAD_INDEPENDENT_READINESS_ADJUDICATION
REPOSITORY = etblink/Hive-Venues
AUDIT_BASE_COMMIT = 9cc96ae11980eb574495d08950bee960155cf0f2
AUDIT_BASE_TREE = e1df0c4477268430af5273a5cf90eaf538984ef5
HV8_READ_ONLY_AUDIT = COMPLETE
HV8_SOURCE_READINESS = PASS
HV8_PRODUCTION_COMPATIBILITY = PASS_WITH_IDENTITY_OBSERVATION_HOLD
HV8_DEPLOYMENT_PREREGISTRATION_READINESS = HOLD
HOLD_REASON = FULL_INSTALLED_TREE_NOT_DIRECTLY_REOBSERVED
NEXT_RECOMMENDED_OPERATION = HV8_REFERENCE_DEPLOYMENT_EXACT_IDENTITY_OBSERVATION__READ_ONLY
FOURTH_STREET_DEPLOYMENT = NOT_AUTHORIZED
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
HIVE_WRITE = NOT_AUTHORIZED
KEYCHAIN_REQUEST = NOT_AUTHORIZED
PAYMENT_OR_DISTRIATOR_ACTIVATION = NOT_AUTHORIZED
ONBOARDING_ACTIVATION = NOT_AUTHORIZED
PUBLIC_PRODUCTION_AUTHORING = NOT_AUTHORIZED
SECRET_OR_KEY_CUSTODY_CHANGE = NOT_AUTHORIZED
DNS_VPS_SYSTEMD_MUTATION = NOT_AUTHORIZED
```

This record closes the selected HV-8 read-only readiness audit. It does not authorize a deployment preregistration, source deployment, service restart, environment change, symlink mutation, production authoring mount, Hive write, payment/onboarding activation, secret/key change, or infrastructure mutation.

The central result is deliberately narrow:

> The accepted successor source is source-side and architecture-side compatible with the preserved Fourth Street production model, and the publicly visible installed build resolves to a strict ancestor of canonical source. However, the full installed tree value has not been directly re-observed through the evidence channels available to this audit. Because the frozen HV-8 epistemic rule forbids filling that field from repository history, deployment preregistration remains on hold pending one exact read-only identity observation.

## 1. Evidence hierarchy used

The audit applies these rules:

```text
CURRENT_OBSERVATION > HISTORICAL_DEPLOYMENT_PROSE
EXACT_PROVENANCE > PLAUSIBLE_INFERENCE
PUBLIC_BUILD_LABEL != FULL_INSTALLED_IDENTITY
REPOSITORY_TREE_FOR_COMMIT != DIRECTLY_OBSERVED_INSTALLED_TREE
SOURCE_CAPABILITY_PRESENT != PRODUCTION_CAPABILITY_ENABLED
COMPATIBILITY_NAME != PLATFORM_PRODUCT_IDENTITY
READINESS_FINDING != DEPLOYMENT_AUTHORIZATION
```

Historical M19.2 remains valid provenance for its event. It is not treated as current installed identity.

## 2. Exact canonical source identity

At audit opening:

```text
CANONICAL_BRANCH = main
CANONICAL_COMMIT = 9cc96ae11980eb574495d08950bee960155cf0f2
CANONICAL_TREE = e1df0c4477268430af5273a5cf90eaf538984ef5
CANONICAL_MESSAGE = Reconcile Post-HV-7 sequencing to HV-8 readiness
```

All source-side conclusions in this record bind to that identity.

## 3. Present deployed-build observation

Two fresh public observations in the Project Lead session independently exposed:

```text
VISIBLE_BUILD = beta-fdb5b5b
```

The second observation was a user-captured current desktop screenshot of the Fourth Street homepage on 2026-08-31. It visibly showed the same `beta-fdb5b5b` tester build label and the live Fourth Street Hive product presentation.

The deployed release identity mechanism in the corresponding source derives the tester-visible build label exclusively as:

```text
beta-<first-seven-characters-of-deployment-commit>
```

Production startup under `/opt/hive-bar/current` and `/opt/hive-bar/releases/...` is strict: `.hive-bar-commit` and `.hive-bar-tree` must both exist, both must be 40-character hexadecimal identities, and startup refuses malformed or incomplete deployment identity.

The visible short identity resolves uniquely in repository history to:

```text
DEPLOYED_COMMIT_RESOLUTION = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
REPOSITORY_TREE_FOR_DEPLOYED_COMMIT = 6420f0ca2392ec4ed968bc2e928151870c3b591c
```

The audit therefore accepts the deployed commit resolution as strong present build evidence.

It does **not** promote the repository tree for that commit into a claim that the installed `.hive-bar-tree` value was directly re-observed. The public shell exposes only the commit-derived build label, and the available public crawler did not return `/healthz` JSON or operator-side identity-file contents.

Therefore:

```text
DEPLOYED_COMMIT = STRONGLY_BOUND_BY_PRESENT_PUBLIC_BUILD_EVIDENCE
DEPLOYED_TREE_FILE_EXISTENCE = REQUIRED_BY_STRICT_PRODUCTION_STARTUP
DEPLOYED_TREE_VALUE = NOT_DIRECTLY_REOBSERVED
FULL_INSTALLED_IDENTITY = INCOMPLETE_FOR_DEPLOYMENT_PREREGISTRATION
```

This is an epistemic hold, not evidence of a mismatched installed tree.

## 4. Source-to-deployment ancestry

GitHub ancestry comparison from the resolved deployed commit to the audit-base canonical source establishes:

```text
BASE = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
HEAD = 9cc96ae11980eb574495d08950bee960155cf0f2
STATUS = ahead
AHEAD_BY = 135
BEHIND_BY = 0
MERGE_BASE = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
```

Therefore the observed production generation is ancestral to current canonical source and is not a divergent sibling.

This proves source lineage only. It does not prove that every one of the 135 source commits belongs in one production deployment, and it does not authorize skipping release-specific review.

## 5. Production compatibility seams

The following inherited production identities remain deliberate compatibility/provenance facts:

```text
/opt/hive-bar
/opt/hive-bar/current
/opt/hive-bar/releases/<commit>
/opt/hive-bar/last-good
hive-bar.service
.hive-bar-commit
.hive-bar-tree
fourthstreetbar.com
fourth-street-bar-app/0.1.0
legacy Fourth Street environment names
```

The successor architecture explicitly preserves these as reference-deployment compatibility state. They are not defects merely because the canonical source platform is named Hive-Venues.

Current source retains a Fourth Street compatibility adapter that compiles inherited environment names through the accepted venue-context authority. Tests preserve the exact inherited production-required setting surface.

Result:

```text
PRODUCTION_NAMESPACE_MIGRATION_REQUIRED_BY_SUCCESSOR_SOURCE = NO
COSMETIC_RENAME_BEFORE_DEPLOYMENT = NOT_REQUIRED__NOT_RECOMMENDED
```

Any later production namespace migration would need separate authorization and rollback qualification.

## 6. Release and rollback invariants

The core deployment helper is byte-identical between the resolved deployed commit and the audit-base successor source.

It continues to require, among other things:

```text
FULL_40_CHAR_TARGET_COMMIT
REVIEWED_BARE_REPOSITORY_CONTAINS_TARGET
PINNED_NODE_24_19_0
PINNED_NPM_11_17_0
EXACT_TARGET_TREE_RESOLUTION
STAGED_ARCHIVE_BUILD
PRIVEX_RELEASE_GATE_BEFORE_SWITCH
EXACT_COMMIT_AND_TREE_IDENTITY_FILES
CURRENT_RELEASE_IDENTITY_VALIDATION
ATOMIC_LAST_GOOD_UPDATE
ATOMIC_CURRENT_SWITCH
POST_SWITCH_HEALTH_EXACT_BUILD_COMMIT_TREE
WRITE_MODE_DISABLED_DURING_SOURCE_SWITCH
RESTORE_PREVIOUS_RELEASE_ON_FAILED_POST_SWITCH_HEALTH
NO_AUTOMATIC_RETRY_OF_AMBIGUOUS_EXTERNAL_MUTATION
```

The rollback helper is likewise byte-identical between the resolved deployed commit and current source. It requires an explicitly selected previously installed full commit, verifies its stored tree against the reviewed repository, qualifies that release, switches atomically, and restores the prior current release if rollback-target health fails.

The reusable exact-production harness further distinguishes `OldCommit` from optional `SourceParentCommit`, allowing accepted source-only ancestry gaps without pretending the deployed old release equals the new commit's immediate parent.

Result:

```text
RELEASE_MODEL_COMPATIBILITY = PASS
ROLLBACK_MODEL_COMPATIBILITY = PASS
ANCESTRY_GAP_MODEL = PRESENT_AND_APPROPRIATE
```

The live values of `current` and `last-good` symlinks were not mutated or operator-side re-observed by this audit.

## 7. Current production capability profile

The fresh public product evidence and the living production model indicate that the accepted production profile is beta self-signing through local Hive Keychain, not the older public-read-only baseline.

The resolved deployed commit and the audit-base canonical source contain the exact same beta action manifest blob:

```text
post
comment
vote
follow
unfollow
subscribe
unsubscribe
profile
claim-rewards
wall
inbox
thread
```

Therefore the successor source does not broaden the accepted beta action set merely by virtue of the 135-commit source advance.

The beta release gate continues to require:

```text
NODE_ENV = production
HIVE_WRITE_MODE = beta
HIVE_SIGNER_MODE = keychain
HIVE_CONTROLLED_ACCOUNTS = empty
HIVE_CONTROLLED_ACTIONS = empty
exact Fourth Street host/origin/topology
at least three Hive RPC nodes
no M9/M10/M12 controlled/delegated residue
explicit payment activation if Pay is enabled
explicit onboarding activation if onboarding is enabled
```

The successor implementation mainly replaces duplicated reference-deployment literals in that gate with the accepted Fourth Street deployment-profile authority.

Result:

```text
CURRENT_ACCEPTED_RUNTIME_PROFILE = PRIVEX_BETA_SELF_SIGNING
BETA_ACTION_MANIFEST_DELTA = NONE
SERVER_HELD_HIVE_PRIVATE_KEYS = NO
CONTROLLED_DELEGATED_STATE_IMPLICITLY_ENABLED = NO
```

## 8. Dormant successor capabilities and durable-state exposure

### Payments and Distriator

Payments remain separately gated. Current application code opens the receipt store in production only when payment is enabled or an explicit non-memory observation path is configured. Enabled Pay requires its own release-gate conditions and existing durable storage.

Distriator cannot be enabled without Pay and remains separately gated.

### Onboarding

Onboarding defaults disabled. The onboarding store opens only when onboarding is enabled. Enabled onboarding requires beta + Keychain, explicit creator/policy settings, the exact accepted durable path, and a readable accepted store.

### Moderation

Moderation storage opens only when moderation is enabled.

### HV-5/HV-6/HV-7 authoring

The successor source contains canonical authoring and native visual-authoring modules, but `src/app.js` mounts only the ordinary authentication, moderation, social, M4, payment, index, community, profile, common, and API routers. It does not import or mount the native visual-authoring surface as a production HTTP route.

Therefore:

```text
PAYMENT_ACTIVATION_IMPLIED_BY_SOURCE_DEPLOYMENT = NO
DISTRIATOR_ACTIVATION_IMPLIED_BY_SOURCE_DEPLOYMENT = NO
ONBOARDING_ACTIVATION_IMPLIED_BY_SOURCE_DEPLOYMENT = NO
MODERATION_ACTIVATION_IMPLIED_BY_SOURCE_DEPLOYMENT = NO
PUBLIC_PRODUCTION_VISUAL_AUTHORING_IMPLIED_BY_SOURCE_DEPLOYMENT = NO
NEW_HIVE_KEY_CUSTODY_IMPLIED_BY_SOURCE_DEPLOYMENT = NO
```

The mere presence of newer durable-store and authoring code does not force a production data migration or new authority.

A later deployment preregistration must nevertheless bind the actual protected environment choices and inspect any durable path that is explicitly active; source defaults alone cannot substitute for production observation.

## 9. Deployment manifest and topology delta

Compared with the resolved deployed commit, the current reference deployment manifest is additive rather than a host/topology migration. It adds the extracted deployment ID, durable payment/onboarding path declarations, and provenance filenames while preserving:

```text
Privex / US West
Debian 13
1 vCPU / 1024 MiB / 20 GiB
Node 24.19.0
npm 11.17.0
Cloudflare proxied edge
Caddy reverse proxy
127.0.0.1:3000 application binding
loopback trust proxy
/opt/hive-bar release root
hive-bar.service
fourthstreetbar.com
fourth-street-bar-app/0.1.0
automaticDeploys = false
exactCommitRequired = true
```

The reference-deployment profile extraction is therefore a source-of-truth consolidation, not evidence of a required production infrastructure migration.

## 10. Stale living documentation discovered

One bounded documentation defect was discovered:

`docs/PRODUCTION_OPERATIONS.md` currently describes the canonical-source beta manifest as:

```text
post, comment, vote, follow, unfollow, subscribe, unsubscribe,
claim-rewards, wall, inbox, thread
```

but both the resolved deployed commit and current source include `profile` in `src/beta/actions.js`.

Classification:

```text
DEFECT = STALE_LIVING_DOCUMENTATION
RUNTIME_BETA_MANIFEST_MISMATCH = NO
RELEASE_GATE_WEAKENING = NO
PRODUCT_DEFECT = NO
```

The correct repair layer is the later living-state/documentation reconciliation, not product code.

## 11. Readiness adjudication

The audit finds no source-side architecture defect that currently requires a repair before a deployment preregistration can be considered.

Passes:

```text
CANONICAL_SOURCE_IDENTITY = BOUND
PUBLIC_DEPLOYED_BUILD_LABEL = OBSERVED
DEPLOYED_COMMIT_RESOLUTION = STRONGLY_BOUND
SOURCE_ANCESTRY = STRICT_ANCESTOR__135_AHEAD__0_BEHIND
PRODUCTION_COMPATIBILITY_NAMESPACE = PRESERVED
PRODUCTION_ENVIRONMENT_SURFACE = PRESERVED_BY_COMPATIBILITY_ADAPTER
RELEASE_HELPER_COMPATIBILITY = PASS
ROLLBACK_HELPER_COMPATIBILITY = PASS
BETA_ACTION_MANIFEST = UNCHANGED
DORMANT_CAPABILITY_BOUNDARIES = PRESERVED
PUBLIC_VISUAL_AUTHORING_MOUNT = ABSENT
SOURCE_REQUIRED_PRODUCTION_NAMESPACE_MIGRATION = NO
SOURCE_REQUIRED_DURABLE_STATE_MIGRATION = NOT_DEMONSTRATED
```

Hold:

```text
FULL_INSTALLED_TREE_VALUE = NOT_DIRECTLY_REOBSERVED
CURRENT_LAST_GOOD_IDENTITY = NOT_REOBSERVED
CURRENT_PROTECTED_ENVIRONMENT_HASH = NOT_REOBSERVED
```

Only the first item is a blocking identity field for advancing from this audit to a deployment preregistration. The latter two are natural required inputs to any later production transition preregistration/qualification and should be observed before mutation.

## 12. Exact next read-only operation

The smallest next operation is:

```text
HV8_REFERENCE_DEPLOYMENT_EXACT_IDENTITY_OBSERVATION__READ_ONLY
```

It should obtain, without mutation, at minimum:

```text
CURRENT_RELEASE_TARGET
CURRENT_.hive-bar-commit
CURRENT_.hive-bar-tree
CURRENT_HEALTH_BUILD
CURRENT_HEALTH_COMMIT
CURRENT_HEALTH_TREE
CURRENT_READY_STATUS
LAST_GOOD_TARGET
```

If safe operator-side observation is available, it should also record hashes of the active and preserved environment files **without exposing their contents** so a later deployment preregistration can bind the exact environment preservation requirement.

The operation must not:

```text
restart the service
change an environment file
move current or last-good
invoke the deploy helper
invoke rollback
issue Hive or Keychain writes
activate Pay/Distriator/onboarding
change DNS, VPS, systemd, secrets, or keys
```

If the full current identity agrees with the resolved `fdb5b5b...` repository identity, the Project Lead may then perform a fresh sequencing/adjudication decision on whether a bounded successor production-deployment preregistration is warranted.

If it disagrees, stop and investigate the discrepancy before any production proposal.

## 13. Qualification envelope for any later deployment candidate

A later separately authorized production transition should bind at least:

```text
EXACT_OBSERVED_OLD_COMMIT
EXACT_OBSERVED_OLD_TREE
EXACT_OBSERVED_OLD_BUILD
EXACT_OBSERVED_LAST_GOOD_IDENTITY
EXACT_ACCEPTED_NEW_COMMIT
EXACT_ACCEPTED_NEW_TREE
SOURCE_PARENT_IF_ANCESTRY_GAP_EXISTS
GITHUB_ANCESTRY_PROOF
DUAL_OS_DETERMINISTIC_QUALIFICATION
RENDERED_QUALIFICATION_IF_PRESENTATION_CHANGED
EXACT_REFERENCE_DEPLOYMENT_GATE
PRESERVED_ENVIRONMENT_HASH
READ_ONLY_SOURCE_SWITCH_PHASE
POST_SWITCH_EXACT_HEALTH_BUILD_COMMIT_TREE
READINESS
VERSIONED_FIRST_PARTY_ASSET_IDENTITY
PUBLIC_EDGE_QUALIFICATION
RESTORED_ACCEPTED_BETA_ENVIRONMENT
BETA_RELEASE_GATE
ROLLBACK_IDENTITY
AMBIGUOUS_EXTERNAL_MUTATION_NO_AUTOMATIC_RETRY
```

Successful source readiness does not authorize this operation.

## 14. Conclusion

```text
HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_READINESS__READ_ONLY_AUDIT = COMPLETE
SOURCE_AND_ARCHITECTURE_READINESS = PASS
PRODUCTION_COMPATIBILITY = PASS_WITH_IDENTITY_OBSERVATION_HOLD
DEPLOYMENT_PREREGISTRATION = HOLD
BLOCKER_CLASS = EPISTEMIC_EXACT_IDENTITY_OBSERVATION
PLATFORM_REPAIR_REQUIRED = NO
PRODUCTION_MUTATION_AUTHORIZED = NO
NEXT_RECOMMENDED_OPERATION = HV8_REFERENCE_DEPLOYMENT_EXACT_IDENTITY_OBSERVATION__READ_ONLY
```

This is a favorable readiness result with one deliberately unfilled provenance field. The correct next move is to observe that field exactly, not to infer it and not to deploy around it.
