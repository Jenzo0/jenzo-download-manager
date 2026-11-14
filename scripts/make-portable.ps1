# Builds the Windows portable zip from a finished release build.
# Usage: ./scripts/make-portable.ps1 [-Target x86_64-pc-windows-gnu]
param([string]$Target = "")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$extTarget = Join-Path (Split-Path -Parent $root) "build\target"
$targetDir = if ($env:CARGO_TARGET_DIR) { $env:CARGO_TARGET_DIR } elseif (Test-Path $extTarget) { $extTarget } else { Join-Path $root "target" }

if (-not $Target) {
  if (Test-Path (Join-Path $targetDir "x86_64-pc-windows-gnu\release\jenzo.exe")) {
    $Target = "x86_64-pc-windows-gnu"
  } else {
    $Target = "x86_64-pc-windows-msvc"
  }
}

$release = Join-Path $targetDir "$Target\release"
if (-not (Test-Path (Join-Path $release "jenzo.exe"))) { $release = Join-Path $targetDir "release" }
$version = (Get-Content (Join-Path $root "app\src-tauri\tauri.conf.json") | ConvertFrom-Json).version
$outRoot = if (Test-Path (Join-Path (Split-Path -Parent $root) "build")) { Join-Path (Split-Path -Parent $root) "build\portable" } else { Join-Path $root "packaging\out" }
New-Item -ItemType Directory -Force $outRoot | Out-Null
$stage = Join-Path $outRoot "Jenzo-$version-portable"
$zip = Join-Path $outRoot "Jenzo-$version-windows-x64-portable.zip"

Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $stage | Out-Null
Copy-Item (Join-Path $release "jenzo.exe") $stage

# Copy required runtime DLLs (e.g. WebView2Loader.dll for GNU toolchain)
Get-ChildItem -Path $release -Filter "*.dll" | ForEach-Object {
  Copy-Item $_.FullName $stage
}

$sidecarBin = Join-Path $root "app\src-tauri\binaries\jenzo-native-host-$Target.exe"
if (-not (Test-Path $sidecarBin)) {
  $sidecarBin = (Get-ChildItem (Join-Path $root "app\src-tauri\binaries\jenzo-native-host-*.exe") | Select-Object -First 1).FullName
}
Copy-Item $sidecarBin (Join-Path $stage "jenzo-native-host.exe")

# portable.txt switches the data directory to .\data next to jenzo.exe
Set-Content -Path (Join-Path $stage "portable.txt") -Value "Jenzo portable mode: settings and history are stored in the data folder next to jenzo.exe." -Encoding utf8
$ext = Join-Path $root "extension\build"
if (Test-Path $ext) {
  New-Item -ItemType Directory -Force (Join-Path $stage "extension") | Out-Null
  Copy-Item -Recurse (Join-Path $ext "chromium") (Join-Path $stage "extension\chromium")
  Copy-Item -Recurse (Join-Path $ext "firefox") (Join-Path $stage "extension\firefox")
}
Copy-Item (Join-Path $root "packaging\windows\PORTABLE-README.txt") $stage
Remove-Item -Force $zip -ErrorAction SilentlyContinue
# tar.exe (Windows 10+) writes portable forward-slash paths; Compress-Archive on PS 5.1 does not.
$bsdtar = Join-Path $env:SystemRoot "System32\tar.exe"   # not Git's GNU tar, which can't write zips
& $bsdtar -a -c -f $zip -C $stage .
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $zip)) { throw "tar failed to create $zip" }
Write-Host "portable: $zip"
