# HiVenues

HiVenues is a multi-venue community and social platform powered by Hive, governed by a broader **Hive-native host-identity product doctrine** spanning physical places, creators, performers, groups, brands, and event-centered communities. A host supplies its brand, context, vocabulary, content model, audience relationship, and goals; Hive supplies portable identity, community, publishing, social interaction, durable public content, rewards, and economic primitives.

The product goal is to translate those Hive primitives into the language and experience of the host rather than expose a generic blockchain application.

```text
HOST_IDENTITY_FIRST_EXPERIENCE
+
HIVE_FOUNDATIONAL_INFRASTRUCTURE
+
DOMAIN_NATIVE_TRANSLATION
=
HIVENUES
```

The current implementation still contains accepted `venue` vocabulary in schemas, source paths, CLIs, tests, and production-compatibility seams. That is implementation/provenance vocabulary, not a restriction of current product scope. Do not rename those identifiers merely to mirror the broader product term `host`.

See `docs/HIVENUES_PRODUCT_DOCTRINE_RECONCILIATION_0_1_0.md` for the current doctrine, exact supersession boundary, and forward routing.

## Current v2 authoring state

Requirements: Node.js 24.19.x and npm 11.17.x.

```bash
npm ci --ignore-scripts --no-fund
npm run venue:create:v2 -- ./my-v2-venue
npm run venue:studio:v2 -- ./my-v2-venue
```

`venue:create:v2` currently asks for ordinary venue-oriented facts plus one closed starter choice (`general`, `hospitality`, or `live-music`). It does **not** require Hive community, account, Threads, merchant, wallet, or key information. Community and transaction capabilities begin disabled.

That remains a valid **local/preconnection authoring state**. It should no longer be read as the complete product definition or as proof that a brochure-only source qualifies as a fully realized HiVenue.

```text
SCHEMA_REPRESENTABILITY != PRODUCT_QUALIFICATION
```

The command creates a local v2-first workspace:

```text
my-v2-venue/
├── venue-source-v2.json
└── venue-assets/
    ├── starter-logo.svg
    ├── starter-hero.svg
    └── starter-gallery.svg
```

`venue:studio:v2` opens the flagship semantic v2 Studio on `127.0.0.1`. Use the real renderer, Page Structure, contextual Inspector, responsive preview, typed content/structure/theme/media controls, Preview → Apply/Discard → Undo/Redo, and **Save workspace checkpoint**. The accepted v2 source and required managed media persist locally and reopen exactly after the Studio process restarts.

This workflow is local authoring only. It does not route v2 into the production public runtime, publish or deploy a host, modify deployment manifests, write/sign on Hive, activate payments, or change infrastructure. Those are separate later boundaries.

## Preserved v1 venue workflow

```bash
npm run venue:create -- ./my-venue
npm run venue:studio -- ./my-venue
```

`venue:create` asks for venue facts and Hive public identities, then creates:

```text
my-venue/
├── venue-source.json
└── venue-assets/
```

The starter is generic and local. It does not select a deployment host, deploy a service, write to Hive, request private keys, or move funds. Juniper Workshop is a synthetic test/example venue; Fourth Street Bar remains the reference deployment for historical production qualification.

Venue Studio listens only on `127.0.0.1`. Use its browser controls to edit the venue, import PNG/JPEG/GIF media into the managed `venue-assets/` directory, preview the real application renderer, **Keep changes in draft**, and **Save to workspace**. Imported media is content-addressed and existing files are never silently overwritten.

## Product invariants now controlling future work

- **Hive is foundational product infrastructure**, while unnecessary blockchain jargon should be minimized.
- **Public reading does not require signing.** Visitors should be able to understand a host and its public content/community context without mandatory Keychain interaction.
- **Hive identity remains portable user identity.** HiVenues should not invent a proprietary parallel social identity simply to simplify presentation.
- **Semantic authoring remains controlling.** HiVenues is not becoming a free-form HTML/CSS/JavaScript page builder.
- **One responsive semantic source** feeds desktop, tablet, and mobile.
- **The real renderer remains preview authority.**
- **Typed authoring integrity remains controlling:** stable identity, proposal/preview, Apply/Discard, stale-digest rejection, exact history, explicit Save/reopen.
- **Signing remains consequence-bound and least-privilege.** Hive-native does not mean ambient signing authority.
- **Transaction authority remains separately privileged.** Community participation cannot silently imply funds authority.
- **Accessibility, provenance, deterministic CI, deployment identity, and rollback discipline remain release requirements.**
- Future product qualification must include at least one **non-physical creator/performer archetype** in addition to physical-host references.

## Check preserved v1 readiness

After saving a v1 workspace:

```bash
npm run venue:ready -- ./my-venue
```

This is an offline, non-production rehearsal. It validates canonical `venue-source.json` bytes and managed media, then proves the saved source can enter the existing deployment-binding and portable-workspace compiler using a `.invalid` rehearsal target. It must leave the source bytes unchanged and performs no deployment, DNS, VPS, Hive, signing, onboarding, key, or funds effect.

Before a v1 release candidate is accepted, run the repository gates:

```bash
npm run release:check:name
npm run release:check:hivenues-v1
npm run check
```

The HiVenues v1 oracle is distinct from the preserved Fourth Street reference-production gate. Historical compatibility identifiers and provenance files remain scoped history; current product-facing release metadata is HiVenues.

## Current forward sequence

```text
HIVENUES_PRODUCT_DOCTRINE_RECONCILIATION_V0_1
-> HIVE_NATIVE_HOST_PRODUCT_CONTRACT
-> HOST_ACTIVITY_SOCIAL_OBJECT_CONTRACT
-> PM4_OPERATOR_GAP_REAUDIT
-> PM4_RELEVANT_OPERATOR_IMPLEMENTATION
-> STUDIO_PRODUCT_LANGUAGE_AND_INTERACTION_CONVERGENCE
-> GENERATED_EXPERIENCE_VISUAL_CONVERGENCE
-> SOCIAL_SURFACE_RECONCILIATION
-> MEASURED_QUALITY_RELEASE_GATES
-> EXTERNAL_OPERATOR_AND_AUDIENCE_VALIDATION
```

No later step is authorized merely because it appears in this sequence.

## Development and reference paths

- `docs/HIVENUES_PRODUCT_DOCTRINE_RECONCILIATION_0_1_0.md` — current product doctrine and routing.
- `docs/ROADMAP.md` — current program state and sequence.
- `src/venue/v2/turnkey-workspace.js` — current venue-oriented native-v2 starter workspace composition.
- `src/venue/v2/studio-app.js` — flagship v2 authoring Studio application.
- `src/venue/v2/turnkey-studio.js` — loopback-only flagship v2 Studio runtime.
- `src/venue/turnkey-workspace.js` — preserved v1 starter workspace and source composition.
- `src/venue/turnkey-studio.js` — loopback-only turnkey Studio wrapper.
- `src/venue/turnkey-readiness.js` — offline saved-source readiness rehearsal.
- `src/venue/source.js` — deployment-agnostic source contract.
- `src/venue/workspace-from-source.js` — existing deployment-binding/workspace path.
- `src/release/v1-readiness.js` — preserved Fourth Street reference-production gate.
- `docs/DEPLOYMENT_AGNOSTIC_VENUE_SOURCE.md` — accepted source/deployment architecture.

`npm run check` remains the deterministic repository qualification gate. Production deployment and live Hive effects require their own explicit authorization and are not implied by any local authoring command, documentation decision, or GitHub issue.
