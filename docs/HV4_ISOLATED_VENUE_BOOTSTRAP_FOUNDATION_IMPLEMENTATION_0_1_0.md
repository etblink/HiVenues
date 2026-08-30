# HV-4 Isolated Venue Bootstrap Foundation — Implementation 0.1.0

## Status

```text
OPERATION = HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION
IMPLEMENTATION_VERSION = 0.1.0
STATUS = IMPLEMENTATION_CANDIDATE__NOT_ACCEPTED
CANONICAL_AUTHORIZATION_BASE = 20590dff2222a6dc855fabb9f0c4f8cb37cc2670
CONTROLLING_PREREGISTRATION = docs/HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_PREREGISTRATION_0_1_0.md
REAL_SECOND_VENUE = NO
PRODUCTION_MUTATION = NO
SHARED_RUNTIME_TENANCY = NO
KUBO_IPFS_HELIA_ORBITDB = OUT_OF_SCOPE
```

This candidate implements the smallest offline composition and review layer required by the frozen HV-4 contract. It does not change runtime selection, user-visible presentation, production deployment behavior, or the accepted ownership boundaries from HV-1 through HV-3.

## Input contract

A bootstrap input is non-secret JSON with this top-level shape:

```json
{
  "schemaVersion": 1,
  "bootstrapId": "example-offline-bootstrap",
  "venueContext": {},
  "venuePackage": {},
  "deploymentManifest": {},
  "metadata": {
    "notes": "Optional non-secret operator notes"
  }
}
```

The envelope is strict. Unknown top-level fields are rejected; there is intentionally no `venueType` field.

The bootstrap layer does not define parallel venue or deployment schemas. It delegates the three domain objects to the accepted authorities:

```text
venueContext       -> createVenueContext(...)
venuePackage       -> createVenuePackage(..., venueContext)
deploymentManifest -> compileDeploymentProfile(...)
```

The venue-package validator therefore remains responsible for venue/package identity binding, while the deployment-profile compiler remains responsible for provider, topology, release, storage, and provenance validation.

## Secret boundary

Bootstrap inputs are configuration-review material, not a secret store.

Do not put any of the following into a bootstrap document:

- Hive private keys;
- API/provider tokens;
- passwords;
- SSH private keys;
- DNS or Cloudflare credentials;
- private-key PEM material;
- any other credential-bearing field.

The bootstrap layer rejects secret-bearing field names and recognizable private-key material before it constructs review output. Rejection errors identify the field or location but do not echo the rejected value.

## Offline validation workflow

From a qualified repository checkout:

```text
node scripts/validate-venue-bootstrap.js path/to/non-secret-bootstrap.json
```

A valid input prints one deterministic normalized JSON review document to stdout. The review makes these identities explicit:

```text
venueId
packageId
deploymentId
```

The command performs no network request, writes no generated venue source, changes no production state, and persists no secret. A nonzero exit means the input was rejected.

## Synthetic proof

The focused HV-4 qualification uses the existing fictional **The Lantern Room (Fixture)** venue/package from HV-3 and adds only a test-only deployment manifest.

The proof remains materially non-bar:

```text
operatorNoun = reading room
staffRole = host
```

Its deployment uses only fixture identities, `.invalid` hostnames, `/tmp` paths, one application instance, automatic deploys disabled, and no real account or infrastructure credential.

## Deliberate non-effects

This implementation does not:

- create a venue-type taxonomy or template system;
- create a real second venue;
- copy routes, views, or generic source into a venue fork;
- alter Fourth Street production paths, services, hosts, storage, provenance filenames, or Hive application tags;
- alter authentication, Keychain custody, payments, moderation, onboarding, replay/idempotency, or Hive signing semantics;
- add a WYSIWYG editor;
- add Kubo/IPFS, Helia, OrbitDB, 3Speak/SPKNetwork, or fleet tooling;
- change package/runtime dependencies;
- change user-visible application presentation.

Those ideas may compete in later sequencing only after HV-4 is accepted and living state is reconciled.
