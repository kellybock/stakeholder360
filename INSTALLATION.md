# Youth360 Installation Guide

Complete guide for deploying Youth360 on AWS EC2 (Linux or Windows Server) using Docker.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Option A: Linux EC2 (Ubuntu)](#option-a-linux-ec2-ubuntu)
4. [Option B: Windows Server EC2](#option-b-windows-server-ec2)
5. [Post-Installation](#post-installation)
6. [Configuration](#configuration)
7. [Database Management](#database-management)
8. [SSL Certificate Management](#ssl-certificate-management)
9. [Updating the Application](#updating-the-application)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### AWS Resources

| Resource | Specification |
|----------|--------------|
| EC2 Instance (Linux) | Ubuntu 22.04+ LTS, t3.small or larger |
| EC2 Instance (Windows) | Windows Server 2022, t3.medium or larger |
| Storage | 20 GB+ EBS (gp3 recommended) |
| Security Group | Inbound ports: 22/3389 (SSH/RDP), 80 (HTTP), 443 (HTTPS) |

### Domain (Optional)

A domain name pointed to your EC2 public IP is required for Let's Encrypt SSL. Without a domain, the setup uses a self-signed certificate.

---

## Architecture Overview

```
                    ┌─────────────────────────────────────────┐
                    │              EC2 Instance                │
                    │                                         │
  HTTPS :443 ──────┤──► nginx (reverse proxy + SSL)          │
  HTTP  :80  ──────┤──► nginx (redirects to HTTPS)           │
                    │         │                               │
                    │         ▼                               │
                    │    app (Next.js :3000)                  │
                    │         │                               │
                    │         ├──► PostgreSQL :5432           │
                    │         └──► Redis :6379                │
                    │                                         │
                    └─────────────────────────────────────────┘
```

All services run as Docker containers orchestrated by Docker Compose.

| Container | Image | Purpose |
|-----------|-------|---------|
| youth360-app | Custom (Dockerfile) | Next.js application server |
| youth360-db | pgvector/pgvector:pg16 | PostgreSQL with vector extension |
| youth360-redis | redis:7-alpine | Session cache and pub/sub |
| youth360-nginx | nginx:alpine | HTTPS termination and reverse proxy |
| youth360-certbot | certbot/certbot | Automatic SSL certificate renewal |

---

## Option A: Linux EC2 (Ubuntu)

### Step 1: Launch EC2 Instance

1. Go to AWS Console > EC2 > Launch Instance
2. Select **Ubuntu Server 22.04 LTS** AMI
3. Choose **t3.small** or larger
4. Configure Security Group:
   - SSH (22) from your IP
   - HTTP (80) from 0.0.0.0/0
   - HTTPS (443) from 0.0.0.0/0
5. Launch and connect via SSH

### Step 2: Clone Repository

```bash
sudo apt-get update && sudo apt-get install -y git
git clone <your-repo-url> youth360
cd youth360
```

### Step 3: Run Setup Script

**With a domain (Let's Encrypt SSL):**

```bash
./deploy/setup-ec2.sh youth360.example.com admin@example.com
```

**Without a domain (self-signed SSL):**

```bash
./deploy/setup-ec2.sh
```

The script will:
- Install Docker and Docker Compose
- Generate a `.env` file with secure random secrets
- Obtain or generate SSL certificates
- Build the application container
- Start all services

### Step 4: Verify

```bash
docker compose -f docker-compose.prod.yml ps
```

All services should show "healthy" or "running" status.

---

## Option B: Windows Server EC2

### Step 1: Launch EC2 Instance

1. Go to AWS Console > EC2 > Launch Instance
2. Select **Windows Server 2022 Base** AMI
3. Choose **t3.medium** or larger (Hyper-V requires more resources)
4. Configure Security Group:
   - RDP (3389) from your IP
   - HTTP (80) from 0.0.0.0/0
   - HTTPS (443) from 0.0.0.0/0
5. Launch and connect via RDP

### Step 2: Clone Repository

Open PowerShell as Administrator:

```powershell
# Install Git if not present
winget install Git.Git

# Clone
git clone <your-repo-url> C:\youth360
cd C:\youth360
```

### Step 3: Run Setup Script

**With a domain (Let's Encrypt SSL):**

```powershell
.\deploy\setup-windows.ps1 -Domain "youth360.example.com" -Email "admin@example.com"
```

**Without a domain (self-signed SSL):**

```powershell
.\deploy\setup-windows.ps1
```

> **Note:** On first run, the script installs Docker and enables Hyper-V/WSL2. This requires a server restart. After restart, run the script again to complete the deployment.

### Step 4: Verify

```powershell
docker compose -f docker-compose.prod.yml ps
```

---

## Post-Installation

### Default Login

| Field | Value |
|-------|-------|
| URL | https://your-domain-or-ip |
| Email | admin@youth360.gov.sg |
| Password | demo1234 |

> **Important:** Change the default password after first login via Admin > User Management.

### Seed Test Data

To populate the test database with sample stakeholder data:

```bash
# Linux
docker compose -f docker-compose.prod.yml exec app node -e "require('./packages/db/src/seed')"

# Or enter the container directly
docker compose -f docker-compose.prod.yml exec app sh
```

### Switch Between Test and Live Data

In the app, go to **Admin > Settings** and toggle between "Test" and "Live" data modes. Each mode reads from a separate PostgreSQL schema:
- **Test mode** → `test` schema (sample/seed data)
- **Live mode** → `public` schema (production data)

---

## Configuration

### Environment Variables

All configuration is in the `.env` file at the project root. This file is generated by the setup script with secure defaults.

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_PASSWORD` | PostgreSQL password | Yes (auto-generated) |
| `SESSION_SECRET` | Cookie signing secret | Yes (auto-generated) |
| `NRIC_ENCRYPTION_KEY` | AES key for NRIC encryption (32 hex chars) | Yes (auto-generated) |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | No (enables AI features) |
| `OPENAI_API_KEY` | OpenAI API key | No (enables AI features) |
| `GOOGLE_AI_API_KEY` | Google Gemini API key | No (enables AI features) |
| `DOMAIN` | Your domain name | No (for Let's Encrypt) |
| `EMAIL` | Admin email for Let's Encrypt | No |

### Enabling AI Features

AI features (chat assistant, meeting brief generation) are disabled by default. To enable:

1. Edit `.env` and add at least one API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
2. Restart the app container:
   ```bash
   docker compose -f docker-compose.prod.yml restart app
   ```

---

## Database Management

### Access PostgreSQL Shell

```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U youth360
```

### Backup Database

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U youth360 --format=custom youth360 > backup_$(date +%Y%m%d).dump
```

### Restore Database

```bash
docker compose -f docker-compose.prod.yml exec -i postgres \
  pg_restore -U youth360 -d youth360 --clean < backup_20260524.dump
```

### Run Migrations

```bash
docker compose -f docker-compose.prod.yml exec app \
  node -e "const { db } = require('@youth360/db'); /* migration logic */"
```

---

## SSL Certificate Management

### Automatic Renewal

The certbot container automatically renews certificates every 12 hours (only acts when within 30 days of expiry). No manual intervention needed.

### Manual Renewal

```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew
docker compose -f docker-compose.prod.yml restart nginx
```

### Switch from Self-Signed to Let's Encrypt

If you initially deployed without a domain and later add one:

```bash
# Update .env
DOMAIN=youth360.example.com
EMAIL=admin@example.com

# Remove old certs
rm -rf deploy/certbot/conf/live/youth360

# Get new cert
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  --email admin@example.com --agree-tos --no-eff-email \
  -d youth360.example.com

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

---

## Updating the Application

### Pull Latest Code and Rebuild

```bash
git pull origin main
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d app
```

### Full Restart (all services)

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

---

## Troubleshooting

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f postgres
docker compose -f docker-compose.prod.yml logs -f nginx
```

### Common Issues

#### App container won't start

```bash
docker compose -f docker-compose.prod.yml logs app
```

Likely causes:
- PostgreSQL not ready yet (check health status)
- Missing environment variable in `.env`
- Build failed (re-run `docker compose -f docker-compose.prod.yml build app`)

#### Database connection refused

```bash
# Check if PostgreSQL is healthy
docker compose -f docker-compose.prod.yml ps postgres

# Check PostgreSQL logs
docker compose -f docker-compose.prod.yml logs postgres
```

#### SSL/HTTPS not working

```bash
# Check nginx config
docker compose -f docker-compose.prod.yml exec nginx nginx -t

# Check certificate files exist
ls deploy/certbot/conf/live/youth360/
```

#### Port already in use

```bash
# Find what's using port 80/443
sudo lsof -i :80
sudo lsof -i :443

# Or on Windows
netstat -ano | findstr ":80"
```

#### Windows: Docker not starting after restart

```powershell
# Start Docker service manually
Start-Service docker

# Verify
docker info
```

#### Insufficient disk space

```bash
# Clean Docker resources
docker system prune -a --volumes
```

### Health Checks

```bash
# Verify all containers are running
docker compose -f docker-compose.prod.yml ps

# Test app response
curl -k https://localhost

# Test database connection
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U youth360
```

---

## Security Recommendations

1. **Change default credentials** immediately after deployment
2. **Restrict SSH/RDP access** to your IP only in the Security Group
3. **Enable AWS CloudWatch** for monitoring and alerts
4. **Set up automated backups** using AWS EBS snapshots or scheduled pg_dump
5. **Keep Docker images updated** — periodically run `docker compose pull` for base images
6. **Review `.env` file permissions** — ensure only root/admin can read it:
   ```bash
   chmod 600 .env   # Linux
   ```

---

## Support

For issues with the deployment, check:
1. Container logs (`docker compose logs`)
2. AWS EC2 instance system logs (AWS Console > Actions > Monitor > Get System Log)
3. Security Group inbound rules
4. EBS disk space (`df -h` on Linux, disk management on Windows)
