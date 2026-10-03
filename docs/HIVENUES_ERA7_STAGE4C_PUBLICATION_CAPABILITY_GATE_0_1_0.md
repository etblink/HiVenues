# HiVenues Era 7 Stage 4C — Installed publication-capability proof gate

**Issue:** #380  
**Baseline:** `a6068e329566e7c364dc58291454a7c3091feb4c` / tree `2e15404ace675db902896f1f5a1de4d2e2b36f5b`

## Purpose

Stage 4B qualified the least-privilege root-owned publication helper for future clean server bootstraps.

Stage 4C makes one narrow fact visible to an ordinary installed-product operator before any live domain consequence:

> Is this already-deployed server actually equipped with that restricted publishing capability?

The answer is observed over the already pinned SSH deployment authority. Repository history is not accepted as server proof.

## Human flow

```text
healthy exact deployment
→ domain plan prepared
→ Check server readiness
→ read-only capability inspection
→ ready | one-time upgrade required | drifted
```

The primary UI uses human terms. Exact capability/status identifiers and digests remain available as secondary technical detail.

## Old-server behavior

A pre-Stage-4 server that lacks the exact root-owned helper reports:

```text
publication-capability-upgrade-required
```

Studio translates this to:

```text
One-time server upgrade required.
```

The deployed Release is not considered broken. HiVenues must not compensate by granting the steady deployment account broad root authority or by telling the operator to hand-edit Caddy/firewall configuration.

## Ready behavior

A Stage-4-capable server may report:

- `unconfigured` — helper exists and no domain publication has yet been applied;
- `configured` — helper records a bounded active publication;
- `drifted` — helper exists but managed config/service proof disagrees with its recorded state.

These are server publication-capability states, not DNS/TLS/public-read-back states.

## Zero-mutation boundary

The readiness check does not:

- write or query DNS;
- change provider state;
- apply Caddy or firewall configuration;
- request or renew TLS;
- restart the deployed Release;
- modify deployment authority;
- mutate HostGraph;
- broadcast to Hive;
- move value.

## Existing Privex reference server

The existing qualified reference VPS predates Stage 4B. Its expected result is `upgrade-required`, but that expectation must be tested from the qualified installed product.

If observed, the next gate is a separately reviewed development migration decision. This issue does not install the helper on the real server.

## Acceptance

Stage 4C repository qualification passes when:

1. only healthy real deployments with a prepared domain plan expose the readiness flow;
2. installed-product code performs the existing bounded read-only capability inspection;
3. ready, configured, drifted and upgrade-required outcomes are translated into ordinary operator language;
4. technical evidence remains available through progressive disclosure;
5. tests prove the operation leaves HostGraph and deployment state unchanged;
6. a qualified repair-style installed build is available for the real-server observation.
