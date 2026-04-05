#!/bin/bash
# Logs monitoring script

set -e

ENVIRONMENT="${1:-production}"
FOLLOW="${2:-false}"

if [ "$FOLLOW" = "-f" ] || [ "$FOLLOW" = "follow" ]; then
    echo "📋 Following logs (Ctrl+C to stop)..."
    docker-compose -f docker-compose.${ENVIRONMENT}.yml logs -f
else
    echo "📋 Last 50 lines of logs:"
    docker-compose -f docker-compose.${ENVIRONMENT}.yml logs --tail=50
fi
