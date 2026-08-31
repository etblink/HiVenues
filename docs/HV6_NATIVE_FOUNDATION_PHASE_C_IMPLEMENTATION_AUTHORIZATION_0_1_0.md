# HV-6 Native Foundation Phase C — Implementation Authorization 0.1.0

## 1. Status

```text
OPERATION = HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_AUTHORIZATION
REPOSITORY = etblink/Hive-Venues
CANONICAL_BASE_COMMIT = 863a0ec766efe7c8f82f1e720fdc892ef1d4acac
CANONICAL_BASE_TREE = 6e9fe0773a1ce0bb99838ff269a2b07f4fa13210

HV6_PREREGISTRATION = ACCEPTED
HV6_PHASE_B_TECHNOLOGY_SELECTION = COMPLETE
SELECTED_ADAPTER = NATIVE_EXISTING_STACK
GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED
GRAPESJS_STUDIO_SDK = NOT_SELECTED
PHASE_C_IMPLEMENTATION_AUTHORIZED = YES
PRODUCTION_DEPLOYMENT_AUTHORIZED = NO
LIVE_FOURTH_STREET_MUTATION_AUTHORIZED = NO
REAL_SECOND_VENUE_ADMISSION_AUTHORIZED = NO
```

This record authorizes the selected-native Phase-C implementation required by the accepted HV-6 preregistration. It does not reopen technology selection and does not convert source implementation into deployment authorization.

## 2. Binding inputs

The implementation remains controlled by:

```text
HV5_CANONICAL_AUTHORING_AUTHORITY = src/venue/authoring.js
HV6_PREREGISTRATION = docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION_0_1_0.md
HV6_PHASE_B_SELECTION = docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_TECHNOLOGY_SELECTION_0_1_0.md
SELECTED_TECHNOLOGY = NATIVE_EXISTING_STACK
```

The Phase-B result is not provisional. GrapesJS Core and Studio SDK are outside the selected Phase-C implementation.

The controlling authority flow remains:

```text
ACCEPTED_HV5_DOCUMENT
-> NATIVE_VISUAL_ADAPTER_PROJECTION
-> OPERATOR_INTERACTION
-> PROPOSED_HV5_DOCUMENT
-> applyOrdinaryOperatorEdit(base, proposed)
-> ACCEPTED_HV5_DOCUMENT
-> CANONICAL_SERIALIZATION
```

No front-end state may replace the HV-5 domain gate.

## 3. Authorized implementation objective

Phase C must turn the qualified native evaluation substrate into a durable HV-6 foundation capable of supporting ordinary venue-authoring work without creating a second content authority.

The selected pattern is:

```text
SEMANTIC_SECTION_NAVIGATOR
+
TYPED_FIELD_INSPECTOR_DERIVED_FROM_HV5_OWNERSHIP
+
TRUTHFUL_REVIEW_PREVIEW_FROM_PROPOSED_HV5_STATE
```

The implementation should reuse the already-qualified Phase-B substrate where sound rather than reconstructing the editor from scratch.

The current substrate includes:

```text
src/venue/visual-authoring-session.js
scripts/capture-hv6-native-visual.js
test/hv6-visual-authoring-session.test.js
test/support/hv6-native-editor-fixture.js
```

Phase C may refactor or promote evaluation-only presentation machinery into durable source/view modules where required, but must preserve the accepted authority semantics.

## 4. Runtime and mounting boundary

Phase C authorizes a reusable native authoring foundation in source. It does **not** authorize silently exposing a new public production route.

The preferred boundary is an explicitly instantiated authoring surface that:

- receives an accepted HV-5 document as input;
- renders semantic controls and truthful preview locally/offline or in an explicitly authorized operator process;
- emits or returns accepted canonical HV-5 bytes after Apply;
- performs no Hive write, payment write, deployment mutation, key handling, or secret persistence;
- is not mounted into the ordinary production `createApp()` route graph by default.

If a later operation wants to mount the authoring surface into the live Fourth Street application, that later operation must separately specify operator authentication, session ownership, CSRF/origin protection, persistence destination, deployment behavior, and production authorization.

Phase C must not invent those production authorities merely to make the foundation look deployable.

## 5. Full editable-field surface

The ordinary visual adapter must derive its field registry from accepted HV-5 ownership semantics.

```text
EDITABLE_IFF = HV5_OWNERSHIP == OPERATOR_AUTHORED
INDEPENDENT_PERMISSION_ALLOWLIST = FORBIDDEN_AS_AUTHORITY
FUTURE_UNCLASSIFIED_FIELDS = FAIL_CLOSED
```

All accepted schema-v1 `OPERATOR_AUTHORED` leaves present in the supplied document should be discoverable through the generic selected adapter path.

Presentation metadata such as labels, semantic sections, input kinds, descriptions, or layout grouping may be maintained by the adapter, but it cannot grant write authority.

The Phase-B evidence currently exposes 42 operator-authored leaves across 11 semantic sections for both Fourth Street and Lantern Room. Phase C must preserve or improve that generic coverage rather than shrinking back to the original representative spike.

## 6. Required operator semantics

The foundation must preserve these states:

```text
CLEAN
DIRTY
VALIDATING
REJECTED_WITH_BASE_UNCHANGED
ACCEPTED
DISCARDED
```

Required behavior:

- open only from an accepted HV-5 base;
- no-op remains canonically byte-identical;
- edits update only an ephemeral proposal;
- Apply is explicit and atomic;
- Apply crosses `applyOrdinaryOperatorEdit(base, proposed)`;
- successful Apply replaces the accepted in-session document with the validated result;
- failed Apply leaves the accepted base unchanged;
- rejected state exposes a nontechnical error path;
- Discard reconstructs proposal and preview from the accepted base;
- destruction/recreation must require only accepted HV-5 state, not hidden editor persistence;
- no silent autosave may canonicalize state.

A test-only dependency-injection seam for the apply gate is permitted if needed to prove the `REJECTED_WITH_BASE_UNCHANGED` session transition deterministically. Such a seam may not expose raw proposal replacement or grant ordinary UI authority. The default gate must remain the real accepted HV-5 `applyOrdinaryOperatorEdit` implementation.

## 7. Protected-authority matrix

Phase C must explicitly prove the adapter cannot ordinary-author any of the preregistered protected classes.

At minimum cover crafted or direct attempts involving:

```text
VENUE_ID
HIVE_COMMUNITY_ID
HIVE_OFFICIAL_ACCOUNT
HIVE_THREADS_CONTAINER_ACCOUNT
PAYMENT_MERCHANT_ACCOUNTS
VENUE_PACKAGE_ID
VENUE_PACKAGE_VENUE_BINDING
DEPLOYMENT_REFERENCE
AUTHORING_SCHEMA_VERSION
VENUE_CONTEXT_SCHEMA_VERSION
VENUE_PACKAGE_SCHEMA_VERSION
DERIVED_IMAGE_WIDTH
DERIVED_IMAGE_HEIGHT
GALLERY_ADD
GALLERY_DELETE
GALLERY_REORDER_OR_CONTAINER_REPLACEMENT
UNKNOWN_FIELD_OR_STRUCTURE
RAW_HTML_AUTHORITY
COMPONENT_SCRIPT_OR_JAVASCRIPT_AUTHORITY
SECRET_OR_PRIVATE_MATERIAL
```

Where a capability has no ordinary UI control, the absence itself is useful evidence, but the underlying HV-5 gate must also be exercised against crafted protected proposals where technically meaningful.

A protected-field failure must leave accepted canonical bytes unchanged.

## 8. Schema-v1 gallery boundary

Phase-B evaluation discovered a real limitation in the accepted schema-v1 gallery model: gallery items do not have stable identity independent of array index.

Phase C must preserve the bounded disposition:

```text
RAW_FULL_DOCUMENT_REPLACEMENT_FROM_ORDINARY_UI = NO
GALLERY_ADD = NO
GALLERY_DELETE = NO
GALLERY_REORDER = NO
GALLERY_CONTAINER_REPLACEMENT = NO
EXISTING_FIXED_SLOT_OPERATOR_AUTHORED_LEAF_EDIT = YES
```

Do not invent image/dimension/content heuristics to guess whether a caller intended a same-length permutation.

A robust domain-level no-permutation proof would require a later explicit HV-5/schema refinement such as stable gallery slot or item identity. That is not authorized in Phase C unless a separately frozen schema-change operation is opened.

## 9. Preview truth

Final review preview must derive from proposed HV-5 state through the accepted application renderer or another explicitly proven equivalent projection.

The preferred implementation remains reuse of the real application rendering path.

Forbidden:

```text
DUPLICATE_HAND_BUILT_PRODUCT_RENDERER_AS_TRUTH
EDITOR_EXPORTED_HTML_AS_TRUTH
EDITOR_EXPORTED_CSS_AS_TRUTH
CLIENT_COMPONENT_TREE_AS_TRUTH
```

The preview may be wrapped or re-served by a bounded authoring process where required by production CSP/frame policy, provided the content itself is generated from the accepted application renderer and the wrapper does not acquire authoring authority.

## 10. Accessibility and responsive requirements

Phase C must preserve the preregistered product baseline:

- semantic section navigation;
- clear labels;
- properly associated controls and errors;
- visible dirty/accepted/rejected/discarded state;
- explicit Apply and Discard actions;
- keyboard traversal without pointer-only requirements;
- visible focus behavior;
- accessible name/role/value behavior;
- no critical axe violations on the bounded authoring surface;
- useful desktop operation;
- useful tablet operation;
- no catastrophic narrow/mobile failure;
- venue-neutral terminology in generic platform UI.

The existing Phase-B browser evidence is a starting baseline, not permission to weaken the final proof.

## 11. Venue-neutrality requirement

Fourth Street and Lantern Room must continue through the same implementation path.

Forbidden in generic adapter code:

```text
if venue == fourth-street
if venueType == bar
bar-only editable registry
mandatory venue-category enum
```

Venue-authentic nouns belong in the accepted venue/package data, not generic branching.

## 12. Direct-source independence

The accepted direct JSON/source authoring and validation path must remain functional without requiring the visual adapter as canonical authority.

Because the selected native adapter uses the existing application stack, Phase C should add no visual-editor framework dependency.

Required disposition:

```text
GRAPESJS_ROOT_DEPENDENCY = NO
GRAPESJS_EVALUATION_PACKAGE_IN_SELECTED_TREE = NO
STUDIO_SDK_DEPENDENCY = NO
DIRECT_SOURCE_MODE = PRESERVED
```

## 13. Authorized repository effects

Phase C may create or modify only what is reasonably necessary to complete the selected native foundation and its evidence, including:

```text
NATIVE_AUTHORING_SOURCE_MODULES
NATIVE_AUTHORING_VIEWS_OR_STATIC_ASSETS
AUTHORING_SESSION_REFINEMENTS
OFFLINE_OR_EXPLICIT_AUTHORING_SERVER_FACTORY
TEST_FIXTURES
DETERMINISTIC_TESTS
BROWSER_CAPTURE_AND_ACCESSIBILITY_TESTS
SCOPE_APPROPRIATE_CI_WIRING
IMPLEMENTATION_AND_REVIEW_RECORDS
```

Avoid unrelated refactors and production-path churn.

Existing test-support prototype code should be promoted, reduced, or retained based on whether it remains necessary after durable source modules exist. Do not maintain two divergent native editor implementations merely for historical symmetry.

## 14. Explicit non-authorization

This operation does not authorize:

```text
PRODUCTION_DEPLOYMENT
PUBLIC_PRODUCTION_AUTHORING_ROUTE
FOURTH_STREET_LIVE_MUTATION
REAL_SECOND_VENUE_ADMISSION
HIVE_WRITE_OR_BROADCAST
PAYMENT_WRITE
PRIVATE_KEY_CUSTODY
SECRET_STORAGE_OR_ROTATION
NEW_OPERATOR_AUTHENTICATION_AUTHORITY
NEW_PAYMENT_OR_MODERATION_AUTHORITY
GRAPESJS_CORE_SELECTED_DEPENDENCY
GRAPESJS_STUDIO_SDK
GRAPES_CLOUD_STORAGE
RAW_HTML_OR_SCRIPT_AUTHORITY
FREEFORM_PAGE_OR_LAYOUT_BUILDING
GALLERY_TOPOLOGY_AUTHORING
HV5_SCHEMA_CHANGE
IPFS_OR_IPNS_PUBLICATION
3SPEAK_OR_SPK_INTEGRATION
HELIA_OR_ORBITDB
SHARED_RUNTIME_MULTI_TENANCY
FLEET_ORCHESTRATION
```

The default runtime model remains one isolated venue per runtime.

## 15. Required final proof matrix

The Phase-C implementation candidate must qualify at minimum:

```text
CLASSIFIER = PASS
UBUNTU_DETERMINISTIC = PASS
WINDOWS_DETERMINISTIC = PASS
BROWSER_AUTHORING_FLOW = PASS
ACCESSIBILITY = PASS
RESPONSIVE_AUTHORING = PASS
FULL_HV5_DERIVED_EDITABLE_REGISTRY = PASS
NO_OP_BYTE_IDENTITY_FOURTH_STREET = PASS
NO_OP_BYTE_IDENTITY_LANTERN = PASS
REPRESENTATIVE_ALLOWED_EDIT_MATRIX_FOURTH_STREET = PASS
REPRESENTATIVE_ALLOWED_EDIT_MATRIX_LANTERN = PASS
DESTROY_RELOAD_FROM_ACCEPTED_HV5_ONLY = PASS
SESSION_REJECTED_BASE_UNCHANGED = PASS
PROTECTED_FIELD_NEGATIVE_MATRIX = PASS
RAW_HTML_AUTHORITY = ABSENT_OR_REJECTED
SCRIPT_JAVASCRIPT_AUTHORITY = ABSENT_OR_REJECTED
GALLERY_TOPOLOGY_UI = ABSENT
GALLERY_TOPOLOGY_DOMAIN_BOUNDARY = DOCUMENTED
DIRECT_SOURCE_MODE_REGRESSION = PASS
VENUE_NEUTRALITY = PASS
GRAPESJS_SELECTED_DEPENDENCY = ABSENT
NO_PRODUCTION_MUTATION = PASS
NO_HIVE_WRITE = PASS
```

If the changed-path classifier selects the retained rendered suite, that result is binding.

No live-Hive write or production mutation qualification is required or authorized.

## 16. Acceptance boundary

Phase-C implementation completion does not automatically accept HV-6.

After a qualified final candidate exists, the Project Lead must independently review:

- exact candidate commit/tree and parent;
- exact changed paths;
- final deterministic and rendered qualification;
- authority matrix evidence;
- accessibility/responsive evidence;
- direct-source independence;
- venue neutrality;
- any deviations from the preregistration or this authorization;
- the schema-v1 gallery limitation and whether it remained bounded.

Only after that review may a separate acceptance record declare:

```text
HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION = ACCEPTED
```

No production deployment follows automatically from source acceptance.

## 17. Routing after authorization

If this authorization becomes canonical, perform one bounded living-routing reconciliation before beginning new Phase-C implementation work.

That reconciliation should record:

```text
HV6_PHASE_B_TECHNOLOGY_SELECTION = COMPLETE
SELECTED_ADAPTER = NATIVE_EXISTING_STACK
HV6_PHASE_C_IMPLEMENTATION_AUTHORIZATION = ACCEPTED
HV6_PHASE_C_IMPLEMENTATION = AUTHORIZED__NOT_YET_ACCEPTED
NEXT_OPERATION = HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_AND_QUALIFICATION
GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED
PRODUCTION_MUTATION = NO
REAL_SECOND_VENUE_ADMISSION = NO
```

The routing operation is maintenance only and may not itself implement Phase C.

## 18. Authorization conclusion

```text
HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION = AUTHORIZED
SELECTED_ADAPTER = NATIVE_EXISTING_STACK
GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED
PHASE_C_SCOPE = SOURCE_FOUNDATION_AND_QUALIFICATION_ONLY
PUBLIC_PRODUCTION_MOUNT = NOT_AUTHORIZED
PRODUCTION_DEPLOYMENT = NOT_AUTHORIZED
REAL_SECOND_VENUE_ADMISSION = NOT_AUTHORIZED
NEXT_OPERATION_AFTER_CANONICAL_AUTHORIZATION_AND_ROUTING = HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_AND_QUALIFICATION
```

This authorization exists to complete the selected adapter foundation under the already accepted HV-5 authority model while keeping deployment, real-venue admission, and new operational authority as separate decisions.
