# HiVenues Era 7 Stage 4E — Guided DNS, hostname publication, TLS and public read-back

**Issue:** #386  
**Scope:** repository/synthetic qualification before the first live DNS/publication consequence

## Accepted baseline

```text
MAIN = fed710851ed235c768f58b4ce07458f43de22e5a
TREE = 3c9b09580f8871e63198591dd1a462b1f6e6d9e1
```

The real reference VPS already proved:

```text
publication capability = ready
publication state = unconfigured
temporary bootstrap authority = removed
exact active runtime + immutable Release = confirmed
planned hostname = dev.fourthstreetbar.com
```

## Human flow

The reference provider path is deliberately split into separate proofs and consequences:

```text
show exact DNS record
→ owner changes only that record at the DNS provider
→ HiVenues checks DNS read-only
→ exact DNS match
→ review hostname publication consequence
→ restricted helper apply <exact-hostname>
→ Caddy/firewall activation
→ TLS observation
→ exact public HTTPS health read-back
```

No single step is allowed to imply the next one.

## Guided DNS handoff

HiVenues does not need DNS-provider credentials for this reference path.

The product shows the exact prepared record and then performs read-only DNS resolution through an injectable observation service. Only exact requirement records are admitted into deployment evidence.

Resolver outcomes are treated as follows:

- exact observed record set → `dns-confirmed`;
- no matching record / wrong value → `dns-mismatch`;
- resolver service failure → fail closed without manufacturing a mismatch proof.

The current real requirement is:

```text
A dev.fourthstreetbar.com → 121.127.34.154
```

## Live publication gate

The publication review is available only after all of these are simultaneously proven:

- deployment remains healthy;
- exact DNS is confirmed;
- restricted publication capability is `ready`;
- publication state is `unconfigured`, or already `configured` for the same exact hostname;
- temporary bootstrap authority is absent;
- exact active runtime + immutable Release read-back still matches Studio.

The consequence review binds its digest to the DNS observation, hostname, runtime and immutable Release.

## Remote mutation authority

The steady deployment account does not receive generic Caddy, nftables, systemctl or shell authority.

The only live hostname mutation is:

```text
sudo -n /usr/local/libexec/hivenues-publication-<host> apply <exact-hostname>
```

The root-owned helper validates the hostname again, validates candidate Caddy/firewall configuration, atomically replaces only HiVenues-managed files, restarts only the dedicated HiVenues firewall/Caddy units, verifies service state, and rolls back the managed files if activation fails.

## Interruption recovery

If the helper committed the exact hostname but the browser/local persistence ended before Studio recorded TLS-requesting state, the next review observes `configured` for the same hostname and marks the review as `alreadyApplied`.

The retry does not invoke `apply` again for a different or ambiguous hostname. It resumes by persisting the same local TLS-requesting state.

A configured different hostname fails closed.

## TLS proof

After publication, local state is `requesting`. TLS is not claimed successful because Caddy restarted.

The installed observer independently opens TLS to port 443 with SNI for the exact hostname and records:

- authorization result;
- negotiated protocol;
- certificate DNS names;
- validity window;
- observation time.

The pure publication contract accepts `verified` only when hostname identity, authorization, protocol and time validity all agree.

## Exact public HTTPS proof

After TLS verifies, HiVenues requests exactly:

```text
https://<hostname>/__hivenues/health
```

using normal certificate verification.

The response must be HTTP 200 JSON and must match the locally preserved exact:

- runtime source SHA;
- runtime source tree;
- package version;
- Node version;
- runtime bundle digest;
- host slug;
- immutable Release id;
- Release digest;
- package digest.

A generic page, stale Release, wrong host, wrong URL or wrong runtime is recorded as a mismatch rather than success.

## State persistence

DNS, TLS and public-read-back evidence remain stored in deployment state outside HostGraph and immutable Releases.

Changing the active runtime/Release invalidates public read-back proof.

## External effects during repository qualification

None.

Until the exact installed Stage-4E candidate qualifies:

- real DNS mutation remains held;
- real helper `apply` remains held;
- TCP 443 activation remains held;
- TLS issuance remains held.

## Real exit

The real reference deployment passes Stage 4E only at:

```text
DNS = confirmed
publication helper = configured for dev.fourthstreetbar.com
TLS = verified
public HTTPS read-back = verified
public runtime/Release identity = exact
```

Stage 5 remains separate.


## Review freshness and target binding

A live publication review is not reusable indefinitely.

The DNS observation must be recent (within ten minutes, with only a small future-clock-skew allowance) when the review is prepared and again when its confirmation is submitted.

The review digest also binds the exact server host, SSH port, steady deployment username and trusted SSH host fingerprint alongside the hostname, DNS observation, runtime and immutable Release. If any of those facts change, the prior review becomes stale and cannot authorize publication.

Once TLS publication has begun, the hostname-publication review is no longer available. This prevents a direct or repeated submission from resetting verified TLS/public-read-back evidence back to an earlier state.


## Dual-stack exactness

An exact A-only or AAAA-only plan must not silently ignore the opposite address family.

For an A-only hostname, HiVenues also performs a read-only AAAA lookup. For an AAAA-only hostname, it also performs a read-only A lookup. Any unexpected opposite-family address is persisted as conflicting DNS evidence and prevents `dns-confirmed`.

This avoids a hostname that sends IPv4 clients to the reviewed VPS while sending IPv6 clients somewhere else, or vice versa.

AAAA values are canonicalized before comparison so equivalent textual IPv6 spellings do not create false mismatches.

Resolver inability such as an unsupported query is not treated as proof that a record is absent; it fails the DNS check closed.


For address-record plans, HiVenues also checks that the hostname is not actually a CNAME alias. A resolver that follows an alias and returns the expected final address is not sufficient to prove the operator created the exact reviewed A/AAAA record.
