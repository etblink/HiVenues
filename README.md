# Hive-Venues

Hive-Venues is a successor platform for independently branded venue-native community and social applications on Hive. It preserves the strongest security, payment, social, accessibility, release, and operating work from the original Hive-Bar application while separating reusable platform machinery from venue identity, authored venue expression, and deployment policy.

**Fourth Street Bar in Reno is a real venue, Hive-Venues' first real client, its first venue nominee, and the reference deployment.** It remains the sole real client. Fourth Street is not the platform identity, and Hive-Venues does not require a universal venue-type taxonomy.

## Current successor state

HV-1 through HV-6 are accepted foundations. HV-7 validated **Juniper Works Cooperative** as a synthetic second-venue nominee: all 24 frozen requirements passed at **Tier-A product-and-architecture evidence**. Juniper remains synthetic evidence, not another real client or deployment.

Fresh HV-8 Phase A is complete. The running Fourth Street reference deployment was observed directly and coherently at:

```text
BUILD = beta-fdb5b5b
COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c
ENVIRONMENT = production
WRITE_MODE = beta
READY = ready
```

Operator-side `current` agrees with that public identity; `last-good` is exact parent release `09ff0802bcfe8920eb88ed2f347ddd51253b524a`. The deployed beta gate passes. Current production also has active durable Pay (schema 2), onboarding (schema 1), and moderation; Distriator is disabled; controlled/delegated Hive authority is absent. Exact non-secret operational details and environment hashes live in `docs/PRODUCTION_OPERATIONS.md`.

HV-8 is **technically qualified**. The **production transition is withheld**: its exact successor candidate passed the full deployed-to-candidate qualification envelope, but ability to deploy is not a reason to replace a healthy real product. **Production deployment is not authorized.**

The moderated homepage **community pulse is accepted** at commit `9310b2784f816d531b46d35d05ab57e4f996256b` (PR #92). It keeps official venue updates while adding a compact, moderation-aware view of recent community activity without adding signing authority, persistence, infrastructure, or production mutation.

The owner-only **Recent activity** profile view is accepted at commit `16fbdaa6e3b19c1eca1550a51d83a152eb0259a9` (PR #94). It adds a read-only signed-in return loop for supported Hive replies, mentions, votes, follows, reblogs, and subscriptions while making no unread/read claim and adding no notification database, signer, provider, infrastructure, or write authority. Acceptance included dual-OS deterministic qualification, full pinned-Chromium evidence, artifact-integrity verification, accessibility review, a real-RPC-policy regression, PR-review reconciliation, and manual visual review.

**Isolated venue runtime admission is accepted** at commit `6b077b91cb7b958769c09befe8d0641689946a7d` (PR #96). Ordinary startup can now consume one explicit non-secret validated venue/bootstrap document and launch a non-Fourth-Street isolated runtime without developer source injection. Acceptance required four review-driven integration repairs covering explicit-admission precedence, durable-storage binding, non-reference release provenance, and observable Node/platform binding before listen.

The selected next product question is the **portable venue workspace**: can the already accepted authoring, deployment, bootstrap, and runtime-admission authorities become one deterministic offline operator unit, while keeping portable venue source separate from target-specific deployment facts?

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
HV8_PHASE_A_READ_ONLY_PREFLIGHT = PASS
HV8_PRODUCTION_CAPABILITY_STATE = OBSERVED__PAYMENTS_ONBOARDING_MODERATION_ACTIVE
HV8_REFERENCE_DEPLOYMENT_CONVERGENCE = TECHNICALLY_QUALIFIED__PRODUCTION_TRANSITION_WITHHELD
VENUE_HOME_COMMUNITY_PULSE = ACCEPTED
PROFILE_RECENT_ACTIVITY = ACCEPTED
ISOLATED_VENUE_RUNTIME_ADMISSION = ACCEPTED
NEXT_OPERATION = PORTABLE_VENUE_WORKSPACE__PRODUCT_BUILD
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
PORTABLE_VENUE_WORKSPACE__PRODUCT_BUILD
```

The platform now has the necessary lower-level authorities: HV-5 defines the canonical non-secret venue-authoring document, HV-2 owns target-specific deployment facts, HV-4 composes their validated three-way binding into a bootstrap, HV-6 provides a subordinate visual authoring adapter, and accepted runtime admission lets that bootstrap drive ordinary isolated startup.

The remaining operator gap is that these pieces still live as separate developer-facing files and commands. The bounded implementation target is therefore to create one deterministic **offline workspace/build boundary** that:

- keeps canonical venue authoring as the portable source of venue identity, content, and design;
- keeps deployment manifests separate and explicitly target-specific rather than embedding VPS/OS facts into venue design;
- reuses existing HV-5, HV-2, and HV-4 validators rather than introducing shadow schemas;
- deterministically emits canonical reviewed inputs, the compiled bootstrap ordinary startup consumes, and a small machine-readable checksum/identity manifest;
- uses host-portable workspace-local paths while leaving target runtime/release/storage paths under deployment-profile authority;
- rejects secret/private material through the existing safety boundaries;
- proves reproducible offline rebuild/verification without network access or source editing;
- does **not** create a template taxonomy, deployment wizard, shared tenancy, runtime database bundle, secret store, or production deployment.

This separation is intentional: **portable venue source is not portable deployment facts**. A future operator should be able to keep the same venue source while choosing or regenerating a deployment target for a home PC, VPS, or custom server.

No source deployment, service restart, environment change, current/last-good mutation, Hive/Keychain write, capability activation, production visual-authoring mount, secret/key change, DNS/VPS/systemd mutation, router/tunnel change, or venue outreach is authorized.

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

This architecture is evidence-backed, not ideological. One isolated venue per runtime remains a valid default for as long as it gives real venues the best product and operating model. Shared-runtime tenancy, IPFS, OrbitDB, 3Speak/SPK, fleet orchestration, or any other technology must earn its place by solving a real user/operator/developer problem.

## Assurance boundary

- Hive Keychain remains the user-side signing/custody boundary.
- The server holds no patron Hive private keys and has no Hive broadcast RPC implementation.
- User-owned writes require explicit review before signing.
- Ambiguous post-Keychain acceptance is never automatically rebroadcast.
- Payment replay/idempotency/receipt/confirmation boundaries remain fail-closed.
- Release identity and rollback remain exact.
- Source capability presence does not imply production activation.
- Source advancement does not imply production deployment.

## Source identity versus production identity

Canonical source is moving `main` in `etblink/Hive-Venues`. Production remains independently bound to the exact Fourth Street release above until a later production transition is explicitly authorized for a concrete reason.

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
3. `docs/PRODUCTION_OPERATIONS.md` when production is involved
4. `docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_CANDIDATE_ACCEPTANCE_0_1_0.md` for the accepted technical convergence candidate/evidence
5. `docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_DEPLOYMENT_PREREGISTRATION_0_1_0.md` for the frozen transition contract, if deployment is reconsidered later
6. `docs/HV7_JUNIPER_WORKS_PLATFORM_GENERALITY_REPAIR_ACCEPTANCE_0_1_0.md`
7. `docs/HV7_SECOND_VENUE_NOMINEE_JUNIPER_WORKS_REQUIREMENTS_0_1_0.md`
8. `docs/HV6_OPERATOR_VISUAL_AUTHORING_ADAPTER_FOUNDATION_ACCEPTANCE_0_1_0.md`
9. `docs/HV5_VENUE_AUTHORING_CONTRACT_FOUNDATION_ACCEPTANCE_0_1_0.md`
10. `docs/HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md`

The community-pulse, Recent-Activity, and isolated-runtime-admission implementation/qualification histories are intentionally recoverable from Git/PR history rather than duplicated as permanent transition documents. Superseded sequencing and transient evidence likewise remain recoverable from Git history rather than being required living documents.