# HV-4 Isolated Venue Bootstrap Foundation — Implementation 0.1.0

## Status

```text
OPERATION = HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION
IMPLEMENTATION_VERSION = 0.1.0
DOCUMENT_ROLE = IMPLEMENTATION_CONTRACT_AND_OPERATOR_GUIDE
ACCEPTANCE_STATUS_SOURCE = SEPARATE_ACCEPTANCE_RECORD_AND_CURRENT_ROUTING
CANONICAL_AUTHORIZATION_BASE = 20590dff2222a6dc855fabb9f0c4f8cb37cc2670
CONTROLLING_PREREGISTRATION = docs/HV4_ISOLATED_VENUE_BOOTSTRAP_FOUNDATION_PREREGISTRATION_0_1_0.md
REAL_SECOND_VENUE = NO
PRODUCTION_MUTATION = NO
SHARED_RUNTIME_TENANCY = NO
KUBO_IPFS_HELIA_ORBITDB = OUT_OF_SCOPE
```

This implementation provides the smallest offline composition and review layer required by the frozen HV-4 contract. Whether this exact implementation has been accepted at a given repository state is determined by the separate acceptance record and living routing, not by rewriting this implementation guide. It does not change runtime selection, user-visible presentation, production deployment behavior, or the accepted ownership boundaries from HV-1 through HV-3.

## Input contract

A bootstrap input is non-secret JSON with this top-level shape:

```json
{
  "schemaVersion": 1,
  "bootstrapId": "example-offline-bootstrap",
  "bindings": {
    "venueId": "example-venue",
    "packageId": "example-venue-package",
    "deploymentId": "example-offline-deployment"
  },
  "venueContext": {},
  "venuePackage": {},
  "deploymentManifest": {},
  "metadata": {
    "notes": "Optional non-secret operator notes"
  }
}
```

The envelope is strict. Unknown top-level fields are rejected; there is intentionally no `venueType` field.

`bindings` is not a parallel domain schema. It is an explicit operator declaration of the three identities that are intended to compose. After the authoritative validators run, HV-4 compares each declared identity with the validated result and fails closed on any mismatch. This prevents a valid deployment for one isolated venue from being silently paired with another venue/package merely because each object is independently well-formed.

The bootstrap layer delegates the three domain objects to the accepted authorities:

```text
venueContext       -> createVenueContext(...)
venuePackage       -> createVenuePackage(..., venueContext)
deploymentManifest -> compileDeploymentProfile(...)
```

The venue-package validator therefore remains responsible for venue/package binding, while the HV-4 composition layer adds the explicit three-way venue/package/deployment identity check. The deployment-profile compiler remains responsible for provider, topology, release, storage, and provenance validation.

## Secret boundary

Bootstrap inputs are configuration-review material, not a secret store.

Do not put any of the following into a bootstrap document:

- Hive private keys;
- API/provider tokens;
- passwords;
- SSH private keys;
- DNS or Cloudflare credentials;
- private-key PEM material;
- credentials embedded in URL username/password fields;
- token-, credential-, authorization-, signature-, password-, key-, or secret-bearing URL query parameters;
- any other credential-bearing field.

The bootstrap layer rejects secret-bearing field names, recognizable private-key material, URL userinfo credentials, and sensitive URL query-parameter names before it constructs review output. Rejection errors identify the field or location but do not echo the rejected value. These checks are defense in depth; bootstrap authors remain responsible for supplying only public, non-secret configuration data.

## Offline validation workflow

From a qualified repository checkout:

```text
node scripts/validate-venue-bootstrap.js path/to/non-secret-bootstrap.json
```

A valid input prints one deterministic normalized JSON review document to stdout. The review makes these validated identities explicit:

```text
venueId
packageId
deploymentId
```

The command performs no network request, writes no generated venue source, changes no production state, and persists no secret. A nonzero exit means the input was rejected.

## Synthetic proof

The focused HV-4 qualification uses the existing fictional **The Lantern Room (Fixture)** venue/package from HV-3 and adds only a test-only deployment manifest plus explicit identity bindings.

The proof remains materially non-bar:

```text
operatorNoun = reading room
staffRole = host
```

Its deployment uses only fixture identities, `.invalid` hostnames, `/tmp` paths, one application instance, automatic deploys disabled, and no real account or infrastructure credential. Focused negative controls prove that the valid Fourth Street deployment manifest is rejected when supplied under the Lantern Room deployment binding and that credential-bearing HTTPS URLs are rejected before their values can appear in review output.

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

Those ideas may compete in later sequencing after HV-4 acceptance and living-state reconciliation; this guide does not preselect any of them.
