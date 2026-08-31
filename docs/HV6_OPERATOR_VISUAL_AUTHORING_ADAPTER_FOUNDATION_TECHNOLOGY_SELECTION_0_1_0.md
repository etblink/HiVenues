# HV-6 Operator Visual Authoring Adapter Foundation — Technology Selection 0.1.0

## Status

```text
OPERATION = HV6_BOUNDED_DUAL_CANDIDATE_IMPLEMENTATION_AND_EVALUATION
PHASE = B__PROJECT_LEAD_TECHNOLOGY_SELECTION
REPOSITORY = etblink/Hive-Venues
AUTHORIZED_CANONICAL_BASE_COMMIT = 906bee55c638891117df23b7392de92e8d620ad7
AUTHORIZED_CANONICAL_BASE_TREE = e308d7ae6aa5ebdbaa9202c600cf26779c4d5a0d

PROJECT_LEAD_TECHNOLOGY_SELECTION = PASS
SELECTED_ADAPTER = NATIVE_EXISTING_STACK
GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED
GRAPESJS_STUDIO_SDK = NOT_SELECTED
PHASE_C_FULL_FOUNDATION_IMPLEMENTATION_AUTHORIZED_BY_THIS_FILE = NO
PRODUCTION_MUTATION = NO
REAL_SECOND_VENUE_ADMISSION = NO
```

This record is the explicit Phase-B technology-selection checkpoint required by the accepted HV-6 preregistration.

It selects the existing-stack native adapter for later Phase-C foundation work. It does **not** accept the full HV-6 foundation and does not expand the current bounded evaluation authorization into production or unbounded implementation.

## 1. Controlling decision rule

The accepted preregistration froze two candidates:

```text
A = GRAPESJS_CORE_ADAPTER
B = MINIMAL_NATIVE_EXISTING_STACK_ADAPTER
```

and required comparison across:

```text
HV5_AUTHORITY_PRESERVATION = 25%
OPERATOR_USABILITY_VISUAL_CONTEXT = 25%
DETERMINISTIC_ROUND_TRIP_RELOAD = 15%
ACCESSIBILITY_KEYBOARD_RESPONSIVE = 10%
IMPLEMENTATION_MAINTENANCE_COMPLEXITY = 10%
DEPENDENCY_LICENSE_UPDATE_BURDEN = 10%
VENUE_NEUTRALITY = 5%
```

Hard-boundary failures override weighted score.

The preregistration also supplied a decisive technology-specific rule:

```text
IF GRAPESJS DOES NOT PROVIDE A MATERIAL OPERATOR-USABILITY ADVANTAGE
OVER THE NATIVE BASELINE AFTER REQUIRED RESTRICTIONS,
SELECT THE NATIVE ADAPTER.
```

That rule controls the present disposition.

## 2. Candidate B — exact qualified native baseline

The qualified native evaluation head is:

```text
PR = 50
HEAD = ea96c1ea18bfe9fbda05293ec88316c9af32727a
TREE = 1b91989da1b56c627def7c5ca29bfc8010530029
CI_RUN = 33351730199
CI_RUN_NUMBER = 146
```

Relative to the authorized canonical base, the evaluated native surface changes exactly:

```text
.github/workflows/ci.yml
package.json
scripts/capture-hv6-native-visual.js
src/venue/visual-authoring-session.js
test/hv6-visual-authoring-session.test.js
test/support/hv6-native-editor-fixture.js
```

No root dependency was added for a visual-editor framework.

The shared authoring session derives editable leaves from accepted HV-5 ownership rather than maintaining an independent permission allowlist. The ordinary editor API exposes semantic leaf edits only; it exposes no raw full-document replacement, raw HTML authority, component-tree mutation channel, gallery add/delete/reorder method, deployment authoring path, or editor persistence authority.

## 3. Candidate B qualification evidence

Run `33351730199` passed:

```text
CLASSIFIER = PASS
UBUNTU_DETERMINISTIC = PASS
WINDOWS_DETERMINISTIC = PASS
CONSOLIDATED_RENDERED = PASS
HV6_NATIVE_VISUAL_AUTHORING = PASS
LIVE_HIVE_READ_ONLY = SKIPPED
```

The frozen rendered artifact is:

```text
ARTIFACT_ID = 9743957271
ARTIFACT_NAME = consolidated-visual-evidence-ea96c1ea18bfe9fbda05293ec88316c9af32727a
ARTIFACT_SHA256 = b198703a5dd72f52b3b8d00a3463821eb207cc888e3ea3c7156a9941adad09d9
```

Direct inspection of `hv6-native-visual/evidence.json` records:

```text
FOURTH_STREET_DESKTOP:
  EDITABLE_FIELDS = 42
  SEMANTIC_SECTIONS = 11
  EDITOR_AXE_VIOLATIONS = 0
  PREVIEW_AXE_VIOLATIONS = 0
  CONSOLE_ERRORS = 0
  HIVE_RPC_CALLS = 0

LANTERN_ROOM_TABLET:
  EDITABLE_FIELDS = 42
  SEMANTIC_SECTIONS = 11
  EDITOR_AXE_VIOLATIONS = 0
  PREVIEW_AXE_VIOLATIONS = 0
  CONSOLE_ERRORS = 0
  HIVE_RPC_CALLS = 0

FOURTH_STREET_MOBILE:
  EDITABLE_FIELDS = 42
  SEMANTIC_SECTIONS = 11
  EDITOR_AXE_VIOLATIONS = 0
  PREVIEW_AXE_VIOLATIONS = 0
  CONSOLE_ERRORS = 0
  HIVE_RPC_CALLS = 0
```

Both authoring scenarios exercised the same representative edit set:

```text
/venueContext/displayName
/venueContext/business/phone
/venuePackage/home/hero/lede
/venuePackage/home/hero/image/src
/venuePackage/home/hero/image/alt
/venuePackage/home/hero/image/caption
/venuePackage/home/gallery/items/0/caption
/venuePackage/onboarding/operatorNoun
/venuePackage/onboarding/staffRole
```

The browser fixture uses the real application renderer for review-preview truth rather than implementing a duplicate product renderer.

Project Lead Candidate-B findings:

```text
HV5_AUTHORITY_PRESERVATION = PASS
CREDIBLE_VISUAL_IMPROVEMENT_OVER_RAW_JSON = PASS
DETERMINISTIC_NO_OP_AND_RELOAD = PASS
ACCESSIBILITY_KEYBOARD_RESPONSIVE = PASS
IMPLEMENTATION_COMPLEXITY = ACCEPTABLE__EXISTING_STACK
DEPENDENCY_BURDEN = LOW__NO_NEW_EDITOR_FRAMEWORK
VENUE_NEUTRALITY = PASS
REAL_RENDERER_PREVIEW = PASS
```

## 4. Candidate A — exact bounded GrapesJS evaluation

Candidate A was isolated as a one-commit comparison on PR #52, based directly on the exact qualified native head:

```text
PR = 52
STATE = CLOSED_UNMERGED
BASE = ea96c1ea18bfe9fbda05293ec88316c9af32727a
HEAD = 7657387fb6117d6f508be4248f05e28527e21f7f
TREE = 8a6697408c68a6c6b4e5d16e23ae37522c73e1eb
```

The final candidate kept GrapesJS out of the root application dependency graph and instead used an evaluation-only package pinned to:

```text
GRAPESJS_CORE = 0.23.6
```

The isolated closure installed successfully, its exact dependency tree was verified, and its high-severity npm audit passed.

The ordinary repository CI on the exact final Candidate-A head also passed:

```text
ROOT_CI_RUN = 33353333523
ROOT_CI_RUN_NUMBER = 151
ROOT_CI_RESULT = PASS
```

This is positive evidence that the experimental GrapesJS dependency remained isolated from the normal application dependency path.

## 5. Candidate A observed liabilities

Candidate A did not fail because GrapesJS project state was allowed to become authority. The evaluation successfully removed or disabled the dangerous surfaces.

However, preserving the HV-5 boundary progressively required eliminating:

```text
EDITOR_STORAGE
AUTOSAVE_AUTHORITY
PROJECT_JSON_PERSISTENCE
RAW_HTML_BLOCKS
ARBITRARY_COMPONENT_INSERTION
ARBITRARY_PAGE_CREATION
LAYER_TOPOLOGY_EDITING
STYLE_MANAGER_AUTHORITY
COMPONENT_SCRIPTS
EXTERNAL_SCRIPT_DEPENDENCIES
GALLERY_TOPOLOGY_EDITING
```

The evaluation then exposed three additional integration costs.

### 5.1 Accessibility integration cost

The GrapesJS-generated canvas iframe initially failed the retained axe gate because it lacked an accessible name. The adapter had to assign a stable iframe title during initialization. The axe rule was not disabled.

### 5.2 Visual-selection interaction did not survive cleanly

The attempted Grapes advantage was a direct semantic-canvas selection path that would focus the corresponding HV-5 inspector control.

The semantic selection event fired, but Grapes reclaimed focus into its canvas. A deferred focus bridge was then tested through a real click inside the Grapes canvas and remained unreliable.

The Project Lead stopped that repair loop rather than adding increasingly brittle event choreography.

The final bounded form therefore made semantic components explicitly non-selectable and treated Grapes only as read-only spatial context while all authoring remained in the HV-5 semantic inspector.

### 5.3 Dedicated browser qualification remained red

The final dedicated Candidate-A run was:

```text
RUN = 33353333518
RUN_NUMBER = 5
RESULT = FAILURE
```

All pre-browser gates passed:

```text
EXACT_HEAD_CHECKOUT = PASS
ROOT_DEPENDENCY_INSTALL_WITHOUT_GRAPESJS = PASS
ROOT_BUILD = PASS
ISOLATED_GRAPESJS_INSTALL = PASS
ISOLATED_DEPENDENCY_TREE = PASS
ISOLATED_HIGH_SEVERITY_AUDIT = PASS
PINNED_CHROMIUM_INSTALL = PASS
```

The bounded browser proof failed after the first Fourth Street authoring/apply/reload path because the zero-console-error gate recorded repeated `net::ERR_BLOCKED_BY_CLIENT.Inspector` resource failures under the intentionally offline request boundary.

The failure evidence was preserved rather than suppressed.

Project Lead Candidate-A findings:

```text
HV5_AUTHORITY_PRESERVATION_AFTER_RESTRICTION = PASS
ROOT_DEPENDENCY_ISOLATION = PASS
ISOLATED_AUDIT = PASS
MATERIAL_USABILITY_ADVANTAGE_AFTER_RESTRICTION = NO
DEDICATED_BROWSER_QUALIFICATION = FAIL
FULL_LANTERN_AND_RESPONSIVE_CANDIDATE_PROOF = NOT_COMPLETED
DEPENDENCY_AND_UPDATE_BURDEN = HIGHER_THAN_NATIVE
INTEGRATION_COMPLEXITY = HIGHER_THAN_NATIVE
```

## 6. Weighted comparison disposition

The accepted weights were applied as decision dimensions rather than converted into false-precision numerical scores unsupported by the bounded prototypes.

| Dimension | Candidate A — GrapesJS Core | Candidate B — native existing stack | Disposition |
| --- | --- | --- | --- |
| HV-5 authority preservation — 25% | PASS only after strong capability removal | PASS by direct reuse of HV-5 ownership/gate | Native at least equal |
| Operator usability / visual context — 25% | Read-only auxiliary canvas after restrictions; selection bridge did not survive reliably | Semantic navigator + typed inspector + real renderer; 42 fields / 11 sections | **Native wins** |
| Deterministic round trip / reload — 15% | First flow progressed, but final dedicated browser candidate remained red | Full Fourth Street + Lantern proof PASS | **Native wins** |
| Accessibility / keyboard / responsive — 10% | Additional iframe repair required; final full candidate proof incomplete | axe/keyboard/focus/desktop/tablet/mobile PASS | **Native wins** |
| Implementation / maintenance complexity — 10% | Additional editor framework and adapter fencing | Existing stack, no second page-builder model | **Native wins** |
| Dependency / license / update burden — 10% | Exact isolated 11-package evaluation closure; audit clean but extra update surface | No new editor framework dependency | **Native wins** |
| Venue neutrality — 5% | Full final cross-fixture proof incomplete | Same path for Fourth Street and Lantern Room PASS | **Native wins** |

The comparison does not need a tie-breaking arithmetic score. The controlling preregistered rule already resolves the result because Candidate A no longer offers a material operator-usability advantage after the restrictions needed to preserve authority.

## 7. Schema-v1 gallery limitation discovered during evaluation

The evaluation uncovered one existing authoring-model limitation that must be recorded without silently rewriting accepted HV-5 history.

HV-5 schema v1 gallery items have no stable item identity independent of their array index. A same-length permutation can therefore be observationally indistinguishable from coordinated changes to operator-authored slot content when protected derived values happen to coincide.

The bounded HV-6 adapter does not attempt to solve this with heuristics.

Instead:

```text
RAW_DOCUMENT_REPLACEMENT_API = NO
GALLERY_ADD_API = NO
GALLERY_DELETE_API = NO
GALLERY_REORDER_API = NO
GALLERY_CONTAINER_EDIT = DENIED
EXISTING_FIXED_SLOT_LEAF_EDIT = ALLOWED_IF_HV5_OPERATOR_AUTHORED
```

A robust future domain-level proof of same-length no-permutation intent would require stable gallery item/slot identity or another explicit schema refinement. That is outside this bounded technology-selection operation.

This limitation does not justify weakening the accepted HV-5 gate and does not authorize an HV-5 schema change here.

## 8. Technology selection

The evidence answers both candidate-specific questions.

```text
CANDIDATE_A_QUESTION = CAN_WE_CONSTRAIN_GRAPESJS_ENOUGH_WITHOUT_DESTROYING_ITS_USABILITY_ADVANTAGE?
ANSWER = NO

CANDIDATE_B_QUESTION = CAN_WE_BUILD_A_GENUINELY_VISUAL_OPERATOR_EXPERIENCE_WITHOUT_RECREATING_A_PAGE_BUILDER_OR_DUPLICATE_RENDERER?
ANSWER = YES
```

Therefore:

```text
PROJECT_LEAD_TECHNOLOGY_SELECTION = PASS
SELECTED_ADAPTER = NATIVE_EXISTING_STACK
GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED
GRAPESJS_STUDIO_SDK = NOT_SELECTED
CANDIDATE_A_PR_52 = CLOSED_UNMERGED_AS_EVALUATION_EVIDENCE
CANDIDATE_B_PR_50 = QUALIFIED_EVALUATION_SURFACE
```

## 9. Authorization boundary after selection

This file selects technology only.

The current implementation authorization is explicitly bounded to dual-candidate prototype/evaluation and a comparative artifact. It does not silently authorize unbounded Phase-C build-out.

Accordingly:

```text
PHASE_B_TECHNOLOGY_SELECTION = COMPLETE
PHASE_C_SELECTED_FOUNDATION_IMPLEMENTATION = NOT_YET_AUTHORIZED
NEXT_OPERATION_IF_SELECTION_BECOMES_CANONICAL = HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_AUTHORIZATION
PRODUCTION_MUTATION = NO
REAL_SECOND_VENUE_ADMISSION = NO
HIVE_WRITE = NO
PAYMENT_WRITE = NO
PRIVATE_KEY_OR_SECRET_AUTHORITY_CHANGE = NO
SHARED_RUNTIME_MULTI_TENANCY = NO
```

The native evaluation code may be retained as bounded evidence and as a candidate substrate for later separately authorized Phase-C work, but it is not declared the accepted HV-6 foundation by this record.
