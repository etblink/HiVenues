# HiVenues Next-Generation Executable Slice Contract 0.1.0

Status: **SUPERSEDED — DO NOT IMPLEMENT**  
Superseded by: `docs/NEXT_GEN_EXECUTABLE_SLICE_CONTRACT_0_1_1.md`

This historical draft was committed at `d4d865709c79c5be3ebe0629572f14c3d67930dc` before a line-level re-read of the already-accepted `NEXT_GEN_ACTIVITY_SOURCE_AND_MIGRATION_CONTRACT_0_1_0.md` and `PM4_OPERATOR_GAP_V3_REAUDIT_0_1_0.md` exposed material incompatibilities.

The draft incorrectly attempted to freeze, among other things:

- `event|program` as activity types, despite accepted v3 treating programs as a distinct resource kind and activities as trait-based domain objects;
- `/events/:slug` and `/programs/:slug` as canonical v3 activity route families, despite the accepted canonical v3 route being `/activities/<slug>` with `/events/<slug>` retained only as migrated-v2 compatibility;
- embedded activity socialization state/ref fields, despite the accepted v3 source contract separating external Hive social identity into `activityBindings.hiveSocial`;
- bar/restaurant/workshop pressure as the first-slice falsification set, despite the accepted re-audit freezing the first reference pressure as migrated physical host + native locationless creator/performer + native release/premiere;
- a snake_case envelope inconsistent with the accepted compatibility vocabulary (`schemaVersion = 3`).

These were Project Lead reconstruction errors, not changes to accepted HiVenues doctrine. They were caught before implementation code was written. The Git history intentionally preserves the mistaken draft rather than rewriting provenance.

Only version `0.1.1` governs implementation.