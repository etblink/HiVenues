# HV-2 Reference Deployment Profile Extraction — Preregistration 0.1.0

## Status

```text
OPERATION = HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION
STATUS = FROZEN_PREREGISTRATION__IMPLEMENTATION_NOT_STARTED
REPOSITORY = etblink/Hive-Venues
BASE_COMMIT = 7b2486cb7f3255f040c18f15c5f1a3954a1e7a60
BASE_TREE = d894976c55fc4514b16f44b50e735605fb940cb1
REFERENCE_VENUE = Fourth Street Bar, Reno
LIVE_PRODUCTION_MUTATION = FORBIDDEN
SECOND_REAL_VENUE = FORBIDDEN
REQUEST_TIME_TENANT_SELECTION = FORBIDDEN
PERSISTENT_SCHEMA_CHANGE = FORBIDDEN
HIVE_TRANSACTION_SEMANTIC_CHANGE = FORBIDDEN
PAYMENT_LIFECYCLE_SEMANTIC_CHANGE = FORBIDDEN
PACKAGE_VERSION_CHANGE = FORBIDDEN
REFERENCE_HIVE_APP_TAG_CHANGE = FORBIDDEN
```

This preregistration freezes the first deployment-boundary extraction in Hive-Venues. It is a source refactor and validation operation. It is not a deployment, infrastructure migration, product rebrand, second-venue admission, or shared-runtime tenancy operation.

## 1. Purpose

HV-2 asks whether the existing reviewed Fourth Street / Privex deployment assumptions can be expressed as an explicit validated deployment profile instead of being duplicated as universal-looking literals across release/readiness code.

The desired decomposition is:

```text
VENUE_CONTEXT
+
DEPLOYMENT_PROFILE
+
GENERIC_RELEASE_AND_APPLICATION_LOGIC
```

while preserving the exact accepted Fourth Street reference behavior and production compatibility namespace.

HV-2 succeeds only if deployment-specific facts become explicit inputs without weakening the inherited release gates or altering production.

## 2. Architectural boundary

The accepted successor architecture remains:

```text
HIGH_ASSURANCE_PROTOCOL_SECURITY_CORE
+
PLATFORM_APPLICATION_PRIMITIVES
+
VENUE_PACKAGE
+
DEPLOYMENT_PROFILE
=
ONE_ISOLATED_VENUE_RUNTIME
```

HV-2 establishes the `DEPLOYMENT_PROFILE` seam only.

It does not establish:

```text
SHARED_RUNTIME_MULTI_TENANCY
FLEET_ORCHESTRATION
SECOND_REAL_VENUE
NEW_PRODUCTION_NAMESPACE
NEW_RELEASE_PROTOCOL
NEW_PAYMENT_PROTOCOL
```

## 3. Frozen source inputs

HV-2 implementation must begin from the exact canonical base above and treat the following source identities as the pre-refactor reference evidence:

```text
ops/privex/manifest.json
BLOB = ace1402ca16c00c1243359a14470ac6e0c4543b2

src/release/beta-readiness.js
BLOB = c1563a6f41dee493c31df668701f2699ddc0f37f

src/release/privex-readiness.js
BLOB = 0f108f715938fc981b1674480af4122a2e2b5d8f

src/release/read-only-readiness.js
BLOB = 0b76ae98b060013e28ec2ef6b22ad0121600fc89

src/release/payment-storage.js
BLOB = 933d2614200bba385a0b9540d550914dd1ff2df3

src/onboarding/config.js
BLOB = 45e56cc0b26bc6bedc3aeab789dc3504113a90ef

src/release/release-version.js
BLOB = daa91f3fb2f5e9fbac231864aac7f734634935f7

scripts/check-privex-release.js
BLOB = 95a0cbeb851f15ad8c826ca6d618256c1011f3c0
```

These identities freeze the evidence used to define invariance. They do not require every listed file to be modified.

## 4. Canonical reference deployment facts

The reviewed `ops/privex/manifest.json` is the primary machine-readable statement of the reference topology. HV-2 must preserve at minimum the following exact facts for the Fourth Street reference deployment.

### 4.1 Hosting and runtime

```text
PROVIDER = Privex
PACKAGE = V1-US-NVME
REGION = US West
OPERATING_SYSTEM = Debian 13
RUNTIME_NODE = 24.19.0
RUNTIME_NPM = 11.17.0
RUNTIME_PLATFORM = linux-x64
INSTANCE_COUNT = 1
```

The existing pinned runtime source and checksum in the manifest remain reference evidence and may be represented by the profile if useful; HV-2 does not authorize a runtime upgrade.

### 4.2 Network topology

```text
EDGE_PROXY = Cloudflare
EDGE_DNS_MODE = proxied
REVERSE_PROXY = Caddy
APPLICATION_ADDRESS = 127.0.0.1:3000
APPLICATION_BIND_HOST = 127.0.0.1
APPLICATION_PORT = 3000
APPLICATION_TRUST_PROXY = loopback
VISITOR_IP_HEADER = CF-Connecting-IP
ORIGIN_INGRESS = cloudflare-only
CLOUDFLARE_TLS_MODE = full-strict
```

### 4.3 Public identity and release namespace

```text
PUBLIC_HOST = fourthstreetbar.com
REDIRECT_HOST = www.fourthstreetbar.com
RELEASE_ROOT = /opt/hive-bar
SERVICE_NAME = hive-bar.service
HIVE_APP_TAG = fourth-street-bar-app/0.1.0
HEALTH_PATH = /healthz
READINESS_PATH = /readyz
AUTOMATIC_DEPLOYS = false
EXACT_COMMIT_REQUIRED = true
LAST_GOOD_PATH = /opt/hive-bar/last-good
LAST_GOOD_POLICY = previous-validated-current-before-switch
```

The installed provenance filenames `.hive-bar-commit` and `.hive-bar-tree` are part of the inherited production compatibility namespace even though the current manifest does not enumerate them. HV-2 must not rename them.

### 4.4 Persistent reference paths

```text
PAYMENT_DATABASE = /var/lib/hive-bar/payments/receipts.sqlite3
ONBOARDING_DATABASE = /var/lib/hive-bar/onboarding/onboarding.sqlite3
```

These paths are reference-deployment facts. HV-2 may centralize their ownership in the deployment profile only if all existing path-safety and readiness semantics remain exact.

HV-2 may not alter database schemas, contents, permissions policy, or live files.

### 4.5 Runtime profiles and feature boundaries

The manifest currently names:

```text
DEPLOYMENT_BASELINE_PROFILE = privex-public-read-only
ACCEPTED_BETA_PROFILE = privex-beta-self-signing
WIRED_V1_PROFILE = privex-v1-self-signing
```

HV-2 must preserve the distinction between source/runtime capability and production activation.

The reference manifest also records a read-only deployment baseline with writes, payments, and Distriator disabled. HV-2 does not activate any feature simply by representing these decisions in a profile.

## 5. Source-of-truth rule

HV-2 must reduce duplicate deployment literals rather than create a second disconnected deployment-configuration universe.

The preferred dependency direction is:

```text
REVIEWED_MACHINE_READABLE_REFERENCE_PROFILE
-> VALIDATED_DEPLOYMENT_PROFILE
-> RELEASE_READINESS / APPLICATION CONSTRUCTION
```

not:

```text
manifest.json
+
new unrelated JS constants
+
old duplicated JS constants
+
more environment variables
```

`ops/privex/manifest.json` is therefore the preferred canonical reference-data source unless implementation evidence demonstrates that a small, explicitly generated or validated equivalent is safer. Any alternate representation must have a machine-checkable coherence rule against the reviewed manifest so the same fact cannot silently drift in two places.

A schema/loader module around the manifest is expected to be preferable to copying its values into another constant object.

## 6. Deployment-profile minimum contract

The exact JavaScript object shape is not frozen if implementation evidence supports a cleaner grouping, but the profile must represent equivalent concepts for:

```text
DEPLOYMENT_ID
PROVIDER
PACKAGE_OR_PLAN
REGION
OPERATING_SYSTEM
RUNTIME_NODE_VERSION
RUNTIME_NPM_VERSION
RUNTIME_PLATFORM
INSTANCE_COUNT
EDGE_PROXY
EDGE_DNS_MODE
REVERSE_PROXY
APPLICATION_BIND_HOST
APPLICATION_PORT
TRUST_PROXY
VISITOR_IP_HEADER
ORIGIN_INGRESS_POLICY
TLS_MODE
PUBLIC_HOST
REDIRECT_HOST
RELEASE_ROOT
SERVICE_NAME
HIVE_APP_TAG
HEALTH_PATH
READINESS_PATH
AUTOMATIC_DEPLOY_POLICY
EXACT_COMMIT_POLICY
LAST_GOOD_PATH
LAST_GOOD_POLICY
PAYMENT_DATABASE_PATH
ONBOARDING_DATABASE_PATH
RUNTIME_PROFILE_NAMES
```

The profile must be immutable after validation.

It may contain additional reviewed manifest fields where doing so reduces duplication or improves release validation, but unrelated venue/editorial values do not belong in this profile.

## 7. Venue versus deployment ownership

HV-2 must keep the boundary established by HV-1 clear.

Venue-owned examples:

```text
DISPLAY_NAME
PUBLIC_BUSINESS_ADDRESS
PUBLIC_PHONE
PUBLIC_HOURS
HIVE_COMMUNITY_ID
HIVE_OFFICIAL_ACCOUNT
HIVE_THREADS_CONTAINER_ACCOUNT
PAYMENT_MERCHANT_ACCOUNT_SET
VENUE_EDITORIAL_CONTENT
VENUE_ASSETS
```

Deployment-owned examples:

```text
PUBLIC_HOST
APP_ORIGIN_EXPECTATION
PROVIDER
OS
PROXY_TOPOLOGY
SERVICE_NAME
RELEASE_ROOT
DATABASE_PATHS
HIVE_APPLICATION_RELEASE_TAG
HEALTH_PATHS
ROLLBACK_POLICY
```

If a fact genuinely spans both domains, implementation must make the relationship explicit rather than hiding it in a universal constant.

## 8. Compatibility rule

The reference Fourth Street deployment is the golden compatibility profile for HV-2.

For equivalent input/environment state, the refactored release gates must preserve their substantive decisions and fail-closed boundaries, including at minimum:

- production environment requirement;
- exact canonical public host requirement;
- HTTPS origin matching the public host;
- loopback Node binding;
- port 3000 for the reference profile;
- loopback trust-proxy requirement;
- minimum three Hive RPC nodes where currently required;
- exact Fourth Street Hive app tag;
- read-only versus beta write-mode requirements;
- Keychain requirement for beta self-signing;
- empty controlled account/action state where currently required;
- dormant M9/M10/M12 control-state exclusions;
- placeholder-session-secret rejection;
- Pay activation requiring explicit merchant/storage decisions;
- sole Fourth Street merchant requirement for the reference deployment when Pay is enabled;
- safe exact payment database target and existing-store requirement where currently enforced;
- onboarding activation requiring explicit settings, accepted beta/Keychain runtime, and exact safe reference database path where currently enforced;
- Distriator dependency/URL constraints where currently enforced;
- exact release/profile summary semantics except where generic naming is intentionally introduced and compatibility aliases are retained.

Tests may be updated where they assert an implementation location rather than an accepted behavior, but a gate may not be weakened merely because a new profile abstraction makes an old test inconvenient.

## 9. Synthetic deployment profile

HV-2 must include an offline synthetic deployment profile sufficient to prove that the deployment abstraction is not secretly hard-coded to Privex/Fourth Street.

The synthetic profile:

- is test data only;
- may use reserved/example hostnames and temporary filesystem paths;
- must not contact the network;
- must not be represented as a real venue or deployable production target;
- must not relax the Fourth Street reference gate;
- must be constructible without changing the venue context.

Passing synthetic construction demonstrates abstraction only. It does not admit a second production topology.

## 10. Allowed implementation scope

HV-2 may:

- add `src/deployment/` or an equivalent narrowly named deployment-profile module;
- add schema/validation/loader code for the reviewed manifest;
- add a canonical Fourth Street reference deployment-profile loader/view;
- add synthetic deployment-profile fixtures and tests;
- refactor `src/release/privex-readiness.js`, `src/release/beta-readiness.js`, `src/release/read-only-readiness.js`, `src/release/payment-storage.js`, or `src/release/release-version.js` only as required to consume deployment-profile values without semantic drift;
- refactor release-check scripts only as required to inject/load the profile while preserving their exit behavior;
- adjust onboarding configuration ownership of the reference database path only if necessary to remove a duplicated deployment literal and only with exact behavior preservation;
- add or update tests that bind the reference profile to the manifest and prove release-gate invariance;
- update living developer/architecture documentation required to explain the boundary.

HV-2 should prefer the smallest consumer set that establishes a real profile seam. It is not required to migrate every historical `hive-bar` string in one operation.

## 11. Forbidden implementation scope

HV-2 may not:

- deploy, restart, stop, reconfigure, or otherwise mutate the live Fourth Street service;
- modify DNS, Cloudflare, Caddy, firewall, SSH, VPS, systemd, or host state;
- rename or move the live service, release root, last-good path, provenance files, payment database, or onboarding database;
- change the Fourth Street public or redirect hostname;
- change `fourth-street-bar-app/0.1.0`;
- change `package.json` version;
- perform a broad package/repository/logging rebrand;
- add a second real venue or production profile;
- add hostname/path/header/cookie/request-time tenant selection;
- change payment receipt, replay, idempotency, payer-serialization, cancellation, or chain-confirmation semantics;
- change Hive operation vectors, authorities, Keychain custody, or no-auto-rebroadcast semantics;
- change persistent database schemas;
- change onboarding transaction semantics or resource-policy thresholds merely for architectural convenience;
- rotate secrets or accounts;
- activate Pay, Distriator, onboarding, V1, controlled posting, delegated posting, or any other dormant capability;
- add server private keys or a Hive broadcast implementation;
- perform unrelated dependency or runtime upgrades;
- rewrite historical Hive-Bar evidence.

## 12. High-risk path guard

Unless separately justified by a preregistration amendment before implementation evidence is known, the candidate must not modify:

```text
src/hive/social-operations.js
src/hive/m4-operations.js
src/payments/payment-observer.js
src/payments/receipt-store.js
src/onboarding/transactions.js
src/onboarding/request-store.js
src/moderation/moderation-store.js
public/js/payment.js
.github/workflows/ci.yml
```

Changes to the deployment/release profile layer must not be smuggled through changes to the protocol or durable-state engines.

## 13. Qualification gates

HV-2 candidate acceptance requires at minimum:

```text
EXACT_BASE_ANCESTRY = PASS
PROFILE_SCHEMA_VALIDATION = PASS
REFERENCE_MANIFEST_COHERENCE = PASS
FOURTH_STREET_PROFILE_INVARIANCE = PASS
SYNTHETIC_PROFILE_CONSTRUCTION = PASS
REFERENCE_READ_ONLY_RELEASE_GATE = PASS
REFERENCE_BETA_RELEASE_GATE = PASS
REFERENCE_PAYMENT_STORAGE_SAFETY = PASS
REFERENCE_ONBOARDING_STORAGE_SAFETY = PASS
NPM_RUN_CHECK = PASS
FULL_TEST_SUITE = PASS
TEST_FAILURES = 0
COVERAGE_NO_MATERIAL_REGRESSION = PASS
PRODUCTION_NPM_AUDIT_HIGH_OR_CRITICAL = 0
SECRET_SCAN = PASS
NO_HIGH_RISK_PROTOCOL_PATH_DRIFT = PASS
NO_PERSISTENT_SCHEMA_CHANGE = PASS
NO_NEW_HIVE_WRITE_AUTHORITY = PASS
NO_LIVE_NETWORK_OR_PRODUCTION_MUTATION = PASS
WINDOWS_LINUX_CI = PASS
HUMAN_PROJECT_LEAD_REVIEW = PASS
```

Because release/configuration changes can affect normal application construction and visual fixtures even without intended rendering changes, the exact accepted candidate must also traverse the repository-native CI graph. Existing visual lanes must remain green unless an independently classified unrelated execution failure occurs.

No live Hive smoke is required merely to prove an offline deployment-profile refactor; network access must not be introduced into deterministic qualification.

## 14. Invariance fixtures

HV-2 tests should freeze representative accepted and rejected release configurations before or alongside refactor execution so the abstraction cannot change release decisions unnoticed.

At minimum cover:

1. canonical Fourth Street read-only profile;
2. canonical Fourth Street beta self-signing profile;
3. wrong public hostname;
4. non-HTTPS or host-mismatched origin;
5. wrong bind host;
6. wrong port;
7. wrong trust-proxy mode;
8. wrong application tag;
9. insufficient Hive RPC nodes;
10. unsafe or foreign payment database path;
11. Pay-enabled wrong merchant;
12. Pay-enabled missing durable store when existing storage is required;
13. onboarding-enabled wrong database path;
14. forbidden controlled/delegated posting residue;
15. placeholder session secret;
16. synthetic profile valid construction without network access.

Where current tests already provide stronger evidence, reuse or bind to those tests rather than duplicating weaker copies.

## 15. Failure classification

Any failure must be classified before repair:

```text
DEPLOYMENT_PROFILE_SCHEMA_DEFECT
REFERENCE_MANIFEST_COHERENCE_DEFECT
REFERENCE_RELEASE_BEHAVIOR_REGRESSION
PAYMENT_STORAGE_SAFETY_REGRESSION
ONBOARDING_STORAGE_SAFETY_REGRESSION
AUTHORIZATION_REGRESSION
SOURCE_OF_TRUTH_DUPLICATION_DEFECT
SYNTHETIC_PROFILE_ABSTRACTION_DEFECT
TEST_ONLY_STALE_IMPLEMENTATION_ASSERTION
WINDOWS_PORTABILITY_DEFECT
VISUAL_FIXTURE_CONSTRUCTION_DEFECT
DOCUMENTATION_DRIFT
EXECUTION_PLUMBING_DEFECT
```

Do not weaken accepted release, payment, authorization, provenance, or storage-safety rules simply to make the abstraction pass.

## 16. Success condition

HV-2 succeeds only if all of the following are true:

```text
EXPLICIT_DEPLOYMENT_PROFILE = ESTABLISHED
REFERENCE_MANIFEST = VALIDATED_SOURCE_OF_TRUTH
FOURTH_STREET_RELEASE_POLICY = PRESERVED
FOURTH_STREET_PRODUCTION_NAMESPACE = PRESERVED
GENERIC_RELEASE_CODE_DEPLOYMENT_LITERAL_DUPLICATION = MATERIALLY_REDUCED
SYNTHETIC_OFFLINE_PROFILE = CONSTRUCTIBLE
PRODUCTION_MUTATION = NONE
SECOND_REAL_VENUE = NONE
SHARED_RUNTIME_MULTI_TENANCY = NOT_CLAIMED
```

After HV-2 acceptance, perform a fresh sequencing decision across the whole successor product. Do not automatically assume that the next operation must be another multi-venue abstraction.
