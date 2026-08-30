# HV-4 Isolated Venue Bootstrap Foundation — Acceptance 0.1.0

## Status

```text
OPERATION = HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION
ACCEPTANCE_VERSION = 0.1.0
STATUS = PROJECT_LEAD_ACCEPTED
REPOSITORY = etblink/Hive-Venues

AUTHORIZED_BASE_COMMIT = 20590dff2222a6dc855fabb9f0c4f8cb37cc2670
ACCEPTED_IMPLEMENTATION_COMMIT = c59f6aac948e5be59647694b3b60310d2b8faa30
ACCEPTED_IMPLEMENTATION_TREE = dd74fa3944b348d86e9bef7c827a13cb8ab21ee2
ACCEPTED_IMPLEMENTATION_PARENT = 20590dff2222a6dc855fabb9f0c4f8cb37cc2670
ACCEPTED_IMPLEMENTATION_MESSAGE = Implement HV-4 isolated venue bootstrap foundation

QUALIFICATION_PR = 22
QUALIFICATION_HEAD = e999edf081964d258e4a9b73734e0fedc14ce594
QUALIFICATION_HEAD_TREE = dd74fa3944b348d86e9bef7c827a13cb8ab21ee2
QUALIFICATION_SYNTHETIC_MERGE = 95c94c59b5a74ff44cf595225ecc91df44ed8cce
QUALIFICATION_SYNTHETIC_MERGE_TREE = dd74fa3944b348d86e9bef7c827a13cb8ab21ee2
QUALIFICATION_CI_RUN = 33334114135

SECOND_REAL_VENUE_ADMITTED = NO
PRODUCTION_MUTATION = NO
SHARED_RUNTIME_MULTI_TENANCY = NO
MANDATORY_VENUE_TYPE_TAXONOMY = NO
KUBO_IPFS_HELIA_ORBITDB = NOT_PART_OF_HV4
THREESPEAK_SPKNETWORK = NOT_PART_OF_HV4
WYSIWYG_EDITOR = NOT_PART_OF_HV4
```

HV-4 is accepted. The accepted implementation proves that one isolated venue composition can be constructed and reviewed deterministically from explicit non-secret venue-context, venue-package, deployment-profile, and composition-binding inputs while preserving the already accepted HV-1, HV-2, and HV-3 authority boundaries.

## Accepted architecture result

The accepted bootstrap path is:

```text
EXPLICIT_NONSECRET_BOOTSTRAP_INPUT
->
STRICT_BOOTSTRAP_ENVELOPE_AND_SECRET_BOUNDARY
->
createVenueContext(...)
+
createVenuePackage(..., venueContext)
+
compileDeploymentProfile(...)
->
EXPLICIT_VENUE_PACKAGE_DEPLOYMENT_BINDING_CHECKS
->
DEEPLY_IMMUTABLE_COMPOSITION
->
DETERMINISTIC_CANONICAL_REVIEW_JSON
```

HV-4 does not define a second venue schema, package schema, or deployment schema. The existing validators remain authoritative for their respective domains. The bootstrap layer adds only composition-level identity binding, secret exclusion, deterministic composition, canonical review output, and developer/operator validation behavior.

## Synthetic proof

The accepted synthetic proof reuses **The Lantern Room (Fixture)** from HV-3 and adds a test-only isolated deployment manifest.

The fixture remains meaningfully independent from Fourth Street:

```text
VENUE_ID = lantern-room-fixture
PACKAGE_ID = lantern-room-fixture-package
DEPLOYMENT_ID = lantern-room-offline-deployment
OPERATOR_NOUN = reading room
STAFF_ROLE = host
INSTANCE_COUNT = 1
AUTOMATIC_DEPLOYS = false
REAL_INFRASTRUCTURE = NO
REAL_CREDENTIALS = NO
```

The fixture uses `.invalid` hosts and fixture-local `/tmp` paths. No real second venue, Hive account, domain, provider account, secret, or infrastructure was admitted.

## Composition binding result

Project Lead review rejected an earlier draft because the independently valid deployment profile was not composition-bound to the intended venue/package. The accepted implementation therefore requires explicit declared bindings for:

```text
venueId
packageId
deploymentId
```

and compares those declarations to the outputs of the authoritative validators.

A hostile negative control supplies the valid Fourth Street deployment manifest under the Lantern Room deployment binding. The composition is correctly rejected. This establishes that independently well-formed inputs are not sufficient when their intended composition identities conflict.

## Secret-safety result

The accepted bootstrap is explicitly non-secret configuration/review infrastructure.

It rejects, before normalized review output:

- secret-bearing field names;
- recognizable private-key material;
- URL username/password userinfo credentials;
- URL query-parameter names indicating token, credential, authorization, signature, password, API-key, private-key, SSH-key, or secret material.

Rejection messages identify location without echoing the rejected secret value.

The repository-wide preexisting secret scanner was not weakened. An early hostile test fixture containing a literal PEM marker correctly triggered that scanner; the fixture was repaired to construct the test marker at runtime while preserving both the repository scanner and the HV-4 negative test.

These checks are defense in depth. Bootstrap authors remain responsible for providing only public, non-secret configuration data.

## Fourth Street preservation result

HV-4 did not rename or migrate Fourth Street production compatibility identities. Focused qualification preserves, among other accepted facts:

```text
/opt/hive-bar
hive-bar.service
/var/lib/hive-bar/payments/receipts.sqlite3
/var/lib/hive-bar/onboarding/onboarding.sqlite3
.hive-bar-commit
.hive-bar-tree
fourth-street-bar-app/<version>
```

Source evolution remains distinct from production migration.

## Qualification result

The final qualification tree was exactly:

```text
dd74fa3944b348d86e9bef7c827a13cb8ab21ee2
```

The changed-path surface was exactly seven files:

```text
.github/workflows/ci.yml
docs/HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_IMPLEMENTATION_0_1_0.md
docs/HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_IMPLEMENTATION_REVIEW_0_1_0.md
scripts/validate-venue-bootstrap.js
src/venue/bootstrap.js
test/hv4-isolated-venue-bootstrap.test.js
test/support/hv4-synthetic-bootstrap.js
```

Final CI run `33334114135` passed:

```text
PATH_SCOPE_CLASSIFIER = PASS
UBUNTU_DETERMINISTIC = PASS
WINDOWS_DETERMINISTIC = PASS
PINNED_CHROMIUM_BROWSER_QUALIFICATION = PASS
M18_2_RENDERED_SUITE = PASS
M18_3_RENDERED_SUITE = PASS
M18_4_RENDERED_SUITE = PASS
C2_E_RENDERED_SUITE = PASS
C2_F_RENDERED_SUITE = PASS
UX_1A_RENDERED_SUITE = PASS
UX_1B_RENDERED_SUITE = PASS
UX_1C_RENDERED_SUITE = PASS
UX_1D_RENDERED_SUITE = PASS
UX_1F_RENDERED_SUITE = PASS
UX_1E_RENDERED_SUITE = PASS
RENDERED_EVIDENCE_PRESERVATION = PASS
LIVE_HIVE_READ_SMOKE = SKIPPED_AS_NOT_REQUESTED
```

The rendered lane was required for this candidate because `.github/workflows/ci.yml` changed. No application presentation source was changed. Its purpose was to prove the classifier/workflow repair preserved the retained presentation safety net, not to claim that HV-4 introduced a new user-visible design.

## Tree-evidence transfer and clean canonical history

The exploratory qualification PR intentionally accumulated repair commits. That history was not canonicalized.

The final PR head `e999edf081964d258e4a9b73734e0fedc14ce594` and GitHub's synthetic PR merge commit `95c94c59b5a74ff44cf595225ecc91df44ed8cce` both resolved to the exact qualified tree:

```text
dd74fa3944b348d86e9bef7c827a13cb8ab21ee2
```

The canonical implementation commit was then reconstructed directly on the exact authorized base:

```text
PARENT = 20590dff2222a6dc855fabb9f0c4f8cb37cc2670
COMMIT = c59f6aac948e5be59647694b3b60310d2b8faa30
TREE = dd74fa3944b348d86e9bef7c827a13cb8ab21ee2
```

Evidence transfer is accepted because the tree is byte-identical, the changed-path surface is identical, no application/release semantic in this operation depends on the reconstructed commit SHA, and Project Lead review independently verified the equivalence before the non-force fast-forward.

PR #22 was closed unmerged after canonical integration so that its exploratory repair sequence remains qualification history rather than canonical product history.

## Project Lead review findings preserved

Machine qualification was not treated as sufficient. Human review rejected or repaired four material issues during construction:

1. missing composition-level deployment binding;
2. a hostile PEM test fixture that conflicted with the repository-wide secret scanner;
3. credential-bearing HTTPS URL values that could otherwise pass through the accepted HV-2 deployment validator;
4. an implementation-guide status sentence that would have become false immediately after acceptance.

The accepted tree includes the repairs for all four.

## Accepted developer/operator result

HV-4 now provides an offline validation command:

```text
node scripts/validate-venue-bootstrap.js path/to/non-secret-bootstrap.json
```

For valid input it emits deterministic normalized review JSON. It performs no network request, writes no generated per-venue source, mutates no production system, and persists no secret.

This proves the bootstrap foundation. It does not yet prove a no-code authoring interface, real-client onboarding, deployment automation, or fleet management.

## Non-effects

HV-4 acceptance does not authorize or imply:

- a real second venue/client;
- Fourth Street production deployment or migration;
- shared-runtime multi-tenancy;
- a mandatory venue category taxonomy;
- venue archetype/template implementation;
- WYSIWYG/no-code authoring;
- Kubo/IPFS publication;
- Helia/OrbitDB replication;
- 3Speak/SPKNetwork integration;
- fleet provisioning/orchestration;
- Hive account/community creation;
- payment/auth/moderation/onboarding semantic changes;
- dependency/runtime upgrades;
- broad UI redesign.

Those are later sequencing candidates only. HV-4 acceptance supplies evidence that several of them can now be evaluated against a real, explicit per-venue composition contract rather than a hypothetical one.

## Acceptance conclusion

```text
HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION = ACCEPTED
BOOTSTRAP_COMPOSITION_PROOF = PASS
LANTERN_ROOM_SYNTHETIC_ISOLATION_PROOF = PASS
THREE_WAY_IDENTITY_BINDING = PASS
SECRET_SAFE_REVIEW_BOUNDARY = PASS
NO_SOURCE_FORK_PROOF = PASS
FOURTH_STREET_PRODUCTION_COMPATIBILITY = PRESERVED
DUAL_OS_QUALIFICATION = PASS
RETAINED_RENDERED_SAFETY_NET = PASS
PRODUCTION_CHANGED = NO
SECOND_REAL_VENUE_ADMITTED = NO
```

Living successor routing must now be reconciled so it no longer describes HV-4 preregistration or implementation as the next operation. A fresh post-HV-4 sequencing decision remains a separate operation; this acceptance record does not preselect that decision.
