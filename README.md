# Hive-Venues

Hive-Venues is a successor platform for building independently branded venue-native community and social applications on Hive. It preserves the strongest engineering, safety, payment, social, accessibility, and operational work from the original Hive-Bar application while separating reusable platform machinery from venue identity, authored venue expression, and deployment-specific policy.

**Fourth Street Bar in Reno is the reference venue and first real deployment.** It is not the platform identity and it is not treated as a disposable demo. Strong venue-specific content, photography, policy, vocabulary, and community identity remain first-class while shared protocol/security machinery can be maintained once.

The platform does not currently require a universal venue-type taxonomy. A bar may use bar/bartender language; another independently branded venue may use different operator/staff language through its venue package. Reuse is proven through explicit contracts, not by pretending every venue belongs to a guessed enum.

## Current successor state

The first three successor architecture milestones are accepted:

- **HV-1 — Venue Context Foundation:** explicit validated venue identity, business facts, Hive bindings, and merchant identity.
- **HV-2 — Reference Deployment Profile Extraction:** explicit validated deployment identity and Fourth Street/Privex compatibility facts.
- **HV-3 — Reference Venue Package Extraction:** explicit validated authored venue expression, media metadata, and venue-facing presentation material.

The accepted Post-HV-3 Sequencing Decision selects **isolated-venue bootstrap and successor developer experience** as the next lane. The next bounded operation is **HV-4 Isolated Venue Bootstrap Foundation Preregistration**. HV-4 implementation, a second real venue, live production mutation, and shared-runtime tenancy are not authorized by that routing decision.

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

## What HV-1 through HV-3 established

HV-1 made the runtime consume a validated venue context instead of relying on hidden canonical venue identifiers. HV-2 made deployment identity an explicit validated dependency while preserving the exact current Fourth Street production compatibility namespace. HV-3 made authored venue content and media an explicit validated venue package and proved an alternate fictional venue can use the same generic application path offline without a source fork.

Together they establish an explicit source-level composition. HV-4 is intended to turn that composition into a reproducible developer/operator bootstrap workflow before a real second venue is admitted.

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

## Configuration and bootstrap direction

HV-1 retains the inherited environment-variable contract as a compatibility input layer while compiling venue-scoped values through an explicit validated venue context.

HV-2 retains `ops/privex/manifest.json` as the reviewed Fourth Street reference-deployment source and compiles deployment-owned facts into a validated, deeply immutable deployment profile.

HV-3 introduces a validated, deeply immutable venue package containing or referencing authored venue expression and media while preserving universal platform/security language outside venue configuration.

The Post-HV-3 decision routes next to **HV-4 Isolated Venue Bootstrap Foundation Preregistration**. That prospective contract must define the minimum reviewable, deterministic, secret-free inputs required to compose one isolated venue runtime without source forks or hidden Fourth Street assumptions. It must remain neutral to venue category unless a future product requirement supplies a real taxonomy.

## Distributed publication and replication research

A bounded Kubo/IPFS immutable-publication experiment is eligible downstream but is not the selected next operation. A later experiment should publish an explicitly defined immutable venue artifact rather than assume the dynamic Express application is already a static site.

Helia/OrbitDB replication remains deferred until the project can name a concrete non-authoritative data domain whose product value justifies replicated mutable state, privacy/access-control rules, and conflict-resolution complexity.

## Documentation policy

Living successor documents:

- `README.md` — product/developer entry point and current source boundary;
- `docs/ROADMAP.md` — current and next project sequencing;
- `docs/README.md` — living-vs-historical documentation index;
- `docs/HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md` — accepted architecture baseline;
- `docs/HV3_REFERENCE_VENUE_PACKAGE_EXTRACTION_ACCEPTANCE_0_1_0.md` — accepted HV-3 implementation and qualification record;
- `docs/POST_HV3_SEQUENCING_DECISION_0_1_0.md` — accepted post-HV-3 lane selection and HV-4 preregistration routing;
- `docs/PRODUCTION_OPERATIONS.md` — current Fourth Street production operating model until superseded.

Historical Hive-Bar milestones and prior HV preregistrations/decisions remain provenance. They are not rewritten to sound current and do not override the living routing surfaces.
