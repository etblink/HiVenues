param(
  [Parameter(Mandatory = $true)]
  [string]$ArtifactRoot,
  [Parameter(Mandatory = $true)]
  [string]$EvidenceOutput
)

$ErrorActionPreference = 'Stop'

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

function Wait-Until([scriptblock]$Condition, [string]$Failure, [int]$TimeoutSeconds = 30) {
  $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
  while ([DateTime]::UtcNow -lt $deadline) {
    if (& $Condition) { return }
    Start-Sleep -Milliseconds 150
  }
  throw $Failure
}

function Read-RunningUrl([string]$CurrentUrlPath) {
  Wait-Until { Test-Path -LiteralPath $CurrentUrlPath -PathType Leaf } 'Timed out waiting for installed HiVenues current URL.'
  return (Get-Content -LiteralPath $CurrentUrlPath -Raw).Trim()
}

function Invoke-Get([string]$Url) {
  return Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -SkipHttpErrorCheck
}

function Invoke-PostForm([string]$Url, [hashtable]$Body, [string]$Origin) {
  return Invoke-WebRequest -Uri $Url -Method Post -Body $Body -ContentType 'application/x-www-form-urlencoded' -Headers @{ Origin = $Origin; 'Sec-Fetch-Site' = 'same-origin' } -MaximumRedirection 0 -SkipHttpErrorCheck -UseBasicParsing
}

function Hidden-Value([string]$Html, [string]$Name) {
  $pattern = 'name="' + [regex]::Escape($Name) + '"\s+value="([^"]*)"'
  $match = [regex]::Match($Html, $pattern)
  if (-not $match.Success) { throw "Could not find hidden field '$Name'." }
  return [System.Net.WebUtility]::HtmlDecode($match.Groups[1].Value)
}

function Start-InstalledRuntime([string]$Launcher, [string]$StopFile, [string]$CurrentUrlPath) {
  Remove-Item -LiteralPath $StopFile -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $CurrentUrlPath -Force -ErrorAction SilentlyContinue
  Write-Host "Launching installed HiVenues runtime..."
  $process = Start-Process -FilePath $Launcher -ArgumentList @('--no-open', '--shutdown-file', $StopFile) -PassThru
  Assert-True ($process.WaitForExit(60000)) 'Native launcher did not exit after publishing runtime readiness.'
  Assert-True ($process.ExitCode -eq 0) "Native launcher exited with code $($process.ExitCode)."
  $url = Read-RunningUrl $CurrentUrlPath
  Write-Host "Installed HiVenues runtime ready at $url"
  return $url
}

function Stop-InstalledRuntime([string]$StopFile, [string]$CurrentUrlPath) {
  [System.IO.File]::WriteAllText($StopFile, 'stop' + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
  Wait-Until { -not (Test-Path -LiteralPath $CurrentUrlPath) } 'Installed HiVenues runtime did not stop cleanly.'
}

function Assert-NoUnintendedEffects([string]$DiagnosticsPath) {
  Assert-True (Test-Path -LiteralPath $DiagnosticsPath -PathType Leaf) 'Runtime diagnostics were not persisted on shutdown.'
  $diagnostics = Get-Content -LiteralPath $DiagnosticsPath -Raw | ConvertFrom-Json
  Assert-True ($diagnostics.status -eq 'stopped') 'Runtime diagnostics did not record a stopped lifecycle.'
  $external = $diagnostics.productDiagnostics.external
  foreach ($name in @('hiveRpcAttempts','hiveWrites','providerWrites','payments','signingAttempts','deployments')) {
    Assert-True ([int64]$external.$name -eq 0) "Unexpected external consequence during clean-machine scenario: $name=$($external.$name)"
  }
  return $external
}

function Run-Installer([string]$Installer) {
  $process = Start-Process -FilePath $Installer -ArgumentList '/S' -PassThru -Wait
  Assert-True ($process.ExitCode -eq 0) "Installer exited with code $($process.ExitCode)."
}

function Run-Uninstaller([string]$Uninstaller) {
  $process = Start-Process -FilePath $Uninstaller -ArgumentList '/S' -PassThru -Wait
  Assert-True ($process.ExitCode -eq 0) "Uninstaller exited with code $($process.ExitCode)."
}

$root = [System.IO.Path]::GetFullPath($ArtifactRoot)
$evidenceRoot = [System.IO.Path]::GetFullPath($EvidenceOutput)
New-Item -ItemType Directory -Force -Path $evidenceRoot | Out-Null

$installDir = Join-Path $env:LOCALAPPDATA 'Programs\HiVenues Studio'
$dataRoot = Join-Path $env:LOCALAPPDATA 'HiVenues Studio'
$statePath = Join-Path $dataRoot 'workspace\state.json'
$diagnosticsPath = Join-Path $dataRoot 'diagnostics\runtime.json'
$currentUrlPath = Join-Path $dataRoot 'diagnostics\current-url.txt'
$startMenuShortcut = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\HiVenues Studio\HiVenues Studio.lnk'
$uninstallKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\HiVenues Studio'

Assert-True (-not (Test-Path -LiteralPath (Join-Path $env:GITHUB_WORKSPACE '.git'))) 'Clean-machine job must not check out the repository.'
Assert-True (-not (Test-Path -LiteralPath (Join-Path $env:GITHUB_WORKSPACE 'package.json'))) 'Clean-machine job unexpectedly has a source checkout.'

$installer = Get-ChildItem -LiteralPath $root -Filter 'HiVenues-Studio-*-windows-x64-setup.exe' | Select-Object -First 1
$checksum = Get-ChildItem -LiteralPath $root -Filter 'HiVenues-Studio-*-windows-x64-setup.sha256' | Select-Object -First 1
$provenanceFile = Get-ChildItem -LiteralPath $root -Filter 'HiVenues-Studio-*-windows-x64-setup.provenance.json' | Select-Object -First 1
Assert-True ($null -ne $installer) 'Installer artifact was not downloaded.'
Assert-True ($null -ne $checksum) 'Installer checksum sidecar was not downloaded.'
Assert-True ($null -ne $provenanceFile) 'Installer provenance sidecar was not downloaded.'

$actualInstallerHash = (Get-FileHash -LiteralPath $installer.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
$expectedInstallerHash = ((Get-Content -LiteralPath $checksum.FullName -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
Assert-True ($actualInstallerHash -eq $expectedInstallerHash) 'Installer SHA-256 does not match its published sidecar.'

$provenance = Get-Content -LiteralPath $provenanceFile.FullName -Raw | ConvertFrom-Json
Assert-True ($provenance.installer.sha256 -eq $actualInstallerHash) 'Installer provenance SHA-256 does not match the installer.'
Assert-True ($provenance.installScope -eq 'per-user') 'Installer provenance does not describe a per-user install.'
Assert-True ($provenance.signing -eq 'unsigned') 'Tranche-3 candidate unexpectedly changed the explicit unsigned boundary.'

Remove-Item -LiteralPath $installDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $dataRoot -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $uninstallKey -Recurse -Force -ErrorAction SilentlyContinue

Run-Installer $installer.FullName

$launcher = Join-Path $installDir 'HiVenues Studio.exe'
$privateNode = Join-Path $installDir 'runtime\node.exe'
$uninstaller = Join-Path $installDir 'Uninstall.exe'
Assert-True (Test-Path -LiteralPath $launcher -PathType Leaf) 'Installed launcher is missing.'
Assert-True (Test-Path -LiteralPath $privateNode -PathType Leaf) 'Installed private Node runtime is missing.'
Assert-True (Test-Path -LiteralPath $uninstaller -PathType Leaf) 'Installed uninstaller is missing.'
Assert-True (Test-Path -LiteralPath $startMenuShortcut -PathType Leaf) 'Per-user Start menu shortcut is missing.'
Assert-True (Test-Path -LiteralPath $uninstallKey) 'Per-user Add/Remove Programs registration is missing.'
Assert-True ((Get-ItemProperty -LiteralPath $uninstallKey).InstallLocation -eq $installDir) 'Registered install location is incorrect.'

$originalPath = $env:PATH
$env:PATH = "$env:SystemRoot\System32;$env:SystemRoot;$env:SystemRoot\System32\Wbem"
Assert-True ($null -eq (Get-Command node -ErrorAction SilentlyContinue)) 'Sanitized clean-machine launch PATH still exposes a developer Node executable.'

$stop1 = Join-Path $env:TEMP 'hivenues-clean-machine-stop-1'
$url1 = Start-InstalledRuntime $launcher $stop1 $currentUrlPath
$origin1 = ([Uri]$url1).GetLeftPart([System.UriPartial]::Authority)
$home = Invoke-Get $url1
Assert-True ($home.StatusCode -eq 200) 'Installed Studio did not respond over loopback.'
Assert-True ($home.Content -match 'HiVenues') 'Installed Studio response was not the HiVenues product.'

$slug = 'clean-machine-studio'
$create = Invoke-PostForm "$origin1/hivenues/new" @{
  displayName = 'Clean Machine Studio'
  archetype = 'synthetic qualification host'
  timezone = 'America/Los_Angeles'
  presenceMode = 'physical'
  presenceLabel = 'Synthetic qualification location'
  address = '100 Qualification Way, Test City, NV 89101'
  tagline = 'Created on a clean Windows machine.'
  summary = 'A synthetic host created only to qualify the installed HiVenues product lifecycle.'
  contact = 'https://example.com/'
  purpose = 'Qualify install, author, release, relaunch, repair-style reinstall, uninstall, and reinstall persistence.'
  presenceMaterial = 'Synthetic material for a non-production qualification host.'
  direction = 'hospitality'
  participation = 'Review the synthetic qualification territory.'
  activityTitle = ''
  activityDescription = ''
  activityStartsLocal = ''
  activityEndsLocal = ''
} $origin1
Assert-True ($create.StatusCode -eq 303) "Create-host workflow returned $($create.StatusCode)."
Assert-True ($create.Headers.Location -match "/hivenues/studio/$slug") 'Create-host workflow did not route to the new Studio.'

$contentPage = Invoke-Get "$origin1/hivenues/studio/$slug/content"
Assert-True ($contentPage.StatusCode -eq 200) 'Content editor did not load from installed Studio.'
$revision = Hidden-Value $contentPage.Content 'expectedRevision'
$digest = Hidden-Value $contentPage.Content 'expectedDraftDigest'

$edit = Invoke-PostForm "$origin1/hivenues/studio/$slug/tagline" @{
  tagline = 'Edited and preserved on a clean machine.'
  expectedRevision = $revision
  expectedDraftDigest = $digest
} $origin1
Assert-True ($edit.StatusCode -eq 303) "Draft edit workflow returned $($edit.StatusCode)."

$releaseReview = Invoke-Get "$origin1/hivenues/studio/$slug/release"
Assert-True ($releaseReview.StatusCode -eq 200) 'Release review did not load.'
$releaseRevision = Hidden-Value $releaseReview.Content 'expectedRevision'
$releaseDigest = Hidden-Value $releaseReview.Content 'expectedDraftDigest'

$release = Invoke-PostForm "$origin1/hivenues/studio/$slug/release" @{
  expectedRevision = $releaseRevision
  expectedDraftDigest = $releaseDigest
} $origin1
Assert-True ($release.StatusCode -eq 303) "Release workflow returned $($release.StatusCode)."

$public = Invoke-Get "$origin1/hivenues/$slug"
Assert-True ($public.StatusCode -eq 200) 'Released synthetic host was not publicly readable from the installed runtime.'
Assert-True ($public.Content -match 'Edited and preserved on a clean machine\.') 'Released territory did not contain the edited tagline.'

Stop-InstalledRuntime $stop1 $currentUrlPath
$effectsAfterAuthoring = Assert-NoUnintendedEffects $diagnosticsPath
Assert-True (Test-Path -LiteralPath $statePath -PathType Leaf) 'Durable state file was not created.'
$stateHash = (Get-FileHash -LiteralPath $statePath -Algorithm SHA256).Hash.ToLowerInvariant()

Run-Installer $installer.FullName
Assert-True ((Get-FileHash -LiteralPath $statePath -Algorithm SHA256).Hash.ToLowerInvariant() -eq $stateHash) 'Repair/update-style reinstall changed durable workspace state.'

$stop2 = Join-Path $env:TEMP 'hivenues-clean-machine-stop-2'
$url2 = Start-InstalledRuntime $launcher $stop2 $currentUrlPath
$origin2 = ([Uri]$url2).GetLeftPart([System.UriPartial]::Authority)
$afterRepair = Invoke-Get "$origin2/hivenues/$slug"
Assert-True ($afterRepair.StatusCode -eq 200 -and $afterRepair.Content -match 'Edited and preserved on a clean machine\.') 'Released host did not survive repair/update-style reinstall.'
Stop-InstalledRuntime $stop2 $currentUrlPath
$effectsAfterRepair = Assert-NoUnintendedEffects $diagnosticsPath

Run-Uninstaller $uninstaller
Wait-Until { -not (Test-Path -LiteralPath $installDir) } 'Uninstall did not remove the installed program directory.'
Assert-True (-not (Test-Path -LiteralPath $startMenuShortcut)) 'Uninstall left the Start menu shortcut behind.'
Assert-True (-not (Test-Path -LiteralPath $uninstallKey)) 'Uninstall left Add/Remove Programs registration behind.'
Assert-True (Test-Path -LiteralPath $statePath -PathType Leaf) 'Uninstall destroyed user-owned durable state.'
Assert-True ((Get-FileHash -LiteralPath $statePath -Algorithm SHA256).Hash.ToLowerInvariant() -eq $stateHash) 'Uninstall modified user-owned durable state.'

Run-Installer $installer.FullName
Assert-True ((Get-FileHash -LiteralPath $statePath -Algorithm SHA256).Hash.ToLowerInvariant() -eq $stateHash) 'Reinstall modified preserved durable state.'

$stop3 = Join-Path $env:TEMP 'hivenues-clean-machine-stop-3'
$url3 = Start-InstalledRuntime $launcher $stop3 $currentUrlPath
$origin3 = ([Uri]$url3).GetLeftPart([System.UriPartial]::Authority)
$afterReinstall = Invoke-Get "$origin3/hivenues/$slug"
Assert-True ($afterReinstall.StatusCode -eq 200 -and $afterReinstall.Content -match 'Edited and preserved on a clean machine\.') 'Released host did not survive uninstall + reinstall.'
Stop-InstalledRuntime $stop3 $currentUrlPath
$effectsAfterReinstall = Assert-NoUnintendedEffects $diagnosticsPath

$env:PATH = $originalPath

$evidence = [ordered]@{
  result = 'PASS'
  scenario = 'Era 5 Tranche 3 clean-machine installer qualification'
  installer = [ordered]@{
    file = $installer.Name
    sha256 = $actualInstallerHash
    technology = [string]$provenance.installerTechnology
    technologyVersion = [string]$provenance.installerTechnologyVersion
    signing = [string]$provenance.signing
    installScope = [string]$provenance.installScope
  }
  source = [ordered]@{
    sha = [string]$provenance.sourceSha
    tree = [string]$provenance.sourceTree
    packageVersion = [string]$provenance.packageVersion
    nodeVersion = [string]$provenance.nodeVersion
  }
  installed = [ordered]@{
    installDir = $installDir
    dataRoot = $dataRoot
    privateNode = $privateNode
    developerNodeAvailableOnLaunchPath = $false
  }
  workflow = [ordered]@{
    slug = $slug
    created = $true
    edited = $true
    released = $true
    repairStyleReinstallPreservedState = $true
    uninstallPreservedState = $true
    reinstallRestoredReleasedHost = $true
    durableStateSha256 = $stateHash
  }
  scenarioConsequenceEvidence = [ordered]@{
    meaning = 'This local authoring/release qualification intentionally invokes no external-consequence workflow; zero counters are scenario evidence, not a permanent product invariant.'
    afterAuthoring = $effectsAfterAuthoring
    afterRepair = $effectsAfterRepair
    afterReinstall = $effectsAfterReinstall
  }
}
$evidencePath = Join-Path $evidenceRoot 'clean-machine-evidence.json'
$json = ($evidence | ConvertTo-Json -Depth 12) + [Environment]::NewLine
[System.IO.File]::WriteAllText($evidencePath, $json, [System.Text.UTF8Encoding]::new($false))
Copy-Item -LiteralPath $diagnosticsPath -Destination (Join-Path $evidenceRoot 'runtime-final.json') -Force
$evidence | ConvertTo-Json -Depth 12
