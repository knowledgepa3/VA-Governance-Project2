#!/bin/bash
# =============================================================================
# ACE Governance Platform - DigitalOcean Droplet Setup Script
# =============================================================================
#
# Run this on a fresh Ubuntu 22.04 droplet as root:
#   curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/scripts/setup-droplet.sh | bash
#
# Or download and run:
#   wget https://raw.githubusercontent.com/YOUR_REPO/main/scripts/setup-droplet.sh
#   chmod +x setup-droplet.sh
#   ./setup-droplet.sh
#
# =============================================================================

set -e  # Exit on error

echo "=============================================="
echo "  ACE Governance Platform - Server Setup"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root${NC}"
  exit 1
fi

# =============================================================================
# System Updates
# =============================================================================
echo -e "${YELLOW}[1/7] Updating system...${NC}"
apt update && apt upgrade -y
apt install -y curl wget git ufw fail2ban

# =============================================================================
# Create Application User
# =============================================================================
echo -e "${YELLOW}[2/7] Creating application user...${NC}"
if ! id "aceadmin" &>/dev/null; then
  adduser --disabled-password --gecos "" aceadmin
  echo -e "${GREEN}User 'aceadmin' created${NC}"
else
  echo -e "${GREEN}User 'aceadmin' already exists${NC}"
fi

# =============================================================================
# Install Docker
# =============================================================================
echo -e "${YELLOW}[3/7] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm get-docker.sh
  usermod -aG docker aceadmin
  echo -e "${GREEN}Docker installed${NC}"
else
  echo -e "${GREEN}Docker already installed${NC}"
fi

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# =============================================================================
# Configure Firewall
# =============================================================================
echo -e "${YELLOW}[4/7] Configuring firewall...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo -e "${GREEN}Firewall configured${NC}"

# =============================================================================
# Configure Fail2Ban
# =============================================================================
echo -e "${YELLOW}[5/7] Configuring fail2ban...${NC}"
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
EOF
systemctl enable fail2ban
systemctl restart fail2ban
echo -e "${GREEN}Fail2ban configured${NC}"

# =============================================================================
# Setup Application Directory
# =============================================================================
echo -e "${YELLOW}[6/7] Setting up application directory...${NC}"
mkdir -p /opt/ace-governance
chown aceadmin:aceadmin /opt/ace-governance
mkdir -p /opt/backups
chown aceadmin:aceadmin /opt/backups
echo -e "${GREEN}Directories created${NC}"

# =============================================================================
# Install Caddy (for HTTPS)
# =============================================================================
echo -e "${YELLOW}[7/7] Installing Caddy for HTTPS...${NC}"
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install -y caddy
systemctl enable caddy
echo -e "${GREEN}Caddy installed${NC}"

# =============================================================================
# Create backup script
# =============================================================================
cat > /opt/ace-governance/backup-audit.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/opt/backups
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
docker run --rm -v ace-audit-logs:/source -v $BACKUP_DIR:/backup alpine \
  tar czf /backup/audit-$DATE.tar.gz -C /source . 2>/dev/null || true
find $BACKUP_DIR -name "audit-*.tar.gz" -mtime +30 -delete
EOF
chmod +x /opt/ace-governance/backup-audit.sh
chown aceadmin:aceadmin /opt/ace-governance/backup-audit.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/ace-governance/backup-audit.sh") | crontab -

# =============================================================================
# Print Summary
# =============================================================================
echo ""
echo -e "${GREEN}=============================================="
echo "  Setup Complete!"
echo "==============================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Switch to aceadmin user:"
echo "   ${YELLOW}su - aceadmin${NC}"
echo ""
echo "2. Clone your repository:"
echo "   ${YELLOW}cd /opt/ace-governance${NC}"
echo "   ${YELLOW}git clone https://github.com/YOUR_REPO/ace-governance.git .${NC}"
echo ""
echo "3. Create production environment:"
echo "   ${YELLOW}cp server/.env.example server/.env.production${NC}"
echo "   ${YELLOW}nano server/.env.production${NC}"
echo ""
echo "4. Generate JWT secret:"
echo "   ${YELLOW}openssl rand -hex 64${NC}"
echo ""
echo "5. Start the application:"
echo "   ${YELLOW}docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build${NC}"
echo ""
echo "6. Configure Caddy for your domain:"
echo "   ${YELLOW}sudo nano /etc/caddy/Caddyfile${NC}"
echo ""
echo "   Add:"
echo "   api.your-domain.com {"
echo "       reverse_proxy localhost:3001"
echo "   }"
echo ""
echo "   Then: ${YELLOW}sudo systemctl reload caddy${NC}"
echo ""
echo "=============================================="
echo "  Server is ready for ACE Governance Platform"
echo "=============================================="
