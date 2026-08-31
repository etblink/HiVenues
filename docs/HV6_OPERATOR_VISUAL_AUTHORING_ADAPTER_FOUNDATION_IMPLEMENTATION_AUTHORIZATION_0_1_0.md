# HV-6 Operator Visual Authoring Adapter Foundation — Implementation Authorization 0.1.0

## 1. Status

```text
OPERATION = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_IMPLEMENTATION_AUTHORIZATION
REPOSITORY = etblink/Hive-Venues

CANONICAL_BASE_COMMIT = dfd8dd477c11b5eaec8161cb2dfb2e61aec094d3
CANONICAL_BASE_TREE = 8235d87e9af5c2615284fcfa4f53ff7a7d8011eb

HV6_PREREGISTRATION = ACCEPTED
IMPLEMENTATION_AUTHORIZATION = BOUNDED_OFFLINE_DUAL_CANDIDATE_PROTOTYPE_AND_EVALUATION
TECHNOLOGY_WINNER_PRESELECTED = NO
PRODUCTION_MUTATION = NO
REAL_SECOND_VENUE_ADMISSION = NO
```

This record authorizes one bounded HV-6 implementation/evaluation operation under the already accepted preregistration. It does not reopen HV-6 product reasoning and does not select a production editor technology.

## 2. Authorized product question

Implementation may answer only the accepted HV-6 question:

```text
Can an ordinary venue operator make routine public-content changes already
classified OPERATOR_AUTHORED by HV-5, with useful visual context and without
acquiring authority over anything they do not own?
```

The controlling authority flow remains:

```text
ACCEPTED_HV5_DOCUMENT
-> VISUAL_ADAPTER_PROJECTION
-> OPERATOR_INTERACTION
-> PROPOSED_HV5_DOCUMENT
-> applyOrdinaryOperatorEdit(base, proposed)
-> ACCEPTED_HV5_DOCUMENT
-> CANONICAL_SERIALIZATION
```

The visual editor is an adapter. The HV-5 authoring document and ordinary-operator edit gate remain authoritative.

## 3. Authorized candidates

Two bounded candidates are authorized:

```text
CANDIDATE_A = GRAPESJS_CORE_ADAPTER
CANDIDATE_B = MINIMAL_NATIVE_EXISTING_STACK_ADAPTER
```

They are evaluation candidates, not two full editor products.

Implementation should build the smallest credible vertical slice for each candidate that can prove or falsify its major architectural and usability risks. A candidate that clearly loses a hard boundary may be stopped early; symmetry is not a requirement.

## 4. Representative vertical-slice scope

The implementation may choose the exact representative leaves, but coverage must include meaningfully different operator-owned field types and should normally span examples such as:

```text
venueContext.displayName
business phone or hours
hero lede
hero image src or alt
existing gallery slot caption
```

The slices must be sufficient to exercise:

```text
projection
field discovery
editing
truthful preview
apply
discard
no-op round trip
allowed-edit round trip
reload from accepted HV5 state
protected-field rejection
keyboard/accessibility behavior
responsive behavior
venue neutrality
```

The implementation may extend this thin-slice set only where additional coverage is necessary to resolve a material candidate risk or ambiguity.

## 5. Candidate A — GrapesJS Core authorization

Candidate A may add GrapesJS Core as an exact pinned evaluation dependency if implementation requires it.

Before freezing the evaluated dependency version, refresh the current upstream release and license evidence from official upstream sources. Pin the exact evaluated version rather than using a floating semver range.

Adding GrapesJS Core to the evaluation candidate does not select it as a production dependency.

Candidate A must begin constrained. The evaluation must preserve at least these conditions:

```text
STORAGE_MANAGER = DISABLED
EDITOR_AUTOSAVE = DISABLED
GRAPES_PROJECT_JSON_PERSISTED_AS_PLATFORM_DATA = NO
RAW_HTML_BLOCKS = NO
ARBITRARY_COMPONENT_INSERTION = NO
ARBITRARY_PAGE_CREATION = NO
ARBITRARY_LAYER_TOPOLOGY_EDITING = NO
ARBITRARY_STYLE_MANAGER_AUTHORITY = NO
COMPONENT_SCRIPTS = NO
EXTERNAL_SCRIPT_DEPENDENCIES = NO
UNKNOWN_COMPONENT_TYPES = FAIL_CLOSED_OR_UNAVAILABLE
GALLERY_ADD_DELETE_REORDER = NO
```

Useful GrapesJS capabilities may be used only as adapter mechanisms, including constrained semantic components, typed traits, component selection, bounded visual canvas/preview behavior, and ephemeral proposal events.

GrapesJS project state, component trees, generated HTML/CSS, and editor-local persistence must remain transient implementation details and may not become canonical Hive-Venues data.

The decisive Candidate-A question is:

```text
CAN_WE_CONSTRAIN_GRAPESJS_ENOUGH
WITHOUT_DESTROYING_ITS_USABILITY_ADVANTAGE?
```

If scripts, freeform topology, shadow persistence, or equivalent authority cannot be convincingly eliminated from the ordinary-operator path, stop Candidate A and record the failure.

## 6. Candidate B — native existing-stack authorization

Candidate B may use the accepted existing stack:

```text
EJS
HTMX
VANILLA_BROWSER_JS
TAILWIND_CSS
EXPRESS
HV5_AUTHORING_FUNCTIONS
```

A credible pattern is:

```text
SEMANTIC_SECTION_NAVIGATOR
+
TYPED_FIELD_INSPECTOR
+
TRUTHFUL_PREVIEW_FROM_PROPOSED_HV5_STATE
```

The implementation should derive editable controls from accepted HV-5 ownership semantics rather than creating an independent permission list when the existing authority can be reused.

The decisive Candidate-B question is:

```text
CAN_WE_BUILD_A_GENUINELY_VISUAL_OPERATOR_EXPERIENCE
WITHOUT_RECREATING_A_PAGE_BUILDER_OR_DUPLICATE_RENDERER?
```

If Candidate B remains little more than a settings form with weak visual context, or if it requires brittle duplication of rendering/navigation logic, record that honestly rather than protecting it because it has fewer dependencies.

## 7. Required authoritative behavior

Both candidates must remain subordinate to:

```text
applyOrdinaryOperatorEdit(base, proposed)
```

The implementation may expose only fields already classified `OPERATOR_AUTHORED` by accepted HV-5 authority.

Ordinary operators must not gain authority over:

```text
venue ID
package ID
deployment ID
Hive community/account routing
merchant accounts
schema versions
derived dimensions
gallery add/delete/reorder
mixed-container replacement
unknown fields
secrets/private material
```

Future or unknown schema fields must fail closed unless accepted HV-5 authority explicitly classifies them operator-authored.

UI visibility is not authorization. Protected mutations must fail through the authoritative domain gate even if a client attempts to construct them directly.

## 8. Required session semantics

Each credible candidate slice must support the relevant session states:

```text
CLEAN
DIRTY
VALIDATING
REJECTED_WITH_BASE_UNCHANGED
ACCEPTED
DISCARDED
```

Apply is atomic.

Discard reconstructs the visual projection from the accepted base.

Autosave may preserve ephemeral client convenience only if it cannot canonicalize or acquire authority; the default evaluation posture is no editor autosave.

A rejected proposal must leave the accepted base unchanged and provide an understandable error path for a nontechnical operator.

## 9. Required evidence

For both Fourth Street and Lantern Room fixtures, require:

```text
CANONICAL_HV5_DOCUMENT
-> VISUAL_ADAPTER_LOAD
-> NO_OP_SAVE
-> BYTE_IDENTICAL_CANONICAL_HV5_DOCUMENT
```

For allowed edits, require:

```text
CANONICAL_HV5_DOCUMENT
-> VISUAL_ADAPTER_EDIT
-> HV5_OPERATOR_GATE
-> EXPECTED_CANONICAL_HV5_DOCUMENT
-> DESTROY_EDITOR
-> RELOAD_FROM_ACCEPTED_HV5_DOCUMENT
-> SAME_SEMANTICS
```

No hidden editor persistence may be required for reload.

Also require evidence for:

```text
PROTECTED_FIELD_NEGATIVE_MATRIX
ARBITRARY_HTML_REJECTION
SCRIPT_REJECTION
UNKNOWN_STRUCTURE_REJECTION
DIRECT_SOURCE_MODE_INDEPENDENCE
TRUTHFUL_PREVIEW
KEYBOARD_OPERATION
ACCESSIBLE_LABELS_ERRORS_FOCUS
DESKTOP_AND_TABLET_USABILITY
NO_CATASTROPHIC_MOBILE_FAILURE
VENUE_NEUTRALITY
```

A hard-boundary failure overrides visual polish or weighted score.

## 10. Comparative evaluation

Use the accepted weights:

```text
HV5_AUTHORITY_PRESERVATION = 25%
OPERATOR_USABILITY_VISUAL_CONTEXT = 25%
DETERMINISTIC_ROUND_TRIP_RELOAD = 15%
ACCESSIBILITY_KEYBOARD_RESPONSIVE = 10%
IMPLEMENTATION_MAINTENANCE_COMPLEXITY = 10%
DEPENDENCY_LICENSE_UPDATE_BURDEN = 10%
VENUE_NEUTRALITY = 5%
```

Hard-boundary failures override the weighted comparison.

The comparative evaluation artifact must identify observed evidence, candidate-specific liabilities, unresolved risks, and a recommended technology disposition without inflating confidence beyond the implemented slice.

Permitted conclusions are:

```text
GRAPESJS_CORE
NATIVE_EXISTING_STACK
NEITHER__RETHINK_ADAPTER
```

The bounded implementation operation may recommend a winner. It may not silently convert that recommendation into live production deployment or unrelated architectural expansion.

## 11. Authorized implementation effects

The bounded operation may create or modify only what is reasonably necessary for the offline candidate evaluation, including:

```text
OFFLINE_PROTOTYPE_CODE
TEST_FIXTURES
TEST_HARNESSES
RENDERED_LOCAL_EVIDENCE
ACCESSIBILITY_EVIDENCE
RESPONSIVE_EVIDENCE
EXACT_PINNED_GRAPESJS_CORE_EVALUATION_DEPENDENCY_IF_REQUIRED
NATIVE_CANDIDATE_CODE
COMPARATIVE_EVALUATION_ARTIFACT
SCOPE_APPROPRIATE_TEST_AND_CI_SUPPORT
```

Repository changes should remain reviewable and should avoid gratuitous production-path churn before a candidate is selected.

## 12. Explicit non-authorization

This authorization does not permit:

```text
PRODUCTION_DEPLOYMENT
FOURTH_STREET_PRODUCTION_MUTATION
REAL_SECOND_VENUE_ADMISSION
HIVE_WRITE
PAYMENT_WRITE
PRIVATE_KEY_CUSTODY
SECRET_STORAGE_OR_ROTATION
GRAPESJS_STUDIO_SDK
GRAPES_CLOUD_STORAGE
EDITOR_PROJECT_STATE_PERSISTENCE_AS_AUTHORITY
ARBITRARY_SCRIPT_HTML_OR_STYLE_TOPOLOGY_AUTHORITY
IPFS_PUBLICATION
IPNS_MUTATION
3SPEAK_OR_SPK_INTEGRATION
HELIA_OR_ORBITDB
SHARED_RUNTIME_MULTI_TENANCY
FLEET_ORCHESTRATION
```

The default runtime model remains one isolated venue per runtime.

Existing Keychain/self-signing, payment, deployment, and production-safety boundaries remain unchanged.

## 13. Qualification and stopping rule

The implementation-authorization record itself should qualify as a documentation-only governance change under the repository's ordinary changed-path classifier, including deterministic Ubuntu and Windows gates.

After this authorization becomes canonical, perform one bounded routing reconciliation that records:

```text
HV6_PREREGISTRATION = ACCEPTED
HV6_IMPLEMENTATION = AUTHORIZED_AS_BOUNDED_EVALUATION
NEXT_OPERATION = HV6_BOUNDED_DUAL_CANDIDATE_IMPLEMENTATION_AND_EVALUATION
```

Then begin the authorized implementation/evaluation operation.

Do not begin implementation before this authorization is canonical and living routing has been reconciled.

## 14. Authorization conclusion

```text
HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_IMPLEMENTATION = AUTHORIZED_AS_BOUNDED_EVALUATION
AUTHORIZATION_MODE = BOUNDED_OFFLINE_DUAL_CANDIDATE_PROTOTYPE_AND_EVALUATION
CANDIDATE_A = GRAPESJS_CORE_ADAPTER
CANDIDATE_B = MINIMAL_NATIVE_EXISTING_STACK_ADAPTER
TECHNOLOGY_WINNER_PRESELECTED = NO
PRODUCTION_MUTATION = NO
REAL_SECOND_VENUE_ADMISSION = NO
NEXT_OPERATION_AFTER_ROUTING_RECONCILIATION = HV6_BOUNDED_DUAL_CANDIDATE_IMPLEMENTATION_AND_EVALUATION
```

This authorization exists to produce decision-quality product evidence with the least implementation necessary to distinguish the candidates while preserving the accepted HV-5 authority model.