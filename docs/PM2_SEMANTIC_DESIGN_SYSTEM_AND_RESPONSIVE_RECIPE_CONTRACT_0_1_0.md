# PM2 semantic design-system and responsive recipe contract 0.1.0

## Status and authority

| Field | Value |
| --- | --- |
| Tracking issue | #166 — PM2 Design System |
| Parent roadmap | #160 — HiVenues Product Maturation |
| Canonical base commit | \`d82625b83037eb51fa91b3acff5efffe4f42756c\` |
| Canonical base tree | \`37cb9531648b2affe13d4eb5e51ac593afc1f772\` |
| Required accepted domain input | #165 / PR #167 |
| #165 canonical qualification | CI #618 — PASS |
| Scope | semantic design tokens, component recipes, media treatment, responsive inheritance, accessibility constraints, v1 design migration |
| Implementation authorization | **No** |
| Production / deployment / Hive / key / payment effects | **None** |

This document answers Issue #166. It defines the design-system semantics that may be referenced by the accepted v2 source architecture from #165. It does not implement CSS, add fonts, change Tailwind, alter the renderer, redesign Venue Studio, migrate a theme, create fixtures, or change a real venue.

## Executive decision

HiVenues should use a **bounded semantic design system** with four layers:

1. **site design tokens** — colors and stable global roles stored as canonical source state;
2. **curated design recipes** — typography, density, shape, and surface-treatment selections referenced by stable ids;
3. **component recipes** — semantic layout/presentation variants compatible with each component kind;
4. **responsive inheritance** — one shared content/component tree resolved through Desktop → Tablet → Mobile with a small allowed override vocabulary.

The goal is not to make HiVenues a generic CSS editor.

The goal is:

> enough constrained design range for a neighborhood bar, workshop, premium restaurant, and live-music venue to look materially different and professionally designed while remaining safe, responsive, accessible, and deterministic.

The final model rejects:

- arbitrary CSS properties;
- arbitrary class names;
- arbitrary units;
- free-positioned x/y layout;
- custom breakpoints in the initial v2 contract;
- independent desktop/mobile page trees;
- unbounded per-component style objects;
- hidden template authority.

## 1. Relationship to the accepted v2 domain model

#165 establishes that the canonical v2 source owns:

- venue facts;
- managed media;
- shared resources;
- site/pages/components/navigation;
- optional capabilities.

This contract establishes the design state those semantic objects may reference.

### Source-authority rule

Design state is **canonical venue source state** once chosen.

A starter composition may select initial design values, but it does not remain a hidden design authority.

Changing a HiVenues starter later cannot silently restyle an existing venue.

### Conceptual seam

A future implementation may use a shape broadly equivalent to:

~~~json
{
  "site": {
    "brand": {
      "logoAssetId": "logo",
      "design": {
        "colors": {},
        "typographyRecipeId": "type-system-sans",
        "densityRecipeId": "density-standard",
        "shapeRecipeId": "shape-soft",
        "surfaceRecipeId": "surface-layered"
      }
    },
    "pages": [
      {
        "components": [
          {
            "id": "hero-main",
            "kind": "venue-hero",
            "recipeId": "hero-editorial-split",
            "responsive": {
              "tablet": {},
              "mobile": {}
            }
          }
        ]
      }
    ]
  }
}
~~~

This is conceptual. Implementation may refine exact property placement while preserving the accepted meaning.

## 2. Design-system principles

1. **Venue identity first.** HiVenues chrome does not become the visual identity of generated sites.
2. **Semantic roles over CSS properties.** Operators choose "accent", "editorial split", or "generous density", not \`#selector { ... }\`.
3. **Professional defaults.** Every valid combination should begin from a credible design baseline.
4. **Constrained variance.** Different references must differ in composition and rhythm, not only color.
5. **One source tree.** Responsive behavior adapts one semantic composition.
6. **Visible inheritance.** Studio must show where a responsive value comes from.
7. **Accessible by construction.** Recipe validity includes semantic/accessibility constraints.
8. **No silent template authority.** Starter choices are materialized into canonical source.
9. **Renderer is final authority.** Studio previews the real renderer.
10. **Design selection is reversible typed state.** Recipe/token changes participate in ordinary validation/history where ownership permits.
11. **No authority escalation through appearance.** Styling a Payment or Community entry never activates its capability.
12. **Human quality still matters.** Valid tokens do not automatically equal a flagship design.

## 3. Site color roles

The current v1 source already exposes:

- canvas;
- surface;
- border;
- text;
- mutedText;
- accent;
- accentHover.

The current runtime internally also uses additional roles such as raised surfaces, subtle text, and status colors.

v2 should make the important design semantics explicit rather than relying on Fourth Street-specific runtime defaults.

### Required v2 color roles

#### Foundation

- \`canvas\` — outer page/background field;
- \`surface\` — principal content surface;
- \`surfaceRaised\` — cards/panels above the principal surface;
- \`surfaceStrong\` — stronger navigation/overlay/panel surface;
- \`border\` — non-interactive separation;
- \`text\` — principal readable text;
- \`textMuted\` — secondary readable text;
- \`textSubtle\` — tertiary readable text.

#### Interaction / brand

- \`accent\` — principal brand/action color;
- \`accentHover\` — hover/active treatment;
- \`accentText\` — text/icon color placed on an accent-filled control/surface;
- \`focusRing\` — explicit keyboard focus role.

#### Status

- \`info\`;
- \`success\`;
- \`warning\`;
- \`danger\`.

Status roles are not permission to communicate state through color alone.

### Why \`accentText\` is explicit

v1 can safely infer some foreground/background pairings because the existing contrast validator is narrow.

v2 needs a direct role for content placed on accent backgrounds so the renderer does not guess from venue colors.

## 4. Color validation contract

The exact implementation validator may be stricter, but it must not be weaker than these semantic requirements.

### Readable text pairs

At minimum require WCAG AA-equivalent contrast for normal text on the surfaces where a role is actually permitted:

- \`text\` on \`canvas\`, \`surface\`, \`surfaceRaised\`;
- \`textMuted\` on those surfaces;
- \`textSubtle\` where used for real readable copy;
- \`accent\` when used as text/link color on relevant surfaces;
- \`accentText\` on \`accent\` and \`accentHover\`.

HiVenues may retain its current stronger simplification of requiring 4.5:1 for text-like roles even when some rendered text would technically qualify as "large text."

### Focus

\`focusRing\` must visibly distinguish focused components from adjacent colors. The initial implementation should target at least 3:1 against the immediately adjacent rendered surface.

### Border

General decorative separation may retain a lower contrast role where the border is not the sole way to perceive a control or state.

Interactive boundaries must satisfy the stronger applicable non-text/UI contrast requirement through the full rendered component, not merely inherit the decorative \`border\` rule.

### Status

A status role:

- must be accompanied by text/icon/shape where meaning matters;
- cannot be the only state signal;
- must use a readable paired foreground treatment supplied by the component recipe.

### Text over photography

Do not assume arbitrary photography provides sufficient contrast.

Any recipe that places text over media must create a **deterministic contrast-protecting surface**, such as:

- an opaque/near-opaque semantic panel;
- a sufficiently strong fixed scrim/gradient whose accepted implementation proves the required foreground contrast independently of the image;
- another bounded accessible treatment.

An operator-controlled "overlay opacity 0–100%" slider that can make text inaccessible is rejected.

## 5. v1 color migration

All seven current v1 theme values must survive migration.

Deterministic mapping:

| v1 | v2 |
| --- | --- |
| canvas | canvas |
| surface | surface |
| border | border |
| text | text |
| mutedText | textMuted |
| accent | accent |
| accentHover | accentHover |

New roles receive deterministic compatibility defaults.

Candidate mapping contract:

- \`surfaceRaised\` = v1 \`surface\` initially;
- \`surfaceStrong\` = v1 \`surface\` initially;
- \`textSubtle\` = v1 \`mutedText\`;
- \`accentText\` = v1 \`canvas\` when the existing v1 contrast contract proves the pair valid;
- \`focusRing\` = v1 \`accent\`;
- status roles use existing platform status defaults until separately operator-customizable under an accepted v2 extension.

Implementation must verify these migrated values satisfy the v2 validator. If a valid v1 theme cannot satisfy an added v2 rule through this mapping, migration must use a documented deterministic compatibility treatment rather than silently rejecting or recoloring the venue.

## 6. Typography model

### Decision

v2 should use **curated typography recipes**, not arbitrary font-family/style editing.

The canonical source stores a stable typography recipe id.

A typography recipe defines semantic roles:

- display;
- heading;
- body;
- label;
- metadata.

Each recipe determines:

- font-family stack or approved bundled family reference;
- weight range;
- size scale;
- line-height;
- letter spacing;
- text-transform constraints where relevant.

### Initial semantic recipe families

Candidate ids:

- \`type-system-sans\`
- \`type-editorial\`
- \`type-grotesk-display\`
- \`type-poster\`

These names describe design intent, not a promise to ship a particular third-party font.

### Dependency rule

PM2 does **not** authorize new font dependencies, external font CDNs, or licensed assets.

An implementation issue must separately decide whether each recipe uses:

- system stacks;
- bundled permitted web fonts;
- another accepted font strategy.

No recipe may depend on a network font request merely to render the baseline offline Studio/readiness flow.

### Per-component typography

Components may use the roles defined by the site typography recipe.

The initial v2 contract rejects arbitrary per-component font families.

A component recipe may choose "display role vs heading role" according to its semantic design, but cannot invent a new font stack.

## 7. Density and spacing

### Decision

Use a finite density recipe rather than arbitrary margins/padding.

Candidate source values:

- \`density-compact\`
- \`density-standard\`
- \`density-generous\`

Each defines:

- section vertical rhythm;
- container gaps;
- card padding;
- list-row density;
- control spacing;
- headline-to-body spacing.

The underlying renderer may implement these through a stable spacing scale similar to the current \`--hb-space-*\` system, but operators do not manipulate raw rem/px values.

### Reference pressure

- Juniper can use compact/standard information density;
- Fourth Street can use standard;
- restaurant can use generous editorial rhythm;
- live music may combine compact event density with larger hero rhythm through component recipes.

Site density is a baseline; component recipes may use bounded compatible density variants where needed.

## 8. Shape and surface treatment

### Shape recipe

Candidate values:

- \`shape-crisp\`
- \`shape-soft\`
- \`shape-rounded\`

They control semantic families of:

- control radius;
- panel/card radius;
- media radius.

They do not expose arbitrary radius values.

### Surface recipe

Candidate values:

- \`surface-flat\`
- \`surface-layered\`
- \`surface-elevated\`

They define:

- card/surface separation;
- shadow/elevation vocabulary;
- border use;
- overlay behavior.

The initial contract rejects arbitrary box-shadow controls.

## 9. Media usage semantics

#165 establishes stable managed assets and usage-specific accessibility metadata.

PM2B adds presentation treatment.

Conceptual media usage may contain:

~~~json
{
  "assetId": "dining-room",
  "alt": "Dining room overlooking the harbor",
  "decorative": false,
  "treatment": {
    "focalPoint": { "x": 0.52, "y": 0.34 },
    "fit": "cover",
    "aspectRecipeId": "aspect-landscape-wide"
  }
}
~~~

### Focal point

- normalized x/y coordinates in the closed range 0–1;
- operator-authored;
- portable across image sizes;
- used only where the compatible recipe crops the asset.

### Fit

Initial allowed semantic values:

- \`cover\`;
- \`contain\` only for component kinds where it makes semantic sense.

No arbitrary object-position string.

### Aspect recipes

Candidate ids:

- \`aspect-original\`
- \`aspect-landscape-wide\`
- \`aspect-landscape\`
- \`aspect-square\`
- \`aspect-portrait\`

The exact ratios are registry-owned and documented.

### Alt/decorative

- meaningful media usage requires nonempty alt;
- decorative usage explicitly sets decorative state and does not also present conflicting alt;
- captions do not substitute for alt;
- the same asset may have different usage semantics in different components.

## 10. Component recipe registry

A component recipe is a platform-defined semantic presentation variant compatible with one or more component kinds.

Each recipe has:

- stable id;
- compatible component kind(s);
- renderer contract;
- required/optional content slots;
- responsive default behavior;
- allowed responsive overrides;
- accessibility invariants;
- media expectations;
- supported density relationships.

Unknown recipe ids fail closed.

### Recipe id stability

Changing the implementation styling behind a recipe id is a product change and must preserve the recipe's accepted semantic behavior.

A materially different composition requires a new recipe/version identity rather than silently repurposing an old one.

## 11. Hero recipes

Initial v2 pressure requires multiple hero silhouettes.

Candidate recipes:

### \`hero-immersive-media\`

- dominant media;
- bounded text/scrim treatment;
- strong primary CTA;
- appropriate for Fourth Street.

### \`hero-editorial-split\`

- text and media in a constrained split at wide widths;
- stacks predictably at smaller widths;
- appropriate for restaurant/editorial use.

### \`hero-poster\`

- event/poster emphasis;
- high-impact display typography;
- clear event/ticket CTA;
- appropriate for live music.

### \`hero-text-led\`

- minimal or supporting media;
- practical content hierarchy;
- appropriate for Juniper/program venues.

At least three materially different hero recipes should survive prototype review; if two prove visually/semantically redundant, consolidate rather than ship nominal variants.

## 12. List, card, and resource-projection recipes

Candidate shared recipes:

- \`list-editorial-rows\`
- \`list-compact-rows\`
- \`list-card-grid\`
- \`list-poster-rows\`
- \`status-grid\`

Compatibility is component-kind-specific.

Examples:

- Event List: editorial rows, card grid, poster rows;
- Program List: editorial rows, compact rows, card grid;
- Equipment Status: compact rows, status grid;
- Menu Preview: editorial rows, compact rows where appropriate.

A recipe cannot cause resource ownership to move into the component.

## 13. Gallery recipes

Candidate:

- \`gallery-disciplined-grid\`
- \`gallery-feature-grid\`
- \`gallery-strip\`

Rules:

- image order remains semantic source order;
- keyboard/reading order remains coherent;
- no masonry algorithm may create a confusing semantic/focus order;
- cropping uses explicit focal-point/media semantics;
- every item retains accessible usage metadata.

## 14. CTA / action recipes

Presentation recipes may distinguish:

- primary;
- secondary;
- quiet/textual;
- event/ticket emphasis.

But **action semantics are not appearance semantics**.

A visually "primary" button does not grant privileged authority.

Transaction/community capability checks occur before the action exists as an enabled semantic destination.

## 15. Desktop, Tablet, Mobile viewport model

### Named semantic viewports

The authoring model uses exactly three initial semantic viewport classes:

- Desktop;
- Tablet;
- Mobile.

The product may still render fluidly at every CSS width.

These names are **authoring inheritance scopes**, not exact device emulations.

### Review reference viewports

PM1 human acceptance remains:

- Desktop: 1440 × 1000;
- Tablet: 834 × 1112;
- Mobile: 390 × 844.

Implementation breakpoints may use the existing product transitions or a separately accepted mapping, but initial v2 does not expose arbitrary user-created breakpoints.

## 16. Responsive inheritance

### Decision

Use explicit one-direction inheritance:

~~~text
Desktop base
   ↓
Tablet
   ↓
Mobile
~~~

Tablet inherits Desktop values unless it owns an explicit allowed override.

Mobile inherits the resolved Tablet value unless it owns an explicit allowed override.

### Why this model

It:

- matches the mental model already recommended in #133;
- keeps changes predictable;
- allows the Studio to state exactly where a value came from;
- avoids independent page trees;
- keeps one semantic source order.

### Override visibility

For every overrideable property, Studio must distinguish:

- Inherited from Desktop;
- Inherited from Tablet;
- Overridden on Tablet;
- Overridden on Mobile.

A **Reset to inherited** action is required.

## 17. Allowed responsive overrides

The initial v2 override vocabulary must be intentionally small.

Candidate allowed override classes:

### Layout recipe adaptation

Where a component recipe defines compatible responsive modes, choose among its named responsive variants.

Example:

- wide split;
- stacked;
- compact stacked.

### Alignment

Bounded semantic values such as:

- start;
- center;

only where the component registry permits them.

### Grid/list density

Bounded values:

- columns from the recipe's allowed set;
- compact/standard spacing variant.

### Media treatment

- focal point;
- compatible aspect recipe;
- optional media position where the recipe explicitly supports it.

### Text measure

A finite semantic measure choice such as:

- narrow;
- standard;
- wide;

only if implementation evidence shows this is useful and safe.

## 18. Responsive overrides rejected in initial v2

Do not allow:

- arbitrary width/height;
- arbitrary margin/padding;
- arbitrary font size;
- arbitrary line-height;
- arbitrary absolute positioning;
- arbitrary z-index;
- arbitrary DOM/order rearrangement;
- separate mobile content;
- per-viewport deletion of semantic content;
- arbitrary hide/show of important content;
- arbitrary breakpoints;
- custom CSS.

### Visibility

The initial v2 contract does **not** permit operators to hide arbitrary semantic components per viewport.

If later research justifies responsive suppression for decorative media or duplicate non-semantic decoration, it must be modeled explicitly without causing information, focus, SEO, or accessibility divergence.

## 19. Semantic order invariant

The canonical component order in the page is the semantic/reading order.

Recipes may create visual grids or constrained media placement, but they must not create a materially different reading/focus order.

Examples:

- a Desktop editorial split may visually place media left and text right while DOM semantics remain coherent;
- Mobile may stack them according to the recipe's predetermined safe order;
- an operator cannot independently drag the media to a different mobile-only semantic position.

## 20. Responsive guardrails

Renderer/Studio should eventually diagnose at least:

- horizontal overflow;
- clipped media;
- unreadable line length;
- text collision;
- undersized controls;
- focus visibility;
- component content that exceeds recipe assumptions;
- navigation overflow;
- inaccessible color pair;
- missing media alt/decorative choice;
- invalid focal point;
- unavailable recipe/override combination.

A warning does not automatically authorize persistence if the state violates a hard invariant.

## 21. Navigation design contract

Public navigation should use shared semantic theme/typography/shape roles but remain a global site primitive.

Design variants may include bounded shell recipes later, for example:

- compact header;
- editorial header;
- event-forward header.

However:

- primary navigation targets remain source-authoritative;
- mobile navigation is derived from the same entries;
- the public site does not default to the old Home/Community/Threads/Pay/You application shell;
- Community subnavigation may use a denser app-shell treatment after capability entry.

## 22. Footer design contract

Footer is a global primitive.

It may surface:

- venue identity;
- visit/contact facts;
- selected navigation;
- optional platform attribution;
- optional Community entry.

It must not universally surface Hive/private-key educational copy on venues where Community is disabled.

The footer's design treatment may follow the site surface/typography recipe without becoming a separately styled mini-site.

## 23. Studio design controls

### Global Theme surface

The flagship Studio should expose global design controls as semantic product concepts:

- Colors;
- Typography;
- Density;
- Shape;
- Surface treatment.

It should show live real-renderer effects.

### Selected component Design tab

For a selected component:

- Recipe;
- compatible layout choices;
- media treatment;
- limited semantic alignment/density controls;
- Reset to recipe defaults.

### Responsive tab / viewport controls

When Desktop/Tablet/Mobile is selected:

- show resolved recipe state;
- mark inherited values;
- show only overrides legal for that component recipe;
- provide Reset to inherited.

### Do not expose

- CSS property names;
- class names;
- arbitrary units;
- raw style JSON;
- DOM structure;
- breakpoint CSS expressions.

## 24. Accessibility invariants across recipes

Every recipe must be accepted as a semantic/accessibility contract, not just a visual CSS preset.

Required invariants:

- logical headings/landmarks;
- reading/focus order follows semantic source order;
- no keyboard trap;
- visible focus;
- contrast-valid role usage;
- touch/activation targets continue the HiVenues 44 px internal target where practical;
- dragging always has non-drag alternatives;
- reduced-motion behavior;
- alt/decorative media rules;
- status not communicated by color alone;
- mobile/tablet recipe does not duplicate/remove meaningful content merely to fit.

### Recipe rejection

A visually appealing recipe that cannot satisfy these constraints is not a valid HiVenues recipe.

## 25. Motion

Motion should be bounded and optional.

Initial product rules:

- no motion required to understand content;
- reduced-motion disables or substantially reduces decorative transitions;
- no autoplay motion that competes with venue information by default;
- Studio manipulation feedback can animate only when it remains deterministic and reduced-motion aware.

PM2 does not define an operator-facing animation editor.

## 26. Reference design composition — Fourth Street

Target design pressure:

- typography: sturdy/approachable, potentially \`type-grotesk-display\` or compatible recipe;
- density: standard;
- shape: soft;
- surface: layered;
- hero: immersive media;
- events/updates: editorial rows;
- gallery: disciplined/documentary grid;
- Community entry integrated but visually subordinate to venue identity.

The result should feel atmospheric and neighborhood-specific.

## 27. Reference design composition — Juniper Works

Target pressure:

- typography: system sans / practical;
- density: compact or standard;
- shape: soft/crisp;
- surface: flat/layered;
- hero: text-led or restrained split;
- programs: compact/editorial rows;
- equipment: status grid;
- gallery/projects: disciplined grid.

The result should feel operational, bright, craft-oriented, and clearly non-bar.

## 28. Reference design composition — restaurant/private events

Target pressure:

- typography: editorial;
- density: generous;
- shape: soft;
- surface: flat/elevated with restraint;
- hero: editorial split;
- menu: editorial rows;
- private events: media feature;
- gallery: feature grid;
- CTAs: refined primary/secondary treatment.

The result should feel premium and spacious rather than like a recolored Fourth Street page.

## 29. Reference design composition — live music

Target pressure:

- typography: poster/display;
- density: standard overall with compact event listings;
- shape: crisp or soft depending accepted prototype;
- surface: elevated/high contrast;
- hero: poster;
- event list: poster rows;
- tickets: strong primary CTA;
- gallery: strip/feature treatment.

The result should feel energetic and event-first while remaining highly scannable.

## 30. Same-template-recolor failure test

The reference matrix fails design-system generality if the four sites differ primarily through:

- color;
- logo;
- imagery;
- copy.

### Human silhouette review

Compare representative screenshots:

1. in normal color;
2. in grayscale;
3. at reduced-detail/thumbnail scale.

Review:

- hero silhouette;
- navigation proportion;
- section rhythm;
- card/list language;
- media composition;
- whitespace density;
- CTA hierarchy.

If restaurant, music, workshop, and bar remain obviously one page template with surface substitutions, PM2/PM4 design maturity fails.

### Constraint

Passing this test cannot rely on private CSS forks.

Variance must come from accepted recipe/token composition in canonical source.

## 31. Recipe breadth guardrail

Too many recipes would recreate a generic page builder.

Too few produce sameness.

Initial implementation should therefore be explicitly bounded.

A component kind should generally begin with **2–4 high-quality materially distinct recipes**, not dozens of cosmetic permutations.

New recipes require:

- demonstrated venue task/design need;
- accessibility review;
- responsive behavior;
- reference evidence;
- compatibility contract.

## 32. Design token editing guardrail

Operators may choose colors within semantic roles, subject to validation.

For other design dimensions, initial v2 should favor recipe selection over numeric controls.

Candidate ordinary operator controls:

- semantic colors;
- typography recipe;
- density recipe;
- shape recipe;
- surface recipe;
- component recipe;
- approved responsive overrides;
- media focal point/crop.

Rejected initial ordinary controls:

- arbitrary spacing values;
- arbitrary font sizes;
- arbitrary shadow;
- arbitrary border radius;
- arbitrary transform;
- arbitrary animation;
- arbitrary opacity except where a bounded semantic component control is later justified.

## 33. v1 design migration

A migrated v1 venue must retain all v1 color values and receive deterministic recipe defaults.

Candidate migration defaults:

- typography: \`type-system-sans\`;
- density: \`density-standard\`;
- shape: \`shape-soft\`;
- surface: \`surface-layered\`;
- Hero: a \`hero-legacy-v1\` compatibility recipe or the closest explicitly accepted general recipe;
- Programs: chronological row recipe compatible with current behavior;
- Equipment: status/list recipe preserving current readable structure;
- Gallery: disciplined grid;
- Visit/Community/Updates: compatibility recipes preserving current semantic output.

### Compatibility recipe policy

If current v1 presentation cannot be represented faithfully enough by a general new recipe without unintended visual regression, a bounded \`legacy-v1\` recipe may exist.

That recipe:

- is still shared platform code;
- is not Fourth Street-specific;
- may be used by any migrated v1 source;
- is a migration compatibility surface, not the flagship default for new v2 venues.

This prevents the migration requirement from distorting the flagship recipe system.

## 34. New-v2 defaults

Fresh v2 venue creation should not begin from \`legacy-v1\`.

It should choose a starter composition based on the selected venue archetype/task and materialize:

- semantic color defaults;
- typography recipe;
- density/shape/surface recipe;
- page/component composition;
- component recipes.

After creation, those values are canonical venue state.

## 35. Contrast failure UX

A Studio color change that violates a hard contrast invariant must:

- preserve the user's attempted value in the relevant editing UI where feasible;
- explain which semantic role pair fails;
- show a preview/rejection state without falsely claiming workspace save;
- offer safe correction guidance;
- leave canonical workspace state unchanged until valid.

Do not silently "fix" a user's brand color by modifying it without explicit acceptance.

## 36. Recipe incompatibility UX

If a component does not support a recipe or responsive override:

- the Studio should not present it as a normal available choice;
- stale/source-authored unknown values fail validation;
- migration handles known legacy recipes explicitly;
- renderer never falls back silently to an unrelated recipe.

## 37. Performance implications

The design system should support PM1 performance targets.

Architectural requirements:

- no recipe should require a separate heavy client runtime to render static public content;
- media recipes should cooperate with responsive image generation/loading;
- design variation should primarily compile to shared CSS/semantic classes rather than arbitrary per-instance style blobs;
- Community/Transaction JavaScript should not be loaded solely because a public design recipe exists;
- typography strategy must not make offline readiness dependent on external font hosts.

Exact byte budgets are PM4 implementation/measurement work.

## 38. CSS/runtime implementation principle

The accepted product model is compatible with CSS custom properties, static generated classes, or another deterministic current-stack implementation.

This contract does **not** select a frontend framework.

Preferred implementation properties:

- semantic role mapping;
- finite recipe registry;
- static/deterministic output;
- easy server-rendered use;
- compatible with current Tailwind/current stack;
- no client-only editor renderer.

## 39. Direct-source representation

Direct-source users must be able to read and edit semantic design choices without understanding CSS.

Good source semantics:

~~~json
{
  "typographyRecipeId": "type-editorial",
  "densityRecipeId": "density-generous",
  "shapeRecipeId": "shape-soft"
}
~~~

Rejected source semantics:

~~~json
{
  "fontFamily": "\"Example\", sans-serif",
  "marginTop": "37px",
  "gridTemplateColumns": "minmax(0,1fr) 2.4fr",
  "customCss": "..."
}
~~~

## 40. Deterministic qualification requirements for implementation

A later implementation must prove:

1. exact design source canonicalization;
2. contrast validation;
3. recipe-kind compatibility;
4. responsive inheritance resolution;
5. Reset-to-inherited determinism;
6. v1 theme migration;
7. no source-order divergence;
8. keyboard and reduced-motion behavior;
9. real-renderer parity;
10. Desktop/Tablet/Mobile evidence;
11. all four PM1 reference compositions;
12. same-template-recolor human review;
13. no arbitrary CSS/script acceptance;
14. Windows/Ubuntu portability.

## 41. Track A / B / C acceptance implications

### Track A — Studio

Success requires:

- intuitive theme editing;
- contextual recipe selection;
- clear viewport inheritance;
- safe validation;
- Canvas dominance;
- no implementation-language leakage.

### Track B — generated venue experience

Success requires:

- materially different professional reference sites;
- intentional responsive compositions;
- strong media/typography/hierarchy;
- venue identity ahead of platform identity.

### Track C — platform integrity

Success requires:

- canonical semantic design state;
- fail-closed validation;
- accessibility invariants;
- deterministic renderer behavior;
- no new authority path;
- exact migration;
- direct-source compatibility.

None of the three tracks can substitute for the others.

## 42. Rejected alternatives

| Alternative | Decision | Reason |
| --- | --- | --- |
| Raw CSS editor | Reject | Expands security/usability/review surface and defeats semantic authority |
| Arbitrary classes | Reject | Exposes implementation model and creates hidden coupling |
| Full numeric spacing/radius controls | Reject initially | Too much low-level freedom for target operator; recipe system gives safer range |
| Unlimited breakpoints | Reject | Creates cascading complexity and review explosion |
| Independent mobile layout tree | Reject | Semantic/accessibility/source drift |
| Hide arbitrary content by viewport | Reject initially | Creates information/SEO/focus divergence |
| One fixed template with color themes | Reject | Fails PM1 generality/brand goals |
| Dozens of near-identical recipes | Reject | Creates choice overload and pseudo-generic builder |
| External font CDN required by default | Reject | Weakens offline/readiness determinism |
| Image-overlay contrast left to operator judgment | Reject | Cannot guarantee accessible output |
| Template remains live design authority | Reject | Creates hidden competing state |
| Silent recipe fallback | Reject | Masks invalid source and provenance |
| Silent brand-color correction | Reject | Misrepresents operator intent |
| Studio-only design renderer | Reject | Can diverge from generated site |

## 43. PM2 completion handoff

With #165 and this contract accepted, PM2 is complete at the **contract level**.

The next implementation should **not** immediately attempt the whole flagship Studio.

The highest-value bounded implementation phase is a **v2 semantic foundation prototype** that proves:

- v2 parser/serializer;
- ownership classification;
- v1 migration;
- semantic design tokens/recipes;
- responsive inheritance resolver;
- stable page/component/resource Canvas projection;
- public-only synthetic venue;
- no runtime/production behavior change.

Only after that foundation is accepted should the renderer and Studio begin consuming v2 source.

## 44. Final decision

~~~text
PM2B_DESIGN_SYSTEM =
SEMANTIC_TOKENS
+ CURATED_GLOBAL_RECIPES
+ COMPONENT_RECIPE_REGISTRY
+ BOUNDED_RESPONSIVE_INHERITANCE

DESIGN_STATE_CANONICAL_SOURCE_STATE = YES
STARTER_REMAINS_HIDDEN_AUTHORITY = NO

COLOR_ROLE_EXPANSION = YES
TYPOGRAPHY_ARBITRARY_FONT_CONTROL = NO
TYPOGRAPHY_CURATED_RECIPE = YES
SPACING_ARBITRARY_NUMERIC_CONTROL = NO
DENSITY_RECIPE = YES
SHAPE_RECIPE = YES
SURFACE_RECIPE = YES

MEDIA_STABLE_ASSET_REFERENCE = YES
MEDIA_USAGE_ALT_DECORATIVE_STATE = YES
MEDIA_FOCAL_POINT_NORMALIZED = YES
MEDIA_ARBITRARY_OBJECT_POSITION = NO

COMPONENT_RECIPE_STABLE_ID = YES
RECIPE_UNKNOWN_FALLBACK = NO

RESPONSIVE_MODEL =
DESKTOP
-> TABLET
-> MOBILE

RESPONSIVE_SHARED_CONTENT_TREE = YES
RESPONSIVE_SHARED_SEMANTIC_ORDER = YES
RESPONSIVE_RESET_TO_INHERITED = REQUIRED
CUSTOM_BREAKPOINTS_INITIAL_V2 = NO
ARBITRARY_VIEWPORT_HIDE_SHOW = NO
INDEPENDENT_MOBILE_TREE = NO

RAW_CSS_AUTHORITY = NO
RAW_STYLE_JSON_AUTHORITY = NO
ARBITRARY_CLASSES = NO

V1_THEME_VALUES_PRESERVED = YES
V1_DETERMINISTIC_RECIPE_DEFAULTS = YES
LEGACY_V1_COMPATIBILITY_RECIPE_ALLOWED_IF_NEEDED = YES

SAME_TEMPLATE_RECOLOR = FAIL
MARKETING_GRADE_HUMAN_REVIEW = REQUIRED
IMPLEMENTATION_AUTHORIZED_BY_THIS_DOCUMENT = NO
~~~
