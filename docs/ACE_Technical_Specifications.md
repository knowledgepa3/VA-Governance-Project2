# ACE Platform - Technical Specifications

## Infrastructure & Deployment Requirements

---

## Table of Contents

1. [Current Deployment (Digital Ocean)](#1-current-deployment-digital-ocean)
2. [Technology Stack](#2-technology-stack)
3. [System Requirements](#3-system-requirements)
4. [Network & Security](#4-network--security)
5. [External Service Dependencies](#5-external-service-dependencies)
6. [Scalability Considerations](#6-scalability-considerations)
7. [Production Deployment Options](#7-production-deployment-options)
8. [Environment Configuration](#8-environment-configuration)
9. [Monitoring & Observability](#9-monitoring--observability)
10. [Disaster Recovery & Backup](#10-disaster-recovery--backup)

---

## 1. Current Deployment (Digital Ocean)

### Droplet Specifications

| Specification | Current Configuration |
|---------------|----------------------|
| **Provider** | Digital Ocean |
| **Droplet Type** | Basic (Shared CPU) |
| **vCPUs** | 1-2 vCPUs |
| **Memory** | 2-4 GB RAM |
| **Storage** | 50-80 GB SSD |
| **Region** | [Your Region - e.g., NYC1, SFO3] |
| **OS** | Ubuntu 22.04 LTS |
| **Monthly Cost** | ~$12-24/month |

### Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DIGITAL OCEAN DROPLET                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      NGINX                               │   │
│  │              (Reverse Proxy + SSL/TLS)                  │   │
│  │                    Port 443/80                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   NODE.JS / VITE                        │   │
│  │              (Static File Server + API Proxy)           │   │
│  │                    Port 3000/5173                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    ACE APPLICATION                       │   │
│  │                  (React SPA Bundle)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼ HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Anthropic  │  │     VA      │  │   Domain    │            │
│  │  Claude API │  │ Lighthouse  │  │  Registrar  │            │
│  │             │  │  (Sandbox)  │  │             │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### Deployed Services

| Service | Purpose | Port | Status |
|---------|---------|------|--------|
| Nginx | Reverse proxy, SSL termination | 80, 443 | Running |
| Node.js | Application server | 3000 | Running |
| PM2 | Process manager | - | Managing Node |
| Certbot | SSL certificate management | - | Auto-renewal |

### Domain & SSL

| Item | Value |
|------|-------|
| **Domain** | [your-domain.com] |
| **SSL Certificate** | Let's Encrypt (auto-renewed via Certbot) |
| **SSL Grade** | A+ (TLS 1.3) |
| **HTTPS Redirect** | Enabled (HTTP → HTTPS) |

---

## 2. Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.x | UI framework |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Tailwind CSS** | 3.x | Utility-first CSS framework |
| **Vite** | 5.x | Build tool & dev server |
| **Lucide React** | Latest | Icon library |

### Build Output

| Metric | Value |
|--------|-------|
| **Bundle Size (gzipped)** | ~420 KB (main chunk) |
| **Initial Load** | < 2 seconds |
| **Build Time** | ~7 seconds |
| **Output Format** | ES Modules |

### Runtime Dependencies

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "lucide-react": "^0.300.0",
  "tailwindcss": "^3.4.0"
}
```

### Dev Dependencies

```json
{
  "typescript": "^5.3.0",
  "vite": "^5.0.0",
  "@types/react": "^18.2.0",
  "@vitejs/plugin-react": "^4.2.0"
}
```

---

## 3. System Requirements

### Minimum Requirements (Demo/Development)

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 1 vCPU | 2 vCPU |
| **RAM** | 2 GB | 4 GB |
| **Storage** | 20 GB SSD | 50 GB SSD |
| **Network** | 1 Gbps | 1 Gbps |
| **OS** | Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| **Node.js** | 18.x LTS | 20.x LTS |
| **npm** | 9.x | 10.x |

### Production Requirements (Per Instance)

| Resource | Minimum | Recommended | High Volume |
|----------|---------|-------------|-------------|
| **CPU** | 2 vCPU | 4 vCPU | 8 vCPU |
| **RAM** | 4 GB | 8 GB | 16 GB |
| **Storage** | 50 GB SSD | 100 GB SSD | 200 GB SSD |
| **Network** | 1 Gbps | 2 Gbps | 5 Gbps |
| **IOPS** | 3,000 | 6,000 | 16,000 |

### Browser Compatibility

| Browser | Minimum Version | Status |
|---------|-----------------|--------|
| Chrome | 90+ | ✅ Full Support |
| Firefox | 88+ | ✅ Full Support |
| Safari | 14+ | ✅ Full Support |
| Edge | 90+ | ✅ Full Support |
| IE 11 | - | ❌ Not Supported |

---

## 4. Network & Security

### Ports & Protocols

| Port | Protocol | Service | Direction | Required |
|------|----------|---------|-----------|----------|
| 22 | TCP | SSH | Inbound | Yes (admin) |
| 80 | TCP | HTTP | Inbound | Yes (redirect) |
| 443 | TCP | HTTPS | Inbound | Yes |
| 3000 | TCP | Node.js | Internal | Yes |

### Firewall Rules (UFW)

```bash
# Current configuration
sudo ufw status

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere      # SSH
80/tcp                     ALLOW       Anywhere      # HTTP
443/tcp                    ALLOW       Anywhere      # HTTPS
3000                       DENY        Anywhere      # Internal only
```

### SSL/TLS Configuration

| Setting | Value |
|---------|-------|
| **Protocol** | TLS 1.2, TLS 1.3 |
| **Certificate** | Let's Encrypt (RSA 2048 or ECDSA) |
| **HSTS** | Enabled (max-age=31536000) |
| **OCSP Stapling** | Enabled |
| **Cipher Suites** | Modern (AEAD only) |

### Security Headers (Nginx)

```nginx
# Recommended headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

### Outbound Connections Required

| Destination | Port | Protocol | Purpose |
|-------------|------|----------|---------|
| api.anthropic.com | 443 | HTTPS | Claude API |
| sandbox-api.va.gov | 443 | HTTPS | VA Lighthouse (Sandbox) |
| api.va.gov | 443 | HTTPS | VA Lighthouse (Production) |

---

## 5. External Service Dependencies

### Anthropic Claude API

| Item | Details |
|------|---------|
| **Endpoint** | https://api.anthropic.com/v1/messages |
| **Authentication** | API Key (x-api-key header) |
| **Model Used** | claude-sonnet-4-20250514 |
| **Rate Limits** | Tier-based (see Anthropic dashboard) |
| **Typical Latency** | 2-10 seconds per request |
| **Cost** | ~$3/1M input tokens, ~$15/1M output tokens |

**Usage Per Workflow:**
- ~5-8 API calls per workflow
- ~10,000-20,000 tokens per workflow
- Estimated cost: $0.10-0.30 per workflow

### VA Lighthouse API

| Item | Details |
|------|---------|
| **Sandbox Endpoint** | https://sandbox-api.va.gov |
| **Production Endpoint** | https://api.va.gov |
| **Authentication** | API Key + OAuth 2.0 (production) |
| **Rate Limits** | 60 requests/minute (sandbox) |
| **Data** | Veteran service history, ratings, claims |

**APIs Used:**
- Veteran Verification API
- Disability Rating API
- Claims Status API
- Benefits Intake API

### Domain & DNS (if applicable)

| Item | Provider | Details |
|------|----------|---------|
| **Domain Registrar** | [Your registrar] | |
| **DNS Provider** | Digital Ocean / Cloudflare | |
| **DNS Records** | A, AAAA, CNAME | |
| **TTL** | 300-3600 seconds | |

---

## 6. Scalability Considerations

### Current Capacity (Single Droplet)

| Metric | Estimated Capacity |
|--------|-------------------|
| **Concurrent Users** | 10-20 |
| **Workflows/Hour** | 20-50 |
| **API Calls/Hour** | 200-400 |
| **Storage Growth** | ~10 MB/day (logs only) |

### Scaling Strategy

#### Vertical Scaling (Easy, Immediate)

Upgrade droplet size:

| Tier | vCPU | RAM | Users | Cost/Month |
|------|------|-----|-------|------------|
| Basic | 2 | 4 GB | 20 | $24 |
| General | 4 | 8 GB | 50 | $48 |
| CPU-Optimized | 4 | 8 GB | 100 | $84 |
| CPU-Optimized | 8 | 16 GB | 200 | $168 |

#### Horizontal Scaling (Future)

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │   (DO/Nginx)    │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │  ACE Node 1 │    │  ACE Node 2 │    │  ACE Node 3 │
   │  (Droplet)  │    │  (Droplet)  │    │  (Droplet)  │
   └─────────────┘    └─────────────┘    └─────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Shared State   │
                    │ (Redis/Postgres)│
                    └─────────────────┘
```

**Requirements for Horizontal Scaling:**
- Session storage (Redis)
- Database for persistent data (PostgreSQL)
- Shared file storage (Spaces/S3)
- Load balancer configuration

---

## 7. Production Deployment Options

### Option A: Digital Ocean (Current + Enhanced)

**Best for:** Small-medium deployments, cost-sensitive

| Component | Service | Est. Cost/Month |
|-----------|---------|-----------------|
| Application | Droplet (4 vCPU, 8GB) | $48 |
| Database | Managed PostgreSQL | $15 |
| Cache | Managed Redis | $15 |
| Storage | Spaces (50GB) | $5 |
| Load Balancer | DO Load Balancer | $12 |
| **Total** | | **~$95/month** |

### Option B: AWS GovCloud

**Best for:** Federal deployments requiring FedRAMP

| Component | Service | Est. Cost/Month |
|-----------|---------|-----------------|
| Compute | EC2 (t3.large) | $70 |
| Database | RDS PostgreSQL | $50 |
| Cache | ElastiCache Redis | $50 |
| Storage | S3 | $10 |
| Load Balancer | ALB | $20 |
| WAF | AWS WAF | $20 |
| **Total** | | **~$220/month** |

**FedRAMP Benefits:**
- FedRAMP High authorized
- ITAR compliant
- US-only data residency

### Option C: Azure Government

**Best for:** Federal deployments, Microsoft shops

| Component | Service | Est. Cost/Month |
|-----------|---------|-----------------|
| Compute | App Service (P1v3) | $100 |
| Database | Azure SQL | $50 |
| Cache | Azure Cache Redis | $50 |
| Storage | Blob Storage | $10 |
| Load Balancer | App Gateway | $25 |
| **Total** | | **~$235/month** |

**Benefits:**
- FedRAMP High authorized
- IL4/IL5 options available
- Azure AD integration

### Option D: Kubernetes (Future Scale)

**Best for:** Large enterprise, multi-tenant

```yaml
# Example ACE deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ace-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ace
  template:
    spec:
      containers:
      - name: ace
        image: ace-platform:1.0.0
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        ports:
        - containerPort: 3000
```

---

## 8. Environment Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_ANTHROPIC_API_KEY` | Yes | Claude API key | `sk-ant-...` |
| `VITE_VA_API_KEY` | Yes | VA Lighthouse API key | `abc123...` |
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | No | Server port | `3000` |
| `VITE_API_BASE_URL` | No | API base URL override | `https://api.example.com` |

### .env File Structure

```bash
# .env.production
NODE_ENV=production

# Anthropic Claude API
VITE_ANTHROPIC_API_KEY=sk-ant-your-key-here

# VA Lighthouse API
VITE_VA_API_KEY=your-va-api-key
VITE_VA_API_ENV=sandbox  # or 'production'

# Optional: Custom API endpoints
# VITE_API_BASE_URL=https://api.yourdomain.com
```

### Build Commands

```bash
# Development
npm run dev          # Start dev server (hot reload)

# Production Build
npm run build        # Create production bundle

# Preview Production
npm run preview      # Serve production build locally

# Type Checking
npx tsc --noEmit     # Check TypeScript errors
```

### Deployment Script Example

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Deploying ACE Platform..."

# Pull latest code
git pull origin main

# Install dependencies
npm ci

# Build production bundle
npm run build

# Restart application
pm2 restart ace-platform

echo "✅ Deployment complete!"
```

---

## 9. Monitoring & Observability

### Current Monitoring (Basic)

| Tool | Purpose | Status |
|------|---------|--------|
| PM2 | Process monitoring | Active |
| Digital Ocean Metrics | CPU, RAM, Disk | Active |
| Nginx Access Logs | Request logging | Active |

### Recommended Monitoring Stack

#### Application Performance

| Tool | Purpose | Integration |
|------|---------|-------------|
| **Sentry** | Error tracking | npm package |
| **LogRocket** | Session replay | Script tag |
| **Datadog** | Full observability | Agent |

#### Infrastructure

| Tool | Purpose | Integration |
|------|---------|-------------|
| **Prometheus** | Metrics collection | Node exporter |
| **Grafana** | Visualization | Dashboard |
| **Uptime Robot** | Availability monitoring | HTTP checks |

### Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| CPU Usage | > 70% | > 90% |
| Memory Usage | > 80% | > 95% |
| Disk Usage | > 70% | > 90% |
| Response Time (p95) | > 2s | > 5s |
| Error Rate | > 1% | > 5% |
| API Call Failures | > 5% | > 10% |

### Log Management

**Current:** Local files, rotated by logrotate

**Recommended:** Centralized logging

```bash
# Example: Ship logs to external service
# /etc/rsyslog.d/50-ace.conf
if $programname == 'ace-platform' then @logs.example.com:514
```

---

## 10. Disaster Recovery & Backup

### Current Backup Strategy

| Item | Method | Frequency | Retention |
|------|--------|-----------|-----------|
| Droplet | DO Snapshots | Weekly | 4 weeks |
| Code | Git (GitHub) | On push | Forever |
| Logs | Local rotation | Daily | 7 days |

### Recommended Backup Strategy

| Item | Method | Frequency | Retention |
|------|--------|-----------|-----------|
| Application | Container image | Per deploy | 10 versions |
| Database | Automated backup | Daily | 30 days |
| Audit Logs | S3/Spaces export | Hourly | 7 years |
| Configuration | Git + encrypted | On change | Forever |
| Secrets | Vault snapshot | Daily | 90 days |

### Recovery Time Objectives

| Scenario | RTO Target | RPO Target |
|----------|------------|------------|
| Application crash | < 5 minutes | 0 (stateless) |
| Droplet failure | < 30 minutes | < 1 hour |
| Region failure | < 4 hours | < 1 hour |
| Complete disaster | < 24 hours | < 24 hours |

### Disaster Recovery Procedure

```
1. DETECT: Monitoring alerts trigger
2. ASSESS: Determine scope of failure
3. NOTIFY: Alert stakeholders
4. RECOVER:
   a. Application issue → Restart/redeploy
   b. Droplet issue → Restore from snapshot
   c. Region issue → Deploy to alternate region
5. VERIFY: Confirm service restored
6. DOCUMENT: Post-incident report
```

---

## Quick Reference Card

### Essential Commands

```bash
# Check application status
pm2 status

# View application logs
pm2 logs ace-platform

# Restart application
pm2 restart ace-platform

# Check system resources
htop

# Check disk space
df -h

# Check nginx status
sudo systemctl status nginx

# Renew SSL certificate
sudo certbot renew

# View nginx access logs
sudo tail -f /var/log/nginx/access.log
```

### Important File Locations

```
/var/www/ace-platform/        # Application root
/var/www/ace-platform/dist/   # Production build
/etc/nginx/sites-available/   # Nginx config
/etc/letsencrypt/             # SSL certificates
/var/log/nginx/               # Nginx logs
~/.pm2/logs/                  # PM2 application logs
```

### Support Contacts

| Service | Support URL | Response Time |
|---------|-------------|---------------|
| Digital Ocean | support.digitalocean.com | < 24 hours |
| Anthropic | support@anthropic.com | < 48 hours |
| VA Lighthouse | developer.va.gov/support | Varies |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01 | Initial specification |

---

*Document maintained by: ACE Platform Team*
*Last infrastructure review: [Date]*
