# HV-4 Isolated Venue Bootstrap Foundation — Implementation Authorization 0.1.0

## Status

```text
OPERATION = HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION
AUTHORIZATION_VERSION = 0.1.0
STATUS = PROJECT_LEAD_IMPLEMENTATION_AUTHORIZATION
REPOSITORY = etblink/Hive-Venues
AUTHORIZED_CANONICAL_BASE_COMMIT = 7f99383a7524aa46f5c63d96e79d935237e6c727
AUTHORIZED_CANONICAL_BASE_TREE = 40b25c596ae66c39a6a82307a91938a376bee120
CONTROLLING_PREREGISTRATION = docs/HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_PREREGISTRATION_0_1_0.md
HV4_IMPLEMENTATION_AUTHORIZED = YES
SECOND_REAL_VENUE_AUTHORIZED = NO
LIVE_SUCCESSOR_PRODUCTION_MUTATION = FORBIDDEN
SHARED_RUNTIME_MULTI_TENANCY = DEFERRED
KUBO_IPFS_INTEGRATION = OUTSIDE_SCOPE
HELIA_ORBITDB_INTEGRATION = OUTSIDE_SCOPE
FLEET_ORCHESTRATION = OUTSIDE_SCOPE
```

This record authorizes one bounded implementation operation under the already frozen HV-4 preregistration. It does not broaden that contract.

## Authorized work

Implementation may now:

- introduce the minimum generic non-secret isolated-venue bootstrap composition/validation layer required by the frozen HV-4 contract;
- reuse the authoritative HV-1 `createVenueContext`, HV-3 `createVenuePackage`, and HV-2 `compileDeploymentProfile` validators rather than replacing them;
- reuse/extend the fictional Lantern Room fixture with a clearly test-only deployment manifest;
- expose deterministic normalized, secret-free bootstrap review output;
- add a bounded offline developer/operator validation workflow or CLI when useful;
- add focused deterministic tests and documentation required by the preregistration;
- evaluate and, only if exact dependency review proves safe, correct root source/developer package metadata while preserving every production compatibility identifier protected by the preregistration;
- make only adjacent changes necessary to keep deterministic qualification, release coherence, and existing historical/current routing checks correct.

## Mandatory constraints

Implementation must preserve the preregistered venue-neutrality rule. No mandatory guessed venue-category enum may be introduced. Generic platform/bootstrap code may not assume bar-specific nouns; genuinely variable venue vocabulary remains venue-package-owned.

The candidate must remain offline and non-custodial. It may not create or use real venue credentials, Hive private keys, provider/API credentials, DNS credentials, SSH keys, production secrets, or real-client infrastructure.

Fourth Street production compatibility identifiers remain protected, including `/opt/hive-bar`, `hive-bar.service`, `/var/lib/hive-bar/...`, `.hive-bar-commit`, `.hive-bar-tree`, Fourth Street production hosts, protected deployment identity, and `fourth-street-bar-app/<version>`.

## Qualification boundary

Before acceptance, the implementation candidate must satisfy the full frozen HV-4 qualification contract, including focused bootstrap tests, secret-safety checks, Ubuntu and Windows deterministic qualification, preserved production/release/security invariants, Project Lead source review, and human developer/operator usability review.

Rendered qualification is required only if the implementation actually changes user-visible presentation/runtime surfaces.

Machine-green status is necessary but not sufficient. The Project Lead may reject and rebuild any candidate that passes automation but violates the architectural or semantic contract.

## Non-effects

This authorization does not:

- admit a second real venue/client;
- authorize or perform a Fourth Street deployment;
- alter DNS, Cloudflare, Caddy, VPS, systemd, storage, or secrets;
- create Hive accounts/communities or change Hive authority;
- change Hive signing/custody semantics;
- change payment, authentication, moderation, onboarding, or replay/idempotency semantics;
- authorize shared-runtime tenancy;
- authorize Kubo/IPFS publication;
- authorize Helia/libp2p/OrbitDB integration;
- authorize fleet provisioning/orchestration;
- authorize broad UI redesign or unrelated dependency/runtime upgrades.

HV-4 implementation may begin only within this bounded authorization and the controlling preregistration.
