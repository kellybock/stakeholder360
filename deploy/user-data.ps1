<powershell>
# ==============================================================
# Youth360 — EC2 User Data Script (Windows)
#
# Paste this into the "User data" field when launching a
# Windows Server 2022 EC2 instance.
#
# Instance requirements:
#   AMI:    Windows Server 2022 Base
#   Type:   t3.medium or larger
#   Storage: 50 GB gp3
#   Security Group: allow ports 3389 (RDP), 80, 443, 3000
# ==============================================================

Start-Transcript -Path "C:\youth360-setup.log" -Append
$ErrorActionPreference = "Stop"

$AppName = "youth360"
$AppDir = "C:\youth360"
$RepoUrl = "https://github.com/kellybock/stakeholder360.git"
$Port = 3000

# Install Chocolatey
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
$env:Path += ";C:\ProgramData\chocolatey\bin"

# Install Node.js, Git, NSSM
choco install nodejs-lts git nssm -y --no-progress | Out-Null
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# Clone and build
git clone $RepoUrl $AppDir
Set-Location $AppDir
npm install --omit=dev 2>&1 | Out-Null
npm run build 2>&1 | Out-Null

# Generate env file
$SessionSecret = -join ((1..32) | ForEach-Object { "{0:x2}" -f (Get-Random -Max 256) })
$NricKey = -join ((1..16) | ForEach-Object { "{0:x2}" -f (Get-Random -Max 256) })

@"
SESSION_SECRET=$SessionSecret
NRIC_ENCRYPTION_KEY=$NricKey
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
"@ | Set-Content "$AppDir\apps\web\.env.local" -Encoding UTF8

# Firewall rules
New-NetFirewallRule -DisplayName "Youth360-HTTP"  -Direction Inbound -Protocol TCP -LocalPort 80  -Action Allow | Out-Null
New-NetFirewallRule -DisplayName "Youth360-HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow | Out-Null
New-NetFirewallRule -DisplayName "Youth360-App"   -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow | Out-Null

# Install as Windows service via NSSM
$NssmPath = (Get-Command nssm).Source
$NextBin = "$AppDir\apps\web\node_modules\.bin\next.cmd"

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

Stop-Transcript
</powershell>
