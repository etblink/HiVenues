# HiVenues Era 5 — Production Signing / Reputation Boundary 0.1.0

Status: **FROZEN — repository-side signing boundary accepted; paid external publisher enrollment intentionally deferred until external-release readiness**

Governing issue: #323

## Purpose

This document freezes the production Windows signing/reputation boundary that remains after Era 5 Tranche 3 proved the unsigned per-user installer on a clean Windows machine.

The goal is not merely to attach a certificate. The goal is a traceable trust chain from public source and exact unsigned qualification evidence to a publicly trusted, time-stamped Windows installer signed under the accepted individual publisher identity.

The target flow is:

    exact public Git source
    → exact clean-machine-qualified unsigned installer
    → explicit hash promotion
    → protected production-signing environment
    → GitHub OIDC
    → least-privilege Microsoft Artifact Signing authority
    → Public Trust Authenticode signature
    → RFC 3161 timestamp
    → signed SHA-256 + signed provenance
    → fresh-Windows signed lifecycle qualification

Production signing is a release consequence. It is not an ordinary pull-request build capability.

## Current reference service

The selected reference service is **Microsoft Artifact Signing, Public Trust**.

The accepted publisher model is an **individual verified identity**.

Current Microsoft service requirements relevant to HiVenues are:

- an Azure subscription and Microsoft Entra tenant;
- an Artifact Signing account;
- completed individual Public Trust identity validation;
- a Public Trust certificate profile;
- an identity authorized with the Artifact Signing Certificate Profile Signer role;
- a supported Artifact Signing regional endpoint.

Private signing key material remains managed by Microsoft rather than exported into the HiVenues repository or GitHub Actions.

## Authentication boundary

HiVenues production signing uses **GitHub Actions OpenID Connect (OIDC)** rather than a reusable Azure client secret.

The production workflow receives actions:read, contents:read, and id-token:write permissions and is bound to the GitHub environment named production-signing.

The Azure federated credential must trust only the intended HiVenues production-signing GitHub identity/environment.

HiVenues was created after GitHub's 2026 immutable-OIDC cutoff, so the environment-bound subject must include the immutable owner and repository IDs:

    repo:etblink@30190328/HiVenues@1351282101:environment:production-signing

Do not substitute the older name-only subject format.

Do not add Azure client secrets, PFX files, exported private keys, signing passwords, or long-lived signing tokens to GitHub repository secrets, source files, build artifacts, or HiVenues application state.

## Least-privilege Azure authorization

The GitHub OIDC workload identity should receive only the role needed to sign: Artifact Signing Certificate Profile Signer.

It should be scoped to the specific HiVenues Public Trust certificate profile where practical.

The signing workload identity should not receive Owner or Contributor merely because those roles are convenient.

Identity-validation administration and signing authority are separate concerns.

## GitHub production-signing environment

Before the first trusted signing run, repository settings must contain an environment named production-signing.

The environment should require explicit human approval for production signing where the account/repository plan supports environment protection.

The environment supplies these configuration identifiers:

- AZURE_CLIENT_ID
- AZURE_TENANT_ID
- AZURE_SUBSCRIPTION_ID
- ARTIFACT_SIGNING_ENDPOINT
- ARTIFACT_SIGNING_ACCOUNT
- ARTIFACT_SIGNING_PROFILE
- HIVENUES_PUBLISHER_SUBJECT

These values identify the authorized Azure resources and expected public certificate subject. They are configuration, not private signing key material.

The production-signing workflow itself remains workflow-dispatch only. Pull requests do not receive signing authority.

## Exact unsigned promotion rule

A production signing run must name three pieces of evidence explicitly:

- qualification_run_id
- source_sha
- unsigned_sha256

The workflow downloads the installer artifact from the named successful clean-machine qualification run.

Before Azure authentication occurs, prepare-production-signing.ps1 requires:

1. exactly one installer, checksum sidecar, and provenance sidecar;
2. actual installer SHA-256 equals the explicitly promoted unsigned_sha256;
3. checksum sidecar equals the installer hash;
4. provenance installer hash equals the installer hash;
5. provenance source SHA equals the explicitly promoted source_sha;
6. provenance signing state is exactly unsigned;
7. the installer is the accepted per-user package.

Only then is the installer copied into the protected signing staging directory.

This prevents a convenient rebuild, arbitrary branch artifact, or unrelated executable from silently crossing the signing boundary.

## Signing operation

The production workflow uses:

- Azure/login v3, pinned by immutable commit SHA;
- Azure/artifact-signing-action v2, pinned by immutable commit SHA;
- SHA-256 file digest;
- Microsoft Artifact Signing Public Trust;
- RFC 3161 timestamping;
- SHA-256 timestamp digest.

The current pinned action commits are:

    Azure/login
    a641126d1b8aa4d1fa005f4f92df94a3a4c4c906

    Azure/artifact-signing-action
    c7ab2a863ab5f9a846ddb8265964877ef296ee82

Action major tags are not used in the HiVenues workflow because release authority should not execute mutable third-party action code.

## Initial signed scope

The minimum Era 5 production trust artifact is the exact **downloaded Windows installer EXE**.

That installer is the file crossing the browser/download reputation boundary and it cryptographically covers the package payload distributed inside it.

The first production-signing workflow therefore signs the installer itself.

Signing additional HiVenues-owned installed executables may be added when there is a demonstrated Windows trust/maintenance requirement, but it must not weaken the exact unsigned qualification/provenance boundary or cause an architecture rewrite merely for packaging aesthetics.

Third-party executables such as the bundled Node runtime must retain their upstream publisher identity; HiVenues must not re-sign third-party binaries as if HiVenues authored them.

## Signed provenance finalization

After Artifact Signing modifies the installer bytes, finalize-production-signing.ps1 requires:

- Get-AuthenticodeSignature status Valid;
- signature type Authenticode;
- a signer certificate;
- a timestamp certificate;
- signer subject exactly equal to the configured HIVENUES_PUBLISHER_SUBJECT;
- signed SHA-256 different from the promoted unsigned SHA-256;
- installer filename unchanged.

The resulting signed provenance keeps both the unsigned installer SHA-256 and signed installer SHA-256 and binds:

- source SHA/tree;
- package version;
- Node/package-manager provenance;
- original clean-machine qualification run ID;
- installer technology/scope;
- signing provider/trust model;
- signer certificate subject/issuer/serial/validity;
- timestamp certificate subject/issuer/serial/validity;
- SHA-256/RFC3161 signing policy.

Reproducibility remains a property of the qualified unsigned boundary.

The time-stamped signed artifact is expected to differ byte-for-byte from the unsigned artifact.

## Signed clean-machine qualification

A trusted signature is not sufficient by itself.

The production workflow therefore sends the signed package to a second fresh Windows job with no source checkout.

The signed clean-machine job must re-run the accepted installer lifecycle:

    install
    → launch installed HiVenues
    → create synthetic host
    → edit Working
    → explicit Release
    → close
    → repair/update-style reinstall
    → relaunch
    → uninstall
    → prove user state retained
    → reinstall
    → prove released host restored

Before installation it additionally requires:

- signed provenance hash equals the signed installer;
- provenance signing state is authenticode-public-trust;
- Authenticode status is Valid;
- timestamp certificate is present;
- live signer subject equals the subject recorded in provenance.

The local lifecycle scenario must still demonstrate no unintended Hive/provider/payment/deployment consequence.

## SmartScreen / reputation rule

Authenticode validity and SmartScreen reputation are different signals.

Era 5 does not require an impossible promise that a new publisher identity will never receive a reputation warning.

The accepted reputation posture is:

- stable verified individual publisher identity;
- Public Trust Authenticode;
- RFC 3161 timestamping;
- stable signed release continuity;
- first-party provenance/checksums;
- clean-machine signed qualification;
- truthful documentation that reputation can require history/usage to accumulate.

A SmartScreen reputation warning on an otherwise valid newly established publisher is not by itself evidence that the cryptographic signing chain failed.

A signature that is missing, invalid, unexpectedly issued, not time-stamped, or bound to the wrong publisher **is** an Era 5 blocker.

## External owner prerequisites

The repository can prove all pre-signing controls without possessing production signing authority.

The following steps require the project owner in Microsoft/Azure and GitHub settings:

1. ensure the Azure subscription used for Artifact Signing has an **Individual** billing-account type with the intended legal name and billing address;
2. register/create the Artifact Signing resource and account;
3. obtain the permissions required to submit individual identity validation;
4. complete individual **Public Trust** identity verification in the Azure portal and Microsoft-designated verification flow;
5. create a **Public Trust** certificate profile from the verified individual identity;
6. create a Microsoft Entra workload identity for GitHub Actions;
7. configure its GitHub OIDC federated credential for the protected HiVenues production-signing environment;
8. grant that workload identity Artifact Signing Certificate Profile Signer on the specific certificate profile;
9. create/protect the GitHub production-signing environment;
10. populate the seven environment configuration values named above;
11. confirm the exact expected publisher certificate subject shown by the certificate profile.

No real production signing run is authorized before these prerequisites are complete.

## Repository preflight acceptance

Before owner enrollment is exercised, the repository preflight must prove:

- existing unsigned installer lifecycle remains green;
- an exact unsigned installer can be promoted only when source SHA and installer SHA-256 match;
- the promotion manifest records Public Trust / individual identity / SHA-256 / RFC3161 policy;
- an unsigned installer is rejected by the signed-artifact finalizer;
- the production signing workflow is manual-only and uses the protected environment;
- OIDC id-token:write is present;
- no Azure client secret/PFX/private key is required;
- Azure actions are pinned to immutable commits;
- signed clean-machine qualification is wired after signing rather than assumed.

Repository preflight passed on exact PR #334 head `37dccb77b9b7986388807aeb1157eb76359e9635` with CI #1392, runtime proof #26, Windows distributable #12, clean-machine installer #11, and signing preflight #4 all PASS.

PR #334 merged as `125ba38701077c1f77974b97d10e4a5d331572fd`.

This accepts the **repository-side signing boundary**. It does **not** close Era 5.

The project owner has intentionally deferred creating a paid Azure Pay-As-You-Go / Artifact Signing account, Public Trust individual identity validation, certificate profile, and first real signed qualification until HiVenues is materially closer to external distribution. This avoids paying for idle signing infrastructure while preserving the already-qualified trust architecture.

Until that release-readiness point, do not repeatedly treat Azure enrollment as the next product-development task. Resume the roadmap's next product-building work while keeping the Era-5 final trust gate explicitly open and parked.

## Deferred external-enrollment decision

The following work is **ready but intentionally parked**:

- Azure Pay-As-You-Go subscription creation;
- Microsoft Artifact Signing account creation;
- individual Public Trust identity validation;
- Public Trust certificate-profile creation;
- GitHub OIDC workload-identity setup against that Azure profile;
- paid Basic Artifact Signing activation;
- first real Authenticode-signed installer qualification.

The trigger to resume this work is **external-release readiness**, not mere repository availability. A practical trigger is when HiVenues is approaching real external distribution/customer use and the signed installer will soon provide value rather than sit unused.

The repository must preserve the production-signing workflow and preflight guard in the meantime.

## Era 5 exit evidence

Production signing/reputation qualification is complete only when a real protected run records:

    VERIFIED_INDIVIDUAL_PUBLISHER = YES
    PUBLIC_TRUST_PROFILE = YES
    OIDC_SIGNING_AUTHORITY = YES
    QUALIFIED_UNSIGNED_HASH = bound
    AUTHENTICODE_STATUS = Valid
    EXPECTED_PUBLISHER = match
    RFC3161_TIMESTAMP = present
    SIGNED_HASH = bound
    SIGNED_CLEAN_MACHINE = PASS

At that point the evidence may be frozen into the current-state bridge and Era 5 can be evaluated against its complete distribution exit gate.

## Held scope

This boundary does not authorize:

- production deployment/DNS/VPS mutation;
- live unattended Hive writes;
- Hive account sponsorship/onboarding authority;
- new commerce classes;
- Fourth Street customer work;
- independent Astra;
- Microsoft Store distribution;
- automatic updater transport;
- a desktop-framework rewrite.
