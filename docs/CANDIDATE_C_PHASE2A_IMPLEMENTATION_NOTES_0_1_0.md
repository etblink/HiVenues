# Candidate C Phase 2A — implementation notes 0.1.0

Tracks #256.

## Boundary

Candidate C enters the mature Express/EJS application behind `/candidate-c` without replacing or restyling v3. No live-host migration is performed.

The Phase 1 default remains falsifiable:

> Server/HTML owns durable application state. JavaScript owns transient local interaction state.

## Production-path model in this slice

`src/candidate-c/` defines the bounded Candidate C domain/runtime:

- `model.js` — validated Host graph and typed Mechanic registry;
- `fixtures.js` — two synthetic reference hosts using the same graph contract;
- `store.js` — server-owned draft revisions, optimistic concurrency, Direction proposals, immutable website Releases, restore-to-draft and accountless local RSVP;
- `present.js` — composition registry, human temporal projection and ICS projection;
- `router.js` — public, Activity, Studio, Direction, release, RSVP, ICS and consequence routes.

Host and Activity identity are HiVenues-owned and independent of provider identifiers or page placement.

## Structural composition proof

Two different renderer families exist as separate EJS trees rather than one prop-switched page tree:

- `poster` — physical/live-room grammar;
- `editorial` — locationless creator/publication grammar.

Each owns its public homepage, Activity page and Studio canvas projection. Shared low-level art and semantic helpers do not force shared hierarchy.

## Studio / hypermedia boundary

The Studio is server-rendered and uses local HTMX for targeted contextual panels and dependent multi-region updates. One small custom client island is limited to:

- opening/closing the mobile contextual sheet;
- focus restoration after server swaps;
- transient focal-point preview before commit;
- transient Saving/Saved messaging.

The island does not mirror Host, Activity, Media, Presentation, draft or Release durable state.

Every durable edit carries an expected server revision. Stale writes fail closed with HTTP 409 and no silent overwrite.

## Publication / ecosystem boundary

Website release and external effects remain separate. Phase 2A permits application-local website Release snapshots, local RSVP and ICS generation only. It does not authorize Hive broadcasts, signing, payments, provider writes, external media uploads, deployment, DNS/VPS effects or live-host migration.

## References under qualification

- R1 `northline-hall`: physical/live-music host, poster/nightlife composition, venue facts, canonical Activity, accountless RSVP/ICS, `Raise a glass` host-language Hive-vote metaphor with disconnected consequence review.
- R2 `nova-ashby`: locationless creator, editorial composition, online session Activity, `Send a spark` host-language mapping over the same disconnected mechanic.

## Acceptance still pending at this note

This note does not claim Phase 2A completion. Exact-head CI, Chromium qualification, desktop/mobile screenshots, explicit visual critique and at least one post-capture improvement pass remain required before merge.
