# Deployment-agnostic venue source

The deployment-agnostic venue source is the strict non-secret venue state that can exist **before** an operator chooses where the venue will run.

It answers one narrow product requirement:

> The same confirmed venue identity, public business facts, Hive integration identity, content, and design must be able to bind later to a home PC, VPS, or custom-server deployment target without changing the source bytes merely because the hosting topology changed.

## Source contract

Schema version 1 contains exactly:

```json
{
  "kind": "hive-venues-deployment-agnostic-source",
  "schemaVersion": 1,
  "venueContext": {},
  "venuePackage": {}
}
```

`deploymentRef` is intentionally forbidden. Runtime hostnames, release roots, service names, storage paths, provenance filenames, OS/runtime binding, and other deployment-owned facts do not belong in this source.

The source layer does **not** redefine venue schemas. `venueContext` is validated by the existing HV-1 venue-context authority and `venuePackage` by the existing HV-3 venue-package authority. Existing secret/private rejection remains in force.

The source is a data authority, not a permission expansion. Integration-owned Hive identity and security-privileged payment-merchant identity retain their established ownership classes; simply placing those values in the source does not turn them into ordinary presentation edits.

## Binding to a deployment

A confirmed source can later be bound to one separately supplied deployment manifest:

```text
DEPLOYMENT_AGNOSTIC_VENUE_SOURCE
  + VALID_HV2_DEPLOYMENT_MANIFEST
  -> DEPLOYMENT_BOUND_HV5_AUTHORING
```

`bindDeploymentAgnosticVenueSource()` validates the target through the existing HV-2 deployment compiler, takes only the validated deployment identity into the HV-5 envelope, and delegates the resulting authoring document to the accepted HV-5 validator. The deployment manifest itself remains separately owned by HV-2. Downstream workspace/bootstrap construction revalidates the pair through the accepted HV-2/HV-4 boundaries.

The same source bytes and source digest therefore remain stable when the venue is rebound to a different valid deployment target. Deployment binding changes the downstream HV-5 document and workspace identity, not the upstream venue source.

Existing deployment-bound HV-5 authoring can also be projected back to this source layer by removing only deployment ownership and revalidating the remaining venue authorities. This provides a migration path for Fourth Street and existing fixtures without redefining accepted venue data.

The source digest is a domain-separated SHA-256 of canonical source bytes. It is an integrity/provenance digest for this schema, **not** an IPFS CID and not a claim that the source is available from any network.

## Content identity seam — intentionally bounded

The current venue package identifies public media with normalized same-origin paths such as `/images/example.jpg`. Those paths identify **where a deployment serves an asset**, but they do not independently identify the bytes behind that path.

That is a real place where content addressing may earn a role.

A separately bounded experiment may test whether CIDv1 identities can bind the immutable bytes behind deployment-agnostic venue media while deployment binding remains free to materialize those bytes at local same-origin paths. In that model:

```text
CID = immutable content identity
local path / HTTP gateway = one retrieval or serving location
IPNS = optional venue-owned pointer to the latest confirmed public capsule
```

A stronger later experiment may package canonical public venue source plus its public media DAG as one immutable **venue capsule** root CID. If that proves useful, a venue-owned IPNS name could point to the latest operator-confirmed capsule while prior CIDs remain immutable and independently verifiable.

This source foundation does **not** add Kubo, IPFS networking, pinning, IPNS keys, DNSLink, a gateway, or a new provider dependency. The experiment must first prove that a CID materially improves portability, integrity, provenance, recovery, or deduplication over the source's existing canonical SHA-256 digest and ordinary deployment files.

Private data, secrets, runtime databases, payment receipts, onboarding state, moderation state, private messages, credentials, and personally sensitive operational records must not be published to a public content-addressed network merely because CIDs are available.

## Non-goals

This slice does not create a venue taxonomy, template catalog, deployment wizard, shared tenancy layer, public production editor, Kubo deployment, DNS/IPNS mutation, Hive write, Keychain request, production deployment, or real-venue outreach.
