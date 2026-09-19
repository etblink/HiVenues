param(
  [Parameter(Mandatory = $true)]
  [string]$SignedInstaller,
  [Parameter(Mandatory = $true)]
  [string]$PromotionManifest,
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory,
  [Parameter(Mandatory = $true)]
  [string]$ExpectedPublisherSubject
)

$ErrorActionPreference = 'Stop'

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

$installerPath = [System.IO.Path]::GetFullPath($SignedInstaller)
$promotionPath = [System.IO.Path]::GetFullPath($PromotionManifest)
$output = [System.IO.Path]::GetFullPath($OutputDirectory)

Assert-True (Test-Path -LiteralPath $installerPath -PathType Leaf) "Signed installer was not found: $installerPath"
Assert-True (Test-Path -LiteralPath $promotionPath -PathType Leaf) "Signing promotion manifest was not found: $promotionPath"
Assert-True (-not [string]::IsNullOrWhiteSpace($ExpectedPublisherSubject)) 'Expected publisher subject must be configured before production signing can be finalized.'

New-Item -ItemType Directory -Force -Path $output | Out-Null

$promotion = Get-Content -LiteralPath $promotionPath -Raw | ConvertFrom-Json
Assert-True ([int]$promotion.signingPromotionVersion -eq 1) 'Unsupported signing promotion manifest version.'
Assert-True ([string]$promotion.signing.provider -eq 'Microsoft Artifact Signing') 'Unexpected signing provider in promotion manifest.'
Assert-True ([string]$promotion.signing.trustModel -eq 'PublicTrust') 'Production signing requires the accepted PublicTrust model.'
Assert-True ([string]$promotion.signing.publisherIdentityType -eq 'individual') 'Production signing requires the accepted individual publisher identity model.'

$signature = Get-AuthenticodeSignature -LiteralPath $installerPath
Assert-True ([string]$signature.Status -eq 'Valid') "Authenticode signature is not valid: $($signature.Status) $($signature.StatusMessage)"
Assert-True ([string]$signature.SignatureType -eq 'Authenticode') "Expected an Authenticode signature, found '$($signature.SignatureType)'."
Assert-True ($null -ne $signature.SignerCertificate) 'Valid signature did not expose a signer certificate.'
Assert-True ($null -ne $signature.TimeStamperCertificate) 'Production signature is missing a trusted time-stamp certificate.'

$actualSubject = [string]$signature.SignerCertificate.Subject
Assert-True (
  [string]::Equals($actualSubject.Trim(), $ExpectedPublisherSubject.Trim(), [System.StringComparison]::OrdinalIgnoreCase)
) "Signed publisher subject '$actualSubject' does not match expected subject '$ExpectedPublisherSubject'."

$signedHash = (Get-FileHash -LiteralPath $installerPath -Algorithm SHA256).Hash.ToLowerInvariant()
$unsignedHash = ([string]$promotion.installer.unsignedSha256).ToLowerInvariant()
Assert-True ($signedHash -ne $unsignedHash) 'Signed installer unexpectedly has the same SHA-256 as the promoted unsigned installer.'

$installerName = [string]$promotion.installer.file
Assert-True ([System.IO.Path]::GetFileName($installerPath) -eq $installerName) 'Signed installer filename changed across the signing boundary.'

$finalInstaller = Join-Path $output $installerName
if (-not [string]::Equals($installerPath, $finalInstaller, [System.StringComparison]::OrdinalIgnoreCase)) {
  Copy-Item -LiteralPath $installerPath -Destination $finalInstaller -Force
} else {
  $finalInstaller = $installerPath
}

$checksumPath = Join-Path $output (($installerName -replace '\.exe$', '') + '.sha256')
$provenancePath = Join-Path $output (($installerName -replace '\.exe$', '') + '.provenance.json')
$checksumLine = $signedHash + '  ' + $installerName + [Environment]::NewLine
[System.IO.File]::WriteAllText($checksumPath, $checksumLine, [System.Text.UTF8Encoding]::new($false))

$record = [ordered]@{
  installerProvenanceVersion = 2
  product = 'HiVenues Studio'
  installerTechnology = [string]$promotion.installer.technology
  installerTechnologyVersion = [string]$promotion.installer.technologyVersion
  installScope = [string]$promotion.installer.installScope
  defaultInstallLocation = [string]$promotion.installer.defaultInstallLocation
  durableDataLocation = [string]$promotion.installer.durableDataLocation
  signing = 'authenticode-public-trust'
  packageVersion = [string]$promotion.source.packageVersion
  sourceSha = [string]$promotion.source.sha
  sourceTree = [string]$promotion.source.tree
  nodeVersion = [string]$promotion.source.nodeVersion
  packageManager = [string]$promotion.source.packageManager
  qualificationRunId = [string]$promotion.qualificationRunId
  unsignedInstaller = [ordered]@{
    file = $installerName
    sha256 = $unsignedHash
    bytes = [int64]$promotion.installer.unsignedBytes
  }
  signature = [ordered]@{
    provider = [string]$promotion.signing.provider
    trustModel = [string]$promotion.signing.trustModel
    publisherIdentityType = [string]$promotion.signing.publisherIdentityType
    status = [string]$signature.Status
    signatureType = [string]$signature.SignatureType
    signerSubject = $actualSubject
    signerIssuer = [string]$signature.SignerCertificate.Issuer
    signerSerialNumber = [string]$signature.SignerCertificate.SerialNumber
    signerNotBefore = $signature.SignerCertificate.NotBefore.ToUniversalTime().ToString('o')
    signerNotAfter = $signature.SignerCertificate.NotAfter.ToUniversalTime().ToString('o')
    timestampSubject = [string]$signature.TimeStamperCertificate.Subject
    timestampIssuer = [string]$signature.TimeStamperCertificate.Issuer
    timestampSerialNumber = [string]$signature.TimeStamperCertificate.SerialNumber
    timestampNotBefore = $signature.TimeStamperCertificate.NotBefore.ToUniversalTime().ToString('o')
    timestampNotAfter = $signature.TimeStamperCertificate.NotAfter.ToUniversalTime().ToString('o')
    fileDigest = [string]$promotion.signing.fileDigest
    timestampProtocol = [string]$promotion.signing.timestampProtocol
    timestampDigest = [string]$promotion.signing.timestampDigest
  }
  installer = [ordered]@{
    file = $installerName
    sha256 = $signedHash
    bytes = (Get-Item -LiteralPath $finalInstaller).Length
  }
}

$json = ($record | ConvertTo-Json -Depth 12) + [Environment]::NewLine
[System.IO.File]::WriteAllText($provenancePath, $json, [System.Text.UTF8Encoding]::new($false))

Write-Host "Signed installer SHA-256: $signedHash"
Write-Host "Publisher: $actualSubject"
Write-Host "Timestamp authority: $($signature.TimeStamperCertificate.Subject)"
$record | ConvertTo-Json -Depth 12
