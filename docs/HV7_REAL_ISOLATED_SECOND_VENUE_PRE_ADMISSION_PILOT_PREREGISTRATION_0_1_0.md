# HV-7 Real Isolated Second-Venue Pre-Admission Pilot — Preregistration 0.1.0

## 1. Status

```text
OPERATION = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT__PREREGISTRATION
PREREGISTRATION_VERSION = 0.1.0
STATUS = FROZEN_PREREGISTRATION__SPECIFIC_VENUE_UNSELECTED__IMPLEMENTATION_NOT_AUTHORIZED
REPOSITORY = etblink/Hive-Venues

CANONICAL_BASE_COMMIT = 352ac15a32ad7c1fb9cdd0ea54a7ade9870f414e
CANONICAL_BASE_TREE = faf4facd4c204261b24c38c0fbe1efc49eeabea6
REFERENCE_VENUE = Fourth Street Bar, Reno
SYNTHETIC_CONTROL_VENUE = The Lantern Room (Fixture)
SELECTED_LANE = REAL_ISOLATED_SECOND_VENUE_PILOT
PROPOSED_MILESTONE = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT

SPECIFIC_REAL_VENUE = UNSELECTED
VENUE_CANDIDATE_SELECTION = NOT_EXECUTED
VENUE_OUTREACH_OR_CONTACT = NOT_AUTHORIZED_BY_THIS_FILE
VENUE_PARTICIPATION_OR_CONSENT = NOT_YET_ESTABLISHED
REAL_SECOND_VENUE_AUTHORIZED = NO
REAL_SECOND_VENUE_ADMISSION = NOT_AUTHORIZED
HV7_IMPLEMENTATION = NOT_AUTHORIZED
REAL_VENUE_PACKAGE_OR_BOOTSTRAP_ARTIFACT = NOT_AUTHORIZED_BY_THIS_FILE

ACCOUNT_CREATION = NOT_AUTHORIZED
HIVE_WRITE_AUTHORITY_CHANGE = NOT_AUTHORIZED
PAYMENT_AUTHORITY_CHANGE = NOT_AUTHORIZED
SECRET_OR_KEY_CUSTODY_CHANGE = NOT_AUTHORIZED
DNS_VPS_SYSTEMD_MUTATION = NOT_AUTHORIZED
PRODUCTION_AUTHORING_MOUNT = NOT_AUTHORIZED
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
MANDATORY_VENUE_TYPE_ENUM = FORBIDDEN_WITHOUT_NEW_PRODUCT_EVIDENCE

NEXT_OPERATION_AFTER_PREREGISTRATION_ACCEPTANCE = HV7_REAL_ISOLATED_SECOND_VENUE_CANDIDATE_SELECTION__READ_ONLY
```

This preregistration freezes the first real-world falsification protocol for the accepted Hive-Venues successor foundation. It does **not** select, contact, admit, onboard, deploy, or create accounts for a venue. It does not authorize a real venue fixture, package, bootstrap, operator session, Hive transaction, payment, infrastructure change, secret custody, or production mutation.

The point of HV-7 is not to demonstrate that another venue can be made to fit. The point is to give an independently branded real venue enough authority over its own authentic requirements to expose where HV-1 through HV-6 are wrong, too narrow, too Fourth-Street-specific, or too difficult for a real operator.

---

## 2. Controlling question

HV-1 through HV-6 established a venue context, venue package, deployment profile, isolated bootstrap, canonical authoring contract, and native operator visual-authoring adapter. Fourth Street is the reference real deployment; the non-Fourth-Street proof venues used so far are synthetic/offline fixtures.

HV-7 asks:

> Can one independently branded real venue, using authentic non-secret venue facts, vocabulary, authored expression, and operator requirements, pass through the accepted isolated Hive-Venues composition and authoring model without source forks, Fourth Street/bar semantic leakage, invented taxonomy, hidden authority escalation, or premature live deployment?

The experiment must be capable of answering **no**.

A venue-specific fact or request may reveal a platform defect, an ownership-model defect, a visual-authoring defect, a deployment/composition defect, an integration prerequisite that is not yet satisfied, or merely a venue-specific feature request. HV-7 must distinguish those outcomes rather than forcing every difference into the generic platform.

---

## 3. Binding predecessor authority

HV-7 inherits and may not weaken:

- accepted HV-1 venue-context validation and venue identity ownership;
- accepted HV-2 deployment-profile validation and deployment ownership;
- accepted HV-3 venue-package validation and authored-expression ownership;
- accepted HV-4 deterministic, secret-safe isolated bootstrap and explicit venue/package/deployment bindings;
- accepted HV-5 canonical authoring document, ownership classes, ordinary-operator gate, direct-source mode, and canonical serialization;
- accepted HV-6 native existing-stack visual adapter, truthful proposed-state preview, Apply/Discard semantics, and subordination to HV-5;
- the accepted Post-HV-6 selection of `REAL_ISOLATED_SECOND_VENUE_PILOT`;
- the default `ONE_ISOLATED_VENUE_PER_RUNTIME` architecture;
- existing Hive Keychain, signing, session, payment, replay, moderation, onboarding, secret-custody, provenance, and production safety boundaries.

The architecture under test remains:

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
+
CANONICAL_AUTHORING_CONTRACT
+
NATIVE_VISUAL_AUTHORING_ADAPTER
=
ONE_ISOLATED_VENUE_RUNTIME
```

HV-7 may falsify this architecture. It may not silently replace it during the test.

---

## 4. Pre-admission principle

A selected candidate venue is not an admitted venue.

The pilot must progress through explicit evidence gates:

```text
PREREGISTRATION
-> READ_ONLY_CANDIDATE_SELECTION
-> PARTICIPATION_AND_DATA_PERMISSION_GATE
-> SEPARATE_STAGED_IMPLEMENTATION_AUTHORIZATION
-> OFFLINE_OR_STAGED_REAL_VENUE_COMPOSITION
-> OPERATOR_REVIEW_EVIDENCE
-> PROJECT_LEAD_ADJUDICATION
-> ONLY_THEN_CONSIDER_ANY_LIVE_ADMISSION_OR_DEPLOYMENT
```

No later stage is implied by completion of an earlier stage.

A real venue may be selected as a **candidate** for the experiment without being authorized for repository representation, Hive onboarding, infrastructure, production, or public launch. Contacting a venue or requesting participation is an external interaction and requires a separately explicit authorization or user-executed contact; this preregistration does not authorize the Project Lead to perform outreach.

---

## 5. Candidate-selection criteria

The later read-only candidate-selection operation must compare plausible real venues against these criteria before any outreach:

1. **Independent brand and operator reality.** The candidate must be a real independently operated venue or venue-like organization rather than a Hive-Venues-controlled fiction.
2. **Falsification value.** It should differ meaningfully from Fourth Street in brand, vocabulary, customer relationship, content, or operating model.
3. **Venue-type neutrality pressure.** A non-bar or otherwise materially distinct candidate is preferred because it is more likely to expose bar-specific assumptions, but no venue-type taxonomy is created and non-bar status is not a mandatory eligibility enum.
4. **Isolated-runtime fit.** The candidate must be testable as one venue per isolated runtime; a candidate is not preferred merely because it would force shared tenancy.
5. **Staged learning value.** The important architectural questions should be answerable initially without production deployment, Hive writes, payments, account creation, or secret custody.
6. **Potential operator participation.** There must be a plausible path to obtaining explicit permission from an authorized owner/operator for the later human-review portion.
7. **Non-secret evidence availability.** Public facts or permissioned venue-owned content should be sufficient to construct a meaningful staged test if later authorized.
8. **No convenience bias.** Existing familiarity with the venue may reduce coordination cost but may not override falsification value.

The candidate-selection record must explain why the chosen candidate has greater expected information value than rejected alternatives. It must not contact any venue.

---

## 6. Participation and consent gate

Before any real venue is represented in a committed HV-7 fixture/package/bootstrap artifact or used in an operator walkthrough, a later separately authorized participation gate must establish explicit permission from a person reasonably authorized to represent the venue for the bounded pilot.

The permission must cover, at minimum:

- use of specified non-secret venue facts and venue-owned/permissioned brand or authored content in the staged pilot;
- use of specified venue-owned or permissioned media, if any;
- participation in a bounded operator/usability review if human review is part of the authorized phase;
- understanding that the pilot is pre-admission and does not create a production service, Hive account, payment integration, or public deployment;
- understanding that protected secrets/private keys are not requested and must not be supplied.

Permission to participate in the pilot is not permission for public production deployment. Any later public launch or infrastructure operation requires separate authority.

If explicit participation cannot be established, HV-7 must not fabricate operator evidence. The result is `INSUFFICIENT_PARTICIPATION_EVIDENCE` and the project may return to candidate selection.

---

## 7. Real-versus-synthetic evidence boundary

HV-7 must preserve exact provenance for what is genuinely real and what remains staged or synthetic.

### 7.1 Real or permissioned evidence

Subject to the later participation gate, the pilot may use:

- venue display name and public business facts;
- authentic venue vocabulary;
- authentic public-facing copy or operator-supplied replacement copy;
- venue-owned or permissioned logo/media assets;
- authentic operator judgments about ownership, wording, workflow, and usability;
- already-existing public Hive identities only if their relationship to the venue is independently confirmed or explicitly confirmed by the venue participant.

### 7.2 Staged/synthetic integration evidence

A real venue may not already have the Hive community/account bindings or deployment infrastructure required by the current domain model. HV-7 must not create those external resources merely to make the staged test complete.

Where such integration facts are absent, a later implementation may use clearly marked test-only synthetic bindings or a synthetic deployment manifest **only if**:

- they are unmistakably non-production fixtures;
- no claim is made that the venue owns or controls those synthetic Hive identities;
- no account/community is created;
- no secret or credential is required;
- the synthetic portion is separately identified in evidence;
- the result does not count as proof of real Hive onboarding or real deployment readiness.

A missing real Hive binding is not automatically a platform defect. It must be classified as an integration prerequisite unless the staged test shows that the generic model itself cannot represent the requirement once a legitimate binding exists.

### 7.3 Forbidden evidence substitution

HV-7 must not:

- invent operator approval;
- attribute synthetic copy or accounts to the venue as real;
- scrape or reuse third-party media without permission merely because it is public;
- introduce fake private keys, secrets, payment credentials, or provider credentials that resemble real custody;
- replace an inconvenient authentic requirement with a friendlier fictional one merely to obtain a pass.

---

## 8. Frozen falsification hypotheses

The later staged pilot must evaluate at least these hypotheses.

### H1 — Venue-language neutrality

Authentic venue identity and vocabulary fit through venue-owned configuration without a mandatory venue-type enum and without forcing generic platform/security code to speak Fourth Street/bar-specific language.

### H2 — No generic source fork

The candidate can use the same generic route, renderer, composition, and authoring implementation path without copied application trees, venue-specific generic branches, or `if candidateVenue` platform forks.

### H3 — Composition integrity

The real venue facts plus legitimate staged integration/deployment bindings can pass through the authoritative HV-1/HV-3/HV-2 validators and HV-4 bootstrap with deterministic explicit identity binding.

### H4 — Authoring ownership fit

Authentic routine venue changes map coherently onto HV-5 ownership classes. Operator-owned content is not incorrectly protected, and integration/deployment/security state is not incorrectly exposed as ordinary operator authority.

### H5 — Visual-authoring usability

The accepted HV-6 native adapter remains understandable and useful when populated with authentic venue content rather than only reference/synthetic fixtures. It remains subordinate to HV-5 and does not require the operator to understand JSON pointers, Git, HTML, CSS, or JavaScript.

### H6 — Compatibility-seam containment

Historical Fourth Street/Hive-Bar compatibility vocabulary may remain at explicit compatibility boundaries, but it must not leak into generic candidate-facing semantics in a way that mislabels or constrains the real venue.

Known seams worth probing include, without presuming a defect:

```text
withVenueContext(...): officialAccount -> officialBarAccount compatibility alias
hive-bar package/runtime/service/provenance names retained for Fourth Street compatibility
fourth-street-bar application tag and production host identity
bar/operator wording in inherited release or presentation surfaces
```

Presence of a compatibility name in historical/reference-only code is not itself failure. Venue-visible or generic-authority leakage is the relevant question.

### H7 — Isolated-runtime sufficiency

The candidate can be represented and reviewed as one isolated venue runtime without shared request-time tenancy, cross-venue data mixing, or a new fleet control plane.

### H8 — No premature generalization

An authentic candidate-specific request does not automatically become a universal platform feature or mandatory taxonomy. Generalization requires evidence that the requirement belongs to the reusable platform rather than only to the venue package or later optional capability layer.

---

## 9. Finding taxonomy

Every material mismatch discovered during HV-7 must be classified before remediation.

```text
PLATFORM_GENERALITY_DEFECT
VENUE_CONTEXT_MODEL_GAP
VENUE_PACKAGE_MODEL_GAP
DEPLOYMENT_PROFILE_MODEL_GAP
BOOTSTRAP_BINDING_DEFECT
AUTHORING_OWNERSHIP_DEFECT
VISUAL_ADAPTER_USABILITY_DEFECT
COMPATIBILITY_LEAKAGE_DEFECT
INTEGRATION_PREREQUISITE_UNMET
VENUE_SPECIFIC_REQUIREMENT__NO_PLATFORM_GENERALIZATION_YET
INSUFFICIENT_PARTICIPATION_EVIDENCE
OUT_OF_SCOPE_EXTERNAL_EFFECT_REQUIRED
```

A finding may receive more than one classification only when the evidence genuinely supports multiple independent dimensions.

The Project Lead must record the smallest supported classification. Do not inflate a venue-specific preference into a platform defect, and do not minimize a generic semantic leak as “just customization.”

---

## 10. Defect-first remediation rule

HV-7 is expressly permitted to falsify the accepted foundation.

If a generic platform defect is found:

```text
AUTHENTIC_VENUE_REQUIREMENT
-> OBSERVED_PLATFORM_FAILURE
-> CLASSIFY_FINDING
-> FREEZE_EVIDENCE
-> STOP_AFFECTED_PILOT_PATH
-> SEPARATELY_PREREGISTER_OR_AUTHORIZE_PLATFORM_REPAIR
-> REQUALIFY
-> REPEAT_ONLY_THE_AFFECTED_PROOF
```

Forbidden responses include:

- rewriting the venue's authentic requirement to fit the current schema;
- adding a venue-specific fork to make the pilot pass;
- weakening validation or ownership checks;
- converting protected state into operator authority for convenience;
- introducing a universal venue taxonomy from one example;
- enabling shared tenancy because isolated composition exposed an unrelated inconvenience.

Finding a defect is useful evidence, not a reason to protect the prior architecture from failure.

---

## 11. Later staged implementation shape

This preregistration does not authorize implementation. If a later implementation authorization is granted after candidate selection and participation permission, the preferred staged sequence is:

### Phase A — Evidence packet freeze

Freeze the exact real/permissioned inputs and separately identify any synthetic integration/deployment bindings. Record source/provenance for each input and asset.

### Phase B — Offline composition

Construct the candidate through the accepted authoritative path:

```text
REAL_PERMISSIONED_VENUE_FACTS
+
REAL_PERMISSIONED_VENUE_EXPRESSION
+
REAL_OR_EXPLICITLY_SYNTHETIC_TEST_BINDINGS
+
SYNTHETIC_NONDEPLOYING_ISOLATED_DEPLOYMENT_PROFILE
-> HV1/HV3/HV2
-> HV4_BOOTSTRAP
-> HV5_AUTHORING_DOCUMENT
```

No network access should be necessary for deterministic composition.

### Phase C — Generic rendering and source-fork audit

Render the candidate through the same generic application path and prove that no candidate-specific generic source fork or mandatory venue-type branch is required.

### Phase D — HV-5/HV-6 authoring proof

Exercise authentic operator-owned fields through direct-source mode and the HV-6 native adapter. Apply and Discard must retain the accepted HV-5 semantics.

### Phase E — Human operator review

Only after separate authorization and participation permission, perform the bounded operator tasks defined below and record non-secret outcome notes.

### Phase F — Project Lead adjudication

Classify every finding, decide whether the foundation is validated, requires repair, or remains inconclusive, and freeze the exact evidence before any live-admission question is considered.

---

## 12. Operator-review protocol

The later human-review phase should test whether the accepted model is usable by a real venue operator, not whether a developer can coach someone through it.

After a brief orientation explaining that some fields are editable and others are protected, the participant should be asked to perform representative tasks using authentic venue content:

1. locate and change one public business fact;
2. locate and change one hero or descriptive-copy field;
3. inspect or change one existing image/media metadata field when permissioned media exists;
4. inspect/change venue-specific onboarding vocabulary such as the operator/staff nouns where applicable;
5. identify at least one integration/protected field that should **not** be ordinary-editable;
6. preview proposed changes;
7. discard one change and verify that accepted state returns;
8. apply one valid set of changes and verify that accepted state reflects them;
9. encounter or review one safe validation/rejection example;
10. describe, in ordinary language, what they believe is venue-owned versus platform/integration-owned.

Evidence must record:

- task completion or inability to complete;
- points requiring developer intervention;
- confusing or misleading terminology;
- any mismatch between the participant's reasonable ownership expectation and HV-5 classification;
- any candidate-facing Fourth Street/bar terminology that the venue did not choose;
- any request the participant considers essential that the current model cannot represent.

No numeric usability score is preregistered as a substitute for the observations. A green automated suite cannot override a clear operator-facing failure.

---

## 13. Data, privacy, asset, and custody boundary

HV-7 is not a data-harvesting exercise.

The staged pilot must use only the minimum information needed to test the architecture. Committed artifacts must not contain:

- private Hive keys or seed phrases;
- Keychain secrets;
- session/auth secrets;
- provider/API tokens;
- DNS/Cloudflare credentials;
- SSH keys;
- payment credentials or private merchant data;
- private staff/customer records;
- unpublished personal contact information;
- operator passwords or administrative screenshots containing credentials.

Business contact facts already public and explicitly needed by the venue context may be used only under the later evidence/permission rules.

Media must be venue-owned, participant-supplied with permission, or otherwise explicitly permissioned for the pilot. Public discoverability alone is not treated as permission to copy an asset into the repository.

Human-review notes should identify participants by role where possible rather than collecting unnecessary personal details.

---

## 14. Source-of-truth and provenance requirements

The later pilot must keep four evidence classes distinguishable:

```text
REAL_PUBLIC_FACT
REAL_PERMISSIONED_CONTENT_OR_ASSET
OPERATOR_OBSERVATION
SYNTHETIC_TEST_ONLY_BINDING_OR_DEPLOYMENT_FACT
```

Each committed candidate input must be attributable to one class.

The pilot must never merge those classes into a document that makes synthetic integration state look like a real operational claim.

Git commit/tree identity remains source provenance. No IPFS/IPNS/CID publication is introduced by HV-7 merely to package evidence.

---

## 15. Required automated proof matrix for later implementation

A later staged implementation candidate must, where applicable, cover at least:

- authentic venue context validation;
- authentic venue package validation;
- explicit real-versus-synthetic binding provenance;
- deterministic HV-4 bootstrap output;
- venue/package/deployment identity mismatch rejection;
- secret/private-material rejection;
- no mandatory venue-type field or branching;
- no candidate-specific generic source fork;
- same generic rendering path used by Fourth Street, Lantern Room, and the HV-7 candidate;
- HV-5 ownership classification across the candidate document;
- direct-source no-op and representative valid edit;
- HV-6 no-op byte identity;
- HV-6 representative authentic operator edits;
- Apply/Discard/reload behavior;
- protected-field negative matrix;
- compatibility-seam containment checks for candidate-visible output;
- one-isolated-runtime composition;
- no live Hive write path added by the pilot;
- no production deployment path added by the pilot.

Any candidate-specific test helper must remain an evidence fixture. It may not become a hidden venue-specific application fork.

---

## 16. Later qualification requirements

### Preregistration candidate

This preregistration itself is documentation-only and must pass the repository's normal deterministic qualification on Ubuntu and Windows. Rendered UI and live-Hive smoke should remain scope-skipped unless the repository classifier independently says otherwise.

### Later staged implementation candidate

If separately authorized, a real-venue staged implementation must require at minimum:

```text
CLASSIFIER = PASS
UBUNTU_DETERMINISTIC = PASS
WINDOWS_DETERMINISTIC = PASS
SECRET_SCAN = PASS
PRODUCTION_DEPENDENCY_AUDIT = PASS
RELEASE_COHERENCE = PASS
FUNCTIONAL_V1_REGRESSION = PASS
HV7_FOCUSED_PROOF_MATRIX = PASS
RENDERED_CANDIDATE_EVIDENCE = PASS_IF_USER_VISIBLE_SCOPE_REQUIRES
LIVE_HIVE_WRITE = NOT_REQUIRED_AND_NOT_AUTHORIZED
PRODUCTION_MUTATION = NO
```

If a user-visible candidate changes rendering or authoring presentation and the classifier selects rendered evidence, that rendered gate is binding.

A real operator review is separate evidence and may not be fabricated by automated tests.

---

## 17. Hard failure and stop criteria

The affected HV-7 path must stop and be adjudicated before proceeding if any of the following occurs:

1. a specific venue is contacted without separately authorized outreach;
2. venue participation/permission is assumed rather than established;
3. private keys, secrets, credentials, private staff/customer records, or unpermissioned assets enter the pilot;
4. a real Hive account/community must be created to continue staged architecture testing;
5. a Hive write, payment, delegation, onboarding transaction, or live mutation becomes necessary before separate authorization;
6. a real provider/VPS/DNS/systemd change is required to produce the pre-admission evidence;
7. generic source must fork for the candidate;
8. a mandatory venue-type enum is introduced from the single candidate;
9. authentic venue requirements are rewritten to preserve a passing architecture result;
10. HV-1/HV-2/HV-3/HV-4/HV-5/HV-6 validation or authority is weakened;
11. candidate-visible generic semantics incorrectly require Fourth Street/bar identity;
12. shared runtime multi-tenancy is introduced;
13. a venue-specific request is promoted to generic platform scope without evidence;
14. operator review shows the authoring model materially unusable or misleading and the result is nevertheless called a pass;
15. real and synthetic evidence are mixed so that provenance is ambiguous;
16. a live production deployment is attempted.

---

## 18. Architecture adjudication outcomes

The final staged HV-7 adjudication must use one of these controlling dispositions:

```text
VALIDATED_FOR_ONE_REAL_ISOLATED_SECOND_VENUE
REQUIRES_PLATFORM_REPAIR_BEFORE_VALIDATION
INCONCLUSIVE__INSUFFICIENT_REAL_OPERATOR_OR_INTEGRATION_EVIDENCE
```

`VALIDATED_FOR_ONE_REAL_ISOLATED_SECOND_VENUE` means only that the accepted architecture survived one independently branded real venue under the frozen staged evidence boundary. It does not prove universal venue coverage, justify an exhaustive taxonomy, authorize fleet operations, or justify shared tenancy.

`REQUIRES_PLATFORM_REPAIR_BEFORE_VALIDATION` is a legitimate and useful result. Any repairs must be separately frozen, implemented, qualified, and then retested against the affected authentic evidence.

`INCONCLUSIVE` must be used when the evidence needed to decide the architecture was not obtained. Lack of permission, missing operator review, or synthetic-only integration evidence may limit a claim even when automated tests pass.

---

## 19. Explicit non-effects

HV-7 preregistration does not authorize or imply:

```text
A_SPECIFIC_REAL_VENUE
REAL_VENUE_ADMISSION
VENUE_OUTREACH
PUBLIC_LAUNCH
PRODUCTION_DEPLOYMENT
FOURTH_STREET_PRODUCTION_MUTATION
ACCOUNT_OR_COMMUNITY_CREATION
HIVE_DELEGATION_OR_AUTHORITY_CHANGE
HIVE_WRITE
PAYMENT_ACTIVATION_OR_MERCHANT_CHANGE
PRIVATE_KEY_OR_SECRET_CUSTODY
DNS_OR_CLOUDFLARE_CHANGE
VPS_OR_SYSTEMD_CHANGE
PRODUCTION_AUTHORING_MOUNT
SHARED_RUNTIME_MULTI_TENANCY
FLEET_ORCHESTRATION
HELIA_OR_ORBITDB
CID_OR_IPFS_PUBLICATION
IPNS_MUTATION
3SPEAK_OR_SPK_INTEGRATION
MANDATORY_VENUE_TYPE_TAXONOMY
```

The existing Fourth Street production compatibility namespace remains unchanged.

---

## 20. Preregistration acceptance gate

This preregistration must be qualified and then independently reviewed by the Project Lead before it becomes the accepted HV-7 experiment contract.

Acceptance should require findings that:

- the protocol can genuinely falsify the accepted architecture;
- the real/synthetic evidence boundary is explicit;
- participation and asset permission precede committed real-venue artifacts;
- candidate selection is read-only and evidence-driven;
- the operator-review protocol tests real usability rather than ceremonial approval;
- defect classification prevents both overgeneralization and architecture-protective minimization;
- all external-effect boundaries remain closed;
- one isolated venue per runtime remains the default under test.

If accepted, the next operation should be:

```text
HV7_REAL_ISOLATED_SECOND_VENUE_CANDIDATE_SELECTION__READ_ONLY
```

That operation may research and compare candidate venues using public information but may not contact them, create repository real-venue artifacts, or authorize implementation.

---

## 21. Preregistration conclusion

```text
HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT_PREREGISTRATION = FROZEN_CANDIDATE
SPECIFIC_REAL_VENUE = UNSELECTED
REAL_SECOND_VENUE_AUTHORIZED = NO
IMPLEMENTATION_AUTHORIZED = NO
EXTERNAL_EFFECTS_AUTHORIZED = NO
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
PROJECT_LEAD_ACCEPTANCE = REQUIRED_BEFORE_CANDIDATE_SELECTION
```

HV-7 should proceed only if this prospective contract survives qualification and Project Lead review. The objective is to learn whether the architecture is actually reusable, not to manufacture evidence that it is.