# HV-1 Venue Context Foundation — Preregistration 0.1.0

## Status

```text
OPERATION = HV1_VENUE_CONTEXT_FOUNDATION
STATUS = FROZEN_PREREGISTRATION__IMPLEMENTATION_NOT_STARTED
BASE_COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
BASE_TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c
NEW_LIVE_HIVE_WRITES = FORBIDDEN
PRODUCTION_DEPLOYMENT = FORBIDDEN
TRUE_MULTI_TENANT_ROUTING = FORBIDDEN
PAYMENT_PROTOCOL_CHANGE = FORBIDDEN
HIVE_TRANSACTION_SEMANTICS_CHANGE = FORBIDDEN
```

## 1. Purpose

HV-1 establishes the first real platform seam in Hive-Venues: an explicit venue context that supplies venue identity and venue-scoped Hive/business bindings to the inherited application without changing Fourth Street behavior.

The operation is a refactor with architectural assertions. It is not a feature launch.

## 2. Question

Can the inherited Fourth Street application be expressed as:

```text
GENERIC_PLATFORM_CORE + EXPLICIT_VENUE_CONTEXT
```

while preserving the accepted rendered behavior, Hive operation vectors, payment behavior, security boundaries, and release safety of the inherited baseline?

A successful HV-1 answer does not establish that the application is already safely multi-tenant. It establishes the prerequisite venue boundary.

## 3. Frozen scope

HV-1 may:

- introduce a validated venue-context representation;
- introduce one canonical Fourth Street venue fixture/manifest as the reference tenant;
- move venue-scoped identity/business/Hive-binding defaults behind that context;
- rename internal generic fields where required to remove `bar` as a platform concept;
- adapt application locals, reads, views, and tests to consume the venue context;
- add invariance tests demonstrating that the reference tenant reproduces inherited behavior;
- add tests preventing generic platform modules from importing the reference tenant directly where dependency injection is required;
- update developer-facing documentation necessary to explain the new boundary.

HV-1 may not:

- add a second real venue;
- choose hostname/path tenant resolution;
- make one runtime dynamically select between tenants;
- change Hive operation payload semantics;
- change Posting/Active/Memo authority requirements;
- change write-mode activation policy;
- change payment confirmation, replay, idempotency, receipt-state, or no-retry semantics;
- change onboarding transaction semantics;
- change moderation behavior;
- change persistent storage schemas unless a strictly local compatibility repair is unavoidable and independently justified;
- change production environment or deploy anything;
- rotate secrets, accounts, community IDs, merchant accounts, or service topology;
- broaden network access or RPC write surfaces;
- rebrand the patron UI beyond what is mechanically necessary for the venue abstraction;
- perform unrelated dependency upgrades.

## 4. Venue-context minimum contract

The implementation should converge on an explicit object with, at minimum, equivalent concepts for:

```text
VENUE_ID
DISPLAY_NAME
PUBLIC_ADDRESS
PUBLIC_PHONE
PUBLIC_HOURS
PUBLIC_WEBSITE_URL
PUBLIC_MAP_URL
HIVE_COMMUNITY_ID
HIVE_OFFICIAL_ACCOUNT
HIVE_THREADS_CONTAINER_ACCOUNT
HIVE_PAYMENT_MERCHANT_ACCOUNTS
```

The exact JavaScript shape is not precommitted if implementation evidence supports a better grouping. The semantic ownership is precommitted: these are venue-scoped inputs, not universal platform constants.

Brand/theme assets may be referenced by the venue context if needed, but a generalized theme system is outside HV-1.

## 5. Environment/configuration rule

HV-1 must not solve platformization by simply multiplying environment-variable names.

Environment variables may continue to provide deployment-specific overrides for the reference deployment, but code should assemble them into an explicit venue context before application services/views consume venue identity.

The preferred direction is:

```text
RAW_ENVIRONMENT
-> VALIDATED_DEPLOYMENT_CONFIG
-> VALIDATED_VENUE_CONTEXT
-> APPLICATION
```

not:

```text
EVERY_MODULE_READS_FOURTH_STREET_ENV_VARS
```

Compatibility with the current `.env` contract may be retained during HV-1 to avoid coupling architectural extraction to production migration.

## 6. Reference-tenant invariance requirement

Fourth Street Bar is the golden compatibility tenant for HV-1.

For the exact accepted inherited configuration, HV-1 must preserve at minimum:

- site display name and public business information;
- Hive community ID;
- official venue account;
- Threads container account;
- payment merchant allowlist;
- public Home/Community/Profile/Wallet/Pay behavior within the current capability gates;
- current beta/V1 action manifests;
- exact social operation golden vectors;
- exact M4/profile/rewards/message transaction builders;
- payment invoice, preflight, observation, receipt, replay, and cancellation semantics;
- onboarding transaction semantics;
- moderation semantics;
- release fail-closed behavior unless the release checker is only being generalized without semantic change.

If an inherited test fails because its assertion is only a stale name/string assumption, the test may be updated only after Project Lead review confirms that no user-visible or transaction behavior was silently lost.

## 7. Core genericity assertions

HV-1 should add machine-checkable protection for the new boundary. At minimum, qualification should test that:

1. the application can be constructed with an explicitly supplied venue context;
2. the default/reference construction yields the canonical Fourth Street values;
3. generic application wiring does not hard-code `fourthstreetbar`, `fourthst.threads`, `hive-108590`, the Reno address, or the Fourth Street website as business logic;
4. a synthetic alternate venue context can pass configuration/application construction tests without being exposed as a real product tenant and without touching the network;
5. venue-scoped merchant and Hive bindings flow from the supplied context rather than from hidden constants;
6. operation builders remain signer/session/payload-driven and are not coupled to the venue display identity unless the protocol genuinely requires a venue binding;
7. no new server private-key or broadcast implementation exists.

The synthetic alternate context is a test fixture only. It is not a second admitted venue or production configuration.

## 8. Qualification gates

HV-1 candidate acceptance requires:

```text
NPM_RUN_CHECK = PASS
NPM_TEST_COVERAGE = PASS
TEST_FAILURES = 0
PRODUCTION_NPM_AUDIT_HIGH_OR_CRITICAL = 0
SECRET_SCAN = PASS
REFERENCE_TENANT_INVARIANCE = PASS
SYNTHETIC_TENANT_CONSTRUCTION = PASS
NO_NEW_HIVE_WRITE_AUTHORITY = PASS
NO_PAYMENT_SEMANTIC_DRIFT = PASS
NO_PRODUCTION_MUTATION = PASS
HUMAN_PROJECT_LEAD_REVIEW = PASS
```

Where current CI supports Windows/Linux parity, that parity must continue to pass. Visual evidence is required only if HV-1 changes rendered output beyond invisible data plumbing; otherwise existing structural/accessibility/render tests are sufficient and needless screenshot churn should be avoided.

## 9. Failure classification

Failures must be classified before repair:

```text
ARCHITECTURE_DEFECT
REFERENCE_TENANT_BEHAVIOR_REGRESSION
TRANSACTION_SEMANTIC_REGRESSION
PAYMENT_SAFETY_REGRESSION
AUTHORIZATION_REGRESSION
CONFIG_COMPATIBILITY_DEFECT
TEST_ONLY_STALE_NAMING
RELEASE_TOOLING_COUPLING
DOCUMENTATION_DRIFT
EXECUTION_PLUMBING_DEFECT
```

Do not weaken transaction, payment, security, or provenance assertions merely to make a generic abstraction pass.

## 10. Success condition

HV-1 succeeds only if the reference application remains functionally the same while venue identity becomes an explicit dependency.

The desired result is:

```text
FOURTH_STREET_BEHAVIOR = PRESERVED
VENUE_IDENTITY_HARD_CODING_IN_GENERIC_CORE = MATERIAL_REDUCTION
EXPLICIT_VENUE_CONTEXT = ESTABLISHED
TRUE_MULTI_TENANT_RUNTIME = NOT_YET_CLAIMED
```

After HV-1, a fresh sequencing decision will determine whether the highest-value next operation is deployment-profile separation, venue asset/theme separation, persistent tenant scoping, or actual multi-venue resolution.
