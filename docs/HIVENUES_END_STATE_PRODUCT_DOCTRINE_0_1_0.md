# HiVenues — End-State Product Doctrine 0.1.0

```text
DOCUMENT = HIVENUES_END_STATE_PRODUCT_DOCTRINE
VERSION = 0.1.0
STATUS = CANONICAL / FROZEN END-STATE DOCTRINE
SCOPE = PRODUCT NORTH STAR, EXPERIENCE, DOMAIN, PLATFORM, QUALITY, GOVERNANCE
IMPLEMENTATION = SUBORDINATE TO THIS DOCTRINE
CURRENT_IMPLEMENTATION = NOT DEFINITIONAL
AMENDMENT = EXPLICIT DOCTRINE REVISION ONLY
```

## 0. Why this document exists

HiVenues has crossed enough phases, prototypes, successors, visual systems, architecture experiments and qualification programs that implementation gravity itself has become a product risk.

A feature that exists can start to look like a requirement. A limitation that survives several phases can start to look intentional. A browser test can pass while the product drifts away from the thing it was meant to become.

This document exists to prevent that.

It defines the **end product**, not the current implementation. It is the governing reference for future product design, architecture, milestones, visual reviews, Project Lead decisions, beta prompts and first-customer gates.

No implementation phase may silently redefine HiVenues merely because the current code makes another direction easier.

Where a current issue, branch, test, architecture note or implementation conflicts with this doctrine, the conflict must be surfaced and adjudicated explicitly. It may not be resolved by quietly narrowing the doctrine to fit the implementation.

Earlier frozen Candidate C contracts remain authoritative for their bounded technical decisions where they do not conflict with this higher-level end-state doctrine.

---

# Part I — The product

## 1. North Star

### Internal doctrine

> **The host’s world becomes the interface to Hive.**

### Product definition

> **HiVenues is a premium, host-first frontend factory for Hive.**

It enables a real-world or digital host to create and operate a distinctive, mainstream-quality digital territory of its own while Hive quietly supplies portable identity, social, content, community and economic primitives underneath.

### End-state promise

> **A place of your own, with participation that can travel.**

### Consequence doctrine

> **Metaphor at the experience layer. Truth at the consequence boundary.**

The host may radically customize how an action looks, sounds and feels. HiVenues may translate a primitive into the host’s vocabulary and visual culture. The underlying consequence, authority and value movement must remain exact.

These four statements are not slogans. They are decision rules.

---

## 2. HiVenues is not fundamentally a venue website builder

Venues are an excellent first proving ground because they combine identity, place, activities, offers, visitors, community, media and potential economic/social participation.

But the long-term product is broader.

A **host** may be:

- a bar, restaurant, café or hospitality business;
- a concert venue, theater, gallery or club;
- a musician, band, comedian, streamer, influencer or independent creator;
- a publication, podcast, collective or media project;
- a conference, festival, event series or recurring program;
- a nonprofit, organization, association or community;
- a gaming group, online community or creator-led membership space;
- a sports club, neighborhood institution, local business or other host category not yet named.

The product model must therefore generalize around **host identity and meaningful domain objects**, not around assumptions specific to bars, restaurants, physical venues or any one first customer.

Fourth Street Bar is the first real customer and an important proving case. It is not the definition of the platform.

---

## 3. HiVenues is a frontend factory

“Frontend factory” means more than generating pages.

HiVenues should be able to produce many substantially different public applications from one semantic platform while preserving truth, quality, responsive behavior, accessibility, durable identity and safe operation.

The factory supplies:

- the semantic model;
- composition systems;
- high-quality rendering;
- responsive behavior;
- accessibility constraints;
- media treatment;
- activity and offer semantics;
- Voice / terminology translation;
- participation mechanics;
- Hive/provider bindings;
- draft/release/history safety;
- portable output and standards where appropriate;
- a visual Studio through which a nondeveloper controls all of the above.

The host supplies:

- identity;
- facts;
- real media;
- story;
- activities;
- offers;
- language;
- brand direction;
- desired visitor behavior;
- optional Hive/community/provider bindings;
- the social and cultural meaning of the experience.

The factory does **not** mean “one template plus configuration.”

It means one semantic system capable of producing multiple distinct host worlds.

---

# Part II — The public experience

## 4. The host must dominate the experience

The first impression should answer:

> “Whose world am I in, and what can I do here?”

It should not answer:

> “Which website builder or blockchain platform generated this?”

Visitors should encounter the host, not HiVenues.

Visitors should not be presented with generic HiVenues chrome, blockchain vocabulary, Web3 dashboard patterns, developer terminology, provider terminology, internal object names or platform-centric navigation unless a specific consequence genuinely requires disclosure.

The ideal HiVenues public product becomes nearly invisible as a brand and highly visible as capability.

A successful Fourth Street visitor thinks “Fourth Street Bar.”

A successful musician visitor thinks “this artist.”

A successful publication visitor thinks “this publication.”

They do not think “this is a HiVenues template.”

---

## 5. A HiVenue is a digital territory, not merely a brochure

A professional brochure site is a valid intermediate state and may be the correct first published state for a sparse host.

It is **not the full HiVenues thesis**.

The mature product should support a host-specific application in which content, activities, participation, community and optional economic behavior belong naturally inside the host’s world.

The public experience may include, depending on the host:

- identity and story;
- visit/presence information;
- activities and durable activity pages;
- offers or standing propositions;
- media and releases;
- feeds or editorial content;
- conversations or responses;
- accountless participation;
- host-native social actions;
- communities or membership concepts;
- support/tip/value relationships;
- schedules/calendars;
- galleries/catalogs;
- external reservations/tickets/commerce;
- Hive-backed portable participation when appropriate.

No individual host needs every capability.

The platform’s job is to make the **right subset** feel native to that host rather than forcing every host into one universal dashboard.

---

## 6. Host differentiation must be structural

Different hosts must not merely swap:

- logo;
- accent color;
- hero image;
- heading font.

Meaningful differentiation should be available through composition-appropriate variation in:

- navigation model;
- information architecture;
- hero grammar;
- media placement and crop strategy;
- typography scale and hierarchy;
- section grouping and ordering;
- density and whitespace;
- rhythm and pacing;
- activity treatment;
- offer treatment;
- story treatment;
- visit/contact treatment;
- calls to action;
- interaction placement;
- Voice / terminology;
- iconography and metaphors;
- motion character where appropriate;
- mobile behavior;
- footer/identity treatment;
- treatment of sparse versus rich content.

A useful blind test is:

> If five unrelated hosts use HiVenues, can an ordinary visitor immediately tell that the same template engine made all five?

If yes, HiVenues has not yet reached its intended level of differentiation.

---

## 7. Composition families, not themes

HiVenues uses **composition families** as structural design systems.

A composition family defines a different grammar for presenting the same canonical truth.

A family can govern:

- hierarchy;
- page roles;
- navigation;
- hero treatment;
- activity-list treatment;
- media roles;
- section relationships;
- bounded placement rules;
- typography behavior;
- mobile behavior;
- accessibility landmark/heading plans;
- activity-page recipes;
- sensible behavior when data is sparse or absent.

Poster, Editorial and Hospitality are early examples, not the final catalog.

A family must be structurally recognizable without reading its label.

If two families have the same information architecture and DOM hierarchy with only typographic/color differences, they are themes, not sufficiently differentiated composition families.

Composition changes must never delete canonical host content merely because one family lacks a convenient slot.

---

## 8. Recipes, not slot-filling templates

A conventional template says:

> “Here is a fixed page. Put content into these boxes.”

A HiVenues recipe should instead ask:

> “Given this host, these facts, these activities, these offers, these assets and this direction, what is the strongest truthful composition we can produce?”

Recipes should adapt to content availability.

Examples:

- a host with no Activities should not expose an empty event rail that makes the site look unfinished;
- a host with no menu should not look broken because a restaurant template expects one;
- an online-only creator should not inherit a physical-venue visit hierarchy;
- rich real photography should change the media strategy;
- sparse source material should produce intentional simplicity rather than placeholder emptiness;
- one exceptional Activity may deserve a different composition than twenty recurring Activities.

The canonical semantic model remains stable. The recipe determines the best presentation of what actually exists.

---

## 9. Real media is authoritative

Real host media should generally outrank generated bootstrap imagery once supplied.

Generated/procedural imagery can be useful for:

- first-draft momentum;
- abstract direction;
- backgrounds/textures;
- truthful non-documentary art where the host has no assets.

It must not fabricate documentary facts.

HiVenues must not invent:

- people;
- crowds;
- customer quotes;
- attendance;
- menu items;
- prices;
- events;
- venue features;
- popularity;
- provider state;
- documentary photographs presented as real.

Real media should feel authored into the composition through crop, scale, rhythm, sequencing, overlays, galleries, focal treatment and relationship to typography—not merely dropped into generic cards.

---

# Part III — Hive as infrastructure

## 10. Hive is foundational to the platform, but it should not dominate the surface

HiVenues is not a generic website builder that happens to offer an optional Hive plugin.

Its strategic identity is Hive-native.

Hive can provide portable primitives such as:

- identity;
- authorship;
- durable public content;
- social relationships;
- community membership;
- conversation;
- public recommendation/voting;
- rewards;
- value transfer;
- portable participation across independently branded frontends.

However, **a specific host does not need to connect Hive before it can create a credible HiVenue**.

Accountless first-run and provider-local degradation remain first-class principles.

The product-level architecture is Hive-native. The individual host experience may begin unbound and progressively gain Hive-backed capabilities when they are useful.

This resolves an important distinction:

- **Hive is foundational to what HiVenues can become.**
- **Hive connection is not a prerequisite for every host’s first useful website or every visitor’s first useful interaction.**

---

## 11. Translate primitives into host-native experience

Raw primitives should usually not be the visitor-facing product language.

A generic interface may expose concepts such as:

- follow;
- vote;
- comment;
- community subscribe;
- transfer;
- tip;
- voting capacity;
- account;
- token balance.

HiVenues should allow these to be presented through host-native language and visual metaphor.

Founding example:

- a bar may represent a vote through a beer-mug metaphor;
- available voting capacity/influence may be represented through a pitcher metaphor.

Other hosts may choose entirely different metaphors.

A musician might use “Encore.”

A publication might use “Recommend.”

A creator community might use “Send a spark.”

The terminology is not the mechanic.

The system must preserve:

> **Semantic freedom at the experience layer; mechanical truth at the consequence layer.**

---

## 12. Voice is first-class product data

Voice is not a bag of copy strings.

It is the semantic translation layer between canonical mechanics and the host’s social world.

A stable Mechanic should define the actual consequence, including as appropriate:

- meaning;
- authority class;
- whether signing is required;
- whether value moves;
- whether the action is public;
- reversibility/idempotency expectations;
- required provider/binding;
- degraded behavior;
- truthful disclosure.

Voice may then define a host-native Term and presentation:

- label;
- explanatory copy;
- tone;
- icon;
- metaphor;
- visual treatment.

Voice cannot silently remap one mechanic to another.

Do not conflate:

- follow account with community subscription;
- vote with tip;
- RSVP with purchase;
- reserve with pay;
- save/remind with calendar subscription;
- recurring support with membership.

A semantic mechanic change requires explicit review.

---

## 13. Identity should be portable and progressive

A visitor should be able to encounter value before understanding Hive.

A useful progression is:

> **browse → participate → identify → carry identity elsewhere**

Ordinary browsing must be accountless.

Suitable actions should remain accountless or external when truthful, including for example ordinary links, ICS, RSS, local RSVP or external ticketing/reservation flows.

When a genuinely Hive-backed capability requires identity/signing, HiVenues should introduce that requirement **at the point of consequence**, not as an opening “connect wallet” gate.

The visitor should not need to adopt blockchain vocabulary merely to use a host’s site.

---

## 14. Signing, payments and other external effects are authority boundaries

Presentation intent is not execution authority.

The Studio may allow an operator to configure how an action looks and what it means socially.

The system must separately know:

- what consequence is intended;
- which provider/binding supplies it;
- whose authority is required;
- whether signing is necessary;
- whether value moves;
- how partial failure/idempotency works.

Website Release must never implicitly:

- broadcast Hive content;
- vote/comment/follow;
- sign transactions;
- move HIVE/HBD;
- claim rewards;
- upload external media;
- mutate provider state;
- Podping;
- deploy infrastructure;
- change DNS/VPS state.

Consequential external operations require explicit workflows and review appropriate to their risk.

---

# Part IV — Canonical semantic model

## 15. One canonical host graph; many faithful projections

The durable host model is semantic, not a page document.

The same canonical state should power:

- Studio;
- public rendering;
- mobile rendering;
- preview;
- release review;
- Activity pages;
- RSS/feed output where applicable;
- ICS output where applicable;
- future Hive/provider consequences;
- migration/export/interoperability where supported.

Canvas, tree, inspector, mobile preview and public website must not become independent sources of truth.

The product should have **one semantic model, one rendering authority, many projections**.

---

## 16. Durable semantic planes

The end-state model should preserve durable concepts at least equivalent to:

1. **Identity** — HiVenues-owned host identity, display name, stable URLs/slug history, timezone, archetype/direction basis.
2. **Facts** — summary, presence facts, address/hours/contact/links where applicable.
3. **Activities** — durable time/lifecycle-bearing objects.
4. **Offers** — standing propositions that do not naturally belong to Activity lifecycle semantics.
5. **Series / groupings** — durable relationships among Activities or content when useful.
6. **Media** — durable asset identity, provenance, dimensions, alt policy, provider references and roles.
7. **Voice** — typed Mechanic→Term translation plus host nouns and tone guidance.
8. **Presentation** — composition family, brand tokens, bounded structural parameters and placement.
9. **Bindings** — provider-neutral social/content/media/value/commerce/discovery bindings and authority policy.
10. **Intent / Direction basis** — high-level product intent used for guided creation and later direction changes.
11. **Release history** — immutable/reconstructible snapshots orthogonal to page presentation.

Exact schemas may evolve. These semantic separations should not be collapsed for implementation convenience.

---

## 17. HiVenues owns host and Activity identity

Host identity and Activity identity must remain stable independently of providers or presentation.

The following must not become canonical identity merely because an integration exists:

- Hive account;
- Hive community id;
- author/permlink;
- 3Speak/SPK id or CID;
- payment memo/invoice;
- map/discovery record;
- provider account/session;
- slug/title/date.

Provider identity is a binding to the host, not the host itself.

Changing composition must not re-mint host identity.

Rescheduling an Activity must not create a new Activity.

---

## 18. Activities and Offers are first-class objects

Activities are not decorative cards embedded in pages.

A mature Activity may carry:

- durable identity;
- schedule/timezone;
- presence;
- lifecycle state;
- reschedule history;
- media;
- access/capacity semantics;
- participation actions;
- series/grouping;
- public Activity page;
- ICS representation;
- future social-root/provider bindings;
- cancellation/completion state;
- observations distinct from asserted facts.

Offers are sibling domain objects for standing propositions such as:

- memberships;
- menu/catalog propositions;
- evergreen booking packages;
- standing reservation opportunities;
- merchandise/support propositions;
- other propositions without meaningful Activity lifecycle semantics.

UI may group them for simplicity. Domain semantics should remain distinct.

---

## 19. Presentation references domain objects; it does not own them

Removing an Activity from one composition slot cannot delete the Activity.

Changing Direction cannot delete canonical story, media, Offers or Activities.

A presentation that cannot place an object must preserve and expose that unplaced object rather than silently destroy it.

This rule is essential to creative freedom: operators should be able to try a radically different visual direction without risking loss of the host itself.

---

# Part V — The Studio

## 20. Studio is a professional creative product

The Studio should feel closer in quality and confidence to leading modern creative tools than to a CMS/admin panel.

Webflow, Wix, Squarespace and other commercial builders may be studied for useful interaction/quality signals. They are **reference points, not imitation targets**.

HiVenues should develop a distinct interface appropriate to semantic host authoring and Hive-native consequences.

The Studio should be:

- visual;
- direct;
- contextual;
- calm;
- reversible;
- responsive;
- truthful;
- nondeveloper-native;
- safe around consequential actions.

The operator should spend most of their time looking at the thing they are making.

---

## 21. Canvas first

The rendered experience is the primary workspace.

The Studio should not be a long admin form with a preview attached.

The operator should be able to select meaningful objects directly in the rendered experience and immediately understand what can be changed.

Examples:

- select a title → edit the title;
- select an image → replace/crop/focal/alt/caption;
- select an Activity → edit the Activity;
- select a section → inspect composition-aware controls;
- select a host action → inspect its Voice and consequence;
- select host identity → edit relevant identity/presentation fields.

Canvas, semantic structure/tree and contextual inspector should synchronize around the same canonical entity.

---

## 22. Studio shell end state

A mature desktop Studio should support a coherent workspace equivalent in function to:

### Global/product layer

- host/workspace identity;
- undo/redo;
- saved/draft/live status;
- responsive mode;
- preview/review/release;
- important conflict/status notices.

### Structural/navigation layer

Semantic navigation such as:

- Page / content structure;
- Activities / Offers;
- Site-level lenses.

Deeper site lenses may include:

- Direction;
- Look;
- Voice;
- Connect;
- Details;
- History.

### Canvas

A large real rendered canvas using the same rendering authority as public output.

### Contextual controls

One primary inspector/panel/sheet at a time, populated because a meaningful entity or task is active.

A large permanently empty inspector is not an acceptable end state.

A complete visitor review should be available without turning the normal editor into two entire websites stacked vertically.

---

## 23. Direct manipulation with smart constraints

HiVenues should support direct manipulation where it improves creative work:

- selecting;
- reordering permitted semantic sections;
- media focal/crop gestures;
- bounded alignment/density choices;
- drag/drop of semantic components where appropriate;
- contextual insertion of typed content.

But HiVenues is **not Figma in a browser**.

It is not an unrestricted pixel canvas.

The system should protect:

- responsive coherence;
- typography quality;
- spacing systems;
- accessibility;
- semantics;
- composition integrity;
- structured data;
- mobile behavior.

Creative freedom should operate through **semantic objects and strong recipes**, not arbitrary DOM/CSS authority.

---

## 24. No raw-code escape hatch as the normal product

An ordinary operator should never need:

- HTML;
- CSS;
- JavaScript;
- JSON;
- database editing;
- filesystem paths;
- repository knowledge;
- CLI commands;
- Hive RPC knowledge;
- provider internals.

Specialist diagnostics may expose stable ids, provenance or conflict information when useful.

They must remain subordinate to the creative workflow.

An authoring task that requires developer knowledge is a product gap, not an acceptable power-user workflow.

---

## 25. Progressive disclosure

The default Studio should make the common path obvious:

- edit content;
- use real media;
- manage Activities/Offers;
- shape presentation;
- preview responsive output;
- release safely.

Deeper controls should appear when needed:

- focal/crop;
- richer Activity settings;
- placement versus canonical-object scope;
- action destinations;
- responsive composition options;
- Voice consequence review;
- provider bindings;
- History/conflict detail.

Power should increase without making the default interface feel like a configuration console.

---

## 26. Responsive authoring is one product, not a squeezed desktop

HiVenues should maintain one canonical content/composition source across responsive states.

Mobile should not require maintaining a separate website.

Bounded responsive controls may include things such as:

- focal point;
- alignment;
- density;
- stacking preference;
- section emphasis;
- limited visibility where semantically justified;
- composition-specific mobile variants.

At native narrow widths, Studio itself must remain a deliberately designed product.

A mature mobile Studio should use interaction patterns appropriate to the device:

- one main workspace at a time;
- intentional compact navigation;
- contextual bottom sheets for small edits;
- full-screen tasks for long text, Activity creation, media and release review;
- explicit preview mode;
- no required hover, precision drag or permanent two-pane layout.

“Does not overflow horizontally” is not a sufficient mobile quality standard.

---

## 27. Guided creation is art direction, not technical setup

The ideal first-run journey asks human questions such as:

1. **Purpose** — what are you making and what should people do here?
2. **Presence & material** — where does it happen and what real material can we start with?
3. **Direction** — which structural/tonal direction feels closer, shown with the host’s actual material?
4. **Participation** — what should people be able to do next, in host-native language with truthful consequences?
5. **First draft reveal** — “Here is your place.” Nothing is public yet.

The setup preview is already the real working draft.

There should not be an export/import boundary or “basic mode” schema before entering Studio.

Direction remains revisitable later and must protect manual edits through exact provenance/conflict rules.

---

# Part VI — Safety, publishing and operation

## 28. Working version → reviewed Release → live site

HiVenues should make experimentation safe.

Ordinary validated edits update a durable working version after server acknowledgement.

The operator should understand:

- what is saved;
- what is unpublished;
- what is live;
- what a Release will change.

A Release is an immutable/reconstructible public website snapshot bound to an exact reviewed working version.

Website Release is separate from external Hive/provider effects.

---

## 29. History and restore

Release history should be trustworthy and immutable.

Restoring an older Release creates a **new working version** derived from that historical state.

Restore must not silently rewind the live website.

The operator must make a separate explicit Release decision before restored work becomes public.

History should support confidence and recovery without turning the default experience into a developer diff tool.

---

## 30. Undo, conflicts and stale state

A mature Studio should provide:

- Undo/Redo or equivalent safe reversal;
- exact revision/digest guards;
- stale edit protection;
- clear conflict explanation;
- safe recovery paths;
- no silent last-write-wins destruction of newer work.

Two browser tabs, delayed forms, restart and concurrency should not create ambiguous publication state.

---

## 31. Urgent live-first operations

Urgent cancellation/status operations are a special consistency boundary.

They should begin from the current **live Release**, apply only the dependency-closed urgent change, and leave unrelated unpublished work unpublished.

The review must make clear:

- what changes now;
- what stays live;
- what remains unpublished.

This is a core product-strength area and must not regress during visual or architecture work.

---

# Part VII — Providers, portability and degradation

## 32. Provider-neutral seams

HiVenues domain identity and semantics should remain upstream of providers.

Provider families may include equivalents of:

- social graph;
- content;
- signing;
- payments/value;
- commerce;
- media;
- notifications;
- discovery.

An outside provider may implement capability.

It should not become the canonical identity or schema of the host.

Provider failure should degrade locally where possible rather than corrupt unrelated host state.

---

## 33. Generated/public output remains a first-class artifact

HiVenues should not become a Studio whose output only exists as an opaque editor session.

The public product should have coherent semantic HTML and stable public identities/URLs.

Where appropriate, it should expose useful open standards such as:

- ICS;
- RSS/feed formats;
- structured metadata;
- canonical Activity URLs.

Portability should be preserved where reasonably possible.

This reduces platform dependence and aligns with the broader value of durable public web/Hive identity.

---

# Part VIII — Quality doctrine

## 34. A feature is not complete merely because it exists

HiVenues feature completion has at least four dimensions:

1. **Semantic correctness** — it does the truthful thing.
2. **Operational quality** — it is safe, durable and recoverable.
3. **Interaction quality** — a normal operator can discover, understand and use it.
4. **Visual/product quality** — it looks and feels worthy of a premium 2026 product.

Failure in any one dimension means the feature is not truly finished.

This rule applies to the Studio and public output independently.

Automated green checks cannot substitute for visual/product judgement.

Visual attractiveness cannot substitute for semantic truth or operational safety.

---

## 35. Commercial visual standard

A generated HiVenue should be credible beside strong contemporary independent websites in its category.

Expected qualities include:

- excellent typography;
- intentional hierarchy;
- real-media integration;
- strong mobile composition;
- coherent navigation;
- polished empty/sparse states;
- thoughtful pacing;
- responsive integrity;
- accessible contrast/interaction;
- purposeful micro-interaction where valuable;
- no generic SaaS residue;
- no visible blockchain-dashboard residue.

The Studio itself must meet a comparable standard as a creative product.

A beautiful public site does not excuse an unfinished Studio.

A beautiful Studio does not excuse templated public output.

Both must pass independently.

---

## 36. Accessibility, performance and truthful degradation are quality, not cleanup

Accessibility is part of composition design, not a post-processing check.

Responsive performance and semantic HTML are part of the public product, not engineering afterthoughts.

Provider-degraded states should remain understandable and locally useful where possible.

No visual direction is acceptable if it requires sacrificing:

- keyboard/focus correctness;
- screen-reader semantics;
- contrast;
- responsive integrity;
- reliable loading;
- truthful state/consequence disclosure.

---

# Part IX — Fourth Street and first-customer proof

## 37. What Fourth Street must prove

The successful Fourth Street outcome is not:

> “HiVenues generated a nice dark website for a bar.”

It is:

> **“Fourth Street Bar now has a digital territory that feels like Fourth Street Bar, and HiVenues gives that territory capabilities a normal brochure site would not naturally possess.”**

Its real atmosphere, distressed branding, documentary photography, location/contact facts and community identity should dominate.

HiVenues and blockchain should recede.

No unknown venue fact may be fabricated to make the design richer.

Sparse truth must still look intentional.

Fourth Street is the first real customer test of whether the general product can become genuinely specific without customer-specific source hacks.

---

# Part X — Explicit anti-goals

## 38. HiVenues must not drift into these products

### Not a generic SaaS template factory

If sites differ mainly by logo, color and hero image, the product has drifted.

### Not Squarespace/Webflow/Wix imitation

Commercial builders are useful references for polish and interaction patterns, not product definitions.

### Not a generic CMS/admin dashboard

The primary Studio experience is visual and contextual, not a collection of database forms.

### Not a raw blockchain frontend

Hive primitives belong underneath host-native presentation.

### Not a Web3 wallet-first application

Public value must be visible before identity/signing requirements.

### Not an unrestricted Figma/Webflow clone

No arbitrary pixel canvas, arbitrary DOM tree, unrestricted CSS/JS or raw-page topology as the normal authoring model.

### Not “blocks everywhere”

Generic blocks cannot become the core semantic model.

### Not brochure-only as the final ceiling

A brochure can be an intermediate host state. It is not the complete strategic thesis.

### Not provider-locked

Provider identifiers/configuration must not replace canonical host semantics or identity.

### Not developer-authored in disguise

Source editing, JSON, CLI work or implementation coaching cannot be required for normal authoring.

### Not feature-count driven

Do not ship weak versions of many features merely to enlarge a capability checklist.

### Not test-driven product definition

Tests protect contracts. They do not define whether the product feels finished.

### Not customer-hacked

Fourth Street-specific assumptions, prose or layout logic must not leak into the generic product.

---

# Part XI — Success tests

## 39. The five-host test

Imagine five hosts:

- Fourth Street Bar;
- an independent musician;
- an online publication;
- a neighborhood art gallery;
- a gaming/creator community.

They should produce five different digital worlds.

Underneath, they may share:

- identity primitives;
- social relationships;
- content systems;
- activities;
- participation mechanics;
- community primitives;
- value/economic primitives;
- release/history infrastructure.

The shared platform should be obvious to maintainers and largely invisible to visitors.

---

## 40. The nondeveloper test

A capable nondeveloper should be able to:

- create a host;
- supply truthful material;
- choose and revise direction;
- edit content/media;
- create and maintain Activities/Offers;
- understand responsive output;
- understand consequences;
- preview;
- release;
- recover from mistakes/conflicts;
- maintain the site over time;

without needing repository access, source edits, raw JSON, CLI intervention or Project Lead coaching.

---

## 41. The visitor test

A visitor should be able to:

- understand whose world they are in;
- understand the host’s purpose;
- find the next relevant action;
- browse without a Hive account;
- encounter Hive-backed participation only when useful;
- understand consequential actions truthfully;
- use the experience comfortably on desktop and mobile;
- avoid seeing generic HiVenues/blockchain/admin concepts unless necessary.

---

## 42. The blind-origin test

Show several generated sites to a person who does not know HiVenues.

If their first reaction is:

> “These are all the same site builder template,”

we have not reached the goal.

If their reaction is:

> “These feel like different organizations/creators with their own sites,”

while the platform still preserves shared semantics and operational safety, the frontend-factory thesis is working.

---

## 43. The consequence-truth test

For every host-native metaphor or renamed action, the system must be able to answer exactly:

- what does this actually do?
- does it require identity/signing?
- does it create public state?
- does value move?
- which provider supplies it?
- what happens if that provider is unavailable?

If the visible metaphor cannot be traced to an exact consequence, it is not acceptable HiVenues behavior.

---

## 44. The final end-state test

> **Can a nondeveloper take a real host, use HiVenues to create a digital experience that looks and behaves unmistakably like that host, publish and maintain it safely, and expose useful Hive-powered participation without the visitor feeling that they are using a blockchain product or a generic site builder?**

If yes, HiVenues is succeeding.

If the output looks like a HiVenues template, we have failed.

If Studio looks like an admin console, we have failed.

If Hive becomes the visual identity, we have failed.

If normal customization requires raw code, we have failed.

If visual freedom destroys semantic truth, mobile quality or accessibility, we have failed.

If the host’s identity and world dominate while Hive quietly makes that world more capable and portable, **that is the product**.

---

# Part XII — Governance against drift

## 45. Doctrine precedence

This document defines the intended end state.

Future decisions must distinguish:

- **doctrine** — what the product is ultimately meant to be;
- **current scope** — what a bounded phase is attempting now;
- **current implementation** — what the code currently supports;
- **qualification** — what evidence proves about that implementation.

Current implementation constraints must not be promoted into doctrine by repetition.

A phase may intentionally implement only a subset of the doctrine. It must label that limitation honestly rather than redefining the end goal downward.

---

## 46. Mandatory doctrine check for major work

Before approving a major phase, visual direction, architecture choice or first-customer gate, Project Lead should ask:

1. Does this make the host more dominant or HiVenues more dominant?
2. Does it increase structural differentiation or template sameness?
3. Does it strengthen semantic authoring or push toward arbitrary page configuration?
4. Does it translate Hive capability or expose blockchain mechanics?
5. Does it make Studio more visual/contextual or more admin/configuration-driven?
6. Does it preserve one canonical semantic truth?
7. Does it preserve consequence truth and authority boundaries?
8. Does it improve both desktop and mobile quality?
9. Does it preserve release/conflict/history safety?
10. Would a nondeveloper reasonably understand it?
11. Does it look and feel like a premium contemporary product?
12. Does it move HiVenues toward a frontend factory rather than a nicer template builder?

A major change that fails these questions requires explicit justification or rejection.

---

## 47. Amendment rule

This doctrine may evolve as the product is genuinely learned.

But amendments must be deliberate.

Changing the doctrine requires:

- a versioned revision;
- an explicit statement of what changed;
- the evidence/reason for the change;
- acknowledgement of downstream contracts that are superseded or affected.

No issue, implementation PR, beta finding or temporary architecture limitation may silently amend this document.

---

## 48. Current program implication

At the time this doctrine is frozen:

```text
FUNCTIONAL_REMEDIATION = QUALIFIED
PRE_ASTRA_VISUAL_CONVERGENCE = ACTIVE
ASTRA_FULL_PRODUCT_REGRESSION = HOLD
FOURTH_STREET_FIRST_CUSTOMER = HOLD
```

The next visual-convergence work must be judged against this doctrine, not merely against the appearance of the current Candidate C implementation.

The independent Astra regression should only begin after Project Lead can reasonably state that the candidate already resembles the intended HiVenues product closely enough for beta testing to reveal non-obvious operator/product failures rather than obvious unfinished design work.

---

# Final North Star

> **HiVenues enables a host to create and operate a distinctive, premium digital territory of its own, with Hive quietly supplying portable capabilities underneath, through a Studio that feels as sophisticated and creative as the public experience it produces.**

And the shortest internal formulation remains:

> **The host’s world becomes the interface to Hive.**
