# setup-native-windows.ps1
# Youth360 — Native Windows Server Installation Script
# Run as Administrator on the target Windows Server (no internet required).
#
# Installs: Node.js 20, PostgreSQL 16, Redis, Ollama, Youth360 app (as Windows services)
#
# Usage:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\setup-native-windows.ps1
#
# To customise install path:
#   .\setup-native-windows.ps1 -InstallDir "D:\youth360"

param(
    [string]$InstallDir = "C:\youth360",
    [string]$DbPassword  = "youth360intranet",
    [string]$AppPort     = "3000",
    [string]$OllamaModel = "qwen2.5:3b"
)

$ErrorActionPreference = "Stop"
$BundleDir = $PSScriptRoot

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function OK($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "    [WARN] $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Error "[FAIL] $msg" }

# ---------------------------------------------------------------------------
# 0. Preflight
# ---------------------------------------------------------------------------
Step "Preflight checks"

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Fail "Run this script as Administrator (right-click PowerShell -> Run as Administrator)."
}
OK "Running as Administrator"

$OsVer = [System.Environment]::OSVersion.Version
if ($OsVer.Major -lt 10) { Fail "Windows Server 2019 or later required." }
OK "Windows version: $([System.Environment]::OSVersion.VersionString)"

foreach ($f in @("node-x64.msi","postgresql-16-windows-x64.exe","redis-windows.zip","OllamaSetup.exe","nssm-2.24.zip")) {
    if (-not (Test-Path "$BundleDir\installers\$f")) { Fail "Missing installer: $BundleDir\installers\$f" }
}
OK "All installer files present"

New-Item -ItemType Directory -Force -Path "$InstallDir\app","$InstallDir\ollama-models","$InstallDir\redis","$InstallDir\logs","$InstallDir\tools" | Out-Null
OK "Install directories created at $InstallDir"

# ---------------------------------------------------------------------------
# 1. Install Node.js 20
# ---------------------------------------------------------------------------
Step "Installing Node.js 20"
$nodeExe = "C:\Program Files\nodejs\node.exe"
if (Test-Path $nodeExe) {
    $nodeVer = & $nodeExe --version 2>$null
    Warn "Node.js already installed ($nodeVer) — skipping"
} else {
    Write-Host "    Running Node.js MSI installer (silent)..."
    $p = Start-Process msiexec.exe -ArgumentList "/i `"$BundleDir\installers\node-x64.msi`" /quiet /norestart ADDLOCAL=ALL" -Wait -PassThru
    if ($p.ExitCode -ne 0 -and $p.ExitCode -ne 3010) { Fail "Node.js installation failed (exit code $($p.ExitCode))." }
    OK "Node.js installed"
}

# Refresh PATH so node is available immediately
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("PATH", "User")

# ---------------------------------------------------------------------------
# 2. Install PostgreSQL 16
# ---------------------------------------------------------------------------
Step "Installing PostgreSQL 16"
$pgBin = "C:\Program Files\PostgreSQL\16\bin"
if (Test-Path "$pgBin\psql.exe") {
    Warn "PostgreSQL already installed — skipping base install"
} else {
    Write-Host "    Running PostgreSQL installer (silent — takes ~2 minutes)..."
    $pgArgs = "--mode unattended --unattendedmodeui none --superpassword `"$DbPassword`" --serverport 5432"
    $p = Start-Process "$BundleDir\installers\postgresql-16-windows-x64.exe" -ArgumentList $pgArgs -Wait -PassThru
    if ($p.ExitCode -ne 0) { Fail "PostgreSQL installation failed (exit code $($p.ExitCode))." }
    OK "PostgreSQL 16 installed"
}

# ---------------------------------------------------------------------------
# 3. Create database, user, and schema
# ---------------------------------------------------------------------------
Step "Configuring PostgreSQL database"
$env:PGPASSWORD = $DbPassword

# Create user
Write-Host "    Creating database user 'youth360'..."
& "$pgBin\psql.exe" -U postgres -p 5432 -c "CREATE USER youth360 WITH PASSWORD '$DbPassword';" 2>&1 | Out-Null

# Create database
Write-Host "    Creating database 'youth360'..."
& "$pgBin\psql.exe" -U postgres -p 5432 -c "CREATE DATABASE youth360 OWNER youth360 ENCODING 'UTF8';" 2>&1 | Out-Null

# Run init.sql
Write-Host "    Running schema initialisation..."
$env:PGPASSWORD = $DbPassword
& "$pgBin\psql.exe" -U youth360 -p 5432 -d youth360 -f "$BundleDir\db\init.sql"
if ($LASTEXITCODE -ne 0) { Fail "Database schema initialisation failed." }
OK "Database configured"

# ---------------------------------------------------------------------------
# 4. Install Redis as a Windows service
# ---------------------------------------------------------------------------
Step "Installing Redis"
$redisDir = "$InstallDir\redis"
if (Get-Service -Name "Redis" -ErrorAction SilentlyContinue) {
    Warn "Redis service already exists — skipping"
} else {
    Write-Host "    Extracting Redis..."
    Expand-Archive -Path "$BundleDir\installers\redis-windows.zip" -DestinationPath $redisDir -Force

    $redisExe = Get-ChildItem "$redisDir" -Filter "redis-server.exe" -Recurse | Select-Object -First 1 -ExpandProperty FullName
    if (-not $redisExe) { Fail "redis-server.exe not found after extraction." }

    Write-Host "    Registering Redis as Windows service..."
    & $redisExe --service-install --service-name Redis --port 6379
    Start-Service -Name "Redis"
    OK "Redis service started on port 6379"
}

# ---------------------------------------------------------------------------
# 5. Extract NSSM (service manager for Node.js app)
# ---------------------------------------------------------------------------
Step "Extracting NSSM"
$nssmZip = "$BundleDir\installers\nssm-2.24.zip"
$nssmExtract = "$InstallDir\tools\nssm-extract"
Expand-Archive -Path $nssmZip -DestinationPath $nssmExtract -Force
$nssmExe = Get-ChildItem $nssmExtract -Filter "nssm.exe" -Recurse |
    Where-Object { $_.DirectoryName -match "win64" } |
    Select-Object -First 1 -ExpandProperty FullName
Copy-Item $nssmExe "$InstallDir\tools\nssm.exe"
Remove-Item $nssmExtract -Recurse -Force
OK "NSSM ready at $InstallDir\tools\nssm.exe"

# ---------------------------------------------------------------------------
# 6. Install Ollama
# ---------------------------------------------------------------------------
Step "Installing Ollama"
$ollamaSearch = @(
    "$env:LocalAppData\Programs\Ollama\ollama.exe",
    "C:\Program Files\Ollama\ollama.exe",
    "$env:ProgramFiles\Ollama\ollama.exe"
)
$ollamaExe = $ollamaSearch | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($ollamaExe) {
    Warn "Ollama already installed at $ollamaExe — skipping install"
} else {
    Write-Host "    Running Ollama installer (silent)..."
    $p = Start-Process "$BundleDir\installers\OllamaSetup.exe" -ArgumentList "/S" -Wait -PassThru
    Start-Sleep -Seconds 5
    $ollamaExe = $ollamaSearch | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $ollamaExe) { Fail "Ollama executable not found after installation. Check the installer manually." }
    OK "Ollama installed at $ollamaExe"
}

# Stop any running Ollama process before loading models
Get-Process -Name "ollama" -ErrorAction SilentlyContinue | Stop-Process -Force

# ---------------------------------------------------------------------------
# 7. Load Ollama model weights
# ---------------------------------------------------------------------------
Step "Loading Ollama model weights (phi3:mini + qwen2.5:3b)"
$ollamaModelsDir = "$InstallDir\ollama-models"
$modelsArchive = "$BundleDir\ollama-models\models.tar.gz"

if (-not (Test-Path $modelsArchive)) { Fail "Missing: $modelsArchive" }

$existingBlobs = Get-ChildItem "$ollamaModelsDir\blobs" -ErrorAction SilentlyContinue
if ($existingBlobs -and $existingBlobs.Count -gt 0) {
    Warn "Ollama models already extracted — skipping"
} else {
    Write-Host "    Extracting model weights (~4 GB, takes a few minutes)..."
    # tar is built into Windows Server 2019+
    tar -xzf $modelsArchive -C $ollamaModelsDir
    if ($LASTEXITCODE -ne 0) { Fail "Failed to extract Ollama model weights." }
    OK "Model weights extracted"
}

# Set OLLAMA_MODELS as a system environment variable
[System.Environment]::SetEnvironmentVariable("OLLAMA_MODELS", $ollamaModelsDir, "Machine")
[System.Environment]::SetEnvironmentVariable("OLLAMA_HOST",   "127.0.0.1:11434", "Machine")
OK "OLLAMA_MODELS set to $ollamaModelsDir"

# Register Ollama as a Windows service using NSSM
$nssm = "$InstallDir\tools\nssm.exe"
if (Get-Service -Name "youth360-ollama" -ErrorAction SilentlyContinue) {
    Warn "youth360-ollama service already exists — restarting"
    & $nssm restart youth360-ollama
} else {
    & $nssm install youth360-ollama $ollamaExe "serve"
    & $nssm set youth360-ollama AppEnvironmentExtra "OLLAMA_MODELS=$ollamaModelsDir" "OLLAMA_HOST=127.0.0.1:11434"
    & $nssm set youth360-ollama AppStdout "$InstallDir\logs\ollama.log"
    & $nssm set youth360-ollama AppStderr "$InstallDir\logs\ollama-error.log"
    & $nssm set youth360-ollama Start SERVICE_AUTO_START
    & $nssm start youth360-ollama
    OK "Ollama service registered and started"
}

Write-Host "    Waiting for Ollama to be ready..."
$ready = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 2
}
if (-not $ready) { Warn "Ollama didn't respond in time — it may still be starting. Check logs at $InstallDir\logs\ollama.log" }
else { OK "Ollama is responding on port 11434" }

# ---------------------------------------------------------------------------
# 8. Deploy the Next.js app
# ---------------------------------------------------------------------------
Step "Deploying Youth360 application"
Write-Host "    Copying app files to $InstallDir\app..."
if (Test-Path "$InstallDir\app\apps") {
    Warn "App already deployed — overwriting with new version"
}
Copy-Item -Recurse -Force "$BundleDir\app\*" "$InstallDir\app\"
OK "App files copied"

# ---------------------------------------------------------------------------
# 9. Generate secrets and write .env
# ---------------------------------------------------------------------------
Step "Generating environment configuration"
$envFile = "$InstallDir\app\.env"

if (Test-Path $envFile) {
    Warn ".env already exists — not overwriting (delete it to regenerate)"
} else {
    $sessionSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
    $bytes = [byte[]]::new(32)
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $nricKey = ($bytes | ForEach-Object { '{0:x2}' -f $_ }) -join ''

    $envContent = @"
DATABASE_URL=postgresql://youth360:$DbPassword@localhost:5432/youth360
REDIS_URL=redis://localhost:6379
SESSION_SECRET=$sessionSecret
NRIC_ENCRYPTION_KEY=$nricKey
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=$OllamaModel
NODE_ENV=production
PORT=$AppPort
HOSTNAME=0.0.0.0
"@
    $envContent | Set-Content $envFile -Encoding UTF8
    OK "Generated .env with random secrets at $envFile"
}

# Load env vars for service registration
$envVars = Get-Content $envFile | Where-Object { $_ -match "=" -and -not $_.StartsWith("#") }

# ---------------------------------------------------------------------------
# 10. Register Youth360 app as Windows service
# ---------------------------------------------------------------------------
Step "Registering Youth360 as a Windows service"
$nodeExePath = (Get-Command node.exe -ErrorAction SilentlyContinue)?.Source
if (-not $nodeExePath) { $nodeExePath = "C:\Program Files\nodejs\node.exe" }
$serverJs = "$InstallDir\app\apps\web\server.js"

if (Get-Service -Name "youth360-app" -ErrorAction SilentlyContinue) {
    Warn "youth360-app service already exists — updating and restarting"
    & $nssm stop youth360-app
} else {
    & $nssm install youth360-app $nodeExePath $serverJs
}

& $nssm set youth360-app AppDirectory "$InstallDir\app"
& $nssm set youth360-app AppEnvironmentExtra ($envVars -join "`n")
& $nssm set youth360-app AppStdout "$InstallDir\logs\app.log"
& $nssm set youth360-app AppStderr "$InstallDir\logs\app-error.log"
& $nssm set youth360-app Start SERVICE_AUTO_START
& $nssm start youth360-app

# Wait for app to be ready
Write-Host "    Waiting for app to start on port $AppPort..."
$appReady = $false
for ($i = 1; $i -le 30; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$AppPort/api/health" -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $appReady = $true; break }
    } catch {}
    Start-Sleep -Seconds 3
}
if (-not $appReady) { Warn "App didn't respond in time — may still be starting. Check: $InstallDir\logs\app.log" }
else { OK "Youth360 app is running" }

# ---------------------------------------------------------------------------
# 11. Open Windows Firewall port
# ---------------------------------------------------------------------------
Step "Configuring Windows Firewall"
$ruleName = "Youth360 App Port $AppPort"
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $AppPort -Action Allow | Out-Null
    OK "Firewall rule added for port $AppPort"
} else {
    Warn "Firewall rule already exists"
}

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' } |
    Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Youth360 installation complete!" -ForegroundColor Green
Write-Host ""
if ($ip) {
Write-Host "  Access the app: http://$ip`:$AppPort" -ForegroundColor Green
}
Write-Host "  Local access:   http://localhost:$AppPort" -ForegroundColor Green
Write-Host ""
Write-Host "  AI provider:    Ollama — $OllamaModel (local, no internet)" -ForegroundColor Green
Write-Host "  Default login:  admin / admin123  (change immediately!)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Services installed:" -ForegroundColor White
Write-Host "    - youth360-app    (Node.js app, port $AppPort)" -ForegroundColor White
Write-Host "    - youth360-ollama (Local AI, port 11434)" -ForegroundColor White
Write-Host "    - Redis           (Cache, port 6379)" -ForegroundColor White
Write-Host "    - postgresql-x64  (Database, port 5432)" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  View app logs:     Get-Content $InstallDir\logs\app.log -Wait"
Write-Host "  Restart app:       Restart-Service youth360-app"
Write-Host "  Stop everything:   Stop-Service youth360-app, youth360-ollama, Redis"
Write-Host "  Switch AI model:   Edit $InstallDir\app\.env -> OLLAMA_MODEL=phi3:mini -> Restart-Service youth360-app"
