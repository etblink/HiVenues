# Hive-Venues

Hive-Venues is a successor platform for building independently branded venue-native community and social applications on Hive. It preserves the strongest engineering, safety, payment, social, accessibility, and operational work from the original Hive-Bar application while separating reusable platform machinery from venue identity, authored venue expression, and deployment-specific policy.

**Fourth Street Bar in Reno is the reference venue and first real deployment.** It is not the platform identity and it is not treated as a disposable demo. Strong venue-specific content, photography, policy, vocabulary, and community identity remain first-class while shared protocol/security machinery can be maintained once.

The platform does not currently require a universal venue-type taxonomy. A bar may use bar/bartender language; another independently branded venue may use different operator/staff language through its venue package. Reuse is proven through explicit contracts, not by pretending every venue belongs to a guessed enum.

## Current successor state

The first six successor architecture/product-foundation milestones are accepted:

- **HV-1 — Venue Context Foundation:** explicit validated venue identity, business facts, Hive bindings, and merchant identity.
- **HV-2 — Reference Deployment Profile Extraction:** explicit validated deployment identity and Fourth Street/Privex compatibility facts.
- **HV-3 — Reference Venue Package Extraction:** explicit validated authored venue expression, media metadata, and venue-facing presentation material.
- **HV-4 — Isolated Venue Bootstrap Foundation:** deterministic, secret-safe composition and review of one isolated venue from explicit venue, package, deployment, and composition-binding inputs without a source fork.
- **HV-5 — Venue Authoring Contract Foundation:** one editor-independent canonical authoring document, executable ownership policy, ordinary-operator edit gate, deterministic canonical serialization, direct source/code validation, shared HV-4/HV-5 secret safety, and explicit projection back into the accepted HV-4 deployment-binding boundary.
- **HV-6 — Operator Visual Authoring Adapter Foundation:** a selected native existing-stack visual authoring surface whose editable controls derive from HV-5 ownership, whose preview uses the real application renderer, and whose Apply path remains subordinate to `applyOrdinaryOperatorEdit(base, proposed)`.

HV-6 is canonically accepted. Its bounded Phase-B comparison selected the **native existing stack** and rejected GrapesJS Core as the foundation choice; GrapesJS Studio SDK remains unselected. The selected-native Phase-C source foundation was independently reviewed, fully qualified on Ubuntu, Windows, and the pinned-Chromium rendered chain, reconstructed as one exact clean canonical tree, and then separately accepted.

<!-- HV6_CURRENT_ROUTING_START -->
```text
HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION = ACCEPTED
HV6_PHASE_B_TECHNOLOGY_SELECTION = COMPLETE
SELECTED_ADAPTER = NATIVE_EXISTING_STACK
HV6_PHASE_C_IMPLEMENTATION_AUTHORIZATION = HISTORICAL_ACCEPTED__EXHAUSTED_BY_ACCEPTED_IMPLEMENTATION
HV6_PHASE_C_IMPLEMENTATION = ACCEPTED
POST_HV5_SEQUENCING_DECISION = HISTORICAL_ACCEPTED__SUPERSEDED_FOR_CURRENT_ROUTING
POST_HV6_SEQUENCING_DECISION = PENDING
SELECTED_NEXT_LANE = NONE
PROPOSED_NEXT_MILESTONE = NONE
NEXT_OPERATION = POST_HV6_SEQUENCING_DECISION__READ_ONLY
NEXT_SUBSTANTIVE_IMPLEMENTATION = NOT_AUTHORIZED
GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED
GRAPESJS_STUDIO_SDK = NOT_SELECTED
REAL_SECOND_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```
<!-- HV6_CURRENT_ROUTING_END -->

The next product-governance operation is a fresh **Post-HV-6 Sequencing Decision**. No new substantive implementation is currently authorized. Separately bounded repository housekeeping may proceed without selecting or prejudging a post-HV-6 product lane.

HV-6 remains subordinate to the HV-5 canonical authoring document and `applyOrdinaryOperatorEdit(base, proposed)`. Front-end visibility, component state, generated HTML/CSS, autosave state, or any equivalent shadow model may not become platform authority.

A real isolated second venue remains unauthorized but is a high-priority candidate for the fresh sequencing decision because it is the strongest direct falsification test of the accepted abstractions. CID/IPFS publication, 3Speak/SPK media, package/developer identity cleanup, fleet operations, and other downstream lanes remain unselected. Shared-runtime multi-tenancy and unconstrained replicated mutable state remain deferred.

The near-term runtime model remains:

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

Hive-Venues does **not** currently claim request-time shared multi-tenancy. Payment, moderation, onboarding, session/preflight, secret, replay/idempotency, and operational state remain venue-local until a future operation explicitly proves safe tenant ownership and isolation.

See `docs/ROADMAP.md` for current sequencing and `docs/README.md` for the documentation index.

## What is being preserved

The inherited Hive-Bar codebase contains a mature assurance boundary that successor work should improve around rather than casually discard:

- Hive Keychain remains the user-side signing/custody boundary.
- The server does not hold Hive private keys.
- The server contains no Hive broadcast RPC implementation.
- User-owned writes are explicitly reviewed before signing.
- Ambiguous post-Keychain acceptance never triggers automatic rebroadcast.
- Hive observations are read independently after a signing attempt.
- Payment preparation, idempotency, replay prevention, durable receipt state, cancellation, and chain confirmation are fail-closed.
- Structured input validation, sanitization, session ownership, origin/CSRF checks, and rate limits are extensively tested.
- Release identity and rollback discipline are exact rather than inferred.
- Accessibility, responsive behavior, and accepted visual states are covered by deterministic and rendered-evidence gates.

These are platform assets. They are not Fourth Street branding.

## What HV-1 through HV-6 established

HV-1 made the runtime consume a validated venue context instead of relying on hidden canonical venue identifiers. HV-2 made deployment identity an explicit validated dependency while preserving the exact current Fourth Street production compatibility namespace. HV-3 made authored venue content and media an explicit validated venue package and proved an alternate fictional venue can use the same generic application path offline without a source fork. HV-4 composes those accepted authorities into a deterministic offline bootstrap/review boundary with explicit venue/package/deployment identity binding and secret exclusion.

HV-5 adds the authoring authority layer without replacing those domain authorities. The canonical authoring document contains the accepted venue context and venue package plus only a deployment-profile ID reference. Its ownership registry separates operator-authored leaves from platform, integration, deployment, security, derived, and forbidden private authority. Ordinary edits fail closed outside the allowed authored leaves, and direct source/code authoring remains available without a visual editor.

HV-6 adds a visual adapter without creating a new authority model. Editable controls derive from HV-5 ownership, proposal preview is produced from proposed HV-5 state through the real application renderer, Apply remains atomic through the HV-5 ordinary-operator gate, Discard reconstructs from accepted state, and the direct source path remains independent. The selected foundation is native to the existing stack; GrapesJS Core remains evaluated-and-not-selected evidence.

Together HV-1 through HV-6 establish a reproducible, editor-independent one-isolated-venue composition, authoring, and visual-authoring foundation.

## Source identity versus production identity

Canonical source is the `main` branch of `etblink/Hive-Venues`. Resolve its exact commit/tree at qualification or release time rather than pinning moving source identity in prose.

The existing Fourth Street production installation remains a compatibility deployment with provenance-bearing Hive-Bar-era names and paths. Historical identifiers such as `/opt/hive-bar`, `hive-bar.service`, `.hive-bar-commit`, `.hive-bar-tree`, the Fourth Street host, and the Fourth Street Hive application tag must not be renamed merely because the successor source repository has a new identity.

The last recorded accepted production transition in the inherited record is M19.2. Current runtime identity must be obtained from the installed release/build evidence. No successor source refactor by itself authorizes deployment, account creation, delegation, payment activation, secret rotation, or infrastructure mutation.

Current operational guidance for Fourth Street remains in `docs/PRODUCTION_OPERATIONS.md` until a separately qualified successor deployment migration supersedes it.

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

The codebase also contains independently gated payment functionality and dormant/rehearsed release profiles. Their presence in source does not imply that a particular production deployment has enabled them. Production capability must be determined from exact runtime profile and release identity.

In-person account creation/onboarding machinery remains separately gated. Source qualification does not itself authorize live account creation, delegation, payment, or other production mutation.

## Development

Pinned runtime:

```text
Node.js 24.19.0
npm 11.17.0
```

Clone the repository and install the locked dependencies:

```bash
git clone https://github.com/etblink/Hive-Venues.git
cd Hive-Venues
npm ci --ignore-scripts --no-fund
npx --no-install patch-package
```

Run the deterministic quality gate:

```bash
npm run check
```

Run coverage:

```bash
npm run test:coverage
```

The main CI verifies the pinned runtime and deterministic gate on Ubuntu and Windows and runs the accepted pinned-Chromium rendered qualification chain when the changed-path classifier requires it. Live Hive smoke tests remain separately gated.

## Configuration and authoring

HV-1 retains the inherited environment-variable contract as a compatibility input layer while compiling venue-scoped values through an explicit validated venue context.

HV-2 retains `ops/privex/manifest.json` as the reviewed Fourth Street reference-deployment source and compiles deployment-owned facts into a validated, deeply immutable deployment profile.

HV-3 provides a validated, deeply immutable venue package containing or referencing authored venue expression and media while preserving universal platform/security language outside venue configuration.

HV-4 provides the strict offline bootstrap envelope that delegates domain validation to HV-1/HV-2/HV-3, requires explicit venue/package/deployment identity bindings, rejects secret-bearing material before review output, and emits deterministic normalized composition JSON through `scripts/validate-venue-bootstrap.js`.

HV-5 provides the accepted editor-independent authoring envelope and executable ownership model through `src/venue/authoring.js`, with direct offline validation through `scripts/validate-venue-authoring.js`. HV-5 and HV-4 share the same secret/private-material and canonical-document utility rather than maintaining divergent safety implementations.

HV-6 provides the accepted native visual-authoring adapter foundation through the existing application stack. It preserves HV-5-derived editable ownership, the explicit Apply/Discard state model, canonical no-op/edited round trips, reload from accepted state only, protected-authority rejection, direct-source independence, real-renderer preview truth, accessibility/responsive evidence, and venue neutrality. Acceptance does not expose a public production authoring route.

## Distributed publication and replication research

Content-addressed publication remains an eligible downstream lane. A bounded future experiment may pair Git commit/tree provenance with a deterministic artifact digest and CID. IPNS may be evaluated as a mutable naming/pointer layer over successive immutable publication CIDs; it does not replace Git commit/tree identity for source provenance.

Helia/OrbitDB replication remains deferred until the project can name a concrete non-authoritative mutable data domain whose product value justifies replicated mutable state, privacy/access-control rules, and conflict-resolution complexity.

3Speak/SPKNetwork remains an eligible downstream media/content lane rather than an auth, payment, onboarding-custody, or other private-state authority. Any adoption requires a separately selected and preregistered use case.

## Documentation policy

Living successor documents:

- `README.md` — product/developer entry point and current source boundary;
- `docs/ROADMAP.md` — current and next project sequencing;
- `docs/README.md` — living-vs-historical documentation index;
- `docs/HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md` — accepted architecture baseline;
- `docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md` — permanent HV-5 acceptance record;
- `docs/POST_HV5_SEQUENCING_DECISION_0_1_0.md` — historical accepted decision that selected the HV-6 visual-authoring lane;
- `docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION_0_1_0.md` — frozen prospective HV-6 product/evidence contract;
- `docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_PREREGISTRATION_ACCEPTANCE_0_1_0.md` — Project Lead acceptance of that prospective contract;
- `docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_IMPLEMENTATION_AUTHORIZATION_0_1_0.md` — historical bounded dual-candidate implementation authorization;
- `docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_TECHNOLOGY_SELECTION_0_1_0.md` — canonical Phase-B technology selection and comparative evidence;
- `docs/HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_AUTHORIZATION_0_1_0.md` — historical selected-native Phase-C implementation authorization;
- `docs/HV6_NATIVE_PHASE_C_AUTHORIZATION_ROUTING_RECONCILIATION_0_1_0.md` — historical routing boundary into selected-native Phase C;
- `docs/HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_0_1_0.md` — accepted Phase-C implementation record;
- `docs/HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_REVIEW_0_1_0.md` — permanent Project Lead implementation review;
- `docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_ACCEPTANCE_0_1_0.md` — permanent HV-6 acceptance record;
- `docs/POST_HV6_LIVING_ROUTING_RECONCILIATION_0_1_0.md` — current neutral post-HV-6 routing boundary once canonical;
- `docs/PRODUCTION_OPERATIONS.md` — current Fourth Street production operating model until superseded.

Historical Hive-Bar milestones, prior HV preregistrations/decisions, and earlier routing reconciliations remain provenance. They are not rewritten to sound current and do not override the explicitly marked current-routing surfaces.

## Historical Phase-C routing snapshot — not current

The following values preserve the immediately previous living boundary for inherited compatibility checks. They are historical evidence and **must not be used for current sequencing**:

> The first five successor architecture milestones are accepted.
>
> HV-5 is canonically accepted. The accepted **Post-HV-5 Sequencing Decision** selected the **operator visual authoring adapter** lane and proposed **HV-6 — Operator Visual Authoring Adapter Foundation**. The HV-6 prospective contract has since been preregistered and accepted, and its bounded implementation authorization is now canonical.
>
> The next operation is **HV-6 selected-native Phase-C implementation and qualification**.

```text
HV6_PHASE_B_TECHNOLOGY_SELECTION = COMPLETE
SELECTED_ADAPTER = NATIVE_EXISTING_STACK
HV6_PHASE_C_IMPLEMENTATION_AUTHORIZATION = ACCEPTED
HV6_PHASE_C_IMPLEMENTATION = AUTHORIZED__NOT_YET_ACCEPTED
NEXT_OPERATION = HV6_NATIVE_FOUNDATION_PHASE_C_IMPLEMENTATION_AND_QUALIFICATION
NEXT_SUBSTANTIVE_IMPLEMENTATION = AUTHORIZED_WITHIN_SELECTED_NATIVE_PHASE_C_BOUNDARY
GRAPESJS_CORE = EVALUATED_AND_NOT_SELECTED
GRAPESJS_STUDIO_SDK = NOT_SELECTED
REAL_SECOND_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```

## Historical bounded-evaluation routing snapshot — not current

This block preserves the earlier bounded-evaluation living-boundary literals for inherited compatibility checks. It is historical evidence and **must not be used for current sequencing**:

> The next operation is **HV-6 bounded dual-candidate implementation and evaluation**. No technology winner is selected. GrapesJS Core may be pinned only as an evaluation dependency after fresh official upstream verification.
>
> HV-6 is now authorized as a bounded offline adapter evaluation.
