# HiVenues Era 7 Stage 5A — Real rollback and deployment-authority lifecycle

**Issue:** #388  
**Scope:** repository/synthetic qualification before Release-B / rollback / disconnect effects on the real reference deployment

## Accepted public baseline

The reference deployment has completed Stage 4:

```text
dev.fourthstreetbar.com
DNS = confirmed
TLS = verified
public HTTPS exact Release read-back = verified
publication capability = ready/configured
bootstrap authority = removed
```

Stage 5 does not re-prove first publication. It proves that an ordinary installed-product operator can safely change, roll back, and then disconnect management authority without terminal administration.

## Rollback contract

A real rollback is not a redeployment from Working state and is not a fresh package upload.

The admitted rollback path is:

```text
public exact Release B
→ review current B and previous A
→ re-prove trusted server / restricted publication / no bootstrap authority
→ prove server currently matches B or an interrupted rollback already committed A
→ validate the already-installed A package on the server
→ preserve the exact qualified runtime
→ atomically activate A
→ restart only the dedicated HiVenues host service
→ exact local read-back = A
→ persist active A / previous B
→ invalidate stale public Release proof
→ independently re-verify public HTTPS = A
```

The remote rollback preflight uses the deployed runtime's own release-store verifier against the already-installed prior package. A rollback never trusts only a directory name.

## Rollback interruption recovery

Before local rollback state is committed, the server can truthfully be in either of two admitted states:

- current active Release B;
- exact previous Release A, if the remote activation committed before the client response/local write completed.

Anything else fails closed.

If A is already active, retry adopts the exact read-back and does not activate a third or ambiguous Release.

## Deployment-authority disconnect contract

Disconnect means **disconnect HiVenues management**, not take the site down.

The intended sequence is:

```text
public exact Release verified
→ review exact deployment authority
→ persist local removal intent first
→ remove only the exact HiVenues public key from hivenues-deploy authorized_keys
→ prove a new SSH authentication attempt with that authority fails
→ persist remote-key-removed proof
→ revoke the local OS-protected private key
→ mark deployment disconnected
→ preserve running site, DNS/TLS/publication configuration, HostGraph and immutable Release history
```

No generic SSH configuration, server service, DNS, TLS, runtime or Release mutation belongs to disconnect.

## Disconnect interruption recovery

The local record persists **removal-started** before remote key removal.

This ordering distinguishes an expected failed authentication after an in-progress disconnect from an unexplained authority failure.

Admitted recovery states:

1. removal intent persisted, key still authenticates → retry exact remote-key removal;
2. removal intent persisted, key no longer authenticates → persist remote-removed proof and continue local revocation;
3. remote-removed proof persisted, local key still exists → revoke it and disconnect;
4. remote-removed proof persisted, local key already revoked → finish local disconnected-state persistence.

An authority that is unexpectedly unavailable **without** the persisted removal intent is ambiguous and fails closed.

## Lifecycle isolation

While rollback or authority-disconnect recovery is active, HiVenues suppresses or rejects conflicting exact-deployment / Release-selection actions.

This prevents an operator or stale browser request from turning a recoverable lifecycle state into an ambiguous mixed mutation.

## Public proof monotonicity

Changing active Release invalidates only the exact public Release read-back proof. DNS/TLS facts may remain valid, but the product must explicitly verify the HTTPS health endpoint again for the new active Release before the lifecycle may continue to authority disconnect.

## Restart persistence

After disconnect, a restarted Studio must preserve:

- deployment state = disconnected;
- authority reference = absent;
- active/previous Release history;
- public endpoint evidence;
- state history documenting rollback and disconnect;
- local HostGraph and immutable Releases.

The disconnected state cannot select or deploy another Release until a new deployment authority/target lifecycle is explicitly created.

## External-effect ceiling for repository qualification

Until the exact installed Stage-5A candidate qualifies:

- real Release B deployment remains held;
- real rollback remains held;
- remote deployment-key removal remains held;
- local authority revocation for the real deployment remains held;
- DNS/provider/Hive/value mutations remain held.

## Real exit

The later owner-operated proof must complete:

```text
A public exact
→ B public exact
→ rollback to A public exact
→ deployment authority disconnected
→ Studio restart truthful
→ host/Release history preserved
```

Human discoverability/usability remains a separate acceptance gate under #374.
