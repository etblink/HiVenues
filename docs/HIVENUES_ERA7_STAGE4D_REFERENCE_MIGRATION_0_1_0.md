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
