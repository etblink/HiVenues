# HV-8 Reference Deployment Exact Identity Observation 0.1.0

## Status

```text
OPERATION = HV8_REFERENCE_DEPLOYMENT_EXACT_IDENTITY_OBSERVATION__READ_ONLY
ROLE = PROJECT_LEAD_READ_ONLY_PROVENANCE_ADJUDICATION
REPOSITORY = etblink/Hive-Venues
OBSERVATION_BASE_COMMIT = 01617f50e7437517ac5cc48cc1889043ce3fa8f0
OBSERVATION_BASE_TREE = 516c7f7e6d9335e3c572f1dac344d221f4e84d43
OBSERVATION_DATE = 2026-08-31
HV8_EXACT_IDENTITY_OBSERVATION = COMPLETE__PASS
FULL_INSTALLED_RUNTIME_IDENTITY = DIRECTLY_OBSERVED_THROUGH_PUBLIC_HEALTH
HV8_READINESS_IDENTITY_HOLD = CLEARED
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

This record completes the smallest read-only operation selected by the HV-8 readiness audit. It records current running-release identity and readiness. It does not mutate production and does not authorize a deployment or any other external effect.

## 1. Why this observation existed

`HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_READINESS_READ_ONLY_AUDIT_0_1_0.md` found source and architecture readiness favorable but deliberately held deployment-preregistration readiness because the full installed tree had not been directly re-observed.

The audit explicitly prohibited replacing a missing installed value with the repository tree merely because the publicly visible short build label resolved to a known commit.

The blocking distinction was:

```text
REPOSITORY_TREE_FOR_COMMIT != DIRECTLY_OBSERVED_INSTALLED_TREE
```

That distinction is preserved here rather than retroactively weakening the audit.

## 2. Fresh public health observation

On 2026-08-31 the user directly opened the live Fourth Street public endpoints in a browser and supplied the returned response bodies verbatim to the Project Lead session.

`https://fourthstreetbar.com/healthz` returned:

```json
{"status":"ok","service":"hive-bar","environment":"production","writeMode":"beta","build":"beta-fdb5b5b","commit":"fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e","tree":"6420f0ca2392ec4ed968bc2e928151870c3b591c"}
```

`https://fourthstreetbar.com/readyz` returned:

```json
{"status":"ready"}
```

Evidence classification:

```text
OBSERVATION_CHANNEL = USER_DIRECT_BROWSER_PUBLIC_ENDPOINT
PROJECT_LEAD_MACHINE_FETCH_OF_HEALTHZ = NOT_CLAIMED
PUBLIC_HEALTH_RESPONSE = DIRECTLY_OBSERVED_BY_USER
PUBLIC_READY_RESPONSE = DIRECTLY_OBSERVED_BY_USER
SECRET_OR_PRIVATE_OPERATOR_DATA = NONE
HOST_MUTATION = NONE
```

The observation is stronger than the earlier shell build-label evidence because the accepted production health route exposes the running release's full build, commit, and tree identity.

## 3. Exact current running-release identity

The observed live production identity is:

```text
STATUS = ok
SERVICE = hive-bar
ENVIRONMENT = production
WRITE_MODE = beta
BUILD = beta-fdb5b5b
COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c
READY = ready
```

GitHub independently resolves commit
`fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e`
to the exact same tree:

```text
6420f0ca2392ec4ed968bc2e928151870c3b591c
```

Therefore:

```text
PUBLIC_HEALTH_COMMIT_MATCHES_REPOSITORY = YES
PUBLIC_HEALTH_TREE_MATCHES_REPOSITORY = YES
PUBLIC_BUILD_MATCHES_COMMIT_PREFIX = YES
RUNNING_RELEASE_IDENTITY_SELF_CONSISTENT = YES
RUNNING_RELEASE_READINESS = PASS
```

No discrepancy investigation is required at this boundary.

## 4. HV-8 blocker disposition

The prior audit hold is resolved exactly rather than inferred:

```text
PRIOR_HOLD_REASON = FULL_INSTALLED_TREE_NOT_DIRECTLY_REOBSERVED
DIRECTLY_OBSERVED_TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c
PRIOR_HOLD = CLEARED
HV8_PRODUCTION_COMPATIBILITY = PASS
HV8_DEPLOYMENT_PREREGISTRATION_READINESS = PASS_FOR_PREREGISTRATION_DECISION
PLATFORM_REPAIR_REQUIRED = NO
```

`PASS_FOR_PREREGISTRATION_DECISION` means only that the Project Lead now has enough exact current-runtime identity evidence to decide whether a bounded deployment preregistration should be written. It is not deployment authorization.

## 5. What remains intentionally unobserved

This public observation does not establish operator-side filesystem or protected-environment facts that the audit also identified as prerequisites for any later production mutation:

```text
CURRENT_RELEASE_SYMLINK_TARGET = NOT_OPERATOR_SIDE_REOBSERVED
CURRENT_IDENTITY_FILE_BYTES = NOT_OPERATOR_SIDE_REOBSERVED
LAST_GOOD_TARGET = NOT_REOBSERVED
LAST_GOOD_COMMIT = NOT_REOBSERVED
LAST_GOOD_TREE = NOT_REOBSERVED
ACTIVE_BETA_ENVIRONMENT_SHA256 = NOT_REOBSERVED
PRESERVED_READ_ONLY_ENVIRONMENT_SHA256 = NOT_REOBSERVED
```

The absence of those observations does not reopen the running-release identity hold because `/healthz` is the accepted public full process identity surface. They must instead become hard read-only pre-mutation gates of any later deployment preregistration.

No environment contents, session secret, private key, SSH key, or other secret should be captured to satisfy those gates. Hashes and exact non-secret release identities are sufficient.

## 6. Epistemic consequence

The evidence hierarchy is now:

```text
CURRENT_PUBLIC_HEALTH_FULL_IDENTITY
>
CURRENT_PUBLIC_SHELL_SHORT_BUILD_LABEL
>
HISTORICAL_DEPLOYMENT_PROSE
```

The current production installation is therefore no longer modeled from M19.2 or from the short shell label. It is bound to the directly observed live health identity above.

## 7. Authorization boundary

Nothing in this observation authorizes:

```text
SOURCE_DEPLOYMENT
SERVICE_RESTART
ENVIRONMENT_CHANGE
CURRENT_OR_LAST_GOOD_SYMLINK_CHANGE
RELEASE_ROOT_MUTATION
DEPLOY_HELPER_INVOCATION
ROLLBACK_INVOCATION
HIVE_WRITE
KEYCHAIN_REQUEST
PAYMENT_OR_DISTRIATOR_ACTIVATION
ONBOARDING_ACTIVATION
CONTROLLED_OR_DELEGATED_MODE_ACTIVATION
PUBLIC_PRODUCTION_AUTHORING_MOUNT
SECRET_OR_KEY_CHANGE
DNS_CLOUDFLARE_VPS_SYSTEMD_CHANGE
```

A separately frozen and accepted production-deployment preregistration would still precede any candidate qualification and any later explicit production-mutation authorization.

## 8. Conclusion

```text
HV8_REFERENCE_DEPLOYMENT_EXACT_IDENTITY_OBSERVATION__READ_ONLY = COMPLETE__PASS
CURRENT_RUNNING_BUILD = beta-fdb5b5b
CURRENT_RUNNING_COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
CURRENT_RUNNING_TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c
CURRENT_WRITE_MODE = beta
CURRENT_READY_STATUS = ready
HV8_READINESS_IDENTITY_HOLD = CLEARED
NEXT_REQUIRED_BOUNDARY = PROJECT_LEAD_DEPLOYMENT_PREREGISTRATION_DECISION
PRODUCTION_MUTATION_AUTHORIZED = NO
```

The exact installed-runtime provenance gap is closed. The correct next step is a fresh Project Lead decision about whether to preregister a successor convergence deployment, while preserving all production-mutation boundaries.