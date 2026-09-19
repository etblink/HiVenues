# HiVenues Era 6 — Hive Account Onboarding Stage-0 Audit 0.1.0

Status: **CANDIDATE — read-only onboarding/provider audit**

Governing issue: #336

Date: 2026-09-18

## Purpose

Stage 0 establishes the minimum product and provider facts needed before HiVenues changes onboarding UX.

This audit is intentionally read-only with respect to Hive account creation.

It does not:

- create a Hive account;
- sponsor an account;
- acquire recovery authority;
- store a private key or master password;
- broadcast a Hive operation;
- introduce production deployment;
- move value.

The governing Era-6 outcome remains:

> **A person with or without a pre-existing Hive account can reach the capabilities they need without developer help, secret-key custody by HiVenues, or unnecessary blockchain ceremony.**

## 1. Frozen product rule

The frozen roadmap defines Era 6 as optional, progressive, non-custodial Hive adoption.

The canonical user choices are:

    Connect an existing Hive account
    Create a Hive account
    Not now

The initial no-account production path may use vetted ecosystem account-creation providers and return the user to HiVenues for wallet-based verification.

A future HiVenues-sponsored account-creation service remains separately gated because it would introduce creator/recovery policy, abuse/Sybil controls, account-token/resource-credit inventory, rate limiting, support/recovery obligations, privacy obligations, and server/service authority.

## 2. Existing identity substrate — preserve and reuse

HiVenues already has a qualified account-control proof path.

Current product path:

    public @account input
    → POST /identity/challenge
    → fresh server challenge
    → human-owned Hive Keychain requestSignBuffer
    → Posting-authority message signature
    → POST /identity/verify
    → server verifies returned public key against current Hive Posting authority
    → bounded local identity session

Relevant implementation:

- `public/js/hivenues-identity.js`
- `public/js/keychain-adapter.js`
- `src/product/identity.js`
- `src/product/identity-router.js`
- `src/auth/keychain-auth.js`
- `src/auth/session-store.js`
- `src/hive/posting-authority.js`

### Existing security properties

The current substrate already preserves the core Era-6 rules:

- no master password/private key enters HiVenues;
- the wallet owns the signature operation;
- the challenge is fresh and time bounded;
- identity proof uses Posting authority rather than Active/Owner;
- the returned public key is checked against current account authority;
- account mismatch/message mismatch are rejected;
- identity proof itself broadcasts no Hive transaction;
- session cookies are HttpOnly + SameSite=Strict;
- public social/community browsing remains available without identity;
- identity-provider unavailability degrades explicitly rather than fabricating a successful connection;
- disconnect destroys the local HiVenues identity session and does not alter the Hive account;
- a verified identity session is explicitly not treated as authorization for later post/vote/follow/payment consequences.

### Existing product qualification

Current tests already prove important parts of the target experience:

- host-native identity copy across multiple Directions;
- public browsing without identity proof;
- explicit provider-unavailable state;
- bounded verified session truth;
- no automatic post/vote/follow/payment authority after identity proof;
- Keychain cancel/locked/timeout/account-mismatch/message-mismatch handling;
- browser qualification of the existing identity path.

Era 6 should consolidate and productize this substrate rather than replace it.

## 3. Visitor identity is not host configuration

There are two distinct identity concepts in the current product and they must remain separate.

### Visitor/session identity

This is ephemeral proof that the person operating the browser controls a Hive account.

It belongs to:

- participation;
- authoring of Hive consequences as that person;
- profile/member context;
- later user-specific resource/reward state.

It is currently held in the bounded identity session, not HostGraph.

### Host/provider bindings

HostGraph currently contains the existing Hive binding structure:

- state: disconnected / read-only / connected;
- account;
- communityId;
- optional showNegativeVoteAction;
- optional valueRecipient.

The product also has separate social/provider binding seams used by the read/participation services.

The operator UI already treats the value-recipient account as a separate role and explicitly warns that it must not be assumed to equal host identity/publishing/community administration.

Era 6 must not collapse:

    visitor identity
    host identity
    community binding
    publishing/content role
    value recipient

into one "Hive account" field.

## 4. Accountless capability inventory

Current accepted product behavior already supports substantial usefulness without a verified Hive identity.

Accountless/read-only capability includes at least:

- host territory browsing;
- Activities / Offers / Stories / media;
- public social/community reads where provider state is available;
- public profiles;
- public posts/discussion reads;
- public relationship/resource state where the provider exposes it safely;
- local Studio host authoring that does not require a Hive consequence.

Verified identity is required only when a user needs account-specific participation or a later signed consequence.

This supports the doctrine's preferred progression:

    browse
    → understand
    → participate where possible
    → identify when useful
    → sign only at consequence

Therefore "Not now" must be a genuine path, not a cosmetically optional button that immediately dead-ends the user.

## 5. Current creation-provider discovery

### Selected initial provider-neutral seam

The initial account-creation handoff should use the official Hive community signup directory:

    https://signup.hive.io/

Reason:

- it is an ecosystem-level directory rather than a HiVenues-selected exclusive provider;
- it currently presents multiple account-creation providers;
- it exposes meaningful tradeoffs such as free/paid, instant/delayed, verification requirements, and privacy/payment differences;
- provider membership can change without a HiVenues code release;
- it explicitly tells new users that Hive does not provide ordinary password reset and that keys must be stored safely.

Checked 2026-09-18, the directory listed options including InLeo, Ecency, Hivedex.io, HiveDapps and Actifit.

HiVenues should not freeze that provider list into canonical product code merely because those entries exist today.

### Provider policy

For the first production-quality no-account flow:

    HiVenues
    → official Hive signup directory
    → user chooses an ecosystem provider
    → provider performs account creation externally
    → user returns to HiVenues
    → enter/select created @account
    → wallet proof
    → verified HiVenues identity session / admitted role binding

HiVenues does not need to know which provider created the account in order to verify account control afterward.

Provider-specific return/callback APIs are therefore not required for the first path.

## 6. Return / resume model

Because the selected directory routes to independent providers with different flows, HiVenues should not assume a universal OAuth-style callback.

The first robust resume model should be local and provider-neutral:

1. preserve the user's current onboarding intent in local HiVenues state/session;
2. open the official Hive signup directory in a separate browser context/tab where appropriate;
3. keep the HiVenues onboarding screen available;
4. tell the user to return after the account is created;
5. provide an obvious "I have my account" continuation;
6. accept/select the public @account;
7. reread canonical account state;
8. perform the normal self-custody wallet proof;
9. return the user to the original HiVenues task.

Opening the external provider is not success.

Account creation is not considered complete by HiVenues until the created account exists in canonical Hive state and the user proves control through the admitted wallet flow.

## 7. Wallet continuation

The official Hive wallet directory is:

    https://hive.io/wallets/

Checked 2026-09-18, it lists multiple wallets and marks Hive Keychain as recommended.

HiVenues already uses the Keychain browser adapter for its accepted identity and consequence paths.

Therefore the initial Era-6 implementation should continue to use the existing Keychain proof path rather than inventing a second authentication protocol merely for onboarding.

A future signer-neutral adapter expansion may add other supported self-custody wallets, but Keychain remains the already-qualified reference path.

HiVenues should not attempt to import raw account keys generated by an external signup provider.

## 8. Recovery / backup truth

The official Hive signup directory explicitly warns that Hive does not provide ordinary centralized "reset password" behavior and that users must store their keys safely.

Era-6 copy must preserve that truth without making the experience needlessly frightening.

Minimum truthful education before external creation handoff:

- HiVenues will not receive or store the master password/private keys;
- the user must save the account credentials/keys supplied by the chosen account provider;
- losing all recovery material may make ordinary password recovery impossible;
- the external creation provider may have its own recovery-account or verification policy;
- after account creation, HiVenues verifies control through the wallet rather than asking for the raw secret.

Detailed account-recovery tooling is not authorized by Stage 0.

## 9. Degraded states

The accountless product remains useful if:

- Hive RPC is unavailable;
- Keychain is missing/locked;
- the signup directory is unreachable;
- a specific creation provider is unavailable;
- the user cancels wallet proof;
- the identity challenge expires.

Required behavior:

- do not fabricate verified identity;
- do not block unrelated local authoring;
- do not hide existing public host content merely because onboarding is unavailable;
- preserve the user's local task/resume state where practical;
- explain what failed in product language;
- allow retry without duplicate account-creation consequences.

## 10. Role-binding implications

Era 6 should introduce roles only at the point a capability needs them.

The doctrine names:

- host identity;
- community;
- content/service binding when needed;
- merchant/value recipient when later authorized.

The current product already proves that valueRecipient should remain independent.

Stage-0 recommendation:

- do not redesign HostGraph bindings yet;
- first productize visitor/account onboarding using the existing identity-session substrate;
- separately audit each operator-side Hive role before exposing a new role-binding control;
- preserve existing Release/Working semantics for host configuration;
- do not store transient visitor login/session truth in HostGraph.

## 11. Stage-1 implementation target

The smallest high-value next implementation is a canonical onboarding decision surface that reuses the existing identity proof.

Target states:

### A — no Hive account selected

    Use HiVenues without Hive for now
    Connect an existing Hive account
    Create a Hive account

### B — existing account

    enter @account
    → public account existence/read
    → explain why proof is useful
    → Keychain identity proof
    → verified session
    → resume task

### C — create account

    explain self-custody
    → open official Hive signup directory
    → remain/resume in HiVenues
    → "I have my account"
    → same existing-account verification path

The create-account path must converge back into the same canonical identity proof instead of creating a parallel session/authentication mechanism.

## 12. Stage-1 acceptance tests to preregister

Automated/product tests should prove at minimum:

1. "Not now" remains usable and performs no Hive consequence.
2. Existing-account selection can validate/read public account state before signing.
3. A nonexistent/malformed account is rejected truthfully.
4. Identity proof uses the existing fresh-challenge + Posting-authority path.
5. Wallet cancel/locked/timeout remain recoverable.
6. Successful proof produces one bounded verified session.
7. Create-account opens only the selected official directory; it does not send account secrets to HiVenues.
8. Returning from external creation converges into the existing-account path.
9. Signup-directory/provider unavailability does not disable accountless HiVenues.
10. The local product performs no account-creation broadcast.
11. Restart/session behavior remains explicit rather than pretending an expired visitor session is durable HostGraph truth.
12. Desktop and mobile/touch variants are usable.
13. No production deployment/DNS/VPS/value consequence is introduced.

## 13. Explicitly held

Stage 0 does not authorize:

- HiVenues-sponsored account creation;
- account-creator Active authority;
- recovery-account custody;
- email/password custody;
- private-key import into HiVenues;
- server-side account provisioning;
- account-token/resource-credit inventory;
- automatic RC delegation;
- production deployment;
- new commerce/value mechanisms;
- Fourth Street customer work;
- broad release.

## Stage-0 decision

    EXISTING IDENTITY CRYPTOGRAPHIC SUBSTRATE = REUSE
    INITIAL CREATION DISCOVERY SEAM = https://signup.hive.io/
    INITIAL WALLET PROOF = existing Hive Keychain adapter
    UNIVERSAL PROVIDER CALLBACK = NOT REQUIRED
    RESUME MODEL = local HiVenues intent + manual return + canonical verification
    HIVENUES SECRET CUSTODY = NO
    HIVENUES-SPONSORED CREATION = HELD
    STAGE 1 = PROGRESSIVE ONBOARDING DECISION SURFACE

No new blockchain write authority is required to begin Stage 1.
