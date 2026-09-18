param(
  [Parameter(Mandatory = $true)]
  [string]$Output
)

$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot '..\..\native\windows\hivenues-launcher.c'
$source = [System.IO.Path]::GetFullPath($source)
$output = [System.IO.Path]::GetFullPath($Output)
$outputDirectory = Split-Path -Parent $output
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

$programFilesX86 = [Environment]::GetFolderPath('ProgramFilesX86')
$vswhere = Join-Path $programFilesX86 'Microsoft Visual Studio\Installer\vswhere.exe'
if (-not (Test-Path $vswhere)) {
  throw 'Visual Studio locator was not found on this Windows build host.'
}

$installation = (& $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath | Select-Object -First 1)
if (-not $installation) {
  throw 'A Visual C++ x64 build toolchain is required to build the HiVenues launcher.'
}

$vsdev = Join-Path $installation 'Common7\Tools\VsDevCmd.bat'
if (-not (Test-Path $vsdev)) {
  throw "Visual Studio developer environment was not found at $vsdev"
}

$object = Join-Path $outputDirectory 'hivenues-launcher.obj'
$commandFile = Join-Path $env:TEMP ("hivenues-launcher-build-{0}.cmd" -f $PID)
$command = @"
@echo off
call "$vsdev" -arch=amd64 -host_arch=amd64 >nul
if errorlevel 1 exit /b %errorlevel%
cl.exe /nologo /O2 /W4 /WX /MT /utf-8 /DUNICODE /D_UNICODE /DWIN32_LEAN_AND_MEAN /Fo:"$object" /Fe:"$output" "$source" /link /SUBSYSTEM:WINDOWS shell32.lib ole32.lib user32.lib
"@

try {
  Set-Content -LiteralPath $commandFile -Value $command -Encoding Ascii
  & cmd.exe /d /c $commandFile
  if ($LASTEXITCODE -ne 0) {
    throw "HiVenues launcher compilation failed with exit code $LASTEXITCODE."
  }
} finally {
  Remove-Item -LiteralPath $commandFile -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path $output)) {
  throw 'HiVenues launcher compilation completed without producing the expected executable.'
}

Write-Output $output
