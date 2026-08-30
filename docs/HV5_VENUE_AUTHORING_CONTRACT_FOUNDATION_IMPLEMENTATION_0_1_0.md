# HV-5 Venue Authoring Contract Foundation — Implementation 0.1.0

## Status

```text
OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION
IMPLEMENTATION_VERSION = 0.1.0
DOCUMENT_ROLE = IMPLEMENTATION_CONTRACT_AND_OPERATOR_GUIDE
REPOSITORY = etblink/Hive-Venues
CONTROLLING_PREREGISTRATION = docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_0_1_0.md
CONTROLLING_AUTHORIZATION = docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_IMPLEMENTATION_AUTHORIZATION_0_1_0.md
BROWSER_WYSIWYG_EDITOR = NOT_IMPLEMENTED
GRAPESJS_DEPENDENCY = NO
SECOND_REAL_VENUE = NO
PRODUCTION_MUTATION = NO
```

This document describes the implemented HV-5 core. Acceptance status is intentionally recorded elsewhere so this implementation guide does not become false immediately after a later Project Lead acceptance event.

## 1. Implemented authority flow

HV-5 implements one editor-independent authoring document and preserves the previously accepted validators as the domain authorities:

```text
CANONICAL_AUTHORING_DOCUMENT
        |
        +--> secret/private safety scan
        |
        +--> strict HV-5 envelope validation
        |
        +--> createVenueContext(...)
        |
        +--> createVenuePackage(..., validatedVenueContext)
        |
        +--> ownership completeness check
        |
        +--> deterministic immutable authoring document
```

The canonical v1 authoring shape is:

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

`venueContext` and `venuePackage` are the exact existing HV-1/HV-3 shapes. HV-5 does not maintain shadow schemas for them.

## 2. Core module

`src/venue/authoring.js` exports:

```text
createVenueAuthoringDocument(...)
serializeVenueAuthoringReview(...)
ownershipForPath(...)
buildOwnershipMap(...)
applyOrdinaryOperatorEdit(...)
composeVenueBootstrapFromAuthoring(...)
OWNERSHIP
VenueAuthoringError
```

### `createVenueAuthoringDocument(...)`

- rejects secret/private material first;
- requires strict schema version 1;
- permits only `schemaVersion`, `deploymentRef`, `venueContext`, and `venuePackage` at the root;
- permits only `deploymentRef.id` under the deployment reference;
- delegates venue validation to HV-1;
- delegates package validation/binding to HV-3;
- verifies that every path in the resulting document has an ownership class;
- returns a deeply immutable normalized document.

### `serializeVenueAuthoringReview(...)`

Produces the same canonical JSON convention already accepted for HV-4:

```text
OBJECT_KEY_ORDER = RECURSIVE_LEXICOGRAPHIC
ARRAY_ORDER = PRESERVED
JSON_INDENT = 2_SPACES
ENCODING = UTF_8
LINE_ENDING = LF
TERMINAL_NEWLINE = REQUIRED
```

### `composeVenueBootstrapFromAuthoring(...)`

This helper does not make deployment state authorable. It accepts a separately supplied deployment manifest, derives HV-4 composition bindings from the validated authoring document, and delegates all deployment compilation/cross-binding to existing `composeVenueBootstrap(...)`.

A deployment-reference mismatch therefore continues to fail at the HV-4 authority boundary.

## 3. Shared secret-safe canonical document machinery

HV-5 did not fork the HV-4 secret/canonicalization rules.

`src/venue/safe-document.js` contains the shared generic machinery for:

- secret-bearing field-name rejection;
- recognizable private-key-material rejection;
- credential-bearing HTTP(S) URL userinfo rejection;
- secret-bearing URL query-key rejection;
- circular-reference rejection;
- recursive lexicographic canonicalization;
- deterministic canonical JSON serialization.

`src/venue/bootstrap.js` now consumes this shared utility while preserving the existing `VenueBootstrapError` boundary and HV-4 behavior.

This refactor is intentionally semantic-preserving for HV-4 and is covered by the unchanged HV-4 regression tests.

## 4. Ownership registry

The implemented classes are exactly the preregistered classes:

```text
OPERATOR_AUTHORED
INTEGRATION_OWNED
DERIVED
PLATFORM_FIXED
DEPLOYMENT_OWNED
SECURITY_PRIVILEGED
SECRET_OR_PRIVATE__FORBIDDEN_FROM_AUTHORING_DOCUMENT
```

The registry is fail-closed. `buildOwnershipMap(...)` walks every path present in a validated v1 authoring document. If any path lacks a classification, document construction fails rather than silently assigning a permissive default.

The minimum frozen leaf ownership is preserved:

- schema-version paths → `PLATFORM_FIXED`;
- venue/package identity and Hive binding paths → `INTEGRATION_OWNED`;
- payment merchant authority → `SECURITY_PRIVILEGED`;
- deployment reference → `DEPLOYMENT_OWNED`;
- approved public venue facts/copy/media selection/vocabulary → `OPERATOR_AUTHORED`;
- media width/height → `DERIVED`.

Mixed-ownership object/array containers are classified `INTEGRATION_OWNED` in v1. This is deliberately conservative: replacing a whole mixed-authority subtree or changing array topology is not an ordinary content edit merely because some descendants are editable.

## 5. Ordinary operator edit gate

`applyOrdinaryOperatorEdit(base, proposed)`:

1. independently validates and normalizes the accepted base and proposed document;
2. recursively compares semantic values;
3. treats object-key or array-cardinality differences as a change to the protected container;
4. requires every changed path to resolve to `OPERATOR_AUTHORED`;
5. rejects any other ownership class;
6. returns the validated immutable proposed document only after every change passes.

The base is never mutated.

This v1 gate permits edits such as:

- public venue display/business facts;
- accepted venue-package copy;
- same-origin media `src` selection;
- media alt/caption text;
- operator/staff vocabulary.

It rejects, among other things:

- schema changes;
- venue/package identity changes;
- Hive binding changes;
- payment merchant changes;
- deployment-reference changes;
- arbitrary media-dimension substitution;
- gallery array cardinality/topology changes;
- unknown fields or executable-script keys;
- secret/private material;
- any proposed document rejected by HV-1/HV-3 before ownership comparison.

## 6. Direct source/code authoring

`scripts/validate-venue-authoring.js` is the editor-independent CLI:

```bash
node scripts/validate-venue-authoring.js path/to/non-secret-authoring.json
```

Valid input emits only deterministic canonical JSON to stdout and exits zero.

Invalid JSON exits 2. Domain/secret/ownership-envelope-invalid input exits 1, writes only a bounded diagnostic to stderr, and emits no canonical document.

The CLI performs no Hive RPC, HTTP request, signing, broadcast, deployment mutation, DNS/VPS/systemd action, or production write.

## 7. Reference proofs

`test/support/hv5-authoring-fixtures.js` constructs its proof documents from already accepted authorities rather than copied values:

```text
Fourth Street:
  FOURTH_STREET_REFERENCE_VENUE
  FOURTH_STREET_REFERENCE_PACKAGE
  REFERENCE_DEPLOYMENT_PROFILE.id

Lantern Room:
  HV3_SYNTHETIC_VENUE
  HV3_SYNTHETIC_PACKAGE
  HV4_SYNTHETIC_DEPLOYMENT_MANIFEST.deployment.id
```

The Lantern Room remains fictional and meaningfully non-bar-specific, including `reading room` / `host` vocabulary.

No `venueType` field or category branch exists in the generic authoring implementation.

## 8. Bootstrap compatibility

Focused tests prove both reference authoring documents can be paired with separately supplied matching deployment authority and composed through existing HV-4.

A Lantern authoring document paired with the valid Fourth Street deployment manifest fails closed because the authoring `deploymentRef.id` does not match the separately validated deployment identity.

HV-5 therefore does not weaken HV-4's three-way binding rule.

## 9. Explicit non-effects

This implementation does not:

```text
ADD_GRAPESJS
ADD_GRAPESJS_STUDIO_SDK
BUILD_BROWSER_WYSIWYG
BUILD_FREEFORM_PAGE_TREE
CREATE_VENUE_TYPE_ENUM
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

## 10. Qualification surface

The focused HV-5 test file covers:

- Fourth Street and Lantern golden vectors;
- deep immutability;
- venue-type neutrality;
- ownership completeness and representative exact classes;
- insertion-order-independent canonical serialization;
- successful ordinary authored edits;
- schema/identity/Hive/payment/deployment/dimension/topology negative controls;
- unknown executable-style field rejection;
- secret/private-field, private-key-material, and credential-URL rejection without value echo;
- direct CLI success/failure behavior;
- matching and mismatched HV-4 bootstrap composition.

Full repository qualification remains controlling. A green focused test alone is not HV-5 acceptance.
