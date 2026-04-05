# Production Deployment Scripts

This directory contains helper scripts for deploying and managing the Talki application in production.

## Available Scripts

### deploy.sh
Deploy the application to production.

```bash
./scripts/deploy.sh [branch] [environment]

# Examples:
./scripts/deploy.sh main production          # Deploy main branch to production
./scripts/deploy.sh develop production       # Deploy develop branch to production
```

**What it does:**
- Checks out the specified branch
- Pulls latest changes
- Verifies environment files exist
- Stops existing containers
- Builds new Docker images
- Starts services
- Runs health checks
- Displays logs

---

### healthcheck.sh
Run health checks on all services.

```bash
./scripts/healthcheck.sh [environment]

# Examples:
./scripts/healthcheck.sh production
```

**Checks:**
- All containers are running
- Backend API is responding
- Frontend is responding
- Nginx is responding
- Disk space usage
- Memory usage

---

### logs.sh
View and follow service logs.

```bash
./scripts/logs.sh [environment] [options]

# Examples:
./scripts/logs.sh production          # View last 50 lines
./scripts/logs.sh production -f       # Follow logs in real-time
./scripts/logs.sh production follow   # Follow logs in real-time
```

---

### restart.sh
Restart specific services.

```bash
./scripts/restart.sh [service] [environment]

# Examples:
./scripts/restart.sh backend production    # Restart backend
./scripts/restart.sh frontend production   # Restart frontend
./scripts/restart.sh nginx production      # Reload nginx
./scripts/restart.sh all production        # Restart all services
```

---

### backup.sh
Backup configuration and data.

```bash
./scripts/backup.sh [environment]

# Examples:
./scripts/backup.sh production
```

**Creates backup of:**
- Configuration files (.env.production)
- Volumes (if configured)
- Database backups (manual)

**Note:** If using Supabase, backups are automatic via their dashboard.

---

## Usage Examples

### Initial Deployment
```bash
# 1. Clone repo on VPS
git clone https://github.com/your-repo.git
cd EXE201

# 2. Setup environment files
cp talki-backend/.env.example talki-backend/.env.production
cp frontend/.env.example frontend/.env.production
# Edit the .env.production files with actual values

# 3. Place secrets
mkdir -p secrets
# Copy google-credentials.json to secrets/

# 4. Deploy
chmod +x scripts/*.sh
./scripts/deploy.sh main production

# 5. Verify
./scripts/healthcheck.sh production
```

### Monitoring
```bash
# Follow logs
./scripts/logs.sh production -f

# Check health regularly (can be added to cron)
./scripts/healthcheck.sh production
```

### Updates
```bash
# After pushing code to main:
./scripts/deploy.sh main production
```

### Maintenance
```bash
# Backup before updates
./scripts/backup.sh production

# Restart a service
./scripts/restart.sh backend production

# View logs for debugging
./scripts/logs.sh production -f
```

## Troubleshooting

### Health checks fail
```bash
# View full logs
./scripts/logs.sh production

# Check specific service
docker-compose -f docker-compose.production.yml logs backend
```

### Out of disk space
```bash
# Check usage
df -h
docker system prune

# Backup, then redeploy
./scripts/backup.sh production
./scripts/deploy.sh main production
```

### Container won't start
```bash
# View error logs
./scripts/logs.sh production
docker-compose -f docker-compose.production.yml logs service_name
```

## Cron Job Examples

Add these to your crontab (`crontab -e`):

```bash
# Health check every 5 minutes
*/5 * * * * cd /opt/talki && ./scripts/healthcheck.sh production >> logs/healthcheck.log 2>&1

# Daily backup at 2 AM
0 2 * * * cd /opt/talki && ./scripts/backup.sh production >> logs/backup.log 2>&1

# Weekly application update (Sunday at 3 AM)
0 3 * * 0 cd /opt/talki && ./scripts/deploy.sh main production >> logs/deploy.log 2>&1
```

## Important Notes

1. **Make scripts executable:**
   ```bash
   chmod +x scripts/*.sh
   ```

2. **Environment files are NOT committed** (.env.production is in .gitignore)

3. **Always test on staging first** before deploying to production

4. **Keep backups** before major updates

5. **Monitor logs regularly** for errors

6. **Update Docker images regularly** for security patches

## Docker Compose Files

- `docker-compose.yml` - Development (with hot-reload)
- `docker-compose.prod.yml` - Production (optimized)

Choose the right one when running commands:
```bash
docker-compose -f docker-compose.yml up -d       # Development
docker-compose -f docker-compose.prod.yml up -d  # Production
```
