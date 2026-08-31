# HV-7 Real Isolated Second-Venue Pre-Admission Pilot — Preregistration Acceptance 0.1.0

## Status

```text
OPERATION = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT_PREREGISTRATION_ACCEPTANCE
ROLE = PROJECT_LEAD_INDEPENDENT_REVIEW_AND_ACCEPTANCE
REPOSITORY = etblink/Hive-Venues

PREREGISTRATION_COMMIT = 11f03eeff12b78e024b19c4afa9f0f9a4bfd94ff
PREREGISTRATION_TREE = c7cae0787533a73f858d9ced357100b560e3af1e
PREREGISTRATION_PATH = docs/HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT_PREREGISTRATION_0_1_0.md
PREREGISTRATION_BLOB = ba55f48e566665fd1ae4e30cf0a2a195fc9b1734
QUALIFICATION_PR = 81
QUALIFICATION_CI_RUN = 33420660617
CANONICAL_PUSH_CI_RUN = 33420907827

PROJECT_LEAD_PREREGISTRATION_REVIEW = PASS
HV7_PREREGISTRATION = ACCEPTED
SPECIFIC_REAL_VENUE = UNSELECTED
VENUE_CANDIDATE_SELECTION = NOT_EXECUTED
REAL_SECOND_VENUE_AUTHORIZED = NO
VENUE_OUTREACH = NOT_AUTHORIZED
IMPLEMENTATION_AUTHORIZED = NO
EXTERNAL_EFFECTS_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME

NEXT_OPERATION = HV7_REAL_ISOLATED_SECOND_VENUE_CANDIDATE_SELECTION__READ_ONLY
```

This record accepts the prospective HV-7 experiment contract after independent Project Lead review. It accepts **the protocol**, not a venue. No specific venue is selected or authorized, no outreach is authorized, no real-venue repository artifact is authorized, and no staged or live implementation is authorized by this acceptance.

## 1. Exact qualification and transfer evidence

The preregistration candidate contained exactly one new documentation path and was qualified before canonical transfer.

```text
CLASSIFIER = PASS
UBUNTU_DETERMINISTIC = PASS
WINDOWS_DETERMINISTIC = PASS
UBUNTU_TESTS = 612_PASS__0_FAIL
SECRET_SCAN = PASS__486_REPOSITORY_FILES_CHECKED
PRODUCTION_AUDIT = 0_VULNERABILITIES
RENDERED = SKIPPED_BY_SCOPE
LIVE_HIVE = SKIPPED_BY_SCOPE
```

The GitHub pull-request synthetic merge commit used by qualification was:

```text
QUALIFICATION_SYNTHETIC_MERGE_COMMIT = b3c18a4db3fbcfc91886c7cee15987c6463cf77f
QUALIFICATION_SYNTHETIC_MERGE_TREE = c7cae0787533a73f858d9ced357100b560e3af1e
```

That tree exactly equaled the preregistration candidate tree. Canonical `main` was rechecked immediately before transfer and remained the exact preregistration parent:

```text
PARENT_COMMIT = 352ac15a32ad7c1fb9cdd0ea54a7ade9870f414e
PARENT_TREE = faf4facd4c204261b24c38c0fbe1efc49eeabea6
```

The qualified preregistration commit was then fast-forwarded exactly to `main`. GitHub PR #81 recorded the exact head SHA as its merged commit rather than introducing a new merge commit.

The resulting canonical source identity was:

```text
CANONICAL_PREREGISTRATION_COMMIT = 11f03eeff12b78e024b19c4afa9f0f9a4bfd94ff
CANONICAL_PREREGISTRATION_TREE = c7cae0787533a73f858d9ced357100b560e3af1e
```

The fresh canonical push CI run at that exact head independently completed successfully on Ubuntu and Windows. Rendered UI evidence and live-Hive smoke remained correctly skipped by the changed-path classifier.

## 2. Independent Project Lead findings

### 2.1 The experiment is genuinely falsifiable

The preregistration does not ask whether a second venue can be decorated until it looks different from Fourth Street. It asks whether authentic independently supplied venue facts, vocabulary, authored expression, and operator requirements can pass through the accepted HV-1 through HV-6 model **without** source forks, semantic leakage, invented taxonomy, authority weakening, or premature production work.

The contract explicitly permits the controlling answer to be `REQUIRES_PLATFORM_REPAIR_BEFORE_VALIDATION` or `INCONCLUSIVE__INSUFFICIENT_REAL_OPERATOR_OR_INTEGRATION_EVIDENCE`. A positive result is therefore not baked into the protocol.

This is the central acceptance condition.

### 2.2 Candidate selection, participation, admission, and implementation are correctly separated

The preregistration freezes a staged evidence sequence:

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

This prevents a common category error: treating public research about a venue as permission to represent it, treating permission to participate as production admission, or treating an offline architecture experiment as a live deployment authorization.

The distinction is both scientifically useful and operationally necessary.

### 2.3 The real-versus-synthetic provenance boundary is unusually important and correctly frozen

A real candidate may not already possess Hive accounts, a Hive community, payment identity, or deployment infrastructure. The preregistration correctly refuses to create those resources merely to make an experiment look complete.

Instead, a later separately authorized staged implementation may use clearly identified synthetic test-only integration/deployment bindings where needed, while preserving these claims:

```text
SYNTHETIC_BINDING != REAL_VENUE_HIVE_ONBOARDING
SYNTHETIC_DEPLOYMENT != REAL_VENUE_DEPLOYMENT_READINESS
PUBLIC_FACT != PERMISSIONED_ASSET
PUBLIC_RESEARCH != OPERATOR_APPROVAL
```

This is a strong epistemic boundary. It allows architecture testing without fabricating a real operational state.

### 2.4 The venue-neutrality test is appropriately adversarial

The protocol prefers a meaningfully different candidate, with a non-bar or otherwise materially distinct venue carrying high falsification value, without turning that preference into a canonical venue taxonomy.

It also freezes known inherited compatibility seams as test targets rather than prejudging them as bugs. In particular, the historical `officialBarAccount` compatibility alias and inherited Hive-Bar/Fourth-Street deployment vocabulary are allowed to remain where they are explicit compatibility facts; the actual failure condition is leakage into generic authority or candidate-facing semantics.

That distinction is correct. Removing every historical string in advance would destroy evidence about whether the abstraction actually contains the compatibility boundary.

### 2.5 The finding taxonomy prevents both overgeneralization and minimization

The preregistration requires material mismatches to be classified among categories including:

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

This is proportionate. It prevents one venue preference from becoming an invented universal feature while also preventing a genuine generic defect from being dismissed as customization.

### 2.6 The defect-first rule protects the truth of the experiment

If authentic evidence breaks the architecture, the protocol requires the affected path to stop, evidence to be frozen, the finding to be classified, and any platform repair to be separately authorized and requalified before the affected proof is repeated.

The preregistration expressly forbids:

- rewriting the venue requirement to make the schema pass;
- adding a venue-specific generic source fork;
- weakening validation or ownership rules;
- expanding ordinary-operator authority for convenience;
- manufacturing a universal venue taxonomy from one case;
- introducing shared tenancy to avoid an isolated-runtime inconvenience.

This is the right anti-bias mechanism. A defect is useful evidence, not an embarrassment to be hidden.

### 2.7 Human operator evidence has real veto power

The planned operator review is not ceremonial acceptance. It asks an authorized participant to perform representative authentic venue tasks, distinguish editable from protected state, exercise Preview/Discard/Apply, encounter safe validation, and describe the ownership model in ordinary language.

The protocol requires recording developer intervention, confusing terminology, ownership mismatch, inherited bar vocabulary, and unrepresentable essential requirements. It explicitly states that a green automated suite cannot override a clear operator-facing failure.

That makes HV-7 a product test rather than only a schema test.

### 2.8 The privacy, asset, and custody boundary is sound

The protocol excludes private Hive keys, seed phrases, Keychain/session/provider credentials, DNS/SSH secrets, private payment data, private staff/customer records, unpublished personal contact information, and credential-bearing screenshots.

It also correctly rejects the proposition that an asset is reusable merely because it is publicly discoverable. Real venue-owned content and media require the later permission boundary before they are committed as pilot artifacts.

The pilot therefore has no legitimate reason to take custody of secrets.

### 2.9 The one-isolated-runtime architecture remains a hypothesis under test, not a dogma

HV-7 keeps `ONE_ISOLATED_VENUE_PER_RUNTIME` as the default architecture and specifically tests whether it is sufficient for the candidate. It does not pre-authorize shared request-time tenancy, fleet orchestration, Helia/OrbitDB replication, or cross-venue mutable state.

If isolated runtime composition fails for a genuine generic reason, that may become evidence for a later architectural decision. HV-7 itself must not jump ahead to the more complex architecture merely because it exists as an option.

### 2.10 The preregistration is sufficiently precise without pre-implementing the pilot

The contract freezes evidence provenance, candidate criteria, permission gates, hypotheses, finding classes, operator tasks, failure criteria, qualification gates, and final adjudication outcomes. It deliberately does not choose the actual candidate venue, invent its requirements, choose its Hive identities, define a public deployment, or dictate code changes before the evidence exists.

Additional implementation detail at this point would begin to pre-decide the experiment rather than strengthen it.

## 3. Accepted non-effects

Acceptance of this preregistration does not authorize or imply:

```text
A_SPECIFIC_REAL_VENUE
VENUE_OUTREACH_OR_CONTACT
VENUE_PARTICIPATION_OR_CONSENT
REAL_VENUE_REPOSITORY_ARTIFACT
REAL_VENUE_ADMISSION
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
HV7_STAGED_IMPLEMENTATION
```

Fourth Street production remains unchanged.

## 4. Accepted next operation

The next operation is:

```text
HV7_REAL_ISOLATED_SECOND_VENUE_CANDIDATE_SELECTION__READ_ONLY
```

That operation may use current public information to identify and compare plausible candidate venues against the frozen criteria. It may record a selected **candidate** because candidate selection itself is the purpose of that operation.

It may not:

- contact a venue or operator;
- claim participation or consent;
- commit venue-owned media or permission-dependent content as a pilot artifact;
- create a real venue context/package/bootstrap implementation artifact;
- create Hive accounts or communities;
- create deployment infrastructure;
- perform Hive writes or payments;
- authorize staged implementation;
- admit a venue to production.

The candidate-selection record should preserve exact public-source provenance, compare multiple plausible candidates, prefer falsification value over convenience, and explain why the selected candidate provides the strongest expected information gain.

If public evidence is insufficient to distinguish candidates responsibly, the read-only operation should return `NO_CANDIDATE_SELECTED__INSUFFICIENT_PUBLIC_EVIDENCE` rather than invent a result.

## 5. Acceptance conclusion

```text
HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT_PREREGISTRATION = ACCEPTED
PROJECT_LEAD_FINDING = PROSPECTIVE_REAL_VENUE_FALSIFICATION_CONTRACT_IS_SOUND_AND_PROPORTIONATE
SPECIFIC_REAL_VENUE = UNSELECTED
VENUE_CANDIDATE_SELECTION = NOT_EXECUTED
REAL_SECOND_VENUE_AUTHORIZED = NO
VENUE_OUTREACH = NOT_AUTHORIZED
IMPLEMENTATION_AUTHORIZED = NO
EXTERNAL_EFFECTS_AUTHORIZED = NO
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
NEXT_OPERATION = HV7_REAL_ISOLATED_SECOND_VENUE_CANDIDATE_SELECTION__READ_ONLY
```

The project should proceed to read-only candidate selection only after this acceptance itself is qualified and canonically integrated, followed by any minimum living-routing reconciliation required to make current machine-readable routing truthful.