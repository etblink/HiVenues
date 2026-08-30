# Post-HV-4 Successor Sequencing Decision 0.1.0

## Status

```text
OPERATION = POST_HV4_SEQUENCING_DECISION
STATUS = FROZEN_PROJECT_LEAD_SEQUENCING_DECISION
REPOSITORY = etblink/Hive-Venues
DECISION_BASE_COMMIT = 27be7f9adcd87edd38ef73a7a9bfd293940cee2e
DECISION_BASE_TREE = cfa8ab14086e7022e31fcadd968150383a6f27f8
HV1_VENUE_CONTEXT_FOUNDATION = ACCEPTED
HV2_REFERENCE_DEPLOYMENT_PROFILE_EXTRACTION = ACCEPTED
HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION = ACCEPTED
HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION = ACCEPTED
SELECTED_NEXT_LANE = CANONICAL_VENUE_AUTHORING_CONTRACT
PROPOSED_MILESTONE = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION
NEXT_OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
GRAPESJS = EVALUATION_CANDIDATE__NOT_SELECTED_DEPENDENCY
OPTIONAL_STARTER_ARCHETYPES = SUPPORTING_FIXTURES__NONAUTHORITATIVE
SECOND_REAL_VENUE = DEFERRED_ONE_GATE__REASSESS_AFTER_HV5_OR_IF_SUITABLE_REAL_PILOT_BECOMES_AVAILABLE
SUCCESSOR_PACKAGE_IDENTITY_CLEANUP = ELIGIBLE_ADJACENT_MAINTENANCE__NOT_SELECTED_MILESTONE
CID_PUBLICATION = ELIGIBLE_DOWNSTREAM__DEFER_UNTIL_DETERMINISTIC_PUBLICATION_ARTIFACT_DEFINED
IPNS = ELIGIBLE_MUTABLE_NAMING_LAYER_AFTER_CID_ARTIFACT__NOT_SOURCE_IDENTITY
THREESPEAK_SPK_MEDIA = ELIGIBLE_DOWNSTREAM_MEDIA_CAPABILITY__NOT_SELECTED
FLEET_OPERATIONS = DEFERRED_PENDING_AUTHORING_AND_REAL_PILOT_EVIDENCE
HELIA_ORBITDB_REPLICATION = DEFERRED_PENDING_CONCRETE_NONAUTHORITATIVE_MUTABLE_DOMAIN
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
```

This record performs the fresh read-only sequencing adjudication required after accepted HV-4. It selects only the next bounded preregistration operation. It does not implement HV-5, add GrapesJS, admit a real second venue, publish to IPFS/IPNS, integrate 3Speak/SPK, automate fleet deployment, introduce replicated mutable state, alter production, or authorize shared-runtime multi-tenancy.

## 1. Controlling question

HV-1 through HV-4 now establish a deliberate one-isolated-venue composition path:

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

The next uncertainty is no longer whether those authorities can be separated or intentionally composed. They can.

The controlling post-HV-4 question is:

> Which bounded proof most usefully turns the accepted isolated-venue architecture into a platform that a real operator or developer can safely author, without freezing an unproven visual-editor dependency, inventing a mandatory venue taxonomy, admitting a real client before the authoring boundary is explicit, or distracting the project with infrastructure that does not yet answer a product uncertainty?

## 2. Decision standard

Candidate lanes are compared against five criteria:

1. **Information gain** — does the operation resolve a material product/architecture uncertainty rather than merely add capability?
2. **Dependency discipline** — does it avoid locking the platform to a tool, service, taxonomy, or deployment model before the underlying contract is explicit?
3. **Reuse** — will the resulting evidence reduce the cost and risk of later real-venue, publication, media, and fleet work?
4. **Assurance preservation** — can it preserve the accepted auth, payment, moderation, onboarding, secret, replay/idempotency, and one-runtime-per-venue boundaries?
5. **Boundedness** — can it be preregistered and falsified without requiring live production or an uncontrolled business dependency?

The selected lane should be the smallest next uncertainty worth proving, not the most feature-rich idea available.

## 3. Current evidence

### 3.1 HV-4 removed the composition blocker

HV-4 proved deterministic composition of explicit venue, package, deployment, and composition-binding inputs; fail-closed identity mismatch behavior; secret exclusion; venue-neutral generic code; and a meaningfully non-bar Lantern Room composition without a source fork.

The platform therefore has an accepted canonical authority chain. What it lacks is an accepted **authoring contract** describing which parts of that chain an ordinary operator may edit, which values are derived or privileged, how authored state is serialized, and how alternate authoring surfaces converge on the same canonical validated representation.

### 3.2 A WYSIWYG implementation before an authoring contract would invert ownership

A visual editor can make the platform more approachable, but it must not become a second configuration authority. The editor should consume and emit a versioned canonical authoring document that compiles through the accepted HV-1/HV-3/HV-4 validators.

Therefore the project must freeze at least:

- editable versus non-editable fields;
- component/content permissions;
- derived versus user-authored values;
- deterministic serialization and schema versioning;
- preview semantics;
- media-reference ownership;
- validation/error behavior;
- source/code escape-hatch behavior;
- privileged deployment/security values that never become visual-editor state.

Only after those rules exist should a framework such as GrapesJS be admitted as an implementation dependency.

### 3.3 Current GrapesJS evidence makes it credible but not authoritative

Public capability review on 2026-08-30 found that current GrapesJS exposes component models with configurable editing and placement constraints, project JSON persistence, and custom asset-manager integration. GrapesJS core is actively maintained; the public release history lists v0.23.3 as the latest release in July 2026.

Relevant public evidence:

- https://app.grapesjs.com/docs-sdk/configuration/components/overview
- https://app.grapesjs.com/docs-sdk/configuration/projects
- https://app.grapesjs.com/docs-sdk/configuration/assets/overview
- https://github.com/GrapesJS/grapesjs/releases

This fits the desired adapter architecture, but the Studio SDK has its own public-domain licensing flow and should not be conflated with GrapesJS core. HV-5 preregistration must explicitly decide whether any experiment uses core GrapesJS, Studio SDK, another editor, or no visual editor at all.

The persistence rule is especially important: GrapesJS documentation instructs consumers to retain project JSON rather than reconstructing editor state from exported HTML/CSS. Hive-Venues should go one step further and retain its **own canonical venue-authoring document** as platform authority, with any editor-specific project state treated as adapter-owned unless separately justified.

### 3.4 A real second venue remains the strongest later product test

HV-4 removed the earlier technical reason to avoid a real pilot. A suitable independently branded venue would test the architecture against real business identity, content, Hive identity/community, policy, domain, custody, deployment, and operational constraints.

However, no suitable second venue is identified or authorized in the current repository state. Making the next milestone depend on acquiring one would turn technical sequencing into an external business dependency.

HV-5 should therefore be exactly one gate, not a reason to delay real validation indefinitely. After HV-5, the next sequencing decision should strongly prefer a real isolated second-venue pilot if a suitable venue is available.

### 3.5 Source/developer identity still contains inherited Hive-Bar metadata

Canonical `package.json` still declares:

```text
name = hive-bar
description = A focused Hive community experience for 4th Street Bar.
```

That mismatch is real and increasingly visible as the successor developer surface grows. It is nevertheless a bounded maintenance problem, not the highest-information product uncertainty. It must remain separate from Fourth Street's intentionally preserved production compatibility namespace.

## 4. Candidate-lane adjudication

### 4.1 Canonical venue authoring contract — SELECTED

This lane most directly converts HV-4 from a developer-reviewed composition envelope into a platform-ready authoring boundary while preserving one canonical authority model.

The selected milestone is intentionally narrower than “build a no-code editor.” It should prove:

- one versioned canonical authoring document;
- deterministic compilation into accepted venue/package/bootstrap authorities;
- strict editable/derived/privileged ownership classes;
- fail-closed validation and round-trip determinism;
- preview semantics that cannot bypass canonical validation;
- a source/code escape hatch for advanced operators;
- no mandatory venue-type taxonomy;
- optional starter/archetype fixtures only as convenience evidence;
- an explicit adapter contract under which GrapesJS or another editor can later operate without becoming the source of truth.

This has the highest reuse value because a successful authoring contract lowers the cost of real pilots, visual editors, starter templates, content-addressed publication, and fleet tooling simultaneously.

### 4.2 Real isolated second-venue pilot — DEFERRED ONE GATE

A real second venue remains the strongest downstream falsification test and should not be buried behind a long no-code program.

Reason for one-gate deferral:

- no suitable real venue is currently identified/authorized;
- the authoring boundary is still implicit;
- HV-5 can make the required real-venue inputs and operator workflow explicit before business/custody obligations are introduced.

If a suitable real pilot becomes concretely available before HV-5 implementation begins, Project Lead may reopen sequencing rather than forcing an artificial delay.

### 4.3 GrapesJS / WYSIWYG implementation — ELIGIBLE ADAPTER, NOT SELECTED DEPENDENCY

GrapesJS is technically plausible because it supports constrained components, placement rules, persistent project data, extensibility, and custom asset-manager integration.

But selecting GrapesJS itself before freezing Hive-Venues authoring ownership would create the wrong dependency direction.

HV-5 preregistration must evaluate at least:

- core GrapesJS versus Studio SDK licensing/operational implications;
- whether editor project JSON is needed at all in addition to canonical Hive-Venues authoring state;
- component allowlists and nesting rules;
- prevention of arbitrary executable HTML/script injection;
- asset-manager integration with the existing image/media trust boundaries;
- deterministic canonical serialization independent of editor-internal ordering;
- ability to reconstruct a preview from canonical state;
- graceful escape to source/code without forking the authority model.

No GrapesJS package may be added merely because this sequencing decision names it.

### 4.4 Optional archetype/capability starters — SUPPORTING EVIDENCE, NOT PLATFORM TAXONOMY

Bar, band, streamer/influencer, news, digital store, and hybrid starting experiences are useful product examples and may reveal missing authoring capabilities.

They should be treated as optional starter documents, fixture bundles, or composable capability presets over the venue-neutral core. They must not become a mandatory exhaustive enum.

HV-5 may use contrasting synthetic fixtures to test that the canonical authoring document is not bar-shaped, but the milestone should not become a broad template marketplace.

### 4.5 Successor package/developer identity cleanup — ELIGIBLE ADJACENT MAINTENANCE

The inherited package name/description should be corrected in a bounded maintenance operation when doing so is proven not to alter Fourth Street production provenance, application tags, service names, release paths, or storage paths.

It is not selected as HV-5 because it provides little evidence about the operator-facing product model.

### 4.6 Content-addressed publication + IPNS — ELIGIBLE DOWNSTREAM, NOT SELECTED

Public IPFS documentation confirms the correct layered model:

```text
CID = immutable content-addressed identity
IPNS = signed mutable name/pointer that can resolve to successive immutable CIDs
```

Relevant public evidence:

- https://docs.ipfs.tech/concepts/immutability/
- https://docs.ipfs.tech/concepts/ipns/
- https://docs.ipfs.tech/reference/http/gateway/

This aligns with the preferred future provenance stack:

```text
GIT_COMMIT_SHA = source/provenance event
GIT_TREE_SHA = exact source tree
ARTIFACT_DIGEST = exact deterministic publication payload
CID = immutable publication identity
IPNS = optional mutable publication name over successive CIDs
```

However, the project still has not defined the exact deterministic public artifact to publish. The authoring-contract lane is likely to produce a natural candidate snapshot/export object. Publication should therefore follow, not precede, that definition.

IPNS must not replace Git commit/tree identity, and key custody for an IPNS name would require its own explicit operational boundary.

### 4.7 3Speak / SPKNetwork media capability — ELIGIBLE DOWNSTREAM

Current public evidence confirms a real integration surface:

- 3Speak Embed exposes upload-token/API-key upload plus public video metadata/encoding-status retrieval: https://embed.3speak.tv/
- SPK Network publicly describes peer storage, encoding, and content-delivery infrastructure: https://spk.network/
- SPK's Oratr project exposes IPFS file management and HLS transcoding concepts: https://github.com/spknetwork/oratr

This is a credible future media lane for venue video, creator channels, event media, or decentralized storage/transcoding.

It is not selected because media infrastructure does not yet resolve the core authoring uncertainty, and it must not acquire authority over Hive private keys, payments, onboarding custody, sessions, or other protected private state.

### 4.8 Fleet operations — DEFERRED

HV-4 made per-venue composition repeatable, but fleet automation would still automate a developer-oriented process whose human authoring contract and real second-venue behavior are unproven.

Fleet work should follow authoring evidence and preferably at least one real second-venue deployment.

### 4.9 Helia / OrbitDB replicated state — DEFERRED

No concrete non-authoritative mutable data domain currently justifies replicated state, privacy/access-control complexity, conflict resolution, and peer lifecycle management.

Canonical Hive state, payment receipts, auth/session authority, onboarding credential custody, and other protected state remain excluded by default.

### 4.10 Shared-runtime multi-tenancy — DEFERRED

The accepted runtime model remains one isolated venue per runtime.

Payment, moderation, onboarding, session/preflight, secret, replay/idempotency, and observability ownership are still venue-local and have not been proven safe under request-time tenant selection.

## 5. Selected next operation

The next bounded operation is only:

```text
HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION
```

The proposed later milestone is:

```text
HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION
```

This decision does not authorize that implementation. The preregistration must be frozen first.

## 6. Required HV-5 preregistration contents

The preregistration must define at least the following.

### 6.1 Exact canonical base

Bind the exact then-current canonical `main` commit and tree before substantive HV-5 work begins.

### 6.2 Canonical authoring document

Define one versioned canonical persisted authoring representation that is independent of any particular editor framework.

The preregistration must state:

- schema/version ownership;
- canonical serialization rules;
- stable field/component identities;
- migration policy for future schema versions;
- which accepted HV-1/HV-3/HV-4 objects are compiled or referenced from it;
- whether deployment-profile values are ever authorable here, and if so under what restricted class.

### 6.3 Ownership classes

Every candidate field must be classified as one of at least:

```text
OPERATOR_AUTHORED
DERIVED
PLATFORM_FIXED
DEPLOYMENT_OWNED
SECURITY_PRIVILEGED
SECRET_OR_PRIVATE__FORBIDDEN_FROM_AUTHORING_DOCUMENT
```

Payment authority, authentication/session secrets, private keys, onboarding custody material, production credentials, and other protected values may not become generic editor-owned fields.

### 6.4 Component/capability contract

If authored presentation uses components/blocks, define their semantic IDs, allowed properties, nesting/placement constraints, validation rules, and rendering ownership before choosing a WYSIWYG implementation.

Arbitrary executable script injection must remain forbidden.

### 6.5 Deterministic compilation and round trip

Require deterministic conversion from canonical authoring state into the accepted venue/package/bootstrap authorities and review output.

The later implementation must prove that load/edit/save/reload does not silently change meaning.

### 6.6 Preview boundary

Preview must render from validated canonical state and must not create an alternate unvalidated runtime path.

Preview failure must be distinguishable from saved canonical state; no optimistic visual state may be treated as accepted configuration merely because it rendered.

### 6.7 Advanced source/code escape hatch

A technically advanced operator must be able to inspect and author the canonical representation directly without depending on a visual editor.

Visual and code paths must converge on the same validators and serialization rules.

### 6.8 GrapesJS evaluation gate

If GrapesJS is tested, the preregistration must bind the exact package/product under evaluation and distinguish GrapesJS core from Studio SDK.

It must evaluate:

- license/deployment implications;
- local/self-hosted persistence suitability;
- component restriction support;
- asset-manager integration;
- HTML/CSS/script injection boundaries;
- deterministic adapter serialization;
- accessibility and keyboard editing requirements;
- whether editor-specific project state can remain non-authoritative.

No external cloud storage should become required merely for convenience without separate authorization.

### 6.9 Venue-neutral evidence

Require at least one meaningfully non-bar fixture and preserve the rule that starter archetypes are optional convenience layers, not a mandatory core taxonomy.

### 6.10 Explicit non-effects

HV-5 must not silently perform or authorize:

- a real second-venue launch;
- live Fourth Street production mutation;
- DNS/VPS/Caddy/systemd/fleet provisioning;
- Hive account/community creation or authority changes;
- payment/onboarding/moderation tenant-schema migration;
- shared-runtime multi-tenancy;
- IPFS/CID/IPNS publication;
- IPNS key creation/custody;
- 3Speak/SPK upload or credential integration;
- Helia/OrbitDB replication;
- arbitrary remote script/plugin execution;
- a mandatory venue-category enum;
- replacement of Git source provenance by editor/project identifiers.

## 7. Qualification expectations for later HV-5 implementation

The prospective implementation should require:

- schema/serialization golden vectors;
- ownership-class rejection tests;
- secret/private-field rejection;
- deterministic compile and round-trip tests;
- non-bar fixture proof;
- source/code and any visual-adapter equivalence checks;
- sanitizer/CSP/script-injection checks for any editable presentation surface;
- accessibility and keyboard behavior qualification if a visual editor is introduced;
- deterministic Ubuntu and Windows gates;
- rendered qualification for any actual editor/preview UI;
- no material coverage/security regression;
- Project Lead human review of the nontechnical authoring workflow;
- fresh canonical `main` race before integration.

## 8. Why this ordering is preferable

The accepted successor sequence becomes:

```text
HV-1  -> explicit venue context
HV-2  -> explicit deployment profile
HV-3  -> explicit venue package
HV-4  -> deterministic isolated-venue bootstrap
HV-5  -> canonical venue-authoring contract
then  -> strongly reassess real second venue; subsequently editor expansion / CID+IPNS publication / media / fleet as evidence warrants
```

This ordering avoids two opposite errors:

1. building an attractive visual editor before knowing what it is safely allowed to author; and
2. building more infrastructure around a developer-only workflow that has not yet become operator-usable.

It also improves later candidate lanes:

- a real pilot gets an explicit operator input contract;
- GrapesJS or another editor becomes a replaceable adapter;
- optional archetypes get a stable semantic substrate;
- a publication experiment gets a deliberate deterministic artifact candidate;
- CID/IPNS can represent immutable snapshots plus a mutable current pointer without confusing source identity;
- media integrations can attach to explicit authored media semantics;
- fleet tooling gets a stable per-venue input document rather than automating ad hoc configuration.

## 9. Routing consequence

Upon canonical acceptance of this decision, living routing surfaces should be reconciled to:

```text
HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION = ACCEPTED
POST_HV4_SEQUENCING_DECISION = ACCEPTED
SELECTED_NEXT_LANE = CANONICAL_VENUE_AUTHORING_CONTRACT
PROPOSED_MILESTONE = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION
NEXT_OPERATION = HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
GRAPESJS = EVALUATION_CANDIDATE__NOT_SELECTED_DEPENDENCY
OPTIONAL_STARTER_ARCHETYPES = SUPPORTING_FIXTURES__NONAUTHORITATIVE
SECOND_REAL_VENUE = DEFERRED_ONE_GATE
CID_PUBLICATION = ELIGIBLE_DOWNSTREAM__NOT_SELECTED
IPNS = ELIGIBLE_AFTER_CID_ARTIFACT__NOT_SOURCE_IDENTITY
THREESPEAK_SPK_MEDIA = ELIGIBLE_DOWNSTREAM__NOT_SELECTED
FLEET_OPERATIONS = DEFERRED
HELIA_ORBITDB_REPLICATION = DEFERRED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
```

Historical HV-1 through HV-4 preregistrations, acceptance records, and prior sequencing decisions remain immutable evidence of their respective authorization boundaries. They must not be rewritten to sound current.
