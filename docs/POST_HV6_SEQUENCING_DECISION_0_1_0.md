# Post-HV-6 Sequencing Decision 0.1.0

## Status

```text
OPERATION = POST_HV6_SEQUENCING_DECISION__READ_ONLY
ROLE = PROJECT_LEAD_INDEPENDENT_PRODUCT_SEQUENCING
REPOSITORY = etblink/Hive-Venues
CANONICAL_READ_ONLY_BASE_COMMIT = c43e18b7b02f77a71d019aeb3066d7726da0aa7e
CANONICAL_READ_ONLY_BASE_TREE = a824027539d5cda9eaf0e21018e67f69e8784b78
POST_HV6_SEQUENCING_DECISION = PROJECT_LEAD_ACCEPTED
SELECTED_NEXT_LANE = REAL_ISOLATED_SECOND_VENUE_PILOT
PROPOSED_NEXT_MILESTONE = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT
NEXT_OPERATION = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT__PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
REAL_SECOND_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```

This record freezes the Project Lead's independent read-only sequencing decision after accepted HV-6. It selects the next product lane. It does **not** admit a real venue, authorize substantive HV-7 implementation, mutate production, or relax any existing signing, payment, secret-custody, infrastructure, or runtime-isolation boundary.

## 1. Decision question

The decision compared the plausible post-HV-6 lanes against the current evidence rather than treating prior recommendations as authority. The controlling question was which next operation maximizes product learning and falsification value without introducing unjustified architecture or external effects.

HV-1 through HV-6 already establish:

```text
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

Fourth Street remains the reference real venue. Lantern Room and other non-Fourth-Street evidence are synthetic/offline fixtures. The largest remaining uncertainty is therefore whether the accepted abstractions survive authentic independently branded operator requirements.

## 2. Candidate-lane adjudication

```text
REAL_ISOLATED_SECOND_VENUE_PILOT = SELECTED_NEXT_LANE
SUCCESSOR_PACKAGE_IDENTITY_CLEANUP = ELIGIBLE_ADJACENT_MAINTENANCE__NOT_SELECTED_PRODUCT_LANE
OPTIONAL_STARTER_ARCHETYPES = SUPPORTING_FIXTURES__NONAUTHORITATIVE
CID_IPFS_PUBLICATION = ELIGIBLE_DOWNSTREAM__NOT_SELECTED
IPNS_MUTABLE_NAMING = ELIGIBLE_AFTER_CID_ARTIFACT__NOT_SOURCE_IDENTITY
THREESPEAK_SPK_MEDIA = ELIGIBLE_DOWNSTREAM__NOT_SELECTED
FLEET_OPERATIONS = DEFERRED
HELIA_ORBITDB_REPLICATION = DEFERRED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
```

The real isolated second-venue lane dominates because it supplies the strongest direct opportunity to falsify venue neutrality, package ownership, bootstrap binding, authoring semantics, visual-authoring usability, and one-runtime-per-venue assumptions against requirements we did not invent ourselves.

Package/developer identity cleanup may remain useful maintenance, but it does not answer the principal product uncertainty. Starter archetypes risk manufacturing a taxonomy before independent evidence. CID/IPFS/IPNS and 3Speak/SPK are downstream capability lanes rather than direct tests of the accepted core abstractions. Fleet and replicated/shared-runtime machinery are premature before repeated real isolated-venue operation exists.

## 3. HV-7 milestone shape

The selected next milestone is:

```text
HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT
```

Its purpose is to try to break the accepted HV-1 through HV-6 architecture before trusting it across venues.

The first HV-7 operation is preregistration only. A later separately authorized operation may identify or admit a specific participating venue only after the preregistration defines evidence, consent/participation, data boundaries, fail-closed criteria, and the exact distinction between offline/staged validation and any external effect.

The intended falsification targets include at minimum:

- authentic venue identity and vocabulary fitting without a mandatory venue-type enum;
- no Fourth Street/bar semantics leaking into venue-visible generic product behavior;
- deterministic venue-context/package/deployment/bootstrap composition;
- HV-5 ownership classes remaining coherent for a real independent operator;
- HV-6 native visual authoring remaining understandable and subordinate to HV-5 authority;
- direct source/code authoring remaining independent;
- secret-safe documents and no accidental credential material;
- one isolated venue per runtime remaining sufficient without shared tenancy;
- any discovered platform defect being repaired in the platform rather than explained away by weakening the test.

## 4. Latent compatibility seam to probe

Current source intentionally carries historical compatibility surfaces alongside generic venue inputs. One concrete example is the mapping of generic `officialAccount` into the inherited compatibility field `officialBarAccount` inside `withVenueContext()`.

This decision does **not** classify that alias as a defect and does not authorize changing it. HV-7 should instead determine whether inherited compatibility vocabulary remains an internal compatibility detail or escapes into generic/venue-visible behavior under a genuinely non-bar venue.

## 5. Hard authorization boundary

Lane selection is not venue admission.

```text
HV7_PREREGISTRATION = NOT_YET_EXECUTED
HV7_IMPLEMENTATION = NOT_AUTHORIZED
REAL_SECOND_VENUE = UNSELECTED
REAL_SECOND_VENUE_AUTHORIZED = NO
REAL_SECOND_VENUE_ADMISSION = NOT_AUTHORIZED
ACCOUNT_CREATION = NOT_AUTHORIZED
HIVE_WRITE_AUTHORITY_CHANGE = NOT_AUTHORIZED
PAYMENT_AUTHORITY_CHANGE = NOT_AUTHORIZED
SECRET_OR_KEY_CUSTODY_CHANGE = NOT_AUTHORIZED
DNS_VPS_SYSTEMD_MUTATION = NOT_AUTHORIZED
PRODUCTION_AUTHORING_MOUNT = NOT_AUTHORIZED
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
```

A later HV-7 authorization must state explicitly which of these boundaries, if any, it changes. Silence never grants authority.

## 6. Canonical routing consequence

Once this decision and its routing reconciliation are accepted, the marked current-routing blocks in:

```text
README.md
docs/README.md
docs/ROADMAP.md
```

must agree on:

```text
POST_HV6_SEQUENCING_DECISION = PROJECT_LEAD_ACCEPTED
SELECTED_NEXT_LANE = REAL_ISOLATED_SECOND_VENUE_PILOT
PROPOSED_NEXT_MILESTONE = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT
NEXT_OPERATION = HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT__PREREGISTRATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
REAL_SECOND_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```

The prior `POST_HV6_LIVING_ROUTING_RECONCILIATION_0_1_0.md` remains a truthful historical record of the neutral pre-decision boundary and must not be rewritten to back-project this later decision.
