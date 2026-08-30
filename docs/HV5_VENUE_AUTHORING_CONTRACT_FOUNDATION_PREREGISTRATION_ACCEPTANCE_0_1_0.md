# HV-5 Venue Authoring Contract Foundation — Preregistration Acceptance 0.1.0

## Status

```text
OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_ACCEPTANCE
ACCEPTANCE_VERSION = 0.1.0
STATUS = PROJECT_LEAD_ACCEPTED
REPOSITORY = etblink/Hive-Venues
CANONICAL_PREREGISTRATION_COMMIT = f54a2a198ca5f9c37d5d78f6f97d06211a5d2869
CANONICAL_PREREGISTRATION_TREE = 74e7a4c76dc00f208bc24eef464fb8c104ff87ba
CANONICAL_PREREGISTRATION_PARENT = 4890c2036cfa43825b8476e651c77725a6d6aca3
CONTROLLING_PREREGISTRATION = docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_0_1_0.md
QUALIFICATION_PR = 27
QUALIFICATION_CI_RUN = 33337058575
QUALIFICATION_CI_RUN_NUMBER = 76
CHANGED_PATH_COUNT = 1
CLASSIFIER = PASS
UBUNTU_DETERMINISTIC_GATE = PASS
WINDOWS_DETERMINISTIC_GATE = PASS
CONSOLIDATED_RENDERED_GATE = SKIPPED_BY_SCOPE
LIVE_HIVE_READ_ONLY_SMOKE = SKIPPED_BY_SCOPE
HV5_PREREGISTRATION = ACCEPTED
HV5_IMPLEMENTATION_STARTED = NO
HV5_IMPLEMENTATION_AUTHORIZED_BY_THIS_ACCEPTANCE = NO
SECOND_REAL_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = FORBIDDEN
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
NEXT_STEP = SEPARATE_HV5_IMPLEMENTATION_AUTHORIZATION_REVIEW
```

This record freezes the Project Lead's independent acceptance of the already canonical HV-5 preregistration. It does not authorize substantive implementation.

## 1. Review basis

The Project Lead re-read the complete canonical preregistration after its qualification and integration and reviewed it against the accepted HV-1 through HV-4 architecture and the Post-HV-4 sequencing decision.

The adjudication asked whether the preregistration is specific enough to constrain implementation, narrow enough to avoid prematurely selecting an editor or infrastructure stack, compatible with the accepted authority boundaries, and falsifiable enough to reject a machine-green but architecturally incorrect candidate.

## 2. Exact prospective contract accepted

The accepted prospective contract is the exact file at the exact canonical commit/tree above. No paraphrased substitute or later convenience interpretation supersedes it.

The accepted HV-5 core direction is:

```text
STRICT_EDITOR_INDEPENDENT_AUTHORING_DOCUMENT
+
EXECUTABLE_OWNERSHIP_POLICY
+
EXISTING_HV1_VENUE_CONTEXT_AUTHORITY
+
EXISTING_HV3_VENUE_PACKAGE_AUTHORITY
+
DEPLOYMENT_REFERENCE_BY_ID_ONLY
+
DETERMINISTIC_CANONICAL_SERIALIZATION
=
HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION
```

HV-5 must remain an authoring-contract milestone, not a visual-editor milestone.

## 3. Project Lead findings

### Finding A — authority reuse is correct

The preregistration does not create a duplicate business/Hive/package schema. It requires final domain validation through the accepted `createVenueContext(...)` and `createVenuePackage(..., validatedVenueContext)` authorities.

This preserves the established direction of dependency and reduces semantic drift risk.

**Disposition: ACCEPT.**

### Finding B — deployment authority is correctly separated

The authoring document carries only `deploymentRef.id`. It may not embed or infer a deployment manifest/profile, runtime environment, secret set, provider configuration, release path, service configuration, or fleet configuration.

A later bootstrap composition still requires separately supplied deployment authority and remains subject to HV-4 identity binding.

**Disposition: ACCEPT.**

### Finding C — ownership is executable rather than documentary only

The preregistration requires a deterministic ordinary-operator patch gate and explicit ownership classes:

```text
OPERATOR_AUTHORED
INTEGRATION_OWNED
DERIVED
PLATFORM_FIXED
DEPLOYMENT_OWNED
SECURITY_PRIVILEGED
SECRET_OR_PRIVATE__FORBIDDEN_FROM_AUTHORING_DOCUMENT
```

It also freezes concrete negative cases for identity, Hive binding, payment merchants, deployment reference, schema identity, media dimensions, unknown fields, secret material, and executable authority.

This is a meaningful falsification surface rather than a label-only permission model.

**Disposition: ACCEPT.**

### Finding D — direct source/code authoring remains first-class

The contract explicitly requires editor-independent JSON validation/normalization and preserves an advanced source/code path. A future WYSIWYG adapter is therefore optional presentation machinery over the same canonical state rather than a second source of truth.

**Disposition: ACCEPT.**

### Finding E — GrapesJS is placed at the correct architectural layer

The preregistration neither rejects nor installs GrapesJS. It requires any later GrapesJS adapter to map to canonical authoring paths and forbids GrapesJS project JSON or exported HTML/CSS from becoming the platform source of truth.

This preserves the product opportunity while avoiding dependency-led architecture.

**Disposition: ACCEPT.**

### Finding F — deterministic serialization is not reinvented

The preregistration reuses the accepted HV-4 canonical review convention:

```text
OBJECT_KEY_ORDER = RECURSIVE_LEXICOGRAPHIC
ARRAY_ORDER = PRESERVED
JSON_INDENT = 2_SPACES
ENCODING = UTF_8
LINE_ENDING = LF
TERMINAL_NEWLINE = REQUIRED
```

This supports later digest/CID work without turning HV-5 itself into a publication milestone.

**Disposition: ACCEPT.**

### Finding G — venue neutrality is preserved

No mandatory `venueType` or venue-category enum is permitted. Fourth Street and the fictional Lantern Room must exercise the same generic contract while differing meaningfully in authored content/vocabulary.

Starter archetypes remain optional later convenience layers rather than platform identity.

**Disposition: ACCEPT.**

### Finding H — media ownership split is coherent

Media source paths, alt text, and captions are ordinary authored expression under existing same-origin constraints; dimensions are classified as derived and cannot be arbitrarily overwritten by ordinary operator patches.

The preregistration does not require an upload system and requires any dimension derivation to remain local, deterministic, bounded, and network-independent.

**Disposition: ACCEPT.**

### Finding I — security and secret boundaries are explicit

Private keys, Hive authority material, session secrets, provider/API credentials, IPNS signing keys, 3Speak/SPK credentials, infrastructure credentials, passwords, and credential-bearing URLs are forbidden from canonical authoring state.

HV-5 secret/private rejection must be at least as strict as HV-4.

**Disposition: ACCEPT.**

### Finding J — failure criteria can reject a green-but-wrong implementation

The preregistration explicitly requires rejection/remediation if an editor-specific model becomes authoritative, existing validators are duplicated/weakened, protected ownership can be bypassed, secret state enters the document, canonical bytes vary across OS/insertion order, Fourth Street semantics drift, Lantern Room needs a fork, deployment becomes ordinary visual content, or out-of-scope production/infrastructure/publication/media/tenancy work is smuggled in.

This gives Project Lead human review a clear basis for rejecting a candidate even when CI passes.

**Disposition: ACCEPT.**

## 4. Qualification evidence

The exact preregistration candidate was qualified on PR #27 as one changed documentation path.

The associated CI run was:

```text
CI_RUN = 33337058575
RUN_NUMBER = 76
HEAD_COMMIT = f54a2a198ca5f9c37d5d78f6f97d06211a5d2869
HEAD_TREE = 74e7a4c76dc00f208bc24eef464fb8c104ff87ba
CLASSIFIER = PASS
UBUNTU = PASS
WINDOWS = PASS
RENDERED = SKIPPED_BY_SCOPE
LIVE_HIVE = SKIPPED_BY_SCOPE
```

The exact qualified PR head was fast-forwarded to `main`; no synthetic merge commit was introduced.

## 5. Accepted implementation obligations

A later separately authorized HV-5 implementation must satisfy the complete canonical preregistration, including at minimum:

- one strict schema-version-1 authoring envelope;
- authoritative delegation to HV-1/HV-3 validators;
- machine-readable or equivalently deterministic ownership policy covering every v1 path;
- deterministic canonical serialization;
- ordinary-operator patch enforcement;
- secret/private-material rejection at least as strict as HV-4;
- editor-independent source/code validation;
- Fourth Street equivalence evidence;
- Lantern Room non-bar evidence;
- bootstrap compatibility with separately controlled deployment authority;
- full Ubuntu and Windows deterministic qualification;
- Project Lead human authoring review.

## 6. Explicit non-authorization

This acceptance record does not authorize implementation and does not authorize any of the following:

```text
ADD_GRAPESJS_CORE_DEPENDENCY
ADD_GRAPESJS_STUDIO_SDK_DEPENDENCY
BUILD_BROWSER_WYSIWYG_EDITOR
BUILD_FREEFORM_PAGE_BUILDER
CREATE_MANDATORY_VENUE_TYPE_ENUM
ADMIT_SECOND_REAL_VENUE
MUTATE_FOURTH_STREET_PRODUCTION
CHANGE_HIVE_AUTHORITIES
CHANGE_PAYMENT_AUTHORITY
STORE_OR_ROTATE_SECRETS
EDIT_DEPLOYMENT_MANIFEST_THROUGH_AUTHORING
PUBLISH_CID
CREATE_OR_UPDATE_IPNS_NAME
CREATE_OR_CUSTODY_IPNS_SIGNING_KEY
UPLOAD_TO_3SPEAK_OR_SPKNETWORK
ADD_HELIA_OR_ORBITDB
BUILD_FLEET_ORCHESTRATION
ENABLE_SHARED_RUNTIME_MULTI_TENANCY
REPLACE_GIT_COMMIT_TREE_PROVENANCE
```

## 7. Acceptance conclusion

```text
HV5_PREREGISTRATION = PROJECT_LEAD_ACCEPTED
PROSPECTIVE_CONTRACT = SCIENTIFICALLY_AND_ARCHITECTURALLY_COHERENT
QUALIFICATION = PASS
IMPLEMENTATION = NOT_STARTED
IMPLEMENTATION_AUTHORIZATION = STILL_REQUIRED_AS_SEPARATE_CANONICAL_EVENT
```

The next operation is the separate bounded HV-5 implementation-authorization review. No substantive HV-5 code may begin under this acceptance record alone.
