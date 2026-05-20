# ==============================================================
# Youth360 — Redeploy Script (Windows)
# Pull latest code, rebuild, and restart the service
#
# Usage:
#   1. Open PowerShell as Administrator
#   2. cd C:\youth360
#   3. .\deploy\redeploy.ps1
# ==============================================================

$ErrorActionPreference = "Stop"

$AppName = "youth360"
$AppDir = "C:\youth360"

function Log($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

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

Write-Host ""
Write-Host "Redeployment complete!" -ForegroundColor Green
nssm status $AppName
