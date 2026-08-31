# HV-7 — Juniper Works Platform Generality Repair Preregistration 0.1.0

## 1. Operation

```text
OPERATION = HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR__PREREGISTRATION
ROLE = PROJECT_LEAD_REPAIR_PROTOCOL_AND_FALSIFICATION_FREEZE
STATUS = FROZEN_PREREGISTRATION__IMPLEMENTATION_NOT_AUTHORIZED_BY_THIS_FILE

CANONICAL_CONFRONTATION_COMMIT = c360b0a3073b99af0e7a792905c30e53c3e9693d
CANONICAL_CONFRONTATION_TREE = fd53d7e9eff27bf4c3396e73a496629f04f397a1
CONFRONTATION_PATH = docs/HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION_0_1_0.md

SECOND_VENUE_NOMINEE = JUNIPER_WORKS_COOPERATIVE
SECOND_VENUE_NOMINEE_REALITY = SYNTHETIC
FROZEN_REQUIREMENT_COUNT = 24
CONFRONTATION_DISPOSITION = REQUIRES_PLATFORM_REPAIR_BEFORE_VALIDATION

IMPLEMENTATION_AUTHORIZED_BY_THIS_FILE = NO
PRODUCTION_MUTATION = NOT_AUTHORIZED
REAL_VENUE_OUTREACH = NOT_AUTHORIZED
HIVE_WRITE = NOT_AUTHORIZED
ACCOUNT_OR_COMMUNITY_CREATION = NOT_AUTHORIZED
PAYMENT_AUTHORITY_CHANGE = NOT_AUTHORIZED
SECRET_OR_KEY_CUSTODY_CHANGE = NOT_AUTHORIZED
DNS_VPS_SYSTEMD_MUTATION = NOT_AUTHORIZED
PUBLIC_PRODUCTION_AUTHORING_MOUNT = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
```

This file freezes the success/failure criteria for one bounded platform-generality repair before repair implementation begins.

It does **not** freeze one code design prematurely. The Project Lead may use normal engineering judgment inside the capability and authority boundaries below.

---

## 2. Why repair is justified

The frozen Juniper Works confrontation established a useful partial falsification rather than a wholesale architecture failure.

```text
REQUIREMENTS_PASS_EXISTING = 12
REQUIREMENTS_FAIL_REPAIR_REQUIRED = 11
REQUIREMENTS_DEPENDENT_RETEST_AFTER_REPAIR = 1

ISOLATED_RUNTIME_ARCHITECTURE_FALSIFIED = NO
SECURITY_CUSTODY_ARCHITECTURE_FALSIFIED = NO
DEPLOYMENT_PROFILE_ARCHITECTURE_FALSIFIED = NO
HIVE_SOCIAL_MODEL_FALSIFIED = NO
VENUE_CONTEXT_FOUNDATION_FALSIFIED = NO

VENUE_PACKAGE_GENERALITY_REPAIR_REQUIRED = YES
HV5_AUTHORING_OWNERSHIP_GENERALITY_REPAIR_REQUIRED = YES
HV6_VISUAL_AUTHORING_GENERALITY_REPAIR_REQUIRED = YES
VENUE_OWNED_ACCESSIBLE_THEME_REPAIR_REQUIRED = YES
PUBLIC_COMPATIBILITY_LEAKAGE_REPAIR_REQUIRED = YES
```

The repair is therefore narrowly targeted at capabilities that a credible second venue nominee exposed naturally:

1. routine structured venue information that changes more often than static prose;
2. safe ordinary-steward lifecycle authority over those admitted structures;
3. visual authoring controls for that authority;
4. independent bounded venue visual identity;
5. removal of candidate-facing predecessor-product identity leakage.

The repair is **not** authorization to turn Hive-Venues into an arbitrary CMS, ERP, booking suite, CRM, IoT system, or shared multi-tenant platform.

---

## 3. Controlling scientific/product rule

The Juniper requirements remain frozen.

```text
DESIGN_A_COHERENT_VENUE_ON_ITS_OWN_TERMS
-> FREEZE_ITS_AUTHENTIC_REQUIREMENTS
-> CONFRONT_THE_EXISTING_ARCHITECTURE_WITH_THOSE_REQUIREMENTS
-> REPAIR_ONLY_THE_DEMONSTRATED_GENERALITY_GAPS
-> RERUN_THE_FROZEN_REQUIREMENTS
```

Forbidden:

```text
REWRITE_JUNIPER_REQUIREMENTS_TO_FIT_SCHEMA = YES
FLATTEN_STRUCTURED_REQUIREMENT_TO_PROSE = YES
INVENT_JUNIPER_SPECIFIC_PLATFORM_FORK = YES
WEAKEN_HV5_PROTECTION_TO_MAKE_TEST_PASS = YES
CLAIM_SYNTHETIC_EVIDENCE_IS_REAL_CLIENT_EVIDENCE = YES
```

Any implementation that obtains a nominal pass by doing one of those things fails this preregistration.

---

## 4. Backward-compatibility freeze

The accepted Fourth Street and Lantern Room evidence is not disposable scaffolding.

The repair must preserve the validity and semantics of the accepted existing schema-v1 proof documents and their existing public behaviors unless a separately justified migration is introduced with backward-compatible loading.

At minimum:

```text
FOURTH_STREET_V1_AUTHORING_DOCUMENT_REMAINS_VALID = REQUIRED
LANTERN_ROOM_V1_AUTHORING_DOCUMENT_REMAINS_VALID = REQUIRED
FOURTH_STREET_REFERENCE_PACKAGE_REMAINS_VALID = REQUIRED
LANTERN_ROOM_REFERENCE_PACKAGE_REMAINS_VALID = REQUIRED
HV4_EXISTING_BOOTSTRAP_PROOFS_REMAIN_VALID = REQUIRED
HV5_EXISTING_OWNERSHIP_NEGATIVE_MATRIX_REMAINS_VALID = REQUIRED
HV6_EXISTING_LEAF_AUTHORING_PROOFS_REMAIN_VALID = REQUIRED
```

The Project Lead may choose an additive schema evolution, a new package/document schema version with explicit backward-compatible acceptance, or another clean mechanism.

What is forbidden is silently redefining old schema-v1 meaning or modifying historical proof fixtures merely because the new capability is easier to demonstrate that way.

---

## 5. Repair Capability A — structured repeatable venue information

Hive-Venues must gain a bounded typed representation capable of satisfying Juniper's frozen **Upcoming at the Workshop** and **Equipment Status** requirements without prose flattening.

### 5.1 Program semantics

The repair must be able to represent 0–12 future program items, each with at least:

```text
stable item identity
public title
start date/time
end date/time or duration
short description
public access/audience note
state = scheduled | full | cancelled
optional credential-free HTTPS registration/information link
```

Required behavior:

- item identity must not depend solely on current array index;
- scheduled public presentation defaults to chronological ordering;
- `full` and `cancelled` must be semantically explicit and not color-only;
- zero items is valid;
- the model must not invent booking/reservation authority.

The Juniper state values are product vocabulary for this collection. They do not create a platform-wide venue taxonomy.

### 5.2 Equipment-status semantics

The repair must be able to represent 0–20 advisory public equipment items, each with at least:

```text
stable item identity
public equipment name
state = available | limited | maintenance | offline
short advisory note
orientation/access note
last-updated value
```

Required behavior:

- stable identity independent of array index;
- advisory states are explicit and not color-only;
- zero items is valid;
- no telemetry, machine interlock, access-control, or safety-certification authority is implied.

### 5.3 Generality boundary

The implementation may create reusable collection/domain primitives when they genuinely improve the platform, but it may not infer an exhaustive venue-type taxonomy from Juniper.

A general solution may know about semantic collection kinds such as programs and advisory equipment status if those are deliberate product capabilities. It must not require `venueType = workshop` or `if (venue.id === 'juniper-works')`.

---

## 6. Repair Capability B — safe HV-5 collection lifecycle authority

The accepted HV-5 security/authority model remains controlling.

The repair must add an explicit bounded ordinary-operator authority model for admitted repeatable collections rather than granting generic container replacement.

### 6.1 Required ordinary-steward jobs

Programs must support, as frozen:

```text
create
edit operator-owned fields
cancel
restore public state
remove/archive obsolete item
```

Equipment status must support, as frozen:

```text
create
edit operator-owned fields
retire/remove stale item
order/group the public list when useful
```

The exact operation API is an implementation choice, but the authority must be expressible independently of array index and must be validated against the canonical document model.

### 6.2 Authority properties that must survive

```text
INTEGRATION_OWNED_IDENTITY = PROTECTED
HIVE_BINDINGS = PROTECTED
PAYMENT_MERCHANT_AUTHORITY = SECURITY_PRIVILEGED
DEPLOYMENT_IDENTITY = PROTECTED
DERIVED_FIELDS = NOT_ORDINARY_OPERATOR_AUTHORITY
SECRETS_PRIVATE_MATERIAL = FORBIDDEN
UNKNOWN_PATHS_OR_OPERATIONS = FAIL_CLOSED
ACCEPTED_DOCUMENT_MUTATION = ATOMIC
CANONICAL_SERIALIZATION = DETERMINISTIC
```

### 6.3 Forbidden shortcut

This is specifically forbidden:

```text
ALL_PARENT_CONTAINERS_OR_ARRAYS = OPERATOR_AUTHORED
```

The existing fixed-gallery topology protection is a valid fail-closed safety property. The repair must add safe collection lifecycle authority without erasing that distinction.

A generic raw JSON replacement endpoint is not acceptable ordinary-steward authority.

---

## 7. Repair Capability C — HV-6 typed collection authoring

The native existing-stack adapter remains selected unless the repair proves it fundamentally inadequate. No such evidence currently exists.

The visual repair must remain subordinate to HV-5.

Required flow:

```text
ACCEPTED_CANONICAL_DOCUMENT
-> HV5_DERIVED_VISUAL_AUTHORITY
-> TYPED_OPERATOR_INTERACTION
-> PROPOSED_CANONICAL_DOCUMENT
-> HV5_VALIDATION_AND_AUTHORITY_GATE
-> ACCEPTED_CANONICAL_DOCUMENT
```

For programs and equipment status, the visual surface must provide meaningful ordinary-steward controls for the frozen lifecycle jobs.

Required properties:

```text
NO_RAW_JSON_REQUIRED_FOR_ORDINARY_STEWARD
NO_ARBITRARY_HTML_SCRIPT_COMPONENT_AUTHORITY
NO_SHADOW_CANONICAL_EDITOR_MODEL
TRUTHFUL_PREVIEW_FROM_PROPOSED_CANONICAL_STATE
APPLY_ATOMIC_THROUGH_HV5
DISCARD_RESTORES_ACCEPTED_STATE
FAILED_EDIT_DOES_NOT_REPLACE_ACCEPTED_STATE
FAILED_APPLY_DOES_NOT_REPLACE_ACCEPTED_STATE
STABLE_ITEM_IDENTITY_SURVIVES_EDIT_REORDER
```

The visual adapter may add purpose-built collection controls, item editors, state selectors, date/time controls, ordering controls, or equivalent UI as engineering judgment dictates.

---

## 8. Repair Capability D — venue-owned accessible theme

Juniper must be able to present a meaningfully independent visual identity beyond name/logo/copy/images.

The repair must add a bounded venue-owned theme surface under the canonical venue package/authoring model.

### 8.1 Minimum semantic capability

The exact theme schema is not frozen, but it must be sufficient to demonstrate a recognizably independent venue presentation using validated design tokens rather than arbitrary CSS.

Likely useful token classes may include a bounded subset of:

```text
canvas/background
surface
border
text
muted text
accent
accent interaction state
status semantics where appropriate
```

The implementation does not need to expose every existing internal token.

### 8.2 Safety/accessibility boundary

Forbidden ordinary-venue theme authority:

```text
ARBITRARY_CSS
ARBITRARY_STYLE_TAGS
ARBITRARY_SCRIPT
ARBITRARY_DOM_OR_COMPONENT_TREE
UNVALIDATED_EXTERNAL_STYLESHEET
```

The chosen theme mechanism must be validated for required contrast pairs and must not make color the sole carrier of program/equipment state.

The repair may reuse existing generic `--venue-*` presentation tokens internally. Internal `--hb-*`, `bar-gold`, or other lineage-bearing implementation names are not independently blocking if they do not leak candidate-facing identity or semantic authority.

---

## 9. Repair Capability E — public successor identity leakage removal

The confrontation found a real compatibility leakage defect: candidate-facing shared surfaces still visibly identify the product as `Hive-Bar`.

The repair must remove predecessor-product identity from generic candidate-facing output, including at minimum the currently demonstrated shared header and onboarding explanatory copy.

Acceptable public identity should use the venue/site identity and/or successor platform identity (`Hive-Venues`) according to context.

This repair must **not** mechanically rename legitimate Fourth Street production compatibility facts such as:

```text
/opt/hive-bar
hive-bar.service
.hive-bar-commit
.hive-bar-tree
historical Fourth Street Hive application tag
other provenance-bearing Fourth Street production paths
```

Likewise, internal compatibility aliases such as `officialBarAccount`, internal CSS/class/data names, or implementation variable names are not required to change merely for cosmetic purity unless they leak into public semantics or create a real correctness hazard.

---

## 10. Juniper synthetic proof fixture

The repair qualification may create source-controlled, secret-free synthetic Juniper fixtures needed to exercise the frozen product.

Allowed fixture facts include the already frozen synthetic values:

```text
DISPLAY_NAME = Juniper Works Cooperative
ADDRESS = 240 Juniper Works Way, Reno, NV 89502
PHONE = (555) 010-2746
HOURS = Tue–Fri 2:00 p.m.–9:00 p.m.; Sat–Sun 10:00 a.m.–6:00 p.m.; Mon closed
WEBSITE = https://juniper-works.example/
MAP_LINK = https://juniper-works.example/visit
COMMUNITY_ID = hive-742913
OFFICIAL_ACCOUNT = juniperworks
THREADS_CONTAINER_ACCOUNT = juniper.threads
PAYMENT_MERCHANT_ACCOUNTS = EMPTY
```

The implementation may add synthetic local media files or metadata when needed for rendered proof, but no real venue asset may be copied merely because it is publicly visible.

All such data remains fixture evidence. It must never be represented as a real Hive account/community, real deployment, real DNS name, or real client adoption.

---

## 11. Required repair tests

The repair candidate is not qualified merely because new code compiles.

### 11.1 Backward-compatibility tests

Required:

- existing Fourth Street package/context/authoring/bootstrap proofs pass unchanged in semantics;
- existing Lantern Room package/context/authoring/bootstrap proofs pass unchanged in semantics;
- existing HV-5 negative authority matrix still rejects integration/Hive/payment/deployment/derived/unknown mutations;
- existing HV-6 leaf editing, preview, Apply, Discard, rejection, and direct-source independence still pass;
- existing Fourth Street production compatibility identities remain exactly preserved where operationally required.

### 11.2 Program model tests

At minimum prove:

- valid 0-item state;
- valid bounded populated state;
- max cardinality enforced;
- stable unique item IDs required;
- malformed/duplicate IDs rejected;
- typed time/state/link validation;
- chronological default public ordering;
- cancelled/full state semantic rendering;
- create/edit/cancel/restore/remove/archive ordinary-steward path;
- protected/unknown lifecycle operations fail closed;
- accepted base unchanged after rejected operation.

### 11.3 Equipment-status model tests

At minimum prove:

- valid 0-item state;
- bounded populated state;
- max cardinality enforced;
- stable unique item IDs required;
- allowed state validation;
- required advisory/access/last-updated semantics;
- create/edit/retire/remove/order/group ordinary-steward path as implemented;
- invalid/protected operations fail closed;
- accepted base unchanged after rejection.

### 11.4 Canonical authoring tests

Required:

- deterministic canonical serialization;
- insertion-order independence where applicable;
- LF terminal newline on canonical text output;
- stable identity semantics survive reorder;
- no secret/private material admitted;
- direct-source validation/serialization path remains available without the visual adapter.

### 11.5 HV-6 visual-authoring tests

Required:

- visual controls derive from HV-5-authorized operations/fields;
- ordinary steward can perform frozen program lifecycle without raw JSON;
- ordinary steward can perform frozen equipment lifecycle without raw JSON;
- theme controls expose only admitted venue-owned tokens;
- preview renders proposed state through the real application renderer;
- Apply persists only a valid authorized canonical proposal;
- Discard restores accepted state;
- invalid edit/apply leaves accepted state unchanged;
- no raw whole-document, arbitrary array replacement, arbitrary CSS, arbitrary HTML/script, or component-tree channel appears.

### 11.6 Public-rendering tests

Juniper must render through the shared generic application path with:

- its own name/logo/copy/media/vocabulary;
- clear first-visit/orientation information;
- structured upcoming programs;
- structured advisory equipment status;
- valid empty states;
- honest unavailable states if the chosen architecture has a fallible provider boundary;
- independent accessible theme;
- payment navigation absent/disabled as appropriate;
- existing Hive community/social affordances;
- no Fourth Street venue identity;
- no public `Hive-Bar` predecessor-product identity;
- no `bar`, `beer`, `bartender`, or `patron` venue semantics unless appearing only in an explicitly historical/developer-only evidence surface.

### 11.7 Accessibility/responsive tests

The previously dependent `JW-R021` becomes blocking in repair qualification.

Required new/extended evidence must cover:

- keyboard reachability and meaningful control names for collection lifecycle controls;
- screen-reader semantics for item states and actions;
- program/equipment state not conveyed by color alone;
- contrast validation for the Juniper theme and required interaction/status pairs;
- practical narrow-screen behavior including at least the existing 360-CSS-pixel contract;
- focus-visible behavior;
- reduced-motion compatibility where motion exists;
- rendered proof for Juniper public and visual-authoring surfaces.

### 11.8 Security/source tests

Required:

- no server private-key or Hive-broadcast implementation introduced;
- no external-effect code path is activated merely for the synthetic fixture;
- no secret-bearing authoring state;
- payment remains disabled for Juniper fixture;
- no production authoring mount;
- no shared-runtime tenancy;
- no Juniper-specific generic source fork.

---

## 12. Requirement rerun

The repair is not accepted until all 24 frozen Juniper requirements are rerun against the repaired candidate.

Success requires:

```text
JW_R001 = PASS
JW_R002 = PASS
JW_R003 = PASS
JW_R004 = PASS
JW_R005 = PASS
JW_R006 = PASS
JW_R007 = PASS
JW_R008 = PASS
JW_R009 = PASS
JW_R010 = PASS
JW_R011 = PASS
JW_R012 = PASS
JW_R013 = PASS
JW_R014 = PASS
JW_R015 = PASS
JW_R016 = PASS
JW_R017 = PASS
JW_R018 = PASS
JW_R019 = PASS
JW_R020 = PASS
JW_R021 = PASS
JW_R022 = PASS
JW_R023 = PASS
JW_R024 = PASS
```

A requirement may not be marked PASS by changing its frozen meaning.

If a repair exposes a new authentic contradiction between Juniper and the platform, record the contradiction and fail the affected requirement rather than adding a fixture-specific exception.

---

## 13. Deterministic qualification gates

A repair candidate must pass at minimum:

```text
LOCKED_DEPENDENCY_INSTALL = PASS
DETERMINISTIC_QUALITY_GATE_UBUNTU = PASS
DETERMINISTIC_QUALITY_GATE_WINDOWS = PASS
SECRET_SCAN = PASS
PRODUCTION_DEPENDENCY_AUDIT = PASS
RENDERED_UI_UX_QUALIFICATION = PASS
LIVE_HIVE_SMOKE = NOT_REQUIRED_FOR_SYNTHETIC_TIER_A
```

The changed-path classifier should require rendered evidence because the expected repair touches venue product presentation and visual authoring.

If the classifier unexpectedly skips rendered qualification despite presentation/CSS/EJS/visual-authoring changes, that is itself a qualification defect to repair before acceptance.

No network call to validate Juniper's synthetic Hive-shaped identities is required or desired.

---

## 14. Stop conditions

Stop the bounded repair and return for a new Project Lead architecture decision if any of the following becomes necessary:

```text
SHARED_RUNTIME_MULTI_TENANCY_REQUIRED
CROSS_VENUE_MUTABLE_STATE_REQUIRED
SERVER_HELD_HIVE_PRIVATE_KEYS_REQUIRED
SERVER_SIDE_HIVE_BROADCAST_AUTHORITY_REQUIRED
NEW_PAYMENT_AUTHORITY_MODEL_REQUIRED
GENERIC_ARBITRARY_CMS_SCHEMA_BUILDER_REQUIRED
ARBITRARY_OPERATOR_CONTAINER_REPLACEMENT_REQUIRED
ARBITRARY_OPERATOR_CSS_SCRIPT_AUTHORITY_REQUIRED
JUNIPER_SPECIFIC_GENERIC_SOURCE_FORK_REQUIRED
MANDATORY_VENUE_TYPE_ENUM_REQUIRED
FROZEN_JUNIPER_REQUIREMENT_MUST_BE_WEAKENED_TO_PASS
FOURTH_STREET_OR_LANTERN_V1_PROOF_MUST_BE_BROKEN_WITHOUT_BACKWARD_COMPATIBILITY
```

These conditions mean the repair is no longer the bounded operation preregistered here.

---

## 15. Non-goals

The repair must not implement or pretend to validate:

```text
PHYSICAL_ACCESS_CONTROL
MACHINE_INTERLOCKS
TRAINING_CERTIFICATION
WAIVER_STORAGE
IOT_OR_MACHINE_TELEMETRY
RESERVATION_OR_BOOKING_ENGINE
MEMBERSHIP_BILLING
CLASS_PAYMENT_PROCESSING
PRIVATE_MEMBER_CRM
ERP
STAFF_SCHEDULING
POINT_OF_SALE
REAL_HIVE_ACCOUNT_OR_COMMUNITY_CREATION
REAL_DNS_VPS_TLS_OR_SYSTEMD
REAL_OPERATOR_USABILITY
REAL_VENUE_ADMISSION
PRODUCTION_AUTHORING
FLEET_OPERATIONS
HELIA_ORBITDB_REPLICATION
SHARED_RUNTIME_MULTI_TENANCY
```

---

## 16. Evidence ceiling

Even a fully successful repair and Juniper rerun can establish at most:

```text
JUNIPER_WORKS = VALIDATED_SYNTHETIC_SECOND_VENUE_NOMINEE
EVIDENCE_TIER = TIER_A_PRODUCT_AND_ARCHITECTURE
PLATFORM = VALIDATED_AGAINST_TWO_SERIOUS_VENUE_NOMINEES__ONE_REAL_REFERENCE_PLUS_ONE_SYNTHETIC
```

It cannot establish:

```text
SECOND_REAL_CLIENT
REAL_OPERATOR_USABILITY
REAL_VENUE_PERMISSION_OR_ADMISSION
REAL_HIVE_BINDING_READINESS
REAL_DEPLOYMENT_READINESS
UNIVERSAL_VENUE_TYPE_COVERAGE
SHARED_RUNTIME_MULTI_TENANCY_JUSTIFICATION
```

Fourth Street remains the first and currently sole real client.

---

## 17. Implementation-design freedom

Within the frozen capability and test boundaries, the later authorized implementation may use normal Project Lead engineering judgment.

Examples of open choices include:

- schema-v1 additive extension versus explicit newer package/document schema with backward-compatible loading;
- exact stable-ID syntax;
- internal canonical collection representation;
- whether archive is a state transition or bounded removal operation;
- exact visual collection-editor interaction pattern;
- exact date/time input presentation;
- exact bounded theme token set;
- exact home placement/order for programs and equipment status;
- whether the two structured domains share reusable internal helpers.

Those choices are intentionally not preregistered unless they affect the frozen product or authority claims.

---

## 18. Next operation after Project Lead acceptance of this preregistration

```text
NEXT_OPERATION = HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR__IMPLEMENTATION_AUTHORIZATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED_UNTIL_THAT_BOUNDARY_IS_EXPLICITLY_CROSSED
```

The implementation authorization should be **minimal**: it should bind the accepted preregistration and authorize only the offline/source repair needed to execute it. It must not re-litigate the product requirements or create unnecessary process layers.
