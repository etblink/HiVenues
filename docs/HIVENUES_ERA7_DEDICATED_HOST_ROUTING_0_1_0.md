# HiVenues Era 7 — Dedicated-host canonical public routing

**Issue:** #390

## Purpose

A deployed HiVenues runtime serves exactly one immutable host Release behind one dedicated public hostname. The visitor-facing URL space should therefore belong to that host, not expose HiVenues' internal multi-host route prefix.

## Canonical deployed routes

For a dedicated hostname:

```text
/                                      host home
/activities/<slug>                     activity detail
/activities/<slug>/calendar.ics        activity calendar
/activities/<slug>/rsvp                local RSVP POST
/consequence/<mechanic>                consequence disclosure
/__hivenues/health                      exact deployment health/read-back
/__hivenues/release                     exact Release read-back
/hivenues/media/...                     immutable packaged media compatibility path
```

The internal host slug remains part of immutable Release identity and read-back, but it is not projected into the canonical visitor URL.

## Compatibility

Previously published visitor URLs under:

```text
/hivenues/<exact-host-slug>/...
```

remain compatibility aliases and redirect permanently to the equivalent dedicated-host canonical path.

A different host slug is rejected with 404. A one-host deployed runtime must never become a cross-host router.

Legacy RSVP POST aliases redirect with method-preserving HTTP 308 and do not record an RSVP before the canonical request is received.

## Studio and preview isolation

Studio, draft preview and multi-host development routing retain their existing `/hivenues/...` namespace.

Only the deployed one-host runtime receives `publicRouteBase = ""`. The same templates therefore render:

- existing Studio/preview routes in the local authoring product;
- root-relative canonical routes in the dedicated deployed product.

No hostname or DNS truth is written into HostGraph or immutable Release content.

## Link projection

The deployed templates project all current visitor navigation through the dedicated route base:

- host/home links;
- activity links;
- calendar links;
- RSVP form and HTMX targets;
- consequence/disclosure links;
- supported community/support links when those capabilities are later enabled.

Calendar ICS output uses the same deployed route base.

## Deployment safety

This routing correction changes only the qualified public runtime bundle.

It does not change:

- DNS requirements;
- publication helper/Caddy hostname configuration;
- TLS issuance or verification;
- server privilege model;
- Release package identity;
- HostGraph;
- provider/payment state;
- Hive/value effects.

The live reference deployment must not be updated until the exact routing candidate passes the normal runtime/distributable/installer qualification and an explicit deployment consequence review.
