# Fourth Street Reference Production Operations

This is the living operational model for the Fourth Street reference deployment. Git history retains milestone-specific M6/M14/M16/M17/M19/C2 evidence; this file describes the production state we have actually observed now.

## Current production state

Fresh HV-8 Phase-A read-only observation establishes:

```text
HOST = https://fourthstreetbar.com
PROVIDER = Privex
TOPOLOGY = single-instance-cloudflare-caddy
SERVICE = hive-bar.service
LISTENER = 127.0.0.1:3000
RUNTIME = Node 24.19.0 / npm 11.17.0
ENVIRONMENT = production
WRITE_MODE = beta
SIGNER_MODE = keychain
BUILD = beta-fdb5b5b
COMMIT = fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
TREE = 6420f0ca2392ec4ed968bc2e928151870c3b591c
READY = ready
CURRENT = /opt/hive-bar/releases/fdb5b5b1436c9e41b5869c7ba3bd1f6a92f9165e
LAST_GOOD = /opt/hive-bar/releases/09ff0802bcfe8920eb88ed2f347ddd51253b524a
LAST_GOOD_TREE = 8be25e01902d419ce51fe113f2ff9c09293eb410
ACTIVE_BETA_ENVIRONMENT_SHA256 = c42a3062d8e54dbd6cef8f0715e93e297be50821bfa47996866cf31018db8f97
ACCEPTED_READ_ONLY_ENVIRONMENT_SHA256 = cb8a5895b1d2f06500b5071bc32251b8aa4a3f82f9d138a5806b4c9917ce3868
```

The public `/healthz` identity agrees with the operator-side `current` release identity. `/readyz` reports `ready`. The service and health-check timer were freshly observed active. `last-good` is the exact Git parent release of the running commit.

Runtime source identity: `/healthz` publishes the exact deployed beta build label, commit, and tree. The installed `.hive-bar-commit` and `.hive-bar-tree` files remain the operator-side source of truth.

The deployed beta gate passes with this exact user-side self-signing manifest:

```text
post
comment
vote
follow
unfollow
subscribe
unsubscribe
profile
claim-rewards
wall
inbox
thread
```

The canonical-source beta manifest remains: `post`, `comment`, `vote`, `follow`, `unfollow`, `subscribe`, `unsubscribe`, `profile`, `claim-rewards`, `wall`, `inbox`, `thread`.

Controlled/delegated Hive authority is absent in the observed beta profile:

```text
CONTROLLED_ACCOUNT_COUNT = 0
CONTROLLED_ACTION_COUNT = 0
```

## Current durable capability state

The fresh deployed beta gate and derived read-only semantic observation establish:

```text
PAYMENTS_ENABLED = true
PAYMENT_MERCHANT_COUNT = 1
PAYMENT_STORE = DURABLE__PRESENT_FILE
PAYMENT_STORE_SCHEMA_VERSION = 2

ONBOARDING_ENABLED = true
ONBOARDING_ACTIVE = true
ONBOARDING_CREATOR_CONFIGURED = true
ONBOARDING_STORE = DURABLE__PRESENT_FILE
ONBOARDING_STORE_SCHEMA_VERSION = 1

MODERATION_ENABLED = true
MODERATION_OPERATOR_COUNT = 1
MODERATION_STORE = DURABLE__PRESENT_FILE
```

Distriator itself does not belong in that application enabled/disabled capability block. It is an **external service** that observes the Hive blockchain and applies its own transaction-recognition and rebate rules. Hive-Venues cannot enable or disable Distriator.

Hive-Venues does, however, need a distinct **venue participation toggle**. A business must first complete the applicable Distriator onboarding before the venue operator turns that toggle on. In the current source configuration the historical environment-key spelling is `DISTRIATOR_ENABLED`; its corrected meaning is only: "this venue is onboarded for Distriator rebate participation and Hive-Venues may expose the post-confirmation external handoff." The local toggle does not assert that Distriator will recognize any particular transaction or issue a rebate.

The currently safe production evidence does not establish Fourth Street's present participation/onboarding state under that corrected semantic contract, so it is not inferred from the old ambiguous flag name. Keep the distinct facts separate:

```text
DISTRIATOR_VENUE_PARTICIPATION = NOT_ESTABLISHED_IN_CURRENT_EVIDENCE
HIVE_VENUES_TRANSACTION_VALID = UNKNOWN_UNTIL_A_SPECIFIC_TRANSACTION_IS_VERIFIED
DISTRIATOR_RECOGNITION = NOT_ESTABLISHED_IN_CURRENT_EVIDENCE
DISTRIATOR_REBATE_ISSUED = NOT_ESTABLISHED_IN_CURRENT_EVIDENCE
```

A future interoperability check may establish those facts for a concrete transaction, but it must not report the external Distriator service itself as an application capability state or treat venue participation as a guarantee of recognition/rebate.

These are current production facts, not source defaults and not inferred historical state. Do not silently replace them with older milestone prose that described Pay, onboarding, or moderation as disabled or source-only.

No protected environment contents, session secret, SSH key, Hive private key, customer recovery material, creator private key, raw durable-store path, or database contents were exposed to establish these facts.

## Current deployment decision

HV-8 proved that the accepted successor candidate can converge with the Fourth Street reference deployment, and Phase A established a coherent production entry state. That technical ability is **not** a product reason to replace a healthy running service.

```text
HV8_REFERENCE_DEPLOYMENT_CONVERGENCE = TECHNICALLY_QUALIFIED__PRODUCTION_TRANSITION_WITHHELD
LIVE_SUCCESSOR_PRODUCTION_MUTATION = NOT_AUTHORIZED
```

Production remains on the current `beta-fdb5b5b` release until a later, separately authorized transition has a concrete product or operational reason. A qualified source candidate, a passing deployment gate, or source advancement on `main` does not by itself authorize deployment.

## Deployment invariant

If a future transition is separately authorized, preserve the accepted fail-closed sequence:

1. freshly observe and bind `current`, `last-good`, public health/readiness, and protected-environment hashes;
2. preserve the accepted active environment without exposing its contents;
3. temporarily activate the accepted read-only environment;
4. deploy one exact reviewed commit with `/usr/local/sbin/hive-bar-deploy <full-sha>`;
5. verify exact commit/tree/build identity, local health/readiness, and first-party assets while writes are disabled;
6. restore only the separately accepted runtime environment byte-for-byte;
7. verify the corresponding release gate and public edge behavior;
8. stop on ambiguity and never automatically retry an uncertain mutation.

Deployment/rollback helpers must continue to verify exact release identity. Every installed release remains under `/opt/hive-bar/releases/<full-commit-sha>` with `.hive-bar-commit` and `.hive-bar-tree` records. Explicit rollback remains a full-SHA, operator-authorized action; `last-good` is evidence and a recovery candidate, not permission to mutate the host.

## Release profiles

### `privex-public-read-only`

Safe source-switch and recovery baseline. Hive writes and signing are disabled.

### `privex-beta-self-signing`

Current production profile. Patrons sign only their own admitted beta operations locally through Hive Keychain. Server-side Hive private-key custody remains prohibited.

Payments, onboarding, and moderation are currently active capabilities under separately configured production state; their presence must never be inferred solely from source capability. Distriator remains external to the application. A separately configured venue-participation toggle may expose the external handoff only after business onboarding; concrete transaction validity, external recognition, and rebate evidence remain separate facts.

### `privex-v1-self-signing`

V1 wiring remains dormant production capability. Production remains beta until a separately authorized transition deliberately changes the accepted persistent profile. A successful V1 gate or source implementation does not activate V1.

## Secrets, keys, and authority

The VPS may hold the application session secret and durable application state, but it holds no patron Hive private keys. Normal patron signing remains in the user's local Keychain extension.

Customer onboarding private credentials must remain local to the customer's browser. Only public keys may be transmitted for account creation. Creator/delegator Active authority remains in the authorized operator Keychain environment.

Never print, commit, transmit, or log:

- the application session secret;
- SSH private keys;
- patron Hive private keys;
- onboarding customer recovery records or private keys;
- creator/delegator private keys;
- protected environment contents;
- private durable-store contents.

Environment SHA-256 values and other non-secret derived state may be recorded when they materially establish operational identity.

## Monitoring and recovery

`/healthz` provides liveness plus exact deployed identity. `/readyz` performs the bounded Hive-backed readiness check. The health timer is observational and must not issue Hive writes or mutate external infrastructure.

Retain at least the current release and one independently identified prior release. For ambiguous state, observe first and obtain fresh authorization before any mutation.

Fourth Street intentionally retains provenance-bearing compatibility names such as `/opt/hive-bar`, `hive-bar.service`, `.hive-bar-commit`, `.hive-bar-tree`, its host, and its Hive application tag. These are production compatibility seams, not the Hive-Venues product identity.
