# Talki Project Production Deployment Checklist

## Pre-Deployment

- [ ] All code is tested and working locally
- [ ] Commits are pushed to `develop` branch
- [ ] `develop` branch is merged into `main`
- [ ] Code is reviewed (peer review if applicable)
- [ ] Database migrations are prepared
- [ ] Environment files are ready:
  - [ ] `talki-backend/.env.production` updated
  - [ ] `frontend/.env.production` updated
  - [ ] `secrets/google-credentials.json` ready
- [ ] VPS is prepared:
  - [ ] Docker installed
  - [ ] Docker Compose installed
  - [ ] SSH access verified
  - [ ] Domain configured and DNS pointing to VPS
- [ ] API keys are secured:
  - [ ] Supabase keys obtained
  - [ ] Google Cloud credentials ready
  - [ ] OpenAI API key ready
  - [ ] Cloudinary credentials ready
  - [ ] (Optional) Stripe keys ready

## Deployment

- [ ] SSH into VPS: `ssh root@your_vps_ip`
- [ ] Clone repository in production directory
- [ ] Copy environment files to VPS
- [ ] Copy secrets to VPS
- [ ] Run deployment script: `./scripts/deploy.sh main production`
- [ ] Run health checks: `./scripts/healthcheck.sh production`
- [ ] Verify all services are running:
  - [ ] Backend API responding
  - [ ] Frontend loading
  - [ ] Nginx reverse proxy working

## Post-Deployment

- [ ] Test all features:
  - [ ] User login/signup
  - [ ] Voice recording (if applicable)
  - [ ] Database operations
  - [ ] File uploads (if applicable)
  - [ ] Payment processing (if applicable)
- [ ] Monitor logs: `./scripts/logs.sh production -f`
- [ ] Set up monitoring alerts
- [ ] Configure automatic backups
- [ ] Test backup/restore process
- [ ] Setup SSL/HTTPS:
  - [ ] Certbot installed
  - [ ] Certificate generated
  - [ ] Nginx config updated
  - [ ] HTTPS working

## Post-Launch Monitoring (First Week)

- [ ] Monitor error logs daily
- [ ] Check resource usage (CPU, memory, disk)
- [ ] Verify backups running
- [ ] Monitor user feedback
- [ ] Keep on standby for emergency fixes

## Maintenance

- [ ] Set up cron jobs:
  - [ ] Health checks (every 5 minutes)
  - [ ] Backups (daily)
  - [ ] Automatic updates (weekly)
- [ ] Document any issues and fixes
- [ ] Plan regular security updates
- [ ] Review logs weekly
- [ ] Test disaster recovery procedures

## Rollback Plan

If something goes wrong:

1. **Check logs first:**

   ```bash
   ./scripts/logs.sh production -f
   ```

2. **If service crashes:**

   ```bash
   ./scripts/restart.sh all production
   ```

3. **Database issues:**

   ```bash
   # Restore from backup
   # (see DEPLOYMENT_GUIDE.md for details)
   ```

4. **Code issues:**

   ```bash
   # Revert to previous commit
   git revert <commit_hash>
   ./scripts/deploy.sh main production
   ```

5. **Severe issues - rollback to previous version:**
   ```bash
   git checkout <previous_tag>
   ./scripts/deploy.sh
   ```

## Emergency Contacts

- [ ] Supabase support contact
- [ ] Cloud provider support
- [ ] Team lead notification process
- [ ] Customer communication plan

## Documentation

- [ ] Update README with production URL
- [ ] Document any custom configurations
- [ ] Create runbooks for common issues
- [ ] Document emergency procedures
- [ ] Keep deployment dates/changes log
