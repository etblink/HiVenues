# HV-6 Operator Visual Authoring Adapter Foundation — Preregistration Acceptance 0.1.0

## Status

```text
OPERATION = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION_ACCEPTANCE
ROLE = PROJECT_LEAD_INDEPENDENT_REVIEW_AND_ACCEPTANCE
REPOSITORY = etblink/Hive-Venues

PREREGISTRATION_COMMIT = 8556cf0c2d85d7f8a35175250e11fa9881354f2f
PREREGISTRATION_TREE = aee06d529aa2708d4fa1d62aa1fdc70a4a4118a0
PREREGISTRATION_PATH = docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION_0_1_0.md
PREREGISTRATION_BLOB = 640fb2be5b2ed4eda28fa3c12ccf26ca30c85e1f
QUALIFICATION_PR = 46
QUALIFICATION_CI_RUN = 33345831930

PROJECT_LEAD_PREREGISTRATION_REVIEW = PASS
HV6_PREREGISTRATION = ACCEPTED
IMPLEMENTATION_AUTHORIZED = NO
TECHNOLOGY_SELECTED = NO
GRAPESJS_CORE_DEPENDENCY_SELECTED = NO
GRAPESJS_STUDIO_SDK_DEPENDENCY_SELECTED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
REAL_SECOND_VENUE_AUTHORIZED = NO

NEXT_OPERATION = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_IMPLEMENTATION_AUTHORIZATION
```

This record accepts the prospective HV-6 contract after independent Project Lead review. It does not authorize implementation and does not select an editor technology.

## 1. Qualification evidence

The exact preregistration candidate was qualified as one changed documentation path.

```text
CLASSIFIER = PASS
UBUNTU_DETERMINISTIC = PASS
WINDOWS_DETERMINISTIC = PASS
UBUNTU_TESTS = 568_PASS__0_FAIL
PRODUCTION_AUDIT = 0_VULNERABILITIES
RENDERED = SKIPPED_BY_SCOPE
LIVE_HIVE = SKIPPED_BY_SCOPE
```

The qualified PR head tree and GitHub synthetic merge tree were both:

```text
TREE = aee06d529aa2708d4fa1d62aa1fdc70a4a4118a0
```

Canonical `main` was independently rechecked immediately before transfer and still equaled the exact preregistration parent:

```text
PARENT = eef5c6b8de9be3307fda4c4c9e21288b0fb46f98
```

The exact qualified preregistration commit was then fast-forwarded to `main`; PR #46 subsequently recorded the exact head SHA as the merged commit rather than introducing a synthetic merge commit.

## 2. Independent Project Lead findings

### 2.1 The product question is correctly framed

HV-6 does not ask whether Hive-Venues can embed a generic website builder. It asks whether an ordinary venue operator can safely edit the public venue expression that HV-5 already classifies as operator-owned while retaining useful visual context.

That is the correct next product question because it tests whether the accepted domain abstraction is usable rather than merely structurally correct.

### 2.2 Canonical authority remains unambiguous

The preregistration preserves the accepted authority flow:

```text
ACCEPTED_HV5_DOCUMENT
-> VISUAL_ADAPTER_PROJECTION
-> OPERATOR_INTERACTION
-> PROPOSED_HV5_DOCUMENT
-> applyOrdinaryOperatorEdit(base, proposed)
-> ACCEPTED_HV5_DOCUMENT
-> CANONICAL_SERIALIZATION
```

It explicitly rejects editor project JSON, component trees, exported HTML/CSS, autosave, or front-end visibility rules as replacement authorities.

This is the controlling architectural condition for acceptance.

### 2.3 The ordinary-edit surface matches the accepted HV-5 model

The preregistration derives operator controls from fields already classified `OPERATOR_AUTHORED` and keeps mixed containers, array topology, derived dimensions, integration identity, deployment identity, Hive routing, payment authority, and security-sensitive state outside ordinary edit authority.

The visual adapter therefore remains subordinate to the existing domain gate instead of creating a second permission model.

### 2.4 The technology gate is evidence-based

The preregistration correctly compares:

```text
A = GRAPESJS_CORE_ADAPTER
B = MINIMAL_NATIVE_EXISTING_STACK_ADAPTER
```

without selecting either in advance.

Current GrapesJS Core evidence is sufficient to justify a bounded candidate evaluation: Core is actively maintained, permissively licensed, supports custom components and typed traits, and allows its storage manager to be disabled.

The same evidence also justifies the preregistered restrictions: normal GrapesJS persistence treats project JSON as editor state suitable for reload, and Core supports executable component scripts and generic page-builder capabilities that Hive-Venues must not grant to ordinary operators.

A dependency is therefore justified only if the constrained adapter produces a material operator-usability advantage over the native baseline.

### 2.5 The falsification gates are meaningful

HV-6 requires evidence that can actually reject an implementation, including:

- byte-identical no-op canonical round trip;
- allowed-edit round trip through the authoritative HV-5 gate;
- editor destruction and reload from accepted HV-5 state without hidden persistence;
- protected-field negative tests;
- arbitrary HTML/script/structure rejection;
- truthful preview derived from proposed HV-5 semantics rather than editor export;
- Fourth Street compatibility proof;
- Lantern Room non-bar venue-neutrality proof;
- direct-source independence;
- accessibility, keyboard, and responsive qualification.

These are strong enough to distinguish a merely attractive prototype from a correct product foundation.

### 2.6 The preregistration is intentionally not more prescriptive

Further freezing of layout, component architecture, control placement, framework integration, or exact prototype structure before implementation evidence would begin to pre-decide the experiment.

The accepted contract specifies the user outcome, canonical authority, prohibited escalation, evaluation criteria, and qualification evidence while leaving implementation design freedom where comparative evidence should decide.

This is the appropriate precision boundary.

## 3. Accepted non-effects

Acceptance of the preregistration does not authorize or imply:

```text
PRODUCTION_EDITOR_DEPLOYMENT
FOURTH_STREET_PRODUCTION_MUTATION
A_REAL_SECOND_VENUE
SHARED_RUNTIME_MULTI_TENANCY
HIVE_AUTHORITY_CHANGES
PAYMENT_AUTHORITY_CHANGES
PRIVATE_KEY_CUSTODY
SECRET_STORAGE_OR_ROTATION
ARBITRARY_HTML_OR_SCRIPT_AUTHORITY
GRAPESJS_PROJECT_JSON_AS_CANONICAL_STATE
GRAPESJS_STUDIO_SDK
CLOUD_EDITOR_STORAGE
IPFS_PUBLICATION
IPNS_MUTATION
3SPEAK_OR_SPK_INTEGRATION
HELIA_OR_ORBITDB
FLEET_ORCHESTRATION
```

The existing one-isolated-venue-per-runtime default remains unchanged.

## 4. Recommended shape of the next authorization

This section records Project Lead routing guidance only. It is not implementation authorization.

The next bounded authorization should permit enough implementation to compare the two preregistered candidates against the same evidence without prematurely selecting a winner.

Recommended shape:

```text
AUTHORIZATION_MODE = BOUNDED_OFFLINE_DUAL_CANDIDATE_PROTOTYPE_AND_EVALUATION
CANDIDATE_A = GRAPESJS_CORE_ADAPTER
CANDIDATE_B = MINIMAL_NATIVE_EXISTING_STACK_ADAPTER
PRODUCTION_MUTATION = NO
REAL_VENUE_ADMISSION = NO
TECHNOLOGY_WINNER_PRESELECTED = NO
```

A GrapesJS candidate may require a separately pinned Core dependency in the implementation candidate. Such a dependency is permitted only by the later implementation authorization and must not imply Studio SDK, cloud storage, editor persistence authority, or production activation.

The implementation should prefer a **thin vertical slice** for each candidate over building two full editors. Each slice should be sufficient to test the hard questions:

1. projection from accepted HV-5 state;
2. discovery/editing of representative operator-owned fields;
3. faithful proposed-state preview;
4. apply/discard semantics;
5. no-op and allowed-edit round trips;
6. protected-state rejection;
7. reload without hidden editor persistence;
8. keyboard/accessibility and responsive viability;
9. Fourth Street and Lantern Room behavior;
10. comparative implementation/maintenance burden.

The technology decision should follow qualified evidence from those slices. If one candidate clearly fails a hard boundary early, implementation need not continue merely to preserve symmetry.

## 5. Acceptance conclusion

```text
HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION = ACCEPTED
PROJECT_LEAD_FINDING = PROSPECTIVE_CONTRACT_IS_SOUND_AND_PROPORTIONATE
TECHNOLOGY_SELECTION = DEFER_TO_IMPLEMENTATION_EVIDENCE
IMPLEMENTATION_AUTHORIZED = NO
NEXT_OPERATION = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_IMPLEMENTATION_AUTHORIZATION
```

The project should proceed to a separate bounded implementation authorization. That authorization should advance the product, not reopen the accepted HV-6 question or add governance for its own sake.
