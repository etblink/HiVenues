# HV-5 Venue Authoring Contract Foundation — Acceptance 0.1.0

## Status

```text
OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION
STATUS = PROJECT_LEAD_ACCEPTED
REPOSITORY = etblink/Hive-Venues

AUTHORIZED_CANONICAL_BASE_COMMIT = 2e2ab303f3a685729f915786df9b409b81b42508
AUTHORIZED_CANONICAL_BASE_TREE = 990bd2aa736db56b4c6f76f838f1ac6e57ed6b0a

QUALIFICATION_PR = 31
QUALIFIED_EXPLORATORY_HEAD = 720557a213f15fff05f7afc178bc10f10360dfcb
QUALIFIED_EXPLORATORY_TREE = aeaddf2bda5bdc89997caeaa8e4e472839ae8b10
QUALIFICATION_SYNTHETIC_MERGE = 0b124e0b025384e0ed9b026780d69db7ffdad941
QUALIFICATION_SYNTHETIC_MERGE_TREE = aeaddf2bda5bdc89997caeaa8e4e472839ae8b10
QUALIFICATION_CI_RUN = 33339685417

ACCEPTED_IMPLEMENTATION_COMMIT = 932bb2fe109acfca9cb4ab0514dabc7553edf764
ACCEPTED_IMPLEMENTATION_TREE = aeaddf2bda5bdc89997caeaa8e4e472839ae8b10
ACCEPTED_IMPLEMENTATION_PARENT = 2e2ab303f3a685729f915786df9b409b81b42508
ACCEPTED_IMPLEMENTATION_MESSAGE = Implement HV-5 venue authoring contract foundation

HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION = ACCEPTED
NEXT_OPERATION_AFTER_ACCEPTANCE = POST_HV5_LIVING_ROUTING_RECONCILIATION
NEXT_SUBSTANTIVE_IMPLEMENTATION_AUTHORIZED = NO
```

This record permanently accepts the bounded HV-5 Venue Authoring Contract Foundation implementation after independent Project Lead review, exact-tree qualification, clean canonical reconstruction, and post-write identity verification.

It does not select a post-HV-5 product lane and does not authorize any further substantive implementation.

## 1. Controlling prospective and authorization records

HV-5 was governed by the already canonical sequence:

```text
HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_0_1_0.md
HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_ACCEPTANCE_0_1_0.md
HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_AUTHORIZATION_0_1_0.md
HV5_IMPLEMENTATION_AUTHORIZATION_ROUTING_RECONCILIATION_0_1_0.md
```

The preregistration froze the required editor-independent authoring contract, ownership classes, ordinary-operator patch gate, direct source path, validator delegation, serialization semantics, preview boundary, synthetic proof requirements, explicit non-effects, and acceptance criteria.

The separate implementation authorization permitted only the minimum offline HV-5 core. It did not authorize GrapesJS, a browser WYSIWYG editor, a real second venue, production mutation, CID/IPNS publication, 3Speak/SPK, replicated state, fleet operations, or shared-runtime multi-tenancy.

## 2. Accepted implementation surface

The accepted implementation tree changes exactly these eight paths relative to the authorized canonical base:

```text
docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_0_1_0.md
docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_REVIEW_0_1_0.md
scripts/validate-venue-authoring.js
src/venue/authoring.js
src/venue/bootstrap.js
src/venue/safe-document.js
test/hv5-venue-authoring-contract.test.js
test/support/hv5-authoring-fixtures.js
```

No dependency, package-lock, runtime, deployment manifest/profile, production configuration, protocol/auth/payment/moderation/onboarding implementation, or user-visible production presentation file changed.

## 3. Accepted authority architecture

HV-5 introduces one strict editor-independent canonical authoring document while preserving the already accepted domain authorities:

```text
CANONICAL_AUTHORING_DOCUMENT
  -> secret/private safety scan
  -> strict HV-5 envelope
  -> createVenueContext(...)
  -> createVenuePackage(..., validatedVenueContext)
  -> ownership completeness
  -> deterministic immutable authoring document
```

HV-5 does not maintain shadow venue-context or venue-package schemas.

For deployment composition:

```text
VALIDATED_HV5_AUTHORING_DOCUMENT
+ SEPARATELY_SUPPLIED_DEPLOYMENT_MANIFEST
-> existing composeVenueBootstrap(...)
```

HV-4 therefore remains authoritative for deployment compilation and three-way venue/package/deployment binding.

Acceptance findings:

```text
HV1_DOMAIN_AUTHORITY_PRESERVED = YES
HV3_PACKAGE_AUTHORITY_PRESERVED = YES
HV4_DEPLOYMENT_AUTHORITY_PRESERVED = YES
SHADOW_DOMAIN_SCHEMA_INTRODUCED = NO
SECOND_DEPLOYMENT_SYSTEM_INTRODUCED = NO
```

## 4. Canonical v1 authoring document

The accepted authoring envelope is exactly:

```json
{
  "schemaVersion": 1,
  "deploymentRef": {
    "id": "deployment-profile-id"
  },
  "venueContext": {},
  "venuePackage": {}
}
```

Only the non-secret deployment-reference ID is retained in authoring state. The deployment manifest/profile itself remains outside authoring authority.

The authoring document is deeply immutable after validation.

## 5. Ownership model accepted

The accepted implementation exposes the exact frozen classes:

```text
OPERATOR_AUTHORED
INTEGRATION_OWNED
DERIVED
PLATFORM_FIXED
DEPLOYMENT_OWNED
SECURITY_PRIVILEGED
SECRET_OR_PRIVATE__FORBIDDEN_FROM_AUTHORING_DOCUMENT
```

Every path present in a validated v1 proof document must have a class. Unknown/unclassified paths fail closed.

The minimum accepted semantics are:

- schema-version paths are `PLATFORM_FIXED`;
- venue/package identity and Hive community/account bindings are `INTEGRATION_OWNED`;
- payment merchant authority is `SECURITY_PRIVILEGED`;
- the deployment reference is `DEPLOYMENT_OWNED`;
- approved public venue facts, package copy, same-origin media selection, and operator/staff vocabulary are `OPERATOR_AUTHORED`;
- media width/height values are `DERIVED`.

Mixed-authority containers and array topology are protected in v1. Ordinary operators may edit approved authored leaves but may not gain implicit structural authority by replacing an enclosing mixed-authority object or changing array cardinality.

This conservative interpretation is accepted as consistent with the frozen preregistration.

## 6. Ordinary-operator patch gate accepted

`applyOrdinaryOperatorEdit(base, proposed)`:

1. independently validates base and proposal through accepted domain validators;
2. compares semantic changes;
3. treats key-set/cardinality changes as protected-container changes;
4. permits only changed paths classified `OPERATOR_AUTHORED`;
5. rejects all other classes;
6. does not partially mutate the base;
7. returns an immutable validated result only after complete success.

Accepted negative controls include schema, venue identity, Hive community, payment merchant, package identity, deployment reference, derived dimension, gallery topology, and unknown executable-style field changes.

## 7. Shared secret/private and canonical-document machinery accepted

HV-5 did not fork the HV-4 safety logic. `src/venue/safe-document.js` centralizes the shared machinery used by both HV-4 bootstrap and HV-5 authoring.

The accepted boundary rejects:

- secret-bearing field names;
- recognizable private-key material;
- credential-bearing HTTP(S) userinfo;
- secret-bearing URL query keys;
- circular references.

Rejected protected values are not echoed in diagnostics.

Canonical JSON semantics are:

```text
OBJECT_KEY_ORDER = RECURSIVE_LEXICOGRAPHIC
ARRAY_ORDER = PRESERVED
JSON_INDENT = 2_SPACES
ENCODING = UTF_8
LINE_ENDING = LF
TERMINAL_NEWLINE = REQUIRED
```

The unchanged HV-4 regression tests passed under the shared refactor.

## 8. Direct source/code path accepted

The editor-independent direct validation surface is:

```text
scripts/validate-venue-authoring.js
```

It reads explicit JSON, performs secret/private rejection and strict/domain validation, emits deterministic canonical JSON for valid input, returns nonzero for invalid input, and performs no Hive RPC, HTTP request, signing, broadcast, deployment mutation, DNS/VPS/systemd action, or production write.

A visual editor is therefore not required to inspect, author, validate, or review canonical venue configuration.

## 9. Fourth Street and Lantern Room proof

The accepted tests derive their proof documents from existing authorities rather than copied values.

Fourth Street uses:

```text
FOURTH_STREET_REFERENCE_VENUE
FOURTH_STREET_REFERENCE_PACKAGE
REFERENCE_DEPLOYMENT_PROFILE.id
```

Lantern Room uses:

```text
HV3_SYNTHETIC_VENUE
HV3_SYNTHETIC_PACKAGE
HV4_SYNTHETIC_DEPLOYMENT_MANIFEST.deployment.id
```

The Lantern Room remains fictional and meaningfully non-bar-specific, including `reading room` / `host` vocabulary.

No generic `venueType` field or category-specific branch exists in the accepted authoring core.

## 10. HV-4 bootstrap compatibility accepted

Both proof documents compose through existing HV-4 when separately supplied with matching deployment authority.

The Lantern Room authoring document paired with the valid Fourth Street deployment manifest fails closed because its authoring deployment reference does not match the separately validated deployment identity.

Acceptance findings:

```text
MATCHING_HV4_COMPOSITION = PASS
MISMATCHED_DEPLOYMENT_BINDING = FAIL_CLOSED
HV4_THREE_WAY_BINDING_WEAKENED = NO
```

## 11. Project Lead review finding and repair history

The early qualification run:

```text
RUN = 33338994216
RESULT = FAILURE
```

found one focused-test expectation defect.

The venue-ID negative control was correctly rejected by the existing HV-3 package/venue binding validator before the HV-5 ownership layer. The test predicate had been too specific about which rejection layer must fire.

The repair changed only the test predicate to accept either authoritative domain rejection or HV-5 ownership rejection. It did not change implementation behavior, validator ordering, authorization scope, or protected authority.

Classification:

```text
FINDING_001 = TEST_EXPECTATION_TOO_NARROW
IMPLEMENTATION_DEFECT = NO
SECURITY_BOUNDARY_WEAKENED = NO
DOMAIN_VALIDATOR_DELEGATION_PRESERVED = YES
```

The permanent pre-acceptance review is frozen in:

```text
docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_REVIEW_0_1_0.md
```

with:

```text
PROJECT_LEAD_IMPLEMENTATION_REVIEW = PASS
```

## 12. Exact qualification evidence

The final exploratory candidate was:

```text
PR = 31
HEAD = 720557a213f15fff05f7afc178bc10f10360dfcb
TREE = aeaddf2bda5bdc89997caeaa8e4e472839ae8b10
SYNTHETIC_MERGE = 0b124e0b025384e0ed9b026780d69db7ffdad941
SYNTHETIC_MERGE_TREE = aeaddf2bda5bdc89997caeaa8e4e472839ae8b10
CI_RUN = 33339685417
```

Final qualification result:

```text
CLASSIFIER = PASS
UBUNTU_DETERMINISTIC_GATE = PASS
WINDOWS_DETERMINISTIC_GATE = PASS
CONSOLIDATED_RENDERED_GATE = PASS
LIVE_HIVE_READ_ONLY_SMOKE = SKIPPED
```

The rendered gate was conservative overqualification and exercised the retained M18, C2, and UX presentation suites under pinned Chromium.

## 13. Exact-tree evidence transfer and clean canonical reconstruction

The final PR head tree and GitHub synthetic merge tree are byte-identical:

```text
QUALIFIED_PR_HEAD_TREE = aeaddf2bda5bdc89997caeaa8e4e472839ae8b10
QUALIFIED_SYNTHETIC_MERGE_TREE = aeaddf2bda5bdc89997caeaa8e4e472839ae8b10
TREE_IDENTITY = PASS
```

The qualified tree was reconstructed as one clean direct child of the exact authorized canonical base:

```text
COMMIT = 932bb2fe109acfca9cb4ab0514dabc7553edf764
TREE = aeaddf2bda5bdc89997caeaa8e4e472839ae8b10
PARENT = 2e2ab303f3a685729f915786df9b409b81b42508
MESSAGE = Implement HV-5 venue authoring contract foundation
```

No qualification-relevant behavior depends on the exploratory repair-chain commit identities. The tests and validators operate on repository bytes/configured fixtures rather than requiring the exploratory head SHA. Exact tree identity therefore supports transfer of the qualification evidence to the clean canonical implementation commit.

PR #31 was intentionally closed unmerged after the clean byte-identical implementation became canonical.

## 14. Explicit non-effects accepted

HV-5 did not:

```text
ADD_GRAPESJS
ADD_GRAPESJS_STUDIO_SDK
BUILD_BROWSER_WYSIWYG
BUILD_FREEFORM_PAGE_TREE
CREATE_MANDATORY_VENUE_TYPE_ENUM
ADMIT_REAL_SECOND_VENUE
MUTATE_PRODUCTION
CHANGE_HIVE_AUTHORITY
CHANGE_PAYMENT_AUTHORITY
EDIT_DEPLOYMENT_MANIFEST_THROUGH_AUTHORING
STORE_OR_ROTATE_SECRETS
PUBLISH_CID
CREATE_OR_UPDATE_IPNS
HANDLE_IPNS_SIGNING_KEYS
INTEGRATE_3SPEAK_OR_SPKNETWORK
ADD_HELIA_OR_ORBITDB
BUILD_FLEET_ORCHESTRATION
ENABLE_SHARED_RUNTIME_MULTI_TENANCY
CHANGE_FOURTH_STREET_PRODUCTION_COMPATIBILITY_NAMES
RENAME_INHERITED_PACKAGE_METADATA
```

## 15. Acceptance conclusion

```text
HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION = ACCEPTED
PROJECT_LEAD_ACCEPTANCE = PASS
CANONICAL_IMPLEMENTATION = 932bb2fe109acfca9cb4ab0514dabc7553edf764
CANONICAL_TREE = aeaddf2bda5bdc89997caeaa8e4e472839ae8b10
PRODUCTION_MUTATION = NO
SECOND_REAL_VENUE_ADMITTED = NO
SHARED_RUNTIME_MULTI_TENANCY = NO
NEXT_OPERATION_AFTER_ACCEPTANCE = POST_HV5_LIVING_ROUTING_RECONCILIATION
NEXT_SUBSTANTIVE_IMPLEMENTATION_AUTHORIZED = NO
```

The next operation is bounded living-state/navigation reconciliation only. A fresh Post-HV-5 Sequencing Decision must remain a separate later Project Lead operation after living state truthfully records HV-5 acceptance.
