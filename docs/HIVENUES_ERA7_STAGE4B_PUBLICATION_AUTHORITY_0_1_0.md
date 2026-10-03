# HiVenues Era 7 Stage 4B — Least-Privilege Publication Authority

**Issue:** #376
**Scope:** repository/synthetic qualification only
**Live DNS/TLS/server mutation:** held

## Purpose

Stage 3 narrowed steady deployment authority to `hivenues-deploy`, with sudo permission only for the one named HiVenues runtime service. Stage 4B adds a separate bounded publication capability without turning that account into a server administrator.

## Authority boundary

Fresh bootstrap installs one root-owned helper:

    /usr/local/libexec/hivenues-publication-<host-slug>

The deployment account may invoke only:

    hivenues-publication-<host-slug> status
    hivenues-publication-<host-slug> apply <strict-fqdn>

The sudo boundary exposes no root shell, arbitrary `systemctl`, direct Caddy/nftables command authority, caller-controlled path/service/port, package installation, or daemon reload.

The helper executable, its metadata, the managed Caddy/firewall files and publication status remain outside deployment-user-writable runtime and Release trees.

## Root-owned metadata

The helper metadata contains only schema version, host slug, runtime port and SSH port. No hostname is baked into bootstrap and no DNS/provider credential, TLS secret, deployment private key or HostGraph content is stored there.

The executable name supplies the host identity. Canonical managed paths are derived internally from that host identity rather than accepted from the caller or metadata.

## Initial bootstrap remains non-publication

A clean bootstrap still starts with the Stage-3 temporary HTTP configuration (`auto_https off`, `http://:80`, loopback reverse proxy), and the firewall still exposes only deployment SSH plus TCP 80.

Installing the capability therefore does not itself request TLS, connect a hostname, open 443, mutate DNS or change the public Release.

## Caddy certificate state

Fresh bootstrap provisions a Caddy-owned state root at `/var/lib/hivenues-caddy/<host>`. The hardened Caddy unit receives only that location through `HOME`, `XDG_DATA_HOME`, `XDG_CONFIG_HOME` and `ReadWritePaths`, providing durable ACME/certificate state without write access to HostGraph, Releases, deployment credentials or root configuration.

## Publication apply contract

`apply <strict-fqdn>` performs one bounded transaction:

1. validate the hostname again at the privileged boundary;
2. render hostname-bound Caddy configuration for the fixed loopback runtime;
3. render the fixed HiVenues firewall policy with only SSH, TCP 80 and TCP 443;
4. validate the Caddy candidate before replacement;
5. syntax-check an isolated nftables candidate with `nft -c`;
6. preserve the prior managed files/status;
7. replace only the host's HiVenues Caddy and firewall files;
8. restart only `hivenues-firewall.service` and `hivenues-caddy.service`;
9. prove both named services active;
10. persist hostname/time/config digests;
11. restore the prior files/status and prior service configuration if replacement, activation or status confirmation fails.

The helper never accepts a command, path, service name or port from the caller.

## Publication status

`status` returns bounded JSON only. It reports `unconfigured`, `configured` or `drifted`, checks managed-config digests, and when run through the root helper checks the two named services. It does not return file contents, private keys, provider credentials or certificate private material.

## Existing server behavior

The already-qualified Privex reference server predates this capability. Read-only inspection checks for the exact helper. If absent, HiVenues reports `publication-capability-upgrade-required`; it does not fall back to direct Caddy/nftables mutation through `hivenues-deploy`.

A later one-time migration of that development server remains a separately reviewed external effect. The ordinary product path is represented by a fresh bootstrap receiving this capability before bootstrap authority is removed.

## Stage-4 ordering

Possession of the publication capability does not authorize use. The product must still enforce:

    healthy exact deployment
    → exact hostname intent
    → DNS instructions
    → DNS observation confirmed
    → publication consequence review
    → helper apply
    → TLS observation verified
    → public HTTPS exact runtime/Release read-back

Caddy automatic HTTPS may not be activated before exact DNS confirmation at the product layer.

## Qualification

Deterministic evidence must prove helper installation from the exact qualified runtime bundle, strict hostname parity, absence of caller-controlled root surfaces, candidate validation, TCP 443 as the only additional public application port, rollback, bounded status/drift detection, helper-only sudo authority, existing-server fail-closed inspection, and zero live external effects.
