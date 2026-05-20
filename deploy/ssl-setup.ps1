# ==============================================================
# Youth360 — IIS Reverse Proxy + SSL Setup (Windows)
#
# Sets up IIS as a reverse proxy with a self-signed certificate
# or optional Let's Encrypt via win-acme.
#
# Usage:
#   1. Open PowerShell as Administrator
#   2. .\deploy\ssl-setup.ps1 [-Domain yourdomain.com]
#
# Without -Domain: sets up IIS reverse proxy on port 80 only
# With -Domain: also installs Let's Encrypt SSL via win-acme
# ==============================================================

param(
    [string]$Domain = ""
)

$ErrorActionPreference = "Stop"
$Port = 3000

function Log($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Warn($msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }

# ----------------------------------------------------------
Step "1/4 — Installing IIS and required modules"
# ----------------------------------------------------------
Install-WindowsFeature Web-Server, Web-WebSockets -IncludeManagementTools | Out-Null
Log "IIS installed"

# Install URL Rewrite and ARR (Application Request Routing) via WebPI or direct download
$WebPIInstaller = "$env:TEMP\WebPlatformInstaller_x64.msi"
if (!(Get-Command webpicmd -ErrorAction SilentlyContinue)) {
    Invoke-WebRequest -Uri "https://go.microsoft.com/fwlink/?LinkId=287166" -OutFile $WebPIInstaller
    Start-Process msiexec.exe -ArgumentList "/i `"$WebPIInstaller`" /quiet" -Wait
    $env:Path += ";C:\Program Files\Microsoft\Web Platform Installer"
    Log "Web Platform Installer installed"
}

webpicmd /Install /Products:"UrlRewrite2,ARRv3_0" /AcceptEULA | Out-Null
Log "URL Rewrite and ARR modules installed"

# ----------------------------------------------------------
Step "2/4 — Enabling ARR proxy"
# ----------------------------------------------------------
$ArrConfig = "C:\Windows\System32\inetsrv\config\applicationHost.config"

# Enable ARR proxy via appcmd
& "$env:SystemRoot\System32\inetsrv\appcmd.exe" set config -section:system.webServer/proxy -enabled:true -commit:apphost 2>$null
Log "ARR proxy enabled"

# ----------------------------------------------------------
Step "3/4 — Configuring reverse proxy to Node.js"
# ----------------------------------------------------------
$SitePath = "IIS:\Sites\Default Web Site"

# Create web.config with URL Rewrite rules
$WebConfig = "C:\inetpub\wwwroot\web.config"
@"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Youth360 Reverse Proxy" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:$Port/{R:1}" />
          <serverVariables>
            <set name="HTTP_X_FORWARDED_FOR" value="{REMOTE_ADDR}" />
            <set name="HTTP_X_FORWARDED_PROTO" value="{REQUEST_SCHEME}" />
            <set name="HTTP_X_FORWARDED_HOST" value="{HTTP_HOST}" />
          </serverVariables>
        </rule>
      </rules>
    </rewrite>
    <webSocket enabled="true" />
  </system.webServer>
</configuration>
"@ | Set-Content $WebConfig -Encoding UTF8

iisreset /restart | Out-Null
Log "IIS reverse proxy configured (port 80 -> localhost:$Port)"

# ----------------------------------------------------------
Step "4/4 — SSL Certificate"
# ----------------------------------------------------------
if ($Domain) {
    Warn "Setting up Let's Encrypt SSL for $Domain via win-acme"

    $WinAcmeDir = "C:\tools\win-acme"
    if (!(Test-Path "$WinAcmeDir\wacs.exe")) {
        New-Item -ItemType Directory -Path $WinAcmeDir -Force | Out-Null
        $WinAcmeUrl = "https://github.com/win-acme/win-acme/releases/download/v2.2.9.1/win-acme.v2.2.9.1.x64.pluggable.zip"
        Invoke-WebRequest -Uri $WinAcmeUrl -OutFile "$env:TEMP\win-acme.zip"
        Expand-Archive "$env:TEMP\win-acme.zip" -DestinationPath $WinAcmeDir -Force
        Log "win-acme downloaded"
    }

    & "$WinAcmeDir\wacs.exe" --target iis --host $Domain --installation iis --accepttos --emailaddress "admin@$Domain"
    Log "SSL certificate issued for $Domain"
} else {
    $SelfSignedCert = New-SelfSignedCertificate -DnsName "localhost" -CertStoreLocation "Cert:\LocalMachine\My"
    $Binding = Get-WebBinding -Name "Default Web Site" -Protocol https -ErrorAction SilentlyContinue
    if (!$Binding) {
        New-WebBinding -Name "Default Web Site" -Protocol https -Port 443 -IPAddress "*"
    }
    $Binding = Get-WebBinding -Name "Default Web Site" -Protocol https
    $Binding.AddSslCertificate($SelfSignedCert.Thumbprint, "My")
    Log "Self-signed SSL certificate bound to port 443"
    Warn "For production, run: .\deploy\ssl-setup.ps1 -Domain yourdomain.com"
}

# ----------------------------------------------------------
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  IIS reverse proxy + SSL setup complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
if ($Domain) {
    Write-Host "  Portal:  https://$Domain" -ForegroundColor Cyan
} else {
    Write-Host "  Portal:  http://localhost  (self-signed HTTPS on 443)" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "  IIS proxies all traffic to Node.js on port $Port" -ForegroundColor Yellow
Write-Host ""
