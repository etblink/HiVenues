# Hive-Venues Hive Identity, Key-Management, and Beneficiary Audit — Mid-Audit Criteria Freeze 0.1.0

## Status

```text
OPERATION = VENUE_HIVE_IDENTITY_AND_KEY_MANAGEMENT_MINIMIZATION__BOUNDED_AUDIT
ARTIFACT = MID_AUDIT_CRITERIA_FREEZE
PRISTINE_PRE_EVIDENCE_PREREGISTRATION = NO
PRELIMINARY_EVIDENCE_ALREADY_OBSERVED = YES
HIVE_WRITE = NONE
ACCOUNT_ROLE_OR_KEY_CHANGE = NONE
PRODUCTION_MUTATION = NONE
```

This record is intentionally **not** represented as a pristine preregistration. The user raised the key-management, Threads automation, reward-capture, venue-beneficiary, and Hive-Venues creator-donation questions conversationally, and preliminary repository/protocol evidence was inspected before this freeze was created.

The purpose of this commit is to freeze the remaining comparison criteria **before final architecture adjudication**, so later reasoning cannot quietly move the goalposts around a preferred custody model.

## Preliminary observations already known before this freeze

The following are admissible prior observations, not post-freeze discoveries:

1. Fourth Street currently references three Hive identities: community `hive-108590`, official/merchant account `fourthstreetbar`, and Threads container account `fourthst.threads`.
2. Hive-Venues' venue schema models the official and Threads roles separately but does not require them to be distinct accounts.
3. Patrons author their own Threads. The configured Threads account is the expected parent/container author, not the author of patron replies.
4. The current Threads resolver selects the latest top-level post authored by `threadsContainerAccount` as the active container. Under that resolver, sharing the Threads role with an ordinary merchant profile account would allow a normal merchant root post to be misclassified as the active Threads container.
5. Hive-Venues already has a `PostingAuthorityVerifier` capable of recognizing both key-based and account-based Posting authorities. Historical delegated-posting code also distinguishes author from signer.
6. Current beta/production patron writes are Keychain self-signing. Autonomous service-account signing is not an accepted general patron-signing mode.
7. Current social operation builders emit `comment` operations only; beneficiary `comment_options` behavior has not yet been implemented.
8. Hive `comment_options` supports Posting-authorized beneficiaries, requires a sorted unique beneficiary vector, permits aggregate allocation up to 100%, and is normally included in the same transaction as content creation.
9. Hive supports direct Resource Credit delegation without transferring stake ownership.
10. Native recurrent transfers move a fixed liquid-asset amount on a schedule; they are not a true dynamic account-balance sweep.
11. HiveSigner supports scoped OAuth authorization and an offline code flow that can yield a non-expiring refresh token until access is revoked; using it would introduce an external signing service dependency and server-side token/client-secret custody rather than raw Hive private-key custody.
12. No trustworthy protocol evidence has established a hard maximum number of direct Threads replies that a single root container can hold. Container rotation must therefore not be justified by an invented hard capacity.
13. The user prefers capturing legitimate container rewards rather than deliberately disabling them, provided authority/custody risk remains bounded.
14. The user wants two distinct user-content beneficiary concepts:
    - an optional venue-configured beneficiary policy; and
    - an optional per-post user donation to the creator of Hive-Venues, with a visible checkbox near the composer.

## Non-negotiable boundaries

Any acceptable architecture must satisfy all of the following:

```text
MERCHANT_ACTIVE_KEY_ON_HIVE_VENUES_SERVER = FORBIDDEN
MERCHANT_OWNER_KEY_ON_HIVE_VENUES_SERVER = FORBIDDEN
COMMUNITY_OWNER_KEY_ON_HIVE_VENUES_SERVER = FORBIDDEN
PATRON_PRIVATE_KEYS_ON_SERVER = FORBIDDEN
HIDDEN_USER_CONTENT_BENEFICIARY = FORBIDDEN
SILENT_BENEFICIARY_WEIGHT_RESCALE = FORBIDDEN
BENEFICIARY_VECTOR_MUST_MATCH_REVIEWED_AND_SIGNED_OPERATION = YES
THREADS_AUTOMATION_AUTHORITY = MINIMUM_REQUIRED_AUTHORITY
REAL_ACCOUNT_OR_AUTHORITY_MUTATION_DURING_AUDIT = FORBIDDEN
PRODUCTION_MUTATION_DURING_AUDIT = FORBIDDEN
```

## Decision A — identity-role model

Compare these outcomes:

### A1 — collapse all practical venue functions toward the merchant account

Community protocol identity remains necessarily distinct, but official posting and Threads-container roles share the merchant account where possible.

### A2 — retain a dedicated Threads automation identity

Community identity remains protocol/recovery-specific, merchant account remains ordinary venue identity, and a low-value Threads account owns machine-created container roots.

### A3 — retain dedicated Threads identity but strengthen container identity semantics

Same as A2, plus active-container discovery must eventually recognize an explicit machine-readable container marker instead of trusting account + newest-root ordering alone.

### A scoring criteria

- ordinary operator key burden;
- namespace correctness under current resolver;
- compromise blast radius;
- recovery/revocation clarity;
- compatibility with existing Fourth Street history;
- migration cost;
- suitability for independently branded future venues;
- avoidable account proliferation.

## Decision B — automated Threads signing/custody

Compare:

### B1 — direct service-account Posting private key on the venue runtime

The runtime holds only the dedicated Threads account Posting private key. Active/Owner remain offline.

### B2 — account-based delegated Posting signer

The Threads account grants Posting authority to a separate signer account; the runtime holds the signer account Posting key rather than the Threads account's direct Posting key.

### B3 — HiveSigner scoped offline authorization

The runtime holds scoped OAuth tokens/client application credentials and broadcasts through HiveSigner rather than storing the Threads account's raw private key.

### B4 — no unattended automation

Merchant or operator signs each container rotation manually.

### B scoring criteria

- maximum on-chain authority exposed by runtime compromise;
- scope of a stolen secret/token;
- revocation path and recovery path;
- third-party availability/dependency;
- number of accounts/secrets created;
- operator setup burden for basic-computer-skill operators;
- suitability for isolated one-venue-per-runtime default;
- auditability and deterministic local testing;
- ability to create root `comment` + `comment_options` without Active authority;
- whether one compromised credential can affect multiple venues.

## Decision C — Threads container discovery and rotation

### C1 — current newest-root-by-account resolver remains sufficient

Accept only if account isolation alone is a durable invariant and accidental/non-container root posts cannot reasonably occur.

### C2 — explicit container marker

A machine-created root includes canonical metadata identifying it as a Hive-Venues Threads container, and discovery scans a bounded recent set for the newest valid marker.

### C3 — explicit marker plus state/index

Same as C2 plus local durable state caches the selected container, with chain observation remaining authoritative.

### Rotation trigger candidates

- container age;
- direct-child/thread count;
- measured Bridge/Hivemind retrieval latency/response behavior;
- explicit operator rotation request;
- malformed/unavailable current container;
- combination of the above.

No numeric child-count or age threshold may be selected without measurement or a separately stated conservative policy rationale.

## Decision D — container reward economics

Compare:

### D1 — zero payout

Set machine root payout to zero.

### D2 — route container author reward to trusted merchant beneficiary

Create root `comment` plus `comment_options` with a beneficiary allocation to the venue's trusted merchant/official reward recipient, avoiding a need to transfer earned author rewards out of the service account afterward.

### D3 — let service account accrue, then recurrent-transfer liquid balance

Evaluate only as a residual mechanism because recurrent transfers use fixed amounts and do not represent a true dynamic sweep.

### D4 — manual/offline residual handling

Use stronger authority outside the production server only when unexpected liquid value actually accumulates.

### D scoring criteria

- reward capture;
- server authority required;
- risk of service-account value accumulation;
- operational complexity;
- robustness across HIVE/HBD/vesting payout forms;
- dependence on external services;
- merchant accounting clarity.

## Decision E — user-authored venue beneficiary policy

Initial candidate contract:

```text
DEFAULT = OFF
VENUE_OPERATOR_CONTROL = OFF_OR_ON_PLUS_PERCENTAGE
RECIPIENT = TRUSTED_VENUE_REWARD_IDENTITY__NOT_ORDINARY_FREEFORM_TEXT
HIDDEN_POLICY = FORBIDDEN
USER_DISCLOSURE = REQUIRED_BEFORE_KEYCHAIN
USER_SIGNS_EXACT_COMMENT_PLUS_COMMENT_OPTIONS = YES
INITIAL_ELIGIBLE_CONTENT = COMMUNITY_ROOT_POSTS_AND_THREADS__COMMENTS_AND_PROFILE_POSTS_EXCLUDED
```

The final adjudication must decide whether this initial scope is acceptable and whether `officialAccount` is a sufficient initial trusted beneficiary destination or a distinct protected reward-beneficiary identity is warranted.

## Decision F — voluntary Hive-Venues creator donation

Initial candidate contract:

```text
PLATFORM_AVAILABILITY = TOGGLEABLE
PLATFORM_PERCENTAGE = ADJUSTABLE
PLATFORM_RECIPIENT = TRUSTED_CONFIGURATION
USER_CONTROL = PER_POST_CHECKBOX
CHECKBOX_DEFAULT = UNCHECKED
PERCENTAGE_VISIBLE_IN_COMPOSER_LABEL = YES
FINAL_REVIEW_SHOWS_ALLOCATION = YES
```

The final adjudication must decide whether creator-donation eligibility should match venue-beneficiary content scope initially and how duplicate beneficiary accounts are combined protocol-side without obscuring distinct UI reasons.

## Beneficiary composition invariants

Any implementation recommendation must require a single canonical composition function that:

1. gathers every applicable beneficiary reason before operation construction;
2. validates account and basis-point weights;
3. merges duplicate recipient accounts by summing weights while retaining human-readable reason breakdown separately;
4. rejects aggregate weight above 100%;
5. sorts protocol recipients ascending by Hive account name;
6. emits no `comment_options` beneficiary extension when there are no active beneficiaries;
7. places `comment_options` in the same preflight operation set as the new content;
8. includes the exact final operation vector in the existing fingerprint/review/Keychain flow;
9. never mutates beneficiary allocation after the user has reviewed the preflight;
10. treats inability to construct the exact valid beneficiary vector as a failed preflight, not a reason to silently remove or reduce a beneficiary.

## Decision G — test/qualification consequence

This audit may identify new tests required to protect identity/custody/beneficiary semantics. It does **not** authorize deleting existing tests or reducing Windows coverage. That remains a separate `TEST_SUITE_LIVE_INVARIANT_AND_CROSS_PLATFORM_SCOPE_AUDIT`.

## Stop condition

The audit may proceed to a final adjudication artifact once repository and current public-protocol evidence are sufficient to choose or explicitly defer A through F without real Hive mutation. Any claim about the **actual current authority keys/roles** of Fourth Street's live accounts must remain `UNVERIFIED_IN_THIS_AUDIT` unless obtained through a trustworthy read-only chain source.
