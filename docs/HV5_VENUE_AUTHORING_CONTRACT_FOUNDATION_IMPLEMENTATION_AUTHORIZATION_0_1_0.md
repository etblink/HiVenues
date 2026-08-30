# HV-5 Venue Authoring Contract Foundation — Implementation Authorization 0.1.0

## Status

```text
OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION
AUTHORIZATION_VERSION = 0.1.0
STATUS = PROJECT_LEAD_IMPLEMENTATION_AUTHORIZATION
REPOSITORY = etblink/Hive-Venues
AUTHORIZED_CANONICAL_BASE_COMMIT = 57f6292f411c5fae656e0b097ef0e75f1eff30e7
AUTHORIZED_CANONICAL_BASE_TREE = f8bf6627e4b81a3bdc8dc78b2e41dbdf4576b521
CONTROLLING_PREREGISTRATION = docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_0_1_0.md
PREREGISTRATION_ACCEPTANCE = docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION_ACCEPTANCE_0_1_0.md
HV5_IMPLEMENTATION_AUTHORIZED = YES
IMPLEMENTATION_SCOPE = MINIMUM_OFFLINE_AUTHORING_CONTRACT_CORE
BROWSER_WYSIWYG_EDITOR = NOT_AUTHORIZED
GRAPESJS_CORE_DEPENDENCY = NOT_AUTHORIZED
GRAPESJS_STUDIO_SDK_DEPENDENCY = NOT_AUTHORIZED
SECOND_REAL_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = FORBIDDEN
CID_IPNS_PUBLICATION = OUTSIDE_SCOPE
THREESPEAK_SPK_INTEGRATION = OUTSIDE_SCOPE
HELIA_ORBITDB_REPLICATION = OUTSIDE_SCOPE
FLEET_ORCHESTRATION = OUTSIDE_SCOPE
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
```

This record authorizes one bounded implementation operation under the exact accepted HV-5 preregistration. It does not broaden or reinterpret that contract.

## 1. Authorized work

Implementation may now introduce the minimum generic code and evidence required to prove the accepted HV-5 authoring contract, including:

- one strict schema-version-1 canonical authoring envelope containing the accepted HV-1 `venueContext`, accepted HV-3 `venuePackage`, and `deploymentRef.id` only;
- an explicit deterministic ownership registry or equivalent machine-readable policy assigning every v1 authoring path to exactly one accepted ownership class;
- canonical authoring serialization byte-compatible with the accepted HV-4 recursive sorted-key/LF convention;
- validation/normalization that delegates domain validity to `createVenueContext(...)` and `createVenuePackage(..., validatedVenueContext)` rather than duplicating their rules;
- an ordinary-operator patch gate that permits semantic changes only to `OPERATOR_AUTHORED` paths and fails closed otherwise;
- secret/private-material rejection at least as strict as the accepted HV-4 boundary;
- a non-network direct source/code validation path or CLI that emits deterministic canonical JSON and performs no production/Hive mutation;
- narrow Fourth Street authoring fixture/equivalence evidence using the existing accepted reference sources;
- narrow Lantern Room authoring fixture/equivalence evidence using the existing fictional non-bar fixture;
- tests proving bootstrap compatibility when a separately controlled deployment manifest is supplied to the existing HV-4 composition path;
- documentation, implementation review/handoff evidence, and only the adjacent checker/test updates genuinely required by the changed paths.

## 2. Required implementation shape

The implementation must preserve this dependency direction:

```text
CANONICAL_VENUE_AUTHORING_DOCUMENT
        |
        +--> OWNERSHIP_POLICY_GATE
        |
        +--> createVenueContext(...)
        |
        +--> createVenuePackage(..., validatedVenueContext)
        |
        +--> deploymentRef.id
        |
        +--> optional later composeVenueBootstrap(...)
              with separately supplied deployment manifest
```

The implementation must not establish a parallel business/Hive/package schema that can drift from HV-1/HV-3.

The authoring document must remain strict JSON and must not embed a deployment manifest, runtime environment, server configuration, credential bundle, private key, secret set, payment receipt database configuration, IPNS signing material, 3Speak/SPK credentials, fleet configuration, or executable plugin/script state.

## 3. Ownership enforcement

The accepted ownership classes remain controlling:

```text
OPERATOR_AUTHORED
INTEGRATION_OWNED
DERIVED
PLATFORM_FIXED
DEPLOYMENT_OWNED
SECURITY_PRIVILEGED
SECRET_OR_PRIVATE__FORBIDDEN_FROM_AUTHORING_DOCUMENT
```

The implementation must make the ordinary-operator distinction executable.

At minimum, ordinary operator patches may change validated public venue facts, package copy, same-origin media selection/alt/caption, and operator/staff vocabulary.

They may not change schema identity, venue/package identity, Hive community/account bindings, payment merchant authority, deployment reference, derived media dimensions, unknown fields, secret/private values, or executable behavior.

Rejected patches must leave the accepted base state unchanged.

## 4. Media boundary

HV-5 implementation does not need an upload subsystem.

Already validated media dimensions may be preserved in canonical authoring state. If dimension derivation is implemented, it must be local, deterministic, bounded, network-independent, and derived from approved same-origin assets.

Ordinary operator patches may not directly replace derived dimensions.

## 5. GrapesJS boundary

This authorization deliberately does not add GrapesJS.

No dependency on GrapesJS core or Studio SDK may be introduced under this operation. No GrapesJS project JSON, exported HTML/CSS, editor component tree, plugin state, or asset-manager state may become canonical Hive-Venues authoring authority.

The purpose of HV-5 is to make a later visual-adapter experiment safer by freezing what any editor must read/write and what it must not control.

## 6. Direct source/code path

The implementation must provide an editor-independent validation/normalization path usable without a browser visual editor.

It must:

- read explicit JSON input;
- reject secret/private material before emitting review output;
- validate the strict envelope;
- delegate venue/package validity to accepted validators;
- validate the bounded deployment reference shape without contacting deployment infrastructure;
- emit deterministic canonical JSON only for valid input;
- return nonzero for invalid input;
- avoid echoing rejected secret/private values;
- perform no Hive RPC, HTTP request, signing, broadcast, deployment mutation, DNS/VPS/systemd change, or production write.

## 7. Fixture and compatibility proof

Implementation must prove the same generic authoring contract represents both:

```text
REFERENCE = Fourth Street Bar
NON_BAR_PROOF = The Lantern Room (Fixture)
```

Fourth Street validated venue-context and package semantics must remain exact relative to the accepted reference inputs. Lantern Room must remain meaningfully distinct and must validate through the same generic code path without bar/category branching.

No real second venue/client is authorized.

Fourth Street production compatibility facts remain protected, including production host identity, `/opt/hive-bar`, `hive-bar.service`, production storage/provenance names, Privex deployment facts, and `fourth-street-bar-app/*` lineage.

## 8. Bootstrap compatibility

Where tests supply a separately controlled deployment manifest, validated authoring state may be projected into the existing HV-4 bootstrap composition path.

The implementation must prove:

- matching deployment authority composes successfully through existing HV-4 validation;
- mismatched deployment identity fails closed;
- authoring validation does not alter deployment facts;
- authoring fields cannot smuggle deployment-manifest overrides.

HV-4 remains the authoritative deployment/bootstrap composition boundary.

## 9. Required qualification

Before Project Lead acceptance, the implementation candidate must satisfy the complete frozen HV-5 qualification contract, including:

```text
CHANGED_PATH_REVIEW = PASS
SECRET_SCAN = PASS
RELEASE_COHERENCE = PASS
FUNCTIONAL_V1_BASELINE = PASS
LINT = PASS
BUILD = PASS
FULL_DETERMINISTIC_TEST_SUITE = PASS
HV5_SCHEMA_GOLDEN_VECTORS = PASS
HV5_OWNERSHIP_NEGATIVE_MATRIX = PASS
HV5_SECRET_PRIVATE_REJECTION = PASS
HV5_FOURTH_STREET_EQUIVALENCE = PASS
HV5_LANTERN_ROOM_NON_BAR_PROOF = PASS
HV5_SOURCE_CODE_PATH = PASS
HV5_BOOTSTRAP_COMPATIBILITY = PASS
UBUNTU_DETERMINISTIC_GATE = PASS
WINDOWS_DETERMINISTIC_GATE = PASS
NO_MATERIAL_COVERAGE_REGRESSION = PASS
PROJECT_LEAD_HUMAN_AUTHORING_REVIEW = PASS
LIVE_PRODUCTION_MUTATION = NO
SECOND_REAL_VENUE_ADMITTED = NO
SHARED_RUNTIME_MULTI_TENANCY = NO
```

Rendered qualification is required only if the candidate actually introduces/materially changes a user-visible preview/editor surface. This authorization does not require such a surface.

Machine-green status is necessary but not sufficient. The Project Lead must reject or rebuild any candidate that violates the accepted authoring architecture, even if CI passes.

## 10. Explicit non-effects

This authorization does not permit:

```text
ADD_GRAPESJS_CORE_DEPENDENCY
ADD_GRAPESJS_STUDIO_SDK_DEPENDENCY
BUILD_BROWSER_WYSIWYG_EDITOR
BUILD_FREEFORM_PAGE_BUILDER
CREATE_MANDATORY_VENUE_TYPE_ENUM
ADMIT_SECOND_REAL_VENUE
CREATE_HIVE_ACCOUNT_OR_COMMUNITY
CHANGE_HIVE_AUTHORITIES
CHANGE_PAYMENT_AUTHORITY
ENABLE_OR_CHANGE_PAYMENTS
ROTATE_OR_STORE_SECRETS
EDIT_DEPLOYMENT_MANIFEST_THROUGH_AUTHORING
MUTATE_DNS_VPS_CADDY_SYSTEMD_OR_PRODUCTION
PUBLISH_CID
CREATE_OR_UPDATE_IPNS_NAME
CREATE_OR_CUSTODY_IPNS_SIGNING_KEY
UPLOAD_TO_3SPEAK_OR_SPKNETWORK
ADD_3SPEAK_OR_SPK_CREDENTIALS
ADD_HELIA_OR_ORBITDB
ADD_REPLICATED_MUTABLE_STATE
BUILD_FLEET_ORCHESTRATION
ENABLE_SHARED_RUNTIME_MULTI_TENANCY
REPLACE_GIT_COMMIT_TREE_PROVENANCE
BROAD_UI_OR_THEME_REDESIGN
UNRELATED_DEPENDENCY_OR_RUNTIME_UPGRADE
```

## 11. Authorization conclusion

```text
HV5_PREREGISTRATION = ACCEPTED
HV5_IMPLEMENTATION_AUTHORIZED = YES
AUTHORIZED_SCOPE = MINIMUM_OFFLINE_AUTHORING_CONTRACT_CORE
PRODUCTION_AUTHORIZATION = NO
REAL_SECOND_VENUE_AUTHORIZATION = NO
VISUAL_EDITOR_AUTHORIZATION = NO
```

Substantive HV-5 implementation may begin only within this bounded authorization and the exact controlling preregistration. Any need to cross these boundaries requires a new separately reviewed authorization event.
