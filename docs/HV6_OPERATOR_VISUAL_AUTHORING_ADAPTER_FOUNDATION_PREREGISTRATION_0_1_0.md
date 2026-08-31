# HV-6 Operator Visual Authoring Adapter Foundation — Preregistration 0.1.0

## 1. Status

```text
OPERATION = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION
STATUS = FROZEN_PREREGISTRATION__IMPLEMENTATION_NOT_AUTHORIZED
REPOSITORY = etblink/Hive-Venues
MILESTONE = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION
SELECTED_LANE = OPERATOR_VISUAL_AUTHORING_ADAPTER

CANONICAL_BASE_COMMIT = eef5c6b8de9be3307fda4c4c9e21288b0fb46f98
CANONICAL_BASE_TREE = e22dc12894660648014118c43df0542d201ff73c

CANONICAL_AUTHORING_AUTHORITY = HV5_AUTHORING_DOCUMENT
HV5_OPERATOR_EDIT_GATE = applyOrdinaryOperatorEdit
DIRECT_SOURCE_MODE = PRESERVED
EDITOR_PROJECT_STATE_AUTHORITY = NONE
EXPORTED_HTML_CSS_AUTHORITY = NONE

PRIMARY_EVALUATION_CANDIDATE = GRAPESJS_CORE
COMPARATOR = MINIMAL_NATIVE_EXISTING_STACK_ADAPTER
GRAPESJS_CORE_DEPENDENCY_SELECTED = NO
GRAPESJS_STUDIO_SDK_DEPENDENCY_SELECTED = NO
TECHNOLOGY_SELECTION_AT_PREREGISTRATION = NO
IMPLEMENTATION_AUTHORIZED = NO
REAL_SECOND_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
```

This preregistration freezes the product, authority, usability, technology-evaluation, falsification, and qualification contract for HV-6 before implementation begins.

It does **not** add GrapesJS or any other dependency. It does not authorize a prototype, a production editor, a real second venue, a Hive write, or a deployment mutation.

HV-6 is not a generic website-builder milestone. Its question is narrower and more useful:

> Can an ordinary venue operator make the routine public-content changes that HV-5 already says they own, with strong visual context and without acquiring authority over anything they do not own?

The visual tool is successful only if it makes the accepted domain model easier to use. It may not redefine that model.

---

## 2. Binding predecessor decisions

HV-6 inherits and may not weaken:

- accepted HV-1 venue-context authority;
- accepted HV-3 venue-package authority;
- accepted HV-4 isolated bootstrap and three-way binding;
- accepted HV-5 canonical authoring document;
- accepted HV-5 ownership classification;
- accepted HV-5 ordinary-operator edit gate;
- accepted direct JSON/source authoring path;
- accepted Post-HV5 selection of `OPERATOR_VISUAL_AUTHORING_ADAPTER` as the next lane.

The controlling existing implementation is `src/venue/authoring.js`.

HV-5 already provides the critical enforcement point:

```text
BASE_HV5_DOCUMENT
+
PROPOSED_HV5_DOCUMENT
-> validate both independently
-> compute semantic changed paths
-> require every changed path == OPERATOR_AUTHORED
-> return validated proposed document OR fail atomically
```

HV-6 must reuse that gate. It must not recreate a weaker parallel permission system and must not treat front-end hiding as authorization.

---

## 3. Product outcome

The target operator experience is **editing a venue**, not editing source code and not constructing an arbitrary web page.

A nontechnical operator should be able to:

1. open an authoring surface from an accepted HV-5 document;
2. understand the venue page in recognizable semantic sections;
3. see which visible content is editable;
4. change ordinary public facts, copy, and existing media metadata;
5. see a faithful preview before acceptance;
6. understand unsaved changes and validation errors;
7. review/apply the proposed change;
8. receive an atomic accepted result or an understandable rejection;
9. reload from the accepted HV-5 output and see the same values;
10. discard changes without mutating canonical state.

The surface should feel approachable to a venue owner or staff member who knows their business but does not know the repository schema.

A technically sophisticated operator must still be able to bypass the visual adapter entirely and use the canonical JSON/source path.

---

## 4. Frozen authority flow

The only permitted semantic flow is:

```text
ACCEPTED_HV5_DOCUMENT
-> VISUAL_ADAPTER_PROJECTION
-> OPERATOR_INTERACTION
-> PROPOSED_HV5_DOCUMENT
-> applyOrdinaryOperatorEdit(base, proposed)
-> ACCEPTED_HV5_DOCUMENT
-> CANONICAL_SERIALIZATION
```

The following are forbidden authority flows:

```text
EDITOR_PROJECT_JSON -> PLATFORM_SOURCE_OF_TRUTH
EDITOR_COMPONENT_TREE -> PLATFORM_SOURCE_OF_TRUTH
EDITOR_HTML_CSS_EXPORT -> PLATFORM_SOURCE_OF_TRUTH
EDITOR_AUTOSAVE -> ACCEPTED_HV5_DOCUMENT
UI_VISIBILITY_RULES -> REPLACE_HV5_OWNERSHIP_GATE
```

The accepted HV-5 document is the base document and recovery truth for every editing session.

No editor-only datum may be required to reconstruct a valid accepted authoring document.

---

## 5. Exact ordinary-operator scope

HV-6 ordinary controls may expose only fields that the accepted HV-5 ownership policy classifies `OPERATOR_AUTHORED`.

At the current schema boundary this includes the following semantic groups.

### 5.1 Venue identity presentation and public facts

```text
/venueContext/displayName
/venueContext/business/address
/venueContext/business/phone
/venueContext/business/hours
/venueContext/business/websiteUrl
/venueContext/business/mapUrl
```

### 5.2 Brand / SEO

```text
/venuePackage/brand/logo/src
/venuePackage/seo/defaultDescription
```

### 5.3 Hero

```text
/venuePackage/home/hero/lede
/venuePackage/home/hero/footnote
/venuePackage/home/hero/image/src
/venuePackage/home/hero/image/alt
/venuePackage/home/hero/image/caption
```

### 5.4 Updates, pathways, visit, and community copy

All currently accepted operator-authored leaf text fields under:

```text
/venuePackage/home/updates/*
/venuePackage/home/pathways/*
/venuePackage/home/visit/*
/venuePackage/home/community/*
```

where the exact leaf is already classified `OPERATOR_AUTHORED` by HV-5.

### 5.5 Gallery

The current gallery topology is **not** ordinary-operator authority.

For each already-existing gallery item slot, HV-6 may expose only:

```text
src
alt
caption
```

HV-6 v1 must not allow an ordinary operator to:

```text
ADD_GALLERY_ITEM
DELETE_GALLERY_ITEM
REORDER_GALLERY_ITEMS
REPLACE_GALLERY_ARRAY
REPLACE_WHOLE_GALLERY_ITEM_OBJECT
EDIT_WIDTH_OR_HEIGHT
```

Those operations would cross protected container or derived-field boundaries in HV-5.

### 5.6 Onboarding vocabulary

```text
/venuePackage/onboarding/operatorNoun
/venuePackage/onboarding/staffRole
```

### 5.7 Future schema additions

A future field does not become visually editable merely because the adapter can render it.

```text
NEW_PATH + NO_HV5_OPERATOR_AUTHORED_CLASSIFICATION
= NOT_EDITABLE
```

The adapter therefore fails closed as the domain model evolves.

---

## 6. Protected state presentation

These ownership classes may not receive ordinary edit controls:

```text
INTEGRATION_OWNED
DERIVED
PLATFORM_FIXED
DEPLOYMENT_OWNED
SECURITY_PRIVILEGED
SECRET_OR_PRIVATE__FORBIDDEN_FROM_AUTHORING_DOCUMENT
```

Where protected values are useful context, the UI may show them read-only with plain-language explanation. Where they are operationally irrelevant or sensitive, they should be absent.

At minimum, ordinary authoring must not permit changes to:

- venue ID;
- Hive community ID;
- official Hive account;
- threads-container account;
- merchant/payment accounts;
- venue-package ID;
- package-bound venue ID;
- deployment reference;
- schema versions;
- derived image dimensions;
- mixed-ownership object/container structure;
- gallery cardinality/order;
- secret or private material.

Front-end controls are convenience. `applyOrdinaryOperatorEdit` remains final authority.

---

## 7. Working-copy and apply semantics

An editing session may maintain an **ephemeral working proposal** in browser memory or test-process memory.

It may not silently persist a second platform-authoritative document.

Required session states:

```text
CLEAN
DIRTY
VALIDATING
REJECTED_WITH_BASE_UNCHANGED
ACCEPTED
DISCARDED
```

Required behaviors:

- opening starts from an accepted HV-5 base;
- a no-op session remains clean;
- edits make the working proposal dirty;
- `Apply changes` submits a complete proposed HV-5 document through `applyOrdinaryOperatorEdit`;
- rejection leaves the accepted base unchanged;
- acceptance yields the validated proposed HV-5 document;
- `Discard` recreates the visual projection from the accepted base;
- no automatic editor persistence may cause canonical acceptance;
- no partial field write is canonicalized on a failed multi-field proposal.

An implementation may offer field-level early validation for usability, but that validation is advisory relative to the HV-5 domain gate.

---

## 8. Preview truth

A visually attractive preview is useful only if it means something.

Final review/preview truth must derive from:

1. the same accepted application rendering path; or
2. an explicitly bounded deterministic projection of the proposed HV-5 document whose semantics are proven equivalent for the fields in scope.

The project may not treat editor-exported HTML/CSS as final product truth.

If a candidate technology uses its own canvas to make editing convenient, that canvas is an **editing aid**. Before acceptance, the operator must be able to inspect a preview derived from the proposed HV-5 document rather than from editor-only state.

The preregistered preference is:

```text
PROPOSED_HV5_DOCUMENT
-> EXISTING_OR_BOUNDED_ACCEPTED_RENDERER
-> REVIEW_PREVIEW
```

not:

```text
EDITOR_CANVAS_EXPORT
-> ASSUMED_PRODUCT_PREVIEW
```

---

## 9. Product UX baseline

HV-6 must provide or prove a coherent baseline containing:

- semantic section navigation rather than schema-pointer navigation;
- clear field labels and help where venue terminology is not obvious;
- a visually recognizable venue preview;
- visible dirty/unsaved state;
- `Apply changes` and `Discard changes` actions;
- understandable validation/rejection messages;
- no requirement to understand JSON pointers, Git, HTML, CSS, or JavaScript;
- keyboard-operable controls;
- visible focus states;
- properly associated labels and errors;
- accessible name/role/value behavior for interactive controls;
- useful desktop and tablet operation;
- no catastrophic mobile failure, even if phone authoring is not the primary v1 target;
- venue-neutral wording and implementation paths.

A field should be directly discoverable either from the semantic section inspector or by selecting the corresponding editable content in the preview.

The adapter should not make a user hunt through generic web-builder concepts such as DOM layers, CSS selectors, style classes, or arbitrary blocks merely to edit venue copy.

---

## 10. Technology evaluation gate

HV-6 preregisters two candidates.

```text
A = GRAPESJS_CORE_ADAPTER
B = MINIMAL_NATIVE_EXISTING_STACK_ADAPTER
```

No winner is declared here.

### 10.1 Evaluation dimensions

| Dimension | Weight | Hard boundary |
| --- | ---: | --- |
| HV-5 authority preservation | 25% | mandatory PASS |
| operator usability / visual context | 25% | mandatory credible improvement over raw JSON |
| deterministic no-op and reload behavior | 15% | mandatory PASS |
| accessibility / keyboard / responsive use | 10% | mandatory PASS |
| implementation and maintenance complexity | 10% | lower is better |
| dependency / licensing / update burden | 10% | must be explicit and acceptable |
| venue neutrality | 5% | mandatory PASS |

A candidate with a hard-boundary failure is rejected regardless of weighted score.

If GrapesJS does not provide a **material operator-usability advantage** over the native baseline after the required restrictions are applied, the native adapter wins. A dependency is not justified merely because its unconstrained demo is more impressive.

If the native adapter cannot provide enough spatial context or becomes a brittle duplicate rendering system, GrapesJS may win if it preserves the HV-5 contract cleanly.

---

## 11. Candidate A — GrapesJS Core boundary

Current upstream evidence makes GrapesJS Core a serious candidate, but HV-6 must use only the portion that serves the domain model.

If a later implementation authorization permits a GrapesJS Core spike, the candidate must begin with these constraints:

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

Permitted GrapesJS capabilities may include, if they survive the evaluation:

- a constrained canvas for spatial context;
- custom component types representing preregistered semantic venue sections;
- typed traits bound to supported operator-owned values;
- component selection that focuses the corresponding venue field;
- bounded device/preview widths;
- editor events used only to maintain an ephemeral proposal.

The candidate should expose a **whitelisted semantic projection**, not a generic block library.

### 11.1 GrapesJS project state

Upstream GrapesJS normally treats project JSON as the correct persistence representation for its editor. Hive-Venues intentionally does not.

Therefore:

```text
GRAPES_PROJECT_STATE = TRANSIENT_ADAPTER_IMPLEMENTATION_DETAIL
LOAD_SOURCE = ACCEPTED_HV5_DOCUMENT
SAVE_TARGET = PROPOSED_HV5_DOCUMENT
SESSION_RELOAD_SOURCE = ACCEPTED_HV5_DOCUMENT
```

The implementation must be able to destroy the editor instance and reconstruct a new one solely from the accepted HV-5 document.

### 11.2 Executable-content boundary

GrapesJS Core supports component JavaScript/scripts. That capability is outside HV-6 authority.

No ordinary operator action may introduce:

- component scripts;
- event-handler code;
- arbitrary JavaScript;
- arbitrary external library dependencies;
- executable HTML fragments.

If this surface cannot be convincingly disabled or made unreachable in the constrained adapter, GrapesJS loses the evaluation.

### 11.3 Studio SDK

GrapesJS Studio SDK is a separate polished commercial product and a useful UX reference, but it is not an HV-6 dependency candidate under this preregistration.

```text
GRAPESJS_STUDIO_SDK = REFERENCE_ONLY
PUBLIC_DOMAIN_LICENSE_COMMITMENT = NOT_AUTHORIZED
CLOUD_PROJECT_STORAGE = NOT_AUTHORIZED
CLOUD_ASSET_STORAGE = NOT_AUTHORIZED
```

A later decision could reconsider it only through an explicit dependency/licensing gate.

---

## 12. Candidate B — minimal native existing-stack adapter

The control candidate should use the project’s existing application stack rather than introduce an editor framework:

- EJS;
- htmx;
- vanilla browser JavaScript;
- Tailwind/CSS;
- the existing Express/server rendering boundary;
- the existing HV-5 authoring functions.

A credible native design is:

```text
SEMANTIC_SECTION_NAVIGATOR
+
TYPED_FIELD_INSPECTOR
+
LIVE/REVIEW PREVIEW FROM PROPOSED HV5 STATE
```

Potential behavior:

- the server or browser receives the accepted HV-5 document;
- a small pointer-to-control registry is derived from the accepted ownership map;
- field changes update an ephemeral proposed document;
- selecting a visual region focuses its corresponding supported control;
- preview is refreshed from the proposed HV-5 state;
- Apply uses `applyOrdinaryOperatorEdit`;
- no second page-builder model is introduced.

The native candidate’s main advantage is architectural directness and low dependency burden. Its main risk is becoming a visually weak form editor or duplicating too much rendering/navigation logic.

It must therefore be evaluated on actual operator usability rather than chosen automatically for simplicity.

---

## 13. Fresh external technology evidence

This preregistration refreshes only the external technology snapshot. It does not alter the accepted Post-HV5 sequencing decision.

### 13.1 GrapesJS Core release and license

Upstream GitHub identifies the current latest Core release as:

```text
VERSION = v0.23.6
PUBLISHED = 2026-08-26
```

Reference:

- https://github.com/GrapesJS/grapesjs/releases/tag/v0.23.6

The v0.23.6 Core repository license permits source and binary redistribution with the BSD-style notice/disclaimer and non-endorsement conditions.

Reference:

- https://github.com/GrapesJS/grapesjs/blob/v0.23.6/LICENSE

The historical Post-HV5 sequencing record is not rewritten; its earlier release observation is superseded for HV-6 technology evaluation by this refreshed snapshot.

### 13.2 Core persistence behavior

Official Core Storage Manager documentation states that persistence can be disabled with:

```text
storageManager: false
```

It also documents `getProjectData()` / `loadProjectData()` and warns that GrapesJS project JSON is the representation to rely on for properly reloading a GrapesJS project rather than HTML/CSS.

Reference:

- https://grapesjs.com/docs/modules/Storage.html

This is exactly why Hive-Venues must keep GrapesJS state transient relative to HV-5 rather than persist it as a competing truth source.

### 13.3 Traits and scripts

Official Core Trait Manager documentation supports typed traits and property-bound controls, which is potentially useful for a constrained semantic editor.

Reference:

- https://grapesjs.com/docs/modules/Traits.html

Official Components & JS documentation also explicitly supports component scripts and external JavaScript-library behavior.

Reference:

- https://grapesjs.com/docs/modules/Components-js.html

HV-6 treats that executable surface as a capability to exclude, not a feature to expose.

### 13.4 Studio SDK licensing

Current Studio SDK documentation says a license is required to run Studio on a public domain, while localhost use can access the features without that public-domain license.

References:

- https://app.grapesjs.com/docs-sdk/overview/licenses
- https://app.grapesjs.com/docs-sdk/overview/getting-started

Studio therefore remains a UX reference rather than a silently adopted dependency.

---

## 14. Required later implementation proofs

If HV-6 implementation is separately authorized, the accepted candidate must produce these proofs against both Fourth Street and Lantern Room fixtures.

### 14.1 No-op byte identity

```text
ACCEPTED_HV5_DOCUMENT
-> LOAD_VISUAL_ADAPTER
-> MAKE_NO_CHANGES
-> APPLY_OR_SERIALIZE_REVIEW
-> EXACT_SAME_CANONICAL_BYTES
```

Required for both fixtures.

A visual editor that dirties or normalizes canonical content merely by opening it fails.

### 14.2 Allowed-edit proof

At minimum, the proof suite must include representative edits across different semantic groups, such as:

- display/business fact;
- hero copy;
- image `src` / `alt` / `caption`;
- gallery existing-slot metadata;
- onboarding vocabulary.

For each:

```text
BASE
-> VISUAL_EDIT
-> PROPOSED_DOCUMENT
-> applyOrdinaryOperatorEdit
-> ACCEPT
-> CANONICAL_SERIALIZE
-> RELOAD_NEW_EDITOR_INSTANCE_FROM_ACCEPTED_DOCUMENT
-> EXPECTED_VALUES_PRESENT
```

No editor persistence may be used for the reload proof.

### 14.3 Negative authority matrix

At minimum, prove that an ordinary operator cannot successfully change:

- venue ID;
- Hive community ID;
- official account;
- threads-container account;
- merchant accounts;
- package ID;
- package venue binding;
- deployment reference;
- schema versions;
- width/height;
- gallery topology/cardinality/order;
- unknown fields;
- raw HTML authority;
- component scripts / JavaScript authority.

Where possible these operations should be absent from the ordinary UI. Independently, a crafted proposed document must still be rejected by the HV-5 gate with the accepted base unchanged.

### 14.4 Deterministic projection proof

Repeated visual projections from the same accepted HV-5 document must be semantically equivalent and produce the same proposed document for the same operator edits.

Random editor-generated IDs may exist internally only if they cannot influence proposed/canonical HV-5 output.

### 14.5 Accessibility and browser proof

Use the project’s browser/accessibility tooling to verify at least:

- keyboard traversal;
- focus visibility;
- labels;
- error association;
- actionable controls without pointer-only interaction;
- no critical axe violations on the bounded authoring surface;
- desktop and tablet usability;
- basic narrow-viewport integrity.

### 14.6 Cross-platform deterministic proof

Normal repository qualification must pass on Ubuntu and Windows.

### 14.7 Venue-neutrality proof

Fourth Street and Lantern Room must use the same adapter implementation path.

Forbidden:

```text
if venue == fourth-street
if venueType == bar
bar-only field registry
```

No mandatory venue-category enum may be introduced.

### 14.8 Direct-source regression proof

The existing direct JSON/source authoring and validation path must continue to work without the visual editor or its dependency installed at runtime where not needed.

---

## 15. Bounded implementation-evaluation shape

This preregistration does not authorize implementation, but it freezes a practical later sequence so the technology decision is evidence-driven without building two full products.

If separately authorized:

### Phase A — minimal comparison spike

Build only enough of each candidate to exercise the same small representative slice:

```text
ONE_TEXT_EDIT
ONE_URL_OR_IMAGE_METADATA_EDIT
ONE_PROTECTED_FIELD_NEGATIVE
NO_OP_ROUND_TRIP
RELOAD_FROM_HV5
KEYBOARD_PATH
```

The spike is disposable evidence, not production architecture.

### Phase B — Project Lead technology selection

Compare measured behavior using Section 10.

Select one adapter.

Do not retain both technology stacks merely because both were prototyped.

### Phase C — selected HV-6 foundation implementation

Only the selected adapter proceeds to the full preregistered field surface and proof matrix.

A later implementation authorization may combine Phases A–C only if it preserves the explicit selection checkpoint before unbounded build-out.

---

## 16. Qualification surface

A later HV-6 candidate is expected to require stronger qualification than this docs-only preregistration because it will be user-visible.

At minimum:

```text
CLASSIFIER = PASS
UBUNTU_DETERMINISTIC = PASS
WINDOWS_DETERMINISTIC = PASS
BROWSER_AUTHORING_FLOW = PASS
ACCESSIBILITY = PASS
RESPONSIVE_AUTHORING = PASS
NO_OP_BYTE_IDENTITY_FOURTH_STREET = PASS
NO_OP_BYTE_IDENTITY_LANTERN = PASS
ALLOWED_EDIT_RELOAD = PASS
NEGATIVE_AUTHORITY_MATRIX = PASS
DIRECT_SOURCE_MODE_REGRESSION = PASS
NO_PRODUCTION_MUTATION = PASS
NO_HIVE_WRITE = PASS
```

If the repository classifier selects rendered acceptance, that gate is binding.

No production/live-Hive write qualification is required or authorized for HV-6.

---

## 17. Failure criteria

HV-6 must be rejected or repaired if any of the following occurs:

```text
EDITOR_PROJECT_STATE_BECOMES_REQUIRED_PERSISTED_AUTHORITY
NO_OP_CHANGES_CANONICAL_BYTES
SAVE_BYPASSES_applyOrdinaryOperatorEdit
PROTECTED_FIELD_CAN_BE_CHANGED_THROUGH_ORDINARY_FLOW
BASE_MUTATES_ON_REJECTED_PROPOSAL
RAW_HTML_BECOMES_CANONICAL_AUTHORING_AUTHORITY
ARBITRARY_SCRIPT_OR_EVENT_HANDLER_AUTHORITY_ENTERS
ARBITRARY_CSS_OR_LAYOUT_TREE_BECOMES_CANONICAL_AUTHORITY
GALLERY_TOPOLOGY_CHANGES_WITHOUT_NEW_AUTHORIZATION
EDITOR_PREVIEW_CANNOT_BE_REPRODUCED_FROM_PROPOSED_HV5_STATE
FOURTH_STREET_SPECIAL_CASE_REQUIRED
LANTERN_CANNOT_USE_SAME_GENERIC_PATH
DIRECT_JSON_SOURCE_MODE_BREAKS
ACCESSIBILITY_OR_KEYBOARD_USE_IS_MATERIALLY_POOR
RESPONSIVE_OPERATOR_USE_IS_MATERIALLY_POOR
GRAPESJS_DEPENDENCY_ADDED_BEFORE_SELECTION
STUDIO_SDK_LICENSE_DEPENDENCY_ADDED_WITHOUT_EXPLICIT_SELECTION
PRODUCTION_OR_HIVE_MUTATION_OCCURS
```

A green test suite does not rescue a candidate that violates an authority boundary or produces a poor operator experience.

---

## 18. Explicit non-effects

HV-6 does not authorize:

- a real second venue;
- Fourth Street production mutation;
- Hive transaction/broadcast/signing changes;
- private-key handling;
- payment-authority changes;
- onboarding-authority changes outside existing authoring vocabulary;
- moderation-authority changes;
- deployment mutation;
- shared-runtime multi-tenancy;
- fleet operations;
- freeform site/page building;
- arbitrary templates/archetypes;
- gallery topology authoring;
- editor cloud storage;
- Studio SDK adoption;
- CID/IPFS publication;
- IPNS publication;
- 3Speak/SPK integration;
- Helia/OrbitDB replication;
- successor package-name cleanup.

---

## 19. Preregistration conclusion

```text
HV6_PREREGISTRATION = FROZEN_CANDIDATE_PENDING_PROJECT_LEAD_ACCEPTANCE
SELECTED_LANE = OPERATOR_VISUAL_AUTHORING_ADAPTER
CANONICAL_SOURCE_OF_TRUTH = HV5_AUTHORING_DOCUMENT
EDITOR_PROJECT_STATE_AUTHORITY = NONE
PRIMARY_EVALUATION_CANDIDATE = GRAPESJS_CORE
COMPARATOR = MINIMAL_NATIVE_EXISTING_STACK_ADAPTER
TECHNOLOGY_SELECTION = DEFERRED_TO_EVIDENCE_GATE
GRAPESJS_CORE_DEPENDENCY_SELECTED = NO
GRAPESJS_STUDIO_SDK_DEPENDENCY_SELECTED = NO
IMPLEMENTATION_AUTHORIZED = NO
NEXT_GATE = PROJECT_LEAD_HV6_PREREGISTRATION_ACCEPTANCE
```

The desired product outcome is intentionally simple to state even though the implementation discipline matters:

> A venue operator should be able to change the venue content they actually own, in context, with confidence—and the visual tool should never gain more authority than the operator already had in HV-5.
