# Post-HV-5 Sequencing Decision 0.1.0

## Status

```text
OPERATION = POST_HV5_SEQUENCING_DECISION
STATUS = FROZEN_PROJECT_LEAD_SEQUENCING_DECISION
REPOSITORY = etblink/Hive-Venues
CANONICAL_DECISION_BASE_COMMIT = 2f85fab09de5c48ef5ed2c6a774922d2f8583c03
CANONICAL_DECISION_BASE_TREE = e70bd0a514d6668d4805b4fb777e3aebc042674b

SELECTED_NEXT_LANE = OPERATOR_VISUAL_AUTHORING_ADAPTER
PROPOSED_MILESTONE = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION
NEXT_OPERATION = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED

GRAPESJS_CORE = PRIMARY_EVALUATION_CANDIDATE__NOT_SELECTED_DEPENDENCY
GRAPESJS_STUDIO_SDK = SECONDARY_REFERENCE__NOT_SELECTED_DEPENDENCY
REAL_SECOND_VENUE = HIGH_PRIORITY_AFTER_OR_DURING_REASSESSMENT__NOT_AUTHORIZED
CID_PUBLICATION = ELIGIBLE_DOWNSTREAM__NOT_SELECTED
THREESPEAK_SPK_MEDIA = ELIGIBLE_DOWNSTREAM__NOT_SELECTED
SUCCESSOR_PACKAGE_IDENTITY_CLEANUP = ELIGIBLE_ADJACENT_MAINTENANCE__NOT_SELECTED
FLEET_OPERATIONS = DEFERRED
HELIA_ORBITDB_REPLICATION = DEFERRED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
```

This is a read-only Project Lead sequencing decision after canonical HV-5 acceptance and neutral post-HV-5 living-state reconciliation.

It selects the next lane and proposed milestone only. It does not authorize implementation, add a dependency, admit a real venue, mutate production, publish content, create infrastructure, or change any accepted authority boundary.

## 1. Decision question

At the accepted HV-5 boundary, which next operation provides the greatest combination of:

1. product leverage for ordinary venue operators;
2. information gain about whether the accepted platform abstractions are usable rather than merely correct;
3. reversibility and bounded failure cost;
4. maturity of prerequisites already established by HV-1 through HV-5;
5. preservation of the accepted authority/security model;
6. usefulness as preparation for a later real second-venue falsification test?

The answer is a bounded **operator visual authoring adapter foundation**.

## 2. Accepted prerequisites now available

HV-1 through HV-5 establish:

```text
VENUE_CONTEXT_AUTHORITY
+
VENUE_PACKAGE_AUTHORITY
+
DEPLOYMENT_PROFILE_AUTHORITY
+
HV4_BOOTSTRAP_AND_THREE_WAY_BINDING
+
HV5_CANONICAL_AUTHORING_DOCUMENT
+
HV5_EXECUTABLE_OWNERSHIP_POLICY
+
HV5_ORDINARY_OPERATOR_EDIT_GATE
+
DIRECT_SOURCE_CODE_AUTHORING_ESCAPE_HATCH
```

This is the first project state in which a visual authoring surface can be evaluated without allowing the editor to define the domain model.

The selected dependency direction is therefore:

```text
HV5_CANONICAL_AUTHORING_DOCUMENT
    -> VISUAL_ADAPTER
    -> PROPOSED_OPERATOR_EDIT
    -> HV5_ORDINARY_OPERATOR_EDIT_GATE
    -> VALIDATED_CANONICAL_AUTHORING_DOCUMENT
```

and never:

```text
EDITOR_INTERNAL_PROJECT_MODEL
    -> BECOMES_HIVE_VENUES_SOURCE_OF_TRUTH
```

## 3. Candidate comparison

Scoring is ordinal, 1–5, against the current boundary rather than a claim of universal product value.

Weights:

```text
INFORMATION_GAIN = 30%
PRODUCT_LEVERAGE = 25%
REVERSIBILITY = 15%
PREREQUISITE_MATURITY = 15%
AUTHORITY_AND_OPERATIONAL_SAFETY = 15%
```

| Candidate lane | Information gain | Product leverage | Reversibility | Prerequisite maturity | Safety | Weighted result |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Operator visual authoring adapter | 4 | 5 | 5 | 5 | 4 | **4.55** |
| Real isolated second-venue pilot | 5 | 5 | 3 | 2 | 3 | **3.95** |
| Deterministic CID/IPFS publication | 3 | 3 | 5 | 4 | 4 | **3.60** |
| 3Speak/SPK media integration | 3 | 4 | 4 | 3 | 3 | **3.40** |
| Successor package/developer identity cleanup | 2 | 2 | 5 | 5 | 5 | **3.35** |
| Fleet operations | 2 | 3 | 3 | 1 | 2 | **2.25** |
| Shared-runtime multi-tenancy | 2 | 4 | 1 | 1 | 1 | **2.05** |
| Helia/OrbitDB replicated mutable state | 1 | 2 | 2 | 1 | 2 | **1.55** |

The numeric result is a transparent decision aid, not an empirical measurement.

## 4. Why the visual-authoring lane wins now

### 4.1 It exercises the newly accepted HV-5 contract directly

HV-5 is not merely a schema. Its central claim is that routine venue expression can be separated from integration, deployment, derived, and privileged authority.

A visual adapter tests that claim in the most operationally relevant way: can an ordinary operator edit only what they own, receive a useful preview, and produce exactly the same canonical validated document that a technical operator can edit directly?

A failure is informative. If the ownership contract cannot support a usable visual workflow without hidden editor state or privileged escape hatches, the project should learn that before onboarding another real venue.

### 4.2 It is reversible and fully offline-testable

The lane can be proven against the accepted Fourth Street and Lantern Room fixtures without:

- admitting a real venue;
- changing production;
- changing Hive authorities;
- handling private keys;
- publishing content;
- provisioning infrastructure;
- creating shared tenancy.

A failed editor technology can be removed without changing the canonical authoring format.

### 4.3 It prepares the real pilot rather than postponing it indefinitely

A real second venue remains the strongest direct falsification test of venue neutrality and isolated deployment readiness.

However, no concrete independently branded real pilot is currently bound to the project. Selecting a generic "pilot" milestone without a pilot would risk building speculative onboarding/operations around an unknown operator.

The visual-authoring adapter is therefore one bounded gate before the real-pilot decision. If a suitable real pilot becomes concretely available earlier, the Project Lead may explicitly re-adjudicate sequencing rather than pretending this decision granted pilot authority.

### 4.4 It advances the intended ordinary-operator experience without sacrificing source access

The target is no-code/low-code authoring for ordinary operators while retaining the direct JSON/source path for technical operators.

The visual layer must therefore be optional and removable. The canonical authoring document must remain inspectable and editable without the visual tool.

## 5. Current external technology evidence

External research was refreshed on 2026-08-30 only to assess feasibility and current tooling. It does not authorize a dependency.

### 5.1 GrapesJS Core

Current GrapesJS documentation describes the project as a multi-purpose Web Builder Framework intended for embedding builders inside applications/CMS environments. Its current API supports custom components, traits, plugins, editor events, manual project loading, and disabling the built-in Storage Manager.

Current upstream release evidence identifies GrapesJS Core v0.23.3 as the latest release in the observed release list. The core repository is distributed under the BSD 3-Clause license.

Relevant upstream references:

- https://grapesjs.com/docs/
- https://grapesjs.com/docs/modules/Components.html
- https://grapesjs.com/docs/modules/Traits.html
- https://grapesjs.com/docs/modules/Storage.html
- https://github.com/GrapesJS/grapesjs/releases
- https://github.com/GrapesJS/grapesjs/blob/dev/packages/core/LICENSE

This makes GrapesJS Core a credible **primary evaluation candidate**, not a selected dependency.

### 5.2 GrapesJS persistence risk

The Storage Manager documentation explicitly treats GrapesJS project JSON as the data needed to correctly reload a GrapesJS project. That is normal for GrapesJS, but it conflicts with Hive-Venues if persisted as an independent authoritative model.

Therefore HV-6 must either:

1. keep editor project state transient and deterministically rehydrate it from HV-5 canonical authoring state; or
2. prove a lossless, deterministic adapter format that is strictly derived from and disposable relative to the HV-5 source of truth.

The editor's own storage model may not become the canonical Hive-Venues document.

### 5.3 GrapesJS Studio SDK

The Studio SDK provides a more polished embeddable drag-and-drop product, but current official documentation requires an SDK license for public-domain deployment while permitting local use without that public-domain license.

References:

- https://app.grapesjs.com/docs-sdk/overview/getting-started
- https://app.grapesjs.com/docs-sdk/overview/licenses

Accordingly:

```text
GRAPESJS_STUDIO_SDK = SECONDARY_REFERENCE__NOT_SELECTED_DEPENDENCY
```

HV-6 must not silently introduce a public-deployment licensing commitment.

### 5.4 IPFS/CID remains viable but downstream

Current IPFS documentation continues to define CIDs as immutable content addresses derived from content and IPNS as a mutable signed name/pointer over content paths. It also warns that identical file bytes can produce different UnixFS CIDs when ingestion/DAG parameters differ, so a later deterministic publication milestone must freeze the artifact and CID-construction profile.

References:

- https://docs.ipfs.tech/concepts/content-addressing/
- https://docs.ipfs.tech/concepts/ipns/
- https://docs.ipfs.tech/how-to/content-addressing-data-sets/

This supports the already preferred hybrid provenance model but does not outrank operator authoring at this boundary.

### 5.5 3Speak/SPK remains viable but downstream

SPK Network currently describes community-run IPFS storage, CDN, and video encoding infrastructure. Its Trole repository documents CID-aware IPFS gateway/CDN routing and integrity checks; Oratr documents video transcoding, IPFS file management, and SPK integration.

References:

- https://spk.network/
- https://github.com/spknetwork/trole
- https://github.com/spknetwork/oratr

These capabilities are relevant to future media publication, but they do not solve the immediate authoring-authority/usability question and must not become auth/payment/private-state authority.

## 6. Selected proposed milestone

```text
MILESTONE = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION
```

The milestone is intentionally **tool-agnostic**.

GrapesJS Core is the primary technology candidate to test, but HV-6 succeeds only if the adapter contract succeeds. A lightweight native implementation or another technology may defeat GrapesJS in the bounded evaluation if it better preserves the accepted semantics.

## 7. Minimum HV-6 preregistration requirements

The next preregistration must freeze at least the following before implementation is authorized.

### 7.1 Canonical-authority rule

```text
CANONICAL_SOURCE_OF_TRUTH = HV5_AUTHORING_DOCUMENT
EDITOR_PROJECT_STATE_AUTHORITY = NONE
```

No editor-only value may be necessary to reconstruct a valid accepted authoring document.

### 7.2 Ownership-derived controls

The adapter must expose routine editing only for paths classified `OPERATOR_AUTHORED` by HV-5.

`INTEGRATION_OWNED`, `DERIVED`, `PLATFORM_FIXED`, `DEPLOYMENT_OWNED`, and `SECURITY_PRIVILEGED` values must be either absent from ordinary controls or clearly read-only.

Forbidden secret/private material must remain rejected before it can enter canonical state.

### 7.3 No freeform authority escalation

HV-6 must not use a generic drag/drop canvas to grant authority to invent arbitrary HTML, scripts, event handlers, remote assets, unknown package fields, layout trees, or unregistered structural state.

A visual representation may be rich, but every committed semantic edit must map to a preregistered HV-5-owned path or a separately authorized future extension.

### 7.4 Preview truth

Preview must derive from the same accepted venue/package rendering path or an explicitly bounded deterministic projection of it. The project must not maintain a visually persuasive editor preview that cannot be reproduced by the accepted application renderer.

### 7.5 Round-trip and reload tests

For Fourth Street and Lantern Room, the preregistration must require evidence equivalent to:

```text
CANONICAL_HV5_DOCUMENT
-> VISUAL_ADAPTER_LOAD
-> NO_OP_SAVE
-> BYTE_IDENTICAL_CANONICAL_HV5_DOCUMENT
```

and for an allowed ordinary edit:

```text
CANONICAL_HV5_DOCUMENT
-> VISUAL_ADAPTER_EDIT
-> HV5_OPERATOR_GATE
-> EXPECTED_CANONICAL_HV5_DOCUMENT
-> RELOAD_VISUAL_ADAPTER
-> SAME_SEMANTICS
```

No hidden editor persistence may be required for the reload proof.

### 7.6 Direct source mode preserved

A technical operator must still be able to author/validate the canonical JSON without GrapesJS or any other visual editor installed.

### 7.7 Technology evaluation gate

The preregistration must compare at least:

```text
A = GRAPESJS_CORE_ADAPTER
B = MINIMAL_NATIVE_OR_EXISTING_STACK_ADAPTER
```

against:

- source-of-truth preservation;
- control over ownership-derived fields;
- deterministic reload/round-trip behavior;
- dependency/licensing burden;
- accessibility;
- responsive usability;
- implementation complexity;
- ability to remain venue-type neutral;
- ability to avoid freeform executable content.

No dependency may be selected solely because it is more visually impressive.

### 7.8 Synthetic evidence

Fourth Street remains the compatibility proof and Lantern Room remains the distinct fictional non-bar proof.

A real second venue is not required for HV-6 acceptance and is not authorized by HV-6.

## 8. Explicit HV-6 non-effects

The proposed HV-6 milestone may not, absent a later separate authorization:

```text
ADMIT_A_REAL_SECOND_VENUE
MUTATE_FOURTH_STREET_PRODUCTION
ENABLE_SHARED_RUNTIME_MULTI_TENANCY
CHANGE_HIVE_AUTHORITY
CHANGE_PAYMENT_AUTHORITY
HANDLE_HIVE_PRIVATE_KEYS
STORE_OR_ROTATE_SECRETS
CREATE_ARBITRARY_HTML_OR_SCRIPT_AUTHORITY
REPLACE_HV5_CANONICAL_AUTHORING_IDENTITY
MAKE_GRAPESJS_PROJECT_JSON_CANONICAL
REQUIRE_GRAPESJS_STUDIO_SDK
PUBLISH_TO_IPFS
CREATE_OR_UPDATE_IPNS
INTEGRATE_3SPEAK_OR_SPKNETWORK
ADD_ORBITDB
BUILD_FLEET_ORCHESTRATION
RENAME_FOURTH_STREET_PRODUCTION_COMPATIBILITY_PATHS
```

## 9. Disposition of competing lanes

### Real second venue

```text
DISPOSITION = HIGH_PRIORITY__DEFER_ONE_BOUNDED_OPERATOR_USABILITY_GATE
AUTHORIZATION = NO
```

This deferral is not indefinite. After HV-6, a real isolated second-venue pilot should receive strong preference unless a concrete pilot becomes available earlier and warrants explicit sequencing re-adjudication.

### CID/IPFS publication

```text
DISPOSITION = ELIGIBLE_DOWNSTREAM__NOT_SELECTED
```

The authoring and operator workflow should be stable before defining the public artifact to publish.

### 3Speak/SPK media

```text
DISPOSITION = ELIGIBLE_DOWNSTREAM__NOT_SELECTED
```

Media integration should follow a bounded media-authoring/publication use case rather than select its own product requirement.

### Package/developer identity cleanup

```text
DISPOSITION = ELIGIBLE_ADJACENT_MAINTENANCE__NOT_SELECTED
```

The inherited developer-facing `hive-bar` package identity remains a known mismatch, but it is not currently blocking the selected high-information lane. Fourth Street production compatibility names remain separately protected.

### Fleet operations

```text
DISPOSITION = DEFERRED_UNTIL_OBSERVED_MULTI_VENUE_OPERATION
```

### Helia/OrbitDB mutable replication

```text
DISPOSITION = DEFERRED_WITHOUT_CONCRETE_NONAUTHORITATIVE_DOMAIN
```

### Shared runtime multi-tenancy

```text
DISPOSITION = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```

## 10. Decision conclusion

```text
POST_HV5_SEQUENCING_DECISION = ACCEPTED
SELECTED_NEXT_LANE = OPERATOR_VISUAL_AUTHORING_ADAPTER
PROPOSED_MILESTONE = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION
NEXT_OPERATION = HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
GRAPESJS_CORE = PRIMARY_EVALUATION_CANDIDATE__NOT_SELECTED_DEPENDENCY
REAL_SECOND_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
```

The next operation is HV-6 preregistration only. Implementation requires a later separate Project Lead adjudication and authorization after the prospective contract is frozen and reviewed.
