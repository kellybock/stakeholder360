# ==============================================================
# Youth360 — Redeploy Script (Windows)
# Pull latest code (or download from S3), rebuild, and restart
#
# Usage:
#   Option A — Redeploy from S3:
#     .\deploy\redeploy.ps1 -S3Url "https://your-bucket.s3.amazonaws.com/youth360-latest.zip"
#
#   Option B — Redeploy from GitHub:
#     .\deploy\redeploy.ps1
# ==============================================================

param(
    [string]$S3Url = ""
)

$ErrorActionPreference = "Stop"

$AppName = "youth360"
$AppDir = "C:\youth360"

function Log($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Warn($msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }

# Save the existing .env.local before replacing
$EnvFile = "$AppDir\apps\web\.env.local"
$EnvBackup = "$env:TEMP\youth360-env-backup"
if (Test-Path $EnvFile) {
    Copy-Item $EnvFile $EnvBackup
    Log "Backed up .env.local"
}

if ($S3Url) {
    Step "Downloading package from S3"
    $ZipPath = "$env:TEMP\youth360.zip"
    Invoke-WebRequest -Uri $S3Url -OutFile $ZipPath -UseBasicParsing
    Log "Package downloaded"

    Step "Stopping service"
    nssm stop $AppName 2>$null
    Log "Service stopped"

    Step "Extracting package"
    Remove-Item -Recurse -Force $AppDir
    Expand-Archive -Path $ZipPath -DestinationPath "C:\" -Force
    Remove-Item $ZipPath
    Log "Package extracted"

    # Restore .env.local
    if (Test-Path $EnvBackup) {
        Copy-Item $EnvBackup $EnvFile
        Remove-Item $EnvBackup
        Log "Restored .env.local"
    }

    Step "Restarting service"
    nssm start $AppName
    Log "Service restarted"
} else {
    Set-Location $AppDir

    Step "Pulling latest code"
    git pull
    Log "Code updated"

    Step "Installing dependencies"
    npm install --omit=dev 2>&1 | Select-Object -Last 1
    Log "Dependencies installed"

    Step "Building application"
    npm run build 2>&1 | Select-Object -Last 3
    Log "Build complete"

    Step "Restarting service"
    nssm restart $AppName
    Log "Service restarted"
}

Write-Host ""
Write-Host "Redeployment complete!" -ForegroundColor Green
nssm status $AppName
