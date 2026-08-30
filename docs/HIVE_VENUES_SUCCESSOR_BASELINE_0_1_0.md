# Hive-Venues Successor Baseline 0.1.0

## Status

```text
STATUS = FROZEN_SUCCESSOR_BASELINE
REPOSITORY = etblink/Hive-Venues
SOURCE_REPOSITORY = etblink/Hive-Bar
SOURCE_MAIN_COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
SOURCE_MAIN_TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c
SOURCE_MAIN_PARENT = 09ff0802bcfe8920eb88ed2f347ddd51253b524a
SOURCE_MAIN_MESSAGE = C2-G.1c-R5.3 harden imported payment QR decoding
SOURCE_BRANCH_TIPS_MIRRORED_EXACTLY = 34
SOURCE_TAG_COUNT = 0
LIVE_PRODUCTION_MUTATION_AUTHORIZED = NO
```

This artifact establishes the starting boundary for the Hive-Venues successor project. It does not rewrite the scientific or engineering history of Hive-Bar and does not claim that the inherited application is already a multi-venue platform.

## 1. Product identity

Hive-Venues is a multi-venue community and social platform powered by Hive for independent venues.

Fourth Street Bar is the first real venue deployment and reference tenant. It is not the platform identity.

```text
PLATFORM != VENUE
FOURTH_STREET_BAR = REFERENCE_TENANT_001
HIVE_BAR = SOURCE_LINEAGE
HIVE_VENUES = SUCCESSOR_PLATFORM
```

A future venue must not require a source-code fork merely to supply its identity, Hive community/account bindings, merchant configuration, public business information, branding, or venue-local policy.

## 2. Provenance migration result

The successor repository preserves the original Git object graph rather than flattening Hive-Bar into a new initial snapshot.

At migration qualification:

- destination `main` equals the source `main` commit exactly;
- destination `main` has the same tree identity as the source;
- all 34 source branch names were attached to the exact corresponding source commit SHAs;
- the source repository exposes no tags, so no source tags were omitted;
- temporary import bootstrap commits are not ancestors of successor `main`;
- `etblink/Hive-Bar` remains untouched and independently recoverable.

Historical branches are retained initially for migration fidelity. Their continued presence in the live successor branch surface is not permanent policy; they may later be archived or removed after an exact provenance/lifecycle audit.

## 3. Read-only inherited baseline audit

Audit workflow run:

```text
GITHUB_ACTIONS_RUN = 33305523641
AUDIT_SUBJECT_PARENT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
AUDIT_EXECUTION_COMMIT = e5624106e4112da084951afb103015d02acbdc82
AUDIT_RESULT = PASS
```

The audit execution commit adds only the read-only audit workflow to the inherited subject. Therefore its measured checkout contains one audit-only tracked file in addition to the inherited main tree.

Observed quality baseline:

```text
INHERITED_NPM_CHECK = PASS
INHERITED_TESTS = 532_PASS__0_FAIL
LINE_COVERAGE = 81.93_PERCENT
BRANCH_COVERAGE = 73.82_PERCENT
FUNCTION_COVERAGE = 87.27_PERCENT
NPM_AUDIT_INFO = 0
NPM_AUDIT_LOW = 0
NPM_AUDIT_MODERATE = 0
NPM_AUDIT_HIGH = 0
NPM_AUDIT_CRITICAL = 0
RUNTIME_DEPENDENCIES = 15
DEV_DEPENDENCIES = 8
OUTDATED_DIRECT_DEPENDENCIES = 8
```

The inherited codebase is therefore not being treated as disposable legacy code. It has a substantial tested security, accessibility, transaction-safety, and deployment-provenance foundation worth preserving.

The audit also found strong venue/source-lineage coupling. The audit checkout reported 153 non-document paths matching `Hive-Bar`, `4th Street`, `Fourth Street`, `fourthstreet`, or `fourthst`; one of those paths is the audit-only workflow itself, leaving 152 matching inherited non-document paths under that exact heuristic.

This count is a coupling-discovery heuristic, not a claim that 152 files require architectural refactoring. It includes tests, deployment-history terminology, release tooling, and user-visible venue branding alongside true architectural coupling.

## 4. Architectural diagnosis

The inherited application already contains meaningful modular seams:

- Hive RPC/read services;
- exact social operation builders;
- Keychain authentication and browser-side signing boundaries;
- payment observation and durable receipt state;
- moderation service/store;
- onboarding service/store;
- release/deployment identity;
- application configuration validation;
- route modules and view composition.

However, venue identity is still embedded in core configuration and surrounding infrastructure. Examples at the inherited boundary include:

- `BAR_ADDRESS`, `BAR_PHONE`, `BAR_HOURS`, `BAR_WEBSITE_URL`, and `BAR_MAP_URL` as top-level runtime settings;
- `HIVE_OFFICIAL_BAR_ACCOUNT` and a Fourth-Street-specific default;
- `HIVE_PAYMENT_MERCHANT_ACCOUNTS` defaulting to `fourthstreetbar`;
- `HIVE_APP_TAG` defaulting to `fourth-street-bar-app/0.1.0`;
- `officialBarAccount` as a core configuration field;
- `Hive-Bar` appearing in runtime error/logging language;
- deployment/service assets named around `hive-bar`;
- release gates that intentionally bind historical Fourth Street beta topology.

The platformization problem is therefore larger than changing a logo or repository name, but smaller than a rewrite.

## 5. Successor architecture principle

The safest evolution is staged:

```text
INHERITED_SINGLE_VENUE_APPLICATION
-> SINGLE_RUNTIME_WITH_EXPLICIT_VENUE_CONTEXT
-> DEPLOYMENT_PROFILE_SEPARATION
-> MULTI_VENUE_REGISTRY_AND_RESOLUTION
-> MULTI_VENUE_PRODUCT
```

Do not jump directly from the inherited single-venue runtime to host-level dynamic multi-tenancy. First prove that one explicit venue context can reproduce Fourth Street exactly.

The target conceptual boundary is:

```text
PLATFORM_CORE
+
VENUE_CONTEXT
+
DEPLOYMENT_PROFILE
```

`PLATFORM_CORE` owns generic Hive, authentication, social, payment protocol, content, moderation mechanisms, and safety invariants.

`VENUE_CONTEXT` owns venue identity and venue-scoped bindings such as stable venue ID, display name, public business details, Hive community/account bindings, threads container, merchant allowlist, branding/theme references, and venue-local feature/policy inputs.

`DEPLOYMENT_PROFILE` owns environment/topology decisions such as origins, storage paths, activation state, secrets, RPC topology, and deployment-specific safety gates.

These layers may initially be assembled into one process for one venue. Architectural separation precedes runtime multi-tenancy.

## 6. Inherited safety invariants to preserve

Platformization may not casually weaken the mature safety properties already established by Hive-Bar. In particular:

- no server custody of Hive private keys;
- browser signing remains explicit and Keychain-mediated where currently required;
- identity comes from server-verified sessions, not browser storage;
- exact operations remain reviewable before signing;
- ambiguous post-signing/broadcast states do not auto-retry;
- payment success requires exact chain observation under the accepted confirmation rules;
- encrypted Inbox plaintext remains client-side;
- server logging remains credential/body/memo-redacted;
- write capability remains explicit, scoped, and fail-closed;
- release/deployment identity remains exact and inspectable;
- accessibility, responsive, security, secret-scan, and cross-platform qualification remain first-class gates.

A platform abstraction that makes any of these harder to state or test is a regression unless separately justified.

## 7. Immediate sequencing decision

The highest-value first substantive successor operation is:

```text
HV1_VENUE_CONTEXT_FOUNDATION
```

HV-1 will extract an explicit venue context while preserving Fourth Street behavior. It is not authorized to implement true multi-tenant routing, modify production, broaden Hive write authority, change payment semantics, or redesign the product UI.

The separate HV-1 preregistration freezes its exact scope and acceptance conditions before implementation.

## 8. Deferred questions

The following remain deliberately unselected until HV-1 teaches us more:

- URL/hostname/path strategy for multiple venues;
- whether one process serves many venues or deployment units remain venue-isolated;
- persistence partitioning and tenant-scoped database design;
- tenant administration/control plane;
- venue onboarding automation;
- shared-vs-venue Hive community models;
- platform pricing/resale architecture;
- cross-venue discovery/feed features;
- platform brand/theme redesign;
- migration of the existing Fourth Street production deployment;
- dependency upgrades that are not required for HV-1.

Deferral is intentional. The successor project will sequence these from evidence rather than from a premature platform diagram.
