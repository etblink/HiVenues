# Hive-Venues

Hive-Venues is a successor platform for independently branded venue-native community and social applications on Hive. It preserves the strongest security, payment, social, accessibility, release, and operating work from the original Hive-Bar application while separating reusable platform machinery from venue identity, authored venue expression, and deployment policy.

**Fourth Street Bar in Reno is a real venue, Hive-Venues' first real client, its first venue nominee, and the reference deployment.** It remains the sole real client. Fourth Street is not the platform identity, and Hive-Venues does not require a universal venue-type taxonomy.

## Current successor state

HV-1 through HV-6 are accepted foundations. HV-7 validated **Juniper Works Cooperative** as a synthetic second-venue nominee: all 24 frozen requirements passed at **Tier-A product-and-architecture evidence**. Juniper remains synthetic evidence, not another real client or deployment.

Current Fourth Street production remains:

```text
BUILD = beta-fdb5b5b
COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c
ENVIRONMENT = production
WRITE_MODE = beta
READY = ready
```

The HV-8 deployment preregistration is frozen. Exact candidate `02ac081d2cfaee599f98e4fb8d9367638cd8d500` / tree `49b7b561af89fc99534d2a2974215bfe7a3db3c3` passed the full deployed-to-candidate qualification envelope and is the frozen deploy candidate. **Production deployment is not authorized.** The next operation is the preregistered read-only Phase-A production-entry preflight.

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

Phase A is observational only. It must freshly bind public health/build/commit/tree/readiness to operator-side `current`, identify and bind `last-good`, and record only cryptographic hashes/non-secret metadata for the active accepted beta environment and accepted read-only environment. Any ambiguity is a stop condition.

No source deployment, service restart, environment change, current/last-good mutation, Hive/Keychain write, payment/Distriator/onboarding/moderation/V1 activation, production visual-authoring mount, secret/key change, DNS/VPS/systemd mutation, or venue outreach is authorized.

## Accepted architecture

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

HV-5 remains the editor-independent canonical authoring authority. HV-6 remains subordinate to it. HV-7 adds bounded structured collection and validated theme authority. Protected identity, Hive/security/payment/deployment authority, and gallery topology remain outside ordinary venue editing.

## Assurance boundary

- Hive Keychain remains the user-side signing/custody boundary.
- The server holds no Hive private keys and has no Hive broadcast RPC implementation.
- User-owned writes require explicit review before signing.
- Ambiguous post-Keychain acceptance is never automatically rebroadcast.
- Payment replay/idempotency/receipt/confirmation boundaries remain fail-closed.
- Release identity and rollback remain exact.
- Source capability presence does not imply production activation.
- Source advancement does not imply production deployment.

## Source identity versus production identity

Canonical source is moving `main` in `etblink/Hive-Venues`; the HV-8 deploy target is the exact frozen historical commit/tree above, not moving `main`.

Fourth Street intentionally retains provenance-bearing compatibility names such as `/opt/hive-bar`, `hive-bar.service`, `.hive-bar-commit`, `.hive-bar-tree`, the Fourth Street host, and its Hive application tag. Those names are production/provenance seams, not the platform product identity.

## Development

Pinned runtime:

```text
Node.js 24.19.0
npm 11.17.0
```

Qualification baseline:

```bash
npm ci --ignore-scripts --no-fund
npx --no-install patch-package
npm run check
```

## Current documentation

For current state use:

1. `README.md`
2. `docs/ROADMAP.md`
3. `docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_CANDIDATE_ACCEPTANCE_0_1_0.md`
4. `docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_DEPLOYMENT_PREREGISTRATION_0_1_0.md`
5. `docs/HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR_ACCEPTANCE_0_1_0.md`
6. `docs/HV7_SECOND_VENUE_NOMINEE_JUNIPER_WORKS_REQUIREMENTS_0_1_0.md`
7. `docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_ACCEPTANCE_0_1_0.md`
8. `docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md`
9. `docs/HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md`
10. `docs/PRODUCTION_OPERATIONS.md` when production is involved.

Superseded sequencing and transient evidence are recoverable from Git history rather than being required living documents.
