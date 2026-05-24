# Youth360 - Windows Server EC2 Deployment Script
# Run as Administrator in PowerShell
# Usage: .\deploy\setup-windows.ps1 [-Domain "youth360.example.com"] [-Email "admin@example.com"]

param(
    [string]$Domain = "",
    [string]$Email = "admin@example.com"
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Youth360 - Windows Server Deployment"   -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# --- Step 1: Install Docker ---
Write-Host "[1/6] Checking Docker..." -ForegroundColor Yellow

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "  Installing Docker..."

    # Enable required Windows features
    Install-WindowsFeature -Name Containers -Restart:$false
    Install-WindowsFeature -Name Hyper-V -IncludeManagementTools -Restart:$false

    # Install Docker via Microsoft package
    Install-PackageProvider -Name NuGet -Force -MinimumVersion 2.8.5.201 | Out-Null
    Install-Module -Name DockerMsftProvider -Repository PSGallery -Force
    Install-Package -Name docker -ProviderName DockerMsftProvider -Force

    # Configure Docker to use Linux containers (via LCOW or switch)
    # For Windows Server 2022+, enable WSL2 integration
    Write-Host "  Enabling WSL2 for Linux containers..."
    wsl --install --no-distribution 2>$null
    dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart 2>$null
    dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart 2>$null

    # Set Docker to use Linux containers
    $dockerConfigDir = "$env:ProgramData\docker\config"
    if (-not (Test-Path $dockerConfigDir)) { New-Item -ItemType Directory -Path $dockerConfigDir -Force | Out-Null }
    @{ "experimental" = $true } | ConvertTo-Json | Set-Content "$dockerConfigDir\daemon.json"

    # Start Docker service
    Start-Service docker -ErrorAction SilentlyContinue
    Set-Service docker -StartupType Automatic

    Write-Host "  Docker installed. A RESTART may be required." -ForegroundColor Red
    Write-Host "  After restart, re-run this script to continue." -ForegroundColor Red
    Write-Host ""
    $restart = Read-Host "  Restart now? (y/n)"
    if ($restart -eq "y") { Restart-Computer -Force }
    exit 0
} else {
    Write-Host "  Docker is installed." -ForegroundColor Green
    docker --version
}

# Verify Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "  Starting Docker service..." -ForegroundColor Yellow
    Start-Service docker
    Start-Sleep -Seconds 5
}

# Install Docker Compose plugin if missing
if (-not (docker compose version 2>$null)) {
    Write-Host "  Installing Docker Compose..."
    $composeUrl = "https://github.com/docker/compose/releases/latest/download/docker-compose-windows-x86_64.exe"
    $composePath = "$env:ProgramFiles\Docker\docker-compose.exe"
    Invoke-WebRequest -Uri $composeUrl -OutFile $composePath -UseBasicParsing
    Write-Host "  Docker Compose installed."
}

# --- Step 2: Create .env ---
Write-Host "[2/6] Setting up environment..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    $sessionSecret = -join ((48..57) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    $nricKey = -join ((48..57) + (97..102) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    $dbPassword = -join ((48..57) + (97..122) | Get-Random -Count 16 | ForEach-Object { [char]$_ })

    @"
# Database
DB_PASSWORD=$dbPassword

# Security
SESSION_SECRET=$sessionSecret
NRIC_ENCRYPTION_KEY=$nricKey

# AI Providers (add your keys)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=

# Domain
DOMAIN=$Domain
EMAIL=$Email
"@ | Set-Content ".env" -Encoding UTF8

    Write-Host "  Created .env with generated secrets." -ForegroundColor Green
    Write-Host "  >> Edit .env to add your AI API keys if needed." -ForegroundColor Yellow
} else {
    Write-Host "  .env already exists, skipping." -ForegroundColor Green
}

# --- Step 3: SSL Setup ---
Write-Host "[3/6] Setting up SSL certificates..." -ForegroundColor Yellow

$certDir = "deploy\certbot\conf\live\youth360"
if (-not (Test-Path $certDir)) { New-Item -ItemType Directory -Path $certDir -Force | Out-Null }

if ([string]::IsNullOrEmpty($Domain)) {
    Write-Host "  No domain provided. Generating self-signed certificate..."

    # Generate self-signed cert using Docker (openssl)
    docker run --rm -v "${PWD}\deploy\certbot\conf\live\youth360:/certs" alpine/openssl `
        req -x509 -nodes -days 365 -newkey rsa:2048 `
        -keyout /certs/privkey.pem `
        -out /certs/fullchain.pem `
        -subj "/CN=localhost"

    Write-Host "  Self-signed cert created." -ForegroundColor Green
} else {
    Write-Host "  Domain: $Domain"
    Write-Host "  Will request Let's Encrypt certificate..."

    # Create temporary self-signed cert so nginx can start
    docker run --rm -v "${PWD}\deploy\certbot\conf\live\youth360:/certs" alpine/openssl `
        req -x509 -nodes -days 1 -newkey rsa:2048 `
        -keyout /certs/privkey.pem `
        -out /certs/fullchain.pem `
        -subj "/CN=$Domain"

    # Start nginx for ACME challenge
    docker compose -f docker-compose.prod.yml up -d nginx
    Start-Sleep -Seconds 5

    # Request real cert
    docker compose -f docker-compose.prod.yml run --rm certbot certonly `
        --webroot --webroot-path=/var/www/certbot `
        --email $Email --agree-tos --no-eff-email `
        -d $Domain

    docker compose -f docker-compose.prod.yml down
    Write-Host "  SSL certificate obtained for $Domain" -ForegroundColor Green
}

# --- Step 4: Build ---
Write-Host "[4/6] Building the application..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml build app

# --- Step 5: Start ---
Write-Host "[5/6] Starting all services..." -ForegroundColor Yellow
docker compose -f docker-compose.prod.yml up -d

# --- Step 6: Verify ---
Write-Host "[6/6] Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Ensure linkedin_profiles table exists in both schemas
Write-Host "  Verifying database tables..."
$sqlCmd = @"
CREATE TABLE IF NOT EXISTS linkedin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE,
  linkedin_url VARCHAR(500) NOT NULL DEFAULT '',
  headline VARCHAR(500),
  summary TEXT,
  location VARCHAR(255),
  education JSONB,
  experiences JSONB,
  posts JSONB,
  skills JSONB,
  raw_response JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS test.linkedin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE,
  linkedin_url VARCHAR(500) NOT NULL DEFAULT '',
  headline VARCHAR(500),
  summary TEXT,
  location VARCHAR(255),
  education JSONB,
  experiences JSONB,
  posts JSONB,
  skills JSONB,
  raw_response JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"@
docker compose -f docker-compose.prod.yml exec -T postgres psql -U youth360 -d youth360 -c "$sqlCmd" 2>$null
Write-Host "  Database tables verified." -ForegroundColor Green

$healthy = docker compose -f docker-compose.prod.yml ps --format json 2>$null
Write-Host "  Services running:" -ForegroundColor Green
docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Deployment complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if ([string]::IsNullOrEmpty($Domain)) {
    Write-Host "  App: https://<your-ec2-public-ip>" -ForegroundColor White
    Write-Host "  (Self-signed cert - browser will show warning)" -ForegroundColor DarkGray
} else {
    Write-Host "  App: https://$Domain" -ForegroundColor White
}

Write-Host ""
Write-Host "  Login: admin@youth360.gov.sg / demo1234" -ForegroundColor White
Write-Host ""
Write-Host "  Useful commands:" -ForegroundColor DarkGray
Write-Host "    docker compose -f docker-compose.prod.yml logs -f       # View logs" -ForegroundColor DarkGray
Write-Host "    docker compose -f docker-compose.prod.yml down          # Stop all" -ForegroundColor DarkGray
Write-Host "    docker compose -f docker-compose.prod.yml up -d         # Start all" -ForegroundColor DarkGray
Write-Host "    docker compose -f docker-compose.prod.yml restart app   # Restart app" -ForegroundColor DarkGray
Write-Host ""
