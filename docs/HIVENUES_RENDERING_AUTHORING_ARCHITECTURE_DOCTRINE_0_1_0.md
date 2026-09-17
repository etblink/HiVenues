# HiVenues — Rendering & Authoring Architecture Doctrine 0.1.0

```text
DOCUMENT = HIVENUES_RENDERING_AUTHORING_ARCHITECTURE_DOCTRINE
VERSION = 0.1.0
STATUS = CANONICAL / FROZEN ARCHITECTURE DOCTRINE
PARENT = docs/HIVENUES_END_STATE_PRODUCT_DOCTRINE_0_2_0.md
COMPANION = docs/HIVENUES_CANONICAL_USER_JOURNEY_0_2_0.md
SCOPE = SERVER RENDERING, PARTIALS, HTMX, CLIENT STATE, RESPONSIVE LAYOUT, COMPOSITIONS, SVG UI
CURRENT_IMPLEMENTATION = EVIDENCE / NOT DEFINITIONAL
AMENDMENT = EXPLICIT VERSIONED REVISION ONLY
```

## 0. Why this document exists

HiVenues needs enough architectural discipline to preserve one canonical host, operational truth and progressive enhancement while still producing frontends that can look and behave radically different from one another.

The risk has two directions:

1. **too little structure** — duplicated templates, divergent state, brittle authoring and unsafe consequences;
2. **too much generic reuse** — one universal component/page skeleton that makes every generated host look alike.

This doctrine defines the current preferred architecture between those extremes.

It is subordinate to the End-State Product Doctrine. If an implementation technique conflicts with host-first product quality or semantic truth, the product doctrine wins.

---

# Part I — State and rendering authority

## 1. Durable truth is server-owned

The server owns durable application truth, including:

- canonical host graph;
- working/live state;
- Releases and History;
- Activity and Offer identity/lifecycle;
- preview context;
- conflict/staleness guards;
- consequences and authority requirements;
- provider bindings and reconciled external state;
- validation.

Client JavaScript must not create a second durable host model that can diverge from the server.

The browser may hold transient interaction state such as:

- which contextual panel is open;
- selected local tab/lens;
- drag/focal preview state before save;
- keyboard/focus state;
- disclosure/menu state;
- temporary responsive-review mode;
- wallet handoff state that has not yet been reconciled into canonical server state.

When a durable mutation succeeds, server acknowledgement is authoritative.

---

## 2. Semantic HTML is canonical public output

HiVenues-generated frontends should render meaningful server-produced HTML suitable for:

- ordinary browser navigation;
- accessibility;
- deep links;
- search/discovery where applicable;
- progressive enhancement;
- stable public routes;
- open projections such as ICS/RSS/metadata where applicable.

JavaScript should enhance the product, not be required merely to recover the underlying semantic meaning of the page.

---

# Part II — EJS structure

## 3. EJS has three semantic levels

### Components

Reusable semantic building blocks whose meaning can remain stable across compositions.

Examples:

- Activity lifecycle/status;
- consequence disclosure;
- Contact consequence;
- Release/publication state;
- media figure;
- avatar/profile identity;
- vote/support mechanic;
- provider/degraded state;
- SVG icon control.

A component may vary visually by composition context. Reuse does not imply one fixed appearance.

### Fragments

Coherent server-rendered units that represent a meaningful task or HTTP/swap boundary.

Examples:

- contextual Activity editor;
- media editor;
- Release review summary;
- Activity discovery region;
- feed region;
- profile summary;
- provider integration state;
- conflict recovery panel.

Fragments may compose multiple components.

### Compositions

Art-directed assemblies of the canonical semantic host.

Compositions own the right to be structurally different.

They may have different:

- DOM hierarchy;
- route/page grouping;
- grid topology;
- navigation;
- section ordering;
- media placement;
- typography hierarchy;
- density/rhythm;
- interaction placement;
- responsive behavior.

Poster, Editorial and Hospitality are early examples. Future compositions may diverge much further.

---

## 4. Share semantic decisions, not universal layout

If two compositions need the same Activity lifecycle truth, they should reuse the semantic lifecycle component or helper.

They do **not** need to render the Activity in the same card, section, page location or markup hierarchy.

A good reuse decision removes duplicated **meaning**.

A bad reuse decision removes legitimate **art direction**.

Do not create a universal page-section component merely because all current examples contain similar content.

The strongest composition may warrant dedicated markup.

---

# Part III — HTMX

## 5. HTMX is the preferred enhancement layer for server-state transitions

Use HTMX where a durable or server-derived transition benefits from updating a coherent region without requiring a full-page navigation.

Good candidates include:

- opening or switching contextual Studio editors;
- Activity/Offer/content edits;
- Contact, Look, Voice and media saves;
- stale-conflict recovery;
- Release review/history state;
- provider/integration state transitions;
- server-rendered feed/profile/community regions;
- coherent canvas/status refreshes after successful mutations;
- out-of-band updates when multiple server-rendered regions must remain synchronized.

HTMX should transport canonical server-rendered truth. It should not hide a client-side application model behind HTML swaps.

---

## 6. Full-page fallback remains a quality requirement

Where practical, HTMX-enhanced GET/POST workflows should retain ordinary full-page HTTP behavior as the progressive-enhancement fallback.

This improves:

- reliability;
- debuggability;
- accessibility;
- deep-link clarity;
- recovery from partial client failure;
- architectural discipline around server authority.

A workflow should not become impossible merely because an HTMX request did not execute.

---

## 7. Do not force HTMX onto purely local interactions

HTMX is not the answer to every interaction.

Use bounded JavaScript for genuinely local/transient behavior such as:

- focal-point live preview before save;
- keyboard/Escape behavior;
- drag gestures;
- menu/popover state;
- temporary width-review switching;
- optimistic visual affordances that do not claim durable success;
- wallet-extension invocation after a reviewed server-prepared action.

The rule is:

> **Server state transition → prefer server rendering / HTMX. Local interaction state → bounded JavaScript.**

---

# Part IV — Responsive architecture

## 8. Container queries are the preferred tool for component-space adaptation

Use CSS container queries when a rendered component must respond to the space allocated by its composition rather than the browser viewport.

Important cases include:

- Studio wide versus built-in narrow review;
- reusable media figures in different composition columns;
- Activity/feed/profile regions embedded at different widths;
- cards/panels whose parent layout changes across Directions;
- route/page compositions that reuse a semantic region in different spatial roles.

This allows one semantic component to adapt correctly inside radically different art-directed layouts without coupling it to global breakpoints.

---

## 9. Media queries remain correct for actual viewport/device-shell concerns

Use media queries for behavior tied to the true browser/device viewport, such as:

- Studio mobile shell/navigation;
- safe-area treatment;
- viewport-level page gutters;
- touch/mobile interaction mode;
- global responsive navigation;
- reduced-motion and other user/device preferences.

Do not substitute container queries for concerns that are genuinely viewport-level.

Do not substitute global media queries for component behavior that depends on local composition width.

---

## 10. `subgrid` is selective, not ideological

Use CSS `subgrid` where nested semantic regions genuinely benefit from sharing parent tracks.

Good examples may include:

- repeated Activity rows whose metadata/body/actions must align;
- offer/catalog detail columns;
- profile/member lists with aligned identity/state/action tracks;
- editorial metadata relationships;
- repeated Studio property rows inside a composition-aware layout.

Do not impose one `subgrid` structure on unrelated Directions merely for reuse.

Normal Grid/Flexbox remain correct when no meaningful shared-track relationship exists.

The test is semantic and visual alignment, not whether a newer CSS primitive can be used.

---

# Part V — Route/page architecture

## 11. Multi-page output remains one semantic host

Home, Activity detail, feed, post detail, profile, gallery, Offer/catalog and other public routes are projections of one canonical host/domain model.

They must not become independent editable page documents that silently fork canonical truth.

A composition may decide which routes exist, which content is emphasized and how visitors navigate among them.

The domain objects themselves remain durable and presentation-independent.

---

## 12. Internal links must preserve context truth

Links generated inside a projection must preserve the intended state/context.

Examples:

- draft preview Activity links remain draft preview;
- public/live links remain live;
- preview calendar consequences remain preview-derived;
- History/Restore review links must not silently mutate state;
- provider/degraded surfaces must not imply success before reconciliation.

Context may be represented through route, server-side view model or another explicit mechanism.

It must not be inferred accidentally from whatever public route is easiest to reuse.

---

# Part VI — SVG and visual primitives

## 13. SVG is the default vector UI primitive

For Studio/application chrome, prefer reusable SVG icons/components for semantic actions and states rather than Unicode glyphs, raster icons or text-only density where an icon materially improves the experience.

Requirements:

- stable icon API/naming;
- accessible label for icon-only controls;
- currentColor or token-aware theming where appropriate;
- no embedded external tracking/resources;
- predictable sizing/alignment;
- keyboard/touch affordance belongs to the control, not the SVG alone;
- decorative SVGs are hidden from assistive technology when appropriate.

Public host-native SVG art may be more expressive and composition-specific.

Do not require Studio utility icons and host-branded public icons to share one visual personality.

---

# Part VII — Client architecture boundaries

## 14. No SPA rewrite by default

HiVenues does not need React, Vue or another SPA framework merely to appear modern.

The current preferred architecture is:

```text
SERVER-OWNED CANONICAL MODEL
        ↓
EJS SEMANTIC COMPONENTS / FRAGMENTS
        ↓
DIRECTION-SPECIFIC COMPOSITIONS
        ↓
HTMX FOR SERVER-STATE TRANSITIONS
BOUNDED JS FOR LOCAL INTERACTION
        ↓
CONTAINER QUERIES FOR COMPONENT SPACE
MEDIA QUERIES FOR VIEWPORT SPACE
SUBGRID WHERE SHARED TRACKS ARE REAL
SVG FOR VECTOR UI / HOST-NATIVE VISUAL SEMANTICS
```

A future framework change requires evidence that the current model cannot meet a concrete product requirement and must be treated as an explicit architecture revision.

Framework fashion is not sufficient evidence.

---

## 15. No client-side host-state mirror

Do not maintain a long-lived JavaScript mirror of the canonical host graph merely to make the UI feel application-like.

If a local interaction needs temporary state, keep it bounded and reconcile through the server before claiming durable success.

This rule protects:

- multi-tab consistency;
- restart semantics;
- stale-state detection;
- server validation;
- Release truth;
- simpler provider/consequence boundaries.

---

# Part VIII — Qualification and drift checks

## 16. Architecture must be proven through product outcomes

A phase does not pass because it used HTMX, EJS partials, container queries, subgrid or SVG.

Those tools are valuable only if the result improves:

- semantic consistency;
- operator clarity;
- frontend differentiation;
- responsive quality;
- accessibility;
- maintainability;
- operational safety;
- performance/reliability.

Technology usage is not itself a product milestone.

---

## 17. Mandatory architecture drift questions

Before accepting a major rendering/Studio phase, ask:

1. Is durable truth still server-owned?
2. Could JavaScript failure leave the underlying semantic workflow understandable/recoverable?
3. Are shared EJS pieces sharing semantics rather than flattening art direction?
4. Are composition-specific structures allowed where they create real differentiation?
5. Is HTMX used for server-state transitions rather than as a disguised client-state bus?
6. Are container queries used for local component-space adaptation where appropriate?
7. Are media queries reserved for true viewport/device concerns?
8. Is subgrid used only where shared tracks improve actual alignment?
9. Is SVG iconography coherent, accessible and purposeful?
10. Can the same rich host still render into materially different Directions/compositions?
11. Does preview/public/history context remain exact across route navigation?
12. Has the architecture avoided creating a second durable model or a universal page skeleton?

If not, the architecture has drifted even if tests remain green.

---

# Final architecture rule

> **Share truth aggressively. Share layout selectively. Keep durable state on the server. Let compositions be genuinely different. Use modern web primitives at the layer where they are strongest.**