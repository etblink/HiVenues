# HV-6 Native Authoring Foundation — Phase C Implementation 0.1.0

## Status

```text
OPERATION = HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_AND_QUALIFICATION
IMPLEMENTATION_VERSION = 0.1.0
DOCUMENT_ROLE = IMPLEMENTATION_CONTRACT_AND_OPERATOR_GUIDE
REPOSITORY = etblink/Hive-Venues
CONTROLLING_PREREGISTRATION = docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION_0_1_0.md
CONTROLLING_TECHNOLOGY_SELECTION = docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_TECHNOLOGY_SELECTION_0_1_0.md
CONTROLLING_PHASE_C_AUTHORIZATION = docs/HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_AUTHORIZATION_0_1_0.md
SELECTED_ADAPTER = NATIVE_EXISTING_STACK
GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED
GRAPESJS_STUDIO_SDK = NOT_SELECTED
PUBLIC_PRODUCTION_MOUNT = NOT_IMPLEMENTED
PRODUCTION_DEPLOYMENT = NO
REAL_SECOND_VENUE = NO
HV6_ACCEPTANCE_BY_THIS_FILE = NO
```

This document describes the selected-native Phase-C source foundation and the evidence that qualified the implementation before Project Lead review. Acceptance status is intentionally recorded elsewhere so this implementation guide remains historically truthful after later governance events.

## 1. Implemented authority flow

The implementation preserves the frozen HV-6 direction:

```text
ACCEPTED_HV5_DOCUMENT
-> NATIVE_VISUAL_ADAPTER_PROJECTION
-> OPERATOR_INTERACTION
-> PROPOSED_HV5_DOCUMENT
-> applyOrdinaryOperatorEdit(base, proposed)
-> ACCEPTED_HV5_DOCUMENT
-> CANONICAL_SERIALIZATION
```

The visual layer does not own edit authority. `src/venue/visual-authoring-session.js` derives editable leaves from the HV-5 ownership registry and the ordinary session factory is permanently wired to the real `applyOrdinaryOperatorEdit(...)` gate.

The selected presentation shape is:

```text
SEMANTIC_SECTION_NAVIGATOR
+
TYPED_FIELD_INSPECTOR_DERIVED_FROM_HV5_OWNERSHIP
+
TRUTHFUL_REVIEW_PREVIEW_FROM_PROPOSED_HV5_STATE
```

No editor project JSON, component tree, exported HTML/CSS, autosave state, UI visibility rule, or generic page-builder model becomes platform authority.

## 2. Reusable source modules

Phase C promotes the bounded native prototype into reusable source through:

```text
src/venue/visual-authoring-session.js
src/venue/native-authoring-surface.js
```

### `visual-authoring-session.js`

The session exposes:

```text
listEditableFields()
edit(pointer, value)
previewProjection()
apply()
discard()
canonicalAccepted()
canonicalProposal()
status()
```

Session states remain:

```text
CLEAN
DIRTY
VALIDATING
REJECTED_WITH_BASE_UNCHANGED
ACCEPTED
DISCARDED
```

The ordinary factory exposes no raw-document replacement, array-topology operation, alternate Apply gate, HTML authority, script authority, page tree, or component tree.

### `native-authoring-surface.js`

The promoted native surface owns only the offline semantic authoring router and presentation. It accepts an explicit `renderPreviewHtml(projection)` callback so the source foundation does not import test-only renderer machinery or duplicate the application renderer.

The surface provides:

- semantic section navigation;
- labels and typed controls derived from HV-5 editable descriptors;
- explicit preview-update actions;
- explicit Apply and Discard actions;
- CLEAN/DIRTY/ACCEPTED state visibility;
- safe nontechnical operator-facing error notices;
- a review-preview iframe populated through the supplied renderer callback;
- responsive desktop/tablet/mobile layout;
- keyboard-visible focus and minimum control targets.

The module is not imported or mounted by `src/app.js`, `src/server.js`, or `index.js`.

## 3. Real-renderer preview boundary

The production source foundation does not import `supertest`, test configuration, or test Hive services.

The qualification fixture in:

```text
test/support/hv6-native-editor-fixture.js
```

supplies a deterministic renderer callback backed by the real application created through `createApp(...)` with the current proposed `venueContext` and `venuePackage`.

The test wrapper also serves the existing static asset paths needed by the rendered page and supplies deterministic read-only Hive service stubs. Unexpected Hive RPC is a hard failure.

This keeps the architecture separated:

```text
REUSABLE_AUTHORING_SOURCE
  -> asks for preview HTML from explicit callback

QUALIFICATION_FIXTURE
  -> calls the real application renderer
  -> returns rendered HTML
```

There is no duplicate home-page renderer in the authoring foundation.

## 4. Editable registry and venue neutrality

`listEditableFields()` is derived by filtering the executable HV-5 ownership map for `OPERATOR_AUTHORED`. Presentation metadata such as semantic section and control kind can describe an editable leaf but cannot grant permission.

The qualified browser path exposes the complete derived registry rather than a hard-coded seven-field form. Both Fourth Street and Lantern Room exercise the same source path.

The currently qualified registry contains more than twenty editable leaves and spans the semantic sections required by the prospective contract, including identity/business, brand, SEO, hero, updates, pathways, visit, community, gallery fixed-slot leaves, and onboarding vocabulary.

No mandatory venue-type enum or category branch was introduced.

## 5. Apply rejection and atomic base preservation

Phase C adds an explicitly named test-only session factory solely to prove an Apply-time refusal:

```text
createVisualAuthoringSessionForTest(base, { applyGate })
```

The ordinary factory does not accept or expose an alternate gate.

The test-only seam submits a valid operator-owned proposal to a forced refusing gate and proves:

```text
GATE_CALL_COUNT = 1
STATE_AFTER_REFUSAL = REJECTED_WITH_BASE_UNCHANGED
ACCEPTED_CANONICAL_BYTES_CHANGED = NO
PROPOSAL_RETAINED_FOR_REVIEW = YES
DISCARD_RESTORES_ACCEPTED_BYTES = YES
```

This proves the preregistered rejected-state contract without exposing raw proposal replacement or alternate authority to the operator-facing surface.

## 6. Full protected-authority matrix

`test/hv6-phase-c-authority.test.js` explicitly denies ordinary visual authority over the named Phase-C matrix for both Fourth Street and Lantern Room, including:

```text
VENUE_ID
HIVE_COMMUNITY_ID
HIVE_OFFICIAL_ACCOUNT
THREADS_CONTAINER_ACCOUNT
PAYMENT_MERCHANTS_CONTAINER
PAYMENT_MERCHANT_ACCOUNT
PACKAGE_ID
PACKAGE_VENUE_BINDING
DEPLOYMENT_REF
AUTHORING_SCHEMA_VERSION
PACKAGE_SCHEMA_VERSION
BRAND_LOGO_WIDTH
BRAND_LOGO_HEIGHT
HERO_IMAGE_WIDTH
HERO_IMAGE_HEIGHT
GALLERY_ITEM_WIDTH
GALLERY_ITEM_HEIGHT
GALLERY_ITEMS_CONTAINER
GALLERY_ITEM_CONTAINER
UNKNOWN_STRUCTURE
RAW_HTML_AUTHORITY
SCRIPT_AUTHORITY
PRIVATE_KEY_AUTHORITY
SECRET_FIELD_AUTHORITY
```

Defined paths are checked against their exact HV-5 ownership class, must not appear in the editable registry, and must fail ordinary visual edits while accepted canonical bytes remain unchanged.

Unknown executable-style, secret-bearing, and private-key-bearing structures are additionally passed through the underlying HV-5 document validator and must fail closed.

## 7. Gallery schema-v1 boundary

Phase C preserves the accepted conservative UI/API boundary:

```text
ADD_GALLERY_ITEM = UNAVAILABLE
DELETE_GALLERY_ITEM = UNAVAILABLE
REORDER_GALLERY = UNAVAILABLE
REPLACE_GALLERY_CONTAINER = DENIED
EDIT_EXISTING_FIXED_SLOT_OPERATOR_LEAF = ALLOWED_IF_HV5_ACCEPTS
```

A schema-v1 limitation remains explicit: gallery items have no stable identity independent of array index. Therefore HV-5 cannot always infer whether a caller that independently rewrites multiple allowed fixed-slot leaves intended a same-length permutation or coordinated legitimate replacement.

Phase C does not hide this limitation and does not invent source/dimension heuristics. A future robust domain-level no-permutation guarantee would require a separately authorized schema refinement or stable gallery-slot/item identity.

The visual foundation itself provides no reorder/add/delete/raw-document channel.

## 8. Operator-facing error boundary

The promoted source surface does not render raw validator/session diagnostics to the operator.

Invalid preview edits produce bounded copy equivalent to:

```text
That change could not be previewed. The accepted venue remains unchanged.
```

Apply refusal produces bounded copy equivalent to:

```text
These changes could not be applied. The accepted venue remains unchanged.
```

Preview-renderer failure is similarly contained behind a generic preview-unavailable response.

Detailed failure semantics remain available in test/session state for diagnosis without becoming operator-facing error disclosure.

## 9. Direct source/code authoring remains independent

The accepted direct path remains:

```text
scripts/validate-venue-authoring.js
```

Focused Phase-C tests assert that the direct validator does not depend on the visual session, native authoring surface, or GrapesJS.

The visual adapter is optional tooling over HV-5, not a prerequisite for canonical authoring.

## 10. Browser and responsive evidence

`scripts/capture-hv6-native-visual.js` now qualifies the promoted source foundation rather than the Phase-B candidate shell.

The scenarios remain:

```text
FOURTH_STREET_DESKTOP = 1440 x 1000
LANTERN_ROOM_TABLET = 768 x 1024
FOURTH_STREET_MOBILE = 390 x 844
```

The rendered proof covers:

- real application preview truth;
- byte-identical initial accepted/proposal state;
- hostile `<script>...</script>` text rendered as inert copy rather than executable script;
- keyboard traversal and visible focus;
- minimum 44px visible controls;
- semantic section navigation;
- absence of protected controls and visible raw pointers;
- representative edits across both venue fixtures;
- preview-before-Apply semantics;
- Discard reconstruction;
- Apply through the real HV-5 gate;
- accepted-state reload stability;
- safe invalid-media edit rejection;
- no horizontal overflow at accepted viewports;
- no serious/critical axe violations in the bounded editor/preview checks;
- zero unexpected Hive RPC;
- zero browser console errors;
- no catastrophic mobile failure.

## 11. Qualification history

### Early Phase-C run

```text
CI_RUN = 33356622925
RESULT = FAILURE
CLASSIFIER = PASS
UBUNTU = FAILURE
WINDOWS = FAILURE
RENDERED = SKIPPED
```

The repository secret scanner correctly rejected a literal PEM private-key header embedded in the new negative test source. The test was repaired by constructing the marker from harmless fragments, matching the established scanner-safe HV-5 test pattern.

Classification:

```text
FINDING_001 = NEGATIVE_TEST_FIXTURE_TRIGGERED_REPOSITORY_SECRET_SCANNER
IMPLEMENTATION_AUTHORITY_DEFECT = NO
SECRET_SCANNER_WEAKENED = NO
NEGATIVE_PRIVATE_KEY_TEST_REMOVED = NO
```

### Qualified promoted source foundation

```text
IMPLEMENTATION_HEAD = ed13c31d6d9483c5d2a51e1fa210d3e0d37dec5e
IMPLEMENTATION_TREE = cae9917ad46cf1755aab6e474c19b4e9586ddb83
QUALIFICATION_PR = 55
QUALIFICATION_CI_RUN = 33356951845
CLASSIFIER = PASS
UBUNTU_DETERMINISTIC = PASS
WINDOWS_DETERMINISTIC = PASS
CONSOLIDATED_RENDERED = PASS
LIVE_HIVE_READ_ONLY = SKIPPED
RENDERED_ARTIFACT_ID = 9745563296
RENDERED_ARTIFACT_SHA256 = 69cf7c910cee83d3d3195f453035e2245724e2c830e783476236a22b5b467a07
```

## 12. Explicit non-effects

This Phase-C implementation does not:

```text
MOUNT_PUBLIC_PRODUCTION_AUTHORING_ROUTE
DEPLOY_TO_FOURTH_STREET
MUTATE_LIVE_FOURTH_STREET_STATE
ADMIT_REAL_SECOND_VENUE
CHANGE_HIVE_SIGNING_AUTHORITY
ADD_SERVER_PRIVATE_KEY_CUSTODY
CHANGE_PAYMENT_AUTHORITY
STORE_OR_ROTATE_SECRETS
CHANGE_HV5_SCHEMA
ADD_GRAPESJS
ADD_GRAPESJS_STUDIO_SDK
ADD_GRAPES_CLOUD_STORAGE
ADD_RAW_HTML_AUTHORITY
ADD_SCRIPT_AUTHORITY
ADD_GENERIC_PAGE_TREE_AUTHORITY
ENABLE_GALLERY_TOPOLOGY_EDITING
ENABLE_SHARED_RUNTIME_MULTI_TENANCY
PUBLISH_CID_OR_IPNS
INTEGRATE_3SPEAK_OR_SPKNETWORK
ADD_HELIA_OR_ORBITDB
BUILD_FLEET_ORCHESTRATION
```

A later public/operator deployment must separately specify authentication, session ownership, CSRF/origin handling, persistence destination, deployment behavior, and production authorization.

## 13. Pre-review conclusion

```text
SELECTED_NATIVE_SOURCE_FOUNDATION_IMPLEMENTED = YES
HV5_AUTHORITY_PRESERVED = YES
DIRECT_SOURCE_PATH_PRESERVED = YES
FULL_NAMED_PROTECTED_MATRIX = PASS
REJECTED_STATE_BASE_UNCHANGED_PROOF = PASS
REAL_RENDERER_BROWSER_PROOF = PASS
VENUE_NEUTRALITY_PROOF = PASS
PRODUCTION_MOUNT = NO
PROJECT_LEAD_IMPLEMENTATION_REVIEW_REQUIRED = YES
FINAL_EXACT_TREE_QUALIFICATION_REQUIRED_AFTER_REVIEW = YES
HV6_ACCEPTED_BY_THIS_FILE = NO
```
