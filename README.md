# HiVenues

HiVenues is a multi-venue community and social platform powered by Hive. Its turnkey v1 workflow lets a venue create a local workspace, customize the real application in Venue Studio, import venue-owned media, save the canonical venue source, and run an offline readiness rehearsal before any deployment is selected.

## Start a venue

Requirements: Node.js 24.19.x and npm 11.17.x.

```bash
npm ci --ignore-scripts --no-fund
npm run venue:create -- ./my-venue
npm run venue:studio -- ./my-venue
```

`venue:create` asks for venue facts and Hive public identities, then creates:

```text
my-venue/
├── venue-source.json
└── venue-assets/
```

The starter is generic and local. It does not select a host, deploy a service, write to Hive, request private keys, or move funds. Juniper Workshop is the synthetic test/example venue; Fourth Street Bar remains the reference deployment for historical production qualification.

Venue Studio listens only on `127.0.0.1`. Use its browser controls to edit the venue, import PNG/JPEG/GIF media into the managed `venue-assets/` directory, preview the real application renderer, **Keep changes in draft**, and **Save to workspace**. Imported media is content-addressed and existing files are never silently overwritten.

## Check readiness

After saving:

```bash
npm run venue:ready -- ./my-venue
```

This is an offline, non-production rehearsal. It validates canonical `venue-source.json` bytes and managed media, then proves the saved source can enter the existing deployment-binding and portable-workspace compiler using a `.invalid` rehearsal target. It must leave the source bytes unchanged and performs no deployment, DNS, VPS, Hive, signing, onboarding, key, or funds effect.

Before a v1 release candidate is accepted, run the repository gates:

```bash
npm run release:check:name
npm run release:check:hivenues-v1
npm run check
```

The HiVenues v1 oracle is distinct from the preserved Fourth Street reference-production gate. Historical compatibility identifiers and provenance files remain scoped history; current product-facing release metadata is HiVenues.

## Development and reference paths

- `src/venue/turnkey-workspace.js` — official starter workspace and source composition.
- `src/venue/turnkey-studio.js` — loopback-only turnkey Studio wrapper.
- `src/venue/turnkey-readiness.js` — offline saved-source readiness rehearsal.
- `src/venue/source.js` — deployment-agnostic source contract.
- `src/venue/workspace-from-source.js` — existing deployment-binding/workspace path.
- `src/release/v1-readiness.js` — preserved Fourth Street reference-production gate.
- `docs/DEPLOYMENT_AGNOSTIC_VENUE_SOURCE.md` — deeper source/deployment architecture.

`npm run check` remains the deterministic repository qualification gate. Production deployment and live Hive effects require their own explicit authorization and are not implied by any local venue command or by a GitHub issue.
