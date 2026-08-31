# HV-7 Second Venue Nominee — Juniper Works Cooperative
# Product Definition and Frozen Requirement Packet 0.1.0

## 0. Status

```text
OPERATION = HV7_ADVERSARIAL_SECOND_VENUE_CANDIDATE_DESIGN__READ_ONLY
ROLE = PROJECT_LEAD_PRODUCT_DESIGN_AND_REQUIREMENT_FREEZE
REPOSITORY = etblink/Hive-Venues

DESIGN_BASE_COMMIT = 4958116329c5ec9375c35e5c5f3b4639363b1fe2
DESIGN_BASE_TREE = 24610c99ebcb62f5d08eae0c8342ee449afc9046

FIRST_VENUE_NOMINEE = FOURTH_STREET_BAR
FIRST_VENUE_NOMINEE_REALITY = REAL_VENUE
FIRST_VENUE_NOMINEE_CLIENT_STATUS = FIRST_REAL_CLIENT__SOLE_REAL_CLIENT
FIRST_VENUE_NOMINEE_DEPLOYMENT_STATUS = REFERENCE_DEPLOYMENT

SECOND_VENUE_NOMINEE = JUNIPER_WORKS_COOPERATIVE
SECOND_VENUE_NOMINEE_REALITY = SYNTHETIC
SECOND_VENUE_NOMINEE_SELECTION = PROJECT_LEAD_SELECTED
SECOND_VENUE_NOMINEE_EVIDENCE_TIER = TIER_A_ARCHITECTURAL_FALSIFICATION
SECOND_VENUE_NOMINEE_PRODUCT_CREDIBILITY = REQUIRED

DESIGN_METHOD = ARCHITECTURE_AWARE_PRODUCT_FIRST
ARTIFICIAL_BLINDNESS = NOT_USED
AUTHENTIC_REQUIREMENTS = FROZEN_BEFORE_IMPLEMENTATION
POST_FREEZE_REQUIREMENT_REWRITE_TO_FORCE_PLATFORM_FIT = FORBIDDEN

PLATFORM_IMPLEMENTATION = NOT_AUTHORIZED_BY_THIS_PACKET
PLATFORM_REPAIR = NOT_AUTHORIZED_BY_THIS_PACKET
REAL_VENUE_OUTREACH = NOT_AUTHORIZED
REAL_SECOND_CLIENT = NOT_CLAIMED
REAL_OPERATOR_USABILITY = NOT_CLAIMED
REAL_VENUE_PERMISSION = NOT_CLAIMED
REAL_VENUE_ADMISSION = NOT_CLAIMED
LIVE_PRODUCTION_MUTATION = NOT_AUTHORIZED
```

This packet selects and defines Hive-Venues' second venue nominee. It freezes the nominee on its own product terms before Hive-Venues is adjudicated against it.

The nominee was designed with normal knowledge of the accepted Hive-Venues architecture. Existing source, schemas, tests, and accepted HV-1 through HV-6 behavior were inspected. That knowledge was used to avoid artificial or irrelevant requirements, not to shrink the product until it fits the current platform.

The controlling anti-confirmation-bias rule is:

```text
DESIGN_A_COHERENT_VENUE_ON_ITS_OWN_TERMS
-> FREEZE_ITS_AUTHENTIC_REQUIREMENTS
-> CONFRONT_THE_EXISTING_ARCHITECTURE_WITH_THOSE_REQUIREMENTS
-> DO_NOT_REWRITE_THE_REQUIREMENTS_MERELY_TO_MAKE_THE_PLATFORM_PASS
```

---

## 1. Nominee selection

### 1.1 Selected nominee

```text
NAME = Juniper Works Cooperative
SHORT_NAME = Juniper Works
LOCAL_PRODUCT_DESCRIPTOR = member-run fabrication workshop and tool library
VENUE_NOUN = workshop
STAFF_ROLE = steward
PRIMARY_RELATIONSHIP = member
SECONDARY_RELATIONSHIPS = prospective member; visitor; instructor; community participant
```

`member-run fabrication workshop and tool library` is a description of this nominee. It is not a platform-wide venue-type enum and creates no mandatory taxonomy for other venues.

### 1.2 Why this is a good second nominee

Juniper Works is a desirable, credible future Hive-Venues client type. It is a physical community place whose online product should strengthen an in-person community rather than replace it. People come there to make, repair, learn, teach, share tools, show projects, ask questions, and spend time with other makers.

It differs materially from Fourth Street without being selected merely because it is different:

| Product dimension | Fourth Street Bar | Juniper Works Cooperative |
| --- | --- | --- |
| Primary relationship | patron / venue | member / cooperative workshop |
| Staff vocabulary | bar staff / venue operator | steward / instructor |
| Core physical activity | gathering, drinks, social venue | making, repair, learning, shared tools |
| Typical visit | often spontaneous | may depend on hours, orientation, program, or equipment status |
| Time-sensitive public information | venue updates | programs plus advisory equipment status |
| Community content | bar/community conversation | projects, questions, techniques, announcements, workshop conversation |
| Showcase material | venue atmosphere and events | member projects, workspace, making activity |
| Payment posture for HV-7 | not controlling | disabled; dues/billing remain outside this nominee test |

This comparison is evidence for product difference only. It does not define universal venue categories.

### 1.3 Meaning of adversarial

For this nominee:

```text
ADVERSARIAL = HONESTLY_CAPABLE_OF_FALSIFYING_BAD_PLATFORM_ABSTRACTIONS
ADVERSARIAL != MAXIMIZE_INCOMPATIBILITY
ADVERSARIAL != INVENT_BIZARRE_EDGE_CASES
ADVERSARIAL != REQUIRE_IRRELEVANT_FEATURES_JUST_TO_BREAK_THE_PLATFORM
```

The nominee must remain a product Hive-Venues would actually be willing to support if a real workshop of this kind became a client.

---

## 2. Synthetic evidence identity

Juniper Works is fictional. Its facts and integration identities are synthetic test evidence, not claims about a real organization.

### 2.1 Frozen synthetic public facts

```text
DISPLAY_NAME = Juniper Works Cooperative
ADDRESS = 240 Juniper Works Way, Reno, NV 89502
PHONE = (555) 010-2746
HOURS = Tue–Fri 2:00 p.m.–9:00 p.m.; Sat–Sun 10:00 a.m.–6:00 p.m.; Mon closed
WEBSITE = https://juniper-works.example/
MAP_LINK = https://juniper-works.example/visit
```

The street address, phone number, domain, and organization are synthetic. The `.example` domain and 555 exchange are intentional test identities. No real-world ownership or reachability is implied.

### 2.2 Frozen synthetic Hive-binding assumptions

A later separately authorized staged implementation may use these clearly labeled test-only bindings if valid protocol-shaped identifiers are required:

```text
COMMUNITY_ID = hive-742913
OFFICIAL_ACCOUNT = juniperworks
THREADS_CONTAINER_ACCOUNT = juniper.threads
PAYMENT_MERCHANT_ACCOUNTS = EMPTY
```

These values are fixtures. This packet does not claim they exist on Hive, does not authorize their creation, and does not require any Hive write or network lookup.

### 2.3 Deployment assumption

Juniper Works is expected to compose as one isolated venue runtime using a synthetic deployment profile. No real DNS, VPS, service, filesystem, production hostname, certificate, secret, or infrastructure is required for Tier-A evidence.

---

## 3. Product promise

Juniper Works' public product should communicate this promise in its own voice:

> A shared neighborhood workshop where people make, repair, learn, and help one another build things well.

The product should make a first-time visitor understand what Juniper Works is, help a member decide what is happening at the workshop, make practical public information easy to find, and connect the physical workshop to its Hive community.

The product must feel like **Juniper Works**, not a Fourth Street reskin with nouns replaced.

---

## 4. Core audiences and jobs

### JW-A01 — Curious visitor / prospective member

The product must let a first-time visitor quickly answer:

1. What is Juniper Works?
2. Who is it for?
3. When and where can I visit?
4. Is orientation required before using parts of the workshop?
5. What classes, orientations, open-shop sessions, or public events are coming up?
6. Is important shared equipment currently available, limited, in maintenance, or offline?
7. What do members actually make here?
8. How can I read or join the online community?

### JW-A02 — Member

The product should support a member who wants to:

1. read workshop announcements;
2. see upcoming programs;
3. check advisory equipment status before planning a visit;
4. share a project, question, technique, or update through the Hive community;
5. discuss community content using existing Hive-Venues social primitives;
6. browse work and conversation from other members.

### JW-A03 — Steward / instructor

An ordinary venue steward should be able to maintain routine public venue expression without editing application source code or exercising security/payment/deployment authority.

The steward's routine content job includes static copy/media and the changing public program/status information defined below.

---

## 5. Frozen product requirements

The requirements in this section are controlling for the later architecture confrontation. They may be clarified only to resolve ambiguity without reducing their substance. They may not be weakened merely because the current platform lacks a convenient representation.

### JW-R001 — Independent venue identity

Juniper Works must have its own display name, authored voice, imagery, venue vocabulary, and presentation identity.

Candidate-facing output must not use Fourth Street-specific or bar-specific terms such as `bar`, `beer`, `bartender`, `patron` as venue identity, or Fourth Street production names unless clearly shown only as historical/developer compatibility evidence outside the Juniper Works product surface.

Generic Hive/product vocabulary such as `Community`, `Post`, `Reply`, `Profile`, or `Hive` may remain generic when it is semantically appropriate.

### JW-R002 — Membership relationship

The product must speak naturally about **members**, **stewards**, **instructors**, **visitors**, and the **workshop**.

It must not force the Juniper Works relationship into a patron/bar model. Membership here is a product relationship and public vocabulary requirement; it does not require Hive-Venues to become a membership billing or private CRM system.

### JW-R003 — First-visit orientation

The public product must explain that some workshop activities or equipment require orientation before use and must provide a clear first-visit/orientation path.

This is informational. Hive-Venues is not required to issue credentials, enforce physical access, store waivers, certify training, or control equipment.

### JW-R004 — Public venue facts

Address, phone, opening hours, website, and visit/map destination must be first-class venue facts and independently authored/integrated for Juniper Works.

The product must support the possibility that scheduled programs and equipment availability vary inside those general opening hours.

### JW-R005 — Upcoming programs as structured information

Juniper Works requires a public **Upcoming at the Workshop** collection for classes, orientations, open-shop sessions, repair events, and similar scheduled activities.

This requirement is semantic and structured. It must not be satisfied merely by flattening all upcoming programs into one undifferentiated prose field if doing so removes item identity or routine steward management.

Each program item must be able to carry at least:

```text
stable item identity
public title
start date/time
end date/time or duration
short description
public access/audience note
state = scheduled | full | cancelled
optional credential-free HTTPS registration/information link
```

The `state` values above are Juniper Works product vocabulary, not a platform-wide venue taxonomy.

The public presentation should sort upcoming scheduled items chronologically by default and make cancelled/full state unambiguous.

A reasonable product envelope is 0–12 future items visible at one time. Empty state must be a valid, intentional state.

### JW-R006 — Steward authority over upcoming programs

An ordinary Juniper Works steward must be able to:

```text
create a program item
edit its operator-owned fields
cancel or restore its public state
remove/archive an obsolete item
```

Routine program maintenance must not require source-code editing, deployment authority, security authority, or a developer manually changing a fixed array topology.

The product does not require an internal booking/reservation engine. An optional external HTTPS information/registration link is sufficient for registration handoff.

### JW-R007 — Advisory equipment status as structured information

Juniper Works requires a public **Equipment Status** collection because members may plan a workshop visit around shared tools.

Each public equipment-status item must be able to carry at least:

```text
stable item identity
equipment/display name
state = available | limited | maintenance | offline
short public note
optional access/orientation note
last-updated timestamp or date
```

The state vocabulary is venue-specific Juniper Works vocabulary and must not become a universal Hive-Venues taxonomy.

A reasonable product envelope is 0–20 public status items. This collection may intentionally omit equipment that the venue does not want to publish.

### JW-R008 — Steward authority over equipment status

An ordinary steward must be able to create, edit, retire/remove, and intentionally order or group public equipment-status items without source-code edits.

Equipment status is **advisory public communication**, not a safety interlock or machine-control system. On-site rules and physical safety controls remain authoritative.

### JW-R009 — Project showcase

Juniper Works requires a curated visual project/workshop showcase with local/approved media, alternative text, and captions.

A bounded featured set is acceptable. The product does not require an unlimited media CMS for HV-7.

The showcase should communicate making, repair, craft, experimentation, and member work rather than bar atmosphere.

### JW-R010 — Hive community continuity

The nominee must support the existing Hive-Venues community/social value proposition: public community reading plus appropriately gated posting, comments/replies, voting, following, community membership, profile, Wall/Inbox, and Threads where those accepted platform features are enabled for the staged test.

Juniper Works-specific copy may frame this as project sharing, workshop questions, techniques, announcements, or bench conversation.

The nominee does not require inventing a separate social protocol or a venue-specific source fork.

### JW-R011 — Venue-authored home structure

The Juniper Works home experience must provide distinct semantic homes for:

```text
brand / hero proposition
what is happening now or next
first-visit / orientation guidance
upcoming programs
equipment status
visit information
Hive community entry
project showcase
```

Exact visual layout, card count, or section order is not frozen unless needed for usability. Implementations may combine compatible presentation regions, but they may not erase the structured program/equipment concepts or make them indistinguishable blobs merely to fit an inherited Fourth Street page shape.

### JW-R012 — Independent visual brand expression

Juniper Works must be visually recognizable as an independently branded venue.

Its desired presentation language is:

```text
practical
welcoming
craft-oriented
workshop-like rather than nightlife-like
high-clarity status communication
```

The venue should be able to own at least a meaningful accessible brand accent/theme layer in addition to logo, copy, and images. The exact implementation mechanism is not frozen.

A later implementation must not require Juniper Works to inherit Fourth Street's venue-specific color/visual identity merely because the platform originated there.

Accessibility contrast and established platform safety/readability constraints remain mandatory and may constrain arbitrary brand choices.

### JW-R013 — Ordinary steward authoring

Routine venue-authored public content must be maintainable through the canonical authoring model by a non-developer steward.

At minimum, ordinary steward authority must cover:

```text
display-facing venue copy
public business facts that product governance classifies as operator-authored
local/approved image references and accessible descriptions
Juniper Works vocabulary fields
upcoming-program item content and lifecycle
equipment-status item content and lifecycle
venue-owned accessible brand expression that is admitted by the product model
```

Integration identity, Hive account/community bindings, deployment identity, payment authority, secrets, privileged security settings, and platform code remain outside ordinary steward authority.

### JW-R014 — Visual authoring generality

The accepted HV-6 visual-authoring experience, or an honestly evolved successor to it, must be capable of presenting Juniper Works' ordinary steward-authorable fields in meaningful typed controls and a truthful preview.

Routine steward work must not require raw JSON merely because Juniper Works contains structured collections.

Apply must remain explicit and atomic through the canonical authoring gate; Discard must restore accepted state; rejected edits must leave accepted state unchanged.

### JW-R015 — Direct-source independence

A direct source/code authoring path must remain available independently of the visual editor. Juniper Works must not make editor project state, DOM state, generated HTML, or other shadow state canonical authority.

### JW-R016 — No generic source fork

Supporting Juniper Works must not require a second application fork selected by venue name or venue type.

Venue/package/deployment-specific data and presentation may differ. Generic platform behavior may evolve when a genuinely general abstraction is required, but it must remain one shared platform implementation rather than `if (juniperWorks)` product branching.

### JW-R017 — Isolated-runtime sufficiency remains testable

The preferred test composition is one isolated Juniper Works runtime using the accepted venue-context + venue-package + deployment-profile + bootstrap architecture.

If an authentic frozen requirement cannot be supported cleanly by one isolated runtime, that result must be recorded rather than silently introducing shared-runtime multi-tenancy.

### JW-R018 — Payment-disabled venue mode

Juniper Works does not require Hive payment functionality for HV-7. Payment/merchant accounts must be allowed to remain empty or disabled without degrading unrelated venue/social functionality.

Real-world membership dues, class fees, donations, retail sales, or payment processing are outside this nominee packet.

### JW-R019 — Synthetic integration must stay visibly synthetic

Any later staged Hive IDs, account names, deployment hosts, asset paths, or service identities used solely to satisfy protocol-shaped inputs must remain explicitly labeled synthetic/test-only evidence.

They may not be described as owned by Juniper Works, used to claim real onboarding, or counted as proof of real external deployment readiness.

### JW-R020 — Security and custody invariants

Juniper Works must not weaken accepted security boundaries. In particular:

```text
NO_SERVER_HELD_HIVE_PRIVATE_KEYS
KEYCHAIN_REMAINS_USER_SIDE_SIGNING_BOUNDARY
NO_AUTOMATIC_REBROADCAST_AFTER_AMBIGUOUS_ACCEPTANCE
NO_SECRET_OR_PRIVATE_MATERIAL_IN_VENUE_AUTHORING_DOCUMENT
NO_OPERATOR_ESCALATION_INTO_SECURITY_OR_PAYMENT_AUTHORITY
NO_HIDDEN_LIVE_HIVE_WRITE_DURING_OFFLINE_OR_STAGED_HV7_EVIDENCE
```

### JW-R021 — Accessible and responsive public experience

The nominee must preserve the accepted accessibility and responsive-product standard. New status/program controls and public presentations must be keyboard-operable, semantically understandable, screen-reader coherent, and usable at the established compact/mobile boundaries.

Color alone must not carry equipment/program state.

### JW-R022 — Failure and empty-state honesty

Juniper Works must have intentional presentation for:

```text
no upcoming programs
program data unavailable
no published equipment statuses
equipment-status data unavailable
community updates unavailable
```

Failure of one noncritical public-information source must not invent data or falsely imply that the physical workshop is closed. Safety-critical conclusions must never be inferred from unavailable web status.

### JW-R023 — No compatibility-seam leakage

Inherited Fourth Street/Hive-Bar compatibility seams may remain in deployment/provenance internals when required for historical compatibility, but they must not leak into Juniper Works-facing vocabulary, ordinary venue authoring semantics, generated public identity, or generic product claims.

The known `officialAccount -> officialBarAccount` compatibility alias is specifically a seam to inspect during the later confrontation. Its mere internal existence is not pre-judged as a defect; visible or semantic leakage would be.

### JW-R024 — Requirements are not implementation instructions

This packet freezes product meaning, not a preferred storage schema or framework.

A later architecture repair may satisfy these requirements through a sound general mechanism different from any examples in this document. Conversely, superficially matching current field names does not count as success if the underlying product job is not met.

---

## 6. Brand and voice reference

This section gives enough authored direction to prevent Juniper Works from collapsing into generic placeholder copy. It is product evidence, not final marketing copy.

### 6.1 Voice

```text
competent without being bureaucratic
welcoming to beginners without talking down to experienced makers
direct about safety and equipment state
community-minded
more “come make something with us” than “buy something from us”
```

### 6.2 Representative vocabulary

Preferred nominee vocabulary includes:

```text
workshop
member
steward
instructor
orientation
open shop
project
tool
equipment
bench
make
repair
learn
share
```

Fourth Street/bar vocabulary is not authentic Juniper Works vocabulary.

### 6.3 Representative brand direction

A future visual treatment should plausibly use an accessible workshop/craft palette such as evergreen, charcoal, light birch/neutral surfaces, and high-clarity status accents. Exact color values are deliberately not frozen in this requirement packet; accessibility and design quality take precedence over a premature palette constant.

---

## 7. Representative public content model

This is a semantic example of the frozen requirements, not an implementation schema.

### 7.1 Upcoming-program examples

```text
Woodshop Orientation
Saturday 10:30 a.m.–12:00 p.m.
Open to prospective and current members
Scheduled
Registration/info link available

Repair Night
Wednesday 6:30–8:30 p.m.
Open to the public
Scheduled
Bring one repairable household item

Intro to Laser Cutting
Thursday 7:00–8:30 p.m.
Members after general orientation
Full
Wait-list/info link available
```

### 7.2 Equipment-status examples

```text
80W Laser Cutter
LIMITED
Available for approved materials; exhaust service scheduled Friday
Orientation required
Updated today

Planer
MAINTENANCE
Blade change in progress; do not plan projects around it tonight
Updated today

Electronics Benches
AVAILABLE
Four benches open during staffed hours
Updated yesterday
```

These examples are deliberately mundane. Their value is that they represent credible public information a workshop would routinely maintain.

---

## 8. Explicit non-requirements

To keep the nominee product-credible rather than artificially expansive, HV-7 does **not** require Hive-Venues to implement:

```text
physical door/access control
machine interlocks or safety PLC behavior
training certification records
waiver/legal-document custody
equipment telemetry or IoT monitoring
reservations or booking engine
membership billing or dues collection
class payment processing
inventory/consumables ERP
private member database / CRM
staff scheduling
point of sale
real-time machine queue management
real Hive account/community creation
shared-runtime multi-tenancy
real production deployment
```

External links or later integrations may support some of these in a real product, but they are not valid reasons to fail HV-7 today.

---

## 9. Product evidence ceilings

A successful Juniper Works synthetic pilot may support claims such as:

```text
A_SECOND_COHERENT_VENUE_NOMINEE_CAN_BE_REPRESENTED
FOURTH_STREET_BAR_SEMANTICS_DO_NOT_CONTROL_GENERIC_PLATFORM_MEANING
THE_ISOLATED_VENUE_ARCHITECTURE_SURVIVES_OR_IDENTIFIES_BOUNDED_GAPS
HV5_OWNERSHIP_CAN_OR_CANNOT_GENERALIZE_TO_THIS_PRODUCT
HV6_VISUAL_AUTHORING_CAN_OR_CANNOT_GENERALIZE_TO_THIS_PRODUCT_STRUCTURE
```

It may not support claims such as:

```text
SECOND_REAL_CLIENT_ACQUIRED
REAL_WORKSHOP_OPERATOR_VALIDATED_USABILITY
REAL_VENUE_GRANTED_PERMISSION
REAL_VENUE_ADMITTED
REAL_HIVE_IDENTITIES_ONBOARDED
REAL_DEPLOYMENT_READY
UNIVERSAL_VENUE_COVERAGE_PROVEN
SHARED_RUNTIME_MULTI_TENANCY_JUSTIFIED
```

One synthetic second nominee can falsify bad abstractions and strengthen architectural confidence; it cannot prove universal product generality.

---

## 10. Later architecture-confrontation protocol

The next operation after this requirement packet is accepted and canonical should be a read-only confrontation of each frozen requirement against the existing architecture.

Each requirement should receive an evidence-backed disposition such as:

```text
SUPPORTED_AS_IS
SUPPORTED_WITH_EXISTING_VENUE_CONFIGURATION
SUPPORTED_WITH_EXISTING_INTEGRATION_BINDING
PLATFORM_GENERALITY_DEFECT
VENUE_CONTEXT_MODEL_GAP
VENUE_PACKAGE_MODEL_GAP
DEPLOYMENT_PROFILE_MODEL_GAP
BOOTSTRAP_BINDING_DEFECT
AUTHORING_OWNERSHIP_DEFECT
VISUAL_ADAPTER_USABILITY_DEFECT
COMPATIBILITY_LEAKAGE_DEFECT
INTEGRATION_PREREQUISITE_UNMET
VENUE_SPECIFIC_REQUIREMENT__NO_PLATFORM_GENERALIZATION_YET
```

The confrontation may discover that some requirements are already supported, some require a sound general extension, and some are inappropriate for Hive-Venues. However, a requirement may be declared inappropriate only with product reasoning grounded in this frozen packet—not merely because current code lacks it.

No platform implementation or repair should occur until that confrontation identifies what, if anything, needs to change.

---

## 11. Known architecture inspected during design

The Project Lead intentionally inspected accepted architecture before freezing this nominee, including:

- venue context and the Fourth Street compatibility alias;
- venue package schema v1;
- HV-5 authoring ownership classes and leaf-oriented ordinary-operator gate;
- HV-6 native semantic inspector / truthful application preview;
- provider-neutral deployment-profile machinery;
- the Lantern Room synthetic proof fixture;
- the generic application composition path.

This inspection informed scope discipline. For example, this packet does not invent an unrelated reservation engine simply to create a failure. At the same time, the packet retains structured changing programs, equipment status, and independent brand expression because those are credible Juniper Works product needs even though the current schema may not already model them.

This section is not an architecture adjudication. No pass/fail finding is frozen here.

---

## 12. Final freeze

```text
HV7_SECOND_VENUE_NOMINEE = JUNIPER_WORKS_COOPERATIVE
HV7_SECOND_VENUE_NOMINEE_STATUS = SELECTED
HV7_SECOND_VENUE_NOMINEE_REALITY = SYNTHETIC
HV7_SECOND_VENUE_NOMINEE_PRODUCT_CREDIBILITY = ACCEPTED_FOR_TEST
HV7_REQUIREMENTS_0_1_0 = FROZEN_BEFORE_IMPLEMENTATION
HV7_REQUIREMENT_COUNT = 24

FOURTH_STREET_BAR = FIRST_VENUE_NOMINEE
JUNIPER_WORKS_COOPERATIVE = SECOND_VENUE_NOMINEE

NEXT_OPERATION_AFTER_FREEZE = HV7_JUNIPER_WORKS_ARCHITECTURE_CONFRONTATION__READ_ONLY
PLATFORM_IMPLEMENTATION = NOT_AUTHORIZED_BY_THIS_PACKET
EXTERNAL_EFFECTS = NOT_AUTHORIZED
```

Juniper Works is now defined strongly enough to be treated as a real product-design commitment for Tier-A testing, while remaining explicitly synthetic evidence. The next scientific/product-honesty step is to confront Hive-Venues with these requirements and accept the result whether it passes cleanly, requires bounded generalization, or exposes a deeper architectural defect.
