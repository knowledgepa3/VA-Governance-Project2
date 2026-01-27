# ACE Governance Platform - Deployment Guide

## Overview

This guide covers deploying the ACE Governance Platform to production. The platform is designed to be lightweight and can run on minimal infrastructure.

**Estimated Monthly Costs:**
- Phase 1 (DigitalOcean Droplet): $12-24/month
- Phase 2 (With managed DB): $50-100/month
- Phase 3 (Enterprise): $300-500/month

---

## Quick Start (DigitalOcean Droplet)

### Prerequisites

- DigitalOcean account
- Domain name (optional but recommended)
- SSH key added to DigitalOcean

### Step 1: Create Droplet

1. Log into DigitalOcean
2. Create Droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic, Regular, $12/month (1 vCPU, 2GB RAM)
   - **Datacenter**: Choose closest to your clients
   - **Authentication**: SSH Key (recommended)
   - **Hostname**: `ace-governance`

3. Note your Droplet's IP address

### Step 2: Initial Server Setup

SSH into your droplet:

```bash
ssh root@YOUR_DROPLET_IP
```

Run initial setup:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Create non-root user for running the app
adduser --disabled-password --gecos "" aceadmin
usermod -aG docker aceadmin

# Setup firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Create app directory
mkdir -p /opt/ace-governance
chown aceadmin:aceadmin /opt/ace-governance
```

### Step 3: Deploy Application

Switch to aceadmin user:

```bash
su - aceadmin
cd /opt/ace-governance
```

Clone or copy your code:

```bash
# Option A: Clone from git
git clone https://github.com/YOUR_REPO/ace-governance.git .

# Option B: Copy files via SCP (from your local machine)
# scp -r ./ACE-VA-Agents-main/* aceadmin@YOUR_DROPLET_IP:/opt/ace-governance/
```

Create production environment file:

```bash
cp server/.env.example server/.env.production
nano server/.env.production
```

**CRITICAL: Set these values:**

```env
NODE_ENV=production
COMPLIANCE_LEVEL=production
JWT_SECRET=<generate with: openssl rand -hex 64>
CORS_ORIGIN=https://your-domain.com
ANTHROPIC_API_KEY=sk-ant-your-key
```

Build and start:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Check it's running:

```bash
docker compose logs -f
curl http://localhost:3001/health
```

### Step 4: Setup HTTPS (Required for Production)

Install Caddy (automatic HTTPS):

```bash
# As root
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy
```

Configure Caddy:

```bash
nano /etc/caddy/Caddyfile
```

Add:

```
api.your-domain.com {
    reverse_proxy localhost:3001

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

Start Caddy:

```bash
systemctl enable caddy
systemctl start caddy
```

Your API is now live at `https://api.your-domain.com`

---

## DigitalOcean App Platform (Even Easier)

For a fully managed experience:

### Step 1: Create App

1. Go to DigitalOcean App Platform
2. Click "Create App"
3. Connect your GitHub/GitLab repository
4. Select the `server` directory as the source

### Step 2: Configure

App Platform will auto-detect the Dockerfile. Configure:

- **Environment Variables**: Add all from `.env.example`
- **HTTP Port**: 3001
- **Health Check**: `/health`

### Step 3: Deploy

Click Deploy. DigitalOcean handles:
- HTTPS certificates
- Load balancing
- Auto-scaling (if needed)
- Zero-downtime deployments

**Cost**: ~$12/month for basic tier

---

## Security Checklist

Before going live, verify:

- [ ] JWT_SECRET is a secure random string (64+ chars)
- [ ] CORS_ORIGIN is set to your frontend domain only
- [ ] COMPLIANCE_LEVEL is set to `production`
- [ ] Firewall only allows 80, 443, and SSH
- [ ] HTTPS is enabled and working
- [ ] Health check returns 200
- [ ] Audit logs are being written
- [ ] Rate limiting is active (test with curl)

### Test Security

```bash
# Test rate limiting
for i in {1..25}; do curl -s https://api.your-domain.com/health; done

# Test CORS (should fail from wrong origin)
curl -H "Origin: http://evil.com" https://api.your-domain.com/api/auth/login

# Verify HTTPS headers
curl -I https://api.your-domain.com/health
```

---

## Monitoring

### Basic Health Monitoring

Create a simple uptime check:

```bash
# Add to crontab (crontab -e)
*/5 * * * * curl -sf https://api.your-domain.com/health || echo "ACE DOWN" | mail -s "Alert" you@email.com
```

### Log Management

View logs:

```bash
docker compose logs -f ace-server
```

Audit logs are in the `ace-audit-logs` Docker volume:

```bash
docker run --rm -v ace-audit-logs:/logs alpine cat /logs/audit_*.jsonl
```

---

## Backup

### Audit Logs (Critical)

```bash
#!/bin/bash
# backup-audit.sh - Run daily via cron

BACKUP_DIR=/opt/backups
DATE=$(date +%Y%m%d)

mkdir -p $BACKUP_DIR

# Copy audit logs from Docker volume
docker run --rm -v ace-audit-logs:/source -v $BACKUP_DIR:/backup alpine \
  tar czf /backup/audit-$DATE.tar.gz -C /source .

# Keep only last 30 days
find $BACKUP_DIR -name "audit-*.tar.gz" -mtime +30 -delete
```

Add to crontab:

```bash
0 2 * * * /opt/ace-governance/backup-audit.sh
```

---

## Updating

To deploy updates:

```bash
cd /opt/ace-governance
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Zero-downtime update (if you have 2+ instances):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --no-deps ace-server
```

---

## Troubleshooting

### Container won't start

```bash
docker compose logs ace-server
```

Common issues:
- Missing environment variables
- Port already in use
- Insufficient memory

### Health check failing

```bash
# Check if server is responding
docker compose exec ace-server wget -qO- http://localhost:3001/health

# Check logs for errors
docker compose logs --tail=50 ace-server
```

### Audit logs not writing

```bash
# Check volume permissions
docker compose exec ace-server ls -la /app/audit_logs

# Check disk space
df -h
```

---

## Cost Summary

| Component | Phase 1 | Phase 2 | Phase 3 |
|-----------|---------|---------|---------|
| Compute | $12-24/mo | $24-48/mo | $100-200/mo |
| Database | Included | $15-30/mo | $50-100/mo |
| Storage | Included | $5/mo | $20/mo |
| Backups | Included | $5/mo | $20/mo |
| **Total** | **$12-24/mo** | **$50-90/mo** | **$190-340/mo** |

This runs a production-grade governance platform serving multiple enterprise clients.

---

## Need Help?

1. Check logs: `docker compose logs -f`
2. Health endpoint: `curl /health`
3. Compliance info: `curl /api/compliance/info` (with auth)

For enterprise support, contact: [your-email]
