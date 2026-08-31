# Hive-Venues

Hive-Venues is a successor platform for independently branded venue-native community and social applications on Hive. It preserves the strongest security, payment, social, accessibility, release, and operating work from the original Hive-Bar application while separating reusable platform machinery from venue identity, authored venue expression, and deployment policy.

**Fourth Street Bar in Reno is a real venue, Hive-Venues' first real client, its first venue nominee, and the reference deployment.** It is currently the sole real client, but client status, nominee status, and deployment status are distinct product concepts. Fourth Street is not the platform identity. The platform does not currently require a universal venue-type taxonomy; venue-specific vocabulary belongs in venue-owned configuration rather than a guessed platform enum.

## Current successor state

The first six successor architecture/product-foundation milestones are accepted:

- **HV-1 — Venue Context Foundation**
- **HV-2 — Reference Deployment Profile Extraction**
- **HV-3 — Reference Venue Package Extraction**
- **HV-4 — Isolated Venue Bootstrap Foundation**
- **HV-5 — Venue Authoring Contract Foundation**
- **HV-6 — Operator Visual Authoring Adapter Foundation**

HV-6 is canonically accepted. Its bounded technology comparison selected the **native existing stack** and rejected GrapesJS Core as the foundation choice; GrapesJS Studio SDK remains unselected. The selected native foundation remains subordinate to the HV-5 authoring document and `applyOrdinaryOperatorEdit(base, proposed)`.

<!-- HV6_CURRENT_ROUTING_START -->
```text
HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION = ACCEPTED
HV6_PHASE_B_TECHNOLOGY_SELECTION = COMPLETE
SELECTED_ADAPTER = NATIVE_EXISTING_STACK
HV6_PHASE_C_IMPLEMENTATION_AUTHORIZATION = HISTORICAL_ACCEPTED__EXHAUSTED_BY_ACCEPTED_IMPLEMENTATION
HV6_PHASE_C_IMPLEMENTATION = ACCEPTED
POST_HV5_SEQUENCING_DECISION = HISTORICAL_ACCEPTED__SUPERSEDED_FOR_CURRENT_ROUTING
POST_HV6_SEQUENCING_DECISION = PROJECT_LEAD_ACCEPTED
HV7_CANDIDATE_EVIDENCE_MODEL_AMENDMENT = ACCEPTED
POST_HV6_SELECTED_LANE_LABEL = HISTORICAL_ACCEPTED__SUPERSEDED_BY_HV7_EVIDENCE_MODEL_AMENDMENT
FOURTH_STREET_VENUE_STATUS = REAL_VENUE
FOURTH_STREET_CLIENT_STATUS = FIRST_REAL_CLIENT__SOLE_REAL_CLIENT
FOURTH_STREET_NOMINEE_STATUS = FIRST_VENUE_NOMINEE
FOURTH_STREET_DEPLOYMENT_STATUS = REFERENCE_DEPLOYMENT
HV7_SECOND_VENUE_PRODUCT_ROLE = SECOND_VENUE_NOMINEE
HV7_SECOND_VENUE_NOMINEE_STATUS = DESIGN_PENDING__SYNTHETIC_ALLOWED
SELECTED_NEXT_LANE = ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT
HV7_CANDIDATE_MODE = SYNTHETIC_ADVERSARIAL
HV7_ADVERSARIAL_INTERPRETATION = PRODUCT_CREDIBLE_FALSIFICATION__NOT_MAXIMIZED_INCOMPATIBILITY
HV7_DESIGN_METHOD = ARCHITECTURE_AWARE_PRODUCT_FIRST
HV7_ARTIFICIAL_BLINDNESS = NOT_REQUIRED
HV7_REQUIREMENTS_FREEZE_BEFORE_IMPLEMENTATION = REQUIRED
HV7_POST_FREEZE_REQUIREMENT_REWRITE_TO_FORCE_PLATFORM_FIT = FORBIDDEN
PROPOSED_NEXT_MILESTONE = HV7_ADVERSARIAL_ISOLATED_SECOND_VENUE_PILOT
NEXT_OPERATION = HV7_ADVERSARIAL_SECOND_VENUE_CANDIDATE_DESIGN__READ_ONLY
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED
GRAPESJS_STUDIO_SDK = NOT_SELECTED
REAL_SECOND_VENUE_REQUIRED = NO
REAL_SECOND_VENUE_AUTHORIZED = NO
VENUE_OUTREACH = NOT_AUTHORIZED
SYNTHETIC_HV7_REAL_OPERATOR_USABILITY_EVIDENCE = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```
<!-- HV6_CURRENT_ROUTING_END -->

The historical Post-HV-6 Sequencing Decision remains accepted exactly as recorded. Its original `REAL_ISOLATED_SECOND_VENUE_PILOT` label is preserved in that historical artifact. The later accepted HV-7 candidate-evidence-model amendment supersedes the narrow real-only interpretation for **current routing**: HV-7 is establishing a **second venue nominee**, real or synthetic nominees are allowed, and the Project Lead has selected a **synthetic adversarial** evidence mode for the next product-design experiment.

Here, **adversarial** means that the nominee must be capable of exposing bad abstractions; it does not mean maximizing incompatibility or inventing an edge case for its own sake. The nominee must be product-credible, internally coherent, meaningfully different from Fourth Street, desirable for Hive-Venues to support, and realistic as a future client type. Project Lead design is architecture-aware: existing source and accepted architecture may be inspected and used normally. The protection against confirmation bias is to design the venue on its own terms, freeze those authentic requirements before implementation, and then refuse to rewrite them merely to make Hive-Venues pass.

A synthetic HV-7 nominee is valid Tier-A evidence for architectural falsification and a serious product instance, but it is not evidence of another real client, independent real-operator usability, real venue permission/admission, or real-world deployment readiness. No substantive HV-7 implementation is currently authorized.

No real second venue is required or authorized, and no venue outreach is authorized. CID/IPFS publication, 3Speak/SPK media, package/developer identity cleanup, fleet operations, and other downstream lanes remain unselected as product lanes. Shared-runtime multi-tenancy and unconstrained replicated mutable state remain deferred.

## Accepted architecture

The current one-isolated-venue composition is:

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

HV-5 owns the editor-independent authoring contract and ordinary-operator gate. HV-6 adds a visual adapter without creating a second authority model: editable controls derive from HV-5 ownership, proposed state is rendered through the real application renderer, Apply remains atomic through the HV-5 gate, Discard restores accepted state, and the direct source/code path remains independent.

Front-end visibility, DOM/component state, generated HTML/CSS, autosave state, arbitrary scripts, editor project JSON, or other shadow state may not become canonical platform authority.

## Preserved assurance boundary

The successor continues to preserve these live invariants:

- Hive Keychain remains the user-side signing/custody boundary.
- The server does not hold Hive private keys and has no Hive broadcast RPC implementation.
- User-owned writes are explicitly reviewed before signing.
- Ambiguous post-Keychain acceptance never triggers automatic rebroadcast.
- Payment preparation, idempotency, replay prevention, durable receipt state, cancellation, and chain confirmation remain fail-closed.
- Structured input validation, sanitization, session ownership, origin/CSRF checks, and rate limits remain tested.
- Release identity and rollback discipline remain exact.
- Accessibility, responsive behavior, and accepted visual states remain covered by deterministic/rendered qualification when scope requires it.

## Source identity versus production identity

Canonical source is the `main` branch of `etblink/Hive-Venues`. Resolve its exact commit/tree at qualification or release time rather than pinning moving source identity in prose.

The existing Fourth Street production installation remains a compatibility deployment with provenance-bearing Hive-Bar-era names and paths such as `/opt/hive-bar`, `hive-bar.service`, `.hive-bar-commit`, `.hive-bar-tree`, the Fourth Street host, and the Fourth Street Hive application tag. Those names must not be changed merely because the successor source repository has a new identity.

The last recorded accepted production transition in the inherited record is M19.2. Current runtime identity must be obtained from installed release/build evidence. No successor source change by itself authorizes deployment, account creation, delegation, payment activation, secret rotation, or infrastructure mutation.

Current Fourth Street operating guidance remains in `docs/PRODUCTION_OPERATIONS.md` until a separately accepted production migration supersedes it.

## Functional boundary

Canonical source contains the accepted beta self-signing social action set:

```text
post
thread
comment
vote
follow
unfollow
subscribe
unsubscribe
profile
claim-rewards
wall
inbox
```

The codebase also contains independently gated payment functionality and dormant/rehearsed release profiles. Their presence in source does not imply that a production deployment has enabled them. In-person account creation/onboarding also remains separately gated.

## Development

Pinned runtime:

```text
Node.js 24.19.0
npm 11.17.0
```

Install and qualify with the locked dependency graph:

```bash
npm ci --ignore-scripts --no-fund
npx --no-install patch-package
npm run check
```

The main CI verifies the deterministic gate on Ubuntu and Windows and runs the accepted pinned-Chromium rendered qualification chain when the changed-path classifier requires it. Live Hive smoke tests remain separately gated.

## Current documentation

For current status and routing, use:

1. `README.md`
2. `docs/ROADMAP.md`
3. `docs/HV7_CANDIDATE_EVIDENCE_MODEL_LIVING_ROUTING_RECONCILIATION_0_1_1.md`
4. `docs/HV7_SECOND_VENUE_CANDIDATE_EVIDENCE_MODEL_AMENDMENT_ACCEPTANCE_0_1_1.md`
5. `docs/HV7_SECOND_VENUE_CANDIDATE_EVIDENCE_MODEL_AMENDMENT_0_1_1.md`
6. `docs/POST_HV6_SEQUENCING_DECISION_0_1_0.md` for the preserved historical lane decision
7. `docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_ACCEPTANCE_0_1_0.md`
8. `docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md`
9. `docs/PRODUCTION_OPERATIONS.md` when production is involved.

`docs/POST_HV6_LIVING_ROUTING_RECONCILIATION_0_1_0.md` remains the truthful historical record of the neutral pre-decision boundary. `docs/HV7_REAL_ISOLATED_SECOND_VENUE_PRE_ADMISSION_PILOT_PREREGISTRATION_0_1_0.md` remains the truthful historical preregistration whose narrow real-only evidence requirements were later superseded by the accepted 0.1.1 amendment. Living documents describe the amended current route rather than rewriting either historical record.
