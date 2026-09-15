# Candidate C dogfood launcher

This launcher exists only for bounded operator testing of Candidate C. It is not a production deployment path, account system, or permanent hosting design.

## Invariants

- The Node listener binds only `127.0.0.1`.
- Candidate C durable state is stored at one explicit local path.
- No Hive write, signing, payment, provider mutation, media upload, deployment, DNS change, or Podping is performed by the launcher.
- `--public-ingress` adds a temporary access/session gate and same-origin mutation checks before Candidate C routes.
- The access secret comes from the process environment. It is not written to Candidate C state and the launcher never prints it.
- A Cloudflare Quick Tunnel, when used, is external test transport only. The launcher does not create or manage the tunnel.

## Requirements

Use the repository-pinned Node/npm versions and install the locked dependencies:

```powershell
npm ci --ignore-scripts --no-fund
npm run release:check:runtime
```

## Clean start

Choose a new state path. Do not reuse or overwrite a state file whose contents you need to preserve.

```powershell
$State = Join-Path $PWD '.dogfood\candidate-c-state.json'
npm run candidate-c:dogfood -- --state $State --port 4173
```

Open:

```text
http://127.0.0.1:4173/candidate-c
```

The first read initializes the durable envelope with the three accepted reference workspaces. Use **Create a place** for a new operator-created workspace.

## Resume the same state

Stop the launcher with Ctrl+C. Start it again with the exact same `--state` path:

```powershell
$State = Join-Path $PWD '.dogfood\candidate-c-state.json'
npm run candidate-c:dogfood -- --state $State --port 4173
```

The launcher validates and reuses the persisted Candidate C state. A new path creates an independent clean state.

## Temporary public ingress for an independent operator

Generate an unguessable secret in PowerShell and keep it only in the process environment:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$env:CANDIDATE_C_DOGFOOD_ACCESS_SECRET = [Convert]::ToHexString($bytes)
$State = Join-Path $PWD '.dogfood\candidate-c-state.json'
npm run candidate-c:dogfood -- --state $State --port 4173 --public-ingress
```

In a second PowerShell window, point a temporary Cloudflare Quick Tunnel at the loopback listener:

```powershell
cloudflared tunnel --url http://127.0.0.1:4173
```

Give the independent operator only the temporary `https://…trycloudflare.com` URL and the access phrase through a separate channel. Do not put the access phrase in the URL, repository, Candidate C state, screenshots, issue comments, or tunnel logs.

The first browser request is redirected to `/__dogfood/access`. After successful access, the launcher uses an in-memory session cookie (`HttpOnly`, `SameSite=Strict`, and `Secure` in public-ingress mode). State-changing requests with a missing or foreign `Origin` are rejected before reaching Candidate C.

## Shutdown

Stop `cloudflared` first, then stop the Node launcher with Ctrl+C. The tunnel URL is ephemeral. The Candidate C state remains only at the explicit local state path unless you deliberately copy it elsewhere.

## Evidence boundary

A successful local or tunneled session is not production authorization. Fourth Street Bar publication, live Hive effects, provider writes, permanent DNS, VPS changes, or production deployment require a separate Project Lead decision.
