param(
  [Parameter(Mandatory = $true)]
  [string]$BundleRoot,
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$bundle = [System.IO.Path]::GetFullPath($BundleRoot)
$output = [System.IO.Path]::GetFullPath($OutputDirectory)
$provenancePath = Join-Path $bundle 'build-provenance.json'
$scriptPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\installer\windows\hivenues-studio.nsi'))

if (-not (Test-Path -LiteralPath $provenancePath -PathType Leaf)) { throw "Bundle provenance not found: $provenancePath" }
if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) { throw "NSIS installer script not found: $scriptPath" }

$provenance = Get-Content -LiteralPath $provenancePath -Raw | ConvertFrom-Json
if ($provenance.platform -ne 'win32' -or $provenance.arch -ne 'x64') { throw 'Tranche-3 installer currently requires a Windows x64 bundle.' }
if ($provenance.sourceSha -notmatch '^[a-f0-9]{40}$' -or $provenance.sourceTree -notmatch '^[a-f0-9]{40}$') { throw 'Bundle provenance is missing an exact Git source identity.' }
if ([string]::IsNullOrWhiteSpace([string]$provenance.packageVersion)) { throw 'Bundle provenance is missing the package version.' }

$version = [string]$provenance.packageVersion
$parts = @($version.Split('.'))
if ($parts.Count -lt 3 -or $parts.Count -gt 4 -or ($parts | Where-Object { $_ -notmatch '^\d+$' }).Count -ne 0) { throw "Package version '$version' cannot be represented as a Windows file version." }
while ($parts.Count -lt 4) { $parts += '0' }
$fileVersion = ($parts[0..3] -join '.')

New-Item -ItemType Directory -Force -Path $output | Out-Null
$baseName = "HiVenues-Studio-$version-windows-x64-setup"
$installer = Join-Path $output "$baseName.exe"
$checksum = Join-Path $output "$baseName.sha256"
$installerProvenance = Join-Path $output "$baseName.provenance.json"

$makensisCandidates = @(
  (Get-Command makensis.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1),
  (Join-Path ([Environment]::GetFolderPath('ProgramFilesX86')) 'NSIS\makensis.exe'),
  (Join-Path $env:ProgramFiles 'NSIS\makensis.exe')
) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) }
$makensis = $makensisCandidates | Select-Object -First 1
if (-not $makensis) { throw 'makensis.exe was not found. Install the pinned NSIS build dependency first.' }

$nsisVersion = (& $makensis /VERSION 2>&1 | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $nsisVersion -notmatch '^v?3\.12(?:\.0)?$') { throw "Expected NSIS 3.12.x, found '$nsisVersion'." }

Remove-Item -LiteralPath $installer -Force -ErrorAction SilentlyContinue
$arguments = @(
  "/DBUNDLE_ROOT=$bundle",
  "/DOUTPUT_FILE=$installer",
  "/DPRODUCT_VERSION=$version",
  "/DFILE_VERSION=$fileVersion",
  "/DSOURCE_SHA=$($provenance.sourceSha)",
  $scriptPath
)
& $makensis @arguments
if ($LASTEXITCODE -ne 0) { throw "NSIS installer build failed with exit code $LASTEXITCODE." }
if (-not (Test-Path -LiteralPath $installer -PathType Leaf)) { throw 'NSIS completed without producing the expected installer.' }

$hash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
$checksumLine = $hash + '  ' + [System.IO.Path]::GetFileName($installer) + [Environment]::NewLine
[System.IO.File]::WriteAllText($checksum, $checksumLine, [System.Text.UTF8Encoding]::new($false))

$record = [ordered]@{
  installerProvenanceVersion = 1
  product = 'HiVenues Studio'
  installerTechnology = 'NSIS'
  installerTechnologyVersion = $nsisVersion
  installScope = 'per-user'
  defaultInstallLocation = '%LOCALAPPDATA%\Programs\HiVenues Studio'
  durableDataLocation = '%LOCALAPPDATA%\HiVenues Studio'
  signing = 'unsigned'
  packageVersion = $version
  sourceSha = [string]$provenance.sourceSha
  sourceTree = [string]$provenance.sourceTree
  nodeVersion = [string]$provenance.nodeVersion
  packageManager = [string]$provenance.packageManager
  installer = [ordered]@{
    file = [System.IO.Path]::GetFileName($installer)
    sha256 = $hash
    bytes = (Get-Item -LiteralPath $installer).Length
  }
}
$json = ($record | ConvertTo-Json -Depth 8) + [Environment]::NewLine
[System.IO.File]::WriteAllText($installerProvenance, $json, [System.Text.UTF8Encoding]::new($false))
$record | ConvertTo-Json -Depth 8
