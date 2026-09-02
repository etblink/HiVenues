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

Operator-side `current` agrees with that public identity; `last-good` is exact parent release `09ff0802bcfe8920eb88ed2f347ddd51253b524a`. Current production has active durable Pay, onboarding, and moderation. Distriator remains an external service rather than an application capability, and current evidence does not establish Fourth Street's venue-participation, transaction-recognition, or rebate state. Exact non-secret operational details and environment hashes live in `docs/PRODUCTION_OPERATIONS.md`.

HV-8 is **technically qualified**. The **production transition is withheld**: ability to deploy is not a reason to replace a healthy real product. **Production deployment is not authorized.**

Accepted post-foundation source/product work now includes:

- the moderated homepage **community pulse is accepted** at `9310b2784f816d531b46d35d05ab57e4f996256b` (PR #92);
- owner **Recent activity is accepted** at `16fbdaa6e3b19c1eca1550a51d83a152eb0259a9` (PR #94);
- **Isolated venue runtime admission is accepted** at `6b077b91cb7b958769c09befe8d0641689946a7d` (PR #96);
- the **portable venue workspace is accepted** at `e1d31ae7805e7387ddab1a361bb3815ed54c5aa8` (PR #98);
- the **deployment-agnostic venue source is accepted** at `41928f5d900bcbfc90d5edf9b1365d5dd9f7b336` (PR #100);
- **deployment-agnostic source authoring is accepted** at `a7cae27ab69eae49301f5d0279ab8c6f79254e81` (PR #102);
- **durable venue-source save/open** and the workspace bridge are accepted at `0ac2d8c298b62efdb3f1a284caf0b62beafc7f8e` (PR #103);
- the **local source-authoring operator launcher is accepted** at `c8587b22c68cc7983e575b813909cef9eb9a4d2e` (PR #104).

The CID investigation is complete. The frozen capsule construction established `CID_TECHNICALLY_VIABLE__NO_PRODUCT_AUTHORITY`, and the comparative experiment established the genuine capability gap `STABLE_SUBFILE_CONTENT_ADDRESS_REUSE`. That evidence did **not** establish enough current product value to justify a Kubo/CAR/import-profile/provider dependency. **CID adoption is deferred without prejudice**; canonical SHA-256 plus ordinary files/Git remains the selected baseline.

The bounded Hive identity/key-management audit is also complete at the repository-design level. It establishes **two ordinary venue-owned Hive identities** as the minimum practical model: one official/merchant account and one low-value Threads automation account. The only future server Hive private credential that may be separately authorized is the Threads account's exact **Posting** credential. Merchant private keys and Threads Active/Owner private keys remain outside Hive-Venues custody.

Normal machine Threads roots already route 100% of their author rewards directly to the official merchant through the canonical `comment_options` beneficiary. Direct RC delegation can fund the low-value Threads principal without making meaningful owned stake an operating requirement. The existing merchant Active account authorization is adjudicated as an **optional manual liquid-balance cleanup capability only**, not a machine Posting prerequisite.

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
PORTABLE_VENUE_WORKSPACE = ACCEPTED
DEPLOYMENT_AGNOSTIC_VENUE_SOURCE = ACCEPTED
DEPLOYMENT_AGNOSTIC_SOURCE_AUTHORING = ACCEPTED
DEPLOYMENT_AGNOSTIC_SOURCE_DURABILITY = ACCEPTED
LOCAL_SOURCE_AUTHORING_OPERATOR_LAUNCHER = ACCEPTED
CID_TECHNICAL_VIABILITY = PASS__NO_PRODUCT_AUTHORITY
CID_CAPABILITY_GAP = PASS__STABLE_SUBFILE_CONTENT_ADDRESS_REUSE
CID_PRODUCT_ADOPTION = DEFERRED_WITHOUT_PREJUDICE
HIVE_IDENTITY_KEY_MINIMIZATION = ACCEPTED__TWO_VENUE_IDENTITIES__ONE_SERVER_POSTING_CREDENTIAL
THREADS_ACTIVE_ACCOUNT_AUTH = OPTIONAL_CLEANUP_ONLY__NOT_POSTING_ACTIVATION_PREREQUISITE
NEXT_OPERATION = THREADS_POSTING_ACTIVATION_LIQUID_CLEANUP_DECOUPLING__BOUNDED_REPAIR
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
PUBLIC_PRODUCTION_AUTHORING = NOT_AUTHORIZED
REAL_SECOND_VENUE_AUTHORIZED = NO
VENUE_OUTREACH = NOT_AUTHORIZED
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
DEFAULT_RUNTIME_MODEL = ONE_ISOLATED_VENUE_PER_RUNTIME
```
<!-- HV6_CURRENT_ROUTING_END -->

## Current operation — decouple Posting activation from optional liquid cleanup

```text
THREADS_POSTING_ACTIVATION_LIQUID_CLEANUP_DECOUPLING__BOUNDED_REPAIR
```

The identity/key audit found one concrete least-privilege coupling defect in the repository-local Threads activation preflight. Machine Posting readiness currently requires both the exact direct Threads Posting key **and** merchant Active `account_auths`. Those are separate capabilities and must be qualified separately.

The bounded repair must make machine Threads Posting readiness depend only on the exact Threads identity, threshold-satisfying Posting key, Posting-only server credential inventory, configured public-key binding, and a separately qualified runtime signer. Merchant Active account authorization belongs only to the optional manual transfer of stray liquid HIVE/HBD already sitting on the Threads account.

If the venue does not configure that cleanup authorization, the cleanup control must be unavailable/fail closed while Posting-only machine readiness remains independently eligible. No recurrent transfer or automatic sweep is introduced. The repair should also consider replacing the current `Claim funds` wording with language that accurately describes a liquid-balance transfer.

Issue #110 remains the separate live Threads activation gate. This repository operation does **not** authorize a real Posting key, an authority mutation, a live signer, RC delegation, a Hive/Keychain broadcast, funds movement, or production deployment.

The beneficiary economics lane remains separately unactivated. A venue beneficiary policy and any voluntary Hive-Venues creator donation must remain plainly disclosed before Keychain and must use the one canonical beneficiary-composition boundary.

A separate engineering-health audit will classify the deterministic test inventory by live invariant, uniqueness, historical defect value, and true platform sensitivity before any test deletion or Windows-coverage reduction. The present dual-OS policy remains in force until that evidence exists.

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

HV-5 remains the editor-independent canonical deployment-bound authoring authority. HV-6 remains subordinate to its ownership rules. Protected identity, Hive/security/payment/deployment authority, and gallery topology remain outside ordinary venue editing. Deployment-agnostic source, authoring, durability, and local launch compose with those authorities rather than replace them.

This architecture is evidence-backed, not ideological. One isolated venue per runtime remains a valid default for as long as it gives real venues the best product and operating model. Shared-runtime tenancy, CID/IPFS, 3Speak/SPK, fleet orchestration, or any other technology must earn its place by solving a real user/operator/developer problem.

## Assurance boundary

- Hive Keychain remains the normal user-side signing/custody boundary.
- The server holds no patron Hive private keys.
- The server holds no merchant Hive private keys.
- Any future Threads service-account exception is exact Posting authority only and remains separately authorized.
- Active/Owner/Memo private keys for the Threads account are never normal Hive-Venues server credentials.
- Optional merchant Active `account_auths` for the Threads account is a human Keychain-side liquid-cleanup capability, not server custody.
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
npm run check
```

## Current documentation

For current state use:

1. `README.md`
2. `docs/ROADMAP.md`
3. `docs/HIVE_IDENTITY_KEY_MANAGEMENT_MINIMIZATION_AUDIT_0_1_0.md`
4. `docs/PRODUCTION_OPERATIONS.md` when production is involved
5. `docs/DEPLOYMENT_AGNOSTIC_VENUE_SOURCE.md`
6. `docs/DEPLOYMENT_AGNOSTIC_VENUE_SOURCE_DURABILITY.md`
7. `docs/PORTABLE_VENUE_WORKSPACE.md`
8. `docs/HV8_REFERENCE_DEPLOYMENT_SUCCESSOR_CONVERGENCE_CANDIDATE_ACCEPTANCE_0_1_0.md`
9. `docs/HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md`

Superseded sequencing and transient evidence remain recoverable from Git/PR history rather than being carried as living routing.
