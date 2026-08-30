# Hive-Venues

Hive-Venues is a successor platform for building venue-native community and social experiences on Hive. It preserves the strongest engineering and product work from the original Hive-Bar application while separating reusable platform machinery from venue identity and deployment-specific policy.

**Fourth Street Bar in Reno is the reference venue and first real deployment.** It is not the platform identity, and it is not treated as a disposable demo. The successor is designed so that strong venue-specific content, photography, policies, and community identity remain first-class while shared protocol/security machinery can be maintained once.

## Current successor state

HV-1, the Venue Context Foundation, is accepted and canonical. The application can now be constructed with an explicit validated venue context while the default/reference construction preserves the established Fourth Street values and behavior.

The current architecture decision is documented in `docs/HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md`. The default near-term model is:

```text
HIGH_ASSURANCE_PROTOCOL_SECURITY_CORE
+
PLATFORM_APPLICATION_PRIMITIVES
+
VENUE_PACKAGE
+
DEPLOYMENT_PROFILE
=
ONE_ISOLATED_VENUE_RUNTIME
```

Hive-Venues does **not** currently claim request-time shared multi-tenancy. The inherited durable payment, moderation, and onboarding stores are intentionally treated as venue-local until a future operation explicitly proves safe tenant scoping. Multiple venues can instead run isolated instances from the same platform lineage.

See `docs/ROADMAP.md` for current sequencing and `docs/README.md` for the documentation index.

## What is being preserved

The inherited Hive-Bar codebase has a mature assurance boundary that successor work should improve around rather than casually discard:

- Hive Keychain remains the user-side signing/custody boundary.
- The server does not hold Hive private keys.
- The server contains no Hive broadcast RPC implementation.
- User-owned writes are explicitly reviewed before signing.
- Ambiguous post-Keychain acceptance never triggers automatic rebroadcast.
- Hive observations are read independently after a signing attempt.
- Payment preparation, idempotency, replay prevention, durable receipt state, cancellation, and chain confirmation are fail-closed.
- Structured input validation, sanitization, session ownership, origin/CSRF checks, and rate limits are extensively tested.
- Release identity and rollback discipline are exact rather than inferred.
- Accessibility, responsive behavior, and accepted visual states are covered by automated and rendered-evidence gates.

These properties are platform assets. They are not tied to Fourth Street branding.

## What is free to evolve

The successor is not limited to tenant abstraction. Product quality is the governing objective. Future operations may reconstruct or replace inherited layers when evidence supports doing so, including:

- repository/package/developer identity;
- shared shell and navigation;
- desktop social/profile composition;
- venue package and asset structure;
- deployment/configuration architecture;
- onboarding and venue-policy packaging;
- new-venue bootstrap and fleet operations.

Strong venue-specific work should remain venue-specific. In particular, Fourth Street's current homepage uses authentic venue photography and useful visit/community pathways; that work is a reference product asset, not something to flatten into generic copy merely for reuse.

## Source and production are separate identities

Canonical source is the `main` branch of `etblink/Hive-Venues`. Resolve its exact commit/tree at qualification or release time; do not infer source identity from a historical deployment record.

The existing Fourth Street production installation remains a compatibility deployment with provenance-bearing Hive-Bar-era names and paths. Historical identifiers such as `/opt/hive-bar`, `hive-bar.service`, `.hive-bar-commit`, `.hive-bar-tree`, and the Fourth Street Hive application tag must not be renamed in production merely because the successor repository has a new name.

The last recorded accepted production transition in the inherited record is M19.2. Current runtime identity must be obtained from the installed release/build evidence, not from this README or from the moving source branch. No successor source refactor by itself authorizes a production deployment.

Current operational guidance for that deployment remains in `docs/PRODUCTION_OPERATIONS.md` until a separately qualified successor deployment migration supersedes it.

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

The codebase also contains independently gated payment functionality and dormant/rehearsed release profiles. Their presence in source does not imply that a particular production deployment has enabled them. Production capability must be determined from its exact runtime profile and release identity.

In-person account creation/onboarding machinery remains separately gated. Source qualification does not itself authorize a live account creation, delegation, payment, or other production mutation.

## Development

Pinned runtime:

```text
Node.js 24.19.0
npm 11.17.0
```

Clone the successor repository and install the locked dependencies:

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

The main CI verifies the pinned runtime and deterministic gate on both Ubuntu and Windows and then runs the accepted pinned-Chromium visual qualification chain. Live Hive smoke tests are separately gated and should not be substituted for deterministic unit/integration evidence.

## Configuration model

HV-1 retains the inherited environment-variable contract for compatibility, but application construction now compiles venue-scoped values through an explicit validated venue context. This is an intermediate compatibility boundary, not the final deployment architecture.

The next bounded implementation operation is **HV-2: Reference Deployment Profile Extraction**. It will move the Fourth Street/Privex host, topology, service namespace, release root, storage paths, app tag, and release-policy assumptions behind a validated deployment profile while preserving their exact current reference values and making no live production change.

## Documentation policy

Living successor documents:

- `README.md` — product/developer entry point;
- `docs/ROADMAP.md` — current and next project sequencing;
- `docs/HIVE_VENUES_SUCCESSOR_ARCHITECTURE_DECISION_0_1_0.md` — accepted successor architecture;
- `docs/PRODUCTION_OPERATIONS.md` — current Fourth Street production operating model until superseded;
- `docs/README.md` — living-vs-historical documentation index.

Historical Hive-Bar milestone documents are retained as provenance. They should not be rewritten to sound current and should not override the successor living documents.
