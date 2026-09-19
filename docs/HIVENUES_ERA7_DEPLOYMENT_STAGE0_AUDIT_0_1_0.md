# HiVenues Era 7 — Deployment Product Stage-0 Audit 0.1.0

Status: **CANDIDATE — read-only deployment architecture audit**

Governing issue: #342  
Date: 2026-09-19

## Purpose

Stage 0 defines the deployment product before HiVenues is allowed to mutate a real server, DNS zone, TLS configuration, provider account, or public deployment.

The governing Era-7 gate is:

> **An ordinary operator can put an approved HiVenues Release on the public Internet using the reference provider without opening a terminal or manually administering the server.**

This audit performs no provider purchase, SSH connection, DNS/TLS mutation, Release upload, deployment, payment, or live infrastructure change.

## 1. Deployment source is an immutable HiVenues Release

The canonical Release already contains:

```text
id
kind
draftRevision
digest
createdAt
snapshot
```

A normal Release is created from an exact clone of validated Working HostGraph state, then stored immutably in Release History.

Era 7 therefore freezes:

```text
DEPLOYMENT SOURCE
= one exact immutable HiVenues Release
≠ Working state
≠ arbitrary repository HEAD
≠ transient Studio memory
```

Deployment must bind at least:

```text
host identity / slug
release id
release digest
release kind
release creation time
```

## 2. Host Release and deployed runtime are separate version domains

Era 5 already established runtime/build provenance such as source SHA/tree, Node version, package version, package-manager provenance and platform.

Era 7 must preserve:

```text
HOST RELEASE VERSION
≠ DEPLOYED HIVENUES RUNTIME VERSION
≠ LOCAL STUDIO VERSION
```

A content Release must not silently upgrade runtime.
A runtime update must not silently publish host content.

## 3. Media can be deterministically packaged

Admitted local media already carries:

```text
version
storage
path
mime
bytes
width
height
sha256
```

and local filenames are derived from SHA-256.

Therefore the future deployable Release package can contain:

```text
Release manifest
+ exact immutable Release snapshot
+ exact referenced admitted media
+ qualified product/static runtime assets
```

Unreferenced Working-only media must not silently ship.

Bootstrap artwork remains product/runtime content rather than host-owned admitted media.

## 4. Deployment state does not belong in HostGraph

No active canonical deployment-state model exists today.

The existing external diagnostic counter named `deployments` is only an external-effect guard; it is not a deployment state machine.

Stage-0 decision:

```text
HOSTGRAPH
= semantic host truth

DEPLOYMENT STORE
= target/state/history truth

DEPLOYMENT AUTHORITY STORE
= infrastructure credentials/secrets
```

Candidate deployment state may include:

```text
deploymentId
hostSlug
providerKind
providerProfile
targetId
targetPublicFacts
selectedReleaseId
selectedReleaseDigest
runtimeProfile
state / stateReason
domainState
tlsState
healthState
rollbackState
history[]
```

Binding invariants:

- no private credential in deployment state;
- no infrastructure field added to HostGraph merely for convenience;
- disconnecting a deployment never deletes the local host;
- deleting a remote server never implies deleting Release History;
- multiple future targets per host remain architecturally possible.

## 5. Deployment authority is a separate local secure boundary

Authority classes may include:

- SSH private key;
- trusted SSH host fingerprint;
- provider API token;
- DNS API credential;
- TLS/provider credential;
- future decentralized-network authority.

Secrets must never enter:

- HostGraph;
- immutable Release payloads;
- browser-visible JSON;
- repository source;
- ordinary diagnostics/logs.

Deployment state may retain non-secret authority references/fingerprints.

Stage 1 may use only synthetic authority references.
Stage 2 must freeze the real local protection mechanism before generating production deployment authority.

## 6. Target abstraction is capability-based, not VPS-shaped

The canonical abstraction must not be:

```text
deploymentTarget = sshHost + sshUser + sshPort
```

Those are properties of one adapter family.

Initial target capability vocabulary:

```text
DISCOVER
QUOTE
PROVISION_HANDOFF
VERIFY_TARGET
COMPUTE
STORE
PUBLISH
CONTENT_ADDRESS
BOOTSTRAP_RUNTIME
DEPLOY_RELEASE
DOMAIN
DNS
TLS
HEALTH
ROLLBACK
DECOMMISSION
```

A target advertises supported capabilities.

### Privex reference family

The first full-compute reference target is a Privex-style unmanaged VPS path, expected to support the full server-runtime lifecycle while remaining replaceable by another provider/server adapter.

Automated Privex provisioning is not required for the first end-to-end proof. A guided purchase/handoff followed by HiVenues-owned verification/bootstrap is acceptable.

### Future SPK / HoneyComb / DLUX-family compatibility

The capability model must preserve future targets that may support a different subset, for example:

```text
STORE
PUBLISH
CONTENT_ADDRESS
HEALTH / persistence proof
static/dApp projection
```

No current `dlux.io` service is an Era-7 dependency or qualified target.

The architectural requirement is compatibility with future decentralized target families, not implementation during Era 7.

## 7. Historical Hive-Bar Privex work is reference evidence only

Git history contains an older Hive-Bar Privex operations package.

Useful safety patterns include:

- loopback-only Node;
- Caddy reverse proxy;
- unprivileged service user;
- protected environment file;
- pinned runtime verification;
- host preflight;
- health checks;
- current/previous release paths;
- rollback after failed health;
- no automatic retry in ambiguous state;
- explicit decommission boundary.

Those patterns may be reimplemented where appropriate.

The old implementation itself must not be restored as active HiVenues code because it was tied to:

- Hive-Bar customer-specific service/configuration;
- an exact-Git-commit deployment model;
- old release gates and hostnames;
- old app/runtime assumptions.

Era 7 instead deploys:

```text
qualified HiVenues runtime
+
exact immutable HiVenues Host Release
```

Classification:

```text
OLD PRIVEX CODE = historical reference
SAFETY PATTERNS = reusable after reimplementation
CUSTOMER-SPECIFIC CONFIG = do not port
GIT COMMIT AS HOST RELEASE = do not port
```

Git history is the archive. Incidental legacy baggage encountered in the active tree should be removed opportunistically rather than preserved for archaeology.

## 8. Privex remains profile data, not product schema

Privex is the current preferred/reference provider, not HostGraph truth.

Provider facts belong to deployment state/profile boundaries.

Do not add canonical HostGraph fields such as:

```text
privexPackage
privexRegion
privexInvoice
privexSshHost
```

Provider payment/provisioning state remains separately observable from deployment state.

## 9. First no-terminal Privex flow

A viable first path is:

```text
create local target draft
→ generate deployment-only public key locally
→ guide operator to Privex purchase
→ operator supplies public key to provider
→ provider returns public server facts
→ operator imports/enters those public facts
→ HiVenues verifies target
→ later bounded bootstrap
```

This does not require a Privex provisioning API.

## 10. Target verification contract

A successful socket/SSH connection is not enough.

An SSH/full-compute verification should eventually bind:

```text
target address
port
selected remote account
SSH host-key fingerprint
operating-system profile
architecture
minimum resources
network reachability
bootstrap readiness
```

First fingerprint acceptance is an explicit trust event.

A changed host key after acceptance must become a hard review/degraded state.

Stage 2 verification must remain non-mutating except for protocol exchanges required to observe the target.

## 11. Restricted bootstrap contract

After Stage-2 acceptance, a full-compute adapter may:

```text
initial bootstrap authority
→ create restricted HiVenues service/deployment account
→ install qualified runtime
→ configure release/data paths
→ configure process supervision
→ configure reverse proxy
→ configure bounded firewall/service policy
→ expose health/read-back
→ narrow/remove broad bootstrap authority where practical
```

The operator should not edit remote config manually.

## 12. Deployable Release package contract

Stage 1 should define a deterministic local package before a real target exists.

Candidate manifest:

```text
schemaVersion
hostSlug
releaseId
releaseKind
releaseDigest
releaseCreatedAt
releaseSnapshot
media[]
packageDigest
```

Each media record binds:

```text
mediaId
path
mime
bytes
sha256
```

Deployment must reject:

- missing media;
- media hash mismatch;
- Release digest mismatch;
- Working-state substitution;
- unknown manifest version;
- package/manifest mismatch.

The same package can later become input to content-addressed/SPK-style targets without changing HostGraph semantics.

## 13. Remote runtime/read-back contract

Minimum remote read-back should eventually report:

```text
runtime version
source SHA
source tree
package version
runtime platform
deployment instance id
current host release id
current host release digest
health status
```

A deployment is not healthy until both the service health check passes and the expected Host Release identity reads back exactly.

No protected credential may appear in public health/read-back.

## 14. Domain / DNS / TLS remain distinct state

Candidate progression:

```text
domain-unconfigured
dns-instructions-ready
dns-pending
dns-confirmed
tls-pending
tls-valid
```

The product may later:

- perform explicit reviewed DNS mutation through a supported adapter; or
- show exact registrar records and verify them after manual entry.

Manual registrar entry is acceptable.
Manual server administration is not.

TLS is not confirmed merely because DNS resolves.

## 15. Rollback is not History Restore

Binding distinction:

```text
HISTORY / RESTORE
→ copy an old Release snapshot into Working for later review/edit/Release

DEPLOYMENT ROLLBACK
→ switch a remote target to an already-qualified prior deployed Release
```

Rollback must not silently alter Working state.

Disconnect/decommission must not delete the local host or Release History.

## 16. Stage-1 synthetic adapter

Before any live infrastructure, Stage 1 should implement a deterministic offline adapter that can exercise:

- capability discovery;
- target draft;
- exact Release selection;
- authority-reference separation;
- verification state;
- simulated deploy/read-back;
- degraded state;
- simulated rollback;
- disconnect.

Its qualification must continue to prove:

```text
providerWrites = 0
payments = 0
deployments = 0
```

## 17. Mutation gates

### Gate A — local model

Allowed after Stage-0 acceptance:

- local deployment store;
- deterministic Release package;
- synthetic adapter;
- local-only UI/state machine;
- tests.

Forbidden:

- real SSH;
- production deployment-key generation;
- server mutation;
- DNS mutation;
- TLS request;
- provider mutation.

### Gate B — target verification

Requires Stage-1 acceptance.

May authorize:

- deployment-key generation;
- target public-fact import;
- read-only SSH verification;
- host-key trust review.

Still forbids remote bootstrap/config mutation.

### Gate C — bootstrap/deploy

Requires Stage-2 acceptance.

May authorize only the bounded accepted bootstrap/deploy operations.

### Gate D — DNS/TLS

Requires Stage-3 accepted public deployment.

DNS/TLS remain their own reviewed consequence class.

## 18. Stage-0 conclusion

Era 7 can proceed without redefining HostGraph and without resurrecting old Hive-Bar deployment code.

The correct next implementation boundary is:

```text
Stage 1
= local deployment state
+ deterministic exact-Release package
+ synthetic capability adapter
+ zero external effects
```

Only after that state machine is qualified should HiVenues receive real infrastructure authority.
