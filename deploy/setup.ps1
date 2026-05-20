# ==============================================================
# Youth360 — One-Time Windows EC2 Setup Script
# Run on a fresh Windows Server 2022 EC2 instance via PowerShell (Admin)
#
# Usage:
#   1. RDP into your Windows EC2 instance
#   2. Open PowerShell as Administrator
#   3. Run: Set-ExecutionPolicy Bypass -Scope Process -Force
#   4. Run: .\setup.ps1
# ==============================================================

$ErrorActionPreference = "Stop"

$AppName = "youth360"
$AppDir = "C:\youth360"
$RepoUrl = "https://github.com/kellybock/stakeholder360.git"
$NodeVersion = "20"
$Port = 3000

function Log($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }
function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

# ----------------------------------------------------------
Step "1/7 — Installing Chocolatey (package manager)"
# ----------------------------------------------------------
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    $env:Path += ";C:\ProgramData\chocolatey\bin"
    Log "Chocolatey installed"
} else {
    Log "Chocolatey already installed"
}

# ----------------------------------------------------------
Step "2/7 — Installing Node.js $NodeVersion, Git, and NSSM"
# ----------------------------------------------------------
choco install nodejs-lts git nssm -y --no-progress | Out-Null

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

Log "Node.js $(node --version) installed"
Log "Git $(git --version) installed"
Log "NSSM (service manager) installed"

# ----------------------------------------------------------
Step "3/7 — Cloning repository"
# ----------------------------------------------------------
if (Test-Path $AppDir) {
    Warn "$AppDir already exists — pulling latest"
    Set-Location $AppDir
    git pull
} else {
    git clone $RepoUrl $AppDir
    Set-Location $AppDir
    Log "Repository cloned to $AppDir"
}

# ----------------------------------------------------------
Step "4/7 — Installing dependencies and building"
# ----------------------------------------------------------
npm install --omit=dev 2>&1 | Select-Object -Last 1
Log "Dependencies installed"

npm run build 2>&1 | Select-Object -Last 3
Log "Application built"

# ----------------------------------------------------------
Step "5/7 — Creating environment file"
# ----------------------------------------------------------
$EnvFile = "$AppDir\apps\web\.env.local"
if (Test-Path $EnvFile) {
    Warn ".env.local already exists — skipping"
} else {
    $SessionSecret = -join ((1..32) | ForEach-Object { "{0:x2}" -f (Get-Random -Max 256) })
    $NricKey = -join ((1..16) | ForEach-Object { "{0:x2}" -f (Get-Random -Max 256) })

    @"
# Database (optional for prototype — uses in-memory store)
DATABASE_URL=postgresql://youth360:youth360dev@localhost:5432/youth360

# Auth
SESSION_SECRET=$SessionSecret
NRIC_ENCRYPTION_KEY=$NricKey

# AI Providers — configure via Admin > Settings UI, or set here
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
"@ | Set-Content $EnvFile -Encoding UTF8

    Log "Created $EnvFile with generated secrets"
    Warn "Add your AI API keys via the portal's Admin > Settings page after first login"
}

# ----------------------------------------------------------
Step "6/7 — Configuring Windows Firewall"
# ----------------------------------------------------------
$rules = @(
    @{ Name = "Youth360-HTTP";  Port = 80 },
    @{ Name = "Youth360-HTTPS"; Port = 443 },
    @{ Name = "Youth360-App";   Port = $Port }
)
foreach ($rule in $rules) {
    if (!(Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $rule.Name -Direction Inbound -Protocol TCP -LocalPort $rule.Port -Action Allow | Out-Null
        Log "Firewall rule '$($rule.Name)' created (port $($rule.Port))"
    } else {
        Log "Firewall rule '$($rule.Name)' already exists"
    }
}

# ----------------------------------------------------------
Step "7/7 — Installing as Windows Service"
# ----------------------------------------------------------
$NssmPath = (Get-Command nssm).Source
$NodePath = (Get-Command node).Source
$NextBin = "$AppDir\apps\web\node_modules\.bin\next.cmd"

# Remove existing service if present
& $NssmPath stop $AppName 2>$null
& $NssmPath remove $AppName confirm 2>$null

# Install service
& $NssmPath install $AppName $NextBin start
& $NssmPath set $AppName AppDirectory "$AppDir\apps\web"
& $NssmPath set $AppName AppEnvironmentExtra "NODE_ENV=production" "PORT=$Port"
& $NssmPath set $AppName DisplayName "Youth360 Portal"
& $NssmPath set $AppName Description "Youth360 Stakeholder 360 Portal"
& $NssmPath set $AppName Start SERVICE_AUTO_START
& $NssmPath set $AppName AppStdout "$AppDir\logs\service-out.log"
& $NssmPath set $AppName AppStderr "$AppDir\logs\service-err.log"
& $NssmPath set $AppName AppRotateFiles 1
& $NssmPath set $AppName AppRotateBytes 10485760

New-Item -ItemType Directory -Path "$AppDir\logs" -Force | Out-Null

& $NssmPath start $AppName
Log "Youth360 installed and started as Windows service"

# ----------------------------------------------------------
# Done
# ----------------------------------------------------------
$PublicIp = try {
    (Invoke-WebRequest -Uri "http://169.254.169.254/latest/meta-data/public-ipv4" -TimeoutSec 3).Content
} catch { "localhost" }

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Youth360 deployment complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Portal:   http://$PublicIp" -ForegroundColor Cyan
Write-Host "  Login:    admin@youth360.gov.sg / demo1234" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Yellow
Write-Host "  1. Upload sample data from sample-data/ folder"
Write-Host "  2. Add AI API keys via Admin > Settings"
Write-Host "  3. (Optional) Set up IIS reverse proxy for SSL"
Write-Host ""
Write-Host "  Useful commands:" -ForegroundColor Yellow
Write-Host "  nssm status youth360        — check service status"
Write-Host "  nssm restart youth360       — restart app"
Write-Host "  Get-Content $AppDir\logs\service-out.log -Tail 50  — view logs"
Write-Host "  .\deploy\redeploy.ps1       — pull and redeploy"
Write-Host ""
