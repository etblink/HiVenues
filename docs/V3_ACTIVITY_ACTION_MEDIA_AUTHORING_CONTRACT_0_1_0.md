# HiVenues V3 Activity Action and Managed-Media Authoring Contract 0.1.0

Status: **FROZEN IMPLEMENTATION CONTRACT**  
Operation: **S3 — V3_ACTIVITY_ACTION_AND_GENERAL_MEDIA_AUTHORING**  
Canonical base commit: `b65236af8101890ab4d3a2df255b9aabfa9b9d89`  
Canonical base tree: `673446ab2b9306f279bdac7611fbecc903030e02`

## 1. Purpose

S1 proved one provider-neutral v3 source/migration/renderer family across migrated physical activity, native locationless creator activity, and native release/premiere.

S2 proved one strict reversible stale-safe activity authoring and local persistence family across the same three references.

S3 asks the next bounded product question:

> Can operators give those activities meaningful visitor-facing actions and source-managed public media through the same semantic authoring machinery without introducing provider identity, generic URL guessing, payment authority, external mutation, or a host-specific fork?

S3 is not full Studio convergence. It is not provider upload. It is not Hive publication. It is not commerce.

## 2. Controlling invariants

S3 preserves all accepted S1/S2 invariants:

- one typed v3 source authority;
- stable activity identity;
- proposal -> Preview -> Apply/Discard;
- exact Undo/Redo;
- stale-digest rejection;
- explicit Save/fresh reopen;
- renderer as preview authority;
- no browser/source-pointer authority;
- no provider/Hive mutation;
- v2 compatibility bytes remain untouched.

Existing migrated `LEGACY_EXTERNAL` action semantics and `PRIMARY_VISUAL_COMPATIBILITY` managed-media semantics are provenance, not native creation vocabularies.

## 3. Exact S3 slice

S3 SHALL implement only:

```text
TYPED_ACTIVITY_PUBLIC_ACTION_AUTHORING
+
ACTIVITY_SOURCE_MANAGED_PROMO_MEDIA_AUTHORING
+
EXACT ACTION/MEDIA ORDER
+
PREVIEW / APPLY / DISCARD
+
EXACT UNDO / REDO
+
EXPLICIT SAVE / REOPEN
+
R1 / R2 / R3 CROSS_HOST EVIDENCE
+
REAL_RENDERER CONSEQUENCES
+
NO EXTERNAL EFFECTS
```

Preferred implementation remains inside the accepted v3 source/authoring/renderer family.

## 4. Explicit non-scope

S3 does not authorize:

- S4 complete cross-host Studio journeys;
- full Studio controls or interaction convergence;
- visual convergence;
- production deployment/routing;
- Fourth Street production mutation;
- Hive RPC/broadcast/signing;
- Keychain/wallet signing;
- Hive social-root creation or mutation;
- SPK/3Speak/provider upload;
- Podping/feed publication;
- ticket/reservation provider mutation;
- checkout;
- payment, transfer, donation, vote or value operation;
- commerce/value/activity-binding creation;
- arbitrary external integrations;
- media file ingestion/upload into the repository/workspace;
- Gallery component creation/cardinality;
- generic component insertion/removal;
- arbitrary CSS/DOM/page-builder authority.

S3 may reference already source-managed media assets. Asset-file ingestion remains separate.

## 5. Public action model

### 5.1 Native semantic roles

Native S3 action creation SHALL admit exactly:

```text
INFO
TICKETS
RSVP
RESERVE
WATCH
LISTEN
CALENDAR
```

These roles describe visitor intent, not provider identity.

No role may imply or perform payment, Hive signing, provider mutation, reservation creation, ticket purchase, or account authentication. An action is an outbound public navigation affordance only.

### 5.2 Legacy migrated role

Existing migration-generated:

```text
LEGACY_EXTERNAL
```

remains valid source data and renderer data.

Public S3 creation SHALL NOT create `LEGACY_EXTERNAL`.

S3 MAY edit the label/href of an existing legacy action and MAY explicitly remove or reorder it. Its role itself remains immutable; S3 SHALL NOT infer a native semantic role from URL shape, label text, hostname, or provider name.

### 5.3 Action record

Every public action remains:

```text
id
role
label
href
```

Requirements:

- `id` is source-owned stable identity;
- native `id` is server-derived on creation;
- `role` is immutable after creation/migration;
- `label` is operator-editable bounded copy;
- `href` is credential-free HTTPS;
- array order is explicit public presentation order;
- duplicate action ids are invalid.

Native id derivation SHALL be deterministic and collision-safe and SHALL NOT depend on provider identity, current time, or array position.

## 6. Action command vocabulary

Public commands added by S3:

```text
ADD_ACTIVITY_PUBLIC_ACTION
SET_ACTIVITY_PUBLIC_ACTION
REMOVE_ACTIVITY_PUBLIC_ACTION
MOVE_ACTIVITY_PUBLIC_ACTION
```

`ADD_ACTIVITY_PUBLIC_ACTION` supplies:

```text
activity target
native semantic role
label
href
explicit destination
```

Server derives stable action id.

`SET_ACTIVITY_PUBLIC_ACTION` targets stable activity id + action id and edits only:

```text
label
href
```

Role and id remain frozen.

`REMOVE_ACTIVITY_PUBLIC_ACTION` targets stable activity id + action id.

`MOVE_ACTIVITY_PUBLIC_ACTION` targets stable activity id + action id + explicit destination.

Allowed action destinations:

```text
BEFORE_PUBLIC_ACTION(<stable action id>)
END_OF_PUBLIC_ACTIONS
```

Missing, stale, self, duplicate, cross-activity and no-op movement fails closed.

## 7. Managed activity media

### 7.1 Existing source seam

S1 already provides:

```text
source.media.assets[]
activity.managedMedia[]
```

S3 authors activity usage of already-managed assets; it does not ingest files.

### 7.2 Roles

Existing roles remain:

```text
PROMO
PRIMARY_VISUAL_COMPATIBILITY
```

Native S3 creation SHALL create only:

```text
PROMO
```

`PRIMARY_VISUAL_COMPATIBILITY` remains migration provenance. It may be explicitly removed or reordered, but S3 SHALL NOT create or relabel an entry as compatibility media.

### 7.3 Media usage identity

A managed-media usage is stably targeted by exact composite identity:

```text
assetId + role
```

Within one activity the same exact `(assetId, role)` pair may appear at most once.

A media usage may reference only an existing `source.media.assets[]` asset id.

Array order is explicit public presentation order.

## 8. Managed-media command vocabulary

Public commands added by S3:

```text
ADD_ACTIVITY_MANAGED_MEDIA
REMOVE_ACTIVITY_MANAGED_MEDIA
MOVE_ACTIVITY_MANAGED_MEDIA
```

`ADD_ACTIVITY_MANAGED_MEDIA` supplies:

```text
activity target
assetId
role = PROMO
explicit destination
```

Allowed destinations:

```text
BEFORE_MANAGED_MEDIA(<assetId, role>)
END_OF_MANAGED_MEDIA
```

Remove and move target the exact `(assetId, role)` composite.

Missing asset references, duplicate composite usages, forged compatibility creation, stale destinations, cross-activity targets and no-op moves fail closed.

S3 does not expose arbitrary asset records, filesystem paths, dimensions, raw media objects or media-source pointers through these activity commands.

## 9. Source/parser change

The v3 source parser SHALL widen `publicActions.role` to admit the seven native semantic roles plus `LEGACY_EXTERNAL`.

It SHALL continue to require credential-free HTTPS and stable action ids.

The v3 source cross-reference validator SHALL reject duplicate exact managed-media `(assetId, role)` pairs within one activity in addition to its existing missing-asset checks.

No schema version bump is authorized; this is the already-routed S3 completion of fields intentionally present but frozen in the v3 contract family.

## 10. Renderer consequences

The S1 renderer remains the preview authority.

S3 SHALL preserve existing action rendering and add role-observable semantics sufficient for tests and styling without provider inference.

At minimum:

- every public action renders its exact label, href and semantic role;
- action array order is rendered order;
- action removal disappears from the detail page;
- activity managed-media array order is rendered order;
- native PROMO media resolves through `source.media.assets` dimensions/path;
- compatibility media remains renderable;
- unrelated activity routes remain unchanged.

No action click is executed during tests; renderer evidence is markup-only.

## 11. Transaction semantics

Every new S3 command SHALL use S2's existing command/session/proposal/history family rather than a second transaction engine.

Every public command includes:

```text
schemaVersion = 1
expectedDraftDigest = <exact current v3 source digest>
```

Proposal creation changes neither accepted source nor disk.

Apply adds exactly one history entry.

Discard is source/digest exact.

Undo/Redo regenerate exact canonical source bytes/digests.

Apply-after-Undo truncates stale redo.

Forged history/inverse payloads fail closed.

## 12. Frozen fields and boundaries

S3 action/media commands SHALL NOT alter:

- activity id;
- activity slug;
- activity title/description/lifecycle/temporal/presence/access unless a separate accepted S2 command is used;
- activity seriesRef;
- any `activityBindings` collection;
- source media asset records;
- venue/business facts;
- unrelated activities/components/pages.

The existing S2 commands remain valid and must continue to pass unchanged.

## 13. Cross-host pressure

The same S3 engine SHALL be proven against:

```text
R1 = migrated physical host activity
R2 = native locationless creator/performer activity
R3 = native release/premiere activity
```

Required pressure:

### R1

- migrated `LEGACY_EXTERNAL` remains explicit;
- edit legacy label/href without semantic relabeling;
- add native `TICKETS` or `RSVP` action;
- add/reorder PROMO media while compatibility media remains meaningful;
- exact Undo/Redo;
- save/reopen.

### R2

- add native `WATCH` action;
- add second semantic action and reorder;
- add/reorder/remove PROMO media;
- no physical/provider facts fabricated;
- exact Undo/Redo;
- save/reopen.

### R3

- add native `LISTEN` or `INFO` action;
- add `CALENDAR` only as outbound HTTPS navigation, not scheduling mutation;
- add PROMO media;
- no fake occurrence/physical facts;
- exact Undo/Redo;
- save/reopen.

No host-specific transaction fork is allowed.

## 14. Safety and no external effects

S3 qualification SHALL prove:

```text
HIVE_RPC = 0
HIVE_WRITE = 0
PROVIDER_WRITE = 0
PAYMENT = 0
SIGNING = 0
MEDIA_UPLOAD = 0
RESERVATION_MUTATION = 0
TICKET_PURCHASE = 0
DEPLOYMENT = 0
```

Outbound action hrefs are stored/rendered facts only.

## 15. Qualification requirements

S3 is qualified only if executable evidence proves all of the following:

1. one command/session implementation serves R1/R2/R3;
2. v2 source/parser/renderer bytes remain untouched;
3. source accepts seven native roles plus `LEGACY_EXTERNAL` and rejects unknown roles;
4. native action creation cannot create `LEGACY_EXTERNAL`;
5. native action ids are deterministic, stable and collision-safe;
6. action edits preserve id/role and activity id/slug;
7. legacy action editing never infers/relabels role;
8. action hrefs remain credential-free HTTPS;
9. explicit action ordering changes renderer order;
10. action remove/Undo restores exact resource/order;
11. action move rejects self/missing/cross-activity/stale/no-op targets;
12. activityBindings remain byte-semantically unchanged through action operations;
13. native managed-media creation admits PROMO only;
14. managed-media reference must resolve an existing managed asset;
15. duplicate exact `(assetId, role)` pair is rejected;
16. compatibility media cannot be publicly created or relabeled;
17. explicit managed-media ordering changes renderer order;
18. media removal/Undo restores exact usage/order;
19. media move rejects self/missing/cross-activity/stale/no-op targets;
20. action/media Preview leaves accepted source and disk unchanged;
21. Apply creates one exact history entry;
22. Discard source/digest exact;
23. Undo/Redo canonical-byte exact; forged history fails closed;
24. stale expected digest fails without mutation;
25. explicit Save + fresh reopen returns exact accepted digest;
26. R1/R2/R3 renderer output visibly reflects accepted action/media changes;
27. no external effects occur;
28. full pre-existing suite remains green on Ubuntu and Windows;
29. production dependency audits remain green on Ubuntu and Windows.

## 16. Stop condition

Successful S3 routes next to:

```text
S4 = CROSS_HOST_COMPLETE_OPERATOR_JOURNEYS
```

S4 is a boundary, not automatic implementation authorization.

S3 SHALL stop after qualification/canonical integration and shall not absorb complete Studio journey work.