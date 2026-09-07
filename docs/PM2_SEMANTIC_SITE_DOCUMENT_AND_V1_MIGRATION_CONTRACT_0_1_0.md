# PM2 semantic venue-site document and v1 migration contract 0.1.0

## Status and authority

| Field | Value |
| --- | --- |
| Tracking issue | #165 — PM2 Domain |
| Parent roadmap | #160 — HiVenues Product Maturation |
| Canonical base commit | \`3c8505bc2e7df89dad2d00e5cd47ba850cd841ee\` |
| Canonical base tree | \`d3d42f18a293a166c61b299f704a33128f56406c\` |
| Accepted PM1 architecture input | #161 / \`0fdba4d8f3bf973f8f321e173da6af0e5786d324\` |
| Accepted PM1 reference input | #162 / \`3c8505bc2e7df89dad2d00e5cd47ba850cd841ee\` |
| Scope | v2 domain/source contract and deterministic v1 migration design only |
| Implementation authorization | **No** |
| Production / Hive / key / payment / deployment effects | **None** |

This document answers Issue #165. It is an architecture contract candidate, not permission to implement a v2 parser, migrate a venue, change runtime routes, alter Venue Studio, change the renderer, activate a capability, or touch a real deployment.

## Executive decision

HiVenues v2 should use a **new versioned deployment-agnostic source envelope** that makes the public venue site the canonical product surface and separates four kinds of state:

1. **venue facts** — stable venue identity and business facts;
2. **site composition** — pages, navigation, semantic components, brand, and design references;
3. **shared resources** — stable reusable domain records such as events, programs, menus, equipment, and managed media;
4. **capabilities** — optional Community and separately privileged Transaction bindings.

The v2 source remains the **single canonical authoring authority**. Venue Studio, Canvas, renderer, migration output, navigation, event pages, structured data, and capability projections are derived from it.

The v1 source is not reinterpreted in place. A deterministic, versioned migration transforms a valid v1 document into a valid v2 document while preserving identities and authority boundaries.

The central source shape is:

~~~text
HIVENUES DEPLOYMENT-AGNOSTIC SOURCE v2
│
├── venue
│   ├── stable venue identity
│   ├── display/business facts
│   └── venue/operator vocabulary
│
├── media
│   └── stable managed public assets
│
├── resources
│   ├── events
│   ├── programs
│   ├── menus
│   └── equipment
│
├── site
│   ├── site identity
│   ├── brand + design references
│   ├── home page identity
│   ├── pages[]
│   │   └── ordered semantic component instances[]
│   └── primary navigation[]
│
└── capabilities
    ├── community
    │   ├── disabled
    │   └── configured public binding
    └── transaction
        ├── disabled
        └── configured privileged binding
~~~

Deployment binding remains outside this source exactly as in the accepted deployment-agnostic architecture.

## 1. Why v2 is a real version boundary

The current v1 model is intentionally strict:

- the deployment-agnostic source has exactly \`kind\`, \`schemaVersion\`, \`venueContext\`, and \`venuePackage\`;
- \`venueContext.hive\` is mandatory;
- \`venuePackage.home\` is one fixed semantic topology;
- operator collection authority is defined by specific v1 JSON pointers;
- Canvas block identity is largely derived from fixed semantic slots such as \`home.hero\` and \`home.equipment-status\`.

Those invariants made v1 safe and testable. They also mean that adding a \`pages\` array while leaving the old ownership and Canvas contracts structurally authoritative would produce two competing models.

### Decision

Create a new source schema version and parser path.

A valid v1 source continues to mean exactly what it means today.

A valid v2 source has its own exact allowed keys, validation, canonical serialization, digest domain separation, ownership map, Canvas projection, and deployment binding path.

No v1 byte sequence silently acquires v2 semantics.

## 2. Proposed conceptual v2 envelope

The following is a **conceptual contract**, not implementation syntax frozen to Zod or any particular module decomposition.

~~~json
{
  "kind": "hive-venues-deployment-agnostic-source",
  "schemaVersion": 2,
  "venue": {
    "id": "stable-venue-id",
    "displayName": "Venue Name",
    "business": {
      "address": "...",
      "phone": "...",
      "hours": "...",
      "websiteUrl": "https://...",
      "mapUrl": "https://..."
    },
    "language": {
      "operatorNoun": "venue",
      "staffRole": "staff"
    }
  },
  "media": {
    "assets": [
      {
        "id": "hero-main",
        "src": "/managed/path/image.webp",
        "width": 1800,
        "height": 1200
      }
    ]
  },
  "resources": {
    "events": [],
    "programs": [],
    "menus": [],
    "equipment": []
  },
  "site": {
    "id": "public-site",
    "homePageId": "home",
    "brand": {
      "logoAssetId": "logo",
      "design": {
        "themeId": "theme-main",
        "typographyRecipeId": "type-editorial"
      }
    },
    "pages": [
      {
        "id": "home",
        "slug": "",
        "title": "Home",
        "seo": {
          "title": null,
          "description": "..."
        },
        "components": [
          {
            "id": "hero-main",
            "kind": "venue-hero",
            "recipeId": "hero-editorial-split",
            "content": {}
          }
        ]
      }
    ],
    "navigation": [
      {
        "id": "nav-home",
        "label": "Home",
        "target": {
          "kind": "page",
          "pageId": "home"
        }
      }
    ]
  },
  "capabilities": {
    "community": {
      "state": "disabled"
    },
    "transaction": {
      "state": "disabled"
    }
  }
}
~~~

The exact names above may be adjusted during implementation only if the accepted semantic meaning remains unchanged and the implementation issue explicitly binds the final schema.

## 3. Root invariants

A valid v2 source must satisfy all of the following.

1. Exactly one stable venue identity exists.
2. Exactly one public site identity exists.
3. Exactly one page is the home page.
4. Page ids are globally unique within the site.
5. Component instance ids are globally unique within the site.
6. Resource ids are unique within their resource kind.
7. Media asset ids are unique.
8. Navigation ids are unique.
9. Stable identity never depends on array position.
10. Arrays may express order, but order is not identity.
11. Unknown root keys fail closed.
12. Unknown component/resource kinds fail closed unless a later version explicitly introduces them.
13. Secret/private material remains forbidden from the source.
14. Deployment identity/credentials remain outside the deployment-agnostic source.
15. A valid public-only venue requires no Hive identity.
16. A declared optional capability must be internally complete and valid.
17. A visual component cannot grant integration, signing, payment, or deployment authority.

## 4. Ownership classes in v2

Preserve the accepted v1 ownership concepts while generalizing them from fixed pointers to semantic objects.

### PLATFORM_FIXED

Examples:

- source kind;
- schema version;
- registry kind names;
- capability state vocabulary;
- immutable command/version discriminators.

Ordinary operator editing cannot change these values into arbitrary alternatives.

### OPERATOR_AUTHORED

Examples:

- display name where current identity contract permits it;
- business facts;
- page titles;
- navigation labels/ordering;
- component content;
- component ordering;
- menu text;
- event descriptions;
- public CTA labels/links;
- alt/decorative decisions;
- approved design recipe selections.

### OPERATOR_AUTHORED_COLLECTION

Examples:

- pages;
- page components;
- events;
- programs;
- menus and menu sections/items;
- equipment;
- navigation entries;
- managed media references where the media importer has already accepted the asset.

Collection insert/remove/reorder operations use typed commands and stable ids.

### OPERATOR_COLLECTION_ID

Stable ids for pages/components/resources/media/navigation are never ordinary editable copy fields after creation.

The operator may rename visible labels without changing identity.

### INTEGRATION_OWNED

Examples:

- Community Hive community id;
- official Hive account;
- Threads container account;
- other public integration identity added by a later accepted version.

The Studio may guide configuration through a dedicated integration workflow, but normal page/component editing cannot mutate these bindings.

### SECURITY_PRIVILEGED

Examples:

- Transaction merchant account binding;
- beneficiary policy;
- any later capability whose configuration materially affects value transfer or signing authority.

Presentation can reference an available capability; it cannot change its privileged binding.

### DERIVED

Examples:

- intrinsic imported media width/height;
- generated canonical route from validated slug rules where appropriate;
- derived structured data;
- renderer diagnostics;
- migration provenance digest;
- preview geometry.

### DEPLOYMENT_OWNED

Examples:

- deployment id;
- host;
- service target;
- runtime environment;
- production activation state;
- secrets/credentials.

Deployment state remains outside the deployment-agnostic source.

### FORBIDDEN SECRET / PRIVATE MATERIAL

Private keys, session secrets, API credentials, deployment secrets, and equivalent material remain prohibited from the canonical venue source.

## 5. Venue facts

The v2 \`venue\` object owns durable venue facts that are independent of page composition.

Minimum concepts:

- stable \`id\`;
- \`displayName\`;
- \`business.address\`;
- \`business.phone\`;
- \`business.hours\`;
- \`business.websiteUrl\`;
- \`business.mapUrl\`;
- operator/staff vocabulary retained from v1 onboarding language.

PM2 implementation may later normalize hours/location into richer structured data, but this contract does not require that expansion before v2 can migrate current v1 data losslessly.

### Decision

Do not store Community identity inside \`venue\`.

Hive is a capability binding in v2, not a universal venue fact.

## 6. Managed media model

PM1 requires reusable media, crop/focal treatment, and source portability.

### Decision

Introduce stable managed asset identity.

Conceptually:

~~~json
{
  "media": {
    "assets": [
      {
        "id": "venue-exterior",
        "src": "/venue-assets/venue-exterior.webp",
        "width": 1800,
        "height": 1200
      }
    ]
  }
}
~~~

### Invariants

- \`src\` remains a normalized same-origin managed public path under the existing media safety model;
- intrinsic dimensions are derived/managed metadata;
- components refer to \`assetId\`, not duplicated path strings, when using v2 managed media;
- alt text is **usage-specific**, not an intrinsic property of the asset;
- a usage must explicitly choose meaningful alt text or decorative treatment;
- focal/crop/presentation treatment belongs to the component/media usage seam defined by PM2B;
- external arbitrary URLs do not become a generic media authority.

This allows one photo to be used in a hero and gallery with different accessible descriptions or decorative treatment.

## 7. Site, pages, and routes

### Site

The \`site\` object owns public information architecture and presentation composition.

Minimum concepts:

- stable site id;
- homePageId;
- brand/design references;
- ordered pages;
- ordered primary navigation.

### Page

Each page has at minimum:

- stable \`id\`;
- validated \`slug\`;
- operator-facing \`title\`;
- page SEO metadata;
- ordered semantic component instances.

### Home page

The home page:

- has a stable page id;
- must be referenced by \`homePageId\`;
- uses the root route;
- may use an empty slug or an explicitly reserved home slug in the implementation contract;
- cannot be deleted while it is the designated home page without an atomic typed replacement operation.

### Slug / route rules

Implementation must freeze an exact safe slug grammar.

Contract requirements:

- stable page identity and visible page title are not the route identity;
- changing page title does not silently change the route;
- page slugs are unique;
- reserved application/capability/runtime paths cannot collide;
- invalid or colliding routes fail before persistence;
- migration route compatibility can install derived redirects/aliases only through an explicit later routing contract;
- arbitrary router code is never authored in the venue source.

## 8. Navigation model

Navigation points to stable semantic destinations.

Conceptual entry:

~~~json
{
  "id": "nav-events",
  "label": "Shows",
  "target": {
    "kind": "page",
    "pageId": "events"
  }
}
~~~

Allowed target classes should initially remain narrow:

- page;
- enabled capability entry;
- approved external HTTPS CTA where explicitly modeled.

### Invariants

- navigation order is operator-authored;
- navigation entry id is stable;
- label can change without changing target identity;
- deleting a page referenced by navigation must fail or require an atomic typed removal/repoint operation;
- a disabled capability cannot be targeted;
- capability internals such as Threads/profile routes do not become universal primary navigation merely because the capability is configured.

## 9. Semantic component instance model

A v2 component is a stable semantic instance, not a DOM node.

Conceptual component:

~~~json
{
  "id": "home-hero",
  "kind": "venue-hero",
  "recipeId": "hero-editorial-split",
  "content": {
    "headline": "A warmer kind of gathering",
    "body": "...",
    "media": {
      "assetId": "dining-room",
      "alt": "Dining room overlooking the harbor"
    },
    "primaryAction": {
      "label": "Reserve",
      "href": "https://..."
    }
  }
}
~~~

### Stable identity

Component id is created once and survives:

- reordering;
- recipe changes;
- copy edits;
- media replacement;
- moving between allowed positions/pages where later command rules permit;
- responsive preview.

Position is never encoded into component identity.

### Required registry behavior

Each component \`kind\` is defined by a platform registry that specifies:

- payload contract;
- allowed fields;
- default recipe;
- allowed recipe ids from PM2B;
- placement rules;
- cardinality;
- resource references;
- capability prerequisites;
- accessibility requirements;
- ordinary operator command capabilities.

Unknown component kinds fail closed.

## 10. Component registry boundary

The initial v2 contract should be broad enough to represent PM1 without becoming a generic page builder.

### Global primitives

Platform-owned composition primitives rather than free-form page blocks:

- site navigation;
- venue wordmark/brand mark;
- footer;
- page metadata;
- capability entry chrome.

### Foundation page components

- \`venue-hero\`
- \`editorial-intro\`
- \`media-feature\`
- \`cta\`
- \`gallery\`
- \`hours-location\`
- \`contact-visit\`
- \`announcement\`

### Programming

- \`event-list\`
- \`event-feature\`
- \`program-list\`
- \`schedule\`

### Hospitality

- \`menu-preview\`
- \`menu\`
- \`private-events\`
- \`reservation-cta\`
- \`testimonials-press\`

### Operational

- \`equipment-status\`
- \`amenities\`
- \`access-guidance\`

### Community projection

Only valid with configured Community capability:

- \`official-updates\`
- \`community-pulse\`
- \`community-entry\`

These names are semantic registry candidates. Implementation may refine naming but may not collapse them into raw markup primitives.

## 11. Shared resource model

### Decision

Events, programs, menus, and equipment should become **stable resources independent of the visual components that display them**.

This avoids making a visual list component the canonical owner of business/domain data.

A page may contain:

- an Event List projecting several event resources;
- an Event Feature projecting one event;
- a dedicated event detail route generated from the same event resource.

Removing the Event List does not delete the event resource unless an explicit resource-delete command is separately performed.

### Resource identity

Each resource has:

- stable \`id\`;
- typed resource kind;
- validated payload;
- optional stable route segment where that resource creates a public leaf page.

Resource identity survives ordering/presentation changes.

## 12. Event resources and event detail pages

Conceptual event:

~~~json
{
  "id": "show-2026-09-18",
  "slug": "show-2026-09-18",
  "title": "Artist Name",
  "startAt": "2026-09-18T20:00:00-07:00",
  "endAt": "2026-09-18T23:00:00-07:00",
  "state": "scheduled",
  "description": "...",
  "mediaAssetId": "show-poster",
  "accessNote": "21+",
  "externalAction": {
    "label": "Tickets",
    "href": "https://..."
  }
}
~~~

### Event leaf decision

For v2, **event detail pages should be renderer-derived leaf pages from stable event resources**, not separately hand-authored page copies.

Reasons:

- one event authority;
- stable eligible event URL;
- no drift between list and detail page;
- easier structured-data derivation;
- easier Studio editing;
- less duplicated content.

### Route

Event resource \`slug\` is stable route identity.

Conceptual route:

\`/events/{event.slug}\`

Exact base segment and reserved-route behavior are implementation contract details.

Changing event title does not silently change slug.

### Optional event page composition

The renderer may use an approved event-detail recipe from PM2B. v2 does not require operators to build every event detail page from arbitrary components.

A later version could introduce bounded event-detail composition if justified without duplicating event authority.

## 13. Program resources

Programs generalize the existing v1 program collection.

Minimum concepts preserve v1:

- stable id;
- title;
- start/end;
- description;
- access note;
- state;
- external link.

Programs may later gain dedicated detail routes, but PM1 does not require them for v2 acceptance.

### Migration order

v1 programs currently canonicalize by start time then id.

Migration preserves the stable ids and resource values. Display components may choose an approved ordering policy; the migration itself does not reinterpret chronological semantics.

## 14. Menu resources

Restaurant support requires real semantic menu content.

Conceptual menu:

~~~json
{
  "id": "dinner",
  "title": "Dinner",
  "sections": [
    {
      "id": "starters",
      "title": "Starters",
      "items": [
        {
          "id": "oysters",
          "name": "Oysters",
          "description": "Daily selection",
          "priceLabel": "$18"
        }
      ]
    }
  ]
}
~~~

### Decisions

- menu content is accessible HTML derived from semantic source;
- a PDF may be offered later as an additional asset, never the only menu representation required by the product;
- stable ids exist for menu, section, and item;
- price is initially allowed as display text rather than introducing a commerce/pricing authority model;
- changing a menu presentation component does not delete the underlying menu resource.

The exact food-allergen/dietary model is deferred unless PM4 operator testing demonstrates it is necessary for the initial product.

## 15. Equipment resources

Equipment generalizes the proven Juniper v1 collection.

Minimum concepts preserve:

- stable id;
- name;
- state;
- note;
- access note;
- last updated;
- group.

### Order

Resource storage order is not identity.

An Equipment Status component may maintain operator-defined presentation order by stable resource ids.

This preserves the successful v1 stable-id reorder/Move To mechanics without coupling identity to resource-array position.

## 16. Gallery and media composition

Gallery is a page component whose ordered items reference stable media assets.

A v2 gallery item is a **media usage** with its own usage identity if needed for deterministic editing.

Conceptually:

~~~json
{
  "id": "gallery-main",
  "kind": "gallery",
  "content": {
    "items": [
      {
        "id": "gallery-main-01",
        "assetId": "bar-interior",
        "alt": "Interior of Fourth Street Bar",
        "caption": "..."
      }
    ]
  }
}
~~~

This is intentionally different from events/menus/equipment:

- an image asset is reusable media infrastructure;
- a gallery item is a presentation usage;
- events/menus/equipment are domain resources independent of any one visual placement.

## 17. Capability model

PM1 #161 is binding.

### Community

Conceptual disabled state:

~~~json
{
  "community": {
    "state": "disabled"
  }
}
~~~

Conceptual configured state:

~~~json
{
  "community": {
    "state": "configured",
    "binding": {
      "communityId": "hive-...",
      "officialAccount": "...",
      "threadsContainerAccount": "..."
    }
  }
}
~~~

### Meaning of configured

**Configured does not mean operationally activated.**

It means the canonical venue source contains a complete validated public integration identity.

It does not grant:

- server posting keys;
- private keys;
- signing authority;
- production service activation;
- deployment permission.

Actual operational activation remains deployment/runtime-owned.

### Transaction

Conceptual disabled state:

~~~json
{
  "transaction": {
    "state": "disabled"
  }
}
~~~

Conceptual configured state:

~~~json
{
  "transaction": {
    "state": "configured",
    "binding": {
      "merchantAccounts": ["..."],
      "beneficiaryPolicy": {}
    }
  }
}
~~~

Transaction binding remains SECURITY_PRIVILEGED.

Ordinary page/component editing cannot configure, alter, or infer it.

### Presentation vs capability authority

A Reservation CTA or Ticket CTA using an external HTTPS URL is ordinary public presentation.

A HiVenues/Hive payment component may only reference an already valid configured Transaction capability.

Adding the visual component does not create or activate the capability.

## 18. Design-system seam handed to PM2B

PM2A owns **where** semantic design state is referenced.

PM2B owns **what those design values mean**.

The v2 site/component model therefore needs stable semantic seams for:

- site theme/design identity;
- typography recipe;
- global density/shape treatment;
- component recipe id;
- responsive recipe/override state;
- media treatment.

PM2A does not freeze color-token values, breakpoints, recipe catalogs, typography choices, or override matrices.

### Invariant

No PM2B value may require raw CSS, arbitrary style objects, arbitrary class names, arbitrary DOM nesting, or independent mobile content trees.

## 19. Responsive state seam

Each component may have:

- one base semantic recipe;
- bounded viewport-specific overrides defined by PM2B.

Content, component identity, page identity, resource identity, and semantic order are shared across Desktop/Tablet/Mobile.

Responsive override state cannot create a second component tree.

## 20. Starter compositions and provenance

PM1 reference archetypes are starter compositions, not schema variants.

### Decision

A starter composition is an input convenience that instantiates ordinary v2 semantic objects.

Once instantiated:

- the venue document is authoritative;
- the starter/template object is not;
- page/component ids are real persisted ids;
- edits do not depend on the template remaining installed;
- template provenance may be retained as DERIVED/diagnostic metadata if useful for migration/support, but it cannot override source state.

### No silent template updates

A later change to a HiVenues starter composition cannot silently mutate an existing venue.

## 21. Stable Canvas selection identity

The v1 Canvas has successfully proven stable semantic selection and collection-item identity.

v2 generalizes this.

Recommended selection hierarchy:

~~~text
venue
├── settings / integrations
└── page:{pageId}
    └── component:{componentId}
        ├── field:{fieldId}
        └── resource-reference:{resourceKind}:{resourceId}
~~~

The exact serialized selection format is deferred to implementation.

### Invariants

- selection refers to stable semantic ids;
- moving a component does not change its selection identity;
- reordering a resource does not change its identity;
- Canvas, tree, inspector, diagnostics, and typed commands resolve the same semantic instance;
- source JSON array index may be used internally during one operation but is never exposed as stable identity.

## 22. Typed command implications

v2 should evolve the proven command families rather than invent a separate editor mutation path.

Candidate command families:

### Site structure

- insert-page;
- remove-page;
- move-page where relevant;
- set-home-page;
- insert-navigation-entry;
- move-navigation-entry;
- remove-navigation-entry.

### Components

- insert-component;
- move-component;
- remove-component;
- set-component-field;
- set-component-recipe.

### Resources

- insert-resource;
- remove-resource;
- set-resource-field;
- move-resource-reference/presentation order where relevant.

### Media usages

- set-media-usage;
- set-alt/decorative decision;
- set-focal/crop treatment through PM2B semantics.

### Capabilities

Ordinary authoring commands **do not** include generic set-community-binding or set-transaction-binding operations.

Integration/privileged workflows remain separately authorized.

### Undo/redo

Every ordinary command that is semantically reversible should define an exact inverse against the same stable identities.

Stale-revision invalidation remains required.

## 23. Direct-source compatibility

Direct source mode remains a first-class compatibility requirement.

A valid v2 document can be:

- parsed;
- canonicalized;
- reviewed;
- serialized;
- reopened;
- rendered;
- projected into Canvas;
- edited through the ordinary authority gate;
- serialized again;

without requiring hidden editor project state.

No opaque visual-builder project file becomes required authority.

## 24. v1 → v2 migration contract

Migration is explicit, deterministic, versioned, and testable.

### 24.1 Migration input

Only a fully valid canonical v1 deployment-agnostic source is eligible.

Invalid v1 input is not "repaired" by migration.

### 24.2 Migration output

A fully valid canonical v2 deployment-agnostic source.

The migration tool/adapter must not:

- deploy;
- write Hive;
- change keys;
- activate a capability;
- modify a real workspace unless a separately authorized persistence operation accepts the candidate.

### 24.3 Identity preservation

Preserve exactly:

- venue id;
- venue display name;
- business facts;
- current Hive community id;
- official account;
- Threads container account;
- payment merchant accounts;
- beneficiary policy;
- v1 program/equipment stable ids;
- managed media bytes/paths;
- source-visible copy.

Package id does not need to remain the v2 public-site identity if the new model supersedes that concept, but migration provenance must record its source identity for auditability.

### 24.4 Fourth Street capability mapping

v1 mandatory Hive context maps to:

- Community state: configured;
- Community binding: exact v1 community/official/Threads identity;
- Transaction state:
  - configured when v1 merchant/payment binding is present according to current accepted semantics;
  - otherwise disabled;
- beneficiary/merchant identity preserved exactly.

Migration does not claim production activation.

### 24.5 Juniper capability mapping

The existing synthetic Juniper v1 Hive bindings migrate exactly like any other valid v1 source because historical fixture truth must not be rewritten.

A **separate v2-only synthetic public-only fixture** should later prove Community disabled. Do not mutate Juniper's historical v1 input simply to manufacture that proof.

## 25. v1 home → v2 site mapping

The v1 home page migrates to one v2 \`home\` page with deterministic component identities.

Suggested migration ids are namespaced and stable.

| v1 path | v2 target |
| --- | --- |
| venuePackage.home.hero | page home / component \`home-hero\` |
| home.updates | component \`home-official-updates\` |
| home.programs | Program resources + \`home-programs\` projection component |
| home.equipmentStatus | Equipment resources + \`home-equipment-status\` component |
| home.pathways | component \`home-pathways\` or decomposed accepted foundation equivalent |
| home.visit | component \`home-visit\` |
| home.community | component \`home-community-entry\`, requiring configured Community capability |
| home.gallery | media assets/usages + component \`home-gallery\` |

Exact ids may be implementation-prefixed to avoid collisions, but migration must produce the same ids for the same valid v1 input.

### Fixed v1 ordering

The migration must explicitly freeze one deterministic home component order matching the current rendered semantic order.

A later operator may reorder allowed components through v2 typed commands.

## 26. v1 media migration

### Logo

v1 brand logo becomes a stable media asset, with site brand referencing its asset id.

### Hero image

v1 hero image becomes a stable media asset plus usage metadata in the migrated Hero component.

### Gallery images

v1 gallery items lack stable ids.

Decision:

- assign deterministic migration ids based on the accepted v1 order, e.g. \`gallery-01\`, \`gallery-02\`, ...;
- those ids become persisted v2 usage identities;
- after migration they no longer change when items are reordered;
- the migration algorithm must document collision handling if a generated id conflicts with another migrated id;
- alt/caption values are preserved exactly.

This is a one-time conversion from position-derived v1 identity into persisted v2 identity.

## 27. v1 theme migration

PM2A only defines the seam.

The current v1 theme values must be preserved losslessly as input to the PM2B migration/default contract.

PM2B decides:

- whether those seven colors map one-to-one into expanded token roles;
- which new roles receive deterministic defaults;
- which typography/spacing/shape recipes legacy v1 receives.

No v1 theme value may be silently discarded.

## 28. Reference representability — Fourth Street

Fourth Street v2 can be represented as:

- one venue identity;
- public site;
- Home, Events/What's Happening, Gallery, Visit pages as later chosen;
- Community configured;
- Transaction configuration preserved;
- public components for hero/events/gallery/hours/location/community entry;
- community application routes derived from enabled capability;
- existing social/payment functionality remaining behind its accepted authority boundaries.

No Fourth Street-specific renderer fork is needed.

## 29. Reference representability — Juniper Works Cooperative

Juniper v2 can be represented as:

- one venue identity;
- Home, Programs, Equipment, Projects/Gallery, Visit/About pages;
- Program resources;
- Equipment resources;
- Gallery media usages;
- operational components projecting those resources;
- existing synthetic v1 Community binding preserved during migration;
- separate v2 public-only fixture available later to prove disabled Community.

No workshop-specific schema is needed.

## 30. Reference representability — restaurant/private events

A synthetic restaurant can be represented as:

- public-only venue;
- Home, Menu, Private Events, Gallery, About, Visit pages;
- Menu resources with sections/items;
- reservation external CTA;
- gallery/media;
- Hours & Location;
- Community disabled;
- Transaction disabled unless a separately supported/configured capability exists.

No restaurant-specific renderer fork is needed.

## 31. Reference representability — live music

A synthetic live-music venue can be represented as:

- public-only venue;
- Home, Shows, Venue/Visit, Rentals pages;
- Event resources with stable slugs;
- derived event leaf pages;
- event-list and event-feature components;
- external Ticket CTA;
- Community disabled by default;
- Transaction disabled unless separately configured.

No music-specific renderer fork is needed.

## 32. Fail-closed cases

A v2 source must reject at least:

- duplicate page ids;
- duplicate component ids;
- duplicate resource ids within a kind;
- duplicate media ids;
- duplicate navigation ids;
- duplicate/colliding page slugs;
- reserved-route collision;
- navigation target to missing page;
- navigation target to disabled capability;
- component resource reference to missing resource;
- Community projection component while Community is disabled;
- Transaction presentation requiring an unavailable Transaction capability;
- configured Community with incomplete binding;
- configured Transaction with incomplete/invalid privileged binding;
- arbitrary unknown component kind;
- arbitrary unknown resource kind;
- arbitrary raw HTML/CSS/script field;
- asset reference to unknown/unmanaged asset;
- media usage with neither meaningful alt nor explicit decorative state;
- more than one home page identity;
- deletion of current home page without atomic replacement;
- event slug collision;
- malformed migration input.

## 33. Rejected alternatives

| Alternative | Decision | Reason |
| --- | --- | --- |
| Add \`pages\` beside v1 \`home\` and keep both authoritative | Reject | Creates competing topology/ownership models |
| Reinterpret schemaVersion 1 with optional new keys | Reject | Breaks exact v1 meaning and canonical provenance |
| Store events inside Event List components | Reject | Visual placement becomes business-data authority |
| Store menus only as rich text/PDF | Reject | Weak accessibility, reuse, and restaurant semantics |
| Create a separately authored page copy for every event | Reject | Duplicates event authority and invites drift |
| Make array index the component id | Reject | Reorder changes identity and breaks history/selection |
| Put Hive identity back into universal venue facts | Reject | Violates PM1 progressive integration |
| Treat payment as a normal page integration field | Reject | Weakens privileged authority boundary |
| Keep template/starter object as permanent hidden authority | Reject | Creates competing state and silent-update risk |
| Allow arbitrary route definitions | Reject | Expands security/runtime surface beyond venue authoring |
| Add arbitrary HTML/CSS/script for missing components | Reject | Evades semantic model instead of improving it |
| Separate desktop/mobile component trees | Reject | Creates divergence and accessibility/maintenance risk |

## 34. PM2B handoff

#166 may begin from this contract only after #165 is accepted.

PM2B owns:

- semantic color-token expansion;
- typography roles/recipes;
- spacing/density;
- radius/border/elevation;
- media focal/crop/presentation treatment;
- component layout/visual recipe registry;
- Desktop/Tablet/Mobile inheritance;
- allowed responsive overrides;
- accessibility constraints across recipes;
- deterministic v1 theme default mapping;
- same-template-recolor failure proof.

PM2B does **not** redesign:

- page/resource identity;
- capability authority;
- v1 migration identity;
- event/menu domain ownership;
- canonical source authority.

## 35. Implementation prerequisites after PM2

Even after #165 and #166 are accepted, implementation should begin with a bounded contract/prototype phase, not a full renderer rewrite.

The first implementation issue should prove with synthetic in-memory fixtures:

1. v2 parser/canonical serializer;
2. ownership map;
3. one public-only source with Community disabled;
4. deterministic v1→v2 migration for Fourth Street and Juniper;
5. exact reference ids/resources;
6. Canvas projection from stable page/component/resource ids;
7. no runtime route or production behavior change unless separately authorized.

Renderer/Studio wiring should follow only after that foundation passes.

## 36. Final decision

~~~text
PM2A_SEMANTIC_SITE_MODEL =
NEW_VERSIONED_V2_DEPLOYMENT_AGNOSTIC_SOURCE

CANONICAL_AUTHORITY =
ONE_V2_SOURCE_DOCUMENT

V1_REINTERPRETED_IN_PLACE = NO
V1_MIGRATION = EXPLICIT_DETERMINISTIC_VERSIONED

V2_ROOT_CONCEPTS =
VENUE
+ MEDIA
+ RESOURCES
+ SITE
+ CAPABILITIES

PAGE_IDENTITY_POSITION_DEPENDENT = NO
COMPONENT_IDENTITY_POSITION_DEPENDENT = NO
RESOURCE_IDENTITY_POSITION_DEPENDENT = NO

EVENTS_CANONICAL_OWNER = RESOURCE
PROGRAMS_CANONICAL_OWNER = RESOURCE
MENUS_CANONICAL_OWNER = RESOURCE
EQUIPMENT_CANONICAL_OWNER = RESOURCE

EVENT_DETAIL_PAGE =
DERIVED_FROM_STABLE_EVENT_RESOURCE

COMMUNITY_UNIVERSAL_REQUIRED = NO
COMMUNITY_CONFIGURED_IMPLIES_RUNTIME_ACTIVATION = NO
TRANSACTION_CONFIGURED_IMPLIES_RUNTIME_ACTIVATION = NO
TRANSACTION_BINDING_ORDINARY_OPERATOR_AUTHORITY = NO

STARTER_COMPOSITION_REMAINS_AUTHORITY_AFTER_INSTANTIATION = NO
DIRECT_SOURCE_ROUND_TRIP_REQUIRED = YES
REAL_RENDERER_SINGLE_AUTHORITY_REQUIRED = YES
RAW_HTML_CSS_SCRIPT_AUTHORITY = NO
INDEPENDENT_MOBILE_CONTENT_TREE = NO

PM2B_DESIGN_SYSTEM_CONTRACT_REQUIRED = YES
IMPLEMENTATION_AUTHORIZED_BY_THIS_DOCUMENT = NO
~~~
