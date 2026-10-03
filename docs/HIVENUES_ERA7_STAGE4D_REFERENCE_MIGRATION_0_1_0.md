# HiVenues Era 7 Stage 4D — One-time reference-server publication-capability migration

**Issue:** #382  
**Scope:** repository/synthetic qualification before any real server effect

## Purpose

The existing Privex reference VPS was successfully deployed and authority-narrowed before Stage 4 introduced a root-owned publication helper. Stage 4C proved from the installed product that this exact server reports:

```text
publication-capability-upgrade-required
```

Stage 4D defines a narrow development-only migration that adds the missing capability without redeploying the active runtime or immutable Release.

## Development exception

This migration is not ordinary product evidence.

The clean product path remains a fresh supported server bootstrap where the publication helper is installed before bootstrap authority is removed. The migration exists only because the reference VPS predates that feature.

## Temporary bootstrap authority

Stage 3C intentionally removed the HiVenues deployment key from the original bootstrap account.

Therefore the migration review exposes only the existing deployment **public key** and fingerprint. The environment owner must temporarily restore that exact public key to the original bootstrap account through the provider's out-of-band console before execution.

No private key is displayed or copied.

After migration, HiVenues removes that exact public key again and proves the bootstrap account is no longer reachable with the deployment authority.

## Bounded root changes

The migration installs or updates only:

- the root-owned host-scoped publication helper;
- publication metadata;
- publication/Caddy state directories;
- the HiVenues Caddy systemd unit needed for durable certificate state;
- the HiVenues firewall systemd unit needed for bounded later policy replacement;
- restricted sudoers permission for the helper command family.

The migration performs `systemctl daemon-reload` but does **not** restart Caddy, restart the firewall, publish a hostname, open TCP 443, request TLS, or alter DNS.

## Preserved exact deployment

Before any root change and again after bootstrap-key cleanup, HiVenues proves the exact same:

- runtime source SHA;
- runtime source tree;
- runtime package version;
- Node version;
- runtime bundle digest;
- host slug;
- immutable Release id;
- Release digest;
- package digest;
- restricted deployment authority state.

A mismatch fails the migration.

## Interruption behavior

The migration is idempotent before publication:

- root-owned candidate files may be rewritten safely;
- no service restart occurs;
- no runtime/Release pointer changes occur;
- helper status remains either upgrade-required or ready/unconfigured;
- rerunning after temporary bootstrap access is restored completes the same bounded install and exact-key cleanup.

Success is not accepted while temporary bootstrap authority remains reachable.

## Exit

The real reference server must end at:

```text
publication capability = ready
publication state = unconfigured
bootstrap authority = removed
runtime/Release = unchanged
```

The next live hostname/DNS/TLS consequence remains a separate gate.


## Interrupted cleanup visibility

A migration interruption after helper installation but before bootstrap-key removal must not look like ordinary readiness.

Read-only server readiness therefore also probes whether the exact HiVenues deployment authority can still reach the original bootstrap account. If the helper is already `ready / unconfigured` but that temporary access remains, Studio presents a cleanup warning and keeps the migration review reachable.

A clean Stage-4 bootstrap or fully completed migration ends with:

```text
publication capability = ready / unconfigured
bootstrap authority accessible by deployment key = false
```


## Partial-install recovery

A process interruption can occur after the root-owned helper exists but before the restricted sudoers fragment is fully active. In that state the normal helper status command may fail.

If the exact temporary bootstrap authority is still reachable, read-only readiness classifies this as:

```text
migration-incomplete
```

rather than treating the deployment as unrecoverable or ready. Studio keeps the bounded migration review available so the same idempotent candidate can be resumed and bootstrap-key cleanup can still be proven.

If helper status fails and bootstrap authority is not available, HiVenues fails closed and requires the owner to restore the exact reviewed bootstrap public key again before migration recovery.


## Post-cleanup recovery proof

Readiness on a `ready / unconfigured` server also performs the normal exact runtime/Release read-back.

If bootstrap authority is already absent and the exact deployment matches, Studio treats the one-time migration as complete and refuses to prepare another migration review. This covers an interruption after exact-key cleanup but before the previous UI request returned.

If the publication capability exists but the runtime/Release read-back no longer matches, domain publication remains held.


## Helper-last activation order

The canonical helper executable is installed **after** the validated restricted sudoers fragment and the other root-owned migration assets. Therefore an interruption before the helper becomes visible still reads as `upgrade-required`; an interruption after the helper becomes visible already has its bounded sudo authority in place.

The `migration-incomplete` recovery path remains as a second fail-safe for unexpected partial/status failures.


## Recovery eligibility is evidence-backed

A helper-status failure is **not** enough to call a server `migration-incomplete`.

Before exposing the recovery migration, HiVenues uses the temporarily restored bootstrap authority read-only to prove all of the following on the server:

- no publication status record exists;
- the managed Caddy configuration still exactly matches the qualified unpublished Stage-3 HTTP baseline;
- the managed firewall policy still exactly matches the qualified Stage-3 baseline.

Only that evidence permits `migration-incomplete`.

If a publication status record exists, either managed baseline differs, or the evidence cannot be obtained, HiVenues fails closed and does not offer the one-time migration. This prevents a configured or drifted published server from being rewritten merely because its helper status command failed.


## Windows-to-Linux executable byte invariant

The real reference-server migration exposed a cross-platform packaging defect: a Windows Studio build supplied the publication helper with CRLF line endings, causing Linux to interpret the shebang interpreter path with a trailing carriage return.

The publication helper is therefore governed by an explicit byte-level invariant:

- repository checkout pins `src/deploy/publication-helper-runtime.js` to LF;
- public-runtime bundle construction canonicalizes this Linux executable to LF before hashing/copying;
- one-time migration canonicalizes and validates the same helper before SHA-256 calculation and upload;
- the first line must be exactly:
  `#!/opt/hivenues/node/v24.19.0/bin/node\n`;
- deterministic qualification runs on both Linux and Windows and rejects any carriage return in the helper bytes.

This is a product/build correction. The reference VPS must not be manually edited to bypass it.
