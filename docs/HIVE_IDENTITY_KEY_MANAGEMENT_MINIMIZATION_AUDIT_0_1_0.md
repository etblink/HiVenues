# Hive-Venues — Hive Identity and Key-Management Minimization Audit 0.1.0

## Operation

```text
OPERATION = VENUE_HIVE_IDENTITY_AND_KEY_MANAGEMENT_MINIMIZATION__BOUNDED_AUDIT
ISSUE = 126
BASE_MAIN = 378332575efb36c1b7e4035cfbd739a416abea70
BASE_TREE = 377e4c2738f20500102c850a46b550b8589d6980
AUDIT_SCOPE = REPOSITORY_LOCAL_EVIDENCE_AND_DESIGN_ONLY
LIVE_HIVE_MUTATION = NOT_AUTHORIZED
REAL_KEY_GENERATION_OR_PROVISIONING = NOT_AUTHORIZED
PRODUCTION_MUTATION = NOT_AUTHORIZED
```

## Controlling question

What is the smallest defensible set of Hive identities, daily key responsibilities, and server-held credentials that lets an ordinary venue operate Hive-Venues without weakening Hive protocol, recovery, payment, or automation boundaries?

The audit distinguishes **protocol roles** from **venue-owned identities**, and both from **server-custodied private credentials**. A protocol role does not justify a new account or a server key merely because the role exists.

## Adjudication

```text
MINIMUM_ORDINARY_VENUE_OWNED_IDENTITIES = 2
MINIMUM_ORDINARY_SERVER_HIVE_PRIVATE_CREDENTIALS = 1
SERVER_CREDENTIAL_CLASS = THREADS_SERVICE_POSTING_ONLY
MERCHANT_PRIVATE_KEYS_ON_SERVER = 0
THREADS_ACTIVE_PRIVATE_KEYS_ON_SERVER = 0
THREADS_OWNER_PRIVATE_KEYS_ON_SERVER = 0
RECURRENT_TRANSFER = NONE
AUTOMATIC_SWEEP = NONE
THREADS_MERCHANT_ACTIVE_ACCOUNT_AUTH = OPTIONAL_CLEANUP_ONLY__NOT_POSTING_ACTIVATION_PREREQUISITE
THREADS_RC_OPERATING_MODEL = DELEGATED_RC_PREFERRED__MEANINGFUL_OWNED_STAKE_NOT_REQUIRED_AS_OPERATING_BUDGET
AUDIT_RESULT = PASS__TWO_VENUE_IDENTITIES__ONE_SERVER_POSTING_CREDENTIAL__ZERO_SERVER_ACTIVE_OWNER_CUSTODY
```

For Fourth Street, the two ordinary venue-owned identities are:

1. `@fourthstreetbar` — official merchant/payment/operator identity; merchant-controlled; interactive private signing remains Keychain-side.
2. `@fourthst.threads` — low-value automation principal for Threads-container lifecycle; the only future server Hive credential that may be separately authorized is its exact **Posting** credential.

This two-account result is a **minimum ordinary model**, not a prohibition on venues using additional staff, community, treasury, or recovery accounts when they have a real operational reason.

## Role inventory

| Role | Generic model | Fourth Street mapping | Private signing boundary | Server Hive private credential? | Adjudication |
| --- | --- | --- | --- | --- | --- |
| Venue official / merchant | One venue-controlled account | `@fourthstreetbar` | Hive Keychain / merchant custody | **No** | Required ordinary identity |
| Payment recipient | Alias to official merchant unless venue has a real treasury need | `@fourthstreetbar` | Recipient only for ordinary Pay flow | **No** | Does not require another account |
| Threads automation principal | Dedicated low-value account | `@fourthst.threads` | Future separately authorized machine Posting signer | **Posting only** | Required while machine-managed Threads containers remain product architecture |
| Hive community identity | Existing `hive-...` protocol object / recovery boundary | `hive-108590` | Community-owner/recovery custody outside Hive-Venues; routine roles delegated where Hive permits | **No** | Protocol role, not server-key role |
| Onboarding creator | Configured account with ACT/HP resources; may alias official merchant | Reference deployment may configure the venue-controlled creator | Browser Keychain Active signing | **No** | Operator role, not server signer |
| Moderation / staff | Venue-selected user accounts or local policy identities | Venue-specific | User Keychain / application-local authorization as applicable | **No** | No structural extra venue key required |
| Patron / creator | User-owned Hive account | Per user | User Keychain | **No** | Never venue/server custody |
| RC sponsor / delegator | Any account legitimately supplying RC | Venue/owner/service-selected | Delegator's own signing boundary | **No credential required by Threads runtime** | Funding relationship, not runtime identity requirement |
| Recovery / Owner | Break-glass control for venue-owned Hive accounts | Merchant/venue-controlled recovery arrangement | Outside Hive-Venues | **No** | Must remain out of ordinary application custody |

### Role-count conclusion

The product should present onboarding and deployment in terms of **two ordinary venue identities**, not a list of every protocol role:

```text
VENUE_OFFICIAL_MERCHANT_ACCOUNT
+
THREADS_AUTOMATION_ACCOUNT
=
MINIMUM_ORDINARY_VENUE_HIVE_IDENTITY_MODEL
```

Community administration, staff/moderation, onboarding creator, payment recipient, RC sponsor, patron accounts, and recovery authorities remain explicit roles, but they do not create additional server-held private credentials. Several may legitimately alias the official merchant account or be delegated to ordinary user accounts.

## Server credential model

Current `src/social/threads-service-signer.js` accepts only envelopes whose declared authority is `Posting`, and the canonical seam remains synthetic-test-only. `src/social/threads-service-activation-readiness.js` independently rejects `active`, `owner`, and `memo` as server credential classes.

The accepted future machine exception is therefore deliberately narrow:

```text
ACCOUNT = venue.hive.threadsContainerAccount
FOURTH_STREET = fourthst.threads
PRIVATE_CREDENTIAL_CLASS = Posting
ALLOWED_PURPOSE = Threads container comment/comment_options lifecycle
MERCHANT_POSTING_KEY_ON_SERVER = FORBIDDEN
MERCHANT_ACTIVE_KEY_ON_SERVER = FORBIDDEN
MERCHANT_OWNER_KEY_ON_SERVER = FORBIDDEN
THREADS_ACTIVE_KEY_ON_SERVER = FORBIDDEN
THREADS_OWNER_KEY_ON_SERVER = FORBIDDEN
THREADS_MEMO_PRIVATE_KEY_ON_SERVER = FORBIDDEN
```

HF28 makes exact authority-tier discipline more important: current Hive security behavior no longer permits a higher-level Active authority to satisfy an operation that specifically requires Posting authority. The application should therefore provision the exact least-privilege tier when live machine signing is separately authorized rather than relying on broader-key fallback.

## Threads container economics

Current `buildThreadsContainerRoot()` composes:

- one `comment` by the Threads automation account;
- one `comment_options` for the same root;
- a single beneficiary equal to the venue official account at weight `10000` (100% of author rewards);
- Posting authority;
- `recurrentTransfer: false`.

For Fourth Street this means the normal container-author economic path is:

```text
THREADS_ROOT_AUTHOR = @fourthst.threads
THREADS_ROOT_AUTHOR_REWARD_BENEFICIARY = @fourthstreetbar
BENEFICIARY_WEIGHT = 10000
RECURRENT_TRANSFER = NONE
```

The Threads account therefore does not need a recurring transfer merely to route normal container author rewards to the merchant.

## Reward claiming versus liquid-funds cleanup

This distinction is controlling.

### Reward claiming

Hive's current operation reference lists `claim_reward_balance` as satisfiable by the Posting, Active, or Owner role. It converts pending reward balances into account balances. Reward claiming therefore **does not require granting the merchant Active authority over the Threads account**.

Under the accepted 100% container beneficiary policy, normal Threads-container author rewards are already allocated to the official merchant as benefactor rewards; the Threads automation account should not be treated as a normal merchant-revenue accumulation account.

### Existing Hive-Venues “Claim funds” capability

The existing feature named `Claim funds` is not a `claim_reward_balance` operation. `buildThreadsFundsClaim()` prepares ordinary `transfer` operations of **already-liquid HIVE/HBD balances**:

```text
FROM = venue.hive.threadsContainerAccount
TO = venue.hive.officialAccount
AUTHORITY = Active
SIGNER = venue.hive.officialAccount
INTERACTION = Keychain
AUTOMATIC = false
RECURRENT = false
```

The feature currently requires the merchant account to satisfy the Threads account's Active threshold via `active.account_auths`.

Hive's current Active-permission guidance explicitly warns that Active permission enables fund transfers from the granting account. That makes this authority useful for manual cleanup but broader and more consequential than machine Posting authority.

### Adjudication

```text
MERCHANT_ACTIVE_ACCOUNT_AUTH_PURPOSE = OPTIONAL_MANUAL_LIQUID_BALANCE_CLEANUP_ONLY
MERCHANT_ACTIVE_ACCOUNT_AUTH_REQUIRED_FOR_THREADS_POSTING_SERVICE = NO
NORMAL_CONTAINER_REWARD_CLAIM_RATIONALE_FOR_ACTIVE_AUTH = INVALID
RETAIN_MANUAL_CLEANUP_CAPABILITY = YES__AS_OPTIONAL_SEPARATE_CAPABILITY
SERVER_ACTIVE_PRIVATE_KEY_REQUIRED = NO
RECURRENT_TRANSFER_REQUIRED = NO
AUTOMATIC_SWEEP_REQUIRED = NO
```

A venue may retain the manual cleanup capability if it wants a Keychain-reviewed way to move stray liquid HIVE/HBD from the low-value Threads principal to the official merchant. A venue that does not configure that Active account authorization must still be able to qualify and activate the Posting-only Threads machine signer; only the cleanup control should be unavailable/fail closed.

The current product label `Claim funds` is semantically broader than the operation it actually performs. A follow-on repair should consider wording such as **Move Threads balance** or **Transfer Threads balance** so the UI does not imply `claim_reward_balance` semantics.

## Resource Credits

Direct RC delegation exists as a protocol/application operation and can be observed through current RC APIs. Hive's direct-RC delegation documentation describes `delegate_rc` as a `custom_json` operation using Posting authority, while the current Developer Portal exposes direct delegation state through `condenser_api.list_rc_direct_delegations` (since HF26).

The Threads automation identity therefore does not need meaningful owned stake merely to finance routine RC consumption. The preferred operating model is:

```text
THREADS_ACCOUNT_VALUE_PROFILE = LOW_VALUE_AUTOMATION_PRINCIPAL
RC_SOURCE = DIRECT_DELEGATION_WHERE_PRACTICAL
MEANINGFUL_OWNED_HP_REQUIRED_AS_OPERATING_BUDGET = NO
LIQUID_BALANCE_TARGET = MINIMIZE__NOT_A_TREASURY
```

This does not require Hive-Venues to custody the RC delegator's key. RC provisioning is an external setup/funding relationship whose live mutation remains separately authorized.

## Current implementation over-constraint

`src/social/threads-service-activation-readiness.js` currently computes machine authority readiness using both:

- direct Posting-key satisfaction; **and**
- direct merchant Active account authorization on the Threads account.

It also proposes an Active `account_auths` mutation when merchant Active authorization is absent.

That coupling is stronger than the minimum authority actually needed for machine Threads Posting. It conflates two distinct capabilities:

```text
CAPABILITY_A = MACHINE_THREADS_CONTAINER_POSTING
REQUIRED_AUTHORITY_A = THREADS_POSTING

CAPABILITY_B = OPTIONAL_MANUAL_TRANSFER_OF_STRAY_THREADS_LIQUID_BALANCE
REQUIRED_AUTHORITY_B = THREADS_ACTIVE_SATISFIED_BY_MERCHANT_ACCOUNT_AUTH
```

### Finding

```text
FINDING_001 = THREADS_ACTIVATION_READINESS_OVERCONSTRAINS_POSTING_WITH_OPTIONAL_ACTIVE_CLEANUP
SEVERITY = MEDIUM
TYPE = LEAST_PRIVILEGE_AND_CAPABILITY_COUPLING
REPAIR_REQUIRED_BEFORE_LIVE_THREADS_ACTIVATION = YES
LIVE_EFFECT_AUTHORIZED_BY_THIS_AUDIT = NO
```

The next repository operation should decouple these readiness domains before Issue #110 is eligible for any live activation decision.

## CI criterion-to-oracle map

`package.json` defines `npm test` as `node --test --test-concurrency=1 test/*.test.js`, and `npm run check` includes `npm test`; therefore every named test file below is inside the ordinary selected deterministic CI envelope.

| # | Frozen criterion | Class | Executable oracle / evidence | Audit status |
| --- | --- | --- | --- | --- |
| 1 | Threads service signer accepts Posting envelopes only and rejects other authority classes | CI_PROVABLE | `test/threads-service-signer.test.js` — `synthetic service signer rejects every non-Posting authority envelope` | **CLOSED by this audit**; negative regression added after a CI coverage defect was found |
| 2 | Server credential boundary forbids Active/Owner/Memo | CI_PROVABLE | `test/threads-service-activation-readiness.test.js` — `Active, Owner, or Memo server credentials are always activation blockers`; private-key-shaped input regression | PASS |
| 3 | Threads root sends 100% author rewards to official venue and has no recurrent transfer | CI_PROVABLE | `test/threads-foundation.test.js` — `machine root routes 100 percent of author reward to official venue account` | PASS |
| 4 | Retained liquid cleanup is manual, non-recurrent, non-automatic, merchant-Keychain signed | CI_PROVABLE | `test/threads-foundation.test.js` — one-time Active Keychain transfer; `test/threads-funds-claim-client.test.js` — merchant signer and cancellation/no-broadcast | PASS |
| 5 | Onboarding creator Active operations stay browser-Keychain signed rather than server-key signed | CI_PROVABLE | `test/m19-3-in-person-onboarding.test.js` — beta+Keychain activation and custody/governance source contract; `public/js/onboarding-staff.js` broadcast uses configured creator + `authority: 'Active'` | PASS |
| 6 | Complete role inventory distinguishing protocol roles from daily/server keys | HUMAN_REVIEW | Role inventory in this document + source review | PASS |
| 7 | Adjudicate merchant Active account auth | HUMAN_REVIEW | Protocol + source analysis above | **OPTIONAL_CLEANUP_ONLY__NOT_POSTING_PREREQUISITE** |
| 8 | Decide minimum ordinary venue identity model | HUMAN_REVIEW | Role inventory + current venue/package/config implementation | **TWO_VENUE_IDENTITIES** |
| 9 | Bind current Hive protocol evidence | EXTERNAL_EVIDENCE | Evidence table below | PASS |
| 10 | Identify over-constraint/missing oracle | MIXED | Source inspection + criterion 1 regression + Finding-001 | **PASS__ONE_CI_COVERAGE_DEFECT_REPAIRED__ONE_FOLLOW_ON_DECOUPLING_REPAIR_REQUIRED** |
| 11 | No live effects | NOT_APPLICABLE / HARD_BOUNDARY | Git candidate scope and Project Lead review | PASS if candidate remains repository-local |

### CI coverage finding

Before this audit, `ThreadsServiceSigner.broadcastEnvelope()` contained a non-Posting rejection guard, but `test/threads-service-signer.test.js` had no explicit negative test for Active/Owner/Memo envelopes. Under the Project Lead CI doctrine this was a `CI_COVERAGE_DEFECT`, not a reason to trust source inspection indefinitely. This audit adds the missing regression without widening the runtime signer or changing live behavior.

## Protocol evidence table

All external sources below were rechecked on **2026-09-02**.

| Evidence | Current support | Source |
| --- | --- | --- |
| `comment` accepts Posting-level authorization | Operation reference lists roles `posting active owner` | Hive Developers, Broadcast OPS — https://developers.hive.io/apidefinitions/broadcast-ops.html |
| `comment_options` uses the same authorization family and supports sorted beneficiaries up to 100% of author rewards | Operation reference documents roles and beneficiary semantics/limits | Hive Developers, Broadcast OPS — https://developers.hive.io/apidefinitions/broadcast-ops.html |
| `claim_reward_balance` can be authorized at Posting level | Operation reference lists roles `posting active owner` | Hive Developers, Broadcast OPS — https://developers.hive.io/apidefinitions/broadcast-ops.html |
| Liquid `transfer` is a higher-consequence funds operation | Operation reference documents transfer separately; current application uses Active | Hive Developers, Broadcast OPS — https://developers.hive.io/apidefinitions/broadcast-ops.html |
| Active `account_auths` can let another account transfer funds | Tutorial explicitly describes fund-transfer authority and cautions about Active permission | Hive Developers, Grant Active Permission — https://developers.hive.io/tutorials-javascript/grant_active_permission.html |
| Direct RC delegations are observable | `condenser_api.list_rc_direct_delegations`, since HF26 | Hive Developers, Condenser API — https://developers.hive.io/apidefinitions/condenser-api.html |
| `delegate_rc` uses a `custom_json` Posting authority | Direct-RC documentation describes Posting authorization and delegation mechanics | Hive Chain Documentation — https://hivedocs.info/tools/rc/delegation/2022/08/14/direct-rc-delegation-documentation.html |
| HF28 enforces stricter authority-level matching | Release notes: Active can no longer satisfy a Posting-level requirement | OpenHive Hive releases — https://github.com/openhive-network/hive/releases |
| HF28 is current, activated 2025-11-19 | Current Hive roadmap and 2025 retrospective record HF28 on November 19, 2025 | https://hive.io/en/roadmap/ and https://hive.blog/happynewyear2026/@hiveio/hive-reflects-on-2025-a-year-of-relentless-building |

## Generic venue contract resulting from this audit

A successor-native venue should be able to express the same authority model without Fourth Street literals:

```text
venue.hive.officialAccount
  PURPOSE = merchant identity + payment recipient + eligible operator roles
  SERVER_PRIVATE_KEY = NONE
  INTERACTIVE_SIGNING = KEYCHAIN

venue.hive.threadsContainerAccount
  PURPOSE = low-value machine Threads lifecycle principal
  SERVER_PRIVATE_KEY = POSTING_ONLY__SEPARATELY_AUTHORIZED
  RC = DELEGATED_WHERE_PRACTICAL
  NORMAL_CONTAINER_AUTHOR_REWARD = 100_PERCENT_TO_OFFICIAL_ACCOUNT
  ACTIVE_ACCOUNT_AUTH_TO_OFFICIAL = OPTIONAL_MANUAL_LIQUID_CLEANUP_ONLY
  ACTIVE_OWNER_PRIVATE_KEYS_ON_SERVER = NEVER

venue.hive.communityId
  PURPOSE = protocol/community namespace
  SERVER_PRIVATE_KEY = NONE
  ROUTINE_ADMINISTRATION = DELEGATE_ROLES_WHERE_SUPPORTED
```

Payment, onboarding, staff, moderation, patron, and recovery responsibilities compose around these identities without implicitly creating more server credentials.

## Follow-on repair route

The evidence justifies exactly one next repository repair before any live Threads activation work:

```text
NEXT_OPERATION = THREADS_POSTING_ACTIVATION_LIQUID_CLEANUP_DECOUPLING__BOUNDED_REPAIR
PURPOSE = SEPARATE_POSTING_SERVICE_READINESS_FROM_OPTIONAL_ACTIVE_LIQUID_CLEANUP_READINESS
ISSUE_110_LIVE_ACTIVATION = STILL_NOT_AUTHORIZED
```

That repair should, at minimum:

1. make Posting service readiness depend on exact Threads identity, direct threshold-satisfying Posting key, Posting-only server credential inventory, exact configured public-key binding, and separately qualified real runtime signer implementation;
2. move merchant Active `account_auths` evaluation into a distinct optional liquid-cleanup readiness result;
3. ensure absence of cleanup authorization never blocks Posting-only machine readiness;
4. keep the cleanup UI absent/disabled/fail-closed when Active account authorization is missing;
5. preserve zero server Active/Owner/Memo private-key custody;
6. preserve no recurrent transfer and no automatic sweep;
7. add regressions proving both capability domains are independent;
8. consider renaming `Claim funds` to accurately describe a liquid-balance transfer;
9. update Issue #110's live-activation checklist only after the repository repair is canonically accepted.

## Stop boundary

This audit does **not** authorize or perform:

- an on-chain account or authority mutation;
- generation, provisioning, rotation, or storage of a real Hive private key;
- a live Hive or Keychain broadcast;
- a funds transfer or reward claim;
- RC delegation;
- production deployment or runtime signer activation;
- DNS/VPS/systemd/Caddy/firewall mutation;
- real venue outreach or admission;
- public production authoring activation.

The audit is complete only as repository-local evidence/design. Issue #110 remains the separate external-effect gate for any eventual live Threads service activation.
