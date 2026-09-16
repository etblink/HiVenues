# HiVenues — Distribution, Onboarding & Deployment Doctrine 0.1.0

```text
DOCUMENT = HIVENUES_DISTRIBUTION_ONBOARDING_DEPLOYMENT_DOCTRINE
VERSION = 0.1.0
STATUS = CANONICAL / FROZEN COMPANION DOCTRINE
PARENT = docs/HIVENUES_END_STATE_PRODUCT_DOCTRINE_0_2_0.md
COMPANIONS = docs/HIVENUES_CANONICAL_USER_JOURNEY_0_2_0.md; docs/HIVENUES_HIVE_ECOSYSTEM_INTEGRATION_DOCTRINE_0_2_0.md; docs/HIVENUES_RENDERING_AUTHORING_ARCHITECTURE_DOCTRINE_0_1_0.md
SCOPE = DISTRIBUTION, INSTALLATION, FIRST RUN, HIVE ACCOUNT ONBOARDING, ROLE BINDINGS, HOSTING, DEPLOYMENT, DOMAINS, UPDATES, PROVIDER PAYMENT
CURRENT_IMPLEMENTATION = EVIDENCE / NOT DEFINITIONAL
AMENDMENT = EXPLICIT VERSIONED REVISION ONLY
```

## 0. Why this document exists

HiVenues is intended for nondevelopers. Open-source availability is not enough if ordinary use still requires cloning a repository, installing Node, opening a terminal, editing environment variables, understanding SSH, or manually configuring a web server.

The complete product journey therefore begins before Studio and continues after Release:

> **Get HiVenues → install → create locally → connect capabilities when useful → review → Release → deploy → operate**

This doctrine defines that lifecycle without weakening the existing rules around server-owned truth, human-owned wallet authority, provider neutrality, Release truth, or explicit external consequences.

---

# Part I — Distribution is part of the product

## 1. GitHub is the source of provenance and release artifacts, not the ordinary operator interface

HiVenues may be developed openly in GitHub, but a normal operator must not need Git, npm, a shell, a code editor, Docker, or repository knowledge to use it.

The normal distribution path should be a GitHub Release or another first-party release channel containing installable, versioned artifacts for supported desktop platforms.

A mature release should aim to provide ordinary platform-native installation such as:

- signed Windows installer/package;
- signed/notarized macOS package;
- supported Linux desktop package(s) where practical;
- checksums and exact source/build provenance.

Source checkout remains an advanced/developer path.

The normal instruction should be equivalent to:

> **Download HiVenues Studio. Install it. Open it.**

not:

> clone → npm install → configure env → run server.

---

## 2. The installed product may package the existing local server architecture

A desktop-quality distribution does not require converting HiVenues into a SPA.

The preferred installed shape remains compatible with the rendering doctrine:

```text
INSTALLED HIVENUES STUDIO
        ↓
PACKAGED LOCAL RUNTIME
        ↓
LOOPBACK-ONLY SERVER-OWNED APPLICATION
        ↓
EJS / HTMX / BOUNDED JS STUDIO
        ↓
LOCAL WORKSPACE + MEDIA + RELEASE HISTORY
```

The installer/launcher may start the local runtime and open Studio in a browser or bounded desktop shell.

The operator should not need to know that a local HTTP server exists.

Packaging technology is subordinate to this requirement. Node single-executable/application packaging, a thin native launcher, or another approach may be used if it preserves the canonical server-owned model and provides reliable platform installation.

---

## 3. Local workspace ownership remains explicit

The installed application should provide ordinary nondeveloper controls for:

- create/open a HiVenue;
- local workspace location;
- backup/export;
- restore/import where safe;
- media storage;
- application updates;
- diagnostics/support bundle;
- uninstall behavior.

Ordinary operation must not require manually locating application-data files.

Application update state and host Release state are separate concepts.

Updating HiVenues Studio must not silently publish or mutate a host.

---

# Part II — Hive is progressively connected, not demanded at startup

## 4. A Hive account is not required to begin creating a HiVenue

The operator should be able to install HiVenues, define the host, add content/media, choose a Direction, build a first draft, and review the territory without owning or connecting a Hive account.

Do not put wallet/account creation before the operator has experienced product value.

The accountless first-run principle is:

> **Create the host first. Connect portable capabilities when they become useful.**

---

## 5. Ask for Hive bindings when the corresponding capability is enabled

HiVenues must not present one giant blockchain configuration form during setup.

Hive identities are role bindings and should appear progressively.

Canonical role concepts include, when applicable:

### Host identity account

The Hive account representing or administering the host where a Hive identity is useful.

### Community binding

An existing Hive community used for host community/feed/discussion capability.

### Content/service/Threads binding

A Hive account or provider binding used for a specific publishing/content role when that architecture actually requires one.

Do not require a dedicated service account merely because a historical implementation used one.

### Merchant/value recipient

The account or provider destination that receives value for an admitted payment/support/commerce mechanic.

These roles may be fulfilled by the same account or by different accounts.

HiVenues should not require unnecessary role separation.

---

## 6. Existing Hive accounts are connected by proof, not by handing secrets to HiVenues

For an existing Hive user, the normal experience should be:

1. enter or select the public Hive account name;
2. read the account and relevant public state;
3. ask the user wallet to prove control when proof is needed;
4. record the verified binding;
5. request signing again only at actual consequence boundaries.

HiVenues must not ask an operator to paste a master password, Owner key, Active key, Posting key, Memo private key, or another private signing secret into the application.

Keychain, HiveAuth, HiveSigner, or another explicitly admitted wallet/provider may perform proof/signing according to the Hive Integration Doctrine.

---

# Part III — People without Hive accounts need a first-class path

## 7. “I don’t have a Hive account” is a normal onboarding state

A non-Hive operator should not encounter an error or developer instruction when a capability eventually requires Hive.

The Studio should present a calm choice such as:

```text
Connect an existing Hive account
Create a Hive account
Not now
```

“Not now” must remain valid for capabilities that are not required for the current host experience.

---

## 8. Initial account creation should use vetted ecosystem onboarding without taking custody of keys

The first production-quality onboarding path may hand off to a current vetted Hive account-creation provider or provider directory and return the user to HiVenues after creation.

The product should prefer a maintained ecosystem discovery source rather than permanently hard-code one third-party faucet as the only route.

After account creation, the operator should connect the new account through an admitted self-custody wallet/authentication flow.

HiVenues must not proxy, store, email, or recover the user’s master password/private keys.

The UI must explain clearly that Hive does not provide ordinary centralized password reset and that account/key backup is a user responsibility.

---

## 9. A future HiVenues-sponsored account flow is possible but is a separate service boundary

Hive permits account creation by existing accounts using paid creation or claimed-account tokens/resource credits.

A future HiVenues onboarding service could therefore sponsor account creation and reduce friction further.

That is not merely a UI feature. It creates additional obligations around:

- creator/recovery-account policy;
- claimed-account-token/resource-credit inventory;
- abuse/Sybil controls;
- initial resource delegation where needed;
- availability and rate limiting;
- privacy;
- support/recovery education;
- server/service authority.

Such a service requires its own explicit design, security review and authorization before implementation.

The local desktop application must not silently acquire account-creation authority.

---

# Part IV — Release and deployment are separate consequences

## 10. Creating the website and putting it on the Internet are different actions

HiVenues must preserve a clear distinction:

```text
WORKING
→ REVIEW
→ RELEASE
→ DEPLOY RELEASE TO A HOSTING TARGET
→ VERIFY CANONICAL PUBLIC RESULT
```

A Release is an immutable approved host version.

Deployment places an exact Release on a chosen hosting target.

Creating or editing a Release must not silently buy infrastructure, modify DNS, open firewall rules, or publish to an external server.

Deployment is an explicit consequential workflow.

---

## 11. Deployment should be possible without a terminal

The normal operator must not be required to:

- SSH manually;
- edit Caddy/Nginx configuration;
- install Node/npm;
- configure systemd;
- copy files with SFTP;
- edit firewall rules in a shell;
- type certificate commands.

A provider/deployment adapter should perform those actions or guide them through graphical steps.

Where remote shell access is technically used, it should be an implementation detail owned by the deployment adapter rather than an operator requirement.

---

# Part V — Hosting provider architecture

## 12. Hosting is provider-neutral even when HiVenues has a recommended default

The canonical deployment concept is a **Hosting/Deploy Provider**, not a permanent Privex-specific data model.

A provider may expose capabilities such as:

```text
DISCOVER / QUOTE
PROVISION OR HANDOFF
VERIFY TARGET
BOOTSTRAP RUNTIME
DEPLOY EXACT RELEASE
HEALTH READ-BACK
ROLL BACK
DECOMMISSION / DISCONNECT
```

Not every provider must support every operation through an API.

Provider limitations should produce truthful guided states rather than forcing provider-specific concepts into the canonical host graph.

---

## 13. Privex is the current reference and preferred default VPS provider, not a hard dependency

Privex is a strong current reference provider because it is privacy-oriented, Hive-adjacent, accepts cryptocurrency including HIVE/HBD, supports ordinary VPS provisioning, and allows SSH public keys during server ordering.

HiVenues may therefore present Privex as the default/recommended VPS path while preserving a provider-neutral deployment contract and a future “Other server/provider” path.

If Privex’s offerings or capabilities materially change, the recommended-provider profile may change without redefining HiVenues.

---

## 14. The first useful Privex integration does not require a provisioning API

Until a supported automated provisioning API or dedicated HiVenues image/service is available, a nonterminal flow can still be built:

1. HiVenues creates a deployment target draft locally.
2. HiVenues generates a deployment-only SSH keypair locally.
3. The private key remains local and is protected using the operating system’s secure credential/storage facilities where available.
4. Studio opens or links to the recommended Privex server order flow and gives the operator the generated **public** SSH key to use.
5. The operator completes the external server purchase/payment with Privex.
6. When Privex provides the server address/details, the operator enters/imports only the required public connection facts into Studio.
7. HiVenues verifies the target and bootstraps a dedicated HiVenues runtime/service account automatically over SSH.
8. HiVenues installs/configures the production runtime, reverse proxy/TLS, bounded firewall/service configuration, host data path and health endpoints according to the qualified deployment profile.
9. Studio deploys an exact immutable Release.
10. Studio reads the public result back and reports confirmed/degraded/failed state.

The operator never needs to open a terminal.

A later Privex partnership, provisioning API, custom image or prebuilt HiVenues server package may collapse these steps into a more automatic one-click flow.

---

## 15. Remote credentials are deployment authority, not host content

SSH private keys, provider API tokens, DNS credentials and related infrastructure secrets must never enter the canonical host graph or Release artifact.

They belong to a local/secure deployment authority store.

Deployment authority should be least-privilege, revocable and provider-scoped.

Where practical, initial bootstrap authority should be narrowed after provisioning to a dedicated HiVenues service/deployment account rather than retaining broad root access indefinitely.

---

# Part VI — Domains and TLS

## 16. Domain connection must have a no-terminal path

The normal domain journey should be graphical and explicit:

```text
Choose existing domain or temporary target
→ show exact DNS records required
→ verify DNS
→ configure host
→ obtain/verify TLS
→ health/read-back
```

If a supported DNS provider adapter can perform a change safely, HiVenues may offer explicit reviewed automation.

Otherwise, copying a small number of exact DNS records into the registrar/provider UI is an acceptable guided handoff.

The operator must not be told to edit web-server config files manually.

---

# Part VII — Provider payment, Privex and V4V/Lightning

## 17. Infrastructure payment is an external provider consequence

Paying Privex or another host is not the same thing as deploying a Release.

HiVenues may guide the operator to an invoice/payment flow, but it must not claim infrastructure is provisioned until the provider confirms it.

Payment provider state and server provisioning state must remain separately observable.

---

## 18. Lightning/V4V may reduce payment friction but is not deployment architecture

A hosting provider may accept HIVE/HBD, Bitcoin Lightning or other payment methods.

V4V-style services can be useful bridges between Hive/HBD and Lightning and may make infrastructure payment or future host-native commerce easier.

However:

- V4V is not required for HiVenues deployment;
- Lightning payment does not itself provision/configure the VPS;
- provider invoice/payment state must be read back from the provider;
- the canonical deployment model must not depend on one payment bridge;
- any V4V-based host commerce feature belongs under the separate value/consequence doctrine and authority qualification.

The product may nevertheless offer a polished path such as “Pay Privex invoice” when the provider exposes a supported payment URL/invoice and the user chooses that route.

---

# Part VIII — Updates and ongoing operation

## 19. Studio updates, runtime updates and host Releases are distinct

HiVenues has at least three version domains:

1. local Studio application version;
2. deployed HiVenues runtime version;
3. host Release/content version.

The UI must not conflate them.

A Studio application update must not automatically publish content.

A deployed runtime update must preserve host data and must have health/rollback semantics.

A host content Release must not silently upgrade infrastructure.

---

## 20. Deployment health and rollback are product surfaces

A nondeveloper should be able to see whether the public host is:

- deployed and healthy;
- deploying;
- awaiting DNS;
- awaiting provider provisioning;
- awaiting/confirming payment where relevant;
- certificate/TLS pending;
- degraded;
- unreachable;
- on an older Release;
- on an older runtime;
- rolled back.

Rollback should target an exact prior qualified Release/runtime combination where supported and remain an explicit operator action.

Raw SSH/provider diagnostics may exist behind deeper support details, but they are not the primary operator language.

---

# Part IX — Qualification and drift checks

## 21. Mandatory distribution/onboarding/deployment questions

Before calling HiVenues ready for nondeveloper use, ask:

1. Can a person obtain and open HiVenues without Git, npm, a terminal or developer documentation?
2. Can they create and meaningfully review a host before owning a Hive account?
3. Are Hive account/community/service/merchant bindings requested only when the enabled capability needs them?
4. Does HiVenues prove control through a wallet/auth provider rather than collecting private keys?
5. Does a no-account user have a calm, understandable account-creation path with key-safety education?
6. Could the account-creation provider change without rewriting the canonical host model?
7. Is Release separate from deployment and provider payment?
8. Can a normal operator deploy without SSH commands or web-server configuration?
9. Is Privex a replaceable recommended provider rather than an architectural dependency?
10. Are deployment credentials kept outside the canonical host/Release data model?
11. Can the operator connect a real domain and obtain TLS without editing server config in a terminal?
12. Are provider payment, provisioning, deployment and health represented as distinct truthful states?
13. Are Studio version, deployed runtime version and host Release version distinct?
14. Is rollback possible without asking the operator to become a system administrator?
15. Has this lifecycle been exercised from a clean installed application on supported desktop platforms before the first real customer trial?

A build that creates a beautiful site but requires command-line installation or deployment has not satisfied the HiVenues nondeveloper promise.

---

# Current reference flow

The desired ordinary lifecycle is equivalent to:

```text
DOWNLOAD INSTALLER
→ OPEN HIVENUES STUDIO
→ CREATE HOST WITHOUT HIVE ACCOUNT
→ FIRST DRAFT / SHAPE TERRITORY
→ OPTIONAL PARTICIPATION ENABLED
→ CONNECT OR CREATE HIVE ACCOUNT WHEN NEEDED
→ BIND ONLY REQUIRED ROLES
→ REVIEW WORKING TERRITORY
→ RELEASE
→ CHOOSE HOSTING
→ PRIVEX RECOMMENDED / OTHER PROVIDER AVAILABLE
→ PURCHASE OR PROVISION TARGET
→ HIVENUES BOOTSTRAPS TARGET WITHOUT TERMINAL
→ CONNECT DOMAIN
→ DEPLOY EXACT RELEASE
→ VERIFY PUBLIC RESULT
→ OPERATE / UPDATE / ROLLBACK
```

---

# Final doctrine

> **HiVenues is not nondeveloper-friendly if the nondeveloper boundary ends when installation, Hive onboarding or deployment begins. A complete HiVenues experience carries an ordinary person from download to a live, secure, maintainable host territory without requiring software-development or server-administration skills, while keeping identity, wallet, hosting and deployment consequences explicit and user-owned.**
