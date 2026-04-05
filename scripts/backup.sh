#!/bin/bash
# Backup script for production database and uploads

set -e

ENVIRONMENT="${1:-production}"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

echo "🔄 Starting backup process..."
mkdir -p "$BACKUP_DIR"

# Note: If using Supabase, backups are automatic
# This script is for manual/additional backups

echo "📦 Backing up configuration files..."
mkdir -p "$BACKUP_DIR/config"
cp talki-backend/.env.${ENVIRONMENT} "$BACKUP_DIR/config/" 2>/dev/null || true
cp frontend/.env.${ENVIRONMENT} "$BACKUP_DIR/config/" 2>/dev/null || true

echo "💾 Backing up volumes (if any)..."
mkdir -p "$BACKUP_DIR/volumes"

# Add volume backup commands here if needed
# Example:
# docker run --rm -v talki_postgres_data:/data -v $(pwd)/$BACKUP_DIR/volumes:/backup \
#   alpine tar czf /backup/postgres_data.tar.gz -C /data .

echo "📝 Backup completed at: $BACKUP_DIR"
echo "Total size:"
du -sh "$BACKUP_DIR"

# Optional: Clean old backups (keep last 5)
echo "🧹 Cleaning old backups (keeping last 5)..."
ls -td ./backups/*/ | tail -n +6 | xargs -r rm -rf

echo "✅ Backup process finished!"
