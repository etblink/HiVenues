# PM1 reference venue archetypes and flagship visual acceptance targets 0.1.0

## Status and authority

| Field | Value |
| --- | --- |
| Tracking issue | #162 — PM1 Design |
| Parent roadmap | #160 — HiVenues Product Maturation |
| Architecture input | #161 accepted at canonical main 0fdba4d8f3bf973f8f321e173da6af0e5786d324 |
| Architecture input tree | 30fecdaa9e9ccfe9f8923fc603543aa5dbfc7901 |
| Study date | 2026-09-06 |
| Scope | Reference experiences, component breadth, Studio implications, and quality acceptance targets |
| Implementation authorization | **No** |
| Production / Hive / key / payment / deployment effects | **None** |

This document answers Issue #162. It is a design and product-quality contract candidate. It does not create new venue fixtures, migrate the source schema, alter the renderer, redesign Venue Studio, publish a template catalog, or change any live venue.

## Executive decision

HiVenues should prove product maturity against **four materially different reference experiences generated from one semantic site system**:

1. **Fourth Street Bar** — real reference deployment; hospitality plus strong optional community capability.
2. **Juniper Works Cooperative** — existing synthetic workshop fixture; programs, equipment, operational information, and non-bar vocabulary.
3. **Restaurant / private-events reference** — synthetic hospitality archetype; concept label "Harbor & Hearth" from the design exploration, not a claimed real venue identity.
4. **Live-music reference** — synthetic event-heavy archetype; concept label "Northline Hall" from the design exploration, not a claimed real venue identity.

The central rule is:

> Archetypes are **starter compositions and capability selections**, not separate templates, schemas, or renderers.

A reference may choose different pages, section order, component variants, theme tokens, media treatment, typography recipes, and optional capabilities. It may not gain a private renderer fork, arbitrary CSS/HTML authority, or a venue-specific source schema.

The reference matrix therefore tests two things simultaneously:

- **shared platform integrity** — all references use one typed authority and renderer architecture;
- **real design range** — the references do not look like the same site with colors and copy swapped.

## 1. Inputs and current baseline

This contract is derived from:

- the accepted post-v1 visual-builder study in docs/POST_V1_VISUAL_BUILDER_COMPARATIVE_DESIGN_STUDY_0_1_0.md;
- the accepted PM1 public/community architecture from #161;
- the current v1 public renderer and visual qualification contract;
- Issue #130 presentation-quality lessons;
- Fourth Street reference evidence;
- Juniper Works Cooperative synthetic fixture evidence;
- the recent HiVenues Studio and generated-site concept images;
- current official product/standards research listed in the source register.

The existing visual contract already uses representative human-review viewports at 390 × 844 and 1440 × 1000. PM1 adds an explicit tablet review target because responsive recipes are now a first-class product requirement rather than only a stress-test concern.

## 2. Reference-system rule: one semantic platform

### 2.1 What may vary

A reference experience may vary through semantic product choices:

- page composition and navigation;
- enabled component families;
- component order;
- approved component variants;
- theme/design tokens;
- typography recipes;
- spacing/density recipe;
- radius/elevation recipe;
- media crop and focal treatment;
- hero composition;
- list/card treatment;
- enabled optional Community or Transaction capabilities;
- operator-owned copy, links, images, structured venue data.

### 2.2 What must not vary by private fork

The following must remain shared platform behavior:

- source/document validation;
- stable semantic identity;
- ordinary operator authority;
- renderer implementation strategy;
- accessibility semantics;
- responsive inheritance rules;
- save/persistence boundaries;
- deployment separation;
- integration/key/payment authority;
- security policy;
- arbitrary-script prohibition.

### 2.3 Same-template recolor failure

The platform fails the PM1 generality objective if reviewers can reasonably describe the restaurant, music venue, workshop, and bar as:

> "the same website with different colors, photos, and nouns."

A useful human heuristic is to compare screenshots in grayscale or at reduced detail. If the dominant page silhouette, hero treatment, section rhythm, card language, and CTA hierarchy remain effectively identical across references, the design system has insufficient range.

The solution is **not** free-form layout. The solution is a richer but constrained recipe/variant system.

## 3. Reference A — Fourth Street Bar

### Identity

Fourth Street Bar remains the real reference deployment and historical production proof. It must never become generic platform truth.

### Primary product pressure

- authentic neighborhood-bar identity;
- photography-led hospitality;
- real location/contact information;
- optional Community capability prominently but naturally integrated;
- compatibility with existing social, Threads, profile, messaging, rewards, and payment work;
- venue-first public experience rather than developer/Hive-first presentation.

### Target public information architecture

Conceptual target:

- Home
- Events / What's Happening
- Gallery
- Visit
- Community — only because Community capability is enabled

Existing compatibility routes may remain during migration even if final public navigation is simplified. Route compatibility is a PM2/renderer concern, not a license for the old universal shell to remain platform truth.

### Home composition pressure

A strong Fourth Street home should be able to use:

- venue hero;
- current events/highlights;
- selected official update or community pulse;
- gallery;
- hours/location;
- strong visit CTA;
- optional community entry.

Community information should enrich the venue identity rather than dominate above-the-fold hierarchy.

### Visual direction

- warm, atmospheric, documentary;
- photography carries identity;
- high-contrast but not "developer dark mode";
- sturdy, approachable typography;
- platform attribution subordinate to venue brand.

### Acceptance question

Could a prospective patron land on the homepage and understand the place, atmosphere, location, and next action before needing to know what Hive is?

Required answer: **yes**.

## 4. Reference B — Juniper Works Cooperative

### Identity

Use the existing synthetic fixture identity exactly:

- display name: Juniper Works Cooperative;
- id: juniper-works-fixture;
- synthetic/non-real status remains explicit in source/test evidence.

### Primary product pressure

- non-bar vocabulary;
- classes/orientations/build sessions;
- equipment and area status;
- access/orientation guidance;
- operational information density;
- project/gallery content;
- practical community-workshop brand.

### Target public information architecture

Conceptual target:

- Home
- Programs
- Equipment
- Projects / Gallery
- About / Visit

Community is **not required** to make this reference complete in the PM2 target. The existing v1 fixture's synthetic Hive bindings remain useful migration evidence; a later v2 proof may additionally exercise the public-only/disabled-community state required by #161 without rewriting historical fixture truth.

### Home composition pressure

- hero;
- next programs;
- equipment summary;
- orientation/first-visit guidance;
- member project gallery;
- clear "visit / orientation" CTA.

### Visual direction

- daylight/neutral workshop palette;
- practical information hierarchy;
- craft/material texture rather than nightlife mood;
- structured status information that still feels designed;
- operational cards distinct from hospitality menus or concert tickets.

### Acceptance question

Does the same HiVenues platform convincingly look like a member-run workshop rather than a bar theme with "equipment" substituted for drinks?

Required answer: **yes**.

## 5. Reference C — restaurant / private-events archetype

### Identity

This is a synthetic archetype. The concept label **Harbor & Hearth** may be used in design discussion but is not a claim that a real business exists or has authorized HiVenues.

A future fixture should use an explicitly synthetic identity and reserved example URLs.

### Primary product pressure

- premium editorial hospitality;
- menu discoverability;
- reservations/booking CTA;
- private events;
- gallery;
- hours/location/contact;
- brand storytelling;
- no required community capability.

### Target public information architecture

Conceptual target:

- Home
- Menu
- Private Events
- Gallery
- About
- Visit / Contact

Reservations may be represented initially as a typed external CTA/integration rather than as an in-house booking engine. Adding a reservation visual component must not imply a privileged integration exists.

### Home composition pressure

- editorial hero;
- concise venue story;
- menu highlights;
- reservation CTA;
- private-events feature;
- gallery;
- hours/location;
- optional press/testimonial proof.

### Visual direction

- bright or restrained editorial composition;
- strong food/space photography;
- generous spacing;
- refined typography;
- subtle surfaces;
- polished CTA treatment;
- materially different from Fourth Street's neighborhood-bar atmosphere.

### Product evidence

Current restaurant-focused products consistently emphasize menus, hours/location, reservations, ordering, private events, photography, mobile presentation, and easy no-code updates. PM2 should support those **venue tasks**, not imitate any vendor's trade dress or business model.

### Acceptance question

Could an independent restaurant plausibly use this public experience without hiring a designer to repair hierarchy, menu presentation, reservation visibility, or mobile behavior?

Required answer: **yes**.

## 6. Reference D — live-music venue archetype

### Identity

This is a synthetic archetype. The concept label **Northline Hall** may be used in design discussion but is not a claimed real venue.

### Primary product pressure

- event-first information architecture;
- upcoming-show density;
- ticket CTAs;
- artist/show imagery;
- event status;
- stable event details;
- venue information;
- rentals/private events;
- high-energy visual identity.

### Target public information architecture

Conceptual target:

- Home
- Shows
- individual Show / Event detail pages
- Venue / Visit
- Rentals / Private Events
- Gallery or About

Ticket purchase may initially use a typed external CTA. HiVenues need not become a ticketing system merely to represent a premium live-music venue.

### Home composition pressure

- high-impact hero/current feature;
- upcoming shows;
- prominent ticket actions;
- venue/rental feature;
- location/hours or doors information;
- mailing-list/contact CTA if later supported.

### Event-detail pressure

An event must have a stable semantic identity suitable for:

- a dedicated URL;
- title/date/time/state;
- description;
- image;
- access/age/door information where modeled;
- ticket/external information link;
- derived event structured data when eligible.

### Visual direction

- bold high-contrast typography;
- poster/ticket rhythm;
- dense but scannable event rows/cards;
- dramatic photography;
- energy and motion without sacrificing readability or reduced-motion support.

### Acceptance question

Does "what is playing, when, and how do I get a ticket?" become obvious within seconds on desktop and mobile?

Required answer: **yes**.

## 7. Page-map comparison

| Product concept | Fourth Street | Juniper Works | Restaurant | Live music |
| --- | --- | --- | --- | --- |
| Home | required | required | required | required |
| Events / Programs | events | programs | optional events/specials | shows required |
| Detail leaf pages | desirable | program detail later | optional | event detail required |
| Menu / Services | optional | not needed | required | not needed |
| Private Events / Rentals | optional | optional | required | required/desirable |
| Equipment / Amenities | optional | required | optional amenities | optional venue amenities |
| Gallery / Projects | required | required | required | desirable |
| About | optional | desirable | desirable | desirable |
| Visit / Contact | required | required | required | required |
| Community | enabled | optional/target-disabled proof | disabled by default | disabled by default |
| Transaction surface | preserve current capability | not required | external reservation/order CTA initially | external ticket CTA initially |

This table is a **semantic pressure matrix**, not a fixed sitemap schema.

## 8. Component vocabulary handed to PM2

PM2 should be able to represent the four references with a bounded component registry. Exact payload schemas remain PM2 work.

### 8.1 Global site primitives

Not ordinary arbitrary page blocks:

- Site navigation
- Venue identity / wordmark
- Footer
- Page metadata
- Share metadata
- Capability entry points

### 8.2 Foundation components

Minimum candidate family:

- Venue Hero
- Story / Editorial Intro
- Media Feature
- CTA
- Gallery
- Hours & Location
- Contact / Visit
- Announcement

### 8.3 Programming components

- Event List
- Event Feature
- Program List
- Schedule / Upcoming
- Event status / availability presentation

Stable event/program items may generate dedicated leaf pages where the domain contract allows it.

### 8.4 Hospitality components

- Menu Preview
- Menu / Menu Section
- Private Events / Rentals
- Reservation / Booking CTA
- Testimonials / Press / Social Proof

The menu should be actual accessible page content, not a PDF-only dead end.

### 8.5 Operational components

- Equipment / Area Status
- Amenities
- Access / Orientation Guidance

Existing Juniper equipment work remains the proven implementation precedent for stable collection mechanics, not the only structural component in the future product.

### 8.6 Community-projection components

Available only when #161 Community capability is enabled:

- Official Updates
- Community Pulse
- Community Entry CTA
- selected social/community proof where later justified

These components project integration data. They do not own Hive identity or signing authority.

## 9. Component variants and layout recipes

HiVenues needs enough range to create distinct composition without turning into a low-level page builder.

### Candidate hero recipes

- immersive media overlay;
- editorial split;
- poster / event feature;
- quiet text-led introduction.

### Candidate list/card recipes

- editorial rows;
- compact information list;
- card grid;
- poster/ticket rows;
- status grid.

### Candidate gallery recipes

- disciplined grid;
- editorial feature + supporting media;
- aspect-ratio-aware strip/grid.

Any recipe must preserve source order, keyboard/focus order, alt/decorative decisions, and responsive semantics.

### Rejected default

- arbitrary x/y placement;
- independent desktop/mobile compositions;
- custom CSS classes;
- raw HTML/script;
- operator-defined CSS units;
- unrestricted nested layout primitives.

## 10. Design-system range

The current v1 semantic colors are a useful foundation, not a sufficient final design system.

PM2 should investigate versioned semantic tokens/recipes covering:

### Color roles

Preserve/extend semantic roles such as:

- canvas/background;
- surface;
- raised surface;
- border/divider;
- primary text;
- muted text;
- accent;
- interaction accent;
- status success/warning/danger/info.

### Typography roles

- display;
- heading;
- body;
- label;
- metadata.

Operators should select curated typography recipes or compatible role choices rather than manually constructing CSS font stacks and line-height rules.

### Spacing and density

- compact;
- standard;
- generous/editorial;

implemented as constrained scales rather than free-form pixel entry.

### Shape and depth

- radius scale;
- border treatment;
- elevation/surface treatment.

### Media treatment

- focal point;
- crop/aspect strategy;
- overlay strength where relevant;
- contained vs immersive presentation;
- caption treatment.

### Component recipe identity

Each layout/style recipe should have a stable semantic id so Studio, source, renderer, migration, tests, and visual evidence refer to the same meaning.

## 11. Flagship Venue Studio target

The accepted #133 direction remains controlling.

### Desktop anatomy

- **top bar:** venue identity, viewport controls, Undo/Redo, explicit save state, Preview;
- **left rail:** Pages, selected-page Sections, Add; secondary access to Media, Theme, Site Settings/Integrations;
- **center:** dominant real-renderer Canvas;
- **right inspector:** controls for the selected semantic component;
- **status channel:** validation/save outcomes without layout jump.

The recent Studio concept image supports the visual ambition of a calm three-region editor, responsive controls, media awareness, and contextual inspector.

One element in that concept is explicitly **not** accepted: a generic **Publish** button in the ordinary Studio top bar. Existing architecture keeps deployment/publishing as a separate authority boundary.

### Tablet anatomy

At approximately 834 × 1112:

- canvas remains primary;
- only one side panel needs to be open at a time;
- explicit page/inspector drawers or panel switching is preferred to compressing three columns;
- responsive preview state is visible.

### Mobile anatomy

At 390 × 844:

- deliberate Edit and Preview modes;
- component selection and principal action remain near the top;
- inspector may use a bottom sheet/full-screen editor;
- precision drag is never required;
- page/section structure remains keyboard and single-pointer operable.

## 12. Reference operator tasks for Track A

Future Studio acceptance should include real tasks, not merely screenshots.

### Fourth Street task

- select Hero;
- change approved copy/media;
- add or position an Events/Updates component where valid;
- review Community component behavior when capability is enabled;
- switch to mobile preview;
- undo;
- save to workspace.

### Juniper task

- find Programs and Equipment without source knowledge;
- add/edit/reorder an equipment item;
- edit a program;
- inspect responsive behavior;
- save/reopen exact state.

### Restaurant task

- import venue imagery;
- edit Hero;
- add/update menu content;
- configure an external reservation CTA;
- add/reorder Private Events and Gallery;
- change design recipe/theme;
- verify mobile/tablet;
- save/reopen.

### Live-music task

- create/update a show;
- provide ticket link;
- inspect its event detail representation;
- reorder/feature upcoming shows where permitted;
- change event-list recipe;
- verify mobile/tablet;
- save/reopen.

None of these ordinary tasks should require JSON or source-code editing.

## 13. Responsive review matrix

### Human review viewports

Preserve current proven viewports:

- mobile: **390 × 844**;
- desktop: **1440 × 1000**.

Add PM1 target:

- tablet: **834 × 1112**.

These are representative acceptance viewports, not the only widths tested by machine suites.

### Generated-site minimum evidence target

PM4 should eventually produce, at minimum:

- each reference Home at mobile/tablet/desktop;
- one archetype-defining secondary page at mobile + desktop;
- one live-music Event detail page at mobile + desktop;
- deterministic geometry/overflow evidence.

Human review remains viewport-only. Historical full-page captures may remain machine intermediates but should not substitute for actual visible-viewport acceptance.

### Studio minimum evidence target

Representative states should cover:

- desktop three-region Canvas with selected component;
- tablet panel-switching/responsive preview;
- mobile Edit mode;
- mobile Preview mode;
- component insertion;
- validation failure;
- Undo/Redo;
- explicit saved/unsaved distinction;
- capability-disabled dependency state.

The exact screenshot count should be frozen per implementation phase to avoid uncontrolled visual-artifact growth.

## 14. Marketing-grade visual acceptance rubric

Each reference is reviewed independently.

Ratings:

- **FAIL** — broken, inaccessible, misleading, or clearly unfinished;
- **NEEDS WORK** — functional but not commercially credible;
- **STRONG** — professional and suitable for real use;
- **FLAGSHIP** — suitable to represent HiVenues publicly as product marketing.

### Dimensions

1. Venue brand dominance
2. Information architecture and visitor-goal clarity
3. Above-the-fold composition
4. Section rhythm and overall hierarchy
5. Typography and readability
6. Media treatment
7. CTA/action clarity
8. Responsive composition
9. Accessibility and interaction quality
10. Content credibility / empty-state honesty
11. Platform attribution and optional-capability integration
12. Performance/SEO readiness

### Acceptance threshold

For a PM4 reference to pass:

- no dimension may be FAIL or NEEDS WORK;
- brand dominance, composition/hierarchy, responsive quality, and product credibility should reach FLAGSHIP;
- all other dimensions must be at least STRONG;
- human reviewer must answer **yes** to both:

> Would this screenshot be credible on the HiVenues marketing site?

> Could a real independent venue plausibly use this public experience without hiring a designer to repair it?

Green deterministic CI alone cannot satisfy this rubric.

## 15. Accessibility target

Studio and generated venue sites remain separate accessibility review surfaces.

### Generated-site requirements

- WCAG 2.2 AA baseline;
- logical landmarks;
- one coherent heading hierarchy;
- reading/focus order follows semantic content order;
- visible focus;
- meaningful accessible names;
- alt text or explicit decorative decision;
- sufficient contrast;
- no viewport override that creates semantic-order divergence;
- reduced-motion respect;
- no inaccessible PDF-only menu requirement;
- controls/touch targets continue HiVenues' stronger 44 px internal convention where practical.

### Studio requirements

- full keyboard operation;
- non-drag alternative for every drag feature;
- tree/Canvas/inspector focus relationship is understandable;
- validation and save outcomes announced programmatically;
- no focus trap in preview/inline editor;
- selected and focused states remain distinguishable.

WCAG 2.2 specifically adds AA criteria for dragging alternatives and minimum target sizing. HiVenues should preserve its existing accessible reordering precedent even when later adding drag acceleration.

## 16. SEO and content target

PM2/PM4 should make venue semantics useful to discovery without turning search markup into a second data model.

Target output includes, where applicable:

- unique page titles and descriptions;
- canonical URLs;
- Open Graph/share metadata;
- semantic visible menu content;
- LocalBusiness-family structured data derived from visible business facts;
- stable event leaf URLs;
- Event structured data derived from visible event data;
- sitemap consistency;
- no invented reviews, opening hours, events, prices, or claims.

Google's current event guidance expects a unique URL focused on an individual event for event rich-result eligibility. That supports stable event detail semantics for the music reference.

## 17. Performance target

Public venue experience should remain lighter than the application/community surface wherever capabilities allow it.

### Production field goal

Use current Core Web Vitals "good" thresholds as PM4 field targets at the 75th percentile, segmented by mobile/desktop:

- LCP ≤ 2.5 s;
- INP ≤ 200 ms;
- CLS ≤ 0.1.

### Architecture pressure

- explicit image dimensions;
- responsive images/media optimization;
- avoid loading community/signing/payment JavaScript when corresponding capability is absent;
- minimize render-blocking resources;
- stable layout before late data;
- defer noncritical integrations.

PM1 does not invent an arbitrary JavaScript or image byte budget. PM4 should freeze deterministic lab budgets after measuring the accepted reference implementation.

## 18. Role of the generated concept images

The recent generated images are **directional product artifacts**, not pixel specifications.

### Useful signals to preserve

Studio concept:

- Canvas visual priority;
- left structural navigation;
- contextual inspector;
- responsive-device controls;
- clear Undo/Redo and save state;
- media and design-token awareness;
- polished, quiet product chrome.

Generated-site concepts:

- materially different venue moods;
- photography-forward hospitality;
- bold event/ticket hierarchy for live music;
- premium editorial restaurant composition;
- strong CTA visibility;
- clear public-site identity rather than blockchain UI.

### Signals not automatically accepted

- generated text/content accuracy;
- exact dimensions;
- exact icons/colors/typefaces;
- arbitrary UI controls invented by image generation;
- a Publish button in Studio;
- any visual element that violates accessibility or authority boundaries;
- concept venue names as real-world identities.

## 19. Anti-copy / reference-not-imitation rule

Webflow, Wix Studio, Shopify, Squarespace, BentoBox, Toast, and other products are **research inputs**.

HiVenues may learn from:

- canvas directness;
- contextual inspection;
- constrained sections/blocks;
- responsive previews;
- domain-specific restaurant tasks;
- fast no-code updates;
- hospitality-first information architecture.

HiVenues must not copy:

- exact trade dress;
- unique iconography;
- proprietary template composition;
- product terminology wholesale;
- page-builder information architecture unrelated to venue tasks.

The final product should look like **HiVenues**, and each generated public site should look first like its venue.

## 20. Generalization failure tests

PM2/PM4 should explicitly fail a candidate if any of the following is true:

1. restaurant or music requires a venue-specific renderer fork;
2. a new page/component requires raw HTML/CSS/script authority;
3. Fourth Street-specific strings/classes become generic platform truth;
4. Juniper remains "bar-shaped" despite different copy;
5. restaurant and music are simple recolors of the same composition;
6. Community must be configured before a public-only synthetic venue validates;
7. turning off Community leaves broken navigation/empty technical chrome;
8. adding a booking/ticket CTA implies transaction authority;
9. mobile needs a separate independent content tree;
10. generated-site quality passes only because screenshots omit weak secondary pages;
11. editor preview diverges from real renderer;
12. reference quality requires hand-editing source code after Studio output.

## 21. PM2 handoff requirements

The accepted #161 architecture plus this reference contract require PM2 to design a versioned semantic site model that can express all four references.

The PM2 contract must cover at least:

1. multiple public pages with stable ids/slugs;
2. primary navigation over stable public destinations;
3. stable ordered semantic component instances;
4. a bounded component registry covering the families in section 8;
5. component cardinality and placement rules;
6. stable collection item identity, including events/programs;
7. event-detail/leaf-page derivation or explicit representation;
8. structured menu/service representation sufficient for the restaurant reference;
9. semantic theme tokens;
10. stable component layout/visual recipe ids;
11. responsive recipe inheritance and bounded overrides;
12. media focal point/crop semantics;
13. optional Community capability from #161;
14. separately privileged Transaction capability from #161;
15. public-only venue validity without Hive activation;
16. deterministic v1 migration preserving Fourth Street integration identities;
17. starter composition/provenance semantics without creating separate template authorities;
18. direct-source round trip;
19. one real-renderer authority;
20. no arbitrary HTML/CSS/script.

## 22. Recommended PM2 decomposition

After PM1 acceptance, open only the immediately necessary PM2 design issues:

### PM2A — Semantic Site Document & Migration Contract

Freeze pages, navigation, components, capability state, stable ids, v1 migration, and reference representability.

### PM2B — Semantic Design System & Responsive Recipe Contract

Freeze theme-token expansion, typography roles, component variants/layout recipes, media treatment, responsive inheritance, and accessibility constraints.

Implementation should not begin merely because these issues exist. Each contract must be accepted before runtime/schema wiring.

## External evidence register

Accessed 2026-09-06.

- Webflow Help Center, Webflow canvas overview — current direct selection, hierarchy, movement, preview, pan/zoom patterns.
  https://help.webflow.com/hc/en-us/articles/33961319255059-Webflow-canvas-overview

- Wix Help Center, Studio Editor: Using the Inspector Panel — selection-specific content/design/responsive controls.
  https://support.wix.com/en/article/studio-editor-using-the-inspector-panel

- Wix Help Center, Studio Editor: Managing Breakpoints — default desktop/tablet/mobile breakpoint concepts.
  https://support.wix.com/en/article/studio-editor-managing-breakpoints

- Shopify Dev, Theme editor best practices — no-code visual editing, direct preview selection, add/remove/reorder sections and blocks, multi-device preview.
  https://shopify.dev/docs/storefronts/themes/best-practices/editor

- Shopify Dev, Theme architecture / Sections / Blocks — constrained reusable sections/blocks and ordered merchant composition.
  https://shopify.dev/docs/storefronts/themes/architecture
  https://shopify.dev/docs/storefronts/themes/architecture/sections
  https://shopify.dev/docs/storefronts/themes/architecture/blocks

- Squarespace Help Center, Building a restaurant site — menus, reservations, specials, location/hours, hospitality brand, food-focused designs.
  https://support.squarespace.com/hc/en-us/articles/208922158-Building-a-restaurant-site

- Squarespace, Restaurant Website Builder — menus, reservations, event calendars and accessible menu presentation.
  https://www.squarespace.com/tour/restaurant-websites

- BentoBox, Fine Dining and platform pages — restaurant-first websites, menus/hours/specials, private events, SEO, operational updating.
  https://www.getbento.com/solutions/fine-dining/
  https://www.getbento.com/why-bentobox/

- Toast, Restaurant Website Builder — no-code, mobile-friendly restaurant sites, consistent branding, menus/order/reservation integration, SEO.
  https://pos.toasttab.com/products/websites

- Google Search Central, LocalBusiness structured data.
  https://developers.google.com/search/docs/appearance/structured-data/local-business

- Google Search Central, Event structured data.
  https://developers.google.com/search/docs/appearance/structured-data/event

- W3C WAI, What's New in WCAG 2.2.
  https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/

- web.dev, Web Vitals — current Core Web Vitals good thresholds.
  https://web.dev/articles/vitals

## Final decision

~~~text
PM1_REFERENCE_MATRIX =
FOURTH_STREET_REAL_REFERENCE
+ JUNIPER_WORKS_SYNTHETIC_REFERENCE
+ RESTAURANT_PRIVATE_EVENTS_SYNTHETIC_ARCHETYPE
+ LIVE_MUSIC_SYNTHETIC_ARCHETYPE

ARCHETYPE_IMPLEMENTATION_MODEL =
ONE_SEMANTIC_SITE_SYSTEM
+ STARTER_COMPOSITIONS
+ CAPABILITY_SELECTION
+ CONSTRAINED_DESIGN_RECIPES

SEPARATE_RENDERER_PER_ARCHETYPE = NO
SIMPLE_RECOLOR_GENERALITY = FAIL
RAW_HTML_CSS_SCRIPT_AUTHORITY = NO
COMMUNITY_REQUIRED_FOR_PUBLIC_REFERENCE = NO
STUDIO_PUBLISH_CONTROL = NO
TABLET_FIRST_CLASS_REVIEW_TARGET = YES
MARKETING_GRADE_HUMAN_REVIEW = REQUIRED
PM2A_SEMANTIC_SITE_CONTRACT_REQUIRED = YES
PM2B_DESIGN_SYSTEM_RESPONSIVE_CONTRACT_REQUIRED = YES
~~~
