# Hive-Venues Hive Identity, Key-Management, and Beneficiary Adjudication 0.1.0

## Result

```text
OPERATION = VENUE_HIVE_IDENTITY_AND_KEY_MANAGEMENT_MINIMIZATION__BOUNDED_AUDIT
RESULT = PASS__THREE_PROTOCOL_ROLES_WITH_MINIMIZED_DAILY_OPERATOR_KEY_BURDEN
THREADS_IDENTITY = RETAIN_DEDICATED_AUTOMATION_ACCOUNT
THREADS_CONTAINER_SEMANTICS = EXPLICIT_MARKER_REQUIRED_FOR_NEW_MACHINE_ROOTS
DEFAULT_AUTOMATION_CUSTODY = PER_VENUE_THREAD_ACCOUNT_POSTING_KEY_ONLY
HIVESIGNER_OFFLINE_MODE = VALID_ALTERNATIVE__NOT_DEFAULT_DEPENDENCY
ACCOUNT_BASED_GLOBAL_SIGNER = NOT_SELECTED_AS_DEFAULT
MERCHANT_ACTIVE_OR_OWNER_SERVER_CUSTODY = FORBIDDEN
COMMUNITY_OWNER_SERVER_CUSTODY = FORBIDDEN
CONTAINER_REWARD_STRATEGY = ROUTE_AUTHOR_REWARD_TO_TRUSTED_MERCHANT_BENEFICIARY
VENUE_USER_BENEFICIARY = SELECTED_FOR_BOUNDED_IMPLEMENTATION
HIVE_VENUES_CREATOR_DONATION = SELECTED_FOR_BOUNDED_IMPLEMENTATION
ROTATION_NUMERIC_THRESHOLD = DEFERRED_PENDING_MEASUREMENT
LIVE_HIVE_MUTATION = NONE
PRODUCTION_MUTATION = NONE
```

This adjudication applies the criteria frozen in `HIVE_IDENTITY_KEY_MANAGEMENT_BENEFICIARY_AUDIT_CRITERIA_FREEZE_0_1_0.md`. It is an architecture/product decision record, not authorization to modify real accounts, keys, community roles, beneficiaries, production secrets, or deployed behavior.

## Evidence classes

### Canonical repository evidence

1. Fourth Street currently binds:
   - `communityId = hive-108590`
   - `officialAccount = fourthstreetbar`
   - `threadsContainerAccount = fourthst.threads`
   - `paymentMerchantAccounts = [fourthstreetbar]`
2. Venue validation treats official and Threads accounts as separate semantic fields but does not require distinct values.
3. `buildThread()` uses the patron's account as the new reply author and requires the resolved parent author to equal `config.hive.threadsContainerAccount`.
4. `getLatestThreadContainer()` currently resolves the active container by asking Bridge for the Threads account's account posts and selecting the latest top-level post by that account.
5. `PostingAuthorityVerifier` supports both key-authority and account-authority traversal; `isDirectAccountAuthorized()` recognizes a signer present in another account's Posting `account_auths` at sufficient weight.
6. Historical delegated-posting mode already distinguishes an author account from the Keychain signer and verifies live Posting delegation before preflight.
7. Current beta/production patron writes remain Keychain self-signing. The ordinary application has no accepted autonomous server signer.
8. Current post/thread builders emit only `comment`; there is no inherited beneficiary implementation to preserve.
9. Existing preflight envelopes fingerprint the full operation vector, giving beneficiary composition a natural exact-review boundary.

### Current public Hive protocol evidence

Public Hive developer documentation establishes:

- `comment_options` normally accompanies `comment` in the same transaction;
- beneficiary lists must be non-empty when present, unique, account-sorted, and total no more than 100%; current witness policy allows up to eight beneficiaries;
- `comment_options` can be authorized by Posting authority;
- direct RC delegation is available without transferring stake ownership and can be initiated with Posting authority;
- Hive communities expose a distinct `owner` identity while ordinary accounts may hold `admin` roles;
- recurrent transfers move a fixed liquid-asset amount on a schedule and are not a dynamic balance sweep;
- HiveSigner supports scoped OAuth authorization and an offline code flow with a refresh token that remains usable until revoked.

Primary reference URLs at adjudication time:

- https://developers.hive.io/apidefinitions/broadcast-ops.html
- https://developers.hive.io/quickstart/authentication.html
- https://docs.hivesigner.com/h/guides/get-started/hivesigner-oauth2
- https://docs.hivesigner.com/h/guides/get-started/integrate-hivesigner
- https://hivedocs.info/tools/rc/delegation/2022/08/14/direct-rc-delegation-documentation.html

No reliable read-only source was obtained in this audit for the **actual current Posting/Active/Owner authority contents or community team roles** of Fourth Street's live accounts. Those facts remain unverified and must be read independently before any real migration.

## A — Identity-role model

### Selected: A3 — dedicated Threads identity + explicit container semantics

The dedicated Threads account now has a concrete runtime purpose beyond branding or historical convention.

The current resolver treats the latest top-level post by `threadsContainerAccount` as the active container. If the role were collapsed into the ordinary merchant account, a normal merchant profile/root post could be mistaken for the Threads container. A dedicated automation-only account prevents that collision under current behavior and preserves existing Fourth Street Threads ancestry.

However, account isolation alone is not a sufficient long-term semantic identifier. New machine-created roots should carry an explicit Hive-Venues container marker in `json_metadata`, for example a versioned structure equivalent to:

```json
{
  "app": "...",
  "hive_venues": {
    "kind": "threads-container",
    "version": 1,
    "venue_id": "..."
  }
}
```

The exact field spelling is implementation detail, but the invariant is not: **machine-created containers must be distinguishable from arbitrary top-level posts without trusting title text or newest-post position alone**.

### Compatibility rule

Existing unmarked Fourth Street container history must remain readable. A future resolver may use a migration-safe sequence:

1. scan a bounded recent set for the newest valid marked container;
2. if none exists yet, fall back to the historical newest-root-by-dedicated-account behavior;
3. after the first valid marked machine container is observed, prefer marked containers as authoritative.

No historical on-chain content is rewritten.

## Operator key burden after A3

The platform may still involve three Hive **identities**, but ordinary venue operation should not require three daily key-management workflows:

### Merchant identity

```text
ROLE = ORDINARY_VENUE_AND_REWARD_IDENTITY
DEFAULT = officialAccount
CUSTODY = MERCHANT
SERVER_PRIVATE_KEY = NO
```

### Community identity

```text
ROLE = PROTOCOL_OWNER_RECOVERY_BOUNDARY
DAILY_OWNER_KEY_USE = NO
ROUTINE_ADMIN = DELEGATE_TO_ORDINARY_ACCOUNT_WHERE_SUPPORTED
SERVER_OWNER_OR_ACTIVE_KEY = NO
```

### Threads service identity

```text
ROLE = LOW_VALUE_AUTOMATED_CONTAINER_AUTHOR
NORMAL_SERVER_AUTHORITY = POSTING_ONLY
ACTIVE_KEY_ON_SERVER = NO
OWNER_KEY_ON_SERVER = NO
MEANINGFUL_LIQUID_BALANCE = AVOID
MEANINGFUL_OWNED_STAKE = NOT_REQUIRED
RESOURCE_CREDITS = MAY_BE_DELEGATED
```

This is the key-management reduction: **protocol-role count is not daily-key-set count**.

## B — Automated Threads signing/custody

### Default selected: B1 — per-venue dedicated Threads Posting key only

For the accepted isolated one-venue-per-runtime default, the simplest bounded signer is the Posting private key of that venue's low-value Threads service account, stored as a dedicated runtime secret and exposed only to a narrow container-lifecycle subsystem.

Reasons:

1. compromise does not expose merchant or community Active/Owner authority;
2. the credential is scoped by Hive authority class to the low-value service identity;
3. one isolated runtime compromises one venue's automation identity rather than a shared fleet signer;
4. there is no mandatory third-party signing-service availability dependency;
5. operator setup is conceptually simple: provision one low-value service account Posting credential once, not repeatedly sign rotations;
6. rotation/recovery remains possible using stronger account authority held outside the server.

### Required application-level restriction

Hive Posting authority can perform more than the two operations this subsystem needs. Therefore the application must **not** expose a generic server-side Posting-key broadcaster.

The service signer must be structurally limited to a container operation builder that can emit only the approved machine-root operation set, initially:

```text
comment
+
comment_options
```

for exactly `threadsContainerAccount`, with canonical container metadata and the adjudicated merchant reward beneficiary.

No arbitrary post target, vote, follow, custom-json, reward claim, transfer, or user-supplied operation vector may pass through this service signer.

A stolen raw Posting key can still be abused outside the application, so the account itself must remain low-value and recoverable. The application allowlist is defense in depth, not a claim that raw-key compromise is impossible.

### Secret storage requirement

The service Posting key is deployment secret material. It must never enter:

- `venue-source.json`;
- venue package content;
- public authoring state;
- Git;
- logs;
- generated portable workspace source artifacts unless a separately designed encrypted secret-injection layer exists.

Implementation should prefer a dedicated OS/runtime secret file or credential facility with restrictive permissions rather than ordinary operator-edited JSON. Exact deployment mechanism is deferred to implementation qualification.

### B2 — account-based delegated signer: valid but not default

The repository already contains the verification primitives needed for account-based Posting delegation. This remains useful evidence and may be valuable in special deployments.

It is not selected as the default because:

- one global signer delegated by many venues creates a fleet-wide compromise radius;
- one signer account per venue adds another account without reducing the number of runtime secrets;
- for a dedicated low-value Threads account, author/signer indirection buys less than it did for the historical merchant-delegation pilot.

### B3 — HiveSigner offline authorization: supported alternative, not default

HiveSigner can avoid storing the service account's raw Posting private key on the venue runtime. Offline OAuth can provide refreshable scoped authorization for `comment`/`comment_option` style operations.

It is not the mandatory default because it adds:

- an external availability dependency for unattended container rotation;
- application/client registration and client-secret management;
- access/refresh-token custody;
- another provider-specific failure and recovery model.

A later implementation may support `hivesigner` as an alternate service-signer mode for operators who prefer provider-mediated revocation over local raw Posting-key custody.

### B4 — manual rotation: not selected

Manual Keychain signing of every new container defeats the operator-QoL reason for the service identity and is not selected as normal operation. Manual rotation remains a recovery path.

## C — Container discovery and rotation

### Selected semantics: C2 — explicit marker with legacy fallback

New automatic roots must be explicitly marked. The resolver should scan a bounded recent account-post window for the newest valid marker rather than simply accepting the newest arbitrary root.

### C3 local index: deferred

A durable local container pointer may later improve performance, but chain observation should remain authoritative and there is no current evidence that a local index is necessary.

### Rotation trigger: numeric threshold deferred

No hard protocol child-count ceiling has been established. The audit therefore refuses to invent a number such as 500 or 1,000 Threads.

A bounded follow-up benchmark should measure at least:

- Bridge/Hivemind discussion retrieval latency versus direct-child count;
- response size versus child count;
- normalization/rendering cost in Hive-Venues;
- pagination/flattening behavior;
- usability of historical Thread retrieval;
- recovery when a current container is missing or malformed.

The eventual rotation policy may combine:

- measured child-count threshold;
- maximum age;
- explicit operator request;
- container health/failure condition.

Until such evidence exists, `ROTATION_NUMERIC_THRESHOLD = DEFERRED_PENDING_MEASUREMENT`.

## D — Container reward economics

### Primary selected: D2 — direct merchant beneficiary routing

Machine-created container roots should remain eligible for legitimate reward upside. The preferred transaction is root `comment` plus `comment_options` that sends the adjudicated author-reward share directly to the trusted merchant reward identity.

Initial target for a pure infrastructure container:

```text
CONTAINER_AUTHOR_REWARD_BENEFICIARY = TRUSTED_MERCHANT_REWARD_IDENTITY
TARGET_WEIGHT = 100_PERCENT_OF_AUTHOR_REWARD
SERVER_ACTIVE_AUTHORITY = NOT_REQUIRED
```

The implementation must preserve normal payout/voting option semantics except for the intentional beneficiary extension; exact protocol field values must be constructed and tested rather than guessed.

### Why D2 is preferred

- captures rather than destroys reward upside;
- avoids intentionally accumulating author reward on the automation account;
- avoids granting the production server transfer authority;
- economically attributes the venue infrastructure content to the venue;
- composes naturally with the same `comment_options` machinery needed for user-content beneficiary policy.

### Residual funds

Direct transfers sent *to* the service account are outside author-beneficiary routing. If residual liquid value accumulates unexpectedly:

- stronger authority remains outside the Hive-Venues server;
- manual/offline handling is acceptable initially;
- a separately established native recurrent transfer or provider-managed mechanism may be evaluated, but a fixed recurrent amount must not be misrepresented as a dynamic balance sweep.

The service signer does not receive Active authority solely to automate residual balance movement.

## E — Venue user-content beneficiary policy

### Selected for bounded implementation

Initial product contract:

```text
DEFAULT = OFF
VENUE_CONTROL = OFF_OR_ON_PLUS_PERCENTAGE
INITIAL_RECIPIENT = officialAccount
INITIAL_ELIGIBLE_ACTIONS = post:community + thread
PROFILE_POST = EXCLUDED
ORDINARY_COMMENT = EXCLUDED
HIDDEN_BENEFICIARY = FORBIDDEN
DISCLOSURE_BEFORE_KEYCHAIN = REQUIRED
EXACT_OPERATION_FINGERPRINT = REQUIRED
```

`officialAccount` is selected as the initial trusted venue beneficiary destination because it is already the canonical venue identity and avoids adding a new ordinary operator account textbox. If future real venues need social identity and reward identity separated, that is evidence for a new **protected** reward-recipient field, not for an unrestricted composer/operator textbox.

The venue percentage is a venue publishing policy, not a per-post optional donation. A posting user can decline by declining to sign/publish through that venue, but Hive-Venues must not label the venue share as user-optional when it is configured as required policy.

The composer and final review must state the exact venue allocation in plain language.

## F — Voluntary Hive-Venues creator donation

### Selected for bounded implementation

Initial product contract:

```text
PLATFORM_AVAILABILITY = TOGGLEABLE
PLATFORM_RECIPIENT = TRUSTED_PLATFORM_CONFIGURATION
PLATFORM_PERCENTAGE = ADJUSTABLE
INITIAL_ELIGIBLE_ACTIONS = post:community + thread
USER_CHECKBOX = PRESENT_WHEN_ELIGIBLE_AND_PLATFORM_FEATURE_ENABLED
CHECKBOX_DEFAULT = UNCHECKED_FOR_EACH_NEW_POST
LABEL_INCLUDES_EXACT_PERCENTAGE = YES
USER_MAY_UNCHECK = YES
```

The initial eligible-content scope matches the venue beneficiary scope so the platform has one predictable beneficiary-capable publishing boundary.

Suggested user-facing semantics:

```text
[ ] Donate 2% of this post's author rewards to the creator of Hive-Venues
```

The exact wording/percentage is presentation configuration, but the consent properties are mandatory: visible, voluntary, per-post, and unchecked by default.

## Canonical beneficiary composition

Venue share and creator donation must not be implemented as separate append-only patches to operation construction.

A single canonical composer must calculate the final economic vector before preflight.

### Required algorithm

1. Determine action eligibility.
2. Add venue-policy reason if enabled and applicable.
3. Add creator-donation reason only if platform feature is enabled and the user checked it.
4. Resolve all recipients from trusted configuration, never untrusted composer text.
5. Validate integer basis-point weights.
6. Aggregate duplicate recipient accounts protocol-side.
7. Retain separate reason labels for UI even when recipients merge.
8. Reject total beneficiary weight above 10,000 basis points.
9. Sort protocol entries ascending by account.
10. Emit the exact `comment_options` in the same operation vector as the new content.
11. Fingerprint the complete operation vector.
12. Present venue share, creator donation, and author remainder before Keychain.
13. Never rescale, drop, add, or rewrite beneficiary weight after review.

### Insufficient remaining share

If a mandatory venue policy leaves insufficient room for the configured voluntary creator donation, Hive-Venues must not silently reduce either value. The creator-donation checkbox should be unavailable for that post with a plain explanation, or the preflight should reject if state changed after composition.

### Example

For a 5% venue policy plus an opted-in 2% Hive-Venues donation:

```text
Venue beneficiary = 5%
Hive-Venues creator donation = 2%
Author remainder = 93%
```

If both logical reasons resolve to the same Hive account, the protocol vector contains one 7% recipient entry, while the review still shows the 5% venue reason and 2% creator-donation reason separately.

## User review and Keychain boundary

Beneficiaries alter the author's economics and therefore belong in the existing preflight trust boundary.

The review must show, at minimum:

- content action/destination;
- author account;
- each logical beneficiary reason, recipient, and percentage;
- total beneficiary allocation;
- author's remaining percentage;
- that the operation will be signed with Posting authority.

The existing operation fingerprint must cover both `comment` and `comment_options`. Keychain signs the exact vector the user reviewed. A beneficiary composition failure is a failed preflight, not permission to publish without the configured economics.

## Community identity conclusion

The community account remains a distinct Hive protocol identity. Public Bridge examples show a community identity as `owner` while ordinary accounts may hold `admin` roles.

Therefore the target operating model is:

```text
COMMUNITY_OWNER_CREDENTIAL = RECOVERY_RARE_ADMINISTRATION
VENUE_OPERATOR_DAILY_COMMUNITY_ROLE = ORDINARY_ACCOUNT_ADMIN_WHERE_SUPPORTED
SERVER_COMMUNITY_OWNER_KEY = NEVER
```

The actual current Fourth Street community role assignment remains unverified in this audit and must be checked read-only before any one-time role adjustment.

## Required implementation gates before any production use

No production use is authorized until a separately qualified implementation proves:

1. service signer can emit only canonical marked Threads roots + adjudicated `comment_options`;
2. server contains no merchant/community Active or Owner keys;
3. service secret cannot enter logs, venue source, Git, screenshots, artifacts, or ordinary authoring state;
4. legacy Fourth Street Threads remain readable;
5. marker-aware resolver cannot select unrelated root posts;
6. beneficiary vector composition obeys sorting, uniqueness, basis-point, and total-weight constraints;
7. venue beneficiary defaults off for new venue configuration;
8. creator donation defaults unchecked per new eligible post;
9. exact final operation vector is visible/fingerprinted before user Keychain signing;
10. user-content beneficiary behavior is absent from excluded profile posts and ordinary comments;
11. no automatic retry can duplicate an ambiguous Hive write;
12. server-side machine broadcast has its own idempotency/observation strategy before unattended use;
13. Ubuntu and Windows qualification reflects actual implementation portability requirements;
14. a read-only live-account preflight verifies the intended service/community/merchant account roles before real migration.

## Deferred follow-ups

```text
THREADS_CONTAINER_ROTATION_BENCHMARK = REQUIRED_BEFORE_NUMERIC_ROTATION_POLICY
LIVE_FOURTH_STREET_AUTHORITY_ROLE_PREFLIGHT = REQUIRED_BEFORE_REAL_ACCOUNT_CHANGE
RESIDUAL_SERVICE_ACCOUNT_BALANCE_AUTOMATION = OPTIONAL__NOT_REQUIRED_FOR_INITIAL_IMPLEMENTATION
HIVESIGNER_SERVICE_MODE = OPTIONAL_FUTURE_ALTERNATE
DEDICATED_REWARD_BENEFICIARY_ACCOUNT_FIELD = DEFER_UNTIL_REAL_VENUE_NEED
```

## Separate engineering-health operation

This audit does not alter the deterministic test inventory or Windows CI scope.

The next engineering-health operation is:

```text
TEST_SUITE_LIVE_INVARIANT_AND_CROSS_PLATFORM_SCOPE_AUDIT
```

Its task is to determine which existing tests protect unique live invariants and which genuinely need Windows execution before any deletion or scope reduction.

## Final boundaries

```text
ARCHITECTURE_ADJUDICATED = YES
PRODUCT_BENEFICIARY_CONTRACT_SELECTED = YES
SERVICE_SIGNER_DEFAULT_SELECTED = YES
REAL_HIVE_MUTATION_AUTHORIZED = NO
REAL_KEY_OR_AUTHORITY_CHANGE_AUTHORIZED = NO
BENEFICIARY_ACTIVATION_AUTHORIZED = NO
PRODUCTION_DEPLOYMENT_AUTHORIZED = NO
```
