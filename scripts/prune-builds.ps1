# Retains the current version and at most 1 previous version in build/{installers,portable,extension}.
param(
  [string]$Mode = "post"
)
$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $PSScriptRoot
$repoRoot = Split-Path -Parent $root
$buildDir = Join-Path $repoRoot "build"
$currentVer = (Get-Content (Join-Path $root "app\src-tauri\tauri.conf.json") | ConvertFrom-Json).version

if ($Mode -eq "pre-extension") {
  $extDir = Join-Path $buildDir "extension"
  $manifestPath = Join-Path $extDir "chromium\manifest.json"
  if (Test-Path $manifestPath) {
    $oldVer = (Get-Content $manifestPath | ConvertFrom-Json).version
    if ($oldVer -and ($oldVer -ne $currentVer)) {
      $archiveDir = Join-Path $extDir "v$oldVer"
      Remove-Item -Recurse -Force $archiveDir
      New-Item -ItemType Directory -Force $archiveDir | Out-Null
      foreach ($item in @("chromium", "firefox", "jenzo-chromium.zip", "jenzo-firefox.zip")) {
        $src = Join-Path $extDir $item
        if (Test-Path $src) {
          Copy-Item -Recurse -Force $src (Join-Path $archiveDir $item)
        }
      }
    }
  }
  exit 0
}

# 1. Installers: keep newest 2 setup executables
$instDir = Join-Path $buildDir "installers"
if (Test-Path $instDir) {
  $exes = Get-ChildItem -Path $instDir -File -Filter "*.exe" | Sort-Object Name -Descending
  if ($exes.Count -gt 2) {
    $exes | Select-Object -Skip 2 | Remove-Item -Force
  }
}

# 2. Portable: keep newest 2 portable folders and newest 2 portable ZIPs
$portDir = Join-Path $buildDir "portable"
if (Test-Path $portDir) {
  $dirs = Get-ChildItem -Path $portDir -Directory -Filter "Jenzo-*-portable" | Sort-Object Name -Descending
  if ($dirs.Count -gt 2) {
    $dirs | Select-Object -Skip 2 | Remove-Item -Recurse -Force
  }
  $zips = Get-ChildItem -Path $portDir -File -Filter "Jenzo-*-windows-x64-portable.zip" | Sort-Object Name -Descending
  if ($zips.Count -gt 2) {
    $zips | Select-Object -Skip 2 | Remove-Item -Force
  }
}

# 3. Extension: keep current top-level build + at most 1 previous vX.Y.Z subfolder
$extDir = Join-Path $buildDir "extension"
if (Test-Path $extDir) {
  $sameVerDir = Join-Path $extDir "v$currentVer"
  if (Test-Path $sameVerDir) {
    Remove-Item -Recurse -Force $sameVerDir
  }
  $prevDirs = Get-ChildItem -Path $extDir -Directory -Filter "v*" | Sort-Object Name -Descending
  if ($prevDirs.Count -gt 1) {
    $prevDirs | Select-Object -Skip 1 | Remove-Item -Recurse -Force
  }
}
