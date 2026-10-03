# HiVenues Era 7 Stage 5B — Existing-server management re-authorization

**Issue:** #392

## Purpose

A deliberately disconnected deployment is still a running public site. Disconnecting HiVenues management must not force the operator to treat that preserved server as a fresh machine later.

Stage 5B defines an explicit, narrow re-authorization lifecycle for the same preserved deployment record.

## Governing distinction

Re-authorization is **not bootstrap**.

It does not:

- install operating-system packages;
- install or replace Node;
- upload or activate a runtime;
- upload or activate a Release;
- rewrite systemd service units;
- rewrite Caddy or firewall configuration;
- change DNS or request TLS;
- change provider/payment state;
- perform Hive writes or move value.

It changes only the deployment-management SSH authority and then re-proves the unchanged public deployment.

## Lifecycle

```text
disconnected preserved deployment
→ create fresh local deployment-only SSH authority
→ persist state = reauthorizing
→ operator temporarily restores exact fresh public key to original bootstrap account
→ read-only pinned-host inspection
→ exact runtime/Release/publication proof
→ explicit consequence review
→ install only fresh key for hivenues-deploy
→ prove fresh steady-account login
→ mark server authority state restricted-deployment-user
→ remove same temporary key from bootstrap account
→ prove fresh key no longer authenticates as bootstrap
→ re-prove exact public HTTPS Release
→ return same deployment record to healthy / rollback-available
```

## Preserved identity

The same deployment record retains:

- deployment ID and history;
- pinned server host fingerprint;
- active and previous immutable Releases;
- runtime provenance;
- domain/DNS/TLS/public endpoint evidence;
- original bootstrap-account identity.

A fresh local authority ID is intentionally created because the old private key was revoked during disconnect.

## Interruption recovery

The `reauthorizing` state persists the new authority reference before any server mutation.

Admitted remote states are:

1. **bootstrap temporary only** — normal pre-consequence state;
2. **steady authority present + bootstrap temporary** — key installation committed but narrowing did not finish;
3. **steady authority only** — narrowing committed before local state transition.

Retries re-prove exact runtime/Release/publication identity before continuing.

If neither the temporary bootstrap account nor steady deployment account accepts the fresh authority, or if runtime/Release/publication identity differs from the preserved record, HiVenues fails closed.

A transient DNS mismatch discovered by the final public proof is also recoverable. The deployment remains `reauthorizing`, exposes only a read-only DNS recheck against the already prepared destination, and does not expose the reconnection consequence again until DNS is exact. Correcting DNS and rechecking resumes the same lifecycle without runtime/Release/publication reconfiguration.

## Finalization ordering

The bounded finalization writes server authority metadata to `restricted-deployment-user` before removing the temporary bootstrap key.

That ordering makes interruption recoverable:

- if finalization stops before key removal, the next retry still has bootstrap access and removes it;
- if it stops after key removal, the authority-state marker is already final and the steady account can prove completion.

## Public proof

Management reconnection is not complete merely because SSH succeeds.

After bootstrap authority is removed again, HiVenues independently re-verifies:

- DNS still points to the preserved deployment;
- publication helper state remains configured for the same hostname;
- bootstrap-key authentication is unavailable;
- TLS is authorized;
- public `/__hivenues/health` returns the exact preserved runtime and active immutable Release.

Only then does the local deployment return to a managed healthy/rollback-capable state.

## Product boundary

The user-facing product must clearly distinguish:

- **Prepare management reconnection** — local key creation only;
- temporary provider-console key restoration;
- **Review management reconnection** — read-only exact proof;
- **Reconnect HiVenues management** — bounded authority consequence.

Release selection and deployment mutation controls remain hidden while the deployment is `reauthorizing`.

## Live rollout dependency

The dedicated-host routing correction in #390 may update the live reference deployment only after Stage 5B is repository-qualified and the same real deployment is re-authorized through this lifecycle.
