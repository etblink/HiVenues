# Local venue-source authoring workflow

Hive-Venues now has a bounded local launcher for the accepted deployment-agnostic venue-source workflow.

It is for one narrow operator task:

> Open a previously saved `venue-source.json`, customize and preview the venue locally, keep or undo changes, and save another validated venue file without selecting a deployment target or contacting Hive.

## Start the local editor

From a Hive-Venues checkout with locked dependencies installed:

```text
node scripts/open-venue-source.js /path/to/venue-source.json
```

The launcher binds only to `127.0.0.1`. By default the operating system chooses a free local port and the command prints the exact `/customize` URL to open in a browser.

An explicit local port is optional:

```text
node scripts/open-venue-source.js /path/to/venue-source.json --port 3000
```

Press `Ctrl+C` in the terminal to stop the local editor.

## Safety boundary

The launcher builds its configuration from an explicit local-only configuration object rather than `.env` or ambient process configuration.

For this workflow:

- Hive write mode is disabled;
- signing is disabled;
- payments are disabled;
- moderation is disabled;
- onboarding is disabled;
- Distriator is disabled;
- Hive read methods used by the home preview return deterministic empty local results;
- any attempted Hive RPC call fails closed;
- the HTTP listener is fixed to `127.0.0.1`;
- unexpected `Host` headers are rejected;
- state-changing requests require the exact same-origin `Origin` header;
- the editor is protected against cross-origin framing.

The launcher does not choose a home-PC, VPS, or custom-server deployment target. It does not create a workspace, publish, deploy, mutate production, write to Hive, request Keychain, or alter DNS/VPS/systemd state.

## Save and reopen

The launcher uses the accepted source-authoring surface and its accepted `venue-source.json` semantics.

Preview-only edits do not silently change the saved file. While preview changes are pending, **Save venue file** is disabled and the save endpoint fails closed. Use **Keep changes** first, then save.

The resulting file is canonical validated deployment-agnostic source. It can be reopened with the same command later or paired with a separately selected deployment manifest through the accepted source-to-workspace bridge.

## Scope

This is an ordinary local-launch foundation, not a desktop installer, hosted/public editor, deployment wizard, media importer, or real-venue admission workflow.

A later product slice may reduce the remaining terminal/Node friction if real operator evidence shows that packaging or automatic browser launch is worth the added platform-specific behavior.
