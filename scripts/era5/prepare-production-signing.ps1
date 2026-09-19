param(
  [Parameter(Mandatory = $true)]
  [string]$ArtifactRoot,
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory,
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-f0-9]{40}$')]
  [string]$ExpectedSourceSha,
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-f0-9]{64}$')]
  [string]$ExpectedUnsignedSha256,
  [Parameter(Mandatory = $true)]
  [string]$QualificationRunId
)

$ErrorActionPreference = 'Stop'

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

$root = [System.IO.Path]::GetFullPath($ArtifactRoot)
$output = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $output | Out-Null

$installers = @(Get-ChildItem -LiteralPath $root -Filter 'HiVenues-Studio-*-windows-x64-setup.exe' -File)
$provenanceFiles = @(Get-ChildItem -LiteralPath $root -Filter 'HiVenues-Studio-*-windows-x64-setup.provenance.json' -File)
$checksumFiles = @(Get-ChildItem -LiteralPath $root -Filter 'HiVenues-Studio-*-windows-x64-setup.sha256' -File)

Assert-True ($installers.Count -eq 1) "Expected exactly one unsigned installer artifact, found $($installers.Count)."
Assert-True ($provenanceFiles.Count -eq 1) "Expected exactly one installer provenance sidecar, found $($provenanceFiles.Count)."
Assert-True ($checksumFiles.Count -eq 1) "Expected exactly one installer checksum sidecar, found $($checksumFiles.Count)."

$installer = $installers[0]
$provenanceFile = $provenanceFiles[0]
$checksumFile = $checksumFiles[0]

$actualHash = (Get-FileHash -LiteralPath $installer.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
$expectedHash = $ExpectedUnsignedSha256.ToLowerInvariant()
Assert-True ($actualHash -eq $expectedHash) 'Unsigned installer SHA-256 does not match the explicitly promoted hash.'

$sidecarHash = ((Get-Content -LiteralPath $checksumFile.FullName -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
Assert-True ($sidecarHash -eq $actualHash) 'Unsigned installer checksum sidecar does not match the installer.'

$provenance = Get-Content -LiteralPath $provenanceFile.FullName -Raw | ConvertFrom-Json
Assert-True ([string]$provenance.signing -eq 'unsigned') 'Only an explicitly unsigned qualification artifact may enter the production signing boundary.'
Assert-True ([string]$provenance.sourceSha -eq $ExpectedSourceSha.ToLowerInvariant()) 'Installer provenance source SHA does not match the explicitly promoted source SHA.'
Assert-True ([string]$provenance.installer.sha256 -eq $actualHash) 'Installer provenance SHA-256 does not match the promoted installer.'
Assert-True ([string]$provenance.installScope -eq 'per-user') 'Production signing promotion currently requires the accepted per-user installer.'
Assert-True (-not [string]::IsNullOrWhiteSpace([string]$provenance.sourceTree)) 'Installer provenance is missing the source tree.'
Assert-True (-not [string]::IsNullOrWhiteSpace([string]$provenance.packageVersion)) 'Installer provenance is missing the package version.'

$stagedInstaller = Join-Path $output $installer.Name
Copy-Item -LiteralPath $installer.FullName -Destination $stagedInstaller -Force

$promotion = [ordered]@{
  signingPromotionVersion = 1
  product = 'HiVenues Studio'
  purpose = 'Exact qualified unsigned installer promoted into the protected production-signing consequence boundary.'
  qualificationRunId = [string]$QualificationRunId
  source = [ordered]@{
    sha = [string]$provenance.sourceSha
    tree = [string]$provenance.sourceTree
    packageVersion = [string]$provenance.packageVersion
    nodeVersion = [string]$provenance.nodeVersion
    packageManager = [string]$provenance.packageManager
  }
  installer = [ordered]@{
    file = $installer.Name
    unsignedSha256 = $actualHash
    unsignedBytes = $installer.Length
    technology = [string]$provenance.installerTechnology
    technologyVersion = [string]$provenance.installerTechnologyVersion
    installScope = [string]$provenance.installScope
    defaultInstallLocation = [string]$provenance.defaultInstallLocation
    durableDataLocation = [string]$provenance.durableDataLocation
  }
  signing = [ordered]@{
    provider = 'Microsoft Artifact Signing'
    trustModel = 'PublicTrust'
    publisherIdentityType = 'individual'
    fileDigest = 'SHA256'
    timestampProtocol = 'RFC3161'
    timestampDigest = 'SHA256'
  }
}

$manifestPath = Join-Path $output 'hivenues-production-signing-promotion.json'
$json = ($promotion | ConvertTo-Json -Depth 10) + [Environment]::NewLine
[System.IO.File]::WriteAllText($manifestPath, $json, [System.Text.UTF8Encoding]::new($false))

Write-Host "Promoted unsigned installer SHA-256: $actualHash"
Write-Host "Promotion manifest: $manifestPath"
$promotion | ConvertTo-Json -Depth 10
