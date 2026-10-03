# HiVenues Era 7 Stage 4A — Domain / DNS / TLS / public read-back contract

**Status:** candidate contract for Issue #372  
**Baseline:** `ba405a03d0c6b36bc1fbb43324dbaf7a72e54958` / tree `944d84c4ddec9714b4ec42175876f03baaaeb4fa`

## 1. Purpose

Stage 3C proved that an exact immutable HiVenues Release can be deployed to a clean real Privex server and remain healthy under restricted deployment authority after Studio restart.

Stage 4 must now connect a human-owned hostname without collapsing distinct truths:

```text
healthy server deployment
≠ domain intent
≠ DNS observation
≠ server host routing
≠ TLS validity
≠ public HTTPS exact-Release read-back
```

This Stage-4A contract is deliberately non-mutating. It defines the product truth that later live qualification must satisfy before any DNS, host-routing, or certificate consequence is authorized.

## 2. Operator abstraction

The ordinary product journey should eventually read approximately:

```text
Put this site online
→ Connect a domain
→ Show me what DNS needs to change
→ Check the domain
→ Secure the site
→ Confirm the public site
```

Exact record values, runtime provenance, immutable Release digests, and certificate evidence remain available as consequence/proof detail. They should not become the primary mental model required of an ordinary operator.

## 3. Canonical public-endpoint record

Public-endpoint evidence is deployment state, not HostGraph or Release content.

A Stage-4 endpoint record contains:

- exact normalized hostname;
- exact required DNS records;
- last DNS observation and whether it matches;
- independently observed TLS evidence;
- public HTTPS read-back state;
- mismatch fields when exact read-back fails.

It contains no DNS/provider credential, SSH private key, wallet secret, or customer content mutation authority.

`FileDeploymentStore.publicEndpoint` is the structured source of truth. Existing `domainState` and `tlsState` are derived summaries and are rejected on reload if they disagree with the structured endpoint.

## 4. Hostname contract

The first contract accepts one explicit fully qualified hostname.

Rejected ordinary input includes:

- URL schemes;
- paths;
- explicit ports;
- credentials;
- wildcard hostnames;
- single-label/local names.

This prevents an operator-facing hostname field from silently doubling as a URL parser or certificate policy surface.

## 5. DNS requirement model

Stage 4 supports provider-neutral exact requirements for:

- `A`;
- `AAAA`;
- `CNAME`.

The reference Privex path can therefore express an exact `A` record for a public IPv4 address without making Privex, Cloudflare, or any registrar part of canonical product truth.

A `CNAME` requirement is exclusive with `A`/`AAAA` requirements for the same hostname.

The first adapter mode is:

```text
guided-handoff
```

Meaning HiVenues may show exact records for the human to enter at a registrar/DNS host, then independently verify what DNS returns. Manual registrar entry is acceptable. Manual server administration is not.

## 6. DNS proof

DNS confirmation is an observation, not an inference from operator intent.

A proof records:

- exact hostname;
- relevant observed `A`/`AAAA`/`CNAME` values;
- check time;
- optional resolver label;
- exact match result.

Relevant required record sets must match exactly. A different address is a mismatch, not partial success.

DNS confirmation advances TLS only to **ready for request**. It never implies that TLS already exists.

## 7. TLS proof

TLS remains independent state.

TLS can be recorded as verified only after DNS is confirmed and an HTTPS/TLS observation proves:

- the exact intended hostname;
- an authorized TLS connection;
- TLS 1.2 or newer;
- a currently valid certificate window;
- certificate identity matching the exact hostname or a valid one-label wildcard.

DNS resolution alone cannot set TLS to verified.

## 8. Public HTTPS exact read-back

A generic 200 response is not deployment proof.

Final public read-back must use exactly:

```text
https://<hostname>/__hivenues/health
```

and prove:

- HTTP status 200;
- runtime status `healthy`;
- exact runtime source SHA;
- exact runtime source tree;
- exact package version;
- exact Node version;
- exact runtime bundle digest;
- exact host slug;
- exact immutable Release id;
- exact Release digest;
- exact package digest.

A default Caddy page, unrelated web application, stale HiVenues Release, or healthy response from the wrong hostname must fail the proof.

## 9. Consequence review

Before a future live Stage-4 action, HiVenues must present one bounded review derived from the healthy deployment and endpoint preflight.

Potential reviewed consequences are:

1. publish or manually enter only the exact DNS records shown;
2. verify DNS before changing host routing;
3. configure only the reviewed HiVenues hostname routing;
4. request/verify TLS only after DNS confirmation;
5. verify exact public HTTPS runtime/Release identity.

Still held:

- provider payment;
- unrelated DNS records;
- unrelated server configuration;
- Hive writes;
- value movement;
- customer host-content mutation.

Stage 4A does not execute any of those live consequences.

## 10. Planned first live hostname

The owner and Project Lead have identified:

```text
dev.fourthstreetbar.com
```

as the preferred first live Stage-4 qualification hostname.

It is a **planned owner-controlled reference/development hostname**, not a hard-coded product dependency and not yet authorization to mutate DNS. The synthetic `Harbor and Hearth` Release remains a synthetic infrastructure proof even if it is temporarily reached through that hostname.

## 11. Qualification boundary

Stage-4A qualification must prove with deterministic offline evidence:

- hostname validation;
- DNS instruction normalization;
- DNS mismatch and exact confirmation;
- TLS independence from DNS;
- certificate-name/time/authorization validation;
- public HTTPS exact-runtime/Release comparison;
- restart-safe persistence outside HostGraph;
- rejection of tampered summary state;
- bounded consequence review with unrelated effects held.

No network call, DNS write, server routing write, certificate request, provider write, Hive write, or value movement is part of this contract test.

## 12. Next boundary after this contract

After this model is accepted, the next Stage-4A slice should compose it into the installed Studio:

```text
healthy deployment
→ Connect domain
→ enter hostname
→ show exact DNS instructions
→ save/restart/reopen
→ review next consequence
```

The first live DNS/Caddy/TLS mutation remains a separate explicit gate.
