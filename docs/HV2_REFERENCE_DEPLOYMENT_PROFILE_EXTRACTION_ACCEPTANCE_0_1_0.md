# HV-2 Reference Deployment Profile Extraction — Project Lead Acceptance Record 0.1.0

```text
OPERATION = HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION
STATUS = ACCEPTED
IMPLEMENTATION_DECISION = ACCEPTED
CANONICAL_INTEGRATION_AUTHORIZED = YES
EXPECTED_CANONICAL_PARENT = 0bfa6753f08c87242ffbf9c9cc7a059c7e71a497
IMPLEMENTATION_COMMIT = 1b7549b31bd8692497061eaacfdcbc39a91b8a20
IMPLEMENTATION_TREE = 64bc51e164b7fdc4218d8928897627dfc7602028
LIVE_PRODUCTION_MUTATION = NO
SECOND_REAL_VENUE_ADDED = NO
SHARED_RUNTIME_MULTI_TENANCY = NOT_ESTABLISHED
PERSISTENT_SCHEMA_CHANGE = NO
HIVE_TRANSACTION_SEMANTICS_CHANGE = NO
PAYMENT_LIFECYCLE_SEMANTICS_CHANGE = NO
NEXT_OPERATION_AFTER_INTEGRATION = POST_HV2_SEQUENCING_DECISION
NEXT_SUBSTANTIVE_IMPLEMENTATION_AUTHORIZED = NO
```

## Decision

The clean HV-2 implementation identified above is accepted by Project Lead review for canonical integration. Acceptance is limited to the preregistered deployment-profile extraction operation. It does not authorize a production deployment, infrastructure mutation, second venue, shared-runtime tenancy, persistent-data migration, signer-authority change, payment-policy change, or unrelated successor milestone.

The accepted implementation is a single direct child of the exact canonical parent named above. Its tree is byte-identical to the fully repaired exploratory implementation that was qualified before clean-history reconstruction.

## Accepted result

HV-2 establishes an explicit validated deployment-profile seam while preserving the exact reviewed Fourth Street/Privex reference behavior:

- `ops/privex/manifest.json` remains the reviewed reference source for deployment-specific host, provider, topology, release, storage, provenance, runtime-profile, and related policy facts;
- `src/deployment/profile.js` validates and compiles those facts into a deeply immutable deployment profile;
- the Fourth Street reference deployment is compiled from that manifest rather than maintained as a duplicate constants universe;
- migrated release/readiness/storage/onboarding consumers resolve deployment-owned facts through the reference deployment profile;
- venue-owned merchant policy remains outside the deployment profile;
- a provider-neutral synthetic deployment compiles offline without changing the venue package;
- the reference deployment retains its exact compatibility namespace, paths, application tag, topology, and safety boundaries;
- no live production state was touched.

HV-2 establishes a deployment seam. It does not establish request-time tenant selection or shared-runtime multi-tenancy.

## Human-review repair record

Machine qualification of the first exploratory implementation was not treated as sufficient. Independent human review identified two abstraction defects before clean reconstruction:

1. `WINDOWS_PORTABILITY_DEFECT` — path/filename validation did not reject Windows `\\` separators consistently.
2. `SYNTHETIC_PROFILE_ABSTRACTION_DEFECT` — the synthetic compiler contract still depended on the Privex/Cloudflare-specific raw field name `cloudflareTlsMode`.

Both defects were repaired and bound by negative/regression tests before the clean candidate was constructed. The repaired exploratory head was:

```text
REPAIRED_EXPLORATORY_COMMIT = 8ea27a878872befb9e719f82ae05337c7bb8b2e8
REPAIRED_EXPLORATORY_TREE = 64bc51e164b7fdc4218d8928897627dfc7602028
```

Human follow-up review also confirmed that release application-tag ownership remains mechanically bound to `PACKAGE_VERSION`, the deployment profile is a validated immutable view rather than a second configuration universe, and venue-owned merchant policy has not been absorbed into provider/deployment configuration.

## Deterministic and cross-platform qualification

The clean implementation commit itself was qualified on the repository-native pull-request graph.

```text
UBUNTU_DETERMINISTIC_GATE = PASS
WINDOWS_DETERMINISTIC_GATE = PASS
FULL_TEST_COUNT = 543
UBUNTU_TEST_FAILURES = 0
WINDOWS_TEST_FAILURES = 0
WINDOWS_EXPECTED_NON_BASH_SKIPS = 2
SECRET_SCAN_FILES = 414
PRODUCTION_NPM_AUDIT_VULNERABILITIES = 0
```

The independent C2-E, C2-F, and UX-1E visual workflows passed. The inherited sequential pinned-Chromium acceptance chain also passed on the clean implementation commit:

```text
M18_2 = PASS
M18_3 = PASS
M18_4 = PASS
UX_1A = PASS
UX_1B = PASS
UX_1C = PASS
UX_1D = PASS
UX_1F = PASS
```

The live Hive smoke lane was correctly skipped because HV-2 is an offline source/deployment-profile refactor and does not authorize live mutation.

## Coverage adjudication

The preregistration required `COVERAGE_NO_MATERIAL_REGRESSION = PASS` but did not freeze a numeric threshold. Before inspecting comparative results, Project Lead review fixed the materiality rule as a drop greater than 1.0 aggregate percentage point in line, branch, or function coverage, absent a separately established coverage-accounting artifact.

A disposable noncanonical workflow ran the repository's existing `npm run test:coverage` command against the exact clean implementation and its exact canonical parent under the same pinned runtime/dependency procedure.

```text
BASELINE_COMMIT = 0bfa6753f08c87242ffbf9c9cc7a059c7e71a497
BASELINE_LINE_COVERAGE = 82.24
BASELINE_BRANCH_COVERAGE = 73.77
BASELINE_FUNCTION_COVERAGE = 87.36

CANDIDATE_COMMIT = 1b7549b31bd8692497061eaacfdcbc39a91b8a20
CANDIDATE_LINE_COVERAGE = 82.50
CANDIDATE_BRANCH_COVERAGE = 74.06
CANDIDATE_FUNCTION_COVERAGE = 87.64

LINE_DELTA_PERCENTAGE_POINTS = +0.26
BRANCH_DELTA_PERCENTAGE_POINTS = +0.29
FUNCTION_DELTA_PERCENTAGE_POINTS = +0.28
COVERAGE_NO_MATERIAL_REGRESSION = PASS
```

The new deployment compiler was directly exercised at 96.31% line coverage, 93.44% branch coverage, and 100% function coverage; the reference deployment module was 100% across all three metrics.

Both baseline and candidate coverage-mode runs returned nonzero because the same inherited `M15.5.4 Tailwind build ignores backend/docs class-like text while retaining explicit UI sources` exact-byte assertion fails only while Node's experimental coverage runner is active. The failure signature and buffer-size mismatch were the same on both exact SHAs. Ordinary deterministic Ubuntu and Windows tests are green. This inherited coverage-mode artifact was therefore preserved explicitly rather than hidden or misclassified as an HV-2 regression.

## Scope and non-effects

The clean implementation changes exactly the preregistered deployment/release/storage/test surface and does not modify the high-risk protocol, transaction, persistent-schema, or native CI-workflow surfaces.

Acceptance does not imply:

- a production deployment or VPS/DNS/proxy change;
- a second venue;
- request-time tenant selection;
- shared-runtime persistence isolation;
- a durable schema migration;
- a package/runtime upgrade;
- a Hive operation, authority, payment, replay, or confirmation semantic change;
- activation of dormant production capabilities.

## Routing consequence

The accepted architecture decision explicitly requires fresh sequencing after HV-2 rather than silently treating its candidate-lane list as an implementation order. Therefore the only authorized successor operation after canonical integration is:

```text
NEXT_OPERATION_AFTER_INTEGRATION = POST_HV2_SEQUENCING_DECISION
NEXT_SUBSTANTIVE_IMPLEMENTATION_AUTHORIZED = NO
```

That sequencing decision must be evidence-driven and separately determine whether any substantive successor lane should be preregistered next.
