<#
.SYNOPSIS
  Cuts a new release of the dnd5e-pdf-exporter module: bumps the version in
  module.json, commits/pushes it, builds module.zip, creates a GitHub
  release, and uploads the zip as its asset.

.PARAMETER Token
  GitHub Personal Access Token with "Contents: Read and write" on the repo.
  Optional if a .env file (see .env.example) with GITHUB_TOKEN=... exists in
  the repo root - that value is used as a fallback.

.PARAMETER Version
  Version to release, e.g. "0.1.7". Omit to auto-bump the current patch
  version in module.json by 1.

.PARAMETER Notes
  Release notes body (Markdown). Omit for an empty body.

.PARAMETER NotesFile
  Path to a file containing the release notes body; takes precedence over
  -Notes if both are given.

.PARAMETER Prerelease
  Whether to mark the release as a pre-release. Defaults to true, since this
  module is still under active development. Pass -Prerelease:$false for a
  stable release.

.EXAMPLE
  .\tools\release.ps1 -Token $env:GH_TOKEN -Notes "Fixes the export crash."

.EXAMPLE
  .\tools\release.ps1 -Token $env:GH_TOKEN -Version 1.0.0 -Prerelease:$false
#>
param(
    [string]$Token,
    [string]$Version,
    [string]$Notes = "",
    [string]$NotesFile,
    [switch]$Prerelease = $true
)

$ErrorActionPreference = "Stop"

$RepoOwner = "Raddi1990"
$RepoName = "VTT-PDF-Export"
$RepoRoot = Split-Path -Parent $PSScriptRoot

Set-Location $RepoRoot

if (-not $Token) {
    $envPath = Join-Path $RepoRoot ".env"
    if (Test-Path $envPath) {
        $line = Get-Content $envPath | Where-Object { $_ -match '^\s*GITHUB_TOKEN\s*=\s*(.+)\s*$' } | Select-Object -First 1
        if ($line -match '^\s*GITHUB_TOKEN\s*=\s*(.+?)\s*$') {
            $Token = $Matches[1]
        }
    }
}
if (-not $Token) {
    throw "No token given and none found in .env (GITHUB_TOKEN=...). Pass -Token or create .env from .env.example."
}

if ($NotesFile) {
    $Notes = Get-Content -Path $NotesFile -Raw
}

# --- 1. Bump module.json ----------------------------------------------------

$moduleJsonPath = Join-Path $RepoRoot "module.json"
$moduleJson = Get-Content $moduleJsonPath -Raw | ConvertFrom-Json

if (-not $Version) {
    $parts = $moduleJson.version -split '\.'
    $parts[2] = [string]([int]$parts[2] + 1)
    $Version = $parts -join '.'
}

Write-Host "==> Releasing v$Version"

$moduleJson.version = $Version
$moduleJson.download = "https://github.com/$RepoOwner/$RepoName/releases/download/v$Version/module.zip"
($moduleJson | ConvertTo-Json -Depth 10) | Set-Content -Path $moduleJsonPath -Encoding utf8

$gitStatus = git status --porcelain -- module.json
if ($gitStatus) {
    Write-Host "==> Committing module.json bump"
    git add module.json
    git commit -m "Bump to v$Version"
    git push
} else {
    Write-Host "==> module.json already at v$Version, skipping commit"
}

# --- 2. Build module.zip ----------------------------------------------------

Write-Host "==> Building module.zip"

$stage = Join-Path $env:TEMP "vtt-pdf-export-release"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

Copy-Item "$RepoRoot\module.json" $stage
Copy-Item "$RepoRoot\src" "$stage\src" -Recurse
Copy-Item "$RepoRoot\scripts" "$stage\scripts" -Recurse
Copy-Item "$RepoRoot\lang" "$stage\lang" -Recurse
Copy-Item "$RepoRoot\styles" "$stage\styles" -Recurse

$zipPath = Join-Path $env:TEMP "module.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path "$stage\*" -DestinationPath $zipPath

Write-Host "==> Built $zipPath ($((Get-Item $zipPath).Length) bytes)"

# --- 3. Create the GitHub release -------------------------------------------

Write-Host "==> Creating GitHub release v$Version"

$headers = @{
    Authorization = "Bearer $Token"
    Accept        = "application/vnd.github+json"
}

$releaseBody = @{
    tag_name         = "v$Version"
    target_commitish = "main"
    name             = "v$Version"
    body             = $Notes
    draft            = $false
    prerelease       = [bool]$Prerelease
} | ConvertTo-Json

$release = Invoke-RestMethod -Uri "https://api.github.com/repos/$RepoOwner/$RepoName/releases" `
    -Method Post -Headers $headers -Body $releaseBody -ContentType "application/json; charset=utf-8"

Write-Host "==> Release created: $($release.html_url)"

# --- 4. Upload module.zip as the release asset ------------------------------

Write-Host "==> Uploading module.zip"

$uploadUrl = ($release.upload_url -replace '\{\?name,label\}', '') + "?name=module.zip"
Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $headers `
    -ContentType "application/zip" -InFile $zipPath | Out-Null

Write-Host "==> Asset uploaded"

# --- 5. Verify ---------------------------------------------------------------

Start-Sleep -Seconds 1

$manifestStatus = (Invoke-WebRequest -Uri "https://raw.githubusercontent.com/$RepoOwner/$RepoName/main/module.json" -UseBasicParsing).StatusCode
$zipStatus = (Invoke-WebRequest -Uri "https://github.com/$RepoOwner/$RepoName/releases/download/v$Version/module.zip" -UseBasicParsing -MaximumRedirection 5).StatusCode

Write-Host "==> Manifest raw: $manifestStatus | Zip download: $zipStatus"
Write-Host ""
Write-Host "Done: https://github.com/$RepoOwner/$RepoName/releases/tag/v$Version"
