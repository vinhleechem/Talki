# Talki Project Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [VPS Setup](#vps-setup)
3. [Local Preparation](#local-preparation)
4. [Deploy to VPS](#deploy-to-vps)
5. [SSL/HTTPS Setup](#sslhttps-setup)
6. [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites

### Required

- VPS with Ubuntu 20.04+ (or similar Linux distro)
- At least 2GB RAM, 20GB disk space
- SSH access to VPS
- Git installed on VPS
- Domain name (for SSL/HTTPS)

### Optional

- Stripe account (for payments)
- Cloudinary account (for file uploads)
- SendGrid/Gmail (for emails)
- NewRelic/Datadog (for monitoring)

## VPS Setup

### 1. Connect to VPS

```bash
ssh root@your_vps_ip
```

### 2. Update System

```bash
apt update
apt upgrade -y
apt install -y curl wget git
```

### 3. Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 4. Install Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

### 5. Create Project Directory

```bash
mkdir -p /opt/talki
cd /opt/talki
```

## Local Preparation

### 1. Update Environment Files

Before pushing to production, update these files with real values:

**`talki-backend/.env.production`**

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
OPENAI_API_KEY=your-openai-key
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
# ... other keys
```

**`frontend/.env.production`**

```bash
VITE_API_BASE_URL=https://your-domain.com/api
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 2. Create Google Credentials Mount Point

```bash
# Create directory for Google credentials
mkdir -p ./secrets
# Place your google-credentials.json here
cp /path/to/google-credentials.json ./secrets/google-credentials.json
```

### 3. Test Locally (Optional)

```bash
docker-compose -f docker-compose.prod.yml up -d
# Check if services are running
docker-compose -f docker-compose.prod.yml logs -f
```

## Deploy to VPS

### 1. Clone Repository on VPS

```bash
cd /opt/talki
git clone https://github.com/your-username/EXE201.git .
git checkout main  # Deploy from main branch
```

### 2. Create Production Environment Files

```bash
cd /opt/talki

# Backend
cp talki-backend/.env.example talki-backend/.env.production
nano talki-backend/.env.production  # Edit with real values

# Frontend
cp frontend/.env.example frontend/.env.production
nano frontend/.env.production  # Edit with real values
```

### 3. Create Secrets Directory

```bash
mkdir -p ./secrets
# Upload your google-credentials.json to ./secrets/
# If using SFTP:
# sftp root@your_vps_ip
# put google-credentials.json /opt/talki/secrets/
```

### 4. Build and Start Services

```bash
cd /opt/talki

# Update docker-compose.prod.yml to mount secrets correctly
# Set GOOGLE_CREDENTIALS_HOST_PATH in environment or modify volume path

docker-compose -f docker-compose.prod.yml up -d
```

### 5. Verify Deployment

```bash
# Check running containers
docker ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:5173/
curl http://localhost/api/users
```

## SSL/HTTPS Setup

### 1. Install Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### 2. Generate SSL Certificate

```bash
certbot certonly --standalone -d your-domain.com -d www.your-domain.com
```

### 3. Update Nginx Config

Edit `nginx/conf.d/default.conf`:

```nginx
# Uncomment HTTPS sections
# Update server_name to your domain
# Update SSL certificate paths
```

### 4. Enable Auto-Renewal

```bash
systemctl enable certbot.timer
systemctl start certbot.timer
```

### 5. Reload Nginx

```bash
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Monitoring & Maintenance

### 1. View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### 2. Health Check

```bash
# Backend health
curl http://localhost:8000/health

# Frontend health
curl http://localhost:5173/

# Nginx status
curl http://localhost/health
```

### 3. Backup Database

```bash
# If using Supabase, backups are automatic
# For manual backup, use pg_dump or Supabase dashboard
```

### 4. Update Production Code

```bash
cd /opt/talki
git fetch origin
git checkout main
git pull origin main

# Rebuild containers
docker-compose -f docker-compose.prod.yml up -d --build
```

### 5. Monitor Resources

```bash
# Check disk space
df -h

# Check memory
free -h

# Check Docker resources
docker stats
```

### 6. Set Up Monitoring (Optional)

- Install monitoring tools (Prometheus, Grafana)
- Set up log aggregation (ELK stack, Datadog)
- Configure alerts for errors

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :8000

# Kill process
kill -9 <PID>
```

### Docker Permission Denied

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### CORS Issues

Update `FRONTEND_URL` in backend `.env.production`

### Container Won't Start

```bash
docker-compose -f docker-compose.prod.yml logs -f service_name
```

### Database Connection Failed

- Verify Supabase credentials
- Check firewall rules
- Ensure SUPABASE_URL and SUPABASE_KEY are correct

## Production Checklist

- [ ] Update all `.env.production` files
- [ ] Add SSL certificate
- [ ] Test all API endpoints
- [ ] Verify frontend loads correctly
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Enable HTTPS redirect
- [ ] Test payment flows (if applicable)
- [ ] Verify email notifications
- [ ] Set up error tracking (Sentry)
- [ ] Configure CDN for static assets (optional)
- [ ] Document database schema changes

## Support

For issues or questions:

1. Check logs: `docker-compose logs -f`
2. Review error tracking dashboard
3. Check VPS resource usage
4. Verify environment variables
