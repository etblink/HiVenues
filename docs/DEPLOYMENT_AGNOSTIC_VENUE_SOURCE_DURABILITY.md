# Deployment-agnostic venue-source durability and workspace bridge

This slice makes the accepted deployment-agnostic venue source an ordinary durable file **before** deployment selection.

The boundary remains:

```text
OPERATOR CUSTOMIZATION / CONFIRMATION
-> venue-source.json
-> later explicit deployment selection
-> DEPLOYMENT_BOUND_HV5_AUTHORING
-> existing PORTABLE_VENUE_WORKSPACE
```

`venue-source.json` contains only the already accepted deployment-agnostic source envelope. It does not contain `deploymentRef`, runtime hostnames, service names, release roots, storage paths, credentials, Hive private keys, payment receipts, moderation state, onboarding state, messages, or other runtime/private state.

## Save from the offline authoring surface

The offline source-authoring surface now exposes **Save venue file**. It downloads the session's currently **kept** source as canonical UTF-8 JSON named:

```text
venue-source.json
```

Preview-only changes are not silently written into the saved file. Use **Keep changes** first, then **Save venue file**. Saving does not publish, deploy, contact Hive, select a host, or alter production.

The saved bytes are produced by the same canonical source serializer used for validation and source digesting.

## Reopen

`loadDeploymentAgnosticVenueSourceFile()` validates a saved file before it becomes source input again. The file must be a regular UTF-8 JSON file no larger than 1 MiB and must pass the accepted deployment-agnostic source contract, including secret rejection and the prohibition on `deploymentRef`.

`createOfflineSourceAuthoringSurfaceFromFile()` is the local/offline reopening seam for callers that provide the preview renderer. Reopening a file therefore creates a fresh authoring session from validated source bytes rather than trusting arbitrary browser or filesystem state.

This is a durability foundation, not a production-mounted editor or a complete desktop launcher.

## Later workspace binding

The accepted portable workspace remains target-bound and its schema is unchanged.

A saved venue source can later be paired with a separately selected valid deployment manifest through:

```text
buildPortableVenueWorkspaceFromSource({
  venueSource,
  deploymentManifest
})
```

That adapter delegates to the accepted `bindDeploymentAgnosticVenueSource()` boundary and then to the existing `buildPortableVenueWorkspace()` implementation. It does not create a new workspace authority.

For the existing local CLI materialization path:

```text
node scripts/build-venue-workspace-from-source.js \
  venue-source.json \
  deployment-manifest.json \
  output-directory
```

The output directory uses the same atomic no-replace materializer as the accepted workspace builder. The original source file is not rewritten when a deployment is selected.

## Non-goals and authority

This slice does not:

- mount source authoring into `src/app.js`, `src/server.js`, or production;
- deploy Fourth Street or any other venue;
- perform Hive, Keychain, payment, moderation, onboarding, DNS, VPS, systemd, or other external writes;
- add CID/IPFS;
- change the portable-workspace schema;
- add a deployment wizard;
- add image import or media replacement;
- authorize real-venue onboarding.

The purpose is narrower: **an operator-confirmed venue can survive the editing session as a validated portable source file and later enter the already accepted deployment-binding/workspace path without changing its upstream source bytes.**
