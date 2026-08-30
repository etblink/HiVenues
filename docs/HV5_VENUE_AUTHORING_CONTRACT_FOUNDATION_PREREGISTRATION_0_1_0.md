# HV-5 Venue Authoring Contract Foundation — Preregistration 0.1.0

## Status

```text
OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION
PREREGISTRATION_VERSION = 0.1.0
STATUS = FROZEN_PREREGISTRATION__IMPLEMENTATION_NOT_STARTED
REPOSITORY = etblink/Hive-Venues
CANONICAL_BASE_COMMIT = 4890c2036cfa43825b8476e651c77725a6d6aca3
CANONICAL_BASE_TREE = ffd5aa0bb84a4d30ad5120aef3d79f4d1c4f978a
CONTROLLING_DECISION = docs/POST_HV4_SEQUENCING_DECISION_0_1_0.md
SELECTED_LANE = CANONICAL_VENUE_AUTHORING_CONTRACT
IMPLEMENTATION_STARTED = NO
IMPLEMENTATION_AUTHORIZED_BY_THIS_FILE_ALONE = NO
CANONICAL_AUTHORING_SCHEMA_VERSION = 1
CANONICAL_AUTHORING_FORMAT = STRICT_JSON
AUTHORING_V1_SCOPE = EXISTING_ACCEPTED_VENUE_CONTEXT_AND_VENUE_PACKAGE_FIELDS
FREEFORM_PAGE_TREE = OUTSIDE_HV5_SCOPE
BROWSER_AUTHORING_UI = OUTSIDE_HV5_CORE_SCOPE
VISUAL_EDITOR_IMPLEMENTATION = OUTSIDE_HV5_CORE_SCOPE
EDITOR_FRAMEWORK_AUTHORITY = NONE
GRAPESJS_CORE = POST_HV5_ADAPTER_CANDIDATE__NOT_HV5_CORE_DEPENDENCY
GRAPESJS_STUDIO_SDK = NOT_SELECTED_FOR_HV5
NEW_EDITOR_DEPENDENCY = FORBIDDEN_IN_HV5_CORE
DEPLOYMENT_MANIFEST_AUTHORING = FORBIDDEN
DEPLOYMENT_PROFILE_REFERENCE = REQUIRED_BY_ID_ONLY
ARBITRARY_SCRIPT_AUTHORING = FORBIDDEN
REMOTE_EXECUTABLE_PLUGIN_AUTHORING = FORBIDDEN
MANDATORY_VENUE_TYPE_ENUM = FORBIDDEN
OPTIONAL_STARTER_ARCHETYPE_IMPLEMENTATION = OUTSIDE_HV5_CORE_SCOPE
SECOND_REAL_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = FORBIDDEN
CID_IPNS_PUBLICATION = OUTSIDE_HV5_SCOPE
IPNS_KEY_CREATION_OR_CUSTODY = OUTSIDE_HV5_SCOPE
THREESPEAK_SPK_INTEGRATION = OUTSIDE_HV5_SCOPE
HELIA_ORBITDB_REPLICATION = OUTSIDE_HV5_SCOPE
FLEET_ORCHESTRATION = OUTSIDE_HV5_SCOPE
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
```

This preregistration prospectively defines HV-5 before implementation. It operationalizes the accepted Post-HV-4 Sequencing Decision without silently turning the authoring-contract milestone into a visual-editor build, a real-client launch, a deployment configurator, a template marketplace, a distributed-publication experiment, a media integration, fleet automation, replicated mutable state, or shared-runtime tenancy.

HV-5 is **contract-first**. Its purpose is to establish one canonical, editor-independent authoring representation and one enforceable ownership model over the already accepted venue/context/package seams. A future visual editor such as GrapesJS must adapt to that contract; it may not become the contract.

## 1. Controlling question

HV-1 established an explicit validated venue context. HV-2 established an explicit validated deployment profile. HV-3 established an explicit validated venue package. HV-4 established deterministic, secret-safe composition of those authorities into one isolated venue runtime.

HV-5 asks:

> Can Hive-Venues define one strict, deterministic, editor-independent authoring document that preserves the accepted HV-1/HV-3 domain validators, keeps deployment/security/integration authority distinct from routine operator editing, supports a direct source/code path, and proves that ordinary operator edits cannot silently mutate protected identity, Hive, payment, deployment, secret, or executable-script state?

A successful HV-5 result must make future WYSIWYG, real-pilot, starter-archetype, publication, media, and fleet work safer by giving all of them the same authoring substrate.

## 2. Architecture under test

The accepted runtime composition remains unchanged:

```text
HIGH_ASSURANCE_PROTOCOL_SECURITY_CORE
+
PLATFORM_APPLICATION_PRIMITIVES
+
VENUE_CONTEXT
+
VENUE_PACKAGE
+
DEPLOYMENT_PROFILE
+
BOOTSTRAP_COMPOSITION_BINDINGS
=
ONE_ISOLATED_VENUE_RUNTIME
```

HV-5 adds an authoring layer **before** the accepted domain validators. It does not replace those validators.

The intended dependency direction is:

```text
CANONICAL_VENUE_AUTHORING_DOCUMENT
        |
        +--> OWNERSHIP_POLICY_GATE
        |
        +--> createVenueContext(...)
        |
        +--> createVenuePackage(..., validatedVenueContext)
        |
        +--> DEPLOYMENT_REFERENCE_BY_ID
        |
        +--> OPTIONAL_LATER_BOOTSTRAP_COMPOSITION
                via existing HV-4 composeVenueBootstrap(...)
```

A future authoring surface must follow:

```text
SOURCE_CODE_EDITOR ---------+
                            |
FUTURE_VISUAL_EDITOR -------+--> CANONICAL_VENUE_AUTHORING_DOCUMENT
                            |          |
FUTURE_STARTER_PRESET ------+          +--> SAME_OWNERSHIP_GATE
                                       +--> SAME_DOMAIN_VALIDATORS
```

The forbidden direction is:

```text
EDITOR_INTERNAL_MODEL
        -> becomes platform source of truth
        -> bypasses canonical authoring validation
```

## 3. Canonical authoring document v1

HV-5 must define exactly one persisted canonical authoring document for schema version 1.

The v1 top-level semantic shape is frozen as:

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

The actual `venueContext` object must use the accepted HV-1 shape and must be validated by the existing `createVenueContext(...)` authority.

The actual `venuePackage` object must use the accepted HV-3 shape and must be validated by the existing `createVenuePackage(..., validatedVenueContext)` authority.

The authoring document must **not** embed a deployment manifest, deployment profile, runtime environment, secret set, credential bundle, server configuration, payment receipt database configuration, onboarding custody material, or fleet configuration.

`deploymentRef.id` is a non-secret reference to separately owned deployment authority. When a later operation composes a deployable bootstrap envelope, the supplied deployment manifest must still be independently compiled and its resolved profile ID must match the authoring document's deployment reference through the existing HV-4 binding model.

### 3.1 Strictness

The top-level authoring document must be strict:

- `schemaVersion` must be exactly `1`;
- `deploymentRef` may contain only `id` in v1;
- `venueContext` and `venuePackage` must satisfy their existing accepted strict schemas;
- unknown top-level fields must fail closed;
- unknown nested domain fields must continue to fail through the accepted HV-1/HV-3 validators;
- no compatibility behavior may silently discard unknown fields.

### 3.2 No duplicate domain schema

HV-5 may define the authoring envelope and ownership registry, but it must not independently re-specify a second set of business, Hive-account, media-path, copy-length, package-binding, or venue-ID constraints that can drift from HV-1/HV-3.

The accepted domain validators remain authoritative for domain validity.

A thin authoring envelope may perform structural checks necessary to route ownership and references, but final domain acceptance must delegate to the accepted validators.

## 4. Canonical serialization

HV-5 must not create a second canonical-JSON convention.

Canonical authoring serialization must be byte-compatible with the already accepted HV-4 review convention:

```text
OBJECT_KEY_ORDER = RECURSIVE_LEXICOGRAPHIC
ARRAY_ORDER = PRESERVED
JSON_INDENT = 2_SPACES
ENCODING = UTF_8
LINE_ENDING = LF
TERMINAL_NEWLINE = REQUIRED
```

Equivalent canonical input must produce byte-identical canonical output on Ubuntu and Windows.

No authoring editor, adapter, formatter, or source-code path may define its own persisted ordering semantics.

## 5. Ownership classes

Every authoring path exposed by HV-5 must be assigned exactly one controlling ownership class.

The required classes are:

```text
OPERATOR_AUTHORED
INTEGRATION_OWNED
DERIVED
PLATFORM_FIXED
DEPLOYMENT_OWNED
SECURITY_PRIVILEGED
SECRET_OR_PRIVATE__FORBIDDEN_FROM_AUTHORING_DOCUMENT
```

These classes describe **who or what may change a value through the ordinary authoring workflow**. They do not weaken the domain validators.

### 5.1 PLATFORM_FIXED

Platform-fixed values are structural protocol for the authoring format, not routine content.

At minimum:

```text
/schemaVersion
/venuePackage/schemaVersion
```

must be `PLATFORM_FIXED` in v1.

Ordinary operator editing may not change them.

### 5.2 INTEGRATION_OWNED

Integration-owned values bind the venue to stable application/Hive identities. They may be established through a separately reviewed setup or advanced source workflow, but they are not ordinary WYSIWYG content.

At minimum:

```text
/venueContext/id
/venueContext/hive/communityId
/venueContext/hive/officialAccount
/venueContext/hive/threadsContainerAccount
/venuePackage/id
/venuePackage/venueId
```

must be `INTEGRATION_OWNED` in v1.

The package/venue binding remains subject to the existing HV-3 validator.

### 5.3 SECURITY_PRIVILEGED

Values whose change can redirect funds, authorities, or other protected application behavior are not ordinary authoring content.

At minimum:

```text
/venueContext/hive/paymentMerchantAccounts
```

must be `SECURITY_PRIVILEGED` in v1.

A future separate operation may define a reviewed privileged setup workflow. HV-5 does not create one.

### 5.4 DEPLOYMENT_OWNED

The deployment binding is owned by deployment/release configuration, not venue presentation.

At minimum:

```text
/deploymentRef/id
```

must be `DEPLOYMENT_OWNED` in v1.

The authoring document may retain the non-secret ID reference, but ordinary operator editing may not change it.

The underlying deployment manifest/profile remains entirely outside the v1 authoring document.

### 5.5 OPERATOR_AUTHORED — venue facts

The following accepted public venue facts are ordinary operator-authored content in v1:

```text
/venueContext/displayName
/venueContext/business/address
/venueContext/business/phone
/venueContext/business/hours
/venueContext/business/websiteUrl
/venueContext/business/mapUrl
```

Their existing HV-1 validation remains controlling, including credential-free HTTPS URL requirements.

### 5.6 OPERATOR_AUTHORED — venue package copy and media selection

The authored expression currently accepted by HV-3 is operator-authored except for package identity/version fields and derived media dimensions.

At minimum, ordinary operator-authored paths include the semantic values beneath:

```text
/venuePackage/brand/logo/src
/venuePackage/seo/defaultDescription
/venuePackage/home/hero/lede
/venuePackage/home/hero/footnote
/venuePackage/home/hero/image/src
/venuePackage/home/hero/image/alt
/venuePackage/home/hero/image/caption
/venuePackage/home/updates/*
/venuePackage/home/pathways/*
/venuePackage/home/visit/*
/venuePackage/home/community/*
/venuePackage/home/gallery/kicker
/venuePackage/home/gallery/heading
/venuePackage/home/gallery/intro
/venuePackage/home/gallery/items/*/src
/venuePackage/home/gallery/items/*/alt
/venuePackage/home/gallery/items/*/caption
/venuePackage/onboarding/operatorNoun
/venuePackage/onboarding/staffRole
```

The wildcard above means only the already accepted textual children in that existing object; it does not authorize unknown new keys.

All media references remain subject to the existing HV-3 same-origin normalized-path rule. HV-5 does not authorize remote media URLs.

### 5.7 DERIVED — media dimensions

For authoring purposes, media dimensions are not freeform editorial copy.

At minimum:

```text
/venuePackage/brand/logo/width
/venuePackage/brand/logo/height
/venuePackage/home/hero/image/width
/venuePackage/home/hero/image/height
/venuePackage/home/gallery/items/*/width
/venuePackage/home/gallery/items/*/height
```

must be classified `DERIVED`.

HV-5 implementation may preserve already validated dimensions when loading an existing canonical document and may provide a deterministic local mechanism for deriving dimensions from an approved same-origin asset when needed. Ordinary operator patches may not supply arbitrary replacement dimensions as if they were editorial text.

The exact derivation mechanism, if implemented, must be local, deterministic, bounded, and network-independent. HV-5 acceptance does not require introducing an upload system.

### 5.8 SECRET_OR_PRIVATE__FORBIDDEN_FROM_AUTHORING_DOCUMENT

No path for any of the following may exist in the canonical authoring document:

```text
private keys
owner/active/posting/memo key material
session secrets
API keys
access tokens
authorization headers
passwords
SSH keys
IPNS private/signing keys
3Speak/SPK credentials
VPS credentials
Cloudflare credentials
payment receipt database secrets
onboarding custody secrets
arbitrary credential-bearing URLs
```

Secret-field names and recognizable private-key material must be rejected at least as strictly as the accepted HV-4 bootstrap boundary.

## 6. Operator patch gate

HV-5 must prove ownership as executable policy, not documentation only.

The implementation must provide one deterministic gate that compares an accepted canonical base document with a proposed ordinary-operator edit and refuses any semantic change outside `OPERATOR_AUTHORED` paths.

The operator patch gate must reject at least:

- schema-version changes;
- venue-ID changes;
- package-ID or package/venue-binding changes;
- Hive community/account binding changes;
- payment-merchant changes;
- deployment-reference changes;
- derived-dimension substitution;
- unknown fields;
- secret/private material;
- executable-script or executable-handler insertion;
- any change that fails the accepted HV-1/HV-3 validators after patch application.

A rejected patch must not partially mutate the canonical base object.

The result of a successful patch must be deeply immutable or otherwise impossible for a caller to mutate after validation without passing through validation again.

## 7. Direct source/code authoring path

HV-5 must preserve an advanced, editor-independent escape hatch.

A technically advanced operator/developer must be able to inspect and author the canonical JSON document directly and validate it without installing or using a visual editor.

The implementation must provide a non-network validation/normalization path, preferably a bounded CLI analogous to the existing HV-4 validator, that:

- reads explicit JSON input;
- performs secret/private-material rejection;
- validates the strict authoring envelope;
- validates `venueContext` through `createVenueContext(...)`;
- validates `venuePackage` through `createVenuePackage(..., validatedVenueContext)`;
- validates the deployment-reference ID shape without reading secrets or contacting infrastructure;
- emits only deterministic canonical authoring JSON for valid input;
- returns a nonzero status for invalid input;
- does not echo rejected secret/private values;
- performs no Hive RPC, HTTP request, deployment mutation, filesystem write outside explicitly requested output, signing, or broadcast.

Direct source validation does not mean ordinary WYSIWYG users gain authority over integration/security/deployment-owned fields. It is the explicit advanced escape hatch and review surface.

## 8. Compilation to accepted authorities

HV-5 must prove that a valid canonical authoring document compiles into the existing accepted authority objects without semantic fork.

At minimum:

```text
AUTHORING_DOCUMENT.venueContext
    -> createVenueContext(...)
    -> VALIDATED_HV1_VENUE_CONTEXT

AUTHORING_DOCUMENT.venuePackage
    + VALIDATED_HV1_VENUE_CONTEXT
    -> createVenuePackage(...)
    -> VALIDATED_HV3_VENUE_PACKAGE
```

The authoring compiler may return a normalized immutable authoring composition containing the validated venue context, validated venue package, and deployment reference.

It may not create a second deployment profile or infer a deployment manifest from authoring content.

When a later caller supplies a separately authorized deployment manifest for bootstrap review, HV-4 remains controlling for deployment compilation and cross-binding:

```text
VALIDATED_AUTHORING_DOCUMENT
+
SEPARATELY_SUPPLIED_DEPLOYMENT_MANIFEST
-> existing composeVenueBootstrap(...)
```

Any deployment ID mismatch must continue to fail closed.

## 9. Preview boundary

HV-5 freezes preview semantics but does not require a browser editor or full visual page builder.

```text
PREVIEW_AUTHORITY = NONE
PREVIEW_SOURCE = VALIDATED_CANONICAL_AUTHORING_STATE_ONLY
PREVIEW_MAY_PERSIST = NO
PREVIEW_MAY_BYPASS_OPERATOR_PATCH_GATE = NO
PREVIEW_MAY_MUTATE_HIVE_OR_PRODUCTION = NO
```

Any preview introduced during HV-5 must be derived from validated canonical state. Rendering success is not configuration acceptance.

Unsaved visual/editor state must never be mistaken for persisted canonical state.

A future WYSIWYG adapter may keep temporary local editor state, but it must save through the canonical document plus ownership/domain gates.

If HV-5 implementation does not introduce a user-visible preview, no rendered qualification is required merely because this preregistration defines preview semantics.

## 10. Component and capability boundary

HV-5 v1 does not authorize a freeform arbitrary-page builder.

The authoring contract is scoped to the already accepted semantic venue surfaces and fields. Existing stable semantic areas include:

```text
BRAND_LOGO
SEO_DEFAULT_DESCRIPTION
HOME_HERO
HOME_UPDATES
HOME_PATHWAYS
HOME_VISIT
HOME_COMMUNITY
HOME_GALLERY
ONBOARDING_VOCABULARY
PUBLIC_VENUE_BUSINESS_FACTS
```

A future visual adapter may represent these as blocks/components, but any block/component IDs must map deterministically to canonical authoring paths rather than introducing a second persisted content tree.

HV-5 core must not add:

- arbitrary executable HTML/script blocks;
- arbitrary remote JavaScript or plugin URLs;
- inline event-handler authoring;
- raw CSS/JavaScript authority;
- arbitrary route creation;
- arbitrary server-side template code;
- a marketplace/plugin-install workflow;
- a mandatory venue-type taxonomy.

## 11. GrapesJS evaluation boundary

GrapesJS remains a serious future WYSIWYG adapter candidate, but HV-5 core does not install it.

```text
GRAPESJS_CORE_DEPENDENCY_IN_HV5 = NO
GRAPESJS_STUDIO_SDK_DEPENDENCY_IN_HV5 = NO
GRAPESJS_PROJECT_JSON_AS_PLATFORM_SOURCE_OF_TRUTH = FORBIDDEN
GRAPESJS_EXPORTED_HTML_CSS_AS_PLATFORM_SOURCE_OF_TRUTH = FORBIDDEN
```

The reason is dependency direction, not rejection of the tool: Hive-Venues must first own the authoring contract that any editor implements.

A later separately authorized visual-adapter operation evaluating GrapesJS must, before adding a dependency, bind the exact product/package/version and evaluate at least:

- core GrapesJS versus Studio SDK scope and licensing/deployment implications;
- local/self-hosted operation requirements;
- component allowlists and placement/nesting constraints;
- mapping from editor component IDs to canonical authoring paths;
- editor-specific project-state ownership;
- asset-manager integration with same-origin media constraints;
- script/HTML/CSS injection prevention;
- accessibility and keyboard editing behavior;
- deterministic save/reload equivalence against canonical authoring state;
- failure behavior when canonical validation rejects an edit;
- source/code and visual-adapter convergence.

No GrapesJS-specific field may appear in canonical authoring schema v1 merely to make a later adapter convenient.

## 12. Venue-neutrality and fixture evidence

HV-5 must preserve the current venue-neutral platform rule.

```text
MANDATORY_VENUE_TYPE_FIELD = NO
MANDATORY_VENUE_CATEGORY_ENUM = NO
STARTER_ARCHETYPE_IS_PLATFORM_IDENTITY = NO
```

The Lantern Room fixture remains the default meaningfully non-bar proof because it already exercises reading-room/host vocabulary through the generic path.

HV-5 must prove that the same canonical authoring contract can represent:

1. the current Fourth Street reference venue; and
2. the Lantern Room non-bar fixture.

The implementation may add narrowly necessary synthetic authoring fixtures, but it must not turn HV-5 into a broad bar/band/streamer/news/store template library.

Optional starter archetypes remain eligible later as convenience documents or presets over the canonical authoring contract.

## 13. Fourth Street exact-preservation gate

HV-5 must not require Fourth Street content or production behavior to change merely because an authoring contract now exists.

The implementation must construct or load a canonical Fourth Street authoring document and prove that its validated `venueContext` and `venuePackage` resolve to the same accepted semantic values as the current reference sources.

No automatic production migration is authorized.

The following Fourth Street compatibility facts remain outside ordinary authoring and must not be renamed or inferred away by HV-5:

```text
fourthstreetbar.com production host identity
/opt/hive-bar release root
hive-bar.service
.hive-bar-commit
.hive-bar-tree
fourth-street-bar-app/* application tag lineage
Privex deployment topology/profile facts
production storage paths
installed release identity
```

## 14. Negative authorization boundaries

HV-5 may not silently perform or authorize any of the following:

```text
ADD_GRAPESJS_CORE_DEPENDENCY
ADD_GRAPESJS_STUDIO_SDK_DEPENDENCY
BUILD_BROWSER_WYSIWYG_EDITOR
BUILD_FREEFORM_PAGE_BUILDER
CREATE_MANDATORY_VENUE_TYPE_ENUM
ADMIT_SECOND_REAL_VENUE
CREATE_HIVE_ACCOUNT_OR_COMMUNITY
CHANGE_HIVE_AUTHORITIES
CHANGE_PAYMENT_MERCHANT_AUTHORITY_THROUGH_OPERATOR_EDITOR
ENABLE_OR_CHANGE_PAYMENTS
ROTATE_OR_STORE_SECRETS
EDIT_DEPLOYMENT_MANIFEST_THROUGH_AUTHORING_DOCUMENT
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
```

Any of those requires a later separately selected and authorized operation.

## 15. Required implementation artifacts

A later HV-5 implementation authorization must produce at least:

1. a strict canonical authoring schema/envelope implementation;
2. a machine-readable ownership registry or equivalent deterministic ownership policy covering every v1 path;
3. canonical serialization using the frozen HV-4-compatible convention;
4. validation/normalization logic delegating to the accepted HV-1/HV-3 validators;
5. an ordinary-operator patch/change gate enforcing ownership classes;
6. secret/private-material rejection at least as strict as HV-4;
7. a direct source/code validation path, preferably a non-network CLI;
8. Fourth Street canonical authoring fixture/equivalence evidence;
9. Lantern Room canonical authoring fixture/equivalence evidence;
10. deterministic tests and an HV-5 implementation handoff/acceptance record.

A browser authoring UI, GrapesJS dependency, starter-template catalog, asset-upload system, CID/IPNS publisher, or real second-venue deployment is not a required HV-5 artifact.

## 16. Prospective test matrix

The later implementation must include deterministic tests covering at least the following.

### 16.1 Schema and canonical bytes

- valid schema-version-1 authoring document accepts;
- unknown top-level key rejects;
- wrong schema version rejects;
- malformed deployment reference rejects;
- canonical object keys are recursively lexicographically ordered;
- arrays retain semantic order;
- output is UTF-8/LF with exactly one terminal newline;
- identical semantic input produces byte-identical canonical output on Ubuntu and Windows.

### 16.2 Existing validator delegation

- invalid venue ID fails through the accepted venue-context authority;
- invalid/credential-bearing venue URLs fail through the accepted venue-context authority;
- invalid Hive community/account IDs fail through the accepted venue-context authority;
- malformed or cross-venue package binding fails through the accepted venue-package authority;
- remote or unsafe media paths fail through the accepted venue-package authority;
- invalid copy/media/package structures fail closed rather than being discarded or normalized into a different meaning.

### 16.3 Ownership gate

Starting from a valid accepted canonical document, ordinary operator changes must:

- accept display-name/business-fact edits that remain domain-valid;
- accept package copy edits that remain domain-valid;
- accept same-origin media-path and alt/caption edits that remain domain-valid;
- accept operator/staff vocabulary edits that remain domain-valid;
- reject schema-version edits;
- reject venue/package identity edits;
- reject Hive community/account binding edits;
- reject payment-merchant edits;
- reject deployment-reference edits;
- reject derived-dimension edits;
- reject unknown fields;
- reject secret-bearing fields/private material;
- reject attempted executable-script/event-handler authority;
- leave the original object unchanged after every rejection.

### 16.4 Reference and non-bar fixtures

- Fourth Street authoring fixture validates and reproduces the accepted venue context/package semantics;
- Lantern Room authoring fixture validates through the same code path;
- the generic authoring implementation contains no special Fourth Street branch;
- the generic authoring implementation contains no required bar/category enum;
- the two fixtures differ meaningfully in authored vocabulary/content while sharing the same authoring contract.

### 16.5 Source/code path

- canonical source JSON can be validated without a browser/editor;
- valid input emits only deterministic canonical JSON;
- invalid input exits nonzero;
- rejected secret/private values are not echoed;
- no network call, Hive signing, broadcast, deployment mutation, or production write occurs.

### 16.6 Bootstrap compatibility

Where the test supplies a separately controlled deployment manifest:

- validated authoring state plus matching deployment authority can still enter the existing HV-4 bootstrap composition path;
- mismatched deployment identity fails closed;
- authoring validation does not alter deployment profile facts;
- no authoring field can smuggle deployment-manifest overrides into bootstrap composition.

## 17. Qualification gates for later HV-5 implementation

The implementation may be considered for Project Lead acceptance only if all required gates pass:

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

Rendered qualification is required only if the implementation introduces or materially changes a user-visible preview/editor surface. HV-5 core is not required to do so.

Live-Hive qualification is not required merely to prove the offline authoring contract. If changed-path classification identifies a genuine live-Hive consumer impact, the repository's stronger existing lane governs.

## 18. Failure criteria

HV-5 must be rejected or remediated before acceptance if any of the following is true:

- editor-specific project state becomes the only authoritative persisted representation;
- the implementation adds GrapesJS or another editor merely because the decision named it as a candidate;
- the authoring layer duplicates and drifts from HV-1/HV-3 domain validation;
- ordinary operator editing can change Hive identity, payment merchants, deployment reference, schema identity, or other protected values;
- secret/private material can enter canonical authoring state;
- arbitrary executable script/plugin authority is introduced;
- canonical serialization differs by OS or object insertion order;
- Fourth Street semantic output changes without separate product evidence;
- the Lantern Room requires a source fork or bar-specific workaround;
- a mandatory venue-category enum is introduced without new product evidence;
- deployment configuration becomes visually editable as ordinary venue content;
- production, Hive authorities, payments, onboarding custody, DNS/VPS, CID/IPNS, media credentials, replicated state, fleet control, or shared tenancy are mutated or activated.

## 19. Post-HV-5 sequencing boundary

Successful HV-5 acceptance would prove the canonical authoring substrate, not choose the next adapter or deployment lane.

After HV-5, Project Lead must perform a fresh sequencing decision. That decision should strongly compare at least:

1. a real isolated second-venue pilot, if a suitable venue is available;
2. a bounded visual-editor adapter experiment, with GrapesJS as a serious candidate;
3. optional starter-archetype/preset work if real authoring evidence shows repeated patterns;
4. deterministic artifact publication with digest + CID and optional later IPNS mutable naming;
5. downstream media integration such as 3Speak/SPK where a concrete product use case exists;
6. successor package/developer identity maintenance;
7. fleet operations only after sufficient real per-venue evidence.

No one of those is preselected by HV-5 acceptance.

## 20. Authorization stop

This preregistration is prospective evidence only.

```text
HV5_PREREGISTRATION = FROZEN_IF_ACCEPTED
HV5_IMPLEMENTATION = NOT_STARTED
HV5_IMPLEMENTATION_AUTHORIZED = NO
NEXT_STEP_AFTER_PREREGISTRATION = PROJECT_LEAD_PREREGISTRATION_ACCEPTANCE_AND_SEPARATE_IMPLEMENTATION_AUTHORIZATION_REVIEW
```

Stop after freezing, qualifying, and canonically integrating this preregistration. Do not begin substantive HV-5 implementation under this file alone.
