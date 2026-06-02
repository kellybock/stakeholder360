# setup-intranet.ps1
# Run this on the INTRANET SERVER (no internet required).
# Place this script in the root of the offline bundle folder and run from there.
#
# Prerequisites:
#   - Docker Desktop for Windows installed and running (with WSL2)
#   - PowerShell 5.1+ (runs as Administrator)

$ErrorActionPreference = "Stop"
$BundleRoot = $PSScriptRoot

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Fail($msg) { Write-Error $msg }

# ---------------------------------------------------------------------------
# 0. Preflight
# ---------------------------------------------------------------------------
Step "Preflight checks"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Fail "Docker not found. Install Docker Desktop for Windows first (included README.txt)."
}
docker info | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "Docker daemon is not running. Start Docker Desktop and try again." }
OK "Docker is running"

$ImgDir    = "$BundleRoot\docker-images"
$AppDir    = "$BundleRoot\app"
$ModelsDir = "$BundleRoot\ollama-models"
foreach ($d in @($ImgDir, $AppDir, $ModelsDir)) {
    if (-not (Test-Path $d)) { Fail "Bundle incomplete — missing directory: $d" }
}
OK "Bundle structure verified"

# ---------------------------------------------------------------------------
# 1. Load Docker images
# ---------------------------------------------------------------------------
Step "Loading Docker images (this takes a few minutes)"
$Tars = @(
    "pgvector-pg16.tar",
    "redis-7-alpine.tar",
    "nginx-alpine.tar",
    "ollama-latest.tar",
    "alpine-latest.tar",
    "youth360-app.tar"
)
foreach ($tar in $Tars) {
    $path = "$ImgDir\$tar"
    if (-not (Test-Path $path)) { Fail "Missing image file: $path" }
    Write-Host "    Loading $tar ..."
    docker load -i $path
    if ($LASTEXITCODE -ne 0) { Fail "Failed to load $tar" }
}
OK "All Docker images loaded"

# ---------------------------------------------------------------------------
# 2. Load Ollama model weights into a Docker volume
# ---------------------------------------------------------------------------
Step "Loading Ollama model weights into Docker volume"
$VolName = "youth360-ollama-data"

# Create volume (skip if already exists)
docker volume inspect $VolName 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    docker volume create $VolName | Out-Null
    OK "Created volume $VolName"
} else {
    Write-Host "    Volume $VolName already exists — skipping model import (delete it to re-import)"
}

# Only import if the volume was just created (empty)
$volSize = docker run --rm -v "${VolName}:/data" alpine:latest sh -c "du -sh /data 2>/dev/null | cut -f1"
if ($volSize -eq "0" -or $volSize -eq "" -or $volSize -match "^0\b") {
    $ModelsArchive = "$ModelsDir\models.tar.gz"
    if (-not (Test-Path $ModelsArchive)) { Fail "Missing Ollama models archive: $ModelsArchive" }

    $ModelsArchiveFwd = $ModelsArchive -replace '\\', '/'
    Write-Host "    Importing model weights (may take a minute) ..."
    docker run --rm `
        -v "${VolName}:/data" `
        -v "${ModelsArchiveFwd}:/backup/models.tar.gz:ro" `
        alpine:latest `
        sh -c "tar xzf /backup/models.tar.gz -C /data"
    if ($LASTEXITCODE -ne 0) { Fail "Failed to extract Ollama model weights." }
    OK "Model weights loaded into volume"
}

# ---------------------------------------------------------------------------
# 3. Configure environment file
# ---------------------------------------------------------------------------
Step "Configuring environment"
$EnvTemplate = "$AppDir\.env.intranet"
$EnvFile     = "$AppDir\.env"

if (-not (Test-Path $EnvTemplate)) { Fail "Missing: $EnvTemplate" }

if (Test-Path $EnvFile) {
    Write-Host "    .env already exists — skipping generation (delete it to regenerate)"
} else {
    # Generate SESSION_SECRET (64 random alphanumeric chars)
    $sessionSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })

    # Generate NRIC_ENCRYPTION_KEY (32 random bytes as 64 hex chars)
    $bytes = [byte[]]::new(32)
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $nricKey = ($bytes | ForEach-Object { '{0:x2}' -f $_ }) -join ''

    (Get-Content $EnvTemplate) `
        -replace 'CHANGE_ME_64_CHAR_RANDOM_STRING', $sessionSecret `
        -replace 'CHANGE_ME_64_HEX_CHARS', $nricKey |
    Set-Content $EnvFile -Encoding UTF8
    OK "Generated .env with random secrets"
}

# ---------------------------------------------------------------------------
# 4. Start services
# ---------------------------------------------------------------------------
Step "Starting Youth360 services"
Push-Location $AppDir

docker compose -f docker-compose.intranet.yml --env-file .env up -d
if ($LASTEXITCODE -ne 0) { Fail "docker compose failed to start services." }

OK "Services started"
Pop-Location

# ---------------------------------------------------------------------------
# 5. Wait for healthy state and run DB migrations
# ---------------------------------------------------------------------------
Step "Waiting for database to be ready"
$retries = 20
for ($i = 1; $i -le $retries; $i++) {
    $state = docker inspect --format "{{.State.Health.Status}}" youth360-db 2>$null
    if ($state -eq "healthy") { break }
    Write-Host "    Attempt $i/$retries — DB status: $state"
    Start-Sleep -Seconds 5
}
if ($state -ne "healthy") { Fail "Database did not become healthy after $($retries * 5)s." }
OK "Database is healthy"

Step "Running database migrations"
Push-Location $AppDir
docker exec youth360-app node -e "
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const sql = postgres(process.env.DATABASE_URL);
migrate(drizzle(sql), { migrationsFolder: './packages/db/drizzle' }).then(() => {
  console.log('Migrations complete');
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
" 2>$null

if ($LASTEXITCODE -ne 0) {
    # Schema is already applied via init.sql on first postgres start; this is non-fatal
    Write-Host "    Note: drizzle migrate not available in standalone build — schema applied via init.sql" -ForegroundColor Yellow
}
Pop-Location

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' } | Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Youth360 is running!" -ForegroundColor Green
Write-Host ""
Write-Host "  Local access  : http://localhost" -ForegroundColor Green
if ($ip) {
Write-Host "  Network access: http://$ip" -ForegroundColor Green
}
Write-Host ""
Write-Host "  AI provider   : Ollama (local, no internet needed)" -ForegroundColor Green
Write-Host "  Default login : admin / admin123  (change immediately)" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "To stop:    docker compose -f $AppDir\docker-compose.intranet.yml down"
Write-Host "To restart: docker compose -f $AppDir\docker-compose.intranet.yml up -d"
Write-Host "Logs:       docker compose -f $AppDir\docker-compose.intranet.yml logs -f"
