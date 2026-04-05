#!/bin/bash
# Service restart script

set -e

SERVICE="${1}"
ENVIRONMENT="${2:-production}"

if [ -z "$SERVICE" ]; then
    echo "Usage: ./scripts/restart.sh [backend|frontend|nginx|all]"
    exit 1
fi

echo "🔄 Restarting $SERVICE..."

case $SERVICE in
    backend)
        docker-compose -f docker-compose.${ENVIRONMENT}.yml restart backend
        echo "✅ Backend restarted"
        ;;
    frontend)
        docker-compose -f docker-compose.${ENVIRONMENT}.yml restart frontend
        echo "✅ Frontend restarted"
        ;;
    nginx)
        docker-compose -f docker-compose.${ENVIRONMENT}.yml exec nginx nginx -s reload
        echo "✅ Nginx reloaded"
        ;;
    all)
        docker-compose -f docker-compose.${ENVIRONMENT}.yml restart
        echo "✅ All services restarted"
        ;;
    *)
        echo "Unknown service: $SERVICE"
        exit 1
        ;;
esac

sleep 2

# Run health checks
echo "🏥 Running health checks..."
bash ./scripts/healthcheck.sh $ENVIRONMENT
