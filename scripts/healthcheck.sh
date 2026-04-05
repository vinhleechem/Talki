#!/bin/bash
# Health check script for monitoring services

set -e

ENVIRONMENT="${1:-production}"

echo "🏥 Running health checks..."

# Check if docker-compose file exists
if [ ! -f "docker-compose.${ENVIRONMENT}.yml" ]; then
    echo "❌ docker-compose.${ENVIRONMENT}.yml not found"
    exit 1
fi

# Check if containers are running
echo "🐳 Checking if containers are running..."
RUNNING=$(docker-compose -f docker-compose.${ENVIRONMENT}.yml ps --services --filter "status=running" | wc -l)
TOTAL=$(docker-compose -f docker-compose.${ENVIRONMENT}.yml ps --services | wc -l)

if [ "$RUNNING" -ne "$TOTAL" ]; then
    echo "⚠️  Not all containers are running ($RUNNING/$TOTAL)"
    docker-compose -f docker-compose.${ENVIRONMENT}.yml ps
    exit 1
fi

echo "✅ All containers are running"

# Check backend health
echo "🔍 Checking backend health..."
if curl -f http://localhost:8000/health >/dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# Check frontend
echo "🔍 Checking frontend..."
if curl -f http://localhost:5173 >/dev/null 2>&1; then
    echo "✅ Frontend is responding"
else
    echo "❌ Frontend is not responding"
    exit 1
fi

# Check Nginx
echo "🔍 Checking Nginx..."
if curl -f http://localhost/health >/dev/null 2>&1; then
    echo "✅ Nginx is responding"
else
    echo "❌ Nginx is not responding"
    exit 1
fi

# Check disk space
echo "💾 Checking disk space..."
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "⚠️  Warning: Disk usage is ${DISK_USAGE}%"
else
    echo "✅ Disk usage: ${DISK_USAGE}%"
fi

# Check memory
echo "🧠 Checking memory usage..."
docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}"

echo ""
echo "✅ All health checks passed!"
