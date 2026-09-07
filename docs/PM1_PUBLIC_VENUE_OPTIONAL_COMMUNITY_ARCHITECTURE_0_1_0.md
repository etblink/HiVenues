# PM1 public venue / optional community architecture 0.1.0

## Status and authority

| Field | Value |
| --- | --- |
| Tracking issue | #161 — PM1 Architecture |
| Parent roadmap | #160 — HiVenues Product Maturation |
| Study date | 2026-09-06 |
| Canonical base commit | `88bef0ca9370b74503a6bd079d040a7e7763188c` |
| Canonical base tree | `4691c637ed436eaa1f305edc9f5fd13d2e7c01fa` |
| Scope | Product architecture and PM2 requirements only |
| Implementation authorization | **No** |
| Production / Hive / key / payment / deployment effects | **None** |

This document answers Issue #161. It is a product-architecture decision candidate, not permission to change the v1 source schema, runtime routes, Studio, public renderer, authentication, payment configuration, deployment, or any real venue.

## Executive decision

HiVenues should mature from one Hive-community-centered application shell into a **venue-first public site with optional capability modules**.

The universal product contract is:

> A venue can create, edit, preview, save, and later deploy a complete public venue presence without requiring Hive activation.

Hive remains a differentiated HiVenues capability, but it becomes an **optional community integration** rather than a prerequisite to creating the venue's public site. Hive-backed payment capability is separately optional and must retain its stronger security/authority boundary.

The intended composition is:

```text
HIVENUES VENUE
│
├── PUBLIC VENUE SITE                          universal
│   ├── venue identity + brand
│   ├── pages + navigation
│   ├── typed venue content/components
│   ├── media
│   ├── business/contact/location facts
│   ├── SEO/share metadata
│   └── public CTAs / external integrations
│
├── COMMUNITY CAPABILITY                      optional
│   ├── Hive community
│   ├── updates/posts/replies/votes
│   ├── Threads
│   ├── profiles
│   ├── messaging
│   ├── rewards/wallet views
│   └── Hive sign-in / Keychain interactions
│
└── TRANSACTION CAPABILITY                    optional, separately privileged
    ├── venue payment entry points
    ├── merchant/account binding
    └── existing explicit signing / authority rules
```

A venue may enable neither optional capability, community only, transaction only if a future supported architecture permits it safely, or both. Capability availability must determine navigation and runtime exposure without creating a second authoring authority.

Fourth Street Bar's compatibility target is **public site + community enabled + transaction capability preserved according to its accepted production contracts**.

## 1. Current coupling inventory

The present v1 architecture is coherent for its historical product, but public-site, Hive, and transaction concerns are coupled at several product boundaries.

### 1.1 Fresh venue creation requires Hive identity before public authoring

`scripts/create-venue.js` prompts for:

- Hive community id;
- official Hive account;
- Threads container account;
- payment merchant account.

`src/venue/turnkey-workspace.js` requires those values before it can build the starter source.

`src/venue/context.js` requires a complete `hive` object in every v1 `venueContext`, including community identity, official account, Threads account, and payment merchant accounts.

**Finding:** a user cannot currently begin a generic public venue workspace independently of Hive integration selection.

### 1.2 Public application navigation is community-application navigation

`views/common/header.ejs` has a fixed primary information architecture:

- Home;
- Community;
- Threads;
- Pay when enabled;
- You / Sign in.

This is appropriate for the current Fourth Street application but is not a venue-neutral public-site navigation model.

**Finding:** public venue navigation and community application navigation are the same shell.

### 1.3 Public footer assumes Hive participation

`views/common/footer.ejs` describes public Hive data, private keys, Hive basics, and includes shared transaction/signing scripts.

**Finding:** Hive is presented as a universal product property even when future venue archetypes may not activate community capabilities.

### 1.4 The homepage topology is fixed around current application capabilities

`views/pages/home/index.ejs` statically composes:

- hero;
- official updates;
- community pulse;
- programs;
- equipment status;
- visit/community pathways;
- gallery.

`src/venue/package.js` validates the matching fixed home structure.

**Finding:** the public renderer is not yet a general page/capability compositor.

### 1.5 Security separation is already a strength

Existing authoring and deployment contracts distinguish:

- operator-authored content;
- integration-owned Hive identity;
- security-privileged payment identity;
- deployment-owned state;
- secrets/private material forbidden from authoring.

**Decision:** PM2 must preserve these ownership classes. Making Hive progressive must not convert integration-owned identities into ordinary editable presentation fields.

## 2. Product boundary: universal public venue site

The **Public Venue Site** is the universal HiVenues product surface.

It must be capable of representing a useful venue without any community session, blockchain request, payment authority, or Hive account.

### Universal site responsibilities

The future semantic site system should be able to represent:

- venue/site identity;
- logo and brand media;
- theme/design tokens;
- one or more public pages;
- primary navigation;
- page metadata;
- business facts such as address, hours, phone, map/directions;
- typed public content/components;
- public links and CTAs;
- managed media;
- accessibility metadata;
- local-business structured information where applicable.

### Universal public content families

The architecture should support typed capabilities that can be included only when useful. Candidate families include:

- Hero / identity;
- Hours & Location;
- Gallery;
- Contact;
- CTA;
- About;
- Testimonials / Press;
- Events / Schedule / Programs;
- Menu / Services;
- Private Events / Rentals;
- Amenities / Equipment;
- Announcements / Updates.

These are product-domain concepts, not arbitrary markup nodes.

### Public browsing invariant

A public visitor must be able to browse all public venue pages without:

- possessing a Hive account;
- loading Keychain;
- signing a message;
- authorizing a transaction;
- receiving an authentication prompt merely to read venue information.

Community or transaction entry points may invite additional interaction only after the visitor intentionally chooses them.

## 3. Optional community capability

Hive community functionality remains a first-class HiVenues differentiator.

The architecture does **not** remove, hide, or devalue:

- community browsing;
- official updates;
- replies and voting;
- Threads;
- user profiles;
- walls;
- encrypted messaging where supported;
- rewards/wallet views;
- onboarding;
- Hive identity.

Instead, these behaviors move behind an explicit **Community capability boundary**.

### Community-disabled venue

When community capability is absent/disabled:

- no Community or Threads primary navigation is synthesized;
- no Hive sign-in control competes with venue navigation;
- no community-specific footer copy is universal;
- public content remains complete and useful;
- authoring does not request community identifiers merely to create the site.

### Community-enabled venue

When enabled:

- the venue may expose a top-level `Community` destination or another semantically equivalent operator-selected venue label from an approved set;
- community-specific subnavigation may contain Threads, profile, messages, wallet/rewards, and other accepted community surfaces;
- public-site components such as Latest Updates or Community Pulse may project community data into venue pages;
- the public site remains navigable before sign-in;
- Keychain is invoked only for actions that actually require Hive identity/signing.

### Community shell recommendation

Do **not** reproduce the current global Home / Community / Threads / You shell on every public venue page.

Preferred product model:

```text
PUBLIC SITE NAV
Home · Menu · Events · Gallery · Visit · Community     (example only)
                                             │
                                             ▼
                                  COMMUNITY EXPERIENCE
                                  Feed · Threads · You
```

Exact labels are domain/venue decisions constrained by semantic navigation rules, not hard-coded strings from this study.

## 4. Transaction capability is separate from community capability

Payments should not be treated as merely another visual page block or as an automatic consequence of community activation.

The existing system correctly gives merchant/payment identity stronger ownership and authorization semantics.

**Decision:**

- transaction capability is separately declared from community capability;
- ordinary authoring may control approved public presentation around a payment CTA, but not merchant authority;
- enabling payment presentation requires a valid separately owned transaction integration;
- the Studio must never infer that adding a "Pay" or "Order" visual component grants payment authority;
- current signing, review, fail-closed, merchant, and funds boundaries remain controlling.

This separation also leaves room for future non-Hive external booking/order/ticket links without conflating them with platform payment authority.

## 5. Navigation and shell composition

Navigation should be derived from the future semantic public-site document plus enabled optional capabilities.

### 5.1 Primary navigation

Primary public navigation represents **visitor goals**, not implementation modules.

Examples by archetype:

- restaurant: Home · Menu · Private Events · Gallery · Visit;
- music venue: Shows · Artists · Venue · Rentals · Visit;
- workshop/program venue: Programs · Equipment · About · Visit;
- Fourth Street: Home · Events · Gallery · Visit · Community.

These are examples, not frozen templates.

### 5.2 Capability entry

An optional capability may contribute an approved navigation destination when enabled.

Examples:

- Community capability contributes Community;
- transaction integration may contribute Order, Pay, Tickets, Reserve, or another capability-specific CTA only when supported by its typed contract.

The operator may choose among approved placement/labels where PM2 explicitly allows it. Capabilities cannot silently inject arbitrary routes into public navigation.

### 5.3 Community subnavigation

Community internals belong within that experience rather than occupying universal public navigation.

This reduces cognitive load for ordinary visitors and prevents technical feature names from defining venue information architecture.

### 5.4 Shared venue identity

The public and community experiences share:

- venue identity;
- brand system;
- accessibility tokens;
- public business facts where relevant;
- a coherent shell transition.

Community UI may have denser application controls, but it must still read as part of the venue rather than a separate developer tool.

## 6. Progressive Hive integration decision

### Decision

**Adopt progressive integration as a PM2 requirement.**

A future v2 venue/site source must be able to represent a valid public venue with no active Hive community integration.

This is a future-version requirement, **not** permission to loosen current v1 validation.

### Desired operator sequence

```text
Create venue
  -> identity / venue type / business facts
  -> brand + media
  -> public pages/components
  -> save / preview / readiness
  -> optionally connect community
       -> supply/validate Hive public identities
       -> expose community components/routes
       -> separately activate privileged effects where required
```

### Authority requirements

Progressive integration must preserve:

1. Hive community/account identity remains integration-owned.
2. Payment merchant identity remains security-privileged.
3. Private keys remain forbidden from venue authoring source.
4. Community activation cannot imply posting authority on a server.
5. Transaction activation cannot be inferred from visual configuration.
6. A disabled integration has no ambient runtime authority.
7. Migration from v1 preserves exact existing integration identity.

### Source-model implication for PM2

PM2 must distinguish **absence/disabled state** from malformed configuration.

A public venue with no Hive integration is valid in v2 by design.

A venue that declares Hive integration but supplies an incomplete/invalid binding fails closed.

The exact v2 envelope is intentionally deferred to PM2.

## 7. Fourth Street compatibility path

Fourth Street is not a migration exception to be hidden in renderer code.

It should migrate through the same public capability model as every other venue.

### Required migration interpretation

Current Fourth Street v1 facts map conceptually to:

- public venue site: enabled;
- community capability: enabled;
- transaction capability: preserve current supported state/config;
- existing community identity: unchanged;
- existing official account: unchanged;
- existing Threads container identity: unchanged;
- existing payment merchant identity: unchanged;
- current public content: mapped to semantic public components;
- current community routes: retained under community capability.

### Compatibility invariant

A v1-to-v2 migration must not silently:

- drop community features;
- change Hive account identities;
- change payment merchant identities;
- change URLs without an explicit routing policy;
- expose previously disabled effects;
- alter private-key custody;
- reinterpret synthetic/reference venue identity.

Backward compatibility is not pixel identity. Presentation may mature, but semantic/business/integration identity must remain exact unless separately authorized.

## 8. Runtime and authentication boundary

### Public runtime

Public site rendering must require only:

- valid public site/domain source;
- public media;
- public runtime configuration.

It must not require an authenticated Hive session.

### Community runtime

Community routes may depend on Hive read services for public community data, but browsing should remain independent of sign-in where the existing behavior permits it.

Hive sessions and Keychain become relevant at explicit participation actions.

### Sign-in placement

The universal header should not contain a mandatory Hive account control.

A community-enabled venue may expose:

- a Community entry in primary navigation;
- user/sign-in controls inside the community application shell;
- a compact authenticated identity affordance where product testing demonstrates that it improves cross-surface continuity without overwhelming venue navigation.

### Script/runtime loading

Future implementation should avoid globally loading signing/transaction scripts on venue pages that have no corresponding enabled capability, where doing so is not required for compatibility. This is a performance/security implementation candidate for later phases, not authorized here.

## 9. SEO and discoverability implications

A venue-first public architecture improves the semantic fit between visible content and search metadata.

PM2/PM4 should support:

- page-specific titles/descriptions;
- canonical URLs;
- Open Graph/share metadata;
- `LocalBusiness`-family structured data from visible venue facts where applicable;
- event leaf pages with stable URLs when an event capability is intended to qualify for event structured data;
- sitemap/navigation consistency.

Google's current guidance states that LocalBusiness structured data can describe details such as hours and that event rich-result eligibility expects a unique page/URL focused on each event. These are evidence for first-class venue/event semantics rather than reasons to design around Google-specific markup.

Structured data must describe visible page content; it is derived renderer output, not a second venue data authority.

## 10. Accessibility implications

The public/community split must not create two incompatible accessibility systems.

Shared invariants:

- landmarks and navigation remain semantically clear;
- focus order follows logical content order;
- selected navigation state is programmatic and visible;
- capability entry/exit does not trap focus;
- sign-in and transactional actions remain clearly distinguishable from ordinary links;
- no drag-only authoring behavior is introduced by this architecture;
- public content remains readable without authentication.

WCAG 2.2 remains the minimum target baseline for product maturation, while existing HiVenues stronger internal target-size/focus conventions may remain stricter.

## 11. Security and authority implications

This architecture reduces ambient privilege rather than expanding it.

### Preserve

- typed authoring authority;
- integration-owned identity;
- security-privileged payment identity;
- deployment separation;
- explicit signing review;
- no private keys in authoring source;
- fail-closed disabled capabilities.

### Reject

- "connect Hive" as an ordinary free-text presentation edit;
- "add Pay section" as implicit merchant activation;
- global browser/server signing authority simply because a community component is rendered;
- a public-site template that silently creates or mutates on-chain identities;
- optional capability data becoming required to validate unrelated public content.

## 12. Effects on PM2 semantic site design

This document intentionally does not freeze the v2 JSON/schema, but PM2 must satisfy these requirements.

### Required concepts

1. **Site/public identity** independent of optional integrations.
2. **Multiple semantic pages** with stable identities/slugs.
3. **Ordered typed component instances** with stable identity.
4. **Primary navigation** derived from stable public destinations.
5. **Capability declarations/state** separate from page presentation.
6. **Community integration binding** that may be absent/disabled, but validates strictly when declared.
7. **Transaction integration binding** separately privileged from community.
8. **Typed public components** capable of projecting optional capability data without owning integration identity.
9. **Migration path from v1** that preserves Fourth Street and other existing v1 identities.
10. **Direct-source round trip** with one canonical document authority.

### Must remain outside ordinary component authority

- private keys/secrets;
- deployment credentials;
- arbitrary routes/code/scripts;
- Hive authority mutations;
- merchant authority;
- arbitrary HTML/CSS;
- server process/service configuration.

## 13. Track A / B / C implications

### Track A — Studio

The Studio should eventually present:

- public pages/components as the default workspace;
- optional Integrations/Community setup separately from page styling;
- visible indication when a component depends on a disabled capability;
- no requirement to configure Hive before working on brand/pages;
- community-specific settings only when that capability is enabled or being intentionally configured.

### Track B — generated experience

A community-disabled venue must still look complete, not like a degraded Hive app.

A community-enabled venue must integrate community entry points into its brand/information architecture without forcing every community subfeature into global navigation.

### Track C — platform integrity

Capability separation must retain:

- exact source validation;
- strict ownership;
- no authority escalation;
- deterministic migration;
- disabled-capability isolation;
- deployment independence.

## 14. Rejected alternatives

| Alternative | Decision | Reason |
| --- | --- | --- |
| Keep current Home/Community/Threads/Pay/You shell universal | Reject | Makes one historical application IA platform truth |
| Remove Hive/community from HiVenues | Reject | Discards a differentiated capability and existing product value |
| Make all Hive fields optional in current v1 schema | Reject | Unreviewed compatibility/authority change; v1 remains frozen |
| Treat community as ordinary page blocks only | Reject | Community includes runtime/session/action semantics beyond presentation |
| Treat payments as part of community enablement | Reject | Payment identity has stronger independent authority |
| Separate public-site CMS and community app into unrelated sources | Reject | Creates competing venue identity/brand authorities and drift |
| Add arbitrary route/HTML/script plugins for flexibility | Reject | Expands security, accessibility, and review surface beyond product need |
| Require Hive onboarding during venue creation but visually hide it | Reject | Hides complexity instead of removing prerequisite coupling |

## 15. PM2 handoff

PM1 architecture is complete when this decision is accepted.

The highest-value PM2 follow-on is a **versioned semantic venue-site document design** that proves, with synthetic fixtures and v1 migration examples, that:

- public site identity is valid without Hive;
- capabilities validate independently;
- pages/navigation/components are stable and typed;
- Fourth Street migrates with community/transaction identity intact;
- multiple venue archetypes from PM1 #162 can be represented without source forks;
- renderer and Studio can remain projections of one canonical source.

No PM2 implementation should begin until Issue #162 supplies the reference-experience/component breadth that this model must satisfy.

## External evidence register

Accessed 2026-09-06.

- Webflow Help Center, *Webflow canvas overview*: direct page/canvas interaction and selection.  
  https://help.webflow.com/hc/en-us/articles/33961319255059-Webflow-canvas-overview
- Shopify Dev, *Theme architecture*, *Sections*, and *Blocks*: semantic customizable modules, with sections/blocks add/remove/reorder behavior.  
  https://shopify.dev/docs/storefronts/themes/architecture  
  https://shopify.dev/docs/storefronts/themes/architecture/sections  
  https://shopify.dev/docs/storefronts/themes/architecture/blocks
- Toast, *Restaurant Website Builder*: domain-specific website product framed around a venue's online home, no-code updates, menu/ordering/reservation integration, consistent branding, and discoverability.  
  https://pos.toasttab.com/products/websites
- Google Search Central, *LocalBusiness structured data*: public business facts such as hours can support local-business search understanding.  
  https://developers.google.com/search/docs/appearance/structured-data/local-business
- Google Search Central, *Event structured data*: supported event experiences require event-specific URLs/pages for eligible event markup.  
  https://developers.google.com/search/docs/appearance/structured-data/event
- W3C WAI, *What's New in WCAG 2.2*: includes Dragging Movements, Target Size, and focus-related criteria.  
  https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/

## Final decision

```text
PM1_PUBLIC_COMMUNITY_ARCHITECTURE =
VENUE_FIRST_PUBLIC_SITE
+ OPTIONAL_COMMUNITY_CAPABILITY
+ SEPARATELY_OPTIONAL_TRANSACTION_CAPABILITY

HIVE_REQUIRED_TO_BEGIN_PUBLIC_AUTHORING = NO_IN_V2_TARGET
V1_SCHEMA_MUTATION_AUTHORIZED = NO
FOURTH_STREET_COMMUNITY_COMPATIBILITY_REQUIRED = YES
PAYMENT_AUTHORITY_RECLASSIFIED = NO
CANONICAL_AUTHORING_AUTHORITY_SPLIT = NO
PM2_SEMANTIC_SITE_MODEL_REQUIRED = YES
```
