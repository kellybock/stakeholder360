# package-offline.ps1
# Run this on the INTERNET-CONNECTED machine to build the full offline bundle.
# Prerequisites: Docker Desktop running, git, sufficient disk space (~8 GB free).
#
# Usage:
#   cd <repo-root>
#   .\deploy\package-offline.ps1
#   .\deploy\package-offline.ps1 -OutputDir "D:\transfer\youth360-bundle"
#   .\deploy\package-offline.ps1 -OllamaModel "mistral:7b-instruct-q4_K_M"   # slower but smarter

param(
    [string]$OutputDir   = "youth360-offline-bundle",
    [string]$OllamaModel = "phi3:mini"
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot | Split-Path -Parent

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function OK($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "    WARN: $msg" -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
# 0. Preflight
# ---------------------------------------------------------------------------
Step "Preflight checks"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker not found. Install Docker Desktop first."
}
docker info | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error "Docker daemon is not running." }
OK "Docker is running"

$AbsOut = [IO.Path]::GetFullPath($OutputDir)
$ImgDir = "$AbsOut\docker-images"
$AppDir = "$AbsOut\app"

New-Item -ItemType Directory -Force -Path $AbsOut, $ImgDir, "$AppDir\deploy\nginx\conf.d", "$AppDir\packages\db" | Out-Null
OK "Output directory: $AbsOut"

# ---------------------------------------------------------------------------
# 1. Build the app image
# ---------------------------------------------------------------------------
Step "Building youth360-app Docker image (this takes a few minutes)"
Push-Location $RepoRoot
docker build -t youth360-app:latest .
if ($LASTEXITCODE -ne 0) { Write-Error "App image build failed." }
OK "Built youth360-app:latest"
Pop-Location

# ---------------------------------------------------------------------------
# 2. Pull all required base images
# ---------------------------------------------------------------------------
Step "Pulling base images"
$Images = @(
    "pgvector/pgvector:pg16",
    "redis:7-alpine",
    "nginx:alpine",
    "ollama/ollama:latest",
    "alpine:latest"
)
foreach ($img in $Images) {
    Write-Host "    Pulling $img ..."
    docker pull $img
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed to pull $img" }
}
OK "All base images pulled"

# ---------------------------------------------------------------------------
# 3. Save all images as .tar files
# ---------------------------------------------------------------------------
Step "Saving Docker images to $ImgDir"
$SaveMap = @{
    "pgvector-pg16.tar"    = "pgvector/pgvector:pg16"
    "redis-7-alpine.tar"   = "redis:7-alpine"
    "nginx-alpine.tar"     = "nginx:alpine"
    "ollama-latest.tar"    = "ollama/ollama:latest"
    "alpine-latest.tar"    = "alpine:latest"
    "youth360-app.tar"     = "youth360-app:latest"
}
foreach ($file in $SaveMap.Keys) {
    $img = $SaveMap[$file]
    Write-Host "    Saving $img -> $file ..."
    docker save $img -o "$ImgDir\$file"
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed to save $img" }
}
OK "All images saved"

# ---------------------------------------------------------------------------
# 4. Pre-pull Ollama model weights into a Docker volume
# ---------------------------------------------------------------------------
Step "Downloading Ollama model: $OllamaModel (may take several minutes on first run)"
$VolName = "youth360-ollama-bundle-temp"

# Clean up any leftover from a previous run
docker rm -f ollama-bundle-temp 2>$null | Out-Null
docker volume rm $VolName 2>$null | Out-Null

# Start Ollama container with the volume
docker run -d --name ollama-bundle-temp -v "${VolName}:/root/.ollama" ollama/ollama:latest
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to start temporary Ollama container." }

Write-Host "    Waiting for Ollama to start..."
Start-Sleep -Seconds 5

Write-Host "    Pulling $OllamaModel inside container..."
docker exec ollama-bundle-temp ollama pull $OllamaModel
if ($LASTEXITCODE -ne 0) {
    docker rm -f ollama-bundle-temp | Out-Null
    Write-Error "Failed to pull Ollama model $OllamaModel."
}
OK "Model $OllamaModel downloaded"

docker stop ollama-bundle-temp | Out-Null
docker rm ollama-bundle-temp | Out-Null

# Export the volume to a tar.gz using the alpine image
Step "Exporting Ollama model weights to archive"
New-Item -ItemType Directory -Force -Path "$AbsOut\ollama-models" | Out-Null

# Use alpine container to tar the volume contents into the output directory
# On Windows, the host path must use forward slashes for the -v bind mount
$AbsOutFwd = $AbsOut -replace '\\', '/'
docker run --rm `
    -v "${VolName}:/data" `
    -v "${AbsOutFwd}/ollama-models:/backup" `
    alpine:latest `
    tar czf /backup/models.tar.gz -C /data .
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to export Ollama model volume." }

docker volume rm $VolName | Out-Null
OK "Ollama models exported"

# ---------------------------------------------------------------------------
# 5. Copy application config files
# ---------------------------------------------------------------------------
Step "Copying application config files"

Copy-Item "$RepoRoot\docker-compose.intranet.yml" "$AppDir\docker-compose.intranet.yml"
Copy-Item "$RepoRoot\.env.intranet"               "$AppDir\.env.intranet"
Copy-Item "$RepoRoot\deploy\nginx\conf.d\intranet.conf" "$AppDir\deploy\nginx\conf.d\intranet.conf"
Copy-Item "$RepoRoot\packages\db\init.sql"        "$AppDir\packages\db\init.sql"

OK "Config files copied"

# ---------------------------------------------------------------------------
# 6. Write setup script into bundle
# ---------------------------------------------------------------------------
Step "Writing setup-intranet.ps1 into bundle"
Copy-Item "$RepoRoot\deploy\setup-intranet.ps1" "$AbsOut\setup-intranet.ps1"
OK "Setup script included"

# ---------------------------------------------------------------------------
# 7. Write quick-start instructions
# ---------------------------------------------------------------------------
$readme = @"
Youth360 — Intranet Offline Bundle
====================================
Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm')
Ollama model: $OllamaModel

REQUIREMENTS ON THE TARGET SERVER
----------------------------------
- Windows Server 2019 or 2022 (64-bit)
- Docker Desktop for Windows installed and running
  (download separately while on internet; ~600 MB)
  https://desktop.docker.com/win/main/amd64/Docker Desktop Installer.exe
- WSL2 enabled (required by Docker Desktop)
- 8 GB RAM minimum recommended
- 20 GB free disk space

QUICK START
-----------
1. Copy this entire folder to the intranet server (USB / file share).
2. Open PowerShell as Administrator on the server.
3. cd to this folder.
4. Run:
       .\setup-intranet.ps1
5. Follow the prompts to set SESSION_SECRET and NRIC_ENCRYPTION_KEY.
6. Access the app at http://<server-ip>

BUNDLE CONTENTS
---------------
docker-images\       Pre-saved Docker image tarballs
ollama-models\       Pre-downloaded LLM model weights ($OllamaModel)
app\                 Docker Compose config + Nginx config + DB init SQL
setup-intranet.ps1   Automated setup script (run this first)
"@
$readme | Out-File -Encoding UTF8 "$AbsOut\README.txt"

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
$SizeGB = [math]::Round((Get-ChildItem $AbsOut -Recurse | Measure-Object Length -Sum).Sum / 1GB, 2)
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Bundle ready: $AbsOut" -ForegroundColor Green
Write-Host "  Total size  : $SizeGB GB" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Transfer this folder to the intranet server and run:" -ForegroundColor Yellow
Write-Host "  .\setup-intranet.ps1" -ForegroundColor Yellow
