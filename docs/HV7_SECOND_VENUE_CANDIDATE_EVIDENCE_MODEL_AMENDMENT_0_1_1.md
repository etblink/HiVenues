# HV-7 Second-Venue Candidate Evidence Model — Amendment 0.1.1

## 1. Status

```text
OPERATION = HV7_SECOND_VENUE_CANDIDATE_EVIDENCE_MODEL_AMENDMENT
AMENDMENT_VERSION = 0.1.1
STATUS = PROSPECTIVE_AMENDMENT__QUALIFICATION_REQUIRED
REPOSITORY = etblink/Hive-Venues

CANONICAL_PARENT_COMMIT = 11f03eeff12b78e024b19c4afa9f0f9a4bfd94ff
CANONICAL_PARENT_TREE = c7cae0787533a73f858d9ced357100b560e3af1e
AMENDS = docs/HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT_PREREGISTRATION_0_1_0.md
AMENDED_PREREGISTRATION_VERSION = 0.1.0

FOURTH_STREET_BAR = SOLE_REAL_CLIENT_AND_REFERENCE_DEPLOYMENT
HV7_SECOND_VENUE_CANDIDATE = REAL_OR_SYNTHETIC_ALLOWED
SYNTHETIC_HV7_CANDIDATE = VALID_FOR_ARCHITECTURAL_FALSIFICATION
REAL_SECOND_VENUE_REQUIRED = NO
REAL_OPERATOR_PARTICIPATION_REQUIRED_FOR_ARCHITECTURAL_FALSIFICATION = NO
VENUE_OUTREACH_REQUIRED = NO
PUBLIC_CANDIDATE_RESEARCH_REQUIRED = NO

REAL_SECOND_VENUE_AUTHORIZED = NO
VENUE_OUTREACH = NOT_AUTHORIZED
HV7_IMPLEMENTATION = NOT_AUTHORIZED
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
```

This amendment records new authoritative product context received after canonical integration of the HV-7 preregistration and before acceptance of that preregistration.

The canonical 0.1.0 preregistration remains immutable historical evidence. This file does not rewrite it. Where this amendment conflicts with the 0.1.0 preregistration on whether the second-venue candidate must be real, whether real-operator participation is mandatory, or whether outreach/public candidate research is required, **this amendment supersedes the narrower requirement for all current and future HV-7 routing**.

All other compatible falsification, provenance, safety, authority, and defect-first requirements of the 0.1.0 preregistration remain in force.

---

## 2. Product clarification

Fourth Street Bar remains the project's sole real client and sole real venue deployment.

HV-7 is an architecture-falsification milestone, not a client-acquisition milestone.

Therefore the candidate universe is:

```text
HV7_CANDIDATE_UNIVERSE = {
  REAL_INDEPENDENT_VENUE,
  DELIBERATELY_CONSTRUCTED_SYNTHETIC_VENUE
}
```

A real independent venue is permitted but not required.

A synthetic venue is a fully valid HV-7 candidate when it is constructed to exert strong adversarial pressure against assumptions inherited from Fourth Street.

The experiment must not prefer a real candidate merely because “real” sounds more rigorous. Evidence strength depends on the proposition being tested.

A well-constructed synthetic venue may provide stronger controlled evidence about architecture generality than an opportunistically available real venue whose requirements happen to resemble Fourth Street.

---

## 3. Corrected controlling question

The controlling HV-7 question is amended to:

> Can one materially independent second-venue requirement set—real or deliberately synthetic—pass through the accepted isolated Hive-Venues composition and authoring model without source forks, Fourth Street/bar semantic leakage, invented taxonomy, hidden authority escalation, or premature architectural complexity?

The test must remain capable of answering **no**.

For a synthetic candidate, the relevant independence is not corporate or legal independence. It is **requirement independence** from the Fourth Street-derived architecture.

The candidate must be designed before implementation so its requirements cannot be quietly relaxed after the platform encounters difficulty.

---

## 4. Evidence tiers

HV-7 now distinguishes architecture evidence from adoption/usability evidence.

### 4.1 Tier A — synthetic architectural falsification

A synthetic candidate may validly test:

```text
VENUE_LANGUAGE_NEUTRALITY
NO_FOURTH_STREET_OR_BAR_LEAKAGE
NO_GENERIC_SOURCE_FORK
HV1_VENUE_CONTEXT_GENERALITY
HV2_DEPLOYMENT_PROFILE_GENERALITY
HV3_VENUE_PACKAGE_GENERALITY
HV4_BOOTSTRAP_COMPOSITION_GENERALITY
HV5_OWNERSHIP_MODEL_FIT
HV6_VISUAL_AUTHORING_STRUCTURAL_GENERALITY
ISOLATED_RUNTIME_SUFFICIENCY
COMPATIBILITY_SEAM_CONTAINMENT
DETERMINISTIC_COMPOSITION
FAIL_CLOSED_VALIDATION
SECRET_AND_AUTHORITY_BOUNDARIES
```

A synthetic candidate can falsify these propositions because they are properties of the architecture and its handling of a frozen independent requirement set.

### 4.2 Tier B — real independent operator / client evidence

The following conclusions require evidence from a real independent venue/operator and **may not** be claimed from a synthetic candidate:

```text
REAL_CLIENT_ADOPTION = NOT_ESTABLISHED_BY_SYNTHETIC_HV7
REAL_OPERATOR_USABILITY = NOT_ESTABLISHED_BY_SYNTHETIC_HV7
REAL_VENUE_PERMISSION = NOT_ESTABLISHED_BY_SYNTHETIC_HV7
REAL_VENUE_ADMISSION = NOT_ESTABLISHED_BY_SYNTHETIC_HV7
REAL_WORLD_OPERATIONAL_FIT = NOT_ESTABLISHED_BY_SYNTHETIC_HV7
REAL_EXTERNAL_DEPLOYMENT_READINESS = NOT_ESTABLISHED_BY_SYNTHETIC_HV7
REAL_HIVE_ONBOARDING = NOT_ESTABLISHED_BY_SYNTHETIC_HV7
REAL_PAYMENT_OR_MERCHANT_INTEGRATION = NOT_ESTABLISHED_BY_SYNTHETIC_HV7
```

Tier B remains a later stronger evidence tier if and when another real client exists or a separately authorized real-venue pilot becomes appropriate.

Tier A completion does not imply Tier B completion.

---

## 5. Synthetic-candidate adversariality gate

A synthetic candidate is invalid if it is merely a reskinned Fourth Street fixture or is designed around what the current architecture already handles easily.

Before implementation, the candidate must freeze a requirement packet that differs materially from Fourth Street across multiple independent dimensions.

At minimum, the packet must pressure:

1. **Vocabulary.** Public and operator language must not inherit bar-specific nouns, verbs, roles, or participation metaphors merely because Fourth Street uses them.
2. **Operating model.** The organization should conduct a materially different kind of recurring real-world activity or service.
3. **Content structure.** The candidate should require a meaningfully different public-information hierarchy or authored-content emphasis.
4. **Customer/member relationship.** The relationship between the venue and its patrons, members, guests, participants, or community should differ materially from a neighborhood bar model.
5. **Operator needs.** The ordinary operator should need to express and maintain different facts, calls to action, vocabulary, and content priorities.
6. **Integration assumptions.** Hive, merchant, deployment, and account bindings must remain explicit rather than being inferred from Fourth Street conventions.
7. **Presentation semantics.** The visual-authoring projection must remain useful without relying on Fourth Street imagery or bar-layout assumptions.
8. **Compatibility pressure.** Historical compatibility names may remain inside explicit reference/compatibility boundaries but must not leak into generic or candidate-facing authority.

The requirement packet must be frozen before platform implementation work begins.

After freeze, requirements may be corrected only for factual/internal inconsistency, not because the platform finds them inconvenient.

---

## 6. Anti-convenience rule

A synthetic candidate is not allowed to become a platform-authored answer key.

Forbidden after requirement freeze:

```text
REWORD_REQUIREMENT_TO_MATCH_EXISTING_SCHEMA
REMOVE_DIFFICULT_REQUIREMENT_WITHOUT_FINDING
ADD_BAR_LIKE_SEMANTICS_TO_EASE_COMPOSITION
CREATE_VENUE_TYPE_ENUM_TO_FORCE_CLASSIFICATION
ADD_GENERIC_SOURCE_FORK_FOR_SYNTHETIC_CANDIDATE
WEAKEN_HV5_OWNERSHIP_TO_MAKE_EDIT_PASS
WEAKEN_HV1_HV3_OR_HV4_VALIDATION_TO_MAKE_FIXTURE_PASS
INTRODUCE_SHARED_RUNTIME_MULTI_TENANCY_TO_AVOID_ISOLATED_RUNTIME_PRESSURE
CLAIM_OPERATOR_USABILITY_FROM_PROJECT_TEAM_SELF_REVIEW
```

If the frozen candidate exposes a defect, freeze and classify the defect before any remediation.

A synthetic fixture that fails is successful experimental evidence.

---

## 7. Candidate provenance

Synthetic evidence must be labeled synthetic everywhere it matters.

A later candidate packet should record at minimum:

```text
CANDIDATE_PROVENANCE = SYNTHETIC
CANDIDATE_REAL_CLIENT = NO
CANDIDATE_REAL_OPERATOR = NO
CANDIDATE_PERMISSION_REQUIRED = NO_FOR_SYNTHETIC_PROJECT_OWNED_CONTENT
CANDIDATE_REQUIREMENT_FREEZE = REQUIRED
CANDIDATE_EXTERNAL_EFFECT = NONE
```

Synthetic venue names, identities, Hive bindings, payment identities, infrastructure facts, addresses, people, and media must not impersonate a real venue or real person.

Synthetic account/community/deployment identifiers must be unmistakably test-only where used.

The candidate may use project-created media or other assets with clear permission. It must not copy a real venue's protected brand/media merely to make the synthetic venue appear realistic.

---

## 8. Real-candidate branch remains available but optional

If a later Project Lead decision selects a real candidate, the original 0.1.0 participation, permission, data, asset, and external-effect boundaries remain applicable to that real-candidate branch of HV-7.

For a real candidate:

```text
PUBLIC_RESEARCH != PERMISSION
PERMISSION_TO_PARTICIPATE != PRODUCTION_ADMISSION
PILOT_PERMISSION != HIVE_ACCOUNT_CREATION_AUTHORITY
PILOT_PERMISSION != PAYMENT_AUTHORITY
PILOT_PERMISSION != PUBLIC_DEPLOYMENT_AUTHORITY
```

Nothing in this amendment authorizes outreach.

No real candidate needs to be found merely to keep HV-7 moving.

---

## 9. Operator-usability evidence correction

HV-6 already provides automated and Project-Lead evidence about the generic visual-authoring foundation.

HV-7 synthetic execution may further test structural generality of that editor against a different frozen requirement set, including:

- whether all candidate-owned fields are reachable through the generic semantic path;
- whether candidate vocabulary appears without bar leakage;
- whether protected/integration-owned state remains outside ordinary edit authority;
- whether Preview, Apply, and Discard preserve their accepted semantics;
- whether the same generic implementation path can project the candidate.

However, self-use by the Project Lead or project team is not evidence of independent real-operator usability.

Therefore:

```text
SYNTHETIC_HV7_HV6_RESULT = STRUCTURAL_GENERALITY_EVIDENCE_ONLY
INDEPENDENT_REAL_OPERATOR_USABILITY = DEFERRED_UNTIL_REAL_OPERATOR_EVIDENCE_EXISTS
```

A later real-client evidence tier may perform the stronger human-usability validation without reopening completed architectural proofs unless new evidence requires it.

---

## 10. Supersession matrix

The following 0.1.0 requirements are superseded for current HV-7 interpretation:

| 0.1.0 concept | Amended controlling rule |
| --- | --- |
| Candidate must be a real independently operated venue | Candidate may be real or deliberately synthetic |
| Independent brand/operator reality is mandatory | Requirement independence and adversariality are mandatory; real operator identity is optional |
| Later public candidate comparison is necessary | Not required; synthetic design may be selected without public candidate research |
| Potential real-operator participation is mandatory | Required only for claims that rely on real-operator evidence |
| Participation/consent gate is mandatory before HV-7 can proceed | Mandatory only if a real candidate or real venue-owned material/operator evidence is used |
| Real-venue composition is the necessary implementation target | Synthetic staged composition is valid for Tier-A architecture falsification |
| Inability to obtain participation makes HV-7 insufficient | Only blocks Tier-B real-operator/client conclusions; it does not block Tier-A synthetic architecture testing |

The following 0.1.0 requirements remain controlling:

- falsifiability;
- one isolated venue per runtime as the architecture under test;
- no generic venue-type taxonomy;
- no source fork;
- explicit venue/package/deployment bindings;
- HV-5 ownership authority;
- HV-6 subordination to HV-5;
- compatibility-seam containment;
- exact real-versus-synthetic provenance;
- defect-first freezing and classification;
- secret/private-key exclusion;
- no production mutation;
- no Hive writes/account creation/payment authority;
- no hidden external effects;
- no shared-runtime multi-tenancy without new evidence and authorization.

---

## 11. Routing consequence

The historical Post-HV-6 token:

```text
REAL_ISOLATED_SECOND_VENUE_PILOT
```

was selected before this clarification and should remain preserved in its historical decision artifact.

For current routing, its controlling meaning is superseded by:

```text
ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT
CANDIDATE_MODE = REAL_OR_SYNTHETIC_ALLOWED
```

Likewise, the historical milestone title `HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT` remains a preserved identifier for the already-integrated 0.1.0 artifact, but current routing should use a neutral successor identity after this amendment is accepted.

Recommended current milestone identity after acceptance:

```text
HV7_ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT
```

No living-routing surface should be changed by this amendment candidate before the amendment itself is qualified, integrated, and independently accepted.

---

## 12. Project Lead sequencing implication

This amendment does not itself select the exact synthetic candidate design and does not authorize implementation.

After acceptance, the scientifically strongest low-external-effect next operation is expected to be a bounded candidate-design decision that may choose a synthetic adversarial venue without public research or outreach.

The next operation should freeze the candidate's identity-neutral requirement packet before implementation.

A suitable shape is:

```text
NEXT_OPERATION_AFTER_AMENDMENT_ACCEPTANCE = HV7_ADVERSARIAL_SECOND_VENUE_CANDIDATE_DESIGN__READ_ONLY
IMPLEMENTATION_AUTHORIZED = NO
OUTREACH_AUTHORIZED = NO
EXTERNAL_EFFECTS_AUTHORIZED = NO
```

The design operation should prefer falsification pressure over realism theater.

---

## 13. Non-effects

This amendment does not authorize:

```text
REAL_VENUE_RECRUITMENT
REAL_VENUE_OUTREACH
REAL_VENUE_ADMISSION
REAL_VENUE_ASSET_USE_WITHOUT_PERMISSION
PRODUCTION_DEPLOYMENT
HIVE_ACCOUNT_OR_COMMUNITY_CREATION
HIVE_WRITE
PAYMENT_OR_MERCHANT_ACTIVATION
PRIVATE_KEY_OR_SECRET_CUSTODY
DNS_OR_VPS_MUTATION
PRODUCTION_AUTHORING_MOUNT
SHARED_RUNTIME_MULTI_TENANCY
HV7_IMPLEMENTATION
```

Fourth Street remains the only real client and reference deployment.

---

## 14. Amendment conclusion

```text
FOURTH_STREET_BAR = SOLE_REAL_CLIENT_AND_REFERENCE_DEPLOYMENT
HV7_SECOND_VENUE_CANDIDATE = REAL_OR_SYNTHETIC_ALLOWED
SYNTHETIC_HV7_CANDIDATE = VALID_FOR_ARCHITECTURAL_FALSIFICATION
SYNTHETIC_HV7_CANDIDATE_REAL_ADOPTION_EVIDENCE = NO
SYNTHETIC_HV7_CANDIDATE_REAL_OPERATOR_USABILITY_EVIDENCE = NO
SYNTHETIC_HV7_CANDIDATE_REAL_PERMISSION_EVIDENCE = NO
SYNTHETIC_HV7_CANDIDATE_REAL_VENUE_ADMISSION_EVIDENCE = NO

REAL_SECOND_VENUE_REQUIRED = NO
VENUE_OUTREACH_REQUIRED = NO
PUBLIC_CANDIDATE_RESEARCH_REQUIRED = NO

CURRENT_ROUTING_AFTER_ACCEPTANCE = ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT
NEXT_OPERATION_AFTER_ACCEPTANCE = HV7_ADVERSARIAL_SECOND_VENUE_CANDIDATE_DESIGN__READ_ONLY
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
```

This is the minimum prospective correction needed to preserve the historical 0.1.0 record while preventing its now-superseded real-venue requirement from becoming the controlling product constraint.