# Hive-Venues Documentation Index

This index points to documents needed to interpret the **current** successor state. Superseded sequencing, temporary holds, and intermediate routing are recoverable from Git history and are not required living documentation.

## Current documents

- `../README.md` — product/developer entry point and current source boundary.
- `ROADMAP.md` — current successor state and sequencing.
- `HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_CANDIDATE_ACCEPTANCE_0_1_0.md` — accepted exact deploy candidate and qualification result; production mutation remains unauthorized.
- `HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_DEPLOYMENT_PREREGISTRATION_0_1_0.md` — frozen HV-8 production-transition contract.
- `HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR_ACCEPTANCE_0_1_0.md` — accepted HV-7 Tier-A result.
- `HV7_SECOND_VENUE_NOMINEE_JUNIPER_WORKS_REQUIREMENTS_0_1_0.md` — frozen Juniper requirements.
- `HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_ACCEPTANCE_0_1_0.md` — accepted visual-authoring foundation.
- `HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md` — canonical authoring authority baseline.
- `HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md` — accepted isolated-runtime strategy.
- `PRODUCTION_OPERATIONS.md` — Fourth Street operating model.

## Current interpretation

HV-1 through HV-6 are accepted foundations. Juniper Works Cooperative is the validated **synthetic** second venue nominee; its 24 frozen requirements passed at Tier-A product-and-architecture evidence.

Current running Fourth Street identity is:

```text
BUILD = beta-fdb5b5b
COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c
ENVIRONMENT = production
WRITE_MODE = beta
READY = ready
```

The HV-8 deployment preregistration is frozen. Exact candidate `02ac081d2cfaee599f98e4fb8d9367638cd8d500` / tree `49b7b561af89fc99534d2a2974215bfe7a3db3c3` is Project-Lead accepted after full exact-candidate qualification. Production mutation remains unauthorized. Canonical integrated source is moving `main`; the deploy target is the frozen historical candidate, not moving `main`.

<!-- HV6_CURRENT_ROUTING_START -->
```text
SUCCESSOR_FOUNDATIONS = HV1_THROUGH_HV6_ACCEPTED
FOURTH_STREET_CLIENT_STATUS = FIRST_REAL_CLIENT__SOLE_REAL_CLIENT
FOURTH_STREET_DEPLOYMENT_STATUS = REFERENCE_DEPLOYMENT
HV7_SECOND_VENUE_NOMINEE = JUNIPER_WORKS_COOPERATIVE
HV7_SECOND_VENUE_NOMINEE_STATUS = VALIDATED__SYNTHETIC_TIER_A
HV7_REQUIREMENT_COUNT = 24
HV7_FROZEN_REQUIREMENT_ADJUDICATION = PASS__24_OF_24
HV8_CURRENT_RUNNING_BUILD = beta-fdb5b5b
HV8_CURRENT_RUNNING_COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
HV8_CURRENT_RUNNING_TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c
HV8_CURRENT_RUNNING_WRITE_MODE = beta
HV8_CURRENT_RUNNING_READY = ready
HV8_DEPLOYMENT_PREREGISTRATION = FROZEN_0_1_0
HV8_DEPLOY_CANDIDATE = 02ac081d2cfaee599f98e4fb8d9367638cd8d500
HV8_DEPLOY_CANDIDATE_TREE = 49b7b561af89fc99534d2a2974215bfe7a3db3c3
HV8_CANDIDATE_QUALIFICATION = PROJECT_LEAD_ACCEPTED
NEXT_OPERATION = HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE__PHASE_A_READ_ONLY_PRODUCTION_PREFLIGHT
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
PUBLIC_PRODUCTION_AUTHORING = NOT_AUTHORIZED
REAL_SECOND_VENUE_AUTHORIZED = NO
VENUE_OUTREACH = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```
<!-- HV6_CURRENT_ROUTING_END -->

## Current operation

```text
HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE__PHASE_A_READ_ONLY_PRODUCTION_PREFLIGHT
```

Phase A is read-only. It must freshly reconcile public deployment identity/readiness with operator-side `current`, bind `last-good`, and record only cryptographic hashes/non-secret metadata for the accepted beta and read-only environments. It must stop on ambiguity.

No deployment, service restart, environment/symlink mutation, Hive/Keychain write, payment/onboarding/moderation/V1 activation, public production authoring, secret/key change, infrastructure mutation, or venue outreach is authorized.
