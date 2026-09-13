# HiVenues Next-Generation Executable Slice Contract 0.1.0

Status: **FROZEN IMPLEMENTATION CONTRACT**  
Scope: **LOCAL, READ-ONLY, NON-PRODUCTION V3 EXECUTABLE SLICE**  
Baseline commit: `f2b1ca995d02a5e276a3dd91235e92b1693da921`  
Baseline tree: `792c6dbc70d11067952c4ec85af24ae783d92514`

## 1. Purpose

This contract converts the accepted next-generation HiVenues product doctrine into the first falsifiable executable slice.

The slice is deliberately narrower than a production successor. Its job is to answer one high-information question before broader implementation proceeds:

> Can one strict schema-v3 source model and one generic renderer express materially different real-world venue archetypes, while preserving the new activity/social-continuation semantics, without venue-specific runtime branches, free-form escape hatches, or a regression into copy-swapped templates?

A passing slice is evidence that the accepted doctrine has an executable general form. A failing slice is a reason to revise the schema, renderer contract, or product doctrine before building Studio, migration, or production bindings around it.

## 2. Controlling prior contracts

This contract is subordinate to the repository's accepted next-generation doctrine and contracts at the baseline above, especially:

- `docs/HIVENUES_PRODUCT_DOCTRINE_RECONCILIATION_0_1_0.md`
- `docs/HIVE_NATIVE_HOST_PRODUCT_CONTRACT_0_1_0.md`
- `docs/HOST_ACTIVITY_SOCIAL_OBJECT_CONTRACT_0_1_0.md`
- `docs/NEXT_GEN_ACTIVITY_SOURCE_AND_MIGRATION_CONTRACT_0_1_0.md`
- `docs/PM4_OPERATOR_GAP_V3_REAUDIT_0_1_0.md`

Where this file is narrower, the prior contract remains controlling outside this slice. This file does not silently relax any prior authority, security, migration, or product requirement.

## 3. Explicitly in scope

The first executable slice SHALL contain:

1. a strict v3 source validator/parser;
2. a deterministic canonical serializer/digest for validated v3 source;
3. one generic read-only v3 public renderer;
4. activity list and activity detail rendering for `event` and `program`;
5. explicit rendering of activity social-continuation states;
6. stable event/program detail routes;
7. exactly three synthetic reference archetypes used as falsification fixtures;
8. deterministic unit/integration tests proving the requirements below;
9. local preview capability sufficient for automated browser/DOM inspection without network, Hive RPC, signing, or writes.

The implementation SHOULD coexist beside v2 (`src/venue/v3/...`) rather than mutate the v2 runtime. V2 remains the rollback/reference authority until separately superseded under the migration contract.

## 4. Explicitly out of scope

This slice does **not** authorize or require:

- production deployment or production routing;
- mutation of Fourth Street Bar production state;
- Hive broadcasts or writes;
- Keychain signing or wallet mutation;
- Hive account onboarding;
- live Hive RPC reads;
- live community-feed resolution;
- payment execution or HBD transfer;
- Studio authoring, persistence, save, undo/redo, or operator workflow;
- v2-to-v3 migration execution or deletion of v2 fields/components;
- external booking, ticketing, calendar, media-hosting, or venue-service integrations;
- tenant authentication or operator authorization;
- durable server-side storage;
- production cutover decisions.

Any implementation that adds these to make the slice pass has exceeded authorization.

## 5. Frozen generality challenge

The slice SHALL prove the same implementation against three deliberately different synthetic archetypes:

### A. Bar / lounge

A hospitality/nightlife venue whose public experience is event-forward and whose activity example is an `event`.

The fixture SHOULD make event identity, visit information, atmosphere, and social continuation meaningful without requiring a Hive login for ordinary browsing.

### B. Restaurant / cafe

A food-service venue with a materially different information hierarchy from the bar/lounge.

It SHALL not be represented merely by replacing nouns and colors in the bar fixture. Its public composition SHOULD privilege food/menu/visit information while still exercising at least one eligible activity and social-continuation state.

### C. Workshop / service

A deliberately dissimilar non-nightlife archetype. The reference SHALL use a `program` activity (for example a recurring workshop/class/service program) rather than inventing a third activity type.

This fixture is the principal anti-overfitting control. If the schema or renderer needs a workshop-specific runtime escape hatch, the generality claim fails.

All venue names, addresses, media and external URLs in these fixtures must be synthetic or explicitly local test assets. Fixtures must not create a false claim of a real business or live integration.

## 6. Frozen v3 source identity

The executable model SHALL use:

- `schema_version: 3`
- `information_architecture_version: "next-gen-ia/1"`
- `resources.activities[]`

Activity types remain exactly:

- `event`
- `program`

This slice MUST NOT introduce `service`, `class`, `show`, `workshop`, `reservation`, or any venue-specific noun as a third activity type. Domain-specific detail belongs in typed `type_fields` or ordinary business/site semantics allowed by the v3 model.

The validator SHALL fail closed for at least:

- unknown root fields;
- unsupported schema or IA version;
- missing required fields;
- duplicate stable IDs;
- duplicate slugs within an activity type;
- unsupported activity types;
- invalid `generation`;
- invalid socialization state/ref pairing;
- model-specific activity fields placed outside `type_fields`;
- unknown component kinds;
- activity component references to missing IDs;
- activity-type/reference disagreement;
- raw HTML/CSS/style escape hatches;
- secret/private-key/token fields admitted anywhere in source.

Event and program MAY share the same slug because their canonical route families differ.

## 7. Frozen component and routing seam

The minimum executable component vocabulary for activity behavior is:

### `activity-list`

Allowed activity binding fields:

- `activity_type?`
- `activity_ids?`
- `limit?`

An item may omit a local activity type only when its parent list constrains type unambiguously. There is no source-order fallback for unresolved IDs.

### `activity-detail`

Required binding fields:

- `activity_type`
- `activity_id`

Canonical detail routes are:

- `/events/:slug` for `event`
- `/programs/:slug` for `program`

The renderer SHALL fail closed for a missing activity, wrong route family, or ambiguous lookup.

## 8. Social-object semantics

The activity's business facts remain the typed source of truth. The social continuation does not replace the activity page.

Each activity SHALL carry:

- `socialization.state`, one of `DISABLED`, `UNRESOLVED`, `LINKED`, `UNAVAILABLE`;
- `socialization.continuation_ref`;
- `generation`;
- `history_marker` as permitted by the controlling activity contract.

When a continuation reference is present it must use the accepted complete Hive-post identity shape. No renderer, fixture factory, parser, or test helper may fabricate a missing author/permlink in order to obtain a `LINKED` state.

The public detail surface SHALL keep business information and social status/action co-present. At minimum:

- `LINKED` exposes the human-language action **Continue discussion**;
- `UNAVAILABLE` exposes **Community discussion unavailable** while preserving the last valid identity as model data;
- `UNRESOLVED` exposes **Community discussion link not yet established**;
- `DISABLED` must not pretend that a continuation exists.

The first slice may render a safe deterministic URL for a valid linked Hive-post reference, but it SHALL NOT fetch or mutate Hive.

## 9. Hive-native but guest-readable rule

Passing the slice requires both of the following:

1. Hive/social continuation is structurally first-class in eligible activity semantics; and
2. ordinary public browsing of all three references works with no wallet, Hive account, signing extension, RPC request, or protocol knowledge.

Protocol-specific author/permlink mechanics may appear in machine-readable attributes or destination construction when needed, but ordinary visitor copy must use product language rather than exposing implementation jargon as the primary interaction model.

## 10. Support / payment polarity

If either word appears in this slice:

- **Support** means social appreciation/ranking behavior, never cash transfer.
- **Payment** means an explicit economic/checkout concept.

The slice is not required to implement either action. It MUST NOT use `Support` as a euphemism for payment, donation, HBD transfer, or ticket purchase.

## 11. Generic-runtime rule

The runtime implementation SHALL contain no behavior branch keyed to:

- venue ID;
- fixture ID;
- archetype name;
- the synthetic names chosen for the three references.

Tests SHALL inspect relevant runtime source and fail if any frozen fixture identity appears there.

Archetype variation must be represented through validated semantic source data, component composition, curated recipe/tokens, and legitimate typed fields.

A fixture-specific helper used only to construct test data is allowed; a fixture-specific renderer path is not.

## 12. Material visual/compositional diversity rule

The three references are not considered distinct merely because their colors, fonts, names, and copy differ.

For this first slice, tests SHALL establish structural diversity through source and rendered output. Across the three references there must be materially different combinations/order of semantic components and at least two distinct presentation recipes or equivalent semantic design choices.

The workshop/service reference must differ from the bar/lounge in information architecture, not merely styling. The restaurant/cafe must expose a food/menu-oriented business destination or equivalent semantic composition absent from the workshop/service reference.

No free-positioning, arbitrary CSS, raw style objects, raw HTML, or venue-specific stylesheet is permitted as the mechanism for meeting this rule.

This is a machine-checkable floor, not final visual-quality acceptance. Human/browser visual qualification remains a later gate.

## 13. One-source responsive rule

Desktop and mobile output SHALL derive from the same validated semantic source instance. A fixture may contain bounded semantic responsive overrides only if those are part of the accepted source contract; it may not provide a second mobile source tree or archetype-specific mobile renderer.

The first slice SHALL include responsive/accessibility guardrails sufficient to prove:

- one main landmark;
- one page-level `h1` on rendered reference pages/details;
- semantic links/buttons for actions;
- visible/focusable interaction targets represented in markup;
- no intentional horizontal-layout dependency at narrow viewport CSS rules;
- reduced-motion guardrail if motion is introduced.

Full accessibility certification remains out of scope and must not be claimed from this slice alone.

## 14. Determinism and non-mutation

For a validated source:

- canonical serialization is deterministic;
- digest is deterministic;
- rendering does not mutate source;
- equivalent parsed source yields equivalent canonical serialization and digest;
- renderer output for a given source/route is deterministic except for explicitly excluded volatile data, of which this slice defines none.

The source returned by the validator SHOULD be deeply frozen, matching the repository's existing defensive source-model discipline.

## 15. Required tests

At minimum, the implementation candidate SHALL add tests that demonstrate:

1. all three frozen archetype fixtures pass the same v3 parser;
2. malformed v3 sources fail for each strictness class in section 6;
3. one generic renderer renders all three references with no fixture/venue identity branches;
4. all three produce distinct source digests;
5. event and program routes resolve independently and permit the same slug across types;
6. missing/wrong-type detail references fail closed;
7. `activity-list` binds stable IDs and never falls back to source order;
8. each socialization state renders the required human-language behavior without network access;
9. `LINKED` requires an exact valid continuation reference;
10. business detail remains present when social continuation is `LINKED` or `UNAVAILABLE`;
11. rendering escapes untrusted text and does not admit script/raw HTML through content;
12. the three references satisfy the material compositional-diversity floor;
13. source/digest/rendering are deterministic and non-mutating;
14. local preview requests incur zero Hive RPC attempts and zero writes by construction;
15. existing v2 tests continue to pass unchanged.

The normal repository `npm test` command includes every top-level `test/*.test.js`, so v3 tests SHALL live under that existing executable test seam unless a later contract explicitly changes the test topology.

## 16. CI qualification

A candidate is not qualified merely because focused v3 tests pass locally.

Before merge, the candidate must pass the repository's normal deterministic CI quality gate on both Ubuntu and Windows. If changed-path classification selects the visual-acceptance job, that job must also pass or the candidate remains unqualified.

The first implementation must not weaken, skip, special-case, or delete existing tests/CI gates to obtain a pass.

## 17. Falsification criteria

The executable generality claim is **FAILED** if any of the following is required to make the three references work:

- a runtime branch keyed to a venue/archetype/fixture identity;
- a third activity type created solely for the workshop/service reference;
- raw CSS/HTML/free-position escape hatches in source;
- model-specific activity fields outside `type_fields`;
- separate mobile source trees;
- social identity fabrication;
- replacement of business detail by the social thread;
- a Hive account/wallet/signature requirement for ordinary browsing;
- support/payment ambiguity;
- disabling strict validation for one archetype;
- falling back to source order when stable references fail;
- representing all three references as the same component structure with only copy/theme substitution.

A failure under this section is an informative product/model result. It must be reported rather than hidden behind an exception.

## 18. Pass condition and next boundary

The first v3 executable slice is **QUALIFIED** only when:

- sections 5 through 17 have executable evidence;
- the full repository deterministic CI gate is green on its required platforms;
- no production or privileged boundary has been crossed;
- v2 remains intact and available;
- exact commit/tree identity is recorded.

Qualification of this slice authorizes neither production transition nor Studio work automatically.

If the slice passes, the next planned operation is the already accepted sequence: Studio source IA around the same v3 source, then explicit v2→v3 migration/round-trip and deletion-condition work, followed by unresolved browser/accessibility/visual-domain closure. Those remain separate evidence gates.

If the slice fails, Project Lead SHALL stop expanding downstream v3 surfaces and first adjudicate the failed schema/product assumption.

## 19. Implementation target

Subject to the falsification criteria above, the preferred initial file boundaries are:

```text
src/venue/v3/source.js
src/venue/v3/renderer/index.js
test/support/v3-renderer-fixture.js
test/venue-v3-source.test.js
test/venue-v3-renderer.test.js
```

Additional local fixture/media files may be added when necessary, but the implementation SHALL not use file proliferation to conceal venue-specific runtime forks.

---

**Frozen Project Lead decision:** proceed from this contract directly into the bounded local/read-only executable slice. Do not implement Studio, production routing, Hive mutation, or external integrations until this slice has produced evidence about generality.